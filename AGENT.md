# orb.js Agent Notes

This repository is the general-purpose astronomical calculation library used by downstream projects such as `orbgraph`.

## Working Principles

- Keep `orb.js` independent from downstream application behavior.
- Preserve existing synchronous APIs unless there is a strong reason to change them.
- Keep default behavior backward compatible.
- Do not pull optional heavy datasets into the default bundle.
- Rebuild `dist/` with `npm run build` when source files that are part of `src/orb.es6.js` change.

## VSOP87A Precision API

The default planet position path uses the shortened VSOP87A table in `src/orb-vsop87a.js`.

Full VSOP87A data is optional and loaded per body:

```js
import * as Orb from "orb.js";
import { SATURN_FULL_COEF } from "orb.js/vsop87a/saturn";

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

## Related Notes

- `.ai/decisions/2026-04-27-full-vsop87a-api.md`
