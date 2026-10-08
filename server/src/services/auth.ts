import { createHash, randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import type { NextFunction, Request, Response } from 'express';
import { db, nowIso } from '../db.js';
import { HttpError } from '../util/http.js';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      /** Set by requireAuth; every data query filters on it (SRS §8.3). */
      userId: string;
    }
  }
}

const scryptAsync = promisify(scrypt) as (pw: string, salt: Buffer, keylen: number) => Promise<Buffer>;
const KEYLEN = 64;

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await scryptAsync(password, salt, KEYLEN);
  return `scrypt$${salt.toString('hex')}$${key.toString('hex')}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [scheme, saltHex, keyHex] = stored.split('$');
  if (scheme !== 'scrypt' || !saltHex || !keyHex) return false;
  const expected = Buffer.from(keyHex, 'hex');
  const actual = await scryptAsync(password, Buffer.from(saltHex, 'hex'), expected.length);
  return timingSafeEqual(actual, expected);
}

/** Verifying against this when the email is unknown keeps response times uniform. */
export const DUMMY_HASH = await hashPassword(randomBytes(16).toString('hex'));

export const SESSION_COOKIE = 'relai_session';
const SESSION_DAYS = 30;
const sha256 = (s: string): string => createHash('sha256').update(s).digest('hex');

export function createSession(userId: string): { token: string; expires: Date } {
  const token = randomBytes(32).toString('base64url');
  const expires = new Date(Date.now() + SESSION_DAYS * 86_400_000);
  db.prepare('INSERT INTO sessions (token_hash, user_id, expires_at, created_at) VALUES (?,?,?,?)').run(
    sha256(token),
    userId,
    expires.toISOString(),
    nowIso(),
  );
  return { token, expires };
}

export function deleteSession(token: string): void {
  db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(sha256(token));
}

function sessionUser(token: string): string | null {
  const row = db
    .prepare('SELECT user_id FROM sessions WHERE token_hash = ? AND expires_at > ?')
    .get(sha256(token), nowIso()) as { user_id: string } | undefined;
  return row?.user_id ?? null;
}

export function purgeExpiredSessions(): void {
  db.prepare('DELETE FROM sessions WHERE expires_at <= ?').run(nowIso());
}

export function readSessionToken(req: Request): string | null {
  const header = req.headers.cookie;
  if (!header) return null;
  for (const part of header.split(';')) {
    const eq = part.indexOf('=');
    if (eq === -1) continue;
    if (part.slice(0, eq).trim() === SESSION_COOKIE) return decodeURIComponent(part.slice(eq + 1).trim());
  }
  return null;
}

export function setSessionCookie(req: Request, res: Response, token: string, expires: Date): void {
  res.cookie(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    // LAN dev runs on plain http; behind HTTPS (Vercel/proxy) the cookie is Secure.
    secure: req.secure,
    path: '/',
    expires,
  });
}

export function clearSessionCookie(res: Response): void {
  res.clearCookie(SESSION_COOKIE, { path: '/' });
}

export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  const token = readSessionToken(req);
  const userId = token ? sessionUser(token) : null;
  if (!userId) {
    next(new HttpError(401, 'unauthorized', 'Prijavi se za nastavak.'));
    return;
  }
  req.userId = userId;
  next();
}

const attempts = new Map<string, { count: number; resetAt: number }>();
const WINDOW_MS = 15 * 60_000;
const MAX_ATTEMPTS = 20;

/** In-memory limit on login/register attempts per client IP. */
export function rateLimitAuth(req: Request, _res: Response, next: NextFunction): void {
  const key = req.ip ?? 'unknown';
  const now = Date.now();
  const cur = attempts.get(key);
  if (!cur || cur.resetAt < now) {
    attempts.set(key, { count: 1, resetAt: now + WINDOW_MS });
    next();
    return;
  }
  cur.count++;
  if (cur.count > MAX_ATTEMPTS) {
    next(new HttpError(429, 'rate_limited', 'Previše pokušaja. Pokušaj ponovno za nekoliko minuta.'));
    return;
  }
  next();
}
