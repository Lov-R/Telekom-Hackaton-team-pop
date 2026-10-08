import { db } from '../db.js';
import { purgeExpiredSessions } from './auth.js';
import { applyPresenceRules } from './game.js';

const HOUR = 60 * 60_000;

/**
 * In-process stand-in for the SRS §9.5 hourly pg_cron job: missed deadlines and idle days (§6.4).
 * The same rules also run lazily whenever a user opens the map, so a stopped server catches up.
 * Notification generation (§7.3) is not implemented yet.
 */
export function runHourlyJobs(): void {
  const users = db.prepare('SELECT id FROM profiles').all() as { id: string }[];
  for (const u of users) {
    try {
      applyPresenceRules(u.id);
    } catch (e) {
      console.error('Job greška:', e instanceof Error ? e.message : e);
    }
  }
  purgeExpiredSessions();
}

export function startJobs(): void {
  runHourlyJobs();
  setInterval(runHourlyJobs, HOUR).unref();
}
