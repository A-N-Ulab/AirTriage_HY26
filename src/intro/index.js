import './intro.css'
import { createLogoStage } from './logo-stage.js'
import { createVideoStage } from './video-stage.js'
import { PHASE, YT_PLAYING, createIntroLoader } from './timeline.js'

const VIDEO_ID = 'egf9XjBIgF0'
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
  overlay.append(createVideoStage(), createLogoStage())
  document.body.append(overlay)

  const iframe = overlay.querySelector('.intro__iframe')
  const bar = overlay.querySelector('.intro__progress-bar')
  const skipButton = overlay.querySelector('.intro__skip')
  const tapButton = overlay.querySelector('.intro__tap')

  const loader = createIntroLoader({
    onChange: ({ phase, progress }) => {
      overlay.dataset.phase = phase
      bar.style.transform = `scaleX(${progress.toFixed(4)})`

      if (phase === PHASE.HANDOFF) {
        revealTarget?.classList.add('is-revealed')
      }
    },
    onStall: () => {
      overlay.dataset.tap = 'visible'
    },
  })

  const hideTap = () => {
    overlay.dataset.tap = 'hidden'
  }

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
    // is the only signal we get, and missing it would wrongly raise the tap pill.
    if (payload.info?.playerState === YT_PLAYING) {
      hideTap()
      loader.markVideoReady()
    }
  }

  const onSkip = () => loader.skip()

  const onKeyDown = (event) => {
    if (event.key === 'Escape') loader.skip()
  }

  // Muted autoplay can still be refused; a user gesture is a valid way to retry.
  const onTap = () => {
    hideTap()
    iframe.contentWindow?.postMessage(
      JSON.stringify({ event: 'command', func: 'playVideo', args: [] }),
      '*',
    )
    // If the gesture did not help, stop waiting and let the intro finish.
    setTimeout(() => {
      overlay.dataset.tap = 'hidden'
      loader.markVideoReady()
    }, 2500)
  }

  const teardown = () => {
    window.removeEventListener('message', onMessage)
    window.removeEventListener('keydown', onKeyDown)
    skipButton.removeEventListener('click', onSkip)
    tapButton.removeEventListener('click', onTap)
    loader.destroy()
    iframe.src = 'about:blank'
    iframe.remove()
    overlay.remove()
  }

  skipButton.addEventListener('click', onSkip)
  tapButton.addEventListener('click', onTap)
  window.addEventListener('message', onMessage)
  window.addEventListener('keydown', onKeyDown)

  iframe.src = embedSrc()

  loader.done.then(() => {
    overlay.dataset.leaving = 'true'
    setTimeout(teardown, reducedMotion() ? 200 : 700)
  })

  return loader.start()
}
