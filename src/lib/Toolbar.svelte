<script lang="ts">
  import { actions } from './actions'
  import { backend, type SongSettings, type Trainer } from './backend'
  import { interaction } from './interaction.svelte'
  import { player } from './player.svelte'
  import { currentSpeed, loopSpans } from './songModel'
  import Group from './panel/Group.svelte'
  import Pad from './panel/Pad.svelte'
  import Stepper from './panel/Stepper.svelte'
  import TimeCell from './panel/TimeCell.svelte'

  const PREROLL_CHOICES_SECONDS = [0, 0.5, 1, 1.5, 2]
  const TRAINER_STEP_INCREMENT = 1
  const TRAINER_TARGET_INCREMENT = 5
  const NO_LOOP = ''

  let { settings, onopen }: { settings: SongSettings | null; onopen: () => void } = $props()

  const orderedLoops = $derived(
    settings ? loopSpans(settings).sort((left, right) => left.startSeconds - right.startSeconds) : [],
  )

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
  <Group label="Song">
    <Pad onclick={onopen} disabled={player.isLoading} title="Open a song">Open</Pad>
    <Pad
      onclick={actions.togglePlaying}
      disabled={!settings}
      isOn={Boolean(player.state?.isPlaying)}
      isSquare
      title="Play / pause (Space)">{player.state?.isPlaying ? '❚❚' : '▶'}</Pad
    >
    <TimeCell />
  </Group>

  {#if settings}
    <Group label="Speed">
      <Stepper
        label="speed"
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
        onclick={actions.toggleLoop}
        isOn={settings.isLoopEnabled}
        disabled={settings.activeLoopId === null}
        title="Loop on / off (o)">Loop</Pad
      >
      <Pad onclick={actions.startNewLoop} isOn={interaction.mode.kind === 'new-loop'} title="New loop from markers (n)">
        New
      </Pad>
    </Group>

    <div class="secondary">
      <Group label="Pitch" isSecondary>
        <Stepper
          label="pitch"
          value="{signed(settings.pitch.semitones)} st"
          ondecrement={() => actions.changePitch(-1)}
          onincrement={() => actions.changePitch(1)}
          onreset={actions.resetPitch}
        />
        <Stepper
          label="fine"
          value="{signed(settings.pitch.cents)}¢"
          ondecrement={() => actions.changeCents(-1)}
          onincrement={() => actions.changeCents(1)}
        />
      </Group>

      <Group label="Pre-roll" isSecondary>
        <select
          class="preroll-select"
          value={settings.prerollSeconds}
          onchange={(event) => player.run(() => backend.setPreroll(Number(event.currentTarget.value)))}
          title="Audio played before each loop restart (p)"
        >
          {#each PREROLL_CHOICES_SECONDS as seconds (seconds)}
            <option value={seconds}>{seconds === 0 ? 'Pre-roll off' : `Pre-roll ${seconds} s`}</option>
          {/each}
        </select>
      </Group>

      <Group label="Speed trainer" isSecondary>
        <Pad onclick={actions.toggleTrainer} isOn={settings.trainer.isEnabled} title="Speed trainer on / off (u)">
          Train
        </Pad>
        <Stepper
          label="step"
          value="+{settings.trainer.stepPercent}%"
          ondecrement={() => updateTrainer({ stepPercent: settings.trainer.stepPercent - TRAINER_STEP_INCREMENT })}
          onincrement={() => updateTrainer({ stepPercent: settings.trainer.stepPercent + TRAINER_STEP_INCREMENT })}
        />
        <Stepper
          label="to"
          value="{settings.trainer.targetPercent}%"
          ondecrement={() => updateTrainer({ targetPercent: settings.trainer.targetPercent - TRAINER_TARGET_INCREMENT })}
          onincrement={() => updateTrainer({ targetPercent: settings.trainer.targetPercent + TRAINER_TARGET_INCREMENT })}
        />
      </Group>
    </div>
  {/if}

  <span class="filler" aria-hidden="true"></span>

  <div class="end">
    <Group label="View" isSecondary>
      <Pad onclick={actions.cycleTheme} isSquare title="Theme: {interaction.theme.name} (;)">◐</Pad>
      <Pad onclick={actions.toggleCheatSheet} isSquare title="Keyboard shortcuts (?)">?</Pad>
    </Group>
  </div>
</nav>

<style>
  .bar {
    display: flex;
    flex-wrap: wrap;
    gap: 1px var(--group-gap);
    min-height: var(--bar-height);
    background: var(--bar);
  }

  .bar > :global(.group),
  .secondary > :global(.group),
  .end > :global(.group) {
    height: var(--bar-height);
  }

  .secondary,
  .end {
    display: flex;
    gap: var(--group-gap);
  }

  .filler {
    flex: 1;
    background: var(--wave-bg);
  }



  select {
    height: 100%;
    padding: 0 28px 0 12px;
  }

  .loop-select {
    min-width: 150px;
    max-width: 220px;
  }
</style>
