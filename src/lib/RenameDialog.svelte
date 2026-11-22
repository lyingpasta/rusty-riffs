<script lang="ts">
  import { actions } from './actions'
  import type { RenameTarget } from './interaction.svelte'
  import { interaction } from './interaction.svelte'

  let { target }: { target: RenameTarget } = $props()

  function focusAndSelect(input: HTMLInputElement): void {
    input.focus()
    input.select()
  }

  function handleKeydown(event: KeyboardEvent & { currentTarget: HTMLInputElement }): void {
    event.stopPropagation()
    if (event.key === 'Enter') actions.rename(event.currentTarget.value)
    if (event.key === 'Escape') interaction.renameTarget = null
  }
</script>

<div class="rename" role="dialog" aria-label="Rename {target.kind}">
  <label for="rename-input">Rename {target.kind}</label>
  <input
    id="rename-input"
    type="text"
    value={target.name}
    use:focusAndSelect
    onkeydown={handleKeydown}
    onblur={() => (interaction.renameTarget = null)}
  />
  <span class="hint">Enter to save, Esc to cancel</span>
</div>

<style>
  .rename {
    position: fixed;
    top: calc(var(--bar-height) + 16px);
    left: 50%;
    display: flex;
    flex-direction: column;
    gap: 6px;
    width: 300px;
    padding: 14px;
    background: var(--cell);
    box-shadow: 0 12px 32px var(--overlay);
    transform: translateX(-50%);
  }

  label,
  .hint {
    color: var(--muted);
    font-size: 12px;
  }

  input {
    height: 32px;
    padding: 0 10px;
    background: var(--bar);
    font-size: 15px;
  }
</style>
