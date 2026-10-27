/* يبني فهرس البحث الشامل: assets/search-data.js
   سكربت عادي (لا JSON) لأن fetch محجوب على file:// داخل التطبيق.
   الاستعمال: node tools/searchindex.js
*/
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const pagesDir = path.join(root, 'data', 'pages');
const out = path.join(root, 'assets', 'search-data.js');

/* إزالة التشكيل والتطويل وتوحيد الألف والياء والتاء — يُطبَّق وقت البحث أيضًا */
function strip(s) {
  return String(s).replace(/[\u064B-\u0652\u0670\u0640]/g, '');
}

const files = fs.readdirSync(pagesDir).filter(f => f.endsWith('.json')).sort();
const eras = [];      // [id, file, name]
const chapters = [];  // [eraIdx, id, title]
const items = [];     // [chapterIdx, kind, text]   kind: 0 عنوان/استهلال، 1 فقرة
let chars = 0;

files.forEach(f => {
  const p = JSON.parse(fs.readFileSync(path.join(pagesDir, f), 'utf8'));
  const ei = eras.length;
  eras.push([p.id, p.file || f.replace('.json', '.html'), p.n]);

  (p.parts || []).forEach(pt => {
    (pt.chapters || []).forEach(ch => {
      const ci = chapters.length;
      chapters.push([ei, ch.id, ch.n]);

      /* العنوان + الاستهلال: أولوية أعلى في الترتيب */
      const head = [ch.n, ch.lead || ''].filter(Boolean).join(' — ');
      items.push([ci, 0, strip(head)]);
      chars += head.length;

      (ch.p || []).forEach(t => {
        const s = strip(t);
        if (s.length > 12) { items.push([ci, 1, s]); chars += s.length; }
      });
    });
  });
});

const payload = '/* فهرس البحث الشامل — مولَّد آليًا بـtools/searchindex.js، لا يُحرَّر يدويًا */\n' +
  'window.__SEARCH__=' + JSON.stringify({ v: 1, eras, c: chapters, i: items }) + ';\n';

fs.writeFileSync(out, payload, 'utf8');

const kb = n => (n / 1024).toFixed(0) + ' ك.ب';
console.log('الحقب: ' + eras.length + ' · الفصول: ' + chapters.length + ' · المدخلات: ' + items.length);
console.log('نص مفهرس: ' + kb(chars) + ' · حجم الملف: ' + kb(fs.statSync(out).size));
