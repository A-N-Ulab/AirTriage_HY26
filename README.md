# AirTriage_HY26

A lightweight Vite-based single-page site for the AirTriage HY26 workstream: a short
intro sequence (wordmark → drone footage) that hands off to a "big coming soon" screen.

## The intro sequence

`src/intro.js` plays a ~7s intro over the page, then reveals the coming-soon screen:

| Beat | Duration | What happens |
| --- | --- | --- |
| `title` | 1000ms | `AirTriage` wordmark, letters rise with a 40ms stagger, accent rule expands |
| `dissolve` | 600ms | Wordmark scales up + blurs out; video fades up beneath it |
| `cruise` | 4000ms | Drone footage with a slow push-in, corner lockup, **Skip →** button |
| `handoff` | 600ms | Video dissolves out to the page background |
| `settle` | 800ms | `BIG COMING SOON ...` fades and scales in |

A 2px progress bar tracks the whole sequence. **Skip →** or `Escape` jumps straight to
the hand-off.

`src/loader.js` owns the timeline and has no DOM or video knowledge; `src/intro.js` owns
the overlay markup and the embed. Split this way so the video source can be swapped
without touching the timing logic.

### The video

The footage is a muted, autoplaying YouTube embed (`youtube-nocookie.com`), trimmed to the
window set by `SEGMENT_START` / `SEGMENT_END` in `src/intro.js`. Playback must be muted
for browsers to allow autoplay.

Graceful degradation, so the intro can never trap a visitor:

- If muted autoplay is refused, a **Tap to begin** pill appears; tapping retries playback.
- If the embed never reports playback within 1.5s, the intro continues anyway.
- If JavaScript is disabled, the coming-soon screen renders directly.
- `prefers-reduced-motion: reduce` drops the push-in, the letter stagger and the blur.

> The footage is third-party drone footage owned by its uploader. It is streamed from
> YouTube and not redistributed here. Swap `SEGMENT_START` / `SEGMENT_END` to pick a
> different moment.

## Design tokens

Defined once in `src/style.css` as CSS custom properties:

| Token | Value | Use |
| --- | --- | --- |
| `--bg` | `#fef2e4` | Page background, and the wash over the footage |
| `--primary` | `#355f47` | Titles, wordmark, lockup, progress bar |
| `--secondary` | `#5d7065` | Supporting text |
| `--font-title` | `HK Modular` → `Inter` | Wordmark and headings |
| `--font-body` | `Inter` | Everything else |

### Fonts

`Inter` loads from Google Fonts. **HK Modular is a paid licence** from
[Hanken Design Co](https://hanken.co) with no public CDN, so `src/style.css` only declares
a `local()` source. To use it, drop the licensed webfont into `public/fonts/` and add it to
the `@font-face`:

```css
src: url('/fonts/HKModular.woff2') format('woff2');
```

Until then the title stack falls back to Inter.

## Run locally

### Prerequisites

- Node.js 18+ (recommended)
- npm

### Install dependencies

```bash
npm install
```

### Start development server

```bash
npm run dev
```

### Build for production

```bash
npm run build
```

### Preview production build

```bash
npm run preview
```

`vite.config.js` sets `base: '/AirTriage_HY26/'` because the site is served from a
subdirectory on GitHub Pages.

## Deploy

Pushing to `main` runs `.github/workflows/deploy-pages.yml`, which builds `dist/` and
publishes it to GitHub Pages.

## File structure

```text
AirTriage_HY26/
├── public/                 # Static assets copied as-is
│   └── favicon.png
├── src/
│   ├── intro.css           # Intro overlay styles and phase states
│   ├── intro.js            # Overlay DOM + YouTube embed controller
│   ├── loader.js           # Intro timeline state machine (no DOM)
│   ├── main.js             # Entry: reveals the screen, starts the intro
│   └── style.css           # Design tokens + coming-soon screen
├── index.html              # App entry HTML
├── package.json
├── vite.config.js          # Vite configuration (base path)
└── .github/workflows/
    └── deploy-pages.yml    # GitHub Pages deployment
```