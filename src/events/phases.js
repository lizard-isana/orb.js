// phases.js — moon phases by root finding.
//
//#region edu:moon-phase
// A moon phase is a statement about the ELONGATION — the difference
// between the apparent ecliptic longitudes of the Moon and the Sun:
//
//     0 deg = new moon,  90 = first quarter,  180 = full,  270 = last quarter
//
// Classical almanac algorithms (Meeus ch. 49) approximate the TIMES of
// these events directly with a dedicated series. This module instead
// reuses the position theories the library already has and finds where
// elongation(t) crosses each target angle. That is slower per event
// but exactly consistent with the positions the library reports —
// there is no second theory to disagree with.
//#endregion

import { DEG, normalizeAngle } from '../math/angles.js';
import { transform } from '../frames/frames.js';
import { moon } from '../bodies/moon.js';
import { sun } from '../bodies/sun.js';
import { findCrossings } from './search.js';

// Apparent elongation Moon - Sun in radians [0, 2pi).
export const elongation = (t) => {
  const m = moon.latlng(t);
  const s = transform(sun.state(t), { frame: 'ecliptic-of-date' });
  const sunLon = Math.atan2(s.r[1], s.r[0]);
  return normalizeAngle(m.longitude - sunLon);
};

const PHASE_NAMES = ['new', 'first-quarter', 'full', 'last-quarter'];

// Phase events between two Instants:
// [{ phase: 'new'|'first-quarter'|'full'|'last-quarter', t }]
export const moonPhases = (from, to) => {
  const out = [];
  for (let k = 0; k < 4; k++) {
    const target = k * 90 * DEG;
    // signed distance from the target elongation, smooth across 0/2pi
    const f = (t) => {
      let d = elongation(t) - target;
      if (d > Math.PI) d -= 2 * Math.PI;
      if (d < -Math.PI) d += 2 * Math.PI;
      return d;
    };
    for (const { t, direction } of findCrossings(f, from, to, 6 * 3600)) {
      if (direction > 0) { // elongation increases through the target
        out.push({ phase: PHASE_NAMES[k], t });
      }
    }
  }
  return out.sort((a, b) => a.t.utcMs - b.t.utcMs);
};

// Days since the last new moon at t (0..29.5), the "moon age".
export const moonAge = (t) => {
  const SYNODIC = 29.530588; // days, mean
  const back = t.addDays(-SYNODIC - 2);
  const news = moonPhases(back, t.addDays(1)).filter((e) => e.phase === 'new');
  const last = news.filter((e) => e.t.utcMs <= t.utcMs).pop();
  return (t.utcMs - last.t.utcMs) / 86400000;
};
