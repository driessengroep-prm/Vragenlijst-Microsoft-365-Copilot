# Vragenlijst Microsoft 365 Copilot

Webformulier waarmee medewerkers de vragenlijst *Microsoft 365 Copilot* invullen, plus een
beheerdersomgeving waarin je per inzending ziet of je voor die persoon een Copilot-licentie
zou moeten afsluiten. De beoordeling volgt het beoordelingsmodel (40/30/20/10 met vier
adviescategorieën).

Alles staat in Driessen Groep-huisstijl: goud, donkergroen, witte kaart en afgeronde knoppen.

| Onderdeel | Adres |
| --- | --- |
| Vragenlijst voor medewerkers | `/` |
| Beheerdersomgeving | `/beheer` |
| CSV-export | `/api/beheer/export.csv` |
| Statuscontrole (voor monitoring) | `/gezondheid` |

Wil je alleen even rondkijken zonder iets te installeren? Er is een statische testversie
voor GitHub Pages, zie [hoofdstuk 2](#2-testversie-op-github-pages).

---

## 1. Snel starten

```bash
npm install          # eenmalig
cp .env.example .env # configuratie aanmaken
# open .env en vul minimaal ADMIN_PASSWORD in
npm run migrate      # maakt de databasetabel aan
npm start            # draait op http://localhost:3000
```

Zonder verdere configuratie schrijft de applicatie naar een SQLite-bestand
(`data/vragenlijst.sqlite`). Dat is puur om te proberen — voor productie koppel je je eigen
database, zie hieronder.

---

## 2. Testversie op GitHub Pages

Voor het doorkijken en doorklikken staat er een statische testversie in `docs/`. Die draait
volledig in de browser: **geen server, geen database en geen inlog**. Inzendingen worden
bewaard in de localStorage van de bezoeker en gaan nergens heen. Iedere bezoeker start met
dezelfde vier voorbeeldinzendingen en ziet alleen zijn eigen invoer.

| Pagina | Adres |
| --- | --- |
| Vragenlijst | `https://driessengroep-prm.github.io/Vragenlijst-Microsoft-365-Copilot/` |
| Beheerderspagina | `https://driessengroep-prm.github.io/Vragenlijst-Microsoft-365-Copilot/beheer.html` |

Bovenaan beide pagina's staat een balk die duidelijk maakt dat het om een testomgeving gaat.
Op de beheerderspagina staat een knop om de voorbeelddata terug te zetten.

### Eenmalig inschakelen

GitHub Pages moet nog aangezet worden; dat kan alleen via de repository-instellingen:

1. Ga naar **Settings** &rarr; **Pages** in de repository.
2. Zet **Source** op *Deploy from a branch*.
3. Kies bij **Branch** de branch `claude/friendly-fermat-k2x1ur` en de map **`/docs`**.
4. Klik op **Save**. Na een minuut staat de site op bovenstaande adressen.

Merge je de branch later naar `main`? Zet de branch in stap 3 dan om naar `main`.

### Let op

- De beheerderspagina is op GitHub Pages **openbaar**: iedereen met het adres kan hem
  openen. Dat kan hier omdat er geen echte gegevens in staan — alleen verzonnen
  voorbeelden en wat de bezoeker zelf invult, in zijn eigen browser. Vul er dus geen echte
  aanvragen in.
- In de echte applicatie zit de beheerdersomgeving wél achter een wachtwoord en schrijven de
  inzendingen naar jouw database.

### Bijwerken

De inhoud van `docs/` wordt gegenereerd uit dezelfde bronbestanden als de echte applicatie:
de vragenlijst, het beoordelingsmodel en de validatie worden letterlijk uit `src/`
overgenomen, zodat de demo dezelfde scores berekent. Wijzig je iets, draai dan:

```bash
npm run build:static
```

en commit de gewijzigde `docs/`. `npm test` controleert of `docs/` nog gelijkloopt met de
bron en geeft een duidelijke melding als dat niet zo is.

---

## 3. Je eigen database koppelen

Alle databasegegevens staan in `.env`. Zodra je de gegevens van je lokale database hebt, vul
je die daar in en draai je `npm run migrate` opnieuw. Verder hoeft er niets te veranderen.

**PostgreSQL**

```ini
DB_CLIENT=postgres
DB_HOST=127.0.0.1
DB_PORT=5432
DB_USER=copilot
DB_PASSWORD=...
DB_NAME=copilot
DB_TABLE=copilot_aanvragen
#DB_SCHEMA=public
```

**MySQL of MariaDB**

```ini
DB_CLIENT=mysql      # of: mariadb
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=copilot
DB_PASSWORD=...
DB_NAME=copilot
```

**Microsoft SQL Server**

```ini
DB_CLIENT=mssql
DB_HOST=127.0.0.1
DB_PORT=1433
DB_USER=copilot
DB_PASSWORD=...
DB_NAME=copilot
```

Voor SQL Server is één extra pakket nodig: `npm install tedious`.

In plaats van losse velden kun je ook één connectiestring opgeven:

```ini
DB_URL=postgres://gebruiker:wachtwoord@127.0.0.1:5432/copilot
```

Controleer de verbinding met `curl http://localhost:3000/gezondheid`.

### Bestaat de tabel al?

`npm run migrate` is veilig om vaker te draaien. Bestaat de tabel nog niet, dan wordt die
aangemaakt. Bestaat hij al, dan worden alleen ontbrekende kolommen toegevoegd — bestaande
gegevens blijven staan.

---

## 4. Wat komt er in de database te staan?

Eén rij per inzending in de tabel `copilot_aanvragen` (naam instelbaar via `DB_TABLE`).
Elk antwoord krijgt een eigen kolom, zodat je er in je eigen database direct op kunt
filteren en rapporteren. Daarnaast staat in `antwoorden_json` het volledige antwoord als
JSON, zodat er niets verloren gaat.

### Kolommen met scores en besluiten

| Kolom | Betekenis |
| --- | --- |
| `id` | Volgnummer van de inzending |
| `ingezonden_op` | Tijdstip van inzenden |
| `score_informatiewerk` | Deelscore informatiewerk (max. 40) |
| `score_businesswaarde` | Deelscore verwachte businesswaarde (max. 30) |
| `score_usecase_automatisch` | Automatische indicatie voor vraag 7 (max. 20) |
| `score_usecase` | Score die daadwerkelijk meetelt voor vraag 7 |
| `usecase_score_handmatig` | Jouw handmatige score, of leeg als je de automatische aanhoudt |
| `score_volwassenheid` | Deelscore AI-volwassenheid (max. 10) |
| `score_totaal` | Totaalscore (0-100) |
| `advies_categorie` | `direct_kandidaat`, `pilotgroep`, `nog_niet` of `geen_businesscase` |
| `besluit` | `nieuw`, `licentie_toekennen`, `pilot`, `nog_niet` of `afgewezen` |
| `besluit_toelichting` | Jouw toelichting bij het besluit |
| `beoordeeld_door` / `beoordeeld_op` | Wie er beoordeelde en wanneer |
| `akkoord_privacy` / `akkoord_contact` | Gegeven toestemmingen |
| `ip_hash` / `user_agent` | Alleen voor misbruikdetectie; het IP-adres zelf wordt niet bewaard |

### Kolommen met de antwoorden

De opgeslagen waarde is de sleutel van het gekozen antwoord; het getal tussen haakjes is het
aantal punten dat die keuze oplevert.

| Kolom | Vraag | Mogelijke waarden (punten) |
| --- | --- | --- |
| `naam` | Naam | vrije tekst |
| `email` | E-mailadres | vrije tekst |
| `functie` | Functie | vrije tekst |
| `afdeling` | Afdeling of organisatieonderdeel | vrije tekst |
| `v1_email` | 1. E-mails verwerken | minder_dan_2_uur (0), 2_tot_5_uur (1), 5_tot_10_uur (2), meer_dan_10_uur (3) |
| `v1_overleggen` | 1. Overleggen/vergaderingen | minder_dan_2_uur (0), 2_tot_5_uur (1), 5_tot_10_uur (2), meer_dan_10_uur (3) |
| `v1_documenten` | 1. Documenten schrijven | minder_dan_2_uur (0), 2_tot_5_uur (1), 5_tot_10_uur (2), meer_dan_10_uur (3) |
| `v1_presentaties` | 1. Presentaties maken | minder_dan_2_uur (0), 2_tot_5_uur (1), 5_tot_10_uur (2), meer_dan_10_uur (3) |
| `v1_zoeken` | 1. Informatie zoeken in documenten, Teams of SharePoint | minder_dan_2_uur (0), 2_tot_5_uur (1), 5_tot_10_uur (2), meer_dan_10_uur (3) |
| `v2` | 2. Werk je regelmatig met grote hoeveelheden informatie uit ver | nooit (0), soms (1), regelmatig (2), dagelijks (3) |
| `v3` | 3. Met hoeveel collega's werk je gemiddeld samen binnen Microso | 1_tot_5 (0), 6_tot_10 (1), 11_tot_25 (2), meer_dan_25 (3) |
| `v4_oude_mails` | 4. Ik zoek informatie in oude mails | nooit (0), soms (1), regelmatig (2), zeer_vaak (3) |
| `v4_documenten_kwijt` | 4. Ik zoek documenten waarvan ik niet meer weet waar ze staan | nooit (0), soms (1), regelmatig (2), zeer_vaak (3) |
| `v4_vergadering_voorbereiden` | 4. Ik moet vergaderingen voorbereiden | nooit (0), soms (1), regelmatig (2), zeer_vaak (3) |
| `v4_context_missen` | 4. Ik mis soms context omdat ik niet bij eerdere gesprekken aanwezig was | nooit (0), soms (1), regelmatig (2), zeer_vaak (3) |
| `v4_informatie_combineren` | 4. Ik moet informatie uit meerdere documenten combineren | nooit (0), soms (1), regelmatig (2), zeer_vaak (3) |
| `v4_samenvatten` | 4. Ik maak samenvattingen van lange documenten of overleggen | nooit (0), soms (1), regelmatig (2), zeer_vaak (3) |
| `v5` | 5. Welke van onderstaande werkzaamheden zouden volgens jou het  | kommagescheiden lijst van gekozen waarden |
| `v5_anders` | Toelichting bij "Anders, namelijk" | vrije tekst |
| `v6` | 6. Hoeveel tijd denk je wekelijks te kunnen besparen met Copilo | minder_dan_30_min (0), 30_tot_60_min (1), 1_tot_2_uur (2), 2_tot_4_uur (3), meer_dan_4_uur (4) |
| `v7` | 7. Kun je één concreet voorbeeld beschrijven waarbij Copilot jo | vrije tekst |
| `v8` | 8. Maak je al gebruik van Copilot Chat? | nee (0), af_en_toe (1), regelmatig (2), dagelijks (3) |
| `v9` | 9. Hoe beoordeel je jouw vaardigheid in het werken met AI? | beginner (0), basis (1), gevorderd (2), expert (3) |
| `v10` | 10. Ben je bereid tijd te investeren in het leren gebruiken van  | nee (0), beperkt (1), ja (2), ja_en_delen (3) |

Handige query om te zien wie in aanmerking komt:

```sql
SELECT naam, email, afdeling, score_totaal, advies_categorie, besluit
FROM copilot_aanvragen
WHERE advies_categorie IN ('direct_kandidaat', 'pilotgroep')
ORDER BY score_totaal DESC;
```

---

## 5. Het beoordelingsmodel

De totaalscore van 100 punten is opgebouwd uit vier onderdelen, precies volgens het
beoordelingskader:

| Onderdeel | Vragen | Gewicht |
| --- | --- | --- |
| Informatiewerk | 1 t/m 4 | 40 punten |
| Verwachte businesswaarde | 5 en 6 | 30 punten |
| Concreet use case voorbeeld | 7 | 20 punten |
| AI-volwassenheid | 8 t/m 10 | 10 punten |

De totaalscore bepaalt de adviescategorie:

| Score | Advies | Betekenis |
| --- | --- | --- |
| 80-100 | **Direct kandidaat** | Licentie toekennen |
| 60-79 | **Pilotgroep** | Toekennen met proefperiode van 2-3 maanden |
| 40-59 | **Nog niet** | Eerst optimaal leren werken met Copilot Chat binnen E5 |
| 0-39 | **Geen businesscase** | Geen aanvullende Copilot-licentie |

### Hoe de punten binnen een onderdeel verdeeld zijn

Het kader geeft de gewichten; de verdeling daarbinnen is als volgt ingevuld. Elke
antwoordoptie heeft een puntenwaarde (zie de tabel in hoofdstuk 4). Binnen een onderdeel
worden die punten opgeteld en daarna naar het gewicht van dat onderdeel geschaald.

- **Informatiewerk (40 punten)** — de vijf activiteiten uit vraag 1, vraag 2, vraag 3 en de
  zes situaties uit vraag 4 tellen allemaal mee. Wie overal het hoogste antwoord geeft,
  haalt de volle 40 punten.
- **Verwachte businesswaarde (30 punten)** — de verwachte tijdwinst uit vraag 6 weegt het
  zwaarst (24 punten); de breedte van de genoemde toepassingen uit vraag 5 levert maximaal
  6 punten op (vanaf vier aangevinkte toepassingen is dat maximum bereikt). Iemand met veel
  aangevinkte vakjes maar weinig verwachte tijdwinst scoort dus lager dan andersom.
- **Concreet use case voorbeeld (20 punten)** — zie hieronder.
- **AI-volwassenheid (10 punten)** — vragen 8, 9 en 10 wegen even zwaar.

Wil je een andere verdeling? Pas de `punten` per antwoordoptie aan in `src/vragenlijst.js`,
of de gewichten in `src/scoring.js`. Draai daarna `npm test`: die controleert onder meer of
de gewichten nog optellen tot 100 en of de categoriegrenzen op elkaar aansluiten.

### Vraag 7 beoordeel je zelf

Vraag 7 is een open vraag en laat zich niet volautomatisch beoordelen. De applicatie geeft
daarom een **automatische indicatie** (0-20 punten) op basis van hoe uitgewerkt, concreet en
meetbaar het antwoord is. In de beheerdersomgeving zie je precies waarop die indicatie is
gebaseerd, en kun je er zelf een score voor in de plaats zetten. De totaalscore en de
adviescategorie worden dan meteen opnieuw berekend en teruggeschreven naar de database.

Mijn advies: loop de open antwoorden altijd even zelf na voordat je een besluit neemt. De
automatische indicatie is bedoeld om te sorteren, niet om te beslissen.

### Profielkenmerken naast de score

Het kader beschrijft bij *Direct kandidaat* vier kenmerken (kenniswerker, veel
vergaderingen/documenten/e-mails, concreet gebruiksscenario, tijdwinst groter dan 2 uur per
week). Die worden per inzending apart getoond met een vinkje, zodat je kunt zien of het
profiel achter de score klopt met het beeld dat het kader schetst.

---

## 6. De beheerdersomgeving

Ga naar `/beheer` en log in met `ADMIN_USER` en `ADMIN_PASSWORD` uit je `.env`. Zonder
`ADMIN_PASSWORD` is de beheerdersomgeving uitgeschakeld.

Je ziet daar:

- het aantal inzendingen per adviescategorie, klikbaar als filter;
- een overzichtstabel gesorteerd op score, met per inzending de opbouw in vier balkjes;
- filters op categorie, besluit, naam, e-mailadres en afdeling;
- per inzending een detailpaneel met de score-opbouw, de profielkenmerken, alle antwoorden
  en de onderbouwing van de automatische indicatie voor vraag 7;
- een formulier om je besluit vast te leggen (licentie toekennen, pilotgroep, nog niet,
  afgewezen) met toelichting;
- een CSV-export van alles, met puntkomma's als scheidingsteken zodat Excel hem direct
  goed opent.

---

## 7. Huisstijl aanpassen

- **Logo** — `public/assets/img/logo.svg` is een plaatshouder. Vervang het bestand door het
  officiële logo; het formaat maakt niet uit, de hoogte wordt in de stylesheet geregeld.
- **Kleuren en vormen** — staan bovenaan `public/assets/css/driessen.css` als variabelen
  onder `:root`. Wijzig je daar een waarde, dan volgen beide pagina's automatisch.
- **Lettertype** — Poppins wordt geladen via Google Fonts. Draait de applicatie in een
  omgeving zonder internettoegang, dan valt hij netjes terug op Segoe UI. Wil je het
  lettertype meeleveren, zet dan de `woff2`-bestanden in `public/assets/` en vervang de
  `<link>` naar Google Fonts in `public/index.html` en `src/views/beheer.html` door een
  `@font-face`-regel.

---

## 8. Vragen toevoegen of wijzigen

De vragenlijst staat volledig in `src/vragenlijst.js`. Dat bestand is de enige bron van
waarheid: het formulier, de validatie, de puntentelling, de databasekolommen en de
CSV-export volgen er allemaal uit.

Een vraag toevoegen:

1. Voeg de vraag toe in `src/vragenlijst.js`, met per antwoordoptie een `punten`-waarde en
   het `onderdeel` waar hij bij hoort.
2. Draai `npm run migrate` — de nieuwe kolom wordt toegevoegd.
3. Draai `npm test` om te controleren of het model nog klopt.

---

## 9. Beveiliging en privacy

- Het formulier is openbaar; de beheerdersomgeving en alle beheerders-API's zitten achter
  een wachtwoord.
- Per IP-adres zijn maximaal vijf **geslaagde** inzendingen per kwartier toegestaan
  (instelbaar via `RATE_LIMIT`). Invulfouten tellen niet mee.
- Een verborgen veld vangt eenvoudige spambots af.
- Alle invoer wordt op de server opnieuw gecontroleerd; de controle in de browser is alleen
  bedoeld om de bezoeker snel te helpen.
- Antwoorden worden als tekst weggezet met parameterbinding, dus nooit als HTML uitgevoerd.
- Van het IP-adres wordt alleen een onomkeerbare hash bewaard, met een eigen `IP_HASH_SALT`.
  Wil je ook dat niet bewaren, zet dan `BEWAAR_IP_HASH=false`.
- Zet de applicatie achter HTTPS voordat je hem openstelt, en zet dan `TRUST_PROXY=true`.

De vragenlijst verzamelt naam, e-mailadres, functie en afdeling. Die velden zijn toegevoegd
omdat je anders niet weet voor wie je een besluit neemt; ze staan niet in het oorspronkelijke
Word-document. Op het formulier staat een verplichte akkoordverklaring en een losse,
optionele vraag of de medewerker benaderd mag worden.

---

## 10. Bestandsindeling

```
src/
  server.js           Webserver en routes
  config.js           Instellingen uit .env
  vragenlijst.js      De vragenlijst: vragen, antwoorden en punten
  scoring.js          Het beoordelingsmodel
  validatie.js        Controle van inzendingen
  db/
    index.js          Databaseverbinding
    migrate.js        Tabel aanmaken en bijwerken
  routes/
    formulier.js      Publieke API
    beheer.js         Beheerders-API
  middleware/
    auth.js           Inloggen op de beheerdersomgeving
  views/
    beheer.html       De beheerdersomgeving (bewust buiten public/, zodat de
                      pagina alleen na inloggen wordt uitgeleverd)
public/
  index.html          De vragenlijst
  assets/css/         Huisstijl
  assets/js/          Formulier- en beheerlogica
  assets/img/         Logo (plaatshouder) en favicon
test/                 Tests op het model, de validatie en de statische versie
tools/
  bouw-statisch.js    Genereert de testversie in docs/
  statisch/demo-api.js  Demolaag die /api/ in de browser afhandelt
docs/                 Gegenereerde testversie voor GitHub Pages
```

---

## 11. In productie draaien

Zet de applicatie achter een reverse proxy met HTTPS en houd het proces draaiend met
bijvoorbeeld `systemd` of `pm2`:

```bash
NODE_ENV=production npm start
```

Controleer daarna `/gezondheid`; die geeft `{"status":"ok"}` zodra de database bereikbaar is.
