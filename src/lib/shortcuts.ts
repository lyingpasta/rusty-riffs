import { actions } from './actions'

export interface Shortcut {
  keys: string
  description: string
  matches: (event: KeyboardEvent) => boolean
  run: (event: KeyboardEvent) => void
}

const MARKER_KEY_PATTERN = /^Digit([1-9])$/

function plainKey(key: string): (event: KeyboardEvent) => boolean {
  return (event) => event.key === key && !event.shiftKey && !event.ctrlKey && !event.metaKey && !event.altKey
}

function shiftedKey(key: string): (event: KeyboardEvent) => boolean {
  return (event) => event.key === key && event.shiftKey && !event.ctrlKey && !event.metaKey && !event.altKey
}

function markerPosition(event: KeyboardEvent): number {
  return Number(MARKER_KEY_PATTERN.exec(event.code)?.[1])
}

export function createShortcuts(toggleCheatSheet: () => void): Shortcut[] {
  return [
    { keys: 'Space', description: 'Play / pause', matches: plainKey(' '), run: actions.togglePlaying },
    { keys: '[', description: 'Set loop start (A) at playhead', matches: plainKey('['), run: actions.setLoopStartAtPlayhead },
    { keys: ']', description: 'Set loop end (B) at playhead', matches: plainKey(']'), run: actions.setLoopEndAtPlayhead },
    { keys: 'L', description: 'Loop on / off', matches: plainKey('l'), run: actions.toggleLoop },
    { keys: 'Shift + L', description: 'Clear loop', matches: shiftedKey('L'), run: actions.clearLoop },
    { keys: '↑ / ↓', description: 'Speed ±5%', matches: (event) => plainKey('ArrowUp')(event) || plainKey('ArrowDown')(event), run: (event) => actions.changeSpeed(event.key === 'ArrowUp' ? 1 : -1) },
    { keys: 'Shift + ↑ / ↓', description: 'Pitch ±1 semitone', matches: (event) => shiftedKey('ArrowUp')(event) || shiftedKey('ArrowDown')(event), run: (event) => actions.changePitch(event.key === 'ArrowUp' ? 1 : -1) },
    { keys: '← / →', description: 'Nudge ±1 second', matches: (event) => plainKey('ArrowLeft')(event) || plainKey('ArrowRight')(event), run: (event) => actions.nudge(event.key === 'ArrowRight' ? 1 : -1) },
    { keys: 'Home', description: 'Jump to loop start (or song start)', matches: plainKey('Home'), run: actions.jumpToStart },
    { keys: '1 – 9', description: 'Jump to marker', matches: (event) => MARKER_KEY_PATTERN.test(event.code) && !event.shiftKey && !event.ctrlKey, run: (event) => actions.jumpToMarker(markerPosition(event)) },
    { keys: 'M', description: 'Add marker at playhead', matches: plainKey('m'), run: actions.addMarkerAtPlayhead },
    { keys: 'T', description: 'Speed trainer on / off', matches: plainKey('t'), run: actions.toggleTrainer },
    { keys: 'P', description: 'Pre-roll: off → 1s → 2s', matches: plainKey('p'), run: actions.cyclePreroll },
    { keys: '?', description: 'Show / hide shortcuts', matches: (event) => event.key === '?', run: toggleCheatSheet },
  ]
}

const TEXT_INPUT_TYPES = new Set(['text', 'number', 'search'])

export function isTypingInField(event: KeyboardEvent): boolean {
  const target = event.target
  if (target instanceof HTMLInputElement) return TEXT_INPUT_TYPES.has(target.type)
  return target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement
}

export function findShortcut(shortcuts: Shortcut[], event: KeyboardEvent): Shortcut | undefined {
  if (isTypingInField(event)) return undefined
  return shortcuts.find((shortcut) => shortcut.matches(event))
}
