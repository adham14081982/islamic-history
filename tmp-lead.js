const { spawn } = require('child_process');
const path = require('path'), os = require('os'), fs = require('fs');
const EDGE = 'C://Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const root = __dirname; const PORT = 9344;
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'edge-ld-'));
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
  await send('Page.navigate',{url:'file:///'+path.join(root,'seerah.html').replace(/\\/g,'/').replace(/ /g,'%20')+'?p=31'});
  await sleep(3500);
  const r=await send('Runtime.evaluate',{returnByValue:true,expression:`(function(){
    var p=document.querySelector('.rpage[data-n="30"]'); if(!p) return 'no page';
    var lead=p.querySelector('.lead');
    if(!lead) return 'no lead';
    var d=lead.querySelector('.drop');
    var dr=d?d.getBoundingClientRect():null;
    var pr=lead.getBoundingClientRect();
    return JSON.stringify({html:lead.innerHTML.slice(0,120), drop:d?d.textContent:null,
      dropRect:dr?[Math.round(dr.left),Math.round(dr.right),Math.round(dr.width)]:null,
      leadRect:[Math.round(pr.left),Math.round(pr.right)],
      color:d?getComputedStyle(d).color:null, fs:d?getComputedStyle(d).fontSize:null, float:d?getComputedStyle(d).cssFloat:null});
  })()`});
  console.log(r.result.result.value);
  ws.close(); proc.kill(); process.exit(0);
})().catch(e=>{console.error(e);proc.kill();process.exit(1);});
