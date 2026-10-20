#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
يولّد حزمة الأيقونات كاملة من «Islamic Encyclopedia Emblem.png».

المخرجات (في assets/icons/):
  icon_1024.png / icon_512.png                     — للمتاجر، بخلفية خضراء معتمة
  adaptive_foreground_432.png                      — الدائرة الذهبية بشفافية داخل المنطقة الآمنة
  adaptive_foreground_432_large.png                — نسخة أكبر (هامش أقل)
  adaptive_background_432.png                      — تدرّج من ألوان الصورة
  favicon_64.png / favicon_32.png / favicon.ico    — قصة القبة والهلال
  apple-touch-icon_180.png
  android/mipmap-*/ic_launcher.png                 — كثافات Cordova
  android/mipmap-*-v26/ic_launcher_{fore,back}ground.png
  config.xml.snippet.txt
"""
import os
from PIL import Image, ImageDraw, ImageFilter

SRC = "Islamic Encyclopedia Emblem.png"
OUT = "assets/icons"

# نِسب القصّة لأيقونة الموقع: القبة والهلال فقط (النص يختفي في الأحجام الصغيرة)
CROP_CX, CROP_CY, CROP_FRAC = 0.500, 0.210, 0.400


def ensure(p):
    os.makedirs(p, exist_ok=True)
    return p


def gold_bbox(im):
    """يحدّد إطار الحلقة الذهبية الخارجية بإيجاد أبعد بكسلات ذهبية."""
    w, h = im.size
    px = im.convert("RGB").load()
    xs, ys = [], []
    step = max(1, w // 700)
    for y in range(0, h, step):
        for x in range(0, w, step):
            r, g, b = px[x, y]
            if r > 135 and g > 95 and b < 130 and (r - b) > 55 and (g - b) > 10:
                xs.append(x)
                ys.append(y)
    if not xs:
        return (0, 0, w, h)
    return (min(xs), min(ys), max(xs), max(ys))


def circle_mask(size, ss=4):
    """قناع دائري بحواف ناعمة (supersampling)."""
    m = Image.new("L", (size * ss, size * ss), 0)
    ImageDraw.Draw(m).ellipse((0, 0, size * ss - 1, size * ss - 1), fill=255)
    return m.resize((size, size), Image.LANCZOS)


def make_foreground(src, box, canvas, diameter):
    """الدائرة الذهبية بشفافية، متمركزة داخل لوحة شفافة."""
    cx = (box[0] + box[2]) // 2
    cy = (box[1] + box[3]) // 2
    r = min(box[2] - box[0], box[3] - box[1]) // 2
    disc = src.crop((cx - r, cy - r, cx + r, cy + r)).convert("RGBA")
    disc = disc.resize((diameter, diameter), Image.LANCZOS)
    disc.putalpha(circle_mask(diameter))
    layer = Image.new("RGBA", (canvas, canvas), (0, 0, 0, 0))
    off = (canvas - diameter) // 2
    layer.paste(disc, (off, off), disc)
    return layer


def make_background(src, canvas):
    """تدرّج شعاعي من ألوان خلفية الصورة نفسها."""
    w, h = src.size
    px = src.convert("RGB").load()
    patches = [(6, 6), (w - 26, 6), (6, h - 26), (w - 26, h - 26)]
    acc = [0, 0, 0]
    n = 0
    for ox, oy in patches:
        for dy in range(20):
            for dx in range(20):
                c = px[ox + dx, oy + dy]
                acc[0] += c[0]; acc[1] += c[1]; acc[2] += c[2]
                n += 1
    base = tuple(v // n for v in acc)
    inner = tuple(min(255, int(v * 1.22) + 8) for v in base)
    outer = tuple(max(0, int(v * 0.82)) for v in base)

    bg = Image.new("RGB", (canvas, canvas))
    d = ImageDraw.Draw(bg)
    steps = 160
    for i in range(steps, 0, -1):
        t = i / steps
        col = tuple(int(inner[k] + (outer[k] - inner[k]) * t) for k in range(3))
        rad = int(canvas * 0.5 * t * 1.42)
        d.ellipse((canvas // 2 - rad, canvas // 2 - rad,
                   canvas // 2 + rad, canvas // 2 + rad), fill=col)
    return bg.filter(ImageFilter.GaussianBlur(canvas / 90))


def save(im, path):
    im.save(path, "PNG", optimize=True)
    return path


def main():
    src = Image.open(SRC).convert("RGBA")
    W, H = src.size
    box = gold_bbox(src)
    cx = (box[0] + box[2]) / 2
    cy = (box[1] + box[3]) / 2
    ring = min(box[2] - box[0], box[3] - box[1])
    ensure(OUT)
    made = []

    # ── 1) أيقونات المتاجر: معتمة، الخلفية الخضراء كاملة، المتجر يقصّ الحواف
    for size in (1024, 512):
        im = src.convert("RGB").resize((size, size), Image.LANCZOS)
        made.append((save(im, f"{OUT}/icon_{size}.png"), f"{size}×{size}", "متجر"))

    # ── 2) الأيقونة التكيفية
    #    المنطقة الآمنة = 66% من 108dp → 264px من 432px
    for name, dia in (("adaptive_foreground_432", 264),
                      ("adaptive_foreground_432_large", 300)):
        fg = make_foreground(src, box, 432, dia)
        made.append((save(fg, f"{OUT}/{name}.png"), "432×432", f"مقدّمة (قطر {dia})"))

    bg = make_background(src, 432)
    made.append((save(bg, f"{OUT}/adaptive_background_432.png"), "432×432", "خلفية متدرّجة"))

    # ── 3) أيقونات الموقع: قصة القبة والهلال
    side = int(W * CROP_FRAC)
    ccx, ccy = int(W * CROP_CX), int(H * CROP_CY)
    icon_crop = src.crop((ccx - side // 2, ccy - side // 2,
                          ccx + side // 2, ccy + side // 2)).convert("RGB")
    for size in (64, 32):
        made.append((save(icon_crop.resize((size, size), Image.LANCZOS),
                          f"{OUT}/favicon_{size}.png"), f"{size}×{size}", "favicon"))
    made.append((save(icon_crop.resize((180, 180), Image.LANCZOS),
                      f"{OUT}/apple-touch-icon_180.png"), "180×180", "iOS"))

    ico_src = icon_crop.resize((256, 256), Image.LANCZOS)
    ico_path = f"{OUT}/favicon.ico"
    ico_src.save(ico_path, format="ICO", sizes=[(16, 16), (32, 32), (48, 48)])
    made.append((ico_path, "16/32/48", "ico متعدّد"))

    # ── 4) كثافات Cordova
    legacy = {"ldpi": 36, "mdpi": 48, "hdpi": 72, "xhdpi": 96, "xxhdpi": 144, "xxxhdpi": 192}
    adaptive = {"mdpi": 108, "hdpi": 162, "xhdpi": 216, "xxhdpi": 324, "xxxhdpi": 432}
    for dens, size in legacy.items():
        p = ensure(f"{OUT}/android/mipmap-{dens}") + "/ic_launcher.png"
        made.append((save(src.convert("RGB").resize((size, size), Image.LANCZOS), p),
                     f"{size}×{size}", f"mipmap-{dens}"))
    for dens, size in adaptive.items():
        p = ensure(f"{OUT}/android/mipmap-{dens}-v26")
        fg = make_foreground(src, box, size, int(size * 264 / 432))
        made.append((save(fg, f"{p}/ic_launcher_foreground.png"), f"{size}×{size}", f"{dens}-v26 fg"))
        made.append((save(make_background(src, size), f"{p}/ic_launcher_background.png"),
                     f"{size}×{size}", f"{dens}-v26 bg"))

    # ── 5) أسطر config.xml
    #    Cordova يسمح بعنصر <icon> واحد لكل كثافة، ويقرأ منه src للنسخ القديمة
    #    و background/foreground للأيقونة التكيفية معًا. لذلك نضع الثلاثة في عنصر واحد.
    snippet = ['<!-- أيقونات التطبيق — تُلصق داخل <widget> في config.xml -->',
               '<platform name="android">',
               f'    <icon density="ldpi" src="res/icon/android/ldpi.png" '
               f'width="36" height="36" />']
    for dens, size in legacy.items():
        if dens == "ldpi":
            continue
        snippet.append(f'    <icon density="{dens}" src="res/icon/android/{dens}.png" '
                       f'width="{size}" height="{size}"\n'
                       f'          background="res/icon/android/background-{dens}.png" '
                       f'foreground="res/icon/android/foreground-{dens}.png" />')
    snippet.append('</platform>')
    with open(f"{OUT}/config.xml.snippet.txt", "w", encoding="utf-8") as f:
        f.write("\n".join(snippet) + "\n")

    print(f"المصدر: {SRC} {W}×{H}")
    print(f"حلقة ذهبية: x {box[0]}–{box[2]} · y {box[1]}–{box[3]} · قطر {ring}px")
    print(f"مركز: ({cx:.0f}, {cy:.0f})\n")
    print(f"{'الملف':<52} {'المقاس':<12} الوصف")
    print("─" * 88)
    for p, size, note in made:
        print(f"{p[len(OUT)+1:]:<52} {size:<12} {note}")
    print("─" * 88)
    print(f"المجموع: {len(made)} ملفًا + config.xml.snippet.txt")


if __name__ == "__main__":
    main()
