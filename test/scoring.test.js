'use strict';

/**
 * Controle op het beoordelingsmodel. Draaien met `npm test`.
 * Pas je de puntentoekenning aan? Dan laten deze tests meteen zien wat dat
 * doet met de gewichten en de adviescategorieën.
 */

const test = require('node:test');
const assert = require('node:assert');

const { beoordeel, GEWICHTEN, CATEGORIEEN, categorieVoor } = require('../src/scoring');

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
    informatiewerk: 50,
    businesswaarde: 38,
    volwassenheid: 12,
  });
});

test('een maximaal profiel haalt 100 punten en is direct kandidaat', () => {
  const resultaat = beoordeel(maximaal());
  assert.strictEqual(resultaat.totaal, 100);
  assert.strictEqual(resultaat.categorie, 'hoge_prioriteit');
  assert.strictEqual(resultaat.onderdelen.informatiewerk.score, 50);
  assert.strictEqual(resultaat.onderdelen.businesswaarde.score, 38);
  assert.strictEqual(resultaat.onderdelen.volwassenheid.score, 12);
});

test('een minimaal profiel haalt 0 punten en heeft geen businesscase', () => {
  const resultaat = beoordeel(antwoorden());
  assert.strictEqual(resultaat.totaal, 0);
  assert.strictEqual(resultaat.categorie, 'geen_licentie');
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
  assert.strictEqual(categorieVoor(100).sleutel, 'hoge_prioriteit');
  assert.strictEqual(categorieVoor(75).sleutel, 'hoge_prioriteit');
  assert.strictEqual(categorieVoor(74).sleutel, 'geschikt_mits');
  assert.strictEqual(categorieVoor(60).sleutel, 'geschikt_mits');
  assert.strictEqual(categorieVoor(59).sleutel, 'eerst_training');
  assert.strictEqual(categorieVoor(45).sleutel, 'eerst_training');
  assert.strictEqual(categorieVoor(44).sleutel, 'geen_licentie');
  assert.strictEqual(categorieVoor(0).sleutel, 'geen_licentie');
});

test('geen enkele categorie belooft nog een proefperiode', () => {
  // Licenties gaan per jaar; een pilot van 2-3 maanden kan niet meer worden
  // toegezegd, dus die belofte mag nergens meer staan.
  for (const categorie of CATEGORIEEN) {
    assert.ok(
      // \b voorkomt dat 'pilot' binnen 'Copilot' meetelt.
      !/\bpilot|proefperiode|proefopstelling/i.test(`${categorie.advies} ${categorie.label}`),
      `${categorie.sleutel} belooft nog een proefperiode`
    );
  }
});

test('scores met een decimaal vallen niet tussen twee categorieën in', () => {
  // Een score als 59,6 mag niet terugvallen naar de laagste categorie.
  assert.strictEqual(categorieVoor(59.6).sleutel, 'eerst_training');
  assert.strictEqual(categorieVoor(74.9).sleutel, 'geschikt_mits');
  assert.strictEqual(categorieVoor(44.4).sleutel, 'geen_licentie');
  assert.strictEqual(categorieVoor(99.9).sleutel, 'hoge_prioriteit');

  // Elke score van 0 tot 100, in stappen van een tiende, krijgt een categorie
  // die bij de ondergrens hoort.
  for (let punten = 0; punten <= 1000; punten++) {
    const totaal = punten / 10;
    const categorie = categorieVoor(totaal);
    assert.ok(categorie, `geen categorie voor ${totaal}`);
    assert.ok(totaal >= categorie.vanaf, `${totaal} hoort niet bij ${categorie.label}`);
    assert.ok(totaal < categorie.tot + 1, `${totaal} valt buiten ${categorie.label}`);
  }
});

test('de score komt uitsluitend uit de meerkeuzeantwoorden', () => {
  const resultaat = beoordeel(maximaal());
  const som = Object.values(resultaat.onderdelen).reduce((totaal, onderdeel) => totaal + onderdeel.score, 0);

  assert.strictEqual(Math.round(som * 10) / 10, resultaat.totaal);
  assert.deepStrictEqual(Object.keys(resultaat.onderdelen), [
    'informatiewerk',
    'businesswaarde',
    'volwassenheid',
  ]);
});

test('dezelfde antwoorden leveren altijd dezelfde score op', () => {
  const invoer = maximaal();
  assert.strictEqual(beoordeel(invoer).totaal, beoordeel(invoer).totaal);
  assert.strictEqual(beoordeel(invoer).categorie, beoordeel(Object.assign({}, invoer)).categorie);
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

test('de vervolgvraag telt niet mee in de score', () => {
  const zonder = beoordeel(antwoorden({ v6: '2_tot_4_uur' }));
  const met = beoordeel(antwoorden({ v6: '2_tot_4_uur', use_case: 'Een uitgebreide beschrijving van een terugkerende situatie.' }));

  assert.strictEqual(met.totaal, zonder.totaal);
  assert.strictEqual(met.categorie, zonder.categorie);
});
