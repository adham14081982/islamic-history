#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""يركّب ورقة معاينة لحزمة الأيقونات: كيف ستبدو على الشاشة فعليًا."""
from PIL import Image, ImageDraw

SRC = "assets/icons"
OUT = "assets/icons/preview.png"


def mask(size, shape="circle", ss=4):
    m = Image.new("L", (size * ss, size * ss), 0)
    d = ImageDraw.Draw(m)
    if shape == "circle":
        d.ellipse((0, 0, size * ss - 1, size * ss - 1), fill=255)
    else:  # squircle تقريبي
        r = int(size * ss * 0.28)
        d.rounded_rectangle((0, 0, size * ss - 1, size * ss - 1), radius=r, fill=255)
    return m.resize((size, size), Image.LANCZOS)


def compose(fg, bg, size, shape):
    """يحاكي الأيقونة التكيفية: خلفية + مقدّمة، ثم قصّ النظام."""
    b = bg.resize((size, size), Image.LANCZOS).convert("RGBA")
    f = fg.resize((size, size), Image.LANCZOS).convert("RGBA")
    out = Image.alpha_composite(b, f)
    out.putalpha(mask(size, shape))
    return out


def main():
    legacy = Image.open(f"{SRC}/android/mipmap-xxxhdpi/ic_launcher.png").convert("RGBA")
    fg = Image.open(f"{SRC}/adaptive_foreground_432.png")
    bg = Image.open(f"{SRC}/adaptive_background_432.png")

    sheet = Image.new("RGB", (1040, 300), (251, 244, 228))
    d = ImageDraw.Draw(sheet)

    # ١) النسخة القديمة كما هي
    sheet.paste(legacy.resize((176, 176), Image.LANCZOS), (40, 62), legacy.resize((176, 176), Image.LANCZOS))
    # ٢) تكيفية مقصوصة دائريًا (شاشات مستديرة)
    c = compose(fg, bg, 176, "circle")
    sheet.paste(c, (260, 62), c)
    # ٣) تكيفية مقصوصة بشكل الحواف الافتراضي
    s = compose(fg, bg, 176, "squircle")
    sheet.paste(s, (480, 62), s)
    # ٤) المقاسات الصغيرة للموقع
    x = 700
    for name, sz in (("favicon_64.png", 64), ("favicon_32.png", 32), ("apple-touch-icon_180.png", 48)):
        im = Image.open(f"{SRC}/{name}").convert("RGBA").resize((sz, sz), Image.LANCZOS)
        sheet.paste(im, (x, 62 + (176 - sz) // 2), im)
        x += sz + 26

    d.text((40, 24), "legacy 176 / adaptive circle / adaptive squircle / favicon 64-32 / apple 48",
           fill=(110, 95, 60))
    sheet.save(OUT, "PNG", optimize=True)
    print("preview →", OUT, sheet.size)


if __name__ == "__main__":
    main()
