const PERSON_IDS = ['person-01', 'person-02', 'person-03', 'person-04']

const clamp = (value, minimum, maximum) => Math.min(maximum, Math.max(minimum, value))

const escapeHtml = (value) =>
  String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')

const personCardMarkup = (person) => `
  <button
    class="operator-card operator-card--${escapeHtml(person.status)}"
    type="button"
    data-person-card="${escapeHtml(person.id)}"
    data-person-id="${escapeHtml(person.id)}"
    data-operator-interactive
    aria-expanded="false"
  >
    <span class="operator-card__portrait">
      <img
        src="${escapeHtml(person.image)}"
        alt="${escapeHtml(person.imageAlt)}"
        data-person-image="${escapeHtml(person.id)}"
      />
      <span
        class="operator-card__image-fallback"
        data-person-image-fallback="${escapeHtml(person.id)}"
        aria-hidden="true"
        hidden
      >${escapeHtml(person.displayName)}</span>
    </span>
    <span class="operator-card__summary">
      <span class="operator-card__eyebrow">${escapeHtml(person.displayName)}</span>
      <strong>${escapeHtml(person.statusLabel)}</strong>
      <span class="operator-card__compact-metrics">HR ${person.heartRate} · RR ${person.respiratoryRate}</span>
    </span>
    <span class="operator-card__details">
      <span class="operator-card__condition">${escapeHtml(person.condition)}</span>
      <span class="operator-card__metrics">
        <span><small>HR</small><strong>${person.heartRate}/min</strong></span>
        <span><small>RR</small><strong>${person.respiratoryRate}/min</strong></span>
      </span>
      <span class="operator-card__visibility" data-person-visibility="${escapeHtml(person.id)}"></span>
    </span>
  </button>
`

const overlayMarkup = (people) => `
  <div class="operator-panel" data-operator-panel data-operator-interactive>
    <div class="operator-panel__heading">
      <span>Osoby w scenariuszu</span>
      <strong>4 wskazane</strong>
    </div>
    <div class="operator-panel__list" role="list">
      ${people.map(personCardMarkup).join('')}
    </div>
  </div>
  <svg
    class="operator-tracking"
    data-operator-tracking
    viewBox="0 0 1920 1080"
    preserveAspectRatio="xMidYMid slice"
    aria-label="Oznaczenia czterech wskazanych osób na filmie"
  ></svg>
  <p class="operator-status" data-operator-status role="status" hidden></p>
`

const unavailableMarkup = `
  <p class="operator-status" data-operator-status role="status">
    Scenariusz operatora jest niedostępny. Film nadal można przeglądać.
  </p>
`

