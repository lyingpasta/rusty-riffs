<script lang="ts">
  import { onMount } from 'svelte'
  import { backend } from './backend'
  import { player } from './player.svelte'
  import {
    clampView,
    fitPixelsPerSecond,
    followPlayhead,
    secondsToX,
    xToSeconds,
    zoomAround,
    type WaveformView,
  } from './waveformView'

  const DRAG_THRESHOLD_PIXELS = 4
  const HEIGHT_PIXELS = 220

  let canvas: HTMLCanvasElement
  let view: WaveformView = { startSeconds: 0, pixelsPerSecond: 1, widthPixels: 1 }
  let dragStartX: number | null = null
  let dragCurrentX: number | null = null
  let lastWaveform: unknown = null

  const durationSeconds = () => player.state?.song?.durationSeconds ?? 0

  function resetViewForNewSong(): void {
    if (player.waveform === lastWaveform) return
    lastWaveform = player.waveform
    view = { ...view, startSeconds: 0, pixelsPerSecond: fitPixelsPerSecond(view.widthPixels, durationSeconds()) }
  }

  function draw(): void {
    const context = canvas.getContext('2d')
    if (!context) return
    const style = getComputedStyle(canvas)
    const color = (name: string) => style.getPropertyValue(name)
    const scale = window.devicePixelRatio
    context.setTransform(scale, 0, 0, scale, 0, 0)
    context.fillStyle = color('--waveform-background')
    context.fillRect(0, 0, view.widthPixels, HEIGHT_PIXELS)
    drawLoop(context, color('--loop-fill'))
    drawPeaks(context, color('--waveform-peak'))
    drawMarkers(context, color('--marker'))
    drawPlayhead(context, color('--playhead'))
  }

  function drawPeaks(context: CanvasRenderingContext2D, fill: string): void {
    const waveform = player.waveform
    if (!waveform) return
    const middle = HEIGHT_PIXELS / 2
    context.fillStyle = fill
    for (let x = 0; x < view.widthPixels; x++) {
      const firstPeak = Math.floor(xToSeconds(view, x) * waveform.peaksPerSecond)
      const lastPeak = Math.max(Math.floor(xToSeconds(view, x + 1) * waveform.peaksPerSecond), firstPeak + 1)
      const loudest = loudestPeak(waveform.peaks, firstPeak, lastPeak)
      const halfHeight = Math.max(loudest * middle, 0.5)
      context.fillRect(x, middle - halfHeight, 1, halfHeight * 2)
    }
  }

  function loudestPeak(peaks: number[], from: number, to: number): number {
    let loudest = 0
    for (let index = Math.max(from, 0); index < Math.min(to, peaks.length); index++) {
      loudest = Math.max(loudest, peaks[index])
    }
    return loudest
  }

  function drawLoop(context: CanvasRenderingContext2D, fill: string): void {
    const range = displayedLoopSeconds()
    if (!range) return
    const [startX, endX] = range.map((seconds) => secondsToX(view, seconds))
    context.fillStyle = fill
    context.fillRect(startX, 0, endX - startX, HEIGHT_PIXELS)
  }

  function displayedLoopSeconds(): [number, number] | null {
    if (dragStartX !== null && dragCurrentX !== null && isDragging()) {
      const seconds = [dragStartX, dragCurrentX].map((x) => xToSeconds(view, x)).sort((a, b) => a - b)
      return [seconds[0], seconds[1]]
    }
    const settings = player.state?.settings
    if (settings?.loopStartSeconds == null || settings.loopEndSeconds == null) return null
    return [settings.loopStartSeconds, settings.loopEndSeconds]
  }

  function drawMarkers(context: CanvasRenderingContext2D, stroke: string): void {
    const markers = player.state?.settings.markers ?? []
    context.strokeStyle = stroke
    context.fillStyle = stroke
    context.font = '12px system-ui'
    markers.forEach((marker, index) => {
      const x = secondsToX(view, marker.seconds)
      context.beginPath()
      context.moveTo(x, 0)
      context.lineTo(x, HEIGHT_PIXELS)
      context.stroke()
      context.fillText(`${index + 1} ${marker.name}`, x + 4, 14)
    })
  }

  function drawPlayhead(context: CanvasRenderingContext2D, fill: string): void {
    if (!player.state?.song) return
    context.fillStyle = fill
    context.fillRect(secondsToX(view, player.currentSeconds()) - 1, 0, 2, HEIGHT_PIXELS)
  }

  function isDragging(): boolean {
    return dragStartX !== null && dragCurrentX !== null && Math.abs(dragCurrentX - dragStartX) > DRAG_THRESHOLD_PIXELS
  }

  function handlePointerDown(event: PointerEvent): void {
    if (!player.state?.song) return
    canvas.setPointerCapture(event.pointerId)
    dragStartX = event.offsetX
    dragCurrentX = event.offsetX
  }

  function handlePointerMove(event: PointerEvent): void {
    if (dragStartX === null) return
    dragCurrentX = event.offsetX
  }

  function handlePointerUp(event: PointerEvent): void {
    if (dragStartX === null) return
    dragCurrentX = event.offsetX
    const loopSeconds = isDragging() ? displayedLoopSeconds() : null
    const clickedSeconds = xToSeconds(view, event.offsetX)
    dragStartX = null
    dragCurrentX = null
    if (loopSeconds) {
      player.run(() => backend.setLoop(loopSeconds[0], loopSeconds[1]))
      return
    }
    player.run(() => backend.seek(clickedSeconds))
  }

  function handleWheel(event: WheelEvent): void {
    event.preventDefault()
    if (event.ctrlKey) {
      view = zoomAround(view, event.offsetX, event.deltaY < 0)
      return
    }
    const deltaPixels = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY
    view = { ...view, startSeconds: view.startSeconds + deltaPixels / view.pixelsPerSecond }
  }

  function resizeCanvas(): void {
    const widthPixels = canvas.clientWidth
    canvas.width = widthPixels * window.devicePixelRatio
    canvas.height = HEIGHT_PIXELS * window.devicePixelRatio
    view = { ...view, widthPixels }
  }

  function frame(): void {
    resetViewForNewSong()
    if (player.state?.isPlaying && dragStartX === null) view = followPlayhead(view, player.currentSeconds())
    view = clampView(view, durationSeconds())
    draw()
  }

  onMount(() => {
    const observer = new ResizeObserver(resizeCanvas)
    observer.observe(canvas)
    let animationFrame = requestAnimationFrame(function loop() {
      frame()
      animationFrame = requestAnimationFrame(loop)
    })
    return () => {
      observer.disconnect()
      cancelAnimationFrame(animationFrame)
    }
  })

</script>

<canvas
  bind:this={canvas}
  style:height="{HEIGHT_PIXELS}px"
  onpointerdown={handlePointerDown}
  onpointermove={handlePointerMove}
  onpointerup={handlePointerUp}
  onwheel={handleWheel}
></canvas>

<style>
  canvas {
    display: block;
    width: 100%;
    border-radius: 6px;
    cursor: crosshair;
    touch-action: none;
  }
</style>
