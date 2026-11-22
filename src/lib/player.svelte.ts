import { backend, onPlayerState, onPlayhead, type PlayerState, type Waveform } from './backend'
import { currentSpeed } from './songModel'

const MAX_EXTRAPOLATION_SECONDS = 0.1
const MILLISECONDS_PER_SECOND = 1000
const NORMAL_SPEED_PERCENT = 100

class Player {
  state = $state<PlayerState | null>(null)
  waveform = $state<Waveform | null>(null)
  error = $state<string | null>(null)
  isLoading = $state(false)
  private reportedSeconds = 0
  private reportedAt = 0

  async connect(): Promise<void> {
    await onPlayerState((state) => (this.state = state))
    await onPlayhead((seconds) => {
      this.reportedSeconds = seconds
      this.reportedAt = performance.now()
    })
    this.state = await backend.getState()
  }

  async open(path: string): Promise<void> {
    this.isLoading = true
    this.error = null
    try {
      this.waveform = await backend.openSong(path)
    } catch (error) {
      this.error = String(error)
    } finally {
      this.isLoading = false
    }
  }

  currentSeconds(): number {
    if (!this.state?.isPlaying) return this.reportedSeconds
    const elapsedSeconds = (performance.now() - this.reportedAt) / MILLISECONDS_PER_SECOND
    const speedRatio = currentSpeed(this.state.settings) / NORMAL_SPEED_PERCENT
    return this.reportedSeconds + Math.min(elapsedSeconds * speedRatio, MAX_EXTRAPOLATION_SECONDS)
  }

  run(action: () => Promise<void>): void {
    action().catch((error) => (this.error = String(error)))
  }
}

export const player = new Player()
