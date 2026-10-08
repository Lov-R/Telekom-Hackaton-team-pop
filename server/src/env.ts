import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';

const here = path.dirname(fileURLToPath(import.meta.url));
export const SERVER_ROOT = path.resolve(here, '..');
dotenv.config({ path: path.join(SERVER_ROOT, '.env'), quiet: true });

const schema = z.object({
  GEMINI_API_KEY: z.string().min(1, 'GEMINI_API_KEY nije postavljen u server/.env'),
  GEMINI_MODEL: z.string().min(1).default('gemini-3.8-flash'),
  GEMINI_FALLBACK_MODEL: z.string().min(1).default('gemini-3.5-flash-lite'),
  PORT: z.coerce.number().int().default(3001),
});

const parsed = schema.safeParse({
  GEMINI_API_KEY: process.env.GEMINI_API_KEY ?? process.env.GOOGLE_API_KEY,
  GEMINI_MODEL: process.env.GEMINI_MODEL || undefined,
  GEMINI_FALLBACK_MODEL: process.env.GEMINI_FALLBACK_MODEL || undefined,
  PORT: process.env.PORT || undefined,
});
if (!parsed.success) {
  const msg = 'Neispravna konfiguracija: ' + parsed.error.issues.map((i) => i.message).join('; ');
  console.error(msg);
  if (process.env.RELAI_RUNTIME === 'netlify') {
    throw new Error(msg);
  }
  process.exit(1);
}
export const env = parsed.data;
/** Set by netlify/functions/*: the DB lives in Netlify Blobs and files are cached under /tmp (see persist.ts). */
export const SERVERLESS = process.env.RELAI_RUNTIME === 'netlify';
/** Netlify's buffered request limit is 6 MB including Base64 overhead, so uploads there stop at 4 MB. */
export const MAX_UPLOAD_MB = SERVERLESS ? 4 : 10;
/** RELAI_DATA_DIR lets tests run against a scratch copy (and points at /tmp on Netlify). */
export const DATA_DIR = process.env.RELAI_DATA_DIR ? path.resolve(process.env.RELAI_DATA_DIR) : path.join(SERVER_ROOT, 'data');
export const UPLOAD_DIR = path.join(DATA_DIR, 'uploads');
