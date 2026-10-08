# relAI — UX paket 0.11.0

**Glavna specifikacija za Lovable Cloud: [PDR-relAI.md](PDR-relAI.md).** React/Vite izvorni kod, lokalni asseti i samostalni HTML uključeni su u paket. Trenutni opseg je dizajn i interaktivni UX; Cloud, autentikacija, AI, push i Apple sinkronizacija još nisu spojeni.

## Što je novo

- **Ekipa** u glavnoj navigaciji otvara **Group chat** i **Weekly relAI Race**: lokalne poruke, postolje za prva tri mjesta i poredak svih članova. Primjer ekipe je jasno označen; nema stvarne isporuke poruka.
- Ekipna mapa ima prekidač prikaza prijatelja, XP iznad njihovih avatara i prečace za utrku/chat. Podaci članova zajednički su mapi i utrci; tvoj poredak prati dovršene zadatke.
- Uz logo je **relAI on future @username**. Dovršena polja imaju zeleni glow i kvačicu. Visina mape prati zaslon i sigurno područje navigacije; promjena veličine ponovno prilagođava kameru.

- **Zapamti me / Remember me** u početnom obrascu, zadano isključeno. Kada se valjana forma pošalje s uključenom opcijom, sljedeći klik na uvodni logo vodi ravno na mapu uz iste balončiće. U Postavkama → Račun opciju možeš isključiti. Sprema se samo odabir na uređaju, nikad lozinka ili autentifikacijski token.
- **Hrvatski / English** u Postavkama: kompaktne zastavice i HR/EN odabir, spremljen na uređaju. Sučelje, datumi i ugrađeni primjeri prate jezik; tvoji nazivi zadataka, kategorija i datoteka ostaju kako si ih upisao.
- **Zajedničke kategorije i potkategorije** za zadatke i dokumente: Režije, Garancije i računi, Pregledi, Osobni dokumenti, Posao, Privatno i Za sebe. Možeš dodavati, preimenovati i premještati kategorije; promjene čuvaju postojeće veze i podatke.
- Dokumenti imaju ručno podesiv **Rok valjanosti** i preglednu oznaku datuma/isteka. OCR i stvarni podsjetnici još nisu uključeni.
- Samo prsti iza zamagljenog stakla, animirani **relAI** u sredini i aktualni tekst **Na budućeg sebe se uvijek možeš osloniti.** / **You can always rely on your future self.** Prsti prilaze i blijede, logo raste, a klik na veliki logo uz fade otvara ulazni profil ili, uz Zapamti me i valjan spremljeni profil, izravno mapu.
- Mapa ima samo naslov **step by step**, **Solo mod / Ekipni mod** i originalni vektorski logo bez podloge. Mističan plavi krajolik, topli akcent i vidljiv avatar na 0 HP ostaju.
- Mapu možeš povlačiti i zumirati od **100% do 260%**. Krajolik, polja i avatari kreću se zajedno; kontrole ostaju fiksne. Gumb povratka ponovno pronalazi avatara.
- Svaki dokument je zaseban mjehurić sapunice s plavo-srebrnim odsjajem; pojavljuju se redom pop animacijom, uz mirnu reduced-motion alternativu.
- Zadržani su odobreni ženski i muški AI/game avatari. HP određuje prozirnost i punoću; **nema ručnog klizača prisutnosti**. Novi profil kreće na 0 HP/XP/koraka.
- Ulazni ekran traži ime, prezime, datum rođenja, spol, username i lozinku. **Profil je lokalni UX; lozinka se ne sprema niti provjerava kroz backend.** Na tabu Avatar iznad lika su @username i profilni podaci. Postavke nude uređivanje profila i UX promjene lozinke.
- Glava odabranog avatara otvara **Your future self assistant na svim tabovima**; u Avataru ostaje postojeća ikona uz lika, bez duplog globalnog gumba. Svaki odgovor ima njegovo lice. Razgovor je lokalni, jasno označen UX demo.
- Postavke nude **Dnevni / Tjedni / Mjesečni pregled zadataka** te **Dark / Light mode**. Odabiri se lokalno spremaju; zadano je tjedni pregled i tamna tema.
- HP nagrade: **25 — Prva iskra**, **50 — Zvjezdani trag**, **75 — Tvoj puni sjaj**, **100 — Nebeska staza**. Osvojene prekretnice ostaju nakon pada HP-a. XP nagrade ostaju dodatna putanja.

## Isprobavanje

