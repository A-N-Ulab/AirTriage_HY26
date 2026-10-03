# AirTriage Operator Overlay Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Dodać wariant A3 bezpośrednio na filmie interaktywnego demo: dokładnie cztery ręcznie zweryfikowane osoby, klatkowe oznaczenia, półprzezroczysty panel operatora i statyczne dane POC.

**Architecture:** OpenCV działa tylko w narzędziu offline, które na podstawie ręcznych klatek kontrolnych generuje 278-klatkowy JSON. Aplikacja Vite ładuje ten scenariusz, rysuje nad istniejącym filmem SVG dopasowane do `object-fit: cover` i utrzymuje jeden stan wyboru wspólny dla panelu i oznaczeń; dotychczasowy kontroler przeciągania pozostaje właścicielem czasu filmu.

**Tech Stack:** JavaScript ES modules, Vite, semantic HTML, CSS, SVG, Node test runner, Playwright, Python 3 + OpenCV/Pillow wyłącznie offline, GitHub Pages.

**Spec:** `docs/superpowers/specs/2026-10-04-operator-overlay-design.md`

## Global Constraints

- Demo pokazuje dokładnie `person-01`–`person-04`; nie może wykryć ani dodać piątej osoby.
- Film ma `1920×1080`, `30 fps`, `278` klatek; przeglądarka nie wykonuje analizy obrazu.
- Każda klatka JSON ma cztery klucze i wyłącznie `null` albo znormalizowane `[x, y, width, height]` w zakresie `0..1`.
- `person-01` jest pierwsza, żółta i domyślnie aktywna: HR `118/min`, RR `22/min`, „Bardzo zmęczona · pozycja siedząca”.
- Przybliżenia są podpisane jako poglądowe i nie służą do potwierdzania tożsamości.
- Panel desktop ma około `19%` szerokości (`184–252 px`) i około `48%` krycia; poniżej `760 px` staje się dolnym arkuszem.
- Istniejący gest przeciągania, pauza, fallback filmu, brak autoplay i płynne seekowanie pozostają bez regresji.
- Nawigacja i główny nagłówek sekcji brzmią „Algorytm”, a nagłówek źródeł „Poparcie naukowe”.
- Publikacja następuje do `origin/main`, a produkcja działa pod `https://airtriage.anulab.tech/`.

## Review Focus

- Kliknięcie panelu lub celu osoby nie może rozpocząć scrubowania — test Playwright w Task 3 sprawdza niezmieniony `currentTime`.
- Osoba chwilowo niewidoczna nie może dostać wymyślonej ramki — testy danych w Task 1 i interakcji w Task 3 sprawdzają stan „Poza kadrem”.
- Kadrowanie `object-fit: cover` na mobile nie może rozsunąć filmu i SVG — test geometrii w Task 4 porównuje ich prostokąty.
- Uszkodzony scenariusz lub obraz nie może zablokować filmu — testy degradacji w Task 2 i Task 3 sprawdzają komunikat i placeholder.
- Wielokrotne seeki nie mogą tworzyć kolejki renderów — test jednostkowy w Task 2 sprawdza pojedyncze oczekujące `requestAnimationFrame`.

---

### Task 1: Zweryfikowane dane klatkowe i cztery przybliżenia

**Files:**
- Create: `tools/operator-tracking/requirements.txt`
- Create: `tools/operator-tracking/keyframes.json`
- Create: `tools/operator-tracking/build_scenario.py`
- Create: `tools/operator-tracking/README.md`
- Create: `test/fixtures/operator-verified-samples.json`
- Create: `src/experience/operator-scenario.json`
- Create: `public/operator/person-01-yellow.webp`
- Create: `public/operator/person-02-green.webp`
- Create: `public/operator/person-03-green.webp`
- Create: `public/operator/person-04-green.webp`
- Create: `test/operator-scenario.test.mjs`
- Modify: `.gitignore`
- Modify: `package.json`

