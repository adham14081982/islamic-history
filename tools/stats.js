// إحصاءات المحتوى: node tools/stats.js
const fs=require('fs'),path=require('path');
const dir=require('path').join(__dirname,'..','data','pages');const rows=[];let T={parts:0,ch:0,words:0,paras:0,chars:0};
for(const f of fs.readdirSync(dir).filter(x=>x.endsWith('.json')).sort()){
  const p=JSON.parse(fs.readFileSync(path.join(dir,f),'utf8'));
  let ch=0,words=0,chars=0,paras=0,min=1e9,max=0,out=0,tbl=0,quote=0,key=0,src=0,noSrc=0;
  for(const pt of (p.parts||[])) for(const c of (pt.chapters||[])){ ch++;
    if(c.tbl)tbl++; if(c.quote)quote++; if((c.key||[]).length)key++;
    if((c.src||[]).length)src++; else noSrc++;
    for(const t of (c.p||[])){const s=String(t),w=s.trim().split(/\s+/).length,c2=s.length;
      chars+=c2;words+=w;paras++;if(c2<min)min=c2;if(c2>max)max=c2;if(c2<330||c2>1200)out++;}
  }
  rows.push({f,parts:(p.parts||[]).length,ch,words,paras,avg:paras?Math.round(chars/paras):0,min:min===1e9?0:min,max,out,tbl,quote,key,src,noSrc,chAvg:ch?Math.round(words/ch):0});
  T.parts+=(p.parts||[]).length;T.ch+=ch;T.words+=words;T.paras+=paras;T.chars+=chars;
}
console.log('ملف'.padEnd(20)+'أجزاء فصول كلمات فقرة متوسط حرف/ف نص/فصل');
for(const r of rows) console.log(`${r.f.padEnd(20)}${String(r.parts).padStart(3)} ${String(r.ch).padStart(4)} ${String(r.words).padStart(6)} ${String(r.paras).padStart(4)} ${String(r.avg).padStart(5)} ${String(r.chAvg).padStart(6)}  out:${r.out} tbl:${r.tbl} q:${r.quote} key:${r.key} src:${r.src}/${r.noSrc}`);
console.log('—'.repeat(72));
console.log(`المجموع: ${T.parts} جزء · ${T.ch} فصل · ${T.words} كلمة · ${T.paras} فقرة · متوسط الفقرة ${Math.round(T.chars/T.paras)} حرف · متوسط الفصل ${Math.round(T.words/T.ch)} كلمة`);
console.log(`مجموع الأحرف: ${T.chars} · تقدير صفحات A4 (250 كلمة): ${Math.round(T.words/250)}`);
