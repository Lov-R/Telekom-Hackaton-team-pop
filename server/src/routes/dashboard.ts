import { Router } from 'express';
import { db } from '../db.js';
import { listItem, type DocRow } from '../services/documents.js';
import { applyPresenceRules, gameState } from '../services/game.js';
import { listRecommendations } from '../services/recommendations.js';
import { TASK_ORDER, TASK_SELECT, taskOut, type TaskRow } from '../services/serialize.js';
import { addDays, todayZagreb } from '../util/dates.js';

export const dashboardRouter = Router();

/** Home (the Map): game state plus what is due soon. */
dashboardRouter.get('/dashboard', (req, res) => {
  const userId = req.userId;
  applyPresenceRules(userId);
  const today = todayZagreb();
  const due = db
    .prepare(
      `${TASK_SELECT} WHERE t.user_id = ? AND t.status IN ('open','missed')
       AND COALESCE(t.due_date, substr(t.start_at, 1, 10)) <= ? ORDER BY ${TASK_ORDER} LIMIT 8`,
    )
    .all(userId, addDays(today, 7)) as TaskRow[];
  const recent = db
    .prepare('SELECT * FROM documents WHERE user_id = ? AND is_proof = 0 ORDER BY created_at DESC LIMIT 4')
    .all(userId) as DocRow[];
  res.json({
    game: gameState(userId),
    dueTasks: due.map(taskOut),
    recentDocuments: recent.map(listItem),
    recommendations: listRecommendations(userId).slice(0, 3),
  });
});
