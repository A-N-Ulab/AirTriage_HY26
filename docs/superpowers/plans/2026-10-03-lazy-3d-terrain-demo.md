# Lazy 3D Terrain Demo Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the post-intro Coming Soon screen with a separately developed, background-loaded 3D terrain demo and a resilient loading/error handoff.

**Architecture:** Keep the intro in a self-contained eagerly loaded folder, and load the demo through one dynamic import owned by a small orchestration module. The demo owns Three.js, procedural terrain, controls, and cleanup; the page shell owns loading, error, retry, and crossfade states.

**Tech Stack:** Vite 8, vanilla ES modules, Node test runner, Three.js with OrbitControls, Playwright/Chromium for render verification, GitHub Pages.

**Spec:** `docs/superpowers/specs/2026-10-03-lazy-3d-terrain-demo-design.md`

## Global Constraints

- Deliver exactly one commit directly on `main`; amend the existing local design commit after each task and push only after final verification.
- The intro must not import Three.js or any file under `src/demo/`.
- Three.js must be in a lazy demo chunk, not the initial entry chunk.
- Keep a no-JavaScript `BIG COMING SOON ...` fallback in `index.html`.
- The handoff must never expose an empty canvas.
- Reduced motion disables automatic orbit and minimizes transitions.
- The demo uses procedural geometry; do not add a downloadable 3D model.

## Review Focus

- Slow demo load after the film: the loading shell remains visible until the first rendered frame; pin in Task 2 unit and browser tests.
- Dynamic import, WebGL, or initialization failure: show `Demo unavailable` and a working Retry action; pin in Task 2 unit tests.
- Reduced-motion visitor: no automatic camera rotation and a short handoff; pin in Task 4 browser tests.
- Narrow/mobile viewport and resize: canvas stays full-viewport without overflow and the renderer resizes; pin in Task 4 browser tests.
- Module-boundary regression: intro remains independent and Three.js stays out of the entry chunk; pin in Tasks 1 and 3.

---

### Task 1: Isolate the Existing Intro

**Files:**
- Create: `test/module-boundaries.test.mjs`
- Create: `src/intro/index.js`
- Create: `src/intro/timeline.js`
- Create: `src/intro/intro.css`
- Modify: `src/main.js`
- Delete: `src/intro.js`
- Delete: `src/loader.js`
- Delete: `src/intro.css`
- Modify: `package.json`

**Interfaces:**
- Produces: `playIntro({ revealTarget? }): Promise<void>` from `src/intro/index.js`.
- Produces: `createIntroLoader(options)` and `PHASE` from `src/intro/timeline.js`.

- [ ] **Step 1: Add the Node test command and a failing boundary test**

Add `"test": "node --test"` to `package.json`. In `test/module-boundaries.test.mjs`, assert that `src/intro/index.js`, `timeline.js`, and `intro.css` exist; recursively read `src/intro/` and assert it contains neither `from 'three'` nor `/demo/`; assert the three legacy root files do not exist.

- [ ] **Step 2: Run the test and verify RED**

Run: `npm test -- test/module-boundaries.test.mjs`

Expected: FAIL because the folder files do not exist and the legacy files still do.

- [ ] **Step 3: Move the intro without changing behavior**

Preserve the current public interfaces and implementation while updating relative imports and `src/main.js` to import `./intro/index.js`.

- [ ] **Step 4: Run the boundary test and the production build**

Run: `npm test -- test/module-boundaries.test.mjs && npm run build`

Expected: PASS and a successful Vite build.

- [ ] **Step 5: Amend the single local commit**

Run: `git add package.json src test/module-boundaries.test.mjs && git commit --amend --no-edit`

### Task 2: Add the Lazy Loader and Resilient Shell

**Files:**
- Create: `src/demo-loader.js`
- Create: `src/demo/index.js` (temporary buildable placeholder, replaced in Task 3)
- Create: `test/demo-loader.test.mjs`
- Modify: `index.html`
- Modify: `src/main.js`
- Modify: `src/style.css`

