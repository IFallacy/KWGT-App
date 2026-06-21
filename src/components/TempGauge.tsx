import { formatTemp } from '../lib/format'

interface TempGaugeProps {
  max: number | null
  min: number | null
  current: number | null
}

/**
 * Vertical gradient "thermometer": today's max at the top, min at the bottom,
 * with a marker positioned at the current temperature.
 */
export function TempGauge({ max, min, current }: TempGaugeProps) {
  const hasRange = max != null && min != null && max > min

  // Fraction from the bottom (0) to the top (1) for the current marker.
  let markerPct: number | null = null
  if (hasRange && current != null) {
    const clamped = Math.min(max!, Math.max(min!, current))
    markerPct = ((clamped - min!) / (max! - min!)) * 100
  }

  return (
    <div className="flex items-stretch gap-3" aria-hidden="true">
      <div className="relative w-2.5 shrink-0 overflow-hidden rounded-full bg-gradient-to-t from-sky-400 via-amber-300 to-rose-400">
        {markerPct != null && (
          <span
            className="absolute left-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-slate-900 bg-white shadow"
            style={{ bottom: `${markerPct}%` }}
          />
        )}
      </div>
      <div className="flex flex-col justify-between py-0.5 text-xs">
        <span className="font-semibold text-rose-200">{formatTemp(max)}</span>
        {current != null && (
          <span className="text-white/60">{formatTemp(current)}</span>
        )}
        <span className="text-sky-200">{formatTemp(min)}</span>
      </div>
    </div>
  )
}
