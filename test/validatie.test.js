'use strict';

const test = require('node:test');
const assert = require('node:assert');

const { valideer, leesbaar } = require('../src/validatie');
const { antwoordVelden } = require('../src/vragenlijst');

/** Een volledig ingevulde, geldige inzending. */
function geldigeInvoer(overschrijf = {}) {
  const invoer = {
    naam: 'Test Persoon',
    email: 'test@example.nl',
    functie: 'Adviseur',
    afdeling: 'Staf',
    v2: 'regelmatig',
    v3: '11_tot_25',
    v5: ['samenvatten_email'],
    v5_anders: '',
    v6: '2_tot_4_uur',
    v7: 'Ik notuleer wekelijks drie teamoverleggen en werk die daarna uit in Word.',
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
  return Object.assign(invoer, overschrijf);
}

test('een volledig ingevulde inzending is geldig', () => {
  const resultaat = valideer(geldigeInvoer());
  assert.strictEqual(resultaat.geldig, true, JSON.stringify(resultaat.fouten));
});

test('elke verplichte vraag levert een eigen foutmelding op', () => {
  const resultaat = valideer({});
  assert.strictEqual(resultaat.geldig, false);

  const verplicht = antwoordVelden().filter((v) => v.verplicht);
  for (const veld of verplicht) {
    assert.ok(resultaat.fouten[veld.id], `verwachtte een foutmelding voor ${veld.id}`);
  }
  assert.ok(resultaat.fouten.akkoord_privacy);
});

test('een ongeldig e-mailadres wordt geweigerd', () => {
  assert.ok(valideer(geldigeInvoer({ email: 'geen-adres' })).fouten.email);
  assert.ok(!valideer(geldigeInvoer({ email: 'goed@voorbeeld.nl' })).fouten.email);
});

test('zonder akkoord is de inzending niet geldig', () => {
  const resultaat = valideer(geldigeInvoer({ akkoord_privacy: false }));
  assert.strictEqual(resultaat.geldig, false);
  assert.ok(resultaat.fouten.akkoord_privacy);
});

test('een te kort antwoord op vraag 7 wordt geweigerd', () => {
  assert.ok(valideer(geldigeInvoer({ v7: 'Weet niet' })).fouten.v7);
});

test('onbekende keuzes worden niet overgenomen', () => {
  const resultaat = valideer(geldigeInvoer({ v6: 'bestaat_niet' }));
  assert.ok(resultaat.fouten.v6);
  assert.strictEqual(resultaat.antwoorden.v6, null);
});

test('onbekende waarden in een meerkeuzevraag worden eruit gefilterd', () => {
  const resultaat = valideer(geldigeInvoer({ v5: ['samenvatten_email', 'hack'] }));
  assert.deepStrictEqual(resultaat.antwoorden.v5, ['samenvatten_email']);
  assert.ok(resultaat.fouten.v5);
});

test('te lange tekst wordt geweigerd en afgekapt', () => {
  const resultaat = valideer(geldigeInvoer({ naam: 'a'.repeat(500) }));
  assert.ok(resultaat.fouten.naam);
  assert.strictEqual(resultaat.antwoorden.naam.length, 120);
});

test('antwoorden worden omgezet naar leesbare labels', () => {
  const { antwoorden } = valideer(geldigeInvoer({ v5: ['samenvatten_email', 'anders'], v5_anders: 'Notuleren' }));
  const regels = leesbaar(antwoorden);

  const vraag6 = regels.find((r) => r.veld === 'v6');
  assert.strictEqual(vraag6.antwoord, '2-4 uur');

  const vraag5 = regels.find((r) => r.veld === 'v5');
  assert.ok(vraag5.antwoord.includes('Samenvatten van e-mails'));
  assert.ok(vraag5.antwoord.includes('Anders: Notuleren'));

  const eersteMatrixrij = regels.find((r) => r.veld === 'v1_email');
  assert.strictEqual(eersteMatrixrij.antwoord, '5-10 uur');
});
