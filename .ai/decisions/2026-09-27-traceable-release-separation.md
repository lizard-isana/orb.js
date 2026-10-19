# Traceable experiment release separation

Status: accepted

Decision date: 2026-09-27

## Context

The semantic traceability architecture was initially written as a proposed
orb.js 3.2 feature. Its public contract, maintenance cost, runtime impact, and
usefulness to documentation and AI consumers have not yet been validated by a
working observer PoC. Assigning it to 3.2 would make a release promise before
those questions are answered.

The 3.2 release plan is being considered separately and may include detailed
documentation and backward-compatible corrections discovered while producing
that documentation.

## Decision

- Semantic traceability has no assigned orb.js release version.
- Traceability research and implementation use a dedicated experiment branch,
  separate from the thread and branch that own 3.2 planning.
- Experimental artifacts use `orb-trace/0` and make no stable schema or public
  package-export promise.
- Documentation describes traceability as an experiment, not as planned 3.2
  functionality.
- After consumer validation, the architecture review decides whether a stable
  form can be added compatibly to a later v3 minor, belongs in a v4 design, or
  should not be productized.

No branch is created by this decision. Branch creation belongs to the thread
that begins the corresponding implementation work.

## Consequences

The traceability architecture keeps its observer-first PoC, semantic-schema,
parity, size, and maintenance gates. Only its release assignment changes.
General 3.2 maintenance and documentation planning remain separate and are not
defined by the traceability plan.
