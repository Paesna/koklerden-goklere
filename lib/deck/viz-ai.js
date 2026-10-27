/* Köklerden Göklere · Builder AI: kısa devre, kıvılcım ve ark
 * arc-lab · tasarım alanı 1120×440 (kutuya uyarlanır) · 2B
 * Altı görünüm, her biri tek fikir: kisa, iyon, kivilcim, ark, sondur, simsek.
 * set('view', ad) otomatik gösteriyi durdurur ve o görünümü sakin bir döngüde sürdürür.
 * read('view' | 'explain' | 'numbers' | 'temp')
 * Hareket zamanın saf işlevidir (rastgelelik yalnızca KGViz.rng ile, başlangıçta üretilir).
 */
(function () {
  'use strict';
  var K = window.KGViz;
  if (!K) return;
  var P = K.palette;
  var clamp = K.clamp;
  var PI = Math.PI, TAU = PI * 2;
  var W = 1120, H = 440, DEMO = 9;
  var VIEWS = ['kisa', 'iyon', 'kivilcim', 'ark', 'sondur', 'simsek'];
  var STORIES = { a: ['kisa', 'kivilcim', 'iyon'], b: ['ark', 'sondur', 'simsek'] };
  var STILL = { kisa: 6.6, iyon: 7.4, kivilcim: 3.4, ark: 6, sondur: 3.2, simsek: 6.0 };

  var EXPLAIN = {
    kisa: 'Yük atlanınca direnç çok küçülür, akım çok büyür ve tel ısınır.',
    iyon: 'Hızlanan elektron havadan elektron koparır; sayı katlanır ve hava bir an iletken olur.',
    kivilcim: 'Aralık küçükken alan çok büyüktür: hava delinir ve kıvılcım çakar; aralık büyüyünce söner.',
    ark: 'Ark sürer: akım kanalı sıcak tutar, sıcak ve iyonlaşmış kanal da akımı iyi iletir.',
    sondur: 'Alternatif akım saniyede 100 kez sıfırdan geçer; kesicinin ark odası arkı bölüp soğutur.',
    simsek: 'Hava yalıtkandır; alan yeterince büyürse iyonlaşır ve şimşek kanalı iletken olur.'
  };

  function sm(a, b, x) { var t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); }
  function outC(t) { t = clamp(t, 0, 1); return 1 - Math.pow(1 - t, 3); }
  function inOut(t) { t = clamp(t, 0, 1); return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function ramp(st, m) {
    m = clamp(m, 0, 1);
    for (var i = 1; i < st.length; i++) if (m <= st[i][0]) return mixHex(st[i - 1][1], st[i][1], (m - st[i - 1][0]) / (st[i][0] - st[i - 1][0]));
    return st[st.length - 1][1];
  }
  function mixHex(a, b, t) {
    var A = parseInt(a.slice(1), 16), B = parseInt(b.slice(1), 16), o = 0, sh;
    for (sh = 16; sh >= 0; sh -= 8) o = o * 256 + Math.round(((A >> sh) & 255) * (1 - t) + ((B >> sh) & 255) * t);
    return '#' + ('000000' + o.toString(16)).slice(-6);
  }
  var HEAT = [[0, '#7A808B'], [0.3, '#8E7B76'], [0.5, '#B5443A'], [0.68, '#D9582B'], [0.82, '#F08A32'], [0.95, '#FFC15A'], [1, '#FFE9B0']];
  var NIGHT = '#0E121A';
  var ONN = '#EEF0F3', ONM = '#9AA3B2';

  function mkPath(pts, close) {
    var p = pts.slice(), c = [0], L = 0, i;
    if (close) p.push(pts[0]);
    for (i = 1; i < p.length; i++) { L += Math.hypot(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1]); c.push(L); }
    return { p: p, c: c, L: L };
  }
  function posAt(pa, s) {
    s = ((s % pa.L) + pa.L) % pa.L;
    var i = 1;
    while (i < pa.c.length - 1 && pa.c[i] < s) i++;
    var u = (s - pa.c[i - 1]) / (pa.c[i] - pa.c[i - 1] || 1);
    return [lerp(pa.p[i - 1][0], pa.p[i][0], u), lerp(pa.p[i - 1][1], pa.p[i][1], u)];
  }
  /* ttek tek noktaların görünürlüğü akım düzeyi c'ye göre kademeli artar (altın oran dizisi) */
  function dots(g, pa, ph, c, col, r, step, a0, open) {
    var n = Math.floor(pa.L / step), k, q, a, p;
    g.save(); g.fillStyle = col;
    for (k = 0; k < n; k++) {
      q = (k * 0.6180339887) % 1;
      a = clamp((c - q) * 6, 0, 1) * a0;
      if (a < 0.02) continue;
      p = posAt(pa, ph + k * step);
      if (open) { var e = Math.min(sm(0, 30, p[0] - open.x0), 1 - sm(open.x1 - 30, open.x1, p[0])); a *= clamp(e, 0, 1); if (a < 0.02) continue; }
      g.globalAlpha = a;
      g.beginPath(); g.arc(p[0], p[1], r, 0, TAU); g.fill();
    }
    g.restore();
  }
  function poly(g, pts, w, col, a) {
    var i;
    g.save(); g.globalAlpha *= a; g.strokeStyle = col; g.lineWidth = w; g.lineCap = 'round'; g.lineJoin = 'round';
    g.beginPath(); g.moveTo(pts[0][0], pts[0][1]);
    for (i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]);
    g.stroke(); g.restore();
  }
  /* yumuşak ışık: birkaç yarı saydam kalın çizgi katmanı */
  function glowLine(g, pts, k, s) {
    if (k <= 0.01) return;
    poly(g, pts, 46 * s, '#E0662A', 0.05 * k);
    poly(g, pts, 32 * s, '#E8742A', 0.08 * k);
    poly(g, pts, 20 * s, '#F2A04A', 0.16 * k);
    poly(g, pts, 11 * s, '#FFD58A', 0.42 * k);
    poly(g, pts, 5 * s, '#FFF3D6', 0.85 * k);
    poly(g, pts, 2.2 * s, '#FFFFFF', 0.98 * k);
  }
  function bolt(x1, y1, x2, y2, n, amp, tm, seed) {
    var dx = x2 - x1, dy = y2 - y1, L = Math.hypot(dx, dy) || 1, nx = -dy / L, ny = dx / L, pts = [], i, u, o;
    for (i = 0; i <= n; i++) {
      u = i / n;
      o = amp * Math.pow(Math.sin(PI * u), 0.8) * (Math.sin(i * 1.9 + seed + tm * 4.1) * 0.55 + Math.sin(i * 3.7 + seed * 1.7 - tm * 6.3) * 0.3 + Math.sin(i * 6.1 + seed * 2.3 + tm * 9) * 0.15);
      pts.push([x1 + dx * u + nx * o, y1 + dy * u + ny * o]);
    }
    return pts;
  }
  function partial(pts, f) {
    var tot = 0, i, out = [pts[0]], seg, acc = 0, want;
    for (i = 1; i < pts.length; i++) tot += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    want = tot * clamp(f, 0, 1);
    for (i = 1; i < pts.length; i++) {
      seg = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
      if (acc + seg >= want) { var u = (want - acc) / (seg || 1); out.push([lerp(pts[i - 1][0], pts[i][0], u), lerp(pts[i - 1][1], pts[i][1], u)]); return out; }
      out.push(pts[i]); acc += seg;
    }
    return out;
  }
  function plen(pts) { var t = 0, i; for (i = 1; i < pts.length; i++) t += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); return t; }

  /* ---------- sabit geometri / rastgele sahneler (başlangıçta) ---------- */
  /* iyon: çığ ağacı */
  var TR = (function () {
    var r = K.rng(11), spans = [0, 100, 190], C = [], j, i, n, arr;
    for (j = 0; j < 3; j++) {
      n = 1 << j; arr = [];
      for (i = 0; i < n; i++) arr.push({ x: 330 + j * 185 + (r() - 0.5) * 26, y: 222 + ((i + 0.5) / n - 0.5) * spans[j] + (r() - 0.5) * 10 });
      C.push(arr);
    }
    return C;
  })();
  var S0 = { x: 128, y: 222 };
  var LEGS = (function () {
    var legs = [], j, i, st, en, dx, dy, d, tcPar;
    for (j = 0; j < 3; j++) {
      for (i = 0; i < (1 << j); i++) {
        st = j === 0 ? S0 : TR[j - 1][i >> 1]; en = TR[j][i];
        dx = en.x - st.x; dy = en.y - st.y; d = Math.hypot(dx, dy);
        tcPar = j === 0 ? 0.8 : 1.6 + 1.5 * (j - 1) + 1.1;
        legs.push({ j: j, sx: st.x, sy: st.y, ex: en.x, ey: en.y, ux: dx / d, uy: dy / d, born: tcPar, t0: 1.6 + 1.5 * j, T: 1.1, fin: false, off: j === 0 ? 0 : 22 });
      }
    }
    for (i = 0; i < 4; i++) {
      for (j = 0; j < 2; j++) {
        st = TR[2][i]; en = { x: 1056, y: st.y + (j ? 16 : -16) };
        dx = en.x - st.x; dy = en.y - st.y; d = Math.hypot(dx, dy);
        legs.push({ j: 3, sx: st.x, sy: st.y, ex: en.x, ey: en.y, ux: dx / d, uy: dy / d, born: 5.7, t0: 6.1, T: 0.9, fin: true, off: 16 });
      }
    }
    return legs;
  })();
  var DECOR = (function () {
    var r = K.rng(5), out = [], tries = 0, x, y, ok, j, i, d;
    while (out.length < 26 && tries++ < 600) {
      x = 100 + r() * 940; y = 140 + r() * 190; ok = true;
      for (j = 0; j < 3 && ok; j++) for (i = 0; i < TR[j].length; i++) if (Math.hypot(TR[j][i].x - x, TR[j][i].y - y) < 40) ok = false;
      for (i = 0; i < out.length && ok; i++) if (Math.hypot(out[i].x - x, out[i].y - y) < 52) ok = false;
      if (Math.hypot(S0.x - x, S0.y - y) < 40 || y > 232 && y < 290 && x < 160) ok = ok && Math.abs(y - 222) > 40;
      if (ok) out.push({ x: x, y: y, a: r() * TAU, o: r() > 0.5, ph: r() * TAU });
    }
    d = out;
    return d;
  })();
  /* şimşek yolu */
  var LG = (function () {
    var r = K.rng(23), main = [[562, 134]], i, br1 = [], br2 = [], p;
    for (i = 1; i <= 10; i++) main.push(i === 10 ? [600, 300] : [562 + (600 - 562) * (i / 10) + (r() - 0.5) * 34, 134 + i * 16.6]);
    p = main[4]; br1.push(p);
    for (i = 1; i <= 5; i++) { p = br1[i - 1]; br1.push([p[0] - 11 + (r() - 0.5) * 12, p[1] + 17]); }
    p = main[7]; br2.push(p);
    for (i = 1; i <= 4; i++) { p = br2[i - 1]; br2.push([p[0] + 13 + (r() - 0.5) * 10, p[1] + 16]); }
    return { main: main, b1: br1, b2: br2, str: [[600, 336], [596, 322], [603, 312], [599, 304], [600, 300]] };
  })();
  var CLOUD = (function () {
    var r = K.rng(31), out = [], i;
    for (i = 0; i < 22; i++) out.push({ x: 230 + r() * 660, y: 70 + r() * 46, r: 60 + r() * 70, a: 0.5 + r() * 0.3 });
    return out;
  })();
  var CHG = (function () {
    var r = K.rng(41), neg = [], pos = [], gr = [], i;
    for (i = 0; i < 14; i++) neg.push({ x: 270 + r() * 560, y: 112 + r() * 18 });
    for (i = 0; i < 12; i++) pos.push({ x: 290 + r() * 520, y: 80 + r() * 14 });
    for (i = 0; i < 18; i++) gr.push({ x: 90 + r() * 900 });
    return { neg: neg, pos: pos, gr: gr };
  })();
  var EMB = (function () {
    var r = K.rng(77), out = [], i;
    for (i = 0; i < 9; i++) out.push({ a: -PI * (0.1 + r() * 0.8), v: 120 + r() * 160, ph: r() * 3, per: 1.2 + r() * 0.8 });
    return out;
  })();

  K.register('arc-lab', function (el, opts) {
    opts = opts || {};
    var dark = (opts.theme || 'light') === 'dark';
    var sf = K.surface(el);
    var C = {
      ink: dark ? P.onNight : P.ink, ink2: dark ? '#C9CFDA' : P.ink2, muted: dark ? P.onNightMuted : P.muted,
      line: dark ? P.nightLine : P.line, line2: dark ? '#303849' : P.line2, card: dark ? '#161B26' : '#FFFFFF',
      cop: dark ? P.copperLight : P.copperFill, copT: dark ? P.copperLight : P.copper,
      blue: dark ? P.blueLight : P.blue, rail: dark ? '#6D7584' : '#7A808B'
    };
    var view, auto, vStart, tNow, dtNow, out, curTemp, curNum, seq;
    var PH = {};
    function resetState() { seq = VIEWS; view = 'kisa'; auto = true; vStart = 0; tNow = 0; dtNow = 0; out = null; curTemp = ''; curNum = ''; PH = {}; }
    resetState();
    function adv(key, v) { PH[key] = (PH[key] || 0) + v * dtNow; return PH[key]; }

    function txt(g, s, x, y, o) { K.label(g, s, x, y, o); }
    function tag(g, s, onDark) { txt(g, s, 1096, 32, { size: 13, mono: true, weight: 500, color: onDark ? ONM : C.muted, align: 'right' }); }
    function panel(g) {
      g.fillStyle = NIGHT; K.rr(g, 12, 12, 1096, 416, 22); g.fill();
    }
    function caption(g, list, lt, x, y, size) {
      var i, a;
      for (i = 0; i < list.length; i++) {
        a = sm(list[i][0], list[i][0] + 0.45, lt) * (1 - sm(list[i][1] - 0.45, list[i][1], lt));
        if (a > 0.01) txt(g, list[i][2], x, y, { size: size || 24, weight: 600, color: ONN, alpha: a });
      }
    }
    /* etiket + kısa kılavuz çizgi */
    function lead(g, s, tx, ty, lx, ly, align, col, a, onDark) {
      if (a <= 0.01) return;
      g.save(); g.globalAlpha *= a;
      g.strokeStyle = onDark ? ONM : C.muted; g.lineWidth = 1.5;
      g.beginPath(); g.moveTo(tx, ty); g.lineTo(lx, ly); g.stroke();
      g.fillStyle = onDark ? ONM : C.muted; g.beginPath(); g.arc(tx, ty, 3.5, 0, TAU); g.fill();
      g.restore();
      txt(g, s, lx, ly < ty ? ly - 8 : ly + 21, { size: 19, weight: 700, color: col || (onDark ? ONN : C.ink), align: align || 'center', alpha: a });
    }
    function glow(g, col, x, y, r, a) { K.drawGlow(g, col, x, y, r, a); }

    /* ============================ KISA DEVRE ============================ */
    function vKisa(g, lt) {
      var xL = 150, xR = 970, yT = 100, yB = 340, xB = 760, cy = 220, tT = 3.0, tB = 7.4, i, k;
      var s = sm(tT, tT + 0.3, lt), blow = sm(tB, tB + 0.14, lt);
      var u = clamp((lt - tT) / 4.4, 0, 1);
      var m = lt < tT ? 0 : (lt < tB ? 0.9 * Math.pow(u, 1.3) : 0.9 * Math.exp(-(lt - tB) * 1.1));
      var sw = lt < 1.8 ? 1 : (lt > tT ? 0 : 1 - Math.pow((lt - 1.8) / (tT - 1.8), 2));
      var th = sw * 1.05, L = yB - yT;
      var wa = sm(1.0, 1.6, lt), glowK = sm(0.3, 0.85, m), mu = sm(0.3, 0.62, m);
      var hot = ramp(HEAT, m), lab = sm(0.5, 1.0, lt);
      curTemp = '≈ ' + K.num(Math.round((20 + 880 * m) / 10) * 10) + ' °C';
      curNum = lt < tT ? 'I = V ÷ R = 9 V ÷ 450 Ω = 20 mA' : (lt < tB ? 'I = V ÷ R = 9 V ÷ 0,5 Ω = 18 A · P = 18 × 18 × 0,5 ≈ 160 W (örnek)' : 'sigorta açtı: akım kesildi, tel soğuyor');
      tag(g, 'basitleştirilmiş model · yavaşlatılmış', false);

      /* ısı ışığı */
      if (glowK > 0.01) {
        for (i = 0; i < 6; i++) glow(g, '#F08A32', lerp(xL, xB, i / 5), yT, 90, 0.5 * glowK);
        for (i = 0; i < 5; i++) glow(g, '#F08A32', xB, lerp(yT, yB, i / 4), 90, 0.55 * glowK);
        for (i = 0; i < 6; i++) glow(g, '#F08A32', lerp(xL, xB, i / 5), yB, 90, 0.5 * glowK);
        glow(g, '#F08A32', xL, cy, 100, 0.55 * glowK);
      }
      /* teller */
      g.save(); g.lineWidth = 6; g.lineCap = 'round'; g.lineJoin = 'round';
      g.strokeStyle = C.rail;
      g.beginPath(); g.moveTo(xB, yT); g.lineTo(xR, yT); g.lineTo(xR, yB); g.lineTo(xB, yB); g.stroke();
      g.strokeStyle = s > 0 ? mixHex(C.rail, hot, clamp(s, 0, 1)) : C.rail;
      g.beginPath(); g.moveTo(xB, yT); g.lineTo(xL, yT); g.lineTo(xL, yB); g.lineTo(xB, yB); g.stroke();
      g.restore();
      /* akım noktaları */
      var pF = mkPath([[xL, yB], [xL, yT], [xR, yT], [xR, yB]], true), pA = mkPath([[xL, yB], [xL, yT], [xB, yT], [xB, yB]], true);
      var cF = lerp(0.3, 0.12, s) * (1 - blow), cA = s * (1 - blow);
      dots(g, pF, adv('F', 26 + 150 * cF), cF, C.cop, 6, 26, 1);
      if (cA > 0.01) dots(g, pA, adv('A', 26 + 150 * cA), cA, C.cop, 6, 22, 1);
      /* pil */
      g.save();
      g.fillStyle = mixHex(C.card, '#F2A04A', glowK * 0.35); g.strokeStyle = C.ink2; g.lineWidth = 2.5;
      K.rr(g, xL - 36, cy - 54, 72, 108, 10); g.fill(); g.stroke();
      g.strokeStyle = C.ink; g.lineWidth = 6; g.lineCap = 'round';
      g.beginPath(); g.moveTo(xL - 22, cy - 18); g.lineTo(xL + 22, cy - 18); g.stroke();
      g.lineWidth = 8; g.beginPath(); g.moveTo(xL - 12, cy + 18); g.lineTo(xL + 12, cy + 18); g.stroke();
      g.restore();
      txt(g, '+', xL + 26, cy - 31, { size: 20, weight: 700, color: C.copT, align: 'center' });
      txt(g, '−', xL + 26, cy + 38, { size: 22, weight: 700, color: C.blue, align: 'center' });
      /* yük */
      g.save();
      g.fillStyle = C.card; g.strokeStyle = C.ink2; g.lineWidth = 2.5;
      K.rr(g, xR - 32, cy - 66, 64, 132, 10); g.fill(); g.stroke();
      g.strokeStyle = C.ink; g.lineWidth = 4; g.lineJoin = 'round'; g.beginPath(); g.moveTo(xR, cy - 66);
      for (i = 0; i < 6; i++) g.lineTo(xR + (i % 2 ? -16 : 16), cy - 48 + i * 19);
      g.lineTo(xR, cy + 66); g.stroke();
      g.restore();
      /* akım ölçer */
      var mx = 400;
      g.save();
      g.fillStyle = C.card; g.strokeStyle = mixHex(C.ink2, '#C8693A', s * (1 - blow)); g.lineWidth = 3;
      K.rr(g, mx - 92, yT - 32, 184, 64, 12); g.fill(); g.stroke(); g.restore();
      txt(g, '20 mA', mx, yT + 10, { size: 28, mono: true, weight: 700, color: C.ink, align: 'center', alpha: 1 - s });
      txt(g, 'çok büyük', mx, yT + 10, { size: 25, mono: true, weight: 700, color: C.copT, align: 'center', alpha: s * (1 - blow) });
      txt(g, '0 A', mx, yT + 10, { size: 28, mono: true, weight: 700, color: C.muted, align: 'center', alpha: blow });
      txt(g, 'akım', mx, yT - 42, { size: 15, weight: 600, color: C.muted, align: 'center', alpha: lab });
      /* sigorta */
      var fx = 400, fy = yB;
      g.save();
      g.fillStyle = blow > 0.5 ? mixHex('#FFFFFF', '#8D857A', 0.5) : '#FFFFFF'; g.strokeStyle = C.ink2; g.lineWidth = 3;
      K.rr(g, fx - 58, fy - 17, 116, 34, 9); g.fill(); g.stroke();
      g.strokeStyle = '#8A8F99'; g.lineWidth = 3; g.lineCap = 'round';
      var fg = 14 * blow;
      g.beginPath(); g.moveTo(fx - 48, fy); g.lineTo(fx - fg, fy); g.moveTo(fx + fg, fy); g.lineTo(fx + 48, fy); g.stroke();
      g.restore();
      if (lt >= tB - 0.5 && lt < tB + 0.9) {
        var pre = sm(tB - 0.5, tB, lt) * (1 - blow);
        glow(g, '#F2A04A', fx, fy, 70, 0.8 * pre);
      }
      if (lt >= tB) {
        var fl = 1 - sm(tB, tB + 0.55, lt);
        glow(g, '#FFD58A', fx, fy, 150, 0.9 * fl); glow(g, '#FFFFFF', fx, fy, 50, fl);
      }
      /* kalın tel (menteşeli) */
      if (wa > 0.01) {
        var tx = xB + L * Math.sin(th), ty = yT + L * Math.cos(th), sa = Math.atan2(ty - yT, tx - xB);
        var ax = xB + Math.cos(sa) * 12, ay = yT + Math.sin(sa) * 12, bx = tx - Math.cos(sa) * 12, by = ty - Math.sin(sa) * 12;
        g.save(); g.globalAlpha *= wa; g.lineCap = 'round';
        g.strokeStyle = mixHex(C.rail, hot, 1); g.lineWidth = 9; g.beginPath(); g.moveTo(xB, yT); g.lineTo(tx, ty); g.stroke();
        g.globalAlpha *= (1 - 0.35 * mu);
        g.strokeStyle = mixHex('#5470D0', '#3A2F2B', mu); g.lineWidth = lerp(19, 2, mu); g.lineCap = 'butt';
        g.beginPath(); g.moveTo(ax, ay); g.lineTo(bx, by); g.stroke();
        g.strokeStyle = 'rgba(255,255,255,0.35)'; g.lineWidth = 3 * (1 - mu);
        g.beginPath(); g.moveTo(ax - 4, ay); g.lineTo(bx - 4, by); g.stroke();
        g.restore();
        if (mu > 0.1) {
          for (i = 0; i < 5; i++) {
            var age = (((lt - 3.8 - i * 0.34) / 1.7) % 1 + 1) % 1, dy0 = yT + 70 + i * 36;
            if (lt < 3.8) continue;
            g.save(); g.globalAlpha = Math.sin(PI * age) * mu * (1 - blow * 0.6); g.fillStyle = '#4A5FBC';
            g.beginPath(); g.arc(xB + (i % 2 ? 11 : -11), dy0 + 150 * age * age, 4, 0, TAU); g.fill(); g.restore();
          }
        }
        if (m > 0.4) {
          for (i = 0; i < 6; i++) {
            var sa2 = (((lt - 0.46 * i) / 2.8) % 1 + 1) % 1;
            glow(g, '#8A8F99', xB + Math.sin(sa2 * 5 + i) * 16, yT + 24 - 78 * sa2, 14 + 30 * sa2, 0.3 * Math.sin(PI * sa2) * sm(0.4, 0.6, m));
          }
        }
      }
      /* etiketler */
      txt(g, '9 V pil', xL + 54, cy + 7, { size: 20, weight: 700, color: C.ink, alpha: lab });
      txt(g, '450 Ω yük', xR - 52, yB - 20, { size: 20, weight: 700, color: C.ink, align: 'right', alpha: lab });
      var hotTxt = sm(0.32, 0.5, m);
      txt(g, 'kalın tel', xB + 24, 262, { size: 20, weight: 700, color: C.ink, alpha: wa * (1 - hotTxt) });
      txt(g, 'tel kızarır', xB + 24, 262, { size: 20, weight: 700, color: C.copT, alpha: hotTxt * (1 - blow) });
      txt(g, 'sigorta', fx, fy + 44, { size: 20, weight: 700, color: C.ink, align: 'center', alpha: lab * (1 - blow) });
      txt(g, 'sigorta açtı', fx, fy + 44, { size: 20, weight: 700, color: C.copT, align: 'center', alpha: blow });
    }

    /* ============================ İYONLAŞMA ============================ */
    function molecule(g, x, y, ang, o, a) {
      var dx = Math.cos(ang) * 7.5, dy = Math.sin(ang) * 7.5;
      g.save(); g.globalAlpha *= a;
      g.fillStyle = o ? '#9A7F8F' : '#6F7FA6';
      g.beginPath(); g.arc(x - dx, y - dy, 7.5, 0, TAU); g.arc(x + dx, y + dy, 7.5, 0, TAU); g.fill();
      g.restore();
    }
    function electron(g, x, y, ux, uy, sp, a) {
      if (a <= 0.01) return;
      g.save(); g.globalAlpha *= a;
      glow(g, '#8EA6F2', x, y, 20 + 14 * sp, 0.55);
      if (sp > 0.05) {
        g.strokeStyle = 'rgba(142,166,242,' + (0.5 * sp) + ')'; g.lineWidth = 5; g.lineCap = 'round';
        g.beginPath(); g.moveTo(x, y); g.lineTo(x - ux * 30 * sp, y - uy * 30 * sp); g.stroke();
      }
      g.fillStyle = '#8EA6F2'; g.beginPath(); g.arc(x, y, 8, 0, TAU); g.fill();
      g.fillStyle = '#EAF0FF'; g.beginPath(); g.arc(x - 2, y - 2, 3.6, 0, TAU); g.fill();
      g.restore();
    }
    function ion(g, x, y, a) {
      if (a <= 0.01) return;
      g.save(); g.globalAlpha *= a;
      glow(g, '#E39A6C', x, y, 34, 0.28);
      g.fillStyle = '#E39A6C'; g.beginPath(); g.arc(x, y, 11, 0, TAU); g.fill();
      g.restore();
      txt(g, '+', x, y + 6, { size: 18, weight: 700, color: '#2B1A10', align: 'center', alpha: a });
    }
    function vIyon(g, lt) {
      var i, j, a, leg, cnt = 1;
      panel(g);
      g.save(); K.rr(g, 12, 12, 1096, 416, 22); g.clip();
      /* elektrotlar */
      g.fillStyle = '#4C5361'; g.fillRect(12, 12, 46, 416); g.fillRect(1062, 12, 46, 416);
      g.fillStyle = '#6A7282'; g.fillRect(52, 12, 6, 416); g.fillRect(1062, 12, 6, 416);
      txt(g, '−', 35, 238, { size: 40, weight: 700, color: ONN, align: 'center' });
      txt(g, '+', 1085, 238, { size: 40, weight: 700, color: ONN, align: 'center' });
      txt(g, 'basitleştirilmiş model · yavaşlatılmış', 1048, 32, { size: 13, mono: true, weight: 500, color: ONM, align: 'right' });
      /* elektrik alanı */
      var fa = sm(0.3, 1.0, lt) * (1 - sm(8.6, 9, lt));
      for (i = 0; i < 3; i++) K.arrow(g, 360 + i * 270 + 70, 106, 360 + i * 270 - 70, 106, { color: '#6F86D6', width: 5, head: 16, alpha: fa * 0.75 });
      txt(g, 'elektrik alan', 560, 142, { size: 18, weight: 700, color: P.blueLight, align: 'center', alpha: fa * (1 - sm(5.5, 6.1, lt)) });
      /* moleküller */
      for (i = 0; i < DECOR.length; i++) molecule(g, DECOR[i].x + Math.sin(lt * 0.9 + DECOR[i].ph) * 2, DECOR[i].y + Math.cos(lt * 0.7 + DECOR[i].ph) * 2, DECOR[i].a + lt * 0.25, DECOR[i].o, 0.85);
      var tcs = [2.7, 4.2, 5.7];
      for (j = 0; j < 3; j++) for (i = 0; i < TR[j].length; i++) {
        var c = TR[j][i], tc = tcs[j], io = sm(tc, tc + 0.3, lt);
        molecule(g, c.x, c.y, 0.6 + i + j, i % 2 === 0, 0.85 * (1 - io));
        ion(g, c.x, c.y, io);
        if (lt > tc && lt < tc + 0.7) {
          var rr = (lt - tc) / 0.7;
          g.save(); g.strokeStyle = 'rgba(255,226,168,' + (0.8 * (1 - rr)) + ')'; g.lineWidth = 3;
          g.beginPath(); g.arc(c.x, c.y, 12 + 44 * outC(rr), 0, TAU); g.stroke(); g.restore();
          glow(g, '#FFE2A8', c.x, c.y, 60, 0.7 * (1 - rr));
        }
      }
      /* elektronlar */
      for (i = 0; i < LEGS.length; i++) {
        leg = LEGS[i];
        if (lt < leg.born) continue;
        var x, y, sp = 0, al = sm(leg.born, leg.born + 0.25, lt);
        if (lt < leg.t0) {
          var e = leg.j === 0 ? 0 : outC((lt - leg.born) / 0.3);
          x = leg.sx + leg.ux * leg.off * e; y = leg.sy + leg.uy * leg.off * e;
        } else {
          var tau = clamp((lt - leg.t0) / leg.T, 0, 1);
          x = lerp(leg.sx + leg.ux * leg.off, leg.ex, tau * tau); y = lerp(leg.sy + leg.uy * leg.off, leg.ey, tau * tau);
          sp = tau;
          if (lt > leg.t0 + leg.T) { if (leg.fin) al *= 1 - sm(leg.t0 + leg.T, leg.t0 + leg.T + 0.2, lt); else continue; }
        }
        if (leg.j === 0 && lt < leg.t0) { glow(g, '#8EA6F2', x, y, 40 + 8 * Math.sin(lt * 4), 0.35 * al); }
        electron(g, x, y, leg.ux, leg.uy, sp, al);
      }
      /* kanal */
      var cf = inOut((lt - 6.5) / 1.1), ck = sm(6.4, 7.2, lt) * (0.92 + 0.08 * Math.sin(lt * 9));
      if (cf > 0.005) {
        var ch = bolt(58, 222, 1062, 222, 56, 8, lt, 3.3);
        var pc = partial(ch, cf);
        glowLine(g, pc, ck, 1.4);
        glow(g, '#F2A04A', 560, 222, 300, 0.22 * ck);
        var pa = mkPath(ch, false);
        dots(g, pa, adv('ch', 380), 1, '#CFE0FF', 5, 34, ck * 0.9, { x0: 70, x1: 1050 });
      }
      /* sayaç */
      var nums = [1, 2, 4, 8], at = [0.9, 2.7, 4.2, 5.7], bx = 560 - 3 * 0, ii;
      for (ii = 0; ii < 4; ii++) { if (lt >= at[ii]) cnt = nums[ii]; }
      var xs = [400, 500, 600, 700];
      for (ii = 0; ii < 4; ii++) {
        var on = sm(at[ii], at[ii] + 0.3, lt), cur = ii === 3 ? on : on * (1 - sm(at[ii + 1], at[ii + 1] + 0.3, lt));
        txt(g, String(nums[ii]), xs[ii], 402, { size: 40 + 8 * cur, mono: true, weight: 700, color: ONN, align: 'center', alpha: 0.28 + 0.72 * on });
        if (ii < 3) txt(g, '→', xs[ii] + 50, 400, { size: 26, color: ONM, align: 'center', alpha: 0.4 });
      }
      txt(g, 'elektron sayısı', 232, 400, { size: 18, weight: 600, color: ONM, align: 'center', alpha: sm(0.8, 1.2, lt) });
      /* altyazı */
      caption(g, [[0.8, 2.7, 'serbest bir elektron hızlanır'], [2.7, 4.3, 'çarpışma: yeni elektron + iyon'], [4.3, 6.1, 'sayı her adımda ikiye katlanır: çığ'], [6.5, 8.7, 'hava bir an iletken olur: plazma kanalı']], lt, 76, 58, 26);
      lead(g, 'hava molekülü (N₂, O₂)', DECOR[3].x, DECOR[3].y, DECOR[3].x, DECOR[3].y + 72, 'center', ONN, sm(0.9, 1.4, lt) * (1 - sm(2.4, 2.9, lt)), true);
      g.restore();
      curNum = '3.000 V/mm eşiği aşılınca: elektron sayısı ' + cnt;
      curTemp = '';
    }

    /* ============================ KIVILCIM ============================ */
    function vKivilcim(g, lt) {
      var u = clamp((lt - 2.0) / 4.0, 0, 1), d = 0.02 + 0.18 * Math.pow(u, 1.6);
      var E = 230 / d, gp = 22 + (d - 0.02) / 0.18 * 150;
      var cx = 560, cy = 262, xl = cx - gp / 2, xr = cx + gp / 2, i;
      var kS = clamp((E - 2800) / 1400, 0, 1) * (lt > 1.9 ? 1 : 0);
      panel(g);
      g.save(); K.rr(g, 12, 12, 1096, 416, 22); g.clip();
      tag(g, 'basitleştirilmiş model · yavaşlatılmış', true);
      /* alan göstergesi */
      var ga = sm(1.6, 2.2, lt);
      g.save(); g.globalAlpha *= ga;
      g.fillStyle = '#1B2232'; K.rr(g, 160, 118, 800, 20, 10); g.fill();
      var fr = clamp(E / 12000, 0, 1) * 800;
      g.fillStyle = E > 3000 ? '#E8742A' : '#5C6B8F'; K.rr(g, 160, 118, Math.max(fr, 6), 20, 10); g.fill();
      g.fillStyle = ONN; g.fillRect(360 - 1.5, 110, 3, 36);
      g.restore();
      txt(g, 'eşik 3.000 V/mm', 360, 104, { size: 18, weight: 700, color: ONN, align: 'center', alpha: ga });
      txt(g, 'alan E = ' + K.num(Math.round(E / 100) * 100) + ' V/mm', 960, 104, { size: 20, mono: true, weight: 700, color: E > 3000 ? '#F2A04A' : ONM, align: 'right', alpha: ga });
      /* kontaklar */
      function rod(x0, x1, dir) {
        g.save();
        g.fillStyle = '#B8693E'; K.rr(g, Math.min(x0, x1), cy - 44, Math.abs(x1 - x0), 88, 14); g.fill();
        g.fillStyle = 'rgba(255,255,255,0.18)'; g.fillRect(Math.min(x0, x1) + 8, cy - 36, Math.abs(x1 - x0) - 16, 10);
        g.fillStyle = '#CFD3DA'; K.rr(g, dir > 0 ? x1 - 16 : x0, cy - 34, 16, 68, 5); g.fill();
        g.restore();
      }
      rod(-20, xl, 1); rod(xr, 1140, -1);
      /* akım noktaları (kapalı iken) */
      var ca = (1 - sm(1.9, 2.4, lt)) * sm(0.5, 1.0, lt);
      if (ca > 0.01) dots(g, mkPath([[40, cy], [1080, cy]], false), adv('k', 90), 1, '#FFD9A8', 7, 34, ca);
      /* kıvılcım */
      if (kS > 0.01) {
        var b = bolt(xl, cy, xr, cy, 14, 9 + gp * 0.08, lt, 1.3);
        glow(g, '#FFD58A', cx, cy, 150, 0.7 * kS);
        glowLine(g, b, kS, 1.2);
        var tk = lt - 1.9;
        for (i = 0; i < EMB.length; i++) {
          var e2 = EMB[i], age = tk * 0.9 - e2.ph * 0.15;
          if (age < 0 || age > 1.2) continue;
          var ex = cx + Math.cos(e2.a) * e2.v * age, ey = cy + Math.sin(e2.a) * e2.v * age + 120 * age * age;
          glow(g, '#FFC15A', ex, ey, 14, (1 - age / 1.2) * kS);
        }
      }
      /* aralık ölçüsü */
      var da = sm(1.9, 2.6, lt);
      g.save(); g.globalAlpha *= da; g.strokeStyle = ONM; g.lineWidth = 2;
      g.beginPath(); g.moveTo(xl, cy + 62); g.lineTo(xr, cy + 62); g.moveTo(xl, cy + 52); g.lineTo(xl, cy + 72); g.moveTo(xr, cy + 52); g.lineTo(xr, cy + 72); g.stroke(); g.restore();
      txt(g, 'aralık d = ' + K.num(d, 2) + ' mm', cx, cy + 102, { size: 20, mono: true, weight: 700, color: ONN, align: 'center', alpha: da });
      lead(g, 'kontak', 190, cy - 44, 190, cy - 82, 'center', ONN, sm(0.6, 1.1, lt), true);
      lead(g, 'kontak', 930, cy - 44, 930, cy - 82, 'center', ONN, sm(0.6, 1.1, lt), true);
      caption(g, [[0.6, 2.0, 'kontaklar kapalı: akım geçiyor'], [2.0, 4.3, 'aralık küçük, gerilim yüksek: alan eşiği aşar, kıvılcım çakar'], [4.4, 8.7, 'aralık büyüdü: alan eşiğin altına indi, kıvılcım söndü']], lt, 76, 58, 24);
      g.restore();
      curNum = 'E = V ÷ d = 230 V ÷ ' + K.num(d, 2) + ' mm ≈ ' + K.num(Math.round(E / 100) * 100) + ' V/mm';
      curTemp = '';
    }

    /* ============================ ARK ============================ */
    function vArk(g, lt) {
      var cy = 256, gp = 270 * inOut((lt - 0.9) / 1.5), cx = 560, xl = cx - gp / 2, xr = cx + gp / 2, i;
      var ig = sm(0.95, 1.6, lt), fl = 0.93 + 0.07 * Math.sin(lt * 11) * Math.sin(lt * 3.1);
      panel(g);
      g.save(); K.rr(g, 12, 12, 1096, 416, 22); g.clip();
      tag(g, 'basitleştirilmiş model · yavaşlatılmış', true);
      /* elektrotlar: sivri uçlu çubuklar */
      function rod(x0, tip) {
        var dir = tip > x0 ? 1 : -1, hot = sm(1.0, 2.4, lt);
        g.save();
        g.fillStyle = '#7C828F';
        g.beginPath(); g.moveTo(x0, cy - 38); g.lineTo(tip - dir * 70, cy - 38); g.lineTo(tip, cy - 10); g.lineTo(tip, cy + 10); g.lineTo(tip - dir * 70, cy + 38); g.lineTo(x0, cy + 38); g.closePath(); g.fill();
        g.fillStyle = 'rgba(255,255,255,0.14)'; g.fillRect(Math.min(x0, tip - dir * 70), cy - 30, Math.abs(tip - dir * 70 - x0), 8);
        g.restore();
        if (hot > 0.01) {
          g.save(); g.globalAlpha *= hot; g.fillStyle = '#F08A32';
          g.beginPath(); g.moveTo(tip - dir * 60, cy - 34); g.lineTo(tip, cy - 10); g.lineTo(tip, cy + 10); g.lineTo(tip - dir * 60, cy + 34); g.closePath(); g.fill(); g.restore();
          glow(g, '#F08A32', tip, cy, 70, 0.7 * hot);
        }
      }
      rod(-10, xl); rod(1130, xr);
      if (ig > 0.01) {
        var bow = clamp(gp / 270, 0, 1) * 56, n = 60, pts = [], uu;
        for (i = 0; i <= n; i++) { uu = i / n; pts.push([lerp(xl, xr, uu), cy - bow * Math.sin(PI * uu) + 8 * Math.sin(PI * uu) * (Math.sin(i * 1.6 + lt * 3) * 0.6 + Math.sin(i * 0.9 - lt * 2.2) * 0.4)]); }
        glow(g, '#E8742A', cx, cy - bow * 0.9, 360, 0.3 * ig * fl);
        glow(g, '#FFC15A', cx, cy - bow * 0.9, 180, 0.4 * ig * fl);
        glowLine(g, pts, ig * fl, 1.6);
        /* ısı titreşimi */
        for (i = 0; i < 6; i++) {
          var wv = [], j2, yy;
          for (j2 = 0; j2 <= 14; j2++) {
            yy = cy - bow - 20 - j2 * 11; wv.push([cx + (i - 2.5) * 36 + Math.sin(j2 * 0.7 - lt * 2.6 + i * 1.7) * (5 + j2 * 0.7), yy]);
          }
          poly(g, wv, 3, '#F2A04A', 0.2 * ig * (0.6 + 0.4 * Math.sin(lt * 1.3 + i)));
        }
        /* kıvılcım parçacıkları */
        for (i = 0; i < EMB.length; i++) {
          var e2 = EMB[i], age = (((lt - e2.ph) / e2.per) % 1 + 1) % 1;
          glow(g, '#FFC15A', cx + Math.cos(e2.a) * e2.v * age * 1.1, cy - bow * 0.6 + Math.sin(e2.a) * e2.v * age + 160 * age * age, 12, Math.sin(PI * age) * ig);
        }
        /* akım noktaları */
        var pp = [[30, cy]].concat(pts, [[1090, cy]]);
        dots(g, mkPath(pp, false), adv('ark', 230), 1, '#FFE2B8', 6, 36, ig * sm(1.6, 2.4, lt));
      }
      /* etiketler */
      var a1 = sm(3.0, 3.6, lt), a2 = sm(4.4, 5.0, lt), a3 = sm(5.8, 6.4, lt);
      lead(g, 'binlerce °C', 560, 150, 330, 108, 'center', '#FFC15A', a1, true);
      g.save(); g.globalAlpha *= a2; g.strokeStyle = ONM; g.lineWidth = 2;
      g.beginPath(); g.moveTo(xl, cy + 64); g.lineTo(xr, cy + 64); g.moveTo(xl, cy + 54); g.lineTo(xl, cy + 74); g.moveTo(xr, cy + 54); g.lineTo(xr, cy + 74); g.stroke(); g.restore();
      txt(g, 'ark gerilimi: onlarca volt', cx, cy + 104, { size: 20, weight: 700, color: ONN, align: 'center', alpha: a2 });
      lead(g, 'çok büyük akım', 900, cy - 40, 900, cy - 100, 'center', ONN, a3, true);
      caption(g, [[2.3, 8.7, 'ark sürer: sıcak, iyonlaşmış kanal akımı iyi iletir']], lt, 76, 58, 26);
      g.restore();
      curNum = 'ark gerilimi ≈ 20–40 V (örnek) · akım: onlarca – yüzlerce A';
      curTemp = 'binlerce °C';
    }

    /* ============================ SÖNDÜRME ============================ */
    function vSondur(g, lt) {
      var i, p1 = sm(0.3, 0.9, lt) * (1 - sm(4.4, 5.0, lt)), p2 = sm(4.8, 5.4, lt) * (1 - sm(8.5, 9, lt));
      var aL = 0.28 + 0.72 * p1 * (1 - p2) + 0.0, aR = 0.28 + 0.72 * p2;
      if (lt < 0.3) { aL = 0.3 + 0.7 * sm(0, 0.3, lt); aR = 0.3; }
      panel(g);
      g.save(); K.rr(g, 12, 12, 1096, 416, 22); g.clip();
      tag(g, 'basitleştirilmiş model · yavaşlatılmış', true);
      g.fillStyle = '#262D3B'; g.fillRect(559, 70, 2, 340);
      /* SOL: sinüs */
      g.save(); g.globalAlpha *= aL;
      txt(g, 'alternatif akım', 290, 66, { size: 24, weight: 700, color: ONN, align: 'center' });
      var x0 = 60, x1 = 520, sy = 250, am = 92, pts = [], k;
      for (i = 0; i <= 120; i++) pts.push([x0 + (x1 - x0) * i / 120, sy - am * Math.sin(i / 120 * 4 * PI)]);
      g.strokeStyle = '#3A4255'; g.lineWidth = 2; g.beginPath(); g.moveTo(x0 - 10, sy); g.lineTo(x1 + 10, sy); g.stroke();
      poly(g, pts, 5, '#F2A04A', 1);
      var u = clamp((lt - 0.8) / 3.8, 0, 1), dx = x0 + (x1 - x0) * u, dy = sy - am * Math.sin(u * 4 * PI), dv = Math.abs(Math.sin(u * 4 * PI));
      var dA = sm(0, 0.04, u) * (1 - sm(0.96, 1, u)) * sm(0.7, 1.0, lt);
      glow(g, '#FFD58A', dx, dy, 26 + 54 * dv, 0.35 + 0.65 * dv * dA);
      g.fillStyle = '#FFF3D6'; g.globalAlpha *= dA; g.beginPath(); g.arc(dx, dy, 8, 0, TAU); g.fill(); g.globalAlpha /= (dA || 1);
      for (k = 0; k <= 4; k++) {
        var zx = x0 + (x1 - x0) * k / 4, near = Math.max(0, 1 - Math.abs(u * 4 - k) / 0.12) * dA;
        g.strokeStyle = 'rgba(142,166,242,' + (0.7 + 0.3 * near) + ')'; g.lineWidth = 3;
        g.beginPath(); g.arc(zx, sy, 11 + 8 * near, 0, TAU); g.stroke();
        if (near > 0) glow(g, '#8EA6F2', zx, sy, 50, near * 0.6);
      }
      g.restore();
      lead(g, 'akım sıfır', x0 + (x1 - x0) / 2, sy - 12, 290, 130, 'center', '#8EA6F2', aL * sm(1.2, 1.8, lt) * (1 - sm(4.2, 4.7, lt)), true);
      txt(g, 'saniyede 100 kez', 290, 378, { size: 20, weight: 700, color: ONN, align: 'center', alpha: aL * sm(1.6, 2.2, lt) });
      /* SAĞ: ark odası */
      g.save(); g.globalAlpha *= aR;
      txt(g, 'kesicideki ark odası', 840, 66, { size: 24, weight: 700, color: ONN, align: 'center' });
      var cyc = clamp((lt - 5.0) / 3.5, 0, 1), cyy = 252;
      var plates = [790, 850, 910, 970, 1030, 1090].map(function (x) { return x - 10; });
      var gapo = 26 * sm(0.05, 0.16, cyc) * (1 - sm(0.9, 0.99, cyc));
      var hx = 690 + 410 * inOut((cyc - 0.3) / 0.34);
      var heat = sm(0.2, 0.55, cyc);
      var live = sm(0.12, 0.2, cyc) * (1 - sm(0.76, 0.92, cyc));
      /* kontaklar */
      g.fillStyle = '#B8693E'; K.rr(g, 590, cyy + 16, 110, 34, 6); g.fill();
      g.save(); g.translate(0, -gapo); g.fillStyle = '#B8693E'; K.rr(g, 590, cyy - 46, 110, 34, 6); g.fill(); g.restore();
      for (i = 0; i < plates.length; i++) {
        g.fillStyle = mixHex('#8A92A3', '#B8693E', heat * 0.35 * live); g.fillRect(plates[i], 150, 14, 200);
        g.fillStyle = 'rgba(255,255,255,0.12)'; g.fillRect(plates[i] + 2, 150, 3, 200);
      }
      if (live > 0.01) {
        var ay = cyy - 6 + 0, nodes = [690].concat(plates.map(function (x) { return x; })), seg = [], si;
        var cool = sm(0.45, 0.78, cyc);
        for (si = 0; si < nodes.length - 1; si++) {
          var xa = si === 0 ? 690 : nodes[si] + 14, xb = nodes[si + 1];
          if (hx <= xa + 2) break;
          var xe = Math.min(hx, xb);
          var bp = bolt(xa, ay, xe, ay, 8, si === 0 ? 14 : 5, lt, 2 + si * 1.9);
          var kk = live * (si === 0 ? 1 : (1 - 0.5 * cool)) * (1 - 0.65 * cool * (si > 0 ? 1 : 0));
          glowLine(g, bp, kk, si === 0 ? 1.0 : 0.62);
        }
        if (hx < 760) glowLine(g, bolt(650, cyy + 16, 650, cyy - 12 - gapo, 6, 4, lt, 5.1), live * (1 - sm(0.3, 0.4, cyc)), 0.8);
        glow(g, '#FFD58A', 680, ay, 90, 0.6 * live);
      }
      g.restore();
      lead(g, 'plakalar arkı bölüp soğutur', 940, 150, 880, 118, 'center', ONN, aR * sm(5.6, 6.2, lt) * (1 - sm(8.2, 8.6, lt)), true);
      txt(g, 'ark söndü', 840, 392, { size: 22, weight: 700, color: '#8EA6F2', align: 'center', alpha: aR * sm(7.4, 7.9, lt) * (1 - sm(8.4, 8.7, lt)) });
      g.restore();
      curNum = '50 Hz → saniyede 2 × 50 = 100 kez sıfır';
      curTemp = '';
    }

    /* ============================ ŞİMŞEK ============================ */
    function vSimsek(g, lt) {
      var i, j, T0 = 2.0, ST = 0.28, tStr = 4.8, tCon = 5.5, tRet = 0.6;
      panel(g);
      g.save(); K.rr(g, 12, 12, 1096, 416, 22); g.clip();
      var sky = g.createLinearGradient(0, 12, 0, 428);
      sky.addColorStop(0, '#0A0E17'); sky.addColorStop(1, '#161D2C');
      g.fillStyle = sky; g.fillRect(12, 12, 1096, 416);
      tag(g, 'basitleştirilmiş model · yavaşlatılmış', true);
      /* parlaklık */
      function pulse(t1, k, rise) { return lt < t1 ? 0 : sm(t1, t1 + (rise || 0.08), lt) * Math.exp(-Math.max(0, lt - t1 - (rise || 0.08)) * k); }
      var B = Math.max(pulse(tCon, 1.5), 0.6 * pulse(tCon + 1.0, 2.4)) * (1 - sm(8.5, 8.9, lt));
      /* bulut */
      var cl = sm(0.1, 0.7, lt);
      for (i = 0; i < CLOUD.length; i++) glow(g, B > 0.05 ? mixHex('#4A5570', '#BFCBF5', clamp(B * 0.6, 0, 1)) : '#4A5570', CLOUD[i].x, CLOUD[i].y, CLOUD[i].r, CLOUD[i].a * cl);
      /* yükler */
      var ch = sm(0.6, 2.0, lt) * (1 - sm(5.6, 6.4, lt));
      for (i = 0; i < CHG.neg.length; i++) { var q = CHG.neg[i]; g.save(); g.globalAlpha *= ch; g.fillStyle = '#8EA6F2'; g.beginPath(); g.arc(q.x, q.y + (1 - ch) * -20, 9, 0, TAU); g.fill(); g.restore(); txt(g, '−', q.x, q.y + 6 - (1 - ch) * 20, { size: 18, weight: 700, color: '#0E121A', align: 'center', alpha: ch }); }
      for (i = 0; i < CHG.pos.length; i++) { var q2 = CHG.pos[i]; g.save(); g.globalAlpha *= ch; g.fillStyle = '#E39A6C'; g.beginPath(); g.arc(q2.x, q2.y, 9, 0, TAU); g.fill(); g.restore(); txt(g, '+', q2.x, q2.y + 6, { size: 18, weight: 700, color: '#0E121A', align: 'center', alpha: ch }); }
      /* zemin ve direk */
      g.fillStyle = '#0A0D14'; g.fillRect(12, 396, 1096, 32);
      g.fillStyle = '#2A3142'; g.fillRect(12, 394, 1096, 3);
      g.fillStyle = '#6B7385'; g.fillRect(597, 336, 6, 60);
      g.fillRect(588, 346, 24, 3);
      var gc = sm(1.0, 2.4, lt) * (1 - sm(5.6, 6.4, lt));
      for (i = 0; i < CHG.gr.length; i++) { var gx = CHG.gr[i].x; g.save(); g.globalAlpha *= gc; g.fillStyle = '#E39A6C'; g.beginPath(); g.arc(gx, 386, 7, 0, TAU); g.fill(); g.restore(); txt(g, '+', gx, 391, { size: 14, weight: 700, color: '#0E121A', align: 'center', alpha: gc }); }
      for (i = 0; i < 5; i++) { var gx2 = 570 + i * 15; g.save(); g.globalAlpha *= gc; g.fillStyle = '#E39A6C'; g.beginPath(); g.arc(gx2, 370 - (i % 2) * 14, 7, 0, TAU); g.fill(); g.restore(); txt(g, '+', gx2, 375 - (i % 2) * 14, { size: 14, weight: 700, color: '#0E121A', align: 'center', alpha: gc }); }
      /* öncü (kademeli) */
      var uM = (lt - T0) / ST, M = LG.main, pm = [M[0]], tip = M[0];
      var nStep = clamp(Math.floor(uM), 0, 10), fr = uM - Math.floor(uM);
      if (lt >= T0) {
        for (i = 1; i <= Math.min(nStep, 10); i++) pm.push(M[i]);
        if (nStep < 10) {
          var f2 = outC(Math.min(1, fr / 0.5)), a0 = M[nStep], a1 = M[nStep + 1];
          tip = [lerp(a0[0], a1[0], f2), lerp(a0[1], a1[1], f2)]; pm.push(tip);
        } else tip = M[10];
      }
      var leaderK = 1 - sm(6.6, 8.6, lt) * 0.8;
      var lk = (1 - 0.6 * sm(tCon, tCon + 0.1, lt));
      function branch(br, node, steps) {
        var ub = uM - node - 0.5, pb = [br[0]], n = clamp(Math.floor(ub), 0, steps), tp;
        if (ub < 0) return null;
        for (var q3 = 1; q3 <= n; q3++) pb.push(br[q3]);
        if (n < steps) { var ff = outC(Math.min(1, (ub - Math.floor(ub)) / 0.5)); pb.push([lerp(br[n][0], br[n + 1][0], ff), lerp(br[n][1], br[n + 1][1], ff)]); }
        return pb;
      }
      if (lt >= T0) {
        var b1 = branch(LG.b1, 4, 5), b2 = branch(LG.b2, 7, 4);
        var dim = leaderK * lk * 0.55;
        [pm, b1, b2].forEach(function (pp, idx) {
          if (!pp || pp.length < 2) return;
          poly(g, pp, 9, '#9FB6FF', 0.07 * dim); poly(g, pp, 3.2, '#BFD0FF', (idx ? 0.55 : 0.85) * dim);
        });
        if (nStep < 10 && lt < tCon) glow(g, '#CFE0FF', tip[0], tip[1], 34 + 26 * (1 - sm(0, 0.5, fr)), 0.55 + 0.35 * (1 - sm(0, 0.5, fr)));
      }
      /* karşılayan akıntı (streamer) */
      var sf2 = inOut((lt - tStr) / (tCon - tStr));
      if (sf2 > 0.005) {
        var sp2 = partial(LG.str, sf2 * 1.0);
        poly(g, sp2, 7, '#9FB6FF', 0.12 * lk); poly(g, sp2, 2.8, '#CFE0FF', 0.9 * (lt < tCon ? 1 : 0.5));
        if (lt < tCon) glow(g, '#CFE0FF', sp2[sp2.length - 1][0], sp2[sp2.length - 1][1], 30, 0.6);
      }
      /* geri dönüş darbesi */
      if (lt >= tCon) {
        var full = LG.str.slice().concat(M.slice(0, 10).reverse());
        var fl2 = clamp((lt - tCon) / tRet, 0, 1);
        glow(g, '#CFDBFF', 560, 220, 600, 0.22 * B);
        var lit = partial(full, fl2);
        glowLine(g, lit.map(function (p) { return [p[0] + 0, p[1]]; }), B, 1.35);
        glow(g, '#EAF0FF', 600, 330, 130, 0.5 * B);
        var fp = lit[lit.length - 1];
        if (fl2 < 1) glow(g, '#FFFFFF', fp[0], fp[1], 90, 0.9);
        var frontLen = plen(lit), lenToNode4 = plen(LG.str) + plen(M.slice(4, 10)), lenToNode7 = plen(LG.str) + plen(M.slice(7, 10));
        if (frontLen >= lenToNode4 * 0.99) poly(g, LG.b1, 5, '#EAF0FF', 0.8 * B), poly(g, LG.b1, 16, '#9FB6FF', 0.15 * B);
        if (frontLen >= lenToNode7 * 0.99) poly(g, LG.b2, 5, '#EAF0FF', 0.8 * B), poly(g, LG.b2, 16, '#9FB6FF', 0.15 * B);
        glow(g, '#CFDBFF', 560, 130, 260, 0.35 * B);
        /* gök gürültüsü halkaları */
        var tt = lt - tCon - 0.3;
        if (tt > 0) {
          for (j = 0; j < 3; j++) {
            var rr2 = tt * 150 - j * 46;
            if (rr2 > 6) { g.save(); g.strokeStyle = 'rgba(190,204,240,' + (0.32 * (1 - clamp(rr2 / 420, 0, 1))) + ')'; g.lineWidth = 3; g.beginPath(); g.ellipse(600, 250, rr2, rr2 * 0.8, 0, 0, TAU); g.stroke(); g.restore(); }
          }
        }
      }
      /* sayılar */
      var na = sm(5.8, 6.4, lt) * (1 - sm(8.5, 8.9, lt));
      txt(g, 'yaklaşık 30.000 A', 1090, 190, { size: 38, mono: true, weight: 700, color: '#FFE2A8', align: 'right', alpha: na });
      txt(g, 'kanal ≈ 30.000 °C', 1090, 232, { size: 24, mono: true, weight: 600, color: ONN, align: 'right', alpha: na });
      lead(g, 'yüksek cisim', 603, 336, 760, 300, 'left', ONN, sm(1.0, 1.6, lt) * (1 - sm(5.2, 5.8, lt)), true);
      caption(g, [[0.5, 2.0, 'bulutta yük ayrışır, zeminde zıt yük birikir'], [2.0, 4.8, 'kademeli öncü: kısa adımlar ve duraklarla iner'], [4.8, 5.5, 'yerden karşılayan bir akıntı yükselir'], [5.5, 6.7, 'bağlantı: geri dönüş darbesi, kanal parlar'], [6.7, 8.8, 'ısınan hava genleşir: gök gürültüsü']], lt, 76, 50, 24);
      g.restore();
      curNum = '1.000 ÷ 343 ≈ 2,9 s (1 km için ışık ile ses arasındaki fark)';
      curTemp = lt >= tCon ? 'yaklaşık 30.000 °C' : '';
    }

    function draw(g, v, lt) {
      if (v === 'kisa') vKisa(g, lt);
      else if (v === 'iyon') vIyon(g, lt);
      else if (v === 'kivilcim') vKivilcim(g, lt);
      else if (v === 'ark') vArk(g, lt);
      else if (v === 'sondur') vSondur(g, lt);
      else vSimsek(g, lt);
    }

    function frame(t, dt) {
      dtNow = clamp(dt || 0, 0, 0.05); tNow = t;
      var g = sf.ctx, lt, al = 1, s = Math.min(sf.w / W, sf.h / H);
      if (K.reducedMotion) {
        if (auto) view = seq[Math.floor((t - vStart) / DEMO) % seq.length];
        lt = STILL[view];
      } else if (auto) {
        var tt0 = Math.max(0, t - vStart);
        view = seq[Math.floor(tt0 / DEMO) % seq.length];
        lt = tt0 % DEMO;
      } else {
        lt = (((t - vStart) % DEMO) + DEMO) % DEMO;
      }
      if (!K.reducedMotion) al = sm(0.3, 0.8, lt) * (1 - sm(8.6, 9, lt));
      sf.clear();
      g.save();
      g.translate((sf.w - W * s) / 2, (sf.h - H * s) / 2);
      g.scale(s, s);
      if (out && tNow - out.t0 < 0.4 && !K.reducedMotion) {
        g.save(); g.globalAlpha = 1 - sm(0, 0.4, tNow - out.t0);
        draw(g, out.view, out.lt0 + (tNow - out.t0));
        g.restore();
      }
      g.save(); g.globalAlpha = al; draw(g, view, lt); g.restore();
      g.restore();
    }

    return {
      reset: function () { resetState(); },
      frame: frame,
      set: function (key, val) {
        if (key === 'story' && STORIES[val]) { seq = STORIES[val]; auto = true; vStart = tNow; view = seq[0]; out = null; return; }
        if (key === 'view' && VIEWS.indexOf(val) >= 0) {
          var oldLt = auto ? Math.max(0, tNow - vStart) % DEMO : (((tNow - vStart) % DEMO) + DEMO) % DEMO;
          if (tNow > 0.05) out = { view: view, lt0: oldLt, t0: tNow };
          auto = false; seq = [val]; view = val; vStart = tNow;
        }
      },
      read: function (key) {
        if (key === 'view') return view;
        if (key === 'explain') return EXPLAIN[view];
        if (key === 'numbers') return curNum;
        if (key === 'temp') return curTemp;
        return '';
      },
      resize: function () { sf.resize(); },
      dispose: function () { sf.dispose(); }
    };
  });
})();
