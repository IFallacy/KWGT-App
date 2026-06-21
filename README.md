# Glass Weather

A self-contained, mobile-first weather app showing a summarised **7-day
forecast** in a dark "glass card" style. Built with Vite + React + TypeScript +
Tailwind CSS, using icons from `lucide-react` and an hourly chart from
`recharts`.

**No API keys required.** All data comes from free, keyless endpoints.

## Run

```bash
npm install
npm run dev
```

Then open the URL Vite prints (default <http://localhost:5173>).

To build for production:

```bash
npm run build
npm run preview
```

## Features

- **Current conditions** — large temperature, condition label, and a
  day/night-aware weather icon.
- **Today gauge** — a vertical gradient thermometer showing today's high and
  low with a marker at the current temperature.
- **Stats row** — feels-like, humidity, precipitation chance, and wind.
- **Weekly summary** — a 1–2 sentence, rule-based natural-language summary
  (warmest/coolest day, wet-day count, warming/cooling trend).
- **7-day strip** — weekday, icon, high/low, and precip % when ≥ 30%, with
  today highlighted.
- **Hourly chart** — a slim area chart of the next ~24 hours of temperature.
- **°C / °F toggle** — refetches with the correct unit parameters.
- **Location** — browser geolocation on load (with reverse geocoding for the
  place name), a debounced city search, and a London fallback when geolocation
  is denied. The last location and unit choice are persisted to `localStorage`.

## Data sources (all keyless)

- **Forecast** — [Open-Meteo Forecast API](https://open-meteo.com/)
  (`current`, `daily`, `hourly`, `timezone=auto`, `forecast_days=7`).
- **City search** — [Open-Meteo Geocoding API](https://open-meteo.com/en/docs/geocoding-api).
- **Reverse geocoding** — [BigDataCloud client API](https://www.bigdatacloud.com/).

## Project structure

```
src/
  App.tsx                 # composition + location/units/state orchestration
  types.ts                # API + app TypeScript interfaces
  lib/
    api.ts                # fetch wrappers (forecast, search, reverse geocode)
    weatherCodes.tsx      # WMO code → { label, Icon }, day/night variants
    summary.ts            # rule-based weekly summary (LLM swap seam marked)
    format.ts             # temperature / date / timezone-safe formatting
    storage.ts            # localStorage persistence
    geolocation.ts        # geolocation promise wrapper
  hooks/
    useWeather.ts         # forecast fetching with abort + retry
    useDebounce.ts        # debounced value for the search box
  components/
    LocationBar · CurrentBlock · TempGauge · StatsRow
    WeekSummary · ForecastStrip · HourlyChart
    CitySearch · ErrorCard · Skeletons
```

## Notes

- Weekday labels are derived from the dates the API returns in the location's
  timezone (`timezone=auto`), not the browser's.
- Missing/null fields render as `—`; network failures show an inline retry
  card rather than a blank screen.
- The weekly summary is deterministic. `src/lib/summary.ts` marks a clear seam
  where it could be replaced by a richer (e.g. Anthropic API) summary.
