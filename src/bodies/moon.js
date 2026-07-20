// moon.js — geocentric position of the Moon (Meeus ch. 47 series).
//
//#region edu:moon
// The Moon is the hardest body in the sky to compute: the Sun perturbs
// its orbit so strongly that a useful series needs dozens of terms where
// a planet's Kepler ellipse would need one. This implementation is the
// truncated ELP-based series of Meeus, Astronomical Algorithms ch. 47:
// 60 terms each for longitude/distance and latitude, good to a few
// arcseconds against the full theory.
//
// The recipe, shared with every classical series in this library:
//   1. evaluate a handful of fundamental angles (mean longitude L',
//      elongation D, solar anomaly M, lunar anomaly M', latitude
//      argument F) as polynomials in time,
//   2. sum  amplitude * sin/cos(integer combination of those angles),
//   3. terms involving the solar anomaly M shrink slowly with time as
//      the Earth's orbit circularizes — the E, E^2 factors below.
//
// The series yields APPARENT ecliptic longitude of date once the
// nutation in longitude is added, which is exactly the library's
// 'ecliptic-of-date' frame (true equinox); latitude and distance need
// no such correction.
//#endregion

import { DEG, normalizeAngle } from '../math/angles.js';
import { makeState } from '../frames/frames.js';
import { nutation } from '../frames/nutation.js';
import { LR, B } from './data/moon-meeus.js';

export const moon = {
  name: 'moon',
  state: (instant) => {
    const T = instant.julianCenturies();

    // Fundamental arguments (Meeus 47.1-47.5), degrees -> radians
    const Lp = normalizeAngle((218.3164477 + 481267.88123421 * T - 0.0015786 * T ** 2
      + T ** 3 / 538841 - T ** 4 / 65194000) * DEG);
    const D = normalizeAngle((297.8501921 + 445267.1114034 * T - 0.0018819 * T ** 2
      + T ** 3 / 545868 - T ** 4 / 113065000) * DEG);
    const M = normalizeAngle((357.5291092 + 35999.0502909 * T - 0.0001536 * T ** 2
      + T ** 3 / 24490000) * DEG);
    const Mp = normalizeAngle((134.9633964 + 477198.8675055 * T + 0.0087414 * T ** 2
      + T ** 3 / 69699 - T ** 4 / 14712000) * DEG);
    const F = normalizeAngle((93.2720950 + 483202.0175233 * T - 0.0036539 * T ** 2
      - T ** 3 / 3526000 + T ** 4 / 863310000) * DEG);

    // Planetary/rotation additives (Meeus 47.6)
    const A1 = normalizeAngle((119.75 + 131.849 * T) * DEG);
    const A2 = normalizeAngle((53.09 + 479264.290 * T) * DEG);
    const A3 = normalizeAngle((313.45 + 481266.484 * T) * DEG);

    // Eccentricity decay factor for terms carrying the solar anomaly M
    const E = 1 - 0.002516 * T - 0.0000074 * T * T;

    let sumL = 0.0; // 1e-6 degrees
    let sumR = 0.0; // 1e-3 km
    for (const [d, m, mp, f, sl, sr] of LR) {
      const eFactor = m === 0 ? 1 : (Math.abs(m) === 1 ? E : E * E);
      const arg = d * D + m * M + mp * Mp + f * F;
      sumL += sl * eFactor * Math.sin(arg);
      sumR += sr * eFactor * Math.cos(arg);
    }
    sumL += 3958 * Math.sin(A1) + 1962 * Math.sin(Lp - F) + 318 * Math.sin(A2);

    let sumB = 0.0; // 1e-6 degrees
    for (const [d, m, mp, f, sb] of B) {
      const eFactor = m === 0 ? 1 : (Math.abs(m) === 1 ? E : E * E);
      sumB += sb * eFactor * Math.sin(d * D + m * M + mp * Mp + f * F);
    }
    sumB += -2235 * Math.sin(Lp) + 382 * Math.sin(A3) + 175 * Math.sin(A1 - F)
      + 175 * Math.sin(A1 + F) + 127 * Math.sin(Lp - Mp) - 115 * Math.sin(Lp + Mp);

    // Apparent longitude: geometric + nutation in longitude
    const longitude = Lp + sumL * 1e-6 * DEG + nutation(instant).dpsi;
    const latitude = sumB * 1e-6 * DEG;
    const distance = 385000.56 + sumR * 1e-3; // km

    const cosB = Math.cos(latitude);
    return makeState({
      t: instant,
      frame: 'ecliptic-of-date',
      center: 'earth',
      r: [
        distance * cosB * Math.cos(longitude),
        distance * cosB * Math.sin(longitude),
        distance * Math.sin(latitude)
      ],
      v: null
    });
  },

  // Apparent ecliptic spherical coordinates of date — the raw output of
  // the series, handy for tests and for the guide.
  latlng: (instant) => {
    const s = moon.state(instant);
    return {
      longitude: normalizeAngle(Math.atan2(s.r[1], s.r[0])),
      latitude: Math.asin(s.r[2] / Math.hypot(s.r[0], s.r[1], s.r[2])),
      distance: Math.hypot(s.r[0], s.r[1], s.r[2])
    };
  }
};
