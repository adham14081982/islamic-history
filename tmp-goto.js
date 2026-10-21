const sleep = ms => new Promise(r=>setTimeout(r,ms));
(async()=>{
  const n = process.argv[2]||'2';
  const list = await (await fetch('http://127.0.0.1:9333/json/list')).json();
  const t = list.find(x=>x.type==='page');
  const ws = new WebSocket(t.webSocketDebuggerUrl.replace('127.0.0.1','localhost'));
  let id=0; const pend=new Map();
  ws.addEventListener('message',ev=>{const m=JSON.parse(ev.data); if(m.id&&pend.has(m.id)){pend.get(m.id)(m);pend.delete(m.id);}});
  await new Promise(r=>ws.addEventListener('open',r));
  const send=(m,p)=>new Promise(res=>{const i=++id;pend.set(i,res);ws.send(JSON.stringify({id:i,method:m,params:p||{}}));});
  await send('Runtime.evaluate',{expression:"location.href='https://localhost/seerah.html?p="+n+"'"});
  await sleep(2500);
  const r=await send('Runtime.evaluate',{returnByValue:true,expression:"document.body.getAttribute('data-dbg')"});
  console.log(r.result.result.value);
  ws.close(); process.exit(0);
})();
