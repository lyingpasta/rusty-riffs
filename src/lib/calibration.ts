const CLICK_COUNT = 16
const WARM_UP_CLICKS = 4
const CLICK_INTERVAL_SECONDS = 0.6
const LEAD_IN_SECONDS = 0.8
const CLICK_FREQUENCY_HERTZ = 1500
const CLICK_DURATION_SECONDS = 0.03
const MATCH_WINDOW_SECONDS = 0.3
const MINIMUM_MATCHED_TAPS = 6
const MILLISECONDS_PER_SECOND = 1000
const MAX_TIMESTAMP_DISAGREEMENT_SECONDS = 0.5

export interface CalibrationSession {
  clickTimes: number[]
  taps: number[]
  tap: () => void
  clicksPlayed: () => number
  isFinished: () => boolean
  stop: () => void
}

export function startCalibration(): CalibrationSession {
  const audio = new AudioContext()
  const firstClickTime = audio.currentTime + LEAD_IN_SECONDS
  const clickTimes = Array.from({ length: CLICK_COUNT }, (_, index) => firstClickTime + index * CLICK_INTERVAL_SECONDS)
  clickTimes.forEach((time) => scheduleClick(audio, time))
  const endTime = clickTimes[clickTimes.length - 1] + CLICK_INTERVAL_SECONDS
  keepOutputRunning(audio, endTime)
  const taps: number[] = []
  return {
    clickTimes,
    taps,
    tap: () => void taps.push(heardAudioTime(audio)),
    clicksPlayed: () => clickTimes.filter((time) => time <= audio.currentTime).length,
    isFinished: () => audio.currentTime >= endTime,
    stop: () => void audio.close(),
  }
}

export interface CalibrationResult {
  tapCount: number
  matchedTapCount: number
  offsetMilliseconds: number | null
}

export function measureOffset(clickTimes: number[], taps: number[]): CalibrationResult {
  const countedClicks = clickTimes.slice(WARM_UP_CLICKS)
  const offsets = taps.flatMap((tap) => {
    const nearest = countedClicks.reduce((best, click) => (Math.abs(click - tap) < Math.abs(best - tap) ? click : best))
    const offset = tap - nearest
    return Math.abs(offset) <= MATCH_WINDOW_SECONDS ? [offset] : []
  })
  const hasEnoughTaps = offsets.length >= MINIMUM_MATCHED_TAPS
  return {
    tapCount: taps.length,
    matchedTapCount: offsets.length,
    offsetMilliseconds: hasEnoughTaps ? median(offsets) * MILLISECONDS_PER_SECOND : null,
  }
}

function median(values: number[]): number {
  const sorted = [...values].sort((left, right) => left - right)
  const middle = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0 ? (sorted[middle - 1] + sorted[middle]) / 2 : sorted[middle]
}

function heardAudioTime(audio: AudioContext): number {
  const fallback = audio.currentTime - (audio.outputLatency ?? 0) - (audio.baseLatency ?? 0)
  const stamped = timeFromOutputTimestamp(audio)
  if (stamped === null || Math.abs(stamped - fallback) > MAX_TIMESTAMP_DISAGREEMENT_SECONDS) return fallback
  return stamped
}

function timeFromOutputTimestamp(audio: AudioContext): number | null {
  if (typeof audio.getOutputTimestamp !== 'function') return null
  const stamp = audio.getOutputTimestamp()
  if (!stamp.contextTime || !stamp.performanceTime) return null
  return stamp.contextTime + (performance.now() - stamp.performanceTime) / MILLISECONDS_PER_SECOND
}

function keepOutputRunning(audio: AudioContext, until: number): void {
  const silence = audio.createConstantSource()
  silence.offset.value = 0
  silence.connect(audio.destination)
  silence.start()
  silence.stop(until + LEAD_IN_SECONDS)
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
