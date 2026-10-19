# orb.js documentation site project architecture

Status: Accepted architecture / pre-implementation

Project name: `orb.js-docs`

Project boundary: a new repository and independently deployed documentation
site, separate from the `orb.js` runtime repository

Initial documented release: `@lizard-isana/orb@3.1.1`

Implementation status: not started. This document defines the intended
project, content model, synchronization contract, repository layout, and
launch gates. Repository creation remains a separate user-owned setup step.

## 1. Context

orb.js 3.1.1 has two complementary public surfaces:

- a compatible package-root API that preserves established synchronous
  `Orb.*` call shapes; and
- structured ESM subpaths for explicit time scales, frames, centers, units,
  state vectors, corrections, models, provenance, event searches, and SGP4.

The current repository documentation consists primarily of a concise README,
two long English/Japanese usage guides, and English/Japanese migration guides.
The usage guides contain important material, but they combine orientation,
concepts, examples, model limitations, and partial API reference in one long
document. This makes the whole library difficult to survey and individual APIs
difficult to discover.

A rough name-presence audit of the README and usage guides confirms the
coverage problem. It does not prove that every absent name is undocumented in
all possible senses, but it shows that many public exports cannot be found by
their exported name:

| Structured subpath | Public exports | Export names absent from current README/usage |
|---|---:|---:|
| `time` | 4 | 1 |
| `frames` | 64 | 51 |
| `geodesy` | 11 | 11 |
| `vocab` | 16 | 16 |
| `kepler` | 6 | 0 |
| `observer` | 8 | 5 |
| `events` | 16 | 9 |
| `sgp4` | 13 | 10 |
| `models/earth-epv00` | 6 | 2 |

The solution is not simply to lengthen the existing usage guides. orb.js now
needs a navigable, searchable, multilingual documentation site with an
explicit information architecture and a complete public-API inventory.

## 2. Decision

Create a separate documentation project using Astro and Starlight.

The documentation repository consumes a pinned orb.js release and records the
corresponding source tag or commit. It is deployed independently from the npm
package. Stable documentation updates therefore do not require an npm version
bump when the documented runtime contract has not changed.

The initial deployment model is deliberately simple: local development shows
draft content, while GitHub Pages publishes only the stable production build
from the primary branch. Hosted pull-request and next-version previews are
deferred until more than one maintainer or a persistent parallel-preview need
justifies another hosting provider such as Cloudflare Pages.

The project remains distinct from both:

- the orb.js runtime repository; and
- a future educational astronomical-calculation reference site that may use
  semantic traces to visualize calculations.

The documentation site may link to that educational site and may later
document the traceable API, but it does not absorb curriculum, exercises, or
long-form teaching content into the library reference.

## 3. Goals

The project should:

- make the complete public surface discoverable;
- give readers a clear map of compatible and structured APIs;
- document units, frames, centers, time scales, defaults, and model boundaries
  consistently;
- separate conceptual explanation, task-oriented guides, and API reference;
- provide English and Japanese routes with a shared page topology;
- test examples against the exact orb.js version they document;
- detect undocumented public exports automatically;
- classify supported public, legacy, package-internal, externally reachable
  internal, and private surfaces explicitly;
- provide full-text search and predictable navigation;
- publish static pages with no server runtime requirement;
- keep the stable site isolated from unreleased work and allow a future
  next-version preview without exposing unreleased APIs as stable; and
- remain operationally independent from orb.js's Node 18 package-consumer
  baseline.

## 4. Non-goals

The initial project does not attempt to provide:

- an astronomical textbook or complete course;
- a line-by-line annotated version of orb.js source;
- a live editor or browser IDE;
- automatic prose generation from JavaScript source;
- a complete TypeDoc/JSDoc-generated reference;
- a documentation build that parses orb.js source comments;
- documentation for private helpers;
- a permanent copy of every patch-level documentation version;
- an initial version selector for 3.1 versus 3.2;
- server-side rendering or user accounts;
- runtime telemetry or analytics by default; or
- the semantic trace visualization site proposed separately for traceable
  calculations.

