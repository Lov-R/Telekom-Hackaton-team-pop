# relAI – SRS (hackathon MVP)

Oct 8, 2026 · @Antea

## 1. Uvod

relAI je mobilna web aplikacija (PWA) koja osobne papire pretvara u rokove, a rokove u igru: AI čita dokumente, sam predlaže obaveze u kalendar, a duh korisnika iz budućnosti raste kako korisnik obaveze stvarno rješava.

Ovaj SRS opisuje MVP za hackathon: 4 osobe, 7 h 22 min razvoja, demo i pitch od 3 minute. Sve što je označeno kao MVP mora stvarno raditi na iPhoneu, s pravim podacima, bez lažnih (mock) funkcija.

**Kako ga koristi Codex:** ovaj dokument sprema se u Git repozitorij kao `docs/SRS.md`. Kratka pravila iz sekcije 9 i 10 nalaze se i u `AGENTS.md` u korijenu repozitorija, koji Codex sam čita prije svakog zadatka. U promptovima se referencira po sekciji, npr. *"Implement docs/SRS.md section 5.2 only."*

**Tehnologija (fiksno):** Codex (CLI ili IDE ekstenzija, lokalno kod vozača) piše kod u Git repozitoriju na GitHubu. Backend je jedan Supabase projekt (auth, storage, baza, edge funkcije, `pg_cron` za jobove) kojim se upravlja Supabase CLI-jem. Frontend je statična Vite aplikacija objavljena na Vercelu (HTTPS link za iPhone). AI je Gemini API, pozivan isključivo iz edge funkcija, ključ u Supabase Secrets.

## 2. Problem, korisnici i core value

**Problem.** Ljudi imaju previše papira na previše tema (nalazi, računi, ugovori, registracija, boravište, škola) i odgađaju obaveze koje iz njih proizlaze. Rok za kontrolu ili registraciju stoji na papiru u ladici i zaboravi se.

**Korisnici:**

- **Primarni:** odrasli 20–40 godina koji sami vode svoju papirologiju i skloni su prokrastinaciji.
- **Roditelji:** vode i dokumente i obaveze svoje djece (roadmap, R2).
- **Stariji korisnici:** jednostavni način bez igre (roadmap, R3).

**Core value (jedna stvar koja mora raditi savršeno):** korisnik slika dokument, aplikacija sama pronađe obavezu koja iz njega proizlazi (npr. "Kontrola za 6 mjeseci"), izračuna datum i automatski upiše podsjetnik u kalendar, a korisnik ga može poništiti ili urediti.

**Diferencijator:** papir postaje rok, rok postaje igra. Duh korisnika iz budućnosti raste kad obaveze rješava na vrijeme, a sarkastično ga podbada kad ih odgađa.

## 3. Opseg

MVP je 13 funkcija za jednog korisnika koje moraju raditi na demu. Redoslijed u tablici je ujedno redoslijed izgradnje; sve ispod MVP-a gradi se tek kad je MVP testiran na iPhoneu.

| ID | Funkcija | Prioritet |
| --- | --- | --- |
| F1 | Prijava (email i lozinka), onboarding: odabir tona i izgleda avatara | MVP |
| F3 | Upload dokumenta: kamera ili datoteka (JPG, PNG, PDF) | MVP |
| F4 | AI čitanje dokumenta: kategorija, datumi, ključni podaci, follow-up | MVP |
| F5 | Ekran Dokumenti: mape po kategoriji, pregled dokumenta | MVP |
| F6 | Agent sam dodaje taskove (iz dokumenta i iz chata) uz obavijest s Poništi i Uredi | MVP |
| F7 | Kalendar unutar aplikacije | MVP |
| F8 | Asistent (chatbot u glasu lika): dodaje taskove, odgovara iz dokumenata | MVP |
| F9 | Taskovi s razinama 1–5, HP knjiga, prisutnost, niz | MVP |
| F10 | Avatar duha: 5 faza, aura, trag, blijeđenje po prisutnosti | MVP |
| F11 | Mapa s 10 polja kao početni ekran; na 100 HP otključava se nova mapa | MVP |
| F12 | Dokaz o izvršenju s AI provjerom | MVP |
| F13 | Notifikacije unutar aplikacije (job + predlošci, max 3 dnevno) | MVP |
| F17 | Prave push notifikacije (Web Push, aplikacija na početnom zaslonu) | MVP, odluka nakon testa u 1:30 |
| F14 | Izvoz taska u iPhone kalendar (.ics s alarmom) | Rezerva ako F17 ne prođe |
| F16 | Prijatelji lite: povezivanje kodom, avatari prijatelja na mapi | Prvi prioritet nakon MVP-a |
| R1 | Grupni način: zajednički boss i galerija trofeja | Roadmap (pitch: "Uskoro") |
| R2 | Djeca: dokumenti i obaveze djece | Roadmap, nakon testiranja |
| R3 | Jednostavni način za starije korisnike | Roadmap |
| R4 | Obiteljsko povezivanje (npr. kći prati mamine kontrole) | Roadmap |
| R5 | Integracije: Google Calendar, pretplata na kalendar (webcal), email, e-Građani, m-banking | Roadmap |
| R6 | Dokumenti s više stranica (više fotografija u jedan PDF) | Roadmap |

