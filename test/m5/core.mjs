import assert from 'assert';
import { createRequire } from 'module';

import { satellitePasses } from '../../src/events/index.js';
import { DEG, transform } from '../../src/frames/index.js';
import { ecefToGeodetic } from '../../src/geodesy/index.js';
import { createObserver } from '../../src/observer/index.js';
import {
  createSatellite,
  normalizeOmm,
  parseCatalogNumber,
  parseImpliedDecimal,
  parseOmm,
  parseTle,
  tleChecksumStatus,
  tleToOmm,
  validateTleChecksum
} from '../../src/sgp4/index.js';
import { AstroInstant } from '../../src/time/index.js';

const require = createRequire(import.meta.url);
const Orb = require('../../dist/orb.js');
const { loadReferenceFixture } = require('../helpers/reference-fixture.js');
const sgp4Fixture = loadReferenceFixture('python-sgp4-2.27.json');
const passFixture = loadReferenceFixture('orb-v3-iss-passes-tokyo-2020.json');
const issCase = sgp4Fixture.cases.find((entry) => entry.id === 'iss-near-earth');
const issTle = Object.freeze({
  name: 'ISS',
  line1: issCase.line1,
  line2: issCase.line2
});
const tests = [];

function test(name, run) {
  tests.push({ name, run });
}

function distance(left, right) {
  return Math.hypot(
    left[0] - right[0],
    left[1] - right[1],
    left[2] - right[2]
  );
}

test('pure TLE parsing preserves epoch precision and labels mean elements', () => {
  const elements = parseTle(issTle);
  const expectedEpoch = Date.UTC(2020, 0, 1) + (14.52632156 - 1) * 86400000;
  assert.ok(Math.abs(elements.epoch.utcMs - expectedEpoch) < 0.001);
  assert.strictEqual(elements.catalogNumber, 25544);
  assert.strictEqual(elements.elementType, 'sgp4-mean-elements');
  assert.strictEqual(elements.bstarType, 'sgp4-drag-term');
  assert.strictEqual(elements.gravityModel, 'wgs72');
  assert.ok(Math.abs(elements.bstar - 1.027e-4) < 1e-12);
  assert.strictEqual(elements.meanMotionDdot, 0);
  assert.strictEqual(parseCatalogNumber('E7527'), 147527);
  assert.ok(Number.isNaN(parseCatalogNumber('I0000')));
  assert.ok(Math.abs(parseImpliedDecimal('-12345', '-4') - (-0.12345e-4)) < 1e-18);
});

test('TLE line identity, fixed fields, and opt-in checksums fail explicitly', () => {
  const status = tleChecksumStatus(issTle);
  assert.strictEqual(status.line1.valid, true);
  assert.strictEqual(status.line2.valid, true);
  assert.strictEqual(validateTleChecksum(issTle), true);

  const wrongChecksum = {
    ...issTle,
    line1: `${issTle.line1.slice(0, 68)}0`
  };
  assert.strictEqual(parseTle(wrongChecksum).catalogNumber, 25544);
  assert.throws(() => validateTleChecksum(wrongChecksum), /line 1 checksum mismatch/);
  assert.throws(
    () => parseTle(wrongChecksum, { validateChecksum: true }),
    /line 1 checksum mismatch/
  );

  const mismatched = {
    ...issTle,
    line2: `${issTle.line2.slice(0, 2)}12345${issTle.line2.slice(7)}`
  };
  assert.throws(() => parseTle(mismatched), /catalogue numbers do not match/);
  assert.throws(() => parseTle({ line1: '1 short', line2: issTle.line2 }), /69 columns/);
  assert.throws(
    () => parseTle({ ...issTle, typo: true }, { typo: true }),
    /unknown TLE option/
  );
});

test('signed implied decimals are shared by structured and legacy parsing', () => {
  const negative = {
    first_line: '1 25544U 98067A   20014.52632156  .00016717 -12345-4 -23456-3 0  9015',
    second_line: issTle.line2
  };
  const structured = parseTle(negative);
  const legacy = new Orb.SGP4(negative);
  assert.ok(Math.abs(structured.meanMotionDdot - (-0.12345e-4)) < 1e-14);
  assert.ok(Math.abs(structured.bstar - (-0.23456e-3)) < 1e-14);
  assert.strictEqual(legacy.DecodeTLE().second_derivative_mean_motion, structured.meanMotionDdot);
  assert.strictEqual(legacy.DecodeTLE().bstar, structured.bstar);
});

