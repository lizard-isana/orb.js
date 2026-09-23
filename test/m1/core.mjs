import assert from 'assert';
import fs from 'fs';

import { AstroInstant, deltaT, ttMinusUtc } from '../../src/time/index.js';
import * as Frames from '../../src/frames/index.js';
import * as Geodesy from '../../src/geodesy/index.js';
import * as Vocab from '../../src/vocab/index.js';

const fixture = JSON.parse(fs.readFileSync(
  new URL('../fixtures/erfa-2.0.1.5.json', import.meta.url),
  'utf8'
));
const meeus = JSON.parse(fs.readFileSync(
  new URL('../fixtures/meeus-2ed.json', import.meta.url),
  'utf8'
));
const tests = [];

function test(name, run) {
  tests.push({ name, run });
}

function close(actual, expected, tolerance, label = '') {
  assert.ok(
    Math.abs(actual - expected) <= tolerance,
    `${label} expected ${expected}, got ${actual}, tolerance ${tolerance}`
  );
}

function vectorClose(actual, expected, tolerance, label = '') {
  assert.strictEqual(actual.length, expected.length, `${label} length`);
  for (let index = 0; index < actual.length; index++) {
    close(actual[index], expected[index], tolerance, `${label}[${index}]`);
  }
}

test('AstroInstant supports Date, ISO, Unix-ms, and UTC JD construction', () => {
  const iso = '2026-07-18T06:30:15.250Z';
  const date = new Date(iso);
  const expectedMs = date.getTime();
  const values = [
    AstroInstant.fromDate(date),
    AstroInstant.fromISO(iso),
    AstroInstant.fromISO('2026-07-18T06:30:15.250'),
    AstroInstant.fromUnixMs(expectedMs),
    AstroInstant.fromJD(2440587.5 + expectedMs / 86400000, 'utc')
  ];
  for (const value of values) close(value.utcMs, expectedMs, 0.05, 'utcMs');
});

test('AstroInstant stores TT as two parts and returns explicit time scales', () => {
  const instant = AstroInstant.fromISO('2000-01-01T12:00:00Z', { dut1: 0.3341 });
  close(instant.jd('utc'), 2451545.0, 1e-12, 'UTC');
  close(instant.jd('tt'), 2451545.0 + 64.184 / 86400, 1e-12, 'TT');
  close(instant.jd('ut1'), 2451545.0 + 0.3341 / 86400, 1e-12, 'UT1');
  const [major, minor] = instant.jd2parts('tt');
  assert.ok(Math.abs(minor) <= 0.5, 'normalized minor part');
  const roundTrip = AstroInstant.fromJD2(major, minor, 'tt', { dut1: instant.dut1 });
  close(roundTrip.utcMs, instant.utcMs, 0.05, 'TT round trip');
});

test('AstroInstant arithmetic is immutable and preserves millisecond differences', () => {
  const start = AstroInstant.fromISO('2026-07-18T00:00:00Z');
  const later = start.addSeconds(0.001).addDays(2);
  assert.ok(Object.isFrozen(start));
  assert.notStrictEqual(start, later);
  close(later.differenceSeconds(start), 172800.001, 1e-8, 'difference');
  assert.strictEqual(start.toISOString(), '2026-07-18T00:00:00.000Z');
  assert.throws(() => AstroInstant.fromISO('not-a-date'), TypeError);
  assert.throws(() => start.jd('tai'), RangeError);
  assert.throws(() => AstroInstant.fromUnixMs(start.utcMs, { dut1: 1 }), RangeError);
});

test('time scale helpers retain the legacy leap-second and Delta-T policy', () => {
  assert.strictEqual(ttMinusUtc(Date.UTC(2026, 6, 18)), 69.184);
  assert.strictEqual(ttMinusUtc(Date.UTC(1990, 5, 1)), 57.184);
  assert.strictEqual(ttMinusUtc(Date.UTC(1972, 0, 1)), 42.184);
  close(deltaT(2026, 7), 75.4, 0.1, 'Delta T');
});

test('GMST82 and GAST reproduce the Meeus sidereal-time example', () => {
  const instant = AstroInstant.fromISO(meeus.sidereal.utc);
  const radiansToSiderealSeconds = 12 / Math.PI * 3600;
  close(
    Frames.gmst82(instant) * radiansToSiderealSeconds,
    meeus.sidereal.meanHours * 3600,
    meeus.tolerance.meanSiderealSeconds,
    'GMST82'
  );
  close(
    Frames.gast(instant) * radiansToSiderealSeconds,
    meeus.sidereal.apparentHours * 3600,
    meeus.tolerance.apparentSiderealSeconds,
    'GAST'
  );
});

