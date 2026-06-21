import { formatNumber, formatTemp, isToday, weekdayShort } from '../lib/format'
import { getWeatherInfo } from '../lib/weatherCodes'
import type { DailyWeather } from '../types'

interface ForecastStripProps {
  daily: DailyWeather
  nowLocal: Date
}

/** Seven-day list: weekday, day icon, high (bold) / low (muted), precip ≥ 30%. */
export function ForecastStrip({ daily, nowLocal }: ForecastStripProps) {
  return (
    <ul className="space-y-1">
      {daily.time.map((time, i) => {
        const today = isToday(time, nowLocal)
        const { label, Icon } = getWeatherInfo(daily.weather_code?.[i], 1)
        const precip = daily.precipitation_probability_max?.[i] ?? null
        const showPrecip = precip != null && precip >= 30

        return (
          <li
            key={time}
            className={
              'flex items-center gap-3 rounded-2xl px-3 py-2.5 transition ' +
              (today ? 'bg-white/10' : 'hover:bg-white/[0.04]')
            }
          >
            <span
              className={
                'w-10 shrink-0 text-sm font-medium ' +
                (today ? 'text-white' : 'text-white/70')
              }
            >
              {today ? 'Today' : weekdayShort(time)}
            </span>

            <Icon
              className="h-5 w-5 shrink-0 text-white/80"
              strokeWidth={1.6}
              aria-label={label}
            />

            <span className="flex w-10 shrink-0 items-center gap-1 text-xs text-sky-200/80">
              {showPrecip ? (
                <>{formatNumber(precip, '%')}</>
              ) : (
                <span className="sr-only">No significant rain</span>
              )}
            </span>

            <div className="ml-auto flex items-baseline gap-2 tabular-nums">
              <span className="text-sm font-semibold text-white">
                {formatTemp(daily.temperature_2m_max?.[i])}
              </span>
              <span className="text-sm text-white/45">
                {formatTemp(daily.temperature_2m_min?.[i])}
              </span>
            </div>
          </li>
        )
      })}
    </ul>
  )
}
