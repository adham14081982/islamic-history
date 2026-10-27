/* تدقيق شامل للصفحات المولَّدة: روابط، أصول، معرّفات مكرّرة، أزرار بلا معالج.
   node tools/audit-links.js [--www]
   بلا --www يفحص صفحات الجذر، ومعها يفحص mobile/app/www (ما يُشحن فعلًا). */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const dir = process.argv.includes('--www') ? path.join(root, 'mobile', 'app', 'www') : root;

/* صفحات التطبيق فقط: تُستثنى التقارير والتوثيق التي قد تقع في الجذر */
const SKIP = /تقرير|مراجعة|report|audit|readme|guide|plan|brief/i;
const html = fs.readdirSync(dir).filter(f => f.endsWith('.html') && !SKIP.test(f)).sort();
const problems = [];
const stats = { pages: html.length, links: 0, assets: 0, ids: 0, buttons: 0 };

const exists = p => {
  const clean = decodeURIComponent(p.split('#')[0].split('?')[0]);
  if (!clean || /^(https?:|mailto:|tel:|javascript:)/.test(clean)) return true;
  return fs.existsSync(path.join(dir, clean));
};

for (const f of html) {
  const src = fs.readFileSync(path.join(dir, f), 'utf8');

  /* روابط داخلية */
  for (const m of src.matchAll(/<a\b[^>]*href="([^"]*)"/g)) {
    stats.links++;
    const href = m[1].trim();
    if (!href) { problems.push([f, 'رابط فارغ <a href="">']); continue; }
    if (href === '#') { problems.push([f, 'رابط "#" بلا هدف']); continue; }
    if (!exists(href)) problems.push([f, 'رابط داخلي معطّل: ' + href]);
  }

  /* أصول: img/src, link/href, script/src */
  for (const m of src.matchAll(/<(?:img|script|link)\b[^>]*(?:src|href)="([^"]*)"/g)) {
    stats.assets++;
    const u = m[1].trim();
    if (!u || /^(data:|https?:)/.test(u)) continue;
    /* cordova.js يُحقن في www وقت البناء (تحققنا من وجوده داخل APK) */
    if (u === 'cordova.js') continue;
    if (!exists(u)) problems.push([f, 'أصل مفقود: ' + u]);
  }

  /* معرّفات مكرّرة */
  const ids = {};
  for (const m of src.matchAll(/\sid="([^"]+)"/g)) {
    stats.ids++;
    ids[m[1]] = (ids[m[1]] || 0) + 1;
  }
  for (const k in ids) if (ids[k] > 1) problems.push([f, 'معرّف مكرّر: #' + k + ' ×' + ids[k]]);

  /* أزرار بلا id ولا onclick — قد تكون غير موصولة */
  for (const m of src.matchAll(/<button\b([^>]*)>/g)) {
    stats.buttons++;
    const attrs = m[1];
    if (!/\bid="/.test(attrs) && !/\bonclick=/.test(attrs)) {
      const label = (attrs.match(/>([^<]*)/) || [, ''])[1];
      problems.push([f, 'زر بلا معرّف/معالج: ' + attrs.slice(0, 70)]);
    }
  }

  /* onclick يستدعي دالة يجب أن تكون عامة */
  for (const m of src.matchAll(/onclick="([a-zA-Z_$][\w$]*)\(/g)) {
    const fn = m[1];
    if (!new RegExp('window\\.' + fn + '\\s*=').test(fs.readFileSync(path.join(root, 'assets', 'app.js'), 'utf8'))) {
      problems.push([f, 'onclick يستدعي دالة غير عامة: ' + fn]);
    }
  }
}

console.log('الصفحات: ' + stats.pages + ' | روابط: ' + stats.links + ' | أصول: ' + stats.assets +
  ' | معرّفات: ' + stats.ids + ' | أزرار: ' + stats.buttons);
if (!problems.length) {
  console.log('✔ لا مشكلات في الروابط والأصول والمعرّفات');
} else {
  const byType = {};
  problems.forEach(([f, p]) => {
    const k = p.split(':')[0];
    (byType[k] = byType[k] || []).push(f + ' → ' + p);
  });
  for (const k in byType) {
    console.log('\n— ' + k + ' (' + byType[k].length + ')');
    byType[k].slice(0, 8).forEach(x => console.log('   ' + x));
    if (byType[k].length > 8) console.log('   … و' + (byType[k].length - 8) + ' أخرى');
  }
}
