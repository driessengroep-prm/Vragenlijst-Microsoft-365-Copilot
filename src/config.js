'use strict';

require('dotenv').config();

const path = require('path');

function bool(waarde, standaard = false) {
  if (waarde === undefined || waarde === '') return standaard;
  return ['1', 'true', 'ja', 'yes', 'on'].includes(String(waarde).toLowerCase());
}

const dbClient = (process.env.DB_CLIENT || 'sqlite').toLowerCase();

/** Vertaal onze korte clientnamen naar de dialectnamen van Knex. */
const KNEX_CLIENTS = {
  postgres: 'pg',
  postgresql: 'pg',
  pg: 'pg',
  mysql: 'mysql2',
  mariadb: 'mysql2',
  mysql2: 'mysql2',
  mssql: 'mssql',
  sqlserver: 'mssql',
  sqlite: 'better-sqlite3',
  sqlite3: 'better-sqlite3',
};

function knexConfiguratie() {
  const client = KNEX_CLIENTS[dbClient];
  if (!client) {
    throw new Error(
      `Onbekende DB_CLIENT '${dbClient}'. Kies uit: postgres, mysql, mariadb, mssql of sqlite.`
    );
  }

  if (client === 'better-sqlite3') {
    const bestand = process.env.DB_FILE || path.join(__dirname, '..', 'data', 'vragenlijst.sqlite');
    return {
      client,
      connection: { filename: bestand },
      useNullAsDefault: true,
    };
  }

  // Een volledige connectiestring heeft voorrang; handig voor Postgres.
  if (process.env.DB_URL) {
    return { client, connection: process.env.DB_URL, pool: { min: 0, max: 10 } };
  }

  const connection = {
    host: process.env.DB_HOST || '127.0.0.1',
    port: process.env.DB_PORT ? Number(process.env.DB_PORT) : undefined,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  };

  if (bool(process.env.DB_SSL)) {
    connection.ssl = { rejectUnauthorized: bool(process.env.DB_SSL_STRICT, true) };
  }

  if (client === 'mssql') {
    connection.options = {
      encrypt: bool(process.env.DB_SSL, false),
      trustServerCertificate: !bool(process.env.DB_SSL_STRICT, true),
    };
  }

  return { client, connection, pool: { min: 0, max: 10 } };
}

module.exports = {
  poort: Number(process.env.PORT || 3000),
  host: process.env.HOST || '0.0.0.0',
  omgeving: process.env.NODE_ENV || 'development',
  achterProxy: bool(process.env.TRUST_PROXY, false),

  db: {
    client: dbClient,
    tabel: process.env.DB_TABLE || 'copilot_aanvragen',
    schema: process.env.DB_SCHEMA || null,
    knex: knexConfiguratie,
  },

  beheer: {
    gebruiker: process.env.ADMIN_USER || 'beheerder',
    wachtwoord: process.env.ADMIN_PASSWORD || '',
  },

  formulier: {
    // Maximaal aantal inzendingen per IP-adres per kwartier.
    maxInzendingenPerKwartier: Number(process.env.RATE_LIMIT || 5),
    // Bewaar een gehasht IP-adres in plaats van het adres zelf.
    bewaarIpHash: bool(process.env.BEWAAR_IP_HASH, true),
    ipHashSalt: process.env.IP_HASH_SALT || 'driessen-copilot',
  },
};
