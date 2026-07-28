// stars.js — the bright-star catalogue as ready-to-observe bodies.
//
// The raw table (bright-stars.js) holds catalogue rows; this module turns
// a row into a star() body that drops straight into observe(), and offers
// the few lookups an application needs: by proper name, by Bayer/Flamsteed
// id, and by magnitude limit.

import { STARS } from './data/bright-stars.js';
import { star } from '../bodies/star.js';

export { STARS };

// A display label for a catalogue row: proper name if it has one, else
// its Bayer/Flamsteed id, else the Harvard Revised (HR) number — some
// rows carry no designation but always have an HR number and a position.
export const starLabel = (row) => row.name || row.bf || ('HR ' + row.hr);

// A catalogue row -> a body on the frame graph (proper motion carried),
// tagged with its catalogue provenance.
export const starBody = (row) => ({
  ...star({ ra: row.ra, dec: row.dec, pmRA: row.pmRA, pmDE: row.pmDE, name: starLabel(row) }),
  provenance: {
    source: ['bright-star-catalogue'],
    accuracy: { value: 1, unit: 'arcsecond', basis: 'bright-star-catalogue' }
  }
});

// Rows no fainter than maxMag (visual magnitude), brightest first.
export const brightStars = (maxMag = 6) => STARS.filter((s) => s.mag <= maxMag);

const byName = new Map();
const byBf = new Map();
for (const s of STARS) {
  if (s.name) byName.set(s.name.toLowerCase(), s);
  if (s.bf) byBf.set(s.bf.toLowerCase(), s);
}

// Look a star up by proper name ("Vega") or Bayer/Flamsteed id ("Alp Lyr").
// Returns the catalogue row, or undefined.
export const findStar = (query) => {
  const q = String(query).trim().toLowerCase();
  return byName.get(q) || byBf.get(q);
};
