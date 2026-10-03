const clamp = (value, min, max) => Math.min(max, Math.max(min, value))

export function calculateScrubTime({ startTime, deltaX, width, duration }) {
  if (!Number.isFinite(duration) || duration <= 0) return 0
  if (!Number.isFinite(width) || width <= 0) return clamp(startTime, 0, duration)

  return clamp(startTime + (deltaX / width) * duration, 0, duration)
}

export function createScrubController({
  video,
  surface,
  scheduleFrame = globalThis.requestAnimationFrame?.bind(globalThis) ??
    ((callback) => setTimeout(callback, 16)),
  cancelFrame = globalThis.cancelAnimationFrame?.bind(globalThis) ?? clearTimeout,
}) {
  let activePointer = null
  let dragStartX = 0
  let dragStartTime = 0
  let pendingTime = null
  let framePending = false
  let frameHandle = null

  const applyPendingSeek = () => {
    framePending = false
    frameHandle = null

    if (pendingTime === null || video.seeking) return

    const nextTime = pendingTime
    pendingTime = null
    video.currentTime = nextTime
  }

  const queueSeek = () => {
    if (framePending || pendingTime === null || video.seeking) return
    framePending = true
    frameHandle = scheduleFrame(applyPendingSeek)
  }

  const cancelQueuedSeek = () => {
    if (framePending) cancelFrame(frameHandle)
    framePending = false
    frameHandle = null
    pendingTime = null
  }

  const initialise = () => {
    if (!Number.isFinite(video.duration) || video.duration <= 0) return
    video.pause()
    video.currentTime = video.duration / 2
    surface.dataset.mediaState = 'ready'
  }

  const keepPaused = () => video.pause()

  const onPointerDown = (event) => {
    if (!Number.isFinite(video.duration) || video.duration <= 0) return
    event.preventDefault()
    video.pause()
    activePointer = event.pointerId
    dragStartX = event.clientX
    dragStartTime = video.currentTime
    surface.dataset.dragging = 'true'
    surface.setPointerCapture?.(event.pointerId)
  }

  const onPointerMove = (event) => {
    if (activePointer !== event.pointerId) return
    event.preventDefault()
    video.pause()
    pendingTime = calculateScrubTime({
      startTime: dragStartTime,
      deltaX: event.clientX - dragStartX,
      width: surface.getBoundingClientRect().width,
      duration: video.duration,
    })
    queueSeek()
  }

  const finishDrag = (event) => {
    if (activePointer !== event.pointerId) return
    surface.releasePointerCapture?.(event.pointerId)
    activePointer = null
    surface.dataset.dragging = 'false'
  }

  const cancelDrag = (event) => {
    if (activePointer !== event.pointerId) return
    cancelQueuedSeek()
    finishDrag(event)
  }

  const onSeeked = () => queueSeek()

  const onLostPointerCapture = (event) => {
    if (activePointer !== event.pointerId) return
    activePointer = null
    surface.dataset.dragging = 'false'
  }

  const onError = () => {
    cancelQueuedSeek()
    activePointer = null
    surface.dataset.dragging = 'false'
    surface.dataset.mediaState = 'error'
  }

  video.addEventListener('loadedmetadata', initialise)
  video.addEventListener('play', keepPaused)
  video.addEventListener('error', onError)
  video.addEventListener('seeked', onSeeked)
  surface.addEventListener('pointerdown', onPointerDown)
  surface.addEventListener('pointermove', onPointerMove)
  surface.addEventListener('pointerup', finishDrag)
  surface.addEventListener('pointercancel', cancelDrag)
  surface.addEventListener('lostpointercapture', onLostPointerCapture)

  if (video.readyState >= 1) initialise()

  return {
    destroy() {
      video.removeEventListener('loadedmetadata', initialise)
      video.removeEventListener('play', keepPaused)
      video.removeEventListener('error', onError)
      video.removeEventListener('seeked', onSeeked)
      surface.removeEventListener('pointerdown', onPointerDown)
      surface.removeEventListener('pointermove', onPointerMove)
      surface.removeEventListener('pointerup', finishDrag)
      surface.removeEventListener('pointercancel', cancelDrag)
      surface.removeEventListener('lostpointercapture', onLostPointerCapture)
      cancelQueuedSeek()
      video.pause()
    },
  }
}
