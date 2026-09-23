import { makeState } from '../../frames/index.js';
import {
  E0X,
  E0Y,
  E0Z,
  E1X,
  E1Y,
  E1Z,
  E2X,
  E2Y,
  E2Z
} from './data.js';

export const AU_KM = 149597870.7;
const DAYS_PER_JULIAN_YEAR = 365.25;
const SERIES = Object.freeze([
  Object.freeze([E0X, E1X, E2X]),
  Object.freeze([E0Y, E1Y, E2Y]),
  Object.freeze([E0Z, E1Z, E2Z])
]);

const AM12 = 0.000000211284;
const AM13 = -0.000000091603;
const AM21 = -0.000000230286;
const AM22 = 0.917482137087;
const AM23 = -0.397776982902;
const AM32 = 0.397776982902;
const AM33 = 0.917482137087;

export const EPV00_PROVENANCE = Object.freeze({
  source: Object.freeze(['erfa-epv00']),
  model: 'Simon et al. harmonic series fitted to JPL DE405',
  validity: Object.freeze({ startYear: 1900, endYear: 2100 }),
  accuracy: Object.freeze({ value: 1, unit: 'arcsecond', basis: 'erfa-epv00' })
});

function requireInstant(instant) {
  if (!instant || typeof instant.jd2parts !== 'function') {
    throw new TypeError('earth-epv00: expected an AstroInstant');
  }
  return instant;
}

function evaluateEarth(instant) {
  requireInstant(instant);
  const [jd1, jd2] = instant.jd2parts('tt');
  const time = (jd1 - 2451545.0 + jd2) / DAYS_PER_JULIAN_YEAR;
  const timeSquared = time * time;
  const position = [0, 0, 0];
  const velocity = [0, 0, 0];
  for (let axis = 0; axis < 3; axis++) {
    let coordinate = 0;
    let derivative = 0;
    const [order0, order1, order2] = SERIES[axis];
    for (let index = 0; index < order0.length; index += 3) {
      const amplitude = order0[index];
      const frequency = order0[index + 2];
      const phase = order0[index + 1] + frequency * time;
      coordinate += amplitude * Math.cos(phase);
      derivative -= amplitude * frequency * Math.sin(phase);
    }
    for (let index = 0; index < order1.length; index += 3) {
      const amplitude = order1[index];
      const frequencyTime = order1[index + 2] * time;
      const phase = order1[index + 1] + frequencyTime;
      const cosine = Math.cos(phase);
      coordinate += amplitude * time * cosine;
      derivative += amplitude * (cosine - frequencyTime * Math.sin(phase));
    }
    for (let index = 0; index < order2.length; index += 3) {
      const amplitude = order2[index];
      const frequencyTime = order2[index + 2] * time;
      const phase = order2[index + 1] + frequencyTime;
      const cosine = Math.cos(phase);
      coordinate += amplitude * timeSquared * cosine;
      derivative += amplitude * time * (2 * cosine - frequencyTime * Math.sin(phase));
    }
    position[axis] = coordinate;
    velocity[axis] = derivative / DAYS_PER_JULIAN_YEAR;
  }
  const kilometersPerSecond = AU_KM / 86400;
  return makeState({
    t: instant,
    frame: 'equatorial-j2000',
    center: 'sun',
    r: [
      (position[0] + AM12 * position[1] + AM13 * position[2]) * AU_KM,
      (AM21 * position[0] + AM22 * position[1] + AM23 * position[2]) * AU_KM,
      (AM32 * position[1] + AM33 * position[2]) * AU_KM
    ],
    v: [
      (velocity[0] + AM12 * velocity[1] + AM13 * velocity[2]) * kilometersPerSecond,
      (AM21 * velocity[0] + AM22 * velocity[1] + AM23 * velocity[2]) * kilometersPerSecond,
      (AM32 * velocity[1] + AM33 * velocity[2]) * kilometersPerSecond
    ]
  });
}

export const earthEpv00 = Object.freeze({
  name: 'earth',
  state: evaluateEarth,
  provenance: EPV00_PROVENANCE
});

export const sunEpv00 = Object.freeze({
  name: 'sun',
  state(instant) {
    const earth = evaluateEarth(instant);
    return makeState({
      t: instant,
      frame: earth.frame,
      center: 'earth',
      r: [-earth.r[0], -earth.r[1], -earth.r[2]],
      v: [-earth.v[0], -earth.v[1], -earth.v[2]]
    });
  },
  provenance: EPV00_PROVENANCE
});

export const earth = earthEpv00;
export const sun = sunEpv00;
