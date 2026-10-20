/* فحص مخطط المحتوى: أقسامه وفصوله وصيغته ونقاء نصه العربي */
const fs = require('fs');
const path = require('path');

const WANT_PARTS = 10;
const WANT_PER_PART = 4;
const WANT_CHAPTERS = WANT_PARTS * WANT_PER_PART;

const target = process.argv[2]
  ? path.resolve(process.argv[2])
  : path.join(__dirname, 'PLAN-mamluk.md');

if (!fs.existsSync(target)) { console.log('لا يوجد الملف ' + target); process.exit(1); }

let bad = 0;
const P = (kind, msg) => { bad++; console.log('  ✗ [' + kind + '] → ' + msg); };

const badChars = /[\u4E00-\u9FFF\u3040-\u30FF\uAC00-\uD7AF\uFFFD]/;
function scan(where, s) {
  if (!s || !s.trim()) { P('نص فارغ', where); return; }
  if (badChars.test(s)) P('محرف غريب', where + ' → ' + JSON.stringify(s.slice(0, 60)));
  const lat = s.match(/[A-Za-z]{2,}/g);
  if (lat) P('لاتيني', where + ' → ' + lat.join(',') + ' في ' + JSON.stringify(s.slice(0, 55)));
}

const words = s => s.trim().split(/\s+/).filter(Boolean).length;
const topics = s => s.split(/[،؛]/).map(x => x.trim()).filter(Boolean).length;

const parts = [];
let cur = null;

for (const raw of fs.readFileSync(target, 'utf8').split(/\r?\n/)) {
  const line = raw.trim();
  if (!line) continue;
  let m;

  if ((m = line.match(/^##\s+(\d{2})-([a-z0-9-]+)$/))) {
    cur = { num: m[1], slug: m[2], f: {}, chapters: [] };
    parts.push(cur);
    continue;
  }
  if ((m = line.match(/^-\s+(partId|partN|partIc|partLead):\s*(.+)$/))) {
    if (!cur) { P('حقل بلا قسم', m[1]); continue; }
    if (cur.f[m[1]] !== undefined) P('حقل مكرر', (cur.num || '?') + ' → ' + m[1]);
    cur.f[m[1]] = m[2].trim();
    continue;
  }
  if ((m = line.match(/^(\d+)\.\s+([a-z0-9-]+)\s*\|\s*(.+?)\s*\|\s*(.+?)\s*\|\s*(.+)$/))) {
    if (!cur) { P('فصل بلا قسم', m[2]); continue; }
    cur.chapters.push({ i: +m[1], slug: m[2], n: m[3].trim(), ic: m[4].trim(), t: m[5].trim() });
    continue;
  }
  P('سطر غير مفهوم', JSON.stringify(line.slice(0, 70)));
}

console.log('  الأقسام: ' + parts.length + ' · الفصول: ' + parts.reduce((a, p) => a + p.chapters.length, 0));

const seenPartId = new Set();
const seenPartSlug = new Set();
const seenChapSlug = new Set();

parts.forEach((p, idx) => {
  const tag = (p.num || '??') + '-' + p.slug;

  for (const k of ['partId', 'partN', 'partIc', 'partLead'])
    if (p.f[k] === undefined) P('حقل ناقص', tag + ' → ' + k);

  if (p.num !== String(idx + 1).padStart(2, '0'))
    P('ترتيب القسم', tag + ' → المتوقع ' + String(idx + 1).padStart(2, '0'));

  if (seenPartSlug.has(p.slug)) P('معرّف قسم مكرر', p.slug);
  seenPartSlug.add(p.slug);

  if (p.f.partId !== undefined) {
    if (!/^[a-z0-9-]+$/.test(p.f.partId)) P('معرّف القسم', tag + ' → ' + p.f.partId);
    if (seenPartId.has(p.f.partId)) P('معرّف قسم مكرر', p.f.partId);
    seenPartId.add(p.f.partId);
  }

  scan(tag + ' اسم القسم', p.f.partN);
  if (p.f.partIc !== undefined && words(p.f.partIc) !== 1) P('أيقونة', tag + ' → ' + p.f.partIc);
  if (p.f.partIc !== undefined) scan(tag + ' الأيقونة', p.f.partIc);

  const leadWords = words(p.f.partLead || '');
  if (leadWords < 20 || leadWords > 40) P('مقدمة القسم', tag + ' → ' + leadWords + ' كلمة (المطلوب ٢٠ إلى ٤٠)');
  scan(tag + ' مقدمة القسم', p.f.partLead);

  if (p.chapters.length !== WANT_PER_PART) P('عدد فصول القسم', tag + ' → ' + p.chapters.length);

  p.chapters.forEach((c, j) => {
    const ct = tag + ' فصل ' + (j + 1);
    if (c.i !== j + 1) P('ترتيب الفصل', ct + ' → ' + c.i);
    if (seenChapSlug.has(c.slug)) P('معرّف فصل مكرر', c.slug);
    seenChapSlug.add(c.slug);

    scan(ct + ' العنوان', c.n);
    if (words(c.ic) !== 1) P('أيقونة', ct + ' → ' + c.ic);
    scan(ct + ' الأيقونة', c.ic);

    if (!/[.؛]$/.test(c.t)) P('نهاية السطر', ct + ' لا ينتهي بعلامة ترقيم');
    const tp = topics(c.t);
    if (tp < 3 || tp > 5) P('عدد المواضيع', ct + ' → ' + tp + ' (المطلوب ٣ إلى ٥)');
    scan(ct + ' المواضيع', c.t);
  });

  console.log('  ' + p.num + ' ' + p.slug.padEnd(34) + p.f.partId.padEnd(22) + p.chapters.length + ' فصول');
});

const chapters = parts.reduce((a, p) => a + p.chapters.length, 0);
if (parts.length !== WANT_PARTS) P('عدد الأقسام', parts.length + ' (المطلوب ' + WANT_PARTS + ')');
if (chapters !== WANT_CHAPTERS) P('عدد الفصول', chapters + ' (المطلوب ' + WANT_CHAPTERS + ')');

console.log(bad === 0
  ? '✔ لا توجد مشاكل · ' + parts.length + ' أقسام · ' + chapters + ' فصول'
  : '✗ المشاكل: ' + bad);
process.exit(bad ? 1 : 0);
