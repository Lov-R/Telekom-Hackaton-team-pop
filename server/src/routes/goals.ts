import { Router } from 'express';
import { z } from 'zod';
import { db, newId, nowIso } from '../db.js';
import { isValidDate } from '../util/dates.js';
import { notFound } from '../util/http.js';

interface GoalRow {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  target_date: string | null;
  completed_at: string | null;
  created_at: string;
}

function goalOut(r: GoalRow) {
  const p = db
    .prepare(
      "SELECT COUNT(*) AS total, COALESCE(SUM(status = 'done'), 0) AS done FROM tasks WHERE goal_id = ? AND user_id = ?",
    )
    .get(r.id, r.user_id) as { total: number; done: number };
  return {
    id: r.id,
    title: r.title,
    description: r.description,
    targetDate: r.target_date,
    completedAt: r.completed_at,
    createdAt: r.created_at,
    completed: r.completed_at !== null,
    progress: { done: p.done, total: p.total },
  };
}

function getGoal(userId: string, id: string): GoalRow {
  const row = db.prepare('SELECT * FROM goals WHERE id = ? AND user_id = ?').get(id, userId) as GoalRow | undefined;
  if (!row) throw notFound('Cilj');
  return row;
}

const targetDate = z
  .union([z.string(), z.null()])
  .transform((v) => (v ? v : null))
  .refine((v) => v === null || isValidDate(v), 'Neispravan datum.');

const CreateZ = z.object({
  title: z.string().trim().min(1, 'Naslov je obavezan.').max(300),
  description: z.string().max(5000).nullish(),
  targetDate: targetDate.optional(),
  completed: z.boolean().optional(),
});
const PatchZ = CreateZ.partial();

export const goalsRouter = Router();

goalsRouter.get('/goals', (req, res) => {
  const rows = db
    .prepare(
      'SELECT * FROM goals WHERE user_id = ? ORDER BY completed_at IS NOT NULL, target_date IS NULL, target_date, created_at',
    )
    .all(req.userId) as GoalRow[];
  res.json(rows.map(goalOut));
});

goalsRouter.post('/goals', (req, res) => {
  const b = CreateZ.parse(req.body);
  const id = newId();
  const now = nowIso();
  db.prepare(
    'INSERT INTO goals (id, user_id, title, description, target_date, completed_at, created_at) VALUES (?,?,?,?,?,?,?)',
  ).run(id, req.userId, b.title, b.description || null, b.targetDate ?? null, b.completed ? now : null, now);
  res.status(201).json(goalOut(getGoal(req.userId, id)));
});

goalsRouter.patch('/goals/:id', (req, res) => {
  const b = PatchZ.parse(req.body);
  const cur = getGoal(req.userId, req.params.id);
  const completedAt =
    b.completed === undefined ? cur.completed_at : b.completed ? (cur.completed_at ?? nowIso()) : null;
  db.prepare('UPDATE goals SET title=?, description=?, target_date=?, completed_at=? WHERE id=? AND user_id=?').run(
    b.title ?? cur.title,
    b.description === undefined ? cur.description : b.description || null,
    b.targetDate === undefined ? cur.target_date : b.targetDate,
    completedAt,
    cur.id,
    req.userId,
  );
  res.json(goalOut(getGoal(req.userId, cur.id)));
});

goalsRouter.delete('/goals/:id', (req, res) => {
  const r = db.prepare('DELETE FROM goals WHERE id = ? AND user_id = ?').run(req.params.id, req.userId);
  if (r.changes === 0) throw notFound('Cilj');
  res.status(204).end();
});
