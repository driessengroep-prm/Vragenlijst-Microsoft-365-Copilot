'use strict';

/**
 * De vervolgvraag wordt alleen gesteld bij de adviescategorie die om een
 * onderbouwing vraagt, en telt niet mee in de score.
 */

const test = require('node:test');
const assert = require('node:assert');

const { VRAGEN, basisvragen, vervolgvragenVoor, antwoordVelden } = require('../src/vragenlijst');
const { CATEGORIEEN } = require('../src/scoring');
const { valideer, leesbaar } = require('../src/validatie');

test('de vervolgvraag staat niet op het standaardformulier', () => {
  assert.ok(
    !basisvragen().some((v) => v.id === 'use_case'),
    'use_case hoort pas te verschijnen als de score erom vraagt'
  );
  assert.ok(VRAGEN.some((v) => v.id === 'use_case'), 'use_case hoort wel in de definitie te staan');
});

test('de vervolgvraag hoort bij een bestaande adviescategorie', () => {
  for (const vraag of VRAGEN.filter((v) => v.voorwaarde)) {
    assert.ok(
      CATEGORIEEN.some((c) => c.sleutel === vraag.voorwaarde.categorie),
      `${vraag.id} verwijst naar een onbekende categorie: ${vraag.voorwaarde.categorie}`
    );
  }
});

test('alleen de categorie "geschikt, mits" levert een vervolgvraag op', () => {
  assert.deepStrictEqual(
    vervolgvragenVoor('geschikt_mits').map((v) => v.id),
    ['use_case']
  );
  for (const sleutel of ['hoge_prioriteit', 'eerst_training', 'geen_licentie']) {
    assert.deepStrictEqual(vervolgvragenVoor(sleutel), [], `${sleutel} hoort geen vervolgvraag te hebben`);
  }
});

test('de vervolgvraag krijgt een eigen databasekolom', () => {
  const veld = antwoordVelden().find((v) => v.id === 'use_case');
  assert.ok(veld, 'use_case hoort een antwoordveld te zijn');
  assert.strictEqual(veld.kolom, 'use_case');
  assert.strictEqual(veld.type, 'lange_tekst');
});

test('de vervolgvraag blokkeert een gewone inzending niet', () => {
  const invoer = {
    naam: 'Test Persoon',
    email: 'test@example.nl',
    v2: 'regelmatig',
    v3: '11_tot_25',
    v5: ['samenvatten_email'],
    v6: '2_tot_4_uur',
    v8: 'af_en_toe',
    v9: 'basis',
    v10: 'ja',
    akkoord_privacy: true,
  };
  ['v1_email', 'v1_overleggen', 'v1_documenten', 'v1_presentaties', 'v1_zoeken'].forEach(
    (id) => (invoer[id] = '5_tot_10_uur')
  );
  [
    'v4_oude_mails',
    'v4_documenten_kwijt',
    'v4_vergadering_voorbereiden',
    'v4_context_missen',
    'v4_informatie_combineren',
    'v4_samenvatten',
  ].forEach((id) => (invoer[id] = 'regelmatig'));

  const resultaat = valideer(invoer);
  assert.strictEqual(resultaat.geldig, true, JSON.stringify(resultaat.fouten));
  assert.strictEqual(resultaat.antwoorden.use_case, null);
});

test('een niet-gestelde vervolgvraag komt niet in het antwoordoverzicht', () => {
  assert.ok(!leesbaar({ v6: '2_tot_4_uur' }).some((a) => a.veld === 'use_case'));

  const met = leesbaar({ v6: '2_tot_4_uur', use_case: 'Elke maand rapportages samenstellen.' });
  const regel = met.find((a) => a.veld === 'use_case');
  assert.ok(regel, 'een beantwoorde vervolgvraag hoort wél in het overzicht te staan');
  assert.strictEqual(regel.antwoord, 'Elke maand rapportages samenstellen.');
  assert.ok(regel.lang, 'het is een lang antwoord en hoort als tekstblok te worden getoond');
});

test('vraagkoppen zonder nummer leveren geen "undefined" op', () => {
  for (const regel of leesbaar({ use_case: 'Voorbeeld.' })) {
    assert.ok(!/undefined/.test(regel.vraag), `onverwachte kop: ${regel.vraag}`);
  }
});
