// refraction.js — atmospheric refraction.
//
//#region edu:refraction
// The atmosphere bends light downward, lifting every object above its
// geometric place: ~0.1 degrees at 45 deg elevation, ~0.57 degrees at
// the horizon (more than the Sun's diameter — the "risen" Sun you watch
// is geometrically still below the horizon).
//
// This is the Saemundsson formula (the inverse companion of Bennett's),
// which takes the TRUE elevation and returns the angle to ADD to it.
// Refraction depends on the actual air: the standard value assumes
// 1010 hPa and 10 degC, and scales linearly with pressure and inversely
// with absolute temperature. It is also the least certain correction in
// this library — near the horizon real refraction varies by several
// arcminutes with weather, which is why the pipeline only applies it
// when the caller explicitly asks.
//#endregion

import { DEG } from '../math/angles.js';

// True elevation (radians) -> refraction angle to add (radians).
// conditions: { pressure (hPa), temperature (degC) }, defaults 1010/10.
export const refraction = (elevation, { pressure = 1010, temperature = 10 } = {}) => {
  const h = elevation / DEG; // formula works in degrees
  // Below ~ -1 deg the formula loses meaning; clamp to its value there.
  const hc = Math.max(h, -1);
  const arcmin = 1.02 / Math.tan((hc + 10.3 / (hc + 5.11)) * DEG);
  const scale = (pressure / 1010) * (283 / (273 + temperature));
  return arcmin * scale / 60 * DEG;
};
