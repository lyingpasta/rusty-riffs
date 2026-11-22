const CLICK_COUNT = 16
const WARM_UP_CLICKS = 4
const CLICK_INTERVAL_SECONDS = 0.6
const LEAD_IN_SECONDS = 0.8
const CLICK_FREQUENCY_HERTZ = 1500
const CLICK_DURATION_SECONDS = 0.03
const MATCH_WINDOW_SECONDS = 0.3
const MINIMUM_MATCHED_TAPS = 6
const MILLISECONDS_PER_SECOND = 1000

export interface CalibrationSession {
  clickTimes: number[]
  taps: number[]
  endTime: number
  tap: () => void
  heardTime: () => number
  stop: () => void
}

export function startCalibration(): CalibrationSession {
  const audio = new AudioContext()
  const firstClickTime = audio.currentTime + LEAD_IN_SECONDS
  const clickTimes = Array.from({ length: CLICK_COUNT }, (_, index) => firstClickTime + index * CLICK_INTERVAL_SECONDS)
  clickTimes.forEach((time) => scheduleClick(audio, time))
  const taps: number[] = []
  const heardTime = () => heardAudioTime(audio)
  return {
    clickTimes,
    taps,
    endTime: clickTimes[clickTimes.length - 1] + CLICK_INTERVAL_SECONDS,
    tap: () => void taps.push(heardTime()),
    heardTime,
    stop: () => void audio.close(),
  }
}

export function measuredOffsetMilliseconds(clickTimes: number[], taps: number[]): number | null {
  const countedClicks = clickTimes.slice(WARM_UP_CLICKS)
  const offsets = taps.flatMap((tap) => {
    const nearest = countedClicks.reduce((best, click) => (Math.abs(click - tap) < Math.abs(best - tap) ? click : best))
    const offset = tap - nearest
    return Math.abs(offset) <= MATCH_WINDOW_SECONDS ? [offset] : []
  })
  if (offsets.length < MINIMUM_MATCHED_TAPS) return null
  return median(offsets) * MILLISECONDS_PER_SECOND
}

function median(values: number[]): number {
  const sorted = [...values].sort((left, right) => left - right)
  const middle = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0 ? (sorted[middle - 1] + sorted[middle]) / 2 : sorted[middle]
}

function heardAudioTime(audio: AudioContext): number {
  if (typeof audio.getOutputTimestamp === 'function') {
    const stamp = audio.getOutputTimestamp()
    if (stamp.contextTime !== undefined && stamp.performanceTime !== undefined) {
      return stamp.contextTime + (performance.now() - stamp.performanceTime) / MILLISECONDS_PER_SECOND
    }
  }
  return audio.currentTime - (audio.outputLatency ?? 0) - audio.baseLatency
}

function scheduleClick(audio: AudioContext, time: number): void {
  const oscillator = audio.createOscillator()
  const envelope = audio.createGain()
  oscillator.frequency.value = CLICK_FREQUENCY_HERTZ
  envelope.gain.setValueAtTime(0.0001, time)
  envelope.gain.exponentialRampToValueAtTime(0.6, time + 0.002)
  envelope.gain.exponentialRampToValueAtTime(0.0001, time + CLICK_DURATION_SECONDS)
  oscillator.connect(envelope).connect(audio.destination)
  oscillator.start(time)
  oscillator.stop(time + CLICK_DURATION_SECONDS)
}
