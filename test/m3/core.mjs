import assert from 'assert';
import { createRequire } from 'module';
import fs from 'fs';

import {
  adaptLegacyMoon,
  adaptLegacyPlanet,
  ARCSEC,
  DEG,
  makeState,
  transform
} from '../../src/frames/index.js';
import { ecefVectorToEnu, enuToHorizontal } from '../../src/geodesy/index.js';
import { sunEpv00 } from '../../src/models/earth-epv00/index.js';
import {
  atmosphericRefraction,
  createObserver,
  geocentricState,
  OBSERVER_DEFAULTS
} from '../../src/observer/index.js';
import { Instant } from '../../src/time/index.js';
import { MARS_FULL_COEF } from '../../src/vsop87a/mars.js';

const require = createRequire(import.meta.url);
const Orb = require('../../dist/orb.js');
const horizons = JSON.parse(fs.readFileSync(
  new URL('../fixtures/horizons-topocentric-tokyo-2026-07-18.json', import.meta.url),
  'utf8'
));
const tests = [];

function test(name, run) {
  tests.push({ name, run });
}

function angleDifference(actual, expected) {
  return ((actual - expected + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
}

function angularSeparation(actualLongitude, actualLatitude, expectedLongitude, expectedLatitude) {
  return Math.hypot(
    angleDifference(actualLongitude, expectedLongitude) * Math.cos(expectedLatitude),
    actualLatitude - expectedLatitude
  );
}

function angleBetween(a, b) {
  const cosine = (
    a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
  ) / (Math.hypot(...a) * Math.hypot(...b));
  return Math.acos(Math.max(-1, Math.min(1, cosine)));
}

const location = Object.freeze({
  latitude: horizons.site.latitudeDeg * DEG,
  longitude: horizons.site.longitudeDeg * DEG,
  height: horizons.site.altitudeKm
});
const tokyo = createObserver(location);
const moon = adaptLegacyMoon(new Orb.Luna());
Orb.registerVSOP87A('Mars', MARS_FULL_COEF);
const mars = adaptLegacyPlanet(new Orb.Mars({ vsop87a: 'full' }), { name: 'mars' });

test('the omitted third argument is the explicit geometric, airless default', () => {
  assert.deepStrictEqual(OBSERVER_DEFAULTS, {
    frameModel: 'iau2006-2000b',
    lightTime: false,
    aberration: false,
    refraction: false,
    meta: false
  });
  const instant = Instant.fromISO('2026-07-18T12:00:00Z');
  const omitted = tokyo.observe(moon, instant);
  const explicit = tokyo.observe(moon, instant, { ...OBSERVER_DEFAULTS });
  assert.deepStrictEqual(omitted, explicit);
  assert.strictEqual(omitted.refraction, 0);
  assert.strictEqual(omitted.meta, undefined);
  assert.ok(Math.abs(omitted.range - omitted.geocentricDistance) > 1);
  assert.ok(Math.abs(omitted.range - omitted.geocentricDistance) < 6378.2);
});

test('light time and annual aberration are independently selectable', () => {
  const instant = Instant.fromISO('2026-07-18T12:00:00Z');
  const geometric = geocentricState(mars, instant);
  const lightTime = geocentricState(mars, instant, { lightTime: true });
  const aberration = geocentricState(mars, instant, { aberration: true });
  const apparent = geocentricState(mars, instant, { lightTime: true, aberration: true });
  assert.ok(angleBetween(geometric.r, lightTime.r) > ARCSEC);
  assert.ok(angleBetween(geometric.r, aberration.r) > ARCSEC);
  assert.ok(angleBetween(lightTime.r, apparent.r) > ARCSEC);
  assert.deepStrictEqual(lightTime.corrections, ['light-time']);
  assert.deepStrictEqual(aberration.corrections, ['aberration-annual']);
  assert.deepStrictEqual(apparent.corrections, ['light-time', 'aberration-annual']);
});

test('diurnal parallax is common-frame vector subtraction', () => {
  const instant = Instant.fromISO('2026-07-18T12:00:00Z');
  const geocentric = geocentricState(moon, instant);
  const observed = tokyo.observe(moon, instant);
  const geocentricEcef = transform(geocentric, { frame: 'ecef' });
  const fromCenter = enuToHorizontal(ecefVectorToEnu(geocentricEcef.r, location));
  const horizontalParallax = Math.asin(6378.137 / Math.hypot(...geocentric.r));
  const elevationDrop = fromCenter.elevation - observed.elevation;
  const expected = horizontalParallax * Math.cos(observed.elevation);
  assert.ok(Math.abs(elevationDrop - expected) < 25 * ARCSEC);
  assert.ok(Math.abs(observed.range - fromCenter.range) < 6378.2);
});

test('refraction is opt-in, weather-dependent, and reported separately', () => {
  const instant = Instant.fromISO('2026-07-18T00:00:00Z');
  const geometric = tokyo.observe(sunEpv00, instant, { aberration: true });
  const refracted = tokyo.observe(sunEpv00, instant, {
    aberration: true,
    refraction: { pressure: 1010, temperature: 10 }
  });
  assert.strictEqual(geometric.refraction, 0);
  assert.ok(refracted.refraction > 0);
  assert.ok(Math.abs(refracted.elevation - geometric.elevation - refracted.refraction) < 1e-14);
  const horizon = atmosphericRefraction(0, { pressure: 1010, temperature: 10 });
  const lowPressure = atmosphericRefraction(0, { pressure: 505, temperature: 10 });
  assert.ok(Math.abs(horizon / DEG - 0.48) < 0.03);
  assert.ok(Math.abs(lowPressure / horizon - 0.5) < 1e-14);
});

test('structured metadata identifies values, corrections, sources, and ignored effects', () => {
  const instant = Instant.fromISO('2026-07-18T00:00:00Z');
  const result = tokyo.observe(sunEpv00, instant, { aberration: true, meta: true });
  assert.strictEqual(result.meta.quantities.azimuth.quantity, 'azimuth');
  assert.strictEqual(result.meta.quantities.azimuth.unit, 'radian');
  assert.strictEqual(result.meta.quantities.range.center, 'observer');
  assert.strictEqual(result.meta.quantities.geocentricDistance.center, 'earth');
  assert.deepStrictEqual(
    result.meta.quantities.elevation.corrections,
    ['aberration-annual', 'parallax-diurnal']
  );
  assert.ok(result.meta.source.includes('erfa-epv00'));
  assert.ok(result.meta.source.includes('iau2006-precession'));
  assert.ok(result.meta.ignoredEffects.includes('light-time'));
  assert.ok(result.meta.ignoredEffects.includes('refraction'));
});

test('Horizons Moon, Sun, and Mars topocentric fixtures meet M3 tolerances', () => {
  const bodies = { moon, sun: sunEpv00, mars };
  const options = {
    moon: { lightTime: true, aberration: true },
    sun: { lightTime: true, aberration: true },
    mars: { lightTime: true, aberration: true }
  };
  for (const [name, rows] of Object.entries(horizons.bodies)) {
    const tolerance = horizons.tolerance.bodies[name];
    for (const expected of rows) {
      const actual = tokyo.observe(bodies[name], Instant.fromISO(expected.utc), options[name]);
      const expectedRightAscension = expected.raDeg * DEG;
      const expectedDeclination = expected.decDeg * DEG;
      const expectedAzimuth = expected.azDeg * DEG;
      const expectedElevation = expected.elDeg * DEG;
      const equatorialResidual = angularSeparation(
        actual.rightAscension,
        actual.declination,
        expectedRightAscension,
        expectedDeclination
      ) / ARCSEC;
      const horizontalResidual = angularSeparation(
        actual.azimuth,
        actual.elevation,
        expectedAzimuth,
        expectedElevation
      ) / ARCSEC;
      const rangeResidual = Math.abs(actual.range - expected.rangeAu * 149597870.7);
      assert.ok(
        equatorialResidual < tolerance.modernSkyArcsec,
        `${name} ${expected.utc} equatorial residual=${equatorialResidual} arcsec`
      );
      assert.ok(
        horizontalResidual < tolerance.modernSkyArcsec,
        `${name} ${expected.utc} horizontal residual=${horizontalResidual} arcsec`
      );
      assert.ok(
        rangeResidual < tolerance.modernRangeKm,
        `${name} ${expected.utc} range residual=${rangeResidual} km`
      );
    }
  }
});

test('invalid model and option combinations fail explicitly', () => {
  const instant = Instant.fromISO('2026-07-18T00:00:00Z');
  assert.throws(() => tokyo.observe(moon, instant, { frameModel: 'iau1976-1980' }), /frameModel/);
  assert.throws(() => tokyo.observe(moon, instant, { lightTime: 'yes' }), /lightTime/);
  assert.throws(() => tokyo.observe(moon, instant, { aberration: 1 }), /aberration/);
  assert.throws(() => tokyo.observe(moon, instant, { refraction: true }), /refraction/);
  assert.throws(
    () => tokyo.observe(moon, instant, { refraction: { pressure: 1010 } }),
    /temperature/
  );
  assert.throws(() => tokyo.observe(moon, instant, { typo: true }), /unknown option/);
  assert.throws(() => createObserver(location, { typo: true }), /configuration option/);
  assert.throws(() => tokyo.observe({ state: () => makeState({
    t: instant,
    frame: 'equatorial-j2000',
    center: 'observer',
    r: [1, 0, 0]
  }) }, instant), /unsupported body center/);
});

let failures = 0;
for (const { name, run } of tests) {
  try {
    await run();
    console.log(`ok - M3 ${name}`);
  } catch (error) {
    failures++;
    console.error(`NG - M3 ${name}: ${error.stack ?? error.message}`);
  }
}

Orb.unregisterVSOP87A('Mars');
if (failures > 0) {
  console.error(`${failures} of ${tests.length} M3 test(s) failed`);
  process.exitCode = 1;
} else {
  console.log('all M3 tests passed');
}
