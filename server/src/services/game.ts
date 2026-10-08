/**
 * SRS §6: the only module that writes hp_ledger, profiles.hp/map_index/presence/streak and tasks.status = done/missed.
 * Routes never touch those columns directly (§8.3).
 */
import { db, newId, nowIso, tx } from '../db.js';
import { addDays, addMonths, diffDays, todayZagreb, toZagrebDate } from '../util/dates.js';
import { HttpError, notFound } from '../util/http.js';

export type Tier = 1 | 2 | 3 | 4 | 5;

/** §6.1 */
export const TIERS: Record<Tier, { name: string; base: number; penalty: number }> = {
  1: { name: 'Sitnica', base: 2, penalty: 5 },
  2: { name: 'Obaveza', base: 5, penalty: 10 },
  3: { name: 'Papirologija', base: 10, penalty: 15 },
  4: { name: 'Velika obaveza', base: 20, penalty: 25 },
  5: { name: 'Epska obaveza', base: 30, penalty: 35 },
};

/** §6.3 */
export const MAPS = [
  { name: 'Močvara Odgađanja', phase: 'Sjena' },
  { name: 'Šuma Papira', phase: 'Iskra' },
  { name: 'Grad Obaveza', phase: 'Srebrni trag' },
  { name: 'Planina Discipline', phase: 'Sjaj' },
  { name: 'Vrh Mirne Glave', phase: 'Legenda' },
] as const;

const FIELDS = 10;
const BOSS_BONUS = 10;
const NO_PROOF_DAILY_LIMIT = 3;
const DOCUMENT_DAILY_LIMIT = 5;
const DAY_WITHOUT_TASK_PENALTY = 5;
const PRESENCE_PER_TASK = 10;

export const LEDGER_REASONS = {
  task_proof: 'Riješen zadatak s dokazom',
  task_no_proof: 'Riješen zadatak bez dokaza',
  document: 'Novi dokument',
  boss: 'Pobijeđen boss',
} as const;

export interface ProfileRow {
  id: string;
  display_name: string;
  tone: 'blago' | 'sarkasticno' | 'brutalno';
  language: 'hr' | 'en';
  avatar_config: string;
  hp: number;
  map_index: number;
  map_steps: number;
  presence: number;
  streak_days: number;
  last_completed_date: string | null;
  presence_checked_date: string | null;
  onboarded: number;
  friend_code: string;
  created_at: string;
}

export function profileRow(userId: string): ProfileRow {
  const row = db.prepare('SELECT * FROM profiles WHERE id = ?').get(userId) as ProfileRow | undefined;
  if (!row) throw notFound('Profil');
  return row;
}

interface TaskRow {
  id: string;
  user_id: string;
  kind: 'event' | 'deadline';
  title: string;
  tier: Tier;
  start_at: string | null;
  due_date: string | null;
  remind_at: string | null;
  recurrence: 'none' | 'monthly' | 'yearly';
  status: 'open' | 'done' | 'missed';
  created_at: string;
}

/** The calendar date a task belongs to: due date for deadlines, start date for events. */
export const taskDate = (t: { due_date: string | null; start_at: string | null }): string | null =>
  t.due_date ?? t.start_at?.slice(0, 10) ?? null;

function ledgerCountToday(userId: string, reason: string, today: string): number {
  const rows = db
    .prepare('SELECT created_at FROM hp_ledger WHERE user_id = ? AND reason = ? AND created_at >= ?')
    .all(userId, reason, addDays(today, -2)) as { created_at: string }[];
  return rows.filter((r) => toZagrebDate(r.created_at) === today).length;
}

/** Adds HP and carries overflow into the next map (§6.3: at 100 HP a new map unlocks, the rest carries over). */
function addHp(
  userId: string,
  amount: number,
  reason: keyof typeof LEDGER_REASONS,
  refs: { taskId?: string; documentId?: string },
): { mapsUnlocked: number } {
  db.prepare(
    'INSERT INTO hp_ledger (id, user_id, task_id, document_id, amount, reason, created_at) VALUES (?,?,?,?,?,?,?)',
  ).run(newId(), userId, refs.taskId ?? null, refs.documentId ?? null, amount, reason, nowIso());
  if (amount <= 0) return { mapsUnlocked: 0 };
  const p = profileRow(userId);
  let hp = p.hp + amount;
  let mapsUnlocked = 0;
  while (hp >= 100) {
    hp -= 100;
    mapsUnlocked++;
  }
  // A new map starts the walk again from its first field.
  db.prepare(
    'UPDATE profiles SET hp = ?, map_index = map_index + ?, map_steps = CASE WHEN ? > 0 THEN 0 ELSE map_steps END WHERE id = ?',
  ).run(hp, mapsUnlocked, mapsUnlocked, userId);
  return { mapsUnlocked };
}

