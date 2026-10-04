import './video-stage.css'
import { onLanguageChange, t } from '../i18n/index.js'

/**
 * Only the timeline lives here; the cue wording comes from the dictionaries so
 * the film reads in whichever language the visitor arrived with.
 */
const INTRO_CUES = [
  { start: 0, number: '01', key: 'intro.cue.01' },
  { start: 5, number: '02', key: 'intro.cue.02' },
  { start: 7, number: '03', key: 'intro.cue.03' },
  { start: 11, number: '04', key: 'intro.cue.04' },
]

const captionAtTime = (currentTime) => {
  const safeTime = Number.isFinite(currentTime) ? Math.max(0, currentTime) : 0
  return INTRO_CUES.findLast(({ start }) => start <= safeTime) ?? INTRO_CUES[0]
}

/**
 * Film-stage DOM only. The corner lockup renders the brand mark, whose URL is
 * injected by the coordinator so this module never references the logo asset.
 */
export function createVideoStage({ logoUrl = '' } = {}) {
  const initialCaption = INTRO_CUES[0]
  const stage = document.createElement('section')
  stage.className = 'intro-film'
  stage.innerHTML = `
    <div class="intro__media" aria-hidden="true">
      <div class="intro__drift">
        <video
          class="intro__video"
          src="/video/RYSY_demo_20s_dopracowany.mp4"
          muted
          playsinline
          preload="auto"
        ></video>
      </div>
    </div>

    <div class="intro__scrim" aria-hidden="true"></div>

    <div class="intro__lockup" aria-hidden="true">
      <img
        class="intro__lockup-logo"
        src="${logoUrl}"
        alt=""
        width="1024"
        height="411"
      />

      <p
        class="intro__caption"
        data-intro-caption
        data-caption-number="${initialCaption.number}"
      >
        <span class="intro__caption-inner">
          <span class="intro__caption-number" data-intro-caption-number>${initialCaption.number}</span>
          <span class="intro__caption-text" data-intro-caption-text>${t(initialCaption.key)}</span>
        </span>
      </p>
    </div>

  `
  return stage
}

export function updateIntroCaption(stage, currentTime) {
  const caption = stage.querySelector('[data-intro-caption]')
  if (!caption) return

  const cue = captionAtTime(currentTime)
  if (caption.dataset.captionNumber === cue.number) return

  caption.dataset.captionNumber = cue.number
  caption.querySelector('[data-intro-caption-number]').textContent = cue.number
  caption.querySelector('[data-intro-caption-text]').textContent = t(cue.key)
  caption.classList.remove('is-changing')
  void caption.offsetWidth
  caption.classList.add('is-changing')
}

/**
 * Re-reads the active cue without replaying the entrance animation, so a
 * language switch mid-intro swaps the wording in place.
 */
export function refreshIntroCaptionLanguage(stage, currentTime) {
  const caption = stage.querySelector('[data-intro-caption]')
  if (!caption) return

  const cue = captionAtTime(currentTime)
  caption.querySelector('[data-intro-caption-text]').textContent = t(cue.key)
}

export function watchIntroCaptionLanguage(stage, getCurrentTime = () => 0) {
  return onLanguageChange(() => refreshIntroCaptionLanguage(stage, getCurrentTime()))
}
