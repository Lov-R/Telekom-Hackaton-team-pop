import { z } from 'zod';
import { isValidDate } from '../util/dates.js';

/** SRS §5.2 categories. */
export const CATEGORIES = [
  { key: 'zdravstvo', label: 'Zdravstvo' },
  { key: 'racuni', label: 'Računi' },
  { key: 'ugovori', label: 'Ugovori' },
  { key: 'vozilo', label: 'Vozilo' },
  { key: 'osobni_dokumenti', label: 'Osobni dokumenti' },
  { key: 'skola_vrtic', label: 'Škola i vrtić' },
  { key: 'karte_dogadaji', label: 'Karte i događaji' },
  { key: 'bonovi', label: 'Bonovi' },
  { key: 'ostalo', label: 'Ostalo' },
] as const;

export const CATEGORY_KEYS = CATEGORIES.map((c) => c.key) as [string, ...string[]];

const str = { type: 'string' };

/** SRS §9.2 output, plus summary/people/fullText which the document screen and assistant use. */
export function extractionJsonSchema(withFullText: boolean): Record<string, unknown> {
  const properties: Record<string, unknown> = {
    category: { type: 'string', enum: CATEGORY_KEYS },
    subcategory: str,
    title: str,
    doc_type: str,
    summary: str,
    document_date: str,
    expiry_date: str,
    key_fields: {
      type: 'array',
      items: { type: 'object', properties: { label: str, value: str }, required: ['label', 'value'] },
    },
    people: {
      type: 'array',
      items: { type: 'object', properties: { name: str, role: str }, required: ['name', 'role'] },
    },
    follow_up: {
      type: 'object',
      properties: {
        found: { type: 'boolean' },
        title: str,
        interval_months: { type: 'integer' },
        exact_date: str,
        source_text: str,
      },
      required: ['found', 'title', 'interval_months', 'exact_date', 'source_text'],
    },
    suggested_tier: { type: 'integer', minimum: 1, maximum: 5 },
    confidence: { type: 'number' },
  };
  if (withFullText) properties.full_text = str;
  return { type: 'object', properties, required: Object.keys(properties) };
}

const s = z.string().catch('');
const dateOrNull = z
  .string()
  .catch('')
  .transform((v) => (isValidDate(v) ? v : null));

const FollowUpZ = z
  .object({
    found: z.boolean().catch(false),
    title: s,
    interval_months: z.number().int().min(0).max(120).catch(0),
    exact_date: dateOrNull,
    source_text: s,
  })
  .catch({ found: false, title: '', interval_months: 0, exact_date: null, source_text: '' });

const ExtractionZ = z.object({
  category: z.enum(CATEGORY_KEYS).catch('ostalo'),
  subcategory: s,
  title: s,
  doc_type: s,
  summary: s,
  document_date: dateOrNull,
  expiry_date: dateOrNull,
  key_fields: z.array(z.object({ label: s, value: s })).catch([]),
  people: z.array(z.object({ name: s, role: s })).catch([]),
  follow_up: FollowUpZ,
  suggested_tier: z.number().int().min(1).max(5).catch(2),
  confidence: z.number().min(0).max(1).catch(0),
  full_text: s,
});

export type Extraction = z.infer<typeof ExtractionZ>;
export type FollowUp = Extraction['follow_up'];

/** Trim, collapse whitespace and cap length; empty becomes null. */
export function cleanSubcategory(value: string | null | undefined): string | null {
  const v = (value ?? '').replace(/\s+/g, ' ').trim().slice(0, 80);
  return v || null;
}

/** Validate raw model JSON; malformed fields fall back to safe defaults. */
export function parseExtraction(raw: unknown): Extraction {
  const e = ExtractionZ.parse(raw ?? {});
  return {
    ...e,
    subcategory: cleanSubcategory(e.subcategory) ?? '',
    key_fields: e.key_fields.filter((k) => k.label.trim() && k.value.trim()),
    people: e.people.filter((p) => p.name.trim()),
  };
}

/** SRS §9.4 output. */
export const verifyJsonSchema = {
  type: 'object',
  properties: {
    matches: { type: 'boolean' },
    confidence: { type: 'number' },
    proof_date: str,
    reason: str,
    is_new_document: { type: 'boolean' },
  },
  required: ['matches', 'confidence', 'proof_date', 'reason', 'is_new_document'],
};

export const VerifyZ = z.object({
  matches: z.boolean().catch(false),
  confidence: z.number().min(0).max(1).catch(0),
  proof_date: dateOrNull,
  reason: s,
  is_new_document: z.boolean().catch(false),
});

export type VerifyResult = z.infer<typeof VerifyZ>;
