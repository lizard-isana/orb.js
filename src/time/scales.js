// scales.js — the relationship between civil time (UTC) and the uniform
// timescale used by ephemeris theories (TT, Terrestrial Time).
//
//#region edu:timescales
// Why more than one timescale exists:
//
//   TT  (Terrestrial Time)   — uniform, based on atomic clocks (SI second).
//                              Planetary and lunar theories (VSOP87, ELP)
//                              take TT as their time argument.
//   TAI (atomic time)        — TT = TAI + 32.184 s, by definition.
//   UTC (civil time)         — atomic seconds, but kept within 0.9 s of the
//                              Earth-rotation angle UT1 by inserting leap
//                              seconds. What your computer clock shows.
//   UT1 (Earth rotation)     — the actual, slightly irregular rotation of
//                              the Earth. Sidereal time is a function of
//                              UT1 (we approximate UT1 by UTC; the error
//                              is under 0.9 s ~ 0.003 deg of rotation).
//
// So converting UTC -> TT needs the leap-second count:
//
//   TT - UTC = 32.184 s + (TAI - UTC)
//
// which is EXACT for any date since 1972. Since the 2017 leap second the
// value has been frozen at 69.184 s, and the CGPM has resolved to stop
// inserting leap seconds by 2035, so carrying the last table entry
// forward is the best available prediction. Before 1972 UTC in its
// modern form did not exist, and we fall back to the NASA polynomial
// fit of Delta T = TT - UT1.
//
// Skipping this correction shifts every computed position by the motion
// of the body over ~69 s: about 38 arcseconds for the Moon. (v3 shipped
// for years with the correction commented out — hence this long comment.)
//#endregion

// TAI-UTC offset (leap seconds) since 1972: [effective UTC ms, seconds]
const LEAP_SECONDS = [
  [Date.UTC(1972, 0, 1), 10],
  [Date.UTC(1972, 6, 1), 11],
  [Date.UTC(1973, 0, 1), 12],
  [Date.UTC(1974, 0, 1), 13],
  [Date.UTC(1975, 0, 1), 14],
  [Date.UTC(1976, 0, 1), 15],
  [Date.UTC(1977, 0, 1), 16],
  [Date.UTC(1978, 0, 1), 17],
  [Date.UTC(1979, 0, 1), 18],
  [Date.UTC(1980, 0, 1), 19],
  [Date.UTC(1981, 6, 1), 20],
  [Date.UTC(1982, 6, 1), 21],
  [Date.UTC(1983, 6, 1), 22],
  [Date.UTC(1985, 6, 1), 23],
  [Date.UTC(1988, 0, 1), 24],
  [Date.UTC(1990, 0, 1), 25],
  [Date.UTC(1991, 0, 1), 26],
  [Date.UTC(1992, 6, 1), 27],
  [Date.UTC(1993, 6, 1), 28],
  [Date.UTC(1994, 6, 1), 29],
  [Date.UTC(1996, 0, 1), 30],
  [Date.UTC(1997, 6, 1), 31],
  [Date.UTC(1999, 0, 1), 32],
  [Date.UTC(2006, 0, 1), 33],
  [Date.UTC(2009, 0, 1), 34],
  [Date.UTC(2012, 6, 1), 35],
  [Date.UTC(2015, 6, 1), 36],
  [Date.UTC(2017, 0, 1), 37]
];

// TT - UTC in seconds for a UTC epoch given in milliseconds.
// Exact from 1972 onward; NASA Delta T polynomial before that.
export const ttMinusUtc = (utcMs) => {
  if (utcMs < LEAP_SECONDS[0][0]) {
    const d = new Date(utcMs);
    return deltaT(d.getUTCFullYear(), d.getUTCMonth() + 1);
  }
  let taiUtc = LEAP_SECONDS[0][1];
  for (let i = 0; i < LEAP_SECONDS.length; i++) {
    if (utcMs >= LEAP_SECONDS[i][0]) {
      taiUtc = LEAP_SECONDS[i][1];
    } else {
      break;
    }
  }
  return 32.184 + taiUtc;
};

