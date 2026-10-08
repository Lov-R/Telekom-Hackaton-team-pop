> Aktualni target: Lovable Cloud. Prvo pročitati `LOVABLE-CLOUD-PLAN.md` i `../PDR-relAI.md`. Ovaj dokument čuva ranije prijedloge mapiranja; ne pretpostavlja zaseban Supabase projekt.

# Povezivanje na Supabase — kasnija faza

Ovaj paket je UX prototip. Ne povezuje se s bazom, ne šalje fotografije na server i ne traži pristup Apple računu.

## Granica između sučelja i baze

- `src/storage.js` trenutno sprema demo stanje u localStorage.
- `src/evidence.js` sprema fotografije u IndexedDB; u Supabase verziji upload ide u privatni Storage bucket.
- `src/domain.mjs` opisuje pravila igre i tekstove obavijesti. U funkcionalnoj aplikaciji bodovanje, kazne i provjera obaveznog dokaza moraju se ponovno provesti na serveru.
- `integration/contracts.ts` definira očekivane modele i operacije za budući adapter.
- `src/ui/mount.js` sadrži korisničke tokove. Fotografski dokaz ne znači automatsku provjeru da je zadatak zaista izvršen.

## Predloženo mapiranje na postojeću bazu

| Model | Predložena tablica | Napomena |
| --- | --- | --- |
| Korisnik i avatar | profiles | Supabase Auth `auth.users.id` kao vlasnik |
| Zadaci | tasks | UTC `due_at`, važnost, težina, `proof_possible`, `proof_policy` |
| Dokazi | task_proofs | Privatni Storage put; nikad javni URL |
| XP i HP | progress + task_events | Jedna transakcija, jedinstveni događaj dovršavanja |
| Tjedne utrke | weekly_progress | Tjedan prema korisnikovoj vremenskoj zoni |
| Nagrade | reward_inventory | Jedinstveno `(user_id, reward_id)` |
| Friend circle | circles + circle_members | Dijeli se napredak, ne sadržaj zadataka |
| Push | push_subscriptions + notification_preferences + notification_jobs | Privatni VAPID ključ samo na serveru |
| Apple kalendar | calendar_connections + calendar_event_links | Stabilno mapiranje događaja; zaštita od duplikata i sync petlji |

Prilagodi nazive već postojećoj bazi; ne zamjenjuj postojeće tablice ovim planom. Nema automatske migracije.

## Pravila za produkcijsku implementaciju

1. RLS veže zadatke i dokaze uz `auth.uid()`. Članstvo u krugu ne otvara pristup fotografijama.
2. Fotografije: privatni bucket, provjera formata/veličine na serveru, uklanjanje EXIF-a, kratkotrajni potpisani URL-ovi. Klijentska provjera je samo pomoć UX-u.
3. `completeTask` zaključava zadatak, provjerava vlasnika/status/dokaz i atomarno dodjeljuje +1 polje i XP. Ponovljeni poziv ne dodjeljuje nagradu ponovno.
4. Kazne za važnost 1/2/3 u ovom UX-u su 5/10/20 HP. HP je između 0 i 100. Odgoda prije roka ne kažnjava. Konačni grace period treba odrediti prije uvođenja pravih rokova.
5. Tjedne utrke koriste zasebne brojače; ukupni XP i nagrade se ne brišu. Reset dugme postoji samo u demu.
6. Supabase Cron/Edge Function računa dospjele podsjetnike i provjerava da zadatak još nije dovršen. Poštuj mirne sate, dozvolu, odjavu i deduplikaciju. Nemoj oduzimati HP samo zato što korisnik nije dopustio push.
7. U browser nikad ne stavljati Supabase service-role ili privatni VAPID ključ.

## Push i Apple Kalendar

`future-push/` sadrži neuključene početne primjere klijenta i service workera. Oni nisu aktivni u UX-u i sami nisu kompletan sustav: trebaju autentikaciju, server, VAPID ključeve, raspored i testiranje na uređaju.

iPhone web push zahtijeva web aplikaciju dodanu na početni zaslon, iOS/iPadOS 16.4+ i korisničku dozvolu. HTTPS je potreban izvan localhost razvoja.

Web prototip ne može čitati Apple Kalendar preko EventKita. Za punu sinkronizaciju odaberi native iOS omotač s EventKitom ili zaseban podržani serverski iCloud konektor. Ne implementirati lažni “Sign in with Apple = pristup kalendaru”. `.ics` izvoz u ovom paketu je jednokratni izvoz, ne sinkronizacija.

Službena dokumentacija:

- https://supabase.com/docs/guides/storage/security/access-control
- https://supabase.com/docs/guides/functions/schedule-functions
- https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/
- https://developer.apple.com/documentation/eventkit/accessing-the-event-store
