import './logo-stage.css'

const ASSET_PATH = '/brand/airtriage-logo.svg'

export function createLogoStage() {
  const stage = document.createElement('section')
  stage.className = 'intro-logo'
  stage.setAttribute('aria-label', 'AirTriage')
  stage.innerHTML = `
    <img
      class="intro-logo__image"
      src="${ASSET_PATH}"
      alt="AirTriage"
      width="1024"
      height="411"
    />
  `
  return stage
}
