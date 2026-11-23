import { withAlpha, type EnvelopeRegion } from './waveformShape'

export interface PeakArea {
  top: number
  bottom: number
}

export interface EnvelopeColors {
  neutral: string
  accent: string
}

export interface MarkerFlag {
  x: number
  name: string
}

export interface FlagColors {
  background: string
  stripe: string
  text: string
}

const CENTRE_FADE_ALPHA = 0.3
const SOFT_PLAYED_ALPHA = 0.5
const UPCOMING_FOCUS_ALPHA = 0.45
const MINIMUM_HALF_HEIGHT = 0.5
const CENTRE_LINE_ALPHA = 0.2

const PLAYHEAD_WIDTH = 2
const PLAYHEAD_GLOW_RADIUS = 14
const PLAYHEAD_GLOW_ALPHA = 0.22
const PLAYHEAD_CAP_HALF_WIDTH = 6
const PLAYHEAD_CAP_HEIGHT = 7

const FLAG_TOP = 3
const FLAG_HEIGHT = 17
const FLAG_STRIPE_WIDTH = 2
const FLAG_TEXT_INSET = 7
const FLAG_END_PADDING = 6
const FLAG_RADIUS = 4
const FLAG_TEXT_ALPHA = 0.85
const MARKER_LINE_ALPHA = 0.3
const MARKER_LINE_DASH = [2, 3]

export function envelopePath(heights: number[], area: PeakArea): Path2D {
  const middle = (area.top + area.bottom) / 2
  const maxHalfHeight = (area.bottom - area.top) / 2
  const halfHeight = (loudness: number) => Math.max(loudness * maxHalfHeight, MINIMUM_HALF_HEIGHT)
  const path = new Path2D()
  path.moveTo(0, middle)
  heights.forEach((loudness, x) => path.lineTo(x + 0.5, middle - halfHeight(loudness)))
  path.lineTo(heights.length, middle)
  for (let x = heights.length - 1; x >= 0; x--) path.lineTo(x + 0.5, middle + halfHeight(heights[x]))
  path.closePath()
  return path
}

function regionTone(region: EnvelopeRegion, hasFocus: boolean, colors: EnvelopeColors): { color: string; alpha: number } {
  if (region.isPlayed) return { color: colors.accent, alpha: hasFocus && !region.isFocused ? SOFT_PLAYED_ALPHA : 1 }
  if (region.isFocused) return { color: colors.accent, alpha: UPCOMING_FOCUS_ALPHA }
  return { color: colors.neutral, alpha: 1 }
}

function edgeToCentreGradient(context: CanvasRenderingContext2D, area: PeakArea, color: string): CanvasGradient {
  const gradient = context.createLinearGradient(0, area.top, 0, area.bottom)
  gradient.addColorStop(0, color)
  gradient.addColorStop(0.5, withAlpha(color, CENTRE_FADE_ALPHA))
  gradient.addColorStop(1, color)
  return gradient
}

export function fillEnvelope(
  context: CanvasRenderingContext2D,
  envelope: { path: Path2D; area: PeakArea; regions: EnvelopeRegion[] },
  colors: EnvelopeColors,
): void {
  const hasFocus = envelope.regions.some((region) => region.isFocused)
  for (const region of envelope.regions) {
    const tone = regionTone(region, hasFocus, colors)
    context.save()
    context.beginPath()
    context.rect(region.left, envelope.area.top, region.right - region.left, envelope.area.bottom - envelope.area.top)
    context.clip()
    context.globalAlpha = tone.alpha
    context.fillStyle = edgeToCentreGradient(context, envelope.area, tone.color)
    context.fill(envelope.path)
    context.restore()
  }
}

export function drawCentreLine(context: CanvasRenderingContext2D, area: PeakArea, width: number, color: string): void {
  const y = Math.round((area.top + area.bottom) / 2) + 0.5
  context.strokeStyle = color
  context.globalAlpha = CENTRE_LINE_ALPHA
  context.beginPath()
  context.moveTo(0, y)
  context.lineTo(width, y)
  context.stroke()
  context.globalAlpha = 1
}

export function drawPlayhead(context: CanvasRenderingContext2D, x: number, height: number, accent: string): void {
  const glow = context.createLinearGradient(x - PLAYHEAD_GLOW_RADIUS, 0, x + PLAYHEAD_GLOW_RADIUS, 0)
  glow.addColorStop(0, withAlpha(accent, 0))
  glow.addColorStop(0.5, withAlpha(accent, PLAYHEAD_GLOW_ALPHA))
  glow.addColorStop(1, withAlpha(accent, 0))
  context.fillStyle = glow
  context.fillRect(x - PLAYHEAD_GLOW_RADIUS, 0, PLAYHEAD_GLOW_RADIUS * 2, height)
  context.fillStyle = accent
  context.fillRect(x - PLAYHEAD_WIDTH / 2, 0, PLAYHEAD_WIDTH, height)
  context.beginPath()
  context.moveTo(x - PLAYHEAD_CAP_HALF_WIDTH, 0)
  context.lineTo(x + PLAYHEAD_CAP_HALF_WIDTH, 0)
  context.lineTo(x, PLAYHEAD_CAP_HEIGHT)
  context.fill()
}

function drawMarkerLine(context: CanvasRenderingContext2D, x: number, height: number, color: string): void {
  context.strokeStyle = color
  context.globalAlpha = MARKER_LINE_ALPHA
  context.setLineDash(MARKER_LINE_DASH)
  context.beginPath()
  context.moveTo(x, FLAG_TOP + FLAG_HEIGHT)
  context.lineTo(x, height)
  context.stroke()
  context.setLineDash([])
  context.globalAlpha = 1
}

export function drawMarkerFlag(
  context: CanvasRenderingContext2D,
  flag: MarkerFlag,
  layout: { height: number; colors: FlagColors },
): number {
  const { colors } = layout
  drawMarkerLine(context, flag.x, layout.height, colors.stripe)
  const width = FLAG_TEXT_INSET + context.measureText(flag.name).width + FLAG_END_PADDING
  const left = flag.x - FLAG_STRIPE_WIDTH / 2
  context.fillStyle = colors.background
  context.beginPath()
  context.roundRect(left, FLAG_TOP, width, FLAG_HEIGHT, [0, FLAG_RADIUS, FLAG_RADIUS, 0])
  context.fill()
  context.fillStyle = colors.stripe
  context.fillRect(left, FLAG_TOP, FLAG_STRIPE_WIDTH, FLAG_HEIGHT)
  context.fillStyle = colors.text
  context.globalAlpha = FLAG_TEXT_ALPHA
  context.textBaseline = 'middle'
  context.fillText(flag.name, flag.x + FLAG_TEXT_INSET, FLAG_TOP + FLAG_HEIGHT / 2)
  context.globalAlpha = 1
  return left + width
}
