import './experience.css'
import './operator-overlay.css'
import { createOperatorOverlay, loadOperatorScenario } from './operator-overlay.js'
import { createScrubController } from './scrub-video.js'
import { applyTranslations, onLanguageChange, t } from '../i18n/index.js'
import { createLanguageToggle } from '../i18n/language-toggle.js'

/**
 * Polish stays inline as the default and no-JS fallback; `data-i18n` keys mark
 * what `applyTranslations` swaps when another language is active. Mixed-content
 * paragraphs are split into keyed spans so the inline `<strong>` survives.
 */
const pageMarkup = `
  <article class="experience">
    <header class="experience-header">
      <a
        class="experience-header__brand"
        href="#nasze-przyklady"
        data-i18n-aria="header.brandLabel"
        aria-label="AirTriage — początek strony"
      >
        <img src="/brand/airtriage-logo.svg" alt="AirTriage" />
      </a>
      <div class="experience-header__actions">
        <nav class="experience-tabs" data-i18n-aria="header.navLabel" aria-label="Sekcje strony">
          <a href="#nasze-przyklady" data-i18n="nav.examples">Nasze przykłady</a>
          <a href="#nasz-wklad" data-i18n="nav.operator">Widok operatora</a>
          <a href="#algorytm-i-podstawa-naukowa" data-i18n="nav.algorithm">Algorytm</a>
        </nav>
        <div class="experience-header__language" data-language-slot></div>
      </div>
    </header>

    <div class="experience-content">
      <section class="content-section content-section--examples" id="nasze-przyklady">
        <div class="section-heading">
          <p class="section-heading__index" aria-hidden="true">01</p>
          <h1 data-i18n="examples.title">Nasze przykłady</h1>
        </div>

        <div class="example-grid">
          <article class="example-card">
            <div class="example-card__frame">
              <button
                class="example-card__play"
                type="button"
                data-example-video="X_x6GHqZgeo"
                data-video-title="AirTriage demo dron"
                data-i18n-aria="examples.playA"
                aria-label="Odtwórz film przykładowy A: AirTriage demo dron"
              >
                <img
                  class="example-card__poster"
                  src="https://i.ytimg.com/vi/X_x6GHqZgeo/maxresdefault.jpg"
                  alt=""
                  width="1280"
                  height="720"
                  loading="lazy"
                  decoding="async"
                />
                <span class="example-card__play-badge" data-i18n="examples.playBadge">Odtwórz film</span>
              </button>
            </div>
            <div class="example-card__copy">
              <p class="example-card__label" data-i18n="examples.labelA">Przykład A</p>
              <p data-i18n="examples.captionA">AirTriage demo dron — Glinek</p>
            </div>
          </article>

          <article class="example-card">
            <div class="example-card__frame">
              <button
                class="example-card__play"
                type="button"
                data-example-video="W03PTNARqvk"
                data-video-title="AirTriage demo bpm"
                data-i18n-aria="examples.playB"
                aria-label="Odtwórz film przykładowy B: AirTriage demo bpm"
              >
                <img
                  class="example-card__poster"
                  src="https://i.ytimg.com/vi/W03PTNARqvk/maxresdefault.jpg"
                  alt=""
                  width="1280"
                  height="720"
                  loading="lazy"
                  decoding="async"
                />
                <span class="example-card__play-badge" data-i18n="examples.playBadge">Odtwórz film</span>
              </button>
            </div>
            <div class="example-card__copy">
              <p class="example-card__label" data-i18n="examples.labelB">Przykład B</p>
              <p data-i18n="examples.captionB">AirTriage demo bpm — Glinek</p>
            </div>
          </article>
        </div>
      </section>

      <section class="content-section content-section--contribution" id="nasz-wklad">
        <div class="section-heading">
          <p class="section-heading__index" aria-hidden="true">02</p>
          <h2 data-i18n="operator.title">Widok operatora</h2>
        </div>

        <div class="contribution-body">
          <div class="contribution-caption">
            <p class="contribution-caption__text" data-i18n="operator.lead">
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
            data-i18n-aria="operator.filmLabel"
            aria-label="Interaktywny film. Przeciągnij w prawo, aby przesunąć film do przodu, lub w lewo, aby cofnąć."
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
              data-i18n-aria="operator.overlayLabel"
              aria-label="Panel operatora z czterema wskazanymi osobami"
            ></div>
            <div class="scrub-film__veil" aria-hidden="true"></div>
            <p class="scrub-film__badge" data-i18n="operator.badge">Widok poglądowy</p>
            <p class="scrub-film__hint">
              <span aria-hidden="true">←</span>
              <span data-i18n="operator.hint">Przeciągnij, aby przeanalizować</span>
              <span aria-hidden="true">→</span>
            </p>
            <p class="scrub-film__fallback" role="status" data-i18n="operator.fallback">
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
          <h2 data-i18n="algorithm.title">Algorytm</h2>
        </div>

        <div class="science-content">
          <p class="science-lead" data-i18n="algorithm.lead">
            AirTriage porządkuje zdalną obserwację osoby i wskazuje operatorowi,
            który pomiar wymaga uwagi. Demonstrator analizuje ruch, tętno (HR)
            i częstość oddechu (RR), ale nie zastępuje decyzji ratownika ani
            pełnego triażu medycznego.
          </p>

          <div class="algorithm-panel" aria-labelledby="algorithm-title">
            <div class="algorithm-panel__heading">
              <p data-i18n="algorithm.panelLabel">Algorytm demonstratora</p>
              <h3 id="algorithm-title" data-i18n="algorithm.panelTitle">
                Od wykrycia do czytelnego sygnału
              </h3>
            </div>

            <ol class="algorithm-flow">
              <li>
                <span class="algorithm-flow__number" aria-hidden="true">01</span>
                <strong data-i18n="algorithm.step1.title">Wykrycie osoby</strong>
                <span data-i18n="algorithm.step1.body">Operator kieruje kamerę i stabilizuje kadr.</span>
              </li>
              <li>
                <span class="algorithm-flow__number" aria-hidden="true">02</span>
                <strong data-i18n="algorithm.step2.title">Obserwacja przez 30 sekund</strong>
                <span data-i18n="algorithm.step2.body">System ocenia ruch oraz zbiera HR i RR równolegle.</span>
              </li>
              <li>
                <span class="algorithm-flow__number" aria-hidden="true">03</span>
                <strong data-i18n="algorithm.step3.title">Kontrola wiarygodności</strong>
                <span data-i18n="algorithm.step3.body">Tylko dostępny, stabilny pomiar może uruchomić alarm.</span>
              </li>
            </ol>

            <div
              class="algorithm-outcomes"
              data-i18n-aria="algorithm.outcomesLabel"
              aria-label="Możliwe wyniki algorytmu"
            >
              <article class="algorithm-outcome algorithm-outcome--red">
                <p class="algorithm-outcome__status" data-i18n="algorithm.red.status">Czerwony</p>
                <h4 data-i18n="algorithm.red.title">Sprawdź pilnie</h4>
                <p>
                  <span data-i18n="algorithm.red.lead">Wiarygodny pomiar: </span><strong data-i18n="algorithm.red.hr">HR ≤40 lub ≥131/min</strong><span data-i18n="algorithm.red.mid">, albo </span><strong data-i18n="algorithm.red.rr">RR ≤8 lub ≥25/min</strong><span data-i18n="algorithm.red.end">.</span>
                </p>
              </article>
              <article class="algorithm-outcome algorithm-outcome--yellow">
                <p class="algorithm-outcome__status" data-i18n="algorithm.yellow.status">Żółty</p>
                <h4 data-i18n="algorithm.yellow.title">Sprawdź lub zmierz ponownie</h4>
                <p data-i18n="algorithm.yellow.body">
                  Brak odczytu, ruch zakłócający pomiar lub wynik pośredni:
                  HR 41–50 / 91–130 albo RR 9–11 / 21–24.
                </p>
              </article>
              <article class="algorithm-outcome algorithm-outcome--green">
                <p class="algorithm-outcome__status" data-i18n="algorithm.green.status">Zielony</p>
                <h4 data-i18n="algorithm.green.title">Brak alarmu w pomiarach</h4>
                <p>
                  <span data-i18n="algorithm.green.lead">Oba pomiary są dostępne: </span><strong data-i18n="algorithm.green.hr">HR 51–90/min</strong><span data-i18n="algorithm.green.mid"> oraz </span><strong data-i18n="algorithm.green.rr">RR 12–20/min</strong><span data-i18n="algorithm.green.end">. To nie oznacza „osoba zdrowa”.</span>
                </p>
              </article>
            </div>

            <p class="algorithm-panel__note">
              <strong data-i18n="algorithm.note.lead">Czerwony ma pierwszeństwo przed żółtym i zielonym.</strong>
              <span data-i18n="algorithm.note.rest">
                Dopiero gdy nie ma wiarygodnego czerwonego alarmu, brak odczytu lub
                wynik pośredni prowadzi do żółtego; zielony wymaga obu dostępnych
                pomiarów bez odchyleń. Alarm czerwony może pojawić się przed końcem
                obserwacji.
              </span>
            </p>
          </div>

          <div class="evidence-section">
            <div class="evidence-section__heading">
              <p data-i18n="evidence.headingLabel">Podstawa naukowa</p>
              <h3 data-i18n="evidence.headingTitle">Poparcie naukowe</h3>
            </div>

            <div class="evidence-grid">
              <article class="evidence-source">
                <p class="evidence-source__index">01 / NEWS2</p>
                <h4 data-i18n="evidence.1.title">Progi HR i RR</h4>
                <p data-i18n="evidence.1.body">
                  Pasma czerwone, żółte i bez odchyleń oparto na NEWS2 — systemie
                  wczesnego ostrzegania dla dorosłych. Nie oznacza to walidacji
                  AirTriage jako systemu triażu.
                </p>
                <a
                  href="https://www.rcp.ac.uk/media/a4ibkkbf/news2-final-report_0_0.pdf"
                  data-i18n="evidence.1.link"
                >
                  Raport Royal College of Physicians
                </a>
              </article>

              <article class="evidence-source">
                <p class="evidence-source__index">02 / Scientific Reports</p>
                <h4 data-i18n="evidence.2.title">Bezkontaktowy pomiar parametrów</h4>
                <p data-i18n="evidence.2.body">
                  Badanie algorytmów dla dronowego triażu analizowało 13-sekundowe
                  okna HR i 15-sekundowe okna RR oraz wskazało ruch i warunki
                  pomiaru jako istotne ograniczenia.
                </p>
                <a href="https://doi.org/10.1038/s41598-026-40691-4" data-i18n="evidence.2.link">
                  Tayfur i wsp., 2026
                </a>
              </article>

              <article class="evidence-source">
                <p class="evidence-source__index">03 / Drones</p>
                <h4 data-i18n="evidence.3.title">Czas obserwacji</h4>
                <p data-i18n="evidence.3.body">
                  Trzydzieści sekund odpowiada długości nagrań wykorzystanych
                  w terenowym badaniu półautomatycznej kategoryzacji z użyciem UAV.
                  Cel 35–40 sekund całej obsługi pozostaje założeniem do pomiaru.
                </p>
                <a href="https://doi.org/10.3390/drones8100589" data-i18n="evidence.3.link">
                  Mösch i wsp., 2024
                </a>
              </article>

              <article class="evidence-source">
                <p class="evidence-source__index" data-i18n="evidence.4.index">
                  04 / Kontekst kliniczny
                </p>
                <h4 data-i18n="evidence.4.title">Wynik wymaga interpretacji</h4>
                <p data-i18n="evidence.4.body">
                  Podwyższone tętno może wynikać także z wysiłku. Sam HR nie pozwala
                  odróżnić aktywności fizycznej od urazu lub pogorszenia stanu.
                </p>
                <a
                  href="https://www.heart.org/en/healthy-living/exercise-and-physical-activity/fitness-basics/target-heart-rates"
                  data-i18n="evidence.4.link"
                >
                  American Heart Association
                </a>
              </article>
            </div>
          </div>

          <aside class="science-scope" data-i18n-aria="scope.label" aria-label="Zakres demonstratora">
            <p data-i18n="scope.title">Zakres POC</p>
            <p data-i18n="scope.body">
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

  onProgress({ progress: 54, message: t('shell.progress.preparing') })
  container.innerHTML = pageMarkup
  applyTranslations(container)

  const languageToggle = createLanguageToggle()
  container.querySelector('[data-language-slot]')?.append(languageToggle.element)

  const video = container.querySelector('[data-scrub-video]')
  const surface = container.querySelector('[data-scrub-surface]')
  const overlayMount = container.querySelector('[data-operator-overlay]')
  const exampleGrid = container.querySelector('.example-grid')
  const scrubController = createScrubController({ video, surface })
  const scenario = await loadOperatorScenario()
  const operatorOverlay = createOperatorOverlay({
    video,
    surface,
    mount: overlayMount,
    scenario,
  })
  let destroyed = false

  const stopLanguageSync = onLanguageChange(() => applyTranslations(container))

  /*
   * The example cards ship as poster images only. YouTube's player costs about
   * a megabyte of script per film, so it is requested on click and served from
   * the privacy domain. The click is also the gesture autoplay requires.
   */
  const onExampleVideoClick = (event) => {
    const button = event.target.closest('[data-example-video]')
    if (!button) return

    const embed = document.createElement('iframe')
    embed.className = 'example-card__embed'
    embed.src = `https://www.youtube-nocookie.com/embed/${button.dataset.exampleVideo}?autoplay=1&rel=0`
    embed.title = button.dataset.videoTitle ?? 'Film przykładowy'
    embed.allow =
      'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share'
    embed.allowFullscreen = true
    embed.referrerPolicy = 'strict-origin-when-cross-origin'
    button.replaceWith(embed)
    embed.focus()
  }

  exampleGrid?.addEventListener('click', onExampleVideoClick)

  const startVideoLoad = () => {
    if (destroyed || video.src) return
    video.src = video.dataset.videoSrc
    video.load()
  }

  Promise.resolve(videoLoadGate).then(startVideoLoad, startVideoLoad)

  onProgress({ progress: 92, message: t('shell.progress.almost') })

  return {
    destroy() {
      destroyed = true
      stopLanguageSync()
      languageToggle.destroy()
      exampleGrid?.removeEventListener('click', onExampleVideoClick)
      operatorOverlay.destroy()
      scrubController.destroy()
      video.removeAttribute('src')
      video.load()
      container.replaceChildren()
    },
  }
}