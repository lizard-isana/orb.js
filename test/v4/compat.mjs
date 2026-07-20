// Compat shim test suite. Run with: node test/v4/compat.mjs
//
// src/compat/v3.js reimplements the classic class API on the current
// core. Each class is compared against the frozen v3 build (dist/orb.js)
// on the same inputs: shapes and units must match exactly, values must
// agree within the documented model differences (light time/aberration,
// nutation-precession models, official VSOP87A data, epoch precision).
import assert from 'assert';
import { createRequire } from 'module';

import * as Compat from '../../src/compat/v3.js';

const require = createRequire(import.meta.url);
const Orb = require('../../dist/orb.js'); // frozen v3 build

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

const DATE = new Date('2026-07-18T12:00:00Z');
const ARCSEC_DEG = 1 / 3600;

test('Time: julian dates exact, sidereal within the nutation models', () => {
  const a = new Compat.Time(DATE);
  const b = new Orb.Time(DATE);
  assert.ok(Math.abs(a.jd() - b.jd()) < 1e-8, 'jd');
  assert.ok(Math.abs(a.jd_tt() - b.jd_tt()) < 1e-8, 'jd_tt');
  assert.strictEqual(a.tt_minus_utc(), b.tt_minus_utc());
  assert.ok(Math.abs(a.delta_t() - b.delta_t()) < 1e-9, 'delta_t');
  assert.ok(Math.abs(a.doy() - b.doy()) < 1e-9, 'doy');
  // same IAU 1982 polynomial -> near-exact; gast differs by the
  // equation-of-equinoxes model (2000B vs 4-term nutation, arcseconds)
  assert.ok(Math.abs(a.gmst82() - b.gmst82()) < 1e-7, 'gmst82 h');
  assert.ok(Math.abs(a.gast() - b.gast()) * 15 * 3600 < 5, 'gast arcsec-equiv');
  assert.strictEqual(a.gmst(), a.gast(), 'gmst is the historic gast alias');
});

test('Sun.radec: v3 shape, values within the low-precision theory class', () => {
  const a = new Compat.Sun().radec(DATE);
  const b = new Orb.Sun().radec(DATE);
  // v3 theory is 0.01-deg class and applies no aberration (~20")
  assert.ok(Math.abs(a.ra - b.ra) * 15 < 0.02, 'ra deg-equiv: ' + (a.ra - b.ra) * 15);
  assert.ok(Math.abs(a.dec - b.dec) < 0.02, 'dec');
  assert.ok(Math.abs(a.distance - b.distance) < 1e-4, 'distance au');
  assert.strictEqual(a.unit_keywords, b.unit_keywords);
  const ax = new Compat.Sun().xyz(DATE);
  const bx = new Orb.Sun().xyz(DATE);
  assert.ok(Math.hypot(ax.x - bx.x, ax.y - bx.y, ax.z - bx.z) < 3e-4, 'xyz au');
});

test('Luna: latlng/radec/xyz shapes and explained differences', () => {
  const a = new Compat.Luna();
  const b = new Orb.Luna();
  const al = a.latlng(DATE), bl = b.latlng(DATE);
  // same Meeus series; longitude differs by the nutation models (<3.5")
  assert.ok(Math.abs(al.longitude - bl.longitude) < 3.5 * ARCSEC_DEG, 'lon');
  assert.ok(Math.abs(al.latitude - bl.latitude) < 0.5 * ARCSEC_DEG, 'lat');
  assert.ok(Math.abs(al.distance - bl.distance) < 0.5, 'dist km');
  assert.ok(Math.abs(al.obliquity - bl.obliquity) < 2 * ARCSEC_DEG, 'obliquity');
  const ar = a.radec(DATE), br = b.radec(DATE);
  // adds lunar light time (~0.7") on top of the nutation difference
  assert.ok(Math.abs(ar.ra - br.ra) * 15 < 5 * ARCSEC_DEG, 'ra');
  assert.ok(Math.abs(ar.dec - br.dec) < 5 * ARCSEC_DEG, 'dec');
  const axz = a.xyz(DATE), bxz = b.xyz(DATE);
  assert.ok(Math.hypot(axz.x - bxz.x, axz.y - bxz.y, axz.z - bxz.z) < 8, 'xyz km');
  assert.ok(Math.abs(a.parallax(DATE) - b.parallax(DATE)) < 1e-5, 'parallax');
  // moon age: same event, from the position theories vs the ch.49 series
  assert.ok(Math.abs(a.phase(DATE) - b.phase(DATE)) < 0.05, 'phase days');
});

