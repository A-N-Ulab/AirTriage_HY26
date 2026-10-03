import './intro.css'
import { createLogoStage } from './logo-stage.js'
import { createVideoStage } from './video-stage.js'
import { PHASE, createIntroLoader, createPlaybackWatchdog } from './timeline.js'

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
  const video = overlay.querySelector('.intro__video')

  const loader = createIntroLoader({
    onChange: ({ phase }) => {
      overlay.dataset.phase = phase

      if (phase === PHASE.VIDEO) {
        video.currentTime = 0
        watchdog.start()
        video.play().catch(() => loader.completeVideo())
      }

      if (phase === PHASE.HANDOFF) {
        watchdog.destroy()
        revealTarget?.classList.add('is-revealed')
      }
    },
  })

  const watchdog = createPlaybackWatchdog({
    onTimeout: () => loader.completeVideo(),
  })

  const onVideoFinished = () => {
    watchdog.destroy()
    loader.completeVideo()
  }

  const onKeyDown = (event) => {
    if (event.key === 'Escape') loader.skip()
  }

  const teardown = () => {
    window.removeEventListener('keydown', onKeyDown)
    video.removeEventListener('ended', onVideoFinished)
    video.removeEventListener('error', onVideoFinished)
    video.removeEventListener('playing', watchdog.markProgress)
    video.removeEventListener('timeupdate', watchdog.markProgress)
    watchdog.destroy()
    loader.destroy()
    video.pause()
    video.removeAttribute('src')
    video.load()
    video.remove()
    overlay.remove()
  }

  video.addEventListener('ended', onVideoFinished)
  video.addEventListener('error', onVideoFinished)
  video.addEventListener('playing', watchdog.markProgress)
  video.addEventListener('timeupdate', watchdog.markProgress)
  window.addEventListener('keydown', onKeyDown)

  loader.done.then(() => {
    overlay.dataset.leaving = 'true'
    setTimeout(teardown, reducedMotion() ? 200 : 700)
  })

  return loader.start()
}
