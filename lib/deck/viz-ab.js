/* Köklerden Göklere · Builder AB: dalga laboratuvarı
 * wave-lab · 1120×440 (odak slaytı) · açık/koyu tema (2B, düz "müze çizimi" biçimi)
 * Genlik, frekans, periyot, dalga boyu ve frekans ölçeği; otomatik gezinti her görünümü 8-9 sn gösterir.
 * Görünümler: genlik, frekans, periyot, dalgaboyu, olcek.
 * Kontroller: set('view', ...), set('amp', 0.2..1), set('freq', 1..8).
 * Sözleşme: kg-viz.js. Hareket frame(t, dt) içinden sürülür, rastgelelik yok. Düzen W ve H'e göre kurulur.
 */
(function () {
  'use strict';
  var K = window.KGViz;
  if (!K) return;
  var P = K.palette;
  var clamp = K.clamp;
  var TAU = Math.PI * 2;

  var VIEWS = ['genlik', 'frekans', 'periyot', 'dalgaboyu', 'olcek'];
  var DUR = { genlik: 8, frekans: 8, periyot: 8, dalgaboyu: 8, olcek: 9 };
  var TOTAL = 41;

  /* ---------- ölçek görünümü: logaritmik cetvel (1 Hz - 1 PHz) ---------- */
  function lg(x) { return Math.log(x) / Math.LN10; }
  var ITEMS = [
    { d: 0, name: '1 Hz · kalp atışı', l: ['T = 1 s'], calc: 'f = 1 Hz → T = 1 ÷ 1 = 1 s' },
    { d: lg(50), name: '50 Hz · priz', l: ['T = 20 ms'], calc: 'f = 50 Hz → T = 1 ÷ 50 = 0,02 s = 20 ms' },
    { d: lg(440), name: '440 Hz · la notası', l: ['T ≈ 2,3 ms', 'λ ≈ 0,78 m'], calc: 'f = 440 Hz → T = 1 ÷ 440 ≈ 2,3 ms' },
    { d: lg(40000), name: '40 kHz · ultrasonik sensör', l: ['T = 25 µs', 'λ ≈ 8,6 mm'], calc: 'f = 40.000 Hz → T = 1 ÷ 40.000 = 25 µs' },
    { d: lg(2.4e9), name: '2,4 GHz · Wi-Fi', l: ['T ≈ 0,42 ns', 'λ = 12,5 cm'], calc: 'λ = 300.000.000 ÷ 2.400.000.000 = 0,125 m' },
    { d: lg(5e14), name: '500 THz · görünür ışık', l: ['λ = 600 nm', 'turuncu ışık'], calc: 'λ = 300.000.000 ÷ 500.000.000.000.000 = 600 nm' }
  ];
  var BAND = [lg(20), lg(20000)];     // insan kulağı

  /* ---------- metinler (altyazı: tek cümle, <= 110 karakter) ---------- */
  var EXPLAIN = {
    genlik: 'Genlik, dalganın orta çizgiden en uzak noktasıdır: büyüdükçe ses yükselir, ışık parlar.',
    frekans: 'Frekans bir saniyedeki salınım sayısıdır (Hz): dalga ne kadar sık gidip gelirse o kadar yüksektir.',
    periyot: 'Periyot, bir salınımın süresidir; frekans iki katına çıkarsa periyot yarıya iner: T = 1 ÷ f.',
    dalgaboyu: 'Dalga boyu iki tepe arasındaki uzaklıktır: v = λ × f. Radyo dalgası sesten çok daha hızlıdır.',
    olcek: 'Frekanslar çok geniş bir aralıkta değişir; kalp atışından ışığa hepsi aynı dalga fikridir.'
  };
  var EXACT = { 1: '1', 2: '0,5', 4: '0,25', 5: '0,2', 8: '0,125' };
  function tSec(f) { return EXACT[f] ? EXACT[f] : K.num(1 / f, 3); }
  function tMs(f) { return K.num(Math.round(1000 / f), 0); }

  K.register('wave-lab', function (el, opts) {
    opts = opts || {};
    var dark = (opts.theme || 'light') === 'dark';
    var sf = K.surface(el);
    var C = {
      ink: dark ? P.onNight : P.ink,
      ink2: dark ? '#C9CFDA' : P.ink2,
      muted: dark ? P.onNightMuted : P.muted,
      line: dark ? P.nightLine : P.line,
      line2: dark ? '#303849' : P.line2,
      blue: dark ? P.blueLight : P.blue,
      blueRaw: dark ? '#8EA6F2' : '#2343B0',
      cop: dark ? P.copperLight : P.copperFill,
      copText: dark ? P.copperLight : P.copper,
      card: dark ? '#161B26' : '#FFFFFF',
      bg: dark ? P.night : P.paper
    };
    var COPA = dark ? '#E39A6C' : '#C8693A';

    /* ---------- durum ---------- */
    var view, auto, vt0, lastT, vl, amp, freq, ampD, fD, firstFrame;
    function resetState() {
      view = 'genlik'; auto = true; vt0 = 0; lastT = 0; vl = 0;
      amp = 1; freq = 2; ampD = 1; fD = 2; firstFrame = true;
    }
    resetState();

    /* ---------- geometri (W ve H'den) ---------- */
    var W = 1120, H = 440, PX0, PX1, PW, CY, PH, PTOP, PBOT;
    function layout() {
      W = sf.w; H = sf.h;
      PX0 = Math.round(W * 0.075); PX1 = W - Math.round(W * 0.03); PW = PX1 - PX0;
      PH = Math.round(H * 0.34); CY = Math.round(H * 0.5); PTOP = CY - PH; PBOT = CY + PH;
    }
    layout();

    /* ---------- çizim yardımcıları ---------- */
    function txt(g, s, x, y, o) { K.label(g, s, x, y, o); }
    function tag(g, s, xr, y) {
      g.save();
      g.font = K.font(12, 500, true);
      var w = g.measureText(s).width + 14;
      g.strokeStyle = C.muted; g.lineWidth = 1;
      K.rr(g, xr - w + 0.5, y - 14.5, w, 20, 5); g.stroke();
      g.restore();
      txt(g, s, xr - w + 7, y, { size: 12, mono: true, weight: 500, color: C.muted });
    }
    function pill(g, s, cx, cy, o) {
      o = o || {};
      g.save();
      g.font = K.font(o.size || 17, o.weight || 600, o.mono);
      var w = g.measureText(s).width + 22;
      g.fillStyle = C.bg; g.strokeStyle = o.border || C.line2; g.lineWidth = 1.4;
      K.rr(g, cx - w / 2 + 0.5, cy - 15 + 0.5, w, 30, 8); g.fill(); g.stroke();
      g.restore();
      txt(g, s, cx, cy + 6, { size: o.size || 17, weight: o.weight || 600, mono: o.mono, color: o.color || C.ink, align: 'center' });
    }
    function head(g, x, y, dx, dy, col, sz) {
      var a = sz || 9;
      g.save();
      g.fillStyle = col;
      g.beginPath();
      g.moveTo(x, y);
      g.lineTo(x - dx * a - dy * a * 0.45, y - dy * a + dx * a * 0.45);
      g.lineTo(x - dx * a + dy * a * 0.45, y - dy * a - dx * a * 0.45);
      g.closePath(); g.fill();
      g.restore();
    }
    function arrow2(g, x0, y0, x1, y1, col, lw) {
      var dx = x1 - x0, dy = y1 - y0, L = Math.sqrt(dx * dx + dy * dy) || 1;
      dx /= L; dy /= L;
      g.save();
      g.strokeStyle = col; g.lineWidth = lw || 2.4; g.lineCap = 'butt';
      g.beginPath(); g.moveTo(x0 + dx * 6, y0 + dy * 6); g.lineTo(x1 - dx * 6, y1 - dy * 6); g.stroke();
      g.restore();
      head(g, x1, y1, dx, dy, col, 10);
      head(g, x0, y0, -dx, -dy, col, 10);
    }
    function msX(ms) { return PX0 + ms / 1000 * PW; }
    function curve(g, f, A, ms0, ms1) {
      var x, ms, y, xa = msX(ms0), xb = msX(ms1);
      g.beginPath();
      for (x = xa; x <= xb + 0.01; x += 1) {
        ms = (x - PX0) / PW * 1000;
        y = CY - A * PH * Math.sin(TAU * f * ms / 1000);
        if (x === xa) g.moveTo(x, y); else g.lineTo(x, y);
      }
    }

    /* osiloskop zemini: kart, ızgara; yalnızca uç değerleri etiketli */
    function scopeBase(g, noV) {
      var i, x, y;
      g.save();
      g.fillStyle = C.card; g.strokeStyle = C.line2; g.lineWidth = 1;
      K.rr(g, PX0 + 0.5, PTOP + 0.5, PW, PH * 2, 4); g.fill(); g.stroke();
      g.strokeStyle = C.line; g.lineWidth = 1;
      for (i = 1; i < 8; i++) {
        x = Math.round(PX0 + PW * i / 8) + 0.5;
        g.beginPath(); g.moveTo(x, PTOP); g.lineTo(x, PBOT); g.stroke();
      }
      for (i = -2; i <= 2; i++) {
        y = Math.round(CY - i * PH / 2) + 0.5;
        if (i === 0) continue;
        g.beginPath(); g.moveTo(PX0, y); g.lineTo(PX1, y); g.stroke();
      }
      g.strokeStyle = C.muted; g.lineWidth = 1.3;
      g.beginPath(); g.moveTo(PX0, CY + 0.5); g.lineTo(PX1, CY + 0.5); g.stroke();
      g.restore();
      if (!noV) {
        txt(g, '+5 V', PX0 - 10, PTOP + 6, { size: 16, mono: true, weight: 500, color: C.muted, align: 'right' });
        txt(g, '−5 V', PX0 - 10, PBOT + 6, { size: 16, mono: true, weight: 500, color: C.muted, align: 'right' });
      }
      txt(g, '0', PX0, PBOT + 26, { size: 16, mono: true, weight: 500, color: C.muted, align: 'center' });
      txt(g, '1 saniye', PX1, PBOT + 26, { size: 16, mono: true, weight: 500, color: C.muted, align: 'right' });
    }

    function sweepDot(g, s, f, A) {
      var ms = s * 1000, x = msX(ms), y = CY - A * PH * Math.sin(TAU * f * ms / 1000);
      g.save();
      g.strokeStyle = K.rgba(C.blueRaw, 0.35); g.lineWidth = 1.2; g.setLineDash([3, 4]);
      g.beginPath(); g.moveTo(x, PTOP); g.lineTo(x, PBOT); g.stroke();
      g.setLineDash([]);
      g.fillStyle = C.cop; g.strokeStyle = C.bg; g.lineWidth = 2.5;
      g.beginPath(); g.arc(x, y, 8, 0, TAU); g.fill(); g.stroke();
      g.restore();
    }

    /* ---------- görünüm: genlik ---------- */
    function drawGenlik(g, t) {
      var A = ampD, xp = msX(250 / fD), yp = CY - A * PH;
      scopeBase(g);
      g.save();
      g.strokeStyle = K.rgba(COPA, 0.7); g.lineWidth = 1.6; g.setLineDash([7, 6]);
      g.beginPath(); g.moveTo(PX0, yp); g.lineTo(PX1, yp); g.moveTo(PX0, CY + A * PH); g.lineTo(PX1, CY + A * PH); g.stroke();
      g.restore();
      g.save();
      g.beginPath(); g.rect(PX0, PTOP, PW, PH * 2); g.clip();
      g.strokeStyle = C.blue; g.lineWidth = 4; g.lineJoin = 'round';
      curve(g, fD, A, 0, 1000); g.stroke();
      g.restore();
      arrow2(g, xp, CY, xp, yp, C.copText, 3);
      pill(g, 'genlik = ' + K.num(Math.round(amp * 50) / 10, 1) + ' V', xp + 120, (CY + yp) / 2, { color: C.copText, border: C.cop, mono: true, size: 19 });
      sweepDot(g, (K.reducedMotion ? 0.37 : (t % 5) / 5), fD, A);
    }

    /* ---------- görünüm: frekans ---------- */
    function drawFrekans(g, t) {
      var A = ampD, n = Math.round(fD), k, x0, s = (K.reducedMotion ? 0.62 : (t % 5) / 5), done = Math.floor(s * fD + 1e-6);
      scopeBase(g);
      for (k = 0; k <= n; k++) {
        x0 = msX(1000 * k / fD);
        if (x0 > PX1 + 1) break;
        g.save(); g.strokeStyle = K.rgba(C.blueRaw, 0.4); g.lineWidth = 1.2; g.setLineDash([2, 4]);
        g.beginPath(); g.moveTo(x0, PTOP - 22); g.lineTo(x0, PBOT); g.stroke(); g.restore();
      }
      g.save();
      g.beginPath(); g.rect(PX0, PTOP, PW, PH * 2); g.clip();
      g.strokeStyle = C.blue; g.lineWidth = 4; g.lineJoin = 'round';
      curve(g, fD, A, 0, 1000); g.stroke();
      g.restore();
      for (k = 0; k < n; k++) {
        x0 = msX(1000 * (k + 0.5) / fD);
        if (x0 > PX1) break;
        var on = k < done;
        g.save();
        g.fillStyle = on ? C.cop : C.bg; g.strokeStyle = on ? C.cop : C.muted; g.lineWidth = 1.6;
        g.beginPath(); g.arc(x0, PTOP - 22, 14, 0, TAU); g.fill(); g.stroke();
        g.restore();
        txt(g, String(k + 1), x0, PTOP - 16, { size: 16, mono: true, weight: 600, color: on ? (dark ? P.night : '#FFFFFF') : C.ink2, align: 'center' });
      }
      sweepDot(g, s, fD, A);
      pill(g, 'frekans = ' + K.num(freq, 0) + ' Hz', PX0 + PW / 2, PBOT - 30, { color: C.copText, border: C.cop, mono: true, size: 20 });
    }

    /* ---------- görünüm: periyot ---------- */
    function drawPeriyot(g, t) {
      var A = ampD, Tm = 1000 / fD, xa = msX(0), xb = msX(Tm), x, ms, y, ex = (freq === 1 || freq === 2 || freq === 4 || freq === 5 || freq === 8);
      var ay = PBOT + 10;
      scopeBase(g);
      g.save();
      g.beginPath(); g.rect(PX0, PTOP, PW, PH * 2); g.clip();
      g.fillStyle = K.rgba(C.blueRaw, 0.12);
      g.beginPath(); g.moveTo(xa, CY);
      for (x = xa; x <= xb + 0.01; x += 1) {
        ms = (x - PX0) / PW * 1000;
        y = CY - A * PH * Math.sin(TAU * fD * ms / 1000);
        g.lineTo(x, y);
      }
      g.lineTo(xb, CY); g.closePath(); g.fill();
      g.strokeStyle = C.blue; g.lineWidth = 4; g.lineJoin = 'round';
      curve(g, fD, A, 0, 1000); g.stroke();
      g.strokeStyle = C.copText; g.lineWidth = 6;
      curve(g, fD, A, 0, Tm); g.stroke();
      g.restore();
      g.save();
      g.strokeStyle = K.rgba(COPA, 0.8); g.lineWidth = 1.5; g.setLineDash([4, 4]);
      g.beginPath(); g.moveTo(xa + 0.5, CY); g.lineTo(xa + 0.5, ay); g.moveTo(xb + 0.5, CY); g.lineTo(xb + 0.5, ay); g.stroke();
      g.restore();
      arrow2(g, xa, ay, xb, ay, C.copText, 3);
      pill(g, 'T = 1 ÷ ' + K.num(freq, 0) + ' = ' + (ex ? '' : '≈ ') + tSec(freq) + ' s', Math.max(PX0 + 130, (xa + xb) / 2 + 80), ay + 28, { size: 19, weight: 600, color: C.copText, mono: true, border: C.cop });
      sweepDot(g, (K.reducedMotion ? 0.37 : (t % 5) / 5), fD, A);
    }

    /* ---------- görünüm: dalga boyu ---------- */
    function waveRow(g, cy, Aw, lamPx, drift, name, lamLabel) {
      var WX0 = PX0, WX1 = PX1, x, y, s = drift % lamPx, u = s / lamPx, al, xa, xb, ya = cy - Aw - 18;
      g.save();
      g.strokeStyle = C.line2; g.lineWidth = 1;
      g.beginPath(); g.moveTo(WX0, cy + 0.5); g.lineTo(WX1, cy + 0.5); g.stroke();
      g.beginPath(); g.rect(WX0 - 2, cy - Aw - 4, WX1 - WX0 + 4, Aw * 2 + 8); g.clip();
      g.strokeStyle = C.blue; g.lineWidth = 4; g.lineJoin = 'round';
      g.beginPath();
      for (x = WX0; x <= WX1; x += 1) {
        y = cy - Aw * Math.cos(TAU * (x - WX0 - s) / lamPx);
        if (x === WX0) g.moveTo(x, y); else g.lineTo(x, y);
      }
      g.stroke();
      g.restore();
      al = K.smoothstep(0, 0.14, u) * (1 - K.smoothstep(0.86, 1, u));
      xa = WX0 + s + lamPx; xb = xa + lamPx;
      g.save();
      g.globalAlpha *= al;
      g.strokeStyle = K.rgba(COPA, 0.8); g.lineWidth = 1.5; g.setLineDash([3, 4]);
      g.beginPath(); g.moveTo(xa, ya); g.lineTo(xa, cy - Aw); g.moveTo(xb, ya); g.lineTo(xb, cy - Aw); g.stroke();
      g.setLineDash([]);
      arrow2(g, xa, ya, xb, ya, C.copText, 3);
      pill(g, lamLabel, (xa + xb) / 2 + (lamPx < 120 ? 70 : 0), ya - 24, { size: 17, weight: 600, mono: true, color: C.copText, border: C.cop });
      g.restore();
      txt(g, name, WX0, cy + Aw + 30, { size: 18, weight: 700, color: C.ink });
    }
    function drawDalgaboyu(g, t) {
      var drift = K.reducedMotion ? 60 : t * 60;
      var pxPerM = PW / 2.3;
      waveRow(g, Math.round(H * 0.25), 36, 0.78 * pxPerM, drift, 'ses · 440 Hz · hız 343 m/s', 'λ ≈ 0,78 m');
      g.save(); g.strokeStyle = C.line; g.lineWidth = 1; g.beginPath(); g.moveTo(PX0, Math.round(H * 0.47) + 0.5); g.lineTo(PX1, Math.round(H * 0.47) + 0.5); g.stroke(); g.restore();
      waveRow(g, Math.round(H * 0.7), 36, 0.125 * pxPerM, K.reducedMotion ? 20 : t * 300, 'Wi-Fi · 2,4 GHz · hız: ışık hızı', 'λ = 12,5 cm');
    }

    /* ---------- görünüm: ölçek ---------- */
    function drawOlcek(g, t) {
      var RX0 = 46, RX1 = W - 46, RPD = (RX1 - RX0) / 15, RY = Math.round(H * 0.6);
      function LX(d) { return RX0 + d * RPD; }
      var step = 9 / ITEMS.length, fi = K.reducedMotion ? 2 : Math.floor(Math.max(0, vl) / step) % ITEMS.length;
      var d, i, it;
      g.save();
      g.strokeStyle = C.ink2; g.lineWidth = 3;
      g.beginPath(); g.moveTo(LX(0), RY); g.lineTo(LX(15), RY); g.stroke();
      g.lineWidth = 1.4; g.strokeStyle = C.muted;
      for (d = 0; d <= 15; d++) {
        g.beginPath(); g.moveTo(Math.round(LX(d)) + 0.5, RY - (d % 3 === 0 ? 10 : 6)); g.lineTo(Math.round(LX(d)) + 0.5, RY + (d % 3 === 0 ? 10 : 6)); g.stroke();
      }
      g.restore();
      var dl = { 3: '1 kHz', 6: '1 MHz', 9: '1 GHz', 12: '1 THz' };
      for (d in dl) txt(g, dl[d], LX(+d), RY + 36, { size: 16, mono: true, weight: 500, color: C.muted, align: 'center' });
      /* duyma bandı */
      g.save();
      g.fillStyle = K.rgba(C.blueRaw, 0.14);
      g.fillRect(LX(BAND[0]), RY - 5, LX(BAND[1]) - LX(BAND[0]), 10);
      g.restore();
      /* noktalar */
      for (i = 0; i < ITEMS.length; i++) {
        var on = i === fi;
        g.save();
        g.fillStyle = on ? C.cop : C.ink2; g.strokeStyle = C.bg; g.lineWidth = 2;
        g.beginPath(); g.arc(LX(ITEMS[i].d), RY, on ? 10 : 6, 0, TAU); g.fill(); g.stroke();
        if (on) {
          var p = (t * 0.9) % 1;
          g.globalAlpha = (1 - p) * 0.7; g.strokeStyle = C.copText; g.lineWidth = 3;
          g.beginPath(); g.arc(LX(ITEMS[i].d), RY, 12 + 12 * p, 0, TAU); g.stroke();
        }
        g.restore();
      }
      /* odaktaki madde kartı */
      it = ITEMS[fi];
      var x = LX(it.d), lines = [it.name].concat(it.l), cw, ch = 16 + 30 + it.l.length * 28, cx0, cy0 = RY - 70 - ch;
      g.save(); g.font = K.font(22, 700);
      cw = g.measureText(it.name).width;
      g.font = K.font(20, 500);
      for (i = 0; i < it.l.length; i++) cw = Math.max(cw, g.measureText(it.l[i]).width);
      g.restore();
      cw += 36;
      cx0 = clamp(x - cw / 2, 16, W - 16 - cw);
      g.save();
      g.strokeStyle = C.copText; g.lineWidth = 2;
      g.beginPath(); g.moveTo(x, RY - 12); g.lineTo(x, cy0 + ch); g.stroke();
      g.fillStyle = K.rgba(COPA, dark ? 0.16 : 0.12); g.strokeStyle = C.cop; g.lineWidth = 1.5;
      K.rr(g, cx0 + 0.5, cy0 + 0.5, cw, ch, 8); g.fill(); g.stroke();
      g.restore();
      txt(g, it.name, cx0 + 18, cy0 + 32, { size: 22, weight: 700, color: C.ink });
      for (i = 0; i < it.l.length; i++) txt(g, it.l[i], cx0 + 18, cy0 + 32 + 28 * (i + 1), { size: 20, weight: 600, mono: true, color: C.copText });
      void lines;
    }

    /* ---------- kare ---------- */
    function frame(t, dt) {
      var g = sf.ctx, k;
      layout();
      lastT = t;
      var idx, fade, i, acc;
      if (auto && !K.reducedMotion) {
        var tt = t % TOTAL;
        acc = 0;
        for (i = 0; i < VIEWS.length; i++) { if (tt < acc + DUR[VIEWS[i]]) break; acc += DUR[VIEWS[i]]; }
        idx = Math.min(i, VIEWS.length - 1);
        view = VIEWS[idx];
        vl = tt - acc;
        var D = DUR[view];
        fade = clamp(vl / 0.3, 0, 1) * clamp((D - vl) / 0.3, 0, 1);
        if (view === 'genlik') { freq = 2; amp = Math.round((0.6 + 0.4 * Math.cos(vl / 4 * TAU)) * 10) / 10; }
        else if (view === 'frekans') { amp = 0.7; freq = clamp(1 + Math.floor(vl), 1, 8); }
        else if (view === 'periyot') { amp = 0.7; freq = [2, 4, 5, 8][Math.min(3, Math.floor(vl / 2))]; }
      } else if (K.reducedMotion) {
        vl = 6; fade = 1;
        if (auto) { view = 'genlik'; }
      } else {
        vl = Math.max(0, t - vt0);
        fade = clamp(vl / 0.25, 0, 1);
      }
      if (firstFrame) { ampD = amp; fD = freq; firstFrame = false; }
      k = 1 - Math.exp(-Math.max(dt || 0, 0.016) * 9);
      ampD += (amp - ampD) * k; fD += (freq - fD) * k;
      if (Math.abs(ampD - amp) < 0.003) ampD = amp;
      if (Math.abs(fD - freq) < 0.01) fD = freq;

      sf.clear();
      tag(g, 'yavaşlatılmış · basitleştirilmiş', W - 12, H - 8);
      g.save();
      g.globalAlpha = fade;
      if (view === 'genlik') drawGenlik(g, t);
      else if (view === 'frekans') drawFrekans(g, t);
      else if (view === 'periyot') drawPeriyot(g, t);
      else if (view === 'dalgaboyu') drawDalgaboyu(g, t);
      else drawOlcek(g, t);
      g.restore();
    }

    function numbers() {
      var f = freq, ex = !!EXACT[f];
      if (view === 'genlik') return 'tepe değeri = ' + K.num(amp, 1) + ' × 5 V = ' + K.num(Math.round(amp * 50) / 10, 1) + ' V';
      if (view === 'frekans') return 'f = ' + f + ' Hz: 1 saniyede ' + f + ' tam salınım';
      if (view === 'periyot') return 'f = ' + f + ' Hz → T = 1 ÷ ' + f + (ex ? ' = ' : ' ≈ ') + tSec(f) + ' s';
      if (view === 'dalgaboyu') return 'ses: 343 ÷ 440 ≈ 0,78 m · Wi-Fi: 300.000.000 ÷ 2.400.000.000 = 0,125 m';
      var fi = K.reducedMotion ? 2 : Math.floor(Math.max(0, vl) / (9 / ITEMS.length)) % ITEMS.length;
      return ITEMS[fi].calc;
    }

    return {
      reset: function () { resetState(); },
      frame: frame,
      set: function (key, val) {
        var v;
        if (key === 'view') {
          if (VIEWS.indexOf(val) >= 0) { view = val; auto = false; vt0 = lastT; }
        } else if (key === 'amp') {
          v = parseFloat(val);
          if (isFinite(v)) { amp = Math.round(clamp(v, 0.2, 1) * 10) / 10; auto = false; }
        } else if (key === 'freq') {
          v = parseFloat(val);
          if (isFinite(v)) { freq = Math.round(clamp(v, 1, 8)); auto = false; }
        }
      },
      read: function (key) {
        if (key === 'view') return view;
        if (key === 'explain') return EXPLAIN[view];
        if (key === 'numbers') return numbers();
        if (key === 'amp') return K.num(amp, 1);
        if (key === 'freq') return String(freq);
        return '';
      },
      resize: function () { sf.resize(); },
      dispose: function () { sf.dispose(); }
    };
  });
})();
