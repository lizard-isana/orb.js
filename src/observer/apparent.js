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
// The classical trick implemented here handles both at once: evaluate
// the GEOCENTRIC position function at the retarded time t - tau,
//
//     G(t - tau),   tau = |G| / c,   iterated a few times.
//
// Why this equals light-time + annual aberration to first order in v/c:
// for a planet, G(t') = r_planet(t') - r_earth(t'), and antedating the
// Earth by tau shifts the vector by v_earth * tau — exactly the
// aberration tilt for a target at distance c*tau. For the Moon and Sun
// the geocentric frame is (to first order) the observer's rest frame,
// and the retarded evaluation directly captures their apparent motion:
// the Sun lands 20.5" behind its geometric place, the Moon only 0.7" —
// the textbook values — with no special cases per body.
//
// Diurnal aberration (observer's rotation speed, up to 0.3") is below
// this library's accuracy class and is ignored.
//#endregion

import { makeState, transform } from '../frames/frames.js';
import { earth } from '../bodies/earth.js';

export const C_KMPS = 299792.458; // speed of light

// Geocentric state of a body at the given instant, in the J2000 ecliptic
// frame regardless of the body's native frame/center.
const geocentricAt = (body, instant) => {
  const s = body.state(instant);
  if (s.center === 'earth') {
    return s.frame === 'ecliptic-j2000' ? s : transform(s, { frame: 'ecliptic-j2000' });
  }
  if (s.center === 'sun') {
    const e = earth.state(instant);
    return makeState({
      t: instant,
      frame: 'ecliptic-j2000',
      center: 'earth',
      r: [s.r[0] - e.r[0], s.r[1] - e.r[1], s.r[2] - e.r[2]],
      v: s.v && e.v ? [s.v[0] - e.v[0], s.v[1] - e.v[1], s.v[2] - e.v[2]] : null
    });
  }
  throw new RangeError('apparent: unsupported center ' + s.center);
};

// Apparent geocentric state: light time + annual aberration applied (see
// header), expressed on the true equator & equinox of date. Set
// {lightTime: false} to get the geometric place instead — the difference
// between the two IS the aberration/light-time correction, which makes
// the option a teaching tool as well as an escape hatch.
export const apparentGeocentric = (body, instant, { lightTime = true } = {}) => {
  let g = geocentricAt(body, instant);
  if (lightTime) {
    for (let i = 0; i < 3; i++) {
      const tau = Math.hypot(g.r[0], g.r[1], g.r[2]) / C_KMPS; // seconds
      g = geocentricAt(body, instant.addSeconds(-tau));
    }
    // The state is observed AT the original instant; only the light left earlier.
    g = makeState({ t: instant, frame: g.frame, center: 'earth', r: g.r, v: g.v });
  }
  return transform(g, { frame: 'equatorial-of-date' });
};
