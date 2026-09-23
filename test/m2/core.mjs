import assert from 'assert';
import { createRequire } from 'module';
import fs from 'fs';

import {
  elementsToState,
  GM,
  propagateKepler,
  stateToElements,
  stumpffC,
  stumpffS
} from '../../src/kepler/index.js';
import { AstroInstant } from '../../src/time/index.js';
import {
  adaptLegacyKepler,
  adaptLegacyMoon,
  adaptLegacyPlanet,
  adaptLegacySatellite,
  adaptLegacySun,
  transform
} from '../../src/frames/index.js';
import {
  AU_KM,
  earthEpv00,
  sunEpv00
} from '../../src/models/earth-epv00/index.js';

const require = createRequire(import.meta.url);
const Orb = require('../../dist/orb.js');
const vallado = JSON.parse(fs.readFileSync(
  new URL('../fixtures/vallado-kepler-4ed.json', import.meta.url),
  'utf8'
));
const legacy = JSON.parse(fs.readFileSync(
  new URL('../fixtures/orb-v3-kepler-baseline.json', import.meta.url),
  'utf8'
));
const epv00 = JSON.parse(fs.readFileSync(
  new URL('../fixtures/erfa-epv00-2.0.1.5.json', import.meta.url),
  'utf8'
));
const sgp4 = JSON.parse(fs.readFileSync(
  new URL('../fixtures/python-sgp4-2.27.json', import.meta.url),
  'utf8'
));
const horizonsSun = JSON.parse(fs.readFileSync(
  new URL('../fixtures/horizons-sun-2026-07-18.json', import.meta.url),
  'utf8'
));
const tests = [];

function test(name, run) {
  tests.push({ name, run });
}

function distance(a, b) {
  return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
}

function close(actual, expected, tolerance, label) {
  assert.ok(Math.abs(actual - expected) <= tolerance, `${label}: expected ${expected}, got ${actual}`);
}

function stateInvariants(r, v, mu) {
  const radius = Math.hypot(...r);
  const speedSquared = v[0] ** 2 + v[1] ** 2 + v[2] ** 2;
  const h = [
    r[1] * v[2] - r[2] * v[1],
    r[2] * v[0] - r[0] * v[2],
    r[0] * v[1] - r[1] * v[0]
  ];
  return {
    energy: speedSquared / 2 - mu / radius,
    angularMomentum: Math.hypot(...h)
  };
}

function acceleration(r, mu) {
  const factor = -mu / Math.hypot(...r) ** 3;
  return r.map((component) => factor * component);
}

function integrateRk4(r0, v0, dt, mu, steps) {
  let r = [...r0];
  let v = [...v0];
  const h = dt / steps;
  for (let step = 0; step < steps; step++) {
    const a1 = acceleration(r, mu);
    const r2 = r.map((value, index) => value + v[index] * h / 2);
    const v2 = v.map((value, index) => value + a1[index] * h / 2);
    const a2 = acceleration(r2, mu);
    const r3 = r.map((value, index) => value + v2[index] * h / 2);
    const v3 = v.map((value, index) => value + a2[index] * h / 2);
    const a3 = acceleration(r3, mu);
    const r4 = r.map((value, index) => value + v3[index] * h);
    const v4 = v.map((value, index) => value + a3[index] * h);
    const a4 = acceleration(r4, mu);
    r = r.map((value, index) => value + h / 6
      * (v[index] + 2 * v2[index] + 2 * v3[index] + v4[index]));
    v = v.map((value, index) => value + h / 6
      * (a1[index] + 2 * a2[index] + 2 * a3[index] + a4[index]));
  }
  return { r, v };
}

test('universal propagation matches Vallado example 2-4', () => {
  const actual = propagateKepler(
    vallado.initial.r,
    vallado.initial.v,
    vallado.elapsedSeconds,
    vallado.gm
  );
  assert.ok(distance(actual.r, vallado.expected.r) < vallado.tolerance.positionKm);
  assert.ok(distance(actual.v, vallado.expected.v) < vallado.tolerance.velocityKmPerSecond);
});

