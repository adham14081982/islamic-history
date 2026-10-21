/* فحص كل صفحات القارئ: فيض رأسي أو تمرير أفقي في الجداول
   الاستعمال: node tools/scanreader.js rashidun.html [عرض] [ارتفاع]
*/
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const root = path.join(__dirname, '..');
const file = process.argv[2] || 'rashidun.html';
const W = parseInt(process.argv[3] || '360', 10);
const H = parseInt(process.argv[4] || '712', 10);
const PORT = 9400 + Math.floor(Math.random() * 300);

const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'edge-scan-'));
const proc = spawn(EDGE, [
  '--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run',
  '--remote-debugging-port=' + PORT, '--user-data-dir=' + profile, 'about:blank'
], { stdio: 'ignore' });
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function targets() {
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

(async () => {
  const t = await targets();
  const ws = new WebSocket(t.webSocketDebuggerUrl);
  let id = 0; const pend = new Map();
  ws.addEventListener('message', ev => {
    const m = JSON.parse(ev.data);
    if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); }
  });
  await new Promise(r => ws.addEventListener('open', r));
  const send = (m, p) => new Promise(res => { const i = ++id; pend.set(i, res); ws.send(JSON.stringify({ id: i, method: m, params: p || {} })); });

  await send('Page.enable');
  await send('Runtime.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 2, mobile: true });

  const url = 'file:///' + path.join(root, file).replace(/\\/g, '/').replace(/ /g, '%20');
  await send('Page.navigate', { url });
  await sleep(4500);

  const total = (await send('Runtime.evaluate', { expression: '__R.total', returnByValue: true })).result.result.value;
  if (!total) { console.error('لا خطة ترقيم:', total); process.exit(1); }

  let bad = [], tb = 0, maxOver = 0;
  for (let n = 0; n < total; n++) {
    await send('Runtime.evaluate', { expression: '__go(' + n + ')' });
    await sleep(45);
    const r = await send('Runtime.evaluate', {
      returnByValue: true, expression: `(function(){
        var p=document.querySelector('.rpage[data-n="${n}"]'); if(!p) return 'missing';
        var b=p.querySelector('.rbody');
        var tw=0; p.querySelectorAll('.tblwrap').forEach(function(w){ tw=Math.max(tw, w.scrollWidth-w.clientWidth); });
        return JSON.stringify({o:b.scrollHeight-b.clientHeight, t:tw, tb:p.querySelectorAll('.tblwrap').length});
      })()`
    });
    const v = JSON.parse(r.result.result.value);
    if (v === 'missing') { bad.push(n + ':missing'); continue; }
    if (v.tb) tb++;
    if (v.o > 6) { bad.push((n + 1) + ':over' + v.o); maxOver = Math.max(maxOver, v.o); }
    if (v.t > 1) bad.push((n + 1) + ':tblX' + v.t);
  }
  console.log(JSON.stringify({ total, tablePages: tb, nbad: bad.length, maxOver, bad: bad.slice(0, 20) }));
  ws.close(); proc.kill(); process.exit(0);
})().catch(e => { console.error(e); try { proc.kill(); } catch (_) { } process.exit(1); });
