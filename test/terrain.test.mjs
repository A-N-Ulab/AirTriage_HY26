import assert from 'node:assert/strict'
import test from 'node:test'

import { createTerrainGeometry, terrainHeight } from '../src/demo/terrain.js'

const colorDistance = (a, b) =>
  Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2])

test('terrainHeight is deterministic for a seed', () => {
  const sample = terrainHeight(0.23, -0.41, 731)

  assert.equal(sample, terrainHeight(0.23, -0.41, 731))
  assert.notEqual(sample, terrainHeight(0.23, -0.41, 732))
})

test('terrainHeight forms a central massif above its outer edge', () => {
  const center = [
    terrainHeight(0, 0, 731),
    terrainHeight(0.12, 0, 731),
    terrainHeight(-0.12, 0.08, 731),
  ]
  const edge = [
    terrainHeight(-0.95, -0.95, 731),
    terrainHeight(0.95, -0.95, 731),
    terrainHeight(-0.95, 0.95, 731),
    terrainHeight(0.95, 0.95, 731),
  ]
  const average = (values) => values.reduce((sum, value) => sum + value, 0) / values.length

  assert.ok(average(center) > average(edge) + 0.8)
})

test('createTerrainGeometry produces finite positions, normals, and vertex colors', () => {
  const segments = 32
  const geometry = createTerrainGeometry({ size: 12, segments, seed: 731 })
  const positions = geometry.getAttribute('position')
  const normals = geometry.getAttribute('normal')
  const colors = geometry.getAttribute('color')

  assert.equal(positions.count, (segments + 1) ** 2)
  assert.equal(normals.count, positions.count)
  assert.equal(colors.count, positions.count)
  assert.equal([...positions.array, ...normals.array, ...colors.array].every(Number.isFinite), true)
})

test('terrain colors distinguish low ground, exposed rock, and snow', () => {
  const geometry = createTerrainGeometry({ size: 12, segments: 48, seed: 731 })
  const positions = geometry.getAttribute('position')
  const colors = geometry.getAttribute('color')
  const samples = Array.from({ length: positions.count }, (_, index) => ({
    height: positions.getZ(index),
    color: [colors.getX(index), colors.getY(index), colors.getZ(index)],
  })).sort((a, b) => a.height - b.height)

  const low = samples[Math.floor(samples.length * 0.12)].color
  const rock = samples[Math.floor(samples.length * 0.7)].color
  const snow = samples[Math.floor(samples.length * 0.98)].color

  assert.ok(colorDistance(low, rock) > 0.12)
  assert.ok(colorDistance(rock, snow) > 0.12)
  assert.ok(colorDistance(low, snow) > 0.2)
})
