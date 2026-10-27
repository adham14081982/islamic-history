# Annex V — Transfer Risk Assessment (APKPure)

> هذا النموذج جزء من البنود التعاقدية القياسية الأوروبية (EU SCCs)، ويسأل:
> **ما البيانات الشخصية التي تنتقل إليك أنت كمطوّر، وكيف تحميها؟**
>
> الجواب الصحيح لتطبيقنا ليس «نحميها جيدًا» بل **«لا توجد بيانات تنتقل أصلًا»** —
> وهذا مثبت بفحص الكود لا بالادّعاء. الإجابات أدناه مبنية على ذلك الفحص.

---

## ١) الحقول — انسخ كما هو

**Contact Person Name:** `adham` (كما هو، أو اسمك الكامل)

**Contact Person Email Address:** `adham19821408@gmail.com`

---

### Annex II — Technical and organisational measures

```
Scope: the Company processes no personal data. The measures below describe
both the design decision that eliminates the data and the controls that
keep it that way.

1. Data minimisation and data avoidance
   The application collects no personal data: no account, no registration,
   no name, email, phone number, location, contacts, device identifiers or
   advertising ID. The Company operates no server, database or backend.
   Because no personal data is received, none can be stored, lost or
   disclosed.

2. Confidentiality
   - No remote access: the Company operates no server and holds no
     credentials to any system containing user data.
   - No accounts or user credentials are created or stored by the app.
   - The only user-generated state (reading position, favourites, display
     settings) stays in the app's private WebView storage inside the
     Android application sandbox, accessible only to the app itself.
   - Access to source code and signing keys is limited to the single
     developer. The release signing key is kept offline and is never
     committed to the public repository.

3. Integrity
   - All content is bundled inside the signed APK; nothing is downloaded at
     runtime, so content cannot be altered in transit.
   - Every release is signed with the developer's private key
     (SHA-256 75f9ffa03945d318b83255892a53025c1dfd3b2e606911efc7b164d9a42b31b7).
     Android verifies this signature at install time and rejects modified
     packages.

4. Availability and resilience
   - The application is fully offline with no backend dependency: there is
     no service that can become unavailable and no server-side data that can
     be lost.
   - Content is read from the local package, so reinstalling the app restores
     it completely.

5. Encryption
   - In transit: not applicable. The app performs no network requests — no
     HTTP/HTTPS, no analytics, no crash reporting, no third-party SDKs.
   - At rest: the only data written is stored in the app sandbox, which is
     protected by the operating system's file-based encryption and app
     sandboxing on the user's own device.

6. Testing, assessment and verification of effectiveness
   - Automated audits run on every release: link audit (13 pages, 40 links,
     0 issues), content audit (255 chapters, 0 empty, 0 duplicates), search
     tests (27/27), favourites (12/12), resume (10/10), smoke tests (40/40).
   - A static audit of the source confirms zero fetch / XMLHttpRequest /
     WebSocket calls and zero external links in the app.
   - The complete source code is public and independently verifiable:
     https://github.com/adham14081982/islamic-history

7. Organisational measures
   - The Company is a single individual developer. No employees,
     contractors, processors or sub-processors have access to user data.
   - No personal data is transferred to any third party, affiliate or
     service provider; the processing chain contains zero recipients.
   - Users can erase all locally stored state at any time by clearing the
     app's data or uninstalling it, as stated in the in-app privacy policy.

8. Incident response
   - Because no personal data is held, a personal-data breach is not
     possible by design. If a security defect is reported or discovered, the
     developer fixes it and publishes a new signed release with an
     incremented versionCode, delivered as a normal update.
```

> **لا تكتب** في هذا الحقل «ISO 27001» ولا «تشفير AES» ولا «جدار حماية» —
> لا نملكها ولا نستخدمها، وأي ادّعاء منها يُكتشف عند أول مراجعة ويكسر الثقة
> في بقية النموذج. القوة هنا في **انعدام البيانات**، وهي حقيقة مثبتة.

---

### Location of Company

