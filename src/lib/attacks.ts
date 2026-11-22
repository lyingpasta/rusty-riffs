import type { Waveform } from './backend'

const SNAP_WINDOW_SECONDS = 0.08
const MINIMUM_RISE = 0.04

export function nearestAttackSeconds(waveform: Waveform, aroundSeconds: number): number | null {
  const { peaks, peaksPerSecond } = waveform
  const center = Math.round(aroundSeconds * peaksPerSecond)
  const reach = Math.round(SNAP_WINDOW_SECONDS * peaksPerSecond)
  let bestIndex: number | null = null
  let bestRise = MINIMUM_RISE
  for (let index = Math.max(center - reach, 1); index <= Math.min(center + reach, peaks.length - 1); index++) {
    const rise = peaks[index] - peaks[index - 1]
    if (rise > bestRise) {
      bestRise = rise
      bestIndex = index
    }
  }
  return bestIndex === null ? null : (bestIndex - 1) / peaksPerSecond
}
