import { randomBytes } from 'node:crypto';
import { Router } from 'express';
import { z } from 'zod';
import { db, newId, nowIso, tx } from '../db.js';
import {
  DUMMY_HASH,
  clearSessionCookie,
  createSession,
  deleteSession,
  hashPassword,
  rateLimitAuth,
  readSessionToken,
  requireAuth,
  setSessionCookie,
  verifyPassword,
} from '../services/auth.js';
import { gameState } from '../services/game.js';
import { importLegacyIfFirstUser } from '../services/legacy.js';
import { addDays, todayZagreb } from '../util/dates.js';
import { HttpError } from '../util/http.js';

const email = z.string().trim().toLowerCase().email('Neispravna email adresa.').max(254);
const RegisterZ = z.object({
  email,
  password: z.string().min(8, 'Lozinka mora imati barem 8 znakova.').max(200),
  displayName: z.string().trim().min(1, 'Upiši ime.').max(40),
  language: z.enum(['hr', 'en']).optional(),
});
const LoginZ = z.object({ email, password: z.string().min(1).max(200) });

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
function friendCode(): string {
  for (;;) {
    const code = [...randomBytes(6)].map((b) => CODE_ALPHABET[b % CODE_ALPHABET.length]).join('');
    if (!db.prepare('SELECT 1 FROM profiles WHERE friend_code = ?').get(code)) return code;
  }
}

export const authRouter = Router();

authRouter.post('/auth/register', rateLimitAuth, async (req, res) => {
  const b = RegisterZ.parse(req.body);
  if (db.prepare('SELECT 1 FROM users WHERE email = ?').get(b.email)) {
    throw new HttpError(409, 'email_taken', 'Račun s tom email adresom već postoji.');
  }
  const passwordHash = await hashPassword(b.password);
  const userId = newId();
  const now = nowIso();
  tx(() => {
    db.prepare('INSERT INTO users (id, email, password_hash, created_at) VALUES (?,?,?,?)').run(
      userId,
      b.email,
      passwordHash,
      now,
    );
    db.prepare(
      `INSERT INTO profiles (id, display_name, language, friend_code, presence_checked_date, created_at)
       VALUES (?,?,?,?,?,?)`,
    ).run(userId, b.displayName, b.language ?? 'hr', friendCode(), addDays(todayZagreb(), -1), now);
  });
  importLegacyIfFirstUser(userId);
  const { token, expires } = createSession(userId);
  setSessionCookie(req, res, token, expires);
  res.status(201).json({ email: b.email, game: gameState(userId) });
});

authRouter.post('/auth/login', rateLimitAuth, async (req, res) => {
  const b = LoginZ.parse(req.body);
  const user = db.prepare('SELECT id, password_hash FROM users WHERE email = ?').get(b.email) as
    | { id: string; password_hash: string }
    | undefined;
  const ok = await verifyPassword(b.password, user?.password_hash ?? DUMMY_HASH);
  if (!user || !ok) throw new HttpError(401, 'bad_credentials', 'Pogrešan email ili lozinka.');
  const { token, expires } = createSession(user.id);
  setSessionCookie(req, res, token, expires);
  res.json({ email: b.email, game: gameState(user.id) });
});

authRouter.post('/auth/logout', (req, res) => {
  const token = readSessionToken(req);
  if (token) deleteSession(token);
  clearSessionCookie(res);
  res.status(204).end();
});

authRouter.get('/auth/me', requireAuth, (req, res) => {
  const user = db.prepare('SELECT email FROM users WHERE id = ?').get(req.userId) as { email: string };
  res.json({ email: user.email, game: gameState(req.userId) });
});
