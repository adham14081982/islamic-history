/* مولّد خرائط الحقب — ١٣ خريطة SVG من أساس جغرافي واحد.
   الاستعمال: node tools/maps/build.js
   الناتج: assets/img/maps/*.svg  (viewBox 0 0 1000 640 — نسبة 8:5) */
const fs = require('fs');
const path = require('path');
const G = require('./geo');

const OUT = path.join(__dirname, '..', '..', 'assets', 'img', 'maps');
fs.mkdirSync(OUT, { recursive: true });

const W = 1000, H = 640, A = W / H;

/* ---------- الإسقاط ---------- */
function makeProj(bbox) {
  let [lon0, lon1, lat0, lat1] = bbox;
  const latMid = (lat0 + lat1) / 2;
  const k = Math.cos(latMid * Math.PI / 180);
  const wDeg = (lon1 - lon0) * k, hDeg = lat1 - lat0;
  if (wDeg / hDeg < A) {
    const need = hDeg * A / k, c = (lon0 + lon1) / 2;
    lon0 = c - need / 2; lon1 = c + need / 2;
  } else {
    const need = wDeg / A, c = (lat0 + lat1) / 2;
    lat0 = c - need / 2; lat1 = c + need / 2;
  }
  const kmPerPx = 111.32 * k * (lon1 - lon0) / W;
  return {
    win: [lon0, lon1, lat0, lat1],
    kmPerPx,
    p(lon, lat) {
      return [
        (lon - lon0) / (lon1 - lon0) * W,
        (lat1 - lat) / (lat1 - lat0) * H
      ];
    }
  };
}

const n1 = (v) => Math.round(v * 10) / 10;

/* ---------- تنعيم (كاتمول-روم ← بيزييه) ---------- */
function smooth(pts, proj, closed, tension) {
  const t = tension === undefined ? 1 : tension;
  const P = pts.map((q) => proj.p(q[0], q[1]));
  const n = P.length;
  if (n < 3) return 'M' + P.map((q) => n1(q[0]) + ' ' + n1(q[1])).join(' L');
  const at = (i) => closed ? P[((i % n) + n) % n] : P[Math.max(0, Math.min(n - 1, i))];
  let d = 'M' + n1(P[0][0]) + ' ' + n1(P[0][1]);
  const segs = closed ? n : n - 1;
  for (let i = 0; i < segs; i++) {
    const p0 = at(i - 1), p1 = at(i), p2 = at(i + 1), p3 = at(i + 2);
    const c1x = p1[0] + (p2[0] - p0[0]) / 6 * t, c1y = p1[1] + (p2[1] - p0[1]) / 6 * t;
    const c2x = p2[0] - (p3[0] - p1[0]) / 6 * t, c2y = p2[1] - (p3[1] - p1[1]) / 6 * t;
    d += 'C' + n1(c1x) + ' ' + n1(c1y) + ' ' + n1(c2x) + ' ' + n1(c2y) + ' ' + n1(p2[0]) + ' ' + n1(p2[1]);
  }
  if (closed) d += 'Z';
  return d;
}

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/* ---------- عناصر ---------- */
function T(x, y, txt, o) {
  o = o || {};
  return `<text x="${n1(x)}" y="${n1(y)}" class="${o.cls || 'em-lbl'}"` +
    (o.size ? ` style="font-size:${o.size}px"` : '') +
    (o.anchor ? ` text-anchor="${o.anchor}"` : '') +
    (o.weight ? ` font-weight="${o.weight}"` : '') + `>${esc(txt)}</text>`;
}

function dot(x, y, r, cls) {
  return `<circle cx="${n1(x)}" cy="${n1(y)}" r="${r}" class="${cls || 'em-dot'}"/>`;
}

/* تقدير عرض النص العربي (الحرف ~٠.٦٠ من حجم الخط) */
function textW(txt, size) { return txt.length * size * 0.60; }

