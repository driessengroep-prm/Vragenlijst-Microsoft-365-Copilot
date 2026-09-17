/* ==========================================================================
   Bouwt de vragenlijst op uit de definitie die de server aanlevert
   (GET /api/vragenlijst) en verstuurt de antwoorden naar /api/inzendingen.
   Eén bron van waarheid: pas src/vragenlijst.js aan en deze pagina volgt.
   ========================================================================== */

(function () {
  'use strict';

  var form = document.getElementById('vragenlijst');
  var sectiesEl = document.getElementById('secties');
  var laadmelding = document.getElementById('laadmelding');
  var foutmelding = document.getElementById('formulierfout');
  var akkoordSectie = document.getElementById('akkoord-sectie');
  var verstuurBlok = document.getElementById('versturen-blok');
  var verstuurKnop = document.getElementById('verstuurknop');
  var voortgangsbalk = document.getElementById('voortgangsbalk');

  var definitie = null;

  // ------------------------------------------------------------- helpers --

  function el(tag, klasse, tekst) {
    var node = document.createElement(tag);
    if (klasse) node.className = klasse;
    if (tekst !== undefined && tekst !== null) node.textContent = tekst;
    return node;
  }

  function verplichtSter() {
    var span = el('span', 'dg-verplicht', '*');
    span.setAttribute('aria-hidden', 'true');
    return span;
  }

  function foutplek(veldId) {
    var span = el('span', 'dg-fout');
    span.id = 'fout-' + veldId;
    span.hidden = true;
    return span;
  }

  // -------------------------------------------------------- vraagtypes ----

  function tekstvraag(vraag) {
    var wrap = el('div', 'dg-vraag');
    var label = el('label', 'dg-vraag__label');
    label.setAttribute('for', vraag.id);
    label.appendChild(document.createTextNode(vraag.nummer ? vraag.nummer + '. ' + vraag.vraag : vraag.vraag));
    if (vraag.verplicht) label.appendChild(verplichtSter());
    wrap.appendChild(label);

    if (vraag.toelichting) wrap.appendChild(el('p', 'dg-vraag__toelichting', vraag.toelichting));

    var invoer;
    if (vraag.type === 'tekstvlak') {
      invoer = el('textarea', 'dg-veld');
      invoer.rows = 6;
    } else {
      invoer = el('input', 'dg-veld');
      invoer.type = vraag.type === 'email' ? 'email' : 'text';
    }
    invoer.id = vraag.id;
    invoer.name = vraag.id;
    if (vraag.maxLengte) invoer.maxLength = vraag.maxLengte;
    if (vraag.verplicht) invoer.setAttribute('aria-required', 'true');
    if (vraag.id === 'naam') invoer.autocomplete = 'name';
    if (vraag.id === 'email') invoer.autocomplete = 'email';
    if (vraag.id === 'functie') invoer.autocomplete = 'organization-title';

    wrap.appendChild(invoer);
    wrap.appendChild(foutplek(vraag.id));
    return wrap;
  }

  function keuzevraag(vraag) {
    var fieldset = el('fieldset', 'dg-vraag');
    var legend = el('legend');
    legend.className = 'dg-vraag__label';
    legend.appendChild(document.createTextNode(vraag.nummer + '. ' + vraag.vraag));
    if (vraag.verplicht) legend.appendChild(verplichtSter());
    fieldset.appendChild(legend);

    if (vraag.toelichting) fieldset.appendChild(el('p', 'dg-vraag__toelichting', vraag.toelichting));

    var lijst = el('div', 'dg-opties');
    var meerkeuze = vraag.type === 'checkbox';

    vraag.opties.forEach(function (optie, index) {
      var label = el('label', 'dg-optie');
      var invoer = el('input');
      invoer.type = meerkeuze ? 'checkbox' : 'radio';
      invoer.name = vraag.id;
      invoer.value = optie.waarde;
      invoer.id = vraag.id + '_' + index;
      label.appendChild(invoer);
      label.appendChild(el('span', null, optie.label));
      lijst.appendChild(label);

      // "Anders, namelijk:" krijgt een eigen tekstveld dat pas verschijnt
      // zodra de optie is aangevinkt.
      if (optie.anders && vraag.andersVeld) {
        var andersVeld = el('input', 'dg-veld dg-optie-anders');
        andersVeld.type = 'text';
        andersVeld.id = vraag.andersVeld;
        andersVeld.name = vraag.andersVeld;
        andersVeld.maxLength = 200;
        andersVeld.placeholder = 'Vul hier je eigen antwoord in';
        andersVeld.hidden = true;
        andersVeld.setAttribute('aria-label', 'Anders, namelijk');
        lijst.appendChild(andersVeld);

        invoer.addEventListener('change', function () {
          andersVeld.hidden = !invoer.checked;
          if (invoer.checked) andersVeld.focus();
          else andersVeld.value = '';
        });
      }
    });

    fieldset.appendChild(lijst);
    fieldset.appendChild(foutplek(vraag.id));
    return fieldset;
  }

  function matrixvraag(vraag) {
    var wrap = el('div', 'dg-vraag');
    var kop = el('p', 'dg-vraag__label');
    kop.appendChild(document.createTextNode(vraag.nummer + '. ' + vraag.vraag));
    if (vraag.verplicht) kop.appendChild(verplichtSter());
    wrap.appendChild(kop);

    if (vraag.toelichting) wrap.appendChild(el('p', 'dg-vraag__toelichting', vraag.toelichting));

    var matrix = el('div', 'dg-matrix');
    matrix.style.setProperty('--dg-kolommen', vraag.opties.length);

    var kopRij = el('div', 'dg-matrix__kop');
    kopRij.setAttribute('aria-hidden', 'true');
    kopRij.appendChild(el('div', 'dg-matrix__kopcel', vraag.kolomkop || ''));
    vraag.opties.forEach(function (optie) {
      kopRij.appendChild(el('div', 'dg-matrix__kopcel', optie.label));
    });
    matrix.appendChild(kopRij);

    vraag.rijen.forEach(function (rij) {
      // Bewust geen <fieldset>/<legend>: een legend doet in Chromium niet mee
      // aan de grid-layout, waardoor het rijlabel boven de opties zou landen.
      // role="radiogroup" met aria-labelledby geeft schermlezers dezelfde context.
      var groep = el('div', 'dg-matrix__rij');
      groep.setAttribute('role', 'radiogroup');
      groep.setAttribute('aria-labelledby', rij.id + '_label');
      var label = el('span', 'dg-matrix__rijlabel', rij.label);
      label.id = rij.id + '_label';
      groep.appendChild(label);

      var opties = el('div', 'dg-matrix__opties');
      vraag.opties.forEach(function (optie, index) {
        var label = el('label', 'dg-matrix__optie');
        var invoer = el('input');
        invoer.type = 'radio';
        invoer.name = rij.id;
        invoer.value = optie.waarde;
        invoer.id = rij.id + '_' + index;
        // Op desktop zijn de kolomlabels visueel verborgen; schermlezers
        // krijgen de volledige context via aria-label.
        invoer.setAttribute('aria-label', rij.label + ': ' + optie.label);
        label.appendChild(invoer);
        label.appendChild(el('span', 'dg-matrix__optietekst', optie.label));
        opties.appendChild(label);
      });

      groep.appendChild(opties);
      groep.appendChild(foutplek(rij.id));
      matrix.appendChild(groep);
    });

    wrap.appendChild(matrix);
    return wrap;
  }

  // -------------------------------------------------------- opbouw ------ --

  function bouwFormulier(data) {
    definitie = data;
    sectiesEl.innerHTML = '';

    data.delen.forEach(function (deel) {
      var vragenInDeel = data.vragen.filter(function (v) {
        return v.deel === deel.nummer;
      });
      if (vragenInDeel.length === 0) return;

      var sectie = el('section', 'dg-sectie');
      var titelrij = el('div', 'dg-sectie__titel');
      titelrij.appendChild(el('h2', null, deel.titel));
      sectie.appendChild(titelrij);

      if (deel.toelichting) sectie.appendChild(el('p', 'dg-sectie__toelichting', deel.toelichting));

      // Naam en e-mail zetten we naast elkaar; dat scheelt scrollen.
      if (deel.nummer === 0) {
        var rij1 = el('div', 'dg-veldrij');
        var rij2 = el('div', 'dg-veldrij');
        vragenInDeel.forEach(function (vraag, i) {
          (i < 2 ? rij1 : rij2).appendChild(tekstvraag(vraag));
        });
        sectie.appendChild(rij1);
        sectie.appendChild(rij2);
      } else {
        vragenInDeel.forEach(function (vraag) {
          if (vraag.type === 'matrix') sectie.appendChild(matrixvraag(vraag));
          else if (vraag.type === 'radio' || vraag.type === 'checkbox') sectie.appendChild(keuzevraag(vraag));
          else sectie.appendChild(tekstvraag(vraag));
        });
      }

      sectiesEl.appendChild(sectie);
    });

    akkoordSectie.hidden = false;
    verstuurBlok.hidden = false;
    form.addEventListener('change', werkVoortgangBij);
    form.addEventListener('input', werkVoortgangBij);
    werkVoortgangBij();
  }

  // ---------------------------------------------------------- voortgang ---

  function verplichteVelden() {
    if (!definitie) return [];
    var velden = [];
    definitie.vragen.forEach(function (vraag) {
      if (!vraag.verplicht) return;
      if (vraag.type === 'matrix') {
        vraag.rijen.forEach(function (rij) {
          velden.push(rij.id);
        });
      } else {
        velden.push(vraag.id);
      }
    });
    return velden;
  }

  function veldIsIngevuld(naam) {
    var elementen = form.elements[naam];
    if (!elementen) return false;
    if (elementen.length !== undefined && !elementen.tagName) {
      for (var i = 0; i < elementen.length; i++) {
        if (elementen[i].checked) return true;
      }
      return false;
    }
    if (elementen.type === 'checkbox' || elementen.type === 'radio') return elementen.checked;
    return String(elementen.value || '').trim().length > 0;
  }

  function werkVoortgangBij() {
    var velden = verplichteVelden();
    if (velden.length === 0) return;
    var ingevuld = velden.filter(veldIsIngevuld).length;
    if (document.getElementById('akkoord_privacy').checked) ingevuld += 1;
    var percentage = Math.round((ingevuld / (velden.length + 1)) * 100);
    voortgangsbalk.style.width = percentage + '%';
  }

  // ---------------------------------------------------------- verzamelen --

  function verzamelAntwoorden() {
    var antwoorden = {};
    definitie.vragen.forEach(function (vraag) {
      if (vraag.type === 'matrix') {
        vraag.rijen.forEach(function (rij) {
          var gekozen = form.querySelector('input[name="' + rij.id + '"]:checked');
          antwoorden[rij.id] = gekozen ? gekozen.value : '';
        });
      } else if (vraag.type === 'checkbox') {
        var aangevinkt = form.querySelectorAll('input[name="' + vraag.id + '"]:checked');
        antwoorden[vraag.id] = Array.prototype.map.call(aangevinkt, function (i) {
          return i.value;
        });
        var andersVeld = document.getElementById(vraag.andersVeld);
        antwoorden[vraag.andersVeld] = andersVeld ? andersVeld.value.trim() : '';
      } else if (vraag.type === 'radio') {
        var keuze = form.querySelector('input[name="' + vraag.id + '"]:checked');
        antwoorden[vraag.id] = keuze ? keuze.value : '';
      } else {
        var veld = document.getElementById(vraag.id);
        antwoorden[vraag.id] = veld ? veld.value.trim() : '';
      }
    });
    antwoorden.akkoord_privacy = document.getElementById('akkoord_privacy').checked;
    antwoorden.akkoord_contact = document.getElementById('akkoord_contact').checked;
    antwoorden.website = (form.elements.website && form.elements.website.value) || '';
    return antwoorden;
  }

  // ------------------------------------------------------------ fouten ----

  function wisFouten() {
    Array.prototype.forEach.call(form.querySelectorAll('.dg-fout'), function (span) {
      span.textContent = '';
      span.hidden = true;
    });
    Array.prototype.forEach.call(form.querySelectorAll('.dg-veld--fout'), function (veld) {
      veld.classList.remove('dg-veld--fout');
    });
    var akkoordFout = document.getElementById('fout-akkoord_privacy');
    akkoordFout.textContent = '';
    akkoordFout.hidden = true;
    foutmelding.hidden = true;
  }

  function toonFouten(velden, algemeneMelding) {
    var eerste = null;
    Object.keys(velden || {}).forEach(function (veldId) {
      var span = document.getElementById('fout-' + veldId);
      if (span) {
        span.textContent = velden[veldId];
        span.hidden = false;
        if (!eerste) eerste = span;
      }
      var invoer = document.getElementById(veldId);
      if (invoer && invoer.classList.contains('dg-veld')) invoer.classList.add('dg-veld--fout');
    });

    foutmelding.textContent =
      algemeneMelding || 'Niet alle verplichte vragen zijn ingevuld. De ontbrekende vragen zijn gemarkeerd.';
    foutmelding.hidden = false;

    var doel = eerste || foutmelding;
    doel.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  /** Controle in de browser; de server controleert nog een keer. */
  function controleerLokaal(antwoorden) {
    var fouten = {};
    definitie.vragen.forEach(function (vraag) {
      if (!vraag.verplicht) return;
      if (vraag.type === 'matrix') {
        vraag.rijen.forEach(function (rij) {
          if (!antwoorden[rij.id]) fouten[rij.id] = 'Maak een keuze.';
        });
      } else if (!antwoorden[vraag.id] || (Array.isArray(antwoorden[vraag.id]) && !antwoorden[vraag.id].length)) {
        fouten[vraag.id] = vraag.type === 'radio' ? 'Maak een keuze.' : 'Dit veld is verplicht.';
      }
    });

    if (antwoorden.email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(antwoorden.email)) {
      fouten.email = 'Vul een geldig e-mailadres in.';
    }
    if (antwoorden.v7 && antwoorden.v7.length < 15) {
      fouten.v7 = 'Beschrijf je voorbeeld iets uitgebreider (minimaal 15 tekens).';
    }
    if (!antwoorden.akkoord_privacy) {
      fouten.akkoord_privacy = 'Je moet akkoord gaan om het formulier te kunnen versturen.';
    }
    return fouten;
  }

  // ----------------------------------------------------------- verzenden --

  form.addEventListener('submit', function (gebeurtenis) {
    gebeurtenis.preventDefault();
    wisFouten();

    var antwoorden = verzamelAntwoorden();
    var fouten = controleerLokaal(antwoorden);
    if (Object.keys(fouten).length > 0) {
      toonFouten(fouten);
      return;
    }

    verstuurKnop.disabled = true;
    verstuurKnop.textContent = 'Bezig met verzenden…';

    fetch('/api/inzendingen', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(antwoorden),
    })
      .then(function (reactie) {
        return reactie.json().then(function (data) {
          return { status: reactie.status, data: data };
        });
      })
      .then(function (resultaat) {
        if (resultaat.status === 201 || resultaat.status === 202) {
          document.getElementById('intro').hidden = true;
          form.hidden = true;
          document.getElementById('bedankt').hidden = false;
          voortgangsbalk.style.width = '100%';
          window.scrollTo({ top: 0, behavior: 'smooth' });
          return;
        }
        toonFouten(resultaat.data.velden, resultaat.data.fout);
      })
      .catch(function () {
        toonFouten(
          null,
          'Je antwoorden konden niet worden verzonden. Controleer je internetverbinding en probeer het opnieuw.'
        );
      })
      .then(function () {
        verstuurKnop.disabled = false;
        verstuurKnop.textContent = 'Verzenden';
      });
  });

  // -------------------------------------------------------------- start ---

  fetch('/api/vragenlijst')
    .then(function (reactie) {
      if (!reactie.ok) throw new Error('Laden mislukt');
      return reactie.json();
    })
    .then(bouwFormulier)
    .catch(function () {
      laadmelding.textContent = '';
      foutmelding.textContent =
        'De vragenlijst kon niet worden geladen. Ververs de pagina of neem contact op met de beheerder.';
      foutmelding.hidden = false;
    });
})();
