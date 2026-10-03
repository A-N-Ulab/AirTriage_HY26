import './video-stage.css'

export function createVideoStage() {
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
      <span class="intro__accent intro__accent--lockup"></span>
      <span class="intro__name">AirTriage</span>
    </div>

    <button class="intro__skip" type="button">
      Skip <span aria-hidden="true">&rarr;</span>
    </button>

    <button class="intro__tap" type="button">Tap to begin</button>

    <div class="intro__progress" role="presentation">
      <i class="intro__progress-bar"></i>
    </div>
  `
  return stage
}
