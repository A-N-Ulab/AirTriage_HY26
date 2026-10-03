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
  const loader = createDemoLoader({
    importDemo: () => import('./demo/index.js'),
    container: mount,
    onState: (state) => {
      shell.dataset.state = state.status
      shell.setAttribute('aria-busy', String(state.status === 'loading'))
      title.textContent = state.status === 'error' ? 'Demo unavailable' : 'Loading demo'
      message.textContent = state.message
      progress.value = state.progress
      progress.textContent = `${Math.round(state.progress)}%`

      if (state.error) console.error('[demo] failed:', state.error)
    },
  })

  const beginDemoLoad = () => loader.start()
  requestAnimationFrame(() => {
    if ('requestIdleCallback' in window) {
      window.requestIdleCallback(beginDemoLoad, { timeout: 800 })
    } else {
      setTimeout(beginDemoLoad, 50)
    }
  })

  bindRetry(retry, () => window.location.reload())

  playIntro({ revealTarget: shell }).catch((error) => {
    shell.classList.add('is-revealed')
    console.error('[intro] failed:', error)
  })
}
