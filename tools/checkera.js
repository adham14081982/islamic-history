/* فحص مجلدات العصور العميقة — نفس مقادير DEEP_BRIEF
   الاستعمال: node tools/checkera.js            (كل العصور)
             node tools/checkera.js 01         (عصر واحد)
*/
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const eraDir = path.join(root, 'data', 'era');
const only = process.argv.slice(2);

if (!fs.existsSync(eraDir)) { console.log('لا مجلد data/era'); process.exit(0); }

const BADCH = /[\u4E00-\u9FFF\u3040-\u30FF\uAC00-\uD7AF\uFFFD]/;
const LAT = /[A-Za-z]{2,}/;
const ARNUM = /[0-9]/;

let bad = 0;
const P = (f, k, m) => { bad++; console.log('  ✗ [' + k + '] ' + f + ' → ' + m); };

function scan(f, s, where) {
  if (typeof s !== 'string') return;
  if (BADCH.test(s)) P(f, 'محرف غريب', where + ' → ' + JSON.stringify(s.slice(0, 50)));
  const lat = s.match(LAT);
  if (lat) P(f, 'لاتيني', where + ' → ' + lat[0] + ' في ' + JSON.stringify(s.slice(0, 45)));
  if (ARNUM.test(s)) P(f, 'أرقام لاتينية', where + ' → ' + JSON.stringify(s.slice(0, 45)));
}

const eras = fs.readdirSync(eraDir).filter(d => fs.statSync(path.join(eraDir, d)).isDirectory()).sort()
  .filter(d => !only.length || only.some(o => d.includes(o)));

let totalCh = 0, totalChars = 0;
for (const e of eras) {
  const dir = path.join(eraDir, e);
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.json')).sort();
  let chs = 0, chars = 0;
  for (const f of files) {
    let d;
    try { d = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')); }
    catch (err) { P(f, 'JSON', err.message); continue; }

    for (const k of ['partId', 'partN', 'partIc', 'partLead', 'chapters'])
      if (!d[k]) P(f, 'حقل ناقص', k);
    scan(f, d.partN, 'اسم القسم'); scan(f, d.partLead, 'مقدمة القسم');
    if (!Array.isArray(d.chapters) || d.chapters.length < 3) P(f, 'فصول', 'يجب 3 على الأقل');

    const seen = new Set();
    (d.chapters || []).forEach((c, i) => {
      chs++; chars += JSON.stringify(c).length;
      for (const k of ['id', 'n', 'p', 'sum']) if (!c[k]) P(f, 'حقل ناقص', (i + 1) + '.' + k);
      if (seen.has(c.id)) P(f, 'معرف مكرر', c.id);
      seen.add(c.id);
      if (!c.p || c.p.length < 3) P(f, 'فقرات قليلة', (c.n || i) + ' → ' + (c.p || []).length);
      (c.p || []).forEach((x, j) => {
        if (x.length < 330) P(f, 'فقرة قصيرة', (c.n || i) + ' فقرة ' + (j + 1) + ' → ' + x.length);
        if (x.length > 1200) P(f, 'فقرة طويلة', (c.n || i) + ' فقرة ' + (j + 1) + ' → ' + x.length);
        scan(f, x, (c.n || i));
      });
      (c.h2 || []).forEach((h) => {
        if (!h.t || !h.p) P(f, 'قسم فرعي ناقص', c.id);
        scan(f, h.t, 'عنوان فرعي');
        (h.p || []).forEach(x => {
          if (x.length < 250) P(f, 'فقرة فرعية قصيرة', (c.n || i) + ' → ' + x.length);
          scan(f, x, 'قسم فرعي');
        });
      });
      if ((c.key || []).length < 3) P(f, 'بطاقات قليلة', (c.n || i));
      (c.key || []).forEach(k => { scan(f, k.k, 'بطاقة'); scan(f, k.v, 'بطاقة'); });
      if (c.tbl) {
        if (!c.tbl.head || !c.tbl.rows || c.tbl.rows.length < 3) P(f, 'جدول', (c.n || i));
        const head = c.tbl.head || [];
        (c.tbl.rows || []).forEach((r, ri) => {
          const cells = Array.isArray(r) ? r : (r && r.cells) || [];
          if (cells.length !== head.length)
            P(f, 'أعمدة الجدول', (c.n || i) + ' → صف ' + (ri + 1) + ': ' + cells.length + ' ≠ ' + head.length);
          cells.forEach(c2 => scan(f, c2, 'جدول'));
        });
        head.forEach(h2 => scan(f, h2, 'رأس الجدول'));
      } else P(f, 'جدول ناقص', (c.n || i));
      if (!c.quote) P(f, 'اقتباس ناقص', (c.n || i));
      else { scan(f, c.quote.t, 'اقتباس'); scan(f, c.quote.a, 'مصدر الاقتباس'); }
      scan(f, c.n, 'عنوان فصل'); scan(f, c.lead, 'مقدمة'); scan(f, c.sum, 'خلاصة');
    });
  }
  totalCh += chs; totalChars += chars;
  const pages = Math.round(chars / 2600);
  const flag = pages >= 50 ? '✔' : '…';
  console.log('  ' + flag + ' ' + e.padEnd(18) + String(files.length).padStart(2) + ' جزء · ' +
    String(chs).padStart(3) + ' فصل · ' + String(pages).padStart(3) + ' صفحة');
}

console.log('─'.repeat(60));
console.log('المجموع: ' + totalCh + ' فصل · ' + Math.round(totalChars / 2600) + ' صفحة');
console.log(bad === 0 ? '✔ لا توجد مشاكل' : '✗ المشاكل: ' + bad);
process.exit(bad ? 1 : 0);
