export const PHASE = Object.freeze({
  IDLE: 'idle',
  LOGO: 'logo',
  VIDEO: 'video',
  HANDOFF: 'handoff',
  DONE: 'done',
})

export const STEP_MS = Object.freeze({
  [PHASE.LOGO]: 2000,
  [PHASE.VIDEO]: null,
  [PHASE.HANDOFF]: 600,
})

const ORDER = [
  PHASE.LOGO,
  PHASE.VIDEO,
  PHASE.HANDOFF,
]

export function createPlaybackWatchdog({
  stallMs = 30_000,
  clock = {
    setTimeout: (callback, delay) => setTimeout(callback, delay),
    clearTimeout: (timer) => clearTimeout(timer),
  },
  onTimeout,
} = {}) {
  let timer = null

  const destroy = () => {
    clock.clearTimeout(timer)
    timer = null
  }

  const markProgress = () => {
    destroy()
    timer = clock.setTimeout(() => {
      timer = null
      onTimeout?.()
    }, stallMs)
  }

  return {
    start: markProgress,
    markProgress,
    destroy,
  }
}

/**
 * Owns the intro timeline and nothing else — no DOM, no video element.
 * `intro.js` subscribes to `onChange` and paints whatever phase comes back.
 */
export function createIntroLoader({
  clock = {
    setTimeout: (callback, delay) => setTimeout(callback, delay),
    clearTimeout: (timer) => clearTimeout(timer),
  },
  onChange,
} = {}) {
  let phase = PHASE.IDLE
  let cursor = -1
  let stepTimer = null
  let resolveDone
  const done = new Promise((resolve) => {
    resolveDone = resolve
  })

  const emit = () => {
    if (typeof onChange === 'function') {
      onChange({ phase })
    }
  }

  const clearTimers = () => {
    clock.clearTimeout(stepTimer)
  }

  function finish() {
    if (phase === PHASE.DONE) return
    phase = PHASE.DONE
    clearTimers()
    emit()
    resolveDone()
  }

  function enter(next) {
    // Skip can enter a phase off the normal timer chain, so drop any still-
    // pending step timer or it would fire a second advance() and skip a beat.
    clock.clearTimeout(stepTimer)
    phase = next
    cursor = ORDER.indexOf(next)
    emit()
    const duration = STEP_MS[next]
    stepTimer = duration === null ? null : clock.setTimeout(advance, duration)
  }

  function advance() {
    if (phase === PHASE.DONE) return
    const next = cursor + 1
    if (next >= ORDER.length) return finish()

    enter(ORDER[next])
  }

  function completeVideo() {
    if (phase !== PHASE.VIDEO) return
    advance()
  }

  function start() {
    if (phase !== PHASE.IDLE) return done
    enter(ORDER[0])
    return done
  }

  function skip() {
    if (phase === PHASE.IDLE || phase === PHASE.DONE || phase === PHASE.HANDOFF) return
    enter(PHASE.HANDOFF)
  }

  function destroy() {
    clearTimers()
  }

  return {
    start,
    skip,
    completeVideo,
    destroy,
    done,
    get phase() {
      return phase
    },
  }
}
