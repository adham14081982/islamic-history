# -*- coding: utf-8 -*-
"""تحويل صفحات PDF إلى صور PNG (وطباعة إحصاء النص إن وُجد)."""
import sys, os, fitz

src = sys.argv[1]
out = sys.argv[2] if len(sys.argv) > 2 else os.path.join(os.path.dirname(src), "pages")
dpi = int(sys.argv[3]) if len(sys.argv) > 3 else 150
start = int(sys.argv[4]) if len(sys.argv) > 4 else 1
end = int(sys.argv[5]) if len(sys.argv) > 5 else 0

os.makedirs(out, exist_ok=True)
doc = fitz.open(src)
n = doc.page_count
if not end or end > n:
    end = n
print("pages:", n, "| size:", doc[0].rect)
txt = 0
for i in range(n):
    t = doc[i].get_text("text").strip()
    txt += len(t)
print("text layer chars:", txt)

zoom = dpi / 72.0
mat = fitz.Matrix(zoom, zoom)
for i in range(start - 1, end):
    p = doc[i]
    pix = p.get_pixmap(matrix=mat, colorspace=fitz.csGRAY)
    fn = os.path.join(out, "p%03d.png" % (i + 1))
    pix.save(fn)
print("saved", end - start + 1, "->", out)