test('planets: xyz within the data fix, radec within light time', () => {
  const a = new Compat.Mars();
  const b = new Orb.Mars();
  const ax = a.xyz(DATE), bx = b.xyz(DATE);
  // official VSOP87A vs the truncated file the old build shipped
  const dxyz = Math.hypot(ax.x - bx.x, ax.y - bx.y, ax.z - bx.z);
  assert.ok(dxyz < 1e-2, 'xyz au: ' + dxyz);
  assert.strictEqual(ax.coordinate_keywords, bx.coordinate_keywords);
  const ar = a.radec(DATE), br = b.radec(DATE);
  // light time + aberration (~20") + data difference
  assert.ok(Math.abs(ar.ra - br.ra) * 15 < 60 * ARCSEC_DEG, 'ra');
  assert.ok(Math.abs(ar.dec - br.dec) < 60 * ARCSEC_DEG, 'dec');
  // Earth: heliocentric xyz only, radec is null (historic behaviour)
  const e = new Compat.Earth();
  assert.strictEqual(e.radec(DATE), null);
  const ex = e.xyz(DATE), bex = new Orb.Earth().xyz(DATE);
  assert.ok(Math.hypot(ex.x - bex.x, ex.y - bex.y, ex.z - bex.z) < 1e-3, 'earth xyz au');
  assert.throws(() => new Compat.VSOP('Pluto'), RangeError);
});

const CERES = {
  eccentricity: 0.0785, inclination: 10.6, longitude_of_ascending_node: 80.3,
  argument_of_periapsis: 73.6, semi_major_axis: 2.769,
  mean_anomaly: 77.4, epoch: 2461000.5
};

test('Kepler: elliptic orbit matches the classic propagation', () => {
  const a = new Compat.Kepler(CERES).xyz(DATE);
  const b = new Orb.Kepler(CERES).xyz(DATE);
  const d = Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
  assert.ok(d < 1e-5, 'xyz au: ' + d);
  const dv = Math.hypot(a.xdot - b.xdot, a.ydot - b.ydot, a.zdot - b.zdot);
  assert.ok(dv < 1e-7, 'v au/day: ' + dv);
  assert.ok(Math.abs(a.orbital_plane.r - b.orbital_plane.r) < 1e-5, 'plane r');
  const ar = new Compat.Kepler(CERES).radec(DATE);
  const br = new Orb.Kepler(CERES).radec(DATE);
  // geometric (old) vs apparent (new): light time dominates
  assert.ok(Math.abs(ar.ra - br.ra) * 15 < 60 * ARCSEC_DEG, 'ra');
  assert.ok(Math.abs(ar.dec - br.dec) < 60 * ARCSEC_DEG, 'dec');
});

test('Kepler: parabolic and hyperbolic comets take the same code path', () => {
  const base = {
    inclination: 122.6, longitude_of_ascending_node: 24.6,
    argument_of_periapsis: 111.3, perihelion_distance: 0.586,
    time_of_periapsis: 2461200.5
  };
  for (const e of [1.0, 1.02]) {
    const els = { ...base, eccentricity: e };
    const a = new Compat.Kepler(els).xyz(DATE);
    const b = new Orb.Kepler(els).xyz(DATE);
    const d = Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
    assert.ok(d < 1e-5, `e=${e}: xyz au ${d}`);
  }
});

