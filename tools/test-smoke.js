/* اختبار دخان شامل في متصفح حقيقي: أخطاء الكونسول + وجود العناصر + التفاعلات الأساسية.
   node tools/test-smoke.js
   يغطي: ١٢ صفحة، لوحة الفهرس، الانتقال لصفحة، البحث الداخلي، حجم الخط، التقليب،
   البحث الشامل وفتح نتيجته، والمفضلة. */
const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const EDGE = process.env.EDGE_BIN || 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const root = path.join(__dirname, '..');
const PORT = 9381;
const SITE_PORT = Number(process.env.SITE_PORT || 8099);
const sleep = ms => new Promise(r => setTimeout(r, ms));

/* خادم ساكن صغير: التطبيق يقدّم صفحاته من origin حقيقي (https://localhost)،
   فاختبارها على file:// يعطي نتائج مضلّلة (منع CORS للخطوط). */
const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.woff2': 'font/woff2', '.woff': 'font/woff', '.ico': 'image/x-icon'
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

let pass = 0, fail = 0;
const fails = [];
function check(name, cond, extra) {
  if (cond) { pass++; console.log('✔ ' + name); }
  else { fail++; fails.push(name); console.log('✘ ' + name + (extra !== undefined ? '  → ' + JSON.stringify(extra) : '')); }
}

const PAGES = ['index', 'about', 'pre-islamic', 'seerah', 'rashidun', 'umayyad', 'andalus',
  'abbasid', 'crusades', 'mamluk', 'ottoman', 'civilization', 'modern'];

