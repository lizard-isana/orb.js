// satellite.js — an Earth satellite as a body on the frame graph.
//
//#region edu:satellite
// SGP4 outputs positions in TEME ("true equator, mean equinox") — a
// frame that exists for historical reasons and matches nothing else in
// astronomy exactly. The state vector returned here is TAGGED with that
// frame, and the graph in frames/frames.js pairs TEME with its defined
// rotation angle, mean sidereal time (GMST 1982; Vallado, "Revisiting
// Spacetrack Report #3"). Typing the frame keeps that easily-mistaken
// convention in exactly one place, next to the rotation that uses it.
//#endregion

import { makeState } from '../frames/frames.js';
import { parseTle } from './tle.js';
import { sgp4init, sgp4, wgs72 } from './propagation.js';

// satellite({ name?, line1, line2 }) -> body-like object.
// state(t) returns a TEME geocentric state in km / km/s, ready for
// transform() and observer.observe(); propagation failures (decayed
// orbits, eccentricity out of range) throw with the reference message.
export const satellite = (tle) => {
  const elements = parseTle(tle);
  const satrec = {};
  sgp4init(satrec, 'i',
    elements.epoch.jd('utc') - 2433281.5, // days since 1950 Jan 0.0
    elements.bstar, 0.0, 0.0,
    elements.eccentricity,
    elements.argumentOfPerigee,
    elements.inclination,
    elements.meanAnomaly,
    elements.meanMotion,
    elements.rightAscension);

  return {
    name: elements.name || 'satellite ' + elements.catalogNumber,
    elements,
    satrec,
    orbitalPeriod: (2 * Math.PI) / satrec.no_unkozai, // minutes
    apogee: satrec.alta * wgs72.radiusearthkm,        // km above surface
    perigee: satrec.altp * wgs72.radiusearthkm,

    state: (instant) => {
      const tsince = (instant.utcMs - elements.epoch.utcMs) / 60000; // minutes
      const result = sgp4(satrec, tsince);
      if (result == null) {
        throw new Error('SGP4 propagation failed (error ' + satrec.error + '): ' +
          satrec.error_message);
      }
      return makeState({
        t: instant,
        frame: 'teme',
        center: 'earth',
        r: [result.x, result.y, result.z],
        v: [result.xdot, result.ydot, result.zdot]
      });
    }
  };
};
