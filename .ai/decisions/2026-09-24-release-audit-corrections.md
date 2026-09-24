# 2026-09-24 Release audit corrections

## Context

An independent pre-publication audit of `3.1.1` at `daee6c0` found boundary
and cross-API failures that the existing happy-path suites did not exercise.
The release remains unpublished while the findings are corrected and the exact
tarball is revalidated.

Every reported P1/P2 item was reproduced locally. Representative pre-fix
residuals included a 1.59 au `Orb.Kepler`/`Orb.Cartesian` round-trip error, a
2-second `differenceSeconds()` result after adding one second across the 2016
leap boundary, and a 0.67 km lunar range discrepancy caused by subtracting an
au Earth vector from a geocentric-km Moon vector.

## Decisions

- Elliptical legacy elements use `epoch` together with `mean_anomaly` when
  both are present. `time_of_periapsis` is paired with zero anomaly only when
  an epoch/mean-anomaly pair is absent.
- Legacy observer location fields are converted to finite numbers at the API
  boundary. Numeric strings remain accepted and must agree with numeric input.
- The python-sgp4 MIT notice is packaged beside the structured SGP4 code and
  embedded in standalone Rollup bundles.
- A rise/set `transit` is the upper meridian crossing at topocentric hour angle
  zero. It is not the maximum-elevation instant. Satellite-pass
  `culmination` continues to mean maximum elevation within the pass.
- `AstroInstant.addSeconds()` and `differenceSeconds()` share the Unix/
  JavaScript Date timeline and are inverse duration operations.
  `differenceTtSeconds()` explicitly returns the TT coordinate difference.
  ISO leap-second labels such as `23:59:60` remain unrepresentable.
- Structured SGP4 propagation uses that UTC-like elapsed duration, matching
  the reference implementation's Julian-date subtraction rather than TT.
- TLE catalogue validation retains fixed-width/Alpha-5 limits. OMM and
  CelesTrak GP JSON use a separate integer validator that accepts up to nine
  digits. Complete CelesTrak GP JSON element records are recognized even when
  they omit `CCSDS_OMM_VERS` and redundant Earth/TEME/UTC/SGP4 fields.
- Root and maximum refinements throw when `maxIterations` is exhausted before
  `toleranceSeconds` is met. Maximum searches refine next to a sampled endpoint
  and compare the refined candidates with the endpoint itself.
- Crossing intervals are `(from, to]`. Maxima include both endpoints. A
  satellite pass must have duration greater than the search tolerance; a rise
  exactly at `to` does not create a zero-duration pass.
- Coordinate-plane rotation and origin translation are distinguished by center
  metadata. `Luna.xyz()` remains labeled with its compatible coordinate and
  unit strings and adds `center_keywords: 'earth'`; explicitly geocentric
  ecliptic vectors are rotated without subtracting Earth.
- The older `Orb.Cartesian` singular-angle behavior remains documented rather
  than silently changing its conventions in a patch release. New code should
  use structured `stateToElements()` for circular or equatorial states.
- The old Babel/Rollup 2/`rollup-plugin-terser` build chain is replaced by
  Rollup 4 plus direct Terser 5 minification. The supported browser baseline
  natively implements the syntax used by the source, so build-time Babel
  transpilation and its vulnerable dependency tree are not required.

## Follow-up audit decisions

A second independent audit of `7ae86bd` confirmed that the original eleven
direct reproductions were fixed and found three additional composition and
boundary failures. They are handled under the same release-correction scope:

- Coordinate-plane rotations preserve `center`, `center_keywords`, and
  `origin` markers. A geocentric vector therefore remains geocentric across
  an ecliptic/equatorial round trip instead of being translated a second time.
- An exact zero at an interior crossing sample is classified using the nearest
  nonzero samples on both sides. Opposite signs are a crossing; equal signs
  are a tangency and do not split an event interval. The existing `(from, to]`
  endpoint rule remains unchanged.
- Satellite-pass culmination search prefers a 15-second sampling step only
  when it remains larger than the caller's tolerance. Otherwise it retains
  the already validated caller step, so valid public options cannot become
  invalid inside the implementation.
- The English and Japanese time examples define `other` before using the two
  duration methods, and the exact-tarball documentation test executes the same
  relationship.

## Third audit decisions

A third independent audit of `a7d3af5` confirmed the preceding corrections and
found two remaining coordinate-metadata composition gaps plus an older lunar
age boundary error:

- Spherical/rectangular conversions preserve `center`, `center_keywords`, and
  `origin` in both directions. Coordinate-plane conversions may therefore be
  composed with `XYZtoRadec()` and `RadecToXYZ()` without turning an explicitly
  geocentric vector back into an implicit heliocentric vector.
- J2000/of-date ecliptic-to-equatorial conversions and `Precession()` preserve
  the distance unit and origin metadata. `XYZtoRadecOfDate()` passes the full
  spherical metadata into precession. Legacy `Observation` consequently uses
  the same parallax path for equivalent `radec()`, `radecOfDate()`, and direct
  rectangular planet coordinates.
