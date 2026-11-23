<script lang="ts">
  import { onMount } from 'svelte'
  import { interaction } from './interaction.svelte'
  import type { Release } from './releaseNotes'

  let { releases }: { releases: Release[] } = $props()

  const newestVersion = $derived(releases[0].version)

  function takeFocus(button: HTMLButtonElement): void {
    button.focus()
  }

  function close(): void {
    interaction.whatsNew = null
  }

  function handleKeydown(event: KeyboardEvent): void {
    event.stopPropagation()
    if (event.key === 'Escape') close()
  }

  onMount(() => {
    window.addEventListener('keydown', handleKeydown, { capture: true })
    return () => window.removeEventListener('keydown', handleKeydown, { capture: true })
  })
</script>

<div class="backdrop" role="presentation">
  <div class="dialog" role="dialog" aria-modal="true" aria-label="What's new">
    <h2>What's new in Rusty Riffs {newestVersion}</h2>
    <div class="notes">
      {#each releases as release (release.version)}
        {#if releases.length > 1}
          <h3>{release.version}</h3>
        {/if}
        {#each release.sections as section (section.title)}
          <h4>{section.title}</h4>
          <ul>
            {#each section.items as item, index (index)}
              <li>{item}</li>
            {/each}
          </ul>
        {/each}
      {/each}
    </div>
    <div class="actions">
      <button class="primary" onclick={close} use:takeFocus>Got it</button>
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
    display: flex;
    flex-direction: column;
    gap: 14px;
    width: 460px;
    max-height: 80vh;
    padding: 20px;
    background: var(--cell);
    box-shadow: 0 12px 40px var(--overlay);
  }

  h2 {
    margin: 0;
    font-size: 16px;
    font-weight: 600;
  }

  .notes {
    overflow: auto;
  }

  h3 {
    margin: 12px 0 0;
    font-size: 14px;
    font-weight: 600;
  }

  h3:first-child {
    margin-top: 0;
  }

  h4 {
    margin: 8px 0 4px;
    font-size: 13px;
    font-weight: 600;
    color: var(--accent);
  }

  ul {
    margin: 0;
    padding-left: 18px;
    color: var(--muted);
    line-height: 1.4;
  }

  .actions {
    display: flex;
    justify-content: flex-end;
  }

  .actions button {
    height: 32px;
    padding: 0 14px;
  }

  .actions .primary {
    background: var(--accent-soft);
    color: var(--accent);
  }
</style>
