# Provjera relAI UX paketa 0.11.0

Datum: 8. listopada 2026. Aktualni zahtjevi su u PDR-relAI.md.

## Provjereno u verziji 0.11.0

- Production build prolazi: React/Vite, **48 modula**. **23/23 testa prolaze.** Uz ranije provjere dodana su dva testa za Remember me: zahtijeva izričito uključen boolean i potpun valjan profil; odluka o preskakanju obrasca nikad ne zahtijeva spremljenu lozinku.
- U engleskom početnom obrascu **Remember me** zadano je isključen. Uključivanje checkboxa i slanje prazne lozinke blokirani su validacijom; nakon ponovnog učitavanja odabir je i dalje isključen. Neuspjelo slanje ne sprema opt-in.
- Valjana lozinka uz uključen Remember me otvara mapu na **0 HP / 0 XP**. Nakon ponovnog učitavanja uvod ostaje, a klik na logo preskače profilni obrazac (`profileVisible: false`). Prijelaz ima točno **52 balončića** i zadržava istih 0 HP / 0 XP.
- U Postavkama je odabir potvrđen kao uključen. Nakon isključivanja i ponovnog učitavanja hrvatski početni obrazac ponovno prikazuje postojeće profilne podatke, **praznu lozinku** i isključen Zapamti me.
- U svijetloj temi na **320 × 720 px** checkbox je 19 × 19 px, cijela oznaka visoka 44 px, a obrazac ostaje čitljiv bez horizontalnog prelijevanja.
- Snimke: `previews/remember-me.png` — tamni engleski prikaz na 390 px; `previews/remember-me-hr.png` — hrvatski svijetli prikaz na 390 px.
- Pregled koda potvrđuje whitelist profilnih polja: lozinka ne ulazi u spremljeni profil ili stanje. Remember me čuva samo lokalni boolean uređaja. Nema auth tokena, autentificirane Cloud sesije ni tvrdnje da je ovo stvarna prijava.

## Ranije provjereno u verziji 0.10.0

Rezultati ispod sačuvani su iz provjere jezične nadogradnje. Tada Remember me još nije bio dostupan; ponovno prikazivanje obrasca pri svakom ulazu opisuje to ranije stanje.


- Završni production build prolazi: React/Vite, **48 modula**, nakon ispravaka prijevoda nerazvrstanog zadatka, pogreške učitavanja fotografije i velikog početnog slova engleskog mjeseca u naslovu kalendara.
- **21/21 test prolazi.** Pokriveni su pravila zadataka, HP granice, dokazi, obavijesti, ICS, migracija pohrane, kamera, prikazi zadataka, zajedničke kategorije i HR/EN lokalizacija. Testovi kamere provjeravaju sidro zuma, granice pomicanja/zuma i povratak na avatara, uključujući gornja polja i kratki ekran.
- Četiri nova i18n testa potvrđuju HR/EN odabir i locale, povratak na hrvatski za nepodržanu vrijednost, parametre prijevoda i fallback kad engleski tekst nije zadan. Pokriveni su nedostajući i naslijeđeni parametri, vrijednosti 0 i false, izvorni primjeri zadataka i Apple primjer. Vlastiti naslovi, uključujući preimenovani naslov pod ID-em ugrađenog primjera, ostaju jednaki kroz HR → EN → HR bez mutacije podataka. Svaki test vraća zadani hrvatski jezik.
- U pregledniku na **390 × 844 px** potvrđen je aktualni hrvatski uvod s točnim tekstom **Na budućeg sebe se uvijek možeš osloniti.** Snimka: `previews/intro-novi-tekst.png`.
- Postavke prikazuju kompaktne SVG zastavice i HR/EN odabir. Klik na English odmah prevodi postavke i navigaciju. Snimka: `previews/settings-english.png`.
- Engleski tjedni pregled zadataka prikazuje prevedene dane, kategorijske oznake i obrazac novog zadatka. Postojeći korisnički naslov **Platiti račun za vodu** i vlastita kategorija **Internet i telefon** ostaju nepromijenjeni; ugrađene kategorije, uključujući Vodu, imaju engleski prikaz.
- Tab Avatar prikazuje engleske oznake profila i datum rođenja prema engleskom localeu. U chatu su pozdrav i odgovor na zahtjev za motivacijom na engleskom, uz glavu avatara. Snimka: `previews/chat-english.png`.
- U Dokumentima naziv postojećeg PDF-a ostaje nepromijenjen. Kategorija osobne iskaznice i oznaka roka s 12 preostalih dana prikazuju se na engleskom. Upravitelj kategorija također prikazuje engleske kontrole.
- Povratak na HR vraća hrvatsko sučelje. Ponovni EN odabir ostaje nakon učitavanja stranice; uvod tada prikazuje točno **You can always rely on your future self.** Snimka: `previews/intro-english.png`.
- Nakon ponovnog učitavanja na EN, Continue otvara potpuno engleski početni profil: oznake polja, spol, pomoć, lozinku i **Step onto map**. Postojeći profilni podaci su sačuvani, a lozinka je prazna. Zapis pogrešaka preglednika bio je prazan.
- Glavni pregled na kraju je ponovno učitan na hrvatskom i prikazuje točan novi hrvatski slogan.

