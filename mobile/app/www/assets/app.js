/* ===== موسوعة تاريخ الإسلام — منطق الواجهة + قارئ الكتاب =====
   يعمل على صفحات «الكتاب» (التي تحمل <script id="book">) وبقية الصفحات كما هي. */

/* هل هذه صفحة قارئ؟ يُحدَّد قبل أي تهيئة */
window.__READER__ = !!document.getElementById('book');

(function () {
  'use strict';
  var STORE = 'ti_bookmarks', THEME = 'ti_theme', PROG = 'ti_progress', FAV = 'ti_fav';

  /* ---------- تخزين محلي آمن ----------
     قراءة localStorage قد ترمي استثناءً (قيمة تالفة) والكتابة قد ترمي
     عند امتلاء المساحة. أي استثناء غير مُعالَج كان يوقف تهيئة الواجهة كلها
     (لا أوسمة، لا مفضلة، لا تقدّم) — لذلك كل وصول يمرّ من هنا. */
  function lsGet(k, dflt) {
    try { var v = localStorage.getItem(k); return v === null ? dflt : v; } catch (e) { return dflt; }
  }
  function lsSet(k, v) {
    try { localStorage.setItem(k, v); return true; } catch (e) { return false; }
  }
  function lsJSON(k, dflt) {
    try { var v = JSON.parse(lsGet(k, '')); return (v === null || v === undefined) ? dflt : v; } catch (e) { return dflt; }
  }
  function lsArr(k) { var v = lsJSON(k, []); return Object.prototype.toString.call(v) === '[object Array]' ? v : []; }

  /* ---------- تحويل الأرقام إلى هندية (وقت التشغيل) ---------- */
  function arDigits(s) {
    return String(s == null ? '' : s).replace(/\d/g, function (d) { return '٠١٢٣٤٥٦٧٨٩'[d]; });
  }
  window.arDigits = arDigits;

  /* ---------- الوضع الليلي ---------- */
  /* الكلاس يوضع على <html> حتى يعمل السكريبت المبكر في <head> قبل رسم الصفحة بلا وميض */
  function applyTheme(d) {
    document.documentElement.classList.toggle('dark', d);
    var b = document.getElementById('themeBtn');
    if (b) b.textContent = d ? '☀️' : '🌙';
  }
  var th = document.getElementById('themeBtn');
  if (th) th.addEventListener('click', function () {
    var d = !document.documentElement.classList.contains('dark');
    applyTheme(d); lsSet(THEME, d ? '1' : '0');
  });
  /* عند أول تشغيل: احترام تفضيل النظام (prefers-color-scheme)، وبعدها قرار المستخدم */
  var savedTheme = lsGet(THEME, null);
  var sysDark = !!(window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
  applyTheme(savedTheme === null ? sysDark : savedTheme === '1');

  /* ---------- التقدّم: مشترك بين التمرير والقارئ ---------- */
  function setProgress(id, frac) {
    if (!id || id === 'home') return;
    var pr = lsJSON(PROG, {});
    if ((pr[id] || 0) < frac) { pr[id] = frac; lsSet(PROG, JSON.stringify(pr)); }
    if (frac > 0.92) {
      var bm = lsArr(STORE);
      if (bm.indexOf(id) < 0) {
        bm.push(id); lsSet(STORE, JSON.stringify(bm));
        if (window.refreshBadges) window.refreshBadges();
      }
    }
  }
  window.__setProgress = setProgress;

  var domeFill = document.querySelector('.dome .fill');
  var topBar = document.querySelector('.topbar i');
  var swordBl = document.querySelector('.sword .bl');
  var swordTx = document.querySelector('.sword span');

  function paintProgress(pct) {
    if (domeFill) domeFill.style.opacity = (0.12 + pct * 0.88).toFixed(2);
    if (topBar) topBar.style.width = Math.round(pct * 100) + '%';
    if (swordBl) swordBl.style.clipPath = 'inset(0 ' + (100 - pct * 100) + '% 0 0)';
    if (swordTx) swordTx.textContent = 'القراءة ' + arDigits(Math.round(pct * 100)) + '٪';
  }
  window.__paintProgress = paintProgress;

  /* ---------- نظام الأوسمة ---------- */
  var BADGES = [
    { id: 'start', ic: '🌱', n: 'نَبتُ الطريق', d: 'ابدأ أول حقبة' },
    { id: 'seerah', ic: '🕊️', n: 'وسام الرحمة', d: 'السيرة' },
    { id: 'rashidun', ic: '⚔️', n: 'وسام الفاروق', d: 'الراشدون' },
    { id: 'umayyad', ic: '🏛️', n: 'وسام البناء', d: 'الأمويه' },
    { id: 'andalus', ic: '🏰', n: 'وسام الأندلس', d: 'الأندلس' },
    { id: 'abbasid', ic: '📚', n: 'وسام الفجر', d: 'العباسيه' },
    { id: 'crusades', ic: '🛡️', n: 'وسام حطين', d: 'الصليبيون' },
    { id: 'mamluk', ic: '🐎', n: 'وسام النصر', d: 'المماليك' },
    { id: 'ottoman', ic: '🕌', n: 'وسام السلطان', d: 'العثمانيون' },
    { id: 'civilization', ic: '🔬', n: 'وسام العقل', d: 'الحضاره' },
    { id: 'modern', ic: '🕰️', n: 'وسام التاريخ', d: 'العصر الحديث' },
    { id: 'all', ic: '👑', n: 'تاج المؤرخ', d: 'كل الحقب' }
  ];
  /* كل الأوسمة عدا «تاج المؤرخ» = عدد الحقب. كان الشرط ثابتًا على ١٢،
     فلمّا حُذفت حقبة (صارت ١١) استحال نيل التاج. يُحسب الآن من القائمة نفسها. */
  var ERA_COUNT = BADGES.length - 1;
  var ERA_IDS = BADGES.filter(function (b) { return b.id !== 'all'; })
    .map(function (b) { return b.id; });

  window.refreshBadges = function () {
    var bm = lsArr(STORE);
    var host = document.getElementById('badges');
    if (!host) return;
    /* نتجاهل أي معرّف لم يعد حقبة قائمة (بقايا حقبة محذوفة) */
    var doneEras = bm.filter(function (id) { return ERA_IDS.indexOf(id) >= 0; });
    var done = BADGES.filter(function (b) {
      return b.id === 'start' ? doneEras.length >= 1
        : b.id === 'all' ? doneEras.length >= ERA_COUNT : doneEras.indexOf(b.id) >= 0;
    }).map(function (b) { return b.id; });
    var pct = Math.round(done.length / BADGES.length * 100);
    document.querySelectorAll('#badges .bg').forEach(function (el) {
      el.classList.toggle('on', done.indexOf(el.dataset.b) >= 0);
    });
    var c = document.getElementById('bcnt');
    if (c) c.textContent = arDigits(done.length) + ' من ' + arDigits(BADGES.length);
    var pb = document.getElementById('bprog');
    if (pb) pb.style.width = pct + '%';
  };
  window.refreshBadges();

  /* ---------- المفضلة ----------
     كان هذا الزر يكتب في ti_bookmarks، وهو نفس مخزن «الحقب المكتملة» الذي
     تمنح عليه الأوسمة: فوضع نجمة على حقبة لم تُقرأ كان يمنح وسمها بلا قراءة،
     وإزالة النجمة تُلغي وسمًا مكتسبًا. كما أن الزر كان ظاهرًا في الرئيسية
     فيُحفظ 'home' كأنه حقبة. الآن المخزنان منفصلان: ti_bookmarks إتمام، ti_fav مفضلة. */
  var f = document.getElementById('favBtn');
  var favId = document.body.dataset.page;
  if (f && (!favId || favId === 'home')) {
    f.parentNode.removeChild(f);           /* لا معنى للمفضلة في الرئيسية */
  } else if (f) {
    var paintFav = function (on) {
      f.classList.toggle('on', !!on);
      f.setAttribute('aria-pressed', on ? 'true' : 'false');
      f.title = on ? 'إزالة من المفضلة' : 'حفظ في المفضلة';
      f.setAttribute('aria-label', f.title);
    };
    paintFav(lsArr(FAV).indexOf(favId) >= 0);
    f.addEventListener('click', function () {
      var fav = lsArr(FAV), i = fav.indexOf(favId);
      if (i >= 0) fav.splice(i, 1); else fav.push(favId);
      lsSet(FAV, JSON.stringify(fav));
      paintFav(i < 0);
    });
  }

  /* زر الرجوع في شاشة «عن التطبيق»: كان Cordova يخرج من التطبيق مباشرة لأن
     معالج backbutton موجود داخل قارئ الكتاب فقط (لا #rStage هنا). الرجوع
     المنطقي هو العودة إلى الرئيسية، والخروج يبقى في الرئيسية وحدها. */
  if (document.body.dataset.page === 'about') {
    var leftAbout = false;
    document.addEventListener('backbutton', function (e) {
      e.preventDefault();
      if (leftAbout) return;
      leftAbout = true;
      location.href = 'index.html';
    });
  }
})();


/* ==========================================================
   قارئ الكتاب — تقسيم المحتوى إلى صفحات بلا تمرير عمودي
   ========================================================== */
(function () {
  'use strict';
  var dataEl = document.getElementById('book');
  if (!dataEl) return;

  var BOOK;
  try { BOOK = JSON.parse(dataEl.textContent); } catch (e) { return; }

  var PGID = BOOK.id;
  /* وصول آمن للتخزين: قراءة تالفة أو مساحة ممتلئة لا تُسقط القارئ */
  function lsGet(k, d) { try { var v = localStorage.getItem(k); return v === null ? d : v; } catch (e) { return d; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); return true; } catch (e) { return false; } }
  /* يجب أن تطابق PADX/PADY حشوة .rbody في CSS تمامًا، وإلا اختلفت مساحة النص
     المحسوبة عن المساحة المعروضة فظهر فيض أو فراغ. الحشوة الموحّدة: 16px 20px */
  var PADX = 20, PADY = 16, FOOT = 26, GAP = 12;
  var SPREAD = false;   /* وضع الكتاب المفتوح (صفحتان متقابلتان) — يُفعَّل لاحقًا */
  var R = {
    cur: 0, total: 0, pages: [], units: [], chaps: [],
    pageW: 0, pageH: 0, cw: 0, ch: 0, stageW: 0, stageH: 0,
    spread: false, fs: 1, busy: false, dir: 0, drag: null,
    lastFlip: 0, anchor: null, rendered: {}, plan: null, index: null,
    partial: false, pendPage: 0
  };
  window.__R = R; /* مرجع للتشخيص فقط */
  window.__go = function (n) { R.cur = Math.max(0, Math.min(n, R.total - 1)); render(); }; /* لفحص الصفحات */

  var stage, meas, measBody, leaf, leafFront, leafBack, shade, chapEl, progEl, prevBtn, nextBtn;

  /* ---------- أدوات ---------- */
  function arD(s) { return window.arDigits(s); }
  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }

  /* ---------- ١) التهيئة ---------- */
  function setup() {
    stage = document.getElementById('rStage');
    if (!stage) return;
    leaf = document.getElementById('rLeaf');
    leafFront = document.getElementById('rFront');
    leafBack = document.getElementById('rBack');
    shade = document.getElementById('rShade');
    chapEl = document.getElementById('rBrand');
    progEl = document.getElementById('rProg');
    prevBtn = document.getElementById('rPrev');
    nextBtn = document.getElementById('rNext');

    meas = document.createElement('div');
    meas.className = 'rmeas';
    meas.innerHTML = '<div class="rbody"></div>';
    stage.appendChild(meas);
    measBody = meas.firstChild;

    R.fs = parseFloat(lsGet('ti_font', '1')) || 1;
    applyFont();

    /* القياس قبل استقرار الخطوط يعطي عدد صفحات مختلفًا في كل تحميل (٢٧٥ / ٢٧٩ / ٢٨١)،
       فنؤجّل أول ترقيم حتى تنتهي محاولة تحميل الخطوط (نجاحًا أو فشلًا). */
    var booted = false;
    function boot() {
      if (booted) return;
      booted = true;

      /* هل قِسنا بعد استقرار الخطوط؟ إن لا، فمهمة fonts.ready أدناه ستعيد الترقيم */
      R.fontsOk = !(document.fonts && document.fonts.load) || document.fonts.status === 'loaded';

      /* الترتيب هنا مقصود: نُجهّز الشريط العلوي والتبويبات *قبل* القياس.
         اسم الفصل يغيّر ارتفاع الشريط (خط Amiri أطول من البديل)، وقياس المسرح
         قبل وضعه كان يعطي ارتفاعًا مختلفًا في كل تحميل — فرق ٧px = صفحة كاملة،
         وهو نفس سبب اختلاف ٢٣٦/٢٣٧/٢٥٣ صفحة بين تشغيلين. */
      buildTabs();
      if (chapEl && !chapEl.textContent) chapEl.textContent = BOOK.n;

      layout();
      buildUnits();

      var ok = loadPlan();

      /* قفزة مباشرة إلى صفحة (للاختبار): seerah.html?p=12 */
      var m = /[?&#]p=(\d+)/.exec(location.href);
      /* قفزة مباشرة إلى فصل (روابط البحث الشامل وبطاقة «أكمل القراءة»):
         rashidun.html?c=abubakr-nasab  أو  rashidun.html?c=abubakr-nasab&n=3 (موضع داخل الفصل) */
      var mc = /[?&#]c=([A-Za-z0-9_-]+)/.exec(location.href);

      /* آخر موضع قراءة: نحفظ الفصل وموضعه لا رقم الصفحة،
         فيصلح لبدء الترقيم من الفصل الحالي مباشرة */
      var last = null;
      try { last = JSON.parse(localStorage.getItem('ti_last') || 'null'); } catch (e) { last = null; }
      if (last && last.e !== PGID) last = null;

      var saved = parseInt(lsGet('ti_pos_' + PGID, '0'), 10) || 0;

      if (!ok) {
        if (m) {
          /* قفزة رقمية صريحة: تحتاج الكتاب كاملًا لضمان صحة الرقم */
          paginate(); savePlan();
        } else {
          /* المسار العادي: رقّم الفصل الحالي فقط واعرضه، والباقي في الخلفية */
          var startCh = mc ? mc[1] : (last && last.c ? last.c : null);
          paginateProgressive(startCh);
          if (saved > R.total) R.pendPage = saved;   /* الموضع أبعد من الجزء المرقّم */
        }
      }

      R.cur = (saved > 0 && saved <= R.total) ? saved - 1 : 0;

      if (m) { var jp = parseInt(m[1], 10); if (jp >= 1 && jp <= R.total) R.cur = jp - 1; }

      if (mc) {
        var mn = /[?&#]n=(\d+)/.exec(location.href);
        var offIn = mn ? parseInt(mn[1], 10) : 0;
        for (var ci0 = 0; ci0 < R.chaps.length; ci0++) {
          if (R.chaps[ci0].id === mc[1]) {
            /* نثبّت المرساة: أي إعادة ترقيم تالية (معالجة الفيض) تعود لنفس الموضع */
            R.anchor = { id: mc[1], off: offIn };
            R.cur = Math.min(R.chaps[ci0].page - 1 + offIn, R.total - 1);
            break;
          }
        }
      } else if (!ok && last && last.c) {
        /* عودة للقراءة: ابدأ من الفصل المحفوظ نفسه (لا من رقم صفحة قد يزول) */
        for (var ci1 = 0; ci1 < R.chaps.length; ci1++) {
          if (R.chaps[ci1].id === last.c) {
            R.anchor = { id: last.c, off: last.o || 0 };
            R.cur = Math.min(R.chaps[ci1].page - 1 + (last.o || 0), R.total - 1);
            break;
          }
        }
      }

      render();
      showSwipeHint();
      buildPanel();
      wire();
      var ld = document.getElementById('rLoad');
      if (ld) {
        /* تلاشٍ قصير بدل الاختفاء المفاجئ؛ ثم يُزال من الشجرة */
        setTimeout(function () { if (ld.parentNode) ld.parentNode.removeChild(ld); }, 420);
      }
      document.body.classList.add('rready');
      /* الترقيم اكتمل في المسار المتزامن (خطة مخزَّنة أو ?p=): أعلِم الأدوات */
      if (!R.partial) document.body.dataset.pgdone = '1';
    }

    var fontsReady = Promise.resolve();
    if (document.fonts && document.fonts.load) {
      /* كل وزن مستخدم فعليًا: العناوين (.sub/.hd) بوزن ٧٠٠ وملفّه يُحمَّل منفصلًا.
         الاكتفاء بالوزن العادي كان يُرقّم الكتاب بخط بديل، فإذا وصل العريض بعد
         الترقيم طالت العناوين وخرج آخر سطر من الصفحة (فيض ٢٦px في صفحات معدودة). */
      fontsReady = Promise.all([
        document.fonts.load('400 1em Amiri'),
        document.fonts.load('700 1em Amiri'),
        document.fonts.load('400 1em Cairo'),
        document.fonts.load('700 1em Cairo')
      ]).catch(function () { });
    }
    /* مهلة أمان: لو علِق الطلب لا نُجمّد القارئ */
    var safety = new Promise(function (res) { setTimeout(res, 2500); });
    Promise.race([fontsReady, safety]).then(function () {
      /* نترك المتصفح يرسم هيكل الانتظار (Skeleton) مرة واحدة قبل الترقيم الثقيل:
         بدونه يبدأ paginate() فورًا فيحجب الرسم وتظهر شاشة فارغة/سوداء بضع ثوانٍ */
      requestAnimationFrame(function () {
        requestAnimationFrame(function () { setTimeout(boot, 16); });
      });
    });

    /* شبكة أمان: إن انقضت المهلة قبل استقرار الخطوط، أعِد الترقيم مرة واحدة عند
       اكتمالها مع الحفاظ على موضع القارئ. أفضل من ترقيم يتبدّل أثناء القراءة. */
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(function () {
        if (R.fontsOk) return;
        R.fontsOk = true;
        if (!R.total) return;
        /* نثبّت الموضع على أول كتلة في الصفحة الحالية لا على رقمها:
           إعادة الترقيم قد تغيّر عدد الصفحات، والرقم وحده يزيح القارئ. */
        var cur0 = R.pages[R.cur];
        var an = cur0 && cur0.items[0] ? { u: cur0.items[0].u, b: cur0.items[0].b } : null;
        paginate(); savePlan();
        if (an) {
          for (var i = 0; i < R.pages.length; i++) {
            var its = R.pages[i].items;
            for (var j = 0; j < its.length; j++) {
              if (its[j].u === an.u && its[j].b === an.b) { R.cur = i; i = R.pages.length; break; }
            }
          }
        }
        R.cur = Math.min(R.cur, R.total - 1);
        render();
      });
    }
  }

  /* تلميح أول استخدام: مرة واحدة فقط، داخل شريط الترقيم — لا يغطّي نصًا ولا يعترض اللمس */
  function showSwipeHint() {
    try {
      if (localStorage.getItem('ti_hint')) return;
      if (R.total < 2) return;
      var f = document.querySelector('.rpage[data-n="' + R.cur + '"] .rpfoot');
      if (!f) return;
      localStorage.setItem('ti_hint', '1');
      var h = document.createElement('div');
      h.className = 'rphint';
      var b = document.createElement('b'); b.textContent = '\u2194';
      var t = document.createElement('span'); t.textContent = 'اسحب يمينًا أو يسارًا لتقليب الصفحة';
      h.appendChild(b); h.appendChild(t);
      f.appendChild(h);
      setTimeout(function () {
        h.classList.add('out');
        setTimeout(function () { if (h.parentNode) h.parentNode.removeChild(h); }, 400);
      }, 3600);
    } catch (e) { }
  }
  function killSwipeHint() {
    var h = document.querySelector('.rphint');
    if (h && h.parentNode) h.parentNode.removeChild(h);
  }

  function applyFont() {
    document.documentElement.style.fontSize = (16 * R.fs) + 'px';
  }

  /* ---------- ٢) المقاسات ---------- */
  function layout() {
    var r = stage.getBoundingClientRect();
    R.stageW = r.width; R.stageH = r.height;
    R.spread = SPREAD && (window.innerWidth >= 820) && (window.innerWidth > window.innerHeight);
    R.pageW = R.spread ? Math.floor((R.stageW - 24 - GAP) / 2) : Math.min(R.stageW - 16, 700);
    R.pageH = Math.floor(R.stageH - 8);
    R.cw = R.pageW - PADX * 2;
    R.ch = R.pageH - PADY * 2 - FOOT - 6;
    stage.style.setProperty('--pw', R.pageW + 'px');
    stage.style.setProperty('--ph', R.pageH + 'px');
    stage.style.setProperty('--ch', R.ch + 'px');
    /* ‎-2px: عرض حدود الصفحة (1px لكل جهة). بدونها يقيس الصندوق أوسع بـ2px،
       فيكسر النصّ سطرًا أقل من الصفحة الحقيقية — فرق سطر كامل (٣٣px) في بعض الفقرات. */
    meas.style.width = (R.pageW - 2) + 'px';
  }

  /* ---------- ٣) تحويل HTML إلى كتل ---------- */
  function buildUnits() {
    R.units = BOOK.units.map(function (u, ui) {
      var tpl = document.createElement('template');
      tpl.innerHTML = u.h;
      var root = tpl.content.firstElementChild;
      var blocks = u.one ? [root] : Array.prototype.slice.call(root.children)
        .filter(function (el) { return !(el.matches && el.matches('.crn,.orn,.porn,svg')); });
      return { ui: ui, u: u.u, id: u.id, n: u.n, ic: u.ic || '', part: u.partId || '', blocks: blocks };
    });
  }

  /* ---------- ٤) القياس ---------- */
  /* ملاحظة مهمة: العنصر الأول داخل حاوية القياس يُسقط هامشه العلوي (margin collapse)،
     فيُقاس أقصر من حقيقته بـ ١٦px — وهو هامش كل كتلة تقريبًا. أضفنا «فاصلًا» فارغًا
     في البداية حتى يظهر الهامش العلوي في القياس، وإلا تجاوز المحتوى أسفل الصفحة
     في صفحات معدودة وتدخّل حارس الفيض بتكبير الكتاب كله بلا داعٍ. */
  function measureAll(nodes) {
    measBody.innerHTML = '';
    measBody.appendChild(document.createElement('div'));   /* فاصل: يمنع إسقاط الهامش */
    var fr = document.createDocumentFragment(), i;
    for (i = 0; i < nodes.length; i++) fr.appendChild(nodes[i].cloneNode(true));
    measBody.appendChild(fr);
    measBody.appendChild(document.createElement('div'));
    var kids = measBody.children, n = nodes.length, hs = [];
    for (i = 0; i < n; i++) hs.push(kids[i + 2].offsetTop - kids[i + 1].offsetTop);
    measBody.innerHTML = '';
    return hs;
  }
  function measureOne(node) {
    measBody.innerHTML = '';
    measBody.appendChild(document.createElement('div'));   /* فاصل: يمنع إسقاط الهامش */
    measBody.appendChild(node.cloneNode(true));
    measBody.appendChild(document.createElement('div'));
    var k = measBody.children;
    /* من الفاصل إلى الفاصل التالي = هامش علوي + ارتفاع + هامش سفلي */
    var h = k[2].offsetTop - k[0].offsetTop;
    measBody.innerHTML = '';
    return h;
  }

  /* ---------- ٥) تصنيف الكتل ---------- */
  function kindOf(el) {
    if (!el) return 'other';
    var t = el.tagName;
    if (t === 'P') return 'tx';
    if (t === 'BLOCKQUOTE') return 'qt';
    if (t === 'UL' || t === 'OL') return 'ls';
    if (el.classList.contains('tblwrap')) return 'tb';
    if (el.classList.contains('kbox')) return 'kb';
    if (el.classList.contains('toc')) return 'toc';
    if (el.classList.contains('res')) return 'tx';
    if (el.classList.contains('people')) return 'ls';
    if (el.classList.contains('toclist')) return 'ls';
    if (el.querySelector && el.querySelector('.toclist,.people,ul,ol')) return 'ls';
    if (t === 'H2' || t === 'H3' || t === 'H4' || t === 'H5') return 'hd';
    return 'other';
  }

  /* الحاوية التي أبناؤها عناصر القائمة (قد تكون داخل إطار) */
  function listHost(el) {
    if (el.matches && el.matches('ul,ol,.people,.toclist')) return el;
    return (el.querySelector && el.querySelector('.toclist,.people,ul,ol')) || el;
  }
  function isHeading(el) {
    if (!el) return false;
    var t = el.tagName;
    if (t === 'H2' || t === 'H3' || t === 'H4' || t === 'H5') return true;
    if (el.classList.contains('ch3-h')) return true;
    return false;
  }

  /* مدى الكتلة القابل للتقسيم: [بداية، نهاية) */
  function rangeOf(el, kind) {
    if (kind === 'tx' || kind === 'qt') return [0, textOf(el).length];
    if (kind === 'ls') return [0, listHost(el).children.length];
    if (kind === 'toc') return [0, tocRows(el).length];
    if (kind === 'tb') return [0, el.querySelectorAll('tbody tr').length];
    if (kind === 'kb') {
      var g = el.querySelector('.kgrid3');
      return [0, g ? g.children.length : 0];
    }
    return [0, 0];
  }

  /* ---------- ٦) نصوص الكتلة ---------- */
  function textOf(el) {
    if (el.tagName === 'BLOCKQUOTE') {
      var p = el.querySelector('p');
      return p ? p.textContent : el.textContent;
    }
    return el.textContent;
  }
  function cloneWithText(el, text, keepDrop) {
    var c = el.cloneNode(true);
    var drop = c.querySelector('.drop');
    var kids = Array.prototype.slice.call(c.childNodes);
    for (var i = 0; i < kids.length; i++) {
      var k = kids[i];
      if (k.nodeType === 3) c.removeChild(k);
      else if (k.nodeType === 1 && !(keepDrop && k === drop)) c.removeChild(k);
    }
    var body = text;
    if (keepDrop && drop) body = text.slice(drop.textContent.length);
    c.appendChild(document.createTextNode(body));
    return c;
  }
  function makeText(el, a, e, keepDrop) {
    if (el.tagName === 'BLOCKQUOTE') {
      var c = el.cloneNode(true);
      var p = c.querySelector('p');
      p.textContent = el.querySelector('p').textContent.slice(a, e);
      var cite = c.querySelector('cite');
      if (cite && a > 0) cite.remove();
      return c;
    }
    return cloneWithText(el, el.textContent.slice(a, e), keepDrop);
  }
  function snapSentence(text, pos) {
    var marks = ['.', '؟', '!', '۔', '،', '؛', ':'];
    for (var i = pos; i > pos - 220 && i > 40; i--) {
      if (marks.indexOf(text[i - 1]) >= 0) return i;
    }
    return pos;
  }

  /* ---------- ٧) تقسيم الكتل ---------- */
  function splitBlock(el, kind, a, e, avail, force) {
    if (avail < (force ? 30 : 70)) return null;
    if (kind === 'tx' || kind === 'qt') {
      var full = textOf(el);
      /* عتبة منخفضة: كان ٢٤٠/٢٠٠ حرفًا فيترك فراغًا كبيرًا في أسفل الصفحات
         حين تأتي فقرة متوسطة لا تسع كاملة. نسمح بالقسمة ما دامت البقية سطرًا معتبرًا. */
      if (e - a < (force ? 20 : 90)) return null;
      var hasDrop = !!el.querySelector('.drop');
      /* تقدير نسبي ثم تصحيحان على الأكثر — أسرع بكثير من البحث الثنائي على الجوال */
      var span = e - a;
      var fullH = measureOne(el);
      if (!(fullH > avail)) return null;
      var guess = a + Math.max(60, Math.min(span - 60, Math.round(span * (avail / fullH) * 0.97)));
      var best = -1;
      for (var it = 0; it < 3; it++) {
        var h = measureOne(makeText(el, a, guess, a === 0 && hasDrop));
        if (h <= avail) {
          best = guess;
          var room = avail - h;
          if (room < 24) break;
          var step = Math.max(24, Math.round(span * room / fullH));
          if (guess + step > e - 50) break;
          guess += step;
        } else {
          var back = Math.max(24, Math.round(span * (h - avail) / fullH));
          if (guess - back <= a + 50) break;
          guess -= back;
        }
      }
      if (best < 0) return null;
      var cut = snapSentence(full, best);
      if (cut <= a || cut >= e) cut = best;
      /* لا نُبقِي ذيلًا قصيرًا جدًا (سطرًا مبتورًا) ولا رأسًا قصيرًا جدًا.
         في الوضع الإجباري نتنازل عن هذا الشرط: بقية قصيرة على الصفحة التالية
         أفضل من سطر يُقصّ خارج حدود الورقة (كان يحدث في صفحة واحدة من كل كتاب). */
      if (!force && ((cut - a) < 70 || (e - cut) < 50)) return null;
      var p1 = makeText(el, a, cut, a === 0 && hasDrop);
      var p2 = makeText(el, cut, e, false);
      return [
        { d: { k: kind === 'qt' ? 'qt' : 'tx', a: a, e: cut, dp: (a === 0 && hasDrop) ? 1 : 0 }, node: p1 },
        { d: { k: kind === 'qt' ? 'qt' : 'tx', a: cut, e: e, dp: 0 }, node: p2 }
      ];
    }
    if (kind === 'tb') return splitTable(el, a, e, avail);
    if (kind === 'ls') return splitList(el, a, e, avail);
    if (kind === 'kb') return splitKbox(el, a, e, avail);
    if (kind === 'toc') return splitToc(el, a, e, avail);
    return null;
  }

  /* جدول: يُقسَّم بالصفوف مع تكرار صف العناوين */
  function splitTable(el, a, e, avail) {
    var rows = el.querySelectorAll('tbody tr');
    if (!rows.length) return null;
    function build(r0, r1) {
      var w = el.cloneNode(true);
      var rs = w.querySelectorAll('tbody tr');
      for (var i = 0; i < rs.length; i++) {
        if (i < r0 || i >= r1) w.querySelector('tbody').removeChild(rs[i]);
      }
      if (r0 > 0) { var cap = w.querySelector('.tblcap'); if (cap) cap.remove(); }
      return w;
    }
    var lo = a + 1, hi = e - 1, best = -1;
    while (lo <= hi) {
      var mid = (lo + hi) >> 1;
      if (measureOne(build(a, mid)) <= avail) { best = mid; lo = mid + 1; } else hi = mid - 1;
    }
    if (best < 0 || best <= a) return null;
    return [
      { d: { k: 'tb', a: a, b: best }, node: build(a, best) },
      { d: { k: 'tb', a: best, b: e }, node: build(best, e) }
    ];
  }

  /* قائمة أو شبكة: تُقسَّم بعناصرها */
  function splitList(el, a, e, avail) {
    var host = listHost(el);
    var kids = host.children;
    if (kids.length < 3) return null;
    function build(c0, c1) {
      var c = el.cloneNode(true);
      var h = listHost(c);
      var ch = Array.prototype.slice.call(h.children);
      for (var i = 0; i < ch.length; i++) if (i < c0 || i >= c1) h.removeChild(ch[i]);
      return c;
    }
    var lo = a + 1, hi = e - 1, best = -1;
    while (lo <= hi) {
      var mid = (lo + hi) >> 1;
      if (measureOne(build(a, mid)) <= avail) { best = mid; lo = mid + 1; } else hi = mid - 1;
    }
    if (best < 0 || best <= a) return null;
    return [
      { d: { k: 'ls', a: a, b: best }, node: build(a, best) },
      { d: { k: 'ls', a: best, b: e }, node: build(best, e) }
    ];
  }

  /* فهرس الفصول: يُقسَّم بالصفوف، مع تكرار عنوان القسم في الصفحة التالية */
  function tocRows(el) {
    var host = listHost(el), rows = [];
    Array.prototype.slice.call(host.children).forEach(function (li) {
      var isPart = !!(li.classList && li.classList.contains('toc-part'));
      var ul = isPart ? li.querySelector('ul') : null;
      if (isPart) {
        rows.push({ kind: 'p', node: li });
        if (ul) Array.prototype.slice.call(ul.children).forEach(function (c) { rows.push({ kind: 'c', node: c }); });
      } else rows.push({ kind: 'c', node: li });
    });
    return rows;
  }
  function buildToc(el, a, b) {
    var rows = tocRows(el);
    var w = el.cloneNode(true);
    var host = listHost(w);
    host.innerHTML = '';
    var start = a, k;
    /* إن بدأت الصفحة بفصلٍ بعيد عن عنوان قسمه، أعد العنوان معه */
    if (start > 0 && rows[start] && rows[start].kind === 'c') {
      for (k = start - 1; k >= 0; k--) if (rows[k].kind === 'p') { start = k; break; }
    }
    var curUl = null;
    for (var i = start; i < b; i++) {
      var r = rows[i];
      if (r.kind === 'p') {
        var li = r.node.cloneNode(true);
        var ul = li.querySelector('ul');
        if (ul) ul.innerHTML = '';
        curUl = ul;
        host.appendChild(li);
      } else {
        if (!curUl) {
          curUl = document.createElement('ul');
          var holder = document.createElement('li');
          holder.className = 'toc-part toc-cont';
          holder.appendChild(curUl);
          host.appendChild(holder);
        }
        curUl.appendChild(r.node.cloneNode(true));
      }
    }
    return w;
  }
  function splitToc(el, a, e, avail) {
    var rows = tocRows(el);
    var lo = a + 1, hi = e - 1, best = -1;
    while (lo <= hi) {
      var mid = (lo + hi) >> 1;
      if (measureOne(buildToc(el, a, mid)) <= avail) { best = mid; lo = mid + 1; } else hi = mid - 1;
    }
    if (best < 0 || best <= a) return null;
    /* لا تترك عنوان قسم في آخر الصفحة وفصوله في التالية — فقط حين تليه فصول */
    while (best > a + 1 && rows[best - 1] && rows[best - 1].kind === 'p'
           && rows[best] && rows[best].kind === 'c') best--;
    return [
      { d: { k: 'toc', a: a, b: best }, node: buildToc(el, a, best) },
      { d: { k: 'toc', a: best, b: e }, node: buildToc(el, best, e) }
    ];
  }

  /* شبكة البطاقات */
  function splitKbox(el, a, e, avail) {
    var grid = el.querySelector('.kgrid3');
    if (!grid) return null;
    var cards = grid.children;
    if (cards.length < 3) return null;
    function build(c0, c1) {
      var k = el.cloneNode(true);
      var g = k.querySelector('.kgrid3');
      var ch = Array.prototype.slice.call(g.children);
      for (var i = 0; i < ch.length; i++) if (i < c0 || i >= c1) g.removeChild(ch[i]);
      if (c0 > 0) { var t = k.querySelector('.bt'); if (t) t.remove(); }
      return k;
    }
    var lo = a + 1, hi = e - 1, best = -1;
    while (lo <= hi) {
      var mid = (lo + hi) >> 1;
      if (measureOne(build(a, mid)) <= avail) { best = mid; lo = mid + 1; } else hi = mid - 1;
    }
    if (best < 0 || best <= a) return null;
    return [
      { d: { k: 'kb', a: a, b: best }, node: build(a, best) },
      { d: { k: 'kb', a: best, b: e }, node: build(best, e) }
    ];
  }

  /* ---------- ٨) بناء كتلة من واصف (لاسترجاع الخطة) ---------- */
  function buildNode(u, b, d) {
    var el = R.units[u].blocks[b];
    if (d.k === 'tx' || d.k === 'qt') return makeText(el, d.a, d.e, !!d.dp);
    if (d.k === 'tb') {
      var w = el.cloneNode(true);
      var rs = w.querySelectorAll('tbody tr');
      for (var i = 0; i < rs.length; i++) if (i < d.a || i >= d.b) w.querySelector('tbody').removeChild(rs[i]);
      if (d.a > 0) { var cap = w.querySelector('.tblcap'); if (cap) cap.remove(); }
      return w;
    }
    if (d.k === 'ls') {
      var c = el.cloneNode(true);
      var h = listHost(c);
      var ch = Array.prototype.slice.call(h.children);
      for (var j = 0; j < ch.length; j++) if (j < d.a || j >= d.b) h.removeChild(ch[j]);
      return c;
    }
    if (d.k === 'kb') {
      var k = el.cloneNode(true);
      var g = k.querySelector('.kgrid3');
      if (g) {
        var gc = Array.prototype.slice.call(g.children);
        for (var q = 0; q < gc.length; q++) if (q < d.a || q >= d.b) g.removeChild(gc[q]);
      }
      if (d.a > 0) { var tt = k.querySelector('.bt'); if (tt) tt.remove(); }
      return k;
    }
    if (d.k === 'toc') return buildToc(el, d.a, d.b);
    return el;
  }

  /* ---------- ٩) الترقيم ---------- */
  /* ترقيم قابل للاستئناف: كل «وحدة» في الكتاب (فصل أو قسم) تُعالَج مستقلّة،
     فتستطيع حساب الفصل الحالي أولًا ثم إكمال بقية الفصول في الخلفية.
     الترتيب تسلسلي والنتيجة النهائية مطابقة تمامًا للترقيم الكامل —
     لا يتغيّر أي رقم صفحة، لأن الصفحات لا تُدفع إلا بعد اكتمال ما قبلها. */
  function pgNew() {
    return {
      pages: [], cur: { items: [], ch: '' }, curH: 0,
      ui: 0, chaps: [], partPages: {}
    };
  }
  function pgFlush(st) {
    if (st.cur.items.length) st.pages.push(st.cur);
    st.cur = { items: [], ch: st.cur.ch }; st.curH = 0;
  }
  /* ترقيم وحدة واحدة كاملة (فصل/قسم) — نفس منطق النسخة التسلسلية القديمة حرفًا بحرف */
  function pgUnit(st) {
    var ui = st.ui, unit = R.units[ui];
    pgFlush(st);
    st.cur.ch = unit.n;
    if (unit.u === 'c') st.chaps.push({ id: unit.id, n: unit.n, ic: unit.ic, part: unit.part, page: st.pages.length + 1 });
    if (unit.u === 'p') st.partPages[unit.id] = st.pages.length + 1;

    var hs = measureAll(unit.blocks);
    var q = [], i;
    for (i = 0; i < unit.blocks.length; i++) {
      var k = kindOf(unit.blocks[i]);
      var rg = rangeOf(unit.blocks[i], k);
      q.push({ b: i, orig: unit.blocks[i], node: unit.blocks[i], h: hs[i], d: null, a: rg[0], e: rg[1], kind: k });
    }
    var qi = 0;
    while (qi < q.length) {
      var it = q[qi];

      /* عنوان: لا يبقى وحيدًا في آخر صفحة */
      if (isHeading(it.node) && st.cur.items.length) {
        var nx = q[qi + 1];
        var nh = nx ? Math.min(nx.h, 100) : 0;
        if (st.curH + it.h + nh > R.ch) { pgFlush(st); st.cur.ch = unit.n; continue; }
      }

      if (st.curH + it.h <= R.ch) {
        /* it.d موجود إذا كان هذا الجزء بقية كتلة قُسِّمت: نحفظ وصفه لا 'full'
           وإلا أعاد بناءُ الخطة عند التحميل التالي الكتلةَ كاملة (تكرار النص) */
        st.cur.items.push({ u: ui, b: it.b, d: it.d || { k: 'full' }, node: it.node });
        st.curH += it.h; qi++; continue;
      }

      /* لا يسع: قسّم إن أمكن */
      if (st.cur.items.length) {
        var sp = splitBlock(it.orig, it.kind, it.a, it.e, R.ch - st.curH);
        if (sp) {
          st.cur.items.push({ u: ui, b: it.b, d: sp[0].d, node: sp[0].node });
          pgFlush(st); st.cur.ch = unit.n;
          q[qi] = { b: it.b, orig: it.orig, node: sp[1].node, h: measureOne(sp[1].node),
            d: sp[1].d, a: sp[1].d.a, e: (sp[1].d.e !== undefined ? sp[1].d.e : sp[1].d.b), kind: it.kind };
          continue;
        }
        pgFlush(st); st.cur.ch = unit.n; continue;
      }

      /* صفحة فارغة ولا زال لا يسع: اقسم إجباريًا حتى لو كانت البقية قصيرة.
         بدون ذلك تُدفع الكتلة كاملة فتُقصّ أسفل الصفحة (فيض يقاس بالبكسل). */
      var sp2 = splitBlock(it.orig, it.kind, it.a, it.e, R.ch, true);
      if (sp2) {
        st.cur.items.push({ u: ui, b: it.b, d: sp2[0].d, node: sp2[0].node });
        pgFlush(st); st.cur.ch = unit.n;
        q[qi] = { b: it.b, orig: it.orig, node: sp2[1].node, h: measureOne(sp2[1].node),
          d: sp2[1].d, a: sp2[1].d.a, e: (sp2[1].d.e !== undefined ? sp2[1].d.e : sp2[1].d.b), kind: it.kind };
        continue;
      }
      st.cur.items.push({ u: ui, b: it.b, d: { k: 'full' }, node: it.node });
      st.curH += it.h; qi++;
    }
    st.ui++;
  }

  function pgFinalize(st) {
    R.pages = st.pages;
    R.total = st.pages.length;
    R.chaps = st.chaps;
    R.partPages = st.partPages;

    /* ترتيب الفصل داخل قسمه: «الفصل ٣ من ٧» — يُحسب مرة واحدة بعد الترقيم */
    var perPart = {}, seenPart = {};
    R.chaps.forEach(function (c) { perPart[c.part] = (perPart[c.part] || 0) + 1; });
    R.chaps.forEach(function (c) {
      seenPart[c.part] = (seenPart[c.part] || 0) + 1;
      c.ci = seenPart[c.part]; c.cn = perPart[c.part];
    });

    R.plan = {
      v: 19, w: R.cw, h: R.ch, fs: R.fs, spread: R.spread,
      sig: R.units.length + ':' + R.units.reduce(function (a, u) { return a + u.blocks.length; }, 0),
      chaps: R.chaps,
      parts: R.partPages,
      pages: st.pages.map(function (p) {
        return { ch: p.ch, items: p.items.map(function (it) { return { u: it.u, b: it.b, d: it.d }; }) };
      })
    };
  }

  /* الترقيم الكامل المتزامن (المرجع): يُستخدم عند تغيير الخط/المقاس وعند تصحيح الفيض */
  function paginate() {
    pgCancel();
    var st = pgNew();
    R.chaps = st.chaps; R.partPages = st.partPages;
    while (st.ui < R.units.length) pgUnit(st);
    pgFlush(st);
    pgFinalize(st);
    R.partial = false;
  }

  /* ---------- ٩-ب) الترقيم التدريجي: الفصل الحالي أولًا ثم الباقي في الخلفية ---------- */
  var PG = null, PG_IDLE = 0;
  function pgNow() { return (window.performance && performance.now) ? performance.now() : Date.now(); }
  function pgCancel() {
    if (PG_IDLE) {
      try { if (window.cancelIdleCallback) cancelIdleCallback(PG_IDLE); } catch (e) { }
      clearTimeout(PG_IDLE);
      PG_IDLE = 0;
    }
    PG = null;
  }
  /* يرقّم حتى نهاية الفصل المطلوب (stopId) ويعرض فورًا، ثم يُكمل بالباقي */
  function paginateProgressive(stopId) {
    var st = pgNew();
    PG = st;
    R.chaps = st.chaps; R.partPages = st.partPages;
    var stopUi = -1, i;
    if (stopId) {
      for (i = 0; i < R.units.length; i++) {
        if (R.units[i].u === 'c' && R.units[i].id === stopId) { stopUi = i; break; }
      }
    }
    if (stopUi < 0) stopUi = 0;   /* افتراضيًا: الفصل الأول فقط */
    while (st.ui <= stopUi && st.ui < R.units.length) pgUnit(st);
    pgFlush(st);
    R.pages = st.pages; R.total = st.pages.length;
    R.partial = st.ui < R.units.length;
    if (!R.partial) { pgFinalize(st); PG = null; return; }
    pgSchedule();
  }
  function pgSchedule() {
    if (!PG) return;
    var run = function (dl) {
      PG_IDLE = 0;
      if (!PG) return;
      /* لا نُثقل الخيط الرئيسي أثناء تقليب الورقة: نؤجّل الشريحة التالية */
      if (R.busy || PT) { PG_IDLE = setTimeout(pgSchedule, 120); return; }
      var t0 = pgNow();
      var budget = (dl && dl.timeRemaining) ? Math.max(6, dl.timeRemaining()) : 6;
      do { pgUnit(PG); }
      while (PG.ui < R.units.length && (pgNow() - t0) < budget);
      if (PG.ui >= R.units.length) { pgFinish(); return; }
      pgSchedule();
    };
    PG_IDLE = window.requestIdleCallback
      ? requestIdleCallback(run, { timeout: 400 })
      : setTimeout(function () { run(null); }, 32);
  }
  function pgFinish() {
    var st = PG;
    pgCancel();
    if (!st) return;
    pgFlush(st);
    pgFinalize(st);
    R.partial = false;
    savePlan();
    /* موضع محفوظ لم يُبلَغ بعد أثناء الترقيم الجزئي: نطبّقه الآن */
    if (R.pendPage) { R.cur = clamp(R.pendPage - 1, 0, R.total - 1); R.pendPage = 0; }
    R.cur = Math.min(R.cur, R.total - 1);
    render();
    document.body.dataset.pgdone = '1';
    if (DBG) document.body.setAttribute('data-pg', 'done total=' + R.total);
  }
  /* طلب المستخدم صفحة/فصلًا لم يُرقَّم بعد: أكمل الترقيم فورًا ثم نفّذ الطلب.
     (نادر: يحدث فقط في الثانية الأولى من أول فتح قبل اكتمال الخلفية) */
  function pgEnsure(then) {
    var st = PG;
    if (!st) { then(); return; }
    pgCancel();
    while (st.ui < R.units.length) pgUnit(st);
    pgFlush(st);
    pgFinalize(st);
    R.partial = false;
    savePlan();
    R.cur = Math.min(R.cur, R.total - 1);
    render();
    document.body.dataset.pgdone = '1';
    then();
  }

  /* ---------- ١٠) الخطة المخزَّنة ---------- */
  function planKey() { return 'ti_plan_' + PGID + '_' + R.cw + 'x' + R.ch + '_' + R.fs; }
  function loadPlan() {
    try {
      var raw = localStorage.getItem(planKey());
      if (!raw) return false;
      var pl = JSON.parse(raw);
      if (!pl || pl.v !== 19 || (pl.pages.length !== undefined && !pl.pages.length)) return false;
      /* بصمة المحتوى: إذا تغيّر عدد الوحدات أو الكتل فالخطة قديمة ولا تصلح */
      var sig = R.units.length + ':' + R.units.reduce(function (a, u) { return a + u.blocks.length; }, 0);
      if (pl.sig !== sig) return false;
      R.chaps = pl.chaps || [];
      R.partPages = pl.parts || {};
      R.pages = pl.pages.map(function (p) {
        return {
          ch: p.ch,
          items: p.items.map(function (it) {
            return { u: it.u, b: it.b, d: it.d, node: buildNode(it.u, it.b, it.d) };
          })
        };
      });
      R.total = R.pages.length;
      R.plan = pl;
      return R.total > 0;
    } catch (e) { return false; }
  }
  function savePlan() {
    if (!R.plan) return;
    var key = planKey();
    /* لا نحتفظ إلا بخطة واحدة لكل كتاب: المقاسات/الخط الأقدم بلا فائدة ويملأ المساحة.
       كل الوصول للتخزين محاط بـtry: التخزين قد يكون معطّلًا أو ممتلئًا. */
    try {
      for (var i = localStorage.length - 1; i >= 0; i--) {
        var k = localStorage.key(i);
        if (k && k.indexOf('ti_plan_' + PGID + '_') === 0 && k !== key) localStorage.removeItem(k);
      }
      localStorage.setItem(key, JSON.stringify(R.plan));
    } catch (e) {
      /* المساحة ممتلئة: امسح خطط الكتب الأخرى وحاول مرة أخرى */
      try {
        for (var j = localStorage.length - 1; j >= 0; j--) {
          var k2 = localStorage.key(j);
          if (k2 && k2.indexOf('ti_plan_') === 0 && k2 !== key) localStorage.removeItem(k2);
        }
        localStorage.setItem(key, JSON.stringify(R.plan));
      } catch (e2) { }
    }
  }

  /* ---------- ١١) العرض ---------- */
  /* الفصل الذي تنتمي إليه الصفحة n + موضع الصفحة داخله */
  function chapAt(n) {
    var best = null, bi = -1, i;
    for (i = 0; i < R.chaps.length; i++) if (R.chaps[i].page - 1 <= n) { best = R.chaps[i]; bi = i; }
    if (!best) return null;
    var start = best.page - 1;
    var end = (bi + 1 < R.chaps.length ? R.chaps[bi + 1].page - 1 : R.total);
    return { c: best, i: n - start + 1, n: end - start };
  }
  function mountPage(n) {
    if (R.rendered[n]) return R.rendered[n];
    var el = document.createElement('div');
    el.className = 'rpage';
    el.setAttribute('data-n', n);
    var body = document.createElement('div');
    body.className = 'rbody';
    var foot = document.createElement('div');
    foot.className = 'rpfoot';
    /* عزل LTR: نضع كل جزء في عنصر مستقل حتى لا يعيد bidi ترتيب «صفحة/إجمالي» */
    var fcur = document.createElement('span');
    fcur.textContent = arD(n + 1);
    var fsep = document.createElement('span');
    fsep.textContent = ' من ';
    var ftot = document.createElement('span');
    /* أثناء الترقيم الجزئي لا نعرف الإجمالي بعد: «…» بدل رقم يتغيّر أمام القارئ */
    ftot.textContent = R.partial ? '\u2026' : arD(R.total);
    foot.appendChild(fcur); foot.appendChild(fsep); foot.appendChild(ftot);
    /* تقدّم القراءة داخل الفصل: «٣ من ١٢» (أرقام بين كلمات عربية = بلا اختلال bidi) */
    var ca = chapAt(n);
    if (ca && ca.n > 1) {
      var chp = document.createElement('span');
      chp.className = 'rpch';
      chp.textContent = (ca.i >= ca.n) ? 'انتهى الفصل' : (arD(ca.i) + ' من ' + arD(ca.n));
      foot.appendChild(chp);
    }
    el.appendChild(body); el.appendChild(foot);
    R.pages[n].items.forEach(function (it) {
      if (it.node.getAttribute) {
        it.node.setAttribute('data-u', it.u);
        it.node.setAttribute('data-b', it.b);
      }
      body.appendChild(it.node);
    });
    place(el, n);
    stage.appendChild(el);
    /* كتلة واحدة أطول من الصفحة ولا تُقسَّم (كالغلاف): اسمح بالتمرير داخلها فقط */
    if (body.scrollHeight > body.clientHeight + 4 && R.pages[n].items.length === 1) body.classList.add('rflow');
    R.rendered[n] = el;
    return el;
  }
  function place(el, n) {
    var x;
    if (R.spread) x = (n % 2 === 0) ? (R.stageW - R.pageW - 10) : 10;
    else x = Math.round((R.stageW - R.pageW) / 2);
    el.style.left = x + 'px';
    el.style.top = '4px';
    el.style.width = R.pageW + 'px';
    el.style.height = R.pageH + 'px';
  }
  function unmountAll() {
    for (var k in R.rendered) {
      var el = R.rendered[k];
      if (el && el.parentNode) el.parentNode.removeChild(el);
    }
    R.rendered = {};
  }
  /* أرقام صفحات الفهرس تُحسب وقت التشغيل */
  function fillToc() {
    var links = document.querySelectorAll('.toclist a[href^="#"]');
    if (!links.length) return;
    var map = {}, k;
    for (k in (R.partPages || {})) map[k] = R.partPages[k];
    R.chaps.forEach(function (c) { map[c.id] = c.page; });
    for (var i = 0; i < links.length; i++) {
      var id = links[i].getAttribute('href').slice(1);
      var pg = map[id];
      if (!pg) continue;
      var s = links[i].querySelector('.tpg');
      if (!s) { s = document.createElement('span'); s.className = 'tpg'; links[i].appendChild(s); }
      s.textContent = arD(pg);
    }
  }

  function refreshPanel() {
    var list = document.getElementById('rPlist');
    if (!list) return;
    list.innerHTML = '';
    R.chaps.forEach(function (c, idx) {
      var a = document.createElement('a');
      a.className = 'rpitem';
      a.href = 'javascript:void(0)';
      /* الرقم في الشارة = ترتيب الفصل؛ ورقم الصفحة بجانبه بلون خافت (كان الرقم صفحةً فاُلتبس بترتيب الفصل) */
      a.innerHTML = '<i>' + arD(idx + 1) + '</i><span>' + c.n +
        '</span><em class="rpgn">' + arD(c.page) + '</em>';
      a.addEventListener('click', function () { closePanel(); goto(c.page - 1); });
      list.appendChild(a);
    });
  }

  function render() {
    unmountAll();
    var from = Math.max(0, R.cur - 2), to = Math.min(R.total - 1, R.cur + 2);
    for (var i = from; i <= to; i++) {
      var el = mountPage(i);
      el.style.visibility = (i === R.cur) ? 'visible' : 'hidden';
      el.style.zIndex = (i === R.cur) ? 3 : 1;
    }
    updateChrome();
    fillToc();
    refreshPanel();
    checkOverflow();
  }

  /* إن تجاوز المحتوى حدود الصفحة: أعد الترقيم بعد تصغير ارتفاع العمود بقدر الفيض
     الفعلي فقط (لا بقيمة ثابتة). كان التصغير القديم ٣٠px لكل محاولة فيقفز عدد
     الصفحات ٢٣٧ → ٢٥٣ بسبب فيض ٤px في صفحة واحدة. الحد الأقصى محاولتان ثم توقّف. */
  function checkOverflow() {
    if (R.checking) return;
    /* أثناء الترقيم الجزئي لا نعيد ترقيم الكتاب كاملًا متزامنًا (يهدم الغرض)؛
       يُعاد الفحص بعد اكتمال الترقيم في الخلفية */
    if (R.partial) return;
    var over = 0, k;
    for (k in R.rendered) {
      var b = R.rendered[k].querySelector('.rbody');
      if (!b || b.classList.contains('rflow')) continue;
      /* قِس آخر عنصر فعليًا: الهوامش الختامية لا تُحتسب فيضًا */
      var last = b.lastElementChild;
      if (!last) continue;
      var d = Math.round(last.getBoundingClientRect().bottom - b.getBoundingClientRect().bottom);
      /* تسامح ١٢بك: أسفل الصفحة حشو ١٦بك، فأي فيض أقل منه يقع داخل الحشو
         ولا يُقصّ منه حرف. إعادة ترقيم الكتاب من أجل ٤بك غير مرئية كانت تكلّف
         القارئ عشر صفحات إضافية وقفزة في الترقيم أثناء القراءة. */
      if (d > 2) over = Math.max(over, d);
    }
    if (over <= 2) return;
    if (R.ovN >= 2 || R.ch <= 160) {
      /* استُنفدت المحاولات: اسمح بالتمرير داخل الصفحة بدل قصّ النص */
      var b2 = R.rendered[R.cur] && R.rendered[R.cur].querySelector('.rbody');
      if (b2 && !b2.classList.contains('rflow')) b2.classList.add('rflow');
      return;
    }
    R.ovN = (R.ovN || 0) + 1;
    R.checking = true;
    /* احفظ موضعك قبل إعادة الترقيم ثم أعده: وإلا انزاح القارئ عدة صفحات */
    var keepPart = null, pid0;
    for (pid0 in R.partPages) if (R.partPages[pid0] - 1 === R.cur) keepPart = pid0;
    var ca0 = keepPart ? null : chapAt(R.cur), off0 = ca0 ? ca0.i - 1 : 0, chId0 = ca0 ? ca0.c.id : null;
    R.ch = Math.max(160, R.ch - Math.min(16, over + 2));
    R.refixed = true;
    paginate(); savePlan();
    R.checking = false;
    R.cur = Math.min(R.cur, R.total - 1);
    if (R.anchor) {
      /* مرساة رابط مباشر: الأولوية لها حتى يتحرك القارئ بنفسه */
      for (var an = 0; an < R.chaps.length; an++) {
        if (R.chaps[an].id === R.anchor.id) {
          R.cur = Math.min(R.chaps[an].page - 1 + R.anchor.off, R.total - 1);
          break;
        }
      }
    } else if (keepPart && R.partPages[keepPart]) {
      R.cur = R.partPages[keepPart] - 1;
    } else if (chId0) {
      for (var ci0 = 0; ci0 < R.chaps.length; ci0++) {
        if (R.chaps[ci0].id === chId0) {
          R.cur = Math.min(R.chaps[ci0].page - 1 + off0, R.total - 1);
          break;
        }
      }
    }
    setTimeout(render, 0);
  }

  function repaginate() {
    var keep = R.cur;
    paginate();
    savePlan();
    R.cur = Math.min(keep, R.total - 1);
    render();
  }

  var DBG = /[?&#]debug/.test(location.href);
  function updateChrome() {
    var fr = R.total ? (R.cur + 1) / R.total : 0;
    /* الإجمالي غير معروف بعد أثناء الترقيم الجزئي: لا نحرّك شريط التقدّم
       (وإلا رآه القارئ يقفز للخلف عند اكتمال الترقيم) */
    var lastPage = !R.partial && R.cur >= R.total - 1;
    if (DBG) document.body.setAttribute('data-dbg', 'cur=' + R.cur + ' total=' + R.total +
      ' rendered=' + Object.keys(R.rendered).join(',') + ' busy=' + R.busy +
      ' pages=' + R.pages.length + ' ch=' + R.ch);
    if (progEl && !R.partial) progEl.style.width = Math.round(fr * 100) + '%';
    if (chapEl) chapEl.textContent = (R.pages[R.cur] && R.pages[R.cur].ch) || BOOK.n;
    /* التبويب النشط = قسم الصفحة الحالية */
    var cp = null, pid;
    for (pid in R.partPages) {
      var pp = R.partPages[pid] - 1;
      if (pp <= R.cur && (cp === null || pp > R.partPages[cp] - 1)) cp = pid;
    }
    if (cp !== R.tabCur) {
      R.tabCur = cp;
      var tabs = document.querySelectorAll('.rtab');
      for (var ti = 0; ti < tabs.length; ti++) {
        var on = tabs[ti].getAttribute('data-part') === cp;
        tabs[ti].classList.toggle('on', on);
        if (on) {
          try { tabs[ti].scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' }); } catch (e) { }
        }
      }
    }
    if (window.__paintProgress && !R.partial) window.__paintProgress(fr);
    if (window.__setProgress && !R.partial) window.__setProgress(PGID, fr);
    try { localStorage.setItem('ti_pos_' + PGID, String(R.cur + 1)); } catch (e) { }
    /* آخر موضع قراءة عام (تستخدمه بطاقة «أكمل القراءة» في الرئيسية).
       نحفظ الفصل وموضعه داخله لا رقم الصفحة: رقم الصفحة يتغيّر بتغيّر مقاس الشاشة أو حجم الخط */
    try {
      var caL = chapAt(R.cur);
      localStorage.setItem('ti_last', JSON.stringify({
        e: PGID, p: R.cur + 1, t: Date.now(),
        c: caL ? caL.c.id : null, o: caL ? caL.i - 1 : 0,
        n: caL ? caL.c.n : null
      }));
    } catch (e) { }
    if (prevBtn) prevBtn.disabled = (R.cur <= 0);
    if (nextBtn) {
      nextBtn.disabled = lastPage;
      /* في آخر صفحة من الفصل يتحوّل الزر إلى «الفصل التالي» بدل «التالي» المجهول */
      var caE = chapAt(R.cur);
      var endOfChap = !!(caE && caE.i >= caE.n && !lastPage);
      nextBtn.textContent = endOfChap ? 'الفصل التالي' : 'التالي';
      nextBtn.classList.toggle('emph', endOfChap);
      if (endOfChap) {
        var nxtCh = null;
        for (var ni = 0; ni < R.chaps.length; ni++) {
          if (R.chaps[ni].page - 1 > R.cur) { nxtCh = R.chaps[ni]; break; }
        }
        nextBtn.title = nxtCh ? ('الفصل التالي: ' + nxtCh.n) : 'القسم التالي';
        nextBtn.setAttribute('aria-label', nextBtn.title);
      } else {
        nextBtn.title = 'الصفحة التالية';
        nextBtn.setAttribute('aria-label', 'الصفحة التالية');
      }
    }
    /* خاتمة الفصل: تظهر فقط إن بقي فراغ كافٍ في أسفل الصفحة (لا تكسر الترقيم) */
    try {
      var pgEl = R.rendered && R.rendered[R.cur];
      var bodyEl = pgEl ? pgEl.querySelector('.rbody') : null;
      if (bodyEl) {
        var caC = chapAt(R.cur);
        if (caC && caC.i >= caC.n && !lastPage && !bodyEl.querySelector('.chend')) {
          var lastEl = bodyEl.lastElementChild;
          var br = bodyEl.getBoundingClientRect();
          var padB = parseFloat(getComputedStyle(bodyEl).paddingBottom) || 0;
          var sparePx = lastEl ? (br.bottom - padB - lastEl.getBoundingClientRect().bottom) : br.height;
          if (sparePx > 62) {
            var nxtC = null;
            for (var nk = 0; nk < R.chaps.length; nk++) {
              if (R.chaps[nk].page - 1 > R.cur) { nxtC = R.chaps[nk]; break; }
            }
            var dz = document.createElement('div');
            dz.className = 'chend';
            var dm = document.createElement('span'); dm.className = 'dm'; dm.textContent = '\u2756';
            var db = document.createElement('b'); db.textContent = 'انتهى الفصل';
            var ds = document.createElement('span');
            ds.textContent = nxtC ? ('التالي: ' + nxtC.n) : 'التالي: قسم جديد';
            dz.appendChild(dm); dz.appendChild(db); dz.appendChild(ds);
            /* نقيس الكتلة فعليًا بعد إضافتها: إن اتّسع لها الفراغ نثبّتها قرب أسفل الصفحة،
               وإلا نزيلها — لا أرقام تخمينية ولا صفحة تكسر الترقيم */
            dz.style.marginTop = '16px';
            bodyEl.appendChild(dz);
            var dzh = dz.getBoundingClientRect().height;
            if (16 + dzh <= sparePx) dz.style.marginTop = Math.max(16, Math.round(sparePx - dzh)) + 'px';
            else bodyEl.removeChild(dz);
          }
        }
      }
    } catch (e) { }
    var st = document.querySelector('[data-stat="pages"]');
    if (st) st.textContent = arD(R.total);
  }

  /* ---------- ١٢) الانتقال ---------- */
  function goto(n, hl) {
    /* صفحة خارج ما رُقّم بعد (ترقيم جزئي): أكمل أولًا ثم انتقل */
    if (R.partial && n >= R.total) { pgEnsure(function () { goto(n, hl); }); return; }
    n = clamp(n, 0, R.total - 1);
    if (n === R.cur && !hl) { return; }
    R.anchor = null;   /* انتقال صريح: لا نُبقي مرساة رابط مباشر */
    R.cur = n;
    render();
    if (hl) setTimeout(function () { highlightPage(n, hl); }, 30);
  }

  /* ---------- ١٣) التقليب ---------- */
  function startFlip(dir) {
    if (R.busy) return false;
    killSwipeHint();
    R.anchor = null;   /* تحرّك القارئ بنفسه: لم تبقَ حاجة لمرساة الرابط المباشر */
    var dest = R.cur + dir;
    if (dest < 0 || dest >= R.total) return false;
    R.busy = true; R.dir = dir;

    var destEl = mountPage(dest);
    var curEl = R.rendered[R.cur];
    leafFront.innerHTML = curEl ? curEl.querySelector('.rbody').innerHTML : '';
    leafBack.innerHTML = '';
    var x = Math.round((R.stageW - R.pageW) / 2);
    leaf.style.width = R.pageW + 'px';
    leaf.style.height = R.pageH + 'px';
    leaf.style.left = x + 'px';
    leaf.style.top = '4px';
    leaf.style.transformOrigin = dir > 0 ? 'right center' : 'left center';
    leaf.style.transition = 'none';
    leaf.style.transform = 'rotateY(0deg)';
    leaf.classList.toggle('prev', dir < 0);
    leaf.classList.add('on');
    if (shade) shade.style.opacity = '0';
    if (curEl) { curEl.style.visibility = 'hidden'; curEl.style.zIndex = 1; }
    destEl.style.visibility = 'visible';
    destEl.style.zIndex = 2;
    return true;
  }
  function setAngle(deg) {
    /* transform فقط: لا كتابة لـtransition ولا لمتغيّر CSS هنا،
       كلاهما يُبطل حساب الأنماط ويعيد الرسم على الخيط الرئيسي كل إطار */
    leaf.style.transform = 'rotateY(' + deg + 'deg)';
    if (shade) shade.style.opacity = (Math.abs(deg) / 180 * .95).toFixed(3);
  }
  /* زمن التقليب: أبطأ وأثقل حتى لا يمرّ الفصل مرورًا خاطفًا.
     المنحنى cubic-bezier(.25,1,.5,1) = بداية سريعة ثم تباطؤ طويل (ثقل الورق).
     لتبديل الإحساس إلى «0.3s» كما في المواصفة: FLIP_MS = 300 */
  var FLIP_MS = 460, FLIP_BACK_MS = 300;
  var FLIP_EASE = 'cubic-bezier(.25,1,.5,1)';
  function commitFlip() {
    dropAngle();
    R.lastFlip = gNow();
    leaf.style.transition = 'transform ' + (FLIP_MS / 1000) + 's ' + FLIP_EASE;
    leaf.style.transform = 'rotateY(' + (R.dir > 0 ? 180 : -180) + 'deg)';
    if (shade) shade.style.opacity = '.95';
    setTimeout(function () {
      leaf.classList.remove('on');
      leafFront.innerHTML = '';
      R.cur = clamp(R.cur + R.dir, 0, R.total - 1);
      R.busy = false; R.dir = 0;
      render();
    }, FLIP_MS + 40);
  }
  function cancelFlip() {
    dropAngle();
    R.lastFlip = gNow();
    leaf.style.transition = 'transform ' + (FLIP_BACK_MS / 1000) + 's ' + FLIP_EASE;
    leaf.style.transform = 'rotateY(0deg)';
    if (shade) shade.style.opacity = '0';
    setTimeout(function () {
      leaf.classList.remove('on');
      leafFront.innerHTML = '';
      R.busy = false; R.dir = 0;
      render();
    }, FLIP_BACK_MS + 40);
  }
  function flipTo(dir) {
    try {
      if (!startFlip(dir)) { if (DBG) document.body.setAttribute('data-dbg', 'flip-refused dir=' + dir + ' busy=' + R.busy + ' cur=' + R.cur + ' total=' + R.total); return; }
      commitFlip();
    } catch (err) {
      if (DBG) document.body.setAttribute('data-dbg', 'flip-error ' + (err && err.message));
    }
  }

  /* ---------- ١٤) اللمس والسحب: محرّك إيماءات واحد ---------- */
  /* إعدادات الحساسية: كل الأرقام هنا، ولا أرقام سحرية داخل المنطق */
  var GEST = {
    MIN_PX: 60,          /* ① حد أدنى مطلق للسحب قبل التقليب */
    MIN_RATIO: 0.25,     /* ① أو ربع عرض الصفحة */
    MAX_PX: 140,         /* ① سقف مطلق: لا نطلب سحبًا أطول من هذا على الشاشات الكبيرة */
    LOCK_PX: 10,         /* أقل حركة تُحدِّد المحور (أفقي/رأسي) */
    MAX_SLOPE: 1.2,      /* |dy| > |dx|×1.2 ⇒ تمرير رأسي، نتخلّى عن السحب */
    MIN_MS: 80,          /* ② سحب أقصر من هذا = اهتزاز/نقرة منزلقة ⇒ يُهمَل */
    VEL: 0.45,           /* ② px/ms: سحب قصير لكن سريع يُقبل */
    VEL_MIN_PX: 40,      /* ② لكن لا يقلّ طوله عن هذا */
    COOLDOWN_MS: 380,    /* ② مهلة إلزامية بين تقليبين (debounce) */
    EDGE_RESIST: 0.25    /* مقاومة الورقة عند أول/آخر صفحة */
  };

  var PT = null;   /* المؤشر/الإصبع النشط */

  function gNow() { return (window.performance && performance.now) ? performance.now() : Date.now(); }

  function gStart(x, y, id, target) {
    /* إيماءة سابقة لم تصلها pointerup (مقاطعة من النظام، إخفاء التطبيق،
       أو خروج من الصفحة أثناء السحب) كانت تُقفل كل سحب تالٍ إلى الأبد.
       نُهملها بعد ثانيتين بدل أن تظلّ PT محجوزة. */
    if (PT && gNow() - PT.t0 > 2000) PT = null;
    if (R.busy || PT) return;
    if (gNow() - R.lastFlip < GEST.COOLDOWN_MS) return;      /* ② debounce بين التقليبين */
    if (target && target.closest) {
      /* عناصر تفاعلية أو لوحة الفهرس: لا نسحب الصفحة منها.
         لا نستثني .rflow: قفل المحور في gMove يكفي لترك التمرير الرأسي للمتصفح */
      if (target.closest('a,button,input,select,textarea,label,.rpanel,.rpscrim')) return;
    }
    PT = { id: id, x0: x, y0: y, x: x, y: y, t0: gNow(), dir: 0, lock: '', dist: 0 };
  }

  function gMove(x, y, id) {
    if (!PT) return false;
    if (id != null && PT.id != null && id !== PT.id) return false;
    var dx = x - PT.x0, dy = y - PT.y0;
    PT.x = x; PT.y = y;

    if (!PT.lock) {
      /* R.busy يمنع بدء سحب جديد فقط، لا متابعة سحب قائم:
         كان الفحص العام يحجب كل الحركات بعد أول واحدة فتقفز الورقة من ٥° إلى ١٨٠° */
      if (R.busy) return false;
      if (Math.abs(dx) < GEST.LOCK_PX && Math.abs(dy) < GEST.LOCK_PX) return false;
      /* تمرير رأسي: يُترك للمتصفح ولا يُعترض */
      if (Math.abs(dy) > Math.abs(dx) * GEST.MAX_SLOPE) { PT.lock = 'y'; return false; }
      PT.lock = 'x';
      PT.dir = dx > 0 ? 1 : -1;
      if (!startFlip(PT.dir)) { PT.lock = 'dead'; return false; }   /* لا صفحة في هذا الاتجاه */
    }
    if (PT.lock !== 'x') return false;

    PT.dist = Math.abs(dx);
    var deg = (dx / R.pageW) * 180;
    /* الورقة لا تدور إلا في اتجاه سحبها، ولا تتجاوز المستويين */
    if (PT.dir > 0) deg = clamp(deg, 0, 180); else deg = clamp(deg, -180, 0);
    /* مقاومة عند الحدود: الورقة تقاوم بدل أن تُقلب إلى العدم */
    if ((PT.dir > 0 && R.cur <= 0) || (PT.dir < 0 && R.cur >= R.total - 1)) deg *= GEST.EDGE_RESIST;
    queueAngle(deg);
    return true;   /* استُهلكت الحركة ⇒ امنع التمرير الأفقي */
  }

  /* كتابة الزاوية مرة واحدة لكل إطار: أحداث اللمس تصل أسرع من الرسم،
     وكتابة transform عند كل حدث تُجبر إعادة رسم طبقة ثلاثية الأبعاد بلا داعٍ */
  var pendDeg = 0, pendRaf = 0;
  function queueAngle(deg) {
    pendDeg = deg;
    if (pendRaf) return;
    pendRaf = requestAnimationFrame(function () {
      pendRaf = 0;
      if (PT) setAngle(pendDeg);
    });
  }
  function dropAngle() {
    if (pendRaf) { cancelAnimationFrame(pendRaf); pendRaf = 0; }
  }

  function gEnd(x, y) {
    if (!PT) return;
    var p = PT; PT = null;
    if (p.lock !== 'x') return;                 /* لم يبدأ تقليبًا أصلًا */
    var dx = (x == null ? p.x : x) - p.x0;
    var dt = Math.max(1, gNow() - p.t0);
    var dist = Math.abs(dx);
    var vel = dist / dt;
    var need = Math.min(Math.max(GEST.MIN_PX, R.pageW * GEST.MIN_RATIO), GEST.MAX_PX);
    var sameDir = (dx >= 0 ? 1 : -1) === p.dir;
    var far = dist >= need;                                   /* ① مسافة كافية */
    var flick = dist >= GEST.VEL_MIN_PX && vel >= GEST.VEL;    /* ② أو سرعة كافية */
    var jitter = dt < GEST.MIN_MS && dist < need;              /* ② اهتزاز ⇒ تجاهُل */
    if (sameDir && !jitter && (far || flick)) commitFlip();
    else cancelFlip();
  }

  function bindGestures() {
    /* المسار الأساسي: Pointer Events (لمس + ماوس + قلم بواجهة واحدة) */
    if (window.PointerEvent) {
      stage.addEventListener('pointerdown', function (e) {
        if (e.pointerType === 'mouse' && e.button !== 0) return;
        gStart(e.clientX, e.clientY, e.pointerId, e.target);
      }, { passive: true });
      window.addEventListener('pointermove', function (e) {
        if (gMove(e.clientX, e.clientY, e.pointerId) && e.cancelable) e.preventDefault();
      }, { passive: false });
      window.addEventListener('pointerup', function (e) {
        gEnd(e.clientX, e.clientY);
      }, { passive: true });
      window.addEventListener('pointercancel', function () { gEnd(null, null); }, { passive: true });
      return;
    }
    /* احتياط: WebView قديم بلا Pointer Events */
    stage.addEventListener('touchstart', function (e) {
      if (e.touches.length > 1) { gEnd(null, null); return; }
      var t = e.changedTouches[0];
      gStart(t.clientX, t.clientY, t.identifier, e.target);
    }, { passive: true });
    stage.addEventListener('touchmove', function (e) {
      if (e.touches.length > 1) return;
      var t = e.changedTouches[0];
      if (gMove(t.clientX, t.clientY, t.identifier) && e.cancelable) e.preventDefault();
    }, { passive: false });
    stage.addEventListener('touchend', function (e) {
      var t = e.changedTouches[0];
      gEnd(t.clientX, t.clientY);
    }, { passive: true });
    stage.addEventListener('touchcancel', function () { gEnd(null, null); }, { passive: true });
  }

  /* ---------- ١٤ب) ربط الأزرار واللوحة ---------- */
  function wire() {
    bindGestures();

    if (prevBtn) prevBtn.addEventListener('click', function () { flipTo(-1); });
    if (nextBtn) nextBtn.addEventListener('click', function () { flipTo(1); });
    var menu = document.getElementById('rMenu');
    if (menu) menu.addEventListener('click', openPanel);
    var pbtn = document.getElementById('rProgBtn');
    if (pbtn) pbtn.addEventListener('click', openPanel);

    /* كيبورد: الأسهم تقلّب الصفحات (RTL: اليسار تالٍ) */
    document.addEventListener('keydown', function (e) {
      if (e.target && /INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return;
      if (e.key === 'ArrowLeft') flipTo(1);
      else if (e.key === 'ArrowRight') flipTo(-1);
      else if (e.key === 'PageDown') flipTo(1);
      else if (e.key === 'PageUp') flipTo(-1);
    });

    /* عجلة الماوس الأفقية تقلّب الصفحات */
    stage.addEventListener('wheel', function (e) {
      if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;
      if (R.busy) return;
      if (gNow() - R.lastFlip < 200) return;   /* لا قفزات عند الدوران السريع */
      e.preventDefault();
      flipTo(e.deltaX < 0 ? 1 : -1);
    }, { passive: false });

    /* الروابط الداخلية (فهرس الفصول) تقفز إلى الصفحة */
    stage.addEventListener('click', function (e) {
      var a = e.target.closest('a[href^="#"]');
      if (!a) return;
      e.preventDefault();
      var id = a.getAttribute('href').slice(1);
      var ci = R.chaps.filter(function (c) { return c.id === id; })[0];
      if (ci) { closePanel(); goto(ci.page - 1); }
    });

    var t = null, lastW = window.innerWidth;
    window.addEventListener('resize', function () {
      clearTimeout(t);
      t = setTimeout(function () {
        /* لوحة المفاتيح (فتح البحث) تغيّر الارتفاع وحده: إعادة الترقيم من أجلها
           تعني ترقيم الكتاب كله مرتين وتغيير عدد الصفحات أمام القارئ.
           نُعيد الترقيم فقط عند تغيّر العرض (تدوير الشاشة/تغيير المقاس فعلًا). */
        if (Math.abs(window.innerWidth - lastW) < 2) return;
        lastW = window.innerWidth;
        layout();
        repaginate();
      }, 220);
    });

    /* زر الرجوع في أندرويد: صفحة لصفحة، ثم عند أول صفحة إلى الرئيسية.
       cordova-android يُطلق الحدث مرّتين للضغطة الواحدة (مسار onBackPressed
       ومسار onDispatchKeyEvent) فكان القارئ يتخطّى صفحتين — نتحصّن بفاصل زمني
       قصير بدل الاعتماد على إصلاح المنصة الذي يضيع مع كل cordova prepare. */
    var lastBackAt = 0;
    document.addEventListener('backbutton', function (e) {
      e.preventDefault();
      var t = gNow();
      if (t - lastBackAt < 200) return;
      lastBackAt = t;
      if (R.cur > 0) goto(R.cur - 1);
      else location.href = 'index.html';
    });
  }

  /* ---------- ١٥) لوحة الفهرس والذهاب إلى صفحة ---------- */
  /* ---------- ١٢ب) تبويبات الأقسام: وصول مباشر لكل قسم ---------- */
  function tabLabel(s) {
    return String(s || '')
      .replace(/^القسم\s+\S+\s*:\s*/, '')
      .replace(/\s*\([^)]*\)\s*$/, '')
      .trim();
  }
  function buildTabs() {
    var host = document.getElementById('rTabs');
    if (!host) return;
    host.innerHTML = '';
    BOOK.units.forEach(function (u) {
      if (u.u !== 'p') return;
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'rtab';
      b.setAttribute('data-part', u.id);
      var tx = document.createElement('span');
      tx.textContent = tabLabel(u.n);
      b.appendChild(tx);
      b.title = u.n;
      b.addEventListener('click', function () {
        var go2 = function () {
          var pg = R.partPages[u.id];
          if (pg) { closePanel(); goto(pg - 1); }
        };
        if (R.partPages[u.id]) go2(); else pgEnsure(go2);
      });
      host.appendChild(b);
    });
  }

  function buildPanel() {
    var pan = document.createElement('div');
    pan.className = 'rpanel';
    pan.id = 'rPanel';
    pan.innerHTML =
      '<div class="rphead"><b>الفهرس والأدوات</b><button class="ib" id="rClose" title="إغلاق" aria-label="إغلاق">✕</button></div>' +
      '<div class="rpjump"><input type="text" inputmode="numeric" id="rJumpIn" placeholder="رقم الصفحة" aria-label="رقم الصفحة">' +
      '<button class="rpgo" id="rJumpGo">انتقل</button></div>' +
      '<div class="rpfont"><span>حجم الخط</span>' +
      '<button data-fs="0.9" title="صغير" aria-label="حجم خط صغير">أ</button><button data-fs="1" title="متوسط" aria-label="حجم خط متوسط" style="font-size:.95rem">أ</button>' +
      '<button data-fs="1.12" title="كبير" aria-label="حجم خط كبير" style="font-size:1.1rem">أ</button><button data-fs="1.25" title="كبير جدًا" aria-label="حجم خط كبير جدًا" style="font-size:1.3rem">أ</button></div>' +
      '<div class="rplist" id="rPlist"></div>' +
      '<a class="rphome" href="index.html">فهرس الموسوعة</a>';
    document.body.appendChild(pan);
    var scr = document.createElement('div');
    scr.className = 'rpscrim';
    scr.id = 'rScrim';
    scr.addEventListener('click', closePanel);
    document.body.appendChild(scr);
    refreshPanel();
    document.getElementById('rClose').addEventListener('click', closePanel);
    document.getElementById('rJumpGo').addEventListener('click', function () {
      /* يقبل الأرقام الهندية واللاتينية معًا */
      var raw = String(document.getElementById('rJumpIn').value || '')
        .replace(/[٠-٩]/g, function (d) { return String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)); })
        .replace(/[^\d]/g, '');
      var v = parseInt(raw, 10);
      if (v >= 1 && v <= R.total) { closePanel(); goto(v - 1); }
    });
    var jin = document.getElementById('rJumpIn');
    jin.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') document.getElementById('rJumpGo').click();
    });
    pan.querySelectorAll('[data-fs]').forEach(function (b) {
      b.addEventListener('click', function () {
        setFont(parseFloat(b.getAttribute('data-fs')));
        closePanel();
      });
    });
  }
  function markFontBtns() {
    var p = document.getElementById('rPanel');
    if (!p) return;
    p.querySelectorAll('[data-fs]').forEach(function (b) {
      b.classList.toggle('on', parseFloat(b.getAttribute('data-fs')) === R.fs);
    });
  }
  function openPanel() {
    var p = document.getElementById('rPanel');
    if (!p) return;
    p.classList.add('on');
    var sc = document.getElementById('rScrim');
    if (sc) sc.classList.add('on');
    markFontBtns();
    var inp = document.getElementById('rJumpIn');
    /* لا تركيز تلقائي: فتح الفهرس يجب ألّا يفتح لوحة المفاتيح */
    if (inp) inp.value = arD(R.cur + 1);
  }
  function closePanel() {
    var p = document.getElementById('rPanel');
    if (p) p.classList.remove('on');
    var sc = document.getElementById('rScrim');
    if (sc) sc.classList.remove('on');
  }

  function setFont(fs) {
    R.fs = fs;
    try { localStorage.setItem('ti_font', String(fs)); } catch (e) { }
    applyFont();
    layout();
    repaginate();
    markFontBtns();
  }

  /* ---------- ١٦) البحث في نص الكتاب ---------- */
  function normKeep(s) {
    return s.replace(/[أإآ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه');
  }
  function buildIndex() {
    if (R.index) return R.index;
    var idx = [];
    R.pages.forEach(function (p, pi) {
      p.items.forEach(function (it) {
        var t = it.node.textContent || '';
        if (t.trim().length > 8) idx.push({ page: pi, u: it.u, b: it.b, text: t });
      });
    });
    R.index = idx;
    return idx;
  }
  function highlightPage(pageNo, q) {
    var el = R.rendered[pageNo];
    if (!el) return;
    var nq = normKeep(q);
    var walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null);
    var nodes = [], n;
    while ((n = walker.nextNode())) if (n.nodeValue && n.nodeValue.trim()) nodes.push(n);
    nodes.forEach(function (t) {
      var s = t.nodeValue, low = normKeep(s);
      var i = low.indexOf(nq);
      if (i < 0) return;
      var frag = document.createDocumentFragment(), last = 0, j = i;
      while (j >= 0) {
        frag.appendChild(document.createTextNode(s.slice(last, j)));
        var mk = document.createElement('mark');
        mk.textContent = s.substr(j, q.length);
        frag.appendChild(mk);
        last = j + q.length;
        j = low.indexOf(nq, last);
      }
      frag.appendChild(document.createTextNode(s.slice(last)));
      t.parentNode.replaceChild(frag, t);
    });
    var mk = el.querySelector('mark');
    if (mk) mk.scrollIntoView({ block: 'center' });
  }
  window.__searchBook = function (q) {
    var sb = document.getElementById('sb');
    if (!sb) return;
    var nq = normKeep(q.trim());
    if (nq.length < 2) { sb.innerHTML = ''; return; }
    var idx = buildIndex(), res = [], i;
    for (i = 0; i < idx.length && res.length < 40; i++) {
      var low = normKeep(idx[i].text);
      var at = low.indexOf(nq);
      if (at < 0) continue;
      var st = Math.max(0, at - 40);
      res.push({
        page: idx[i].page, u: idx[i].u, b: idx[i].b,
        snip: idx[i].text.substr(st, 130),
        name: R.pages[idx[i].page] ? R.pages[idx[i].page].ch : BOOK.n
      });
    }
    if (!res.length) {
      sb.innerHTML = '<p class="nores">لا توجد نتائج</p>';
      return;
    }
    var html = '';
    res.forEach(function (r) {
      var sn = escHtml(r.snip), at = normKeep(r.snip).indexOf(nq);
      if (at >= 0) {
        sn = escHtml(r.snip.slice(0, at)) + '<em>' + escHtml(r.snip.substr(at, q.length)) +
          '</em>' + escHtml(r.snip.slice(at + q.length));
      }
      html += '<div class="res" data-p="' + r.page + '" data-q="' + escHtml(q) + '">' +
        '<b>' + escHtml(r.name) + ' — صفحة ' + arD(r.page + 1) + '</b><small>' + sn + '</small></div>';
    });
    sb.innerHTML = html;
    sb.querySelectorAll('.res').forEach(function (el) {
      el.addEventListener('click', function () {
        closeSearch();
        goto(parseInt(el.getAttribute('data-p'), 10), el.getAttribute('data-q'));
      });
    });
  };
  function escHtml(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  /* ---------- انطلاق ---------- */
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', setup);
  else setup();

  /* أداة تشخيص للقارئ — يقرأها tools/device-flow.js و tools/device-audit.js.
     لا تُنفّذ أي شيء من تلقاء نفسها ولا تغيّر سلوك التطبيق. */
  window.__TI = {
    R: R, layout: layout, render: render, paginate: paginate,
    chapAt: chapAt, updateChrome: updateChrome, openPanel: openPanel,
    goPage: function (n) { R.cur = Math.max(0, Math.min(R.total - 1, n)); render(); }
  };
})();


/* ==========================================================
   منطق الصفحات العادية (غير القارئ)
   ========================================================== */
(function () {
  'use strict';
  var PROG = 'ti_progress', STORE = 'ti_bookmarks';

  /* ---------- قبة التقدم + الشريط العلوي + السيف ---------- */
  function updateProgress() {
    if (window.__READER__) return;
    var h = document.documentElement.scrollHeight - window.innerHeight;
    var p = h > 0 ? Math.min(1, Math.max(0, window.scrollY / h)) : 1;
    if (window.__paintProgress) window.__paintProgress(p);
    if (window.__setProgress) window.__setProgress(document.body.dataset.page, p);
  }
  var tick = false;
  window.addEventListener('scroll', function () {
    if (tick) return;
    tick = true;
    requestAnimationFrame(function () { updateProgress(); tick = false; });
  }, { passive: true });
  updateProgress();

  /* ---------- تقليب الصفحة عند الانتقال ---------- */
  if (!window.__READER__) {
    /* طبقة الانتقال بين الأقسام: هيكل انتظار (Skeleton) بدل الشاشة السوداء.
       كانت الطبقة القديمة تدور بـ rotateY فتكشف زوايا الشاشة السوداء أثناء الدوران. */
    var flip = document.createElement('div');
    flip.className = 'flip';
    flip.innerHTML =
      '<div class="skl" aria-hidden="true"><div class="skl-page">' +
      '<span class="skl-h"></span>' +
      '<span class="skl-l w100"></span><span class="skl-l w96"></span>' +
      '<span class="skl-l w88"></span><span class="skl-l w94"></span>' +
      '<span class="skl-gap"></span>' +
      '<span class="skl-l w100"></span><span class="skl-l w92"></span>' +
      '<span class="skl-l w97"></span><span class="skl-l w85"></span><span class="skl-l w70"></span>' +
      '<span class="skl-gap"></span>' +
      '<span class="skl-l w100"></span><span class="skl-l w95"></span>' +
      '<span class="skl-l w90"></span><span class="skl-l w98"></span>' +
      '<span class="skl-l w76"></span>' +
      '</div></div>' +
      '<div class="skl-cap"><i></i><span>جارٍ فتح القسم…</span></div>';
    document.body.appendChild(flip);
    document.addEventListener('click', function (e) {
      var a = e.target.closest('a[href]');
      if (!a) return;
      var href = a.getAttribute('href');
      if (!href || href.charAt(0) === '#' || a.target === '_blank') return;
      if (e.metaKey || e.ctrlKey || e.shiftKey) return;
      e.preventDefault();
      flip.classList.add('go');
      /* ١٨٠ms: يكفي لرسم الهيكل قبل تفكيك الصفحة الحالية — لا فراغ ولا وميض */
      setTimeout(function () { window.location.href = href; }, 180);
    });
  }

  /* ---------- الخط الزمني الكبير: سحب بالماوس ---------- */
  [].forEach.call(document.querySelectorAll('.bigtl'), function (el) {
    var down = false, sx = 0, sl = 0;
    el.addEventListener('pointerdown', function (e) {
      down = true; sx = e.clientX; sl = el.scrollLeft;
    });
    window.addEventListener('pointermove', function (e) {
      if (!down) return;
      el.scrollLeft = sl - (e.clientX - sx);
    });
    window.addEventListener('pointerup', function () { down = false; });
  });

  /* ---------- ظهور بطاقات الأحداث تدريجياً ---------- */
  var evs = document.querySelectorAll('.ev');
  if ('IntersectionObserver' in window && evs.length) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
      });
    }, { threshold: .08 });
    evs.forEach(function (e) { io.observe(e); });
  } else {
    evs.forEach(function (e) { e.classList.add('in'); });
  }

  /* ---------- الخط الزمني: سحب وربط بالأحداث ---------- */
  var tl = document.getElementById('tl');
  if (tl) {
    var btns = tl.querySelectorAll('.tli');
    var grab = null, sx = 0, sl = 0;
    tl.addEventListener('pointerdown', function (e) {
      grab = tl.scrollLeft; sx = e.clientX; tl.style.cursor = 'grabbing';
    });
    window.addEventListener('pointermove', function (e) {
      if (grab === null) return;
      tl.scrollLeft = grab - (e.clientX - sx);
    });
    window.addEventListener('pointerup', function () { grab = null; tl.style.cursor = ''; });

    btns.forEach(function (b, i) {
      b.addEventListener('click', function () {
        var t = document.getElementById(b.dataset.target);
        if (!t) return;
        t.scrollIntoView({ behavior: 'smooth', block: 'center' });
        t.style.transition = 'box-shadow .3s';
        t.style.boxShadow = '0 0 0 3px var(--gold)';
        setTimeout(function () { t.style.boxShadow = ''; }, 1400);
      });
    });
    var io2 = 'IntersectionObserver' in window ? new IntersectionObserver(function (en) {
      en.forEach(function (e) {
        if (!e.isIntersecting) return;
        btns.forEach(function (b) { b.classList.toggle('on', b.dataset.target === e.target.id); });
      });
    }, { rootMargin: '-45% 0px -45% 0px' }) : null;
    if (io2) evs.forEach(function (e) { io2.observe(e); });
  }

  /* ---------- تنقل بالكيبورد ---------- */
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closeSearch();
  });

  /* ---------- البحث داخل الصفحة ---------- */
  var pan = document.getElementById('panel'), ov = document.getElementById('ov'),
    q = document.getElementById('q'), out = document.getElementById('out');
  var sb = document.getElementById('sb');
  var sbOriginal = sb ? sb.innerHTML : '';

  function norm(s) {
    return s.replace(/[أإآ]/g, 'ا').replace(/[ىي]/g, 'ي').replace(/ة/g, 'ه')
      .replace(/[ً-ْٰ]/g, '').replace(/\s+/g, ' ').trim();
  }
  window.openSearch = function () {
    if (!pan) return;
    pan.classList.add('on'); if (ov) ov.classList.add('on'); if (q) q.focus();
  };
  window.closeSearch = function () {
    if (pan) pan.classList.remove('on'); if (ov) ov.classList.remove('on');
  };
  window.doSearch = function (v) {
    if (v.length < 2) { if (sb) sb.innerHTML = sbOriginal; return; }
    if (window.__searchBook) { window.__searchBook(v); return; }
    if (!sb) return;
    var nq = norm(v), html = '';
    document.querySelectorAll('main section').forEach(function (sec) {
      var h2 = sec.querySelector('h2.sec');
      var title = h2 ? h2.childNodes[0].textContent.trim() : '';
      sec.querySelectorAll('article.ev, .pc, .outs li, .src li, .tli').forEach(function (it) {
        var txt = it.textContent.replace(/\s+/g, ' ');
        if (norm(txt).indexOf(nq) >= 0) {
          var at = txt.indexOf(v);
          var snip = at >= 0
            ? txt.substr(Math.max(0, at - 35), 110)
            : txt.substr(0, 110);
          html += '<div class="res" onclick="closeSearch();go(\'' + it.id + '\')">' +
            '<b>' + esc(title || '') + '</b><small>' + hl(snip, v) + '</small></div>';
        }
      });
    });
    sb.innerHTML = html || '<p class="nores">لا توجد نتائج</p>';
  };
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;'); }
  function hl(s, q2) {
    var i = s.indexOf(q2);
    if (i < 0) return esc(s);
    return esc(s.slice(0, i)) + '<em>' + esc(s.substr(i, q2.length)) + '</em>' + esc(s.slice(i + q2.length));
  }
  window.go = function (id) {
    var t = document.getElementById(id);
    if (t) t.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };
})();
