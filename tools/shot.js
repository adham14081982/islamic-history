/* لقطات شاشة للقارئ عبر CDP (Edge headless)
   الاستعمال: node tools/shot.js seerah.html 1,2,3 [عرض] [ارتفاع]
*/
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const root = path.join(__dirname, '..');
const file = process.argv[2] || 'seerah.html';
const pages = (process.argv[3] || '1').split(',').map(s => parseInt(s, 10)).filter(Boolean);
const W = parseInt(process.argv[4] || '390', 10);
const H = parseInt(process.argv[5] || '844', 10);
const PORT = 9333;
const outDir = path.join(root, 'shots');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir);

const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'edge-shot-'));
const proc = spawn(EDGE, [
  '--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run',
  '--remote-debugging-port=' + PORT, '--user-data-dir=' + profile, 'about:blank'
], { stdio: 'ignore' });

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function targets() {
  for (let i = 0; i < 60; i++) {
    try {
      const r = await fetch('http://127.0.0.1:' + PORT + '/json/list');
      const j = await r.json();
      const pg = j.find(t => t.type === 'page');
      if (pg) return pg;
    } catch (e) { }
    await sleep(250);
  }
  throw new Error('لم يبدأ المتصفح');
}

function client(wsUrl) {
  const ws = new WebSocket(wsUrl);
  let id = 0;
  const pend = new Map();
  ws.addEventListener('message', ev => {
    const m = JSON.parse(ev.data);
    if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); }
  });
  const ready = new Promise((res, rej) => {
    ws.addEventListener('open', res);
    ws.addEventListener('error', rej);
  });
  function send(method, params) {
    const i = ++id;
    return new Promise(res => { pend.set(i, res); ws.send(JSON.stringify({ id: i, method, params: params || {} })); });
  }
  return { ready, send, close: () => ws.close() };
}

(async () => {
  const t = await targets();
  const c = client(t.webSocketDebuggerUrl);
  await c.ready;
  await c.send('Page.enable');
  await c.send('Runtime.enable');
  await c.send('Emulation.setDeviceMetricsOverride', {
    width: W, height: H, deviceScaleFactor: 2, mobile: true
  });

  const url = 'file:///' + path.join(root, file).replace(/\\/g, '/').replace(/ /g, '%20');

  for (const p of pages) {
    await c.send('Page.navigate', { url: url + (p > 1 ? '?p=' + p : '') });
    await sleep(4200);
    const info = await c.send('Runtime.evaluate', {
      expression: `(function(){
        var s=document.getElementById('rStage'), pg=document.querySelector('.rpage[data-n]');
        var r=pg?pg.getBoundingClientRect():{};
        return JSON.stringify({dbg:document.body.getAttribute('data-dbg'),
          stage:s?Math.round(s.getBoundingClientRect().width)+'x'+Math.round(s.getBoundingClientRect().height):'-',
          page:pg?Math.round(r.left)+','+Math.round(r.width)+','+Math.round(r.height):'-',
          docW:document.documentElement.scrollWidth, winW:innerWidth, winH:innerHeight,
          over:(function(){var b=pg&&pg.querySelector('.rbody');return b?b.scrollHeight-b.clientHeight:0})()});
      })()`, returnByValue: true
    });
    console.log('p' + p, info.result.result.value);
    const shot = await c.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
    const out = path.join(outDir, path.basename(file, '.html') + '-p' + p + '.png');
    fs.writeFileSync(out, Buffer.from(shot.result.data, 'base64'));
    console.log('  →', out);
  }

  c.close();
  proc.kill();
  process.exit(0);
})().catch(e => { console.error(e); try { proc.kill(); } catch (_) { } process.exit(1); });