## Ranije provjere profila, prikaza i kategorija — 0.8.0 do 0.9.1

Sljedeći rezultati sačuvani su iz prethodnih provjera. Ne predstavljaju novu punu pregledničku provjeru svih tih tokova na engleskom u verziji 0.10.0.

- Tri testa kategorija potvrđuju da filtar glavne kategorije uključuje njezine potkategorije, stari nazivi zadataka zadržavaju pridružene kategorije, a izričito nerazvrstan zadatak ostaje nerazvrstan. Provjereni su odbijanje ciklusa i treće razine, zabrana premještanja glavne kategorije s potkategorijama te jedinstveni nazivi unutar istog roditelja nakon normalizacije. Jednaki nazivi dopušteni su u različitim glavnim kategorijama.
- Na 320 px u obrascu zadatka upisani su naslov „Platiti račun za vodu” i kategorija Režije › Voda. U upravitelju je dodana potkategorija Internet pod Režije, zatim preimenovana u Internet i telefon. Zatvaranje upravitelja sačuvalo je nedovršeni naslov i odabranu kategoriju. Nakon spremanja zadatka filtar Režije prikazao je odgovarajući jedan zadatak, a nova potkategorija pojavila se i u izborniku dokumenata.
- U dokumente je učitan testni PDF od 17 KB uz odabranu kategoriju Osobni dokumenti › Osobna iskaznica. Dokument je preuzeo odabranu kategoriju; filtar glavne kategorije Osobni dokumenti uključio ga je u rezultate.
- Datum isteka testnog dokumenta 20. 10. 2026. prikazao je „Još 12 d”, datum 1. 10. prikazao je „Isteklo”, a brisanje datuma uklonilo je oznaku. Vraćeni datum 20. 10. i kategorija ostali su nakon ponovnog učitavanja. Izravne provjere kontrolera dokumenata i datuma potvrđuju računanje 30 kalendarskih dana preko promjene sata te da izričito Nerazvrstano nadjačava nasljeđivanje kategorije fotografskog dokaza iz zadatka.
- Upravitelj kategorija vizualno je pregledan u tamnom načinu na 390 × 844 px: `previews/kategorije-mobile.png`.
- Klik na animirani logo nakon uvoda otvara obavezni početni obrazac za ime, prezime, datum rođenja, spol, username i lozinku. Prazna obavezna polja blokiraju nastavak. Testni profil `Demo Profil`, 12. 4. 1995., ženski spol, `demo.relai` uspješno otvara mapu na 0 HP.
- Na tabu Avatar username je prikazan iznad avatara, uz puno ime, datum rođenja i spol. Uređivanje usernamea odmah osvježava prikaz. Budući datum rođenja u 2030. odbijen je nativnom validacijom (`rangeOverflow`).
- Promjena lozinke odbija različite vrijednosti nove lozinke i potvrde. Jednake vrijednosti završavaju jasnom potvrdom UX pregleda: nijedna stvarna lozinka nije promijenjena. Lozinke nisu dio spremljenog profila ili stanja aplikacije i brišu se iz obrasca pri zatvaranju ili uspješnom slanju.
- Glava za chat prisutna je na mapi, zadacima, postavkama i dokumentima; Avatar zadržava jednu postojeću glavu uz lika. Otvaranje chata s mape radi.
- Dark / Light odabir u postavkama mijenja izgled odmah. Svijetli prikaz mape i mjesečnog kalendara vizualno je pregledan na 390 px.
- Postavke dnevnog, tjednog i mjesečnog prikaza mijenjaju pregled zadataka. Mjesečna navigacija prelazi iz listopada u studeni, a Danas vraća listopad. Dnevna navigacija prelazi s 8. na 9. listopada i prikazuje zadatke odabranog dana. Tjedni prikaz ima sedam dana.
- Početni obrazac u tamnom načinu pregledan je na 390 × 844 px. Uređivanje profila u svijetlom načinu pregledano je na 320 × 720 px, bez horizontalnog prelijevanja.
- U ranijoj provjeri ove nadogradnje potvrđeno je da ponovno učitavanje zadržava podatke profila bez lozinke i tada odabrane postavke Light / tjedni prikaz. Polje lozinke u početnom obrascu ponovno je prazno. Taj rezultat ne opisuje trenutačne postavke svakog otvorenog demo preglednika.
- Ranije slike zaslona: `previews/profil-pocetak.png`, `previews/avatar-profil.png`, `previews/zadaci-mjesec-light.png` i `previews/mapa-light.png`.