**Interfaces:**
- Consumes: `playIntro()` from Task 1.
- Produces: `createDemoLoader({ importDemo, container, onState }): { start(): Promise<object|null> }`.
- Produces state objects `{ status, progress, message, error? }`, where status is `loading`, `ready`, or `error` and progress is `0..100`.
- Produces: `bindRetry(button, reload): () => void`, returning an event-listener cleanup function.

- [ ] **Step 1: Write failing loader-state tests**

In `test/demo-loader.test.mjs`, use deferred promises and fakes to assert:

- `start()` emits loading before the import resolves;
- progress callbacks are monotonic and ready is emitted only after `createDemo()` resolves its first frame;
- a pending first frame keeps the state loading after the intro-side handoff;
- rejected imports and rejected `createDemo()` calls emit error and resolve to `null`;
- invoking the bound Retry handler calls the injected `reload` exactly once.

- [ ] **Step 2: Run the loader tests and verify RED**

Run: `npm test -- test/demo-loader.test.mjs`

Expected: FAIL because `src/demo-loader.js` does not exist.

- [ ] **Step 3: Implement the loader state machine**

Implement the exact Task 2 interfaces. Normalize progress with `Math.max(previous, next)` and cap it at `100`. Catch both import and demo initialization failures inside `start()` so the intro can finish independently.

- [ ] **Step 4: Implement the static shell and orchestration**

Keep the no-JS heading in `index.html`, and add a JS-enhanced shell containing a status region, `<progress>`, demo mount, error copy, and Retry button. In `main.js`, start the intro immediately, schedule `import('./demo/index.js')` after first paint with `requestIdleCallback` plus a `setTimeout` fallback, map loader states to `data-state`, and use `location.reload()` for Retry.

Add a temporary `src/demo/index.js` that exports the agreed `createDemo()` signature and rejects with `Demo not implemented`; this keeps the Task 2 build valid while exercising the error shell. Task 3 replaces the placeholder.

- [ ] **Step 5: Run unit tests and build**

Run: `npm test -- test/module-boundaries.test.mjs test/demo-loader.test.mjs && npm run build`

Expected: all tests pass and the Vite build succeeds.

- [ ] **Step 6: Amend the single local commit**

Run: `git add index.html src test/demo-loader.test.mjs && git commit --amend --no-edit`

### Task 3: Build the Procedural Terrain Demo

**Files:**
- Modify: `src/demo/index.js`
- Create: `src/demo/terrain.js`
- Create: `src/demo/demo.css`
- Create: `test/terrain.test.mjs`
- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `test/module-boundaries.test.mjs`

**Interfaces:**
- Consumes: `{ container, onProgress }` from the Task 2 loader.
- Produces: `createDemo({ container, onProgress }): Promise<{ destroy(): void }>`; resolve only after the first successful frame.
- Produces: `terrainHeight(x, z, seed): number` and `createTerrainGeometry({ size, segments, seed }): THREE.BufferGeometry` from `src/demo/terrain.js`.

- [ ] **Step 1: Install Three.js and write failing terrain tests**

Add `three` as a production dependency. In `test/terrain.test.mjs`, assert deterministic heights for a fixed seed, a higher central massif than the outer edge average, finite positions/normals, a color attribute for every vertex, and visibly distinct low/rock/snow color bands.

- [ ] **Step 2: Run the terrain tests and verify RED**

Run: `npm test -- test/terrain.test.mjs`

Expected: FAIL because the terrain module does not exist.

- [ ] **Step 3: Implement procedural terrain**

Use a displaced `PlaneGeometry` with layered deterministic value noise, radial massif shaping, recomputed normals, and vertex colors derived from height plus slope. Use a desktop default near 160 segments and a lower mobile default; avoid cone primitives and external model assets.

- [ ] **Step 4: Implement the Three.js runtime**

In `src/demo/index.js`, create the renderer, scene, perspective camera, fog, hemisphere light, directional light, terrain mesh, and OrbitControls. Cap pixel ratio at `2`, enable damping and constrained zoom/pitch, disable auto-rotation under reduced motion, pause on hidden documents, handle resize, report progress stages, render once before resolving, and fully dispose in `destroy()`.