**Interfaces:**
- Consumes: `public/video/film_2.mp4`, `dodany_panel.png` oraz cztery zatwierdzone obrazy A3 z katalogu wygenerowanych zasobów.
- Produces: scenariusz `{ video, people, frames }`; każda pozycja `frames[n].boxes[id]` to `null | [number, number, number, number]`.

Mapowanie zatwierdzonych obrazów źródłowych:

- `person-01` ← `C:\Users\piotr\.codex\generated_images\01a103be-2f1a-7d83-83da-9ad85405999b\exec-904f6d24-6fca-4f47-a755-f6abfabec1b9.png`
- `person-02` ← `C:\Users\piotr\.codex\generated_images\01a103be-2f1a-7d83-83da-9ad85405999b\exec-c3f7958b-6758-4202-a204-e607d871680c.png`
- `person-03` ← `C:\Users\piotr\.codex\generated_images\01a103be-2f1a-7d83-83da-9ad85405999b\exec-4de48bdb-ebb5-4161-9a49-81b0afcd99ee.png`
- `person-04` ← `C:\Users\piotr\.codex\generated_images\01a103be-2f1a-7d83-83da-9ad85405999b\exec-fdbf13d8-f087-4387-b735-a0ebd10dacd5.png`

- [ ] **Step 1: Write the failing scenario contract test**

Dodaj testy `scenario contains exactly four approved people`, `scenario covers every source frame` i `verified frame samples match within one source pixel`. Asercje mają sprawdzać kolejność ID, dokładne HR/RR/statusy, 278 kolejnych numerów klatek, pełny zestaw czterech kluczy i granice ramek; próbki odczytaj z `test/fixtures/operator-verified-samples.json`.

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test test/operator-scenario.test.mjs`

Expected: FAIL because `operator-scenario.json` and verified fixtures do not exist.

- [ ] **Step 3: Create the offline tracking tool and manual control data**

Przypnij `opencv-python-headless==4.12.0.88` i `Pillow==11.3.0`. Skrypt `build_scenario.py` przyjmuje `--video`, `--keyframes`, `--output`, `--preview` i `--assets-dir`; eksportuje klatki, interpoluje/śledzi wyłącznie cztery zatwierdzone ID, konwertuje obrazy A3 do WebP oraz zapisuje JSON i film kontrolny z numerem klatki i kolorowymi ramkami. Dodaj do `.gitignore` `.venv-operator/`, robocze klatki, contact sheety i `tools/operator-tracking/operator-preview.mp4`.

- [ ] **Step 4: Mark and verify the four people through all 278 frames**

Run:

```powershell
python -m venv .venv-operator
.\.venv-operator\Scripts\python -m pip install -r tools/operator-tracking/requirements.txt
.\.venv-operator\Scripts\python tools/operator-tracking/build_scenario.py --video public/video/film_2.mp4 --keyframes tools/operator-tracking/keyframes.json --output src/experience/operator-scenario.json --preview tools/operator-tracking/operator-preview.mp4 --assets-dir public/operator
```

Zacznij od czterech osób wskazanych na `dodany_panel.png`, dodaj klatki kontrolne przy zmianach perspektywy i skoryguj dryf. Obejrzyj każdą z 278 klatek preview; osoby niewidoczne zapisuj jako `null`. Po ręcznej akceptacji zapisz niezależne próbki klatek początkowych, środkowych, końcowych i klatek granicznych widoczności w fixture testowym.

- [ ] **Step 5: Run the data contract test and register it in the suite**

Dodaj `test/operator-scenario.test.mjs` do skryptu `npm test` i uruchom `npm test`.

Expected: all Node tests PASS; JSON contains exactly four people and 278 frames.

- [ ] **Step 6: Commit**

```powershell
git add .gitignore package.json tools/operator-tracking src/experience/operator-scenario.json public/operator test/operator-scenario.test.mjs test/fixtures/operator-verified-samples.json
git commit -m "feat: add verified operator scenario"
```

### Task 2: Logika klatki, walidacja i lifecycle nakładki

**Files:**
- Create: `src/experience/operator-overlay.js`
- Create: `test/operator-overlay.test.mjs`
- Modify: `package.json`

**Interfaces:**
- Consumes: `scenario` z Task 1 oraz elementy `video`, `surface`, `mount`.
- Produces: `loadOperatorScenario(importScenario?) -> Promise<object | null>`, `getFrameIndex(currentTime, videoMeta) -> number`, `normalisedBoxToPixels(box, videoMeta) -> { x, y, width, height }`, `validateOperatorScenario(scenario) -> { ok, errors }`, `createOperatorOverlay({ video, surface, mount, scenario, scheduleFrame?, cancelFrame? }) -> { selectPerson(id), render(), destroy() }`.

- [ ] **Step 1: Write failing pure-function and scheduling tests**

Dodaj testy dla zaokrąglania i ograniczania indeksu klatki, przeliczenia współrzędnych, odrzucenia piątego ID/niepełnej klatki oraz jednego oczekującego renderu przy serii zdarzeń `seeked`. Dodaj test, że `null` zwraca stan bez ramki, błędny scenariusz daje `{ ok: false }` bez wyjątku, a odrzucony dynamiczny import w `loadOperatorScenario()` zwraca `null`.

- [ ] **Step 2: Run the focused test to verify it fails**

Run: `node --test test/operator-overlay.test.mjs`

Expected: FAIL because `operator-overlay.js` does not exist.

- [ ] **Step 3: Implement the controller contract**

`loadOperatorScenario()` używa przechwytywanego dynamicznego `import('./operator-scenario.json')`, normalizuje moduł przez `module.default ?? module` i zwraca `null` po błędzie ładowania. Waliduj scenariusz przed montażem. Renderuj co najwyżej raz na klatkę animacji po `loadedmetadata`, `seeked` i zmianie wyboru; wylicz klatkę jako `round(currentTime * fps)` ograniczone do `0..277`. Stan zawiera tylko `selectedPersonId`, startowo `person-01`; `destroy()` usuwa wszystkie listenery i anuluje oczekujący render.

- [ ] **Step 4: Run unit tests**

Run: `node --test test/operator-overlay.test.mjs test/operator-scenario.test.mjs`

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add package.json src/experience/operator-overlay.js test/operator-overlay.test.mjs
git commit -m "feat: add operator overlay controller"
```

