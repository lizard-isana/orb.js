// star.js — a fixed catalogue source (a star) as a body on the frame graph.
//
//#region edu:star
// A star is not propagated from an ephemeris: it is a fixed direction on
// the celestial sphere, given once at a catalogue equinox (here J2000)
// and carried forward only by its slow PROPER MOTION across the sky
// (arcseconds per year). That makes its apparent place simpler than a
// planet's — there is no meaningful light-travel time to iterate, and at
// stellar distances the annual and diurnal PARALLAX are below an
// arcsecond and ignored. The corrections that remain are precession and
// nutation (handled by the frame graph) plus annual aberration.
//
// So the direction is placed at a large nominal distance and tagged with
// center 'star'; the observer pipeline reads that tag to apply aberration
// but skip light time and parallax.
//#endregion

import { makeState } from '../frames/frames.js';
import { HOUR, DEG } from '../math/angles.js';

// Far enough that the observer/Sun offsets vanish in the geometry, near
// enough to keep full double precision in the direction.
const FAR_KM = 1e12;
const JYEAR_DAYS = 365.25;
const J2000_JD = 2451545.0;

// star({ ra, dec, pmRA, pmDE, epoch, name }) -> body-like { name, state }.
//   ra    right ascension, HOURS, at the catalogue equinox (J2000)
//   dec   declination, DEGREES, at the catalogue equinox (J2000)
//   pmRA  proper motion on the sky in RA, arcsec/yr (already * cos dec)
//   pmDE  proper motion in declination, arcsec/yr
//   epoch catalogue epoch, Julian year (default 2000.0)
export const star = ({ ra, dec, pmRA = 0, pmDE = 0, epoch = 2000, name = null }) => ({
  name,
  state: (instant) => {
    // Julian years from the catalogue epoch. Proper motion is tiny, so
    // the TT/UT distinction is irrelevant here.
    const years = (instant.jd('tt') - J2000_JD) / JYEAR_DAYS - (epoch - 2000);
    const decDeg = dec + (pmDE * years) / 3600;
    const cosDec = Math.cos(dec * DEG);
    // pmRA is a sky rate; dividing by cos(dec) turns it back into a
    // change in the RA coordinate (skipped at the poles, where RA is ill
    // defined and proper motion in RA is negligible anyway).
    const raHours = Math.abs(cosDec) > 1e-6
      ? ra + (pmRA * years) / cosDec / 3600 / 15
      : ra;
    const raRad = raHours * HOUR;
    const decRad = decDeg * DEG;
    const cd = Math.cos(decRad);
    return makeState({
      t: instant,
      frame: 'equatorial-j2000',
      center: 'star',
      r: [
        FAR_KM * cd * Math.cos(raRad),
        FAR_KM * cd * Math.sin(raRad),
        FAR_KM * Math.sin(decRad)
      ]
    });
  }
});
