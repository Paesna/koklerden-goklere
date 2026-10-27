/* Köklerden Göklere · op-amp laboratuvarı
 * opamp-lab · 1120×380 · açık/koyu tema (2B)
 * Görünümler: sorun, karsilastirici, yukseltec, sinirlama.
 * Denetimler: set('view', ...), set('vin', 0..1), set('gain', 1|10|100).
 * Model: çıkış = kazanç × (V+ − V−), besleme uçları (0 V ve 3,3 V) ile sınırlı.
 * Basitleştirilmiş: gerçek op-amp'in iç devresi çizilmez. Hareket frame(t) ile sürülür.
 */
(function () {
  'use strict';
  var K = window.KGViz;
  if (!K) return;
  var P = K.palette;
  var clamp = K.clamp;
  var TAU = Math.PI * 2;

  var VIEWS = ['sorun', 'karsilastirici', 'yukseltec', 'sinirlama'];
  var DEMO = 9;
  var VCC = 3.3, VTH = 0.5;                 // besleme ve karşılaştırıcı eşiği (V)
  var RF = { 1: 0, 10: 9, 100: 99 };        // kΩ (Rg = 1 kΩ)
  var VIN_DEF = { sorun: 1, karsilastirici: 0.8, yukseltec: 1, sinirlama: 0.8 };

  /* ---------- sayı biçimleri ---------- */
  function nv(x, d) {                       // en çok d basamak, sondaki sıfırlar atılır, ondalık virgül
    var s = x.toFixed(d === undefined ? 2 : d);
    if (s.indexOf('.') >= 0) s = s.replace(/0+$/, '').replace(/\.$/, '');
    return s.replace('.', ',');
  }
  function vf(v) { return v < 0.1 ? nv(v * 1000, 1) + ' mV' : nv(v) + ' V'; }
  function th(n) { return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.'); }
  function count(v) { return Math.round(v / VCC * 4095); }

  K.register('opamp-lab', function (el, opts) {
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
      cop: dark ? P.copperLight : P.copperFill,
      copText: dark ? P.copperLight : '#A64B22',
      wire: dark ? '#6B7384' : '#9AA0AC',
      card: dark ? '#161B26' : '#FFFFFF',
      soft: dark ? 'rgba(142,166,242,.14)' : 'rgba(35,67,176,.08)',
      lamp: P.lamp
    };

    var view = 'sorun', auto = true;
    var vin = 1, gain = 100, userVin = false, userGain = false;
    var hist = [], histT = -1;
    var tNow = 0;

    function resetState() {
      view = 'sorun'; auto = true; vin = 1; gain = 100; userVin = false; userGain = false;
      hist = []; histT = -1; tNow = 0;
    }

    function T(g, s, x, y, size, color, weight, align, mono, alpha) {
      K.label(g, s, x, y, { size: size, color: color, weight: weight || 400, align: align || 'left', mono: mono, alpha: alpha });
    }
    function sh01(a, b, x) { var u = clamp((x - a) / (b - a), 0, 1); return u * u * (3 - 2 * u); }

    /* ---------- model ---------- */
    function vpk() {                         // girişin tepe değeri (V), yükselteç ve sınırlama görünümleri
      return view === 'sinirlama' ? vin * 0.05 : vin * 0.005;
    }
    function outPk() { return Math.min(VCC, gain * vpk()); }
    function sensorV() { return vin * 1.0; }   // karşılaştırıcıda V+ (V)

    /* ---------- metinler ---------- */
    function numbers() {
      if (view === 'sorun') return '5 mV ÷ 3,3 V × 4.095 ≈ 6 sayı: neredeyse hiç';
      if (view === 'karsilastirici') {
        var v = sensorV(), on = v > VTH;
        return nv(v) + ' V ' + (on ? '>' : '<') + ' ' + nv(VTH) + ' V → çıkış ' + (on ? '1 (3,3 V)' : '0 (0 V)');
      }
      var rf = RF[gain] === undefined ? 99 : RF[gain];
      var vi = vpk() * 1000, line1 = 'kazanç = 1 + ' + rf + ' ÷ 1 = ' + gain;
      if (view === 'yukseltec') {
        var vo = gain * vpk();
        return line1 + ' · ' + nv(vi, 1) + ' mV × ' + gain + ' = ' + vf(vo) + ' ≈ ' + th(count(vo)) + ' sayı';
      }
      var want = gain * vpk();
      if (want > VCC) return nv(vi, 1) + ' mV × ' + gain + ' = ' + nv(want, 1) + ' V ama çıkış en çok 3,3 V';
      return nv(vi, 1) + ' mV × ' + gain + ' = ' + vf(want) + ': sınıra varmadı';
    }
    function explain() {
      if (view === 'sorun') return 'Mikrofon yalnızca birkaç milivolt verir, ADC ise 0 – 3,3 V bekler. Bu küçük sinyali ADC’ye vermeden önce büyütmek gerekir.';
      if (view === 'karsilastirici') {
        return sensorV() > VTH
          ? 'Op-amp iki girişi karşılaştırır: + girişi eşikten büyük, çıkış besleme gerilimine (3,3 V, yani 1) gider ve lamba yanar.'
          : '+ girişi eşikten küçük, çıkış 0 V (0) olur ve lamba söner. Geri besleme yok: fark küçük bile olsa çıkış hemen bir uca gider.';
      }
      if (view === 'yukseltec') return 'Çıkıştan − girişe iki dirençle geri besleme yapılır; kazancı 1 + Rf ÷ Rg belirler. Küçük sinyal, ADC’nin okuyabileceği düzeye büyür.';
      return gain * vpk() > VCC
        ? 'Çıkış besleme geriliminden büyük olamaz: giriş × kazanç 3,3 V’u aşınca tepeler yassılaşır (kırpılma) ve sinyal bozulur.'
        : 'Giriş × kazanç 3,3 V’un altında kaldığı için çıkış bozulmadan büyür. Girişi artır ya da kazancı 100 yap: tepeler yassılacak.';
    }

    /* ---------- çizim yardımcıları ---------- */
    function meter(g, cx, cy, s, color) {
      g.save();
      g.font = K.font(14, 600, true);
      var w = g.measureText(s).width + 18;
      g.fillStyle = C.card; g.strokeStyle = C.line2; g.lineWidth = 1.2;
      K.rr(g, cx - w / 2 + 0.5, cy - 11.5, w, 23, 5); g.fill(); g.stroke();
      g.restore();
      T(g, s, cx, cy + 5, 14, color, 600, 'center', true);
    }
    function wire(g, pts, col, lw) {
      g.save();
      g.strokeStyle = col || C.wire; g.lineWidth = lw || 2.4; g.lineJoin = 'round'; g.lineCap = 'round';
      g.beginPath(); g.moveTo(pts[0], pts[1]);
      for (var i = 2; i < pts.length; i += 2) g.lineTo(pts[i], pts[i + 1]);
      g.stroke(); g.restore();
    }
    function dot(g, x, y) { g.fillStyle = C.ink; g.beginPath(); g.arc(x, y, 3.6, 0, TAU); g.fill(); }
    function ground(g, x, y) {
      g.save(); g.strokeStyle = C.ink2; g.lineWidth = 2; g.lineCap = 'round';
      g.beginPath(); g.moveTo(x, y); g.lineTo(x, y + 4);
      g.moveTo(x - 11, y + 4); g.lineTo(x + 11, y + 4);
      g.moveTo(x - 7, y + 9); g.lineTo(x + 7, y + 9);
      g.moveTo(x - 3, y + 14); g.lineTo(x + 3, y + 14);
      g.stroke(); g.restore();
    }
    function resistor(g, x, y, len, horiz, col) {       // (x,y): gövdenin başlangıcı
      g.save();
      g.fillStyle = C.card; g.strokeStyle = col || C.ink2; g.lineWidth = 2;
      if (horiz) K.rr(g, x + 0.5, y - 7.5, len, 14, 2); else K.rr(g, x - 6.5, y + 0.5, 14, len, 2);
      g.fill(); g.stroke(); g.restore();
    }
    function plotBox(g, x, y, w, h) {
      g.save(); g.fillStyle = C.card; g.strokeStyle = C.line2; g.lineWidth = 1.2;
      K.rr(g, x + 0.5, y + 0.5, w, h, 5); g.fill(); g.stroke(); g.restore();
    }
    function hline(g, x1, x2, y, col, dash, lw) {
      g.save(); g.strokeStyle = col; g.lineWidth = lw || 1.2; g.setLineDash(dash || []);
      g.beginPath(); g.moveTo(x1, y); g.lineTo(x2, y); g.stroke(); g.restore();
    }
    function trace(g, x0, x1, fy, col, lw, dash) {       // fy(x) → y
      g.save(); g.strokeStyle = col; g.lineWidth = lw || 2.4; g.lineJoin = 'round'; g.setLineDash(dash || []);
      g.beginPath();
      for (var x = x0; x <= x1; x += 2) { var y = fy(x); if (x === x0) g.moveTo(x, y); else g.lineTo(x, y); }
      g.stroke(); g.restore();
    }
    function pill(g, xr, y, s) {            // sağa yaslı, arka planlı küçük etiket
      g.save(); g.font = K.font(13, 600, true);
      var w = g.measureText(s).width + 14;
      g.fillStyle = C.card; g.strokeStyle = C.line2; g.lineWidth = 1;
      K.rr(g, xr - w + 0.5, y - 12.5, w, 22, 4); g.fill(); g.stroke(); g.restore();
      T(g, s, xr - 7, y + 4, 13, C.ink2, 600, 'right', true);
    }
    function tag(g, s, xr, y) {
      g.save();
      g.font = K.font(13, 500, true);
      var w = g.measureText(s).width + 16;
      g.strokeStyle = C.muted; g.lineWidth = 1;
      K.rr(g, xr - w + 0.5, y - 15.5, w, 24, 5); g.stroke();
      g.restore();
      T(g, s, xr - w + 8, y + 1, 13, C.muted, 500, 'left', true);
    }

    /* standart op-amp sembolü: (ox, cy) sol kenarın ortası; + üstte, − altta */
    function opamp(g, ox, cy, fedPlus) {
      var h = 52, w = 100;
      g.save();
      g.fillStyle = C.card; g.strokeStyle = C.ink; g.lineWidth = 2.4; g.lineJoin = 'round';
      g.beginPath(); g.moveTo(ox, cy - h); g.lineTo(ox, cy + h); g.lineTo(ox + w, cy); g.closePath();
      g.fill(); g.stroke(); g.restore();
      T(g, '+', ox + 11, cy - 26 + 7, 20, C.ink, 600, 'center', true);
      T(g, '−', ox + 11, cy + 26 + 7, 20, C.ink, 600, 'center', true);
      // besleme uçları
      var sx = ox + 45, ty = cy - h * (1 - 0.45), by = cy + h * (1 - 0.45);
      wire(g, [sx, ty, sx, ty - 36], C.ink2, 2.2);
      g.fillStyle = C.ink2; g.fillRect(sx - 9, ty - 39, 18, 3);
      T(g, 'V+ = 3,3 V', sx, ty - 46, 13, C.ink2, 600, 'center', true);
      wire(g, [sx, by, sx, by + 34], C.ink2, 2.2);
      ground(g, sx, by + 34);
      T(g, 'GND', sx + 18, by + 46, 13, C.ink2, 600, 'left', true);
    }

    /* ---------- ADC çubuğu ---------- */
    function adcBar(g, x, y0, h, fracNow, fracPk) {      // y0: 0 V seviyesi
      var top = y0 - h;
      g.save();
      g.fillStyle = C.card; g.strokeStyle = C.ink2; g.lineWidth = 1.6;
      g.fillRect(x, top, 38, h); g.strokeRect(x + 0.5, top + 0.5, 38, h);
      g.fillStyle = C.cop; g.fillRect(x + 1.5, y0 - h * fracNow, 35, Math.max(1, h * fracNow));
      g.restore();
      T(g, '3,3 V', x - 6, top + 5, 13, C.muted, 500, 'right', true);
      T(g, '0 V', x - 6, y0 + 5, 13, C.muted, 500, 'right', true);
      if (fracPk !== undefined) hline(g, x - 4, x + 44, y0 - h * fracPk, C.ink, [3, 3], 1.4);
    }

    /* ---------- görünüm: sorun ---------- */
    function drawMic(g, cx, cy) {
      g.save();
      g.fillStyle = C.card; g.strokeStyle = C.ink; g.lineWidth = 2.2; g.lineCap = 'round';
      K.rr(g, cx - 15, cy - 34, 30, 52, 15); g.fill(); g.stroke();
      g.lineWidth = 1.2; g.strokeStyle = C.line2;
      for (var k = -16; k <= 4; k += 10) { g.beginPath(); g.moveTo(cx - 12, cy + k); g.lineTo(cx + 12, cy + k); g.stroke(); }
      g.strokeStyle = C.ink; g.lineWidth = 2.2;
      g.beginPath(); g.arc(cx, cy + 4, 24, 0.15 * Math.PI, 0.85 * Math.PI); g.stroke();
      g.beginPath(); g.moveTo(cx, cy + 28); g.lineTo(cx, cy + 42); g.moveTo(cx - 11, cy + 42); g.lineTo(cx + 11, cy + 42); g.stroke();
      g.restore();
    }

    function drawSorun(g, t) {
      T(g, 'sorun · mikrofon sinyali ADC için çok küçük', 24, 28, 16, C.ink, 600);
      drawMic(g, 70, 150);
      T(g, 'mikrofon', 70, 214, 13, C.muted, 500, 'center');
      wire(g, [112, 150, 250, 150]);
      meter(g, 181, 124, 'tepe 5 mV', C.blue);
      // ADC kutusu
      g.save(); g.fillStyle = C.card; g.strokeStyle = C.ink; g.lineWidth = 2.2;
      K.rr(g, 250, 112, 100, 76, 6); g.fill(); g.stroke(); g.restore();
      T(g, 'ADC', 300, 140, 17, C.ink, 600, 'center', true);
      T(g, '0 – 3,3 V', 300, 164, 13, C.muted, 500, 'center', true);
      T(g, '→ 0 – 4.095', 300, 181, 12.5, C.muted, 500, 'center', true);
      wire(g, [350, 150, 392, 150]);
      g.save(); g.fillStyle = C.card; g.strokeStyle = C.copText; g.lineWidth = 2.2;
      K.rr(g, 392, 118, 90, 64, 6); g.fill(); g.stroke(); g.restore();
      T(g, '≈ 6', 437, 160, 30, C.copText, 600, 'center', true);
      T(g, 'sayı', 437, 202, 13, C.muted, 500, 'center');
      // ADC'nin beklediği ölçek ve mikrofon sinyali
      var bx = 604, bw = 492, y0 = 276, ph = 206, sc = ph / VCC;
      plotBox(g, bx, 44, bw, 246);
      T(g, '3,3 V', bx - 8, y0 - ph + 5, 13, C.muted, 500, 'right', true);
      T(g, '0 V', bx - 8, y0 + 5, 13, C.muted, 500, 'right', true);
      hline(g, bx, bx + bw, y0 - ph, C.line2, [4, 4]);
      T(g, 'ADC’nin beklediği aralık: 0 – 3,3 V', bx + 12, 66, 13, C.ink2, 500);
      var amp = 0.005, ph0 = t * 3;
      trace(g, bx + 8, bx + bw - 8, function (x) { return y0 - (0.5 + 0.5 * Math.sin((x - bx) / 38 - ph0)) * amp * sc; }, C.cop, 2.4);
      T(g, 'mikrofon: 5 mV', bx + 12, y0 - 14, 13, C.copText, 600, 'left', true);
      // büyüteç
      var ix = 780, iy = 110, iw = 296, ih = 100;
      g.save(); g.strokeStyle = C.muted; g.lineWidth = 1; g.setLineDash([3, 3]);
      g.beginPath(); g.moveTo(bx + 100, y0 - 2); g.lineTo(ix, iy + ih); g.stroke(); g.restore();
      g.save(); g.strokeStyle = C.copText; g.lineWidth = 1.6; g.beginPath(); g.arc(bx + 100, y0 - 1, 5, 0, TAU); g.stroke(); g.restore();
      plotBox(g, ix, iy, iw, ih);
      T(g, 'aynı sinyal, büyüteçle', ix + 10, iy + 17, 13, C.ink2, 500);
      T(g, '5 mV', ix - 6, iy + 33, 13, C.muted, 500, 'right', true);
      T(g, '0', ix - 6, iy + ih - 7, 13, C.muted, 500, 'right', true);
      trace(g, ix + 8, ix + iw - 8, function (x) { return iy + ih - 12 - (0.5 + 0.5 * Math.sin((x - ix) / 20 - ph0)) * (ih - 46); }, C.cop, 2.6);
      T(g, 'çok küçük: büyütmek gerekir', 24, 306, 18, C.copText, 600);
      T(g, numbers(), 24, 332, 15.5, C.blue, 600, 'left', true);
      T(g, 'ADC’de bir basamak yaklaşık 0,8 mV’tur; 5 mV bunun yalnızca birkaç basamağıdır.', 24, 356, 13, C.muted, 400);
    }

    /* ---------- görünüm: karşılaştırıcı ---------- */
    function ldr(g, x, y) {
      resistor(g, x, y, 40, false);
      g.save(); g.strokeStyle = C.copText; g.fillStyle = C.copText; g.lineWidth = 1.8; g.lineCap = 'round';
      for (var k = 0; k < 2; k++) {
        var yy = y + 8 + k * 14;
        g.beginPath(); g.moveTo(x - 30, yy - 8); g.lineTo(x - 13, yy + 3); g.stroke();
        g.beginPath(); g.moveTo(x - 13, yy + 3); g.lineTo(x - 21, yy + 2); g.lineTo(x - 15, yy - 5); g.closePath(); g.fill();
      }
      g.restore();
    }

    function drawKars(g, t) {
      var v = sensorV(), on = v > VTH;
      T(g, 'karşılaştırıcı · ışık sensörü ile eşik karşılaştırılır', 24, 28, 16, C.ink, 600);
      // sensör bölücüsü
      T(g, '3,3 V', 70, 56, 13, C.muted, 600, 'center', true);
      wire(g, [70, 62, 70, 80]); resistor(g, 70, 80, 40, false);
      T(g, 'R', 86, 104, 13, C.ink2, 600, 'left', true);
      wire(g, [70, 120, 70, 168]);
      ldr(g, 70, 168);
      T(g, 'LDR', 86, 192, 13, C.ink2, 600, 'left', true);
      wire(g, [70, 208, 70, 236]); ground(g, 70, 236);
      // eşik bölücüsü (ayarlı direnç)
      T(g, '3,3 V', 190, 198, 13, C.muted, 600, 'center', true);
      resistor(g, 190, 205, 80, false);
      wire(g, [190, 285, 190, 296]); ground(g, 190, 296);
      T(g, 'eşik:', 176, 244, 13, C.ink2, 600, 'right');
      T(g, 'ayarlı direnç', 176, 261, 13, C.muted, 400, 'right');
      var wy = 285 - (VTH / VCC) * 80;
      wire(g, [222, wy, 290, wy, 290, 196, 330, 196]);
      g.save(); g.fillStyle = C.copText; g.strokeStyle = C.copText; g.lineWidth = 2;
      g.beginPath(); g.moveTo(222, wy); g.lineTo(204, wy); g.stroke();
      g.beginPath(); g.moveTo(197, wy); g.lineTo(206, wy - 5); g.lineTo(206, wy + 5); g.closePath(); g.fill(); g.restore();
      wire(g, [70, 144, 330, 144]); dot(g, 70, 144);
      meter(g, 160, 122, 'V+ ' + nv(v) + ' V', C.blue);
      meter(g, 245, 218, 'V− ' + nv(VTH) + ' V', C.ink2);
      opamp(g, 330, 170);
      // çıkış
      wire(g, [430, 170, 545, 170], on ? C.copText : C.wire, 2.8);
      meter(g, 490, 146, on ? 'çıkış 3,3 V' : 'çıkış 0 V', on ? C.copText : C.muted);
      T(g, 'çıkış = ' + (on ? '1' : '0'), 490, 200, 18, on ? C.copText : C.muted, 600, 'center', true);
      // lamba
      g.save();
      g.fillStyle = on ? C.lamp : C.card; g.strokeStyle = on ? C.copText : C.ink2; g.lineWidth = 2.2; g.lineCap = 'round';
      if (on) for (var i = 0; i < 8; i++) {
        var a = i * Math.PI / 4;
        g.beginPath(); g.moveTo(568 + Math.cos(a) * 27, 170 + Math.sin(a) * 27); g.lineTo(568 + Math.cos(a) * 36, 170 + Math.sin(a) * 36); g.stroke();
      }
      g.beginPath(); g.arc(568, 170, 20, 0, TAU); g.fill(); g.stroke();
      g.beginPath(); g.moveTo(554, 156); g.lineTo(582, 184); g.moveTo(582, 156); g.lineTo(554, 184); g.stroke();
      g.restore();
      T(g, 'lamba', 568, 222, 13, C.muted, 500, 'center');
      // grafikler
      var x0 = 700, w = 396, xe = x0 + w - 8, pps = 60;
      plotBox(g, x0, 42, w, 130);
      plotBox(g, x0, 196, w, 98);
      var yIn = function (u) { return 170 - u * 92; };
      var yOut = function (o) { return 280 - o / VCC * 66; };
      T(g, '1,0 V', x0 - 6, yIn(1) + 5, 13, C.muted, 500, 'right', true);
      T(g, '0 V', x0 - 6, yIn(0) + 4, 13, C.muted, 500, 'right', true);
      T(g, '3,3 V', x0 - 6, yOut(VCC) + 5, 13, C.muted, 500, 'right', true);
      T(g, '0 V', x0 - 6, yOut(0) + 5, 13, C.muted, 500, 'right', true);
      g.fillStyle = C.blue; g.fillRect(x0 + 12, 54, 12, 4);
      T(g, 'V+ (sensör)', x0 + 30, 60, 13, C.ink2, 500);
      hline(g, x0 + 142, x0 + 154, 56, C.copText, [4, 3], 2);
      T(g, 'V− (eşik) 0,5 V', x0 + 160, 60, 13, C.ink2, 500);
      hline(g, x0 + 2, x0 + w - 2, yIn(VTH), C.copText, [6, 4], 1.8);
      var n = hist.length;
      trace(g, x0 + 6, xe, function (x) {
        var idx = n - 1 - Math.round((xe - x) / pps * 30);
        var u = idx >= 0 ? hist[idx] : hist[0];
        return yIn(clamp(u, 0, 1));
      }, C.blue, 2.6);
      T(g, 'çıkış', x0 + 12, 250, 13, C.ink2, 500);
      var pv = null;
      g.save(); g.strokeStyle = C.copText; g.lineWidth = 2.6; g.lineJoin = 'miter'; g.beginPath();
      for (var x = x0 + 6; x <= xe; x += 1) {
        var idx = n - 1 - Math.round((xe - x) / pps * 30);
        var u = idx >= 0 ? hist[idx] : hist[0];
        var o = u > VTH ? 1 : 0, yy = yOut(o * VCC);
        if (pv === null) g.moveTo(x, yy); else { if (o !== pv) g.lineTo(x, yOut(pv * VCC)); g.lineTo(x, yy); }
        pv = o;
      }
      g.stroke(); g.restore();
      g.fillStyle = C.blue; g.beginPath(); g.arc(xe, yIn(clamp(v, 0, 1)), 4.5, 0, TAU); g.fill();
      g.fillStyle = C.copText; g.beginPath(); g.arc(xe, yOut(on ? VCC : 0), 4.5, 0, TAU); g.fill();
      T(g, 'karşılaştırıcı: büyük olanı seçer, çıkış 1 ya da 0', 24, 332, 17, C.ink, 600);
      T(g, numbers(), 24, 356, 15, C.blue, 600, 'left', true);
      T(g, 'LDR karanlıkta büyük direnç olur ve V+ yükselir · geri besleme yok: fark küçük olsa da çıkış hemen bir uca gider', 24, 376, 12.5, C.muted, 400);
    }

    /* ---------- görünüm: yükselteç / sınırlama (ortak devre) ---------- */
    function drawAmpCircuit(g, vinText, voutText, clipped) {
      var ox = 250, cy = 160;
      // giriş kaynağı
      g.save(); g.fillStyle = C.card; g.strokeStyle = C.ink; g.lineWidth = 2.2;
      g.beginPath(); g.arc(60, 134, 17, 0, TAU); g.fill(); g.stroke();
      g.strokeStyle = C.blue; g.lineWidth = 2; g.beginPath();
      for (var k = -9; k <= 9; k++) { var xx = 60 + k, yy = 134 - Math.sin(k / 9 * Math.PI) * 6; if (k === -9) g.moveTo(xx, yy); else g.lineTo(xx, yy); }
      g.stroke(); g.restore();
      T(g, 'giriş', 60, 170, 13, C.muted, 500, 'center');
      wire(g, [77, 134, ox, 134]);
      meter(g, 150, 110, vinText, C.blue);
      // − giriş ve Rg
      wire(g, [190, 290, 190, 186, ox, 186]);
      dot(g, 190, 230);
      wire(g, [190, 230, 110, 230, 110, 250]);
      resistor(g, 110, 250, 44, false);
      wire(g, [110, 294, 110, 322]); ground(g, 110, 322);
      T(g, 'Rg', 98, 270, 14, C.ink, 600, 'right', true);
      T(g, '1 kΩ', 98, 288, 13, C.ink2, 500, 'right', true);
      opamp(g, ox, cy);
      // çıkış ve geri besleme
      var rf = RF[gain] === undefined ? 99 : RF[gain];
      wire(g, [350, cy, 440, cy], C.copText, 2.8);
      dot(g, 430, cy);
      if (rf === 0) wire(g, [430, cy, 430, 290, 190, 290], C.wire);
      else {
        wire(g, [430, cy, 430, 290, 340, 290]); wire(g, [280, 290, 190, 290]);
        resistor(g, 280, 290, 60, true);
      }
      T(g, 'Rf', 310, 316, 14, C.ink, 600, 'center', true);
      T(g, rf === 0 ? '0 Ω (tel)' : rf + ' kΩ', 310, 334, 13, C.ink2, 500, 'center', true);
      meter(g, 392, 126, voutText, C.copText);
      T(g, '×' + gain, 392, 192, 15, C.copText, 600, 'center', true);
      if (clipped) T(g, 'sınırda', 392, 210, 13, C.copText, 600, 'center');
    }

    function drawYuk(g, t) {
      var A = vpk(), pk = outPk(), ph0 = t * 2.4;
      T(g, 'yükselteç · iki direnç kazancı belirler', 24, 28, 16, C.ink, 600);
      drawAmpCircuit(g, 'Vin ' + nv(A * 1000, 1) + ' mV', 'Vout ' + vf(gain * A), false);
      var xi = 496, wi = 144, xo = 700, wo = 190, y0 = 236, ph = 140, sc = ph / VCC;
      plotBox(g, xi, 44, wi, 206); plotBox(g, xo, 44, wo, 206);
      T(g, 'giriş', xi + 10, 62, 13, C.ink2, 500);
      T(g, 'çıkış', xo + 10, 62, 13, C.ink2, 500);
      T(g, '5 mV', xi - 6, y0 - ph + 5, 13, C.muted, 500, 'right', true);
      T(g, '0', xi - 6, y0 + 4, 13, C.muted, 500, 'right', true);
      T(g, '3,3 V', xo - 6, y0 - ph + 5, 13, C.muted, 500, 'right', true);
      T(g, '0 V', xo - 6, y0 + 4, 13, C.muted, 500, 'right', true);
      hline(g, xi, xi + wi, y0 - ph, C.line2, [4, 4]); hline(g, xo, xo + wo, y0 - ph, C.line2, [4, 4]);
      var s = function (x, x0) { return 0.5 + 0.5 * Math.sin((x - x0) / 26 - ph0); };
      trace(g, xi + 8, xi + wi - 8, function (x) { return y0 - s(x, xi) * (A / 0.005) * ph; }, C.blue, 2.6);
      trace(g, xo + 8, xo + wo - 8, function (x) { return y0 - Math.min(VCC, gain * A * s(x, xo)) * sc; }, C.cop, 2.6);
      T(g, 'besleme 3,3 V', xo + wo - 8, y0 - ph - 6, 12.5, C.muted, 500, 'right', true);
      // ADC
      var inst = Math.min(VCC, gain * A * s(xo + wo - 8, xo));
      T(g, 'ADC', 960, 62, 15, C.ink, 600, 'center', true);
      adcBar(g, 940, y0, ph, inst / VCC, pk / VCC);
      T(g, '≈ ' + th(count(pk)), 992, y0 - ph / 2 + 4, 21, C.copText, 600, 'left', true);
      T(g, 'sayı', 992, y0 - ph / 2 + 24, 13, C.muted, 500);
      T(g, 'kazanç = 1 + Rf ÷ Rg = 1 + ' + rfOf() + ' ÷ 1 = ' + gain, 500, 282, 17, C.ink, 600, 'left', true);
      T(g, nv(A * 1000, 1) + ' mV × ' + gain + ' = ' + vf(pk) + ' → ' + vf(pk) + ' ÷ 3,3 V × 4.095 ≈ ' + th(count(pk)) + ' sayı', 500, 306, 15, C.blue, 600, 'left', true);
      T(g, 'iki direnç kazancı belirler', 500, 334, 17, C.copText, 600);
      T(g, 'geri besleme: çıkışın bir kısmı − girişe döner, kazancı çip değil dirençler seçer', 500, 356, 13, C.muted, 400);
      T(g, 'gürültü de aynı kat büyür (Gürültü nedir? slaytı)', 500, 374, 13, C.muted, 400);
    }
    function rfOf() { return RF[gain] === undefined ? 99 : RF[gain]; }

    function drawSin(g, t) {
      var A = vpk(), want = gain * A, clipped = want > VCC, ph0 = t * 2.4;
      T(g, 'sınırlama · çıkış besleme geriliminden büyük olamaz', 24, 28, 16, C.ink, 600);
      drawAmpCircuit(g, 'Vin ' + nv(A * 1000, 1) + ' mV', 'Vout ' + vf(Math.min(VCC, want)), clipped);
      var xi = 496, wi = 144, xo = 700, wo = 392, y0 = 236, ph = 140, sc = ph / VCC, top = 44;
      plotBox(g, xi, top, wi, 206); plotBox(g, xo, top, wo, 206);
      T(g, 'giriş', xi + 10, 62, 13, C.ink2, 500);
      T(g, 'çıkış', xo + 10, 62, 13, C.ink2, 500);
      T(g, '50 mV', xi - 6, y0 - ph + 5, 13, C.muted, 500, 'right', true);
      T(g, '0', xi - 6, y0 + 4, 13, C.muted, 500, 'right', true);
      T(g, '3,3 V', xo - 6, y0 - ph + 5, 13, C.muted, 500, 'right', true);
      T(g, '0 V', xo - 6, y0 + 4, 13, C.muted, 500, 'right', true);
      // besleme sınırının üstü
      g.fillStyle = C.soft; g.fillRect(xo + 1, top + 1, wo - 1, (y0 - ph) - top - 1);
      hline(g, xo, xo + wo, y0 - ph, C.ink2, [5, 4], 1.6);
      var s = function (x, x0, lam) { return 0.5 + 0.5 * Math.sin((x - x0) / lam - ph0); };
      trace(g, xi + 8, xi + wi - 8, function (x) { return y0 - s(x, xi, 26) * (A / 0.05) * ph; }, C.blue, 2.6);
      if (clipped) trace(g, xo + 8, xo + wo - 8, function (x) { return Math.max(top + 34, y0 - want * s(x, xo, 34) * sc); }, C.muted, 1.6, [4, 4]);
      trace(g, xo + 8, xo + wo - 8, function (x) { return y0 - Math.min(VCC, want * s(x, xo, 34)) * sc; }, C.cop, 3);
      pill(g, xo + wo - 10, top + 15, 'besleme sınırı 3,3 V · bunun üstü yok');
      T(g, numbers(), 500, 282, 16, C.ink, 600, 'left', true);
      T(g, 'çıkış = kazanç × (V+ − V−), ama 0 V ile 3,3 V arasında kalır', 500, 306, 15, C.blue, 600, 'left', true);
      T(g, 'çıkış besleme geriliminden büyük olamaz', 500, 334, 17, C.copText, 600);
      T(g, 'kırpılma: yassılan tepelerde sinyalin şekli kaybolur, ses bozulur, ölçüm yanlış çıkar', 500, 356, 13, C.muted, 400);
      T(g, 'çözüm: kazancı küçült ya da girişi azalt', 500, 374, 13, C.muted, 400);
    }

    /* ---------- kare ---------- */
    var lastView = null, fadeT = 0;
    function frame(t, dt) {
      var g = sf.ctx, vt = t % DEMO;
      tNow = t;
      if (auto && !K.reducedMotion) {
        view = VIEWS[Math.floor(t / DEMO) % VIEWS.length];
        if (view === 'sorun') { vin = 1; gain = 100; }
        else if (view === 'karsilastirici') { vin = 0.5 + 0.45 * Math.sin(TAU * vt / DEMO - Math.PI / 2); gain = 100; }
        else if (view === 'yukseltec') { vin = 1; gain = [1, 10, 100][Math.min(2, Math.floor(vt / 3))]; }
        else { gain = 100; vin = 0.08 + 0.92 * sh01(0.3, 7, vt); }
      } else if (K.reducedMotion && auto) {
        view = 'yukseltec'; vin = 1; gain = 100;
      }
      if (view !== lastView) histT = -1;
      if (histT < 0 || t < histT) { hist = []; histT = t; for (var i = 0; i < 220; i++) hist.push(vin); }
      while (t - histT >= 1 / 30) { histT += 1 / 30; hist.push(vin); if (hist.length > 420) hist.shift(); }
      if (view !== lastView) { lastView = view; fadeT = t; }
      var fa = K.reducedMotion ? 1 : sh01(0, 0.3, t - fadeT);

      sf.clear();
      tag(g, 'basitleştirilmiş model', sf.w - 24, 27);
      g.save();
      g.globalAlpha *= 0.15 + 0.85 * fa;
      var tt = K.reducedMotion ? 2 : t;
      if (view === 'sorun') drawSorun(g, tt);
      else if (view === 'karsilastirici') drawKars(g, tt);
      else if (view === 'yukseltec') drawYuk(g, tt);
      else drawSin(g, tt);
      g.restore();
    }

    resetState();
    return {
      reset: function () { resetState(); lastView = null; },
      frame: frame,
      set: function (key, val) {
        if (key === 'view' && VIEWS.indexOf(val) >= 0) {
          if (auto || val !== view) {
            if (!userVin) vin = VIN_DEF[val];
            if (!userGain) gain = 100;
          }
          view = val; auto = false;
        } else if (key === 'vin') {
          var v = parseFloat(val);
          if (isFinite(v)) { vin = clamp(v, 0, 1); userVin = true; auto = false; }
        } else if (key === 'gain') {
          var gv = parseFloat(val);
          if (gv === 1 || gv === 10 || gv === 100) { gain = gv; userGain = true; auto = false; }
        }
      },
      read: function (key) {
        if (key === 'view') return view;
        if (key === 'explain') return explain();
        if (key === 'numbers') return numbers();
        if (key === 'gain') return String(gain);
        if (key === 'vin') return K.num(vin, 2);
        return '';
      },
      resize: function () { sf.resize(); },
      dispose: function () { sf.dispose(); }
    };
  });
})();
