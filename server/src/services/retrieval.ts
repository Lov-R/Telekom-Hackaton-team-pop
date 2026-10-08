import { db } from '../db.js';
import { normalize } from '../util/text.js';
import { parseExtracted, type Extracted } from './documents.js';

interface Row {
  id: string;
  title: string;
  category: string;
  subcategory: string | null;
  document_date: string | null;
  expiry_date: string | null;
  extracted: string;
}

const STOP = new Set([
  'i', 'u', 'a', 'o', 'na', 'je', 'su', 'se', 'sa', 'za', 'od', 'do', 'li', 'da', 'ne', 'koji', 'koja',
  'koje', 'tko', 'sto', 'sta', 'kako', 'kada', 'gdje', 'jos', 'moj', 'moja', 'moje', 'mi', 'ti', 'the',
  'navedeni', 'navedena', 'navedeno', 'ima', 'bio', 'bila', 'bilo', 'iz', 'ili', 'koliko', 'ugovoru',
]);

const SNIPPET_LIMIT = 8_000;
const TOP_N = 3;
const SUMMARY_LIMIT = 50;

function tokens(q: string): string[] {
  return [
    ...new Set(
      normalize(q)
        .split(/[^a-z0-9]+/)
        .filter((t) => t.length >= 3 && !STOP.has(t))
        .map((t) => t.slice(0, 5)),
    ),
  ];
}

const hits = (haystack: string, toks: string[]): number =>
  toks.reduce((n, t) => n + (haystack.includes(t) ? 1 : 0), 0);

function countOccurrences(haystack: string, toks: string[]): number {
  let n = 0;
  for (const t of toks) {
    let i = haystack.indexOf(t);
    while (i !== -1 && n < 1000) {
      n++;
      i = haystack.indexOf(t, i + t.length);
    }
  }
  return n;
}

function score(r: Row, x: Extracted, toks: string[]): number {
  const people = (x.people ?? []).map((p) => `${p.name} ${p.role}`).join(' ');
  const fields = (x.keyFields ?? []).map((f) => `${f.label} ${f.value}`).join(' ');
  return (
    3 * hits(normalize(`${r.title} ${x.docType ?? ''} ${r.subcategory ?? ''}`), toks) +
    3 * hits(normalize(`${people} ${fields}`), toks) +
    2 * hits(normalize(x.summary ?? ''), toks) +
    Math.min(countOccurrences(normalize(x.fullText ?? ''), toks), 10)
  );
}

function readyDocs(userId: string, category?: string): Row[] {
  const sql = `SELECT id, title, category, subcategory, document_date, expiry_date, extracted FROM documents
    WHERE user_id = ? AND status = 'ready' AND is_proof = 0${category ? ' AND category = ?' : ''}
    ORDER BY created_at DESC`;
  return db.prepare(sql).all(...(category ? [userId, category] : [userId])) as Row[];
}

/** SRS §9.3 context: summary of the 50 newest documents (never the files). */
export function documentSummaries(userId: string): string {
  const rows = readyDocs(userId).slice(0, SUMMARY_LIMIT);
  if (rows.length === 0) return 'Korisnik još nema dokumenata.';
  return rows
    .map((r) => {
      const x = parseExtracted(r.extracted);
      const fields = (x.keyFields ?? []).map((f) => `${f.label}: ${f.value}`).join('; ');
      const people = (x.people ?? []).map((p) => `${p.name}${p.role ? ` (${p.role})` : ''}`).join(', ');
      return [
        `- id=${r.id} | ${r.title} | ${r.category}${r.subcategory ? ` / ${r.subcategory}` : ''}`,
        r.document_date ? `datum ${r.document_date}` : '',
        r.expiry_date ? `istječe ${r.expiry_date}` : '',
        fields ? `podaci: ${fields}` : '',
        people ? `osobe: ${people}` : '',
        x.summary ? `sažetak: ${x.summary}` : '',
      ]
        .filter(Boolean)
        .join(' | ');
    })
    .join('\n');
}

/** Distinct people across the user's documents (§9.3 "popis osoba"). */
export function peopleList(userId: string): string {
  const seen = new Map<string, string>();
  for (const r of readyDocs(userId)) {
    for (const p of parseExtracted(r.extracted).people ?? []) {
      const key = normalize(p.name);
      if (!seen.has(key)) seen.set(key, p.role ? `${p.name} (${p.role})` : p.name);
    }
  }
  return [...seen.values()].slice(0, 80).join(', ') || 'nema';
}

/** search_documents tool: best matches with a slice of their full text. */
export function searchDocuments(userId: string, query: string, category?: string) {
  const toks = tokens(query);
  return readyDocs(userId, category)
    .map((r) => {
      const x = parseExtracted(r.extracted);
      return { r, x, s: score(r, x, toks) };
    })
    .filter((d) => d.s > 0 || toks.length === 0)
    .sort((a, b) => b.s - a.s)
    .slice(0, TOP_N)
    .map(({ r, x }) => ({
      id: r.id,
      title: r.title,
      category: r.category,
      text: (x.fullText || x.summary || '').slice(0, SNIPPET_LIMIT),
    }));
}

export function documentTitles(userId: string, ids: string[]): Map<string, string> {
  if (ids.length === 0) return new Map();
  const rows = db
    .prepare(`SELECT id, title FROM documents WHERE user_id = ? AND id IN (${ids.map(() => '?').join(',')})`)
    .all(userId, ...ids) as { id: string; title: string }[];
  return new Map(rows.map((r) => [r.id, r.title]));
}
