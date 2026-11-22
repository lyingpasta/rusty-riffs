<script lang="ts">
  import type { Shortcut } from './shortcuts'

  let { shortcuts, onclose }: { shortcuts: Shortcut[]; onclose: () => void } = $props()
</script>

<div class="backdrop" role="presentation" onclick={onclose}>
  <div class="sheet" role="dialog" aria-label="Keyboard shortcuts">
    <h2>Keyboard shortcuts</h2>
    <dl>
      {#each shortcuts as shortcut (shortcut.keys)}
        <dt><kbd>{shortcut.keys}</kbd></dt>
        <dd>{shortcut.description}</dd>
      {/each}
    </dl>
    <p class="hint">Drag on the waveform to set a loop. Ctrl + scroll zooms.</p>
  </div>
</div>

<style>
  .backdrop {
    position: fixed;
    inset: 0;
    display: grid;
    place-items: center;
    background: rgba(0, 0, 0, 0.45);
  }

  .sheet {
    max-width: 520px;
    padding: 20px 24px;
    border-radius: 10px;
    background: var(--surface);
  }

  h2 {
    margin: 0 0 12px;
    font-size: 16px;
  }

  dl {
    display: grid;
    grid-template-columns: max-content 1fr;
    gap: 6px 16px;
    margin: 0;
  }

  dd {
    margin: 0;
  }

  kbd {
    padding: 1px 6px;
    border: 1px solid var(--border);
    border-radius: 4px;
    font-family: inherit;
  }

  .hint {
    margin: 12px 0 0;
    color: var(--muted);
  }
</style>
