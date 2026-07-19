// nutation.js — nutation (IAU 2000B) and the obliquity of the ecliptic.
//
//#region edu:nutation
// Precession is the slow (26,000-year) conical motion of the Earth's
// rotation axis; nutation is the small wobble superimposed on it, caused
// mainly by the Moon's orbit plane regressing with an 18.6-year period.
// The main term is only ~17 arcseconds in longitude, but any computation
// of an "apparent" place needs it.
//
// The IAU 2000B model expresses the wobble as a sum of 77 sine/cosine
// terms whose arguments are integer combinations of five "Delaunay
// arguments" — the fundamental angles of the Sun-Earth-Moon system
// (mean anomalies of Moon and Sun, the Moon's argument of latitude, its
// elongation from the Sun, and the node of its orbit). This structure —
// "a handful of fundamental angles, a table of integer multipliers and
// amplitudes" — is the same pattern used by the lunar and planetary
// theories, so this file is a good first example of reading such series.
//
// Model reference: McCarthy & Luzum (2003); coefficient table generated
// from the ERFA (SOFA-derived, BSD) source. Accuracy ~1 mas 1995-2050 —
// three orders of magnitude below this library's arcsecond ambitions.
//#endregion

import { ARCSEC, normalizeAngle } from '../math/angles.js';
import { gmst82 } from '../time/sidereal.js';
import { NUT00B_TERMS } from './data/nut00b-data.js';

const TURNAS = 1296000.0; // arcseconds in one turn

// Nutation in longitude (dpsi) and obliquity (deps), radians.
// IAU 2000B: 77 luni-solar terms plus fixed planetary-bias offsets.
export const nutation = (instant) => {
  const t = instant.julianCenturies();

  // Delaunay arguments (Simon et al. 1994, linear parts), radians
  const el = ((485868.249036 + 1717915923.2178 * t) % TURNAS) * ARCSEC;  // l: Moon mean anomaly
  const elp = ((1287104.79305 + 129596581.0481 * t) % TURNAS) * ARCSEC;  // l': Sun mean anomaly
  const f = ((335779.526232 + 1739527262.8478 * t) % TURNAS) * ARCSEC;   // F: Moon argument of latitude
  const d = ((1072260.70369 + 1602961601.2090 * t) % TURNAS) * ARCSEC;   // D: Moon-Sun elongation
  const om = ((450160.398036 - 6962890.5431 * t) % TURNAS) * ARCSEC;     // Om: Moon ascending node

  // Sum from the smallest terms first to limit floating-point error.
  let dp = 0.0;
  let de = 0.0;
  for (let i = NUT00B_TERMS.length - 1; i >= 0; i--) {
    const x = NUT00B_TERMS[i];
    const arg = x[0] * el + x[1] * elp + x[2] * f + x[3] * d + x[4] * om;
    const sarg = Math.sin(arg);
    const carg = Math.cos(arg);
    dp += (x[5] + x[6] * t) * sarg + x[7] * carg;
    de += (x[8] + x[9] * t) * carg + x[10] * sarg;
  }
  const U2R = ARCSEC / 1e7; // table units: 0.1 microarcsecond
  const MAS = ARCSEC / 1000;

  // Fixed offsets standing in for the ~600 planetary terms of IAU 2000A
  return {
    dpsi: dp * U2R - 0.135 * MAS,
    deps: de * U2R + 0.388 * MAS
  };
};

// Mean obliquity of the ecliptic (IAU 2006), radians.
// The tilt of the Earth's axis against its orbit plane, slowly decreasing
// by ~47 arcseconds per century.
export const meanObliquity = (instant) => {
  const t = instant.julianCenturies();
  return (84381.406
    + (-46.836769
      + (-0.0001831
        + (0.00200340
          + (-0.000000576
            + (-0.0000000434) * t) * t) * t) * t) * t) * ARCSEC;
};

// True obliquity: mean obliquity plus the nutation in obliquity.
export const trueObliquity = (instant) => {
  return meanObliquity(instant) + nutation(instant).deps;
};

//#region edu:equation-of-equinoxes
// Greenwich Apparent Sidereal Time: the mean sidereal angle plus the
// "equation of the equinoxes" — the nutation in longitude projected onto
// the equator (multiply by cos of the obliquity). About +-1.1 seconds of
// time. Use GAST for hour angles of apparent places; use plain GMST for
// the TEME frame of satellite work.
//#endregion
export const gast = (instant) => {
  const { dpsi } = nutation(instant);
  return normalizeAngle(gmst82(instant) + dpsi * Math.cos(meanObliquity(instant)));
};
