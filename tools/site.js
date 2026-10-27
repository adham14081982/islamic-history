/* ===== مولّد موقع موسوعة تاريخ الإسلام =====
   يقرأ data/pages/*.json ويبني index.html + صفحة لكل حقبة.
   الصفحات العميقة (ذات الفصول) تُبنى على هيئة «كتاب»:
   فصولها تُخرَج كبيانات JSON داخل <script type="application/json" id="book">
   ويقوم محرك القارئ في assets/app.js بتقسيمها إلى صفحات على الجهاز. */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const pagesDir = path.join(root, 'data', 'pages');

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

/* خريطة الحقبة — تُدرَج بعد المقدمة إن وُجدت */
function ERA_MAP(p) {
  const mapFile = 'assets/img/maps/map-' + p.id + '.svg';
  if (!fs.existsSync(path.join(root, mapFile))) return '';
  return '<section class="emap-sec">' +
    '<img src="' + mapFile + '" class="emap" alt="خريطة ' + esc(p.n) + '" width="1000" height="640">' +
    '<small class="emap-cap">خريطة ' + esc(p.n) + '</small></section>';
}

const DOME = `<svg viewBox="0 0 40 46" fill="none">
<path d="M4 42V22a16 16 0 0 1 32 0v20z" fill="none" stroke="var(--gold)" stroke-width="1.4" opacity=".45"/>
<path class="fill" d="M4 42V22a16 16 0 0 1 32 0v20z" fill="var(--gold)" opacity=".2"/></svg>`;

const HEAD = (title, desc) => `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<script>try{var t=localStorage.getItem('ti_theme'),d=t===null?(window.matchMedia&&matchMedia('(prefers-color-scheme: dark)').matches):t==='1';if(d)document.documentElement.classList.add('dark')}catch(e){}</script>
<!-- جسر Cordova: بدونه لا يصل حدث backbutton إلى الصفحة، فيخرج زر الرجوع من التطبيق
     بدل الرجوع صفحةً صفحة. defer حتى لا يحجب الرسم، ويُنفَّذ قبل app.js (ترتيب المستند).
     يُخدَّم من assets/www/cordova.js داخل التطبيق (404 في المتصفح فقط). -->
<script src="cordova.js" defer></script>
<meta name="description" content="${desc}">
<title>${title}</title>
<link rel="preload" href="assets/fonts/amiri-400.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="assets/fonts/amiri-700.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="assets/app.css">
<link rel="icon" type="image/png" sizes="32x32" href="favicon_32.png">
<link rel="icon" type="image/png" sizes="64x64" href="favicon_64.png">
<link rel="shortcut icon" href="favicon.ico">
<link rel="apple-touch-icon" sizes="180x180" href="apple-touch-icon_180.png">
<meta name="theme-color" content="#B8942F">
</head>`;

/* ---------- الشريط العلوي: في وضع القارئ يحمل اسم الفصل ---------- */
/* plain = صفحة معلوماتية (عن التطبيق): لا بحث داخلي ولا مفضلة، فلا معنى لهما فيها */
const TOPBAR = (pageId, reader, plain) => `<header class="top${reader ? ' reading' : ''}">
  <a class="brand" href="index.html"><span class="bic">📜</span>${
    reader ? '<span class="rbrand" id="rBrand"></span>'
           : '<span class="btxt">موسوعة تاريخ الإسلام</span>'}</a>
  <div class="tools">
    ${reader ? '<button class="ib" id="rMenu" title="الفهرس والذهاب إلى صفحة" aria-label="الفهرس والذهاب إلى صفحة">☰</button>' : ''}
    <span class="dome" title="نسبة إكمالك للصفحة">${DOME}</span>
    ${plain ? '' : '<button class="ib" onclick="openSearch()" title="بحث" aria-label="بحث">🔍</button>'}
    ${plain ? '' : '<button class="ib" id="favBtn" title="حفظ في المفضلة" aria-label="حفظ في المفضلة" aria-pressed="false">🔖</button>'}
    <button class="ib" id="themeBtn" title="الوضع الليلي" aria-label="تبديل الوضع الليلي">🌙</button>
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

/* ---------- هيكل القارئ: مسرح + شريط سفلي ---------- */
/* هيكل الانتظار (Skeleton): صفحة وهمية بنفس مقاسات الصفحة الحقيقية.
   يظهر فورًا عند تحميل الصفحة فيمنع الشاشة السوداء/الفارغة أثناء الترقيم. */
const SKELETON = `<div class="skl" aria-hidden="true"><div class="skl-page">
      <span class="skl-h"></span>
      <span class="skl-l w100"></span><span class="skl-l w96"></span>
      <span class="skl-l w88"></span><span class="skl-l w94"></span>
      <span class="skl-gap"></span>
      <span class="skl-l w100"></span><span class="skl-l w92"></span>
      <span class="skl-l w97"></span><span class="skl-l w85"></span><span class="skl-l w70"></span>
      <span class="skl-gap"></span>
      <span class="skl-l w100"></span><span class="skl-l w95"></span>
      <span class="skl-l w90"></span><span class="skl-l w98"></span>
      <span class="skl-l w76"></span>
    </div></div>`;

const READER_MAIN = `<main class="reader" id="reader">
  <div class="rload" id="rLoad" role="status" aria-live="polite">
    ${SKELETON}
    <div class="skl-cap"><i></i><span>جاري تجهيز الكتاب…</span></div>
  </div>
  <nav class="rtabs" id="rTabs" aria-label="أقسام الكتاب"></nav>
  <div class="rstage" id="rStage">
    <div class="rleaf" id="rLeaf">
      <div class="rface rfront" id="rFront"></div>
      <div class="rface rback" id="rBack"></div>
      <i class="rshade" id="rShade"></i>
    </div>
  </div>
  <div class="rfoot">
    <button class="rnav" id="rPrev" title="الصفحة السابقة" aria-label="الصفحة السابقة">السابق</button>
    <button class="rprog" id="rProgBtn" title="اذهب إلى صفحة" aria-label="اذهب إلى صفحة"><i id="rProg"></i></button>
    <button class="rnav" id="rNext" title="الصفحة التالية" aria-label="الصفحة التالية">التالي</button>
  </div>