### Task 3: Interaktywny panel i oznaczenia bezpośrednio na filmie

**Files:**
- Modify: `src/experience/index.js`
- Modify: `src/experience/operator-overlay.js`
- Modify: `test/demo-render.spec.mjs`

**Interfaces:**
- Consumes: `createOperatorOverlay(...)` z Task 2 i istniejący `createScrubController({ video, surface })`.
- Produces: DOM z `[data-operator-overlay]`, `[data-person-card]`, `[data-person-target]`, `[data-person-box]`, `[data-person-pin]` oraz lifecycle połączony w `createExperience().destroy()`.

- [ ] **Step 1: Write failing browser interaction tests**

Dodaj test `selects the same one of four people from panel and film`. Sprawdź cztery karty, domyślnie rozwiniętą `person-01`, teksty `118/min`, `22/min`, żółty status, kliknięcie każdej karty i celu na filmie oraz brak piątego ID. Dodaj testy klawiatury `Enter`/`Space`, „Poza kadrem”, fallbacku przerwanego requestu do chunku scenariusza i obrazu, a także niezmiennego `video.currentTime` po kliknięciu panelu.

- [ ] **Step 2: Run the focused Playwright tests to verify they fail**

Run: `npm run build; npm run preview` w jednym terminalu, następnie `npx playwright test test/demo-render.spec.mjs -g "operator|same one of four"`.

Expected: FAIL because the overlay DOM is absent.

- [ ] **Step 3: Mount the overlay inside `.scrub-film`**