**R1, galerija trofeja:** prijatelji vide automatski trofej (razina, datum, "potvrđeno"), ne originalni dokaz. Korisnik može dodati posebnu fotografiju samo za prijatelje (npr. selfie ispred tehničkog). Original se dijeli samo uz izričit odabir i upozorenje, a za zdravstvo i osobne dokumente nikad. Uz trofeje reakcije, komentari i brisanje u svakom trenutku.

**Izvan opsega danas:** grafovi troškova, praćenje cijena proizvoda, email integracija, AI razbijanje taska na korake, Monster avatar, više korisnika osim F16.

## 4. Glavni tokovi korisnika

**Tok A: od prvog otvaranja do prve vrijednosti (demo tok)**

1. Korisnik otvori relAI s početnog zaslona iPhonea i registrira se emailom i lozinkom.
2. Onboarding: odabere ton (Blago, Sarkastično, Brutalno), složi izgled duha i stisne "Uključi obavijesti od duha".
3. Završi na Mapi: duh je na prvom polju Močvare Odgađanja, u fazi Sjena, poluproziran i lagano lebdi.
4. Na ekranu Dokumenti stisne "Slikaj dokument" i slika nalaz ginekologa.
5. Aplikacija prikaže "Čitam dokument...", a za par sekundi dokument je u mapi Zdravstvo.
6. Agent sam doda task i prikaže obavijest: *"Dodano: Kontrola kod ginekologa. Iz nalaza od 15.7.2026.: 'Kontrola za 6 mjeseci'. Podsjetnik 15.10.2026., kontrola do 15.1.2027."* s gumbima **Poništi** i **Uredi**.
7. Task je u Kalendaru i kao oznaka na polju ispred duha. Korisnik dobije +1 HP za dokument.

**Tok B: dodavanje obaveze kroz asistenta**

1. Korisnik u Asistentu napiše: *"Stavi mi sastanak s Markom u četvrtak u 10."*
2. Asistent odgovori u glasu lika, odmah doda događaj i prikaže obavijest s Poništi i Uredi.
3. Događaj je u Kalendaru i na Mapi.

**Tok C: rješavanje taska s dokazom**

1. Korisnik otvori task "Platiti struju" i stisne "Riješeno".
2. Priloži dokaz: screenshot uplate iz m-bankinga.
3. AI provjeri dokaz i prikaže razlog: *"Potvrda uplate HEP-u, 54,20 €, 8.10.2026."*
4. Kod izračuna HP (vidi 6.2), duh vidljivo klizi na novo polje i dobije prisutnost; na 100 HP otključava se nova mapa i duh evoluira.
5. Ako je dokaz novi dokument (npr. novi nalaz), sprema se u Dokumente i pokreće Tok A od koraka 5.

**Tok D: push notifikacija**

1. Job ili gumb "Pošalji test obavijest" generira poruku iz banke predložaka.
2. Na zaključanom iPhoneu stigne: *"Rok je bio jučer. Ne ljutim se. Samo sam proziran od razočaranja."*
3. Klik na notifikaciju otvara relAI na tom tasku.

## 5. Funkcionalni zahtjevi

Aplikacija ima 5 ekrana u donjoj traci: **Mapa** (Home), **Dokumenti**, **Asistent**, **Kalendar**, **Profil**. Svaki podekran ima vlastiti gumb Natrag, jer instalirana PWA nema Safarijevu traku.

### 5.1 Prijava i onboarding (F1, F2)

- Prijava emailom i lozinkom. Jedna uloga: korisnik. Nema admina. Svaki korisnik vidi samo svoje podatke.
- Onboarding u 3 koraka: ton (Blago, Sarkastično, Brutalno), izgled avatara (vidi 6.5), gumb "Uključi obavijesti od duha" (F17; dozvola se traži tek na klik).
- Profil: promjena jezika (HR/EN), tona i izgleda, gumb "Pošalji test obavijest", kod za prijatelje (F16).

### 5.2 Dokumenti (F3, F4, F5)

- Dva gumba: "Slikaj dokument" (`accept="image/*"`, `capture="environment"`) i "Uploadaj datoteku" (`accept="image/*,application/pdf"`).
- Pri slikanju kratki savjet: *"Položi dokument na stol i slikaj odozgo, cijeli u kadru."*
- Slike se u pregledniku smanjuju na najviše 2048 px po dužoj strani i pretvaraju u JPEG (i iPhone HEIC). Slike se ne pretvaraju u PDF: AI čita sliku izravno. PDF (npr. e-račun) uploada se kakav jest, najviše 10 MB.
- Hash datoteke (SHA-256) računa se prije uploada; isti hash ne može se uploadati dvaput.
- Datoteka ide u privatni bucket `documents`, putanja `{user_id}/{document_id}`.
- Nakon uploada poziva se `extract-document` (vidi 9.2). Za vrijeme čitanja prikazuje se "Čitam dokument...".
- Kategorije: `zdravstvo`, `racuni`, `ugovori`, `vozilo`, `osobni_dokumenti`, `skola_vrtic`, `karte_dogadaji`, `bonovi`, `ostalo`.
- Ekran Dokumenti: mape po kategoriji, pregled dokumenta unutar aplikacije s gumbom Zatvori, prikaz izvučenih podataka.

