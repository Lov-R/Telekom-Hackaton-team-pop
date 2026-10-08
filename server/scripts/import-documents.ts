/**
 * Imports the PDFs in server/seed-documents (folder = category/subcategory) into the account IMPORT_EMAIL.
 * Folder names use the old taxonomy and are mapped to the SRS categories (services/legacy.ts).
 *
 * Each file is first categorised blindly by the AI (the folder is NOT passed as a hint), then the folder
 * path is stored as the ground truth (category_source = 'import'). An evaluation of AI vs folder is
 * printed and saved to server/data/import-eval.json. Safe to re-run: already imported files are skipped
 * and files that previously failed are retried. Document contents are never logged.
 */
import fs from 'node:fs';
import path from 'node:path';
import { db, newId, nowIso } from '../src/db.js';
import { cleanSubcategory } from '../src/ai/schemas.js';
import type { SubcategoryHints } from '../src/ai/prompts.js';
import { DATA_DIR, SERVER_ROOT } from '../src/env.js';
import { absoluteStoragePath, sha256File } from '../src/services/documents.js';
import { mapLegacyCategory } from '../src/services/legacy.js';
import { processDocument } from '../src/services/processDocument.js';
import { normalize } from '../src/util/text.js';

const SEED_DIR = path.join(SERVER_ROOT, 'seed-documents');
const EVAL_PATH = path.join(DATA_DIR, 'import-eval.json');
const CONCURRENCY = 3;
const RETRIES = 5;

interface Entry {
  sourcePath: string;
  folderCategory: string;
  folderSubcategory: string | null;
  aiCategory: string | null;
  aiSubcategory: string | null;
  status: 'ready' | 'error';
  error: string | null;
  categoryMatch: boolean;
  subcategoryMatch: boolean;
}

interface Found {
  abs: string;
  sourcePath: string;
  category: string;
  subcategory: string | null;
}

const normDash = (s: string): string => normalize(s.replace(/[–—]/g, '-')).replace(/\s+/g, ' ').trim();
const normSub = (s: string | null): string =>
  normalize(s ?? '').replace(/[–—]/g, '-').replace(/\s*\/\s*/g, '/').replace(/\s+/g, ' ').trim();

const LEGACY_FOLDERS: [string, string][] = [
  ['Garancije i računi', 'garancije_racuni'],
  ['Nekretnina', 'nekretnina'],
  ['Osobni dokumenti', 'osobni_dokumenti'],
  ['Posao – autorski i honorarni ugovori', 'posao'],
  ['Režije', 'rezije'],
  ['Za rješavanje', 'za_rjesavanje'],
  ['Zdravstvo', 'zdravstvo'],
  ['Ostalo', 'ostalo'],
];
const CATEGORY_BY_FOLDER = new Map(LEGACY_FOLDERS.map(([label, key]) => [normDash(label), key]));

const email = process.env.IMPORT_EMAIL;
const user = email
  ? (db.prepare('SELECT id FROM users WHERE email = ?').get(email) as { id: string } | undefined)
  : undefined;
if (!user) {
  console.error('Postavi IMPORT_EMAIL na email postojećeg računa (registriraj se u aplikaciji).');
  process.exit(1);
}
const USER_ID = user.id;

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...walk(full));
    else if (e.isFile() && e.name.toLowerCase().endsWith('.pdf')) out.push(full);
  }
  return out.sort();
}

function discover(): { found: Found[]; unmapped: string[] } {
  const found: Found[] = [];
  const unmapped: string[] = [];
  for (const abs of walk(SEED_DIR)) {
    const rel = path.relative(SEED_DIR, abs).split(path.sep);
    const category = CATEGORY_BY_FOLDER.get(normDash(rel[0]));
    if (!category || rel.length < 2) {
      unmapped.push(rel.join('/'));
      continue;
    }
    const mapped = mapLegacyCategory(category, cleanSubcategory(rel.slice(1, -1).join(' / ')));
    found.push({ abs, sourcePath: rel.join('/'), category: mapped.category, subcategory: mapped.subcategory });
  }
  return { found, unmapped };
}

interface ExistingRow {
  id: string;
  status: string;
  storage_path: string;
}

function prepareRow(f: Found): { id: string } | null {
  const row = db
    .prepare('SELECT id, status, storage_path FROM documents WHERE user_id = ? AND source_path = ?')
    .get(USER_ID, f.sourcePath) as ExistingRow | undefined;
  const now = nowIso();
  if (row) {
    if (row.status === 'ready') return null;
    const abs = absoluteStoragePath(row.storage_path);
    if (!fs.existsSync(abs)) fs.copyFileSync(f.abs, abs);
    db.prepare("DELETE FROM tasks WHERE document_id = ? AND source = 'document' AND status != 'done'").run(row.id);
    db.prepare(
      "UPDATE documents SET status='processing', error=NULL, category_source='ai', updated_at=? WHERE id=?",
    ).run(now, row.id);
    return { id: row.id };
  }
  const hash = sha256File(f.abs);
  if (db.prepare('SELECT 1 FROM documents WHERE user_id = ? AND file_hash = ?').get(USER_ID, hash)) return null;
  const id = newId();
  const storagePath = path.join(USER_ID, `${id}.pdf`);
  const dest = absoluteStoragePath(storagePath);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(f.abs, dest);
  const name = path.basename(f.abs);
  db.prepare(
    `INSERT INTO documents (id, user_id, title, storage_path, file_hash, original_name, mime_type, size_bytes, status,
       category_source, source_path, created_at, updated_at)
     VALUES (?,?,?,?,?,?, 'application/pdf', ?, 'processing', 'ai', ?, ?, ?)`,
  ).run(id, USER_ID, name.replace(/\.pdf$/i, ''), storagePath, hash, name, fs.statSync(dest).size, f.sourcePath, now, now);
  return { id };
}

