const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, '..', 'data', process.argv[2]);
const raw = fs.readFileSync(file, 'utf8');
const lines = raw.split('\n');

/* 1) أسطر فيها عدد فردي من علامات التنصيس */
lines.forEach((l, i) => {
  const n = (l.match(/"/g) || []).length;
  if (n % 2 !== 0) console.log('تنصيس فردي | سطر ' + (i + 1) + ' (' + n + '):\n  ' + l.slice(0, 300) + '\n');
});

/* 2) كلمات لاتينية داخل النص */
const re = /[A-Za-z]{2,}/g;
const seen = new Map();
let m;
while ((m = re.exec(raw))) {
  if (/^[A-Za-z]+$/.test(m[0]) && /^"[a-z0-9_]+"[,]?$/.test(raw.slice(m.index - 1, m.index + m[0].length + 1))) {
    continue; /* معرّف id بين علامتي تنصيس */
  }
  const lineNo = raw.slice(0, m.index).split('\n').length;
  const ctx = raw.slice(Math.max(0, m.index - 45), m.index + 45).replace(/\n/g, ' ');
  const key = m[0];
  if (!seen.has(key)) seen.set(key, []);
  seen.get(key).push('سطر ' + lineNo + ': …' + ctx + '…');
}
console.log('=== كلمات لاتينية (' + seen.size + ') ===');
for (const [k, v] of seen) console.log('• ' + k + '\n   ' + v.join('\n   '));