</main>`;

const esc = s => String(s == null ? '' : s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/* تحويل الأرقام اللاتينية إلى هندية: يمنع انعكاس التواريخ في اتجاه النص */
const AR_DIG = s => String(s == null ? '' : s)
  .replace(/\d/g, d => '٠١٢٣٤٥٦٧٨٩'[d]);
const ar = s => esc(AR_DIG(s));

/* حاوية JSON آمنة داخل <script> */
const jsonBlock = obj => {
  const s = JSON.stringify(obj)
    .replace(/&/g, '\\u0026').replace(/</g, '\\u003c').replace(/>/g, '\\u003e');
  return `<script type="application/json" id="book">${s}</script>`;
};

/* ---------------- صفحة حقبة (بدون فصول) ---------------- */
function buildPage(p) {
  const i = pages.findIndex(x => x.id === p.id);
  const prev = pages[i - 1], next = pages[i + 1];

  const timeline = (p.timeline || []).map((t, k) =>
    `<button class="tli" data-target="ev${k}"><b>${ar(t.y)}</b><span>${esc(t.e)}</span></button>`).join('');

  const events = (p.events || []).map((e, k) => `<article class="ev" id="ev${k}">
      <div class="ev-head"><span class="ev-y">${ar(e.y)}</span><h3>${esc(e.t)}</h3></div>
      <p>${ar(e.d)}</p>
      ${e.r ? `<div class="res">${ar(e.r)}</div>` : ''}
    </article>`).join('');

  const people = (p.people || []).map(x =>
    `<div class="pc"><b>${esc(x.n)}</b><span>${ar(x.r)}</span></div>`).join('');

  const outs = (p.outcomes || []).map(x => `<li>${ar(x)}</li>`).join('');
  const src = (p.sources || []).map(x =>
    `<li><cite>${esc(x.a)}</cite> — ${ar(x.t)}${x.n ? ' (' + ar(x.n) + ')' : ''}</li>`).join('');

  return `${HEAD(p.n + ' | موسوعة تاريخ الإسلام', p.intro.slice(0, 150))}
<body data-page="${p.id}">
${TOPBAR(p.id, false)}
${PROGRESSBAR}
<main>
  <div class="crumbs"><a href="index.html">الرئيسية</a> ‹ <span>${esc(p.n)}</span></div>

  <section class="hero frame" style="--c:${esc(p.c)}">
    ${FRAME_1}
    <div class="ic">${p.ic}</div>
    <h1>${esc(p.n)}</h1>
    <div class="period">${ar(p.period)}${p.dur ? ' · ' + ar(p.dur) : ''}</div>
    <p class="intro">${ar(p.intro)}</p>
    ${ORN}
    <div class="stats" style="display:flex;justify-content:center;gap:1.4rem;flex-wrap:wrap;font-size:.78rem;color:var(--muted)">
      <span><b style="color:${esc(p.c)};font-size:1.3rem">${AR_DIG((p.events || []).length)}</b> حدثاً</span>
      <span><b style="color:${esc(p.c)};font-size:1.3rem">${AR_DIG((p.people || []).length)}</b> شخصية</span>
      <span><b style="color:${esc(p.c)};font-size:1.3rem">${AR_DIG((p.timeline || []).length)}</b> محطة زمنية</span>
    </div>
  </section>
