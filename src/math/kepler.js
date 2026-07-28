// kepler.js — the two-body ("Kepler") problem, solved with universal
// variables: state + time -> state, and state <-> orbital elements.
//
//#region edu:kepler-universal
// Given a position and velocity around a single attracting mass, where
// is the body after time dt? That is the Kepler problem, and one pair
// of functions below solves it for EVERY orbit shape.
//
// The classical solution splits into three cases — ellipse (Kepler's
// equation), parabola (Barker's equation), hyperbola — each with its
// own anomaly variable and its own transcendental equation. Code
// written that way inherits the split: three branches, and numerical
// trouble exactly at e = 1, where real objects (sungrazing comets,
// barely captured debris) actually live.
//
// The universal-variable formulation (Battin 1987; Vallado ch. 2;
// Curtis ch. 3) removes the split. One new variable chi and the two
// Stumpff functions C(z), S(z) turn the time-of-flight equation into a
// single form,
//
//   sqrt(mu) dt = (r0.v0)/sqrt(mu) chi^2 C(z)
//               + (1 - alpha r0) chi^3 S(z) + r0 chi,
//
//   z = alpha chi^2,   alpha = 1/a = 2/r0 - v0^2/mu,
//
// valid for every conic: alpha > 0 is an ellipse, alpha = 0 a parabola,
// alpha < 0 a hyperbola — the same code, continuous through e = 1.
// dt grows monotonically with chi, so Newton's method solves for chi
// without drama, and the f and g functions turn chi back into a state
// vector. (For an ellipse chi reduces to sqrt(a) * (change in eccentric
// anomaly) — the familiar theory is inside, just reparameterized.)
//#endregion

import { dot, cross, norm, add, scale, rotx, rotz } from './vec3.js';
import { TWO_PI, normalizeAngle } from './angles.js';

// Gravitational parameters GM, km^3/s^2. The product GM is what
// spacecraft and planetary ranging measure directly (far better than G
// and M separately are known). Values: IAU 2009 / JPL DE.
export const GM = {
  sun: 1.32712440018e11,
  earth: 398600.4418,
  moon: 4902.800066
};

//#region edu:stumpff
// The Stumpff functions make one formula serve all three conics. They
// are the analytic continuation of
//
//   C(z) = (1 - cos(sqrt(z))) / z
//   S(z) = (sqrt(z) - sin(sqrt(z))) / sqrt(z)^3
//
// across z = 0: for z > 0 (ellipse) they are the cos/sin forms above,
// for z < 0 (hyperbola) the identical expressions in cosh/sinh, and at
// z = 0 (parabola) the finite values 1/2 and 1/6. Near zero the closed
// forms subtract nearly equal numbers and lose precision, so a few
// series terms are used instead — the series also makes the continuity
// visible: nothing special happens at z = 0.
export const stumpffC = (z) => {
  if (z > 1e-2) return (1 - Math.cos(Math.sqrt(z))) / z;
  if (z < -1e-2) return (Math.cosh(Math.sqrt(-z)) - 1) / -z;
  return 1 / 2 - z / 24 + z * z / 720 - z * z * z / 40320;
};

export const stumpffS = (z) => {
  if (z > 1e-2) {
    const s = Math.sqrt(z);
    return (s - Math.sin(s)) / (s * s * s);
  }
  if (z < -1e-2) {
    const s = Math.sqrt(-z);
    return (Math.sinh(s) - s) / (s * s * s);
  }
  return 1 / 6 - z / 120 + z * z / 5040 - z * z * z / 362880;
};
//#endregion

// Propagate a two-body state (r0 km, v0 km/s) by dtSeconds around a
// mass with gravitational parameter mu (km^3/s^2). Works for any conic,
// forward or backward in time. Returns { r, v }.
export const propagateKepler = (r0, v0, dtSeconds, mu) => {
  const r0n = norm(r0);
  const sqrtMu = Math.sqrt(mu);
  const alpha = 2 / r0n - dot(v0, v0) / mu; // 1/a; 0 for a parabola
  const rdotv = dot(r0, v0);

  // Newton's method for the universal anomaly chi (units sqrt(km)).
  // Initial guess sqrt(mu)*|alpha|*dt is exact for a circular orbit and
  // adequate elsewhere; for near-parabolic orbits it starts at 0 and
  // the first step lands at sqrt(mu)*dt/r0.
  let chi = sqrtMu * Math.abs(alpha) * dtSeconds;
  let z, C, S;
  let converged = false;
  for (let i = 0; i < 60; i++) {
    z = alpha * chi * chi;
    C = stumpffC(z);
    S = stumpffS(z);
    const F = (rdotv / sqrtMu) * chi * chi * C +
      (1 - alpha * r0n) * chi * chi * chi * S +
      r0n * chi - sqrtMu * dtSeconds;
    const Fp = (rdotv / sqrtMu) * chi * (1 - z * S) +
      (1 - alpha * r0n) * chi * chi * C + r0n; // = r(chi), always > 0
    const d = F / Fp;
    chi -= d;
    if (Math.abs(d) < 1e-8 * (1 + Math.abs(chi))) { converged = true; break; }
  }
  if (!converged) {
    throw new RangeError('propagateKepler: no convergence (dt=' + dtSeconds + ' s)');
  }

  //#region edu:f-and-g
  // The f and g functions turn the solved chi back into a state. Both
  // r0 and v0 lie in the orbit plane, so they span it, and the new
  // position and velocity are LINEAR combinations:
  //
  //   r = f r0 + g v0        v = fdot r0 + gdot v0
  //
  // No angles, no per-conic cases — chi and the Stumpff values carry
  // all the geometry. (f gdot - fdot g = 1 always; a useful check.)
  z = alpha * chi * chi;
  C = stumpffC(z);
  S = stumpffS(z);
  const f = 1 - (chi * chi / r0n) * C;
  const g = dtSeconds - (chi * chi * chi / sqrtMu) * S;
  const r = add(scale(r0, f), scale(v0, g));
  const rn = norm(r);
  const fdot = (sqrtMu / (rn * r0n)) * chi * (z * S - 1);
  const gdot = 1 - (chi * chi / rn) * C;
  return { r, v: add(scale(r0, fdot), scale(v0, gdot)) };
  //#endregion
};

