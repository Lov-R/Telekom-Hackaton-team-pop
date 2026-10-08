# relAI — Architecture & Implementation Roadmap

Single-user, mobile-first **Croatian** PWA + local Express/SQLite backend. Users upload a PDF (or photos → client-built PDF); the server sends the file to Gemini, which returns structured JSON (category, summary, dates, people, tasks, events, full text). That powers the documents, tasks, calendar, chat and ghost health.

Key decisions:
- **Uploads are processed asynchronously.** `POST /api/documents` returns 202 with `status:"processing"`; the client polls every 2s while anything is still processing. Gemini takes 10–40s.
- **Ghost health is recomputed on every read** and never stored, so decay comes naturally from overdue days. No cron job, no drift.

## Upfront notes
1. **Model:** read it from the env var `GEMINI_MODEL`, default `gemini-3.5-flash`; fall back to `gemini-3.8-flash` / `gemini-3.5-flash-lite`. `gemini-2.5-flash` is restricted to existing users. Never hardcode the model.
2. **Key format:** the key is a new-style `AQ.` key. Some clients reportedly reject AQ keys with a 401. Run the Gemini ping (Task 3) BEFORE building the AI features. If it fails, upgrade `@google/genai`, retry with the `GOOGLE_API_KEY` variable name, then stop and report.
3. **The key is in plaintext in `instructions.md`.** Copy it into `server/.env` (gitignored) and gitignore `instructions.md`. Never put the key in code, logs, READMEs, fixtures or anything with a `VITE_` prefix.

## Stack
- **Client:** Vite + React 19 + TS, Tailwind v4 (`@tailwindcss/vite`), shadcn/ui (Radix), react-router 7, @tanstack/react-query 5, lucide-react, sonner, date-fns (`hr` locale), pdf-lib, vite-plugin-pwa ≥1.3, @capacitor/core + @capacitor/cli (config only).
- **Server:** Express 5, multer 2, **better-sqlite3 ^13** (N-API prebuilt), @google/genai (latest), zod, dotenv, tsx, typescript, cors.
  - Fallback DB driver: `node:sqlite` `DatabaseSync` (Node ≥22.13).
  - All DB access goes through `server/src/db.ts`, which exposes `db` plus a `tx(fn)` helper built on BEGIN/COMMIT/ROLLBACK. Don't use the driver-specific `.transaction()`.
- **Root:** npm workspaces `["client","server"]` + concurrently.

## Folder tree
```
/ package.json (workspaces; scripts dev, build, typecheck, smoke)  .gitignore (node_modules, dist, server/.env, server/data/, instructions.md, *.log)
client/ index.html vite.config.ts tsconfig*.json components.json capacitor.config.ts
  public/ logo.svg + PWA icons
  src/ main.tsx App.tsx index.css
    lib/ api.ts (fetch wrapper, VITE_API_BASE) types.ts labels.ts (HR labels) utils.ts
    hooks/ queries.ts useMediaQuery.ts
    components/ ui/ (shadcn)
      layout/ AppShell Sidebar BottomNav ChatFab
      ghost/ Ghost.tsx (SVG; mood, health, color, accessory) HealthBar
      documents/ DocumentCard CategoryFilter ProcessingBadge
      scan/ PdfDropzone CameraCapture PageEditor imageProcessing.ts buildPdf.ts
      tasks/ TaskItem TaskForm GoalCard
      calendar/ MonthGrid DayAgenda EventForm RecommendationCard
      chat/ MessageBubble CitationChips
    pages/ Home Documents DocumentDetail Scan Tasks Calendar Chat Profile NotFound
server/ .env (gitignored) .env.example package.json tsconfig.json
  data/ (gitignored) relai.db uploads/<uuid>.pdf
  scripts/ gemini-ping.ts smoke.ts seed-demo.ts
  src/ index.ts (cors, json, routes, error handler, PORT=3001)
    env.ts (dotenv by absolute path + zod)  db.ts  schema.sql
    routes/ documents tasks goals events recommendations chat profile dashboard
    ai/ gemini.ts extract.ts chat.ts schemas.ts prompts.ts
    services/ processDocument.ts ghost.ts recommendations.ts rules.ts retrieval.ts
    util/ dates.ts (today in Europe/Zagreb) text.ts (normalize: lowercase + strip diacritics)
```

**Vite config:**
- `server.proxy {'/api':'http://localhost:3001'}`, `server.host: true`, `@` alias → `src`.
- VitePWA:
  - `registerType: 'autoUpdate'`;
  - manifest: name "relAI", `lang: "hr"`, `display: "standalone"`, plus icons;
  - workbox `navigateFallbackDenylist: [/^\/api/]`. **Never cache `/api`.**

