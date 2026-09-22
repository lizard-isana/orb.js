import {
  add,
  cross,
  dot,
  norm,
  rotateX,
  rotateZ,
  scale
} from '../frames/vector.js';
import { normalizeAngle, TWO_PI } from '../frames/angles.js';

export const GM = Object.freeze({
  sun: 1.32712440018e11,
  earth: 398600.4418,
  moon: 4902.800066
});

const DEFAULT_MAX_ITERATIONS = 100;
const DEFAULT_TOLERANCE = 1e-12;
const SINGULAR_TOLERANCE = 1e-10;

function requireFinite(value, label) {
  if (!Number.isFinite(value)) throw new TypeError(`${label} must be finite`);
  return value;
}

function requirePositive(value, label) {
  requireFinite(value, label);
  if (value <= 0) throw new RangeError(`${label} must be greater than zero`);
  return value;
}

function requireVector(value, label) {
  if (!value || value.length !== 3) throw new TypeError(`${label} must be a 3-vector`);
  const vector = Float64Array.from(value);
  for (let index = 0; index < 3; index++) requireFinite(vector[index], `${label}[${index}]`);
  return vector;
}

export function stumpffC(z) {
  requireFinite(z, 'stumpffC: z');
  if (Math.abs(z) <= 0.1) {
    let term = 0.5;
    let sum = term;
    for (let k = 1; k < 16; k++) {
      term *= -z / ((2 * k + 1) * (2 * k + 2));
      sum += term;
      if (Math.abs(term) <= Number.EPSILON * Math.abs(sum)) break;
    }
    return sum;
  }
  if (z > 0) return (1 - Math.cos(Math.sqrt(z))) / z;
  const root = Math.sqrt(-z);
  return (Math.cosh(root) - 1) / -z;
}

export function stumpffS(z) {
  requireFinite(z, 'stumpffS: z');
  if (Math.abs(z) <= 0.1) {
    let term = 1 / 6;
    let sum = term;
    for (let k = 1; k < 16; k++) {
      term *= -z / ((2 * k + 2) * (2 * k + 3));
      sum += term;
      if (Math.abs(term) <= Number.EPSILON * Math.abs(sum)) break;
    }
    return sum;
  }
  if (z > 0) {
    const root = Math.sqrt(z);
    return (root - Math.sin(root)) / (root ** 3);
  }
  const root = Math.sqrt(-z);
  return (Math.sinh(root) - root) / (root ** 3);
}

function initialUniversalAnomaly(alpha, radius, radialDot, dt, mu) {
  const sign = Math.sign(dt) || 1;
  const sqrtMu = Math.sqrt(mu);
  if (alpha > 1e-12) return sqrtMu * alpha * dt;
  if (alpha < -1e-12) {
    const semiMajorAxis = 1 / alpha;
    const numerator = -2 * mu * alpha * dt;
    const denominator = radialDot
      + sign * Math.sqrt(-mu * semiMajorAxis) * (1 - radius * alpha);
    const argument = numerator / denominator;
    if (argument > 0 && Number.isFinite(argument)) {
      return sign * Math.sqrt(-semiMajorAxis) * Math.log(argument);
    }
    return sign * sqrtMu * Math.abs(alpha) * Math.abs(dt);
  }
  return sqrtMu * dt / radius;
}

function universalEquation(chi, alpha, radius, radialDot, dt, sqrtMu) {
  const z = alpha * chi * chi;
  if (!Number.isFinite(z)) {
    return {
      F: Math.sign(chi) * Infinity,
      derivative: Infinity,
      z,
      C: Infinity,
      S: Infinity
    };
  }
  const C = stumpffC(z);
  const S = stumpffS(z);
  const F = (radialDot / sqrtMu) * chi * chi * C
    + (1 - alpha * radius) * chi ** 3 * S
    + radius * chi
    - sqrtMu * dt;
  const derivative = (radialDot / sqrtMu) * chi * (1 - z * S)
    + (1 - alpha * radius) * chi * chi * C
    + radius;
  return { F, derivative, z, C, S };
}

