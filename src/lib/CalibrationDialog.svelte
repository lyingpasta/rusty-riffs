<script lang="ts">
  import { onMount } from 'svelte'
  import {
    CLICK_COUNT,
    WARM_UP_CLICKS,
    measureOffset,
    startCalibration,
    type CalibrationResult,
    type CalibrationSession,
  } from './calibration'
  import { interaction } from './interaction.svelte'
  import { timing } from './timing.svelte'

  type Phase = { kind: 'tapping'; clicksHeard: number } | { kind: 'result'; result: CalibrationResult }

  const TAP_FLASH_MILLISECONDS = 120

  let session: CalibrationSession | null = null
  let phase = $state<Phase>({ kind: 'tapping', clicksHeard: 0 })
  let tapCount = $state(0)
  let isFlashing = $state(false)
  let flashTimer: ReturnType<typeof setTimeout> | undefined

  function begin(): void {
    session?.stop()
    session = startCalibration()
    phase = { kind: 'tapping', clicksHeard: 0 }
    tapCount = 0
  }

  function track(): void {
    if (!session || phase.kind !== 'tapping') return
    phase = { kind: 'tapping', clicksHeard: session.clicksPlayed() }
    if (!session.isFinished()) return
    phase = { kind: 'result', result: measureOffset(session.clickTimes, session.taps) }
    session.stop()
  }

  function close(): void {
    session?.stop()
    interaction.isCalibrationOpen = false
  }

  function save(offset: number): void {
    timing.setOffset(offset)
    interaction.showNotice(`Timing offset set to ${Math.round(offset)} ms`)
    close()
  }

  function handleKeydown(event: KeyboardEvent): void {
    event.stopPropagation()
    event.preventDefault()
    if (event.key === 'Escape') return close()
    if (event.key === ' ' && phase.kind === 'tapping' && !event.repeat) registerTap()
  }

  function registerTap(): void {
    session?.tap()
    tapCount += 1
    isFlashing = true
    clearTimeout(flashTimer)
    flashTimer = setTimeout(() => (isFlashing = false), TAP_FLASH_MILLISECONDS)
  }

  function takeFocus(dialog: HTMLElement): void {
    dialog.focus()
  }

  function describe(offset: number): string {
    const rounded = Math.round(Math.abs(offset))
    return offset >= 0 ? `You react ${rounded} ms after the click.` : `You pressed ${rounded} ms before the click on average.`
  }

  onMount(() => {
    begin()
    let animationFrame = requestAnimationFrame(function update() {
      track()
      animationFrame = requestAnimationFrame(update)
    })
    window.addEventListener('keydown', handleKeydown, { capture: true })
    return () => {
      cancelAnimationFrame(animationFrame)
      window.removeEventListener('keydown', handleKeydown, { capture: true })
      session?.stop()
    }
  })
</script>

<div class="backdrop" role="presentation">
  <div class="dialog" role="dialog" aria-modal="true" aria-label="Timing calibration" tabindex="-1" use:takeFocus>
    <h2>Timing calibration</h2>
    {#if phase.kind === 'tapping'}
      <p>
        Press Space as soon as you hear each click. They come at random moments, so react rather than predict, the way
        you'd press m on a note you're listening for. You can close your eyes: the {WARM_UP_CLICKS} warm-up clicks are low, the counted ones higher, and the last one highest.
      </p>
      <p class="tap-count" class:flash={isFlashing} aria-live="polite">
        {tapCount === 0 ? 'Waiting for your first tap…' : `${tapCount} ${tapCount === 1 ? 'tap' : 'taps'}`}
      </p>
      <div class="clicks" aria-label="{phase.clicksHeard} of {CLICK_COUNT} clicks">
        {#each { length: CLICK_COUNT } as _, index (index)}
          <span class="click" class:heard={index < phase.clicksHeard} class:warm-up={index < WARM_UP_CLICKS}></span>
        {/each}
      </div>
      <div class="actions"><button onclick={close}>Cancel</button></div>
    {:else if phase.result.offsetMilliseconds === null}
      <p>
        Not enough taps landed near the clicks: {phase.result.matchedTapCount} of your {phase.result.tapCount} taps were
        within 0.6 s after a click (warm-up excluded), and 6 are needed. Try again, pressing Space on every click.
      </p>
      <div class="actions">
        <button onclick={close}>Cancel</button>
        <button onclick={begin}>Try again</button>
      </div>
    {:else}
      {@const offset = phase.result.offsetMilliseconds}
      <p>{describe(offset)} Markers you drop while playing will be moved back by that much.</p>
      <div class="actions">
        <button onclick={close}>Cancel</button>
        <button onclick={begin}>Try again</button>
        <button class="primary" onclick={() => save(offset)}>Use {Math.round(offset)} ms</button>
      </div>
    {/if}
  </div>
</div>

<style>
  .backdrop {
    position: fixed;
    inset: 0;
    display: grid;
    place-items: center;
    background: var(--overlay);
  }

  .dialog {
    outline: none;
    display: flex;
    flex-direction: column;
    gap: 14px;
    width: 420px;
    padding: 20px;
    background: var(--cell);
  }

  h2 {
    margin: 0;
    font-size: 16px;
    font-weight: 600;
  }

  p {
    margin: 0;
    color: var(--muted);
    line-height: 1.4;
  }

  .tap-count {
    color: var(--text);
    font-variant-numeric: tabular-nums;
  }

  .tap-count.flash {
    color: var(--accent);
  }

  .clicks {
    display: flex;
    gap: 4px;
  }

  .click {
    flex: 1;
    height: 8px;
    background: var(--bar);
  }

  .click.heard {
    background: var(--accent);
  }

  .click.heard.warm-up {
    background: var(--muted);
  }

  .actions {
    display: flex;
    justify-content: flex-end;
    gap: 1px;
  }

  .actions button {
    height: 32px;
    padding: 0 14px;
    background: var(--cell-hover);
  }

  .actions .primary {
    background: var(--accent-soft);
    color: var(--accent);
  }
</style>
