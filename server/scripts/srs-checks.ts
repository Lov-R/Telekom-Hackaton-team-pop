/**
 * SRS §12 checks for the code-only rules (no Gemini): date rules (§5.4), HP formula (§6.2), presence (§6.4).
 * Run against a scratch database: RELAI_DATA_DIR=<empty dir> npx tsx scripts/srs-checks.ts
 */
if (!process.env.RELAI_DATA_DIR) {
  console.error('Postavi RELAI_DATA_DIR na praznu mapu; skripta piše u bazu.');
  process.exit(1);
}

const { db, newId, nowIso } = await import('../src/db.js');
const { followUpDates } = await import('../src/services/dateRules.js');
const { applyPresenceRules, completeTask, gameState, profileRow } = await import('../src/services/game.js');
const { addDays, todayZagreb } = await import('../src/util/dates.js');

let failures = 0;
function check(name: string, ok: boolean, extra = ''): void {
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${extra ? ` - ${extra}` : ''}`);
  if (!ok) failures++;
}

const fu = (p: Partial<{ found: boolean; interval_months: number; exact_date: string | null }>) => ({
  found: true,
  title: 'x',
  interval_months: 0,
  exact_date: null,
  source_text: 'x',
  ...p,
});

const a = followUpDates('2026-07-15', fu({ interval_months: 6 }), '2026-10-08');
check('"Kontrola za 6 mjeseci" od 15.7.2026.: podsjetnik 15.10.2026., rok 15.1.2027.',
  a?.remindAt === '2026-10-15' && a?.dueDate === '2027-01-15', JSON.stringify(a));
const b = followUpDates('2026-03-01', fu({ exact_date: '2027-03-01' }), '2026-10-08');
check('"vrijedi do": rok na taj datum, podsjetnik 30 dana prije',
  b?.dueDate === '2027-03-01' && b?.remindAt === '2027-01-30', JSON.stringify(b));
check('"po potrebi": nema taska', followUpDates('2026-07-15', fu({ found: false }), '2026-10-08') === null);
const c = followUpDates('2026-09-01', fu({ exact_date: '2026-10-20' }), '2026-10-08');
check('"Valuta plaćanja: 20.10.2026." daje rok 20.10.2026.', c?.dueDate === '2026-10-20');

const today = todayZagreb();
const userId = newId();
db.prepare("INSERT INTO users (id, email, password_hash, created_at) VALUES (?, ?, 'x', ?)").run(userId, `${userId}@t.hr`, nowIso());
db.prepare(
  `INSERT INTO profiles (id, display_name, friend_code, last_completed_date, streak_days, presence_checked_date, created_at)
   VALUES (?, 'T', ?, ?, 3, ?, ?)`,
).run(userId, userId.slice(0, 8), addDays(today, -1), addDays(today, -1), nowIso());

const task = (tier: number, due: string, createdAt = nowIso()): string => {
  const id = newId();
  db.prepare(
    "INSERT INTO tasks (id, user_id, kind, title, tier, due_date, status, created_at) VALUES (?,?, 'deadline', 'T', ?, ?, 'open', ?)",
  ).run(id, userId, tier, due, createdAt);
  return id;
};

// Tier 4, 5 days early, with proof, 4-day streak (3 before + today): 20 × 1.2 × 1.0 × 1.2 = 28.8 → 29.
const r1 = completeTask(userId, task(4, addDays(today, 5)), { documentId: null, reason: 'ok' });
check('Razina 4, 5 dana ranije, s dokazom, niz 4: 29 HP (+10 boss)', r1.amount === 29, JSON.stringify(r1));

const before = profileRow(userId);
const missedId = task(4, addDays(today, -2));
applyPresenceRules(userId);
const after = profileRow(userId);
check('Propušten rok smanjuje prisutnost jednom (−25 %), HP ostaje',
  after.presence === Math.max(0, before.presence - 25) && after.hp === before.hp,
  `presence ${before.presence} → ${after.presence}, hp ${before.hp} → ${after.hp}`);
applyPresenceRules(userId);
check('Kazna se ne ponavlja', profileRow(userId).presence === after.presence);
const status = (db.prepare('SELECT status FROM tasks WHERE id = ?').get(missedId) as { status: string }).status;
check('Task je označen missed', status === 'missed');

const g = gameState(userId);
check('Opacity = 0,25 + 0,75 × prisutnost', g.opacity === Math.round((0.25 + 0.75 * (g.presence / 100)) * 100) / 100, `${g.opacity}`);

// 100 HP unlocks the next map and carries the rest over.
db.prepare('UPDATE profiles SET hp = 95 WHERE id = ?').run(userId);
const r2 = completeTask(userId, task(5, addDays(today, 10)), { documentId: null, reason: 'ok' });
const p2 = profileRow(userId);
check('Na 100 HP otključava se nova mapa, višak se prenosi',
  p2.map_index === 2 && p2.hp === (95 + r2.amount + (r2.bossDefeated ? 10 : 0)) - 100,
  `map ${p2.map_index}, hp ${p2.hp}, +${r2.amount}${r2.bossDefeated ? ' +10 boss' : ''}`);
check('Faza duha prati mapu', gameState(userId).phase === 'Iskra');

console.log(failures === 0 ? 'SRS CHECKS OK' : `SRS CHECKS FAILED (${failures})`);
process.exit(failures === 0 ? 0 : 1);

export {};
