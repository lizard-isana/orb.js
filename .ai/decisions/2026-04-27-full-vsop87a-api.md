# 2026-04-27 Optional full VSOP87A API

Related commit: `1d834be feat: add optional full VSOP87A coefficients`

## Context

`orb.js` previously used a shortened VSOP87A coefficient table from `src/orb-vsop87a.js`.
Full VSOP87A JSON data was added under `src/data/vsop87a/`, but loading all full data is about 2 MB and is too heavy for the default path.

Downstream use cases such as planetary flyby visualization may need higher precision for a single planet, for example Saturn during the Voyager 2 flyby. The library should support this without becoming coupled to any downstream preset format.

## Decision

Add a general registration-based API for optional full VSOP87A data.

The default path remains unchanged:

```js
const saturn = new Orb.Saturn();
```

Full precision is explicit:

```js
import { SATURN_FULL_COEF } from "orb.js/vsop87a/saturn";

Orb.registerVSOP87A("Saturn", SATURN_FULL_COEF);

const saturn = new Orb.Saturn({ vsop87a: "full" });
```

## API

The main module exports:

- `registerVSOP87A(body, data)`
- `unregisterVSOP87A(body)`
- `hasVSOP87A(body, precision = "full")`
- `resolveVSOP87ACoefficients(body, options = {})`

Supported body aliases include full names and VSOP file prefixes such as `saturn` / `sat`.

If a caller requests `{ vsop87a: "full" }` without registering full data for that body, the constructor throws instead of silently falling back to shortened data.

## Data Loading Model

`orb.js` does not implicitly fetch or dynamically import full data from planet constructors.
Consumers choose the loading strategy:

- static import, when a body should always be loaded by the application
- dynamic import, when a downstream application wants preset or settings driven loading

Example dynamic import:

```js
const module = await import("orb.js/vsop87a/saturn");
Orb.registerVSOP87A("Saturn", module.SATURN_FULL_COEF);
```

## Data Format

Per-body modules in `src/vsop87a/` use grouped and minified coefficient data:

```js
[axis, order, [A, B, C, A, B, C, ...]]
```

This avoids repeating `axis` and `order` for every term.

The evaluator also supports the historical nested term format:

```js
[axis, order, A, B, C]
```

The grouped format reduced the generated per-body full data from about 2.02 MB to about 1.51 MB before transport compression.

## Validation Notes

Validated during implementation:

- `npm run build`
- `node --check` for the changed source files and all `src/vsop87a/*.js`
- registering Saturn full data and constructing `new Orb.Saturn({ vsop87a: "full" })`
- confirming unregistered full precision throws
- confirming grouped Saturn data matches the original nested full JSON at tested dates with `0 km` delta

## Non-Decisions

- Do not add `"type": "module"` yet; Node warns when importing source files directly, but changing package module type may affect compatibility.
- Do not apply additional numeric string shortening such as forcing `1e-4` notation; keep numeric precision and formatting conservative.
- Do not make `xyz()` asynchronous.