Dodaj punkt montażu po `<video>` i przed podpowiedzią przeciągania. Wygeneruj semantyczne przyciski kart i SVG `viewBox="0 0 1920 1080" preserveAspectRatio="xMidYMid slice"`. Niewybrane, widoczne osoby pokazują tylko piny; wybrana — pełną ramkę i powiększony, co najmniej 44×44 px cel kliknięcia.

- [ ] **Step 4: Isolate selection from scrubbing and add degradation**

Zatrzymaj propagację `pointerdown` wyłącznie dla elementów `[data-operator-interactive]`, aby reszta filmu nadal scrubowała. Przy błędnym scenariuszu pokaż krótki komunikat bez blokowania filmu; przy błędzie obrazu zastąp go neutralnym kaflem ID; przy błędzie filmu ukryj całą nakładkę.

- [ ] **Step 5: Run the focused browser tests**

Run: `npx playwright test test/demo-render.spec.mjs -g "operator|same one of four|main film"`

Expected: PASS; wybór działa w obie strony, film pozostaje zatrzymany i da się przeciągać poza panelem.

- [ ] **Step 6: Commit**

```powershell
git add src/experience/index.js src/experience/operator-overlay.js test/demo-render.spec.mjs
git commit -m "feat: connect operator panel to scrub film"
```

### Task 4: Wariant wizualny A3 na desktopie i mobile

**Files:**
- Create: `src/experience/operator-overlay.css`
- Modify: `src/experience/index.js`
- Modify: `src/experience/experience.css`
- Modify: `test/demo-render.spec.mjs`

**Interfaces:**
- Consumes: data attributes i klasy tworzone przez Task 3.
- Produces: lewy, półprzezroczysty rail A3 na desktopie oraz dolny arkusz poniżej `760 px`.

- [ ] **Step 1: Write failing geometry and responsive tests**

Na `1440×900` sprawdź panel przy lewej krawędzi filmu, szerokość `184..252 px`, pełne pokrycie prostokątów filmu i SVG oraz cztery widoczne karty. Na `390×844` sprawdź dolny arkusz, brak poziomego overflow, widoczną większość filmu i minimalny obszar celów `44×44 px`. W kontekście `reducedMotion: 'reduce'` sprawdź zerowy czas przejścia.

- [ ] **Step 2: Run responsive tests to verify they fail**

Run: `npx playwright test test/demo-render.spec.mjs -g "operator layout|mobile operator|reduced motion"`

Expected: FAIL because A3 styles do not exist.

- [ ] **Step 3: Implement the A3 desktop and mobile styling**

Zaimportuj `operator-overlay.css`. Ustaw desktopowy panel `left: clamp(...)`, szerokość `clamp(184px, 19%, 252px)`, ciemnozielone tło o kryciu około `48%`, subtelny blur i cienką obwódkę. `person-01` ma większy obraz, opis i kafle HR/RR; pozostałe osoby — kompaktowe wiersze. Poniżej `760 px` przekształć listę w dolny arkusz, zachowując możliwość scrubowania poza nim.

- [ ] **Step 4: Add visual and accessibility states**

Dodaj czytelny focus, kolory żółty/zielony, stan `aria-expanded`, kontrastowy napis „Poza kadrem”, placeholder obrazu oraz wyłączenie animacji w `prefers-reduced-motion`. Umieść pod filmem zatwierdzony tekst o czterech wybranych osobach, scenariuszu POC i braku potwierdzania tożsamości.

- [ ] **Step 5: Verify layouts and screenshots**

Run: `npx playwright test test/demo-render.spec.mjs -g "operator layout|mobile operator|reduced motion"`

Expected: PASS and screenshots `experience-desktop.png` / `experience-mobile.png` show the panel on the interactive film without covering the four tracked people.

- [ ] **Step 6: Commit**

```powershell
git add src/experience/operator-overlay.css src/experience/experience.css src/experience/index.js test/demo-render.spec.mjs
git commit -m "style: apply A3 operator panel design"
```

### Task 5: Zwięzły „Algorytm” i dokumentacja