**Env:**
- `server/.env`: `GEMINI_API_KEY`, `GEMINI_MODEL=gemini-3.5-flash`, `PORT=3001`.
- `client/.env` (optional): `VITE_API_BASE=`. Empty means use the proxy; the Capacitor build sets a full URL.

## SQLite schema
Settings: `PRAGMA journal_mode=WAL; foreign_keys=ON`. IDs are `crypto.randomUUID()`. Timestamps are ISO strings; dates are `YYYY-MM-DD`.
```sql
documents(id TEXT PK, title TEXT NOT NULL, category TEXT NOT NULL DEFAULT 'ostalo', doc_type, summary, full_text,
  key_dates_json DEFAULT '[]', people_json DEFAULT '[]', file_path NOT NULL, original_name, mime_type, size_bytes INTEGER,
  status CHECK IN('processing','ready','error'), error, created_at, updated_at)
goals(id PK, title NOT NULL, description, target_date, completed_at, created_at)
tasks(id PK, title NOT NULL, description, due_date, priority CHECK IN('low','medium','high') DEFAULT 'medium',
  status CHECK IN('open','done') DEFAULT 'open', source CHECK IN('user','document','recommendation'),
  document_id REFERENCES documents ON DELETE CASCADE, goal_id REFERENCES goals ON DELETE SET NULL, completed_at, created_at)
events(id PK, title NOT NULL, description, date NOT NULL, time, kind CHECK IN('event','deadline','appointment','expiry','reminder'),
  source CHECK IN('user','document','recommendation'), document_id REFERENCES documents ON DELETE CASCADE, created_at)
recommendations(id PK, dedupe_key TEXT UNIQUE NOT NULL, rule_key, title, reason, suggested_date, source_event_id,
  source_document_id, status CHECK IN('pending','accepted','dismissed') DEFAULT 'pending', created_at)
chat_messages(id PK, role CHECK IN('user','assistant'), content NOT NULL, citations_json DEFAULT '[]', created_at)
profile(id INTEGER PK CHECK(id=1), ghost_name DEFAULT 'Duško', ghost_color DEFAULT 'lavanda', accessory DEFAULT 'none', created_at)
-- seed profile row; indexes tasks(status,due_date), events(date), documents(category)
```
Categories: `osobni_dokumenti, zdravlje, financije, posao, obrazovanje, vozilo, stanovanje, ugovori, putovanja, ostalo`.

## REST API (`/api`, camelCase JSON; errors `{error:{code,message}}` with a Croatian message; 502 for Gemini failures)
| Route | Request | Response |
|---|---|---|
| GET /health | – | `{ok, model, db}` |
| GET /documents?category=&q= | – | `[{id,title,category,docType,summary,status,createdAt,sizeBytes}]` |
| POST /documents | multipart `file` (pdf/jpeg/png/webp, ≤15MB) | 202 list item |
| GET /documents/:id | – | detail = item + `{keyDates:[{date,label,type}], people:[{name,role}], fullText, error, tasks, events}` |
| GET /documents/:id/file | – | inline file; **path looked up in the DB** |
| PATCH /documents/:id | `{title?,category?}` | detail |
| POST /documents/:id/reprocess | – | 202; first deletes the document-sourced tasks/events |
| DELETE /documents/:id | – | 204; deletes the file; cascades |
| GET /categories | – | `[{key,label,count}]` |
| GET /tasks?status=&goalId= | – | Task `{id,title,description,dueDate,priority,status,source,documentId,documentTitle,goalId,completedAt,createdAt,overdue}` |
| POST /tasks | `{title,description?,dueDate?,priority?,goalId?}` | Task |
| PATCH /tasks/:id | editable fields + `status` | `{task, ghost}` |
| DELETE /tasks/:id | – | 204 |
| CRUD /goals | `{title,description?,targetDate?,completed?}` | Goal + `progress:{done,total}` |
| GET /events?from=&to= | – | Event `{id,title,description,date,time,kind,source,documentId}` |
| POST/PATCH/DELETE /events | `{title,date,time?,kind?,description?}` | Event |
| GET /recommendations | – | runs the engine; returns pending `[{id,title,reason,suggestedDate,ruleKey}]` |
| POST /recommendations/:id/accept | `{date?}` | `{event, task}` |
| POST /recommendations/:id/dismiss | – | 204 |
| GET /chat/messages, DELETE /chat/messages | – | `ChatMessage{id,role,content,citations:[{documentId,title}],createdAt}` |
| POST /chat | `{message}` | `{userMessage, assistantMessage}` |
| GET /profile, PATCH /profile | `{name?,color?,accessory?}` | GhostSnapshot `{name,color,accessory,health,mood,level,xp,streak,stats:{openTasks,overdueTasks,doneLast7,documents},breakdown:[{label,delta}],unlockedAccessories}` |
| GET /dashboard | – | `{ghost, upcomingEvents (14d, max 5), dueTasks (overdue + 7d), recentDocuments (5), recommendations (max 3)}` |

