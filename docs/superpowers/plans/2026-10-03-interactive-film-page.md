# Interactive Film Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the post-intro Three.js terrain with the responsive AirTriage page and drag-scrubbed `film_2.mp4` experience.

**Architecture:** The intro remains unchanged and reveals a lazily loaded experience module. A pure, separately tested scrub calculation powers a Pointer Events controller; the page module renders semantic sections and owns the controller lifecycle.

**Tech Stack:** Vite, vanilla JavaScript, CSS, Node test runner, Playwright

**Spec:** `docs/superpowers/specs/2026-10-03-interactive-film-page-design.md`

## Global Constraints

- Keep the existing logo and intro-film sequence unchanged.
- `/video/film_2.mp4` starts paused at 50% duration and has no native or custom playback controls.
- Horizontal dragging is the only film manipulation: right advances, left rewinds.
- All description copy is exactly `Tu będzie opis`.
- Missing example films render readable text placeholders.
- Preserve the cream and forest-green AirTriage identity.

## Review Focus

- Film metadata may arrive after page construction; midpoint seeking must happen on metadata readiness.
- A drag can exceed either edge; calculated time must stay between zero and duration.
- Touch dragging must not scroll the film surface or leave a stuck dragging state after cancellation.
- A failed `film_2.mp4` must reveal fallback copy while the remaining page stays usable.
- The two example cards must stack without horizontal overflow on narrow screens.

---

### Task 1: Drag-to-scrub controller

**Files:**
- Create: `src/experience/scrub-video.js`
- Create: `test/scrub-video.test.mjs`

**Interfaces:**
- Produces: `calculateScrubTime({ startTime, deltaX, width, duration }) -> number`
- Produces: `createScrubController({ video, surface }) -> { destroy() }`

- [ ] **Step 1: Write failing unit tests** for midpoint initialization, right/left drag direction, and clamping at both duration bounds.
- [ ] **Step 2: Run `node --test test/scrub-video.test.mjs`** and confirm failure because the module does not exist.
- [ ] **Step 3: Implement the pure calculation and Pointer Events controller**, including metadata timing, pointer capture, pause enforcement, cancel cleanup, and error state.
- [ ] **Step 4: Run `node --test test/scrub-video.test.mjs`** and confirm all tests pass.

### Task 2: Responsive post-intro page

**Files:**
- Create: `src/experience/index.js`
- Create: `src/experience/experience.css`
- Modify: `index.html`
- Modify: `src/main.js`
- Modify: `src/style.css`
- Modify: `test/module-boundaries.test.mjs`
- Modify: `test/demo-render.spec.mjs`
- Delete: `src/demo/index.js`
- Delete: `src/demo/demo.css`
- Delete: `src/demo/terrain.js`
- Delete: `test/terrain.test.mjs`

**Interfaces:**
- Consumes: `createScrubController({ video, surface })`
- Produces: `createExperience({ container, onProgress, onError }) -> Promise<{ destroy() }>`

- [ ] **Step 1: Change boundary and browser tests first** to require the lazy experience, semantic sections, midpoint-paused film, drag behavior, media fallback, placeholders, and mobile layout.
- [ ] **Step 2: Run the Node suite** and confirm failures name the old demo boundary or missing experience.
- [ ] **Step 3: Implement the semantic page and visual design**, preserving the intro handoff while replacing demo-specific markup and state copy.
- [ ] **Step 4: Copy the supplied binary asset** from `dist/video/film_2.mp4` to `public/video/film_2.mp4` so clean builds publish it.
- [ ] **Step 5: Remove Three.js and the obsolete terrain files**, then update package metadata and test scripts.
- [ ] **Step 6: Run the Node suite and production build** and confirm both pass.
- [ ] **Step 7: Run Playwright render tests** and inspect desktop/mobile screenshots when browser policy allows.

### Task 3: Verify and publish

**Files:**
- Modify: `README.md` only if existing run instructions need correction.

**Interfaces:**
- Consumes: the complete experience from Tasks 1 and 2.
- Produces: a verified commit on `main` and successful GitHub Pages workflow.

- [ ] **Step 1: Run the full test suite and clean production build** and confirm the built output includes both video assets.
- [ ] **Step 2: Review the diff for accidental changes**, especially the user-supplied `opis_strony.png`.
- [ ] **Step 3: Commit the implementation** without adding the reference image unless intentionally required at runtime.
- [ ] **Step 4: Push `main` to `origin`** and monitor the publication workflow to completion.
- [ ] **Step 5: Verify the live URL returns successfully.**