## Sačuvano iz prethodno provjerenog UX-a

- Mapa ima samo naslov **step by step** i nazive **Solo mod / Ekipni mod**. Promjena moda radi.
- Originalni oblici loga ostaju. Aktivni `relAI-blue.svg` nema dva root/artboard pravokutnika; sačuvani `relAI.svg` nije mijenjan. Uklonjeni su i iz ugrađenih kopija koje koristi aplikacija.
- Povlačenje mape u pregledniku potvrđeno je transformacijom `translate(-67px, 61px) scale(1)`. Krajolik, polja i avatari transformiraju se zajedno; HUD i kontrole ostaju fiksni.
- Zum na 150% i povratak na avatara na 100% rade. Kotačićem miša potvrđen je zum na 177%. Tipka ArrowLeft mijenja pomak x za 45 px; Home vraća pogled na avatara. Kamera ne mijenja HP ili korake.
- Dokumenti su zasebni kružni mjehurići. Potvrđeni su razmaci početka animacije 0 / 0,18 / 0,36 s; dokumenti niže na stranici otkrivaju se pri dolasku u vidljivo područje. Reduced-motion pravilo uklanja pop animaciju.
- Otvaranje PDF detalja, filtriranje i pretraga dokumenata rade. PDF se preuzima iz detalja; ugrađeni pregled PDF stranica nije implementiran. Upload, pohrana fotografija i uklanjanje nisu mijenjani ovim vizualnim refiniranjem; raniji tokovi provjereni su u prethodnoj verziji.
- Mobilni prikaz **390 px** pregledan vizualno. Na **320 px** mapa i dokumenti nemaju horizontalno prelijevanje: dokumenti imaju širinu sadržaja 305 px unutar viewporta 320 px, a mjehurići su 127,33 × 127,33 px.
- Prethodne slike zaslona mape i dokumenata ostaju u `previews/mapa.png`, `previews/dokumenti-baloncici.png` (390 px) i `previews/dokumenti-320.png`.
- Uvod: prsti prilaze i blijede; veliki logo raste; klik pozadine ne zatvara uvod. Ulaz preko loga u ovoj verziji vodi na početni profilni obrazac, a zatim na mapu.
- Novi profil kreće na 0 HP / 0 XP / 0 koraka. Dovršena prva šetnja daje 5 HP / 30 XP / 1 korak. Nema klizača prisutnosti.
- HP nagrade 25/50/75/100 imaju stanja prema pragu. Najviši dosegnuti HP i preuzete nagrade ostaju nakon pada HP-a.
- Avatar chat prikazuje glavu odabranog lika uz odgovore, pripremu odgovora, predložene poruke i slanje Enterom. Demo status ostaje vidljiv.
- Montserrat i slikovni asseti su lokalni. Raniji prikazi uvoda, avatara i chata na 320/430 px ostaju u mapi `previews/`.

