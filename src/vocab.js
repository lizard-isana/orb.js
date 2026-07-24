// vocab.js — the controlled vocabulary shared across the whole library.
//
// One idea drives the design of orb.js: a value should identify itself.
// Detached from the function that produced it, a number still needs to
// say what it is — its quantity, its unit, the reference frame and origin
// it is measured in, and the corrections under which it is valid. That is
// only trustworthy if the WORDS are fixed: "of-date" must mean the same
// thing in the frame graph, in an apparent-place calculation, and in the
// metadata attached to a result.
//
// So every such word lives here, once, as a frozen token. Other modules
// use plain string literals for readability (the literals ARE the tokens),
// and this file is the authority that says which literals are legal; a
// test enforces that nothing drifts out of these lists. New code — the
// result metadata especially — imports the lists directly.
//
// Naming: all tokens are lower-case kebab-case, matching the frame names
// the graph already uses. Units are spelled out in full (kilometer, not
// km) so a token is never ambiguous.

const list = (...tokens) => {
  const seen = new Set();
  for (const t of tokens) {
    if (seen.has(t)) throw new Error('vocab: duplicate token ' + t);
    seen.add(t);
  }
  return Object.freeze(tokens);
};

// -- QUANTITY: what a number physically is ---------------------------------
// Enough on its own to know the meaning of a bare value.
export const QUANTITIES = list(
  // angles on the sky / in a coordinate system
  'azimuth', 'elevation', 'right-ascension', 'declination', 'hour-angle',
  'ecliptic-longitude', 'ecliptic-latitude', 'elongation', 'phase-angle',
  'obliquity',
  // orbital elements
  'inclination', 'longitude-of-ascending-node', 'argument-of-periapsis',
  'true-anomaly', 'mean-anomaly', 'eccentricity', 'semi-major-axis',
  'semi-latus-rectum',
  // geographic
  'geodetic-latitude', 'geodetic-longitude', 'geodetic-height',
  // lengths
  'distance', 'range', 'altitude', 'apoapsis', 'periapsis',
  // dimensionless
  'illuminated-fraction', 'magnitude',
  // time
  'instant', 'period', 'time-scale-offset', 'age',
  // vectors and rates
  'position', 'velocity', 'mean-motion', 'proper-motion'
);

// -- UNIT ------------------------------------------------------------------
export const UNITS = list(
  // angle
  'degree', 'arcminute', 'arcsecond', 'hour', 'radian',
  // length
  'kilometer', 'astronomical-unit',
  // velocity
  'kilometer-per-second', 'au-per-day',
  // time
  'day', 'second', 'julian-year', 'julian-century', 'julian-date',
  'unix-millisecond',
  // rate
  'arcsecond-per-year',
  // none
  'dimensionless'
);

// The physical dimension each unit measures — lets a consumer group and
// convert without hard-coding unit names.
export const UNIT_DIMENSION = Object.freeze({
  degree: 'angle', arcminute: 'angle', arcsecond: 'angle', hour: 'angle', radian: 'angle',
  kilometer: 'length', 'astronomical-unit': 'length',
  'kilometer-per-second': 'velocity', 'au-per-day': 'velocity',
  day: 'time', second: 'time', 'julian-year': 'time', 'julian-century': 'time',
  'julian-date': 'time', 'unix-millisecond': 'time',
  'arcsecond-per-year': 'angular-rate',
  dimensionless: 'none'
});

// -- FRAME: orientation of the axes ---------------------------------------
// The first seven are the nodes of the transformation graph; the last two
// are terminal representations used at the observation boundary.
export const FRAMES = list(
  'equatorial-j2000', 'ecliptic-j2000', 'equatorial-mean-of-date',
  'equatorial-of-date', 'ecliptic-of-date', 'teme', 'ecef',
  'horizontal', 'geodetic-wgs84'
);

// -- CENTER: origin of the coordinates ------------------------------------
// 'star' is an internal marker (a fixed source at effectively infinite
// distance); results describe such a place as geocentric ('earth').
export const CENTERS = list('sun', 'earth', 'observer', 'star');

// -- CORRECTION: a physical correction applied WITHIN a frame -------------
// Precession and nutation are NOT here: they are changes of FRAME
// (mean/true of date vs J2000) and are named by the frame instead.
export const CORRECTIONS = list(
  'light-time', 'aberration-annual', 'aberration-diurnal',
  'parallax-diurnal', 'parallax-annual', 'refraction',
  'proper-motion', 'deflection'
);

// -- EFFECT: anything that can be listed as deliberately NOT modeled ------
// (the honesty field). A superset of CORRECTIONS plus effects the library
// does not attempt at all.
export const EFFECTS = list(
  ...CORRECTIONS,
  'polar-motion', 'atmospheric-extinction', 'light-pollution',
  'topocentric-libration', 'relativistic-light-bending'
);

// -- SOURCE: the theory or dataset behind a number (provenance) ----------
// Doubles as the 'basis' of an accuracy statement.
export const SOURCES = list(
  'vsop87a', 'erfa-epv00', 'meeus-moon', 'iau2006-precession',
  'iau2000b-nutation', 'iau1982-gmst', 'wgs84', 'sgp4',
  'bright-star-catalogue', 'saemundsson-refraction', 'universal-kepler'
);

// Membership tests, one per dimension.
const setOf = (arr) => new Set(arr);
const S = {
  quantity: setOf(QUANTITIES), unit: setOf(UNITS), frame: setOf(FRAMES),
  center: setOf(CENTERS), correction: setOf(CORRECTIONS),
  effect: setOf(EFFECTS), source: setOf(SOURCES)
};
export const isQuantity = (t) => S.quantity.has(t);
export const isUnit = (t) => S.unit.has(t);
export const isFrame = (t) => S.frame.has(t);
export const isCenter = (t) => S.center.has(t);
export const isCorrection = (t) => S.correction.has(t);
export const isEffect = (t) => S.effect.has(t);
export const isSource = (t) => S.source.has(t);

// Assert that a token belongs to a dimension, or throw a helpful error.
// Used by the metadata layer so an unregistered word can never ship.
export const requireToken = (dimension, token) => {
  const set = S[dimension];
  if (!set) throw new Error('vocab: unknown dimension ' + dimension);
  if (!set.has(token)) {
    throw new RangeError(`vocab: '${token}' is not a valid ${dimension}`);
  }
  return token;
};
