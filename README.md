# Vragenlijst Microsoft 365 Copilot

Webformulier waarmee medewerkers de vragenlijst *Microsoft 365 Copilot* invullen, plus een
beheerdersomgeving waarin je per inzending ziet of je voor die persoon een Copilot-licentie
zou moeten afsluiten. De score wordt volledig berekend uit de meerkeuzeantwoorden
(50/38/12 met vier adviescategorieën). Valt iemand in de middelste categorie, dan vraagt het
formulier zelf om een concrete use case.

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
3. Kies bij **Branch** de branch `main` en de map **`/docs`**.
4. Klik op **Save**. Na een minuut staat de site op bovenstaande adressen.

Vanaf dat moment werkt elke push naar `main` die `docs/` wijzigt de testversie automatisch
bij; je hoeft deze instelling maar één keer te doen.

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

Het script verwijdert nooit kolommen. Heb je de tabel aangemaakt toen de vragenlijst nog een
open vraag 7 bevatte, dan blijven `v7`, `score_usecase`, `score_usecase_automatisch` en
`usecase_score_handmatig` bestaan. Ze worden niet meer gevuld en mogen weg; dat doe je
desgewenst zelf, bijvoorbeeld met `ALTER TABLE copilot_aanvragen DROP COLUMN v7;`.

Scores van eerdere inzendingen worden bij het openen van de beheerdersomgeving opnieuw
berekend met het huidige model, dus oude en nieuwe inzendingen blijven onderling
vergelijkbaar.

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
| `score_informatiewerk` | Deelscore informatiewerk (max. 50) |
| `score_businesswaarde` | Deelscore verwachte businesswaarde (max. 38) |
| `score_volwassenheid` | Deelscore AI-volwassenheid (max. 12) |
| `score_totaal` | Totaalscore (0-100) |
| `advies_categorie` | `hoge_prioriteit`, `geschikt_mits`, `eerst_training` of `geen_licentie` |
| `besluit` | `nieuw`, `licentie_toekennen`, `training_eerst` of `afgewezen` |
| `besluit_toelichting` | Jouw toelichting bij het besluit |
| `beoordeeld_door` / `beoordeeld_op` | Wie er beoordeelde en wanneer |
| `akkoord_privacy` / `akkoord_contact` | Gegeven toestemmingen |
| `bevestiging_verzonden` | Of de bevestigingsmail is verstuurd |
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
| `v2` | 2. Werk je regelmatig met grote hoeveelheden informatie uit ve | nooit (0), soms (1), regelmatig (2), dagelijks (3) |
| `v3` | 3. Met hoeveel collega's werk je gemiddeld samen binnen Micros | 1_tot_5 (0), 6_tot_10 (1), 11_tot_25 (2), meer_dan_25 (3) |
| `v4_oude_mails` | 4. Ik zoek informatie in oude mails | nooit (0), soms (1), regelmatig (2), zeer_vaak (3) |
| `v4_documenten_kwijt` | 4. Ik zoek documenten waarvan ik niet meer weet waar ze staan | nooit (0), soms (1), regelmatig (2), zeer_vaak (3) |
| `v4_vergadering_voorbereiden` | 4. Ik moet vergaderingen voorbereiden | nooit (0), soms (1), regelmatig (2), zeer_vaak (3) |
| `v4_context_missen` | 4. Ik mis soms context omdat ik niet bij eerdere gesprekken aanwezig was | nooit (0), soms (1), regelmatig (2), zeer_vaak (3) |
| `v4_informatie_combineren` | 4. Ik moet informatie uit meerdere documenten combineren | nooit (0), soms (1), regelmatig (2), zeer_vaak (3) |
| `v4_samenvatten` | 4. Ik maak samenvattingen van lange documenten of overleggen | nooit (0), soms (1), regelmatig (2), zeer_vaak (3) |
| `v5` | 5. Welke van onderstaande werkzaamheden zouden volgens jou het | kommagescheiden lijst van gekozen waarden |
| `v5_anders` | Toelichting bij "Anders, namelijk" | vrije tekst |
| `v6` | 6. Hoeveel tijd denk je wekelijks te kunnen besparen met Copil | minder_dan_30_min (0), 30_tot_60_min (1), 1_tot_2_uur (2), 2_tot_4_uur (3), meer_dan_4_uur (4) |
| `v8` | 7. Maak je al gebruik van Copilot Chat? | nee (0), af_en_toe (1), regelmatig (2), dagelijks (3) |
| `v9` | 8. Hoe beoordeel je jouw vaardigheid in het werken met AI? | beginner (0), basis (1), gevorderd (2), expert (3) |
| `v10` | 9. Ben je bereid tijd te investeren in het leren gebruiken van | nee (0), beperkt (1), ja (2), ja_en_delen (3) |
| `use_case` | Beschrijf één concrete, terugkerende situatie waarin Microsoft *(alleen bij geschikt_mits)* | vrije tekst |

