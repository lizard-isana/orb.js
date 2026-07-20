// compat/v3.js — the classic orb.js class API (v2/v3), reimplemented on
// the current core.
//
// Existing code written against the old API keeps working with only the
// import changed:
//
//     import * as Orb from 'orb/compat/v3.js';
//     new Orb.Luna().radec(date);
//
// The numbers, however, come from the current pipeline, so results
// differ from the old implementation by its documented model
// improvements (light time and aberration applied to apparent places,
// IAU 2006/2000B precession-nutation, official untruncated VSOP87A
// data, millisecond TLE epochs). The old unit conventions are kept
// exactly: right ascension in HOURS, sidereal time in HOURS, observer
// altitude in KM, distances in au or km depending on the body, angles
// in degrees.

import { Instant } from '../time/instant.js';
import { gmst82 as gmst82Rad } from '../time/sidereal.js';
import { deltaT } from '../time/scales.js';
import { gast as gastRad, trueObliquity } from '../frames/nutation.js';
import { DEG, HOUR, TWO_PI, normalizeAngle } from '../math/angles.js';
import { rotx, rotz } from '../math/vec3.js';
import { makeState, transform } from '../frames/frames.js';
import { geodeticToEcef, ecefToGeodetic } from '../frames/geodetic.js';
import { sun } from '../bodies/sun.js';
import { moon } from '../bodies/moon.js';
import { earth } from '../bodies/earth.js';
import { mercury } from '../bodies/mercury.js';
import { venus } from '../bodies/venus.js';
import { mars } from '../bodies/mars.js';
import { jupiter } from '../bodies/jupiter.js';
import { saturn } from '../bodies/saturn.js';
import { uranus } from '../bodies/uranus.js';
import { neptune } from '../bodies/neptune.js';
import { apparentGeocentric } from '../observer/apparent.js';
import { observer } from '../observer/observer.js';
import { refraction } from '../observer/refraction.js';
import { propagateKepler, elementsToState, stateToElements } from '../math/kepler.js';
import { parseTle } from '../sgp4/tle.js';
import { satellite } from '../sgp4/satellite.js';
import { sgp4init, sgp4, gstime, wgs72 } from '../sgp4/propagation.js';
import { moonAge } from '../events/phases.js';

export { gstime, sgp4, sgp4init, wgs72 };

const AU_KM = 149597870.7;

// ---------------------------------------------------------------- core

