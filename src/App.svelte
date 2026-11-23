<script lang="ts">
  import { onMount } from 'svelte'
  import { interaction } from './lib/interaction.svelte'
  import { player } from './lib/player.svelte'
  import { findShortcut } from './lib/shortcuts'
  import { onSongFileDropped } from './lib/songPicker'
  import { updates } from './lib/updates.svelte'
  import Splash from './lib/brand/Splash.svelte'
  import CalibrationDialog from './lib/CalibrationDialog.svelte'
  import AboutDialog from './lib/AboutDialog.svelte'
  import CheatSheet from './lib/CheatSheet.svelte'
  import RenameDialog from './lib/RenameDialog.svelte'
  import StatusLine from './lib/StatusLine.svelte'
  import Toolbar from './lib/Toolbar.svelte'
  import Waveform from './lib/Waveform.svelte'

  const MINIMUM_STARTUP_SPLASH_MILLISECONDS = 600
  const SONG_LOADING_SPLASH_DELAY_MILLISECONDS = 200

  let isStarting = $state(true)
  let isSongLoadingSlow = $state(false)

  const splashStatus = $derived(
    player.loadingName ? `Opening ${player.loadingName}…` : isStarting ? 'Opening your last song…' : 'Opening…',
  )

  $effect(() => {
    if (!player.isLoading) {
      isSongLoadingSlow = false
      return
    }
    const timer = setTimeout(() => (isSongLoadingSlow = true), SONG_LOADING_SPLASH_DELAY_MILLISECONDS)
    return () => clearTimeout(timer)
  })

  function wait(milliseconds: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, milliseconds))
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
    const startup = disconnect.then(() => player.openLast()).catch((error) => (player.error = String(error)))
    Promise.all([startup, wait(MINIMUM_STARTUP_SPLASH_MILLISECONDS)]).then(() => (isStarting = false))
    const unlistenDrop = onSongFileDropped((path) => player.open(path))
    updates.check()
    return () => {
      disconnect.then((stop) => stop()).catch(() => undefined)
      unlistenDrop.then((unlisten) => unlisten())
    }
  })
</script>

<svelte:window onkeydown={handleKeydown} />

<div class="app">
  <Toolbar settings={player.state?.song ? player.state.settings : null} />
  <main>
    <Waveform />
  </main>
  <StatusLine />
</div>

{#if interaction.renameTarget}
  <RenameDialog target={interaction.renameTarget} />
{/if}

{#if isStarting || isSongLoadingSlow}
  <Splash status={splashStatus} />
{/if}

{#if interaction.isCalibrationOpen}
  <CalibrationDialog />
{/if}

{#if interaction.isCheatSheetOpen}
  <CheatSheet />
{/if}

{#if interaction.isAboutOpen}
  <AboutDialog />
{/if}
