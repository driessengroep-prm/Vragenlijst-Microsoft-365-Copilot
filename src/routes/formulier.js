'use strict';

/** Publieke routes: vragenlijst ophalen en een inzending wegschrijven. */

const crypto = require('crypto');
const express = require('express');
const rateLimit = require('express-rate-limit');

const config = require('../config');
const { tabel } = require('../db');
const { DELEN, VRAGEN } = require('../vragenlijst');
const { valideer } = require('../validatie');
const { nieuweRij } = require('../beheerweergave');

const router = express.Router();

const inzendLimiet = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: config.formulier.maxInzendingenPerKwartier,
  standardHeaders: true,
  legacyHeaders: false,
  // Alleen geslaagde inzendingen tellen mee. Anders kan iemand die een paar
  // keer een invulfout maakt zichzelf buitensluiten.
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

/** De vragenlijstdefinitie, zodat de front-end het formulier kan opbouwen. */
router.get('/vragenlijst', (req, res) => {
  res.json({ delen: DELEN, vragen: VRAGEN });
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

  const rij = nieuweRij(resultaat.antwoorden, {
    ip_hash: ipHash(req.ip),
    user_agent: (req.get('user-agent') || '').slice(0, 255),
    akkoord_privacy: resultaat.akkoordPrivacy,
    akkoord_contact: resultaat.akkoordContact,
  });

  try {
    await tabel().insert(rij);
  } catch (fout) {
    console.error('Wegschrijven van een inzending mislukt:', fout);
    return res.status(500).json({
      fout:
        'Je antwoorden konden niet worden opgeslagen. Probeer het later opnieuw of neem contact op met de beheerder.',
    });
  }

  res.status(201).json({ ok: true });
});

module.exports = router;
