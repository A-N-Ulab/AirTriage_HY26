# AirTriage Operator Overlay — Design

## Cel

Rozbudować sekcję „Widok operatora” o przygotowany wcześniej, interaktywny
scenariusz czterech osób zsynchronizowany z ręcznie przewijanym filmem. Operator
ma móc wybrać osobę zarówno z półprzezroczystego panelu, jak i bezpośrednio na
filmie. Wybrana osoba otrzymuje dokładną ramkę, a jej karta rozwija statyczne
parametry POC.

Zmiana obejmuje również skrócenie sekcji naukowej: w nawigacji i głównym
nagłówku zostaje wyłącznie „Algorytm”, natomiast nagłówek „Poparcie naukowe”
zastępuje długie „Co pochodzi z badań, a co jest decyzją POC”.

## Granice i uczciwość demonstratora

- Widok pokazuje dokładnie cztery wskazane osoby, mimo że w filmie widać większy
  tłum. Nie wykrywa ani nie dodaje innych osób.
- HR, RR, stan i kolory są przygotowanymi danymi scenariusza zapisanymi w JSON;
  nic nie jest obliczane na żywo.
- Przybliżenia osób są wygenerowanymi, poglądowymi rekonstrukcjami opartymi na
  ubiorze, pozycji i kącie rzeczywistego kadru. Nie są materiałem do potwierdzania
  tożsamości.
- Demonstrator nie staje się systemem klinicznym ani automatycznym triażem.
- OpenCV działa wyłącznie jako narzędzie offline do przygotowania współrzędnych.
  Nie jest ładowane w przeglądarce i nie wchodzi do produkcyjnego bundla.

Tekst widoczny pod widokiem operatora:

> Widok celowo prezentuje cztery wybrane osoby z większej grupy, aby czytelnie
> pokazać mechanizm oznaczania, wyboru i rozwijania danych w panelu operatora.
> Przybliżenia i parametry są przygotowanym scenariuszem demonstracyjnym POC;
> nie stanowią pomiaru na żywo ani materiału do potwierdzania tożsamości.

## Cztery osoby i dane scenariusza

Kolejność w panelu jest stała. Osoba żółta pojawia się pierwsza i jest rozwinięta
po uruchomieniu widoku.

| ID | Rozpoznawalny element kadru | Status | HR | RR | Stan |
| --- | --- | --- | --- | --- | --- |
| `person-01` | siedząca kobieta po prawej | żółty | 118/min | 22/min | bardzo zmęczona, pozycja siedząca |
| `person-02` | jasna odzież i czerwony plecak | zielony | 84/min | 16/min | stabilna |
| `person-03` | jasna odzież i fioletowy element | zielony | 79/min | 15/min | stabilna |
| `person-04` | turkusowa koszulka i ciemne spodenki | zielony | 88/min | 18/min | stabilna |

Wartości są jawnie demonstracyjne. Żółty status `person-01` jest zgodny z
opisanym algorytmem: HR 118/min i RR 22/min leżą w pasmach pośrednich.

## Panel operatora

### Desktop

- Panel jest dosunięty do lewej krawędzi filmu (`0.5–0.75%` odstępu), zajmuje
  około `19%` szerokości, ma minimalną szerokość `184 px` i maksymalną `252 px`.
- Tło to ciemnozielone szkło o kryciu około `48%`, z delikatnym rozmyciem,
  cienką jasną obwódką i bez ciężkiego cienia.
- `person-01` jest pierwsza i domyślnie rozwinięta. Pokazuje większe zdjęcie,
  status, opis stanu oraz kafle HR/RR.
- Pozostałe trzy osoby są kompaktowymi wierszami: stałe przybliżenie, ID,
  skrócone HR/RR i kolor statusu.
- Panel nie przykrywa znacznika przeciągania ani wskazanych osób po prawej.

### Mobile

Pionowa szyna nie może zasłaniać większości filmu. Poniżej `760 px` panel staje
się kompaktowym dolnym arkuszem:

- zamknięty stan pokazuje cztery małe karty i aktywny kolor;
- stuknięcie karty rozwija jej dane nad listą;
- gest przeciągania filmu działa poza arkuszem;
- kolejność osób i dwukierunkowa selekcja pozostają identyczne jak na desktopie.

### Przybliżenia

