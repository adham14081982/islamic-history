(async()=>{
  const list = await (await fetch('http://127.0.0.1:9333/json/list')).json();
  const t = list.find(x=>x.type==='page');
  const url = t.webSocketDebuggerUrl.replace('127.0.0.1','localhost');
  console.log('ws:', url);
  const ws = new WebSocket(url);
  ws.addEventListener('open',()=>{ console.log('OPEN'); ws.send(JSON.stringify({id:1,method:'Runtime.evaluate',params:{expression:'1+1',returnByValue:true}})); });
  ws.addEventListener('error',e=>console.log('WSERR', e.message||e.type));
  ws.addEventListener('close',e=>console.log('CLOSE', e.code, e.reason));
  ws.addEventListener('message',ev=>console.log('MSG', String(ev.data).slice(0,300)));
  setTimeout(()=>{ console.log('done'); process.exit(0); }, 6000);
})();
