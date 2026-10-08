export interface Rule {
  key: string;
  keywords: string[];
  intervalMonths: number;
  leadDays: number;
  title: string;
  /** {date} is replaced with the formatted last occurrence. */
  reasonTpl: string;
}

// Keywords are already normalized (lowercase, no diacritics).
export const RULES: Rule[] = [
  {
    key: 'stomatolog',
    keywords: ['stomatolog', 'zubar', 'dental', 'dentist', 'zub'],
    intervalMonths: 6,
    leadDays: 21,
    title: 'Kontrola kod stomatologa',
    reasonTpl: 'Zadnji posjet stomatologu bio je {date} Preporuka je kontrola svakih 6 mjeseci.',
  },
  {
    key: 'sistematski',
    keywords: ['sistematski', 'opca praksa', 'obiteljski lijecnik', 'check-up', 'checkup'],
    intervalMonths: 12,
    leadDays: 30,
    title: 'Sistematski pregled',
    reasonTpl: 'Zadnji sistematski pregled bio je {date} Preporuka je pregled jednom godišnje.',
  },
  {
    key: 'ginekolog',
    keywords: ['ginekolog'],
    intervalMonths: 12,
    leadDays: 30,
    title: 'Pregled kod ginekologa',
    reasonTpl: 'Zadnji posjet ginekologu bio je {date} Preporuka je pregled jednom godišnje.',
  },
  {
    key: 'oftalmolog',
    keywords: ['oftalmolog', 'ocni', 'optometr'],
    intervalMonths: 24,
    leadDays: 30,
    title: 'Pregled očiju',
    reasonTpl: 'Zadnji pregled očiju bio je {date} Preporuka je pregled svake 2 godine.',
  },
  {
    key: 'registracija',
    keywords: ['registracija', 'tehnicki pregled'],
    intervalMonths: 12,
    leadDays: 30,
    title: 'Registracija i tehnički pregled vozila',
    reasonTpl: 'Zadnja registracija vozila bila je {date} Registracija se obnavlja svake godine.',
  },
  {
    key: 'servis_auta',
    keywords: ['servis vozila', 'mali servis', 'veliki servis', 'servis auta'],
    intervalMonths: 12,
    leadDays: 30,
    title: 'Servis vozila',
    reasonTpl: 'Zadnji servis vozila bio je {date} Preporuka je servis jednom godišnje.',
  },
  {
    key: 'osiguranje',
    keywords: ['polica', 'osiguranje', 'kasko'],
    intervalMonths: 12,
    leadDays: 30,
    title: 'Obnova osiguranja',
    reasonTpl: 'Zadnja polica osiguranja vrijedi od {date} Provjeri i obnovi osiguranje.',
  },
];

/** Does normalized text contain any keyword at a word start? */
export function matchesRule(rule: Rule, normalizedText: string): boolean {
  return rule.keywords.some((k) => {
    const escaped = k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`(^|[^a-z0-9])${escaped}`).test(normalizedText);
  });
}
