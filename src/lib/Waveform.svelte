<script lang="ts">
  import { onMount } from 'svelte'
  import { actions } from './actions'
  import { backend, type SongSettings } from './backend'
  import { interaction } from './interaction.svelte'
  import { player } from './player.svelte'
  import { assignLanes, loopSpans, markerById } from './songModel'
  import { handleZoomRequests } from './waveformZoom'
  import {
    clampView,
    easeTowards,
    fitPixelsPerSecond,
    followPlayhead,
    secondsToX,
    xToSeconds,
    zoomAround,
    type WaveformView,
  } from './waveformView'

  const DRAG_THRESHOLD_PIXELS = 4
  const MARKER_LABEL_HEIGHT = 22
  const EDGE_SPACE = 8
  const LABEL_INSET = 5
  const LANE_HEIGHT = 22
  const LANE_BAR_OFFSET = 16
  const LANE_BAR_HEIGHT = 3
  const DIMMED_ALPHA = 0.45
  const FOCUSED_PEAK_ALPHA = 0.75
  const MARKER_LINE_ALPHA = 0.35
  const MARKER_FONT = "500 12px 'Barlow Semi Condensed', system-ui"
  const LOOP_FONT = "500 12px 'Barlow Semi Condensed', system-ui"

  interface HitBox {
    kind: 'marker' | 'loop'
    id: number
    left: number
    top: number
    right: number
    bottom: number
  }

  let canvas: HTMLCanvasElement
  let view: WaveformView = { startSeconds: 0, pixelsPerSecond: 1, widthPixels: 1 }
  let heightPixels = 1
  let dragStartX: number | null = null
  let dragCurrentX: number | null = null
  let lastWaveform: unknown = null
  let targetStartSeconds = 0
  let lastFrameTime = performance.now()
  let lastPlayheadSeconds = 0
  let hitBoxes: HitBox[] = []
  let lastDrawInputs: unknown[] = []
  const colorCache = new Map<string, string>()
  let colorCacheThemeId = ''

  const durationSeconds = () => player.state?.song?.durationSeconds ?? 0

  function resetViewForNewSong(): void {
    if (player.waveform === lastWaveform) return
    lastWaveform = player.waveform
    view = { ...view, startSeconds: 0, pixelsPerSecond: fitPixelsPerSecond(view.widthPixels, durationSeconds()) }
    targetStartSeconds = 0
  }

  function targetView(): WaveformView {
    return { ...view, startSeconds: targetStartSeconds }
  }

  function snapViewTo(next: WaveformView): void {
    view = clampView(next, durationSeconds())
    targetStartSeconds = view.startSeconds
  }

  function themeColor(name: string): string {
    if (colorCacheThemeId !== interaction.theme.id) {
      colorCache.clear()
      colorCacheThemeId = interaction.theme.id
    }
    const cached = colorCache.get(name)
    if (cached !== undefined) return cached
    const value = getComputedStyle(canvas).getPropertyValue(name)
    colorCache.set(name, value)
    return value
  }

  function drawInputsChanged(): boolean {
    const inputs = [
      view.startSeconds,
      view.pixelsPerSecond,
      view.widthPixels,
      heightPixels,
      player.currentSeconds(),
      dragStartX,
      dragCurrentX,
      player.state,
      player.waveform,
      interaction.mode,
      interaction.theme,
    ]
    const hasChanged = inputs.some((input, index) => input !== lastDrawInputs[index])
    lastDrawInputs = inputs
    return hasChanged
  }

  function draw(): void {
    const context = canvas.getContext('2d')
    if (!context) return
    const color = themeColor
    const scale = window.devicePixelRatio
    context.setTransform(scale, 0, 0, scale, 0, 0)
    context.fillStyle = color('--wave-bg')
    context.fillRect(0, 0, view.widthPixels, heightPixels)
    hitBoxes = []
    const settings = player.state?.song ? player.state.settings : null
    const lanes = settings ? assignLanes(loopSpans(settings)) : []
    const laneCount = lanes.reduce((count, span) => Math.max(count, span.lane + 1), 0)
    const peaksBottom = heightPixels - laneCount * LANE_HEIGHT - EDGE_SPACE
    const selection = settings ? displayedSelection(settings) : null
    if (selection) drawSelection(context, selection, settings!, color)
    drawPeaks(context, { top: MARKER_LABEL_HEIGHT + EDGE_SPACE, bottom: peaksBottom }, selection, color)
    if (settings) drawMarkers(context, settings, color('--muted'))
    drawLoopLanes(context, lanes, peaksBottom + EDGE_SPACE / 2, color)
    if (player.state?.song) drawPlayhead(context, color('--accent'))
  }

  interface Selection {
    seconds: [number, number]
    isDraft: boolean
  }

  function drawSelection(
    context: CanvasRenderingContext2D,
    selection: Selection,
    settings: SongSettings,
    color: (name: string) => string,
  ): void {
    const [startX, endX] = selection.seconds.map((seconds) => secondsToX(view, seconds))
    context.fillStyle = color('--accent-soft')
    context.globalAlpha = selection.isDraft || settings.isLoopEnabled ? 1 : DIMMED_ALPHA
    context.fillRect(startX, 0, endX - startX, heightPixels)
    context.globalAlpha = 1
    if (!selection.isDraft) return
    context.strokeStyle = color('--accent')
    context.setLineDash([3, 3])
    context.strokeRect(startX + 0.5, 0.5, endX - startX - 1, heightPixels - 1)
    context.setLineDash([])
  }

  function displayedSelection(settings: SongSettings): Selection | null {
    if (isDragging()) {
      const seconds = [dragStartX!, dragCurrentX!].map((x) => xToSeconds(view, x)).sort((a, b) => a - b)
      return { seconds: [seconds[0], seconds[1]], isDraft: true }
    }
    const mode = interaction.mode
    if (mode.kind === 'selection') {
      const seconds = [mode.anchorSeconds, mode.endSeconds].sort((a, b) => a - b)
      return { seconds: [seconds[0], seconds[1]], isDraft: true }
    }
    if (mode.kind === 'new-loop') {
      const start = markerById(settings, mode.startMarkerId)
      const end = markerById(settings, mode.endMarkerId)
      return start && end ? { seconds: [start.seconds, end.seconds], isDraft: true } : null
    }
    const active = loopSpans(settings).find((span) => span.loop.id === settings.activeLoopId)
    return active ? { seconds: [active.startSeconds, active.endSeconds], isDraft: false } : null
  }

  function drawPeaks(
    context: CanvasRenderingContext2D,
    area: { top: number; bottom: number },
    selection: Selection | null,
    color: (name: string) => string,
  ): void {
    const waveform = player.waveform
    if (!waveform) return
    const middle = (area.top + area.bottom) / 2
    const maxHalfHeight = (area.bottom - area.top) / 2
    const quietPeak = color('--wave-peak')
    const focusedPeak = color('--accent')
    for (let x = 0; x < view.widthPixels; x++) {
      const seconds = xToSeconds(view, x)
      const isFocused = selection !== null && seconds >= selection.seconds[0] && seconds <= selection.seconds[1]
      const firstPeak = Math.floor(seconds * waveform.peaksPerSecond)
      const lastPeak = Math.max(Math.floor(xToSeconds(view, x + 1) * waveform.peaksPerSecond), firstPeak + 1)
      const halfHeight = Math.max(loudestPeak(waveform.peaks, firstPeak, lastPeak) * maxHalfHeight, 0.5)
      context.fillStyle = isFocused ? focusedPeak : quietPeak
      context.globalAlpha = isFocused ? FOCUSED_PEAK_ALPHA : 1
      context.fillRect(x, middle - halfHeight, 1, halfHeight * 2)
    }
    context.globalAlpha = 1
  }

  function loudestPeak(peaks: number[], from: number, to: number): number {
    let loudest = 0
    for (let index = Math.max(from, 0); index < Math.min(to, peaks.length); index++) {
      loudest = Math.max(loudest, peaks[index])
    }
    return loudest
  }

  function drawMarkers(context: CanvasRenderingContext2D, settings: SongSettings, muted: string): void {
    context.font = MARKER_FONT
    context.textBaseline = 'middle'
    for (const marker of settings.markers) {
      const x = Math.round(secondsToX(view, marker.seconds)) + 0.5
      context.strokeStyle = muted
      context.globalAlpha = MARKER_LINE_ALPHA
      context.beginPath()
      context.moveTo(x, 0)
      context.lineTo(x, heightPixels)
      context.stroke()
      context.globalAlpha = 1
      context.fillStyle = muted
      context.fillText(marker.name, x + LABEL_INSET, MARKER_LABEL_HEIGHT / 2)
      const right = x + LABEL_INSET * 2 + context.measureText(marker.name).width
      hitBoxes.push({ kind: 'marker', id: marker.id, left: x - LABEL_INSET, top: 0, right, bottom: MARKER_LABEL_HEIGHT })
    }
  }

  function drawLoopLanes(
    context: CanvasRenderingContext2D,
    lanes: ReturnType<typeof assignLanes>,
    top: number,
    color: (name: string) => string,
  ): void {
    context.font = LOOP_FONT
    context.textBaseline = 'alphabetic'
    for (const span of lanes) {
      const isActive = span.loop.id === player.state?.settings.activeLoopId
      const left = secondsToX(view, span.startSeconds)
      const right = secondsToX(view, span.endSeconds)
      const laneTop = top + span.lane * LANE_HEIGHT
      const tint = color(isActive ? '--accent' : '--muted')
      context.fillStyle = tint
      context.globalAlpha = isActive ? 1 : DIMMED_ALPHA
      context.fillRect(left, laneTop + LANE_BAR_OFFSET, right - left, LANE_BAR_HEIGHT)
      context.globalAlpha = 1
      context.save()
      context.beginPath()
      context.rect(left, laneTop, right - left, LANE_HEIGHT)
      context.clip()
      context.fillText(`${span.loop.name}  ${Math.round(span.loop.speedPercent)}%`, left, laneTop + LANE_BAR_OFFSET - 3)
      context.restore()
      hitBoxes.push({ kind: 'loop', id: span.loop.id, left, top: laneTop, right, bottom: laneTop + LANE_HEIGHT })
    }
  }

  function drawPlayhead(context: CanvasRenderingContext2D, accent: string): void {
    context.fillStyle = accent
    context.fillRect(Math.round(secondsToX(view, player.currentSeconds())) - 1, 0, 2, heightPixels)
  }

  function hitAt(x: number, y: number): HitBox | undefined {
    return hitBoxes.findLast((box) => x >= box.left && x <= box.right && y >= box.top && y <= box.bottom)
  }

  function isDragging(): boolean {
    return dragStartX !== null && dragCurrentX !== null && Math.abs(dragCurrentX - dragStartX) > DRAG_THRESHOLD_PIXELS
  }

  function handlePointerDown(event: PointerEvent): void {
    if (!player.state?.song || hitAt(event.offsetX, event.offsetY)?.kind === 'loop') return
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
    const wasDragging = isDragging()
    const [startSeconds, endSeconds] = [dragStartX, dragCurrentX].map((x) => xToSeconds(view, x))
    dragStartX = null
    dragCurrentX = null
    if (wasDragging) {
      actions.selectRange(startSeconds, endSeconds)
      return
    }
    player.run(() => backend.seek(endSeconds))
  }

  function handleClick(event: MouseEvent): void {
    const hit = hitAt(event.offsetX, event.offsetY)
    if (hit?.kind === 'loop') actions.activateLoop(hit.id)
  }

  function handleDoubleClick(event: MouseEvent): void {
    const hit = hitAt(event.offsetX, event.offsetY)
    const settings = player.state?.settings
    if (!hit || !settings) return
    const items = hit.kind === 'marker' ? settings.markers : settings.loops
    const item = items.find((candidate) => candidate.id === hit.id)
    if (item) interaction.renameTarget = { kind: hit.kind, id: item.id, name: item.name }
  }

  function handleWheel(event: WheelEvent): void {
    event.preventDefault()
    if (event.ctrlKey) {
      snapViewTo(zoomAround(view, event.offsetX, event.deltaY < 0))
      return
    }
    const deltaPixels = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY
    targetStartSeconds += deltaPixels / view.pixelsPerSecond
  }

  function resizeCanvas(): void {
    const widthPixels = canvas.clientWidth
    heightPixels = canvas.clientHeight
    canvas.width = widthPixels * window.devicePixelRatio
    canvas.height = heightPixels * window.devicePixelRatio
    view = { ...view, widthPixels }
    lastDrawInputs = []
  }

  function frame(): void {
    const now = performance.now()
    const elapsedMilliseconds = now - lastFrameTime
    lastFrameTime = now
    resetViewForNewSong()
    followMovingPlayhead()
    view = clampView(view, durationSeconds())
    targetStartSeconds = clampView(targetView(), durationSeconds()).startSeconds
    view = easeTowards(view, targetStartSeconds, elapsedMilliseconds)
    if (drawInputsChanged()) draw()
  }

  function followMovingPlayhead(): void {
    const playheadSeconds = player.currentSeconds()
    const hasPlayheadMoved = playheadSeconds !== lastPlayheadSeconds
    lastPlayheadSeconds = playheadSeconds
    if (!hasPlayheadMoved || dragStartX !== null) return
    targetStartSeconds = followPlayhead(targetView(), playheadSeconds).startSeconds
  }

  function zoomAroundPlayhead(isZoomingIn: boolean): void {
    const playheadX = secondsToX(view, player.currentSeconds())
    const anchorX = Math.min(Math.max(playheadX, 0), view.widthPixels)
    snapViewTo(zoomAround(view, anchorX, isZoomingIn))
  }

  onMount(() => {
    const stopHandlingZoom = handleZoomRequests(zoomAroundPlayhead)
    const observer = new ResizeObserver(resizeCanvas)
    observer.observe(canvas)
    let animationFrame = requestAnimationFrame(function loop() {
      frame()
      animationFrame = requestAnimationFrame(loop)
    })
    return () => {
      stopHandlingZoom()
      observer.disconnect()
      cancelAnimationFrame(animationFrame)
    }
  })
</script>

<canvas
  bind:this={canvas}
  onpointerdown={handlePointerDown}
  onpointermove={handlePointerMove}
  onpointerup={handlePointerUp}
  onclick={handleClick}
  ondblclick={handleDoubleClick}
  onwheel={handleWheel}
></canvas>

<style>
  canvas {
    display: block;
    width: 100%;
    height: 100%;
    cursor: crosshair;
    touch-action: none;
  }
</style>