### 5.3 Automatsko dodavanje taskova (F6)

- Agent sam sprema task čim ga pronađe u dokumentu ili dobije u chatu. Nema koraka potvrde.
- Odmah se prikazuje obavijest (toast oko 8 s i zapis u zvoncu): naslov, datum podsjetnika, rok, razina, izvor i citat iz dokumenta (`source_text`).
- **Poništi** briše task; **Uredi** otvara task za promjenu naslova, datuma ili razine.
- Ista komponenta obavijesti koristi se za dokumente, chat i dokaze. Taskove upisuju samo edge funkcije.

### 5.4 Pravila računanja datuma (u kodu, nikad AI)

- Vremenska zona uvijek `Europe/Zagreb`.
- Ako dokument ima interval (npr. 6 mjeseci): `due_date = document_date + interval`; `remind_at = document_date + interval / 2` (za 6 mjeseci podsjetnik nakon 3 mjeseca, za 12 nakon 6).
- Ako dokument ima točan datum isteka ("vrijedi do"): `due_date` = taj datum; `remind_at = due_date − 30 dana`.
- "Po potrebi" ili bez jasnog intervala: nema prijedloga taska.

### 5.5 Kalendar (F7, F14)

- Kalendar je isključivo unutar aplikacije: mjesečni prikaz s točkama na danima i popis za odabrani dan, taskovi vrste `event` (sastanak) i `deadline` (rok).
- Nema ručnog dodavanja u kalendaru. Taskovi i događaji, i ponavljajući (npr. rođendan, godišnje), dodaju se samo automatski: iz dokumenata (5.2, 5.3) i preko asistenta (5.6, npr. "Stavi mi Anin rođendan 3.5. svake godine").
- Web aplikacija ne može čitati ni pisati u iPhone kalendar; to nije ni potrebno.
- **Rezerva (F14), samo ako push ne prođe:** gumb "Dodaj u iPhone kalendar" generira `.ics` s `VALARM` alarmom 1 dan prije, a naslov događaja nosi rečenicu iz banke predložaka. Jednosmjerno, ne treba Apple developer račun.

### 5.6 Asistent (F8)

- Chat u glasu duha iz budućnosti, prema tonu korisnika.
- Može: dodati task ili događaj, označiti task riješenim (traži dokaz), pretražiti dokumente, odgovoriti iz izvučenih podataka (npr. OIB, zadnji pregled, kad ističe registracija), savjetovati kada zakazati obavezu prema slobodnim danima u kalendaru.
- Može primiti sliku u chatu kao dokaz (vidi 6.6).
- Detalji u 9.3.

## 6. Sustav igre

Napredak se mjeri HP-om: riješeni taskovi pune HP trenutne mape, a na 100 HP otključava se nova mapa. Neriješene obaveze ne brišu napredak, nego duh blijedi. Sve računa kod iz fiksnih tablica; AI samo predlaže razinu taska, koju korisnik može promijeniti preko Uredi.

### 6.1 Razine taskova

| Razina | Naziv | Primjeri | Bazni HP | Propušten rok (prisutnost) |
| --- | --- | --- | --- | --- |
| 1 | Sitnica | kava, poziv, rođendan | 2 | −5 % |
| 2 | Obaveza | sastanak, roditeljski, frizer | 5 | −10 % |
| 3 | Papirologija | režije, račun mehaničaru | 10 | −15 % |
| 4 | Velika obaveza | registracija, liječnički pregled, tehnički | 20 | −25 % |
| 5 | Epska obaveza | boravište, osobni dokumenti, porezna, ugovor | 30 | −35 % |

### 6.2 Formula HP-a

```latex
HP = \text{bazni} \times \text{vrijeme} \times \text{dokaz} \times (1 + \text{niz})
```

- **vrijeme:** riješeno 3 ili više dana prije roka ×1,2; do roka ×1,0; nakon roka ×0,5.
- **dokaz:** potvrđen dokaz ×1,0; bez dokaza ×0,3, najviše 3 taska bez dokaza dnevno (četvrti daje 0 HP).
- **niz:** +0,05 za svaki uzastopni dan s barem jednim riješenim taskom, najviše +0,5.
- **ostalo:** novi dokument +1 HP (najviše 5 dnevno, duplikati 0); pobijeđen boss dodatnih +10 HP.
- Rezultat se zaokružuje na cijeli broj (najmanje 1 ako je veći od 0) i upisuje u `hp_ledger` s razlogom.

