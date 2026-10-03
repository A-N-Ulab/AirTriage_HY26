export const PHASE = Object.freeze({
  IDLE: 'idle',
  TITLE: 'title',
  DISSOLVE: 'dissolve',
  CRUISE: 'cruise',
  HANDOFF: 'handoff',
  SETTLE: 'settle',
  DONE: 'done',
})

export const STEP_MS = Object.freeze({
  [PHASE.TITLE]: 1000,
  [PHASE.DISSOLVE]: 600,
  [PHASE.CRUISE]: 4000,
  [PHASE.HANDOFF]: 600,
  [PHASE.SETTLE]: 800,
})

const ORDER = [
  PHASE.TITLE,
  PHASE.DISSOLVE,
  PHASE.CRUISE,
  PHASE.HANDOFF,
  PHASE.SETTLE,
]

const sum = (list) => list.reduce((total, phase) => total + STEP_MS[phase], 0)
const TOTAL_MS = sum(ORDER)

const YT_PLAYING = 1

/**
 * Owns the intro timeline and nothing else — no DOM, no video element.
 * `intro.js` subscribes to `onChange` and paints whatever phase comes back.
 */
export function createIntroLoader({
  autoplayGuardMs = 1500,
  onChange,
  onStall,
} = {}) {
  let phase = PHASE.IDLE
  let cursor = -1
  let spentMs = 0
  let enteredAt = 0
  let videoReady = false
  let stepTimer = null
  let guardTimer = null
  let resolveDone
  const done = new Promise((resolve) => {
    resolveDone = resolve
  })

  const elapsedMs = () =>
    phase === PHASE.DONE
      ? TOTAL_MS
      : spentMs + (performance.now() - enteredAt)

  const emit = () => {
    if (typeof onChange === 'function') {
      onChange({ phase, progress: Math.min(elapsedMs() / TOTAL_MS, 1) })
    }
  }

  const clearTimers = () => {
    clearTimeout(stepTimer)
    clearTimeout(guardTimer)
  }

  function finish() {
    if (phase === PHASE.DONE) return
    spentMs = TOTAL_MS
    phase = PHASE.DONE
    clearTimers()
    emit()
    resolveDone()
  }

  function enter(next) {
    // A phase can be entered off the normal timer chain (markVideoReady, skip),
    // so drop any still-pending step timer or it would fire a second advance()
    // and skip a beat.
    clearTimeout(stepTimer)
    phase = next
    cursor = ORDER.indexOf(next)
    enteredAt = performance.now()
    emit()
    stepTimer = setTimeout(advance, STEP_MS[next])
  }

  function advance() {
    if (phase === PHASE.DONE) return
    const next = cursor + 1
    if (next >= ORDER.length) return finish()

    const nextPhase = ORDER[next]
    // Hold at the end of the dissolve until the embed is really playing, so the
    // cruise beat is measured against actual playback rather than page load.
    if (nextPhase === PHASE.CRUISE && !videoReady) return

    spentMs += STEP_MS[phase]
    enter(nextPhase)
  }

  function markVideoReady() {
    if (videoReady) return
    videoReady = true
    clearTimeout(guardTimer)
    if (phase === PHASE.DISSOLVE) advance()
  }

  function start() {
    if (phase !== PHASE.IDLE) return done
    // If playback never reports in (blocked autoplay, embed disabled, offline),
    // surface the tap affordance and carry on so the intro can never trap anyone.
    guardTimer = setTimeout(() => {
      if (typeof onStall === 'function') onStall()
      markVideoReady()
    }, autoplayGuardMs)
    enter(ORDER[0])
    return done
  }

  function skip() {
    if (phase === PHASE.IDLE || phase === PHASE.DONE || phase === PHASE.HANDOFF) return
    videoReady = true
    clearTimeout(guardTimer)
    const target = ORDER.indexOf(PHASE.HANDOFF)
    spentMs = sum(ORDER.slice(0, target))
    enter(PHASE.HANDOFF)
  }

  function destroy() {
    clearTimers()
  }

  return {
    start,
    skip,
    markVideoReady,
    destroy,
    done,
    get phase() {
      return phase
    },
  }
}

export { YT_PLAYING }
