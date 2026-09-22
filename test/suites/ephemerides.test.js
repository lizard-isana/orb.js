'use strict';

const assert = require('assert');
const Orb = require('../../dist/orb.js');
const { test } = require('../helpers/harness.js');

test('Luna.latlng reproduces Meeus example 47.a (1992 Apr 12.0 TD)', () => {
  // Input date is TT; the equivalent UTC instant is 58.184s earlier.
  const date = new Date(Date.UTC(1992, 3, 12, 0, 0, 0) - 58184);
  const m = new Orb.Luna().latlng(date);
  // Meeus: apparent longitude 133.167265 (full nutation; the library's
  // 4-term nutation differs by ~2 arcsec), latitude -3.229126, distance 368409.7
  assert.ok(Math.abs(m.longitude - 133.167265) < 0.002, 'longitude=' + m.longitude);
  assert.ok(Math.abs(m.latitude - (-3.229126)) < 0.0001, 'latitude=' + m.latitude);
  assert.ok(Math.abs(m.distance - 368409.7) < 0.5, 'distance=' + m.distance);
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

test('VSOP pipeline agrees with the Sun theory (equinox of date)', () => {
  // The geocentric Sun is minus the Earth's heliocentric position. Running
  // the origin through the VSOP/J2000 pipeline must give the same apparent
  // RA/Dec as the of-date Sun theory; before precession was applied the two
  // frames disagreed by ~24 arcmin (accumulated precession since J2000).
  const date = new Date(Date.UTC(2026, 6, 18, 0, 0, 0));
  const s1 = new Orb.Sun().radec(date);
  const rect = Orb.EclipticToEquatorial({
    date,
    ecliptic: { x: 0, y: 0, z: 0, unit_keywords: 'au', coordinate_keywords: 'ecliptic rectangular j2000' }
  });
  const s2 = Orb.XYZtoRadec(rect);
  const dra = Math.abs(s1.ra - s2.ra) * 15 * Math.cos(s1.dec * Math.PI / 180);
  const ddec = Math.abs(s1.dec - s2.dec);
  // tolerance is the stated accuracy of the low-precision solar theory (~0.01 deg)
  assert.ok(dra < 0.01, 'RA diff deg=' + dra);
  assert.ok(ddec < 0.01, 'Dec diff deg=' + ddec);
  // JPL Horizons geocentric airless apparent coordinates at this instant:
  // RA 117.38134 deg, Dec +21.05451 deg. orb.js omits light-time,
  // gravitational deflection and aberration, so use the documented 0.01 deg
  // low-precision tolerance.
  assert.ok(Math.abs(s2.ra * 15 - 117.38134) < 0.01, 'RA=' + s2.ra * 15);
  assert.ok(Math.abs(s2.dec - 21.05451) < 0.01, 'Dec=' + s2.dec);
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
