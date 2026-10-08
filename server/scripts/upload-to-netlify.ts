/**
 * One-time copy of the local database and document files to a Netlify deploy (no Gemini calls).
 *   NETLIFY_URL=https://<site>.netlify.app ADMIN_IMPORT_TOKEN=<same as in Netlify> npm run upload-netlify -w server
 * Replaces the database on Netlify. Remove ADMIN_IMPORT_TOKEN from Netlify afterwards to close the endpoint.
 */
import Database from 'better-sqlite3';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { DATA_DIR, UPLOAD_DIR } from '../src/env.js';

const site = process.env.NETLIFY_URL?.replace(/\/+$/, '');
const token = process.env.ADMIN_IMPORT_TOKEN;
if (!site || !token) {
  console.error('Postavi NETLIFY_URL i ADMIN_IMPORT_TOKEN.');
  process.exit(1);
}
const MAX_BYTES = 4.5 * 1024 * 1024;

async function put(route: string, body: Buffer): Promise<void> {
  const res = await fetch(`${site}/api/admin/${route}`, {
    method: 'PUT',
    headers: { 'x-admin-token': token as string, 'content-type': 'application/octet-stream' },
    body: new Uint8Array(body),
  });
  if (!res.ok) throw new Error(`${route}: HTTP ${res.status} ${await res.text()}`);
}

// A consistent single-file copy (WAL content included), in rollback-journal mode so it opens from memory.
const src = new Database(path.join(DATA_DIR, 'relai.db'), { readonly: true });
const tmp = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'relai-upload-')), 'relai.db');
src.exec(`VACUUM INTO '${tmp.replaceAll("'", "''")}'`);
const docs = src.prepare('SELECT storage_path FROM documents').all() as { storage_path: string }[];
src.close();
const copy = new Database(tmp);
copy.pragma('journal_mode = DELETE');
copy.close();

let sent = 0;
let missing = 0;
for (const { storage_path } of docs) {
  const abs = path.resolve(UPLOAD_DIR, storage_path);
  if (!fs.existsSync(abs)) {
    console.warn(`Nedostaje: ${storage_path}`);
    missing++;
    continue;
  }
  const buf = fs.readFileSync(abs);
  if (buf.length > MAX_BYTES) {
    console.warn(`Preskočeno (preveliko za Netlify): ${storage_path}`);
    continue;
  }
  const key = storage_path.replaceAll('\\', '/').split('/').map(encodeURIComponent).join('/');
  await put(`files/${key}`, buf);
  sent++;
  process.stdout.write(`\rDatoteke: ${sent}/${docs.length}`);
}
console.log();
// Database last, so the app never points at files that aren't uploaded yet.
await put('db', fs.readFileSync(tmp));
fs.rmSync(path.dirname(tmp), { recursive: true, force: true });
console.log(`Gotovo: baza + ${sent} datoteka${missing ? `, ${missing} nedostaje lokalno` : ''}.`);
