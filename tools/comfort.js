/* تنسيقات راحة القراءة والزخرفة — تُضاف مرة واحدة */
const fs = require('fs');
const path = require('path');
const f = path.join(__dirname, '..', 'assets', 'app.css');
let s = fs.readFileSync(f, 'utf8');
if (s.includes('COMFORT')) { console.log('موجود مسبقاً'); process.exit(0); }

s += `

/* ==========================================================
   COMFORT — راحة القراءة والزخرفة
   ========================================================== */

/* عرض مريح للسطر: يمنع الإرهاق البصري */
main{max-width:760px}
.ch3 .ap,.ch3 .lead{max-width:100%}

/* سطر استهلالي كبير (حرف Headline) */
.ch3 .lead .drop{float:right;font-family:'Amiri',serif;font-size:3.4rem;line-height:.82;
  color:var(--c);margin:.18rem .45rem 0 0;font-weight:700;opacity:.9;
  border-right:3px solid var(--gold);padding:.1rem .45rem 0 0}

/* فاصل زخرفي بين الأقسام */
.porn{width:280px;max-width:80%;height:38px;margin:0 auto .6rem;display:block}
.porn .ln{stroke:var(--gold);stroke-width:1.1;fill:none;opacity:.7}
.porn .dm{stroke:var(--gold);stroke-width:.9;fill:none;opacity:.5}

/* فهرس الأقسام داخل رأس القسم */
.part-list{display:flex;flex-wrap:wrap;gap:.4rem;justify-content:center;margin-top:.7rem}
.part-list a{font-size:.76rem;text-decoration:none;color:var(--muted);
  border:1px solid var(--line);border-radius:50px;padding:.2rem .7rem;transition:.2s}
.part-list a:hover{color:var(--c);border-color:var(--gold);background:rgba(184,148,47,.08)}

/* فهرس متشعّب */
.toclist>li{padding:0}
.toc-part{list-style:none;margin-bottom:.9rem}
.toc-part>b{display:inline-block;margin-left:.4rem}
.toc-part>a{font-weight:700;font-size:.98rem;color:var(--c);display:inline}
.toc-part>ul{list-style:none;margin:.35rem 0 0;padding-right:.9rem;
  border-right:1px dashed var(--line)}
.toc-part>ul>li{margin:0}
.toc-part>ul a{padding:.32rem .3rem;font-size:.88rem;border:0;gap:.45rem}
.toc-part>ul a i{width:6px;height:6px;border-radius:50%;background:var(--line);
  flex:0 0 auto;display:block;margin-top:.55rem}
.toc-part>ul a:hover i{background:var(--gold)}
.toc-part>li.here a,.toc-part>ul>li.here a{color:var(--c);background:rgba(184,148,47,.1)}
.toc-part>ul>li.here a i{background:var(--gold);box-shadow:0 0 0 3px rgba(184,148,47,.2)}

/* تنقّل بين الفصول */
.chnav{display:flex;gap:.5rem;align-items:stretch;margin-top:1.1rem;
  padding-top:.9rem;border-top:1px dashed var(--line)}
.chnav a{flex:1;background:transparent;border:1px solid var(--line);border-radius:12px;
  padding:.5rem .7rem;text-decoration:none;transition:.22s;min-width:0}
.chnav a:hover{border-color:var(--gold);background:rgba(184,148,47,.06)}
.chnav a.empty{visibility:hidden}
.chnav small{display:block;font-size:.66rem;color:var(--muted)}
.chnav b{display:block;font-size:.82rem;color:var(--c);line-height:1.5;
  white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.chnav .nx{text-align:left}
.chnav .nx b{white-space:normal}
.cn-pos{align-self:center;font-size:.7rem;color:var(--muted);white-space:nowrap;padding:0 .3rem}

/* عنوان الجدول */
.tblcap{font-family:'Amiri',serif;font-size:.95rem;color:var(--gold2);
  padding:.5rem .8rem;background:rgba(184,148,47,.07);font-weight:700}

/* شريط الفصل العائم */
.railbar{position:fixed;bottom:52px;right:0;left:0;z-index:69;pointer-events:none;
  display:flex;justify-content:center}
.railbar .rb{max-width:92%;background:var(--paper);border:1px solid var(--line);
  border-radius:50px;padding:.2rem .9rem;font-size:.7rem;color:var(--gold2);
  box-shadow:var(--shadow);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;
  max-height:1.7rem;line-height:1.7rem}

@media(max-width:560px){
  .ch3 .lead .drop{font-size:2.7rem}
  .chnav b{font-size:.76rem}
  .railbar{display:none}
}
`;

fs.writeFileSync(f, s, 'utf8');
console.log('تم إضافة تنسيقات الراحة والزخرفة');