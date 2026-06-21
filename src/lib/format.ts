/** Formatting helpers. All date parsing uses the date string as-is (the API
 * already returns times in the location's timezone via `timezone=auto`). */

const PLACEHOLDER = '—'

/** Round a temperature and append a degree sign, or em dash if missing. */
export function formatTemp(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return PLACEHOLDER
  return `${Math.round(value)}°`
}

/** Round any numeric value with an optional unit suffix. */
export function formatNumber(
  value: number | null | undefined,
  suffix = '',
): string {
  if (value == null || Number.isNaN(value)) return PLACEHOLDER
  return `${Math.round(value)}${suffix}`
}

/**
 * Parse an Open-Meteo local date/time string ("2026-06-21" or
 * "2026-06-21T14:00") as a wall-clock Date, ignoring the browser timezone.
 */
export function parseLocal(dateStr: string): Date {
  const [datePart, timePart = '00:00'] = dateStr.split('T')
  const [y, m, d] = datePart.split('-').map(Number)
  const [hh, mm] = timePart.split(':').map(Number)
  return new Date(y, (m ?? 1) - 1, d ?? 1, hh ?? 0, mm ?? 0)
}

/** Short weekday abbreviation, e.g. "Mon", derived from a local date string. */
export function weekdayShort(dateStr: string): string {
  return parseLocal(dateStr).toLocaleDateString('en-US', { weekday: 'short' })
}

/** Full weekday name, e.g. "Monday". */
export function weekdayLong(dateStr: string): string {
  return parseLocal(dateStr).toLocaleDateString('en-US', { weekday: 'long' })
}

/** Hour label like "2 PM" from an hourly time string. */
export function hourLabel(dateStr: string): string {
  return parseLocal(dateStr).toLocaleTimeString('en-US', {
    hour: 'numeric',
  })
}

/** Is this local date string the same calendar day as the current local time? */
export function isToday(dateStr: string, nowLocal: Date): boolean {
  const d = parseLocal(dateStr)
  return (
    d.getFullYear() === nowLocal.getFullYear() &&
    d.getMonth() === nowLocal.getMonth() &&
    d.getDate() === nowLocal.getDate()
  )
}
