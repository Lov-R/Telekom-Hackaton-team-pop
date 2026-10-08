import { FunctionCallingConfigMode, type Content, type FunctionDeclaration } from '@google/genai';
import { db, newId, nowIso } from '../db.js';
import { avatarOf, profileRow } from '../services/game.js';
import { documentSummaries, documentTitles, peopleList, searchDocuments } from '../services/retrieval.js';
import { TASK_ORDER, TASK_SELECT, taskById, taskOut, type TaskOut, type TaskRow } from '../services/serialize.js';
import { insertTask } from '../services/tasks.js';
import { addDays, todayZagreb } from '../util/dates.js';
import { HttpError } from '../util/http.js';
import { CATEGORY_KEYS } from './schemas.js';
import { generate } from './gemini.js';
import { assistantSystem } from './prompts.js';

export interface Citation {
  documentId: string;
  title: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  citations: Citation[];
  createdAt: string;
}

interface MsgRow {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  citations_json: string;
  created_at: string;
}

export const toChatMessage = (r: MsgRow): ChatMessage => ({
  id: r.id,
  role: r.role,
  content: r.content,
  citations: JSON.parse(r.citations_json) as Citation[],
  createdAt: r.created_at,
});

function save(userId: string, role: 'user' | 'assistant', content: string, citations: Citation[]): ChatMessage {
  const row: MsgRow = { id: newId(), role, content, citations_json: JSON.stringify(citations), created_at: nowIso() };
  db.prepare(
    'INSERT INTO chat_messages (id, user_id, role, content, citations_json, created_at) VALUES (?,?,?,?,?,?)',
  ).run(row.id, userId, row.role, row.content, row.citations_json, row.created_at);
  return toChatMessage(row);
}

const s = { type: 'string' };
const TOOLS: FunctionDeclaration[] = [
  {
    name: 'create_task',
    description: 'Spremi novi zadatak ili događaj u korisnikov kalendar.',
    parametersJsonSchema: {
      type: 'object',
      properties: {
        title: s,
        kind: { type: 'string', enum: ['event', 'deadline'] },
        tier: { type: 'integer', minimum: 1, maximum: 5 },
        date: { type: 'string', description: 'YYYY-MM-DD, dan događaja (za kind=event)' },
        time: { type: 'string', description: 'HH:MM ili prazno' },
        due_date: { type: 'string', description: 'YYYY-MM-DD, rok (za kind=deadline)' },
        recurrence: { type: 'string', enum: ['none', 'monthly', 'yearly'] },
      },
      required: ['title', 'kind', 'tier'],
    },
  },
  {
    name: 'propose_complete_task',
    description: 'Ponudi korisniku da označi postojeći zadatak riješenim (aplikacija traži dokaz).',
    parametersJsonSchema: { type: 'object', properties: { task_id: s }, required: ['task_id'] },
  },
  {
    name: 'search_documents',
    description: 'Pretraži puni tekst korisnikovih dokumenata.',
    parametersJsonSchema: {
      type: 'object',
      properties: { query: s, category: { type: 'string', enum: ['', ...CATEGORY_KEYS] } },
      required: ['query'],
    },
  },
  {
    name: 'reply',
    description: 'Završni odgovor korisniku. Uvijek pozovi na kraju.',
    parametersJsonSchema: {
      type: 'object',
      properties: { text: s, cited_document_ids: { type: 'array', items: s } },
      required: ['text', 'cited_document_ids'],
    },
  },
];

const MAX_ROUNDS = 5;
const HISTORY = 10;

function openTasksContext(userId: string): string {
  const today = todayZagreb();
  const rows = db
    .prepare(
      `${TASK_SELECT} WHERE t.user_id = ? AND t.status IN ('open','missed')
       AND (COALESCE(t.due_date, substr(t.start_at, 1, 10)) IS NULL OR COALESCE(t.due_date, substr(t.start_at, 1, 10)) <= ?)
       ORDER BY ${TASK_ORDER} LIMIT 60`,
    )
    .all(userId, addDays(today, 60)) as TaskRow[];
  if (rows.length === 0) return 'nema';
  return rows
    .map(taskOut)
    .map(
      (t) =>
        `- id=${t.id} | ${t.title} | ${t.kind} | razina ${t.tier} | ${t.date ?? 'bez datuma'}${t.time ? ` ${t.time}` : ''}${
          t.status === 'missed' ? ' | propušten rok' : ''
        }`,
    )
    .join('\n');
}

type Args = Record<string, unknown>;
const str = (v: unknown): string => (typeof v === 'string' ? v : '');