export const Constant = {
  PI: Math.PI,
  RAD: Math.PI / 180,
  AU: 149597870.7,   // km
  RE: 6378.137,      // Earth equatorial radius, km
  LD: 384000,        // lunar distance, km
  LY: 9.46073e12,    // light year, km
  PC: 3.08568e13,    // parsec, km
  G: 6.6740831e-11,
  GM: 2.9591220828559093e-4, // solar GM, au^3/day^2
  Planets: ['Sun', 'Mercury', 'Venus', 'Earth', 'Moon', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune'],
  Sun: { radius: 1392038 / 2, obliquity: 7.25, mass: 1.989e30, gm: 1.327124400189e11 },
  Mercury: { radius: 4879.4 / 2, obliquity: 0.027, mass: 3.301e23, gm: 22032.9 },
  Venus: { radius: 12103.6 / 2, obliquity: 177.36, mass: 4.867e24, gm: 324859.9 },
  Earth: { radius: 12756.3 / 2, obliquity: 23.435, mass: 5.972e24, gm: 3.9860044189e5 },
  Moon: { radius: 1737.4, obliquity: 1.5424, mass: 7.346e22, gm: 4902.800066 },
  Mars: { radius: 6794.4 / 2, obliquity: 25, mass: 6.417e24, gm: 42828.9 },
  Jupiter: { radius: 142984 / 2, obliquity: 3.08, mass: 1.899e27, gm: 126686534.9 },
  Saturn: { radius: 120536 / 2, obliquity: 26.7, mass: 5.685e26, gm: 37931187.9 },
  Uranus: { radius: 51118 / 2, obliquity: 97.9, mass: 8.681e25, gm: 5793939.9 },
  Neptune: { radius: 49572 / 2, obliquity: 29.6, mass: 1.024e26, gm: 6836529.9 }
};
export const Const = Constant;

export const RoundAngle = (degree) => {
  let angle = degree % 360;
  if (angle < 0) angle += 360;
  return angle;
};

export const ZeroFill = (num, length) => {
  const len = length || String(num).length;
  return ('0000000000' + String(num)).slice(-len);
};

// state (equatorial rectangular) -> the classic {ra (hours), dec, distance}
const stateToRadec = (s) => {
  const d = Math.hypot(s.r[0], s.r[1], s.r[2]);
  return {
    ra: normalizeAngle(Math.atan2(s.r[1], s.r[0])) / HOUR,
    dec: Math.asin(s.r[2] / d) / DEG,
    distance: d // km
  };
};

// ---------------------------------------------------------------- time

export class Time {
  constructor(date = new Date()) {
    this.date = date;
    this.year = date.getUTCFullYear();
    this.month = date.getUTCMonth() + 1;
    this.day = date.getUTCDate();
    this.hours = date.getUTCHours();
    this.minutes = date.getUTCMinutes();
    this.seconds = date.getUTCSeconds();
    this.milliseconds = date.getUTCMilliseconds();
    this._instant = Instant.fromDate(date);
  }

  time_in_day = () =>
    this.hours / 24 + this.minutes / 1440 + this.seconds / 86400 + this.milliseconds / 86400000;

  jd = () => this._instant.jd('utc');
  jd_tt = () => this._instant.jd('tt');
  tt_minus_utc = () => this._instant.ttMinusUtc();
  delta_t = () => deltaT(this.year, this.month);

  // sidereal time in HOURS (the historic convention of this API)
  gmst82 = () => gmst82Rad(this._instant) / HOUR;
  gast = () => gastRad(this._instant) / HOUR;
  gmst = () => this.gast(); // historic alias: always returned apparent

  doy = () => {
    const d0 = Date.UTC(this.year - 1, 11, 31, 0, 0, 0);
    return (this.date.getTime() - d0) / 86400000;
  };
}

// ---------------------------------------------------------------- sun

export class Sun {
  _observable = () => ({ body: sun, unit: 'au' });

  radec = (date) => {
    const g = apparentGeocentric(sun, Instant.fromDate(date)); // equatorial-of-date
    const r = stateToRadec(g);
    return {
      ra: r.ra, dec: r.dec, distance: r.distance / AU_KM,
      date,
      coordinate_keywords: 'equatorial spherical',
      unit_keywords: 'degree hour au'
    };
  };

  xyz = (date) => {
    const g = apparentGeocentric(sun, Instant.fromDate(date));
    return {
      x: g.r[0] / AU_KM, y: g.r[1] / AU_KM, z: g.r[2] / AU_KM,
      date,
      coordinate_keywords: 'equatorial rectangular',
      unit_keywords: 'au'
    };
  };
}

// ---------------------------------------------------------------- moon

export class Luna {
  _observable = () => ({ body: moon, unit: 'km' });

  latlng = (date) => {
    const t = Instant.fromDate(date);
    const m = moon.latlng(t); // radians / km, ecliptic of date (apparent)
    return {
      latitude: m.latitude / DEG,
      longitude: m.longitude / DEG,
      distance: m.distance,
      obliquity: trueObliquity(t) / DEG,
      date,
      coordinate_keywords: 'ecliptic spherical',
      unit_keywords: 'degree km'
    };
  };

  radec = (date) => {
    const g = apparentGeocentric(moon, Instant.fromDate(date));
    const r = stateToRadec(g);
    return {
      ra: r.ra, dec: r.dec, distance: r.distance,
      date,
      coordinate_keywords: 'equatorial spherical',
      unit_keywords: 'degree hour km'
    };
  };

  xyz = (date) => {
    const s = moon.state(Instant.fromDate(date)); // ecliptic of date, km
    return {
      x: s.r[0], y: s.r[1], z: s.r[2],
      date,
      coordinate_keywords: 'ecliptic rectangular',
      unit_keywords: 'km'
    };
  };

  parallax = (date) => {
    const m = moon.latlng(Instant.fromDate(date));
    return Math.asin(6378.137 / m.distance) / DEG;
  };

  // days since the last new moon ("moon age", 0..29.5)
  phase = (date) => moonAge(Instant.fromDate(date));
}

export class Moon {
  constructor() { return new Luna(); }
}

// ---------------------------------------------------------------- planets

const PLANET_BODIES = {
  Mercury: mercury, Venus: venus, Earth: earth, Mars: mars,
  Jupiter: jupiter, Saturn: saturn, Uranus: uranus, Neptune: neptune
};

export class VSOP {
  constructor(target) {
    if (!PLANET_BODIES[target]) {
      throw new RangeError('VSOP: unknown target ' + target);
    }
    this.target = target;
    this._body = PLANET_BODIES[target];
  }

  _observable = () => ({ body: this._body, unit: 'au' });

  // heliocentric ecliptic J2000 rectangular, au
  xyz = (date) => {
    const s = transform(this._body.state(Instant.fromDate(date)),
      { frame: 'ecliptic-j2000' });
    return {
      x: s.r[0] / AU_KM, y: s.r[1] / AU_KM, z: s.r[2] / AU_KM,
      date,
      coordinate_keywords: 'ecliptic rectangular j2000',
      unit_keywords: 'au'
    };
  };

  // geocentric apparent place on the equator of date
  radec = (date) => {
    const g = apparentGeocentric(this._body, Instant.fromDate(date));
    const r = stateToRadec(g);
    return {
      ra: r.ra, dec: r.dec, distance: r.distance / AU_KM,
      date,
      coordinate_keywords: 'equatorial spherical',
      unit_keywords: 'hours degree au'
    };
  };
}

export class Mercury { constructor() { return new VSOP('Mercury'); } }
export class Venus { constructor() { return new VSOP('Venus'); } }
export class Mars { constructor() { return new VSOP('Mars'); } }
export class Jupiter { constructor() { return new VSOP('Jupiter'); } }
export class Saturn { constructor() { return new VSOP('Saturn'); } }
export class Uranus { constructor() { return new VSOP('Uranus'); } }
export class Neptune { constructor() { return new VSOP('Neptune'); } }
export const Planet = VSOP;

export class Earth {
  xyz = (date) => new VSOP('Earth').xyz(date);
  radec = () => null; // historic: the Earth has no geocentric place
}

// ---------------------------------------------------------------- kepler

// Classic osculating-element propagation: elements in DEGREES and au,
// epoch/time_of_periapsis as Julian dates, gm in au^3/day^2 (defaults
// to the Sun). Runs on the universal-variable solver, so e < 1, e = 1
// and e > 1 all take the same path.
export class Kepler {
  constructor(orbital_elements) {
    this.orbital_elements = orbital_elements;
    this.gm = orbital_elements.gm ? Number(orbital_elements.gm) : Constant.GM;
    if (orbital_elements.perihelion_distance && !orbital_elements.periapsis_distance) {
      orbital_elements.periapsis_distance = orbital_elements.perihelion_distance;
    }
  }

  // semi-latus rectum (au) from whichever shape parameter was given
  _shape = () => {
    const els = this.orbital_elements;
    const e = Number(els.eccentricity);
    let p;
    if (els.periapsis_distance !== undefined) {
      p = Number(els.periapsis_distance) * (1 + e);
    } else if (els.semi_major_axis !== undefined) {
      p = Math.abs(Number(els.semi_major_axis) * (1 - e * e));
    } else {
      throw new RangeError('Kepler: need periapsis_distance or semi_major_axis');
    }
    return { e, p };
  };

  // time of periapsis (JD): direct, or from epoch + mean anomaly
  _timeOfPeriapsis = (e, p) => {
    const els = this.orbital_elements;
    if (els.time_of_periapsis !== undefined) return Number(els.time_of_periapsis);
    const a = Math.abs(p / (1 - e * e)); // |a|, au
    const n = Math.sqrt(this.gm / (a * a * a)); // rad/day
    const m = Number(els.mean_anomaly) * DEG;
    return Number(els.epoch) - m / n;
  };

  // {r (au), v (au/day)} in ecliptic J2000 at the given date
  _propagate = (date) => {
    const els = this.orbital_elements;
    const { e, p } = this._shape();
    const tp = this._timeOfPeriapsis(e, p);
    const peri = elementsToState({
      semiLatusRectum: p,
      eccentricity: e,
      inclination: Number(els.inclination) * DEG,
      raan: Number(els.longitude_of_ascending_node) * DEG,
      argumentOfPerigee: Number(els.argument_of_periapsis) * DEG,
      trueAnomaly: 0
    }, this.gm);
    const dtDays = Instant.fromDate(date).jd('utc') - tp;
    return propagateKepler(peri.r, peri.v, dtDays, this.gm);
  };

  xyz = (date) => {
    const { r, v } = this._propagate(date);
    const els = this.orbital_elements;
    // in-plane ("orbital plane") coordinates: rotate 3-1-3 into perifocal
    const toPerifocal = (u) => rotz(rotx(rotz(
      u, Number(els.longitude_of_ascending_node) * DEG),
      Number(els.inclination) * DEG),
      Number(els.argument_of_periapsis) * DEG);
    const pf = toPerifocal(r);
    const pfDot = toPerifocal(v);
    return {
      x: r[0], y: r[1], z: r[2],
      xdot: v[0], ydot: v[1], zdot: v[2],
      orbital_plane: {
        r: Math.hypot(r[0], r[1], r[2]),
        x: pf[0], y: pf[1], xdot: pfDot[0], ydot: pfDot[1]
      },
      date,
      coordinate_keywords: 'ecliptic rectangular j2000',
      unit_keywords: 'au au/d'
    };
  };

  _observable = () => ({
    body: {
      state: (instant) => {
        const { r, v } = this._propagate(instant.toDate());
        return makeState({
          t: instant, frame: 'ecliptic-j2000', center: 'sun',
          r: [r[0] * AU_KM, r[1] * AU_KM, r[2] * AU_KM],
          v: [v[0] * AU_KM / 86400, v[1] * AU_KM / 86400, v[2] * AU_KM / 86400]
        });
      }
    },
    unit: 'au'
  });

  radec = (date) => {
    const g = apparentGeocentric(this._observable().body, Instant.fromDate(date));
    const r = stateToRadec(g);
    return {
      ra: r.ra, dec: r.dec, distance: r.distance / AU_KM,
      date,
      coordinate_keywords: 'equatorial spherical',
      unit_keywords: 'hour degree au'
    };
  };
}

export class KeplerianToCartesian {
  constructor(orbital_elements) { return new Kepler(orbital_elements); }
}

// Cartesian state (au, au/day) -> classic osculating elements (degrees,
// au, JD). Returns a plain object, as the old API did.
export class Cartesian {
  constructor(cartesian) {
    const gm = cartesian.gm ? Number(cartesian.gm) : Constant.GM;
    let epoch;
    if (cartesian.epoch) {
      epoch = Number(cartesian.epoch);
    } else if (cartesian.date) {
      epoch = Instant.fromDate(cartesian.date).jd('utc');
    } else {
      epoch = Instant.fromDate(new Date()).jd('utc');
    }
    const el = stateToElements({
      r: Float64Array.of(cartesian.x, cartesian.y, cartesian.z),
      v: Float64Array.of(cartesian.xdot, cartesian.ydot, cartesian.zdot)
    }, gm);

    const e = el.eccentricity;
    const nu = el.trueAnomaly;
    const a = el.semiMajorAxis;
    // mean anomaly and motion from the true anomaly, per conic type
    let meanAnomaly, meanMotion; // radians, rad/day
    if (e > 1) {
      const F = 2 * Math.atanh(Math.sqrt((e - 1) / (e + 1)) * Math.tan(nu / 2));
      meanAnomaly = e * Math.sinh(F) - F;
      meanMotion = Math.sqrt(gm / Math.pow(-a, 3));
    } else {
      const E = 2 * Math.atan(Math.sqrt((1 - e) / (1 + e)) * Math.tan(nu / 2));
      meanAnomaly = E - e * Math.sin(E);
      meanMotion = Math.sqrt(gm / Math.pow(a, 3));
    }
    return {
      epoch,
      semi_major_axis: a,
      eccentricity: e,
      inclination: el.inclination / DEG,
      longitude_of_ascending_node: el.raan / DEG,
      true_anomaly: RoundAngle(nu / DEG),
      mean_anomaly: RoundAngle(meanAnomaly / DEG),
      mean_motion: meanMotion / DEG,
      time_of_periapsis: epoch - meanAnomaly / meanMotion,
      argument_of_periapsis: el.argumentOfPerigee / DEG,
      periapsis_distance: a * (1 - e)
    };
  }
}

export class CartesianToKeplerian {
  constructor(cartesian) { return new Cartesian(cartesian); }
}

// ---------------------------------------------------------------- sgp4

// "98067A" -> "1998-067A" (COSPAR international designator)
const internationalDesignator = (raw) => {
  const id = String(raw).trim();
  if (id.length < 3) return id;
  const yy = Number(id.slice(0, 2));
  return (yy < 58 ? '20' : '19') + id.slice(0, 2) + '-' + id.slice(2);
};

export class SGP4 {
  constructor(elements) {
    let tle = null;
    let omm = null;
    if (elements.CCSDS_OMM_VERS) {
      omm = elements;
      if (omm.USER_DEFINED_TLE_LINE1 && omm.USER_DEFINED_TLE_LINE2) {
        tle = {
          name: omm.OBJECT_NAME,
          line1: omm.USER_DEFINED_TLE_LINE1,
          line2: omm.USER_DEFINED_TLE_LINE2
        };
      }
    } else {
      tle = { name: elements.name, line1: elements.first_line, line2: elements.second_line };
    }

    if (tle) {
      this._sat = satellite(tle);
      const el = this._sat.elements;
      this.orbital_elements = {
        name: el.name || 'N/A',
        catalog_number: el.catalogNumber,
        security_classification: el.classification,
        international_designator: internationalDesignator(el.internationalDesignator),
        first_derivative_mean_motion: el.meanMotionDot,
        second_derivative_mean_motion: el.meanMotionDdot,
        bstar: el.bstar,
        ephemeris_type: 0,
        element_number: el.elementSetNumber,
        inclination: el.inclination / DEG,
        right_ascension: el.rightAscension / DEG,
        eccentricity: el.eccentricity,
        argument_of_perigee: el.argumentOfPerigee / DEG,
        mean_anomaly: el.meanAnomaly / DEG,
        mean_motion: el.meanMotion * 1440 / TWO_PI, // rev/day
        rev_number_at_epoch: el.revolutionsAtEpoch
      };
    } else {
      // OMM without embedded TLE lines: initialize from the fields
      const iso = String(omm.EPOCH);
      const epoch = Instant.fromUnixMs(Date.parse(iso.endsWith('Z') ? iso : iso + 'Z'));
      const satrec = {};
      sgp4init(satrec, 'i', epoch.jd('utc') - 2433281.5,
        Number(omm.BSTAR), 0.0, 0.0,
        Number(omm.ECCENTRICITY),
        Number(omm.ARG_OF_PERICENTER) * DEG,
        Number(omm.INCLINATION) * DEG,
        Number(omm.MEAN_ANOMALY) * DEG,
        Number(omm.MEAN_MOTION) * TWO_PI / 1440,
        Number(omm.RA_OF_ASC_NODE) * DEG);
      this._sat = {
        satrec,
        elements: { epoch },
        state: (instant) => {
          const result = sgp4(satrec, (instant.utcMs - epoch.utcMs) / 60000);
          if (result == null) {
            throw new Error('SGP4 propagation failed (error ' + satrec.error + '): ' +
              satrec.error_message);
          }
          return makeState({
            t: instant, frame: 'teme', center: 'earth',
            r: [result.x, result.y, result.z],
            v: [result.xdot, result.ydot, result.zdot]
          });
        }
      };
      this.orbital_elements = {
        name: omm.OBJECT_NAME || 'N/A',
        catalog_number: omm.NORAD_CAT_ID,
        security_classification: omm.CLASSIFICATION_TYPE,
        international_designator: omm.OBJECT_ID,
        first_derivative_mean_motion: omm.MEAN_MOTION_DOT,
        second_derivative_mean_motion: omm.MEAN_MOTION_DDOT,
        bstar: omm.BSTAR,
        ephemeris_type: omm.EPHEMERIS_TYPE,
        element_number: omm.ELEMENT_SET_NO,
        inclination: omm.INCLINATION,
        right_ascension: omm.RA_OF_ASC_NODE,
        eccentricity: omm.ECCENTRICITY,
        argument_of_perigee: omm.ARG_OF_PERICENTER,
        mean_anomaly: omm.MEAN_ANOMALY,
        mean_motion: omm.MEAN_MOTION,
        rev_number_at_epoch: omm.REV_AT_EPOCH
      };
    }
    // historic definition: straight from the element-set mean motion
    this.orbital_period = 1440 / this.orbital_elements.mean_motion; // minutes
    this.apogee = this._sat.satrec.alta * wgs72.radiusearthkm;      // km
    this.perigee = this._sat.satrec.altp * wgs72.radiusearthkm;
  }

  _observable = () => ({ body: this._sat, unit: 'km' });

  xyz = (date) => {
    const s = this._sat.state(Instant.fromDate(date));
    return {
      x: s.r[0], y: s.r[1], z: s.r[2],
      xdot: s.v[0], ydot: s.v[1], zdot: s.v[2],
      date,
      coordinate_keywords: 'equatorial rectangular teme',
      unit_keywords: 'km km/s'
    };
  };

  latlng = (date) => {
    const s = this._sat.state(Instant.fromDate(date));
    const ecef = transform(s, { frame: 'ecef' });
    const geo = ecefToGeodetic(ecef.r);
    let lng = geo.longitude / DEG;
    if (lng > 180) lng -= 360;
    return {
      latitude: geo.latitude / DEG,
      longitude: lng,
      altitude: geo.height,
      velocity: Math.hypot(s.v[0], s.v[1], s.v[2]),
      date,
      coordinate_keywords: 'geographic spherical',
      unit_keywords: 'degree km km/s'
    };
  };
}

export class Satellite {
  constructor(elements) { return new SGP4(elements); }
}

// ---------------------------------------------------------------- observation

export class Observer {
  constructor(position) {
    this.latitude = position.latitude;
    this.longitude = position.longitude;
    this.altitude = position.altitude; // km (historic convention)
  }

  // inertial equatorial position (km) at the given compat Time;
  // sidereal_time (hours) defaults to apparent sidereal time
  rectangular = (time, sidereal_time) => {
    const ecef = geodeticToEcef({
      latitude: this.latitude * DEG,
      longitude: this.longitude * DEG,
      height: this.altitude || 0
    });
    const theta = (sidereal_time !== undefined ? sidereal_time : time.gast()) * HOUR;
    const v = rotz(ecef, -theta); // Earth-fixed -> inertial of date
    return { x: v[0], y: v[1], z: v[2] };
  };
}

const BIG_KM = 1e13; // "at infinity": parallax far below any output digit

export class Observation {
  constructor(param) {
    this.observer = param.observer;
    this.target = param.target;
  }

  azel = (date) => {
    const t = Instant.fromDate(date);
    const site = observer({
      latitude: Number(this.observer.latitude),
      longitude: Number(this.observer.longitude),
      height: (Number(this.observer.altitude) || 0) * 1000 // km -> m
    });
    const target = this.target;

    // Resolve the target to a v4 body-like {state} plus distance unit.
    let body = null, unit = '', lightTime = true;
    if (target._observable) {
      // one of the classes above: use its underlying model directly
      ({ body, unit } = target._observable());
    } else if (target.ra !== undefined && target.dec !== undefined) {
      ({ body, unit } = radecTarget(target, t));
      lightTime = false;
    } else if (target.x !== undefined && target.y !== undefined && target.z !== undefined) {
      ({ body, unit } = xyzTarget(target, t));
      lightTime = false;
    } else if (target.radec !== undefined) {
      ({ body, unit } = radecTarget(target.radec(date), t));
      lightTime = false;
    } else if (target.xyz !== undefined) {
      ({ body, unit } = xyzTarget(target.xyz(date), t));
      lightTime = false;
    } else {
      throw new RangeError('Observation: unsupported target');
    }

    const o = site.observe(body, t, { lightTime });
    // historic convention: any known distance comes back in KM (au
    // inputs were converted before the topocentric subtraction)
    let distance, distance_unit;
    if (unit === 'au' || unit === 'km') {
      distance = o.range;
      distance_unit = ' km';
    } else {
      distance = undefined; // direction-only target
      distance_unit = '';
    }
    return {
      azimuth: o.azimuth,
      elevation: o.elevation,
      distance,
      atmospheric_refraction: refraction(o.elevation * DEG) / DEG,
      date,
      coordinate_keywords: 'horizontal spherical',
      unit_keywords: 'degree' + distance_unit
    };
  };
}

// {ra (hours), dec (deg), distance?} -> fixed geocentric state on the
// equator of date; without a usable distance the direction is placed
// effectively at infinity (no parallax, no range).
const radecTarget = (radec, t) => {
  const units = radec.unit_keywords || '';
  let unit = '';
  let distKm = BIG_KM;
  if (radec.distance !== undefined && units.match(/km|au/)) {
    unit = units.match(/au/) ? 'au' : 'km';
    distKm = unit === 'au' ? Number(radec.distance) * AU_KM : Number(radec.distance);
  }
  const ra = Number(radec.ra) * HOUR;
  const dec = Number(radec.dec) * DEG;
  const r = Float64Array.of(
    distKm * Math.cos(dec) * Math.cos(ra),
    distKm * Math.cos(dec) * Math.sin(ra),
    distKm * Math.sin(dec)
  );
  const state = makeState({ t, frame: 'equatorial-of-date', center: 'earth', r });
  return { body: { state: () => state }, unit };
};

// raw rectangular target -> typed state. Historic keyword semantics:
// "ecliptic" vectors are heliocentric (planets, osculating elements),
// "equatorial"/"teme" vectors are geocentric (satellites).
const xyzTarget = (rect, t) => {
  const kw = rect.coordinate_keywords || 'equatorial rectangular';
  const units = rect.unit_keywords || '';
  const unit = units.match(/au/) ? 'au' : (units.match(/km/) ? 'km' : '');
  const scale = unit === 'au' ? AU_KM : 1;
  const r = Float64Array.of(rect.x * scale, rect.y * scale, rect.z * scale);
  let frame, center;
  if (kw.match(/ecliptic/)) {
    frame = kw.match(/j2000/) ? 'ecliptic-j2000' : 'ecliptic-of-date';
    center = 'sun';
  } else {
    frame = kw.match(/teme/) ? 'teme' : 'equatorial-of-date';
    center = 'earth';
  }
  const state = makeState({ t, frame, center, r });
  return { body: { state: () => state }, unit };
};

// ---------------------------------------------------------------- coordinates

// ecliptic J2000 rectangular -> apparent ecliptic of date (same units)
export const EclipticJ2000ToDate = (vec, date) => {
  const t = Instant.fromDate(date);
  const s = transform(
    makeState({ t, frame: 'ecliptic-j2000', center: 'earth', r: [vec.x, vec.y, vec.z] }),
    { frame: 'ecliptic-of-date' });
  return {
    x: s.r[0], y: s.r[1], z: s.r[2],
    date,
    coordinate_keywords: 'ecliptic rectangular',
    unit_keywords: vec.unit_keywords !== undefined ? vec.unit_keywords : ''
  };
};

// {ra (hours), dec, distance} -> equatorial rectangular (same units)
export const RadecToXYZ = (parameter) => {
  const ra = Number(parameter.ra) * HOUR;
  const dec = Number(parameter.dec) * DEG;
  const distance = Number(parameter.distance);
  let unit_keywords = '';
  if (parameter.unit_keywords !== undefined) {
    if (parameter.unit_keywords.match(/km/)) unit_keywords = 'km';
    else if (parameter.unit_keywords.match(/au/)) unit_keywords = 'au';
  }
  return {
    x: distance * Math.cos(dec) * Math.cos(ra),
    y: distance * Math.cos(dec) * Math.sin(ra),
    z: distance * Math.sin(dec),
    date: parameter.date || null,
    coordinate_keywords: 'equatorial rectangular',
    unit_keywords
  };
};

// equatorial (or, via keywords, ecliptic) rectangular -> {ra (hours), dec}
export const XYZtoRadec = (parameter) => {
  let rect = parameter;
  let date = parameter.date || null;
  if (parameter.coordinate_keywords && parameter.coordinate_keywords.match(/ecliptic/)) {
    if (!date) date = new Date();
    rect = EclipticToEquatorial({ date, ecliptic: parameter });
  }
  const d = Math.hypot(rect.x, rect.y, rect.z);
  let distance_unit = '';
  if (rect.unit_keywords !== undefined) {
    if (rect.unit_keywords.match(/km/)) distance_unit = ' km';
    else if (rect.unit_keywords.match(/au/)) distance_unit = ' au';
  }
  return {
    ra: normalizeAngle(Math.atan2(rect.y, rect.x)) / HOUR,
    dec: Math.atan2(rect.z, Math.hypot(rect.x, rect.y)) / DEG,
    distance: d,
    date,
    coordinate_keywords: 'equatorial spherical',
    unit_keywords: 'hours degree' + distance_unit
  };
};

// HELIOCENTRIC ecliptic rectangular -> GEOCENTRIC equatorial rectangular
// of date: subtracts the Earth, then rotates. Keyword "j2000" marks the
// input equinox; units follow unit_keywords (au assumed, km honored).
export const EclipticToEquatorial = (parameter) => {
  const date = parameter.date;
  const ecl = parameter.ecliptic;
  const t = Instant.fromDate(date);
  const isJ2000 = ecl.coordinate_keywords !== undefined &&
    ecl.coordinate_keywords.match(/j2000/);
  const frame = isJ2000 ? 'ecliptic-j2000' : 'ecliptic-of-date';
  const isKm = ecl.unit_keywords !== undefined && ecl.unit_keywords.match(/km/);
  const scale = isKm ? 1 : AU_KM;
  const e = transform(earth.state(t), { frame });
  const gc = Float64Array.of(
    ecl.x * scale - e.r[0],
    ecl.y * scale - e.r[1],
    ecl.z * scale - e.r[2]
  );
  const out = transform(
    makeState({ t, frame, center: 'earth', r: gc }),
    { frame: 'equatorial-of-date' });
  return {
    x: out.r[0] / scale, y: out.r[1] / scale, z: out.r[2] / scale,
    date,
    coordinate_keywords: 'equatorial rectangular',
    unit_keywords: ecl.unit_keywords !== undefined ? ecl.unit_keywords : ''
  };
};

// GEOCENTRIC equatorial rectangular of date -> ecliptic of date
// (rotation only — the inverse of the obliquity tilt, no Earth term)
export const EquatorialToEcliptic = (parameter) => {
  const date = parameter.date;
  const eq = parameter.equatorial;
  const t = Instant.fromDate(date);
  const s = transform(
    makeState({ t, frame: 'equatorial-of-date', center: 'earth', r: [eq.x, eq.y, eq.z] }),
    { frame: 'ecliptic-of-date' });
  return {
    x: s.r[0], y: s.r[1], z: s.r[2],
    date,
    coordinate_keywords: 'ecliptic rectangular',
    unit_keywords: eq.unit_keywords !== undefined ? eq.unit_keywords : ''
  };
};
