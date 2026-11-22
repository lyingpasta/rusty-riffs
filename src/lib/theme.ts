export interface Theme {
  id: string
  name: string
}

export const themes: Theme[] = [
  { id: 'ink-bronze', name: 'Ink & bronze' },
  { id: 'petrol-moonlight', name: 'Petrol & moonlight' },
  { id: 'aubergine-ember', name: 'Aubergine & ember' },
]

const STORAGE_KEY = 'rusty-riffs.theme'
const DEFAULT_THEME = themes[0]

export function loadTheme(): Theme {
  try {
    const savedId = localStorage.getItem(STORAGE_KEY)
    return themes.find((theme) => theme.id === savedId) ?? DEFAULT_THEME
  } catch (error) {
    console.warn('Could not read the saved theme; using the default', error)
    return DEFAULT_THEME
  }
}

export function applyTheme(theme: Theme): void {
  document.documentElement.dataset.theme = theme.id
  try {
    localStorage.setItem(STORAGE_KEY, theme.id)
  } catch (error) {
    console.warn('Could not remember the theme choice', error)
  }
}

export function nextTheme(current: Theme): Theme {
  const index = themes.findIndex((theme) => theme.id === current.id)
  return themes[(index + 1) % themes.length]
}