- `Luna.phase(date)` retains its existing new-moon formula but selects the
  computed new moon whose JDE brackets the requested TT instant. It returns
  elapsed days from the most recent computed new moon at or before the request,
  never from a future new moon.
- Regression coverage crosses API boundaries: spherical/rectangular/plane
  round trips, planet coordinate conversion into observation, precession
  metadata, and legacy versus structured lunar age are tested as composed
  operations rather than isolated functions only.

## Fourth audit decisions

A fourth independent audit of `6b19298` confirmed the third-audit corrections
and identified three older composition and numerical-boundary gaps:

- Heliocentric ecliptic translation recognizes explicit `au` and `km` position
  units. The Earth vector, which is produced in au, is scaled to the target
  unit before subtraction. Missing legacy unit metadata retains the historical
  au assumption, while an explicit unsupported unit fails clearly.
- `Orb.Cartesian` clamps the cosine passed to `Math.acos()` to `[-1, 1]`.
  This treats floating-point overshoot at the exact periapsis or apoapsis as a
  numerical boundary, without changing the documented circular/equatorial
  singular-angle convention.
- Legacy `Observation` sends both direct rectangular targets and values
  returned by `xyz(date)` through the same validation, unit handling, and
  ecliptic-to-equatorial conversion path. Wrapping an otherwise identical
  target no longer changes whether it can be observed.
- Regression coverage composes au/km conversion with observation, exercises
  non-singular periapsis and apoapsis element/state round trips, and compares
  direct versus function-returned lunar coordinates.

## Evidence and references

- Transit follows the U.S. Naval Observatory definition of the body's center
  crossing the observer meridian, not merely being approximately highest:
  <https://aa.usno.navy.mil/faq/RST_defs>
- python-sgp4 computes `tsince` from the target and epoch Julian-date parts:
  <https://github.com/brandon-rhodes/python-sgp4/blob/master/sgp4/model.py>
- python-sgp4's MIT notice requires the copyright and permission notice in
  copies or substantial portions:
  <https://github.com/brandon-rhodes/python-sgp4/blob/master/LICENSE>
- CelesTrak documents OMM-derived JSON/CSV, omitted redundant fields, and
  one-to-nine-digit catalogue queries:
  <https://celestrak.org/NORAD/documentation/gp-data-formats.php>

## Validation after the initial audit

Focused regression suites, the full suite, Rollup build, VSOP reproducibility
check, exact-tarball installation, generated-output review, and diff checks
pass locally. A real Chrome engine also loaded the rebuilt UMD and a Rollup
consumer of the structured APIs, exercising Moon, observer/events, and leap
boundary arithmetic successfully. `npm audit` reports zero vulnerabilities
after the build-tool replacement.

Firefox and WebKit execution remain a release-validation gap: Firefox is not
installed on the validation host and the locked macOS session prevented Safari
automation. This is recorded rather than treating the Node `vm` and Chrome
results as cross-engine coverage.

## Validation after the follow-up audit

The second-audit corrections pass the focused regressions, full suite, Rollup
build, deterministic VSOP check, exact-tarball consumers, and diff checks on
Node 24.14.1. No dependencies changed. A fresh `npm audit` registry query was
not authorized for this follow-up, so the earlier zero-vulnerability result is
not represented as a newly fetched result. The real-browser smoke was also not
repeated after these changes; the exact release candidate still needs its
planned browser-engine validation before broader compatibility is claimed.

## Validation after the third audit

The reported Moon conversion chain now preserves both its `0.0025343646 au`
range and geocentric label. Equivalent Venus coordinate APIs produce identical
topocentric elevation to numerical precision, and direct of-date rectangular
coordinates are accepted with their retained au unit. The reported legacy
lunar-age case is `28.8790609` days, within `0.00038` day of the structured
result; all 365 UTC-midnight samples in 2026 remain in `[0, 30)`. The updated
classic-preflight/UMD smoke also passed in a real Chrome engine while composing
the coordinate round trip, planet observation paths, and legacy lunar age; the
page emitted no warning or error logs.

## Validation after the fourth audit

The reported Venus au/km path now agrees to approximately `2.24e-8 km` in
position. Its legacy observation agrees exactly in azimuth and range and to
approximately `1.78e-15` degree in elevation. The reported non-singular
periapsis state produces finite elements and round-trips with approximately
`3.55e-16 au` position residual; the corresponding apoapsis boundary is also
covered. Direct lunar rectangular coordinates and the same coordinates
returned by `xyz(date)` produce identical observation results.

The focused regressions, full suite, Rollup build, deterministic VSOP check,
exact-tarball documentation and consumer tests, and diff checks pass locally.
The expanded classic-preflight/UMD smoke also passed in a real Chrome engine,
including the au/km observation path, lunar `xyz(date)` wrapper, and Cartesian
periapsis boundary. The page emitted no warning or error logs.
