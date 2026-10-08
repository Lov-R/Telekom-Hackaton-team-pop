import fs from 'node:fs/promises';
import { GeminiError, GeminiParseError, generateJson } from './gemini.js';
import { extractionPrompt, extractionSystem, type Lang, type SubcategoryHints } from './prompts.js';
import { extractionJsonSchema, parseExtraction, type Extraction } from './schemas.js';

async function run(
  filePath: string,
  mimeType: string,
  withFullText: boolean,
  hints: SubcategoryHints,
  lang: Lang,
): Promise<Extraction> {
  const data = (await fs.readFile(filePath)).toString('base64');
  const raw = await generateJson(
    [
      {
        role: 'user',
        parts: [{ inlineData: { mimeType, data } }, { text: extractionPrompt(withFullText, hints) }],
      },
    ],
    { systemInstruction: extractionSystem(lang), maxOutputTokens: 32768 },
    extractionJsonSchema(withFullText),
  );
  return parseExtraction(raw);
}

const RETRYABLE = new Set([429, 503]);
const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

/** Retry fn with exponential backoff (plus jitter) on 429/503 responses. */
export async function withBackoff<T>(fn: () => Promise<T>, retries: number, baseMs = 4000): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await fn();
    } catch (e) {
      const status = e instanceof GeminiError ? e.status : undefined;
      if (attempt >= retries || status === undefined || !RETRYABLE.has(status)) throw e;
      await sleep(baseMs * 2 ** attempt + Math.random() * 1000);
    }
  }
}

export interface ExtractOptions {
  /** Existing subcategories per category, offered to the model for reuse. */
  hints?: SubcategoryHints;
  /** Retries on 429/503 with exponential backoff (default 0). */
  retries?: number;
  /** Language for titles and labels (profiles.language). */
  lang?: Lang;
}

/** Extract structured data from a document. Retries once without fullText if the JSON is unparseable. */
export async function extractDocument(
  filePath: string,
  mimeType: string,
  opts: ExtractOptions = {},
): Promise<Extraction> {
  const hints = opts.hints ?? {};
  const retries = opts.retries ?? 0;
  const lang = opts.lang ?? 'hr';
  try {
    return await withBackoff(() => run(filePath, mimeType, true, hints, lang), retries);
  } catch (e) {
    if (!(e instanceof GeminiParseError)) throw e;
    const result = await withBackoff(() => run(filePath, mimeType, false, hints, lang), retries);
    return { ...result, full_text: result.summary };
  }
}
