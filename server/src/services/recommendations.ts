import { db, newId, nowIso, tx } from '../db.js';
import { addDays, addMonths, formatHr, todayZagreb } from '../util/dates.js';
import { HttpError, notFound } from '../util/http.js';
import { normalize } from '../util/text.js';
import { parseExtracted } from './documents.js';
import { taskDate } from './game.js';
import { RULES, matchesRule } from './rules.js';
import { taskById } from './serialize.js';
import { insertTask } from './tasks.js';

export interface Recommendation {
  id: string;
  title: string;
  reason: string;
  suggestedDate: string | null;
  ruleKey: string | null;
}

interface RecRow {
  id: string;
  dedupe_key: string;
  rule_key: string | null;
  title: string;
  reason: string | null;
  suggested_date: string | null;
  source_task_id: string | null;
  source_document_id: string | null;
  status: string;
}

interface Occurrence {
  date: string;
  text: string;
  taskId: string | null;
  documentId: string | null;
}

function gatherOccurrences(userId: string): Occurrence[] {
  const tasks = db
    .prepare('SELECT id, title, description, due_date, start_at, document_id FROM tasks WHERE user_id = ?')
    .all(userId) as {
    id: string;
    title: string;
    description: string | null;
    due_date: string | null;
    start_at: string | null;
    document_id: string | null;
  }[];
  const occ: Occurrence[] = tasks.flatMap((t) => {
    const date = taskDate(t);
    return date
      ? [{ date, text: normalize(`${t.title} ${t.description ?? ''}`), taskId: t.id, documentId: t.document_id }]
      : [];
  });
  const docs = db
    .prepare("SELECT id, title, document_date, extracted FROM documents WHERE user_id = ? AND status = 'ready' AND is_proof = 0")
    .all(userId) as { id: string; title: string; document_date: string | null; extracted: string }[];
  for (const d of docs) {
    const x = parseExtracted(d.extracted);
    const text = normalize(`${x.docType ?? ''} ${d.title}`);
    if (d.document_date) occ.push({ date: d.document_date, text, taskId: null, documentId: d.id });
    for (const k of x.keyDates ?? []) {
      occ.push({ date: k.date, text: normalize(`${k.label} ${text}`), taskId: null, documentId: d.id });
    }
  }
  return occ;
}

/** Periodic check-ups (rules.ts) whose last occurrence is old enough, and expiries nobody planned for. */
function runEngine(userId: string): void {
  const today = todayZagreb();
  const occ = gatherOccurrences(userId);
  const insert = db.prepare(
    `INSERT OR IGNORE INTO recommendations
       (id, user_id, dedupe_key, rule_key, title, reason, suggested_date, source_task_id, source_document_id, status, created_at)
     VALUES (?,?,?,?,?,?,?,?,?, 'pending', ?)`,
  );

  tx(() => {
    for (const rule of RULES) {
      const matched = occ.filter((o) => matchesRule(rule, o.text));
      const past = matched.filter((o) => o.date <= today).sort((a, b) => b.date.localeCompare(a.date));
      if (matched.some((o) => o.date > today)) {
        db.prepare("DELETE FROM recommendations WHERE user_id = ? AND status = 'pending' AND rule_key = ?").run(
          userId,
          rule.key,
        );
        continue;
      }
      const last = past[0];
      if (!last) continue;
      const due = addMonths(last.date, rule.intervalMonths);
      if (today < addDays(due, -rule.leadDays)) continue;
      const soonest = addDays(today, 7);
      insert.run(
        newId(),
        userId,
        `${rule.key}:${last.date}`,
        rule.key,
        rule.title,
        rule.reasonTpl.replace('{date}', formatHr(last.date)),
        due > soonest ? due : soonest,
        last.taskId,
        last.documentId,
        nowIso(),
      );
    }

    // Documents expiring within 90 days that have no task attached.
    const expiring = db
      .prepare(
        `SELECT d.id, d.title, d.expiry_date FROM documents d
         WHERE d.user_id = ? AND d.is_proof = 0 AND d.expiry_date BETWEEN ? AND ?
         AND NOT EXISTS (SELECT 1 FROM tasks t WHERE t.document_id = d.id AND t.status != 'done')`,
      )
      .all(userId, today, addDays(today, 90)) as { id: string; title: string; expiry_date: string }[];
    for (const d of expiring) {
      const preferred = addDays(d.expiry_date, -30);
      insert.run(
        newId(),
        userId,
        `istek:${d.id}`,
        null,
        `Obnovi: ${d.title}`,
        `Ističe ${formatHr(d.expiry_date)} Obnovi na vrijeme kako ne bi zakasnio.`,
        preferred < today ? addDays(today, 3) : preferred,
        null,
        d.id,
        nowIso(),
      );
    }
  });
}

const toRec = (r: RecRow): Recommendation => ({
  id: r.id,
  title: r.title,
  reason: r.reason ?? '',
  suggestedDate: r.suggested_date,
  ruleKey: r.rule_key,
});

export function listRecommendations(userId: string): Recommendation[] {
  runEngine(userId);
  const rows = db
    .prepare(
      "SELECT * FROM recommendations WHERE user_id = ? AND status = 'pending' ORDER BY suggested_date, created_at",
    )
    .all(userId) as RecRow[];
  return rows.map(toRec);
}

function getRec(userId: string, id: string): RecRow {
  const rec = db.prepare('SELECT * FROM recommendations WHERE id = ? AND user_id = ?').get(id, userId) as
    | RecRow
    | undefined;
  if (!rec) throw notFound('Preporuka');
  return rec;
}

export function acceptRecommendation(userId: string, id: string, date?: string) {
  const rec = getRec(userId, id);
  if (rec.status !== 'pending') throw new HttpError(409, 'conflict', 'Preporuka je već obrađena.');
  const today = todayZagreb();
  const when = date ?? rec.suggested_date ?? addDays(today, 7);
  const isExpiry = rec.dedupe_key.startsWith('istek:');
  const taskId = tx(() => {
    const tid = insertTask(userId, {
      kind: 'deadline',
      title: isExpiry ? rec.title : `Naruči termin: ${rec.title}`,
      description: rec.reason,
      tier: isExpiry ? 5 : 4,
      source: 'recommendation',
      dueDate: when,
      remindAt: addDays(when, -7) < today ? today : addDays(when, -7),
      documentId: rec.source_document_id,
    });
    db.prepare("UPDATE recommendations SET status = 'accepted' WHERE id = ?").run(rec.id);
    return tid;
  });
  return { task: taskById(userId, taskId) };
}

export function dismissRecommendation(userId: string, id: string): void {
  const rec = getRec(userId, id);
  db.prepare("UPDATE recommendations SET status = 'dismissed' WHERE id = ?").run(rec.id);
}
