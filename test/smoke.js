// Smoke test for orb.js. Run with: npm test
// Exercises every public class against the built dist bundle and checks
// results against external reference values where available.
const assert = require('assert');
const Orb = require('../dist/orb.js');

const AU = 149597870.7;
let failed = 0;
function test(name, fn) {
  try {
    fn();
    console.log('ok - ' + name);
  } catch (e) {
    failed++;
    console.error('NG - ' + name + ': ' + e.message);
  }
}

test('Time.jd matches J2000.0 epoch', () => {
  const t = new Orb.Time(new Date(Date.UTC(2000, 0, 1, 12, 0, 0)));
  assert.strictEqual(t.jd(), 2451545.0);
});

test('Time.doy is a number computed in UTC', () => {
  const t = new Orb.Time(new Date(Date.UTC(2026, 0, 1, 0, 0, 0)));
  assert.strictEqual(t.doy(), 1);
  const t2 = new Orb.Time(new Date(Date.UTC(2026, 11, 31, 12, 0, 0)));
  assert.strictEqual(t2.doy(), 365.5);
});

test('Time.delta_t follows the NASA polynomial', () => {
  const t = new Orb.Time(new Date(Date.UTC(2026, 6, 18)));
  assert.ok(Math.abs(t.delta_t() - 75.4) < 0.1, 'got ' + t.delta_t());
});

test('Sun.radec agrees with ephemeris (2026-07-18)', () => {
  // Reference: apparent RA/Dec ~ 7h49.5m, +21.05 deg
  const s = new Orb.Sun().radec(new Date(Date.UTC(2026, 6, 18, 0, 0, 0)));
  assert.ok(Math.abs(s.ra - 7.826) < 0.02, 'ra=' + s.ra);
  assert.ok(Math.abs(s.dec - 21.05) < 0.1, 'dec=' + s.dec);
  assert.ok(Math.abs(s.distance - 1.016) < 0.005, 'distance=' + s.distance);
});

test('Luna.radec returns plausible geocentric position', () => {
  const m = new Orb.Luna().radec(new Date(Date.UTC(2026, 6, 18, 0, 0, 0)));
  assert.ok(m.ra >= 0 && m.ra < 24);
  assert.ok(Math.abs(m.dec) <= 29);
  assert.ok(m.distance > 356000 && m.distance < 407000, 'distance=' + m.distance);
});

test('VSOP planets return finite positions', () => {
  const date = new Date(Date.UTC(2026, 6, 18));
  for (const name of ['Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune']) {
    const p = new Orb[name]().xyz(date);
    assert.ok([p.x, p.y, p.z].every(Number.isFinite), name);
  }
  const e = new Orb.Earth().xyz(date);
  assert.ok(Math.abs(Math.hypot(e.x, e.y, e.z) - 1.016) < 0.005, 'earth distance');
});

test('Kepler elliptical orbit accepts mean_anomaly of 0', () => {
  const k = new Orb.Kepler({
    eccentricity: 0.1, semi_major_axis: 1.5, inclination: 5,
    argument_of_periapsis: 10, longitude_of_ascending_node: 20,
    mean_anomaly: 0, epoch: 2451545.0
  });
  const p = k.xyz(new Date(Date.UTC(2026, 6, 18)));
  assert.ok([p.x, p.y, p.z, p.xdot, p.ydot, p.zdot].every(Number.isFinite));
});

test('Kepler parabolic orbit (e=1) solves Barker\'s equation', () => {
  const date = new Date(Date.UTC(2026, 6, 18));
  const jd = new Orb.Time(date).jd();
  const q = 0.5;
  const gm = Orb.Constant.GM;
  const k = new Orb.Kepler({
    eccentricity: 1.0, periapsis_distance: q, inclination: 5,
    argument_of_periapsis: 10, longitude_of_ascending_node: 20,
    time_of_periapsis: jd
  });
  const p = k.xyz(date);
  assert.ok(Math.abs(Math.hypot(p.x, p.y, p.z) - q) < 1e-9, 'r at periapsis');
  const later = k.xyz(new Date(date.getTime() + 30 * 86400000));
  const r = Math.hypot(later.x, later.y, later.z);
  const v2 = later.xdot ** 2 + later.ydot ** 2 + later.zdot ** 2;
  assert.ok(Math.abs(v2 / 2 - gm / r) < 1e-12, 'specific energy stays zero');
});

test('Kepler hyperbolic orbit (e>1) works', () => {
  const k = new Orb.Kepler({
    eccentricity: 1.5, periapsis_distance: 0.8, inclination: 10,
    argument_of_periapsis: 30, longitude_of_ascending_node: 40,
    time_of_periapsis: 2461000
  });
  const p = k.xyz(new Date(Date.UTC(2026, 6, 18)));
  assert.ok([p.x, p.y, p.z].every(Number.isFinite));
});

