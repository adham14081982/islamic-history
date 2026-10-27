/* فحص القارئ على الجهاز عبر WebView DevTools (بناء debug فقط).
   node tools/device-check.js search "إبراهيم"
   node tools/device-check.js eval "<js>"
   node tools/device-check.js info */
const PORT = 9222;
const cmd = process.argv[2] || 'info';
const arg = process.argv[3] || '';

(async () => {
  const list = await (await fetch('http://127.0.0.1:' + PORT + '/json/list')).json();
  const t = list.find(x => x.type === 'page');
  if (!t) throw new Error('لا يوجد WebView — هل التطبيق يعمل؟');
  const ws = new WebSocket(t.webSocketDebuggerUrl);
  await new Promise(r => { ws.onopen = r; });
  let id = 0; const pend = new Map(); const errs = [];
  ws.addEventListener('message', e => {
    const m = JSON.parse(e.data);
    if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); }
    else if (m.method === 'Runtime.exceptionThrown') errs.push(m.params.exceptionDetails.text);
  });
  const send = (me, pa) => new Promise(r => { const i = ++id; pend.set(i, r); ws.send(JSON.stringify({ id: i, method: me, params: pa || {} })); });
  const ev = async x => (await send('Runtime.evaluate', { expression: x, returnByValue: true, awaitPromise: true })).result.result.value;
  await send('Runtime.enable');

  if (cmd === 'info') {
    console.log(JSON.stringify(await ev(`({
      url: location.pathname + location.search,
      total: window.__R ? window.__R.total : null,
      cur: window.__R ? window.__R.cur : null,
      ch: window.__R ? window.__R.ch : null,
      partial: window.__R ? window.__R.partial : null,
      pgdone: document.body.dataset.pgdone || '0',
      fonts: document.fonts.status,
      amiri: document.fonts.check('400 1em Amiri'),
      css: [...document.styleSheets].map(s => (s.href || 'inline')).join(','),
      tabs: document.querySelectorAll('.rtab').length
    })`), null, 1));
  } else if (cmd === 'search') {
    const q = arg || 'إبراهيم';
    const r = await ev(`new Promise(res => {
      const i = document.getElementById('q');
      if (!i) return res('لا يوجد حقل بحث');
      i.value = ${JSON.stringify(q)};
      i.dispatchEvent(new Event('input', { bubbles: true }));
      setTimeout(() => res(JSON.stringify({
        results: document.querySelectorAll('#sb .res').length,
        first: (document.querySelector('#sb .res b') || {}).textContent || ''
      })), 700);
    })`);
    console.log('بحث «' + q + '» → ' + r);
  } else {
    console.log(JSON.stringify(await ev(arg), null, 1));
  }
  console.log('أخطاء JS: ' + (errs.length ? errs.join(' | ') : 'لا شيء'));
  ws.close();
})().catch(e => { console.error('فشل: ' + e.message); process.exit(1); });