Każda osoba otrzymuje osobny, zoptymalizowany obraz WebP. Obrazy zachowują:

- naturalny, skośny kąt kamery drona;
- widoczny w filmie ubiór i pozycję;
- skalne otoczenie i ostre światło górskie;
- brak studyjnego kadru, spojrzenia prosto w obiektyw i sugerowania pewnej
  rekonstrukcji twarzy.

Tekst alternatywny nazywa obrazy „poglądowymi przybliżeniami”.

## Dokładne oznaczenia przygotowane w OpenCV

Film ma `1920×1080`, `30 fps`, `278` klatek i około `9.27 s`.

Proces przygotowania:

1. Skrypt developerski eksportuje klatki źródłowe z filmu.
2. Cztery osoby otrzymują ręcznie sprawdzone ramki startowe i dodatkowe klatki
   kontrolne w momentach największej zmiany perspektywy.
3. OpenCV propaguje ramki pomiędzy klatkami kontrolnymi za pomocą śledzenia
   optycznego/trackerów; wynik automatyczny nigdy nie jest przyjmowany bez
   przeglądu.
4. Skrypt renderuje film kontrolny lub arkusz klatek z ramkami. Każda z 278
   klatek jest sprawdzana; dryf koryguje się kolejną ręczną klatką kontrolną.
5. Do aplikacji trafia wygenerowany JSON z ramką dla każdej widocznej osoby na
   każdej klatce. Brak widoczności ma wartość `null`, a nie wymyśloną pozycję.

OpenCV jest narzędziem pomocniczym. Dokładność końcowych ramek wynika z ręcznej
kontroli całego krótkiego materiału, nie z obietnicy automatycznej detekcji.

## Format danych

Plik `src/experience/operator-scenario.json` zawiera metadane filmu, osoby oraz
ramki klatkowe:

```json
{
  "video": { "width": 1920, "height": 1080, "fps": 30, "frameCount": 278 },
  "people": [
    {
      "id": "person-01",
      "status": "yellow",
      "heartRate": 118,
      "respiratoryRate": 22,
      "condition": "Bardzo zmęczona · pozycja siedząca",
      "image": "/operator/person-01-yellow.webp"
    }
  ],
  "frames": [
    {
      "frame": 0,
      "boxes": {
        "person-01": null,
        "person-02": [0.582, 0.334, 0.046, 0.119],
        "person-03": [0.661, 0.301, 0.041, 0.108],
        "person-04": [0.736, 0.282, 0.044, 0.125]
      }
    }
  ]
}
```

Współrzędne `[x, y, width, height]` są znormalizowane względem źródłowego
`1920×1080` i ograniczone do `0..1`. Każda klatka ma wszystkie cztery dozwolone
ID; wartość `null` jednoznacznie oznacza, że dana osoba nie jest w niej widoczna.

## Skalowanie ramek do filmu

Warstwa interaktywna jest elementem SVG ułożonym dokładnie nad `<video>`:

- `viewBox="0 0 1920 1080"`;
- `preserveAspectRatio="xMidYMid slice"`, zgodne z obecnym
  `object-fit: cover`;
- ramki są rysowane w pikselach źródłowych po przeliczeniu danych
  znormalizowanych;
- SVG i film mają identyczny rozmiar i ten sam obszar przycięcia, dlatego
  desktopowe `16:9` i mobilne `4:3` pozostają zsynchronizowane.

Aktualna klatka to `round(video.currentTime × fps)`, ograniczona do
`0..frameCount-1`. Aktualizacja następuje po seeku oraz podczas renderowania
klatki, ale nie uruchamia żadnej analizy obrazu w przeglądarce.

## Interakcja panel ↔ film

- Stan zawiera jedno `selectedPersonId`; startowo `person-01`.
- Kliknięcie lub aktywacja klawiaturą karty:
  - wybiera osobę;
  - rozwija jej dane;
  - pokazuje pełną, kolorową ramkę nad osobą, jeśli jest w kadrze.
- Kliknięcie niewidocznego, powiększonego celu dotykowego wokół osoby na filmie:
  - wybiera tę samą kartę;
  - rozwija dane w panelu;
  - pokazuje ramkę.
- Niewybrane osoby mają małe, dyskretne piny. Pełna ramka należy wyłącznie do
  osoby aktywnej.
