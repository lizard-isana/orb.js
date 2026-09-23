# orb.js v3.1 — Usage

orb.js provides astronomical calculations without runtime dependencies. v3.1
has a compatible package-root API for existing applications and additive
structured ES-module subpaths for calculations that need explicit frames,
centers, units, time scales, corrections, or provenance.

## Install and load

```sh
npm install @lizard-isana/orb
```

```js
// Compatible CommonJS API
const Orb = require('@lizard-isana/orb');

// Compatible ES-module API
import * as Orb from '@lizard-isana/orb';

// Structured ES-module subpaths
import { AstroInstant } from '@lizard-isana/orb/time';
import { createObserver } from '@lizard-isana/orb/observer';
```

For a browser, load `dist/orb.js`. The complete UMD build exposes
`window.Orb`. Pin an exact package version when using a CDN.

```html
<script src="https://unpkg.com/@lizard-isana/orb@3.1.1/dist/orb.js"></script>
```

Node.js 18 or later is required. The structured subpaths are ES modules.

The supported browser baseline is Chrome and Edge 92+, Firefox 90+, Safari and
iOS Safari 15.4+, Chrome for Android 92+, and Firefox for Android 90+. No
polyfills are included. IE 11, EdgeHTML, Opera Mini, KaiOS 2.5, and older
browsers are unsupported; embedded web views are not guaranteed separately.

The UMD build exposes only the compatible `Orb.*` surface. Use a package-aware
bundler for structured subpaths in browser applications. Native browser bare
imports require an import map or URL mapping, and direct CDN ESM subpaths are
not currently a supported entry path.

## Choose between compatible and structured APIs

The compatible API keeps the established `Orb.*` constructors, synchronous
methods, JavaScript `Date` input, degrees or hours for angles, and au or km as
documented by each result. It is the shortest upgrade path from v2 or v3.0.

The structured API uses:

- `AstroInstant` instead of `Date` at calculation boundaries;
- radians for angles;
- km, km/s, and seconds for state-vector calculations;
- explicit `frame` and `center` tags;
- explicit correction switches and optional metadata.

The two surfaces can be mixed through the adapters exported by `/frames`.
Structured APIs do not silently change the defaults of compatible classes.

## Compatible package-root API

### Sun, Moon, and planets

```js
const date = new Date('2026-07-18T12:00:00Z');

const sun = new Orb.Sun().radec(date);
// ra: hours, dec: degrees, distance: au

const moon = new Orb.Luna().radec(date); // Orb.Moon is an alias
// ra: hours, dec: degrees, distance: km

const mars = new Orb.Mars();
mars.radec(date); // geocentric RA/Dec, equinox of date
mars.xyz(date);   // heliocentric ecliptic J2000, au
```

Planet constructors are `Mercury`, `Venus`, `Earth`, `Mars`, `Jupiter`,
`Saturn`, `Uranus`, and `Neptune`. The default planet data is the compact
VSOP87A table included in the root bundle. See “Optional full VSOP87A data”
for the separately loaded full coefficients.

`Luna.latlng(date)` returns ecliptic longitude and latitude of date in degrees
and distance in km. `Luna.xyz(date)` returns geocentric ecliptic rectangular
coordinates of date in km. `Luna.parallax(date)` returns horizontal parallax
in degrees, and `Luna.phase(date)` returns days since the computed new moon.

### Compatible Kepler orbits

```js
const comet = new Orb.Kepler({
  eccentricity: 0.85,
  periapsis_distance: 0.9,
  inclination: 30,
  argument_of_periapsis: 120,
  longitude_of_ascending_node: 45,
  time_of_periapsis: 2460700.5
});

comet.xyz(date);   // au and au/day
comet.radec(date); // hours, degrees, and au
```

Compatible elements use degrees, au, and TT Julian dates. Specify either
`semi_major_axis` or `periapsis_distance`, and either `time_of_periapsis` or
`mean_anomaly` plus `epoch`. `Orb.CartesianToKeplerian` converts a compatible
state back to elements.

### Compatible SGP4

```js
const iss = new Orb.SGP4({
  first_line: '1 25544U 98067A   20014.52632156  .00016717  00000-0  10270-3 0  9015',
  second_line: '2 25544  51.6423  33.7380 0004871 130.9389 229.2183 15.49556564  8038'
});

iss.xyz(date);    // TEME position/velocity, km and km/s
iss.latlng(date); // WGS-84 latitude/longitude in degrees, altitude in km
```

