<script lang="ts">
  import Icon, { type IconName } from './Icon.svelte'

  let {
    label,
    icon,
    value,
    ondecrement,
    onincrement,
    onreset,
  }: {
    label: string
    icon?: IconName
    value: string
    ondecrement: () => void
    onincrement: () => void
    onreset?: () => void
  } = $props()
</script>

<button class="step" onclick={ondecrement} aria-label="Decrease {label}" title="Decrease {label}">−</button>
<button class="value" onclick={onreset} disabled={!onreset} title={onreset ? `${label} (click to reset)` : label} aria-label={label}>
  {#if icon}<span class="value-icon"><Icon name={icon} /></span>{/if}
  {value}
</button>
<button class="step" onclick={onincrement} aria-label="Increase {label}" title="Increase {label}">+</button>

<style>
  .step {
    width: 22px;
    height: 100%;
    padding: 0;
    color: var(--muted);
  }

  .step:hover {
    color: var(--text);
  }

  .value {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 5px;
    height: 100%;
    min-width: 52px;
    padding: 0 8px;
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
  }

  .value:disabled {
    color: var(--text);
    cursor: default;
  }

  .value-icon {
    color: var(--muted);
  }
</style>
