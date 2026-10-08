# relAI — Product & Design Requirements

**Verzija:** 0.11.0 · **Datum:** 8. listopada 2026.  
**Namjena:** specifikacija proizvoda, dizajna i UX-a za implementaciju u Lovable Cloudu.  
**Trenutna faza:** interaktivni lokalni UX prototip; backend i AI povezuju se naknadno.

## 1. Proizvod

relAI je pocket time manager koji svakodnevne obveze pretvara u osobni put. Dovršen zadatak pomiče ljudskog avatara za jedno polje. HP određuje koliko je avatar prisutan, a napredak otključava virtualne nagrade. Solo mod prati osobni napredak; Ekipni mod omogućuje tjedno natjecanje prijatelja.

Doživljaj mora biti jednostavan, intuitivan, zabavan i vizualno upečatljiv. Mističan, realističniji okoliš kombinira se s odobrenim blago stiliziranim AI/game avatarima. Ne vraćati gusti dashboard, magenta paletu ili otočne nazive.

Vizualni koncept ljudskog duha ostaje trag korisnikove druge verzije sebe. Asistent se predstavlja kao **Your future self assistant** — podrška korisniku, ne predviđanje budućnosti. Na početnom ekranu koristi se isključivo aktualni tekst iz odjeljka 3.

## 2. Opseg i status

| Dio | Sadašnji UX | Kasnija implementacija |
|---|---|---|
| Uvod, mapa, avatar, navigacija | Klikabilan i animiran | Produkcijska optimizacija |
| Ulazni profil i lozinka | Lokalni profil; lozinka se ne sprema | Cloud Auth i stvarna korisnička sesija |
| Zapamti me / Remember me | Odabir na uređaju preskače ponovni obrazac uz valjan profil | Zadržavanje sesije preko auth providera |
| Dnevni / tjedni / mjesečni pregled | Lokalni zadaci i odabir u postavkama | Cloud podaci i vremenska zona korisnika |
| Dark / Light mode | Lokalno spremljen odabir | Sinkronizacija korisničkih postavki |
| Hrvatski / English | HR/EN sučelje i lokalno spremljen odabir | Jezik u korisničkim postavkama na Cloudu |
| Zadaci, HP, XP, polja | Lokalno spremanje i pravila | Autorizirana serverska transakcija |
| HP prekretnice i XP nagrade | Lokalni prikaz i preuzimanje | Trajni inventar korisnika |
| Avatar chat | Jasno označen demo razgovor | Lovable AI kroz backend |
| Dokumenti i foto dokaz | Lokalni upload i animirani mjehurići | Privatni Cloud Storage |
| Kategorije i potkategorije | Zajedničko lokalno uređivanje i filtriranje | Privatni katalog po vlasniku |
| Rok valjanosti dokumenta | Ručni datum i oznaka statusa | Serverski raspored i stvarne obavijesti |
| Solo mod / Ekipni mod | Solo lokalno; ekipa demo | Stvarni krugovi, utrke i realtime |
| Push | UX primjeri poruka | Dozvola, raspored i isporuka |
| Apple Calendar | UX simulacija; ICS izvoz | Pravi konektor / native integracija |

Ovaj paket ne aktivira Cloud, ne objavljuje aplikaciju i ne migrira bazu. Izvorni React/Vite kod, build, slike, font i samostalni HTML priloženi su za integraciju.

## 3. Uvodni ekran — obavezno

- Mobile-first, preko cijelog zaslona aplikacije.
- Podloga: svijetlo zamagljeno staklo i **samo pet plavih tragova prstiju**. Bez dlana, lica i tijela. Suptilna topla nijansa je dopuštena.
- Prsti se približavaju korisniku, zatim blijede. Animacija je jednokratan ulazak, ne beskonačno pulsiranje.
- U sredini veliki animirani **relAI** koji raste dok prsti blijede. Natpis mora biti pravi HTML/SVG element, ne tekst zapečen u pozadinsku sliku.
- Ispod točan tekst prema odabranom jeziku: HR **Na budućeg sebe se uvijek možeš osloniti.** / EN **You can always rely on your future self.**
- Donji, diskretan poziv: **DODIRNI relAI**.
- **Klik/dodir velikog loga** daje fade i otvara ulazni ekran profila iz odjeljka 3.1, osim kada je Zapamti me uključen i spremljeni profil potpun i valjan; tada otvara mapu. Pozadina nije gumb. Enter/Space na logu moraju raditi; reduced-motion korisnici dobivaju statičan prikaz i neposredan prijelaz bez efekata.
- Više → Početni ekran ponovno otvara uvod. Klik na logo zatim slijedi isti Remember me uvjet; sam uvod ostaje u oba slučaja.

**Prihvat:** samo uvod prima fokus dok je otvoren; ponovljeni klik ne otvara više prikaza. Nakon spremanja ulaznog profila ili ulaska sa zapamćenim valjanim profilom mapa i avatar odmah su vidljivi.

### 3.1. Ulazni profil / login UX

Pri prvom ulasku ili kada nema aktivnog valjanog Remember me odabira, nakon uvoda prikazuje se jednostavan ekran **Krenimo od tebe.** s obaveznim poljima: ime, prezime, datum rođenja, spol, username i lozinka. Primarna akcija **Zakorači na mapu** sprema profil u ovom pregledniku i otvara mapu. Ovo je dizajn budućeg ulaska/kreiranja računa; sada ne stvara račun niti provjerava identitet.