`Orb.Satellite` is an alias. TLE objects and CCSDS OMM objects are accepted.
Near-Earth and deep-space propagation use the Vallado SGP4/SDP4 implementation.
Propagation uses WGS-72 gravity constants; geodetic output uses WGS-84. See
“Structured SGP4 semantics” for the model contract and limitations.

### Compatible observations

```js
const observation = new Orb.Observation({
  observer: { latitude: 35.658, longitude: 139.741, altitude: 0.025 },
  target: new Orb.Luna()
});

const result = observation.azel(date);
// azimuth/elevation/atmospheric_refraction: degrees
// distance: km when distance is known
```

Azimuth is north = 0 degrees and east = 90 degrees. Observer latitude and
longitude are degrees and altitude is km on WGS-84. A target can be a supported
orb.js body, a coordinate object returned by one, or a plain `{ ra, dec }`
fixed direction (hours and degrees). Known-distance targets are topocentric;
plain RA/Dec directions are treated as infinitely distant.

The compatible result reports `atmospheric_refraction` but does not add it to
`elevation`. Unsupported or ambiguous coordinate and unit combinations throw
an explanatory error instead of being guessed.

### Compatible time and coordinate helpers

`new Orb.Time(date)` provides:

| Method | Meaning |
|---|---|
| `jd()` | UTC-based Julian date |
| `jd_tt()` | TT Julian date |
| `tt_minus_utc()` | TT−UTC in seconds |
| `delta_t()` | estimated TT−UT1 in seconds |
| `gast()` | Greenwich apparent sidereal time, hours |
| `gmst82()` | IAU 1982 Greenwich mean sidereal time, hours |
| `gmst()` | deprecated alias of `gast()` |
| `doy()` | fractional UTC day of year as a number |

Coordinate helpers include `RadecToXYZ`, `XYZtoRadec`,
`EclipticToEquatorial`, `EquatorialToEcliptic`, `EclipticJ2000ToDate`,
`Nutation`, `Obliquity`, and `MeanObliquity`. Compatible results retain
`coordinate_keywords` and `unit_keywords`; inspect them rather than assuming
one unit for every root API result.

## Structured time, frames, and geodesy

### `@lizard-isana/orb/time`

```js
import { AstroInstant, deltaT, ttMinusUtc } from '@lizard-isana/orb/time';

const instant = AstroInstant.fromISO('2026-07-18T12:00:00Z', { dut1: 0.05 });
instant.jd('utc');
instant.jd('ut1');
instant.jd('tt');
instant.addSeconds(30);
```

`AstroInstant.from` accepts an `AstroInstant`, `Date`, ISO string, or Unix milliseconds.
`fromJD` and `fromJD2` accept an explicit `utc`, `ut1`, or `tt` scale. Internally
the instant stores a two-part TT Julian date and remains immutable. `dut1`
defaults to zero and, when supplied, must be between -0.9 and +0.9 seconds.
`AstroInstant` is an orb.js astronomical time class, not `Temporal.Instant`,
and it does not require the browser Temporal API.

### `@lizard-isana/orb/frames`

```js
import { makeState, transform } from '@lizard-isana/orb/frames';
import { AstroInstant } from '@lizard-isana/orb/time';

const state = makeState({
  t: AstroInstant.fromISO('2026-07-18T12:00:00Z'),
  frame: 'equatorial-j2000',
  center: 'earth',
  r: [7000, 0, 0],
  v: [0, 7.5, 1]
});
const ofDate = transform(state, { frame: 'equatorial-of-date' });
```

State positions and velocities are km and km/s. Supported frame vocabulary
includes equatorial/ecliptic J2000, mean and true equatorial of date,
ecliptic of date, TEME, ECEF, ENU, horizontal, and WGS-84 geodetic contexts.
The module also exports IAU 2006 precession, IAU 2000B nutation, IAU 1982
sidereal rotation, angle constants, vector/matrix helpers, and legacy-body
adapters. Unknown frames and unsupported transform paths throw.

### `@lizard-isana/orb/geodesy`

This subpath contains pure WGS-84 geodetic/ECEF/ENU conversions. Locations use
latitude and longitude in radians and `height` in km. ECEF and ENU vectors are
km; horizontal azimuth and elevation are radians.

