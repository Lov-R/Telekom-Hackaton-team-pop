import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db.js';
import { assistantChat, toChatMessage } from '../ai/chat.js';

const BodyZ = z.object({ message: z.string().trim().min(1, 'Poruka je prazna.').max(2000) });

export const chatRouter = Router();

chatRouter.get('/chat/messages', (req, res) => {
  const rows = db.prepare('SELECT * FROM chat_messages WHERE user_id = ? ORDER BY created_at, rowid').all(req.userId);
  res.json((rows as Parameters<typeof toChatMessage>[0][]).map(toChatMessage));
});

chatRouter.delete('/chat/messages', (req, res) => {
  db.prepare('DELETE FROM chat_messages WHERE user_id = ?').run(req.userId);
  res.status(204).end();
});

chatRouter.post('/chat', async (req, res) => {
  const { message } = BodyZ.parse(req.body);
  res.json(await assistantChat(req.userId, message));
});
