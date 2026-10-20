/* دمج أجزاء المملوكين العميقة في صفحة واحدة */
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const deepDir = path.join(root, 'data', 'deep');
const pagesDir = path.join(root, 'data', 'pages');

const files = fs.readdirSync(deepDir).filter(f => f.endsWith('.json')).sort();
if (!files.length) { console.log('لا أجزاء في data/deep — الصفحة العميقة كما هي'); process.exit(0); }

const parts = [];
for (const f of files) {
  const d = JSON.parse(fs.readFileSync(path.join(deepDir, f), 'utf8'));
  if (parts.some(p => p.id === d.partId)) { console.error('partId مكرر: ' + d.partId); process.exit(1); }
  parts.push({ id: d.partId, n: d.partN, ic: d.partIc, lead: d.partLead, chapters: d.chapters });
}

/* منع تكرار معرّفات الفصول */
const seen = new Set();
for (const p of parts) for (const c of p.chapters) {
  if (seen.has(c.id)) { console.error('معرف فصل مكرر: ' + c.id); process.exit(1); }
  seen.add(c.id);
}

const meta = JSON.parse(fs.readFileSync(path.join(pagesDir, '09-mamluk.json'), 'utf8'));

/* استرجاع الأحداث والخط الزمني لو كان الملف قد دُمج قبل الإصلاح */
let base = meta;
if ((!meta.events || !meta.timeline) && fs.existsSync(path.join(root, 'data', 'mamluk-short.json'))) {
  const short = JSON.parse(fs.readFileSync(path.join(root, 'data', 'mamluk-short.json'), 'utf8'));
  base = Object.assign({}, short, meta);
  if (!meta.events && short.events) base.events = short.events;
  if (!meta.timeline && short.timeline) base.timeline = short.timeline;
}

const old = JSON.parse(JSON.stringify(base));

const merged = {
  id: base.id, file: base.file, order: base.order, n: base.n, ic: base.ic,
  c: base.c, period: base.period, dur: base.dur, intro: base.intro,
  events: base.events || [], timeline: base.timeline || [],
  people: base.people || [], outcomes: base.outcomes || [], sources: base.sources || [],
  parts: parts
};

fs.writeFileSync(path.join(pagesDir, '09-mamluk.json'), JSON.stringify(merged, null, 2), 'utf8');
fs.writeFileSync(path.join(root, 'data', 'mamluk-short.json'), JSON.stringify(old, null, 2), 'utf8');

const chars = parts.reduce((a, p) => a + JSON.stringify(p).length, 0);
console.log('أجزاء: ' + parts.length + ' | فصول: ' + seen.size +
  ' | الحجم: ' + Math.round(chars / 2600) + ' صفحة تقريباً');