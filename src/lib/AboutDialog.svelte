<script lang="ts">
  import { onMount } from 'svelte'
  import { getVersion } from '@tauri-apps/api/app'
  import Logo from './brand/Logo.svelte'
  import { interaction } from './interaction.svelte'
  import { availableUpdateAction, describeUpdateStatus } from './updateStatus'
  import { updates } from './updates.svelte'

  const LOGO_SIZE = 56

  let version = $state<string | null>(null)
  let versionError = $state<string | null>(null)

  const updateAction = $derived(availableUpdateAction(updates.status))

  function takeFocus(dialog: HTMLElement): void {
    dialog.focus()
  }

  function closeOnBackdrop(event: MouseEvent): void {
    if (event.target === event.currentTarget) interaction.isAboutOpen = false
  }

  onMount(() => {
    getVersion()
      .then((appVersion) => (version = appVersion))
      .catch((error) => (versionError = String(error)))
  })
</script>

<div class="backdrop" role="presentation" onclick={closeOnBackdrop}>
  <div class="dialog" role="dialog" aria-modal="true" aria-label="About Rusty Riffs" tabindex="-1" use:takeFocus>
    <header>
      <Logo size={LOGO_SIZE} />
      <div>
        <h2>Rusty Riffs</h2>
        <p class="version">{versionError ?? (version ? `Version ${version}` : 'Version …')}</p>
      </div>
    </header>
    <p>A practice player for learning guitar parts by ear. Released under the MIT License.</p>
    <p class="update-status" aria-live="polite">{describeUpdateStatus(updates.status)}</p>
    <div class="actions">
      <button onclick={() => (interaction.isAboutOpen = false)}>Close</button>
      {#if updateAction === 'check'}
        <button onclick={() => updates.check()}>Check for updates</button>
      {:else if updateAction === 'install'}
        <button class="primary" onclick={() => updates.install()}>Install and restart</button>
      {/if}
    </div>
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

  header {
    display: flex;
    align-items: center;
    gap: 14px;
  }

  h2 {
    margin: 0;
    font-size: 18px;
    font-weight: 600;
  }

  p {
    margin: 0;
    color: var(--muted);
    line-height: 1.4;
  }

  .version {
    font-variant-numeric: tabular-nums;
  }

  .update-status {
    min-height: 1.4em;
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
