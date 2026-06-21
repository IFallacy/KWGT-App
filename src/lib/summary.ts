import type { DailyWeather } from '../types'
import { weekdayLong } from './format'
import { WET_CODES } from './weatherCodes'

/**
 * Rule-based weekly summary, computed deterministically from the daily array.
 * Guards against nulls and never throws on missing fields.
 *
 * --- SEAM: richer summary ---
 * To swap this for an LLM-generated summary (e.g. an Anthropic API call),
 * replace the body below with a request that takes `daily` and `unitSymbol`
 * and returns a string. Keep this signature so callers don't change.
 * -----------------------------
 */
export function buildWeekSummary(
  daily: DailyWeather | undefined,
  unitSymbol = '°',
): string {
  if (!daily || !daily.time?.length) {
    return 'Forecast summary is unavailable right now.'
  }

  const days = daily.time.map((time, i) => ({
    time,
    code: daily.weather_code?.[i] ?? null,
    max: daily.temperature_2m_max?.[i] ?? null,
    min: daily.temperature_2m_min?.[i] ?? null,
    precip: daily.precipitation_probability_max?.[i] ?? null,
  }))

  const n = days.length

  // Warmest day (by max) and coolest day (by min).
  let warmest: { time: string; temp: number } | null = null
  let coolest: { time: string; temp: number } | null = null
  for (const d of days) {
    if (d.max != null && (warmest == null || d.max > warmest.temp)) {
      warmest = { time: d.time, temp: d.max }
    }
    if (d.min != null && (coolest == null || d.min < coolest.temp)) {
      coolest = { time: d.time, temp: d.min }
    }
  }

  // Count of "wet" days: a wet weather code OR a high precip probability.
  const wetCount = days.filter(
    (d) =>
      (d.code != null && WET_CODES.has(d.code)) ||
      (d.precip != null && d.precip >= 50),
  ).length

  // Trend: mean of first three maxes vs last three maxes.
  const trend = computeTrend(days.map((d) => d.max), n)

  const sentences: string[] = []

  // Sentence 1 — overall wetness.
  if (wetCount === 0) {
    sentences.push('Mostly dry week ahead.')
  } else if (wetCount >= Math.ceil(n / 2)) {
    sentences.push(`Mostly wet week — rain on ${wetCount} of ${n} days.`)
  } else {
    sentences.push(`A few wet spells — rain on ${wetCount} of ${n} days.`)
  }

  // Sentence 2 — warmest / coolest.
  if (warmest && coolest) {
    sentences.push(
      `Warmest ${weekdayLong(warmest.time)} (${Math.round(
        warmest.temp,
      )}${unitSymbol}), coolest by ${weekdayLong(coolest.time)} (${Math.round(
        coolest.temp,
      )}${unitSymbol}).`,
    )
  }

  // Sentence 3 — trend toward the end of the week.
  if (trend === 'warming') {
    sentences.push('Warming toward the weekend.')
  } else if (trend === 'cooling') {
    sentences.push('Cooling toward the weekend.')
  } else if (trend === 'steady') {
    sentences.push('Temperatures hold steady through the week.')
  }

  return sentences.join(' ')
}

function computeTrend(
  maxes: (number | null)[],
  n: number,
): 'warming' | 'cooling' | 'steady' | null {
  if (n < 4) return null
  const firstThree = maxes.slice(0, 3).filter((v): v is number => v != null)
  const lastThree = maxes.slice(-3).filter((v): v is number => v != null)
  if (!firstThree.length || !lastThree.length) return null

  const mean = (arr: number[]) => arr.reduce((a, b) => a + b, 0) / arr.length
  const delta = mean(lastThree) - mean(firstThree)

  if (delta >= 2) return 'warming'
  if (delta <= -2) return 'cooling'
  return 'steady'
}
