/* لقطات مراجعة الواجهة — كل الشاشات الأساسية في الوضعين النهاري والليلي.
   الاستعمال: node tools/uishot.js [بادئة]   ← اللقطات إلى shots/ui/<بادئة>*.png
*/
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const root = path.join(__dirname, '..');
const tag = process.argv[2] || 'cur';
const W = 360, H = 760, PORT = 9334;
const outDir = path.join(root, 'shots', 'ui');
fs.mkdirSync(outDir, { recursive: true });

const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'edge-ui-'));
const proc = spawn(EDGE, [
  '--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run',
  '--remote-debugging-port=' + PORT, '--user-data-dir=' + profile, 'about:blank'
], { stdio: 'ignore' });

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function target() {
  for (let i = 0; i < 60; i++) {
    try {
      const j = await (await fetch('http://127.0.0.1:' + PORT + '/json/list')).json();
      const pg = j.find(t => t.type === 'page');
      if (pg) return pg;
    } catch (e) { }
    await sleep(250);
  }
  throw new Error('لم يبدأ المتصفح');
}

function client(wsUrl) {
  const ws = new WebSocket(wsUrl);
  let id = 0; const pend = new Map();
  ws.addEventListener('message', ev => {
    const m = JSON.parse(ev.data);
    if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); }
  });
  const ready = new Promise((res, rej) => { ws.addEventListener('open', res); ws.addEventListener('error', rej); });
  const send = (method, params) => new Promise(res => {
    const i = ++id; pend.set(i, res); ws.send(JSON.stringify({ id: i, method, params: params || {} }));
  });
  return { ready, send, close: () => ws.close() };
}

const fileUrl = f => 'file:///' + path.join(root, f).replace(/\\/g, '/').replace(/ /g, '%20');

(async () => {
  const t = await target();
  const c = client(t.webSocketDebuggerUrl);
  await c.ready;
  await c.send('Page.enable');
  await c.send('Runtime.enable');
  await c.send('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 2, mobile: true });
  /* إخفاء تلميح أول استخدام حتى لا يحجب اللقطات */
  await c.send('Page.addScriptToEvaluateOnNewDocument', {
    source: "try{localStorage.setItem('ti_hint','1')}catch(e){}"
  });

  async function shot(name) {
    const s = await c.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
    const out = path.join(outDir, tag + '-' + name + '.png');
    fs.writeFileSync(out, Buffer.from(s.result.data, 'base64'));
    console.log('  →', path.relative(root, out));
  }
  async function go(f, q, ms) {
    await c.send('Page.navigate', { url: fileUrl(f) + (q || '') });
    await sleep(ms || 3200);
  }
  async function evalJs(expr) {
    const r = await c.send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
    return r.result.result && r.result.result.value;
  }
  async function theme(dark) {
    await evalJs(`try{localStorage.setItem('ti_theme','${dark ? 1 : 0}')}catch(e){}`);
  }

  /* نهاري — نفرض تفضيل النظام فاتحًا حتى تكون اللقطات ممثِّلة */
  await c.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: 'light' }] });
  await go('index.html');
  await shot('01-home');

  await go('rashidun.html');
  await shot('02-toc');

  await go('rashidun.html', '?p=4');
  await shot('03-chapter');

  await go('rashidun.html', '?p=40');
  await shot('04-reader');

  /* لوحة القارئ */
  await evalJs(`(function(){var b=document.getElementById('rProgBtn');if(b)b.click();return !!document.getElementById('rPanel')})()`);
  await sleep(700);
  await shot('05-panel');

  /* الوضع الليلي */
  await c.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: 'dark' }] });
  await theme(true);
  await go('index.html');
  await shot('06-home-dark');
  await go('rashidun.html', '?p=40');
  await shot('07-reader-dark');

  /* قياسات مساعدة */
  const m = await evalJs(`(function(){
    var q=s=>document.querySelector(s);
    var cs=(el,p)=>el?getComputedStyle(el)[p]:null;
    var body=q('.rbody');
    return JSON.stringify({
      pageW: q('.rpage')?Math.round(q('.rpage').getBoundingClientRect().width):null,
      fontSize: cs(body,'fontSize'), lineHeight: cs(body,'lineHeight'),
      textAlign: cs(body,'textAlign'), letterSpacing: cs(body,'letterSpacing'),
      tapTargets: [...document.querySelectorAll('.ib,button,a')].slice(0,40).map(e=>{
        var r=e.getBoundingClientRect(); return Math.round(Math.min(r.width,r.height));
      }).filter(n=>n>0).sort((a,b)=>a-b).slice(0,8)
    });
  })()`);
  console.log('قياسات:', m);

  c.close(); proc.kill(); process.exit(0);
})().catch(e => { console.error(e); try { proc.kill(); } catch (_) { } process.exit(1); });
