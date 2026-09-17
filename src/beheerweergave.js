'use strict';

/**
 * Omzetting van opgeslagen rijen naar wat de beheerdersinterface toont.
 *
 * Deze module bevat geen database- of webservercode, zodat zowel de
 * beheerders-API (src/routes/beheer.js) als de statische demoversie voor
 * GitHub Pages er precies hetzelfde uit kan halen.
 */

const { beoordeel, CATEGORIEEN, GEWICHTEN } = require('./scoring');
const { BESLUITEN, besluit } = require('./besluiten');
const { leesbaar } = require('./validatie');
const { VRAGEN } = require('./vragenlijst');

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

/** Getallen komen bij sommige databases als tekst terug. */
function getalOfNull(waarde) {
  if (waarde === null || waarde === undefined || waarde === '') return null;
  const getal = Number(waarde);
  return Number.isFinite(getal) ? getal : null;
}

/** Verrijk een opgeslagen rij met de actuele berekening van het beoordelingsmodel. */
function metBeoordeling(rij) {
  const antwoorden = antwoordenVan(rij);
  const beoordeling = beoordeel(antwoorden, getalOfNull(rij.usecase_score_handmatig));
  return { antwoorden, beoordeling };
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
    categorieKleur: beoordeling.categorieKleur,
    onderdelen: {
      informatiewerk: beoordeling.onderdelen.informatiewerk.score,
      businesswaarde: beoordeling.onderdelen.businesswaarde.score,
      usecase: beoordeling.onderdelen.usecase.score,
      volwassenheid: beoordeling.onderdelen.volwassenheid.score,
    },
    handmatigBeoordeeld: beoordeling.onderdelen.usecase.handmatig !== null,
    besluit: rij.besluit || 'nieuw',
    beoordeeld_op: rij.beoordeeld_op,
  };
}

/** Aantallen per adviescategorie, voor de tegels bovenaan het overzicht. */
function samenvatting(inzendingen) {
  return CATEGORIEEN.map((c) => ({
    sleutel: c.sleutel,
    label: c.label,
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
    antwoorden: leesbaar(antwoorden),
    beoordeling,
    besluit: rij.besluit || 'nieuw',
    besluit_toelichting: rij.besluit_toelichting || '',
    usecase_score_handmatig: getalOfNull(rij.usecase_score_handmatig),
    beoordeeld_door: rij.beoordeeld_door,
    beoordeeld_op: rij.beoordeeld_op,
  };
}

/** De waarden die bij een nieuwe inzending worden opgeslagen. */
function nieuweRij(antwoorden, extra = {}) {
  const beoordeling = beoordeel(antwoorden, null);

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
    score_usecase_automatisch: beoordeling.onderdelen.usecase.automatisch,
    score_usecase: beoordeling.onderdelen.usecase.score,
    score_volwassenheid: beoordeling.onderdelen.volwassenheid.score,
    score_totaal: beoordeling.totaal,
    advies_categorie: beoordeling.categorie,

    usecase_score_handmatig: null,
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

/** De waarden die worden bijgewerkt als de beheerder een beoordeling opslaat. */
function beoordelingsUpdate(rij, invoer, beheerder) {
  const handmatig = getalOfNull(invoer.usecase_score_handmatig);
  if (handmatig !== null && (handmatig < 0 || handmatig > GEWICHTEN.usecase)) {
    return { fout: `De handmatige score voor vraag 7 moet tussen 0 en ${GEWICHTEN.usecase} liggen.` };
  }

  const gekozenBesluit = String(invoer.besluit || 'nieuw');
  if (!BESLUITEN.some((b) => b.waarde === gekozenBesluit)) {
    return { fout: 'Onbekend besluit.' };
  }

  const beoordeling = beoordeel(antwoordenVan(rij), handmatig);

  return {
    beoordeling,
    waarden: {
      usecase_score_handmatig: handmatig === null ? null : Math.round(handmatig * 10) / 10,
      score_usecase: beoordeling.onderdelen.usecase.score,
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
      koppen.push({ sleutel: vraag.id, kop: `${vraag.nummer}. ${vraag.vraag}` });
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
    'score_usecase',
    'score_usecase_automatisch',
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
        beoordeling.onderdelen.usecase.score,
        beoordeling.onderdelen.usecase.automatisch,
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
