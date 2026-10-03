import assert from 'node:assert/strict'
import test from 'node:test'

import { bindRetry, createDemoLoader } from '../src/demo-loader.js'

const deferred = () => {
  let resolve
  let reject
  const promise = new Promise((resolvePromise, rejectPromise) => {
    resolve = resolvePromise
    reject = rejectPromise
  })
  return { promise, resolve, reject }
}

test('emits loading before the demo module resolves', async () => {
  const moduleLoad = deferred()
  const states = []
  const loader = createDemoLoader({
    importDemo: () => moduleLoad.promise,
    container: {},
    onState: (state) => states.push(state),
  })

  const result = loader.start()

  assert.equal(states[0].status, 'loading')
  assert.ok(states[0].progress > 0)

  moduleLoad.reject(new Error('stop test'))
  await result
})

test('keeps progress monotonic and becomes ready after the first frame', async () => {
  const firstFrame = deferred()
  const states = []
  const controller = { destroy() {} }
  const loader = createDemoLoader({
    importDemo: async () => ({
      createDemo: async ({ onProgress }) => {
        onProgress({ progress: 72, message: 'Preparing content...' })
        onProgress({ progress: 60, message: 'Still preparing...' })
        return firstFrame.promise
      },
    }),
    container: {},
    onState: (state) => states.push(state),
  })

  const result = loader.start()
  await new Promise((resolve) => setImmediate(resolve))

  assert.equal(states.at(-1).status, 'loading')
  assert.equal(states.some((state) => state.status === 'ready'), false)
  assert.deepEqual(
    states.map((state) => state.progress),
    [...states.map((state) => state.progress)].sort((a, b) => a - b),
  )

  firstFrame.resolve(controller)

  assert.equal(await result, controller)
  assert.equal(states.at(-1).status, 'ready')
  assert.equal(states.at(-1).progress, 100)
})

test('reports an import failure without rejecting the intro flow', async () => {
  const states = []
  const loader = createDemoLoader({
    importDemo: async () => {
      throw new Error('network unavailable')
    },
    container: {},
    onState: (state) => states.push(state),
  })

  assert.equal(await loader.start(), null)
  assert.equal(states.at(-1).status, 'error')
  assert.match(states.at(-1).error.message, /network unavailable/)
})

test('reports an experience initialization failure', async () => {
  const states = []
  const loader = createDemoLoader({
    importDemo: async () => ({
      createDemo: async () => {
        throw new Error('experience unavailable')
      },
    }),
    container: {},
    onState: (state) => states.push(state),
  })

  assert.equal(await loader.start(), null)
  assert.equal(states.at(-1).status, 'error')
  assert.match(states.at(-1).error.message, /experience unavailable/)
})

test('reports a runtime failure after the experience becomes ready', async () => {
  const states = []
  let failRuntime
  const loader = createDemoLoader({
    importDemo: async () => ({
      createDemo: async ({ onError }) => {
        failRuntime = onError
        return { destroy() {} }
      },
    }),
    container: {},
    onState: (state) => states.push(state),
  })

  await loader.start()
  assert.equal(states.at(-1).status, 'ready')

  failRuntime(new Error('experience runtime lost'))

  assert.equal(states.at(-1).status, 'error')
  assert.match(states.at(-1).error.message, /runtime lost/i)
})

test('loads the post-intro page through its createExperience entry point', async () => {
  const states = []
  const controller = { destroy() {} }
  const loader = createDemoLoader({
    importDemo: async () => ({
      createExperience: async () => controller,
    }),
    container: {},
    onState: (state) => states.push(state),
  })

  assert.equal(await loader.start(), controller)
  assert.equal(states.at(-1).status, 'ready')
})

test('bindRetry invokes reload once and returns cleanup', () => {
  const listeners = new Map()
  const button = {
    addEventListener(type, listener) {
      listeners.set(type, listener)
    },
    removeEventListener(type, listener) {
      if (listeners.get(type) === listener) listeners.delete(type)
    },
  }
  let reloads = 0

  const cleanup = bindRetry(button, () => {
    reloads += 1
  })
  listeners.get('click')()

  assert.equal(reloads, 1)
  cleanup()
  assert.equal(listeners.has('click'), false)
})
