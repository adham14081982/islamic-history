const fs=require('fs');
const sleep = ms => new Promise(r=>setTimeout(r,ms));
(async()=>{
  const target = +(process.argv[2]||2), out = process.argv[3]||'shots/app.png';
  const list = await (await fetch('http://127.0.0.1:9333/json/list')).json();
  const t = list.find(x=>x.type==='page');
  const ws = new WebSocket(t.webSocketDebuggerUrl.replace('127.0.0.1','localhost'));
  let id=0; const pend=new Map();
  ws.addEventListener('message',ev=>{const m=JSON.parse(ev.data); if(m.id&&pend.has(m.id)){pend.get(m.id)(m);pend.delete(m.id);}});
  await new Promise(r=>ws.addEventListener('open',r));
  const send=(m,p)=>new Promise(res=>{const i=++id;pend.set(i,res);ws.send(JSON.stringify({id:i,method:m,params:p||{}}));});
  await send('Page.enable');
  for (let attempt=0; attempt<5; attempt++){
    await send('Runtime.evaluate',{expression:"location.href='https://localhost/seerah.html?p="+target+"'"});
    await sleep(1500);
    await send('Runtime.evaluate',{expression:"var s=document.getElementById('rStage'); if(s) s.style.pointerEvents='none'; document.body.style.pointerEvents='none'; 1"});
    await sleep(300);
    const r=await send('Runtime.evaluate',{returnByValue:true,expression:"document.body.getAttribute('data-dbg')"});
    const dbg = r.result.result.value||'';
    const cur = +(dbg.match(/cur=(\d+)/)||[0,-1])[1];
    console.log('attempt', attempt, dbg);
    if (cur === target-1 || (target===1 && cur===0)) {
      const shot = await send('Page.captureScreenshot',{format:'png'});
      fs.writeFileSync(out, Buffer.from(shot.result.data,'base64'));
      console.log('saved', out);
      break;
    }
  }
  ws.close(); process.exit(0);
})();
