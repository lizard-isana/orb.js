# 2026-09-25 v3 parallel maintenance and development

## Context

Version 3.1.1 is the current stable release. Compatible feature development
for the next v3 minor release must be able to continue while the published
3.1 line remains available for focused patch releases. The repository does not
need to maintain an unlimited number of active minor lines.

This decision extends the branch roles established in
`2026-09-24-v2-v3-branch-roles.md` and supersedes its requirement that
`master` and `v3` have identical trees at every release checkpoint.

## Long-lived branch roles

### `master`: current stable release

- `master` is the GitHub default branch and represents the version selected by
  the npm `latest` dist-tag.
- Its package-relevant tree must match the current stable release tag and the
  verified npm artifact. Administrative records excluded from the package may
  follow the release commit.
- It does not accept unreleased feature development.

### `v3`: next compatible v3 development

- `v3` is the integration branch for the next backward-compatible v3 minor
  release. After 3.1.1, its next planned minor target is 3.2.0.
- Compatible features, additive APIs, maintenance refactors, tests, and
  documentation for that next minor are integrated here.
- It may remain ahead of and differ from `master` while development is in
  progress.

### `release/3.1`: supported 3.1 patch line

- `release/3.1` starts from the stable 3.1.1 repository state.
- It accepts focused fixes suitable for 3.1.2 and later 3.1.x releases.
- It does not accept unrelated features, broad refactors, or changes intended
  only for 3.2.
- A future 3.1 patch tag is cut from this line after the normal release gates.

### Other retained branches

- `v2` remains a frozen v2 maintenance base. Any exceptional v2 repair begins
  from `v2` and requires a separate release decision.
- `archive/v4-prototype` remains reference-only and is not an integration or
  release line.

## Work targeting and forward ports

- Start work from the oldest active line that must receive the change.
- A fix required by 3.1 starts from `release/3.1`, is verified there, and is
  then forward-ported to `v3`.
- Forward-port the focused fix commit rather than merging the complete release
  branch, so version bumps and release-only records do not enter `v3`.
- A defect affecting only unreleased 3.2 work is fixed only on `v3`.
- New backward-compatible features target `v3` and are not backported to
  `release/3.1`.
- Work branches must identify their purpose and target clearly. Suitable names
  include `feat/<topic>`, `fix/<topic>`, and `hotfix/3.1.2-<topic>`.
- Delete work branches after their changes and any required forward ports are
  complete. Keep release tags immutable.

## Version policy

- Patch releases such as 3.1.2 contain compatible bug, security, legal, and
  documentation corrections. They do not add unrelated public features.
- Minor releases such as 3.2.0 may add backward-compatible APIs, options,
  models, formats, and documented numerical improvements.
- Breaking removals or changes to public API shapes, default units, default
  coordinate semantics, or other user contracts require a major release.
- Correctness fixes that change numerical output must include references,
  regression tests, and release or migration notes appropriate to their
  impact, regardless of SemVer level.
- `package.json` is changed to a release or prerelease version during release
  preparation, not merely because a development branch has been created.
- Names such as `v3.1.2` and `v3.2.0` are reserved for immutable release tags,
  not long-lived branches.

## Patch release flow

For a 3.1 patch release:

1. Integrate and verify the fix on `release/3.1`.
2. Forward-port the fix to `v3` and verify it in the newer line.
3. Prepare the exact 3.1.x version and artifact on `release/3.1`.
4. Run the full Node matrix, build synchronization, generation, package,
   browser, installation, CDN, and audit gates required by the change.
5. Create the immutable version tag and publish the exact artifact to npm
   `next`.
6. After installation and CDN verification, advance `master` to the release
   tree and promote the same npm version to `latest`.

`master` may therefore point to 3.1.2 while `v3` already contains additional
3.2 work. Equality between those branches is not required.

## Minor release flow

For 3.2.0:

1. Stabilize the planned scope on `v3`.
2. At code freeze, cut `release/3.2` from the verified `v3` state.
3. Apply release-only corrections to `release/3.2` and forward-port applicable
   fixes to `v3`.
4. Publish and verify 3.2.0 through `next`, then advance `master` and promote
   the same artifact to `latest`.
5. Treat `release/3.2` as the current patch line. Freeze `release/3.1` unless a
   deliberate extended-support decision says otherwise.

The default support policy is one current stable minor line plus development
of the next compatible minor. Supporting more stable minor lines requires an
explicit decision.

## Required checks

- `master`, `v3`, and active `release/*` branches must pass the repository CI
  appropriate to their contents.
- Every backport or forward port runs the relevant domain tests and the full
  suite on its destination branch.
- Release publication, branch advancement, npm dist-tag promotion, and branch
  retirement remain separately verified administrative checkpoints.
- Release notes identify the source maintenance line, compatible additions,
  numerical changes, known issues, and required migration steps.
