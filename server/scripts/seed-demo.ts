/** Demo data for the account SEED_EMAIL: an old dentist visit (drives a recommendation), an overdue bill, a goal. */
import { db, newId, nowIso } from '../src/db.js';
import { insertTask } from '../src/services/tasks.js';
import { addDays, addMonths, todayZagreb } from '../src/util/dates.js';

const email = process.env.SEED_EMAIL;
const user = email
  ? (db.prepare('SELECT id FROM users WHERE email = ?').get(email) as { id: string } | undefined)
  : undefined;
if (!user) {
  console.error('Postavi SEED_EMAIL na email postojećeg računa (registriraj se u aplikaciji).');
  process.exit(1);
}
const userId = user.id;
const today = todayZagreb();

if (db.prepare("SELECT 1 FROM tasks WHERE user_id = ? AND title = 'Pregled kod stomatologa'").get(userId)) {
  console.log('Demo podaci već postoje.');
  process.exit(0);
}

insertTask(userId, {
  kind: 'event',
  title: 'Pregled kod stomatologa',
  description: 'Redovita kontrola',
  tier: 4,
  source: 'user',
  date: addMonths(today, -6),
  time: '09:00',
});

const goalId = newId();
db.prepare('INSERT INTO goals (id, user_id, title, description, target_date, created_at) VALUES (?,?,?,?,?,?)').run(
  goalId,
  userId,
  'Srediti papirologiju',
  'Prikupiti i predati sve važne dokumente',
  addDays(today, 30),
  nowIso(),
);

insertTask(userId, { kind: 'deadline', title: 'Platiti struju', tier: 3, source: 'user', dueDate: addDays(today, 2), goalId });
insertTask(userId, {
  kind: 'deadline',
  title: 'Pripremiti dokumentaciju za banku',
  tier: 3,
  source: 'user',
  dueDate: addDays(today, 5),
  goalId,
});
insertTask(userId, { kind: 'deadline', title: 'Registracija auta', tier: 4, source: 'user', dueDate: addDays(today, 12) });

console.log('Demo podaci dodani: stomatolog (prije 6 mjeseci), struja, banka, registracija (boss), cilj.');
