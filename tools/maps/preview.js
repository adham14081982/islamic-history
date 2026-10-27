/* معاينة الخرائط: لقطة بالحجم الكامل (1000×640) ولقطة بمقاس العرض في الهاتف (340px).
   node tools/maps/preview.js [معرّف] */
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const root = path.join(__dirname, '..', '..');
const dir = path.join(root, 'assets', 'img', 'maps');
const outDir = path.join(root, 'shots', 'maps');
fs.mkdirSync(outDir, { recursive: true });

const only = process.argv[2];
const files = fs.readdirSync(dir).filter((f) => f.endsWith('.svg'))
  .filter((f) => !only || f.indexOf(only) >= 0).sort();

const PORT = 9455;
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'edge-map-'));
const proc = spawn(EDGE, [
  '--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run',
  '--remote-debugging-port=' + PORT, '--user-data-dir=' + profile, 'about:blank'
], { stdio: 'ignore' });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  let list = null;
  for (let i = 0; i < 80; i++) {
    try { const r = await fetch('http://127.0.0.1:' + PORT + '/json/list'); list = await r.json(); if (list && list.length) break; } catch (e) { }
    await sleep(250);
  }
  const t = list.find((x) => x.type === 'page');
  const ws = new WebSocket(t.webSocketDebuggerUrl);
  let id = 0; const pend = new Map();
  ws.onmessage = (e) => { const m = JSON.parse(e.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); } };
  const send = (method, params) => new Promise((res) => { const i = ++id; pend.set(i, (m) => res(m.result !== undefined ? m.result : m.error)); ws.send(JSON.stringify({ id: i, method, params: params || {} })); });
  await new Promise((r) => { ws.onopen = r; });
  await send('Page.enable');

  for (const f of files) {
    const url = 'file:///' + path.join(dir, f).replace(/\\/g, '/');
    /* كامل */
    await send('Emulation.setDeviceMetricsOverride', { width: 1000, height: 640, deviceScaleFactor: 1.5, mobile: false });
    await send('Page.navigate', { url });
    await sleep(700);
    let s = await send('Page.captureScreenshot', { format: 'png' });
    if (s && s.data) fs.writeFileSync(path.join(outDir, f.replace('.svg', '-full.png')), Buffer.from(s.data, 'base64'));
    /* بحجم الهاتف */
    await send('Emulation.setDeviceMetricsOverride', { width: 340, height: 218, deviceScaleFactor: 3, mobile: true });
    await send('Page.navigate', { url });
    await sleep(600);
    s = await send('Page.captureScreenshot', { format: 'png' });
    if (s && s.data) fs.writeFileSync(path.join(outDir, f.replace('.svg', '-thumb.png')), Buffer.from(s.data, 'base64'));
    console.log('  ✔', f);
  }
  ws.close(); try { proc.kill(); } catch (e) { }
  process.exit(0);
})().catch((e) => { console.error('✗', e.message); try { proc.kill(); } catch (e2) { } process.exit(1); });
