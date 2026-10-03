import './style.css'
import { playIntro } from './intro.js'

const revealTarget = document.querySelector('[data-coming-soon]')

if (revealTarget) {
  playIntro({ revealTarget }).catch((error) => {
    // Never let the intro keep the page from being usable.
    revealTarget.classList.add('is-revealed')
    console.error('[intro] failed:', error)
  })
}