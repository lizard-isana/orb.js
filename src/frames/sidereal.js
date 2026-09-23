import { normalizeAngle } from './angles.js';

export function gmst82(instant) {
  if (!instant || typeof instant.jd2parts !== 'function') {
    throw new TypeError('gmst82: expected an AstroInstant');
  }
  const [jd1, jd2] = instant.jd2parts('ut1');
  const centuries = (jd1 - 2451545.0 + jd2) / 36525.0;
  const seconds = 67310.54841
    + (876600.0 * 3600 + 8640184.812866) * centuries
    + 0.093104 * centuries ** 2
    - 6.2e-6 * centuries ** 3;
  return normalizeAngle(seconds * (Math.PI / 180) / 240);
}
