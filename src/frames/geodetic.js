// geodetic.js — WGS-84 geodetic coordinates and Earth-fixed frames.
//
//#region edu:geodetic
// The Earth is not a sphere but (to a very good approximation) an
// ellipsoid flattened by rotation: the WGS-84 reference ellipsoid, the
// datum GPS coordinates are expressed in. Two subtleties follow:
//
// 1. Geodetic latitude — the angle your GPS reports — is measured
//    against the local vertical of the ellipsoid, not against the line
//    to the geocenter. The difference (up to ~11 arcminutes at mid
//    latitudes) is why the formulas below carry the eccentricity terms.
//
// 2. Converting Earth-fixed XYZ back to latitude/height has no closed
//    form; the standard approach iterates the latitude equation, which
//    converges in a few rounds.
//
// Note the propagation constants of SGP4 stay on WGS-72 (TLEs are
// fitted with them); WGS-84 here describes the Earth's SURFACE.
//#endregion

import { matVec, matRotZ } from '../math/vec3.js';

export const WGS84 = {
  a: 6378.137,               // equatorial radius, km
  f: 1 / 298.257223563       // flattening
};
const E2 = WGS84.f * (2 - WGS84.f); // first eccentricity squared

// Geodetic {latitude, longitude (rad), height (km)} -> Earth-fixed
// (ECEF) position in km.
export const geodeticToEcef = ({ latitude, longitude, height = 0 }) => {
  const sinLat = Math.sin(latitude);
  const cosLat = Math.cos(latitude);
  // N: prime-vertical radius of curvature at this latitude
  const N = WGS84.a / Math.sqrt(1 - E2 * sinLat * sinLat);
  return Float64Array.of(
    (N + height) * cosLat * Math.cos(longitude),
    (N + height) * cosLat * Math.sin(longitude),
    (N * (1 - E2) + height) * sinLat
  );
};

// Earth-fixed (ECEF) position in km -> geodetic {latitude, longitude
// (rad), height (km)}. Iterative (Bowring-style fixed point).
export const ecefToGeodetic = (r) => {
  const p = Math.hypot(r[0], r[1]);
  const longitude = Math.atan2(r[1], r[0]);
  let latitude = Math.atan2(r[2], p * (1 - E2)); // first guess
  let N = WGS84.a;
  for (let i = 0; i < 8; i++) {
    const sinLat = Math.sin(latitude);
    N = WGS84.a / Math.sqrt(1 - E2 * sinLat * sinLat);
    const next = Math.atan2(r[2] + N * E2 * sinLat, p);
    if (Math.abs(next - latitude) < 1e-12) { latitude = next; break; }
    latitude = next;
  }
  const height = p / Math.cos(latitude) - N;
  return { latitude, longitude, height };
};

//#region edu:enu
// The local horizontal frame ENU (East, North, Up) at an observer:
// rotate the Earth-fixed axes so that z points along the local vertical
// and y toward north. Azimuth measured from north through east and
// elevation above the horizon then fall out of simple trigonometry on
// the ENU components.
//#endregion
export const enuMatrix = ({ latitude, longitude }) => {
  const sinLat = Math.sin(latitude), cosLat = Math.cos(latitude);
  const sinLon = Math.sin(longitude), cosLon = Math.cos(longitude);
  return Float64Array.of(
    -sinLon, cosLon, 0,                        // East
    -sinLat * cosLon, -sinLat * sinLon, cosLat, // North
    cosLat * cosLon, cosLat * sinLon, sinLat    // Up
  );
};

// ECEF vector relative to the observer -> {azimuth, elevation, range}.
// Azimuth in radians from north through east, elevation in radians.
export const enuToAzEl = (enu) => {
  const range = Math.hypot(enu[0], enu[1], enu[2]);
  const azimuth = Math.atan2(enu[0], enu[1]); // atan2(E, N)
  const elevation = Math.asin(enu[2] / range);
  return {
    azimuth: azimuth < 0 ? azimuth + 2 * Math.PI : azimuth,
    elevation,
    range
  };
};
