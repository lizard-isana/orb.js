import {
  ecefPositionToEnu,
  ecefVectorToEnu,
  enuToEcefPosition,
  enuToHorizontal,
  enuVectorToEcef,
  horizontalToEnu
} from '../geodesy/index.js';
import { ARCSEC } from './angles.js';
import { gast, meanObliquity2006, nutation2000B } from './nutation.js';
import { nutationMatrix2000B, precessionMatrix2006 } from './precession.js';
import { gmst82 } from './sidereal.js';
import {
  matrixVector,
  multiplyMatrices,
  rotationX,
  rotationZ,
  transposeMatrixVector
} from './vector.js';

const J2000_OBLIQUITY = 84381.406 * ARCSEC;
const EARTH_ROTATION_RATE = 7.292115146706979e-5;

const EDGES = Object.freeze([
  {
    from: 'ecliptic-j2000',
    to: 'equatorial-j2000',
    matrix: () => rotationX(-J2000_OBLIQUITY)
  },
  {
    from: 'equatorial-j2000',
    to: 'equatorial-mean-of-date',
    matrix: precessionMatrix2006
  },
  {
    from: 'equatorial-mean-of-date',
    to: 'equatorial-of-date',
    matrix: nutationMatrix2000B
  },
  {
    from: 'equatorial-of-date',
    to: 'ecliptic-of-date',
    matrix: (instant) => rotationX(meanObliquity2006(instant) + nutation2000B(instant).deps)
  },
  {
    from: 'equatorial-of-date',
    to: 'teme',
    matrix: (instant) => rotationZ(
      nutation2000B(instant).dpsi * Math.cos(meanObliquity2006(instant))
    )
  },
  {
    from: 'teme',
    to: 'ecef',
    matrix: (instant) => rotationZ(gmst82(instant)),
    rotating: true
  }
]);

export const GRAPH_FRAMES = Object.freeze(
  [...new Set(EDGES.flatMap((edge) => [edge.from, edge.to])), 'enu'].sort()
);

const KNOWN_FRAMES = new Set(GRAPH_FRAMES);
const neighbors = new Map();
for (const edge of EDGES) {
  if (!neighbors.has(edge.from)) neighbors.set(edge.from, []);
  if (!neighbors.has(edge.to)) neighbors.set(edge.to, []);
  neighbors.get(edge.from).push({ edge, forward: true, next: edge.to });
  neighbors.get(edge.to).push({ edge, forward: false, next: edge.from });
}

function requireFrame(frame, label) {
  if (!KNOWN_FRAMES.has(frame)) throw new RangeError(`${label}: unknown frame '${frame}'`);
  return frame;
}

function copyVector(value, label, nullable = false) {
  if (nullable && value == null) return null;
  if (!value || value.length !== 3) throw new TypeError(`${label} must be a 3-vector`);
  const result = Float64Array.from(value);
  for (const component of result) {
    if (!Number.isFinite(component)) throw new TypeError(`${label} components must be finite`);
  }
  return result;
}

export function makeState({ t, frame, center, r, v = null }) {
  if (!t || typeof t.jd !== 'function' || typeof t.jd2parts !== 'function') {
    throw new TypeError('state.t must be an Instant');
  }
  requireFrame(frame, 'state.frame');
  if (typeof center !== 'string' || center.length === 0) {
    throw new TypeError('state.center must be a non-empty string');
  }
  if (frame === 'enu' && center !== 'observer') {
    throw new RangeError("state.center must be 'observer' for the ENU frame");
  }
  return {
    t,
    frame,
    center,
    r: copyVector(r, 'state.r'),
    v: copyVector(v, 'state.v', true)
  };
}

function findPath(from, to) {
  if (from === to) return [];
  const previous = new Map([[from, null]]);
  const queue = [from];
  while (queue.length > 0) {
    const node = queue.shift();
    for (const step of neighbors.get(node) ?? []) {
      if (previous.has(step.next)) continue;
      previous.set(step.next, { node, step });
      if (step.next === to) {
        const path = [];
        for (let current = to; previous.get(current); current = previous.get(current).node) {
          path.unshift(previous.get(current).step);
        }
        return path;
      }
      queue.push(step.next);
    }
  }
  return null;
}

