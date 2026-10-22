#!/usr/bin/env bash
# بناء تطبيق أندرويد من المصدر — آمن: لا يمسح مجلد mobile ولا إعداداته ولا أيقوناته.
# الاستعمال:  bash tools/build-app.sh
set -e

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

APP_DIR="$ROOT_DIR/mobile/app"
WWW="$APP_DIR/www"

if [ ! -d "$APP_DIR" ]; then
  echo "✗ لا يوجد مشروع cordova في mobile/app"
  echo "  أنشئه مرة واحدة فقط:  cd mobile && cordova create app com.tarikh.islam \"تاريخ الإسلام\""
  exit 1
fi

echo "==> ١. بناء صفحات الموقع (تضمين CSS/JS داخل كل صفحة)..."
node tools/site.js

echo "==> ٢. مزامنة الملفات إلى mobile/app/www/..."
mkdir -p "$WWW/assets"
cp -f ./*.html "$WWW"/
cp -f favicon.ico favicon.png favicon_32.png favicon_64.png apple-touch-icon_180.png "$WWW"/ 2>/dev/null || true
# assets تُستبدل كاملة لأن أسماء ملفات الخطوط قد تتغيّر
rm -rf "$WWW/assets"
cp -r assets "$WWW/assets"
rm -f "$WWW/assets/app_icon_pack_v2.zip"

echo "==> ٣. تجهيز منصة أندرويد (نسخ www إلى platforms)..."
cd "$APP_DIR"
npx cordova prepare android 2>&1 | tail -3

echo "==> ٤. بناء APK..."
cd "$APP_DIR/platforms/android"

# اكتشاف SDK: متغيّر ANDROID_HOME في النظام قد يكون خاطئاً، فنفحص وجود build-tools فعلاً
SDK="${ANDROID_SDK_ROOT:-$ANDROID_HOME}"
if [ -z "$SDK" ] || [ ! -d "$SDK/build-tools" ]; then
  for c in "C:/Android" "/c/Android" "$HOME/AppData/Local/Android/Sdk"; do
    if [ -d "$c/build-tools" ]; then SDK="$c"; break; fi
  done
fi
if [ -z "$SDK" ] || [ ! -d "$SDK/build-tools" ]; then
  echo "✗ لم أجد Android SDK يحتوي build-tools. مرّر المسار: ANDROID_SDK_ROOT=/path/to/sdk bash tools/build-app.sh"
  exit 1
fi
echo "    SDK: $SDK"
export ANDROID_HOME="$SDK" ANDROID_SDK_ROOT="$SDK"
printf 'sdk.dir=%s\n' "$SDK" > local.properties

APK="$APP_DIR/platforms/android/app/build/outputs/apk/debug/app-debug.apk"
rm -f "$APK"   # حتى لا يُحسب APK قديم على أنه ناتج هذه الجولة

./gradlew :app:assembleDebug > "$ROOT_DIR/tmp/gradle-build.log" 2>&1
GR=$?
if [ $GR -ne 0 ]; then
  echo "✗ فشل gradle (رمز $GR) — آخر ٢٥ سطرًا:"
  tail -25 "$ROOT_DIR/tmp/gradle-build.log"
  echo "  السجل الكامل: tmp/gradle-build.log"
  exit 1
fi

if [ ! -f "$APK" ]; then
  echo "✗ لم يُنتج APK — راجع tmp/gradle-build.log"
  exit 1
fi

echo "=========================================="
echo "✔ تم البناء بنجاح"
echo "  APK: $APK"
ls -lh "$APK" | awk '{print "  الحجم: "$5}'
echo "=========================================="
