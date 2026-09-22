'use strict';

const assert = require('assert');
const Orb = require('../../dist/orb.js');
const { test } = require('../helpers/harness.js');
const { loadReferenceFixture } = require('../helpers/reference-fixture.js');

const JPL_GM = loadReferenceFixture('jpl-gm.json');

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

test('Kepler radec converts J2000 elements to the equinox of date', () => {
  const date = new Date(Date.UTC(2026, 6, 18));
  const k = new Orb.Kepler({
    eccentricity: 0.1, semi_major_axis: 1.5, inclination: 5,
    argument_of_periapsis: 10, longitude_of_ascending_node: 20,
    mean_anomaly: 0, epoch: 2451545.0
  });
  const automatic = k.radec(date);
  const explicit = Orb.XYZtoRadecOfDate(k.xyz(date));
  assert.ok(Math.abs(automatic.ra - explicit.ra) < 1e-12, 'RA mismatch');
  assert.ok(Math.abs(automatic.dec - explicit.dec) < 1e-12, 'Dec mismatch');
});

test('Constant GM values are close to JPL', () => {
  for (const [key, value] of Object.entries(JPL_GM.expected)) {
    assert.ok(
      Math.abs(Orb.Constant[key].gm / value - 1) < JPL_GM.tolerance.relative,
      key + '=' + Orb.Constant[key].gm
    );
  }
});
