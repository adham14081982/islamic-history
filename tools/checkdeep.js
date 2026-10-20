/* فحص ملفات الفصول العميقة */
const fs = require('fs');
const path = require('path');
const dir = path.join(__dirname, '..', 'data', 'deep');
const only = process.argv.slice(2);
const files = fs.readdirSync(dir).filter(f => f.endsWith('.json'))
  .filter(f => !only.length || only.some(o => f.includes(o))).sort();
if (!files.length) { console.log('لا ملفات في data/deep'); process.exit(1); }

let bad = 0;
const P = (f, k, m) => { bad++; console.log('  ✗ [' + k + '] ' + f + ' → ' + m); };
const BADCH = /[\u4E00-\u9FFF\u3040-\u30FF\uAC00-\uD7AF\uFFFD]/;

function scan(f, s, where) {
  if (BADCH.test(s)) P(f, 'محرف غريب', where + ' → ' + JSON.stringify(s.slice(0, 60)));
  const lat = s.match(/[A-Za-z]{2,}/g);
  if (lat) P(f, 'لاتيني', where + ' → ' + lat.join(',') + ' في ' + JSON.stringify(s.slice(0, 55)));
}

for (const f of files) {
  let d;
  try { d = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')); }
  catch (e) { P(f, 'JSON', e.message); continue; }

  for (const k of ['partId', 'partN', 'partIc', 'partLead', 'chapters'])
    if (!d[k]) P(f, 'حقل ناقص', k);
  if (!Array.isArray(d.chapters) || d.chapters.length < 3) P(f, 'فصول', 'يجب 3 على الأقل');

  const seen = new Set();
  d.chapters.forEach((c, i) => {
    for (const k of ['id', 'n', 'p', 'sum']) if (!c[k]) P(f, 'حقل ناقص', (i + 1) + '.' + k);
    if (seen.has(c.id)) P(f, 'معرف مكرر', c.id);
    seen.add(c.id);
    if (!c.p || c.p.length < 3) P(f, 'فقرات قليلة', (c.n || i) + ' → ' + (c.p || []).length);
    (c.p || []).forEach((x, j) => {
      if (x.length < 330) P(f, 'فقرة قصيرة', (c.n || i) + ' فقرة ' + (j + 1) + ' → ' + x.length);
      if (x.length > 1200) P(f, 'فقرة طويلة', (c.n || i) + ' فقرة ' + (j + 1) + ' → ' + x.length);
      scan(f, x, (c.n || i));
    });
    (c.h2 || []).forEach((h, j) => {
      if (!h.t || !h.p) P(f, 'قسم فرعي ناقص', i + '.' + j);
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
      (c.tbl.rows || []).forEach(r => r.forEach(c2 => scan(f, c2, 'جدول')));
      (c.tbl.head || []).forEach(h2 => scan(f, h2, 'رأس الجدول'));
    }
    scan(f, c.n, 'عنوان فصل'); scan(f, c.lead, 'مقدمة'); scan(f, c.sum, 'خلاصة');
    if (c.quote) { scan(f, c.quote.t, 'اقتباس'); scan(f, c.quote.a, 'مصدر الاقتباس'); }
  });

  scan(f, d.partN, 'اسم القسم'); scan(f, d.partLead, 'مقدمة القسم');

  const chars = JSON.stringify(d).length;
  console.log('  ' + f.padEnd(22) + d.chapters.length + ' فصل · ' +
    (chars / 2600).toFixed(1) + ' صفحة تقريباً · ' + Math.round(chars / 1024) + ' KB');
}
console.log(bad === 0 ? '✔ لا توجد مشاكل' : '✗ المشاكل: ' + bad);
process.exit(bad ? 1 : 0);