test('universal propagation agrees with independent RK4 across all conics', () => {
  const escapeSpeed = Math.sqrt(2 * GM.earth / 7000);
  const cases = [
    ['elliptic', vallado.initial.r, vallado.initial.v, 2400],
    ['hyperbolic', [7000, 0, 0], [0, 12, 1], 3600],
    ['near-parabolic bound', [7000, 0, 0], [0, escapeSpeed * (1 - 1e-8), 0], 7200],
    ['near-parabolic unbound', [7000, 0, 0], [0, escapeSpeed * (1 + 1e-8), 0], 7200]
  ];
  for (const [label, r0, v0, dt] of cases) {
    const universal = propagateKepler(r0, v0, dt, GM.earth);
    const numerical = integrateRk4(r0, v0, dt, GM.earth, 24000);
    assert.ok(distance(universal.r, numerical.r) < 1e-4, `${label} position`);
    assert.ok(distance(universal.v, numerical.v) < 1e-7, `${label} velocity`);
  }
});

test('energy, angular momentum, closure, and time reversal are preserved', () => {
  const initial = stateInvariants(vallado.initial.r, vallado.initial.v, GM.earth);
  for (const dt of [600, 86400, -3600]) {
    const state = propagateKepler(vallado.initial.r, vallado.initial.v, dt, GM.earth);
    const invariants = stateInvariants(state.r, state.v, GM.earth);
    close(invariants.energy, initial.energy, 1e-9, `energy dt=${dt}`);
    close(invariants.angularMomentum, initial.angularMomentum, 1e-6, `h dt=${dt}`);
  }
  const elements = stateToElements({ r: vallado.initial.r, v: vallado.initial.v }, GM.earth);
  const closed = propagateKepler(vallado.initial.r, vallado.initial.v, elements.period, GM.earth);
  assert.ok(distance(closed.r, vallado.initial.r) < 1e-6, 'period closure');
  const forward = propagateKepler(vallado.initial.r, vallado.initial.v, 2400, GM.earth);
  const backward = propagateKepler(forward.r, forward.v, -2400, GM.earth);
  assert.ok(distance(backward.r, vallado.initial.r) < 1e-8, 'position reversal');
  assert.ok(distance(backward.v, vallado.initial.v) < 1e-11, 'velocity reversal');
});

test('propagation remains continuous through eccentricity one', () => {
  const escapeSpeed = Math.sqrt(2 * GM.earth / 7000);
  const bound = propagateKepler([7000, 0, 0], [0, escapeSpeed * (1 - 1e-9), 0], 7200, GM.earth);
  const unbound = propagateKepler([7000, 0, 0], [0, escapeSpeed * (1 + 1e-9), 0], 7200, GM.earth);
  assert.ok(distance(bound.r, unbound.r) < 0.01);
});

test('Stumpff functions are continuous and accurate around zero', () => {
  const closedC = (z) => z > 0
    ? (1 - Math.cos(Math.sqrt(z))) / z
    : (Math.cosh(Math.sqrt(-z)) - 1) / -z;
  const closedS = (z) => {
    const root = Math.sqrt(Math.abs(z));
    return z > 0
      ? (root - Math.sin(root)) / root ** 3
      : (Math.sinh(root) - root) / root ** 3;
  };
  for (const z of [0.099, -0.099]) {
    close(stumpffC(z), closedC(z), 1e-14, `C(${z})`);
    close(stumpffS(z), closedS(z), 1e-14, `S(${z})`);
  }
  close(stumpffC(0), 0.5, 1e-15, 'C(0)');
  close(stumpffS(0), 1 / 6, 1e-15, 'S(0)');
});

