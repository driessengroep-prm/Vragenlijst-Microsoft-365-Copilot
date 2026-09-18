'use strict';

/**
 * Herberekent de opgeslagen scores van alle inzendingen met het huidige
 * beoordelingsmodel.
 *
 * Draaien met `npm run herbereken`.
 *
 * De beheerdersomgeving rekent altijd live door, dus voor het scherm is dit
 * niet nodig. Het is bedoeld voor de kolommen in je eigen database: na een
 * wijziging in de weging of de adviescategorieën staan `score_totaal` en
 * `advies_categorie` daar nog op de oude waarden, en daar query je zelf op.
 *
 * Het script raakt alleen de berekende kolommen aan. Besluiten, toelichtingen
 * en de antwoorden zelf blijven ongemoeid.
 */

const config = require('../src/config');
const { tabel, sluit } = require('../src/db');
const { beoordeel } = require('../src/scoring');
const { antwoordenVan } = require('../src/beheerweergave');

async function herbereken() {
  const rijen = await tabel().select('*');
  console.log(`${rijen.length} inzending(en) gevonden in '${config.db.tabel}'.`);

  let gewijzigd = 0;
  for (const rij of rijen) {
    const beoordeling = beoordeel(antwoordenVan(rij));

    const nieuw = {
      score_informatiewerk: beoordeling.onderdelen.informatiewerk.score,
      score_businesswaarde: beoordeling.onderdelen.businesswaarde.score,
      score_volwassenheid: beoordeling.onderdelen.volwassenheid.score,
      score_totaal: beoordeling.totaal,
      advies_categorie: beoordeling.categorie,
    };

    const ongewijzigd =
      Number(rij.score_totaal) === nieuw.score_totaal && rij.advies_categorie === nieuw.advies_categorie;

    if (ongewijzigd) continue;

    await tabel().where('id', rij.id).update(nieuw);
    gewijzigd++;
    console.log(
      `  #${rij.id} ${rij.naam || ''}: ${rij.score_totaal} (${rij.advies_categorie}) ` +
        `-> ${nieuw.score_totaal} (${nieuw.advies_categorie})`
    );
  }

  console.log(gewijzigd === 0 ? 'Alles was al bij de tijd.' : `${gewijzigd} inzending(en) bijgewerkt.`);
}

herbereken()
  .then(() => sluit())
  .then(() => process.exit(0))
  .catch(async (fout) => {
    console.error('Herberekenen mislukt:', fout.message);
    await sluit().catch(() => {});
    process.exit(1);
  });
