<script lang="ts">
  import { onMount } from 'svelte'
  import { fade } from 'svelte/transition'
  import Logo from './Logo.svelte'
  import { tips } from './tips'

  const TIP_INTERVAL_MILLISECONDS = 3200
  const LOGO_SIZE = 112

  let { status }: { status: string } = $props()

  let tipIndex = $state(Math.floor(Math.random() * tips.length))

  onMount(() => {
    const timer = setInterval(() => (tipIndex = (tipIndex + 1) % tips.length), TIP_INTERVAL_MILLISECONDS)
    return () => clearInterval(timer)
  })
</script>

<div class="splash" role="status" aria-live="polite" out:fade={{ duration: 250 }}>
  <Logo size={LOGO_SIZE} isDrawingIn />
  <h1>Rusty Riffs</h1>
  <p class="status">{status}</p>
  <div class="tip-area">
    {#key tipIndex}
      <p class="tip" in:fade={{ duration: 300, delay: 150 }} out:fade={{ duration: 150 }}>{tips[tipIndex]}</p>
    {/key}
  </div>
</div>

<style>
  .splash {
    position: fixed;
    inset: 0;
    z-index: 10;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 6px;
    background: var(--bg);
  }

  h1 {
    margin: 10px 0 0;
    font-size: 22px;
    font-weight: 600;
    letter-spacing: 0.01em;
  }

  .status {
    margin: 0;
    color: var(--muted);
  }

  .tip-area {
    display: grid;
    min-height: 2.8em;
    margin-top: 28px;
  }

  .tip {
    grid-area: 1 / 1;
    max-width: 44ch;
    margin: 0;
    color: var(--text);
    opacity: 0.75;
    text-align: center;
    line-height: 1.4;
  }
</style>
