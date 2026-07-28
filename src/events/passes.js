// passes.js — satellite pass prediction.
//
//#region edu:passes
// A "pass" is the few minutes a satellite spends above an observer's
// horizon. Structurally it is rise/set again — elevation crossing a
// minimum angle — but the timescale is two orders of magnitude shorter:
// a whole ISS pass lasts ~10 minutes, so the search grid must be tens
// of seconds where the Moon's could be tens of minutes. The culmination
// (maximum elevation) decides whether a pass is worth watching:
// 10 degrees grazes the rooftops, 80 degrees crosses overhead.
//
// Whether the satellite is actually VISIBLE (sunlit spacecraft, dark
// observer) is a separate question involving the Earth's shadow, left
// for a later milestone.
//#endregion

import { findCrossings, findMaximum } from './search.js';

// Passes of a satellite over a site between two Instants.
//   options.minElevation (deg, default 10): pass threshold
// Returns [{ rise, culmination: { t, elevation, azimuth }, set }]
// where rise/set are { t, azimuth } at the threshold elevation.
export const passes = (site, sat, from, to, options = {}) => {
  const minEl = options.minElevation !== undefined ? options.minElevation : 10;
  const el = (t) => site.observe(sat, t).elevation - minEl;
  const crossings = findCrossings(el, from, to, options.stepSeconds || 30);

  const out = [];
  let rise = null;
  for (const c of crossings) {
    if (c.direction > 0) {
      rise = c.t;
    } else if (rise) {
      const peak = findMaximum((t) => site.observe(sat, t).elevation, rise, c.t, 15);
      out.push({
        rise: { t: rise, azimuth: site.observe(sat, rise).azimuth },
        culmination: {
          t: peak.t,
          elevation: peak.value,
          azimuth: site.observe(sat, peak.t).azimuth
        },
        set: { t: c.t, azimuth: site.observe(sat, c.t).azimuth }
      });
      rise = null;
    }
  }
  return out;
};
