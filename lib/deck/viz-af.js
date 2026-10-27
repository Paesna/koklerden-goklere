/* Köklerden Göklere · Kart dışarıya nasıl komut verir? PWM
 * pwm-lab · odak slayt, 1120×440 sanal sahne (görünüme göre ölçeklenir) · 2B
 * Beş görünüm: darbe, led, motor, servo, ton. Sözleşme: kg-viz.js.
 * Anahtarlar: set('view'|'duty'|'freq'), read('view'|'duty'|'explain'|'numbers').
 * duty 0..1 (görev oranı). Servo görünümünde duty, darbe genişliğini 1..2 ms arasında seçer.
 * Zaman ölçeği çok yavaşlatılmıştır; gerçekte darbeler saniyede 1.000 kez yinelenir.
 */
(function () {
  'use strict';
  var K = window.KGViz;
  if (!K) return;
  var P = K.palette;
  var clamp = K.clamp, lerp = K.lerp;

  var VIEWS = ['darbe', 'led', 'motor', 'servo', 'ton'];
  var TITLE = {
    darbe: 'Pinin darbeleri: görev oranı ve ortalama',
    led: 'LED’i karartmak',
    motor: 'Motor hızı: pin anahtarı yönetir',
    servo: 'Servo: darbe genişliği = açı',
    ton: 'Buzzer: frekans = perde'
  };
  var CAPTION = {
    darbe: 'Ortalama gerilim = görev oranı × 3,3 V · pin hiçbir zaman ara değer vermez',
    led: '1.000 kez/s açılıp kapanır: göz bunu ayırt edemez, yalnızca ortalamayı görür',
    motor: 'Pin yalnızca anahtarı yönetir · motorun akımını kendi pili verir · GND ortak',
    servo: 'Servo darbenin genişliğine bakar: 1 ms = 0°, 1,5 ms = 90°, 2 ms = 180°',
    ton: 'frekans = perde, görev oranı = parlaklık / hız'
  };
  var EXPLAIN = {
    darbe: 'Pin yalnızca 0 V ya da 3,3 V verir; açık kalma oranı (görev oranı) ortalama gerilimi belirler.',
    led: 'Göz saniyede 1.000 kez yanıp sönmeyi ayırt edemez: LED her an ya tam yanık ya sönük, göz ortalamayı görür.',
    motor: 'Pin motoru süremez: yalnızca transistörü açıp kapatır; motor akımını kendi pilinden alır.',
    servo: 'Servo açıyı darbenin genişliğinden okur: 1 ms = 0°, 1,5 ms = 90°, 2 ms = 180°.',
    ton: 'Perdeyi frekans belirler: 440 Hz pes, 880 Hz tiz ses verir; görev oranı perdeyi değiştirmez.'
  };

  var DEMO = 8;
  var VW = 1120, VH = 440;
  var VHI = 3.3, VMOTOR = 6, ILED = 3.9;

  function ss(a, b, x) { var t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); }
  function mod(a, n) { return ((a % n) + n) % n; }
  function dec(x, d) { var m = Math.pow(10, d); return (Math.round(x * m + 1e-7) / m).toFixed(d).replace('.', ','); }
  function trim(x, d) { var s = x.toFixed(d); if (s.indexOf('.') >= 0) s = s.replace(/0+$/, '').replace(/\.$/, ''); return s.replace('.', ','); }
  function pct(d) { return Math.round(d * 100); }

  K.register('pwm-lab', function (el, opts) {
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
      blueSoft: dark ? '#1E2A4D' : P.blueSoft,
      cop: dark ? P.copperLight : P.copperFill,
      copText: dark ? P.copperLight : '#A64B22',
      copSoft: dark ? '#3A2A20' : P.copperSoft,
      grey: dark ? '#9AA3B2' : '#666C78',
      card: dark ? '#161B26' : '#FFFFFF',
      white: dark ? P.night : '#FFFFFF',
      lamp: P.lamp
    };

    var view, auto, viewT0, lastT, dutyMan, lastDuty, freqSel, histView, speedF, rot, lastFall, prevHi;
    function resetState() {
      view = 'darbe'; auto = true; viewT0 = 0; lastT = 0; dutyMan = 0.5; lastDuty = 0.5; freqSel = 0;
      histView = ''; speedF = 0.5; rot = 0; lastFall = -9; prevHi = false;
    }
    resetState();
    var cur = { T: 0, duty: 0.5, w: 1.5, freq: 440 };

    function txt(g, s, x, y, o) { K.label(g, s, x, y, o); }
    function fit(g, x0, y0, x1, y1, maxK) {
      var w = x1 - x0, h = y1 - y0, k = Math.min(VW * 0.94 / w, VH * 0.9 / h, maxK || 9);
      g.save(); g.translate((VW - w * k) / 2 - x0 * k, (VH - h * k) / 2 - y0 * k + 8); g.scale(k, k);
    }
    function unlocal(g) { g.restore(); }

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
      g.fillStyle = C.card; K.rr(g, x + 0.5, y + 0.5, w, h, 8); g.fill();
      g.strokeStyle = C.line2; g.lineWidth = 1; g.stroke();
      g.restore();
    }
    function line(g, pts, col, w, dash) {
      g.save();
      g.strokeStyle = col; g.lineWidth = w; g.lineCap = 'round'; g.lineJoin = 'round';
      if (dash) g.setLineDash(dash);
      g.beginPath();
      for (var i = 0; i < pts.length; i++) { if (i === 0) g.moveTo(pts[i][0], pts[i][1]); else g.lineTo(pts[i][0], pts[i][1]); }
      g.stroke();
      g.restore();
    }
    function bracket(g, xa, xb, y, up, label, col) {
      var d = up ? 6 : -6;
      g.save();
      g.strokeStyle = col || C.ink2; g.lineWidth = 1.4;
      g.beginPath(); g.moveTo(xa + 0.5, y + d); g.lineTo(xa + 0.5, y); g.lineTo(xb - 0.5, y); g.lineTo(xb - 0.5, y + d); g.stroke();
      g.restore();
      txt(g, label, (xa + xb) / 2, up ? y - 9 : y + 22, { size: 16, mono: true, weight: 600, color: col || C.ink, align: 'center' });
    }
    /* square wave: rising edges at xa - off + k*Pd, duty d; clipped to [xa, xb] */
    function wavePath(g, xa, xb, Pd, d, hiY, loY, off) {
      g.beginPath();
      if (d >= 0.995) { g.moveTo(xa, hiY); g.lineTo(xb, hiY); return; }
      if (d <= 0.005) { g.moveTo(xa, loY); g.lineTo(xb, loY); return; }
      var s = xa - mod(off, Pd) - Pd;
      g.moveTo(s, loY);
      for (; s < xb + Pd; s += Pd) {
        g.lineTo(s, loY); g.lineTo(s, hiY); g.lineTo(s + d * Pd, hiY); g.lineTo(s + d * Pd, loY); g.lineTo(s + Pd, loY);
      }
    }
    function drawWave(g, xa, xb, Pd, d, hiY, loY, off, col, w, alpha, xclip) {
      g.save();
      g.beginPath(); g.rect(xa, Math.min(hiY, loY) - 6, (xclip === undefined ? xb : xclip) - xa, Math.abs(loY - hiY) + 12); g.clip();
      g.globalAlpha *= alpha;
      g.strokeStyle = col; g.lineWidth = w; g.lineJoin = 'miter';
      wavePath(g, xa, xb, Pd, d, hiY, loY, off);
      g.stroke();
      g.restore();
    }
    function hiAt(x, xa, Pd, d) { return mod(x - xa, Pd) / Pd < d; }

    /* ---------- darbe ---------- */
    function drawDarbe(g, T, d) {
      var XA = 130, Pd = 190, NP = 4, XB = XA + NP * Pd, HI = 140, LO = 250;
      fit(g, 40, 50, 1010, 312, 1.5);
      txt(g, '3,3 V', XA - 12, HI + 6, { size: 17, mono: true, weight: 600, color: C.ink2, align: 'right' });
      txt(g, '0 V', XA - 12, LO + 6, { size: 17, mono: true, weight: 600, color: C.ink2, align: 'right' });
      g.strokeStyle = C.line; g.lineWidth = 1;
      [HI, LO].forEach(function (y) { g.beginPath(); g.moveTo(XA, y + 0.5); g.lineTo(XB, y + 0.5); g.stroke(); });
      for (var k = 0; k <= NP; k++) {
        g.beginPath(); g.moveTo(XA + k * Pd + 0.5, HI - 14); g.lineTo(XA + k * Pd + 0.5, LO + 14); g.stroke();
      }
      g.save();
      g.globalAlpha = 0.5; g.fillStyle = C.blueSoft;
      for (k = 0; k < NP; k++) if (d > 0.005) g.fillRect(XA + k * Pd, HI, d * Pd, LO - HI);
      g.restore();
      var cx = XA + mod(T, 4) / 4 * (NP * Pd);
      drawWave(g, XA, XB, Pd, d, HI, LO, 0, C.blue, 3.4, 0.3);
      drawWave(g, XA, XB, Pd, d, HI, LO, 0, C.blue, 4, 1, cx);
      var on = hiAt(cx, XA, Pd, d);
      var cy = on ? HI : LO;
      g.strokeStyle = C.copText; g.lineWidth = 1.8;
      g.beginPath(); g.moveTo(cx + 0.5, HI - 14); g.lineTo(cx + 0.5, LO + 14); g.stroke();
      g.fillStyle = C.copText; g.beginPath(); g.arc(cx, cy, 7, 0, 6.2832); g.fill();
      var x1 = XA + Pd, x2 = XA + 2 * Pd;
      bracket(g, x1, x2, 116, true, 'T = 1 ms (periyot)', C.ink);
      if (d > 0.04) bracket(g, x1, x1 + d * Pd, LO + 26, false, 'açık süre ' + trim(d, 2) + ' ms', C.blue);
      var ay = LO - d * (LO - HI);
      g.save();
      g.strokeStyle = C.copText; g.lineWidth = 2.6; g.setLineDash([8, 6]);
      g.beginPath(); g.moveTo(XA, ay + 0.5); g.lineTo(XB + 8, ay + 0.5); g.stroke();
      g.restore();
      txt(g, 'ortalama', XB + 16, ay - 2, { size: 17, weight: 700, color: C.copText });
      txt(g, dec(d * VHI, 2) + ' V', XB + 16, ay + 20, { size: 20, mono: true, weight: 700, color: C.copText });
      txt(g, 'görev oranı %' + pct(d), XA, 74, { size: 28, weight: 700, color: C.ink });
      unlocal(g);
    }

    /* ---------- led ---------- */
    var HN = 440, HS = 110, HP = 44, hist = { hi: [], f: [], acc: 0, ph: 0 };
    function histInit(d) {
      hist.hi = []; hist.f = []; hist.acc = 0; hist.ph = 0;
      var f = d, i;
      for (i = 0; i < HN + 200; i++) {
        hist.ph++;
        var h = (mod(hist.ph, HP) / HP) < d ? 1 : 0;
        f += (h - f) / 140;
        if (i >= 200) { hist.hi.push(h); hist.f.push(f); }
      }
      hist.f = hist.f.map(function () { return d; });
    }
    function histStep(dt, d) {
      hist.acc += HS * dt;
      var n = Math.floor(hist.acc);
      hist.acc -= n;
      if (n > 60) n = 60;
      var f = hist.f[hist.f.length - 1];
      for (var i = 0; i < n; i++) {
        hist.ph++;
        var h = (mod(hist.ph, HP) / HP) < d ? 1 : 0;
        f += (h - f) / 140;
        hist.hi.push(h); hist.f.push(f);
        hist.hi.shift(); hist.f.shift();
      }
    }
    function drawGnd(g, x, y, col) {
      g.save(); g.strokeStyle = col; g.lineWidth = 2; g.lineCap = 'round';
      g.beginPath(); g.moveTo(x - 14, y); g.lineTo(x + 14, y); g.moveTo(x - 9, y + 6); g.lineTo(x + 9, y + 6); g.moveTo(x - 4, y + 12); g.lineTo(x + 4, y + 12); g.stroke();
      g.restore();
    }
    function drawLed(g, T, d) {
      fit(g, 20, 58, 830, 345, 1.4);
      var f = hist.f[hist.f.length - 1], hiNow = hist.hi[hist.hi.length - 1] === 1;
      var wc = hiNow ? C.cop : C.line2, ww = hiNow ? 3.2 : 2.2;
      // schematic
      g.fillStyle = hiNow ? C.blue : C.grey; g.beginPath(); g.arc(36, 130, 6, 0, 6.2832); g.fill();
      txt(g, hiNow ? 'pin 3,3 V' : 'pin 0 V', 22, 158, { size: 16, mono: true, weight: 600, color: hiNow ? C.blue : C.grey });
      line(g, [[42, 130], [90, 130]], wc, ww);
      g.save(); g.fillStyle = C.card; g.strokeStyle = C.ink2; g.lineWidth = 1.8;
      K.rr(g, 90.5, 118.5, 70, 24, 3); g.fill(); g.stroke(); g.restore();
      txt(g, '330 Ω', 125, 112, { size: 16, mono: true, weight: 600, color: C.ink, align: 'center' });
      line(g, [[160, 130], [204, 130]], wc, ww);
      g.save();
      g.fillStyle = f > 0.04 ? C.lamp : C.card; g.globalAlpha = 1;
      g.strokeStyle = C.ink2; g.lineWidth = 1.8; g.lineJoin = 'round';
      g.beginPath(); g.moveTo(204, 114); g.lineTo(204, 146); g.lineTo(240, 130); g.closePath();
      g.fillStyle = C.card; g.fill(); g.globalAlpha = f; g.fillStyle = C.lamp; g.fill(); g.globalAlpha = 1; g.stroke();
      g.beginPath(); g.moveTo(242, 112); g.lineTo(242, 148); g.stroke();
      g.restore();
      txt(g, 'LED', 224, 164, { size: 16, weight: 600, color: C.ink2, align: 'center' });
      line(g, [[242, 130], [290, 130], [290, 190]], wc, ww);
      drawGnd(g, 290, 190, C.ink2);
      // lamp as the eye sees it
      var lx = 90, ly = 316, lr = 24;
      g.save();
      for (var i = 0; i < 10; i++) {
        var a = i / 10 * 6.2832;
        g.globalAlpha = f * 0.9;
        g.strokeStyle = C.lamp; g.lineWidth = 2.4; g.lineCap = 'round';
        g.beginPath(); g.moveTo(lx + Math.cos(a) * (lr + 6), ly + Math.sin(a) * (lr + 6)); g.lineTo(lx + Math.cos(a) * (lr + 6 + 9 * f), ly + Math.sin(a) * (lr + 6 + 9 * f)); g.stroke();
      }
      g.restore();
      g.save(); g.fillStyle = C.card; g.strokeStyle = C.ink2; g.lineWidth = 1.8;
      g.beginPath(); g.arc(lx, ly, lr, 0, 6.2832); g.fill();
      g.globalAlpha = f; g.fillStyle = C.lamp; g.fill(); g.globalAlpha = 1; g.stroke(); g.restore();
      txt(g, 'göz: parlaklık %' + pct(f), 140, ly + 6, { size: 18, mono: true, weight: 700, color: C.ink });

      // traces
      var XL = 380, XR = XL + HN;
      var rows = [
        { y0: 90, label: 'pin: 3,3 V ve 0 V (1.000 kez/s)', hi: '3,3 V', lo: '0 V' },
        { y0: 206, label: 'göz ortalamayı görür (yavaş süzgeç)', hi: '%100', lo: '%0' }
      ];
      var RH = 42;
      rows.forEach(function (r, ri) {
        txt(g, r.label, XL, r.y0 - 10, { size: 17, weight: 700, color: ri === 1 ? C.copText : C.ink });
        g.strokeStyle = C.line; g.lineWidth = 1;
        g.beginPath(); g.moveTo(XL, r.y0 + 0.5); g.lineTo(XR, r.y0 + 0.5); g.moveTo(XL, r.y0 + RH + 0.5); g.lineTo(XR, r.y0 + RH + 0.5); g.stroke();
      });
      function steps(y0, arr, col, w) {
        var pts = [], i2, prev = -1;
        for (i2 = 0; i2 < arr.length; i2++) {
          var y = arr[i2] ? y0 : y0 + RH;
          if (prev >= 0 && prev !== y) pts.push([XL + i2, prev]);
          pts.push([XL + i2, y]); prev = y;
        }
        line(g, pts, col, w);
      }
      steps(rows[0].y0, hist.hi, C.blue, 2.6);
      var y3 = rows[1].y0, pts3 = [], j;
      for (j = 0; j < hist.f.length; j++) pts3.push([XL + j, y3 + RH - hist.f[j] * RH]);
      g.save(); g.globalAlpha = 0.55; g.fillStyle = C.copSoft;
      g.beginPath(); g.moveTo(XL, y3 + RH);
      for (j = 0; j < pts3.length; j++) g.lineTo(pts3[j][0], pts3[j][1]);
      g.lineTo(XR, y3 + RH); g.closePath(); g.fill(); g.restore();
      line(g, pts3, C.copText, 3);
      txt(g, 'zaman →', XR, y3 + RH + 26, { size: 14, mono: true, color: C.muted, align: 'right' });
      unlocal(g);
    }

    /* ---------- motor ---------- */
    function polyPos(path, s) {
      var i, acc = 0;
      for (i = 0; i < path.length - 1; i++) {
        var l = Math.hypot(path[i + 1][0] - path[i][0], path[i + 1][1] - path[i][1]);
        if (s <= acc + l) { var u = (s - acc) / l; return [lerp(path[i][0], path[i + 1][0], u), lerp(path[i][1], path[i + 1][1], u)]; }
        acc += l;
      }
      return path[path.length - 1];
    }
    function polyLen(path) { var s = 0; for (var i = 0; i < path.length - 1; i++) s += Math.hypot(path[i + 1][0] - path[i][0], path[i + 1][1] - path[i][1]); return s; }
    function dots(g, path, T, col, alpha, speed, gap) {
      var L = polyLen(path), n = Math.floor(L / gap), off = mod(T * speed, gap);
      g.save(); g.fillStyle = col; g.globalAlpha = alpha;
      for (var i = 0; i < n; i++) { var p = polyPos(path, mod(off + i * gap, L)); g.beginPath(); g.arc(p[0], p[1], 3.4, 0, 6.2832); g.fill(); }
      g.restore();
    }
    function drawMotor(g, T, d, dt) {
      fit(g, 14, 58, 790, 322, 1.5);
      var PM = 1.4;
      var ph = mod(T, PM) / PM;
      var hi = ph < d && d > 0.005 || d >= 0.995;
      if (prevHi && !hi) lastFall = T;
      if (T < lastFall) lastFall = -9;
      prevHi = hi;
      speedF += (d - speedF) * (1 - Math.exp(-dt / 0.7));
      rot += speedF * dt * 9;
      var sinceFall = T - lastFall;
      var wc = hi ? C.cop : C.line2, ww = hi ? 3.6 : 2.4;
      // ground rail (common GND) highlighted
      line(g, [[72, 250], [72, 290], [560, 290]], C.copText, 4.5);
      line(g, [[330, 235], [330, 290]], C.copText, 4.5);
      txt(g, 'ortak GND şart', 100, 278, { size: 18, weight: 700, color: C.copText });
      // motor supply wiring
      line(g, [[560, 150], [560, 70], [330, 70], [330, 88]], wc, ww);
      line(g, [[330, 136], [330, 165]], wc, ww);
      line(g, [[330, 165], [330, 235]], wc, ww);
      line(g, [[560, 210], [560, 290]], wc, ww);
      // flyback diode branch
      var dcol = (!hi && sinceFall < 0.45) ? C.copText : C.line2;
      var dw = (!hi && sinceFall < 0.45) ? 3.4 : 2.2;
      line(g, [[330, 150], [420, 150], [420, 130]], dcol, dw);
      line(g, [[420, 100], [420, 70]], dcol, dw);
      g.save(); g.strokeStyle = C.ink2; g.fillStyle = C.card; g.lineWidth = 1.8; g.lineJoin = 'round';
      g.beginPath(); g.moveTo(410, 130); g.lineTo(430, 130); g.lineTo(420, 108); g.closePath(); g.fill(); g.stroke();
      g.beginPath(); g.moveTo(409, 105); g.lineTo(431, 105); g.stroke(); g.restore();
      // battery
      g.save(); g.strokeStyle = C.ink; g.lineWidth = 2.4;
      g.beginPath(); g.moveTo(546, 170); g.lineTo(574, 170); g.stroke();
      g.lineWidth = 4.4; g.beginPath(); g.moveTo(552, 188); g.lineTo(568, 188); g.stroke();
      g.restore();
      txt(g, '+', 584, 176, { size: 15, mono: true, weight: 600, color: C.ink2 });
      txt(g, '−', 584, 198, { size: 15, mono: true, weight: 600, color: C.ink2 });
      txt(g, 'motorun kendi pili', 596, 150, { size: 18, weight: 700, color: C.ink });
      // MOSFET symbol
      var tc = hi ? C.blue : C.grey;
      g.save(); g.strokeStyle = C.ink2; g.lineWidth = 2.2;
      g.beginPath(); g.moveTo(294, 180); g.lineTo(294, 222); g.stroke();
      g.strokeStyle = tc; g.lineWidth = hi ? 3.4 : 2.4;
      g.beginPath(); g.moveTo(304, 165); g.lineTo(304, 180); g.moveTo(304, 190); g.lineTo(304, 210); g.moveTo(304, 220); g.lineTo(304, 235); g.stroke();
      g.strokeStyle = C.ink2; g.lineWidth = 2.2;
      g.beginPath(); g.moveTo(304, 165); g.lineTo(330, 165); g.moveTo(304, 235); g.lineTo(330, 235); g.moveTo(304, 200); g.lineTo(316, 200); g.stroke();
      g.restore();
      txt(g, 'transistör (MOSFET)', 344, 266, { size: 18, weight: 700, color: C.ink });
      // ESP32 box
      g.save(); g.fillStyle = C.card; g.strokeStyle = C.ink2; g.lineWidth = 1.8;
      K.rr(g, 24.5, 126.5, 96, 124, 6); g.fill(); g.stroke(); g.restore();
      txt(g, 'ESP32', 72, 164, { size: 18, weight: 700, color: C.ink, align: 'center' });
      txt(g, hi ? '3,3 V' : '0 V', 72, 220, { size: 18, mono: true, weight: 600, color: hi ? C.blue : C.grey, align: 'center' });
      g.fillStyle = hi ? C.blue : C.grey; g.beginPath(); g.arc(120, 200, 5, 0, 6.2832); g.fill();
      // gate wire
      line(g, [[120, 200], [294, 200]], hi ? C.blue : C.line2, hi ? 2.4 : 1.8);
      // gate mini wave
      // current dots
      if (hi) dots(g, [[560, 150], [560, 70], [330, 70], [330, 290], [560, 290], [560, 210]], T, C.copText, 1, 120, 30);
      if (!hi && sinceFall >= 0 && sinceFall < 0.45) dots(g, [[330, 150], [420, 150], [420, 70], [330, 70], [330, 88]], T, C.copText, 1 - sinceFall / 0.45, 140, 26);
      // motor
      var mx = 330, my = 112, mr = 24;
      g.save(); g.fillStyle = C.card; g.strokeStyle = C.ink; g.lineWidth = 2.2;
      g.beginPath(); g.arc(mx, my, mr, 0, 6.2832); g.fill(); g.stroke();
      g.strokeStyle = C.cop; g.lineWidth = 3.4; g.lineCap = 'round';
      for (var i = 0; i < 3; i++) {
        var a = rot + i * 2.0944;
        g.beginPath(); g.moveTo(mx, my); g.lineTo(mx + Math.cos(a) * (mr - 6), my + Math.sin(a) * (mr - 6)); g.stroke();
      }
      g.restore();
      txt(g, 'motor · hız %' + pct(speedF), 294, 118, { size: 18, weight: 700, color: C.ink, align: 'right' });
      unlocal(g);
    }

    /* ---------- servo ---------- */
    function drawServo(g, T, w) {
      var XA = 60, Pd = 280, NP = 2, XB = XA + NP * Pd, HI = 150, LO = 230, d = w / 20;
      txt(g, '3,3 V', XA - 10, HI + 6, { size: 17, mono: true, weight: 600, color: C.ink2, align: 'right' });
      txt(g, '0 V', XA - 10, LO + 6, { size: 17, mono: true, weight: 600, color: C.ink2, align: 'right' });
      g.strokeStyle = C.line; g.lineWidth = 1;
      [HI, LO].forEach(function (y) { g.beginPath(); g.moveTo(XA, y + 0.5); g.lineTo(XB, y + 0.5); g.stroke(); });
      for (var k = 0; k <= NP; k++) { g.beginPath(); g.moveTo(XA + k * Pd + 0.5, HI - 14); g.lineTo(XA + k * Pd + 0.5, LO + 14); g.stroke(); }
      var cx = XA + mod(T, 4) / 4 * (NP * Pd);
      drawWave(g, XA, XB, Pd, d, HI, LO, 0, C.blue, 3.4, 0.3);
      drawWave(g, XA, XB, Pd, d, HI, LO, 0, C.blue, 4, 1, cx);
      var on = hiAt(cx, XA, Pd, d);
      g.strokeStyle = C.copText; g.lineWidth = 1.8;
      g.beginPath(); g.moveTo(cx + 0.5, HI - 14); g.lineTo(cx + 0.5, LO + 14); g.stroke();
      g.fillStyle = C.copText; g.beginPath(); g.arc(cx, on ? HI : LO, 7, 0, 6.2832); g.fill();
      bracket(g, XA, XA + Pd, 124, true, 'T = 20 ms (saniyede 50 kez)', C.ink);
      bracket(g, XA + Pd, XA + Pd + d * Pd, LO + 26, false, 'darbe ' + trim(w, 2) + ' ms', C.blue);
      // servo kadranı
      var ang = clamp((w - 1) / 1, 0, 1) * 180;
      var cxD = 850, cyD = 330, R = 170;
      g.save(); g.strokeStyle = C.line2; g.lineWidth = 2.4;
      g.beginPath(); g.arc(cxD, cyD, R, Math.PI, 0); g.stroke();
      for (var t = 0; t <= 4; t++) {
        var ta = t * 45 * Math.PI / 180;
        g.beginPath(); g.moveTo(cxD - Math.cos(ta) * (R - 12), cyD - Math.sin(ta) * (R - 12)); g.lineTo(cxD - Math.cos(ta) * (R + 6), cyD - Math.sin(ta) * (R + 6)); g.stroke();
      }
      g.restore();
      var ar = ang * Math.PI / 180;
      g.save(); g.globalAlpha = 0.4; g.fillStyle = C.copSoft;
      g.beginPath(); g.moveTo(cxD, cyD); g.arc(cxD, cyD, R - 20, Math.PI, Math.PI + ar); g.closePath(); g.fill(); g.restore();
      txt(g, '0°', cxD - R - 14, cyD + 6, { size: 17, mono: true, color: C.muted, align: 'right' });
      txt(g, '180°', cxD + R + 14, cyD + 6, { size: 17, mono: true, color: C.muted });
      var ax = cxD - Math.cos(ar) * (R - 14), ay = cyD - Math.sin(ar) * (R - 14);
      g.save(); g.strokeStyle = C.copText; g.lineWidth = 12; g.lineCap = 'round';
      g.beginPath(); g.moveTo(cxD, cyD); g.lineTo(ax, ay); g.stroke();
      g.fillStyle = C.white; g.beginPath(); g.arc(ax, ay, 4, 0, 6.2832); g.fill(); g.restore();
      g.save(); g.shadowColor = 'rgba(21,23,28,.25)'; g.shadowBlur = 12; g.shadowOffsetY = 4;
      g.fillStyle = C.ink; K.rr(g, cxD - 84, cyD - 8, 168, 70, 8); g.fill(); g.restore();
      g.fillStyle = C.cop; g.beginPath(); g.arc(cxD, cyD, 12, 0, 6.2832); g.fill();
      txt(g, Math.round(ang) + '°', cxD, cyD + 46, { size: 30, weight: 700, color: C.white, align: 'center' });
    }

    /* ---------- ton ---------- */
    function drawTon(g, T, d) {
      fit(g, 100, 62, 1030, 318, 1.25);
      var XA = 160, XB = 760, SP = 100;
      var sel = freqSel || (mod(T, 8) < 4 ? 440 : 880);
      cur.freq = sel;
      var rows = [{ f: 440, P: 150, y0: 96, t: 'T = 2,27 ms' }, { f: 880, P: 75, y0: 196, t: 'T = 1,14 ms' }];
      rows.forEach(function (r) {
        var act = r.f === sel, HI = r.y0, LO = r.y0 + 46;
        txt(g, r.f + ' Hz · ' + r.t, XA, r.y0 - 14, { size: 18, weight: 700, color: act ? C.ink : C.muted });
        g.strokeStyle = C.line; g.lineWidth = 1;
        [HI, LO].forEach(function (y) { g.beginPath(); g.moveTo(XA, y + 0.5); g.lineTo(XB, y + 0.5); g.stroke(); });
        drawWave(g, XA, XB, r.P, d, HI, LO, T * SP, act ? C.blue : C.grey, act ? 3.2 : 2.2, act ? 1 : 0.45);
      });
      // buzzer and sound waves
      var bx = 880, by = 150;
      var sp = sel === 440 ? 26 : 13;
      g.save();
      g.strokeStyle = C.blue; g.lineWidth = 2.2; g.lineCap = 'round';
      var off = mod(T * 70, sp);
      for (var r = 34 + off; r < 130; r += sp) {
        g.globalAlpha = clamp(1 - (r - 34) / 100, 0.05, 1);
        g.beginPath(); g.arc(bx, by, r, -0.7, 0.7); g.stroke();
      }
      g.restore();
      g.save(); g.fillStyle = C.card; g.strokeStyle = C.ink; g.lineWidth = 2.2;
      g.beginPath(); g.arc(bx, by, 32, 0, 6.2832); g.fill(); g.stroke();
      g.fillStyle = C.ink; g.beginPath(); g.arc(bx, by, 7, 0, 6.2832); g.fill(); g.restore();
      txt(g, 'buzzer', bx, by + 58, { size: 18, weight: 700, color: C.ink2, align: 'center' });
      txt(g, sel === 440 ? 'pes ses' : 'tiz ses', bx + 10, 252, { size: 28, weight: 700, color: C.ink, align: 'center' });
      txt(g, sel === 440 ? 'la notası' : 'bir oktav yukarı', bx + 10, 280, { size: 17, color: C.ink2, align: 'center' });
      unlocal(g);
    }

    function numbersFor() {
      var d = cur.duty, w = cur.w;
      if (view === 'darbe') return 'görev oranı %' + pct(d) + ' → ortalama ' + trim(d, 2) + ' × 3,3 V = ' + dec(d * VHI, 2) + ' V';
      if (view === 'led') return 'görev oranı %' + pct(d) + ' → ortalama akım ' + trim(d, 2) + ' × ' + dec(ILED, 1) + ' mA ≈ ' + dec(d * ILED, 1) + ' mA';
      if (view === 'motor') return 'görev oranı %' + pct(d) + ' → motorun gördüğü ortalama ' + trim(d, 2) + ' × ' + VMOTOR + ' V = ' + dec(d * VMOTOR, 1) + ' V';
      if (view === 'servo') return 'darbe ' + trim(w, 2) + ' ms → açı = (' + trim(w, 2) + ' − 1) ÷ 1 × 180° = ' + Math.round((w - 1) * 180) + '°';
      return cur.freq + ' Hz → T = 1 ÷ ' + cur.freq + ' ≈ ' + (cur.freq === 440 ? '2,27' : '1,14') + ' ms · görev oranı %' + pct(d);
    }

    var lastFrameT = 0;
    function frame(t, dt) {
      var g = sf.ctx, T, d;
      lastT = t;
      if (K.reducedMotion) {
        if (auto) view = 'darbe';
        T = 3; dt = 0;
      } else if (auto) {
        var n = Math.floor(t / DEMO);
        view = VIEWS[n % VIEWS.length];
        viewT0 = n * DEMO;
        T = t - viewT0;
      } else {
        T = t - viewT0;
      }
      if (auto || K.reducedMotion) {
        if (view === 'servo') {
          var seq = [1.5, 1, 1.5, 2], q = Math.floor(T / 2), prev = seq[mod(q - 1, 4)], nxt = seq[q % 4];
          cur.w = lerp(prev, nxt, ss(0, 0.6, T - q * 2));
          d = cur.w - 1;
        } else if (view === 'ton') d = 0.5;
        else d = Math.round((0.5 + 0.4 * Math.sin(T * Math.PI / 4)) * 20) / 20;
        if (K.reducedMotion) { d = 0.5; cur.w = 1.5; }
      } else {
        d = dutyMan;
      }
      if (view === 'servo' && !(auto || K.reducedMotion)) cur.w = 1 + d;
      if (view !== 'servo' && !(auto || K.reducedMotion)) cur.w = 1 + d;
      cur.duty = d; cur.T = T; lastDuty = d;
      if (view !== 'ton') cur.freq = 440;
      if (view !== histView) {
        histView = view;
        histInit(d);
        speedF = d; lastFall = -9; prevHi = false;
      }
      if (view === 'led') histStep(Math.min(dt, 0.1), d);
      sf.clear();
      var gsc = Math.min(sf.w / VW, sf.h / VH);
      g.save(); g.translate((sf.w - VW * gsc) / 2, (sf.h - VH * gsc) / 2); g.scale(gsc, gsc);
      txt(g, TITLE[view], 6, 22, { size: 18, weight: 700, color: C.ink });
      tag(g, 'yavaşlatılmış', VW - 6, 22);
      g.save();
      g.globalAlpha = ss(0, 0.3, T + 0.0001 + (K.reducedMotion ? 1 : 0));
      if (view === 'darbe') drawDarbe(g, T, d);
      else if (view === 'led') drawLed(g, T, d);
      else if (view === 'motor') drawMotor(g, T, d, Math.min(dt, 0.1));
      else if (view === 'servo') drawServo(g, T, cur.w);
      else drawTon(g, T, d);
      g.restore();
      g.restore();
      lastFrameT = t;
    }

    return {
      reset: function () { resetState(); },
      frame: frame,
      set: function (key, val) {
        if (key === 'view' && VIEWS.indexOf(val) >= 0) {
          if (auto) dutyMan = lastDuty;
          view = val; auto = false; viewT0 = lastT;
        } else if (key === 'duty') {
          var v = +val;
          if (!isFinite(v)) return;
          if (v > 1) v /= 100;
          dutyMan = clamp(Math.round(v * 100) / 100, 0, 1);
          if (auto) { auto = false; }
        } else if (key === 'freq') {
          var f = +val;
          if (f === 440 || f === 880) { freqSel = f; if (auto) { dutyMan = lastDuty; auto = false; view = 'ton'; viewT0 = lastT; } }
        }
      },
      read: function (key) {
        if (key === 'explain') return EXPLAIN[view];
        if (key === 'view') return view;
        if (key === 'duty') return trim(cur.duty, 2);
        if (key === 'numbers') return numbersFor();
        if (key === 'freq') return String(cur.freq);
        return '';
      },
      resize: function () { sf.resize(); },
      dispose: function () { sf.dispose(); }
    };
  });
})();
