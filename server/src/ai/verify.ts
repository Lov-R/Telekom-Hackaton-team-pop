import fs from 'node:fs/promises';
import { GeminiParseError, generateJson } from './gemini.js';
import { verifySystem, type Lang } from './prompts.js';
import { VerifyZ, verifyJsonSchema, type VerifyResult } from './schemas.js';

export interface ProofTask {
  title: string;
  kind: string;
  tier: number;
  created_at: string;
  due_date: string | null;
}

/** SRS §9.4 verify-proof: the model judges, code decides (§6.6). One retry on malformed JSON (§9.1 rule 1). */
export async function verifyProof(task: ProofTask, filePath: string, mimeType: string, lang: Lang): Promise<VerifyResult> {
  const data = (await fs.readFile(filePath)).toString('base64');
  const prompt = `Zadatak: "${task.title}" (vrsta ${task.kind}, razina ${task.tier}, nastao ${task.created_at.slice(0, 10)}${
    task.due_date ? `, rok ${task.due_date}` : ''
  }). Je li priloženi dokaz potvrda da je zadatak riješen?`;
  const call = () =>
    generateJson(
      [{ role: 'user', parts: [{ inlineData: { mimeType, data } }, { text: prompt }] }],
      { systemInstruction: verifySystem(lang), maxOutputTokens: 2048 },
      verifyJsonSchema,
    );
  let raw: unknown;
  try {
    raw = await call();
  } catch (e) {
    if (!(e instanceof GeminiParseError)) throw e;
    raw = await call();
  }
  return VerifyZ.parse(raw ?? {});
}
