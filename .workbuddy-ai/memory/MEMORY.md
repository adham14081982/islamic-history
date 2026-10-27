# ذاكرة المشروع — موسوعة تاريخ الإسلام

## قواعد ثابتة (تعلّمناها بالتجربة)

- **لا تستخدم خط Amiri في أي رسم مولّد أو لقطة عبر Chromium.** الخطّان
  `amiri-400.woff2` و`amiri-700.woff2` يحتويان GSUB كاملًا ومحارف كاملة، لكن
  Chromium يعرض العربية بهما **حروفًا منفصلة** بلا تشكيل. استخدم `cairo-var.woff2`
  بدلًا منه في أي HTML/SVG يُصوَّر. (داخل التطبيق على Android يعمل Amiri سليمًا.)
- **أي نص عربي داخل صورة يُضبط بالقياس لا بالتخمين**: افتح الصفحة عبر CDP واستدعِ
  `getBoundingClientRect` (HTML) أو `getBBox` (SVG) ثم احسب الحجم وقاعدة السطر.
- **لا تُضِف ملفات تقرير/توثيق إلى جذر المشروع بأسماء عربية تحتوي «تقرير»** إلّا
  وهي مستثناة في `tools/audit-links.js` و`tools/finalcheck.js` و`guard-www.js`.
- **مفتاح التوقيع**: `mobile/keys/tarikh-release.jks` (بصمة `75f9…31b7`).
  الجهاز المتصل يحمل نسخة بهذا التوقيع، فـ`adb install -r` للـAPK الرسمي يعمل
  بلا فقد بيانات. لا تُعِد التوقيع بمفتاح التصحيح.
- **بناء الإصدار**: `bash tools/build-release.sh` ينتج APK وAAB موقّعين في جذر المشروع.
- **التحقق من الأيقونة** يكون باستخراجها من داخل الـAPK (مسارات `res/*.png` مختصرة،
  فاستخدم `aapt2 dump resources | grep ic_launcher`) لا من ملفات المصدر.

## مسارات مهمة

- المولّد: `tools/site.js` (يبني ١٣ صفحة بما فيها `about.html`).
- النشر: `privacy/index.html` → `https://tarikh-islam-privacy.apps.workbuddy.host/?sharecode=SQ4CWMNFQB`
- أصول المتجر: `store/` (icon-512، feature-1024x500، screenshots، listing-ar.md).
- الفحوص: `audit-links.js` · `audit-content.py` · `test-search.js` · `test-fav.js` ·
  `test-resume.js` · `test-smoke.js` (٤٠ فحصًا).
