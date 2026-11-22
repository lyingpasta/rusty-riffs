export interface WaveformView {
  startSeconds: number
  pixelsPerSecond: number
  widthPixels: number
}

const ZOOM_STEP_FACTOR = 1.25
const MAX_PIXELS_PER_SECOND = 800

export function secondsToX(view: WaveformView, seconds: number): number {
  return (seconds - view.startSeconds) * view.pixelsPerSecond
}

export function xToSeconds(view: WaveformView, x: number): number {
  return view.startSeconds + x / view.pixelsPerSecond
}

export function visibleSeconds(view: WaveformView): number {
  return view.widthPixels / view.pixelsPerSecond
}

export function fitPixelsPerSecond(widthPixels: number, durationSeconds: number): number {
  return widthPixels / Math.max(durationSeconds, Number.EPSILON)
}

export function clampView(view: WaveformView, durationSeconds: number): WaveformView {
  const minimumPixelsPerSecond = fitPixelsPerSecond(view.widthPixels, durationSeconds)
  const pixelsPerSecond = Math.min(Math.max(view.pixelsPerSecond, minimumPixelsPerSecond), MAX_PIXELS_PER_SECOND)
  const latestStart = Math.max(durationSeconds - view.widthPixels / pixelsPerSecond, 0)
  const startSeconds = Math.min(Math.max(view.startSeconds, 0), latestStart)
  return { ...view, pixelsPerSecond, startSeconds }
}

export function zoomAround(view: WaveformView, anchorX: number, isZoomingIn: boolean): WaveformView {
  const anchorSeconds = xToSeconds(view, anchorX)
  const factor = isZoomingIn ? ZOOM_STEP_FACTOR : 1 / ZOOM_STEP_FACTOR
  const pixelsPerSecond = view.pixelsPerSecond * factor
  return { ...view, pixelsPerSecond, startSeconds: anchorSeconds - anchorX / pixelsPerSecond }
}

export function followPlayhead(view: WaveformView, playheadSeconds: number): WaveformView {
  const isVisible = playheadSeconds >= view.startSeconds && playheadSeconds < view.startSeconds + visibleSeconds(view)
  if (isVisible) return view
  return { ...view, startSeconds: playheadSeconds }
}
