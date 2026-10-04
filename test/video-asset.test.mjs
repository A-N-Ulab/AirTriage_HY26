import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const CONTAINER_TYPES = new Set(['moov', 'trak', 'mdia', 'minf', 'stbl'])

function readBoxes(buffer, start = 0, end = buffer.length, path = [], result = []) {
  let offset = start

  while (offset + 8 <= end) {
    let size = buffer.readUInt32BE(offset)
    const type = buffer.toString('ascii', offset + 4, offset + 8)
    let headerSize = 8

    if (size === 1) {
      size = Number(buffer.readBigUInt64BE(offset + 8))
      headerSize = 16
    } else if (size === 0) {
      size = end - offset
    }

    if (size < headerSize || offset + size > end) break

    const box = {
      type,
      start: offset,
      end: offset + size,
      dataStart: offset + headerSize,
      path: [...path, type],
    }
    result.push(box)

    if (CONTAINER_TYPES.has(type)) {
      readBoxes(buffer, box.dataStart, box.end, box.path, result)
    }

    offset += size
  }

  return result
}

function readVideoSeekMetadata(buffer) {
  const boxes = readBoxes(buffer)
  const videoTrack = boxes.find((box) => {
    if (box.type !== 'trak') return false
    const handler = boxes.find(
      (candidate) =>
        candidate.type === 'hdlr' &&
        candidate.start >= box.dataStart &&
        candidate.end <= box.end,
    )
    return handler && buffer.toString('ascii', handler.dataStart + 8, handler.dataStart + 12) === 'vide'
  })

  assert.ok(videoTrack, 'MP4 should contain a video track')

  const trackBoxes = boxes.filter(
    (box) => box.start >= videoTrack.dataStart && box.end <= videoTrack.end,
  )
  const mdhd = trackBoxes.find((box) => box.type === 'mdhd')
  const tkhd = trackBoxes.find((box) => box.type === 'tkhd')
  const stsd = trackBoxes.find((box) => box.type === 'stsd')
  const stss = trackBoxes.find((box) => box.type === 'stss')
  const stts = trackBoxes.find((box) => box.type === 'stts')

  assert.ok(
    tkhd && mdhd && stsd && stss && stts,
    'video track should expose codec, dimensions and timing',
  )

  const version = buffer[mdhd.dataStart]
  const timescaleOffset = version === 1 ? 20 : 12
  const timescale = buffer.readUInt32BE(mdhd.dataStart + timescaleOffset)
  const trackHeaderVersion = buffer[tkhd.dataStart]
  const dimensionsOffset = trackHeaderVersion === 1 ? 88 : 76
  const width = buffer.readUInt32BE(tkhd.dataStart + dimensionsOffset) / 65536
  const height = buffer.readUInt32BE(tkhd.dataStart + dimensionsOffset + 4) / 65536
  const sampleDescriptionCount = buffer.readUInt32BE(stsd.dataStart + 4)
  assert.ok(sampleDescriptionCount > 0, 'video track should expose a sample description')
  const codec = buffer.toString('ascii', stsd.dataStart + 12, stsd.dataStart + 16)

  const timingEntryCount = buffer.readUInt32BE(stts.dataStart + 4)
  let sampleCount = 0
  let totalTicks = 0
  const sampleStartTicks = []
  const timingEntries = []

  for (let index = 0; index < timingEntryCount; index += 1) {
    const entryOffset = stts.dataStart + 8 + index * 8
    const count = buffer.readUInt32BE(entryOffset)
    const delta = buffer.readUInt32BE(entryOffset + 4)
    timingEntries.push({ count, delta })
    for (let sample = 0; sample < count; sample += 1) {
      sampleStartTicks.push(totalTicks + sample * delta)
    }
    sampleCount += count
    totalTicks += count * delta
  }

  const syncSampleCount = buffer.readUInt32BE(stss.dataStart + 4)
  const syncSamples = Array.from({ length: syncSampleCount }, (_, index) =>
    buffer.readUInt32BE(stss.dataStart + 8 + index * 4),
  )
  const framesPerSecond = sampleCount / (totalTicks / timescale)
  const syncStartTicks = syncSamples.map((sample) => sampleStartTicks[sample - 1])
  const syncGapsInTicks = syncStartTicks
    .slice(1)
    .map((startTicks, index) => startTicks - syncStartTicks[index])
  syncGapsInTicks.push(totalTicks - syncStartTicks.at(-1))

  return {
    codec,
    width,
    height,
    sampleCount,
    framesPerSecond,
    firstSyncSample: syncSamples[0],
    timescale,
    timingEntries,
    moovStart: boxes.find((box) => box.type === 'moov' && box.path.length === 1)?.start,
    mdatStart: boxes.find((box) => box.type === 'mdat' && box.path.length === 1)?.start,
    maximumKeyframeGapSeconds: Math.max(...syncGapsInTicks) / timescale,
  }
}

test('operator film is prepared for responsive browser seeking', async () => {
  const buffer = await readFile(new URL('../public/video/film_2.mp4', import.meta.url))
  const metadata = readVideoSeekMetadata(buffer)

  assert.deepEqual([metadata.width, metadata.height], [1280, 720])
  assert.equal(metadata.codec, 'avc1')
  assert.equal(metadata.sampleCount, 278)
  assert.ok(Math.abs(metadata.framesPerSecond - 30) < 0.001)
  assert.deepEqual(metadata.timingEntries, [
    { count: 278, delta: metadata.timescale / 30 },
  ])
  assert.equal(metadata.firstSyncSample, 1)
  assert.ok(metadata.moovStart < metadata.mdatStart, 'metadata should precede media data')
  assert.ok(
    metadata.maximumKeyframeGapSeconds <= 0.25,
    `keyframes should be at most 250 ms apart; received ${metadata.maximumKeyframeGapSeconds.toFixed(3)} s`,
  )
  assert.ok(
    buffer.byteLength <= 7 * 1024 * 1024,
    `operator film should be at most 7 MiB; received ${(buffer.byteLength / 1024 / 1024).toFixed(1)} MiB`,
  )
})

test('intro film stays within the fast-start delivery budget', async () => {
  const buffer = await readFile(
    new URL('../public/video/RYSY_demo_20s_dopracowany.mp4', import.meta.url),
  )
  const boxes = readBoxes(buffer)
  const metadata = readVideoSeekMetadata(buffer)
  const moov = boxes.find((box) => box.type === 'moov' && box.path.length === 1)
  const mdat = boxes.find((box) => box.type === 'mdat' && box.path.length === 1)

  assert.ok(moov && mdat, 'intro MP4 should expose media and metadata boxes')
  assert.deepEqual([metadata.width, metadata.height], [1600, 900])
  assert.equal(metadata.codec, 'avc1')
  assert.ok(Math.abs(metadata.framesPerSecond - 30) < 0.001)
  assert.ok(moov.start < mdat.start, 'intro metadata should precede media data')
  assert.ok(
    buffer.byteLength <= 10 * 1024 * 1024,
    `intro film should be at most 10 MiB; received ${(buffer.byteLength / 1024 / 1024).toFixed(1)} MiB`,
  )
})
