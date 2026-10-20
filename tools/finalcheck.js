/* فحص نهائي: كل الروابط والأصول سليمة */
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const files = fs.readdirSync(root).filter(f => f.endsWith('.html'));
let bad = 0;

for (const f of files) {
  const s = fs.readFileSync(path.join(root, f), 'utf8');
  /* الروابط الداخلية */
  [...s.matchAll(/(?:href|src)="([^"#:]+?)"/g)].forEach(m => {
    const t = m[1];
    if (t.startsWith('http')) return;
    if (!fs.existsSync(path.join(root, t))) { console.log('✗ ' + f + ' → رابط مكسور: ' + t); bad++; }
  });
  /* العلامات الأساسية (الـCSS والـJS مضمّنة داخل الصفحة) */
  ['<!DOCTYPE html>', 'lang="ar"', 'dir="rtl"', 'class="topbar"', 'hero frame'].forEach(k => {
    if (!s.includes(k)) { console.log('✗ ' + f + ' → ناقص: ' + k); bad++; }
  });
  if (!s.includes('refreshBadges')) { console.log('✗ ' + f + ' → منطق الأوسمة غير مضمّن'); bad++; }
  if (!/<style>[\s\S]{2000,}<\/style>/.test(s)) { console.log('✗ ' + f + ' → التنسيق غير مضمّن'); bad++; }
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