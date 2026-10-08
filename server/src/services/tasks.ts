import { db, newId, nowIso } from '../db.js';
import { addDays, isValidDate, todayZagreb } from '../util/dates.js';
import { HttpError } from '../util/http.js';

export interface NewTask {
  kind: 'event' | 'deadline';
  title: string;
  description?: string | null;
  tier: number;
  source: 'document' | 'chat' | 'user' | 'recommendation';
  sourceText?: string | null;
  /** Events: the day it happens. */
  date?: string | null;
  /** Events: 'HH:MM'. */
  time?: string | null;
  /** Deadlines: the due date. */
  dueDate?: string | null;
  remindAt?: string | null;
  recurrence?: 'none' | 'monthly' | 'yearly';
  documentId?: string | null;
  goalId?: string | null;
}

export const isValidTime = (t: unknown): t is string =>
  typeof t === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(t);

export const startAt = (date: string | null | undefined, time: string | null | undefined): string | null =>
  date ? (time ? `${date}T${time}` : date) : null;

export function assertGoal(userId: string, goalId: string | null | undefined): void {
  if (goalId && !db.prepare('SELECT 1 FROM goals WHERE id = ? AND user_id = ?').get(goalId, userId)) {
    throw new HttpError(400, 'bad_goal', 'Cilj ne postoji.');
  }
}

/** Normalizes dates (SRS §9.3 "kod normalizira datum") and inserts an open task. Returns its id. */
export function insertTask(userId: string, t: NewTask): string {
  const title = t.title.trim().slice(0, 300);
  if (!title) throw new HttpError(400, 'validation', 'Naslov je obavezan.');
  const tier = Math.min(5, Math.max(1, Math.round(t.tier) || 2));
  const date = t.date && isValidDate(t.date) ? t.date : null;
  const time = isValidTime(t.time) ? t.time : null;
  let dueDate = t.dueDate && isValidDate(t.dueDate) ? t.dueDate : null;
  if (t.kind === 'event' && !date) throw new HttpError(400, 'validation', 'Događaj mora imati datum.');
  if (t.kind === 'deadline' && !dueDate && date) dueDate = date;
  const remindAt =
    t.remindAt && isValidDate(t.remindAt)
      ? t.remindAt
      : t.kind === 'deadline' && dueDate && addDays(dueDate, -1) >= todayZagreb()
        ? addDays(dueDate, -1)
        : null;
  assertGoal(userId, t.goalId);
  const id = newId();
  db.prepare(
    `INSERT INTO tasks (id, user_id, document_id, goal_id, kind, title, description, tier, source, source_text,
       start_at, remind_at, due_date, recurrence, status, created_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?, 'open', ?)`,
  ).run(
    id,
    userId,
    t.documentId ?? null,
    t.goalId ?? null,
    t.kind,
    title,
    t.description?.trim() || null,
    tier,
    t.source,
    t.sourceText ?? null,
    t.kind === 'event' ? startAt(date, time) : null,
    remindAt,
    t.kind === 'deadline' ? dueDate : null,
    t.recurrence ?? 'none',
    nowIso(),
  );
  return id;
}