## Gemini
**Client setup**
- Create one client: `new GoogleGenAI({apiKey})`.
- Call `generateContent({model, contents, config:{systemInstruction, responseMimeType:'application/json', responseJsonSchema, temperature:0.2}})`.
  - If the installed SDK version doesn't type `responseJsonSchema`, use `responseSchema` with the `Type` enum.
- Schema subset: use only `type`, `properties`, `required`, `enum`, `items`. Avoid nullable fields; use `""` for unknown values and convert it to null on the server.
- Parse with `JSON.parse`, then validate with zod (`.catch()` defaults). Drop items whose date doesn't match `^\d{4}-\d{2}-\d{2}$`.

**Extraction**
- Send the file as `inlineData` (base64) with `maxOutputTokens: 32768`.
- System instruction:
  > "Ti si asistent za obradu osobnih dokumenata. Analiziraj priloženi dokument i vrati ISKLJUČIVO JSON prema shemi. Sav tekst (naslov, sažetak, zadaci, događaji, oznake) piši na hrvatskom jeziku. Današnji datum je {TODAY} (Europe/Zagreb). Datume vraćaj u formatu YYYY-MM-DD; ako datum nije poznat, vrati prazan string. Ne izmišljaj podatke."
- User prompt:
  > "Izvuci: kategoriju (jedna od: {enum}), vrstu dokumenta, kratki naslov (do 60 znakova), sažetak od 2-4 rečenice, sve važne datume (izdavanje, istek, rokovi, termini, plaćanja), sve osobe i organizacije s ulogom, zadatke koje korisnik mora obaviti (npr. 'Predaj prijavu prije roka' s rokom), te kalendarske događaje. Za dokumente koji istječu (osobna, vozačka, putovnica, registracija, osiguranje) dodaj događaj vrste 'expiry' na datum isteka I događaj vrste 'reminder' 30-60 dana prije isteka ('Obnovi …'). fullText: vjerna transkripcija cijelog teksta dokumenta u izvornom jeziku."
- Response schema: `{title, category(enum), docType, summary, keyDates[{date,label,type∈issue|expiry|deadline|appointment|payment|event|other}], people[{name,role}], tasks[{title,description,dueDate,priority∈low|medium|high}], events[{title,description,date,time,kind∈event|deadline|appointment|expiry|reminder}], fullText}`. All fields are required.
- If parsing fails, retry once without `fullText` and store `fullText = summary`. Any other error sets `status='error'` with a Croatian message; the UI then shows a "Pokušaj ponovno" (try again) button.

**Chat grounding**
1. Load all `ready` documents.
   - If the combined `full_text` is under 150k characters, include everything.
   - Otherwise:
     - score each document: normalize, strip a short Croatian stopword list, keep tokens of 3+ characters, and match on the token's first 5 characters;
     - score = 3×title/docType + 3×people + 2×summary + min(fullText hits, 10);
     - include the top 4 in full (each cut to 40k characters) plus a catalogue of all documents (id, title, category, summary, people).
2. Context block format: `### DOKUMENT id=<id> | <title> | <category>\n<text>`.
3. System instruction:
   > "Odgovaraš na pitanja korisnika isključivo na temelju priloženih dokumenata. Odgovaraj na hrvatskom, sažeto. Ako odgovor nije u dokumentima, reci to jasno. Navedi ID-jeve dokumenata koje si koristio. Današnji datum je {TODAY}."
4. Contents: the last 6 messages as user/model turns, then the context and the question.
5. Response schema: `{answer, citedDocumentIds[]}`. Keep only IDs that were actually in the context, map them to `{documentId,title}`, and save both messages.

