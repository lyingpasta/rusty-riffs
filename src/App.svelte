<script lang="ts">
  import { onMount } from 'svelte'
  import { interaction } from './lib/interaction.svelte'
  import { player } from './lib/player.svelte'
  import { findShortcut } from './lib/shortcuts'
  import { onSongFileDropped, pickSongFile } from './lib/songPicker'
  import CalibrationDialog from './lib/CalibrationDialog.svelte'
  import CheatSheet from './lib/CheatSheet.svelte'
  import RenameDialog from './lib/RenameDialog.svelte'
  import StatusLine from './lib/StatusLine.svelte'
  import Toolbar from './lib/Toolbar.svelte'
  import Waveform from './lib/Waveform.svelte'

  async function chooseSong(): Promise<void> {
    const path = await pickSongFile()
    if (path) await player.open(path)
  }

  function handleKeydown(event: KeyboardEvent): void {
    if (interaction.renameTarget || interaction.isCalibrationOpen) return
    const shortcut = findShortcut(event, interaction.mode.kind)
    if (!shortcut) return
    event.preventDefault()
    shortcut.run(event)
  }

  onMount(() => {
    const disconnect = player.connect()
    disconnect.catch((error) => (player.error = String(error)))
    const unlistenDrop = onSongFileDropped((path) => player.open(path))
    return () => {
      disconnect.then((stop) => stop()).catch(() => undefined)
      unlistenDrop.then((unlisten) => unlisten())
    }
  })
</script>

<svelte:window onkeydown={handleKeydown} />

<div class="app">
  <Toolbar settings={player.state?.song ? player.state.settings : null} onopen={chooseSong} />
  <main>
    <Waveform />
  </main>
  <StatusLine />
</div>

{#if interaction.renameTarget}
  <RenameDialog target={interaction.renameTarget} />
{/if}

{#if interaction.isCalibrationOpen}
  <CalibrationDialog />
{/if}

{#if interaction.isCheatSheetOpen}
  <CheatSheet />
{/if}
