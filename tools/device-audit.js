/* فحص الواجهة على الجهاز الحقيقي عبر CDP (WebView قابل للتنقيح في نسخة debug).
   الاستعمال: node tools/device-audit.js [شاشة]
   شاشات: home | search | reader | panel
   المتطلبات: adb متصل + التطبيق يعمل + adb forward tcp:9222 localabstract:webview_devtools_remote_<pid>
*/
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const root = path.join(__dirname, '..');
const outDir = path.join(root, 'shots', 'device');
fs.mkdirSync(outDir, { recursive: true });

function sh(cmd) { return execSync(cmd, { encoding: 'utf8' }).trim(); }

async function targets() {
  const raw = sh('curl -s http://127.0.0.1:9222/json/list');
  return JSON.parse(raw);
}

function connect(wsUrl) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(wsUrl);
    let id = 0;
    const pend = new Map();
    const evs = [];
    ws.onmessage = (e) => {
      const m = JSON.parse(e.data);
      if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); }
      else if (m.method) evs.push(m);
    };
    ws.onerror = reject;
    ws.onopen = () => resolve({
      evs,
      send(method, params) {
        const i = ++id;
        return new Promise((res) => {
          pend.set(i, (m) => res(m.result !== undefined ? m.result : m.error));
          ws.send(JSON.stringify({ id: i, method, params: params || {} }));
        });
      },
      close() { try { ws.close(); } catch (e) {} }
    });
  });
}

const HELPERS = `
  window.__ar = function (n) {
    return String(n).replace(/[0-9]/g, function (d) { return '٠١٢٣٤٥٦٧٨٩'[+d]; });
  };
  window.__rect = function (el) {
    if (!el) return null;
    var r = el.getBoundingClientRect();
    return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height), b: Math.round(r.bottom), r: Math.round(r.right) };
  };
  window.__over = function () {
    var de = document.documentElement;
    return de.scrollWidth - de.clientWidth;
  };
  window.__smallTaps = function () {
    var bad = [];
    document.querySelectorAll('a,button,[role=button],.era,.ev,.tl,.rtab,.rnav,.ib').forEach(function (el) {
      var r = el.getBoundingClientRect();
      if (r.width < 1 || r.height < 1) return;
      if (r.width < 44 || r.height < 44) {
        bad.push({ sel: el.className ? el.className.toString().slice(0, 40) : el.tagName, w: Math.round(r.width), h: Math.round(r.height) });
      }
    });
    return bad.slice(0, 14);
  };
`;

