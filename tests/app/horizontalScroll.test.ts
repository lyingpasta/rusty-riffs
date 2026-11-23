import { test } from 'node:test'
import assert from 'node:assert/strict'
import { scrollLeftAfterThumbDrag, scrollLeftCenteredOn, thumbSpan } from '../../src/lib/horizontalScroll.ts'

const overflowing = { scrollLeft: 100, scrollWidth: 400, clientWidth: 200 }

test('there is no thumb when the content fits', () => {
  assert.equal(thumbSpan({ scrollLeft: 0, scrollWidth: 200, clientWidth: 200 }), null)
})

test('the thumb spans the visible share of the content', () => {
  assert.deepEqual(thumbSpan(overflowing), { startPercent: 25, sizePercent: 50 })
})

test('dragging the thumb scrolls the content in proportion', () => {
  assert.equal(scrollLeftAfterThumbDrag(overflowing, 100, 30), 160)
})

test('dragging the thumb never scrolls past either end', () => {
  assert.equal(scrollLeftAfterThumbDrag(overflowing, 100, -500), 0)
  assert.equal(scrollLeftAfterThumbDrag(overflowing, 100, 500), 200)
})

test('clicking the track centers the view on that spot', () => {
  assert.equal(scrollLeftCenteredOn(overflowing, 100), 100)
  assert.equal(scrollLeftCenteredOn(overflowing, 0), 0)
  assert.equal(scrollLeftCenteredOn(overflowing, 200), 200)
})
