// Kepler solver test suite. Run with: node test/v4/kepler.mjs
//
// The universal-variable propagator is checked against a published
// worked example (Vallado, Fundamentals of Astrodynamics, ex. 2-4),
// against brute-force RK4 integration of the equations of motion
// (an independent method), and against the invariants of two-body
// motion: energy, angular momentum, orbit closure, time reversal,
// and continuity through e = 1.
import assert from 'assert';

import {
  propagateKepler, stateToElements, elementsToState,
  stumpffC, stumpffS, GM
} from '../../src/math/kepler.js';
import { DEG } from '../../src/math/angles.js';

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

const hyp = (a) => Math.hypot(a[0], a[1], a[2]);
const dif = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

// Vallado ex. 2-4 state: an e=0.008, i=98.6 deg low Earth orbit.
const R0 = [1131.340, -2282.343, 6672.423]; // km
const V0 = [-5.64305, 4.30333, 2.42879];    // km/s

test('propagation matches Vallado example 2-4', () => {
  // Published result for dt = 40 min (Vallado, 4th ed., ex. 2-4);
  // also reproduced by RK4 integration to ~1e-9 km.
  const { r, v } = propagateKepler(R0, V0, 40 * 60, GM.earth);
  assert.ok(dif(r, [-4219.7527, 4363.0292, -3958.7666]) < 1e-3, 'r: ' + r);
  assert.ok(dif(v, [3.689866, -1.916735, -6.112511]) < 1e-5, 'v: ' + v);
});

test('propagation matches brute-force RK4 for every conic type', () => {
  const acc = (r, mu) => {
    const k = -mu / Math.pow(hyp(r), 3);
    return [k * r[0], k * r[1], k * r[2]];
  };
  const rk4 = (r0, v0, dt, mu, steps) => {
    let r = [...r0], v = [...v0];
    const h = dt / steps;
    for (let i = 0; i < steps; i++) {
      const a1 = acc(r, mu);
      const r2 = r.map((x, j) => x + v[j] * h / 2), v2 = v.map((x, j) => x + a1[j] * h / 2);
      const a2 = acc(r2, mu);
      const r3 = r.map((x, j) => x + v2[j] * h / 2), v3 = v.map((x, j) => x + a2[j] * h / 2);
      const a3 = acc(r3, mu);
      const r4 = r.map((x, j) => x + v3[j] * h), v4 = v.map((x, j) => x + a3[j] * h);
      const a4 = acc(r4, mu);
      r = r.map((x, j) => x + h / 6 * (v[j] + 2 * v2[j] + 2 * v3[j] + v4[j]));
      v = v.map((x, j) => x + h / 6 * (a1[j] + 2 * a2[j] + 2 * a3[j] + a4[j]));
    }
    return { r, v };
  };
  const vesc = Math.sqrt(2 * GM.earth / 7000);
  const cases = [
    ['elliptic', R0, V0, 2400],
    ['hyperbolic', [7000, 0, 0], [0, 12.0, 1.0], 3600],
    ['near-parabolic bound', [7000, 0, 0], [0, vesc * (1 - 1e-8), 0], 7200],
    ['near-parabolic unbound', [7000, 0, 0], [0, vesc * (1 + 1e-8), 0], 7200]
  ];
  for (const [label, r0, v0, dt] of cases) {
    const k = propagateKepler(r0, v0, dt, GM.earth);
    const n = rk4(r0, v0, dt, GM.earth, 24000);
    assert.ok(dif(k.r, n.r) < 1e-4, `${label}: dr = ${dif(k.r, n.r)} km`);
    assert.ok(dif(k.v, n.v) < 1e-7, `${label}: dv = ${dif(k.v, n.v)} km/s`);
  }
});

test('energy and angular momentum are conserved', () => {
  const energy = (r, v, mu) => (v[0] * v[0] + v[1] * v[1] + v[2] * v[2]) / 2 - mu / hyp(r);
  const hmag = (r, v) => Math.hypot(
    r[1] * v[2] - r[2] * v[1], r[2] * v[0] - r[0] * v[2], r[0] * v[1] - r[1] * v[0]);
  for (const dt of [600, 86400, -3600]) {
    const { r, v } = propagateKepler(R0, V0, dt, GM.earth);
    assert.ok(Math.abs(energy(r, v, GM.earth) - energy(R0, V0, GM.earth)) < 1e-9, 'energy dt=' + dt);
    assert.ok(Math.abs(hmag(r, v) - hmag(R0, V0)) < 1e-6, 'h dt=' + dt);
  }
});

