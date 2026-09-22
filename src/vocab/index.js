function tokenList(...tokens) {
  const unique = new Set(tokens);
  if (unique.size !== tokens.length) throw new Error('vocab: duplicate token');
  for (const token of tokens) {
    if (!/^[a-z][a-z0-9-]*$/.test(token)) throw new Error(`vocab: invalid token '${token}'`);
  }
  return Object.freeze(tokens);
}

export const QUANTITIES = tokenList(
  'azimuth', 'elevation', 'right-ascension', 'declination', 'hour-angle',
  'ecliptic-longitude', 'ecliptic-latitude', 'elongation', 'phase-angle',
  'obliquity', 'refraction', 'inclination', 'longitude-of-ascending-node',
  'argument-of-periapsis', 'true-anomaly', 'mean-anomaly', 'eccentricity',
  'semi-major-axis', 'semi-latus-rectum', 'geodetic-latitude',
  'geodetic-longitude', 'geodetic-height', 'distance', 'range', 'altitude',
  'apoapsis', 'periapsis', 'illuminated-fraction', 'magnitude', 'instant',
  'period', 'time-scale-offset', 'age', 'position', 'velocity', 'mean-motion',
  'proper-motion'
);

export const UNITS = tokenList(
  'degree', 'arcminute', 'arcsecond', 'hour', 'radian', 'kilometer',
  'astronomical-unit', 'kilometer-per-second', 'au-per-day', 'day', 'second',
  'julian-year', 'julian-century', 'julian-date', 'unix-millisecond',
  'arcsecond-per-year', 'dimensionless'
);

export const UNIT_DIMENSION = Object.freeze({
  degree: 'angle',
  arcminute: 'angle',
  arcsecond: 'angle',
  hour: 'angle',
  radian: 'angle',
  kilometer: 'length',
  'astronomical-unit': 'length',
  'kilometer-per-second': 'velocity',
  'au-per-day': 'velocity',
  day: 'time',
  second: 'time',
  'julian-year': 'time',
  'julian-century': 'time',
  'julian-date': 'time',
  'unix-millisecond': 'time',
  'arcsecond-per-year': 'angular-rate',
  dimensionless: 'none'
});

export const FRAMES = tokenList(
  'equatorial-j2000', 'ecliptic-j2000', 'equatorial-mean-of-date',
  'equatorial-of-date', 'ecliptic-of-date', 'teme', 'ecef', 'enu',
  'horizontal', 'geodetic-wgs84'
);

export const CENTERS = tokenList('sun', 'earth', 'observer', 'barycenter', 'star');

export const CORRECTIONS = tokenList(
  'light-time', 'aberration-annual', 'aberration-diurnal', 'parallax-diurnal',
  'parallax-annual', 'refraction', 'proper-motion', 'deflection'
);

export const EFFECTS = tokenList(
  ...CORRECTIONS, 'polar-motion', 'atmospheric-extinction', 'light-pollution',
  'topocentric-libration', 'relativistic-light-bending'
);

export const SOURCES = tokenList(
  'vsop87a', 'erfa-epv00', 'meeus-moon', 'iau2006-precession',
  'iau2000b-nutation', 'iau1982-gmst', 'wgs84', 'sgp4',
  'bright-star-catalogue', 'saemundsson-refraction', 'universal-kepler'
);

const tokenSets = Object.freeze({
  quantity: new Set(QUANTITIES),
  unit: new Set(UNITS),
  frame: new Set(FRAMES),
  center: new Set(CENTERS),
  correction: new Set(CORRECTIONS),
  effect: new Set(EFFECTS),
  source: new Set(SOURCES)
});

export const isQuantity = (token) => tokenSets.quantity.has(token);
export const isUnit = (token) => tokenSets.unit.has(token);
export const isFrame = (token) => tokenSets.frame.has(token);
export const isCenter = (token) => tokenSets.center.has(token);
export const isCorrection = (token) => tokenSets.correction.has(token);
export const isEffect = (token) => tokenSets.effect.has(token);
export const isSource = (token) => tokenSets.source.has(token);

export function requireToken(dimension, token) {
  const tokens = tokenSets[dimension];
  if (!tokens) throw new RangeError(`vocab: unknown dimension '${dimension}'`);
  if (!tokens.has(token)) throw new RangeError(`vocab: '${token}' is not a valid ${dimension}`);
  return token;
}
