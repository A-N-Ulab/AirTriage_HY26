import './experience.css'
import './operator-overlay.css'
import { createOperatorOverlay, loadOperatorScenario } from './operator-overlay.js'
import { createScrubController } from './scrub-video.js'

const pageMarkup = `
  <article class="experience">
    <header class="experience-header">
      <a class="experience-header__brand" href="#nasze-przyklady" aria-label="AirTriage — początek strony">
        <img src="/brand/airtriage-logo.svg" alt="AirTriage" />
      </a>
      <nav class="experience-tabs" aria-label="Sekcje strony">
        <a href="#nasze-przyklady">Nasze przykłady</a>
        <a href="#nasz-wklad">Widok operatora</a>
        <a href="#algorytm-i-podstawa-naukowa">Algorytm</a>
      </nav>
    </header>

    <div class="experience-content">
      <section class="content-section content-section--examples" id="nasze-przyklady">
        <div class="section-heading">
          <p class="section-heading__index" aria-hidden="true">01</p>
          <h1>Nasze przykłady</h1>
        </div>

        <div class="example-grid">
          <article class="example-card">
            <div
              class="example-card__placeholder"
              role="img"
              aria-label="Miejsce na film przykładowy A"
            >
              <span>Film przykładowy zostanie dodany później</span>
            </div>
            <div class="example-card__copy">
              <p class="example-card__label">Przykład A</p>
              <p>Tu będzie opis</p>
            </div>
          </article>

          <article class="example-card">
            <div
              class="example-card__placeholder"
              role="img"
              aria-label="Miejsce na film przykładowy B"
            >
              <span>Film przykładowy zostanie dodany później</span>
            </div>
            <div class="example-card__copy">
              <p class="example-card__label">Przykład B</p>
              <p>Tu będzie opis</p>
            </div>
          </article>
        </div>
      </section>

      <section class="content-section content-section--contribution" id="nasz-wklad">
        <div class="section-heading">
          <p class="section-heading__index" aria-hidden="true">02</p>
          <h2>Widok operatora</h2>
        </div>

        <div class="contribution-body">
          <div class="contribution-caption">
            <p class="contribution-caption__text">
              Widok prezentuje cztery wybrane osoby, aby czytelnie pokazać mechanizm
              oznaczania, wyboru i rozwijania danych w panelu operatora. Kolory zgodne są
              z założeniami triażu i pokazują ostrzeżenia w przypadku sprawdzonych
              parametrów. Podstawy naukowe znajdują się w zakładce Algorytmy.
            </p>
          </div>

          <div
            class="scrub-film"
            data-scrub-surface
            data-media-state="loading"
            data-dragging="false"
            role="group"
            aria-label="Interaktywny film. Przeciągnij w prawo, aby przesunąć film do przodu, lub w lewo, aby go cofnąć."
          >
            <video
              class="scrub-film__video"
              data-scrub-video
              data-video-src="/video/film_2.mp4"
              preload="none"
              muted
              playsinline
              draggable="false"
            ></video>
            <div
              class="operator-overlay"
              data-operator-overlay
              aria-label="Panel operatora z czterema wskazanymi osobami"
            ></div>
            <div class="scrub-film__veil" aria-hidden="true"></div>
            <p class="scrub-film__badge">Widok poglądowy</p>
            <p class="scrub-film__hint">
              <span aria-hidden="true">←</span>
              Przeciągnij, aby przeanalizować
              <span aria-hidden="true">→</span>
            </p>
            <p class="scrub-film__fallback" role="status">
              Interaktywny film jest chwilowo niedostępny.
            </p>
          </div>
        </div>
      </section>

      <section
        class="content-section content-section--science"
        id="algorytm-i-podstawa-naukowa"
      >
        <div class="section-heading">
          <p class="section-heading__index" aria-hidden="true">03</p>
          <h2>Algorytm</h2>
        </div>

        <div class="science-content">
          <p class="science-lead">
            AirTriage porządkuje zdalną obserwację osoby i wskazuje operatorowi,
            który pomiar wymaga uwagi. Demonstrator analizuje ruch, tętno (HR)
            i częstość oddechu (RR), ale nie zastępuje decyzji ratownika ani
            pełnego triażu medycznego.
          </p>

          <div class="algorithm-panel" aria-labelledby="algorithm-title">
            <div class="algorithm-panel__heading">
              <p>Algorytm demonstratora</p>
              <h3 id="algorithm-title">Od wykrycia do czytelnego sygnału</h3>
            </div>

            <ol class="algorithm-flow">
              <li>
                <span class="algorithm-flow__number" aria-hidden="true">01</span>
                <strong>Wykrycie osoby</strong>
                <span>Operator kieruje kamerę i stabilizuje kadr.</span>
              </li>
              <li>
                <span class="algorithm-flow__number" aria-hidden="true">02</span>
                <strong>Obserwacja przez 30 sekund</strong>
                <span>System ocenia ruch oraz zbiera HR i RR równolegle.</span>
              </li>
              <li>
                <span class="algorithm-flow__number" aria-hidden="true">03</span>
                <strong>Kontrola wiarygodności</strong>
                <span>Tylko dostępny, stabilny pomiar może uruchomić alarm.</span>
              </li>
            </ol>

            <div class="algorithm-outcomes" aria-label="Możliwe wyniki algorytmu">
              <article class="algorithm-outcome algorithm-outcome--red">
                <p class="algorithm-outcome__status">Czerwony</p>
                <h4>Sprawdź pilnie</h4>
                <p>
                  Wiarygodny pomiar: <strong>HR ≤40 lub ≥131/min</strong>, albo
                  <strong>RR ≤8 lub ≥25/min</strong>.
                </p>
              </article>
              <article class="algorithm-outcome algorithm-outcome--yellow">
                <p class="algorithm-outcome__status">Żółty</p>
                <h4>Sprawdź lub zmierz ponownie</h4>
                <p>
                  Brak odczytu, ruch zakłócający pomiar lub wynik pośredni:
                  HR 41–50 / 91–130 albo RR 9–11 / 21–24.
                </p>
              </article>
              <article class="algorithm-outcome algorithm-outcome--green">
                <p class="algorithm-outcome__status">Zielony</p>
                <h4>Brak alarmu w pomiarach</h4>
                <p>
                  Oba pomiary są dostępne: <strong>HR 51–90/min</strong> oraz
                  <strong>RR 12–20/min</strong>. To nie oznacza „osoba zdrowa”.
                </p>
              </article>
            </div>

            <p class="algorithm-panel__note">
              <strong>Czerwony ma pierwszeństwo przed żółtym i zielonym.</strong>
              Dopiero gdy nie ma wiarygodnego czerwonego alarmu, brak odczytu lub
              wynik pośredni prowadzi do żółtego; zielony wymaga obu dostępnych
              pomiarów bez odchyleń. Alarm czerwony może pojawić się przed końcem
              obserwacji.
            </p>
          </div>

          <div class="evidence-section">
            <div class="evidence-section__heading">
              <p>Podstawa naukowa</p>
              <h3>Poparcie naukowe</h3>
            </div>

            <div class="evidence-grid">
              <article class="evidence-source">
                <p class="evidence-source__index">01 / NEWS2</p>
                <h4>Progi HR i RR</h4>
                <p>
                  Pasma czerwone, żółte i bez odchyleń oparto na NEWS2 — systemie
                  wczesnego ostrzegania dla dorosłych. Nie oznacza to walidacji
                  AirTriage jako systemu triażu.
                </p>
                <a href="https://www.rcp.ac.uk/media/a4ibkkbf/news2-final-report_0_0.pdf">
                  Raport Royal College of Physicians
                </a>
              </article>

              <article class="evidence-source">
                <p class="evidence-source__index">02 / Scientific Reports</p>
                <h4>Bezkontaktowy pomiar parametrów</h4>
                <p>
                  Badanie algorytmów dla dronowego triażu analizowało 13-sekundowe
                  okna HR i 15-sekundowe okna RR oraz wskazało ruch i warunki
                  pomiaru jako istotne ograniczenia.
                </p>
                <a href="https://doi.org/10.1038/s41598-026-40691-4">
                  Tayfur i wsp., 2026
                </a>
              </article>

              <article class="evidence-source">
                <p class="evidence-source__index">03 / Drones</p>
                <h4>Czas obserwacji</h4>
                <p>
                  Trzydzieści sekund odpowiada długości nagrań wykorzystanych
                  w terenowym badaniu półautomatycznej kategoryzacji z użyciem UAV.
                  Cel 35–40 sekund całej obsługi pozostaje założeniem do pomiaru.
                </p>
                <a href="https://doi.org/10.3390/drones8100589">
                  Mösch i wsp., 2024
                </a>
              </article>

              <article class="evidence-source">
                <p class="evidence-source__index">04 / Kontekst kliniczny</p>
                <h4>Wynik wymaga interpretacji</h4>
                <p>
                  Podwyższone tętno może wynikać także z wysiłku. Sam HR nie pozwala
                  odróżnić aktywności fizycznej od urazu lub pogorszenia stanu.
                </p>
                <a href="https://www.heart.org/en/healthy-living/exercise-and-physical-activity/fitness-basics/target-heart-rates">
                  American Heart Association
                </a>
              </article>
            </div>
          </div>

          <aside class="science-scope" aria-label="Zakres demonstratora">
            <p>Zakres POC</p>
            <p>
              Kolory są propozycją interfejsu AirTriage. Demonstrator nie oblicza
              pełnego NEWS2, START ani MITT; nie ocenia krwawienia, reakcji na głos
              ani kategorii medycznej na podstawie temperatury.
            </p>
          </aside>
        </div>
      </section>
    </div>

    <footer class="experience-footer">
      <img src="/brand/airtriage-logo.svg" alt="AirTriage" />
    </footer>
  </article>
`

export async function createExperience({
  container,
  onProgress = () => {},
  videoLoadGate = Promise.resolve(),
}) {
  if (!(container instanceof HTMLElement)) {
    throw new TypeError('A valid experience container is required')
  }

  onProgress({ progress: 54, message: 'Przygotowujemy stronę...' })
  container.innerHTML = pageMarkup

  const video = container.querySelector('[data-scrub-video]')
  const surface = container.querySelector('[data-scrub-surface]')
  const overlayMount = container.querySelector('[data-operator-overlay]')
  const scrubController = createScrubController({ video, surface })
  const scenario = await loadOperatorScenario()
  const operatorOverlay = createOperatorOverlay({
    video,
    surface,
    mount: overlayMount,
    scenario,
  })
  let destroyed = false

  const startVideoLoad = () => {
    if (destroyed || video.src) return
    video.src = video.dataset.videoSrc
    video.load()
  }

  Promise.resolve(videoLoadGate).then(startVideoLoad, startVideoLoad)

  onProgress({ progress: 92, message: 'Prawie gotowe...' })

  return {
    destroy() {
      destroyed = true
      operatorOverlay.destroy()
      scrubController.destroy()
      video.removeAttribute('src')
      video.load()
      container.replaceChildren()
    },
  }
}
