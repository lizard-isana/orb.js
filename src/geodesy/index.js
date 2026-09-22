const TWO_PI = 2 * Math.PI;

export const WGS84 = Object.freeze({
  a: 6378.137,
  f: 1 / 298.257223563,
  b: 6356.752314245179,
  e2: 6.6943799901413165e-3
});

function requireFinite(value, label) {
  if (!Number.isFinite(value)) throw new TypeError(`${label} must be finite`);
  return value;
}

function requireVector(value, label) {
  if (!value || value.length !== 3) throw new TypeError(`${label}: expected a 3-vector`);
  for (let index = 0; index < 3; index++) requireFinite(value[index], `${label}[${index}]`);
  return value;
}

function requireObserver(observer) {
  if (!observer || typeof observer !== 'object') {
    throw new TypeError('observer must contain latitude, longitude, and optional height');
  }
  const latitude = requireFinite(observer.latitude, 'observer.latitude');
  const longitude = requireFinite(observer.longitude, 'observer.longitude');
  const height = requireFinite(observer.height ?? 0, 'observer.height');
  if (latitude < -Math.PI / 2 || latitude > Math.PI / 2) {
    throw new RangeError('observer.latitude must be within -pi/2 and +pi/2 radians');
  }
  return { latitude, longitude, height };
}

export function geodeticToEcef(observer) {
  const { latitude, longitude, height } = requireObserver(observer);
  const sinLatitude = Math.sin(latitude);
  const cosLatitude = Math.cos(latitude);
  const primeVerticalRadius = WGS84.a / Math.sqrt(1 - WGS84.e2 * sinLatitude ** 2);
  return Float64Array.of(
    (primeVerticalRadius + height) * cosLatitude * Math.cos(longitude),
    (primeVerticalRadius + height) * cosLatitude * Math.sin(longitude),
    (primeVerticalRadius * (1 - WGS84.e2) + height) * sinLatitude
  );
}

export function ecefToGeodetic(position) {
  requireVector(position, 'ecefToGeodetic: position');
  const [x, y, z] = position;
  const distanceFromAxis = Math.hypot(x, y);
  const radius = Math.hypot(distanceFromAxis, z);
  if (radius === 0) throw new RangeError('ecefToGeodetic: geocenter has no geodetic coordinates');
  const longitude = distanceFromAxis === 0 ? 0 : Math.atan2(y, x);
  if (distanceFromAxis < 1e-12) {
    return {
      latitude: z < 0 ? -Math.PI / 2 : Math.PI / 2,
      longitude,
      height: Math.abs(z) - WGS84.b
    };
  }

  let latitude = Math.atan2(z, distanceFromAxis * (1 - WGS84.e2));
  let primeVerticalRadius = WGS84.a;
  for (let iteration = 0; iteration < 12; iteration++) {
    const sinLatitude = Math.sin(latitude);
    primeVerticalRadius = WGS84.a / Math.sqrt(1 - WGS84.e2 * sinLatitude ** 2);
    const next = Math.atan2(z + primeVerticalRadius * WGS84.e2 * sinLatitude, distanceFromAxis);
    if (Math.abs(next - latitude) < 1e-14) {
      latitude = next;
      break;
    }
    latitude = next;
  }
  const cosLatitude = Math.cos(latitude);
  const sinLatitude = Math.sin(latitude);
  const height = Math.abs(cosLatitude) > 1e-8
    ? distanceFromAxis / cosLatitude - primeVerticalRadius
    : z / sinLatitude - primeVerticalRadius * (1 - WGS84.e2);
  return { latitude, longitude, height };
}

export function enuMatrix(observer) {
  const { latitude, longitude } = requireObserver(observer);
  const sinLatitude = Math.sin(latitude);
  const cosLatitude = Math.cos(latitude);
  const sinLongitude = Math.sin(longitude);
  const cosLongitude = Math.cos(longitude);
  return Float64Array.of(
    -sinLongitude, cosLongitude, 0,
    -sinLatitude * cosLongitude, -sinLatitude * sinLongitude, cosLatitude,
    cosLatitude * cosLongitude, cosLatitude * sinLongitude, sinLatitude
  );
}

function matrixVector(matrix, vector) {
  return Float64Array.of(
    matrix[0] * vector[0] + matrix[1] * vector[1] + matrix[2] * vector[2],
    matrix[3] * vector[0] + matrix[4] * vector[1] + matrix[5] * vector[2],
    matrix[6] * vector[0] + matrix[7] * vector[1] + matrix[8] * vector[2]
  );
}

function transposeMatrixVector(matrix, vector) {
  return Float64Array.of(
    matrix[0] * vector[0] + matrix[3] * vector[1] + matrix[6] * vector[2],
    matrix[1] * vector[0] + matrix[4] * vector[1] + matrix[7] * vector[2],
    matrix[2] * vector[0] + matrix[5] * vector[1] + matrix[8] * vector[2]
  );
}

export function ecefVectorToEnu(vector, observer) {
  requireVector(vector, 'ecefVectorToEnu: vector');
  return matrixVector(enuMatrix(observer), vector);
}

export function enuVectorToEcef(vector, observer) {
  requireVector(vector, 'enuVectorToEcef: vector');
  return transposeMatrixVector(enuMatrix(observer), vector);
}

export function ecefPositionToEnu(position, observer) {
  requireVector(position, 'ecefPositionToEnu: position');
  const site = geodeticToEcef(observer);
  return ecefVectorToEnu(
    Float64Array.of(position[0] - site[0], position[1] - site[1], position[2] - site[2]),
    observer
  );
}

export function enuToEcefPosition(enu, observer) {
  requireVector(enu, 'enuToEcefPosition: enu');
  const relative = enuVectorToEcef(enu, observer);
  const site = geodeticToEcef(observer);
  return Float64Array.of(relative[0] + site[0], relative[1] + site[1], relative[2] + site[2]);
}

export function enuToHorizontal(enu) {
  requireVector(enu, 'enuToHorizontal: enu');
  const range = Math.hypot(enu[0], enu[1], enu[2]);
  if (range === 0) throw new RangeError('enuToHorizontal: zero vector has no direction');
  let azimuth = Math.atan2(enu[0], enu[1]);
  if (azimuth < 0) azimuth += TWO_PI;
  return {
    azimuth,
    elevation: Math.asin(Math.max(-1, Math.min(1, enu[2] / range))),
    range
  };
}

export const enuToAzEl = enuToHorizontal;

export function horizontalToEnu({ azimuth, elevation, range }) {
  requireFinite(azimuth, 'horizontal.azimuth');
  requireFinite(elevation, 'horizontal.elevation');
  requireFinite(range, 'horizontal.range');
  if (elevation < -Math.PI / 2 || elevation > Math.PI / 2) {
    throw new RangeError('horizontal.elevation must be within -pi/2 and +pi/2 radians');
  }
  if (range < 0) throw new RangeError('horizontal.range must not be negative');
  const projected = range * Math.cos(elevation);
  return Float64Array.of(
    projected * Math.sin(azimuth),
    projected * Math.cos(azimuth),
    range * Math.sin(elevation)
  );
}
