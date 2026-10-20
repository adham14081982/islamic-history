/* فحص صفحات الموسوعة: بنية JSON + نقاء النص العربي */
const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, '..', 'data', 'pages');
const only = process.argv.slice(2);
const files = fs.readdirSync(dir).filter(f => f.endsWith('.json'))
  .filter(f => !only.length || only.some(o => f.includes(o))).sort();

if (!files.length) { console.log('لا توجد ملفات في data/pages'); process.exit(1); }

let bad = 0;
const P = (f, kind, msg) => { bad++; console.log('  ✗ [' + kind + '] ' + f + ' → ' + msg); };

const badChars = /[\u4E00-\u9FFF\u3040-\u30FF\uAC00-\uD7AF\uFFFD]/;
function scan(f, s, where) {
  if (badChars.test(s)) P(f, 'محرف غريب', where + ' → ' + JSON.stringify(s.slice(0, 60)));
  const lat = s.match(/[A-Za-z]{2,}/g);
  if (lat) P(f, 'لاتيني', where + ' → ' + lat.join(',') + ' في ' + JSON.stringify(s.slice(0, 55)));
}

for (const f of files) {
  let p;
  try { p = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')); }
  catch (e) { P(f, 'JSON', e.message); continue; }

  for (const k of ['id', 'file', 'n', 'ic', 'c', 'period', 'order', 'intro', 'events', 'people', 'outcomes', 'timeline', 'sources'])
    if (!p[k]) P(f, 'حقل ناقص', k);

  if (!/^[a-z0-9-]+\.html$/.test(p.file || '')) P(f, 'اسم الملف', p.file + ' (يجب أن يكون بالإنجليزية وأن ينتهي بـ .html)');
  if (!Array.isArray(p.events) || p.events.length < 6) P(f, 'أحداث', 'يجب 6 على الأقل، الموجود ' + (p.events || []).length);
  if (!Array.isArray(p.people) || p.people.length < 4) P(f, 'شخصيات', 'يجب 4 على الأقل');
  if (!Array.isArray(p.timeline) || p.timeline.length < 6) P(f, 'خط زمني', 'يجب 6 على الأقل');
  if (!Array.isArray(p.outcomes) || p.outcomes.length < 4) P(f, 'نتائج', 'يجب 4 على الأقل');
  if (!Array.isArray(p.sources) || p.sources.length < 3) P(f, 'مصادر', 'يجب 3 على الأقل');

  let prevY = null;
  (p.events || []).forEach((e, i) => {
    if (!e.y || !e.t || !e.d || !e.r) P(f, 'حقل حدث ناقص', (i + 1) + ' ' + JSON.stringify(e).slice(0, 60));
    const len = (e.d || '').length;
    if (len < 180) P(f, 'قصير', (e.t || '?') + ' → ' + len + ' حرف');
    if (len > 900) P(f, 'مطوّل', (e.t || '?') + ' → ' + len + ' حرف');
    if (!/[.،؛]$/.test((e.d || '').trim())) P(f, 'نهاية الفقرة', (e.t || '?') + ' لا تنتهي بعلامة ترقيم');
    scan(f, e.y, 'حدث ' + (e.t || i)); scan(f, e.t, 'حدث ' + i); scan(f, e.d, 'حدث ' + (e.t || i)); scan(f, e.r, 'نتيجة ' + i);
  });
  (p.people || []).forEach((x, i) => {
    if (!x.n || !x.r) P(f, 'شخصية ناقصة', i + '');
    if ((x.r || '').length > 130) P(f, 'شخصية مطوّلة', x.n);
    scan(f, x.n, 'شخصية'); scan(f, x.r, 'شخصية ' + i);
  });
  (p.timeline || []).forEach((x, i) => {
    if (!x.y || !x.e) P(f, 'زمني ناقص', i + '');
    if ((x.e || '').length > 70) P(f, 'زمني مطوّل', x.y + ' → ' + (x.e || '').length);
    scan(f, x.y, 'زمني'); scan(f, x.e, 'زمني');
  });
  (p.outcomes || []).forEach((x, i) => {
    if (x.length > 200) P(f, 'نتيجة مطوّلة', i + '');
    scan(f, x, 'نتيجة ' + i);
  });
  (p.sources || []).forEach((x, i) => {
    if (!x.a || !x.t) P(f, 'مصدر ناقص', i + '');
    scan(f, x.a, 'مصدر'); scan(f, x.t, 'مصدر');
  });
  scan(f, p.n, 'اسم'); scan(f, p.intro, 'نبذة');
  if ((p.intro || '').length < 150) P(f, 'نبذة قصيرة', (p.intro || '').length + ' حرف');

  console.log('  ' + (p.file || f).padEnd(20) + String((p.events || []).length).padStart(2) + ' حدث · ' +
    String((p.people || []).length).padStart(2) + ' شخصية · ' + String((p.timeline || []).length).padStart(2) + ' محطة');
}
console.log(bad === 0 ? '✔ لا توجد مشاكل' : '✗ المشاكل: ' + bad);
process.exit(bad ? 1 : 0);