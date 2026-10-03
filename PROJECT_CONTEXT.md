# AirTriage — kontekst projektu

Ten plik jest punktem startowym dla kolejnych rozmów i zmian. Najpierw przeczytaj
jego, a dopiero potem otwieraj pliki związane z konkretnym zadaniem. Nie trzeba za
każdym razem analizować całego repozytorium.

Stan opisany na: 2026-10-03.

## Co to jest

AirTriage to statyczna aplikacja typu single-page zbudowana przez Vite. Po wejściu
użytkownik przechodzi przez trzy niezależne etapy: logo, film i demo terenu 3D.
Demo jest ładowane dynamicznie w tle, więc Three.js nie opóźnia logo ani filmu.

## Trzy etapy doświadczenia

| Etap | Implementacja | Zachowanie |
| --- | --- | --- |
| 1. Logo | `src/intro/logo-stage.js`, `src/intro/logo-stage.css` | Przezroczyste SVG jest wyświetlane przez dokładnie 2000 ms na tle strony (`--bg`, krem `#fef2e4`). Znak jest wyśrodkowany i ma ograniczoną szerokość oraz wysokość, więc nigdy nie wychodzi poza viewport. Następnie znika w szybkim fade 300 ms. |
| 2. Film | `src/intro/video-stage.js`, `src/intro/video-stage.css`, `src/intro/index.js` | Przy prawidłowym odtwarzaniu lokalny film startuje od początku po logo i pozostaje widoczny aż do zdarzenia `ended`. Nie ma elementów sterujących; Escape pomija film, a błąd lub 30 sekund bez postępu uruchamia handoff awaryjny. |
| 3. Demo | `src/demo/`, `src/demo-loader.js` | Lazy-loadowane demo Three.js. Przy wolnym ładowaniu widać postęp, a przy błędzie komunikat i Retry. |

Przejście film → demo trwa 600 ms i jest traktowane jako przejście, nie jako
czwarty etap. `src/intro/timeline.js` jest niezależną od DOM maszyną czasu:
`idle → logo → video → handoff → done`.

## Najważniejsze pliki

```text
index.html                              # statyczna powłoka i fallback bez JavaScript
src/main.js                             # jedyny koordynator intro i ładowania demo
src/style.css                           # wspólna powłoka, loader i błędy
src/intro/index.js                      # składa logo i lokalny film
src/intro/timeline.js                   # czasy oraz przejścia intro, bez DOM
src/intro/logo-stage.js                 # DOM wyłącznie etapu logo
src/intro/logo-stage.css                # wyśrodkowany znak i fade logo
src/intro/video-stage.js                # DOM wyłącznie etapu filmu
src/intro/video-stage.css               # widoczność filmu i crossfade
src/intro/intro.css                     # kontrolki filmu i handoff
src/demo-loader.js                      # load/ready/error/retry dla demo
src/demo/index.js                       # publiczne createDemo i runtime Three.js
src/demo/terrain.js                     # deterministyczna geometria terenu
public/brand/airtriage-logo.svg         # produkcyjne logo wektorowe bez tła
public/brand/favicon-square.svg         # kwadratowa ikona z kremową płytką
public/brand/favicon.svg                # oryginalna szeroka ikona drona
public/favicon-32.png                   # raster 32x32
public/apple-touch-icon.png             # raster 180x180
public/og-image.png                     # 1200x630 Open Graph / Twitter card
docs/assets/airtriage-logo-reference.jpg # dostarczony raster referencyjny
public/CNAME                            # domena produkcyjna
.github/workflows/deploy-pages.yml      # test, build i deployment
```

## Granice modułów

- Logo nie zna YouTube, filmu ani demo.
- Film nie importuje logo ani demo.
- Intro nie importuje Three.js ani plików z `src/demo/`.
- `src/main.js` uruchamia intro i osobno wykonuje dynamiczny import
  `src/demo/index.js` po pierwszej klatce/bezczynności przeglądarki.
