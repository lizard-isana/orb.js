// sidereal.js — Greenwich Mean Sidereal Time.
//
//#region edu:sidereal-time
// Sidereal time is the rotation angle of the Earth measured against the
// stars rather than the Sun. A solar day (24h) is slightly longer than a
// rotation because the Earth also moves along its orbit; the ratio is the
// 1.0027379... factor buried in the polynomial below.
//
// Sidereal time is a function of UT1 — the timescale that follows the
// actual rotation of the Earth — NOT of TT. Feeding TT into a sidereal
// time formula is a classic mistake that shifts every azimuth by ~17
// arcseconds (the library approximates UT1 by UTC, good to 0.9 s).
//
// Two flavours matter here:
//   GMST (mean)     — smooth angle, IAU 1982 model. Also the rotation
//                     angle that pairs with the TEME frame used by SGP4
//                     (Vallado, "Revisiting Spacetrack Report #3").
//   GAST (apparent) — GMST plus the "equation of the equinoxes", the
//                     nutation of the equinox projected onto the equator.
//                     This is the angle to use for hour angles of
//                     apparent places. Defined in frames/, because it
//                     needs the nutation model.
//#endregion

import { TWO_PI, normalizeAngle } from '../math/angles.js';

// Greenwich Mean Sidereal Time (IAU 1982) in RADIANS for the given
// Instant. Reference: Vallado, Fundamentals of Astrodynamics, eq. 3-45;
// identical to ERFA gmst82() up to the UT1~UTC approximation.
export const gmst82 = (instant) => {
  const [jda, jdb] = instant.jd2parts('ut1');
  const tut1 = (jda - 2451545.0 + jdb) / 36525.0;
  // seconds of sidereal time; 876600 h * 3600 s/h is the whole-turns part
  const sec = 67310.54841
    + (876600.0 * 3600 + 8640184.812866) * tut1
    + 0.093104 * tut1 * tut1
    - 6.2e-6 * tut1 * tut1 * tut1;
  // 86400 sidereal-formula seconds = 360 degrees: 1/240 deg per second
  return normalizeAngle(sec * (Math.PI / 180) / 240.0);
};
