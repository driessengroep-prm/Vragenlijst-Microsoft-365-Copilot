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
 *   Informatiewerk (vragen 1 t/m 3)             40%         75
 *   Verwachte businesswaarde (vraag 5)          30%         13
 *   Concreet use case voorbeeld                 20%          -
 *   AI-volwassenheid (vragen 6 en 7)            10%         12
 *
 * Het zwaartepunt is verschoven van wat iemand vérwacht naar wat iemand
 * doet. De verwachte tijdwinst is een voorspelling over een product dat de
 * invuller meestal nog niet gebruikt, en bepaalde als enige vraag bij vrijwel
 * elk profiel de adviescategorie. De vragen naar tijdsbesteding en naar
 * herkenbare situaties meten gedrag en zijn moeilijker te overdrijven.
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
  informatiewerk: 75,
  businesswaarde: 13,
  volwassenheid: 12,
};

const ONDERDEEL_LABELS = {
  informatiewerk: 'Informatiewerk (vragen 1 t/m 3)',
  businesswaarde: 'Verwachte businesswaarde (vraag 5)',
  volwassenheid: 'AI-volwassenheid (vragen 6 en 7)',
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
// Score per onderdeel
// ---------------------------------------------------------------------------

/**
 * Tel de punten van alle vragen binnen een onderdeel op en schaal die naar het
 * gewicht van dat onderdeel. Elke vraag weegt dus mee naar rato van het aantal
 * punten dat erop te behalen valt; voeg je een vraag toe of haal je er een weg,
 * dan blijft het onderdeel op zijn gewicht uitkomen.
 */
function scoreOnderdeel(antwoorden, onderdeel) {
  let ruw = 0;
  let ruwMax = 0;
  const detail = [];

  for (const v of VRAGEN.filter((q) => q.onderdeel === onderdeel)) {
    const maxPunten = Math.max(...v.opties.map((o) => o.punten));

    if (v.type === 'matrix') {
      for (const rij of v.rijen) {
        const punten = puntenVoor(v.opties, antwoorden[rij.id]);
        ruw += punten;
        ruwMax += maxPunten;
        detail.push({ label: rij.label, punten, maxPunten });
      }
    } else {
      const punten = puntenVoor(v.opties, antwoorden[v.id]);
      ruw += punten;
      ruwMax += maxPunten;
      detail.push({ label: `Vraag ${v.nummer}`, punten, maxPunten });
    }
  }

  const max = GEWICHTEN[onderdeel];
  return { score: afronden(ruwMax > 0 ? (ruw / ruwMax) * max : 0), ruw, ruwMax, max, detail };
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

  const aandeelM365 = puntenVoor(vraag('v3_m365').opties, antwoorden.v3_m365);

  const herkenbareSituaties = v4.rijen.filter(
    (rij) => puntenVoor(v4.opties, antwoorden[rij.id]) >= 2
  ).length;

  const tijdwinstPunten = puntenVoor(vraag('v6').opties, antwoorden.v6);
  const genoemdeToepassingen = Array.isArray(antwoorden.v5) ? antwoorden.v5.length : 0;

  return [
    {
      label: 'Kenniswerker (informatiewerk is kern van het werk)',
      voldaan: herkenbareSituaties >= 3,
      toelichting: `${herkenbareSituaties} van de ${v4.rijen.length} situaties uit vraag ${v4.nummer} komen regelmatig of zeer vaak voor.`,
    },
    {
      label: 'Veel vergaderingen, documenten en e-mails',
      voldaan: zwaarInformatiewerk >= 2,
      toelichting: `${zwaarInformatiewerk} van de 3 kernactiviteiten uit vraag ${v1.nummer} kosten een aanzienlijk deel van de werktijd.`,
    },
    {
      label: 'Werkt hoofdzakelijk binnen Microsoft 365',
      voldaan: aandeelM365 >= 2,
      toelichting: `Opgegeven aandeel: ${
        (vraag('v3_m365').opties.find((o) => o.waarde === antwoorden.v3_m365) || {}).label || 'onbekend'
      }. Copilot kan alleen ondersteunen wat zich binnen Microsoft 365 afspeelt.`,
    },
    {
      label: 'Meerdere concrete toepassingen genoemd',
      voldaan: genoemdeToepassingen >= 3,
      toelichting: `${genoemdeToepassingen} van de ${vraag('v5').opties.length} werkzaamheden uit vraag ${
        vraag('v5').nummer
      } aangevinkt.`,
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
  const informatiewerk = scoreOnderdeel(antwoorden, 'informatiewerk');
  const businesswaarde = scoreOnderdeel(antwoorden, 'businesswaarde');
  const volwassenheid = scoreOnderdeel(antwoorden, 'volwassenheid');

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
