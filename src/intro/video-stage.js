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
        <iframe
          class="intro__iframe"
          title="Drone footage over the Tatra mountains"
          allow="autoplay; encrypted-media; picture-in-picture"
          allowfullscreen
          tabindex="-1"
        ></iframe>
      </div>
      <div class="intro__shield"></div>
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

    <div class="intro__progress" role="presentation">
      <i class="intro__progress-bar"></i>
    </div>
  `
  return stage
}