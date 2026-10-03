import './demo.css'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'

import { createTerrainGeometry } from './terrain.js'

const mobileQuery = '(max-width: 700px), (pointer: coarse)'
const reducedMotionQuery = '(prefers-reduced-motion: reduce)'

export async function createDemo({ container, onProgress = () => {}, onError = () => {} }) {
  if (!(container instanceof HTMLElement)) {
    throw new TypeError('A valid demo container is required')
  }

  const report = (progress, message) => onProgress({ progress, message })
  const reducedMotion = window.matchMedia(reducedMotionQuery).matches
  const isMobile = window.matchMedia(mobileQuery).matches

  report(44, 'Creating terrain...')

  const canvas = document.createElement('canvas')
  canvas.className = 'terrain-demo__canvas'
  canvas.setAttribute('aria-label', 'Interactive 3D mountain terrain')

  const hud = document.createElement('div')
  hud.className = 'terrain-demo__hud'
  hud.innerHTML = `
    <div>
      <span class="terrain-demo__kicker">AirTriage / terrain study 01</span>
      <strong>Tatra massif</strong>
    </div>
    <span class="terrain-demo__hint">Drag to orbit&nbsp;&nbsp;·&nbsp;&nbsp;Scroll to explore</span>
  `

  container.replaceChildren(canvas, hud)
  container.dataset.autoRotate = String(!reducedMotion)
  container.closest('[data-demo-shell]')?.setAttribute('data-auto-rotate', String(!reducedMotion))

  let renderer
  try {
    renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: !isMobile,
      powerPreference: 'high-performance',
    })
  } catch (error) {
    container.replaceChildren()
    throw new Error('WebGL is unavailable on this device', { cause: error })
  }

  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.06
  renderer.shadowMap.enabled = !isMobile
  renderer.shadowMap.type = THREE.PCFSoftShadowMap

  const scene = new THREE.Scene()
  scene.background = new THREE.Color('#dce7e7')
  scene.fog = new THREE.Fog('#dce7e7', 15, 34)

  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 80)
  camera.position.set(10.8, 7.4, 12.6)

  scene.add(new THREE.HemisphereLight('#f8fbf6', '#344334', 2.3))

  const sun = new THREE.DirectionalLight('#fff1d2', 3.5)
  sun.position.set(-7, 12, 8)
  sun.castShadow = !isMobile
  sun.shadow.mapSize.set(1024, 1024)
  sun.shadow.camera.left = -9
  sun.shadow.camera.right = 9
  sun.shadow.camera.top = 9
  sun.shadow.camera.bottom = -9
  sun.shadow.camera.near = 1
  sun.shadow.camera.far = 35
  sun.shadow.bias = -0.0005
  scene.add(sun)

  const fill = new THREE.DirectionalLight('#a6c6db', 1.1)
  fill.position.set(8, 4, -7)
  scene.add(fill)

  report(58, 'Sculpting the massif...')

  const terrainGeometry = createTerrainGeometry({
    size: 15,
    segments: isMobile ? 104 : 164,
    seed: 731,
  })
  const terrainMaterial = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.94,
    metalness: 0,
  })
  const terrain = new THREE.Mesh(terrainGeometry, terrainMaterial)
  terrain.rotation.x = -Math.PI / 2
  terrain.castShadow = !isMobile
  terrain.receiveShadow = true
  scene.add(terrain)

  const groundGeometry = new THREE.CircleGeometry(21, 96)
  const groundMaterial = new THREE.MeshStandardMaterial({
    color: '#294c38',
    roughness: 1,
    metalness: 0,
  })
  const ground = new THREE.Mesh(groundGeometry, groundMaterial)
  ground.rotation.x = -Math.PI / 2
  ground.position.y = -0.57
  ground.receiveShadow = true
  scene.add(ground)

  report(78, 'Positioning the camera...')

  const controls = new OrbitControls(camera, canvas)
  controls.target.set(0, 1.25, 0)
  controls.enableDamping = true
  controls.dampingFactor = 0.045
  controls.enablePan = false
  controls.minDistance = 8.5
  controls.maxDistance = 19
  controls.minPolarAngle = 0.48
  controls.maxPolarAngle = 1.35
  controls.autoRotate = !reducedMotion
  controls.autoRotateSpeed = 0.42
  controls.update()

  const stopAutoRotate = () => {
    controls.autoRotate = false
    container.dataset.autoRotate = 'false'
    container.closest('[data-demo-shell]')?.setAttribute('data-auto-rotate', 'false')
  }
  controls.addEventListener('start', stopAutoRotate)

  const resize = () => {
    const { width, height } = container.getBoundingClientRect()
    const nextWidth = Math.max(1, Math.round(width))
    const nextHeight = Math.max(1, Math.round(height))
    renderer.setSize(nextWidth, nextHeight, false)
    camera.aspect = nextWidth / nextHeight
    camera.updateProjectionMatrix()
  }

  resize()
  window.addEventListener('resize', resize, { passive: true })

  let animationFrame = 0
  let destroyed = false

  const destroy = () => {
    if (destroyed) return
    destroyed = true
    cancelAnimationFrame(animationFrame)
    window.removeEventListener('resize', resize)
    canvas.removeEventListener('webglcontextlost', handleContextLost)
    controls.removeEventListener('start', stopAutoRotate)
    controls.dispose()
    terrainGeometry.dispose()
    terrainMaterial.dispose()
    groundGeometry.dispose()
    groundMaterial.dispose()
    sun.shadow.dispose()
    renderer.dispose()
    container.replaceChildren()
  }

  const handleContextLost = (event) => {
    event.preventDefault()
    destroy()
    onError(new Error('WebGL context lost'))
  }
  canvas.addEventListener('webglcontextlost', handleContextLost)

  const animate = () => {
    if (destroyed) return
    animationFrame = requestAnimationFrame(animate)
    if (document.hidden) return
    controls.update()
    renderer.render(scene, camera)
  }

  try {
    report(92, 'Rendering the first frame...')
    controls.update()
    renderer.render(scene, camera)
    animationFrame = requestAnimationFrame(animate)
  } catch (error) {
    destroy()
    throw error
  }

  return { destroy }
}
