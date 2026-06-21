/**
 * Type definitions for the Open-Meteo forecast/geocoding APIs and the
 * BigDataCloud reverse-geocoding API, plus a couple of app-level shapes.
 */

export type Units = 'metric' | 'imperial'

/** A resolved location the app can fetch a forecast for. */
export interface Location {
  name: string
  latitude: number
  longitude: number
  country?: string
  admin1?: string
}

/* ----------------------------- Open-Meteo forecast ----------------------------- */

export interface CurrentWeather {
  time: string
  temperature_2m: number | null
  apparent_temperature: number | null
  relative_humidity_2m: number | null
  precipitation: number | null
  weather_code: number | null
  is_day: number | null
  wind_speed_10m: number | null
}

export interface DailyWeather {
  time: string[]
  weather_code: (number | null)[]
  temperature_2m_max: (number | null)[]
  temperature_2m_min: (number | null)[]
  precipitation_probability_max: (number | null)[]
  sunrise: string[]
  sunset: string[]
}

export interface HourlyWeather {
  time: string[]
  temperature_2m: (number | null)[]
  precipitation_probability: (number | null)[]
  weather_code: (number | null)[]
}

export interface ForecastResponse {
  latitude: number
  longitude: number
  timezone: string
  timezone_abbreviation: string
  current_units: Record<string, string>
  current: CurrentWeather
  daily_units: Record<string, string>
  daily: DailyWeather
  hourly_units: Record<string, string>
  hourly: HourlyWeather
}

/* ------------------------------- Geocoding (search) ------------------------------ */

export interface GeocodingResult {
  id: number
  name: string
  latitude: number
  longitude: number
  country?: string
  country_code?: string
  admin1?: string
  admin2?: string
}

export interface GeocodingResponse {
  results?: GeocodingResult[]
}

/* ------------------------- Reverse geocoding (BigDataCloud) ----------------------- */

export interface ReverseGeocodeResponse {
  city?: string
  locality?: string
  countryName?: string
  principalSubdivision?: string
}
