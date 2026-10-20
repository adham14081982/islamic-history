/* ===== مولّد موقع موسوعة تاريخ الإسلام =====
   يقرأ data/pages/*.json ويبني index.html + صفحة لكل حقبة */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const pagesDir = path.join(root, 'data', 'pages');
const css = fs.readFileSync(path.join(root, 'assets', 'app.css'), 'utf8');
const js = fs.readFileSync(path.join(root, 'assets', 'app.js'), 'utf8');

const files = fs.readdirSync(pagesDir).filter(f => f.endsWith('.json')).sort();
const pages = files.map(f => JSON.parse(fs.readFileSync(path.join(pagesDir, f), 'utf8')));
pages.sort((a, b) => a.order - b.order);

const ORN = `<svg class="orn" viewBox="0 0 260 22" fill="none">
  <path class="ln" d="M0 11h92M168 11h92"/>
  <path class="dm" d="M96 11l10-9 10 9-10 9zM144 11l10-9 10 9-10 9z"/>
  <circle class="ln" cx="130" cy="11" r="7"/><circle class="ln" cx="130" cy="11" r="3"/>
  <path class="ln" d="M8 5h26M8 17h26M226 5h26M226 17h26"/></svg>`;

/* زخارف الزوايا: أحجام ثابتة لا تتمدد مع الصفحة */
const CRN = (cls, d) => `<span class="crn ${cls}"><svg viewBox="0 0 26 26">
<path d="${d}"/><path d="${d}" transform="rotate(90 13 13)" opacity=".5"/></svg></span>`;
const CORNER = d =>
  CRN('tl', d) + CRN('tr', d) + CRN('bl', d) + CRN('br', d);
const FRAME_1 = CORNER('M1 9V4a3 3 0 0 1 3-3h5M1 5h4M5 1v4');
const FRAME_2 = CORNER('M1 8V3a2 2 0 0 1 2-2h5M1 4h3M4 1v3');

const DOME = `<svg viewBox="0 0 40 46" fill="none">
<path d="M4 42V22a16 16 0 0 1 32 0v20z" fill="none" stroke="var(--gold)" stroke-width="1.4" opacity=".45"/>
<path class="fill" d="M4 42V22a16 16 0 0 1 32 0v20z" fill="var(--gold)" opacity=".2"/></svg>`;

const HEAD = (title, desc) => `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<meta name="description" content="${desc}">
<title>${title}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Amiri:wght@400;700&family=Cairo:wght@300;400;600;700;900&display=swap" rel="stylesheet" media="print" onload="this.media='all'">
<style>
${css}
</style>
<link rel="icon" type="image/png" sizes="32x32" href="favicon_32.png">
<link rel="icon" type="image/png" sizes="64x64" href="favicon_64.png">
<link rel="shortcut icon" href="favicon.ico">
<link rel="apple-touch-icon" sizes="180x180" href="apple-touch-icon_180.png">
<meta name="theme-color" content="#B8942F">
</head>`;

const TOPBAR = (pageId) => `<header class="top">
  <a class="brand" href="index.html">📜 موسوعة تاريخ الإسلام</a>
  <div class="tools">
    <span class="dome" title="نسبة إكمالك للصفحة">${DOME}</span>
    <button class="ib" onclick="openSearch()" title="بحث">🔍</button>
    <button class="ib" id="favBtn" title="حفظ">☆</button>
    <button class="ib" id="themeBtn" title="الوضع الليلي">🌙</button>
  </div>
</header>`;

const PANEL = `<div class="ov" id="ov" onclick="closeSearch()"></div>
<div class="panel" id="panel">
  <div class="sh">
    <input id="q" placeholder="ابحث في هذه الصفحة..." oninput="doSearch(this.value)">
    <button class="ib" onclick="closeSearch()">✕</button>
  </div>
  <div class="sb" id="sb"><p style="text-align:center;color:var(--muted);padding:3rem 1rem">
    اكتب حرفين على الأقل للبحث داخل هذه الصفحة</p></div>
</div>`;

