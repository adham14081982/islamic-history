const sleep = ms => new Promise(r=>setTimeout(r,ms));
(async()=>{
  const list = await (await fetch('http://127.0.0.1:9333/json/list')).json();
  const t = list.find(x=>x.type==='page');
  const ws = new WebSocket(t.webSocketDebuggerUrl.replace('127.0.0.1','localhost'));
  let id=0; const pend=new Map();
  ws.addEventListener('message',ev=>{const m=JSON.parse(ev.data); if(m.id&&pend.has(m.id)){pend.get(m.id)(m);pend.delete(m.id);}});
  await new Promise(r=>ws.addEventListener('open',r));
  const send=(m,p,ms=8000)=>Promise.race([
    new Promise(res=>{const i=++id;pend.set(i,res);ws.send(JSON.stringify({id:i,method:m,params:p||{}}));}),
    sleep(ms).then(()=>({timeout:true}))
  ]);
  console.log('nav...');
  await send('Page.navigate',{url:'https://localhost/seerah.html'},8000);
  for (let i=0;i<10;i++){
    await sleep(2500);
    const r = await send('Runtime.evaluate',{returnByValue:true,expression:"JSON.stringify({p:document.querySelectorAll('.rpage').length,dbg:document.body.getAttribute('data-dbg'),cls:document.body.className,vw:innerWidth,vh:innerHeight})"},5000);
    if (r.timeout) { console.log(i*2.5+'s: TIMEOUT (main thread busy)'); continue; }
    console.log((i*2.5)+'s:', r.result && r.result.result && r.result.result.value);
  }
  ws.close(); process.exit(0);
})().catch(e=>{console.error('ERR',e.message);process.exit(1);});
