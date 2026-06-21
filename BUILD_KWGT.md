# Building the Glass Weather widget in KWGT

This guide rebuilds the glass-card weather design (see the web app in this repo,
which is the **visual reference**) as a native **KWGT** preset on Android.

> **Why not just import the web app?** KWGT can't run web/React code. A KWGT
> widget is a tree of layers (text, shapes, bitmaps, progress) driven by
> Kustom's formula language. So we recreate the look natively and wire the
> dynamic fields to Kustom's weather functions.

A note on formula names: KWGT's editor has a function browser — tap the **`fx`**
button on any text/formula field, then **Weather** / **Date** / **Math**, to see
the exact fields *your* KWGT version exposes. The names below match recent
versions; if one returns blank, confirm it in that browser.

---

## 0. Prerequisite: set up a weather source (do this first)

This is the #1 reason `$wf(...)$` formulas come back empty. In the **KWGT app**
(not the widget editor):

1. Open **KWGT → Settings (gear) → Weather**.
2. Pick a provider. Recent KWGT versions require an **OpenWeatherMap** API key
   (free tier) for forecasts, or use the built-in provider if your version
   offers one.
3. Grant **location** permission (precise) so the widget knows where you are,
   or set a manual location.
4. Set the update interval (e.g. 1–3 hours).

Until a provider returns data, every weather formula renders blank — that's
expected, not a mistake in your layers.

---

## 1. Create the widget + canvas

1. Add a KWGT widget to your home screen (resize it to a tall phone-card shape,
   roughly 4×6 cells) and tap it to open the editor.
2. **Background**: the glass card.
   - Add a **Shape** layer → **Rectangle**, enable **Rounded** corners (large
     radius, ~60–80 to mirror `rounded-3xl`).
   - Fill **Color**: a near-black with transparency, e.g. `#CC11151F`
     (`CC` alpha ≈ 80%). KWGT has no true backdrop blur; the translucent dark
     fill is the substitute.
   - Optional **Shadow** (Effects) for the soft drop shadow.
   - Size it to fill the widget with a little margin.

Everything below sits **on top** of this shape. Use **Stack Group** layers to
keep related items together and positioned with offsets.

---

## 2. Layer map (mirrors the web components)

| Web component   | KWGT layer(s)                                              |
|-----------------|-----------------------------------------------------------|
| LocationBar     | Text (place name) + small map-pin bitmap/font glyph       |
| CurrentBlock    | Text "CURRENTLY" + Text condition + big Text temperature  |
| Weather icon    | Text layer set to the **Weather font** (glyph from code)  |
| TempGauge       | Shape (gradient bar) + Progress/Shape marker (formula)    |
| StatsRow        | 4 × Stack Group: small glyph + value Text + label Text    |
| WeekSummary     | One Text layer with the summary formula (section 4)       |
| ForecastStrip   | 7 × Stack Group, one per forecast day (section 3)         |
| HourlyChart     | See section 5 (KWGT limitation — approximate or omit)     |

---

## 2a. Current conditions — formulas

