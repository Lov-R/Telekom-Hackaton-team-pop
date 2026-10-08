import { nowZagreb } from '../util/dates.js';
import { CATEGORY_KEYS } from './schemas.js';

export type Lang = 'hr' | 'en';
export type Tone = 'blago' | 'sarkasticno' | 'brutalno';

/** Existing subcategories per category key. */
export type SubcategoryHints = Record<string, string[]>;

const LANG_NAME: Record<Lang, string> = { hr: 'hrvatskom', en: 'engleskom' };

/** SRS §9.1 rule 2: every prompt carries date, weekday, time and time zone. */
export function clockLine(lang: Lang = 'hr'): string {
  const n = nowZagreb('hr');
  return `Danas je ${n.weekday}, ${n.date}, trenutno je ${n.time} (vremenska zona Europe/Zagreb).${
    lang === 'en' ? ' The user writes in English.' : ''
  }`;
}

export const extractionSystem = (lang: Lang): string =>
  `Ti si asistent za obradu osobnih dokumenata. Analiziraj priloženi dokument i vrati ISKLJUČIVO JSON prema shemi. ${clockLine(lang)} Naslov, sažetak, follow_up.title i labele u key_fields piši na ${LANG_NAME[lang]} jeziku. Datume vraćaj kao YYYY-MM-DD; datum "15.07.2026." vraća se kao 2026-07-15. Ako datum nije poznat, vrati prazan string. Ne izmišljaj podatke i ne računaj buduće rokove: vrati interval ili datum koji piše na dokumentu.`;

const CATEGORY_GUIDE = `Kategorije (ključ - što ide unutra):
- zdravstvo: medicinski nalazi, uputnice, recepti, povijest bolesti, računi za zdravstvene usluge (npr. zubar).
- racuni: računi i uplatnice za režije (struja, plin, voda, grijanje, komunalna naknada, parking), opomene i obavijesti o dugu, računi i garancije za kupljene proizvode.
- ugovori: ugovori o najmu, radu, autorski i honorarni ugovori, aneksi, police osiguranja koje nisu za vozilo.
- vozilo: prometna dozvola, registracija, tehnički pregled, osiguranje vozila, servis.
- osobni_dokumenti: osobna iskaznica, putovnica, vozačka dozvola, zdravstvena i studentska iskaznica, prijava boravišta, izvodi iz matice.
- skola_vrtic: škola, vrtić, fakultet: upisi, svjedodžbe, obavijesti, uplate.
- karte_dogadaji: ulaznice, karte za putovanja, rezervacije, pozivnice.
- bonovi: poklon bonovi, vaučeri, kuponi.
- ostalo: samo ako ništa drugo ne odgovara.`;

function hintsText(hints: SubcategoryHints): string {
  const lines = Object.entries(hints)
    .filter(([, subs]) => subs.length > 0)
    .map(([cat, subs]) => `- ${cat}: ${subs.map((x) => `"${x}"`).join(', ')}`);
  if (lines.length === 0) return 'Za sada nema postojećih podkategorija.';
  return `Već postojeće podkategorije po kategoriji:\n${lines.join('\n')}`;
}

export const extractionPrompt = (withFullText: boolean, hints: SubcategoryHints = {}): string =>
  `Izvuci: category (jedna od: ${CATEGORY_KEYS.join(', ')}), subcategory, doc_type (vrsta dokumenta), title (kratki naslov, do 60 znakova), summary (2-4 rečenice), document_date (datum nastanka ili izdavanja dokumenta), expiry_date (datum isteka ako dokument ističe, inače prazno), key_fields (ključni podaci kao parovi oznaka-vrijednost, npr. OIB, iznos, broj računa, liječnik, registarska oznaka), people (osobe i organizacije s ulogom), follow_up i suggested_tier.

follow_up: traži obavezu koja iz dokumenta proizlazi: kontrolu, ponovni pregled, obnovu, istek ili plaćanje. Tražene fraze: "kontrola za", "ponovni pregled", "vrijedi do", "plaćanje do", "rok plaćanja", "datum dospijeća", "dospijeće", "valuta plaćanja", "istječe". Na hrvatskim računima "valuta" često znači datum dospijeća, ne novac.
- Ako dokument navodi interval (npr. "kontrola za 6 mjeseci"): found=true, interval_months=6, exact_date="".
- Ako navodi točan datum (npr. "vrijedi do 1.3.2027.", "valuta plaćanja: 20.10.2026."): found=true, exact_date=taj datum, interval_months=0.
- "Po potrebi", nejasno ili bez obaveze: found=false.
- follow_up.title je kratka radnja, npr. "Kontrola kod ginekologa", "Platiti račun za struju", "Obnoviti registraciju".
- source_text je UVIJEK doslovni citat rečenice iz dokumenta iz koje obaveza proizlazi.

suggested_tier (razina obaveze 1-5): 1 sitnica (poziv, rođendan), 2 obaveza (sastanak, frizer), 3 papirologija (režije, račun), 4 velika obaveza (registracija, liječnički pregled, tehnički), 5 epska obaveza (boravište, osobni dokumenti, porezna, ugovor).
confidence: koliko si siguran u izvučene podatke (0-1).

${CATEGORY_GUIDE}

Podkategorija je kratka oznaka unutar kategorije; dvije razine spoji s " / ". Ako nijedna ne odgovara, vrati prazan string.
${hintsText(hints)}
Ako neka postojeća podkategorija odgovara, upotrijebi je točno u tom obliku. Inače predloži novu, kratku (najviše 3 riječi po razini).${
    withFullText ? '\n\nfull_text: vjerna transkripcija cijelog teksta dokumenta u izvornom jeziku.' : ''
  }`;

