import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DATA_DIR, UPLOAD_DIR } from './env.js';

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
await moveLegacyDatabase();

export const DB_DRIVER = 'better-sqlite3';
export const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

const schemaPath = path.join(path.dirname(fileURLToPath(import.meta.url)), 'schema.sql');
db.exec(fs.readFileSync(schemaPath, 'utf8'));

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
