# AirTriage — kontekst projektu

Stan opisany na: 2026-10-04.

## Co to jest

AirTriage to statyczna aplikacja single-page zbudowana przez Vite. Użytkownik
najpierw widzi logo i lokalny film intro, a po jego zakończeniu przewijalną
stronę projektu. Strona jest ładowana dynamicznie w tle podczas intro.

## Etapy doświadczenia

| Etap | Implementacja | Zachowanie |
| --- | --- | --- |
| Logo | `src/intro/logo-stage.js` | Znak AirTriage jest wyśrodkowany na kremowym tle przez 2000 ms. |
| Film intro | `src/intro/video-stage.js`, `src/intro/index.js` | Film startuje od początku po logo, nie ma kontrolek i pozostaje widoczny aż do `ended`. Escape pomija film, a błąd lub 30 sekund bez postępu uruchamia handoff. |
| Strona | `src/experience/` | Przewijalna strona: najpierw `Nasze przykłady`, potem `Widok operatora` z interaktywnym panelem czterech osób, a dalej zwięzły `Algorytm` i `Poparcie naukowe`. |
| Język | `src/i18n/` | Polski jest domyślny, angielski przełączany w prawym górnym rogu nagłówka. |

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
src/experience/operator-scenario.json   # statyczne dane 4 osób dla każdej klatki
src/experience/operator-overlay.js      # synchronizacja panelu i oznaczeń SVG
src/experience/operator-overlay.css     # panel A3 na desktopie i mobile
src/i18n/index.js                      # wybór języka, t() i podmiana tekstów
src/i18n/pl.js                         # słownik polski i wzorzec kluczy
src/i18n/en.js                         # słownik angielski (lazy chunk)
src/i18n/language-toggle.js            # wspólny przełącznik PL/EN
src/i18n/i18n.css                      # wygląd przełącznika
tools/operator-tracking/                # offline tracking i budowa scenariusza
public/video/RYSY_demo_20s_dopracowany.mp4 # zoptymalizowany film intro (1080p, ok. 14,6 MiB)
public/video/film_2.mp4                 # interaktywny film strony
public/operator/*.webp                  # 4 poglądowe przybliżenia osób
public/brand/airtriage-logo.svg         # produkcyjne logo
public/CNAME                            # domena produkcyjna
.github/workflows/deploy-pages.yml      # build i publikacja GitHub Pages
```

## Granice modułów

- Etapy logo i filmu intro nie importują siebie nawzajem.
- Intro nie importuje `src/experience/`.
- `src/main.js` wykonuje dynamiczny import `src/experience/index.js` po
  pierwszej klatce lub w czasie bezczynności przeglądarki.
- `src/main.js` przekazuje stronie bramkę ładowania filmu. `film_2.mp4` nie ma
  przypisanego `src`, dopóki intro nie zgłosi `canplaythrough`, nie zostanie
  w pełni zbuforowane albo nie przejdzie do etapu handoff.
- Publiczny kontrakt strony to
  `createExperience({ container, onProgress, videoLoadGate })`, zwracający
  `{ destroy() }`.
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
`Widok operatora` i `Algorytm` pozostają dostępne. Sekcja naukowa zawiera
semantyczny schemat HTML, progi HR/RR, ograniczenia POC oraz
linki do czterech źródeł. Dwa filmy przykładów nie zostały jeszcze dostarczone,
dlatego ich karty pokazują tekst alternatywny.

Film intro zachowuje rozdzielczość 1920×1080 i 30 kl./s, ale jest zakodowany
do webowego H.264 z metadanymi na początku pliku i bez nieużywanej ścieżki
audio. Dzięki temu waży około 14,6 MiB zamiast 43,4 MiB. Przejście logo → film
jest krótkim, 400-milisekundowym przenikaniem, uruchamianym dopiero po zdarzeniu
`playing`, więc logo nie znika przed pierwszą gotową klatką na wolnym łączu.
Główne bloki strony używają wspólnego, wycentrowanego kontenera o maksymalnej
szerokości 72 rem, bez wcześniejszego dodatkowego wcięcia od lewej.

## Języki

Polski jest językiem domyślnym i działa bez JavaScriptu: tekst pozostaje
inline w znacznikach, a klucze `data-i18n` oznaczają to, co podmienia
`applyTranslations`. Przełącznik `PL`/`EN` siedzi w prawym górnym rogu
przyklejonego nagłówka strony; w intro go nie ma, bo intro nie ma nagłówka.

Kolejność wyboru języka: `?lang=en` z adresu, potem zapamiętany wybór
w `localStorage`, na końcu polski. `?lang=pl` wymusza polski mimo zapamiętanego
angielskiego. Przełączenie bez przeładowania aktualizuje `?lang=`,
`localStorage` oraz `<html lang>`.

`src/i18n/pl.js` jest wzorcem zbioru kluczy, a `src/i18n/en.js` musi go
odwzorowywać; `test/i18n.test.mjs` kończy się błędem przy brakującym lub
osieroconym kluczu. Polski wchodzi do bundla startowego, a angielski jest
osobnym, leniwym chunkiem pobieranym tylko na żądanie. Panel operatora bierze
teksty z pól `*En` w `operator-scenario.json`; dane liczbowe (HR, RR, ramki
klatek) nie są tłumaczone. Progi i jednostki muszą mieć w obu językach te same
liczby.

## Widok operatora

Na filmie działa przygotowany wcześniej, interaktywny scenariusz dla dokładnie
czterech wskazanych osób. `operator-scenario.json` przechowuje ich pozycje dla
każdej klatki, a `operator-overlay.js` synchronizuje zaznaczenie w panelu z
prostokątem lub punktem SVG na filmie. Kliknięcie działa w obu kierunkach:
karta wybiera oznaczenie, a oznaczenie rozwija kartę. Tracking jest wykonywany
offline przez narzędzia w `tools/operator-tracking/`; przeglądarka niczego nie
wykrywa ani nie wylicza na bieżąco.

Panel używa czterech poglądowych przybliżeń WebP oraz statycznych parametrów HR,
RR, priorytetu i opisu stanu. Są to dane demonstracyjne POC, a przybliżenia nie
służą do potwierdzania tożsamości. Osoba w żółtym stroju jest pierwsza i ma
scenariusz wyraźnego zmęczenia oraz podwyższonego tętna. Osobny CSS tworzy wąski,
półprzezroczysty panel po lewej na desktopie i dolny arkusz na urządzeniach
mobilnych.

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
