'use strict';

/** Beheerdersroutes: inzendingen bekijken, beoordelen en exporteren. */

const express = require('express');

const { tabel } = require('../db');
const { beheerderAlleen } = require('../middleware/auth');
const { CATEGORIEEN, GEWICHTEN, ONDERDEEL_LABELS } = require('../scoring');
const { BESLUITEN } = require('../besluiten');
const weergave = require('../beheerweergave');

const router = express.Router();
router.use(beheerderAlleen);

/** Configuratie van het beoordelingsmodel, voor de beheerdersinterface. */
router.get('/model', (req, res) => {
  res.json({
    gewichten: GEWICHTEN,
    onderdeelLabels: ONDERDEEL_LABELS,
    categorieen: CATEGORIEEN,
    besluiten: BESLUITEN,
    beheerder: req.beheerder,
  });
});

/** Overzicht van alle inzendingen, inclusief score en adviescategorie. */
router.get('/inzendingen', async (req, res, next) => {
  try {
    const query = tabel().select('*');

    if (req.query.besluit) query.where('besluit', req.query.besluit);
    if (req.query.zoek) {
      const term = `%${String(req.query.zoek).toLowerCase()}%`;
      query.where((q) =>
        q
          .whereRaw('LOWER(naam) LIKE ?', [term])
          .orWhereRaw('LOWER(email) LIKE ?', [term])
          .orWhereRaw("LOWER(COALESCE(afdeling, '')) LIKE ?", [term])
      );
    }

    const rijen = await query;

    // Op de categorie filteren we ná het herberekenen, niet in de database.
    // De opgeslagen kolom kan namelijk van een oudere versie van het model
    // zijn; zo komt het filter altijd overeen met wat er op het scherm staat.
    let inzendingen = rijen.map(weergave.overzichtsRij);
    if (req.query.categorie) {
      inzendingen = inzendingen.filter((i) => i.categorie === req.query.categorie);
    }
    inzendingen.sort((a, b) => b.totaal - a.totaal || b.id - a.id);

    res.json({
      inzendingen,
      samenvatting: weergave.samenvatting(inzendingen),
      totaalAantal: inzendingen.length,
    });
  } catch (fout) {
    next(fout);
  }
});

/** Eén inzending met alle antwoorden en de volledige score-onderbouwing. */
router.get('/inzendingen/:id', async (req, res, next) => {
  try {
    const rij = await tabel().where('id', req.params.id).first();
    if (!rij) return res.status(404).json({ fout: 'Inzending niet gevonden.' });

    res.json(
      Object.assign(weergave.detail(rij), {
        beoordelingsmodel: { gewichten: GEWICHTEN, onderdeelLabels: ONDERDEEL_LABELS },
      })
    );
  } catch (fout) {
    next(fout);
  }
});

/**
 * Beoordeling vastleggen: handmatige score voor vraag 7, het besluit en een
 * toelichting. De totaalscore en adviescategorie worden opnieuw berekend en
 * meteen teruggeschreven, zodat ze ook in je eigen database kloppen.
 */
router.put('/inzendingen/:id/beoordeling', async (req, res, next) => {
  try {
    const rij = await tabel().where('id', req.params.id).first();
    if (!rij) return res.status(404).json({ fout: 'Inzending niet gevonden.' });

    const resultaat = weergave.beoordelingsUpdate(rij, req.body || {}, req.beheerder);
    if (resultaat.fout) return res.status(422).json({ fout: resultaat.fout });

    await tabel().where('id', rij.id).update(resultaat.waarden);

    res.json({ ok: true, beoordeling: resultaat.beoordeling });
  } catch (fout) {
    next(fout);
  }
});

/** CSV-export van alle inzendingen, inclusief scores en besluiten. */
router.get('/export.csv', async (req, res, next) => {
  try {
    const rijen = await tabel().select('*').orderBy('id', 'asc');
    const datum = new Date().toISOString().slice(0, 10);

    res.set('Content-Type', 'text/csv; charset=utf-8');
    res.set('Content-Disposition', `attachment; filename="copilot-aanvragen-${datum}.csv"`);
    res.send(weergave.csv(rijen));
  } catch (fout) {
    next(fout);
  }
});

module.exports = router;
