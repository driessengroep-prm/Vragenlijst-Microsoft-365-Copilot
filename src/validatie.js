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
