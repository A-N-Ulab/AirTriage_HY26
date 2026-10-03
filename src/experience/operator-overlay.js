const PERSON_IDS = ['person-01', 'person-02', 'person-03', 'person-04']

const clamp = (value, minimum, maximum) => Math.min(maximum, Math.max(minimum, value))

export async function loadOperatorScenario(
  importScenario = () => import('./operator-scenario.json', { with: { type: 'json' } }),
) {
  try {
    const scenarioModule = await importScenario()
    return scenarioModule.default ?? scenarioModule
  } catch {
    return null
  }
}

export function getFrameIndex(currentTime, { fps, frameCount }) {
  if (!Number.isFinite(currentTime) || !Number.isFinite(fps) || fps <= 0) return 0
  if (!Number.isInteger(frameCount) || frameCount <= 0) return 0
  return clamp(Math.round(currentTime * fps), 0, frameCount - 1)
}

export function normalisedBoxToPixels(box, { width, height }) {
  if (box === null) return null
  return {
    x: box[0] * width,
    y: box[1] * height,
    width: box[2] * width,
    height: box[3] * height,
  }
}

export function validateOperatorScenario(scenario) {
  if (!scenario || typeof scenario !== 'object' || Array.isArray(scenario)) {
    return { ok: false, errors: ['Scenario must be an object'] }
  }

  const errors = []
  const people = Array.isArray(scenario.people) ? scenario.people : []
  const peopleIds = people.map((person) => person?.id)

  if (people.length !== PERSON_IDS.length) {
    errors.push(`Scenario must contain exactly four people; received ${people.length}`)
  }

  for (const personId of peopleIds) {
    if (!PERSON_IDS.includes(personId)) errors.push(`Unsupported person ID: ${personId}`)
  }

  if (PERSON_IDS.some((personId, index) => peopleIds[index] !== personId)) {
    errors.push(`People must use the approved order: ${PERSON_IDS.join(', ')}`)
  }

  const { video, frames } = scenario
  if (
    !video ||
    video.width !== 1920 ||
    video.height !== 1080 ||
    video.fps !== 30 ||
    video.frameCount !== 278
  ) {
    errors.push('Video metadata must be 1920x1080, 30 fps and 278 frames')
  }

  if (!Array.isArray(frames) || frames.length !== 278) {
    errors.push(`Scenario must contain 278 frames; received ${frames?.length ?? 0}`)
  } else {
    for (const [frameIndex, frame] of frames.entries()) {
      if (frame?.frame !== frameIndex || !frame.boxes || typeof frame.boxes !== 'object') {
        errors.push(`Invalid frame ${frameIndex}`)
        continue
      }

      const frameIds = Object.keys(frame.boxes)
      if (
        frameIds.length !== PERSON_IDS.length ||
        PERSON_IDS.some((personId) => !frameIds.includes(personId))
      ) {
        errors.push(`Invalid people in frame ${frameIndex}`)
        continue
      }

      for (const personId of PERSON_IDS) {
        const box = frame.boxes[personId]
        if (box === null) continue
        const validBox =
          Array.isArray(box) &&
          box.length === 4 &&
          box.every((value) => Number.isFinite(value) && value >= 0 && value <= 1) &&
          box[2] > 0 &&
          box[3] > 0 &&
          box[0] + box[2] <= 1 &&
          box[1] + box[3] <= 1
        if (!validBox) errors.push(`Invalid box for ${personId} in frame ${frameIndex}`)
      }
    }
  }

  return { ok: errors.length === 0, errors }
}

export function createOperatorOverlay({
  video,
  surface,
  mount,
  scenario,
  scheduleFrame = globalThis.requestAnimationFrame?.bind(globalThis) ??
    ((callback) => setTimeout(callback, 16)),
  cancelFrame = globalThis.cancelAnimationFrame?.bind(globalThis) ?? clearTimeout,
}) {
  const validation = validateOperatorScenario(scenario)
  let selectedPersonId = PERSON_IDS[0]
  let framePending = false
  let frameHandle = null
  let destroyed = false

  const applyRender = () => {
    framePending = false
    frameHandle = null
    if (destroyed || !validation.ok) return

    const frameIndex = getFrameIndex(video.currentTime, scenario.video)
    const box = scenario.frames[frameIndex].boxes[selectedPersonId]
    mount.dataset.frame = String(frameIndex)
    mount.dataset.selectedPerson = selectedPersonId
    mount.dataset.personVisible = String(box !== null)
    mount.hidden = surface.dataset.mediaState === 'error'
  }

  const requestRender = () => {
    if (destroyed || framePending) return
    framePending = true
    frameHandle = scheduleFrame(applyRender)
  }

  const onMediaError = () => {
    mount.hidden = true
  }

  if (!validation.ok) {
    mount.dataset.operatorState = 'unavailable'
  } else {
    mount.dataset.operatorState = 'ready'
  }

  video.addEventListener('loadedmetadata', requestRender)
  video.addEventListener('seeked', requestRender)
  video.addEventListener('error', onMediaError)
  requestRender()

  return {
    selectPerson(personId) {
      if (!PERSON_IDS.includes(personId) || destroyed) return
      selectedPersonId = personId
      requestRender()
    },
    render: requestRender,
    destroy() {
      destroyed = true
      video.removeEventListener('loadedmetadata', requestRender)
      video.removeEventListener('seeked', requestRender)
      video.removeEventListener('error', onMediaError)
      if (framePending) cancelFrame(frameHandle)
      framePending = false
      frameHandle = null
    },
  }
}