${ERA_MAP(p)}
  <h2 class="sec">الخط الزمني <span class="n">اسحب أفقياً للتنقل</span></h2>
  <div class="tlwrap"><div class="tl" id="tl">${timeline}</div></div>
  ${ORN}

  <h2 class="sec">أهم الأحداث <span class="n">${AR_DIG((p.events || []).length)} حدثاً</span></h2>
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
<script src="assets/app.js" defer></script>
</body>
</html>`;
}

/* ---------------- الصفحة الرئيسية ---------------- */
function buildHome() {
  const CH_TOTAL = pages.reduce((s, p) => s + (p.parts || []).reduce((a, x) => a + x.chapters.length, 0), 0);
  const cards = pages.map(p => `<a class="ec" style="--c:${esc(p.c)}" href="${p.file}">
      <div class="ic">${p.ic}</div>
      <b>${esc(p.n)}</b>
      <small>${ar(p.period)}</small>
      <div class="pg"><i id="pg-${p.id}"></i></div>
      <small style="margin-top:.35rem;color:${esc(p.c)};font-weight:700">${AR_DIG((p.events || []).length)} حدثاً</small>
      <span class="done" id="dn-${p.id}">★</span>
    </a>`).join('');

  const strip = pages.map(p => `<a class="btl" style="--c:${esc(p.c)}" href="${p.file}">
      <span class="ic">${p.ic}</span>
      <span class="nm">${esc(p.n)}</span>
      <span class="yr">${ar(p.period)}</span>
      <span class="st" id="st-${p.id}"></span>
    </a>`).join('');

  const BI = { start: '🌱', seerah: '🕊️', rashidun: '⚔️', umayyad: '🏛️',
    andalus: '🏰', abbasid: '📚', crusades: '🛡️', mamluk: '🐎', ottoman: '🕌',
    civilization: '🔬', modern: '🕰️', all: '👑' };
  const BN = { start: 'نبت الطريق', seerah: 'وسام الرحمة',
    rashidun: 'وسام الفاروق', umayyad: 'وسام البناء', andalus: 'وسام الأندلس',
    abbasid: 'وسام الفجر', crusades: 'وسام حطين', mamluk: 'وسام النصر',
    ottoman: 'وسام السلطان', civilization: 'وسام العقل', modern: 'وسام التاريخ', all: 'تاج المؤرخ' };
  const BD = { start: 'ابدأ أول حقبة', seerah: 'السيرة',
    rashidun: 'الراشدون', umayyad: 'الأمويون', andalus: 'الأندلس', abbasid: 'العباسية',
    crusades: 'الصليبيون', mamluk: 'المماليك', ottoman: 'العثمانيون',
    civilization: 'الحضارة', modern: 'العصر الحديث', all: 'كل الحقب' };

  const badges = Object.keys(BI).map(k => `<div class="bg" data-b="${k}">
      <div class="bi">${BI[k]}</div><b>${BN[k]}</b><small>${BD[k]}</small></div>`).join('');

  return `${HEAD('موسوعة تاريخ الإسلام', 'موسوعة مختصرة لتاريخ الإسلام: السيرة والخلفاء والدول الكبرى والحروب الصليبية والعثمانيون والحضارة.')}
