'use strict';

const assert = require('assert');
const Orb = require('../../dist/orb.js');
const { test } = require('../helpers/harness.js');
const { loadReferenceFixture } = require('../helpers/reference-fixture.js');

const MEEUS = loadReferenceFixture('meeus-2ed.json');

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

test('Time.gast reproduces Meeus example 12.b', () => {
  const t = new Orb.Time(new Date(MEEUS.sidereal.utc));
  const ref = MEEUS.sidereal.apparentHours;
  assert.ok(
    Math.abs(t.gast() - ref) * 3600 < MEEUS.tolerance.apparentSiderealSeconds,
    'gast=' + t.gast()
  );
  // gmst() is kept as a backward-compatible alias of gast()
  assert.strictEqual(t.gmst(), t.gast());
});

test('Time.gmst82 reproduces Meeus example 12.b (mean sidereal time)', () => {
  const t = new Orb.Time(new Date(MEEUS.sidereal.utc));
  const ref = MEEUS.sidereal.meanHours;
  assert.ok(
    Math.abs(t.gmst82() - ref) * 3600 < MEEUS.tolerance.meanSiderealSeconds,
    'gmst82=' + t.gmst82()
  );
});

test('Time.tt_minus_utc uses the leap second table', () => {
  assert.strictEqual(new Orb.Time(new Date(Date.UTC(2026, 6, 18))).tt_minus_utc(), 69.184);
  assert.strictEqual(new Orb.Time(new Date(Date.UTC(1990, 5, 1))).tt_minus_utc(), 57.184);
  assert.strictEqual(new Orb.Time(new Date(Date.UTC(1972, 0, 1))).tt_minus_utc(), 42.184);
  // pre-1972: falls back to the delta_t polynomial
  const dt1900 = new Orb.Time(new Date(Date.UTC(1900, 5, 1))).tt_minus_utc();
  assert.ok(Math.abs(dt1900) < 10, '1900: ' + dt1900);
});
