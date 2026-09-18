'use strict';

/**
 * Vraag-en-antwoord-hulp om de bevestigingsmail in te stellen.
 *
 * Draaien met `npm run mail:instellen`.
 *
 * Het script stelt een paar vragen en schrijft de MAIL_-regels in `.env`.
 * De rest van dat bestand blijft ongemoeid. Het wachtwoord wordt bij het
 * typen afgeschermd en verschijnt nergens in beeld of in de samenvatting.
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const ENV_BESTAND = path.join(__dirname, '..', '.env');

const PRESETS = [
  {
    naam: 'Microsoft 365 / Exchange Online',
    host: 'smtp.office365.com',
    poort: 587,
    authNodig: true,
    notitie:
      'Let op: Microsoft zet SMTP AUTH standaard uit. Laat je beheerder dit aanzetten voor de\n' +
      '    postbus die je gebruikt, of gebruik een relay-connector. Een gewoon wachtwoord werkt\n' +
      '    meestal niet als er MFA op het account staat; vraag dan om een app-wachtwoord.',
  },
  {
    naam: 'Interne mailserver of SMTP-relay',
    host: '',
    poort: 25,
    authNodig: false,
    notitie:
      'Een interne relay vertrouwt meestal op het IP-adres van de server. Laat gebruikersnaam en\n' +
      '    wachtwoord dan leeg.',
  },
  {
    naam: 'Externe maildienst (SendGrid, Mailgun, Postmark, ...)',
    host: '',
    poort: 587,
    authNodig: true,
    notitie:
      'Vul bij gebruikersnaam in wat de dienst voorschrijft (vaak letterlijk "apikey") en bij\n' +
      '    wachtwoord de API-sleutel. Regel ook SPF en DKIM voor je domein.',
  },
  { naam: 'Ik vul alles zelf in', host: '', poort: 587, authNodig: null, notitie: null },
];

// `terminal` alleen aanzetten bij een echte terminal. Zo werkt het script ook
// als de antwoorden worden doorgegeven vanaf de invoer, bijvoorbeeld in een
// script of bij het plakken van meerdere regels tegelijk.
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: Boolean(process.stdin.isTTY),
});

// We lezen regel voor regel via de iterator. Met rl.question zouden regels die
// in één keer binnenkomen verloren gaan.
const regels = rl[Symbol.asyncIterator]();

let maskeer = false;
const origineelSchrijven = typeof rl._writeToOutput === 'function' ? rl._writeToOutput.bind(rl) : null;
if (origineelSchrijven) {
  rl._writeToOutput = (tekens) => {
    if (maskeer) return; // wachtwoord niet echoën
    origineelSchrijven(tekens);
  };
}

class Afgebroken extends Error {}

async function leesRegel() {
  const { value, done } = await regels.next();
  if (done) throw new Afgebroken('De invoer hield op voordat alle vragen beantwoord waren.');
  return String(value);
}

async function vraag(tekst, standaard = '') {
  const achtervoegsel = standaard ? ` [${standaard}]` : '';
  process.stdout.write(`${tekst}${achtervoegsel}: `);
  const antwoord = (await leesRegel()).trim();
  if (!process.stdin.isTTY) process.stdout.write(`${antwoord || standaard}\n`);
  return antwoord || standaard;
}

/** Zelfde als `vraag`, maar het ingetypte wachtwoord verschijnt niet in beeld. */
async function vraagVerborgen(tekst) {
  process.stdout.write(`${tekst}: `);
  maskeer = true;
  let antwoord;
  try {
    antwoord = (await leesRegel()).trim();
  } finally {
    maskeer = false;
  }
  process.stdout.write('\n');
  return antwoord;
}

async function jaNee(tekst, standaard = true) {
  const antwoord = await vraag(`${tekst} (j/n)`, standaard ? 'j' : 'n');
  return ['j', 'ja', 'y', 'yes'].includes(antwoord.toLowerCase());
}

/**
 * Zet de opgegeven sleutels in .env. Bestaande regels worden vervangen,
 * ook als ze uitgecommentarieerd staan; al het andere blijft staan.
 */
function bestaandeEnv() {
  return fs.existsSync(ENV_BESTAND) ? fs.readFileSync(ENV_BESTAND, 'utf8') : '';
}

