import {
  makeState,
  normalizeAngle,
  transform
} from '../frames/index.js';
import {
  ecefVectorToEnu,
  enuToHorizontal,
  geodeticToEcef
} from '../geodesy/index.js';
import { earthEpv00 } from '../models/earth-epv00/index.js';
import { requireToken } from '../vocab/index.js';
import {
  apparentGeocentric,
  C_KM_PER_SECOND,
  geocentricState
} from './apparent.js';
import {
  atmosphericRefraction,
  refraction,
  validateRefractionConditions
} from './refraction.js';

export {
  apparentGeocentric,
  atmosphericRefraction,
  C_KM_PER_SECOND,
  geocentricState,
  refraction
};

export const OBSERVER_DEFAULTS = Object.freeze({
  frameModel: 'iau2006-2000b',
  lightTime: false,
  aberration: false,
  refraction: false,
  meta: false
});

const OPTION_KEYS = new Set(Object.keys(OBSERVER_DEFAULTS));
const PIPELINE_SOURCES = Object.freeze([
  'iau2006-precession',
  'iau2000b-nutation',
  'iau1982-gmst',
  'wgs84'
]);

const FIELD_META = Object.freeze({
  azimuth: Object.freeze({
    quantity: 'azimuth', unit: 'radian', frame: 'horizontal', center: 'observer'
  }),
  elevation: Object.freeze({
    quantity: 'elevation', unit: 'radian', frame: 'horizontal', center: 'observer'
  }),
  rightAscension: Object.freeze({
    quantity: 'right-ascension', unit: 'radian', frame: 'equatorial-of-date', center: 'observer'
  }),
  declination: Object.freeze({
    quantity: 'declination', unit: 'radian', frame: 'equatorial-of-date', center: 'observer'
  }),
  range: Object.freeze({ quantity: 'range', unit: 'kilometer', center: 'observer' }),
  geocentricDistance: Object.freeze({ quantity: 'distance', unit: 'kilometer', center: 'earth' }),
  refraction: Object.freeze({ quantity: 'refraction', unit: 'radian' })
});

for (const source of PIPELINE_SOURCES) requireToken('source', source);
for (const field of Object.values(FIELD_META)) {
  requireToken('quantity', field.quantity);
  requireToken('unit', field.unit);
  if (field.frame) requireToken('frame', field.frame);
  if (field.center) requireToken('center', field.center);
}

function requireBoolean(value, label) {
  if (typeof value !== 'boolean') throw new TypeError(`observer: ${label} must be boolean`);
  return value;
}

function parseOptions(options) {
  if (options === undefined) return OBSERVER_DEFAULTS;
  if (!options || typeof options !== 'object' || Array.isArray(options)) {
    throw new TypeError('observer: options must be an object');
  }
  for (const key of Object.keys(options)) {
    if (!OPTION_KEYS.has(key)) throw new RangeError(`observer: unknown option '${key}'`);
  }
  const frameModel = options.frameModel ?? OBSERVER_DEFAULTS.frameModel;
  if (frameModel !== 'iau2006-2000b') {
    throw new RangeError(`observer: unsupported frameModel '${frameModel}'`);
  }
  const lightTime = requireBoolean(
    options.lightTime ?? OBSERVER_DEFAULTS.lightTime,
    'lightTime'
  );
  const aberration = requireBoolean(
    options.aberration ?? OBSERVER_DEFAULTS.aberration,
    'aberration'
  );
  const meta = requireBoolean(options.meta ?? OBSERVER_DEFAULTS.meta, 'meta');
  let refractionConditions = false;
  if (options.refraction !== undefined && options.refraction !== false) {
    refractionConditions = validateRefractionConditions(options.refraction);
  }
  return Object.freeze({ frameModel, lightTime, aberration, refraction: refractionConditions, meta });
}

