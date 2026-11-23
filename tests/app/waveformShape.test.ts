import { test } from 'node:test'
import assert from 'node:assert/strict'
import { toneRegions, waveformBars, withAlpha } from '../../src/lib/waveformShape.ts'

test('zoomed out, each bar covers several peaks and takes the loudest', () => {
  const waveform = { peaks: [0.1, 0.9, 0.2, 0.4, 0.3, 0.6, 0.5, 0.2], peaksPerSecond: 4 }
  const view = { startSeconds: 0, pixelsPerSecond: 8, widthPixels: 16 }
  assert.deepEqual(waveformBars(waveform, view), [
    { left: 0, width: 3, loudness: 0.9 },
    { left: 4, width: 3, loudness: 0.4 },
    { left: 8, width: 3, loudness: 0.6 },
    { left: 12, width: 3, loudness: 0.5 },
  ])
})

test('zoomed in, each peak gets its own wider bar', () => {
  const waveform = { peaks: [0.1, 0.9, 0.2], peaksPerSecond: 1 }
  const view = { startSeconds: 0, pixelsPerSecond: 20, widthPixels: 60 }
  assert.deepEqual(waveformBars(waveform, view), [
    { left: 0, width: 15, loudness: 0.1 },
    { left: 20, width: 15, loudness: 0.9 },
    { left: 40, width: 15, loudness: 0.2 },
  ])
})

test('bars stay anchored to song time while the view scrolls', () => {
  const waveform = { peaks: [0.1, 0.9, 0.2, 0.4], peaksPerSecond: 1 }
  const view = { startSeconds: 1.5, pixelsPerSecond: 10, widthPixels: 20 }
  assert.deepEqual(
    waveformBars(waveform, view).map((bar) => bar.left),
    [-5, 5, 15],
  )
})

test('bars stop at the end of the song', () => {
  const waveform = { peaks: [0.5, 0.5], peaksPerSecond: 1 }
  const view = { startSeconds: 0, pixelsPerSecond: 10, widthPixels: 100 }
  assert.equal(waveformBars(waveform, view).length, 2)
})

test('without a focus the envelope splits only at the playhead', () => {
  assert.deepEqual(toneRegions(100, 40, null), [
    { left: 0, right: 40, isPlayed: true, isFocused: false },
    { left: 40, right: 100, isPlayed: false, isFocused: false },
  ])
})

test('a playhead inside the loop splits the loop into played and upcoming parts', () => {
  const regions = toneRegions(100, 50, [30, 70])
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
  const regions = toneRegions(100, -20, [80, 150])
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
