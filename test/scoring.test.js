'use strict';

/**
 * Controle op het beoordelingsmodel. Draaien met `npm test`.
 * Pas je de puntentoekenning aan? Dan laten deze tests meteen zien wat dat
 * doet met de gewichten en de adviescategorieën.
 */

const test = require('node:test');
const assert = require('node:assert');

const { beoordeel, GEWICHTEN, categorieVoor, scoreUseCaseAutomatisch } = require('../src/scoring');

const V1 = ['v1_email', 'v1_overleggen', 'v1_documenten', 'v1_presentaties', 'v1_zoeken'];
const V4 = [
  'v4_oude_mails',
  'v4_documenten_kwijt',
  'v4_vergadering_voorbereiden',
  'v4_context_missen',
  'v4_informatie_combineren',
  'v4_samenvatten',
];

/** Bouwt een set antwoorden met overal dezelfde keuze. */
function antwoorden(overschrijf = {}) {
  const basis = {};
  V1.forEach((id) => (basis[id] = 'minder_dan_2_uur'));
  V4.forEach((id) => (basis[id] = 'nooit'));
  Object.assign(basis, {
    v2: 'nooit',
    v3: '1_tot_5',
    v5: [],
    v6: 'minder_dan_30_min',
    v7: '',
    v8: 'nee',
    v9: 'beginner',
    v10: 'nee',
  });
  return Object.assign(basis, overschrijf);
}

function maximaal() {
  const hoog = {};
  V1.forEach((id) => (hoog[id] = 'meer_dan_10_uur'));
  V4.forEach((id) => (hoog[id] = 'zeer_vaak'));
  return antwoorden(
    Object.assign(hoog, {
      v2: 'dagelijks',
      v3: 'meer_dan_25',
      v5: ['samenvatten_email', 'samenvatten_teams', 'opstellen_documenten', 'analyse_excel'],
      v6: 'meer_dan_4_uur',
      v7:
        'Elke week bereid ik vier bestuursoverleggen voor. Ik zoek in Outlook en Teams naar eerdere ' +
        'verslagen en combineer die in een nieuw document in Word. Dat kost mij structureel ongeveer ' +
        '3 uur per week aan zoeken en samenvatten van oude notulen en verslagen.',
      v8: 'dagelijks',
      v9: 'expert',
      v10: 'ja_en_delen',
    })
  );
}

test('de gewichten tellen op tot 100 punten', () => {
  const som = Object.values(GEWICHTEN).reduce((a, b) => a + b, 0);
  assert.strictEqual(som, 100);
  assert.deepStrictEqual(GEWICHTEN, {
    informatiewerk: 40,
    businesswaarde: 30,
    usecase: 20,
    volwassenheid: 10,
  });
});

test('een maximaal profiel haalt 100 punten en is direct kandidaat', () => {
  const resultaat = beoordeel(maximaal());
  assert.strictEqual(resultaat.totaal, 100);
  assert.strictEqual(resultaat.categorie, 'direct_kandidaat');
  assert.strictEqual(resultaat.onderdelen.informatiewerk.score, 40);
  assert.strictEqual(resultaat.onderdelen.businesswaarde.score, 30);
  assert.strictEqual(resultaat.onderdelen.usecase.score, 20);
  assert.strictEqual(resultaat.onderdelen.volwassenheid.score, 10);
});

test('een minimaal profiel haalt 0 punten en heeft geen businesscase', () => {
  const resultaat = beoordeel(antwoorden());
  assert.strictEqual(resultaat.totaal, 0);
  assert.strictEqual(resultaat.categorie, 'geen_businesscase');
});

test('geen enkel onderdeel kan boven zijn gewicht uitkomen', () => {
  const resultaat = beoordeel(maximaal());
  for (const [sleutel, onderdeel] of Object.entries(resultaat.onderdelen)) {
    assert.ok(
      onderdeel.score <= GEWICHTEN[sleutel],
      `${sleutel} scoort ${onderdeel.score}, maximaal ${GEWICHTEN[sleutel]}`
    );
  }
});

