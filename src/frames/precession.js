// precession.js — precession of the equinoxes, IAU 2006 model.
//
//#region edu:precession
// The Earth's rotation axis traces a cone against the stars once every
// ~25,800 years, so the coordinate frame "equator and equinox of date"
// slides against the fixed frame "equator and equinox of J2000.0" by
// about 50 arcseconds per year. Any position quoted "of date" (as the
// Sun and Moon theories produce) and any position quoted "J2000" (as
// VSOP87 produces) therefore differ by the accumulated precession —
// about 0.4 degrees in 2026 and growing. Mixing the two frames without
// converting was an actual bug in orb.js v3; in v4 the frame is part of
// the state-vector type and this file supplies the conversion.
//
// The IAU 2006 parameterization used here (Fukushima-Williams angles
// gamma_bar, phi_bar, psi_bar plus the mean obliquity) composes four
// axis rotations into one matrix:
//
//     P = R1(-eps_A) R3(-psi_bar) R1(phi_bar) R3(gamma_bar)
//
// which takes GCRS/J2000 equatorial coordinates to the mean equator and
// equinox of date. (The tiny 23-mas frame bias between GCRS and J2000 is
// far below this library's accuracy class and is deliberately ignored.)
//
// Angle polynomials from Hilton et al. (2006) / IERS Conventions, as
// distributed in the ERFA (SOFA-derived, BSD) library, pfw06.c.
//#endregion

import { ARCSEC } from '../math/angles.js';
import { matRotX, matRotZ, matMul } from '../math/vec3.js';
import { meanObliquity, nutation } from './nutation.js';

// Fukushima-Williams precession angles (radians) at the given instant.
export const precessionAngles = (instant) => {
  const t = instant.julianCenturies();
  const gamb = (-0.052928
    + (10.556378
      + (0.4932044
        + (-0.00031238
          + (-0.000002788
            + (0.0000000260) * t) * t) * t) * t) * t) * ARCSEC;
  const phib = (84381.412819
    + (-46.811016
      + (0.0511268
        + (0.00053289
          + (-0.000000440
            + (-0.0000000176) * t) * t) * t) * t) * t) * ARCSEC;
  const psib = (-0.041775
    + (5038.481484
      + (1.5584175
        + (-0.00018522
          + (-0.000026452
            + (-0.0000000148) * t) * t) * t) * t) * t) * ARCSEC;
  return { gamb, phib, psib, epsa: meanObliquity(instant) };
};

// Precession matrix: equatorial J2000 -> mean equator & equinox of date.
export const precessionMatrix = (instant) => {
  const { gamb, phib, psib, epsa } = precessionAngles(instant);
  return matMul(matRotX(-epsa),
    matMul(matRotZ(-psib),
      matMul(matRotX(phib), matRotZ(gamb))));
};

// Nutation matrix: mean of date -> true equator & equinox of date.
//   N = R1(-(eps_A + deps)) R3(-dpsi) R1(eps_A)
export const nutationMatrix = (instant) => {
  const { dpsi, deps } = nutation(instant);
  const epsa = meanObliquity(instant);
  return matMul(matRotX(-(epsa + deps)),
    matMul(matRotZ(-dpsi), matRotX(epsa)));
};

// Combined matrix: equatorial J2000 -> true equator & equinox of date.
export const precessionNutationMatrix = (instant) => {
  return matMul(nutationMatrix(instant), precessionMatrix(instant));
};
