'use strict';

const assert = require('assert');
const Orb = require('../../dist/orb.js');
const { test } = require('../helpers/harness.js');
const { ISS_TLE } = require('../helpers/sgp4-fixtures.js');

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
  assert.ok(a1.unit_keywords.match(/km/) && a2.unit_keywords.match(/km/), 'distances must be labeled km');
  assert.ok(Math.abs(a2.distance / a1.distance - 1) < 1e-4, 'distances must agree');
});

test('Observation.azel applies diurnal parallax for the Moon', () => {
  const date = new Date(Date.UTC(2026, 6, 18, 12, 0, 0));
  const luna = new Orb.Luna();
  // instance (radec) path and xyz path must agree now that both are topocentric
  const m1 = new Orb.Observation({ observer, target: luna }).azel(date);
  const m2 = new Orb.Observation({ observer, target: luna.xyz(date) }).azel(date);
  assert.ok(Math.abs(m1.elevation - m2.elevation) < 0.01, m1.elevation + ' vs ' + m2.elevation);
  assert.ok(Math.abs(m1.azimuth - m2.azimuth) < 0.01, m1.azimuth + ' vs ' + m2.azimuth);
  // the shift from the geocentric elevation must match parallax * cos(elevation)
  const radec = luna.radec(date);
  const geo = new Orb.Observation({ observer, target: { ra: radec.ra, dec: radec.dec } }).azel(date);
  const shift = geo.elevation - m1.elevation;
  const expected = luna.parallax(date) * Math.cos(m1.elevation * Math.PI / 180);
  assert.ok(Math.abs(shift - expected) < 0.01, 'shift=' + shift + ' expected=' + expected);
});

test('Observation.azel works for a satellite xyz target', () => {
  const date = new Date(Date.UTC(2020, 0, 14, 12, 40, 0));
  const target = new Orb.SGP4(ISS_TLE).xyz(date);
  const a = new Orb.Observation({ observer, target }).azel(date);
  assert.ok(Number.isFinite(a.azimuth) && Number.isFinite(a.elevation));
  assert.ok(a.distance > 400 && a.distance < 15000, 'range=' + a.distance);
});
