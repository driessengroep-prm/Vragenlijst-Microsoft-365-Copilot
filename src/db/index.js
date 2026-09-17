'use strict';

const knexFabriek = require('knex');
const config = require('../config');

let instantie = null;

/** Geeft de (gedeelde) databaseverbinding terug. */
function db() {
  if (!instantie) {
    instantie = knexFabriek(config.db.knex());
  }
  return instantie;
}

/** Querybuilder voor de inzendingentabel, inclusief eventueel schema. */
function tabel() {
  const query = db()(config.db.tabel);
  return config.db.schema ? query.withSchema(config.db.schema) : query;
}

async function sluit() {
  if (instantie) {
    await instantie.destroy();
    instantie = null;
  }
}

module.exports = { db, tabel, sluit };
