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
import { requireToken } from '../vocab.js';

// The self-description of observe()'s output. The static part — which
// quantity each field is, its unit, and the frame/center it lives in —
// never changes and is validated against the shared vocabulary once, at
// module load, so a mislabelled field can never ship. The dynamic part
// (which corrections were actually applied, and the instant) is filled
// per call in buildMeta below.
const FIELD_META = {
  azimuth: { quantity: 'azimuth', unit: 'degree', frame: 'horizontal', center: 'observer', topocentric: true },
  elevation: { quantity: 'elevation', unit: 'degree', frame: 'horizontal', center: 'observer', topocentric: true, refractable: true },
  ra: { quantity: 'right-ascension', unit: 'degree', frame: 'equatorial-of-date', center: 'observer', topocentric: true },
  dec: { quantity: 'declination', unit: 'degree', frame: 'equatorial-of-date', center: 'observer', topocentric: true },
  range: { quantity: 'range', unit: 'kilometer', center: 'observer', topocentric: true },
  distance: { quantity: 'distance', unit: 'kilometer', center: 'earth' }, // geocentric, apparent-place only
  refraction: { quantity: 'refraction', unit: 'degree' }
};
for (const f of Object.values(FIELD_META)) {
  requireToken('quantity', f.quantity);
  requireToken('unit', f.unit);
  if (f.frame) requireToken('frame', f.frame);
  if (f.center) requireToken('center', f.center);
}

// Assemble the per-call metadata. `applied` are the apparent-place
// corrections apparentGeocentric reports (light time, aberration, proper
// motion); the topocentric fields add diurnal parallax from the site
// subtraction, and elevation adds refraction when it was applied.
const buildMeta = (t, applied, refracted) => {
  const quantities = {};
  for (const [field, spec] of Object.entries(FIELD_META)) {
    const q = { quantity: spec.quantity, unit: spec.unit };
    if (spec.frame) q.frame = spec.frame;
    if (spec.center) q.center = spec.center;
    if (field === 'refraction') {
      // the refraction field is the correction magnitude itself
    } else if (field === 'distance') {
      q.corrections = applied.slice(); // geocentric distance: apparent-place only
    } else if (spec.topocentric) {
      q.corrections = applied.concat('parallax-diurnal');
      if (spec.refractable && refracted) q.corrections.push('refraction');
    }
    quantities[field] = q;
  }
  const ignored = ['aberration-diurnal', 'deflection', 'polar-motion'];
  if (!refracted) ignored.push('refraction');
  return {
    t: { utc: t.toDate().toISOString(), jd_tt: t.jd('tt') },
    quantities,
    ignored
  };
};

// observer({ latitude, longitude, height }) — degrees, degrees, METERS.
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
    //   options.meta       (default true)  attach the self-describing meta
    // Returns degrees/km: { azimuth (N=0, E=90), elevation, ra, dec,
    //   range, distance (geocentric), refraction (deg, 0 unless applied) }
    // plus, unless meta:false, a meta block that identifies every value
    // (quantity, unit, frame, center, corrections) using vocab.js tokens —
    // so a number kept apart from this call still says what it is.
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

      const result = {
        azimuth: azel.azimuth / DEG,
        elevation: elevation / DEG,
        ra: ra / DEG,
        dec: dec / DEG,
        range: azel.range,
        distance: gDistance,
        refraction: refr / DEG
      };
      if (options.meta === false) return result;
      result.meta = buildMeta(t, g.corrections || [], options.refraction ? true : false);
      return result;
    }
  };
};
