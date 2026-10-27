/* استعلام سريع عن حالة الصفحة الحالية على الجهاز.
   node tools/dev-q.js "<تعبير JS>"
*/
const { execSync } = require('child_process');

function connect(wsUrl) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(wsUrl);
    let id = 0;
    const pend = new Map();
    ws.onmessage = (e) => {
      const m = JSON.parse(e.data);
      if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); }
    };
    ws.onerror = reject;
    ws.onopen = () => resolve({
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

(async () => {
  const list = JSON.parse(execSync('curl -s http://127.0.0.1:9222/json/list', { encoding: 'utf8' }));
  const page = list.find((t) => t.type === 'page');
  const c = await connect(page.webSocketDebuggerUrl);
  await c.send('Runtime.enable');
  const expr = process.argv[2];
  if (process.argv[3] === '--nav') {
    await c.send('Page.navigate', { url: process.argv[3] });
  }
  const r = await c.send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
  if (r && r.exceptionDetails) {
    console.log('✗', (r.exceptionDetails.exception && r.exceptionDetails.exception.description) || r.exceptionDetails.text);
  } else {
    const v = r && r.result ? r.result.value : null;
    console.log(typeof v === 'string' ? v : JSON.stringify(v, null, 1));
  }
  c.close();
  process.exit(0);
})().catch((e) => { console.error('✗', e.message); process.exit(1); });
