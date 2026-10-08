import { db, newId, nowIso, tx } from '../db.js';
import { HttpError, notFound } from '../util/http.js';
import { gameState, profileRow } from './game.js';
import { insertTask } from './tasks.js';

/**
 * F16 friends, joint tasks and in-app notifications.
 * Friends only ever see the public profile (SRS §8.3) and the tasks that were shared with them as their own copy.
 */

export type NotificationKind = 'friend_added' | 'task_shared' | 'friend_done' | 'group_done';

export function notify(userId: string, kind: NotificationKind, text: string, taskId: string | null = null): void {
  db.prepare('INSERT INTO notifications (id, user_id, task_id, template_key, text, created_at) VALUES (?,?,?,?,?,?)').run(
    newId(),
    userId,
    taskId,
    kind,
    text.slice(0, 300),
    nowIso(),
  );
}

const displayName = (userId: string): string => profileRow(userId).display_name;

/* ---------- friends ---------- */

export const areFriends = (a: string, b: string): boolean =>
  !!db.prepare('SELECT 1 FROM friendships WHERE user_id = ? AND friend_id = ?').get(a, b);

/** Public profile only: name, avatar and map progress. */
export function friendOut(friendId: string) {
  const g = gameState(friendId);
  return {
    id: friendId,
    displayName: g.displayName,
    avatar: g.avatar,
    mapIndex: g.mapIndex,
    mapName: g.mapName,
    hp: g.hp,
    streak: g.streak,
    presence: g.presence,
  };
}

export function listFriends(userId: string) {
  const rows = db
    .prepare('SELECT friend_id FROM friendships WHERE user_id = ? ORDER BY created_at')
    .all(userId) as { friend_id: string }[];
  return rows.map((r) => friendOut(r.friend_id));
}

/** Friendship is mutual and immediate (invite link or code). Adding an existing friend is a no-op. */
export function addFriendByCode(userId: string, rawCode: string) {
  const code = rawCode.trim().toUpperCase();
  const friend = db.prepare('SELECT id FROM profiles WHERE friend_code = ?').get(code) as { id: string } | undefined;
  if (!friend) throw new HttpError(404, 'bad_code', 'Ne postoji korisnik s tim kodom.');
  if (friend.id === userId) throw new HttpError(400, 'own_code', 'To je tvoj kod. Pošalji ga prijatelju.');
  const added = tx(() => {
    if (areFriends(userId, friend.id)) return false;
    const now = nowIso();
    const ins = db.prepare('INSERT OR IGNORE INTO friendships (user_id, friend_id, created_at) VALUES (?,?,?)');
    ins.run(userId, friend.id, now);
    ins.run(friend.id, userId, now);
    notify(friend.id, 'friend_added', `${displayName(userId)} ti je sada prijatelj na relAI-ju.`);
    return true;
  });
  return { added, friend: friendOut(friend.id) };
}

export function removeFriend(userId: string, friendId: string): void {
  const r = db
    .prepare('DELETE FROM friendships WHERE (user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?)')
    .run(userId, friendId, friendId, userId);
  if (r.changes === 0) throw notFound('Prijatelj');
}

/* ---------- joint tasks ---------- */

export interface ShareMember {
  userId: string;
  displayName: string;
  status: 'open' | 'done' | 'missed';
  completedAt: string | null;
}

const groupOf = (taskId: string): string | null =>
  (db.prepare('SELECT group_id FROM task_shares WHERE task_id = ?').get(taskId) as { group_id: string } | undefined)
    ?.group_id ?? null;

/** The other members of a shared task, or null when the task is not shared. */
export function shareMembers(taskId: string): ShareMember[] | null {
  const group = groupOf(taskId);
  if (!group) return null;
  const rows = db
    .prepare(
      `SELECT s.user_id, p.display_name, t.status, t.completed_at FROM task_shares s
       JOIN tasks t ON t.id = s.task_id JOIN profiles p ON p.id = s.user_id
       WHERE s.group_id = ? AND s.task_id != ? ORDER BY s.created_at`,
    )
    .all(group, taskId) as { user_id: string; display_name: string; status: ShareMember['status']; completed_at: string | null }[];
  if (rows.length === 0) return null;
  return rows.map((r) => ({ userId: r.user_id, displayName: r.display_name, status: r.status, completedAt: r.completed_at }));
}

/**
 * Gives each chosen friend their own copy of the task (no document or goal: those stay private) and
 * links the copies. Any member can invite more of their friends.
 */
