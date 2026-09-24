# v3.1.1 code-freeze audit

Date: 2026-09-24
Audited implementation: `112959b` (`fix: find local maxima near search boundaries`)
Runtime: Node 24.14.1

## Disposition

No additional defect requiring an implementation change before code freeze
was reproduced in this audit. The previous `findLocalMaxima()` boundary
finding is resolved. The remaining documented numerical/representation limits
and release-validation gaps are tracked with stable identifiers in
[`../known-issues.md`](../known-issues.md).

This supports freezing the implementation while completing the outstanding
release checks. It is not a claim that every input, browser, or physical model
has been independently validated.

## Verification

- Reviewed the change from `cd7cc41`, the public search contract, the existing
  regression coverage, and the code-freeze policy. Equal-sample runs are now
  classified as complete runs before refinement, and boundary candidates must
  improve on the endpoint to count as an interior maximum.
- `npm test` passed: legacy numerical/property tests; structured time, frames,
  geodesy, Kepler, EPV00, observer, event, and SGP4 suites; deterministic VSOP
  source verification; exact-tarball consumers; and documentation examples.
- Built an isolated `git archive` of the audited commit with the installed
  build dependencies. `npm run build` succeeded and `diff -qr` found no
  differences from the committed `dist/` directory.
- Swept 199 interior peak positions from 0.05 to 9.95 seconds for each of
  four sampling steps (0.25, 0.5, 1, and 2 seconds), over a ten-second interval.
  All 796 single-peak cases returned exactly one result. The maximum timing
  error was 0.00015625 second at a requested tolerance of 0.001 second.
- Increasing, decreasing, constant, and two monotonic shoulder functions
  returned no local maxima. Ten linear crossing cases retained their timing
  and direction. The coarse/fine two-peak comparison records the remaining
  sampling limit as KI-001.
- 120 built-in geocentric coordinate-composition cases across 1900, 2000,
  2026, and 2100 retained Earth-center metadata. The maximum relative position
  residual was approximately 2.54e-16.
- 24 near-Earth/deep-space SGP4 cases agreed between TLE and converted OMM
  input; out-of-order calls agreed with freshly initialized satellites.
- 144 observer combinations across those years, equatorial/Tokyo/near-polar
  sites, Sun/Moon/Mars, and optional light time, aberration, refraction, and
  metadata completed with finite results. This is a composition/robustness
  check, not an additional independent accuracy reference.
- Both standalone compatibility bundles parsed as ECMAScript 5 using Acorn.
- Direct checks confirmed the documented legacy equatorial singularity, the
  rejection of an ISO leap-second label, and the difference between EPV00's
  declared validity and its ability to return finite extrapolated output.

The ad hoc audit probes ran without adding or changing implementation tests.
The starting worktree was clean. This audit changes only development notes;
no implementation, dependency, generated bundle, or public API was modified.

## Remaining checks and future improvements

- RV-001: real Firefox and WebKit/Safari verification remains outstanding.
  Earlier browser results in the correction log were not rerun in this audit.
- RV-002: no fresh npm vulnerability query was performed. The earlier clean
  result must not be represented as a current registry result.
- Remote CI status and Node 18/20/22 execution were not independently checked
  in this audit; the local run used Node 24.14.1.
- Freeze the source/dependency inputs, then bind publication checks to the
  actual final tarball. Historical release notes describe earlier artifacts;
  their hashes or registry observations do not identify this candidate.
- After freeze, maintain step-size/peak-position sweeps and whole API
  composition coverage. Expanding browser CI and automation of the additional
  audit probes is useful follow-up work, not a discovered runtime blocker.