function solveUniversalAnomaly(alpha, radius, radialDot, dt, mu, options) {
  const maxIterations = options.maxIterations ?? DEFAULT_MAX_ITERATIONS;
  const tolerance = options.tolerance ?? DEFAULT_TOLERANCE;
  if (!Number.isInteger(maxIterations) || maxIterations < 1 || maxIterations > 10000) {
    throw new RangeError('propagateKepler: maxIterations must be an integer from 1 to 10000');
  }
  requirePositive(tolerance, 'propagateKepler: tolerance');

  const sqrtMu = Math.sqrt(mu);
  const guess = initialUniversalAnomaly(alpha, radius, radialDot, dt, mu);
  let lower;
  let upper;
  if (dt > 0) {
    lower = 0;
    upper = Math.max(1, Math.abs(guess));
    for (let count = 0; count < maxIterations; count++) {
      const value = universalEquation(upper, alpha, radius, radialDot, dt, sqrtMu).F;
      if (!Number.isFinite(value) || value >= 0) break;
      upper *= 2;
      if (!Number.isFinite(upper)) throw new RangeError('propagateKepler: could not bracket the solution');
    }
    const upperResidual = universalEquation(upper, alpha, radius, radialDot, dt, sqrtMu).F;
    if (Number.isFinite(upperResidual) && upperResidual < 0) {
      throw new RangeError('propagateKepler: could not bracket the solution');
    }
  } else {
    upper = 0;
    lower = -Math.max(1, Math.abs(guess));
    for (let count = 0; count < maxIterations; count++) {
      const value = universalEquation(lower, alpha, radius, radialDot, dt, sqrtMu).F;
      if (!Number.isFinite(value) || value <= 0) break;
      lower *= 2;
      if (!Number.isFinite(lower)) throw new RangeError('propagateKepler: could not bracket the solution');
    }
    const lowerResidual = universalEquation(lower, alpha, radius, radialDot, dt, sqrtMu).F;
    if (Number.isFinite(lowerResidual) && lowerResidual > 0) {
      throw new RangeError('propagateKepler: could not bracket the solution');
    }
  }

  let chi = Math.min(upper, Math.max(lower, guess));
  if (chi === lower || chi === upper || !Number.isFinite(chi)) chi = (lower + upper) / 2;
  const residualScale = Math.max(1, Math.abs(sqrtMu * dt));
  for (let iteration = 0; iteration < maxIterations; iteration++) {
    const value = universalEquation(chi, alpha, radius, radialDot, dt, sqrtMu);
    if (Number.isFinite(value.F)) {
      if (Math.abs(value.F) <= tolerance * residualScale) return chi;
      if (value.F < 0) lower = chi;
      else upper = chi;
    } else if (chi > 0) {
      upper = chi;
    } else {
      lower = chi;
    }

    let candidate = Number.isFinite(value.F) && Number.isFinite(value.derivative) && value.derivative > 0
      ? chi - value.F / value.derivative
      : Number.NaN;
    if (!Number.isFinite(candidate) || candidate <= lower || candidate >= upper) {
      candidate = (lower + upper) / 2;
    }
    if (Math.abs(candidate - chi) <= tolerance * (1 + Math.abs(candidate))) {
      const candidateResidual = universalEquation(
        candidate,
        alpha,
        radius,
        radialDot,
        dt,
        sqrtMu
      ).F;
      if (Number.isFinite(candidateResidual)
        && Math.abs(candidateResidual) <= tolerance * residualScale) return candidate;
    }
    chi = candidate;
  }
  throw new RangeError(`propagateKepler: no convergence after ${maxIterations} iterations`);
}

export function propagateKepler(r0Input, v0Input, dtSeconds, mu, options = {}) {
  const r0 = requireVector(r0Input, 'propagateKepler: r0');
  const v0 = requireVector(v0Input, 'propagateKepler: v0');
  requireFinite(dtSeconds, 'propagateKepler: dtSeconds');
  requirePositive(mu, 'propagateKepler: mu');
  const r0Magnitude = norm(r0);
  if (r0Magnitude === 0) throw new RangeError('propagateKepler: initial position must not be zero');
  if (dtSeconds === 0) return { r: r0, v: v0 };

  const speedSquared = dot(v0, v0);
  const alpha = 2 / r0Magnitude - speedSquared / mu;
  const radialDot = dot(r0, v0);
  const sqrtMu = Math.sqrt(mu);
  const chi = solveUniversalAnomaly(alpha, r0Magnitude, radialDot, dtSeconds, mu, options);
  const z = alpha * chi * chi;
  const C = stumpffC(z);
  const S = stumpffS(z);
  const f = 1 - chi * chi / r0Magnitude * C;
  const g = dtSeconds - chi ** 3 / sqrtMu * S;
  const r = add(scale(r0, f), scale(v0, g));
  const radius = norm(r);
  if (!Number.isFinite(radius) || radius === 0) {
    throw new RangeError('propagateKepler: propagation reached a singular position');
  }
  const fdot = sqrtMu / (radius * r0Magnitude) * chi * (z * S - 1);
  const gdot = 1 - chi * chi / radius * C;
  const v = add(scale(r0, fdot), scale(v0, gdot));
  if (![...r, ...v].every(Number.isFinite)) {
    throw new RangeError('propagateKepler: non-finite result');
  }
  return { r, v };
}

function orientedAngle(from, to, normal) {
  const fromMagnitude = norm(from);
  const toMagnitude = norm(to);
  const normalMagnitude = norm(normal);
  const cosine = dot(from, to) / (fromMagnitude * toMagnitude);
  const sine = dot(cross(from, to), normal) / (fromMagnitude * toMagnitude * normalMagnitude);
  return normalizeAngle(Math.atan2(sine, cosine));
}

