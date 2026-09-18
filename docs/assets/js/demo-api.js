/* ==========================================================================
   Demolaag voor de statische versie (GitHub Pages).
   --------------------------------------------------------------------------
   Op GitHub Pages draait geen server en is er geen database. Deze laag vangt
   alle aanroepen naar /api/... op en beantwoordt ze in de browser zelf, met
   exact dezelfde vragenlijst, validatie en beoordelingsmodel als de echte
   applicatie (zie assets/js/model.js, gegenereerd uit src/).

   Inzendingen worden bewaard in de localStorage van de bezoeker. Ze gaan
   nergens heen, en iedere bezoeker ziet alleen zijn eigen invoer.
   ========================================================================== */

(function () {
  'use strict';

  var model = window.DGModel;
  if (!model) return;

  var vragenlijst = model.vragenlijst;
  var scoring = model.scoring;
  var validatie = model.validatie;
  var weergave = model.beheerweergave;
  var besluiten = model.besluiten;

  // Het volgnummer in de sleutel loopt op zodra het beoordelingsmodel wijzigt,
  // zodat terugkerende bezoekers verse voorbeelddata krijgen in plaats van
  // voorbeelden die bij een ouder model horen.
  var OPSLAGSLEUTEL = 'dg-copilot-demo-inzendingen-v2';

  // ------------------------------------------------------------- opslag ---

  function laad() {
    try {
      var ruw = window.localStorage.getItem(OPSLAGSLEUTEL);
      return ruw ? JSON.parse(ruw) : null;
    } catch (fout) {
      return null;
    }
  }

  function bewaar(rijen) {
    try {
      window.localStorage.setItem(OPSLAGSLEUTEL, JSON.stringify(rijen));
    } catch (fout) {
      /* Privémodus of volle opslag: de demo werkt dan alleen deze sessie. */
    }
  }

  var rijenInGeheugen = null;

  function rijen() {
    if (rijenInGeheugen === null) {
      rijenInGeheugen = laad();
      if (rijenInGeheugen === null) {
        rijenInGeheugen = voorbeeldInzendingen();
        bewaar(rijenInGeheugen);
      }
    }
    return rijenInGeheugen;
  }

  function opslaan() {
    bewaar(rijenInGeheugen);
  }

  function volgendId() {
    return rijen().reduce(function (hoogste, rij) {
      return Math.max(hoogste, rij.id || 0);
    }, 0) + 1;
  }

  // ------------------------------------------------------- voorbeelddata --

  var V1 = ['v1_email', 'v1_overleggen', 'v1_documenten', 'v1_presentaties', 'v1_zoeken'];
  var V4 = [
    'v4_oude_mails',
    'v4_documenten_kwijt',
    'v4_vergadering_voorbereiden',
    'v4_context_missen',
    'v4_informatie_combineren',
    'v4_samenvatten',
  ];

  var VOORBEELDEN = [
    {
      naam: 'Sanne de Vries',
      email: 'sanne.devries@voorbeeld.nl',
      functie: 'Adviseur HR',
      afdeling: 'HR Services',
      v1: 'meer_dan_10_uur',
      v4: 'zeer_vaak',
      v2: 'dagelijks',
      v3_m365: 'vrijwel_alles',
      v5: ['samenvatten_email', 'samenvatten_teams', 'opstellen_documenten', 'zoeken_m365', 'voorbereiden_overleg'],
      v6: 'meer_dan_4_uur',
      v8: 'regelmatig',
      v9: 'gevorderd',
      v10: 'ja_en_delen',
      dagenGeleden: 9,
    },
    {
      naam: 'Mark Jansen',
      email: 'mark.jansen@voorbeeld.nl',
      functie: 'Projectleider',
      afdeling: 'Implementatie',
      v1: '5_tot_10_uur',
      v4: 'regelmatig',
      v2: 'regelmatig',
      v3_m365: 'grootste_deel',
      v5: ['opstellen_documenten', 'analyse_excel', 'zoeken_m365', 'samenvatten_teams'],
      v6: '2_tot_4_uur',
      use_case:
        'Ik stel elke maand voortgangsrapportages op voor vier lopende implementaties. Daarvoor ' +
        'verzamel ik gegevens uit Excel-overzichten en uit mailwisselingen met de klant. Dat kost ' +
        'mij ongeveer een dagdeel per maand aan verzamelen en samenvatten. Ik wil hier zeker tijd ' +
        'in steken; ik gebruik Copilot Chat nu al af en toe.',
      v8: 'af_en_toe',
      v9: 'basis',
      v10: 'ja',
      dagenGeleden: 6,
      besluit: 'licentie_toekennen',
      besluit_toelichting:
        'Use case is concreet en terugkerend, en de bereidheid om te investeren is er. Jaarlicentie toegekend.',
      beoordeeld_door: 'demo',
    },
    {
      naam: 'Ilse Bakker',
      email: 'ilse.bakker@voorbeeld.nl',
      functie: 'Medewerker servicedesk',
      afdeling: 'Support',
      v1: '2_tot_5_uur',
      v4: 'soms',
      v2: 'soms',
      v3_m365: 'ongeveer_helft',
      v5: ['samenvatten_email'],
      v6: '30_tot_60_min',
      v8: 'nee',
      v9: 'beginner',
      v10: 'beperkt',
      dagenGeleden: 4,
    },
    {
      naam: 'Peter Smit',
      email: 'peter.smit@voorbeeld.nl',
      functie: 'Magazijnmedewerker',
      afdeling: 'Logistiek',
      v1: 'minder_dan_2_uur',
      v4: 'nooit',
      v2: 'nooit',
      v3_m365: 'minder_dan_kwart',
      v5: [],
      v6: 'minder_dan_30_min',
      v8: 'nee',
      v9: 'beginner',
      v10: 'nee',
      dagenGeleden: 2,
    },
  ];

  function voorbeeldInzendingen() {
    return VOORBEELDEN.map(function (voorbeeld, index) {
      var antwoorden = {
        naam: voorbeeld.naam,
        email: voorbeeld.email,
        functie: voorbeeld.functie,
        afdeling: voorbeeld.afdeling,
        v2: voorbeeld.v2,
        v3_m365: voorbeeld.v3_m365,
        v5: voorbeeld.v5,
        v5_anders: '',
        v6: voorbeeld.v6,
        use_case: voorbeeld.use_case || '',
        v8: voorbeeld.v8,
        v9: voorbeeld.v9,
        v10: voorbeeld.v10,
      };
      V1.forEach(function (id) {
        antwoorden[id] = voorbeeld.v1;
      });
      V4.forEach(function (id) {
        antwoorden[id] = voorbeeld.v4;
      });

      var datum = new Date();
      datum.setDate(datum.getDate() - voorbeeld.dagenGeleden);

      var rij = weergave.nieuweRij(antwoorden, {
        ingezonden_op: datum.toISOString(),
        bron: 'voorbeeld',
        akkoord_privacy: true,
        akkoord_contact: index % 2 === 0,
      });
      rij.id = index + 1;

      // Eén voorbeeld is al beoordeeld, zodat je meteen ziet hoe dat eruitziet.
      if (voorbeeld.besluit) {
        var bijwerking = weergave.beoordelingsUpdate(
          rij,
          {
            besluit: voorbeeld.besluit,
            besluit_toelichting: voorbeeld.besluit_toelichting,
          },
          voorbeeld.beoordeeld_door
        );
        Object.assign(rij, bijwerking.waarden);
        rij.beoordeeld_op = datum.toISOString();
      }

      return rij;
    });
  }

  /** Voorbeelddata terugzetten en eigen testinzendingen wissen. */
  function herstelVoorbeelddata() {
    rijenInGeheugen = voorbeeldInzendingen();
    opslaan();
  }

  window.DGDemo = { herstelVoorbeelddata: herstelVoorbeelddata, opslagsleutel: OPSLAGSLEUTEL };

  // -------------------------------------------------------- antwoorden ----

  /** Zelfde opschoning als de echte server: geen puntenwaarden naar de browser. */
  function zonderPunten(vraag) {
    var kopie = {};
    Object.keys(vraag).forEach(function (sleutel) {
      if (sleutel !== 'onderdeel') kopie[sleutel] = vraag[sleutel];
    });
    if (Array.isArray(vraag.opties)) {
      kopie.opties = vraag.opties.map(function (optie) {
        var schoon = {};
        Object.keys(optie).forEach(function (sleutel) {
          if (sleutel !== 'punten') schoon[sleutel] = optie[sleutel];
        });
        return schoon;
      });
    }
    return kopie;
  }

  function json(inhoud, status) {
    return Promise.resolve(
      new Response(JSON.stringify(inhoud), {
        status: status || 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );
  }

  function zoekRij(id) {
    return rijen().find(function (rij) {
      return String(rij.id) === String(id);
    });
  }

  function overzicht(parameters) {
    var gefilterd = rijen().slice();

    var besluit = parameters.get('besluit');
    if (besluit) {
      gefilterd = gefilterd.filter(function (rij) {
        return (rij.besluit || 'nieuw') === besluit;
      });
    }

    var zoek = (parameters.get('zoek') || '').toLowerCase();
    if (zoek) {
      gefilterd = gefilterd.filter(function (rij) {
        return (
          String(rij.naam || '').toLowerCase().indexOf(zoek) >= 0 ||
          String(rij.email || '').toLowerCase().indexOf(zoek) >= 0 ||
          String(rij.afdeling || '').toLowerCase().indexOf(zoek) >= 0
        );
      });
    }

    var inzendingen = gefilterd.map(weergave.overzichtsRij);

    // Net als de echte server filteren we op de herberekende categorie.
    var categorie = parameters.get('categorie');
    if (categorie) {
      inzendingen = inzendingen.filter(function (i) {
        return i.categorie === categorie;
      });
    }

    inzendingen.sort(function (a, b) {
      return b.totaal - a.totaal || b.id - a.id;
    });

    return {
      inzendingen: inzendingen,
      samenvatting: weergave.samenvatting(inzendingen),
      totaalAantal: inzendingen.length,
    };
  }

  function csvBestand() {
    var gesorteerd = rijen().slice().sort(function (a, b) {
      return a.id - b.id;
    });
    return weergave.csv(gesorteerd);
  }

  function beantwoord(pad, parameters, opties) {
    var methode = ((opties && opties.method) || 'GET').toUpperCase();
    var lichaam = opties && opties.body ? JSON.parse(opties.body) : {};

    if (pad === '/api/vragenlijst') {
      // Net als de echte server sturen we de puntenwaarden en de
      // voorwaardelijke vervolgvragen niet mee.
      return json({ delen: vragenlijst.DELEN, vragen: vragenlijst.basisvragen().map(zonderPunten) });
    }

    if (pad === '/api/inzendingen' && methode === 'POST') {
      if (lichaam.website) return json({ ok: true }, 202);

      var resultaat = validatie.valideer(lichaam);
      if (!resultaat.geldig) {
        return json({ fout: 'Niet alle vragen zijn (juist) ingevuld.', velden: resultaat.fouten }, 422);
      }

      // De score bepaalt of er nog een onderbouwing nodig is.
      var beoordeling = scoring.beoordeel(resultaat.antwoorden);
      var openstaand = vragenlijst.vervolgvragenVoor(beoordeling.categorie).filter(function (vraag) {
        return !resultaat.antwoorden[vraag.id];
      });
      if (openstaand.length > 0) {
        return json({
          vervolgvragen: openstaand.map(zonderPunten),
          toelichting:
            'Op basis van je antwoorden kan Microsoft 365 Copilot je werk waarschijnlijk ondersteunen. ' +
            'Om je aanvraag goed te kunnen beoordelen, vragen we je nog \u00e9\u00e9n ding toe te lichten.',
        });
      }

      var rij = weergave.nieuweRij(resultaat.antwoorden, {
        ingezonden_op: new Date().toISOString(),
        bron: 'demo',
        akkoord_privacy: resultaat.akkoordPrivacy,
        akkoord_contact: resultaat.akkoordContact,
      });
      rij.id = volgendId();
      rijen().push(rij);
      opslaan();
      return json({ ok: true }, 201);
    }

    if (pad === '/api/beheer/model') {
      return json({
        gewichten: scoring.GEWICHTEN,
        onderdeelLabels: scoring.ONDERDEEL_LABELS,
        categorieen: scoring.CATEGORIEEN,
        besluiten: besluiten.BESLUITEN,
        beheerder: 'demo',
      });
    }

    if (pad === '/api/beheer/inzendingen') {
      return json(overzicht(parameters));
    }

    if (pad === '/api/beheer/export.csv') {
      return Promise.resolve(new Response(csvBestand(), { headers: { 'Content-Type': 'text/csv' } }));
    }

    var detailOvereenkomst = pad.match(/^\/api\/beheer\/inzendingen\/([^/]+)$/);
    if (detailOvereenkomst) {
      var gevonden = zoekRij(detailOvereenkomst[1]);
      if (!gevonden) return json({ fout: 'Inzending niet gevonden.' }, 404);
      return json(
        Object.assign(weergave.detail(gevonden), {
          beoordelingsmodel: { gewichten: scoring.GEWICHTEN, onderdeelLabels: scoring.ONDERDEEL_LABELS },
        })
      );
    }

    var beoordelingOvereenkomst = pad.match(/^\/api\/beheer\/inzendingen\/([^/]+)\/beoordeling$/);
    if (beoordelingOvereenkomst && methode === 'PUT') {
      var teBeoordelen = zoekRij(beoordelingOvereenkomst[1]);
      if (!teBeoordelen) return json({ fout: 'Inzending niet gevonden.' }, 404);

      var bijwerking = weergave.beoordelingsUpdate(teBeoordelen, lichaam, 'demo');
      if (bijwerking.fout) return json({ fout: bijwerking.fout }, 422);

      Object.assign(teBeoordelen, bijwerking.waarden);
      if (teBeoordelen.beoordeeld_op instanceof Date) {
        teBeoordelen.beoordeeld_op = teBeoordelen.beoordeeld_op.toISOString();
      }
      opslaan();
      return json({ ok: true, beoordeling: bijwerking.beoordeling });
    }

    return json({ fout: 'Deze aanroep bestaat niet in de demoversie.' }, 404);
  }

  // ------------------------------------------------ fetch onderscheppen ---

  var origineleFetch = window.fetch ? window.fetch.bind(window) : null;

  window.fetch = function (bron, opties) {
    var adres = typeof bron === 'string' ? bron : bron && bron.url;
    if (adres) {
      var volledig = new URL(adres, window.location.href);
      if (volledig.pathname.indexOf('/api/') === 0 || volledig.pathname.indexOf('api/') === 0) {
        var pad = volledig.pathname.replace(/^.*?(\/api\/)/, '/api/');
        return beantwoord(pad, volledig.searchParams, opties);
      }
    }
    return origineleFetch ? origineleFetch(bron, opties) : Promise.reject(new Error('fetch niet beschikbaar'));
  };

  // ------------------------------------------------ CSV-link en banner ----

  function bestandDownloaden() {
    var blob = new Blob([csvBestand()], { type: 'text/csv;charset=utf-8' });
    var adres = URL.createObjectURL(blob);
    var link = document.createElement('a');
    link.href = adres;
    link.download = 'copilot-aanvragen-demo-' + new Date().toISOString().slice(0, 10) + '.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(function () {
      URL.revokeObjectURL(adres);
    }, 1000);
  }

  document.addEventListener('click', function (gebeurtenis) {
    var link = gebeurtenis.target.closest ? gebeurtenis.target.closest('a[href*="export.csv"]') : null;
    if (link) {
      gebeurtenis.preventDefault();
      bestandDownloaden();
      return;
    }

    var herstelKnop = gebeurtenis.target.closest ? gebeurtenis.target.closest('[data-demo-herstel]') : null;
    if (herstelKnop) {
      gebeurtenis.preventDefault();
      if (window.confirm('Voorbeelddata terugzetten? Inzendingen die je zelf hebt ingevuld worden gewist.')) {
        herstelVoorbeelddata();
        window.location.reload();
      }
    }
  });
})();
