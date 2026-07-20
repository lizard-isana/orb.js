// v4 observer test suite. Run with: node test/v4/observer.mjs
//
// The pipeline corrections are checked against the physical constants
// they must reproduce (aberration constant 20.5", lunar light-time 0.7",
// parallax * cos(el) identity, horizon refraction ~0.48 deg) and against
// the frozen v3 build with every difference accounted for by a named
// model change. JPL Horizons topocentric values are pinned in
// horizons-ref.mjs when available.
import assert from 'assert';
import { createRequire } from 'module';

import { Instant } from '../../src/time/instant.js';
import { DEG, ARCSEC } from '../../src/math/angles.js';
import { moon } from '../../src/bodies/moon.js';
import { sun } from '../../src/bodies/sun.js';
import { mars } from '../../src/bodies/mars.js';
import { apparentGeocentric } from '../../src/observer/apparent.js';
import { refraction } from '../../src/observer/refraction.js';
import { observer } from '../../src/observer/observer.js';
import { transform } from '../../src/frames/frames.js';
import { matVec } from '../../src/math/vec3.js';
import { enuMatrix, enuToAzEl } from '../../src/frames/geodetic.js';

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

const T0 = Instant.fromISO('2026-07-18T12:00:00Z');
const TOKYO = observer({ latitude: 35.658, longitude: 139.741, height: 25 });

const angleBetween = (a, b) => {
  const dot = (a[0] * b[0] + a[1] * b[1] + a[2] * b[2]) /
    (Math.hypot(...a) * Math.hypot(...b));
  return Math.acos(Math.min(1, Math.max(-1, dot)));
};

test('aberration: the sun lands 20.5 arcsec behind its geometric place', () => {
  const apparent = apparentGeocentric(sun, T0);
  const geometric = apparentGeocentric(sun, T0, { lightTime: false });
  const shift = angleBetween(apparent.r, geometric.r) / ARCSEC;
  assert.ok(Math.abs(shift - 20.5) < 0.5, 'shift=' + shift + '"');
});

test('light time: the moon trails its geometric place by ~0.7 arcsec', () => {
  const apparent = apparentGeocentric(moon, T0);
  const geometric = apparentGeocentric(moon, T0, { lightTime: false });
  const shift = angleBetween(apparent.r, geometric.r) / ARCSEC;
  assert.ok(shift > 0.4 && shift < 1.0, 'shift=' + shift + '"');
});

test('planetary aberration for mars has the expected magnitude', () => {
  const apparent = apparentGeocentric(mars, T0);
  const geometric = apparentGeocentric(mars, T0, { lightTime: false });
  const shift = angleBetween(apparent.r, geometric.r) / ARCSEC;
  // light-time + annual aberration for an outer planet: tens of arcsec
  assert.ok(shift > 5 && shift < 60, 'shift=' + shift + '"');
});

test('parallax: elevation drop equals parallax * cos(elevation)', () => {
  const t = T0;
  const obs = TOKYO.observe(moon, t);
  // Geocentric elevation: run the same ENU geometry on the geocentric
  // vector WITHOUT subtracting the site — the difference from the
  // topocentric elevation is the diurnal parallax.
  const g = apparentGeocentric(moon, t);
  const gEcef = transform(g, { frame: 'ecef' });
  const site = { latitude: 35.658 * DEG, longitude: 139.741 * DEG, height: 0.025 };
  const geoAzEl = enuToAzEl(matVec(enuMatrix(site), gEcef.r));
  const horizontalParallax = Math.asin(6378.137 / Math.hypot(...g.r));
  const drop = geoAzEl.elevation - obs.elevation * DEG;
  const expected = horizontalParallax * Math.cos(obs.elevation * DEG);
  assert.ok(Math.abs(drop - expected) < 20 * ARCSEC,
    'drop=' + drop / DEG + ' expected=' + expected / DEG);
});

test('moon az/el agrees with v3 within the explained model differences', () => {
  // v3 (after its 2026-07 review) applies TT, parallax and 4-term
  // nutation but no light time; remaining gap: nutation model (~2") +
  // lunar light time (~0.7") + IAU76/2006 precession residuals.
  const v4 = TOKYO.observe(moon, T0);
  const v3 = new Orb.Observation({
    observer: { latitude: 35.658, longitude: 139.741, altitude: 0.025 },
    target: new Orb.Luna()
  }).azel(T0.toDate());
  const dAz = Math.abs(v4.azimuth - v3.azimuth) * Math.cos(v4.elevation * DEG) * 3600;
  const dEl = Math.abs(v4.elevation - v3.elevation) * 3600;
  assert.ok(dAz < 10, 'dAz arcsec=' + dAz);
  assert.ok(dEl < 10, 'dEl arcsec=' + dEl);
});

test('mars az/el: v3 matches only once light time is disabled', () => {
  const v3 = new Orb.Observation({
    observer: { latitude: 35.658, longitude: 139.741, altitude: 0.025 },
    target: new Orb.Mars()
  }).azel(T0.toDate());
  const withoutLT = TOKYO.observe(mars, T0, { lightTime: false });
  const withLT = TOKYO.observe(mars, T0);
  const d = (a) => Math.hypot(
    (a.azimuth - v3.azimuth) * Math.cos(a.elevation * DEG),
    a.elevation - v3.elevation
  ) * 3600;
  assert.ok(d(withoutLT) < 10, 'geometric gap arcsec=' + d(withoutLT));
  assert.ok(d(withLT) > 5 && d(withLT) < 60, 'apparent gap arcsec=' + d(withLT));
});

test('refraction: horizon value, high-altitude falloff, pressure scaling', () => {
  const atHorizon = refraction(0) / DEG;
  assert.ok(Math.abs(atHorizon - 0.48) < 0.03, 'horizon=' + atHorizon);
  const at45 = refraction(45 * DEG) / DEG;
  assert.ok(at45 > 0.012 && at45 < 0.02, 'at45=' + at45);
  const thin = refraction(0, { pressure: 505, temperature: 10 });
  assert.ok(Math.abs(thin / refraction(0) - 0.5) < 0.01, 'pressure scaling');
});

test('observe: refraction is opt-in and reported', () => {
  const plain = TOKYO.observe(sun, T0);
  assert.strictEqual(plain.refraction, 0);
  const refracted = TOKYO.observe(sun, T0, { refraction: {} });
  assert.ok(refracted.refraction > 0);
  assert.ok(Math.abs((refracted.elevation - plain.elevation) - refracted.refraction) < 1e-12);
});

test('observe: output ranges and units are sane', () => {
  const obs = TOKYO.observe(moon, T0);
  assert.ok(obs.azimuth >= 0 && obs.azimuth < 360);
  assert.ok(obs.elevation > -90 && obs.elevation < 90);
  assert.ok(obs.ra >= 0 && obs.ra < 360, 'ra in degrees');
  assert.ok(Math.abs(obs.dec) <= 90);
  assert.ok(obs.range > 350000 && obs.range < 410000, 'range km');
  assert.ok(Math.abs(obs.range - obs.distance) < 6378.2, 'topo vs geo distance');
});

if (failed > 0) {
  console.error(failed + ' test(s) failed');
  process.exit(1);
}
console.log('all v4 observer tests passed');
