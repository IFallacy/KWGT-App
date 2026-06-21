import { formatTemp } from '../lib/format'
import { getWeatherInfo } from '../lib/weatherCodes'
import type { CurrentWeather } from '../types'

interface CurrentBlockProps {
  current: CurrentWeather
}

/** "Currently" label + condition text, big temperature, matching icon. */
export function CurrentBlock({ current }: CurrentBlockProps) {
  const { label, Icon } = getWeatherInfo(current.weather_code, current.is_day)

  return (
    <div className="flex items-center justify-between gap-4">
      <div className="min-w-0">
        <p className="text-xs font-medium uppercase tracking-widest text-white/45">
          Currently
        </p>
        <p className="mt-1 truncate text-base text-white/80">{label}</p>
        <p className="mt-1 text-6xl font-light leading-none tracking-tight text-white">
          {formatTemp(current.temperature_2m)}
        </p>
      </div>
      <Icon
        className="h-20 w-20 shrink-0 text-white/90"
        strokeWidth={1.4}
        aria-label={label}
      />
    </div>
  )
}
