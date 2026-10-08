import {
  Car,
  FileSignature,
  FileText,
  GraduationCap,
  HeartPulse,
  IdCard,
  ReceiptText,
  Ticket,
  Gift,
  type LucideIcon,
} from 'lucide-react';
import type { Accessory, CategoryKey, GhostColor, Mood, Recurrence, Tier, Tone } from './types';

export const CATEGORY_LABELS: Record<CategoryKey, string> = {
  zdravstvo: 'Zdravstvo',
  racuni: 'Računi',
  ugovori: 'Ugovori',
  vozilo: 'Vozilo',
  osobni_dokumenti: 'Osobni dokumenti',
  skola_vrtic: 'Škola i vrtić',
  karte_dogadaji: 'Karte i događaji',
  bonovi: 'Bonovi',
  ostalo: 'Ostalo',
};

export const CATEGORY_ICON: Record<CategoryKey, LucideIcon> = {
  zdravstvo: HeartPulse,
  racuni: ReceiptText,
  ugovori: FileSignature,
  vozilo: Car,
  osobni_dokumenti: IdCard,
  skola_vrtic: GraduationCap,
  karte_dogadaji: Ticket,
  bonovi: Gift,
  ostalo: FileText,
};

/** SRS §6.1 */
export const TIER_LABELS: Record<Tier, string> = {
  1: 'Sitnica',
  2: 'Obaveza',
  3: 'Papirologija',
  4: 'Velika obaveza',
  5: 'Epska obaveza',
};
export const TIER_HP: Record<Tier, number> = { 1: 2, 2: 5, 3: 10, 4: 20, 5: 30 };
export const TIERS: Tier[] = [1, 2, 3, 4, 5];

export const KIND_LABELS = { event: 'Događaj', deadline: 'Rok' } as const;

export const RECURRENCE_LABELS: Record<Recurrence, string> = {
  none: 'Ne ponavlja se',
  monthly: 'Svaki mjesec',
  yearly: 'Svake godine',
};

export const TONE_LABELS: Record<Tone, { label: string; sample: string }> = {
  blago: { label: 'Blago', sample: 'Račun za struju još čeka. Želiš li da ga dodam za sutra?' },
  sarkasticno: { label: 'Sarkastično', sample: 'Tvoj račun za struju i ja imamo nešto zajedničko: oboje čekamo.' },
  brutalno: { label: 'Brutalno', sample: 'Rok je bio jučer. Ne ljutim se. Samo sam proziran od razočaranja.' },
};

export const KEY_DATE_LABELS: Record<string, string> = {
  issue: 'Izdavanje',
  expiry: 'Istek',
  deadline: 'Rok',
  appointment: 'Termin',
  payment: 'Plaćanje',
  event: 'Događaj',
  other: 'Ostalo',
};

/** The ghost's face follows presence (§6.4); presence itself is shown as visibility, not a number. */
export function moodFor(presence: number): Mood {
  if (presence >= 80) return 'sretan';
  if (presence >= 60) return 'dobro';
  if (presence >= 40) return 'umoran';
  if (presence >= 20) return 'tuzan';
  return 'bolestan';
}

export const MOOD_MESSAGES: Record<Mood, string> = {
  sretan: 'Jasno te vidim. Tako i treba.',
  dobro: 'Tu sam. Riješi još nešto pa ću sjati.',
  umoran: 'Počinjem blijediti. Jedan riješen zadatak bi pomogao.',
  tuzan: 'Jedva me se vidi. Rokovi prolaze bez tebe.',
  bolestan: 'Skoro sam nestao. Riješi bilo što, molim te.',
};

export const GHOST_COLOR_LABELS: Record<GhostColor, string> = {
  lavanda: 'Lavanda',
  menta: 'Menta',
  breskva: 'Breskva',
  nebo: 'Nebo',
  limun: 'Limun',
};

export const GHOST_COLORS: Record<GhostColor, { body: string; shade: string; cheek: string }> = {
  lavanda: { body: '#c9b8ff', shade: '#9d86f0', cheek: '#ff9fc4' },
  menta: { body: '#aeeed2', shade: '#6fd0a5', cheek: '#ffb0b8' },
  breskva: { body: '#ffd0b5', shade: '#f4a27c', cheek: '#ff8fa3' },
  nebo: { body: '#b5dcff', shade: '#7ab6f0', cheek: '#ffa6c1' },
  limun: { body: '#f7ec9a', shade: '#e2cf5c', cheek: '#ff9eaa' },
};

export const ACCESSORY_LABELS: Record<Accessory, string> = {
  none: 'Bez dodatka',
  sesir: 'Šešir',
  naocale: 'Naočale',
  masna: 'Mašna',
  kruna: 'Kruna',
};

/** Map on which each accessory unlocks. */
export const ACCESSORY_MAP: Record<Accessory, number> = {
  none: 1,
  sesir: 1,
  naocale: 2,
  masna: 3,
  kruna: 5,
};

export const MAP_NAMES = [
  'Močvara Odgađanja',
  'Šuma Papira',
  'Grad Obaveza',
  'Planina Discipline',
  'Vrh Mirne Glave',
];
