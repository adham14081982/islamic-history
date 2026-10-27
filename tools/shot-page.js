/* لقطة شاشة لصفحة قارئ (للمقارنة البصرية قبل/بعد).
   node tools/shot.js <file.html> <out.png> [صفحة] */
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const EDGE = process.env.EDGE_BIN || 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const root = path.join(__dirname, '..');
const file = process.argv[2] || 'rashidun.html';
const out = process.argv[3] || 'shot.png';
const page = +(process.argv[4] || 0);
const PORT = 9411, W = 360, H = 800;
const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'edge-shot-'));
  const proc = spawn(EDGE, ['--headless=new', '--hide-scrollbars', '--no-first-run',
    '--force-device-scale-factor=2', '--remote-debugging-port=' + PORT,
    '--user-data-dir=' + profile, 'about:blank'], { stdio: 'ignore' });
  try {
    let t = null;
    for (let i = 0; i < 80 && !t; i++) {
      try { t = (await (await fetch('http://127.0.0.1:' + PORT + '/json/list')).json()).find(x => x.type === 'page'); } catch (e) { }
      if (!t) await sleep(250);
    }
    const ws = new WebSocket(t.webSocketDebuggerUrl);
    await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
    let id = 0; const pend = new Map();
    ws.addEventListener('message', e => { const m = JSON.parse(e.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); } });
    const send = (method, params) => new Promise(res => { const i = ++id; pend.set(i, res); ws.send(JSON.stringify({ id: i, method, params: params || {} })); });
    const ev = async x => (await send('Runtime.evaluate', { expression: x, returnByValue: true, awaitPromise: true })).result.result.value;

    await send('Page.enable'); await send('Runtime.enable');
    await send('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 2, mobile: true });
    /* تثبيت المظهر الفاتح حتى تكون المقارنة قبل/بعد على نفس الأساس */
    await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: 'light' }] });
    const url = 'file:///' + path.join(root, file).replace(/\\/g, '/');
    await send('Page.navigate', { url });
    await sleep(150);
    await ev('try{localStorage.clear();localStorage.setItem("ti_theme","0")}catch(e){}');
    await send('Page.navigate', { url });
    for (let i = 0; i < 160; i++) {
      if (await ev('!!(document.body && document.body.classList.contains("rready"))')) break;
      await sleep(50);
    }
    /* انتظر اكتمال الترقيم (النسخة الجديدة تُرقّم في الخلفية) */
    for (let i = 0; i < 100; i++) {
      if (await ev('!!(document.body && document.body.dataset.pgdone==="1")')) break;
      await sleep(50);
    }
    if (page) { await ev('window.__go && window.__go(' + page + ')'); }
    await sleep(700);
    const r = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
    fs.writeFileSync(path.join(root, out), Buffer.from(r.result.data, 'base64'));
    console.log('saved ' + out + '  (' + (fs.statSync(path.join(root, out)).size / 1024).toFixed(0) + ' KB)');
    ws.close();
  } finally { proc.kill(); try { fs.rmSync(profile, { recursive: true, force: true }); } catch (e) { } }
})();
