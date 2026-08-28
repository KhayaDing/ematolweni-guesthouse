# EMatolweni Guesthouse

A small static website for **comfortable self-catering accommodation in Kimberley**.
The existing design, photographs, contact details and booking journey are retained.
NightsBridge remains authoritative for rates, availability and bookability.

## Quick start

Use Node **24.8 or newer** and **pnpm 11.19.0** (the package manager pinned in
`package.json`). Run commands from this directory:

```sh
npm install --global pnpm@11.19.0
pnpm install --frozen-lockfile
pnpm exec playwright install chromium
pnpm validate
pnpm preview
```

Open **http://127.0.0.1:8080**. Stop the preview with Ctrl+C. It binds to loopback
only and serves `dist/`, never the project root. Rebuild and refresh after edits.
No environment variables or credentials are required; there is no `.env.example`.
For Linux CI, browser installation may need `pnpm exec playwright install --with-deps chromium`.

## Structure and sources of truth

| Path | Purpose |
| --- | --- |
| `src/pages/*.html` | Editable content for Home, Gallery, Policies, Privacy, 404 and the enquiry receiver |
| `src/partials/header.html` | Shared top navigation, phone and booking actions |
| `src/partials/footer.html`, `footer-social.html` | Shared footer and optional social link (404 retains its simpler footer) |
| `src/data/gallery.json` | **Only gallery content list**: collection order, titles, status, photographs and alt text |
| `src/data/public-files.json` | Explicit optional public-file passthrough list; currently empty |
| `css/styles.css` | Shared site styles and responsive navigation |
| `css/gallery-sections.css` | Gallery, collection navigation, show-more and lightbox styles; loaded once, after shared CSS, on Gallery only |
| `js/script.js` | Progressive enhancements: carousel, video, navigation, gallery and existing contact-form behavior |
| `assets/images/`, `assets/videos/`, `assets/icons/` | Original media and public icons; originals are not removed or overwritten |
| `assets/optimized/`, `assets/media-manifest.json` | Generated responsive media and dimensions; kept with the project so ordinary builds do not need conversion |
| `scripts/` | Media preparation, static rendering, build, loopback preview and quality checks |
| `tests/`, `playwright.config.cjs` | Browser/accessibility checks and preserved business-destination contracts |
| `dist/` | **Generated deployment output only**; ignored by Git, never edit manually |
| `deployment/` | Proposed hosting rules for owner/host review, not active production configuration |
| `.maintenance/`, `.performance/`, `test-results/`, `playwright-report/` | Ignored local backups/evidence/reports; never publish |

Root HTML files moved to `src/pages/`; their generated equivalents are in `dist/`.
The build inserts shared partials and gallery cards, renders responsive pictures
using the existing media pipeline, and fingerprints CSS, JS and referenced media.
Every generated HTML page is labelled. It contains its own navigation, footer and
complete gallery content without needing JavaScript or server-side includes.
The build does not edit source files. `dist/asset-manifest.json` maps public source
asset paths to hashes; it contains no source templates or private configuration.

## Editing content and photographs

1. Edit page content in `src/pages/`. Use normal HTML. Existing simple `{{header}}`,
   `{{footer}}` and `{{gallery}}` tokens are replaced during the build; unknown tokens fail.
2. Edit shared navigation/footer in `src/partials/`. Active Home/Gallery states and
   `aria-current="page"` are generated per page. Keep relative URLs intact.
   The footer year is the current **build-time year**, so it works without JS;
   rebuild at least annually. Legal effective/update dates are intentionally unchanged.
3. For gallery changes, add original photographs to the corresponding `assets/images/`
   folder, then edit `src/data/gallery.json`. Each photo has a `src` and a descriptive
   `alt`. Array order controls both section and photo order. Do not edit generated
   cards or introduce a second list in JavaScript. A plain link opens the large JPEG
   without scripting; JS adds show-more, keyboard lightbox and collection scroll tracking.