- Jeśli osoba jest chwilowo poza kadrem, karta pozostaje aktywna z komunikatem
  „Poza kadrem”; aplikacja nie pokazuje fałszywej ramki.
- Cele mają etykiety ARIA, obsługę `Enter`/`Space`, widoczny focus i minimalny
  obszar dotyku `44×44 px`.
- Zdarzenia panelu nie uruchamiają przeciągania filmu. Przeciąganie poza panelem
  działa jak dotychczas.

## Zwięźlejsza sekcja algorytmu

- Nawigacja: `Algorytm`.
- Główny nagłówek sekcji: `Algorytm`.
- Nagłówek nad źródłami: `Poparcie naukowe`.
- Usunięty zostaje tekst „Co pochodzi z badań, a co jest decyzją POC”.
- Zmniejszone zostają pionowe odstępy, rozmiar głównego nagłówka oraz wysokość
  kart algorytmu i źródeł. Treść, progi i pierwszeństwo kolorów pozostają bez
  zmian.
- Na desktopie użytkownik powinien objąć wzrokiem trzy kroki i trzy wyniki bez
  wielokrotnego przewijania; mobile zachowuje czytelny układ jednej kolumny.

## Moduły i pliki

- `src/experience/operator-scenario.json` — jedyne źródło danych osób i ramek.
- `src/experience/operator-overlay.js` — wybór osoby, ramka bieżącej klatki,
  klawiatura i lifecycle.
- `src/experience/operator-overlay.css` — panel, SVG, stany desktop/mobile.
- `src/experience/index.js` — montaż komponentu, nowy tekst sekcji i skrócone
  nazwy algorytmu.
- `public/operator/*.webp` — cztery zoptymalizowane przybliżenia.
- `tools/operator-tracking/` — offline OpenCV, klatki kontrolne i generator JSON;
  kod nie trafia do bundla.
- `test/operator-overlay.test.mjs` — logika klatek, wybór i walidacja danych.
- `test/demo-render.spec.mjs` — pełna interakcja panel↔film i responsywność.

## Obsługa błędów i degradacja

- Niepoprawny lub brakujący JSON nie blokuje strony: film nadal można
  przeciągać, a panel pokazuje krótki komunikat o niedostępności scenariusza.
- Brak jednego przybliżenia używa neutralnego placeholdera z ID osoby.
- Brak ramki w danej klatce daje stan „Poza kadrem”.
- Dotychczasowy fallback błędu filmu pozostaje i ukrywa warstwę oznaczeń.
- `prefers-reduced-motion` wyłącza animacje rozwijania i przejścia ramek.

## Testy i kryteria akceptacji

1. JSON zawiera 278 kolejnych klatek, wyłącznie cztery dozwolone ID i wartości
   `null` lub poprawne ramki `0..1`.
2. Dla zestawu ręcznie wybranych klatek testy fixture potwierdzają oczekiwane
   współrzędne z tolerancją jednego piksela źródłowego.
3. Scrubbing aktualizuje ramkę bez uruchamiania więcej niż jednej pracy na
   klatkę animacji i bez wpływu na płynność filmu.
4. Kliknięcie każdej karty aktywuje odpowiadającą ramkę; kliknięcie każdego celu
   na filmie aktywuje odpowiadającą kartę.
5. Nigdy nie pojawia się piąta osoba ani ID spoza scenariusza.
6. Żółta osoba jest pierwsza, rozwinięta domyślnie i pokazuje `118/min`, `22/min`
   oraz „Bardzo zmęczona · pozycja siedząca”.
7. Desktop i mobile nie mają poziomego overflow; na mobile panel nie zasłania
   większości filmu.
8. Gest przeciągania, fallback filmu, klawiatura i reduced motion działają.
9. Sekcja nosi nazwę „Algorytm”, a źródła nagłówek „Poparcie naukowe”.
10. Pełny zestaw Node, build Vite i Playwright przechodzi przed publikacją.

## Publikacja

Po pozytywnej weryfikacji zmiany zostaną zapisane w commicie i wypchnięte do
`origin/main`. Istniejący workflow GitHub Pages wykona `npm ci`, build i
publikację pod `https://airtriage.anulab.tech/`. Po wdrożeniu produkcyjny adres
zostanie sprawdzony pod kątem obecności nowego panelu, działania wyboru czterech
osób i poprawnej wersji sekcji „Algorytm”.
