/* اختبار فهرس البحث: يحاكي منطق assets/home.js على نفس البيانات الحقيقية.
   node tools/test-search.js
   كل استعلام له توقّع صريح: نتيجة أو لا نتيجة (حسب وجود الكلمة في المحتوى فعلًا). */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.join(__dirname, '..');
const ctx = { window: {} };
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(root, 'assets', 'search-data.js'), 'utf8'), ctx);
const S = ctx.window.__SEARCH__;

const AR = '٠١٢٣٤٥٦٧٨٩';
function norm(s) {
  return String(s == null ? '' : s)
    .replace(/[\u064B-\u0652\u0670\u0640]/g, '')
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    .replace(/[٠-٩]/g, d => String(AR.indexOf(d)))
    .toLowerCase();
}
const cache = new Array(S.i.length);
function search(raw) {
  const q = String(raw).trim();                 /* الواجهة تُمرّر القيمة مُشذَّبة */
  const terms = norm(q).split(/\s+/).filter(Boolean);
  if (norm(q).length < 2 || !terms.length) return [];   /* نفس شرطي الواجهة */
  const hits = [], seen = {};
  for (let i = 0; i < S.i.length; i++) {
    const txt = S.i[i][2], kind = S.i[i][1];
    const nt = cache[i] || (cache[i] = norm(txt));
    if (!terms.every(t => nt.indexOf(t) >= 0)) continue;
    const ci = S.i[i][0];
    const score = (kind === 0 ? 1000 : 100) + Math.max(0, 80 - nt.indexOf(terms[0]));
    if (seen[ci] !== undefined) {
      if (hits[seen[ci]].score < score) hits[seen[ci]] = { ci, score, text: txt };
    } else { seen[ci] = hits.length; hits.push({ ci, score, text: txt }); }
  }
  return hits.sort((a, b) => b.score - a.score);
}

const CASES = [
  ['حطين', true], ['الأندلس', true], ['الاندلس', true],
  ['أبو بكر', true], ['ابو بكر', true], ['عمر بن الخطاب', true],
  ['القادسية', true], ['بغداد', true], ['دمشق', true], ['الفتوحات', true],
  ['صلاح الدين', true], ['المماليك', true], ['عثمان', true], ['العباسية', true],
  ['الأموية', true], ['ابن خلدون', true], ['معركة', true], ['الخليفة', true],
  ['العصر الحديث', true], ['الحضارة', true], ['٦٥٨', true],
  /* حالات يجب ألّا تُرجع شيئًا */
  ['ا', false], ['   ', false], ['!!!', false], ['x'.repeat(300), false],
  ['كلمةلاتوجدفيالموسوعةإطلاقا', false],
];

console.log('فهرس: %d مدخلًا | %d فصلًا | %d حقبة',
  S.i.length, S.c.length, Object.keys(S.eras).length);
console.log('');
let fails = 0, tmax = 0;
for (const [q, expect] of CASES) {
  const t0 = process.hrtime.bigint();
  const hits = search(q);
  const ms = Number(process.hrtime.bigint() - t0) / 1e6;
  tmax = Math.max(tmax, ms);
  const got = hits.length > 0;
  const ok = got === expect;
  if (!ok) fails++;
  const label = (q.length > 18 ? q.slice(0, 12) + '…(' + q.length + ')' : JSON.stringify(q)).padEnd(20);
  const top = hits[0] ? S.c[hits[0].ci][2] : '—';
  console.log((ok ? '✔ ' : '✘ ') + label + ' ' + String(hits.length).padStart(4) + ' نتيجة  ' +
    ms.toFixed(1).padStart(5) + 'ms  ' + top);
}
console.log('\nأبطأ استعلام: ' + tmax.toFixed(1) + 'ms');
console.log(fails ? '✘ إخفاقات: ' + fails : '✔ كل الاستعلامات كما هو متوقّع');
process.exit(fails ? 1 : 0);
