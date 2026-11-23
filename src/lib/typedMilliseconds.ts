const MILLISECONDS_PATTERN = /^\s*([+-]?\d+(?:\.\d+)?)\s*(?:ms)?\s*$/i

export function parseTypedMilliseconds(text: string): number | null {
  const match = MILLISECONDS_PATTERN.exec(text)
  return match ? Number(match[1]) : null
}
