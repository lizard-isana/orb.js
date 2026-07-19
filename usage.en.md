# orb.js v3 — Usage

JavaScript library for astronomical calculations: positions of the Sun,
Moon and planets, Keplerian orbits, Earth-orbiting satellites (SGP4), and
conversion to the horizontal (azimuth/elevation) frame for an observer.
No runtime dependencies.

## Install / Load

```
npm install lizard-isana/orb.js
```

```js
// CommonJS / bundlers (UMD build)
const Orb = require('orb.js');

// Browser
<script src="dist/orb.js"></script>  // exposes window.Orb

// ES modules (source)
import * as Orb from './src/orb.es6.js';
```

All methods take a JavaScript `Date` object. **The `Date` is interpreted as
UTC** (its absolute instant is used; your local timezone does not matter).
Conversion to Terrestrial Time (TT) for the ephemeris theories is handled
internally — see "Time scales" below.

## Quick start

```js
const date = new Date(); // now

// Sun / Moon
const sun  = new Orb.Sun().radec(date);   // { ra(hours), dec(deg), distance(au) }
const moon = new Orb.Luna().radec(date);  // { ra(hours), dec(deg), distance(km) }

// Planets (VSOP87A): Mercury, Venus, Mars, Jupiter, Saturn, Uranus, Neptune
const mars = new Orb.Mars();
mars.radec(date);  // apparent RA/Dec, equinox of date
mars.xyz(date);    // heliocentric ecliptic rectangular, J2000, au

// Keplerian orbit (comets, asteroids)
const comet = new Orb.Kepler({
  eccentricity: 0.85,
  periapsis_distance: 0.9,      // au (or semi_major_axis)
  inclination: 30,              // deg
  argument_of_periapsis: 120,   // deg
  longitude_of_ascending_node: 45, // deg
  time_of_periapsis: 2460700.5  // TT Julian date (or mean_anomaly + epoch)
});
comet.radec(date);
comet.xyz(date);   // { x,y,z (au), xdot,ydot,zdot (au/day) }

// Satellite from TLE
const iss = new Orb.SGP4({
  first_line:  '1 25544U 98067A   20014.52632156  .00016717  00000-0  10270-3 0  9015',
  second_line: '2 25544  51.6423  33.7380 0004871 130.9389 229.2183 15.49556564  8038'
});
iss.xyz(date);     // TEME rectangular, km & km/s
iss.latlng(date);  // { latitude, longitude (deg), altitude (km), velocity (km/s) }

// Azimuth / elevation for an observer
const observation = new Orb.Observation({
  observer: { latitude: 35.658, longitude: 139.741, altitude: 0 }, // deg, deg, km
  target: moonOrPlanetInstanceOrCoordinates
});
observation.azel(date);
// { azimuth(deg, N=0 E=90), elevation(deg), distance(km), atmospheric_refraction(deg) }
```

## Classes

### `Orb.Time(date)`

| method | returns |
|---|---|
| `jd()` | Julian date (UTC-based) |
| `jd_tt()` | Julian date in Terrestrial Time (`jd() + tt_minus_utc()/86400`) |
| `tt_minus_utc()` | TT−UTC in seconds. Exact from 1972 via the leap-second table (69.184 s since 2017); NASA ΔT polynomial before 1972 |
| `delta_t()` | NASA polynomial estimate of ΔT (TT−UT1), seconds |
| `gast()` | Greenwich Apparent Sidereal Time, hours |
| `gmst()` | deprecated alias of `gast()` — it has always returned *apparent* sidereal time |
| `doy()` | day of year including fraction (UTC), number |

### `Orb.Sun`, `Orb.Luna` (alias `Orb.Moon`)

- `radec(date)` — apparent geocentric RA/Dec, equinox of date. RA in hours,
  Dec in degrees. Distance: **au** for the Sun, **km** for the Moon.
- `Luna.latlng(date)` — apparent ecliptic longitude/latitude of date (deg) and
  distance (km).
- `Luna.xyz(date)` — geocentric ecliptic rectangular of date, km.
- `Luna.parallax(date)` — equatorial horizontal parallax, deg.
- `Luna.phase(date)` — days since the nearest computed new moon.

### Planets: `Orb.Mercury` … `Orb.Neptune`, `Orb.Earth` (VSOP87A)

