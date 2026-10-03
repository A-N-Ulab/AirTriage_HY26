export const PHASE = Object.freeze({
  IDLE: 'idle',
  LOGO: 'logo',
  VIDEO: 'video',
  HANDOFF: 'handoff',
  DONE: 'done',
})

export const STEP_MS = Object.freeze({
  [PHASE.LOGO]: 2000,
  [PHASE.VIDEO]: 4000,
  [PHASE.HANDOFF]: 600,
})

const ORDER = [
  PHASE.LOGO,
  PHASE.VIDEO,
  PHASE.HANDOFF,
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
  clock = {
    now: () => performance.now(),
    setTimeout: (callback, delay) => setTimeout(callback, delay),
    clearTimeout: (timer) => clearTimeout(timer),
  },
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
      : spentMs + (clock.now() - enteredAt)

  const emit = () => {
    if (typeof onChange === 'function') {
      onChange({ phase, progress: Math.min(elapsedMs() / TOTAL_MS, 1) })
    }
  }

  const clearTimers = () => {
    clock.clearTimeout(stepTimer)
    clock.clearTimeout(guardTimer)
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
    clock.clearTimeout(stepTimer)
    phase = next
    cursor = ORDER.indexOf(next)
    enteredAt = clock.now()
    emit()
    stepTimer = clock.setTimeout(advance, STEP_MS[next])

    if (next === PHASE.VIDEO && !videoReady) {
      guardTimer = clock.setTimeout(() => {
        if (typeof onStall === 'function') onStall()
        markVideoReady()
      }, autoplayGuardMs)
    }
  }

  function advance() {
    if (phase === PHASE.DONE) return
    const next = cursor + 1
    if (next >= ORDER.length) return finish()

    spentMs += STEP_MS[phase]
    enter(ORDER[next])
  }

  function markVideoReady() {
    if (videoReady) return
    videoReady = true
    clock.clearTimeout(guardTimer)
  }

  function start() {
    if (phase !== PHASE.IDLE) return done
    enter(ORDER[0])
    return done
  }

  function skip() {
    if (phase === PHASE.IDLE || phase === PHASE.DONE || phase === PHASE.HANDOFF) return
    videoReady = true
    clock.clearTimeout(guardTimer)
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
