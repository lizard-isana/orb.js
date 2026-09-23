# orb.js v3.1

[![CI](https://github.com/lizard-isana/orb.js/actions/workflows/ci.yml/badge.svg)](https://github.com/lizard-isana/orb.js/actions/workflows/ci.yml)

Astronomical calculations for JavaScript: Sun, Moon and planet positions,
Keplerian propagation, SGP4/TLE and OMM satellites, observer coordinates, and
event searches. orb.js has no runtime dependencies and provides CommonJS, ES
module, and browser UMD builds.

```sh
npm install @lizard-isana/orb
```

## Choose an API surface

The package has two complementary API surfaces:

- The package root preserves the synchronous `Orb.*` API used by orb.js v2 and
  v3.0. It accepts JavaScript `Date` values and traditional astronomy units.
- ES-module subpaths provide explicit time scales, frames, centers, units,
  state vectors, observation options, and provenance metadata.

Existing applications can upgrade through the compatible package-root API and
adopt structured subpaths incrementally.

### Compatible package-root API

```js
const Orb = require('@lizard-isana/orb');
const date = new Date('2026-07-18T12:00:00Z');

const mars = new Orb.Mars().radec(date);
const moon = new Orb.Observation({
  observer: { latitude: 35.658, longitude: 139.741, altitude: 0.025 },
  target: new Orb.Luna()
}).azel(date);
```

The root is also available as an ES module:

```js
import * as Orb from '@lizard-isana/orb';
```

### Structured API

```js
import { Instant } from '@lizard-isana/orb/time';
import { createObserver } from '@lizard-isana/orb/observer';
import { sunEpv00 } from '@lizard-isana/orb/models/earth-epv00';

const instant = Instant.fromISO('2026-07-18T12:00:00Z');
const tokyo = createObserver({
  latitude: 35.658 * Math.PI / 180,
  longitude: 139.741 * Math.PI / 180,
  height: 0.025
});

const sun = tokyo.observe(sunEpv00, instant);
// angles: radians; range: kilometers
```

Omitting the third argument to `observe` selects IAU 2006/2000B coordinate
transforms and returns a geometric, topocentric observation. Light time, annual
aberration, and atmospheric refraction are enabled only when explicitly
requested.

## Browser

`dist/orb.js` is the complete UMD build and exposes `window.Orb`:

```html
<script src="https://unpkg.com/@lizard-isana/orb@3.1.0/dist/orb.js"></script>
<script>
  const moon = new Orb.Luna().radec(new Date());
</script>
```

Pin an exact version in production. Optional full VSOP87A coefficient modules
are intentionally kept out of the default UMD bundle.

## Documentation

- [Usage (English)](usage.en.md)
- [使い方（日本語）](usage.ja.md)
- [Migrating from v2.4.1 to v3.1](migration-v2-to-v3.1.en.md)
- [v2.4.1 から v3.1 への移行](migration-v2-to-v3.1.ja.md)

The usage guides cover the compatible and structured APIs, models, units,
frames, accuracy, ignored effects, optional VSOP data, events, and SGP4
semantics.

## Development

```sh
npm install
npm test
npm run build
npm run vsop:check
```

`dist/` is committed; CI verifies that it remains synchronized with `src/`.
Node.js 18 or later is required for package consumers.

## License

Copyright (c) 2012-2026 Isana Kashiwai. Licensed under the
[MIT License](MIT-LICENSE).
