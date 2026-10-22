# -*- coding: utf-8 -*-
"""تحويل الأرقام اللاتينية إلى عربية-هندية داخل نصوص data/pages فقط.
لا يمسّ: المفاتيح، وأكواد الألوان (#RRGGBB)، وقيم التنسيق.
"""
import json, io, os, re

D = os.path.join('data', 'pages')
MAP = {ord(c): ord(a) for c, a in zip('0123456789', '٠١٢٣٤٥٦٧٨٩')}
HEX = re.compile(r'^#[0-9A-Fa-f]{3,8}$')
DIG = re.compile(r'[0-9]')


def conv(s, key=None):
    if key == 'c' or HEX.match(s):
        return s
    return s.translate(MAP)


def walk(o, key=None):
    if isinstance(o, str):
        return conv(o, key)
    if isinstance(o, list):
        return [walk(x) for x in o]
    if isinstance(o, dict):
        return {k: walk(v, k) for k, v in o.items()}
    return o


total = 0
for f in sorted(os.listdir(D)):
    if not f.endswith('.json'):
        continue
    p = os.path.join(D, f)
    with io.open(p, encoding='utf-8') as fh:
        d = json.load(fh)
    before = len(DIG.findall(json.dumps(d, ensure_ascii=False)))
    d2 = walk(d)
    after = len(DIG.findall(json.dumps(d2, ensure_ascii=False)))
    if before != after:
        with io.open(p, 'w', encoding='utf-8') as fh:
            json.dump(d2, fh, ensure_ascii=False, indent=2)
        total += before - after
        print('  %-22s %d → %d' % (f, before, after))
print('حُوّل %d رقماً' % total)
