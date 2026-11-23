import { withAlpha, type Bar, type ToneRegion } from './waveformShape'

export interface PeakArea {
  top: number
  bottom: number
}

export interface ToneColors {
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

const SOFT_PLAYED_ALPHA = 0.5
const UPCOMING_FOCUS_ALPHA = 0.45
const MINIMUM_HALF_HEIGHT = 1

const PLAYHEAD_WIDTH = 2
const PLAYHEAD_GLOW_RADIUS = 6
const PLAYHEAD_GLOW_ALPHA = 0.1
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

export function barsPath(bars: Bar[], area: PeakArea): Path2D {
  const middle = (area.top + area.bottom) / 2
  const maxHalfHeight = (area.bottom - area.top) / 2
  const path = new Path2D()
  for (const bar of bars) {
    const halfHeight = Math.max(bar.loudness * maxHalfHeight, MINIMUM_HALF_HEIGHT)
    path.rect(bar.left, middle - halfHeight, bar.width, halfHeight * 2)
  }
  return path
}

function regionTone(region: ToneRegion, hasFocus: boolean, colors: ToneColors): { color: string; alpha: number } {
  if (region.isPlayed) return { color: colors.accent, alpha: hasFocus && !region.isFocused ? SOFT_PLAYED_ALPHA : 1 }
  if (region.isFocused) return { color: colors.accent, alpha: UPCOMING_FOCUS_ALPHA }
  return { color: colors.neutral, alpha: 1 }
}

export function fillBars(
  context: CanvasRenderingContext2D,
  bars: { path: Path2D; area: PeakArea; regions: ToneRegion[] },
  colors: ToneColors,
): void {
  const hasFocus = bars.regions.some((region) => region.isFocused)
  for (const region of bars.regions) {
    const tone = regionTone(region, hasFocus, colors)
    context.save()
    context.beginPath()
    context.rect(region.left, bars.area.top, region.right - region.left, bars.area.bottom - bars.area.top)
    context.clip()
    context.globalAlpha = tone.alpha
    context.fillStyle = tone.color
    context.fill(bars.path)
    context.restore()
  }
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
