'use strict';

/**
 * Bouwt een statische demoversie in docs/, voor GitHub Pages.
 *
 * Draaien met `npm run build:static`.
 *
 * Op GitHub Pages draait geen Node en geen database. Deze build zet daarom:
 *  - dezelfde HTML, CSS en front-endcode als de echte applicatie;
 *  - de gedeelde modules uit src/ (vragenlijst, beoordelingsmodel, validatie)
 *    omgezet naar één browserbestand, zodat de scores in de demo exact gelijk
 *    zijn aan die van de echte applicatie;
 *  - een demolaag die de /api/-aanroepen in de browser afhandelt en de
 *    inzendingen in localStorage bewaart.
 *
 * Pas je een vraag of het beoordelingsmodel aan? Draai dit script opnieuw,
 * anders loopt de demo achter op de echte applicatie.
 */

const fs = require('fs');
const path = require('path');

const WORTEL = path.join(__dirname, '..');
const DOEL = path.join(WORTEL, 'docs');

/** Modules uit src/ die de browser nodig heeft. Volgorde is niet van belang. */
const MODULES = ['vragenlijst', 'scoring', 'validatie', 'besluiten', 'beheerweergave'];

// ---------------------------------------------------------------- helpers --

function leeg(map) {
  if (fs.existsSync(map)) fs.rmSync(map, { recursive: true, force: true });
  fs.mkdirSync(map, { recursive: true });
}

function kopieerMap(van, naar) {
  fs.mkdirSync(naar, { recursive: true });
  for (const item of fs.readdirSync(van, { withFileTypes: true })) {
    const bron = path.join(van, item.name);
    const doel = path.join(naar, item.name);
    if (item.isDirectory()) kopieerMap(bron, doel);
    else fs.copyFileSync(bron, doel);
  }
}

// ------------------------------------------------------- browserbundeling --

/**
 * Bundelt de CommonJS-modules uit src/ tot één bestand voor de browser.
 * De modules blijven onaangepast; ze krijgen alleen een kleine `require`-shim
 * om zich heen. Zo kan de demo nooit afwijken van de echte applicatie.
 */
function bouwModelBundel() {
  const delen = MODULES.map((naam) => {
    const inhoud = fs.readFileSync(path.join(WORTEL, 'src', `${naam}.js`), 'utf8');
    return `  definieer('${naam}', function (module, exports, require) {\n${inhoud}\n  });`;
  });

  return `/* ==========================================================================
   AUTOMATISCH GEGENEREERD - NIET HANDMATIG AANPASSEN
   Gegenereerd door tools/bouw-statisch.js uit:
${MODULES.map((m) => `     src/${m}.js`).join('\n')}
   Pas de bron aan en draai \`npm run build:static\` opnieuw.
   ========================================================================== */

(function (global) {
  'use strict';

  var fabrieken = {};
  var cache = {};

  function definieer(naam, fabriek) {
    fabrieken[naam] = fabriek;
  }

  function require(naam) {
    var sleutel = String(naam).replace(/^\\.\\//, '').replace(/\\.js$/, '');
    if (cache[sleutel]) return cache[sleutel].exports;
    if (!fabrieken[sleutel]) throw new Error('Onbekende module: ' + naam);
    var module = { exports: {} };
    cache[sleutel] = module;
    fabrieken[sleutel](module, module.exports, require);
    return module.exports;
  }

${delen.join('\n\n')}

  global.DGModel = {
${MODULES.map((m) => `    ${m}: require('${m}')`).join(',\n')}
  };
})(window);
`;
}

// ------------------------------------------------------- HTML omschrijven --

const BANNER_VRAGENLIJST = `
    <div class="dg-demobalk">
      <div class="dg-demobalk__binnen">
        <strong>Testomgeving</strong>
        <span>Dit is een voorbeeldversie zonder database. Wat je invult blijft in je eigen browser en wordt nergens verstuurd.</span>
        <a href="beheer.html">Naar de beheerderspagina &rarr;</a>
      </div>
    </div>`;

const BANNER_BEHEER = `
    <div class="dg-demobalk">
      <div class="dg-demobalk__binnen">
        <strong>Testomgeving</strong>
        <span>Voorbeeldgegevens zonder database en zonder inlog. Alles staat in je eigen browser; andere bezoekers zien jouw invoer niet.</span>
        <a href="index.html">Naar de vragenlijst &rarr;</a>
        <button type="button" data-demo-herstel>Voorbeelddata herstellen</button>
      </div>
    </div>`;

/**
 * Zet een pagina uit de echte applicatie om naar de statische demoversie:
 * absolute paden worden relatief (GitHub Pages serveert onder een submap),
 * en de demolaag wordt vóór de paginacode geladen.
 */
