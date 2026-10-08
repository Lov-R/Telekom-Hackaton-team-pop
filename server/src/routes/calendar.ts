import { Router } from 'express';
import { db } from '../db.js';
import { TASK_SELECT, taskOut, type TaskOut, type TaskRow } from '../services/serialize.js';
import { addDays, addMonths, isValidDate, todayZagreb } from '../util/dates.js';

/** Occurrences of a recurring task inside [from, to]; the stored date is the first one. */
function occurrences(first: string, recurrence: string, from: string, to: string): string[] {
  if (recurrence === 'none') return first >= from && first <= to ? [first] : [];
  const step = recurrence === 'monthly' ? 1 : 12;
  const out: string[] = [];
  for (let i = 0, d = first; d <= to && i < 600; i++, d = addMonths(first, step * i)) {
    if (d >= from) out.push(d);
  }
  return out;
}

export const calendarRouter = Router();

/** SRS §5.5: tasks of kind event and deadline on their calendar dates, recurring ones expanded. */
calendarRouter.get('/calendar', (req, res) => {
  const today = todayZagreb();
  const from = typeof req.query.from === 'string' && isValidDate(req.query.from) ? req.query.from : addDays(today, -31);
  const to = typeof req.query.to === 'string' && isValidDate(req.query.to) ? req.query.to : addDays(today, 62);
  const rows = db
    .prepare(
      `${TASK_SELECT} WHERE t.user_id = ?
       AND COALESCE(t.due_date, substr(t.start_at, 1, 10)) IS NOT NULL
       AND (t.recurrence != 'none' OR COALESCE(t.due_date, substr(t.start_at, 1, 10)) BETWEEN ? AND ?)
       AND (t.recurrence = 'none' OR COALESCE(t.due_date, substr(t.start_at, 1, 10)) <= ?)`,
    )
    .all(req.userId, from, to, to) as TaskRow[];
  const items: (TaskOut & { occurrence: string })[] = [];
  for (const t of rows.map(taskOut)) {
    for (const d of occurrences(t.date as string, t.recurrence, from, to)) items.push({ ...t, occurrence: d });
  }
  items.sort((a, b) => a.occurrence.localeCompare(b.occurrence) || (a.time ?? '99').localeCompare(b.time ?? '99'));
  res.json(items);
});
