const ZAGREB = 'Europe/Zagreb';
const fmt = new Intl.DateTimeFormat('en-CA', {
  timeZone: ZAGREB,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

const MONTHS_GEN = [
  'siječnja', 'veljače', 'ožujka', 'travnja', 'svibnja', 'lipnja',
  'srpnja', 'kolovoza', 'rujna', 'listopada', 'studenoga', 'prosinca',
];

/** Today's date (YYYY-MM-DD) in Europe/Zagreb. */
export function todayZagreb(): string {
  return fmt.format(new Date());
}

const clockFmt = new Intl.DateTimeFormat('en-GB', {
  timeZone: ZAGREB,
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});
const WEEKDAYS = {
  hr: ['nedjelja', 'ponedjeljak', 'utorak', 'srijeda', 'četvrtak', 'petak', 'subota'],
  en: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
};

/** Current date, time and weekday in Europe/Zagreb, for AI prompts (SRS §9.1 rule 2). */
export function nowZagreb(lang: 'hr' | 'en' = 'hr'): { date: string; time: string; weekday: string } {
  const date = todayZagreb();
  return { date, time: clockFmt.format(new Date()), weekday: WEEKDAYS[lang][parse(date).getUTCDay()] };
}

/** Convert an ISO timestamp to a Europe/Zagreb calendar date. */
export function toZagrebDate(iso: string): string {
  return fmt.format(new Date(iso));
}

export function isValidDate(s: unknown): s is string {
  if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(`${s}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}

function parse(s: string): Date {
  return new Date(`${s}T00:00:00Z`);
}

export function addDays(date: string, n: number): string {
  const d = parse(date);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export function addMonths(date: string, n: number): string {
  const d = parse(date);
  const day = d.getUTCDate();
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() + n);
  const last = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
  d.setUTCDate(Math.min(day, last));
  return d.toISOString().slice(0, 10);
}

/** Whole days a - b. */
export function diffDays(a: string, b: string): number {
  return Math.round((parse(a).getTime() - parse(b).getTime()) / 86_400_000);
}

/** "15. ožujka 2026." */
export function formatHr(date: string): string {
  const d = parse(date);
  return `${d.getUTCDate()}. ${MONTHS_GEN[d.getUTCMonth()]} ${d.getUTCFullYear()}.`;
}
