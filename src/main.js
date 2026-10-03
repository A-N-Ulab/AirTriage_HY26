import './style.css'
import * as THREE from 'three'

document.querySelector('#app').innerHTML = `
  <main class="hero">
    <h1>BIG COMING SOON ...</h1>
    <canvas id="mountain-canvas" aria-label="3D mountain render"></canvas>
  </main>
`

const canvas = document.querySelector('#mountain-canvas')
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true })
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

const scene = new THREE.Scene()

const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100)
camera.position.set(0, 1.8, 6)

scene.add(new THREE.AmbientLight(0xffffff, 0.45))

const sunLight = new THREE.DirectionalLight(0xfff4d6, 1.1)
sunLight.position.set(4, 6, 3)
scene.add(sunLight)

const fillLight = new THREE.DirectionalLight(0x8eb8ff, 0.5)
fillLight.position.set(-4, 2, -3)
scene.add(fillLight)

const mountain = new THREE.Group()

const baseGeometry = new THREE.ConeGeometry(2.3, 4.8, 64)
const baseMaterial = new THREE.MeshStandardMaterial({
  color: 0x6f7478,
  roughness: 0.9,
  metalness: 0.05,
  flatShading: true,
})
const base = new THREE.Mesh(baseGeometry, baseMaterial)
base.position.y = 0.1
mountain.add(base)

const snowGeometry = new THREE.ConeGeometry(1.15, 1.8, 64)
const snowMaterial = new THREE.MeshStandardMaterial({
  color: 0xf5f7fb,
  roughness: 0.55,
  metalness: 0.02,
  flatShading: true,
})
const snowCap = new THREE.Mesh(snowGeometry, snowMaterial)
snowCap.position.y = 1.75
mountain.add(snowCap)

const ridgeGeometry = new THREE.ConeGeometry(0.6, 2.8, 5)
const ridgeMaterial = new THREE.MeshStandardMaterial({
  color: 0x5f676d,
  roughness: 0.95,
  flatShading: true,
})
const ridge = new THREE.Mesh(ridgeGeometry, ridgeMaterial)
ridge.position.set(-0.7, 0.9, 0.5)
ridge.rotation.z = 0.22
mountain.add(ridge)

scene.add(mountain)

const ground = new THREE.Mesh(
  new THREE.CircleGeometry(5, 64),
  new THREE.MeshStandardMaterial({ color: 0x1b2f44, roughness: 1 }),
)
ground.rotation.x = -Math.PI / 2
ground.position.y = -2.3
scene.add(ground)

const setSize = () => {
  const width = canvas.clientWidth
  const height = canvas.clientHeight
  renderer.setSize(width, height, false)
  camera.aspect = width / height
  camera.updateProjectionMatrix()
}

setSize()
window.addEventListener('resize', setSize)

renderer.setAnimationLoop((time) => {
  mountain.rotation.y = time * 0.00025
  mountain.rotation.x = Math.sin(time * 0.00035) * 0.03 - 0.04
  renderer.render(scene, camera)
})
