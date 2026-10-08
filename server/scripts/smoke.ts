/**
 * End-to-end smoke test against a running server, with real Gemini calls.
 * Uses its own account (SMOKE_EMAIL / SMOKE_PASSWORD, created if missing). Register your own account first:
 * the first account ever registered receives the imported legacy data.
 */
import { PDFDocument, StandardFonts } from 'pdf-lib';
import { addDays, todayZagreb } from '../src/util/dates.js';

const BASE = process.env.SMOKE_BASE ?? 'http://localhost:3001/api';
const EMAIL = process.env.SMOKE_EMAIL ?? 'smoke@relai.local';
const PASSWORD = process.env.SMOKE_PASSWORD ?? 'smoke-test-lozinka';
let failures = 0;
let cookie = '';

function check(name: string, ok: boolean, extra = ''): void {
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${extra ? ` - ${extra}` : ''}`);
  if (!ok) failures++;
}

async function api<T>(path: string, init: RequestInit = {}): Promise<{ status: number; body: T }> {
  const res = await fetch(`${BASE}${path}`, { ...init, headers: { ...init.headers, ...(cookie ? { cookie } : {}) } });
  const set = res.headers.get('set-cookie');
  if (set) cookie = set.split(';')[0];
  const text = await res.text();
  return { status: res.status, body: (text ? JSON.parse(text) : null) as T };
}

const json = (body: unknown): RequestInit => ({
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});

async function buildPdf(deadline: string): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const page = pdf.addPage([595, 842]);
  const [y, m, d] = deadline.split('-');
  const lines = [
    'UGOVOR O NASTUPU NA FESTIVALU',
    '',
    'Ugovor o nastupu na glazbenom festivalu Sunce i More 2026.',
    `Datum: ${todayZagreb().split('-').reverse().join('.')}.`,
    'Izvodjaci: Ivan Horvat, Ana Kovac',
    `Rok za predaju dokumentacije: ${d}.${m}.${y}.`,
    'Organizator: Festival d.o.o., Split.',
    'Honorar: 1.500 EUR po izvodjacu.',
  ];
  lines.forEach((l, i) => page.drawText(l, { x: 50, y: 780 - i * 24, size: 13, font }));
  return pdf.save();
}

interface Task {
  id: string;
  kind: string;
  date: string | null;
  time: string | null;
  dueDate: string | null;
  sourceText: string | null;
}
interface Doc {
  id: string;
  status: string;
  category: string;
  summary: string;
  error: string | null;
  tasks: Task[];
}

function nextWeekday(target: number): string {
  const today = todayZagreb();
  const dow = new Date(`${today}T00:00:00Z`).getUTCDay();
  const delta = (target - dow + 7) % 7 || 7;
  return addDays(today, delta);
}

async function main(): Promise<void> {
  const health = await api<{ ok: boolean; model: string; db: string }>('/health');
  check('(a) health', health.status === 200 && health.body.ok, `model=${health.body.model}, db=${health.body.db}`);

  let auth = await api<unknown>('/auth/login', json({ email: EMAIL, password: PASSWORD }));
  if (auth.status === 401) auth = await api<unknown>('/auth/register', json({ email: EMAIL, password: PASSWORD, displayName: 'Smoke' }));
  check('(b) logged in', auth.status === 200 || auth.status === 201, `status ${auth.status}`);

  const deadline = addDays(todayZagreb(), 20);
  const bytes = await buildPdf(deadline);
  const form = new FormData();
  form.append('file', new Blob([Buffer.from(bytes)], { type: 'application/pdf' }), 'ugovor-festival.pdf');
  const up = await api<{ id: string; status: string }>('/documents', { method: 'POST', body: form });
  check('(c) upload returns 202 processing', up.status === 202 && up.body.status === 'processing');
  const id = up.body.id;

  const again = new FormData();
  again.append('file', new Blob([Buffer.from(bytes)], { type: 'application/pdf' }), 'ugovor-festival.pdf');
  const dup = await api<unknown>('/documents', { method: 'POST', body: again });
  check('(c) same file twice is rejected', dup.status === 409);

  let doc: Doc | undefined;
  const t0 = Date.now();
  while (Date.now() - t0 < 90_000) {
    doc = (await api<Doc>(`/documents/${id}`)).body;
    if (doc.status !== 'processing') break;
    await new Promise((r) => setTimeout(r, 2000));
  }
  check('(d) processing finished', doc?.status === 'ready', `status=${doc?.status} in ${Math.round((Date.now() - t0) / 1000)}s ${doc?.error ?? ''}`);
  if (!doc || doc.status !== 'ready') throw new Error('Dokument nije obrađen.');

  check('(d) category is ugovori', doc.category === 'ugovori', `category=${doc.category}`);
  check('(d) summary set', doc.summary.length > 10, doc.summary.slice(0, 80));
  const auto = doc.tasks[0];
  check('(d) follow-up task due on the deadline (computed in code)', auto?.dueDate === deadline, `due=${auto?.dueDate}`);
  check('(d) follow-up task quotes the document', !!auto?.sourceText, auto?.sourceText ?? '');

  const ask = await api<{ assistantMessage: { content: string; citations: { documentId: string }[] } }>(
    '/chat',
    json({ message: 'Tko je još naveden u ugovoru za festival?' }),
  );
  check('(e) chat answer mentions Ana', ask.status === 200 && /Ana/.test(ask.body.assistantMessage.content), ask.body.assistantMessage?.content.slice(0, 100));

  const add = await api<{ createdTasks: Task[] }>('/chat', json({ message: 'Stavi mi sastanak s Markom u četvrtak u 10.' }));
  const meeting = add.body.createdTasks?.[0];
  check('(e) "sastanak u četvrtak u 10" → next Thursday 10:00', meeting?.kind === 'event' && meeting?.date === nextWeekday(4) && meeting?.time === '10:00', JSON.stringify(meeting));
  if (meeting) await api(`/tasks/${meeting.id}`, { method: 'DELETE' });

  const done = await api<{ accepted: boolean; result: { amount: number } }>(`/tasks/${auto.id}/complete`, { method: 'POST' });
  check('(f) complete without proof gives HP', done.status === 200 && done.body.result.amount > 0, `+${done.body.result?.amount}`);

  const del = await api<null>(`/documents/${id}`, { method: 'DELETE' });
  check('(g) delete returns 204', del.status === 204);
  const tasks = (await api<{ documentId: string | null }[]>('/tasks')).body;
  check('(g) tasks of document are gone', !tasks.some((t) => t.documentId === id));
}

main()
  .catch((e: unknown) => {
    console.log(`FAIL smoke aborted: ${e instanceof Error ? e.message : String(e)}`);
    failures++;
  })
  .finally(() => {
    console.log(failures === 0 ? 'SMOKE OK' : `SMOKE FAILED (${failures})`);
    process.exit(failures === 0 ? 0 : 1);
  });
