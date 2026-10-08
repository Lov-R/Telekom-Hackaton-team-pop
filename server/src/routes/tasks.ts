import { Router } from 'express';
import fs from 'node:fs';
import { z } from 'zod';
import { db, nowIso } from '../db.js';
import { GeminiError } from '../ai/gemini.js';
import { verifyProof } from '../ai/verify.js';
import { removeStoredFile } from '../services/documents.js';
import { ensureLocalFile } from '../persist.js';
import { completeTask, gameState, profileRow } from '../services/game.js';
import { TASK_ORDER, TASK_SELECT, taskById, taskOut, type TaskRow } from '../services/serialize.js';
import { assertGoal, insertTask, isValidTime, startAt } from '../services/tasks.js';
import { isValidDate, todayZagreb } from '../util/dates.js';
import { HttpError, notFound } from '../util/http.js';
import { saveUploadedDocument, upload } from './documents.js';

const dateOrNull = z
  .union([z.string(), z.null()])
  .transform((v) => (v ? v : null))
  .refine((v) => v === null || isValidDate(v), 'Neispravan datum.');
const timeOrNull = z
  .union([z.string(), z.null()])
  .transform((v) => (v ? v : null))
  .refine((v) => v === null || isValidTime(v), 'Neispravno vrijeme.');

const fields = {
  kind: z.enum(['event', 'deadline']),
  title: z.string().trim().min(1, 'Naslov je obavezan.').max(300),
  description: z.string().max(5000).nullish(),
  tier: z.number().int().min(1).max(5),
  date: dateOrNull.optional(),
  time: timeOrNull.optional(),
  dueDate: dateOrNull.optional(),
  remindAt: dateOrNull.optional(),
  recurrence: z.enum(['none', 'monthly', 'yearly']).optional(),
  goalId: z.string().nullish(),
};
const CreateZ = z.object({ ...fields, tier: fields.tier.optional(), kind: fields.kind.optional() });
/** Status is not editable here: only POST /tasks/:id/complete finishes a task (SRS §8.3). */
const PatchZ = z.object(fields).partial();

/** SRS §6.6 proof acceptance rules, enforced in code. */
const MIN_CONFIDENCE = 0.7;
const MIN_TASK_AGE_MS = 5 * 60_000;

export const tasksRouter = Router();

tasksRouter.get('/tasks', (req, res) => {
  const where = ['t.user_id = ?'];
  const args: string[] = [req.userId];
  const status = req.query.status;
  if (status === 'open') where.push("t.status IN ('open','missed')");
  else if (status === 'done' || status === 'missed') {
    where.push('t.status = ?');
    args.push(status);
  } else if (status === 'overdue') {
    where.push("t.status IN ('open','missed') AND t.kind = 'deadline' AND t.due_date < ?");
    args.push(todayZagreb());
  }
  if (typeof req.query.goalId === 'string' && req.query.goalId) {
    where.push('t.goal_id = ?');
    args.push(req.query.goalId);
  }
  const rows = db.prepare(`${TASK_SELECT} WHERE ${where.join(' AND ')} ORDER BY ${TASK_ORDER}`).all(...args) as TaskRow[];
  res.json(rows.map(taskOut));
});

tasksRouter.post('/tasks', (req, res) => {
  const b = CreateZ.parse(req.body);
  const id = insertTask(req.userId, {
    kind: b.kind ?? 'deadline',
    title: b.title,
    description: b.description,
    tier: b.tier ?? 2,
    source: 'user',
    date: b.date,
    time: b.time,
    dueDate: b.dueDate,
    remindAt: b.remindAt,
    recurrence: b.recurrence,
    goalId: b.goalId,
  });
  res.status(201).json(taskById(req.userId, id));
});

tasksRouter.patch('/tasks/:id', (req, res) => {
  const b = PatchZ.parse(req.body);
  const cur = db.prepare('SELECT * FROM tasks WHERE id = ? AND user_id = ?').get(req.params.id, req.userId) as
    | (TaskRow & { user_id: string })
    | undefined;
  if (!cur) throw notFound('Zadatak');
  if (b.goalId !== undefined) assertGoal(req.userId, b.goalId);
  const kind = b.kind ?? cur.kind;
  const curDate = cur.start_at?.slice(0, 10) ?? null;
  const curTime = cur.start_at && cur.start_at.length > 10 ? cur.start_at.slice(11, 16) : null;
  const date = b.date === undefined ? (curDate ?? cur.due_date) : b.date;
  const time = b.time === undefined ? curTime : b.time;
  const dueDate = b.dueDate === undefined ? (cur.due_date ?? curDate) : b.dueDate;
  if (kind === 'event' && !date) throw new HttpError(400, 'validation', 'Događaj mora imati datum.');
  // Moving a missed deadline into the future reopens it; the penalty already taken stays.
  const reopen = cur.status === 'missed' && kind === 'deadline' && !!dueDate && dueDate >= todayZagreb();
  db.prepare(
    `UPDATE tasks SET kind = ?, title = ?, description = ?, tier = ?, start_at = ?, due_date = ?, remind_at = ?,
       recurrence = ?, goal_id = ?, status = ? WHERE id = ? AND user_id = ?`,
  ).run(
    kind,
    b.title ?? cur.title,
    b.description === undefined ? cur.description : b.description || null,
    b.tier ?? cur.tier,
    kind === 'event' ? startAt(date, time) : null,
    kind === 'deadline' ? dueDate : null,
    b.remindAt === undefined ? cur.remind_at : b.remindAt,
    b.recurrence ?? cur.recurrence,
    b.goalId === undefined ? cur.goal_id : b.goalId || null,
    reopen ? 'open' : cur.status,
    cur.id,
    req.userId,
  );
  res.json(taskById(req.userId, cur.id));
});

