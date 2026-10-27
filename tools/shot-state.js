/* لقطة شاشة بحالة تخزين مُهيّأة (لاختبار المفضلة/الوضع الليلي بصريًا).
   node tools/shot-state.js <page.html> <out.png> '<json-seed>' [dark] [scrollY]
   مثال: node tools/shot-state.js index.html shots/fav.png '{"ti_fav":["seerah","ottoman"]}' */
const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const EDGE = process.env.EDGE_BIN || 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const root = path.join(__dirname, '..');
const [page = 'index.html', out = 'shot.png', seed = '{}', dark = '', scroll = '0'] = process.argv.slice(2);
const PORT = 9377;
const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'edge-shot-'));
  const proc = spawn(EDGE, [
    '--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run',
    '--no-default-browser-check', '--disable-extensions', '--mute-audio',
    '--remote-debugging-port=' + PORT, '--user-data-dir=' + profile, 'about:blank'
  ], { stdio: 'ignore' });

  let ws;
  try {
    let target = null;
    for (let i = 0; i < 80 && !target; i++) {
      try {
        const j = await (await fetch('http://127.0.0.1:' + PORT + '/json/list')).json();
        target = j.find(t => t.type === 'page');
      } catch (e) { }
      if (!target) await sleep(250);
    }
    ws = new WebSocket(target.webSocketDebuggerUrl);
    await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });

    let id = 0; const pend = new Map();
    ws.addEventListener('message', ev => {
      const m = JSON.parse(ev.data);
      if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); }
    });
    const send = (m, p) => new Promise(r => { const i = ++id; pend.set(i, r); ws.send(JSON.stringify({ id: i, method: m, params: p || {} })); });
    const ev = async e => (await send('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true })).result.result.value;

    await send('Page.enable'); await send('Runtime.enable');
    await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });

    const [pageFile, pageQuery] = page.split('?');
    const url = 'file:///' + path.join(root, pageFile).replace(/\\/g, '/') + (pageQuery ? '?' + pageQuery : '');
    await send('Page.navigate', { url });
    await sleep(900);

    /* التخزين لا يُكتب على file:// قبل وجود مستند: نكتبه ثم نُعيد التحميل.
       الكائنات/المصفوفات تُخزَّن كـJSON، والنصوص كما هي. */
    const seedObj = JSON.parse(seed);
    const lines = Object.keys(seedObj).map(k => {
      const v = seedObj[k];
      const s = (v !== null && typeof v === 'object') ? JSON.stringify(v) : String(v);
      return 'localStorage.setItem(' + JSON.stringify(k) + ',' + JSON.stringify(s) + ');';
    });
    await ev('localStorage.clear();' + lines.join('') + (dark ? "localStorage.setItem('ti_theme','1');" : "localStorage.setItem('ti_theme','0');"));
    await send('Page.navigate', { url });
    await sleep(2200);

    if (+scroll) { await ev('window.scrollTo(0,' + (+scroll) + ')'); await sleep(400); }

    const shot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
    fs.writeFileSync(path.join(root, out), Buffer.from(shot.result.data, 'base64'));
    console.log('saved ' + out + '  ' + (await ev('document.title')));
  } finally {
    try { ws && ws.close(); } catch (e) { }
    try { proc.kill(); } catch (e) { }
  }
})();
