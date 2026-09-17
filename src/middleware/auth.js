'use strict';

const crypto = require('crypto');
const config = require('../config');

/** Tijdconstante vergelijking, zodat wachtwoorden niet te raden zijn via timing. */
function gelijk(a, b) {
  const bufA = Buffer.from(String(a));
  const bufB = Buffer.from(String(b));
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

/**
 * Eenvoudige HTTP Basic-authenticatie voor de beheerdersomgeving.
 * Zonder ADMIN_PASSWORD in .env is de beheerdersomgeving uitgeschakeld.
 */
function beheerderAlleen(req, res, next) {
  if (!config.beheer.wachtwoord) {
    return res.status(503).json({
      fout:
        'De beheerdersomgeving is nog niet ingeschakeld. Stel ADMIN_PASSWORD in het .env-bestand in.',
    });
  }

  const header = req.get('authorization') || '';
  if (header.startsWith('Basic ')) {
    const [gebruiker, wachtwoord] = Buffer.from(header.slice(6), 'base64').toString('utf8').split(':');
    if (gelijk(gebruiker || '', config.beheer.gebruiker) && gelijk(wachtwoord || '', config.beheer.wachtwoord)) {
      req.beheerder = gebruiker;
      return next();
    }
  }

  res.set('WWW-Authenticate', 'Basic realm="Beheer vragenlijst Copilot", charset="UTF-8"');
  res.status(401).json({ fout: 'Inloggen vereist.' });
}

module.exports = { beheerderAlleen };
