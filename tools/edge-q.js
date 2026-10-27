/* استعلام عن أي صفحة في Edge بلا واجهة (مقاس الهاتف ٣٦٠×٧٦٠).
   node tools/edge-q.js "<تعبير JS>" [ملف] [استعلام] [عرض] [ارتفاع]
   مثال: node tools/edge-q.js "document.querySelector('.rpch').textContent" crusades.html "?p=40"
*/
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const root = path.join(__dirname, '..');
const expr = process.argv[2];
const file = process.argv[3] || 'index.html';
const q = process.argv[4] || '';
const W = parseInt(process.argv[5] || '360', 10);
const H = parseInt(process.argv[6] || '760', 10);
const PORT = 9412;

const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'edge-q-'));
const proc = spawn(EDGE, [
  '--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run',
  '--remote-debugging-port=' + PORT, '--user-data-dir=' + profile, 'about:blank'
], { stdio: 'ignore' });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  let list = null;
  for (let i = 0; i < 60; i++) {
    try {
      const r = await fetch('http://127.0.0.1:' + PORT + '/json/list');
      list = await r.json();
      if (list && list.length) break;
    } catch (e) { }
    await sleep(250);
  }
  if (!list) throw new Error('لم يفتح Edge');

  const target = list.find((t) => t.type === 'page');
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  let id = 0;
  const pend = new Map();
  const evs = [];
  ws.onmessage = (e) => {
    const m = JSON.parse(e.data);
    if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); }
    else if (m.method) evs.push(m);
  };
  const send = (method, params) => new Promise((res) => {
    const i = ++id;
    pend.set(i, (m) => res(m.result !== undefined ? m.result : m.error));
    ws.send(JSON.stringify({ id: i, method, params: params || {} }));
  });

  await new Promise((r) => { ws.onopen = r; });
  await send('Page.enable');
  await send('Runtime.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 2, mobile: true });
  await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: 'light' }] });
  await send('Page.navigate', { url: 'file:///' + path.join(root, file).replace(/\\/g, '/') + q });
  await sleep(2600);

  const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
  if (r && r.exceptionDetails) console.log('✗', (r.exceptionDetails.exception && r.exceptionDetails.exception.description) || r.exceptionDetails.text);
  else {
    const v = r && r.result ? r.result.value : null;
    console.log(typeof v === 'string' ? v : JSON.stringify(v, null, 1));
  }

  const errs = evs.filter((e) => e.method === 'Runtime.exceptionThrown');
  if (errs.length) console.log('⚠ أخطاء JS:', errs.map((e) => e.params.exceptionDetails.text).join(' | '));

  ws.close();
  try { proc.kill(); } catch (e) { }
  process.exit(0);
})().catch((e) => { console.error('✗', e.message); try { proc.kill(); } catch (e2) { } process.exit(1); });
