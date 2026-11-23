<script lang="ts">
  import { LOGO_PATH, LOGO_STROKE_WIDTH, LOGO_VIEW_BOX } from './logoPath'

  let { size, isDrawingIn = false }: { size: number; isDrawingIn?: boolean } = $props()
</script>

<svg class="logo" class:drawing-in={isDrawingIn} viewBox={LOGO_VIEW_BOX} width={size} height={size} aria-hidden="true">
  <path
    d={LOGO_PATH}
    pathLength="1"
    fill="none"
    stroke="currentColor"
    stroke-width={LOGO_STROKE_WIDTH}
    stroke-linecap="round"
    stroke-linejoin="round"
  />
</svg>

<style>
  .logo {
    display: block;
    color: var(--accent);
  }

  .drawing-in path {
    stroke-dasharray: 1;
    stroke-dashoffset: 1;
    animation: draw-in 1100ms cubic-bezier(0.65, 0, 0.35, 1) 150ms forwards;
  }

  @keyframes draw-in {
    to {
      stroke-dashoffset: 0;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .drawing-in path {
      stroke-dashoffset: 0;
      animation: none;
    }
  }
</style>
