/* اختبار استعادة موضع القراءة في متصفح حقيقي (Edge headless + CDP).
   node tools/test-resume.js
   يتحقق من: حفظ رقم الصفحة عند التقليب، استعادته بعد إعادة التحميل،
   استعادة الفصل نفسه، ومقاومة قيمة مخزّنة تالفة. */
const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const EDGE = process.env.EDGE_BIN || 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const root = path.join(__dirname, '..');
const PORT = 9391, SITE_PORT = Number(process.env.SITE_PORT || 8098);
const sleep = ms => new Promise(r => setTimeout(r, ms));

let pass = 0, fail = 0;
const fails = [];
function check(name, cond, extra) {
  if (cond) { pass++; console.log('✔ ' + name); }
  else { fail++; fails.push(name); console.log('✘ ' + name + (extra !== undefined ? '  → ' + JSON.stringify(extra) : '')); }
}

const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2', '.ico': 'image/x-icon'
};
function serve() {
  const http = require('http');
  const srv = http.createServer((req, res) => {
    let p = decodeURIComponent(req.url.split('?')[0]);
    if (p === '/' || p === '') p = '/index.html';
    const file = path.join(root, p.replace(/^\/+/, ''));
    if (!file.startsWith(root)) { res.writeHead(403); return res.end(); }
    fs.readFile(file, (err, buf) => {
      if (err) { res.writeHead(404); return res.end('404'); }
      res.writeHead(200, { 'Content-Type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream' });
      res.end(buf);
    });
  });
  return new Promise(r => srv.listen(SITE_PORT, '127.0.0.1', () => r(srv)));
}

(async () => {
  const site = await serve();
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'edge-resume-'));
  const proc = spawn(EDGE, [
    '--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run',
    '--no-default-browser-check', '--disable-extensions', '--mute-audio',
    '--remote-debugging-port=' + PORT, '--user-data-dir=' + profile, 'about:blank'
  ], { stdio: 'ignore' });

  let ws;
  try {
    let target = null;
    for (let i = 0; i < 80 && !target; i++) {
      try {
        const j = await (await fetch('http://127.0.0.1:' + PORT + '/json/list')).json();
        target = j.find(t => t.type === 'page');
      } catch (e) { }
      if (!target) await sleep(250);
    }
    if (!target) throw new Error('المتصفح لم يبدأ');

    ws = new WebSocket(target.webSocketDebuggerUrl);
    await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });

    let id = 0; const pend = new Map();
    ws.addEventListener('message', e => {
      const m = JSON.parse(e.data);
      if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); }
    });
    const send = (method, params) => new Promise(res => {
      const i = ++id; pend.set(i, res);
      ws.send(JSON.stringify({ id: i, method, params: params || {} }));
    });
    const ev = async expr => {
      const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
      return r.result && r.result.result ? r.result.result.value : undefined;
    };
    const go = async (page, wait = 2600) => {
      await send('Page.navigate', { url: 'http://127.0.0.1:' + SITE_PORT + '/' + page });
      await sleep(wait);
    };

    await send('Page.enable'); await send('Runtime.enable');
    await send('Emulation.setDeviceMetricsOverride', { width: 360, height: 800, deviceScaleFactor: 2, mobile: true });
    await send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });

    /* ١) التقليب يحفظ رقم الصفحة */
    await go('seerah.html', 2000);
    await ev('localStorage.clear()');
    await go('seerah.html', 3000);
    const start = await ev('__R.cur');
    check('البداية من الصفحة الأولى', start === 0, start);

    /* ٤٦٠ms مدة حركة الورقة، وأي نقرة أثناءها تُهمَل عمدًا — ننتظر أكثر منها */
    for (let i = 0; i < 3; i++) { await ev('document.getElementById("rNext").click()'); await sleep(750); }
    const after = await ev('__R.cur');
    const saved = await ev('localStorage.getItem("ti_pos_seerah")');
    check('التقليب ٣ مرات يصل للصفحة الرابعة', after === 3, after);
    check('رقم الصفحة محفوظ في ti_pos_seerah', saved === '4', saved);

    /* ٢) إعادة التحميل تستعيد الموضع */
    await go('seerah.html', 3000);
    const restored = await ev('__R.cur');
    check('إعادة التحميل تستعيد الصفحة الرابعة', restored === 3, restored);

    /* ٣) الفصل نفسه يُستعاد لا رقم الصفحة فقط */
    const CH = '(()=>{var b=null;for(var i=0;i<__R.chaps.length;i++){if(__R.chaps[i].page<=__R.cur+1)b=__R.chaps[i];}return b?b.id:""})()';
    await ev('localStorage.clear()');
    await go('rashidun.html?c=abubakr-nasab', 3000);
    const ch1 = await ev(CH);
    const lastRaw = await ev('localStorage.getItem("ti_last")');
    await go('rashidun.html', 3000);
    const ch2 = await ev(CH);
    check('فُتح الفصل المطلوب أولًا', ch1 === 'abubakr-nasab', ch1);
    check('ti_last يحفظ الفصل', !!lastRaw && JSON.parse(lastRaw).c === ch1, lastRaw);
    check('فتح الحقبة بلا معامل يبدأ من الفصل المحفوظ', ch2 === ch1, { ch1, ch2 });

    /* ٤) قيمة تالفة لا تكسر القارئ */
    await ev('localStorage.setItem("ti_pos_seerah","abc")');
    await go('seerah.html', 3000);
    const bad = await ev('JSON.stringify({cur:__R.cur,ready:!!document.body.classList.contains("rready"),pages:__R.total})');
    const b = JSON.parse(bad);
    check('موضع تالف لا يمنع فتح القارئ', b.ready === true && b.cur === 0, bad);
    check('الترقيم يعمل بعد موضع تالف', b.pages > 100, b.pages);

    /* ٥) موضع أكبر من عدد الصفحات لا يترك القارئ فارغًا */
    await ev('localStorage.setItem("ti_pos_seerah","99999")');
    await go('seerah.html', 3500);
    const over = await ev('JSON.stringify({cur:__R.cur,total:__R.total,ready:!!document.body.classList.contains("rready")})');
    const o = JSON.parse(over);
    check('موضع أكبر من عدد الصفحات يُعالَج', o.ready === true && o.cur >= 0 && o.cur < o.total, over);
  } finally {
    try { ws && ws.close(); } catch (e) { }
    try { proc.kill(); } catch (e) { }
    try { site.close(); } catch (e) { }
  }
  console.log('\nالنتيجة: ' + pass + ' ناجح، ' + fail + ' فاشل');
  if (fail) console.log('الإخفاقات: ' + fails.join(' | '));
  process.exit(fail ? 1 : 0);
})();
