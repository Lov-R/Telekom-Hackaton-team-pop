import {t, taskTitle} from './i18n.js';

export const PROOF_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export const MAX_PROOF_BYTES = 8 * 1024 * 1024;
export const REWARDS = { aura: 150, silver: 350, halo: 600, map: 1000 };
export const penalties = [0, 5, 10, 20];
export const points = task => 10 + task.importance * 10 + task.difficulty * 10;
export const penalty = task => penalties[task.importance];
export const brightness = (_xp, hp) => Math.round(48 + .52 * Math.max(0, Math.min(100, hp)));
export function localDate(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
}
export function mondayOf(date) {
  const d = new Date(`${date}T12:00:00`);
  d.setDate(d.getDate() - (d.getDay() + 6) % 7);
  return localDate(d);
}
export function validateTask(task) {
  if (!task.title?.trim() || task.title.length > 90) throw new Error(t('Upiši naziv zadatka do 90 znakova.', 'Enter a task title up to 90 characters.'));
  if (![1,2,3].includes(task.importance) || ![1,2,3].includes(task.difficulty)) throw new Error(t('Važnost i težina moraju biti od 1 do 3.', 'Importance and difficulty must be between 1 and 3.'));
  if (!/^\d{4}-\d{2}-\d{2}$/.test(task.date) || !/^\d{2}:\d{2}$/.test(task.time)) throw new Error(t('Odaberi datum i vrijeme.', 'Choose a date and time.'));
  if (!Number.isFinite(new Date(`${task.date}T${task.time}:00`).getTime())) throw new Error(t('Neispravan rok.', 'Invalid due date.'));
  if (!['none','optional','required'].includes(task.proofPolicy)) throw new Error(t('Odaberi pravilo za dokaz.', 'Choose an evidence requirement.'));
  if (!task.proofPossible && task.proofPolicy !== 'none') throw new Error(t('Za ovaj zadatak fotografija nije moguća.', 'A photo is not possible for this task.'));
}
export function finishTask(state, id, status) {
  const next = structuredClone(state);
  const task = next.tasks.find(t => t.id === id);
  if (!task) throw new Error(t('Zadatak nije pronađen.', 'Task not found.'));
  if (task.status !== 'pending') return next;
  if (status === 'completed') {
    if (task.proofPossible && task.proofPolicy === 'required' && !task.proof) throw new Error(t('Priloži fotografiju prije potvrde dovršavanja.', 'Add a photo before confirming completion.'));
    next.xp += points(task); next.position += 1;
    next.weekXP += points(task); next.weekPosition += 1;
    next.hp = Math.min(100, next.hp + 5);
  } else if (status === 'missed') next.hp = Math.max(0, next.hp - penalty(task));
  else throw new Error(t('Nepoznati status.', 'Unknown status.'));
  next.peakHP = Math.max(state.peakHP ?? state.hp, next.hp);
  task.status = status; task.finishedAt = new Date().toISOString();
  return next;
}
export function notificationText(task, prefs, kind = 'reminder') {
  const hp = penalty(task), title = prefs.hideTitles ? t('Tvoj sljedeći zadatak', 'Your next task') : taskTitle(task);
  const needProof = task.proofPossible && task.proofPolicy === 'required' && !task.proof;
  let body;
  if (kind === 'missed') body = t('Rok je prošao: −{hp} HP. Sljedeći dovršen zadatak vraća 5 HP.', 'Deadline passed: −{hp} HP. Your next completed task restores 5 HP.', {hp});
  else if (prefs.tone === 'roast') body = needProof
    ? t('Dokaži da si odradio task. Fotka ili ode {hp} HP — ghost ne živi od obećanja.', 'Prove you did the task. A photo or {hp} HP gone — your ghost cannot live on promises.', {hp})
    : t('Ode ti {hp} HP ako se ne sabereš. Završi task, ghost čeka.', 'Get it together or lose {hp} HP. Finish the task — your ghost is waiting.', {hp});
  else if (prefs.tone === 'direct') body = needProof
    ? t('Priloži dokaz i potvrdi zadatak prije roka. Propuštanje: −{hp} HP.', 'Add evidence and confirm the task before it is due. Missing it: −{hp} HP.', {hp})
    : t('Završi zadatak prije roka. Inače gubiš {hp} HP.', 'Finish the task before it is due, or lose {hp} HP.', {hp});
  else body = needProof
    ? t('Još jedan korak: dodaj fotografiju i potvrdi dovršavanje. Ti to možeš.', 'One more step: add a photo and confirm you are done. You can do this.')
    : t('Vrijeme je za mali pomak. Dovrši zadatak ili ga pravodobno odgodi.', 'Time for a small step. Complete the task or reschedule it before it is due.');
  return { title, body, tag: `future-self-${task.id}-${kind}`, data: { taskId: task.id, url: `/?task=${encodeURIComponent(task.id)}` } };
}
export function isQuietHour(prefs, now = new Date()) {
  if (!prefs.quietEnabled || prefs.quietStart === prefs.quietEnd) return false;
  const hour = Number(new Intl.DateTimeFormat('en-GB',{hour:'2-digit',hourCycle:'h23',timeZone:prefs.timezone||'Europe/Zagreb'}).format(now));
  return prefs.quietStart < prefs.quietEnd
    ? hour >= prefs.quietStart && hour < prefs.quietEnd
    : hour >= prefs.quietStart || hour < prefs.quietEnd;
}
