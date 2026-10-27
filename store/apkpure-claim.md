# إثبات ملكية التطبيق — APKPure (Prove ownership of your app)

> كل قيمة هنا مطابقة لما هو **داخل التطبيق نفسه** ولما هو **منشور على الإنترنت**،
> لأن فريق المراجعة يتحقّق بالمطابقة لا بالثقة.

---

## ١) الحقول — انسخ كما هو

| الحقل | القيمة |
|---|---|
| **Application Title** | `موسوعة تاريخ الإسلام` |
| **Application Privacy Policy URL** | `https://tarikh-islam-privacy.apps.workbuddy.host/?sharecode=SQ4CWMNFQB` |
| **Application Support Email Address** | `adham19821408@gmail.com` |
| **Company Legal Name** | `[اسمك الكامل كما في الهوية]` ← الحقل الوحيد الذي لا أستطيع تعبئته عنك |
| **Company/Application Website** | `https://github.com/adham14081982/islamic-history` |
| **Company/Application Social Network URL** | `https://github.com/adham14081982` |

### لماذا هذه القيم بالتحديد

- **البريد:** `adham19821408@gmail.com` هو نفسه المكتوب داخل شاشة «عن التطبيق»
  وفي صفحة سياسة الخصوصية (ظهر فيها ٤ مرات). لو أعطيت بريدًا آخر سيظهر تعارض
  أمام المراجع.
- **الموقع:** صفحة `adham14081982.github.io` موقع استوديو massage بالروسية —
  لا علاقة له بالتطبيق، ووضعها هنا يُضعف الطلب. المستودع العام أنسب: يحتوي
  `mobile/app/config.xml` وفيه `id="com.tarikh.islam"` بالحرف.
- **اسم الشركة:** أنت فرد لا شركة، فاكتب اسمك القانوني الكامل كما في الهوية
  (الاسم الأول واسم العائلة). لا تكتب «Company» ولا اسمًا تجاريًا غير مسجّل.

---

## ٢) حقل Message — النص الذي يقنع المراجع

اكتب بالإنجليزية (فريق APKPure يقرأها). انسخ:

```
Hello,

I am the developer and sole owner of this application.

App: موسوعة تاريخ الإسلام
Package name: com.tarikh.islam
Version: 1.3.1 (versionCode 10301)
Signing certificate SHA-256:
75f9ffa03945d318b83255892a53025c1dfd3b2e606911efc7b164d9a42b31b7

Evidence that the app is mine:

1) The public source repository contains the exact Android project:
   https://github.com/adham14081982/islamic-history
   mobile/app/config.xml declares widget id="com.tarikh.islam"
   and versionCode 10301 — the same values as the uploaded APK.

2) The privacy policy URL submitted here is the same URL linked
   from inside the app (About screen) and it names both the app
   and the package name:
   https://tarikh-islam-privacy.apps.workbuddy.host/?sharecode=SQ4CWMNFQB

3) The support email above (adham19821408@gmail.com) is the contact
   address shown inside the app's About screen.

4) The APK is signed with my release key. I can provide the APK,
   the certificate, or any additional proof you require.

The app is not published on Google Play yet, so ownership cannot be
matched through a Play Store listing. Please review the evidence above
or tell me which additional verification you accept.

Thank you.
```

> لا تنسخ سطر البصمة كما هو إن أعدت بناء الـAPK بمفتاح آخر — البصمة تتغيّر.
> البصمة الحالية مطابقة للملف `store/upload/tarikh-al-islam-1.3.1.apk`.

---

## ٣) أدلة جاهزة إن طلبها المراجع

| الدليل | كيف تُثبته |
|---|---|
| ملكية الاسم الباكيجي | المستودع العام: `mobile/app/config.xml` → `id="com.tarikh.islam"` |
| ملكية مفتاح التوقيع | `apksigner verify --print-certs` على الـAPK يعطي نفس البصمة أعلاه |
| ملكية صفحة السياسة | الصفحة تحمل اسم التطبيق والباكيج والبريد |
| ملكية البريد | أرسل من `adham19821408@gmail.com` إلى فريق الدعم إن طلبوا تأكيدًا |

---

## ٤) ملاحظة على المسار

APKPure تفضّل مطابقة بريد حساب Play. التطبيق ليس على Play بعد، ولهذا ستُحوَّل
الطلبات على الأرجح إلى **مراجعة يدوية** — ولهذا حقل Message أعلاه مفصّل ومُرقَّم،
لا سطر واحد.
