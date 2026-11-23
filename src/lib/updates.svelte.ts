import { relaunch } from '@tauri-apps/plugin-process'
import { check, type DownloadEvent, type Update } from '@tauri-apps/plugin-updater'
import type { UpdateStatus } from './updateStatus'

class Updates {
  status = $state<UpdateStatus>({ kind: 'idle' })
  private pendingUpdate: Update | null = null

  async check(): Promise<void> {
    if (this.status.kind === 'checking') return
    this.status = { kind: 'checking' }
    try {
      this.pendingUpdate = await check()
      this.status = this.pendingUpdate ? { kind: 'available', version: this.pendingUpdate.version } : { kind: 'up-to-date' }
    } catch (error) {
      this.status = { kind: 'failed', step: 'check', reason: String(error) }
    }
  }

  async install(): Promise<void> {
    const update = this.pendingUpdate
    if (!update || this.status.kind !== 'available') return
    this.status = { kind: 'downloading', downloadedBytes: 0, totalBytes: null }
    try {
      await update.downloadAndInstall((event) => this.trackDownload(event))
      this.status = { kind: 'restarting' }
      await relaunch()
    } catch (error) {
      this.status = { kind: 'failed', step: 'install', reason: String(error) }
    }
  }

  private trackDownload(event: DownloadEvent): void {
    if (this.status.kind !== 'downloading') return
    if (event.event === 'Started') this.status = { ...this.status, totalBytes: event.data.contentLength ?? null }
    if (event.event === 'Progress') {
      this.status = { ...this.status, downloadedBytes: this.status.downloadedBytes + event.data.chunkLength }
    }
  }
}

export const updates = new Updates()
