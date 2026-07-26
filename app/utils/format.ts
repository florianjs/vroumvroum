const COMPASS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'] as const

/** Heading in degrees → 8-point compass label. */
export function compassPoint(heading: number): string {
  const index = Math.round((((heading % 360) + 360) % 360) / 45) % 8
  return COMPASS[index]!
}

/** Short elapsed label for the live indicator: "now", "4s", "2m". */
export function elapsedLabel(fromMs: number | null, nowMs: number): string {
  if (fromMs === null) return '—'
  const seconds = Math.max(0, Math.round((nowMs - fromMs) / 1000))
  if (seconds < 2) return 'now'
  if (seconds < 60) return `${seconds}s ago`
  const minutes = Math.round(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  return `${Math.round(minutes / 60)}h ago`
}

/** Countdown label for the next duty transition: "in 3m 20s". */
export function countdownLabel(totalSeconds: number): string {
  const seconds = Math.max(0, Math.round(totalSeconds))
  const minutes = Math.floor(seconds / 60)
  const rest = seconds % 60
  if (minutes === 0) return `${rest}s`
  return `${minutes}m ${String(rest).padStart(2, '0')}s`
}

/** Signed decimal degrees, fixed to 4 places — ~11 m precision. */
export function formatCoord(value: number): string {
  return value.toFixed(4)
}

/** Wall-clock time of a duty block, HH:MM in the operator's locale. */
export function clockLabel(ms: number): string {
  return new Date(ms).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}
