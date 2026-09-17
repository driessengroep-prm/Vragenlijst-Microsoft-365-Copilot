'use strict';

/**
 * Beoordelingsmodel Microsoft 365 Copilot.
 *
 * Gebaseerd op het beoordelingskader:
 *
 *   Onderdeel                              Gewicht
 *   Informatiewerk (vragen 1 t/m 4)          40%
 *   Verwachte businesswaarde (vragen 5 + 6)  30%
 *   Concreet use case voorbeeld (vraag 7)    20%
 *   AI-volwassenheid (vragen 8 t/m 10)       10%
 *
 *   80-100 punten : Direct kandidaat
 *   60-79  punten : Pilotgroep
 *   40-59  punten : Nog niet
 *   < 40   punten : Geen businesscase
 *
 * Het kader geeft de gewichten; de puntentoekenning per antwoord staat in
 * src/vragenlijst.js (`punten` per optie). Binnen elk onderdeel tellen we de
 * ruwe punten op en schalen die naar het gewicht van het onderdeel. Zo blijft
 * de verdeling kloppen, ook als je later een vraag toevoegt of weghaalt.
 */

const { VRAGEN, puntenVoor } = require('./vragenlijst');

const GEWICHTEN = {
  informatiewerk: 40,
  businesswaarde: 30,
  usecase: 20,
  volwassenheid: 10,
};

const ONDERDEEL_LABELS = {
  informatiewerk: 'Informatiewerk (vragen 1 t/m 4)',
  businesswaarde: 'Verwachte businesswaarde (vragen 5 en 6)',
  usecase: 'Concreet use case voorbeeld (vraag 7)',
  volwassenheid: 'AI-volwassenheid (vragen 8 t/m 10)',
};

/**
 * Binnen 'businesswaarde' weegt de verwachte tijdwinst (vraag 6) zwaarder dan
 * de breedte van de genoemde toepassingen (vraag 5): 24 van de 30 punten.
 */
const BUSINESSWAARDE_VERDELING = {
  v6_tijdwinst: 24,
  v5_toepassingen: 6,
  v5_max_meetellend: 4, // meer dan 4 aangevinkte toepassingen levert geen extra punten op
};

