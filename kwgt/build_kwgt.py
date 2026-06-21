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


def text(expr, size, color=FG, align="CENTER", bold=False, title=None, width=None):
    m = {
        "internal_type": "TextModule",
        "text_expression": expr,
        "text_size": float(size),
        "text_align": align,
        "paint_color": color,
    }
    if bold:
        m["text_style_bold"] = True
    if width:
        # Fixed width (px) forces the text to wrap instead of overflowing.
        m["text_width"] = float(width)
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


def stat(value_expr, label):
    """One cell of the stats row: value over label, stacked vertically.

    (No glyph: KWGT's bundled icon font lacks newer names like `thermostat`,
    which render as an error mark. The values + labels read cleanly on their
    own and match the reference card.)"""
    return stack(
        [
            text(value_expr, 18, FG),
            text(label, 9, FAINT),
        ],
        orientation="VERTICAL_CENTER",
        margin=2.0,
    )


def gauge():
    """Vertical thermometer bar built from shapes (reliable, unlike a
    misconfigured ProgressModule). Today's high on top, low on the bottom."""
    bar = {
        "internal_type": "ShapeModule",
        "internal_title": "Gauge bar",
        "shape_type": "RECT",
        "shape_corners": 8.0,
        "shape_width": 8.0,
        "shape_height": 96.0,
        "paint_color": ACCENT,
    }
    return stack(
        [
            text("$wf(max,0)$°", 12, "#FFFCA5A5"),
            bar,
            text("$wf(min,0)$°", 12, "#FF7DD3FC"),
        ],
        orientation="VERTICAL_CENTER",
        margin=4.0,
        title="Temp gauge",
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

    # Currently label + condition + big temperature, with the condition icon
    # to its left and the gauge to its right.
    current_block = stack(
        [
            text("CURRENTLY", 10, FAINT, title="Currently label"),
            text("$tc(cap,wi(cond))$", 15, MUTED, width=150, title="Condition"),
            text("$wi(temp)$°", 58, FG, title="Current temp"),
        ],
        orientation="VERTICAL_CENTER",
        margin=2.0,
        title="Current block",
    )

    current_row = stack(
        [
            fonticon(
                "wb_sunny",
                52,
                FG,
                formula=icon_formula("wi(icon)"),
                title="Current icon",
            ),
            current_block,
            gauge(),
        ],
        orientation="HORIZONTAL_CENTER",
        margin=14.0,
        title="Current row",
    )

    stats_row = stack(
        [
            stat("$wi(flik)$°", "FEELS"),
            stat("$wi(hum)$%", "HUMIDITY"),
            stat("$wi(wind)$$wi(windu)$", "WIND"),
        ],
        orientation="HORIZONTAL_CENTER",
        margin=22.0,
        title="Stats row",
    )

    summary_block = text(
        summary, 13, MUTED, align="LEFT", width=336, title="Week summary"
    )

    forecast_label = text("7-DAY FORECAST", 10, FAINT, align="LEFT")
    forecast = stack(
        [forecast_row(n) for n in range(7)],
        orientation="VERTICAL_CENTER",
        margin=4.0,
        title="Forecast strip",
    )

    location_row = text("$li(addr)$", 14, MUTED, title="Location")

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