- Publiczny kontrakt demo to `createDemo({ container, onProgress })`, zwracający
  kontroler `{ destroy() }` po pierwszej wyrenderowanej klatce.

## Logo

Produkcja korzysta wyłącznie z `public/brand/airtriage-logo.svg`. SVG zachowuje
proporcje i kontury dostarczonego znaku 1024×411, składa się z wektorowych ścieżek
i nie zawiera białego prostokąta ani osadzonego obrazu rastrowego. JPG w
`docs/assets/` służy jedynie jako materiał referencyjny i nie jest pobierany przez
stronę.

Canvas SVG to dokładnie `viewBox="0 0 1024 411"`. Współrzędne ścieżki pozostają w
układzie po eksporcie A4, a transform `translate(-162.859,-851.546) scale(6.68276)`
mapuje prostokąt artwork (24.37 140.85 153.23 34.65) na wyśrodkowany canvas 1024×411.
Nie zmieniaj `viewBox` bez aktualizacji `test/brand-logo.test.mjs`, który go pilnuje.

Stage logo nie ustawia własnego tła — tło daje `.intro` przez `var(--bg)`. Dzięki temu
splash i hand-off mają ten sam kolor.

Ikony strony: `public/brand/favicon-square.svg` (kwadratowa, z kremową płytką
`#fef2e4`, żeby znak był czytelny na ciemnym pasku przeglądarki), plus rastry
`public/favicon-32.png` i `public/apple-touch-icon.png`.

## Development lokalny

Wymagane są Node.js 20+ oraz npm.

```bash
npm install
npm run dev
```

Pełna weryfikacja:

```bash
npm test
npm run build
npx playwright install chromium
npm run preview
npm run test:render
```

`npm test` obejmuje timeline intro, SVG, granice modułów, loader i geometrię.
`npm run test:render` sprawdza przebieg w prawdziwej przeglądarce, desktop/mobile,
błędy ładowania i reduced motion.

## Deployment — gdzie i jak

Produkcja działa pod adresem <https://airtriage.anulab.tech/> jako GitHub Pages.

Deployment jest automatyczny:

1. Zmiany trafiają na branch `main` (zwykle przez merge/push).
2. GitHub uruchamia `.github/workflows/deploy-pages.yml`.
3. Job `build` sprawdza konfigurację domeny skryptem
   `test/custom-domain.Tests.ps1`.
4. Workflow instaluje Node.js 20, wykonuje `npm ci` i `npm run build`.
5. Katalog `dist/` jest wysyłany jako artefakt GitHub Pages.
6. Job `deploy` publikuje artefakt w środowisku `github-pages`.

Workflow można też uruchomić ręcznie przez `workflow_dispatch` w zakładce Actions.
Repo musi mieć GitHub Pages ustawione na źródło **GitHub Actions**.

Ważne elementy konfiguracji:

- `public/CNAME` zawiera `airtriage.anulab.tech` i trafia do `dist/CNAME`;
- `vite.config.js` używa `base: '/'`, ponieważ aplikacja działa w korzeniu domeny;
- nie należy ustawiać base na `/AirTriage_HY26/`, dopóki używana jest domena
  niestandardowa;
- sekrety nie są potrzebne — workflow korzysta z uprawnień GitHub Pages i OIDC.

## Zewnętrzne zależności runtime

- Film jest przechowywany w `public/video/` i odtwarzany bez elementów sterujących.
- Inter ładuje się z Google Fonts.
- Three.js jest osobnym, dynamicznym chunkiem Vite.
- Brak filmu lub problem WebGL nie może pozostawić pustej strony: timeline intro
  przechodzi dalej automatycznie, a błąd demo pokazuje ekran z Retry.

## Zasada aktualizacji tego pliku

Po zmianie architektury, etapów, domeny, workflow, głównych komend lub publicznych
kontraktów należy zaktualizować ten dokument w tym samym zadaniu.
