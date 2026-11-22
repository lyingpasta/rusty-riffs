export interface LoopPoints {
  startSeconds: number | null
  endSeconds: number | null
}

export function withLoopStart(points: LoopPoints, seconds: number): LoopPoints {
  const isEndBeforeStart = points.endSeconds !== null && points.endSeconds <= seconds
  return { startSeconds: seconds, endSeconds: isEndBeforeStart ? null : points.endSeconds }
}

export function withLoopEnd(points: LoopPoints, seconds: number): LoopPoints {
  const isStartAfterEnd = points.startSeconds !== null && points.startSeconds >= seconds
  return { startSeconds: isStartAfterEnd ? null : points.startSeconds, endSeconds: seconds }
}
