/* اختبار إعادة التحميل: هل يتغيّر النص بعد حفظ الخطة واسترجاعها؟ */
const { spawn } = require('child_process');
const fs = require('fs'); const path = require('path'); const os = require('os');
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const root = path.join(__dirname, '..');
const file = process.argv[2] || 'seerah.html';
const W = 360, H = 712;
const PORT = 9500 + Math.floor(Math.random() * 200);
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'edge-rl-'));
const proc = spawn(EDGE, ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run',
  '--remote-debugging-port=' + PORT, '--user-data-dir=' + profile, 'about:blank'], { stdio: 'ignore' });
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  let t = null;
  for (let i = 0; i < 60 && !t; i++) {
    try { const j = await (await fetch('http://127.0.0.1:' + PORT + '/json/list')).json(); t = j.find(x => x.type === 'page'); } catch (e) { }
    if (!t) await sleep(250);
  }
  const ws = new WebSocket(t.webSocketDebuggerUrl);
  let id = 0; const pend = new Map();
  ws.addEventListener('message', ev => { const m = JSON.parse(ev.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); } });
  await new Promise(r => ws.addEventListener('open', r));
  const send = (m, p) => new Promise(res => { const i = ++id; pend.set(i, res); ws.send(JSON.stringify({ id: i, method: m, params: p || {} })); });
  await send('Page.enable'); await send('Runtime.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 2, mobile: true });

  const url = 'file:///' + path.join(root, file).replace(/\\/g, '/').replace(/ /g, '%20');
  const expr = `(function(){var R=window.__R;if(!R)return 'noR';var o=[];for(var i=0;i<R.total;i++){o.push(R.pages[i].items.map(function(it){return it.d.k+':'+(it.d.a||0)+'-'+(it.d.e||0)}).join(',')+'#'+R.pages[i].items.map(function(it){return (it.node.textContent||'').replace(/\\s+/g,' ').slice(0,40)}).join('|'))}return JSON.stringify({t:R.total,o:o})})()`;

  const out = [];
  for (let pass = 1; pass <= 2; pass++) {
    await send('Page.navigate', { url: url + '?r=' + pass });
    await sleep(4500);
    const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true });
    out.push(r.result.result.value);
    console.log('pass' + pass, 'len', (r.result.result.value || '').length);
  }
  const a = JSON.parse(out[0]), b = JSON.parse(out[1]);
  console.log('total', a.t, b.t);
  let diff = 0;
  for (let i = 0; i < Math.max(a.o.length, b.o.length); i++) {
    if (a.o[i] !== b.o[i]) {
      diff++;
      if (diff <= 3) console.log('DIFF p' + (i + 1) + '\n  1: ' + a.o[i] + '\n  2: ' + b.o[i]);
    }
  }
  console.log('diffs', diff, 'of', a.o.length);
  ws.close(); proc.kill(); process.exit(0);
})().catch(e => { console.error(e); try { proc.kill(); } catch (_) { } process.exit(1); });
