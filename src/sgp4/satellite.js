import { makeState, transform } from '../frames/index.js';
import { ecefToGeodetic } from '../geodesy/index.js';
import { sgp4, sgp4init, wgs72 } from '../orb-sgp4-propagation.js';
import {
  normalizeOmm,
  parseOmm,
  parseTle,
  tleToOmm,
  validateTleChecksum
} from './tle.js';

const MINUTES_PER_DAY = 1440;
const SGP4_EPOCH_JD = 2433281.5;

function requireInstant(instant) {
  if (!instant || typeof instant.jd !== 'function'
      || typeof instant.differenceSeconds !== 'function') {
    throw new TypeError('sgp4: expected an AstroInstant');
  }
  return instant;
}

function requireInput(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new TypeError('sgp4: satellite input must be a TLE or OMM object');
  }
  return input;
}

function initialize(elements) {
  const satrec = {};
  sgp4init(
    satrec,
    'i',
    elements.epoch.jd('utc') - SGP4_EPOCH_JD,
    elements.bstar,
    elements.meanMotionDot,
    elements.meanMotionDdot,
    elements.eccentricity,
    elements.argumentOfPerigee,
    elements.inclination,
    elements.meanAnomaly,
    elements.meanMotion,
    elements.rightAscension
  );
  satrec.orbital_period = MINUTES_PER_DAY / elements.meanMotionRevPerDay;
  satrec.apogee = satrec.alta * wgs72.radiusearthkm;
  satrec.perigee = satrec.altp * wgs72.radiusearthkm;
  return satrec;
}

function propagate(satrec, elements, instant) {
  requireInstant(instant);
  const minutesSinceEpoch = instant.differenceSeconds(elements.epoch) / 60;
  const result = sgp4(satrec, minutesSinceEpoch);
  if (result === null || satrec.error !== 0) {
    throw new Error(
      `SGP4 propagation failed (error ${satrec.error}): ${satrec.error_message}`
    );
  }
  return result;
}

export function createSatellite(rawInput, options = {}) {
  const input = requireInput(rawInput);
  if (!options || typeof options !== 'object' || Array.isArray(options)) {
    throw new TypeError('sgp4: satellite options must be an object');
  }
  for (const key of Object.keys(options)) {
    if (key !== 'validateChecksum') throw new RangeError(`sgp4: unknown satellite option '${key}'`);
  }
  const validateChecksum = options.validateChecksum ?? false;
  if (typeof validateChecksum !== 'boolean') {
    throw new TypeError('sgp4: validateChecksum must be boolean');
  }
  const isOmm = input.CCSDS_OMM_VERS !== undefined;
  if (isOmm && validateChecksum) {
    if (typeof input.USER_DEFINED_TLE_LINE1 !== 'string'
        || typeof input.USER_DEFINED_TLE_LINE2 !== 'string') {
      throw new RangeError('sgp4: OMM has no stored TLE lines to checksum');
    }
    validateTleChecksum({
      line1: input.USER_DEFINED_TLE_LINE1,
      line2: input.USER_DEFINED_TLE_LINE2
    });
  }
  const elements = isOmm
    ? parseOmm(input)
    : parseTle(input, { validateChecksum });
  const omm = isOmm ? normalizeOmm(input) : tleToOmm(input, { validateChecksum });
  const tle = isOmm
    ? Object.freeze({
      name: input.OBJECT_NAME ?? null,
      line1: input.USER_DEFINED_TLE_LINE1 ?? null,
      line2: input.USER_DEFINED_TLE_LINE2 ?? null
    })
    : Object.freeze({
      name: input.name ?? null,
      line1: input.line1 ?? input.first_line,
      line2: input.line2 ?? input.second_line
    });
  const satrec = initialize(elements);
  const provenance = Object.freeze({
    source: Object.freeze(['sgp4']),
    model: 'SGP4 with WGS-72 gravity constants',
    input: 'SGP4 mean elements'
  });

  const state = (instant) => {
    const result = propagate(satrec, elements, instant);
    return makeState({
      t: instant,
      frame: 'teme',
      center: 'earth',
      r: [result.x, result.y, result.z],
      v: [result.xdot, result.ydot, result.zdot]
    });
  };
  const geodetic = (instant) => {
    const teme = state(instant);
    const ecef = transform(teme, { frame: 'ecef' });
    const location = ecefToGeodetic(ecef.r);
    return Object.freeze({
      t: instant,
      frame: 'geodetic-wgs84',
      center: 'earth',
      latitude: location.latitude,
      longitude: location.longitude,
      height: location.height,
      velocity: Math.hypot(...teme.v)
    });
  };
  const body = {
    name: elements.name ?? `satellite ${elements.catalogNumber}`,
    elements,
    tle,
    omm,
    satrec,
    orbitalPeriod: satrec.orbital_period,
    apogee: satrec.apogee,
    perigee: satrec.perigee,
    provenance,
    state,
    geodetic
  };
  return Object.freeze(body);
}

export const satellite = createSatellite;
