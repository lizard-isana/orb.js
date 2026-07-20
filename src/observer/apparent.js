// apparent.js — from geometric positions to the apparent place.
//
//#region edu:light-time-aberration
// Two corrections separate the position a theory computes from the
// direction a telescope must point:
//
// 1. LIGHT TIME: we see a body where it WAS, one light-travel-time ago
//    (Jupiter: ~40 minutes, the Moon: 1.3 seconds).
// 2. ABERRATION: the observer moves (Earth's orbit: ~30 km/s), which
//    tilts incoming light like rain on a car window — up to 20.5".
//
// For heliocentric bodies the two are applied separately and exactly:
//
//   astrometric:  rho = r_target(t - tau) - r_earth(t),  tau = |rho|/c
//                 (iterated: the target is antedated, the observer is not)
//   apparent:     tilt the DIRECTION of rho by v_earth/c, keeping |rho| —
//                 so the reported distance stays the true light-path length
//                 (what JPL Horizons calls "delta").
//
// For bodies expressed directly in the geocentric frame (Moon, Sun as
// minus-Earth, satellites) the frame itself rides with the observer, so
// evaluating the geocentric position function at t - tau captures both
// effects at once: the Sun lands 20.5" behind its geometric place, the
// Moon only 0.7" — the textbook values — with no per-body special
// cases. (An early v4 draft used that shortcut for planets too by
// antedating the Earth as well; the direction comes out right to first
// order, but the vector's LENGTH picks up a spurious v_earth*tau
// — ~20,000 km for Mars — which the Horizons comparison caught.)
//
// Diurnal aberration (observer's rotation speed, up to 0.3") is below
// this library's accuracy class and is ignored.
//#endregion

import { makeState, transform } from '../frames/frames.js';
import { earth } from '../bodies/earth.js';

export const C_KMPS = 299792.458; // speed of light

// Apparent geocentric state: light time and annual aberration applied,
// expressed on the true equator & equinox of date. {lightTime: false}
// gives the geometric place instead — the difference between the two IS
// the correction, which makes the option a teaching tool as well as an
// escape hatch.
export const apparentGeocentric = (body, instant, { lightTime = true } = {}) => {
  const s0 = body.state(instant);

  if (s0.center === 'earth') {
    // Geocentric theories: retarded evaluation (see header).
    let g = s0;
    if (lightTime) {
      for (let i = 0; i < 3; i++) {
        const tau = Math.hypot(g.r[0], g.r[1], g.r[2]) / C_KMPS; // seconds
        g = body.state(instant.addSeconds(-tau));
      }
      g = makeState({ t: instant, frame: g.frame, center: 'earth', r: g.r, v: g.v });
    }
    return transform(g, { frame: 'equatorial-of-date' });
  }

  if (s0.center !== 'sun') {
    throw new RangeError('apparent: unsupported center ' + s0.center);
  }

  // Heliocentric bodies: astrometric vector, then aberration.
  const e = transform(earth.state(instant), { frame: s0.frame });
  let target = s0;
  let rho = Float64Array.of(
    target.r[0] - e.r[0], target.r[1] - e.r[1], target.r[2] - e.r[2]);
  if (lightTime) {
    for (let i = 0; i < 3; i++) {
      const tau = Math.hypot(rho[0], rho[1], rho[2]) / C_KMPS;
      target = body.state(instant.addSeconds(-tau));
      rho = Float64Array.of(
        target.r[0] - e.r[0], target.r[1] - e.r[1], target.r[2] - e.r[2]);
    }
    // aberration: tilt the direction by v_earth/c, preserve the length
    const dist = Math.hypot(rho[0], rho[1], rho[2]);
    const beta = 1 / C_KMPS;
    const tilted = Float64Array.of(
      rho[0] + dist * e.v[0] * beta,
      rho[1] + dist * e.v[1] * beta,
      rho[2] + dist * e.v[2] * beta
    );
    const scale = dist / Math.hypot(tilted[0], tilted[1], tilted[2]);
    rho = Float64Array.of(tilted[0] * scale, tilted[1] * scale, tilted[2] * scale);
  }
  const g = makeState({
    t: instant, frame: s0.frame, center: 'earth', r: rho,
    v: target.v && e.v
      ? [target.v[0] - e.v[0], target.v[1] - e.v[1], target.v[2] - e.v[2]]
      : null
  });
  return transform(g, { frame: 'equatorial-of-date' });
};
