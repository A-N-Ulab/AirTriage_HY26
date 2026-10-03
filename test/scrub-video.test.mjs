import assert from 'node:assert/strict'
import test from 'node:test'

import { calculateScrubTime, createScrubController } from '../src/experience/scrub-video.js'

class FakeVideo extends EventTarget {
  constructor({ duration = 20, readyState = 0 } = {}) {
    super()
    this._currentTime = 0
    this.timeWrites = 0
    this.duration = duration
    this.readyState = readyState
    this.seeking = false
    this.pauseCalls = 0
  }

  get currentTime() {
    return this._currentTime
  }

  set currentTime(value) {
    this._currentTime = value
    this.timeWrites += 1
  }

  pause() {
    this.pauseCalls += 1
  }
}

class FakeSurface extends EventTarget {
  constructor(width = 200) {
    super()
    this.dataset = {}
    this.width = width
    this.capturedPointer = null
  }

  getBoundingClientRect() {
    return { width: this.width }
  }

  setPointerCapture(pointerId) {
    this.capturedPointer = pointerId
  }

  releasePointerCapture(pointerId) {
    if (this.capturedPointer === pointerId) this.capturedPointer = null
  }
}

const pointerEvent = (type, { pointerId = 1, clientX = 0 } = {}) => {
  const event = new Event(type)
  Object.defineProperties(event, {
    pointerId: { value: pointerId },
    clientX: { value: clientX },
  })
  return event
}

const immediateFrame = (callback) => {
  callback()
  return 1
}

test('initialises the paused film at exactly half its duration when metadata loads', () => {
  const video = new FakeVideo({ duration: 18, readyState: 0 })
  const surface = new FakeSurface()
  const controller = createScrubController({ video, surface, scheduleFrame: immediateFrame })

  video.dispatchEvent(new Event('loadedmetadata'))

  assert.equal(video.currentTime, 9)
  assert.ok(video.pauseCalls > 0)
  assert.equal(surface.dataset.mediaState, 'ready')
  controller.destroy()
})

test('maps right and left drag distance to forward and backward time', () => {
  assert.equal(
    calculateScrubTime({ startTime: 10, deltaX: 25, width: 100, duration: 20 }),
    15,
  )
  assert.equal(
    calculateScrubTime({ startTime: 10, deltaX: -25, width: 100, duration: 20 }),
    5,
  )
})

test('clamps drag seeking to the film bounds', () => {
  assert.equal(
    calculateScrubTime({ startTime: 4, deltaX: -500, width: 100, duration: 20 }),
    0,
  )
  assert.equal(
    calculateScrubTime({ startTime: 16, deltaX: 500, width: 100, duration: 20 }),
    20,
  )
})

test('scrubs while dragging and clears the drag state on pointer cancellation', () => {
  const video = new FakeVideo({ duration: 20, readyState: 1 })
  const surface = new FakeSurface(200)
  const controller = createScrubController({ video, surface, scheduleFrame: immediateFrame })

  surface.dispatchEvent(pointerEvent('pointerdown', { pointerId: 7, clientX: 100 }))
  surface.dispatchEvent(pointerEvent('pointermove', { pointerId: 7, clientX: 150 }))

  assert.equal(video.currentTime, 15)
  assert.equal(surface.dataset.dragging, 'true')
  assert.equal(surface.capturedPointer, 7)

  surface.dispatchEvent(pointerEvent('pointercancel', { pointerId: 7, clientX: 150 }))

  assert.equal(surface.dataset.dragging, 'false')
  assert.equal(surface.capturedPointer, null)
  controller.destroy()
})

test('coalesces rapid pointer moves into one seek to the latest requested frame', () => {
  const video = new FakeVideo({ duration: 20, readyState: 1 })
  const surface = new FakeSurface(200)
  const queuedFrames = []
  const controller = createScrubController({
    video,
    surface,
    scheduleFrame: (callback) => {
      queuedFrames.push(callback)
      return queuedFrames.length
    },
    cancelFrame: () => {},
  })
  const writesAfterInitialisation = video.timeWrites

  surface.dispatchEvent(pointerEvent('pointerdown', { pointerId: 4, clientX: 100 }))
  surface.dispatchEvent(pointerEvent('pointermove', { pointerId: 4, clientX: 120 }))
  surface.dispatchEvent(pointerEvent('pointermove', { pointerId: 4, clientX: 150 }))
  surface.dispatchEvent(pointerEvent('pointermove', { pointerId: 4, clientX: 180 }))

  assert.equal(video.timeWrites, writesAfterInitialisation)
  assert.equal(queuedFrames.length, 1)

  queuedFrames.shift()()

  assert.equal(video.currentTime, 18)
  assert.equal(video.timeWrites, writesAfterInitialisation + 1)
  controller.destroy()
})

test('waits for an in-flight seek and then applies only the latest requested time', () => {
  const video = new FakeVideo({ duration: 20, readyState: 1 })
  const surface = new FakeSurface(200)
  const queuedFrames = []
  const controller = createScrubController({
    video,
    surface,
    scheduleFrame: (callback) => {
      queuedFrames.push(callback)
      return queuedFrames.length
    },
    cancelFrame: () => {},
  })
  const writesAfterInitialisation = video.timeWrites

  video.seeking = true
  surface.dispatchEvent(pointerEvent('pointerdown', { pointerId: 5, clientX: 100 }))
  surface.dispatchEvent(pointerEvent('pointermove', { pointerId: 5, clientX: 160 }))
  assert.equal(video.timeWrites, writesAfterInitialisation)
  assert.equal(queuedFrames.length, 0)

  video.seeking = false
  video.dispatchEvent(new Event('seeked'))
  assert.equal(queuedFrames.length, 1)
  queuedFrames.shift()()

  assert.equal(video.currentTime, 16)
  assert.equal(video.timeWrites, writesAfterInitialisation + 1)
  controller.destroy()
})

test('exposes a media error state without throwing', () => {
  const video = new FakeVideo()
  const surface = new FakeSurface()
  const controller = createScrubController({ video, surface, scheduleFrame: immediateFrame })

  video.dispatchEvent(new Event('error'))

  assert.equal(surface.dataset.mediaState, 'error')
  controller.destroy()
})