Primjer: registracija riješena 5 dana ranije, s dokazom, niz 4 dana: 20 × 1,2 × 1,0 × 1,2 = 28,8, dakle 29 HP. Mapa se otključava nakon otprilike 5–10 riješenih obaveza.

### 6.3 Mape i polja (početni ekran)

- Početni ekran je trenutna mapa s **10 polja**; svako polje vrijedi 10 HP. Duh stoji na polju `floor(HP / 10) + 1`.
- **Duh se stalno vidljivo kreće:** na svom polju lebdi i lagano se njiše (idle animacija), a kad dobije HP, vidljivo klizi preko polja do novog.
- Nadolazeći taskovi prikazani su kao oznake na poljima ispred duha. Na zadnjem polju stoji **boss**: korisnikov najbliži otvoreni task razine 4 ili 5 (npr. "Boss: Registracija"). Ne blokira napredak; donosi +10 HP.
- **Na 100 HP:** animacija otključavanja, nova mapa, HP kreće od 0 (višak se prenosi), duh prelazi u sljedeću fazu.
- Redoslijed mapa i faza duha:

| Mapa | Naziv | Faza duha |
| --- | --- | --- |
| 1 | Močvara Odgađanja | Sjena: blijed, pognut |
| 2 | Šuma Papira | Iskra: slaba aura |
| 3 | Grad Obaveza | Srebrni trag: aura i srebrni trag |
| 4 | Planina Discipline | Sjaj: jaka aura, uspravan |
| 5 | Vrh Mirne Glave | Legenda: zlatna aura i trag |

Nakon pete mape korisnik ostaje na Vrhu, a svakih 100 HP dodaje mu zvjezdicu (Vrh ×2, ×3...).

### 6.4 Prisutnost (blijeđenje duha)

- Zaseban mjerač 0–100 %, početno 60 %. Prikazuje se kao vidljivost duha, ne kao broj.
- **Pada:** propušten rok (kazna iz 6.1, jednom po tasku); svaki dan bez ijednog riješenog taska −5 %.
- **Raste:** svaki riješen task +10 % (najviše 100 %).
- Vidljivost duha: `opacity = 0,25 + 0,75 × prisutnost`. Ispod 30 % duh treperi, a lik šalje poruku (vidi 7.2).
- Prisutnost nikad ne smanjuje HP niti zaključava već otključane mape: korisnik ne gubi napredak, samo vidi da "nestaje".

### 6.5 Avatar

Dizajner isporučuje **jedan SVG** duha s imenovanim slojevima: `body`, `eyes`, `hair_short`, `hair_long_down`, `hair_long_tied`, `beard`, `calendar` (maskota drži stolni kalendar). Kod mijenja:

| Svojstvo | Opcije | Tehnika |
| --- | --- | --- |
| Spol (za ponudu opcija) | muško, žensko | određuje dostupne frizure i bradu |
| Boja očiju | 5 boja | `fill` sloja `eyes` |
| Kosa | boja (6), frizura: kratka; za žensko puštena ili vezana | `fill` + vidljivost sloja |
| Brada | da, ne (muško) | vidljivost sloja `beard` |
| Visina | niži, srednji, viši | `scaleY` 0,92 / 1 / 1,08 |
| Građa | vitka, srednja, jača | `scaleX` 0,92 / 1 / 1,1 |

Aura, srebrni ili zlatni trag i prozirnost rade se CSS-om (glow, blur, animirane čestice) prema fazi i prisutnosti, bez dodatnih crteža. Izgled se sprema kao JSON u `profiles.avatar_config`.

### 6.6 Dokaz o izvršenju (F12)

- Korisnik može priložiti sliku, screenshot ili PDF na kartici taska ili u Asistentu.
- `verify-proof` (vidi 9.4) vraća `matches`, `confidence`, `proof_date`, `reason`. Korisnik vidi `reason`.
- Kod prihvaća dokaz samo ako vrijedi sve: `matches = true` i `confidence ≥ 0,7`; `proof_date` nije prije datuma nastanka taska; hash datoteke nije ranije korišten; task je stariji od 5 minuta.
- Odbijen dokaz: task ostaje otvoren, korisnik može pokušati ponovno ili riješiti bez dokaza (×0,3).
- Ako je dokaz novi dokument (npr. novi nalaz), sprema se u Dokumente i pokreće čitanje, što može predložiti sljedeći task.

## 7. Notifikacije i glas lika

Notifikacije šalje sama aplikacija iz banke predložaka, najviše 3 dnevno, nikad između 21:00 i 9:00. Gemini ne piše notifikacije u stvarnom vremenu; jednom unaprijed generira varijante koje tim pregleda i doda u banku.

### 7.1 Glas lika

Duh je korisnik iz budućnosti: sarkastičan, guilt-trippa, ali je na korisnikovoj strani. Isti glas koristi i Asistent.

**Granice (obavezne):** sarkazam ide na račun ponašanja (odgađanje, scrollanje, izgovori). Nikad na račun izgleda, tijela, zdravlja, dijagnoza ni novčanih problema.

### 7.2 Banka predložaka (početni set)