test('TLE and OMM normalize to equivalent structured satellites', () => {
  const omm = tleToOmm(issTle);
  assert.strictEqual(omm.USER_DEFINED_TLE_LINE1, issTle.line1);
  assert.strictEqual(omm.USER_DEFINED_TLE_LINE2, issTle.line2);
  assert.strictEqual(omm.MEAN_ELEMENT_THEORY, 'SGP4');
  assert.strictEqual(omm.EPOCH, '2020-01-14T12:37:54.182784');
  assert.strictEqual(normalizeOmm(omm).NORAD_CAT_ID, 25544);
  assert.strictEqual(parseOmm(omm).catalogNumber, 25544);

  const fromTle = createSatellite(issTle);
  const fromOmm = createSatellite(omm);
  const instant = fromTle.elements.epoch.addSeconds(3600);
  assert.ok(distance(fromTle.state(instant).r, fromOmm.state(instant).r) < 1e-8);
  assert.deepStrictEqual(fromOmm.tle, {
    name: 'ISS',
    line1: issTle.line1,
    line2: issTle.line2
  });
  assert.throws(
    () => parseOmm({ ...omm, REF_FRAME: 'GCRF' }),
    /REF_FRAME must be 'TEME'/
  );
});

test('OMM and CelesTrak GP JSON accept nine-digit catalogue numbers', () => {
  const gp = {
    OBJECT_NAME: 'NINE DIGIT TEST',
    EPOCH: '2026-07-18T00:00:00.000000',
    MEAN_MOTION: 15,
    ECCENTRICITY: 0.001,
    INCLINATION: 51.6,
    RA_OF_ASC_NODE: 20,
    ARG_OF_PERICENTER: 30,
    MEAN_ANOMALY: 40,
    NORAD_CAT_ID: 799500001,
    BSTAR: 0
  };
  assert.strictEqual(normalizeOmm({ ...gp, CCSDS_OMM_VERS: '2.0' }).NORAD_CAT_ID, 799500001);
  const satellite = createSatellite(gp);
  assert.strictEqual(satellite.elements.sourceFormat, 'celestrak-gp-json');
  assert.strictEqual(satellite.elements.catalogNumber, 799500001);
  assert.ok([...satellite.state(satellite.elements.epoch).r].every(Number.isFinite));
});

test('structured SGP4 uses UTC-like elapsed seconds across a leap boundary', () => {
  const tle = {
    line1: '1 25544U 98067A   16366.99998843  .00016717  00000-0  10270-3 0  9015',
    line2: issTle.line2
  };
  const structured = createSatellite(tle);
  const legacy = new Orb.SGP4({ first_line: tle.line1, second_line: tle.line2 });
  const instant = structured.elements.epoch.addSeconds(120);
  const modernState = structured.state(instant);
  const legacyState = legacy.xyz(instant.toDate());
  assert.ok(distance(modernState.r, [legacyState.x, legacyState.y, legacyState.z]) < 1e-6);
});

test('structured near-Earth and deep-space propagation matches python-sgp4', () => {
  for (const referenceCase of sgp4Fixture.cases) {
    const satellite = createSatellite({
      line1: referenceCase.line1,
      line2: referenceCase.line2
    });
    assert.strictEqual(satellite.satrec.method, referenceCase.expectedMethod);
    for (const expected of referenceCase.states) {
      const instant = satellite.elements.epoch.addSeconds(expected.minutesSinceEpoch * 60);
      const actual = satellite.state(instant);
      const residual = distance(actual.r, expected.positionKm);
      assert.ok(
        residual < sgp4Fixture.tolerance.positionNormKm,
        `${referenceCase.id} ${expected.minutesSinceEpoch} min residual=${residual} km`
      );
      assert.strictEqual(actual.frame, 'teme');
      assert.strictEqual(actual.center, 'earth');
      assert.ok(actual.v instanceof Float64Array);
    }
  }
});

test('Alpha-5 satellites propagate through the structured path', () => {
  const alpha5 = createSatellite({
    name: 'ALPHA5 SAT',
    line1: '1 E7527U 26100A   20014.52632156  .00016717  00000-0  10270-3 0  9015',
    line2: '2 E7527  51.6461 339.7757 0004871 129.9343 313.3229 15.49208144 10428'
  });
  assert.strictEqual(alpha5.elements.catalogNumber, 147527);
  const state = alpha5.state(AstroInstant.fromISO('2020-01-14T12:40:00Z'));
  assert.ok([...state.r, ...state.v].every(Number.isFinite));
});

