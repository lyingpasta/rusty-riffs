export interface WaveformView {
  startSeconds: number
  pixelsPerSecond: number
  widthPixels: number
}

const ZOOM_STEP_FACTOR = 1.25
const MAX_PIXELS_PER_SECOND = 800
const PLAYHEAD_LEAD_FRACTION = 0.05
const EASING_TIME_CONSTANT_MILLISECONDS = 60
const SETTLED_DISTANCE_PIXELS = 0.5

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
  return { ...view, startSeconds: playheadSeconds - visibleSeconds(view) * PLAYHEAD_LEAD_FRACTION }
}

export function easeTowards(view: WaveformView, targetStartSeconds: number, elapsedMilliseconds: number): WaveformView {
  const remainingSeconds = targetStartSeconds - view.startSeconds
  if (Math.abs(remainingSeconds * view.pixelsPerSecond) < SETTLED_DISTANCE_PIXELS) {
    return { ...view, startSeconds: targetStartSeconds }
  }
  const progress = 1 - Math.exp(-elapsedMilliseconds / EASING_TIME_CONSTANT_MILLISECONDS)
  return { ...view, startSeconds: view.startSeconds + remainingSeconds * progress }
}
