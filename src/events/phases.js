import { normalizeAngle, normalizeSignedAngle, transform } from '../frames/index.js';
import { geocentricState } from '../observer/index.js';
import { findCrossings } from './search.js';

const PHASES = Object.freeze([
  Object.freeze({ phase: 'new', target: 0 }),
  Object.freeze({ phase: 'first-quarter', target: Math.PI / 2 }),
  Object.freeze({ phase: 'full', target: Math.PI }),
  Object.freeze({ phase: 'last-quarter', target: 3 * Math.PI / 2 })
]);

const OPTION_KEYS = new Set([
  'frameModel',
  'lightTime',
  'aberration',
  'earth',
  'stepSeconds',
  'toleranceSeconds',
  'maxIterations',
  'maxEvaluations'
]);

function parseOptions(options) {
  if (!options || typeof options !== 'object' || Array.isArray(options)) {
    throw new TypeError('events: lunar phase options must be an object');
  }
  for (const key of Object.keys(options)) {
    if (!OPTION_KEYS.has(key)) throw new RangeError(`events: unknown lunar phase option '${key}'`);
  }
  return {
    geocentric: {
      frameModel: options.frameModel ?? 'iau2006-2000b',
      lightTime: options.lightTime ?? false,
      aberration: options.aberration ?? false,
      ...(options.earth === undefined ? {} : { earth: options.earth })
    },
    search: {
      stepSeconds: options.stepSeconds ?? 6 * 3600,
      toleranceSeconds: options.toleranceSeconds ?? 0.5,
      maxIterations: options.maxIterations ?? 64,
      maxEvaluations: options.maxEvaluations ?? 100000
    }
  };
}

function longitude(state) {
  const ecliptic = transform(state, { frame: 'ecliptic-of-date' });
  return Math.atan2(ecliptic.r[1], ecliptic.r[0]);
}

function requireBodies(moon, sun) {
  if (!moon || typeof moon.state !== 'function') {
    throw new TypeError('events: moon must provide state(instant)');
  }
  if (!sun || typeof sun.state !== 'function') {
    throw new TypeError('events: sun must provide state(instant)');
  }
}

function elongationWithOptions(moon, sun, instant, geocentric) {
  const moonState = geocentricState(moon, instant, geocentric);
  const sunState = geocentricState(sun, instant, geocentric);
  return normalizeAngle(longitude(moonState) - longitude(sunState));
}

export function lunarElongation(moon, sun, instant, options = {}) {
  requireBodies(moon, sun);
  const parsed = parseOptions(options);
  return elongationWithOptions(moon, sun, instant, parsed.geocentric);
}

export function principalPhases(moon, sun, from, to, options = {}) {
  requireBodies(moon, sun);
  const parsed = parseOptions(options);
  const elongation = (instant) => elongationWithOptions(moon, sun, instant, parsed.geocentric);
  const events = [];
  for (const definition of PHASES) {
    const distance = (instant) => normalizeSignedAngle(elongation(instant) - definition.target);
    for (const crossing of findCrossings(distance, from, to, parsed.search)) {
      if (crossing.direction < 0) continue;
      const actual = elongation(crossing.instant);
      events.push(Object.freeze({
        phase: definition.phase,
        instant: crossing.instant,
        elongation: actual,
        targetElongation: definition.target,
        residual: normalizeSignedAngle(actual - definition.target),
        definition: 'geocentric-ecliptic-longitude',
        corrections: Object.freeze([
          ...(parsed.geocentric.lightTime ? ['light-time'] : []),
          ...(parsed.geocentric.aberration ? ['aberration-annual'] : [])
        ])
      }));
    }
  }
  events.sort((left, right) => left.instant.utcMs - right.instant.utcMs);
  return Object.freeze(events);
}

export function lunarAge(moon, sun, instant, options = {}) {
  requireBodies(moon, sun);
  if (!instant || typeof instant.addDays !== 'function') {
    throw new TypeError('events: instant must be an Instant');
  }
  const events = principalPhases(moon, sun, instant.addDays(-35), instant, options);
  const previous = events.filter((event) => event.phase === 'new').at(-1);
  if (!previous) throw new RangeError('events: no preceding new moon found in the bounded search');
  return instant.differenceSeconds(previous.instant) / 86400;
}

export const elongation = lunarElongation;
export const moonPhases = principalPhases;
export const moonAge = lunarAge;
