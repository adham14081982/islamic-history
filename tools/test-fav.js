/* اختبار وظيفي للمفضلة والأوسمة في متصفح حقيقي (Edge headless + CDP).
   node tools/test-fav.js
   يتحقق من: ظهور قسم المفضلة، الحذف، زر 🔖 في القارئ، وفصل ti_fav عن ti_bookmarks،
   وقابلية نيل «تاج المؤرخ» بعدد الحقب الحالي (١١). */
const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const EDGE = process.env.EDGE_BIN || 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const root = path.join(__dirname, '..');
const PORT = 9371;
const sleep = ms => new Promise(r => setTimeout(r, ms));

let pass = 0, fail = 0;
function check(name, cond, extra) {
  if (cond) { pass++; console.log('✔ ' + name); }
  else { fail++; console.log('✘ ' + name + (extra !== undefined ? '  → ' + JSON.stringify(extra) : '')); }
}

(async () => {
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'edge-fav-'));
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
    ws.addEventListener('message', ev => {
      const m = JSON.parse(ev.data);
      if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); }
    });
    const send = (method, params) => new Promise(res => {
      const i = ++id; pend.set(i, res);
      ws.send(JSON.stringify({ id: i, method, params: params || {} }));
    });
    const ev = async expr => {
      const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
      if (r.result && r.result.exceptionDetails) throw new Error(r.result.exceptionDetails.text);
      return r.result && r.result.result ? r.result.result.value : undefined;
    };
    const go = async (page) => {
      await send('Page.navigate', { url: 'file:///' + path.join(root, page).replace(/\\/g, '/') });
      await sleep(1400);
    };

    await send('Page.enable');
    await send('Runtime.enable');
    await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 3, mobile: true });

    /* ١) حالة نظيفة */
    await go('index.html');
    await ev('localStorage.clear()');
    await go('index.html');
    check('الرئيسية بلا قسم مفضلة عند الفراغ',
      await ev('document.getElementById("favWrap").children.length === 0'));
    check('زر المفضلة محذوف من الرئيسية',
      await ev('!document.getElementById("favBtn")'));

    /* ٢) مفضلة محفوظة تظهر */
    await ev('localStorage.setItem("ti_fav", JSON.stringify(["seerah","ottoman"]))');
    await go('index.html');
    const rows = await ev('document.querySelectorAll("#favWrap .favrow").length');
    check('قسم المفضلة يعرض حقبتين', rows === 2, rows);
    check('أسماء الحقب ظاهرة', await ev('/السيرة|العثمانية/.test(document.getElementById("favWrap").textContent)'));

    /* ٣) الحذف يعمل ويحفظ */
    await ev('document.querySelector("#favWrap .favdel").click()');
    await sleep(250);
    const after = await ev('JSON.stringify([document.querySelectorAll("#favWrap .favrow").length, localStorage.getItem("ti_fav")])');
    check('الحذف يُنقص الصف ويحفظ', after === '[1,"[\\"ottoman\\"]"]', after);

    /* ٤) زر القارئ يكتب في ti_fav لا في ti_bookmarks */
    await ev('localStorage.setItem("ti_bookmarks","[]")');
    await go('seerah.html');
    await sleep(1800);
    check('زر المفضلة موجود في القارئ', await ev('!!document.getElementById("favBtn")'));
    check('حالة الزر غير مفعّلة (seerah محذوفة)', await ev('!document.getElementById("favBtn").classList.contains("on")'));
    await ev('document.getElementById("favBtn").click()');
    await sleep(250);
    const st = await ev('JSON.stringify([localStorage.getItem("ti_fav"), localStorage.getItem("ti_bookmarks"), document.getElementById("favBtn").classList.contains("on")])');
    check('النقر يضيف للمفضلة دون المساس بالإتمام', st === '["[\\"ottoman\\",\\"seerah\\"]","[]",true]', st);
    await ev('document.getElementById("favBtn").click()');
    await sleep(200);
    check('النقر الثاني يزيلها', await ev('JSON.parse(localStorage.getItem("ti_fav")).indexOf("seerah") < 0'));

    /* ٥) تاج المؤرخ صار قابلًا للنيل (١١ حقبة) */
    const eras = ['start', 'seerah', 'rashidun', 'umayyad', 'andalus', 'abbasid',
      'crusades', 'mamluk', 'ottoman', 'civilization', 'modern'];
    await ev('localStorage.setItem("ti_bookmarks", JSON.stringify(' + JSON.stringify(eras) + '))');
    await go('index.html');
    const onAll = await ev('document.querySelectorAll("#badges .bg.on").length');
    check('إتمام ١١ حقبة يمنح ١٢ وسمًا (مع التاج)', onAll === 12, onAll);
    await ev('localStorage.setItem("ti_bookmarks", JSON.stringify(' + JSON.stringify(eras.slice(0, 10)) + '))');
    await go('index.html');
    const onTen = await ev('document.querySelectorAll("#badges .bg.on").length');
    check('إتمام ١٠ حقب لا يمنح التاج', onTen === 10, onTen);

    /* ٦) قيمة تالفة في التخزين لا تُسقط الصفحة */
    await ev('localStorage.setItem("ti_bookmarks","{ليس JSON");localStorage.setItem("ti_progress","[[[")');
    await go('index.html');
    check('تخزين تالف لا يمنع رسم الأوسمة',
      await ev('!!document.querySelector("#badges .bg") && document.getElementById("bcnt").textContent.indexOf("٠") >= 0'));
  } finally {
    try { ws && ws.close(); } catch (e) { }
    try { proc.kill(); } catch (e) { }
  }
  console.log('\nالنتيجة: ' + pass + ' ناجح، ' + fail + ' فاشل');
  process.exit(fail ? 1 : 0);
})();
