import assert from 'node:assert/strict'
import test from 'node:test'

import { calculateScrubTime, createScrubController } from '../src/experience/scrub-video.js'

class FakeVideo extends EventTarget {
  constructor({ duration = 20, readyState = 0 } = {}) {
    super()
    this.currentTime = 0
    this.duration = duration
    this.readyState = readyState
    this.pauseCalls = 0
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

test('initialises the paused film at exactly half its duration when metadata loads', () => {
  const video = new FakeVideo({ duration: 18, readyState: 0 })
  const surface = new FakeSurface()
  const controller = createScrubController({ video, surface })

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
  const controller = createScrubController({ video, surface })

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

test('exposes a media error state without throwing', () => {
  const video = new FakeVideo()
  const surface = new FakeSurface()
  const controller = createScrubController({ video, surface })

  video.dispatchEvent(new Event('error'))

  assert.equal(surface.dataset.mediaState, 'error')
  controller.destroy()
})
