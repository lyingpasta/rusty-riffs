import { actions } from './actions'
import { requestZoom } from './waveformViewport'
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
  { group: 'Playback', mode: 'normal', keys: ['O'], label: 'O', description: 'Open a song', run: actions.openSong },
  { group: 'Playback', mode: 'any', keys: [' '], label: 'Space', description: 'Play / pause', run: actions.togglePlaying },
  { group: 'Playback', mode: 'any', keys: ['h', 'l'], label: 'h / l', description: 'Nudge back / forward (finer when zoomed in)', run: (event) => actions.nudge(event.key === 'l' ? 1 : -1, false) },
  { group: 'Playback', mode: 'any', keys: ['H', 'L'], label: 'H / L', description: 'Nudge back / forward 5× further', run: (event) => actions.nudge(event.key === 'L' ? 1 : -1, true) },
  { group: 'Playback', mode: 'normal', keys: ['0'], label: '0', description: 'Jump to loop start (or song start)', run: actions.jumpToStart },
  { group: 'Speed', mode: 'any', keys: ['j', 'k'], label: 'j / k', description: 'Speed −5% / +5%', run: (event) => actions.changeSpeed(event.key === 'k' ? 1 : -1) },
  { group: 'Markers', mode: 'normal', keys: ['m'], label: 'm', description: 'Add marker at playhead', run: actions.addMarker },
  { group: 'Markers', mode: 'normal', keys: [',', '.'], label: ', / .', description: 'Previous / next marker', run: (event) => actions.jumpToMarker(event.key === '.' ? 1 : -1) },
  { group: 'Markers', mode: 'normal', keys: ['i'], label: 'i', description: 'Rename marker at playhead', run: actions.renameMarkerAtPlayhead },
  { group: 'Markers', mode: 'normal', keys: ['d'], label: 'd', description: 'Delete marker at playhead (and its loops)', run: actions.deleteMarkerAtPlayhead },
  { group: 'Selection', mode: 'normal', keys: ['v'], label: 'v', description: 'Start a selection at the playhead', run: actions.startSelection },
  { group: 'Selection', mode: 'selection', keys: ['h', 'l'], label: 'h / l', description: 'Move the selection end back / forward', run: (event) => actions.moveSelectionEnd(event.key === 'l' ? 1 : -1, false) },
  { group: 'Selection', mode: 'selection', keys: ['H', 'L'], label: 'H / L', description: 'Move the selection end 5× further', run: (event) => actions.moveSelectionEnd(event.key === 'L' ? 1 : -1, true) },
  { group: 'Selection', mode: 'selection', keys: [',', '.'], label: ', / .', description: 'Snap the selection end to the previous / next marker', run: (event) => actions.snapSelectionEnd(event.key === '.' ? 1 : -1) },
  { group: 'Selection', mode: 'selection', keys: ['Enter'], label: 'Enter', description: 'Make a loop from the selection', run: actions.loopSelection },
  { group: 'Selection', mode: 'selection', keys: ['d'], label: 'd', description: 'Delete every marker in the selection', run: actions.deleteMarkersInSelection },
  { group: 'Loops', mode: 'normal', keys: ['n'], label: 'n', description: 'New loop from marker at playhead', run: actions.startNewLoop },
  { group: 'Loops', mode: 'new-loop', keys: [',', '.'], label: ', / .', description: 'Move the new loop’s end marker', run: (event) => actions.moveNewLoopEnd(event.key === '.' ? 1 : -1) },
  { group: 'Loops', mode: 'new-loop', keys: ['Enter'], label: 'Enter', description: 'Save and activate the new loop', run: actions.confirmNewLoop },
  { group: 'Loops', mode: 'normal', keys: ['[', ']'], label: '[ / ]', description: 'Previous / next saved loop', run: (event) => actions.switchLoop(event.key === ']' ? 1 : -1) },
  { group: 'Loops', mode: 'normal', keys: ['o'], label: 'o', description: 'Loop on / off', run: actions.toggleLoop },
  { group: 'Loops', mode: 'normal', keys: ['I'], label: 'I', description: 'Rename active loop', run: actions.renameActiveLoop },
  { group: 'Loops', mode: 'normal', keys: ['D'], label: 'D', description: 'Delete active loop', run: actions.deleteActiveLoop },
  { group: 'View', mode: 'any', keys: ['=', '+', '-'], label: '+ / -', description: 'Zoom in / out around the playhead', run: (event) => requestZoom(event.key !== '-') },
  { group: 'Practice', mode: 'normal', keys: ['u'], label: 'u', description: 'Speed trainer on / off', run: actions.toggleTrainer },
  { group: 'Practice', mode: 'normal', keys: ['p'], label: 'p', description: 'Pre-roll: off → 1 s → 2 s', run: actions.cyclePreroll },
  { group: 'View', mode: 'any', keys: [';'], label: ';', description: 'Next colour theme', run: actions.cycleTheme },
  { group: 'Help', mode: 'any', keys: ['?'], label: '?', description: 'Show / hide shortcuts', run: actions.toggleCheatSheet },
  { group: 'Help', mode: 'any', keys: ['a'], label: 'a', description: 'About, version and updates', run: actions.toggleAbout },
  { group: 'Help', mode: 'any', keys: ['Escape'], label: 'Esc', description: 'Cancel selection or new loop / close help, About or a popup', run: actions.cancel },
]

function isTypingInField(event: KeyboardEvent): boolean {
  const target = event.target
  if (target instanceof HTMLInputElement) return TEXT_INPUT_TYPES.has(target.type)
  return target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement
}

export function findShortcut(event: KeyboardEvent, mode: Mode['kind']): Shortcut | undefined {
  if (isTypingInField(event) || event.ctrlKey || event.metaKey || event.altKey) return undefined
  const candidates = shortcuts.filter((shortcut) => shortcut.keys.includes(event.key))
  return candidates.find((shortcut) => shortcut.mode === mode) ?? candidates.find((shortcut) => shortcut.mode === 'any')
}
