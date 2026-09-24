# orb.js v3.1.1 known limitations and release gaps

Updated: 2026-09-24

This file defines the boundary for the v3.1.1 code freeze. A reproducible case
that violates a documented public contract, changes result validity according
to API composition, or produces an incorrect finite result remains a release
candidate fix. Documented legacy singularities, caller-controlled resolution
limits, and validation work that does not require a code change may remain
pending here.

## Accepted limitations

### KI-001: Coarse event sampling can leave nearby events unresolved

Event discovery starts with samples separated by `stepSeconds`. Multiple
crossings or maxima wholly contained in one coarse interval, or distinct peaks
whose intervening dip is absent from the samples, may be indistinguishable.
Adjacent equal samples can therefore represent either one flat peak or several
unresolved peaks. Refinement tolerance controls precision after a candidate is
bracketed; it does not replace adequate coarse sampling.

Reproduced on `112959b`: over `[0, 10]` seconds,
`f(t) = max(-(t - 1.5)^2, -(t - 3.5)^2)` with `toleranceSeconds: 0.001`
returns one maximum with `stepSeconds: 1`, and both maxima at 1.5 and 3.5
seconds with `stepSeconds: 0.25`.

Workaround: choose a step shorter than the narrowest feature of interest and
repeat with a smaller step to check event-count and timing stability. A finite
sampling grid does not guarantee discovery of every extremum of an arbitrary
function. This is the documented discovery-resolution limit, not the resolved
end-adjacent maximum omission.

### KI-002: Legacy Cartesian singular-orbit angles

The legacy `Orb.Cartesian` predates the structured singular-orbit conventions.
Exactly circular or equatorial inputs can leave angular fields as `NaN`.
On `112959b`, an equatorial orbit with eccentricity 0.2 reproduces a `NaN`
`argument_of_periapsis`; structured circular/equatorial conversion returns
finite angles using its documented conventions.

Workaround: use structured `stateToElements()` and `elementsToState()` for
these cases. This remains documented compatibility behavior rather than a
v3.1.1 rewrite. The corrected non-singular periapsis/apoapsis round trips are
not covered by this exception.

### KI-003: UTC leap-second labels are not representable

`AstroInstant` follows the JavaScript Date/Unix timeline for `addSeconds()` and
`differenceSeconds()`. `2016-12-31T23:59:60Z` is rejected rather than represented
as a separate UTC instant. `differenceTtSeconds()` reports TT coordinate
differences, including the leap-offset step; it does not add support for the
missing ISO label.

Workaround: retain leap-second labels separately when ingesting a source that
uses them. Use a time representation supporting those labels if that is a
requirement; do not silently replace `:60` with `:59`. The existing duration
methods and their documented semantics remain unchanged.

### KI-004: Finite ephemeris output does not extend model validity

The optional EPV00 model declares 1900–2100 validity in its provenance and in
the usage guide. Evaluation outside that interval is not rejected: a 2200
input produces finite coordinates on `112959b`, without extending the stated
accuracy envelope.

Workaround: check the model's declared validity for accuracy-sensitive uses,
and choose a model/reference appropriate to dates outside it. Do not interpret
absence of an exception as a precision guarantee. This is a documented model
boundary, not a newly measured accuracy defect.

## Release-validation gaps

- **RV-001 — Browser engines:** Execute the release candidate in Firefox and WebKit/Safari before claiming
  cross-engine browser verification. Node, Chrome, and the Codex in-app browser
  results do not substitute for those engines.
- **RV-002 — Dependency advisories:** Refresh the npm registry vulnerability query immediately before publication.
  The last recorded `npm audit` result was clean, but it is time-sensitive.

These are publication-validation tasks, not reasons to keep changing the
implementation during code freeze. They remain open; the current audit did
not execute browsers or issue a fresh registry query.

## Latest audit disposition

The audit of `112959b` found no additional code-freeze-blocking defect in the
verified scope. The former local-maximum boundary omission is resolved and is
not deferred as a known issue. See
[`2026-09-24-code-freeze-audit.md`](reviews/2026-09-24-code-freeze-audit.md)
for verification evidence, scope, and exclusions. Reassess this disposition if
implementation, dependencies, or packaging change.
