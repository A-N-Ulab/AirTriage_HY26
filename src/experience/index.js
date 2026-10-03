import './experience.css'
import { createScrubController } from './scrub-video.js'

const pageMarkup = `
  <article class="experience">
    <header class="experience-header">
      <a class="experience-header__brand" href="#nasze-przyklady" aria-label="AirTriage — początek strony">
        <img src="/brand/airtriage-logo.svg" alt="AirTriage" />
      </a>
      <nav class="experience-tabs" aria-label="Sekcje strony">
        <a href="#nasze-przyklady">Nasze przykłady</a>
        <a href="#nasz-wklad">Nasz wkład</a>
        <a href="#poparcie-naukowe">Poparcie naukowe</a>
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
          <h2>Nasz wkład</h2>
        </div>

        <div class="contribution-body">
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
              src="/video/film_2.mp4"
              preload="auto"
              muted
              playsinline
              draggable="false"
            ></video>
            <div class="scrub-film__veil" aria-hidden="true"></div>
            <p class="scrub-film__hint">
              <span aria-hidden="true">←</span>
              Przeciągnij, aby obrócić
              <span aria-hidden="true">→</span>
            </p>
            <p class="scrub-film__fallback" role="status">
              Interaktywny film jest chwilowo niedostępny.
            </p>
          </div>
          <div class="contribution-caption">
            <p class="contribution-caption__label">Widok operatora dronu</p>
            <p>Tu będzie opis</p>
          </div>
        </div>
      </section>

      <section class="content-section content-section--science" id="poparcie-naukowe">
        <div class="section-heading">
          <p class="section-heading__index" aria-hidden="true">03</p>
          <h2>Poparcie naukowe</h2>
        </div>
        <div class="science-copy">
          <span class="science-copy__rule" aria-hidden="true"></span>
          <p>Tu będzie opis</p>
        </div>
      </section>
    </div>

    <footer class="experience-footer">
      <img src="/brand/airtriage-logo.svg" alt="AirTriage" />
    </footer>
  </article>
`

export async function createExperience({ container, onProgress = () => {} }) {
  if (!(container instanceof HTMLElement)) {
    throw new TypeError('A valid experience container is required')
  }

  onProgress({ progress: 54, message: 'Przygotowujemy stronę...' })
  container.innerHTML = pageMarkup

  const video = container.querySelector('[data-scrub-video]')
  const surface = container.querySelector('[data-scrub-surface]')
  const scrubController = createScrubController({ video, surface })

  onProgress({ progress: 92, message: 'Prawie gotowe...' })

  return {
    destroy() {
      scrubController.destroy()
      video.removeAttribute('src')
      video.load()
      container.replaceChildren()
    },
  }
}