- Ime i prezime ne mogu biti prazni ili sadržavati samo razmake. Datum rođenja mora biti u prošlosti.
- Spol: Ženski, Muški, Drugo ili Ne želim navesti. Ženski/muški odabir postavlja početni lik; ostali odabiri ne zahtijevaju novu nepostojeću varijantu avatara.
- Username: 3–24 znaka, slova A–Z, brojevi, točka ili donja crta. Prikazuje se s prefiksom @. Dostupnost usernamea zasad se ne provjerava.
- Lozinka: najmanje 8 znakova; prikaz/sakrivanje dostupno gumbom. Lozinka se **ne sprema, ne šalje i ne kopira u aplikacijsko stanje**. To nije autentikacija.
- Lokalno se spremaju isključivo profilna polja `firstName`, `lastName`, `birthDate`, `gender`, `username`.
- Kada se ulazni obrazac ponovno prikazuje, postojeći profil je unaprijed popunjen; polje lozinke uvijek je prazno. Remember me može preskočiti ovaj obrazac prema uvjetima niže, ali nije trajna autentificirana sesija.

**Zapamti me / Remember me:** početni obrazac ima checkbox, zadano isključen. Njegova se vrijednost sprema u `prefs.rememberMe` tek nakon valjanog slanja cijele forme. Pri sljedećem kliku na uvodni logo obrazac se preskače samo ako je odabir uključen i lokalni profil još uvijek potpun i valjan. Uvod ostaje, a ulaz na mapu pokreće iste sapunaste balončiće. Neispravan ili nepotpun profil uvijek vraća obrazac.

Postavke → Račun imaju isti odabir koji se može uključiti ili isključiti. Isključivanje utječe na sljedeći ulazak: prikazuje se popunjen profil i prazna lozinka. Ovaj odabir pripada **uređaju/pregledniku**, ne sinkroniziranim postavkama prikaza po vlasniku. Sprema se samo boolean; nema spremanja lozinke, auth tokena ni stvarne Cloud sesije. Uređivanje profila i upravljanje ovim odabirom ne mijenjaju HP ili napredak.

Postavke imaju **Uredi profil** i **Promijeni lozinku**. Uređivanje mijenja lokalni profil bez diranja HP-a i napretka. Promjena lozinke prikazuje trenutačnu, novu i potvrdu nove lozinke; nova i potvrda moraju se podudarati. Trenutačna lozinka se u demu ne provjerava. Završna poruka izričito kaže da nijedna stvarna lozinka nije promijenjena, a unesene lozinke se brišu iz forme.

**Kasnije:** zamijeniti ovaj tok stvarnim Cloud Authom, provjerom usernamea, upravljanjem sesijom, ponovnom autentikacijom i oporavkom računa. Remember me tada bira način zadržavanja sesije kroz podržani auth provider. Autorizaciju uvijek određuje valjana providerova sesija; lokalni flag ili popunjen profil ne smiju otvarati pristup privatnim Cloud podacima. Lozinke nikad ne spremati u `profiles`, localStorage ni dokumente. Točan model prijave usernameom i verifikacije identiteta treba dogovoriti s podržanim auth providerom; ne izmišljati aktivnu prijavu samo zato što forma postoji.

## 4. Glavna mapa

Jedini naslov na mapi je **step by step** u oba moda. Nema dodatnih tekstova “Tvoj put”, “Zajedno dalje” ni “demo utrke”. Prekidač koristi točne nazive **Solo mod** i **Ekipni mod**. Mapa je glavni ekran nakon ulaznog profila ili Remember me ulaska i glavna stavka navigacije.

Vizual je plavi mistični krajolik sa srebrnom vijugavom stazom, maglom i malo narančastog svjetla. Narančasta donosi toplinu i optimizam; ne smije preuzeti cijelu paletu. Nema “Otoka nastajanja”.

Obavezni elementi:

- Jasno vidljiva **polja** na stazi, završena / trenutačno / buduća.
- Avatar na trenutačnom polju **odmah pri otvaranju**, uključujući 0 HP. Na nuli je blijed, ali prepoznatljiv; ne smije nestati u pozadini.
- Sažeti HP i XP, Solo mod/Ekipni mod te samo jedan sljedeći zadatak.
- Klik avatara otvara personalizaciju. Klik polja pokazuje kratak status.
- Dovršavanje jednog zadatka daje jedan pomak, ne broj koraka proporcionalan XP-u.
- Kontrole ne smiju pokrivati avatar ili sljedeći zadatak na malom ekranu.
- Logo zadržava originalne vektorske oblike, s plavim akcentom i stvarnom transparentnošću. Nema pravokutne artboard podloge ni pločice iza loga.

**Interaktivni pogled:** povlačenje mišem ili jednim prstom pomiče mapu. Pinch s dva prsta i kotačić miša približavaju/udaljavaju u rasponu **100–260%**. Dvoklik praznog dijela mape približava pogled; pri većem zumu vraća na 100%. Dostupni su gumbi +/−, postotak zuma i gumb “Vrati pogled na avatara”. Kad mapa ima fokus, strelice je pomiču, +/− zumiraju, a Home vraća pogled na avatara na 100%.

Krajolik, polja i svi avatari pomiču se i skaliraju zajedno. HP/XP, modovi, navigacija i kontrole ostaju fiksni. Pomicanje ima granice; povlačenje ne smije slučajno otvoriti polje ili avatara. Pogled je privremen u sesiji i ne mijenja HP, XP, položaj ni status zadatka. Novi korak ili promjena moda vraća fokus na trenutačno polje.