/** §6.2 "novi dokument +1 HP (najviše 5 dnevno, duplikati 0)". Once per document. */
export function rewardDocument(userId: string, documentId: string): number {
  return tx(() => {
    const already = db
      .prepare("SELECT 1 FROM hp_ledger WHERE user_id = ? AND document_id = ? AND reason = 'document'")
      .get(userId, documentId);
    if (already) return 0;
    if (ledgerCountToday(userId, 'document', todayZagreb()) >= DOCUMENT_DAILY_LIMIT) return 0;
    addHp(userId, 1, 'document', { documentId });
    return 1;
  });
}

/** §6.3: the user's nearest open tier 4-5 task stands on the last field. */
export function currentBoss(userId: string): { id: string; title: string; tier: number; date: string | null } | null {
  const row = db
    .prepare(
      `SELECT id, title, tier, due_date, start_at FROM tasks
       WHERE user_id = ? AND status = 'open' AND tier >= 4
       ORDER BY COALESCE(due_date, substr(start_at, 1, 10)) IS NULL, COALESCE(due_date, substr(start_at, 1, 10)), created_at
       LIMIT 1`,
    )
    .get(userId) as { id: string; title: string; tier: number; due_date: string | null; start_at: string | null } | undefined;
  return row ? { id: row.id, title: row.title, tier: row.tier, date: taskDate(row) } : null;
}

export interface CompletionResult {
  amount: number;
  breakdown: { base: number; time: number; proof: number; streak: number; capped: boolean };
  bossDefeated: boolean;
  mapsUnlocked: number;
}

function shiftDate(date: string | null, recurrence: 'monthly' | 'yearly'): string | null {
  if (!date) return null;
  const day = date.slice(0, 10);
  const next = addMonths(day, recurrence === 'monthly' ? 1 : 12);
  return `${next}${date.slice(10)}`;
}

/**
 * SRS §6.2 / §9.5 complete-task: the only place that sets status = done and awards task HP.
 * HP = base × time × proof × (1 + streak), rounded, minimum 1 when positive.
 */
export function completeTask(
  userId: string,
  taskId: string,
  proof: { documentId: string | null; reason: string } | null,
): CompletionResult {
  return tx(() => {
    const task = db.prepare('SELECT * FROM tasks WHERE id = ? AND user_id = ?').get(taskId, userId) as
      | TaskRow
      | undefined;
    if (!task) throw notFound('Zadatak');
    if (task.status === 'done') throw new HttpError(409, 'already_done', 'Zadatak je već riješen.');

    const today = todayZagreb();
    const p = profileRow(userId);
    const boss = currentBoss(userId);

    const date = taskDate(task);
    const daysLeft = date ? diffDays(date, today) : 0;
    const time = !date ? 1 : daysLeft >= 3 ? 1.2 : daysLeft >= 0 ? 1.0 : 0.5;

    const capped = !proof && ledgerCountToday(userId, 'task_no_proof', today) >= NO_PROOF_DAILY_LIMIT;
    const proofMult = proof ? 1 : 0.3;

    const streakDays =
      p.last_completed_date === today
        ? p.streak_days
        : p.last_completed_date === addDays(today, -1)
          ? p.streak_days + 1
          : 1;
    const streak = Math.min(0.05 * streakDays, 0.5);

    const base = TIERS[task.tier].base;
    const raw = base * time * proofMult * (1 + streak);
    const amount = capped ? 0 : raw > 0 ? Math.max(1, Math.round(raw)) : 0;

    db.prepare(
      `UPDATE tasks SET status = 'done', completed_at = ?, proof_document_id = ?, proof_reason = ? WHERE id = ?`,
    ).run(nowIso(), proof?.documentId ?? null, proof?.reason ?? null, task.id);

    let { mapsUnlocked } = addHp(userId, amount, proof ? 'task_proof' : 'task_no_proof', { taskId: task.id });
    const bossDefeated = boss?.id === task.id;
    if (bossDefeated) mapsUnlocked += addHp(userId, BOSS_BONUS, 'boss', { taskId: task.id }).mapsUnlocked;

    db.prepare(
      'UPDATE profiles SET presence = MIN(100, presence + ?), streak_days = ?, last_completed_date = ? WHERE id = ?',
    ).run(PRESENCE_PER_TASK, streakDays, today, userId);

    // Every completed task is one step on the map, verified or not. Walking past the last field (the boss)
    // opens the next map. If HP already opened one just now, the figure stays on its first field.
    if (mapsUnlocked === 0) {
      const steps = profileRow(userId).map_steps + 1;
      const nextMap = steps >= FIELDS;
      db.prepare('UPDATE profiles SET map_steps = ?, map_index = map_index + ? WHERE id = ?').run(
        nextMap ? 0 : steps,
        nextMap ? 1 : 0,
        userId,
      );
      if (nextMap) mapsUnlocked = 1;
    }

    // Recurring tasks continue with the next occurrence.
    if (task.recurrence !== 'none') {
      const full = db.prepare('SELECT * FROM tasks WHERE id = ?').get(task.id) as Record<string, unknown>;
      db.prepare(
        `INSERT INTO tasks (id, user_id, document_id, goal_id, kind, title, description, tier, source, source_text,
           start_at, remind_at, due_date, recurrence, status, created_at)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?, 'open', ?)`,
      ).run(
        newId(),
        userId,
        full.document_id,
        full.goal_id,
        task.kind,
        task.title,
        full.description,
        task.tier,
        full.source,
        full.source_text,
        shiftDate(task.start_at, task.recurrence),
        shiftDate(task.remind_at, task.recurrence),
        shiftDate(task.due_date, task.recurrence),
        task.recurrence,
        nowIso(),
      );
    }

    return {
      amount,
      breakdown: { base, time, proof: proofMult, streak, capped },
      bossDefeated,
      mapsUnlocked,
    };
  });
}

