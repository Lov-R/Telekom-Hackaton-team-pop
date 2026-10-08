import { GoogleGenAI } from '@google/genai';
import type { ContentListUnion, GenerateContentConfig, GenerateContentResponse } from '@google/genai';
import { env } from '../env.js';

export const ai = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });
export const MODEL = env.GEMINI_MODEL;
/** SRS §9: second Flash model used when the main one hits a limit or is unavailable. */
export const FALLBACK_MODEL = env.GEMINI_FALLBACK_MODEL;
const FALLBACK_STATUSES = new Set([404, 429, 500, 503]);

export class GeminiError extends Error {
  /** HTTP status reported by the API, when known. */
  readonly status?: number;
  constructor(message: string, status?: number) {
    super(message);
    this.status = status;
  }
}

/** Thrown when the model returned text that is not valid JSON. */
export class GeminiParseError extends GeminiError {}

function scrub(msg: string): string {
  return msg.replaceAll(env.GEMINI_API_KEY, '[KEY]');
}

function croatianMessage(e: unknown): string {
  const status = (e as { status?: number }).status;
  if (status === 401 || status === 403) return 'AI usluga je odbila pristup. Provjeri API ključ.';
  if (status === 429) return 'AI usluga je trenutno preopterećena ili je dosegnuta kvota. Pokušaj ponovno kasnije.';
  if (status === 404) return 'AI model nije pronađen. Provjeri GEMINI_MODEL.';
  if (status === 400) return 'AI usluga nije prihvatila zahtjev (dokument je možda neispravan ili prevelik).';
  return 'AI usluga trenutno nije dostupna. Pokušaj ponovno.';
}

/** One generateContent call, retried once on the fallback model for limit/availability errors. */
export async function generate(contents: ContentListUnion, config: GenerateContentConfig): Promise<GenerateContentResponse> {
  try {
    return await ai.models.generateContent({ model: MODEL, contents, config });
  } catch (e) {
    const status = (e as { status?: number }).status;
    if (FALLBACK_MODEL && FALLBACK_MODEL !== MODEL && status !== undefined && FALLBACK_STATUSES.has(status)) {
      try {
        return await ai.models.generateContent({ model: FALLBACK_MODEL, contents, config });
      } catch (e2) {
        e = e2;
      }
    }
    console.error('Gemini greška:', scrub(e instanceof Error ? e.message : String(e)).slice(0, 300));
    throw new GeminiError(croatianMessage(e), (e as { status?: number }).status);
  }
}

/** Call Gemini expecting a JSON response; returns the parsed JSON value. */
export async function generateJson(
  contents: ContentListUnion,
  config: GenerateContentConfig,
  schema: Record<string, unknown>,
): Promise<unknown> {
  const res = await generate(contents, {
    temperature: 0.2,
    ...config,
    responseMimeType: 'application/json',
    responseJsonSchema: schema,
  });
  try {
    return JSON.parse(res.text ?? '');
  } catch {
    throw new GeminiParseError('AI usluga je vratila neispravan odgovor. Pokušaj ponovno.');
  }
}
