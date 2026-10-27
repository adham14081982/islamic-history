#!/usr/bin/env bash
# جسر قصير إلى WebView DevTools على الجهاز.
# المشكلة: خدمة adb تُعاد تشغيلها بين الأوامر فيُفقد المنفذ المُمرَّر،
# لذلك نُمرّر من جديد في كل استدعاء ثم ننفّذ الأمر المطلوب.
#   bash tools/dev.sh info
#   bash tools/dev.sh eval "window.__R.total"
set -uo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SOCK="$(adb shell "cat /proc/net/unix | grep -o 'webview_devtools_remote_[0-9]*'" 2>/dev/null | tr -d '\r' | sort -u | head -1)"
if [ -z "$SOCK" ]; then
  echo "✗ لا يوجد WebView يعمل — شغّل التطبيق أولًا" >&2
  exit 1
fi
adb forward --remove tcp:9222 >/dev/null 2>&1
adb forward tcp:9222 "localabstract:$SOCK" >/dev/null 2>&1 || { echo "✗ فشل تمرير المنفذ" >&2; exit 1; }
cd "$ROOT"
exec node tools/device-check.js "$@"