const personLayerMarkup = ({ person, box, selected, targetMinimum }) => {
  if (box === null) return ''
  const { x, y, width, height } = box
  const centreX = x + width / 2
  const centreY = y + height / 2
  const targetWidth = Math.max(width + 36, targetMinimum)
  const targetHeight = Math.max(height + 36, targetMinimum)
  const targetX = centreX - targetWidth / 2
  const targetY = centreY - targetHeight / 2
  const marker = selected
    ? `<rect class="operator-person__box operator-person__box--${person.status}" data-person-box="${person.id}" x="${x}" y="${y}" width="${width}" height="${height}" rx="9" />`
    : `<circle class="operator-person__pin operator-person__pin--${person.status}" data-person-pin="${person.id}" cx="${centreX}" cy="${centreY}" r="12" />`

  return `
    <g class="operator-person${selected ? ' is-selected' : ''}" data-person-layer="${person.id}">
      ${marker}
      <rect
        class="operator-person__target"
        data-person-target="${person.id}"
        data-person-id="${person.id}"
        data-operator-interactive
        x="${targetX}"
        y="${targetY}"
        width="${targetWidth}"
        height="${targetHeight}"
        rx="18"
        role="button"
        tabindex="0"
        aria-label="Wybierz ${escapeHtml(person.displayName)} na filmie"
      />
    </g>
  `
}

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
  const hasDom = typeof mount.querySelectorAll === 'function'

  if (hasDom) {
    mount.innerHTML = validation.ok ? overlayMarkup(scenario.people) : unavailableMarkup
  }

  const updateImageFallbacks = () => {
    if (!hasDom || !validation.ok) return
    for (const image of mount.querySelectorAll('[data-person-image]')) {
      const showFallback = () => {
        image.hidden = true
        const fallback = mount.querySelector(
          `[data-person-image-fallback="${image.dataset.personImage}"]`,
        )
        if (fallback) {
          fallback.hidden = false
          fallback.removeAttribute('aria-hidden')
        }
      }
      image.addEventListener('error', showFallback, { once: true })
      if (image.complete && image.naturalWidth === 0) showFallback()
    }
  }

  const trackingScale = (tracking) => {
    const rect = tracking?.getBoundingClientRect?.()
    if (!rect?.width || !rect?.height) return 1
    return Math.max(rect.width / scenario.video.width, rect.height / scenario.video.height)
  }

  const personIdAtPointer = (event) => {
    const tracking = event.target.closest?.('[data-operator-tracking]')
    if (!tracking || !validation.ok) return null
    return [...tracking.querySelectorAll('[data-person-target]')]
      .map((target) => {
        const rect = target.getBoundingClientRect()
        const centreX = rect.left + rect.width / 2
        const centreY = rect.top + rect.height / 2
        if (
          Math.abs(event.clientX - centreX) > rect.width / 2 ||
          Math.abs(event.clientY - centreY) > rect.height / 2
        ) {
          return null
        }
        return {
          id: target.dataset.personId,
          distance: (event.clientX - centreX) ** 2 + (event.clientY - centreY) ** 2,
        }
      })
      .filter(Boolean)
      .sort((left, right) => left.distance - right.distance)[0]?.id ?? null
  }

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

    if (!hasDom) return
    mount.dataset.selectedPerson = selectedPersonId
    for (const card of mount.querySelectorAll('[data-person-card]')) {
      const selected = card.dataset.personCard === selectedPersonId
      card.setAttribute('aria-expanded', String(selected))
      card.classList.toggle('is-selected', selected)
      const visibility = card.querySelector('[data-person-visibility]')
      const cardBox = scenario.frames[frameIndex].boxes[card.dataset.personCard]
      if (visibility) visibility.textContent = selected && cardBox === null ? 'Poza kadrem' : ''
    }

    const tracking = mount.querySelector('[data-operator-tracking]')
    if (tracking) {
      const targetMinimum = 44 / trackingScale(tracking)
      tracking.innerHTML = scenario.people
        .map((person) =>
          personLayerMarkup({
            person,
            box: normalisedBoxToPixels(scenario.frames[frameIndex].boxes[person.id], scenario.video),
            selected: person.id === selectedPersonId,
            targetMinimum,
          }),
        )
        .join('')
    }
  }

  const requestRender = () => {
    if (destroyed || framePending) return
    framePending = true
    frameHandle = scheduleFrame(applyRender)
  }

  const onMediaError = () => {
    mount.hidden = true
  }

  const personIdFromEvent = (event) => {
    const card = event.target.closest?.('[data-person-card]')
    if (card) return card.dataset.personCard
    return personIdAtPointer(event)
  }

  const onPointerDown = (event) => {
    if (event.target.closest?.('[data-operator-interactive]')) event.stopPropagation()
  }

  const onClick = (event) => {
    const personId = personIdFromEvent(event)
    if (personId) controller.selectPerson(personId)
  }

  const onKeyDown = (event) => {
    const target = event.target.closest?.('[data-person-target]')
    if (!target || (event.key !== 'Enter' && event.key !== ' ')) return
    event.preventDefault()
    controller.selectPerson(target.dataset.personId)
  }

  if (!validation.ok) {
    mount.dataset.operatorState = 'unavailable'
  } else {
    mount.dataset.operatorState = 'ready'
  }

  video.addEventListener('loadedmetadata', requestRender)
  video.addEventListener('seeked', requestRender)
  video.addEventListener('error', onMediaError)
  mount.addEventListener?.('pointerdown', onPointerDown)
  mount.addEventListener?.('click', onClick)
  mount.addEventListener?.('keydown', onKeyDown)
  updateImageFallbacks()
  requestRender()

  const controller = {
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
      mount.removeEventListener?.('pointerdown', onPointerDown)
      mount.removeEventListener?.('click', onClick)
      mount.removeEventListener?.('keydown', onKeyDown)
      if (framePending) cancelFrame(frameHandle)
      framePending = false
      frameHandle = null
      if (hasDom) mount.replaceChildren()
    },
  }

  return controller
}
