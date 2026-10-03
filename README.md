# AirTriage_HY26

AirTriage is a Vite single-page experience with two deliberately independent parts:

1. a lightweight branded film intro that starts immediately;
2. a lazy-loaded Three.js terrain demo that downloads in the background.

The intro hands off without a page reload. If the demo is still loading, the visitor
sees a full-screen progress surface. A failed module download or unavailable WebGL
renderer produces a readable error with a Retry button rather than an empty canvas.

## Architecture

`src/main.js` is the only coordinator. It starts the intro, schedules the dynamic demo
import after first paint, and maps loader events to the page shell. The intro never
imports Three.js or any demo source.

```text
src/
|-- main.js                 # intro/demo orchestration only
|-- demo-loader.js          # loading, ready, error and retry states
|-- style.css               # shared shell and loading/error presentation
|-- intro/
|   |-- index.js            # video overlay and public playIntro API
|   |-- timeline.js         # DOM-independent intro state machine
|   `-- intro.css           # intro-only presentation
`-- demo/
    |-- index.js            # public createDemo API and Three.js runtime
    |-- terrain.js          # deterministic terrain geometry and colors
    `-- demo.css            # canvas and terrain HUD presentation
```

The boundary between the shell and demo is:

```js
createDemo({ container, onProgress })
```

It resolves after the first rendered frame and returns `{ destroy() }`. This keeps demo
development inside `src/demo/` and allows the film to evolve independently in
`src/intro/`.

## Intro sequence

`src/intro/index.js` plays a short wordmark and drone-film sequence:

| Beat | Duration | What happens |
| --- | --- | --- |
| `title` | 1000 ms | AirTriage wordmark and accent enter |
| `dissolve` | 600 ms | Wordmark dissolves into the film |
| `cruise` | 4000 ms | Muted drone footage and Skip control |
| `handoff` | 600 ms | Film fades toward the loading/demo shell |
| `settle` | 800 ms | The underlying shell is revealed |

The film is a muted `youtube-nocookie.com` embed. `Escape` or **Skip** jumps to the
handoff. Blocked autoplay displays **Tap to begin** and can never trap the visitor.

## Background loading and failures

After the first paint, `src/main.js` dynamically imports `src/demo/index.js`. Vite emits
the demo and Three.js as a separate chunk, so they do not delay the initial entry bundle.

The progress bar reports real application stages: module request, module loaded, terrain
generation, camera setup, renderer setup, and first frame. A slow demo remains on the
loader after the film. Import, WebGL, and initialization failures switch to
**Demo unavailable** with Retry.

Visitors without JavaScript still receive the static `BIG COMING SOON ...` fallback.

## Terrain demo

The current demo generates a deterministic mountain without downloading a model. A
dense plane is displaced with layered noise and a central massif envelope. Vertex
colors blend forest, alpine vegetation, exposed rock, and snow using both elevation and
slope. Atmospheric fog, soft directional light, capped pixel ratio, and a lower mobile
mesh resolution keep the result map-like and responsive.

Controls:

- drag or swipe to orbit;
- scroll or pinch to zoom;
- the camera rotates slowly until the first interaction;
- `prefers-reduced-motion: reduce` disables automatic rotation.

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
npx playwright install chromium
npm run preview
npm run test:render
```

`npm test` covers module boundaries, loader failure states, progress monotonicity, and
terrain geometry. The Playwright suite covers desktop/mobile rendering, delayed chunks,
failed chunks, Retry, and reduced motion. Set `PLAYWRIGHT_BASE_URL` when previewing on a
non-default address. `PLAYWRIGHT_CHROMIUM_PATH` may point at an existing Chrome/Chromium
binary when the bundled browser is unavailable.

## Deployment

Pushing to `main` runs `.github/workflows/deploy-pages.yml`. Vite uses `base: '/'`, and
`public/CNAME` publishes the custom domain:

<https://airtriage.anulab.tech/>

The Pages workflow also runs the custom-domain regression check before building.

## Fonts and third-party media

Inter loads from Google Fonts. HK Modular is a paid Hanken Design Co font; the CSS uses
a local copy when present and falls back to Inter. Licensed font files can be placed in
`public/fonts/` and referenced by the existing `@font-face` declaration.

The intro film remains hosted by its original YouTube uploader and is streamed rather
than redistributed by this repository.
