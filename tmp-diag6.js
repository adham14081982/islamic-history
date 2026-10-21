const { spawn } = require('child_process');
const path = require('path'), os = require('os'), fs = require('fs');
const EDGE = 'C://Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const root = __dirname; const PORT = 9339;
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'edge-d6-'));
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
  await send('Page.navigate',{url:'file:///'+path.join(root,'seerah.html').replace(/\\/g,'/').replace(/ /g,'%20')});
  await sleep(2600);
  const r=await send('Runtime.evaluate',{returnByValue:true,expression:`(function(){
    var k=Object.keys(localStorage).filter(function(x){return x.indexOf('ti_plan_')===0})[0];
    var pl=JSON.parse(localStorage.getItem(k));
    var tbp=[], kbp=[];
    pl.pages.forEach(function(p,i){ p.items.forEach(function(it){ if(it.d.k==='tb') tbp.push(i+1); if(it.d.k==='kb') kbp.push(i+1); }); });
    return JSON.stringify({key:k,total:pl.pages.length,tb:tbp.slice(0,10),kb:kbp.slice(0,10),chaps:pl.chaps.map(function(c){return c.n+':'+c.page}).slice(0,6)});})()`});
  console.log(r.result.result.value);
  ws.close(); proc.kill(); process.exit(0);
})().catch(e=>{console.error(e);proc.kill();process.exit(1);});
