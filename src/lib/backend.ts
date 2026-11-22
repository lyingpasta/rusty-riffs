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
  name: string
  seconds: number
}

export interface SongSettings {
  speedPercent: number
  pitch: Pitch
  loopStartSeconds: number | null
  loopEndSeconds: number | null
  isLoopEnabled: boolean
  prerollSeconds: number
  trainer: Trainer
  markers: Marker[]
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

export interface Waveform {
  peaks: number[]
  peaksPerSecond: number
}

interface Playhead {
  seconds: number
}

export const backend = {
  openSong: (path: string) => invoke<Waveform>('open_song', { path }),
  getState: () => invoke<PlayerState>('get_state'),
  setPlaying: (isPlaying: boolean) => invoke<void>('set_playing', { isPlaying }),
  seek: (seconds: number) => invoke<void>('seek', { seconds }),
  seekBy: (deltaSeconds: number) => invoke<void>('seek_by', { deltaSeconds }),
  setSpeed: (percent: number) => invoke<void>('set_speed', { percent }),
  setPitch: (pitch: Pitch) => invoke<void>('set_pitch', { pitch }),
  setLoop: (startSeconds: number | null, endSeconds: number | null) =>
    invoke<void>('set_loop', { startSeconds, endSeconds }),
  setLoopEnabled: (isEnabled: boolean) => invoke<void>('set_loop_enabled', { isEnabled }),
  setPreroll: (seconds: number) => invoke<void>('set_preroll', { seconds }),
  setTrainer: (trainer: Trainer) => invoke<void>('set_trainer', { trainer }),
  setMarkers: (markers: Marker[]) => invoke<void>('set_markers', { markers }),
}

export function onPlayerState(handler: (state: PlayerState) => void): Promise<UnlistenFn> {
  return listen<PlayerState>('player-state', (event) => handler(event.payload))
}

export function onPlayhead(handler: (seconds: number) => void): Promise<UnlistenFn> {
  return listen<Playhead>('playhead', (event) => handler(event.payload.seconds))
}
