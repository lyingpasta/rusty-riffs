import { loadTheme, type Theme } from './theme'

export type Mode =
  | { kind: 'normal' }
  | { kind: 'new-loop'; startMarkerId: number; endMarkerId: number }
  | { kind: 'selection'; anchorSeconds: number; endSeconds: number }

export interface RenameTarget {
  kind: 'marker' | 'loop'
  id: number
  name: string
}

const NOTICE_DURATION_MILLISECONDS = 4000

class Interaction {
  mode = $state<Mode>({ kind: 'normal' })
  renameTarget = $state<RenameTarget | null>(null)
  notice = $state<string | null>(null)
  isCheatSheetOpen = $state(false)
  isAboutOpen = $state(false)
  isCalibrationOpen = $state(false)
  theme = $state<Theme>(loadTheme())
  private noticeTimer: ReturnType<typeof setTimeout> | undefined

  showNotice(text: string): void {
    this.notice = text
    clearTimeout(this.noticeTimer)
    this.noticeTimer = setTimeout(() => (this.notice = null), NOTICE_DURATION_MILLISECONDS)
  }

  returnToNormal(): void {
    this.mode = { kind: 'normal' }
  }
}

export const interaction = new Interaction()