Raspakiraj ZIP i otvori **START.html**. U njemu su font, slike i kod, bez vanjskih CDN-ova. Ako preglednik ograniči lokalnu pohranu iz datoteke, pokreni projekt preko localhosta:

```sh
npm install
npm run dev
```

Potreban je Node.js 22.12+. Dev adresa: `http://127.0.0.1:5186`. `npm run build` izrađuje `dist/`; zatim `npm run export:preview` izrađuje START.html. `npm test` pokreće dostupne provjere pravila zadataka, HP-a, pohrane, kamere mape i navigacije datumima. Opseg stvarno izvršenih provjera naveden je u `VALIDATION.md`.

## Što radi u prototipu

Prvi tijek: **uvod → ulazni profil → Mapa / Zadaci / Avatar / Više**. Datum rođenja mora biti u prošlosti; username prihvaća 3–24 znaka (A–Z, brojevi, točka, donja crta), a lozinka najmanje 8 znakova. Dostupnost usernamea se ne provjerava. Uvod ostaje pri svakom ulasku. Ako je Zapamti me uključen i spremljeni profil potpun i valjan, klik na logo preskače formu i vodi na mapu. Inače ponovno pokazuje formu s popunjenim profilom i praznom lozinkom. Odabir u početnom obrascu sprema se tek nakon valjanog slanja. Lozinke nikad ne ulaze u aplikacijsku pohranu.

Postavke → Račun također imaju Zapamti me. Isključivanje vrijedi za sljedeći ulazak: ponovno se traži prazno polje lozinke, a profil ostaje popunjen. Ovo je UX prečac na ovom uređaju, bez provjere identiteta ili stvarne sesije.

U Postavkama promjena lozinke pokazuje trenutačnu, novu i potvrdu nove lozinke. Provjerava podudaranje novih unosa; trenutačnu ne provjerava i nijednu stvarnu lozinku ne mijenja.

Zadaci se lokalno dodaju, odgađaju i dovršavaju. Dovršavanje daje +1 korak, 30–70 XP i +5 HP. Propuštanje oduzima 5/10/20 HP; HP ostaje 0–100. Stare demo sesije gube samo ranijih početnih 80 HP; podaci i zarađeni napredak ostaju.

Dnevni prikaz prikazuje odabrani dan, tjedni sedam dana od ponedjeljka, a mjesečni mrežu s brojem zadataka i odabirom dana. Prethodno/sljedeće i Danas rade u sva tri prikaza. Tema se mijenja u Postavkama i zadržava isti raspored i HP logiku. Jezik se također bira u Postavkama; zadano je hrvatski. Promjena na English prevodi sučelje i izvorne demo primjere bez mijenjanja spremljenih korisničkih unosa ili ID-jeva. Datumi koriste hr-HR ili en-GB. ICS izvoz i UX obavijesti prate odabrani jezik.

Na mapi koristi povlačenje, kotačić miša, pinch ili dvoklik praznog prostora. Gumbi +/− zumiraju, a gumb povratka centrira avatar na 100%. Kad mapa ima fokus, rade strelice, +/− i Home. Pogled je privremen i ne mijenja korake ili HP.

Kategorije se uređuju u Postavkama te iz Zadataka i Dokumenata. Imaju do dvije razine: primjerice Režije → Voda/Plin/Struja i Osobni dokumenti → Osobna iskaznica/Putovnica/Vozačka dozvola. Filter glavne kategorije uključuje potkategorije; na kalendaru filtrira i brojeve i listu. Novi zadatak čuva nacrt ako otvoriš upravljanje kategorijama. Kategoriju postojećeg zadatka mijenjaš u detalju. Brisanje kategorija nije dio ovog prototipa.

Dokumenti imaju upload, pojedinačne animirane mjehuriće, tabove, pretragu, favorite, kategorijski filter i povezivanje sa zadatkom. U detalju možeš promijeniti kategoriju i ručno upisati ili ukloniti neobavezni rok valjanosti. Mjehurić pokazuje Isteklo, Istječe danas/sutra, Još N d do 30 dana, ili datum. To je izračun iz upisanog datuma; nema OCR-a ni slanja obavijesti o isteku. Fotografije imaju pregled; PDF detalj i preuzimanje. Dokaz fotografijom traži se samo gdje je moguć i primjeren. Push i Apple Calendar su UX simulacije; jednokratni ICS izvoz jest stvaran.

Spol, oči, boja kose, visina i građa imaju jednostavan vizualni prikaz. Brada i duljina kose zasad samo spremaju odabir za buduće varijante. Ovo nije puni 3D editor. Prijatelji u Ekipnom modu su simulirani profili. Chat odgovori su lokalni primjeri, ne AI.

