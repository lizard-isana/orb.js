'use strict';

const assert = require('assert');
const Orb = require('../../dist/orb.js');
const { test } = require('../helpers/harness.js');
const { loadReferenceFixture } = require('../helpers/reference-fixture.js');

const HORIZONS_SUN = loadReferenceFixture('horizons-sun-2026-07-18.json');
const MEEUS = loadReferenceFixture('meeus-2ed.json');

test('Luna.latlng reproduces Meeus example 47.a (1992 Apr 12.0 TD)', () => {
  const date = new Date(MEEUS.moon.utcDateInput);
  const m = new Orb.Luna().latlng(date);
  assert.ok(
    Math.abs(m.longitude - MEEUS.moon.longitudeDeg) < MEEUS.tolerance.moonLongitudeDeg,
    'longitude=' + m.longitude
  );
  assert.ok(
    Math.abs(m.latitude - MEEUS.moon.latitudeDeg) < MEEUS.tolerance.moonLatitudeDeg,
    'latitude=' + m.latitude
  );
  assert.ok(
    Math.abs(m.distance - MEEUS.moon.distanceKm) < MEEUS.tolerance.moonDistanceKm,
    'distance=' + m.distance
  );
});

test('Sun.radec agrees with ephemeris (2026-07-18)', () => {
  const s = new Orb.Sun().radec(new Date(HORIZONS_SUN.instant));
  const expected = HORIZONS_SUN.expected;
  const tolerance = HORIZONS_SUN.tolerance;
  assert.ok(
    Math.abs(s.ra * 15 - expected.rightAscensionDeg) < tolerance.legacyRightAscensionDeg,
    'ra=' + s.ra
  );
  assert.ok(
    Math.abs(s.dec - expected.declinationDeg) < tolerance.legacyDeclinationDeg,
    'dec=' + s.dec
  );
  assert.ok(
    Math.abs(s.distance - expected.rangeAu) < tolerance.legacyRangeAu,
    'distance=' + s.distance
  );
});

test('Luna.radec returns plausible geocentric position', () => {
  const date = new Date(Date.UTC(2026, 6, 18, 0, 0, 0));
  const luna = new Orb.Luna();
  const m = luna.radec(date);
  assert.ok(m.ra >= 0 && m.ra < 24);
  assert.ok(Math.abs(m.dec) <= 29);
  assert.ok(m.distance > 356000 && m.distance < 407000, 'distance=' + m.distance);
  const converted = Orb.XYZtoRadec(luna.xyz(date));
  assert.ok(Math.abs(converted.ra - m.ra) < 1e-9, 'RA mismatch');
  assert.ok(Math.abs(converted.dec - m.dec) < 1e-8, 'Dec mismatch');
  assert.ok(Math.abs(converted.distance - m.distance) < 1e-9, 'distance mismatch');
});

test('VSOP pipeline agrees with the Sun theory (equinox of date)', () => {
  // The geocentric Sun is minus the Earth's heliocentric position. Running
  // the origin through the VSOP/J2000 pipeline must give the same apparent
  // RA/Dec as the of-date Sun theory; before precession was applied the two
  // frames disagreed by ~24 arcmin (accumulated precession since J2000).
  const date = new Date(HORIZONS_SUN.instant);
  const s1 = new Orb.Sun().radec(date);
  const rect = Orb.EclipticToEquatorial({
    date,
    ecliptic: { x: 0, y: 0, z: 0, unit_keywords: 'au', coordinate_keywords: 'ecliptic rectangular j2000' }
  });
  const s2 = Orb.XYZtoRadec(rect);
  const dra = Math.abs(s1.ra - s2.ra) * 15 * Math.cos(s1.dec * Math.PI / 180);
  const ddec = Math.abs(s1.dec - s2.dec);
  // tolerance is the stated accuracy of the low-precision solar theory (~0.01 deg)
  const tolerance = HORIZONS_SUN.tolerance.vsopPipelineAngleDeg;
  assert.ok(dra < tolerance, 'RA diff deg=' + dra);
  assert.ok(ddec < tolerance, 'Dec diff deg=' + ddec);
  assert.ok(
    Math.abs(s2.ra * 15 - HORIZONS_SUN.expected.rightAscensionDeg) < tolerance,
    'RA=' + s2.ra * 15
  );
  assert.ok(
    Math.abs(s2.dec - HORIZONS_SUN.expected.declinationDeg) < tolerance,
    'Dec=' + s2.dec
  );
  assert.strictEqual(typeof Orb.EclipticJ2000ToDate, 'function');
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

test('VSOP evaluates series in TT and labels J2000 coordinates', () => {
  const date = new Date(Date.UTC(2026, 6, 18));
  Orb.registerVSOP87A('Mars', [[0, 1, [1, 0, 0]]]);
  try {
    const p = new Orb.Mars({ vsop87a: 'full' }).xyz(date);
    const expected = (new Orb.Time(date).jd_tt() - 2451545.0) / 365250;
    assert.ok(Math.abs(p.x - expected) < 1e-15, 'x=' + p.x + ' expected=' + expected);
    assert.ok(p.coordinate_keywords.match(/j2000/));
  } finally {
    Orb.unregisterVSOP87A('Mars');
  }
});

test('planet radec uses the explicit of-date pipeline', () => {
  const date = new Date(Date.UTC(2026, 6, 18));
  const mars = new Orb.Mars();
  const automatic = mars.radec(date);
  const explicit = mars.radecOfDate(date);
  assert.ok(Math.abs(automatic.ra - explicit.ra) < 1e-12, 'RA mismatch');
  assert.ok(Math.abs(automatic.dec - explicit.dec) < 1e-12, 'Dec mismatch');
});