- `xyz(date)` — heliocentric ecliptic rectangular, **equinox J2000**, au
  (`coordinate_keywords: "ecliptic rectangular j2000"`).
- `radec(date)` — apparent geocentric RA/Dec, **equinox of date** (precession
  and nutation are applied in the conversion pipeline).

### `Orb.Kepler(elements)`

Elements: `eccentricity` (any e ≥ 0, including exactly 1), plus
`semi_major_axis` or `periapsis_distance` (au), angles in degrees referred to
the **J2000 ecliptic**, and either `time_of_periapsis` or `mean_anomaly` +
`epoch` (TT Julian date). Optional `gm` in au³/day² (default: solar GM).
`xyz(date)` returns position (au) and velocity (au/day); `radec(date)`
returns the apparent place of date. `Orb.CartesianToKeplerian` converts a
state vector back to elements.

### `Orb.SGP4(tle_or_omm)` (alias `Orb.Satellite`)

Accepts `{first_line, second_line[, name]}` TLE strings or a CCSDS OMM
object. `xyz(date)` returns TEME rectangular coordinates (km, km/s);
`latlng(date)` returns the sub-satellite point (WGS-72). Properties:
`orbital_period` (min), `apogee` / `perigee` (km), `orbital_elements`, `omm`.

### `Orb.Observation({observer, target})`

`observer`: `latitude`/`longitude` in degrees, `altitude` in **km**.
`target` may be:

1. an instance with `radec()`/`xyz()` (Sun, Luna, planet, Kepler, SGP4),
2. a coordinate object previously returned by those methods,
3. a plain `{ra, dec}` (hours, degrees) for a fixed star.

`azel(date)` returns azimuth (deg, north = 0, east = 90), elevation (deg),
distance (**km** whenever a distance is known) and `atmospheric_refraction`
(deg). When the target's distance is known, the result is **topocentric**:
diurnal parallax is applied (up to ~1° for the Moon). Plain `{ra, dec}`
targets are treated as infinitely distant.

**Refraction is returned but NOT added.** For the refracted altitude use
`elevation + atmospheric_refraction` (only meaningful near/above the
horizon).

### Coordinate helpers

`RadecToXYZ`, `XYZtoRadec`, `EclipticToEquatorial`, `EquatorialToEcliptic`,
`EclipticJ2000ToDate`, `Obliquity` / `MeanObliquity` / `Nutation`,
`Constant` (AU, planetary GM in km³/s², radii, etc.). Note that
`EclipticToEquatorial` also subtracts the Earth's heliocentric position,
i.e. it expects heliocentric input; vectors tagged `j2000` in
`coordinate_keywords` are precessed to the equinox of date automatically.

## Time scales and accuracy

- Input `Date` is UTC. Ephemeris series are evaluated in TT internally;
  sidereal time uses UT. TT−UTC is exact from 1972 (leap-second table),
  estimated by the NASA polynomial before that.
- Sun: low-precision theory (Meeus), ~0.01°. Annual aberration (~20″) is
  not applied.
- Moon: truncated ELP-based series (Meeus ch. 47), a few arcseconds against
  the full theory; nutation uses a 4-term approximation (~2″).
- Planets: VSOP87A (nearly full series) with IAU 1976 precession; light-time
  and aberration are not applied, so apparent places are good to roughly
  tens of arcseconds.
- Satellites: SGP4 (Spacetrack Report #3), TEME frame; the usual SGP4
  accuracy caveats apply (km-level, degrading with TLE age).
- `azel` applies diurnal parallax but not refraction (returned separately)
  and not polar motion.

## Behavior changes in this branch (migration notes)

- The npm entry point is now `dist/orb.js` (the previous `main` pointed to a
  nonexistent file).
- All positions moved by ΔT ≈ 69 s of motion (≈38″ for the Moon): series are
  now correctly evaluated in TT.
- Planet/Kepler RA/Dec moved by accumulated precession (~0.4° in 2026): they
  are now referred to the equinox of date, consistent with the Sun and Moon.
- Moon azimuth/elevation moved by up to ~1°: diurnal parallax is now
  applied. Moonrise/set timing improves by ~4–5 minutes.
- Distances returned by `azel` are now always in km and labeled in
  `unit_keywords`.
- `gmst()` is deprecated in favor of `gast()` (same value).

## License

MIT — see MIT-LICENSE.
