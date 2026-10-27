#!/usr/bin/env bash
# بناء نسخة الإصدار الموقّعة (release) — APK للتثبيت المباشر + AAB لمتجر Google Play.
#
# الاستعمال:
#   bash tools/build-release.sh              # الاثنان
#   bash tools/build-release.sh apk          # APK فقط
#   bash tools/build-release.sh bundle       # AAB فقط
#
# كلمات المرور لا تُكتب في المشروع إطلاقًا:
#   تُقرأ من متغيّرات البيئة، أو من ملف خاص خارج المشروع:  ~/.tarikh-signing.env
#   TARIKH_STORE_PASSWORD   كلمة سر مخزن المفاتيح (إلزامية)
#   TARIKH_KEY_PASSWORD     كلمة سر المفتاح (اختيارية — تساوي الأولى في PKCS12)
#   TARIKH_KEY_ALIAS        اسم المفتاح (افتراضي: tarikh)
#   TARIKH_KEYSTORE         مسار المفتاح (افتراضي: mobile/keys/tarikh-release.jks)
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

APP_DIR="$ROOT_DIR/mobile/app"
WWW="$APP_DIR/www"
KS="${TARIKH_KEYSTORE:-$ROOT_DIR/mobile/keys/tarikh-release.jks}"
ALIAS="${TARIKH_KEY_ALIAS:-tarikh}"
WANT="${1:-both}"

step() { printf '\n==> %s\n' "$*"; }
die()  { printf '✗ %s\n' "$*" >&2; exit 1; }
# تحويل مسار Git-Bash ‎/c/... إلى مسار ويندوز ‎C:/... (Gradle لا يفهم الأول)
winpath() {
  if command -v cygpath >/dev/null 2>&1; then cygpath -w "$1" | sed 's|\\|/|g'
  else printf '%s' "$1" | sed -E 's|^/([a-zA-Z])/|\1:/|'; fi
}

# ── ٠. بيانات التوقيع من البيئة (لا ملف أسرار داخل المشروع) ────────────────
if [ -f "$HOME/.tarikh-signing.env" ]; then
  # shellcheck disable=SC1091
  . "$HOME/.tarikh-signing.env"
fi
: "${TARIKH_STORE_PASSWORD:?ضع كلمة سر المفتاح في TARIKH_STORE_PASSWORD أو في ~/.tarikh-signing.env}"
TARIKH_KEY_PASSWORD="${TARIKH_KEY_PASSWORD:-$TARIKH_STORE_PASSWORD}"

[ -f "$KS" ] || die "لا يوجد مفتاح توقيع في: $KS"
if [ -f "$APP_DIR/build.json" ]; then
  die "mobile/app/build.json موجود ويحوي كلمات سر مكشوفة — احذفه (التوقيع يُولَّد من البيئة الآن)"
fi

step "٠. التحقق من مفتاح التوقيع"
keytool -list -keystore "$KS" -storetype PKCS12 -alias "$ALIAS" \
        -storepass "$TARIKH_STORE_PASSWORD" >/dev/null 2>&1 \
  || die "المفتاح غير صالح أو كلمة السر خاطئة (alias=$ALIAS)"
echo "    ✔ $KS  (alias=$ALIAS)"

# ملف build.json مؤقت خارج المشروع، يُحذف تلقائيًا عند الخروج
TMPD="${TARIKH_TMPDIR:-$HOME}/.tarikh-build-$$"
mkdir -p "$TMPD"
cleanup() { rm -rf "$TMPD" 2>/dev/null || true; }
trap cleanup EXIT
BUILDJSON="$TMPD/build.json"
cat > "$BUILDJSON" <<JSON
{
  "android": {
    "release": {
      "keystore": "$(winpath "$KS")",
      "storePassword": "$TARIKH_STORE_PASSWORD",
      "alias": "$ALIAS",
      "password": "$TARIKH_KEY_PASSWORD",
      "keystoreType": "pkcs12"
    }
  }
}
JSON
chmod 600 "$BUILDJSON"

# ── ١. بناء الصفحات من المصادر ─────────────────────────────────────────────
step "١. بناء صفحات الموقع (tools/site.js)"
node tools/site.js | tail -3

# ── ٢. فحوص المحتوى ────────────────────────────────────────────────────────
step "٢. فحوص المحتوى قبل البناء"
node tools/finalcheck.js 2>&1 | tail -2 || die "فحص المحتوى فشل"

