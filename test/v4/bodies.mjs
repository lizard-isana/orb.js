// v4 bodies test suite. Run with: node test/v4/bodies.mjs
//
// Verification strategy (DESIGN.md section 6): the full-series data must
// reproduce v3's VSOP output exactly (same coefficients, so any
// difference is a compiler bug); the truncated default must stay within
// its advertised 0.1 arcsec; the Moon must reproduce Meeus example 47.a;
// analytic velocities must match numerical differentiation.
import assert from 'assert';
import { createRequire } from 'module';

import { Instant } from '../../src/time/instant.js';
import { DEG, ARCSEC } from '../../src/math/angles.js';
import { transform } from '../../src/frames/frames.js';
import { nutation } from '../../src/frames/nutation.js';
import { makeVsopBody, AU_KM } from '../../src/bodies/vsop.js';
import { mercury } from '../../src/bodies/mercury.js';
import { venus } from '../../src/bodies/venus.js';
import { earth } from '../../src/bodies/earth.js';
import { mars } from '../../src/bodies/mars.js';
import { jupiter } from '../../src/bodies/jupiter.js';
import { saturn } from '../../src/bodies/saturn.js';
import { uranus } from '../../src/bodies/uranus.js';
import { neptune } from '../../src/bodies/neptune.js';
import { sun } from '../../src/bodies/sun.js';
import { moon } from '../../src/bodies/moon.js';
import { sunPosition } from '../../examples/sun-in-50-lines.mjs';
import * as MARS_FULL from '../../src/bodies/data/vsop87a-mars.full.js';
import * as EARTH_FULL from '../../src/bodies/data/vsop87a-earth.full.js';

const require = createRequire(import.meta.url);
const Orb = require('../../dist/orb.js'); // frozen v3 build

let failed = 0;
const test = (name, fn) => {
  try {
    fn();
    console.log('ok - ' + name);
  } catch (e) {
    failed++;
    console.error('NG - ' + name + ': ' + e.message);
  }
};

const PLANETS = { mercury, venus, earth, mars, jupiter, saturn, uranus, neptune };
const V3_NAMES = {
  mercury: 'Mercury', venus: 'Venus', earth: 'Earth', mars: 'Mars',
  jupiter: 'Jupiter', saturn: 'Saturn', uranus: 'Uranus', neptune: 'Neptune'
};
const MIN_GEO_DIST = {
  mercury: 0.52, venus: 0.26, earth: 1.0, mars: 0.37,
  jupiter: 3.9, saturn: 8.0, uranus: 17.3, neptune: 28.8
};

const SAMPLE_DATES = [
  '1960-03-01T00:00:00Z', '1987-04-10T19:21:00Z', '2000-01-01T12:00:00Z',
  '2026-07-18T00:00:00Z', '2049-12-31T18:00:00Z'
];

test('full series reproduces v3 VSOP exactly (compiler check)', () => {
  const fullMars = makeVsopBody('mars', MARS_FULL);
  const fullEarth = makeVsopBody('earth', EARTH_FULL);
  for (const iso of SAMPLE_DATES) {
    const t = Instant.fromISO(iso);
    const date = t.toDate();
    for (const [body, v3name] of [[fullMars, 'Mars'], [fullEarth, 'Earth']]) {
      const v4 = body.state(t);
      const v3 = v3name === 'Earth' ? new Orb.Earth().xyz(date) : new Orb.Mars().xyz(date);
      for (const [i, k] of [[0, 'x'], [1, 'y'], [2, 'z']]) {
        assert.ok(Math.abs(v4.r[i] / AU_KM - v3[k]) < 1e-11, `${v3name} ${iso} ${k}`);
      }
    }
  }
});

