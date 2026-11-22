<script lang="ts">
  import { onMount } from 'svelte'
  import { player } from '../player.svelte'
  import { formatSeconds } from '../time'

  let seconds = $state(0)

  onMount(() => {
    let animationFrame = requestAnimationFrame(function update() {
      seconds = player.currentSeconds()
      animationFrame = requestAnimationFrame(update)
    })
    return () => cancelAnimationFrame(animationFrame)
  })
</script>

<div class="time" role="timer">
  <span class="now">{formatSeconds(seconds)}</span>
  <span class="total">/ {formatSeconds(player.state?.song?.durationSeconds ?? 0)}</span>
</div>

<style>
  .time {
    display: flex;
    align-items: center;
    gap: 6px;
    min-width: 130px;
    padding: 0 14px;
    background: var(--cell);
    font-variant-numeric: tabular-nums;
  }

  .now {
    font-size: 17px;
    font-weight: 600;
  }

  .total {
    color: var(--muted);
  }
</style>
