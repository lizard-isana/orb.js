# 2026-09-24 Browser support and AstroInstant naming

## Context

orb.js is intended to run in browsers, but the v3.1 release candidate used the
open-ended Browserslist `defaults` query without shipping runtime polyfills or
running the package in real browser engines. That configuration implied support
for environments such as IE 11 and Opera Mini that the distributed code did not
actually guarantee.

The additive time API was also published briefly as `Instant`. That name is
technically namespaced by the `@lizard-isana/orb/time` module, but it is easily
confused with `Temporal.Instant`. The published `3.1.0` was available for only a
few minutes, has no known users, and has been deprecated on npm.

## Decision

The structured astronomical time class is named `AstroInstant`:

```js
import { AstroInstant } from '@lizard-isana/orb/time';
```

`Instant` is not exported as a compatibility alias. Internal variables and
parameters may continue to use the lower-case general noun `instant`.
`AstroInstant` remains an orb.js class for UTC, UT1, TT, two-part Julian dates,
and immutable time arithmetic; it is not `Temporal.Instant` and does not depend
on the browser Temporal API.

The supported browser baseline is:

- Chrome and Edge 92 or later;
- Firefox 90 or later;
- Safari and iOS Safari 15.4 or later;
- Chrome for Android 92 or later;
- Firefox for Android 90 or later.

orb.js does not ship polyfills. IE 11, EdgeHTML, Opera Mini, KaiOS 2.5, and
older browsers are unsupported. Embedded web views are expected to work when
their JavaScript engine meets the same baseline, but they are not guaranteed
separately.

The classic `dist/orb.js` UMD build exposes only the compatible `window.Orb`
surface. Structured subpaths, including `AstroInstant`, are ES modules and are
supported in browser applications through a package-aware bundler. A native
browser cannot resolve a bare specifier such as `@lizard-isana/orb/time`
without an import map or URL mapping. Direct CDN ESM subpath loading is not
claimed until stable browser entry URLs and real-browser tests are added.

## Consequences

- Source, tests, examples, error messages, and documentation use
  `AstroInstant`; the withdrawn `Instant` spelling is deliberately absent.
- `package.json` uses explicit browser targets instead of `defaults`.
- Browser support documentation distinguishes the supported baseline from the
  environments actually exercised in CI.
- The replacement release candidate is `3.1.1`; changing local package
  metadata does not authorize publication.
- Real Chromium, Firefox, and WebKit execution and stable direct-browser ESM
  entry points remain follow-up release work; the existing Node `vm` UMD smoke
  test is not described as browser-engine verification.
