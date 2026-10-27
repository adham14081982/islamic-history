# التوقيع والإصدار — موسوعة تاريخ الإسلام

آخر تحديث: ٢٢ أكتوبر ٢٠٢٦ · الإصدار الحالي **1.3.1** (`versionCode 10301`)

---

## ١) ما أُنشئ

| الملف | الوصف | في Git؟ |
|---|---|---|
| `mobile/keys/tarikh-release.jks` | مفتاح التوقيع (PKCS12 · RSA 4096 · صلاحية ٣٠ سنة) | ✗ مستثنى |
| `mobile/keys/README-keystore.txt` | كلمة السر وتفاصيل المفتاح | ✗ مستثنى |
| `mobile/app/build.json` | بيانات التوقيع التي يقرأها Cordova | ✗ مستثنى |
| `mobile/app/build.json.example` | قالب بلا كلمة سر | ✓ |
| `tools/build-release.sh` | سكربت البناء الموقّع | ✓ |
| `تاريخ-الإسلام-1.3.1-release.apk` | APK موقّع للتثبيت المباشر | ✗ (`*.apk`) |
| `تاريخ-الإسلام-1.3.1-release.aab` | حزمة Google Play | ✗ (`*.aab`) |

**بصمة الشهادة (SHA-256):** `75f9ffa03945d318b83255892a53025c1dfd3b2e606911efc7b164d9a42b31b7`

---

## ٢) تحذير لا يُتجاهل

> إن فُقد ملف `tarikh-release.jks` أو كلمة سرّه، **لن تستطيع إصدار تحديث للتطبيق أبدًا**.
> Google Play يرفض أي تحديث موقّع بمفتاح مختلف، والمستخدمون سيضطرون لحذف التطبيق وإعادة تثبيته.
>
> **افعل الآن:** انسخ مجلد `mobile/keys/` كاملًا إلى مكانين خارج المشروع (قرص خارجي + سحابة خاصة).
> ولا ترفعه إلى مستودع عام.

---

## ٣) البناء

```bash
bash tools/build-release.sh
```

ما يفعله بالترتيب:

1. يتحقق من وجود المفتاح و`build.json` (وإلا يوقف العملية برسالة واضحة).
2. `node tools/site.js` — يبني ١٣ صفحة ويضمّن CSS/JS داخلها.
3. `finalcheck` — يرفض البناء إن كان أي ملف غير مضمّن.
4. يزامن `www` ثم `cordova prepare android`.
5. `cordova build android --release --buildConfig=build.json` ← **APK**.
6. `gradlew :app:bundleRelease` ← **AAB** بنفس التوقيع.
   (يُبنى بـgradle مباشرة لا عبر `cordova build --packageType=bundle`، لأن cordova في هذه
   البيئة يستدعي مهمة `:wrapper` فيُحجب استبدال `gradle-wrapper.jar`. الناتج نفسه.)
7. `apksigner verify --print-certs` ويطبع بصمة الشهادة.
8. ينسخ الناتج إلى جذر المشروع باسم واضح.

النواتج في `platforms/android/app/build/outputs/`:
- `apk/release/app-release.apk`
- `bundle/release/app-release.aab`

السجل الكامل عند الفشل: `tmp/gradle-release.log`

---

## ٤) إصدار نسخة جديدة (١.٤.٠ مثلًا)

عدّل **موضعين** في `mobile/app/config.xml`:

```xml
<widget id="com.tarikh.islam" version="1.4.0" android-versionCode="10400" ...>
```

القاعدة: `versionCode = major×10000 + minor×100 + patch` — ويجب أن يزيد **دائمًا** عن السابق،
وإلا رفض المتجر التحديث.

ثم `bash tools/build-release.sh`.

---

## ٥) التثبيت على جهاز

| الحالة | الأمر |
|---|---|
| لم يكن التطبيق مثبّتًا | `adb install تاريخ-الإسلام-1.3.0-release.apk` |
| مثبّت بنسخة **debug** سابقة | يجب الحذف أولًا — التوقيع مختلف: `adb uninstall com.tarikh.islam` |
| مثبّت بنسخة **release** أقدم | `adb install -r ...` يعمل ويحفظ بيانات المستخدم |

> الحذف يمسح `localStorage` (موضع القراءة، المفضلة، اختيار الوضع الليلي). لا مفرّ منه عند
> الانتقال من debug إلى release لأن أندرويد يرفض تحديث تطبيق بتوقيع مختلف
> (`INSTALL_FAILED_UPDATE_INCOMPATIBLE`).

---

## ٦) النشر على Google Play

1. أنشئ التطبيق في Play Console باسم الحزمة `com.tarikh.islam`.
2. ارفع `تاريخ-الإسلام-1.3.1-release.aab` في مسار **Production → Create new release**.
3. **Play App Signing:** اختر «Use Google-managed key» — عندها يحفظ Google مفتاح التوزيع
   النهائي، ويبقى مفتاحك مفتاح رفع (upload key). هذا يحميك إن فُقد المفتاح مستقبلًا.
4. املأ: الوصف، لقطات الشاشة (٣–٨)، أيقونة ٥١٢×٥١٢، صورة الغلاف ١٠٢٤×٥٠٠، سياسة الخصوصية.
5. **Data safety:** التطبيق يعمل بلا إنترنت ولا يجمع أي بيانات — صرّح بذلك، فهذا ميزة تسويقية.
6. **Content rating:** استبيان التصنيف — تاريخ/تعليمي، بلا عنف مصوّر أو محتوى حساس.
7. حدّد `targetSdk 36` (مضبوط تلقائيًا) و`minSdk 24` (أندرويد ٧+).

---

## ٧) التحقق بعد البناء

```bash
# بصمة الشهادة
"C:/Android/build-tools/36.0.0/apksigner.bat" verify --print-certs تاريخ-الإسلام-1.3.0-release.apk

# سلامة حزمة AAB
jarsigner -verify تاريخ-الإسلام-1.3.0-release.aab

# معلومات الحزمة على الجهاز
adb shell dumpsys package com.tarikh.islam | grep -E "versionName|versionCode"
```

النتيجة المسجّلة لهذا الإصدار (آخر بناء: ٢٤ أكتوبر ٢٠٢٦):
- APK: `Signer #1 certificate DN: CN=Tarikh al-Islam, ...` ✔ · SHA-256 `75f9…31b7` ✔ · ٤٫٨ م.ب
- AAB: `jar verified.` ✔ · ٤٫٧ م.ب
- داخل الحزمة: ٣٨ ملفًا في `assets/www` · `debuggable=false` ✔ · `hardwareAccelerated=true` ✔
- `allow-intent` محذوف من `res/xml/config.xml` داخل الـAPK (لا روابط خارجية في التطبيق) ✔
- على الجهاز: `versionCode=10301` · `versionName=1.3.1` · `minSdk=24` · `targetSdk=36` ✔
- بدء بارد ٧٠٩–١٠١٠ مللي ثانية · بدء دافئ ٥٦–٦٣ مللي ثانية ✔
- الرئيسية والقارئ وصفحة الخريطة مفحوصة بالصور على الجهاز بعد التثبيت الموقّع ✔
