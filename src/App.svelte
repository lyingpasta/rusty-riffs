<script lang="ts">
  import { onMount } from 'svelte'
  import { actions } from './lib/actions'
  import { player } from './lib/player.svelte'
  import { createShortcuts, findShortcut } from './lib/shortcuts'
  import { onSongFileDropped, pickSongFile } from './lib/songPicker'
  import CheatSheet from './lib/CheatSheet.svelte'
  import Controls from './lib/Controls.svelte'
  import PositionReadout from './lib/PositionReadout.svelte'
  import Waveform from './lib/Waveform.svelte'

  let isCheatSheetOpen = $state(false)
  const shortcuts = createShortcuts(() => (isCheatSheetOpen = !isCheatSheetOpen))

  async function chooseSong(): Promise<void> {
    const path = await pickSongFile()
    if (path) await player.open(path)
  }

  function handleKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') isCheatSheetOpen = false
    const shortcut = findShortcut(shortcuts, event)
    if (!shortcut) return
    event.preventDefault()
    shortcut.run(event)
  }

  onMount(() => {
    player.connect().catch((error) => (player.error = String(error)))
    const unlistenDrop = onSongFileDropped((path) => player.open(path))
    return () => unlistenDrop.then((unlisten) => unlisten())
  })
</script>

<svelte:window onkeydown={handleKeydown} />

<main>
  <header>
    <button onclick={chooseSong} disabled={player.isLoading}>Open song…</button>
    <h1>{player.isLoading ? 'Loading…' : (player.state?.song?.name ?? 'Drop an audio file here')}</h1>
  </header>

  {#if player.error}
    <p class="error" role="alert">{player.error}</p>
  {/if}

  <Waveform />

  <section class="transport">
    <button onclick={actions.togglePlaying} disabled={!player.state?.song}>
      {player.state?.isPlaying ? 'Pause' : 'Play'}
    </button>
    <PositionReadout />
    <button class="help" onclick={() => (isCheatSheetOpen = true)}>Shortcuts (?)</button>
  </section>

  {#if player.state?.song}
    <Controls settings={player.state.settings} />
  {/if}
</main>

{#if isCheatSheetOpen}
  <CheatSheet {shortcuts} onclose={() => (isCheatSheetOpen = false)} />
{/if}
