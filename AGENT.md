# orb.js Agent Notes

This repository is the general-purpose astronomical calculation library used by downstream projects such as `orbgraph`.

## Working Principles

- Keep `orb.js` independent from downstream application behavior.
- Preserve existing synchronous APIs unless there is a strong reason to change them.
- Keep default behavior backward compatible.
- Do not pull optional heavy datasets into the default bundle.
- Rebuild `dist/` with `npm run build` when source files that are part of `src/orb.es6.js` change.

## Browser Support

The supported baseline is Chrome and Edge 92+, Firefox 90+, Safari and iOS
Safari 15.4+, Chrome for Android 92+, and Firefox for Android 90+. Do not imply
support for IE 11, EdgeHTML, Opera Mini, KaiOS 2.5, or older browsers, and do
not add implicit runtime polyfills. Embedded web views are not guaranteed
separately.

`dist/orb.js` is the compatible `window.Orb` UMD surface. Structured subpaths
are ES modules for package-aware bundlers. Do not claim native bare-specifier
or direct-CDN structured ESM support until stable browser entries and
real-browser tests exist.

The structured time class is `AstroInstant`; it is not `Temporal.Instant` and
does not depend on Temporal. Do not reintroduce an exported `Instant` alias.

## VSOP87A Precision API

The default planet position path uses the shortened VSOP87A table in `src/orb-vsop87a.js`.

Full VSOP87A data is optional and loaded per body:

```js
import * as Orb from "@lizard-isana/orb";
import { SATURN_FULL_COEF } from "@lizard-isana/orb/vsop87a/saturn";

Orb.registerVSOP87A("Saturn", SATURN_FULL_COEF);

const saturn = new Orb.Saturn({ vsop87a: "full" });
```

The following helpers are exported from the main module:

- `registerVSOP87A(body, data)`
- `unregisterVSOP87A(body)`
- `hasVSOP87A(body, precision)`
- `resolveVSOP87ACoefficients(body, options)`

Important behavior:

- `new Orb.Saturn()` keeps using the shortened table.
- `new Orb.Saturn({ vsop87a: "full" })` uses a previously registered full table.
- Requesting `{ vsop87a: "full" }` without registration throws a clear error.
- `src/vsop87a/*.js` modules are not imported by `src/orb.es6.js`, so the default bundle should not include full VSOP87A coefficients.

## Full VSOP87A Data Format

Per-body full coefficient modules in `src/vsop87a/` use a grouped and minified format:

```js
[axis, order, [A, B, C, A, B, C, ...]]
```

The evaluator still supports the older nested term format:

```js
[axis, order, A, B, C]
```

Do not reduce numeric precision in the full tables unless the accuracy impact is explicitly tested.

## Modern Observer API

The additive `@lizard-isana/orb/observer` subpath uses `AstroInstant`, radians, and
km. Create a site with `createObserver({ latitude, longitude, height })`, then
call `site.observe(body, instant, options)` with a structured body or a legacy
body adapter.

The third argument is optional. Omitting it uses IAU 2006/2000B frame
transforms and topocentric vector subtraction, but leaves light time, annual
aberration, refraction, and structured metadata off. These effects are
independent opt-ins. Refraction requires explicit pressure in hPa and
temperature in degrees Celsius. Do not change this geometric, airless default
implicitly, and do not change legacy `Observation.azel(date)` defaults.

## Modern Events API

The additive `@lizard-isana/orb/events` subpath builds event searches on
`AstroInstant` and the modern observer API. It provides bounded crossing/maximum
searches, `riseSetTransit()`, lunar elongation/phases/age, and
`satellitePasses()`.

Event defaults follow the observer contract: geometric positions, no
atmospheric refraction, and radians. Rise/set defaults to the body center at a
zero-degree geometric horizon; satellite passes default to the same zero-degree
threshold. Refraction, a nonzero horizon, an upper-limb semidiameter, and a
minimum pass elevation are explicit options. `HORIZON_CONSTANTS` contains
conventional values but never selects one implicitly. Do not combine a
constant that already includes standard refraction or semidiameter with the
corresponding explicit correction a second time.

Satellite pass results are geometric visibility windows only. They explicitly
leave optical visibility and sunlight uncomputed.

## Structured SGP4 API

The additive `@lizard-isana/orb/sgp4` subpath provides pure TLE/OMM parsing,
opt-in checksum validation, and `createSatellite()`. Structured satellite
states accept `AstroInstant` and return TEME/Earth vectors in km and km/s, ready for
the frame graph, observer, and events modules. `geodetic(instant)` uses the
common TEME-to-ECEF transform and WGS-84 conversion.

Keep the model boundary explicit: TLE/OMM values are SGP4 mean elements, B* is
the SGP4 drag term rather than a physical ballistic coefficient, propagation
uses WGS-72 constants, and geodesy uses WGS-84. TLE checksums are not enforced
unless requested, but malformed fixed fields and mismatched object numbers
must fail. Preserve `Orb.SGP4` and `Orb.Satellite` behavior separately from the
structured subpath.

## Related Notes

- `.ai/decisions/2026-04-27-full-vsop87a-api.md`
- `.ai/decisions/2026-09-24-browser-support-and-astro-instant.md`
- `.ai/plans/2026-09-22-v3.1-implementation-plan-revised.md`