/* كشف تلاصق: يُحتفظ بمصفوفة الصناديق المرسومة ويُزاح المتصادم */
const placed = [];
function fits(x, y, w, h, pad) {
  const p = pad || 4;
  for (const b of placed) {
    if (x + w / 2 + p > b.x - b.w / 2 - p && x - w / 2 - p < b.x + b.w / 2 + p &&
        y + p > b.y - b.h - p && y - h - p < b.y + p) return false;
  }
  return true;
}
function place(x, y, w, h) { placed.push({ x, y, w, h }); }

function city(proj, c) {
  const [x, y] = proj.p(c.lon, c.lat);
  const cap = c.cls === 'cap';
  const size = c.size || (cap ? 34 : 30);
  const w = textW(c.n, size);
  const h = size * 1.15;
  let dx = c.dx === undefined ? 0 : c.dx;
  let dy = c.dy === undefined ? (cap ? -13 : -10) : c.dy;
  /* إن تزاحم مع اسم سابق، حاول ٤ مواضع بديلة */
  if (!fits(x + dx, y + dy, w, h)) {
    const tries = [[dx + 28, dy], [dx - 28, dy], [dx, dy - 28], [dx, dy + 28],
                   [dx + 28, dy - 18], [dx - 28, dy - 18]];
    for (const [tx, ty] of tries) {
      if (fits(x + tx, y + ty, w, h)) { dx = tx; dy = ty; break; }
    }
  }
  place(x + dx, y + dy, w, h);
  let s = dot(x, y, cap ? 5.2 : 3.8, cap ? 'em-dot cap' : 'em-dot');
  s += T(x + dx, y + dy, c.n, {
    cls: cap ? 'em-city cap' : 'em-city',
    size,
    anchor: c.anchor || 'middle'
  });
  return s;
}

function route(proj, r, id) {
  return `<path d="${smooth(r.pts, proj, false, 0.9)}" class="em-route" marker-end="url(#arw-${id})"/>`;
}

