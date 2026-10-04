import './style.css'
import { playIntro } from './intro/index.js'
import { bindRetry, createDemoLoader } from './demo-loader.js'

const shell = document.querySelector('[data-demo-shell]')
const mount = document.querySelector('[data-demo-mount]')
const title = document.querySelector('[data-demo-title]')
const message = document.querySelector('[data-demo-message]')
const progress = document.querySelector('[data-demo-progress]')
const retry = document.querySelector('[data-demo-retry]')

if (shell && mount && title && message && progress && retry) {
  let allowInteractiveVideoLoad
  const interactiveVideoLoadGate = new Promise((resolve) => {
    allowInteractiveVideoLoad = resolve
  })

  const loader = createDemoLoader({
    importDemo: () => import('./experience/index.js'),
    container: mount,
    experienceOptions: { videoLoadGate: interactiveVideoLoadGate },
    onState: (state) => {
      shell.dataset.state = state.status
      shell.setAttribute('aria-busy', String(state.status === 'loading'))
      title.textContent = state.status === 'error' ? 'Strona niedostępna' : 'Ładowanie strony'
      message.textContent = state.message
      progress.value = state.progress
      progress.textContent = `${Math.round(state.progress)}%`

      if (state.error) console.error('[experience] failed:', state.error)
    },
  })

  const beginExperienceLoad = () => loader.start()
  requestAnimationFrame(() => {
    if ('requestIdleCallback' in window) {
      window.requestIdleCallback(beginExperienceLoad, { timeout: 800 })
    } else {
      setTimeout(beginExperienceLoad, 50)
    }
  })

  bindRetry(retry, () => window.location.reload())

  playIntro({
    revealTarget: shell,
    onVideoBuffered: allowInteractiveVideoLoad,
  }).catch((error) => {
    allowInteractiveVideoLoad()
    shell.classList.add('is-revealed')
    console.error('[intro] failed:', error)
  })
}
