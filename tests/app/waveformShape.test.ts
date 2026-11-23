import { test } from 'node:test'
import assert from 'node:assert/strict'
import { columnLoudness, envelopeRegions, smooth, withAlpha } from '../../src/lib/waveformShape.ts'

test('each column takes the loudest peak it covers', () => {
  const waveform = { peaks: [0.1, 0.9, 0.2, 0.4], peaksPerSecond: 4 }
  const view = { startSeconds: 0, pixelsPerSecond: 2, widthPixels: 2 }
  assert.deepEqual(columnLoudness(waveform, view), [0.9, 0.4])
})

test('a column narrower than one peak still reads that peak', () => {
  const waveform = { peaks: [0.5], peaksPerSecond: 1 }
  const view = { startSeconds: 0, pixelsPerSecond: 4, widthPixels: 3 }
  assert.deepEqual(columnLoudness(waveform, view), [0.5, 0.5, 0.5])
})

test('smoothing softens a spike but keeps flat stretches flat', () => {
  assert.deepEqual(smooth([0, 1, 0]), [0.25, 0.5, 0.25])
  assert.deepEqual(smooth([0.3, 0.3, 0.3]), [0.3, 0.3, 0.3])
})

test('without a focus the envelope splits only at the playhead', () => {
  assert.deepEqual(envelopeRegions(100, 40, null), [
    { left: 0, right: 40, isPlayed: true, isFocused: false },
    { left: 40, right: 100, isPlayed: false, isFocused: false },
  ])
})

test('a playhead inside the loop splits the loop into played and upcoming parts', () => {
  const regions = envelopeRegions(100, 50, [30, 70])
  assert.deepEqual(
    regions.map(({ left, right, isPlayed, isFocused }) => [left, right, isPlayed, isFocused]),
    [
      [0, 30, true, false],
      [30, 50, true, true],
      [50, 70, false, true],
      [70, 100, false, false],
    ],
  )
})

test('regions stay inside the canvas when the playhead or loop is off screen', () => {
  const regions = envelopeRegions(100, -20, [80, 150])
  assert.deepEqual(
    regions.map(({ left, right }) => [left, right]),
    [
      [0, 80],
      [80, 100],
    ],
  )
})

test('hex colours gain an alpha channel', () => {
  assert.equal(withAlpha('#c59a5f', 0.5), 'rgba(197, 154, 95, 0.5)')
  assert.equal(withAlpha(' #C59A5F ', 1), 'rgba(197, 154, 95, 1)')
})

test('a colour that is not #rrggbb is rejected', () => {
  assert.throws(() => withAlpha('rgba(0, 0, 0, 1)', 0.5), /#rrggbb/)
})