test('vector and matrix primitives preserve norms and invert by transpose', () => {
  const vector = Frames.vec3(1.1, -2.2, 3.3);
  const matrix = Frames.multiplyMatrices(
    Frames.rotationZ(0.7),
    Frames.multiplyMatrices(Frames.rotationY(-0.2), Frames.rotationX(0.4))
  );
  const rotated = Frames.matrixVector(matrix, vector);
  const restored = Frames.transposeMatrixVector(matrix, rotated);
  close(Frames.norm(rotated), Frames.norm(vector), 1e-14, 'norm');
  vectorClose(restored, vector, 1e-14, 'round trip');
  vectorClose(Frames.cross([1, 0, 0], [0, 1, 0]), [0, 0, 1], 0, 'cross');
  assert.throws(() => Frames.normalize([0, 0, 0]), RangeError);
  assert.throws(() => Frames.vec3(1, Number.NaN, 3), TypeError);
});

test('IAU 2000B nutation and IAU 2006 obliquity match ERFA fixtures', () => {
  for (const reference of fixture.cases) {
    const instant = AstroInstant.fromISO(reference.utc);
    const value = Frames.nutation2000B(instant);
    close(value.dpsi, reference.nut00b.dpsi, fixture.tolerance.modernAngleRad, `${reference.utc} dpsi`);
    close(value.deps, reference.nut00b.deps, fixture.tolerance.modernAngleRad, `${reference.utc} deps`);
    close(
      Frames.meanObliquity2006(instant),
      reference.obl06,
      fixture.tolerance.modernAngleRad,
      `${reference.utc} obliquity`
    );
  }
});

test('IAU 2006 precession matrices match ERFA fixtures', () => {
  for (const reference of fixture.cases.filter((item) => item.pmat06Row0)) {
    const matrix = Frames.precessionMatrix2006(AstroInstant.fromISO(reference.utc));
    vectorClose(
      matrix.slice(0, 3),
      reference.pmat06Row0,
      fixture.tolerance.modernMatrixComponent,
      reference.utc
    );
  }
});

test('IAU 2006/2000B combined matrices stay within the declared 2000A/B model difference', () => {
  const threeMilliarcseconds = 3 * Frames.ARCSEC / 1000;
  for (const reference of fixture.cases.filter((item) => item.pnm06aRow2)) {
    const matrix = Frames.precessionNutationMatrix(AstroInstant.fromISO(reference.utc));
    vectorClose(matrix.slice(6, 9), reference.pnm06aRow2, threeMilliarcseconds, reference.utc);
  }
});

test('the frame graph round-trips positions and rotating-frame velocities', () => {
  const instant = AstroInstant.fromISO('2026-07-18T12:00:00Z');
  const original = Frames.makeState({
    t: instant,
    frame: 'ecliptic-j2000',
    center: 'earth',
    r: [1234, -5678, 3456],
    v: [1, 7, 0.5]
  });
  const ecef = Frames.transform(original, { frame: 'ecef' });
  const restored = Frames.transform(ecef, { frame: original.frame });
  vectorClose(restored.r, original.r, 2e-9, 'position');
  vectorClose(restored.v, original.v, 2e-12, 'velocity');
  assert.strictEqual(restored.center, 'earth');
});

test('TEME to ECEF uses GMST82 and true-of-date to ECEF uses GAST', () => {
  const instant = AstroInstant.fromISO('2026-07-18T12:00:00Z');
  const vector = [7000, 1000, 2000];
  const teme = Frames.makeState({ t: instant, frame: 'teme', center: 'earth', r: vector });
  const trueOfDate = Frames.makeState({
    t: instant,
    frame: 'equatorial-of-date',
    center: 'earth',
    r: vector
  });
  vectorClose(
    Frames.transform(teme, { frame: 'ecef' }).r,
    Frames.matrixVector(Frames.rotationZ(Frames.gmst82(instant)), vector),
    1e-9,
    'TEME'
  );
  vectorClose(
    Frames.transform(trueOfDate, { frame: 'ecef' }).r,
    Frames.matrixVector(Frames.rotationZ(Frames.gast(instant)), vector),
    1e-9,
    'true of date'
  );
});

test('unknown frames and invalid state vectors fail explicitly', () => {
  const instant = AstroInstant.fromISO('2026-07-18T12:00:00Z');
  assert.throws(
    () => Frames.makeState({ t: instant, frame: 'unknown', center: 'earth', r: [1, 2, 3] }),
    /unknown frame/
  );
  assert.throws(
    () => Frames.makeState({ t: instant, frame: 'ecef', center: 'earth', r: [1, 2] }),
    /3-vector/
  );
  const state = Frames.makeState({ t: instant, frame: 'ecef', center: 'earth', r: [1, 2, 3] });
  assert.throws(() => Frames.transform(state, { frame: 'unknown' }), /unknown frame/);
  assert.throws(() => Frames.transform(state, { frame: 'enu' }), /observer is required/);
});