<body data-page="home">
${TOPBAR('home', false)}
${PROGRESSBAR}
<main>
  <section class="hero frame compact" style="--c:#B8942F">
    ${FRAME_1}
    <h1>موسوعة تاريخ الإسلام</h1>
    <div class="period">${AR_DIG(pages.length)} حقبة · ${AR_DIG(CH_TOTAL)} فصلًا · من قبل الإسلام إلى اليوم</div>
    ${ORN}
  </section>

  <div class="gsearch" role="search">
    <input id="gq" type="search" placeholder="ابحث في الموسوعة: حطين، الأندلس، هارون…" autocomplete="off" aria-label="بحث شامل في الموسوعة">
    <button id="gqBtn" type="button" aria-label="بحث">🔍</button>
    <div class="gsres" id="gsres" aria-live="polite"></div>
  </div>

  <div id="contWrap"></div>
  <div id="favWrap"></div>

  <h2 class="sec">الحقب التاريخية <span class="n">اضغط للانتقال</span></h2>
  <section class="eg">${cards}</section>

  <section class="emap-sec">
    <img src="assets/img/maps/map-world.svg" class="emap" alt="خريطة العالم الإسلامي" width="1000" height="640">
    <small class="emap-cap">العالم الإسلامي عبر أربعة عشر قرنًا</small>
  </section>

  <h2 class="sec">الخط الزمني <span class="n">اسحب أفقياً للتنقل بين الحقب</span></h2>
  <div class="bigtl" id="bigtl">${strip}</div>

  <h2 class="sec">نظام الأوسمة <span class="n">فتحت <b id="bcnt">٠</b> وساماً</span></h2>
  <div class="bar"><i id="bprog" style="display:block;height:100%;width:0;background:linear-gradient(90deg,var(--gold),#E3C56A)"></i></div>
  <div class="badges" id="badges">${badges}</div>

  <div class="src frame" style="--c:#B8942F">
    ${FRAME_2}
    <h2 class="sec" style="margin-top:0">كيف تقرأ الموسوعة</h2>
    <ul class="outs" style="list-style:none">
      <li>كل حقبة في صفحة مستقلة: نبذة، خط زمني، أحداث، شخصيات، نتائج، ومصادر.</li>
      <li>مرّر الصفحة حتى النهاية ليكتمل الشريط الذهبي أعلى الشاشة ويُسجَّل الوسم لك.</li>
      <li>البحث في الأعلى يغطي الفصول الـ${AR_DIG(CH_TOTAL)} كلها؛ و🔍 داخل الحقبة يبحث فيها وحدها.</li>
      <li>النجوم على بطاقات الحقب تشير إلى ما أتممته، و🔖 في شريط القارئ يحفظ الحقبة في المفضلة.</li>
    </ul>
  </div>

  <p class="abtlink"><a href="about.html">عن التطبيق وسياسة الخصوصية</a></p>
