const sleep = ms => new Promise(r=>setTimeout(r,ms));
(async()=>{
  const list = await (await fetch('http://127.0.0.1:9333/json/list')).json();
  const t = list.find(x=>x.type==='page');
  console.log('url:', t.url, '| title:', t.title);
  const ws = new WebSocket(t.webSocketDebuggerUrl); let id=0; const pend=new Map(); const logs=[];
  ws.addEventListener('message',ev=>{const m=JSON.parse(ev.data);
    if(m.id&&pend.has(m.id)){pend.get(m.id)(m);pend.delete(m.id);}
    if(m.method==='Runtime.consoleAPICalled') logs.push('C: '+m.params.args.map(a=>a.value||a.description).join(' '));
    if(m.method==='Runtime.exceptionThrown') logs.push('E: '+(m.params.exceptionDetails.exception&&m.params.exceptionDetails.exception.description||m.params.exceptionDetails.text));
  });
  await new Promise(r=>ws.addEventListener('open',r));
  const send=(m,p)=>new Promise(res=>{const i=++id;pend.set(i,res);ws.send(JSON.stringify({id:i,method:m,params:p||{}}));});
  await send('Runtime.enable');
  await sleep(300);
  const r = await send('Runtime.evaluate',{returnByValue:true,expression:"(function(){var b=document.getElementById('book');var s=document.getElementById('rStage');return JSON.stringify({book:!!b,units:b?JSON.parse(b.textContent).units.length:-1,stage:!!s,pages:document.querySelectorAll('.rpage').length,dbg:document.body.getAttribute('data-dbg'),cls:document.body.className,inner:(document.body.innerText||'').slice(0,80)})})()"});
  console.log('eval:', JSON.stringify(r.result).slice(0,600));
  console.log(logs.join('\n'));
  ws.close(); process.exit(0);
})().catch(e=>{console.error('ERR',e.message);process.exit(1);});