// NASA "Polynomial Expressions for Delta T" (Espenak & Meeus),
// https://eclipse.gsfc.nasa.gov/SEcat5/deltatpoly.html
// Delta T = TT - UT1 in seconds, as a piecewise polynomial in the year.
// Used here only as the pre-1972 fallback; note that the post-2005
// segments are extrapolations made in 2005 and overestimate the modern
// era (they predict ~75 s for 2026 where the true value is ~69 s), which
// is exactly why the leap-second table takes precedence when applicable.
export const deltaT = (year, month = 6) => {
  const y = year + (month - 0.5) / 12;
  let u, t, dt;
  if (year <= -500) {
    u = (y - 1820) / 100;
    dt = -20 + 32 * u * u;
  } else if (year <= 500) {
    u = y / 100;
    dt = 10583.6 - 1014.41 * u + 33.78311 * u ** 2 - 5.952053 * u ** 3
      - 0.1798452 * u ** 4 + 0.022174192 * u ** 5 + 0.0090316521 * u ** 6;
  } else if (year <= 1600) {
    u = (y - 1000) / 100;
    dt = 1574.2 - 556.01 * u + 71.23472 * u ** 2 + 0.319781 * u ** 3
      - 0.8503463 * u ** 4 - 0.005050998 * u ** 5 + 0.0083572073 * u ** 6;
  } else if (year <= 1700) {
    t = y - 1600;
    dt = 120 - 0.9808 * t - 0.01532 * t ** 2 + t ** 3 / 7129;
  } else if (year <= 1800) {
    t = y - 1700;
    dt = 8.83 + 0.1603 * t - 0.0059285 * t ** 2 + 0.00013336 * t ** 3 - t ** 4 / 1174000;
  } else if (year <= 1860) {
    t = y - 1800;
    dt = 13.72 - 0.332447 * t + 0.0068612 * t ** 2 + 0.0041116 * t ** 3 - 0.00037436 * t ** 4
      + 0.0000121272 * t ** 5 - 0.0000001699 * t ** 6 + 0.000000000875 * t ** 7;
  } else if (year <= 1900) {
    t = y - 1860;
    dt = 7.62 + 0.5737 * t - 0.251754 * t ** 2 + 0.01680668 * t ** 3
      - 0.0004473624 * t ** 4 + t ** 5 / 233174;
  } else if (year <= 1920) {
    t = y - 1900;
    dt = -2.79 + 1.494119 * t - 0.0598939 * t ** 2 + 0.0061966 * t ** 3 - 0.000197 * t ** 4;
  } else if (year <= 1941) {
    t = y - 1920;
    dt = 21.20 + 0.84493 * t - 0.076100 * t ** 2 + 0.0020936 * t ** 3;
  } else if (year <= 1961) {
    t = y - 1950;
    dt = 29.07 + 0.407 * t - t ** 2 / 233 + t ** 3 / 2547;
  } else if (year <= 1986) {
    t = y - 1975;
    dt = 45.45 + 1.067 * t - t ** 2 / 260 - t ** 3 / 718;
  } else if (year <= 2005) {
    t = y - 2000;
    dt = 63.86 + 0.3345 * t - 0.060374 * t ** 2 + 0.0017275 * t ** 3
      + 0.000651814 * t ** 4 + 0.00002373599 * t ** 5;
  } else if (year <= 2050) {
    t = y - 2000;
    dt = 62.92 + 0.32217 * t + 0.005589 * t ** 2;
  } else if (year <= 2150) {
    // Bridging expression that removes the discontinuity at 2050.
    dt = -20 + 32 * ((y - 1820) / 100) ** 2 - 0.5628 * (2150 - y);
  } else {
    u = (y - 1820) / 100;
    dt = -20 + 32 * u * u;
  }
  return dt;
};
