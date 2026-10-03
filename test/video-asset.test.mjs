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
  const stss = trackBoxes.find((box) => box.type === 'stss')
  const stts = trackBoxes.find((box) => box.type === 'stts')

  assert.ok(mdhd && stss && stts, 'video track should expose timing and sync samples')

  const version = buffer[mdhd.dataStart]
  const timescaleOffset = version === 1 ? 20 : 12
  const timescale = buffer.readUInt32BE(mdhd.dataStart + timescaleOffset)

  const timingEntryCount = buffer.readUInt32BE(stts.dataStart + 4)
  let sampleCount = 0
  let totalTicks = 0

  for (let index = 0; index < timingEntryCount; index += 1) {
    const entryOffset = stts.dataStart + 8 + index * 8
    const count = buffer.readUInt32BE(entryOffset)
    const delta = buffer.readUInt32BE(entryOffset + 4)
    sampleCount += count
    totalTicks += count * delta
  }

  const syncSampleCount = buffer.readUInt32BE(stss.dataStart + 4)
  const syncSamples = Array.from({ length: syncSampleCount }, (_, index) =>
    buffer.readUInt32BE(stss.dataStart + 8 + index * 4),
  )
  const framesPerSecond = sampleCount / (totalTicks / timescale)
  const syncGaps = syncSamples.slice(1).map((sample, index) => sample - syncSamples[index])
  syncGaps.push(sampleCount + 1 - syncSamples.at(-1))

  return {
    moovStart: boxes.find((box) => box.type === 'moov' && box.path.length === 1)?.start,
    mdatStart: boxes.find((box) => box.type === 'mdat' && box.path.length === 1)?.start,
    maximumKeyframeGapSeconds: Math.max(...syncGaps) / framesPerSecond,
  }
}

test('operator film is prepared for responsive browser seeking', async () => {
  const buffer = await readFile(new URL('../public/video/film_2.mp4', import.meta.url))
  const metadata = readVideoSeekMetadata(buffer)

  assert.ok(metadata.moovStart < metadata.mdatStart, 'metadata should precede media data')
  assert.ok(
    metadata.maximumKeyframeGapSeconds <= 0.25,
    `keyframes should be at most 250 ms apart; received ${metadata.maximumKeyframeGapSeconds.toFixed(3)} s`,
  )
})
