> Historical performance report from the earlier optimization pass. For the current source layout, commands and deployment workflow, use README.md. Lighthouse scores below were not remeasured during the maintainability refactor.

# Performance implementation and handoff

Measured locally on 27 August 2026. No deployment, DNS, production cache or
third-party service was changed.

## Fresh baseline and final measurements

The audit source is `.performance/measurements.json`. Lighthouse 12.8.2 launched
a new temporary Chrome profile for each run (cold cache), using its standard
desktop and mobile simulated throttling presets. The preview server did not
compress text, so production Brotli/gzip should reduce HTML/CSS/JS transfer but
was deliberately not credited here.

| Metric | Desktop before | Desktop final | Mobile before | Mobile final |
| --- | ---: | ---: | ---: | ---: |
| Performance score | 69 | 92 | 62 | 65 |
| LCP | 4.53 s | 1.36 s | 21.53 s | 6.08 s |
| CLS | 0.0032 | 0.0032 | 0.0067 | 0 |
| FCP | 1.56 s | 1.33 s | 4.73 s | 4.40 s |
| TBT | 0 ms | 0 ms | 0 ms | 0 ms |
| HTTP(S) requests captured | 43 | 38 | 23 | 16 |
| Transfer, local + third party | 12.68 MB | 1.30 MB | 9.83 MB | 0.81 MB |
| Same-origin requests | 19 | 15 | 16 | 10 |
| Same-origin transfer | 11.86 MB | 0.48 MB | 9.47 MB | 0.45 MB |
| Initial video requests | 1 | 0 | 1 | 0 |
| Initial inactive-hero requests | 2 | 0 | 2 | 0 |

The request measurement is Lighthouse's completed page-load capture, not the
size of the whole deployable site. It includes third-party Google Fonts, Font
Awesome and, where Lighthouse's lazy-load viewport threshold reached them,
other page resources. Transfer bytes are network bytes reported by Lighthouse.

The original `assets/` baseline was 43,602,880 bytes (41.58 MiB). Those originals
remain byte-for-byte unchanged and now coexist with repeatable variants, so the
editable source `assets/` directory is 89,305,733 bytes (85.17 MiB). The current
deployable `dist/assets/` set is 47,503,639 bytes (45.30 MiB): it contains several
screen sizes and JPEG, WebP and selective AVIF choices so a browser downloads
only its best match. Directory size therefore increases while initial transfer
falls sharply. Do not deploy source originals or judge page cost by adding every
mutually exclusive responsive format.

| Asset | Original | Optimized example |
| --- | ---: | ---: |
| Header logo | 1,464,281 B | 9,464 B lossless WebP, 180 px |
| Footer logo | 1,458,901 B | 12,688 B lossless WebP, 180 px |
| Smart TV amenity | 2,250,177 B | 16,804 B AVIF at 720 px |
| First hero | 648,191 B | 184,869 B AVIF at 1440 px; 253,421 B at 1800 px |
| Video initial download | 4,248,949 B | 28,806 B JPEG poster; zero MP4 requests |

The video itself is unchanged and remains available on explicit play. Logo PNG
fallbacks remain 13,194 B / 15,618 B and preserve transparent backgrounds.

Gallery-only final Lighthouse: 91 desktop / 66 mobile; LCP 1.38 s / 6.26 s;
0.90 MB / 1.05 MB transferred; zero full-size 1600 px lightbox photographs in
either initial load. Gallery thumbnails were responsive 360/720 px variants.

The report JSON, trace, network logs, cache checks and measurements are kept in
the git-ignored `.performance/` working folder. Lighthouse logged a Windows
EPERM warning while deleting some temporary Chrome-profile directories after
reports were already saved. Every final report has no Lighthouse `runtimeError`,
no run warnings and no network responses at status 400 or higher.

## What changed

- Every photographic source gets JPEG and WebP variants; meaningful AVIF sets
  are retained only when at least 15% smaller than matching WebP. The high-entropy
  first hero uses AVIF quality 48 after visual comparison; the other AVIFs use 55.
- The header reuses the existing 180 px transparent logo and both transparent
  logos have lossless WebP alternatives. A 60 CSS-pixel display therefore has a
  sharp 3x source without the former 1.4 MB download.
- All markup images have intrinsic dimensions. Home and page-hero pictures use
  `srcset`/`sizes` matched to the 900/1168 px layout changes and cover geometry.
- The first hero is eager/high priority. Inactive hero URLs remain in `data-*`
  until requested. The next image begins loading at 5.5 seconds, is decoded before
  a 7-second transition, and the previous slide remains visible on failures.
  Manual navigation follows the same decode gate. Reduced motion, Save-Data and
  background tabs disable automatic work. The first slide works without scripts.
- Amenity, attraction, footer/partner and gallery images lazy-load and decode
  asynchronously. Gallery cards use thumbnails; a decoded 1600 px WebP is fetched
  only when its lightbox item is requested, with JPEG fallback.
- The six-second about video uses `preload="none"`, a 29 KB poster, native
  controls and a keyboard-accessible fallback play button. Its URL is assigned
  when the video enters the viewport, then muted playback starts automatically.
  It pauses off-screen or in a background tab; reduced-motion and Save-Data users
  retain manual playback. A `<noscript>` video link remains.
