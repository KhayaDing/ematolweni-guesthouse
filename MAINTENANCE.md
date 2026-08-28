# Maintainability refactor verification — 27 August 2026

## Inspection versus the historical audit

- The 137 obsolete gallery references and malformed closing tags had already been
  removed before this task. They were not reintroduced. All current photographs existed.
- The current gallery still rendered its 80 photographs only through JavaScript;
  without scripting it displayed an enable-JavaScript message and empty sections.
- The invalid CSS import, overlapping gallery/lightbox rules, duplicated layout,
  copyright 2025 and conflicting luxury/budget wording remained.
- The project already had media optimization, content-hashed output and loading/media
  tests. These were preserved and extended rather than replaced.
- There was no Git repository in this directory or its parents. No Git actions were taken.
- Netlify still published the project root. Existing local evidence reported LiteSpeed;
  the current live server and historical README exposure were not re-audited or changed.

## Implemented structure

Five page sources moved into `src/pages/`; shared navigation/footer are in
`src/partials/`. A small Node renderer writes complete static pages into `dist/`.
There is no client-side fetch for essential content and no new frontend framework.

`src/data/gallery.json` is the only curated photo list. All 80 photographs retain their
previous group/order. Descriptions were written after viewing every photo. Room 3
remains an empty renovation collection and now shows a navigation link and a "Photos coming soon" placeholder.
Cards are ordinary large-image links without JS, enhanced into lightbox triggers with
JS, including Enter/Space, Escape, arrows, focus return and show-more state.
The old browser-side gallery data/manifest and DOM replacement were removed.

`css/gallery-sections.css` now owns the gallery/overlay/lightbox and its grouped responsive
rules. Shared CSS has no import. Effective inherited modal padding/borders and gallery
hover styling were deliberately retained. Only obsolete Rooms-page selectors confirmed
absent from page sources and runtime markup were removed. Unrelated CSS was retained.

Markup fixes include one main page heading, meaningful heading levels, static button
names/types, named navigation, valid deferred-image placeholders, an inert closed dialog,
and named keyboard-scrollable table regions. Small intentional visual accessibility
changes are darker badge/contact text within the existing palette and an underlined
footer credit. Neutral accommodation wording and the build-time year replace stale copy;
concrete property facts, legal dates and booking/form configuration remain unchanged.

The output allowlist includes five pages, referenced fingerprinted assets and the asset
map. Approved public resources have explicit passthrough support. Unexpected existing
files in `dist` fail the build instead of being silently published or deleting user files.
Netlify's local publish directory is corrected. LiteSpeed access rules are proposals only.

## Verification evidence

**Final result: `pnpm validate` exited successfully. All 30 browser tests passed
across desktop, tablet and mobile, including open-state axe scans and the
JavaScript-disabled gallery. No outstanding automated test failures.**

- Offline HTML validation: all five generated pages pass; no unmatched tags, invalid
  nesting, duplicate IDs or missing required attributes reported.
- Reference checks: 882 asset/link/fragment associations pass, including image srcsets,
  deferred images, full-size gallery photographs and ARIA relationships.
- Business contracts: exact NightsBridge, WhatsApp, telephone and email destinations,
  counts and form opening configuration match the pre-refactor source.
- Media: 605 prepared variants decode with expected dimensions; 102 original media files
  match the earlier backup byte-for-byte (none missing or changed).
- HTTP preview: all 588 deployed files respond successfully with expected local cache
  headers. README, source, scripts, tests, packages, secrets and local hosting paths return 404.
- Determinism: building twice produces identical bytes/file sets across the entire output;
  the build does not modify source templates, CSS or JavaScript.
- Existing unit coverage retains decode gating, failed/racing image loads, carousel
  timing, reduced motion, Save-Data, explicit video playback and off-screen pause.
- Before/after comparisons: 15 page/viewport combinations passed geometry/style checks
  for shared header, hero, gallery controls/cards and modal. Screenshots cover Home,
  Gallery, Policies, Privacy, 404, expanded galleries, lightboxes and open navigation.
  Settled Gallery screenshots at all three sizes and desktop Home/Privacy show no pixels
  differing by more than 10 RGB levels. Small mobile/tablet Home differences correspond
  to the intentional badge contrast correction. This is not a full-page pixel-perfect guarantee.

Local evidence lives in `.maintenance/before/`, `.maintenance/comparison/`,
`.maintenance/original-media-verification.json`, `test-results/` and `playwright-report/`.
Backups/reports are excluded from the deployment output. Initial failures were used to
fix contrast, prose-link recognition, table keyboard access and test selectors that
incorrectly assumed static toggle names or visible carousel arrows on narrow screens.

## Limits and owner decisions

No bookings, enquiries, form submissions, deployments, DNS changes or live server
modifications were made. Browser tests block writes and external booking navigation;
contact checks only exercise local validity. The real POST `/` backend still needs host
confirmation, especially if the site is on LiteSpeed rather than Netlify Forms.

Tests use Chromium viewport emulation, not physical devices or Safari/Firefox, and do
not replace a full accessibility review. External embed content is not audited. Existing
Lighthouse scores in PERFORMANCE.md are historical, not newly measured here.

Owner approval is needed for Git initialization/commits/remotes, host selection and live
release, form backend confirmation, final brand positioning and existing legal-draft
review. The owner/host must separately remove or deny old public development files,
merge applicable server rules, preserve legitimate live public/ACME resources, configure
404/caching/MIME behavior and deploy only the release contents of `dist`.

Use README.md for exact setup, preview, gallery-editing, validation and deployment commands.
