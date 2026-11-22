<script lang="ts">
  let {
    label,
    value,
    ondecrement,
    onincrement,
    onreset,
  }: {
    label: string
    value: string
    ondecrement: () => void
    onincrement: () => void
    onreset?: () => void
  } = $props()
</script>

<button class="step" onclick={ondecrement} aria-label="Decrease {label}">−</button>
<button class="value" onclick={onreset} disabled={!onreset} title={onreset ? `Reset ${label}` : label}>
  <span class="label">{label}</span>
  {value}
</button>
<button class="step" onclick={onincrement} aria-label="Increase {label}">+</button>

<style>
  .step {
    width: 28px;
    height: 100%;
    padding: 0;
    color: var(--muted);
  }

  .step:hover {
    color: var(--text);
  }

  .value {
    height: 100%;
    min-width: 92px;
    padding: 0 10px;
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
  }

  .value:disabled {
    color: var(--text);
    cursor: default;
  }

  .label {
    margin-right: 4px;
    color: var(--muted);
    font-weight: 400;
  }
</style>