## Ghost health (recomputed on every read)
```
base 70
+6 per task done in last 7d (max +30); +2 per task done 8–30d ago (max +10); +10 per goal done in last 14d (max +20)
- per open overdue task: 5 + 2*min(daysOverdue,10); total overdue penalty capped at 70
- 10 if no completions in last 14d AND ≥1 open task
health = clamp(round, 0, 100)
mood: ≥80 sretan | 60–79 dobro | 40–59 umoran | 20–39 tuzan | <20 bolestan
xp = 10*doneTasks + 50*doneGoals; level = floor(xp/100)+1; streak = consecutive days ending today/yesterday with ≥1 completion
accessories: none, sesir(1), naocale(2), masna(3), kruna(5); breakdown[] = non-zero terms with HR labels
```
**Ghost.tsx (SVG)**
- Colour presets: lavanda, menta, breskva, nebo, limun.
- Opacity is `0.45 + 0.55*h/100`. Below 40 the body is desaturated.
- The face changes with mood (smile, neutral, droopy, frown, X-eyes with a sweat drop).
- The float animation slows as health drops. Play a bounce + sparkle when health rises after a task PATCH.

## Recommendations
**Rules:** `Rule{key, keywords (normalized HR+EN), intervalMonths, leadDays, title, reasonTpl}`.

| key | keywords | interval (months) | lead (days) |
|---|---|---|---|
| stomatolog | stomatolog, zubar, dental, dentist, zub | 6 | 21 |
| sistematski | sistematski, opca praksa, obiteljski lijecnik, check-up | 12 | 30 |
| ginekolog | ginekolog | 12 | 30 |
| oftalmolog | oftalmolog, ocni, optometr | 24 | 30 |
| registracija | registracija, tehnicki pregled | 12 | 30 |
| servis_auta | servis vozila, mali servis, veliki servis | 12 | 30 |
| osiguranje | polica, osiguranje, kasko | 12 | 30 |

**Engine** (runs on GET /recommendations and GET /dashboard)
1. Gather occurrences: events plus document keyDates. Match each rule's keywords against the normalized `title + description + docType + label`.
2. For each rule, find the latest past occurrence `L`.
   - Skip the rule if there is no past occurrence, or if a future matching event already exists.
3. `due = L + interval`. If `today ≥ due − lead`:
   - `INSERT OR IGNORE` with `dedupe_key = key:L` and `suggestedDate = max(due, today+7)`;
   - reason text in Croatian, e.g. "Zadnji posjet stomatologu bio je {d. MMMM yyyy.}. Preporuka je kontrola svakih 6 mjeseci."
4. **Expiry rule:** for each expiry event in the next 90 days with no matching reminder event or task:
   - key `istek:<eventId>`, title "Obnovi: {title}";
   - `suggested = expiry−30`, or `today+3` if that date has already passed.
5. **Accept** creates an event (`source='recommendation'`) plus a task "Naruči termin: …" due 7 days before. **Dismiss** sets the status.

## Client pages (all strings in Croatian)
**Layout**
- AppShell:
  - md and up: a Sidebar with the logo, the nav and a mini ghost;
  - below md: a top bar plus a fixed BottomNav (Početna, Dokumenti, **Skeniraj** as a raised centre FAB, Zadaci, Kalendar) with a safe-area inset.
- Profil opens from the ghost in the top bar and from the sidebar.
- ChatFab opens `/asistent`.
- Toasts use sonner.

**Pages**
| Route | Page | Contents |
|---|---|---|
| `/` | Početna | ghost card, due tasks, upcoming events, recommendations, recent documents |
| `/dokumenti` | Dokumenti | search, category chips, card grid, processing skeletons |
| `/dokumenti/:id` | Detalji | summary, type, category select, key dates, people, tasks/events, PDF iframe on desktop / "Otvori PDF" button on mobile, delete/reprocess |
| `/skeniraj` | Skeniraj | tabs "PDF datoteka" / "Kamera" |
| `/zadaci` | Zadaci / Ciljevi | tabs; filters Otvoreni/Dovršeni/Kasne; TaskForm dialog; "Iz dokumenta" badge |
| `/kalendar` | Kalendar | custom MonthGrid (Monday first, coloured dots by kind), DayAgenda, EventForm, recommendations (Prihvati/Odbaci) |
| `/asistent` | Asistent | messages, citation chips linking to documents, suggested questions, sticky input |
| `/profil` | Profil | big ghost, health bar, mood, level/xp/streak, breakdown, customisation (name, colour, accessories with locked states) |

**Scan pipeline**
- Input:
  - primary: `<input type=file accept=image/* capture=environment multiple>`;
  - optional: a live `getUserMedia` viewfinder, shown only when `isSecureContext`.