## Integracija

PDR opisuje ekrane, prihvatne kriterije, pravila, modele podataka i redoslijed povezivanja. Prenesi izvor i assete u ciljni Lovable projekt kroz podržani projektni/Git workflow; ZIP nije automatska migracija baze. Prvo pregledati postojeću shemu. Lokalni demo profil nije autentificiran korisnik: stvarni Cloud Auth mora preuzeti sesiju, provjeru usernamea, promjenu lozinke i oporavak računa. Lozinku nikad ne dodavati u profilnu tablicu ili localStorage. `rememberMe` je postavka ovog uređaja, odvojena od sinkroniziranih postavki prikaza. U produkciji trajanje sesije mora voditi auth provider; lokalni flag ili spremljeni profil nisu dokaz prijave. Kategorije moraju biti uređivi zapisi po vlasniku sa stabilnim ID-jevima, a rok dokumenta date-only podatak; stvarni podsjetnici zahtijevaju zaseban serverski raspored. Ne vraćati fiksni enum ranijih četiriju kategorija. U Cloud profilnim postavkama treba spremati i `language: hr | en` (zadano hr), bez automatskog prevođenja korisničkog sadržaja. Plan i tipovi su u `integration/LOVABLE-CLOUD-PLAN.md` i `integration/contracts.ts`.

## Datoteke

- `PDR-relAI.md`: glavni dokument proizvoda i dizajna, s promptom za Lovable.
- `src/game.js`, `game.css`, `mystic.css`, `warmth.css`: mapa, avatar i dizajnerski sloj.
- `src/map-camera.mjs`, `src/map-interactions.css`: pomicanje, zum, ograničenja pogleda i fiksne kontrole.
- `src/documents.js`, `src/documents.css`: lokalna zbirka, mjehurići, kategorije, rokovi valjanosti i redoslijed pop animacija.
- `src/categories.js`, `src/categories.css`: zajednički katalog, dodavanje/preimenovanje/promjena roditelja i filteri.
- `src/mystic-intro.js`: animirani uvod i pristupačni ulazak u profil ili mapu prema lokalnom Remember me odabiru.
- `src/profile.js`, `src/profile.css`: ulazni profil, uređivanje, podaci iznad avatara i UX promjene lozinke.
- `src/task-views.js`, `src/task-views.css`: dnevni/tjedni/mjesečni prikaz i lokalna navigacija datumima.
- `src/light-theme.css`: svijetla tema uz postojeći tamni dizajn.
- `src/i18n.js`: HR/EN odabir, tekstovi s parametrima, lokalizacija datuma i ugrađenih primjera bez mutacije korisničkog sadržaja.
- `src/assistant-preview.js`: zamjenjivi demo adapter chata, bez mrežnih poziva.
- `src/hp-milestones.js`: prikaz i preuzimanje HP nagrada.
- `src/domain.mjs`, `src/storage.js`: lokalna pravila i pohrana.
- `public/game/intro-v6.png`, `path-v6.png`: aktualni vizuali; `avatar-*-v4.png`: odobreni likovi. `path-v5.png` je dodatna noćna mapa.
- `public/brand/relAI-blue.svg`: aktivni plavi vektorski logo bez artboard podloge; originalni `relAI.svg` je sačuvan.
- `ART-PROMPTS-V6.md` i `GAME-ART-PROMPTS.md`: promptovi; `VALIDATION.md`: provjere i ograničenja; `previews/`: slike zaslona.

Montserrat 800/500 je uključen lokalno. Sve korisničke fotografije i dokumenti u ovoj verziji ostaju u pregledniku.


## Prijelaz nakon ulaznog obrasca

Nakon uspješnog slanja početnog profila ili ulaska sa zapamćenim valjanim profilom, kada se prikaže mapa, po mobilnom ekranu pojave se 52 prozirna sapunasta balončića različitih veličina. Plavo-srebrni odsjaji s malo toplog sjaja povezuju prijelaz sa zbirkom dokumenata. Balončići iskaču u valu, lagano se podižu i rasprsnu; cijeli sloj nestaje unutar 2,8 sekundi. Mapa ostaje vidljiva i dostupna za dodir. Animacija se ne pokreće pri uređivanju profila i preskače se uz postavku reduced motion. Implementacija: `src/welcome-bubbles.js` i `src/welcome-bubbles.css`; buduća autentikacija može isti prijelaz pozvati tek nakon uspješne prijave.
