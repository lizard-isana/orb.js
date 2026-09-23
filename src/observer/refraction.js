import { DEG } from '../frames/index.js';

function requireFinite(value, label) {
  if (!Number.isFinite(value)) throw new TypeError(`${label} must be finite`);
  return value;
}

export function validateRefractionConditions(conditions) {
  if (!conditions || typeof conditions !== 'object' || Array.isArray(conditions)) {
    throw new TypeError('observer: refraction must be false or an object');
  }
  const keys = Object.keys(conditions);
  for (const key of keys) {
    if (key !== 'pressure' && key !== 'temperature') {
      throw new RangeError(`observer: unknown refraction option '${key}'`);
    }
  }
  const pressure = requireFinite(conditions.pressure, 'observer: refraction.pressure');
  const temperature = requireFinite(
    conditions.temperature,
    'observer: refraction.temperature'
  );
  if (pressure <= 0) {
    throw new RangeError('observer: refraction.pressure must be greater than zero hPa');
  }
  if (temperature <= -273.15) {
    throw new RangeError('observer: refraction.temperature must be above absolute zero');
  }
  return Object.freeze({ pressure, temperature });
}

export function atmosphericRefraction(elevation, conditions) {
  requireFinite(elevation, 'observer: elevation');
  const { pressure, temperature } = validateRefractionConditions(conditions);
  const elevationDegrees = elevation / DEG;
  const boundedElevation = Math.max(elevationDegrees, -1);
  const arcminutes = 1.02 / Math.tan(
    (boundedElevation + 10.3 / (boundedElevation + 5.11)) * DEG
  );
  const weatherScale = (pressure / 1010) * (283 / (273 + temperature));
  return arcminutes * weatherScale / 60 * DEG;
}

export const refraction = atmosphericRefraction;