**Files:**
- Modify: `src/experience/index.js`
- Modify: `src/experience/experience.css`
- Modify: `test/demo-render.spec.mjs`
- Modify: `README.md`
- Modify: `PROJECT_CONTEXT.md`

**Interfaces:**
- Consumes: istniejąca semantyczna sekcja naukowa.
- Produces: krótkie nazwy „Algorytm” i „Poparcie naukowe” oraz aktualny opis architektury operator overlay.

- [ ] **Step 1: Write failing copy and compactness tests**

Sprawdź dokładny tekst linku nawigacji i głównego nagłówka `Algorytm`, nagłówek `Poparcie naukowe`, brak „Co pochodzi z badań, a co jest decyzją POC”, zachowanie 3 kroków, 3 wyników, 4 źródeł i wszystkich progów. Na desktopie sprawdź zmniejszone odstępy sekcji bez poziomego overflow.

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx playwright test test/demo-render.spec.mjs -g "algorithm and evidence"`

Expected: FAIL on the old long labels.

- [ ] **Step 3: Apply the final copy and compact spacing**

Zmień wyłącznie nazwy wskazane w specyfikacji; nie usuwaj źródeł, progów ani ostrzeżeń klinicznych. Zmniejsz padding, główny tytuł, przerwy flow/outcomes/evidence i wysokość kart na desktopie, zachowując jednokolumnową czytelność mobile.

- [ ] **Step 4: Update project documentation**

Opisz `operator-scenario.json`, `operator-overlay.js`, osobny CSS, cztery obrazy WebP, offline tracking i fakt, że wszystkie parametry są statycznym scenariuszem POC.

- [ ] **Step 5: Run focused and Node suites**

Run: `npm test; npx playwright test test/demo-render.spec.mjs -g "algorithm and evidence"`

Expected: PASS.

- [ ] **Step 6: Commit**

```powershell
git add src/experience/index.js src/experience/experience.css test/demo-render.spec.mjs README.md PROJECT_CONTEXT.md
git commit -m "docs: clarify operator demo and scientific basis"
```

### Task 6: Pełna weryfikacja, publikacja i kontrola produkcji

**Files:**
- Verify: all changed files
- Verify: `.github/workflows/deploy-pages.yml`

**Interfaces:**
- Consumes: kompletną implementację z Tasks 1–5.
- Produces: zweryfikowany commit na `origin/main` i działającą wersję na `https://airtriage.anulab.tech/`.

- [ ] **Step 1: Run the complete local verification**

Run:

```powershell
npm test
npm run build
npm run preview
npm run test:render
```

Expected: all Node and Playwright tests PASS and Vite build exits 0.

- [ ] **Step 2: Perform the manual precision review**

Obejrzyj `tools/operator-tracking/operator-preview.mp4` w całości i sprawdź w demo klatki początkowe, środkowe, końcowe oraz przejścia widoczności. Potwierdź: tylko cztery osoby, żółta pierwsza, ramka nie dryfuje na inną osobę, panel nie zasłania wybranych osób i kliknięcia działają w obie strony.

- [ ] **Step 3: Review the final diff and repository state**

Run: `git diff --check; git status --short; git log --oneline -8`

Expected: no whitespace errors; no `.venv-operator`, preview video, contact sheets, `.superpowers/brainstorm` or user reference images are staged.

- [ ] **Step 4: Push the approved implementation**

Run: `git push origin main`

Expected: push succeeds and starts `Deploy to GitHub Pages`.

- [ ] **Step 5: Watch the deployment**

Run: `gh run list --workflow deploy-pages.yml --limit 1`, then `gh run watch <run-id> --exit-status`.

Expected: workflow build and deploy jobs complete successfully.

- [ ] **Step 6: Smoke-test the production URL**

Run: `$env:PLAYWRIGHT_BASE_URL='https://airtriage.anulab.tech'; npx playwright test test/demo-render.spec.mjs -g "same one of four|algorithm and evidence"; Remove-Item Env:PLAYWRIGHT_BASE_URL`

Expected: production tests PASS and the deployed page exposes the A3 panel directly on the interactive film.
