/* Köklerden Göklere · Yapıcı J · Ölçüm ve mantık (odak slaytları)
 *   ramp-stairs · analog-sensors · adc · switch-yard · logic-gates · half-adder
 *
 * Her görsel tek fikir anlatır: büyük, sade, kendi kendine oynayan bir hikâye.
 * Sahne 1120 x 440 sanal alanda çizilir ve kutuya sığacak biçimde ölçeklenir.
 * read('explain') o an ekranda olanı anlatan tek kısa cümleyi verir.
 * set('view' | ...) ile bir görünüm sabitlenebilir; sabitlenen görünüm sakin bir döngüde oynamaya devam eder.
 */
(function () {
  'use strict';
  var K = window.KGViz;
  if (!K) return;
  var P = K.palette;
  var TAU = Math.PI * 2;
  var clamp = K.clamp, lerp = K.lerp;
  var VW = 1120, VH = 440;
  var CS = 1;                       // geçerli ölçek (yazı boyu alt sınırı için)
  var LAMP = '#F2C46B', COP = P.copperFill, BLUE = P.blue;

  function approach(cur, target, rate, dt) { return cur + (target - cur) * (1 - Math.exp(-rate * dt)); }
  function sm(x) { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); }
  function pad(s, n) { s = String(s); while (s.length < n) s = '0' + s; return s; }

  /* ------------------------------------------------------------------ */
  /* ortak çizim yardımcıları                                            */
  /* ------------------------------------------------------------------ */
  function tx(c, s, x, y, size, color, o) {
    o = o || {};
    c.save();
    c.font = K.font(Math.max(size, 13 / CS), o.w || 600, o.mono);
    c.fillStyle = color || P.ink;
    c.textAlign = o.align || 'left';
    c.textBaseline = o.base || 'middle';
    if (o.alpha !== undefined) c.globalAlpha *= o.alpha;
    c.fillText(s, x, y);
    c.restore();
  }
  function chip(c, s, x, y, size, o) {
    o = o || {};
    c.save();
    var sz = Math.max(size, 13 / CS);
    c.font = K.font(sz, o.w || 600, o.mono);
    var tw = c.measureText(s).width, px = o.px === undefined ? 12 : o.px, h = sz + 16, w = tw + px * 2;
    var al = o.align || 'center';
    var x0 = al === 'left' ? x : al === 'right' ? x - w : x - w / 2;
    if (o.alpha !== undefined) c.globalAlpha *= o.alpha;
    c.shadowColor = 'rgba(21,23,28,0.10)'; c.shadowBlur = 8; c.shadowOffsetY = 2;
    K.rr(c, x0, y - h / 2, w, h, 8);
    c.fillStyle = o.fill || '#FFFFFF'; c.fill();
    c.shadowColor = 'transparent';
    c.lineWidth = 1.2; c.strokeStyle = o.stroke || P.line2; c.stroke();
    c.fillStyle = o.color || P.ink; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillText(s, x0 + w / 2, y + 1);
    c.restore();
    return { x0: x0, w: w, h: h };
  }
  function card(c, x, y, w, h) {
    c.save();
    c.shadowColor = 'rgba(21,23,28,0.10)'; c.shadowBlur = 22; c.shadowOffsetY = 7;
    K.rr(c, x, y, w, h, 16); c.fillStyle = '#FFFFFF'; c.fill();
    c.shadowColor = 'transparent';
    c.lineWidth = 1.2; c.strokeStyle = P.line; c.stroke();
    c.restore();
  }
  function ell(c, x, y, rx, ry, fill) {
    c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, TAU); c.fillStyle = fill; c.fill();
  }

  /* cam ampul: k = 0..1 parlaklık, digit = içindeki büyük 0/1 (isteğe bağlı) */
  function bulb(c, x, y, r, k, digit) {
    c.save();
    if (k > 0.01) {
      K.drawGlow(c, LAMP, x, y, r * 3.0, 0.85 * k);
      K.drawGlow(c, '#FFF6D6', x, y, r * 1.7, 0.75 * k);
    }
    ell(c, x, y + r * 0.95, r * 0.8, r * 0.14, 'rgba(21,23,28,0.10)');
    var g = c.createRadialGradient(x - r * 0.3, y - r * 0.38, r * 0.08, x, y, r);
    g.addColorStop(0, K.mix('#FFFFFF', '#FFF9E3', k));
    g.addColorStop(0.55, K.mix('#ECEEF2', LAMP, k));
    g.addColorStop(1, K.mix('#CDD1D9', '#E2A83F', k));
    c.beginPath(); c.arc(x, y, r, 0, TAU); c.fillStyle = g; c.fill();
    c.lineWidth = 3; c.strokeStyle = K.mix('#8E94A0', '#B9802A', k); c.stroke();
    c.beginPath(); c.ellipse(x - r * 0.38, y - r * 0.46, r * 0.22, r * 0.12, -0.6, 0, TAU);
    c.fillStyle = 'rgba(255,255,255,' + (0.75 - 0.25 * k) + ')'; c.fill();
    if (digit !== undefined) tx(c, String(digit), x, y + r * 0.04, r * 1.05, k > 0.5 ? P.ink : '#8A909C', { mono: true, w: 700, align: 'center' });
    c.restore();
  }

  /* kırılgan yol: [[x,y],...] */
  function mkWire(pts) {
    var cum = [0], i;
    for (i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
    return { p: pts, cum: cum, len: cum[cum.length - 1] };
  }
  function pointAt(w, d) {
    var i = 1;
    while (i < w.p.length - 1 && w.cum[i] < d) i++;
    var a = w.p[i - 1], b = w.p[i], sl = w.cum[i] - w.cum[i - 1] || 1, u = clamp((d - w.cum[i - 1]) / sl, 0, 1);
    return [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u];
  }
  function tracePath(c, w, upTo) {
    c.beginPath(); c.moveTo(w.p[0][0], w.p[0][1]);
    for (var i = 1; i < w.p.length; i++) {
      if (w.cum[i] <= upTo) c.lineTo(w.p[i][0], w.p[i][1]);
      else { var q = pointAt(w, upTo); c.lineTo(q[0], q[1]); break; }
    }
  }
  function wireBase(c, w, width) {
    c.save(); c.lineCap = 'round'; c.lineJoin = 'round';
    c.strokeStyle = '#C9CDD5'; c.lineWidth = width || 8;
    tracePath(c, w, w.len); c.stroke();
    c.restore();
  }
  /* akım taşıyan tel: bakır parıltı + hareketli noktalar. k = 0..1, frac = çizilen uzunluk oranı */
  function wireLive(c, w, k, t, frac, width, speed) {
    if (k < 0.01) return;
    var upTo = w.len * (frac === undefined ? 1 : frac);
    if (upTo < 1) return;
    c.save(); c.lineCap = 'round'; c.lineJoin = 'round';
    c.globalAlpha *= k;
    c.strokeStyle = 'rgba(200,105,58,0.20)'; c.lineWidth = (width || 8) + 11;
    tracePath(c, w, upTo); c.stroke();
    c.strokeStyle = COP; c.lineWidth = width || 8;
    tracePath(c, w, upTo); c.stroke();
    var sp = speed || 95, gap = 30, d = (t * sp) % gap;
    c.fillStyle = '#FFE9D6';
    for (; d < upTo; d += gap) {
      var q = pointAt(w, d);
      c.beginPath(); c.arc(q[0], q[1], 3.4, 0, TAU); c.fill();
    }
    c.restore();
  }
  function terminal(c, x, y) {
    c.beginPath(); c.arc(x, y, 8, 0, TAU); c.fillStyle = '#FFFFFF'; c.fill();
    c.lineWidth = 3.5; c.strokeStyle = P.ink2; c.stroke();
  }
  /* kol anahtar: (x0,y0) eksen, (x1,y1) karşı uç; k = 1 kapalı */
  function lever(c, x0, y0, x1, y1, k) {
    var L = Math.hypot(x1 - x0, y1 - y0);
    c.save();
    c.translate(x0, y0); c.rotate(Math.atan2(y1 - y0, x1 - x0));
    terminal(c, 0, 0); terminal(c, L, 0);
    var ang = -(1 - k) * 0.45;
    c.rotate(ang);
    c.lineCap = 'round';
    c.strokeStyle = 'rgba(21,23,28,0.14)'; c.lineWidth = 12;
    c.beginPath(); c.moveTo(0, 5); c.lineTo(L - 4, 5); c.stroke();
    c.strokeStyle = P.ink; c.lineWidth = 8;
    c.beginPath(); c.moveTo(0, 0); c.lineTo(L - 6, 0); c.stroke();
    c.strokeStyle = 'rgba(255,255,255,0.35)'; c.lineWidth = 2;
    c.beginPath(); c.moveTo(6, -2); c.lineTo(L - 12, -2); c.stroke();
    c.beginPath(); c.arc(0, 0, 8, 0, TAU); c.fillStyle = P.ink; c.fill();
    c.restore();
  }
  function resistorSym(c, x0, y, x1, h) {
    c.save();
    K.rr(c, x0, y - h / 2, x1 - x0, h, 4);
    c.fillStyle = '#F3DCCB'; c.fill(); c.lineWidth = 3.5; c.strokeStyle = P.ink2; c.stroke();
    c.restore();
  }
  function batterySym(c, x, y, w, h, label) {
    c.save();
    ell(c, x + 4, y + h / 2 + 8, w * 0.6, 7, 'rgba(21,23,28,0.12)');
    K.rr(c, x - w / 2, y - h / 2, w, h, 9);
    var g = c.createLinearGradient(x - w / 2, 0, x + w / 2, 0);
    g.addColorStop(0, '#2A2E37'); g.addColorStop(0.5, '#454B57'); g.addColorStop(1, '#23262E');
    c.fillStyle = g; c.fill();
    K.rr(c, x - w / 2, y - h / 2 + h * 0.16, w, h * 0.22, 0);
    c.fillStyle = COP; c.fill();
    tx(c, label, x, y + h * 0.17, 20, '#F5F5F1', { mono: true, align: 'center' });
    tx(c, '+', x, y - h / 2 + h * 0.27, 20, '#FFFFFF', { mono: true, align: 'center', w: 700 });
    c.restore();
  }
  /* kapı sembolü; kutu x,y (sol üst), w,h */
  function gateShape(c, type, x, y, w, h, on) {
    c.save();
    c.beginPath();
    if (type === 'and') {
      c.moveTo(x, y); c.lineTo(x + w * 0.5, y);
      c.arc(x + w * 0.5, y + h / 2, h / 2, -Math.PI / 2, Math.PI / 2);
      c.lineTo(x, y + h); c.closePath();
    } else {
      c.moveTo(x, y); c.quadraticCurveTo(x + w * 0.6, y, x + w, y + h / 2);
      c.quadraticCurveTo(x + w * 0.6, y + h, x, y + h);
      c.quadraticCurveTo(x + w * 0.25, y + h / 2, x, y);
      c.closePath();
    }
    c.shadowColor = 'rgba(21,23,28,0.12)'; c.shadowBlur = 12; c.shadowOffsetY = 4;
    c.fillStyle = K.mix('#FFFFFF', '#F7E3D3', on || 0); c.fill();
    c.shadowColor = 'transparent';
    c.lineWidth = 4; c.lineJoin = 'round'; c.strokeStyle = P.ink; c.stroke();
    if (type === 'xor') {
      c.beginPath(); c.moveTo(x - 16, y); c.quadraticCurveTo(x + w * 0.25 - 16, y + h / 2, x - 16, y + h);
      c.stroke();
    }
    c.restore();
  }
  function toggleBig(c, x, y, w, h, k, label, accent) {
    c.save();
    ell(c, x + w / 2, y + h + 10, w * 0.5, 6, 'rgba(21,23,28,0.10)');
    K.rr(c, x, y, w, h, h / 2);
    c.fillStyle = K.mix('#D5D8DF', accent || COP, k); c.fill();
    c.lineWidth = 2; c.strokeStyle = 'rgba(21,23,28,0.25)'; c.stroke();
    var r = h / 2 - 6, kx = x + h / 2 + (w - h) * k;
    c.shadowColor = 'rgba(21,23,28,0.30)'; c.shadowBlur = 8; c.shadowOffsetY = 3;
    c.beginPath(); c.arc(kx, y + h / 2, r, 0, TAU); c.fillStyle = '#FFFFFF'; c.fill();
    c.shadowColor = 'transparent';
    tx(c, String(Math.round(k)), kx, y + h / 2 + 1, r * 1.25, P.ink, { mono: true, w: 700, align: 'center' });
    if (label) tx(c, label, x, y - 24, 19, P.ink, { w: 700 });
    c.restore();
  }

  /* zaman çizelgesi: dizi süreler → { i, u (0..1), lt (yerel sn), start, dur } */
  function seg(t, durs) {
    var total = 0, i;
    for (i = 0; i < durs.length; i++) total += durs[i];
    var tt = t % total, a = 0;
    for (i = 0; i < durs.length; i++) {
      if (tt < a + durs[i]) return { i: i, lt: tt - a, u: (tt - a) / durs[i], dur: durs[i], tt: tt };
      a += durs[i];
    }
    return { i: durs.length - 1, lt: durs[durs.length - 1], u: 1, dur: durs[durs.length - 1], tt: tt };
  }

  function mount(el, def) {
    if (window.getComputedStyle(el).position === 'static') el.style.position = 'relative';
    var sf = K.surface(el), S = {};
    def.reset(S);
    return {
      frame: function (t, dt) {
        dt = clamp(dt || 0.016, 0.0001, 0.1);
        var W = sf.w, H = sf.h;
        if (!W || !H) { sf.resize(); W = sf.w; H = sf.h; if (!W || !H) return; }
        var s = Math.min(W / VW, H / VH) * 0.97;
        CS = s;
        def.update(S, t, dt);
        sf.clear();
        var c = sf.ctx;
        c.save();
        c.translate((W - VW * s) / 2, (H - VH * s) / 2);
        c.scale(s, s);
        def.draw(c, S, t);
        c.restore();
      },
      reset: function () { def.reset(S); },
      set: function (k, v) { def.set(S, k, v); },
      read: function (k) { return def.read(S, k); },
      dispose: function () { sf.dispose(); }
    };
  }

  /* ==================================================================
   * 1 · ramp-stairs: aynı top rampada ve merdivende
   * ================================================================== */
  K.register('ramp-stairs', function (el) {
    var LV = [2, 4, 8, 16], PH = 7.5;
    var EXPL = {
      2: 'Rampada top her yerde durur, merdivende yalnız basamakta.',
      4: '4 basamak: merdiven rampaya yaklaşır. 4 seviye = 2 bit.',
      8: '8 basamak = 3 bit. Her bit basamağı ikiye katlar.',
      16: '16 basamak = 4 bit. Merdiven rampaya çok benzedi.'
    };
    function reset(S) {
      S.manual = false; S.N = 2; S.prevN = 2; S.fade = 1; S.h = 0; S.lv = 0; S.idx = 0;
    }
    function update(S, t, dt) {
      if (!S.manual) {
        var N = LV[Math.floor(t / PH) % 4];
        if (N !== S.N) { S.prevN = S.N; S.N = N; S.fade = 0; }
      }
      S.fade = Math.min(1, S.fade + dt / 0.6);
      var u = (t % PH) / PH;
      S.h = clamp(0.5 - 0.5 * Math.cos(TAU * u), 0, 0.9999);
      S.idx = Math.min(S.N - 1, Math.floor(S.h * S.N));
      S.lv = approach(S.lv, S.idx / (S.N - 1), 16, dt);
    }
    function stairs(c, S, N, alpha, x0, gy, W, Hs, active) {
      c.save(); c.globalAlpha *= alpha;
      var w = W / N, i, hh, hx;
      for (i = 0; i < N; i++) {
        hh = i / (N - 1) * Hs; hx = x0 + i * w;
        if (hh > 0) {
          c.fillStyle = i % 2 ? '#D6D0C3' : '#DDD8CC';
          c.fillRect(hx, gy - hh, w + 0.6, hh);
        }
        if (hh > 0 || (active && i === S.idx)) { c.fillStyle = '#B3AC9D'; c.fillRect(hx, gy - hh, w + 0.6, 4); }
        if (active && i === S.idx) {
          c.fillStyle = COP; c.fillRect(hx, gy - hh - 1, w + 0.6, 6);
        }
      }
      c.strokeStyle = '#8E897D'; c.lineWidth = 1.5;
      c.beginPath(); c.moveTo(x0, gy);
      for (i = 0; i < N; i++) {
        hh = i / (N - 1) * Hs;
        c.lineTo(x0 + i * w, gy - hh); c.lineTo(x0 + (i + 1) * w, gy - hh);
      }
      c.lineTo(x0 + W, gy); c.stroke();
      c.restore();
    }
    function draw(c, S, t) {
      var cy = 20, ch = 400, cw = 530, W = 420, Hs = 196, r = 15, gy = cy + 288;
      var xa = 20, xd = 570;
      card(c, xa, cy, cw, ch); card(c, xd, cy, cw, ch);
      tx(c, 'ANALOG', xa + 26, cy + 36, 24, P.ink, { w: 700 });
      tx(c, 'sürekli', xa + 26 + 118, cy + 37, 18, P.muted, { w: 500 });
      tx(c, 'DİJİTAL', xd + 26, cy + 36, 24, P.ink, { w: 700 });
      tx(c, 'basamaklı', xd + 26 + 128, cy + 37, 18, P.muted, { w: 500 });
      var ax = xa + 55, dx = xd + 55;
      var al = Math.atan2(Hs, W), sa = Math.sin(al), ca = Math.cos(al);
      var hy = S.h * Hs, bx = S.h * W;

      /* rampa */
      c.save();
      c.beginPath(); c.moveTo(ax, gy); c.lineTo(ax + W, gy); c.lineTo(ax + W, gy - Hs); c.closePath();
      c.fillStyle = '#DDD8CC'; c.fill(); c.strokeStyle = '#8E897D'; c.lineWidth = 1.5; c.stroke();
      c.beginPath(); c.moveTo(ax, gy); c.lineTo(ax + W, gy - Hs); c.lineWidth = 4; c.strokeStyle = '#B3AC9D'; c.stroke();
      c.restore();
      /* merdiven */
      if (S.fade < 1) stairs(c, S, S.prevN, 1 - S.fade, dx, gy, W, Hs, false);
      stairs(c, S, S.N, S.fade < 1 ? S.fade : 1, dx, gy, W, Hs, true);
      /* zemin çizgileri */
      c.strokeStyle = P.ink2; c.lineWidth = 2.5;
      c.beginPath(); c.moveTo(ax - 18, gy); c.lineTo(ax + W + 20, gy); c.moveTo(dx - 18, gy); c.lineTo(dx + W + 20, gy); c.stroke();

      /* yükseklik cetveli + kılavuz çizgisi */
      var rx1 = ax + W + 26, rx2 = dx + W + 26, yD = gy - S.lv * Hs;
      c.save();
      c.strokeStyle = P.line2; c.lineWidth = 2;
      c.beginPath(); c.moveTo(rx1, gy); c.lineTo(rx1, gy - Hs); c.moveTo(rx2, gy); c.lineTo(rx2, gy - Hs); c.stroke();
      for (var i = 0; i < S.N; i++) {
        var ty = gy - i / (S.N - 1) * Hs;
        c.beginPath(); c.moveTo(rx2 - 6, ty); c.lineTo(rx2 + 6, ty); c.stroke();
      }
      c.setLineDash([6, 6]); c.strokeStyle = K.rgba(P.copper, 0.55); c.lineWidth = 2;
      c.beginPath(); c.moveTo(ax + bx, gy - hy - 2); c.lineTo(rx1, gy - hy - 2);
      c.moveTo(dx + S.h * W, yD - 2); c.lineTo(rx2, yD - 2); c.stroke();
      c.setLineDash([]);
      function mark(x, y) {
        c.beginPath(); c.moveTo(x - 2, y - 2); c.lineTo(x + 10, y - 9); c.lineTo(x + 10, y + 5); c.closePath();
        c.fillStyle = COP; c.fill();
      }
      mark(rx1 - 4, gy - hy - 2); mark(rx2 - 4, yD - 2);
      c.restore();

      /* toplar */
      var p1x = ax + bx - r * sa, p1y = gy - hy - r * ca;
      var p2x = dx + S.h * W, p2y = yD - r - 1;
      ell(c, ax + bx, gy - hy, r * 0.9, 4, 'rgba(21,23,28,0.18)');
      ell(c, p2x, yD, r * 0.9, 4, 'rgba(21,23,28,0.18)');
      K.drawSphere(c, '#2343B0', p1x, p1y, r);
      K.drawSphere(c, '#2343B0', p2x, p2y, r);

      /* sayılar */
      var vNum = K.num(S.h * 2, 3) + ' m';
      tx(c, vNum, xa + cw / 2, cy + 344, 48, P.ink, { mono: true, w: 700, align: 'center' });
      tx(c, String(S.idx), xd + cw / 2 - 40, cy + 344, 48, COP, { mono: true, w: 700, align: 'center' });
      var nb = Math.round(Math.log(S.N) / Math.LN2);
      tx(c, pad(S.idx.toString(2), nb), xd + cw / 2 + 52, cy + 344, 36, P.ink2, { mono: true, w: 600, align: 'left' });
      tx(c, nb + ' bit · ' + S.N + ' basamak', xd + cw / 2, cy + 387, 16, P.muted, { mono: true, w: 500, align: 'center' });
    }
    function set(S, k, v) {
      if (k === 'levels') {
        var n = Math.round(+v);
        if (LV.indexOf(n) >= 0 && n !== S.N) { S.prevN = S.N; S.N = n; S.fade = 0; }
        S.manual = true;
      }
    }
    function read(S, k) {
      var nb = Math.round(Math.log(S.N) / Math.LN2);
      if (k === 'analog') return 'Analog: ' + K.num(S.h * 2, 3) + ' m';
      if (k === 'digital') return 'Dijital: seviye ' + S.idx + ' (' + pad(S.idx.toString(2), nb) + ')';
      if (k === 'bits') return S.N + ' basamak = ' + nb + ' bit';
      if (k === 'levels') return String(S.N);
      if (k === 'explain') return EXPL[S.N];
      return '';
    }
    return mount(el, { reset: reset, update: update, draw: draw, set: set, read: read });
  });

  /* ==================================================================
   * 2 · analog-sensors: gerilim bölücü, tek hareketli gerilim çubuğu
   * ================================================================== */
  K.register('analog-sensors', function (el) {
    var KINDS = ['isik', 'sicaklik', 'dugme'], PD = [12, 12, 10];
    var NAMES = { isik: 'LDR', sicaklik: 'NTC', dugme: 'Potansiyometre' };
    function resOf(kind, x) {
      if (kind === 'isik') return clamp(10000 * Math.pow(50 / Math.max(x, 2), 0.8), 500, 200000);
      if (kind === 'sicaklik') { var T = x / 2 + 273.15; return 10000 * Math.exp(3950 * (1 / T - 1 / 298.15)); }
      return 10000 * (1 - x / 100) + 50;
    }
    function kfmt(R) {
      var k = R / 1000, kr;
      if (R < 1000) { kr = Math.round(k * 100) / 100; return { k: kr, s: K.num(kr, 2) + ' kΩ', o: Math.round(R) + ' Ω' }; }
      if (R < 99950) { kr = Math.round(k * 10) / 10; return { k: kr, s: K.num(kr, 1) + ' kΩ', o: K.num(kr, 1) + ' kΩ' }; }
      kr = Math.round(k); return { k: kr, s: K.num(kr, 0) + ' kΩ', o: K.num(kr, 0) + ' kΩ' };
    }
    function reset(S) {
      S.mS = false; S.mI = false; S.sensor = 'isik'; S.input = 4; S.target = 4; S.last = 4; S.vel = 1; S.dir = 1;
      S.show = { isik: 1, sicaklik: 0, dugme: 0 };
      S.vo = 3.3 * 10000 / (resOf('isik', 4) + 10000);
      S.vs = 3.3 - S.vo;
    }
    function autoAt(t, kind, fixed) {
      var si = KINDS.indexOf(kind), P0 = PD[si], u;
      if (fixed) u = (t % P0) / P0;
      else { var s = seg(t, PD); u = s.u; }
      return 50 - 46 * Math.cos(TAU * u);
    }
    function calc(S) {
      var R = resOf(S.sensor, S.input);
      return { R: R, f: kfmt(R), vout: 3.3 * 10000 / (R + 10000), I: 3.3 / (R + 10000) };
    }
    function update(S, t, dt) {
      if (!S.mS) S.sensor = KINDS[seg(t, PD).i];
      if (!S.mI) S.target = autoAt(t, S.sensor, S.mS);
      S.input = S.mI ? approach(S.input, S.target, 9, dt) : S.target;
      var v = (S.input - S.last) / dt; S.last = S.input;
      S.vel = approach(S.vel, v, 5, dt);
      if (S.vel > 1.5) S.dir = 1; else if (S.vel < -1.5) S.dir = -1;
      KINDS.forEach(function (k) { S.show[k] = approach(S.show[k], k === S.sensor ? 1 : 0, 9, dt); });
      var C = calc(S);
      S.vo = C.vout; S.vs = 3.3 - C.vout; S.C = C;
    }
    function drawLDR(c, cx, cy, x, t) {
      var sx = cx, sy = cy - 148;
      K.drawGlow(c, LAMP, sx, sy, 50 + 90 * x, 0.35 + 0.65 * x);
      c.save();
      c.beginPath(); c.arc(sx, sy, 24, 0, TAU); c.fillStyle = K.mix('#F3E3B5', '#FFF4C8', x); c.fill();
      c.strokeStyle = LAMP; c.lineWidth = 3;
      for (var i = 0; i < 12; i++) {
        var a = i / 12 * TAU, r0 = 33, r1 = 33 + 6 + 30 * x;
        c.globalAlpha = 0.25 + 0.75 * x;
        c.beginPath(); c.moveTo(sx + Math.cos(a) * r0, sy + Math.sin(a) * r0); c.lineTo(sx + Math.cos(a) * r1, sy + Math.sin(a) * r1); c.stroke();
      }
      c.restore();
      c.save(); c.globalAlpha = 0.5 * x; c.strokeStyle = LAMP; c.lineWidth = 3; c.setLineDash([2, 9]); c.lineCap = 'round';
      for (var j = -1; j <= 1; j++) { c.beginPath(); c.moveTo(sx + j * 26, sy + 62); c.lineTo(cx + j * 36, cy - 76); c.stroke(); }
      c.restore();
      ell(c, cx, cy + 70, 66, 9, 'rgba(21,23,28,0.14)');
      c.save();
      c.strokeStyle = '#8E94A0'; c.lineWidth = 4; c.lineCap = 'round';
      c.beginPath(); c.moveTo(cx - 24, cy + 40); c.lineTo(cx - 24, cy + 112); c.moveTo(cx + 24, cy + 40); c.lineTo(cx + 24, cy + 112); c.stroke();
      c.beginPath(); c.arc(cx, cy, 64, 0, TAU); c.fillStyle = '#B8BCC6'; c.fill();
      var g = c.createRadialGradient(cx - 18, cy - 20, 4, cx, cy, 58);
      g.addColorStop(0, '#E2C58E'); g.addColorStop(1, '#B98E55');
      c.beginPath(); c.arc(cx, cy, 57, 0, TAU); c.fillStyle = g; c.fill();
      c.save(); c.beginPath(); c.arc(cx, cy, 52, 0, TAU); c.clip();
      c.strokeStyle = '#7A4E24'; c.lineWidth = 5; c.lineJoin = 'round';
      c.beginPath();
      for (var k2 = 0; k2 < 7; k2++) {
        var yy = cy - 48 + k2 * 16;
        if (k2 % 2 === 0) { c.lineTo(cx - 60, yy); c.lineTo(cx + 60, yy); } else { c.lineTo(cx + 60, yy); c.lineTo(cx - 60, yy); }
      }
      c.stroke(); c.restore();
      c.restore();
    }
    function drawNTC(c, cx, cy, x, t) {
      var heat = x;
      K.drawGlow(c, '#E0562E', cx, cy + 6, 40 + 100 * heat, 0.15 + 0.6 * heat);
      c.save(); c.lineCap = 'round';
      for (var i = -1; i <= 1; i++) {
        c.strokeStyle = K.rgba('#E0562E', 0.15 + 0.6 * heat); c.lineWidth = 4;
        c.beginPath();
        for (var s = 0; s <= 40; s++) {
          var yy = cy - 50 - s * 3.2, xx = cx + i * 42 + Math.sin(s * 0.45 - t * 3 + i) * 9;
          if (s === 0) c.moveTo(xx, yy); else c.lineTo(xx, yy);
        }
        c.globalAlpha = heat; c.stroke();
      }
      c.restore();
      ell(c, cx, cy + 68, 58, 9, 'rgba(21,23,28,0.14)');
      c.save();
      c.strokeStyle = '#8E94A0'; c.lineWidth = 4; c.lineCap = 'round';
      c.beginPath(); c.moveTo(cx - 12, cy + 22); c.lineTo(cx - 20, cy + 112); c.moveTo(cx + 12, cy + 22); c.lineTo(cx + 20, cy + 112); c.stroke();
      var g = c.createRadialGradient(cx - 14, cy - 14, 3, cx, cy, 46);
      g.addColorStop(0, K.mix('#5A6A8C', '#C2492A', heat * 0.55)); g.addColorStop(0.5, K.mix('#2A3550', '#6E2A1B', heat * 0.5)); g.addColorStop(1, '#151A2A');
      c.beginPath(); c.ellipse(cx, cy, 42, 48, 0, 0, TAU); c.fillStyle = g; c.fill();
      c.beginPath(); c.ellipse(cx - 14, cy - 18, 10, 6, -0.6, 0, TAU); c.fillStyle = 'rgba(255,255,255,0.35)'; c.fill();
      c.restore();
    }
    function drawPot(c, cx, cy, x) {
      ell(c, cx, cy + 74, 70, 10, 'rgba(21,23,28,0.14)');
      var a0 = Math.PI * 0.75, a1 = Math.PI * 2.25, ang = a0 + (a1 - a0) * x;
      c.save();
      for (var i = 0; i <= 10; i++) {
        var a = a0 + (a1 - a0) * i / 10;
        c.strokeStyle = i / 10 <= x + 0.001 ? COP : '#C9CDD5'; c.lineWidth = 4; c.lineCap = 'round';
        c.beginPath(); c.moveTo(cx + Math.cos(a) * 66, cy + Math.sin(a) * 66); c.lineTo(cx + Math.cos(a) * 78, cy + Math.sin(a) * 78); c.stroke();
      }
      c.beginPath(); c.arc(cx, cy, 60, 0, TAU); c.fillStyle = '#2B2F38'; c.fill();
      var g = c.createRadialGradient(cx - 16, cy - 18, 3, cx, cy, 54);
      g.addColorStop(0, '#7B8190'); g.addColorStop(1, '#3A3F4A');
      c.beginPath(); c.arc(cx, cy, 52, 0, TAU); c.fillStyle = g; c.fill();
      c.strokeStyle = '#F5F5F1'; c.lineWidth = 6; c.lineCap = 'round';
      c.beginPath(); c.moveTo(cx + Math.cos(ang) * 14, cy + Math.sin(ang) * 14); c.lineTo(cx + Math.cos(ang) * 46, cy + Math.sin(ang) * 46); c.stroke();
      c.restore();
    }
    function draw(c, S, t) {
      var C = S.C, ax = 165, ay = 235;
      var cx = 560, yTop = 78, yBot = 350, L = yBot - yTop, BW = 54;
      var hs = clamp(L * S.vs / 3.3, 26, L - 26), yTap = yTop + hs;
      var bx = 800, bw = 58;

      /* 1) sensör ve girdi */
      KINDS.forEach(function (k) {
        var a = S.show[k];
        if (a < 0.02) return;
        c.save(); c.globalAlpha *= a;
        var x = S.input / 100;
        if (k === 'isik') drawLDR(c, ax, ay, x, t);
        else if (k === 'sicaklik') drawNTC(c, ax, ay, x, t);
        else drawPot(c, ax, ay, x);
        var txt = k === 'isik' ? 'LDR · ışık %' + Math.round(S.input) :
          k === 'sicaklik' ? 'NTC · ' + K.num(Math.round(S.input) / 2, Math.round(S.input) % 2 ? 1 : 0) + ' °C' :
          'Potansiyometre · %' + Math.round(S.input);
        chip(c, txt, ax, 402, 20, {});
        c.restore();
      });

      /* 2) bölücü: kutu yüksekliği = gerilim payı */
      c.save();
      c.strokeStyle = COP; c.lineWidth = 5; c.lineCap = 'round';
      c.beginPath(); c.moveTo(cx - 70, yTop); c.lineTo(bx + bw / 2, yTop); c.stroke();
      c.strokeStyle = P.ink2;
      c.beginPath(); c.moveTo(cx - 70, yBot); c.lineTo(bx + bw / 2, yBot); c.stroke();
      c.lineWidth = 3;
      for (var g = 0; g < 3; g++) { c.beginPath(); c.moveTo(cx - 70 - 14 + g * 5, yBot + 10 + g * 7); c.lineTo(cx - 70 + 14 - g * 5, yBot + 10 + g * 7); c.stroke(); }
      c.beginPath(); c.moveTo(cx - 70, yBot); c.lineTo(cx - 70, yBot + 8); c.stroke();
      c.restore();
      /* sensör kutusu */
      K.rr(c, cx - BW / 2, yTop, BW, hs - 2, 5); c.fillStyle = '#F3DCCB'; c.fill(); c.lineWidth = 3.5; c.strokeStyle = P.ink2; c.stroke();
      K.rr(c, cx - BW / 2, yTap + 2, BW, yBot - yTap - 2, 5); c.fillStyle = P.blueSoft; c.fill(); c.stroke();
      /* akım noktaları */
      var Ik = clamp(C.I / 0.0003, 0.08, 1);
      c.save(); c.fillStyle = COP;
      var gap = 26, off = (t * 70 * (0.25 + Ik)) % gap;
      for (var d = yTop + off; d < yBot; d += gap) {
        c.beginPath(); c.arc(cx, d, 3.6, 0, TAU); c.fillStyle = '#FFFFFF'; c.fill();
        c.beginPath(); c.arc(cx, d, 2.4, 0, TAU); c.fillStyle = COP; c.fill();
      }
      c.restore();
      /* orta düğüm ve çıkış teli */
      c.save();
      c.strokeStyle = BLUE; c.lineWidth = 5; c.lineCap = 'round';
      c.beginPath(); c.moveTo(cx, yTap); c.lineTo(bx, yTap); c.stroke();
      c.beginPath(); c.arc(cx, yTap, 8, 0, TAU); c.fillStyle = BLUE; c.fill();
      c.restore();

      /* 3) gerilim çubuğu */
      K.rr(c, bx, yTop, bw, L, 10); c.fillStyle = '#ECECE6'; c.fill(); c.lineWidth = 2; c.strokeStyle = P.line2; c.stroke();
      c.save();
      K.rr(c, bx, yTop, bw, L, 10); c.clip();
      var gr = c.createLinearGradient(0, yTap, 0, yBot);
      gr.addColorStop(0, '#4A66D0'); gr.addColorStop(1, BLUE);
      c.fillStyle = gr; c.fillRect(bx, yTap, bw, yBot - yTap);
      c.fillStyle = 'rgba(255,255,255,0.55)'; c.fillRect(bx, yTap, bw, 4);
      c.restore();
      tx(c, '3,3 V', bx + bw / 2, yTop - 18, 16, P.muted, { align: 'center', w: 600 });
      tx(c, '0 V', bx + bw / 2, yBot + 20, 16, P.muted, { align: 'center', w: 600 });
      chip(c, K.num(S.vo, 2) + ' V', bx + bw + 14, yTap, 38, { align: 'left', mono: true, w: 700, color: BLUE, px: 14 });

      /* 4) direnç etiketleri ve bağlantı */
      var ysC = (yTop + yTap) / 2, yfC = (yTap + yBot) / 2;
      var rc = chip(c, C.f.s, cx - BW / 2 - 14, ysC, 26, { align: 'right', mono: true, w: 700, color: P.copper });
      c.save();
      c.setLineDash([5, 6]); c.strokeStyle = P.line2; c.lineWidth = 2;
      c.beginPath(); c.moveTo(ax + 84, ay - 6); c.lineTo(rc.x0 - 4, ysC); c.stroke();
      c.restore();
      chip(c, '10 kΩ', cx - BW / 2 - 14, yfC, 22, { align: 'right', mono: true, w: 700, color: BLUE });
    }
    function inputText(S) {
      var x = S.input;
      if (S.sensor === 'isik') return 'Işık: %' + Math.round(x);
      if (S.sensor === 'sicaklik') { var T = Math.round(x) / 2; return 'Sıcaklık: ' + K.num(T, T % 1 ? 1 : 0) + ' °C'; }
      return 'Düğme: %' + Math.round(x);
    }
    function explain(S) {
      var up = S.dir > 0;
      if (S.sensor === 'isik') return up ? 'Işık artıyor: LDR\'nin direnci azalıyor, çıkış gerilimi yükseliyor.' : 'Işık azalıyor: LDR\'nin direnci artıyor, çıkış gerilimi düşüyor.';
      if (S.sensor === 'sicaklik') return up ? 'Sıcaklık artıyor: NTC\'nin direnci azalıyor, çıkış gerilimi yükseliyor.' : 'Sıcaklık azalıyor: NTC\'nin direnci artıyor, çıkış gerilimi düşüyor.';
      return up ? 'Düğmeyi çevirdikçe direnç azalıyor, çıkış gerilimi yükseliyor.' : 'Düğmeyi geri çevirince direnç artıyor, çıkış gerilimi düşüyor.';
    }
    function set(S, k, v) {
      if (k === 'sensor') {
        var s = String(v);
        if (KINDS.indexOf(s) >= 0) { S.sensor = s; S.mS = true; }
      } else if (k === 'view') {
        if (KINDS.indexOf(String(v)) >= 0) { S.sensor = String(v); S.mS = true; }
      } else if (k === 'input') {
        S.target = clamp(+v, 0, 100); S.mI = true;
      }
    }
    function read(S, k) {
      var C = S.C || calc(S);
      if (k === 'resistance') return C.f.o;
      if (k === 'vout') return K.num(C.vout, 2) + ' V';
      if (k === 'formula') return 'Vout = 3,3 V × 10 kΩ ÷ (' + C.f.s + ' + 10 kΩ) ≈ ' + K.num(C.vout, 2) + ' V';
      if (k === 'input') return Math.round(S.input) + ' · ' + inputText(S);
      if (k === 'sensor') return S.sensor;
      if (k === 'explain') return explain(S);
      return '';
    }
    return mount(el, { reset: reset, update: update, draw: draw, set: set, read: read });
  });

  /* ==================================================================
   * 3 · adc: gerilim merdiveni sayıya dolar
   * ================================================================== */
  K.register('adc', function (el) {
    var KEYS = [[0, 0], [7, 3.3], [11, 1.65], [15.5, 1.65], [20, 0]];
    function vAt(t) {
      var tt = t % 20, i = 1;
      while (i < KEYS.length - 1 && tt > KEYS[i][0]) i++;
      var a = KEYS[i - 1], b = KEYS[i], u = sm((tt - a[0]) / (b[0] - a[0]));
      return lerp(a[1], b[1], u);
    }
    function reset(S) { S.man = false; S.v = 0; S.target = 0; S.lastV = 0; S.up = true; S.hold = false; }
    function update(S, t, dt) {
      if (!S.man) {
        S.v = vAt(t);
        var tt = t % 20;
        S.hold = tt >= 11 && tt < 15.5;
      } else { S.v = approach(S.v, S.target, 10, dt); S.hold = false; }
      var d = S.v - S.lastV; S.lastV = S.v;
      if (d > 0.0004) S.up = true; else if (d < -0.0004) S.up = false;
      S.n = clamp(Math.round(S.v / 3.3 * 4095), 0, 4095);
    }
    function bin(n) { var s = n.toString(2); while (s.length < 12) s = '0' + s; return s; }
    function vtxt(x) { var c = Math.abs(x * 100 - Math.round(x * 100)) < 0.02; return K.num(x, c ? 2 : 3) + ' V'; }
    function draw(c, S, t) {
      var yTop = 60, yBot = 390, L = yBot - yTop, frac = S.v / 3.3;
      var yFill = yBot - frac * L;
      /* analog çubuk */
      var bx = 86, bw = 60;
      K.rr(c, bx, yTop, bw, L, 10); c.fillStyle = '#ECECE6'; c.fill(); c.lineWidth = 2; c.strokeStyle = P.line2; c.stroke();
      c.save(); K.rr(c, bx, yTop, bw, L, 10); c.clip();
      var gr = c.createLinearGradient(0, yFill, 0, yBot); gr.addColorStop(0, '#4A66D0'); gr.addColorStop(1, BLUE);
      c.fillStyle = gr; c.fillRect(bx, yFill, bw, yBot - yFill);
      c.fillStyle = 'rgba(255,255,255,0.55)'; c.fillRect(bx, yFill, bw, 4);
      c.restore();
      tx(c, '3,3 V', bx + bw / 2, yTop - 18, 16, P.muted, { align: 'center' });
      tx(c, '0 V', bx + bw / 2, yBot + 20, 16, P.muted, { align: 'center' });
      /* merdiven */
      var lx0 = 340, lx1 = 480, R = 32, pitch = L / R, i;
      c.save(); c.lineCap = 'round';
      c.strokeStyle = '#AEB3BD'; c.lineWidth = 5;
      c.beginPath(); c.moveTo(lx0, yTop); c.lineTo(lx0, yBot); c.moveTo(lx1, yTop); c.lineTo(lx1, yBot); c.stroke();
      for (i = 0; i < R; i++) {
        var k = clamp(frac * R - i, 0, 1), y = yBot - (i + 0.5) * pitch;
        c.strokeStyle = k > 0 ? K.mix('#C9CDD5', BLUE, k) : '#D5D8DF';
        c.lineWidth = 6;
        c.beginPath(); c.moveTo(lx0 + 2, y); c.lineTo(lx1 - 2, y); c.stroke();
      }
      c.restore();
      chip(c, 'ADC', (lx0 + lx1) / 2, yTop - 18, 22, { mono: true, w: 700 });
      /* kılavuz çizgisi ve gerilim çipi */
      c.save(); c.setLineDash([6, 6]); c.strokeStyle = K.rgba(BLUE, 0.6); c.lineWidth = 2;
      c.beginPath(); c.moveTo(bx + bw, yFill); c.lineTo(lx0 - 8, yFill); c.stroke(); c.restore();
      chip(c, vtxt(S.v), 252, yFill, 24, { mono: true, w: 700, color: BLUE });
      /* ok */
      K.arrow(c, 500, 190, 590, 190, { color: P.ink2, width: 3, head: 14 });
      /* büyük sayı */
      var cxn = 842;
      tx(c, K.num(S.n, 0), cxn, 190, 128, P.ink, { mono: true, w: 700, align: 'center' });
      /* 12 bit */
      var s = bin(S.n), bwid = 36, gp = 5, grp = 4 * bwid + 3 * gp, tot = 3 * grp + 2 * 18, x0 = cxn - tot / 2, by = 300, bh = 56;
      for (i = 0; i < 12; i++) {
        var g = Math.floor(i / 4), xx = x0 + g * (grp + 18) + (i % 4) * (bwid + gp), on = s[i] === '1';
        K.rr(c, xx, by, bwid, bh, 7);
        c.fillStyle = on ? COP : '#FFFFFF'; c.fill();
        c.lineWidth = 2; c.strokeStyle = on ? '#9A4A24' : P.line2; c.stroke();
        tx(c, s[i], xx + bwid / 2, by + bh / 2 + 2, 30, on ? '#FFFFFF' : '#9AA0AB', { mono: true, w: 700, align: 'center' });
      }
      tx(c, '12 bit', cxn, 392, 18, P.muted, { mono: true, align: 'center', w: 500 });
    }
    function set(S, k, v) { if (k === 'volt') { S.target = clamp(+v, 0, 3.3); S.man = true; } }
    function read(S, k) {
      var n = S.n;
      if (k === 'volt') return vtxt(S.v);
      if (k === 'number') return K.num(n, 0);
      if (k === 'formula') return vtxt(S.v) + ' ÷ 3,3 V × 4.095 ≈ ' + K.num(n, 0);
      if (k === 'bits') { var s = bin(n); return s.slice(0, 4) + ' ' + s.slice(4, 8) + ' ' + s.slice(8); }
      if (k === 'step') return 'Bir basamak ≈ 3,3 V ÷ 4.096 ≈ 0,8 mV';
      if (k === 'explain') {
        if (S.hold) return 'Tam yarı: 1,65 V. İlk bit 1, kalan 11 bit 0 → sayı 2.048.';
        return S.up ? 'Gerilim yükseliyor: merdiven doluyor, sayı 0\'dan 4.095\'e doğru büyüyor.' : 'Gerilim düşüyor: merdiven boşalıyor, sayı küçülüyor.';
      }
      return '';
    }
    return mount(el, { reset: reset, update: update, draw: draw, set: set, read: read });
  });

  /* ==================================================================
   * 4 · switch-yard: 2 bitlik kod bir lambayı seçer (demiryolu makası)
   * ================================================================== */
  K.register('switch-yard', function (el) {
    var NAMES = ['A', 'B', 'C', 'D'];
    var LY = [62, 172, 282, 392], N1 = [470, 227], N2X = 640, J2Y = [117, 337], BAT = [345, 227], LX = 800;
    var PATHS = [];
    var cI;
    for (cI = 0; cI < 4; cI++) {
      var b1 = cI >> 1;
      PATHS.push(mkWire([[BAT[0], BAT[1]], [N1[0], N1[1]], [N1[0], J2Y[b1]], [N2X, J2Y[b1]], [N2X, LY[cI]], [LX, LY[cI]]]));
    }
    var CODES = ['00', '01', '10', '11'];
    function reset(S) {
      S.man = false; S.code = 0; S.k1 = 0; S.k0 = 0; S.front = [0, 0, 0, 0]; S.delay = 0.5; S.lastCode = -1; S.lamp = [0, 0, 0, 0];
    }
    function update(S, t, dt) {
      if (!S.man) S.code = seg(t, [4.5, 4.5, 4.5, 4.5]).i;
      if (S.code !== S.lastCode) { S.lastCode = S.code; S.delay = 0.55; }
      S.delay -= dt;
      S.k1 = approach(S.k1, S.code >> 1, 11, dt);
      S.k0 = approach(S.k0, S.code & 1, 11, dt);
      for (var i = 0; i < 4; i++) {
        if (i === S.code) { if (S.delay <= 0) S.front[i] = Math.min(1, S.front[i] + dt / 1.5); }
        else S.front[i] = Math.max(0, S.front[i] - dt / 0.25);
        S.lamp[i] = approach(S.lamp[i], S.front[i] > 0.985 ? 1 : 0, 10, dt);
      }
    }
    /* makas ibresi: k = 0 yukarı, 1 aşağı */
    function pointer(c, p, k, col, on) {
      var ey = lerp(-1, 1, k) * 40;
      c.save(); c.translate(p[0], p[1]);
      c.globalAlpha *= on ? 1 : 0.5;
      c.lineCap = 'round';
      c.strokeStyle = 'rgba(21,23,28,0.15)'; c.lineWidth = 11;
      c.beginPath(); c.moveTo(3, 4); c.lineTo(3, ey + 4); c.stroke();
      c.strokeStyle = col; c.lineWidth = 8;
      c.beginPath(); c.moveTo(0, 0); c.lineTo(0, ey); c.stroke();
      c.beginPath(); c.arc(0, ey, 8, 0, TAU); c.fillStyle = col; c.fill();
      c.beginPath(); c.arc(0, 0, 13, 0, TAU); c.fillStyle = '#FFFFFF'; c.fill(); c.lineWidth = 4; c.strokeStyle = col; c.stroke();
      c.restore();
    }
    function draw(c, S, t) {
      /* ağ gövdesi (gri) */
      var base = [
        [[BAT[0], BAT[1]], [N1[0], N1[1]]],
        [[N1[0], J2Y[0]], [N1[0], J2Y[1]]],
        [[N1[0], J2Y[0]], [N2X, J2Y[0]]], [[N1[0], J2Y[1]], [N2X, J2Y[1]]],
        [[N2X, LY[0]], [N2X, LY[1]]], [[N2X, LY[2]], [N2X, LY[3]]]
      ], i, w;
      c.save(); c.lineCap = 'round'; c.strokeStyle = '#C9CDD5'; c.lineWidth = 8;
      base.forEach(function (b) { c.beginPath(); c.moveTo(b[0][0], b[0][1]); c.lineTo(b[1][0], b[1][1]); c.stroke(); });
      for (i = 0; i < 4; i++) { c.beginPath(); c.moveTo(N2X, LY[i]); c.lineTo(LX, LY[i]); c.stroke(); }
      c.restore();
      /* canlı yollar */
      for (i = 0; i < 4; i++) wireLive(c, PATHS[i], S.front[i] > 0.001 ? 1 : 0, t, S.front[i], 8, 110);
      /* pil */
      batterySym(c, 310, 227, 62, 96, '9 V');
      /* makas ibreleri */
      pointer(c, N1, S.k1, BLUE, true);
      pointer(c, [N2X, J2Y[0]], S.k0, P.ink, (S.code >> 1) === 0);
      pointer(c, [N2X, J2Y[1]], S.k0, P.ink, (S.code >> 1) === 1);
      /* lambalar */
      for (i = 0; i < 4; i++) {
        bulb(c, LX + 44, LY[i], 34, S.lamp[i]);
        tx(c, CODES[i], LX + 44 + 56, LY[i], 30, i === S.code ? COP : P.muted, { mono: true, w: 700 });
        tx(c, NAMES[i], LX + 44, LY[i] + 1, 26, S.lamp[i] > 0.5 ? P.ink : '#8A909C', { mono: true, w: 700, align: 'center' });
      }
      /* büyük anahtarlar */
      toggleBig(c, 50, 120, 150, 70, S.k1, 'BİT 1 · ilk makas', BLUE);
      toggleBig(c, 50, 300, 150, 70, S.k0, 'BİT 0 · ikinci makas', '#3E434D');
    }
    function parse(v) {
      if (typeof v === 'number') return v === 0 ? 0 : v === 1 ? 1 : v === 10 ? 2 : v === 11 ? 3 : -1;
      var s = String(v); var i = CODES.indexOf(s); return i;
    }
    function set(S, k, v) {
      if (k === 'code') { var i = parse(v); if (i >= 0) { S.code = i; S.man = true; } }
    }
    function read(S, k) {
      var code = CODES[S.code];
      if (k === 'code') return code;
      if (k === 'route') return 'Kod ' + code + ' → ' + NAMES[S.code] + ' lambası yanar';
      if (k === 'explain') return 'Kod ' + code + ': iki bit iki makası çevirir, elektrik ' + NAMES[S.code] + ' lambasına gider.';
      return '';
    }
    return mount(el, { reset: reset, update: update, draw: draw, set: set, read: read });
  });

  /* ==================================================================
   * 5 · logic-gates: VE, VEYA, DEĞİL; tek devre, büyük 0/1 lambası
   * ================================================================== */
  K.register('logic-gates', function (el) {
    var NAMES = { and: 'VE · AND', or: 'VEYA · OR', not: 'DEĞİL · NOT' };
    var SEQ = [];
    ['and', 'or'].forEach(function (g) { [[0, 0], [0, 1], [1, 0], [1, 1]].forEach(function (ab) { SEQ.push({ g: g, a: ab[0], b: ab[1], d: 2.7 }); }); });
    [0, 1, 0, 1].forEach(function (a) { SEQ.push({ g: 'not', a: a, b: 0, d: 2.9 }); });
    var DURS = SEQ.map(function (s) { return s.d; });
    var GROUP = {};
    SEQ.forEach(function (s, i) { var G = GROUP[s.g] || (GROUP[s.g] = { s: 1e9, e: 0 }); });
    (function () { var a = 0; SEQ.forEach(function (s) { var G = GROUP[s.g]; G.s = Math.min(G.s, a); a += s.d; G.e = Math.max(G.e, a); }); })();
    var TOTAL = DURS.reduce(function (x, y) { return x + y; }, 0);
    /* teller: p yol, f: hangi koşulda akım taşır */
    var GW = {
      and: [
        { p: [[140, 170], [140, 110], [300, 110]], f: 'o' }, { p: [[420, 110], [540, 110]], f: 'o' },
        { p: [[660, 110], [930, 110], [930, 158]], f: 'o' }, { p: [[930, 282], [930, 330], [140, 330], [140, 270]], f: 'o' }
      ],
      or: [
        { p: [[140, 170], [140, 110], [240, 110], [400, 110]], f: 'o' },
        { p: [[520, 110], [800, 110]], f: 'a' }, { p: [[240, 110], [240, 220], [400, 220]], f: 'o' }, { p: [[520, 220], [800, 220], [800, 110]], f: 'b' },
        { p: [[800, 110], [930, 110], [930, 158]], f: 'o' }, { p: [[930, 282], [930, 330], [140, 330], [140, 270]], f: 'o' }
      ],
      not: [
        { p: [[140, 170], [140, 110], [300, 110]], f: '1' }, { p: [[440, 110], [720, 110]], f: '1' },
        { p: [[720, 110], [720, 160]], f: 'a' }, { p: [[720, 280], [720, 330]], f: 'a' },
        { p: [[720, 110], [930, 110], [930, 158]], f: 'n' }, { p: [[930, 282], [930, 330], [720, 330]], f: 'n' },
        { p: [[720, 330], [140, 330], [140, 270]], f: '1' }
      ]
    };
    var GWW = {};
    Object.keys(GW).forEach(function (g) { GWW[g] = GW[g].map(function (w) { return mkWire(w.p); }); });
    function out(g, a, b) { return g === 'and' ? (a && b ? 1 : 0) : g === 'or' ? (a || b ? 1 : 0) : (a ? 0 : 1); }
    function reset(S) {
      S.man = false; S.view = null; S.g = 'and'; S.a = 0; S.b = 0; S.ka = 0; S.kb = 0; S.lamp = 0; S.alpha = 0; S.wk = {};
      S.IN = { and_a: 0, and_b: 0, or_a: 0, or_b: 0, not_a: 0 }; S.lastG = null;
      Object.keys(GW).forEach(function (g) { S.wk[g] = GW[g].map(function () { return 0; }); });
    }
    function update(S, t, dt) {
      var g, a, b, al;
      if (S.man) { g = S.view; a = S.IN[g + '_a']; b = g === 'not' ? 0 : S.IN[g + '_b']; al = 1; }
      else {
        var sg = seg(t, DURS), q = SEQ[sg.i], G = GROUP[q.g], tt = sg.tt;
        g = q.g; a = q.a; b = q.b;
        al = sm((tt - G.s) / 0.5) * sm((G.e - tt) / 0.45);
        if (tt >= TOTAL - 1e-6) al = 0;
      }
      if (g !== S.lastG) { S.lastG = g; S.ka = a; S.kb = b; S.lamp = 0; S.wk[g] = GW[g].map(function () { return 0; }); }
      S.g = g; S.a = a; S.b = b; S.alpha = al;
      S.IN[g + '_a'] = a; if (g !== 'not') S.IN[g + '_b'] = b;
      S.ka = approach(S.ka, a, 14, dt); S.kb = approach(S.kb, b, 14, dt);
      var o = out(g, a, b);
      S.o = o;
      S.lamp = approach(S.lamp, o, 10, dt);
      var conds = { o: o, a: a, b: b, n: o, '1': 1 };
      GW[g].forEach(function (w, i) { S.wk[g][i] = approach(S.wk[g][i], conds[w.f], 12, dt); });
    }
    function inChip(c, label, v, x, y, al) {
      chip(c, label + ' = ' + v, x, y, 22, { mono: true, w: 700, fill: v ? COP : '#FFFFFF', color: v ? '#FFFFFF' : P.ink, stroke: v ? '#9A4A24' : P.line2, alpha: al });
    }
    function draw(c, S, t) {
      var g = S.g, al = S.alpha;
      if (al < 0.01) return;
      c.save(); c.globalAlpha *= al;
      tx(c, NAMES[g], 40, 38, 32, P.ink, { w: 700 });
      GWW[g].forEach(function (w) { wireBase(c, w, 8); });
      GWW[g].forEach(function (w, i) { wireLive(c, w, S.wk[g][i], t, 1, 8, 100); });
      batterySym(c, 140, 220, 58, 100, '9 V');
      var o = S.o;
      if (g === 'and') {
        lever(c, 300, 110, 420, 110, S.ka); lever(c, 540, 110, 660, 110, S.kb);
        inChip(c, 'A', S.a, 360, 164); inChip(c, 'B', S.b, 600, 164);
      } else if (g === 'or') {
        lever(c, 400, 110, 520, 110, S.ka); lever(c, 400, 220, 520, 220, S.kb);
        inChip(c, 'A', S.a, 460, 164); inChip(c, 'B', S.b, 460, 274);
      } else {
        resistorSym(c, 300, 110, 440, 36);
        tx(c, 'direnç', 370, 62, 18, P.muted, { align: 'center', w: 500 });
        lever(c, 720, 160, 720, 280, S.ka);
        inChip(c, 'A', S.a, 640, 220);
      }
      bulb(c, 930, 220, 62, S.lamp, o);
      tx(c, 'ÇIKIŞ', 930, 358, 20, P.ink, { align: 'center', w: 700 });
      c.restore();
    }
    function set(S, k, v) {
      var m = /^(and|or|not)_(a|b)$/.exec(k);
      if (m) { S.IN[k] = +v ? 1 : 0; S.view = m[1]; S.man = true; }
      else if (k === 'view' && GW[String(v)]) { S.view = String(v); S.man = true; }
    }
    function read(S, k) {
      var I = S.IN;
      if (k === 'and') return I.and_a + ' VE ' + I.and_b + ' = ' + out('and', I.and_a, I.and_b);
      if (k === 'or') return I.or_a + ' VEYA ' + I.or_b + ' = ' + out('or', I.or_a, I.or_b);
      if (k === 'not') return 'DEĞİL ' + I.not_a + ' = ' + out('not', I.not_a);
      if (k === 'and_a' || k === 'and_b' || k === 'or_a' || k === 'or_b' || k === 'not_a') return String(I[k]);
      if (k === 'explain') {
        var g = S.g, a = S.a, b = S.b, o = S.o;
        if (g === 'and') return 'VE (AND): A = ' + a + ', B = ' + b + ' → çıkış ' + o + '. İki anahtar da kapalıysa lamba yanar.';
        if (g === 'or') return 'VEYA (OR): A = ' + a + ', B = ' + b + ' → çıkış ' + o + '. Biri kapalıysa lamba yanar.';
        return a ? 'DEĞİL (NOT): A = 1 → çıkış 0. Anahtar lambayı kısa devre yapar, lamba söner.' : 'DEĞİL (NOT): A = 0 → çıkış 1. Anahtar açıkken akım lambadan geçer.';
      }
      return '';
    }
    return mount(el, { reset: reset, update: update, draw: draw, set: set, read: read });
  });

  /* ==================================================================
   * 6 · half-adder: yarım toplayıcı, büyük 0/1 sonuç
   * ================================================================== */
  K.register('half-adder', function (el) {
    var WA1 = mkWire([[160, 120], [250, 120], [250, 90], [424, 90]]);
    var WA2 = mkWire([[250, 120], [250, 300], [420, 300]]);
    var WB1 = mkWire([[160, 330], [330, 330], [330, 140], [424, 140]]);
    var WB2 = mkWire([[330, 330], [330, 350], [420, 350]]);
    var WS = mkWire([[576, 115], [700, 115]]);
    var WC = mkWire([[560, 325], [700, 325]]);
    function reset(S) {
      S.man = false; S.a = 0; S.b = 0; S.ka = 0; S.kb = 0; S.pa = 0; S.pb = 0; S.sum = 0; S.car = 0; S.timer = 0;
      S.w = { a: 0, b: 0, s: 0, c: 0 }; S.ls = 0; S.lc = 0;
    }
    function update(S, t, dt) {
      var a = S.a, b = S.b;
      if (!S.man) { var i = seg(t, [4.6, 4.6, 4.6, 4.6]).i; a = i >> 1; b = i & 1; }
      if (a !== S.a || b !== S.b || (t < 0.02 && S.timer === 0 && false)) { S.a = a; S.b = b; S.timer = 0.6; }
      S.timer = Math.max(0, S.timer - dt);
      if (S.timer === 0) { S.sum = S.a ^ S.b; S.car = S.a & S.b; }
      S.ka = approach(S.ka, S.a, 14, dt); S.kb = approach(S.kb, S.b, 14, dt);
      S.w.a = approach(S.w.a, S.a, 10, dt); S.w.b = approach(S.w.b, S.b, 10, dt);
      S.w.s = approach(S.w.s, S.sum, 10, dt); S.w.c = approach(S.w.c, S.car, 10, dt);
      S.ls = approach(S.ls, S.sum, 9, dt); S.lc = approach(S.lc, S.car, 9, dt);
    }
    function draw(c, S, t) {
      [WA1, WA2, WB1, WB2, WS, WC].forEach(function (w) { wireBase(c, w, 7); });
      wireLive(c, WA1, S.w.a, t, 1, 7, 90); wireLive(c, WA2, S.w.a, t, 1, 7, 90);
      wireLive(c, WB1, S.w.b, t, 1, 7, 90); wireLive(c, WB2, S.w.b, t, 1, 7, 90);
      wireLive(c, WS, S.w.s, t, 1, 7, 90); wireLive(c, WC, S.w.c, t, 1, 7, 90);
      [[250, 120], [330, 330]].forEach(function (p) { c.beginPath(); c.arc(p[0], p[1], 6, 0, TAU); c.fillStyle = S.w.a > 0.5 && p[0] === 250 || S.w.b > 0.5 && p[0] === 330 ? COP : '#8E94A0'; c.fill(); });
      /* girişler */
      toggleBig(c, 70, 85, 90, 70, S.ka, null, COP);
      toggleBig(c, 70, 295, 90, 70, S.kb, null, COP);
      tx(c, 'A', 38, 120, 32, P.ink, { w: 700, align: 'center' });
      tx(c, 'B', 38, 330, 32, P.ink, { w: 700, align: 'center' });
      /* kapılar */
      gateShape(c, 'xor', 436, 65, 140, 100, S.w.s);
      gateShape(c, 'and', 420, 275, 140, 100, S.w.c);
      tx(c, 'ÖZEL VEYA', 500, 192, 20, P.ink, { align: 'center', w: 700 });
      tx(c, 'VE', 490, 400, 20, P.ink, { align: 'center', w: 700 });
      /* çıkış lambaları */
      bulb(c, 752, 115, 52, S.ls, S.sum);
      bulb(c, 752, 325, 52, S.lc, S.car);
      tx(c, 'TOPLAM', 752, 38, 20, P.ink, { align: 'center', w: 700 });
      tx(c, 'ELDE', 752, 408, 20, P.ink, { align: 'center', w: 700 });
      /* büyük ikilik sonuç */
      tx(c, 'SONUÇ (İKİLİK)', 980, 128, 16, P.muted, { align: 'center', w: 600 });
      tx(c, String(S.car), 935, 215, 112, S.car ? COP : '#B8BCC6', { mono: true, w: 700, align: 'center' });
      tx(c, String(S.sum), 1025, 215, 112, S.sum ? COP : '#B8BCC6', { mono: true, w: 700, align: 'center' });
      tx(c, S.a + ' + ' + S.b + ' = ' + (S.car ? '10' : String(S.sum)), 980, 305, 28, P.ink, { mono: true, w: 700, align: 'center' });
    }
    function set(S, k, v) {
      if (k === 'a') { S.a = +v ? 1 : 0; S.man = true; }
      if (k === 'b') { S.b = +v ? 1 : 0; S.man = true; }
    }
    function read(S, k) {
      var s = S.sum, cc = S.car;
      if (k === 'a') return String(S.a);
      if (k === 'b') return String(S.b);
      if (k === 'sum') return S.a + ' + ' + S.b + ' = ' + (cc ? '10' : String(s)) + ' (ikilik)';
      if (k === 'decimal') return 'Onluk: ' + (S.a + S.b);
      if (k === 'explain') {
        if (S.a && S.b) return '1 + 1 = 10: toplam 0, VE kapısı eldeyi 1 yapar. İkilikte sonuç 10.';
        if (S.a || S.b) return S.a + ' + ' + S.b + ' = 1: girişler farklı olduğu için ÖZEL VEYA toplam basamağını 1 yapar.';
        return '0 + 0 = 0: iki giriş de 0, toplam 0 ve elde 0.';
      }
      return '';
    }
    return mount(el, { reset: reset, update: update, draw: draw, set: set, read: read });
  });
})();
