type ZoomHandler = (isZoomingIn: boolean) => void
type VisibleSecondsProvider = () => number

let zoomHandler: ZoomHandler | null = null
let visibleSecondsProvider: VisibleSecondsProvider | null = null

export function handleZoomRequests(handler: ZoomHandler): () => void {
  zoomHandler = handler
  return () => {
    if (zoomHandler === handler) zoomHandler = null
  }
}

export function requestZoom(isZoomingIn: boolean): void {
  zoomHandler?.(isZoomingIn)
}

export function provideVisibleSeconds(provider: VisibleSecondsProvider): () => void {
  visibleSecondsProvider = provider
  return () => {
    if (visibleSecondsProvider === provider) visibleSecondsProvider = null
  }
}

export function visibleSecondsOnScreen(): number | null {
  return visibleSecondsProvider?.() ?? null
}
