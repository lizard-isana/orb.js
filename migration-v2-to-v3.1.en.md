# Migrating from orb.js v2 to v3.1

This guide is for applications moving from the latest v2 release, `v2.4.1`,
to `@lizard-isana/orb` v3.1. Earlier v2 releases may have additional
differences.

Applications that postpone migration should pin the immutable
[`v2.4.1` tag](https://github.com/lizard-isana/orb.js/tree/v2.4.1) and use the
frozen [`v2` branch](https://github.com/lizard-isana/orb.js/tree/v2) for v2
documentation. The v2 runtime is no longer under routine development.

v3.1 deliberately keeps the familiar synchronous `Orb.*` API while correcting
several numerical and semantic problems. It also adds an optional structured
API with explicit frames, centers, units, and time scales. You do not need to
rewrite an application around the structured API in order to upgrade.

## Recommended migration sequence

1. Change how the library is loaded, but keep existing `Orb.*` calls.
2. Run application-level numerical tests and review the intentional changes
   below.
3. Adopt structured subpath APIs only where explicit metadata, modern frame
   transforms, event searches, or stricter validation are useful.

Keeping these steps separate makes packaging failures distinguishable from
astronomical changes.

## 1. Change the distribution

The npm package name is now scoped:

```sh
npm install @lizard-isana/orb
```

```js
// v2
const Orb = require('orb.js');

// v3.1, CommonJS
const Orb = require('@lizard-isana/orb');

// v3.1, ES module
import * as Orb from '@lizard-isana/orb';
```

For a browser, use the complete UMD build. It still creates `window.Orb`:

```html
<!-- v2.4.1, frozen -->
<script src="https://cdn.jsdelivr.net/gh/lizard-isana/orb.js@v2.4.1/build/orb.v2.js"></script>

<!-- v3.1 -->
<script src="https://unpkg.com/@lizard-isana/orb@3.1.1/dist/orb.js"></script>
```

The published file is `dist/orb.js`. A CDN URL should therefore include the
package name, version, and `/dist/orb.js`; pin the version in production.

The supported browser baseline is Chrome and Edge 92+, Firefox 90+, Safari and
iOS Safari 15.4+, Chrome for Android 92+, and Firefox for Android 90+. The UMD
build does not include polyfills or the structured subpath APIs.

The old component files map to the following entry points:

| v2 file | v3.1 replacement |
|---|---|
| `orb.v2.js` | package root or `dist/orb.js` |
| `orb-core.v2.js` | package root; structured helpers are also under `/time`, `/frames`, `/geodesy`, and `/vocab` |
| `orb-planetary.v2.js` | package root; full VSOP coefficient files are optional subpath imports |
| `orb-satellite.v2.js` | package root or `/sgp4` |
| `orb-data-loader.v2.js` | no replacement; use `fetch`, dynamic `import()`, or the host platform's loader |
| `orb-date-handler.v2.js` | no replacement; use `Date` or `/time`'s `AstroInstant` |

Do not combine v2 component files with a v3.1 build.

## 2. Keep the legacy API, then review results

The main constructors and helpers remain available at the package root:

`Sun`, `Luna`/`Moon`, the planet constructors, `Kepler`, `SGP4`/`Satellite`,
`Observation`, `Observer`, `Time`, `Nutation`, `Obliquity`, coordinate
conversion helpers, and the legacy constants.

A typical v2 call can therefore keep its shape:

```js
const Orb = require('@lizard-isana/orb');
const date = new Date('2026-07-18T12:00:00Z');

const mars = new Orb.Mars().radec(date);
const moon = new Orb.Observation({
  observer: { latitude: 35.658, longitude: 139.741, altitude: 0.025 },
  target: new Orb.Luna()
}).azel(date);
```

The following changes are intentional. Update snapshots and tolerances only
after confirming that your application expects the new semantics.

| Area | v2 behavior | v3.1 behavior |
|---|---|---|
| Ephemeris time | several series effectively used UTC | ephemeris series use TT internally |
| Planet and Kepler RA/Dec | precession handling left results near J2000 | results are consistently referred to the equinox of date |
| Planet `xyz()` labels | frame epoch was not explicit | `coordinate_keywords` includes `j2000` |
| Sun RA/Dec distance | numerical value was in km while the unit label said au | value and label are both au |
| Observer Earth figure | WGS-72-like observer geometry | WGS-84 observer geometry |
| Nearby-object observation | the RA/Dec path did not apply full topocentric parallax | known-distance targets are topocentric and distances are normalized to km |
| Day of year | could be a string and could inherit local-time quirks | `Time.doy()` is a UTC number |
| Sidereal method name | `gmst()` returned apparent sidereal time despite its name | `gmst()` remains a deprecated alias of `gast()`; use `gmst82()` for IAU 1982 mean sidereal time |

At 2026-07-18T12:00:00Z, for example, accumulated precession moves the Mars
legacy RA/Dec result by about 0.40 degrees relative to v2.4.1. A Tokyo Moon
observation can move by about one degree in elevation because v3.1 applies
diurnal parallax. These figures illustrate the scale of the corrections; they
are not error bounds or compatibility guarantees.

### Inputs rejected instead of guessed

v3.1 throws explicit errors for unsupported or ambiguous legacy observation
coordinates and units. If an old application constructed coordinate objects by
hand, make their coordinate type and units unambiguous, or pass a supported
`Orb.*` target object. Do not catch and ignore these errors: they normally
indicate that v2 had been silently making an unsafe assumption.

### Removed v2 globals

`Orb.NutationAndObliquity` is not exported. Use the separate `Orb.Nutation`,
`Orb.Obliquity`, and `Orb.MeanObliquity` functions. The v2 metadata globals
`Orb.VERSION`, `Orb.AUTHOR`, and `Orb.LICENSE` are replaced by package metadata
and the included `MIT-LICENSE`. Internal `Orb.Terms` data is not public in
v3.1.

## 3. Optionally adopt structured APIs

Structured APIs are additive ES-module subpaths. They use `AstroInstant`, radians,
kilometers, kilometers per second, and explicit state metadata rather than the
legacy API's mixed astronomy conventions.

```js
import { AstroInstant } from '@lizard-isana/orb/time';
import { createObserver } from '@lizard-isana/orb/observer';
import { sunEpv00 } from '@lizard-isana/orb/models/earth-epv00';

const instant = AstroInstant.fromISO('2026-07-18T12:00:00Z');
const tokyo = createObserver({
  latitude: 35.658 * Math.PI / 180,
  longitude: 139.741 * Math.PI / 180,
  height: 0.025
});

const observed = tokyo.observe(sunEpv00, instant);
// azimuth/elevation/rightAscension/declination: radians
// range/geocentricDistance: kilometers
```

Omitting the third argument to `observe` is deliberate: it selects IAU
2006/2000B frame transforms and a geometric, topocentric result with no light
time, annual aberration, or atmospheric refraction. Corrections are explicit:

```js
const apparent = tokyo.observe(sunEpv00, instant, {
  lightTime: true,
  aberration: true,
  refraction: { pressure: 1010, temperature: 10 },
  meta: true
});
```

The metadata reports models, corrections, accuracy supplied by the body model,
and ignored effects. Diurnal aberration, gravitational deflection, and polar
motion are not implemented.

### Structured SGP4

```js
import { AstroInstant } from '@lizard-isana/orb/time';
import { createSatellite } from '@lizard-isana/orb/sgp4';

const satellite = createSatellite({
  line1: '1 25544U 98067A   20014.52632156  .00016717  00000-0  10270-3 0  9015',
  line2: '2 25544  51.6423  33.7380 0004871 130.9389 229.2183 15.49556564  8038'
});
const state = satellite.state(AstroInstant.fromISO('2020-01-14T12:37:54Z'));
// TEME, Earth-centered, km and km/s
```

SGP4 propagation uses WGS-72 gravity constants because TLE mean elements are
fitted for that model. Geodetic output uses WGS-84. `B*` is the SGP4 drag term,
not a physical ballistic coefficient. TLE checksum validation is opt-in with
`{ validateChecksum: true }`. Accuracy normally degrades with TLE age, so do
not describe an SGP4 state as an osculating state or attach a universal
prediction interval to it.

## Migration test checklist

- Pin v2.4.1 and v3.1 in separate test environments.
- Compare fixed UTC instants, not `new Date()` at test time.
- Test values near your actual dates and observer locations.
- Record units, frame, center, and equinox next to every saved reference.
- Review Sun distance, planet/Kepler RA/Dec, Moon horizontal coordinates, and
  any code that calls `Time.doy()` or `Time.gmst()`.
- Revalidate alert thresholds and rise/set assumptions instead of merely
  replacing snapshots.
- For satellites, use the same TLE/OMM and propagation instant; keep TLE epoch
  age visible in downstream results.
- If adopting structured observation, decide explicitly whether light time,
  annual aberration, and refraction belong in each product.

See [Usage (English)](usage.en.md) for the complete v3.1 surface. A shorter
v3.0-to-v3.1 note is included there for applications already on v3.0.
