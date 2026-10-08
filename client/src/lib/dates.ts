import { format } from 'date-fns/format';
import { parseISO } from 'date-fns/parseISO';
import { hr } from 'date-fns/locale/hr';

export const toIso = (d: Date): string => format(d, 'yyyy-MM-dd');
export const todayIso = (): string => toIso(new Date());

/** "15. ožu 2026." */
export function formatDate(iso: string, pattern = 'd. MMM yyyy.'): string {
  return format(parseISO(iso), pattern, { locale: hr });
}

/** Relative label for due dates: "Danas", "Sutra", "Kasni 3 d", "Za 5 d". */
export function dueLabel(iso: string): string {
  const today = parseISO(todayIso());
  const diff = Math.round((parseISO(iso).getTime() - today.getTime()) / 86_400_000);
  if (diff === 0) return 'Danas';
  if (diff === 1) return 'Sutra';
  if (diff === -1) return 'Jučer';
  if (diff < 0) return `Kasni ${-diff} d`;
  if (diff <= 14) return `Za ${diff} d`;
  return formatDate(iso);
}

export function formatBytes(n: number | null): string {
  if (!n) return '';
  if (n < 1024 * 1024) return `${Math.max(1, Math.round(n / 1024))} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}
