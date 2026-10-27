"""فحوص تفاعلية على الجهاز: إكمال الترقيم في الخلفية، التقليب، البحث، زر الرجوع.

    python tools/device-probe.py mamluk     # يفتح الحقبة وينتظر ثم يقيس
    python tools/device-probe.py flip       # يقلّب ويرصد تغيّر الصفحة
    python tools/device-probe.py back       # يتتبّع مسار زر الرجوع
"""
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import importlib.util

spec = importlib.util.spec_from_file_location("tour", Path(__file__).resolve().parent / "device-tour.py")
tour = importlib.util.module_from_spec(spec)
spec.loader.exec_module(tour)

OUT = tour.OUT
sh = tour.sh


def foot(path, tag=""):
    tour.shot(path)
    from PIL import Image
    im = Image.open(path)
    im.crop((250, 2230, 950, 2360)).resize((1400, 260), Image.LANCZOS).save(OUT / f"probe-{tag}.png")
    return im


def main():
    cmd = sys.argv[1] if len(sys.argv) > 1 else "mamluk"

    if cmd == "back":
        # من القارئ: رجوع = الصفحة السابقة، ثم عند أول صفحة = الرئيسية، ثم خروج
        tour.sh("adb shell am force-stop com.tarikh.islam")
        time.sleep(1)
        tour.sh("adb shell am start -n com.tarikh.islam/.MainActivity")
        time.sleep(5)
        tour.tap_era("محطات من السيرة النبوية")
        time.sleep(4)
        for i in range(3):
            xml = tour.dump()
            home = tour.is_home(xml)
            print(f"  قبل الرجوع #{i + 1}: {'الرئيسية' if home else 'القارئ'}")
            tour.sh("adb shell input keyevent 4")
            time.sleep(1.5)
        xml = tour.dump()
        print("  بعد ثلاث ضغطات:", "الرئيسية" if tour.is_home(xml) else "خارج التطبيق أو القارئ")
        return

    if cmd == "flip":
        tour.back_home()
        tour.tap_era("محطات من السيرة النبوية")
        time.sleep(4)
        foot(OUT / "flip-0.png", "flip-0")
        # سحب من اليمين لليسار = الصفحة التالية (اتجاه الكتاب العربي)
        for i in range(3):
            tour.sh("adb shell input swipe 1000 1300 200 1300 120")
            time.sleep(1.1)
            foot(OUT / f"flip-{i + 1}.png", f"flip-{i + 1}")
        print("✔ التُقطت ٤ لقطات: flip-0..3")
        return

    # الافتراضي: حقبة واحدة، ننتظر حتى يكتمل الترقيم في الخلفية
    title = {"mamluk": "المماليك وعالم الشرق", "crusades": "الحروب الصليبية",
             "ottoman": "الدولة العثمانية"}.get(cmd)
    tour.back_home()
    if not tour.tap_era(title):
        print("✗ لم أجد البطاقة")
        return
    for t in (3, 8, 14):
        time.sleep(t if t == 3 else 5)
        foot(OUT / f"wait-{t}.png", f"wait-{t}")
        print(f"  لقطة بعد ~{t}s")


if __name__ == "__main__":
    main()
