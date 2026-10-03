import assert from 'node:assert/strict'
import test from 'node:test'

import { PHASE, createIntroLoader } from '../src/intro/timeline.js'
import * as timelineModule from '../src/intro/timeline.js'

function createClock() {
  let now = 0
  let nextId = 1
  const tasks = new Map()

  const runDueTasks = () => {
    const due = [...tasks.entries()]
      .filter(([, task]) => task.at <= now)
      .sort((a, b) => a[1].at - b[1].at)

    for (const [id, task] of due) {
      if (!tasks.delete(id)) continue
      task.callback()
    }
  }

  return {
    now: () => now,
    setTimeout(callback, delay) {
      const id = nextId++
      tasks.set(id, { at: now + delay, callback })
      return id
    },
    clearTimeout(id) {
      tasks.delete(id)
    },
    tick(milliseconds) {
      now += milliseconds
      runDueTasks()
    },
  }
}

test('shows the logo alone for two seconds before starting the film stage', () => {
  const clock = createClock()
  const phases = []
  const loader = createIntroLoader({
    clock,
    onChange: ({ phase }) => phases.push(phase),
  })

  loader.start()
  assert.equal(loader.phase, PHASE.LOGO)

  clock.tick(1999)
  assert.equal(loader.phase, PHASE.LOGO)

  clock.tick(1)
  assert.equal(loader.phase, PHASE.VIDEO)
  assert.deepEqual(phases, [PHASE.LOGO, PHASE.VIDEO])

  loader.destroy()
})

test('keeps the film stage active until playback finishes', () => {
  const clock = createClock()
  const loader = createIntroLoader({ clock })

  loader.start()
  clock.tick(2000)
  assert.equal(loader.phase, PHASE.VIDEO)

  clock.tick(60_000)
  assert.equal(loader.phase, PHASE.VIDEO)
  assert.equal(
    typeof loader.completeVideo,
    'function',
    'the timeline must expose a video-completion signal',
  )

  loader.completeVideo()
  assert.equal(loader.phase, PHASE.HANDOFF)

  clock.tick(600)
  assert.equal(loader.phase, PHASE.DONE)
})

test('abandons playback only after thirty seconds without progress', () => {
  assert.equal(
    typeof timelineModule.createPlaybackWatchdog,
    'function',
    'the intro must expose a playback-stall watchdog',
  )

  const clock = createClock()
  let timeouts = 0
  const watchdog = timelineModule.createPlaybackWatchdog({
    clock,
    onTimeout: () => {
      timeouts += 1
    },
  })

  watchdog.start()
  clock.tick(29_999)
  assert.equal(timeouts, 0)

  watchdog.markProgress()
  clock.tick(29_999)
  assert.equal(timeouts, 0)

  clock.tick(1)
  assert.equal(timeouts, 1)
})
