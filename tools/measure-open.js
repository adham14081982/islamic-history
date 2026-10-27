/* قياس زمن فتح كل عصر في متصفح حقيقي (Edge headless) بمحاكاة جوال.
   يعطي لكل صفحة:
     ready  = من بدء التنقّل حتى ظهور أول صفحة قابلة للقراءة (body.rready)
     pgdone = من بدء التنقّل حتى اكتمال ترقيم الكتاب كله (body[data-pgdone])
     pages  = عدد الصفحات النهائي
     bytes  = حجم ملف HTML
   الاستخدام:
     node tools/measure-open.js            # كل الصفحات
     node tools/measure-open.js rashidun   # صفحة واحدة
     node tools/measure-open.js --runs=3   # ثلاث محاولات وأخذ الوسيط
   ملاحظة: يُشغّل ملفات الجذر (المولَّدة). لقياس نسخة www مرّر --www. */
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const EDGE = process.env.EDGE_BIN || 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const root = path.join(__dirname, '..');
const W = +(process.env.VW || 360), H = +(process.env.VH || 800), DPR = +(process.env.VDPR || 2), PORT = 9366;

const PAGES = ['pre-islamic', 'seerah', 'rashidun', 'umayyad', 'andalus',
  'abbasid', 'civilization', 'crusades', 'mamluk', 'ottoman', 'modern'];

const args = process.argv.slice(2);
const runs = +((args.find(a => a.startsWith('--runs=')) || '').split('=')[1] || 1);
const useWww = args.includes('--www');
const only = args.filter(a => !a.startsWith('--'))[0];

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function main() {
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'edge-measure-'));
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

    let id = 0; const pend = new Map(); const events = [];
    ws.addEventListener('message', ev => {
      const m = JSON.parse(ev.data);
      if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); }
      else if (m.method) events.push(m);
    });
    const send = (method, params) => new Promise(res => {
      const i = ++id; pend.set(i, res);
      ws.send(JSON.stringify({ id: i, method, params: params || {} }));
    });
    const evalJs = async expr => {
      const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
      return r.result && r.result.result ? r.result.result.value : undefined;
    };

    await send('Page.enable');
    await send('Runtime.enable');
    await send('Emulation.setDeviceMetricsOverride',
      { width: W, height: H, deviceScaleFactor: DPR, mobile: true });
    await send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });

    /* سكربت يُحقن قبل تحميل أي صفحة: يسجّل التوقيتات بنفسه */
    await send('Page.addScriptToEvaluateOnNewDocument', {
      source: `(() => {
        window.__T = { t0: performance.now(), ready: 0, pgdone: 0, pages: 0 };
        const mark = () => {
          const b = document.body;
          if (!b) return;
          if (!window.__T.ready && b.classList.contains('rready')) window.__T.ready = performance.now();
          if (!window.__T.pgdone && b.dataset.pgdone === '1') window.__T.pgdone = performance.now();
          const st = window.__PAGESTAT;
          if (st && st.total) window.__T.pages = st.total;
          /* احتياط: عدد الصفحات من تذييل الصفحة «٧ من ٣٤٢» */
          if (!window.__T.pages) {
            const f = document.querySelector('.rpfoot');
            const m = f && /\\u0645\\u0646\\s*([\\u0660-\\u0669\\d]+)/.exec(f.textContent || '');
            if (m) {
              const ar = '٠١٢٣٤٥٦٧٨٩';
              window.__T.pages = +m[1].replace(/[٠-٩]/g, d => ar.indexOf(d));
            }
          }
          if (window.__T.ready && (window.__T.pgdone || performance.now() > 12000)) {
            clearInterval(window.__TI);
          }
        };
        window.__TI = setInterval(mark, 10);
      })();`
    });

    const rows = [];
    const list = only ? PAGES.filter(p => p.includes(only)) : PAGES;

    for (const pid of list) {
      const rel = pid + '.html';
      const file = useWww ? path.join(root, 'mobile/app/www', rel) : path.join(root, rel);
      if (!fs.existsSync(file)) { console.log('!! مفقود ' + rel); continue; }
      const bytes = fs.statSync(file).size;
      const times = [];

      for (let k = 0; k < runs; k++) {
        await send('Page.navigate', { url: 'file:///' + file.replace(/\\/g, '/') });
        await sleep(120);
        /* لا خطة مخزَّنة: نقيس الترقيم من الصفر */
        await evalJs('try{localStorage.clear()}catch(e){}');
        await send('Page.navigate', { url: 'file:///' + file.replace(/\\/g, '/') });

        let t = null;
        for (let i = 0; i < 300; i++) {
          t = await evalJs('window.__T ? {r:window.__T.ready,p:window.__T.pgdone,n:window.__T.pages} : null');
          if (t && t.r && (t.p || i > 200)) break;
          await sleep(50);
        }
        if (t && t.r) times.push({ ready: Math.round(t.r), pgdone: Math.round(t.p || 0), pages: t.n || 0 });
      }
      times.sort((a, b) => a.ready - b.ready);
      const med = times[Math.floor(times.length / 2)] || { ready: -1, pgdone: -1, pages: 0 };
      rows.push({ pid, ...med, bytes });
      console.log(pid.padEnd(14) + String(med.ready).padStart(6) + ' ms' +
        ('   ترقيم كامل: ' + String(med.pgdone || '-').padStart(6) + ' ms') +
        ('   صفحات: ' + String(med.pages || '-').padStart(4)) +
        ('   HTML: ' + Math.round(bytes / 1024) + ' KB'));
    }

    const ok = rows.filter(r => r.ready > 0);
    if (ok.length) {
      const avg = Math.round(ok.reduce((a, r) => a + r.ready, 0) / ok.length);
      const mx = ok.reduce((a, r) => (r.ready > a.ready ? r : a), ok[0]);
      console.log('─'.repeat(72));
      console.log('المتوسط: ' + avg + ' ms   |   الأبطأ: ' + mx.pid + ' ' + mx.ready + ' ms');
      console.log('JSON ' + JSON.stringify(rows));
    }
  } finally {
    try { ws && ws.close(); } catch (e) { }
    try { proc.kill(); } catch (e) { }
    try { fs.rmSync(profile, { recursive: true, force: true }); } catch (e) { }
  }
}

main().catch(e => { console.error('فشل: ' + e.message); process.exit(1); });
