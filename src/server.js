'use strict';

const path = require('path');
const express = require('express');

const config = require('./config');
const { db, sluit } = require('./db');
const { beheerderAlleen } = require('./middleware/auth');
const formulierRoutes = require('./routes/formulier');
const beheerRoutes = require('./routes/beheer');

const app = express();

if (config.achterProxy) app.set('trust proxy', 1);
app.disable('x-powered-by');

app.use(express.json({ limit: '128kb' }));
app.use(express.urlencoded({ extended: false, limit: '128kb' }));

// Basisbeveiliging: geen inline scripts van buitenaf, geen sniffing.
app.use((req, res, next) => {
  res.set('X-Content-Type-Options', 'nosniff');
  res.set('X-Frame-Options', 'SAMEORIGIN');
  res.set('Referrer-Policy', 'same-origin');
  next();
});

// De beheerdersinterface zit achter dezelfde login als de beheerder-API.
app.get('/beheer', beheerderAlleen, (req, res) => {
  // Bewust buiten public/: anders zou de pagina ook zonder inloggen
  // opvraagbaar zijn als /beheer.html.
  res.sendFile(path.join(__dirname, 'views', 'beheer.html'));
});

app.use('/api', formulierRoutes);
app.use('/api/beheer', beheerRoutes);

app.use(express.static(path.join(__dirname, '..', 'public'), { extensions: ['html'] }));

app.get('/gezondheid', async (req, res) => {
  try {
    await db().raw('select 1 as ok');
    res.json({ status: 'ok', database: config.db.client });
  } catch (fout) {
    res.status(503).json({ status: 'fout', melding: fout.message });
  }
});

// Foutafhandeling: log volledig, toon de bezoeker een nette melding.
app.use((fout, req, res, next) => {
  console.error(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`, fout);
  if (res.headersSent) return next(fout);
  res.status(500).json({ fout: 'Er ging iets mis op de server.' });
});

const server = app.listen(config.poort, config.host, () => {
  console.log(`Vragenlijst Microsoft 365 Copilot draait op http://${config.host}:${config.poort}`);
  console.log(`Database: ${config.db.client} (tabel: ${config.db.tabel})`);
  if (!config.beheer.wachtwoord) {
    console.warn('Let op: ADMIN_PASSWORD is niet ingesteld, de beheerdersomgeving is uitgeschakeld.');
  }
});

for (const signaal of ['SIGINT', 'SIGTERM']) {
  process.on(signaal, () => {
    server.close(async () => {
      await sluit().catch(() => {});
      process.exit(0);
    });
  });
}

module.exports = app;
