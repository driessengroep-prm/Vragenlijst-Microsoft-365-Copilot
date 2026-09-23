'use strict';

/**
 * Bevestigingsmail aan de invuller van de vragenlijst.
 *
 * De mail bevestigt alleen de ontvangst. Hij bevat bewust géén score en géén
 * adviescategorie: dat is informatie voor de beheerder, niet voor de invuller.
 *
 * Zonder MAIL_HOST in .env is dit onderdeel uitgeschakeld en werkt de
 * vragenlijst gewoon door.
 */

const nodemailer = require('nodemailer');

const config = require('./config');

let transporter = null;

function ingeschakeld() {
  return config.mail.ingeschakeld;
}

function verbinding() {
  if (!transporter) {
    const opties = {
      host: config.mail.host,
      port: config.mail.poort,
      secure: config.mail.beveiligd,
    };
    if (config.mail.gebruiker) {
      opties.auth = { user: config.mail.gebruiker, pass: config.mail.wachtwoord };
    }
    if (config.mail.negeerCertificaat) {
      opties.tls = { rejectUnauthorized: false };
    }
    transporter = nodemailer.createTransport(opties);
  }
  return transporter;
}

/** Maak tekst veilig om in HTML te zetten. De invoer komt van de bezoeker. */
function escape(waarde) {
  return String(waarde === null || waarde === undefined ? '' : waarde)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function datumInTekst(datum) {
  return new Intl.DateTimeFormat('nl-NL', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(datum);
}

/** De regels die we in de bevestiging herhalen, zodat de invuller ze terugziet. */
function overzichtsregels(antwoorden, verzondenOp) {
  const regels = [{ naam: 'Ingezonden op', waarde: datumInTekst(verzondenOp) }];
  if (antwoorden.naam) regels.unshift({ naam: 'Naam', waarde: antwoorden.naam });
  if (antwoorden.functie) regels.push({ naam: 'Functie', waarde: antwoorden.functie });
  if (antwoorden.afdeling) regels.push({ naam: 'Afdeling', waarde: antwoorden.afdeling });
  return regels;
}

function platteTekst(antwoorden, verzondenOp) {
  const regels = overzichtsregels(antwoorden, verzondenOp);
  const aanhef = antwoorden.naam ? `Beste ${antwoorden.naam},` : 'Beste collega,';

  const stukken = [
    aanhef,
    '',
    'We hebben je ingevulde vragenlijst voor Microsoft 365 Copilot ontvangen. Bedankt voor het invullen.',
    '',
    'Je aanvraag in het kort:',
    ...regels.map((r) => `- ${r.naam}: ${r.waarde}`),
  ];

  if (antwoorden.use_case) {
    stukken.push('', 'Je toelichting:', antwoorden.use_case);
  }

  stukken.push(
    '',
    'Wat gebeurt er nu?',
    'We beoordelen je aanvraag en laten je weten of we een Microsoft 365 Copilot-licentie voor je',
    'afsluiten, of dat we je eerst een e-learning aanbieden zodat je er straks meer uit haalt.',
    '',
    'Klopt er iets niet, of heb je een vraag? Beantwoord deze e-mail.',
    '',
    'Met vriendelijke groet,',
    'Driessen Groep',
    '',
    '--',
    'Dit is een automatisch verstuurde bevestiging.'
  );

  return stukken.join('\n');
}

function html(antwoorden, verzondenOp) {
  const regels = overzichtsregels(antwoorden, verzondenOp);
  const aanhef = antwoorden.naam ? `Beste ${escape(antwoorden.naam)},` : 'Beste collega,';

  // E-mailprogramma's ondersteunen geen stylesheets, dus alle opmaak staat
  // hier inline. De kleuren komen uit de huisstijl.
  const goud = '#d9a93c';
  const groen = '#1e4e4a';
  const tekst = '#333333';
  const zacht = '#6b6b6b';

  const regelHtml = regels
    .map(
      (r) => `
            <tr>
              <td style="padding:5px 16px 5px 0;color:${zacht};font-size:14px;white-space:nowrap;">${escape(r.naam)}</td>
              <td style="padding:5px 0;color:${tekst};font-size:14px;font-weight:600;">${escape(r.waarde)}</td>
            </tr>`
    )
    .join('');

  const toelichtingHtml = antwoorden.use_case
    ? `
          <p style="margin:24px 0 8px;color:${groen};font-size:15px;font-weight:600;">Je toelichting</p>
          <div style="border-left:4px solid ${goud};background:#fbfaf7;padding:12px 16px;color:${tekst};font-size:14px;line-height:1.6;white-space:pre-wrap;">${escape(
        antwoorden.use_case
      )}</div>`
    : '';

  return `<!DOCTYPE html>
<html lang="nl">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Bevestiging van je aanvraag</title>
  </head>
  <body style="margin:0;padding:0;background:#f6f6f4;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f6f6f4;padding:24px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:4px;overflow:hidden;font-family:'Segoe UI',Arial,sans-serif;">
            <tr>
              <td style="background:${goud};height:6px;line-height:6px;font-size:0;">&nbsp;</td>
            </tr>
            <tr>
              <td style="padding:32px 32px 8px;">
                <p style="margin:0 0 4px;color:${goud};font-size:13px;font-weight:600;letter-spacing:.04em;text-transform:uppercase;">Driessen Groep</p>
                <h1 style="margin:0 0 16px;color:${groen};font-size:24px;line-height:1.3;">Je aanvraag is ontvangen</h1>
                <p style="margin:0 0 16px;color:${tekst};font-size:15px;line-height:1.6;">${aanhef}</p>
                <p style="margin:0 0 20px;color:${tekst};font-size:15px;line-height:1.6;">
                  We hebben je ingevulde vragenlijst voor Microsoft&nbsp;365 Copilot ontvangen. Bedankt voor het invullen.
                </p>

                <p style="margin:0 0 6px;color:${groen};font-size:15px;font-weight:600;">Je aanvraag in het kort</p>
                <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 4px;">${regelHtml}
                </table>
                ${toelichtingHtml}

                <p style="margin:26px 0 6px;color:${groen};font-size:15px;font-weight:600;">Wat gebeurt er nu?</p>
                <p style="margin:0 0 20px;color:${tekst};font-size:15px;line-height:1.6;">
                  We beoordelen je aanvraag en laten je weten of we een Microsoft&nbsp;365 Copilot-licentie
                  voor je afsluiten, of dat we je eerst een e-learning aanbieden zodat je er straks meer uit
                  haalt.
                </p>
                <p style="margin:0 0 28px;color:${tekst};font-size:15px;line-height:1.6;">
                  Klopt er iets niet, of heb je een vraag? Beantwoord deze e-mail.
                </p>
                <p style="margin:0 0 4px;color:${tekst};font-size:15px;line-height:1.6;">Met vriendelijke groet,</p>
                <p style="margin:0 0 32px;color:${groen};font-size:15px;font-weight:600;">Driessen Groep</p>
              </td>
            </tr>
            <tr>
              <td style="border-top:1px solid #ececec;padding:16px 32px 24px;">
                <p style="margin:0;color:${zacht};font-size:12px;line-height:1.5;">
                  Dit is een automatisch verstuurde bevestiging.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

/** Stel de bevestigingsmail samen zonder hem te versturen (ook handig om te testen). */
function bouwBericht(antwoorden, verzondenOp = new Date()) {
  const bericht = {
    from: config.mail.afzender,
    to: antwoorden.email,
    subject: config.mail.onderwerp,
    text: platteTekst(antwoorden, verzondenOp),
    html: html(antwoorden, verzondenOp),
  };
  if (config.mail.antwoordAdres) bericht.replyTo = config.mail.antwoordAdres;
  return bericht;
}

/**
 * Controleer of de mailserver bereikbaar is en de inloggegevens kloppen,
 * zonder een mail te versturen. Gebruikt door `npm run mail:test`.
 */
async function controleerVerbinding() {
  if (!ingeschakeld()) throw new Error('Er is geen mailserver ingesteld (MAIL_HOST ontbreekt).');
  await verbinding().verify();
  return true;
}

/** Verstuur een willekeurig bericht. Alleen bedoeld voor de testopdracht. */
async function verstuur(bericht) {
  return verbinding().sendMail(bericht);
}

/**
 * Verstuur de bevestiging. Geeft `true` terug als de mail is aangeboden aan de
 * mailserver. Een mislukking is nooit reden om de inzending te laten mislukken:
 * de aanvraag is op dat moment al opgeslagen.
 */
async function verstuurBevestiging(antwoorden) {
  if (!ingeschakeld() || !antwoorden.email) return false;

  try {
    await verbinding().sendMail(bouwBericht(antwoorden));
    return true;
  } catch (fout) {
    console.error(
      `[${new Date().toISOString()}] Bevestigingsmail naar ${antwoorden.email} mislukt:`,
      fout.message
    );
    return false;
  }
}

module.exports = { ingeschakeld, bouwBericht, verstuurBevestiging, controleerVerbinding, verstuur };