4. **Room 3 stays `status: "renovation"` with an empty photo list.** Do not change its
   status without owner confirmation and approved photographs. Renovation collections
   show a navigation link and a "Photos coming soon" placeholder; this never changes NightsBridge bookability.
5. After adding/changing original media, run `pnpm media` and wait for it to finish.
   This uses the existing Sharp/FFmpeg pipeline; source digest sidecars skip unchanged
   work. Then run `pnpm validate`. For text/CSS/JS edits, media conversion is unnecessary.
   If FFmpeg is missing, reinstall with the existing `pnpm-workspace.yaml` build permissions;
   do not approve unrelated package scripts. Preserve the approved 180px header logo.

## Commands and checks

```sh
pnpm build          # Generate dist with complete HTML and fingerprinted assets
pnpm preview        # Preview dist on http://127.0.0.1:8080
pnpm check:html     # Offline HTML validation of all six generated pages
pnpm check:links    # Assets, image paths/srcsets, fragments, IDs and booking contracts
pnpm check:js       # Node syntax checks for site JS, build scripts and tests
pnpm check          # All three fast checks above (build first)
pnpm test:unit      # Existing carousel/video loading and preference tests
pnpm test:build     # Exact output allowlist, fingerprints and byte-identical second build
pnpm test:media     # Decode every prepared image variant and check its dimensions
pnpm test:browser   # Desktop/tablet/mobile interactions + axe accessibility smoke tests
pnpm validate       # BUILD + ALL CHECKS: run this before every release
```

Browser tests start/stop their own loopback server on port 8091; leave that port free.
They use 1440x900, 768x1024 and 390x844 Chromium viewports. They check all pages,
no horizontal overflow, accessible names, lightbox Enter/Escape/arrows/focus cycling,
show-more, mobile navigation, carousel controls, local form validity and JS-disabled
photo loading. Contact state tests use an in-memory fetch substitute and test-only HTML
activation; real writes remain blocked. Native submissions without JS and iframe origin checks
are tested with intercepted requests. Outbound
booking/enquiry links are inspected, never followed. Fonts/styles load from the site's
existing providers; third-party embeds are replaced with empty local test responses.
Reports/screenshots are in `playwright-report/` and `test-results/`.

Only three QA packages were added: HTML Validate (markup), Playwright (browser testing)
and axe's Playwright integration (accessibility). Node handles syntax, file and release
checks. HTML validation retains inline styling and current phone wrapping conventions;
structural, attribute, name and duplicate-ID rules remain enabled. Automated smoke tests
are not a substitute for screen-reader/device testing or a full accessibility audit.

`tests/business-contracts.json` locks the existing booking, WhatsApp, telephone and email
links and form configuration. Change it only alongside an owner-approved destination
change, after reviewing the real business requirement; never update it just to pass a test.

## Booking and positioning boundaries

- Keep `https://book.nightsbridge.com/38989?nbid=952` unchanged. Rates, availability,
  specials, deposits, payment and room selection belong to NightsBridge. No Rooms page,
  manual prices, widgets or guessed room deep links were added.
- WhatsApp remains an enquiry channel at the existing number and prefilled question.
- **Contact enquiries use the Netlify-hosted receiver embedded on the homepage.**
  Netlify Forms remains the backend, including when the homepage is served by Afrihost.
  See `CONTACT-FORM.md` for deployment, dashboard settings and separate submission/inbox
  verification. A downloaded receiver on another host blocks AJAX to avoid false success.
- Generic luxury/budget positioning was replaced with restrained self-catering wording.
  Confirm that wording with the owner. Concrete property facts were retained, not independently
  certified; the existing legal draft still needs its stated owner/legal review.

## Deployment and hosting

**Deploy only the contents of `dist/`. Never upload this whole directory.**
`.gitignore` does not control publication. The build uses an explicit file allowlist and
fails if unexpected files are already in `dist/`; review/move those files outside `dist/`
and rebuild instead of ignoring the error. Do not put README, source, tests, credentials,
local hosting state or `node_modules` in the web root.

