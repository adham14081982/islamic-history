const { spawn } = require('child_process');
const path = require('path'), os = require('os'), fs = require('fs');
const EDGE = 'C://Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const root = __dirname; const PORT = 9343;
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'edge-sm-'));
const proc = spawn(EDGE, ['--headless=new','--disable-gpu','--hide-scrollbars','--no-first-run',
 '--remote-debugging-port='+PORT,'--user-data-dir='+profile,'about:blank'], {stdio:'ignore'});
const sleep = ms => new Promise(r=>setTimeout(r,ms));
(async()=>{
  let t; for(let i=0;i<60&&!t;i++){try{const j=await(await fetch('http://127.0.0.1:'+PORT+'/json/list')).json();t=j.find(x=>x.type==='page');}catch(e){} if(!t)await sleep(250);}
  const ws=new WebSocket(t.webSocketDebuggerUrl); let id=0; const pend=new Map();
  ws.addEventListener('message',ev=>{const m=JSON.parse(ev.data); if(m.id&&pend.has(m.id)){pend.get(m.id)(m);pend.delete(m.id);}});
  await new Promise(r=>ws.addEventListener('open',r));
  const send=(m,p)=>new Promise(res=>{const i=++id;pend.set(i,res);ws.send(JSON.stringify({id:i,method:m,params:p||{}}));});
  await send('Page.enable'); await send('Runtime.enable');
  await send('Emulation.setDeviceMetricsOverride',{width:360,height:712,deviceScaleFactor:2,mobile:true});
  const base='file:///'+path.join(root,'seerah.html').replace(/\\/g,'/').replace(/ /g,'%20');
  await send('Page.navigate',{url:base}); await sleep(2500);
  const tot = (await send('Runtime.evaluate',{returnByValue:true,expression:"(document.body.getAttribute('data-dbg')||'').match(/total=(\\d+)/)[1]"})).result.result.value;
  console.log('total', tot);
  const N=+tot, samples=[];
  for (let k=1;k<=12;k++) samples.push(Math.max(1, Math.round(N*k/12)));
  const bad=[];
  for (const n of samples){
    await send('Page.navigate',{url:base+'?p='+n}); await sleep(900);
    const r=await send('Runtime.evaluate',{returnByValue:true,expression:`(function(){
      var p=document.querySelector('.rpage[data-n="'+(${n}-1)+'"]'); if(!p) return JSON.stringify({miss:1});
      var b=p.querySelector('.rbody');
      var tw=0; p.querySelectorAll('.tblwrap').forEach(function(w){tw=Math.max(tw,w.scrollWidth-w.clientWidth)});
      return JSON.stringify({n:${n},len:(b.textContent||'').trim().length,over:b.classList.contains('rflow')?-1:b.scrollHeight-b.clientHeight,tw:tw});
    })()`});
    const v=JSON.parse(r.result.result.value);
    console.log(JSON.stringify(v));
    if (v.miss || v.len<10 || v.over>4 || v.tw>1) bad.push(v);
  }
  console.log('BAD:', JSON.stringify(bad));
  ws.close(); proc.kill(); process.exit(0);
})().catch(e=>{console.error(e);proc.kill();process.exit(1);});
