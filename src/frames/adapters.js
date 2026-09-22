import { makeState } from './state.js';

const AU_KM = 149597870.7;
const SECONDS_PER_DAY = 86400;

function requireLegacyBody(body) {
  if (!body || typeof body.xyz !== 'function') {
    throw new TypeError('adaptLegacyBody: body must provide xyz(date)');
  }
  return body;
}

function requireOption(value, allowed, label) {
  if (!allowed.includes(value)) {
    throw new RangeError(`adaptLegacyBody: unsupported ${label} '${value}'`);
  }
  return value;
}

function finiteComponents(result, names, label) {
  const values = names.map((name) => Number(result[name]));
  if (!values.every(Number.isFinite)) {
    throw new TypeError(`adaptLegacyBody: ${label} must contain finite ${names.join(', ')}`);
  }
  return values;
}

export function adaptLegacyBody(body, {
  name = body?.constructor?.name?.toLowerCase() ?? 'body',
  frame,
  center,
  positionUnit,
  velocityUnit = null
} = {}) {
  requireLegacyBody(body);
  if (typeof frame !== 'string' || typeof center !== 'string') {
    throw new TypeError('adaptLegacyBody: frame and center are required');
  }
  requireOption(positionUnit, ['km', 'au'], 'position unit');
  if (velocityUnit !== null) requireOption(velocityUnit, ['km/s', 'au/day'], 'velocity unit');
  const positionScale = positionUnit === 'au' ? AU_KM : 1;
  const velocityScale = velocityUnit === 'au/day' ? AU_KM / SECONDS_PER_DAY : 1;
  return Object.freeze({
    name,
    state(instant) {
      if (!instant || typeof instant.toDate !== 'function') {
        throw new TypeError('adaptLegacyBody.state: expected an Instant');
      }
      const result = body.xyz(instant.toDate());
      const position = finiteComponents(result, ['x', 'y', 'z'], 'xyz result');
      let velocity = null;
      if (velocityUnit !== null) {
        velocity = finiteComponents(result, ['xdot', 'ydot', 'zdot'], 'xyz velocity')
          .map((component) => component * velocityScale);
      }
      return makeState({
        t: instant,
        frame,
        center,
        r: position.map((component) => component * positionScale),
        v: velocity
      });
    }
  });
}

export const adaptLegacyPlanet = (body, options = {}) => adaptLegacyBody(body, {
  name: options.name,
  frame: 'ecliptic-j2000',
  center: 'sun',
  positionUnit: 'au'
});

export const adaptLegacyMoon = (body, options = {}) => adaptLegacyBody(body, {
  name: options.name ?? 'moon',
  frame: 'ecliptic-of-date',
  center: 'earth',
  positionUnit: 'km'
});

export const adaptLegacySun = (body, options = {}) => adaptLegacyBody(body, {
  name: options.name ?? 'sun',
  frame: 'equatorial-of-date',
  center: 'earth',
  positionUnit: 'au'
});

export const adaptLegacyKepler = (body, options = {}) => adaptLegacyBody(body, {
  name: options.name,
  frame: options.frame ?? 'ecliptic-j2000',
  center: options.center ?? 'sun',
  positionUnit: 'au',
  velocityUnit: 'au/day'
});

export const adaptLegacySatellite = (body, options = {}) => adaptLegacyBody(body, {
  name: options.name,
  frame: 'teme',
  center: 'earth',
  positionUnit: 'km',
  velocityUnit: 'km/s'
});
