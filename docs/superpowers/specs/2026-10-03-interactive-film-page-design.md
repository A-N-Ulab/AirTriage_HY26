# Interactive Film Page Design

## Goal

Replace the full-screen Three.js mountain shown after the existing intro with a responsive, scrollable AirTriage page based on `opis_strony.png`.

## Experience

- Keep the existing logo and intro-film sequence unchanged.
- Reveal the page only when the intro finishes, including when the intro is skipped or fails.
- Use `/video/film_2.mp4` as the large interactive film at the top of the page.
- The interactive film never autoplays and exposes no native or custom playback controls.
- Once metadata is available, seek the film to exactly half of its duration and keep it paused.
- Dragging horizontally over the film scrubs it: right advances and left rewinds. Clamp seeking to the film bounds and support mouse, pen, and touch through Pointer Events.
- Show a short drag instruction as non-interactive overlay copy and a clear fallback message if the media cannot load.

## Page structure

- A compact AirTriage header provides anchor-style tabs for `Nasze przykłady`, `Nasz wkład`, and `Poparcie naukowe`.
- `Nasze przykłady` appears first and contains two side-by-side example cards on desktop and a single column on small screens.
- Until the two example films arrive, each card shows an explicit alternative-text placeholder rather than a broken or empty video.
- `Nasz wkład` appears below the examples and contains the interactive film captioned `Widok operatora dronu`.
- All descriptive copy remains the placeholder `Tu będzie opis`.
- `Poparcie naukowe` contains its heading and the same placeholder copy.

## Visual direction

Retain the existing cream, forest-green, restrained AirTriage identity. Use generous spacing, soft borders, and editorial typography so the page feels like a finished continuation of the intro rather than a wireframe. The interactive film is the dominant element.

## Architecture

- Preserve the intro as an independent subsystem.
- Replace the lazy Three.js demo module with a lazy page module.
- Put drag-to-scrub calculations and pointer lifecycle in a focused controller module with unit tests. Coalesce rapid pointer input and wait for an active media seek to finish before applying the latest requested time.
- Keep the page markup and lifecycle in the experience module, with styles colocated in its stylesheet.
- Remove the unused Three.js terrain code and dependency.

## Failure and accessibility behavior

- The page content remains usable when the interactive film fails.
- Anchor navigation uses semantic links and sections.
- The film surface has an accessible label describing the drag interaction.
- Reduced-motion users receive the same paused, manually scrubbed experience without added animation.
