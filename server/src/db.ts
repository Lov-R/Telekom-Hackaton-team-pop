import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import { DATA_DIR, SERVERLESS, UPLOAD_DIR } from './env.js';
import { SCHEMA_SQL } from './schema.js';

fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const DB_PATH = path.join(DATA_DIR, 'relai.db');
/** Pre-SRS single-user database, imported into the first registered account (services/legacy.ts). */
export const LEGACY_DB_PATH = path.join(DATA_DIR, 'relai.legacy.db');

function hasTable(conn: Database.Database, name: string): boolean {
  return !!conn.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name = ?").get(name);
}

/** A pre-SRS database is moved aside (via SQLite backup, so WAL content is kept) and a fresh one is created. */
async function moveLegacyDatabase(): Promise<void> {
  if (!fs.existsSync(DB_PATH)) return;
  const probe = new Database(DB_PATH);
  try {
    if (!hasTable(probe, 'profile') || hasTable(probe, 'users')) return;
    const target = fs.existsSync(LEGACY_DB_PATH)
      ? path.join(DATA_DIR, `relai.legacy-${Date.now()}.db`)
      : LEGACY_DB_PATH;
    await probe.backup(target);
    console.log(`Stara baza premještena u ${path.basename(target)}; uvozi se u prvi registrirani račun.`);
  } finally {
    probe.close();
  }
  for (const suffix of ['', '-wal', '-shm']) fs.rmSync(`${DB_PATH}${suffix}`, { force: true });
}

function prepare(conn: Database.Database): Database.Database {
  conn.pragma('foreign_keys = ON');
  conn.exec(SCHEMA_SQL);
  return conn;
}

export const DB_DRIVER = SERVERLESS ? 'better-sqlite3 (Netlify Blobs)' : 'better-sqlite3';
/**
 * Live binding: on Netlify, loadSnapshot() swaps in a fresh in-memory copy, so always use `db` at call time
 * and never keep a prepared statement or a reference to it across requests.
 */
export let db: Database.Database;
if (!SERVERLESS) {
  await moveLegacyDatabase();
  db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  prepare(db);
}

/** Serverless: replace the database with a serialized snapshot, or an empty one when there is none yet. */
export function loadSnapshot(buf: Buffer | null): void {
  if (buf && buf[18] === 2) {
    // A WAL-mode file header can't be opened in memory; mark it as a rollback-journal database.
    buf[18] = 1;
    buf[19] = 1;
  }
  const next = prepare(buf ? new Database(buf) : new Database(':memory:'));
  db?.close();
  db = next;
}

export const isDbLoaded = (): boolean => db !== undefined;
export const snapshot = (): Buffer => db.serialize();

/** Run fn inside BEGIN/COMMIT, rolling back on error. Nested calls join the outer transaction. */
export function tx<T>(fn: () => T): T {
  if (db.inTransaction) return fn();
  db.exec('BEGIN');
  try {
    const result = fn();
    db.exec('COMMIT');
    return result;
  } catch (e) {
    db.exec('ROLLBACK');
    throw e;
  }
}

export const nowIso = (): string => new Date().toISOString();
export const newId = (): string => crypto.randomUUID();

export function getMeta(key: string): string | null {
  const row = db.prepare('SELECT value FROM meta WHERE key = ?').get(key) as { value: string } | undefined;
  return row?.value ?? null;
}

export function setMeta(key: string, value: string): void {
  db.prepare('INSERT INTO meta (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value').run(
    key,
    value,
  );
}
