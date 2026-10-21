const { spawn } = require('child_process');
const path = require('path'), os = require('os'), fs = require('fs');
const EDGE = 'C://Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const root = __dirname; const PORT = 9338;
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'edge-d5-'));
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
  await sleep(2500);
  const r=await send('Runtime.evaluate',{returnByValue:true,expression:`(function(){
    var el=__R.units[1].blocks[0];
    var h=__t.listHost(el);
    var out={kind:__t.kindOf(el), hostTag:h.tagName+'.'+h.className, kids:h.children.length,
      total:__t.measureOne(el), ch:__R.ch, blocks:__R.units[1].blocks.length};
    var sp=__t.splitList(el,0,h.children.length,__R.ch);
    out.split= sp? sp.map(function(x){return x.d.k+':'+x.d.a+'-'+x.d.b+' h='+__t.measureOne(x.node)}) : null;
    return JSON.stringify(out);})()`});
  console.log(JSON.stringify(r.result));
  ws.close(); proc.kill(); process.exit(0);
})().catch(e=>{console.error(e);proc.kill();process.exit(1);});
