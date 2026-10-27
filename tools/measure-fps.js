/* قياس سلاسة التقليب: إطارات/ثانية + هل تُسبب الحركة تخطيطًا أو إعادة حساب أنماط؟
   node tools/measure-fps.js [صفحة] [عدد-التمريرات]
   ملاحظة: محاكاة اللمس في Edge headless تتوقّف بعد أول إيماءة،
   لذلك كل تمريرة تُنفَّذ في جلسة متصفح مستقلة. */
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const EDGE = process.env.EDGE_BIN || 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const root = path.join(__dirname, '..');
const file = process.argv[2] || 'rashidun.html';
const RUNS = +(process.argv[3] || 2);
const W = 360, H = 800;
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function runOnce(port) {
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'edge-fps-'));
  const proc = spawn(EDGE, ['--headless=new', '--hide-scrollbars', '--no-first-run',
    '--remote-debugging-port=' + port, '--user-data-dir=' + profile, 'about:blank'], { stdio: 'ignore' });
  let ws;
  try {
    let t = null;
    for (let i = 0; i < 60 && !t; i++) {
      try { t = (await (await fetch('http://127.0.0.1:' + port + '/json/list')).json()).find(x => x.type === 'page'); } catch (e) { }
      if (!t) await sleep(200);
    }
    if (!t) throw new Error('المتصفح لم يبدأ');
    ws = new WebSocket(t.webSocketDebuggerUrl);
    await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
    let id = 0; const pend = new Map();
    ws.addEventListener('message', e => {
      const m = JSON.parse(e.data);
      if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); }
    });
    const send = (method, params) => new Promise(res => { const i = ++id; pend.set(i, res); ws.send(JSON.stringify({ id: i, method, params: params || {} })); });
    const ev = async x => {
      const r = await send('Runtime.evaluate', { expression: x, returnByValue: true, awaitPromise: true });
      return r.result && r.result.result ? r.result.result.value : undefined;
    };
    const metrics = async () => {
      const r = await send('Performance.getMetrics');
      const o = {}; (r.result.metrics || []).forEach(m => o[m.name] = m.value); return o;
    };

    await send('Page.enable'); await send('Runtime.enable'); await send('Performance.enable');
    await send('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 2, mobile: true });
    await send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
    const url = 'file:///' + path.join(root, file).replace(/\\/g, '/');
    await send('Page.navigate', { url });
    await sleep(150);
    await ev('try{localStorage.clear()}catch(e){}');
    await send('Page.navigate', { url });
    for (let i = 0; i < 160; i++) {
      if (await ev('!!(document.body && document.body.dataset.pgdone==="1")')) break;
      await sleep(50);
    }
    await ev('window.__go(10)');
    await sleep(400);

    await ev(`(() => {
      window.__F = []; window.__LT = 0; window.__LTD = 0;
      window.__T0 = performance.now();
      try { new PerformanceObserver(l => l.getEntries().forEach(e => { window.__LT++; window.__LTD += e.duration; }))
        .observe({ entryTypes: ['longtask'] }); } catch (e) {}
      (function loop(t) { window.__F.push(t); if (t - window.__T0 < 1200) requestAnimationFrame(loop); })(performance.now());
    })()`);

    const m0 = await metrics();
    const x0 = 300, y = 420, dx = -220, steps = 26;
    await send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: x0, y, id: 1, radiusX: 4, radiusY: 4, force: 1 }] });
    for (let i = 1; i <= steps; i++) {
      await send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x0 + dx * i / steps, y, id: 1, radiusX: 4, radiusY: 4, force: 1 }] });
      await sleep(16);
    }
    await send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [{ x: x0 + dx, y, id: 1, radiusX: 4, radiusY: 4, force: 0 }] });
    await sleep(650);
    const m1 = await metrics();

    const f = (await ev('window.__F')) || [];
    const d = []; for (let i = 1; i < f.length; i++) d.push(f[i] - f[i - 1]);
    const dur = (f[f.length - 1] - f[0]) || 1;
    const sorted = d.slice().sort((a, b) => a - b);
    return {
      fps: +(((f.length - 1) * 1000) / dur).toFixed(1),
      frames: f.length,
      p95: +(sorted[Math.floor(sorted.length * 0.95)] || 0).toFixed(1),
      worst: +(sorted[sorted.length - 1] || 0).toFixed(1),
      longFrames: d.filter(x => x > 24).length,
      layouts: Math.round((m1.LayoutCount || 0) - (m0.LayoutCount || 0)),
      styleRecalcs: Math.round((m1.RecalcStyleCount || 0) - (m0.RecalcStyleCount || 0)),
      longTasks: await ev('window.__LT'),
      longTaskMs: Math.round(await ev('window.__LTD'))
    };
  } finally {
    try { ws && ws.close(); } catch (e) { }
    try { proc.kill(); } catch (e) { }
    try { fs.rmSync(profile, { recursive: true, force: true }); } catch (e) { }
  }
}

(async () => {
  const out = [];
  for (let i = 0; i < RUNS; i++) {
    try { out.push(await runOnce(9400 + i)); } catch (e) { console.log('  #' + (i + 1) + ' فشل: ' + e.message); }
  }
  console.log('التقليب — ' + out.length + ' تمريرات على ' + file + ':');
  out.forEach((r, i) => console.log('  #' + (i + 1) + '  fps=' + r.fps + '  p95=' + r.p95 + 'ms  أسوأ=' + r.worst +
    'ms  إطارات>24ms=' + r.longFrames + '  Layout=' + r.layouts + '  RecalcStyle=' + r.styleRecalcs +
    '  longtasks=' + r.longTasks + ' (' + r.longTaskMs + 'ms)'));
  if (out.length) {
    const avg = k => +(out.reduce((a, r) => a + r[k], 0) / out.length).toFixed(1);
    console.log('المتوسط: fps=' + avg('fps') + '  Layout/تمريرة=' + avg('layouts') + '  RecalcStyle/تمريرة=' + avg('styleRecalcs'));
  }
})();
