/* دمج مجلدات العصور العميقة في صفحاتها
   الاستعمال: node tools/era.js 01-predislamic
             node tools/era.js all
*/
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const eraDir = path.join(root, 'data', 'era');
const pagesDir = path.join(root, 'data', 'pages');
const shortDir = path.join(root, 'data', 'short');

if (!fs.existsSync(shortDir)) fs.mkdirSync(shortDir, { recursive: true });

function mergeOne(base) {
  const dir = path.join(eraDir, base);
  if (!fs.existsSync(dir)) { console.log('✗ لا مجلد: ' + base); return false; }

  const files = fs.readdirSync(dir).filter(f => f.endsWith('.json')).sort();
  if (!files.length) { console.log('✗ لا أجزاء في ' + base); return false; }

  const parts = [];
  const seenPart = new Set();
  for (const f of files) {
    const d = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
    if (seenPart.has(d.partId)) { console.error('✗ partId مكرر في ' + f + ': ' + d.partId); return false; }
    seenPart.add(d.partId);
    parts.push({ id: d.partId, n: d.partN, ic: d.partIc, lead: d.partLead, chapters: d.chapters });
  }

  const seen = new Set();
  for (const p of parts) for (const c of p.chapters) {
    if (seen.has(c.id)) { console.error('✗ معرف فصل مكرر: ' + c.id); return false; }
    seen.add(c.id);
  }

  const pagePath = path.join(pagesDir, base + '.json');
  const meta = JSON.parse(fs.readFileSync(pagePath, 'utf8'));

  /* لو كان الملف مدموجًا سابقًا، خُذ ملخصه من النسخة القصيرة */
  const shortPath = path.join(shortDir, base + '.json');
  let base2 = meta;
  if (!meta.events && fs.existsSync(shortPath)) {
    const s = JSON.parse(fs.readFileSync(shortPath, 'utf8'));
    base2 = Object.assign({}, s, { parts: meta.parts });
  }
  const old = {
    id: base2.id, file: base2.file, order: base2.order, n: base2.n, ic: base2.ic,
    c: base2.c, period: base2.period, dur: base2.dur, intro: base2.intro,
    events: base2.events || [], people: base2.people || [],
    timeline: base2.timeline || [], outcomes: base2.outcomes || [], sources: base2.sources || []
  };

  const merged = Object.assign({}, old, { parts: parts });
  fs.writeFileSync(pagePath, JSON.stringify(merged, null, 2), 'utf8');
  fs.writeFileSync(shortPath, JSON.stringify(old, null, 2), 'utf8');

  const chars = parts.reduce((a, p) => a + JSON.stringify(p).length, 0);
  console.log('  ' + base.padEnd(16) + String(parts.length).padStart(2) + ' قسم · ' +
    String(seen.size).padStart(3) + ' فصل · ' + Math.round(chars / 2600) + ' صفحة');
  return true;
}

const arg = process.argv[2];
if (!arg) { console.log('الاستعمال: node tools/era.js <اسم-الصفحة|all>'); process.exit(1); }

const bases = arg === 'all'
  ? fs.readdirSync(eraDir).filter(d => fs.statSync(path.join(eraDir, d)).isDirectory()).sort()
  : [arg];

let ok = 0;
for (const b of bases) if (mergeOne(b)) ok++;
console.log('─'.repeat(50));
console.log('دُمج ' + ok + ' من ' + bases.length);
