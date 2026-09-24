# 2026-09-24 Browser compatibility preflight

## Context

orb.js declares a modern browser baseline and does not include polyfills. A
missing built-in API in an older browser or embedded web view can otherwise
stop application initialization before the application can explain that the
runtime is unsupported.

An API exposed only by the main orb.js bundle cannot fully solve this problem.
The browser must parse the bundle and complete its top-level initialization
before `Orb.checkCompatibility()` becomes callable. The main UMD bundle uses
modern syntax and initializes facilities such as `Map`, so some unsupported
runtimes can fail before reaching an in-bundle check.

## Decision

Provide one feature-detection implementation through three entry points:

- `dist/orb-compat.js` and `dist/orb-compat.min.js` are generated classic
  scripts that expose `window.OrbCompatibility.checkCompatibility()` and can
  run before the main UMD bundle.
- The compatible package root exposes `Orb.checkCompatibility()` for
  diagnostics after a successful load.
- `@lizard-isana/orb/compatibility` exports `checkCompatibility()` and
  `BROWSER_BASELINE` for package consumers.

The preflight uses feature detection rather than user-agent parsing. It checks
the boundary built-ins actually used by the package, including collections,
typed arrays, number predicates, hyperbolic and vector math helpers, object
enumeration/freezing, recent array helpers, string padding, and ISO date
formatting. A check verifies basic behavior where practical instead of only
testing property presence.

The function does not throw for an absent or broken checked feature. It returns
a report with:

- `supported`: whether every runtime check passed;
- `baseline`: the documented browser baseline;
- `scope: 'runtime-builtins'`;
- `syntaxChecked: false`;
- `checked`, `missing`, and `failed` feature-name arrays;
- a short English `message` suitable for logs, while applications remain free
  to present localized UI.

An optional environment object is accepted for testing another realm and for
deterministic failure tests. Normal callers omit it.

## Boundaries

- The preflight does not install polyfills or mutate globals.
- It does not log, display UI, or throw merely because a feature is missing;
  the host application decides how to warn or stop.
- It does not claim to test JavaScript syntax support. Runtime compilation via
  `eval` or `new Function` would conflict with common Content Security Policy
  settings and could misclassify a CSP restriction as browser incompatibility.
- Browser-version declarations and real Chromium, Firefox, and WebKit tests
  remain responsible for syntax and complete-engine validation.
- The classic preflight is the only entry intended to run before loading the
  main UMD bundle. A package-aware bundler may transform the ESM subpath
  according to the application's own browser target.

## Verification

The standalone bundle is generated from the same source as the package-root
and ESM APIs. Tests verify successful current-runtime reports, absent and
operationally broken built-ins, classic-script syntax, browser-global loading,
package exports, exact-tarball contents, and both CommonJS and ESM consumers.
The manual browser fixture also passed in Chrome: it ran the classic preflight
first, conditionally loaded the main UMD bundle, invoked the root compatibility
API, and completed a lunar-coordinate calculation without warnings or errors.