/* ---------- الهيكل ---------- */
function build(cfg) {
  placed.length = 0; /* صفّر لكل خريطة */
  const id = cfg.id;
  const proj = makeProj(cfg.win);

  /* الماء خلفية، ثم اليابسة، ثم البحار تقطعها */
  let land = '';
  [G.EURASIA, G.AFRICA, G.ARABIA].forEach((poly) => {
    land += `<path d="${smooth(poly, proj, true, 1)}" class="em-land"/>`;
  });

  let seas = '';
  ['med', 'black', 'caspian', 'aral', 'red', 'gulf'].forEach((k) => {
    const poly = G.SEAS[k];
    if (!poly) return;
    seas += `<path d="${smooth(poly, proj, true, 1)}" class="em-sea-shape"/>`;
  });

  let islands = '';
  Object.keys(G.ISLANDS).forEach((k) => {
    const poly = G.ISLANDS[k];
    if (!poly || !poly.length) return;
    islands += `<path d="${smooth(poly, proj, true, 1)}" class="em-island"/>`;
  });

  let rivers = '';
  Object.keys(G.RIVERS).forEach((k) => {
    rivers += `<path d="${smooth(G.RIVERS[k], proj, false, 1)}" class="em-river"/>`;
  });

  let ext = '';
  (cfg.extents || []).forEach((e) => {
    ext += `<path d="${smooth(e.pts, proj, true, 1)}" class="em-ext ${e.cls || 'x1'}"/>`;
  });

  let routes = '';
  (cfg.routes || []).forEach((r) => { routes += route(proj, r, id); });

  let regions = '';
  (cfg.regions || []).forEach((g) => {
    const [x, y] = proj.p(g.lon, g.lat);
    const size = g.size || 26;
    const w = textW(g.n, size);
    const h = size * 1.1;
    if (fits(x, y, w, h, 2)) {
      place(x, y, w, h);
      regions += T(x, y, g.n, { cls: 'em-region', size });
    }
  });

  let cities = '';
  (cfg.cities || []).forEach((c) => { cities += city(proj, c); });

  /* مفتاح الخريطة */
  let legend = '';
  if (cfg.legend && cfg.legend.length) {
    const lh = 26, pad = 12;
    const lw = 176, lH = pad * 2 + cfg.legend.length * lh;
    const lx = W - 24 - lw, ly = H - 24 - lH;
    legend += `<g class="em-card"><rect x="${lx}" y="${ly}" width="${lw}" height="${lH}" rx="10"/></g>`;
    cfg.legend.forEach((it, i) => {
      const yy = ly + pad + 17 + i * lh;
      legend += `<rect x="${lx + lw - 26}" y="${yy - 12}" width="16" height="13" rx="3" class="em-lg ${it.cls || 'x1'}"/>`;
      legend += T(lx + lw - 34, yy, it.n, { cls: 'em-lgt', size: 21, anchor: 'end' });
    });
  }

  /* مقياس الرسم */
  const targetPx = 120;
  let km = Math.round(proj.kmPerPx * targetPx / 100) * 100;
  if (km < 100) km = 100;
  const barPx = km / proj.kmPerPx;
  const sx = 30, sy = H - 40;
  const scale = `<g class="em-scale">` +
    `<path d="M${sx} ${sy} h${n1(barPx / 2)} h${n1(barPx / 2)}" class="em-scale-bar"/>` +
    `<path d="M${sx} ${sy - 4} v8 M${n1(sx + barPx)} ${sy - 4} v8" class="em-scale-tick"/>` +
    T(sx + barPx + 10, sy + 6, km.toLocaleString('en-US').replace(/,/g, '٫') + ' كم', { cls: 'em-scale-t', size: 20, anchor: 'start' }) +
    `</g>`;

  const compass = `<g class="em-compass" transform="translate(58 ${H - 92})">` +
    `<circle r="24" class="em-cmp-c"/><path d="M0 -17 L6 4 L0 -1 L-6 4 Z" class="em-cmp-n"/>` +
    T(0, -30, 'ش', { cls: 'em-cmp-t', size: 19 }) + `</g>`;

  const title = `<g class="em-title">` +
    T(976, 50, cfg.title, { cls: 'em-title-t', size: 36, anchor: 'end' }) +
    (cfg.sub ? T(976, 78, cfg.sub, { cls: 'em-sub-t', size: 21, anchor: 'end' }) : '') +
    `</g>`;

  const css = `
.em-sea-bg{fill:var(--map-sea,#C8D8DB)}
.em-land{fill:var(--map-land,#E8DCC4);stroke:var(--map-coast,#9A8A6A);stroke-width:1.1;stroke-linejoin:round}
.em-sea-shape{fill:var(--map-sea,#C8D8DB);stroke:var(--map-coast,#9A8A6A);stroke-width:1}
.em-island{fill:var(--map-land,#E8DCC4);stroke:var(--map-coast,#9A8A6A);stroke-width:.9}
.em-river{fill:none;stroke:var(--map-river,#7A9AAA);stroke-width:2.2;stroke-linecap:round;opacity:.85}
.em-ext{stroke-width:2.2;stroke-linejoin:round;stroke-dasharray:7 5}
.em-ext.x1{fill:rgba(184,148,47,.20);stroke:rgba(184,148,47,.75)}
.em-ext.x2{fill:rgba(170,84,40,.17);stroke:rgba(170,84,40,.7)}
.em-ext.x3{fill:rgba(120,90,140,.16);stroke:rgba(120,90,140,.65)}
.em-ext.x4{fill:rgba(40,110,90,.15);stroke:rgba(40,110,90,.6)}
.em-route{fill:none;stroke:var(--map-route,#B0522E);stroke-width:3;stroke-dasharray:9 6;stroke-linecap:round;opacity:.9}
.em-dot{fill:var(--map-dot,#8B6914);stroke:var(--map-land,#E8DCC4);stroke-width:2}
.em-dot.cap{fill:var(--map-cap,#A33B1E);r:5.2}
.em-city{fill:var(--ink,#2E2A24);font-family:Amiri,serif;font-weight:700;paint-order:stroke;stroke:var(--map-halo,#E8DCC4);stroke-width:6;stroke-linejoin:round}
.em-city.cap{fill:var(--map-cap,#A33B1E)}
.em-region{fill:var(--muted,#6B6252);font-family:Amiri,serif;opacity:.55;letter-spacing:2px;paint-order:stroke;stroke:var(--map-halo,#E8DCC4);stroke-width:5;stroke-linejoin:round}
.em-title-t{fill:var(--gold2,#8B6914);font-family:Amiri,serif;font-weight:700;paint-order:stroke;stroke:var(--map-halo,#E8DCC4);stroke-width:7;stroke-linejoin:round}
.em-sub-t{fill:var(--muted,#6B6252);font-family:Cairo,sans-serif;paint-order:stroke;stroke:var(--map-halo,#E8DCC4);stroke-width:5;stroke-linejoin:round}
.em-card rect{fill:var(--paper,#FFFDF8);fill-opacity:.93;stroke:var(--gold,#B8942F);stroke-width:1.4}
.em-lgt{fill:var(--ink,#2E2A24);font-family:Cairo,sans-serif}
.em-lg.x1{fill:rgba(184,148,47,.35);stroke:rgba(184,148,47,.9);stroke-width:1.5}
.em-lg.x2{fill:rgba(170,84,40,.3);stroke:rgba(170,84,40,.85);stroke-width:1.5}
.em-lg.x3{fill:rgba(120,90,140,.28);stroke:rgba(120,90,140,.8);stroke-width:1.5}
.em-lg.x4{fill:rgba(40,110,90,.26);stroke:rgba(40,110,90,.75);stroke-width:1.5}
.em-scale-bar{stroke:var(--ink,#2E2A24);stroke-width:2.5;fill:none}
.em-scale-tick{stroke:var(--ink,#2E2A24);stroke-width:2}
.em-scale-t{fill:var(--muted,#6B6252);font-family:Cairo,sans-serif}
.em-cmp-c{fill:none;stroke:var(--map-coast,#9A8A6A);stroke-width:1.4}
.em-cmp-n{fill:var(--gold2,#8B6914)}
.em-cmp-t{fill:var(--muted,#6B6252);font-family:Cairo,sans-serif;text-anchor:middle}
.em-frame{fill:none;stroke:var(--gold,#B8942F);stroke-width:2;opacity:.5}
`;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" class="emap" role="img" aria-label="${esc(cfg.title)}">
<defs>
<clipPath id="cp-${id}"><rect x="0" y="0" width="${W}" height="${H}" rx="16"/></clipPath>
<marker id="arw-${id}" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 z" fill="var(--map-route,#B0522E)"/></marker>
<style>${css}</style>
</defs>
<g clip-path="url(#cp-${id})">
<rect width="${W}" height="${H}" class="em-sea-bg"/>
${land}
${seas}
${islands}
${rivers}
${ext}
${routes}
${regions}
${cities}
</g>
<rect x="1" y="1" width="${W - 2}" height="${H - 2}" rx="16" class="em-frame"/>
${title}
${legend}
${scale}
${compass}
</svg>`;
}

/* ================= إعدادات الخرائط ================= */
const MAPS = require('./configs');

let total = 0;
MAPS.forEach((cfg) => {
  const svg = build(cfg);
  const f = path.join(OUT, cfg.id + '.svg');
  fs.writeFileSync(f, svg, 'utf8');
  total += Buffer.byteLength(svg);
  console.log('  ' + cfg.id.padEnd(18) + (Buffer.byteLength(svg) / 1024).toFixed(1).padStart(6) + ' KB');
});
console.log('─'.repeat(40));
console.log('  ' + String(MAPS.length) + ' خريطة · ' + (total / 1024).toFixed(1) + ' KB');
