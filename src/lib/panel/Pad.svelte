<script lang="ts">
  import type { Snippet } from 'svelte'

  let {
    onclick,
    title,
    isOn = false,
    disabled = false,
    isSquare = false,
    children,
  }: {
    onclick: () => void
    title: string
    isOn?: boolean
    disabled?: boolean
    isSquare?: boolean
    children: Snippet
  } = $props()
</script>

<button class="pad" class:on={isOn} class:square={isSquare} {onclick} {title} {disabled} aria-pressed={isOn}>
  {@render children()}
</button>

<style>
  .pad {
    height: 100%;
    padding: 0 14px;
    white-space: nowrap;
  }

  .square {
    width: var(--bar-height);
    padding: 0;
  }

  .on,
  .on:hover:not(:disabled) {
    background: var(--accent-soft);
    color: var(--accent);
  }
</style>
