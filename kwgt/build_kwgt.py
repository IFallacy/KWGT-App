#!/usr/bin/env python3
"""
Generate a Glass Weather KWGT preset (.kwgt) from the same design spec as the
web app in this repo.

A .kwgt file is a ZIP with `preset.json` at its root plus preview thumbnails.
The schema mirrors a real, working KWGT v13 preset (module types, field names),
verified against an on-device import, and wires every dynamic value to Kustom's
weather functions:

  current:  wi(temp), wi(flik), wi(hum), wi(wind), wi(windu), wi(cond), wi(icon)
  forecast: wf(max, N), wf(min, N), wf(icon, N)   (N = day index, 0 = today)

Run:  python3 kwgt/build_kwgt.py
Out:  kwgt/GlassWeather.kwgt
"""

import base64
import json
import os
import zipfile

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(HERE)
OUT_DIR = HERE

# ----- palette (ARGB hex) ----------------------------------------------------
FG = "#FFFFFFFF"        # primary text
MUTED = "#C2FFFFFF"     # ~76% white
FAINT = "#80FFFFFF"     # ~50% white
ACCENT = "#FFFBBF24"    # amber
HOT = "#FFFCA5A5"       # rose (highs)
COLD = "#FF7DD3FC"      # sky (lows)
CARD = "#A610151F"      # translucent dark card (~65%) -> wallpaper shows through
EDGE = "#2EFFFFFF"      # subtle glass rim
DIVIDER = "#1FFFFFFF"

CARD_W = 384.0
CARD_H = 596.0

# WMO-ish wetness test fragment for forecast day {n}.
WET_SET = '"RAIN"|wf(icon,{n})="SHOWER"|wf(icon,{n})="TSTORM"|wf(icon,{n})="TSHOWER"|wf(icon,{n})="SNOW"|wf(icon,{n})="LSNOW"|wf(icon,{n})="SLEET"|wf(icon,{n})="HAIL"'


def icon_formula(src):
    """Map a Kustom weather-icon enum (`src`, e.g. wi(icon)) to a built-in
    Material icon name for a FontIconModule."""
    return (
        f'$if({src}="CLEAR","wb_sunny",'
        f'{src}="PCLOUDY","wb_cloudy",'
        f'{src}="MCLOUDY","cloud",'
        f'{src}="RAIN"|{src}="SHOWER","grain",'
        f'{src}="TSTORM"|{src}="TSHOWER","flash_on",'
        f'{src}="SNOW"|{src}="LSNOW"|{src}="SLEET"|{src}="HAIL","ac_unit",'
        f'{src}="FOG"|{src}="WINDY","cloud",'
        f'"wb_sunny")$'
    )


def wet_count_formula():
    parts = [f"if(wf(icon,{n})={WET_SET.format(n=n)},1,0)" for n in range(7)]
    return "$" + "+".join(parts) + "$"


def warmest_formula():
    return "$mu(round,mu(max," + ",".join(f"wf(max,{n})" for n in range(7)) + "))$"


def coolest_formula():
    return "$mu(round,mu(min," + ",".join(f"wf(min,{n})" for n in range(7)) + "))$"


def trend_formula():
    last = "(wf(max,4)+wf(max,5)+wf(max,6))/3"
    first = "(wf(max,0)+wf(max,1)+wf(max,2))/3"
    return f"$mu(round,({last})-({first}))$"


# ----- module builders -------------------------------------------------------

def text(expr, size, color=FG, align="CENTER", bold=False, width=None, title=None):
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


def rect(w, h, color, corners=0.0, gradient=None, grad_color=None,
         style=None, stroke=None, title=None):
    m = {
        "internal_type": "ShapeModule",
        "shape_type": "RECT",
        "shape_width": float(w),
        "shape_height": float(h),
        "shape_corners": float(corners),
        "paint_color": color,
    }
    if gradient:
        m["fx_gradient"] = gradient
        m["fx_gradient_color"] = grad_color
    if style == "STROKE":
        m["paint_style"] = "STROKE"
        m["paint_width"] = float(stroke or 2.0)
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
    return stack(
        [text(value_expr, 19, FG, bold=True), text(label, 9, FAINT)],
        orientation="VERTICAL_CENTER",
        margin=2.0,
    )


def forecast_col(n):
    weekday = "$df(EEE)$" if n == 0 else f"$df(EEE,a{n}d)$"
    wday_color = ACCENT if n == 0 else FAINT
    return stack(
        [
            text(weekday, 10, wday_color, title=f"Day {n} weekday"),
            fonticon("wb_sunny", 19, FG, formula=icon_formula(f"wf(icon,{n})")),
            text(f"$wf(max,{n})$°", 13, FG, bold=True),
            text(f"$wf(min,{n})$°", 12, FAINT),
        ],
        orientation="VERTICAL_CENTER",
        margin=3.0,
        title=f"Forecast day {n}",
    )


