import { ARCSEC, normalizeAngle } from './angles.js';
import { gmst82 } from './sidereal.js';
import { NUT00B_TERMS } from './data/nut00b-data.js';

const ARCSECONDS_PER_TURN = 1296000;

export function nutation2000B(instant) {
  if (!instant || typeof instant.julianCenturies !== 'function') {
    throw new TypeError('nutation2000B: expected an AstroInstant');
  }
  const centuries = instant.julianCenturies();
  const moonAnomaly = ((485868.249036 + 1717915923.2178 * centuries) % ARCSECONDS_PER_TURN) * ARCSEC;
  const sunAnomaly = ((1287104.79305 + 129596581.0481 * centuries) % ARCSECONDS_PER_TURN) * ARCSEC;
  const moonLatitude = ((335779.526232 + 1739527262.8478 * centuries) % ARCSECONDS_PER_TURN) * ARCSEC;
  const elongation = ((1072260.70369 + 1602961601.2090 * centuries) % ARCSECONDS_PER_TURN) * ARCSEC;
  const node = ((450160.398036 - 6962890.5431 * centuries) % ARCSECONDS_PER_TURN) * ARCSEC;
  let longitude = 0;
  let obliquity = 0;
  for (let index = NUT00B_TERMS.length - 1; index >= 0; index--) {
    const term = NUT00B_TERMS[index];
    const argument = term[0] * moonAnomaly + term[1] * sunAnomaly
      + term[2] * moonLatitude + term[3] * elongation + term[4] * node;
    const sine = Math.sin(argument);
    const cosine = Math.cos(argument);
    longitude += (term[5] + term[6] * centuries) * sine + term[7] * cosine;
    obliquity += (term[8] + term[9] * centuries) * cosine + term[10] * sine;
  }
  const tableUnit = ARCSEC / 1e7;
  const milliarcsecond = ARCSEC / 1000;
  return {
    dpsi: longitude * tableUnit - 0.135 * milliarcsecond,
    deps: obliquity * tableUnit + 0.388 * milliarcsecond
  };
}

export const nutation = nutation2000B;

export function meanObliquity2006(instant) {
  if (!instant || typeof instant.julianCenturies !== 'function') {
    throw new TypeError('meanObliquity2006: expected an AstroInstant');
  }
  const t = instant.julianCenturies();
  return (84381.406
    + (-46.836769
      + (-0.0001831
        + (0.00200340
          + (-0.000000576
            - 0.0000000434 * t) * t) * t) * t) * t) * ARCSEC;
}

export const meanObliquity = meanObliquity2006;

export function trueObliquity(instant) {
  return meanObliquity2006(instant) + nutation2000B(instant).deps;
}

export function gast(instant) {
  const { dpsi } = nutation2000B(instant);
  return normalizeAngle(gmst82(instant) + dpsi * Math.cos(meanObliquity2006(instant)));
}