| Okidač | Sarkastično / Brutalno |
| --- | --- |
| Račun čeka plaćanje | *"Tvoj račun za {naziv} i ja imamo nešto zajedničko: oboje čekamo."* |
| Rok prošao | *"Rok je bio jučer. Ne ljutim se. Samo sam proziran od razočaranja."* |
| Dokument istekao ili ističe | *"Ne pišem ti zato što mi je stalo. Pišem jer je {dokument} istekla."* |
| 0 taskova do 20:00 | *"Bravo, riješio si 0 taskova danas. Tvoja dosljednost je impresivna."* |
| Večernja šala, 0 taskova | *"Opet si otvorio Instagram, a ne mene. Zanimljivo."* |
| Večernja šala, 0 taskova | *"TikTok ti je danas dobio više pažnje od {task}. Samo konstatiram."* |
| Događaj danas | *"{događaj} u {vrijeme}. Barem jedna obaveza koju stvarno voliš."* |

Poruke o Instagramu i TikToku su **šala**: aplikacija ne prati druge aplikacije. Šalju se samo kao večernja poruka kad taj dan nije riješen nijedan task. Svaki predložak postoji na hrvatskom i engleskom, a bira se prema profiles.language. Blagi ton ima vlastitu verziju svakog predloška (npr. *"Račun za {naziv} još čeka. Želiš li da ga dodam za sutra?"*).

### 7.3 Okidači i job

Job `generate-notifications` pokreće se svakih sat vremena i za svakog korisnika:

1. Provjerava okidače: podsjetnik danas (`remind_at`), rok za 3 dana, rok sutra, rok prošao (i smanjuje prisutnost jednom po tasku; jednom dnevno i −5 % za dan bez riješenog taska), dokument ističe za 30 dana, događaj danas, 0 taskova do 20:00.
2. Bira predložak prema okidaču i tonu, popunjava varijable.
3. Poštuje tihe sate (21:00–9:00) i limit 3 dnevno; prioritet: rok prošao, rok sutra, ostalo.
4. Upisuje u `notifications`.

### 7.4 Dostava

| Kanal | Prioritet | Opis |
| --- | --- | --- |
| Unutar aplikacije | MVP | Zvonce s brojem nepročitanih, popis, toast kad stigne nova (realtime) dok je app otvoren. Tablica `notifications` je izvor za sve kanale |
| Web Push (F17) | MVP, odluka nakon testa u 1:30 | Prava notifikacija od relAI-ja na zaključan ekran. Uvjeti: iOS 16.4+, aplikacija dodana na početni zaslon (u Safari kartici ne radi), dozvola se traži tek nakon klika. Ne treba Apple developer račun: standardni Web Push s VAPID ključevima (javni u frontendu, privatni u Secrets) |
| iPhone kalendar, .ics (F14) | Rezerva ako push ne prođe | Alarm iz iPhone Kalendara na zaključanom ekranu; šalje ga Appleov kalendar, ne relAI |

**Arhitektura pusha:**

- `public/sw.js` obrađuje samo `push` (prikaz) i `notificationclick` (otvara relAI na tasku). **Bez ikakvog cachea**, inače iPhone prikazuje staru verziju aplikacije.
- Pretplate u tablici `push_subscriptions`; edge funkcija `send-push` šalje svim pretplatama korisnika i briše one koje vrate 404 ili 410.
- Job `generate-notifications` prvo upisuje u `notifications`, zatim šalje push istom logikom kao `send-push` (`_shared/push.ts`).
- Push se testira samo na objavljenom (Vercel) linku s aplikacijom na početnom zaslonu, ne na localhostu ni u Safari kartici. Za test i demo služi gumb "Pošalji test obavijest" u Profilu.

## 8. Podaci i model baze

Svi podaci pripadaju korisniku koji ih je unio; nema dijeljenih podataka osim javnog profila za prijatelje (F16). Cijela shema kreira se **u jednom promptu na početku** i poslije se ne mijenja bez izričitog zahtjeva.

### 8.1 Tablice

| Tablica | Stupci |
| --- | --- |
| `profiles` | `id` (= auth user id), `display_name`, `tone` (blago, sarkasticno, brutalno), language (hr, en; zadano hr), `avatar_config` jsonb, `hp` int 0–99 (napredak na mapi), `map_index` int default 1, `presence` int default 60, `streak_days` int, `last_completed_date` date, `friend_code` unique, `created_at` |
| `documents` | `id`, `user_id`, `storage_path`, `file_hash` (unique po korisniku), `mime_type`, `category`, `title`, `document_date`, `expiry_date`, `extracted` jsonb, `is_proof` bool, `created_at` |
| `tasks` | `id`, `user_id`, `document_id`, `kind` (event, deadline), `title`, `tier` 1–5, `source` (document, chat), `start_at`, `remind_at`, `due_date`, `recurrence` (none, monthly, yearly), `status` (open, done, missed), `completed_at`, `proof_document_id`, `proof_reason`, `penalty_applied` bool, `created_at` |
| `hp_ledger` | `id`, `user_id`, `task_id`, `document_id`, `amount` int, `reason`, `created_at` |
| `notifications` | `id`, `user_id`, `task_id`, `template_key`, `text`, `created_at`, `read_at`, `pushed_at` |
| `push_subscriptions` | `id`, `user_id`, `endpoint`, `p256dh`, `auth`, `created_at` |
| `chat_messages` | `id`, `user_id`, `role` (user, assistant), `content`, `created_at` |
| `friendships` (F16) | `user_id`, `friend_id`, `created_at` |

