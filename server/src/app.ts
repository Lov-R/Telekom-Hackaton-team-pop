import cors from 'cors';
import express, { type ErrorRequestHandler } from 'express';
import multer from 'multer';
import { ZodError } from 'zod';
import { GeminiError, MODEL } from './ai/gemini.js';
import { DB_DRIVER, db } from './db.js';
import { MAX_UPLOAD_MB } from './env.js';
import { authRouter } from './routes/auth.js';
import { calendarRouter } from './routes/calendar.js';
import { chatRouter } from './routes/chat.js';
import { dashboardRouter } from './routes/dashboard.js';
import { documentsRouter } from './routes/documents.js';
import { goalsRouter } from './routes/goals.js';
import { profileRouter } from './routes/profile.js';
import { recommendationsRouter } from './routes/recommendations.js';
import { socialRouter } from './routes/social.js';
import { tasksRouter } from './routes/tasks.js';
import { requireAuth } from './services/auth.js';
import { HttpError } from './util/http.js';

/** The API without a listener: index.ts serves it locally, netlify/functions/api.mts on Netlify. */
export const app = express();
app.disable('x-powered-by');
// Behind the Vite dev proxy or an HTTPS reverse proxy, trust it for req.ip and req.secure.
app.set('trust proxy', 'loopback');
// The Vite proxy makes requests same-origin; Capacitor origins are listed explicitly.
app.use(
  cors({ origin: ['capacitor://localhost', 'http://localhost', 'http://localhost:5173'], credentials: true }),
);
app.use(express.json({ limit: '1mb' }));

const api = express.Router();
api.get('/health', (_req, res) => {
  const tables = db
    .prepare("SELECT COUNT(*) AS n FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")
    .get() as { n: number };
  res.json({ ok: true, model: MODEL, db: `${DB_DRIVER} (${tables.n} tablica)` });
});
api.use(authRouter);
api.use(requireAuth);
for (const r of [
  documentsRouter,
  tasksRouter,
  calendarRouter,
  goalsRouter,
  recommendationsRouter,
  chatRouter,
  profileRouter,
  dashboardRouter,
  socialRouter,
]) {
  api.use(r);
}
api.use((_req, res) => {
  res.status(404).json({ error: { code: 'not_found', message: 'Ruta ne postoji.' } });
});
app.use('/api', api);

const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  const send = (status: number, code: string, message: string): void => {
    res.status(status).json({ error: { code, message } });
  };
  if (err instanceof HttpError) return send(err.status, err.code, err.message);
  if (err instanceof ZodError) {
    return send(400, 'validation', err.issues[0]?.message ?? 'Neispravan zahtjev.');
  }
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') return send(413, 'too_large', `Datoteka je prevelika (najviše ${MAX_UPLOAD_MB} MB).`);
    return send(400, 'upload', 'Prijenos datoteke nije uspio.');
  }
  if (err instanceof GeminiError) return send(502, 'ai_error', err.message);
  if (err instanceof SyntaxError && 'body' in err) return send(400, 'bad_json', 'Neispravan JSON.');
  console.error('Neočekivana greška:', err instanceof Error ? err.message : err);
  return send(500, 'internal', 'Došlo je do neočekivane greške.');
};
app.use(errorHandler);
