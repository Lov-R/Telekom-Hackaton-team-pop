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

## Netlify

`netlify.toml` gradi klijent (`client/dist`), a cijeli API radi kao jedna funkcija (`netlify/functions/api.mts`, putanja `/api/*`). Netlify nema trajni disk, pa se SQLite baza čuva kao jedan blob u Netlify Blobs (`server/src/persist.ts`): svaki zahtjev povuče bazu ako ju je druga instanca promijenila i spremi je ako se promijenila. Datoteke dokumenata su također u Blobs. Obrada dokumenata nastavlja se nakon odgovora (`waitUntil`, ukupno najviše 60 s); `netlify/functions/hourly.mts` je satni posao.

Ograničenja: datoteke najviše 4 MB (Netlify prima najviše ~4,5 MB binarnog tijela), a rješenje je za demo promet. Ako dvije instance pišu u istom trenutku, pobjeđuje zadnji zapis.

1. Netlify → *Add new project* → *Import from Git* → ovaj repozitorij (postavke gradnje čita iz `netlify.toml`).
2. *Environment variables*: `GEMINI_API_KEY`, po želji `GEMINI_MODEL`, te `ADMIN_IMPORT_TOKEN` (nasumičan niz od 32+ znaka) za jednokratni prijenos podataka.
3. Nakon prvog deploya prenesi lokalnu bazu i dokumente (bez Gemini poziva; **zamjenjuje bazu na Netlifyju**):
   ```bash
   NETLIFY_URL=https://<site>.netlify.app ADMIN_IMPORT_TOKEN=<token> npm run upload-netlify -w server
   ```
4. Obriši `ADMIN_IMPORT_TOKEN` u Netlifyju i ponovno deployaj, čime se `/api/admin/*` isključuje.

## Capacitor (iOS)

Na Macu: `npm i @capacitor/ios -w client`, `npx cap add ios`, u `Info.plist` dodaj `NSCameraUsageDescription` i `NSPhotoLibraryUsageDescription`, postavi `VITE_API_BASE` na adresu servera i napravi `npm run build -w client && npx cap sync`.
