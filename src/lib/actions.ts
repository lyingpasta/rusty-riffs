import { backend, type DeletedMarkers, type SongSettings } from './backend'
import { interaction } from './interaction.svelte'
import { player } from './player.svelte'
import { applyTheme, nextTheme } from './theme'
import { nearestAttackSeconds } from './attacks'
import { timing } from './timing.svelte'
import { pickSongFile } from './songPicker'
import { visibleSecondsOnScreen } from './waveformViewport'
import { activeLoop, currentSpeed, markerAtOrBefore, markerById, neighbourLoop, neighbourMarker } from './songModel'

const SPEED_STEP_PERCENT = 5
const PITCH_STEP_SEMITONES = 1
const CENTS_STEP = 5
const NICE_STEPS_SECONDS = [0.05, 0.1, 0.25, 0.5, 1]
const STEPS_PER_VISIBLE_WIDTH = 50
const LARGE_STEP_FACTOR = 5
const REWIND_GRACE_SECONDS = 1
const PREROLL_CHOICES_SECONDS = [0, 1, 2]

function withSettings(action: (settings: SongSettings) => void): void {
  const settings = player.state?.song ? player.state.settings : null
  if (settings) action(settings)
}

function previousMarkerForJump(settings: SongSettings, seconds: number) {
  const current = markerAtOrBefore(settings.markers, seconds)
  if (current && seconds - current.seconds > REWIND_GRACE_SECONDS) return current
  return current ? neighbourMarker(settings.markers, current.seconds, -1) : null
}

function selectedRange(): [number, number] | null {
  const mode = interaction.mode
  if (mode.kind !== 'selection' || mode.anchorSeconds === mode.endSeconds) return null
  return [Math.min(mode.anchorSeconds, mode.endSeconds), Math.max(mode.anchorSeconds, mode.endSeconds)]
}

function describeDeletedMarkers(deleted: DeletedMarkers): string {
  const markers = deleted.markerCount === 1 ? '1 marker' : `${deleted.markerCount} markers`
  if (deleted.removedLoopNames.length === 0) return `Deleted ${markers}`
  return `Deleted ${markers} and loop ${deleted.removedLoopNames.join(', ')}`
}

function heardSeconds(settings: SongSettings): number {
  const playheadSeconds = player.currentSeconds()
  if (!player.state?.isPlaying) return playheadSeconds
  return Math.max(playheadSeconds - timing.offsetInSongSeconds(currentSpeed(settings)), 0)
}

function markingSeconds(settings: SongSettings): number {
  const seconds = heardSeconds(settings)
  if (!timing.isSnapEnabled || !player.waveform) return seconds
  return nearestAttackSeconds(player.waveform, seconds) ?? seconds
}

function nudgeStepSeconds(isLarge: boolean): number {
  const visibleSeconds = visibleSecondsOnScreen()
  const largestStep = NICE_STEPS_SECONDS[NICE_STEPS_SECONDS.length - 1]
  const idealStep = visibleSeconds === null ? largestStep : visibleSeconds / STEPS_PER_VISIBLE_WIDTH
  const step = NICE_STEPS_SECONDS.find((candidate) => candidate >= idealStep) ?? largestStep
  return isLarge ? step * LARGE_STEP_FACTOR : step
}

let pendingNudgeSeconds = 0
let isNudgeInFlight = false

function queueNudge(deltaSeconds: number): void {
  pendingNudgeSeconds += deltaSeconds
  if (!isNudgeInFlight) sendPendingNudge()
}

function sendPendingNudge(): void {
  const deltaSeconds = pendingNudgeSeconds
  pendingNudgeSeconds = 0
  isNudgeInFlight = true
  backend
    .seekBy(deltaSeconds)
    .catch((error) => (player.error = String(error)))
    .finally(() => {
      isNudgeInFlight = false
      if (pendingNudgeSeconds !== 0) sendPendingNudge()
    })
}

function seek(seconds: number): void {
  player.run(() => backend.seek(seconds))
}

