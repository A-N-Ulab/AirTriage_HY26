import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const SCENARIO_URL = new URL('../src/experience/operator-scenario.json', import.meta.url)
const SAMPLES_URL = new URL('./fixtures/operator-verified-samples.json', import.meta.url)
const PERSON_IDS = ['person-01', 'person-02', 'person-03', 'person-04']

async function readJson(url) {
  try {
    return JSON.parse(await readFile(url, 'utf8'))
  } catch {
    return null
  }
}

test('scenario contains exactly four approved people', async () => {
  const scenario = await readJson(SCENARIO_URL)

  assert.ok(scenario, 'operator scenario file must exist and contain valid JSON')
  assert.deepEqual(
    scenario.people.map(({ id, status, heartRate, respiratoryRate, condition }) => ({
      id,
      status,
      heartRate,
      respiratoryRate,
      condition,
    })),
    [
      {
        id: 'person-01',
        status: 'yellow',
        heartRate: 118,
        respiratoryRate: 22,
        condition: 'Bardzo zmęczona · pozycja siedząca',
      },
      {
        id: 'person-02',
        status: 'green',
        heartRate: 84,
        respiratoryRate: 16,
        condition: 'Stan stabilny',
      },
      {
        id: 'person-03',
        status: 'green',
        heartRate: 79,
        respiratoryRate: 15,
        condition: 'Stan stabilny',
      },
      {
        id: 'person-04',
        status: 'green',
        heartRate: 88,
        respiratoryRate: 18,
        condition: 'Stan stabilny',
      },
    ],
  )
})

test('scenario covers every source frame with only valid approved boxes', async () => {
  const scenario = await readJson(SCENARIO_URL)

  assert.ok(scenario, 'operator scenario file must exist and contain valid JSON')
  assert.deepEqual(scenario.video, {
    width: 1920,
    height: 1080,
    fps: 30,
    frameCount: 278,
  })
  assert.equal(scenario.frames.length, 278)

  for (const [index, frame] of scenario.frames.entries()) {
    assert.equal(frame.frame, index)
    assert.deepEqual(Object.keys(frame.boxes).sort(), PERSON_IDS)

    for (const [personId, box] of Object.entries(frame.boxes)) {
      if (box === null) continue
      assert.equal(box.length, 4, `${personId} frame ${index} must have x/y/w/h`)
      assert.ok(box.every((value) => Number.isFinite(value) && value >= 0 && value <= 1))
      const [x, y, width, height] = box
      assert.ok(width > 0 && height > 0, `${personId} frame ${index} must have area`)
      assert.ok(x + width <= 1, `${personId} frame ${index} exceeds source width`)
      assert.ok(y + height <= 1, `${personId} frame ${index} exceeds source height`)
    }
  }
})

test('verified frame samples match within one source pixel', async () => {
  const scenario = await readJson(SCENARIO_URL)
  const samples = await readJson(SAMPLES_URL)

  assert.ok(scenario, 'operator scenario file must exist and contain valid JSON')
  assert.ok(samples, 'verified sample fixture must exist and contain valid JSON')

  for (const sample of samples) {
    const actual = scenario.frames[sample.frame]
    assert.equal(actual.frame, sample.frame)

    for (const [personId, expectedBox] of Object.entries(sample.boxes)) {
      const actualBox = actual.boxes[personId]
      if (expectedBox === null) {
        assert.equal(actualBox, null)
        continue
      }

      assert.notEqual(actualBox, null)
      const pixelScale = [1920, 1080, 1920, 1080]
      actualBox.forEach((value, index) => {
        const pixelDelta = Math.abs(value - expectedBox[index]) * pixelScale[index]
        assert.ok(
          pixelDelta <= 1,
          `${personId} frame ${sample.frame} differs by ${pixelDelta.toFixed(2)} px`,
        )
      })
    }
  }
})
