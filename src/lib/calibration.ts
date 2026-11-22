export const CLICK_COUNT = 12
export const WARM_UP_CLICKS = 2
const SHORTEST_GAP_SECONDS = 0.8
const LONGEST_GAP_SECONDS = 2
const LAST_CLICK_TAIL_SECONDS = 0.8
const LEAD_IN_SECONDS = 0.8
const WARM_UP_CLICK_HERTZ = 880
const COUNTED_CLICK_HERTZ = 1320
const LAST_CLICK_HERTZ = 1760
const CLICK_DURATION_SECONDS = 0.03
const LATEST_REACTION_SECONDS = 0.6
const MINIMUM_ANSWERED_CLICKS = 6
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
  const clickTimes = randomClickTimes(audio.currentTime + LEAD_IN_SECONDS)
  clickTimes.forEach((time, index) => scheduleClick(audio, time, clickFrequency(index)))
  const endTime = clickTimes[clickTimes.length - 1] + LAST_CLICK_TAIL_SECONDS
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
  countedClickCount: number
  answeredClickCount: number
  offsetMilliseconds: number | null
}

export function measureOffset(clickTimes: number[], taps: number[]): CalibrationResult {
  const countedClicks = clickTimes.slice(WARM_UP_CLICKS)
  const reactions = countedClicks.flatMap((click) => {
    const firstPressAfter = taps.find((tap) => tap >= click && tap - click <= LATEST_REACTION_SECONDS)
    return firstPressAfter === undefined ? [] : [firstPressAfter - click]
  })
  const hasEnoughReactions = reactions.length >= MINIMUM_ANSWERED_CLICKS
  return {
    countedClickCount: countedClicks.length,
    answeredClickCount: reactions.length,
    offsetMilliseconds: hasEnoughReactions ? median(reactions) * MILLISECONDS_PER_SECOND : null,
  }
}

function randomClickTimes(firstClickTime: number): number[] {
  const times = [firstClickTime]
  while (times.length < CLICK_COUNT) {
    const gap = SHORTEST_GAP_SECONDS + Math.random() * (LONGEST_GAP_SECONDS - SHORTEST_GAP_SECONDS)
    times.push(times[times.length - 1] + gap)
  }
  return times
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

function clickFrequency(index: number): number {
  if (index < WARM_UP_CLICKS) return WARM_UP_CLICK_HERTZ
  if (index === CLICK_COUNT - 1) return LAST_CLICK_HERTZ
  return COUNTED_CLICK_HERTZ
}

function scheduleClick(audio: AudioContext, time: number, frequency: number): void {
  const oscillator = audio.createOscillator()
  const envelope = audio.createGain()
  oscillator.frequency.value = frequency
  envelope.gain.setValueAtTime(0.0001, time)
  envelope.gain.exponentialRampToValueAtTime(0.6, time + 0.002)
  envelope.gain.exponentialRampToValueAtTime(0.0001, time + CLICK_DURATION_SECONDS)
  oscillator.connect(envelope).connect(audio.destination)
  oscillator.start(time)
  oscillator.stop(time + CLICK_DURATION_SECONDS)
}
