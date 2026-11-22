import type { Marker, SavedLoop, SongSettings } from './backend'

const MARKER_TIME_TOLERANCE_SECONDS = 0.05

export interface LoopSpan {
  loop: SavedLoop
  startSeconds: number
  endSeconds: number
}

export interface LanedLoopSpan extends LoopSpan {
  lane: number
}

export function currentSpeed(settings: SongSettings): number {
  return activeLoop(settings)?.speedPercent ?? settings.songSpeedPercent
}

export function activeLoop(settings: SongSettings): SavedLoop | null {
  return settings.loops.find((saved) => saved.id === settings.activeLoopId) ?? null
}

export function markerById(settings: SongSettings, markerId: number): Marker | null {
  return settings.markers.find((marker) => marker.id === markerId) ?? null
}

export function markerAtOrBefore(markers: Marker[], seconds: number): Marker | null {
  const passed = markers.filter((marker) => marker.seconds <= seconds + MARKER_TIME_TOLERANCE_SECONDS)
  return passed.at(-1) ?? null
}

export function neighbourMarker(markers: Marker[], seconds: number, direction: 1 | -1): Marker | null {
  if (direction === 1) {
    return markers.find((marker) => marker.seconds > seconds + MARKER_TIME_TOLERANCE_SECONDS) ?? null
  }
  const earlier = markers.filter((marker) => marker.seconds < seconds - MARKER_TIME_TOLERANCE_SECONDS)
  return earlier.at(-1) ?? null
}

export function loopSpans(settings: SongSettings): LoopSpan[] {
  return settings.loops.flatMap((loop) => {
    const start = markerById(settings, loop.startMarkerId)
    const end = markerById(settings, loop.endMarkerId)
    if (!start || !end) return []
    return [{ loop, startSeconds: start.seconds, endSeconds: end.seconds }]
  })
}

export function assignLanes(spans: LoopSpan[]): LanedLoopSpan[] {
  const laneEnds: number[] = []
  const sorted = [...spans].sort((left, right) => left.startSeconds - right.startSeconds)
  return sorted.map((span) => {
    const freeLane = laneEnds.findIndex((laneEnd) => laneEnd <= span.startSeconds)
    const lane = freeLane === -1 ? laneEnds.length : freeLane
    laneEnds[lane] = span.endSeconds
    return { ...span, lane }
  })
}

export function neighbourLoop(settings: SongSettings, direction: 1 | -1): SavedLoop | null {
  const ordered = loopSpans(settings)
    .sort((left, right) => left.startSeconds - right.startSeconds)
    .map((span) => span.loop)
  if (ordered.length === 0) return null
  const activeIndex = ordered.findIndex((loop) => loop.id === settings.activeLoopId)
  if (activeIndex === -1) return direction === 1 ? ordered[0] : ordered[ordered.length - 1]
  return ordered[(activeIndex + direction + ordered.length) % ordered.length]
}
