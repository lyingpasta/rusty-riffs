<script lang="ts">
  import type { Snippet } from 'svelte'

  let { label, isSecondary = false, children }: { label: string; isSecondary?: boolean; children: Snippet } = $props()
</script>

<div class="group" class:secondary={isSecondary} role="group" aria-label={label}>
  {@render children()}
</div>

<style>
  .group {
    display: flex;
    gap: 1px;
  }

  .secondary {
    opacity: var(--dim-opacity);
    transition: opacity 120ms ease-out;
  }

  .secondary:hover,
  .secondary:focus-within {
    opacity: 1;
  }

  @media (prefers-reduced-motion: reduce) {
    .secondary {
      transition: none;
    }
  }
</style>
