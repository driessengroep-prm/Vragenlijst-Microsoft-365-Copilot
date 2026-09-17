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
 *   80-100 punten : Direct kandidaat
 *   60-79  punten : Pilotgroep
 *   40-59  punten : Nog niet
 *   < 40   punten : Geen businesscase
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

const CATEGORIEEN = [
  {
    sleutel: 'direct_kandidaat',
    label: 'Direct kandidaat',
    vanaf: 80,
    tot: 100,
    kleur: 'groen',
    advies:
      'Kenniswerker met veel vergaderingen, documenten en e-mails, en een verwachte tijdwinst van ' +
      'meer dan 2 uur per week. Licentie toekennen.',
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
