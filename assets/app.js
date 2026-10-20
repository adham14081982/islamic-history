/* ===== موسوعة تاريخ الإسلام — منطق الواجهة ===== */
(function () {
  var K = 'ti_', STORE = 'ti_bookmarks', THEME = 'ti_theme', PROG = 'ti_progress';

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

  /* ---------- قبة التقدم + الشريط العلوي + السيف ---------- */
  var domeFill = document.querySelector('.dome .fill');
  var topBar = document.querySelector('.topbar i');
  var swordBl = document.querySelector('.sword .bl');
  var swordTx = document.querySelector('.sword span');
  function updateProgress() {
    var h = document.documentElement.scrollHeight - window.innerHeight;
    var p = h > 0 ? Math.min(1, Math.max(0, window.scrollY / h)) : 1;
    var pc = Math.round(p * 100);
    if (domeFill) domeFill.style.opacity = (0.12 + p * 0.88).toFixed(2);
    if (topBar) topBar.style.width = pc + '%';
    if (swordBl) swordBl.style.clipPath = 'inset(0 ' + (100 - pc) + '% 0 0)';
    if (swordTx) swordTx.textContent = 'القراءة ' + pc + '٪';
    var id = document.body.dataset.page;
    if (!id || id === 'home') return;
    var pr = JSON.parse(localStorage.getItem(PROG) || '{}');
    if ((pr[id] || 0) < p) { pr[id] = p; localStorage.setItem(PROG, JSON.stringify(pr)); }
    if (p > 0.92) {
      var bm = JSON.parse(localStorage.getItem(STORE) || '[]');
      if (bm.indexOf(id) < 0) { bm.push(id); localStorage.setItem(STORE, JSON.stringify(bm)); }
      if (typeof window.refreshBadges === 'function') window.refreshBadges();
    }
  }
  var tick = false;
  window.addEventListener('scroll', function () {
    if (tick) return;
    tick = true;
    requestAnimationFrame(function () { updateProgress(); tick = false; });
  }, { passive: true });
  updateProgress();

  /* ---------- تقليب الصفحة عند الانتقال ---------- */
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

  /* ---------- نظام الأوسمة ---------- */
  var BADGES = [
    { id: 'start',      ic: '🌱', n: 'نَبتُ الطريق',   d: 'ابدأ أول حقبة' },
    { id: 'prophets',   ic: '📜', n: 'وسام النبوة',    d: 'أنبياء' },
    { id: 'seerah',     ic: '🕊️', n: 'وسام الرحمة',    d: 'السيرة' },
    { id: 'rashidun',   ic: '⚔️', n: 'وسام الفاروق',   d: 'الراشدون' },
    { id: 'umayyad',    ic: '🏛️', n: 'وسام البناء',    d: 'الأموية' },
    { id: 'andalus',    ic: '🏰', n: 'وسام الأندلس',   d: 'الأندلس' },
    { id: 'abbasid',    ic: '📚', n: 'وسام الفجر',     d: 'العباسية' },
    { id: 'crusades',   ic: '🛡️', n: 'وسام حطين',      d: 'الصليبيون' },
    { id: 'mamluk',     ic: '🐎', n: 'وسام النصر',     d: 'المماليك' },
    { id: 'ottoman',    ic: '🕌', n: 'وسام السلطان',   d: 'العثمانيون' },
    { id: 'civilization', ic: '🔬', n: 'وسام العقل',    d: 'الحضارة' },
    { id: 'modern',     ic: '🕰️', n: 'وسام التاريخ',   d: 'العصر الحديث' },
    { id: 'all',        ic: '👑', n: 'تاج المؤرخ',     d: 'كل الحقب' }
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
    if (c) c.textContent = done.length + ' من ' + BADGES.length;
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
    pan.classList.add('on'); ov.classList.add('on'); q.focus();
  };
  window.closeSearch = function () { pan.classList.remove('on'); ov.classList.remove('on'); };
  window.doSearch = function (v) {
    if (v.length < 2) { sb.innerHTML = sbOriginal; return; }
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
    return esc(s.slice(0, i)) + '<em>' + esc(q2) + '</em>' + esc(s.slice(i + q2.length));
  }
  window.go = function (id) {
    var t = document.getElementById(id);
    if (t) t.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };
})();