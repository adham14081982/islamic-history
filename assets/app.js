/* ===== موسوعة تاريخ الإسلام — منطق الواجهة + قارئ الكتاب =====
   يعمل على صفحات «الكتاب» (التي تحمل <script id="book">) وبقية الصفحات كما هي. */

/* هل هذه صفحة قارئ؟ يُحدَّد قبل أي تهيئة */
window.__READER__ = !!document.getElementById('book');

(function () {
  'use strict';
  var STORE = 'ti_bookmarks', THEME = 'ti_theme', PROG = 'ti_progress';

  /* ---------- تحويل الأرقام إلى هندية (وقت التشغيل) ---------- */
  function arDigits(s) {
    return String(s == null ? '' : s).replace(/\d/g, function (d) { return '٠١٢٣٤٥٦٧٨٩'[d]; });
  }
  window.arDigits = arDigits;

  /* ---------- الوضع الليلي ---------- */
  function applyTheme(d) {
    document.body.classList.toggle('dark', d);
    var b = document.getElementById('themeBtn');
    if (b) b.textContent = d ? '☀️' : '🌙';
  }
  var th = document.getElementById('themeBtn');
  if (th) th.addEventListener('click', function () {
    var d = !document.body.classList.contains('dark');
    applyTheme(d); localStorage.setItem(THEME, d ? '1' : '0');
  });
  applyTheme(localStorage.getItem(THEME) === '1');

  /* ---------- التقدّم: مشترك بين التمرير والقارئ ---------- */
  function setProgress(id, frac) {
    if (!id || id === 'home') return;
    var pr = JSON.parse(localStorage.getItem(PROG) || '{}');
    if ((pr[id] || 0) < frac) { pr[id] = frac; localStorage.setItem(PROG, JSON.stringify(pr)); }
    if (frac > 0.92) {
      var bm = JSON.parse(localStorage.getItem(STORE) || '[]');
      if (bm.indexOf(id) < 0) {
        bm.push(id); localStorage.setItem(STORE, JSON.stringify(bm));
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
    { id: 'prophets', ic: '📜', n: 'وسام النبوة', d: 'أنبياء' },
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
  window.refreshBadges = function () {
    var bm = JSON.parse(localStorage.getItem(STORE) || '[]');
    var host = document.getElementById('badges');
    if (!host) return;
    var done = BADGES.filter(function (b) {
      return b.id === 'start' ? bm.length >= 1
        : b.id === 'all' ? bm.length >= 12 : bm.indexOf(b.id) >= 0;
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

  /* ---------- إخفاء المفضلة ---------- */
  var f = document.getElementById('favBtn');
  if (f) {
    f.textContent = JSON.parse(localStorage.getItem(STORE) || '[]')
      .indexOf(document.body.dataset.page) >= 0 ? '★' : '☆';
    f.addEventListener('click', function () {
      var id = document.body.dataset.page;
      var bm = JSON.parse(localStorage.getItem(STORE) || '[]');
      var i = bm.indexOf(id);
      i >= 0 ? bm.splice(i, 1) : bm.push(id);
      localStorage.setItem(STORE, JSON.stringify(bm));
      f.textContent = i >= 0 ? '☆' : '★';
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
  var PADX = 20, PADY = 12, FOOT = 26, GAP = 12;
  var SPREAD = false;   /* وضع الكتاب المفتوح (صفحتان متقابلتان) — يُفعَّل لاحقًا */
  var R = {
    cur: 0, total: 0, pages: [], units: [], chaps: [],
    pageW: 0, pageH: 0, cw: 0, ch: 0, stageW: 0, stageH: 0,
    spread: false, fs: 1, busy: false, dir: 0, drag: null,
    rendered: {}, plan: null, index: null
  };
  window.__R = R; /* مرجع للتشخيص فقط */
  window.__go = function (n) { R.cur = Math.max(0, Math.min(n, R.total - 1)); render(); }; /* لفحص الصفحات */

  var stage, meas, measBody, leaf, leafFront, leafBack, chapEl, progEl, prevBtn, nextBtn;

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
    chapEl = document.getElementById('rBrand');
    progEl = document.getElementById('rProg');
    prevBtn = document.getElementById('rPrev');
    nextBtn = document.getElementById('rNext');

    meas = document.createElement('div');
    meas.className = 'rmeas';
    meas.innerHTML = '<div class="rbody"></div>';
    stage.appendChild(meas);
    measBody = meas.firstChild;

    R.fs = parseFloat(localStorage.getItem('ti_font') || '1') || 1;
    applyFont();

    /* القياس قبل استقرار الخطوط يعطي عدد صفحات مختلفًا في كل تحميل (٢٧٥ / ٢٧٩ / ٢٨١)،
       فنؤجّل أول ترقيم حتى تنتهي محاولة تحميل الخطوط (نجاحًا أو فشلًا). */
    var booted = false;
    function boot() {
      if (booted) return;
      booted = true;

      layout();
      buildUnits();

      var ok = loadPlan();
      if (!ok) { paginate(); savePlan(); }

      var saved = parseInt(localStorage.getItem('ti_pos_' + PGID) || '0', 10);
      R.cur = (saved > 0 && saved <= R.total) ? saved - 1 : 0;

      /* قفزة مباشرة إلى صفحة (للاختبار): seerah.html?p=12 */
      var m = /[?&#]p=(\d+)/.exec(location.href);
      if (m) { var jp = parseInt(m[1], 10); if (jp >= 1 && jp <= R.total) R.cur = jp - 1; }

      render();
      buildPanel();
      wire();
      document.body.classList.add('rready');
    }

    var fontsReady = Promise.resolve();
    if (document.fonts && document.fonts.load) {
      fontsReady = Promise.all([
        document.fonts.load('1em Amiri'),
        document.fonts.load('1em Cairo')
      ]).catch(function () { });
    }
    /* مهلة أمان: لو علِق الطلب لا نُجمّد القارئ */
    var safety = new Promise(function (res) { setTimeout(res, 2500); });
    Promise.race([fontsReady, safety]).then(function () {
      /* نفس طفيف: حتى بعد list/ready قد يحتاج المتصفح لحظة لتطبيق القياسات الجديدة */
      setTimeout(boot, 50);
    });
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
    R.ch = R.pageH - PADY * 2 - FOOT;
    stage.style.setProperty('--pw', R.pageW + 'px');
    stage.style.setProperty('--ph', R.pageH + 'px');
    stage.style.setProperty('--ch', R.ch + 'px');
    meas.style.width = R.cw + 'px';
  }

  /* ---------- ٣) تحويل HTML إلى كتل ---------- */
  function buildUnits() {
    R.units = BOOK.units.map(function (u, ui) {
      var tpl = document.createElement('template');
      tpl.innerHTML = u.h;
      var root = tpl.content.firstElementChild;
      var blocks = u.one ? [root] : Array.prototype.slice.call(root.children)
        .filter(function (el) { return !(el.matches && el.matches('.crn,.orn,.porn,svg')); });
      return { ui: ui, u: u.u, id: u.id, n: u.n, ic: u.ic || '', blocks: blocks };
    });
  }

  /* ---------- ٤) القياس ---------- */
  function measureAll(nodes) {
    measBody.innerHTML = '';
    var fr = document.createDocumentFragment(), i;
    for (i = 0; i < nodes.length; i++) fr.appendChild(nodes[i].cloneNode(true));
    measBody.appendChild(fr);
    measBody.appendChild(document.createElement('div'));
    var kids = measBody.children, n = nodes.length, hs = [];
    for (i = 0; i < n; i++) hs.push(kids[i + 1].offsetTop - kids[i].offsetTop);
    measBody.innerHTML = '';
    return hs;
  }
  function measureOne(node) {
    measBody.innerHTML = '';
    measBody.appendChild(node.cloneNode(true));
    measBody.appendChild(document.createElement('div'));
    var k = measBody.children;
    var h = k[1].offsetTop - k[0].offsetTop;
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
  function splitBlock(el, kind, a, e, avail) {
    if (avail < 70) return null;
    if (kind === 'tx' || kind === 'qt') {
      var full = textOf(el);
      /* عتبة منخفضة: كان ٢٤٠/٢٠٠ حرفًا فيترك فراغًا كبيرًا في أسفل الصفحات
         حين تأتي فقرة متوسطة لا تسع كاملة. نسمح بالقسمة ما دامت البقية سطرًا معتبرًا. */
      if (e - a < 90) return null;
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
      /* لا نُبقِي ذيلًا قصيرًا جدًا (سطرًا مبتورًا) ولا رأسًا قصيرًا جدًا */
      if ((cut - a) < 70 || (e - cut) < 50) return null;
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
      var ul = (li.classList && li.classList.contains('toc-part')) ? li.querySelector('ul') : null;
      if (ul) {
        rows.push({ kind: 'p', node: li });
        Array.prototype.slice.call(ul.children).forEach(function (c) { rows.push({ kind: 'c', node: c }); });
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
    /* لا تترك عنوان قسم وحده في آخر الصفحة بلا فصول */
    while (best > a + 1 && rows[best - 1] && rows[best - 1].kind === 'p') best--;
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
  function paginate() {
    var pages = [], cur = { items: [], ch: '' }, curH = 0;
    R.chaps = []; R.partPages = {};

    function flush() {
      if (cur.items.length) pages.push(cur);
      cur = { items: [], ch: cur.ch }; curH = 0;
    }
    function add(u, b, d, node) { cur.items.push({ u: u, b: b, d: d, node: node }); curH += measureOne(node); }

    for (var ui = 0; ui < R.units.length; ui++) {
      var unit = R.units[ui];
      flush();
      cur.ch = unit.n;
      if (unit.u === 'c') R.chaps.push({ id: unit.id, n: unit.n, ic: unit.ic, page: pages.length + 1 });
      if (unit.u === 'p') R.partPages[unit.id] = pages.length + 1;

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
        if (isHeading(it.node) && cur.items.length) {
          var nx = q[qi + 1];
          var nh = nx ? Math.min(nx.h, 100) : 0;
          if (curH + it.h + nh > R.ch) { flush(); cur.ch = unit.n; continue; }
        }

        if (curH + it.h <= R.ch) {
          /* it.d موجود إذا كان هذا الجزء بقية كتلة قُسِّمت: نحفظ وصفه لا 'full'
             وإلا أعاد بناءُ الخطة عند التحميل التالي الكتلةَ كاملة (تكرار النص) */
          cur.items.push({ u: ui, b: it.b, d: it.d || { k: 'full' }, node: it.node });
          curH += it.h; qi++; continue;
        }

        /* لا يسع: قسّم إن أمكن */
        if (cur.items.length) {
          var sp = splitBlock(it.orig, it.kind, it.a, it.e, R.ch - curH);
          if (sp) {
            cur.items.push({ u: ui, b: it.b, d: sp[0].d, node: sp[0].node });
            flush(); cur.ch = unit.n;
            q[qi] = { b: it.b, orig: it.orig, node: sp[1].node, h: measureOne(sp[1].node),
              d: sp[1].d, a: sp[1].d.a, e: (sp[1].d.e !== undefined ? sp[1].d.e : sp[1].d.b), kind: it.kind };
            continue;
          }
          flush(); cur.ch = unit.n; continue;
        }

        /* صفحة فارغة ولا زال لا يسع */
        var sp2 = splitBlock(it.orig, it.kind, it.a, it.e, R.ch);
        if (sp2) {
          cur.items.push({ u: ui, b: it.b, d: sp2[0].d, node: sp2[0].node });
          flush(); cur.ch = unit.n;
          q[qi] = { b: it.b, orig: it.orig, node: sp2[1].node, h: measureOne(sp2[1].node),
            d: sp2[1].d, a: sp2[1].d.a, e: (sp2[1].d.e !== undefined ? sp2[1].d.e : sp2[1].d.b), kind: it.kind };
          continue;
        }
        cur.items.push({ u: ui, b: it.b, d: { k: 'full' }, node: it.node });
        curH += it.h; qi++;
      }
    }
    flush();

    R.pages = pages;
    R.total = pages.length;
    R.plan = {
      v: 7, w: R.cw, h: R.ch, fs: R.fs, spread: R.spread,
      sig: R.units.length + ':' + R.units.reduce(function (a, u) { return a + u.blocks.length; }, 0),
      chaps: R.chaps,
      pages: pages.map(function (p) {
        return { ch: p.ch, items: p.items.map(function (it) { return { u: it.u, b: it.b, d: it.d }; }) };
      })
    };
  }

  /* ---------- ١٠) الخطة المخزَّنة ---------- */
  function planKey() { return 'ti_plan_' + PGID + '_' + R.cw + 'x' + R.ch + '_' + R.fs; }
  function loadPlan() {
    try {
      var raw = localStorage.getItem(planKey());
      if (!raw) return false;
      var pl = JSON.parse(raw);
      if (!pl || pl.v !== 7 || (pl.pages.length !== undefined && !pl.pages.length)) return false;
      /* بصمة المحتوى: إذا تغيّر عدد الوحدات أو الكتل فالخطة قديمة ولا تصلح */
      var sig = R.units.length + ':' + R.units.reduce(function (a, u) { return a + u.blocks.length; }, 0);
      if (pl.sig !== sig) return false;
      R.chaps = pl.chaps || [];
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
    try { localStorage.setItem(planKey(), JSON.stringify(R.plan)); }
    catch (e) { /* المساحة ممتلئة: تجاهل */ }
  }

  /* ---------- ١١) العرض ---------- */
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
    fsep.textContent = ' / ';
    var ftot = document.createElement('span');
    ftot.textContent = arD(R.total);
    foot.appendChild(fcur); foot.appendChild(fsep); foot.appendChild(ftot);
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
    R.chaps.forEach(function (c) {
      var a = document.createElement('a');
      a.className = 'rpitem';
      a.href = 'javascript:void(0)';
      a.innerHTML = '<i>' + arD(c.page) + '</i><span>' + (c.ic ? c.ic + ' ' : '') + c.n + '</span>';
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

  /* إن تجاوز المحتوى حدود الصفحة: أعد الترقيم بقياس جديد، ثم قلّل الارتفاع إن لزم.
     الحد الأقصى محاولتين ثم توقّف — وإلا دارت الحلقة بلا نهاية عند كتلة لا تُقسَّم. */
  function checkOverflow() {
    if (R.checking) return;
    var over = 0;
    for (var k in R.rendered) {
      var b = R.rendered[k].querySelector('.rbody');
      if (!b || b.classList.contains('rflow')) continue;
      /* قِس آخر عنصر فعليًا: الهوامش الختامية لا تُحتسب فيضًا */
      var last = b.lastElementChild;
      if (!last) continue;
      var d = Math.round(last.getBoundingClientRect().bottom - b.getBoundingClientRect().bottom);
      if (d > 2) over = Math.max(over, d);   /* تسامح ٢بك: نزول الحروف العربية تحت السطر */
    }
    if (over <= 2) return;
    if (R.ovN >= 3 || R.ch <= 142) return;
    R.ovN = (R.ovN || 0) + 1;
    R.checking = true;
    /* قلّل ارتفاع العمود بقدر الفيض وأعد الترقيم: القياس النظري أقلّ من الواقع بعد استقرار الخط */
    R.ch = Math.max(142, R.ch - Math.min(30, over + 4));
    R.refixed = true;
    paginate(); savePlan();
    R.checking = false;
    R.cur = Math.min(R.cur, R.total - 1);
    setTimeout(render, 0);
  }

  function repaginate() {
    var keep = R.cur;
    paginate();
    savePlan();
    R.cur = Math.min(keep, R.total - 1);
    render();
  }

  function updateChrome() {
    var fr = R.total ? (R.cur + 1) / R.total : 0;
    document.body.setAttribute('data-dbg', 'cur=' + R.cur + ' total=' + R.total +
      ' rendered=' + Object.keys(R.rendered).join(',') + ' busy=' + R.busy +
      ' pages=' + R.pages.length + ' ch=' + R.ch);
    if (progEl) progEl.style.width = Math.round(fr * 100) + '%';
    if (chapEl) chapEl.textContent = (R.pages[R.cur] && R.pages[R.cur].ch) || BOOK.n;
    if (window.__paintProgress) window.__paintProgress(fr);
    if (window.__setProgress) window.__setProgress(PGID, fr);
    try { localStorage.setItem('ti_pos_' + PGID, String(R.cur + 1)); } catch (e) { }
    if (prevBtn) prevBtn.disabled = (R.cur <= 0);
    if (nextBtn) nextBtn.disabled = (R.cur >= R.total - 1);
    var st = document.querySelector('[data-stat="pages"]');
    if (st) st.textContent = arD(R.total);
  }

  /* ---------- ١٢) الانتقال ---------- */
  function goto(n, hl) {
    n = clamp(n, 0, R.total - 1);
    if (n === R.cur && !hl) { return; }
    R.cur = n;
    render();
    if (hl) setTimeout(function () { highlightPage(n, hl); }, 30);
  }

  /* ---------- ١٣) التقليب ---------- */
  function startFlip(dir) {
    if (R.busy) return false;
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
    if (curEl) { curEl.style.visibility = 'hidden'; curEl.style.zIndex = 1; }
    destEl.style.visibility = 'visible';
    destEl.style.zIndex = 2;
    return true;
  }
  function setAngle(deg) {
    leaf.style.transition = 'none';
    leaf.style.transform = 'rotateY(' + deg + 'deg)';
    var a = Math.abs(deg) / 180;
    leaf.style.setProperty('--a', a.toFixed(3));
  }
  /* زمن التقليب: أبطأ وأثقل حتى لا يمرّ الفصل مرورًا خاطفًا */
  var FLIP_MS = 620, FLIP_BACK_MS = 360;
  function commitFlip() {
    leaf.style.transition = 'transform ' + (FLIP_MS / 1000) + 's cubic-bezier(.30,.62,.28,1)';
    leaf.style.transform = 'rotateY(' + (R.dir > 0 ? 180 : -180) + 'deg)';
    leaf.style.setProperty('--a', '1');
    setTimeout(function () {
      leaf.classList.remove('on');
      leafFront.innerHTML = '';
      R.cur = clamp(R.cur + R.dir, 0, R.total - 1);
      R.busy = false; R.dir = 0;
      render();
    }, FLIP_MS + 40);
  }
  function cancelFlip() {
    leaf.style.transition = 'transform ' + (FLIP_BACK_MS / 1000) + 's cubic-bezier(.25,.7,.3,1)';
    leaf.style.transform = 'rotateY(0deg)';
    leaf.style.setProperty('--a', '0');
    setTimeout(function () {
      leaf.classList.remove('on');
      leafFront.innerHTML = '';
      R.busy = false; R.dir = 0;
      render();
    }, FLIP_BACK_MS + 40);
  }
  function flipTo(dir) {
    try {
      if (!startFlip(dir)) { document.body.setAttribute('data-dbg', 'flip-refused dir=' + dir + ' busy=' + R.busy + ' cur=' + R.cur + ' total=' + R.total); return; }
      commitFlip();
    } catch (err) {
      document.body.setAttribute('data-dbg', 'flip-error ' + (err && err.message));
    }
  }

  /* ---------- ١٤) اللمس والسحب ---------- */
  function wire() {
    stage.addEventListener('pointerdown', onDown, { passive: true });
    window.addEventListener('pointermove', onMove, { passive: false });
    window.addEventListener('pointerup', onUp, { passive: true });
    window.addEventListener('pointercancel', onUp, { passive: true });

    if (prevBtn) prevBtn.addEventListener('click', function () { flipTo(-1); });
    if (nextBtn) nextBtn.addEventListener('click', function () { flipTo(1); });
    var menu = document.getElementById('rMenu');
    if (menu) menu.addEventListener('click', openPanel);
    var pbtn = document.getElementById('rProgBtn');
    if (pbtn) pbtn.addEventListener('click', openPanel);

    /* الروابط الداخلية (فهرس الفصول) تقفز إلى الصفحة */
    stage.addEventListener('click', function (e) {
      var a = e.target.closest('a[href^="#"]');
      if (!a) return;
      e.preventDefault();
      var id = a.getAttribute('href').slice(1);
      var ci = R.chaps.filter(function (c) { return c.id === id; })[0];
      if (ci) { closePanel(); goto(ci.page - 1); }
    });

    var t = null;
    window.addEventListener('resize', function () {
      clearTimeout(t);
      t = setTimeout(function () {
        layout();
        repaginate();
      }, 220);
    });

    document.addEventListener('backbutton', function (e) {
      if (R.cur > 0) { e.preventDefault(); goto(R.cur - 1); }
      else { e.preventDefault(); location.href = 'index.html'; }
    });
  }

  function onDown(e) {
    if (R.busy) return;
    if (e.target.closest('a,button,input,select')) return;
    R.drag = { x0: e.clientX, y0: e.clientY, dir: 0, t0: Date.now(), active: false };
  }
  function onMove(e) {
    if (!R.drag || R.busy) return;
    var dx = e.clientX - R.drag.x0, dy = e.clientY - R.drag.y0;
    if (!R.drag.active) {
      if (Math.abs(dx) < 12 || Math.abs(dx) < Math.abs(dy)) return;
      R.drag.active = true;
      R.drag.dir = dx > 0 ? 1 : -1;
      if (!startFlip(R.drag.dir)) { R.drag = null; return; }
    }
    e.preventDefault();
    var deg = clamp((dx / R.pageW) * 180, -180, 180);
    setAngle(deg);
  }
  function onUp(e) {
    if (!R.drag) return;
    var d = R.drag; R.drag = null;
    if (!d.active) {
      /* نقر على الحافة: يسار = التالي، يمين = السابق */
      var r = stage.getBoundingClientRect();
      var rel = (e.clientX - r.left) / r.width;
      if (rel < 0.28) flipTo(1);
      else if (rel > 0.72) flipTo(-1);
      return;
    }
    var dx = e.clientX - d.x0;
    var dt = Math.max(1, Date.now() - d.t0);
    var fast = Math.abs(dx) / dt > 0.5;
    var far = Math.abs(dx) > R.pageW * 0.32;
    if ((fast || far) && Math.sign(dx) === d.dir) commitFlip();
    else cancelFlip();
  }

  /* ---------- ١٥) لوحة الفهرس والذهاب إلى صفحة ---------- */
  function buildPanel() {
    var pan = document.createElement('div');
    pan.className = 'rpanel';
    pan.id = 'rPanel';
    pan.innerHTML =
      '<div class="rphead"><b>الذهاب إلى صفحة</b><button class="ib" id="rClose" title="إغلاق">✕</button></div>' +
      '<div class="rpjump"><input type="number" id="rJumpIn" min="1" placeholder="رقم الصفحة">' +
      '<button class="rpgo" id="rJumpGo">انتقل</button></div>' +
      '<div class="rpfont"><span>حجم الخط</span>' +
      '<button data-fs="0.9">ص</button><button data-fs="1">م</button>' +
      '<button data-fs="1.12">ك</button><button data-fs="1.25">ج</button></div>' +
      '<div class="rplist" id="rPlist"></div>' +
      '<a class="rphome" href="index.html">فهرس الموسوعة</a>';
    document.body.appendChild(pan);
    refreshPanel();
    document.getElementById('rClose').addEventListener('click', closePanel);
    document.getElementById('rJumpGo').addEventListener('click', function () {
      var v = parseInt(document.getElementById('rJumpIn').value, 10);
      if (v >= 1 && v <= R.total) { closePanel(); goto(v - 1); }
    });
    pan.querySelectorAll('[data-fs]').forEach(function (b) {
      b.addEventListener('click', function () {
        setFont(parseFloat(b.getAttribute('data-fs')));
        closePanel();
      });
    });
  }
  function openPanel() {
    var p = document.getElementById('rPanel');
    if (!p) return;
    p.classList.add('on');
    var inp = document.getElementById('rJumpIn');
    if (inp) { inp.max = R.total; inp.value = R.cur + 1; inp.focus(); }
  }
  function closePanel() {
    var p = document.getElementById('rPanel');
    if (p) p.classList.remove('on');
  }

  function setFont(fs) {
    R.fs = fs;
    try { localStorage.setItem('ti_font', String(fs)); } catch (e) { }
    applyFont();
    layout();
    repaginate();
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
      sb.innerHTML = '<p style="text-align:center;color:var(--muted);padding:2rem">لا توجد نتائج</p>';
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
    var flip = document.createElement('div');
    flip.className = 'flip';
    document.body.appendChild(flip);
    document.addEventListener('click', function (e) {
      var a = e.target.closest('a[href]');
      if (!a) return;
      var href = a.getAttribute('href');
      if (!href || href.charAt(0) === '#' || a.target === '_blank') return;
      if (e.metaKey || e.ctrlKey || e.shiftKey) return;
      e.preventDefault();
      document.querySelector('main').classList.add('flip-out');
      flip.classList.add('go');
      setTimeout(function () { window.location.href = href; }, 320);
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
    sb.innerHTML = html || '<p style="text-align:center;color:var(--muted);padding:2rem">لا توجد نتائج</p>';
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
