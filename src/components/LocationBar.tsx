import { MapPin } from 'lucide-react'
import type { Location, Units } from '../types'

interface LocationBarProps {
  location: Location | null
  units: Units
  onOpenSearch: () => void
  onToggleUnits: () => void
}

/** Top bar: tappable place name (opens search) + °C/°F unit toggle. */
export function LocationBar({
  location,
  units,
  onOpenSearch,
  onToggleUnits,
}: LocationBarProps) {
  const place = location?.name ?? 'Locating…'
  const region = [location?.admin1, location?.country].filter(Boolean).join(', ')

  return (
    <div className="flex items-center justify-between gap-3">
      <button
        type="button"
        onClick={onOpenSearch}
        aria-label={`Current location: ${place}. Tap to search for a city.`}
        className="flex min-w-0 items-center gap-1.5 rounded-full px-1 py-1 text-left transition hover:opacity-80 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
      >
        <MapPin className="h-4 w-4 shrink-0 text-white/70" aria-hidden="true" />
        <span className="truncate text-sm font-medium text-white">{place}</span>
        {region && (
          <span className="hidden truncate text-xs text-white/45 sm:inline">
            {region}
          </span>
        )}
      </button>

      <div
        role="group"
        aria-label="Temperature units"
        className="flex shrink-0 items-center rounded-full bg-white/10 p-0.5 text-xs font-semibold"
      >
        <button
          type="button"
          onClick={() => units !== 'metric' && onToggleUnits()}
          aria-pressed={units === 'metric'}
          className={
            'rounded-full px-2.5 py-1 transition ' +
            (units === 'metric'
              ? 'bg-white text-slate-900'
              : 'text-white/60 hover:text-white')
          }
        >
          °C
        </button>
        <button
          type="button"
          onClick={() => units !== 'imperial' && onToggleUnits()}
          aria-pressed={units === 'imperial'}
          className={
            'rounded-full px-2.5 py-1 transition ' +
            (units === 'imperial'
              ? 'bg-white text-slate-900'
              : 'text-white/60 hover:text-white')
          }
        >
          °F
        </button>
      </div>
    </div>
  )
}