test('truncated default stays within 0.1 arcsec of the full series', () => {
  // Spot-checked on mars (tight tolerance) and earth, whose error
  // propagates into every geocentric position.
  const cases = [
    ['mars', makeVsopBody('mars', MARS_FULL), mars],
    ['earth', makeVsopBody('earth', EARTH_FULL), earth]
  ];
  for (const [name, full, short] of cases) {
    for (const iso of SAMPLE_DATES) {
      const t = Instant.fromISO(iso);
      const a = full.state(t).r;
      const b = short.state(t).r;
      const diffKm = Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
      const angle = diffKm / (MIN_GEO_DIST[name] * AU_KM); // worst-case view from Earth
      assert.ok(angle < 0.1 * ARCSEC, `${name} ${iso}: ${(angle / ARCSEC).toFixed(3)}"`);
    }
  }
});

test('all planets return finite heliocentric states at plausible distances', () => {
  const RANGE_AU = {
    mercury: [0.30, 0.47], venus: [0.71, 0.73], earth: [0.98, 1.02],
    mars: [1.38, 1.67], jupiter: [4.9, 5.5], saturn: [9.0, 10.1],
    uranus: [18.2, 20.1], neptune: [29.8, 30.4]
  };
  const t = Instant.fromISO('2026-07-18T00:00:00Z');
  for (const [name, body] of Object.entries(PLANETS)) {
    const s = body.state(t);
    const dist = Math.hypot(s.r[0], s.r[1], s.r[2]) / AU_KM;
    const [lo, hi] = RANGE_AU[name];
    assert.ok(dist > lo && dist < hi, `${name}: ${dist} au`);
    assert.strictEqual(s.frame, 'ecliptic-j2000');
    assert.strictEqual(s.center, 'sun');
  }
});

test('analytic velocity matches numerical differentiation', () => {
  const t = Instant.fromISO('2026-07-18T00:00:00Z');
  const h = 60; // seconds
  for (const body of [earth, mars, jupiter]) {
    const s = body.state(t);
    const before = body.state(t.addSeconds(-h)).r;
    const after = body.state(t.addSeconds(h)).r;
    for (let i = 0; i < 3; i++) {
      const numeric = (after[i] - before[i]) / (2 * h);
      assert.ok(Math.abs(s.v[i] - numeric) < 1e-6, `${body.name} v[${i}]`);
    }
  }
  const speed = Math.hypot(...earth.state(t).v);
  assert.ok(speed > 29.2 && speed < 30.3, 'earth speed ' + speed);
});

test('sun is minus the earth, geocentric', () => {
  const t = Instant.fromISO('2026-07-18T00:00:00Z');
  const s = sun.state(t);
  const e = earth.state(t);
  for (let i = 0; i < 3; i++) {
    assert.strictEqual(s.r[i], -e.r[i]);
    assert.strictEqual(s.v[i], -e.v[i]);
  }
  assert.strictEqual(s.center, 'earth');
  const distAu = Math.hypot(...s.r) / AU_KM;
  assert.ok(Math.abs(distAu - 1.0163) < 0.001, 'aphelion-season distance ' + distAu);
});

test('sun agrees with the v3 apparent solar theory', () => {
  // v3's independent Meeus solar theory (of-date apparent RA/Dec) is a
  // cross-check from a different derivation; agreement is bounded by
  // that theory's ~0.01 deg accuracy class.
  const t = Instant.fromISO('2026-07-18T00:00:00Z');
  const eq = transform(sun.state(t), { frame: 'equatorial-of-date' });
  const ra = Math.atan2(eq.r[1], eq.r[0]);
  const dec = Math.asin(eq.r[2] / Math.hypot(...eq.r));
  const v3 = new Orb.Sun().radec(t.toDate()); // ra hours, dec deg
  const dRa = Math.abs(ra / DEG / 15 - v3.ra) * 15 * Math.cos(dec);
  const dDec = Math.abs(dec / DEG - v3.dec);
  assert.ok(dRa < 0.01, 'dRA deg=' + dRa);
  assert.ok(dDec < 0.01, 'dDec deg=' + dDec);
});