test('de grenzen van de adviescategorieën sluiten op elkaar aan', () => {
  assert.strictEqual(categorieVoor(100).sleutel, 'direct_kandidaat');
  assert.strictEqual(categorieVoor(80).sleutel, 'direct_kandidaat');
  assert.strictEqual(categorieVoor(79).sleutel, 'pilotgroep');
  assert.strictEqual(categorieVoor(60).sleutel, 'pilotgroep');
  assert.strictEqual(categorieVoor(59).sleutel, 'nog_niet');
  assert.strictEqual(categorieVoor(40).sleutel, 'nog_niet');
  assert.strictEqual(categorieVoor(39).sleutel, 'geen_businesscase');
  assert.strictEqual(categorieVoor(0).sleutel, 'geen_businesscase');
});

test('een handmatige score voor vraag 7 vervangt de automatische indicatie', () => {
  const invoer = antwoorden({ v7: 'Kort voorbeeld zonder veel detail.' });
  const automatisch = beoordeel(invoer);
  const handmatig = beoordeel(invoer, 20);

  assert.notStrictEqual(automatisch.onderdelen.usecase.score, 20);
  assert.strictEqual(handmatig.onderdelen.usecase.score, 20);
  assert.strictEqual(handmatig.onderdelen.usecase.handmatig, 20);
  assert.strictEqual(
    handmatig.totaal,
    Math.round((automatisch.totaal - automatisch.onderdelen.usecase.score + 20) * 10) / 10
  );
});

test('een handmatige score van 0 telt als keuze, niet als "niet ingevuld"', () => {
  const invoer = maximaal();
  const resultaat = beoordeel(invoer, 0);
  assert.strictEqual(resultaat.onderdelen.usecase.score, 0);
  assert.strictEqual(resultaat.onderdelen.usecase.handmatig, 0);
  assert.strictEqual(resultaat.totaal, 80);
});

test('een uitgewerkt, meetbaar voorbeeld scoort hoger dan een vaag voorbeeld', () => {
  const vaag = scoreUseCaseAutomatisch('Weet ik niet.');
  const concreet = scoreUseCaseAutomatisch(
    'Ik stel elke maand een rapportage op waarvoor ik gegevens uit Excel en mails van klanten ' +
      'combineer. Dat kost mij ongeveer 4 uur per maand aan handmatig verzamelen en samenvatten.'
  );
  assert.ok(concreet.score > vaag.score, `${concreet.score} moet groter zijn dan ${vaag.score}`);
  assert.ok(concreet.score <= GEWICHTEN.usecase);
});

test('een leeg voorbeeld levert nul punten op', () => {
  assert.strictEqual(scoreUseCaseAutomatisch('').score, 0);
  assert.strictEqual(scoreUseCaseAutomatisch(null).score, 0);
});

test('de verwachte tijdwinst weegt zwaarder dan het aantal genoemde toepassingen', () => {
  const veelTijdwinst = beoordeel(antwoorden({ v6: 'meer_dan_4_uur', v5: [] }));
  const veelToepassingen = beoordeel(
    antwoorden({
      v6: 'minder_dan_30_min',
      v5: ['samenvatten_email', 'samenvatten_teams', 'opstellen_documenten', 'analyse_excel', 'zoeken_m365'],
    })
  );
  assert.ok(veelTijdwinst.onderdelen.businesswaarde.score > veelToepassingen.onderdelen.businesswaarde.score);
});

test('de profielkenmerken uit het kader worden herkend', () => {
  const resultaat = beoordeel(maximaal());
  assert.strictEqual(resultaat.signalen.length, 4);
  assert.ok(resultaat.signalen.every((s) => s.voldaan), 'alle kenmerken horen te kloppen bij een maximaal profiel');

  const laag = beoordeel(antwoorden());
  assert.ok(laag.signalen.every((s) => !s.voldaan), 'geen enkel kenmerk hoort te kloppen bij een minimaal profiel');
});

test('ontbrekende antwoorden leiden niet tot een fout', () => {
  assert.doesNotThrow(() => beoordeel({}));
  assert.strictEqual(beoordeel({}).totaal, 0);
});