- **Place name** (Text): `$li(addr)$` for the locality, or set a manual label.
  (Weather data itself doesn't carry a city name; `li(...)` is location info.)
- **"CURRENTLY"** (Text): static, letter-spaced, low opacity.
- **Condition text** (Text): `$wf(cond)$`
- **Big temperature** (Text, large): `$wf(temp)$°`
  - To force whole degrees: `$mu(round, wf(temp))$°`

### Weather icon (day/night aware)

1. Add a **Text** layer.
2. Set its **Font** to KWGT's bundled **Weather** icon font.
3. Content: `$wf(icon)$` — this returns the glyph matching the current
   condition code for that font. For a forecast day use `$wf(icon, N)$`
   (section 3).
4. KWGT's weather icon set is already day/night aware via the provider's
   is-day flag, so no manual switching is needed.

---

## 2b. Today gauge (vertical thermometer)

Goal: a vertical bar, today's **high** at the top and **low** at the bottom,
with a marker at the **current** temperature.

1. **Bar**: a tall thin rounded **Shape**. Give it a **Gradient** paint going
   from sky-blue (bottom) → amber → rose (top) to match the web gauge.
2. **High/Low labels**: two Text layers — top = `$wf(high)°$`,
   bottom = `$wf(low)°$`.
3. **Marker** (a small circle Shape): position it along the bar by formula.
   Compute the fraction of the way from low→high:

   ```
   $(wf(temp) - wf(low)) / (wf(high) - wf(low))$
   ```

   Multiply by the bar's height in pixels and use it as the marker's vertical
   **Offset** (invert if your offset grows downward). Clamp to avoid overflow:

   ```
   $mu(min, 1, mu(max, 0, (wf(temp)-wf(low))/(wf(high)-wf(low)))) * BAR_HEIGHT$
   ```

   Replace `BAR_HEIGHT` with the bar's pixel height.

---

## 2c. Stats row (4 items)

Each item is a small Stack Group with a glyph (icon font or bitmap), a value,
and a label. Formulas:

| Item       | Value formula                | Label    |
|------------|------------------------------|----------|
| Feels like | `$wf(feels)°$`               | FEELS    |
| Humidity   | `$wf(humidity)%$`            | HUMIDITY |
| Precip     | `$wf(pop)%$`                 | PRECIP   |
| Wind       | `$wf(wind)$ km/h`            | WIND     |

`pop` = probability of precipitation. If your provider doesn't expose `pop`,
substitute `$wf(rain)$` or hide that stat. Wind units follow the provider /
KWGT unit setting (Settings → Weather → units), so switch there for mph.

---

## 3. 7-day forecast strip

KWGT has no "loop", so build **one** day row, then **duplicate it 6 times** and
change only the forecast index `N` (0 = today … 6).

For a row with index `N`:

- **Weekday**: `$df(EEE, dp(Nd))$` → e.g. "Mon" for today+N days.
  - For `N = 0` show `Today`: `$if(0=N, "Today", df(EEE, dp(Nd)))$`
    (replace `N` with the literal number in each duplicated row).
- **Icon**: Text layer, Weather font, content `$wf(icon, N)$`.
- **High** (bold): `$wf(high, N)°$`
- **Low** (muted): `$wf(low, N)°$`
- **Precip %** (only when ≥ 30): set the layer's content to
  `$if(wf(pop, N) >= 30, wf(pop, N) + "%", "")$`
- **Highlight today**: on the `N = 0` row, add a faint rounded Shape behind it
  (e.g. `#1AFFFFFF`).

Lay the 7 rows out vertically with even spacing inside a Stack Group.

> `dp(Nd)` is Kustom date-math for "N days from now". If your version uses a
> different syntax, the `fx → Date` browser shows the supported offset format.

---

## 4. Weekly summary (rule-based, in Kustom formulas)

This reproduces `src/lib/summary.ts` using Kustom's `mu` (math), `if`, and
string concatenation. Paste it into a single **Text** layer. It assumes 7
forecast days (`high/low/pop` for indices 0–6).

**Wet-day count** (code-based wetness isn't reliably exposed, so use precip
probability ≥ 50 as the wet test):

```
$mu(round,
  if(wf(pop,0)>=50,1,0) + if(wf(pop,1)>=50,1,0) + if(wf(pop,2)>=50,1,0) +
  if(wf(pop,3)>=50,1,0) + if(wf(pop,4)>=50,1,0) + if(wf(pop,5)>=50,1,0) +
  if(wf(pop,6)>=50,1,0)
)$
```

**Warmest high** across the week:

```
$mu(max, wf(high,0), wf(high,1), wf(high,2), wf(high,3), wf(high,4), wf(high,5), wf(high,6))$
```

**Coolest low** across the week:

```
$mu(min, wf(low,0), wf(low,1), wf(low,2), wf(low,3), wf(low,4), wf(low,5), wf(low,6))$
```

**Trend** (mean of first 3 highs vs last 3 highs):

```
$( (wf(high,4)+wf(high,5)+wf(high,6))/3 ) - ( (wf(high,0)+wf(high,1)+wf(high,2))/3 )$
```

**Composed sentence** — put this whole thing in the summary Text layer (it
nests the pieces above; tidy it by storing the parts as **Global Variables**
under *Globals* and referencing them with `gv(name)` to keep it readable):

```
$
  (if(WET=0, "Mostly dry week ahead.",
     if(WET>=4, "Mostly wet week — rain on "+WET+" of 7 days.",
        "A few wet spells — rain on "+WET+" of 7 days.")))
  + " Warmest " + mu(round, WARM) + "°, coolest " + mu(round, COOL) + "°."
  + (if(TREND>=2, " Warming toward the weekend.",
       if(TREND<=-2, " Cooling toward the weekend.",
          " Temperatures hold steady.")))
$
```

Where `WET`, `WARM`, `COOL`, `TREND` are global variables holding the four
formulas above. (Inlining them works too, it's just a long line.)

> The web version also names the warmest/coolest *weekday*. KWGT can't easily
> map "which index held the max" back to a weekday in one formula, so this
> version reports the temperatures. If you want the weekday too, store each
> day's high in a global and use nested `if`s to pick the matching `df(EEE,...)`.

---

## 5. Hourly chart (limitation)

KWGT can't draw an arbitrary smooth line chart like the web app's recharts area.
Options, roughly in order of fidelity:

- **Approximate with bars**: a row of thin Shape layers whose heights are driven
  by hourly temps, if your provider exposes hourly weather to KWGT
  (many only expose daily forecast — check the `fx → Weather` browser).
- **Omit it**: the daily strip already carries the trend; dropping the hourly
  chart keeps the widget clean.
- **Static bitmap**: export the chart image from the web app and place it as a
  decorative Bitmap (won't update).

I'd start by omitting it and revisit if hourly data is available on your device.

---

## 6. Save, export, apply

1. In the editor, tap the **save** (disk/check) icon to apply the widget to your
   home screen.
2. To **export/share** the preset: editor → menu → **Export** → it writes a
   `.kwgt` file (a ZIP containing `preset.json`, fonts, bitmaps, preview). You
   can back this up or share it.
3. If weather fields are blank, revisit **section 0** (weather source) and check
   location permission and the update interval.

---

## Mapping cheat-sheet (web → KWGT)

| Web (this repo)                         | KWGT formula                                  |
|-----------------------------------------|-----------------------------------------------|
| `current.temperature_2m`                | `$wf(temp)$`                                   |
| `current.apparent_temperature`          | `$wf(feels)$`                                   |
| `current.relative_humidity_2m`          | `$wf(humidity)$`                                |
| `current.weather_code` → icon           | `$wf(icon)$` (Weather font)                     |
| condition label                         | `$wf(cond)$`                                     |
| `current.wind_speed_10m`                | `$wf(wind)$`                                      |
| `daily.temperature_2m_max[N]`           | `$wf(high, N)$`                                   |
| `daily.temperature_2m_min[N]`           | `$wf(low, N)$`                                    |
| `daily.precipitation_probability_max[N]`| `$wf(pop, N)$`                                    |
| weekday label for day N                 | `$df(EEE, dp(Nd))$`                              |
| weekly summary logic                    | section 4                                        |