- The unchanged Wikimedia WhatsApp SVG is now local and fingerprinted. See
  `THIRD-PARTY-NOTICES.md` for source, public-domain copyright statement and
  trademark notice.
- `pnpm build` writes content-hashed assets and updated references to `dist/`.
  Hashes cover bytes with SHA-256 (16 hex characters). HTML and the provenance
  manifest are not hashed and must revalidate.

## Verification performed

- Browser checks at 390x844, 768x1024 and 1440x900 covered home, mobile menu,
  all manual hero targets, about video play, off-screen page behavior, gallery
  expansion, full lightbox navigation/close and the locally hosted WhatsApp icon.
- The scripting-disabled preview rendered the first hero and retained working
  booking links. Original and final screenshots were visually compared; source
  geometry, cover cropping, transparency and layout were preserved.
- `pnpm test` checks failed-image behavior, decode gating, latest-request wins,
  automatic navigation, visible video autoplay, preference fallbacks and off-screen
  pause. It validates every build reference, image dimensions, unchanged forms
  and NightsBridge/WhatsApp destinations, deterministic hashes and idempotence.
- 583 hashed assets plus five HTML pages were HEAD-checked from the preview. All
  responded 200. Hashed assets returned `public, max-age=31536000, immutable`;
  HTML and `asset-manifest.json` returned `no-cache`.
- 605 referenced image variants were decoded and checked for no upscaling, expected
  dimensions and transparent logo alpha. Source originals matched the baseline.
- Final Lighthouse page loads and Browser checks reported no JavaScript errors,
  unexpected 404s, blank requested slides or booking/form destination changes.

Form submission, external booking, outbound WhatsApp/Facebook/partner links and
production cache behavior were intentionally not triggered. Visual review used
local Chrome/browser rendering; no physical iOS/Android devices or low-end GPU
were available. Live LiteSpeed headers were inspected only with a read-only HEAD
request. Production compression, CDN cache and server module support remain to
be verified by the host after deployment.

Reduced-motion and Save-Data branches were exercised through deterministic unit
tests; this browser tool did not expose OS-preference emulation. The video has
no autoplay path in any mode. These are single before/final runs per device
preset, not a median of repeated lab runs or real-user field measurements;
third-party response times can vary. Minor final corrections to unused gallery
variant-height metadata did not change the audited home HTML/CSS/JS or media.

## Regenerate media and hashes

Use Node 24.8 or later (updated toolchain requirement). From the project root:

```sh
pnpm install --frozen-lockfile
pnpm media
pnpm build
pnpm test
pnpm preview
```

1. Replace or add the original photograph under `assets/images/`. Do not edit
   `assets/optimized/` or `assets/media-manifest.json`.
   The header deliberately reuses `assets/images/logos/brownlogo-180.png`; if the
   approved branding changes, update that 180x180 transparent PNG alongside its
   large master. The footer variants are generated from `trans-logo.png`.
2. If a gallery photo is new, add its source path and descriptive alternative text to `src/data/gallery.json`.
3. Run `pnpm media`. The source digest sidecars skip unchanged conversions;
   originals are never overwritten. Wait for it to finish before building.
4. Run `pnpm build`, `pnpm test`, then preview `http://127.0.0.1:8080`.
5. Deploy only `dist/`, while retaining old fingerprinted assets for at least the
   HTML/CDN cache lifetime so clients with a briefly cached old page do not 404.

`ffmpeg-static` supplies poster extraction. If its lifecycle script was blocked,
allow only the declared `sharp` and `ffmpeg-static` entries in
`pnpm-workspace.yaml`, reinstall, and rerun. The media task fails loudly if FFmpeg
is absent; it does not silently omit the poster.

## Remaining deployment steps

The earlier audit observed `Server: LiteSpeed`. The maintainability refactor now sets
local `netlify.toml` to build and publish `dist`; that does not configure or verify
the actual live host. Before publishing:

1. Confirm the actual document root and deployment method with the host. Point it
   at the contents of `dist/`, not the repository root. Back up/merge, never
   overwrite, the active routing/security/handler configuration.
2. Ask whether the account accepts Apache-compatible `.htaccess`, `mod_headers`
   directives and the required `image/avif`/`image/webp` MIME types. Only after
   confirmation, adapt and merge `deployment/litespeed-cache.example.conf`.
3. If production is actually Netlify, use the generated
   `deployment/netlify-headers.example` as the reviewed basis for `dist/_headers`.
   Do not apply both paths blindly.
4. Enable Brotli or gzip for HTML, CSS, JavaScript, SVG and JSON if the host has
   not already done so. Do not compress JPEG/WebP/AVIF/MP4 again.
5. After a staged deployment, repeat HEAD checks against several hashed assets,
   `/`, an `.html` page and `asset-manifest.json`; then rerun the cold audits.

Only URLs containing a content hash should receive `immutable`. HTML and
`asset-manifest.json` should revalidate (`no-cache`). Unhashed source files must
not receive a one-year immutable lifetime.
