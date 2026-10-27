"""جولة على الجهاز: يفتح كل حقبة من الشاشة الرئيسية ويصوّر القارئ.

يُستعمل للتحقق بعد كل بناء: هل تُفتح الحقبة؟ وكم صفحة تُعلن؟
التمرير/اللمس بإحداثيات الشاشة الفعلية (1200×2640).
"""
import re
import subprocess
import sys
import time
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "shots" / "dev"
OUT.mkdir(parents=True, exist_ok=True)

ERAS = [
    ("predislamic", "الجزيرة العربية قبل الإسلام"),
    ("seerah", "محطات من السيرة النبوية"),
    ("rashidun", "الخلفاء الراشدون والفتوحات"),
    ("umayyad", "الدولة الأموية"),
    ("andalus", "الأندلس"),
    ("abbasid", "الدولة العباسية"),
    ("crusades", "الحروب الصليبية"),
    ("mamluk", "المماليك وعالم الشرق"),
    ("ottoman", "الدولة العثمانية"),
    ("civilization", "الحضارة الإسلامية والعلوم"),
    ("modern", "العالم الإسلامي في العصر الحديث"),
]


def sh(cmd, **kw):
    return subprocess.run(cmd, shell=True, capture_output=True, text=True, **kw)


def dump():
    r = sh('adb shell "uiautomator dump /sdcard/ui.xml >/dev/null 2>&1; cat /sdcard/ui.xml"')
    return r.stdout


def find(xml, text):
    """صندوق النص المطلوب — مع تمييز ما هو داخل الشاشة فعلًا.

    uiautomator يُدرج عُقدًا خارج الإطار أيضًا، والنقر عليها لا يفعل شيئًا،
    لذلك نُعيدها مع علم الظهور ونُمرّر إليها إن لزم.
    """
    best = None
    for m in re.finditer(r'text="([^"]*)"[^>]*bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"', xml):
        if m.group(1).strip() != text:
            continue
        x1, y1, x2, y2 = map(int, m.group(2, 3, 4, 5))
        cy = (y1 + y2) // 2
        visible = 220 < cy < 2400
        cand = ((x1 + x2) // 2, cy, visible)
        if visible:
            return cand
        if best is None:
            best = cand
    return best


def is_home(xml):
    return "الحقب التاريخية" in xml or "١١ حقبة" in xml


def back_home():
    """يعود للرئيسية دون ضغط «رجوع» زائد يُغلق التطبيق.

    ملاحظة: أول تفريغ بعد الإقلاع يكون فارغًا (WebView لم يرسم شجرته بعد)،
    وضغط «رجوع» حينها يخرج من التطبيق — لذلك ننتظر بدل أن نضغط.
    """
    for _ in range(8):
        xml = dump()
        if len(xml) < 20000:            # الشجرة لم تُبنَ بعد
            time.sleep(1.5)
            continue
        if is_home(xml):
            for _ in range(4):          # أعِد التمرير إلى أعلى الصفحة
                sh("adb shell input swipe 600 900 600 2200 200")
            time.sleep(0.6)
            return True
        sh("adb shell input keyevent 4")
        time.sleep(1.2)
    return False


def tap_era(title, tries=8):
    """يبحث عن بطاقة الحقبة ثم ينقرها بعد التأكد أنها داخل الشاشة."""
    for _ in range(tries):
        xml = dump()
        hit = find(xml, title)
        if hit:
            x, y, visible = hit
            if visible:
                time.sleep(0.4)          # انتظر توقّف التمرير قبل اللمس
                sh(f"adb shell input tap {x} {y}")
                return True
            # خارج الشاشة: مرّر في الاتجاه المناسب
            if y >= 2400:
                sh("adb shell input swipe 600 2100 600 1200 250")
            else:
                sh("adb shell input swipe 600 1200 600 2100 250")
        else:
            sh("adb shell input swipe 600 2100 600 1200 250")
        time.sleep(0.9)
    return False


def shot(path):
    """لقطة شاشة ثنائية — لا يصلح معها capture_output النصّي."""
    with open(path, "wb") as f:
        subprocess.run(["adb", "exec-out", "screencap", "-p"], stdout=f, check=True)


def main():
    # نبدأ من حالة نظيفة: التطبيق قد يكون أُغلق بضغطة رجوع سابقة
    sh("adb shell am force-stop com.tarikh.islam")
    time.sleep(0.6)
    sh("adb shell am start -n com.tarikh.islam/.MainActivity")
    time.sleep(4.5)
    rows = []
    for eid, title in ERAS:
        if not back_home():
            print("✗ تعذّر الرجوع للرئيسية قبل", title)
            break
        if not tap_era(title):
            print("✗ لم أجد بطاقة", title)
            continue
        time.sleep(4.0)
        p = OUT / f"era-{eid}.png"
        shot(p)
        im = Image.open(p)
        foot = im.crop((250, 2230, 950, 2360)).resize((1400, 260), Image.LANCZOS)
        rows.append((eid, title, foot))
        print(f"✔ {eid:14s} {title}")
    if not rows:
        return
    # شريطان مجمّعان (٦ + ٥) ليبقى الخط مقروءًا بعد التكبير
    for idx, chunk in enumerate((rows[:6], rows[6:])):
        if not chunk:
            continue
        w = max(r[2].width for r in chunk)
        h = sum(r[2].height for r in chunk)
        m = Image.new("RGB", (w, h), (0, 0, 0))
        y = 0
        for _, _, foot in chunk:
            m.paste(foot, (0, y))
            y += foot.height
        out = OUT / f"montage-footers-{idx + 1}.png"
        m.save(out)
        print("montage:", out, m.size)


if __name__ == "__main__":
    sys.exit(main())
