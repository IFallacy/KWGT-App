import { Droplets, Thermometer, Umbrella, Wind } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { formatNumber, formatTemp } from '../lib/format'
import type { CurrentWeather } from '../types'

interface StatsRowProps {
  current: CurrentWeather
  /** Today's max precipitation probability from the daily array. */
  precipChance: number | null
  windUnit: string
}

interface Stat {
  Icon: LucideIcon
  label: string
  value: string
}

/** Feels-like, humidity, precip chance, and wind in a four-up grid. */
export function StatsRow({ current, precipChance, windUnit }: StatsRowProps) {
  const stats: Stat[] = [
    {
      Icon: Thermometer,
      label: 'Feels like',
      value: formatTemp(current.apparent_temperature),
    },
    {
      Icon: Droplets,
      label: 'Humidity',
      value: formatNumber(current.relative_humidity_2m, '%'),
    },
    {
      Icon: Umbrella,
      label: 'Precip',
      value: formatNumber(precipChance, '%'),
    },
    {
      Icon: Wind,
      label: 'Wind',
      value:
        current.wind_speed_10m == null
          ? '—'
          : `${formatNumber(current.wind_speed_10m)} ${windUnit}`,
    },
  ]

  return (
    <div className="grid grid-cols-4 gap-2">
      {stats.map(({ Icon, label, value }) => (
        <div
          key={label}
          className="flex flex-col items-center gap-1 rounded-2xl bg-white/5 px-1.5 py-3 text-center"
        >
          <Icon className="h-4 w-4 text-white/55" aria-hidden="true" />
          <span className="text-sm font-semibold text-white">{value}</span>
          <span className="text-[10px] uppercase tracking-wide text-white/45">
            {label}
          </span>
        </div>
      ))}
    </div>
  )
}