export function stateToElements(state, mu) {
  if (!state || typeof state !== 'object') throw new TypeError('stateToElements: state is required');
  const r = requireVector(state.r, 'stateToElements: r');
  const v = requireVector(state.v, 'stateToElements: v');
  requirePositive(mu, 'stateToElements: mu');
  const radius = norm(r);
  if (radius === 0) throw new RangeError('stateToElements: position must not be zero');
  const h = cross(r, v);
  const hMagnitude = norm(h);
  if (hMagnitude <= Number.EPSILON * radius * Math.max(1, norm(v))) {
    throw new RangeError('stateToElements: radial trajectories have undefined classical elements');
  }
  const node = Float64Array.of(-h[1], h[0], 0);
  const nodeMagnitude = norm(node);
  const eccentricityVector = add(scale(cross(v, h), 1 / mu), scale(r, -1 / radius));
  const eccentricity = norm(eccentricityVector);
  const energy = dot(v, v) / 2 - mu / radius;
  const inclination = Math.atan2(Math.hypot(h[0], h[1]), h[2]);
  const circular = eccentricity < SINGULAR_TOLERANCE;
  const equatorial = nodeMagnitude < SINGULAR_TOLERANCE * hMagnitude;

  const raan = equatorial ? 0 : normalizeAngle(Math.atan2(node[1], node[0]));
  let argumentOfPeriapsis = 0;
  let trueAnomaly;
  if (!circular && !equatorial) {
    argumentOfPeriapsis = orientedAngle(node, eccentricityVector, h);
    trueAnomaly = orientedAngle(eccentricityVector, r, h);
  } else if (!circular) {
    argumentOfPeriapsis = normalizeAngle(
      Math.atan2(eccentricityVector[1], eccentricityVector[0]) * Math.sign(h[2] || 1)
    );
    trueAnomaly = orientedAngle(eccentricityVector, r, h);
  } else if (!equatorial) {
    trueAnomaly = orientedAngle(node, r, h);
  } else {
    trueAnomaly = normalizeAngle(Math.atan2(r[1], r[0]) * Math.sign(h[2] || 1));
  }

  const energyScale = mu / radius;
  const parabolic = Math.abs(energy) <= SINGULAR_TOLERANCE * energyScale;
  const semiMajorAxis = parabolic ? Infinity : -mu / (2 * energy);
  return {
    semiMajorAxis,
    semiLatusRectum: hMagnitude ** 2 / mu,
    eccentricity,
    inclination,
    raan,
    argumentOfPeriapsis,
    trueAnomaly,
    period: !parabolic && semiMajorAxis > 0
      ? TWO_PI * Math.sqrt(semiMajorAxis ** 3 / mu)
      : null
  };
}

export function elementsToState(elements, mu) {
  if (!elements || typeof elements !== 'object') throw new TypeError('elementsToState: elements are required');
  requirePositive(mu, 'elementsToState: mu');
  const eccentricity = requireFinite(elements.eccentricity, 'elementsToState: eccentricity');
  if (eccentricity < 0) throw new RangeError('elementsToState: eccentricity must not be negative');
  const inclination = requireFinite(elements.inclination ?? 0, 'elementsToState: inclination');
  const raan = requireFinite(elements.raan ?? 0, 'elementsToState: raan');
  const argumentOfPeriapsis = requireFinite(
    elements.argumentOfPeriapsis ?? 0,
    'elementsToState: argumentOfPeriapsis'
  );
  const trueAnomaly = requireFinite(elements.trueAnomaly, 'elementsToState: trueAnomaly');
  if (inclination < 0 || inclination > Math.PI) {
    throw new RangeError('elementsToState: inclination must be within 0 and pi radians');
  }

  let semiLatusRectum;
  if (elements.semiLatusRectum !== undefined) {
    semiLatusRectum = requirePositive(elements.semiLatusRectum, 'elementsToState: semiLatusRectum');
  } else {
    if (eccentricity === 1) {
      throw new RangeError('elementsToState: a parabola requires semiLatusRectum');
    }
    const semiMajorAxis = requireFinite(elements.semiMajorAxis, 'elementsToState: semiMajorAxis');
    if ((eccentricity < 1 && semiMajorAxis <= 0) || (eccentricity > 1 && semiMajorAxis >= 0)) {
      throw new RangeError('elementsToState: semiMajorAxis sign does not match eccentricity');
    }
    semiLatusRectum = semiMajorAxis * (1 - eccentricity ** 2);
    requirePositive(semiLatusRectum, 'elementsToState: derived semiLatusRectum');
  }
  const denominator = 1 + eccentricity * Math.cos(trueAnomaly);
  if (denominator <= 0) {
    throw new RangeError('elementsToState: trueAnomaly lies outside the physical conic branch');
  }
  const radius = semiLatusRectum / denominator;
  const perifocalPosition = Float64Array.of(
    radius * Math.cos(trueAnomaly),
    radius * Math.sin(trueAnomaly),
    0
  );
  const velocityScale = Math.sqrt(mu / semiLatusRectum);
  const perifocalVelocity = Float64Array.of(
    -velocityScale * Math.sin(trueAnomaly),
    velocityScale * (eccentricity + Math.cos(trueAnomaly)),
    0
  );
  const toInertial = (vector) => rotateZ(
    rotateX(rotateZ(vector, -argumentOfPeriapsis), -inclination),
    -raan
  );
  return { r: toInertial(perifocalPosition), v: toInertial(perifocalVelocity) };
}