test('state and element conversions round-trip with declared singular conventions', () => {
  const elements = stateToElements({ r: vallado.initial.r, v: vallado.initial.v }, GM.earth);
  const restored = elementsToState(elements, GM.earth);
  assert.ok(distance(restored.r, vallado.initial.r) < 1e-8);
  assert.ok(distance(restored.v, vallado.initial.v) < 1e-11);

  const circularSpeed = Math.sqrt(GM.earth / 7000);
  const circularEquatorial = stateToElements({
    r: [0, 7000, 0],
    v: [-circularSpeed, 0, 0]
  }, GM.earth);
  assert.ok(circularEquatorial.eccentricity < 1e-12);
  assert.strictEqual(circularEquatorial.raan, 0);
  assert.strictEqual(circularEquatorial.argumentOfPeriapsis, 0);
  close(circularEquatorial.trueAnomaly, Math.PI / 2, 1e-12, 'true longitude');

  const parabolic = elementsToState({
    semiLatusRectum: 14000,
    eccentricity: 1,
    inclination: 0,
    raan: 0,
    argumentOfPeriapsis: 0,
    trueAnomaly: 0
  }, GM.earth);
  close(Math.hypot(...parabolic.r), 7000, 1e-9, 'parabolic periapsis');
});

test('invalid and non-convergent inputs fail explicitly', () => {
  assert.throws(() => propagateKepler([0, 0, 0], [0, 1, 0], 1, GM.earth), /must not be zero/);
  assert.throws(() => propagateKepler([7000, 0, 0], [0, 1, 0], 1, 0), /greater than zero/);
  assert.throws(() => propagateKepler([7000, 0], [0, 1, 0], 1, GM.earth), /3-vector/);
  assert.throws(
    () => propagateKepler(vallado.initial.r, vallado.initial.v, 2400, GM.earth, { maxIterations: 1 }),
    /no convergence/
  );
  assert.throws(
    () => elementsToState({ semiMajorAxis: Infinity, eccentricity: 1, trueAnomaly: 0 }, GM.earth),
    /parabola requires/
  );
  assert.throws(() => stateToElements({ r: [7000, 0, 0], v: [1, 0, 0] }, GM.earth), /radial/);
});

test('legacy Orb.Kepler stays within the frozen v3 compatibility envelope', () => {
  const epochMs = Date.parse('2026-07-18T00:00:00Z');
  for (const orbit of Object.values(legacy.orbits)) {
    const elements = { ...legacy.common, ...orbit.elements };
    const instance = new Orb.Kepler(elements);
    for (const expected of orbit.states) {
      const actual = instance.xyz(new Date(epochMs + expected.days * 86400000));
      assert.ok(distance([actual.x, actual.y, actual.z], expected.r) <= legacy.tolerance.positionAu);
      assert.ok(distance([actual.xdot, actual.ydot, actual.zdot], expected.v)
        <= legacy.tolerance.velocityAuPerDay);
    }
  }
});

test('optional EPV00 Earth matches ERFA and has an analytic velocity', () => {
  for (const reference of epv00.cases) {
    const instant = AstroInstant.fromISO(reference.utc);
    const state = earthEpv00.state(instant);
    assert.strictEqual(state.frame, 'equatorial-j2000');
    assert.strictEqual(state.center, 'sun');
    for (let index = 0; index < 3; index++) {
      close(
        state.r[index] / AU_KM,
        reference.positionAu[index],
        epv00.tolerance.componentAu,
        `EPV00 r[${index}]`
      );
      close(
        state.v[index] * 86400 / AU_KM,
        reference.velocityAuPerDay[index],
        epv00.tolerance.componentAuPerDay,
        `EPV00 v[${index}]`
      );
    }
    const before = earthEpv00.state(instant.addSeconds(-60)).r;
    const after = earthEpv00.state(instant.addSeconds(60)).r;
    for (let index = 0; index < 3; index++) {
      close(
        state.v[index],
        (after[index] - before[index]) / 120,
        epv00.tolerance.analyticVelocityKmPerSecond,
        `EPV00 derivative[${index}]`
      );
    }
  }
});

