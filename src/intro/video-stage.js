import './video-stage.css'

/**
 * Film-stage DOM only. The corner lockup renders the brand mark, whose URL is
 * injected by the coordinator so this module never references the logo asset.
 */
export function createVideoStage({ logoUrl = '' } = {}) {
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

  `
  return stage
}
