# Lovable Cloud — plan integracije 0.10.1

Aktualna specifikacija je `PDR-relAI.md`. Target je novi Lovable Cloud projekt, s postojećim UX-om i lokalnim assetima. Niti jedan cloud resurs u ovoj fazi nije izrađen ili aktiviran.

1. Pregledati postojeći Lovable projekt i paralelno razvijanu bazu prije pisanja migracija. Vanjski Supabase i Cloud nisu ista instanca; prijenos podataka ne pretpostavlja se automatski.
2. Prenijeti React/Vite izvor, assete i Montserrat; ne prenositi localStorage demo podatke korisnicima. Zadržati aktualni uvod, kartu, avatare, HP-only prisutnost i četiri taba.
3. Mapirati `contracts.ts` na Cloud auth, profile, zadatke i privatni Storage. `src/ui/mount.js` zasad je imperativni UX sloj u React wrapperu; backend adapter uvoditi postupno i po potrebi izdvojiti prikaze u React komponente bez promjene dizajna.
4. Serverski default: HP 0, peak HP 0, XP 0, koraci 0. Jedna autorizirana transakcija dovršava zadatak i dodjeljuje +1 korak, XP i +5 HP. Peak HP nikada ne pada. Inventar ima unique `(owner_id,reward_id)`.
5. HP nagrade na 25/50/75/100 provjeravati prema peak HP-u. Klijent ne može sam otključavati nagrade. Pad trenutnog HP-a ne oduzima već osvojene kozmetičke stavke.
6. `src/assistant-preview.js` zamijeniti autentificiranim backend/SSE adapterom. Ukinuti oznaku UX demo tek kada je AI spojen i testiran. Kontekst svesti na dopuštene podatke korisnika; slanje poruke samo po sebi ne mijenja obveze ili bodove.
7. Dokumenti i dokazi ostaju privatni. Članstvo u friend circleu otvara samo dopušten napredak. Upload zahtijeva serversku provjeru datoteke i vlasništva.
8. Push i Apple Calendar dodati nakon zasebne implementacije dozvola, rasporeda i konektora. ICS je jednosmjerni izvoz.
9. Profil iz uvodnog obrasca povezati s autentifikacijom. Trenutačni frontend sprema ime, prezime, datum rođenja, spol i username samo lokalno; lozinke ne sprema i ne provjerava. Provjeru zauzetosti usernamea, sesije i stvarnu promjenu lozinke implementirati kroz autentifikacijski servis.
10. Kategorije su zasebni zapisi po vlasniku, s opcionalnim roditeljem i stabilnim ID-em. Zadaci i dokumenti referenciraju isti katalog. Preimenovanje ne smije mijenjati ID-eve ni odvezati postojeće podatke. Server mora provjeravati vlasništvo, dvije razine i zabranu ciklusa.
11. `expiresOn` dokumenta je neobavezan datum bez vremena. Vidljive oznake isteka zasad su lokalni UX; stvarne obavijesti o isteku zahtijevaju backend raspored i korisničke postavke. Ne pretpostavljati OCR ili automatsko prepoznavanje dokumenata.
12. Spremati postavke `theme` (dark/light), `taskView` (day/week/month) i `language` (hr/en, zadano hr) uz korisnika. Trenutačna lokalna pohrana služi za testiranje dizajna. Sačuvati kompaktni HR/EN odabir sa zastavicama u Postavkama i locale hr-HR/en-GB.
13. Zapamti me / Remember me zadano je isključen. U početnoj formi boolean se sprema tek nakon valjanog slanja, a može se promijeniti u Postavkama → Račun. U lokalnom UX-u preskače ponovni obrazac samo uz potpun valjan spremljeni profil; uvod ostaje i ulaz pokreće iste balončiće. Isključivanje vraća obrazac s popunjenim profilom i praznom lozinkom pri sljedećem ulasku. `DeviceSessionPreferences.rememberMe` pripada uređaju, ne sinkroniziranim postavkama prikaza. Za produkciju odabir mora konfigurirati zadržavanje sesije kroz auth provider; lokalni flag ne autorizira pristup. Lozinka, token i stvarna sesija u prototipu se ne spremaju.
14. Jezik lokalizira sučelje i izvorne ugrađene primjere, bez prepisivanja korisničkih naziva, poruka i profilnih podataka. ID-jevi, rokovi i napredak ne ovise o jeziku. Budući AI i serverske obavijesti dobivaju jezičnu postavku kroz backend; UI prijevod nije aktivan AI/OCR niti automatski prijevod dokumenata.

Aktualni slogan uvoda: HR **Na budućeg sebe se uvijek možeš osloniti.** / EN **You can always rely on your future self.** Izvorni primjeri zadataka prevode se za prikaz samo ako naslov nije promijenjen; preimenovani naslov mora ostati jednak kroz HR → EN → HR.

Službeni opis: [Lovable Cloud](https://docs.lovable.dev/features/cloud), [AI za aplikaciju](https://docs.lovable.dev/features/ai). Potvrđeno 8. listopada 2026. Nema tvrdnje da je ovaj lokalni paket već deployan ili automatski povezan s bazom.
