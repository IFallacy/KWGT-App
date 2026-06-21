import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { hourLabel } from '../lib/format'
import type { HourlyWeather } from '../types'

interface HourlyChartProps {
  hourly: HourlyWeather
  /** Current local time, used to find the starting hour in the series. */
  nowLocal: Date
  unitSymbol: string
}

interface Point {
  time: string
  label: string
  temp: number | null
}

/** Slim area chart of the next ~24 hours of temperature. */
export function HourlyChart({ hourly, nowLocal, unitSymbol }: HourlyChartProps) {
  if (!hourly?.time?.length) return null

  // Find the first hour at or after "now" (times are already local).
  const startIdx = findStartIndex(hourly.time, nowLocal)
  const slice: Point[] = hourly.time
    .slice(startIdx, startIdx + 24)
    .map((time, i) => ({
      time,
      label: hourLabel(time),
      temp: hourly.temperature_2m?.[startIdx + i] ?? null,
    }))

  if (slice.length < 2) return null

  return (
    <div>
      <p className="mb-1 text-xs font-medium uppercase tracking-widest text-white/45">
        Next 24 hours
      </p>
      <div className="h-28 w-full" aria-label="Hourly temperature chart for the next 24 hours">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={slice}
            margin={{ top: 8, right: 6, left: 6, bottom: 0 }}
          >
            <defs>
              <linearGradient id="tempFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#fbbf24" stopOpacity={0.45} />
                <stop offset="100%" stopColor="#38bdf8" stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="label"
              interval={5}
              tick={{ fill: 'rgba(255,255,255,0.45)', fontSize: 10 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis hide domain={['dataMin - 2', 'dataMax + 2']} />
            <Tooltip
              contentStyle={{
                background: 'rgba(15,20,32,0.95)',
                border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: 12,
                fontSize: 12,
                color: '#fff',
              }}
              labelStyle={{ color: 'rgba(255,255,255,0.6)' }}
              formatter={(value: number | string) => [
                `${Math.round(Number(value))}${unitSymbol}`,
                'Temp',
              ]}
            />
            <Area
              type="monotone"
              dataKey="temp"
              stroke="#fcd34d"
              strokeWidth={2}
              fill="url(#tempFill)"
              connectNulls
              dot={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

function findStartIndex(times: string[], nowLocal: Date): number {
  const target = `${pad(nowLocal.getFullYear(), 4)}-${pad(
    nowLocal.getMonth() + 1,
  )}-${pad(nowLocal.getDate())}T${pad(nowLocal.getHours())}:00`

  const idx = times.findIndex((t) => t >= target)
  return idx === -1 ? 0 : idx
}

function pad(n: number, width = 2): string {
  return String(n).padStart(width, '0')
}
