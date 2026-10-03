import { Color, Float32BufferAttribute, MathUtils, PlaneGeometry } from 'three'

const LOW = new Color('#294c38')
const ALPINE = new Color('#62705a')
const ROCK = new Color('#777a72')
const HIGH_ROCK = new Color('#a7aaa2')
const SNOW = new Color('#eef1eb')

const smooth = (value) => value * value * (3 - 2 * value)
const mix = (a, b, amount) => a + (b - a) * amount

function hash2(x, z, seed) {
  let value = Math.imul(x, 374761393) ^ Math.imul(z, 668265263) ^ Math.imul(seed, 1442695041)
  value = Math.imul(value ^ (value >>> 13), 1274126177)
  return ((value ^ (value >>> 16)) >>> 0) / 4294967295
}

function valueNoise(x, z, seed) {
  const x0 = Math.floor(x)
  const z0 = Math.floor(z)
  const tx = smooth(x - x0)
  const tz = smooth(z - z0)
  const a = hash2(x0, z0, seed) * 2 - 1
  const b = hash2(x0 + 1, z0, seed) * 2 - 1
  const c = hash2(x0, z0 + 1, seed) * 2 - 1
  const d = hash2(x0 + 1, z0 + 1, seed) * 2 - 1
  return mix(mix(a, b, tx), mix(c, d, tx), tz)
}

function fbm(x, z, seed, octaves = 5) {
  let value = 0
  let amplitude = 0.5
  let frequency = 1
  let totalAmplitude = 0

  for (let octave = 0; octave < octaves; octave += 1) {
    value += valueNoise(x * frequency, z * frequency, seed + octave * 1013) * amplitude
    totalAmplitude += amplitude
    amplitude *= 0.52
    frequency *= 2.07
  }

  return value / totalAmplitude
}

export function terrainHeight(x, z, seed = 731) {
  const distance = Math.hypot(x * 0.92, z * 1.06)
  const envelope = Math.max(0, 1 - MathUtils.smoothstep(distance, 0.12, 1.08))
  const broadNoise = fbm(x * 1.7 + 4.2, z * 1.7 - 2.8, seed)
  const ridgeNoise = 1 - Math.abs(fbm(x * 3.1 - 5.7, z * 3.1 + 1.9, seed + 97, 4))
  const fineNoise = fbm(x * 8.5, z * 8.5, seed + 211, 3)
  const shoulder = Math.max(0, 1 - MathUtils.smoothstep(Math.hypot(x + 0.28, z - 0.12), 0.08, 0.72))

  return (
    -0.42 - distance * 0.16 +
    envelope * (3.15 + broadNoise * 1.35 + ridgeNoise * 0.72) +
    shoulder * 0.62 +
    envelope * fineNoise * 0.2
  )
}

function terrainColor(height, slope, variation) {
  const color = new Color()

  if (height < 0.7) {
    color.lerpColors(LOW, ALPINE, MathUtils.smoothstep(height, -0.5, 0.7))
  } else if (height < 2.35) {
    const rockExposure = MathUtils.clamp(MathUtils.smoothstep(slope, 0.2, 0.7) + variation * 0.12, 0, 1)
    color.lerpColors(ALPINE, ROCK, rockExposure)
  } else if (height < 3.45) {
    color.lerpColors(ROCK, HIGH_ROCK, MathUtils.smoothstep(height, 2.35, 3.45))
  } else {
    const snowCover = MathUtils.clamp(MathUtils.smoothstep(height, 3.25, 4.35) - slope * 0.32, 0, 1)
    color.lerpColors(HIGH_ROCK, SNOW, snowCover)
  }

  return color.offsetHSL(variation * 0.012, variation * 0.018, variation * 0.025)
}

export function createTerrainGeometry({ size = 14, segments = 160, seed = 731 } = {}) {
  const geometry = new PlaneGeometry(size, size, segments, segments)
  const positions = geometry.getAttribute('position')
  const halfSize = size / 2

  for (let index = 0; index < positions.count; index += 1) {
    const x = positions.getX(index) / halfSize
    const z = -positions.getY(index) / halfSize
    positions.setZ(index, terrainHeight(x, z, seed))
  }

  positions.needsUpdate = true
  geometry.computeVertexNormals()

  const normals = geometry.getAttribute('normal')
  const colors = new Float32Array(positions.count * 3)
  const color = new Color()

  for (let index = 0; index < positions.count; index += 1) {
    const height = positions.getZ(index)
    const slope = 1 - Math.max(0, normals.getZ(index))
    const variation = valueNoise(positions.getX(index) * 0.65, positions.getY(index) * 0.65, seed + 409)
    color.copy(terrainColor(height, slope, variation)).toArray(colors, index * 3)
  }

  geometry.setAttribute('color', new Float32BufferAttribute(colors, 3))
  geometry.computeBoundingSphere()
  return geometry
}