const CATEGORIEEN = [
  {
    sleutel: 'direct_kandidaat',
    label: 'Direct kandidaat',
    vanaf: 80,
    tot: 100,
    kleur: 'groen',
    advies:
      'Kenniswerker met veel vergaderingen, documenten en e-mails, een concreet gebruiksscenario ' +
      'en een verwachte tijdwinst van meer dan 2 uur per week. Licentie toekennen.',
  },
  {
    sleutel: 'pilotgroep',
    label: 'Pilotgroep',
    vanaf: 60,
    tot: 79,
    kleur: 'blauw',
    advies:
      'Waarschijnlijke meerwaarde. Toekennen met een proefperiode van 2-3 maanden en daarna evalueren.',
  },
  {
    sleutel: 'nog_niet',
    label: 'Nog niet',
    vanaf: 40,
    tot: 59,
    kleur: 'oranje',
    advies:
      'Nog geen licentie. Eerst leren optimaal gebruik te maken van Copilot Chat binnen E5 en daarna opnieuw beoordelen.',
  },
  {
    sleutel: 'geen_businesscase',
    label: 'Geen businesscase',
    vanaf: 0,
    tot: 39,
    kleur: 'rood',
    advies: 'Geen duidelijke businesscase voor een aanvullende Copilot-licentie.',
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
// Onderdeel 1: informatiewerk (vragen 1 t/m 4) -> 40 punten
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
// Onderdeel 2: verwachte businesswaarde (vragen 5 en 6) -> 30 punten
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
// Onderdeel 3: concreet use case voorbeeld (vraag 7) -> 20 punten
// ---------------------------------------------------------------------------

/** Woorden die duiden op een concreet, herkenbaar werkproces. */
const CONCREETHEID_SIGNALEN = [
  'outlook', 'teams', 'excel', 'word', 'powerpoint', 'sharepoint', 'onenote', 'planner', 'copilot',
  'mail', 'e-mail', 'email', 'vergader', 'overleg', 'notul', 'verslag', 'rapport', 'offerte',
  'presentatie', 'dossier', 'contract', 'factuur', 'klant', 'analyse', 'samenvat', 'nieuwsbrief',
  'agenda', 'actiepunt', 'bestuur', 'directie', 'jaarplan', 'evaluatie', 'sollicitat', 'personeel',
];

/** Duidt op meetbaarheid: een getal in combinatie met tijd of frequentie. */
const MEETBAARHEID_PATROON =
  /\b\d+([.,]\d+)?\s*(uur|uren|minuten|minuut|min|dag|dagen|week|weken|maand|maanden|keer|x|%)\b/i;

const FREQUENTIE_PATROON =
  /\b(elke|iedere|wekelijk|dagelijk|maandelijk|per week|per dag|per maand|structureel|steeds|telkens)/i;

/**
 * Automatische indicatie voor de kwaliteit van het use case-voorbeeld.
 *
 * Dit is nadrukkelijk een *indicatie*: een open antwoord laat zich niet
 * volautomatisch beoordelen. De beheerder kan deze score in de
 * beheerdersomgeving handmatig overschrijven; dan telt de handmatige score.
 */
function scoreUseCaseAutomatisch(tekst) {
  const waarde = (tekst || '').trim();
  const woorden = waarde ? waarde.split(/\s+/).length : 0;

  const redenen = [];
  if (woorden === 0) {
    return { score: 0, max: GEWICHTEN.usecase, woorden, redenen: ['Geen voorbeeld ingevuld.'] };
  }

  // Basis: hoe uitgewerkt is het antwoord?
  let score;
  if (woorden < 8) {
    score = 2;
    redenen.push('Zeer kort antwoord (minder dan 8 woorden).');
  } else if (woorden < 20) {
    score = 7;
    redenen.push('Kort antwoord (8-19 woorden).');
  } else if (woorden < 40) {
    score = 11;
    redenen.push('Uitgewerkt antwoord (20-39 woorden).');
  } else {
    score = 14;
    redenen.push('Uitgebreid antwoord (40 woorden of meer).');
  }

  // Bonus: benoemt de respondent een herkenbaar werkproces of hulpmiddel?
  const kleineLetters = waarde.toLowerCase();
  const gevonden = CONCREETHEID_SIGNALEN.filter((woord) => kleineLetters.includes(woord));
  if (gevonden.length >= 2) {
    score += 3;
    redenen.push(`Benoemt meerdere concrete werkprocessen of toepassingen (${gevonden.slice(0, 4).join(', ')}).`);
  } else if (gevonden.length === 1) {
    score += 2;
    redenen.push(`Benoemt een concreet werkproces of toepassing (${gevonden[0]}).`);
  } else {
    redenen.push('Benoemt geen herkenbaar werkproces of hulpmiddel.');
  }

  // Bonus: is het voorbeeld meetbaar of structureel van aard?
  if (MEETBAARHEID_PATROON.test(waarde)) {
    score += 2;
    redenen.push('Bevat een meetbare omvang (aantal, tijd of percentage).');
  }
  if (FREQUENTIE_PATROON.test(waarde)) {
    score += 1;
    redenen.push('Beschrijft een terugkerende situatie.');
  }

  return {
    score: Math.min(afronden(score), GEWICHTEN.usecase),
    max: GEWICHTEN.usecase,
    woorden,
    redenen,
  };
}

// ---------------------------------------------------------------------------
// Onderdeel 4: AI-volwassenheid (vragen 8 t/m 10) -> 10 punten
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
 * Het kader noemt bij 'Direct kandidaat' vier kenmerken. Die tonen we apart,
 * zodat je de berekende categorie kunt toetsen aan het profiel erachter.
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
  const useCaseWoorden = (antwoorden.v7 || '').trim().split(/\s+/).filter(Boolean).length;

  return [
    {
      label: 'Kenniswerker (informatiewerk is kern van het werk)',
      voldaan: herkenbareSituaties >= 3,
      toelichting: `${herkenbareSituaties} van de 6 situaties uit vraag 4 komen regelmatig of zeer vaak voor.`,
    },
    {
      label: "Veel vergaderingen, documenten en e-mails",
      voldaan: zwaarInformatiewerk >= 2,
      toelichting: `${zwaarInformatiewerk} van de 3 kernactiviteiten kosten meer dan 5 uur per week.`,
    },
    {
      label: 'Concreet gebruiksscenario',
      voldaan: useCaseWoorden >= 20,
      toelichting: `Het voorbeeld bij vraag 7 telt ${useCaseWoorden} woorden.`,
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

/** Bepaal de adviescategorie bij een totaalscore. */
function categorieVoor(totaal) {
  return (
    CATEGORIEEN.find((c) => totaal >= c.vanaf && totaal <= c.tot) ||
    CATEGORIEEN[CATEGORIEEN.length - 1]
  );
}

/**
 * Bereken de volledige beoordeling.
 *
 * @param {object} antwoorden  De ingevulde antwoorden (sleutels = veld-id's).
 * @param {number|null} handmatigeUseCaseScore  Optionele handmatige score (0-20)
 *        die de automatische indicatie voor vraag 7 vervangt.
 */
function beoordeel(antwoorden, handmatigeUseCaseScore = null) {
  const informatiewerk = scoreInformatiewerk(antwoorden);
  const businesswaarde = scoreBusinesswaarde(antwoorden);
  const useCaseAuto = scoreUseCaseAutomatisch(antwoorden.v7);
  const volwassenheid = scoreVolwassenheid(antwoorden);

  const handmatig =
    handmatigeUseCaseScore === null || handmatigeUseCaseScore === undefined || handmatigeUseCaseScore === ''
      ? null
      : Math.max(0, Math.min(GEWICHTEN.usecase, Number(handmatigeUseCaseScore)));

  const useCaseScore = handmatig === null ? useCaseAuto.score : handmatig;

  const totaal = afronden(
    informatiewerk.score + businesswaarde.score + useCaseScore + volwassenheid.score
  );
  const categorie = categorieVoor(totaal);

  return {
    onderdelen: {
      informatiewerk,
      businesswaarde,
      usecase: {
        score: useCaseScore,
        max: GEWICHTEN.usecase,
        automatisch: useCaseAuto.score,
        handmatig,
        woorden: useCaseAuto.woorden,
        redenen: useCaseAuto.redenen,
      },
      volwassenheid,
    },
    totaal,
    categorie: categorie.sleutel,
    categorieLabel: categorie.label,
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
  scoreUseCaseAutomatisch,
};
