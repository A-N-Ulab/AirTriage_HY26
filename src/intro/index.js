import './intro.css'
import { createLogoStage } from './logo-stage.js'
import { createVideoStage } from './video-stage.js'
import { PHASE, YT_PLAYING, createIntroLoader } from './timeline.js'

const VIDEO_ID = 'egf9XjBIgF0'
// Owned by the coordinator and injected into both stages, so neither the logo
// stage nor the film stage references the brand asset directly.
const LOGO_ASSET_PATH = '/brand/airtriage-logo.svg'
// Tweak these two to pick a different moment of the drone reel.
const SEGMENT_START = 85
const SEGMENT_END = 100

const EMBED_ORIGINS = [
  'https://www.youtube-nocookie.com',
  'https://www.youtube.com',
]

const reducedMotion = () =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

function embedSrc() {
  const params = new URLSearchParams({
    start: String(SEGMENT_START),
    end: String(SEGMENT_END),
    autoplay: '1',
    mute: '1',
    controls: '0',
    disablekb: '1',
    fs: '0',
    rel: '0',
    playsinline: '1',
    iv_load_policy: '3',
    enablejsapi: '1',
    // Required, otherwise postMessage is silently dropped in some browsers.
    origin: window.location.origin,
  })
  return `https://www.youtube-nocookie.com/embed/${VIDEO_ID}?${params}`
}

export function playIntro({ revealTarget } = {}) {
  const overlay = document.createElement('div')
  overlay.className = 'intro'
  overlay.dataset.phase = PHASE.IDLE
  overlay.append(
    createVideoStage({ logoUrl: LOGO_ASSET_PATH }),
    createLogoStage({ logoUrl: LOGO_ASSET_PATH }),
  )
  document.body.append(overlay)

  const iframe = overlay.querySelector('.intro__iframe')
  const bar = overlay.querySelector('.intro__progress-bar')

  const loader = createIntroLoader({
    onChange: ({ phase, progress }) => {
      overlay.dataset.phase = phase
      bar.style.transform = `scaleX(${progress.toFixed(4)})`

      if (phase === PHASE.HANDOFF) {
        revealTarget?.classList.add('is-revealed')
      }
    },
  })

  const onMessage = (event) => {
    if (!EMBED_ORIGINS.includes(event.origin)) return
    if (typeof event.data !== 'string') return

    let payload
    try {
      payload = JSON.parse(event.data)
    } catch {
      return
    }

    if (!payload || payload.id !== VIDEO_ID) return

    // Accept PLAYING from any player event, not just onStateChange: if playback
    // starts before the first state change is delivered, onReady/initialDelivery
    // is the only signal we get, and missing it would hold the cruise beat.
    if (payload.info?.playerState === YT_PLAYING) {
      loader.markVideoReady()
    }
  }

  // Escape remains as the keyboard route past the film; there are no visible
  // controls, so the autoplay guard in the timeline is the only other path and
  // it always lets the intro finish on its own.
  const onKeyDown = (event) => {
    if (event.key === 'Escape') loader.skip()
  }

  const teardown = () => {
    window.removeEventListener('message', onMessage)
    window.removeEventListener('keydown', onKeyDown)
    loader.destroy()
    iframe.src = 'about:blank'
    iframe.remove()
    overlay.remove()
  }

  window.addEventListener('message', onMessage)
  window.addEventListener('keydown', onKeyDown)

  iframe.src = embedSrc()

  loader.done.then(() => {
    overlay.dataset.leaving = 'true'
    setTimeout(teardown, reducedMotion() ? 200 : 700)
  })

  return loader.start()
}