## 5. Why a separate project

### 5.1 Independent release cadence

Documentation corrections, navigation improvements, translations, and new
examples should be publishable without changing the npm package version.

### 5.2 Toolchain isolation

The current Astro toolchain requires a newer Node.js runtime than orb.js's
package-consumer baseline. Keeping a separate `package.json`, lockfile, CI,
and deployment workflow prevents documentation tooling from weakening or
complicating the library's Node 18/20/22 verification matrix.

### 5.3 Clear repository responsibility

The orb.js repository continues to own:

- implementation and tests;
- package metadata and distribution;
- concise source-level algorithm references;
- release and migration records;
- a short README and package-local quick-start material;
- machine-readable public API and model contracts when needed;
- source-local JSDoc conventions used for implementation readability and
  optional source checks; and
- the intended audience and lifecycle of runtime entry points and members.

The documentation repository owns:

- the documentation information architecture;
- detailed API pages;
- conceptual and task-oriented guides;
- English/Japanese page topology;
- site navigation, search, presentation, and deployment; and
- version-pinned executable examples.

For the initial 3.1.1 documentation release, which predates a complete
runtime-owned API contract, the documentation repository owns a reviewed
bootstrap snapshot of the released package surface. Beginning with a future
runtime-owned contract, the documentation repository stores a normalized,
version-pinned snapshot of the contract owned by orb.js rather than redefining
it independently.

### 5.4 Synchronization cost is managed explicitly

A separate repository prevents toolchain coupling but removes the ability to
update runtime and full documentation in one atomic pull request. This is
accepted only with automated API coverage, pinned-version examples, explicit
provenance, and a release checklist that records the corresponding
documentation work.

## 6. Technology choice

### 6.1 Astro and Starlight

Use Astro with the Starlight documentation integration.

Relevant official capabilities include:

- Markdown and MDX content;
- file-based pages;
- structured and autogenerated sidebars;
- static full-text search using Pagefind;
- internationalized routes, UI, and fallback content;
- code highlighting and documentation components;
- edit links, page metadata, and previous/next navigation; and
- static deployment, including GitHub Pages.

Official references:

- <https://starlight.astro.build/>
- <https://starlight.astro.build/getting-started/>
- <https://starlight.astro.build/reference/configuration/>
- <https://starlight.astro.build/guides/i18n/>
- <https://docs.astro.build/en/guides/deploy/github/>

### 6.2 Dependency policy

- Commit the documentation project's own lockfile.
- Pin Astro, Starlight, and plugins through ordinary lockfile review.
- Upgrade the documentation toolchain deliberately rather than implicitly.
- Do not require the orb.js repository to install Astro dependencies.
- Run the documentation build on a supported Node version, initially Node
  22.12 or later, independently of the orb.js runtime matrix.
- Prefer built-in Starlight functionality before adding community plugins.
- Treat community versioning, TypeDoc, or navigation plugins as optional
  dependencies requiring their own maintenance review.

### 6.3 Static output

The initial site is fully prerendered. No Astro server adapter is required.
Static output keeps hosting simple and makes the generated site suitable for
GitHub Pages or another static host.

### 6.4 Repository and source layout

The initial repository is public, uses the MIT license, uses `main` as its
primary branch, uses npm with a committed lockfile, and sets `private: true`
in its package metadata. The expected repository name is `orb.js-docs`.

Keep authored site content, API snapshots, executable examples, and validation
tools separate:

