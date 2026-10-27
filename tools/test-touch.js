/* اختبار محرّك اللمس: يقيس استجابة السحب بأطوال/سرعات مختلفة على محاكي جوال */
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const root = path.join(__dirname, '..');
const file = process.argv[2] || 'rashidun.html';
const W = 390, H = 844, PORT = 9344;

const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'edge-gest-'));
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
  throw new Error('المتصفح لم يبدأ');
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
  await c.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });

  const url = 'file:///' + path.join(root, file).replace(/\\/g, '/').replace(/ /g, '%20');

  const evalJs = async (expr) => {
    const r = await c.send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
    if (r.result && r.result.exceptionDetails) throw new Error(JSON.stringify(r.result.exceptionDetails));
    return r.result.result.value;
  };

  await c.send('Page.navigate', { url: url });
  await sleep(4500);

  const info = JSON.parse(await evalJs(`(function(){
    var R=window.__R, s=document.getElementById('rStage');
    return JSON.stringify({
      total:R.total, cur:R.cur, pageW:R.pageW, pageH:R.pageH,
      stage:Math.round(s.getBoundingClientRect().width)+'x'+Math.round(s.getBoundingClientRect().height),
      ready:document.body.classList.contains('rready'),
      loader: !!document.getElementById('rLoad'),
      tabs:document.querySelectorAll('.rtab').length
    });
  })()`));
  console.log('boot:', JSON.stringify(info));

  const state = async () => JSON.parse(await evalJs(
    `JSON.stringify({cur:window.__R.cur,busy:window.__R.busy,leaf:document.getElementById('rLeaf').className})`));

  /* سحب بالإصبع: نقاط متعددة لضمان توليد pointermove حقيقية */
  async function swipe(dx, ms, y0, pause) {
    const x0 = 195, y = y0 || 420;
    const steps = Math.max(3, Math.round(ms / 16));
    await c.send('Input.dispatchTouchEvent', {
      type: 'touchStart', touchPoints: [{ x: x0, y: y, id: 1, radiusX: 4, radiusY: 4, force: 1 }]
    });
    for (let i = 1; i <= steps; i++) {
      const x = x0 + (dx * i) / steps;
      await c.send('Input.dispatchTouchEvent', {
        type: 'touchMove', touchPoints: [{ x: x, y: y, id: 1, radiusX: 4, radiusY: 4, force: 1 }]
      });
      await sleep(Math.max(1, Math.round(ms / steps)));
    }
    await c.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [{ x: x0 + dx, y: y, id: 1, radiusX: 4, radiusY: 4, force: 0 }] });
    await sleep(pause == null ? 900 : pause);
  }

  async function tap(x, y) {
    await c.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y, id: 1, radiusX: 4, radiusY: 4, force: 1 }] });
    await sleep(60);
    await c.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [{ x, y, id: 1, radiusX: 4, radiusY: 4, force: 0 }] });
    await sleep(700);
  }

  const reset = async (n) => { await evalJs(`window.__go(${n})`); await sleep(400); };

  const cases = [
    ['نقرة على الحافة اليسرى (لم تعد تقلّب)', 'tap', 20, 0],
    ['سحب 30px بطيء (تحت الحد)', 'swipe', 30, 300],
    ['سحب 70px متوسط (تحت 25%)', 'swipe', 70, 320],
    ['سحب 120px متوسط', 'swipe', 120, 320],
    ['سحب 140px بطيء جدًا', 'swipe', 140, 900],
    ['خطفة 50px في 60ms (اهتزاز)', 'swipe', 50, 60],
    ['خطفة 75px في 130ms (سريعة مقصودة)', 'swipe', 75, 130],
    ['سحب رأسي 150px (تمرير لا تقليب)', 'vswipe', 150, 300]
  ];

  for (const [name, kind, d, ms] of cases) {
    await reset(10);
    const before = await state();
    if (kind === 'tap') await tap(20, 420);
    else if (kind === 'vswipe') {
      /* سحب رأسي: يجب أن يُترك للمتصفح ولا يقلّب */
      await c.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 195, y: 500, id: 1, radiusX: 4, radiusY: 4, force: 1 }] });
      for (let i = 1; i <= 8; i++) {
        await c.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: 196, y: 500 - i * 18, id: 1, radiusX: 4, radiusY: 4, force: 1 }] });
        await sleep(18);
      }
      await c.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [{ x: 196, y: 356, id: 1, radiusX: 4, radiusY: 4, force: 0 }] });
      await sleep(900);
    }
    else await swipe(d, ms);

    const after = await state();
    const moved = after.cur - before.cur;
    console.log(
      (moved === 0 ? '✔ بقي' : (moved === 1 ? '↔ انتقل +1' : '✗ قفز ' + moved)) +
      '  |  ' + name + '  (cur ' + before.cur + '→' + after.cur + ')'
    );
  }

  /* debounce: سحبان متتاليان بلا انتظار */
  await reset(10);
  const b0 = await state();
  await swipe(120, 180, 420, 0);
  await swipe(120, 180, 420, 0);
  await sleep(1400);
  const b1 = await state();
  console.log((b1.cur - b0.cur === 1 ? '✔' : '✗') + '  debounce: سحبان متتاليان ⇒ ' + (b1.cur - b0.cur) + ' صفحة');

  /* فيض المحتوى: عيّنة موزّعة مع إمهال الصفحة لتصحيح نفسها */
  const total = (await state(), (await evalJs('window.__R.total')));
  const sample = [];
  for (let i = 0; i < 12; i++) sample.push(Math.round((total - 1) * i / 11));
  const bad = [];
  for (const i of sample) {
    await evalJs('window.__go(' + i + ')');
    await sleep(500);
    const d = JSON.parse(await evalJs(`(function(){
      var R=window.__R, el=R.rendered[R.cur]; if(!el) return JSON.stringify({d:-1});
      var b=el.querySelector('.rbody'); if(!b) return JSON.stringify({d:-1});
      if(b.classList.contains('rflow')) return JSON.stringify({d:-2});
      var last=b.lastElementChild; if(!last) return JSON.stringify({d:0});
      return JSON.stringify({d:Math.round(last.getBoundingClientRect().bottom-b.getBoundingClientRect().bottom)});
    })()`));
    if (d.d > 3) bad.push(i + ':' + d.d);
  }
  console.log('overflow:', bad.length ? '✗ ' + bad.join(', ') : '✔ لا فيض في العيّنة', '(total=' + total + ')');

  c.close();
  proc.kill();
  process.exit(0);
})().catch(e => { console.error('ERR', e); try { proc.kill(); } catch (_) { } process.exit(1); });
