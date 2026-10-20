#!/usr/bin/env bash
set -e
cd "C:/MyProject/islamic history"
rm -rf mobile
mkdir -p mobile
cd mobile
cordova create app com.tarikh.islam "تاريخ الإسلام" >/dev/null 2>&1
cd app
rm -rf www
mkdir www
cp ../../*.html www/
cp -r ../../assets www/
cordova platform add android >/dev/null 2>&1
echo "PLATFORM_OK"
cordova build android --debug 2>&1 | tail -30
