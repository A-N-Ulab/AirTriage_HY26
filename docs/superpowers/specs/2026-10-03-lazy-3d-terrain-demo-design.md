# Lazy 3D Terrain Demo Design

## Goal

Keep the current AirTriage intro fast and independently maintainable while a
separate 3D demo downloads in the background. When the intro film finishes,
the page hands off without a reload to either the ready demo or a visible
loading state. The first demo is a polished, map-like mountain scene viewed by
an orbiting camera.

## User experience

1. The existing wordmark and film intro starts immediately.
2. After the first browser paint, the application begins a dynamic import of
   the demo module. Three.js must not be part of the initial JavaScript chunk.
3. A full-screen `Loading demo` surface with a progress bar sits beneath the
   intro overlay.
4. At the intro handoff:
   - a ready demo crossfades in immediately;
   - a pending demo leaves the loading surface visible until its first frame;
   - a failed demo shows `Demo unavailable` and a Retry button instead of a
     blank canvas.
5. The finished demo fills the viewport. The camera orbits the mountain slowly
   and supports restrained pointer/touch orbit controls.

The progress bar represents observable application stages rather than fake
byte-level download progress: import started, module loaded, terrain created,
renderer ready, and first frame rendered. While an individual asynchronous
stage is pending, the bar may ease toward the next stage but must not claim
100% before the first frame.

## Module boundaries

```text
src/
|-- main.js                 # orchestration only
|-- style.css               # shared shell and loading/error states
|-- intro/
|   |-- index.js            # intro DOM, video, and public playIntro API
|   |-- timeline.js         # intro state machine
|   `-- intro.css           # intro-only presentation
`-- demo/
    |-- index.js            # public createDemo API
    |-- terrain.js          # procedural terrain geometry and colors
    `-- demo.css            # canvas and demo-only presentation
```

`main.js` may import the intro normally, but it may access the demo only with
`import('./demo/index.js')`. The intro module must not import Three.js or any
demo file. The demo exposes one narrow entry point:

```js
createDemo({ container, onProgress })
```

It resolves after the first successful frame and returns a controller with a
`destroy()` method. This boundary allows the intro and demo to be developed
without editing each other's internals.

## Loading and handoff orchestration

The initial HTML keeps a meaningful `BIG COMING SOON ...` fallback for visitors
without JavaScript. With JavaScript enabled, `main.js` turns that region into
the loading/demo shell and starts the intro.

The demo import begins after the first paint, using `requestIdleCallback` when
available and a short `setTimeout` fallback otherwise. The intro promise and
the demo first-frame promise run independently. The intro owns only its exit
animation; `main.js` owns the decision to reveal loading, ready, or error
states.

The normal transition is a CSS opacity crossfade. No route change, iframe, or
page reload occurs. With `prefers-reduced-motion: reduce`, the crossfade is
shortened and automatic camera rotation is disabled.

## Terrain rendering

The demo uses Three.js in its lazy chunk and no downloadable 3D model. A dense
plane geometry is displaced into deterministic terrain with layered fractal
noise and a shaped central massif. Normals are recomputed after displacement.
Vertex colors blend by elevation and slope across forest, rock, scree, and
snow bands, avoiding the appearance of a primitive cone.

The scene combines:

- a perspective camera on a constrained orbit;
- physically plausible directional and hemispheric light;
- soft shadows where performance permits;
- atmospheric fog and a restrained sky/background gradient;
- high roughness terrain material with vertex colors;
- OrbitControls with damping, limited zoom and pitch, and slow auto-rotation.

Pixel ratio is capped and terrain resolution is selected conservatively for
mobile performance. Resize and visibility changes must update or pause the
renderer. `destroy()` removes listeners, stops animation, and disposes of
geometries, materials, controls, and the renderer.

## Failure handling

- If the dynamic import or scene initialization rejects, the shell changes to
  an accessible error state and retains the page branding.
- Retry reloads the page, providing a clean retry for both failed module
  downloads and lost WebGL contexts.
- If WebGL is unavailable, the same error state is used with a clear message.
- The intro must always finish independently of demo success.
- A slow load continues to show progress and `Preparing terrain...`; it never
  exposes an empty canvas.

## Accessibility and interaction

- Loading text uses an `aria-live="polite"` status region.
- The progress element exposes its current value.
- The canvas has a descriptive accessible label.
- The Retry control is keyboard accessible with a visible focus state.
- Reduced-motion preferences disable camera auto-rotation and minimize the
  handoff animation.
- Pointer controls must not prevent normal page behavior outside the canvas.

## Verification

Implementation is accepted when all of the following are true:

1. Automated tests prove the intro and demo folders remain separated and the
   entry point uses a dynamic demo import.
2. Loader state tests cover pending, ready, failed, and retry behavior.
3. `npm run build` succeeds and produces a separate demo/Three.js chunk.
4. The initial entry chunk does not contain Three.js.
5. A browser render is captured and visually inspected at desktop and mobile
   viewport sizes.
6. The live page completes the intro, displays loading if necessary, and then
   shows a working terrain orbit without console errors.

## Delivery constraint

All implementation and documentation changes are delivered as one commit
directly on `main`, as requested. No pull request is created.
