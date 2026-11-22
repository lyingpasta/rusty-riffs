import { backend, type SongSettings } from './backend'
import { interaction } from './interaction.svelte'
import { player } from './player.svelte'
import { applyTheme, nextTheme } from './theme'
import { activeLoop, currentSpeed, markerAtOrBefore, markerById, neighbourLoop, neighbourMarker } from './songModel'

const SPEED_STEP_PERCENT = 5
const PITCH_STEP_SEMITONES = 1
const CENTS_STEP = 5
const SMALL_NUDGE_SECONDS = 1
const LARGE_NUDGE_SECONDS = 5
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

function seek(seconds: number): void {
  player.run(() => backend.seek(seconds))
}

export const actions = {
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
    const seconds = isLarge ? LARGE_NUDGE_SECONDS : SMALL_NUDGE_SECONDS
    withSettings(() => player.run(() => backend.seekBy(direction * seconds)))
  },
  jumpToStart(): void {
    withSettings((settings) => {
      const active = activeLoop(settings)
      const startMarker = active ? markerById(settings, active.startMarkerId) : null
      seek(startMarker?.seconds ?? 0)
    })
  },
  addMarker(): void {
    withSettings(() => player.run(async () => void (await backend.addMarker(player.currentSeconds()))))
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
      const marker = markerAtOrBefore(settings.markers, player.currentSeconds())
      if (!marker) return interaction.showNotice('No marker at or before the playhead')
      interaction.renameTarget = { kind: 'marker', id: marker.id, name: marker.name }
    })
  },
  deleteMarkerAtPlayhead(): void {
    withSettings((settings) => {
      const marker = markerAtOrBefore(settings.markers, player.currentSeconds())
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
      const start = markerAtOrBefore(settings.markers, player.currentSeconds())
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
  cancel(): void {
    interaction.returnToNormal()
    interaction.isCheatSheetOpen = false
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
  cycleTheme(): void {
    interaction.theme = nextTheme(interaction.theme)
    applyTheme(interaction.theme)
    interaction.showNotice(`Theme: ${interaction.theme.name}`)
  },
  toggleCheatSheet(): void {
    interaction.isCheatSheetOpen = !interaction.isCheatSheetOpen
  },
}
