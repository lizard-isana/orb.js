# 2026-09-25 post-release branch cleanup

This cleanup followed the stable 3.1.1 npm and GitHub release. It changed no
runtime source, package artifact, release tag, or published dist-tag.

## Removed branches

The following remote branches were removed after confirming that they were
merged, superseded, or no longer relevant to the current dependency tree:

- `codex/evaluate-v3` — its review plan was superseded by the completed v3.1
  plan, audit records, and implementation; PR #32 was closed.
- `claude/alpha5-catalog-numbers` — no commits remained unique relative to the
  stable line.
- `claude/astronomy-library-review-dltebn` — no commits remained unique
  relative to the stable line.
- `chore/orbgraph-merge-stage1` — no commits remained unique relative to the
  stable line.
- `dev` — the old v2 development line had only an obsolete `.gitignore`
  difference; future v2 emergency work should branch from `v2` explicitly.
- `dependabot/npm_and_yarn/json5-2.2.3`
- `dependabot/npm_and_yarn/decode-uri-component-0.2.2`
- `dependabot/npm_and_yarn/copy-props-2.0.5`

The Dependabot branches and PRs #27–29 targeted the 2022–2023 dependency tree.
None of `json5`, `decode-uri-component`, or `copy-props` exists in the current
3.1.1 installation tree, so the PRs were closed rather than rebased.

Corresponding merged local topic branches were removed where they existed.

## Archived prototype

`v4-planning` contained substantial experimental implementation and design
material, but it was abandoned as a direct v4 release candidate. Its commit
`6646e23` is preserved unchanged under `archive/v4-prototype`, and the old
branch name was removed. The archive is reference-only and is not an active
release or integration line.

## Remaining branches

- `master` — stable published line
- `v3` — active v3 maintenance line
- `v2` — frozen v2 maintenance base
- `v1` — historical branch, left unchanged because it was outside this cleanup
- `archive/v4-prototype` — reference-only abandoned prototype

PR #31 (`patch-1`) was also outside the requested cleanup and remains open for
separate review.