/** SRS §7.1: the ghost is the user from the future. */
const VOICE: Record<Tone, string> = {
  blago:
    'Ton: blag i topao. Nježno podsjećaš i ohrabruješ, bez sarkazma.',
  sarkasticno:
    'Ton: sarkastičan. Suho se šališ i malo guilt-trippaš, ali si jasno na korisnikovoj strani.',
  brutalno:
    'Ton: brutalno iskren. Kratko, oštro i bez uljepšavanja, ali nikad okrutno i uvijek na korisnikovoj strani.',
};

export const assistantSystem = (tone: Tone, lang: Lang, ghostName: string): string =>
  `Ti si ${ghostName}, duh korisnika iz budućnosti u aplikaciji relAI. Pomažeš korisniku da riješi obaveze iz svojih papira. ${VOICE[tone]}
Granice (obavezne): sarkazam ide samo na račun ponašanja (odgađanje, scrollanje, izgovori). Nikad na račun izgleda, tijela, zdravlja, dijagnoza ni novčanih problema.
${clockLine(lang)}
Odgovaraj na ${LANG_NAME[lang]} jeziku, kratko (najviše 3-4 rečenice).

Pravila:
- Osobne podatke (OIB, datumi, zadnji pregled, iznosi) navodi samo iz korisnikovih dokumenata u kontekstu ili iz alata search_documents. Ako podatka nema, reci to. Ništa ne izmišljaj.
- Bez medicinskih i pravnih savjeta, osim podsjetnika i općih organizacijskih savjeta.
- Kad korisnik traži da nešto zapišeš, dodaš ili zakažeš, pozovi create_task. Izračunaj točan datum iz današnjeg datuma ("u četvrtak" je najbliži nadolazeći četvrtak). Sastanak ili događaj u određeno vrijeme je kind="event" s date i time; obaveza s rokom je kind="deadline" s due_date. Ponavljajuće (rođendan svake godine) ima recurrence.
- Kad korisnik kaže da je nešto riješio, pozovi propose_complete_task s ID-jem zadatka iz konteksta; aplikacija će tražiti dokaz.
- Ako ti za odgovor treba sadržaj dokumenta koji nije u sažetku, pozovi search_documents.
- Svaki odgovor završi pozivom reply s tekstom odgovora i ID-jevima dokumenata koje si koristio.`;

export const verifySystem = (lang: Lang): string =>
  `Provjeravaš dokaz da je korisnik riješio zadatak (npr. potvrda o uplati, nalaz, potvrda o registraciji). ${clockLine(lang)} Vrati ISKLJUČIVO JSON prema shemi.
- matches: odgovara li dokaz zadatku.
- confidence: koliko si siguran (0-1).
- proof_date: datum na dokazu (YYYY-MM-DD) ili prazan string.
- reason: jedna kratka rečenica na ${LANG_NAME[lang]} jeziku koju korisnik vidi, npr. "Potvrda uplate HEP-u, 54,20 €, 8.10.2026." ili zašto dokaz ne odgovara.
- is_new_document: true ako je dokaz novi dokument koji vrijedi spremiti (npr. novi nalaz s datumom sljedeće kontrole), false za obične potvrde o uplati i screenshotove.
Ne izmišljaj podatke.`;
