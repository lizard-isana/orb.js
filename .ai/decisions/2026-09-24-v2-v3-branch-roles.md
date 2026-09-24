# 2026-09-24 v2/v3 branch roles and stable `master`

## Context

The v3.1.1 runtime is code-frozen on the `v3` branch. The repository's current
default branch is `master`, and its tip is also the existing `v2.4.1` tag. The
v2 line must remain available when the public branch moves to v3, but creating
a new `main` branch would add naming churn without improving the release
model.

The v2 and v3 histories diverged after a common ancestor. A normal content
merge from the old `master` into v3 would therefore risk reintroducing v2 files
or changes that are not part of the verified v3.1.1 artifact.

## Decision

### `master`: published stable line

- Keep `master` as the GitHub default branch.
- Advance it only to a release that has passed the package, installation, CDN,
  and browser verification gates.
- At each release point, its source tree must match the tagged and published
  artifact. It does not carry unreleased feature work.
- When v3.1.1 is promoted, preserve the old `master` tip under `v2` first, then
  connect or advance `master` to the verified v3 tree without merging v2 file
  contents into it. Prefer a non-destructive administrative merge with an
  unchanged v3 tree over rewriting public history.

### `v3`: active v3 integration and maintenance line

- Use `v3` for v3.x bug fixes, compatible additions, tests, documentation, and
  release preparation.
- Changes intended for a future v3.x release are integrated here first. The
  branch may be ahead of `master` between releases.
- At a release checkpoint, `master` and `v3` must have identical trees; keeping
  their tips identical is preferred when the administrative history permits.
- Do not merge the v2 implementation wholesale into `v3`. Port an individual
  fix only when it is independently applicable and tested against v3.

### `v2`: frozen legacy line

- Create `v2` from the pre-transition `master` tip, which is the `v2.4.1`
  release commit.
- Keep the `v2.4.1` tag immutable as the exact final v2 release.
- Freeze v2 runtime code and make no routine feature, compatibility, or npm
  releases from this branch.
- Documentation-only changes may explain that v2 is frozen, pin examples to
  `v2.4.1`, and link to the v3.1 migration guide. Such changes do not redefine
  the `v2.4.1` tag.
- A critical security or legal correction that would require changing v2 code
  needs a separate release decision; it is not implied by keeping the branch.
- The scoped npm package `@lizard-isana/orb` is the v3 distribution. v2 users
  retain the versioned source, browser builds, branch, and tags rather than a
  newly created scoped v2 package.

### Other long-lived lines

- Keep `v4-planning` experimental and separate from published release lines.
- Keep historical release tags immutable.
- Remove merged or obsolete topic branches only after v3.1.1 is published and
  `master`, `v3`, and `v2` are verified on the remote.

## Documentation routes

- The v3 README must place a short v2 notice before installation instructions.
  It links to both migration-guide languages and to the frozen v2 branch/tag.
- The v2 README should state that v3 is the current stable line, link to the
  migration guide, and use `v2.4.1` in pinned CDN examples.
- Documentation must not describe the v3 package root as numerically identical
  to v2. It preserves familiar synchronous call shapes while including
  intentional numerical and semantic corrections.

## Release invariant

The public branch, Git tag, npm artifact, and CDN checks must identify the same
release tree. Moving `master`, publishing to npm `next`, promoting `latest`,
and deleting obsolete branches remain separate, independently verified
administrative checkpoints.
