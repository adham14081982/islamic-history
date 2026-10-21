const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const f = process.argv[2] || 'seerah.html';
const s = fs.readFileSync(path.join(root, f), 'utf8');
const key = 'id="book"';
const i = s.indexOf(key);
if (i < 0) { console.log('NO BOOK BLOCK'); process.exit(1); }
const a = s.indexOf('>', i) + 1;
const z = s.indexOf('</script>', a);
const json = s.slice(a, z);
const b = JSON.parse(json);
console.log('file:', f, '| html KB:', Math.round(s.length / 1024));
console.log('id:', b.id, '| units:', b.units.length);
console.log('kinds:', b.units.map(u => u.u).join(','));
console.log('chapters:', b.units.filter(u => u.u === 'c').length);
console.log('content chars:', b.units.reduce((a, u) => a + u.h.length, 0));
console.log('first units:', b.units.slice(0, 3).map(u => u.id + '/' + u.u + '/' + u.n).join(' | '));
console.log('last units:', b.units.slice(-3).map(u => u.id + '/' + u.u + '/' + u.n).join(' | '));
// sanity: no latin letters in visible content
const txt = b.units.map(u => u.h.replace(/<[^>]+>/g, ' ')).join(' ');
const lat = txt.match(/[A-Za-z]{2,}/g);
console.log('latin words in content:', lat ? lat.length : 0, lat ? lat.slice(0, 5) : '');
