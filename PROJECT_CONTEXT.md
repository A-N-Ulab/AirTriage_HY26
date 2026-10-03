# AirTriage — kontekst projektu

Stan opisany na: 2026-10-03.

## Co to jest

AirTriage to statyczna aplikacja single-page zbudowana przez Vite. Użytkownik
najpierw widzi logo i lokalny film intro, a po jego zakończeniu przewijalną
stronę projektu. Strona jest ładowana dynamicznie w tle podczas intro.

## Etapy doświadczenia

| Etap | Implementacja | Zachowanie |
| --- | --- | --- |
| Logo | `src/intro/logo-stage.js` | Znak AirTriage jest wyśrodkowany na kremowym tle przez 2000 ms. |
| Film intro | `src/intro/video-stage.js`, `src/intro/index.js` | Film startuje od początku po logo, nie ma kontrolek i pozostaje widoczny aż do `ended`. Escape pomija film, a błąd lub 30 sekund bez postępu uruchamia handoff. |
| Strona | `src/experience/` | Przewijalna strona: najpierw `Nasze przykłady`, potem `Widok operatora` z interaktywnym filmem, a dalej `Algorytm i podstawa naukowa`. |

Timeline intro pozostaje niezależną od DOM maszyną stanów:
`idle → logo → video → handoff → done`.

## Najważniejsze pliki

```text
index.html                              # powłoka i fallback bez JavaScript
src/main.js                             # koordynacja intro i lazy-load strony
src/style.css                           # tokeny, powłoka, loading i błąd
src/demo-loader.js                      # istniejący loader modułu po intro
src/intro/index.js                      # logo, film intro i handoff
src/intro/timeline.js                   # stany i czasy intro
src/experience/index.js                 # struktura strony i lifecycle
src/experience/scrub-video.js           # sterowanie filmem przez przeciąganie
src/experience/experience.css           # responsywny wygląd strony
public/video/RYSY_demo_20s_dopracowany.mp4 # film intro
public/video/film_2.mp4                 # interaktywny film strony
public/brand/airtriage-logo.svg         # produkcyjne logo
public/CNAME                            # domena produkcyjna
.github/workflows/deploy-pages.yml      # build i publikacja GitHub Pages
```

## Granice modułów

- Etapy logo i filmu intro nie importują siebie nawzajem.
- Intro nie importuje `src/experience/`.
- `src/main.js` wykonuje dynamiczny import `src/experience/index.js` po
  pierwszej klatce lub w czasie bezczynności przeglądarki.
- Publiczny kontrakt strony to
  `createExperience({ container, onProgress })`, zwracający `{ destroy() }`.
- `src/experience/scrub-video.js` nie zna struktury całej strony; otrzymuje
  tylko element wideo oraz powierzchnię gestu.

## Film interaktywny

`public/video/film_2.mp4` nie ma autoplay ani elementów sterujących. Po
załadowaniu metadanych jest zatrzymywany dokładnie w połowie. Gest poziomy
mapuje szerokość powierzchni na cały czas filmu: przeciągnięcie w prawo
przesuwa do przodu, a w lewo cofa. Czas jest ograniczany do zakresu od zera do
końca filmu. Pointer Events obsługują mysz, dotyk i pióro. Szybkie zdarzenia
ruchu są łączone do najnowszej pozycji, a kolejny seek czeka na zakończenie
poprzedniego, żeby nie przeciążać dekodera. Film jest zapisany z metadanymi na
początku pliku i klatkami kluczowymi co 200 ms, dzięki czemu przeglądarka nie
musi dekodować wielosekundowych fragmentów przy każdym przeciągnięciu.

Brak filmu nie blokuje strony: widoczny jest komunikat zastępczy, a sekcje
`Widok operatora` i `Algorytm i podstawa naukowa` pozostają dostępne. Sekcja
naukowa zawiera semantyczny schemat HTML, progi HR/RR, ograniczenia POC oraz
linki do czterech źródeł. Dwa filmy przykładów nie zostały jeszcze dostarczone,
dlatego ich karty pokazują tekst alternatywny.

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
npm run preview
npm run test:render
```

## Deployment

Produkcja działa pod <https://airtriage.anulab.tech/> jako GitHub Pages.
Push do `main` uruchamia `.github/workflows/deploy-pages.yml`, który wykonuje
`npm ci`, buduje `dist/` i publikuje artefakt. `public/CNAME` zawiera domenę,
a Vite używa `base: '/'`.

## Zasada aktualizacji

Po zmianie etapów, głównych modułów, zasobów, domeny lub komend trzeba
zaktualizować ten plik w tym samym zadaniu.