```text
orb.js-docs/
  AGENT.md
  README.md
  LICENSE
  package.json
  package-lock.json
  .nvmrc
  astro.config.mjs
  tsconfig.json

  .github/workflows/
    ci.yml
    deploy-pages.yml

  .ai/
    README.md
    STATUS.md
    decisions/
    plans/

  api/
    schemas/
    targets/stable.json
    snapshots/3.1.1/
      provenance.json
      package-exports.generated.json
      public-api.json

  examples/3.1.1/
    compatible/
    time/
    frames/
    geodesy/
    kepler/
    observer/
    events/
    sgp4/

  tools/
    generate-api-inventory.mjs
    check-api-coverage.mjs
    check-examples.mjs
    check-locales.mjs
    check-provenance.mjs

  src/
    content.config.ts
    content/
      docs/
        index.mdx
        start-here/
        concepts/
        guides/
        reference/
        migration/
        development/
        ja/
      i18n/
    components/
    assets/
    styles/

  public/
```

English is the root locale. Japanese pages live below
`src/content/docs/ja/` and mirror the English slugs. Generated site output,
temporary reports, and Astro caches are ignored rather than committed.

## 7. Repository relationship and version pinning

### 7.1 Stable documentation

The primary branch of the documentation project describes the current stable
orb.js release and pins that exact npm version as a development dependency.

The project records at least:

```text
orb package: @lizard-isana/orb
orb version: 3.1.1
source tag: v3.1.1
source commit: exact commit for the release tag
source repository: https://github.com/lizard-isana/orb.js
package integrity: lockfile-resolved npm artifact integrity
documentation revision: exact documentation commit
```

Every executable example and API inventory check runs against that installed
version, not against an unrecorded local checkout.

### 7.2 Unreleased documentation

The initial project does not host a next-version site. Unreleased pages may be
kept locally or committed with Starlight's `draft: true` frontmatter. They are
visible under `npm run dev` but excluded from the production build.

`draft` describes publication state, not the target runtime. If substantive
3.2 authoring begins before release, add separate target metadata such as
`target: next` and `apiVersion`, and validate examples against an exact
prerelease or `npm pack` artifact. Do not run next examples against the pinned
stable dependency silently.

A hosted next-version or pull-request preview remains a later operational
decision. It may use another provider such as Cloudflare Pages when parallel
maintenance, multiple maintainers, or public review makes the additional
deployment surface worthwhile.

### 7.3 Release coordination

An orb.js public-API change should record one of the following before release:

- the matching documentation pull request;
- a documentation issue with an explicit release blocker status; or
- a reason no documentation change is required.

The orb.js release checklist should confirm that:

- stable docs describe the current stable package;
- when next documentation is active, it describes the intended new surface;
- executable examples pass against the candidate artifact; and
- the API inventory has no unexplained omissions.

### 7.4 No automatic stable drift

The documentation project must not use a floating dependency such as
`@lizard-isana/orb@latest` in CI. A new library release requires an explicit
version update and reviewed documentation diff.

## 8. Version and publication model

### 8.1 Documentation publication is independent of npm SemVer

Corrections or expanded explanations for the existing 3.1.1 API may be
published immediately without releasing orb.js 3.1.2. The site identifies the
runtime version it documents.

Package-local README, usage, or migration-file changes still enter an orb.js
release through its normal branch and artifact process.

### 8.2 Initial version policy

Do not add a public version selector initially.

- Publish one stable site for the current stable v3 release.
- Preview drafts locally; do not deploy pull-request or next-version previews
  initially.
- Preserve documentation source through Git history and release tags.
- Reconsider multi-version navigation for a future major-version transition
  or when active user support genuinely requires parallel documentation.

This avoids duplicating almost identical 3.1 and 3.2 pages before the content
model itself is stable.

## 9. Relationship to package-local documents

### 9.1 README

The orb.js README remains concise and package-centered:

- purpose;
- installation;
- compatible versus structured API choice;
- one minimal example for each surface;
- supported environments;
- link to the stable documentation site;
- migration links; and
- development commands.

It must not become a second complete API reference.

### 9.2 Usage guides

The current `usage.en.md` and `usage.ja.md` remain useful migration sources and
offline package documentation during the initial site launch.