(async () => {
  const list = await targets();
  const page = list.find((t) => t.type === 'page');
  if (!page) { console.error('✗ لا توجد صفحة WebView — هل التطبيق يعمل؟'); process.exit(1); }
  console.log('→', page.url);

  const c = await connect(page.webSocketDebuggerUrl);
  await c.send('Page.enable');
  await c.send('Runtime.enable');
  await c.send('Runtime.evaluate', { expression: HELPERS, returnByValue: true });

  const evalJs = async (expr) => {
    const r = await c.send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
    if (r && r.exceptionDetails) return { __err: r.exceptionDetails.text + ' ' + (r.exceptionDetails.exception && r.exceptionDetails.exception.description || '') };
    return r && r.result ? r.result.value : null;
  };
  const shot = async (name) => {
    const s = await c.send('Page.captureScreenshot', { format: 'png' });
    if (s && s.data) {
      fs.writeFileSync(path.join(outDir, name + '.png'), Buffer.from(s.data, 'base64'));
      console.log('  📸', name + '.png');
    } else console.log('  ✗ لقطة فاشلة', name, s && s.message);
  };
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  const which = process.argv[2] || 'home';

  if (which === 'home') {
    await evalJs('window.scrollTo(0,0)');
    await sleep(300);
    console.log('\n== الرئيسية ==');
    console.log(JSON.stringify(await evalJs(`(function(){
      var de=document.documentElement;
      var hero=document.querySelector('.hero');
      var gs=document.querySelector('.gsearch');
      var inp=document.querySelector('.gsearch input');
      var eg=document.querySelector('.eg');
      var firstEra=document.querySelector('.eg .ec');
      var cont=document.querySelector('.cont');
      var tabs=document.querySelectorAll('.eg .ec').length;
      var hint=document.querySelector('.sec .n');
      return {
        viewport:{ w:de.clientWidth, h:de.clientHeight },
        docOverflow: __over(),
        heroBottom: hero?__rect(hero).b:null,
        heroH: hero?__rect(hero).h:null,
        searchTop: gs?__rect(gs).y:null,
        searchInViewport: gs? (__rect(gs).b <= de.clientHeight) : null,
        inputFont: inp?getComputedStyle(inp).fontSize:null,
        eraCount: tabs,
        gridLeftGap: firstEra?__rect(firstEra).x:null,
        gridRightGap: firstEra? (de.clientWidth - __rect(firstEra).r) : null,
        gridCols: eg? getComputedStyle(eg).gridTemplateColumns : null,
        gridGap: eg? getComputedStyle(eg).gap : null,
        cardH: firstEra? __rect(firstEra).h : null,
        hintAlign: hint? __rect(hint).x : null,
        contCard: cont? __rect(cont).h : 0,
        bodyFont: getComputedStyle(document.body).fontSize,
        theme: document.documentElement.classList.contains('dark')?'dark':'light'
      };
    })()`), null, 1));
    console.log('أهداف لمس صغيرة:', JSON.stringify(await evalJs('__smallTaps()')));
    await shot('dev-home');
    await evalJs('window.scrollTo(0, document.querySelector(".eras").offsetTop - 20)');
    await sleep(300);
    await shot('dev-home-eras');
  }

  if (which === 'search') {
    console.log('\n== البحث ==');
    const q = process.argv[3] || 'حطين';
    console.log(await evalJs(`(function(){
      var inp=document.querySelector('.gsearch input');
      if(!inp) return 'لا يوجد حقل بحث';
      inp.focus(); inp.value=${JSON.stringify(q)};
      inp.dispatchEvent(new Event('input',{bubbles:true}));
      return 'ok';
    })()`));
    await sleep(1200);
    console.log(JSON.stringify(await evalJs(`(function(){
      var res=document.querySelector('.gsres');
      var rows=document.querySelectorAll('.gsres .ge, .gsres .grow');
      var empty=document.querySelector('.gempty');
      var first=rows[0];
      return {
        rows: rows.length,
        empty: empty? empty.textContent.trim() : null,
        firstText: first? first.textContent.trim().replace(/\\s+/g,' ').slice(0,120) : null,
        hasMarks: document.querySelectorAll('.gsres .gmark, .gsres mark').length,
        overflow: __over()
      };
    })()`), null, 1));
    await shot('dev-search-' + q);
  }

  if (which === 'reader') {
    console.log('\n== القارئ ==');
    console.log(JSON.stringify(await evalJs(`(function(){
      var de=document.documentElement;
      var top=document.querySelector('.top');
      var tabs=document.querySelector('.rtabs');
      var stage=document.querySelector('.rstage');
      var page=document.querySelector('.rpage');
      var body=document.querySelector('.rbody');
      var foot=document.querySelector('.rpfoot');
      var pr=page?__rect(page):null, sr=stage?__rect(stage):null;
      return {
        viewport:{ w:de.clientWidth, h:de.clientHeight },
        docOverflow: __over(),
        top: __rect(top),
        tabs: __rect(tabs),
        stage: sr,
        page: pr,
        clipBottom: (pr&&sr)? pr.b - sr.b : null,
        footVisible: foot? (__rect(foot).b <= (sr?sr.b:0)) : null,
        footText: foot? foot.textContent.replace(/\\s+/g,' ').trim() : null,
        brand: document.querySelector('.rbrand')? document.querySelector('.rbrand').textContent : null,
        brandW: document.querySelector('.rbrand')? __rect(document.querySelector('.rbrand')).w : null,
        bodyFont: body? getComputedStyle(body).fontSize : null,
        pageCount: (window.__R && __R.total) || null
      };
    })()`), null, 1));
    await shot('dev-reader');
  }

  const errs = c.evs.filter((e) => e.method === 'Runtime.exceptionThrown');
  if (errs.length) {
    console.log('\n⚠ أخطاء JS:');
    errs.forEach((e) => console.log('  ', e.params.exceptionDetails.text, e.params.exceptionDetails.exception && e.params.exceptionDetails.exception.description));
  } else console.log('\n✔ لا أخطاء JS');

  c.close();
  process.exit(0);
})().catch((e) => { console.error('✗', e.message); process.exit(1); });