test('Constant GM values are close to JPL', () => {
  const ref = {
    Mercury: 22031.87, Venus: 324858.6, Earth: 398600.44, Moon: 4902.8,
    Mars: 42828.37, Jupiter: 126686532, Saturn: 37931206,
    Uranus: 5793951, Neptune: 6835100, Sun: 1.32712440018e11
  };
  for (const [k, v] of Object.entries(ref)) {
    assert.ok(Math.abs(Orb.Constant[k].gm / v - 1) < 3e-4, k + '=' + Orb.Constant[k].gm);
  }
});

const iss_tle = {
  first_line: '1 25544U 98067A   20014.52632156  .00016717  00000-0  10270-3 0  9015',
  second_line: '2 25544  51.6423  33.7380 0004871 130.9389 229.2183 15.49556564  8038'
};

test('SGP4 parses TLE fields', () => {
  const sat = new Orb.SGP4(iss_tle);
  assert.strictEqual(sat.omm.NORAD_CAT_ID, 25544);
  assert.strictEqual(sat.omm.CLASSIFICATION_TYPE, 'U');
  assert.strictEqual(sat.omm.MEAN_MOTION_DDOT, 0);
  assert.ok(Math.abs(sat.omm.BSTAR - 1.027e-4) < 1e-9);
  assert.strictEqual(sat.omm.EPOCH, '2020-01-14T12:37:54.182');
  const d = sat.DecodeTLE();
  assert.ok(Math.abs(d.eccentricity - 0.0004871) < 1e-10);
  assert.strictEqual(d.check_sum_1, 5);
  assert.strictEqual(d.check_sum_2, 8);
  // negative nddot mantissa must not break
  const sat2 = new Orb.SGP4({
    first_line: '1 25544U 98067A   20014.52632156  .00016717 -12345-4  10270-3 0  9015',
    second_line: iss_tle.second_line
  });
  assert.ok(Math.abs(sat2.omm.MEAN_MOTION_DDOT - (-0.12345e-4)) < 1e-12);
});

test('SGP4 propagates ISS to a plausible LEO state', () => {
  const sat = new Orb.SGP4(iss_tle);
  const p = sat.xyz(new Date(Date.UTC(2020, 0, 14, 12, 40, 0)));
  const r = Math.hypot(p.x, p.y, p.z);
  const v = Math.hypot(p.xdot, p.ydot, p.zdot);
  assert.ok(r > 6650 && r < 6850, 'r=' + r);
  assert.ok(v > 7.5 && v < 7.8, 'v=' + v);
  const g = sat.latlng(new Date(Date.UTC(2020, 0, 14, 12, 40, 0)));
  assert.ok(Math.abs(g.latitude) <= 51.7, 'latitude=' + g.latitude);
  assert.ok(g.altitude > 400 && g.altitude < 440, 'altitude=' + g.altitude);
});

const observer = { latitude: 35.0, longitude: 139.0, altitude: 0 };

test('Observation.azel accepts a plain ra/dec object', () => {
  const obs = new Orb.Observation({ observer, target: { ra: 6.45, dec: -16.72 } });
  const a = obs.azel(new Date(Date.UTC(2026, 6, 18, 12, 0, 0)));
  assert.ok(Number.isFinite(a.azimuth) && a.azimuth >= 0 && a.azimuth < 360);
  assert.ok(Number.isFinite(a.elevation) && Math.abs(a.elevation) <= 90);
});

test('Observation.azel agrees between instance and xyz targets', () => {
  const date = new Date(Date.UTC(2026, 6, 18, 12, 0, 0));
  const a1 = new Orb.Observation({ observer, target: new Orb.Mars() }).azel(date);
  const a2 = new Orb.Observation({ observer, target: new Orb.Mars().xyz(date) }).azel(date);
  assert.ok(Math.abs(a1.azimuth - a2.azimuth) < 0.05, a1.azimuth + ' vs ' + a2.azimuth);
  assert.ok(Math.abs(a1.elevation - a2.elevation) < 0.05, a1.elevation + ' vs ' + a2.elevation);
  assert.ok(a2.unit_keywords.match(/km/), 'converted distance must be labeled km');
  assert.ok(Math.abs(a2.distance / AU - a1.distance) < 0.001, 'distances must agree');
});

test('Observation.azel works for a satellite xyz target', () => {
  const date = new Date(Date.UTC(2020, 0, 14, 12, 40, 0));
  const target = new Orb.SGP4(iss_tle).xyz(date);
  const a = new Orb.Observation({ observer, target }).azel(date);
  assert.ok(Number.isFinite(a.azimuth) && Number.isFinite(a.elevation));
  assert.ok(a.distance > 400 && a.distance < 15000, 'range=' + a.distance);
});

if (failed > 0) {
  console.error(failed + ' test(s) failed');
  process.exit(1);
}
console.log('all tests passed');
