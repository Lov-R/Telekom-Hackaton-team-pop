import { Router, type Request } from 'express';
import multer from 'multer';
import fs from 'node:fs';
import path from 'node:path';
import { z } from 'zod';
import { db, newId, nowIso, tx } from '../db.js';
import { UPLOAD_DIR } from '../env.js';
import { CATEGORIES, CATEGORY_KEYS, cleanSubcategory } from '../ai/schemas.js';
import {
  absoluteStoragePath,
  assertNotDuplicate,
  documentDetail,
  getDocRow,
  listItem,
  parseExtracted,
  removeStoredFile,
  sha256File,
  storeUpload,
  type DocRow,
} from '../services/documents.js';
import { processDocument } from '../services/processDocument.js';
import { HttpError, notFound } from '../util/http.js';
import { normalize } from '../util/text.js';

export const EXT_BY_MIME: Record<string, string[]> = {
  'application/pdf': ['.pdf'],
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/webp': ['.webp'],
};

const TMP_DIR = path.join(UPLOAD_DIR, 'tmp');
fs.mkdirSync(TMP_DIR, { recursive: true });

/** SRS §5.2: JPG, PNG or PDF up to 10 MB (images arrive already downscaled by the client). */
export const upload = multer({
  storage: multer.diskStorage({
    destination: TMP_DIR,
    filename: (_req, _file, cb) => cb(null, crypto.randomUUID()),
  }),
  limits: { fileSize: 10 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!EXT_BY_MIME[file.mimetype]?.includes(ext)) {
      cb(new HttpError(415, 'unsupported_type', 'Podržani su samo PDF, JPEG, PNG i WebP dokumenti.'));
      return;
    }
    cb(null, true);
  },
});

/**
 * Hash-checks and stores an uploaded file as a document row in 'processing' state. Returns the new row.
 * The temp file is always consumed (moved or deleted).
 */
export function saveUploadedDocument(userId: string, file: Express.Multer.File, isProof: boolean): DocRow {
  try {
    const hash = sha256File(file.path);
    assertNotDuplicate(userId, hash);
    const id = newId();
    const now = nowIso();
    const original = Buffer.from(file.originalname, 'latin1').toString('utf8');
    const storagePath = storeUpload(userId, id, file.path, path.extname(file.originalname).toLowerCase());
    db.prepare(
      `INSERT INTO documents (id, user_id, storage_path, file_hash, mime_type, title, is_proof, status,
         original_name, size_bytes, created_at, updated_at)
       VALUES (?,?,?,?,?,?,?, 'processing', ?,?,?,?)`,
    ).run(
      id,
      userId,
      storagePath,
      hash,
      file.mimetype,
      original.replace(/\.[^.]+$/, '') || 'Dokument',
      isProof ? 1 : 0,
      original,
      file.size,
      now,
      now,
    );
    return getDocRow(userId, id);
  } finally {
    fs.rmSync(file.path, { force: true });
  }
}

export const documentsRouter = Router();

documentsRouter.get('/documents', (req: Request, res) => {
  const category = typeof req.query.category === 'string' ? req.query.category : '';
  const subcategory = typeof req.query.subcategory === 'string' ? req.query.subcategory : '';
  const q = typeof req.query.q === 'string' ? normalize(req.query.q.trim()) : '';
  let rows = db
    .prepare('SELECT * FROM documents WHERE user_id = ? AND is_proof = 0 ORDER BY created_at DESC')
    .all(req.userId) as DocRow[];
  if (category) rows = rows.filter((r) => r.category === category);
  if (subcategory) rows = rows.filter((r) => r.subcategory === subcategory);
  if (q) {
    rows = rows.filter((r) => {
      const x = parseExtracted(r.extracted);
      const fields = (x.keyFields ?? []).map((f) => `${f.label} ${f.value}`).join(' ');
      const people = (x.people ?? []).map((p) => `${p.name} ${p.role}`).join(' ');
      return normalize(`${r.title} ${x.summary ?? ''} ${x.docType ?? ''} ${fields} ${people} ${x.fullText ?? ''}`).includes(q);
    });
  }
  res.json(rows.map(listItem));
});

