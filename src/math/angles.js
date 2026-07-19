// angles.js — angle units and formatting.
//
// Internal policy of orb.js v4: every angle inside the library is in
// RADIANS, full stop. Degrees, hours-minutes-seconds and
// degrees-arcminutes-arcseconds exist only at the API boundary, produced
// by the formatters below. v3 mixed degrees, hours and radians across
// modules and that mix was the direct cause of several bugs; a single
// internal unit makes that class of bug impossible.

export const DEG = Math.PI / 180;        // multiply degrees by this to get radians
export const ARCSEC = DEG / 3600;        // multiply arcseconds by this to get radians
export const HOUR = Math.PI / 12;        // multiply hours of RA/time-angle by this
export const TWO_PI = 2 * Math.PI;

export const deg = (rad) => rad / DEG;   // radians -> degrees
export const rad = (d) => d * DEG;       // degrees -> radians

//#region edu:angle-normalization
// Reduce an angle to [0, 2pi). JavaScript's % operator keeps the sign of
// the dividend (like C's fmod), so a single "x % TWO_PI" can be negative;
// adding one turn and reducing again gives the non-negative representative.
// Getting this wrong is a classic source of 360-degree jumps in plots.
export const normalizeAngle = (x) => {
  const r = x % TWO_PI;
  return r < 0 ? r + TWO_PI : r;
};
//#endregion

// Reduce an angle to (-pi, +pi], for quantities that are naturally signed
// (nutation, hour angles around the meridian).
export const normalizeSigned = (x) => {
  let r = normalizeAngle(x);
  if (r > Math.PI) r -= TWO_PI;
  return r;
};

// Format a radian angle as hours minutes seconds (right ascension custom:
// 24h = 360 deg). Returns e.g. "7h 49m 33.02s".
export const hms = (radAngle, secondsDigits = 2) => {
  const hoursTotal = normalizeAngle(radAngle) / HOUR;
  const h = Math.floor(hoursTotal);
  const minutesTotal = (hoursTotal - h) * 60;
  const m = Math.floor(minutesTotal);
  const s = (minutesTotal - m) * 60;
  return `${h}h ${String(m).padStart(2, "0")}m ${s.toFixed(secondsDigits).padStart(secondsDigits > 0 ? secondsDigits + 3 : 2, "0")}s`;
};

// Format a radian angle as signed degrees arcminutes arcseconds,
// e.g. "-16° 42' 58.0\"". Suitable for declination and latitude.
export const dms = (radAngle, secondsDigits = 1) => {
  const sign = radAngle < 0 ? "-" : "+";
  const degTotal = Math.abs(radAngle) / DEG;
  const d = Math.floor(degTotal);
  const minutesTotal = (degTotal - d) * 60;
  const m = Math.floor(minutesTotal);
  const s = (minutesTotal - m) * 60;
  return `${sign}${d}° ${String(m).padStart(2, "0")}' ${s.toFixed(secondsDigits).padStart(secondsDigits > 0 ? secondsDigits + 3 : 2, "0")}"`;
};
