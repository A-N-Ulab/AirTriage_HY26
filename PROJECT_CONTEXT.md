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
| 1. Logo | `src/intro/logo-stage.js`, `src/intro/logo-stage.css` | Przezroczyste SVG jest wyświetlane przez dokładnie 2000 ms na białym tle. Następnie znika w szybkim fade 300 ms. |
| 2. Film | `src/intro/video-stage.js`, `src/intro/video-stage.css`, `src/intro/index.js` | Wideo YouTube jest przygotowywane za logo, potem widoczne przez 4000 ms. Działa Skip, Escape i awaryjne „Tap to begin”. |
| 3. Demo | `src/demo/`, `src/demo-loader.js` | Lazy-loadowane demo Three.js. Przy wolnym ładowaniu widać postęp, a przy błędzie komunikat i Retry. |

Przejście film → demo trwa 600 ms i jest traktowane jako przejście, nie jako
czwarty etap. `src/intro/timeline.js` jest niezależną od DOM maszyną czasu:
`idle → logo → video → handoff → done`.

## Najważniejsze pliki

```text
index.html                              # statyczna powłoka i fallback bez JavaScript
src/main.js                             # jedyny koordynator intro i ładowania demo
src/style.css                           # wspólna powłoka, loader i błędy
src/intro/index.js                      # składa logo i film, obsługuje YouTube
src/intro/timeline.js                   # czasy oraz przejścia intro, bez DOM
src/intro/logo-stage.js                 # DOM wyłącznie etapu logo
src/intro/logo-stage.css                # biały ekran i fade logo
src/intro/video-stage.js                # DOM wyłącznie etapu filmu
src/intro/video-stage.css               # widoczność filmu i crossfade
src/intro/intro.css                     # kontrolki filmu i handoff
src/demo-loader.js                      # load/ready/error/retry dla demo
src/demo/index.js                       # publiczne createDemo i runtime Three.js
src/demo/terrain.js                     # deterministyczna geometria terenu
public/brand/airtriage-logo.svg         # produkcyjne logo wektorowe bez tła
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

- Film jest osadzony z `youtube-nocookie.com`; repozytorium go nie przechowuje.
- Inter ładuje się z Google Fonts.
- Three.js jest osobnym, dynamicznym chunkiem Vite.
- Brak filmu, blokada autoplay lub problem WebGL nie może pozostawić pustej strony:
  istnieją odpowiednio „Tap to begin” oraz ekran błędu z Retry.

## Zasada aktualizacji tego pliku

Po zmianie architektury, etapów, domeny, workflow, głównych komend lub publicznych
kontraktów należy zaktualizować ten dokument w tym samym zadaniu.
