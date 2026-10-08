# relAI

Mobilna (PWA) aplikacija prema `md files/SRS.md`: papir postaje rok, rok postaje igra. AI (Google Gemini) čita dokumente i sam dodaje obaveze; duh napreduje po mapi kad ih rješavaš.

Odstupanja od SRS-a (dogovoreno): SQLite + Express umjesto Supabasea (prijava emailom i lozinkom, svaki upit filtriran po `user_id` umjesto RLS-a); ciljevi i preporuke zadržani kao dodatak; SRS kategorije uz podkategorije. Još nije napravljeno: notifikacije i push (F13/F17), rječnik HR/EN za sučelje (jezik se sprema i koristi za AI), prijatelji (F16).

Stack: Vite + React 19 + TypeScript + Tailwind v4 + shadcn/ui (klijent), Express 5 + SQLite (better-sqlite3) (server), Capacitor konfiguracija za iOS.

## Pokretanje

```bash
npm install
cp server/.env.example server/.env   # upiši GEMINI_API_KEY (ne commitaj ga)
npm run dev                          # server :3001 + klijent :5173
```

**Prvi račun koji se registrira dobiva stare podatke** (stara baza je premještena u `server/data/relai.legacy.db`; sigurnosna kopija u `server/data/backup-pre-srs/`). Registriraj se prije pokretanja `smoke`.

Ostale naredbe: `npm run typecheck`, `npm run build`, `SEED_EMAIL=<tvoj email> npm run seed` (demo podaci), `npm run smoke` (uz pokrenut server, koristi vlastiti račun `smoke@relai.local`), `IMPORT_EMAIL=<email> npm run import-docs`, `npm run gemini:ping -w server`.
SRS provjere bez AI-ja (na praznoj bazi): `RELAI_DATA_DIR=<prazna mapa> npm run srs-checks -w server`.

## Otvaranje na mobitelu (LAN)

Vite sluša na svim sučeljima. Mobitel i računalo moraju biti na istoj Wi-Fi mreži. Otvori `http://<IP-računala>:5173` (Vite ispiše adrese u terminalu). Na običnom `http://` adresama preglednik ne dopušta live kameru, ali gumb "Slikaj dokument" (nativna kamera telefona) radi. Service worker (`client/public/sw.js`) namjerno ništa ne sprema u cache, pa mobitel uvijek dobiva najnoviju verziju.

## Konfiguracija

`server/.env`: `GEMINI_API_KEY`, `GEMINI_MODEL` (zadano `gemini-3.8-flash`), `GEMINI_FALLBACK_MODEL` (zadano `gemini-3.5-flash-lite`), `PORT`, `RELAI_DATA_DIR` (neobavezno, za testove).
`client/.env` (neobavezno): `VITE_API_BASE` za Capacitor build.

## Capacitor (iOS)

Na Macu: `npm i @capacitor/ios -w client`, `npx cap add ios`, u `Info.plist` dodaj `NSCameraUsageDescription` i `NSPhotoLibraryUsageDescription`, postavi `VITE_API_BASE` na adresu servera i napravi `npm run build -w client && npx cap sync`.