def build_preset():
    globals_list = {
        "wet": {"index": 0, "type": "NUMBER", "title": "wet", "min": 0,
                "max": 7, "global_formula": wet_count_formula()},
        "warm": {"index": 1, "type": "NUMBER", "title": "warm", "min": -100,
                 "max": 200, "global_formula": warmest_formula()},
        "cool": {"index": 2, "type": "NUMBER", "title": "cool", "min": -100,
                 "max": 200, "global_formula": coolest_formula()},
        "trend": {"index": 3, "type": "NUMBER", "title": "trend", "min": -100,
                  "max": 100, "global_formula": trend_formula()},
    }

    # Summary: three short sentences separated by real newlines so each fits on
    # one line regardless of text-wrap support.
    s1 = ('$if(gv(wet)=0,"Mostly dry week ahead.",'
          'gv(wet)>=4,"Mostly wet week, rain "+gv(wet)+" of 7 days.",'
          '"A few wet spells, rain "+gv(wet)+" of 7 days.")$')
    s2 = "Warmest $gv(warm)$°, coolest $gv(cool)$°."
    s3 = ('$if(gv(trend)>=2,"Warming toward the weekend.",'
          'gv(trend)<=-2,"Cooling toward the weekend.",'
          '"Temperatures hold steady.")$')
    summary = s1 + "\n" + s2 + "\n" + s3

    # --- location -----------------------------------------------------------
    location = text("$li(addr)$", 13, MUTED, title="Location")

    # --- hero: icon + (currently / condition / big temp) --------------------
    current_block = stack(
        [
            text("CURRENTLY", 9, FAINT, align="LEFT", title="Currently label"),
            text("$tc(cap,wi(cond))$", 13, MUTED, align="LEFT", width=150,
                 title="Condition"),
            text("$wi(temp)$°", 54, FG, align="LEFT", title="Current temp"),
        ],
        orientation="VERTICAL_RIGHT",
        margin=1.0,
        title="Current block",
    )
    hero = stack(
        [
            fonticon("wb_sunny", 50, FG, formula=icon_formula("wi(icon)"),
                     title="Current icon"),
            current_block,
        ],
        orientation="HORIZONTAL_CENTER",
        margin=16.0,
        title="Hero",
    )

    # --- temperature range bar (gradient) -----------------------------------
    range_labels = stack(
        [
            text("H $wf(max,0)$°", 12, HOT),
            text("L $wf(min,0)$°", 12, COLD),
        ],
        orientation="HORIZONTAL_CENTER",
        margin=60.0,
    )
    range_bar = rect(300, 7, COLD, corners=4.0, gradient="HORIZONTAL",
                     grad_color=HOT, title="Range bar")
    range_block = stack([range_labels, range_bar],
                        orientation="VERTICAL_CENTER", margin=6.0,
                        title="Temp range")

    # --- stats --------------------------------------------------------------
    stats = stack(
        [
            stat("$wi(flik)$°", "FEELS"),
            stat("$wi(hum)$%", "HUMIDITY"),
            stat("$wi(wind)$$wi(windu)$", "WIND"),
        ],
        orientation="HORIZONTAL_CENTER",
        margin=26.0,
        title="Stats",
    )

    divider = rect(320, 1, DIVIDER, title="Divider")

    summary_block = text(summary, 12, MUTED, align="CENTER", width=320,
                         title="Week summary")

    forecast_label = text("7-DAY FORECAST", 9, FAINT, title="Forecast label")
    forecast = stack(
        [forecast_col(n) for n in range(7)],
        orientation="HORIZONTAL_CENTER",
        margin=6.0,
        title="Forecast strip",
    )

    content = stack(
        [
            location,
            hero,
            range_block,
            stats,
            divider,
            summary_block,
            forecast_label,
            forecast,
        ],
        orientation="VERTICAL_CENTER",
        margin=13.0,
        title="Content",
    )

    # --- glass card: translucent fill + soft shadow + subtle rim ------------
    card_fill = rect(CARD_W, CARD_H, CARD, corners=46.0, title="Card background")
    card_fill["fx_shadow"] = "OUTER"
    card_fill["fx_shadow_blur"] = 34
    card_fill["fx_shadow_color"] = "#73000000"
    card_fill["fx_shadow_direction"] = 0
    card_edge = rect(CARD_W, CARD_H, EDGE, corners=46.0, style="STROKE",
                     stroke=2.0, title="Card edge")

    root = {
        "internal_type": "RootLayerModule",
        "globals_list": globals_list,
        "config_scale_value": 150.0,
        "internal_events": [{"type": "SINGLE_TAP", "action": "DISABLED"}],
        "viewgroup_items": [card_fill, card_edge, content],
    }

    return {
        "preset_info": {
            "archive": None,
            "author": "Glass Weather",
            "description": "Dark glass-card 7-day weather forecast.",
            "email": "",
            "features": "WEATHER FORECAST",
            "pflags": 0,
            "height": int(CARD_H + 30),
            "locked": False,
            "release": 377435216,
            "title": "Glass Weather",
            "version": 13,
            "width": int(CARD_W + 30),
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