De kolomnamen liggen vast en veranderen niet als de nummering van de vragen wijzigt. De
oorspronkelijke vraag 7 (een open vraag) is vervallen; daardoor staan de vragen met kolomnaam
`v8`, `v9` en `v10` nu op het formulier als vraag 7, 8 en 9.

Handige query om te zien wie in aanmerking komt:

```sql
SELECT naam, email, afdeling, score_totaal, advies_categorie, besluit
FROM copilot_aanvragen
WHERE advies_categorie IN ('hoge_prioriteit', 'geschikt_mits')
ORDER BY score_totaal DESC;
```

---

## 5. Het beoordelingsmodel

De score wordt volledig berekend uit de meerkeuzeantwoorden. De open vraag naar een concreet
use case-voorbeeld is vervallen; de 20 punten daarvan zijn herverdeeld over de overgebleven
onderdelen.

| Onderdeel | Vragen | In het kader | Nu |
| --- | --- | --- | --- |
| Informatiewerk | 1 t/m 4 | 40% | **50 punten** |
| Verwachte businesswaarde | 5 en 6 | 30% | **38 punten** |
| Concreet use case voorbeeld | (vervallen) | 20% | – |
| AI-volwassenheid | 7 t/m 9 | 10% | **12 punten** |

De totaalscore bepaalt de adviescategorie. Microsoft 365 Copilot-licenties worden voor
minimaal een jaar afgesloten, dus een proefperiode van 2-3 maanden kan niet worden toegezegd;
de categorieën beschrijven daarom prioriteit en voorwaarden.

| Score | Advies | Betekenis |
| --- | --- | --- |
| vanaf 75 | **Hoge prioriteit voor jaarlicentie** | Als eerste in aanmerking |
| 60 tot 75 | **Geschikt, mits** | Toekennen mits concrete use case en commitment |
| 45 tot 60 | **Eerst training of begeleiding** | Eerst Copilot Chat binnen E5, daarna opnieuw beoordelen |
| onder 45 | **Vooralsnog geen licentie** | Geen aanvullende Copilot-licentie |

Een score kan een decimaal hebben, dus de categorie wordt bepaald op de ondergrens: 59,6
punten valt onder *Eerst training*, 74,9 onder *Geschikt, mits*.

### De vervolgvraag bij "Geschikt, mits"

Bij deze categorie is de score alleen niet genoeg: er moet een concrete, terugkerende use case
tegenover staan. Die vragen we daarom bij de invuller zelf uit, direct bij het verzenden:

1. De invuller vult de negen meerkeuzevragen in en klikt op **Verzenden**.
2. De server berekent de score. Valt die tussen 60 en 75, dan wordt de inzending **nog niet
   opgeslagen**, maar verschijnt er één extra vraag op het formulier.
3. Pas als die is beantwoord, wordt de aanvraag opgeslagen.

Bij alle andere categorieën verschijnt de vraag niet en wordt er meteen opgeslagen.

Een paar keuzes die daarbij horen:

- **De server beslist, niet de browser.** Het beoordelingsmodel en de puntenwaarden worden
  niet naar de browser gestuurd. Een invuller kan dus niet terugrekenen welke antwoorden het
  hoogst scoren, en de vervolgvraag niet omzeilen door hem leeg te laten.
- **Het antwoord telt niet mee in de score.** Het is onderbouwing voor jou, geen punten.
- **Afhaken betekent geen aanvraag.** Wie de vervolgvraag niet invult, staat niet in je
  database. Dat is bewust: een aanvraag zonder onderbouwing kun je in deze categorie toch niet
  beoordelen. Wil je die halve inzendingen wél bewaren, laat het weten — dat is een kleine
  aanpassing.
- **Het antwoord staat in de kolom `use_case`** en wordt in de beheerdersomgeving bovenaan het
  detailpaneel getoond, direct onder het advies.

Wil je ook bij een andere categorie om een toelichting vragen? Zet in `src/vragenlijst.js` de
`voorwaarde` van de vraag op die categorie, of voeg een tweede voorwaardelijke vraag toe.

### Hoe de punten binnen een onderdeel verdeeld zijn

Elke antwoordoptie heeft een puntenwaarde (zie de tabel in hoofdstuk 4). Binnen een onderdeel
worden die punten opgeteld en daarna naar het gewicht van dat onderdeel geschaald.

- **Informatiewerk (50 punten)** — de vijf activiteiten uit vraag 1, vraag 2, vraag 3 en de
  zes situaties uit vraag 4 tellen allemaal mee. Wie overal het hoogste antwoord geeft,
  haalt de volle 50 punten.