function schrijfPaginaOm(html, { banner, titelToevoeging }) {
  let uit = html;

  // Absolute paden werken niet onder /Vragenlijst-Microsoft-365-Copilot/.
  uit = uit.replace(/(href|src)="\/assets\//g, '$1="assets/');
  uit = uit.replace(/href="\/beheer"/g, 'href="beheer.html"');
  uit = uit.replace(/href="\/"/g, 'href="index.html"');

  // Herkenbaar maken dat dit de testomgeving is.
  uit = uit.replace(/<title>([^<]*)<\/title>/, `<title>$1${titelToevoeging}</title>`);

  // Eigen stijl voor de demobalk.
  uit = uit.replace('</head>', '    <link rel="stylesheet" href="assets/css/demo.css" />\n  </head>');

  // Balk bovenaan de pagina.
  uit = uit.replace(/(<body[^>]*>)/, `$1${banner}`);

  // De demolaag moet geladen zijn voordat de paginacode fetch aanroept.
  uit = uit.replace(
    /(\s*)<script src="assets\/js\/([a-z]+)\.js"><\/script>/,
    '$1<script src="assets/js/model.js"></script>' +
      '$1<script src="assets/js/demo-api.js"></script>' +
      '$1<script src="assets/js/$2.js"></script>'
  );

  return uit;
}

const DEMO_CSS = `/* Stijl voor de balk die aangeeft dat dit de testomgeving is. */

.dg-demobalk {
  background: var(--dg-groen);
  color: #ffffff;
  font-size: 13px;
  line-height: 1.5;
}

.dg-demobalk__binnen {
  max-width: var(--dg-kader);
  margin: 0 auto;
  padding: 10px 24px;
  display: flex;
  align-items: center;
  gap: 8px 16px;
  flex-wrap: wrap;
}

.dg-demobalk strong {
  background: var(--dg-goud);
  color: #ffffff;
  border-radius: var(--dg-radius-knop);
  padding: 2px 12px;
  font-size: 12px;
  letter-spacing: 0.02em;
  white-space: nowrap;
}

.dg-demobalk span {
  flex: 1 1 320px;
  color: rgba(255, 255, 255, 0.92);
}

.dg-demobalk a,
.dg-demobalk button {
  color: #ffffff;
  background: none;
  border: 1px solid rgba(255, 255, 255, 0.5);
  border-radius: var(--dg-radius-knop);
  padding: 4px 14px;
  font-family: inherit;
  font-size: 12.5px;
  font-weight: 600;
  text-decoration: none;
  white-space: nowrap;
  cursor: pointer;
}

.dg-demobalk a:hover,
.dg-demobalk button:hover {
  background: rgba(255, 255, 255, 0.15);
}
`;

// ------------------------------------------------------------------ bouw --

function bouw() {
  leeg(DOEL);

  // 1. Alle statische bestanden uit public/.
  kopieerMap(path.join(WORTEL, 'public', 'assets'), path.join(DOEL, 'assets'));

  // 2. De gedeelde modules uit src/, omgezet voor de browser.
  fs.writeFileSync(path.join(DOEL, 'assets', 'js', 'model.js'), bouwModelBundel());

  // 3. De demolaag die /api/-aanroepen in de browser afhandelt.
  fs.copyFileSync(
    path.join(WORTEL, 'tools', 'statisch', 'demo-api.js'),
    path.join(DOEL, 'assets', 'js', 'demo-api.js')
  );

  // 4. De stijl van de demobalk.
  fs.writeFileSync(path.join(DOEL, 'assets', 'css', 'demo.css'), DEMO_CSS);

  // 5. De twee pagina's.
  fs.writeFileSync(
    path.join(DOEL, 'index.html'),
    schrijfPaginaOm(fs.readFileSync(path.join(WORTEL, 'public', 'index.html'), 'utf8'), {
      banner: BANNER_VRAGENLIJST,
      titelToevoeging: ' (testomgeving)',
    })
  );

  fs.writeFileSync(
    path.join(DOEL, 'beheer.html'),
    schrijfPaginaOm(fs.readFileSync(path.join(WORTEL, 'src', 'views', 'beheer.html'), 'utf8'), {
      banner: BANNER_BEHEER,
      titelToevoeging: ' (testomgeving)',
    })
  );

  // 6. GitHub Pages moet de bestanden ongemoeid laten.
  fs.writeFileSync(path.join(DOEL, '.nojekyll'), '');

  const bestanden = [];
  (function tel(map) {
    for (const item of fs.readdirSync(map, { withFileTypes: true })) {
      const volledig = path.join(map, item.name);
      if (item.isDirectory()) tel(volledig);
      else bestanden.push(path.relative(DOEL, volledig));
    }
  })(DOEL);

  console.log(`Statische demoversie gebouwd in docs/ (${bestanden.length} bestanden):`);
  for (const bestand of bestanden.sort()) console.log(`  ${bestand}`);
}

bouw();
