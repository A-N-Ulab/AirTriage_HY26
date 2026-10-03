import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

import {
  createOperatorOverlay,
  getFrameIndex,
  loadOperatorScenario,
  normalisedBoxToPixels,
  validateOperatorScenario,
} from '../src/experience/operator-overlay.js'

const scenario = JSON.parse(
  await readFile(new URL('../src/experience/operator-scenario.json', import.meta.url), 'utf8'),
)

test('frame index rounds to the displayed frame and stays inside the scenario', () => {
  const meta = { fps: 30, frameCount: 278 }

  assert.equal(getFrameIndex(-10, meta), 0)
  assert.equal(getFrameIndex(4.62, meta), 139)
  assert.equal(getFrameIndex(99, meta), 277)
  assert.equal(getFrameIndex(Number.NaN, meta), 0)
})

test('normalised boxes map to source pixels and preserve absence', () => {
  const meta = { width: 1920, height: 1080 }

  assert.equal(normalisedBoxToPixels(null, meta), null)
  assert.deepEqual(normalisedBoxToPixels([0.25, 0.5, 0.1, 0.2], meta), {
    x: 480,
    y: 540,
    width: 192,
    height: 216,
  })
})

test('scenario validation rejects a fifth person and incomplete frame boxes', () => {
  const withFifthPerson = structuredClone(scenario)
  withFifthPerson.people.push({ ...withFifthPerson.people[0], id: 'person-05' })
  withFifthPerson.frames[0].boxes['person-05'] = null

  const fifthResult = validateOperatorScenario(withFifthPerson)
  assert.equal(fifthResult.ok, false)
  assert.ok(fifthResult.errors.some((error) => error.includes('person-05')))

  const withMissingBox = structuredClone(scenario)
  delete withMissingBox.frames[0].boxes['person-04']

  const missingResult = validateOperatorScenario(withMissingBox)
  assert.equal(missingResult.ok, false)
  assert.ok(missingResult.errors.some((error) => error.includes('frame 0')))
})

test('scenario validation reports malformed input instead of throwing', () => {
  assert.doesNotThrow(() => validateOperatorScenario(null))
  assert.deepEqual(validateOperatorScenario(null), {
    ok: false,
    errors: ['Scenario must be an object'],
  })
})

test('scenario loader normalises modules and degrades rejected imports to null', async () => {
  const loaded = await loadOperatorScenario(async () => ({ default: scenario }))
  const missing = await loadOperatorScenario(async () => {
    throw new Error('network failure')
  })

  assert.equal(loaded, scenario)
  assert.equal(missing, null)
})

test('overlay coalesces repeated seek events into one render of the latest frame', () => {
  const video = new EventTarget()
  video.currentTime = 4.62
  const surface = new EventTarget()
  surface.dataset = { mediaState: 'ready' }
  const mount = { dataset: {}, hidden: false }
  const queuedFrames = []
  const controller = createOperatorOverlay({
    video,
    surface,
    mount,
    scenario,
    scheduleFrame: (callback) => {
      queuedFrames.push(callback)
      return queuedFrames.length
    },
    cancelFrame: () => {},
  })

  assert.equal(queuedFrames.length, 1)
  queuedFrames.shift()()
  assert.equal(mount.dataset.frame, '139')
  assert.equal(mount.dataset.selectedPerson, 'person-01')
  assert.equal(mount.dataset.personVisible, 'true')

  video.currentTime = 5
  video.dispatchEvent(new Event('seeked'))
  video.currentTime = 6
  video.dispatchEvent(new Event('seeked'))
  video.currentTime = 7
  video.dispatchEvent(new Event('seeked'))

  assert.equal(queuedFrames.length, 1)
  queuedFrames.shift()()
  assert.equal(mount.dataset.frame, '210')

  controller.destroy()
  video.dispatchEvent(new Event('seeked'))
  assert.equal(queuedFrames.length, 0)
})

test('overlay keeps selection but exposes absence when a person is outside the frame', () => {
  const video = new EventTarget()
  video.currentTime = 0
  const surface = new EventTarget()
  surface.dataset = { mediaState: 'ready' }
  const mount = { dataset: {}, hidden: false }
  const controller = createOperatorOverlay({
    video,
    surface,
    mount,
    scenario,
    scheduleFrame: (callback) => {
      callback()
      return 1
    },
  })

  controller.selectPerson('person-04')

  assert.equal(mount.dataset.selectedPerson, 'person-04')
  assert.equal(mount.dataset.personVisible, 'false')
  controller.destroy()
})