After the site reaches coverage parity, make an explicit follow-up decision
to either:

- retain them as concise package-local guides;
- generate a selected offline guide from canonical site content; or
- deprecate them in favor of the site while retaining tagged historical
  copies.

Do not maintain two independently expanding full references indefinitely.

### 9.3 Migration guides

Migration guides stay versioned with the orb.js source and are also rendered
or adapted into the documentation site. Their canonical ownership remains
with the release whose behavior they describe. An adapted copy records its
upstream path and exact source commit or content hash; the stable site build
does not fetch mutable source content over the network.

## 10. Information architecture

The initial English and Japanese sites use the same page topology.

```text
Start Here
  Overview
  Installation
  Quick Start
  Choosing an API Surface
  Browser Usage

Core Concepts
  Time Scales and AstroInstant
  Frames, Centers, and Origins
  Units and State Vectors
  Models and Corrections
  Accuracy, Validity, and Provenance
  Compatible and Structured Composition

Guides
  Sun, Moon, and Planet Positions
  Observer Calculations
  Kepler Propagation
  TLE, OMM, and SGP4
  Rise, Set, Transit, Phases, and Passes
  Optional Full VSOP87A
  Error Handling and Reproducibility

API Reference
  Package Root
  /compatibility
  /time
  /frames
  /geodesy
  /vocab
  /kepler
  /models/earth-epv00
  /observer
  /events
  /sgp4
  /vsop87a/*

Migration
  v2.4.1 to v3.1
  v3.0 to v3.1

Development and Models
  Browser and Node Support
  Numerical Models and Sources
  Fixtures and Reproducibility
  Package and Subpath Architecture
  Contributing to Documentation
```

The sidebar may autogenerate leaf API pages, but its top-level groups and
conceptual order are deliberate. Alphabetical filesystem order must not decide
the learning path.

## 11. Content types

### 11.1 Orientation pages

Help readers select the appropriate API surface and find the next page. These
pages are short and decision-oriented.

### 11.2 Concept pages

Explain stable domain contracts shared by many APIs, including time scales,
frames, units, corrections, and provenance. They avoid duplicating the full
reference of every function.

### 11.3 Guides

Show how to complete one realistic task. A guide may combine several APIs but
must state inputs, units, defaults, and omitted effects clearly.

### 11.4 API reference

Document every supported public export. Reference pages are authoritative for
signatures, parameters, returns, defaults, units, errors, and aliases.

### 11.5 Migration pages

Describe version-specific behavioral and packaging changes. They are not
general tutorials.

## 12. API reference contract

Every public API entry should record, as applicable:

- exported name and package subpath;
- kind: class, function, constant, factory, method, or alias;
- signature and parameter defaults;
- accepted input forms;
- return shape;
- angle and distance units;
- frame and center semantics;
- time scale and epoch semantics;
- model or algorithm identity;
- applied and omitted corrections;
- validity or accuracy limits;
- thrown error conditions;
- mutability or frozen-result behavior;
- minimal executable example;
- related concepts and APIs; and
- availability since a package version.

Aliases should be documented as aliases rather than copied into independent
pages with duplicate prose.

Low-level mathematical helpers may be grouped by module when individual pages
would add navigation noise, but every export remains indexed and linkable.

## 13. Public API inventory and coverage enforcement

### 13.1 Inventory precedes site-scale decisions

Generate and review the exact 3.1.1 inventory during D0, before migrating the
long usage guides or fixing final reference-page granularity. The inventory
must cover more than `Object.keys()` on ESM namespaces. At minimum it records:

- every `package.json#exports` key and conditional target;
- the compatible package root and classic-script UMD globals;
- explicit structured subpaths and their module exports;
- wildcard entries such as `/vsop87a/*` and their concrete packaged modules;
- supported constructors, factories, instance methods, returned interfaces,
  aliases, constants, and significant result shapes;
