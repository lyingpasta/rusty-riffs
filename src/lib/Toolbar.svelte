<script lang="ts">
  import { actions } from './actions'
  import { backend, type SongSettings, type Trainer } from './backend'
  import { interaction } from './interaction.svelte'
  import { player } from './player.svelte'
  import { timing } from './timing.svelte'
  import { currentSpeed, loopSpans } from './songModel'
  import Group from './panel/Group.svelte'
  import Pad from './panel/Pad.svelte'
  import Stepper from './panel/Stepper.svelte'
  import TimeCell from './panel/TimeCell.svelte'
  import EditableValue from './panel/EditableValue.svelte'
  import HorizontalScroller from './HorizontalScroller.svelte'

  const TRAINER_STEP_INCREMENT = 1
  const TRAINER_TARGET_INCREMENT = 5
  const TIMING_STEP_MILLISECONDS = 10
  const NO_LOOP = ''

  let { settings }: { settings: SongSettings | null } = $props()

  const orderedLoops = $derived(
    settings ? loopSpans(settings).sort((left, right) => left.startSeconds - right.startSeconds) : [],
  )
  const prerollLabel = $derived(settings && settings.prerollSeconds > 0 ? `${settings.prerollSeconds}s` : 'off')

  function signed(value: number): string {
    return value > 0 ? `+${value}` : `${value}`
  }

  function updateTrainer(change: Partial<Trainer>): void {
    if (!settings) return
    const trainer = settings.trainer
    player.run(() => backend.setTrainer({ ...trainer, ...change }))
  }

  function chooseLoop(value: string): void {
    actions.activateLoop(value === NO_LOOP ? null : Number(value))
  }
</script>

<nav class="bar">
  <HorizontalScroller>
    <div class="row">
      <Group label="Song">
        <Pad icon="open" onclick={actions.openSong} disabled={player.isLoading} title="Open a song (O)" />
        <Pad
          icon={player.state?.isPlaying ? 'pause' : 'play'}
          onclick={actions.togglePlaying}
          disabled={!settings}
          isOn={Boolean(player.state?.isPlaying)}
          title="Play / pause (Space)"
        />
        <TimeCell />
      </Group>

      {#if settings}
        <Group label="Speed">
          <Stepper
            label="Speed (j / k)"
            icon="speed"
            value="{Math.round(currentSpeed(settings))}%"
            ondecrement={() => actions.changeSpeed(-1)}
            onincrement={() => actions.changeSpeed(1)}
            onreset={actions.resetSpeed}
          />
        </Group>

        <Group label="Loop">
          <select
            class="loop-select"
            value={settings.activeLoopId?.toString() ?? NO_LOOP}
            onchange={(event) => chooseLoop(event.currentTarget.value)}
            title="Saved loops ([ / ])"
          >
            <option value={NO_LOOP}>No loop</option>
            {#each orderedLoops as span (span.loop.id)}
              <option value={span.loop.id.toString()}>{span.loop.name}</option>
            {/each}
          </select>
          <Pad
            icon="loop"
            onclick={actions.toggleLoop}
            isOn={settings.isLoopEnabled}
            disabled={settings.activeLoopId === null}
            title="Loop on / off (o)"
          />
          <Pad
            icon="new-loop"
            onclick={actions.startNewLoop}
            isOn={interaction.mode.kind === 'new-loop'}
            title="New loop from markers (n)"
          />
        </Group>

        <div class="secondary">
          <Group label="Pitch" isSecondary>
            <Stepper
              label="Pitch in semitones"
              icon="pitch"
              value={signed(settings.pitch.semitones)}
              ondecrement={() => actions.changePitch(-1)}
              onincrement={() => actions.changePitch(1)}
              onreset={actions.resetPitch}
            />
            <Stepper
              label="Fine tune in cents"
              icon="fine"
              value="{signed(settings.pitch.cents)}¢"
              ondecrement={() => actions.changeCents(-1)}
              onincrement={() => actions.changeCents(1)}
            />
          </Group>

          <Group label="Practice" isSecondary>
            <Pad icon="preroll" onclick={actions.cyclePreroll} isOn={settings.prerollSeconds > 0} title="Pre-roll before each loop restart (p)">
              {prerollLabel}
            </Pad>
            <Pad icon="trainer" onclick={actions.toggleTrainer} isOn={settings.trainer.isEnabled} title="Speed trainer on / off (u)" />
            <Stepper
              label="Trainer step per loop"
              value="+{settings.trainer.stepPercent}%"
              ondecrement={() => updateTrainer({ stepPercent: settings.trainer.stepPercent - TRAINER_STEP_INCREMENT })}
              onincrement={() => updateTrainer({ stepPercent: settings.trainer.stepPercent + TRAINER_STEP_INCREMENT })}
            />
            <Stepper
              label="Trainer target speed"
              value="→{settings.trainer.targetPercent}%"
              ondecrement={() => updateTrainer({ targetPercent: settings.trainer.targetPercent - TRAINER_TARGET_INCREMENT })}
              onincrement={() => updateTrainer({ targetPercent: settings.trainer.targetPercent + TRAINER_TARGET_INCREMENT })}
            />
          </Group>

          <Group label="Timing" isSecondary>
            <Pad icon="snap" onclick={actions.toggleSnap} isOn={timing.isSnapEnabled} title="Snap new markers to note attacks" />
            <Stepper
              label="Timing offset for markers dropped while playing"
              ondecrement={() => actions.changeTimingOffset(-TIMING_STEP_MILLISECONDS)}
              onincrement={() => actions.changeTimingOffset(TIMING_STEP_MILLISECONDS)}
            >
              <EditableValue
                label="Timing offset for markers dropped while playing"
                icon="timing"
                value={timing.offsetMilliseconds}
                unit="ms"
                oncommit={actions.setTimingOffset}
              />
            </Stepper>
            <Pad icon="calibrate" onclick={actions.openCalibration} title="Calibrate timing by tapping along to clicks" />
          </Group>
        </div>
      {/if}

      <span class="filler" aria-hidden="true"></span>

      <Group label="View" isSecondary>
        <Pad icon="theme" onclick={actions.cycleTheme} title="Theme: {interaction.theme.name} (;)" />
        <Pad icon="help" onclick={actions.toggleCheatSheet} title="Keyboard shortcuts (?)" />
        <Pad icon="info" onclick={actions.toggleAbout} title="About and updates (a)" />
      </Group>
    </div>
  </HorizontalScroller>
</nav>

<style>
  .bar {
    flex: none;
    background: var(--bar);
  }

  .row {
    display: flex;
    gap: 1px;
    height: var(--bar-height);
  }

  .bar :global(.group) {
    flex: none;
    height: var(--bar-height);
  }

  .secondary {
    display: flex;
    flex: none;
    gap: 1px;
  }

  .filler {
    flex: 1;
    min-width: 0;
    background: var(--wave-bg);
  }

  select {
    height: 100%;
    padding: 0 28px 0 12px;
  }

  .loop-select {
    width: 140px;
  }
</style>