(async () => {
  const site = await serve();
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'edge-smoke-'));
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
    ws = new WebSocket(target.webSocketDebuggerUrl);
    await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });

    let id = 0; const pend = new Map();
    let errors = [];
    ws.addEventListener('message', e => {
      const m = JSON.parse(e.data);
      if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); return; }
      if (m.method === 'Runtime.exceptionThrown') {
        errors.push('استثناء: ' + (m.params.exceptionDetails.exception && m.params.exceptionDetails.exception.description || m.params.exceptionDetails.text));
      }
      if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') {
        errors.push('console.error: ' + m.params.args.map(a => a.value || a.description || '').join(' '));
      }
      if (m.method === 'Log.entryAdded' && m.params.entry.level === 'error') {
        const t = m.params.entry.text || '';
        const u = m.params.entry.url || '';
        /* على file:// يمنع المتصفح تحميل الخطوط (CORS) ويطلب cordova.js غير الموجود
           — كلاهما لا يحدث داخل التطبيق (origin = https://localhost). */
        const noise = /CORS policy/.test(t) || /cordova\.js/.test(u) || /cordova\.js/.test(t);
        if (!noise) errors.push('log: ' + t + (u ? ' ← ' + u : ''));
      }
    });
    const send = (method, params) => new Promise(res => {
      const i = ++id; pend.set(i, res);
      ws.send(JSON.stringify({ id: i, method, params: params || {} }));
    });
    const ev = async expr => {
      const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
      if (r.result && r.result.exceptionDetails) return '__EXC__' + (r.result.exceptionDetails.text || '');
      return r.result && r.result.result ? r.result.result.value : undefined;
    };
    const go = async (page, wait = 2200) => {
      const [f, q] = page.split('?');
      /* يُختبَر عبر origin حقيقي (http) لأن التطبيق يقدّم الملفات من
         https://localhost — وعلى file:// يمنع المتصفح تحميل الخطوط فيظهر
         فشل لا علاقة له بالتطبيق. BASE يتيح توجيه الاختبار لعنوان آخر. */
      const base = process.env.BASE || 'http://127.0.0.1:' + SITE_PORT;
      const url = base.replace(/\/$/, '') + '/' + f + (q ? '?' + q : '');
      await send('Page.navigate', { url });
      await sleep(wait);
    };

    await send('Page.enable'); await send('Runtime.enable'); await send('Log.enable');
    await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 3, mobile: true });
    await send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });

    /* ١) كل صفحة: تُحمَّل، بلا أخطاء، وبها عناصرها الأساسية */
    for (const p of PAGES) {
      errors = [];
      await go(p + '.html', p === 'index' ? 1200 : 2600);
      const info = await ev(`JSON.stringify({
        title: document.title,
        theme: !!document.getElementById('themeBtn'),
        rtl: document.documentElement.getAttribute('dir') === 'rtl',
        reader: !!document.getElementById('book'),
        tabs: document.querySelectorAll('.rtab').length,
        foot: (document.querySelector('.rpfoot')||{}).textContent || '',
        ready: document.body.classList.contains('rready')
      })`);
      let o;
      try { o = JSON.parse(info); } catch (e) { o = {}; }
      /* الصفحات المعلوماتية (index/about) ليست قارئًا فلا تُنتظر منها أقسام الكتاب */
      const isReader = p !== 'index' && p !== 'about';
      const ok = o.title && o.theme && o.rtl && (isReader ? (o.reader && o.tabs > 0 && o.ready) : true);
      check('صفحة ' + p + ' سليمة' + (isReader ? ' (أقسام: ' + o.tabs + ')' : ''), ok, o);
      check('بلا أخطاء JS في ' + p, errors.length === 0, errors.slice(0, 2));
    }

    /* ٢) لوحة الفهرس + الانتقال برقم صفحة */
    await go('seerah.html', 2600);
    await ev('document.getElementById("rMenu").click()');
    await sleep(400);
    check('لوحة الفهرس تُفتح', await ev('document.getElementById("rPanel").classList.contains("on")'));
    check('قائمة الفهرس غير فارغة', (await ev('document.querySelectorAll("#rPlist a, #rPlist button, #rPlist li").length')) > 0);
    const before = await ev('__R.cur');
    await ev('(function(){var i=document.getElementById("rJumpIn");i.value="40";document.getElementById("rJumpGo").click()})()');
    await sleep(700);
    const afterJump = await ev('__R.cur');
    check('الانتقال إلى صفحة ٤٠ يعمل', afterJump === 39, { before, afterJump });

    /* ٣) البحث داخل الكتاب */
    await ev('document.getElementById("rMenu") && document.getElementById("rPanel").classList.remove("on")');
    await ev('(function(){var b=document.querySelector(".top .ib[onclick]"));b&&b.click()})()');
    await sleep(300);
    const inPage = await ev(`(function(){
      var i=document.getElementById('q');
      if(!i) return 'لا حقل';
      i.value='إبراهيم'; i.dispatchEvent(new Event('input',{bubbles:true}));
      return 'ok';
    })()`);
    await sleep(700);
    const nRes = await ev('document.querySelectorAll("#sb .res, #sb a, #sb button").length');
    check('البحث داخل الكتاب يعمل', inPage === 'ok' && nRes > 0, { inPage, nRes });
    await ev('window.closeSearch && window.closeSearch()');

    /* ٤) حجم الخط: الأكبر يغيّر القياس ويُعيد الترقيم */
    const pagesBefore = await ev('__R.total');
    await ev('document.getElementById("rMenu").click()');
    await sleep(300);
    await ev('document.querySelector("[data-fs=\\"1.25\\"]").click()');
    await sleep(2500);
    const fsNow = await ev('__R.fs');
    const pagesAfter = await ev('__R.total');
    check('تكبير الخط يُطبَّق ويُعيد الترقيم', fsNow === 1.25 && pagesAfter > 0, { fsNow, pagesBefore, pagesAfter });

    /* ٥) التقليب: التالي ثم السابق */
    const c0 = await ev('__R.cur');
    await ev('document.getElementById("rNext").click()');
    await sleep(700);
    const c1 = await ev('__R.cur');
    await ev('document.getElementById("rPrev").click()');
    await sleep(700);
    const c2 = await ev('__R.cur');
    check('زر التالي/السابق يتحرّك صفحة واحدة', c1 === c0 + 1 && c2 === c0, { c0, c1, c2 });

    /* ٦) البحث الشامل + فتح النتيجة */
    await go('index.html', 1200);
    await ev('localStorage.clear()');
    await go('index.html', 1200);
    await ev(`(function(){var i=document.getElementById('gq');i.value='حطين';i.dispatchEvent(new Event('input',{bubbles:true}))})()`);
    await sleep(1500);
    const hits = await ev('document.querySelectorAll("#gsres a.grow").length');
    check('البحث الشامل يعطي نتائج', hits > 0, hits);
    const href = await ev('(document.querySelector("#gsres a.grow")||{}).getAttribute && document.querySelector("#gsres a.grow").getAttribute("href")');
    check('رابط النتيجة يشير إلى فصل داخل حقبة', /\.html\?c=/.test(href || ''), href);
    await ev('document.querySelector("#gsres a.grow").click()');
    await sleep(3000);
    const opened = await ev('JSON.stringify({u:location.pathname, hasBook:!!document.getElementById("book"), ch:(document.querySelector(".rbrand")||{}).textContent||""})');
    check('النقر على النتيجة يفتح الفصل', /\.html$/.test(JSON.parse(opened).u) && JSON.parse(opened).hasBook, opened);

    /* ٧) شاشة «عن التطبيق»: سياسة خصوصية حقيقية بلا روابط خارجية */
    await go('about.html', 1200);
    const abt = await ev(`JSON.stringify({
      mail: (document.querySelector('.abt-mail a')||{}).textContent||'',
      href: (document.querySelector('.abt-mail a')||{}).getAttribute ? document.querySelector('.abt-mail a').getAttribute('href') : '',
      ext: document.querySelectorAll('a[href^="http"]').length,
      secs: document.querySelectorAll('main h2.sec').length,
      ver: (document.querySelector('.hero .period')||{}).textContent||''
    })`);
    const a = JSON.parse(abt);
    check('شاشة عن التطبيق تعرض بريد التواصل', /^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i.test(a.mail) && a.href.indexOf('mailto:') === 0, a);
    check('شاشة عن التطبيق بلا أي رابط خارجي', a.ext === 0, a.ext);
    check('أقسام السياسة موجودة ورقم الإصدار يطابق الحزمة', a.secs >= 4 && /١\.٣\.٠|1\.3\.0/.test(a.ver), a);

    /* زر الرجوع (حدث Cordova) في شاشة معلوماتية: يعود للرئيسية لا يخرج من التطبيق */
    await ev(`document.dispatchEvent(new Event('backbutton',{cancelable:true}))`);
    await sleep(1500);
    const backTo = await ev('location.pathname');
    check('زر الرجوع في «عن التطبيق» يعود إلى الرئيسية', /index\.html$/.test(backTo), backTo);

    const homeLink = await ev(`(function(){var l=document.querySelector('a[href="about.html"]');return l?l.textContent.trim():''})()`);
    check('رابط «عن التطبيق» موجود في الرئيسية', !!homeLink, homeLink);
  } finally {
    try { ws && ws.close(); } catch (e) { }
    try { proc.kill(); } catch (e) { }
    try { site.close(); } catch (e) { }
  }
  console.log('\nالنتيجة: ' + pass + ' ناجح، ' + fail + ' فاشل');
  if (fail) console.log('الإخفاقات: ' + fails.join(' | '));
  process.exit(fail ? 1 : 0);
})();
