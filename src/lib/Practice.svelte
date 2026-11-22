<script lang="ts">
  import { backend, type SongSettings, type Trainer } from './backend'
  import { player } from './player.svelte'

  const PREROLL_CHOICES_SECONDS = [0, 0.5, 1, 1.5, 2]

  let { settings }: { settings: SongSettings } = $props()

  function updateTrainer(change: Partial<Trainer>): void {
    player.run(() => backend.setTrainer({ ...settings.trainer, ...change }))
  }
</script>

<section class="panel">
  <h2>Practice</h2>

  <label>
    Pre-roll (P)
    <select
      value={settings.prerollSeconds}
      onchange={(event) => player.run(() => backend.setPreroll(Number(event.currentTarget.value)))}
    >
      {#each PREROLL_CHOICES_SECONDS as seconds (seconds)}
        <option value={seconds}>{seconds === 0 ? 'Off' : `${seconds} s before A`}</option>
      {/each}
    </select>
  </label>

  <label>
    <input
      type="checkbox"
      checked={settings.trainer.isEnabled}
      onchange={(event) => updateTrainer({ isEnabled: event.currentTarget.checked })}
    />
    Speed trainer (T)
  </label>

  <div class="trainer">
    <label>
      +
      <input
        type="number"
        min="1"
        max="50"
        value={settings.trainer.stepPercent}
        onchange={(event) => updateTrainer({ stepPercent: event.currentTarget.valueAsNumber })}
      />
      % per loop
    </label>
    <label>
      up to
      <input
        type="number"
        min="10"
        max="150"
        value={settings.trainer.targetPercent}
        onchange={(event) => updateTrainer({ targetPercent: event.currentTarget.valueAsNumber })}
      />
      %
    </label>
  </div>

  <p class="hint">
    {#if settings.trainer.isEnabled && !settings.isLoopEnabled}
      The trainer speeds up each time the loop repeats. Turn the loop on to start it.
    {:else if settings.trainer.isEnabled}
      Now {Math.round(settings.speedPercent)}%, heading for {settings.trainer.targetPercent}%.
    {:else}
      Changing speed by hand or moving the loop turns the trainer off.
    {/if}
  </p>
</section>

<style>
  label {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .trainer {
    display: flex;
    gap: 16px;
  }

  input[type='number'],
  select {
    padding: 4px 6px;
    border: 1px solid var(--border);
    border-radius: 6px;
    background: var(--surface);
    color: var(--text);
    font: inherit;
  }

  input[type='number'] {
    width: 64px;
  }

  input[type='checkbox'] {
    accent-color: var(--accent);
  }

  .hint {
    margin: 0;
    color: var(--muted);
  }
</style>
