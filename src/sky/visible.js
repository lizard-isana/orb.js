// visible.js — "what is in the sky right now" as one semantic result.
//
// This is a WRAPPER: it adds no astronomy of its own, it only sweeps the
// bodies and the star catalogue through observe() at one instant and
// arranges the results into a self-describing scene — the kind of
// structured answer a language model can narrate without recomputing
// anything. Every number keeps its unit, and the corrections that were
// and were not applied are named, so the description stays honest.

import { sun } from '../bodies/sun.js';
import { moon } from '../bodies/moon.js';
import { mercury } from '../bodies/mercury.js';
import { venus } from '../bodies/venus.js';
import { mars } from '../bodies/mars.js';
import { jupiter } from '../bodies/jupiter.js';
import { saturn } from '../bodies/saturn.js';
import { uranus } from '../bodies/uranus.js';
import { neptune } from '../bodies/neptune.js';
import { brightStars, starBody, starLabel } from '../catalog/stars.js';
import { elongation } from '../events/phases.js';

const PLANETS = [
  ['Mercury', mercury], ['Venus', venus], ['Mars', mars], ['Jupiter', jupiter],
  ['Saturn', saturn], ['Uranus', uranus], ['Neptune', neptune]
];

const COMPASS = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE',
  'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
const compass = (az) => COMPASS[Math.round(az / 22.5) % 16];

// Sun-elevation bands: the standard twilight definitions.
const skyPhase = (sunEl) =>
  sunEl >= 0 ? 'day'
    : sunEl >= -6 ? 'civil-twilight'
      : sunEl >= -12 ? 'nautical-twilight'
        : sunEl >= -18 ? 'astronomical-twilight' : 'night';

const moonPhase = (illum, waxing) => {
  if (illum < 0.02) return 'new';
  if (illum > 0.98) return 'full';
  if (illum < 0.46) return waxing ? 'waxing-crescent' : 'waning-crescent';
  if (illum <= 0.54) return waxing ? 'first-quarter' : 'last-quarter';
  return waxing ? 'waxing-gibbous' : 'waning-gibbous';
};

// visibleSky(site, t, options) -> a scene envelope.
//   site: an observer(); t: an Instant
//   options.minElevation (deg, default 10): horizon cut for planets/stars
//   options.maxMagnitude (default 4):       faintest star to include
export const visibleSky = (site, t, options = {}) => {
  const minEl = options.minElevation !== undefined ? options.minElevation : 10;
  const maxMag = options.maxMagnitude !== undefined ? options.maxMagnitude : 4;

  const s = site.observe(sun, t);

  // Moon: always reported, with its phase from the Sun-Moon elongation.
  const mo = site.observe(moon, t);
  const el0 = elongation(t);              // 0 = new, pi = full
  const illum = (1 - Math.cos(el0)) / 2;  // illuminated fraction
  const waxing = el0 < Math.PI;
  const moonObj = {
    name: 'Moon',
    up: mo.elevation >= 0,
    elevation_deg: +mo.elevation.toFixed(1),
    azimuth_deg: Math.round(mo.azimuth),
    direction: compass(mo.azimuth),
    phase: moonPhase(illum, waxing),
    illumination: +illum.toFixed(2),
    distance_km: Math.round(mo.distance)
  };

  const planets = [];
  for (const [name, body] of PLANETS) {
    const o = site.observe(body, t);
    if (o.elevation >= minEl) {
      planets.push({
        name,
        elevation_deg: +o.elevation.toFixed(1),
        azimuth_deg: Math.round(o.azimuth),
        direction: compass(o.azimuth)
      });
    }
  }
  planets.sort((a, b) => b.elevation_deg - a.elevation_deg);

  const stars = [];
  for (const row of brightStars(maxMag)) {
    const o = site.observe(starBody(row), t);
    if (o.elevation >= minEl) {
      stars.push({
        name: starLabel(row),
        constellation: row.con || null,
        magnitude: row.mag,
        elevation_deg: +o.elevation.toFixed(1),
        azimuth_deg: Math.round(o.azimuth),
        direction: compass(o.azimuth)
      });
    }
  }
  stars.sort((a, b) => a.magnitude - b.magnitude);

  // A compact "what to point out first" list for narration.
  const highlights = [];
  if (moonObj.up) {
    highlights.push(`Moon (${moonObj.phase}, ${Math.round(illum * 100)}% lit) in the ${moonObj.direction}`);
  }
  for (const p of planets.slice(0, 3)) {
    highlights.push(`${p.name} ${p.elevation_deg}° up in the ${p.direction}`);
  }
  if (stars[0]) {
    highlights.push(`brightest star ${stars[0].name} (${stars[0].constellation}, mag ${stars[0].magnitude}) in the ${stars[0].direction}`);
  }

  return {
    question: 'What is in the sky now?',
    instant: { utc: t.toDate().toISOString() },
    site: { latitude: site.latitude, longitude: site.longitude, height_m: site.height },
    conditions: {
      sun_elevation_deg: +s.elevation.toFixed(1),
      phase: skyPhase(s.elevation)
    },
    visible: {
      moon: moonObj,
      planets,
      bright_stars: stars,
      counts: {
        planets: planets.length,
        stars: stars.length,
        star_magnitude_limit: maxMag
      }
    },
    highlights,
    // Corrections applied to every direction: light-time, aberration,
    // diurnal parallax. What this scene deliberately does NOT model:
    ignored: ['planet-brightness', 'deep-sky-objects', 'atmospheric-extinction', 'light-pollution']
  };
};
