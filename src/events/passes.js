import { findCrossings, findMaximum } from './search.js';

const OPTION_KEYS = new Set([
  'minimumElevation',
  'observation',
  'stepSeconds',
  'toleranceSeconds',
  'maxIterations',
  'maxEvaluations'
]);

function parseOptions(options) {
  if (!options || typeof options !== 'object' || Array.isArray(options)) {
    throw new TypeError('events: pass options must be an object');
  }
  for (const key of Object.keys(options)) {
    if (!OPTION_KEYS.has(key)) throw new RangeError(`events: unknown pass option '${key}'`);
  }
  const minimumElevation = options.minimumElevation ?? 0;
  if (!Number.isFinite(minimumElevation)
      || minimumElevation < -Math.PI / 2
      || minimumElevation > Math.PI / 2) {
    throw new RangeError('events: minimumElevation must be finite radians between -pi/2 and pi/2');
  }
  const observation = options.observation ?? {};
  if (!observation || typeof observation !== 'object' || Array.isArray(observation)) {
    throw new TypeError('events: observation must be an observer options object');
  }
  if ((options.stepSeconds ?? 30) > 300) {
    throw new RangeError('events: satellite pass stepSeconds must not exceed 300');
  }
  return {
    minimumElevation,
    observation,
    search: {
      stepSeconds: options.stepSeconds ?? 30,
      toleranceSeconds: options.toleranceSeconds ?? 0.01,
      maxIterations: options.maxIterations ?? 64,
      maxEvaluations: options.maxEvaluations ?? 100000
    }
  };
}

function requireInputs(site, satellite) {
  if (!site || typeof site.observe !== 'function') {
    throw new TypeError('events: site must provide observe(body, instant, options)');
  }
  if (!satellite || typeof satellite.state !== 'function') {
    throw new TypeError('events: satellite must provide state(instant)');
  }
}

function observedPoint(site, satellite, instant, observation) {
  const observed = site.observe(satellite, instant, observation);
  return Object.freeze({
    instant,
    azimuth: observed.azimuth,
    elevation: observed.elevation,
    range: observed.range
  });
}

export function satellitePasses(site, satellite, from, to, options = {}) {
  requireInputs(site, satellite);
  const parsed = parseOptions(options);
  const elevation = (instant) => site.observe(satellite, instant, parsed.observation).elevation;
  const threshold = (instant) => elevation(instant) - parsed.minimumElevation;
  const crossings = findCrossings(threshold, from, to, parsed.search);
  const segments = [];
  let start = threshold(from) >= 0 ? { instant: from, clipped: true } : null;

  for (const crossing of crossings) {
    if (crossing.direction > 0) {
      start = { instant: crossing.instant, clipped: false };
    } else if (start) {
      segments.push({ start, end: { instant: crossing.instant, clipped: false } });
      start = null;
    }
  }
  if (start && threshold(to) >= 0) {
    segments.push({ start, end: { instant: to, clipped: true } });
  }

  const passes = segments.map((segment) => {
    const peakSearch = {
      ...parsed.search,
      stepSeconds: Math.min(parsed.search.stepSeconds, 15)
    };
    const peak = findMaximum(elevation, segment.start.instant, segment.end.instant, peakSearch);
    const rise = observedPoint(site, satellite, segment.start.instant, parsed.observation);
    const culmination = observedPoint(site, satellite, peak.instant, parsed.observation);
    const set = observedPoint(site, satellite, segment.end.instant, parsed.observation);
    return Object.freeze({
      rise,
      culmination,
      set,
      minimumElevation: parsed.minimumElevation,
      riseResidual: segment.start.clipped ? null : rise.elevation - parsed.minimumElevation,
      setResidual: segment.end.clipped ? null : set.elevation - parsed.minimumElevation,
      elevationType: parsed.observation.refraction ? 'refracted' : 'geometric',
      clipped: Object.freeze({ rise: segment.start.clipped, set: segment.end.clipped }),
      opticalVisibility: 'not-computed',
      sunlight: 'not-computed'
    });
  });
  return Object.freeze(passes);
}

export const passes = satellitePasses;
