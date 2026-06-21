#!/usr/bin/env python3
"""
Generate a Glass Weather KWGT preset (.kwgt) from the same design spec as the
web app in this repo.

A .kwgt file is a ZIP with `preset.json` at its root plus preview thumbnails.
The schema here mirrors a real, working KWGT v13 preset (module types, field
names) and wires every dynamic value to Kustom's weather functions:

  current:  wi(temp), wi(flik), wi(hum), wi(wind), wi(windu), wi(cond), wi(icon)
  forecast: wf(max, N), wf(min, N), wf(icon, N)   (N = day index, 0 = today)

Run:  python3 kwgt/build_kwgt.py
Out:  dist/GlassWeather.kwgt
"""

import base64
import json
import os
import zipfile

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(HERE)
# Output next to this script so the .kwgt ships with the repo (dist/ is ignored).
OUT_DIR = HERE

# ----- palette (ARGB hex, matching the dark glass card) ----------------------
FG = "#FFFFFFFF"        # primary text
MUTED = "#B3FFFFFF"     # ~70% white
FAINT = "#80FFFFFF"     # ~50% white
CARD = "#E6121722"      # translucent dark card
ACCENT = "#FFFBBF24"    # amber
TODAY = "#1FFFFFFF"     # today-row highlight

WET_SET = '"RAIN"|wf(icon,{n})="SHOWER"|wf(icon,{n})="TSTORM"|wf(icon,{n})="TSHOWER"|wf(icon,{n})="SNOW"|wf(icon,{n})="LSNOW"|wf(icon,{n})="SLEET"|wf(icon,{n})="HAIL"'


def icon_formula(src):
    """Map a Kustom weather-icon enum (from `src`, e.g. wi(icon)) to a built-in
    Material icon name for a FontIconModule."""
    return (
        f'$if({src}="CLEAR","wb_sunny",'
        f'{src}="PCLOUDY","wb_cloudy",'
        f'{src}="MCLOUDY","cloud",'
        f'{src}="RAIN"|{src}="SHOWER","grain",'
        f'{src}="TSTORM"|{src}="TSHOWER","flash_on",'
        f'{src}="SNOW"|{src}="LSNOW"|{src}="SLEET"|{src}="HAIL","ac_unit",'
        f'{src}="FOG"|{src}="WINDY","cloud",'
        f'"cloud")$'
    )


def wet_count_formula():
    parts = []
    for n in range(7):
        cond = f'wf(icon,{n})=' + WET_SET.format(n=n)
        parts.append(f"if({cond},1,0)")
    return "$" + "+".join(parts) + "$"


def warmest_formula():
    args = ",".join(f"wf(max,{n})" for n in range(7))
    return f"$mu(round,mu(max,{args}))$"


def coolest_formula():
    args = ",".join(f"wf(min,{n})" for n in range(7))
    return f"$mu(round,mu(min,{args}))$"


def trend_formula():
    last = "(wf(max,4)+wf(max,5)+wf(max,6))/3"
    first = "(wf(max,0)+wf(max,1)+wf(max,2))/3"
    return f"$mu(round,({last})-({first}))$"


def text(expr, size, color=FG, align="CENTER", bold=False, title=None):
    m = {
        "internal_type": "TextModule",
        "text_expression": expr,
        "text_size": float(size),
        "text_align": align,
        "paint_color": color,
    }
    if bold:
        m["text_style_bold"] = True
    if title:
        m["internal_title"] = title
    return m


def fonticon(name, size, color=FG, formula=None, title=None):
    m = {
        "internal_type": "FontIconModule",
        "icon_icon": name,
        "icon_size": float(size),
        "paint_color": color,
    }
    if formula:
        m["internal_formulas"] = {"icon_icon": formula}
    if title:
        m["internal_title"] = title
    return m


def stack(items, orientation="VERTICAL_CENTER", margin=0.0, title=None, **extra):
    m = {
        "internal_type": "StackLayerModule",
        "config_stacking": orientation,
        "viewgroup_items": items,
    }
    if margin:
        m["config_margin"] = float(margin)
    if title:
        m["internal_title"] = title
    m.update(extra)
    return m


def stat(icon_name, value_expr, label):
    """One cell of the stats row: glyph, value, label, stacked vertically."""
    return stack(
        [
            fonticon(icon_name, 16, MUTED),
            text(value_expr, 16, FG),
            text(label, 9, FAINT),
        ],
        orientation="VERTICAL_CENTER",
        margin=2.0,
    )


def forecast_row(n):
    weekday = "Today" if n == 0 else f"$df(EEE,a{n}d)$"
    precip = f'$if(wf(icon,{n})={WET_SET.format(n=n)},"●","")$'
    row_items = [
        text(weekday, 13, FG if n == 0 else MUTED, title=f"Day{n} weekday"),
        fonticon("wb_sunny", 18, FG, formula=icon_formula(f"wf(icon,{n})")),
        text(precip, 9, ACCENT),
        text(f"$wf(max,{n})$°", 15, FG, bold=True),
        text(f"$wf(min,{n})$°", 15, FAINT),
    ]
    row = stack(
        row_items,
        orientation="HORIZONTAL_CENTER",
        margin=10.0,
        title=f"Forecast day {n}",
    )
    if n == 0:
        row["paint_bg_color"] = TODAY
    return row