test('moon reproduces Meeus example 47.a', () => {
  // 1992 Apr 12.0 TD; TT-UTC was 58.184 s
  const t = Instant.fromJD(2448724.5, 'tt');
  const m = moon.latlng(t);
  // Meeus (with the full 1980 nutation): apparent longitude 133.167265,
  // latitude -3.229126, distance 368409.7 km. Our nutation is IAU 2000B,
  // so the longitude tolerance is a fraction of an arcsecond.
  assert.ok(Math.abs(m.longitude / DEG - 133.167265) * 3600 < 0.5, 'lon ' + m.longitude / DEG);
  assert.ok(Math.abs(m.latitude / DEG - (-3.229126)) * 3600 < 0.1, 'lat ' + m.latitude / DEG);
  assert.ok(Math.abs(m.distance - 368409.7) < 0.5, 'dist ' + m.distance);
});

test('moon agrees with v3: geometry exactly, longitude to the nutation models', () => {
  // v4 and v3 share the same Meeus series, so the GEOMETRIC longitude
  // (apparent minus each side's own nutation) must match at rounding
  // level; the apparent longitudes differ by exactly
  // dpsi(IAU 2000B) - dpsi(v3's 4-term approximation), up to ~3".
  const nut4term = (t) => { // v3's truncated nutation, arcseconds
    const T = t.julianCenturies();
    const om = (125.04452 - 1934.136261 * T + 0.0020708 * T * T + T ** 3 / 450000) * DEG;
    const L0 = (280.4665 + 36000.7698 * T) * DEG;
    const L1 = (218.3165 + 481267.8813 * T) * DEG;
    return -17.20 * Math.sin(om) + 1.32 * Math.sin(2 * L0)
      - 0.23 * Math.sin(2 * L1) + 0.21 * Math.sin(2 * om);
  };
  for (const iso of SAMPLE_DATES) {
    const t = Instant.fromISO(iso);
    const m = moon.latlng(t);
    const v3 = new Orb.Luna().latlng(t.toDate()); // degrees, km
    const geoV4 = m.longitude / DEG - (nutation(t).dpsi / DEG);
    const geoV3 = v3.longitude - nut4term(t) / 3600;
    assert.ok(Math.abs(geoV4 - geoV3) * 3600 < 0.01, iso + ' geometric lon');
    assert.ok(Math.abs(m.longitude / DEG - v3.longitude) * 3600 < 3.5, iso + ' apparent lon');
    assert.ok(Math.abs(m.latitude / DEG - v3.latitude) * 3600 < 0.5, iso + ' lat');
    assert.ok(Math.abs(m.distance - v3.distance) < 0.5, iso + ' dist');
  }
});

test('moon state is a well-formed of-date geocentric vector', () => {
  const t = Instant.fromISO('2026-07-18T00:00:00Z');
  const s = moon.state(t);
  assert.strictEqual(s.frame, 'ecliptic-of-date');
  assert.strictEqual(s.center, 'earth');
  const d = Math.hypot(...s.r);
  assert.ok(d > 356000 && d < 407000, 'distance ' + d);
  // and it can ride the frame graph
  const eq = transform(s, { frame: 'equatorial-of-date' });
  assert.ok(Number.isFinite(eq.r[0]));
});

test('the 50-line example agrees with the library', () => {
  // The educational example (examples/sun-in-50-lines.mjs) claims ~0.01
  // deg; hold it to that against the VSOP-derived sun.
  const date = new Date(Date.UTC(2026, 6, 18, 0, 0, 0));
  const ex = sunPosition(date);
  const eq = transform(sun.state(Instant.fromDate(date)), { frame: 'equatorial-of-date' });
  const ra = ((Math.atan2(eq.r[1], eq.r[0]) / DEG / 15) + 24) % 24;
  const dec = Math.asin(eq.r[2] / Math.hypot(...eq.r)) / DEG;
  assert.ok(Math.abs(ex.ra - ra) * 15 < 0.01, 'RA diff deg=' + Math.abs(ex.ra - ra) * 15);
  assert.ok(Math.abs(ex.dec - dec) < 0.01, 'Dec diff deg=' + Math.abs(ex.dec - dec));
});

if (failed > 0) {
  console.error(failed + ' test(s) failed');
  process.exit(1);
}
console.log('all v4 body tests passed');
