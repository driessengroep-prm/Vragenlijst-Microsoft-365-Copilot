'use strict';

/**
 * De besluiten die een beheerder kan vastleggen bij een inzending.
 * Gedeeld door de beheerders-API en de statische demoversie.
 *
 * Copilot-licenties worden voor minimaal een jaar afgesloten, dus er is geen
 * besluit voor een proefperiode: het is toekennen, eerst opleiden, of niet.
 */

const BESLUITEN = [
  { waarde: 'nieuw', label: 'Nog niet beoordeeld', kleur: 'grijs' },
  { waarde: 'licentie_toekennen', label: 'Jaarlicentie toekennen', kleur: 'groen' },
  { waarde: 'training_eerst', label: 'Eerst training, daarna opnieuw beoordelen', kleur: 'oranje' },
  { waarde: 'afgewezen', label: 'Afgewezen', kleur: 'rood' },
];

/**
 * Zoek een besluit op. Een waarde die niet (meer) in de lijst staat — denk aan
 * een besluit uit een eerdere versie van het model — geven we ongewijzigd
 * terug, zodat oude gegevens niet stilzwijgend een ander label krijgen.
 */
function besluit(waarde) {
  return (
    BESLUITEN.find((b) => b.waarde === waarde) || {
      waarde: waarde,
      label: waarde ? `${waarde} (vervallen)` : 'Onbekend',
      kleur: 'grijs',
      vervallen: true,
    }
  );
}

module.exports = { BESLUITEN, besluit };
