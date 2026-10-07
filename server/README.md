# LogiQ server (učiteľské / rodičovské prostredie)

Malý server na **Cloudflare Workers** (bezplatný plán stačí). Ukladá len prezývku žiaka, triedu a čísla o postupe (hviezdy, body, úlohy).
Kód je na GitHube, **dáta žiakov nie** (GitHub nevie bezpečne prijímať zápisy z iPadov a verejný repozitár by detské údaje zverejnil).

## Nasadenie (jednorazovo, ~10 minút)
1. Vytvor bezplatný účet na https://dash.cloudflare.com (potrebuje e-mail).
2. V termináli: `cd ~/Desktop/LogiQ/server` a `npx wrangler login` (otvorí sa prehliadač, povoľ prístup).
3. `npx wrangler kv namespace create LOGIQ_DB` – vypíše `id = "..."`; vlož ho do `wrangler.toml` namiesto `DOPLN_ID_Z_PRIKAZU`.
4. `npx wrangler secret put ADMIN_PASSWORD` – **sám napíš** heslo správcu (min. 12 znakov). Prihlasuješ sa ním ako používateľ `admin`.
5. `npx wrangler deploy` – vypíše adresu `https://logiq-api.<tvoje-meno>.workers.dev`.
6. Túto adresu vlož do `js/config.js` (`window.LOGIQ_API = '...'`), potom `git add -A && git commit -m "server" && git push`.

## Používanie
- **Správca** (`admin`): v aplikácii Profil → Učiteľ, správca, rodič → vytvára účty učiteľov (e-mail + dočasné heslo) a vidí všetky triedy.
- **Učiteľ**: vytvorí triedu (2.A – 9.C), dostane 6-znakový kód. Žiaci ho zadajú pri prvom spustení alebo v Profile.
- **Rodič**: v aplikácii „Rodičovský prístup“ zadá 8-znakový kód žiaka (vidí ho žiak v Profile aj učiteľ) – vidí len tohto jedného žiaka.

## Ochrana údajov (dôležité pre školu)
- Používaj iba **meno/prezývku** žiaka, nie priezvisko. Rodičom oznám, aké údaje sa ukladajú (prezývka, trieda, postup) a že ich vie učiteľ vymazať.
- Zmazanie žiaka alebo celej triedy je v učiteľskom prostredí. Heslá sú uložené len ako PBKDF2 hash.
- Pred ostrým nasadením to konzultuj s poverencom pre ochranu osobných údajov školy (GDPR).

## Databáza (D1)
Triedy, žiaci, učitelia a zadania sú v databáze Cloudflare D1 (`logiq`), schéma je v `schema.sql`:
`npx wrangler d1 create logiq` → id vlož do `wrangler.toml` → `npx wrangler d1 execute logiq --remote --file=schema.sql` → `npx wrangler deploy`.
KV sa používa už len na prihlasovacie relácie a limit pokusov.
