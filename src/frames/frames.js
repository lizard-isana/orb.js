// frames.js — the state-vector type and the frame-transformation graph.
//
//#region edu:state-vector
// Every position travels as one structured value:
//
//   {
//     t:      Instant,           // when
//     frame:  'ecliptic-j2000',  // orientation of the axes
//     center: 'sun',             // origin of the axes
//     r:      Float64Array[3],   // km, always
//     v:      Float64Array[3]|null // km/s, always
//   }
//
// The frame and center ride WITH the numbers, and every conversion
// goes through the single transform() below. Detached metadata gets
// dropped and guessed-at; attached metadata makes an undefined
// conversion an exception instead of a silently wrong number.
//#endregion
//
// Frames implemented here (all right-handed, axes in km):
//   'equatorial-j2000'      Earth mean equator & equinox of J2000.0
//                           (~ICRF/GCRS; the 23-mas frame bias is far
//                           below this library's accuracy class)
//   'ecliptic-j2000'        ecliptic & equinox of J2000.0 (VSOP87 output)
//   'equatorial-mean-of-date'  mean equator & equinox of date (precession)
//   'equatorial-of-date'    true equator & equinox of date (precession
//                           + nutation; "apparent" orientations)
//   'ecliptic-of-date'      ecliptic & true equinox of date (Sun/Moon
//                           theories produce coordinates here)
//   'teme'                  true equator, mean equinox — the SGP4 frame
//   'ecef'                  Earth-fixed (rotating); polar motion ignored
//
// Center changes (heliocentric -> geocentric -> topocentric) are a
// different operation — they need another body's position — and live
// with the body/observer code, not in this rotation graph.

import { matRotX, matRotZ, matVec, matTVec, matMul } from '../math/vec3.js';
import { ARCSEC } from '../math/angles.js';
import { gmst82 } from '../time/sidereal.js';
import { nutation, meanObliquity, gast } from './nutation.js';
import { precessionMatrix, nutationMatrix } from './precession.js';

// Mean obliquity at J2000.0 (IAU 2006): 23deg 26' 21.406"
const EPS0_J2000 = 84381.406 * ARCSEC;

// Earth rotation rate, rad/s — needed to transform velocities into or
// out of the rotating ECEF frame (v_ecef = R(v_inertial - omega x r)).
const OMEGA_EARTH = 7.292115146706979e-5;

export const makeState = ({ t, frame, center, r, v = null }) => {
  if (!t || typeof t.jd !== 'function') throw new TypeError('state: t must be an Instant');
  if (typeof frame !== 'string') throw new TypeError('state: frame required');
  if (typeof center !== 'string') throw new TypeError('state: center required');
  if (!r || r.length !== 3) throw new TypeError('state: r must be a 3-vector (km)');
  return { t, frame, center, r: Float64Array.from(r), v: v ? Float64Array.from(v) : null };
};

//#region edu:frame-graph
// The transformation graph. Each edge knows how to produce its rotation
// matrix at a given Instant, plus whether crossing it enters/leaves the
// rotating Earth-fixed frame (which adds the omega x r term for
// velocities). transform() finds a path between any two frames by
// breadth-first search and composes the matrices, so every route
// between two frames gives the same answer by construction.
//#endregion
const EDGES = [
  {
    from: 'ecliptic-j2000', to: 'equatorial-j2000',
    matrix: () => matRotX(-EPS0_J2000)
  },
  {
    from: 'equatorial-j2000', to: 'equatorial-mean-of-date',
    matrix: (t) => precessionMatrix(t)
  },
  {
    from: 'equatorial-mean-of-date', to: 'equatorial-of-date',
    matrix: (t) => nutationMatrix(t)
  },
  {
    // Ecliptic of date (true equinox): rotate the true equator system
    // down by the true obliquity. This is the frame the classical Sun
    // and Moon theories (with nutation added to the longitude) live in.
    from: 'equatorial-of-date', to: 'ecliptic-of-date',
    matrix: (t) => matRotX(meanObliquity(t) + nutation(t).deps)
  },
  {
    // TEME (true equator, mean equinox): displaced from the true-of-date
    // frame by the equation of the equinoxes about the pole, so that
    // R3(GMST) applied to TEME equals R3(GAST) applied to true-of-date.
    from: 'equatorial-of-date', to: 'teme',
    matrix: (t) => matRotZ(nutation(t).dpsi * Math.cos(meanObliquity(t)))
  },
  {
    // Earth rotation: TEME pairs with MEAN sidereal time (GMST 1982)
    // by definition of the frame; apparent sidereal time here would
    // shift ground tracks by ~500 m.
    from: 'teme', to: 'ecef',
    matrix: (t) => matRotZ(gmst82(t)),
    rotating: true
  }
];
// Note there are deliberately NOT two edges into 'ecef': routing
// equatorial-of-date -> teme -> ecef applies GAST in total (the
// nutation-in-RA rotation plus GMST), keeping the graph loop-free and
// every path consistent.

// The frames that appear as nodes of the graph. Exported so the shared
// vocabulary (vocab.js) can be checked against what the graph actually
// uses — the two must never drift apart.
export const GRAPH_FRAMES = Object.freeze(
  [...new Set(EDGES.flatMap((e) => [e.from, e.to]))].sort()
);

const neighbors = {};
for (const e of EDGES) {
  (neighbors[e.from] = neighbors[e.from] || []).push({ edge: e, forward: true, next: e.to });
  (neighbors[e.to] = neighbors[e.to] || []).push({ edge: e, forward: false, next: e.from });
}

const findPath = (from, to) => {
  if (from === to) return [];
  const prev = { [from]: null };
  const queue = [from];
  while (queue.length) {
    const node = queue.shift();
    for (const step of neighbors[node] || []) {
      if (!(step.next in prev)) {
        prev[step.next] = { node, step };
        if (step.next === to) {
          const path = [];
          for (let cur = to; prev[cur]; cur = prev[cur].node) path.unshift(prev[cur].step);
          return path;
        }
        queue.push(step.next);
      }
    }
  }
  return null;
};

// Transform a state vector to another frame (same center). Returns a new
// state; the input is not modified.
export const transform = (state, { frame }) => {
  const path = findPath(state.frame, frame);
  if (path === null) {
    throw new RangeError(`transform: no path from '${state.frame}' to '${frame}'`);
  }
  let r = state.r;
  let v = state.v;
  for (const { edge, forward } of path) {
    const m = edge.matrix(state.t);
    if (edge.rotating && v) {
      // Crossing into (or out of) the rotating frame: the same point has
      // different velocity because the frame itself moves.
      if (forward) {
        // inertial -> rotating: v' = R (v - omega x r)
        const vRel = Float64Array.of(
          v[0] + OMEGA_EARTH * r[1],
          v[1] - OMEGA_EARTH * r[0],
          v[2]
        );
        v = matVec(m, vRel);
      } else {
        // rotating -> inertial: v = R^T v' + omega x r
        const vi = matTVec(m, v);
        const ri = matTVec(m, r);
        v = Float64Array.of(
          vi[0] - OMEGA_EARTH * ri[1],
          vi[1] + OMEGA_EARTH * ri[0],
          vi[2]
        );
        r = ri;
        continue;
      }
    } else if (v) {
      v = forward ? matVec(m, v) : matTVec(m, v);
    }
    r = forward ? matVec(m, r) : matTVec(m, r);
  }
  return { t: state.t, frame, center: state.center, r, v };
};

export { gast };