```
Individual developer (sole proprietor), established in [COUNTRY].
There are no branch offices, subsidiaries or additional processing
locations. All development and operation of the application is carried
out from that country.
```

> استبدل `[COUNTRY]` بدولتك الفعلية. شهادة التوقيع مسجّلة باسم `C=SA` (الرياض)
> — إن كانت هذه دولتك اكتب `Saudi Arabia`، وإلا اكتب دولتك الحقيقية. لا تكتب
> دولة ليست محل إقامتك، فهذا إقرار قانوني.

---

### Company's primary storage location of the data transferred

```
Not applicable. No personal data is transferred to, or stored by, the Company.

The only data the application writes is the user's reading position,
favourites and display settings. These are stored locally in the app's
private WebView storage on the user's own device and never leave it.
```

---

### Transmission channel used

```
None. The application performs no network requests: no HTTP/HTTPS calls,
no analytics, no crash reporting and no third-party SDKs.

This was verified by auditing the source: zero fetch / XMLHttpRequest /
WebSocket calls and zero external links across all 13 pages of the app.
The only declared permission is INTERNET, which is added automatically by
the Cordova framework and is not used by the application code.

Consequently no personal data is transmitted to the Company at all.
```

---

### a) Local laws that can require disclosure to public authorities

```
The Company is an individual developer established in [COUNTRY] and is
subject to the law of [COUNTRY]. The Company is not established in the
United States, so FISA 702 does not apply to it.

Because the Company receives and stores no EEA personal data, no local
disclosure obligation could be exercised in respect of EEA personal data:
there is no data to disclose.
```

---

### b) Requests received in the past five years

```
No. The Company has received no requests from any public authority to
disclose personal data, and holds no personal data that could be the
subject of such a request.
```

---

### Intention for onward transfer

```
None. There are no onward transfers. The Company receives no personal data
and shares none with any third party, affiliate, processor or sub-processor.

Number of further recipients: 0. Length of processing chain: 0.
```

---

### Safeguards against interception or disproportionate access

```
Data minimisation to the point of elimination: the application collects no
personal data whatsoever.

Technical measures
- No network access is performed by the app; no data leaves the device.
- No third-party SDKs, no analytics, no advertising identifiers, no tracking.
- All user state (reading position, favourites, settings) stays in local
  WebView storage on the device and is erased when the user clears app data
  or uninstalls the app.
- The only declared permission is INTERNET, added by the Cordova framework
  and unused by application code.

Organisational measures
- The Company is a single individual. There are no employees, contractors,
  processors or sub-processors with access to user data.
- The full source code is publicly available for independent verification:
  https://github.com/adham14081982/islamic-history
```

---

## ٢) لماذا هذه الإجابات صحيحة (وليس مجرد كلام)

| الادّعاء | كيف تحقّقنا منه |
|---|---|
| لا اتصال شبكي | فحص الكود: صفر `fetch` / `XMLHttpRequest` / `WebSocket` |
| لا روابط خارجية | تدقيق الروابط: ١٣ صفحة · ٤٠ رابطًا · ٠ مشكلة · ٠ رابط http/https |
| لا SDKs خارجية | لا إعلانات ولا تحليلات ولا Crashlytics |
| البيانات محلية فقط | `localStorage` في WebView، ويُمحى بمسح بيانات التطبيق |
| الصلاحية الوحيدة `INTERNET` | يضيفها إطار Cordova، ولا يستدعيها كود التطبيق |

---

## ٣) تحذير واحد

هذه الإجابات صحيحة **اليوم** لأن التطبيق لا يجمع شيئًا. لحظة إضافة أي أداة
تحليلات أو إعلانات أو إرسال تقارير أعطال، تصبح هذه الإجابات **كاذبة** ويجب
تحديثها. لا تنسخها في نسخة قادمة بلا مراجعة.

> الإقرار باسمك، فراجعه قبل الإرسال. أنا صغت الجواب من فحص الكود، لا من معرفة
> بوضعك القانوني.
