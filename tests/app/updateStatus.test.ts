import { test } from 'node:test'
import assert from 'node:assert/strict'
import { availableUpdateAction, describeUpdateStatus, downloadPercent } from '../../src/lib/updateStatus.ts'

test('download percent is unknown until the total size is known', () => {
  assert.equal(downloadPercent(500, null), null)
  assert.equal(downloadPercent(500, 0), null)
})

test('download percent rounds down and never passes 100', () => {
  assert.equal(downloadPercent(999, 1000), 99)
  assert.equal(downloadPercent(1200, 1000), 100)
})

test('a download describes its progress when the size is known', () => {
  assert.equal(describeUpdateStatus({ kind: 'downloading', downloadedBytes: 250, totalBytes: 1000 }), 'Downloading the update… 25%')
  assert.equal(describeUpdateStatus({ kind: 'downloading', downloadedBytes: 250, totalBytes: null }), 'Downloading the update…')
})

test('a failure names the step that failed and why', () => {
  assert.equal(
    describeUpdateStatus({ kind: 'failed', step: 'check', reason: 'offline' }),
    "Couldn't check the update: offline",
  )
})

test('an available update offers to install it', () => {
  assert.equal(availableUpdateAction({ kind: 'available', version: '0.2.0', currentVersion: '0.1.1' }), 'install')
})

test('settled states offer a new check', () => {
  assert.equal(availableUpdateAction({ kind: 'idle' }), 'check')
  assert.equal(availableUpdateAction({ kind: 'up-to-date' }), 'check')
  assert.equal(availableUpdateAction({ kind: 'failed', step: 'install', reason: 'disk full' }), 'check')
})

test('busy states offer nothing', () => {
  assert.equal(availableUpdateAction({ kind: 'checking' }), null)
  assert.equal(availableUpdateAction({ kind: 'downloading', downloadedBytes: 0, totalBytes: null }), null)
  assert.equal(availableUpdateAction({ kind: 'restarting' }), null)
})
