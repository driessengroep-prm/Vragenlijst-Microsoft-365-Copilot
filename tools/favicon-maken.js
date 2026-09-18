'use strict';

/**
 * Maakt de favicon uit het beeldmerk in het logo.
 *
 * Draaien met `npm run favicon`.
 *
 * Het script zoekt in public/assets/img/DriessenGroep.png het ronde beeldmerk
 * links van het woordmerk, snijdt dat vierkant uit en schaalt het naar de
 * maten die browsers gebruiken. Vervang je het logo, draai dit dan opnieuw.
 */

const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');

const WORTEL = path.join(__dirname, '..');
const BRON = path.join(WORTEL, 'public', 'assets', 'img', 'DriessenGroep.png');
const DOELMAP = path.join(WORTEL, 'public', 'assets', 'img');

/** Hoeveel lege kolommen we als scheiding tussen beeldmerk en woordmerk zien. */
const SCHEIDING = 40;
/** Witruimte rondom het beeldmerk, als deel van de grootte. */
const MARGE = 0.06;

// Voor elke maat een eigen bestand. Een browser die zelf van 48 naar 16 pixels
// verkleint, maakt de dunne lijn van het beeldmerk vaak onherkenbaar.
// `alfaGamma` compenseert dat het beeldmerk uit dunne lijnen bestaat. Bij het
// middelen worden die lijnen half doorzichtig en daarmee flets; een waarde
// onder 1 maakt ze weer voldoende dekkend. Bij grote maten is dat niet nodig.
const MATEN = [
  { naam: 'favicon-16.png', grootte: 16, alfaGamma: 0.6 },
  { naam: 'favicon-32.png', grootte: 32, alfaGamma: 0.75 },
  { naam: 'favicon.png', grootte: 48, alfaGamma: 0.85 },
  { naam: 'apple-touch-icon.png', grootte: 180, alfaGamma: 1 },
];

function doorzichtig(png, x, y) {
  return png.data[(y * png.width + x) * 4 + 3] <= 16;
}

/** Zoek het vierkante kader om het beeldmerk (het deel links van het woordmerk). */
function kaderVanBeeldmerk(png) {
  let start = -1;
  for (let x = 0; x < png.width && start < 0; x++) {
    for (let y = 0; y < png.height; y++) {
      if (!doorzichtig(png, x, y)) {
        start = x;
        break;
      }
    }
  }
  if (start < 0) throw new Error('De afbeelding lijkt helemaal doorzichtig te zijn.');

  let eind = png.width - 1;
  let leeg = 0;
  for (let x = start; x < png.width; x++) {
    let gevuld = false;
    for (let y = 0; y < png.height; y++) {
      if (!doorzichtig(png, x, y)) {
        gevuld = true;
        break;
      }
    }
    if (gevuld) leeg = 0;
    else if (++leeg > SCHEIDING) {
      eind = x - leeg;
      break;
    }
  }

  let boven = -1;
  let onder = -1;
  for (let y = 0; y < png.height; y++) {
    for (let x = start; x <= eind; x++) {
      if (!doorzichtig(png, x, y)) {
        if (boven < 0) boven = y;
        onder = y;
        break;
      }
    }
  }

  // Maak er een vierkant van rond het midden, met wat lucht eromheen.
  const breedte = eind - start + 1;
  const hoogte = onder - boven + 1;
  const zijde = Math.round(Math.max(breedte, hoogte) * (1 + MARGE * 2));
  const middenX = start + breedte / 2;
  const middenY = boven + hoogte / 2;

  return {
    x: Math.round(middenX - zijde / 2),
    y: Math.round(middenY - zijde / 2),
    zijde,
  };
}

/**
 * Verklein met middeling over het bronvlak. Dat geeft veel gladdere randen dan
 * losse pixels overnemen, wat bij een dun getekend beeldmerk goed te zien is.
 */
function verklein(png, kader, doelGrootte, alfaGamma = 1) {
  const uit = new PNG({ width: doelGrootte, height: doelGrootte });
  const schaal = kader.zijde / doelGrootte;

  for (let dy = 0; dy < doelGrootte; dy++) {
    for (let dx = 0; dx < doelGrootte; dx++) {
      const vanX = Math.floor(kader.x + dx * schaal);
      const totX = Math.max(vanX + 1, Math.floor(kader.x + (dx + 1) * schaal));
      const vanY = Math.floor(kader.y + dy * schaal);
      const totY = Math.max(vanY + 1, Math.floor(kader.y + (dy + 1) * schaal));

      let r = 0;
      let g = 0;
      let bl = 0;
      let a = 0;
      let aantal = 0;

      for (let y = vanY; y < totY; y++) {
        for (let x = vanX; x < totX; x++) {
          aantal++;
          // Buiten de bronafbeelding tellen we als volledig doorzichtig.
          if (x < 0 || y < 0 || x >= png.width || y >= png.height) continue;
          const i = (y * png.width + x) * 4;
          const alfa = png.data[i + 3] / 255;
          // Vooraf vermenigvuldigen met alfa, anders kleuren doorzichtige
          // pixels de randen mee.
          r += png.data[i] * alfa;
          g += png.data[i + 1] * alfa;
          bl += png.data[i + 2] * alfa;
          a += alfa;
        }
      }

      const j = (dy * doelGrootte + dx) * 4;
      if (a > 0) {
        uit.data[j] = Math.round(r / a);
        uit.data[j + 1] = Math.round(g / a);
        uit.data[j + 2] = Math.round(bl / a);
      }
      const dekking = a / aantal;
      uit.data[j + 3] = Math.round(Math.min(1, Math.pow(dekking, alfaGamma)) * 255);
    }
  }

  return uit;
}

function maak() {
  const bron = PNG.sync.read(fs.readFileSync(BRON));
  const kader = kaderVanBeeldmerk(bron);
  console.log(`Beeldmerk gevonden op ${kader.x},${kader.y} met zijde ${kader.zijde}px.`);

  for (const { naam, grootte, alfaGamma } of MATEN) {
    const doel = path.join(DOELMAP, naam);
    fs.writeFileSync(doel, PNG.sync.write(verklein(bron, kader, grootte, alfaGamma)));
    console.log(`  ${naam} (${grootte}x${grootte}) geschreven.`);
  }
}

maak();
