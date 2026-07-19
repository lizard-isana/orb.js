// v4 test suite: time, math and frames. Run with: node test/v4/run.mjs
//
// Reference values are pinned from:
//  - ERFA 2.0.1.5 (liberfa, SOFA-derived): nut00b, obl06, pmat06, pnm06a
//  - Meeus, Astronomical Algorithms 2nd ed., examples 12.b
// and from internal consistency properties (round trips, path independence).
import assert from 'assert';
import { createRequire } from 'module';

import { Instant } from '../../src/time/instant.js';
import { ttMinusUtc, deltaT } from '../../src/time/scales.js';
import { gmst82 } from '../../src/time/sidereal.js';
import { DEG, ARCSEC, HOUR, normalizeAngle, hms, dms } from '../../src/math/angles.js';
import { rotx, rotz, matRotZ, matVec, matMul, matTVec } from '../../src/math/vec3.js';
import { nutation, meanObliquity, gast } from '../../src/frames/nutation.js';
import { precessionMatrix, precessionNutationMatrix } from '../../src/frames/precession.js';
import { makeState, transform } from '../../src/frames/frames.js';
import { geodeticToEcef, ecefToGeodetic, enuMatrix, enuToAzEl } from '../../src/frames/geodetic.js';

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

// ---------------------------------------------------------------- time

test('Instant: J2000.0 epoch', () => {
  const t = Instant.fromISO('2000-01-01T12:00:00Z');
  assert.ok(Math.abs(t.jd('utc') - 2451545.0) < 1e-9);
  assert.ok(Math.abs(t.jd('tt') - (2451545.0 + 64.184 / 86400)) < 1e-9);
});

test('Instant: sub-microsecond time resolution', () => {
  const a = Instant.fromISO('2026-07-18T00:00:00Z');
  const b = a.addSeconds(0.001); // 1 ms
  const diffDays = (b.jd2parts('tt')[1] - a.jd2parts('tt')[1]);
  assert.ok(Math.abs(diffDays * 86400 - 0.001) < 1e-9, 'got ' + diffDays * 86400);
});

test('Instant: fromISO without offset is treated as UTC', () => {
  const a = Instant.fromISO('2026-07-18T12:00:00');
  const b = Instant.fromISO('2026-07-18T12:00:00Z');
  assert.strictEqual(a.utcMs, b.utcMs);
});

test('Instant: fromJD round trip in both scales', () => {
  const t = Instant.fromISO('2026-07-18T06:30:15.250Z');
  const viaTT = Instant.fromJD2(...t.jd2parts('tt'), 'tt');
  const viaUTC = Instant.fromJD2(...t.jd2parts('utc'), 'utc');
  assert.ok(Math.abs(viaTT.utcMs - t.utcMs) < 0.5, 'tt path: ' + (viaTT.utcMs - t.utcMs));
  assert.ok(Math.abs(viaUTC.utcMs - t.utcMs) < 0.5, 'utc path');
});

test('ttMinusUtc: leap second table and fallback', () => {
  assert.strictEqual(ttMinusUtc(Date.UTC(2026, 6, 18)), 69.184);
  assert.strictEqual(ttMinusUtc(Date.UTC(1990, 5, 1)), 57.184);
  assert.strictEqual(ttMinusUtc(Date.UTC(1972, 0, 1)), 42.184);
  assert.ok(Math.abs(deltaT(2026, 7) - 75.4) < 0.1); // polynomial (overestimates modern era)
  assert.ok(Math.abs(ttMinusUtc(Date.UTC(1900, 5, 1))) < 10); // pre-1972 fallback
});

test('gmst82 reproduces Meeus example 12.b (mean sidereal time)', () => {
  // 1987 Apr 10, 19:21:00 UT -> mean ST 8h34m57.0896s
  const t = Instant.fromISO('1987-04-10T19:21:00Z');
  const ref = (8 + 34 / 60 + 57.0896 / 3600) * HOUR;
  assert.ok(Math.abs(gmst82(t) - ref) / HOUR * 3600 < 0.001, 'gmst82=' + gmst82(t));
});

test('gast reproduces Meeus example 12.b (apparent sidereal time)', () => {
  // 1987 Apr 10, 19:21:00 UT -> apparent ST 8h34m56.853s
  const t = Instant.fromISO('1987-04-10T19:21:00Z');
  const ref = (8 + 34 / 60 + 56.853 / 3600) * HOUR;
  assert.ok(Math.abs(gast(t) - ref) / HOUR * 3600 < 0.01, 'gast=' + gast(t));
});

// ---------------------------------------------------------------- math

test('angles: normalization and formatting', () => {
  assert.strictEqual(normalizeAngle(-Math.PI / 2), 1.5 * Math.PI);
  assert.strictEqual(hms(7.826 * HOUR), '7h 49m 33.60s');
  assert.strictEqual(dms(-16.716 * DEG), "-16° 42' 57.6\"");
});

