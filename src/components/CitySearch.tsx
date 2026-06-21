import { Loader2, MapPin, Search, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { searchCities } from '../lib/api'
import { useDebounce } from '../hooks/useDebounce'
import type { GeocodingResult, Location } from '../types'

interface CitySearchProps {
  onSelect: (location: Location) => void
  onClose: () => void
}

/** Debounced city search overlay backed by the Open-Meteo geocoding API. */
export function CitySearch({ onSelect, onClose }: CitySearchProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<GeocodingResult[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const debounced = useDebounce(query, 300)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  useEffect(() => {
    const trimmed = debounced.trim()
    if (trimmed.length < 2) {
      setResults([])
      setLoading(false)
      setError(null)
      return
    }

    const controller = new AbortController()
    setLoading(true)
    setError(null)

    searchCities(trimmed, controller.signal)
      .then((res) => {
        if (controller.signal.aborted) return
        setResults(res)
        setLoading(false)
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted || (err as Error).name === 'AbortError') {
          return
        }
        setError('Search failed. Try again.')
        setLoading(false)
      })

    return () => controller.abort()
  }, [debounced])

  function handleSelect(r: GeocodingResult) {
    onSelect({
      name: r.name,
      latitude: r.latitude,
      longitude: r.longitude,
      country: r.country,
      admin1: r.admin1,
    })
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-3 py-2.5 focus-within:border-white/25">
        <Search className="h-4 w-4 shrink-0 text-white/50" aria-hidden="true" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search for a city…"
          aria-label="Search for a city"
          className="w-full bg-transparent text-sm text-white placeholder:text-white/40 focus:outline-none"
        />
        {loading && (
          <Loader2
            className="h-4 w-4 shrink-0 animate-spin text-white/50"
            aria-label="Searching"
          />
        )}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close search"
          className="shrink-0 rounded-full p-1 text-white/50 transition hover:bg-white/10 hover:text-white"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>

      {error && <p className="px-1 text-xs text-red-300">{error}</p>}

      {results.length > 0 && (
        <ul className="overflow-hidden rounded-2xl border border-white/10 bg-white/5">
          {results.map((r) => (
            <li key={r.id}>
              <button
                type="button"
                onClick={() => handleSelect(r)}
                className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm transition hover:bg-white/10 focus:bg-white/10 focus:outline-none"
              >
                <MapPin
                  className="h-3.5 w-3.5 shrink-0 text-white/40"
                  aria-hidden="true"
                />
                <span className="text-white">{r.name}</span>
                <span className="truncate text-white/50">
                  {[r.admin1, r.country].filter(Boolean).join(', ')}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {!loading &&
        !error &&
        debounced.trim().length >= 2 &&
        results.length === 0 && (
          <p className="px-1 text-xs text-white/50">No matches found.</p>
        )}
    </div>
  )
}
