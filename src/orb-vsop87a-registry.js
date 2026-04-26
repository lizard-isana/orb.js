import * as COEF from './orb-vsop87a.js'

const SHORT_COEFFICIENTS = {
  Mercury: COEF.MERCURY_COEF,
  Venus: COEF.VENUS_COEF,
  Earth: COEF.EARTH_COEF,
  Mars: COEF.MARS_COEF,
  Jupiter: COEF.JUPITER_COEF,
  Saturn: COEF.SATURN_COEF,
  Uranus: COEF.URANUS_COEF,
  Neptune: COEF.NEPTUNE_COEF
}

const BODY_ALIASES = {
  mer: 'Mercury',
  mercury: 'Mercury',
  ven: 'Venus',
  venus: 'Venus',
  ear: 'Earth',
  earth: 'Earth',
  mar: 'Mars',
  mars: 'Mars',
  jup: 'Jupiter',
  jupiter: 'Jupiter',
  sat: 'Saturn',
  saturn: 'Saturn',
  ura: 'Uranus',
  uranus: 'Uranus',
  nep: 'Neptune',
  neptune: 'Neptune'
}

const full_coefficients = new Map();

export const normalizeVSOP87ABody = (body) => {
  const key = String(body || '').trim().toLowerCase();
  const normalized = BODY_ALIASES[key];
  if(!normalized){
    throw new Error(`Unknown VSOP87A body: ${body}`);
  }
  return normalized;
}

export const registerVSOP87A = (body, data) => {
  const normalized = normalizeVSOP87ABody(body);
  if(!Array.isArray(data)){
    throw new Error(`VSOP87A data for ${normalized} must be an array.`);
  }
  full_coefficients.set(normalized, data);
  return data;
}

export const unregisterVSOP87A = (body) => {
  const normalized = normalizeVSOP87ABody(body);
  return full_coefficients.delete(normalized);
}

export const hasVSOP87A = (body, precision = 'full') => {
  const normalized = normalizeVSOP87ABody(body);
  if(precision === 'full'){
    return full_coefficients.has(normalized);
  }
  if(precision === 'short' || precision === 'default' || precision === undefined || precision === null){
    return Boolean(SHORT_COEFFICIENTS[normalized]);
  }
  return false;
}

export const resolveVSOP87ACoefficients = (body, options = {}) => {
  const normalized = normalizeVSOP87ABody(body);
  const precision = options && options.vsop87a ? options.vsop87a : 'short';

  if(precision === 'full'){
    if(!full_coefficients.has(normalized)){
      throw new Error(`Full VSOP87A data for ${normalized} is not registered.`);
    }
    return full_coefficients.get(normalized);
  }

  if(precision !== 'short' && precision !== 'default' && precision !== undefined && precision !== null){
    throw new Error(`Unsupported VSOP87A precision for ${normalized}: ${precision}`);
  }

  return SHORT_COEFFICIENTS[normalized];
}
