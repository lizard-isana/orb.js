# 2026-09-24 v3 root cleanup

## Context

The v3 branch still contained two historical development artifacts after the
v2 and v3 release lines were separated:

- `old/`, a duplicate checkout of v1 and v2 source, generated builds, data, and
  historical package files;
- `orbjsalpha5.patch`, the mail-form patch from the earlier Alpha-5 catalogue
  number work.

Neither path was referenced by the current source, build, or test entry points.
The package `files` allowlist already excluded both from npm artifacts.

## Decision

- Remove `old/` from v3. Historical releases remain available through the
  immutable v1/v2 tags and the frozen `v2` branch.
- Remove `orbjsalpha5.patch`. Its behavior is present in the current legacy and
  structured SGP4 parsers and is covered by Alpha-5 regression tests.
- Do not apply this cleanup to the frozen v2 runtime branch.

## Consequences

The v3 source tree no longer carries duplicate release trees or an already
applied patch. This does not intentionally change the npm tarball because both
paths were already excluded, but the final release artifact and all tests must
still be regenerated and verified after the repository cleanup.
