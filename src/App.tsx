import { useEffect, useMemo, useState } from 'react'
import { CitySearch } from './components/CitySearch'
import { CurrentBlock } from './components/CurrentBlock'
import { ErrorCard } from './components/ErrorCard'
import { ForecastStrip } from './components/ForecastStrip'
import { HourlyChart } from './components/HourlyChart'
import { LocationBar } from './components/LocationBar'
import { StatsRow } from './components/StatsRow'
import { TempGauge } from './components/TempGauge'
import { WeekSummary } from './components/WeekSummary'
import { HeaderSkeleton, StripSkeleton } from './components/Skeletons'
import { useWeather } from './hooks/useWeather'
import { reverseGeocode } from './lib/api'
import { getCurrentPosition } from './lib/geolocation'
import { parseLocal } from './lib/format'
import {
  loadLocation,
  loadUnits,
  saveLocation,
  saveUnits,
} from './lib/storage'
import { buildWeekSummary } from './lib/summary'
import type { Location, Units } from './types'

/** Fallback when geolocation is denied/unavailable and nothing is stored. */
const DEFAULT_LOCATION: Location = {
  name: 'London',
  latitude: 51.5072,
  longitude: -0.1276,
  country: 'United Kingdom',
}

export default function App() {
  const [location, setLocation] = useState<Location | null>(() => loadLocation())
  const [units, setUnits] = useState<Units>(() => loadUnits())
  const [searchOpen, setSearchOpen] = useState(false)
  const [resolving, setResolving] = useState(false)

  const { data, loading, error, retry } = useWeather(location, units)

  // On first load, prefer a stored location; otherwise try geolocation and
  // fall back to the default city (surfacing the search box).
  useEffect(() => {
    if (location) return

    let cancelled = false
    setResolving(true)

    getCurrentPosition()
      .then(async (coords) => {
        const resolved = await reverseGeocode(coords.latitude, coords.longitude)
        if (!cancelled) setLocation(resolved)
      })
      .catch(() => {
        if (cancelled) return
        setLocation(DEFAULT_LOCATION)
        setSearchOpen(true)
      })
      .finally(() => {
        if (!cancelled) setResolving(false)
      })

    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Persist selections.
  useEffect(() => {
    if (location) saveLocation(location)
  }, [location])

  useEffect(() => {
    saveUnits(units)
  }, [units])

  function handleSelect(next: Location) {
    setLocation(next)
    setSearchOpen(false)
  }

  function toggleUnits() {
    setUnits((u) => (u === 'metric' ? 'imperial' : 'metric'))
  }

  const unitSymbol = '°'
  const windUnit = units === 'imperial' ? 'mph' : 'km/h'

  // "Now" in the location's timezone — the API's current.time is authoritative.
  const nowLocal = useMemo(
    () => (data?.current?.time ? parseLocal(data.current.time) : new Date()),
    [data?.current?.time],
  )

  const summary = useMemo(
    () => buildWeekSummary(data?.daily, unitSymbol),
    [data?.daily],
  )

  const todayPrecip = data?.daily?.precipitation_probability_max?.[0] ?? null
  const todayMax = data?.daily?.temperature_2m_max?.[0] ?? null
  const todayMin = data?.daily?.temperature_2m_min?.[0] ?? null

  const showSkeleton = (loading || resolving) && !data

  return (
    <main className="flex min-h-full items-center justify-center p-4 sm:p-6">
      <section
        className="w-full max-w-[390px] space-y-5 rounded-3xl border border-white/10 bg-white/[0.06] p-5 shadow-card backdrop-blur-xl"
        aria-label="Weather forecast"
      >
        <LocationBar
          location={location}
          units={units}
          onOpenSearch={() => setSearchOpen((v) => !v)}
          onToggleUnits={toggleUnits}
        />

        {searchOpen && (
          <CitySearch
            onSelect={handleSelect}
            onClose={() => setSearchOpen(false)}
          />
        )}

        {error && !data && <ErrorCard message={error} onRetry={retry} />}

        {showSkeleton && !error && (
          <>
            <HeaderSkeleton />
            <StripSkeleton />
          </>
        )}

        {data && (
          <>
            <div className="flex items-stretch justify-between gap-4">
              <div className="flex-1">
                <CurrentBlock current={data.current} />
              </div>
              <TempGauge
                max={todayMax}
                min={todayMin}
                current={data.current.temperature_2m}
              />
            </div>

            <StatsRow
              current={data.current}
              precipChance={todayPrecip}
              windUnit={windUnit}
            />

            <WeekSummary summary={summary} />

            <HourlyChart
              hourly={data.hourly}
              nowLocal={nowLocal}
              unitSymbol={unitSymbol}
            />

            <div>
              <p className="mb-1.5 text-xs font-medium uppercase tracking-widest text-white/45">
                7-day forecast
              </p>
              <ForecastStrip daily={data.daily} nowLocal={nowLocal} />
            </div>

            {/* Non-blocking error if a refetch fails while showing stale data. */}
            {error && (
              <p className="text-center text-xs text-red-300">
                Couldn’t refresh — showing the last forecast.
              </p>
            )}
          </>
        )}

        <p className="pt-1 text-center text-[10px] text-white/30">
          Data from Open-Meteo · No API key required
        </p>
      </section>
    </main>
  )
}
