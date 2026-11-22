<script lang="ts">
  import { onMount } from 'svelte'
  import { backend } from './lib/backend'
  import { player } from './lib/player.svelte'
  import { onSongFileDropped, pickSongFile } from './lib/songPicker'
  import PositionReadout from './lib/PositionReadout.svelte'
  import Waveform from './lib/Waveform.svelte'

  async function chooseSong(): Promise<void> {
    const path = await pickSongFile()
    if (path) await player.open(path)
  }

  function togglePlaying(): void {
    if (!player.state?.song) return
    const isPlaying = player.state.isPlaying
    player.run(() => backend.setPlaying(!isPlaying))
  }

  function handleKeydown(event: KeyboardEvent): void {
    if (event.key !== ' ') return
    event.preventDefault()
    togglePlaying()
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
    <button onclick={togglePlaying} disabled={!player.state?.song}>
      {player.state?.isPlaying ? 'Pause' : 'Play'}
    </button>
    <PositionReadout />
  </section>
</main>