**Prihvat:** može se istražiti mapa, zatim jednim gumbom pronaći svoj avatar; nakon povlačenja i zuma avatar ostaje poravnat sa svojim poljem. Pinch je implementiran u prototipu, ali fizički multitouch i završno ponašanje na uređajima još treba provjeriti.

## 5. Avatar i prisutnost

**Zadržati upravo odobrene likove:** `avatar-female-v4.png` i `avatar-male-v4.png`. Bez zamjene fotorealističnim osobama. Duh s kalendarom je sekundarni simbol, ne zamjena ljudskog lika.

Novi profil kreće s **0 HP, 0 XP, 0 koraka**. Početni izgled je svijetao, sivkast i proziran. S rastom HP-a lik postaje puniji i obojeniji. S padom HP-a ponovno blijedi.

**Prisutnost se ne može ručno mijenjati.** Nema klizača, upisa HP-a, testnog gumba ili XP prečaca. Ekran avatara ima samo pokazatelj HP-a. Personalizacija ne mijenja napredak.

Opcije: ženski/muški lik, visina, građa/debljina, boja očiju, boja i duljina kose, brada za muški lik. U prototipu brada i duljina kose spremaju odabire; završni renderi/3D varijante dolaze kasnije.

Na vrhu taba Avatar, iznad lika, prikazuje se **@username** i pregled profilnih podataka: ime i prezime, datum rođenja i spol. Akcija za uređivanje otvara istu lokalnu formu profila. Profilni podaci ne prikazuju se prijateljima automatski; javni prikaz i privatne informacije moraju biti odvojeni pri povezivanju baze.

## 6. Petlja zadatka i pravila

| Događaj | Polja | XP | HP |
|---|---:|---:|---:|
| Dovršen zadatak | +1 | 10 + 10 × važnost + 10 × težina | +5, najviše 100 |
| Propušten, važnost 1 | 0 | 0 | −5, najmanje 0 |
| Propušten, važnost 2 | 0 | 0 | −10, najmanje 0 |
| Propušten, važnost 3 | 0 | 0 | −20, najmanje 0 |
| Pravodobna odgoda | 0 | 0 | 0 |

Važnost i težina su 1–3, pa je raspon 30–70 XP. Ove vrijednosti su pravila prototipa i moraju biti konfigurabilne na backendu. HP nikad nije negativan. Na 0 HP nema zaključavanja, brisanja napretka ili zabrane zadataka.

Korisnik sam označava dovršeno. Dokaz fotografijom može biti isključen, neobavezan ili obavezan, ali samo kada je fotografija moguća i primjerena. Za sastanke i liječničke preglede zadano je isključena. Obavezna fotografija blokira dovršavanje dok nije priložena. Upload nije automatska provjera istinitosti.

**Serverska implementacija:** jedan zadatak dobiva bodove jednom; status, event, korak, HP i XP mijenjaju se u jednoj autoriziranoj transakciji. Klijent ne šalje konačne iznose bodova. Definirati rok, grace period i zaštitu od dvostrukih obavijesti prije uvođenja automatskih penala.

### 6.1. Pregled zadataka

U Postavkama odabir **Početni pregled zadataka** ima **Dnevni pregled**, **Tjedni pregled** i **Mjesečni pregled**. Zadano je tjedni pregled. Odabir se lokalno sprema i primjenjuje u tabu Zadaci; svaki prikaz ima prethodno/sljedeće razdoblje i povratak na Danas.

Dnevni prikaz pokazuje odabrani datum i njegove zadatke. Tjedni prikaz ima sedam dana, od ponedjeljka, s brojem zadataka i listom odabranog dana. Mjesečni prikaz ima mrežu od ponedjeljka, brojeve zadataka i oznake zadataka na redu; klik dana pokazuje njegovu listu. Prazan dan nudi Dodaj zadatak. Otvaranje, dodavanje, odgađanje i dovršavanje koriste ista pravila u sva tri prikaza.

Promjena mjeseca čuva dan kada postoji; 31. siječnja → zadnji dan veljače. Prototip radi s lokalnim kalendarskim datumom, bez pomaka preko UTC-a. Cloud implementacija mora uskladiti prikaz s vremenskom zonom korisnika i serverskim rokovima.

### 6.2. Zajedničke kategorije zadataka i dokumenata

Zadaci i dokumenti koriste **isti uređivi katalog kategorija**, sa stabilnim ID-jevima i najviše dvije razine. Nisu ograničeni na ranija četiri područja. Početni katalog sadrži 18 kategorija, od kojih je sedam glavnih:

| Glavna kategorija | Potkategorije |
|---|---|
| Režije | Voda, Plin, Struja |
| Garancije i računi | Garancije, Računi |
| Pregledi | Liječnički pregledi, Nalazi, Zubar |
| Osobni dokumenti | Osobna iskaznica, Putovnica, Vozačka dozvola |
| Posao | — |
| Privatno | — |
| Za sebe | — |

Upravljanje se otvara iz Postavki, Zadataka i Dokumenata. Korisnik može dodati glavnu kategoriju ili potkategoriju, preimenovati je i promijeniti kojoj glavnoj kategoriji pripada. Kategorija koja već ima djecu ostaje glavna; samoreferenca, treća razina i kružne veze nisu dopuštene. Naziv ima 1–40 znakova i mora biti jedinstven unutar istog roditelja. Brisanje kategorija nije dio ovog UX-a.