- Canvas processing:
  - downscale so the longest side is at most 2000px;
  - rotate 90°;
  - rectangular crop with corner handles;
  - filters "Original" / "Sivo" (grayscale + auto-levels on the 2–98th percentile) / "Sken" (grayscale + auto-levels + a contrast curve, whitening above about 200);
  - output JPEG at quality 0.85.
- pdf-lib builds A4 pages, fits each image with margins, and outputs `sken-<date>.pdf`, which is uploaded like any other PDF.
- PageEditor: reorder, delete, per-page filter/rotate/crop, and a "Spremi kao PDF" (save as PDF) button.

**Data layer**
- Query keys: `documents`, `document/id`, `tasks`, `goals`, `events/range`, `recommendations`, `profile`, `dashboard`, `chat`.
- A task PATCH invalidates tasks, goals, profile and dashboard.
- The documents query uses `refetchInterval` 2000 while any document is processing, and invalidates everything on the processing → ready transition.

**Capacitor**
- `capacitor.config.ts`: `{appId:'hr.relai.app', appName:'relAI', webDir:'dist'}`. Install core + cli only; do NOT run `cap add ios` on Windows.
- `api.ts` prefixes requests with `VITE_API_BASE ?? ''`.
- The server's CORS allows `capacitor://localhost`, `http://localhost` and `http://localhost:5173`.
- On the Mac build, add `NSCameraUsageDescription` and `NSPhotoLibraryUsageDescription` to Info.plist.

## Implementation checklist
Scripts must work on Windows (no `rm -rf`; use concurrently and `-w`).

1. **Root scaffold**
   - Workspaces + scripts:
     - `dev`: `concurrently -n server,client "npm run dev -w server" "npm run dev -w client"`
     - `build`, `typecheck`, `smoke`
   - `.gitignore` (including `instructions.md`) and `git init`.
   - Acceptance: `git check-ignore server/.env instructions.md` matches both.
2. **Server skeleton**
   - Express 5 + TS strict, `tsx watch`, `env.ts`, `/api/health`, error handler, `server/.env` with the key, `.env.example`.
3. **Gemini ping (blocking gate)**
   - `scripts/gemini-ping.ts` (`npm run gemini:ping -w server`) asks for a one-word JSON response with a schema.
   - On 401: upgrade the SDK, try `GOOGLE_API_KEY`, then STOP and report.
   - On model-not-found: try the fallback models.
4. **DB layer**
   - better-sqlite3 ^13, with node:sqlite as the fallback (note which one was used in the report).
   - Acceptance: `relai.db` is created with all 7 tables.
5. **AI module:** prompts, schemas, extract, chat, retrieval.
6. **Documents API**
   - multer disk storage with UUID names; check MIME type + extension; 15MB limit → 413 with a Croatian message.
   - processDocument, `/categories`.
   - On boot, set documents stuck in `processing` to `error`.
7. **Tasks, goals, events, profile/ghost, dashboard routes**
8. **Recommendations engine + routes**
9. **Chat route**
10. **Client scaffold**
    - Vite react-ts (write the files by hand if the prompts block), Tailwind v4, `@` alias.
    - shadcn init + components: button card input textarea label badge dialog sheet tabs select checkbox progress dropdown-menu skeleton scroll-area separator sonner popover tooltip alert-dialog.
    - Theme: soft violet, rounded-2xl. `<html lang="hr">`.
11. **Layout + Ghost + pages**
    - Order: Dokumenti, Detalji, Zadaci, Kalendar, Profil, Početna, Asistent.
    - Loading, empty and error states. Works at 375px and 1280px.
12. **Scan pipeline**
13. **PWA + Capacitor + demo seed**
    - Icons via `@vite-pwa/assets-generator`.
    - `seed-demo.ts`: a past dentist event 6 months ago, an overdue task, a goal. No fake documents.
14. **Verification**
    - `npm run typecheck` and `npm run build` are clean.
    - Smoke test against the running server:
      - (a) health;
      - (b) build a festival-contract PDF with pdf-lib ("Izvođači: Ivan Horvat, Ana Kovač", "Rok za predaju dokumentacije: today+20");
      - (c) upload and poll until ready (90s);
      - (d) assert the category, the summary, ≥1 task with a dueDate and ≥1 event;
      - (e) chat "Tko je još naveden u ugovoru za festival?" → the answer contains "Ana" and cites the document;
      - (f) mark a task done → health is not lower;
      - (g) delete the document → its tasks/events are gone.
    - Key-leak check: grep `client/dist` for the key prefix and for `GEMINI` → 0 matches. `git status` must not list `.env`, `data` or `instructions.md`.
