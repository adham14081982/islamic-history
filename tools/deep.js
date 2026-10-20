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