`@lizard-isana/orb/vocab` exports the controlled names for quantities, units,
frames, centers, corrections, effects, and sources, together with validation
helpers. Use these tokens when storing or exchanging structured metadata.

## Structured Kepler propagation

`@lizard-isana/orb/kepler` exports `propagateKepler`, `elementsToState`,
`stateToElements`, `stumpffC`, `stumpffS`, and common `GM` values.

```js
import { GM, propagateKepler } from '@lizard-isana/orb/kepler';

const next = propagateKepler(
  [7000, 0, 0],
  [0, 7.5, 1],
  600,
  GM.earth
);
```

The structured solver uses km, km/s, seconds, radians, and km³/s². One bounded
universal-variable path covers elliptic, parabolic, and hyperbolic motion.
Invalid physical inputs and non-convergence throw. This is unperturbed two-body
propagation, not an Earth satellite force model.

## Structured Earth/Sun and observer

`@lizard-isana/orb/models/earth-epv00` exports `earthEpv00` and `sunEpv00`.
The model is based on the ERFA EPV00 harmonic series fitted to JPL DE405,
declares 1900–2100 validity, and carries an approximately one-arcsecond source
accuracy statement. It is optional and does not replace the root API's legacy
Earth/Sun models.

```js
import { AstroInstant } from '@lizard-isana/orb/time';
import { createObserver } from '@lizard-isana/orb/observer';
import { sunEpv00 } from '@lizard-isana/orb/models/earth-epv00';

const instant = AstroInstant.fromISO('2026-07-18T12:00:00Z');
const site = createObserver({
  latitude: 35.658 * Math.PI / 180,
  longitude: 139.741 * Math.PI / 180,
  height: 0.025
});

const geometric = site.observe(sunEpv00, instant);
const corrected = site.observe(sunEpv00, instant, {
  lightTime: true,
  aberration: true,
  refraction: { pressure: 1010, temperature: 10 },
  meta: true
});
```

The third `observe` argument is optional. Omission is exactly:

```js
{
  frameModel: 'iau2006-2000b',
  lightTime: false,
  aberration: false,
  refraction: false,
  meta: false
}
```

Thus the default uses modern coordinate transforms and topocentric vector
subtraction, but remains geometric and airless. Light time, annual aberration,
and atmospheric refraction are independently opt-in. Refraction pressure is
hPa and temperature is degrees Celsius.

Observation angles are radians and distances are km. `range` is observer to
target; `geocentricDistance` is Earth center to target. With `meta: true`, the
result describes quantities, units, frames, centers, applied corrections,
model sources, supplied model accuracy, and ignored effects. The pipeline does
not implement diurnal aberration, gravitational deflection, or polar motion.

## Structured events

`@lizard-isana/orb/events` provides bounded searches, rise/set/transit, lunar
elongation/phases/age, and satellite passes. All time inputs and event times are
`AstroInstant`; public angles are radians.

```js
import { HORIZON_CONSTANTS, riseSetTransit } from '@lizard-isana/orb/events';

const events = riseSetTransit(
  site,
  sunEpv00,
  AstroInstant.fromISO('2026-07-17T15:00:00Z'),
  AstroInstant.fromISO('2026-07-18T15:00:00Z'),
  { semidiameter: HORIZON_CONSTANTS.meanSolarSemidiameter }
);
```

Rise/set defaults mean a geometric body-center crossing of a zero-radian
horizon. Satellite passes likewise default to zero minimum elevation. Standard
refraction, mean solar/lunar semidiameters, and conventional horizons are
published as `HORIZON_CONSTANTS`, but none is silently selected. Do not combine
a precombined conventional horizon with the same explicit refraction or
semidiameter correction.

Pass results label elevation as `geometric` or `refracted`. They report
`opticalVisibility` and `sunlight` as `not-computed`; a geometric pass is not a
claim that the satellite is illuminated or visible.

## Structured SGP4 semantics

`@lizard-isana/orb/sgp4` exports pure TLE/OMM parsers and `createSatellite`.

```js
import { createSatellite } from '@lizard-isana/orb/sgp4';

const satellite = createSatellite({
  line1: '1 25544U 98067A   20014.52632156  .00016717  00000-0  10270-3 0  9015',
  line2: '2 25544  51.6423  33.7380 0004871 130.9389 229.2183 15.49556564  8038'
});
const state = satellite.state(AstroInstant.fromISO('2020-01-14T12:37:54Z'));
const subpoint = satellite.geodetic(AstroInstant.fromISO('2020-01-14T12:37:54Z'));
```

