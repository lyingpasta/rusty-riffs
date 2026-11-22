<script lang="ts">
  import { onMount } from 'svelte'
  import { measuredOffsetMilliseconds, startCalibration, type CalibrationSession } from './calibration'
  import { interaction } from './interaction.svelte'
  import { timing } from './timing.svelte'

  type Phase = { kind: 'tapping'; clicksHeard: number } | { kind: 'result'; offset: number | null }

  let session: CalibrationSession | null = null
  let phase = $state<Phase>({ kind: 'tapping', clicksHeard: 0 })

  function begin(): void {
    session?.stop()
    session = startCalibration()
    phase = { kind: 'tapping', clicksHeard: 0 }
  }

  function track(): void {
    if (!session || phase.kind !== 'tapping') return
    const now = session.heardTime()
    phase = { kind: 'tapping', clicksHeard: session.clickTimes.filter((time) => time <= now).length }
    if (now < session.endTime) return
    phase = { kind: 'result', offset: measuredOffsetMilliseconds(session.clickTimes, session.taps) }
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
    if (event.key === ' ' && phase.kind === 'tapping' && !event.repeat) session?.tap()
  }

  function describe(offset: number): string {
    const rounded = Math.round(Math.abs(offset))
    return offset >= 0 ? `You tap ${rounded} ms after the click.` : `You tap ${rounded} ms ahead of the click.`
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
  <div class="dialog" role="dialog" aria-label="Timing calibration">
    <h2>Timing calibration</h2>
    {#if phase.kind === 'tapping'}
      <p>Press Space along with each click, the way you'd press m on a note you hear. The first four clicks are a warm-up.</p>
      <div class="clicks" aria-label="{phase.clicksHeard} of 16 clicks">
        {#each { length: 16 } as _, index (index)}
          <span class="click" class:heard={index < phase.clicksHeard} class:warm-up={index < 4}></span>
        {/each}
      </div>
      <div class="actions"><button onclick={close}>Cancel</button></div>
    {:else if phase.offset === null}
      <p>Not enough taps landed near the clicks. Try again, pressing Space on every click.</p>
      <div class="actions">
        <button onclick={close}>Cancel</button>
        <button onclick={begin}>Try again</button>
      </div>
    {:else}
      {@const offset = phase.offset}
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
