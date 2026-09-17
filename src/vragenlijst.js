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
];

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
  antwoordVelden,
  puntenVoor,
  labelVoor,
};
