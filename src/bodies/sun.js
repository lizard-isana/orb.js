// sun.js — the geocentric Sun, derived from the Earth's orbit.
//
//#region edu:sun-from-earth
// There is no separate "theory of the Sun": seen from the Earth, the Sun
// sits exactly opposite the Earth's heliocentric position, so
//
//     r_sun(geocentric) = - r_earth(heliocentric)
//
// and the same for velocity. Deriving the Sun from the one Earth
// series keeps a single source of truth: a separate low-precision
// solar theory would disagree with the planetary frame at the
// arcsecond level and the two could never be reconciled exactly.
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
  },

  provenance: {
    source: ['erfa-epv00'],
    accuracy: { value: 1, unit: 'arcsecond', basis: 'erfa-epv00' }
  }
};
