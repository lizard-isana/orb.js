// tle.js — parsing NORAD Two-Line Elements.
//
//#region edu:tle
// A TLE packs a satellite's mean orbital elements into two 69-character
// lines with FIXED column positions — values may not even carry their
// decimal points ("0004871" means eccentricity 0.0004871, " 10270-3"
// means 0.10270e-3). Two classic pitfalls live here:
//
//  1. The epoch is a two-digit year plus a fractional day-of-year with
//     ~millisecond precision; rounding it to whole seconds moves a LEO
//     satellite by kilometers along-track.
//  2. These are MEAN elements fitted to the SGP4 model with WGS-72
//     constants. They only make sense fed to SGP4 — treating them as
//     osculating Kepler elements gives errors of tens of kilometers.
//#endregion

import { DEG } from '../math/angles.js';
import { Instant } from '../time/instant.js';

const impliedDecimal = (mantissa, exponent) =>
  Number(mantissa) * 1e-5 * Math.pow(10, Number(exponent));

// { name?, line1, line2 } -> orbital elements with radians / rad-per-minute
// angles and an Instant epoch, ready for sgp4init.
export const parseTle = ({ name, line1, line2 }) => {
  if (!line1 || !line2 || line1.length < 69 || line2.length < 69) {
    throw new RangeError('parseTle: two 69-column lines required');
  }
  const epochYear2 = Number(line1.slice(18, 20));
  const year = epochYear2 < 57 ? 2000 + epochYear2 : 1900 + epochYear2;
  const doy = Number(line1.slice(20, 32)); // fractional day of year
  // Whole milliseconds survive: Date.UTC of Jan 0 plus fractional days.
  const epochMs = Date.UTC(year - 1, 11, 31) + doy * 86400000;

  return {
    name: name || null,
    catalogNumber: Number(line1.slice(2, 7)),
    classification: line1.slice(7, 8),
    internationalDesignator: line1.slice(9, 17).trim(),
    epoch: Instant.fromUnixMs(epochMs),
    meanMotionDot: Number(line1.slice(33, 43)),               // rev/day^2 /2 (unused by SGP4)
    meanMotionDdot: impliedDecimal(line1.slice(44, 50), line1.slice(50, 52)),
    bstar: impliedDecimal(line1.slice(53, 59), line1.slice(59, 61)),
    elementSetNumber: Number(line1.slice(64, 68)),
    inclination: Number(line2.slice(8, 16)) * DEG,
    rightAscension: Number(line2.slice(17, 25)) * DEG,
    eccentricity: Number('0.' + line2.slice(26, 33).trim()),
    argumentOfPerigee: Number(line2.slice(34, 42)) * DEG,
    meanAnomaly: Number(line2.slice(43, 51)) * DEG,
    meanMotion: Number(line2.slice(52, 63)) * 2 * Math.PI / 1440, // rad/min
    revolutionsAtEpoch: Number(line2.slice(63, 68))
  };
};