Filter **Sve kategorije** prikazuje sve stavke. Odabir glavne kategorije uključuje nju i njezine potkategorije. U Zadacima isti filter vrijedi za brojeve po datumima, oznake zadataka na redu i listu odabranog dana u dnevnom, tjednom i mjesečnom pregledu. U Dokumentima kombinira se s postojećim tabovima, pretragom i sortiranjem.

Novi zadatak ima odabir kategorije, a postojeći zadatak omogućuje promjenu kategorije u detalju. Otvaranje upravljanja kategorijama tijekom unosa novog zadatka čuva nacrt forme. Kategorija dokumenta mijenja se u njegovu detalju. Odabir kategorije i povezivanje dokumenta sa zadatkom odvojene su radnje; nijedna ne dodjeljuje HP/XP.

Promjena naziva ili roditelja zadržava isti ID, pa veze sa zadacima i dokumentima ostaju. Ranije lokalne kategorije mapiraju se prema postojećim nazivima; nepoznati korisnički nazivi se čuvaju. Uvođenje kataloga ne smije resetirati zadatke, dokumente, profil, HP ili napredak. Stavka bez dodijeljene kategorije prikazuje se kao **Nerazvrstano**.

**Kasnije:** tablica kategorija pripada korisniku; zadaci i dokumenti referenciraju njezin ID. Katalog je uređiv, ne fiksni enum četiri vrijednosti. Backend provjerava istog vlasnika na roditelju i stavkama, najviše dvije razine, valjanost naziva i stabilnost veza.

## 7. Nagrade

Samo virtualne nagrade, bez stvarnih kupnji ili obaveznih osobnih nagrada.

| Najviši dosegnuti HP | Nagrada | Vizual / ponašanje |
|---:|---|---|
| 25 | **Prva iskra** | Topla narančasta aura oko avatara |
| 50 | **Zvjezdani trag** | Svjetlosni trag po prijeđenim poljima |
| 75 | **Tvoj puni sjaj** | Srebrni svjetlosni halo |
| 100 | **Nebeska staza** | Dodatna mapa i mogućnost promjene svijeta |

Uvjet se provjerava prema trajnom **najvišem dosegnutom HP-u**, ne samo trenutačnom. Jednom preuzeta nagrada ostaje ako HP padne. Preuzimanje ne troši HP/XP. Ponavljanje istog praga ne dodjeljuje duplikate.

Postojeće XP nagrade ostaju dodatna putanja: 150 aura, 350 srebrni trag, 600 halo, 1000 nova tema mape. U završnom art setu XP i HP varijante moraju biti vizualno različite; prototip koristi jednostavne predstavnike.

Kartice pokazuju uvjet, ime, mali vizual i jedno stanje: zaključano / spremno / preuzeto. Obavijest o novoj nagradi je kratka i ne prekida osnovni tok.

## 8. Solo mod i Ekipni mod

Solo mod prati ukupna polja. Ekipni mod prikazuje avatara korisnika i položaje prijatelja. Tjedne utrke kreću ponedjeljkom; resetiraju samo tjedna polja i tjedni XP. Ukupni XP, HP, vršni HP, izgled i nagrade ostaju.

Poredak: broj tjednih koraka, zatim tjedni XP; izjednačenje može ostati dijeljeno. Za produkciju dogovoriti jednu vremensku zonu po krugu. Prijatelji vide napredak, ne privatne naslove obveza, medicinske podatke, dokumente ili fotografije.

## 9. Your future self assistant

Na **svim glavnim tabovima i njihovim stranicama** mora biti ikona za chat u obliku **glave odabranog avatara**. Globalni plutajući gumb ostaje na istom mjestu iznad donje navigacije. U tabu Avatar zadržava se postojeća ikona uz lika, a globalni gumb se skriva kako ne bi bilo duplikata. Uvod i modalni obrasci imaju vlastiti fokus; chat ne smije prekrivati njihove akcije. Muški i ženski odabir koriste vlastito lice. Ikona služi prepoznavanju asistenta i ostaje čitljiva neovisno o HP-u; puni lik prikazuje stvarnu prisutnost.

Klik otvara razgovor s naslovom **Your future self assistant**. Topao, kratak ton; prijedlozi “Od čega da krenem?”, “Treba mi motivacija”, “Imam previše zadataka”. Kompozitor ima jasan gumb slanja. U prototipu je stalno vidljivo **UX pregled · AI još nije povezan** i odgovori su lokalni primjeri.

Razgovor mora djelovati kao komunikacija s vlastitim avatarom. **Svaki odgovor asistenta ima glavu odabranog lika uz poruku**, ne samo generičku ikonu u zaglavlju. Tijekom pripreme odgovora glava se nježno animira uz indikator tipkanja. Poruke korisnika poravnate su desno, a odgovori avatara lijevo. Promjena spola avatara mijenja i lice u chatu. Prisutnost glavnog lika i dalje određuje samo HP; chat portret ostaje jasan radi prepoznavanja.

Kasniji AI pomaže odabrati sljedeći korak, razlomiti obvezu i predložiti izvediv raspored. Kontekst su dopušteni zadaci, rokovi i korisničke postavke. Privatne dokumente ne učitavati automatski. Asistent ne smije sam dodjeljivati HP/XP, potvrđivati dovršavanje ili premještati termine bez korisničke potvrde konkretne akcije.

Predvidjeti prazno stanje, slanje, streaming, pogrešku/ponovni pokušaj i prekid generiranja. Razgovori su privatni. Adapter se mora moći zamijeniti bez redizajna chata.

