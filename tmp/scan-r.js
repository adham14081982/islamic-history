const { spawn } = require('child_process');
const path = require('path'), os = require('os'), fs = require('fs');
const EDGE = 'C://Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const root = __dirname; const PORT = 9355;
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'edge-sc-'));
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
  var W=+(process.argv[2]||390),H=+(process.argv[3]||844); await send('Emulation.setDeviceMetricsOverride',{width:W,height:H,deviceScaleFactor:2,mobile:true});
  await send('Page.navigate',{url:'file:///'+path.join(root,'rashidun.html').replace(/\\/g,'/').replace(/ /g,'%20')});
  await sleep(4000);
  const total = (await send('Runtime.evaluate',{returnByValue:true,expression:'__R.total'})).result.result.value;
  let bad=[], tb=0, maxOver=0;
  for (let n=0;n<total;n++){
    await send('Runtime.evaluate',{expression:'__go('+n+')'});
    await sleep(60);
    const r=await send('Runtime.evaluate',{returnByValue:true,expression:`(function(){
      var p=document.querySelector('.rpage[data-n="'+${n}+'"]'); if(!p) return 'missing';
      var b=p.querySelector('.rbody');
      var tw=0; p.querySelectorAll('.tblwrap').forEach(function(w){ tw=Math.max(tw, w.scrollWidth-w.clientWidth); });
      return JSON.stringify({o:b.scrollHeight-b.clientHeight, t:tw, tb:p.querySelectorAll('.tblwrap').length});
    })()`});
    const v=JSON.parse(r.result.result.value);
    if (v==='missing') { bad.push(n+':missing'); continue; }
    if (v.tb) tb++;
    if (v.o>4) { bad.push((n+1)+':over'+v.o); maxOver=Math.max(maxOver,v.o); }
    if (v.t>1) bad.push((n+1)+':tblX'+v.t);
  }
  console.log(JSON.stringify({total, tablePages:tb, bad:bad.slice(0,25), nbad:bad.length, maxOver}));
  ws.close(); proc.kill(); process.exit(0);
})().catch(e=>{console.error(e);proc.kill();process.exit(1);});
