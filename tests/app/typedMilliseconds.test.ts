import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parseTypedMilliseconds } from '../../src/lib/typedMilliseconds.ts'

test('a plain number is read as milliseconds', () => {
  assert.equal(parseTypedMilliseconds('120'), 120)
  assert.equal(parseTypedMilliseconds(' 85.5 '), 85.5)
})

test('the ms unit and a sign are accepted', () => {
  assert.equal(parseTypedMilliseconds('120ms'), 120)
  assert.equal(parseTypedMilliseconds('-30 MS'), -30)
  assert.equal(parseTypedMilliseconds('+15'), 15)
})

test('anything that is not a number of milliseconds is rejected', () => {
  assert.equal(parseTypedMilliseconds(''), null)
  assert.equal(parseTypedMilliseconds('fast'), null)
  assert.equal(parseTypedMilliseconds('120s'), null)
  assert.equal(parseTypedMilliseconds('1e3'), null)
})