## 10. Dokumenti, kalendar i obavijesti

Svaki dokument je zaseban **kružni mjehurić sapunice**: proziran plavo-srebrni rub, biserni odsjaj i malo tople boje. Naziv i vrsta ostaju čitljivi; fotografija je diskretna podloga. Dugačak naziv skraćuje se u mjehuriću, a u otvorenom pregledu prikazuje se cijeli. Favorit ima zaseban gumb zvjezdice.

Mjehurići se pojavljuju redom pop animacijom: 620 ms trajanje, 180 ms razmaka između novo vidljivih dokumenata. Animacija se pokreće i kad korisnik dođe do dokumenata niže na stranici. Reduced motion prikazuje sve odmah, bez pop efekta; tipkovnica ima vidljiv fokus. Dva stupca ostaju i na uskom mobilnom prikazu. Uvodni blok je kratak, bez dodatne velike ilustracije.

Tabovi **Sve / Fotografije / PDF / Favoriti**, pretraga i sortiranje ostaju. Podržati dodavanje, preview, povezivanje sa zadatkom, preuzimanje i uklanjanje. Fotografije imaju pregled, a PDF otvara detalj dokumenta s preuzimanjem; ugrađeni pregled stranica PDF-a nije implementiran. Sadašnja granica je 8 MB/datoteka, do 20 po odabiru. Dokumenti i dokazi ostaju privatni.

Dokumenti dodatno imaju **kategoriju** iz zajedničkog kataloga i neobavezni **Rok valjanosti**, koji korisnik ručno upisuje u detalju. Datum se sprema kao `expiresOn` u obliku YYYY-MM-DD, bez pretvaranja u ponoćni UTC rok. Prazno polje uklanja rok. Mjehurić prikazuje kratku kategoriju i, kada postoji rok, oznaku: **Isteklo**, **Istječe danas**, **Istječe sutra**, **Još N d** do uključivo 30 dana, ili **Do [datum]** za udaljenije datume. Detalj daje cijeli datum i kategorijsku putanju.

Oznaka je vizualni izračun prema ručno upisanom datumu. Nema OCR-a, automatskog prepoznavanja roka u datoteci, stvarne provjere pravne valjanosti ni automatskog slanja podsjetnika. Naknadno povezati rokove s autoriziranim serverskim rasporedom, vremenskom zonom, korisničkim postavkama i dozvolom za obavijesti; sam upload ne znači pristanak na slanje.

Push ima podržavajući, direktni i roast ton, mirne sate i opciju skrivenog naslova. Penali u tekstu moraju odgovarati stvarnoj važnosti. Primjeri: “Dokaži da si odradio task” i upozorenje na gubitak 20 HP. Prije produkcije implementirati dozvolu uređaja, odjavu, backend jobs i stvarnu isporuku; prototip to ne tvrdi.

Apple Calendar ostaje planirana integracija. Potrebno definirati native ili serverski konektor, prava čitanja/pisanja, deduplikaciju događaja i odspajanje. Trenutačni ICS izvoz je jednokratan, nije sinkronizacija.

## 11. Dizajnerski sustav i pristupačnost

