/* فحص نهائي: كل الروابط والأصول سليمة */
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
/* صفحات التطبيق فقط: التقارير والتوثيق قد تقع في الجذر وليست صفحات موقع،
   فلا تُقاس بمعايير الصفحات (نفس استثناء tools/audit-links.js). */
const SKIP = /تقرير|مراجعة|report|audit|readme|guide|plan|brief/i;
const files = fs.readdirSync(root).filter(f => f.endsWith('.html') && !SKIP.test(f));
let bad = 0;

/* الملفات المشتركة تُفحص مرة واحدة (لم تعد مضمَّنة داخل كل صفحة) */
const appCss = path.join(root, 'assets', 'app.css');
const appJs = path.join(root, 'assets', 'app.js');
if (!fs.existsSync(appCss) || fs.statSync(appCss).size < 5000) { console.log('✗ assets/app.css مفقود أو فارغ'); bad++; }
if (!fs.existsSync(appJs) || fs.statSync(appJs).size < 5000) { console.log('✗ assets/app.js مفقود أو فارغ'); bad++; }
if (fs.existsSync(appJs) && !fs.readFileSync(appJs, 'utf8').includes('refreshBadges')) {
  console.log('✗ assets/app.js → منطق الأوسمة (refreshBadges) مفقود'); bad++;
}

for (const f of files) {
  const s = fs.readFileSync(path.join(root, f), 'utf8');
  /* الروابط الداخلية */
  [...s.matchAll(/(?:href|src)="([^"#:]+?)"/g)].forEach(m => {
    const t = m[1];
    if (t.startsWith('http')) return;
    /* cordova.js يوفّره Cordova داخل التطبيق من platform_www، لا يوجد في المستودع */
    if (t === 'cordova.js') return;
    if (!fs.existsSync(path.join(root, t))) { console.log('✗ ' + f + ' → رابط مكسور: ' + t); bad++; }
  });
  /* العلامات الأساسية */
  ['<!DOCTYPE html>', 'lang="ar"', 'dir="rtl"', 'class="topbar"'].forEach(k => {
    if (!s.includes(k)) { console.log('✗ ' + f + ' → ناقص: ' + k); bad++; }
  });
  if (f === 'index.html' && !s.includes('hero frame')) { console.log('✗ index.html → ناقص: hero frame'); bad++; }
  /* الملفات المشتركة: مرجع خارجي واحد بدل تضمين ~120KB في كل صفحة */
  if (!s.includes('href="assets/app.css"')) { console.log('✗ ' + f + ' → لا يشير إلى assets/app.css'); bad++; }
  if (!/src="assets\/(app|home)\.js"/.test(s)) { console.log('✗ ' + f + ' → لا يشير إلى assets/app.js'); bad++; }
  if (/<style>[\s\S]{2000,}<\/style>/.test(s)) { console.log('✗ ' + f + ' → ما زال يضمّن CSS داخل الصفحة'); bad++; }
  /* توازن الوسوم */
  const o = (s.match(/<section/g) || []).length, c = (s.match(/<\/section>/g) || []).length;
  if (o !== c) { console.log('✗ ' + f + ' → وسوم section غير متوازنة ' + o + '/' + c); bad++; }
  const d1 = (s.match(/<div/g) || []).length, d2 = (s.match(/<\/div>/g) || []).length;
  if (d1 !== d2) { console.log('✗ ' + f + ' → وسوم div غير متوازنة ' + d1 + '/' + d2); bad++; }
  /* سكربت مضمّن parses */
  const js = s.split('<script>')[1]?.split('</script>')[0];
  if (js) { try { new Function(js); } catch (e) { console.log('✗ ' + f + ' → خطأ JS: ' + e.message); bad++; } }
}

console.log('—'.repeat(50));
console.log(bad === 0 ? '✔ كل الصفحات سليمة (' + files.length + ' ملف)' : '✗ المشاكل: ' + bad);
process.exit(bad ? 1 : 0);