test('optional EPV00 Sun is exactly the negated geocentric Earth state', () => {
  const instant = AstroInstant.fromISO(epv00.cases[0].utc);
  const earth = earthEpv00.state(instant);
  const sun = sunEpv00.state(instant);
  assert.strictEqual(sun.frame, earth.frame);
  assert.strictEqual(sun.center, 'earth');
  for (let index = 0; index < 3; index++) {
    assert.strictEqual(sun.r[index], -earth.r[index]);
    assert.strictEqual(sun.v[index], -earth.v[index]);
  }
  assert.strictEqual(Orb.earthEpv00, undefined);
  assert.strictEqual(Orb.sunEpv00, undefined);
});

test('optional EPV00 Sun agrees with the independent Horizons sky position', () => {
  const instant = AstroInstant.fromISO(horizonsSun.instant);
  const ofDate = transform(sunEpv00.state(instant), { frame: 'equatorial-of-date' });
  const range = Math.hypot(...ofDate.r);
  const rightAscension = ((Math.atan2(ofDate.r[1], ofDate.r[0]) * 180 / Math.PI) + 360) % 360;
  const declination = Math.asin(ofDate.r[2] / range) * 180 / Math.PI;
  const rightAscensionResidual = Math.abs(
    ((rightAscension - horizonsSun.expected.rightAscensionDeg + 540) % 360) - 180
  );
  assert.ok(rightAscensionResidual < horizonsSun.tolerance.vsopPipelineAngleDeg);
  assert.ok(Math.abs(declination - horizonsSun.expected.declinationDeg)
    < horizonsSun.tolerance.vsopPipelineAngleDeg);
  assert.ok(Math.abs(range / AU_KM - horizonsSun.expected.rangeAu)
    < horizonsSun.tolerance.legacyRangeAu);
});

test('legacy body adapters provide explicit structured states', () => {
  const instant = AstroInstant.fromISO('2026-07-18T00:00:00Z');
  const bodies = [
    [adaptLegacyPlanet(new Orb.Mars(), { name: 'mars' }), 'ecliptic-j2000', 'sun', false],
    [adaptLegacyMoon(new Orb.Moon()), 'ecliptic-of-date', 'earth', false],
    [adaptLegacySun(new Orb.Sun()), 'equatorial-of-date', 'earth', false],
    [adaptLegacyKepler(new Orb.Kepler({
      eccentricity: 0.4,
      semi_major_axis: 2.3,
      inclination: 31,
      argument_of_periapsis: 47,
      longitude_of_ascending_node: 123,
      mean_anomaly: 37,
      epoch: legacy.epochJd
    }), { name: 'test-orbit' }), 'ecliptic-j2000', 'sun', true]
  ];
  const iss = sgp4.cases.find((item) => item.id === 'iss-near-earth');
  const satellite = new Orb.SGP4({ first_line: iss.line1, second_line: iss.line2 });
  bodies.push([
    adaptLegacySatellite(satellite, { name: 'iss' }),
    'teme',
    'earth',
    true,
    AstroInstant.fromISO(satellite.omm.EPOCH).addDays(1)
  ]);
  for (const [body, frame, center, hasVelocity, time = instant] of bodies) {
    const state = body.state(time);
    assert.strictEqual(state.frame, frame);
    assert.strictEqual(state.center, center);
    assert.ok(state.r instanceof Float64Array);
    assert.ok([...state.r].every(Number.isFinite));
    assert.strictEqual(state.v instanceof Float64Array, hasVelocity);
  }
});

let failures = 0;
for (const { name, run } of tests) {
  try {
    await run();
    console.log(`ok - M2 ${name}`);
  } catch (error) {
    failures++;
    console.error(`NG - M2 ${name}: ${error.stack ?? error.message}`);
  }
}

if (failures > 0) {
  console.error(`${failures} of ${tests.length} M2 test(s) failed`);
  process.exitCode = 1;
} else {
  console.log('all M2 tests passed');
}
