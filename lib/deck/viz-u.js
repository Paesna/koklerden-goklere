/* Köklerden Göklere · Builder U: sensör haberleşmesi
 * sensor-bus · 1120×380 · açık/koyu tema (2B)
 * ESP32 kartı solda, sensörler sağda; her tel gerilimini gerçek zamanlı bir şerit olarak çizer.
 * Görünümler: analog, dijital, darbe, i2c, spi, uart. Sözleşme: kg-viz.js.
 * Tüm hareket frame(t) içinden sürülür; zaman ölçeği yavaşlatılmıştır.
 */
(function () {
  'use strict';
  var K = window.KGViz;
  if (!K) return;
  var P = K.palette;
  var clamp = K.clamp;

  var VIEWS = ['analog', 'dijital', 'darbe', 'i2c', 'spi', 'uart'];
  var TABS = ['Analog', 'Dijital', 'Darbe', 'I2C', 'SPI', 'UART'];
  var DEMO = 9;      // her görünümün otomatik süresi (sn)
  var PLAY = 7.2;    // bir işlemin oynatma süresi (sn)

  var EXPLAIN = {
    analog: 'Sensör, ölçtüğü şeye göre pine 0 V ile 3,3 V arasında bir gerilim verir; telde sayı yoktur, yalnızca düzey vardır. Düzeyi sayıya çevirmek karttaki ADC’nin işidir.',
    dijital: 'Düğme ya da PIR yalnızca iki durum bildirir: pin 0 V ise 0, 3,3 V ise 1. Aradaki gerilimlerin anlamı yoktur; önemli olan düzeyin ne zaman değiştiğidir.',
    darbe: 'Bilgi, ECHO darbesinin genişliğindedir. Ses gidip dönene kadar ECHO 1 kalır; süre t ise mesafe d = 343 × t ÷ 2. Örnek: 2,9 ms → yaklaşık 0,50 m.',
    i2c: 'Her bit için SCL hattında bir saat tıkı vardır; SDA, SCL yükselirken okunur. Önce adres gelir, adresi tutan sensör ACK verir ve veri baytını (0001 1010 = 26) en büyük bitten başlayarak gönderir.',
    spi: 'CS hattı 0 olan cihaz seçilmiştir, yalnızca o konuşur. Her saat tıkında MOSI ile komut biti gider, MISO ile cevap biti gelir; iki yön aynı anda çalışır.',
    uart: 'Saat teli yoktur; iki taraf hızı (baud) önceden anlaşır. Hat boşta 1 durur; başlangıç biti 0, sonra 8 veri biti (önce en küçük bit), sonra bitiş biti 1 gelir. Örnek: A = 0x41.'
  };
  var WIRES = {
    analog: '1 tel: sinyal (gerilim düzeyi)',
    dijital: '1 tel: 0 ya da 1',
    darbe: '2 tel: TRIG, ECHO',
    i2c: '2 tel: SDA, SCL',
    spi: '4 tel: SCK, MOSI, MISO, CS (her cihaza ayrı CS)',
    uart: '2 tel: TX, RX (çapraz)'
  };

  /* ---------- geometri (CSS px, 1120×380) ---------- */
  var XB = 206;                 // kart pininin dış ucu
  var SX = 262, SW = 588;       // şerit kutusu
  var AX = 876, BX = 996, CW = 100;  // çok cihazlı kartlar
  var UX = 900, UW = 196;       // tek sensör kartı

  function S(a, b, lv, d) { return { a: a, b: b, lv: lv, d: d }; }   // d: 0 kart, 1 sensör, 2 boşta, 3 boş (Hi-Z)

  /* ---------- sinyal tanımları ---------- */
  var VW = {};

  VW.analog = { D: 0, rows: [{ y: 118, sh: 64, pin: 'GPIO34', name: 'ADC', scroll: 'analog' }] };
  VW.dijital = { D: 0, rows: [
    { y: 96, sh: 36, pin: 'GPIO4', name: 'DÜĞME', scroll: 'btn' },
    { y: 186, sh: 36, pin: 'GPIO5', name: 'PIR', scroll: 'pir' }
  ] };

  VW.darbe = { D: 4, rows: [
    { y: 96, sh: 34, pin: 'GPIO25', name: 'TRIG', segs: [S(0, 0.3, 0, 2), S(0.3, 0.321, 1, 0), S(0.321, 4, 0, 2)] },
    { y: 172, sh: 34, pin: 'GPIO26', name: 'ECHO', segs: [S(0, 0.55, 0, 2), S(0.55, 3.45, 1, 1), S(3.45, 4, 0, 2)] }
  ] };

  (function () {
    var addr = [1, 0, 0, 1, 0, 0, 0], data = [0, 0, 0, 1, 1, 0, 1, 0], k;
    var bits = [];
    for (k = 0; k < 7; k++) bits.push({ lv: addr[k], d: 0 });
    bits.push({ lv: 1, d: 0 });                 // R/W: 1 = oku
    bits.push({ lv: 0, d: 1 });                 // ACK: sensör SDA'yı 0 yapar
    for (k = 0; k < 8; k++) bits.push({ lv: data[k], d: 1 });
    bits.push({ lv: 1, d: 0 });                 // NACK: kart bırakır, hat 1
    var sda = [S(0, 1, 1, 2), S(1, 2, 0, 0)], slots = [{ a: 1, b: 2, t: 'S' }];
    var scl = [S(0, 1, 1, 2), S(1, 1.5, 1, 0), S(1.5, 2, 0, 0)];
    for (k = 0; k < 18; k++) {
      sda.push(S(2 + k, 3 + k, bits[k].lv, bits[k].d));
      slots.push({ a: 2 + k, b: 3 + k, t: String(bits[k].lv) });
      scl.push(S(2 + k, 2.5 + k, 0, 0), S(2.5 + k, 3 + k, 1, 0));
    }
    scl.push(S(20, 20.5, 0, 0), S(20.5, 21, 1, 0), S(21, 22, 1, 2));
    sda.push(S(20, 21, 0, 0), S(21, 22, 1, 2));
    slots.push({ a: 21, b: 22, t: 'P' });
    VW.i2c = { D: 22, rows: [
      { y: 88, sh: 44, pin: 'GPIO22', name: 'SCL', segs: scl },
      { y: 158, sh: 44, pin: 'GPIO21', name: 'SDA', segs: sda, slots: slots }
    ], samples: [], groups: [
      { a: 2, b: 9, t: 'adres 0x48', d: 0 }, { a: 9, b: 10, t: 'R/W', d: 0, dx: -5 }, { a: 10, b: 11, t: 'ACK', d: 1, dx: 5 },
      { a: 11, b: 19, t: 'veri = 26', d: 1 }, { a: 19, b: 20, t: 'NACK', d: 0 }
    ], bandRow: 1 };
    for (k = 0; k < 18; k++) VW.i2c.samples.push({ tau: 2.5 + k, rows: [1] });
  })();

  (function () {
    var mosi = [1, 0, 1, 0, 0, 1, 0, 1], miso = [0, 0, 0, 1, 1, 0, 1, 0], k;
    var sck = [S(0, 2, 0, 2)], mo = [S(0, 2, 0, 2)], mi = [S(0, 2, 0.5, 3)], moS = [], miS = [];
    for (k = 0; k < 8; k++) {
      sck.push(S(2 + k, 2.5 + k, 0, 0), S(2.5 + k, 3 + k, 1, 0));
      mo.push(S(2 + k, 3 + k, mosi[k], 0));
      mi.push(S(2 + k, 3 + k, miso[k], 1));
      moS.push({ a: 2 + k, b: 3 + k, t: String(mosi[k]) });
      miS.push({ a: 2 + k, b: 3 + k, t: String(miso[k]) });
    }
    sck.push(S(10, 12, 0, 2)); mo.push(S(10, 12, 0, 2)); mi.push(S(10, 12, 0.5, 3));
    VW.spi = { D: 12, rows: [
      { y: 68, sh: 24, pin: 'GPIO18', name: 'SCK', segs: sck },
      { y: 106, sh: 24, pin: 'GPIO23', name: 'MOSI', segs: mo, slots: moS },
      { y: 144, sh: 24, pin: 'GPIO19', name: 'MISO', segs: mi, slots: miS },
      { y: 182, sh: 24, pin: 'GPIO5', name: 'CS1', segs: [S(0, 1, 1, 2), S(1, 11, 0, 0), S(11, 12, 1, 2)] },
      { y: 220, sh: 24, pin: 'GPIO17', name: 'CS2', segs: [S(0, 12, 1, 2)] }
    ], samples: [], bandRow: 2 };
    for (k = 0; k < 8; k++) VW.spi.samples.push({ tau: 2.5 + k, rows: [1, 2] });
  })();

  (function () {
    var ch = [1, 0, 0, 0, 0, 0, 1, 0], k;     // 'A' = 0x41 = 0100 0001, önce en küçük bit
    var tx = [S(0, 1, 1, 2), S(1, 2, 0, 0)], slots = [{ a: 1, b: 2, t: '0' }];
    for (k = 0; k < 8; k++) { tx.push(S(2 + k, 3 + k, ch[k], 0)); slots.push({ a: 2 + k, b: 3 + k, t: String(ch[k]) }); }
    tx.push(S(10, 11, 1, 0), S(11, 12, 1, 2)); slots.push({ a: 10, b: 11, t: '1' });
    VW.uart = { D: 12, rows: [
      { y: 88, sh: 36, pin: 'GPIO17', name: 'TX', segs: tx, slots: slots },
      { y: 148, sh: 36, pin: 'GPIO16', name: 'RX', segs: [S(0, 12, 1, 2)] }
    ], samples: [], groups: [
      { a: 1, b: 2, t: 'başla', d: 0 }, { a: 2, b: 10, t: '8 veri biti: önce en küçük bit', d: 0 }, { a: 10, b: 11, t: 'bitiş', d: 0 }
    ], grid: true, bandRow: 0 };
    for (k = 0; k < 10; k++) VW.uart.samples.push({ tau: 1.5 + k, rows: [0] });
  })();

  /* ---------- sayı biçimleri ---------- */
  function tr(n, d) { return n.toFixed(d).replace('.', ','); }
  function th(n) { return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.'); }

  /* ---------- zamana bağlı sinyaller (kayan şeritler) ---------- */
  function sigAnalog(t) { return clamp(0.52 + 0.27 * Math.sin(t * 0.8) + 0.11 * Math.sin(t * 2.1 + 1.3), 0, 1); }
  function sigBtn(t) {
    var m = ((t % 10) + 10) % 10;
    return (m >= 1.5 && m < 3.6) || (m >= 5 && m < 5.7) || (m >= 7 && m < 8.1) ? 1 : 0;
  }
  function sigPir(t) { var m = ((t % 13) + 13) % 13; return m >= 4 && m < 8.5 ? 1 : 0; }

  K.register('sensor-bus', function (el, opts) {
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
      idle: dark ? '#7C8596' : '#7D838F',
      wire: dark ? '#4A5160' : '#B8BCC6',
      card: dark ? '#161B26' : '#FFFFFF',
      chip: dark ? '#1D2330' : '#ECECE6',
      band: dark ? 'rgba(142,166,242,.14)' : 'rgba(35,67,176,.09)',
      soft: dark ? 'rgba(142,166,242,.16)' : '#DCE3F6'
    };

    var view = 'analog', auto = true, tView = 0, needT = false, lastView = null, fadeT = 0;
    function resetState() { view = 'analog'; auto = true; tView = 0; needT = false; lastView = null; fadeT = 0; }

    function T(g, s, x, y, size, color, weight, align, mono, alpha) {
      K.label(g, s, x, y, { size: size, color: color, weight: weight || 400, align: align || 'left', mono: mono, alpha: alpha });
    }
    function colOf(d) { return d === 0 ? C.blue : d === 1 ? C.cop : C.idle; }
    function textColOf(d) { return d === 0 ? C.blue : d === 1 ? C.copText : C.muted; }
    function sh01(a, b, x) { var u = clamp((x - a) / (b - a), 0, 1); return u * u * (3 - 2 * u); }
    function px(D, tau) { return SX + 8 + tau / D * (SW - 16); }
    function yv(r, lv) { return r.y + r.sh / 2 - lv * r.sh; }

    function tag(g, s, xr, y) {
      g.save();
      g.font = K.font(13, 500, true);
      var w = g.measureText(s).width + 16;
      g.strokeStyle = C.muted; g.lineWidth = 1;
      K.rr(g, xr - w + 0.5, y - 15.5, w, 24, 5); g.stroke();
      g.restore();
      T(g, s, xr - w + 8, y + 1, 13, C.muted, 500, 'left', true);
    }

    function drawTabs(g) {
      var x = 24;
      g.save();
      g.font = K.font(13, 500, true);
      for (var i = 0; i < VIEWS.length; i++) {
        var w = g.measureText(TABS[i]).width + 22, on = VIEWS[i] === view;
        g.fillStyle = on ? C.ink : 'transparent';
        g.strokeStyle = on ? C.ink : C.line2;
        g.lineWidth = 1;
        K.rr(g, x + 0.5, 10.5, w, 26, 13);
        if (on) g.fill();
        g.stroke();
        g.fillStyle = on ? (dark ? P.night : '#FFFFFF') : C.muted;
        g.textAlign = 'center'; g.textBaseline = 'alphabetic';
        g.fillText(TABS[i], x + 0.5 + w / 2, 28);
        x += w + 8;
      }
      g.restore();
    }

    function drawLegend(g) {
      var x = 470;
      g.fillStyle = C.blue; g.fillRect(x, 19, 11, 11);
      T(g, 'karttan çıkan', x + 17, 29, 13, C.ink2, 500);
      g.fillStyle = C.cop; g.fillRect(x + 128, 19, 11, 11);
      T(g, 'sensörden gelen', x + 145, 29, 13, C.ink2, 500);
    }

    /* ---------- ESP32 kartı ---------- */
    function drawBoard(g, V) {
      var rows = V.rows, y0 = rows[0].y, y1 = rows[rows.length - 1].y, i;
      g.save();
      g.fillStyle = C.card; g.strokeStyle = C.ink2; g.lineWidth = 1.8;
      K.rr(g, 14, 46, 188, 266, 8); g.fill(); g.stroke();
      g.fillStyle = C.chip; g.strokeStyle = C.line2; g.lineWidth = 1.2;
      K.rr(g, 24, 52, 102, 234, 5); g.fill(); g.stroke();
      g.restore();
      T(g, 'ESP32', 75, 276, 15, C.ink, 600, 'center', true);
      // işlevsel birim
      var lab = { analog: 'ADC', dijital: 'GPIO', darbe: 'sayaç', i2c: 'I2C', spi: 'SPI', uart: 'UART' }[view];
      var top = Math.max(y0 - 22, 58), bot = y1 + 22;
      g.save();
      g.fillStyle = C.card; g.strokeStyle = C.blue; g.lineWidth = 1.6;
      K.rr(g, 34, top, 82, bot - top, 4); g.fill(); g.stroke();
      g.restore();
      var cy = (top + bot) / 2;
      if (view === 'analog') {
        var v = sigAnalog(tNow);
        T(g, 'ADC', 75, cy - 6, 15, C.blue, 600, 'center', true);
        T(g, th(v * 4095), 75, cy + 15, 15, C.ink, 600, 'center', true);
      } else {
        T(g, lab, 75, cy + 5, lab.length > 8 ? 13 : 15, C.blue, 600, 'center', true);
      }
      // pinler
      for (var yy = 62; yy <= 300; yy += 16) {
        var near = false;
        for (i = 0; i < rows.length; i++) if (Math.abs(rows[i].y - yy) < 11) near = true;
        if (!near) { g.fillStyle = dark ? '#3A4254' : '#CFD2D9'; g.fillRect(197, yy - 3, 7, 6); }
      }
      for (i = 0; i < rows.length; i++) {
        var r = rows[i];
        g.save();
        g.strokeStyle = C.wire; g.lineWidth = 2;
        g.beginPath(); g.moveTo(116, r.y); g.lineTo(198, r.y); g.stroke();
        g.fillStyle = C.cop; g.fillRect(196, r.y - 5, 10, 10);
        g.restore();
        T(g, r.pin, 190, r.y - 7, 13, C.muted, 500, 'right', true);
        T(g, r.name, 190, r.y + 17, 13, C.ink, 600, 'right', true);
      }
    }

    /* ---------- teller ---------- */
    function wireLine(g, x1, y1, x2, y2) {
      g.save();
      g.strokeStyle = C.wire; g.lineWidth = 3.4; g.lineCap = 'round';
      g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke();
      g.restore();
    }
    function drawWires(g, V) {
      var rows = V.rows, i;
      if (view === 'i2c' || view === 'spi') {
        for (i = 0; i < rows.length; i++) {
          var end = (view === 'spi' && i === 3) ? AX : BX;
          wireLine(g, XB, rows[i].y, end, rows[i].y);
        }
      } else if (view === 'uart') {
        wireLine(g, XB, rows[0].y, 850, rows[0].y); wireLine(g, XB, rows[1].y, 850, rows[1].y);
        wireLine(g, 850, rows[0].y, UX, rows[1].y); wireLine(g, 850, rows[1].y, UX, rows[0].y);
      } else {
        for (i = 0; i < rows.length; i++) wireLine(g, XB, rows[i].y, UX, rows[i].y);
      }
    }

    /* ---------- şerit çizimi ---------- */
    function stripBox(g, r) {
      g.save();
      g.fillStyle = C.card; g.strokeStyle = C.line2; g.lineWidth = 1.2;
      K.rr(g, SX + 0.5, r.y - r.sh / 2 - 6.5, SW, r.sh + 13, 5); g.fill(); g.stroke();
      g.restore();
    }

    function drawSegs(g, r, D, xa0, ux) {
      var i, s, pl;
      g.save();
      g.lineWidth = 2.8; g.lineJoin = 'miter';
      for (i = 0; i < r.segs.length; i++) {
        s = r.segs[i];
        pl = i ? r.segs[i - 1].lv : s.lv;
        g.strokeStyle = colOf(s.d);
        g.setLineDash(s.d === 3 ? [5, 4] : []);
        g.beginPath();
        g.moveTo(xa0 + s.a * ux, yv(r, pl)); g.lineTo(xa0 + s.a * ux, yv(r, s.lv)); g.lineTo(xa0 + s.b * ux, yv(r, s.lv));
        g.stroke();
      }
      g.restore();
    }

    function waveRow(g, r, D, prog) {
      var xa0 = SX + 8, ux = (SW - 16) / D, cx = xa0 + prog * ux;
      g.save(); g.beginPath(); g.rect(SX, r.y - 40, Math.max(0, cx - SX), 80); g.clip();
      drawSegs(g, r, D, xa0, ux); g.restore();
      g.save(); g.globalAlpha *= 0.22; g.beginPath(); g.rect(cx, r.y - 40, Math.max(0, SX + SW - cx), 80); g.clip();
      drawSegs(g, r, D, xa0, ux); g.restore();
    }

    function scrollRow(g, r, tt) {
      var xs = SX + 8, xe = SX + SW - 8, pps = 72, x, lv, prev = null, ly = 0, col = C.cop;
      var fn = r.scroll === 'analog' ? sigAnalog : r.scroll === 'btn' ? sigBtn : sigPir;
      var digital = r.scroll !== 'analog';
      g.save();
      g.lineWidth = 2.8; g.lineJoin = 'round'; g.strokeStyle = col;
      g.beginPath();
      for (x = xs; x <= xe; x += 1) {
        lv = fn(tt - (xe - x) / pps);
        ly = yv(r, lv);
        if (prev === null) g.moveTo(x, ly);
        else if (digital && lv !== prev) { g.lineTo(x, yv(r, prev)); g.lineTo(x, ly); }
        else g.lineTo(x, ly);
        prev = lv;
      }
      g.stroke();
      g.fillStyle = C.cop;
      g.beginPath(); g.arc(xe, ly, 4.5, 0, 6.2832); g.fill();
      g.restore();
      return prev;
    }

    function scaleLabels(g, r) {
      T(g, '3,3 V', SX - 6, r.y - r.sh / 2 + 4, 13, C.muted, 500, 'right', true);
      T(g, '0 V', SX - 6, r.y + r.sh / 2 + 4, 13, C.muted, 500, 'right', true);
    }

    function brk(g, x1, x2, y, col, a) {
      g.save();
      g.globalAlpha *= a; g.strokeStyle = col; g.lineWidth = 1.6;
      g.beginPath(); g.moveTo(x1, y + 5); g.lineTo(x1, y); g.lineTo(x2, y); g.lineTo(x2, y + 5); g.stroke();
      g.restore();
    }

    /* ---------- kartlar ---------- */
    function card(g, x, y, w, h, hl, a) {
      g.save();
      g.globalAlpha *= a;
      g.fillStyle = C.card; g.strokeStyle = hl ? C.copText : C.line2; g.lineWidth = hl ? 2.4 : 1.4;
      K.rr(g, x, y, w, h, 7); g.fill(); g.stroke();
      g.restore();
    }
    function pin(g, x, y) {
      g.fillStyle = C.ink2; g.beginPath(); g.arc(x, y, 4, 0, 6.2832); g.fill();
    }
    function junction(g, x, y) {
      g.fillStyle = C.ink; g.beginPath(); g.arc(x, y, 4, 0, 6.2832); g.fill();
    }

    function sunIcon(g, x, y, v) {
      g.save();
      g.strokeStyle = C.copText; g.fillStyle = C.cop; g.lineWidth = 2.2; g.lineCap = 'round';
      g.beginPath(); g.arc(x, y, 8, 0, 6.2832); g.fill();
      for (var i = 0; i < 8; i++) {
        var a = i * Math.PI / 4, r0 = 12, r1 = 12 + 3 + 9 * v;
        g.beginPath(); g.moveTo(x + Math.cos(a) * r0, y + Math.sin(a) * r0); g.lineTo(x + Math.cos(a) * r1, y + Math.sin(a) * r1); g.stroke();
      }
      g.restore();
    }

    var tNow = 0;

    function drawCards(g, V, prog, tt) {
      var r = V.rows, i;
      if (view === 'analog') {
        var v = sigAnalog(tt);
        card(g, UX, 78, UW, 80, false, 1);
        pin(g, UX, r[0].y);
        T(g, 'çıkış', UX + 10, r[0].y + 5, 13, C.muted, 500, 'left', true);
        T(g, 'LDR · ışık sensörü', UX + 12, 99, 15, C.ink, 600);
        T(g, 'ışığa duyarlı direnç', UX + 12, 149, 13, C.muted);
        sunIcon(g, UX + 142, r[0].y + 6, v);
      } else if (view === 'dijital') {
        var b = sigBtn(tt), p = sigPir(tt);
        card(g, UX, 62, UW, 68, false, 1); pin(g, UX, r[0].y);
        T(g, 'düğme', UX + 14, 86, 15, C.ink, 600);
        T(g, b ? 'basılı · 3,3 V' : 'serbest · 0 V', UX + 14, 110, 13, b ? C.copText : C.muted, 500, 'left', true);
        g.save(); g.fillStyle = b ? C.cop : C.card; g.strokeStyle = C.ink2; g.lineWidth = 2;
        g.beginPath(); g.arc(UX + 160, r[0].y + (b ? 3 : 0), 14, 0, 6.2832); g.fill(); g.stroke(); g.restore();
        card(g, UX, 152, UW, 68, false, 1); pin(g, UX, r[1].y);
        T(g, 'PIR hareket sensörü', UX + 14, 176, 15, C.ink, 600);
        T(g, p ? 'hareket var · 3,3 V' : 'hareket yok · 0 V', UX + 14, 200, 13, p ? C.copText : C.muted, 500, 'left', true);
      } else if (view === 'darbe') {
        card(g, UX, 62, UW, 148, false, 1); pin(g, UX, r[0].y); pin(g, UX, r[1].y);
        T(g, 'TRIG', UX + 10, r[0].y + 5, 13, C.muted, 500, 'left', true);
        T(g, 'ECHO', UX + 10, r[1].y + 5, 13, C.muted, 500, 'left', true);
        g.save(); g.strokeStyle = C.ink2; g.lineWidth = 2; g.fillStyle = dark ? '#222836' : '#F1F1EC';
        g.beginPath(); g.arc(UX + 96, 134, 19, 0, 6.2832); g.fill(); g.stroke();
        g.beginPath(); g.arc(UX + 154, 134, 19, 0, 6.2832); g.fill(); g.stroke();
        g.restore();
        T(g, 'HC-SR04', UX + 125, 200, 15, C.ink, 600, 'center', true);
      } else if (view === 'i2c') {
        var ok = prog >= 10;
        card(g, AX, 52, CW, 144, ok, 1); card(g, BX, 52, CW, 144, false, ok ? 0.5 : 1);
        T(g, '0x48', AX + 64, 117, 16, C.ink, 600, 'center', true);
        T(g, 'sıcaklık', AX + 64, 137, 13, C.muted, 400, 'center');
        T(g, 'sensörü', AX + 64, 153, 13, C.muted, 400, 'center');
        T(g, '0x68', BX + 64, 117, 16, C.ink, 600, 'center', true, ok ? 0.5 : 1);
        T(g, 'hareket', BX + 64, 137, 13, C.muted, 400, 'center', false, ok ? 0.5 : 1);
        T(g, 'sensörü', BX + 64, 153, 13, C.muted, 400, 'center', false, ok ? 0.5 : 1);
        var names = ['SCL', 'SDA'], xs = [AX, BX];
        for (i = 0; i < 2; i++) {
          T(g, names[i], AX + 10, r[i].y + 5, 13, C.muted, 500, 'left', true);
          T(g, names[i], BX + 10, r[i].y + 5, 13, C.muted, 500, 'left', true, ok ? 0.5 : 1);
        }
        for (i = 0; i < 2; i++) { junction(g, AX, r[i].y); junction(g, AX + CW, r[i].y); junction(g, BX, r[i].y); }
      } else if (view === 'spi') {
        var sel = prog >= 1 && prog < 11;
        card(g, AX, 48, CW, 154, sel, 1); card(g, BX, 48, CW, 192, false, sel ? 0.5 : 1);
        var nm = ['SCK', 'MOSI', 'MISO', 'CS'];
        for (i = 0; i < 4; i++) {
          T(g, nm[i], AX + 10, r[i].y + 5, 13, C.muted, 500, 'left', true);
          junction(g, AX, r[i].y);
          if (i < 3) { junction(g, AX + CW, r[i].y); junction(g, BX, r[i].y); T(g, nm[i], BX + 10, r[i].y + 5, 13, C.muted, 500, 'left', true, sel ? 0.5 : 1); }
        }
        junction(g, BX, r[4].y); T(g, 'CS', BX + 10, r[4].y + 5, 13, C.muted, 500, 'left', true, sel ? 0.5 : 1);
        T(g, 'sensör', AX + 68, 116, 13, C.ink2, 500, 'center');
        T(g, '1', AX + 68, 142, 22, C.ink, 600, 'center', true);
        T(g, 'sensör', BX + 68, 134, 13, C.ink2, 500, 'center', false, sel ? 0.5 : 1);
        T(g, '2', BX + 68, 160, 22, C.ink, 600, 'center', true, sel ? 0.5 : 1);
      } else if (view === 'uart') {
        card(g, UX, 62, UW, 148, false, 1); pin(g, UX, r[0].y); pin(g, UX, r[1].y);
        T(g, 'TX', UX + 10, r[0].y + 5, 13, C.copText, 600, 'left', true);
        T(g, 'RX', UX + 10, r[1].y + 5, 13, C.blue, 600, 'left', true);
        T(g, 'UART’lı', UX + 124, 122, 15, C.ink, 600, 'center');
        T(g, 'sensör modülü', UX + 124, 144, 13, C.muted, 400, 'center');
        T(g, 'TX ↔ RX', 875, 70, 13, C.ink2, 500, 'center', true);
      }
    }

    /* ---------- alt karşılaştırma satırı ---------- */
    function drawCompare(g, a) {
      var cells = [
        { v: 'i2c', h: 'I2C', a: '2 tel: SDA, SCL', b: 'hız 100 / 400 kHz · çok cihaz (adresle)' },
        { v: 'spi', h: 'SPI', a: '4 tel + her cihaza bir CS', b: 'hız MHz düzeyi · çok cihaz (CS ile)' },
        { v: 'uart', h: 'UART', a: '2 tel: TX, RX', b: 'hız 9.600 – 115.200 baud · 2 cihaz' }
      ];
      var on = view === 'i2c' || view === 'spi' || view === 'uart';
      for (var i = 0; i < 3; i++) {
        var c = cells[i], x = 14 + i * 370, hot = on && c.v === view;
        g.save();
        g.globalAlpha *= on ? 1 : 0.6;
        g.fillStyle = hot ? C.soft : C.card; g.strokeStyle = hot ? C.blue : C.line2; g.lineWidth = hot ? 1.8 : 1.2;
        K.rr(g, x + 0.5, 324.5, 356, 48, 6); g.fill(); g.stroke();
        g.restore();
        T(g, c.h, x + 12, 344, 15, hot ? C.blue : C.ink, 600, 'left', true, on ? 1 : 0.6);
        T(g, c.a, x + 12 + (c.h.length + 1) * 9.4, 344, 13.5, C.ink2, 500, 'left', false, on ? 1 : 0.6);
        T(g, c.b, x + 12, 364, 13.5, C.ink2, 400, 'left', false, on ? 1 : 0.6);
      }
    }

    /* ---------- görünüm başına çizim ---------- */
    function captionAt(g, s, y, color) { T(g, s, SX, y, 16, color || C.ink, 600); }

    function drawView(g, tt, vt) {
      var V = VW[view], rows = V.rows, i, k, r;
      var D = V.D, prog = D ? clamp(vt / PLAY, 0, 1) * D : 0;
      if (K.reducedMotion && D) prog = D;

      drawBoard(g, V);
      drawWires(g, V);
      for (i = 0; i < rows.length; i++) stripBox(g, rows[i]);

      // okuma anı bandı ve ızgara
      if (D) {
        if (V.grid) {
          g.save(); g.strokeStyle = C.line2; g.lineWidth = 1; g.setLineDash([3, 4]);
          for (k = 1; k <= 11; k++) {
            g.beginPath(); g.moveTo(px(D, k), rows[0].y - r0(rows) ); g.lineTo(px(D, k), rows[rows.length - 1].y + rows[rows.length - 1].sh / 2 + 6); g.stroke();
          }
          g.restore();
        }
        var br = rows[V.bandRow !== undefined ? V.bandRow : 0], sl = br.slots;
        if (sl && prog < D) {
          for (i = 0; i < sl.length; i++) {
            if (prog >= sl[i].a && prog < sl[i].b) {
              g.fillStyle = C.band;
              g.fillRect(px(D, sl[i].a), rows[0].y - rows[0].sh / 2 - 6, px(D, sl[i].b) - px(D, sl[i].a), rows[rows.length - 1].y + rows[rows.length - 1].sh / 2 + 6 - (rows[0].y - rows[0].sh / 2 - 6));
            }
          }
        }
      }

      // dalgalar
      var lastV = [];
      for (i = 0; i < rows.length; i++) {
        r = rows[i];
        if (r.scroll) lastV[i] = scrollRow(g, r, tt);
        else waveRow(g, r, D, prog);
      }
      scaleLabels(g, rows[0]);
      if (view === 'analog') {
        g.save(); g.strokeStyle = C.line2; g.lineWidth = 1; g.setLineDash([4, 4]);
        g.beginPath(); g.moveTo(SX + 4, rows[0].y); g.lineTo(SX + SW - 4, rows[0].y); g.stroke(); g.restore();
      }

      // basamaklar
      for (i = 0; i < rows.length; i++) {
        r = rows[i];
        if (!r.slots) continue;
        for (k = 0; k < r.slots.length; k++) {
          var s = r.slots[k], cx = (px(D, s.a) + px(D, s.b)) / 2;
          if (s.t === 'P') cx = px(D, 21.5);
          if (s.t === 'S') cx = px(D, 1.5);
          T(g, s.t, cx, r.y + 5, 14, C.ink, 600, 'center', true, prog >= s.a ? 1 : 0.28);
        }
      }

      // örnekleme noktaları
      if (V.samples && V.samples.length) {
        for (i = 0; i < V.samples.length; i++) {
          var sp = V.samples[i];
          if (prog < sp.tau) continue;
          var x = px(D, sp.tau), rr0 = rows[sp.rows[0]];
          if (view === 'i2c' || view === 'spi') {
            g.save(); g.strokeStyle = C.muted; g.lineWidth = 1; g.globalAlpha *= 0.55; g.setLineDash([2, 3]);
            g.beginPath(); g.moveTo(x, rows[0].y + rows[0].sh / 2 + 4); g.lineTo(x, rr0.y - rr0.sh / 2 + 0); g.stroke(); g.restore();
          }
          for (k = 0; k < sp.rows.length; k++) {
            var rw = rows[sp.rows[k]], sg = null, j;
            for (j = 0; j < rw.segs.length; j++) if (rw.segs[j].a <= sp.tau && rw.segs[j].b > sp.tau) sg = rw.segs[j];
            if (!sg || sg.d === 3) continue;
            g.fillStyle = C.ink; g.beginPath(); g.arc(x, yv(rw, sg.lv), 3.6, 0, 6.2832); g.fill();
          }
        }
      }
      // imleç
      if (D && prog < D) {
        g.save(); g.strokeStyle = C.ink2; g.globalAlpha *= 0.5; g.lineWidth = 1.2;
        var xc = px(D, prog);
        g.beginPath(); g.moveTo(xc, rows[0].y - rows[0].sh / 2 - 6); g.lineTo(xc, rows[rows.length - 1].y + rows[rows.length - 1].sh / 2 + 6); g.stroke(); g.restore();
      }

      // gruplar
      if (V.groups) {
        var lr = rows[rows.length - 1], gy = lr.y + lr.sh / 2 + 15;
        for (i = 0; i < V.groups.length; i++) {
          var gp = V.groups[i], ga = prog >= gp.a ? 1 : 0.3;
          brk(g, px(D, gp.a) + 2, px(D, gp.b) - 2, gy, textColOf(gp.d), ga);
          T(g, gp.t, (px(D, gp.a) + px(D, gp.b)) / 2 + (gp.dx || 0), gy + 20, 13, textColOf(gp.d), 600, 'center', false, ga);
        }
      }

      drawCards(g, V, prog, tt);
      if (view === 'i2c' || view === 'spi') {
        // cihaz kartlarının üstündeki bağlantı noktaları zaten kartta çizildi
      }

      // açıklama satırları
      var fv;
      if (view === 'analog') {
        var v = sigAnalog(tt), volt = v * 3.3;
        captionAt(g, 'sayıya çevirmek karta düşer', 222, C.ink);
        T(g, 'telde sayı yok, yalnızca gerilim düzeyi var: ' + tr(volt, 2) + ' V', SX, 250, 15, C.ink2, 400);
        T(g, tr(volt, 2) + ' V ÷ 3,3 V × 4.095 ≈ ' + th(v * 4095), SX, 274, 15, C.blue, 600, 'left', true);
        T(g, 'ADC ayrıntısı: Analogdan sayıya slaydı · güç telleri (3,3 V, GND) çizilmedi', SX, 300, 13, C.muted, 400);
      } else if (view === 'dijital') {
        captionAt(g, 'yalnızca iki durum var: 0 ya da 1', 258, C.ink);
        T(g, 'Düğme basılınca pin 3,3 V’a bağlanır (1), bırakılınca 0 V’a iner (0).', SX, 282, 14.5, C.ink2, 400);
        T(g, 'PIR hareket görünce çıkışını birkaç saniye 1 tutar.', SX, 303, 14.5, C.ink2, 400);
      } else if (view === 'darbe') {
        T(g, '10 µs', px(D, 0.321) + 8, rows[0].y + 5, 13, C.blue, 600, 'left', true, prog > 0.32 ? 1 : 0.3);
        T(g, 'ECHO = 1 süresi → mesafe', (px(D, 0.55) + px(D, 3.45)) / 2, rows[1].y + 5, 13, C.copText, 600, 'center', false, prog > 1 ? 1 : 0.3);
        var fa = sh01(3.45, 3.9, prog);
        brk(g, px(D, 0.55), px(D, 3.45), 206, C.copText, fa);
        T(g, 't = 2,9 ms (ses gidip döner)', (px(D, 0.55) + px(D, 3.45)) / 2, 226, 14, C.copText, 600, 'center', true, fa);
        T(g, 'd = 343 × t ÷ 2', SX, 258, 16, C.ink, 600, 'left', true, 0.4 + 0.6 * fa);
        T(g, 'd = 343 × 0,0029 ÷ 2 ≈ 0,50 m', SX, 282, 16, C.blue, 600, 'left', true, fa);
        T(g, '÷ 2: ses gidip geri geldiği için yolu ikiye böleriz · ayrıntı: Mesafe sensörü slaydı', SX, 304, 13, C.muted, 400, 'left', false, 1);
      } else if (view === 'i2c') {
        var pa = sh01(10, 11, prog), pd = sh01(19, 20, prog);
        captionAt(g, 'iki tel, çok sensör: her birinin adresi var (kapı numarası gibi)', 238, C.ink);
        T(g, 'adres 1001000 = 64 + 8 = 72 = 0x48', SX, 262, 14.5, C.blue, 600, 'left', true, 0.35 + 0.65 * sh01(2, 9, prog));
        T(g, 'veri 0001 1010 = 16 + 8 + 2 = 26 → 26 °C', SX, 284, 14.5, C.copText, 600, 'left', true, 0.35 + 0.65 * pd);
        T(g, 'hatlar boştayken çekme dirençleriyle 3,3 V’ta durur · saat 100 ya da 400 kHz', SX, 306, 13, C.muted, 400);
      } else if (view === 'spi') {
        captionAt(g, 'dört tel, çok hızlı; her cihaz için ayrı CS', 262, C.ink);
        T(g, 'CS = 0 olan cihaz konuşur · MOSI: karttan sensöre, MISO: sensörden karta', SX, 284, 14, C.ink2, 400);
        T(g, 'komut 1010 0101 gider, cevap 0001 1010 = 26 gelir · bitler saat kenarlarında kayar', SX, 304, 13, C.muted, 400);
      } else if (view === 'uart') {
        captionAt(g, 'saat teli yok: iki taraf hızı (baud) önceden anlaşır', 238, C.ink);
        T(g, 'A = 0x41 = 0100 0001 = 64 + 1 = 65; hatta sırayla 1000 0010 gider', SX, 262, 14.5, C.blue, 600, 'left', true);
        T(g, '9.600 baud: 1 bit = 1 ÷ 9.600 ≈ 104 µs; 10 bit = 1,04 ms', SX, 284, 14, C.ink2, 400);
        T(g, 'TX ve RX çapraz bağlanır: kartın TX’i sensörün RX’ine gider', SX, 304, 13, C.muted, 400);
      }
    }
    function r0(rows) { return rows[0].sh / 2 + 6; }

    function frame(t, dt) {
      var g = sf.ctx;
      if (needT) { tView = t; needT = false; }
      var vt;
      if (auto && !K.reducedMotion) {
        view = VIEWS[Math.floor(t / DEMO) % VIEWS.length];
        vt = t % DEMO;
      } else vt = (t - tView) % DEMO;
      if (K.reducedMotion) vt = PLAY;
      tNow = K.reducedMotion ? 12 : t;
      if (view !== lastView) { lastView = view; fadeT = t; }
      var fa = K.reducedMotion ? 1 : sh01(0, 0.3, t - fadeT);

      sf.clear();
      drawTabs(g);
      drawLegend(g);
      tag(g, 'yavaşlatılmış · basitleştirilmiş', sf.w - 24, 27);
      g.save();
      g.globalAlpha *= 0.15 + 0.85 * fa;
      drawView(g, tNow, vt);
      drawCompare(g, 1);
      g.restore();
    }

    resetState();
    return {
      reset: function () { resetState(); },
      frame: frame,
      set: function (key, val) {
        if (key === 'view' && VIEWS.indexOf(val) >= 0) { view = val; auto = false; needT = true; }
      },
      read: function (key) {
        if (key === 'view') return view;
        if (key === 'explain') return EXPLAIN[view];
        if (key === 'wires') return WIRES[view];
        return '';
      },
      resize: function () { sf.resize(); },
      dispose: function () { sf.dispose(); }
    };
  });
})();