documentsRouter.post('/documents', upload.single('file'), (req, res) => {
  if (!req.file) throw new HttpError(400, 'no_file', 'Datoteka nije priložena.');
  const row = saveUploadedDocument(req.userId, req.file, false);
  void processDocument(row.id);
  res.status(202).json(listItem(row));
});

documentsRouter.get('/categories', (req, res) => {
  const rows = db
    .prepare(
      `SELECT category, subcategory, COUNT(*) AS n FROM documents WHERE user_id = ? AND is_proof = 0
       GROUP BY category, subcategory ORDER BY subcategory`,
    )
    .all(req.userId) as { category: string; subcategory: string | null; n: number }[];
  res.json(
    CATEGORIES.map((c) => {
      const mine = rows.filter((r) => r.category === c.key);
      return {
        key: c.key,
        label: c.label,
        count: mine.reduce((n, r) => n + r.n, 0),
        subcategories: mine
          .filter((r) => r.subcategory)
          .map((r) => ({ name: r.subcategory as string, count: r.n }))
          .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'hr')),
      };
    }),
  );
});

documentsRouter.get('/documents/:id', (req, res) => {
  res.json(documentDetail(req.userId, req.params.id));
});

documentsRouter.get('/documents/:id/file', (req, res) => {
  const r = getDocRow(req.userId, req.params.id);
  const abs = absoluteStoragePath(r.storage_path);
  if (!fs.existsSync(abs)) throw notFound('Datoteka');
  res.setHeader('Content-Type', r.mime_type ?? 'application/octet-stream');
  res.setHeader('Content-Disposition', 'inline');
  res.setHeader('Cache-Control', 'private, no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.sendFile(abs);
});

const PatchZ = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  category: z.enum(CATEGORY_KEYS).optional(),
  subcategory: z.string().max(80).nullable().optional(),
});

documentsRouter.patch('/documents/:id', (req, res) => {
  const body = PatchZ.parse(req.body);
  const cur = getDocRow(req.userId, req.params.id);
  const touchesCategory = body.category !== undefined || body.subcategory !== undefined;
  const subcategory =
    body.subcategory !== undefined
      ? cleanSubcategory(body.subcategory)
      : body.category !== undefined && body.category !== cur.category
        ? null
        : cur.subcategory;
  db.prepare(
    'UPDATE documents SET title = ?, category = ?, subcategory = ?, category_source = ?, updated_at = ? WHERE id = ? AND user_id = ?',
  ).run(
    body.title ?? cur.title,
    body.category ?? cur.category,
    subcategory,
    touchesCategory ? 'user' : cur.category_source,
    nowIso(),
    cur.id,
    req.userId,
  );
  res.json(documentDetail(req.userId, cur.id));
});

documentsRouter.post('/documents/:id/reprocess', (req, res) => {
  const cur = getDocRow(req.userId, req.params.id);
  if (cur.status === 'processing') throw new HttpError(409, 'busy', 'Dokument se već obrađuje.');
  tx(() => {
    // Completed tasks keep their HP history; only open auto-added ones are regenerated.
    db.prepare("DELETE FROM tasks WHERE document_id = ? AND user_id = ? AND source = 'document' AND status != 'done'").run(
      cur.id,
      req.userId,
    );
    db.prepare("UPDATE documents SET status = 'processing', error = NULL, updated_at = ? WHERE id = ?").run(
      nowIso(),
      cur.id,
    );
  });
  void processDocument(cur.id);
  res.status(202).json(listItem(getDocRow(req.userId, cur.id)));
});

documentsRouter.delete('/documents/:id', (req, res) => {
  const cur = getDocRow(req.userId, req.params.id);
  db.prepare('DELETE FROM documents WHERE id = ? AND user_id = ?').run(cur.id, req.userId);
  removeStoredFile(cur.storage_path);
  res.status(204).end();
});
