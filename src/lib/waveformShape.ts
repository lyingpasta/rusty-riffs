import { secondsToX, xToSeconds, type WaveformView } from './waveformView.ts'

export interface PeakData {
  peaks: number[]
  peaksPerSecond: number
}

export interface Bar {
  left: number
  width: number
  loudness: number
}

export interface ToneRegion {
  left: number
  right: number
  isPlayed: boolean
  isFocused: boolean
}

const MINIMUM_SLOT_PIXELS = 4
const GAP_FRACTION = 0.25
const HEX_COLOR = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i

function loudestPeak(peaks: number[], from: number, to: number): number {
  let loudest = 0
  for (let index = Math.max(from, 0); index < Math.min(to, peaks.length); index++) {
    loudest = Math.max(loudest, peaks[index])
  }
  return loudest
}

export function waveformBars(waveform: PeakData, view: WaveformView): Bar[] {
  const peaksPerSlot = Math.max(Math.ceil((MINIMUM_SLOT_PIXELS * waveform.peaksPerSecond) / view.pixelsPerSecond), 1)
  const slotSeconds = peaksPerSlot / waveform.peaksPerSecond
  const slotPixels = slotSeconds * view.pixelsPerSecond
  const width = slotPixels * (1 - GAP_FRACTION)
  const firstSlot = Math.max(Math.floor(view.startSeconds / slotSeconds), 0)
  const lastSlot = Math.ceil(xToSeconds(view, view.widthPixels) / slotSeconds)
  const bars: Bar[] = []
  for (let slot = firstSlot; slot < lastSlot; slot++) {
    const firstPeak = slot * peaksPerSlot
    if (firstPeak >= waveform.peaks.length) break
    const loudness = loudestPeak(waveform.peaks, firstPeak, firstPeak + peaksPerSlot)
    bars.push({ left: secondsToX(view, slot * slotSeconds), width, loudness })
  }
  return bars
}

export function toneRegions(widthPixels: number, playheadX: number, focus: [number, number] | null): ToneRegion[] {
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
