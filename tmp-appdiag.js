const sleep = ms => new Promise(r=>setTimeout(r,ms));
(async()=>{
  const list = await (await fetch('http://127.0.0.1:9333/json/list')).json();
  const t = list.find(x=>x.type==='page');
  console.log('page:', t.url);
  const ws = new WebSocket(t.webSocketDebuggerUrl); let id=0; const pend=new Map(); const logs=[];
  ws.addEventListener('message',ev=>{const m=JSON.parse(ev.data);
    if(m.id&&pend.has(m.id)){pend.get(m.id)(m);pend.delete(m.id);}
    if(m.method==='Runtime.consoleAPICalled') logs.push('CONSOLE: '+m.params.args.map(a=>a.value||a.description).join(' '));
    if(m.method==='Runtime.exceptionThrown') logs.push('EXC: '+JSON.stringify(m.params.exceptionDetails).slice(0,400));
  });
  await new Promise(r=>ws.addEventListener('open',r));
  const send=(m,p)=>new Promise(res=>{const i=++id;pend.set(i,res);ws.send(JSON.stringify({id:i,method:m,params:p||{}}));});
  await send('Runtime.enable');
  const r = await send('Runtime.evaluate',{returnByValue:true,expression:`JSON.stringify({
    book: !!document.getElementById('book'),
    stage: !!document.getElementById('rStage'),
    pages: document.querySelectorAll('.rpage').length,
    dbg: document.body.getAttribute('data-dbg'),
    ready: document.body.className,
    bodyH: document.body.clientHeight,
    stageRect: document.getElementById('rStage') ? JSON.stringify(document.getElementById('rStage').getBoundingClientRect()) : null,
    err: window.__lastErr || null
  })`});
  console.log(r.result.result.value);
  console.log(logs.slice(-10).join('\n'));
  ws.close(); process.exit(0);
})().catch(e=>{console.error(e);process.exit(1);});
