// sun.js — the geocentric Sun, derived from the Earth's orbit.
//
//#region edu:sun-from-earth
// There is no separate "theory of the Sun": seen from the Earth, the Sun
// sits exactly opposite the Earth's heliocentric position, so
//
//     r_sun(geocentric) = - r_earth(heliocentric)
//
// and the same for velocity. v3 carried an independent low-precision
// solar theory alongside VSOP, and the two disagreed by ~17 arcseconds;
// deriving the Sun from the one Earth series removes that second source
// of truth entirely.
//#endregion

import { earth } from './earth.js';
import { makeState } from '../frames/frames.js';

export const sun = {
  name: 'sun',
  state: (instant) => {
    const e = earth.state(instant);
    return makeState({
      t: instant,
      frame: e.frame,
      center: 'earth',
      r: [-e.r[0], -e.r[1], -e.r[2]],
      v: [-e.v[0], -e.v[1], -e.v[2]]
    });
  }
};
