import { backend, type SongSettings } from './backend'
import { withLoopEnd, withLoopStart, type LoopPoints } from './loopPoints'
import { player } from './player.svelte'

const SPEED_STEP_PERCENT = 5
const NUDGE_SECONDS = 1
const PITCH_STEP_SEMITONES = 1
const PREROLL_CHOICES_SECONDS = [0, 1, 2]

function currentSettings(): SongSettings | null {
  return player.state?.song ? player.state.settings : null
}

function loopPoints(settings: SongSettings): LoopPoints {
  return { startSeconds: settings.loopStartSeconds, endSeconds: settings.loopEndSeconds }
}

function applyLoopPoints(points: LoopPoints): void {
  player.run(() => backend.setLoop(points.startSeconds, points.endSeconds))
}

export const actions = {
  togglePlaying(): void {
    const state = player.state
    if (!state?.song) return
    player.run(() => backend.setPlaying(!state.isPlaying))
  },
  changeSpeed(direction: 1 | -1): void {
    const settings = currentSettings()
    if (!settings) return
    player.run(() => backend.setSpeed(settings.speedPercent + direction * SPEED_STEP_PERCENT))
  },
  changePitch(direction: 1 | -1): void {
    const settings = currentSettings()
    if (!settings) return
    const pitch = { ...settings.pitch, semitones: settings.pitch.semitones + direction * PITCH_STEP_SEMITONES }
    player.run(() => backend.setPitch(pitch))
  },
  nudge(direction: 1 | -1): void {
    if (!currentSettings()) return
    player.run(() => backend.seekBy(direction * NUDGE_SECONDS))
  },
  setLoopStartAtPlayhead(): void {
    const settings = currentSettings()
    if (!settings) return
    applyLoopPoints(withLoopStart(loopPoints(settings), player.currentSeconds()))
  },
  setLoopEndAtPlayhead(): void {
    const settings = currentSettings()
    if (!settings) return
    applyLoopPoints(withLoopEnd(loopPoints(settings), player.currentSeconds()))
  },
  toggleLoop(): void {
    const settings = currentSettings()
    if (!settings) return
    player.run(() => backend.setLoopEnabled(!settings.isLoopEnabled))
  },
  clearLoop(): void {
    if (!currentSettings()) return
    player.run(() => backend.setLoop(null, null))
  },
  jumpToStart(): void {
    const settings = currentSettings()
    if (!settings) return
    const startSeconds = settings.isLoopEnabled ? (settings.loopStartSeconds ?? 0) : 0
    player.run(() => backend.seek(startSeconds))
  },
  jumpToMarker(position: number): void {
    const marker = currentSettings()?.markers[position - 1]
    if (!marker) return
    player.run(() => backend.seek(marker.seconds))
  },
  addMarkerAtPlayhead(): void {
    const settings = currentSettings()
    if (!settings) return
    const marker = { name: `Marker ${settings.markers.length + 1}`, seconds: player.currentSeconds() }
    player.run(() => backend.setMarkers([...settings.markers, marker]))
  },
  toggleTrainer(): void {
    const settings = currentSettings()
    if (!settings) return
    player.run(() => backend.setTrainer({ ...settings.trainer, isEnabled: !settings.trainer.isEnabled }))
  },
  cyclePreroll(): void {
    const settings = currentSettings()
    if (!settings) return
    const currentIndex = PREROLL_CHOICES_SECONDS.indexOf(settings.prerollSeconds)
    const next = PREROLL_CHOICES_SECONDS[(currentIndex + 1) % PREROLL_CHOICES_SECONDS.length]
    player.run(() => backend.setPreroll(next))
  },
}