test('Cartesian: state -> classic element names, round-trips through Kepler', () => {
  const state = new Orb.Kepler(CERES).xyz(DATE);
  const a = new Compat.Cartesian({ ...state, date: DATE });
  const b = new Orb.Cartesian({ ...state, date: DATE });
  assert.ok(Math.abs(a.semi_major_axis - b.semi_major_axis) < 1e-6, 'a');
  assert.ok(Math.abs(a.eccentricity - b.eccentricity) < 1e-6, 'e');
  assert.ok(Math.abs(a.inclination - b.inclination) < 1e-6, 'i');
  assert.ok(Math.abs(a.longitude_of_ascending_node - b.longitude_of_ascending_node) < 1e-6, 'node');
  assert.ok(Math.abs(a.time_of_periapsis - b.time_of_periapsis) < 1e-4, 'tp');
  // and the elements reproduce the state they came from
  const back = new Compat.Kepler(a).xyz(DATE);
  const d = Math.hypot(back.x - state.x, back.y - state.y, back.z - state.z);
  assert.ok(d < 1e-6, 'round trip au: ' + d);
});

const ISS_TLE = {
  first_line: '1 25544U 98067A   20014.52632156  .00016717  00000-0  10270-3 0  9015',
  second_line: '2 25544  51.6423  33.7380 0004871 130.9389 229.2183 15.49556564  8038'
};
const SGP4_DATE = new Date('2020-01-14T14:00:00Z');

test('SGP4: xyz/latlng match up to the epoch-precision fix', () => {
  const a = new Compat.SGP4(ISS_TLE);
  const b = new Orb.SGP4(ISS_TLE);
  const ax = a.xyz(SGP4_DATE), bx = b.xyz(SGP4_DATE);
  const d = Math.hypot(ax.x - bx.x, ax.y - bx.y, ax.z - bx.z);
  assert.ok(d < 0.01, 'xyz km: ' + d); // ~6 m from the millisecond epoch
  const al = a.latlng(SGP4_DATE), bl = b.latlng(SGP4_DATE);
  assert.ok(Math.abs(al.latitude - bl.latitude) < 1e-3, 'lat');
  assert.ok(Math.abs(al.longitude - bl.longitude) < 1e-3, 'lng');
  assert.ok(Math.abs(al.altitude - bl.altitude) < 0.5, 'alt km');
  assert.ok(Math.abs(a.orbital_period - b.orbital_period) < 1e-6, 'period');
  assert.ok(Math.abs(a.apogee - b.apogee) < 1e-6, 'apogee');
  assert.strictEqual(a.orbital_elements.catalog_number, 25544);
  assert.strictEqual(a.orbital_elements.international_designator, '1998-067A');
});

test('SGP4: an OMM without TLE lines initializes from the fields', () => {
  const tlePath = new Compat.SGP4(ISS_TLE);
  const el = tlePath.orbital_elements;
  const omm = {
    CCSDS_OMM_VERS: '2.0', OBJECT_NAME: 'ISS (ZARYA)', OBJECT_ID: '1998-067A',
    EPOCH: '2020-01-14T12:37:54.182784', NORAD_CAT_ID: 25544,
    CLASSIFICATION_TYPE: 'U', ELEMENT_SET_NO: 901, REV_AT_EPOCH: 803,
    MEAN_MOTION_DOT: 0.00016717, MEAN_MOTION_DDOT: 0, EPHEMERIS_TYPE: 0,
    BSTAR: 1.0270e-4, INCLINATION: 51.6423, RA_OF_ASC_NODE: 33.7380,
    ECCENTRICITY: 0.0004871, ARG_OF_PERICENTER: 130.9389,
    MEAN_ANOMALY: 229.2183, MEAN_MOTION: 15.49556564
  };
  const ommPath = new Compat.SGP4(omm);
  const a = ommPath.xyz(SGP4_DATE), b = tlePath.xyz(SGP4_DATE);
  // epoch string carries ~1 ms rounding -> ~8 m along-track
  const d = Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
  assert.ok(d < 0.02, 'omm vs tle km: ' + d);
  assert.ok(Math.abs(ommPath.orbital_period - tlePath.orbital_period) < 1e-9);
  assert.strictEqual(el.mean_motion.toFixed(8), '15.49556564');
});

const TOKYO = { latitude: 35.658, longitude: 139.741, altitude: 0.025 };