- package-visible escape hatches such as `/src/*`, `/dist/*`, and
  `/package.json`; and
- the exact package version, source tag, source commit, and npm integrity.

Class-field methods used by compatible APIs cannot be inferred reliably from
module export enumeration alone. Runtime inspection, source review, tests,
and existing usage and migration documents therefore supplement generated
module inventories.

### 13.2 Generated facts and reviewed classification

Keep generated package facts separate from reviewed intent:

```text
api/snapshots/3.1.1/package-exports.generated.json
  exact observable package entries and module exports

api/snapshots/3.1.1/public-api.json
  reviewed classification, members, aliases, and documentation mapping

api/snapshots/3.1.1/provenance.json
  package, tag, commit, integrity, and generation metadata
```

Classification uses independent axes rather than one overloaded status:

```text
audience
  public | package-internal | private

exposure
  documented-export | compatibility-export | wildcard-reachable | unexported

lifecycle
  stable | legacy | deprecated | experimental
```

`legacy` remains public and supported unless it is also explicitly deprecated.
`wildcard-reachable` records observable packaging state; it does not turn an
internal helper into a supported user contract. Removing a previously
reachable path remains a compatibility decision rather than a documentation-
only reclassification.

Unexported helpers are private by default and do not require individual
inventory entries or JSDoc merely because they exist. Record private entries
only when needed to explain a public boundary, an externally reachable path,
or a package-internal contract such as a future traceable seam.

Do not generate explanatory prose from source names. Documentation remains
human-written because units, frames, defaults, and astronomical meaning cannot
be inferred safely from JavaScript signatures alone.

### 13.3 Stable API identifiers and page metadata

Assign stable identifiers to contract entries during D0. The exact schema is
validated by a vertical slice, but identifiers should support forms such as:

```text
root.Observation
root.Observation#azel
time.AstroInstant
time.AstroInstant#jd
frames.transform
vsop87a.saturn.SATURN_FULL_COEF
```

Reference pages point to shared identifiers instead of repeating complete
classification metadata in each locale:

```yaml
title: Geodesy API
apiEntries:
  - geodesy.WGS84
  - geodesy.geodeticToEcef
  - geodesy.ecefToGeodetic
  - geodesy.enuMatrix
```

English and Japanese pages reference the same API entries. Large modules may
group many exports on one page, but every supported export and public member
must have a stable page-and-anchor target.

### 13.4 Source JSDoc policy

orb.js may adopt JSDoc-formatted source comments to improve human and machine
readability. This is a runtime-repository coding convention, not the source of
site prose and not a dependency of the Starlight build.

Use standard JSDoc tags such as `@public`, `@package`, `@private`,
`@deprecated`, `@since`, `@param`, `@returns`, `@throws`, `@example`, and
`@see` where they express the intended meaning. Do not misuse `@deprecated`
for a supported legacy API.

The only initially reserved orb.js-specific tag is:

```text
@orbContract traceable
```

It identifies a package-internal seam shared by normal and future traceable
implementations. The accompanying prose must still explain the boundary and
review requirement. The tag is reserved for the release-unassigned
traceability experiment and is not retrofit into 3.1.1 merely to build the
documentation site. New custom tags
must use the `@orb` prefix, must not duplicate a standard tag, and require a
demonstrated repeated use before adoption.

Source checks may validate JSDoc syntax and required annotations, but the
documentation project must not generate its reference prose from those
comments or require source checkout access for a stable build.

### 13.5 CI rules

CI fails when:

- an installed package entry or module export has no reviewed classification;
- a supported public export or member has no documentation mapping;
- documentation claims an API entry that does not exist;
- a private classification is externally reachable without an explicit
  reviewed exposure record;
- an API page references the wrong package version;
- provenance does not match the exact installed artifact;
- a local link is broken;
- a displayed runnable example fails;
- required API metadata is missing; or
- English and Japanese page topology diverges without an explicit fallback or
  translation-status declaration.

