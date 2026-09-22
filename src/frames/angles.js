export const DEG = Math.PI / 180;
export const ARCSEC = DEG / 3600;
export const HOUR = Math.PI / 12;
export const TWO_PI = 2 * Math.PI;

export const degrees = (radians) => radians / DEG;
export const radians = (degreesValue) => degreesValue * DEG;

export function normalizeAngle(angle) {
  if (!Number.isFinite(angle)) throw new TypeError('normalizeAngle: angle must be finite');
  const result = angle % TWO_PI;
  return result < 0 ? result + TWO_PI : result;
}

export function normalizeSignedAngle(angle) {
  const normalized = normalizeAngle(angle);
  return normalized > Math.PI ? normalized - TWO_PI : normalized;
}
