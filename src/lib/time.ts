const SECONDS_PER_MINUTE = 60

export function formatSeconds(seconds: number): string {
  const minutes = Math.floor(seconds / SECONDS_PER_MINUTE)
  const remainder = (seconds % SECONDS_PER_MINUTE).toFixed(1).padStart(4, '0')
  return `${minutes}:${remainder}`
}
