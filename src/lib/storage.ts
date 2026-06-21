import type { Location, Units } from '../types'

const LOCATION_KEY = 'glass-weather:location'
const UNITS_KEY = 'glass-weather:units'

export function saveLocation(location: Location): void {
  try {
    localStorage.setItem(LOCATION_KEY, JSON.stringify(location))
  } catch {
    /* localStorage may be unavailable (private mode); non-fatal. */
  }
}

export function loadLocation(): Location | null {
  try {
    const raw = localStorage.getItem(LOCATION_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Location
    if (
      typeof parsed?.latitude === 'number' &&
      typeof parsed?.longitude === 'number' &&
      typeof parsed?.name === 'string'
    ) {
      return parsed
    }
    return null
  } catch {
    return null
  }
}

export function saveUnits(units: Units): void {
  try {
    localStorage.setItem(UNITS_KEY, units)
  } catch {
    /* non-fatal */
  }
}

export function loadUnits(): Units {
  try {
    return localStorage.getItem(UNITS_KEY) === 'imperial' ? 'imperial' : 'metric'
  } catch {
    return 'metric'
  }
}