const SWORD = `<svg viewBox="0 0 118 11" fill="none">
  <path d="M2 5.5L104 3.2 116 5.5 104 7.8z" fill="none" stroke="var(--gold)" stroke-width="1" opacity=".55"/>
  <path class="bl" d="M2 5.5L104 3.2 116 5.5 104 7.8z"/>
  <rect x="2" y="3" width="4" height="5" rx="1" fill="var(--gold)" opacity=".8"/></svg>`;

const PROGRESSBAR = `<div class="topbar"><i></i></div>`;

const esc = s => String(s == null ? '' : s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/* تحويل الأرقام اللاتينية إلى هندية: يمنع انعكاس التواريخ في اتجاه النص */
const AR_DIG = s => String(s == null ? '' : s)
  .replace(/\d/g, d => '٠١٢٣٤٥٦٧٨٩'[d]);
const ar = s => esc(AR_DIG(s));

/* ---------------- صفحة حقبة ---------------- */
function buildPage(p) {
  const i = pages.findIndex(x => x.id === p.id);
  const prev = pages[i - 1], next = pages[i + 1];

  const timeline = (p.timeline || []).map((t, k) =>
    `<button class="tli" data-target="ev${k}"><b>${ar(t.y)}</b><span>${esc(t.e)}</span></button>`).join('');

  const events = (p.events || []).map((e, k) => `<article class="ev" id="ev${k}">
      <div class="ev-head"><span class="ev-y">${ar(e.y)}</span><h3>${esc(e.t)}</h3></div>
      <p>${esc(e.d)}</p>
      ${e.r ? `<div class="res">${esc(e.r)}</div>` : ''}
    </article>`).join('');

  const people = (p.people || []).map(x =>
    `<div class="pc"><b>${esc(x.n)}</b><span>${esc(x.r)}</span></div>`).join('');

  const outs = (p.outcomes || []).map(x => `<li>${esc(x)}</li>`).join('');
  const src = (p.sources || []).map(x =>
    `<li><cite>${esc(x.a)}</cite> — ${esc(x.t)}${x.n ? ' (' + esc(x.n) + ')' : ''}</li>`).join('');

  return `${HEAD(p.n + ' | موسوعة تاريخ الإسلام', p.intro.slice(0, 150))}
<body data-page="${p.id}">
${TOPBAR(p.id)}
${TOPBAR(p.id)}
${PROGRESSBAR}
<main>
  <div class="crumbs"><a href="index.html">الرئيسية</a> ‹ <span>${esc(p.n)}</span></div>

  <section class="hero frame" style="--c:${esc(p.c)}">
    ${FRAME_1}
    <div class="ic">${p.ic}</div>
    <h1>${esc(p.n)}</h1>
    <div class="period">${ar(p.period)}${p.dur ? ' · ' + ar(p.dur) : ''}</div>
    <p class="intro">${esc(p.intro)}</p>
    ${ORN}
    <div class="stats" style="display:flex;justify-content:center;gap:1.4rem;flex-wrap:wrap;font-size:.78rem;color:var(--muted)">
      <span><b style="color:${esc(p.c)};font-size:1.3rem">${(p.events || []).length}</b> حدثاً</span>
      <span><b style="color:${esc(p.c)};font-size:1.3rem">${(p.people || []).length}</b> شخصية</span>
      <span><b style="color:${esc(p.c)};font-size:1.3rem">${(p.timeline || []).length}</b> محطة زمنية</span>
    </div>
  </section>

  <h2 class="sec">الخط الزمني <span class="n">اسحب أفقياً للتنقل</span></h2>
  <div class="tlwrap"><div class="tl" id="tl">${timeline}</div></div>
  ${ORN}

  <h2 class="sec">أهم الأحداث <span class="n">${(p.events || []).length} حدثاً</span></h2>
  <section>${events}</section>

  <h2 class="sec">أهم الشخصيات</h2>
  <section><div class="people">${people}</div></section>

  <h2 class="sec">النتائج والآثار</h2>
  <section><ul class="outs">${outs}</ul></section>

  <div class="src">
    <h2 class="sec" style="margin-top:0">المصادر والمراجع</h2>
    <ul>${src}</ul>
  </div>

  <nav class="pager">
    ${prev ? `<a class="prev" href="${prev.file}"><small>← الحقبة السابقة</small><b>${prev.ic} ${esc(prev.n)}</b></a>`
      : `<a class="prev empty"></a>`}
    ${next ? `<a class="next" href="${next.file}"><small>الحقبة التالية →</small><b>${next.ic} ${esc(next.n)}</b></a>`
      : `<a class="next empty"></a>`}
  </nav>
</main>
<div class="sword">${SWORD}<span>القراءة ٠٪</span></div>
${PANEL}
<script>
${js}
</script>
</body>
</html>`;
}

/* ---------------- الصفحة الرئيسية ---------------- */
function buildHome() {
  const cards = pages.map(p => `<a class="ec" style="--c:${esc(p.c)}" href="${p.file}">
      <div class="ic">${p.ic}</div>
      <b>${esc(p.n)}</b>
      <small>${ar(p.period)}</small>
      <div class="pg"><i id="pg-${p.id}"></i></div>
      <small style="margin-top:.35rem;color:${esc(p.c)};font-weight:700">${(p.events || []).length} حدثاً</small>
      <span class="done" id="dn-${p.id}">★</span>
    </a>`).join('');

  const strip = pages.map(p => `<a class="btl" style="--c:${esc(p.c)}" href="${p.file}">
      <span class="ic">${p.ic}</span>
      <span class="nm">${esc(p.n)}</span>
      <span class="yr">${ar(p.period)}</span>
      <span class="st" id="st-${p.id}"></span>
    </a>`).join('');

  const BI = { start: '🌱', prophets: '📜', seerah: '🕊️', rashidun: '⚔️', umayyad: '🏛️',
    andalus: '🏰', abbasid: '📚', crusades: '🛡️', mamluk: '🐎', ottoman: '🕌',
    civilization: '🔬', modern: '🕰️', all: '👑' };
  const BN = { start: 'نبت الطريق', prophets: 'وسام النبوة', seerah: 'وسام الرحمة',
    rashidun: 'وسام الفاروق', umayyad: 'وسام البناء', andalus: 'وسام الأندلس',
    abbasid: 'وسام الفجر', crusades: 'وسام حطين', mamluk: 'وسام النصر',
    ottoman: 'وسام السلطان', civilization: 'وسام العقل', modern: 'وسام التاريخ', all: 'تاج المؤرخ' };
  const BD = { start: 'ابدأ أول حقبة', prophets: 'الأنبياء', seerah: 'السيرة',
    rashidun: 'الراشدون', umayyad: 'الأموية', andalus: 'الأندلس', abbasid: 'العباسية',
    crusades: 'الصليبيون', mamluk: 'المماليك', ottoman: 'العثمانيون',
    civilization: 'الحضارة', modern: 'العصر الحديث', all: 'كل الحقب' };

  const badges = Object.keys(BI).map(k => `<div class="bg" data-b="${k}">
      <div class="bi">${BI[k]}</div><b>${BN[k]}</b><small>${BD[k]}</small></div>`).join('');

  return `${HEAD('موسوعة تاريخ الإسلام', 'موسوعة مختصرة لتاريخ الإسلام: الأنبياء والسيرة والخلفاء والدول الكبرى والحروب الصليبية والعثمانيون والحضارة.')}
<body data-page="home">
${TOPBAR('home')}
${PROGRESSBAR}
<main>
  <section class="hero frame" style="--c:#B8942F">
    ${FRAME_1}
    <div class="ic">📜</div>
    <h1>موسوعة تاريخ الإسلام</h1>
    <div class="period">${pages.length} حقبة · من قبل الإسلام إلى اليوم</div>
    <p class="intro">موسوعة مختصرة تروي تاريخ الإسلام في صفحات مستقلة: ماذا حدث؟ ومتى؟ ومن الشخصيات؟ وما نتيجته؟
    اختر حقبة لتقرأ أهم أحداثها وشخصياتها ونتائجها في دقائق.</p>
    ${ORN}
  </section>

  <h2 class="sec">الخط الزمني <span class="n">اسحب أفقياً للتنقل بين الحقب</span></h2>
  <div class="bigtl" id="bigtl">${strip}</div>

  <h2 class="sec">الحقب التاريخية <span class="n">اضغط للانتقال</span></h2>
  <section class="eg">${cards}</section>

  <h2 class="sec">نظام الأوسمة <span class="n">فتحت <b id="bcnt">٠</b> وساماً</span></h2>
  <div class="bar"><i id="bprog" style="display:block;height:100%;width:0;background:linear-gradient(90deg,var(--gold),#E3C56A)"></i></div>
  <div class="badges" id="badges">${badges}</div>

  <div class="src frame" style="--c:#B8942F">
    ${FRAME_2}
    <h2 class="sec" style="margin-top:0">كيف تقرأ الموسوعة</h2>
    <ul class="outs" style="list-style:none">
      <li>كل حقبة في صفحة مستقلة: نبذة، خط زمني، أحداث، شخصيات، نتائج، ومصادر.</li>
      <li>مرّر الصفحة حتى النهاية ليكتمل الشريط الذهبي أعلى الشاشة ويُسجَّل الوسم لك.</li>
      <li>اضغط 🔍 للبحث داخل صفحة الحقبة الحالية، و 🌙 لتبديل الوضع الليلي.</li>
      <li>النجوم على بطاقات الحقب تشير إلى ما أتممته.</li>
    </ul>
  </div>
</main>
${PANEL}
<script>
${js}
(function(){
  var pr=JSON.parse(localStorage.getItem('ti_progress')||'{}'),
      bm=JSON.parse(localStorage.getItem('ti_bookmarks')||'[]');
  ${JSON.stringify(pages.map(p => p.id))}.forEach(function(id){
    var b=document.getElementById('pg-'+id),
        d=document.getElementById('dn-'+id),
        s=document.getElementById('st-'+id);
    if(b) b.style.width=Math.round((pr[id]||0)*100)+'%';
    if(d) d.style.display=(bm.indexOf(id)>=0)?'':'none';
    if(s) s.textContent=(bm.indexOf(id)>=0)?'★':'';
  });
})();
</script>
</body>
</html>`;
}

/* ---------------- صفحة عميقة (فصول متعددة) ---------------- */
function buildDeep(p) {
  const idx = pages.findIndex(x => x.id === p.id);
  const prev = pages[idx - 1], next = pages[idx + 1];

  /* فلترة الفصول الفارغة التي قد ينتجها الوكلاء */
  const parts = (p.parts || [])
    .map(part => ({ part, chapters: (part.chapters || []).filter(c => c && c.p && c.p.length) }))
    .filter(x => x.chapters.length);

  /* فهرس مسطّح لكل الفصول مع القسم */
  const flat = [];
  parts.forEach((x, pi) => x.chapters.forEach((c, ci) =>
    flat.push({ id: c.id, n: c.n, part: x.part.n, num: (pi + 1) + '.' + (ci + 1) })));

  /* زخرفة فاصلة بين الأقسام */
  const PART_ORN = `<svg class="porn" viewBox="0 0 300 40" fill="none">
    <path class="ln" d="M0 20h118M182 20h118"/>
    <path class="dm" d="M124 20l16-14 16 14-16 14zM144 20l16-14 16 14-16 14z"/>
    <circle class="ln" cx="164" cy="20" r="11"/><circle class="ln" cx="164" cy="20" r="5"/>
    <path class="ln" d="M10 14h36M10 26h36M254 14h36M254 26h36"/></svg>`;

  const body = parts.map((x, pi) => {
    const chs = x.chapters.map((ch, ci) => {
      const pos = flat.findIndex(f => f.id === ch.id);
      const prv = pos > 0 ? flat[pos - 1] : null;
      const nxt = pos < flat.length - 1 ? flat[pos + 1] : null;

      const subs = (ch.h2 || []).map(h =>
        `<h4 class="sub">${esc(h.t)}</h4>` +
        (h.p || []).map(x2 => `<p class="ap">${esc(x2)}</p>`).join('')).join('');

      const keys = (ch.key || []).map(k =>
        `<div class="kb"><b>${esc(k.k)}</b><span>${esc(k.v)}</span></div>`).join('');

      const tbl = ch.tbl ? `<div class="tblwrap"><div class="tblcap">${esc(ch.tbl.cap || 'جدول')}</div>
        <table><thead><tr>${ch.tbl.head.map(h => `<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${
        ch.tbl.rows.map(r => `<tr>${r.map(c => `<td>${esc(c)}</td>`).join('')}</tr>`).join('')
      }</tbody></table></div>` : '';

      const quote = ch.quote
        ? `<blockquote><p>${esc(ch.quote.t)}</p><cite>${esc(ch.quote.a)}</cite></blockquote>` : '';

      /* تنقّل سلس بين الفصول: فقرة تمهيد + رابط + إيضاح */
      const nav = prv || nxt ? `<nav class="chnav">
        ${prv ? `<a class="pv" href="#${esc(prv.id)}"><small>الفصل السابق</small><b>${esc(prv.n)}</b></a>` : '<span class="pv empty"></span>'}
        <span class="cn-pos">${(pi + 1)}.${(ci + 1)} من ${flat.length}</span>
        ${nxt ? `<a class="nx" href="#${esc(nxt.id)}"><small>الفصل التالي</small><b>${esc(nxt.n)}</b></a>` : '<span class="nx empty"></span>'}
      </nav>` : '';

      return `<article class="ch3" id="${esc(ch.id)}" data-toc="${esc(ch.n)}">
        <div class="ch3-h">
          <span class="ch3-n">${pi + 1}.${ci + 1}</span>
          <h3>${ch.ic ? ch.ic + ' ' : ''}${esc(ch.n)}</h3>
        </div>
        ${ch.lead ? `<p class="lead"><span class="drop">${esc(String(ch.lead).trim().charAt(0))}</span>${esc(String(ch.lead).trim().slice(1))}</p>` : ''}
        ${(ch.p || []).map(x2 => `<p class="ap">${esc(x2)}</p>`).join('')}
        ${subs}
        ${keys ? `<div class="kbox"><div class="bt">خلاصة الفصل</div><div class="kgrid3">${keys}</div></div>` : ''}
        ${tbl}${quote}
        ${ch.sum ? `<div class="res">${esc(ch.sum)}</div>` : ''}
        ${nav}
      </article>`;
    }).join('');

    return `<section class="part">
      <div class="part-h" style="--c:${esc(p.c)}">
        ${PART_ORN}
        <div class="part-ic">${x.part.ic || '📖'}</div>
        <h2>${esc(x.part.n)}</h2>
        ${x.part.lead ? `<p>${esc(x.part.lead)}</p>` : ''}
        <div class="part-list">${x.chapters.map(c => `<a href="#${esc(c.id)}">${esc(c.n)}</a>`).join('')}</div>
      </div>
      ${chs}
    </section>`;
  }).join('\n' + PART_ORN + '\n');

  const tocHTML = parts.map((x, pi) => `<li class="toc-part"><b>${x.part.ic || '📖'}</b>
      <a href="#part-${pi + 1}">${esc(x.part.n)}</a>
      <ul>${x.chapters.map(c => `<li><a href="#${esc(c.id)}"><i></i>${esc(c.n)}</a></li>`).join('')}</ul>
    </li>`).join('');

  const chars = parts.reduce((a, x) => a + x.chapters.reduce((b, c) => b + JSON.stringify(c).length, 0), 0);
  const pagesEst = Math.max(1, Math.round(chars / 2600));

  return `${HEAD(p.n + ' | موسوعة تاريخ الإسلام', p.intro.slice(0, 150))}
<body data-page="${p.id}">
${TOPBAR(p.id)}
${PROGRESSBAR}
<main>
  <div class="crumbs"><a href="index.html">الرئيسية</a> ‹ <span>${esc(p.n)}</span></div>

  <section class="hero frame" style="--c:${esc(p.c)}">
    ${FRAME_1}
    <div class="ic">${p.ic}</div>
    <h1>${esc(p.n)}</h1>
    <div class="period">${ar(p.period)}${p.dur ? ' · ' + ar(p.dur) : ''}</div>
    <p class="intro">${esc(p.intro)}</p>
    ${ORN}
    <div class="stats" style="display:flex;justify-content:center;gap:1.6rem;flex-wrap:wrap;font-size:.78rem;color:var(--muted)">
      <span><b style="color:${esc(p.c)};font-size:1.25rem">${flat.length}</b> فصلاً</span>
      <span><b style="color:${esc(p.c)};font-size:1.25rem">${parts.length}</b> أقسام</span>
      <span><b style="color:${esc(p.c)};font-size:1.25rem">${pagesEst}</b> صفحة تقريباً</span>
    </div>
  </section>

  <div class="toc frame" style="--c:${esc(p.c)}">
    ${FRAME_1}
    <h2 class="sec" style="margin-top:0">فهرس الفصول</h2>
    <ol class="toclist">${tocHTML}</ol>
  </div>

  ${ORN}
  ${body}
  ${ORN}

  ${(p.people || []).length ? `<h2 class="sec">أهم الشخصيات</h2>
  <section><div class="people">${(p.people || []).map(x =>
    `<div class="pc"><b>${esc(x.n)}</b><span>${esc(x.r)}</span></div>`).join('')}</div></section>` : ''}

  ${(p.outcomes || []).length ? `<h2 class="sec">النتائج والآثار</h2>
  <section><ul class="outs">${(p.outcomes || []).map(x => `<li>${esc(x)}</li>`).join('')}</ul></section>` : ''}

  <div class="src frame" style="--c:${esc(p.c)}">
    ${FRAME_2}
    <h2 class="sec" style="margin-top:0">المصادر والمراجع</h2>
    <ul>${(p.sources || []).map(x =>
      `<li><cite>${esc(x.a)}</cite> — ${esc(x.t)}${x.n ? ' (' + esc(x.n) + ')' : ''}</li>`).join('')}</ul>
  </div>

  <nav class="pager">
    ${prev ? `<a class="prev" href="${prev.file}"><small>الحقبة السابقة</small><b>${prev.ic} ${esc(prev.n)}</b></a>` : '<a class="prev empty"></a>'}
    ${next ? `<a class="next" href="${next.file}"><small>الحقبة التالية</small><b>${next.ic} ${esc(next.n)}</b></a>` : '<a class="next empty"></a>'}
  </nav>
</main>
<nav class="railbar" id="railbar"><span class="rb" id="rb"></span></nav>
<div class="sword">${SWORD}<span>القراءة ٠٪</span></div>
${PANEL}
<script>
${js}
window.toTop=function(e){e.preventDefault();window.scrollTo({top:0,behavior:'smooth'});};
/* فهرس عائم يعرض الفصل الحالي */
(function(){
  var arts=[].slice.call(document.querySelectorAll('.ch3')), rb=document.getElementById('rb');
  if(!arts.length||!rb) return;
  function upd(){
    var y=window.innerHeight*0.35, cur=arts[0];
    for(var i=0;i<arts.length;i++){ if(arts[i].getBoundingClientRect().top<y) cur=arts[i]; else break; }
    var t=document.getElementById('toc'); if(t&&cur) t.querySelectorAll('a').forEach(function(a){
      if(a.getAttribute('href')==='#'+cur.id) a.parentNode.classList.add('here');
      else a.parentNode.classList.remove('here');
    });
    rb.textContent=cur.getAttribute('data-toc')||'';
  }
  window.addEventListener('scroll',upd,{passive:true}); upd();
})();
</script>
</body>
</html>`;
}


/* ---------------- التنفيذ ---------------- */
fs.writeFileSync(path.join(root, 'index.html'), buildHome(), 'utf8');
for (const p of pages) {
  fs.writeFileSync(path.join(root, p.file), p.parts ? buildDeep(p) : buildPage(p), 'utf8');
}

console.log(pages.map(p => (p.file + ' ').padEnd(20) +
  (p.parts ? (p.parts.reduce((a, x) => a + x.chapters.length, 0) + ' فصل · ' +
    Math.round(JSON.stringify(p.parts).length / 2600) + ' صفحة')
   : ((p.events || []).length + ' حدث')) ).join('\n'));
console.log('─'.repeat(62));
console.log('تم بناء ' + pages.length + ' صفحة + index.html');