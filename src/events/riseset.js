import { findCrossings, findLocalMaxima } from './search.js';

const ARC_MINUTE = Math.PI / (180 * 60);

export const HORIZON_CONSTANTS = Object.freeze({
  geometricCenter: 0,
  meanSolarSemidiameter: 16 * ARC_MINUTE,
  meanLunarSemidiameter: 15.5 * ARC_MINUTE,
  standardHorizonRefraction: 34 * ARC_MINUTE,
  standardSunCenter: -50 * ARC_MINUTE,
  standardMoonCenter: -49.5 * ARC_MINUTE,
  standardPointSourceCenter: -34 * ARC_MINUTE
});

const OPTION_KEYS = new Set([
  'horizon',
  'semidiameter',
  'observation',
  'stepSeconds',
  'toleranceSeconds',
  'maxIterations',
  'maxEvaluations'
]);

function requireOptions(options) {
  if (!options || typeof options !== 'object' || Array.isArray(options)) {
    throw new TypeError('events: rise/set options must be an object');
  }
  for (const key of Object.keys(options)) {
    if (!OPTION_KEYS.has(key)) throw new RangeError(`events: unknown rise/set option '${key}'`);
  }
  const horizon = options.horizon ?? HORIZON_CONSTANTS.geometricCenter;
  const semidiameter = options.semidiameter ?? 0;
  if (!Number.isFinite(horizon)) throw new TypeError('events: horizon must be finite radians');
  if (!Number.isFinite(semidiameter) || semidiameter < 0 || semidiameter > Math.PI / 2) {
    throw new RangeError('events: semidiameter must be finite radians between 0 and pi/2');
  }
  const observation = options.observation ?? {};
  if (!observation || typeof observation !== 'object' || Array.isArray(observation)) {
    throw new TypeError('events: observation must be an observer options object');
  }
  if ((options.stepSeconds ?? 600) > 21600) {
    throw new RangeError('events: rise/set stepSeconds must not exceed 21600');
  }
  return { horizon, semidiameter, observation };
}

function searchOptions(options, defaults = {}) {
  return {
    stepSeconds: options.stepSeconds ?? defaults.stepSeconds ?? 600,
    toleranceSeconds: options.toleranceSeconds ?? defaults.toleranceSeconds ?? 0.1,
    maxIterations: options.maxIterations ?? defaults.maxIterations ?? 64,
    maxEvaluations: options.maxEvaluations ?? defaults.maxEvaluations ?? 100000
  };
}

function requireInputs(site, body) {
  if (!site || typeof site.observe !== 'function') {
    throw new TypeError('events: site must provide observe(body, instant, options)');
  }
  if (!body || typeof body.state !== 'function') {
    throw new TypeError('events: body must provide state(instant)');
  }
}

export function riseSetTransit(site, body, from, to, options = {}) {
  requireInputs(site, body);
  const { horizon, semidiameter, observation } = requireOptions(options);
  const threshold = horizon - semidiameter;
  const search = searchOptions(options);
  const elevation = (instant) => site.observe(body, instant, observation).elevation;
  const events = [];

  for (const crossing of findCrossings(
    (instant) => elevation(instant) - threshold,
    from,
    to,
    search
  )) {
    const observed = site.observe(body, crossing.instant, observation);
    events.push(Object.freeze({
      type: crossing.direction > 0 ? 'rise' : 'set',
      instant: crossing.instant,
      azimuth: observed.azimuth,
      elevation: observed.elevation,
      threshold,
      residual: observed.elevation - threshold,
      elevationType: observation.refraction ? 'refracted' : 'geometric',
      limb: semidiameter === 0 ? 'center' : 'upper'
    }));
  }

  for (const peak of findLocalMaxima(elevation, from, to, search)) {
    const observed = site.observe(body, peak.instant, observation);
    events.push(Object.freeze({
      type: 'transit',
      instant: peak.instant,
      azimuth: observed.azimuth,
      elevation: observed.elevation,
      threshold,
      residual: null,
      elevationType: observation.refraction ? 'refracted' : 'geometric',
      limb: 'center'
    }));
  }

  events.sort((left, right) => left.instant.utcMs - right.instant.utcMs);
  return Object.freeze(events);
}

export const riseSet = riseSetTransit;
