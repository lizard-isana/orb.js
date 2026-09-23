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

## Follow-up validation

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
