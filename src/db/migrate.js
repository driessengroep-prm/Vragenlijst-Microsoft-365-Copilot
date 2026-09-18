'use strict';

/**
 * Maakt (of werkt bij) de tabel waarin de inzendingen worden weggeschreven.
 *
 * Draai dit script met `npm run migrate`. Het is idempotent: bestaande
 * kolommen blijven ongemoeid, ontbrekende kolommen worden toegevoegd. Zo kun
 * je later een vraag toevoegen in src/vragenlijst.js en opnieuw migreren
 * zonder gegevensverlies.
 */

const config = require('../config');
const { db, sluit } = require('./index');
const { antwoordVelden } = require('../vragenlijst');

/** Kolommen die niet uit de vragenlijst komen, maar uit de verwerking. */
const VASTE_KOLOMMEN = [
  { naam: 'id', soort: 'increments' },
  { naam: 'ingezonden_op', soort: 'timestamp' },
  { naam: 'bron', soort: 'string', lengte: 50 },
  { naam: 'ip_hash', soort: 'string', lengte: 64 },
  { naam: 'user_agent', soort: 'string', lengte: 255 },
  { naam: 'akkoord_privacy', soort: 'boolean' },
  { naam: 'akkoord_contact', soort: 'boolean' },
  { naam: 'antwoorden_json', soort: 'text' },
  { naam: 'bevestiging_verzonden', soort: 'boolean' },

  // Berekende scores volgens het beoordelingsmodel.
  { naam: 'score_informatiewerk', soort: 'decimal' },
  { naam: 'score_businesswaarde', soort: 'decimal' },
  { naam: 'score_volwassenheid', soort: 'decimal' },
  { naam: 'score_totaal', soort: 'decimal' },
  { naam: 'advies_categorie', soort: 'string', lengte: 40 },

  // Beoordeling door de beheerder.
  { naam: 'besluit', soort: 'string', lengte: 40 },
  { naam: 'besluit_toelichting', soort: 'text' },
  { naam: 'beoordeeld_door', soort: 'string', lengte: 120 },
  { naam: 'beoordeeld_op', soort: 'timestamp' },
];

/** Vertaal onze veldsoorten naar Knex-kolommen. */
function maakKolom(tabelBouwer, kolom) {
  switch (kolom.soort) {
    case 'increments':
      return tabelBouwer.increments(kolom.naam).primary();
    case 'timestamp':
      return tabelBouwer.timestamp(kolom.naam);
    case 'boolean':
      return tabelBouwer.boolean(kolom.naam);
    case 'decimal':
      return tabelBouwer.decimal(kolom.naam, 5, 1);
    case 'text':
      return tabelBouwer.text(kolom.naam);
    default:
      return tabelBouwer.string(kolom.naam, kolom.lengte || 255);
  }
}

/** Kolomdefinities die volgen uit de vragenlijst zelf. */
function vragenlijstKolommen() {
  return antwoordVelden().map((veld) => {
    if (veld.type === 'lange_tekst') return { naam: veld.kolom, soort: 'text' };
    if (veld.type === 'meerkeuze') return { naam: veld.kolom, soort: 'text' };
    return { naam: veld.kolom, soort: 'string', lengte: veld.maxLengte || 255 };
  });
}

async function migreer() {
  const verbinding = db();
  const schema = config.db.schema ? verbinding.schema.withSchema(config.db.schema) : verbinding.schema;
  const naam = config.db.tabel;
  const alleKolommen = [...VASTE_KOLOMMEN, ...vragenlijstKolommen()];

  const bestaat = await schema.hasTable(naam);

  if (!bestaat) {
    console.log(`Tabel '${naam}' bestaat nog niet - aanmaken...`);
    await schema.createTable(naam, (t) => {
      for (const kolom of alleKolommen) maakKolom(t, kolom);
      t.index(['advies_categorie'], `${naam}_categorie_idx`);
      t.index(['ingezonden_op'], `${naam}_datum_idx`);
    });
    console.log(`Tabel '${naam}' aangemaakt met ${alleKolommen.length} kolommen.`);
  } else {
    console.log(`Tabel '${naam}' bestaat al - controleren op ontbrekende kolommen...`);
    const ontbrekend = [];
    for (const kolom of alleKolommen) {
      if (kolom.soort === 'increments') continue;
      const aanwezig = config.db.schema
        ? await verbinding.schema.withSchema(config.db.schema).hasColumn(naam, kolom.naam)
        : await verbinding.schema.hasColumn(naam, kolom.naam);
      if (!aanwezig) ontbrekend.push(kolom);
    }
    if (ontbrekend.length === 0) {
      console.log('Alle kolommen zijn aanwezig. Niets te doen.');
    } else {
      await schema.alterTable(naam, (t) => {
        for (const kolom of ontbrekend) maakKolom(t, kolom);
      });
      console.log(`Toegevoegd: ${ontbrekend.map((k) => k.naam).join(', ')}`);
    }
  }
}

if (require.main === module) {
  migreer()
    .then(() => sluit())
    .then(() => {
      console.log('Migratie afgerond.');
      process.exit(0);
    })
    .catch(async (fout) => {
      console.error('Migratie mislukt:', fout.message);
      await sluit().catch(() => {});
      process.exit(1);
    });
}

module.exports = { migreer, VASTE_KOLOMMEN, vragenlijstKolommen };