tasksRouter.delete('/tasks/:id', (req, res) => {
  const r = db.prepare('DELETE FROM tasks WHERE id = ? AND user_id = ?').run(req.params.id, req.userId);
  if (r.changes === 0) throw notFound('Zadatak');
  res.status(204).end();
});

/**
 * SRS §6.6 / §9.5 complete-task. Multipart with optional `proof` file.
 * With a proof: verify-proof decides; a rejected proof leaves the task open (422) so the user can retry
 * or complete without proof (×0.3).
 */
tasksRouter.post('/tasks/:id/complete', upload.single('proof'), async (req, res) => {
  const userId = req.userId;
  const task = db.prepare('SELECT * FROM tasks WHERE id = ? AND user_id = ?').get(req.params.id, userId) as
    | (TaskRow & { tier: number })
    | undefined;
  if (!task || task.status === 'done') {
    if (req.file) fs.rmSync(req.file.path, { force: true });
    if (!task) throw notFound('Zadatak');
    throw new HttpError(409, 'already_done', 'Zadatak je već riješen.');
  }

  if (!req.file) {
    const result = completeTask(userId, task.id, null);
    res.json({ accepted: true, reason: null, result, task: taskById(userId, task.id), game: gameState(userId) });
    return;
  }

  const proofDoc = await saveUploadedDocument(userId, req.file, true);
  // A rejected or unverifiable proof is not kept, so the same file can be tried again; only accepted proofs block reuse.
  const discardProof = () => {
    db.prepare('DELETE FROM documents WHERE id = ?').run(proofDoc.id);
    removeStoredFile(proofDoc.storage_path);
  };
  const reject = (reason: string) => {
    discardProof();
    res.status(422).json({ accepted: false, reason, task: taskById(userId, task.id), game: gameState(userId) });
  };

  if (Date.now() - new Date(task.created_at).getTime() < MIN_TASK_AGE_MS) {
    reject('Zadatak je prenov za dokaz. Pokušaj ponovno za nekoliko minuta ili ga riješi bez dokaza.');
    return;
  }

  let verdict;
  try {
    const proofFile = await ensureLocalFile(proofDoc.storage_path);
    if (!proofFile) throw new Error('Datoteka dokaza ne postoji.');
    verdict = await verifyProof(
      task,
      proofFile,
      proofDoc.mime_type ?? 'application/pdf',
      profileRow(userId).language,
    );
  } catch (e) {
    discardProof();
    throw e instanceof GeminiError ? e : new HttpError(502, 'ai_error', 'Provjera dokaza nije uspjela.');
  }

  const createdDate = task.created_at.slice(0, 10);
  const reasons: string[] = [];
  if (!verdict.matches || verdict.confidence < MIN_CONFIDENCE) reasons.push('Dokaz ne odgovara zadatku.');
  if (verdict.proof_date && verdict.proof_date < createdDate) reasons.push('Dokaz je stariji od zadatka.');
  if (reasons.length > 0) {
    reject([verdict.reason, ...reasons].filter(Boolean).join(' '));
    return;
  }

  db.prepare(
    "UPDATE documents SET title = ?, status = 'ready', document_date = ?, updated_at = ? WHERE id = ?",
  ).run(`Dokaz: ${task.title}`.slice(0, 120), verdict.proof_date, nowIso(), proofDoc.id);
  const result = completeTask(userId, task.id, { documentId: proofDoc.id, reason: verdict.reason });

  // A proof that is itself a new document (e.g. a new medical report) goes to Documents (Tok C, step 5),
  // unread until opened like any other upload.
  if (verdict.is_new_document) {
    db.prepare("UPDATE documents SET is_proof = 0, status = 'error', error = NULL WHERE id = ?").run(proofDoc.id);
  }

  res.json({
    accepted: true,
    reason: verdict.reason,
    result,
    task: taskById(userId, task.id),
    game: gameState(userId),
  });
});