/**
 * §6.4 presence upkeep, idempotent: missed deadlines cost their tier penalty once,
 * and every finished day without a completed task costs 5 %.
 */
export function applyPresenceRules(userId: string): void {
  tx(() => {
    const today = todayZagreb();
    const p = profileRow(userId);
    let presence = p.presence;

    const missed = db
      .prepare(
        `SELECT id, tier FROM tasks WHERE user_id = ? AND kind = 'deadline' AND status = 'open'
         AND penalty_applied = 0 AND due_date IS NOT NULL AND due_date < ?`,
      )
      .all(userId, today) as { id: string; tier: Tier }[];
    const markMissed = db.prepare("UPDATE tasks SET status = 'missed', penalty_applied = 1 WHERE id = ?");
    for (const t of missed) {
      presence -= TIERS[t.tier].penalty;
      markMissed.run(t.id);
    }

    const checked = p.presence_checked_date ?? addDays(toZagrebDate(p.created_at), -1);
    const yesterday = addDays(today, -1);
    if (checked < yesterday) {
      const doneDays = new Set(
        (
          db
            .prepare("SELECT completed_at FROM tasks WHERE user_id = ? AND status = 'done' AND completed_at >= ?")
            .all(userId, `${addDays(checked, -1)}T00:00:00Z`) as { completed_at: string }[]
        ).map((r) => toZagrebDate(r.completed_at)),
      );
      // Cap the catch-up so a long-idle account doesn't loop for years.
      let day = addDays(checked, 1);
      if (diffDays(yesterday, day) > 60) day = addDays(yesterday, -60);
      for (; day <= yesterday; day = addDays(day, 1)) {
        if (!doneDays.has(day)) presence -= DAY_WITHOUT_TASK_PENALTY;
      }
    }

    presence = Math.max(0, Math.min(100, presence));
    db.prepare('UPDATE profiles SET presence = ?, presence_checked_date = ? WHERE id = ?').run(
      presence,
      checked < yesterday ? yesterday : checked,
      userId,
    );
  });
}

export interface AvatarConfig {
  name: string;
  color: string;
  accessory: string;
}

export const GHOST_COLORS = ['lavanda', 'menta', 'breskva', 'nebo', 'limun'] as const;
export const ACCESSORIES: { key: string; map: number }[] = [
  { key: 'none', map: 1 },
  { key: 'sesir', map: 1 },
  { key: 'naocale', map: 2 },
  { key: 'masna', map: 3 },
  { key: 'kruna', map: 5 },
];

export function avatarOf(p: ProfileRow): AvatarConfig {
  let raw: Partial<AvatarConfig> = {};
  try {
    raw = JSON.parse(p.avatar_config) as Partial<AvatarConfig>;
  } catch {
    // Corrupt config falls back to defaults.
  }
  return {
    name: typeof raw.name === 'string' && raw.name ? raw.name : 'Duško',
    color: GHOST_COLORS.includes(raw.color as (typeof GHOST_COLORS)[number]) ? (raw.color as string) : 'lavanda',
    accessory: typeof raw.accessory === 'string' ? raw.accessory : 'none',
  };
}

