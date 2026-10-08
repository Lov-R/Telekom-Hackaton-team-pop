import { Router } from 'express';
import { z } from 'zod';
import {
  acceptRecommendation,
  dismissRecommendation,
  listRecommendations,
} from '../services/recommendations.js';
import { isValidDate } from '../util/dates.js';

const AcceptZ = z.object({
  date: z.string().refine(isValidDate, 'Neispravan datum.').optional(),
});

export const recommendationsRouter = Router();

recommendationsRouter.get('/recommendations', (req, res) => {
  res.json(listRecommendations(req.userId));
});

recommendationsRouter.post('/recommendations/:id/accept', (req, res) => {
  const b = AcceptZ.parse(req.body ?? {});
  res.json(acceptRecommendation(req.userId, req.params.id, b.date));
});

recommendationsRouter.post('/recommendations/:id/dismiss', (req, res) => {
  dismissRecommendation(req.userId, req.params.id);
  res.status(204).end();
});