test('vec3: rotations are orthonormal and invert by negation', () => {
  const v = Float64Array.of(1.1, -2.2, 3.3);
  const w = rotx(rotz(v, 0.7), -0.4);
  const back = rotz(rotx(w, 0.4), -0.7);
  for (let i = 0; i < 3; i++) assert.ok(Math.abs(back[i] - v[i]) < 1e-14);
});

// --------------------------------------------------------------- frames

// Pinned from ERFA 2.0.1.5 (nut00b / obl06). Our implementation is a port
// of the same model, so agreement should be at rounding level.
const ERFA_NUT = {
  '2026-07-18T00:00:00Z': [4.4524281448767655e-05, 3.7808037317840246e-05, 0.40903233129840494],
  '2000-01-01T12:00:00Z': [-6.754258698513216e-05, -2.797099730507557e-05, 0.40909260059596453],
  '1987-04-10T19:21:00Z': [-1.8715898774942653e-05, 4.5903688111084264e-05, 0.4091215008725581],
  '2050-01-01T00:00:00Z': [7.355280242925511e-05, -2.5841232385596943e-05, 0.4089790660556442]
};

test('nutation & obliquity match ERFA nut00b/obl06', () => {
  for (const [iso, [dpsi, deps, obl]] of Object.entries(ERFA_NUT)) {
    const t = Instant.fromISO(iso);
    const n = nutation(t);
    assert.ok(Math.abs(n.dpsi - dpsi) < 1e-14, iso + ' dpsi');
    assert.ok(Math.abs(n.deps - deps) < 1e-14, iso + ' deps');
    assert.ok(Math.abs(meanObliquity(t) - obl) < 1e-14, iso + ' obl');
  }
});

test('precession matrix matches ERFA pmat06', () => {
  const cases = {
    '2026-07-18T00:00:00Z': [0.9999790602199642, -0.005935419416990023, -0.0025787434811352585],
    '1987-04-10T19:21:00Z': [0.9999951861163564, 0.0028457172109116807, 0.00123678521557509],
    '2050-01-01T00:00:00Z': [0.9999256843032829, -0.01118167293109456, -0.004857577696102033]
  };
  for (const [iso, row0] of Object.entries(cases)) {
    const p = precessionMatrix(Instant.fromISO(iso));
    for (let j = 0; j < 3; j++) {
      assert.ok(Math.abs(p[j] - row0[j]) < 1e-13, iso + ' [' + j + ']');
    }
  }
});

test('precession-nutation matrix matches ERFA pnm06a to the 2000A/B level', () => {
  // pnm06a uses the full IAU 2000A nutation; we use 2000B, so agreement is
  // bounded by the model difference (~1 mas).
  const cases = {
    '2026-07-18T00:00:00Z': [0.002596676636173666, 2.998199346027075e-05, 0.9999966281800791],
    '2050-01-01T00:00:00Z': [0.004886533933527286, -5.341845308892701e-05, 0.9999880593950037]
  };
  const MAS = ARCSEC / 1000;
  for (const [iso, row2] of Object.entries(cases)) {
    const pn = precessionNutationMatrix(Instant.fromISO(iso));
    for (let j = 0; j < 3; j++) {
      assert.ok(Math.abs(pn[6 + j] - row2[j]) < 3 * MAS, iso + ' [' + j + ']');
    }
  }
});

test('transform: of-date -> ecef equals a single GAST rotation', () => {
  const t = Instant.fromISO('2026-07-18T12:00:00Z');
  const s = makeState({ t, frame: 'equatorial-of-date', center: 'earth', r: [7000, 1000, 2000] });
  const viaGraph = transform(s, { frame: 'ecef' }).r;
  const direct = matVec(matRotZ(gast(t)), s.r);
  for (let i = 0; i < 3; i++) assert.ok(Math.abs(viaGraph[i] - direct[i]) < 1e-9);
});

test('transform: TEME -> ecef uses mean sidereal time', () => {
  const t = Instant.fromISO('2020-01-14T12:40:00Z');
  const s = makeState({ t, frame: 'teme', center: 'earth', r: [7000, 0, 0] });
  const out = transform(s, { frame: 'ecef' }).r;
  const direct = matVec(matRotZ(gmst82(t)), s.r);
  for (let i = 0; i < 3; i++) assert.ok(Math.abs(out[i] - direct[i]) < 1e-9);
});

test('transform: round trip across the whole graph is identity', () => {
  const t = Instant.fromISO('2026-07-18T12:00:00Z');
  const s = makeState({ t, frame: 'ecef', center: 'earth', r: [1234, -5678, 3456] });
  const there = transform(s, { frame: 'ecliptic-j2000' });
  const back = transform(there, { frame: 'ecef' });
  for (let i = 0; i < 3; i++) assert.ok(Math.abs(back.r[i] - s.r[i]) < 1e-9);
});

