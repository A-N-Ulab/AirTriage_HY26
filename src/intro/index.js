import './intro.css'
import { createLogoStage } from './logo-stage.js'
import { createVideoStage } from './video-stage.js'
import { PHASE, createIntroLoader } from './timeline.js'

// Owned by the coordinator and injected into both stages, so neither the logo
// stage nor the film stage references the brand asset directly.
const LOGO_ASSET_PATH = '/brand/airtriage-logo.svg'

const reducedMotion = () =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

export function playIntro({ revealTarget } = {}) {
  const overlay = document.createElement('div')
  overlay.className = 'intro'
  overlay.dataset.phase = PHASE.IDLE
  overlay.append(
    createVideoStage({ logoUrl: LOGO_ASSET_PATH }),
    createLogoStage({ logoUrl: LOGO_ASSET_PATH }),
  )
  document.body.append(overlay)

  const loader = createIntroLoader({
    onChange: ({ phase }) => {
      overlay.dataset.phase = phase

      if (phase === PHASE.HANDOFF) {
        revealTarget?.classList.add('is-revealed')
      }
    },
  })

  const onKeyDown = (event) => {
    if (event.key === 'Escape') loader.skip()
  }

  const teardown = () => {
    window.removeEventListener('keydown', onKeyDown)
    loader.destroy()
    const video = overlay.querySelector('.intro__video')
    video.pause()
    video.removeAttribute('src')
    video.load()
    video.remove()
    overlay.remove()
  }

  window.addEventListener('keydown', onKeyDown)

  loader.done.then(() => {
    overlay.dataset.leaving = 'true'
    setTimeout(teardown, reducedMotion() ? 200 : 700)
  })

  return loader.start()
}