# ── ٣. مزامنة www + حارس الملفات الداخلية ──────────────────────────────────
step "٣. مزامنة mobile/app/www/"
mkdir -p "$WWW/assets"
cp -f ./*.html "$WWW"/
cp -f favicon.ico favicon.png favicon_32.png favicon_64.png apple-touch-icon_180.png "$WWW"/ 2>/dev/null || true
rm -rf "$WWW/assets"
cp -r assets "$WWW/assets"
rm -f "$WWW/assets/app_icon_pack_v2.zip"

# حارس: لا تقارير ولا توثيق ولا ملفات مصدر داخل النسخة المبنية
node tools/guard-www.js --fix
node tools/guard-www.js || die "ملفات ممنوعة في www"

# ── ٤. تجهيز المنصّة ───────────────────────────────────────────────────────
step "٤. تجهيز منصة أندرويد (cordova prepare)"
SDK="${ANDROID_SDK_ROOT:-${ANDROID_HOME:-}}"
if [ -z "$SDK" ] || [ ! -d "$SDK/build-tools" ]; then
  for c in "C:/Android" "/c/Android" "$HOME/AppData/Local/Android/Sdk"; do
    if [ -d "$c/build-tools" ]; then SDK="$c"; break; fi
  done
fi
[ -n "$SDK" ] && [ -d "$SDK/build-tools" ] || die "لم أجد Android SDK يحتوي build-tools"
export ANDROID_HOME="$SDK" ANDROID_SDK_ROOT="$SDK"
printf 'sdk.dir=%s\n' "$(winpath "$SDK")" > "$APP_DIR/platforms/android/local.properties"
echo "    SDK: $SDK"

( cd "$APP_DIR" && npx cordova prepare android 2>&1 | tail -2 )

LOG="$ROOT_DIR/tmp/gradle-release.log"
mkdir -p "$ROOT_DIR/tmp"

build_type() {   # $1 = apk | bundle
  step "٥. بناء $1 (release، موقّع)"
  if [ "$1" = "bundle" ]; then
    # نبني الحزمة بـgradle مباشرة (وهو ما ينتهي إليه cordova build --packageType=bundle)
    # لأن cordova في هذه البيئة يستدعي :wrapper فيُحجب حذف/استبدال gradle-wrapper.jar.
    # نضمن أولًا وجود ملف التوقيع الذي يكتبه cordova.
    [ -f "$APP_DIR/platforms/android/release-signing.properties" ] || build_type apk
    ( cd "$APP_DIR/platforms/android" && export ANDROID_HOME="$SDK" ANDROID_SDK_ROOT="$SDK" \
      && ./gradlew bundleRelease ) > "$LOG" 2>&1 \
      || { tail -30 "$LOG"; die "فشل بناء bundle — السجل: tmp/gradle-release.log"; }
    return 0
  fi
  ( cd "$APP_DIR" && npx cordova build android --release --buildConfig="$BUILDJSON" -- --packageType="$1" ) \
    > "$LOG" 2>&1 || { tail -30 "$LOG"; die "فشل بناء $1 — السجل: tmp/gradle-release.log"; }
}

APK=""; AAB=""
case "$WANT" in
  apk)    build_type apk;    APK="$APP_DIR/platforms/android/app/build/outputs/apk/release/app-release.apk" ;;
  bundle) build_type bundle; AAB="$APP_DIR/platforms/android/app/build/outputs/bundle/release/app-release.aab" ;;
  *)      build_type apk; build_type bundle
          APK="$APP_DIR/platforms/android/app/build/outputs/apk/release/app-release.apk"
          AAB="$APP_DIR/platforms/android/app/build/outputs/bundle/release/app-release.aab" ;;
esac

BT="$(ls -d "$SDK"/build-tools/* 2>/dev/null | sort -V | tail -1)"
AAPT2="$BT/aapt2"; [ -x "$AAPT2" ] || AAPT2="$BT/aapt2.exe"
APKSIGNER="$BT/apksigner"; [ -x "$APKSIGNER" ] || APKSIGNER="$BT/apksigner.bat"

VER="$(grep -o 'version="[0-9.]*"' "$APP_DIR/config.xml" | head -1 | cut -d'"' -f2)"

# ── ٦. تحقّق صارم من الـAPK ────────────────────────────────────────────────
if [ -n "$APK" ]; then
  [ -f "$APK" ] || die "لم يُنتج APK — راجع tmp/gradle-release.log"

  step "٦. تحقّق APK: التوقيع / debuggable / تسريع الرسوم / الملفات الداخلية"

  "$APKSIGNER" verify --print-certs "$APK" 2>&1 | grep -E "Signer #1 certificate (DN|SHA-256)" | sed 's/^/    /'

  DBG="$("$AAPT2" dump xmltree "$APK" --file AndroidManifest.xml 2>/dev/null \
        | grep -i 'debuggable' | grep -i '=true' || true)"
  if [ -n "$DBG" ]; then die "الـAPK يحمل android:debuggable=true"; else echo "    ✔ debuggable: غير مفعّل"; fi

  HW="$("$AAPT2" dump xmltree "$APK" --file AndroidManifest.xml 2>/dev/null \
        | grep -i 'hardwareAccelerated' | tail -1 || true)"
  case "$HW" in
    *true*) echo "    ✔ hardwareAccelerated (MainActivity): true" ;;
    *)      die "MainActivity بلا تسريع رسوم — تحقّق من edit-config في config.xml" ;;
  esac

  LEAK="$(unzip -l "$APK" 2>/dev/null | grep -iE 'assets/www/.*\.(md|markdown|txt|log)$|تقرير|report' || true)"
  if [ -n "$LEAK" ]; then printf '%s\n' "$LEAK"; die "ملفات توثيق داخل الـAPK"; else echo "    ✔ لا تقارير ولا توثيق داخل الـAPK"; fi

  OUT="$ROOT_DIR/تاريخ-الإسلام-$VER-release.apk"
  cp -f "$APK" "$OUT"
fi

if [ -n "$AAB" ] && [ -f "$AAB" ]; then
  OUT_AAB="$ROOT_DIR/تاريخ-الإسلام-$VER-release.aab"
  cp -f "$AAB" "$OUT_AAB"
fi

step "تم"
if [ -n "${OUT:-}" ]; then ls -lh "$OUT" | awk '{print "    APK: "$5"   "$9}'; fi
if [ -n "${OUT_AAB:-}" ]; then ls -lh "$OUT_AAB" | awk '{print "    AAB: "$5"   "$9}'; fi
echo "    الإصدار: $VER   |   الملف المؤقت للتوقيع حُذف: $TMPD"
