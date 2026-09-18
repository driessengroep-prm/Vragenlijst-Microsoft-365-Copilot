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
/**
 * Bewust een verhoudingsschaal en geen aantal uren. Met absolute uren kon
 * iemand met een deeltijdcontract de bovenkant van de schaal niet bereiken,
 * hoe informatie-intensief het werk ook was: vijf activiteiten van meer dan
 * tien uur vraagt een werkweek van meer dan vijftig uur. Nu meet de vraag
 * intensiteit in plaats van contractomvang.
 */
const SCHAAL_AANDEEL = [
  { waarde: 'vrijwel_geen', label: 'Vrijwel geen tijd', punten: 0 },
  { waarde: 'klein_deel', label: 'Een klein deel van mijn tijd', punten: 1 },
  { waarde: 'aanzienlijk_deel', label: 'Een aanzienlijk deel van mijn tijd', punten: 2 },
  { waarde: 'groot_deel', label: 'Een groot deel van mijn tijd', punten: 3 },
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
    vraag: 'Welk deel van je werktijd gaat naar de volgende activiteiten?',
    verplicht: true,
    kolomkop: 'Activiteit',
    opties: SCHAAL_AANDEEL,
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
    // Vervangt de oude vraag naar het aantal collega's. Die mat netwerkomvang
    // in plaats van informatielast en overlapte met vraag 4. Deze vraag meet
    // waar het model geen zicht op had: Copilot kan alleen redeneren over wat
    // ín Microsoft 365 staat, dus werk in vakapplicaties telt niet mee.
    // Het antwoord komt in de nieuwe kolom v3_m365; de oude kolom v3 blijft
    // bestaan maar wordt niet meer gevuld.
    id: 'v3_m365',
    deel: 1,
    nummer: 2,
    type: 'radio',
    vraag:
      'Welk deel van je werkdag speelt zich af in Microsoft\u00a0365 (Outlook, Teams, Word, Excel, SharePoint) in plaats van in andere systemen?',
    toelichting:
      'Denk aan vakapplicaties zoals salaris- of HR-systemen: werk dat daar gebeurt, kan Copilot niet ondersteunen.',
    verplicht: true,
    opties: [
      { waarde: 'minder_dan_kwart', label: 'Minder dan een kwart', punten: 0 },
      { waarde: 'ongeveer_helft', label: 'Ongeveer de helft', punten: 1 },
      { waarde: 'grootste_deel', label: 'Het grootste deel', punten: 2 },
      { waarde: 'vrijwel_alles', label: 'Vrijwel alles', punten: 3 },
    ],
    onderdeel: 'informatiewerk',
  },

  // ---------------------------------------------------------------- Deel 2 --
  {
    id: 'v4',
    deel: 2,
    nummer: 3,
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
    nummer: 4,
    type: 'checkbox',
    vraag:
      'Bij welke van onderstaande werkzaamheden denk je voordeel te kunnen behalen met AI-ondersteuning?',
    toelichting: 'Meerdere antwoorden mogelijk. Vink alles aan waar je voordeel ziet, niet alleen het grootste.',
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
    // Geen `onderdeel`, dus deze vraag levert geen punten op. Hij telde
    // alleen het aantal vinkjes, ongeacht welke taken je aankruiste, en was
    // daarmee de makkelijkst verdiende score in het model. De antwoorden
    // blijven wel zichtbaar voor de beoordelaar en voeden een profielkenmerk.
  },

  // ---------------------------------------------------------------- Deel 3 --
  {
    id: 'v6',
    deel: 3,
    nummer: 5,
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
    nummer: 6,
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
    id: 'v10',
    deel: 4,
    nummer: 7,
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
