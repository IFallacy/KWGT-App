import { useCallback, useEffect, useRef, useState } from 'react'
import { fetchForecast } from '../lib/api'
import type { ForecastResponse, Location, Units } from '../types'

interface WeatherState {
  data: ForecastResponse | null
  loading: boolean
  error: string | null
}

/**
 * Fetches the forecast whenever the location or units change, with abort
 * handling so rapid changes don't race. Exposes a `retry` for the error card.
 */
export function useWeather(location: Location | null, units: Units) {
  const [state, setState] = useState<WeatherState>({
    data: null,
    loading: false,
    error: null,
  })
  const abortRef = useRef<AbortController | null>(null)

  const load = useCallback(() => {
    if (!location) return

    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    setState((s) => ({ ...s, loading: true, error: null }))

    fetchForecast(location.latitude, location.longitude, units, controller.signal)
      .then((data) => {
        if (controller.signal.aborted) return
        setState({ data, loading: false, error: null })
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted || (err as Error).name === 'AbortError') {
          return
        }
        setState((s) => ({
          ...s,
          loading: false,
          error: 'Could not load the forecast. Check your connection and try again.',
        }))
      })
  }, [location, units])

  useEffect(() => {
    load()
    return () => abortRef.current?.abort()
  }, [load])

  return { ...state, retry: load }
}
