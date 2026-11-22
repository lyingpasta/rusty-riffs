import { invoke } from '@tauri-apps/api/core'
import { listen, type UnlistenFn } from '@tauri-apps/api/event'

export interface Pitch {
  semitones: number
  cents: number
}

export interface Trainer {
  isEnabled: boolean
  stepPercent: number
  targetPercent: number
}

export interface Marker {
  id: number
  name: string
  seconds: number
}

export interface SavedLoop {
  id: number
  name: string
  startMarkerId: number
  endMarkerId: number
  speedPercent: number
}

export interface SongSettings {
  songSpeedPercent: number
  pitch: Pitch
  isLoopEnabled: boolean
  prerollSeconds: number
  trainer: Trainer
  markers: Marker[]
  loops: SavedLoop[]
  activeLoopId: number | null
}

export interface SongInfo {
  id: string
  name: string
  durationSeconds: number
}

export interface PlayerState {
  song: SongInfo | null
  isPlaying: boolean
  settings: SongSettings
}

export interface DeletedMarkers {
  markerCount: number
  removedLoopNames: string[]
}

export interface Waveform {
  peaks: number[]
  peaksPerSecond: number
}

interface Playhead {
  seconds: number
}

export const backend = {
  openSong: (path: string) => invoke<Waveform>('open_song', { path }),
  openLastSong: () => invoke<Waveform | null>('open_last_song'),
  getState: () => invoke<PlayerState>('get_state'),
  setPlaying: (isPlaying: boolean) => invoke<void>('set_playing', { isPlaying }),
  seek: (seconds: number) => invoke<void>('seek', { seconds }),
  seekBy: (deltaSeconds: number) => invoke<void>('seek_by', { deltaSeconds }),
  setSpeed: (percent: number) => invoke<void>('set_speed', { percent }),
  setPitch: (pitch: Pitch) => invoke<void>('set_pitch', { pitch }),
  setPreroll: (seconds: number) => invoke<void>('set_preroll', { seconds }),
  setTrainer: (trainer: Trainer) => invoke<void>('set_trainer', { trainer }),
  setLoopEnabled: (isEnabled: boolean) => invoke<void>('set_loop_enabled', { isEnabled }),
  addMarker: (seconds: number) => invoke<number>('add_marker', { seconds }),
  renameMarker: (markerId: number, name: string) => invoke<void>('rename_marker', { markerId, name }),
  deleteMarker: (markerId: number) => invoke<string[]>('delete_marker', { markerId }),
  deleteMarkersInRange: (startSeconds: number, endSeconds: number) =>
    invoke<DeletedMarkers>('delete_markers_in_range', { startSeconds, endSeconds }),
  createLoop: (startMarkerId: number, endMarkerId: number) =>
    invoke<number>('create_loop', { startMarkerId, endMarkerId }),
  createLoopFromRange: (startSeconds: number, endSeconds: number) =>
    invoke<number>('create_loop_from_range', { startSeconds, endSeconds }),
  renameLoop: (loopId: number, name: string) => invoke<void>('rename_loop', { loopId, name }),
  deleteLoop: (loopId: number) => invoke<void>('delete_loop', { loopId }),
  activateLoop: (loopId: number | null) => invoke<void>('activate_loop', { loopId }),
}

export function onPlayerState(handler: (state: PlayerState) => void): Promise<UnlistenFn> {
  return listen<PlayerState>('player-state', (event) => handler(event.payload))
}

export function onPlayhead(handler: (seconds: number) => void): Promise<UnlistenFn> {
  return listen<Playhead>('playhead', (event) => handler(event.payload.seconds))
}
