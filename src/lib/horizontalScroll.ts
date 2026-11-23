export type ScrollMetrics = { scrollLeft: number; scrollWidth: number; clientWidth: number }
export type ThumbSpan = { startPercent: number; sizePercent: number }

const FULL_PERCENT = 100
const HALF = 2

function contentPerTrackPixel(metrics: ScrollMetrics): number {
  return metrics.scrollWidth / metrics.clientWidth
}

function clampScrollLeft(metrics: ScrollMetrics, scrollLeft: number): number {
  const maxScrollLeft = Math.max(0, metrics.scrollWidth - metrics.clientWidth)
  return Math.min(Math.max(scrollLeft, 0), maxScrollLeft)
}

export function thumbSpan(metrics: ScrollMetrics): ThumbSpan | null {
  if (metrics.scrollWidth <= metrics.clientWidth) return null
  return {
    startPercent: (metrics.scrollLeft / metrics.scrollWidth) * FULL_PERCENT,
    sizePercent: (metrics.clientWidth / metrics.scrollWidth) * FULL_PERCENT,
  }
}

export function scrollLeftAfterThumbDrag(metrics: ScrollMetrics, scrollLeftAtStart: number, pointerDistance: number): number {
  return clampScrollLeft(metrics, scrollLeftAtStart + pointerDistance * contentPerTrackPixel(metrics))
}

export function scrollLeftCenteredOn(metrics: ScrollMetrics, trackOffset: number): number {
  const contentOffset = trackOffset * contentPerTrackPixel(metrics)
  return clampScrollLeft(metrics, contentOffset - metrics.clientWidth / HALF)
}
