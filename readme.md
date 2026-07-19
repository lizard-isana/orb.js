# orb.js (v3) — JavaScript library for astronomical calculations

[![CI](https://github.com/lizard-isana/orb.js/actions/workflows/ci.yml/badge.svg)](https://github.com/lizard-isana/orb.js/actions/workflows/ci.yml)

Positions of the Sun, Moon and planets (VSOP87A), Keplerian orbits,
Earth-orbiting satellites (SGP4/TLE), and azimuth/elevation for an observer.
Written in ES2015, bundled to UMD, no runtime dependencies.

```js
const Orb = require('orb.js');
const date = new Date();

new Orb.Sun().radec(date);   // apparent RA/Dec of the Sun
new Orb.Luna().radec(date);  // apparent RA/Dec of the Moon
new Orb.Mars().radec(date);  // apparent RA/Dec of a planet

const iss = new Orb.SGP4({
  first_line:  '1 25544U 98067A   20014.52632156  .00016717  00000-0  10270-3 0  9015',
  second_line: '2 25544  51.6423  33.7380 0004871 130.9389 229.2183 15.49556564  8038'
});
iss.latlng(date);            // sub-satellite point

new Orb.Observation({
  observer: { latitude: 35.658, longitude: 139.741, altitude: 0 },
  target: new Orb.Luna()
}).azel(date);               // azimuth / elevation
```

## Documentation

- [Usage (English)](usage.en.md)
- [使い方(日本語)](usage.ja.md)

## Build & Test

```
npm install
npm run build   # bundles src/ into dist/ (UMD + minified)
npm test        # smoke tests against known ephemeris values
```

`dist/` is committed; CI verifies it is in sync with `src/`.

## License

Copyright (c) 2012-2026 Isana Kashiwai
Licensed under the [MIT license](/MIT-LICENSE).

## Administrator

Isana Kashiwai
email: isana.k at gmail.com
