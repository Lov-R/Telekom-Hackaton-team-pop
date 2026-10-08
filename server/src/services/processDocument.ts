import { db, newId, nowIso, tx } from '../db.js';
import { extractDocument, type ExtractOptions } from '../ai/extract.js';
import type { SubcategoryHints } from '../ai/prompts.js';
import { cleanSubcategory } from '../ai/schemas.js';
import { GeminiError } from '../ai/gemini.js';
import { todayZagreb } from '../util/dates.js';
import { followUpDates } from './dateRules.js';
import { absoluteStoragePath, type Extracted } from './documents.js';
import { profileRow, rewardDocument } from './game.js';

/** Subcategories already used in the user's library, grouped by category. */
export function existingSubcategories(userId: string): SubcategoryHints {
  const rows = db
    .prepare(
      `SELECT category, subcategory FROM documents WHERE user_id = ? AND subcategory IS NOT NULL
       GROUP BY category, subcategory ORDER BY COUNT(*) DESC, subcategory`,
    )
    .all(userId) as { category: string; subcategory: string }[];
  const out: SubcategoryHints = {};
  for (const r of rows) (out[r.category] ??= []).push(r.subcategory);
  return out;
}

export interface ProcessResult {
  ok: boolean;
  /** What the AI chose (set when ok), regardless of whether it was stored. */
  category?: string;
  subcategory?: string | null;
  /** Task auto-added from the follow-up (SRS §5.3), if any. */
  taskId?: string | null;
  error?: string;
}

/**
 * SRS §9.2 extract-document: run Gemini, store the result, auto-add the follow-up task (§5.3/§5.4)
 * and award +1 HP for a new document (§6.2). Never throws.
 * Category and subcategory are only overwritten while category_source = 'ai'.
 */
export async function processDocument(id: string, opts: ExtractOptions = {}): Promise<ProcessResult> {
  const doc = db
    .prepare('SELECT id, user_id, storage_path, mime_type, original_name, created_at FROM documents WHERE id = ?')
    .get(id) as
    | { id: string; user_id: string; storage_path: string; mime_type: string | null; original_name: string | null; created_at: string }
    | undefined;
  if (!doc) return { ok: false, error: 'Dokument ne postoji.' };
  try {
    const lang = profileRow(doc.user_id).language;
    const x = await extractDocument(absoluteStoragePath(doc.storage_path), doc.mime_type ?? 'application/pdf', {
      hints: existingSubcategories(doc.user_id),
      lang,
      ...opts,
    });
    const extracted: Extracted = {
      summary: x.summary,
      docType: x.doc_type,
      keyFields: x.key_fields,
      people: x.people,
      followUp: x.follow_up,
      suggestedTier: x.suggested_tier,
      confidence: x.confidence,
      fullText: x.full_text,
    };
    const today = todayZagreb();
    const dates = followUpDates(x.document_date, x.follow_up, today);
    let taskId: string | null = null;
    tx(() => {
      // Document may have been deleted while Gemini was working.
      if (!db.prepare('SELECT 1 FROM documents WHERE id = ?').get(id)) return;
      db.prepare(
        `UPDATE documents SET title = ?,
           category = CASE WHEN category_source = 'ai' THEN ? ELSE category END,
           subcategory = CASE WHEN category_source = 'ai' THEN ? ELSE subcategory END,
           document_date = ?, expiry_date = ?, extracted = ?, status = 'ready', error = NULL, updated_at = ?
         WHERE id = ?`,
      ).run(
        x.title.trim().slice(0, 120) || doc.original_name || 'Dokument',
        x.category,
        cleanSubcategory(x.subcategory),
        x.document_date,
        x.expiry_date,
        JSON.stringify(extracted),
        nowIso(),
        id,
      );
      if (dates) {
        taskId = newId();
        db.prepare(
          `INSERT INTO tasks (id, user_id, document_id, kind, title, tier, source, source_text, remind_at, due_date,
             status, penalty_applied, created_at)
           VALUES (?,?,?, 'deadline', ?,?, 'document', ?,?,?, 'open', ?, ?)`,
        ).run(
          taskId,
          doc.user_id,
          id,
          (x.follow_up.title || x.title || 'Obaveza iz dokumenta').trim().slice(0, 200),
          x.suggested_tier,
          x.follow_up.source_text.trim().slice(0, 500) || null,
          dates.remindAt,
          dates.dueDate,
          // A deadline that was already past when the paper arrived is not the user's fault.
          dates.dueDate < today ? 1 : 0,
          nowIso(),
        );
      }
      rewardDocument(doc.user_id, id);
    });
    return { ok: true, category: x.category, subcategory: cleanSubcategory(x.subcategory), taskId };
  } catch (e) {
    const message = e instanceof GeminiError ? e.message : 'Obrada dokumenta nije uspjela. Pokušaj ponovno.';
    if (!(e instanceof GeminiError)) console.error('processDocument greška:', e instanceof Error ? e.message : e);
    db.prepare("UPDATE documents SET status = 'error', error = ?, updated_at = ? WHERE id = ?").run(message, nowIso(), id);
    return { ok: false, error: message };
  }
}

/** Documents left in 'processing' by a previous run can never finish. */
export function failStuckDocuments(): void {
  db.prepare("UPDATE documents SET status = 'error', error = ?, updated_at = ? WHERE status = 'processing'").run(
    'Obrada je prekinuta. Pokušaj ponovno.',
    nowIso(),
  );
}
