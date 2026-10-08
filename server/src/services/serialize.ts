import { db } from '../db.js';
import { todayZagreb } from '../util/dates.js';
import { notFound } from '../util/http.js';
import { taskDate } from './game.js';
import { shareMembers, type ShareMember } from './social.js';

export interface TaskOut {
  id: string;
  kind: 'event' | 'deadline';
  title: string;
  description: string | null;
  tier: number;
  source: string;
  sourceText: string | null;
  /** Calendar date the task belongs to (due date, or start date for events). */
  date: string | null;
  startAt: string | null;
  time: string | null;
  remindAt: string | null;
  dueDate: string | null;
  recurrence: string;
  status: 'open' | 'done' | 'missed';
  completedAt: string | null;
  proofReason: string | null;
  documentId: string | null;
  documentTitle: string | null;
  goalId: string | null;
  createdAt: string;
  overdue: boolean;
  /** Other members of a joint task (their own copies), or null when not shared. */
  shared: ShareMember[] | null;
}

export interface TaskRow {
  id: string;
  kind: 'event' | 'deadline';
  title: string;
  description: string | null;
  tier: number;
  source: string;
  source_text: string | null;
  start_at: string | null;
  remind_at: string | null;
  due_date: string | null;
  recurrence: string;
  status: 'open' | 'done' | 'missed';
  completed_at: string | null;
  proof_reason: string | null;
  document_id: string | null;
  document_title: string | null;
  goal_id: string | null;
  created_at: string;
}

/** Callers append their own WHERE that starts with the t.user_id filter. */
export const TASK_SELECT = `SELECT t.*, d.title AS document_title FROM tasks t
  LEFT JOIN documents d ON d.id = t.document_id`;

/** Sort open work by its calendar date, undated last. */
export const TASK_ORDER = `t.status = 'done', COALESCE(t.due_date, substr(t.start_at, 1, 10)) IS NULL,
  COALESCE(t.due_date, substr(t.start_at, 1, 10)), t.created_at DESC`;

export function taskOut(r: TaskRow): TaskOut {
  const date = taskDate(r);
  return {
    id: r.id,
    kind: r.kind,
    title: r.title,
    description: r.description,
    tier: r.tier,
    source: r.source,
    sourceText: r.source_text,
    date,
    startAt: r.start_at,
    time: r.start_at && r.start_at.length > 10 ? r.start_at.slice(11, 16) : null,
    remindAt: r.remind_at,
    dueDate: r.due_date,
    recurrence: r.recurrence,
    status: r.status,
    completedAt: r.completed_at,
    proofReason: r.proof_reason,
    documentId: r.document_id,
    documentTitle: r.document_title,
    goalId: r.goal_id,
    createdAt: r.created_at,
    overdue: r.status !== 'done' && r.kind === 'deadline' && !!r.due_date && r.due_date < todayZagreb(),
    shared: shareMembers(r.id),
  };
}

export function taskById(userId: string, id: string): TaskOut {
  const row = db.prepare(`${TASK_SELECT} WHERE t.user_id = ? AND t.id = ?`).get(userId, id) as TaskRow | undefined;
  if (!row) throw notFound('Zadatak');
  return taskOut(row);
}
