const clamp = (value, min, max) => Math.min(max, Math.max(min, value))

export function calculateScrubTime({ startTime, deltaX, width, duration }) {
  if (!Number.isFinite(duration) || duration <= 0) return 0
  if (!Number.isFinite(width) || width <= 0) return clamp(startTime, 0, duration)

  return clamp(startTime + (deltaX / width) * duration, 0, duration)
}

export function createScrubController({ video, surface }) {
  let activePointer = null
  let dragStartX = 0
  let dragStartTime = 0

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
    video.currentTime = calculateScrubTime({
      startTime: dragStartTime,
      deltaX: event.clientX - dragStartX,
      width: surface.getBoundingClientRect().width,
      duration: video.duration,
    })
  }

  const finishDrag = (event) => {
    if (activePointer !== event.pointerId) return
    surface.releasePointerCapture?.(event.pointerId)
    activePointer = null
    surface.dataset.dragging = 'false'
  }

  const onError = () => {
    activePointer = null
    surface.dataset.dragging = 'false'
    surface.dataset.mediaState = 'error'
  }

  video.addEventListener('loadedmetadata', initialise)
  video.addEventListener('play', keepPaused)
  video.addEventListener('error', onError)
  surface.addEventListener('pointerdown', onPointerDown)
  surface.addEventListener('pointermove', onPointerMove)
  surface.addEventListener('pointerup', finishDrag)
  surface.addEventListener('pointercancel', finishDrag)

  if (video.readyState >= 1) initialise()

  return {
    destroy() {
      video.removeEventListener('loadedmetadata', initialise)
      video.removeEventListener('play', keepPaused)
      video.removeEventListener('error', onError)
      surface.removeEventListener('pointerdown', onPointerDown)
      surface.removeEventListener('pointermove', onPointerMove)
      surface.removeEventListener('pointerup', finishDrag)
      surface.removeEventListener('pointercancel', finishDrag)
      video.pause()
    },
  }
}
