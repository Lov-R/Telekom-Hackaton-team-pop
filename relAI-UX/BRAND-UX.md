# relAI — aktualni dizajn 0.11.0

Glavni dokument je `PDR-relAI.md`. Ovaj smjer zamjenjuje magenta otoke i prethodni uvod s cijelom rukom.

Mistično, toplo, jednostavno i zabavno: realističan plavi krajolik s malo narančastog svjetla, plus odobreni stilizirani AI/game likovi. Avatar i jasna polja u prvom su planu. Uvijek vidljivi, uključujući početnih 0 HP. Bez klizača za prisutnost.

Uvod prikazuje samo prste na zamagljenom staklu; animirani relAI u sredini; ispod HR “Na budućeg sebe se uvijek možeš osloniti.” / EN “You can always rely on your future self.” Prsti se približavaju i blijede, relAI raste; isključivo klik na logo nastavlja na ulazni profil ili, uz uključen Remember me i potpun valjan profil, ravno na mapu. Reduced motion daje mirnu alternativu.

Ulazni profil: kratak naslov “Krenimo od tebe.”, ime, prezime, datum rođenja, spol, username i lozinka; primarna akcija “Zakorači na mapu”. Lokalni UX status je jasan, lozinka se ne sprema. Uređivanje profila i promjena lozinke dostupni su u Postavkama. Na Avataru su @username i profilni podaci iznad lika.

Zapamti me / Remember me je jednostavan checkbox na ulazu, zadano isključen; odabir se sprema nakon valjanog slanja. S uključenom opcijom i valjanim profilom sljedeći klik na uvodni logo preskače obrazac i otvara mapu uz iste balončiće. Postavke → Račun imaju isti checkbox. Isključivanje vraća popunjeni profil i praznu lozinku pri sljedećem ulasku. Uvod ostaje; ovo je lokalni UX odabir uređaja, bez spremljene lozinke, tokena ili stvarne auth sesije.

Mapa: jedini naslov “step by step”, sažeti HP/XP, “Solo mod” / “Ekipni mod”, jedan sljedeći zadatak. Bez dodatnih “Tvoj put”, “Zajedno dalje” ili “demo utrke”. Povlačenje i zum 100–260% pomiču krajolik, polja i avatare zajedno, dok HUD ostaje fiksan. Pinch, kotačić i dvoklik imaju alternativu kroz +/−, strelice i Home; gumb povratka ponovno centrira avatar. Navigacija Mapa / Zadaci / Avatar / Više. Svi tabovi imaju chat gumb s glavom trenutačno odabranog lika. Globalni gumb je iznad navigacije; na Avataru ostaje postojeći uz lika, bez duplikata. Uz svaki odgovor u chatu pojavljuje se ista glava. Razgovor se zove Your future self assistant.

Zadaci: dnevni, tjedni i mjesečni pregled odabiru se u Postavkama. Zadano tjedni, ponedjeljak prvi dan, jasni brojevi zadataka, odabrani dan i jednostavne kontrole prethodno/sljedeće/Danas.

Zadaci i Dokumenti dijele iste kategorije: Režije, Garancije i računi, Pregledi, Osobni dokumenti, Posao, Privatno i Za sebe, s pripadajućim potkategorijama. Kompaktan filter uključuje djecu odabrane glavne kategorije; upravljanje se otvara iz oba taba i Postavki. Dvije razine, jasan prikaz roditelj › dijete, dodavanje i uređivanje bez gomilanja novih glavnih tabova.

HP nagrade imaju oblikovane kartice: aura 25, trag 50, halo 75 i mapa 100. Jednom osvojeno ostaje. Dokumenti su zasebni mjehurići sapunice: prozirni plavo-srebrni rubovi, topli biserni odsjaj i čitljiv naziv. Dva stupca, pop animacija redom pri dolasku u vidljivo područje; reduced motion bez animacije. Filter-tabovi, pretraga i favoriti ostaju. Mjehurić pokazuje kratku kategoriju i diskretnu oznaku isteka ili datuma kada je rok ručno upisan. Detalj prikazuje punu kategorijsku putanju i neobavezni datum. Boja podržava tekst, ne zamjenjuje ga. OCR i stvarni podsjetnici nisu uključeni.

Paleta: #0B1420 / #111B27 / #1B2736; plavo svjetlo #8EBEF4 / #C1DCF7; srebrno #DCE6F3; topli akcent #F3B37D / #FFD9B5. Narančasta je akcent, ne zamjena plavog identiteta. Montserrat ExtraBold 800 / Medium 500, lokalno.

Dark je zadana tema. Light mode u Postavkama koristi svijetlo srebrno-plave površine #F6F8FA / #FFFFFF / #E9EFF5, tamnoplavi tekst #243E59 i topli akcent #BD7438. Čuva isti raspored i slikovne assete; HP i izgled prisutnosti ne ovise o temi. Odabir teme se lokalno sprema, kao i pregled zadataka.

Jezik sučelja bira se kompaktnim zastavicama i HR/EN oznakama u Postavkama; puni nazivi Hrvatski/English ostaju pristupačni. Odabir se pamti, zadano hrvatski. Sučelje i nepromijenjeni demo primjeri imaju prijevode; vlastiti nazivi zadataka/kategorija, profilni podaci, datoteke i poruke ostaju izvorni. Datumi prate hr-HR/en-GB. relAI, step by step i Your future self assistant ostaju jednaki u oba jezika.

Avatari iz v4 ostaju isti. Personalizacija brade i duljine kose čeka završne renderirane varijante. Originalni logo je sačuvan; aktivni vektor zadržava njegove oblike, koristi plavi akcent i stvarno prozirnu pozadinu bez artboard pravokutnika. Integracije su planirane, ne aktivne.


## Prijelaz nakon ulaznog obrasca

Nakon uspješnog slanja početnog profila ili ulaska sa zapamćenim valjanim profilom, kada se prikaže mapa, po mobilnom ekranu pojave se 52 prozirna sapunasta balončića različitih veličina. Plavo-srebrni odsjaji s malo toplog sjaja povezuju prijelaz sa zbirkom dokumenata. Balončići iskaču u valu, lagano se podižu i rasprsnu; cijeli sloj nestaje unutar 2,8 sekundi. Mapa ostaje vidljiva i dostupna za dodir. Animacija se ne pokreće pri uređivanju profila i preskače se uz postavku reduced motion. Implementacija: `src/welcome-bubbles.js` i `src/welcome-bubbles.css`; buduća autentikacija može isti prijelaz pozvati tek nakon uspješne prijave.