test('transform: velocity round trip through the rotating edge', () => {
  const t = Instant.fromISO('2026-07-18T12:00:00Z');
  const s = makeState({ t, frame: 'teme', center: 'earth', r: [7000, 1000, 2000], v: [1, 7, 0.5] });
  const rt = transform(transform(s, { frame: 'ecef' }), { frame: 'teme' });
  for (let i = 0; i < 3; i++) {
    assert.ok(Math.abs(rt.v[i] - s.v[i]) < 1e-12);
    assert.ok(Math.abs(rt.r[i] - s.r[i]) < 1e-9);
  }
});

test('transform: unknown path throws instead of guessing', () => {
  const t = Instant.fromISO('2026-07-18T12:00:00Z');
  const s = makeState({ t, frame: 'equatorial-j2000', center: 'earth', r: [1, 2, 3] });
  assert.throws(() => transform(s, { frame: 'no-such-frame' }), RangeError);
});

test('v3 equivalence: J2000 ecliptic -> of-date within model differences', () => {
  // v3 used IAU 1976 precession and a 4-term nutation; v4 uses IAU 2006 +
  // 2000B. The results must agree to the size of those model differences
  // (~1 arcsec), not more.
  const require = createRequire(import.meta.url);
  const Orb = require('../../dist/orb.js');
  const date = new Date(Date.UTC(2026, 6, 18, 0, 0, 0));
  const t = Instant.fromDate(date);
  const r = [0.5, -0.8, 0.1]; // arbitrary vector, unit-free
  // v3's EclipticJ2000ToDate = IAU1976 precession + 4-term nutation-in-
  // longitude rotation, landing on the ecliptic of date (true equinox) --
  // the same frame v4 calls 'ecliptic-of-date'.
  const v3ecl = Orb.EclipticJ2000ToDate({ x: r[0], y: r[1], z: r[2] }, date);
  const s = makeState({ t, frame: 'ecliptic-j2000', center: 'earth', r });
  const v4ecl = transform(s, { frame: 'ecliptic-of-date' }).r;
  const diffs = [v4ecl[0] - v3ecl.x, v4ecl[1] - v3ecl.y, v4ecl[2] - v3ecl.z];
  for (let i = 0; i < 3; i++) {
    assert.ok(Math.abs(diffs[i]) < 2 * ARCSEC, 'component ' + i + ': ' + diffs[i]);
  }
});

// ------------------------------------------------------------- geodetic

test('geodetic round trip', () => {
  const g = { latitude: 35.658 * DEG, longitude: 139.741 * DEG, height: 0.025 };
  const back = ecefToGeodetic(geodeticToEcef(g));
  assert.ok(Math.abs(back.latitude - g.latitude) < 1e-12);
  assert.ok(Math.abs(back.longitude - g.longitude) < 1e-12);
  assert.ok(Math.abs(back.height - g.height) < 1e-9);
});

test('geodetic: equator and pole radii', () => {
  const eq = geodeticToEcef({ latitude: 0, longitude: 0, height: 0 });
  assert.ok(Math.abs(eq[0] - 6378.137) < 1e-9);
  const pole = geodeticToEcef({ latitude: 90 * DEG, longitude: 0, height: 0 });
  assert.ok(Math.abs(pole[2] - 6356.7523142) < 1e-6); // WGS-84 polar radius
});

test('enu: zenith and cardinal directions', () => {
  const obs = { latitude: 35 * DEG, longitude: 139 * DEG };
  const m = enuMatrix(obs);
  const up = matVec(m, geodeticToEcef({ ...obs, height: 100 })); // roughly local vertical
  const site = matVec(m, geodeticToEcef({ ...obs, height: 0 }));
  const rel = [up[0] - site[0], up[1] - site[1], up[2] - site[2]];
  const azel = enuToAzEl(rel);
  assert.ok(Math.abs(azel.elevation - Math.PI / 2) < 1e-9, 'zenith elevation');
  // a point due geodetic north on the ellipsoid appears near azimuth 0
  const north = matVec(m, geodeticToEcef({ latitude: 35.1 * DEG, longitude: 139 * DEG, height: 0 }));
  const relN = [north[0] - site[0], north[1] - site[1], north[2] - site[2]];
  const azelN = enuToAzEl(relN);
  assert.ok(Math.abs(azelN.azimuth) < 0.001 || Math.abs(azelN.azimuth - 2 * Math.PI) < 0.001, 'north azimuth=' + azelN.azimuth);
});

if (failed > 0) {
  console.error(failed + ' test(s) failed');
  process.exit(1);
}
console.log('all v4 tests passed');
