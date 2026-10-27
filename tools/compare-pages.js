/* مقارنة محتوى الصفحات بين نسختين من نفس الكتاب (قبل/بعد إعادة الهيكلة).
   يقارن نصّ كل صفحة وترتيب كتلتها — أدقّ من لقطة الشاشة.
   node tools/compare-pages.js <القديم.html> <الجديد.html> [صفحات...] */
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const EDGE = process.env.EDGE_BIN || 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const root = path.join(__dirname, '..');
const oldFile = process.argv[2];
const newFile = process.argv[3];
const pages = process.argv.slice(4).map(Number);
const W = 360, H = 800;
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function grab(file, list, port) {
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'edge-cmp-'));
  const proc = spawn(EDGE, ['--headless=new', '--disable-gpu', '--no-first-run',
    '--remote-debugging-port=' + port, '--user-data-dir=' + profile, 'about:blank'], { stdio: 'ignore' });
  let ws;
  try {
    let t = null;
    for (let i = 0; i < 60 && !t; i++) {
      try { t = (await (await fetch('http://127.0.0.1:' + port + '/json/list')).json()).find(x => x.type === 'page'); } catch (e) { }
      if (!t) await sleep(200);
    }
    ws = new WebSocket(t.webSocketDebuggerUrl);
    await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
    let id = 0; const pend = new Map();
    ws.addEventListener('message', e => { const m = JSON.parse(e.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); } });
    const send = (m, p) => new Promise(res => { const i = ++id; pend.set(i, res); ws.send(JSON.stringify({ id: i, method: m, params: p || {} })); });
    const ev = async x => (await send('Runtime.evaluate', { expression: x, returnByValue: true, awaitPromise: true })).result.result.value;

    await send('Page.enable'); await send('Runtime.enable');
    await send('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 2, mobile: true });
    await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: 'light' }] });
    const url = 'file:///' + path.join(root, file).replace(/\\/g, '/');
    await send('Page.navigate', { url });
    await sleep(200);
    await ev('try{localStorage.clear();localStorage.setItem("ti_theme","0")}catch(e){}');
    await send('Page.navigate', { url });
    for (let i = 0; i < 200; i++) {
      if (await ev('!!(document.body && document.body.classList.contains("rready"))')) break;
      await sleep(50);
    }
    for (let i = 0; i < 120; i++) {
      if (await ev('!!(document.body && document.body.dataset.pgdone==="1")')) break;
      await sleep(50);
    }
    const total = await ev('window.__R ? window.__R.total : 0');
    const out = {};
    for (const n of list) {
      await ev('window.__go && window.__go(' + n + ')');
      await sleep(450);
      out[n] = await ev(`(() => {
        const el = document.querySelector('.rpage[data-n="' + ${n} + '"] .rbody');
        if (!el) return null;
        return {
          t: el.textContent.replace(/\\s+/g, ' ').trim(),
          blocks: el.children.length,
          h: Math.round(el.scrollHeight)
        };
      })()`);
    }
    return { total, out };
  } finally {
    try { ws && ws.close(); } catch (e) { }
    try { proc.kill(); } catch (e) { }
    try { fs.rmSync(profile, { recursive: true, force: true }); } catch (e) { }
  }
}

(async () => {
  const A = await grab(oldFile, pages, 9421);
  const B = await grab(newFile, pages, 9422);
  console.log('عدد الصفحات: القديم ' + A.total + '  |  الجديد ' + B.total + (A.total === B.total ? '  ✔' : '  ✗'));
  let same = 0, diff = 0;
  for (const n of pages) {
    const a = A.out[n], b = B.out[n];
    if (!a || !b) { console.log('  صفحة ' + (n + 1) + ': غير موجودة'); diff++; continue; }
    const eq = a.t === b.t && a.blocks === b.blocks && a.h === b.h;
    console.log('  صفحة ' + String(n + 1).padStart(3) + ': ' +
      (eq ? 'مطابقة' : 'مختلفة') +
      '  (كتل ' + a.blocks + '/' + b.blocks + ' · ارتفاع ' + a.h + '/' + b.h + ' · حروف ' + a.t.length + '/' + b.t.length + ')');
    if (eq) same++; else {
      diff++;
      /* أول موضع اختلاف */
      let i = 0; while (i < Math.min(a.t.length, b.t.length) && a.t[i] === b.t[i]) i++;
      console.log('      أول اختلاف عند الحرف ' + i + ': «' + a.t.slice(i, i + 40) + '» ≠ «' + b.t.slice(i, i + 40) + '»');
    }
  }
  console.log(diff === 0 ? '✔ محتوى الصفحات مطابق تمامًا (' + same + ' صفحة)' : '✗ اختلافات في ' + diff + ' صفحة');
})();
