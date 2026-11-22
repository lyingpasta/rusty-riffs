import { open } from '@tauri-apps/plugin-dialog'
import { getCurrentWebview } from '@tauri-apps/api/webview'
import type { UnlistenFn } from '@tauri-apps/api/event'

const AUDIO_EXTENSIONS = ['mp3', 'wav', 'flac', 'm4a', 'ogg']

export async function pickSongFile(): Promise<string | null> {
  return open({ multiple: false, directory: false, filters: [{ name: 'Audio', extensions: AUDIO_EXTENSIONS }] })
}

export function onSongFileDropped(handler: (path: string) => void): Promise<UnlistenFn> {
  return getCurrentWebview().onDragDropEvent((event) => {
    if (event.payload.type !== 'drop') return
    const [firstPath] = event.payload.paths
    if (firstPath) handler(firstPath)
  })
}
