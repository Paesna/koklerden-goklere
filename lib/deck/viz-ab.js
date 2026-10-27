/* Köklerden Göklere · Builder AB: dalga laboratuvarı
 * wave-lab · 1120×380 · açık/koyu tema (2B, düz "müze çizimi" biçimi)
 * Genlik, frekans, periyot, dalga boyu ve frekans ölçeği.
 * Görünümler: genlik, frekans, periyot, dalgaboyu, olcek.
 * Kontroller: set('view', ...), set('amp', 0.2..1), set('freq', 1..8).
 * Sözleşme: kg-viz.js. Hareket frame(t, dt) içinden sürülür, rastgelelik yok.
 */
(function () {
  'use strict';
  var K = window.KGViz;
  if (!K) return;
  var P = K.palette;
  var clamp = K.clamp;
  var TAU = Math.PI * 2;

  var VIEWS = ['genlik', 'frekans', 'periyot', 'dalgaboyu', 'olcek'];
  var DEMO = 8;
  var VMAX = 5;                 // dikey eksen: ±5 V

  /* ---------- geometri (CSS px, 1120×380) ---------- */
  var PX0 = 90, PX1 = 830, PW = PX1 - PX0;      // zaman eksenı: 0–1000 ms
  var CY = 172, PH = 100;                        // sıfır çizgisi ve 5 V'un yüksekliği
  var PTOP = CY - PH, PBOT = CY + PH;
  var CX0 = 860, CW = 236, CT = 60, CB = 298;    // sağ bilgi kartı

  /* ---------- ölçek görünümü: logaritmik cetvel ---------- */
  var RY = 232, RX0 = 44, RPD = 68.4;            // cetvel çizgisi, 1 Hz'in x'i, bir onluk için px
  function LX(d) { return RX0 + d * RPD; }
  function lg(x) { return Math.log(x) / Math.LN10; }
  var ITEMS = [
    { d: 0, name: '1 Hz · kalp atışı', l: ['T = 1 s', '(yaklaşık)'], up: 2, an: 'l',
      calc: 'f = 1 Hz → T = 1 ÷ 1 = 1 s' },
    { d: lg(50), name: '50 Hz · priz', l: ['T = 20 ms'], up: 1, an: 'l',
      calc: 'f = 50 Hz → T = 1 ÷ 50 = 0,02 s = 20 ms' },
    { d: lg(440), name: '440 Hz · la notası', l: ['T ≈ 2,3 ms', 'λ ≈ 0,78 m'], up: -1, an: 'l',
      calc: 'f = 440 Hz → T = 1 ÷ 440 ≈ 2,3 ms' },
    { d: lg(2000), name: 'duyma aralığı', l: ['20 Hz – 20 kHz', 'T = 50 ms – 50 µs'], up: -1, an: 'r', band: [lg(20), lg(20000)], rx: 218,
      calc: 'T = 1 ÷ 20 = 50 ms ·  T = 1 ÷ 20.000 = 50 µs' },
    { d: lg(40000), name: '40 kHz · ultrasonik sensör', l: ['T = 25 µs', 'λ ≈ 8,6 mm (havada)'], up: 1, an: 'l',
      calc: 'f = 40.000 Hz → T = 1 ÷ 40.000 = 25 µs' },
    { d: 8, name: '100 MHz · FM radyo', l: ['T = 10 ns', 'λ = 3 m'], up: 1, an: 'l',
      calc: 'λ = c ÷ f = 300.000.000 ÷ 100.000.000 = 3 m' },
    { d: lg(2.4e9), name: '2,4 GHz · Wi-Fi', l: ['T ≈ 0,42 ns', 'λ = 12,5 cm'], up: -1, an: 'r',
      calc: 'λ = 300.000.000 ÷ 2.400.000.000 = 0,125 m' },
    { d: lg(3e9), name: '3 GHz · işlemci saati', l: ['T ≈ 0,33 ns'], up: -1, an: 'l',
      calc: 'f = 3 GHz → T = 1 ÷ 3.000.000.000 ≈ 0,33 ns' },
    { d: lg(5e14), name: '500 THz · görünür ışık', l: ['λ = 600 nm', '(turuncu ışık)'], up: 1, an: 'r',
      calc: 'λ = 300.000.000 ÷ 500.000.000.000.000 = 600 nm' }
  ];

  /* ---------- metinler ---------- */
  var EXPLAIN = {
    genlik: 'Genlik, dalganın orta çizgiden en uzak noktasının (tepe değerinin) büyüklüğüdür. Genlik büyüdükçe ses yükselir, ışık parlar, sinyal güçlenir.',
    frekans: 'Frekans, bir saniyedeki tam salınım sayısıdır ve birimi hertzdir (Hz). Salınım ne kadar sık olursa frekans o kadar yüksektir.',
    periyot: 'Periyot, bir tam salınımın süresidir. Frekansla ters bağlıdır: frekans iki katına çıkarsa periyot yarıya iner.',
    dalgaboyu: 'Dalga boyu, uzayda iki tepe arasındaki uzaklıktır. Hız = dalga boyu × frekans; radyo dalgaları ışık hızıyla gider, sesten yaklaşık 875.000 kat hızlı.',
    olcek: 'Frekans çok geniş bir aralıkta değişir; cetvelde her çentik bir öncekinin 10 katıdır. Kalp atışından görünür ışığa kadar hepsi aynı dalga fikridir.'
  };
  var CAPTION = {
    genlik: 'genlik: orta çizgiden en uzak nokta; büyük genlik = güçlü ses, parlak ışık, güçlü sinyal',
    frekans: 'frekans: 1 saniyedeki tam salınım sayısı; birimi hertz (Hz); pencere 1 saniyedir',
    periyot: 'periyot: bir tam salınımın süresi; frekansla ters bağlı: f = 1 ÷ T ve T = 1 ÷ f',
    dalgaboyu: 'radyo dalgaları ışık hızıyla gider: sesten yaklaşık 875.000 kat hızlı; v = λ × f ikisi için de geçerli',
    olcek: 'logaritmik cetvel: her çentik bir öncekinin 10 katı; kalp atışından görünür ışığa yaklaşık 15 çentik'
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
      grey: dark ? '#9AA3B2' : '#666C78',
      card: dark ? '#161B26' : '#FFFFFF',
      bg: dark ? P.night : P.paper
    };

    /* ---------- durum ---------- */
    var view, auto, vt0, lastT, vl, amp, freq, ampD, fD, firstFrame;
    function resetState() {
      view = 'genlik'; auto = true; vt0 = 0; lastT = 0; vl = 0;
      amp = 1; freq = 2; ampD = 1; fD = 2; firstFrame = true;
    }
    resetState();

    function focusIdx() {
      if (K.reducedMotion) return 1;
      var step = auto ? DEMO / ITEMS.length : 1.6;
      return Math.floor(Math.max(0, vl) / step) % ITEMS.length;
    }

    /* ---------- çizim yardımcıları ---------- */
    function txt(g, s, x, y, o) { K.label(g, s, x, y, o); }
    function tag(g, s, xr, y) {
      g.save();
      g.font = K.font(13, 500, true);
      var w = g.measureText(s).width + 16;
      g.strokeStyle = C.muted; g.lineWidth = 1;
      K.rr(g, xr - w + 0.5, y - 15.5, w, 24, 5); g.stroke();
      g.restore();
      txt(g, s, xr - w + 8, y + 1, { size: 13, mono: true, weight: 500, color: C.muted });
    }
    function card(g, x, y, w, h) {
      g.save();
      g.fillStyle = C.card; g.strokeStyle = C.line2; g.lineWidth = 1;
      K.rr(g, x + 0.5, y + 0.5, w, h, 10); g.fill(); g.stroke();
      g.restore();
    }
    function pill(g, s, cx, cy, o) {
      o = o || {};
      g.save();
      g.font = K.font(o.size || 14, o.weight || 600, o.mono);
      var w = g.measureText(s).width + 18;
      g.fillStyle = C.bg; g.strokeStyle = o.border || C.line2; g.lineWidth = 1;
      K.rr(g, cx - w / 2 + 0.5, cy - 12 + 0.5, w, 24, 6); g.fill(); g.stroke();
      g.restore();
      txt(g, s, cx, cy + 5, { size: o.size || 14, weight: o.weight || 600, mono: o.mono, color: o.color || C.ink, align: 'center' });
    }
    function head(g, x, y, dx, dy, col, sz) {      // dolu ok başı: (x,y) uçta, (dx,dy) birim yön (uca doğru)
      var a = sz || 8;
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
      g.strokeStyle = col; g.lineWidth = lw || 2; g.lineCap = 'butt';
      g.beginPath(); g.moveTo(x0 + dx * 6, y0 + dy * 6); g.lineTo(x1 - dx * 6, y1 - dy * 6); g.stroke();
      g.restore();
      head(g, x1, y1, dx, dy, col, 9);
      head(g, x0, y0, -dx, -dy, col, 9);
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

    /* osiloskop zemini: kart, ızgara, V ve ms çentikleri */
    function scopeBase(g) {
      var i, v, x, y;
      g.save();
      g.fillStyle = C.card; g.strokeStyle = C.line2; g.lineWidth = 1;
      K.rr(g, PX0 + 0.5, PTOP + 0.5, PW, PH * 2, 4); g.fill(); g.stroke();
      g.strokeStyle = C.line; g.lineWidth = 1;
      for (i = 1; i < 8; i++) {                  // dikey ızgara her 125 ms
        x = Math.round(PX0 + PW * i / 8) + 0.5;
        g.beginPath(); g.moveTo(x, PTOP); g.lineTo(x, PBOT); g.stroke();
      }
      for (i = -2; i <= 2; i++) {                // yatay ızgara her 2,5 V
        y = Math.round(CY - i * PH / 2) + 0.5;
        if (i === 0) continue;
        g.beginPath(); g.moveTo(PX0, y); g.lineTo(PX1, y); g.stroke();
      }
      g.strokeStyle = C.muted; g.lineWidth = 1.3;
      g.beginPath(); g.moveTo(PX0, CY + 0.5); g.lineTo(PX1, CY + 0.5); g.stroke();
      g.restore();
      for (i = -2; i <= 2; i++) {
        v = i * 2.5;
        txt(g, (v > 0 ? '+' : v < 0 ? '−' : '') + K.num(Math.abs(v), v % 1 ? 1 : 0) + ' V', PX0 - 10, CY - i * PH / 2 + 5,
          { size: 13, mono: true, color: i === 0 ? C.ink2 : C.muted, align: 'right' });
      }
      for (i = 0; i <= 4; i++) {
        x = PX0 + PW * i / 4;
        g.save(); g.strokeStyle = C.muted; g.lineWidth = 1.2;
        g.beginPath(); g.moveTo(Math.round(x) + 0.5, PBOT); g.lineTo(Math.round(x) + 0.5, PBOT + 6); g.stroke(); g.restore();
        txt(g, K.num(i * 250, 0), x, PBOT + 21, { size: 13, mono: true, color: C.muted, align: 'center' });
      }
      txt(g, 'zaman (ms)', PX1, 338, { size: 13, mono: true, color: C.muted, align: 'right' });
    }

    function sweepDot(g, s, f, A) {
      var ms = s * 1000, x = msX(ms), y = CY - A * PH * Math.sin(TAU * f * ms / 1000);
      g.save();
      g.strokeStyle = K.rgba(C.blueRaw, 0.35); g.lineWidth = 1.2; g.setLineDash([3, 4]);
      g.beginPath(); g.moveTo(x, PTOP); g.lineTo(x, PBOT); g.stroke();
      g.setLineDash([]);
      g.fillStyle = C.cop; g.strokeStyle = C.bg; g.lineWidth = 2;
      g.beginPath(); g.arc(x, y, 6, 0, TAU); g.fill(); g.stroke();
      g.restore();
    }

    /* ---------- görünüm: genlik ---------- */
    function drawGenlik(g, t) {
      var A = ampD, xp = msX(250 / fD), yp = CY - A * PH;
      scopeBase(g);
      // ±tepe kesik çizgileri
      g.save();
      g.strokeStyle = K.rgba(dark ? '#E39A6C' : '#C8693A', 0.7); g.lineWidth = 1.4; g.setLineDash([6, 5]);
      g.beginPath(); g.moveTo(PX0, yp); g.lineTo(PX1, yp); g.moveTo(PX0, CY + A * PH); g.lineTo(PX1, CY + A * PH); g.stroke();
      g.restore();
      g.save();
      g.beginPath(); g.rect(PX0, PTOP, PW, PH * 2); g.clip();
      g.strokeStyle = C.blue; g.lineWidth = 2.8; g.lineJoin = 'round';
      curve(g, fD, A, 0, 1000); g.stroke();
      g.restore();
      arrow2(g, xp, CY, xp, yp, C.copText, 2.4);
      txt(g, 'genlik (tepe değeri) = ' + K.num(Math.round(amp * 50) / 10, 1) + ' V', xp + 12, yp - 10,
        { size: 15, weight: 600, color: C.copText });
      sweepDot(g, (K.reducedMotion ? 0.37 : (t % 5) / 5), fD, A);
      // sağ kart
      card(g, CX0, CT, CW, CB - CT);
      txt(g, 'GENLİK', CX0 + 16, CT + 28, { size: 13, mono: true, weight: 500, color: C.muted, spacing: 1.2 });
      txt(g, K.num(Math.round(amp * 50) / 10, 1) + ' V', CX0 + 16, CT + 68, { size: 38, mono: true, weight: 600, color: C.copText });
      txt(g, 'orta çizgiden en yüksek', CX0 + 16, CT + 92, { size: 14, color: C.ink2 });
      txt(g, 'noktaya olan uzaklık', CX0 + 16, CT + 110, { size: 14, color: C.ink2 });
      txt(g, 'genlik büyüdükçe:', CX0 + 16, CT + 134, { size: 13, color: C.muted });
      var rows = ['daha yüksek ses', 'daha parlak ışık', 'daha güçlü sinyal'], i, by;
      for (i = 0; i < 3; i++) {
        by = CT + 156 + i * 28;
        txt(g, rows[i], CX0 + 16, by, { size: 14, weight: 500, color: C.ink });
        g.fillStyle = C.line; K.rr(g, CX0 + 16, by + 6, 200, 7, 3.5); g.fill();
        g.fillStyle = C.blue; K.rr(g, CX0 + 16, by + 6, Math.max(7, 200 * (A - 0.0) / 1), 7, 3.5); g.fill();
      }
    }

    /* ---------- görünüm: frekans ---------- */
    function drawFrekans(g, t) {
      var A = ampD, n = Math.round(fD), k, x0, x1, s = (K.reducedMotion ? 0.62 : (t % 5) / 5), done = Math.floor(s * fD + 1e-6);
      scopeBase(g);
      for (k = 0; k <= n; k++) {                 // salınım sınırları
        x0 = msX(1000 * k / fD);
        if (x0 > PX1 + 1) break;
        g.save(); g.strokeStyle = K.rgba(C.blueRaw, 0.4); g.lineWidth = 1.2; g.setLineDash([2, 4]);
        g.beginPath(); g.moveTo(x0, 66); g.lineTo(x0, PBOT); g.stroke(); g.restore();
      }
      g.save();
      g.beginPath(); g.rect(PX0, PTOP, PW, PH * 2); g.clip();
      g.strokeStyle = C.blue; g.lineWidth = 2.8; g.lineJoin = 'round';
      curve(g, fD, A, 0, 1000); g.stroke();
      g.restore();
      for (k = 0; k < n; k++) {                  // numaralı salınım rozetleri
        x0 = msX(1000 * (k + 0.5) / fD);
        if (x0 > PX1) break;
        var on = k < done;
        g.save();
        g.fillStyle = on ? C.cop : C.bg; g.strokeStyle = on ? C.cop : C.muted; g.lineWidth = 1.4;
        g.beginPath(); g.arc(x0, 52, 12, 0, TAU); g.fill(); g.stroke();
        g.restore();
        txt(g, String(k + 1), x0, 57.5, { size: 14, mono: true, weight: 600, color: on ? (dark ? P.night : '#FFFFFF') : C.ink2, align: 'center' });
      }
      sweepDot(g, s, fD, A);
      card(g, CX0, CT, CW, CB - CT);
      txt(g, 'FREKANS', CX0 + 16, CT + 28, { size: 13, mono: true, weight: 500, color: C.muted, spacing: 1.2 });
      txt(g, K.num(freq, 0) + ' Hz', CX0 + 16, CT + 72, { size: 40, mono: true, weight: 600, color: C.copText });
      txt(g, '1 saniyede ' + K.num(freq, 0) + ' tam', CX0 + 16, CT + 98, { size: 15, weight: 600, color: C.ink });
      txt(g, 'salınım = ' + K.num(freq, 0) + ' Hz', CX0 + 16, CT + 118, { size: 15, weight: 600, color: C.ink });
      txt(g, '1 Hz = saniyede 1 salınım', CX0 + 16, CT + 152, { size: 14, color: C.ink2 });
      txt(g, 'yüksek frekans: tiz ses', CX0 + 16, CT + 190, { size: 14, color: C.ink2 });
      txt(g, 'düşük frekans: pes ses', CX0 + 16, CT + 212, { size: 14, color: C.ink2 });
    }

    /* ---------- görünüm: periyot ---------- */
    function drawPeriyot(g, t) {
      var A = ampD, Tm = 1000 / fD, xa = msX(0), xb = msX(Tm), x, ms, y, ex = (freq === 1 || freq === 2 || freq === 4 || freq === 5 || freq === 8);
      scopeBase(g);
      // vurgulu birinci salınım
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
      g.strokeStyle = C.blue; g.lineWidth = 2.8; g.lineJoin = 'round';
      curve(g, fD, A, 0, 1000); g.stroke();
      g.strokeStyle = C.copText; g.lineWidth = 4;
      curve(g, fD, A, 0, Tm); g.stroke();
      g.restore();
      // T işareti
      g.save();
      g.strokeStyle = K.rgba(dark ? '#E39A6C' : '#C8693A', 0.8); g.lineWidth = 1.3; g.setLineDash([4, 4]);
      g.beginPath(); g.moveTo(xa + 0.5, CY); g.lineTo(xa + 0.5, 308); g.moveTo(xb + 0.5, CY); g.lineTo(xb + 0.5, 308); g.stroke();
      g.restore();
      arrow2(g, xa, 306, xb, 306, C.copText, 2.4);
      pill(g, 'T = ' + tSec(freq) + ' s = ' + tMs(freq) + ' ms' + (ex ? '' : ' (yaklaşık)'), (xa + xb) / 2, 306, { size: 14.5, weight: 600, color: C.copText, mono: true, border: C.cop });
      sweepDot(g, (K.reducedMotion ? 0.37 : (t % 5) / 5), fD, A);
      // sağ kart
      card(g, CX0, CT, CW, CB - CT);
      txt(g, 'BAĞINTI', CX0 + 16, CT + 28, { size: 13, mono: true, weight: 500, color: C.muted, spacing: 1.2 });
      txt(g, 'T = 1 ÷ f', CX0 + 16, CT + 58, { size: 22, mono: true, weight: 600, color: C.ink });
      txt(g, 'f = 1 ÷ T', CX0 + 16, CT + 86, { size: 22, mono: true, weight: 600, color: C.ink });
      txt(g, 'şimdi: f = ' + K.num(freq, 0) + ' Hz, T = ' + (ex ? '' : '≈ ') + tSec(freq) + ' s', CX0 + 16, CT + 108, { size: 13, mono: true, color: C.copText, weight: 500 });
      g.save(); g.strokeStyle = C.line; g.beginPath(); g.moveTo(CX0 + 16, CT + 118.5); g.lineTo(CX0 + CW - 16, CT + 118.5); g.stroke(); g.restore();
      txt(g, 'ÖRNEK · PRİZ (100 ms)', CX0 + 16, CT + 138, { size: 13, mono: true, weight: 500, color: C.muted, spacing: 0.6 });
      // küçük ölçek: 100 ms, 5 salınım
      var mx0 = CX0 + 16, mw = CW - 32, my = CT + 162, k, mxx, my1;
      g.save();
      g.strokeStyle = C.line; g.lineWidth = 1;
      g.beginPath(); g.moveTo(mx0, my + 0.5); g.lineTo(mx0 + mw, my + 0.5); g.stroke();
      g.fillStyle = K.rgba(C.blueRaw, 0.14);
      g.beginPath(); g.moveTo(mx0, my);
      for (mxx = 0; mxx <= mw / 5 + 0.01; mxx += 1) g.lineTo(mx0 + mxx, my - 15 * Math.sin(TAU * mxx / (mw / 5)));
      g.lineTo(mx0 + mw / 5, my); g.closePath(); g.fill();
      g.strokeStyle = C.blue; g.lineWidth = 2; g.lineJoin = 'round';
      g.beginPath();
      for (mxx = 0; mxx <= mw + 0.01; mxx += 1) {
        my1 = my - 15 * Math.sin(TAU * 5 * mxx / mw);
        if (mxx === 0) g.moveTo(mx0 + mxx, my1); else g.lineTo(mx0 + mxx, my1);
      }
      g.stroke();
      g.strokeStyle = C.copText; g.lineWidth = 3;
      g.beginPath();
      for (mxx = 0; mxx <= mw / 5 + 0.01; mxx += 1) {
        my1 = my - 15 * Math.sin(TAU * 5 * mxx / mw);
        if (mxx === 0) g.moveTo(mx0 + mxx, my1); else g.lineTo(mx0 + mxx, my1);
      }
      g.stroke();
      g.restore();
      arrow2(g, mx0, my + 24, mx0 + mw / 5, my + 24, C.copText, 2);
      txt(g, '20 ms', mx0 + mw / 5 + 10, my + 29, { size: 13, mono: true, weight: 600, color: C.copText });
      txt(g, '50 Hz → T = 1 ÷ 50', CX0 + 16, CT + 212, { size: 14, mono: true, weight: 500, color: C.ink });
      txt(g, '= 0,02 s = 20 ms', CX0 + 16, CT + 231, { size: 14, mono: true, weight: 600, color: C.copText });
      void k;
    }

    /* ---------- görünüm: dalga boyu ---------- */
    var WX0 = 40, WX1 = 690, WW = WX1 - WX0;
    function waveRow(g, cy, A, lam, drift, ticks, unit, perUnit, lamLabel) {
      var x, y, s = drift % lam, u = s / lam, al, xa, xb, ya = cy - A - 11, k;
      g.save();
      g.strokeStyle = C.line; g.lineWidth = 1;
      g.beginPath(); g.moveTo(WX0, cy + 0.5); g.lineTo(WX1, cy + 0.5); g.stroke();
      g.beginPath(); g.rect(WX0 - 2, cy - A - 3, WW + 4, A * 2 + 6); g.clip();
      g.strokeStyle = C.blue; g.lineWidth = 2.8; g.lineJoin = 'round';
      g.beginPath();
      for (x = WX0; x <= WX1; x += 1) {
        y = cy - A * Math.cos(TAU * (x - WX0 - s) / lam);
        if (x === WX0) g.moveTo(x, y); else g.lineTo(x, y);
      }
      g.stroke();
      g.restore();
      // λ işareti: iki ardışık tepe arası (kenarlarda kaybolur)
      al = K.smoothstep(0, 0.14, u) * (1 - K.smoothstep(0.86, 1, u));
      xa = WX0 + s + lam; xb = xa + lam;
      g.save();
      g.globalAlpha *= al;
      g.strokeStyle = K.rgba(dark ? '#E39A6C' : '#C8693A', 0.8); g.lineWidth = 1.3; g.setLineDash([3, 4]);
      g.beginPath(); g.moveTo(xa, ya); g.lineTo(xa, cy - A); g.moveTo(xb, ya); g.lineTo(xb, cy - A); g.stroke();
      g.setLineDash([]);
      arrow2(g, xa, ya, xb, ya, C.copText, 2.2);
      pill(g, lamLabel, (xa + xb) / 2, ya - 17, { size: 14, weight: 600, mono: true, color: C.copText, border: C.cop });
      g.restore();
      // uzunluk cetveli
      var ry = cy + A + 18;
      g.save();
      g.strokeStyle = C.muted; g.lineWidth = 1.2;
      g.beginPath(); g.moveTo(WX0, ry + 0.5); g.lineTo(WX1, ry + 0.5); g.stroke();
      for (k = 0; k < ticks.length; k++) {
        x = WX0 + ticks[k] * perUnit;
        g.beginPath(); g.moveTo(Math.round(x) + 0.5, ry); g.lineTo(Math.round(x) + 0.5, ry + 6); g.stroke();
        txt(g, K.num(ticks[k], ticks[k] % 1 ? 1 : 0) + (k === ticks.length - 1 ? ' ' + unit : ''), x, ry + 21, { size: 13, mono: true, color: C.muted, align: 'center' });
      }
      g.restore();
    }
    function drawDalgaboyu(g, t) {
      var drift = K.reducedMotion ? 60 : t * 42;
      txt(g, 'v = λ × f', 24, 31, { size: 18, mono: true, weight: 600, color: C.ink });
      txt(g, 'hız = dalga boyu × frekans', 140, 31, { size: 14, color: C.muted });
      // satır ayırıcı
      g.save(); g.strokeStyle = C.line; g.lineWidth = 1; g.beginPath(); g.moveTo(24, 192.5); g.lineTo(1096, 192.5); g.stroke(); g.restore();
      // ses: 0–2 m, 250 px/m
      waveRow(g, 118, 30, 0.78 * 250, drift, [0, 0.5, 1, 1.5, 2, 2.5], 'm', 250, 'λ ≈ 0,78 m');
      // radyo: 0–60 cm, 10,8 px/cm
      waveRow(g, 262, 30, 12.5 * 10.8, drift, [0, 10, 20, 30, 40, 50, 60], 'cm', 10.8, 'λ = 12,5 cm');
      var X = 724;
      txt(g, 'SES · havada', X, 66, { size: 15, weight: 700, color: C.ink });
      txt(g, 'v = 343 m/s', X, 92, { size: 14.5, mono: true, weight: 500, color: C.ink });
      txt(g, 'f = 440 Hz (la notası)', X, 114, { size: 14.5, mono: true, weight: 500, color: C.ink });
      txt(g, 'λ = 343 ÷ 440 ≈ 0,78 m', X, 138, { size: 14.5, mono: true, weight: 600, color: C.copText });
      txt(g, 'RADYO, Wi-Fi · elektromanyetik dalga', X, 216, { size: 15, weight: 700, color: C.ink });
      txt(g, 'c = 300.000.000 m/s', X, 242, { size: 14.5, mono: true, weight: 600, color: C.ink });
      txt(g, '(ışık hızı)', X + 180, 242, { size: 14, weight: 600, color: C.copText });
      txt(g, 'f = 2,4 GHz = 2.400.000.000 Hz', X, 264, { size: 14.5, mono: true, weight: 500, color: C.ink });
      txt(g, 'λ = 300.000.000 ÷ 2.400.000.000', X, 288, { size: 14.5, mono: true, weight: 600, color: C.copText });
      txt(g, '  = 0,125 m = 12,5 cm', X, 308, { size: 14.5, mono: true, weight: 600, color: C.copText });
    }

    /* ---------- görünüm: ölçek ---------- */
    function drawOlcek(g, t) {
      var i, it, x, fi = focusIdx(), d;
      txt(g, 'logaritmik frekans cetveli', 24, 31, { size: 16, weight: 600, color: C.ink });
      txt(g, 'her çentik bir öncekinin 10 katı', 24, 52, { size: 14, color: C.muted });
      // cetvel
      g.save();
      g.strokeStyle = C.ink2; g.lineWidth = 2.2;
      g.beginPath(); g.moveTo(LX(0), RY); g.lineTo(LX(15), RY); g.stroke();
      g.lineWidth = 1.2; g.strokeStyle = C.muted;
      for (d = 0; d <= 15; d++) {
        g.beginPath(); g.moveTo(Math.round(LX(d)) + 0.5, RY - (d % 3 === 0 ? 8 : 5)); g.lineTo(Math.round(LX(d)) + 0.5, RY + (d % 3 === 0 ? 8 : 5)); g.stroke();
      }
      g.restore();
      var dl = { 3: '1 kHz', 6: '1 MHz', 9: '1 GHz', 12: '1 THz', 15: '1 PHz' };
      for (d in dl) txt(g, dl[d], +d === 15 ? LX(15) + 14 : LX(+d), +d === 15 ? RY + 28 : RY - 14, { size: 13, mono: true, color: C.muted, align: +d === 15 ? 'right' : 'center' });
      // duyma bandı
      var hb = ITEMS[3];
      g.save();
      g.fillStyle = K.rgba(C.blueRaw, fi === 3 ? 0.3 : 0.16);
      g.fillRect(LX(hb.band[0]), RY + 5, LX(hb.band[1]) - LX(hb.band[0]), 13);
      g.strokeStyle = C.blue; g.lineWidth = fi === 3 ? 2.4 : 1.4;
      g.strokeRect(LX(hb.band[0]) + 0.5, RY + 5.5, LX(hb.band[1]) - LX(hb.band[0]), 12);
      g.restore();
      // maddeler
      for (i = 0; i < ITEMS.length; i++) {
        it = ITEMS[i];
        var on = i === fi, isBand = !!it.band;
        x = LX(it.d);
        var tierY, ly0, bw, bx, ty, nL, bh;
        nL = 1 + it.l.length; bh = nL * 17 + 8;
        if (it.up > 0) { tierY = it.up === 1 ? 146 : 84; ly0 = tierY - 2; }
        else { tierY = 262; ly0 = tierY - 2; }
        g.save();
        g.font = K.font(14.5, 600);
        bw = g.measureText(it.name).width;
        g.font = K.font(13.5, 400);
        for (var q = 0; q < it.l.length; q++) bw = Math.max(bw, g.measureText(it.l[q]).width);
        g.restore();
        bw += 14;
        if (isBand) { x = it.rx; }
        bx = it.an === 'l' ? x : x - bw;
        // iletici çizgi ve nokta
        if (!isBand) {
          var yTo = it.up > 0 ? ly0 + bh : ly0;
          g.save();
          g.strokeStyle = on ? C.copText : C.muted; g.lineWidth = on ? 1.8 : 1;
          g.beginPath(); g.moveTo(Math.round(x) + 0.5, RY); g.lineTo(Math.round(x) + 0.5, yTo); g.stroke();
          g.fillStyle = on ? C.cop : C.ink2; g.strokeStyle = C.bg; g.lineWidth = 2;
          g.beginPath(); g.arc(x, RY, on ? 7 : 5, 0, TAU); g.fill(); g.stroke();
          g.restore();
        }
        // kutu
        if (on) {
          g.save();
          g.fillStyle = K.rgba(dark ? '#E39A6C' : '#C8693A', dark ? 0.16 : 0.13);
          g.strokeStyle = C.cop; g.lineWidth = 1.2;
          K.rr(g, bx + 0.5, ly0 + 0.5, bw, bh, 6); g.fill(); g.stroke();
          g.restore();
        }
        var tx = it.an === 'l' ? bx + 7 : bx + bw - 7, al = it.an === 'l' ? 'left' : 'right';
        ty = ly0 + 18;
        txt(g, it.name, tx, ty, { size: 14.5, weight: 600, color: on ? C.ink : C.ink2, align: al });
        for (q = 0; q < it.l.length; q++) {
          txt(g, it.l[q], tx, ty + 17 * (q + 1), { size: 13.5, color: on ? C.copText : C.muted, weight: on ? 600 : 400, align: al });
        }
      }
    }

    /* ---------- kare ---------- */
    function frame(t, dt) {
      var g = sf.ctx, W = sf.w, k;
      lastT = t;
      var idx, fade;
      if (auto && !K.reducedMotion) {
        idx = Math.floor(t / DEMO);
        view = VIEWS[idx % VIEWS.length];
        vl = t - idx * DEMO;
        fade = clamp(vl / 0.3, 0, 1) * clamp((DEMO - vl) / 0.3, 0, 1);
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
      tag(g, 'yavaşlatılmış · basitleştirilmiş', W - 24, 27);
      g.save();
      g.globalAlpha = fade;
      if (view === 'genlik') drawGenlik(g, t);
      else if (view === 'frekans') drawFrekans(g, t);
      else if (view === 'periyot') drawPeriyot(g, t);
      else if (view === 'dalgaboyu') drawDalgaboyu(g, t);
      else drawOlcek(g, t);
      txt(g, CAPTION[view], 560, 366, { size: 15.5, weight: 600, color: C.ink, align: 'center' });
      g.restore();
    }

    function numbers() {
      var f = freq, ex = !!EXACT[f];
      if (view === 'genlik') return 'tepe değeri = ' + K.num(amp, 1) + ' × 5 V = ' + K.num(Math.round(amp * 50) / 10, 1) + ' V';
      if (view === 'frekans') return 'f = ' + f + ' Hz: 1 saniyede ' + f + ' tam salınım';
      if (view === 'periyot') return 'f = ' + f + ' Hz → T = 1 ÷ ' + f + (ex ? ' = ' : ' ≈ ') + tSec(f) + ' s';
      if (view === 'dalgaboyu') return 'ses: 343 ÷ 440 ≈ 0,78 m · Wi-Fi: 300.000.000 ÷ 2.400.000.000 = 0,125 m';
      return ITEMS[focusIdx()].calc;
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
          if (isFinite(v)) { amp = Math.round(clamp(v, 0.2, 1) * 10) / 10; auto = false; if (view !== 'genlik' && vt0 === 0 && lastT === 0) vt0 = 0; }
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
