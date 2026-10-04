import './intro.css'
import { createLogoStage } from './logo-stage.js'
import { createVideoStage, updateIntroCaption } from './video-stage.js'
import { PHASE, createIntroLoader, createPlaybackWatchdog } from './timeline.js'

// Owned by the coordinator and injected into both stages, so neither the logo
// stage nor the film stage references the brand asset directly.
const LOGO_ASSET_PATH = '/brand/airtriage-logo.svg'

const reducedMotion = () =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

export function playIntro({ revealTarget, onVideoBuffered = () => {} } = {}) {
  document.documentElement.classList.add('intro-active')
  const overlay = document.createElement('div')
  overlay.className = 'intro'
  overlay.dataset.phase = PHASE.IDLE
  overlay.dataset.videoReady = 'false'
  const videoStage = createVideoStage({ logoUrl: LOGO_ASSET_PATH })
  overlay.append(videoStage, createLogoStage({ logoUrl: LOGO_ASSET_PATH }))
  document.body.append(overlay)
  const video = overlay.querySelector('.intro__video')
  let backgroundLoadReleased = false

  const releaseBackgroundLoad = () => {
    if (backgroundLoadReleased) return
    backgroundLoadReleased = true
    onVideoBuffered()
  }

  const releaseWhenBuffered = () => {
    if (video.readyState >= 4) {
      releaseBackgroundLoad()
      return
    }

    if (!Number.isFinite(video.duration) || video.duration <= 0) return
    for (let index = 0; index < video.buffered.length; index += 1) {
      const coversWholeFilm =
        video.buffered.start(index) <= 0.25 &&
        video.buffered.end(index) >= video.duration - 0.25
      if (coversWholeFilm) {
        releaseBackgroundLoad()
        return
      }
    }
  }

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
        releaseBackgroundLoad()
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

  const onVideoError = () => {
    releaseBackgroundLoad()
    onVideoFinished()
  }

  const onVideoPlaying = () => {
    overlay.dataset.videoReady = 'true'
    watchdog.markProgress()
  }

  const onVideoTimeUpdate = () => {
    watchdog.markProgress()
    updateIntroCaption(videoStage, video.currentTime)
  }

  const onKeyDown = (event) => {
    if (event.key === 'Escape') loader.skip()
  }

  const teardown = () => {
    window.removeEventListener('keydown', onKeyDown)
    video.removeEventListener('ended', onVideoFinished)
    video.removeEventListener('error', onVideoError)
    video.removeEventListener('playing', onVideoPlaying)
    video.removeEventListener('canplaythrough', releaseBackgroundLoad)
    video.removeEventListener('progress', releaseWhenBuffered)
    video.removeEventListener('timeupdate', onVideoTimeUpdate)
    watchdog.destroy()
    loader.destroy()
    video.pause()
    video.removeAttribute('src')
    video.load()
    video.remove()
    overlay.remove()
    document.documentElement.classList.remove('intro-active')
  }

  video.addEventListener('ended', onVideoFinished)
  video.addEventListener('error', onVideoError)
  video.addEventListener('playing', onVideoPlaying)
  video.addEventListener('canplaythrough', releaseBackgroundLoad)
  video.addEventListener('progress', releaseWhenBuffered)
  video.addEventListener('timeupdate', onVideoTimeUpdate)
  window.addEventListener('keydown', onKeyDown)

  loader.done.then(() => {
    overlay.dataset.leaving = 'true'
    setTimeout(teardown, reducedMotion() ? 200 : 700)
  })

  return loader.start()
}