export function shareTask(userId: string, taskId: string, friendIds: string[]): void {
  const task = db.prepare('SELECT * FROM tasks WHERE id = ? AND user_id = ?').get(taskId, userId) as
    | {
        id: string;
        kind: 'event' | 'deadline';
        title: string;
        description: string | null;
        tier: number;
        start_at: string | null;
        due_date: string | null;
        remind_at: string | null;
        recurrence: 'none' | 'monthly' | 'yearly';
        status: string;
      }
    | undefined;
  if (!task) throw notFound('Zadatak');
  if (task.status === 'done') throw new HttpError(409, 'already_done', 'Riješen zadatak se ne može dijeliti.');
  for (const f of friendIds) {
    if (!areFriends(userId, f)) throw new HttpError(400, 'not_friend', 'Zadatak možeš podijeliti samo s prijateljima.');
  }
  const sharer = displayName(userId);
  tx(() => {
    let group = groupOf(task.id);
    if (!group) {
      group = newId();
      db.prepare('INSERT INTO task_shares (task_id, group_id, user_id, invited_by, created_at) VALUES (?,?,?,?,?)').run(
        task.id,
        group,
        userId,
        null,
        nowIso(),
      );
    }
    const inGroup = new Set(
      (db.prepare('SELECT user_id FROM task_shares WHERE group_id = ?').all(group) as { user_id: string }[]).map(
        (r) => r.user_id,
      ),
    );
    for (const friendId of new Set(friendIds)) {
      if (inGroup.has(friendId)) continue;
      const date = task.start_at?.slice(0, 10) ?? null;
      const copyId = insertTask(friendId, {
        kind: task.kind,
        title: task.title,
        description: task.description,
        tier: task.tier,
        source: 'user',
        date,
        time: task.start_at && task.start_at.length > 10 ? task.start_at.slice(11, 16) : null,
        dueDate: task.due_date,
        remindAt: task.remind_at,
        recurrence: task.recurrence,
      });
      db.prepare('INSERT INTO task_shares (task_id, group_id, user_id, invited_by, created_at) VALUES (?,?,?,?,?)').run(
        copyId,
        group,
        friendId,
        userId,
        nowIso(),
      );
      notify(friendId, 'task_shared', `${sharer} dijeli s tobom zadatak „${task.title}”.`, copyId);
    }
  });
}

/** Called after a task is completed: tells the other members, and everyone once the whole group is done. */
export function notifyTaskCompleted(userId: string, taskId: string): void {
  const group = groupOf(taskId);
  if (!group) return;
  const rows = db
    .prepare(
      `SELECT s.task_id, s.user_id, t.status, t.title FROM task_shares s JOIN tasks t ON t.id = s.task_id
       WHERE s.group_id = ?`,
    )
    .all(group) as { task_id: string; user_id: string; status: string; title: string }[];
  if (rows.length < 2) return;
  const name = displayName(userId);
  const title = rows.find((r) => r.task_id === taskId)?.title ?? '';
  const allDone = rows.every((r) => r.status === 'done');
  for (const r of rows) {
    if (r.user_id === userId) continue;
    notify(r.user_id, 'friend_done', `${name} je riješio/la „${title}”.`, r.task_id);
  }
  if (allDone) {
    for (const r of rows) notify(r.user_id, 'group_done', `Svi ste riješili „${title}”. Bravo, ekipa!`, r.task_id);
  }
}

/* ---------- notifications ---------- */

export function listNotifications(userId: string) {
  const items = db
    .prepare(
      `SELECT id, task_id, template_key, text, created_at, read_at FROM notifications
       WHERE user_id = ? ORDER BY created_at DESC LIMIT 50`,
    )
    .all(userId) as {
    id: string;
    task_id: string | null;
    template_key: string;
    text: string;
    created_at: string;
    read_at: string | null;
  }[];
  const unread = (
    db.prepare('SELECT COUNT(*) AS n FROM notifications WHERE user_id = ? AND read_at IS NULL').get(userId) as {
      n: number;
    }
  ).n;
  return {
    unread,
    items: items.map((n) => ({
      id: n.id,
      kind: n.template_key,
      text: n.text,
      taskId: n.task_id,
      createdAt: n.created_at,
      read: n.read_at !== null,
    })),
  };
}

export function markNotificationsRead(userId: string): void {
  db.prepare('UPDATE notifications SET read_at = ? WHERE user_id = ? AND read_at IS NULL').run(nowIso(), userId);
}