test('one full period closes an elliptic orbit; backward inverts forward', () => {
  const { period } = stateToElements({ r: R0, v: V0 }, GM.earth);
  assert.ok(Math.abs(period - 6080.7) < 0.5, 'period ' + period);
  const closed = propagateKepler(R0, V0, period, GM.earth);
  assert.ok(dif(closed.r, R0) < 1e-6, 'closure dr');
  const f = propagateKepler(R0, V0, 2400, GM.earth);
  const b = propagateKepler(f.r, f.v, -2400, GM.earth);
  assert.ok(dif(b.r, R0) < 1e-8 && dif(b.v, V0) < 1e-11, 'reversal');
});

test('propagation is continuous through e = 1', () => {
  // Two states straddling escape speed by +-1e-9 relative: after two
  // hours the positions must differ only by the (tiny) energy difference.
  const vesc = Math.sqrt(2 * GM.earth / 7000);
  const a = propagateKepler([7000, 0, 0], [0, vesc * (1 - 1e-9), 0], 7200, GM.earth);
  const b = propagateKepler([7000, 0, 0], [0, vesc * (1 + 1e-9), 0], 7200, GM.earth);
  assert.ok(dif(a.r, b.r) < 1e-2, 'dr across e=1: ' + dif(a.r, b.r) + ' km');
});

test('stumpff series agrees with the closed forms at the branch boundary', () => {
  const closedC = (z) => z > 0
    ? (1 - Math.cos(Math.sqrt(z))) / z
    : (Math.cosh(Math.sqrt(-z)) - 1) / -z;
  const closedS = (z) => {
    const s = Math.sqrt(Math.abs(z));
    return z > 0 ? (s - Math.sin(s)) / (s * s * s) : (Math.sinh(s) - s) / (s * s * s);
  };
  for (const z of [0.009999, -0.009999]) { // series branch, next to the cutover
    assert.ok(Math.abs(stumpffC(z) - closedC(z)) < 1e-12, 'C z=' + z);
    assert.ok(Math.abs(stumpffS(z) - closedS(z)) < 1e-12, 'S z=' + z);
  }
  assert.ok(Math.abs(stumpffC(0) - 0.5) < 1e-15);
  assert.ok(Math.abs(stumpffS(0) - 1 / 6) < 1e-15);
});

test('state -> elements -> state round-trips; elements are sane', () => {
  const el = stateToElements({ r: R0, v: V0 }, GM.earth);
  assert.ok(Math.abs(el.eccentricity - 0.0081) < 1e-4, 'e ' + el.eccentricity);
  assert.ok(Math.abs(el.inclination / DEG - 98.6) < 0.05, 'i ' + el.inclination / DEG);
  assert.ok(Math.abs(el.semiMajorAxis - 7200.5) < 1, 'a ' + el.semiMajorAxis);
  // acos-based angle extraction limits the round trip to ~1e-8 km
  // (sqrt-of-epsilon behaviour of acos near +-1, here at nu ~ 0)
  const { r, v } = elementsToState(el, GM.earth);
  assert.ok(dif(r, R0) < 1e-6 && dif(v, V0) < 1e-9, 'round trip');
});

test('degenerate geometries: circular and equatorial conventions', () => {
  const vc = Math.sqrt(GM.earth / 7000);
  // circular equatorial: position angle appears as trueAnomaly (true longitude)
  const ce = stateToElements({ r: [0, 7000, 0], v: [-vc, 0, 0] }, GM.earth);
  assert.ok(ce.eccentricity < 1e-12 && ce.inclination < 1e-12, 'circ eq');
  assert.ok(Math.abs(ce.trueAnomaly / DEG - 90) < 1e-6, 'true longitude');
  // circular inclined: trueAnomaly measured from the ascending node
  const ci = stateToElements({ r: [7000, 0, 0], v: [0, 0, vc] }, GM.earth);
  assert.ok(Math.abs(ci.inclination / DEG - 90) < 1e-9, 'polar');
  assert.ok(ci.trueAnomaly < 1e-9, 'at the node');
  // a parabola cannot be specified by semi-major axis
  assert.throws(() => elementsToState({
    semiMajorAxis: Infinity, eccentricity: 1, inclination: 0,
    raan: 0, argumentOfPerigee: 0, trueAnomaly: 0
  }, GM.earth), RangeError);
  // ... but semiLatusRectum works fine at e = 1
  const par = elementsToState({
    semiLatusRectum: 14000, eccentricity: 1, inclination: 0,
    raan: 0, argumentOfPerigee: 0, trueAnomaly: 0
  }, GM.earth);
  assert.ok(Math.abs(hyp(par.r) - 7000) < 1e-9, 'parabola perigee = p/2');
});

if (failures > 0) {
  console.error(failures + ' kepler test(s) failed');
  process.exit(1);
}
console.log('all kepler tests passed');
