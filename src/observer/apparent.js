import { makeState, norm, scale, transform } from '../frames/index.js';
import { earthEpv00 } from '../models/earth-epv00/index.js';

export const C_KM_PER_SECOND = 299792.458;
const LIGHT_TIME_TOLERANCE_SECONDS = 1e-9;
const MAX_LIGHT_TIME_ITERATIONS = 8;

function requireInstant(instant) {
  if (!instant || typeof instant.jd !== 'function' || typeof instant.addSeconds !== 'function') {
    throw new TypeError('observer: expected an AstroInstant');
  }
  return instant;
}

function requireBody(body, label = 'body') {
  if (!body || typeof body.state !== 'function') {
    throw new TypeError(`observer: ${label} must provide state(instant)`);
  }
  return body;
}

function provenanceSources(body, label) {
  const sources = body.provenance?.source;
  if (sources === undefined) return [];
  if (!Array.isArray(sources) || !sources.every((source) => typeof source === 'string')) {
    throw new TypeError(`observer: ${label} provenance.source must be an array of strings`);
  }
  return sources;
}

function stateAt(body, instant) {
  return makeState(body.state(instant));
}

function inJ2000(state) {
  return state.frame === 'equatorial-j2000'
    ? state
    : transform(state, { frame: 'equatorial-j2000' });
}

function earthStateAt(earth, instant, requireVelocity) {
  const state = inJ2000(stateAt(earth, instant));
  if (state.center !== 'sun') {
    throw new RangeError("observer: Earth model state.center must be 'sun'");
  }
  if (requireVelocity && !state.v) {
    throw new TypeError('observer: Earth model must provide velocity for annual aberration');
  }
  return state;
}

function subtract(a, b) {
  return Float64Array.of(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
}

function relativePosition(target, earth) {
  if (target.center === 'earth') return Float64Array.from(target.r);
  if (target.center === 'sun') {
    if (!earth) throw new TypeError('observer: an Earth state is required for a heliocentric body');
    return subtract(target.r, earth.r);
  }
  throw new RangeError(`observer: unsupported body center '${target.center}'`);
}

// Reduce a retarded state to one heliocentric geometry. For an Earth-centered
// theory, add Earth at emission before subtracting Earth at reception. This
// keeps light time and annual aberration independent instead of counting the
// Earth's orbital displacement twice.
function retardedRelativePosition(target, earth, earthReception, emissionInstant) {
  if (target.center === 'sun') return relativePosition(target, earthReception);
  if (target.center === 'earth') {
    const earthEmission = earthStateAt(earth, emissionInstant, false);
    return Float64Array.of(
      target.r[0] + earthEmission.r[0] - earthReception.r[0],
      target.r[1] + earthEmission.r[1] - earthReception.r[1],
      target.r[2] + earthEmission.r[2] - earthReception.r[2]
    );
  }
  return relativePosition(target, earthReception);
}

function antedatedPosition(body, instant, earth, earthReception, initial, initialPosition) {
  let position = initialPosition;
  let target = initial;
  let previousDelay = -1;
  for (let iteration = 0; iteration < MAX_LIGHT_TIME_ITERATIONS; iteration++) {
    const delay = norm(position) / C_KM_PER_SECOND;
    if (Math.abs(delay - previousDelay) <= LIGHT_TIME_TOLERANCE_SECONDS) {
      return { position, target };
    }
    previousDelay = delay;
    const emissionInstant = instant.addSeconds(-delay);
    target = inJ2000(stateAt(body, emissionInstant));
    if (target.center !== initial.center) {
      throw new RangeError('observer: body center changed during light-time iteration');
    }
    position = retardedRelativePosition(target, earth, earthReception, emissionInstant);
  }
  throw new RangeError('observer: light-time iteration did not converge');
}

function applyAnnualAberration(position, earthVelocity) {
  const distance = norm(position);
  if (distance === 0) throw new RangeError('observer: target is at the observer center');
  const tilted = Float64Array.of(
    position[0] + distance * earthVelocity[0] / C_KM_PER_SECOND,
    position[1] + distance * earthVelocity[1] / C_KM_PER_SECOND,
    position[2] + distance * earthVelocity[2] / C_KM_PER_SECOND
  );
  return scale(tilted, distance / norm(tilted));
}

function parseOptions(options) {
  if (options === undefined) return {
    lightTime: false,
    aberration: false,
    earth: earthEpv00,
    frameModel: 'iau2006-2000b'
  };
  if (!options || typeof options !== 'object' || Array.isArray(options)) {
    throw new TypeError('observer: geocentric options must be an object');
  }
  const known = new Set(['lightTime', 'aberration', 'earth', 'frameModel']);
  for (const key of Object.keys(options)) {
    if (!known.has(key)) throw new RangeError(`observer: unknown geocentric option '${key}'`);
  }
  return {
    lightTime: options.lightTime ?? false,
    aberration: options.aberration ?? false,
    earth: options.earth ?? earthEpv00,
    frameModel: options.frameModel ?? 'iau2006-2000b'
  };
}

export function geocentricState(body, instant, rawOptions) {
  const { lightTime, aberration, earth, frameModel } = parseOptions(rawOptions);
  requireBody(body);
  requireBody(earth, 'Earth model');
  requireInstant(instant);
  if (frameModel !== 'iau2006-2000b') {
    throw new RangeError(`observer: unsupported frameModel '${frameModel}'`);
  }
  if (typeof lightTime !== 'boolean') {
    throw new TypeError('observer: lightTime must be boolean');
  }
  if (typeof aberration !== 'boolean') {
    throw new TypeError('observer: aberration must be boolean');
  }

  let target = inJ2000(stateAt(body, instant));
  const earthState = target.center === 'sun' || lightTime || aberration
    ? earthStateAt(earth, instant, aberration)
    : null;
  let position = relativePosition(target, earthState);
  if (lightTime) {
    ({ position, target } = antedatedPosition(
      body,
      instant,
      earth,
      earthState,
      target,
      position
    ));
  }
  if (norm(position) === 0) throw new RangeError('observer: target is at the Earth center');
  if (aberration) position = applyAnnualAberration(position, earthState.v);

  const state = makeState({
    t: instant,
    frame: 'equatorial-j2000',
    center: 'earth',
    r: position
  });
  const result = transform(state, { frame: 'equatorial-of-date' });
  result.corrections = Object.freeze([
    ...(lightTime ? ['light-time'] : []),
    ...(aberration ? ['aberration-annual'] : [])
  ]);
  result.sources = Object.freeze([
    ...provenanceSources(body, 'body'),
    ...(earthState ? provenanceSources(earth, 'Earth model') : [])
  ]);
  return result;
}

export const apparentGeocentric = geocentricState;
