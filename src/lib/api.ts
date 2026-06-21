import type {
  ForecastResponse,
  GeocodingResponse,
  GeocodingResult,
  Location,
  ReverseGeocodeResponse,
  Units,
} from '../types'

const FORECAST_URL = 'https://api.open-meteo.com/v1/forecast'
const GEOCODE_URL = 'https://geocoding-api.open-meteo.com/v1/search'
const REVERSE_URL = 'https://api.bigdatacloud.net/data/reverse-geocode-client'

async function getJson<T>(url: string, signal?: AbortSignal): Promise<T> {
  const res = await fetch(url, { signal })
  if (!res.ok) {
    throw new Error(`Request failed (${res.status})`)
  }
  return (await res.json()) as T
}

/** Fetch the 7-day forecast for a coordinate in the requested unit system. */
export async function fetchForecast(
  latitude: number,
  longitude: number,
  units: Units,
  signal?: AbortSignal,
): Promise<ForecastResponse> {
  const params = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),
    timezone: 'auto',
    forecast_days: '7',
    current:
      'temperature_2m,apparent_temperature,relative_humidity_2m,precipitation,weather_code,is_day,wind_speed_10m',
    daily:
      'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,sunrise,sunset',
    hourly: 'temperature_2m,precipitation_probability,weather_code',
  })

  if (units === 'imperial') {
    params.set('temperature_unit', 'fahrenheit')
    params.set('wind_speed_unit', 'mph')
  }

  return getJson<ForecastResponse>(`${FORECAST_URL}?${params.toString()}`, signal)
}

/** Search for cities by name. Returns up to five matches. */
export async function searchCities(
  query: string,
  signal?: AbortSignal,
): Promise<GeocodingResult[]> {
  const trimmed = query.trim()
  if (!trimmed) return []

  const params = new URLSearchParams({
    name: trimmed,
    count: '5',
    language: 'en',
    format: 'json',
  })

  const data = await getJson<GeocodingResponse>(
    `${GEOCODE_URL}?${params.toString()}`,
    signal,
  )
  return data.results ?? []
}

/** Resolve a coordinate to a human-readable place name (keyless). */
export async function reverseGeocode(
  latitude: number,
  longitude: number,
  signal?: AbortSignal,
): Promise<Location> {
  const params = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),
    localityLanguage: 'en',
  })

  try {
    const data = await getJson<ReverseGeocodeResponse>(
      `${REVERSE_URL}?${params.toString()}`,
      signal,
    )
    const name = data.city || data.locality || 'Current location'
    return {
      name,
      latitude,
      longitude,
      country: data.countryName,
      admin1: data.principalSubdivision,
    }
  } catch {
    // Reverse geocoding is a nicety, not a hard dependency — degrade gracefully.
    return { name: 'Current location', latitude, longitude }
  }
}
