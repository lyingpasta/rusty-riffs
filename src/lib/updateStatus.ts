export type UpdateStatus =
  | { kind: 'idle' }
  | { kind: 'checking' }
  | { kind: 'up-to-date' }
  | { kind: 'available'; version: string; currentVersion: string }
  | { kind: 'downloading'; downloadedBytes: number; totalBytes: number | null }
  | { kind: 'restarting' }
  | { kind: 'failed'; step: 'check' | 'install'; reason: string }

export type UpdateAction = 'check' | 'install' | null

const PERCENT = 100

export function downloadPercent(downloadedBytes: number, totalBytes: number | null): number | null {
  if (!totalBytes) return null
  return Math.min(Math.floor((downloadedBytes / totalBytes) * PERCENT), PERCENT)
}

function describeDownload(downloadedBytes: number, totalBytes: number | null): string {
  const percent = downloadPercent(downloadedBytes, totalBytes)
  return percent === null ? 'Downloading the update…' : `Downloading the update… ${percent}%`
}

export function describeUpdateStatus(status: UpdateStatus): string {
  switch (status.kind) {
    case 'idle':
      return ''
    case 'checking':
      return 'Checking for updates…'
    case 'up-to-date':
      return 'You have the latest version.'
    case 'available':
      return `Version ${status.version} is available.`
    case 'downloading':
      return describeDownload(status.downloadedBytes, status.totalBytes)
    case 'restarting':
      return 'Update installed. Restarting…'
    case 'failed':
      return `Couldn't ${status.step} the update: ${status.reason}`
  }
}

export function availableUpdateAction(status: UpdateStatus): UpdateAction {
  if (status.kind === 'available') return 'install'
  if (status.kind === 'idle' || status.kind === 'up-to-date' || status.kind === 'failed') return 'check'
  return null
}
