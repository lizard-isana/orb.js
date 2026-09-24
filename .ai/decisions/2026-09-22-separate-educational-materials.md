# 2026-09-22 Separate educational materials from orb.js

## Context

The branch then named `v4-planning`, now archived as `archive/v4-prototype`,
experimented with treating the library source as a textbook. Source-region
markers, synchronized guide excerpts, annotated-source generation, long-form
teaching comments, and educational CI made the runtime repository and its
implementation changes substantially more complicated.

The library and educational materials also have different release cycles. A
runtime refactor should not require broad teaching-document rewrites, and a
course revision should not constrain the package architecture.

## Decision

Keep educational materials completely separate from the orb.js repository and
the v3.1 release plan.

orb.js retains only documentation needed to use, maintain, audit, and verify
the calculation library:

- concise algorithm and implementation comments
- formula and primary-source references
- units, frames, time scales, validity ranges, and accuracy notes
- numerical-stability explanations
- API reference and ordinary usage examples
- reference fixtures, property tests, benchmarks, and data-generation tools

The following belong in an independent educational project:

- chapter-based lessons and exercises
- reduced or staged teaching implementations
- source-excerpt synchronization
- `edu:*` source markers
- annotated-source generation
- browser teaching demonstrations
- educational assets and educational CI

The educational project consumes a pinned published version of
`@lizard-isana/orb` and records the corresponding source commit when it needs
to discuss a specific implementation.

## Consequences

- v3.1 does not port `tools/snippets.js`, `tools/annotate.js`, `docs/guide/`, or
  the `//#region edu:*` convention from `archive/v4-prototype`.
- Engineering tools such as the VSOP compiler and benchmark remain in orb.js;
  they protect reproducibility and performance rather than teaching content.
- Source comments stay technical and self-contained, but are not required to
  form a curriculum or synchronize with external prose.
