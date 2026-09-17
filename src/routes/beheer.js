'use strict';

/** Beheerdersroutes: inzendingen bekijken, beoordelen en exporteren. */

const express = require('express');

const config = require('../config');
const { tabel } = require('../db');
const { beheerderAlleen } = require('../middleware/auth');
const { beoordeel, CATEGORIEEN, GEWICHTEN, ONDERDEEL_LABELS } = require('../scoring');
const { leesbaar } = require('../validatie');
const { VRAGEN } = require('../vragenlijst');

const router = express.Router();
router.use(beheerderAlleen);

const BESLUITEN = [
  { waarde: 'nieuw', label: 'Nog niet beoordeeld' },
  { waarde: 'licentie_toekennen', label: 'Licentie toekennen' },
  { waarde: 'pilot', label: 'Opnemen in pilotgroep' },
  { waarde: 'nog_niet', label: 'Nog niet toekennen' },
  { waarde: 'afgewezen', label: 'Afgewezen' },
];

/** Haal de antwoorden terug uit de opgeslagen JSON-kolom. */
function antwoordenVan(rij) {
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

/** Verrijk een databaserij met de actuele berekening van het beoordelingsmodel. */
function metBeoordeling(rij) {
  const antwoorden = antwoordenVan(rij);
  const handmatig =
    rij.usecase_score_handmatig === null || rij.usecase_score_handmatig === undefined
      ? null
      : Number(rij.usecase_score_handmatig);
  const beoordeling = beoordeel(antwoorden, handmatig);
  return { rij, antwoorden, beoordeling };
}

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
    const query = tabel().select('*').orderBy('score_totaal', 'desc').orderBy('id', 'desc');

    if (req.query.categorie) query.where('advies_categorie', req.query.categorie);
    if (req.query.besluit) query.where('besluit', req.query.besluit);
    if (req.query.zoek) {
      const term = `%${String(req.query.zoek).toLowerCase()}%`;
      query.where((q) =>
        q
          .whereRaw('LOWER(naam) LIKE ?', [term])
          .orWhereRaw('LOWER(email) LIKE ?', [term])
          .orWhereRaw('LOWER(COALESCE(afdeling, \'\')) LIKE ?', [term])
      );
    }

    const rijen = await query;
    const inzendingen = rijen.map((rij) => {
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
    });

    const samenvatting = CATEGORIEEN.map((c) => ({
      sleutel: c.sleutel,
      label: c.label,
      kleur: c.kleur,
      aantal: inzendingen.filter((i) => i.categorie === c.sleutel).length,
    }));

    res.json({ inzendingen, samenvatting, totaalAantal: inzendingen.length });
  } catch (fout) {
    next(fout);
  }
});

/** Eén inzending met alle antwoorden en de volledige score-onderbouwing. */
router.get('/inzendingen/:id', async (req, res, next) => {
  try {
    const rij = await tabel().where('id', req.params.id).first();
    if (!rij) return res.status(404).json({ fout: 'Inzending niet gevonden.' });

    const { antwoorden, beoordeling } = metBeoordeling(rij);

    res.json({
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
      beoordelingsmodel: { gewichten: GEWICHTEN, onderdeelLabels: ONDERDEEL_LABELS },
      besluit: rij.besluit || 'nieuw',
      besluit_toelichting: rij.besluit_toelichting || '',
      usecase_score_handmatig:
        rij.usecase_score_handmatig === null || rij.usecase_score_handmatig === undefined
          ? null
          : Number(rij.usecase_score_handmatig),
      beoordeeld_door: rij.beoordeeld_door,
      beoordeeld_op: rij.beoordeeld_op,
    });
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

    const invoer = req.body || {};

    let handmatig = null;
    if (invoer.usecase_score_handmatig !== null && invoer.usecase_score_handmatig !== undefined && invoer.usecase_score_handmatig !== '') {
      const getal = Number(invoer.usecase_score_handmatig);
      if (!Number.isFinite(getal) || getal < 0 || getal > GEWICHTEN.usecase) {
        return res
          .status(422)
          .json({ fout: `De handmatige score voor vraag 7 moet tussen 0 en ${GEWICHTEN.usecase} liggen.` });
      }
      handmatig = Math.round(getal * 10) / 10;
    }

    const besluit = String(invoer.besluit || 'nieuw');
    if (!BESLUITEN.some((b) => b.waarde === besluit)) {
      return res.status(422).json({ fout: 'Onbekend besluit.' });
    }

    const antwoorden = antwoordenVan(rij);
    const beoordeling = beoordeel(antwoorden, handmatig);

    await tabel()
      .where('id', rij.id)
      .update({
        usecase_score_handmatig: handmatig,
        score_usecase: beoordeling.onderdelen.usecase.score,
        score_totaal: beoordeling.totaal,
        advies_categorie: beoordeling.categorie,
        besluit,
        besluit_toelichting: (invoer.besluit_toelichting || '').slice(0, 4000) || null,
        beoordeeld_door: req.beheerder,
        beoordeeld_op: besluit === 'nieuw' ? null : new Date(),
      });

    res.json({ ok: true, beoordeling });
  } catch (fout) {
    next(fout);
  }
});

/** CSV-export van alle inzendingen, inclusief scores en besluiten. */
router.get('/export.csv', async (req, res, next) => {
  try {
    const rijen = await tabel().select('*').orderBy('id', 'asc');

    const vraagKoppen = [];
    for (const vraag of VRAGEN) {
      if (vraag.deel === 0) continue;
      if (vraag.type === 'matrix') {
        for (const rij of vraag.rijen) vraagKoppen.push({ sleutel: rij.id, kop: `${vraag.nummer}. ${rij.label}` });
      } else {
        vraagKoppen.push({ sleutel: vraag.id, kop: `${vraag.nummer}. ${vraag.vraag}` });
        if (vraag.andersVeld) vraagKoppen.push({ sleutel: vraag.andersVeld, kop: `${vraag.nummer}. Anders, namelijk` });
      }
    }

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

    const escape = (waarde) => {
      if (waarde === null || waarde === undefined) return '';
      const tekst = String(waarde).replace(/"/g, '""');
      return /[";\n\r]/.test(tekst) ? `"${tekst}"` : tekst;
    };

    const regels = [koppen.map(escape).join(';')];
    for (const rij of rijen) {
      const { antwoorden, beoordeling } = metBeoordeling(rij);
      const leesbareAntwoorden = new Map(leesbaar(antwoorden).map((a) => [a.veld, a.antwoord]));
      regels.push(
        [
          rij.id,
          rij.ingezonden_op instanceof Date ? rij.ingezonden_op.toISOString() : rij.ingezonden_op,
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
          (BESLUITEN.find((b) => b.waarde === (rij.besluit || 'nieuw')) || {}).label,
          rij.besluit_toelichting,
          rij.beoordeeld_door,
          rij.beoordeeld_op instanceof Date ? rij.beoordeeld_op.toISOString() : rij.beoordeeld_op,
          ...vraagKoppen.map((k) => leesbareAntwoorden.get(k.sleutel) ?? antwoorden[k.sleutel] ?? ''),
        ]
          .map(escape)
          .join(';')
      );
    }

    const datum = new Date().toISOString().slice(0, 10);
    res.set('Content-Type', 'text/csv; charset=utf-8');
    res.set('Content-Disposition', `attachment; filename="copilot-aanvragen-${datum}.csv"`);
    // BOM zodat Excel de accenten goed toont.
    res.send('﻿' + regels.join('\r\n'));
  } catch (fout) {
    next(fout);
  }
});

module.exports = router;
