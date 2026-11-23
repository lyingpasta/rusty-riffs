import { xToSeconds, type WaveformView } from './waveformView.ts'

export interface PeakData {
  peaks: number[]
  peaksPerSecond: number
}

export interface EnvelopeRegion {
  left: number
  right: number
  isPlayed: boolean
  isFocused: boolean
}

const SMOOTHING_WEIGHTS = [1, 2, 1]
const HEX_COLOR = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i

function loudestPeak(peaks: number[], from: number, to: number): number {
  let loudest = 0
  for (let index = Math.max(from, 0); index < Math.min(to, peaks.length); index++) {
    loudest = Math.max(loudest, peaks[index])
  }
  return loudest
}

export function columnLoudness(waveform: PeakData, view: WaveformView): number[] {
  const loudness: number[] = []
  for (let x = 0; x < view.widthPixels; x++) {
    const firstPeak = Math.floor(xToSeconds(view, x) * waveform.peaksPerSecond)
    const lastPeak = Math.max(Math.floor(xToSeconds(view, x + 1) * waveform.peaksPerSecond), firstPeak + 1)
    loudness.push(loudestPeak(waveform.peaks, firstPeak, lastPeak))
  }
  return loudness
}

export function smooth(values: number[]): number[] {
  const totalWeight = SMOOTHING_WEIGHTS.reduce((sum, weight) => sum + weight, 0)
  return values.map((value, index) => {
    const previous = values[index - 1] ?? value
    const next = values[index + 1] ?? value
    return (previous * SMOOTHING_WEIGHTS[0] + value * SMOOTHING_WEIGHTS[1] + next * SMOOTHING_WEIGHTS[2]) / totalWeight
  })
}

export function envelopeRegions(widthPixels: number, playheadX: number, focus: [number, number] | null): EnvelopeRegion[] {
  const cuts = [0, widthPixels, playheadX, ...(focus ?? [])].map((x) => Math.min(Math.max(x, 0), widthPixels))
  const edges = [...new Set(cuts)].sort((left, right) => left - right)
  return edges.slice(1).map((right, index) => {
    const left = edges[index]
    const centre = (left + right) / 2
    const isFocused = focus !== null && centre >= focus[0] && centre <= focus[1]
    return { left, right, isPlayed: centre < playheadX, isFocused }
  })
}

export function withAlpha(hexColor: string, alpha: number): string {
  const match = HEX_COLOR.exec(hexColor.trim())
  if (!match) throw new Error(`Expected a #rrggbb colour, got "${hexColor}"`)
  const [red, green, blue] = match.slice(1).map((channel) => parseInt(channel, 16))
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`
}