</main>
${PANEL}
<script src="assets/app.js" defer></script>
<script>
(function(){
  /* قراءة التخزين قد ترمي (قيمة تالفة/مساحة ممتلئة) — لا نُسقط بقية السكربت */
  var pr={},bm=[];
  try{pr=JSON.parse(localStorage.getItem('ti_progress')||'{}')||{}}catch(e){}
  try{var _b=JSON.parse(localStorage.getItem('ti_bookmarks')||'[]');if(Object.prototype.toString.call(_b)==='[object Array]')bm=_b}catch(e){}
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
<script>window.__ERAS__=${JSON.stringify(pages.reduce((o, p) => (o[p.id] = { n: p.n, file: p.file, ic: p.ic }, o), {}))};</script>
<script src="assets/home.js" defer></script>
</body>
</html>`;
}

/* ---------------- صفحة عميقة: تُبنى على هيئة كتاب ---------------- */
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

  /* ============ وحدات المحتوى: ترتيب صفحات الكتاب ============ */
  const units = [];

  /* ١) الغلاف */
  units.push({
    u: 'f', one: true, id: 'front', n: p.n,
    h: `<section class="hero frame" style="--c:${esc(p.c)}">
    ${FRAME_1}
    <div class="ic">${p.ic}</div>
    <h1>${esc(p.n)}</h1>
    <div class="period">${ar(p.period)}${p.dur ? ' · ' + ar(p.dur) : ''}</div>
    <p class="intro">${ar(p.intro)}</p>
    ${ORN}
    <div class="stats" style="display:flex;justify-content:center;gap:1.4rem;flex-wrap:wrap;font-size:.78rem;color:var(--muted)">
      <span><b style="color:${esc(p.c)};font-size:1.3rem">${ar(flat.length)}</b> فصلاً</span>
      <span><b style="color:${esc(p.c)};font-size:1.3rem">${ar(parts.length)}</b> أقسام</span>
      <span><b style="color:${esc(p.c)};font-size:1.3rem" data-stat="pages">…</b> صفحة</span>
    </div>
  </section>`
  });

  /* ٢) خريطة الحقبة: صفحة مستقلة داخل الكتاب.
     كانت الخرائط الـ١١ تُدرَج في الصفحات غير الكتابية فقط (buildPage)، وكل الحقب
     صارت كتبًا بقارئ، فلم تكن أي خريطة تظهر للمستخدم رغم شحنها في الحزمة. */
  const mapFile = 'assets/img/maps/map-' + p.id + '.svg';
  if (fs.existsSync(path.join(root, mapFile))) {
    units.push({
      u: 'f', one: true, id: 'map', n: 'خريطة ' + p.n,
      h: `<figure class="rmap">
      <img src="${mapFile}" alt="خريطة ${esc(p.n)}" width="1000" height="640">
      <figcaption>خريطة ${esc(p.n)}${p.period ? ' · ' + ar(p.period) : ''}</figcaption>
    </figure>`
    });
  }

  /* ٣) فهرس الأقسام: سطر لكل قسم (صفحة واحدة) — الفصول تُفتح من التبويب أو لوحة الفهرس */
  const tocHTML = parts.map((x, pi) => `
    <li class="toc-part toc-row"><b>${AR_DIG(pi + 1)}</b>
      <a href="#part-${pi + 1}"><span class="ttl">${esc(x.part.n)}</span>
      <span class="tcnt">${ar(x.chapters.length)} فصول</span></a>
    </li>`).join('');

  units.push({
    u: 'f', one: true, id: 'toc', n: 'المحتويات',
    h: `<div class="toc frame" style="--c:${esc(p.c)}">
    ${FRAME_1}
    <h2 class="sec" style="margin-top:0">المحتويات</h2>
    <ol class="toclist">${tocHTML}</ol>
  </div>`
  });

  /* ٤) الأقسام والفصول */
  parts.forEach((x, pi) => {
    units.push({
      u: 'p', one: true, id: 'part-' + (pi + 1), n: x.part.n, ic: x.part.ic || '📖',
      h: `<div class="part-h" id="part-${pi + 1}" style="--c:${esc(p.c)}">
      ${PART_ORN}
      <div class="part-ic">${x.part.ic || '📖'}</div>
      <h2>${esc(x.part.n)}</h2>
      ${x.part.lead ? `<p>${esc(x.part.lead)}</p>` : ''}
      <div class="part-list">${x.chapters.map(c => `<a href="#${esc(c.id)}">${esc(c.n)}</a>`).join('')}</div>
    </div>`
    });

    x.chapters.forEach((ch, ci) => {
      const subs = (ch.h2 || []).map(h =>
        `<h4 class="sub">${esc(h.t)}</h4>` +
        (h.p || []).map(x2 => `<p class="ap">${esc(x2)}</p>`).join('')).join('');

      const keys = (ch.key || []).map(k =>
        `<div class="kb"><b>${esc(k.k)}</b><span>${esc(k.v)}</span></div>`).join('');

      /* خلايا الصف: مصفوفة مباشرة أو {cells:[...]} — أي عدد أعمدة */
      const cellsOf = r => Array.isArray(r) ? r : (r && r.cells) || [];
      const tbl = ch.tbl ? `<div class="tblwrap"><div class="tblcap">${esc(ch.tbl.cap || 'جدول')}</div>
        <table><thead><tr>${ch.tbl.head.map(h => `<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${
        ch.tbl.rows.map(r => `<tr>${cellsOf(r).map(c => `<td>${esc(c)}</td>`).join('')}</tr>`).join('')
      }</tbody></table></div>` : '';

      const quote = ch.quote
        ? `<blockquote><p>${esc(ch.quote.t)}</p><cite>${esc(ch.quote.a)}</cite></blockquote>` : '';

      units.push({
        u: 'c', id: ch.id, n: ch.n, ic: ch.ic || '', part: x.part.n, partId: x.part.id,
        h: `<article class="ch3" id="${esc(ch.id)}" data-toc="${esc(ch.n)}">
        <div class="ch3-h">
          <div class="cho-top">
            <span class="cho-part">${esc(x.part.n)}</span>
            <span class="cho-cnt">الفصل ${AR_DIG(ci + 1)} من ${AR_DIG(x.chapters.length)}</span>
          </div>
          <div class="cho-mid">
            <span class="cho-num">${AR_DIG(pi + 1)}<i>.</i>${AR_DIG(ci + 1)}</span>
            <h3>${esc(ch.n)}</h3>
          </div>
          <div class="cho-rule"><i></i><b>&#10070;</b><i></i></div>
        </div>
        ${ch.lead ? `<p class="lead">${esc(String(ch.lead).trim())}</p>` : ''}
        ${(ch.p || []).map(x2 => `<p class="ap">${esc(x2)}</p>`).join('')}
        ${subs}
        ${keys ? `<div class="kbox"><div class="bt">خلاصة الفصل</div><div class="kgrid3">${keys}</div></div>` : ''}
        ${tbl}${quote}
        ${ch.sum ? `<div class="res">${esc(ch.sum)}</div>` : ''}
      </article>`
      });
    });
  });

  /* ٥) الشخصيات */
  if ((p.people || []).length) {
    units.push({
      u: 'f', one: true, id: 'people', n: 'أهم الشخصيات',
      h: `<section class="rsec">
      <h2 class="sec">أهم الشخصيات</h2>
      <div class="people">${(p.people || []).map(x =>
        `<div class="pc"><b>${esc(x.n)}</b><span>${ar(x.r)}</span></div>`).join('')}</div>
    </section>`
    });
  }

  /* ٦) النتائج */
  if ((p.outcomes || []).length) {
    units.push({
      u: 'f', one: true, id: 'outcomes', n: 'النتائج والآثار',
      h: `<section class="rsec">
      <h2 class="sec">النتائج والآثار</h2>
      <ul class="outs">${(p.outcomes || []).map(x => `<li>${ar(x)}</li>`).join('')}</ul>
    </section>`
    });
  }

  /* ٧) المصادر */
  units.push({
    u: 'f', one: true, id: 'sources', n: 'المصادر والمراجع',
    h: `<div class="src frame" style="--c:${esc(p.c)}">
    ${FRAME_2}
    <h2 class="sec" style="margin-top:0">المصادر والمراجع</h2>
    <ul>${(p.sources || []).map(x =>
      `<li><cite>${esc(x.a)}</cite> — ${ar(x.t)}${x.n ? ' (' + ar(x.n) + ')' : ''}</li>`).join('')}</ul>
  </div>`
  });

  /* ٨) التنقّل بين الحقب */
  units.push({
    u: 'f', one: true, id: 'pager', n: 'الحقب الأخرى',
    h: `<nav class="pager">
    ${prev ? `<a class="prev" href="${prev.file}"><small>← الحقبة السابقة</small><b>${prev.ic} ${esc(prev.n)}</b></a>`
      : `<a class="prev empty"></a>`}
    ${next ? `<a class="next" href="${next.file}"><small>الحقبة التالية →</small><b>${next.ic} ${esc(next.n)}</b></a>`
      : `<a class="next empty"></a>`}
  </nav>`
  });

  /* ============ بيانات الكتاب ============ */
  const book = {
    id: p.id, n: p.n, ic: p.ic, c: p.c, file: p.file,
    units: units.map(u => ({ u: u.u, one: !!u.one, id: u.id, n: u.n, ic: u.ic || '', part: u.part || '', h: u.h }))
  };

  return `${HEAD(p.n + ' | موسوعة تاريخ الإسلام', p.intro.slice(0, 150))}
<body data-page="${p.id}" class="reading">
${TOPBAR(p.id, true)}
${PROGRESSBAR}
${READER_MAIN}
${PANEL}
${jsonBlock(book)}
<script src="assets/app.js" defer></script>
</body>
</html>`;
}

