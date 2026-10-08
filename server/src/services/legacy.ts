/**
 * One-time import of the pre-SRS single-user database (data/relai.legacy.db) into the first registered account.
 * The legacy file is opened read-only and never modified.
 */
import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import { LEGACY_DB_PATH, db, getMeta, setMeta, tx } from '../db.js';
import { UPLOAD_DIR } from '../env.js';
import { cleanSubcategory } from '../ai/schemas.js';
import { sha256File, type Extracted } from './documents.js';

const META_KEY = 'legacy_imported_into';

/** Old taxonomy → SRS §5.2 category, with the old category kept as a subcategory prefix where it adds meaning. */
const CATEGORY_MAP: Record<string, { category: string; prefix: string | null }> = {
  garancije_racuni: { category: 'racuni', prefix: 'Garancije' },
  nekretnina: { category: 'ugovori', prefix: 'Nekretnina' },
  osobni_dokumenti: { category: 'osobni_dokumenti', prefix: null },
  posao: { category: 'ugovori', prefix: 'Posao' },
  rezije: { category: 'racuni', prefix: 'Režije' },
  za_rjesavanje: { category: 'racuni', prefix: 'Za rješavanje' },
  zdravstvo: { category: 'zdravstvo', prefix: null },
  ostalo: { category: 'ostalo', prefix: null },
};

export function mapLegacyCategory(category: string, subcategory: string | null): { category: string; subcategory: string | null } {
  const m = CATEGORY_MAP[category] ?? CATEGORY_MAP.ostalo;
  const sub = m.prefix ? [m.prefix, subcategory].filter(Boolean).join(' / ') : subcategory;
  return { category: m.category, subcategory: cleanSubcategory(sub) };
}

const TIER_BY_PRIORITY: Record<string, number> = { low: 2, medium: 3, high: 4 };

type Row = Record<string, unknown>;
const text = (v: unknown): string | null => (typeof v === 'string' ? v : null);

function json<T>(v: unknown, fallback: T): T {
  try {
    return typeof v === 'string' ? (JSON.parse(v) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function importLegacyIfFirstUser(userId: string): void {
  if (!fs.existsSync(LEGACY_DB_PATH) || getMeta(META_KEY)) return;
  const users = (db.prepare('SELECT COUNT(*) AS n FROM users').get() as { n: number }).n;
  if (users !== 1) return;

  const old = new Database(LEGACY_DB_PATH, { readonly: true });
  try {
    const all = (sql: string): Row[] => old.prepare(sql).all() as Row[];
    const seenHashes = new Set<string>();
    tx(() => {
      for (const d of all('SELECT * FROM documents')) {
        const filePath = text(d.file_path) ?? '';
        const rel = path.relative(UPLOAD_DIR, filePath);
        let hash: string | null = null;
        if (fs.existsSync(filePath)) {
          hash = sha256File(filePath);
          if (seenHashes.has(hash)) hash = null;
          else seenHashes.add(hash);
        }
        const keyDates = json<{ date: string; label: string; type: string }[]>(d.key_dates_json, []);
        const extracted: Extracted = {
          summary: text(d.summary) ?? undefined,
          docType: text(d.doc_type) ?? undefined,
          people: json(d.people_json, []),
          fullText: text(d.full_text) ?? undefined,
          keyFields: [],
          keyDates,
        };
        const cat = mapLegacyCategory(text(d.category) ?? 'ostalo', text(d.subcategory));
        db.prepare(
          `INSERT INTO documents (id, user_id, storage_path, file_hash, mime_type, category, subcategory, category_source,
             title, document_date, expiry_date, extracted, is_proof, status, error, original_name, size_bytes, source_path,
             created_at, updated_at)
           VALUES (?,?,?,?,?,?,?,?,?,?,?,?, 0, ?,?,?,?,?,?,?)`,
        ).run(
          d.id,
          userId,
          rel,
          hash,
          d.mime_type,
          cat.category,
          cat.subcategory,
          d.category_source ?? 'ai',
          d.title,
          keyDates.find((k) => k.type === 'issue')?.date ?? null,
          keyDates.find((k) => k.type === 'expiry')?.date ?? null,
          JSON.stringify(extracted),
          d.status,
          d.error,
          d.original_name,
          d.size_bytes,
          d.source_path ?? null,
          d.created_at,
          d.updated_at,
        );
      }

      for (const g of all('SELECT * FROM goals')) {
        db.prepare(
          'INSERT INTO goals (id, user_id, title, description, target_date, completed_at, created_at) VALUES (?,?,?,?,?,?,?)',
        ).run(g.id, userId, g.title, g.description, g.target_date, g.completed_at, g.created_at);
      }

      const insTask = db.prepare(
        `INSERT INTO tasks (id, user_id, document_id, goal_id, kind, title, description, tier, source,
           start_at, due_date, status, completed_at, penalty_applied, created_at)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?, 1, ?)`,
      );
      for (const t of all('SELECT * FROM tasks')) {
        insTask.run(
          t.id,
          userId,
          t.document_id,
          t.goal_id,
          'deadline',
          t.title,
          t.description,
          TIER_BY_PRIORITY[text(t.priority) ?? ''] ?? 3,
          t.source === 'recommendation' ? 'recommendation' : t.source === 'document' ? 'document' : 'user',
          null,
          t.due_date,
          t.status === 'done' ? 'done' : 'open',
          t.completed_at,
          t.created_at,
        );
      }
      // Old events become tasks: deadlines/expiries/reminders are things to do, the rest happen at a time.
      for (const e of all('SELECT * FROM events')) {
        const isDeadline = ['deadline', 'expiry', 'reminder'].includes(text(e.kind) ?? '');
        const date = text(e.date);
        // The old extractor wrote 00:00 for "no time".
        const time = text(e.time) === '00:00' ? null : text(e.time);
        insTask.run(
          e.id,
          userId,
          e.document_id,
          null,
          isDeadline ? 'deadline' : 'event',
          e.title,
          e.description,
          isDeadline ? 3 : 2,
          e.source === 'recommendation' ? 'recommendation' : e.source === 'document' ? 'document' : 'user',
          isDeadline ? null : time ? `${date}T${time}` : date,
          isDeadline ? date : null,
          'open',
          null,
          e.created_at,
        );
      }

      for (const m of all('SELECT * FROM chat_messages')) {
        db.prepare(
          'INSERT INTO chat_messages (id, user_id, role, content, citations_json, created_at) VALUES (?,?,?,?,?,?)',
        ).run(m.id, userId, m.role, m.content, m.citations_json, m.created_at);
      }

      const p = old.prepare('SELECT * FROM profile WHERE id = 1').get() as Row | undefined;
      if (p) {
        db.prepare('UPDATE profiles SET avatar_config = ? WHERE id = ?').run(
          JSON.stringify({ name: p.ghost_name, color: p.ghost_color, accessory: p.accessory }),
          userId,
        );
      }
      setMeta(META_KEY, userId);
    });
    console.log('Stari podaci uvezeni u prvi račun.');
  } finally {
    old.close();
  }
}
