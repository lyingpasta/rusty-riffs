import changelog from '../../CHANGELOG.md?raw'
import { parseChangelog, releasesBetween, type Release } from './releaseNotes'

export interface InstalledUpdate {
  fromVersion: string
  toVersion: string
}

const STORAGE_KEY = 'rusty-riffs.installed-update'

export function rememberInstalledUpdate(update: InstalledUpdate): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(update))
  } catch (error) {
    console.warn("Could not remember the update; What's new won't show after the restart", error)
  }
}

function takeInstalledUpdate(): InstalledUpdate | null {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    localStorage.removeItem(STORAGE_KEY)
    return saved ? (JSON.parse(saved) as InstalledUpdate) : null
  } catch (error) {
    console.warn('Could not read the installed update', error)
    return null
  }
}

export function releasesToAnnounce(currentVersion: string): Release[] {
  const installed = takeInstalledUpdate()
  if (!installed || installed.toVersion !== currentVersion) return []
  return releasesBetween(parseChangelog(changelog), installed.fromVersion, installed.toVersion)
}
