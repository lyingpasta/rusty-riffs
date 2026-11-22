<script lang="ts" module>
  export type IconName =
    | 'open'
    | 'play'
    | 'pause'
    | 'speed'
    | 'loop'
    | 'new-loop'
    | 'pitch'
    | 'fine'
    | 'preroll'
    | 'snap'
    | 'timing'
    | 'calibrate'
    | 'trainer'
    | 'theme'
    | 'help'

  const STROKED: Partial<Record<IconName, string>> = {
    open: 'M2 4.5h4l1.5 1.5H14v6.5H2z',
    speed: 'M3 11.5a5 5 0 1 1 10 0M8 11.5l2.5-3',
    loop: 'M3 7.5V6a2 2 0 0 1 2-2h7M10 2l2 2-2 2M13 8.5V10a2 2 0 0 1-2 2H4M6 14l-2-2 2-2',
    'new-loop': 'M8 3.5v9M3.5 8h9',
    pitch: 'M5.5 2v5a2.5 2.5 0 0 0 5 0V2M8 9.5V14',
    fine: 'M2 9c2-3.5 4-3.5 6 0s4 3.5 6 0',
    preroll: 'M3.5 4v8M13 4 7 8l6 4z',
    snap: 'M4 2.5V8a4 4 0 0 0 8 0V2.5M4 5.5h2.5M9.5 5.5H12',
    timing: 'M8 14a5 5 0 1 0 0-10 5 5 0 0 0 0 10zM8 6.5V9l1.5 1.5M6.5 2h3',
    calibrate: 'M8 13.5a5.5 5.5 0 1 0 0-11 5.5 5.5 0 0 0 0 11zM8 10a2 2 0 1 0 0-4 2 2 0 0 0 0 4z',
    trainer: 'M2 12l4-4 3 3 5-6M10.5 5H14v3.5',
    theme: 'M8 13.5a5.5 5.5 0 1 0 0-11 5.5 5.5 0 0 0 0 11z',
    help: 'M6 6a2 2 0 1 1 2.8 1.8C8.3 8 8 8.5 8 9v.5M8 12v.5',
  }

  const FILLED: Partial<Record<IconName, string>> = {
    play: 'M5 3.5v9l7.5-4.5z',
    pause: 'M4.5 3.5h2.5v9H4.5zM9 3.5h2.5v9H9z',
    theme: 'M8 2.5a5.5 5.5 0 0 0 0 11z',
  }
</script>

<script lang="ts">
  let { name }: { name: IconName } = $props()
</script>

<svg class="icon" viewBox="0 0 16 16" aria-hidden="true">
  {#if STROKED[name]}
    <path d={STROKED[name]} fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" />
  {/if}
  {#if FILLED[name]}
    <path d={FILLED[name]} fill="currentColor" />
  {/if}
</svg>

<style>
  .icon {
    display: block;
    width: 16px;
    height: 16px;
    flex: none;
  }
</style>