test('Observation: body targets match v3 within the explained differences', () => {
  // distances always come back in km — au inputs were historically
  // converted to km before the topocentric subtraction
  const cases = [
    ['Luna', new Compat.Luna(), new Orb.Luna(), 15, 'km'],
    ['Sun', new Compat.Sun(), new Orb.Sun(), 80, 'km'], // low-precision theory + aberration
    ['SGP4', new Compat.SGP4(ISS_TLE), new Orb.SGP4(ISS_TLE), 30, 'km']
  ];
  for (const [name, ct, ot, tolArcsec, unit] of cases) {
    const date = name === 'SGP4' ? SGP4_DATE : DATE;
    const a = new Compat.Observation({ observer: TOKYO, target: ct }).azel(date);
    const b = new Orb.Observation({ observer: TOKYO, target: ot }).azel(date);
    const d = Math.hypot(
      (a.azimuth - b.azimuth) * Math.cos(a.elevation * Math.PI / 180),
      a.elevation - b.elevation
    ) * 3600;
    assert.ok(d < tolArcsec, `${name}: ${d.toFixed(1)}" (tol ${tolArcsec})`);
    assert.ok(a.unit_keywords.includes(unit), `${name} unit: ${a.unit_keywords}`);
    if (b.distance !== undefined) {
      const relD = Math.abs(a.distance - b.distance) / b.distance;
      assert.ok(relD < 1e-3, `${name} distance rel: ${relD}`);
    }
    assert.ok(a.atmospheric_refraction > 0, name + ' refraction reported');
  }
});

test('Observation: raw radec and xyz targets', () => {
  // direction-only target: pure angular conversion, no distance out
  const radec = { ra: 18.5, dec: -23.4 };
  const a = new Compat.Observation({ observer: TOKYO, target: radec }).azel(DATE);
  const b = new Orb.Observation({ observer: TOKYO, target: radec }).azel(DATE);
  assert.ok(Math.hypot(a.azimuth - b.azimuth, a.elevation - b.elevation) * 3600 < 20,
    'radec target');
  assert.strictEqual(a.distance, undefined);
  // TEME vector target (satellite-style): pairs with mean sidereal time
  const rect = new Orb.SGP4(ISS_TLE).xyz(SGP4_DATE);
  const ar = new Compat.Observation({ observer: TOKYO, target: rect }).azel(SGP4_DATE);
  const br = new Orb.Observation({ observer: TOKYO, target: rect }).azel(SGP4_DATE);
  assert.ok(Math.hypot(ar.azimuth - br.azimuth, ar.elevation - br.elevation) * 3600 < 30,
    'teme target');
  assert.ok(Math.abs(ar.distance - br.distance) < 1, 'range km');
});

test('coordinate helpers: shapes exact, rotations within the models', () => {
  const vec = { x: 1.2, y: -0.4, z: 0.1, unit_keywords: 'au' };
  const a = Compat.EclipticJ2000ToDate(vec, DATE);
  const b = Orb.EclipticJ2000ToDate(vec, DATE);
  // model difference: the old "ecliptic of date" kept the MEAN obliquity
  // tilt (nutation in longitude only); the frame graph uses the true
  // obliquity, a ~2" (deps) difference on top of IAU 1976-vs-2006
  assert.ok(Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z) < 1e-4, 'J2000->date');
  const rd = { ra: 5.5, dec: 22.0, distance: 1.5, unit_keywords: 'au' };
  const ax = Compat.RadecToXYZ(rd), bx = Orb.RadecToXYZ(rd);
  assert.ok(Math.hypot(ax.x - bx.x, ax.y - bx.y, ax.z - bx.z) < 1e-12, 'RadecToXYZ');
  const back = Compat.XYZtoRadec(ax);
  assert.ok(Math.abs(back.ra - rd.ra) < 1e-9 && Math.abs(back.dec - rd.dec) < 1e-9,
    'XYZtoRadec round trip');
  const mars3 = new Orb.Mars().xyz(DATE);
  const aeq = Compat.EclipticToEquatorial({ date: DATE, ecliptic: mars3 });
  const beq = Orb.EclipticToEquatorial({ date: DATE, ecliptic: mars3 });
  // geocentric vector: Earth data difference dominates (au scale ~1e-5)
  assert.ok(Math.hypot(aeq.x - beq.x, aeq.y - beq.y, aeq.z - beq.z) < 1e-4,
    'EclipticToEquatorial');
});

if (failures > 0) {
  console.error(failures + ' compat test(s) failed');
  process.exit(1);
}
console.log('all compat tests passed');