Exceptions may classify internal, deprecated, generated-data, metadata, or
alias entries, but every exception requires a reason. An exception hides no
entry from the inventory; it only records why full public reference treatment
does not apply.

## 14. Examples and executable verification

### 14.1 One source for code and test

Executable example files are both:

- run in CI against the pinned package; and
- embedded or included in documentation pages.

Avoid maintaining one code block for the page and a separately copied test.
Store examples outside the content tree and embed the same source file in MDX
through a raw import and Starlight's code component. English and Japanese
pages share the same example file.

### 14.2 Deterministic inputs

Examples use fixed instants, observers, elements, and model options. They do
not depend on the current time or current network data.

### 14.3 Expected output

Expected output includes tolerances and semantic labels where necessary.
Floating-point examples must not imply more precision than the model supports.

### 14.4 Browser examples

Browser-specific examples distinguish:

- the compatible UMD surface;
- package-aware structured ESM usage; and
- unsupported direct-CDN or bare-import assumptions.

Classify every displayed example by runtime. All Node-runnable displayed
examples run in CI. Browser-only examples receive browser verification before
stable launch; the initial project may use a documented manual check rather
than add a browser automation dependency immediately.

Interactive examples are deferred until the static content and executable
example contract are stable.

## 15. English and Japanese strategy

### 15.1 Locale structure

Use English as the default/root locale and Japanese under `/ja/`.

Both locales share slugs and page topology so readers can switch language on
the corresponding page.

### 15.2 Canonical technical contract

API signatures, units, token values, defaults, code examples, and machine-
readable metadata are shared or checked across languages. Prose is translated,
not independently redesigned into a different API contract.

### 15.3 Progressive translation

Starlight fallback may be used for pages not yet translated, with a visible
fallback notice. Stable high-traffic pages should not remain fallback-only
indefinitely.

### 15.4 Translation parity check

CI checks page topology and critical contract tokens. It does not require
literal line-by-line translation equality.

## 16. Search and navigation

- Use Starlight's built-in Pagefind search initially.
- Keep API export names, aliases, and package subpaths in searchable page text
  or metadata.
- Add controlled keywords for common astronomical synonyms where useful.
- Keep conceptual navigation ordered manually.
- Autogenerate large API leaf groups from content metadata or directories.
- Use badges sparingly for deprecated, experimental, or next-version pages.
- Do not add an external search service until the static index demonstrates a
  concrete limitation.

## 17. Visual and interaction policy

The first release uses Starlight's default accessible documentation patterns
with restrained orb.js branding. Avoid a large custom theme before the
information architecture is validated.

Allowed initial enhancements include:

- consistent callouts for unit/frame/time-scale hazards;
- compact result-shape tables;
- diagrams for frame and data-flow relationships;
- tabs for compatible versus structured examples; and
- badges for stable, deprecated, experimental, or next-version content.

Complex interactive astronomical visualizations belong to the separate
reference-site effort unless they are small, directly useful API examples.

## 18. Deployment model

### 18.1 Stable site

- Build a static site from the documentation project's `main` branch.
- Pin the exact orb.js stable version.
- Deploy with GitHub Actions to the repository's GitHub Pages project site.
- Use the expected initial URL
  `https://lizard-isana.github.io/orb.js-docs/`, subject only to confirmation
  when the empty repository is created.
- Configure Astro's `site` and `base` values without hard-coding the project
  path into authored internal links.
- Record the deployed documentation version visibly in the site footer or
  version information page.

### 18.2 Pull-request previews

Every documentation pull request must run a production build and link/API
checks. Do not host per-PR previews initially. Retain the built artifact for
inspection when useful and use `npm run dev` for local review.

### 18.3 Draft content

- Standard Starlight Markdown and MDX pages may use `draft: true`.
- Draft pages are visible during local development and absent from production
  builds, navigation, and search.
