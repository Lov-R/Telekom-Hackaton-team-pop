import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { db } from '../db.js';
import { UPLOAD_DIR } from '../env.js';
import { HttpError, notFound } from '../util/http.js';
import { TASK_ORDER, TASK_SELECT, taskOut, type TaskRow } from './serialize.js';

export interface DocRow {
  id: string;
  user_id: string;
  storage_path: string;
  file_hash: string | null;
  mime_type: string | null;
  category: string;
  subcategory: string | null;
  category_source: string;
  title: string;
  document_date: string | null;
  expiry_date: string | null;
  extracted: string;
  is_proof: number;
  status: string;
  error: string | null;
  original_name: string | null;
  size_bytes: number | null;
  source_path: string | null;
  created_at: string;
  updated_at: string;
}

/** Shape of documents.extracted. keyDates only exists on documents migrated from the old schema. */
export interface Extracted {
  summary?: string;
  docType?: string;
  keyFields?: { label: string; value: string }[];
  people?: { name: string; role: string }[];
  followUp?: {
    found: boolean;
    title: string;
    interval_months: number;
    exact_date: string | null;
    source_text: string;
  };
  suggestedTier?: number;
  confidence?: number;
  fullText?: string;
  keyDates?: { date: string; label: string; type: string }[];
}

export function parseExtracted(json: string): Extracted {
  try {
    return JSON.parse(json) as Extracted;
  } catch {
    return {};
  }
}

export function getDocRow(userId: string, id: string): DocRow {
  const row = db.prepare('SELECT * FROM documents WHERE id = ? AND user_id = ?').get(id, userId) as DocRow | undefined;
  if (!row) throw notFound('Dokument');
  return row;
}

export const listItem = (r: DocRow) => {
  const x = parseExtracted(r.extracted);
  return {
    id: r.id,
    title: r.title,
    category: r.category,
    subcategory: r.subcategory,
    docType: x.docType ?? null,
    summary: x.summary ?? null,
    documentDate: r.document_date,
    expiryDate: r.expiry_date,
    status: r.status,
    createdAt: r.created_at,
    sizeBytes: r.size_bytes,
  };
};

export function documentDetail(userId: string, id: string) {
  const r = getDocRow(userId, id);
  const x = parseExtracted(r.extracted);
  const tasks = db
    .prepare(`${TASK_SELECT} WHERE t.user_id = ? AND t.document_id = ? ORDER BY ${TASK_ORDER}`)
    .all(userId, id) as TaskRow[];
  return {
    ...listItem(r),
    keyFields: x.keyFields ?? [],
    keyDates: x.keyDates ?? [],
    people: x.people ?? [],
    followUp: x.followUp ?? null,
    fullText: x.fullText ?? null,
    error: r.error,
    originalName: r.original_name,
    mimeType: r.mime_type,
    tasks: tasks.map(taskOut),
  };
}

export function sha256File(file: string): string {
  return createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}

/** Absolute path for a storage_path, refusing anything that escapes the upload directory. */
export function absoluteStoragePath(storagePath: string): string {
  const abs = path.resolve(UPLOAD_DIR, storagePath);
  if (!abs.startsWith(path.resolve(UPLOAD_DIR) + path.sep)) throw notFound('Datoteka');
  return abs;
}

/** SRS §8.2 layout: {user_id}/{document_id}.{ext} */
export function storeUpload(userId: string, documentId: string, tmpPath: string, ext: string): string {
  const rel = path.join(userId, `${documentId}${ext}`);
  const abs = absoluteStoragePath(rel);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.renameSync(tmpPath, abs);
  return rel;
}

/** SRS §5.2: the same file cannot be uploaded twice (documents and proofs share the check, §6.6). */
export function assertNotDuplicate(userId: string, hash: string): void {
  const dup = db.prepare('SELECT is_proof FROM documents WHERE user_id = ? AND file_hash = ?').get(userId, hash) as
    | { is_proof: number }
    | undefined;
  if (dup) {
    throw new HttpError(
      409,
      'duplicate',
      dup.is_proof ? 'Ova datoteka je već korištena kao dokaz.' : 'Ovaj dokument je već učitan.',
    );
  }
}

export function removeStoredFile(storagePath: string): void {
  try {
    fs.rmSync(absoluteStoragePath(storagePath), { force: true });
  } catch {
    // Missing or invalid path: nothing to remove.
  }
}
