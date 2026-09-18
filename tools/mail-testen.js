'use strict';

/**
 * Stuur een testmail, zodat je weet of de instellingen kloppen zonder eerst
 * de hele vragenlijst in te vullen.
 *
 * Draaien met: npm run mail:test -- jouw.adres@driessen.nl
 */

const config = require('../src/config');
const mail = require('../src/mail');

/** Vertaal de bekendste foutmeldingen naar iets waar je wat mee kunt. */
function uitleg(fout) {
  const code = fout.code || '';
  const melding = fout.message || '';

  if (code === 'ECONNREFUSED') {
    return [
      'De mailserver weigert de verbinding.',
      'Controleer MAIL_HOST en MAIL_PORT, en of deze server naar buiten mag op die poort.',
    ];
  }
  if (code === 'ETIMEDOUT' || code === 'ESOCKET') {
    return [
      'Geen verbinding gekregen met de mailserver.',
      'Meestal een firewall of een verkeerde poort. Poort 587 is gebruikelijk, 465 voor SMTPS.',
    ];
  }
  if (code === 'EAUTH' || /auth/i.test(melding)) {
    return [
      'De mailserver accepteert de inloggegevens niet.',
      'Bij Microsoft 365: staat SMTP AUTH aan voor deze postbus? Met MFA heb je een app-wachtwoord nodig.',
    ];
  }
  if (/certificate/i.test(melding)) {
    return [
      'Het TLS-certificaat van de mailserver wordt niet vertrouwd.',
      'Gaat het om een interne server met een eigen certificaat, zet dan MAIL_TLS_ONVEILIG=true in .env.',
    ];
  }
  if (/self.signed/i.test(melding)) {
    return ['De mailserver gebruikt een zelfondertekend certificaat.', 'Zet MAIL_TLS_ONVEILIG=true in .env.'];
  }
  return ['Onverwachte fout van de mailserver.', melding];
}

async function hoofd() {
  const ontvanger = process.argv[2];

  if (!config.mail.ingeschakeld) {
    console.error('\nEr is nog geen mailserver ingesteld (MAIL_HOST ontbreekt in .env).');
    console.error('Draai eerst: npm run mail:instellen\n');
    process.exit(1);
  }

  if (!ontvanger || !ontvanger.includes('@')) {
    console.error('\nGeef een e-mailadres op om de test naartoe te sturen:\n');
    console.error('    npm run mail:test -- jouw.adres@driessen.nl\n');
    process.exit(1);
  }

  console.log('\nInstellingen uit .env:');
  console.log(`  server     ${config.mail.host}:${config.mail.poort}${config.mail.beveiligd ? ' (SMTPS)' : ' (STARTTLS)'}`);
  console.log(`  gebruiker  ${config.mail.gebruiker || '(geen, dus zonder inloggegevens)'}`);
  console.log(`  afzender   ${config.mail.afzender}`);
  if (config.mail.antwoordAdres) console.log(`  antwoorden ${config.mail.antwoordAdres}`);
  if (config.mail.negeerCertificaat) console.log('  let op     TLS-certificaten worden niet gecontroleerd');

  process.stdout.write('\nVerbinding maken... ');
  try {
    await mail.controleerVerbinding();
    console.log('gelukt.');
  } catch (fout) {
    console.log('mislukt.\n');
    uitleg(fout).forEach((regel) => console.error(`  ${regel}`));
    console.error('');
    process.exit(1);
  }

  process.stdout.write(`Testmail versturen naar ${ontvanger}... `);
  const bericht = mail.bouwBericht({
    naam: 'Testbericht',
    email: ontvanger,
    functie: 'Dit is een test',
    afdeling: 'Vragenlijst Microsoft 365 Copilot',
    use_case:
      'Dit is een testmail om te controleren of de bevestiging goed aankomt. Er is geen aanvraag ' +
      'ingediend en er staat niets in de database.',
  });
  bericht.subject = `[TEST] ${bericht.subject}`;

  try {
    await mail.verstuur(bericht);
    console.log('gelukt.\n');
    console.log('Kijk of de mail aankomt, ook in de map met ongewenste e-mail.');
    console.log('Komt hij niet aan terwijl het versturen lukte, dan zit het bij de ontvangende kant:');
    console.log('controleer SPF en DKIM voor het domein in MAIL_FROM.\n');
  } catch (fout) {
    console.log('mislukt.\n');
    uitleg(fout).forEach((regel) => console.error(`  ${regel}`));
    console.error('');
    process.exit(1);
  }
}

hoofd()
  .then(() => process.exit(0))
  .catch((fout) => {
    console.error('\nOnverwachte fout:', fout.message, '\n');
    process.exit(1);
  });
