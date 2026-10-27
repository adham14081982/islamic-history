/* تحقّق من التحميل الكسول لفهرس البحث: لا يُطلب search-data.js إلا عند أول بحث.
   node tools/check-lazy.js */
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const EDGE = process.env.EDGE_BIN || 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const root = path.join(__dirname, '..');
const PORT = 9388, W = 360, H = 800;
const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'edge-lazy-'));
  const proc = spawn(EDGE, ['--headless=new', '--disable-gpu', '--no-first-run',
    '--remote-debugging-port=' + PORT, '--user-data-dir=' + profile, 'about:blank'], { stdio: 'ignore' });
  try {
    let t = null;
    for (let i = 0; i < 80 && !t; i++) {
      try { t = (await (await fetch('http://127.0.0.1:' + PORT + '/json/list')).json()).find(x => x.type === 'page'); } catch (e) { }
      if (!t) await sleep(250);
    }
    const ws = new WebSocket(t.webSocketDebuggerUrl);
    await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
    let id = 0; const pend = new Map(); const reqs = [];
    ws.addEventListener('message', ev => {
      const m = JSON.parse(ev.data);
      if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); }
      else if (m.method === 'Network.requestWillBeSent') reqs.push(m.params.request.url);
    });
    const send = (method, params) => new Promise(res => { const i = ++id; pend.set(i, res); ws.send(JSON.stringify({ id: i, method, params: params || {} })); });
    const ev = async e => (await send('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true })).result.result.value;

    await send('Page.enable'); await send('Network.enable'); await send('Runtime.enable');
    await send('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 2, mobile: true });
    await send('Page.navigate', { url: 'file:///' + path.join(root, 'index.html').replace(/\\/g, '/') });
    await sleep(1500);

    const before = reqs.filter(u => /search-data/.test(u)).length;
    const size = fs.statSync(path.join(root, 'assets', 'search-data.js')).size;
    console.log('١) عند فتح الرئيسية: طلبات search-data.js = ' + before + '  (المطلوب 0)');
    console.log('   حجم الفهرس: ' + (size / 1048576).toFixed(2) + ' MB');

    /* أول بحث فعلي */
    const loaded = await ev(`new Promise(res => {
      const inp = document.getElementById('gq');
      if (!inp) return res('no-input');
      inp.value = 'الأندلس';
      inp.dispatchEvent(new Event('input', { bubbles: true }));
      let n = 0;
      const t = setInterval(() => {
        if (window.__SEARCH__) { clearInterval(t); res('loaded'); }
        if (++n > 100) { clearInterval(t); res('timeout'); }
      }, 50);
    })`);
    const after = reqs.filter(u => /search-data/.test(u)).length;
    console.log('٢) بعد أول بحث: ' + loaded + ' — طلبات search-data.js = ' + after + '  (المطلوب 1)');
    console.log(before === 0 && after === 1 ? '✔ التحميل كسول تمامًا: لا يُحمَّل إلا عند أول استخدام' : '✗ التحميل ليس كسولًا');
    ws.close();
  } finally { proc.kill(); try { fs.rmSync(profile, { recursive: true, force: true }); } catch (e) { } }
})();