- Primarno mobilni format; osnovni pregled 390–430 px, provjera najmanje 320 px. Na desktopu zadržati preglednu širinu.
- Zadani **Dark mode** ima oko 70% tamnosive / tamnoplave površine. Glavni tonovi #0B1420, #111B27, #1B2736.
- Postavke imaju **Dark mode / Light mode**. Light koristi svijetle srebrno-plave površine (#F6F8FA / #FFFFFF / #E9EFF5), tamnoplavi tekst #243E59 i topliji akcent #BD7438. Obje teme zadržavaju isti raspored, mapu, odobrene avatare i HP pravila. Odabir se lokalno sprema i vrijedi za navigaciju, dokumente, zadatke, profil, postavke i chat; tema ne mijenja HP ni punoću avatara.
- Plavo/srebrno svjetlo #8EBEF4, #C1DCF7, #DCE6F3. Topli akcent #F3B37D, svijetli #FFD9B5.
- Montserrat ExtraBold 800 za naslove, Medium 500 za ostalo. Lokalni font s hrvatskim znakovima.
- Četiri primarna taba: **Mapa / Zadaci / Avatar / Više**. Sekundarni tokovi u Više.
- Bez horizontalnog prelijevanja; vidljiv fokus tipkovnice, modalni fokus i reduced motion. Stanja ne prikazivati samo bojom.
- Kratki tekstovi. Pozadina i efekti ne smiju umanjiti čitljivost avatara, polja ili akcija.

### 11.1. Jezik sučelja

Postavke imaju kompaktan odabir **Hrvatski / English**, sa zastavicama i jasnim HR/EN oznakama. Zastavica nije jedina oznaka: odabrano stanje i naziv jezika moraju biti dostupni tipkovnici i čitaču zaslona. Hrvatski je zadani jezik; nepoznata vrijednost također se vraća na hrvatski. Odabir `prefs.language: 'hr' | 'en'` sprema se lokalno i primjenjuje nakon ponovnog učitavanja.

Promjena jezika ažurira naslove, navigaciju, kontrole, obrasce, pogreške, pristupačne oznake, UX obavijesti, datume i izvoz u kalendar. Datumi koriste **hr-HR** ili **en-GB**, dok pohranjeni datumi, vremenska zona, rokovi, HP i ID-jevi ostaju isti. Naslov **step by step**, naziv **relAI** i **Your future self assistant** ostaju dio brenda u oba jezika. Ostali hrvatski UI nazivi navedeni u ovom PDR-u imaju odgovarajući engleski prikaz.

Ugrađeni primjeri zadataka i kataloga imaju prijevod za prikaz. Prijevod vrijedi samo dok je ugrađeni naziv ostao izvoran. Korisnički nazivi zadataka, preimenovane kategorije, profilni podaci, nazivi datoteka i poruke ne prevode se automatski. Primjerice izvorni “Sastanak s timom” postaje “Team meeting”, ali korisnikov novi naslov pod istim ID-em ostaje nepromijenjen. HR → EN → HR ne smije prepisati sadržaj ni stvarati duplikate.

Aktualni slogan uvoda mora biti točno **Na budućeg sebe se uvijek možeš osloniti.** na hrvatskom i **You can always rely on your future self.** na engleskom. Raniji tekst koji je počinjao s “jer” više se ne koristi u aktualnom sučelju.

**Kasnije:** odabir jezika spremati po vlasniku u Cloudu. Serverske obavijesti i AI adapter trebaju dobiti dopušten jezični kontekst; promjena UI jezika sama po sebi ne znači automatski prijevod privatnog sadržaja. Lokalizacija nije zamjena za povezivanje stvarnog AI-a ili pusha.

## 12. Priprema za Lovable Cloud

Target novog projekta je **Lovable Cloud**. Cloud ima ugrađenu bazu, autentikaciju, Storage i funkcije na Supabaseovoj otvorenoj osnovi; zaseban Supabase projekt nije obavezan. Postojeći vanjski Supabase ne tretirati kao automatski migriran u Cloud. To su različite konfiguracije. [Službene Cloud upute](https://docs.lovable.dev/features/cloud)

Za asistenta planirati Lovable AI kroz autentificiranu backend funkciju, uz SSE streaming i tajne na serveru. Prototipni adapter `src/assistant-preview.js` trenutno ništa ne šalje. [Službene AI upute](https://docs.lovable.dev/features/ai)

### Predloženi modeli — prilagoditi postojećoj bazi

| Model | Sadržaj |
|---|---|
| profiles | owner id, first_name, last_name, birth_date (date-only), gender, username, avatar opcije, timezone; nikad lozinka |
| user_preferences | owner, task_view (day/week/month, default week), theme (dark/light, default dark), language (hr/en, default hr) |
| categories | id, owner, name, parent_id nullable; najviše dvije razine, stabilni ID-jevi |
| tasks | owner, rok UTC, category_id nullable, važnost, težina, status, dokaz-policy |
| progress / task_events | HP default 0, peak_hp default 0, XP, koraci, idempotentni događaji |
| documents / task_proofs | privatni storage path, metadata, owner, category_id nullable, expires_on nullable date-only, veza sa zadatkom |
| circles / circle_members | privatni krug i članstvo |
| weekly_progress | krug, korisnik, tjedan, koraci, XP |
| reward_inventory | owner, reward id, earned_at; unique par |
| assistant_threads / messages | owner, uloga, sadržaj, vrijeme; privatno |
| notification_preferences / jobs | ton, mirni sati, dozvole, raspored, status isporuke |
| calendar_connections / event_links | provider, scopes, status i deduplikacija |

Username mora dobiti serversku provjeru valjanosti i jedinstvenosti s dogovorenom normalizacijom velikih/malih slova. Datum rođenja i puno ime privatni su profilni podaci; friend circle ih ne dobiva samo radi prikaza napretka. Stvarnu lozinku, njezinu provjeru, promjenu, oporavak i sesiju vodi auth provider, ne tablica profila. Lokalni demo profil nije dokaz identiteta i ne smije automatski prepisati profil prijavljenog korisnika.

Remember me pripada zasebnom modelu `DeviceSessionPreferences`, s `rememberMe: boolean` i zadanim false. Ne dodavati ga u sinkronizirane `user_preferences` zajedno s jezikom i temom. U produkciji uređajski odabir konfigurira providerovu sesiju; sam po sebi nije autentikacijski podatak.

Vlasničke politike moraju izolirati korisničke podatke. Krugovi dijele samo dopušten napredak. Dokumenti idu u privatni Storage s kratkotrajnim pristupom. Serverski ključevi ne pripadaju frontend paketu.

Za prijenos: otvori ciljni Lovable projekt, dodaj ovaj PDR kao kontekst i integriraj izvorni kod i assete kroz podržani projektni/Git workflow. Ne pretpostavljati da samo upload ZIP-a automatski prenosi backend ili postojeću bazu. Prvo pregledati postojeću shemu; ne brisati ni prepisivati podatke.

## 13. Redoslijed implementacije

1. Prenesi izgled, lokalne assete i navigaciju; potvrdi vizualnu jednakost s prototipom.
2. Poveži ulazni ekran s Cloud Authom, privatnim profilom, provjerom usernamea i stvarnom promjenom lozinke. Jasno razdvoji registraciju, prijavu i oporavak; početni HP/XP/korake postavi na 0 samo za novi račun. Sačuvaj postavke pregleda zadataka, teme i jezika hr/en.
3. Poveži uređive kategorije po vlasniku i mapiraj postojeće ID-jeve/nazive bez gubitka podataka. Zamijeni localStorage adapter zadacima i serverskim napretkom; HP i vršni HP provjeri transakcijski.
4. Poveži privatne dokumente, njihove kategorije i date-only rokove valjanosti, dokaze i trajni inventar nagrada. Podsjetnike za rokove uvedi zasebno kroz serverski raspored.
5. Dodaj friend circle i tjedne utrke.
6. Zamijeni chat demo stvarnim AI adapterom; dodaj streaming i error UX.
7. Uvedi stvarne push i Apple Calendar funkcionalnosti kao zasebne integracije.

## 14. Završni kriteriji prihvata

- Točan aktualni uvod: prsti prilaze i blijede, relAI raste. Klik na logo ili tipkovnica otvaraju profil, zatim valjano ispunjena forma otvara mapu; uz Zapamti me i potpun valjan profil klik otvara mapu izravno.
- Ulazni obrazac traži ime, prezime, prošli datum rođenja, spol, username i lozinku. Nema spremanja lozinke niti tvrdnje da je račun stvoren. Kada se ponovno prikaže, popunjava profil, nikad lozinku.
- Remember me je zadano isključen; odabir iz forme sprema se samo nakon valjanog slanja. Uključen uz potpun valjan profil preskače ponovni obrazac, zadržava uvod i animaciju balončića. Isključivanje u Postavkama ponovno traži obrazac pri sljedećem ulasku. Lozinka i token se ne spremaju, a boolean ne predstavlja Cloud autorizaciju.
- Avatar pokazuje @username i profilne podatke iz forme. Uređivanje profila ne mijenja napredak. Promjena lozinke potvrđuje samo UX demonstraciju; nepodudarne nove lozinke blokiraju slanje.
- Postavke pregleda zadataka daju dnevni/tjedni/mjesečni prikaz; sva tri čuvaju postojeće zadatke i podržavaju navigaciju datumima.
- Dark/Light odabir ostaje nakon ponovnog učitavanja, a tekst i kontrole ostaju čitljivi u obje teme.
- Hrvatski/English odabir ostaje spremljen; sučelje, datumi i primjeri prate jezik. Korisnički sadržaj ostaje nepromijenjen, uključujući preimenovani zadatak pod ID-em ugrađenog primjera. HR → EN → HR ne mijenja podatke.
- Slogan uvoda je točno “Na budućeg sebe se uvijek možeš osloniti.” / “You can always rely on your future self.”, ovisno o jeziku.
- Mapa pri ulasku pokazuje jasno vidljiv avatar na polju, čak i na 0 HP.
- Solo mod i Ekipni mod uvijek su dostupni; “step by step” je jedini naslov mape.
- Logo ima prozirnu pozadinu. Povlačenje i zum pomiču krajolik, polja i avatare zajedno; HUD ostaje fiksan. +/− i Home daju tipkovničku alternativu gestama i vraćaju pogled na avatara.
- Istraživanje mape ne mijenja korisnikov napredak.
- Prisutnost se ne može mijenjati ručno; dovršavanje 0 → 5 HP pomiče jedan korak.
- HP prekretnice ostaju otključane nakon pada HP-a i ne dupliciraju se.
- Glava odabranog lika otvara chat sa svih tabova; Avatar ima jedan postojeći gumb, bez duplog globalnog. Odgovori pokazuju isto lice; u UX verziji demo status je jasan.
- Dokumenti su zasebni mjehurići s pop animacijom redom i reduced-motion alternativom; upload, pretraga, favoriti i detalji ostaju dostupni.
- Isti katalog kategorija radi u Zadacima i Dokumentima; filter glavne kategorije uključuje djecu i mijenja sve kalendarske brojeve zajedno s listom.
- Dodavanje, preimenovanje i promjena roditelja zadržavaju veze stabilnim ID-jevima. Nema resetiranja podataka; nacrt novog zadatka ostaje nakon upravljanja kategorijama.
- Dokumentu se može promijeniti kategorija, ručno upisati ili ukloniti rok valjanosti; status je usklađen s datumom, a UI ne tvrdi da OCR ili podsjetnici rade.
- Build radi s lokalnim assetima, nema ugrađenih server ključeva niti tvrdnji o nepostojećim integracijama.

## 15. Otvorene odluke za sljedeću fazu

Model stvarne registracije/prijave usernameom, kontakt za oporavak računa, pravila jedinstvenosti usernamea i privatnosti datuma rođenja, točan grace period za propušten rok, vremenska zona kruga, konačne 3D varijante personalizacije, detalji vizuala nagrada, način Apple povezivanja, retencija AI razgovora, točno mapiranje postojeće baze te rokovi/slanje podsjetnika za dokumente i eventualni budući OCR. Ovo ne blokira sadašnji dizajn.

## Prompt za Lovable

> Integriraj priloženi relAI UX u Lovable Cloud prema ovom PDR-u. Zadrži odobrene avatare, mističnu plavu mapu s malo narančastog svjetla, jasna polja, Solo mod/Ekipni mod i mobile-first navigaciju. Na mapi ostaje samo naslov “step by step” i prozirni originalni vektorski logo. Zadrži povlačenje, pinch, wheel i dvoklik za zum 100–260%, gumbe +/− i povratak na avatara te tipkovničke kontrole. Kamera ne mijenja napredak. Dokumente prikaži kao zasebne mjehuriće sapunice koji se pop animacijom pojavljuju jedan za drugim, uz reduced-motion alternativu. Uvod ima samo prste koji prilaze i blijede, rastući relAI koji se klikne za ulazak prema Remember me pravilu iz odjeljka 3.1 i aktualni slogan HR “Na budućeg sebe se uvijek možeš osloniti.” / EN “You can always rely on your future self.” Ulazni profil ima ime, prezime, datum rođenja u prošlosti, spol, username i lozinku te Zapamti me/Remember me, zadano isključen. Opt-in se sprema nakon valjanog slanja i preskače ponovni obrazac samo uz potpun valjan profil; uvod i balončići ostaju. Postavke → Račun mogu isključiti taj odabir. On je samo za uređaj, nikad zamjena za auth sesiju niti spremanje lozinke. Poveži stvarni Auth naknadno; demo lozinke ne spremaj ni ne tretiraj kao autentikaciju. @username i profilni podaci stoje iznad avatara; Postavke nude uređivanje i promjenu lozinke. Sačuvaj dnevni/tjedni/mjesečni pregled zadataka, Dark/Light mode i kompaktni HR/EN odabir sa zastavicama u Postavkama. Jezik se pamti, lokalizira sučelje i ugrađene primjere, a korisnički sadržaj nikad ne prepisuje prijevodom. Zadaci i dokumenti dijele uređiv katalog kategorija i potkategorija iz odjeljka 6.2; koristi stabilne ID-jeve, filter roditelja uključuje djecu, a dodavanje/preimenovanje/promjena roditelja čuvaju podatke i nacrt zadatka. Kategorije nisu fiksni enum. Dokumenti imaju ručno unesen neobavezni rok valjanosti i oznake datuma/isteka; OCR i stvarni podsjetnici još nisu povezani. Novi korisnik kreće s 0 HP; nema ručnog mijenjanja prisutnosti. Zadrži HP nagrade 25/50/75/100 i njihove trajne unlockove. Chat je dostupan preko glave avatara na svim tabovima, bez duplog gumba u Avataru, i zove Your future self assistant. Prvo pregledaj postojeći projekt i bazu, sačuvaj podatke te predloži mapiranje adaptera. Nemoj redizajnirati UX niti tvrditi da su AI, push ili Apple sinkronizacija aktivni prije njihove implementacije.


## Prijelaz nakon ulaznog obrasca

Nakon uspješnog slanja početnog profila ili ulaska sa zapamćenim valjanim profilom, kada se prikaže mapa, po mobilnom ekranu pojave se 52 prozirna sapunasta balončića različitih veličina. Plavo-srebrni odsjaji s malo toplog sjaja povezuju prijelaz sa zbirkom dokumenata. Balončići iskaču u valu, lagano se podižu i rasprsnu; cijeli sloj nestaje unutar 2,8 sekundi. Mapa ostaje vidljiva i dostupna za dodir. Animacija se ne pokreće pri uređivanju profila i preskače se uz postavku reduced motion. Implementacija: `src/welcome-bubbles.js` i `src/welcome-bubbles.css`; buduća autentikacija može isti prijelaz pozvati tek nakon uspješne prijave.


## Ekipa, chat i Weekly relAI Race — 0.11.0

Navigacija: Mapa / Zadaci / Ekipa / Avatar / Više. Ekipa ima dva taba: Group chat i Weekly relAI Race. Krug je lokalni primjer s Lunom, Ivanom, Miom i korisnikom. HR/EN i obje teme su podržani. UI označava primjer ekipe i lokalnu pohranu poruka; nema online statusa, isporučenih poruka niti simuliranih odgovora prijatelja.

Group chat: glave članova, odvojeni oblačići, autor i vrijeme, vlastita poruka desno. Slanje gumbom ili Enterom, prazni unosi se ne šalju, ograničenje 1000 znakova. Poruke su obični escapani tekst i lokalno se spremaju. Glava AI asistenta u ovom tabu stoji uz zaglavlje, izvan tipke slanja.

Weekly relAI Race: postolje 2–1–3, najviše i toplo zlatno prvo mjesto, avatar i XP za svakog. Poredak koristi tjedne korake, zatim tjedni XP; potpuno izjednačeni rezultati dijele rang. Red korisnika je naglašen. Trenutačna UX sesija koristi postojeće weekPosition/weekXP brojače, bez automatskog kalendarskog resetiranja. Produkcija mora izračunati tjedne prema vremenskoj zoni kruga i imati serverske granice tjedna, arhivu i reset samo tjednih rezultata. Ukupni XP, HP i nagrade ostaju.

Mapa: Ekipni mod ima prekidač Ekipa za prikaz/sakrivanje članova i prečace za oba taba. XP iznad članova je tjedni, usklađen s utrkom. Vidljivi su članovi trenutačnog poglavlja, puni poredak dostupan je u utrci. Solo mod ne prikazuje ekipu. Uz logo piše relAI on future @username; dugi username vizualno se skraćuje. Dovršena polja su zelena s kvačicom i glow efektom te dostupnim opisom dovršeno. Visina prati 100dvh, bez prethodnog minimuma od 560/610 px, uz safe-area navigaciju i kompaktnije kontrole na niskim ekranima. Kamera se prilagođava promjeni veličine.

Integracija: src/social-model.js je granica zajedničkih članova/rezultata; src/social.js prikazuje chat i utrku. Zamijeniti primjere autoriziranim group_members, weekly_progress i group_messages. Klijent ne smije sam dodjeljivati rezultate. RLS: samo članovi čitaju krug i poruke, autor odgovara auth.uid(); serverski timestamp, paginacija, ograničenje duljine i rate limit. Realtime i pozivanje članova implementiraju se kasnije. Privatni zadaci, dokazi i dokumenti ne dijele se kroz poredak. Lokalni chat nije autentikacija niti višekorisnička sinkronizacija.