Svi datumi su `timestamptz`, a prikazuju se u `Europe/Zagreb`. Ukupni HP = `SUM(hp_ledger.amount)`, a trenutni HP i mapu u profilu ažurira samo complete-task.

### 8.2 Datoteke

- Privatni bucket `documents`, putanja `{user_id}/{document_id}.{ext}`. Vrste: JPG, PNG, PDF (iPhone HEIC se pretvara u JPEG prije uploada).
- Veličina: slike nakon smanjivanja oko 200–600 KB, PDF najviše 10 MB.
- Prikaz isključivo preko kratkotrajnih potpisanih URL-ova.

### 8.3 Sigurnost podataka (RLS)

- Na svakoj tablici RLS uključen: korisnik čita i piše samo retke gdje je `user_id = auth.uid()` (za `profiles`: `id = auth.uid()`).
- **Klijent nikad ne piše** u `hp_ledger`, `profiles.hp`, `profiles.streak_days`, profiles.presence, profiles.map\_index ni `tasks.status = done`. To rade isključivo edge funkcije (`complete-task`, `verify-proof`, job). Inače korisnik može sam sebi dodati HP.
- Prijatelji (F16): RLS je po retcima, ne po stupcima, pa se javni profil dohvaća samo preko funkcije `get_friend_profiles()` koja vraća isključivo `display_name`, `avatar_config`, mapu, polje, fazu i `streak_days`. Nikad dokumente, taskove, kalendar ni podatke djece.
- Test s dva računa obavezan nakon kreiranja sheme i nakon F12 (vidi 12).

## 9. AI zahtjevi

AI čita i predlaže; kod računa, provjerava i sprema. Gemini (najnoviji Flash model dostupan u Google AI Studiju, zbog brzine) poziva se samo iz edge funkcija s ključem `GEMINI_API_KEY` iz Secrets. Rezervna opcija: drugi Gemini Flash model (konstanta u `_shared/config.ts`) ako glavni model vrati grešku limita ili nedostupnosti.

### 9.1 Pet pravila (vrijede za svaku AI funkciju)

1. **Samo JSON.** Svaki poziv koristi Geminijev strukturirani izlaz (`responseMimeType: application/json` + `responseSchema`) ili function calling. Edge funkcija validira odgovor (zod); kod neispravnog odgovora jedan ponovni pokušaj, zatim jasna poruka korisniku.
2. **Datum u svakom promptu.** System prompt uvijek sadrži današnji datum, dan u tjednu, trenutno vrijeme i vremensku zonu `Europe/Zagreb`. Bez toga "u četvrtak" i "sutra" postaju pogrešni datumi.
3. **Datume i HP računa kod**, nikad AI (vidi 5.4 i 6.2). AI vraća interval ili datum s dokumenta, ne izračunate rokove.
4. **Sažetak, ne datoteke.** Asistent ne dobiva datoteke, nego sažetak iz baze (vidi 9.3). Brže, jeftinije i bez slanja istih datoteka iznova.
5. **Ništa ne izmišljati.** Osobni podaci (OIB, datumi, zadnji pregled) samo iz korisnikovih dokumenata; ako podatka nema, AI to kaže. Bez medicinskih i pravnih savjeta osim podsjetnika i općih organizacijskih savjeta.

### 9.2 `extract-document`

Ulaz: datoteka (slika ili PDF). Izlaz:

```json
{
  "category": "zdravstvo",
  "title": "Ginekološki nalaz",
  "document_date": "2026-07-15",
  "expiry_date": null,
  "key_fields": [{"label": "OIB", "value": "..."}, {"label": "Iznos", "value": "54,20 €"}],
  "follow_up": {
    "found": true,
    "interval_months": 6,
    "exact_date": null,
    "source_text": "Kontrola za 6 mjeseci"
  },
  "suggested_tier": 4,
  "confidence": 0.9
}
```

Uputa u promptu: title i labele u key\_fields na jeziku korisnika (profiles.language), source\_text uvijek doslovno iz dokumenta; tražiti follow-up, kontrolu, obnovu ili istek ("kontrola za", "ponovni pregled", "vrijedi do", "plaćanje do", "rok plaćanja", "datum dospijeća", "dospijeće", "valuta plaćanja", "istječe"; na hrvatskim računima "valuta" često znači datum dospijeća, ne novac; datum "15.07.2026." vraća se kao 2026-07-15), uvijek citirati rečenicu u `source_text`; "po potrebi" ili nejasno znači `found: false`. Kod zatim računa datume (5.4), sprema task i prikazuje obavijest s Poništi i Uredi (5.3).

