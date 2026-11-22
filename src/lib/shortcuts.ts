import { actions } from './actions'
import { requestZoom } from './waveformZoom'
import type { Mode } from './interaction.svelte'

export type ShortcutMode = Mode['kind'] | 'any'

export interface Shortcut {
  keys: string[]
  label: string
  description: string
  group: string
  mode: ShortcutMode
  run: (event: KeyboardEvent) => void
}

const TEXT_INPUT_TYPES = new Set(['text', 'number', 'search'])

export const shortcuts: Shortcut[] = [
  { group: 'Playback', mode: 'any', keys: [' '], label: 'Space', description: 'Play / pause', run: actions.togglePlaying },
  { group: 'Playback', mode: 'any', keys: ['h', 'l'], label: 'h / l', description: 'Nudge −1 s / +1 s', run: (event) => actions.nudge(event.key === 'l' ? 1 : -1, false) },
  { group: 'Playback', mode: 'any', keys: ['H', 'L'], label: 'H / L', description: 'Nudge −5 s / +5 s', run: (event) => actions.nudge(event.key === 'L' ? 1 : -1, true) },
  { group: 'Playback', mode: 'normal', keys: ['0'], label: '0', description: 'Jump to loop start (or song start)', run: actions.jumpToStart },
  { group: 'Speed', mode: 'any', keys: ['j', 'k'], label: 'j / k', description: 'Speed −5% / +5%', run: (event) => actions.changeSpeed(event.key === 'k' ? 1 : -1) },
  { group: 'Markers', mode: 'normal', keys: ['m'], label: 'm', description: 'Add marker at playhead', run: actions.addMarker },
  { group: 'Markers', mode: 'normal', keys: [',', '.'], label: ', / .', description: 'Previous / next marker', run: (event) => actions.jumpToMarker(event.key === '.' ? 1 : -1) },
  { group: 'Markers', mode: 'normal', keys: ['i'], label: 'i', description: 'Rename marker at playhead', run: actions.renameMarkerAtPlayhead },
  { group: 'Markers', mode: 'normal', keys: ['Backspace'], label: 'Backspace', description: 'Delete marker at playhead (and its loops)', run: actions.deleteMarkerAtPlayhead },
  { group: 'Loops', mode: 'normal', keys: ['n'], label: 'n', description: 'New loop from marker at playhead', run: actions.startNewLoop },
  { group: 'Loops', mode: 'new-loop', keys: [',', '.'], label: ', / .', description: 'Move the new loop’s end marker', run: (event) => actions.moveNewLoopEnd(event.key === '.' ? 1 : -1) },
  { group: 'Loops', mode: 'new-loop', keys: ['Enter'], label: 'Enter', description: 'Save and activate the new loop', run: actions.confirmNewLoop },
  { group: 'Loops', mode: 'normal', keys: ['[', ']'], label: '[ / ]', description: 'Previous / next saved loop', run: (event) => actions.switchLoop(event.key === ']' ? 1 : -1) },
  { group: 'Loops', mode: 'normal', keys: ['o'], label: 'o', description: 'Loop on / off', run: actions.toggleLoop },
  { group: 'Loops', mode: 'normal', keys: ['I'], label: 'I', description: 'Rename active loop', run: actions.renameActiveLoop },
  { group: 'Loops', mode: 'normal', keys: ['Shift+Backspace'], label: 'Shift + Backspace', description: 'Delete active loop', run: actions.deleteActiveLoop },
  { group: 'View', mode: 'any', keys: ['=', '+', '-'], label: '+ / -', description: 'Zoom in / out around the playhead', run: (event) => requestZoom(event.key !== '-') },
  { group: 'Practice', mode: 'normal', keys: ['u'], label: 'u', description: 'Speed trainer on / off', run: actions.toggleTrainer },
  { group: 'Practice', mode: 'normal', keys: ['p'], label: 'p', description: 'Pre-roll: off → 1 s → 2 s', run: actions.cyclePreroll },
  { group: 'View', mode: 'any', keys: [';'], label: ';', description: 'Next colour theme', run: actions.cycleTheme },
  { group: 'Help', mode: 'any', keys: ['?'], label: '?', description: 'Show / hide shortcuts', run: actions.toggleCheatSheet },
  { group: 'Help', mode: 'any', keys: ['Escape'], label: 'Esc', description: 'Cancel new loop / close help', run: actions.cancel },
]

function keyName(event: KeyboardEvent): string {
  if (event.key === 'Backspace' && event.shiftKey) return 'Shift+Backspace'
  return event.key
}

function isTypingInField(event: KeyboardEvent): boolean {
  const target = event.target
  if (target instanceof HTMLInputElement) return TEXT_INPUT_TYPES.has(target.type)
  return target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement
}

export function findShortcut(event: KeyboardEvent, mode: Mode['kind']): Shortcut | undefined {
  if (isTypingInField(event) || event.ctrlKey || event.metaKey || event.altKey) return undefined
  const key = keyName(event)
  const candidates = shortcuts.filter((shortcut) => shortcut.keys.includes(key))
  return candidates.find((shortcut) => shortcut.mode === mode) ?? candidates.find((shortcut) => shortcut.mode === 'any')
}
