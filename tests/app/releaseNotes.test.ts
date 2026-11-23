import { test } from 'node:test'
import assert from 'node:assert/strict'
import { compareVersions, parseChangelog, releasesBetween } from '../../src/lib/releaseNotes.ts'

const CHANGELOG = `# Changelog

## [0.3.0](https://github.com/lyingpasta/rusty-riffs/compare/v0.2.0...v0.3.0) (2026-12-10)


### Features

* **ui:** add an About dialog ([#3](https://github.com/lyingpasta/rusty-riffs/issues/3)) ([27ae0b6](https://github.com/lyingpasta/rusty-riffs/commit/27ae0b6))
* offer updates in a popup ([efce5f3](https://github.com/lyingpasta/rusty-riffs/commit/efce5f3))


### Bug Fixes

* stop held keys piling up seeks ([1eaa97d](https://github.com/lyingpasta/rusty-riffs/commit/1eaa97d))

## [0.2.0](https://github.com/lyingpasta/rusty-riffs/compare/v0.1.1...v0.2.0) (2026-12-01)


### Features

* add selection mode ([abc1234](https://github.com/lyingpasta/rusty-riffs/commit/abc1234))

## [0.1.1](https://github.com/lyingpasta/rusty-riffs/compare/v0.1.0...v0.1.1) (2026-11-23)


### Bug Fixes

* sign macOS builds ad hoc ([c6a24cf](https://github.com/lyingpasta/rusty-riffs/commit/c6a24cf))
`

test('each release keeps its version, section titles and items in order', () => {
  const releases = parseChangelog(CHANGELOG)
  assert.deepEqual(
    releases.map((release) => release.version),
    ['0.3.0', '0.2.0', '0.1.1'],
  )
  assert.deepEqual(
    releases[0].sections.map((section) => section.title),
    ['Features', 'Bug Fixes'],
  )
})

test('items drop their issue and commit links and the bold around scopes', () => {
  const [latest] = parseChangelog(CHANGELOG)
  assert.deepEqual(latest.sections[0].items, ['ui: add an About dialog', 'offer updates in a popup'])
})

test('versions compare numerically, part by part', () => {
  assert.ok(compareVersions('0.10.0', '0.9.0') > 0)
  assert.ok(compareVersions('0.1.1', '0.2.0') < 0)
  assert.equal(compareVersions('1.0.0', '1.0.0'), 0)
})

test('an update shows every release after the old version up to the new one', () => {
  const releases = releasesBetween(parseChangelog(CHANGELOG), '0.1.1', '0.3.0')
  assert.deepEqual(
    releases.map((release) => release.version),
    ['0.3.0', '0.2.0'],
  )
})

test('an update to a version missing from the changelog shows nothing', () => {
  assert.deepEqual(releasesBetween(parseChangelog(CHANGELOG), '0.3.0', '0.4.0'), [])
})
