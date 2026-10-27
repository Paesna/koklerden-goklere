/* Köklerden Göklere · Builder X: gürültü
 * noise-lab · 1120×440 (odak slaytı) · açık/koyu tema (2B)
 * Beş görünüm: sinyal, gurultu, kaynak, ortalama, dijital. Gürültü miktarı set('level') ile (0..1).
 * Sözleşme: kg-viz.js. Tüm hareket frame(t) içinden sürülür, rastgelelik KGViz.rng ile.
 */
(function () {
  'use strict';
  var K = window.KGViz;
  if (!K) return;
  var P = K.palette;
  var clamp = K.clamp;

  var VIEWS = ['sinyal', 'gurultu', 'kaynak', 'ortalama', 'dijital'];
  var DEMO = 8;

  /* ---------- sayı biçimi ---------- */
  function fmtV(x) {                       // 0,02 · 0,0063 · 0,002 (en az 2 ondalık)
    var s = x.toFixed(4);
    while (s.length > 2 && s.charAt(s.length - 1) === '0' && s.indexOf('.') < s.length - 3) s = s.slice(0, -1);
    return s.replace('.', ',');
  }
  function fmtN(x) { return K.num(x, 0); }
  function fmtR(x) { return Math.abs(x - Math.round(x)) < 1e-9 ? K.num(x, 0) : K.num(x, 2); }

  K.register('noise-lab', function (el, opts) {
    opts = opts || {};
    var dark = (opts.theme || 'light') === 'dark';
    var sf = K.surface(el);
    var C = {
      ink: dark ? P.onNight : P.ink,
      ink2: dark ? '#C9CFDA' : P.ink2,
      muted: dark ? P.onNightMuted : P.muted,
      line: dark ? P.nightLine : P.line,
      blue: dark ? P.blueLight : P.blue,
      blueSoft: dark ? 'rgba(142,166,242,.16)' : 'rgba(35,67,176,.10)',
      cop: dark ? P.copperLight : P.copperFill,
      copText: dark ? P.copperLight : P.copper,
      copSoft: dark ? 'rgba(227,154,108,.20)' : 'rgba(200,105,58,.16)',
      grey: dark ? '#9AA3B2' : '#666C78',
      wireO: dark ? '#4A5160' : '#B8BCC6',
      wireI: dark ? '#222836' : '#E6E6E0',
      card: dark ? '#161B26' : '#FFFFFF'
    };

    /* ---------- gürültü dizileri (sabit tohum) ---------- */
    var LEN = 4096, NT = new Float32Array(LEN), NU = new Float32Array(LEN);
    (function () {
      var r = K.rng(20261027), i;
      for (i = 0; i < LEN; i++) {
        NT[i] = (r() + r() + r() - 1.5) / 1.5;        // üçgenimsi, [-1, 1]
        NU[i] = r() * 2 - 1;                           // düzgün, [-1, 1]
      }
    })();
    function mod(i) { return ((i % LEN) + LEN) % LEN; }
    function nzAt(arr, u) {
      var i = Math.floor(u), f = u - i, a = arr[mod(i)], b = arr[mod(i + 1)];
      return a + (b - a) * f;
    }

    /* ---------- bit dizisi ---------- */
    var BITS = [];
    (function () {
      var r = K.rng(4095), i, b = 1;
      for (i = 0; i < 96; i++) { if (r() < 0.55) b = 1 - b; BITS.push(b); }
    })();

    /* ---------- geometri ---------- */
    var PX0 = 100, PX1 = 1080, PW = PX1 - PX0;
    var CARDY = 34, CARDH = 340, BOTY = 420;      // kart üstü, kart yüksekliği, alt satır (legend) çizgisi
    var AY0 = 70, AY1 = 360;                      // analog çizim alanı
    var VLO = 1.50, VHI = 1.80;                   // büyütülmüş dikey pencere
    var DX = 5, SPEED = 30;                       // örnek aralığı (px), kaydırma hızı (px/sn)
    function ay(v) { return AY1 - (v - VLO) / (VHI - VLO) * (AY1 - AY0); }
    var VPX = (AY1 - AY0) / (VHI - VLO);          // px / V
    var W0 = 1120, H0 = 440;
    function layout() {
      W0 = sf.w; H0 = sf.h;
      PX0 = 84; PX1 = W0 - 24; PW = PX1 - PX0;
      CARDY = 34; CARDH = H0 - CARDY - 52; BOTY = H0 - 18;
      AY0 = CARDY + 30; AY1 = CARDY + CARDH - 24;
      VPX = (AY1 - AY0) / (VHI - VLO);
      DY0 = CARDY + 36; DY1 = CARDY + CARDH - 62;
    }
    function sig(k) { return 1.65 + 0.055 * Math.sin(k * 0.0105) + 0.022 * Math.sin(k * 0.027 + 1.3); }
    var NOISE_PER_LEVEL = 0.0667;                 // ± V, düzey 1'de
    var DIG_PER_LEVEL = 2.2;                      // ± V, yalnızca dijital görünümde (abartılı)
    var DY0 = 90, DY1 = 302, DLO = -2.0, DHI = 5.5, BW = 60, DSPEED = 24, DKN = 10;
    function dy(v) { return DY1 - (v - DLO) / (DHI - DLO) * (DY1 - DY0); }

    /* ---------- durum ---------- */
    var view, auto, lvl, nT, lnE, A, tAbs = 0;
    var wrongCount = 0;
    function alphas() { var o = {}, i; for (i = 0; i < VIEWS.length; i++) o[VIEWS[i]] = VIEWS[i] === view ? 1 : 0; return o; }
    function resetState() {
      view = 'sinyal'; auto = true; lvl = 0.3; nT = 10; lnE = Math.log(10); A = alphas(); wrongCount = 0;
    }
    resetState();
    layout();

    function aq() { return Math.round(lvl * NOISE_PER_LEVEL * 1000) / 1000; }   // gösterilen ± V
    function adc(v) { return v / 3.3 * 4095; }

    /* ---------- metinler ---------- */
    function explain() {
      switch (view) {
        case 'sinyal': return 'Sensör ölçtüğü şeyi gerilime çevirir; gürültü yokken bu gerilim düzgün ve yavaş değişir.';
        case 'gurultu': return 'Gerilimin üstüne rastgele değişimler biner: ses değil, tel gerilimindeki titremedir.';
        case 'kaynak': return 'Isı, motor, telefon ve yan kablo gürültü katar; yok edilemez, yalnızca küçültülür.';
        case 'ortalama': return 'Çok kez ölçüp ortalamak sapmaları götürür: gürültü yaklaşık √N kat küçülür.';
        default: return 'Eşiğin üstü 1, altı 0 sayılır; gürültü eşiği aşmadıkça bit doğru okunur.';
      }
    }
    function numbers() {
      var a = aq(), n, ad, an;
      switch (view) {
        case 'sinyal':
          return 'sayı = gerilim ÷ 3,3 V × 4.095 → 1,65 V ≈ 2.048';
        case 'gurultu':
          ad = Math.round(adc(a));
          return '1,65 V ± ' + fmtV(a) + ' V → 2.048 ± ' + fmtN(ad) + ' (' + fmtV(a) + ' ÷ 3,3 × 4.095 ≈ ' + fmtN(ad) + ')';
        case 'kaynak':
          if (a <= 0) return 'gürültü yok (ideal durum, gerçekte hiç olmaz)';
          return 'sinyal ÷ gürültü = 1,65 ÷ ' + fmtV(a) + ' ≈ ' + fmtN(1.65 / a) + ' kat';
        case 'ortalama':
          n = nT; an = a / Math.sqrt(n);
          return '√' + n + ' = ' + fmtR(Math.sqrt(n)) + ' → ± ' + fmtV(a) + ' V ÷ ' + fmtR(Math.sqrt(n)) + ' = ± ' + fmtV(an) + ' V';
        default:
          var d = lvl * DIG_PER_LEVEL;
          return '± ' + K.num(d, 2) + ' V gürültü ' + (d < 1.65 ? '<' : '>') + ' 1,65 V pay · ' + wrongCount + ' bit yanlış';
      }
    }

    /* ---------- çizim yardımcıları ---------- */
    function txt(g, s, x, y, o) { K.label(g, s, x, y, o); }
    function measure(g, s, size, weight, mono) { g.save(); g.font = K.font(size, weight || 400, mono); var w = g.measureText(s).width; g.restore(); return w; }
    function tag(g, s, xr, y) {
      g.save();
      g.font = K.font(12, 500, true);
      var w = g.measureText(s).width + 14;
      g.strokeStyle = C.muted; g.lineWidth = 1;
      K.rr(g, xr - w + 0.5, y - 14.5, w, 20, 5); g.stroke();
      g.restore();
      txt(g, s, xr - w + 7, y, { size: 12, mono: true, weight: 500, color: C.muted });
    }
    function pill(g, x, y, w, h, a) {
      g.save(); g.globalAlpha *= a; g.fillStyle = C.card; K.rr(g, x, y, w, h, 6); g.fill();
      g.strokeStyle = C.line; g.lineWidth = 1; K.rr(g, x + 0.5, y + 0.5, w - 1, h - 1, 6); g.stroke(); g.restore();
    }
    function legend(g, items, y, a) {
      var x = PX0, i, it, w;
      for (i = 0; i < items.length; i++) {
        it = items[i];
        g.save(); g.globalAlpha *= a;
        if (it.type === 'dot') { g.fillStyle = it.color; g.beginPath(); g.arc(x + 8, y - 6, 4.5, 0, 6.2832); g.fill(); }
        else if (it.type === 'band') { g.fillStyle = it.color; g.fillRect(x, y - 14, 26, 16); }
        else {
          g.strokeStyle = it.color; g.lineWidth = it.width || 3; g.lineCap = 'round';
          if (it.type === 'dash') g.setLineDash([6, 5]);
          g.beginPath(); g.moveTo(x, y - 6); g.lineTo(x + 28, y - 6); g.stroke(); g.setLineDash([]);
        }
        g.restore();
        txt(g, it.text, x + 38, y, { size: 16, color: C.ink2, alpha: a });
        w = measure(g, it.text, 16);
        x += 38 + w + 32;
      }
    }

    function drawHeader(g, W) { tag(g, 'yavaşlatılmış · basitleştirilmiş', W - 12, 20); }

    function drawCard(g, a) {
      if (a < 0.01) return;
      g.save(); g.globalAlpha *= a;
      g.fillStyle = C.card; K.rr(g, 12, CARDY, W0 - 24, CARDH, 8); g.fill();
      g.strokeStyle = C.line; g.lineWidth = 1; K.rr(g, 12.5, CARDY + 0.5, W0 - 25, CARDH - 1, 8); g.stroke();
      g.restore();
    }
    function gridLine(g, y, a, dash) {
      g.save(); g.globalAlpha *= a; g.strokeStyle = C.line; g.lineWidth = 1;
      if (dash) g.setLineDash([3, 5]);
      g.beginPath(); g.moveTo(PX0, Math.round(y) + 0.5); g.lineTo(PX1, Math.round(y) + 0.5); g.stroke(); g.restore();
    }
    function drawAnalogAxes(g, a) {
      if (a < 0.01) return;
      var ticks = [1.5, 1.575, 1.65, 1.725, 1.8], i;
      for (i = 0; i < ticks.length; i++) gridLine(g, ay(ticks[i]), a * (i % 2 === 0 ? 1 : 0.5));
      txt(g, '1,65 V', PX0 - 10, ay(1.65) + 6, { size: 16, mono: true, color: C.muted, align: 'right', alpha: a });
    }

    function sx(k, off) { return PX0 + k * DX - off; }
    function clipPlot(g) { g.beginPath(); g.rect(PX0, CARDY + 2, PW, CARDH - 4); g.clip(); }

    function drawSinyal(g, tt, a) {
      if (a < 0.01) return;
      var off = tt * SPEED, x, k;
      g.save(); g.globalAlpha *= a;
      clipPlot(g);
      g.strokeStyle = C.blue; g.lineWidth = 4.5; g.lineJoin = 'round'; g.beginPath();
      for (x = PX0 - 2; x <= PX1 + 2; x += 3) {
        k = (x - PX0 + off) / DX;
        if (x === PX0 - 2) g.moveTo(x, ay(sig(k))); else g.lineTo(x, ay(sig(k)));
      }
      g.stroke();
      g.restore();
      var xl = 380, yl = ay(sig((xl - PX0 + off) / DX));
      g.save(); g.globalAlpha *= a; g.strokeStyle = C.muted; g.lineWidth = 1.2; g.setLineDash([3, 3]);
      g.beginPath(); g.moveTo(xl, CARDY + 58); g.lineTo(xl, yl - 10); g.stroke(); g.setLineDash([]);
      g.fillStyle = C.blue; g.beginPath(); g.arc(xl, yl, 7, 0, 6.2832); g.fill(); g.restore();
      pill(g, xl - 120, CARDY + 22, 240, 36, a);
      txt(g, 'istediğimiz sinyal', xl, CARDY + 47, { size: 19, weight: 600, color: C.blue, align: 'center', alpha: a });
    }

    function noisyY(k) { return ay(sig(k) + lvl * NOISE_PER_LEVEL * NT[mod(k)]); }

    function drawGurultu(g, tt, a) {
      if (a < 0.01) return;
      var off = tt * SPEED, k0 = Math.floor(off / DX) - 1, k1 = k0 + Math.ceil(PW / DX) + 3, k, amp = lvl * NOISE_PER_LEVEL;
      g.save(); g.globalAlpha *= a;
      clipPlot(g);
      g.fillStyle = C.blueSoft; g.beginPath();
      for (k = k0; k <= k1; k++) g.lineTo(sx(k, off), ay(sig(k) + amp));
      for (k = k1; k >= k0; k--) g.lineTo(sx(k, off), ay(sig(k) - amp));
      g.closePath(); g.fill();
      g.strokeStyle = C.grey; g.lineWidth = 2.2; g.setLineDash([7, 6]); g.beginPath();
      for (k = k0; k <= k1; k++) { if (k === k0) g.moveTo(sx(k, off), ay(sig(k))); else g.lineTo(sx(k, off), ay(sig(k))); }
      g.stroke(); g.setLineDash([]);
      g.strokeStyle = C.blue; g.lineWidth = 3; g.lineJoin = 'round'; g.beginPath();
      for (k = k0; k <= k1; k++) { if (k === k0) g.moveTo(sx(k, off), noisyY(k)); else g.lineTo(sx(k, off), noisyY(k)); }
      g.stroke();
      g.restore();
      var xb = Math.round(W0 * 0.78), kb = (xb - PX0 + off) / DX, yc = ay(sig(kb)), hh = amp * VPX;
      if (hh > 1.5) {
        g.save(); g.globalAlpha *= a;
        K.arrow(g, xb, yc, xb, yc - hh, { color: C.copText, width: 2.5, head: 8 });
        K.arrow(g, xb, yc, xb, yc + hh, { color: C.copText, width: 2.5, head: 8 });
        g.restore();
      }
      pill(g, xb + 14, yc - 18, 124, 36, a);
      txt(g, '± ' + fmtV(aq()) + ' V', xb + 76, yc + 7, { size: 19, mono: true, weight: 600, color: C.copText, align: 'center', alpha: a });
      legend(g, [
        { type: 'dash', color: C.grey, text: 'gerçek sinyal', width: 2.2 },
        { type: 'line', color: C.blue, text: 'ölçülen: sinyal + gürültü', width: 3 },
        { type: 'band', color: C.blueSoft, text: 'gürültü bandı' }
      ], BOTY, a);
    }

    function drawOrtalama(g, tt, a) {
      if (a < 0.01) return;
      var off = tt * SPEED, k0 = Math.floor(off / DX) - 1, k1 = k0 + Math.ceil(PW / DX) + 3, k, amp = lvl * NOISE_PER_LEVEL;
      var n = Math.max(1, Math.round(Math.exp(lnE))), half = Math.floor(n / 2);
      var base = k0 - 60, len = (k1 + 60) - base + 2, pref = new Float64Array(len + 1), j;
      for (j = 0; j < len; j++) { k = base + j; pref[j + 1] = pref[j] + sig(k) + amp * NT[mod(k)]; }
      function avg(kk) {
        var lo = kk - half - base, hi = lo + n;
        return (pref[hi] - pref[lo]) / n;
      }
      var ampN = amp / Math.sqrt(n);
      g.save(); g.globalAlpha *= a;
      clipPlot(g);
      g.fillStyle = C.blueSoft; g.beginPath();
      for (k = k0; k <= k1; k++) g.lineTo(sx(k, off), ay(sig(k) + amp));
      for (k = k1; k >= k0; k--) g.lineTo(sx(k, off), ay(sig(k) - amp));
      g.closePath(); g.fill();
      g.fillStyle = C.copSoft; g.beginPath();
      for (k = k0; k <= k1; k++) g.lineTo(sx(k, off), ay(sig(k) + ampN));
      for (k = k1; k >= k0; k--) g.lineTo(sx(k, off), ay(sig(k) - ampN));
      g.closePath(); g.fill();
      g.fillStyle = C.blue; g.globalAlpha *= 0.6;
      for (k = k0; k <= k1; k++) {
        g.beginPath(); g.arc(sx(k, off), ay(sig(k) + amp * NT[mod(k)]), 3.4, 0, 6.2832); g.fill();
      }
      g.globalAlpha /= 0.6;
      g.strokeStyle = C.cop; g.lineWidth = 4.5; g.lineJoin = 'round'; g.beginPath();
      for (k = k0; k <= k1; k++) { if (k === k0) g.moveTo(sx(k, off), ay(avg(k))); else g.lineTo(sx(k, off), ay(avg(k))); }
      g.stroke();
      g.restore();
      pill(g, PX1 - 150, CARDY + 16, 138, 42, a);
      txt(g, 'N = ' + n, PX1 - 81, CARDY + 46, { size: 24, mono: true, weight: 600, color: C.copText, align: 'center', alpha: a });
      legend(g, [
        { type: 'dot', color: C.blue, text: 'her okuma (ham, ± ' + fmtV(amp) + ' V)' },
        { type: 'line', color: C.cop, text: n === 1 ? 'ortalama (N = 1: ham okuma)' : n + ' okumanın ortalaması (± ' + fmtV(ampN) + ' V)', width: 4.5 }
      ], BOTY, a);
    }

    /* ---------- kaynaklar: dört büyük simge ---------- */
    function cardGeo() {
      var cg = 16, cw = (W0 - 24 - cg * 3 - 12) / 4, y0 = CARDY + 14, h = CARDH - 120;
      return { cg: cg, cw: cw, y0: y0, h: h };
    }
    function cardX(i) { var q = cardGeo(); return 18 + i * (q.cw + q.cg); }
    function drawCardShell(g, i, title, a) {
      var q = cardGeo(), x0 = cardX(i);
      g.save(); g.globalAlpha *= a;
      g.fillStyle = dark ? '#10151F' : '#F7F7F3'; K.rr(g, x0, q.y0, q.cw, q.h, 8); g.fill();
      g.strokeStyle = C.line; g.lineWidth = 1; K.rr(g, x0 + 0.5, q.y0 + 0.5, q.cw - 1, q.h - 1, 8); g.stroke();
      g.restore();
      txt(g, title, x0 + q.cw / 2, q.y0 + q.h - 18, { size: 19, weight: 600, color: C.ink, align: 'center', alpha: a });
    }
    function iconThermal(g, cx, cy, tt, a) {
      var i, j, vib = 0.7 + 0.9 * lvl, rr = K.rng(11), x, y, w1, w2, p1, p2;
      g.save(); g.globalAlpha *= a; g.translate(cx, cy); g.scale(1.25, 1.25); g.translate(-cx, -cy);
      g.fillStyle = C.wireI; g.strokeStyle = C.wireO; g.lineWidth = 2;
      K.rr(g, cx - 84, cy - 26, 168, 52, 6); g.fill(); g.stroke();
      for (i = 0; i < 6; i++) for (j = 0; j < 2; j++) {
        x = cx - 62 + i * 25 + Math.sin(tt * 7 + i * 1.9 + j) * 1.6 * vib;
        y = cy - 10 + j * 20 + Math.cos(tt * 6 + i + j * 2.3) * 1.6 * vib;
        g.fillStyle = C.grey; g.beginPath(); g.arc(x, y, 6, 0, 6.2832); g.fill();
      }
      for (i = 0; i < 8; i++) {
        w1 = 2 + rr() * 3; w2 = 2 + rr() * 3; p1 = rr() * 6.28; p2 = rr() * 6.28;
        x = cx - 70 + i * 20 + Math.sin(tt * w1 * vib + p1) * 11 * vib;
        y = cy + (i % 2 ? 4 : -4) + Math.sin(tt * w2 * vib + p2) * 9;
        x = clamp(x, cx - 78, cx + 78); y = clamp(y, cy - 20, cy + 20);
        g.fillStyle = C.blue; g.beginPath(); g.arc(x, y, 3.4, 0, 6.2832); g.fill();
      }
      g.restore();
    }
    function iconMotor(g, cx, cy, tt, a) {
      var on = (tt * 2.2) % 1 < 0.45, f = ((tt * 2.2) % 1) / 0.45, mx = cx - 62, sxl = cx + 18, sxr = cx + 66;
      g.save(); g.globalAlpha *= a; g.translate(cx, cy); g.scale(1.25, 1.25); g.translate(-cx, -cy);
      g.strokeStyle = C.ink2; g.lineWidth = 2.2; g.fillStyle = C.card;
      g.beginPath(); g.arc(mx, cy, 25, 0, 6.2832); g.fill(); g.stroke();
      txt(g, 'M', mx, cy + 8, { size: 20, weight: 600, color: C.ink, align: 'center' });
      g.strokeStyle = C.wireO; g.lineWidth = 4; g.lineCap = 'round';
      g.beginPath(); g.moveTo(mx + 25, cy); g.lineTo(sxl, cy); g.moveTo(sxr, cy); g.lineTo(cx + 94, cy); g.stroke();
      g.fillStyle = C.ink2; g.beginPath(); g.arc(sxl, cy, 3.6, 0, 6.2832); g.arc(sxr, cy, 3.6, 0, 6.2832); g.fill();
      g.strokeStyle = C.ink2; g.lineWidth = 3; g.beginPath(); g.moveTo(sxl, cy); g.lineTo(sxr - 8, cy - 18); g.stroke();
      if (on) {
        g.strokeStyle = C.cop; g.lineWidth = 3; g.lineJoin = 'round';
        g.beginPath(); g.moveTo(sxr - 8, cy - 18); g.lineTo(sxr - 2, cy - 8); g.lineTo(sxr - 9, cy - 4); g.lineTo(sxr, cy); g.stroke();
        g.lineWidth = 2; g.globalAlpha *= 1 - f * 0.6;
        for (var r = 0; r < 2; r++) { g.beginPath(); g.arc(sxr - 6, cy - 9, 20 + r * 12 + f * 8, -1.0, 0.9); g.stroke(); }
      }
      g.restore();
    }
    function iconRadio(g, cx, cy, tt, a) {
      var i, p, px = cx - 66, py = cy - 10, wx = cx + 50, wy = cy + 22, r;
      g.save(); g.globalAlpha *= a; g.translate(cx, cy); g.scale(1.25, 1.25); g.translate(-cx, -cy);
      g.fillStyle = C.card; g.strokeStyle = C.ink2; g.lineWidth = 2.2;
      K.rr(g, px - 14, py - 24, 28, 50, 5); g.fill(); g.stroke();
      g.fillStyle = C.wireI; g.fillRect(px - 9, py - 17, 18, 30);
      g.fillStyle = C.ink2; g.beginPath(); g.arc(px, py + 19, 2.4, 0, 6.2832); g.fill();
      g.lineCap = 'round'; g.strokeStyle = C.copText;
      for (i = 0; i < 3; i++) {
        p = (tt * 0.7 + i / 3) % 1; r = 4 + p * 22;
        g.globalAlpha = a * (1 - p) * 0.9; g.lineWidth = 2.4;
        g.beginPath(); g.arc(px, py, r + 14, -0.9, 0.9); g.stroke();
      }
      g.globalAlpha = a; g.strokeStyle = C.copText; g.fillStyle = C.copText; g.lineWidth = 3.2;
      for (i = 1; i <= 3; i++) {
        g.globalAlpha = a * (0.45 + 0.55 * (0.5 + 0.5 * Math.sin(tt * 3 - i * 0.9)));
        g.beginPath(); g.arc(wx, wy, 11 * i, -2.35, -0.79); g.stroke();
      }
      g.globalAlpha = a; g.beginPath(); g.arc(wx, wy, 3.6, 0, 6.2832); g.fill();
      g.restore();
    }
    function iconParallel(g, cx, cy, tt, a) {
      var i, y1 = cy - 22, y2 = cy + 22, x, p;
      g.save(); g.globalAlpha *= a; g.lineCap = 'round'; g.translate(cx, cy); g.scale(1.25, 1.25); g.translate(-cx, -cy);
      [y1, y2].forEach(function (y) {
        g.strokeStyle = C.wireO; g.lineWidth = 12; g.beginPath(); g.moveTo(cx - 90, y); g.lineTo(cx + 90, y); g.stroke();
        g.strokeStyle = C.wireI; g.lineWidth = 8; g.beginPath(); g.moveTo(cx - 90, y); g.lineTo(cx + 90, y); g.stroke();
      });
      for (i = 0; i < 6; i++) {
        p = (tt * 0.5 + i / 6) % 1; x = cx - 88 + p * 176;
        g.fillStyle = C.cop; g.fillRect(x - 5, y1 - 2.5, 10 * (0.5 + 0.5 * Math.abs(Math.sin(i * 1.7 + tt * 5))), 5);
      }
      for (i = 0; i < 3; i++) {
        x = cx - 48 + i * 48;
        g.globalAlpha = a * (0.45 + 0.55 * (0.5 + 0.5 * Math.sin(tt * 4 + i * 1.3)));
        g.strokeStyle = C.copText; g.lineWidth = 2.2; g.setLineDash([4, 3]);
        g.beginPath(); g.moveTo(x, y1 + 9); g.lineTo(x + Math.sin(tt * 5 + i) * 3, y2 - 10); g.stroke(); g.setLineDash([]);
        g.fillStyle = C.copText; g.beginPath(); g.moveTo(x, y2 - 7); g.lineTo(x - 4, y2 - 14); g.lineTo(x + 4, y2 - 14); g.closePath(); g.fill();
      }
      g.restore();
    }

    function drawKaynak(g, W, tt, a) {
      if (a < 0.01) return;
      var i, cx, q = cardGeo();
      var titles = ['ısı titreşimi', 'motor, anahtar', 'telefon, Wi-Fi', 'yan yana kablo'];
      for (i = 0; i < 4; i++) drawCardShell(g, i, titles[i], a);
      var icy = q.y0 + (q.h - 40) / 2;
      iconThermal(g, cardX(0) + q.cw / 2, icy, tt, a);
      iconMotor(g, cardX(1) + q.cw / 2, icy, tt, a);
      iconRadio(g, cardX(2) + q.cw / 2, icy, tt, a);
      iconParallel(g, cardX(3) + q.cw / 2, icy, tt, a);
      var wy = CARDY + CARDH - 40, amp = 3 + 9 * lvl, off = tt * 40, x, k;
      g.save(); g.globalAlpha *= a;
      for (i = 0; i < 4; i++) {
        cx = cardX(i) + q.cw / 2;
        K.arrow(g, cx, q.y0 + q.h + 4, cx, wy - 16, { color: C.copText, width: 2.4, head: 9, dash: [4, 4] });
      }
      g.strokeStyle = C.wireO; g.lineWidth = 6; g.beginPath(); g.moveTo(40, wy); g.lineTo(W - 40, wy); g.stroke();
      g.strokeStyle = C.blue; g.lineWidth = 3; g.lineJoin = 'round'; g.beginPath();
      for (x = 40; x <= W - 40; x += 4) {
        k = (x + off) / 4;
        var y = wy + amp * nzAt(NT, k) * 1.4;
        if (x === 40) g.moveTo(x, y); else g.lineTo(x, y);
      }
      g.stroke();
      g.restore();
      txt(g, 'sensör teli: gürültü buraya biner', W / 2, BOTY, { size: 18, weight: 500, color: C.muted, align: 'center', alpha: a });
    }

    /* ---------- dijital ---------- */
    function drawDijital(g, tt, a) {
      if (a < 0.01) return;
      var off = tt * DSPEED, amp = lvl * DIG_PER_LEVEL, x, wx, j, b, xc, v, bit, got, wrong = 0, thr = 1.65;
      var j0 = Math.floor(off / BW) - 1, j1 = Math.ceil((off + PW) / BW) + 1;
      var ticks = [[3.3, '3,3 V'], [1.65, ''], [0, '0 V']], i;
      g.save(); g.globalAlpha *= a;
      for (i = 0; i < 3; i++) {
        gridLine(g, dy(ticks[i][0]), 1, ticks[i][0] === 1.65);
        if (ticks[i][1]) txt(g, ticks[i][1], PX0 - 10, dy(ticks[i][0]) + 6, { size: 16, mono: true, color: C.muted, align: 'right' });
      }
      clipPlot(g);
      var res = [];
      for (j = j0; j <= j1; j++) {
        bit = BITS[mod2(j)];
        xc = PX0 + (j + 0.5) * BW - off;
        v = bit * 3.3 + amp * nzAt(NU, ((j + 0.5) * BW) / DKN);
        got = v >= thr ? 1 : 0;
        res.push([xc, bit, got, v]);
        if (xc > PX0 && xc < PX1 && got !== bit) {
          wrong++;
          g.fillStyle = C.copSoft; g.fillRect(xc - BW / 2, DY0 - 12, BW, DY1 - DY0 + 24);
        }
      }
      g.strokeStyle = C.wireO; g.lineWidth = 2.5; g.beginPath();
      for (j = j0; j <= j1; j++) {
        bit = BITS[mod2(j)]; x = PX0 + j * BW - off;
        if (j === j0) g.moveTo(x, dy(bit * 3.3)); else g.lineTo(x, dy(bit * 3.3));
        g.lineTo(x + BW, dy(bit * 3.3));
      }
      g.stroke();
      g.strokeStyle = C.blue; g.lineWidth = 3; g.lineJoin = 'round'; g.beginPath();
      for (x = PX0 - 2; x <= PX1 + 2; x += 2) {
        wx = x - PX0 + off; j = Math.floor(wx / BW);
        v = BITS[mod2(j)] * 3.3 + amp * nzAt(NU, wx / DKN);
        if (x === PX0 - 2) g.moveTo(x, dy(v)); else g.lineTo(x, dy(v));
      }
      g.stroke();
      for (i = 0; i < res.length; i++) {
        if (res[i][0] < PX0 || res[i][0] > PX1) continue;
        g.fillStyle = res[i][1] === res[i][2] ? C.blue : C.copText;
        g.strokeStyle = C.card; g.lineWidth = 2;
        g.beginPath(); g.arc(res[i][0], dy(res[i][3]), 6.5, 0, 6.2832); g.fill(); g.stroke();
      }
      g.restore();
      g.save(); g.globalAlpha *= a; g.strokeStyle = C.copText; g.lineWidth = 2.6; g.setLineDash([9, 6]);
      g.beginPath(); g.moveTo(PX0, dy(thr)); g.lineTo(PX1, dy(thr)); g.stroke(); g.setLineDash([]); g.restore();
      pill(g, PX1 - 232, dy(thr) - 17, 220, 34, a);
      txt(g, 'eşik: 3,3 ÷ 2 = 1,65 V', PX1 - 122, dy(thr) + 6, { size: 16, mono: true, weight: 600, color: C.copText, align: 'center', alpha: a });
      var by = CARDY + CARDH - 12;
      txt(g, 'okunan', 22, by, { size: 16, color: C.muted, alpha: a });
      for (i = 0; i < res.length; i++) {
        if (res[i][0] < PX0 + 10 || res[i][0] > PX1 - 10) continue;
        var bad = res[i][1] !== res[i][2];
        txt(g, String(res[i][2]), res[i][0], by, { size: 20, mono: true, weight: bad ? 700 : 500, color: bad ? C.copText : C.ink, align: 'center', alpha: a });
      }
      wrongCount = wrong;
      txt(g, wrong + ' bit yanlış', W0 - 30, CARDY + 38, { size: 22, weight: 600, color: wrong ? C.copText : C.blue, align: 'right', alpha: a });
    }
    function mod2(j) { return ((j % BITS.length) + BITS.length) % BITS.length; }

    /* ---------- demo ---------- */
    function demoTargets(t) {
      var idx = Math.floor(t / DEMO) % VIEWS.length, u = (t % DEMO) / DEMO, v = VIEWS[idx], l = 0.3, n = 10;
      if (v === 'gurultu') l = 0.15 + 0.7 * (0.5 - 0.5 * Math.cos(6.2832 * u));
      else if (v === 'ortalama') { l = 0.6; n = u < 0.3 ? 1 : (u < 0.62 ? 10 : 100); }
      else if (v === 'dijital') l = 0.25 + 0.75 * K.smoothstep(0.12, 0.8, u);
      return { v: v, l: l, n: n };
    }

    function frame(t, dt) {
      var g = sf.ctx, W = sf.w, i, rate;
      layout();
      dt = Math.max(dt, 0.0001);
      rate = 1 - Math.exp(-8 * dt);
      if (auto && !K.reducedMotion) {
        var d = demoTargets(t);
        view = d.v; nT = d.n;
        lvl += (d.l - lvl) * (1 - Math.exp(-5 * dt));
      }
      for (i = 0; i < VIEWS.length; i++) A[VIEWS[i]] += ((VIEWS[i] === view ? 1 : 0) - A[VIEWS[i]]) * rate;
      lnE += (Math.log(nT) - lnE) * (1 - Math.exp(-6 * dt));
      var tt = K.reducedMotion ? 3 : t;
      tAbs = tt;

      sf.clear();
      drawHeader(g, W);
      var aA = clamp(A.sinyal + A.gurultu + A.ortalama, 0, 1);
      drawCard(g, clamp(aA + A.dijital, 0, 1));
      drawAnalogAxes(g, aA);
      drawSinyal(g, tt, A.sinyal);
      drawGurultu(g, tt, A.gurultu);
      drawOrtalama(g, tt, A.ortalama);
      drawDijital(g, tt, A.dijital);
      drawKaynak(g, W, tt, A.kaynak);
    }

    return {
      reset: function () { resetState(); },
      frame: frame,
      set: function (key, val) {
        if (key === 'view' && VIEWS.indexOf(val) >= 0) { view = val; auto = false; }
        else if (key === 'level') { var v = parseFloat(val); if (isFinite(v)) { lvl = clamp(v, 0, 1); auto = false; } }
        else if (key === 'n') {
          var n = parseFloat(val);
          if (isFinite(n)) { nT = n < 4 ? 1 : (n < 40 ? 10 : 100); auto = false; }
        }
      },
      read: function (key) {
        if (key === 'view') return view;
        if (key === 'explain') return explain();
        if (key === 'numbers') return numbers();
        if (key === 'level') return K.num(lvl, 2);
        if (key === 'n') return String(nT);
        return '';
      },
      resize: function () { sf.resize(); },
      dispose: function () { sf.dispose(); }
    };
  });
})();
