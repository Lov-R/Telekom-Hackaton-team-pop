/** SRS §5.4: follow-up dates are computed here, never by the AI. All dates are Europe/Zagreb calendar dates. */
import type { FollowUp } from '../ai/schemas.js';
import { addDays, addMonths, diffDays } from '../util/dates.js';

const REMIND_BEFORE_EXACT_DAYS = 30;

export interface FollowUpDates {
  dueDate: string;
  remindAt: string;
}

/**
 * - Interval (e.g. 6 months): due = document_date + interval, remind = document_date + interval / 2.
 * - Exact date ("vrijedi do"): due = that date, remind = due − 30 days.
 * - "Po potrebi" / unclear: no task.
 * Without a document date the interval runs from `fallbackDate` (the upload day).
 */
export function followUpDates(documentDate: string | null, f: FollowUp, fallbackDate: string): FollowUpDates | null {
  if (!f.found) return null;
  if (f.exact_date) {
    return { dueDate: f.exact_date, remindAt: addDays(f.exact_date, -REMIND_BEFORE_EXACT_DAYS) };
  }
  const months = f.interval_months;
  if (months > 0) {
    const from = documentDate ?? fallbackDate;
    const dueDate = addMonths(from, months);
    const remindAt =
      months % 2 === 0 ? addMonths(from, months / 2) : addDays(from, Math.round(diffDays(dueDate, from) / 2));
    return { dueDate, remindAt };
  }
  return null;
}
