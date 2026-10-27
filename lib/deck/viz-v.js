/* Köklerden Göklere · Veri kabloda nasıl yolculuk eder?
 * serial-link · 1120×440 (her boyuta ölçeklenir) · 2B
 * Dört görünüm: paralel, seri, uart, fark (USB D+/D−). Sözleşme: kg-viz.js.
 * Zaman her görünümde yerel (T): görünüm değişince akış baştan başlar.
 */
(function () {
  'use strict';
  var K = window.KGViz;
  if (!K) return;
  var P = K.palette;
  var clamp = K.clamp, lerp = K.lerp;

  var VIEWS = ['paralel', 'seri', 'uart', 'fark'];
  var TABS = ['paralel', 'seri', 'UART', 'fark (USB)'];
  var DEMO = 9;
  var TITLES = { paralel: 'Paralel: 8 tel', seri: 'Seri: tek tel', uart: 'UART', fark: 'Fark: D+ ve D−' };
  var VWD = 1120, VHD = 440;

  var TIMING = {
    115200: { line: '115.200 baud: 1 bit = 1 ÷ 115.200 = 8,68 µs · 10 bit = 86,8 µs · 11.520 karakter/s', bit: '8,68 µs', chr: '86,8 µs', cnt: '11,52 karakter', cps: 11.52 },
    9600: { line: '9.600 baud: 1 bit = 1 ÷ 9.600 = 104,2 µs · 10 bit = 1,04 ms · 960 karakter/s', bit: '104,2 µs', chr: '1,04 ms', cnt: '0,96 karakter', cps: 0.96 }
  };

  var EXPLAIN = {
    paralel: 'Paralel: 8 bit 8 telden birden gider. Hız artınca tellerin gecikme farkı bitten büyük olur, bitler bozulur.',
    seri: 'Seri: aynı bayt tek telden, bit bit gider. Tek tel ucuzdur; hız çok hızlı saatten gelir.',
    uart: 'UART: hat boşta 1’dedir. Bir karakter 10 bittir: start (0), 8 veri biti, stop (1). Saat teli yok.',
    fark: 'USB: D+ ve D− birbirinin tersi gider, alıcı farkı okur. Gürültü ikisine de bindiği için fark bozulmaz.'
  };

  function ss(a, b, x) { var t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); }
  function mod(a, n) { return ((a % n) + n) % n; }

  /* ---------- stream model (paralel, seri) ---------- */
  var LX = 124, XE = 930, LEN = XE - LX, VP = 300;     // wire start, receiver line, length, px/s
  var SEQ = 'AZKXMSDW';
  var SK = [14, -10, 22, -16, 6, 26, -22, 12];            // per-wire skew in px (fixed, physical)
  var TB_SLOW = 0.5, TB_FAST = 0.1, TBS = 0.08;

  function fPar(T) {
    var ph = mod(T, 22);
    return ph < 14 ? ss(0.5, 3, ph) : 1 - ss(14, 20, ph);
  }
  var te = [], G0 = 0;
  (function () {
    var x = -9;
    while (x < 1200) { te.push(x); x += lerp(TB_SLOW, TB_FAST, fPar(x)); }
    te.push(x);
    for (var i = 0; i < te.length - 1; i++) if (te[i] <= 0 && te[i + 1] > 0) { G0 = i; break; }
  })();
  function slotAt(time) {
    var lo = 0, hi = te.length - 2;
    if (time <= te[0]) return 0;
    while (lo < hi) {
      var mid = (lo + hi + 1) >> 1;
      if (te[mid] <= time) lo = mid; else hi = mid - 1;
    }
    return lo;
  }
  function codeOf(j) { return SEQ.charCodeAt(mod(j - G0, SEQ.length)); }
  function bin8(c) { var s = c.toString(2); while (s.length < 8) s = '0' + s; return s; }

  /* serial stream: one bit per tick, LSB first */
  var TS0 = -113 * TBS;
  var J0 = 113;
  function sTime(j) { return TS0 + j * TBS; }
  function sByte(j) { return Math.floor((j - J0) / 8); }
  function sBit(j) {
    var b = mod(j - J0, 8), c = SEQ.charCodeAt(mod(sByte(j), SEQ.length));
    return (c >> b) & 1;
  }

  /* UART frame for 'A' (0x41): idle, start, D0..D7 (LSB first), stop, idle */
  var A_BITS = [];
  (function () { for (var i = 0; i < 8; i++) A_BITS.push((0x41 >> i) & 1); })();
  var FRAME = [1, 0].concat(A_BITS, [1, 1]);
  var FLAB = ['boşta', 'start', 'D0', 'D1', 'D2', 'D3', 'D4', 'D5', 'D6', 'D7', 'stop', 'boşta'];

  K.register('serial-link', function (el, opts) {
    opts = opts || {};
    var dark = (opts.theme || 'light') === 'dark';
    var sf = K.surface(el);
    var C = {
      ink: dark ? P.onNight : P.ink,
      ink2: dark ? '#C9CFDA' : P.ink2,
      muted: dark ? P.onNightMuted : P.muted,
      line: dark ? P.nightLine : P.line,
      line2: dark ? '#3A4254' : P.line2,
      blue: dark ? P.blueLight : P.blue,
      cop: dark ? P.copperLight : P.copperFill,
      copText: dark ? P.copperLight : '#A64B22',
      grey: dark ? '#9AA3B2' : '#666C78',
      card: dark ? '#161B26' : '#FFFFFF',
      white: dark ? P.night : '#FFFFFF',
      noise: dark ? '#9AA3B2' : '#8A909C'
    };

    var view = 'paralel', auto = true, baud = 115200, viewT0 = 0, lastT = 0;
    function resetState() { view = 'paralel'; auto = true; baud = 115200; viewT0 = 0; lastT = 0; }
    resetState();
    var cur = { T: 0, env: 0, latch: '', err: 0 };

    function txt(g, s, x, y, o) { K.label(g, s, x, y, o); }

    /* ---------- shared drawing ---------- */
    function drawTabs(g) {
      txt(g, TITLES[view], 24, 30, { size: 26, weight: 700, color: C.ink });
    }
    function tag(g, s, xr, y) {
      g.save();
      g.font = K.font(14, 500, true);
      var w = g.measureText(s).width + 18;
      g.strokeStyle = C.muted; g.lineWidth = 1;
      K.rr(g, xr - w + 0.5, y - 17.5, w, 26, 6); g.stroke();
      g.restore();
      txt(g, s, xr - w + 9, y + 1, { size: 14, mono: true, weight: 500, color: C.muted });
    }
    function box(g, x, y, w, h, label) {
      g.save();
      g.fillStyle = C.card;
      K.rr(g, x + 0.5, y + 0.5, w, h, 6); g.fill();
      g.strokeStyle = C.ink2; g.lineWidth = 1.5; g.stroke();
      g.restore();
      if (label) txt(g, label, x + w / 2, y + h / 2 + 6, { size: 16, weight: 700, color: C.ink, align: 'center' });
    }
    function link(g, x1, x2, y, label, on) {
      var col = on ? C.copText : C.line2;
      g.save();
      g.strokeStyle = on ? C.cop : C.line2; g.lineWidth = on ? 3 : 2; g.lineCap = 'round';
      g.beginPath(); g.moveTo(x1, y); g.lineTo(x2, y); g.stroke();
      g.restore();
      var m = (x1 + x2) / 2, hc = on ? C.cop : C.line2;
      K.arrow(g, m, y, x2 + 2, y, { color: hc, width: 1, head: 9 });
      K.arrow(g, m, y, x1 - 2, y, { color: hc, width: 1, head: 9 });
      txt(g, label, m, y - 8, { size: 15, mono: true, weight: 700, color: on ? C.copText : C.muted, align: 'center' });
      void col;
    }
    function drawChain(g) {
      var y = 50, h = 40, yl = 74;
      var l1 = view === 'uart' || view === 'seri';
      var l2 = view === 'fark' || view === 'seri';
      box(g, 24, y, 124, h, 'ESP32 kartı');
      link(g, 152, 236, yl, 'TX / RX', l1);
      box(g, 240, y, 176, h, 'USB-seri çevirici');
      link(g, 420, 504, yl, 'D+ / D−', l2);
      box(g, 508, y, 120, h, 'bilgisayar');
    }
    function blockBit(g, xl, xr, y, bit, h, digit) {
      var l = Math.max(xl, LX), r = Math.min(xr, XE);
      if (r - l < 2) return;
      l += 0.8; r -= 0.8;
      if (bit) {
        g.fillStyle = C.blue;
        g.fillRect(l, y - h / 2, r - l, h);
        if (digit && xr - xl >= 22 && xl >= LX && xr <= XE) txt(g, '1', (xl + xr) / 2, y + 5.5, { size: 15, mono: true, weight: 700, color: C.white, align: 'center' });
      } else {
        g.fillStyle = C.card;
        g.fillRect(l, y - h / 2, r - l, h);
        g.strokeStyle = C.line2; g.lineWidth = 1;
        g.strokeRect(l + 0.5, y - h / 2 + 0.5, r - l - 1, h - 1);
        if (digit && xr - xl >= 22 && xl >= LX && xr <= XE) txt(g, '0', (xl + xr) / 2, y + 5.5, { size: 15, mono: true, weight: 600, color: C.grey, align: 'center' });
      }
    }
    function cell(g, x, y, w, h, bit, bad, digit) {
      g.save();
      if (bad) { g.fillStyle = C.cop; g.strokeStyle = C.copText; }
      else if (bit) { g.fillStyle = C.blue; g.strokeStyle = C.blue; }
      else { g.fillStyle = C.card; g.strokeStyle = C.line2; }
      g.lineWidth = 1.4;
      K.rr(g, x + 0.5, y + 0.5, w, h, 3); g.fill(); g.stroke();
      g.restore();
      if (digit !== false) txt(g, bit ? '1' : '0', x + w / 2 + 0.5, y + h / 2 + 5.5, { size: 15, mono: true, weight: 700, color: (bit || bad) ? C.white : C.grey, align: 'center' });
    }

    /* ---------- paralel ---------- */
    function drawParallel(g, T) {
      var f = fPar(T), i, j;
      var wy = function (n) { return 130 + n * 36; };
      // sender
      var s0 = slotAt(T), sc = codeOf(s0);
      box(g, 24, 106, 84, 300);
      txt(g, 'gönderen', 66, 134, { size: 17, weight: 700, color: C.ink, align: 'center' });
      txt(g, String.fromCharCode(sc), 66, 276, { size: 60, weight: 700, color: C.ink, align: 'center' });
      // receiver
      box(g, 946, 106, 150, 300);
      txt(g, 'alıcı', 1040, 134, { size: 17, weight: 700, color: C.ink, align: 'center' });
      // tracks
      for (i = 0; i < 8; i++) {
        g.strokeStyle = C.line; g.lineWidth = 1;
        g.beginPath(); g.moveTo(108, wy(i) + 0.5); g.lineTo(946, wy(i) + 0.5); g.stroke();
      }
      // sample line
      var kk = slotAt(T - LEN / VP);
      if ((te[kk] + te[kk + 1]) / 2 > T - LEN / VP) kk--;
      var tm = (te[kk] + te[kk + 1]) / 2 + LEN / VP;
      var flash = clamp(1 - (T - tm) / 0.25, 0, 1);
      g.save();
      g.strokeStyle = C.copText; g.lineWidth = 1.4; g.setLineDash([4, 4]); g.globalAlpha = 0.45 + 0.55 * flash;
      g.beginPath(); g.moveTo(XE + 0.5, 112); g.lineTo(XE + 0.5, 404); g.stroke();
      g.restore();
      txt(g, 'okuma', XE - 6, 104, { size: 15, mono: true, weight: 600, color: C.copText, align: 'right' });
      // pulses
      for (i = 0; i < 8; i++) {
        var d = SK[i] / VP, bi = 7 - i, y = wy(i);
        var a = slotAt(T - d - LEN / VP), b = slotAt(T - d);
        for (j = a; j <= b; j++) {
          var xr = LX + VP * (T - te[j] - d), xl = LX + VP * (T - te[j + 1] - d);
          blockBit(g, xl, xr, y, (codeOf(j) >> bi) & 1, 24, true);
        }
      }
      // latch (what the receiver read at the last tick)
      var rd = 0, snt = codeOf(kk), tmid = (te[kk] + te[kk + 1]) / 2, bad = 0, flags = [];
      for (i = 0; i < 8; i++) {
        var m = slotAt(tmid - SK[i] / VP), bit = (codeOf(m) >> (7 - i)) & 1;
        rd |= bit << (7 - i);
        var wrong = bit !== ((snt >> (7 - i)) & 1);
        flags.push(wrong); if (wrong) bad++;
        cell(g, 952, wy(i) - 12, 28, 24, bit, wrong, true);
      }
      var ok = bad === 0;
      txt(g, String.fromCharCode(rd >= 32 && rd < 127 ? rd : 63), 1040, 288, { size: 52, weight: 700, color: ok ? C.ink : C.copText, align: 'center' });
      txt(g, ok ? 'doğru' : bad + ' bit yanlış', 1042, 388, { size: 15, mono: true, weight: 700, color: ok ? C.blue : C.copText, align: 'center' });
      cur.latch = bin8(rd); cur.err = bad;
      // saat hızı göstergesi
      txt(g, 'saat hızı', 124, 428, { size: 17, weight: 700, color: C.ink });
      g.fillStyle = C.line; g.fillRect(222, 418, 200, 10);
      g.fillStyle = C.copText; g.fillRect(222, 418, 200 * f, 10);
      txt(g, f < 0.35 ? 'yavaş' : f > 0.65 ? 'hızlı' : 'artıyor', 436, 428, { size: 17, weight: 700, color: C.ink });
    }

    /* ---------- seri ---------- */
    function drawSerial(g, T) {
      var yw = 262, yc = 196, j;
      box(g, 24, 176, 84, 172);
      txt(g, 'gönderen', 66, 204, { size: 17, weight: 700, color: C.ink, align: 'center' });
      var jn = Math.floor((T - TS0) / TBS);
      var bn = SEQ.charCodeAt(mod(sByte(jn), SEQ.length));
      txt(g, String.fromCharCode(bn), 66, 296, { size: 52, weight: 700, color: C.ink, align: 'center' });
      box(g, 946, 176, 150, 172);
      txt(g, 'alıcı', 1040, 204, { size: 17, weight: 700, color: C.ink, align: 'center' });
      g.strokeStyle = C.line; g.lineWidth = 1;
      g.beginPath(); g.moveTo(108, yw + 0.5); g.lineTo(946, yw + 0.5); g.stroke();
      txt(g, 'saat tıkı: her bit için bir tık', LX, 160, { size: 16, weight: 600, color: C.ink2 });
      var a = Math.floor((T - LEN / VP - TS0) / TBS), b = Math.floor((T - TS0) / TBS);
      for (j = a; j <= b; j++) {
        var xr = LX + VP * (T - sTime(j)), xl = LX + VP * (T - sTime(j + 1));
        var l = Math.max(xl, LX), r = Math.min(xl + (xr - xl) / 2, XE);
        if (r - l > 1) { g.fillStyle = C.line2; g.fillRect(l + 0.8, yc - 8, r - l - 1, 16); }
        blockBit(g, xl, xr, yw, sBit(j), 30, true);
      }
      var b0 = sByte(a) - 1, b1 = sByte(b) + 1, q;
      for (q = b0; q <= b1; q++) {
        var jf = J0 + q * 8, jl = jf + 7;
        var bx2 = LX + VP * (T - sTime(jf)), bx1 = LX + VP * (T - sTime(jl + 1));
        var cl = Math.max(bx1, LX), cr = Math.min(bx2, XE);
        if (cr - cl < 190) continue;
        g.strokeStyle = C.ink2; g.lineWidth = 1.6;
        g.beginPath(); g.moveTo(cl + 1, 290); g.lineTo(cl + 1, 298); g.lineTo(cr - 1, 298); g.lineTo(cr - 1, 290); g.stroke();
        var ch = SEQ.charAt(mod(q, SEQ.length));
        txt(g, ch + ' = ' + bin8(SEQ.charCodeAt(mod(q, SEQ.length))), (cl + cr) / 2, 326, { size: 17, mono: true, weight: 700, color: C.ink, align: 'center' });
      }
      var kk = Math.floor((T - LEN / VP - TS0) / TBS - 0.5);
      var tm = sTime(kk) + TBS / 2 + LEN / VP;
      var flash = clamp(1 - (T - tm) / 0.12, 0, 1);
      g.save();
      g.strokeStyle = C.copText; g.lineWidth = 1.4; g.setLineDash([4, 4]); g.globalAlpha = 0.4 + 0.6 * flash;
      g.beginPath(); g.moveTo(XE + 0.5, 176); g.lineTo(XE + 0.5, 300); g.stroke();
      g.restore();
      txt(g, 'okuma', XE - 6, 168, { size: 15, mono: true, weight: 600, color: C.copText, align: 'right' });
      var got = mod(kk - J0, 8) + 1, rb = sByte(kk), rc = SEQ.charCodeAt(mod(rb, SEQ.length));
      for (var i = 0; i < 8; i++) {
        var x = 954 + (7 - i) * 17;
        cell(g, x, yw - 12, 15, 24, (i < got) ? (rc >> i) & 1 : 0, false, false);
        if (i >= got) { g.save(); g.fillStyle = C.line; K.rr(g, x + 0.5, yw - 11.5, 15, 24, 3); g.fill(); g.restore(); }
      }
      txt(g, got === 8 ? String.fromCharCode(rc) : '…', 1040, 326, { size: 36, weight: 700, color: C.ink, align: 'center' });
    }

    /* ---------- uart ---------- */
    function drawUart(g, T) {
      var X0 = 130, SW = 70, yh = 138, yl = 196, i, tm = TIMING[baud];
      var frameDur = 12 / baud * 13825;                     // slowed-down seconds for 12 slots
      var cyc = frameDur + 1.0;
      var ph = mod(T, cyc), u = Math.min(1, ph / frameDur) * 12, cx = X0 + u * SW;
      // slot tints and labels
      for (i = 0; i < 12; i++) {
        var sx = X0 + i * SW, isEdge = (i === 1 || i === 10), isIdle = (i === 0 || i === 11);
        g.save();
        g.globalAlpha = isEdge ? 0.14 : isIdle ? 0 : 0.06;
        g.fillStyle = isEdge ? C.cop : C.blue;
        g.fillRect(sx, 122, SW, 92);
        g.restore();
        g.strokeStyle = C.line2; g.lineWidth = 1;
        g.beginPath(); g.moveTo(sx + 0.5, 122); g.lineTo(sx + 0.5, 214); g.stroke();
        var on = u >= i && u < i + 1;
        txt(g, FLAB[i], sx + SW / 2, 114, { size: 15, mono: true, weight: on || isEdge ? 700 : 500, color: isEdge ? C.copText : on ? C.ink : C.muted, align: 'center' });
        txt(g, String(FRAME[i]), sx + SW / 2, 240, { size: 22, mono: true, weight: 700, color: isEdge ? C.copText : C.blue, align: 'center' });
      }
      g.strokeStyle = C.line2; g.beginPath(); g.moveTo(X0 + 12 * SW + 0.5, 122); g.lineTo(X0 + 12 * SW + 0.5, 214); g.stroke();
      txt(g, '1', 112, yh + 6, { size: 16, mono: true, weight: 600, color: C.muted, align: 'right' });
      txt(g, '0', 112, yl + 6, { size: 16, mono: true, weight: 600, color: C.muted, align: 'right' });
      // wave: faint whole, strong up to cursor
      function wave(col, w) {
        g.strokeStyle = col; g.lineWidth = w; g.lineJoin = 'miter';
        g.beginPath();
        var y0 = FRAME[0] ? yh : yl;
        g.moveTo(X0 - 14, y0); g.lineTo(X0, y0);
        for (var k = 0; k < 12; k++) {
          var y = FRAME[k] ? yh : yl;
          if (k > 0) g.lineTo(X0 + k * SW, y);
          g.lineTo(X0 + (k + 1) * SW, y);
        }
        g.lineTo(X0 + 12 * SW + 14, yh);
        g.stroke();
      }
      g.save();
      g.beginPath(); g.rect(0, 100, 1120, 140); g.clip();
      g.globalAlpha = 0.28; wave(C.blue, 3);
      g.restore();
      g.save();
      g.beginPath(); g.rect(0, 100, cx, 140); g.clip();
      wave(C.blue, 3.4);
      g.restore();
      // cursor
      g.strokeStyle = C.copText; g.lineWidth = 2;
      g.beginPath(); g.moveTo(cx, 120); g.lineTo(cx, 216); g.stroke();
      // brackets
      function bracket(xa, xb, y, label) {
        g.strokeStyle = C.ink2; g.lineWidth = 1.4;
        g.beginPath(); g.moveTo(xa + 1, y - 6); g.lineTo(xa + 1, y); g.lineTo(xb - 1, y); g.lineTo(xb - 1, y - 6); g.stroke();
        txt(g, label, (xa + xb) / 2, y + 20, { size: 17, mono: true, weight: 700, color: C.ink, align: 'center' });
      }
      bracket(X0 + SW, X0 + 2 * SW, 250, '1 bit = ' + tm.bit);
      bracket(X0 + SW, X0 + 11 * SW, 284, '10 bit = ' + tm.chr + ' (1 karakter)');
      // 1 ms strip
      var sx0 = X0, pxBit = 840000 / baud, ys = 340;
      txt(g, '1 ms’de', 24, ys + 16, { size: 17, weight: 700, color: C.ink });
      g.save();
      g.beginPath(); g.rect(sx0, ys - 2, 840, 24); g.clip();
      g.fillStyle = C.line; g.fillRect(sx0, ys, 840, 20);
      var nfr = Math.ceil(840 / (pxBit * 10)) + 1, fr, bit;
      for (fr = 0; fr < nfr; fr++) {
        var fx = sx0 + fr * 10 * pxBit;
        for (bit = 0; bit < 10; bit++) {
          var val = bit === 0 ? 0 : bit === 9 ? 1 : A_BITS[bit - 1];
          var bx = fx + bit * pxBit;
          if (val) { g.fillStyle = C.blue; g.fillRect(bx + 0.4, ys + 2, Math.max(1, pxBit - 0.8), 16); }
          else { g.fillStyle = bit === 0 ? C.cop : C.card; g.fillRect(bx + 0.4, ys + 2, Math.max(1, pxBit - 0.8), 16); }
        }
        g.strokeStyle = C.ink; g.lineWidth = 1.4;
        g.beginPath(); g.moveTo(fx + 0.5, ys - 2); g.lineTo(fx + 0.5, ys + 22); g.stroke();
      }
      g.restore();
      g.strokeStyle = C.ink2; g.lineWidth = 1.4;
      g.strokeRect(sx0 + 0.5, ys - 1.5, 840, 23);
      txt(g, '= ' + tm.cnt, sx0 + 840, ys + 52, { size: 18, mono: true, weight: 700, color: C.copText, align: 'right' });
    }

    /* ---------- fark ---------- */
    var NBIT = 8, FB = A_BITS;
    function lvl(k) { return k < 0 ? 1 : k > 7 ? 1 : FB[k]; }
    function level(u) {
      var b = Math.floor(u), f = u - b;
      if (f < 0.08) return lerp(lvl(b - 1), lvl(b), ss(0, 0.08, f));
      return lvl(b);
    }
    function noiseAt(u, env) {
      var w = ss(1.8, 2.3, u) * (1 - ss(6.7, 7.2, u));
      return 0.62 * env * w * Math.cos(Math.PI * (u - 2.5)) + 0.1 * env * w * Math.sin(u * 23);
    }
    function drawDiff(g, T) {
      var ph = mod(T, 9) / 9;
      var env = ss(0.1, 0.22, ph) * (1 - ss(0.72, 0.86, ph));
      cur.env = env;
      var PW = 440, BW = PW / NBIT;
      var pxL = 70, pxR = 656, i, x;
      var env2 = env;
      // panels
      txt(g, 'tek tel', 24, 112, { size: 19, weight: 700, color: C.ink });
      txt(g, 'iki tel, fark okuma', 600, 112, { size: 19, weight: 700, color: C.ink });
      g.strokeStyle = C.line2; g.lineWidth = 1;
      g.beginPath(); g.moveTo(560.5, 100); g.lineTo(560.5, 340); g.stroke();
      // noise bands
      [pxL, pxR].forEach(function (px) {
        g.save(); g.globalAlpha = 0.16 * env2; g.fillStyle = C.noise;
        g.fillRect(px + BW * 1.8, 110, BW * 5.4, 130);
        g.restore();
        txt(g, 'gürültü', px + BW * 4.5, 130, { size: 16, mono: true, weight: 700, color: C.grey, align: 'center', alpha: env2 });
      });
      // bit grid ticks (light)
      [pxL, pxR].forEach(function (px) {
        for (i = 0; i <= NBIT; i++) {
          g.strokeStyle = C.line; g.lineWidth = 1;
          g.beginPath(); g.moveTo(px + i * BW + 0.5, 118); g.lineTo(px + i * BW + 0.5, 240); g.stroke();
        }
      });
      function trace(px, yb, sc, fn, col, w) {
        g.save();
        g.beginPath(); g.rect(px - 2, 104, PW + 4, 136); g.clip();
        g.strokeStyle = col; g.lineWidth = w; g.lineJoin = 'round';
        g.beginPath();
        for (x = 0; x <= PW; x += 2) {
          var u = x / BW, y = yb - sc * fn(u);
          if (x === 0) g.moveTo(px + x, y); else g.lineTo(px + x, y);
        }
        g.stroke();
        g.restore();
      }
      // left: single wire. level 0 at y 222, level 1 at y 170, threshold at 196
      var yb1 = 222, sc1 = 52;
      g.save(); g.strokeStyle = C.copText; g.lineWidth = 1.2; g.setLineDash([5, 4]);
      g.beginPath(); g.moveTo(pxL, yb1 - sc1 * 0.5 + 0.5); g.lineTo(pxL + PW, yb1 - sc1 * 0.5 + 0.5); g.stroke(); g.restore();
      trace(pxL, yb1, sc1, function (u) { return level(u) + noiseAt(u, env2); }, C.blue, 2.6);
      // right: D+, D−, difference
      var ybP = 150, ybM = 190, sc2 = 26;
      trace(pxR, ybP, sc2, function (u) { return level(u) + noiseAt(u, env2); }, C.blue, 2.4);
      trace(pxR, ybM, sc2, function (u) { return (1 - level(u)) + noiseAt(u, env2); }, C.cop, 2.4);
      txt(g, 'D+', pxR - 10, ybP + 2, { size: 17, mono: true, weight: 700, color: C.blue, align: 'right' });
      txt(g, 'D−', pxR - 10, ybM + 2, { size: 17, mono: true, weight: 700, color: C.copText, align: 'right' });
      // difference row: scale so +1 / −1 span, center 226
      var ybD = 224, sc3 = 12;
      g.strokeStyle = C.line2; g.lineWidth = 1; g.beginPath(); g.moveTo(pxR, ybD + 0.5); g.lineTo(pxR + PW, ybD + 0.5); g.stroke();
      trace(pxR, ybD, sc3, function (u) { var l = level(u), n = noiseAt(u, env2); return (l + n) - ((1 - l) + n); }, C.ink, 2.4);
      // receivers
      var e1 = 0, e2 = 0, rows = [];
      for (i = 0; i < NBIT; i++) {
        var uc = i + 0.5, nn = noiseAt(uc, env2), l = level(uc);
        var r1 = (l + nn) > 0.5 ? 1 : 0;
        var r2 = ((l + nn) - ((1 - l) + nn)) > 0 ? 1 : 0;
        if (r1 !== FB[i]) e1++;
        if (r2 !== FB[i]) e2++;
        rows.push([r1, r2]);
        cell(g, pxL + i * BW + BW / 2 - 15, 258, 30, 24, r1, r1 !== FB[i], true);
        cell(g, pxR + i * BW + BW / 2 - 15, 258, 30, 24, r2, r2 !== FB[i], true);
      }
      txt(g, e1 > 0 ? 'tek tel: bozuldu' : env2 < 0.05 ? 'tek tel: gürültü yok' : 'tek tel: bozulmadı', pxL + PW / 2, 322, { size: 20, weight: 700, color: e1 > 0 ? C.copText : C.ink, align: 'center' });
      txt(g, e2 > 0 ? 'fark okuma: bozuldu' : env2 < 0.05 ? 'fark okuma: gürültü yok' : 'fark okuma: bozulmadı', pxR + PW / 2, 322, { size: 20, weight: 700, color: e2 > 0 ? C.copText : C.blue, align: 'center' });
      cur.err = e1;
      void rows;
    }

    function frame(t, dt) {
      var g = sf.ctx;
      lastT = t;
      var T;
      if (auto && !K.reducedMotion) {
        var n = Math.floor(t / DEMO);
        view = VIEWS[n % VIEWS.length];
        T = t - n * DEMO;
        baud = 115200;
      } else {
        if (K.reducedMotion && auto) { view = 'paralel'; }
        T = K.reducedMotion ? 7 : t - viewT0;
      }
      cur.T = T;
      sf.clear();
      var sc = Math.min(sf.w / VWD, sf.h / VHD) * 0.98;
      g.save();
      g.translate((sf.w - VWD * sc) / 2, (sf.h - VHD * sc) / 2);
      g.scale(sc, sc);
      drawTabs(g);
      tag(g, 'yavaşlatılmış', VWD - 16, 31);
      drawChain(g);
      g.save();
      g.globalAlpha = ss(0, 0.3, T + 0.0001 + (K.reducedMotion ? 1 : 0));
      var dy = (view === 'uart' || view === 'fark') ? 16 : 0;
      g.translate(0, dy);
      if (view === 'paralel') drawParallel(g, T);
      else if (view === 'seri') drawSerial(g, T);
      else if (view === 'uart') drawUart(g, T);
      else drawDiff(g, T);
      g.restore();
      g.restore();
      void dt;
    }

    return {
      reset: function () { resetState(); },
      frame: frame,
      set: function (key, val) {
        if (key === 'view' && VIEWS.indexOf(val) >= 0) { view = val; auto = false; viewT0 = lastT; }
        else if (key === 'baud') {
          var b = +val;
          if (b === 9600 || b === 115200) {
            baud = b;
            if (view !== 'uart' || auto) { view = 'uart'; viewT0 = lastT; }
            auto = false;
          }
        }
      },
      read: function (key) {
        if (key === 'explain') return EXPLAIN[view];
        if (key === 'view') return view;
        if (key === 'baud') return String(baud);
        if (key === 'timing') return TIMING[baud].line;
        return '';
      },
      resize: function () { sf.resize(); },
      dispose: function () { sf.dispose(); }
    };
  });
})();
