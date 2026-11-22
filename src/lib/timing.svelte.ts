const STORAGE_KEY = 'rusty-riffs.timing'
const DEFAULT_OFFSET_MILLISECONDS = 150
const MILLISECONDS_PER_SECOND = 1000
const NORMAL_SPEED_PERCENT = 100

interface TimingPreferences {
  offsetMilliseconds: number
  isSnapEnabled: boolean
}

const DEFAULT_PREFERENCES: TimingPreferences = { offsetMilliseconds: DEFAULT_OFFSET_MILLISECONDS, isSnapEnabled: true }

function loadPreferences(): TimingPreferences {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    return saved ? { ...DEFAULT_PREFERENCES, ...JSON.parse(saved) } : DEFAULT_PREFERENCES
  } catch (error) {
    console.warn('Could not read timing preferences; using defaults', error)
    return DEFAULT_PREFERENCES
  }
}

class Timing {
  offsetMilliseconds = $state(DEFAULT_PREFERENCES.offsetMilliseconds)
  isSnapEnabled = $state(DEFAULT_PREFERENCES.isSnapEnabled)

  constructor() {
    const preferences = loadPreferences()
    this.offsetMilliseconds = preferences.offsetMilliseconds
    this.isSnapEnabled = preferences.isSnapEnabled
  }

  setOffset(milliseconds: number): void {
    this.offsetMilliseconds = Math.round(milliseconds)
    this.save()
  }

  toggleSnap(): void {
    this.isSnapEnabled = !this.isSnapEnabled
    this.save()
  }

  offsetInSongSeconds(speedPercent: number): number {
    return (this.offsetMilliseconds / MILLISECONDS_PER_SECOND) * (speedPercent / NORMAL_SPEED_PERCENT)
  }

  private save(): void {
    const preferences: TimingPreferences = { offsetMilliseconds: this.offsetMilliseconds, isSnapEnabled: this.isSnapEnabled }
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences))
    } catch (error) {
      console.warn('Could not save timing preferences', error)
    }
  }
}

export const timing = new Timing()
