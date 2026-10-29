# Aptoide — التطبيق عالق على Pending

## ١) ما تقوله الشاشة بالحرف

> "A version has been submitted, but the app is not live. This may be due to
> **pending ownership verification** for the app or a **lack of approved versions**."

أي: النسخة وصلت (١٫٣٫١)، لكن التطبيق غير منشور لسببين محتملين — إمّا لم يكتمل
**إثبات الملكية**، أو لا توجد نسخة **معتمدة** بعد.

التطبيق الثاني في حسابك (`com.sadaqa.abo3adham`) يظهر `Processing` وهذا **طبيعي**،
ليس خطأً: معناه أن الملف قيد المعالجة.

---

## ٢) الفحص داخل الكونسول — بالترتيب

| # | افحص | لماذا |
|---|---|---|
| ١ | **مربّع `Sandbox`** أعلى يمين الجدول — هل هو مفعّل؟ | وضع Sandbox مخصّص للاختبار ولا يُنشر فيه التطبيق للعامة. أطفئه ثم أعد الإرسال |
| ٢ | افتح التطبيق ← ابحث عن تبويب/شريط **Verification** أو **Ownership** | هو المكان الوحيد الذي تطلب فيه Aptoide إثباتًا، وفيه تظهر الطريقة المطلوبة بالضبط |
| ٣ | تبويب **Releases / Versions** ← هل نسخة ١٫٣٫١ حالتها `Submitted` أم `In review` أم `Rejected`؟ | «لا نسخة معتمدة» تعني أن المراجعة لم تنتهِ بعد |
| ٤ | **Notifications** (الجرس) | أي طلب معلومات من فريق المراجعة يصل هنا، لا على البريد |

> وثائق Aptoide Connect ليست منشورة علنًا (كل مسارات `/help` و`/docs` و`/ownership`
> تُرجع 404)، فلا أستطيع أن أؤكّد لك صيغة التحقق المطلوبة من مصدر رسمي — الكونسول
> نفسه هو المصدر الوحيد. لا تُضِع وقتًا في تجربة طرق عشوائية.

---

## ٣) الاحتمال الأرجح

Aptoide تتحقّق من الملكية عادةً بمطابقة التطبيق مع **صفحة Google Play** الخاصة به
(زر «Is your app on Google Play? Register here» في صفحة التسجيل يدلّ على مسار
مبنيّ على Play). تطبيقك **ليس على Play بعد** — لذلك لا يوجد ما تُطابقه Aptoide،
وقد يبقى التحقق معلّقًا حتى تُنشر هناك أو يمنحك الدعم طريقة بديلة.

هذا استنتاج من معطيات الشاشة لا نصّ رسمي، ولهذا السؤال عنه مدرَج في رسالة الدعم أدناه.

---

## ٤) رسالة الدعم — انسخها كما هي

```
Hello,

My app has been in "Pending" status and the tooltip says this may be due
to pending ownership verification or a lack of approved versions.

App: موسوعة تاريخ الإسلام
Package name: com.tarikh.islam
Submitted version: 1.3.1 (versionCode 10301)
Developer account email: adham19821408@gmail.com

Could you tell me exactly which of the two applies to my app, and what
verification you require from me? I am the developer and sole owner of
this application, and I am ready to provide any proof you accept.

For reference, my app is not yet published on Google Play, so if your
ownership verification relies on a Play listing, please tell me which
alternative method you accept.

Evidence of ownership:
- APK signing certificate SHA-1: 6417808a69459f4f2fc6255ad70fe93581186762
- APK signing certificate SHA-256:
  75f9ffa03945d318b83255892a53025c1dfd3b2e606911efc7b164d9a42b31b7
- Privacy policy (linked inside the app):
  https://tarikh-islam-privacy.apps.workbuddy.host/?sharecode=SQ4CWMNFQB
- Public source repository containing the same package name and versionCode:
  https://github.com/adham14081982/islamic-history

Thank you.
```

---

## ٥) ما لا تفعله

1. **لا تحذف التطبيق وتُعيد إنشاءه** — قد يضيع ترتيب المراجعة ويبدأ العدّ من جديد.
2. **لا ترفع نسخة جديدة (١٠٣٠٢) لتجاوز المشكلة** — الحالة تتعلّق بالملكية لا برقم النسخة،
   والنسخة الجديدة تدخل الطابور نفسه من الصفر.
3. **لا تُرسل نفس الطلب أكثر من مرة** — رسالة واحدة واضحة أسرع من خمس.
4. **لا تُطفئ Sandbox وتُعيد الإرسال قبل قراءة الحالة** — إن كانت الملكية هي السبب
   فالإعادة لن تغيّر شيئًا.

---

## ٦) أرقام للمطابقة عند المراجعة

| البند | القيمة |
|---|---|
| Package | `com.tarikh.islam` |
| versionName / versionCode | `1.3.1` / `10301` |
| SHA-1 للمفتاح | `6417808a69459f4f2fc6255ad70fe93581186762` |
| SHA-256 للمفتاح | `75f9ffa03945d318b83255892a53025c1dfd3b2e606911efc7b164d9a42b31b7` |
| SHA-256 للملف | `68006d1ce1c4145b9abf4be28a9755f8d0e915cc0601624d02aed5f4a90be507` |