### 9.3 `assistant-chat`

Kontekst koji edge funkcija šalje uz svaku poruku: datum i vrijeme (pravilo 2), ton i način korisnika, popis osoba, sažetak dokumenata (naslov, kategorija, osoba, datumi, `key_fields`, najviše 50 najnovijih), otvoreni taskovi za sljedećih 60 dana, zadnjih 10 poruka iz `chat_messages`.

Alati (function calling):

| Alat | Parametri | Što se događa |
| --- | --- | --- |
| `create_task` | `title`, `kind`, `tier`, `date`, `time`, `due_date`, `recurrence` | Kod normalizira datum, sprema task i vraća obavijest s Poništi i Uredi |
| `propose_complete_task` | `task_id` | Prikazuje task s gumbom za dokaz |
| `search_documents` | `query`, `category` | Kod pretražuje bazu i vraća rezultate modelu |

Izlaz edge funkcije prema klijentu: `{ reply, created_tasks[] }`. Odgovor je u glasu lika (7.1), kratak, na jeziku korisnika (profiles.language).

### 9.4 `verify-proof`

Ulaz: task (`title`, `kind`, `tier`, `created_at`, `due_date`) i datoteka. Izlaz: `{ matches, confidence, proof_date, reason, is_new_document }`. Pravila prihvaćanja su u 6.6 i provode se u kodu.

### 9.5 Edge funkcije bez AI-ja

- `complete-task`: jedino mjesto koje mijenja `status`, upisuje `hp_ledger`, HP, prisutnost, mapu i niz (6.2–6.4).
- `generate-notifications`: job svakih sat vremena (7.3); pokreće ga `pg_cron` preko `pg_net`, a funkcija prihvaća samo poziv s tajnim ključem `CRON_SECRET`.
- `export-ics`: generira `.ics` za task (5.5), samo kao rezerva (F14).

* `send-push`: šalje Web Push svim pretplatama korisnika (vidi 7.4).

## 10. Nefunkcionalni zahtjevi

| Područje | Zahtjev |
| --- | --- |
| Platforma | Mobile-first PWA: manifest (`display: standalone`, ime relAI, ikona, `apple-touch-icon`), poštuje safe area iPhonea; testira se kao aplikacija dodana na početni zaslon |
| Jezik | Sučelje i AI odgovori na hrvatskom (zadano) ili engleskom, prema profiles.language. Prekidač HR/EN je na ekranu prijave i u Profilu. Svi tekstovi sučelja su u jednom rječniku po jeziku (nema tvrdo upisanih tekstova u komponentama); datumi i brojevi formatiraju se prema jeziku. Kod, tablice i stupci na engleskom |
| Brzina | Čitanje dokumenta do \~10 s s prikazom stanja; odgovor asistenta do \~8 s; kod greške poruka i gumb Pokušaj ponovno |
| Ključevi | API ključevi samo u Secrets i edge funkcijama, nikad u frontend kodu |
| Privatnost | Dokumenti privatni (RLS + privatni bucket); prijatelji vide samo javni profil |
| Demo podaci | Isključivo lažni dokumenti; nikad stvarni medicinski, policijski ili dječji dokumenti |
| Navigacija | Donja traka s 5 ekrana, gumb Natrag na svakom podekranu, pregled datoteka unutar aplikacije |
| Pouzdanost | Svaka AI funkcija ima stanje učitavanja, grešku i ponovni pokušaj; neuspjeh AI-ja nikad ne ruši ekran |

## 11. Dizajn i brand

relAI izgleda čisto i mirno kao Appleove aplikacije, a igra i lik donose živost. Tamna tema je zadana.

| Element | Odluka |
| --- | --- |
| Boje | tamno siva (podloga, npr. `#1C1C1E`), magenta (akcija i HP, npr. `#E0218A`), srebrna (aura, trag, sekundarni tekst, npr. `#C7C7CC`); zlatna samo za fazu Legenda. Točne vrijednosti potvrđuje dizajner |
| Font | sistemski Apple font (`-apple-system, SF Pro`), zaobljeni kutovi, mekane sjene, puno zraka |
| Maskota | duh koji drži stolni kalendar; ne smije podsjećati na Snapchatov duh (drugačiji obris, bez žute boje) |
| Kartice | stil Apple Walleta i Zdravlja: jedna informacija po kartici, jasan glavni gumb |
| Mapa | 10 polja kao na Duolingovom putu, duh se stalno kreće; 5 mapa s vlastitom atmosferom (od magle u Močvari do svjetla na Vrhu) |
| Reference | Duolingo (put i ton notifikacija), Apple Wallet i Zdravlje (čistoća), Finch (lik koji raste brigom o sebi) |

**Isporuke dizajnera:** SVG duha sa slojevima (6.5), 5 pozadina mapa s po 10 polja, ikona aplikacije, mockup "Uskoro: grupni način" za pitch.

## 12. Kriteriji prihvaćanja i testovi