No robots.txt, sitemap.xml or .well-known resources were present locally at inspection.
If required, put approved public files under `public/` and list their relative paths in
`src/data/public-files.json`; the renderer copies them byte-for-byte. The allowlist supports
robots.txt, sitemap.xml and individual .well-known verification resources. Review the
build's path allowlist before adding another type. Preserve server-managed ACME challenges
and any existing legitimate live resources when the owner deploys; do not overwrite them.

The public primary domain responds from LiteSpeed; the form receiver is hosted on Netlify.
Deploying to Netlify does not upload the homepage to Afrihost or change DNS.

- **LiteSpeed / Apache-compatible hosting:** ask the host to point the document root at
  the release contents or upload only `dist/`. Review and merge
  `deployment/litespeed-security.example.conf` and the existing cache example with the
  host; do not overwrite existing redirects, handlers or ACME rules. Confirm override/module
  support, MIME types, compression and actual headers. The host must remove or deny old
  development files already on the server; a clean local package does not remove them.
- **Netlify form receiver:** `netlify.toml` builds/checks the site and publishes `dist`,
  preserving the existing 404 fallback. `/enquiry.html` accepts same-origin form submissions
  and allows framing by the two primary domain variants through its Content Security Policy.
  `deployment/netlify-headers.example` is optional guidance; do not apply frame-blocking
  headers to the receiver. See `CONTACT-FORM.md` for actual dashboard checks.
- HTML and the manifest should revalidate; fingerprinted assets can have long immutable
  caching. During a real rollout retain prior hashed assets until cached HTML expires,
  or use an atomic release switch. Never apply immutable caching to all unversioned files.

## Version control and Netlify builds

The source repository is [KhayaDing/ematolweni-guesthouse](https://github.com/KhayaDing/ematolweni-guesthouse).
The local `main` branch tracks `origin/main`, preserving the existing repository history.
Review `.gitignore` and the staged diff before committing. Generated output, local
backups/reports, dependencies and credentials must not be committed.

For a Git-connected Netlify project, select this repository and the `main` branch.
The checked-in `netlify.toml` specifies Node 24, build command `pnpm build && pnpm check`,
and publish directory `dist`; `package.json` pins pnpm. Do not override publication to
the repository root. A push may trigger a Netlify deployment when continuous deployment
is enabled. Confirm the connected repository, build settings and deploy result in Netlify.

**The homepage embeds the Netlify-hosted enquiry form.** A source
push or successful build does not configure notification
recipients, or prove inbox delivery. See `CONTACT-FORM.md` for the remaining release gates.
The notification recipient belongs in the Netlify dashboard, not public source code.

Optional GitHub Actions can install Node 24 + pinned pnpm, run
`pnpm install --frozen-lockfile`, install Chromium with Linux system dependencies,
and run `pnpm validate` on pull requests/releases. No Actions workflow is configured here.

## Pre-deployment checklist

- [ ] Owner approves restrained positioning, property facts, legal draft and form backend.
- [ ] Gallery descriptions/order are correct; Room 3 shows its renovation placeholder without photographs.
- [ ] `pnpm validate` passes; preview Home, Gallery, Policies, Privacy, Enquiry and 404.
- [ ] Check desktop/mobile menu, lightbox, gallery without JS and contact validation without sending.
- [ ] Inspect `dist/`; include required approved public/host resources and nothing private.
- [ ] Host confirms document root, 404 behavior, MIME types, caching and development-file denial.
- [ ] Owner authorizes deployment and performs live checks/rollback preparation separately.

See `MAINTENANCE.md` for this refactor's verification record and `PERFORMANCE.md` for
historical performance measurements and media details. Live release verification is separate
from those historical records.

Tool/hosting references: [HTML Validate](https://html-validate.org/usage/),
[Playwright accessibility testing](https://playwright.dev/docs/accessibility-testing),
[Netlify configuration](https://docs.netlify.com/build/configure-builds/file-based-configuration/),
[Apache override requirements](https://httpd.apache.org/docs/2.4/howto/htaccess.html).
