// Star primitive + visible-sky test suite. Run with: node test/v4/sky.mjs
//
// The fixed-source apparent place is pinned against ERFA (atci13, the
// SOFA-derived reference) for several stars; the differences are at the
// sub-arcsecond level expected from the simple v/c aberration and the
// nutation model. The catalogue and the visibleSky wrapper are checked
// for internal consistency and physical sanity (Polaris elevation equals
// the observer latitude, the horizon cut, ordering).
import assert from 'assert';

import { Instant } from '../../src/time/instant.js';
import { HOUR, DEG } from '../../src/math/angles.js';
import { transform } from '../../src/frames/frames.js';
import { star } from '../../src/bodies/star.js';
import { apparentGeocentric } from '../../src/observer/apparent.js';
import { observer } from '../../src/observer/observer.js';
import { STARS, brightStars, starBody, starLabel, findStar } from '../../src/catalog/stars.js';
import { CONSTELLATIONS } from '../../src/catalog/data/constellations.js';
import { visibleSky } from '../../src/sky/visible.js';

let failures = 0;
const test = (name, fn) => {
  try {
    fn();
    console.log('ok - ' + name);
  } catch (e) {
    failures++;
    console.error('FAIL - ' + name);
    console.error('    ' + e.message);
  }
};

const apparentRaDec = (body, t) => {
  const g = apparentGeocentric(body, t);
  const ra = (Math.atan2(g.r[1], g.r[0]) / HOUR + 24) % 24;
  const dec = Math.asin(g.r[2] / Math.hypot(g.r[0], g.r[1], g.r[2])) / DEG;
  return { ra, dec };
};

// Catalogue J2000 positions and proper motions (BSC).
const CAT = {
  Sirius: { ra: 6.752472222, dec: -16.71611111, pmRA: -0.553, pmDE: -1.205 },
  Vega: { ra: 18.61565556, dec: 38.78369444, pmRA: 0.201, pmDE: 0.286 },
  Arcturus: { ra: 14.26102778, dec: 19.1825, pmRA: -1.093, pmDE: -1.998 },
  Betelgeuse: { ra: 5.919527778, dec: 7.406944444, pmRA: 0.027, pmDE: 0.011 }
};
// ERFA atci13 apparent (equinox-based) RA/Dec at 2027-01-01T00:00:00 TT-chain.
const ERFA = {
  Sirius: [6.772842, -16.75365],
  Vega: [18.630505, 38.80826],
  Arcturus: [14.281598, 19.03888],
  Betelgeuse: [5.944477, 7.41135]
};

test('star apparent place matches ERFA atci13 within the model gap', () => {
  const t = Instant.fromISO('2027-01-01T00:00:00Z');
  for (const [name, c] of Object.entries(CAT)) {
    const { ra, dec } = apparentRaDec(star(c), t);
    const [raRef, decRef] = ERFA[name];
    const dRa = Math.abs(ra - raRef) * 15 * 3600 * Math.cos(dec * DEG); // arcsec on sky
    const dDec = Math.abs(dec - decRef) * 3600;
    // simple v/c aberration vs ERFA's rigorous aberration + 2000B nutation
    assert.ok(dRa < 1.5, `${name} dRA = ${dRa.toFixed(2)}"`);
    assert.ok(dDec < 1.5, `${name} dDec = ${dDec.toFixed(2)}"`);
  }
});

test('geometric place at J2000 recovers the catalogue position exactly', () => {
  const tj = Instant.fromJD(2451545.0, 'tt');
  const g = apparentGeocentric(star(CAT.Sirius), tj, { lightTime: false });
  const eq = transform(g, { frame: 'equatorial-j2000' });
  const ra = (Math.atan2(eq.r[1], eq.r[0]) / HOUR + 24) % 24;
  const dec = Math.asin(eq.r[2] / Math.hypot(eq.r[0], eq.r[1], eq.r[2])) / DEG;
  assert.ok(Math.abs(ra - CAT.Sirius.ra) * 15 * 3600 < 0.01, 'RA');
  assert.ok(Math.abs(dec - CAT.Sirius.dec) * 3600 < 0.01, 'Dec');
});

