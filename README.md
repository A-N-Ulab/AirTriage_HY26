# AirTriage_HY26

AirTriage is a Vite single-page experience with three independent parts:

1. a two-second AirTriage logo splash;
2. a local intro film that plays to completion without controls;
3. a lazy-loaded, scrollable project page with a manually scrubbed terrain film.

The intro hands off without a page reload. `Escape`, an intro-media error, or a
30-second playback stall still reveals the page.
The intro film starts buffering immediately and keeps exclusive media bandwidth
until the browser reports that it can play through. Only then does the page film
receive its `src`; skipping or failing the intro releases it immediately.

## Post-intro page

`src/experience/index.js` renders the page after the intro. Its large top film is
`public/video/film_2.mp4`. The film:

- never autoplays and has no native or custom playback controls;
- starts paused at exactly half of its duration;
- moves forward when dragged right and backward when dragged left;
- supports mouse, pen, and touch through Pointer Events;
- shows readable fallback copy if the media cannot load.

The page begins with `Nasze przykłady`, whose two example-film cards show a
YouTube poster and only load the player on click, from the privacy domain.
`Widok operatora` follows with the interactive film and a four-person operator
panel. `Algorytm` then presents the POC decision flow, measurement thresholds,
limitations, and `Poparcie naukowe` as compact semantic HTML.
Rapid pointer moves are coalesced and an in-progress seek finishes before the
latest requested frame is applied, avoiding overlapping decoder work. The MP4
stores its metadata first and uses keyframes every 200 ms for responsive seeks.

The operator view is a prepared POC scenario, not live analysis. Offline
tracking produces `src/experience/operator-scenario.json`, with one bounding box
per source frame for exactly four selected people. `operator-overlay.js` keeps
the JSON, panel selection, and SVG marks synchronized with film scrubbing, while
`operator-overlay.css` provides the translucent desktop rail and mobile bottom
sheet. Four illustrative WebP close-ups live in `public/operator/`; they help
explain the interface and are not identity-verification material. All HR, RR,
status, close-up, and position data are static demonstration values.

## Architecture

```text
src/
|-- main.js                     # intro and lazy page orchestration
|-- demo-loader.js              # shared loading/ready/error/retry state
|-- style.css                   # global tokens, type system and shell
|-- i18n/                       # Polish/English dictionaries and language runtime
|-- intro/                      # logo, intro film, and timeline
`-- experience/
    |-- index.js                # semantic page markup and lifecycle
    |-- operator-scenario.json # prepared four-person frame data
    |-- operator-overlay.js    # panel/SVG interaction and synchronization
    |-- operator-overlay.css   # desktop rail and mobile bottom sheet
    |-- scrub-video.js          # drag-to-scrub controller
    `-- experience.css          # responsive page presentation
```

The intro never imports the page. `src/main.js` dynamically imports
`src/experience/index.js`, keeping the opening bundle small. The public page
contract is:

```js
createExperience({ container, onProgress, videoLoadGate })
```

It returns a `{ destroy() }` controller.

## Languages

Polish is the default and needs no JavaScript: the copy lives inline in the
markup, and `data-i18n` keys mark what `applyTranslations` swaps. The header
carries a `PL`/`EN` switch in its top-right corner.

- `?lang=en` boots English; `?lang=pl` forces Polish and overrides a stored
  choice. Otherwise the last choice from `localStorage` is used, then Polish.
- Switching updates `?lang=`, `localStorage` and `<html lang>` without a reload.
- `src/i18n/pl.js` owns the key set and `src/i18n/en.js` must mirror it;
  `test/i18n.test.mjs` fails on any missing or orphaned key.
- Polish is bundled with the entry chunk. English is a separate lazy chunk that
  is only fetched when a visitor actually asks for it.
- Operator panel wording comes from `*En` fields on
  `operator-scenario.json`; numeric data (HR, RR, frame boxes) is never
  translated.

## Development

Requires Node.js 20+ and npm.

```bash
npm install
npm run dev
```

Verification commands:

```bash
npm test
npm run build
npm run preview
npm run test:render
```

The Node suite covers the intro timeline, loading/error behavior, lazy module
boundary, brand asset, drag calculations, and MP4 seek metadata. The Playwright
suite covers the full intro handoff, desktop/mobile layout, scientific content,
operator-panel selection and geometry, midpoint initialization, dragging,
fallback copy, and failed/delayed chunks.
Set `PLAYWRIGHT_CHROMIUM_PATH` to an existing Chrome or Chromium binary when the
bundled browser is unavailable.

## Deployment

Pushing to `main` starts `.github/workflows/deploy-pages.yml`. Vite builds the
site at the domain root, and `public/CNAME` publishes it at:

<https://airtriage.anulab.tech/>

## Assets and fonts

- `public/video/RYSY_demo_20s_dopracowany.mp4` — fast-start 1080p intro film
  optimised to about 14.6 MiB.
- `public/video/film_2.mp4` — paused, drag-scrubbed page film.
- `public/operator/*.webp` — four illustrative operator-panel close-ups.
- `public/brand/airtriage-logo.svg` — production vector logo.
- Inter loads from Google Fonts. HK Modular is used locally when licensed and
  available, with Inter as the fallback.
