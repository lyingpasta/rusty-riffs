type ZoomHandler = (isZoomingIn: boolean) => void

let zoomHandler: ZoomHandler | null = null

export function handleZoomRequests(handler: ZoomHandler): () => void {
  zoomHandler = handler
  return () => {
    if (zoomHandler === handler) zoomHandler = null
  }
}

export function requestZoom(isZoomingIn: boolean): void {
  zoomHandler?.(isZoomingIn)
}
