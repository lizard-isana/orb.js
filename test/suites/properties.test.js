'use strict';

const assert = require('assert');
const Orb = require('../../dist/orb.js');
const { test } = require('../helpers/harness.js');

function wrappedHoursDifference(a, b) {
  return ((a - b + 36) % 24) - 12;
}

function norm3(value) {
  return Math.hypot(value.x, value.y, value.z);
}

function stateInvariants(state) {
  const radius = Math.hypot(state.x, state.y, state.z);
  const speedSquared = state.xdot ** 2 + state.ydot ** 2 + state.zdot ** 2;
  const hx = state.y * state.zdot - state.z * state.ydot;
  const hy = state.z * state.xdot - state.x * state.zdot;
  const hz = state.x * state.ydot - state.y * state.xdot;
  return {
    energy: speedSquared / 2 - Orb.Constant.GM / radius,
    angularMomentum: Math.hypot(hx, hy, hz),
    radius,
    speed: Math.sqrt(speedSquared)
  };
}

test('property: RA/Dec and rectangular coordinates round trip', () => {
  const cases = [
    { ra: 0, dec: 0, distance: 1 },
    { ra: 6.45, dec: -16.72, distance: 2.5 },
    { ra: 12.25, dec: 70, distance: 400000 },
    { ra: 23.999, dec: -80, distance: 0.1 }
  ];

  for (const source of cases) {
    const rectangular = Orb.RadecToXYZ({ ...source, unit_keywords: 'km' });
    const roundTrip = Orb.XYZtoRadec(rectangular);
    assert.ok(Math.abs(wrappedHoursDifference(roundTrip.ra, source.ra)) < 1e-12);
    assert.ok(Math.abs(roundTrip.dec - source.dec) < 1e-12);
    assert.ok(Math.abs(roundTrip.distance - source.distance) < Math.max(1, source.distance) * 1e-14);
  }
});

test('property: ecliptic/equatorial plane conversion preserves vectors', () => {
  const dates = [
    new Date('1987-04-10T19:21:00Z'),
    new Date('2000-01-01T12:00:00Z'),
    new Date('2026-07-18T00:00:00Z'),
    new Date('2050-01-01T00:00:00Z')
  ];
  const vectors = [
    { x: 1, y: 0, z: 0 },
    { x: 0.5, y: -0.8, z: 0.1 },
    { x: -1234, y: 5678, z: -3456 }
  ];

  for (const date of dates) {
    for (const epoch of ['j2000', 'of_date']) {
      for (const source of vectors) {
        const equatorial = Orb.ConvertRectangularPlane({
          position: source,
          from_plane: 'ecliptic',
          to_plane: 'equatorial',
          date,
          epoch
        });
        const roundTrip = Orb.ConvertRectangularPlane({
          position: equatorial,
          from_plane: 'equatorial',
          to_plane: 'ecliptic',
          date,
          epoch
        });
        const tolerance = Math.max(1, norm3(source)) * 1e-14;
        assert.ok(Math.abs(roundTrip.x - source.x) < tolerance);
        assert.ok(Math.abs(roundTrip.y - source.y) < tolerance);
        assert.ok(Math.abs(roundTrip.z - source.z) < tolerance);
        assert.ok(Math.abs(norm3(equatorial) - norm3(source)) < tolerance);
      }
    }
  }
});

test('property: compatible ecliptic/equatorial round trips preserve the coordinate center', () => {
  const date = new Date('2026-07-18T00:00:00Z');
  const vector = {
    x: 0.0025,
    y: 0.0003,
    z: -0.0002,
    date,
    coordinate_keywords: 'ecliptic rectangular',
    unit_keywords: 'au'
  };
  for (const metadata of [
    { center: 'earth' },
    { center_keywords: 'earth' },
    { origin: 'geocentric' }
  ]) {
    const source = { ...vector, ...metadata };
    const equatorial = Orb.EclipticToEquatorial({ date, ecliptic: source });
    const ecliptic = Orb.EquatorialToEcliptic({ date, equatorial });
    const roundTrip = Orb.EclipticToEquatorial({ date, ecliptic });

    for (const [key, value] of Object.entries(metadata)) {
      assert.strictEqual(ecliptic[key], value);
    }
    assert.strictEqual(ecliptic.center_keywords, 'earth');
    assert.strictEqual(roundTrip.center_keywords, 'earth');
    assert.ok(Math.abs(roundTrip.x - equatorial.x) < 1e-15);
    assert.ok(Math.abs(roundTrip.y - equatorial.y) < 1e-15);
    assert.ok(Math.abs(roundTrip.z - equatorial.z) < 1e-15);
  }

  const planeRotation = Orb.ConvertRectangularPlane({
    position: { ...vector, center_keywords: 'earth' },
    from_plane: 'ecliptic',
    to_plane: 'equatorial',
    date
  });
  assert.strictEqual(planeRotation.center_keywords, 'earth');
});

