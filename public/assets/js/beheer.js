/* ==========================================================================
   Beheerdersomgeving: overzicht, score-onderbouwing en besluitvorming.
   ========================================================================== */

(function () {
  'use strict';

  var model = null;
  var huidigeInzendingId = null;
  // Melding die na het opnieuw opbouwen van het detailpaneel getoond moet
  // worden; anders zou de bevestiging meteen weer verdwijnen.
  var bevestiging = null;

  var tegelsEl = document.getElementById('tegels');
  var tabelEl = document.getElementById('tabelinhoud');
  var leegEl = document.getElementById('leegmelding');
  var aantalEl = document.getElementById('aantalmelding');
  var foutEl = document.getElementById('foutmelding');
  var detailEl = document.getElementById('detail');
  var overlayEl = document.getElementById('detailoverlay');
  var filterCategorie = document.getElementById('filter-categorie');
  var filterBesluit = document.getElementById('filter-besluit');
  var filterZoek = document.getElementById('filter-zoek');

  // ------------------------------------------------------------- helpers --

  function el(tag, klasse, tekst) {
    var node = document.createElement(tag);
    if (klasse) node.className = klasse;
    if (tekst !== undefined && tekst !== null) node.textContent = tekst;
    return node;
  }

  function toonFout(melding) {
    foutEl.textContent = melding;
    foutEl.hidden = false;
  }

  function haal(url, opties) {
    return fetch(url, opties).then(function (reactie) {
      if (reactie.status === 401) {
        throw new Error('Je sessie is verlopen. Ververs de pagina en log opnieuw in.');
      }
      return reactie.json().then(function (data) {
        if (!reactie.ok) throw new Error(data.fout || 'Er ging iets mis.');
        return data;
      });
    });
  }

  function datum(waarde) {
    if (!waarde) return '-';
    var d = new Date(waarde);
    if (isNaN(d.getTime())) return String(waarde);
    return d.toLocaleDateString('nl-NL', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  function besluitLabel(waarde) {
    var gevonden = (model.besluiten || []).find(function (b) {
      return b.waarde === waarde;
    });
    return gevonden ? gevonden.label : waarde;
  }

  function balkje(score, max, titel) {
    var wikkel = el('div', 'dg-balkje');
    wikkel.title = titel + ': ' + score + ' van ' + max + ' punten';
    var vulling = el('span');
    vulling.style.width = max > 0 ? Math.round((score / max) * 100) + '%' : '0';
    wikkel.appendChild(vulling);
    return wikkel;
  }

  // ------------------------------------------------------------- opbouw ---

  function vulFilters() {
    model.categorieen.forEach(function (c) {
      var optie = el('option', null, c.label + ' (' + c.vanaf + '-' + c.tot + ')');
      optie.value = c.sleutel;
      filterCategorie.appendChild(optie);
    });
    model.besluiten.forEach(function (b) {
      var optie = el('option', null, b.label);
      optie.value = b.waarde;
      filterBesluit.appendChild(optie);
    });

    var uitleg = document.getElementById('modeluitleg');
    var lijst = el('ul');
    Object.keys(model.gewichten).forEach(function (sleutel) {
      lijst.appendChild(
        el('li', null, model.onderdeelLabels[sleutel] + ': maximaal ' + model.gewichten[sleutel] + ' punten')
      );
    });
    uitleg.appendChild(el('p', null, 'De totaalscore van 100 punten is opgebouwd uit drie onderdelen:'));
    uitleg.appendChild(lijst);
    var categorieLijst = el('ul');
    model.categorieen.forEach(function (c) {
      categorieLijst.appendChild(el('li', null, c.vanaf + '-' + c.tot + ' punten: ' + c.label + ' — ' + c.advies));
    });
    uitleg.appendChild(el('p', null, 'De totaalscore bepaalt de adviescategorie:'));
    uitleg.appendChild(categorieLijst);
    uitleg.appendChild(
      el(
        'p',
        null,
        'De score wordt volledig berekend uit de meerkeuzeantwoorden en staat daarmee vast. Jij legt per ' +
          'inzending vast welk besluit je op basis daarvan neemt.'
      )
    );
  }

  function tekenTegels(samenvatting, totaalAantal) {
    tegelsEl.innerHTML = '';

    var alles = el('button', 'dg-tegel');
    alles.type = 'button';
    alles.setAttribute('aria-pressed', filterCategorie.value === '');
    alles.appendChild(el('div', 'dg-tegel__aantal', String(totaalAantal)));
    alles.appendChild(el('div', 'dg-tegel__label', 'Alle inzendingen'));
    alles.appendChild(el('div', 'dg-tegel__bereik', 'Alle categorieën'));
    alles.addEventListener('click', function () {
      filterCategorie.value = '';
      laadOverzicht();
    });
    tegelsEl.appendChild(alles);

    samenvatting.forEach(function (rij) {
      var categorie = model.categorieen.find(function (c) {
        return c.sleutel === rij.sleutel;
      });
      var tegel = el('button', 'dg-tegel dg-tegel--' + rij.kleur);
      tegel.type = 'button';
      tegel.setAttribute('aria-pressed', filterCategorie.value === rij.sleutel);
      tegel.appendChild(el('div', 'dg-tegel__aantal', String(rij.aantal)));
      tegel.appendChild(el('div', 'dg-tegel__label', rij.kort || rij.label));
      tegel.appendChild(el('div', 'dg-tegel__bereik', categorie.vanaf + '-' + categorie.tot + ' punten'));
      tegel.addEventListener('click', function () {
        filterCategorie.value = filterCategorie.value === rij.sleutel ? '' : rij.sleutel;
        laadOverzicht();
      });
      tegelsEl.appendChild(tegel);
    });
  }

  function tekenTabel(inzendingen) {
    tabelEl.innerHTML = '';
    leegEl.hidden = inzendingen.length > 0;

    inzendingen.forEach(function (inzending) {
      var rij = el('tr');
      rij.tabIndex = 0;
      rij.setAttribute('aria-selected', String(inzending.id === huidigeInzendingId));

      var naamCel = el('td');
      naamCel.appendChild(el('div', 'dg-tabel__naam', inzending.naam || '(geen naam)'));
      naamCel.appendChild(el('div', 'dg-tabel__sub', inzending.email || ''));
      rij.appendChild(naamCel);

      var afdelingCel = el('td');
      afdelingCel.appendChild(el('div', null, inzending.afdeling || '-'));
      if (inzending.functie) afdelingCel.appendChild(el('div', 'dg-tabel__sub', inzending.functie));
      rij.appendChild(afdelingCel);

      rij.appendChild(el('td', 'dg-tabel__sub', datum(inzending.ingezonden_op)));

      var balkenCel = el('td');
      var balken = el('div', 'dg-balkjes');
      balken.appendChild(balkje(inzending.onderdelen.informatiewerk, model.gewichten.informatiewerk, 'Informatiewerk'));
      balken.appendChild(balkje(inzending.onderdelen.businesswaarde, model.gewichten.businesswaarde, 'Businesswaarde'));
      balken.appendChild(balkje(inzending.onderdelen.volwassenheid, model.gewichten.volwassenheid, 'AI-volwassenheid'));
      balkenCel.appendChild(balken);
      rij.appendChild(balkenCel);

      rij.appendChild(el('td', 'dg-tabel__score', String(inzending.totaal)));

      var adviesCel = el('td');
      var adviesBadge = el(
        'span',
        'dg-badge dg-badge--' + inzending.categorieKleur,
        inzending.categorieKort || inzending.categorieLabel
      );
      adviesBadge.title = inzending.categorieLabel;
      adviesCel.appendChild(adviesBadge);
      rij.appendChild(adviesCel);

      var besluitCel = el('td');
      var gekozenBesluit = (model.besluiten || []).find(function (b) {
        return b.waarde === inzending.besluit;
      });
      besluitCel.appendChild(
        el(
          'span',
          'dg-badge dg-badge--' + ((gekozenBesluit && gekozenBesluit.kleur) || 'grijs'),
          besluitLabel(inzending.besluit)
        )
      );
      rij.appendChild(besluitCel);

      function open() {
        opendetail(inzending.id);
      }
      rij.addEventListener('click', open);
      rij.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          open();
        }
      });

      tabelEl.appendChild(rij);
    });
  }

  // ------------------------------------------------------------- detail ---

  function scoreOpbouwTabel(beoordeling) {
    var tabel = el('table', 'dg-opbouw');
    var thead = el('thead');
    var koprij = el('tr');
    koprij.appendChild(el('th', null, 'Onderdeel'));
    koprij.appendChild(el('th', null, 'Score'));
    thead.appendChild(koprij);
    tabel.appendChild(thead);

    var tbody = el('tbody');
    var volgorde = ['informatiewerk', 'businesswaarde', 'volwassenheid'];
    volgorde.forEach(function (sleutel) {
      var onderdeel = beoordeling.onderdelen[sleutel];
      var rij = el('tr');
      rij.appendChild(el('td', null, model.onderdeelLabels[sleutel]));
      rij.appendChild(el('td', null, onderdeel.score + ' / ' + onderdeel.max));
      tbody.appendChild(rij);
    });

    var totaalRij = el('tr');
    totaalRij.appendChild(el('td', null, 'Totaal'));
    totaalRij.appendChild(el('td', null, beoordeling.totaal + ' / 100'));
    tbody.appendChild(totaalRij);
    tabel.appendChild(tbody);
    return tabel;
  }

  function signalenLijst(signalen) {
    var lijst = el('ul', 'dg-signalen');
    signalen.forEach(function (signaal) {
      var item = el('li');
      var vink = el(
        'span',
        'dg-signaal__vink dg-signaal__vink--' + (signaal.voldaan ? 'ja' : 'nee'),
        signaal.voldaan ? '✓' : '–'
      );
      item.appendChild(vink);
      var tekst = el('div');
      tekst.appendChild(el('span', null, signaal.label));
      tekst.appendChild(el('span', 'dg-signaal__toelichting', signaal.toelichting));
      item.appendChild(tekst);
      lijst.appendChild(item);
    });
    return lijst;
  }

  function tekenDetail(data) {
    detailEl.innerHTML = '';

    var kop = el('div', 'dg-detail__kop');
    var kopTekst = el('div');
    kopTekst.appendChild(el('h2', null, data.respondent.naam || '(geen naam)'));
    var sub = [data.respondent.functie, data.respondent.afdeling].filter(Boolean).join(' · ');
    kopTekst.appendChild(el('p', 'dg-klein', sub || data.respondent.email));
    if (sub) kopTekst.appendChild(el('p', 'dg-klein', data.respondent.email));
    kopTekst.appendChild(el('p', 'dg-klein', 'Ingezonden op ' + datum(data.ingezonden_op)));
    kop.appendChild(kopTekst);

    var sluit = el('button', 'dg-sluit', '×');
    sluit.type = 'button';
    sluit.setAttribute('aria-label', 'Sluiten');
    sluit.addEventListener('click', sluitDetail);
    kop.appendChild(sluit);
    detailEl.appendChild(kop);

    // Totaalscore + advies
    var totaalBlok = el('div', 'dg-totaalblok');
    var cijfer = el('div');
    cijfer.appendChild(el('span', 'dg-totaalblok__cijfer', String(data.beoordeling.totaal)));
    cijfer.appendChild(el('span', 'dg-totaalblok__max', ' / 100'));
    totaalBlok.appendChild(cijfer);
    var badgeBlok = el('div');
    badgeBlok.appendChild(
      el('span', 'dg-badge dg-badge--' + data.beoordeling.categorieKleur, data.beoordeling.categorieLabel)
    );
    totaalBlok.appendChild(badgeBlok);
    detailEl.appendChild(totaalBlok);
    detailEl.appendChild(el('p', 'dg-advies', data.beoordeling.advies));

    // Onderbouwing door de invuller. Die wordt alleen uitgevraagd bij de
    // categorie die erom vraagt, dus als hij er is, is hij relevant.
    var onderbouwing = (data.antwoorden || []).find(function (antwoord) {
      return antwoord.veld === 'use_case';
    });
    if (onderbouwing) {
      detailEl.appendChild(el('h3', null, 'Onderbouwing door de medewerker'));
      detailEl.appendChild(el('blockquote', 'dg-citaat', onderbouwing.antwoord));
    }

    // Score-opbouw
    detailEl.appendChild(el('h3', null, 'Score-opbouw'));
    detailEl.appendChild(scoreOpbouwTabel(data.beoordeling));

    // Kwalitatieve signalen
    detailEl.appendChild(el('h3', null, 'Profielkenmerken uit het beoordelingskader'));
    detailEl.appendChild(signalenLijst(data.beoordeling.signalen));

    // Beoordelingsformulier
    detailEl.appendChild(bouwBeoordelingsformulier(data));

    // Alle antwoorden
    var antwoordenUitklap = el('details', 'dg-uitklap');
    antwoordenUitklap.open = true;
    antwoordenUitklap.appendChild(el('summary', null, 'Alle antwoorden'));
    var antwoorden = el('div', 'dg-antwoorden');
    data.antwoorden.forEach(function (antwoord) {
      var regel = el('div', 'dg-antwoord' + (antwoord.lang ? ' dg-antwoord--lang' : ''));
      regel.appendChild(el('div', 'dg-antwoord__vraag', antwoord.vraag));
      regel.appendChild(el('div', 'dg-antwoord__waarde', antwoord.antwoord));
      antwoorden.appendChild(regel);
    });
    antwoordenUitklap.appendChild(antwoorden);
    detailEl.appendChild(antwoordenUitklap);

    detailEl.appendChild(
      el(
        'p',
        'dg-klein',
        data.akkoord_contact
          ? 'Deze persoon mag benaderd worden om de antwoorden toe te lichten.'
          : 'Deze persoon heeft geen toestemming gegeven om benaderd te worden voor toelichting.'
      )
    );

    // Of de bevestigingsmail is aangekomen, is voor jou relevant als iemand
    // belt met "ik heb niets gehoord".
    if (data.bevestiging_verzonden !== null && data.bevestiging_verzonden !== undefined) {
      detailEl.appendChild(
        el(
          'p',
          'dg-klein',
          data.bevestiging_verzonden
            ? 'Er is een bevestiging per e-mail verstuurd.'
            : 'De bevestigingsmail is niet verstuurd. Controleer het logboek van de server.'
        )
      );
    }
  }

  function bouwBeoordelingsformulier(data) {
    var blok = el('div', 'dg-beoordeling');
    blok.appendChild(el('h3', null, 'Jouw beoordeling'));

    blok.appendChild(
      el(
        'p',
        'dg-klein',
        'De score komt volledig uit de meerkeuzeantwoorden en ligt daarmee vast. Leg hieronder vast ' +
          'welk besluit je op basis daarvan neemt.'
      )
    );

    // Besluit
    var besluitVraag = el('div', 'dg-vraag');
    var besluitLabelEl = el('label', 'dg-vraag__label', 'Besluit');
    besluitLabelEl.setAttribute('for', 'besluit');
    besluitVraag.appendChild(besluitLabelEl);
    var besluitSelect = el('select', 'dg-veld');
    besluitSelect.id = 'besluit';

    // Een besluit uit een eerdere versie van het model staat niet meer in de
    // lijst. Dat tonen we apart, zodat opslaan het niet ongemerkt vervangt.
    var bekend = model.besluiten.some(function (b) {
      return b.waarde === data.besluit;
    });
    if (!bekend && data.besluit) {
      var vervallen = el('option', null, data.besluit + ' (vervallen keuze)');
      vervallen.value = data.besluit;
      vervallen.selected = true;
      besluitSelect.appendChild(vervallen);
    }

    model.besluiten.forEach(function (b) {
      var optie = el('option', null, b.label);
      optie.value = b.waarde;
      if (b.waarde === data.besluit) optie.selected = true;
      besluitSelect.appendChild(optie);
    });
    besluitVraag.appendChild(besluitSelect);
    blok.appendChild(besluitVraag);

    // Toelichting
    var toelichtingVraag = el('div', 'dg-vraag');
    var toelichtingLabel = el('label', 'dg-vraag__label', 'Toelichting bij het besluit');
    toelichtingLabel.setAttribute('for', 'toelichting');
    toelichtingVraag.appendChild(toelichtingLabel);
    var toelichting = el('textarea', 'dg-veld');
    toelichting.id = 'toelichting';
    toelichting.rows = 3;
    toelichting.value = data.besluit_toelichting || '';
    toelichtingVraag.appendChild(toelichting);
    blok.appendChild(toelichtingVraag);

    // Opslaan
    var opslag = el('div', 'dg-opslag');
    var knop = el('button', 'dg-knop dg-knop--klein', 'Beoordeling opslaan');
    knop.type = 'button';
    var status = el('span', 'dg-opslag__status');
    status.hidden = true;

    if (bevestiging) {
      status.textContent = bevestiging;
      status.hidden = false;
      bevestiging = null;
      setTimeout(function () {
        status.hidden = true;
      }, 4000);
    }
    opslag.appendChild(knop);
    opslag.appendChild(status);

    if (data.beoordeeld_op) {
      opslag.appendChild(
        el('span', 'dg-klein', 'Laatst beoordeeld door ' + (data.beoordeeld_door || 'onbekend') + ' op ' + datum(data.beoordeeld_op))
      );
    }

    knop.addEventListener('click', function () {
      knop.disabled = true;
      status.hidden = true;
      knop.textContent = 'Bezig met opslaan…';
      haal('/api/beheer/inzendingen/' + data.id + '/beoordeling', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          besluit: besluitSelect.value,
          besluit_toelichting: toelichting.value,
        }),
      })
        .then(function () {
          bevestiging = 'Beoordeling opgeslagen';
          return Promise.all([laadOverzicht(), opendetail(data.id)]);
        })
        .catch(function (fout) {
          toonFout(fout.message);
          knop.disabled = false;
          knop.textContent = 'Beoordeling opslaan';
        });
    });

    blok.appendChild(opslag);
    return blok;
  }

  function opendetail(id) {
    huidigeInzendingId = id;
    return haal('/api/beheer/inzendingen/' + id)
      .then(function (data) {
        tekenDetail(data);
        detailEl.hidden = false;
        overlayEl.hidden = false;
        detailEl.focus();
      })
      .catch(function (fout) {
        toonFout(fout.message);
      });
  }

  function sluitDetail() {
    detailEl.hidden = true;
    overlayEl.hidden = true;
    huidigeInzendingId = null;
    Array.prototype.forEach.call(tabelEl.querySelectorAll('tr'), function (rij) {
      rij.setAttribute('aria-selected', 'false');
    });
  }

  overlayEl.addEventListener('click', sluitDetail);
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !detailEl.hidden) sluitDetail();
  });

  // ------------------------------------------------------------- laden ----

  function laadOverzicht() {
    var params = new URLSearchParams();
    if (filterCategorie.value) params.set('categorie', filterCategorie.value);
    if (filterBesluit.value) params.set('besluit', filterBesluit.value);
    if (filterZoek.value.trim()) params.set('zoek', filterZoek.value.trim());

    return haal('/api/beheer/inzendingen?' + params.toString())
      .then(function (data) {
        foutEl.hidden = true;
        tekenTegels(data.samenvatting, data.totaalAantal);
        tekenTabel(data.inzendingen);
        aantalEl.textContent =
          data.totaalAantal === 1 ? '1 inzending' : data.totaalAantal + ' inzendingen';
      })
      .catch(function (fout) {
        aantalEl.textContent = '';
        toonFout(fout.message);
      });
  }

  var zoekTimer = null;
  filterZoek.addEventListener('input', function () {
    clearTimeout(zoekTimer);
    zoekTimer = setTimeout(laadOverzicht, 250);
  });
  filterCategorie.addEventListener('change', laadOverzicht);
  filterBesluit.addEventListener('change', laadOverzicht);
  document.getElementById('wisfilters').addEventListener('click', function () {
    filterCategorie.value = '';
    filterBesluit.value = '';
    filterZoek.value = '';
    laadOverzicht();
  });

  haal('/api/beheer/model')
    .then(function (data) {
      model = data;
      vulFilters();
      return laadOverzicht();
    })
    .catch(function (fout) {
      toonFout(fout.message);
    });
})();
