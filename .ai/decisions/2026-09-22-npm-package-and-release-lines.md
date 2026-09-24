# 2026-09-22 npm package name and release lines

## Context

The unscoped npm name `orb.js` is already owned by an unrelated project. The
astronomy library is preparing a v3.1 release and may later make that release
line the GitHub default, while retaining older source lines for users that need
them.

## Decision

Publish the astronomy library as the public scoped package:

```text
@lizard-isana/orb
```

The project and repository continue to be named `orb.js`, and the browser UMD
global remains `Orb`. Only the npm package specifier changes.

Examples:

```js
const Orb = require("@lizard-isana/orb");
import * as Orb from "@lizard-isana/orb";
import { SATURN_FULL_COEF } from "@lizard-isana/orb/vsop87a/saturn";
```

Set `publishConfig.access` to `public` so a scoped release cannot accidentally
use npm's private-package default. Pin `publishConfig.registry` to the public
npm registry.

The package supports Node 18 and later. The conditional ESM entry points to the
generated `dist/orb.esm.mjs`, while the existing `dist/orb.esm.js` remains in
the package for browser and direct-path compatibility. Optional VSOP87A source
modules have a nested `type: module` package boundary so their interpretation
does not depend on newer Node syntax detection. The UMD/CommonJS entry remains
`dist/orb.js`.

## Release policy

- Keep the package version at `3.0.0` while v3.1 work is in progress.
- Change it to `3.1.0` only when preparing the release candidate.
- Publish release candidates under the npm `next` dist-tag.
- Promote the verified release to `latest` without rebuilding the artifact.
- Preserve the v2 line with an explicit Git branch and Git tags rather than
  compatibility shims in v3.1.
- Keep `v4-planning` experimental and do not publish it as `latest`.
- Moving the GitHub default branch to the v3.1 line is a separate repository
  administration step after the release is verified.

## Release checks

Before publishing:

1. Run the complete test and build suite.
2. Confirm committed `dist/` files match `src/`.
3. Inspect `npm pack --dry-run` and the generated tarball contents.
4. Install that tarball in a temporary consumer and verify CommonJS, ESM, and
   an exported VSOP87A subpath.
5. Publish the exact verified artifact under `next`.
6. Verify the npm install path and CDN path before promoting it to `latest`.

Use npm trusted publishing with provenance when release automation is added;
do not store a long-lived npm token in the repository.

## 2026-09-24 branch-name clarification

The package and release policy above remains in force, but the repository will
keep `master` as its public default branch rather than create `main`. The
detailed roles of `master`, `v3`, and the frozen `v2` line are recorded in
`2026-09-24-v2-v3-branch-roles.md`. This clarification supersedes only the
earlier assumption that moving the v3.1 line to the default branch required a
new branch name.
