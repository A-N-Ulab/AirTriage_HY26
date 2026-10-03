import './logo-stage.css'

/**
 * Logo-stage DOM only. The mark's URL is injected by the coordinator so this
 * module stays independent of the film stage and of the brand asset location.
 */
export function createLogoStage({ logoUrl = '' } = {}) {
  const stage = document.createElement('section')
  stage.className = 'intro-logo'
  stage.setAttribute('aria-label', 'AirTriage')
  stage.innerHTML = `
    <img
      class="intro-logo__image"
      src="${logoUrl}"
      alt="AirTriage"
      width="1024"
      height="411"
    />
  `
  return stage
}