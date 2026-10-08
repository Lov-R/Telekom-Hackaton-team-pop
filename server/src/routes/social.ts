import { Router } from 'express';
import { z } from 'zod';
import { profileRow } from '../services/game.js';
import { taskById } from '../services/serialize.js';
import {
  addFriendByCode,
  conversation,
  listFriends,
  listNotifications,
  markNotificationsRead,
  removeFriend,
  sendMessage,
  shareTask,
} from '../services/social.js';

const AddZ = z.object({ code: z.string().trim().min(4, 'Upiši kod prijatelja.').max(20) });
const MessageZ = z.object({ content: z.string().trim().min(1, 'Poruka je prazna.').max(2000) });
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

socialRouter.get('/friends/:id/messages', (req, res) => {
  res.json(conversation(req.userId, req.params.id));
});

socialRouter.post('/friends/:id/messages', (req, res) => {
  const b = MessageZ.parse(req.body);
  res.status(201).json(sendMessage(req.userId, req.params.id, b.content));
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
