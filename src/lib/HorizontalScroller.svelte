<script lang="ts">
  import type { Snippet } from 'svelte'
  import { scrollLeftAfterThumbDrag, scrollLeftCenteredOn, thumbSpan, type ScrollMetrics } from './horizontalScroll'

  type ThumbDrag = { pointerStartX: number; scrollLeftAtStart: number }

  let { children }: { children: Snippet } = $props()

  const viewportId = $props.id()

  let viewport: HTMLDivElement
  let content: HTMLDivElement
  let metrics = $state<ScrollMetrics>({ scrollLeft: 0, scrollWidth: 0, clientWidth: 0 })
  let drag = $state<ThumbDrag | null>(null)
  const thumb = $derived(thumbSpan(metrics))

  function measure(): void {
    metrics = { scrollLeft: viewport.scrollLeft, scrollWidth: viewport.scrollWidth, clientWidth: viewport.clientWidth }
  }

  function pressTrack(event: PointerEvent): void {
    const track = event.currentTarget as HTMLElement
    event.preventDefault()
    if (event.target === track) jumpTo(event, track)
    track.setPointerCapture(event.pointerId)
    drag = { pointerStartX: event.clientX, scrollLeftAtStart: viewport.scrollLeft }
  }

  function jumpTo(event: PointerEvent, track: HTMLElement): void {
    viewport.scrollLeft = scrollLeftCenteredOn(metrics, event.clientX - track.getBoundingClientRect().left)
  }

  function dragThumb(event: PointerEvent): void {
    if (!drag) return
    viewport.scrollLeft = scrollLeftAfterThumbDrag(metrics, drag.scrollLeftAtStart, event.clientX - drag.pointerStartX)
  }

  function endThumbDrag(): void {
    drag = null
  }

  $effect(() => {
    const observer = new ResizeObserver(measure)
    observer.observe(viewport)
    observer.observe(content)
    return () => observer.disconnect()
  })
</script>

<div class="scroller" class:is-dragging={drag}>
  <div class="viewport" id={viewportId} bind:this={viewport} onscroll={measure}>
    <div class="content" bind:this={content}>
      {@render children()}
    </div>
  </div>

  {#if thumb}
    <div class="scrollbar">
      <div
        class="track"
        role="scrollbar"
        aria-controls={viewportId}
        aria-orientation="horizontal"
        aria-valuenow={Math.round(thumb.startPercent)}
        tabindex="-1"
        onpointerdown={pressTrack}
        onpointermove={dragThumb}
        onpointerup={endThumbDrag}
        onpointercancel={endThumbDrag}
      >
        <div class="thumb" style:left="{thumb.startPercent}%" style:width="{thumb.sizePercent}%"></div>
      </div>
    </div>
  {/if}
</div>

<style>
  .scroller {
    --scrollbar-rest-height: 3px;
    --scrollbar-hover-height: 8px;
    position: relative;
  }

  .is-dragging {
    -webkit-user-select: none;
    user-select: none;
  }

  .viewport {
    overflow-x: auto;
    overflow-y: hidden;
    scrollbar-width: none;
  }

  .viewport::-webkit-scrollbar {
    display: none;
  }

  .content {
    width: max-content;
    min-width: 100%;
  }

  .scrollbar {
    position: absolute;
    right: 0;
    bottom: 0;
    left: 0;
    display: flex;
    align-items: flex-end;
    height: var(--scrollbar-hover-height);
    -webkit-user-select: none;
    user-select: none;
  }

  .track {
    position: relative;
    width: 100%;
    height: var(--scrollbar-rest-height);
    background: var(--bar);
    transition: height 120ms ease-out;
  }

  .scrollbar:hover .track,
  .is-dragging .track {
    height: var(--scrollbar-hover-height);
  }

  .thumb {
    position: absolute;
    top: 0;
    bottom: 0;
    background: var(--muted);
  }

  .scrollbar:hover .thumb,
  .is-dragging .thumb {
    background: var(--accent);
  }

  @media (prefers-reduced-motion: reduce) {
    .track {
      transition: none;
    }
  }
</style>