export interface ChatResult {
  userMessage: ChatMessage;
  assistantMessage: ChatMessage;
  createdTasks: TaskOut[];
  proposedTasks: TaskOut[];
}

/** SRS §9.3 assistant-chat. */
export async function assistantChat(userId: string, message: string): Promise<ChatResult> {
  const profile = profileRow(userId);
  const ghost = avatarOf(profile);
  const context = `KONTEKST
Osobe iz dokumenata: ${peopleList(userId)}

Dokumenti (sažetak):
${documentSummaries(userId)}

Otvoreni zadaci (sljedećih 60 dana i propušteni):
${openTasksContext(userId)}`;

  const history = (
    db
      .prepare('SELECT * FROM chat_messages WHERE user_id = ? ORDER BY created_at DESC, rowid DESC LIMIT ?')
      .all(userId, HISTORY) as MsgRow[]
  ).reverse();
  while (history.length && history[0].role === 'assistant') history.shift();

  const contents: Content[] = [
    { role: 'user', parts: [{ text: context }] },
    { role: 'model', parts: [{ text: 'Razumijem kontekst.' }] },
    ...history.map((m) => ({ role: m.role === 'user' ? 'user' : 'model', parts: [{ text: m.content }] })),
    { role: 'user', parts: [{ text: message }] },
  ];

  const created: string[] = [];
  const proposed: string[] = [];
  let answer = '';
  let cited: string[] = [];

  for (let round = 0; round < MAX_ROUNDS && !answer; round++) {
    const res = await generate(contents, {
      systemInstruction: assistantSystem(profile.tone, profile.language, ghost.name),
      temperature: 0.4,
      maxOutputTokens: 4096,
      tools: [{ functionDeclarations: TOOLS }],
      toolConfig: { functionCallingConfig: { mode: FunctionCallingConfigMode.ANY } },
    });
    const calls = res.functionCalls ?? [];
    if (calls.length === 0) {
      answer = res.text?.trim() ?? '';
      break;
    }
    contents.push({ role: 'model', parts: res.candidates?.[0]?.content?.parts ?? [] });
    const responses: Content['parts'] = [];
    for (const call of calls) {
      const args = (call.args ?? {}) as Args;
      let response: Record<string, unknown>;
      try {
        if (call.name === 'reply') {
          answer = str(args.text).trim();
          cited = Array.isArray(args.cited_document_ids) ? args.cited_document_ids.map(str).filter(Boolean) : [];
          response = { ok: true };
        } else if (call.name === 'create_task') {
          const kind = args.kind === 'event' ? 'event' : 'deadline';
          const id = insertTask(userId, {
            kind,
            title: str(args.title),
            tier: Number(args.tier) || 2,
            source: 'chat',
            date: str(args.date) || null,
            time: str(args.time) || null,
            dueDate: str(args.due_date) || null,
            recurrence: ['monthly', 'yearly'].includes(str(args.recurrence))
              ? (str(args.recurrence) as 'monthly' | 'yearly')
              : 'none',
          });
          created.push(id);
          const t = taskById(userId, id);
          response = { ok: true, task_id: id, title: t.title, date: t.date, time: t.time };
        } else if (call.name === 'propose_complete_task') {
          const t = taskById(userId, str(args.task_id));
          if (t.status === 'done') {
            response = { ok: false, error: 'Zadatak je već riješen.' };
          } else {
            if (!proposed.includes(t.id)) proposed.push(t.id);
            response = { ok: true, title: t.title };
          }
        } else if (call.name === 'search_documents') {
          const category = CATEGORY_KEYS.includes(str(args.category)) ? str(args.category) : undefined;
          response = { results: searchDocuments(userId, str(args.query), category) };
        } else {
          response = { ok: false, error: 'Nepoznat alat.' };
        }
      } catch (e) {
        response = { ok: false, error: e instanceof HttpError ? e.message : 'Alat nije uspio.' };
      }
      responses.push({ functionResponse: { id: call.id, name: call.name, response } });
    }
    contents.push({ role: 'user', parts: responses });
  }

  if (!answer) {
    answer = created.length > 0 ? 'Zapisano.' : 'Nisam uspio složiti odgovor. Pokušaj ponovno.';
  }
  const titles = documentTitles(userId, [...new Set(cited)]);
  const citations = [...titles].map(([documentId, title]) => ({ documentId, title }));

  const userMessage = save(userId, 'user', message, []);
  const assistantMessage = save(userId, 'assistant', answer, citations);
  return {
    userMessage,
    assistantMessage,
    createdTasks: created.map((id) => taskById(userId, id)),
    proposedTasks: proposed.map((id) => taskById(userId, id)),
  };
}