export interface MapMarker {
  taskId: string;
  title: string;
  tier: number;
  kind: string;
  date: string | null;
  field: number;
}

export interface GameState {
  displayName: string;
  tone: ProfileRow['tone'];
  language: ProfileRow['language'];
  onboarded: boolean;
  friendCode: string;
  avatar: AvatarConfig;
  unlockedAccessories: string[];
  hp: number;
  totalHp: number;
  mapIndex: number;
  mapName: string;
  phase: string;
  /** 0-4 into MAPS; stays at 4 past the last map. */
  phaseIndex: number;
  stars: number;
  field: number;
  presence: number;
  /** §6.4: opacity = 0.25 + 0.75 × presence */
  opacity: number;
  flicker: boolean;
  streak: number;
  boss: ReturnType<typeof currentBoss>;
  markers: MapMarker[];
}

export function gameState(userId: string): GameState {
  const p = profileRow(userId);
  const phaseIndex = Math.min(p.map_index, MAPS.length) - 1;
  const field = Math.min(p.map_steps, FIELDS - 1) + 1;
  const boss = currentBoss(userId);
  const upcoming = db
    .prepare(
      `SELECT id, title, tier, kind, due_date, start_at FROM tasks
       WHERE user_id = ? AND status IN ('open','missed') AND id IS NOT ?
       ORDER BY COALESCE(due_date, substr(start_at, 1, 10)) IS NULL, COALESCE(due_date, substr(start_at, 1, 10)), created_at
       LIMIT ?`,
    )
    .all(userId, boss?.id ?? null, Math.max(0, FIELDS - 1 - field)) as {
    id: string;
    title: string;
    tier: number;
    kind: string;
    due_date: string | null;
    start_at: string | null;
  }[];
  const totalHp = (
    db.prepare('SELECT COALESCE(SUM(amount), 0) AS n FROM hp_ledger WHERE user_id = ?').get(userId) as { n: number }
  ).n;
  const today = todayZagreb();
  // A streak only counts while it is unbroken: last completion today or yesterday.
  const streak =
    p.last_completed_date && p.last_completed_date >= addDays(today, -1) ? p.streak_days : 0;
  return {
    displayName: p.display_name,
    tone: p.tone,
    language: p.language,
    onboarded: p.onboarded === 1,
    friendCode: p.friend_code,
    avatar: avatarOf(p),
    unlockedAccessories: ACCESSORIES.filter((a) => a.map <= p.map_index).map((a) => a.key),
    hp: p.hp,
    totalHp,
    mapIndex: p.map_index,
    mapName: MAPS[phaseIndex].name,
    phase: MAPS[phaseIndex].phase,
    phaseIndex,
    stars: Math.max(0, p.map_index - MAPS.length),
    field,
    presence: p.presence,
    opacity: Math.round((0.25 + 0.75 * (p.presence / 100)) * 100) / 100,
    flicker: p.presence < 30,
    streak,
    boss,
    markers: [
      ...upcoming.map((t, i) => ({
        taskId: t.id,
        title: t.title,
        tier: t.tier,
        kind: t.kind,
        date: taskDate(t),
        field: field + 1 + i,
      })),
      ...(boss
        ? [{ taskId: boss.id, title: boss.title, tier: boss.tier, kind: 'boss', date: boss.date, field: FIELDS }]
        : []),
    ],
  };
}

export function ledger(userId: string, limit = 20) {
  const rows = db
    .prepare(
      `SELECT l.id, l.amount, l.reason, l.created_at, t.title AS task_title, d.title AS document_title
       FROM hp_ledger l
       LEFT JOIN tasks t ON t.id = l.task_id
       LEFT JOIN documents d ON d.id = l.document_id
       WHERE l.user_id = ? ORDER BY l.created_at DESC LIMIT ?`,
    )
    .all(userId, limit) as {
    id: string;
    amount: number;
    reason: keyof typeof LEDGER_REASONS;
    created_at: string;
    task_title: string | null;
    document_title: string | null;
  }[];
  return rows.map((r) => ({
    id: r.id,
    amount: r.amount,
    reason: r.reason,
    label: LEDGER_REASONS[r.reason] ?? r.reason,
    subject: r.task_title ?? r.document_title,
    createdAt: r.created_at,
  }));
}
