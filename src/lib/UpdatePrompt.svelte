<script lang="ts">
  import { interaction } from './interaction.svelte'
  import { availableUpdateAction, describeUpdateStatus } from './updateStatus'
  import { updates } from './updates.svelte'

  const isInstallOffered = $derived(availableUpdateAction(updates.status) === 'install')
  const isBusy = $derived(availableUpdateAction(updates.status) === null)

  function takeFocus(dialog: HTMLElement): void {
    dialog.focus()
  }

  function close(): void {
    interaction.isUpdatePromptOpen = false
  }
</script>

<div class="backdrop" role="presentation">
  <div class="dialog" role="alertdialog" aria-modal="true" aria-label="Update available" tabindex="-1" use:takeFocus>
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
      <div class="actions">
        <button onclick={close}>Later</button>
        {#if isInstallOffered}
          <button class="primary" onclick={() => updates.install()}>Install and restart</button>
        {/if}
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