/* ---------------- صفحة «عن التطبيق» وسياسة الخصوصية ----------------
   الإصدار يُقرأ من config.xml لا يُكتب يدويًا، فلا يختلف رقمٌ في الشاشة عن رقم الحزمة.
   بيانات التواصل ثابت واحد في أعلى الملف: يُغيَّر هنا ويُعاد البناء. */
const CONTACT = 'adham19821408@gmail.com';
const POLICY_DATE = '٢٤ أكتوبر ٢٠٢٦';
const CFG = fs.readFileSync(path.join(root, 'mobile', 'app', 'config.xml'), 'utf8');
const APP_VER = (CFG.match(/<widget[^>]*\bversion="([^"]+)"/) || [])[1] || '';
const APP_CODE = (CFG.match(/android-versionCode="([^"]+)"/) || [])[1] || '';

function buildAbout() {
  const chTotal = pages.reduce((s, p) => s + (p.parts || []).reduce((a, x) => a + x.chapters.length, 0), 0);
  const stored = [
    ['موضع القراءة', 'الصفحة والفصل الذي وقفت عنده، ليُستأنف من حيث توقفت'],
    ['المفضلة', 'الحقب التي حفظتها بعلامة 🔖'],
    ['الأوسمة والتقدّم', 'الحقب التي أتممتها ونسبة إنجازك'],
    ['إعدادات العرض', 'الوضع الليلي وحجم الخط']
  ].map(r => `<tr><td><b>${r[0]}</b></td><td>${r[1]}</td></tr>`).join('');

  return `${HEAD('عن التطبيق وسياسة الخصوصية | موسوعة تاريخ الإسلام',
    'عن تطبيق موسوعة تاريخ الإسلام: ما يقدّمه، وما يخزّنه على جهازك، وسياسة الخصوصية الكاملة.')}
<body data-page="about">
${TOPBAR('about', false, true)}
${PROGRESSBAR}
<main>
  <div class="crumbs"><a href="index.html">الرئيسية</a> ‹ <span>عن التطبيق</span></div>

  <section class="hero frame compact" style="--c:#B8942F">
    ${FRAME_1}
    <div class="ic abt-ic">${DOME}</div>
    <h1>عن التطبيق</h1>
    <div class="period">الإصدار ${ar(APP_VER)}${APP_CODE ? ' · بناء ' + ar(APP_CODE) : ''} · يعمل بلا إنترنت</div>
    ${ORN}
    <p class="intro">موسوعة مختصرة لتاريخ الإسلام: من قبل البعثة إلى العصر الحديث، في ${ar(pages.length)} حقبة و${ar(chTotal)} فصلًا. تعمل دون اتصال، ولا تجمع عنك أي بيانات.</p>
  </section>

  <h2 class="sec">ما هذه الموسوعة</h2>
  <div class="src frame" style="--c:#B8942F">
    ${FRAME_2}
    <ul class="outs">
      <li>${ar(pages.length)} حقبة تاريخية، كل واحدة في صفحة مستقلة تُقرأ على هيئة كتاب بأوراق تُقلَب.</li>
      <li>${ar(chTotal)} فصلًا، مع خريطة تاريخية لكل حقبة وخط زمني وأهم الشخصيات والنتائج والمصادر.</li>
      <li>بحث شامل في كل الفصول مع تجاهل الهمزات والتشكيل والأرقام الهندية، وفهرس للانتقال السريع، ومفضلة، وحفظ لموضع القراءة.</li>
      <li>كل شيء داخل الحزمة: المحتوى والخطوط والخرائط. لا يُطلب أي اتصال بالشبكة بعد التثبيت.</li>
      <li>المحتوى خلاصة تعليمية تستند إلى المصادر المذكورة في نهاية كل حقبة، ولا يُقصد به الاستقصاء الأكاديمي الكامل. التصحيح والتنبيه مرحّب بهما على بريد التواصل أدناه.</li>
    </ul>
  </div>

  <h2 class="sec">سياسة الخصوصية <span class="n">آخر تحديث: ${POLICY_DATE}</span></h2>

  <div class="src frame" style="--c:#B8942F">
    ${FRAME_2}
    <h3 class="abt-h">ما لا نجمعه</h3>
    <ul class="outs">
      <li>لا حسابات ولا تسجيل دخول: التطبيق لا يعرف من أنت.</li>
      <li>لا إعلانات، ولا أدوات تتبّع أو تحليلات، ولا أي مكتبة خارجية ترسل بيانات.</li>
      <li>لا نجمع الاسم ولا البريد ولا الموقع الجغرافي ولا جهات الاتصال ولا الصور ولا أي ملف من جهازك.</li>
      <li>لا يُرسَل شيء إلى أي خادم: لا يوجد في التطبيق أي اتصال شبكي لجلب محتوى أو لتقارير الأعطال.</li>
    </ul>

    <h3 class="abt-h">ما يُحفظ على جهازك فقط</h3>
    <p class="abt-note">لتعمل الميزات (استئناف القراءة، المفضلة، الأوسمة) يحفظ التطبيق بيانات صغيرة في مساحة التخزين المحلية الخاصة به على جهازك (localStorage). هذه البيانات لا تُغادر الجهاز، ولا يراها أحد غيرك:</p>
    <div class="abt-tblwrap"><table class="abt-tbl">
      <thead><tr><th>ما يُحفظ</th><th>لماذا</th></tr></thead>
      <tbody>${stored}</tbody>
    </table></div>
    <p class="abt-note">تُحذف هذه البيانات نهائيًا عند مسح بيانات التطبيق من إعدادات أندرويد أو عند إلغاء تثبيته.</p>

    <h3 class="abt-h">الأذونات</h3>
    <p class="abt-note">لا يطلب التطبيق أي إذن حسّاس: لا كاميرا، ولا ميكروفون، ولا موقع، ولا جهات اتصال، ولا وصول إلى ملفاتك. الصلاحية الوحيدة المعلنة في الحزمة هي <code>INTERNET</code> وهي صلاحية يضيفها إطار Cordova افتراضيًا، ولا يستخدمها التطبيق في أي اتصال.</p>

    <h3 class="abt-h">الأطفال</h3>
    <p class="abt-note">المحتوى تاريخي تعليمي مناسب لجميع الأعمار. لا يوجد محتوى يشاركه المستخدمون، ولا تواصل بينهم، ولا مشتريات داخل التطبيق.</p>

    <h3 class="abt-h">حذف بياناتك</h3>
    <p class="abt-note">من إعدادات أندرويد: التطبيقات ← موسوعة تاريخ الإسلام ← التخزين ← مسح البيانات. أو إلغاء تثبيت التطبيق. لا نحتفظ بأي نسخة عندنا لأننا لا نجمع شيئًا أصلًا.</p>

    <h3 class="abt-h">تغييرات هذه السياسة</h3>
    <p class="abt-note">أي تعديل يظهر في هذه الشاشة نفسها مع تحديث تاريخ آخر تعديل أعلاه، وتُنشر النسخة المطابقة على صفحة التطبيق في Google Play.</p>
  </div>

  <h2 class="sec">Privacy policy (English)</h2>
  <div class="src frame abt-en" style="--c:#B8942F" dir="ltr" lang="en">
    ${FRAME_2}
    <p class="abt-note">This app collects <b>no personal data</b>. There are no accounts, no advertising, no analytics and no third-party SDKs. Reading position, favourites, badges and display settings are stored only in the app's local storage on your device and never leave it; they are removed when you clear the app data or uninstall. The app works fully offline and makes no network requests. It requests no sensitive permissions (camera, microphone, location, contacts, files). The only permission declared in the package is <code>INTERNET</code>, added by the Cordova framework by default and unused by the app. Content is educational and suitable for all ages.</p>
    <p class="abt-note">Contact: <a href="mailto:${CONTACT}">${CONTACT}</a></p>
  </div>

  <h2 class="sec">التواصل</h2>
  <div class="src frame" style="--c:#B8942F">
    ${FRAME_2}
    <p class="abt-note" style="text-align:center">لأي استفسار، أو تصحيح في المحتوى، أو ملاحظة على التطبيق:</p>
    <p class="abt-mail"><a href="mailto:${CONTACT}">${CONTACT}</a></p>
  </div>

  <p class="abtlink"><a href="index.html">← العودة إلى الموسوعة</a></p>
</main>
<script src="assets/app.js" defer></script>
</body>
</html>`;
}

