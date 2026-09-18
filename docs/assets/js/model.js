/* ==========================================================================
   AUTOMATISCH GEGENEREERD - NIET HANDMATIG AANPASSEN
   Gegenereerd door tools/bouw-statisch.js uit:
     src/vragenlijst.js
     src/scoring.js
     src/validatie.js
     src/besluiten.js
     src/beheerweergave.js
   Pas de bron aan en draai `npm run build:static` opnieuw.
   ========================================================================== */

(function (global) {
  'use strict';

  var fabrieken = {};
  var cache = {};

  function definieer(naam, fabriek) {
    fabrieken[naam] = fabriek;
  }

  function require(naam) {
    var sleutel = String(naam).replace(/^\.\//, '').replace(/\.js$/, '');
    if (cache[sleutel]) return cache[sleutel].exports;
    if (!fabrieken[sleutel]) throw new Error('Onbekende module: ' + naam);
    var module = { exports: {} };
    cache[sleutel] = module;
    fabrieken[sleutel](module, module.exports, require);
    return module.exports;
  }

  definieer('vragenlijst', function (module, exports, require) {
'use strict';

/**
 * Eén bron van waarheid voor de vragenlijst.
 *
 * Deze definitie wordt gebruikt door:
 *  - de front-end (public/assets/js/formulier.js) om het formulier te renderen;
 *  - de server om binnenkomende antwoorden te valideren;
 *  - src/scoring.js om de puntenscore te berekenen;
 *  - src/db/migrate.js om de databasekolommen aan te maken.
 *
 * Wil je een vraag toevoegen of wijzigen? Pas het hier aan en draai daarna
 * `npm run migrate`. De rest van de applicatie volgt automatisch.
 *
 * Let op: elk antwoordveld krijgt een kolom in de database met exact dezelfde
 * naam als het `id` hieronder. Die id's liggen vast, ook als de nummering van
 * de vragen verandert: vraag 7 (de open vraag) is vervallen, waardoor de
 * vragen met id v8, v9 en v10 nu als vraag 7, 8 en 9 worden getoond.
 */

/** Antwoordschalen die we vaker gebruiken. `punten` bepaalt de score. */
const SCHAAL_TIJD = [
  { waarde: 'minder_dan_2_uur', label: 'Minder dan 2 uur', punten: 0 },
  { waarde: '2_tot_5_uur', label: '2-5 uur', punten: 1 },
  { waarde: '5_tot_10_uur', label: '5-10 uur', punten: 2 },
  { waarde: 'meer_dan_10_uur', label: 'Meer dan 10 uur', punten: 3 },
];

const SCHAAL_FREQUENTIE = [
  { waarde: 'nooit', label: 'Nooit', punten: 0 },
  { waarde: 'soms', label: 'Soms', punten: 1 },
  { waarde: 'regelmatig', label: 'Regelmatig', punten: 2 },
  { waarde: 'zeer_vaak', label: 'Zeer vaak', punten: 3 },
];

const DELEN = [
  {
    nummer: 0,
    titel: 'Jouw gegevens',
    toelichting:
      'We hebben je gegevens nodig om je aanvraag te kunnen beoordelen en om je te laten weten wat we besluiten.',
  },
  {
    nummer: 1,
    titel: 'Deel 1: Werkprofiel',
    toelichting: null,
  },
  {
    nummer: 2,
    titel: 'Deel 2: Potentiële Copilot-toepassingen',
    toelichting: null,
  },
  {
    nummer: 3,
    titel: 'Deel 3: Verwachte opbrengst',
    toelichting: null,
  },
  {
    nummer: 4,
    titel: 'Deel 4: Digitale volwassenheid',
    toelichting: null,
  },
  {
    nummer: 5,
    titel: 'Nog één vraag',
    toelichting: null,
  },
];

const VRAGEN = [
  // ---------------------------------------------------------------- Deel 0 --
  {
    id: 'naam',
    deel: 0,
    type: 'tekst',
    vraag: 'Naam',
    verplicht: true,
    maxLengte: 120,
    kolom: 'naam',
    scoort: false,
  },
  {
    id: 'email',
    deel: 0,
    type: 'email',
    vraag: 'E-mailadres',
    verplicht: true,
    maxLengte: 180,
    kolom: 'email',
    scoort: false,
  },
  {
    id: 'functie',
    deel: 0,
    type: 'tekst',
    vraag: 'Functie',
    verplicht: false,
    maxLengte: 120,
    kolom: 'functie',
    scoort: false,
  },
  {
    id: 'afdeling',
    deel: 0,
    type: 'tekst',
    vraag: 'Afdeling of organisatieonderdeel',
    verplicht: false,
    maxLengte: 120,
    kolom: 'afdeling',
    scoort: false,
  },

  // ---------------------------------------------------------------- Deel 1 --
  {
    id: 'v1',
    deel: 1,
    nummer: 1,
    type: 'matrix',
    vraag: 'Hoeveel tijd besteed je gemiddeld per week aan de volgende activiteiten?',
    verplicht: true,
    kolomkop: 'Activiteit',
    opties: SCHAAL_TIJD,
    rijen: [
      { id: 'v1_email', label: 'E-mails verwerken' },
      { id: 'v1_overleggen', label: 'Overleggen/vergaderingen' },
      { id: 'v1_documenten', label: 'Documenten schrijven' },
      { id: 'v1_presentaties', label: 'Presentaties maken' },
      { id: 'v1_zoeken', label: 'Informatie zoeken in documenten, Teams of SharePoint' },
    ],
    onderdeel: 'informatiewerk',
  },
  {
    id: 'v2',
    deel: 1,
    nummer: 2,
    type: 'radio',
    vraag: 'Werk je regelmatig met grote hoeveelheden informatie uit verschillende bronnen?',
    verplicht: true,
    opties: [
      { waarde: 'nooit', label: 'Nooit', punten: 0 },
      { waarde: 'soms', label: 'Soms', punten: 1 },
      { waarde: 'regelmatig', label: 'Regelmatig', punten: 2 },
      { waarde: 'dagelijks', label: 'Dagelijks', punten: 3 },
    ],
    onderdeel: 'informatiewerk',
  },
  {
    id: 'v3',
    deel: 1,
    nummer: 3,
    type: 'radio',
    vraag: "Met hoeveel collega's werk je gemiddeld samen binnen Microsoft 365?",
    verplicht: true,
    opties: [
      { waarde: '1_tot_5', label: '1-5', punten: 0 },
      { waarde: '6_tot_10', label: '6-10', punten: 1 },
      { waarde: '11_tot_25', label: '11-25', punten: 2 },
      { waarde: 'meer_dan_25', label: 'Meer dan 25', punten: 3 },
    ],
    onderdeel: 'informatiewerk',
  },

  // ---------------------------------------------------------------- Deel 2 --
  {
    id: 'v4',
    deel: 2,
    nummer: 4,
    type: 'matrix',
    vraag: 'Hoe vaak herken je de volgende situaties?',
    verplicht: true,
    kolomkop: 'Situatie',
    opties: SCHAAL_FREQUENTIE,
    rijen: [
      { id: 'v4_oude_mails', label: 'Ik zoek informatie in oude mails' },
      { id: 'v4_documenten_kwijt', label: 'Ik zoek documenten waarvan ik niet meer weet waar ze staan' },
      { id: 'v4_vergadering_voorbereiden', label: 'Ik moet vergaderingen voorbereiden' },
      { id: 'v4_context_missen', label: 'Ik mis soms context omdat ik niet bij eerdere gesprekken aanwezig was' },
      { id: 'v4_informatie_combineren', label: 'Ik moet informatie uit meerdere documenten combineren' },
      { id: 'v4_samenvatten', label: 'Ik maak samenvattingen van lange documenten of overleggen' },
    ],
    onderdeel: 'informatiewerk',
  },
  {
    id: 'v5',
    deel: 2,
    nummer: 5,
    type: 'checkbox',
    vraag:
      'Welke van onderstaande werkzaamheden zouden volgens jou het meeste baat hebben bij AI-ondersteuning?',
    toelichting: 'Meerdere antwoorden mogelijk.',
    verplicht: false,
    opties: [
      { waarde: 'samenvatten_email', label: 'Samenvatten van e-mails' },
      { waarde: 'samenvatten_teams', label: 'Samenvatten van Teams-vergaderingen' },
      { waarde: 'opstellen_documenten', label: 'Opstellen van documenten' },
      { waarde: 'opstellen_presentaties', label: 'Opstellen van presentaties' },
      { waarde: 'analyse_excel', label: 'Analyse van Excel-data' },
      { waarde: 'zoeken_m365', label: 'Zoeken naar informatie binnen Microsoft 365' },
      { waarde: 'voorbereiden_overleg', label: 'Voorbereiden van overleggen' },
      { waarde: 'opstellen_communicatie', label: 'Opstellen van communicaties' },
      { waarde: 'anders', label: 'Anders, namelijk:', anders: true },
    ],
    andersVeld: 'v5_anders',
    onderdeel: 'businesswaarde',
  },

  // ---------------------------------------------------------------- Deel 3 --
  {
    id: 'v6',
    deel: 3,
    nummer: 6,
    type: 'radio',
    vraag: 'Hoeveel tijd denk je wekelijks te kunnen besparen met Copilot?',
    verplicht: true,
    opties: [
      { waarde: 'minder_dan_30_min', label: 'Minder dan 30 minuten', punten: 0 },
      { waarde: '30_tot_60_min', label: '30-60 minuten', punten: 1 },
      { waarde: '1_tot_2_uur', label: '1-2 uur', punten: 2 },
      { waarde: '2_tot_4_uur', label: '2-4 uur', punten: 3 },
      { waarde: 'meer_dan_4_uur', label: 'Meer dan 4 uur', punten: 4 },
    ],
    onderdeel: 'businesswaarde',
  },
  // ---------------------------------------------------------------- Deel 4 --
  {
    id: 'v8',
    deel: 4,
    nummer: 7,
    type: 'radio',
    vraag: 'Maak je al gebruik van Copilot Chat?',
    verplicht: true,
    opties: [
      { waarde: 'nee', label: 'Nee', punten: 0 },
      { waarde: 'af_en_toe', label: 'Af en toe', punten: 1 },
      { waarde: 'regelmatig', label: 'Regelmatig', punten: 2 },
      { waarde: 'dagelijks', label: 'Dagelijks', punten: 3 },
    ],
    onderdeel: 'volwassenheid',
  },
  {
    id: 'v9',
    deel: 4,
    nummer: 8,
    type: 'radio',
    vraag: 'Hoe beoordeel je jouw vaardigheid in het werken met AI?',
    verplicht: true,
    opties: [
      { waarde: 'beginner', label: 'Beginner', punten: 0 },
      { waarde: 'basis', label: 'Basis', punten: 1 },
      { waarde: 'gevorderd', label: 'Gevorderd', punten: 2 },
      { waarde: 'expert', label: 'Expert', punten: 3 },
    ],
    onderdeel: 'volwassenheid',
  },
  {
    id: 'v10',
    deel: 4,
    nummer: 9,
    type: 'radio',
    vraag: 'Ben je bereid tijd te investeren in het leren gebruiken van Microsoft 365 Copilot?',
    verplicht: true,
    opties: [
      { waarde: 'nee', label: 'Nee', punten: 0 },
      { waarde: 'beperkt', label: 'Beperkt', punten: 1 },
      { waarde: 'ja', label: 'Ja', punten: 2 },
      { waarde: 'ja_en_delen', label: 'Ja, en ik wil best practices delen met collega’s', punten: 3 },
    ],
    onderdeel: 'volwassenheid',
  },

  // ------------------------------------------------------ Vervolgvraag --
  // Deze vraag staat niet standaard op het formulier. Hij verschijnt pas
  // nadat de antwoorden zijn ingestuurd en de server heeft vastgesteld dat
  // de score in de categorie valt die om een onderbouwing vraagt. Het
  // antwoord telt niet mee in de score (er is geen `onderdeel`); het is
  // bedoeld als onderbouwing voor de beheerder.
  {
    id: 'use_case',
    deel: 5,
    type: 'tekstvlak',
    vraag:
      'Beschrijf één concrete, terugkerende situatie waarin Microsoft 365 Copilot je zou helpen.',
    toelichting:
      'Noem wat je doet, hoe vaak dat voorkomt en wat het je nu aan tijd kost. Geef ook aan of je ' +
      'bereid bent hier de komende maanden mee aan de slag te gaan.',
    verplicht: false, // alleen verplicht binnen de categorie hieronder
    maxLengte: 2000,
    voorwaarde: { categorie: 'geschikt_mits' },
  },
];

/** De vraagkop zoals hij op het formulier en in exports wordt getoond. */
function vraagKop(vraag) {
  return vraag.nummer ? `${vraag.nummer}. ${vraag.vraag}` : vraag.vraag;
}

/** Vragen die alleen bij een bepaalde adviescategorie worden gesteld. */
function vervolgvragenVoor(categorie) {
  return VRAGEN.filter((v) => v.voorwaarde && v.voorwaarde.categorie === categorie);
}

/** Vragen die standaard op het formulier staan (dus zonder voorwaarde). */
function basisvragen() {
  return VRAGEN.filter((v) => !v.voorwaarde);
}

/**
 * Alle antwoordvelden (= databasekolommen) die uit de vragen volgen.
 * Een matrixvraag levert één veld per rij op.
 */
function antwoordVelden() {
  const velden = [];
  for (const vraag of VRAGEN) {
    if (vraag.type === 'matrix') {
      for (const rij of vraag.rijen) {
        velden.push({
          id: rij.id,
          kolom: rij.id,
          type: 'keuze',
          vraagId: vraag.id,
          label: rij.label,
          opties: vraag.opties,
          verplicht: vraag.verplicht,
          onderdeel: vraag.onderdeel,
        });
      }
    } else if (vraag.type === 'checkbox') {
      velden.push({
        id: vraag.id,
        kolom: vraag.id,
        type: 'meerkeuze',
        vraagId: vraag.id,
        label: vraag.vraag,
        opties: vraag.opties,
        verplicht: vraag.verplicht,
        onderdeel: vraag.onderdeel,
      });
      velden.push({
        id: vraag.andersVeld,
        kolom: vraag.andersVeld,
        type: 'tekst',
        vraagId: vraag.id,
        label: 'Anders, namelijk',
        maxLengte: 200,
        verplicht: false,
      });
    } else if (vraag.type === 'radio') {
      velden.push({
        id: vraag.id,
        kolom: vraag.id,
        type: 'keuze',
        vraagId: vraag.id,
        label: vraag.vraag,
        opties: vraag.opties,
        verplicht: vraag.verplicht,
        onderdeel: vraag.onderdeel,
      });
    } else {
      velden.push({
        id: vraag.id,
        kolom: vraag.kolom || vraag.id,
        type: vraag.type === 'tekstvlak' ? 'lange_tekst' : 'tekst',
        vraagId: vraag.id,
        label: vraag.vraag,
        maxLengte: vraag.maxLengte || 255,
        verplicht: vraag.verplicht,
        onderdeel: vraag.onderdeel,
      });
    }
  }
  return velden;
}

/** Zoek het puntenaantal dat bij een gekozen antwoordwaarde hoort. */
function puntenVoor(opties, waarde) {
  const optie = (opties || []).find((o) => o.waarde === waarde);
  return optie && typeof optie.punten === 'number' ? optie.punten : 0;
}

/** Zoek het leesbare label dat bij een antwoordwaarde hoort. */
function labelVoor(opties, waarde) {
  const optie = (opties || []).find((o) => o.waarde === waarde);
  return optie ? optie.label : waarde;
}

module.exports = {
  DELEN,
  VRAGEN,
  basisvragen,
  vervolgvragenVoor,
  vraagKop,
  antwoordVelden,
  puntenVoor,
  labelVoor,
};

  });

  definieer('scoring', function (module, exports, require) {
'use strict';

/**
 * Beoordelingsmodel Microsoft 365 Copilot.
 *
 * Gebaseerd op het beoordelingskader. De open vraag naar een concreet use
 * case-voorbeeld is komen te vervallen; de score komt volledig uit de
 * meerkeuzevragen. De 20 punten van die vraag zijn herverdeeld over de
 * overgebleven onderdelen:
 *
 *   Onderdeel                              Oorspronkelijk   Nu
 *   Informatiewerk (vragen 1 t/m 4)             40%         50
 *   Verwachte businesswaarde (vragen 5 en 6)    30%         38
 *   Concreet use case voorbeeld                 20%          -
 *   AI-volwassenheid (vragen 7 t/m 9)           10%         12
 *
 *   75-100 punten : Hoge prioriteit voor jaarlicentie
 *   60-74  punten : Geschikt, mits (er wordt een use case uitgevraagd)
 *   45-59  punten : Eerst training of begeleiding
 *   < 45   punten : Vooralsnog geen licentie
 *
 * De puntentoekenning per antwoord staat in src/vragenlijst.js (`punten` per
 * optie). Binnen elk onderdeel tellen we de ruwe punten op en schalen die naar
 * het gewicht van het onderdeel. Zo blijft de verdeling kloppen, ook als je
 * later een vraag toevoegt of weghaalt.
 */

const { VRAGEN, puntenVoor } = require('./vragenlijst');

const GEWICHTEN = {
  informatiewerk: 50,
  businesswaarde: 38,
  volwassenheid: 12,
};

const ONDERDEEL_LABELS = {
  informatiewerk: 'Informatiewerk (vragen 1 t/m 4)',
  businesswaarde: 'Verwachte businesswaarde (vragen 5 en 6)',
  volwassenheid: 'AI-volwassenheid (vragen 7 t/m 9)',
};

/**
 * Binnen 'businesswaarde' weegt de verwachte tijdwinst (vraag 6) zwaarder dan
 * de breedte van de genoemde toepassingen (vraag 5): 30 van de 38 punten.
 */
const BUSINESSWAARDE_VERDELING = {
  v6_tijdwinst: 30,
  v5_toepassingen: 8,
  v5_max_meetellend: 4, // meer dan 4 aangevinkte toepassingen levert geen extra punten op
};

/**
 * Adviescategorieën.
 *
 * Microsoft 365 Copilot-licenties worden voor minimaal een jaar afgesloten,
 * dus een proefperiode van 2-3 maanden is niet mogelijk. De categorieën
 * beschrijven daarom prioriteit en voorwaarden, niet een proefopstelling.
 *
 * `vanaf` bepaalt de indeling; `tot` dient alleen om het bereik leesbaar te
 * tonen ("60-74 punten").
 */
const CATEGORIEEN = [
  {
    sleutel: 'hoge_prioriteit',
    label: 'Hoge prioriteit voor jaarlicentie',
    kort: 'Hoge prioriteit',
    vanaf: 75,
    tot: 100,
    kleur: 'groen',
    advies:
      'Kenniswerker met veel vergaderingen, documenten en e-mails, en een substantiële verwachte ' +
      'tijdwinst. Als eerste in aanmerking voor een jaarlicentie.',
  },
  {
    sleutel: 'geschikt_mits',
    label: 'Geschikt, mits',
    kort: 'Geschikt, mits',
    vanaf: 60,
    tot: 74,
    kleur: 'blauw',
    advies:
      'Toekennen als de beschreven use case concreet en terugkerend is en de medewerker bereid is ' +
      'tijd te investeren. De onderbouwing is bij deze aanvraag uitgevraagd; beoordeel die en leg ' +
      'je afweging vast in de toelichting bij het besluit.',
  },
  {
    sleutel: 'eerst_training',
    label: 'Eerst training of begeleiding',
    kort: 'Eerst training',
    vanaf: 45,
    tot: 59,
    kleur: 'oranje',
    advies:
      'Nog geen jaarlicentie. Eerst leren werken met Copilot Chat binnen E5, met training of ' +
      'begeleiding, en daarna opnieuw beoordelen.',
  },
  {
    sleutel: 'geen_licentie',
    label: 'Vooralsnog geen licentie',
    kort: 'Geen licentie',
    vanaf: 0,
    tot: 44,
    kleur: 'rood',
    advies: 'Vooralsnog geen aanvullende Microsoft 365 Copilot-licentie.',
  },
];

/** Hulpfunctie: haal een vraagdefinitie op via het id. */
function vraag(id) {
  return VRAGEN.find((v) => v.id === id);
}

/** Rond af op één decimaal, zodat totalen netjes optellen zonder ruis. */
function afronden(getal) {
  return Math.round(getal * 10) / 10;
}

// ---------------------------------------------------------------------------
// Onderdeel 1: informatiewerk (vragen 1 t/m 4) -> 50 punten
// ---------------------------------------------------------------------------
function scoreInformatiewerk(antwoorden) {
  let ruw = 0;
  let ruwMax = 0;
  const detail = [];

  for (const v of VRAGEN.filter((q) => q.onderdeel === 'informatiewerk')) {
    if (v.type === 'matrix') {
      for (const rij of v.rijen) {
        const maxPunten = Math.max(...v.opties.map((o) => o.punten));
        const punten = puntenVoor(v.opties, antwoorden[rij.id]);
        ruw += punten;
        ruwMax += maxPunten;
        detail.push({ label: rij.label, punten, maxPunten });
      }
    } else {
      const maxPunten = Math.max(...v.opties.map((o) => o.punten));
      const punten = puntenVoor(v.opties, antwoorden[v.id]);
      ruw += punten;
      ruwMax += maxPunten;
      detail.push({ label: `Vraag ${v.nummer}`, punten, maxPunten });
    }
  }

  const score = ruwMax > 0 ? (ruw / ruwMax) * GEWICHTEN.informatiewerk : 0;
  return { score: afronden(score), ruw, ruwMax, max: GEWICHTEN.informatiewerk, detail };
}

// ---------------------------------------------------------------------------
// Onderdeel 2: verwachte businesswaarde (vragen 5 en 6) -> 38 punten
// ---------------------------------------------------------------------------
function scoreBusinesswaarde(antwoorden) {
  const v6 = vraag('v6');
  const v6Max = Math.max(...v6.opties.map((o) => o.punten));
  const v6Punten = puntenVoor(v6.opties, antwoorden.v6);
  const tijdwinstScore = v6Max > 0 ? (v6Punten / v6Max) * BUSINESSWAARDE_VERDELING.v6_tijdwinst : 0;

  const gekozen = Array.isArray(antwoorden.v5) ? antwoorden.v5 : [];
  const meetellend = Math.min(gekozen.length, BUSINESSWAARDE_VERDELING.v5_max_meetellend);
  const toepassingenScore =
    (meetellend / BUSINESSWAARDE_VERDELING.v5_max_meetellend) * BUSINESSWAARDE_VERDELING.v5_toepassingen;

  const score = tijdwinstScore + toepassingenScore;
  return {
    score: afronden(score),
    max: GEWICHTEN.businesswaarde,
    detail: [
      {
        label: 'Verwachte tijdwinst per week (vraag 6)',
        punten: afronden(tijdwinstScore),
        maxPunten: BUSINESSWAARDE_VERDELING.v6_tijdwinst,
      },
      {
        label: `Genoemde toepassingen (vraag 5): ${gekozen.length}`,
        punten: afronden(toepassingenScore),
        maxPunten: BUSINESSWAARDE_VERDELING.v5_toepassingen,
      },
    ],
  };
}

// ---------------------------------------------------------------------------
// Onderdeel 3: AI-volwassenheid (vragen 7 t/m 9) -> 12 punten
// ---------------------------------------------------------------------------
function scoreVolwassenheid(antwoorden) {
  let ruw = 0;
  let ruwMax = 0;
  const detail = [];

  for (const v of VRAGEN.filter((q) => q.onderdeel === 'volwassenheid')) {
    const maxPunten = Math.max(...v.opties.map((o) => o.punten));
    const punten = puntenVoor(v.opties, antwoorden[v.id]);
    ruw += punten;
    ruwMax += maxPunten;
    detail.push({ label: `Vraag ${v.nummer}`, punten, maxPunten });
  }

  const score = ruwMax > 0 ? (ruw / ruwMax) * GEWICHTEN.volwassenheid : 0;
  return { score: afronden(score), ruw, ruwMax, max: GEWICHTEN.volwassenheid, detail };
}

// ---------------------------------------------------------------------------
// Kwalitatieve signalen uit het beoordelingskader
// ---------------------------------------------------------------------------

/**
 * Het kader noemt bij 'Direct kandidaat' een aantal kenmerken. Die tonen we
 * apart, zodat je de berekende categorie kunt toetsen aan het profiel erachter.
 */
function signalen(antwoorden) {
  const v1 = vraag('v1');
  const v4 = vraag('v4');

  const zwaarInformatiewerk = ['v1_email', 'v1_overleggen', 'v1_documenten'].filter(
    (id) => puntenVoor(v1.opties, antwoorden[id]) >= 2
  ).length;

  const herkenbareSituaties = v4.rijen.filter(
    (rij) => puntenVoor(v4.opties, antwoorden[rij.id]) >= 2
  ).length;

  const tijdwinstPunten = puntenVoor(vraag('v6').opties, antwoorden.v6);
  const genoemdeToepassingen = Array.isArray(antwoorden.v5) ? antwoorden.v5.length : 0;

  return [
    {
      label: 'Kenniswerker (informatiewerk is kern van het werk)',
      voldaan: herkenbareSituaties >= 3,
      toelichting: `${herkenbareSituaties} van de 6 situaties uit vraag 4 komen regelmatig of zeer vaak voor.`,
    },
    {
      label: 'Veel vergaderingen, documenten en e-mails',
      voldaan: zwaarInformatiewerk >= 2,
      toelichting: `${zwaarInformatiewerk} van de 3 kernactiviteiten kosten meer dan 5 uur per week.`,
    },
    {
      label: 'Meerdere concrete toepassingen genoemd',
      voldaan: genoemdeToepassingen >= 3,
      toelichting: `${genoemdeToepassingen} van de 9 werkzaamheden uit vraag 5 aangevinkt.`,
    },
    {
      label: 'Verwachte tijdwinst groter dan 2 uur per week',
      voldaan: tijdwinstPunten >= 3,
      toelichting: `Opgegeven verwachting: ${
        (vraag('v6').opties.find((o) => o.waarde === antwoorden.v6) || {}).label || 'onbekend'
      }.`,
    },
  ];
}

/**
 * Bepaal de adviescategorie bij een totaalscore.
 *
 * We toetsen alleen op de ondergrens (`vanaf`). Een score kan namelijk een
 * decimaal hebben, en met een boven- én ondergrens zou bijvoorbeeld 59,6
 * tussen twee categorieën in vallen. `tot` gebruiken we alleen om het bereik
 * leesbaar te tonen ("60-79 punten").
 */
function categorieVoor(totaal) {
  const gesorteerd = [...CATEGORIEEN].sort((a, b) => b.vanaf - a.vanaf);
  return gesorteerd.find((c) => totaal >= c.vanaf) || gesorteerd[gesorteerd.length - 1];
}

/**
 * Bereken de volledige beoordeling op basis van de meerkeuzeantwoorden.
 *
 * @param {object} antwoorden  De ingevulde antwoorden (sleutels = veld-id's).
 */
function beoordeel(antwoorden) {
  const informatiewerk = scoreInformatiewerk(antwoorden);
  const businesswaarde = scoreBusinesswaarde(antwoorden);
  const volwassenheid = scoreVolwassenheid(antwoorden);

  const totaal = afronden(informatiewerk.score + businesswaarde.score + volwassenheid.score);
  const categorie = categorieVoor(totaal);

  return {
    onderdelen: { informatiewerk, businesswaarde, volwassenheid },
    totaal,
    categorie: categorie.sleutel,
    categorieLabel: categorie.label,
    categorieKort: categorie.kort || categorie.label,
    categorieKleur: categorie.kleur,
    advies: categorie.advies,
    signalen: signalen(antwoorden),
  };
}

module.exports = {
  GEWICHTEN,
  ONDERDEEL_LABELS,
  CATEGORIEEN,
  beoordeel,
  categorieVoor,
};

  });

  definieer('validatie', function (module, exports, require) {
'use strict';

/**
 * Validatie van een binnengekomen inzending.
 *
 * De front-end valideert ook, maar daar mag je nooit op vertrouwen: deze
 * controle op de server is leidend.
 */

const { VRAGEN, antwoordVelden, labelVoor, vraagKop } = require('./vragenlijst');

const EMAIL_PATROON = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function valideer(invoer) {
  const fouten = {};
  const antwoorden = {};
  const velden = antwoordVelden();

  for (const veld of velden) {
    const ruw = invoer[veld.id];

    if (veld.type === 'meerkeuze') {
      const lijst = Array.isArray(ruw) ? ruw : ruw ? [ruw] : [];
      const geldig = lijst.filter((w) => veld.opties.some((o) => o.waarde === w));
      if (geldig.length !== lijst.length) {
        fouten[veld.id] = 'Er is een onbekende keuze meegestuurd.';
      }
      antwoorden[veld.id] = geldig;
      continue;
    }

    if (veld.type === 'keuze') {
      const waarde = typeof ruw === 'string' ? ruw.trim() : '';
      if (!waarde) {
        if (veld.verplicht) fouten[veld.id] = 'Maak een keuze.';
        antwoorden[veld.id] = null;
        continue;
      }
      if (!veld.opties.some((o) => o.waarde === waarde)) {
        fouten[veld.id] = 'Onbekende keuze.';
        antwoorden[veld.id] = null;
        continue;
      }
      antwoorden[veld.id] = waarde;
      continue;
    }

    // Tekstvelden
    const waarde = typeof ruw === 'string' ? ruw.trim() : '';
    if (!waarde) {
      if (veld.verplicht) fouten[veld.id] = 'Dit veld is verplicht.';
      antwoorden[veld.id] = null;
      continue;
    }
    if (veld.maxLengte && waarde.length > veld.maxLengte) {
      fouten[veld.id] = `Maximaal ${veld.maxLengte} tekens.`;
      antwoorden[veld.id] = waarde.slice(0, veld.maxLengte);
      continue;
    }
    if (veld.id === 'email' && !EMAIL_PATROON.test(waarde)) {
      fouten[veld.id] = 'Vul een geldig e-mailadres in.';
    }
    antwoorden[veld.id] = waarde;
  }

  if (!invoer.akkoord_privacy) {
    fouten.akkoord_privacy = 'Je moet akkoord gaan om het formulier te kunnen versturen.';
  }

  return {
    geldig: Object.keys(fouten).length === 0,
    fouten,
    antwoorden,
    akkoordPrivacy: Boolean(invoer.akkoord_privacy),
    akkoordContact: Boolean(invoer.akkoord_contact),
  };
}

/**
 * Zet de opgeslagen antwoorden om naar leesbare labels, voor de
 * beheerdersomgeving en de CSV-export.
 */
function leesbaar(antwoorden) {
  const uitkomst = [];
  for (const vraag of VRAGEN) {
    if (vraag.type === 'matrix') {
      for (const rij of vraag.rijen) {
        uitkomst.push({
          vraag: `${vraag.nummer}. ${rij.label}`,
          antwoord: antwoorden[rij.id] ? labelVoor(vraag.opties, antwoorden[rij.id]) : '-',
          veld: rij.id,
        });
      }
    } else if (vraag.type === 'checkbox') {
      const gekozen = Array.isArray(antwoorden[vraag.id]) ? antwoorden[vraag.id] : [];
      const labels = gekozen.map((w) => labelVoor(vraag.opties, w));
      if (antwoorden[vraag.andersVeld]) {
        const index = labels.findIndex((l) => l.startsWith('Anders'));
        const tekst = `Anders: ${antwoorden[vraag.andersVeld]}`;
        if (index >= 0) labels[index] = tekst;
        else labels.push(tekst);
      }
      uitkomst.push({
        vraag: vraagKop(vraag),
        antwoord: labels.length ? labels.join('; ') : '-',
        veld: vraag.id,
      });
    } else if (vraag.type === 'radio') {
      uitkomst.push({
        vraag: vraagKop(vraag),
        antwoord: antwoorden[vraag.id] ? labelVoor(vraag.opties, antwoorden[vraag.id]) : '-',
        veld: vraag.id,
      });
    } else if (vraag.deel > 0) {
      // Een voorwaardelijke vraag die niet gesteld is, laten we weg.
      if (vraag.voorwaarde && !antwoorden[vraag.id]) continue;
      uitkomst.push({
        vraag: vraagKop(vraag),
        antwoord: antwoorden[vraag.id] || '-',
        veld: vraag.id,
        lang: vraag.type === 'tekstvlak',
      });
    }
  }
  return uitkomst;
}

module.exports = { valideer, leesbaar };

  });

  definieer('besluiten', function (module, exports, require) {
'use strict';

/**
 * De besluiten die een beheerder kan vastleggen bij een inzending.
 * Gedeeld door de beheerders-API en de statische demoversie.
 *
 * Copilot-licenties worden voor minimaal een jaar afgesloten, dus er is geen
 * besluit voor een proefperiode: het is toekennen, eerst opleiden, of niet.
 */

const BESLUITEN = [
  { waarde: 'nieuw', label: 'Nog niet beoordeeld', kleur: 'grijs' },
  { waarde: 'licentie_toekennen', label: 'Jaarlicentie toekennen', kleur: 'groen' },
  { waarde: 'training_eerst', label: 'Eerst training, daarna opnieuw beoordelen', kleur: 'oranje' },
  { waarde: 'afgewezen', label: 'Afgewezen', kleur: 'rood' },
];

/**
 * Zoek een besluit op. Een waarde die niet (meer) in de lijst staat — denk aan
 * een besluit uit een eerdere versie van het model — geven we ongewijzigd
 * terug, zodat oude gegevens niet stilzwijgend een ander label krijgen.
 */
function besluit(waarde) {
  return (
    BESLUITEN.find((b) => b.waarde === waarde) || {
      waarde: waarde,
      label: waarde ? `${waarde} (vervallen)` : 'Onbekend',
      kleur: 'grijs',
      vervallen: true,
    }
  );
}

module.exports = { BESLUITEN, besluit };

  });

  definieer('beheerweergave', function (module, exports, require) {
'use strict';

/**
 * Omzetting van opgeslagen rijen naar wat de beheerdersinterface toont.
 *
 * Deze module bevat geen database- of webservercode, zodat zowel de
 * beheerders-API (src/routes/beheer.js) als de statische demoversie voor
 * GitHub Pages er precies hetzelfde uit kan halen.
 */

const { beoordeel, CATEGORIEEN } = require('./scoring');
const { BESLUITEN, besluit } = require('./besluiten');
const { leesbaar } = require('./validatie');
const { VRAGEN, vraagKop } = require('./vragenlijst');

/** Haal de antwoorden terug uit de opgeslagen JSON-kolom. */
function antwoordenVan(rij) {
  if (rij.antwoorden_json && typeof rij.antwoorden_json === 'object') return rij.antwoorden_json;
  try {
    return JSON.parse(rij.antwoorden_json || '{}');
  } catch {
    return {};
  }
}

/** Boolean-waarden komen per database anders terug (0/1, true/false). */
function jaNee(waarde) {
  return waarde === true || waarde === 1 || waarde === '1';
}

/** Verrijk een opgeslagen rij met de actuele berekening van het beoordelingsmodel. */
function metBeoordeling(rij) {
  const antwoorden = antwoordenVan(rij);
  return { antwoorden, beoordeling: beoordeel(antwoorden) };
}

/** Eén regel voor de overzichtstabel. */
function overzichtsRij(rij) {
  const { beoordeling } = metBeoordeling(rij);
  return {
    id: rij.id,
    naam: rij.naam,
    email: rij.email,
    functie: rij.functie,
    afdeling: rij.afdeling,
    ingezonden_op: rij.ingezonden_op,
    totaal: beoordeling.totaal,
    categorie: beoordeling.categorie,
    categorieLabel: beoordeling.categorieLabel,
    categorieKort: beoordeling.categorieKort,
    categorieKleur: beoordeling.categorieKleur,
    onderdelen: {
      informatiewerk: beoordeling.onderdelen.informatiewerk.score,
      businesswaarde: beoordeling.onderdelen.businesswaarde.score,
      volwassenheid: beoordeling.onderdelen.volwassenheid.score,
    },
    besluit: rij.besluit || 'nieuw',
    beoordeeld_op: rij.beoordeeld_op,
  };
}

/** Aantallen per adviescategorie, voor de tegels bovenaan het overzicht. */
function samenvatting(inzendingen) {
  return CATEGORIEEN.map((c) => ({
    sleutel: c.sleutel,
    label: c.label,
    kort: c.kort || c.label,
    kleur: c.kleur,
    aantal: inzendingen.filter((i) => i.categorie === c.sleutel).length,
  }));
}

/** Alles wat het detailpaneel van één inzending laat zien. */
function detail(rij) {
  const { antwoorden, beoordeling } = metBeoordeling(rij);
  return {
    id: rij.id,
    respondent: {
      naam: rij.naam,
      email: rij.email,
      functie: rij.functie,
      afdeling: rij.afdeling,
    },
    ingezonden_op: rij.ingezonden_op,
    akkoord_contact: jaNee(rij.akkoord_contact),
    bevestiging_verzonden: rij.bevestiging_verzonden === null || rij.bevestiging_verzonden === undefined
      ? null
      : jaNee(rij.bevestiging_verzonden),
    antwoorden: leesbaar(antwoorden),
    beoordeling,
    besluit: rij.besluit || 'nieuw',
    besluit_toelichting: rij.besluit_toelichting || '',
    beoordeeld_door: rij.beoordeeld_door,
    beoordeeld_op: rij.beoordeeld_op,
  };
}

/** De waarden die bij een nieuwe inzending worden opgeslagen. */
function nieuweRij(antwoorden, extra = {}) {
  const beoordeling = beoordeel(antwoorden);

  const rij = {
    ingezonden_op: extra.ingezonden_op || new Date(),
    bron: extra.bron || 'webformulier',
    ip_hash: extra.ip_hash || null,
    user_agent: extra.user_agent || null,
    akkoord_privacy: Boolean(extra.akkoord_privacy),
    akkoord_contact: Boolean(extra.akkoord_contact),
    antwoorden_json: JSON.stringify(antwoorden),

    score_informatiewerk: beoordeling.onderdelen.informatiewerk.score,
    score_businesswaarde: beoordeling.onderdelen.businesswaarde.score,
    score_volwassenheid: beoordeling.onderdelen.volwassenheid.score,
    score_totaal: beoordeling.totaal,
    advies_categorie: beoordeling.categorie,

    besluit: 'nieuw',
    besluit_toelichting: null,
    beoordeeld_door: null,
    beoordeeld_op: null,
  };

  // Elk antwoord krijgt ook een eigen kolom, zodat je er direct in je eigen
  // database op kunt filteren en rapporteren.
  for (const [sleutel, waarde] of Object.entries(antwoorden)) {
    rij[sleutel] = Array.isArray(waarde) ? waarde.join(',') : waarde;
  }

  return rij;
}

/**
 * De waarden die worden bijgewerkt als de beheerder een beoordeling opslaat.
 * De score zelf komt volledig uit de meerkeuzeantwoorden en staat dus vast;
 * de beheerder legt alleen het besluit en de toelichting vast.
 */
function beoordelingsUpdate(rij, invoer, beheerder) {
  const gekozenBesluit = String(invoer.besluit || 'nieuw');
  if (!BESLUITEN.some((b) => b.waarde === gekozenBesluit)) {
    return { fout: 'Onbekend besluit.' };
  }

  const beoordeling = beoordeel(antwoordenVan(rij));

  return {
    beoordeling,
    waarden: {
      score_totaal: beoordeling.totaal,
      advies_categorie: beoordeling.categorie,
      besluit: gekozenBesluit,
      besluit_toelichting: (invoer.besluit_toelichting || '').slice(0, 4000) || null,
      beoordeeld_door: beheerder || null,
      beoordeeld_op: gekozenBesluit === 'nieuw' ? null : new Date(),
    },
  };
}

/** Kolomkoppen voor de CSV-export, afgeleid van de vragenlijst. */
function csvVraagKoppen() {
  const koppen = [];
  for (const vraag of VRAGEN) {
    if (vraag.deel === 0) continue;
    if (vraag.type === 'matrix') {
      for (const rij of vraag.rijen) koppen.push({ sleutel: rij.id, kop: `${vraag.nummer}. ${rij.label}` });
    } else {
      koppen.push({ sleutel: vraag.id, kop: vraagKop(vraag) });
      if (vraag.andersVeld) koppen.push({ sleutel: vraag.andersVeld, kop: `${vraag.nummer}. Anders, namelijk` });
    }
  }
  return koppen;
}

function csvWaarde(waarde) {
  if (waarde === null || waarde === undefined) return '';
  const tekst = String(waarde).replace(/"/g, '""');
  return /[";\n\r]/.test(tekst) ? `"${tekst}"` : tekst;
}

function alsTekst(waarde) {
  if (waarde instanceof Date) return waarde.toISOString();
  return waarde;
}

/** Volledige CSV-export, met puntkomma's zodat Excel hem direct goed opent. */
function csv(rijen) {
  const vraagKoppen = csvVraagKoppen();
  const koppen = [
    'id',
    'ingezonden_op',
    'naam',
    'email',
    'functie',
    'afdeling',
    'score_informatiewerk',
    'score_businesswaarde',
    'score_volwassenheid',
    'score_totaal',
    'advies_categorie',
    'advies',
    'besluit',
    'besluit_toelichting',
    'beoordeeld_door',
    'beoordeeld_op',
    ...vraagKoppen.map((k) => k.kop),
  ];

  const regels = [koppen.map(csvWaarde).join(';')];

  for (const rij of rijen) {
    const { antwoorden, beoordeling } = metBeoordeling(rij);
    const leesbareAntwoorden = new Map(leesbaar(antwoorden).map((a) => [a.veld, a.antwoord]));
    regels.push(
      [
        rij.id,
        alsTekst(rij.ingezonden_op),
        rij.naam,
        rij.email,
        rij.functie,
        rij.afdeling,
        beoordeling.onderdelen.informatiewerk.score,
        beoordeling.onderdelen.businesswaarde.score,
        beoordeling.onderdelen.volwassenheid.score,
        beoordeling.totaal,
        beoordeling.categorieLabel,
        beoordeling.advies,
        besluit(rij.besluit || 'nieuw').label,
        rij.besluit_toelichting,
        rij.beoordeeld_door,
        alsTekst(rij.beoordeeld_op),
        ...vraagKoppen.map((k) => leesbareAntwoorden.get(k.sleutel) ?? antwoorden[k.sleutel] ?? ''),
      ]
        .map(csvWaarde)
        .join(';')
    );
  }

  // BOM zodat Excel de accenten goed toont.
  return '﻿' + regels.join('\r\n');
}

module.exports = {
  antwoordenVan,
  metBeoordeling,
  overzichtsRij,
  samenvatting,
  detail,
  nieuweRij,
  beoordelingsUpdate,
  csv,
};

  });

  global.DGModel = {
    vragenlijst: require('vragenlijst'),
    scoring: require('scoring'),
    validatie: require('validatie'),
    besluiten: require('besluiten'),
    beheerweergave: require('beheerweergave')
  };
})(window);
