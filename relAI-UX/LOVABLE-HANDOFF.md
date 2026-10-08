# relAI — Lovable Cloud handoff

Pročitaj **PDR-relAI.md** kao izvor aktualnih zahtjeva. Tamo su i kriteriji prihvata i gotov prompt za Lovable. Zadnja verzija UX-a je 0.11.0.

Zadrži plavu mističnu mapu s toplim detaljima, jasna polja, avatare iz v4, Solo mod/Ekipni mod i mobilnu navigaciju. Uvod ima samo prste, animirani relAI i slogan prema odabranom jeziku: HR “Na budućeg sebe se uvijek možeš osloniti.” / EN “You can always rely on your future self.” Početni HP je 0; prisutnost je isključivo rezultat HP-a. HP milestones 25/50/75/100 imaju trajni unlock prema peak HP-u.

Na mapi zadrži jedini naslov “step by step”, transparentni originalni vektorski logo i kameru 100–260%: povlačenje, pinch, wheel, dvoklik, gumbi +/− i povratak na avatara. Tipkovnica koristi strelice, +/− i Home. Krajolik, polja i avatari transformiraju se zajedno; HUD je fiksan. To je privremeni pogled, ne podatak o HP-u ili napretku. Kamera je izdvojena u `src/map-camera.mjs`.

Dokumenti su zasebni kružni mjehurići s plavo-srebrnim i toplim odsjajem. `src/documents.js` i `src/documents.css` čuvaju upload, favorite, detalje, pretragu i sortiranje te pop animacije redom kad mjehurići postanu vidljivi. Sačuvaj reduced-motion alternativu i privatnost pri prelasku na Cloud Storage.

Zadaci i dokumenti koriste zajednički katalog `src/categories.js` / `src/categories.css`: 18 početnih kategorija, sedam glavnih — Režije, Garancije i računi, Pregledi, Osobni dokumenti, Posao, Privatno i Za sebe. Točne potkategorije su u PDR-u. Sačuvaj dodavanje, preimenovanje i promjenu roditelja, najviše dvije razine, stabilne ID-jeve i postojeće veze. Nema brisanja kategorija. Filter roditelja uključuje djecu; u Zadacima filtrira brojeve po datumima i listu u sva tri pregleda, a u Dokumentima se kombinira s postojećim filterima. Otvaranje upravljanja ne smije izgubiti nacrt novog zadatka. Ranije nazive/veze migriraj bez resetiranja podataka; kategorije nisu fiksni enum.

Dokument dobiva `categoryId` i neobavezni `expiresOn` (YYYY-MM-DD), ručno podesive u detalju. Status je Isteklo, Istječe danas/sutra, Još N d do uključivo 30 dana, odnosno datum za udaljeniji rok. Nema OCR-a, automatskog prepoznavanja roka ili stvarnog pusha. Za Cloud uvedi privatne vlasničke kategorije i reference `category_id`, `expires_on` kao date-only podatak te posebno autorizirani raspored podsjetnika. Datum i naziv osjetljivog dokumenta ne smiju se automatski dijeliti friend circleu ili AI-u.

Chat se otvara glavom avatara na svim tabovima i zove Your future self assistant. Na Avataru ostaje postojeća glava uz lika; globalni gumb ondje je skriven da nema duplikata. Svaki odgovor ima glavu odabranog lika. `src/assistant-preview.js` je trenutno lokalni demo adapter. Zamijeni ga Cloud/SSE implementacijom bez redizajna. Demo oznaku ukloni tek kad je AI zaista povezan.

Početni tok je **uvod → ulazni profil → mapa**. Remember me omogućuje kasniji tok **uvod → mapa** uz izričit odabir i potpun valjan profil. `src/profile.js` i `src/profile.css` prikazuju ime, prezime, datum rođenja u prošlosti, spol, username i lozinku. Username je 3–24 znaka (A–Z, brojevi, točka, donja crta); dostupnost se sada ne provjerava. Lozinka ima najmanje 8 znakova, ostaje samo u polju forme i briše se; ne sprema se u state/localStorage niti šalje. Lokalni profil ima samo firstName, lastName, birthDate, gender i username. Kada Remember me nije uključen ili spremljeni profil nije valjan, ponovni ulaz prikazuje popunjen profil, ali praznu lozinku. Avatar pokazuje @username i profilne podatke. Postavke nude uređivanje profila i promjenu lozinke: tri polja i provjera podudaranja novih lozinki; bez provjere trenutačne ili stvarne promjene.

Checkbox **Zapamti me / Remember me** zadano je isključen. U početnoj formi `prefs.rememberMe` se sprema tek nakon valjanog slanja; Postavke → Račun također dopuštaju uključivanje i isključivanje. Uključen odabir uz potpun valjan profil preskače formu nakon sljedećeg klika na uvodni logo i pokreće istu animaciju balončića. Isključivanje vraća obrazac pri sljedećem ulasku. To je boolean vezan uz ovaj uređaj, bez spremanja lozinke, auth tokena ili stvarne Cloud sesije; ne sinkronizira se kao DisplayPreferences.

Poveži taj UX s pravim Cloud Authom uz jasne tokove registracije, prijave, sesije i oporavka. Dogovori podržani način prijave usernameom i serversku jedinstvenost/normalizaciju. Datum rođenja ostaje privatni date-only podatak, a lozinke nikad ne idu u tablicu profiles. Demo profil ni lokalni rememberMe flag nisu dokaz identiteta niti razlog za prepisivanje računa u bazi. Zadržavanje sesije mora voditi auth provider prema lokalnom odabiru; pristup privatnim podacima zahtijeva stvarnu valjanu sesiju. Ugovor razlikuje `DeviceSessionPreferences` od postavki prikaza po vlasniku.