/* ---------------- التنفيذ ---------------- */
/* الملفات المشتركة: كل صفحة تشير إلى assets/app.css و assets/app.js مباشرة.
   كان التضمين ينسخ ~46KB CSS + ~77KB JS داخل كل صفحة من الـ12 (≈1.5MB تكرار)،
   فيتضخّم الـAPK وتُحلَّل نفس الشيفرة 12 مرة. الآن تُحمَّل مرة واحدة وتُخزَّن مؤقتًا.
   ملاحظة: <script src=... defer> يعمل بعد بناء الشجرة، فـwindow.__READER__
   (الذي يفحص وجود #book) يجد العنصر تمامًا كما كان مع التضمين. */
const css = fs.readFileSync(path.join(root, 'assets', 'app.css'), 'utf8');
const js = fs.readFileSync(path.join(root, 'assets', 'app.js'), 'utf8');
if (!css.length || !js.length) throw new Error('assets/app.css أو assets/app.js فارغ');

fs.writeFileSync(path.join(root, 'index.html'), buildHome(), 'utf8');
fs.writeFileSync(path.join(root, 'about.html'), buildAbout(), 'utf8');
for (const p of pages) {
  fs.writeFileSync(path.join(root, p.file), p.parts ? buildDeep(p) : buildPage(p), 'utf8');
}

/* أيقونات الفافيكون: WebView يطلبها من جذر www فيرمي FileNotFoundException إن غابت */
const FAV = ['favicon.ico', 'favicon.png', 'favicon_32.png', 'favicon_64.png', 'apple-touch-icon_180.png'];
const wwwDir = path.join(root, 'mobile', 'app', 'www');
if (fs.existsSync(wwwDir)) {
  let n = 0;
  FAV.forEach(f => {
    const src = path.join(root, f);
    if (fs.existsSync(src)) { fs.copyFileSync(src, path.join(wwwDir, f)); n++; }
  });
  console.log('✔ نُسخت ' + n + ' أيقونة إلى mobile/app/www/');
}

console.log(pages.map(p => (p.file + ' ').padEnd(20) +
  (p.parts ? (p.parts.reduce((a, x) => a + x.chapters.length, 0) + ' فصل · ' +
    Math.round(JSON.stringify(p.parts).length / 2600) + ' صفحة')
   : ((p.events || []).length + ' حدث')) ).join('\n'));
console.log('─'.repeat(62));
console.log('تم بناء ' + pages.length + ' صفحة + index.html + about.html');
