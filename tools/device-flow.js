/* رحلة كاملة على الجهاز: افتح فصلًا → اقيس القارئ → آخر صفحة → اللوحة → الرئيسية.
   node tools/device-flow.js [معرّف-الفصل] [ملف-الصفحة]
*/
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const root = path.join(__dirname, '..');
const outDir = path.join(root, 'shots', 'device');
fs.mkdirSync(outDir, { recursive: true });

const CH = process.argv[2] || 'first-crusade';
const FILE = process.argv[3] || 'crusades.html';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

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

const RECT = `
  window.__rect=function(el){if(!el)return null;var r=el.getBoundingClientRect();
    return {y:Math.round(r.y),h:Math.round(r.height),b:Math.round(r.bottom),x:Math.round(r.x),w:Math.round(r.width)};};
`;

(async () => {
  const list = JSON.parse(execSync('curl -s http://127.0.0.1:9222/json/list', { encoding: 'utf8' }));
  const page = list.find((t) => t.type === 'page');
  const c = await connect(page.webSocketDebuggerUrl);
  await c.send('Page.enable');
  await c.send('Runtime.enable');

  const ev = async (expr) => {
    const r = await c.send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
    if (r && r.exceptionDetails) return { __err: (r.exceptionDetails.exception && r.exceptionDetails.exception.description) || r.exceptionDetails.text };
    return r && r.result ? r.result.value : null;
  };
  const shot = async (name) => {
    const s = await c.send('Page.captureScreenshot', { format: 'png' });
    if (s && s.data) { fs.writeFileSync(path.join(outDir, name + '.png'), Buffer.from(s.data, 'base64')); console.log('  📸', name + '.png'); }
    else console.log('  ✗ لقطة فاشلة', name, s && s.message);
  };

  console.log('→ فتح', FILE + '?c=' + CH);
  await c.send('Page.navigate', { url: 'https://localhost/' + FILE + '?c=' + CH });
  await sleep(3800);
  await ev(RECT);

  console.log('\n== القارئ على الجهاز ==');
  console.log(JSON.stringify(await ev(`(function(){
    var R=window.__R; if(!R) return 'no __R';
    var de=document.documentElement, stage=document.querySelector('.rstage'),
        page=document.querySelector('.rpage[data-n="'+R.cur+'"]'),
        foot=page?page.querySelector('.rpfoot'):null,
        top=document.querySelector('.top'), tabs=document.querySelector('.rtabs'),
        body=page?page.querySelector('.rbody'):null, ca=window.__TI?__TI.chapAt(R.cur):null;
    var pr=__rect(page), sr=__rect(stage);
    return {
      vw:de.clientWidth, vh:de.clientHeight, overflowX: de.scrollWidth-de.clientWidth,
      top:__rect(top), tabs:__rect(tabs), stage:sr, page:pr,
      clipBottom: (pr&&sr)? pr.b-sr.b : null,
      headroomTop: (pr&&sr)? pr.y-sr.y : null,
      footVisible: foot? __rect(foot).b <= sr.b : null,
      footText: foot? foot.textContent.replace(/\\s+/g,' ').trim() : null,
      brand: document.querySelector('.rbrand')? document.querySelector('.rbrand').textContent.trim() : null,
      brandW: document.querySelector('.rbrand')? __rect(document.querySelector('.rbrand')).w : null,
      bodyFont: body? getComputedStyle(body).fontSize : null,
      lineH: body? getComputedStyle(body).lineHeight : null,
      chPx: Math.round(R.ch), pagePx: Math.round(R.pageH),
      total: R.total, cur: R.cur+1,
      chapter: ca? { id: ca.c.id, name: ca.c.n, i: ca.i, n: ca.n } : null,
      anchor: R.anchor,
      tabsOverflow: tabs? tabs.scrollWidth - tabs.clientWidth : null,
      activeTab: (document.querySelector('.rtab.on')||{}).textContent
    };
  })()`), null, 1));
  await shot('dev-reader-ch');

  /* --- آخر صفحة في الفصل: زر «الفصل التالي» + كتلة نهاية الفصل --- */
  console.log('\n== آخر صفحة من الفصل ==');
  console.log(await ev(`(function(){
    var R=window.__R; if(!R||!__TI) return 'no R';
    var ca=__TI.chapAt(R.cur); if(!ca) return 'no ca';
    var dest=Math.min(ca.c.page-1+ca.n-1, R.total-1);
    __TI.goPage(dest);
    return 'go to '+(dest+1)+' (chap '+ca.c.id+')';
  })()`));
  await sleep(1000);
  console.log(JSON.stringify(await ev(`(function(){
    var R=window.__R, pg=document.querySelector('.rpage[data-n="'+R.cur+'"]');
    var nx=document.getElementById('rNext'), dz=pg?pg.querySelector('.chend'):null,
        chp=pg?pg.querySelector('.rpch'):null;
    var ca=__TI.chapAt(R.cur);
    return {
      nextText: nx? nx.textContent.trim() : null,
      nextEmph: nx? nx.classList.contains('emph') : null,
      chendPresent: !!dz,
      chendText: dz? dz.textContent.replace(/\\s+/g,' ').trim().slice(0,90) : null,
      chapCounter: chp? chp.textContent.trim() : null,
      atChapterEnd: ca? (ca.i>=ca.n) : null,
      cur: R.cur+1, total: R.total
    };
  })()`), null, 1));
  await shot('dev-reader-end');

  /* --- اللوحة السفلية --- */
  console.log('\n== اللوحة السفلية ==');
  console.log(await ev(`(function(){var b=document.getElementById('rMenu'); if(!b) return 'no #rMenu'; b.click(); return 'clicked';})()`));
  await sleep(800);
  console.log(JSON.stringify(await ev(`(function(){
    var p=document.querySelector('.rpanel'), sc=document.querySelector('.rpscrim');
    var r=p?__rect(p):null, de=document.documentElement;
    return {
      panelTop: r? r.y : null, panelH: r? r.h : null,
      panelBottomAtViewport: r? (r.b >= de.clientHeight-2) : null,
      visible: r? (r.y < de.clientHeight) : null,
      scrimOn: sc? sc.classList.contains('on') : null,
      scrimVis: sc? getComputedStyle(sc).visibility : null,
      head: document.querySelector('.rphead')? document.querySelector('.rphead').textContent.trim().slice(0,40) : null,
      inputMode: document.querySelector('.rpanel input')? document.querySelector('.rpanel input').getAttribute('inputmode') : null,
      fontBtns: document.querySelectorAll('.rpanel [data-fs]').length
    };
  })()`), null, 1));
  await shot('dev-panel');

  /* --- العودة للرئيسية: هل ظهرت بطاقة «أكمل القراءة»؟ --- */
  await ev(`(function(){var c=document.querySelector('.rpclose'); if(c)c.click(); else document.querySelector('.rpscrim').click();})()`);
  await sleep(400);
  console.log('\n== الرئيسية بعد القراءة ==');
  await c.send('Page.navigate', { url: 'https://localhost/index.html' });
  await sleep(2400);
  await ev(RECT);
  console.log(JSON.stringify(await ev(`(function(){
    var w=document.getElementById('contWrap');
    var card=w? w.querySelector('a.cont'):null;
    var last=null; try{ last=JSON.parse(localStorage.getItem('ti_last')); }catch(e){}
    return {
      last: last,
      href: card? card.getAttribute('href') : null,
      cardTitle: card? (card.querySelector('b')||{}).textContent : null,
      cardSub: card? (card.querySelector('em')||{}).textContent : null,
      cardH: card? __rect(card).h : 0
    };
  })()`), null, 1));
  await shot('dev-home-cont');

  const errs = c.evs.filter((e) => e.method === 'Runtime.exceptionThrown')
    .filter((e) => !/__TI|__R/.test(JSON.stringify(e.params.exceptionDetails)));
  console.log(errs.length
    ? '\n⚠ أخطاء JS في التطبيق:\n' + errs.map((e) => '  ' + ((e.params.exceptionDetails.exception && e.params.exceptionDetails.exception.description) || e.params.exceptionDetails.text)).join('\n')
    : '\n✔ لا أخطاء JS في التطبيق');
  c.close();
  process.exit(0);
})().catch((e) => { console.error('✗', e.message); process.exit(1); });
