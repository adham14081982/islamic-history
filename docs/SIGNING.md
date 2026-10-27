# التوقيع والإصدار — دليل مختصر

## 1) مفتاح التوقيع الحالي (لا تُنشئ غيره)

| البند | القيمة |
|---|---|
| الملف | `mobile/keys/tarikh-release.jks` |
| النوع | PKCS12 |
| Alias | `tarikh` |
| الخوارزمية | RSA 4096 |
| الصلاحية | حتى 2056-10-14 |
| SHA-256 للشهادة | `75:F9:FF:A0:39:45:D3:18:B8:32:55:89:2A:53:02:5C:1D:FD:3B:2E:60:69:11:EF:C7:B1:64:D9:A4:2B:31:B7` |

هذا هو المفتاح الذي وُقّعت به النسخة المثبَّتة على الجهاز (1.3.0). **أي مفتاح جديد يعني
تطبيقًا آخر بهوية مختلفة**: لا يمكن تثبيته كتحديث، ولا استعادة التقييمات/التثبيتات على Google Play.

## 2) أين كلمة السر؟

لا تُكتب في المشروع إطلاقًا. تُقرأ من متغيّرات البيئة:

```bash
export TARIKH_STORE_PASSWORD='...'
export TARIKH_KEY_PASSWORD='...'      # اختيارية: تساوي الأولى في PKCS12
export TARIKH_KEY_ALIAS='tarikh'      # افتراضي
export TARIKH_KEYSTORE='/path/to/tarikh-release.jks'   # افتراضي: mobile/keys/tarikh-release.jks
```

أو ضعها في ملف خاص **خارج** المشروع: `~/.tarikh-signing.env` (يقرأه سكربت البناء تلقائيًا).
الملف مُقيَّد الصلاحيات على حساب المستخدم وحده (ACL)، وليس داخل Git.

سكربت البناء يولّد `build.json` في مجلد مؤقت خارج المشروع، ويحذفه عند الخروج
(`trap ... EXIT`) — فلا تبقى كلمة سر على القرص داخل المستودع.

## 3) البناء

```bash
bash tools/build-release.sh            # APK + AAB
bash tools/build-release.sh apk        # APK فقط
bash tools/build-release.sh bundle     # AAB فقط
```

ما يفعله السكربت بالترتيب:

1. يتحقّق من المفتاح بكلمة السر (`keytool -list`).
2. يبني الصفحات من المصادر (`node tools/site.js`).
3. يفحص المحتوى (`node tools/finalcheck.js`).
4. يزامن `www/` ثم يشغّل **حارس www** (يمنع أي تقرير/توثيق/ملف مصدر).
5. `cordova prepare android`.
6. `cordova build android --release -- --packageType=apk` ثم `--packageType=bundle`.
7. يتحقّق آليًا من: التوقيع، غياب `debuggable=true`، وجود `hardwareAccelerated=true`،
   وخلوّ الـAPK من ملفات التوثيق.
8. ينسخ النواتج إلى جذر المشروع باسم `تاريخ-الإسلام-<النسخة>-release.apk|aab`.

## 4) النسخ الاحتياطي — القاعدة الذهبية

> ضياع المفتاح = استحالة تحديث التطبيق إلى الأبد. لا يوجد «استعادة كلمة سر» ولا
> «إعادة إصدار»؛ الحل الوحيد سيكون تطبيقًا جديدًا بمعرّف جديد.

احتفظ بـ **ثلاث نسخ** من `tarikh-release.jks` في **مكانين مختلفين** على الأقل:

1. نسخة مشفّرة على قرص خارجي/فلاشة تُحفظ في مكان مادي مختلف.
2. نسخة في مدير كلمات مرور أو خزنة سحابية **مشفّرة** (لا Google Drive عادي بلا تشفير).
3. نسخة ورقية/مشفّرة عند شخص موثوق، أو في خزنة بنكية.

وكلمة السر في **مدير كلمات مرور** منفصل عن نسخ الملف. سجّل أيضًا:
alias، ونوع المخزن (PKCS12)، وبصمة SHA-256 أعلاه — للتحقق من أن النسخة الاحتياطية سليمة.

للتحقق من سلامة أي نسخة احتياطية:

```bash
keytool -list -v -keystore tarikh-release.jks -storetype PKCS12 -alias tarikh
# يجب أن تظهر نفس البصمة SHA-256 أعلاه
```

## 5) تغيير كلمة السر (دون تغيير المفتاح)

تغيير كلمة السر **لا يغيّر الشهادة**، فالتحديثات تبقى ممكنة:

```bash
keytool -storepasswd -keystore mobile/keys/tarikh-release.jks -storetype PKCS12
# ثم في PKCS12 كلمة المفتاح تساوي كلمة المخزن؛ لا حاجة لـ-keypasswd
```

بعدها حدّث `~/.tarikh-signing.env` (أو متغيّرات البيئة) فقط.

> ملاحظة أمنية: كلمة السر القديمة كانت مكتوبة في `mobile/app/build.json` داخل المشروع
> (لم تُرفع إلى Git — لا وجود لها في تاريخ المستودع). أُزيل الملف. يُنصح بتدوير كلمة
> السر مرة واحدة بهذا الأمر، لأن أي نسخة قديمة من الملف قد تكون نُسخت احتياطيًا.

## 6) إنشاء مفتاح لمشروع آخر (للمرجع فقط)

```bash
keytool -genkeypair -v \
  -keystore new-release.jks -storetype PKCS12 \
  -alias tarikh -keyalg RSA -keysize 4096 -validity 10950 \
  -dname "CN=Tarikh al-Islam, OU=Mobile, O=Tarikh al-Islam Encyclopedia, L=Riyadh, ST=Riyadh, C=SA"
```

`-validity 10950` = ٣٠ سنة. استخدم `-keysize 4096` واحفظ المفتاح قبل أول نشر.
