/**
 * Polish dictionary and the source of truth for the key set. Every key here
 * must exist in `en.js`; `test/i18n.test.mjs` fails the build otherwise.
 *
 * Values are plain strings. Use `{name}` placeholders for interpolation and
 * keep them identical across languages where they carry data rather than prose
 * (thresholds, units, journal names).
 */
export default {
  // ------------------------------------------------------------- shell --
  'shell.loading': 'Ładowanie strony',
  'shell.loadingBody': 'Przygotowujemy doświadczenie...',
  'shell.retry': 'Spróbuj ponownie',
  'shell.progress.loading': 'Ładowanie strony...',
  'shell.progress.preparing': 'Przygotowujemy stronę...',
  'shell.progress.almost': 'Prawie gotowe...',
  'shell.errorTitle': 'Strona niedostępna',
  'shell.ready': 'Strona gotowa',

  // ------------------------------------------------------ language toggle --
  'toggle.toEnglish': 'Przełącz na angielski',
  'toggle.toPolish': 'Przełącz na polski',

  // ---------------------------------------------------------- intro cues --
  'intro.cue.01': 'Zidentyfikowanie osoby poszkodowanej',
  'intro.cue.02': 'Test kamerą termowizyjną',
  'intro.cue.03': 'Test kamerą na podczerwień',
  'intro.cue.04': 'Skanowanie otoczenia',

  // ------------------------------------------------------------- header --
  'header.brandLabel': 'AirTriage — początek strony',
  'header.navLabel': 'Sekcje strony',
  'nav.examples': 'Nasze przykłady',
  'nav.operator': 'Widok operatora',
  'nav.algorithm': 'Algorytm',

  // ----------------------------------------------------------- examples --
  'examples.title': 'Nasze przykłady',
  'examples.labelA': 'Przykład A',
  'examples.labelB': 'Przykład B',
  'examples.captionA': 'AirTriage demo dron — Glinek',
  'examples.captionB': 'AirTriage demo bpm — Glinek',
  'examples.playA': 'Odtwórz film przykładowy A: AirTriage demo dron',
  'examples.playB': 'Odtwórz film przykładowy B: AirTriage demo bpm',
  'examples.playBadge': 'Odtwórz film',

  // ------------------------------------------------------ operator view --
  'operator.title': 'Widok operatora',
  'operator.lead':
    'Widok prezentuje cztery wybrane osoby, aby czytelnie pokazać mechanizm oznaczania, wyboru i rozwijania danych w panelu operatora. Kolory zgodne są z założeniami triażu i pokazują ostrzeżenia w przypadku sprawdzonych parametrów. Podstawy naukowe znajdują się w zakładce Algorytmy.',
  'operator.filmLabel':
    'Interaktywny film. Przeciągnij w prawo, aby przesunąć film do przodu, lub w lewo, aby cofnąć.',
  'operator.overlayLabel': 'Panel operatora z czterema wskazanymi osobami',
  'operator.badge': 'Widok poglądowy',
  'operator.hint': 'Przeciągnij, aby przeanalizować',
  'operator.fallback': 'Interaktywny film jest chwilowo niedostępny.',

  // ------------------------------------------------------ operator panel --
  'panel.heading': 'Osoby w scenariuszu',
  'panel.count': '4 wskazane',
  'panel.outOfFrame': 'Poza kadrem',
  'panel.selectOnFilm': 'Wybierz {name} na filmie',
  'panel.unavailable': 'Scenariusz operatora jest niedostępny. Film nadal można przeglądać.',
  'panel.trackingLabel': 'Oznaczenia czterech wskazanych osób na filmie',

  // ----------------------------------------------------------- algorithm --
  'algorithm.title': 'Algorytm',
  'algorithm.lead':
    'AirTriage porządkuje zdalną obserwację osoby i wskazuje operatorowi, który pomiar wymaga uwagi. Demonstrator analizuje ruch, tętno (HR) i częstość oddechu (RR), ale nie zastępuje decyzji ratownika ani pełnego triażu medycznego.',
  'algorithm.panelLabel': 'Algorytm demonstratora',
  'algorithm.panelTitle': 'Od wykrycia do czytelnego sygnału',
  'algorithm.step1.title': 'Wykrycie osoby',
  'algorithm.step1.body': 'Operator kieruje kamerę i stabilizuje kadr.',
  'algorithm.step2.title': 'Obserwacja przez 30 sekund',
  'algorithm.step2.body': 'System ocenia ruch oraz zbiera HR i RR równolegle.',
  'algorithm.step3.title': 'Kontrola wiarygodności',
  'algorithm.step3.body': 'Tylko dostępny, stabilny pomiar może uruchomić alarm.',
  'algorithm.outcomesLabel': 'Możliwe wyniki algorytmu',
  'algorithm.red.status': 'Czerwony',
  'algorithm.red.title': 'Sprawdź pilnie',
  'algorithm.red.lead': 'Wiarygodny pomiar: ',
  'algorithm.red.hr': 'HR ≤40 lub ≥131/min',
  'algorithm.red.mid': ', albo ',
  'algorithm.red.rr': 'RR ≤8 lub ≥25/min',
  'algorithm.red.end': '.',
  'algorithm.yellow.status': 'Żółty',
  'algorithm.yellow.title': 'Sprawdź lub zmierz ponownie',
  'algorithm.yellow.body':
    'Brak odczytu, ruch zakłócający pomiar lub wynik pośredni: HR 41–50 / 91–130 albo RR 9–11 / 21–24.',
  'algorithm.green.status': 'Zielony',
  'algorithm.green.title': 'Brak alarmu w pomiarach',
  'algorithm.green.lead': 'Oba pomiary są dostępne: ',
  'algorithm.green.hr': 'HR 51–90/min',
  'algorithm.green.mid': ' oraz ',
  'algorithm.green.rr': 'RR 12–20/min',
  'algorithm.green.end': '. To nie oznacza „osoba zdrowa”.',
  'algorithm.note.lead': 'Czerwony ma pierwszeństwo przed żółtym i zielonym.',
  'algorithm.note.rest':
    'Dopiero gdy nie ma wiarygodnego czerwonego alarmu, brak odczytu lub wynik pośredni prowadzi do żółtego; zielony wymaga obu dostępnych pomiarów bez odchyleń. Alarm czerwony może pojawić się przed końcem obserwacji.',

  // ------------------------------------------------------------ evidence --
  'evidence.headingLabel': 'Podstawa naukowa',
  'evidence.headingTitle': 'Poparcie naukowe',
  'evidence.1.title': 'Progi HR i RR',
  'evidence.1.body':
    'Pasma czerwone, żółte i bez odchyleń oparto na NEWS2 — systemie wczesnego ostrzegania dla dorosłych. Nie oznacza to walidacji AirTriage jako systemu triażu.',
  'evidence.1.link': 'Raport Royal College of Physicians',
  'evidence.2.title': 'Bezkontaktowy pomiar parametrów',
  'evidence.2.body':
    'Badanie algorytmów dla dronowego triażu analizowało 13-sekundowe okna HR i 15-sekundowe okna RR oraz wskazało ruch i warunki pomiaru jako istotne ograniczenia.',
  'evidence.2.link': 'Tayfur i wsp., 2026',
  'evidence.3.title': 'Czas obserwacji',
  'evidence.3.body':
    'Trzydzieści sekund odpowiada długości nagrań wykorzystanych w terenowym badaniu półautomatycznej kategoryzacji z użyciem UAV. Cel 35–40 sekund całej obsługi pozostaje założeniem do pomiaru.',
  'evidence.3.link': 'Mösch i wsp., 2024',
  'evidence.4.index': '04 / Kontekst kliniczny',
  'evidence.4.title': 'Wynik wymaga interpretacji',
  'evidence.4.body':
    'Podwyższone tętno może wynikać także z wysiłku. Sam HR nie pozwala odróżnić aktywności fizycznej od urazu lub pogorszenia stanu.',
  'evidence.4.link': 'American Heart Association',

  // --------------------------------------------------------------- scope --
  'scope.label': 'Zakres demonstratora',
  'scope.title': 'Zakres POC',
  'scope.body':
    'Kolory są propozycją interfejsu AirTriage. Demonstrator nie oblicza pełnego NEWS2, START ani MITT; nie ocenia krwawienia, reakcji na głos ani kategorii medycznej na podstawie temperatury.',
}