`state()` returns an Earth-centered TEME state in km and km/s. `geodetic()`
uses the TEME-to-ECEF path required by SGP4 and returns WGS-84 latitude,
longitude, and height in radians/radians/km.

TLE fields are SGP4 mean elements, not instantaneous osculating elements.
Propagation uses WGS-72 gravity constants because the elements are fitted to
that model; WGS-84 is used only for geodesy. `B*` is the SGP4 drag term, not a
physical ballistic coefficient. Numeric and Alpha-5 catalog numbers are
supported, both TLE lines must identify the same object, and malformed fields
throw explanatory errors. Checksums are optional by default; enable them with
`{ validateChecksum: true }` or call the checksum helpers directly.

SGP4 errors grow with element age and orbit conditions. Use current elements,
retain their epoch, and validate predictions for the operational context.
orb.js does not assign a universal “valid for N days” interval.

## Optional full VSOP87A data

Full planet coefficient modules are published separately so the default UMD
bundle remains small. Import and register only the bodies needed:

```js
import * as Orb from '@lizard-isana/orb';
import { MARS_FULL_COEF } from '@lizard-isana/orb/vsop87a/mars';

Orb.registerVSOP87A('Mars', MARS_FULL_COEF);
const mars = new Orb.Mars({ vsop87a: 'full' });
```

Modules are available for Mercury, Venus, Earth, Mars, Jupiter, Saturn, Uranus,
and Neptune. The coefficient source is vendored and generation is checked for
reproducibility. Full data improves series truncation but does not add omitted
light-time, aberration, or other corrections to compatible methods.

## Models, accuracy, and omitted effects

Accuracy belongs to the complete pipeline, not only to a coefficient table.
The following descriptions state model scope rather than promising one error
bound for every date and geometry.

- Compatible Sun and Moon use the established orb.js/Meeus-style models.
  The Moon series is truncated and the compatible nutation is a short
  approximation.
- Compatible planets use compact VSOP87A by default; full tables are optional.
  Compatible RA/Dec applies legacy apparent-place conventions, which do not
  include every modern correction.
- The structured observer uses IAU 2006 precession, IAU 2000B nutation,
  IAU 1982 Earth rotation where required, and WGS-84 observer geometry.
  Light time, annual aberration, and refraction are explicit switches.
- EPV00 supplies its own provenance, validity interval, and approximate source
  accuracy. Extrapolation outside the declared interval is not a new accuracy
  guarantee.
- SGP4/SDP4 is verified against reference vectors, but real prediction error
  depends strongly on the element set and time since epoch.

Unless a result explicitly says otherwise, orb.js does not model polar motion,
diurnal aberration, gravitational light deflection, atmospheric extinction,
light pollution, terrain horizons, or satellite optical visibility.

## Migrating from v3.0 to v3.1

v3.1 keeps the package-root API and adds the `/time`, `/frames`, `/geodesy`,
`/vocab`, `/kepler`, `/models/earth-epv00`, `/observer`, `/events`, and `/sgp4`
subpaths. It also adds optional full VSOP modules and hardens TLE/OMM parsing.

Intentional corrections in the compatible path include WGS-84 observer height
handling and explicit errors for unsupported or ambiguous observation inputs.
Valid historical input forms remain covered. Review observer snapshots if an
application uses extreme observer heights; the correction near ordinary
surface locations is small.

No structured correction option is silently enabled for compatible calls.
Applications upgrading from v2 should use the separate
[v2.4.1-to-v3.1 migration guide](migration-v2-to-v3.1.en.md), because v2 also
differs in packaging, time handling, precession, distance units, and
topocentric observation semantics.

## Errors and reproducibility

Structured APIs validate finite values, controlled vocabulary, physical
ranges, unknown options, transform paths, and bounded-search limits. Treat
thrown errors as invalid-input or unsupported-model signals rather than
substituting a guessed result.

For reproducible work, record the package version, UTC instant and relevant
time-scale inputs, frame, center, units, model options, observer location,
corrections, and TLE/OMM epoch. Avoid tests based on the current time.

## License

MIT — see [MIT-LICENSE](MIT-LICENSE).
