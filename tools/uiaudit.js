/* قياسات تدقيق الواجهة: أبعاد الشريط والتبويبات والمسار + التباين + أهداف اللمس */
const { spawn } = require('child_process');
const fs = require('fs'), path = require('path'), os = require('os');
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const root = path.join(__dirname, '..');
const PORT = 9335;
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'edge-aud-'));
const proc = spawn(EDGE, ['--headless=new', '--disable-gpu', '--no-first-run',
  '--remote-debugging-port=' + PORT, '--user-data-dir=' + profile, 'about:blank'], { stdio: 'ignore' });
const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  let pg;
  for (let i = 0; i < 60 && !pg; i++) {
    try { const j = await (await fetch('http://127.0.0.1:' + PORT + '/json/list')).json(); pg = j.find(t => t.type === 'page'); } catch (e) { }
    if (!pg) await sleep(250);
  }
  const ws = new WebSocket(pg.webSocketDebuggerUrl);
  let id = 0; const pend = new Map();
  ws.addEventListener('message', ev => { const m = JSON.parse(ev.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); } });
  await new Promise(r => ws.addEventListener('open', r));
  const send = (method, params) => new Promise(res => { const i = ++id; pend.set(i, res); ws.send(JSON.stringify({ id: i, method, params: params || {} })); });
  await send('Page.enable'); await send('Runtime.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: 360, height: 760, deviceScaleFactor: 2, mobile: true });
  const url = f => 'file:///' + path.join(root, f).replace(/\\/g, '/').replace(/ /g, '%20');

  async function ev(expr) {
    const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
    if (r.result.exceptionDetails) return 'ERR ' + JSON.stringify(r.result.exceptionDetails.text);
    return r.result.result.value;
  }

  await send('Page.navigate', { url: url('rashidun.html') + '?p=4' });
  await sleep(4000);

  const out = await ev(`(function(){
    const R=s=>{const e=document.querySelector(s);if(!e)return null;const r=e.getBoundingClientRect();
      return {t:Math.round(r.top),h:Math.round(r.height),w:Math.round(r.width),l:Math.round(r.left)};};
    const cs=(s,p)=>{const e=document.querySelector(s);return e?getComputedStyle(e)[p]:null;};
    const tabs=document.getElementById('rTabs');
    const small=[...document.querySelectorAll('button,.ib,.rtab,.rnav,a')].map(e=>{
      const r=e.getBoundingClientRect();return {sel:e.className||e.id||e.tagName,w:Math.round(r.width),h:Math.round(r.height)};
    }).filter(o=>o.w>0&&o.h>0&&Math.min(o.w,o.h)<44);
    return JSON.stringify({
      vh: innerHeight,
      top: R('header.top'), tabs: R('#rTabs'), stage: R('#rStage'), page: R('.rpage'),
      foot: R('.rfoot'), brand: R('.rbrand'),
      pageInline: (document.querySelector('.rpage') || {}).style && document.querySelector('.rpage').style.height,
      ph: getComputedStyle(document.getElementById('rStage')).getPropertyValue('--ph'),
      pagePad: cs('.rpage', 'padding'), pageBorder: cs('.rpage', 'borderWidth'),
      tabsOverflow: tabs ? {scroll:tabs.scrollWidth, client:tabs.clientWidth, hidden:tabs.scrollWidth-tabs.clientWidth} : null,
      body: {fs: cs('.rbody','fontSize'), lh: cs('.rbody','lineHeight'), ta: cs('.rbody','textAlign')},
      leadFs: cs('.lead','fontSize'), citeFs: cs('blockquote cite','fontSize'),
      colors: {paper: cs('body','backgroundColor'), ink: cs('.rbody','color'), muted: (function(){const e=document.querySelector('.rfoot');return e?getComputedStyle(e).color:null})()},
      smallTargets: small.slice(0,12)
    },null,1);
  })()`);
  console.log(out);

  /* فحص الوضع النهاري في الرئيسية: هل الإجراء الأساسي فوق الطية؟ */
  await send('Page.navigate', { url: url('index.html') });
  await sleep(3500);
  const home = await ev(`(function(){
    const eras=[...document.querySelectorAll('a[href$=".html"]')].map(a=>{const r=a.getBoundingClientRect();return {t:Math.round(r.top),h:Math.round(r.height),txt:a.textContent.trim().slice(0,24)};});
    const hero=document.querySelector('.hero')||document.querySelector('main > *');
    const h=hero?hero.getBoundingClientRect():null;
    return JSON.stringify({vh:innerHeight, hero:h?{t:Math.round(h.top),h:Math.round(h.height)}:null, firstEra:eras[0]||null, erasCount:eras.length},null,1);
  })()`);
  console.log(home);

  ws.close(); proc.kill(); process.exit(0);
})().catch(e => { console.error(e); try { proc.kill(); } catch (_) { } process.exit(1); });
