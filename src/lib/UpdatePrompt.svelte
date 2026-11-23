<script lang="ts">
  import { onMount } from 'svelte'
  import { interaction } from './interaction.svelte'
  import { availableUpdateAction, describeUpdateStatus } from './updateStatus'
  import { updates } from './updates.svelte'

  const isInstallOffered = $derived(availableUpdateAction(updates.status) === 'install')
  const isBusy = $derived(availableUpdateAction(updates.status) === null)
  const FOCUS_DIRECTIONS: Record<string, 1 | -1> = { ArrowLeft: -1, ArrowRight: 1 }

  let dialog: HTMLElement
  let actions = $state<HTMLElement | null>(null)

  function buttons(): HTMLButtonElement[] {
    return actions ? [...actions.querySelectorAll('button')] : []
  }

  function moveFocus(direction: 1 | -1): void {
    const choices = buttons()
    const current = choices.indexOf(document.activeElement as HTMLButtonElement)
    const next = (current + direction + choices.length) % choices.length
    choices[next]?.focus()
  }

  function focusDefaultChoice(): void {
    const choices = buttons()
    const defaultChoice = choices[choices.length - 1] ?? dialog
    defaultChoice.focus()
  }

  function close(): void {
    interaction.isUpdatePromptOpen = false
  }

  function handleKeydown(event: KeyboardEvent): void {
    event.stopPropagation()
    if (event.key === 'Escape') return close()
    const direction = FOCUS_DIRECTIONS[event.key]
    if (!direction) return
    event.preventDefault()
    moveFocus(direction)
  }

  $effect(() => {
    if (isInstallOffered || !isBusy) focusDefaultChoice()
  })

  onMount(() => {
    window.addEventListener('keydown', handleKeydown, { capture: true })
    return () => window.removeEventListener('keydown', handleKeydown, { capture: true })
  })
</script>

<div class="backdrop" role="presentation">
  <div class="dialog" role="alertdialog" aria-modal="true" aria-label="Update available" tabindex="-1" bind:this={dialog}>
    <h2>Update available</h2>
    {#if updates.status.kind === 'available'}
      <p>
        Rusty Riffs {updates.status.version} is ready to install. You have {updates.status.currentVersion}. Installing
        restarts the app; your markers and loops are kept.
      </p>
    {:else}
      <p class="status" aria-live="polite">{describeUpdateStatus(updates.status)}</p>
    {/if}
    {#if !isBusy}
      <div class="actions" bind:this={actions}>
        <button onclick={close}>Later</button>
        {#if isInstallOffered}
          <button class="primary" onclick={() => updates.install()}>Install and restart</button>
        {/if}
      </div>
      <p class="hint">Enter to choose, ← → to switch, Esc for later</p>
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
    box-shadow: 0 12px 40px var(--overlay);
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

  .status {
    color: var(--text);
  }

  .hint {
    font-size: 12px;
    text-align: right;
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