export const actions = {
  openSong(): void {
    if (player.isLoading) return
    pickSongFile()
      .then((path) => (path === null ? undefined : player.open(path)))
      .catch((error) => (player.error = String(error)))
  },
  togglePlaying(): void {
    withSettings(() => player.run(() => backend.setPlaying(!player.state?.isPlaying)))
  },
  changeSpeed(direction: 1 | -1): void {
    withSettings((settings) => player.run(() => backend.setSpeed(currentSpeed(settings) + direction * SPEED_STEP_PERCENT)))
  },
  resetSpeed(): void {
    withSettings(() => player.run(() => backend.setSpeed(100)))
  },
  changePitch(direction: 1 | -1): void {
    withSettings((settings) => {
      const pitch = { ...settings.pitch, semitones: settings.pitch.semitones + direction * PITCH_STEP_SEMITONES }
      player.run(() => backend.setPitch(pitch))
    })
  },
  changeCents(direction: 1 | -1): void {
    withSettings((settings) => {
      const pitch = { ...settings.pitch, cents: settings.pitch.cents + direction * CENTS_STEP }
      player.run(() => backend.setPitch(pitch))
    })
  },
  resetPitch(): void {
    withSettings(() => player.run(() => backend.setPitch({ semitones: 0, cents: 0 })))
  },
  nudge(direction: 1 | -1, isLarge: boolean): void {
    withSettings(() => queueNudge(direction * nudgeStepSeconds(isLarge)))
  },
  jumpToStart(): void {
    withSettings((settings) => {
      const active = activeLoop(settings)
      const startMarker = active ? markerById(settings, active.startMarkerId) : null
      seek(startMarker?.seconds ?? 0)
    })
  },
  addMarker(): void {
    withSettings((settings) => {
      const seconds = markingSeconds(settings)
      player.run(async () => void (await backend.addMarker(seconds)))
    })
  },
  jumpToMarker(direction: 1 | -1): void {
    withSettings((settings) => {
      const seconds = player.currentSeconds()
      const target =
        direction === 1 ? neighbourMarker(settings.markers, seconds, 1) : previousMarkerForJump(settings, seconds)
      if (target) seek(target.seconds)
    })
  },
  renameMarkerAtPlayhead(): void {
    withSettings((settings) => {
      const marker = markerAtOrBefore(settings.markers, heardSeconds(settings))
      if (!marker) return interaction.showNotice('No marker at or before the playhead')
      interaction.renameTarget = { kind: 'marker', id: marker.id, name: marker.name }
    })
  },
  deleteMarkerAtPlayhead(): void {
    withSettings((settings) => {
      const marker = markerAtOrBefore(settings.markers, heardSeconds(settings))
      if (!marker) return interaction.showNotice('No marker at or before the playhead')
      player.run(async () => {
        const removedLoops = await backend.deleteMarker(marker.id)
        const loopsNote = removedLoops.length > 0 ? ` and loop ${removedLoops.join(', ')}` : ''
        interaction.showNotice(`Deleted marker ${marker.name}${loopsNote}`)
      })
    })
  },
  startNewLoop(): void {
    withSettings((settings) => {
      const start = markerAtOrBefore(settings.markers, heardSeconds(settings))
      const end = start ? neighbourMarker(settings.markers, start.seconds, 1) : null
      if (!start || !end) return interaction.showNotice('A new loop needs a marker at the playhead and one after it')
      interaction.mode = { kind: 'new-loop', startMarkerId: start.id, endMarkerId: end.id }
    })
  },
  moveNewLoopEnd(direction: 1 | -1): void {
    const mode = interaction.mode
    if (mode.kind !== 'new-loop') return
    withSettings((settings) => {
      const start = markerById(settings, mode.startMarkerId)
      const end = markerById(settings, mode.endMarkerId)
      const next = end ? neighbourMarker(settings.markers, end.seconds, direction) : null
      if (!start || !next || next.seconds <= start.seconds) return
      interaction.mode = { ...mode, endMarkerId: next.id }
    })
  },
  confirmNewLoop(): void {
    const mode = interaction.mode
    if (mode.kind !== 'new-loop') return
    interaction.returnToNormal()
    player.run(async () => void (await backend.createLoop(mode.startMarkerId, mode.endMarkerId)))
  },
  startSelection(): void {
    withSettings((settings) => {
      const seconds = markingSeconds(settings)
      interaction.mode = { kind: 'selection', anchorSeconds: seconds, endSeconds: seconds }
    })
  },
  selectRange(anchorSeconds: number, endSeconds: number): void {
    interaction.mode = { kind: 'selection', anchorSeconds, endSeconds }
  },
  moveSelectionEnd(direction: 1 | -1, isLarge: boolean): void {
    const mode = interaction.mode
    if (mode.kind !== 'selection') return
    const duration = player.state?.song?.durationSeconds ?? 0
    const endSeconds = Math.min(Math.max(mode.endSeconds + direction * nudgeStepSeconds(isLarge), 0), duration)
    interaction.mode = { ...mode, endSeconds }
  },
  snapSelectionEnd(direction: 1 | -1): void {
    const mode = interaction.mode
    if (mode.kind !== 'selection') return
    withSettings((settings) => {
      const target = neighbourMarker(settings.markers, mode.endSeconds, direction)
      if (target) interaction.mode = { ...mode, endSeconds: target.seconds }
    })
  },
  loopSelection(): void {
    const range = selectedRange()
    if (!range) return interaction.showNotice('Select a range first: move the end with h, l, , or .')
    interaction.returnToNormal()
    player.run(async () => void (await backend.createLoopFromRange(range[0], range[1])))
  },
  deleteMarkersInSelection(): void {
    const range = selectedRange()
    if (!range) return interaction.showNotice('Select a range first: move the end with h, l, , or .')
    interaction.returnToNormal()
    player.run(async () => {
      const deleted = await backend.deleteMarkersInRange(range[0], range[1])
      interaction.showNotice(describeDeletedMarkers(deleted))
    })
  },
  cancel(): void {
    interaction.returnToNormal()
    interaction.isCheatSheetOpen = false
    interaction.isAboutOpen = false
  },
  switchLoop(direction: 1 | -1): void {
    withSettings((settings) => {
      const next = neighbourLoop(settings, direction)
      if (!next) return interaction.showNotice('No saved loops yet. Press n or drag on the waveform')
      player.run(() => backend.activateLoop(next.id))
    })
  },
  activateLoop(loopId: number | null): void {
    withSettings(() => player.run(() => backend.activateLoop(loopId)))
  },
  toggleLoop(): void {
    withSettings((settings) => {
      if (settings.activeLoopId === null) return interaction.showNotice('No active loop. Use [ ] to pick one')
      player.run(() => backend.setLoopEnabled(!settings.isLoopEnabled))
    })
  },
  renameActiveLoop(): void {
    withSettings((settings) => {
      const active = activeLoop(settings)
      if (!active) return interaction.showNotice('No active loop to rename')
      interaction.renameTarget = { kind: 'loop', id: active.id, name: active.name }
    })
  },
  deleteActiveLoop(): void {
    withSettings((settings) => {
      const active = activeLoop(settings)
      if (!active) return interaction.showNotice('No active loop to delete')
      player.run(async () => {
        await backend.deleteLoop(active.id)
        interaction.showNotice(`Deleted loop ${active.name}`)
      })
    })
  },
  rename(name: string): void {
    const target = interaction.renameTarget
    interaction.renameTarget = null
    if (!target || name.trim() === '') return
    const trimmed = name.trim()
    player.run(() =>
      target.kind === 'marker' ? backend.renameMarker(target.id, trimmed) : backend.renameLoop(target.id, trimmed),
    )
  },
  toggleTrainer(): void {
    withSettings((settings) =>
      player.run(() => backend.setTrainer({ ...settings.trainer, isEnabled: !settings.trainer.isEnabled })),
    )
  },
  cyclePreroll(): void {
    withSettings((settings) => {
      const currentIndex = PREROLL_CHOICES_SECONDS.indexOf(settings.prerollSeconds)
      const next = PREROLL_CHOICES_SECONDS[(currentIndex + 1) % PREROLL_CHOICES_SECONDS.length]
      player.run(() => backend.setPreroll(next))
    })
  },
  openCalibration(): void {
    if (player.state?.isPlaying) player.run(() => backend.setPlaying(false))
    interaction.isCalibrationOpen = true
  },
  toggleSnap(): void {
    timing.toggleSnap()
    interaction.showNotice(timing.isSnapEnabled ? 'Snapping to note attacks' : 'Snapping off')
  },
  changeTimingOffset(deltaMilliseconds: number): void {
    timing.setOffset(timing.offsetMilliseconds + deltaMilliseconds)
  },
  cycleTheme(): void {
    interaction.theme = nextTheme(interaction.theme)
    applyTheme(interaction.theme)
    interaction.showNotice(`Theme: ${interaction.theme.name}`)
  },
  toggleCheatSheet(): void {
    interaction.isAboutOpen = false
    interaction.isCheatSheetOpen = !interaction.isCheatSheetOpen
  },
  toggleAbout(): void {
    interaction.isCheatSheetOpen = false
    interaction.isAboutOpen = !interaction.isAboutOpen
  },
}
