/* يعيد حقن قالب الصفحة العميقة من tools/deep.js داخل tools/site.js */
const fs = require('fs');
const path = require('path');
const siteF = path.join(__dirname, 'site.js');
const deepF = path.join(__dirname, 'deep.js');
let site = fs.readFileSync(siteF, 'utf8');
const deep = fs.readFileSync(deepF, 'utf8');

const startMark = '/* ---------------- صفحة عميقة (فصول متعددة) ---------------- */';
const endMark = '/* ---------------- التنفيذ ---------------- */';
const a = site.indexOf(startMark);
const b = site.indexOf(endMark);
if (a < 0 || b < 0) { console.log('لم أجد مواضع الحقن'); process.exit(1); }
site = site.slice(0, a) + deep + '\n' + site.slice(b);
fs.writeFileSync(siteF, site, 'utf8');
console.log('تم تحديث قالب الصفحة العميقة');