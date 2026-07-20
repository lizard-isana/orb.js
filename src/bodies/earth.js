// earth.js — heliocentric position and velocity of the Earth.
//
//#region edu:earth-epv00
// The Earth gets the highest-grade series in the library, because its
// errors contaminate the whole sky: every geocentric position contains
// "minus the Earth", and the Sun is exactly minus the Earth, so an
// Earth error shows up there at full weight.
//
// The model is the epv00 ephemeris of ERFA (SOFA-derived, BSD): a
// Simon et al. harmonic series fitted to JPL DE405, milliarcsecond
// class over 1900-2100 at ~1300 terms. The series has the familiar
// amplitude/phase/frequency form; an empirical rotation matrix aligns
// the model to the DE405/ICRS equatorial frame, which is why this body
// natively reports 'equatorial-j2000' rather than the ecliptic.
//#endregion

import { makeState } from '../frames/frames.js';
import {
  E0X, E0Y, E0Z, E1X, E1Y, E1Z, E2X, E2Y, E2Z
} from './data/earth-epv00-data.js';

const AU_KM = 149597870.7;
const DJY = 365.25; // days per Julian year
const SERIES = [
  [E0X, E1X, E2X],
  [E0Y, E1Y, E2Y],
  [E0Z, E1Z, E2Z]
];

// Empirical rotation aligning the model's ecliptic to DE405/ICRS
// (Euler angles: -23deg26'21.4091" about x, +0.0475" about z).
const AM12 = 0.000000211284, AM13 = -0.000000091603;
const AM21 = -0.000000230286, AM22 = 0.917482137087, AM23 = -0.397776982902;
const AM32 = 0.397776982902, AM33 = 0.917482137087;

export const earth = {
  name: 'earth',
  state: (instant) => {
    const t = (instant.jd1 - 2451545.0 + instant.jd2) / DJY; // Julian years TT
    const t2 = t * t;
    const p = [0, 0, 0];
    const v = [0, 0, 0];
    for (let i = 0; i < 3; i++) {
      let xyz = 0.0;
      let xyzd = 0.0;
      const [c0, c1, c2] = SERIES[i];
      for (let j = 0; j < c0.length; j += 3) {
        const a = c0[j], ph = c0[j + 1] + c0[j + 2] * t;
        xyz += a * Math.cos(ph);
        xyzd -= a * c0[j + 2] * Math.sin(ph);
      }
      for (let j = 0; j < c1.length; j += 3) {
        const a = c1[j], ct = c1[j + 2] * t, ph = c1[j + 1] + ct;
        const cp = Math.cos(ph);
        xyz += a * t * cp;
        xyzd += a * (cp - ct * Math.sin(ph));
      }
      for (let j = 0; j < c2.length; j += 3) {
        const a = c2[j], ct = c2[j + 2] * t, ph = c2[j + 1] + ct;
        const cp = Math.cos(ph);
        xyz += a * t2 * cp;
        xyzd += a * t * (2.0 * cp - ct * Math.sin(ph));
      }
      p[i] = xyz;
      v[i] = xyzd / DJY; // au/day
    }
    // model ecliptic -> ICRS/J2000 equatorial, au -> km, au/day -> km/s
    const kmps = AU_KM / 86400.0;
    return makeState({
      t: instant,
      frame: 'equatorial-j2000',
      center: 'sun',
      r: [
        (p[0] + AM12 * p[1] + AM13 * p[2]) * AU_KM,
        (AM21 * p[0] + AM22 * p[1] + AM23 * p[2]) * AU_KM,
        (AM32 * p[1] + AM33 * p[2]) * AU_KM
      ],
      v: [
        (v[0] + AM12 * v[1] + AM13 * v[2]) * kmps,
        (AM21 * v[0] + AM22 * v[1] + AM23 * v[2]) * kmps,
        (AM32 * v[1] + AM33 * v[2]) * kmps
      ]
    });
  }
};
