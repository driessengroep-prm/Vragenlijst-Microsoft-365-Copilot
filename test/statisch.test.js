'use strict';

/**
 * De statische demoversie in docs/ wordt gegenereerd uit dezelfde bronnen als
 * de echte applicatie. Deze tests bewaken dat docs/ niet achterloopt: dan zou
 * de demo op GitHub Pages andere scores tonen dan de echte applicatie.
 *
 * Falen deze tests? Draai `npm run build:static` en commit het resultaat.
 */

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const WORTEL = path.join(__dirname, '..');
const DOCS = path.join(WORTEL, 'docs');

const HERBOUW = 'docs/ loopt achter. Draai `npm run build:static` en commit het resultaat.';

/** Modules die in de browserbundel terecht moeten komen. */
const MODULES = ['vragenlijst', 'scoring', 'validatie', 'besluiten', 'beheerweergave'];

/** Bestanden die één op één worden gekopieerd. */
const GEKOPIEERD = [
  ['public/assets/css/driessen.css', 'assets/css/driessen.css'],
  ['public/assets/css/beheer.css', 'assets/css/beheer.css'],
  ['public/assets/js/formulier.js', 'assets/js/formulier.js'],
  ['public/assets/js/beheer.js', 'assets/js/beheer.js'],
  ['tools/statisch/demo-api.js', 'assets/js/demo-api.js'],
];

test('de statische versie is gebouwd', () => {
  assert.ok(fs.existsSync(path.join(DOCS, 'index.html')), 'docs/index.html ontbreekt. ' + HERBOUW);
  assert.ok(fs.existsSync(path.join(DOCS, 'beheer.html')), 'docs/beheer.html ontbreekt. ' + HERBOUW);
  assert.ok(fs.existsSync(path.join(DOCS, '.nojekyll')), 'docs/.nojekyll ontbreekt. ' + HERBOUW);
});

test('de browserbundel bevat de actuele modules uit src/', () => {
  const bundel = fs.readFileSync(path.join(DOCS, 'assets', 'js', 'model.js'), 'utf8');
  for (const naam of MODULES) {
    const bron = fs.readFileSync(path.join(WORTEL, 'src', `${naam}.js`), 'utf8');
    assert.ok(bundel.includes(bron), `src/${naam}.js wijkt af van de bundel. ${HERBOUW}`);
  }
});

test('de gekopieerde bestanden zijn gelijk aan hun bron', () => {
  for (const [bron, doel] of GEKOPIEERD) {
    const bronInhoud = fs.readFileSync(path.join(WORTEL, bron), 'utf8');
    const doelInhoud = fs.readFileSync(path.join(DOCS, doel), 'utf8');
    assert.strictEqual(doelInhoud, bronInhoud, `${doel} wijkt af van ${bron}. ${HERBOUW}`);
  }
});

test('het logo en de favicons zijn meegekopieerd naar de statische versie', () => {
  const afbeeldingen = [
    'DriessenGroep.png',
    'favicon-16.png',
    'favicon-32.png',
    'favicon.png',
    'apple-touch-icon.png',
  ];
  for (const naam of afbeeldingen) {
    const bron = fs.readFileSync(path.join(WORTEL, 'public/assets/img', naam));
    const doel = fs.readFileSync(path.join(DOCS, 'assets/img', naam));
    assert.ok(bron.equals(doel), `${naam} in docs/ wijkt af van de bron. ${HERBOUW}`);
  }
});

test('de favicons zijn uit het logo gemaakt en niet leeg', () => {
  for (const naam of ['favicon-16.png', 'favicon-32.png', 'favicon.png', 'apple-touch-icon.png']) {
    const bestand = fs.readFileSync(path.join(WORTEL, 'public/assets/img', naam));
    assert.ok(bestand.length > 200, `${naam} is verdacht klein`);
    // PNG-handtekening
    assert.ok(bestand.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])), `${naam} is geen PNG`);
  }
});

test('beide pagina\u2019s tonen het logo', () => {
  for (const bestand of ['index.html', 'beheer.html']) {
    const html = fs.readFileSync(path.join(DOCS, bestand), 'utf8');
    assert.ok(
      html.includes('src="assets/img/DriessenGroep.png"'),
      `${bestand} verwijst niet naar het logo. ${HERBOUW}`
    );
    assert.ok(!html.includes('logo.svg'), `${bestand} verwijst nog naar het oude plaatshouderlogo.`);
    assert.ok(!html.includes('favicon.svg'), `${bestand} verwijst nog naar de oude plaatshouder-favicon.`);
    assert.ok(html.includes('assets/img/favicon-32.png'), `${bestand} verwijst niet naar de favicon. ${HERBOUW}`);
  }
});

test('de pagina’s gebruiken relatieve paden, zodat ze onder een submap werken', () => {
  for (const bestand of ['index.html', 'beheer.html']) {
    const html = fs.readFileSync(path.join(DOCS, bestand), 'utf8');
    assert.ok(!/(href|src)="\/assets\//.test(html), `${bestand} bevat nog absolute paden naar assets/. ${HERBOUW}`);
    assert.ok(html.includes('src="assets/js/model.js"'), `${bestand} laadt het model niet. ${HERBOUW}`);
    assert.ok(html.includes('src="assets/js/demo-api.js"'), `${bestand} laadt de demolaag niet. ${HERBOUW}`);
  }
});

test('de demolaag wordt geladen vóór de paginacode', () => {
  for (const [bestand, paginaScript] of [
    ['index.html', 'assets/js/formulier.js'],
    ['beheer.html', 'assets/js/beheer.js'],
  ]) {
    const html = fs.readFileSync(path.join(DOCS, bestand), 'utf8');
    assert.ok(
      html.indexOf('assets/js/demo-api.js') < html.indexOf(paginaScript),
      `${bestand}: de demolaag moet vóór ${paginaScript} staan. ${HERBOUW}`
    );
    assert.ok(
      html.indexOf('assets/js/model.js') < html.indexOf('assets/js/demo-api.js'),
      `${bestand}: het model moet vóór de demolaag staan. ${HERBOUW}`
    );
  }
});

test('de pagina’s zijn als testomgeving gemarkeerd en verwijzen naar elkaar', () => {
  const vragenlijst = fs.readFileSync(path.join(DOCS, 'index.html'), 'utf8');
  const beheer = fs.readFileSync(path.join(DOCS, 'beheer.html'), 'utf8');

  for (const html of [vragenlijst, beheer]) {
    assert.ok(html.includes('dg-demobalk'), 'de balk met de waarschuwing ontbreekt. ' + HERBOUW);
    assert.ok(html.includes('(testomgeving)'), 'de paginatitel vermeldt de testomgeving niet. ' + HERBOUW);
    assert.ok(html.includes('name="robots" content="noindex"'), 'de pagina zou niet geïndexeerd moeten worden.');
  }

  assert.ok(vragenlijst.includes('href="beheer.html"'), 'de vragenlijst linkt niet naar de beheerderspagina.');
  assert.ok(beheer.includes('href="index.html"'), 'de beheerderspagina linkt niet naar de vragenlijst.');
});
