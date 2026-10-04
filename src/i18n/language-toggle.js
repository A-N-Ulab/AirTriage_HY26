import { getLanguage, onLanguageChange, t, toggleLanguage } from './index.js'

const LANGUAGES = { pl: 'PL', en: 'EN' }
const OTHER = { pl: 'en', en: 'pl' }

/**
 * Compact control that offers the *other* language, so its label always reads
 * "switch to X". Shared by the page header and, if ever needed, the intro, so
 * both stages present an identical switch.
 */
export function createLanguageToggle() {
  const button = document.createElement('button')
  button.className = 'language-toggle'
  button.type = 'button'
  button.dataset.languageToggle = ''

  const sync = () => {
    const target = OTHER[getLanguage()] ?? 'pl'
    button.dataset.languageTarget = target
    button.setAttribute(
      'aria-label',
      t(target === 'en' ? 'toggle.toEnglish' : 'toggle.toPolish'),
    )
    button.innerHTML = `<span class="language-toggle__code" lang="${target}">${LANGUAGES[target]}</span>`
  }

  const onClick = () => {
    toggleLanguage()
  }

  button.addEventListener('click', onClick)
  const stopListening = onLanguageChange(sync)
  sync()

  return {
    element: button,
    destroy() {
      stopListening()
      button.removeEventListener('click', onClick)
    },
  }
}