test('aberration is bounded by the annual constant and toggles off', () => {
  const t = Instant.fromISO('2026-04-01T00:00:00Z');
  const ap = apparentRaDec(star(CAT.Vega), t);
  const ge = apparentRaDec(star(CAT.Vega), t, { lightTime: false });
  // apparentRaDec ignores the option; recompute geometric explicitly
  const g = apparentGeocentric(star(CAT.Vega), t, { lightTime: false });
  const gra = (Math.atan2(g.r[1], g.r[0]) / HOUR + 24) % 24;
  const gdec = Math.asin(g.r[2] / Math.hypot(g.r[0], g.r[1], g.r[2])) / DEG;
  const sep = Math.hypot((ap.ra - gra) * 15 * Math.cos(ap.dec * DEG), ap.dec - gdec) * 3600;
  assert.ok(sep > 5 && sep < 20.6, 'aberration ' + sep.toFixed(2) + '" (5..20.5)');
});

test('proper motion moves a star at the catalogued rate', () => {
  // a pure-declination proper motion of 2"/yr over 50 yr => 100"
  const s = star({ ra: 12, dec: 0, pmRA: 0, pmDE: 2.0 });
  const a = apparentGeocentric(s, Instant.fromJD(2451545.0, 'tt'), { lightTime: false });
  const b = apparentGeocentric(s, Instant.fromJD(2451545.0 + 50 * 365.25, 'tt'), { lightTime: false });
  // compare on the J2000 frame so precession/nutation cancel out
  const toJ = (v) => transform(v, { frame: 'equatorial-j2000' }).r;
  const [ra, rb] = [toJ(a), toJ(b)];
  const decA = Math.asin(ra[2] / Math.hypot(ra[0], ra[1], ra[2])) / DEG;
  const decB = Math.asin(rb[2] / Math.hypot(rb[0], rb[1], rb[2])) / DEG;
  assert.ok(Math.abs((decB - decA) * 3600 - 100) < 0.1, 'dDec = ' + (decB - decA) * 3600 + '"');
});

test('catalogue is well-formed and lookups work', () => {
  assert.ok(STARS.length > 1500, 'stars: ' + STARS.length);
  // sorted brightest-first, every row observable
  for (let i = 1; i < STARS.length; i++) assert.ok(STARS[i].mag >= STARS[i - 1].mag);
  assert.ok(findStar('Vega').hr === 7001, 'by name');
  assert.ok(findStar('Alp CMa') === findStar('alp cma'), 'case-insensitive bf');
  // no empty labels even for rows without a Bayer/Flamsteed id
  for (const s of STARS) assert.ok(starLabel(s).length > 0, 'label for HR ' + s.hr);
  assert.ok(starLabel({ hr: 5958, mag: 2 }) === 'HR 5958', 'HR fallback');
});

test('constellation figures reference valid stars', () => {
  assert.strictEqual(CONSTELLATIONS.length, 88);
  for (const c of CONSTELLATIONS) {
    for (const [a, b] of c.lines) {
      assert.ok(c.stars[a] && c.stars[b], `${c.name}: line [${a},${b}]`);
    }
  }
});

test('visibleSky: physical sanity for a known configuration', () => {
  const t = Instant.fromISO('2026-07-24T16:45:13Z'); // 01:45 JST, night
  const tokyo = observer({ latitude: 35.681, longitude: 139.767, height: 40 });
  const scene = visibleSky(tokyo, t, { minElevation: 10, maxMagnitude: 2.5 });

  assert.strictEqual(scene.conditions.phase, 'night');
  assert.ok(scene.conditions.sun_elevation_deg < -18);

  // Polaris sits at an elevation equal to the observer's latitude
  const polaris = scene.visible.bright_stars.find((s) => s.name === 'Polaris');
  assert.ok(polaris, 'Polaris present');
  assert.ok(Math.abs(polaris.elevation_deg - 35.681) < 1.0, 'Polaris el ' + polaris.elevation_deg);
  assert.ok(polaris.direction === 'N', 'Polaris due north');

  // every listed object clears the horizon cut, stars sorted by magnitude
  for (const s of scene.visible.bright_stars) assert.ok(s.elevation_deg >= 10);
  for (const p of scene.visible.planets) assert.ok(p.elevation_deg >= 10);
  for (let i = 1; i < scene.visible.bright_stars.length; i++) {
    assert.ok(scene.visible.bright_stars[i].magnitude >= scene.visible.bright_stars[i - 1].magnitude);
  }
  // the Moon is reported whether up or not, with a phase and illumination
  assert.ok(scene.visible.moon.phase && scene.visible.moon.illumination >= 0);
  assert.ok(scene.highlights.length > 0);
});

if (failures > 0) {
  console.error(failures + ' sky test(s) failed');
  process.exit(1);
}
console.log('all sky tests passed');
