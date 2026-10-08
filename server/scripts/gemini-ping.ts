import { GoogleGenAI } from '@google/genai';
import { env } from '../src/env.js';

const candidates = [env.GEMINI_MODEL, 'gemini-3.8-flash', 'gemini-3.5-flash-lite', 'gemini-2.5-flash'];
const ai = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });

for (const model of [...new Set(candidates)]) {
  try {
    const res = await ai.models.generateContent({
      model,
      contents: 'Odgovori jednom riječju: pozdrav.',
      config: {
        responseMimeType: 'application/json',
        responseJsonSchema: {
          type: 'object',
          properties: { word: { type: 'string' } },
          required: ['word'],
        },
      },
    });
    console.log(`OK model=${model} response=${res.text}`);
    process.exit(0);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.log(`FAIL model=${model}: ${msg.replaceAll(env.GEMINI_API_KEY, '[KEY]').slice(0, 400)}`);
  }
}
process.exit(1);
