<script lang="ts">
  import { onMount } from 'svelte'
  import { player } from './player.svelte'
  import { formatSeconds } from './time'

  let seconds = $state(0)

  onMount(() => {
    let animationFrame = requestAnimationFrame(function update() {
      seconds = player.currentSeconds()
      animationFrame = requestAnimationFrame(update)
    })
    return () => cancelAnimationFrame(animationFrame)
  })
</script>

<span class="readout">
  {formatSeconds(seconds)} / {formatSeconds(player.state?.song?.durationSeconds ?? 0)}
</span>

<style>
  .readout {
    font-variant-numeric: tabular-nums;
  }
</style>
