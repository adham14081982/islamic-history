/* فحص ثبات الترقيم على الجهاز: يعيد التحميل ٤ مرات ويطبع الحالة */
const fs = require('fs');
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const out = [];
  for (let i = 0; i < 4; i++) {
    const list = await (await fetch('http://127.0.0.1:9333/json/list')).json();
    const t = list.find(x => x.type === 'page');
    const ws = new WebSocket(t.webSocketDebuggerUrl.replace('127.0.0.1', 'localhost'));
    let id = 0; const pend = new Map();
    ws.addEventListener('message', ev => { const m = JSON.parse(ev.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); } });
    await new Promise(r => ws.addEventListener('open', r));
    const send = (m, p) => new Promise(res => { const j = ++id; pend.set(j, res); ws.send(JSON.stringify({ id: j, method: m, params: p || {} })); });
    await send('Runtime.enable');
    await send('Runtime.evaluate', { expression: "location.href='https://localhost/seerah.html?n=" + Date.now() + "'" });
    await sleep(5000);
    const r = await send('Runtime.evaluate', {
      returnByValue: true,
      expression: `JSON.stringify({
        dbg: document.body.getAttribute('data-dbg'),
        plan: (function(){try{var k=Object.keys(localStorage).filter(function(x){return x.indexOf('ti_plan_')===0});return k.map(function(x){return x+'='+JSON.parse(localStorage[x]).pages.length})}catch(e){return 'err'}})(),
        font: (function(){try{return document.fonts.check('1em Amiri')}catch(e){return 'n/a'}})()
      })`
    });
    console.log(i, r.result.result.value);
    out.push(r.result.result.value);
    ws.close();
    await sleep(500);
  }
  process.exit(0);
})();