- Do not add a production-page link or a manually configured sidebar slug to
  a draft page.
- Custom Astro pages must not assume that Starlight's draft metadata excludes
  them automatically; the initial project should prefer content-collection
  pages.
- `draft` does not replace explicit target-version metadata for unreleased API
  work.

### 18.4 Deployment safety

- Deployment runs only after build and verification pass.
- Only `main` deploys. Topic branches and pull requests do not deploy.
- Keep workflow permissions minimal and keep deployment separate from the
  verification job.
- Generated site output is not committed unless the selected hosting workflow
  requires it.
- A failed documentation deploy does not alter the npm package or dist-tags.

Move hosted previews to another static provider only when multiple
maintainers, public pull-request review, or a persistent stable/next split
creates a concrete need. The static repository layout must not depend on
GitHub Pages-specific runtime behavior.

## 19. Quality gates

### 19.1 Content gates

- The full package surface has a clear overview.
- Every public export is indexed or explicitly classified.
- Every reference entry states units and coordinate/time semantics where
  applicable.
- Compatible and structured APIs are not conflated.
- Accuracy and omitted effects are visible near affected APIs.
- English and Japanese topology is synchronized.

### 19.2 Automated gates

- clean dependency install;
- Astro/Starlight production build;
- content-schema validation;
- internal-link validation;
- package-entry, export, member, and API-classification comparison;
- all displayed Node-runnable example tests against the pinned package;
- stable target and draft-exclusion validation;
- search-index creation; and
- package/version/source provenance validation.

### 19.3 Visual gates

- inspect representative desktop and mobile pages;
- inspect English and Japanese navigation;
- inspect long API tables and code blocks;
- verify dark and light themes;
- verify search results for API names and common concepts;
- check keyboard navigation and visible focus; and
- inspect fallback and draft notices during local development.

## 20. Proposed milestones

### D0 — Repository and contract

- Confirm the empty `orb.js-docs` remote and local path created by the user.
- Initialize the isolated Node 22 documentation toolchain.
- Set `private: true`, use npm, commit the lockfile, and apply the MIT license.
- Pin `@lizard-isana/orb@3.1.1` exactly.
- Record package version, source tag and commit, npm integrity, and repository
  provenance.
- Generate the complete package-entry and module-export inventory.
- Review constructors, members, aliases, result shapes, wildcard paths, UMD
  globals, and package-visible escape hatches.
- Establish the classification axes, stable API identifiers, and schema.
- Validate the contract with vertical slices for the package root, `/time`,
  `/frames`, and `/vsop87a/*`.
- Add build, local-dev, link, inventory, locale, provenance, and example-test
  commands.

### D1 — Information architecture and site shell

- Configure Starlight, English/Japanese locales, navigation, and search.
- Create the top-level page tree and shared frontmatter schema.
- Add stable version identity and source/edit links.
- Validate stable production and local draft builds without public deployment.

### D2 — Migrate existing documentation

- Split README and usage-guide material into orientation, concepts, guides,
  and reference pages.
- Adapt migration guides without losing version-specific detail.
- Keep redirects or clear links from former entry points where applicable.
- Preserve English/Japanese contract parity.

### D3 — Complete public API reference

- Complete reference coverage for every supported public contract entry or
  documented group from the D0 inventory.
- Add units, frames, centers, time scales, defaults, errors, and aliases.
- Turn every displayed Node-runnable example into an executable CI fixture.
- Make undocumented-export checks mandatory.

### D4 — Stable launch

- Complete navigation, search, accessibility, mobile, and theme checks.
- Verify all examples against the installed 3.1.1 package.
- Publish the stable site.
- Add the stable URL to the orb.js README in the appropriate release line.
- Record the documentation site in the orb.js release checklist.

### D5 — future runtime-version documentation integration

- Establish a reproducible input from an exact prerelease or `npm pack`
  artifact produced by orb.js `v3`.
