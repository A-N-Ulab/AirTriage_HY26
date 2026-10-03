# AirTriage_HY26

AirTriage is a Vite single-page experience with three independent parts:

1. a two-second AirTriage logo splash;
2. a local intro film that plays to completion without controls;
3. a lazy-loaded, scrollable project page with a manually scrubbed terrain film.

The intro hands off without a page reload. `Escape`, an intro-media error, or a
30-second playback stall still reveals the page.

## Post-intro page

`src/experience/index.js` renders the page after the intro. Its large top film is
`public/video/film_2.mp4`. The film:

- never autoplays and has no native or custom playback controls;
- starts paused at exactly half of its duration;
- moves forward when dragged right and backward when dragged left;
- supports mouse, pen, and touch through Pointer Events;
- shows readable fallback copy if the media cannot load.

The page includes anchor tabs for the film, `Nasz wkład`, and
`Poparcie naukowe`. The two example-film cards intentionally use text
placeholders until their media is supplied.

## Architecture

```text
src/
|-- main.js                     # intro and lazy page orchestration
|-- demo-loader.js              # shared loading/ready/error/retry state
|-- style.css                   # global tokens and shell presentation
|-- intro/                      # logo, intro film, and timeline
`-- experience/
    |-- index.js                # semantic page markup and lifecycle
    |-- scrub-video.js          # drag-to-scrub controller
    `-- experience.css          # responsive page presentation
```

The intro never imports the page. `src/main.js` dynamically imports
`src/experience/index.js`, keeping the opening bundle small. The public page
contract is:

```js
createExperience({ container, onProgress })
```

It returns a `{ destroy() }` controller.

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
boundary, brand asset, and drag calculations. The Playwright suite covers the
full intro handoff, desktop/mobile layout, midpoint initialization, dragging,
fallback copy, and failed/delayed chunks. Set `PLAYWRIGHT_CHROMIUM_PATH` to an
existing Chrome or Chromium binary when the bundled browser is unavailable.

## Deployment

Pushing to `main` starts `.github/workflows/deploy-pages.yml`. Vite builds the
site at the domain root, and `public/CNAME` publishes it at:

<https://airtriage.anulab.tech/>

## Assets and fonts

- `public/video/RYSY_demo_20s_dopracowany.mp4` — intro film.
- `public/video/film_2.mp4` — paused, drag-scrubbed page film.
- `public/brand/airtriage-logo.svg` — production vector logo.
- Inter loads from Google Fonts. HK Modular is used locally when licensed and
  available, with Inter as the fallback.
