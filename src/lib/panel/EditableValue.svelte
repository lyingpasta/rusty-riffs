<script lang="ts">
  import Icon, { type IconName } from './Icon.svelte'

  let {
    label,
    icon,
    value,
    unit,
    oncommit,
  }: {
    label: string
    icon?: IconName
    value: number
    unit: string
    oncommit: (text: string) => void
  } = $props()

  function commit(event: FocusEvent & { currentTarget: HTMLInputElement }): void {
    const input = event.currentTarget
    oncommit(input.value)
    input.value = String(value)
  }

  function handleKeydown(event: KeyboardEvent & { currentTarget: HTMLInputElement }): void {
    event.stopPropagation()
    if (event.key === 'Escape') event.currentTarget.value = String(value)
    if (event.key === 'Enter' || event.key === 'Escape') event.currentTarget.blur()
  }
</script>

<label class="value" title="{label} (type a value, Enter to set)">
  {#if icon}<span class="value-icon"><Icon name={icon} /></span>{/if}
  <span>
    <input
      type="text"
      inputmode="numeric"
      aria-label={label}
      {value}
      onfocus={(event) => event.currentTarget.select()}
      onkeydown={handleKeydown}
      onblur={commit}
    />{unit}
  </span>
</label>

<style>
  .value {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 5px;
    height: 100%;
    min-width: 52px;
    padding: 0 8px;
    background: var(--cell);
    font-weight: 500;
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
    cursor: text;
  }

  .value:hover {
    background: var(--cell-hover);
  }

  .value-icon {
    color: var(--muted);
  }

  input {
    width: 4ch;
    padding: 0;
    background: transparent;
    text-align: right;
    font-variant-numeric: tabular-nums;
  }

  input:hover:not(:disabled) {
    background: transparent;
  }
</style>