Postavke nude `taskView: day | week | month` (zadano week) i `theme: dark | light` (zadano dark) te `language: hr | en` (zadano hr), lokalno spremljeno. `src/task-views.js` i CSS čuvaju dnevni, tjedni i mjesečni kalendar te navigaciju datumima; za Cloud uskladiti rokove s vremenskom zonom korisnika. `src/light-theme.css` čuva svijetlu temu bez promjene rasporeda, odobrenih asseta ili HP pravila. U budućnosti spremi ove preferencije po vlasniku profila.

Sačuvaj kompaktni izbor Hrvatski/English sa zastavicama i HR/EN oznakama. `src/i18n.js` bira tekst i locale hr-HR/en-GB; prevodi samo UI i nepromijenjene ugrađene primjere. Preimenovani zadaci, korisničke kategorije, datoteke, profilni podaci i poruke ostaju netaknuti. UI prijevod ne smije pisati natrag u spremljeni sadržaj. Cloud postavke moraju trajno spremati jezik uz korisnika, a buduće serverske obavijesti i AI adapter trebaju uzeti jezičnu postavku bez automatskog slanja ili prevođenja privatnih dokumenata.

Prvo pregledaj ciljni projekt i postojeću bazu. Ne zamjenjuj tablice ni korisničke podatke demo stanjem. Slijedi `integration/LOVABLE-CLOUD-PLAN.md` i `integration/contracts.ts`. Dokument `SUPABASE-PLAN.md` je raniji model mapiranja, ne zahtjev da se novi Cloud projekt spoji na zaseban Supabase.

Supabase/Cloud migracija, stvarna autentikacija/promjena lozinke, AI, push, stvarni prijatelji i Apple Calendar nisu izvršeni u ovoj UX fazi. ZIP daje izvor, build, assete i START.html; nije automatski import produkcijske baze.


## Prijelaz nakon ulaznog obrasca

Nakon uspješnog slanja početnog profila ili ulaska sa zapamćenim valjanim profilom, kada se prikaže mapa, po mobilnom ekranu pojave se 52 prozirna sapunasta balončića različitih veličina. Plavo-srebrni odsjaji s malo toplog sjaja povezuju prijelaz sa zbirkom dokumenata. Balončići iskaču u valu, lagano se podižu i rasprsnu; cijeli sloj nestaje unutar 2,8 sekundi. Mapa ostaje vidljiva i dostupna za dodir. Animacija se ne pokreće pri uređivanju profila i preskače se uz postavku reduced motion. Implementacija: `src/welcome-bubbles.js` i `src/welcome-bubbles.css`; buduća autentikacija može isti prijelaz pozvati tek nakon uspješne prijave.


## Ekipa, chat i Weekly relAI Race — 0.11.0

Navigacija: Mapa / Zadaci / Ekipa / Avatar / Više. Ekipa ima dva taba: Group chat i Weekly relAI Race. Krug je lokalni primjer s Lunom, Ivanom, Miom i korisnikom. HR/EN i obje teme su podržani. UI označava primjer ekipe i lokalnu pohranu poruka; nema online statusa, isporučenih poruka niti simuliranih odgovora prijatelja.

Group chat: glave članova, odvojeni oblačići, autor i vrijeme, vlastita poruka desno. Slanje gumbom ili Enterom, prazni unosi se ne šalju, ograničenje 1000 znakova. Poruke su obični escapani tekst i lokalno se spremaju. Glava AI asistenta u ovom tabu stoji uz zaglavlje, izvan tipke slanja.

Weekly relAI Race: postolje 2–1–3, najviše i toplo zlatno prvo mjesto, avatar i XP za svakog. Poredak koristi tjedne korake, zatim tjedni XP; potpuno izjednačeni rezultati dijele rang. Red korisnika je naglašen. Trenutačna UX sesija koristi postojeće weekPosition/weekXP brojače, bez automatskog kalendarskog resetiranja. Produkcija mora izračunati tjedne prema vremenskoj zoni kruga i imati serverske granice tjedna, arhivu i reset samo tjednih rezultata. Ukupni XP, HP i nagrade ostaju.

Mapa: Ekipni mod ima prekidač Ekipa za prikaz/sakrivanje članova i prečace za oba taba. XP iznad članova je tjedni, usklađen s utrkom. Vidljivi su članovi trenutačnog poglavlja, puni poredak dostupan je u utrci. Solo mod ne prikazuje ekipu. Uz logo piše relAI on future @username; dugi username vizualno se skraćuje. Dovršena polja su zelena s kvačicom i glow efektom te dostupnim opisom dovršeno. Visina prati 100dvh, bez prethodnog minimuma od 560/610 px, uz safe-area navigaciju i kompaktnije kontrole na niskim ekranima. Kamera se prilagođava promjeni veličine.

Integracija: src/social-model.js je granica zajedničkih članova/rezultata; src/social.js prikazuje chat i utrku. Zamijeniti primjere autoriziranim group_members, weekly_progress i group_messages. Klijent ne smije sam dodjeljivati rezultate. RLS: samo članovi čitaju krug i poruke, autor odgovara auth.uid(); serverski timestamp, paginacija, ograničenje duljine i rate limit. Realtime i pozivanje članova implementiraju se kasnije. Privatni zadaci, dokazi i dokumenti ne dijele se kroz poredak. Lokalni chat nije autentikacija niti višekorisnička sinkronizacija.
