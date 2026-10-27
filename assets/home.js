/* الرئيسية: البحث الشامل عبر الحقب + بطاقة «أكمل القراءة»
   يُحمَّل بـdefer من index.html، ويعتمد على window.__ERAS__ (مولَّد في site.js)
   وفهرس البحث assets/search-data.js (مولَّد بـtools/searchindex.js، يُحمَّل عند أول بحث). */
(function () {
  'use strict';

  var AR = '٠١٢٣٤٥٦٧٨٩';

  function ar(x) {
    return String(x == null ? '' : x).replace(/\d/g, function (d) { return AR.charAt(+d); });
  }
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  /* توحيد عربي: تشكيل وتطويل وألف وياء وتاء وأرقام */
  function norm(s) {
    return String(s == null ? '' : s)
      .replace(/[\u064B-\u0652\u0670\u0640]/g, '')
      .replace(/[أإآٱ]/g, 'ا')
      .replace(/ى/g, 'ي')
      .replace(/ة/g, 'ه')
      .replace(/ؤ/g, 'و')
      .replace(/ئ/g, 'ي')
      .replace(/[٠-٩]/g, function (d) { return String(AR.indexOf(d)); })
      .toLowerCase();
  }
  /* نمط يطابق صيغ الحرف المختلفة (أ/ا، ة/ه، ى/ي…) لتظليل الكلمة في النص الأصلي */
  function looseRe(term) {
    var map = { 'ا': '[اأإآٱ]', 'ي': '[يى]', 'ه': '[هة]', 'و': '[وؤ]', 'ئ': '[ئي]' };
    var out = '';
    for (var i = 0; i < term.length; i++) {
      var ch = term.charAt(i);
      out += map[ch] || ch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }
    return new RegExp(out, 'g');
  }

  /* ---------------- البحث ---------------- */
  var inp = document.getElementById('gq');
  var box = document.getElementById('gsres');
  var loading = false, cache = null, tmr = null;

  function loadIndex(cb) {
    if (window.__SEARCH__) { cb(); return; }
    if (loading) { setTimeout(function () { loadIndex(cb); }, 60); return; }
    loading = true;
    var s = document.createElement('script');
    s.src = 'assets/search-data.js';
    s.onload = function () { loading = false; cb(); };
    s.onerror = function () {
      loading = false;
      box.className = 'gsres on';
      box.innerHTML = '<p class="gempty">تعذّر تحميل فهرس البحث.</p>';
    };
    document.head.appendChild(s);
  }

  function mark(text, terms) {
    var s = esc(text);
    for (var i = 0; i < terms.length; i++) {
      if (terms[i].length < 2) continue;
      try { s = s.replace(looseRe(terms[i]), '<mark>$&</mark>'); } catch (e) { }
    }
    return s;
  }
  function clip(t, terms) {
    var nt = norm(t), pos = -1, i;
    for (i = 0; i < terms.length; i++) {
      var p = nt.indexOf(terms[i]);
      if (p >= 0) { pos = p; break; }
    }
    if (pos < 0) pos = 0;
    var a = Math.max(0, pos - 40), b = Math.min(t.length, pos + 150);
    return (a > 0 ? '… ' : '') + t.slice(a, b) + (b < t.length ? ' …' : '');
  }

  function render(hits, terms, q) {
    if (!hits.length) {
      box.className = 'gsres on';
      box.innerHTML = '<p class="gempty">لا نتائج لـ «' + esc(q) + '»</p>';
      return;
    }
    var S = window.__SEARCH__, groups = {}, order = [];
    hits.forEach(function (h) {
      var ei = S.c[h.ci][0];
      if (!groups[ei]) { groups[ei] = []; order.push(ei); }
      groups[ei].push(h);
    });
    var html = '<div class="gmeta">' + ar(hits.length) + ' نتيجة في ' + ar(order.length) + ' حقبة</div>';
    order.forEach(function (ei) {
      var e = S.eras[ei];
      html += '<div class="ge">' + esc(e[2]) + '</div>';
      groups[ei].forEach(function (h) {
        var ch = S.c[h.ci];
        html += '<a class="grow" href="' + e[1] + '?c=' + encodeURIComponent(ch[1]) + '">' +
          '<b>' + esc(ch[2]) + '</b><span>' + mark(clip(h.text, terms), terms) + '</span></a>';
      });
    });
    box.className = 'gsres on';
    box.innerHTML = html;
  }

  function run() {
    if (!inp || !box) return;
    var q = inp.value.trim();
    if (norm(q).length < 2) { box.className = 'gsres'; box.innerHTML = ''; return; }
    loadIndex(function () {
      var S = window.__SEARCH__;
      var terms = norm(q).split(/\s+/).filter(Boolean);
      /* مسافات/علامات فقط: لا كلمات للبحث عنها. بدون هذا الفحص كان
         `every` على مصفوفة فارغة يعيد true فتظهر كل الفصول كأنها نتائج. */
      if (!terms.length) { box.className = 'gsres'; box.innerHTML = ''; return; }
      if (!cache || cache.length !== S.i.length) cache = new Array(S.i.length);
      var hits = [], seen = {}, i, k;
      for (i = 0; i < S.i.length; i++) {
        var txt = S.i[i][2], kind = S.i[i][1];
        var nt = cache[i] || (cache[i] = norm(txt));
        var all = true;
        for (k = 0; k < terms.length; k++) { if (nt.indexOf(terms[k]) < 0) { all = false; break; } }
        if (!all) continue;
        var ci = S.i[i][0];
        var score = (kind === 0 ? 1000 : 100) + Math.max(0, 80 - nt.indexOf(terms[0]));
        if (seen[ci] !== undefined) {
          if (hits[seen[ci]].score < score) hits[seen[ci]] = { ci: ci, score: score, text: txt };
        } else {
          seen[ci] = hits.length;
          hits.push({ ci: ci, score: score, text: txt });
        }
      }
      hits.sort(function (a, b) { return b.score - a.score; });
      render(hits.slice(0, 40), terms, q);
    });
  }

  if (inp && box) {
    inp.addEventListener('input', function () { clearTimeout(tmr); tmr = setTimeout(run, 150); });
    inp.addEventListener('focus', function () { loadIndex(function () { }); });
    inp.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { inp.blur(); box.className = 'gsres'; }
      if (e.key === 'Enter') { clearTimeout(tmr); run(); }
    });
    var gb = document.getElementById('gqBtn');
    if (gb) gb.addEventListener('click', function () { clearTimeout(tmr); run(); });
  }

  /* ---------------- أكمل القراءة ---------------- */
  (function () {
    var w = document.getElementById('contWrap');
    if (!w) return;
    var E = window.__ERAS__ || {};
    var last = null;
    try { last = JSON.parse(localStorage.getItem('ti_last') || 'null'); } catch (e) { }
    if (!last || !last.e || !E[last.e]) return;
    var e = E[last.e];
    /* الرابط بالفصل وموضعه داخله لا برقم الصفحة: رقم الصفحة يتغيّر بتغيّر مقاس الشاشة أو حجم الخط */
    var href = last.c
      ? e.file + '?c=' + encodeURIComponent(last.c) + '&n=' + (last.o || 0)
      : e.file + '?p=' + (last.p || 1);
    var title = last.n || e.n;
    var sub = last.n ? esc(e.n) + ' · صفحة ' + ar((last.o || 0) + 1) + ' من الفصل'
                     : 'صفحة ' + ar(last.p || 1);
    w.innerHTML = '<a class="cont" href="' + href + '">' +
      '<span class="ci">' + (e.ic || '📖') + '</span>' +
      '<span class="ct"><small>أكمل القراءة</small><b>' + esc(title) + '</b>' +
      '<em>' + sub + '</em></span>' +
      '<span class="ca"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5 L8 12 L15 19"/></svg></span></a>';
  })();

  /* ---------------- المفضلة ----------------
     تُخزَّن في ti_fav منفصلةً عن ti_bookmarks (الإتمام/الأوسمة).
     تُعرض هنا لأن الزر في القارئ لا يكفي: بدونه لا يرى المستخدم ما حفظه. */
  (function () {
    var host = document.getElementById('favWrap');
    if (!host) return;
    var E = window.__ERAS__ || {};

    function read() {
      try {
        var a = JSON.parse(localStorage.getItem('ti_fav') || '[]');
        return Object.prototype.toString.call(a) === '[object Array]' ? a : [];
      } catch (e) { return []; }
    }
    function save(list) {
      try { localStorage.setItem('ti_fav', JSON.stringify(list)); } catch (e) { }
    }

    function draw() {
      var fav = read().filter(function (id) { return E[id]; });
      if (!fav.length) { host.innerHTML = ''; return; }
      var rows = fav.map(function (id) {
        var e = E[id];
        return '<div class="favrow"><a class="cont" href="' + e.file + '">' +
          '<span class="ci">' + (e.ic || '📖') + '</span>' +
          '<span class="ct"><small>في المفضلة</small><b>' + esc(e.n) + '</b></span>' +
          '</a><button class="favdel" type="button" data-id="' + esc(id) +
          '" aria-label="إزالة ' + esc(e.n) + ' من المفضلة" title="إزالة من المفضلة">✕</button></div>';
      }).join('');
      host.innerHTML = '<h2 class="sec">المفضلة <span class="n">' + ar(fav.length) +
        ' حقبة محفوظة</span></h2>' + rows;
      host.querySelectorAll('.favdel').forEach(function (b) {
        b.addEventListener('click', function () {
          var id = b.getAttribute('data-id');
          save(read().filter(function (x) { return x !== id; }));
          draw();
        });
      });
    }
    draw();
    /* العودة من القارئ قد تأتي من ذاكرة bfcache بلا إعادة تنفيذ: نُحدّث عند الظهور */
    window.addEventListener('pageshow', function (e) { if (e.persisted) draw(); });
  })();
})();
