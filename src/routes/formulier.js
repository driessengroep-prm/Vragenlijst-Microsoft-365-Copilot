'use strict';

/** Publieke routes: vragenlijst ophalen en een inzending wegschrijven. */

const crypto = require('crypto');
const express = require('express');
const rateLimit = require('express-rate-limit');

const config = require('../config');
const { tabel } = require('../db');
const { DELEN, basisvragen, vervolgvragenVoor } = require('../vragenlijst');
const { valideer } = require('../validatie');
const { beoordeel } = require('../scoring');
const { nieuweRij } = require('../beheerweergave');
const mail = require('../mail');

const router = express.Router();

const inzendLimiet = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: config.formulier.maxInzendingenPerKwartier,
  standardHeaders: true,
  legacyHeaders: false,
  // Alleen een daadwerkelijk opgeslagen inzending telt mee. Zo kan iemand die
  // een invulfout maakt of nog een vervolgvraag moet beantwoorden zichzelf
  // niet buitensluiten.
  requestWasSuccessful: (req, res) => res.statusCode === 201,
  skipFailedRequests: true,
  message: {
    fout: 'Er zijn te veel inzendingen vanaf dit adres. Probeer het over een kwartier opnieuw.',
  },
});

function ipHash(ip) {
  if (!config.formulier.bewaarIpHash || !ip) return null;
  return crypto
    .createHash('sha256')
    .update(config.formulier.ipHashSalt + ip)
    .digest('hex');
}

/**
 * De vragenlijstdefinitie voor de front-end.
 *
 * De puntenwaarden laten we bewust weg: die horen op de server te blijven,
 * zodat een invuller niet kan terugrekenen welke antwoorden het hoogst scoren.
 * Voorwaardelijke vervolgvragen zitten er ook niet in; die stuurt de server pas
 * mee als de score erom vraagt.
 */
function zonderPunten(vraag) {
  const kopie = { ...vraag };
  if (Array.isArray(vraag.opties)) {
    kopie.opties = vraag.opties.map(({ punten, ...rest }) => rest);
  }
  delete kopie.onderdeel;
  return kopie;
}

router.get('/vragenlijst', (req, res) => {
  res.json({ delen: DELEN, vragen: basisvragen().map(zonderPunten) });
});

router.post('/inzendingen', inzendLimiet, async (req, res) => {
  // Honeypot: een verborgen veld dat alleen bots invullen.
  if (req.body && req.body.website) {
    return res.status(202).json({ ok: true });
  }

  const resultaat = valideer(req.body || {});
  if (!resultaat.geldig) {
    return res.status(422).json({
      fout: 'Niet alle vragen zijn (juist) ingevuld.',
      velden: resultaat.fouten,
    });
  }

  const { antwoorden } = resultaat;
  const beoordeling = beoordeel(antwoorden);

  // Sommige adviescategorieën vragen om een onderbouwing van de invuller.
  // Ontbreekt die nog, dan slaan we nog niets op maar sturen we de vervolgvraag
  // terug. De categorie zelf blijft binnenskamers.
  const vervolgvragen = vervolgvragenVoor(beoordeling.categorie);
  const openstaand = vervolgvragen.filter((vraag) => !antwoorden[vraag.id]);

  if (openstaand.length > 0) {
    return res.status(200).json({
      vervolgvragen: openstaand.map(zonderPunten),
      toelichting:
        'Op basis van je antwoorden kan Microsoft 365 Copilot je werk waarschijnlijk ondersteunen. ' +
        'Om je aanvraag goed te kunnen beoordelen, vragen we je nog één ding toe te lichten.',
    });
  }

  const rij = nieuweRij(antwoorden, {
    ip_hash: ipHash(req.ip),
    user_agent: (req.get('user-agent') || '').slice(0, 255),
    akkoord_privacy: resultaat.akkoordPrivacy,
    akkoord_contact: resultaat.akkoordContact,
  });

  let id;
  try {
    const ingevoegd = await tabel().insert(rij).returning('id');
    id = Array.isArray(ingevoegd) ? ingevoegd[0] : ingevoegd;
    if (id && typeof id === 'object') id = id.id;
  } catch (fout) {
    console.error('Wegschrijven van een inzending mislukt:', fout);
    return res.status(500).json({
      fout:
        'Je antwoorden konden niet worden opgeslagen. Probeer het later opnieuw of neem contact op met de beheerder.',
    });
  }

  // De aanvraag staat nu veilig in de database. Of de bevestigingsmail
  // aankomt, mag het antwoord aan de invuller niet meer tegenhouden.
  const bevestigd = await mail.verstuurBevestiging(antwoorden);
  if (id !== undefined && id !== null) {
    await tabel()
      .where('id', id)
      .update({ bevestiging_verzonden: bevestigd })
      .catch((fout) => console.error('Bijwerken van de mailstatus mislukt:', fout.message));
  }

  res.status(201).json({ ok: true, bevestigingsmail: bevestigd });
});

module.exports = router;
