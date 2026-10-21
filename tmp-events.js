const sleep = ms => new Promise(r=>setTimeout(r,ms));
(async()=>{
  const list = await (await fetch('http://127.0.0.1:9333/json/list')).json();
  const t = list.find(x=>x.type==='page');
  const ws = new WebSocket(t.webSocketDebuggerUrl.replace('127.0.0.1','localhost'));
  let id=0; const pend=new Map();
  ws.addEventListener('message',ev=>{const m=JSON.parse(ev.data); if(m.id&&pend.has(m.id)){pend.get(m.id)(m);pend.delete(m.id);}});
  await new Promise(r=>ws.addEventListener('open',r));
  const send=(m,p)=>new Promise(res=>{const i=++id;pend.set(i,res);ws.send(JSON.stringify({id:i,method:m,params:p||{}}));});
  await send('Runtime.evaluate',{expression:`window.__ev=[];['pointerdown','pointerup','pointermove','touchstart','touchend','click','keydown'].forEach(function(t){window.addEventListener(t,function(e){window.__ev.push(t+':'+(e.pointerType||'')+':'+Math.round(e.clientX||0)+':'+Math.round(e.clientY||0))},true)});1`});
  await sleep(4000);
  const r=await send('Runtime.evaluate',{returnByValue:true,expression:"JSON.stringify({ev:window.__ev.slice(0,20),n:window.__ev.length,dbg:document.body.getAttribute('data-dbg')})"});
  console.log(r.result.result.value);
  ws.close(); process.exit(0);
})();
