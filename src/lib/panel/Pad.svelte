<script lang="ts">
  import type { Snippet } from 'svelte'
  import Icon, { type IconName } from './Icon.svelte'

  let {
    onclick,
    title,
    icon,
    isOn = false,
    disabled = false,
    children,
  }: {
    onclick: () => void
    title: string
    icon?: IconName
    isOn?: boolean
    disabled?: boolean
    children?: Snippet
  } = $props()
</script>

<button class="pad" class:on={isOn} class:icon-only={!children} {onclick} {title} aria-label={title} {disabled} aria-pressed={isOn}>
  {#if icon}<Icon name={icon} />{/if}
  {#if children}{@render children()}{/if}
</button>

<style>
  .pad {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    height: 100%;
    padding: 0 10px;
    white-space: nowrap;
  }

  .icon-only {
    justify-content: center;
    width: var(--bar-height);
    padding: 0;
  }

  .on,
  .on:hover:not(:disabled) {
    background: var(--accent-soft);
    color: var(--accent);
  }
</style>