function schrijfEnv(waarden) {
  let regels = fs.existsSync(ENV_BESTAND) ? fs.readFileSync(ENV_BESTAND, 'utf8').split('\n') : [];

  for (const [sleutel, waarde] of Object.entries(waarden)) {
    const patroon = new RegExp(`^\\s*#?\\s*${sleutel}\\s*=`);
    const index = regels.findIndex((regel) => patroon.test(regel));
    const nieuw = `${sleutel}=${waarde}`;
    if (index >= 0) regels[index] = nieuw;
    else regels.push(nieuw);
  }

  fs.writeFileSync(ENV_BESTAND, regels.join('\n').replace(/\n{3,}/g, '\n\n'));
}

async function hoofd() {
  console.log('\nBevestigingsmail instellen\n==========================\n');

  if (!fs.existsSync(ENV_BESTAND)) {
    console.log('Er is nog geen .env-bestand. Ik maak er een aan.\n');
  }

  PRESETS.forEach((preset, i) => console.log(`  ${i + 1}. ${preset.naam}`));
  const keuze = Number(await vraag('\nWelke gebruik je?', '1'));
  const preset = PRESETS[keuze - 1] || PRESETS[PRESETS.length - 1];
  if (preset.notitie) console.log(`\n    ${preset.notitie}\n`);

  const host = await vraag('Adres van de mailserver', preset.host);
  if (!host) {
    console.log('\nZonder serveradres kan ik niets instellen. Afgebroken.');
    rl.close();
    return;
  }

  const poort = await vraag('Poort', String(preset.poort));
  // Poort 465 is SMTPS (versleuteld vanaf het begin); 587 en 25 gebruiken STARTTLS.
  const beveiligd = poort === '465';

  const wilAuth =
    preset.authNodig === null ? await jaNee('Vereist de server inloggegevens?', true) : preset.authNodig;

  let gebruiker = '';
  let wachtwoord = '';
  if (wilAuth) {
    gebruiker = await vraag('Gebruikersnaam');
    if (gebruiker) wachtwoord = await vraagVerborgen('Wachtwoord of API-sleutel');
  }

  const afzender = await vraag('Afzender', 'Driessen Groep <noreply@driessen.nl>');
  const antwoordAdres = await vraag('Antwoorden gaan naar (leeg = de afzender)', '');

  console.log('\nZo ga ik het opslaan:\n');
  // Een eerder aangezette uitzondering op de certificaatcontrole blijft staan,
  // maar mag niet onopgemerkt blijven: dat verzwakt de verbinding.
  if (/^\s*MAIL_TLS_ONVEILIG\s*=\s*(1|true|ja|yes|on)\s*$/im.test(bestaandeEnv())) {
    console.log('  LET OP: MAIL_TLS_ONVEILIG staat aan in .env, dus TLS-certificaten worden niet');
    console.log('          gecontroleerd. Zet dat op false zodra je geen eigen certificaat meer gebruikt.\n');
  }
  console.log(`  MAIL_HOST      ${host}`);
  console.log(`  MAIL_PORT      ${poort}`);
  console.log(`  MAIL_SECURE    ${beveiligd}`);
  console.log(`  MAIL_USER      ${gebruiker || '(leeg)'}`);
  console.log(`  MAIL_PASSWORD  ${wachtwoord ? '(ingevuld, niet getoond)' : '(leeg)'}`);
  console.log(`  MAIL_FROM      ${afzender}`);
  console.log(`  MAIL_REPLY_TO  ${antwoordAdres || '(leeg)'}\n`);

  if (!(await jaNee('Opslaan in .env?', true))) {
    console.log('\nNiets gewijzigd.');
    rl.close();
    return;
  }

  schrijfEnv({
    MAIL_HOST: host,
    MAIL_PORT: poort,
    MAIL_SECURE: String(beveiligd),
    MAIL_USER: gebruiker,
    MAIL_PASSWORD: wachtwoord,
    MAIL_FROM: afzender,
    MAIL_REPLY_TO: antwoordAdres,
  });

  console.log('\nOpgeslagen in .env.\n');
  console.log('Controleer of het werkt met:\n');
  console.log('    npm run mail:test -- jouw.adres@driessen.nl\n');
  console.log('Herstart daarna de applicatie, zodat de nieuwe instellingen worden ingelezen.\n');
  rl.close();
}

hoofd()
  .then(() => rl.close())
  .catch((fout) => {
    rl.close();
    if (fout instanceof Afgebroken) {
      console.error(`\n${fout.message} Er is niets gewijzigd.\n`);
    } else {
      console.error('\nEr ging iets mis:', fout.message, '\n');
    }
    process.exit(1);
  });