def build_preset():
    globals_list = {
        "wet": {
            "index": 0,
            "type": "NUMBER",
            "title": "wet",
            "min": 0,
            "max": 7,
            "global_formula": wet_count_formula(),
        },
        "warm": {
            "index": 1,
            "type": "NUMBER",
            "title": "warm",
            "min": -100,
            "max": 200,
            "global_formula": warmest_formula(),
        },
        "cool": {
            "index": 2,
            "type": "NUMBER",
            "title": "cool",
            "min": -100,
            "max": 200,
            "global_formula": coolest_formula(),
        },
        "trend": {
            "index": 3,
            "type": "NUMBER",
            "title": "trend",
            "min": -100,
            "max": 100,
            "global_formula": trend_formula(),
        },
    }

    summary = (
        '$if(gv(wet)=0,"Mostly dry week ahead.",'
        'gv(wet)>=4,"Mostly wet week, rain on "+gv(wet)+" of 7 days.",'
        '"A few wet spells, rain on "+gv(wet)+" of 7 days.")$'
        " Warmest $gv(warm)$°, coolest $gv(cool)$°."
        '$if(gv(trend)>=2," Warming toward the weekend.",'
        'gv(trend)<=-2," Cooling toward the weekend.",'
        '" Temperatures hold steady.")$'
    )

    # Current block (left) + temperature gauge (right) in a horizontal row.
    current_block = stack(
        [
            text("CURRENTLY", 10, FAINT, align="LEFT", title="Currently label"),
            text("$tc(cap,wi(cond))$", 16, MUTED, align="LEFT", title="Condition"),
            text("$wi(temp)$°", 60, FG, align="LEFT", title="Current temp"),
        ],
        orientation="VERTICAL_RIGHT",
        margin=2.0,
        title="Current block",
    )

    gauge = {
        "internal_type": "ProgressModule",
        "internal_title": "Temp gauge",
        "progress_progress": "CUSTOM",
        "progress_mode": "LINE",
        "progress_level": 50.0,
        "style_shape": "RECT",
        "style_width": 10.0,
        "style_height": 120.0,
        "paint_color": ACCENT,
        "config_rotate_mode": "FIXED",
        "config_rotate_offset": 270.0,
        "internal_formulas": {
            # Current temp's position between today's low and high (0-100%).
            "progress_level": "$mu(min,100,mu(max,0,(wi(temp)-wf(min,0))/(wf(max,0)-wf(min,0))*100))$"
        },
    }

    current_row = stack(
        [
            current_block,
            fonticon(
                "wb_sunny",
                64,
                FG,
                formula=icon_formula("wi(icon)"),
                title="Current icon",
            ),
            gauge,
        ],
        orientation="HORIZONTAL_CENTER",
        margin=16.0,
        title="Current row",
    )

    stats_row = stack(
        [
            stat("thermostat", "$wi(flik)$°", "FEELS"),
            stat("water_drop", "$wi(hum)$%", "HUMIDITY"),
            stat("air", "$wi(wind)$$wi(windu)$", "WIND"),
        ],
        orientation="HORIZONTAL_CENTER",
        margin=18.0,
        title="Stats row",
    )

    summary_block = text(summary, 13, MUTED, align="LEFT", title="Week summary")

    forecast_label = text("7-DAY FORECAST", 10, FAINT, align="LEFT")
    forecast = stack(
        [forecast_row(n) for n in range(7)],
        orientation="VERTICAL_CENTER",
        margin=4.0,
        title="Forecast strip",
    )

    location_row = stack(
        [
            fonticon("place", 14, MUTED),
            text("$li(addr)$", 14, FG, title="Location"),
        ],
        orientation="HORIZONTAL_CENTER",
        margin=4.0,
        title="Location bar",
    )

    main = stack(
        [
            location_row,
            current_row,
            stats_row,
            summary_block,
            forecast_label,
            forecast,
        ],
        orientation="VERTICAL_CENTER",
        margin=14.0,
        title="Content",
        config_margin=14.0,
    )

    background = {
        "internal_type": "ShapeModule",
        "internal_title": "Card background",
        "shape_type": "RECT",
        "shape_corners": 48.0,
        "shape_width": 400.0,
        "shape_height": 752.0,
        "paint_color": CARD,
    }

    root = {
        "internal_type": "RootLayerModule",
        "globals_list": globals_list,
        "config_scale_value": 150.0,
        "internal_events": [{"type": "SINGLE_TAP", "action": "DISABLED"}],
        "viewgroup_items": [background, main],
    }

    return {
        "preset_info": {
            "archive": None,
            "author": "Glass Weather",
            "description": "Dark glass-card 7-day weather forecast.",
            "email": "",
            "features": "WEATHER FORECAST",
            "pflags": 0,
            "height": 760,
            "locked": False,
            "release": 377435216,
            "title": "Glass Weather",
            "version": 13,
            "width": 415,
            "xscreens": 0,
            "yscreens": 0,
        },
        "preset_root": root,
    }


# A small valid baseline JPEG used as a placeholder preview thumbnail.
_THUMB_B64 = (
    "/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRof"
    "Hh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAALCAABAAEBAREA/8QAFAAB"
    "AAAAAAAAAAAAAAAAAAAAAv/EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAD8AfwD/2Q=="
)


def main():
    os.makedirs(OUT_DIR, exist_ok=True)
    preset = build_preset()

    preset_json = json.dumps(preset, indent=2, ensure_ascii=False)
    json.loads(preset_json)  # sanity: valid JSON

    thumb = base64.b64decode(_THUMB_B64)
    out_path = os.path.join(OUT_DIR, "GlassWeather.kwgt")

    with zipfile.ZipFile(out_path, "w", zipfile.ZIP_DEFLATED) as z:
        z.writestr("preset.json", preset_json)
        z.writestr("preset_thumb_portrait.jpg", thumb)
        z.writestr("preset_thumb_landscape.jpg", thumb)

    print(f"Wrote {out_path} ({os.path.getsize(out_path)} bytes)")
    print(f"preset.json: {len(preset_json)} bytes, valid JSON")


if __name__ == "__main__":
    main()
