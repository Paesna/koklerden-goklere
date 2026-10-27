/* Köklerden Göklere · Kart dışarıya nasıl komut verir? PWM
 * pwm-lab · 1120×380 · 2B
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
    darbe: 'Pin yalnızca 0 V ya da 3,3 V verir; ama saniyede 1.000 kez değişince ortalama, açık kalma oranına (görev oranı) bağlı olur.',
    led: 'Göz saniyede 1.000 kez yanıp sönmeyi ayırt edemez, ortalamayı görür. LED her an ya tam yanıktır ya tam sönük.',
    motor: 'Pin motoru süremez (en çok 20 mA önerilir): yalnızca transistörü açıp kapatır; motor akımını kendi pili verir.',
    servo: 'Servo, 20 ms’de bir gelen darbenin genişliğine bakar. Açıyı görev oranı değil, darbe genişliği belirler.',
    ton: 'Perdeyi frekans belirler: 440 Hz pes, 880 Hz tiz ses verir. Görev oranını değiştirmek perdeyi değiştirmez.'
  };

  var DEMO = 8;
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
      txt(g, label, (xa + xb) / 2, up ? y - 9 : y + 20, { size: 14, mono: true, weight: 600, color: col || C.ink, align: 'center' });
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
      var XA = 132, Pd = 150, NP = 4, XB = XA + NP * Pd, HI = 128, LO = 228;
      txt(g, '3,3 V', 118, HI + 5, { size: 14, mono: true, weight: 600, color: C.ink2, align: 'right' });
      txt(g, '0 V', 118, LO + 5, { size: 14, mono: true, weight: 600, color: C.ink2, align: 'right' });
      g.strokeStyle = C.line; g.lineWidth = 1;
      [HI, LO].forEach(function (y) { g.beginPath(); g.moveTo(XA, y + 0.5); g.lineTo(XB, y + 0.5); g.stroke(); });
      // periods grid
      for (var k = 0; k <= NP; k++) {
        g.beginPath(); g.moveTo(XA + k * Pd + 0.5, HI - 14); g.lineTo(XA + k * Pd + 0.5, LO + 14); g.stroke();
      }
      // area under pulses
      g.save();
      g.globalAlpha = 0.5; g.fillStyle = C.blueSoft;
      for (k = 0; k < NP; k++) if (d > 0.005) g.fillRect(XA + k * Pd, HI, d * Pd, LO - HI);
      g.restore();
      // wave (dim all, bright to cursor)
      var cx = XA + mod(T, 4) / 4 * (NP * Pd);
      drawWave(g, XA, XB, Pd, d, HI, LO, 0, C.blue, 3, 0.3);
      drawWave(g, XA, XB, Pd, d, HI, LO, 0, C.blue, 3.4, 1, cx);
      var on = hiAt(cx, XA, Pd, d);
      var cy = on ? HI : LO;
      g.strokeStyle = C.copText; g.lineWidth = 1.6;
      g.beginPath(); g.moveTo(cx + 0.5, HI - 14); g.lineTo(cx + 0.5, LO + 14); g.stroke();
      g.fillStyle = C.copText; g.beginPath(); g.arc(cx, cy, 5.5, 0, 6.2832); g.fill();
      txt(g, 'pin şu an: ' + (on ? '3,3 V (1)' : '0 V (0)'), 24, 66, { size: 15, mono: true, weight: 600, color: on ? C.blue : C.grey });
      // T and ON brackets on the second period
      var x1 = XA + Pd, x2 = XA + 2 * Pd;
      bracket(g, x1, x2, 104, true, 'T = 1 ms (periyot)', C.ink);
      if (d > 0.04) bracket(g, x1, x1 + d * Pd, LO + 24, false, 'açık süre = ' + trim(d, 2) + ' ms', C.blue);
      txt(g, 'f = 1 ÷ T = 1 ÷ 0,001 s = 1.000 Hz', XB, 66, { size: 14, mono: true, weight: 500, color: C.ink2, align: 'right' });
      // average line
      var ay = LO - d * (LO - HI);
      g.save();
      g.strokeStyle = C.copText; g.lineWidth = 2.2; g.setLineDash([7, 5]);
      g.beginPath(); g.moveTo(XA, ay + 0.5); g.lineTo(XB + 6, ay + 0.5); g.stroke();
      g.restore();
      txt(g, 'ortalama', XB + 12, ay - 1, { size: 14, weight: 600, color: C.copText });
      txt(g, dec(d * VHI, 2) + ' V', XB + 12, ay + 16, { size: 14, mono: true, weight: 600, color: C.copText });
      // right card
      card(g, 840, 52, 256, 246);
      txt(g, 'GÖREV ORANI', 860, 82, { size: 13, mono: true, weight: 500, color: C.muted, spacing: 1 });
      txt(g, '%' + pct(d), 860, 142, { size: 58, weight: 600, color: C.ink });
      g.strokeStyle = C.line; g.beginPath(); g.moveTo(860, 162.5); g.lineTo(1076, 162.5); g.stroke();
      txt(g, 'açık süre ÷ periyot', 860, 188, { size: 14, color: C.ink2 });
      txt(g, trim(d, 2) + ' ms ÷ 1 ms = ' + trim(d, 2), 860, 210, { size: 15, mono: true, weight: 600, color: C.blue });
      txt(g, 'ortalama gerilim', 860, 242, { size: 14, color: C.ink2 });
      txt(g, trim(d, 2) + ' × 3,3 V = ' + dec(d * VHI, 2) + ' V', 860, 266, { size: 16, mono: true, weight: 600, color: C.copText });
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
      var f = hist.f[hist.f.length - 1], hiNow = hist.hi[hist.hi.length - 1] === 1;
      var wc = hiNow ? C.cop : C.line2, ww = hiNow ? 3.2 : 2.2;
      // schematic
      txt(g, 'pin', 36, 100, { size: 14, weight: 600, color: C.ink2, align: 'center' });
      g.fillStyle = hiNow ? C.blue : C.grey; g.beginPath(); g.arc(36, 130, 6, 0, 6.2832); g.fill();
      txt(g, hiNow ? '3,3 V' : '0 V', 36, 156, { size: 13, mono: true, weight: 600, color: hiNow ? C.blue : C.grey, align: 'center' });
      line(g, [[42, 130], [90, 130]], wc, ww);
      g.save(); g.fillStyle = C.card; g.strokeStyle = C.ink2; g.lineWidth = 1.8;
      K.rr(g, 90.5, 118.5, 70, 24, 3); g.fill(); g.stroke(); g.restore();
      txt(g, '330 Ω', 125, 112, { size: 14, mono: true, weight: 600, color: C.ink, align: 'center' });
      txt(g, 'direnç', 125, 160, { size: 13, color: C.muted, align: 'center' });
      line(g, [[160, 130], [204, 130]], wc, ww);
      g.save();
      g.fillStyle = f > 0.04 ? C.lamp : C.card; g.globalAlpha = 1;
      g.strokeStyle = C.ink2; g.lineWidth = 1.8; g.lineJoin = 'round';
      g.beginPath(); g.moveTo(204, 114); g.lineTo(204, 146); g.lineTo(240, 130); g.closePath();
      g.fillStyle = C.card; g.fill(); g.globalAlpha = f; g.fillStyle = C.lamp; g.fill(); g.globalAlpha = 1; g.stroke();
      g.beginPath(); g.moveTo(242, 112); g.lineTo(242, 148); g.stroke();
      g.restore();
      txt(g, 'LED', 224, 160, { size: 13, color: C.muted, align: 'center' });
      line(g, [[242, 130], [290, 130], [290, 190]], wc, ww);
      drawGnd(g, 290, 190, C.ink2);
      txt(g, 'GND', 290, 222, { size: 13, mono: true, color: C.muted, align: 'center' });
      txt(g, 'açıkken: (3,3 V − 2,0 V) ÷ 330 Ω ≈ ' + dec(ILED, 1) + ' mA', 24, 248, { size: 14, color: C.ink2 });
      txt(g, 'pin için güvenli (en çok 20 mA)', 24, 268, { size: 14, color: C.muted });
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
      txt(g, 'gözün gördüğü', 140, ly - 4, { size: 14, color: C.ink2 });
      txt(g, 'parlaklık %' + pct(f), 140, ly + 17, { size: 15, mono: true, weight: 600, color: C.ink });

      // traces
      var XL = 380, XR = XL + HN;
      var rows = [
        { y0: 74, label: 'pin: 3,3 V ve 0 V (1.000 kez/s)', hi: '3,3 V', lo: '0 V' },
        { y0: 156, label: 'LED akımı: ' + dec(ILED, 1) + ' mA ve 0', hi: dec(ILED, 1) + ' mA', lo: '0' },
        { y0: 238, label: 'göz ortalamayı görür (yavaş süzgeç)', hi: '%100', lo: '%0' }
      ];
      var RH = 42;
      rows.forEach(function (r, ri) {
        txt(g, r.label, XL, r.y0 - 8, { size: 14, weight: 600, color: ri === 2 ? C.copText : C.ink2 });
        txt(g, r.hi, XL - 8, r.y0 + 5, { size: 13, mono: true, color: C.muted, align: 'right' });
        txt(g, r.lo, XL - 8, r.y0 + RH + 5, { size: 13, mono: true, color: C.muted, align: 'right' });
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
      steps(rows[1].y0, hist.hi, C.cop, 2.6);
      var y3 = rows[2].y0, pts3 = [], j;
      for (j = 0; j < hist.f.length; j++) pts3.push([XL + j, y3 + RH - hist.f[j] * RH]);
      g.save(); g.globalAlpha = 0.55; g.fillStyle = C.copSoft;
      g.beginPath(); g.moveTo(XL, y3 + RH);
      for (j = 0; j < pts3.length; j++) g.lineTo(pts3[j][0], pts3[j][1]);
      g.lineTo(XR, y3 + RH); g.closePath(); g.fill(); g.restore();
      line(g, pts3, C.copText, 3);
      txt(g, 'zaman →  (yavaşlatılmış)', XR, y3 + RH + 24, { size: 13, mono: true, color: C.muted, align: 'right' });
      // right card: brightness bar
      card(g, 880, 52, 216, 246);
      txt(g, 'PARLAKLIK', 900, 82, { size: 13, mono: true, weight: 500, color: C.muted, spacing: 1 });
      var bx = 904, by = 100, bw = 40, bh = 174;
      g.fillStyle = C.line; g.fillRect(bx, by, bw, bh);
      g.fillStyle = C.lamp; g.fillRect(bx, by + bh * (1 - f), bw, bh * f);
      g.strokeStyle = C.ink2; g.lineWidth = 1.5; g.strokeRect(bx + 0.5, by + 0.5, bw, bh);
      txt(g, '%' + pct(f), 1032, 186, { size: 44, weight: 600, color: C.ink, align: 'center' });
      txt(g, 'görev oranı %' + pct(d), 1032, 214, { size: 14, color: C.ink2, align: 'center' });
      txt(g, 'ara değerde yanmaz,', 1022, 246, { size: 13, color: C.muted, align: 'center' });
      txt(g, 'ya tam ya hiç', 1022, 264, { size: 13, color: C.muted, align: 'center' });
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
      txt(g, 'ortak GND şart', 100, 280, { size: 15, weight: 600, color: C.copText });
      txt(g, 'kartın GND’si ile pilin eksi ucu birleşir', 72, 314, { size: 14, color: C.ink2 });
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
      txt(g, 'diyot', 438, 124, { size: 14, weight: 600, color: C.ink2 });
      // battery
      g.save(); g.strokeStyle = C.ink; g.lineWidth = 2.4;
      g.beginPath(); g.moveTo(546, 170); g.lineTo(574, 170); g.stroke();
      g.lineWidth = 4.4; g.beginPath(); g.moveTo(552, 188); g.lineTo(568, 188); g.stroke();
      g.restore();
      txt(g, '+', 584, 176, { size: 15, mono: true, weight: 600, color: C.ink2 });
      txt(g, '−', 584, 198, { size: 15, mono: true, weight: 600, color: C.ink2 });
      txt(g, 'motorun kendi pili', 596, 140, { size: 14, color: C.ink2 });
      txt(g, '(ör. ' + VMOTOR + ' V)', 596, 158, { size: 14, mono: true, color: C.muted });
      // MOSFET symbol
      var tc = hi ? C.blue : C.grey;
      g.save(); g.strokeStyle = C.ink2; g.lineWidth = 2.2;
      g.beginPath(); g.moveTo(294, 180); g.lineTo(294, 222); g.stroke();
      g.strokeStyle = tc; g.lineWidth = hi ? 3.4 : 2.4;
      g.beginPath(); g.moveTo(304, 165); g.lineTo(304, 180); g.moveTo(304, 190); g.lineTo(304, 210); g.moveTo(304, 220); g.lineTo(304, 235); g.stroke();
      g.strokeStyle = C.ink2; g.lineWidth = 2.2;
      g.beginPath(); g.moveTo(304, 165); g.lineTo(330, 165); g.moveTo(304, 235); g.lineTo(330, 235); g.moveTo(304, 200); g.lineTo(316, 200); g.stroke();
      g.restore();
      txt(g, 'transistör (MOSFET)', 344, 266, { size: 14, weight: 600, color: C.ink2 });
      txt(g, 'drain', 338, 160, { size: 13, mono: true, color: C.muted });
      // ESP32 box
      g.save(); g.fillStyle = C.card; g.strokeStyle = C.ink2; g.lineWidth = 1.8;
      K.rr(g, 24.5, 126.5, 96, 124, 6); g.fill(); g.stroke(); g.restore();
      txt(g, 'ESP32', 72, 152, { size: 15, weight: 600, color: C.ink, align: 'center' });
      txt(g, 'GPIO pin', 72, 176, { size: 13, color: C.muted, align: 'center' });
      txt(g, hi ? '3,3 V' : '0 V', 72, 214, { size: 16, mono: true, weight: 600, color: hi ? C.blue : C.grey, align: 'center' });
      txt(g, 'GND', 72, 242, { size: 13, mono: true, color: C.muted, align: 'center' });
      g.fillStyle = hi ? C.blue : C.grey; g.beginPath(); g.arc(120, 200, 5, 0, 6.2832); g.fill();
      // gate wire
      line(g, [[120, 200], [294, 200]], hi ? C.blue : C.line2, hi ? 2.4 : 1.8);
      txt(g, 'kapıya küçük akım', 130, 192, { size: 13, color: C.blue });
      txt(g, 'pin: en çok', 130, 224, { size: 14, weight: 600, color: C.copText });
      txt(g, '20 mA önerilir', 130, 242, { size: 14, weight: 600, color: C.copText });
      // gate mini wave
      txt(g, 'pin darbeleri', 130, 138, { size: 13, color: C.muted });
      var gp = 52, goff = T * 40;
      drawWave(g, 134, 282, gp, d, 148, 170, goff, C.blue, 2.4, 1);
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
      txt(g, 'motor', 366, 108, { size: 14, weight: 600, color: C.ink2 });
      // right panel
      var RX = 740, TW = 350;
      txt(g, 'AKIM: PİN ve MOTOR', RX, 70, { size: 13, mono: true, weight: 500, color: C.muted, spacing: 1 });
      var sc = TW / 500;
      txt(g, 'pinin sınırı: 20 mA', RX, 96, { size: 14, color: C.ink2 });
      g.fillStyle = C.line; g.fillRect(RX, 104, TW, 12);
      g.fillStyle = C.copText; g.fillRect(RX, 104, 20 * sc, 12);
      txt(g, 'örnek küçük motor: yaklaşık 300 mA', RX, 144, { size: 14, color: C.ink2 });
      g.fillStyle = C.line; g.fillRect(RX, 152, TW, 12);
      g.fillStyle = C.cop; g.fillRect(RX, 152, 300 * sc, 12);
      txt(g, '0', RX, 184, { size: 13, mono: true, color: C.muted });
      txt(g, '500 mA', RX + TW, 184, { size: 13, mono: true, color: C.muted, align: 'right' });
      txt(g, 'DEVİR HIZI', RX, 220, { size: 13, mono: true, weight: 500, color: C.muted, spacing: 1 });
      txt(g, '%' + pct(speedF), RX + TW, 220, { size: 18, mono: true, weight: 600, color: C.ink, align: 'right' });
      g.fillStyle = C.line; g.fillRect(RX, 230, TW, 16);
      g.fillStyle = C.blue; g.fillRect(RX, 230, TW * speedF, 16);
      g.strokeStyle = C.ink2; g.lineWidth = 1.2; g.strokeRect(RX + 0.5, 230.5, TW, 16);
      txt(g, 'diyot: motor kapanırken oluşan', RX, 276, { size: 14, color: C.ink2 });
      txt(g, 'gerilim sıçramasını yutar', RX, 296, { size: 14, color: C.ink2 });
    }

    /* ---------- servo ---------- */
    function drawServo(g, T, w) {
      var XA = 132, Pd = 300, NP = 2, XB = XA + NP * Pd, HI = 118, LO = 176, d = w / 20;
      txt(g, '3,3 V', 118, HI + 5, { size: 14, mono: true, weight: 600, color: C.ink2, align: 'right' });
      txt(g, '0 V', 118, LO + 5, { size: 14, mono: true, weight: 600, color: C.ink2, align: 'right' });
      g.strokeStyle = C.line; g.lineWidth = 1;
      [HI, LO].forEach(function (y) { g.beginPath(); g.moveTo(XA, y + 0.5); g.lineTo(XB, y + 0.5); g.stroke(); });
      for (var k = 0; k <= NP; k++) { g.beginPath(); g.moveTo(XA + k * Pd + 0.5, HI - 12); g.lineTo(XA + k * Pd + 0.5, LO + 12); g.stroke(); }
      var cx = XA + mod(T, 4) / 4 * (NP * Pd);
      drawWave(g, XA, XB, Pd, d, HI, LO, 0, C.blue, 3, 0.3);
      drawWave(g, XA, XB, Pd, d, HI, LO, 0, C.blue, 3.6, 1, cx);
      var on = hiAt(cx, XA, Pd, d);
      g.strokeStyle = C.copText; g.lineWidth = 1.6;
      g.beginPath(); g.moveTo(cx + 0.5, HI - 12); g.lineTo(cx + 0.5, LO + 12); g.stroke();
      g.fillStyle = C.copText; g.beginPath(); g.arc(cx, on ? HI : LO, 5.5, 0, 6.2832); g.fill();
      txt(g, 'pin şu an: ' + (on ? '3,3 V (1)' : '0 V (0)'), 24, 66, { size: 15, mono: true, weight: 600, color: on ? C.blue : C.grey });
      bracket(g, XA, XA + Pd, 98, true, 'T = 20 ms  (50 Hz: saniyede 50 kez)', C.ink);
      bracket(g, XA + Pd, XA + Pd + d * Pd, LO + 22, false, 'darbe = ' + trim(w, 2) + ' ms', C.blue);
      // reference table
      var refs = [{ w: 1, a: 0 }, { w: 1.5, a: 90 }, { w: 2, a: 180 }];
      for (var i = 0; i < 3; i++) {
        var rx = 132 + i * 205, ry = 226, rw = 190, rh = 98, hit = Math.abs(w - refs[i].w) < 0.06;
        g.save();
        g.fillStyle = hit ? C.copSoft : C.card; K.rr(g, rx + 0.5, ry + 0.5, rw, rh, 6); g.fill();
        g.strokeStyle = hit ? C.copText : C.line2; g.lineWidth = hit ? 2 : 1; g.stroke();
        g.restore();
        txt(g, trim(refs[i].w, 1) + ' ms  →  ' + refs[i].a + '°', rx + rw / 2, ry + 26, { size: 15, mono: true, weight: 600, color: hit ? C.copText : C.ink, align: 'center' });
        var mp = 180, mw = refs[i].w / 20 * mp, mx0 = rx + 5;
        g.save(); g.strokeStyle = hit ? C.copText : C.blue; g.lineWidth = 2.4; g.lineJoin = 'miter';
        g.beginPath(); g.moveTo(mx0, ry + 78); g.lineTo(mx0 + 1, ry + 78); g.lineTo(mx0 + 1, ry + 50); g.lineTo(mx0 + 1 + mw, ry + 50); g.lineTo(mx0 + 1 + mw, ry + 78); g.lineTo(rx + rw - 5, ry + 78); g.stroke();
        g.restore();
        txt(g, 'her 20 ms’de bir', rx + rw / 2, ry + 94, { size: 13, color: C.muted, align: 'center' });
      }
      // dial
      var ang = clamp((w - 1) / 1, 0, 1) * 180;
      var cxD = 930, cyD = 262, R = 118;
      g.save(); g.strokeStyle = C.line2; g.lineWidth = 2;
      g.beginPath(); g.arc(cxD, cyD, R, Math.PI, 0); g.stroke();
      for (var t = 0; t <= 4; t++) {
        var ta = t * 45 * Math.PI / 180;
        g.beginPath(); g.moveTo(cxD - Math.cos(ta) * (R - 10), cyD - Math.sin(ta) * (R - 10)); g.lineTo(cxD - Math.cos(ta) * (R + 4), cyD - Math.sin(ta) * (R + 4)); g.stroke();
      }
      g.restore();
      // swept sector
      var ar = ang * Math.PI / 180;
      g.save(); g.globalAlpha = 0.35; g.fillStyle = C.copSoft;
      g.beginPath(); g.moveTo(cxD, cyD); g.arc(cxD, cyD, R - 14, Math.PI, Math.PI + ar); g.closePath(); g.fill(); g.restore();
      txt(g, '0°', cxD - R - 10, cyD + 5, { size: 14, mono: true, color: C.muted, align: 'right' });
      txt(g, '90°', cxD, cyD - R - 14, { size: 14, mono: true, color: C.muted, align: 'center' });
      txt(g, '180°', cxD + R + 10, cyD + 5, { size: 14, mono: true, color: C.muted });
      // arm
      var ax = cxD - Math.cos(ar) * (R - 10), ay = cyD - Math.sin(ar) * (R - 10);
      g.save(); g.strokeStyle = C.copText; g.lineWidth = 9; g.lineCap = 'round';
      g.beginPath(); g.moveTo(cxD, cyD); g.lineTo(ax, ay); g.stroke();
      g.fillStyle = C.white; g.beginPath(); g.arc(ax, ay, 3, 0, 6.2832); g.fill(); g.restore();
      // servo body
      g.save(); g.fillStyle = C.ink; K.rr(g, cxD - 62, cyD - 6, 124, 52, 6); g.fill(); g.restore();
      g.fillStyle = C.cop; g.beginPath(); g.arc(cxD, cyD, 9, 0, 6.2832); g.fill();
      txt(g, Math.round(ang) + '°', cxD, cyD + 38, { size: 22, weight: 600, color: C.white, align: 'center' });
      txt(g, 'servo', cxD + 76, cyD + 40, { size: 14, color: C.muted });
    }

    /* ---------- ton ---------- */
    function drawTon(g, T, d) {
      var XA = 160, XB = 760, SP = 100;
      var sel = freqSel || (mod(T, 8) < 4 ? 440 : 880);
      cur.freq = sel;
      var rows = [{ f: 440, P: 150, y0: 96, t: 'T = 2,27 ms' }, { f: 880, P: 75, y0: 196, t: 'T = 1,14 ms' }];
      rows.forEach(function (r) {
        var act = r.f === sel, HI = r.y0, LO = r.y0 + 46;
        txt(g, r.f + ' Hz · ' + r.t + ' · görev oranı %' + pct(d), XA, r.y0 - 14, { size: 15, weight: 600, color: act ? C.ink : C.muted });
        txt(g, '3,3 V', XA - 8, HI + 5, { size: 13, mono: true, color: C.muted, align: 'right' });
        txt(g, '0 V', XA - 8, LO + 5, { size: 13, mono: true, color: C.muted, align: 'right' });
        g.strokeStyle = C.line; g.lineWidth = 1;
        [HI, LO].forEach(function (y) { g.beginPath(); g.moveTo(XA, y + 0.5); g.lineTo(XB, y + 0.5); g.stroke(); });
        drawWave(g, XA, XB, r.P, d, HI, LO, T * SP, act ? C.blue : C.grey, act ? 3.2 : 2.2, act ? 1 : 0.45);
      });
      txt(g, 'iki şerit de aynı zaman ölçeğinde: 880 Hz’te aynı sürede iki kat darbe vardır', XA, 288, { size: 14, color: C.ink2 });
      txt(g, 'görev oranı iki durumda da %' + pct(d) + ': ikisi de aynı oranda açık', XA, 310, { size: 14, color: C.muted });
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
      txt(g, 'buzzer', bx, by + 56, { size: 14, weight: 600, color: C.ink2, align: 'center' });
      txt(g, sel === 440 ? 'pes ses' : 'tiz ses', bx + 10, 252, { size: 22, weight: 600, color: C.ink, align: 'center' });
      txt(g, sel === 440 ? 'la notası · 440 Hz' : 'bir oktav yukarı · 880 Hz', bx + 10, 276, { size: 14, color: C.ink2, align: 'center' });
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
      txt(g, TITLE[view], 24, 28, { size: 16, weight: 600, color: C.ink });
      tag(g, 'yavaşlatılmış · basitleştirilmiş', sf.w - 24, 27);
      g.save();
      g.globalAlpha = ss(0, 0.3, T + 0.0001 + (K.reducedMotion ? 1 : 0));
      if (view === 'darbe') drawDarbe(g, T, d);
      else if (view === 'led') drawLed(g, T, d);
      else if (view === 'motor') drawMotor(g, T, d, Math.min(dt, 0.1));
      else if (view === 'servo') drawServo(g, T, cur.w);
      else drawTon(g, T, d);
      g.restore();
      txt(g, CAPTION[view], 560, 371, { size: 16, weight: 600, color: C.ink, align: 'center' });
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
