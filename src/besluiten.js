'use strict';

/**
 * De besluiten die een beheerder kan vastleggen bij een inzending.
 * Gedeeld door de beheerders-API en de statische demoversie.
 */

const BESLUITEN = [
  { waarde: 'nieuw', label: 'Nog niet beoordeeld', kleur: 'grijs' },
  { waarde: 'licentie_toekennen', label: 'Licentie toekennen', kleur: 'groen' },
  { waarde: 'pilot', label: 'Opnemen in pilotgroep', kleur: 'blauw' },
  { waarde: 'nog_niet', label: 'Nog niet toekennen', kleur: 'oranje' },
  { waarde: 'afgewezen', label: 'Afgewezen', kleur: 'rood' },
];

function besluit(waarde) {
  return BESLUITEN.find((b) => b.waarde === waarde) || BESLUITEN[0];
}

module.exports = { BESLUITEN, besluit };
