# .ai Notes

This directory stores development notes and decisions for `orb.js`.

## Contents

- `decisions/`
  One topic per file for important implementation or API decisions.
- `plans/`
  Ordered implementation plans with scope, verification gates, and release
  criteria.

Current release-related decisions:

- `decisions/2026-04-27-full-vsop87a-api.md`
- `decisions/2026-09-22-npm-package-and-release-lines.md`
- `decisions/2026-09-22-separate-educational-materials.md`
- `decisions/2026-09-24-v2-v3-branch-roles.md`
- `decisions/2026-09-25-v3-parallel-maintenance.md`

Current implementation plans:

- `plans/2026-09-22-v3.1-implementation-plan-revised.md` (current)
- `plans/2026-09-22-v3.1-implementation-plan.md` (superseded initial draft)

Current freeze and release tracking:

- `known-issues.md` (accepted limitations and open release-validation gaps)
- `reviews/2026-09-24-code-freeze-audit.md` (audit of implementation `112959b`)

## Guidelines

- Keep stable contributor guidance in `AGENT.md`.
- Keep implementation rationale and temporary context in `.ai/`.
- Include commit hashes when a note refers to a concrete change.
- Do not store credentials, tokens, or environment-specific secrets here.