test('structured geodetic output uses the common TEME/ECEF and WGS-84 path', () => {
  const satellite = createSatellite(issTle);
  const instant = AstroInstant.fromISO('2020-01-14T12:40:00Z');
  const state = satellite.state(instant);
  const ecef = transform(state, { frame: 'ecef' });
  const expected = ecefToGeodetic(ecef.r);
  const actual = satellite.geodetic(instant);
  assert.strictEqual(actual.frame, 'geodetic-wgs84');
  assert.ok(Math.abs(actual.latitude - expected.latitude) < 1e-14);
  assert.ok(Math.abs(actual.longitude - expected.longitude) < 1e-14);
  assert.ok(Math.abs(actual.height - expected.height) < 1e-12);
});

test('structured satellites integrate directly with observer and pass events', () => {
  const satellite = createSatellite(issTle);
  const site = createObserver({
    latitude: passFixture.site.latitudeDeg * DEG,
    longitude: passFixture.site.longitudeDeg * DEG,
    height: passFixture.site.heightKm
  });
  const instant = AstroInstant.fromISO('2020-01-14T12:40:00Z');
  const observed = site.observe(satellite, instant, { meta: true });
  assert.ok(Number.isFinite(observed.azimuth));
  assert.ok(Number.isFinite(observed.elevation));
  assert.ok(observed.meta.source.includes('sgp4'));

  const passes = satellitePasses(
    site,
    satellite,
    AstroInstant.fromISO('2020-01-14T00:00:00Z'),
    AstroInstant.fromISO('2020-01-16T00:00:00Z'),
    { minimumElevation: passFixture.minimumElevationDeg * DEG }
  );
  assert.strictEqual(passes.length, passFixture.events.length);
  for (let index = 0; index < passes.length; index += 1) {
    const expected = passFixture.events[index];
    assert.ok(Math.abs(passes[index].rise.instant.utcMs - Date.parse(expected.rise)) < 1000);
    assert.ok(Math.abs(passes[index].set.instant.utcMs - Date.parse(expected.set)) < 1000);
  }
});

test('structured propagation reports decayed-orbit errors while legacy contracts remain stable', () => {
  const structured = createSatellite(issTle);
  assert.throws(
    () => structured.state(AstroInstant.fromISO('2030-01-01T00:00:00Z')),
    /SGP4 propagation failed \(error 6\).*decayed/
  );

  const legacyInput = { first_line: issTle.line1, second_line: issTle.line2 };
  const legacy = new Orb.SGP4(legacyInput);
  const alias = new Orb.Satellite(legacyInput);
  const date = new Date(legacy.ParseEpoch().getTime() + 1440 * 60000);
  const expected = issCase.states[0].positionKm;
  const state = legacy.xyz(date);
  assert.ok(distance([state.x, state.y, state.z], expected) < sgp4Fixture.tolerance.positionNormKm);
  assert.strictEqual(typeof alias.xyz, 'function');
  assert.strictEqual(legacy.omm.EPOCH, '2020-01-14T12:37:54.182');
  assert.strictEqual(legacy.omm.OBJECT_ID, '1998-067A ');
  assert.strictEqual(Object.isFrozen(legacy.omm), false);
  assert.strictEqual(legacy.tle, legacyInput);
  assert.strictEqual(legacy.elements, legacyInput);

  const ommInput = tleToOmm(issTle);
  const legacyOmm = new Orb.SGP4(ommInput);
  assert.strictEqual(legacyOmm.omm, ommInput);
  assert.strictEqual(legacyOmm.tle.first_line, issTle.line1);
  assert.strictEqual(legacyOmm.tle.second_line, issTle.line2);
  assert.ok(Number.isFinite(legacyOmm.xyz(date).x));
});

let failures = 0;
for (const { name, run } of tests) {
  try {
    await run();
    console.log(`ok - M5 ${name}`);
  } catch (error) {
    failures += 1;
    console.error(`NG - M5 ${name}: ${error.stack ?? error.message}`);
  }
}

if (failures > 0) {
  console.error(`${failures} of ${tests.length} M5 test(s) failed`);
  process.exitCode = 1;
} else {
  console.log('all M5 tests passed');
}
