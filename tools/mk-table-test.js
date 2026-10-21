/* يبني صفحة اختبار: جدول بأربعة أعمدة أطول من صفحة */
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');

const src = fs.readFileSync(path.join(root, 'seerah.html'), 'utf8');
const m = /<script type="application\/json" id="book">([\s\S]*?)<\/script>/.exec(src);
if (!m) throw new Error('no book json');
const book = JSON.parse(m[1]);

const filler = 'هذا نص تجريبي طويل لملء الصفحة قبل الجدول. '.repeat(6);
const head = ['المرحلة', 'السنة', 'الحدث', 'ملاحظة'];
const rows = [];
for (let i = 1; i <= 14; i++) {
  rows.push([
    'المرحلة ' + i,
    'سنة ' + i,
    'حدث طويل يشرح ما جرى في هذه المرحلة بالتفصيل مع أسماء وأماكن',
    'ملاحظة رابعة ' + i
  ]);
}
const tbl = `<div class="tblwrap"><div class="tblcap">جدول بأربعة أعمدة</div>
  <table><thead><tr>${head.map(h => `<th>${h}</th>`).join('')}</tr></thead>
  <tbody>${rows.map(r => `<tr>${r.map(c => `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;

const h = `<article class="ch3" id="t4" data-toc="فصل اختبار الجدول">
  <div class="ch3-h"><span class="ch3-n">1.1</span><h3>فصل اختبار الجدول</h3></div>
  <p class="lead"><span class="drop">ه</span>ذا نص تجريبي طويل لملء الصفحة قبل الجدول. هذا نص تجريبي طويل لملء الصفحة قبل الجدول. هذا نص تجريبي طويل لملء الصفحة قبل الجدول. هذا نص تجريبي طويل لملء الصفحة قبل الجدول. هذا نص تجريبي طويل لملء الصفحة قبل الجدول. هذا نص تجريبي طويل لملء الصفحة قبل الجدول. هذا نص تجريبي طويل لملء الصفحة قبل الجدول. هذا نص تجريبي طويل لملء الصفحة قبل الجدول.</p>
  ${tbl}
</article>`;

book.units = [{
  u: 'c', id: 't4', n: 'فصل اختبار الجدول', ic: '', part: 'اختبار', partId: 'p1', h
}];
book.parts = [{ n: 'اختبار', ic: '🧪' }];

const out = src.replace(m[0], '<script type="application/json" id="book">' + JSON.stringify(book) + '</script>');
fs.writeFileSync(path.join(root, 'tmp-test4.html'), out);
console.log('ok', out.length);