- **Verwachte businesswaarde (38 punten)** — de verwachte tijdwinst uit vraag 6 weegt het
  zwaarst (30 punten); de breedte van de genoemde toepassingen uit vraag 5 levert maximaal
  8 punten op (vanaf vier aangevinkte toepassingen is dat maximum bereikt). Iemand met veel
  aangevinkte vakjes maar weinig verwachte tijdwinst scoort dus lager dan andersom.
- **AI-volwassenheid (12 punten)** — vragen 7, 8 en 9 wegen even zwaar.

Wil je een andere verdeling? Pas de `punten` per antwoordoptie aan in `src/vragenlijst.js`,
of de gewichten in `src/scoring.js`. Draai daarna `npm test`: die controleert onder meer of
de gewichten nog optellen tot 100 en of elke mogelijke score in een categorie valt.

### Profielkenmerken naast de score

Het kader beschrijft bij *Direct kandidaat* een aantal kenmerken. Vier daarvan worden per
inzending apart getoond met een vinkje: kenniswerker, veel vergaderingen/documenten/e-mails,
meerdere concrete toepassingen genoemd, en een verwachte tijdwinst van meer dan 2 uur per
week. Zo zie je of het profiel achter de score klopt met het beeld dat het kader schetst.

Omdat de score volledig automatisch tot stand komt, is dat het moment om even mee te kijken:
twee mensen met dezelfde score kunnen een heel verschillend profiel hebben.

---

## 6. De beheerdersomgeving

Ga naar `/beheer` en log in met `ADMIN_USER` en `ADMIN_PASSWORD` uit je `.env`. Zonder
`ADMIN_PASSWORD` is de beheerdersomgeving uitgeschakeld.

Je ziet daar:

- het aantal inzendingen per adviescategorie, klikbaar als filter;
- een overzichtstabel gesorteerd op score, met per inzending de opbouw in vier balkjes;
- filters op categorie, besluit, naam, e-mailadres en afdeling;
- per inzending een detailpaneel met de score-opbouw, de profielkenmerken en alle
  antwoorden, met bovenaan de onderbouwing als de invuller daarom is gevraagd;
- een formulier om je besluit vast te leggen (jaarlicentie toekennen, eerst training,
  afgewezen) met toelichting;
- een CSV-export van alles, met puntkomma's als scheidingsteken zodat Excel hem direct
  goed opent.

---

## 7. Bevestigingsmail aan de invuller

Wie de vragenlijst volledig verstuurt, krijgt een bevestiging per e-mail in de huisstijl. De
mail bevestigt alleen de ontvangst en herhaalt naam, functie, afdeling, de datum en — als die
is uitgevraagd — de eigen toelichting.

**De mail bevat bewust geen score, categorie of advies.** Dat is informatie voor jou als
beheerder, niet voor de invuller. Er is een test die daarop controleert, zodat dat niet per
ongeluk verandert.

### Inschakelen

Draai op de server waar de applicatie staat:

```bash
npm run mail:instellen
```

Dat stelt een paar vragen (welke mailserver, welk afzendadres) en schrijft de `MAIL_`-regels
in `.env`. Je hoeft dus niet zelf op te zoeken welke variabelen er zijn. Het wachtwoord wordt
tijdens het typen afgeschermd en komt nergens in beeld of in de samenvatting.

Controleer daarna of het werkt, zonder eerst de vragenlijst in te vullen:

```bash
npm run mail:test -- jouw.adres@driessen.nl
```

Die opdracht maakt eerst verbinding, stuurt dan een testmail met `[TEST]` in het onderwerp, en
vertaalt veelvoorkomende fouten naar iets waar je wat mee kunt. Er wordt niets in de database
gezet. Herstart de applicatie als alles klopt.

Liever met de hand? Dit zijn de regels in `.env`:

```ini
MAIL_HOST=smtp.driessen.nl
MAIL_PORT=587
MAIL_SECURE=false            # true voor SMTPS op poort 465
MAIL_USER=
MAIL_PASSWORD=
MAIL_FROM=Driessen Groep <noreply@driessen.nl>
MAIL_REPLY_TO=copilot@driessen.nl
```

Zonder `MAIL_HOST` wordt er geen mail verstuurd en werkt de vragenlijst gewoon door.
`MAIL_REPLY_TO` is het adres waar antwoorden van medewerkers naartoe gaan; laat je het leeg,
dan komen die bij het afzendadres terecht.

### Aandachtspunten per soort mailserver

