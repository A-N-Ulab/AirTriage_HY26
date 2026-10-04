import './video-stage.css'

const INTRO_CAPTIONS = [
  { start: 0, number: '01', text: 'Zidentyfikowanie osoby poszkodowanej' },
  { start: 5, number: '02', text: 'Test kamerą termowizyjną' },
  { start: 7, number: '03', text: 'Test kamerą na podczerwień' },
  { start: 11, number: '04', text: 'Skanowanie grupy ludzi' },
]

const captionAtTime = (currentTime) => {
  const safeTime = Number.isFinite(currentTime) ? Math.max(0, currentTime) : 0
  return INTRO_CAPTIONS.findLast(({ start }) => start <= safeTime) ?? INTRO_CAPTIONS[0]
}

/**
 * Film-stage DOM only. The corner lockup renders the brand mark, whose URL is
 * injected by the coordinator so this module never references the logo asset.
 */
export function createVideoStage({ logoUrl = '' } = {}) {
  const initialCaption = INTRO_CAPTIONS[0]
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
    </div>

    <p
      class="intro__caption"
      data-intro-caption
      data-caption-number="${initialCaption.number}"
      aria-hidden="true"
    >
      <span class="intro__caption-inner">
        <span class="intro__caption-number" data-intro-caption-number>${initialCaption.number}</span>
        <span class="intro__caption-text" data-intro-caption-text>${initialCaption.text}</span>
      </span>
    </p>

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
  caption.querySelector('[data-intro-caption-text]').textContent = cue.text
  caption.classList.remove('is-changing')
  void caption.offsetWidth
  caption.classList.add('is-changing')
}