function buildMeta(instant, options, geocentric, body, refracted) {
  const apparentCorrections = [...geocentric.corrections];
  const topocentricCorrections = [...apparentCorrections, 'parallax-diurnal'];
  const quantities = {};
  for (const [fieldName, field] of Object.entries(FIELD_META)) {
    const description = { ...field };
    if (fieldName === 'geocentricDistance') {
      description.corrections = [...apparentCorrections];
    } else if (fieldName !== 'refraction') {
      description.corrections = [...topocentricCorrections];
      if (fieldName === 'elevation' && refracted) description.corrections.push('refraction');
    }
    quantities[fieldName] = Object.freeze(description);
  }

  const sources = new Set([...PIPELINE_SOURCES, ...geocentric.sources]);
  if (refracted) sources.add('saemundsson-refraction');
  for (const source of sources) requireToken('source', source);

  const ignoredEffects = ['aberration-diurnal', 'deflection', 'polar-motion'];
  if (!options.lightTime) ignoredEffects.push('light-time');
  if (!options.aberration) ignoredEffects.push('aberration-annual');
  if (!refracted) ignoredEffects.push('refraction');
  for (const effect of ignoredEffects) requireToken('effect', effect);

  const meta = {
    t: Object.freeze({ utc: instant.toISOString(), jdTt: instant.jd('tt') }),
    model: Object.freeze({ frame: options.frameModel }),
    quantities: Object.freeze(quantities),
    source: Object.freeze([...sources]),
    ignoredEffects: Object.freeze(ignoredEffects)
  };
  const accuracy = body.provenance?.accuracy;
  if (accuracy) {
    if (!accuracy || typeof accuracy !== 'object') {
      throw new TypeError('observer: provenance accuracy must be an object');
    }
    requireToken('unit', accuracy.unit);
    if (accuracy.basis !== undefined) requireToken('source', accuracy.basis);
    meta.accuracy = accuracy;
  }
  return Object.freeze(meta);
}

function requireInstant(instant) {
  if (!instant || typeof instant.jd !== 'function' || typeof instant.toISOString !== 'function') {
    throw new TypeError('observer: expected an AstroInstant');
  }
  return instant;
}

export function createObserver(location, configuration = {}) {
  if (!location || typeof location !== 'object') {
    throw new TypeError('observer: location must contain latitude, longitude, and optional height');
  }
  if (!configuration || typeof configuration !== 'object' || Array.isArray(configuration)) {
    throw new TypeError('observer: configuration must be an object');
  }
  for (const key of Object.keys(configuration)) {
    if (key !== 'earth') throw new RangeError(`observer: unknown configuration option '${key}'`);
  }
  const earth = configuration.earth ?? earthEpv00;
  const geodetic = Object.freeze({
    latitude: location.latitude,
    longitude: location.longitude,
    height: location.height ?? 0
  });
  const siteEcef = geodeticToEcef(geodetic);
  if (!earth || typeof earth.state !== 'function') {
    throw new TypeError('observer: Earth model must provide state(instant)');
  }

  const site = {
    latitude: geodetic.latitude,
    longitude: geodetic.longitude,
    height: geodetic.height,
    ecef: Float64Array.from(siteEcef),
    observe(body, instant, rawOptions) {
      requireInstant(instant);
      const options = parseOptions(rawOptions);
      const geocentric = geocentricState(body, instant, {
        frameModel: options.frameModel,
        lightTime: options.lightTime,
        aberration: options.aberration,
        earth
      });
      const geocentricDistance = Math.hypot(...geocentric.r);
      const ecef = transform(geocentric, { frame: 'ecef' });
      const relativeEcef = Float64Array.of(
        ecef.r[0] - siteEcef[0],
        ecef.r[1] - siteEcef[1],
        ecef.r[2] - siteEcef[2]
      );
      const horizontal = enuToHorizontal(ecefVectorToEnu(relativeEcef, geodetic));
      const topocentric = transform(makeState({
        t: instant,
        frame: 'ecef',
        center: 'observer',
        r: relativeEcef
      }), { frame: 'equatorial-of-date' });
      const range = horizontal.range;
      const rightAscension = normalizeAngle(Math.atan2(topocentric.r[1], topocentric.r[0]));
      const declination = Math.asin(Math.max(-1, Math.min(1, topocentric.r[2] / range)));
      let elevation = horizontal.elevation;
      let refractionAngle = 0;
      if (options.refraction) {
        refractionAngle = atmosphericRefraction(elevation, options.refraction);
        elevation += refractionAngle;
      }

      const result = {
        azimuth: horizontal.azimuth,
        elevation,
        rightAscension,
        declination,
        range,
        geocentricDistance,
        refraction: refractionAngle
      };
      if (options.meta) {
        result.meta = buildMeta(
          instant,
          options,
          geocentric,
          body,
          Boolean(options.refraction)
        );
      }
      return Object.freeze(result);
    }
  };
  return Object.freeze(site);
}

export const observer = createObserver;