Funkcija je gotova tek kad njezini testovi prolaze na pravom iPhoneu, u verziji dodanoj na početni zaslon. Osoba za podatke vodi ovaj popis i prolazi ga nakon svakog bloka.

**Dokumenti i datumi**

- [ ] Nalaz s "Kontrola za 6 mjeseci" od 15.7.2026. predlaže podsjetnik 15.10.2026. i rok 15.1.2027.
- [ ] Tehnički s "vrijedi do" predlaže rok na taj datum i podsjetnik 30 dana prije.
- [ ] Nalaz s "kontrola po potrebi" ne predlaže task.
- [ ] Mutna fotografija ili dokument bez datuma: jasna poruka, aplikacija ne puca.
- [ ] Isti dokument uploadan dvaput se odbija.
- [ ] Račun s "Valuta plaćanja: 20.10.2026." daje rok 20.10.2026., a ne iznos.

**Asistent**

- [ ] "Sastanak s Markom u četvrtak u 10" predlaže točan nadolazeći četvrtak u 10:00 po zagrebačkom vremenu.
- [ ] "Koji mi je OIB?" odgovara iz dokumenta; bez dokumenta kaže da podatak nema.
- [ ] Prebacivanje na engleski mijenja cijelo sučelje, odgovore asistenta, obavijesti i format datuma; novi korisnik ima hrvatski kao zadani jezik.
- [ ] Svaki automatski dodan task može se poništiti jednim klikom, a obavijest prikazuje citat iz dokumenta.

**Igra i dokazi**

- [ ] Task razine 4 riješen 5 dana ranije s dokazom i nizom 4 daje 29 HP.
- [ ] Stara potvrda (datum prije nastanka taska) se odbija.
- [ ] Isti dokaz poslan dvaput se odbija.
- [ ] Četvrti task bez dokaza u danu daje 0 HP.
- [ ] Propušten rok jednom smanjuje prisutnost i duh postaje prozirniji, a HP ostaje isti.
- [ ] Dobiveni HP vidljivo pomiče duha na novo polje; na 100 HP otključava se nova mapa i mijenja se aura.

**Sigurnost**

- [ ] Prijavljen kao korisnik A ne vidi dokumente, taskove ni datoteke korisnika B (provjera i preko direktnog URL-a datoteke).
- [ ] Klijent ne može sam upisati u `hp_ledger` ni promijeniti `hp`.
- [ ] U frontend kodu nema API ključa.

**Notifikacije i kalendar**

- [ ] Ne stiže više od 3 notifikacije dnevno ni između 21:00 i 9:00.
- [ ] Test obavijest stiže na zaključan iPhone (aplikacija na početnom zaslonu) i klik otvara relAI na tasku.
- [ ] `.ics` se otvara na iPhoneu i dodaje događaj s alarmom (samo ako se koristi rezerva F14).

## 13. Redoslijed izgradnje u Codexu

Jedan prompt = jedan korak = jedan Git commit (`step N: naziv`); sljedeći korak tek kad testovi prethodnog prolaze. Ako popravak ne uspije iz drugog pokušaja, vraća se zadnji ispravan commit i prompt se preformulira u novoj Codex sesiji. Migracije i deploy edge funkcija pokreću se tek uz odobrenje tima.

Raspored za preostalih 6 sati:

1. **Postavljanje (0:00–0:15):** repozitorij s `AGENTS.md` i `docs/*.md`, Supabase projekt povezan CLI-jem i ključ u Secrets, skelet aplikacije, test Gemini ključa u edge funkciji, prva objava na Vercelu.
2. **Temelj (0:15–1:00):** dizajn sustav (11), PWA manifest i ikone (10), prijava i onboarding (5.1), 5 ekrana, cijela shema s RLS-om (8). Test s dva računa.
3. **Push test, paralelno (0:15–1:30):** Programer 2 u zasebnom testnom projektu (grana `push-test` u zasebnoj mapi, vlastiti Supabase i Vercel projekt): gumb, pretplata, test obavijest na zaključan iPhone. **Odluka u 1:30:** radi, F17 ide u MVP; ne radi, koristi se F14.
4. **Dokumenti (1:00–1:50):** upload i kamera (5.2), `extract-document` (9.2).
5. **Kalendar (1:50–2:30):** automatsko dodavanje s Poništi i Uredi (5.3), pravila datuma (5.4), kalendar (5.5).
6. **Asistent (2:30–3:20):** `assistant-chat` s alatima (9.3).
7. **Igra (3:20–4:10):** `complete-task`, HP knjiga, prisutnost, niz, avatar, mapa s poljima (6.1–6.5).
8. **Dokazi i notifikacije (4:10–4:50):** `verify-proof` (6.6, 9.4), job i predlošci (7) s `pg_cron` rasporedom, `send-push` (preuzet iz grane `push-test`) ili `.ics`.
9. **Rezerva (4:50–5:10):** zaostaci; ako je sve zeleno, F16.
10. **Stop (5:10–6:00):** bez novih funkcija. Cijeli popis iz sekcije 12 na iPhoneima, popravci, dvije probe pitcha.