| Route | Waar je op moet letten |
| --- | --- |
| **Microsoft 365 / Exchange Online** | `smtp.office365.com`, poort 587. Microsoft zet SMTP AUTH standaard uit; laat dat aanzetten voor de postbus die je gebruikt, of gebruik een relay-connector. Staat er MFA op het account, dan heb je een app-wachtwoord nodig. |
| **Interne mailserver of relay** | Vaak poort 25 zonder inloggegevens, omdat de relay het IP-adres van de server vertrouwt. Gebruikt die een eigen certificaat dat niet door een publieke CA is uitgegeven, zet dan `MAIL_TLS_ONVEILIG=true`. Doe dat alleen voor een server op je eigen netwerk. |
| **Externe maildienst** | Gebruikersnaam is vaak letterlijk `apikey`, wachtwoord is de API-sleutel. Regel SPF en DKIM voor het domein in `MAIL_FROM`, anders komt de mail in de ongewenste post terecht. |

Komt het versturen wél goed door maar arriveert de mail niet, dan zit het aan de ontvangende
kant: controleer SPF en DKIM voor het domein in `MAIL_FROM`.

### Als het versturen mislukt

Het versturen gebeurt ná het opslaan. Gaat er iets mis met de mailserver, dan is de aanvraag
dus nog steeds bewaard en krijgt de invuller gewoon het bedankscherm te zien. De fout komt in
het logboek van de server, en in de kolom `bevestiging_verzonden` staat `false`. In de
beheerdersomgeving zie je onderaan het detailpaneel of de bevestiging is verstuurd — handig
als iemand belt met "ik heb niets gehoord".

### Let op

- Wie de vervolgvraag bij *Geschikt, mits* niet invult, verstuurt geen volledige aanvraag en
  krijgt dus ook geen bevestiging. De mail is een bevestiging van ontvangst, geen redmiddel
  voor afhakers.
- Het e-mailadres wordt niet geverifieerd. Een typefout betekent dat de bevestiging niet
  aankomt; de aanvraag staat er dan wel gewoon in.
- In de testversie op GitHub Pages wordt geen mail verstuurd — daar draait immers geen server.

---

## 8. Huisstijl aanpassen

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

## 9. Vragen toevoegen of wijzigen

De vragenlijst staat volledig in `src/vragenlijst.js`. Dat bestand is de enige bron van
waarheid: het formulier, de validatie, de puntentelling, de databasekolommen en de
CSV-export volgen er allemaal uit.

Een vraag toevoegen:

1. Voeg de vraag toe in `src/vragenlijst.js`, met per antwoordoptie een `punten`-waarde en
   het `onderdeel` waar hij bij hoort.
2. Draai `npm run migrate` — de nieuwe kolom wordt toegevoegd.
3. Draai `npm test` om te controleren of het model nog klopt.
4. Draai `npm run build:static` als je de testversie op GitHub Pages wilt bijwerken.

### Na een wijziging in de weging of de categorieën

De beheerdersomgeving rekent altijd live door, dus op het scherm klopt alles meteen. In je
eigen database staan `score_totaal` en `advies_categorie` dan echter nog op de oude waarden,
en daar query je zelf op. Draai in dat geval:

```bash
npm run herbereken
```

Dat werkt alleen de berekende kolommen bij; besluiten, toelichtingen en de antwoorden zelf
blijven ongemoeid. Het script laat per inzending zien wat er verandert.

Let op: besluiten uit een eerdere versie (bijvoorbeeld het vervallen `pilot`) worden níét
omgezet — die keuze is aan jou. In de beheerdersomgeving blijft zo'n waarde zichtbaar als
"(vervallen keuze)", zodat opslaan hem niet ongemerkt vervangt.

---

## 10. Beveiliging en privacy

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

## 11. Bestandsindeling

```
src/
  server.js           Webserver en routes
  config.js           Instellingen uit .env
  vragenlijst.js      De vragenlijst: vragen, antwoorden en punten
  scoring.js          Het beoordelingsmodel
  validatie.js        Controle van inzendingen
  mail.js             Bevestigingsmail aan de invuller
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
  herbereken.js       Werkt opgeslagen scores bij na een modelwijziging
  mail-instellen.js   Vraag-en-antwoord-hulp voor de mailinstellingen
  mail-testen.js      Stuurt een testmail om de instellingen te controleren
  statisch/demo-api.js  Demolaag die /api/ in de browser afhandelt
docs/                 Gegenereerde testversie voor GitHub Pages
```

---

## 12. In productie draaien

Zet de applicatie achter een reverse proxy met HTTPS en houd het proces draaiend met
bijvoorbeeld `systemd` of `pm2`:

```bash
NODE_ENV=production npm start
```

Controleer daarna `/gezondheid`; die geeft `{"status":"ok"}` zodra de database bereikbaar is.
