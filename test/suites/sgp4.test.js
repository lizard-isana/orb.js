'use strict';

const assert = require('assert');
const Orb = require('../../dist/orb.js');
const { test } = require('../helpers/harness.js');
const { ISS_TLE } = require('../helpers/sgp4-fixtures.js');

test('SGP4 parses TLE fields', () => {
  const sat = new Orb.SGP4(ISS_TLE);
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
    second_line: ISS_TLE.second_line
  });
  assert.ok(Math.abs(sat2.omm.MEAN_MOTION_DDOT - (-0.12345e-4)) < 1e-12);
});

test('SGP4 decodes Alpha-5 catalog numbers', () => {
  // Catalog numbers above 99999 use Alpha-5 in TLE columns 3-7: the leading
  // digit becomes a capital letter, skipping I and O. A=10 ... Z=33.
  const alpha5Tle = {
    name: 'ALPHA5 SAT',
    first_line: '1 E7527U 26100A   20014.52632156  .00016717  00000-0  10270-3 0  9015',
    second_line: '2 E7527  51.6461 339.7757 0004871 129.9343 313.3229 15.49208144 10428'
  };
  const sat = new Orb.SGP4(alpha5Tle);
  assert.strictEqual(sat.omm.NORAD_CAT_ID, 147527);
  assert.strictEqual(sat.orbital_elements.catalog_number, 147527);
  const decoded = sat.DecodeTLE();
  assert.strictEqual(decoded.catalog_no_1, 147527);
  assert.strictEqual(decoded.catalog_no_2, 147527);

  // Boundaries of the Alpha-5 range.
  assert.strictEqual(Orb.ParseCatalogNumber('A0000'), 100000);
  assert.strictEqual(Orb.ParseCatalogNumber('Z9999'), 339999);
  // I and O are never used, so they must not decode as letters.
  assert.ok(Number.isNaN(Orb.ParseCatalogNumber('I0000')));
  assert.ok(Number.isNaN(Orb.ParseCatalogNumber('O0000')));
  // Classic numeric ids are unchanged.
  assert.strictEqual(Orb.ParseCatalogNumber('25544'), 25544);
  assert.strictEqual(Orb.ParseCatalogNumber('00005'), 5);
});

test('SDP4 deep space matches python-sgp4 reference vectors', () => {
  // Reference states generated with python-sgp4 2.27 (Vallado reference
  // implementation) at tsince = 360 and 4320 minutes from epoch.
  const cases = [
    { name: 'GEO (24h resonance)',
      tle: ['1 90001U 20001A   20014.50000000  .00000000  00000-0  00000-0 0  9995',
            '2 90001   1.0000  90.0000 0001000  50.0000 310.0000  1.00270000  8031'],
      states: { 360: [-42154.26042654016, -197.88391977789678, 749.0506370984336],
                4320: [-2167.1609784046923, 42106.15401288822, 47.44802877139221] } },
    { name: 'Molniya (12h resonance)',
      tle: ['1 90002U 20002A   20014.50000000  .00000000  00000-0  10000-3 0  9996',
            '2 90002  63.4000 120.0000 7200000 270.0000  10.0000  2.00600000  8032'],
      states: { 360: [-16656.757177462827, -11880.225956933378, 40691.099555122266],
                4320: [-6926.438107614998, 11450.802317334232, 721.0398899302185] } },
    { name: 'GPS-like (deep, non-resonant)',
      tle: ['1 90003U 20003A   20014.50000000  .00000000  00000-0  00000-0 0  9997',
            '2 90003  55.0000 200.0000 0100000  60.0000 300.0000  2.00560000  8033'],
      states: { 360: [24939.673250260297, 9510.387469057981, -585.7204214052479],
                4320: [-24265.237776123966, -10230.032079296045, 1950.8012690221706] } }
  ];
  for (const c of cases) {
    const sat = new Orb.SGP4({ first_line: c.tle[0], second_line: c.tle[1] });
    assert.strictEqual(sat.sgp4.method, 'd', c.name + ' must use deep space');
    for (const [tsince, r] of Object.entries(c.states)) {
      const date = new Date(sat.ParseEpoch().getTime() + Number(tsince) * 60000);
      const p = sat.xyz(date);
      const dr = Math.hypot(p.x - r[0], p.y - r[1], p.z - r[2]);
      assert.ok(dr < 1e-6, c.name + ' tsince=' + tsince + ' dr=' + dr + ' km');
    }
  }
});

test('SGP4 near-earth matches python-sgp4 reference vector', () => {
  // python-sgp4 2.27, ISS TLE, tsince = 1440 min
  const sat = new Orb.SGP4(ISS_TLE);
  const date = new Date(sat.ParseEpoch().getTime() + 1440 * 60000);
  const p = sat.xyz(date);
  const dr = Math.hypot(p.x - (-5864.673756515094), p.y - (-3424.3178193580643), p.z - (-223.71977790043377));
  assert.ok(dr < 1e-6, 'dr=' + dr + ' km');
});

test('SGP4 propagates ISS to a plausible LEO state', () => {
  const sat = new Orb.SGP4(ISS_TLE);
  const p = sat.xyz(new Date(Date.UTC(2020, 0, 14, 12, 40, 0)));
  const r = Math.hypot(p.x, p.y, p.z);
  const v = Math.hypot(p.xdot, p.ydot, p.zdot);
  assert.ok(r > 6650 && r < 6850, 'r=' + r);
  assert.ok(v > 7.5 && v < 7.8, 'v=' + v);
  const g = sat.latlng(new Date(Date.UTC(2020, 0, 14, 12, 40, 0)));
  assert.ok(Math.abs(g.latitude) <= 51.7, 'latitude=' + g.latitude);
  assert.ok(g.altitude > 400 && g.altitude < 440, 'altitude=' + g.altitude);
});
