const { spawn } = require('child_process');
const path = require('path'), os = require('os'), fs = require('fs');
const EDGE = 'C://Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const root = __dirname; const PORT = 9340;
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'edge-d7-'));
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
  await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:2,mobile:true});
  await send('Page.navigate',{url:'file:///'+path.join(root,'seerah.html').replace(/\\/g,'/').replace(/ /g,'%20')+'?p=5'});
  await sleep(2600);
  const r=await send('Runtime.evaluate',{returnByValue:true,expression:`(function(){
    var o={links:Array.prototype.slice.call(document.querySelectorAll('.toclist a')).slice(0,4).map(function(a){return a.getAttribute('href')+' = '+a.textContent.replace(/\s+/g,' ').trim()})};
    o.rendered={};
    document.querySelectorAll('.rpage').forEach(function(p){
      var n=+p.getAttribute('data-n')+1;
      if(p.querySelector('.part-h')) o.rendered['part@'+n]=p.querySelector('.part-h h2').textContent;
      if(p.querySelector('.ch3-h')) o.rendered['ch@'+n]=p.querySelector('.ch3-h h3').textContent.trim();
    });
    return JSON.stringify(o);})()`});
  console.log(r.result.result.value);
  ws.close(); proc.kill(); process.exit(0);
})().catch(e=>{console.error(e);proc.kill();process.exit(1);});
