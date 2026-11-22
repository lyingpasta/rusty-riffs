<script lang="ts">
  import { backend, type Marker } from './backend'
  import { actions } from './actions'
  import { player } from './player.svelte'
  import { formatSeconds } from './time'

  let { markers }: { markers: Marker[] } = $props()

  function rename(index: number, name: string): void {
    const renamed = markers.map((marker, position) => (position === index ? { ...marker, name } : marker))
    player.run(() => backend.setMarkers(renamed))
  }

  function remove(index: number): void {
    player.run(() => backend.setMarkers(markers.filter((_, position) => position !== index)))
  }
</script>

<section class="panel">
  <header>
    <h2>Markers</h2>
    <button onclick={actions.addMarkerAtPlayhead}>Add at playhead (M)</button>
  </header>
  {#if markers.length === 0}
    <p class="empty">No markers yet. Press M while playing to drop one.</p>
  {/if}
  <ol>
    {#each markers as marker, index (`${marker.seconds}-${index}`)}
      <li>
        <button class="jump" onclick={() => actions.jumpToMarker(index + 1)}>
          {index < 9 ? index + 1 : '·'}
          {formatSeconds(marker.seconds)}
        </button>
        <input
          type="text"
          value={marker.name}
          aria-label="Marker name"
          onchange={(event) => rename(index, event.currentTarget.value)}
          onkeydown={(event) => event.key === 'Enter' && event.currentTarget.blur()}
        />
        <button onclick={() => remove(index)} aria-label="Delete marker">✕</button>
      </li>
    {/each}
  </ol>
</section>

<style>
  ol {
    display: flex;
    flex-direction: column;
    gap: 6px;
    margin: 0;
    padding: 0;
    list-style: none;
  }

  li {
    display: flex;
    gap: 8px;
  }

  .jump {
    min-width: 96px;
    font-variant-numeric: tabular-nums;
    text-align: left;
  }

  input {
    flex: 1;
    padding: 6px 8px;
    border: 1px solid var(--border);
    border-radius: 6px;
    background: var(--surface);
    color: var(--text);
    font: inherit;
  }

  .empty {
    margin: 0;
    color: var(--muted);
  }
</style>
