<script lang="ts">
  import { backend, type SongSettings } from './backend'
  import { actions } from './actions'
  import { player } from './player.svelte'
  import { formatSeconds } from './time'

  const MIN_SPEED_PERCENT = 10
  const MAX_SPEED_PERCENT = 150
  const MAX_SEMITONES = 12
  const MAX_CENTS = 50

  let { settings }: { settings: SongSettings } = $props()

  const hasLoopRange = $derived(settings.loopStartSeconds !== null && settings.loopEndSeconds !== null)

  function setSemitones(semitones: number): void {
    player.run(() => backend.setPitch({ ...settings.pitch, semitones }))
  }

  function setCents(cents: number): void {
    player.run(() => backend.setPitch({ ...settings.pitch, cents }))
  }

  function formatLoopPoint(seconds: number | null): string {
    return seconds === null ? '—' : formatSeconds(seconds)
  }
</script>

<section class="controls">
  <label>
    <span>Speed <strong>{Math.round(settings.speedPercent)}%</strong></span>
    <input
      type="range"
      min={MIN_SPEED_PERCENT}
      max={MAX_SPEED_PERCENT}
      step="1"
      value={settings.speedPercent}
      oninput={(event) => player.run(() => backend.setSpeed(event.currentTarget.valueAsNumber))}
    />
    <button onclick={() => player.run(() => backend.setSpeed(100))}>100%</button>
  </label>

  <label>
    <span>Pitch <strong>{settings.pitch.semitones > 0 ? '+' : ''}{settings.pitch.semitones} st</strong></span>
    <input
      type="range"
      min={-MAX_SEMITONES}
      max={MAX_SEMITONES}
      step="1"
      value={settings.pitch.semitones}
      oninput={(event) => setSemitones(event.currentTarget.valueAsNumber)}
    />
    <button onclick={() => player.run(() => backend.setPitch({ semitones: 0, cents: 0 }))}>Reset</button>
  </label>

  <label>
    <span>Fine <strong>{settings.pitch.cents > 0 ? '+' : ''}{settings.pitch.cents} ¢</strong></span>
    <input
      type="range"
      min={-MAX_CENTS}
      max={MAX_CENTS}
      step="1"
      value={settings.pitch.cents}
      oninput={(event) => setCents(event.currentTarget.valueAsNumber)}
    />
  </label>

  <div class="loop">
    <span>
      Loop {formatLoopPoint(settings.loopStartSeconds)} → {formatLoopPoint(settings.loopEndSeconds)}
    </span>
    <button onclick={actions.setLoopStartAtPlayhead}>Set A</button>
    <button onclick={actions.setLoopEndAtPlayhead}>Set B</button>
    <button onclick={actions.toggleLoop} disabled={!hasLoopRange} aria-pressed={settings.isLoopEnabled}>
      {settings.isLoopEnabled ? 'Loop on' : 'Loop off'}
    </button>
    <button onclick={actions.clearLoop} disabled={!hasLoopRange}>Clear</button>
  </div>
</section>

<style>
  .controls {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: 12px 24px;
  }

  label,
  .loop {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  label span {
    min-width: 110px;
  }

  input[type='range'] {
    flex: 1;
    accent-color: var(--accent);
  }

  button[aria-pressed='true'] {
    border-color: var(--accent);
    color: var(--accent);
  }
</style>
