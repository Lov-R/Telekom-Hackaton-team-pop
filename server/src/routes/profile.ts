import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db.js';
import {
  GHOST_COLORS,
  TIERS,
  applyPresenceRules,
  avatarOf,
  gameState,
  ledger,
  profileRow,
} from '../services/game.js';
import { HttpError } from '../util/http.js';

/** Settings only. HP, presence, map and streak are not writable by the client (SRS §8.3). */
const PatchZ = z.object({
  displayName: z.string().trim().min(1, 'Ime je obavezno.').max(40).optional(),
  tone: z.enum(['blago', 'sarkasticno', 'brutalno']).optional(),
  language: z.enum(['hr', 'en']).optional(),
  onboarded: z.literal(true).optional(),
  avatar: z
    .object({
      name: z.string().trim().min(1, 'Ime duha je obavezno.').max(30).optional(),
      color: z.enum(GHOST_COLORS).optional(),
      accessory: z.string().max(20).optional(),
    })
    .optional(),
});

export const profileRouter = Router();

profileRouter.get('/game', (req, res) => {
  applyPresenceRules(req.userId);
  res.json({ ...gameState(req.userId), tiers: TIERS });
});

profileRouter.get('/profile', (req, res) => {
  applyPresenceRules(req.userId);
  const doneLast7 = (
    db
      .prepare(
        "SELECT COUNT(*) AS n FROM tasks WHERE user_id = ? AND status = 'done' AND completed_at >= datetime('now', '-7 days')",
      )
      .get(req.userId) as { n: number }
  ).n;
  const counts = db
    .prepare(
      `SELECT
         (SELECT COUNT(*) FROM tasks WHERE user_id = ? AND status IN ('open','missed')) AS open,
         (SELECT COUNT(*) FROM tasks WHERE user_id = ? AND status = 'missed') AS missed,
         (SELECT COUNT(*) FROM documents WHERE user_id = ? AND status = 'ready' AND is_proof = 0) AS documents`,
    )
    .get(req.userId, req.userId, req.userId) as { open: number; missed: number; documents: number };
  res.json({
    game: gameState(req.userId),
    stats: { ...counts, doneLast7 },
    ledger: ledger(req.userId),
  });
});

profileRouter.patch('/profile', (req, res) => {
  const b = PatchZ.parse(req.body);
  const cur = profileRow(req.userId);
  const game = gameState(req.userId);
  const avatar = { ...avatarOf(cur), ...b.avatar };
  if (b.avatar?.accessory !== undefined && !game.unlockedAccessories.includes(b.avatar.accessory)) {
    throw new HttpError(400, 'locked', 'Ovaj dodatak još nije otključan.');
  }
  db.prepare(
    'UPDATE profiles SET display_name = ?, tone = ?, language = ?, avatar_config = ?, onboarded = ? WHERE id = ?',
  ).run(
    b.displayName ?? cur.display_name,
    b.tone ?? cur.tone,
    b.language ?? cur.language,
    JSON.stringify(avatar),
    b.onboarded ? 1 : cur.onboarded,
    req.userId,
  );
  res.json(gameState(req.userId));
});
