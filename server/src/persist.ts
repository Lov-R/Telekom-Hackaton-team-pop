import { createHash, timingSafeEqual } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import type { Store } from '@netlify/blobs';
import { isDbLoaded, loadSnapshot, snapshot } from './db.js';
import { SERVERLESS, UPLOAD_DIR } from './env.js';

/**
 * Netlify has no persistent disk. There the whole SQLite database is one blob: every request first pulls it
 * if another instance changed it (a cheap ETag check), and pushes it back if the request changed it.
 * Uploaded files are blobs too, cached under /tmp. Locally every function here is a no-op.
 *
 * Built for demo traffic: two instances writing in the same instant resolve as last-write-wins, except for
 * background document processing, which uses freshWrite() to retry on top of the newer copy.
 */

const DB_KEY = 'relai.db';
async function getStores(): Promise<{ db: Store; files: Store }> {
  const { getStore } = await import('@netlify/blobs');
  return {
    db: getStore({ name: 'relai-db', consistency: 'strong' }),
    files: getStore({ name: 'relai-files', consistency: 'strong' }),
  };
}

let etag: string | undefined;
/** Whether the blob exists; it can exist with an unknown ETag if a read didn't report one. */
let stored = false;
let pushedHash = '';
const hashOf = (buf: Buffer): string => createHash('sha1').update(buf).digest('hex');

/** Make the in-memory database match the stored copy. */
export async function pullDb(): Promise<void> {
  if (!SERVERLESS) return;
  const { db } = await getStores();
  const known = isDbLoaded() ? etag : undefined;
  const entry = await db.getWithMetadata(DB_KEY, { type: 'arrayBuffer', etag: known });
  if (!entry) {
    // Nothing stored yet (fresh site): start empty; the first push creates the blob.
    if (!isDbLoaded() || etag !== undefined) {
      loadSnapshot(null);
      etag = undefined;
      pushedHash = '';
    }
    stored = false;
    return;
  }
  if (entry.data === null && entry.etag === known) return;
  loadSnapshot(Buffer.from(entry.data as ArrayBuffer));
  etag = entry.etag;
  stored = true;
  pushedHash = hashOf(snapshot());
}

/**
 * Store the database if it changed. Returns false when another instance wrote first; with force the
 * write then happens anyway (last write wins).
 */
export async function pushDb({ force = true } = {}): Promise<boolean> {
  if (!SERVERLESS || !isDbLoaded()) return true;
  const buf = snapshot();
  const hash = hashOf(buf);
  if (hash === pushedHash) return true;
  const { db } = await getStores();
  const body = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer;
  const condition = etag ? { onlyIfMatch: etag } : stored ? {} : { onlyIfNew: true };
  let res = await db.set(DB_KEY, body, condition);
  if (!res.modified) {
    if (!force) return false;
    console.warn('Baza je istodobno promijenjena na drugoj instanci; zadnji zapis pobjeđuje.');
    res = await db.set(DB_KEY, body);
  }
  etag = res.etag;
  stored = true;
  pushedHash = hash;
  return true;
}

/**
 * For writes that happen after a slow AI call: apply fn to the newest copy and store it, retrying on
 * top of another instance's write instead of overwriting it. fn must only touch the database.
 */
export async function freshWrite<T>(fn: () => T): Promise<T> {
  if (!SERVERLESS) return fn();
  for (let attempt = 0; ; attempt++) {
    await pullDb();
    const out = fn();
    if (await pushDb({ force: attempt >= 2 })) return out;
  }
}

const fileKey = (storagePath: string): string => storagePath.replaceAll('\\', '/');

function localPath(storagePath: string): string {
  const abs = path.resolve(UPLOAD_DIR, storagePath);
  if (!abs.startsWith(path.resolve(UPLOAD_DIR) + path.sep)) throw new Error('Neispravna putanja datoteke.');
  return abs;
}

/** Copy a freshly stored upload to Blobs. */
export async function saveFile(storagePath: string): Promise<void> {
  if (!SERVERLESS) return;
  const { files } = await getStores();
  const buf = fs.readFileSync(localPath(storagePath));
  await files.set(fileKey(storagePath), buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer);
}

/** Local path of a stored file, downloading it from Blobs into the /tmp cache if needed. Null if missing. */
export async function ensureLocalFile(storagePath: string): Promise<string | null> {
  const abs = localPath(storagePath);
  if (fs.existsSync(abs)) return abs;
  if (!SERVERLESS) return null;
  const { files } = await getStores();
  const data = await files.get(fileKey(storagePath), { type: 'arrayBuffer' });
  if (!data) return null;
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, Buffer.from(data));
  return abs;
}

export async function deleteFile(storagePath: string): Promise<void> {
  if (!SERVERLESS) return;
  const { files } = await getStores();
  await files.delete(fileKey(storagePath));
}

const pending = new Set<Promise<unknown>>();

/** Fire-and-forget work. On Netlify the function keeps running (waitUntil) until drainBackground() settles. */
export function background(p: Promise<unknown>): void {
  const tracked = p.catch((e) => console.error('Pozadinska greška:', e instanceof Error ? e.message : e));
  pending.add(tracked);
  void tracked.finally(() => pending.delete(tracked));
}

export async function drainBackground(): Promise<void> {
  while (pending.size > 0) await Promise.allSettled([...pending]);
}

const json = (status: number, body: unknown): Response =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

function tokenMatches(given: string | null): boolean {
  const expected = process.env.ADMIN_IMPORT_TOKEN ?? '';
  if (expected.length < 16 || !given) return false;
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * One-time data import (scripts/upload-to-netlify.ts), only while ADMIN_IMPORT_TOKEN is set:
 *   PUT /api/admin/db            body = SQLite file
 *   PUT /api/admin/files/<path>  body = document file
 */
export async function handleAdmin(req: Request): Promise<Response> {
  if (!tokenMatches(req.headers.get('x-admin-token'))) {
    return json(404, { error: { code: 'not_found', message: 'Ruta ne postoji.' } });
  }
  const { pathname } = new URL(req.url);
  if (req.method !== 'PUT') return json(405, { error: { code: 'method', message: 'Koristi PUT.' } });
  const body = await req.arrayBuffer();
  const { db, files } = await getStores();
  if (pathname === '/api/admin/db') {
    if (Buffer.from(body.slice(0, 16)).toString('latin1') !== 'SQLite format 3\0') {
      return json(400, { error: { code: 'not_sqlite', message: 'Tijelo nije SQLite baza.' } });
    }
    await db.set(DB_KEY, body);
    etag = undefined; // next pullDb() reloads
    await pullDb();
    return json(200, { ok: true, bytes: body.byteLength });
  }
  const prefix = '/api/admin/files/';
  if (pathname.startsWith(prefix)) {
    const key = decodeURIComponent(pathname.slice(prefix.length));
    if (!key || key.split('/').some((part) => part === '' || part === '.' || part === '..')) {
      return json(400, { error: { code: 'bad_path', message: 'Neispravna putanja.' } });
    }
    await files.set(key, body);
    return json(200, { ok: true, key, bytes: body.byteLength });
  }
  return json(404, { error: { code: 'not_found', message: 'Ruta ne postoji.' } });
}
