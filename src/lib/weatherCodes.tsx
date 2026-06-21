import {
  Cloud,
  CloudDrizzle,
  CloudFog,
  CloudHail,
  CloudLightning,
  CloudMoon,
  CloudRain,
  CloudSnow,
  CloudSun,
  Cloudy,
  Moon,
  Snowflake,
  Sun,
  type LucideIcon,
} from 'lucide-react'

export interface WeatherInfo {
  label: string
  Icon: LucideIcon
}

/**
 * WMO weather-code → label + day icon.
 * Night variants are handled separately via {@link getWeatherInfo}.
 */
export const WMO_CODES: Record<number, WeatherInfo> = {
  0: { label: 'Clear', Icon: Sun },
  1: { label: 'Mainly clear', Icon: CloudSun },
  2: { label: 'Partly cloudy', Icon: CloudSun },
  3: { label: 'Overcast', Icon: Cloudy },

  45: { label: 'Fog', Icon: CloudFog },
  48: { label: 'Rime fog', Icon: CloudFog },

  51: { label: 'Light drizzle', Icon: CloudDrizzle },
  53: { label: 'Drizzle', Icon: CloudDrizzle },
  55: { label: 'Heavy drizzle', Icon: CloudDrizzle },
  56: { label: 'Freezing drizzle', Icon: CloudDrizzle },
  57: { label: 'Freezing drizzle', Icon: CloudDrizzle },

  61: { label: 'Light rain', Icon: CloudRain },
  63: { label: 'Rain', Icon: CloudRain },
  65: { label: 'Heavy rain', Icon: CloudRain },
  66: { label: 'Freezing rain', Icon: CloudRain },
  67: { label: 'Freezing rain', Icon: CloudRain },

  71: { label: 'Light snow', Icon: CloudSnow },
  73: { label: 'Snow', Icon: CloudSnow },
  75: { label: 'Heavy snow', Icon: CloudSnow },
  77: { label: 'Snow grains', Icon: Snowflake },

  80: { label: 'Light showers', Icon: CloudRain },
  81: { label: 'Showers', Icon: CloudRain },
  82: { label: 'Heavy showers', Icon: CloudRain },
  85: { label: 'Snow showers', Icon: CloudSnow },
  86: { label: 'Snow showers', Icon: CloudSnow },

  95: { label: 'Thunderstorm', Icon: CloudLightning },
  96: { label: 'Thunderstorm, hail', Icon: CloudHail },
  99: { label: 'Thunderstorm, hail', Icon: CloudHail },
}

const FALLBACK: WeatherInfo = { label: 'Unknown', Icon: Cloud }

/** Night-icon overrides for the small set of codes that have a sky variant. */
const NIGHT_ICONS: Record<number, LucideIcon> = {
  0: Moon,
  1: CloudMoon,
  2: CloudMoon,
}

/**
 * Resolve label + icon for a WMO code. When `isDay` is `0`, clear/partly-cloudy
 * codes use their moon variants; everything else shares the day icon.
 */
export function getWeatherInfo(
  code: number | null | undefined,
  isDay: number | null = 1,
): WeatherInfo {
  if (code == null) return FALLBACK
  const base = WMO_CODES[code] ?? FALLBACK
  if (isDay === 0 && NIGHT_ICONS[code]) {
    return { label: base.label, Icon: NIGHT_ICONS[code] }
  }
  return base
}

/** WMO codes that count as "wet" for the weekly summary. */
export const WET_CODES = new Set<number>([
  51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 71, 73, 75, 77, 80, 81, 82, 85, 86,
  95, 96, 99,
])
