# orb.js v3.1.1 known limitations and release gaps

Updated: 2026-09-24

This file defines the boundary for the v3.1.1 code freeze. A reproducible case
that violates a documented public contract, changes result validity according
to API composition, or produces an incorrect finite result remains a release
candidate fix. Documented legacy singularities, caller-controlled resolution
limits, and validation work that does not require a code change may remain
pending here.

## Accepted limitations

- Event discovery starts with samples separated by `stepSeconds`. Multiple
  crossings or maxima wholly contained in one coarse interval may not be
  distinguishable from the sampled values. Callers must choose a step shorter
  than the narrowest event feature they need to detect. Refinement tolerance
  controls the precision after a candidate is bracketed; it does not replace
  adequate coarse sampling.
- The legacy `Orb.Cartesian` predates the structured singular-orbit
  conventions. Exactly circular or equatorial inputs can leave angular fields
  as `NaN`; use structured `stateToElements()` for those cases. This remains
  documented compatibility behavior rather than a v3.1.1 rewrite.

## Release-validation gaps

- Execute the release candidate in Firefox and WebKit/Safari before claiming
  cross-engine browser verification. Node, Chrome, and the Codex in-app browser
  results do not substitute for those engines.
- Refresh the npm registry vulnerability query immediately before publication.
  The last recorded `npm audit` result was clean, but it is time-sensitive.
