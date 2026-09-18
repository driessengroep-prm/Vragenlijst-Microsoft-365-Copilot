'use strict';

/**
 * De bevestigingsmail aan de invuller.
 *
 * Belangrijkste eisen: de mail lekt de beoordeling niet, en invoer van de
 * bezoeker komt niet ongefilterd in de HTML terecht.
 */

// Vóór het inladen van de configuratie, zodat deze tests niet afhangen van
// wat er toevallig in .env staat. dotenv overschrijft bestaande waarden niet.
process.env.MAIL_HOST = process.env.MAIL_HOST || 'smtp.test';
process.env.MAIL_FROM = 'Driessen Groep <noreply@test.nl>';
process.env.MAIL_REPLY_TO = 'copilot@test.nl';

const test = require('node:test');
const assert = require('node:assert');

const { bouwBericht, ingeschakeld, verstuurBevestiging } = require('../src/mail');

const ANTWOORDEN = {
  naam: 'Ruben Vos',
  email: 'ruben.vos@voorbeeld.nl',
  functie: 'Adviseur',
  afdeling: 'Beleid',
};

test('de mail is geadresseerd aan de invuller', () => {
  const bericht = bouwBericht(ANTWOORDEN, new Date('2026-09-18T10:00:00Z'));
  assert.strictEqual(bericht.to, 'ruben.vos@voorbeeld.nl');
  assert.strictEqual(bericht.from, 'Driessen Groep <noreply@test.nl>');
  assert.strictEqual(bericht.replyTo, 'copilot@test.nl');
  assert.ok(bericht.subject.length > 0);
});

test('de mail heeft zowel een HTML- als een platte-tekstversie', () => {
  const bericht = bouwBericht(ANTWOORDEN);
  assert.ok(bericht.html.includes('<!DOCTYPE html>'));
  assert.ok(bericht.text.includes('Beste Ruben Vos,'));
  assert.ok(!bericht.text.includes('<'), 'de platte-tekstversie hoort geen HTML te bevatten');
});

test('de mail bevat geen score, categorie of advies', () => {
  const bericht = bouwBericht({
    ...ANTWOORDEN,
    use_case: 'Ik stel elk kwartaal rapportages samen.',
  });
  const alles = `${bericht.subject} ${bericht.text} ${bericht.html}`.toLowerCase();

  for (const verboden of [
    'score',
    'punten',
    'geschikt, mits',
    'geschikt_mits',
    'hoge prioriteit',
    'hoge_prioriteit',
    'eerst_training',
    'geen_licentie',
    'adviescategorie',
  ]) {
    assert.ok(!alles.includes(verboden), `de mail lekt "${verboden}" naar de invuller`);
  }
});

test('invoer van de bezoeker wordt in de HTML ontsmet', () => {
  const bericht = bouwBericht({
    ...ANTWOORDEN,
    naam: 'Ruben <script>alert(1)</script> Vos',
    afdeling: 'Beleid & "Strategie"',
    use_case: '<img src=x onerror=alert(1)>',
  });

  assert.ok(!bericht.html.includes('<script>'), 'er staat een letterlijke scripttag in de HTML');
  assert.ok(!bericht.html.includes('<img src=x'), 'er staat een letterlijke imgtag in de HTML');
  assert.ok(bericht.html.includes('&lt;script&gt;'));
  assert.ok(bericht.html.includes('&amp;'));
  assert.ok(bericht.html.includes('&quot;'));
});

test('de toelichting komt alleen in de mail als die is ingevuld', () => {
  const zonder = bouwBericht(ANTWOORDEN);
  assert.ok(!zonder.html.includes('Je toelichting'));
  assert.ok(!zonder.text.includes('Je toelichting'));

  const met = bouwBericht({ ...ANTWOORDEN, use_case: 'Elk kwartaal rapportages samenstellen.' });
  assert.ok(met.html.includes('Je toelichting'));
  assert.ok(met.text.includes('Elk kwartaal rapportages samenstellen.'));
});

test('ontbrekende velden leveren geen lege of rare regels op', () => {
  const bericht = bouwBericht({ email: 'anoniem@voorbeeld.nl' });
  assert.ok(bericht.text.includes('Beste collega,'));
  assert.ok(!/undefined|null/.test(bericht.text));
  assert.ok(!/undefined|null/.test(bericht.html));
});

test('de datum staat er in het Nederlands in', () => {
  const bericht = bouwBericht(ANTWOORDEN, new Date('2026-09-18T10:00:00Z'));
  assert.ok(bericht.text.includes('18 september 2026'), bericht.text);
});

test('zonder e-mailadres wordt er niets verstuurd', async () => {
  assert.strictEqual(await verstuurBevestiging({ naam: 'Zonder Adres' }), false);
});

test('het onderdeel is ingeschakeld zodra er een mailserver is ingesteld', () => {
  assert.strictEqual(ingeschakeld(), true);
});
