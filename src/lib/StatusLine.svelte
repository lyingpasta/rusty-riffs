<script lang="ts">
  import { interaction } from './interaction.svelte'
  import { player } from './player.svelte'
  import { markerById } from './songModel'
  import { formatSeconds } from './time'

  const modeDescription = $derived.by(() => {
    const mode = interaction.mode
    const settings = player.state?.settings
    if (mode.kind === 'selection') {
      const [from, to] = [mode.anchorSeconds, mode.endSeconds].sort((left, right) => left - right)
      return `Selection ${formatSeconds(from)} to ${formatSeconds(to)}. Move the end with h l H L , or . Enter makes a loop, d deletes the markers inside, Esc cancels.`
    }
    if (mode.kind !== 'new-loop' || !settings) return null
    const start = markerById(settings, mode.startMarkerId)?.name
    const end = markerById(settings, mode.endMarkerId)?.name
    return `New loop from ${start} to ${end}. Press , or . to move the end, Enter to save, Esc to cancel.`
  })
</script>

<footer class="status">
  {#if modeDescription}
    <span class="mode">{modeDescription}</span>
  {/if}
  {#if player.error}
    <span class="error" role="alert">{player.error}</span>
  {:else if interaction.notice}
    <span class="notice">{interaction.notice}</span>
  {/if}
  <span class="song">
    {player.isLoading ? 'Loading…' : (player.state?.song?.name ?? 'Drop an audio file here, or press Open')}
  </span>
</footer>

<style>
  .status {
    display: flex;
    gap: 16px;
    padding: 5px 14px;
    background: var(--bar);
    color: var(--muted);
    font-size: 13px;
    white-space: nowrap;
  }

  .mode {
    color: var(--accent);
    font-weight: 600;
  }

  .notice {
    color: var(--muted);
  }

  .error {
    color: var(--error);
  }

  .song {
    margin-left: auto;
    overflow: hidden;
    text-overflow: ellipsis;
  }
</style>