function loadPrevious(): Map<string, Entry> {
  try {
    const prev = JSON.parse(fs.readFileSync(EVAL_PATH, 'utf8')) as { entries?: Entry[] };
    return new Map((prev.entries ?? []).map((e) => [e.sourcePath, e]));
  } catch {
    return new Map();
  }
}

async function pool<T>(items: T[], size: number, fn: (item: T, index: number) => Promise<void>): Promise<void> {
  let next = 0;
  const worker = async (): Promise<void> => {
    while (next < items.length) {
      const i = next++;
      await fn(items[i], i);
    }
  };
  await Promise.all(Array.from({ length: Math.min(size, items.length) }, worker));
}

const pct = (n: number, d: number): string => (d === 0 ? 'n/a' : `${((100 * n) / d).toFixed(1)}%`);

async function main(): Promise<void> {
  if (!fs.existsSync(SEED_DIR)) throw new Error('Mapa server/seed-documents ne postoji.');
  const { found, unmapped } = discover();
  const previous = loadPrevious();
  const entries = new Map(previous);
  // Blind hints: only subcategories the AI itself proposed, never the folder names.
  const aiHints: SubcategoryHints = {};
  for (const e of previous.values()) {
    if (e.aiCategory && e.aiSubcategory) (aiHints[e.aiCategory] ??= []).push(e.aiSubcategory);
  }

  const todo: { f: Found; id: string }[] = [];
  let skipped = 0;
  for (const f of found) {
    const row = prepareRow(f);
    if (row) todo.push({ f, id: row.id });
    else skipped++;
  }
  console.log(`Pronađeno ${found.length} PDF-ova, preskočeno (već uvezeno) ${skipped}, za obradu ${todo.length}.`);
  if (unmapped.length) console.log(`Neprepoznata mapa kategorije (preskočeno): ${unmapped.length}`);

  await pool(todo, CONCURRENCY, async ({ f, id }, i) => {
    const hints: SubcategoryHints = Object.fromEntries(Object.entries(aiHints).map(([k, v]) => [k, [...new Set(v)]]));
    const res = await processDocument(id, { hints, retries: RETRIES });
    if (res.ok && res.category && res.subcategory) (aiHints[res.category] ??= []).push(res.subcategory);
    // Folder is the truth from here on.
    db.prepare(
      "UPDATE documents SET category=?, subcategory=?, category_source='import', updated_at=? WHERE id=?",
    ).run(f.category, f.subcategory, nowIso(), id);
    const entry: Entry = {
      sourcePath: f.sourcePath,
      folderCategory: f.category,
      folderSubcategory: f.subcategory,
      aiCategory: res.ok ? (res.category ?? null) : null,
      aiSubcategory: res.ok ? (res.subcategory ?? null) : null,
      status: res.ok ? 'ready' : 'error',
      error: res.ok ? null : (res.error ?? 'Nepoznata greška'),
      categoryMatch: res.ok && res.category === f.category,
      subcategoryMatch: res.ok && normSub(res.subcategory ?? null) === normSub(f.subcategory),
    };
    entries.set(f.sourcePath, entry);
    console.log(`[${i + 1}/${todo.length}] ${entry.status === 'ready' ? 'OK ' : 'ERR'} ${f.sourcePath}`);
  });

  const all = [...entries.values()].filter((e) => found.some((f) => f.sourcePath === e.sourcePath));
  const ok = all.filter((e) => e.status === 'ready');
  const failed = all.filter((e) => e.status === 'error');
  const catHits = ok.filter((e) => e.categoryMatch).length;
  const subHits = ok.filter((e) => e.subcategoryMatch).length;
  const bothHits = ok.filter((e) => e.categoryMatch && e.subcategoryMatch).length;
  const mismatches = ok.filter((e) => !e.categoryMatch || !e.subcategoryMatch);

  const evaluation = {
    generatedAt: nowIso(),
    total: all.length,
    ready: ok.length,
    errors: failed.length,
    categoryAccuracy: ok.length ? catHits / ok.length : null,
    subcategoryMatchRate: ok.length ? subHits / ok.length : null,
    bothMatchRate: ok.length ? bothHits / ok.length : null,
    entries: all,
  };
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(EVAL_PATH, JSON.stringify(evaluation, null, 2));

  console.log('\n=== Evaluacija (AI vs mapa) ===');
  console.log(`Ukupno: ${all.length}, uspjelo: ${ok.length}, greške: ${failed.length}`);
  console.log(`Točnost kategorije:    ${catHits}/${ok.length} (${pct(catHits, ok.length)})`);
  console.log(`Podudaranje podkateg.: ${subHits}/${ok.length} (${pct(subHits, ok.length)})`);
  console.log(`Oboje točno:           ${bothHits}/${ok.length} (${pct(bothHits, ok.length)})`);
  if (mismatches.length) {
    console.log('\nNepodudaranja:');
    for (const m of mismatches) {
      console.log(
        `- ${m.sourcePath}\n    mapa: ${m.folderCategory} | ${m.folderSubcategory ?? '-'}\n    AI:   ${m.aiCategory} | ${m.aiSubcategory ?? '-'}`,
      );
    }
  }
  if (failed.length) {
    console.log('\nGreške:');
    for (const x of failed) console.log(`- ${x.sourcePath}: ${x.error}`);
  }
  console.log(`\nEvaluacija spremljena u ${path.relative(SERVER_ROOT, EVAL_PATH)}`);
  process.exit(failed.length ? 1 : 0);
}

main().catch((e: unknown) => {
  console.error(`Uvoz nije uspio: ${e instanceof Error ? e.message : String(e)}`);
  process.exit(1);
});