//#region edu:orbital-elements
// A state vector fixes an orbit completely, and so do six classical
// elements: shape (semi-major axis a, eccentricity e), orbit plane
// (inclination i, right ascension of the ascending node), orientation
// in the plane (argument of perigee), and position along it (true
// anomaly). The conversion rests on three constructed vectors:
//
//   h = r x v          normal to the orbit plane   -> i, node
//   n = z_hat x h      points at the ascending node -> RAAN
//   e = (v x h)/mu - r/|r|   points at perigee, |e| = eccentricity
//
// and every angle is the angle between two of them. Degenerate
// geometries leave some elements undefined — a circular orbit has no
// perigee, an equatorial orbit no node — and the conventions used here
// are: undefined angles are 0, and the "next" angle absorbs the
// reference (true anomaly from the node for circular orbits, argument
// of perigee from the x-axis for equatorial ones).
//#endregion

const clampAcos = (x) => Math.acos(Math.min(1, Math.max(-1, x)));
const TINY = 1e-10;

// {r, v} (km, km/s) -> classical elements, angles in radians.
// semiMajorAxis is Infinity for a parabola, negative for a hyperbola;
// period (seconds) is null for open orbits.
export const stateToElements = ({ r, v }, mu) => {
  const rn = norm(r);
  const h = cross(r, v);
  const hn = norm(h);
  const n = Float64Array.of(-h[1], h[0], 0); // z_hat x h
  const nn = norm(n);
  const ev = add(scale(cross(v, h), 1 / mu), scale(r, -1 / rn));
  const e = norm(ev);
  const energy = dot(v, v) / 2 - mu / rn;

  const inclination = clampAcos(h[2] / hn);
  const circular = e < TINY;
  const equatorial = nn < TINY;

  let raan = 0;
  if (!equatorial) {
    raan = clampAcos(n[0] / nn);
    if (n[1] < 0) raan = TWO_PI - raan;
  }

  let argumentOfPerigee = 0;
  if (!circular) {
    if (!equatorial) {
      argumentOfPerigee = clampAcos(dot(n, ev) / (nn * e));
      if (ev[2] < 0) argumentOfPerigee = TWO_PI - argumentOfPerigee;
    } else {
      // no node: measure perigee from the x-axis (longitude of perigee)
      argumentOfPerigee = normalizeAngle(Math.atan2(ev[1], ev[0]) * Math.sign(h[2]));
    }
  }

  let trueAnomaly;
  if (!circular) {
    trueAnomaly = clampAcos(dot(ev, r) / (e * rn));
    if (dot(r, v) < 0) trueAnomaly = TWO_PI - trueAnomaly;
  } else if (!equatorial) {
    // circular: measure from the ascending node (argument of latitude)
    trueAnomaly = clampAcos(dot(n, r) / (nn * rn));
    if (r[2] < 0) trueAnomaly = TWO_PI - trueAnomaly;
  } else {
    // circular equatorial: measure from the x-axis (true longitude)
    trueAnomaly = normalizeAngle(Math.atan2(r[1], r[0]) * Math.sign(h[2]));
  }

  const parabolic = Math.abs(e - 1) < TINY;
  const semiMajorAxis = parabolic ? Infinity : -mu / (2 * energy);
  return {
    semiMajorAxis,
    semiLatusRectum: (hn * hn) / mu,
    eccentricity: e,
    inclination,
    raan,
    argumentOfPerigee,
    trueAnomaly,
    period: !parabolic && semiMajorAxis > 0
      ? TWO_PI * Math.sqrt(Math.pow(semiMajorAxis, 3) / mu)
      : null
  };
};

// Classical elements -> {r, v}. Shape may be given as semiMajorAxis
// (any conic but a parabola) or semiLatusRectum (any conic, and the
// only valid way to specify e = 1). Angles in radians.
export const elementsToState = (el, mu) => {
  const e = el.eccentricity;
  const p = el.semiLatusRectum !== undefined
    ? el.semiLatusRectum
    : el.semiMajorAxis * (1 - e * e);
  if (!Number.isFinite(p) || p <= 0) {
    throw new RangeError('elementsToState: need semiLatusRectum > 0 ' +
      '(semiMajorAxis cannot express a parabola)');
  }
  const nu = el.trueAnomaly;
  const rn = p / (1 + e * Math.cos(nu));
  // perifocal frame: x toward perigee, z along h
  const rPf = Float64Array.of(rn * Math.cos(nu), rn * Math.sin(nu), 0);
  const s = Math.sqrt(mu / p);
  const vPf = Float64Array.of(-s * Math.sin(nu), s * (e + Math.cos(nu)), 0);
  // perifocal -> inertial: undo the 3-1-3 rotation (RAAN, i, argp)
  const toInertial = (u) =>
    rotz(rotx(rotz(u, -el.argumentOfPerigee), -el.inclination), -el.raan);
  return { r: toInertial(rPf), v: toInertial(vPf) };
};