test('WGS-84 geodetic and ECEF conversion round-trips equator, Tokyo, and poles', () => {
  const cases = [
    { latitude: 0, longitude: 0, height: 0 },
    { latitude: 35.658 * Frames.DEG, longitude: 139.741 * Frames.DEG, height: 0.025 },
    { latitude: Math.PI / 2, longitude: 0, height: 1.5 },
    { latitude: -Math.PI / 2, longitude: 0, height: 0 }
  ];
  for (const geodetic of cases) {
    const restored = Geodesy.ecefToGeodetic(Geodesy.geodeticToEcef(geodetic));
    close(restored.latitude, geodetic.latitude, 1e-12, 'latitude');
    if (Math.abs(Math.cos(geodetic.latitude)) > 1e-12) {
      close(restored.longitude, geodetic.longitude, 1e-12, 'longitude');
    }
    close(restored.height, geodetic.height, 1e-9, 'height');
  }
  close(Geodesy.geodeticToEcef(cases[0])[0], Geodesy.WGS84.a, 1e-12, 'equatorial radius');
  close(
    Geodesy.geodeticToEcef({ latitude: Math.PI / 2, longitude: 0 })[2],
    Geodesy.WGS84.b,
    1e-9,
    'polar radius'
  );
  assert.throws(() => Geodesy.ecefToGeodetic([0, 0, 0]), /geocenter/);
});

test('observer ENU and horizontal conversions preserve position and direction', () => {
  const observer = {
    latitude: 35.658 * Frames.DEG,
    longitude: 139.741 * Frames.DEG,
    height: 0.025
  };
  const instant = AstroInstant.fromISO('2026-07-18T12:00:00Z');
  const expectedEnu = Geodesy.horizontalToEnu({
    azimuth: 123 * Frames.DEG,
    elevation: 28 * Frames.DEG,
    range: 1800
  });
  const ecefPosition = Geodesy.enuToEcefPosition(expectedEnu, observer);
  const ecef = Frames.makeState({
    t: instant,
    frame: 'ecef',
    center: 'earth',
    r: ecefPosition,
    v: [1, 2, 3]
  });
  const enu = Frames.transform(ecef, { frame: 'enu', observer });
  vectorClose(enu.r, expectedEnu, 2e-12, 'ENU');
  assert.strictEqual(enu.center, 'observer');
  const horizontal = Frames.toHorizontal(enu);
  close(horizontal.azimuth, 123 * Frames.DEG, 1e-14, 'azimuth');
  close(horizontal.elevation, 28 * Frames.DEG, 1e-14, 'elevation');
  close(horizontal.range, 1800, 1e-10, 'range');
  const restored = Frames.transform(enu, { frame: 'ecef', observer });
  vectorClose(restored.r, ecef.r, 1e-12, 'ECEF round trip');
  vectorClose(restored.v, ecef.v, 1e-14, 'velocity round trip');
});

test('vocabulary covers every graph frame and validates each dimension', () => {
  const lists = [
    Vocab.QUANTITIES,
    Vocab.UNITS,
    Vocab.FRAMES,
    Vocab.CENTERS,
    Vocab.CORRECTIONS,
    Vocab.EFFECTS,
    Vocab.SOURCES
  ];
  for (const list of lists) {
    assert.ok(Object.isFrozen(list));
    assert.strictEqual(new Set(list).size, list.length);
  }
  for (const frame of Frames.GRAPH_FRAMES) assert.ok(Vocab.isFrame(frame), frame);
  assert.ok(Vocab.isFrame('horizontal'));
  assert.ok(Vocab.isUnit('kilometer'));
  assert.ok(!Vocab.isUnit('km'));
  assert.strictEqual(Vocab.requireToken('source', 'wgs84'), 'wgs84');
  assert.throws(() => Vocab.requireToken('frame', 'j2000-ish'), RangeError);
  assert.throws(() => Vocab.requireToken('unknown', 'wgs84'), RangeError);
});

let failures = 0;
for (const { name, run } of tests) {
  try {
    await run();
    console.log(`ok - M1 ${name}`);
  } catch (error) {
    failures++;
    console.error(`NG - M1 ${name}: ${error.stack ?? error.message}`);
  }
}

if (failures > 0) {
  console.error(`${failures} of ${tests.length} M1 test(s) failed`);
  process.exitCode = 1;
} else {
  console.log('all M1 tests passed');
}
