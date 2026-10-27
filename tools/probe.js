/* مسبار تشخيصي: يفتح صفحة قارئ ويرصد الترقيم/الخطوط/الأخطاء.
   node tools/probe.js rashidun.html            (تحميل عادي)
   node tools/probe.js rashidun.html "?p=1"     (قفزة رقمية = ترقيم كامل متزامن)
   node tools/probe.js rashidun.html "?debug"   (يقرأ data-dbg: ch/total) */
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const EDGE = process.env.EDGE_BIN || 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const root = path.join(__dirname, '..');
const file = process.argv[2] || 'rashidun.html';
const query = process.argv[3] || '';
const W = 360, H = 800, DPR = 2, PORT = 9377;
const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'edge-probe-'));
  const proc = spawn(EDGE, ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run',
    '--remote-debugging-port=' + PORT, '--user-data-dir=' + profile, 'about:blank'], { stdio: 'ignore' });
  try {
    let t = null;
    for (let i = 0; i < 80 && !t; i++) {
      try { t = (await (await fetch('http://127.0.0.1:' + PORT + '/json/list')).json()).find(x => x.type === 'page'); } catch (e) { }
      if (!t) await sleep(250);
    }
    const ws = new WebSocket(t.webSocketDebuggerUrl);
    await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
    let id = 0; const pend = new Map(); const logs = [];
    ws.addEventListener('message', ev => {
      const m = JSON.parse(ev.data);
      if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); }
      else if (m.method === 'Runtime.consoleAPICalled') logs.push('console: ' + m.params.args.map(a => a.value).join(' '));
      else if (m.method === 'Runtime.exceptionThrown') logs.push('EXC: ' + (m.params.exceptionDetails.exception && m.params.exceptionDetails.exception.description || m.params.exceptionDetails.text));
    });
    const send = (method, params) => new Promise(res => { const i = ++id; pend.set(i, res); ws.send(JSON.stringify({ id: i, method, params: params || {} })); });
    const ev = async e => (await send('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true })).result.result.value;

    await send('Page.enable'); await send('Runtime.enable');
    await send('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: DPR, mobile: true });

    const url = 'file:///' + path.join(root, file).replace(/\\/g, '/') + query;
    await send('Page.navigate', { url });
    await sleep(150);
    await ev('try{localStorage.clear()}catch(e){}');
    await send('Page.navigate', { url });

    const t0 = Date.now();
    let state = null;
    for (let i = 0; i < 200; i++) {
      state = await ev(`(() => {
        const b = document.body;
        return {
          ready: !!(b && b.classList.contains('rready')),
          done: !!(b && b.dataset.pgdone === '1'),
          dbg: b ? (b.getAttribute('data-dbg') || '') : '',
          foot: (document.querySelector('.rpfoot') || {}).textContent || '',
          fonts: document.fonts ? document.fonts.status : 'n/a',
          amiri: document.fonts ? document.fonts.check('400 1em Amiri') : null,
          css: !!document.querySelector('link[href*="app.css"]'),
          pages: document.querySelectorAll('.rpage').length
        };
      })()`);
      if (state.done) break;
      await sleep(50);
    }
    console.log(JSON.stringify({ ...state, elapsed: Date.now() - t0 }, null, 1));
    if (logs.length) console.log(logs.slice(0, 10).join('\n'));
    ws.close();
  } finally { proc.kill(); try { fs.rmSync(profile, { recursive: true, force: true }); } catch (e) { } }
})();