function applyRotationalPath(state, targetFrame) {
  const path = findPath(state.frame, targetFrame);
  if (path === null) {
    throw new RangeError(`transform: no path from '${state.frame}' to '${targetFrame}'`);
  }
  let r = state.r;
  let v = state.v;
  for (const { edge, forward } of path) {
    const matrix = edge.matrix(state.t);
    if (edge.rotating && v) {
      if (forward) {
        const relativeVelocity = Float64Array.of(
          v[0] + EARTH_ROTATION_RATE * r[1],
          v[1] - EARTH_ROTATION_RATE * r[0],
          v[2]
        );
        v = matrixVector(matrix, relativeVelocity);
      } else {
        const inertialVelocity = transposeMatrixVector(matrix, v);
        const inertialPosition = transposeMatrixVector(matrix, r);
        v = Float64Array.of(
          inertialVelocity[0] - EARTH_ROTATION_RATE * inertialPosition[1],
          inertialVelocity[1] + EARTH_ROTATION_RATE * inertialPosition[0],
          inertialVelocity[2]
        );
        r = inertialPosition;
        continue;
      }
    } else if (v) {
      v = forward ? matrixVector(matrix, v) : transposeMatrixVector(matrix, v);
    }
    r = forward ? matrixVector(matrix, r) : transposeMatrixVector(matrix, r);
  }
  return { t: state.t, frame: targetFrame, center: state.center, r, v };
}

function enuToEcefState(state, observer) {
  if (!observer) throw new TypeError('transform: observer is required for ENU transforms');
  if (state.center !== 'observer') {
    throw new RangeError("transform: ENU state center must be 'observer'");
  }
  return {
    t: state.t,
    frame: 'ecef',
    center: 'earth',
    r: enuToEcefPosition(state.r, observer),
    v: state.v ? enuVectorToEcef(state.v, observer) : null
  };
}

function ecefToEnuState(state, observer) {
  if (!observer) throw new TypeError('transform: observer is required for ENU transforms');
  if (state.center !== 'earth') {
    throw new RangeError("transform: ECEF state center must be 'earth' before converting to ENU");
  }
  return {
    t: state.t,
    frame: 'enu',
    center: 'observer',
    r: ecefPositionToEnu(state.r, observer),
    v: state.v ? ecefVectorToEnu(state.v, observer) : null
  };
}

export function transform(input, { frame, observer } = {}) {
  const state = makeState(input);
  requireFrame(frame, 'transform target');
  if (state.frame === frame) return makeState(state);

  let working = state;
  if (working.frame === 'enu') working = enuToEcefState(working, observer);
  if (frame === 'enu') {
    if (working.frame !== 'ecef') working = applyRotationalPath(working, 'ecef');
    return ecefToEnuState(working, observer);
  }
  return applyRotationalPath(working, frame);
}

export function toHorizontal(state, { observer } = {}) {
  const enu = state.frame === 'enu' ? makeState(state) : transform(state, { frame: 'enu', observer });
  const horizontal = enuToHorizontal(enu.r);
  return Object.freeze({
    t: enu.t,
    frame: 'horizontal',
    center: 'observer',
    ...horizontal
  });
}

export function fromHorizontal({ t, azimuth, elevation, range }) {
  return makeState({
    t,
    frame: 'enu',
    center: 'observer',
    r: horizontalToEnu({ azimuth, elevation, range })
  });
}

export function transformationMatrix(from, to, instant) {
  requireFrame(from, 'transformationMatrix source');
  requireFrame(to, 'transformationMatrix target');
  if (from === 'enu' || to === 'enu') {
    throw new RangeError('transformationMatrix: ENU requires an observer and position translation');
  }
  const path = findPath(from, to);
  if (path === null) throw new RangeError(`transformationMatrix: no path from '${from}' to '${to}'`);
  let matrix = Float64Array.of(1, 0, 0, 0, 1, 0, 0, 0, 1);
  for (const step of path) {
    const edgeMatrix = step.edge.matrix(instant);
    const directed = step.forward
      ? edgeMatrix
      : Float64Array.of(
        edgeMatrix[0], edgeMatrix[3], edgeMatrix[6],
        edgeMatrix[1], edgeMatrix[4], edgeMatrix[7],
        edgeMatrix[2], edgeMatrix[5], edgeMatrix[8]
      );
    matrix = multiplyMatrices(directed, matrix);
  }
  return matrix;
}

export { gast };