- [ ] **Step 5: Prove bundle separation**

Extend `test/module-boundaries.test.mjs` to require the literal dynamic import in `src/main.js`. Build and inspect `dist/assets`: assert at least one separate demo chunk contains `three` identifiers while the main entry chunk does not contain `WebGLRenderer` or `OrbitControls`.

Run: `npm test && npm run build`

Expected: all tests pass; build output lists distinct entry and demo/Three chunks.

- [ ] **Step 6: Amend the single local commit**

Run: `git add package.json package-lock.json src/demo test && git commit --amend --no-edit`

### Task 4: Polish and Verify the Browser Render

**Files:**
- Create: `test/demo-render.spec.mjs`
- Modify: `src/style.css`
- Modify: `src/demo/demo.css`
- Modify: `src/intro/intro.css`
- Modify: `package.json`
- Modify: `package-lock.json`

**Interfaces:**
- Consumes: shell `data-state` values and the Task 3 demo controller.
- Produces: `npm run test:render`, which starts against a supplied preview URL and exercises the real browser UI.

- [ ] **Step 1: Add Playwright and write failing browser tests**

Add `@playwright/test` as a development dependency and `"test:render": "playwright test test/demo-render.spec.mjs"`. Tests must:

- load the page, press Escape to skip the film, and wait for `data-state="ready"`;
- assert the canvas has non-zero dimensions and no horizontal overflow at `1440x900` and `390x844`;
- intercept the lazy demo chunk with a delay and assert the loading shell remains visible after the intro exits;
- abort the demo chunk and assert the error state and Retry button;
- emulate reduced motion and assert the shell marks auto-rotation disabled;
- capture desktop and mobile screenshots.

- [ ] **Step 2: Run browser tests and verify RED**

Run the Vite preview and then: `npm run test:render`

Expected: at least the polish, failure, or reduced-motion assertions fail before final CSS/runtime adjustments.

- [ ] **Step 3: Finish visual styling and interaction states**

Use an ivory-to-blue atmospheric background, restrained topographic status typography, a thin green progress indicator, a soft crossfade, and unobtrusive controls. Make loading/error states legible above the canvas, remove overflow at both target viewports, and expose a stable reduced-motion marker for the browser assertion.

- [ ] **Step 4: Run browser tests and inspect screenshots**

Run: `npm run test:render`

Expected: all browser assertions pass. Inspect both screenshots for terrain detail, natural elevation coloring, readable loading/error text, framing, and absence of clipping.

- [ ] **Step 5: Amend the single local commit**

Run: `git add package.json package-lock.json src test/demo-render.spec.mjs && git commit --amend --no-edit`

### Task 5: Documentation, Final Verification, and Direct Deployment

**Files:**
- Modify: `README.md`
- Modify: `docs/superpowers/plans/2026-10-03-lazy-3d-terrain-demo.md`

**Interfaces:**
- Consumes: all prior task outputs.
- Produces: one verified commit on `main` and a successful GitHub Pages deployment.

- [ ] **Step 1: Update project documentation**

Document the `intro/` and `demo/` contracts, loading/error behavior, development commands, terrain controls, and custom-domain root deployment. Remove the stale `/AirTriage_HY26/` base-path statement.

- [ ] **Step 2: Run complete local verification**

Run: `npm test && npm run build && npm run test:render && git diff --check`

Expected: zero test failures, successful build, successful desktop/mobile browser tests, and no diff errors. Record the Vite chunk-size warning separately if it remains; it is not a correctness failure when Three.js is lazy.

- [ ] **Step 3: Review the final diff against the spec**

Confirm every acceptance criterion in the spec has direct test/build/render evidence and confirm `git log origin/main..HEAD --oneline` contains exactly one commit.

- [ ] **Step 4: Amend the final documentation into the same commit**

Run: `git add README.md docs src test package.json package-lock.json index.html && git commit --amend --no-edit`

- [ ] **Step 5: Push directly to main and verify deployment**

Run: `git push origin main`, watch the Pages workflow to success, then verify `https://airtriage.anulab.tech/` returns HTTPS 200 and its generated JS/CSS assets return 200.