## Granice provjere

U verziji 0.10.0 nije ponovljena zasebna preglednička provjera svih mjesečnih/dnevnih tokova, promjene lozinke ili svih scenarija foto dokaza na engleskom. Njihove ranije provjere i aktualni automatizirani testovi navedeni su odvojeno iznad.

Pinch je implementiran, ali nije provjeren fizičkim multitouch testom; nema provjere na stvarnom iPhoneu. Tipkovnica i gumbi pružaju alternativu gestama. File:// otvaranje nije provjereno u testnom pregledniku; localhost jest.

Brada i duljina kose zasad samo spremaju odabir. AI odgovori su lokalni primjeri. Profil i obrazac lozinke su UX prototip; stvarna autentikacija, provjera dostupnosti usernamea i promjena lozinke nisu povezane. Lozinke se ne spremaju ni šalju. Cloud, pravi prijatelji, push i Apple sinkronizacija nisu povezani. Nisu izvršene migracije niti javna objava.


## Animacija ulaska u mapu — 0.9.1

Production build prolazi s 46 modula. Nakon slanja ulaznog profila u mobilnom pregledniku (390 × 844) potvrđena su 52 animirana sapunasta balončića iznad mape. Balončići i cijeli privremeni sloj nakon prijelaza nestaju iz DOM-a. Fokus prelazi na logo mape. Pregled koda potvrđuje: događaj reagira samo na početni ulaz, ne uređivanje profila; sloj je dekorativan, inert i ne preuzima klikove; reduced-motion preskače efekt, promjena te postavke prekida aktivan efekt; unmount i ponovni ulaz čiste timer i elemente. Najdulja animacija s odgodom traje 2510 ms, čišćenje je na 2800 ms. Ranijih 17 testova odnosi se na prethodno provjerena pravila; ova vizualna izmjena provjerena je buildom i preglednikom.

Ponovni ulaz ponovno prikazuje 52 balončića bez duplog sloja. Tijekom aktivne animacije gumb zuma uspješno mijenja mapu sa 100% na 125%. Snimka: `previews/login-soap-bubbles.png`.


## Release 0.11.0 — social UX and responsive map

- Build: passed, 51 modules. Unit tests: 26/26 passed, including shared circle progress, steps/XP ranking, tied positions and chat input limits.
- Browser QA on isolated origin 5191: HR/light and EN/dark; current UI switched back to HR/dark. 390×844 and 320×568 tested. At 320×568 document dimensions exactly matched viewport (no horizontal/vertical map page overflow).
- Zoom 100→125%, keyboard panning, recentering, resize, teammate visibility toggle, podium and map shortcuts verified.
- Completed optional-evidence walking task on QA profile: 0→5 HP, 0→30 XP, 0→1 weekly step. Map completed field green with glow/check; race self row shows 1 step and 30 XP.
- Sent local chat message, disabled empty submit, reloaded prototype and verified message persisted. Fixed assistant launcher overlap with send button; it now lives at chat header. No console errors observed.
- Screenshots: previews/group-map.png, previews/group-chat.png, previews/weekly-race.png. Prototype teammates/messages remain local examples. No live social, automated week rollover, auth, cloud, or network message delivery claimed.
