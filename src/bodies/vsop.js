// vsop.js — evaluator for VSOP87A planetary series.
//
//#region edu:vsop
// The VSOP87 theory (Bretagnon & Francou 1988) writes each rectangular
// coordinate of a planet as a sum of a few thousand periodic terms:
//
//     x(t) = sum over powers p of  t^p * sum_i  A_i cos(B_i + C_i t)
//
// with t in thousands of Julian years (TT) from J2000. Every A cos(B+Ct)
// is one periodic wobble of the orbit; the t^p factors let slow secular
// drifts ride on top. This is the same "table of amplitudes and angles"
// pattern as the nutation series in frames/nutation.js — just bigger.
//
// Differentiating term by term also gives the velocity analytically:
//
//     dx/dt = p t^(p-1) A cos(B + C t)  -  t^p A C sin(B + C t)
//
// which the observer pipeline later needs for aberration. VSOP87A
// coordinates are heliocentric, ecliptic and equinox of J2000.
//#endregion

import { makeState } from '../frames/frames.js';

export const AU_KM = 149597870.7;
const MILLENNIUM_DAYS = 365250.0;
const MILLENNIUM_SEC = MILLENNIUM_DAYS * 86400.0;

// Evaluate one axis (array of Float64Array blocks by power of t).
// Returns [position au, velocity au/millennium].
const evalAxis = (blocks, t) => {
  let pos = 0.0;
  let vel = 0.0;
  for (let p = 0; p < blocks.length; p++) {
    const c = blocks[p];
    if (!c || c.length === 0) continue;
    let sum = 0.0;
    let dsum = 0.0;
    for (let i = 0; i < c.length; i += 3) {
      const a = c[i], b = c[i + 1], f = c[i + 2];
      sum += a * Math.cos(b + f * t);
      dsum -= a * f * Math.sin(b + f * t);
    }
    const tp = Math.pow(t, p);
    pos += tp * sum;
    vel += tp * dsum;
    if (p > 0) {
      vel += p * Math.pow(t, p - 1) * sum;
    }
  }
  return [pos, vel];
};

// Build a body object from a VSOP87A data module {X, Y, Z}.
// state(t) returns a heliocentric state vector in the J2000 ecliptic
// frame, in km and km/s like every other state in the library.
export const makeVsopBody = (name, series) => ({
  name,
  state: (instant) => {
    const t = (instant.jd1 - 2451545.0 + instant.jd2) / MILLENNIUM_DAYS;
    const [x, vx] = evalAxis(series.X, t);
    const [y, vy] = evalAxis(series.Y, t);
    const [z, vz] = evalAxis(series.Z, t);
    const kmps = AU_KM / MILLENNIUM_SEC;
    return makeState({
      t: instant,
      frame: 'ecliptic-j2000',
      center: 'sun',
      r: [x * AU_KM, y * AU_KM, z * AU_KM],
      v: [vx * kmps, vy * kmps, vz * kmps]
    });
  }
});
