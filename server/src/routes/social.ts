import { Router } from 'express';
import { z } from 'zod';
import { profileRow } from '../services/game.js';
import { taskById } from '../services/serialize.js';
import {
  addFriendByCode,
  listFriends,
  listNotifications,
  markNotificationsRead,
  removeFriend,
  shareTask,
} from '../services/social.js';

const AddZ = z.object({ code: z.string().trim().min(4, 'Upiši kod prijatelja.').max(20) });
const ShareZ = z.object({ friendIds: z.array(z.string().min(1)).min(1, 'Odaberi barem jednog prijatelja.').max(20) });

export const socialRouter = Router();

socialRouter.get('/friends', (req, res) => {
  res.json({ code: profileRow(req.userId).friend_code, friends: listFriends(req.userId) });
});

socialRouter.post('/friends', (req, res) => {
  const b = AddZ.parse(req.body);
  const out = addFriendByCode(req.userId, b.code);
  res.status(out.added ? 201 : 200).json(out);
});

socialRouter.delete('/friends/:id', (req, res) => {
  removeFriend(req.userId, req.params.id);
  res.status(204).end();
});

socialRouter.post('/tasks/:id/share', (req, res) => {
  const b = ShareZ.parse(req.body);
  shareTask(req.userId, req.params.id, b.friendIds);
  res.json(taskById(req.userId, req.params.id));
});

socialRouter.get('/notifications', (req, res) => {
  res.json(listNotifications(req.userId));
});

socialRouter.post('/notifications/read', (req, res) => {
  markNotificationsRead(req.userId);
  res.status(204).end();
});
