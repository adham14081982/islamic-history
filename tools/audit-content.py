"""تدقيق المحتوى التاريخي: فصول فارغة، نصوص مكرّرة، عناصر نائبة، معرّفات مكرّرة.

    python tools/audit-content.py
يقرأ data/pages/*.json (مصدر كل الصفحات) ويعطي أرقامًا قابلة للتحقق.
"""
import glob
import json
import re
from collections import Counter, defaultdict

PLACEHOLDER = re.compile(
    r"(TODO|FIXME|lorem ipsum|لوريم|نص تجريبي|محتوى تجريبي|غير متوفر|غير متاح|"
    r"هنا نص|اكتب هنا|\.\.\.$|xxx|###)", re.I)


def norm(t):
    return re.sub(r"\s+", " ", str(t or "")).strip()


def main():
    files = sorted(glob.glob("data/pages/*.json"))
    total_ch = total_par = total_words = 0
    empty, short, dups, placeholders, ids = [], [], [], [], defaultdict(list)
    per_era = []

    for f in files:
        d = json.load(open(f, encoding="utf-8"))
        era = d["id"]
        chs = []
        for part in d.get("parts", []):
            chs.extend(part.get("chapters", []))
        words = 0
        paras = Counter()
        for c in chs:
            ids[c.get("id")].append(era)
            text = []
            for p in c.get("p", []) or []:
                t = norm(p)
                if t:
                    text.append(t)
                    paras[t] += 1
            body = " ".join(text)
            w = len(body.split())
            words += w
            if w == 0 and not c.get("tbl") and not c.get("quote"):
                empty.append((era, c.get("id"), c.get("n")))
            elif w < 60:
                short.append((era, c.get("id"), c.get("n"), w))
            blob = " ".join([norm(c.get("lead")), body, norm(c.get("sum"))])
            m = PLACEHOLDER.search(blob)
            if m:
                placeholders.append((era, c.get("id"), m.group(0)))
        for t, n in paras.items():
            if n > 1 and len(t) > 80:
                dups.append((era, n, t[:70]))
        total_ch += len(chs)
        total_par += sum(paras.values())
        total_words += words
        per_era.append((era, len(chs), words))

    print("الحقب: %d | الفصول: %d | الفقرات: %d | الكلمات: %s"
          % (len(files), total_ch, total_par, f"{total_words:,}"))

    print("\n— فصول بلا نص (%d)" % len(empty))
    for x in empty[:10]:
        print("   ", x)

    print("\n— فصول قصيرة جدًا (<٦٠ كلمة) (%d)" % len(short))
    for x in short[:10]:
        print("   ", x)

    print("\n— فقرات مكرّرة داخل حقبة (%d)" % len(dups))
    for x in dups[:10]:
        print("   ", x)

    print("\n— عناصر نائبة (%d)" % len(placeholders))
    for x in placeholders[:10]:
        print("   ", x)

    dup_ids = {k: v for k, v in ids.items() if len(v) > 1}
    print("\n— معرّفات فصول مكرّرة (%d)" % len(dup_ids))
    for k, v in list(dup_ids.items())[:10]:
        print("    %s → %s" % (k, v))

    print("\n— أقل الحقب محتوى")
    for era, n, w in sorted(per_era, key=lambda x: x[2])[:5]:
        print("    %-14s فصول %2d | كلمات %s" % (era, n, f"{w:,}"))


if __name__ == "__main__":
    main()