- Add draft pages for accepted 3.2 APIs without exposing them as stable.
- Require documentation impact records for public 3.2 changes.
- Treat 3.2 documentation as separate release work.
- Add traceable API reference only after its experiment is accepted and a
  runtime release is assigned.
- Introduce a hosted next-version preview only if its operational need has
  been demonstrated separately.

## 21. Acceptance criteria for initial launch

The first stable launch is complete when:

- the site clearly identifies `@lizard-isana/orb@3.1.1` as its runtime target;
- a new reader can choose between compatible and structured APIs;
- the main conceptual contracts for time, frames, centers, units, models, and
  corrections are independently navigable;
- every package entry, public root and structured-subpath export, supported
  public member, alias, and intentionally exposed exception is indexed or
  explicitly classified;
- API pages contain the required semantic fields;
- every displayed Node-runnable example executes against the exact installed
  package;
- English and Japanese share the intended page topology;
- fallback content is clearly indicated;
- search finds exports, aliases, package subpaths, and major concepts;
- production build, link, inventory, and example checks pass;
- desktop/mobile and light/dark visual inspection passes;
- stable deployment is independent of npm publication; and
- the orb.js README points users to the stable site without duplicating the
  complete reference.

## 22. Risks and mitigations

### 22.1 Documentation drifts from implementation

Mitigation: exact package pinning, provenance, complete surface inventory
checks, executable examples, and release-impact records.

### 22.2 Separate repository makes coordinated changes easy to forget

Mitigation: require a docs PR, blocking docs issue, or explicit no-change note
for public orb.js changes.

### 22.3 English and Japanese contracts diverge

Mitigation: shared topology, shared code examples and metadata, critical-token
checks, and explicit fallback state.

### 22.4 Generated reference becomes shallow or misleading

Mitigation: generate only observable package facts and reviewed classification
data. Keep semantic reference prose human-authored and reviewed.

### 22.5 Toolchain updates disrupt library development

Mitigation: separate repository, lockfile, Node version, CI, and deployment.

### 22.6 The site becomes an educational monolith

Mitigation: retain the boundary between library documentation and the future
trace-driven astronomical reference site.

### 22.7 Versioning is introduced before it is needed

Mitigation: publish one stable site, keep drafts local, and reconsider hosted
previews or full versioning only at a demonstrated support need.

## 23. Decisions completed before project initialization

- Repository and package name: `orb.js-docs`.
- Public repository with `main` as the primary branch and MIT licensing.
- npm and Node 22.12 or later, isolated from the orb.js runtime toolchain.
- Expected initial GitHub Pages project URL:
  `https://lizard-isana.github.io/orb.js-docs/`.
- GitHub Pages publishes stable `main` only; drafts and topic branches are
  reviewed locally and are not deployed.
- English is the root locale and Japanese uses `/ja/` with matching slugs.
- Executable examples are stored once outside the content tree, run in CI,
  and embedded from the same source file.
- API inventory and classification are D0 inputs to information architecture,
  not deferred D3 outputs.
- orb.js JSDoc is a source-readability convention and possible check input,
  not a Starlight content generator.
- Traceable source annotations and public documentation remain
  release-unassigned experimental work rather than a 3.1.1 documentation
  dependency.

The exact API schema, identifier edge cases, page grouping, link-checking
package, and Astro/Starlight upgrade policy are D0 implementation decisions.
The long-term package-local usage-guide policy remains a post-parity decision.

## 24. Expected outcome

The project should turn orb.js documentation from a small set of long files
into a coherent product surface:

```text
orientation
  leads to the appropriate API family

concepts
  explain the shared astronomical contracts

guides
  solve concrete tasks

reference
  covers every public export

migration
  preserves version-specific change history
```

The stable site documents a pinned released library. Unreleased work remains
draft and local until a separate preview need is demonstrated. The future
traceable and educational projects can link into this reference, but they do
not determine its runtime or content architecture.