test('property: J2000-to-date rotation preserves vector length', () => {
  const vectors = [
    { x: 1, y: 2, z: 3 },
    { x: -0.5, y: 0.25, z: 0.125 },
    { x: 7000, y: -1200, z: 500 }
  ];
  const dates = [
    new Date('1987-04-10T19:21:00Z'),
    new Date('2026-07-18T00:00:00Z'),
    new Date('2050-01-01T00:00:00Z')
  ];

  for (const source of vectors) {
    for (const date of dates) {
      const transformed = Orb.EclipticJ2000ToDate(source, date);
      const tolerance = Math.max(1, norm3(source)) * 1e-14;
      assert.ok(Math.abs(norm3(transformed) - norm3(source)) < tolerance);
    }
  }
});

test('property: precession round trip returns the original direction', () => {
  const j2000 = new Date('2000-01-01T12:00:00Z');
  const dates = [
    new Date('1987-04-10T19:21:00Z'),
    new Date('2026-07-18T00:00:00Z'),
    new Date('2050-01-01T00:00:00Z')
  ];
  const directions = [
    { ra: 0, dec: 0 },
    { ra: 6.45, dec: -16.72 },
    { ra: 23.9, dec: 70 }
  ];

  for (const date of dates) {
    for (const source of directions) {
      const ofDate = Orb.Precession({ ...source, distance: 1, from: j2000, to: date });
      const roundTrip = Orb.Precession({
        ra: ofDate.ra,
        dec: ofDate.dec,
        distance: ofDate.distance,
        from: date,
        to: j2000
      });
      assert.ok(Math.abs(wrappedHoursDifference(roundTrip.ra, source.ra)) < 1e-12);
      assert.ok(Math.abs(roundTrip.dec - source.dec) < 1e-12);
    }
  }
});

test('property: Kepler energy and angular momentum are conserved for all conics', () => {
  const epochDate = new Date('2026-07-18T00:00:00Z');
  const epoch = new Orb.Time(epochDate).jd();
  const common = {
    inclination: 31,
    argument_of_periapsis: 47,
    longitude_of_ascending_node: 123
  };
  const cases = [
    new Orb.Kepler({ ...common, eccentricity: 0.4, semi_major_axis: 2.3, mean_anomaly: 0, epoch }),
    new Orb.Kepler({ ...common, eccentricity: 1, periapsis_distance: 0.8, time_of_periapsis: epoch }),
    new Orb.Kepler({ ...common, eccentricity: 1.4, periapsis_distance: 0.8, time_of_periapsis: epoch })
  ];
  const offsets = [-100, -10, 0, 10, 100];

  for (const orbit of cases) {
    const invariants = offsets.map((days) => stateInvariants(
      orbit.xyz(new Date(epochDate.getTime() + days * 86400000))
    ));
    const reference = invariants[0];
    for (const value of invariants.slice(1)) {
      assert.ok(Math.abs(value.energy - reference.energy) < 1e-14);
      assert.ok(Math.abs(value.angularMomentum - reference.angularMomentum) < 1e-14);
    }
  }
});

test('property: periapsis-centered Kepler propagation is time symmetric', () => {
  const epochDate = new Date('2026-07-18T00:00:00Z');
  const epoch = new Orb.Time(epochDate).jd();
  const common = {
    inclination: 31,
    argument_of_periapsis: 47,
    longitude_of_ascending_node: 123
  };
  const cases = [
    new Orb.Kepler({ ...common, eccentricity: 0.4, semi_major_axis: 2.3, mean_anomaly: 0, epoch }),
    new Orb.Kepler({ ...common, eccentricity: 1, periapsis_distance: 0.8, time_of_periapsis: epoch }),
    new Orb.Kepler({ ...common, eccentricity: 1.4, periapsis_distance: 0.8, time_of_periapsis: epoch })
  ];

  for (const orbit of cases) {
    for (const days of [1, 10, 100]) {
      const before = stateInvariants(orbit.xyz(new Date(epochDate.getTime() - days * 86400000)));
      const after = stateInvariants(orbit.xyz(new Date(epochDate.getTime() + days * 86400000)));
      assert.ok(Math.abs(before.radius - after.radius) < 1e-12);
      assert.ok(Math.abs(before.speed - after.speed) < 1e-12);
    }
  }
});
