// observer.js — what a person at a place on Earth actually sees.
//
//#region edu:topocentric
// Ephemeris theories deliver GEOCENTRIC positions — as seen from the
// Earth's center. A real observer stands up to 6378 km away from that
// point, and for nearby bodies the difference (diurnal parallax) is not
// small: up to ~1 degree for the Moon, the reason moonrise times computed
// geocentrically come out 4-5 minutes wrong. There is no need for a
// parallax "formula": place both the target and the observer in the same
// Earth-fixed frame and subtract — the parallax is simply in the
// geometry. The same subtraction gives the true range for free.
//#endregion
//
// API units at this boundary: degrees in and out (latitude, longitude,
// azimuth, elevation, ra, dec), meters for the observer height, km for
// ranges. Everything under this file speaks radians and km only.

import { DEG, normalizeAngle } from '../math/angles.js';
import { matVec } from '../math/vec3.js';
import { geodeticToEcef, enuMatrix, enuToAzEl } from '../frames/geodetic.js';
import { makeState, transform } from '../frames/frames.js';
import { apparentGeocentric } from './apparent.js';
import { refraction as refractionAngle } from './refraction.js';

// observer({ latitude, longitude, height }) — degrees, degrees, METERS.
// (v3 took kilometers here and real users passed meters; the unit is now
// the conventional one and is stated everywhere.)
export const observer = ({ latitude, longitude, height = 0 }) => {
  const geo = {
    latitude: latitude * DEG,
    longitude: longitude * DEG,
    height: height / 1000 // km internally
  };
  const siteEcef = geodeticToEcef(geo);
  const toEnu = enuMatrix(geo);

  return {
    latitude, longitude, height,
    ecef: siteEcef,

    // Apparent topocentric place of a body.
    //   options.lightTime  (default true)  light time + annual aberration
    //   options.refraction (default off)   {} or {pressure, temperature}
    // Returns degrees/km: { azimuth (N=0, E=90), elevation, ra, dec,
    //   range, distance (geocentric), refraction (deg, 0 unless applied) }
    observe: (body, t, options = {}) => {
      const g = apparentGeocentric(body, t, options); // equatorial-of-date
      const gDistance = Math.hypot(g.r[0], g.r[1], g.r[2]);

      // Into the Earth-fixed frame, then subtract the site: parallax and
      // range fall out of the subtraction (see header).
      const ecef = transform(g, { frame: 'ecef' });
      const rel = Float64Array.of(
        ecef.r[0] - siteEcef[0],
        ecef.r[1] - siteEcef[1],
        ecef.r[2] - siteEcef[2]
      );
      const azel = enuToAzEl(matVec(toEnu, rel));

      // Topocentric right ascension / declination: the same relative
      // vector, seen on the true equator & equinox of date.
      const topo = transform(
        makeState({ t, frame: 'ecef', center: 'observer', r: rel }),
        { frame: 'equatorial-of-date' }
      );
      const ra = normalizeAngle(Math.atan2(topo.r[1], topo.r[0]));
      const dec = Math.asin(topo.r[2] / azel.range);

      let elevation = azel.elevation;
      let refr = 0;
      if (options.refraction) {
        refr = refractionAngle(elevation, options.refraction);
        elevation += refr;
      }

      return {
        azimuth: azel.azimuth / DEG,
        elevation: elevation / DEG,
        ra: ra / DEG,
        dec: dec / DEG,
        range: azel.range,
        distance: gDistance,
        refraction: refr / DEG
      };
    }
  };
};
