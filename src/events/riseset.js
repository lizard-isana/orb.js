// riseset.js — rise, set and transit times.
//
//#region edu:riseset
// "Sunrise" is not elevation zero. Convention says sunrise is when the
// Sun's UPPER LIMB touches the horizon AS SEEN through the atmosphere,
// so the target elevation of the Sun's center is
//
//     -0.8333 deg  =  -(34' standard horizon refraction + 16' semidiameter)
//
// The Moon adds a twist: its parallax (~57') works the other way and
// nearly cancels refraction plus semidiameter — but because this
// library's elevations are already TOPOCENTRIC (parallax applied in the
// geometry), only refraction + semidiameter remain here, same as the
// Sun. Stars and planets use refraction alone (-0.5667 deg).
//
// With the convention fixed, rise/set is nothing special: find where
// elevation(t) - h0 crosses zero (see search.js).
//#endregion

import { findCrossings, findMaximum } from './search.js';

const DEFAULT_H0 = {
  sun: -0.8333,   // refraction + solar semidiameter
  moon: -0.7333,  // refraction + mean lunar semidiameter (elevations are topocentric)
  default: -0.5667 // refraction only
};

// Rise/set/transit events for a body seen from a site between two
// Instants. options.h0 overrides the horizon elevation (degrees).
// Returns [{ type: 'rise'|'set'|'transit', t, elevation }] sorted by time.
export const riseSet = (site, body, from, to, options = {}) => {
  const h0 = options.h0 !== undefined
    ? options.h0
    : (DEFAULT_H0[body.name] !== undefined ? DEFAULT_H0[body.name] : DEFAULT_H0.default);
  const elev = (t) => site.observe(body, t).elevation - h0;

  const events = findCrossings(elev, from, to, options.stepSeconds || 600)
    .map(({ t, direction }) => ({
      type: direction > 0 ? 'rise' : 'set',
      t,
      elevation: h0
    }));

  // transit: elevation maximum between each rise and the following set
  for (let i = 0; i < events.length; i++) {
    if (events[i].type !== 'rise') continue;
    const next = events[i + 1];
    const end = next ? next.t : to;
    const peak = findMaximum((t) => site.observe(body, t).elevation, events[i].t, end, 600);
    events.splice(i + 1, 0, { type: 'transit', t: peak.t, elevation: peak.value });
    i++;
  }
  return events;
};
