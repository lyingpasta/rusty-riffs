<script lang="ts">
  import { interaction } from './interaction.svelte'
  import { shortcuts } from './shortcuts'

  const groups = [...new Set(shortcuts.map((shortcut) => shortcut.group))]
</script>

<div class="backdrop" role="presentation" onclick={() => (interaction.isCheatSheetOpen = false)}>
  <div class="sheet" role="dialog" aria-label="Keyboard shortcuts">
    {#each groups as group (group)}
      <section>
        <h2>{group}</h2>
        <dl>
          {#each shortcuts.filter((shortcut) => shortcut.group === group) as shortcut (shortcut.description)}
            <dt><kbd>{shortcut.label}</kbd></dt>
            <dd>{shortcut.description}{shortcut.mode === 'new-loop' ? ' (in new-loop mode)' : ''}</dd>
          {/each}
        </dl>
      </section>
    {/each}
    <p class="hint">Mouse: drag on the waveform to make a loop, click to seek, scroll to move, Ctrl + scroll to zoom. Click a loop bar to activate it, double-click a name to rename it.</p>
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

  .sheet {
    display: grid;
    grid-template-columns: repeat(2, minmax(240px, 1fr));
    gap: 12px 28px;
    max-width: 760px;
    max-height: 90vh;
    overflow: auto;
    padding: 18px 22px;
    background: var(--cell);
    box-shadow: 0 12px 40px var(--overlay);
  }

  h2 {
    margin: 0 0 6px;
    font-size: 13px;
    color: var(--accent);
    font-weight: 600;
  }

  dl {
    display: grid;
    grid-template-columns: max-content 1fr;
    gap: 4px 12px;
    margin: 0;
  }

  dd {
    margin: 0;
  }

  kbd {
    padding: 0 6px;
    border: 1px solid var(--bar);
    border-radius: 0;
    background: var(--cell-hover);
    box-shadow: inset 0 -1px 0 var(--bar);
    font-family: inherit;
    font-weight: 600;
  }

  .hint {
    grid-column: 1 / -1;
    margin: 0;
    color: var(--muted);
  }
</style>
