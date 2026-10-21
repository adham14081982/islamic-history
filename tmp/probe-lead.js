/* تشخيص: أي صفحة تفيض وما داخلها */
const { spawn } = require('child_process');
const path = require('path');
const os = require('os');
const fs = require('fs');

const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const root = path.join(__dirname, '..');
const file = process.argv[2] || 'seerah.html';
const jump = process.argv[3] || '';
const PORT = 9411;
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'edge-diag-'));
const proc = spawn(EDGE, ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run',
  '--remote-debugging-port=' + PORT, '--user-data-dir=' + profile, 'about:blank'], { stdio: 'ignore' });
const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  let t;
  for (let i = 0; i < 60 && !t; i++) {
    try { const j = await (await fetch('http://127.0.0.1:' + PORT + '/json/list')).json(); t = j.find(x => x.type === 'page'); } catch (e) { }
    if (!t) await sleep(250);
  }
  const ws = new WebSocket(t.webSocketDebuggerUrl);
  let id = 0; const pend = new Map();
  ws.addEventListener('message', ev => { const m = JSON.parse(ev.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); } });
  await new Promise(r => ws.addEventListener('open', r));
  const send = (method, params) => new Promise(res => { const i = ++id; pend.set(i, res); ws.send(JSON.stringify({ id: i, method, params: params || {} })); });

  await send('Page.enable');
  await send('Runtime.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: 360, height: 712, deviceScaleFactor: 2, mobile: true });
  const url = 'file:///' + path.join(root, file).replace(/\\/g, '/').replace(/ /g, '%20') + (jump ? '?p=' + jump : '');
  await send('Page.navigate', { url });
  await sleep(2600);

  const r = await send('Runtime.evaluate', {
    returnByValue: true,
    expression: `(function(){
      var l=document.querySelector('.rbody .lead');
      if(!l) return 'no lead';
      var cs=getComputedStyle(l);
      return JSON.stringify({ta:cs.textAlign, dir:cs.direction, fs:cs.fontSize, cls:l.className, parent:l.parentElement.className, pta:getComputedStyle(l.parentElement).textAlign});
    })()`
  });
  console.log(r.result.result.value);
  ws.close(); proc.kill(); process.exit(0);
})().catch(e => { console.error(e); proc.kill(); process.exit(1); });
