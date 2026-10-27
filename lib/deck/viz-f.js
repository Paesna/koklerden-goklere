/* Köklerden Göklere · Builder F: vücut sinyalleri ve elektrik güvenliği
 *
 * hook-eye, hook-nerve, hook-heart, body-neuron, body-ecg,
 * current-scale, breaker, rcd, earthing
 *
 * Fizyoloji eğrileri gerçek değerlerle çizilir:
 *  - EKG: 72 atım/dk (RR = 0,833 s), 25 mm/s ve 10 mm/mV kağıt ölçeği,
 *    P 0,15 mV, QRS ≈ 0,09 s, R 1,1 mV, T 0,3 mV, PR ≈ 0,17 s, QT ≈ 0,38 s.
 *  - Aksiyon potansiyeli: dinlenme −70 mV, eşik ≈ −55 mV, tepe +30 mV,
 *    alt salınım −80 mV, toplam ≈ 2 ms (gösterimde yavaşlatılmış).
 * Güvenlik grafiği IEC 60479-1 (50 Hz) bölgelerinin ders amaçlı sadeleştirmesidir.
 */
(function () {
  'use strict';
  var K = window.KGViz;
  if (!K) return;
  var P = K.palette;
  var TAU = Math.PI * 2;

  /* ------------------------------------------------------------------
   * Ortak yardımcılar
   * ------------------------------------------------------------------ */
  function clamp(x, a, b) { return x < a ? a : x > b ? b : x; }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function span(t, a, b) { return clamp((t - a) / (b - a), 0, 1); }
  function sm(t) { return t * t * (3 - 2 * t); }
  function easeOut(t) { return 1 - Math.pow(1 - t, 3); }
  function easeIn(t) { return t * t * t; }
  function easeInOut(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
  function gauss(x, mu, s) { var d = (x - mu) / s; return Math.exp(-0.5 * d * d); }
  /* frame-rate independent approach toward a target */
  function approach(cur, target, rate, dt) { return cur + (target - cur) * (1 - Math.exp(-rate * dt)); }
  /* label scale for large canvases: 1 at the small card, up to cap at the focus-slide size */
  function kscale(w, h, ref, cap) { return clamp(Math.min(w / ref[0], h / ref[1]), 1, cap || 1.7); }
  function fontsReady() { return !document.fonts || document.fonts.status === 'loaded'; }

  /* ECG, lead II at 72 bpm. tr: seconds relative to the R peak. Sum of Gaussians
   * (McSharry-type model) tuned to textbook intervals and amplitudes. */
  var RR = 60 / 72;
  function ecgBeat(tr) {
    return 0.15 * gauss(tr, -0.165, 0.024) -
      0.10 * gauss(tr, -0.028, 0.008) +
      1.10 * gauss(tr, 0, 0.0095) -
      0.24 * gauss(tr, 0.026, 0.009) +
      0.30 * (tr < 0.245 ? gauss(tr, 0.245, 0.055) : gauss(tr, 0.245, 0.038));
  }
  function ecgAt(t) {
    var k = Math.floor(t / RR + 0.5);
    return ecgBeat(t - k * RR);
  }

  /* Monotone cubic (Fritsch–Carlson) interpolation through key points. */
  function monotone(xs, ys) {
    var n = xs.length, d = [], m = [], i;
    for (i = 0; i < n - 1; i++) d.push((ys[i + 1] - ys[i]) / (xs[i + 1] - xs[i]));
    m[0] = d[0]; m[n - 1] = d[n - 2];
    for (i = 1; i < n - 1; i++) m[i] = d[i - 1] * d[i] <= 0 ? 0 : (d[i - 1] + d[i]) / 2;
    for (i = 0; i < n - 1; i++) {
      if (d[i] === 0) { m[i] = 0; m[i + 1] = 0; continue; }
      var a = m[i] / d[i], b = m[i + 1] / d[i], s = a * a + b * b;
      if (s > 9) { var tau = 3 / Math.sqrt(s); m[i] = tau * a * d[i]; m[i + 1] = tau * b * d[i]; }
    }
    return function (x) {
      if (x <= xs[0]) return ys[0];
      if (x >= xs[n - 1]) return ys[n - 1];
      var lo = 0, hi = n - 1;
      while (hi - lo > 1) { var mid = (lo + hi) >> 1; if (xs[mid] > x) hi = mid; else lo = mid; }
      var h = xs[hi] - xs[lo], t = (x - xs[lo]) / h, t2 = t * t, t3 = t2 * t;
      return (2 * t3 - 3 * t2 + 1) * ys[lo] + (t3 - 2 * t2 + t) * h * m[lo] +
        (-2 * t3 + 3 * t2) * ys[hi] + (t3 - t2) * h * m[hi];
    };
  }

  /* Neuron action potential (ms → mV): rest −70, threshold −55, peak +30, undershoot −80. */
  var apCurve = monotone(
    [0, 1.25, 1.5, 1.7, 1.85, 1.96, 2.04, 2.11, 2.19, 2.28, 2.37, 2.45, 2.52, 2.62, 2.8, 3.0, 3.2, 3.4, 3.6, 3.78, 4.2, 5.0, 6.0, 7.0, 7.6, 8.0],
    [-70, -70, -69.2, -67, -63.5, -59.5, -54.5, -45, -26, 0, 19, 27.6, 30, 26, 7, -23, -53, -73.2, -79.2, -80, -78.6, -75.6, -72.6, -70.7, -70, -70]
  );

  /* Colour set for 2D drawing, following opts.theme (light paper, white card or night). */
  function tone(theme) {
    var d = theme === 'dark';
    return {
      dark: d,
      ink: d ? P.onNight : P.ink,
      ink2: d ? '#C9CFDA' : P.ink2,
      muted: d ? P.onNightMuted : P.muted,
      line: d ? P.nightLine : P.line,
      line2: d ? '#343C4C' : P.line2,
      blue: d ? P.blueLight : P.blue,
      copper: d ? P.copperLight : P.copper,
      bg: d ? P.night : theme === 'card' ? '#FFFFFF' : P.paper
    };
  }
  /* Text on a 2D canvas with optional letter spacing (deck "tag" style). */
  function text(ctx, s, x, y, o) { K.label(ctx, s, x, y, o); }
  function textW(ctx, s, size, weight, mono, spacing) {
    ctx.save();
    ctx.font = K.font(size, weight, mono);
    if ('letterSpacing' in ctx) ctx.letterSpacing = (spacing || 0) + 'px';
    var w = ctx.measureText(s).width;
    ctx.restore();
    return w;
  }

  /* ECG paper grid layer (1 mm minor, 5 mm major), optionally faded at the edges. */
  function ecgGrid(w, h, pxmm, ox, oy, o) {
    var L = K.layer(w, h), c = L.ctx;
    var minorA = o.minor, majorA = o.major;
    c.lineWidth = 1 / Math.max(1, L.k * 0.75);
    var x, y, i;
    function vLines(step, alpha, from) {
      c.strokeStyle = K.rgba(P.copperFill, alpha);
      c.beginPath();
      i = Math.floor((from - ox) / step) - 1;
      for (x = ox + i * step; x <= w + 1; x += step) { c.moveTo(x, 0); c.lineTo(x, h); }
      c.stroke();
    }
    function hLines(step, alpha) {
      c.strokeStyle = K.rgba(P.copperFill, alpha);
      c.beginPath();
      i = Math.floor(-oy / step) - 1;
      for (y = oy + i * step; y <= h + 1; y += step) { c.moveTo(0, y); c.lineTo(w, y); }
      c.stroke();
    }
    vLines(pxmm, minorA, 0); hLines(pxmm, minorA);
    c.lineWidth = Math.max(1, 1.1 / L.k * 1.6);
    vLines(pxmm * 5, majorA, 0); hLines(pxmm * 5, majorA);
    if (o.fade) {
      c.globalCompositeOperation = 'destination-in';
      var g = c.createLinearGradient(0, 0, w, 0);
      g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(o.fade, 'rgba(0,0,0,1)');
      g.addColorStop(1 - o.fade, 'rgba(0,0,0,1)'); g.addColorStop(1, 'rgba(0,0,0,0)');
      c.fillStyle = g; c.fillRect(0, 0, w, h);
      var g2 = c.createLinearGradient(0, 0, 0, h);
      g2.addColorStop(0, 'rgba(0,0,0,0)'); g2.addColorStop(o.fadeY || o.fade, 'rgba(0,0,0,1)');
      g2.addColorStop(1 - (o.fadeY || o.fade), 'rgba(0,0,0,1)'); g2.addColorStop(1, 'rgba(0,0,0,0)');
      c.fillStyle = g2; c.fillRect(0, 0, w, h);
      c.globalCompositeOperation = 'source-over';
    }
    return L;
  }

  /* ==================================================================
   * hook-heart · 256×150 · light · 2D
   * A monitor-style ECG at 72 bpm, real time, scrolling past a fixed pen.
   * ================================================================== */
  K.register('hook-heart', function (el, opts) {
    var sf = K.surface(el), ctx = sf.ctx;
    var C = tone(opts.theme || 'light');
    var grid = null, gridKey = '';
    function draw(t) {
      var w = sf.w, h = sf.h;
      var PXMM = clamp(h / 30, 5, 16), PPS = 25 * PXMM, PMV = 10 * PXMM, ks = clamp(PXMM / 5, 1, 2.2);
      var key = w + 'x' + h + '@' + sf.k;
      var base = Math.round(h * 0.64) + 0.5;
      if (key !== gridKey) { grid = ecgGrid(w, h, PXMM, 0.5, base, { minor: 0.06, major: 0.17, fade: 0.08, fadeY: 0.1 }); gridKey = key; }
      sf.clear();
      ctx.drawImage(grid.canvas, 0, 0, w, h);
      var xh = w - 26 * ks;
      var tt = K.reducedMotion ? 0.62 : t + 0.62;
      /* trace */
      var g = ctx.createLinearGradient(0, 0, xh, 0);
      g.addColorStop(0, K.rgba(C.ink, 0));
      g.addColorStop(0.32, K.rgba(C.ink, 0.85));
      g.addColorStop(1, K.rgba(C.ink, 1));
      ctx.save();
      ctx.strokeStyle = g;
      ctx.lineWidth = 1.7 * Math.min(ks, 1.9);
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      ctx.beginPath();
      for (var x = 0; x <= xh; x += 0.25) {
        var y = base - ecgAt(tt - (xh - x) / PPS) * PMV;
        if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.restore();
      /* pen */
      var yh = base - ecgAt(tt) * PMV;
      K.drawGlow(ctx, P.copperFill, xh, yh, 11 * ks, 0.35);
      ctx.fillStyle = C.ink;
      ctx.beginPath(); ctx.arc(xh, yh, 2.4 * Math.min(ks, 1.9), 0, TAU); ctx.fill();
      text(ctx, 'EKG', 10 * ks, 17 * ks, { size: Math.min(18, 11 * ks), weight: 600, mono: true, color: C.muted, spacing: 1.3 });
    }
    return {
      reset: function () { },
      frame: function (t) { if (!K.skipRender) draw(t); },
      resize: function () { sf.resize(); gridKey = ''; },
      dispose: function () { sf.dispose(); }
    };
  });

  /* ==================================================================
   * body-ecg · 325×150 · card · 2D
   * ECG paper (1 mm grid), 1 mV calibration pulse, 72 bpm sweep.
   * ================================================================== */
  K.register('body-ecg', function (el, opts) {
    var sf = K.surface(el), ctx = sf.ctx;
    var SWEEP = 3 * RR;            /* 2,5 s: beats land at the same place every sweep */
    var grid = null, gridKey = '';
    var R0 = 0.40;                 /* time of the first R peak inside a sweep */
    function draw(t) {
      var w = sf.w, h = sf.h;
      var PXMM = clamp(Math.min(h / 37.5, (w - 40) / (SWEEP * 25 + 17)), 4, 16), PPS = 25 * PXMM, PMV = 10 * PXMM;
      var ks = clamp(PXMM / 4, 1, 1.65);
      function fz(n) { return n * ks; }
      var key = w + 'x' + h + '@' + sf.k;
      var base = Math.round(h * 0.69);
      var x0 = Math.min(w - 12 - SWEEP * PPS, (w - SWEEP * PPS) / 2 + 30);     /* sweep window start */
      if (key !== gridKey) {
        grid = K.layer(w, h);
        var c = grid.ctx;
        K.rr(c, 0.5, 0.5, w - 1, h - 1, 10);
        c.fillStyle = '#FDFBF8';
        c.fill();
        c.save();
        K.rr(c, 0.5, 0.5, w - 1, h - 1, 10);
        c.clip();
        var gl = ecgGrid(w, h, PXMM, x0, base, { minor: 0.1, major: 0.26 });
        c.drawImage(gl.canvas, 0, 0, w, h);
        c.restore();
        K.rr(c, 0.5, 0.5, w - 1, h - 1, 10);
        c.strokeStyle = K.rgba(P.copperFill, 0.35);
        c.lineWidth = 1;
        c.stroke();
        gridKey = key;
      }
      sf.clear();
      ctx.drawImage(grid.canvas, 0, 0, w, h);

      ctx.save();
      ctx.strokeStyle = P.ink;
      ctx.lineWidth = 1.6 * Math.min(ks * 1.2, 2.4);
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      /* calibration pulse: 1 mV high, 0,2 s wide */
      var cx = x0 - 40 * ks;
      ctx.beginPath();
      ctx.moveTo(cx - 6, base);
      ctx.lineTo(cx, base);
      ctx.lineTo(cx, base - PMV);
      ctx.lineTo(cx + 0.2 * PPS, base - PMV);
      ctx.lineTo(cx + 0.2 * PPS, base);
      ctx.lineTo(cx + 0.2 * PPS + 8, base);
      ctx.stroke();

      /* sweep: current pass left of the pen, previous pass right of the erase gap */
      var ts = K.reducedMotion ? SWEEP - 0.001 : t % SWEEP;
      var xp = x0 + ts * PPS;
      var gap = 14 * ks;
      ctx.beginPath();
      var started = false, x, y;
      for (x = x0; x <= x0 + SWEEP * PPS; x += 0.25) {
        if (x > xp && x < xp + gap) { started = false; continue; }
        y = base - ecgAt((x - x0) / PPS - R0) * PMV;
        if (!started) { ctx.moveTo(x, y); started = true; } else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.restore();
      if (!K.reducedMotion) {
        var yp = base - ecgAt(ts - R0) * PMV;
        K.drawGlow(ctx, P.copperFill, xp, yp, 10 * ks * 1.3, 0.4);
        ctx.fillStyle = P.ink;
        ctx.beginPath(); ctx.arc(xp, yp, 2.3 * ks * 1.3, 0, TAU); ctx.fill();
      }

      /* labels */
      text(ctx, '1 mV', cx + 0.1 * PPS, base - PMV - 8 * ks, { size: fz(11), weight: 600, mono: true, color: P.ink2, align: 'center' });
      var xr1 = x0 + R0 * PPS, xr2 = xr1 + RR * PPS;
      var yb = base - 1.1 * PMV - 9 * ks;
      ctx.save();
      ctx.strokeStyle = P.ink2; ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(xr1, yb - 4 * ks); ctx.lineTo(xr1, yb + 4 * ks);
      ctx.moveTo(xr2, yb - 4 * ks); ctx.lineTo(xr2, yb + 4 * ks);
      ctx.moveTo(xr1, yb); ctx.lineTo(xr2, yb);
      ctx.stroke();
      ctx.restore();
      text(ctx, '0,83 s', (xr1 + xr2) / 2, yb - 6 * ks, { size: fz(12), weight: 600, mono: true, color: P.ink2, align: 'center' });
      /* wave names on the first beat */
      var pY = base - 0.15 * PMV - 7 * ks;
      text(ctx, 'P', xr1 - 0.165 * PPS, pY, { size: fz(11.5), weight: 600, mono: true, color: P.ink2, align: 'center' });
      text(ctx, 'QRS', xr1, base + 0.24 * PMV + 14 * ks, { size: fz(11.5), weight: 600, mono: true, color: P.ink2, align: 'center' });
      text(ctx, 'T', xr1 + 0.245 * PPS, base - 0.3 * PMV - 7 * ks, { size: fz(11.5), weight: 600, mono: true, color: P.ink2, align: 'center' });
      text(ctx, '72 atım/dk', w - 12, 19 * ks, { size: fz(13), weight: 600, mono: true, color: P.ink, align: 'right' });
      text(ctx, '60 s ÷ 0,83 s', w - 12, 38 * ks, { size: fz(12), weight: 500, mono: true, color: P.ink2, align: 'right' });
    }
    return {
      reset: function () { },
      frame: function (t) { if (!K.skipRender) draw(t); },
      resize: function () { sf.resize(); gridKey = ''; },
      dispose: function () { sf.dispose(); }
    };
  });

  /* ==================================================================
   * body-neuron · 325×150 · card · 2D
   * Membrane potential of one action potential, swept by a cursor every 2,5 s.
   * ================================================================== */
  K.register('body-neuron', function (el, opts) {
    var sf = K.surface(el), ctx = sf.ctx;
    var C = tone(opts.theme || 'card');
    var PERIOD = 2.5, WIN = 8;   /* 8 ms window shown per 2,5 s */
    function draw(t) {
      var w = sf.w, h = sf.h;
      var ks = kscale(w, h, [325, 150], 1.65);
      var xL = 62 * ks, xR = w - 12 * ks, yT = 14 * ks, yB = h - 22 * ks;
      var vTop = 40, vBot = -88;
      function X(ms) { return xL + ms / WIN * (xR - xL); }
      function Y(mv) { return yT + (vTop - mv) / (vTop - vBot) * (yB - yT); }
      sf.clear();
      /* reference lines */
      ctx.save();
      ctx.lineWidth = 1;
      ctx.strokeStyle = C.line2;
      ctx.setLineDash([2, 3]);
      ctx.beginPath();
      ctx.moveTo(xL, Math.round(Y(0)) + 0.5); ctx.lineTo(xR, Math.round(Y(0)) + 0.5);
      ctx.moveTo(xL, Math.round(Y(30)) + 0.5); ctx.lineTo(xR, Math.round(Y(30)) + 0.5);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.strokeStyle = C.line;
      ctx.beginPath();
      ctx.moveTo(xL, Math.round(Y(-70)) + 0.5); ctx.lineTo(xR, Math.round(Y(-70)) + 0.5);
      ctx.stroke();
      /* y axis */
      ctx.strokeStyle = C.line2;
      ctx.beginPath(); ctx.moveTo(xL - 0.5, yT - 4); ctx.lineTo(xL - 0.5, yB + 2); ctx.stroke();
      ctx.restore();
      var tick = { size: 11 * ks, weight: 500, mono: true, color: C.ink2, align: 'right', baseline: 'middle' };
      text(ctx, '+30 mV', xL - 7 * ks, Y(30), tick);
      text(ctx, '0', xL - 7 * ks, Y(0), tick);
      text(ctx, '−70 mV', xL - 7 * ks, Y(-70), tick);

      var ph = K.reducedMotion ? 0.999 : (t % PERIOD) / PERIOD;
      var cur = ph * WIN * 1.0;
      /* ghost of the full trace */
      ctx.save();
      ctx.lineJoin = 'round'; ctx.lineCap = 'round';
      ctx.strokeStyle = K.rgba(C.ink, 0.14);
      ctx.lineWidth = 1.6 * ks;
      ctx.beginPath();
      var ms, first = true;
      for (ms = 0; ms <= WIN; ms += 0.01) {
        if (first) { ctx.moveTo(X(ms), Y(apCurve(ms))); first = false; } else ctx.lineTo(X(ms), Y(apCurve(ms)));
      }
      ctx.stroke();
      /* live trace up to the cursor */
      ctx.strokeStyle = C.ink;
      ctx.lineWidth = 1.9 * ks;
      ctx.beginPath();
      first = true;
      for (ms = 0; ms <= cur; ms += 0.01) {
        if (first) { ctx.moveTo(X(ms), Y(apCurve(ms))); first = false; } else ctx.lineTo(X(ms), Y(apCurve(ms)));
      }
      ctx.lineTo(X(cur), Y(apCurve(cur)));
      ctx.stroke();
      ctx.restore();
      /* cursor */
      var cxp = X(cur), cyp = Y(apCurve(cur));
      ctx.save();
      ctx.strokeStyle = K.rgba(C.ink, 0.12);
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(Math.round(cxp) + 0.5, Math.min(cyp + 6, yB + 2)); ctx.lineTo(Math.round(cxp) + 0.5, yB + 2); ctx.stroke();
      ctx.restore();
      K.drawGlow(ctx, P.copperFill, cxp, cyp, 10 * ks, 0.45);
      ctx.fillStyle = C.ink;
      ctx.beginPath(); ctx.arc(cxp, cyp, 2.6 * ks, 0, TAU); ctx.fill();

      /* ion annotations appear when the cursor reaches each phase */
      var aNa = K.reducedMotion ? 1 : span(cur, 2.0, 2.3) * (1 - span(ph, 0.93, 0.99));
      var aK = K.reducedMotion ? 1 : span(cur, 2.7, 3.0) * (1 - span(ph, 0.93, 0.99));
      text(ctx, 'Na⁺ içeri', X(2.12) - 8 * ks, Y(-10), { size: 11.5 * ks, weight: 600, color: C.copper, align: 'right', baseline: 'middle', alpha: aNa });
      text(ctx, 'K⁺ dışarı', X(2.95) + 8 * ks, Y(-10), { size: 11.5 * ks, weight: 600, color: C.copper, align: 'left', baseline: 'middle', alpha: aK });
      /* time scale and pacing note */
      var sx = X(WIN) - (X(1) - X(0));
      ctx.save();
      ctx.strokeStyle = C.ink2; ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(sx, h - 9.5 * ks); ctx.lineTo(X(WIN), h - 9.5 * ks);
      ctx.moveTo(sx + 0.5, h - 13 * ks); ctx.lineTo(sx + 0.5, h - 6 * ks);
      ctx.moveTo(X(WIN) - 0.5, h - 13 * ks); ctx.lineTo(X(WIN) - 0.5, h - 6 * ks);
      ctx.stroke();
      ctx.restore();
      text(ctx, '1 ms', sx - 6 * ks, h - 9.5 * ks, { size: 11 * ks, weight: 500, mono: true, color: C.ink2, align: 'right', baseline: 'middle' });
      text(ctx, 'yavaşlatılmış', xL, h - 9.5 * ks, { size: 11 * ks, weight: 500, mono: true, color: C.muted, align: 'left', baseline: 'middle', spacing: 1.3 });
    }
    return {
      reset: function () { },
      frame: function (t) { if (!K.skipRender) draw(t); },
      resize: function () { sf.resize(); },
      dispose: function () { sf.dispose(); }
    };
  });

  /* ------------------------------------------------------------------
   * 3D helpers
   * ------------------------------------------------------------------ */
  function V3(x, y, z) { return new window.THREE.Vector3(x, y, z); }
  /* Rounded box: extruded rounded rectangle with a soft bevel, centred on the origin. */
  function roundBox(w, h, d, r, bevel, segs) {
    var THREE = window.THREE;
    bevel = bevel === undefined ? Math.min(w, h, d) * 0.08 : bevel;
    r = Math.min(r, w / 2 - bevel - 1e-3, h / 2 - bevel - 1e-3);
    var x = -w / 2 + bevel, y = -h / 2 + bevel, W = w - 2 * bevel, H = h - 2 * bevel;
    var s = new THREE.Shape();
    s.moveTo(x + r, y);
    s.lineTo(x + W - r, y); s.quadraticCurveTo(x + W, y, x + W, y + r);
    s.lineTo(x + W, y + H - r); s.quadraticCurveTo(x + W, y + H, x + W - r, y + H);
    s.lineTo(x + r, y + H); s.quadraticCurveTo(x, y + H, x, y + H - r);
    s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
    var g = new THREE.ExtrudeGeometry(s, { depth: Math.max(1e-3, d - 2 * bevel), bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel, bevelSegments: segs || 3, curveSegments: 6 });
    g.translate(0, 0, -(d - 2 * bevel) / 2);
    g.computeVertexNormals();
    return g;
  }
  /* Soft round sprite texture for glows (normal blending: visible on light paper). */
  var glowTexCache = {};
  function glowTexture(hex) {
    if (glowTexCache[hex]) return glowTexCache[hex];
    var THREE = window.THREE;
    var c = document.createElement('canvas'); c.width = c.height = 128;
    var g = c.getContext('2d');
    var gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    gr.addColorStop(0, K.rgba(hex, 1)); gr.addColorStop(0.25, K.rgba(hex, 0.55));
    gr.addColorStop(0.6, K.rgba(hex, 0.14)); gr.addColorStop(1, K.rgba(hex, 0));
    g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
    var tex = new THREE.CanvasTexture(c);
    tex.encoding = THREE.sRGBEncoding;
    glowTexCache[hex] = tex;
    return tex;
  }
  function glowSprite(hex, size, opacity) {
    var THREE = window.THREE;
    var m = new THREE.SpriteMaterial({ map: glowTexture(hex), transparent: true, opacity: opacity === undefined ? 1 : opacity, depthWrite: false, toneMapped: false });
    var s = new THREE.Sprite(m);
    s.scale.set(size, size, 1);
    return s;
  }
  /* Optional camera override for close inspection: opts.view = {yaw, pitch, distance, target}. */
  function viewOpt(opts, home) {
    var o = opts && opts.view;
    if (!o) return home;
    return {
      yaw: o.yaw === undefined ? home.yaw : o.yaw,
      pitch: o.pitch === undefined ? home.pitch : o.pitch,
      distance: o.distance === undefined ? home.distance : o.distance,
      target: o.target || home.target
    };
  }
  /* DOM writes only when the value changes (avoids forcing layout every frame). */
  function setStyle(el, prop, val) {
    var key = '_kg_' + prop;
    if (el[key] !== val) { el[key] = val; el.style[prop] = val; }
  }
  function setText(L, s) {
    if (L._kgText !== s) { L._kgText = s; L.set(s); }
  }
  /* A DOM label at a fixed position inside the visual (same styles as v.label). */
  function fixedLabel(v, s, cls, x, y, align) {
    var host = v.el.querySelector('.kg-labels') || v.el;
    var d = document.createElement('div');
    d.className = 'kg-l ' + (cls || 'note chip');
    d.textContent = s;
    host.appendChild(d);
    var L = {
      el: d,
      place: function () {
        var w = align === 'right' || align === 'center' ? d.offsetWidth : 0;
        var px = align === 'right' ? x - w : align === 'center' ? x - w / 2 : x;
        setStyle(d, 'transform', 'translate(' + Math.round(px) + 'px,' + Math.round(y) + 'px)');
      },
      opacity: function (a) { setStyle(d, 'opacity', a); }
    };
    L.place();
    return L;
  }
  /* Small fixed tag in the deck's "tag" style, drawn on the overlay canvas. */
  function cornerTag(ctx, s, x, y, dark, align) {
    text(ctx, s, x, y, { size: 11, weight: 500, mono: true, color: dark ? P.onNightMuted : P.muted, spacing: 1.3, align: align || 'left', baseline: 'middle' });
  }
  /* Focus-slide size: labels grow to 18 px and bold; small cards keep their original size. */
  function bigLab(v, L, px) {
    if (v.w >= 700 && L && L.el) { L.el.style.fontSize = (px || 18) + 'px'; L.el.style.fontWeight = '600'; L.el.style.letterSpacing = '0'; if (!/note|value/.test(L.el.className)) L.el.style.color = '#15171C'; }
    return L;
  }
  /* Project a world point into the visual's CSS px (after v.render). */
  function proj(v, p, out) {
    var q = v.project(p);
    out.x = q.x; out.y = q.y; out.ok = q.visible;
    return out;
  }

  /* ==================================================================
   * hook-eye · 256×150 · light · 3D
   * Half-cut human eye: cornea, iris, lens, retina, optic nerve. Two rays
   * refract (traced with Snell's law, lens n ≈ 1,425) and focus on the
   * fovea; the retina responds and a signal leaves along the optic nerve.
   * ================================================================== */
  K.register('hook-eye', function (el, opts) {
    var THREE = window.THREE;
    var theme = opts.theme || 'light';
    var dark = theme === 'dark';
    var HOME = viewOpt(opts, { yaw: -0.2, pitch: 0.1, distance: 68, target: [3.4, -0.4, 0] });
    var v = K.stage3d(el, {
      theme: theme, fov: 24, distance: HOME.distance, yaw: HOME.yaw, pitch: HOME.pitch, target: HOME.target,
      size: 14, shadows: false, minYaw: -0.9, maxYaw: 0.4, minPitch: -0.2, maxPitch: 0.6,
      minDistance: 50, maxDistance: 100
    });
    if (v.lights) { v.lights.key.intensity = 1.25; v.lights.fill.intensity = 0.5; v.lights.hemi.intensity = 0.5; }
    var eye = new THREE.Group();
    eye.rotation.z = Math.PI / 2;            /* lathe axis (h) → world −x: the cornea faces left */
    v.scene.add(eye);

    var PHI0 = Math.atan2(5.8, 10.5);        /* limbus on the 12 mm globe */
    var PHI_ORA = 0.92;                      /* ora serrata: front edge of the retina */
    var RS = 12, RC = 11.15, RCH = 10.8, RV = 10.4;

    function arcPts(R, c, a0, a1, n) {
      var out = [];
      for (var i = 0; i <= n; i++) { var a = a0 + (a1 - a0) * i / n; out.push(new THREE.Vector2(Math.abs(R * Math.sin(a)), c + R * Math.cos(a))); }
      return out;
    }
    function lathe(pts, mat, seg) {
      var m = new THREE.Mesh(new THREE.LatheGeometry(pts, seg || 72, Math.PI / 2, Math.PI), mat);
      eye.add(m);
      return m;
    }
    function band(R1, R2, a0, a1, n) {
      var s = new THREE.Shape(), i, a;
      for (i = 0; i <= n; i++) { a = a0 + (a1 - a0) * i / n; if (i === 0) s.moveTo(R1 * Math.sin(a), R1 * Math.cos(a)); else s.lineTo(R1 * Math.sin(a), R1 * Math.cos(a)); }
      for (i = n; i >= 0; i--) { a = a0 + (a1 - a0) * i / n; s.lineTo(R2 * Math.sin(a), R2 * Math.cos(a)); }
      return s;
    }
    function face(shape, mat, z) {
      var m = new THREE.Mesh(new THREE.ShapeGeometry(shape, 24), mat);
      m.position.z = z || 0;
      eye.add(m);
      return m;
    }
    function polyShape(pts) {
      var s = new THREE.Shape();
      pts.forEach(function (p, i) { if (i === 0) s.moveTo(p[0], p[1]); else s.lineTo(p[0], p[1]); });
      return s;
    }
    function mirrorX(pts) { return pts.map(function (p) { return [-p[0], p[1]]; }); }

    /* materials */
    var mSclera = K.mat.std(0xEDE6DA, 0.5, 0, { side: THREE.DoubleSide, envMapIntensity: 0.8 });
    var mScleraCut = K.mat.std(0xEBE2D3, 0.75, 0, { envMapIntensity: 0.5 });
    var mEdge = K.mat.std(0xB9AA93, 0.8, 0, { envMapIntensity: 0.3 });
    var mChoroid = K.mat.std(0x6E2A22, 0.6, 0, { envMapIntensity: 0.3 });
    var mRetinaCut = K.mat.std(0xD9876A, 0.6, 0, { envMapIntensity: 0.3 });
    /* fundus: v runs from the ora serrata (0) to the back pole (1) */
    var retinaTex = K.textTexture(64, 256, function (g, w, h) {
      var gr = g.createLinearGradient(0, 0, 0, h);
      gr.addColorStop(0, '#E39A73');
      gr.addColorStop(0.5, '#D6774F');
      gr.addColorStop(0.86, '#C9643F');
      gr.addColorStop(0.95, '#A84E30');     /* macula */
      gr.addColorStop(1, '#8E3F26');        /* fovea */
      g.fillStyle = gr; g.fillRect(0, 0, w, h);
    });
    var mRetina = K.mat.std(0xFFFFFF, 0.85, 0, { map: retinaTex, side: THREE.DoubleSide, envMapIntensity: 0.25 });
    var mIris = K.mat.std(0xC9B8AA, 0.6, 0, {
      side: THREE.DoubleSide, envMapIntensity: 0.4,
      map: K.textTexture(512, 32, function (g, w, h) {
        g.fillStyle = '#6D4A34'; g.fillRect(0, 0, w, h);
        var rng = K.rng(31);
        for (var i = 0; i < 260; i++) {
          var x = rng() * w;
          g.fillStyle = rng() < 0.5 ? 'rgba(150,108,72,0.55)' : 'rgba(58,36,24,0.45)';
          g.fillRect(x, 0, 1 + rng() * 1.6, h);
        }
        var gr = g.createLinearGradient(0, 0, 0, h);
        gr.addColorStop(0, 'rgba(40,24,16,0.55)'); gr.addColorStop(0.35, 'rgba(40,24,16,0)');
        gr.addColorStop(0.8, 'rgba(40,24,16,0)'); gr.addColorStop(1, 'rgba(30,18,12,0.7)');
        g.fillStyle = gr; g.fillRect(0, 0, w, h);
      })
    });
    var mIrisCut = K.mat.std(0x4E3324, 0.6, 0);
    var mCiliary = K.mat.std(0x6E3328, 0.65, 0, { side: THREE.DoubleSide, envMapIntensity: 0.3 });
    var mCiliaryCut = K.mat.std(0x7E3D31, 0.7, 0, { envMapIntensity: 0.3 });
    var mCornea = new THREE.MeshPhysicalMaterial({ color: 0xC9E0EC, roughness: 0.05, metalness: 0, transparent: true, opacity: 0.4, clearcoat: 1, clearcoatRoughness: 0.04, envMapIntensity: 1.6, depthWrite: false, side: THREE.DoubleSide });
    var mCorneaCut = K.mat.std(0xA9CBDE, 0.3, 0, { transparent: true, opacity: 0.9, envMapIntensity: 0.6 });
    var mLens = new THREE.MeshPhysicalMaterial({ color: 0xF0DFB8, roughness: 0.1, metalness: 0, transparent: true, opacity: 0.5, clearcoat: 1, clearcoatRoughness: 0.08, envMapIntensity: 1.2, depthWrite: false, side: THREE.DoubleSide });
    var mLensCut = K.mat.std(0xEAD3A2, 0.4, 0, { transparent: true, opacity: 0.92, envMapIntensity: 0.5 });
    var mLensEdge = K.mat.std(0xC9A86A, 0.6, 0, { envMapIntensity: 0.4 });
    var mNerve = K.mat.std(0xFFFFFF, 0.6, 0, {
      map: K.textTexture(256, 32, function (g, w, h) {
        g.fillStyle = '#E6D9BF'; g.fillRect(0, 0, w, h);
        var rng = K.rng(5);
        for (var y = 0; y < h; y += 2) { g.fillStyle = rng() < 0.5 ? 'rgba(255,250,238,0.5)' : 'rgba(190,170,135,0.25)'; g.fillRect(0, y, w, 1); }
      })
    });
    var mDisc = K.mat.std(0xF2D8A6, 0.6, 0, { emissive: 0x3A2A10, emissiveIntensity: 0.25, envMapIntensity: 0.3 });

    /* sclera, choroid, retina */
    lathe(arcPts(RS, 0, Math.PI, PHI0, 56), mSclera);
    lathe(arcPts(RV, 0, PHI_ORA, Math.PI, 48), mRetina);
    face(band(RS, RC, PHI0, TAU - PHI0, 96), mScleraCut);
    face(band(RS + 0.2, RS, PHI0, TAU - PHI0, 96), mEdge);
    face(band(RC, RCH, PHI_ORA, TAU - PHI_ORA, 80), mChoroid, 0.005);
    face(band(RCH, RV, PHI_ORA, TAU - PHI_ORA, 80), mRetinaCut, 0.01);

    /* cornea: anterior R 7,8 mm, posterior R 6,8 mm */
    var CA = 5.285, RA = 7.8, CP = 5.735, RP = 6.8;
    var alpha = Math.atan2(5.8, 10.5 - CA);
    var beta = Math.atan2(RC * Math.sin(PHI0), RC * Math.cos(PHI0) - CP);
    var corneaFront = [];
    for (var i = 0; i <= 28; i++) { var a = alpha * (1 - i / 28); corneaFront.push(new THREE.Vector2(RA * Math.sin(a), CA + RA * Math.cos(a))); }
    lathe(corneaFront, mCornea);
    var cs = [];
    for (i = 0; i <= 40; i++) { a = alpha - 2 * alpha * i / 40; cs.push([RA * Math.sin(a), CA + RA * Math.cos(a)]); }
    for (i = 0; i <= 40; i++) { a = -beta + 2 * beta * i / 40; cs.push([RP * Math.sin(a), CP + RP * Math.cos(a)]); }
    face(polyShape(cs), mCorneaCut, 0.012);

    /* iris (pupil Ø 3,6 mm) */
    lathe([new THREE.Vector2(5.55, 9.72), new THREE.Vector2(3.6, 9.8), new THREE.Vector2(1.8, 9.7)], mIris, 64);
    var irisPoly = [[1.8, 9.36], [3.6, 9.42], [5.55, 9.48], [5.55, 9.72], [3.6, 9.8], [1.8, 9.7]];
    face(polyShape(irisPoly), mIrisCut, 0.014);
    face(polyShape(mirrorX(irisPoly).reverse()), mIrisCut, 0.014);

    /* ciliary body */
    var cil = [[RC * Math.sin(0.56), RC * Math.cos(0.56)], [6.3, 8.45], [RV * Math.sin(PHI_ORA), RV * Math.cos(PHI_ORA)], [RC * Math.sin(PHI_ORA), RC * Math.cos(PHI_ORA)]];
    lathe([3, 2, 1, 0].map(function (k) { return new THREE.Vector2(cil[k][0], cil[k][1]); }), mCiliary, 64);
    face(polyShape(cil), mCiliaryCut, 0.008);
    face(polyShape(mirrorX(cil).reverse()), mCiliaryCut, 0.008);

    /* lens: anterior R 10 (apex 9,5), posterior R 6 (apex 5,5) */
    var lensPts = [], lensCut = [];
    var REQ = 4.97;
    for (i = 0; i <= 24; i++) { var r = REQ * i / 24; lensPts.push(new THREE.Vector2(r, 11.5 - Math.sqrt(36 - r * r))); }
    for (i = 24; i >= 0; i--) { r = REQ * i / 24; lensPts.push(new THREE.Vector2(r, -0.5 + Math.sqrt(100 - r * r))); }
    lathe(lensPts, mLens, 64);
    for (i = 24; i >= -24; i--) { r = REQ * i / 24; lensCut.push([r, 11.5 - Math.sqrt(36 - r * r)]); }
    for (i = -24; i <= 24; i++) { r = REQ * i / 24; lensCut.push([r, -0.5 + Math.sqrt(100 - r * r)]); }
    /* lens capsule edge: the same outline, 0,12 mm larger */
    var lensEdge = lensCut.map(function (p) {
      var cy = 8.0, dx = p[0], dy = p[1] - cy, L = Math.sqrt(dx * dx + dy * dy) || 1;
      return [p[0] + dx / L * 0.13, p[1] + dy / L * 0.13];
    });
    var lensRing = polyShape(lensEdge);
    lensRing.holes.push(new THREE.Path(lensCut.slice().reverse().map(function (p) { return new THREE.Vector2(p[0], p[1]); })));
    face(lensRing, mLensEdge, 0.02);
    face(polyShape(lensCut), mLensCut, 0.02);

    /* optic nerve (world coordinates), leaving the back of the globe below the axis, behind the cut */
    var discDir = V3(Math.cos(0.26), -Math.sin(0.26), -0.16).normalize();
    var discIn = discDir.clone().multiplyScalar(RV - 0.02);
    var nerveCurve = new THREE.CatmullRomCurve3([
      discDir.clone().multiplyScalar(RC - 0.6),
      discDir.clone().multiplyScalar(RS + 2.4),
      V3(17.5, -5.4, -2.3), V3(22, -7.1, -2.7),V3(26, -8.6, -2.9)
    ]);
    var nerve = new THREE.Mesh(new THREE.TubeGeometry(nerveCurve, 80, 1.7, 20, false), mNerve);
    v.scene.add(nerve);
    var nEnd = new THREE.Mesh(new THREE.SphereGeometry(1.7, 20, 12), mNerve);
    nEnd.position.copy(nerveCurve.getPointAt(1));
    v.scene.add(nEnd);
    var disc = new THREE.Mesh(new THREE.CircleGeometry(0.85, 28), mDisc);
    disc.position.copy(discDir.clone().multiplyScalar(RV - 0.05));
    disc.lookAt(0, 0, 0);
    v.scene.add(disc);

    /* light paths (eye coordinates [h, r]) from the Snell trace */
    var RAY = [[40, 1.4], [12.958, 1.4], [12.395, 1.372], [9.423, 1.238], [5.592, 1.046], [-10.4, 0]];
    var rays = [0, 1].map(function (s) {
      var sg = s ? -1 : 1;
      var pts = RAY.map(function (p) { return V3(-p[0], sg * p[1], 0.05); });
      var len = [0];
      for (var j = 1; j < pts.length; j++) len.push(len[j - 1] + pts[j].distanceTo(pts[j - 1]));
      return { pts: pts, len: len, total: len[len.length - 1] };
    });
    var fovea = V3(RV - 0.02, 0, 0);
    /* signal path: fovea → along the retina → optic disc → along the nerve */
    var sigPts = [];
    var fv = V3(1, 0, 0);
    for (i = 0; i <= 12; i++) {
      var q = new THREE.Vector3().copy(fv).lerp(discDir, i / 12).normalize().multiplyScalar(RV - 0.05);
      sigPts.push(q);
    }
    var nervePts = nerveCurve.getPoints(40);
    for (i = 1; i < nervePts.length; i++) sigPts.push(nervePts[i]);
    var sigCurve = new THREE.CatmullRomCurve3(sigPts);
    var sigLen = sigCurve.getLength();
    var wallA = (fovea.distanceTo(discIn) + 0.2) / sigLen;          /* entering the wall */
    var wallB = wallA + (RS + 0.6 - RV) / sigLen;                   /* leaving the globe */

    var P2 = { x: 0, y: 0, ok: true }, P3 = { x: 0, y: 0, ok: true };
    /* the one anatomical name the slide text uses */
    var big = v.w >= 700;
    bigLab(v, v.label(big ? 'retina' : 'retina', { at: [RCH * Math.cos(0.62), RCH * Math.sin(0.62), 0.1], cls: big ? 'name' : 'tag', align: 'left', dx: 18, dy: -14, line: true }));
    if (big) {
      bigLab(v, v.label('kornea', { at: [-11.7, 4.6, 0.1], cls: 'name', align: 'right', dx: -34, dy: -26, line: true }));
      bigLab(v, v.label('mercek', { at: [-7.6, -3.6, 0.1], cls: 'name', align: 'right', dx: -70, dy: 44, line: true }));
      bigLab(v, v.label('görme siniri', { at: [22, -7.1, -2.7], cls: 'name', align: 'left', dx: 24, dy: 34, line: true }));
    }
    var tmpV = new THREE.Vector3();

    function drawRay(ctx, ray, amount, alpha) {
      var d = amount * ray.total, j, head = null;
      ctx.beginPath();
      for (j = 0; j < ray.pts.length; j++) {
        var p = ray.pts[j];
        if (j > 0 && ray.len[j] > d) {
          var a = (d - ray.len[j - 1]) / (ray.len[j] - ray.len[j - 1]);
          tmpV.copy(ray.pts[j - 1]).lerp(p, a);
          proj(v, tmpV, P2);
          ctx.lineTo(P2.x, P2.y);
          head = { x: P2.x, y: P2.y };
          break;
        }
        proj(v, p, P2);
        if (j === 0) ctx.moveTo(P2.x, P2.y); else ctx.lineTo(P2.x, P2.y);
        head = { x: P2.x, y: P2.y };
      }
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.lineJoin = 'round'; ctx.lineCap = 'round';
      var gk = v.w >= 700 ? 1.7 : 1;
      ctx.strokeStyle = K.rgba(P.lamp, 0.35); ctx.lineWidth = 5 * gk; ctx.stroke();
      ctx.strokeStyle = '#D8962E'; ctx.lineWidth = 1.6 * gk; ctx.stroke();
      ctx.restore();
      return head;
    }

    function overlay(t) {
      var ctx = v.ctx;
      var ph = K.reducedMotion ? 2.3 : t % 6;
      var pr = K.reducedMotion ? 1 : easeInOut(span(ph, 0.35, 1.45));
      var ra = K.reducedMotion ? 0.8 : 1 - span(ph, 3.9, 4.7);
      if (ph > 0.35 && ra > 0) {
        var hd = null;
        for (var k = 0; k < 2; k++) hd = drawRay(ctx, rays[k], pr, ra);
        var gk2 = v.w >= 700 ? 1.8 : 1;
        if (pr < 1 && hd) K.drawGlow(ctx, P.lamp, hd.x, hd.y, 7 * gk2, 0.8);
      }
      /* retina response at the fovea */
      var fl = K.reducedMotion ? 0.6 : Math.max(0, Math.min(span(ph, 1.35, 1.6), 1 - span(ph, 1.8, 2.9)));
      if (fl > 0) {
        proj(v, fovea, P2);
        K.drawGlow(ctx, P.lamp, P2.x, P2.y, 16 * gk2, 0.75 * fl);
        K.drawGlow(ctx, '#FFF4DC', P2.x, P2.y, 5 * gk2, fl);
      }
      /* signal travelling to the brain */
      var s = K.reducedMotion ? 0.55 : easeIn(span(ph, 1.7, 2.1)) * 0.12 + span(ph, 2.1, 3.7) * 0.88;
      if (ph > 1.7 && s < 1 && s > 0) {
        var vis = s < wallA ? 1 : s < wallB ? 0.15 : 1;
        for (var tr = 4; tr >= 0; tr--) {
          var ss = s - tr * 0.012;
          if (ss < 0) continue;
          sigCurve.getPointAt(Math.min(1, ss), tmpV);
          proj(v, tmpV, P3);
          var w = (1 - tr / 5);
          var vv = ss < wallA ? 1 : ss < wallB ? 0.15 : 1;
          K.drawGlow(ctx, P.lamp, P3.x, P3.y, (tr === 0 ? 13 : 7) * gk2, 0.7 * w * vv);
        }
        sigCurve.getPointAt(Math.min(1, s), tmpV);
        proj(v, tmpV, P3);
        ctx.save();
        ctx.globalAlpha = vis;
        ctx.fillStyle = '#FFF6E2';
        ctx.beginPath(); ctx.arc(P3.x, P3.y, 2.6 * gk2, 0, TAU); ctx.fill();
        ctx.strokeStyle = 'rgba(216,150,46,0.9)';
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.restore();
      }
    }

    function reset() { v.setView(HOME); }
    reset();
    return {
      reset: reset,
      frame: function (t, dt) {
        v.render(dt);
        if (K.skipRender) return;
        overlay(t);
        cornerTag(v.ctx, 'yavaşlatılmış', 8, v.h - 9, dark);
      },
      resize: function () { v.sf.resize(); },
      dispose: function () { v.dispose(); }
    };
  });

  /* ==================================================================
   * hook-nerve · 256×150 · light · 3D
   * Myelinated axon: myelin segments (Schwann cells), bare nodes of Ranvier,
   * a cut end showing the wrapped lamellae. The action potential jumps from
   * node to node (saltatory conduction).
   * ================================================================== */
  K.register('hook-nerve', function (el, opts) {
    var THREE = window.THREE;
    var theme = opts.theme || 'light';
    var dark = theme === 'dark';
    var WIDE = (el.clientWidth || 0) >= 700;
    var HOME = viewOpt(opts, { yaw: -0.86, pitch: 0.32, distance: WIDE ? 14.5 : 21, target: WIDE ? [-1.6, -0.2, 0] : [-2.2, -0.35, 0] });
    var v = K.stage3d(el, {
      theme: theme, fov: 32, distance: HOME.distance, yaw: HOME.yaw, pitch: HOME.pitch, target: HOME.target,
      size: 8, shadows: false, minYaw: -1.35, maxYaw: -0.3, minPitch: 0, maxPitch: 0.8, minDistance: 10, maxDistance: 36
    });
    if (v.lights) {
      v.lights.key.intensity = 1.45; v.lights.fill.intensity = 0.16; v.lights.hemi.intensity = 0.2;
      v.lights.key.position.set(2, 12, 6);
    }
    v.exposure = 0.9;
    /* aerial perspective: the far segments fade into the page */
    v.scene.fog = new THREE.Fog(dark ? P.night : theme === 'card' ? 0xFFFFFF : P.paper, WIDE ? 16 : 22, WIDE ? 46 : 62);
    var g = new THREE.Group();
    g.rotation.z = -Math.PI / 2;                 /* lathe axis → world +x */
    v.scene.add(g);

    var RA = 0.6, RM = 1.0, L = 5.2, GAP = 0.62, X0 = -9.6, NSEG = 7;
    var STEP = L + GAP;
    var mMyelin = K.mat.std(0xFFFFFF, 0.38, 0, {
      envMapIntensity: 0.35,
      map: K.textTexture(256, 512, function (c, w, h) {
        c.fillStyle = '#D3C3A6'; c.fillRect(0, 0, w, h);
        /* helical wraps of the Schwann cell membrane */
        for (var k = -40; k < 40; k++) {
          c.strokeStyle = k % 3 ? 'rgba(140,116,84,0.2)' : 'rgba(255,253,246,0.5)';
          c.lineWidth = k % 3 ? 2 : 3;
          c.beginPath(); c.moveTo(k * 12, 0); c.lineTo(k * 12 + w * 1.3, h); c.stroke();
        }
      })
    });
    var mAxon = K.mat.std(0xD09F84, 0.5, 0, { envMapIntensity: 0.4 });
    var mNucleus = K.mat.std(0xCBC1D3, 0.45, 0, { envMapIntensity: 0.4 });

    function segProfile(cutStart) {
      var pts = [], T = 0.62, n = 10, i, s;
      if (cutStart) pts.push(new THREE.Vector2(RM, 0));
      else for (i = 0; i <= n; i++) { s = i / n; pts.push(new THREE.Vector2(RA + 0.04 + (RM - RA - 0.04) * sm(s), T * s)); }
      for (i = 0; i <= n; i++) { s = i / n; pts.push(new THREE.Vector2(RA + 0.04 + (RM - RA - 0.04) * sm(1 - s), L - T + T * s)); }
      return pts;
    }
    var segGeo = new THREE.LatheGeometry(segProfile(false), 56);
    var segGeoCut = new THREE.LatheGeometry(segProfile(true), 56);
    var nodes = [];
    for (var i = 0; i < NSEG; i++) {
      var m = new THREE.Mesh(i === 0 ? segGeoCut : segGeo, mMyelin);
      m.position.y = X0 + i * STEP;
      g.add(m);
      /* Schwann cell nucleus: a low bump on the sheath */
      var nu = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 12), mNucleus);
      var ang = 0.55 + (i % 2) * 0.45;
      nu.position.set(-Math.cos(ang) * (RM - 0.1), X0 + i * STEP + L * 0.5 + (i % 3 - 1) * 0.6, Math.sin(ang) * (RM - 0.1));
      nu.lookAt(0, nu.position.y, 0);
      nu.scale.set(0.36, 0.95, 0.3);
      g.add(nu);
      if (i < NSEG - 1) nodes.push(X0 + i * STEP + L + GAP / 2);
    }
    var axonLen = NSEG * STEP + 4;
    var axon = new THREE.Mesh(new THREE.CylinderGeometry(RA, RA, axonLen, 32, 1, true), mAxon);
    axon.position.y = X0 + axonLen / 2 + 0.01;
    g.add(axon);
    /* node rings that light up */
    var nodeMats = nodes.map(function (y) {
      var mat = K.mat.std(0xD7AE98, 0.5, 0, { emissive: 0xF2B54E, emissiveIntensity: 0, envMapIntensity: 0.6 });
      var ring = new THREE.Mesh(new THREE.CylinderGeometry(RA + 0.015, RA + 0.015, GAP + 0.1, 32, 1, true), mat);
      ring.position.y = y;
      g.add(ring);
      return mat;
    });
    /* cut face: axon core and the concentric myelin lamellae */
    var capTex = K.textTexture(256, 256, function (c, w, h) {
      var cx = w / 2, cy = h / 2, R = w / 2;
      c.fillStyle = '#EFE8DB'; c.beginPath(); c.arc(cx, cy, R, 0, TAU); c.fill();
      for (var k = 0; k < 14; k++) {
        var r = R * (RA / RM + (1 - RA / RM) * (k + 0.5) / 14);
        c.strokeStyle = k % 2 ? 'rgba(170,150,120,0.35)' : 'rgba(255,255,255,0.7)';
        c.lineWidth = 2.2;
        c.beginPath(); c.arc(cx, cy, r, 0, TAU); c.stroke();
      }
      var ga = c.createRadialGradient(cx, cy, 0, cx, cy, R * RA / RM);
      ga.addColorStop(0, '#E9C7B3'); ga.addColorStop(1, '#D3A88F');
      c.fillStyle = ga; c.beginPath(); c.arc(cx, cy, R * RA / RM, 0, TAU); c.fill();
      var rng = K.rng(9);
      c.fillStyle = 'rgba(160,110,90,0.35)';
      for (k = 0; k < 40; k++) {
        var a = rng() * TAU, rr = Math.sqrt(rng()) * R * RA / RM * 0.9;
        c.beginPath(); c.arc(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr, 2.2, 0, TAU); c.fill();
      }
    });
    var cap = new THREE.Mesh(new THREE.CircleGeometry(RM, 48), K.mat.std(0xFFFFFF, 0.6, 0, { map: capTex, envMapIntensity: 0.5 }));
    cap.position.set(X0, 0, 0);
    cap.rotation.y = -Math.PI / 2;
    v.scene.add(cap);

    if (WIDE) {
      bigLab(v, v.label('miyelin kılıf', { at: [-6.4, 0.95, 0.3], cls: 'name', align: 'right', dx: -26, dy: -52, line: true }));
      bigLab(v, v.label('Ranvier boğumu', { at: [nodes[1], 0, 0], cls: 'name', align: 'left', dx: 20, dy: 70, line: true }));
    }
    var PERIOD = 3.4, T0 = 0.35, DT = 0.3;
    var nodeW = nodes.map(function (y) { return V3(y, 0, 0); });
    var A = { x: 0, y: 0, ok: true }, B = { x: 0, y: 0, ok: true }, C = { x: 0, y: 0, ok: true };
    var up = V3(0, RM + 1.6, 0), tmp = new THREE.Vector3();

    function nodeLevel(k, ph) {
      var t0 = T0 + k * DT;
      if (ph < t0) return 0;
      var d = ph - t0;
      return d < 0.08 ? d / 0.08 : Math.exp(-(d - 0.08) * 3.2);
    }
    function overlay(t) {
      var ctx = v.ctx;
      var ph = K.reducedMotion ? T0 + 2 * DT + 0.05 : t % PERIOD;
      for (var k = 0; k < nodes.length; k++) {
        var lv = nodeLevel(k, ph);
        nodeMats[k].emissiveIntensity = 1.6 * lv;
        if (lv < 0.01) continue;
        proj(v, nodeW[k], A);
        K.drawGlow(ctx, P.lamp, A.x, A.y, (15 - k * 1.1) * (WIDE ? 1.7 : 1), 0.85 * lv);
        /* the jump to the next node */
        if (k < nodes.length - 1) {
          var jp = K.reducedMotion ? 1 : span(ph, T0 + k * DT + 0.02, T0 + (k + 1) * DT);
          var fade = K.reducedMotion ? 0.7 : 1 - span(ph, T0 + (k + 1) * DT + 0.1, T0 + (k + 1) * DT + 0.7);
          if (jp > 0 && fade > 0) {
            proj(v, nodeW[k + 1], B);
            tmp.copy(nodeW[k]).add(nodeW[k + 1]).multiplyScalar(0.5).add(up);
            proj(v, tmp, C);
            ctx.save();
            ctx.globalAlpha = fade * 0.9;
            ctx.strokeStyle = '#D8962E';
            ctx.lineWidth = WIDE ? 2.6 : 1.3;
            ctx.lineCap = 'round';
            ctx.beginPath();
            var n = 18;
            for (var s = 0; s <= n; s++) {
              var u = s / n * jp, iu = 1 - u;
              var x = iu * iu * A.x + 2 * iu * u * C.x + u * u * B.x;
              var y = iu * iu * A.y + 2 * iu * u * C.y + u * u * B.y;
              if (s === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
            }
            ctx.stroke();
            ctx.restore();
          }
        }
      }
    }
    function reset() { v.setView(HOME); }
    reset();
    return {
      reset: reset,
      frame: function (t, dt) {
        if (K.skipRender) { v.render(dt); return; }
        var ph = K.reducedMotion ? T0 + 2 * DT + 0.05 : t % PERIOD;
        for (var k = 0; k < nodes.length; k++) nodeMats[k].emissiveIntensity = 1.6 * nodeLevel(k, ph);
        v.render(dt);
        overlay(t);
        text(v.ctx, '≈ 100 m/s', v.w - 10, v.h - (WIDE ? 36 : 26), { size: WIDE ? 24 : 13, weight: 600, mono: true, color: dark ? P.onNight : P.ink, align: 'right', baseline: 'middle' });
        cornerTag(v.ctx, 'yavaşlatılmış', v.w - 10, v.h - 14, dark, 'right');
      },
      resize: function () { v.sf.resize(); },
      dispose: function () { v.dispose(); }
    };
  });

  /* ------------------------------------------------------------------
   * Shared electrical-installation parts (mm units)
   * ------------------------------------------------------------------ */
  /* Polygon with rounded corners as a THREE.Shape. pts: [[x,y],...], r: radius or array */
  function roundedShape(pts, r) {
    var THREE = window.THREE;
    var s = new THREE.Shape(), n = pts.length;
    for (var i = 0; i < n; i++) {
      var p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n];
      var rr = Array.isArray(r) ? r[i] : r;
      var d1x = p0[0] - p1[0], d1y = p0[1] - p1[1], l1 = Math.hypot(d1x, d1y);
      var d2x = p2[0] - p1[0], d2y = p2[1] - p1[1], l2 = Math.hypot(d2x, d2y);
      var k1 = Math.min(rr, l1 / 2) / l1, k2 = Math.min(rr, l2 / 2) / l2;
      var ax = p1[0] + d1x * k1, ay = p1[1] + d1y * k1, bx = p1[0] + d2x * k2, by = p1[1] + d2y * k2;
      if (i === 0) s.moveTo(ax, ay); else s.lineTo(ax, ay);
      s.quadraticCurveTo(p1[0], p1[1], bx, by);
    }
    s.closePath();
    return s;
  }
  function roundRectPath(x0, y0, x1, y1, r, isShape) {
    var THREE = window.THREE;
    var p = isShape ? new THREE.Shape() : new THREE.Path();
    p.moveTo(x0 + r, y0);
    p.lineTo(x1 - r, y0); p.quadraticCurveTo(x1, y0, x1, y0 + r);
    p.lineTo(x1, y1 - r); p.quadraticCurveTo(x1, y1, x1 - r, y1);
    p.lineTo(x0 + r, y1); p.quadraticCurveTo(x0, y1, x0, y1 - r);
    p.lineTo(x0, y0 + r); p.quadraticCurveTo(x0, y0, x0 + r, y0);
    return p;
  }
  /* Extrude a side profile (u = depth z, v = height y) across the width in x, from xa to xb. */
  function extrudeX(shape, xa, xb, bev) {
    var THREE = window.THREE;
    var depth = Math.max(0.01, xb - xa - 2 * bev);
    var g = new THREE.ExtrudeGeometry(shape, { depth: depth, bevelEnabled: bev > 0, bevelThickness: bev, bevelSize: bev, bevelOffset: -bev, bevelSegments: 3, curveSegments: 10 });
    g.rotateY(-Math.PI / 2);
    g.translate(xb - bev, 0, 0);
    g.computeVertexNormals();
    return g;
  }
  /* Insulated wire with the IEC colours: brown L, blue N, green-yellow PE. */
  var wireMatCache = {};
  function wireMat(kind) {
    if (wireMatCache[kind]) return wireMatCache[kind];
    var m;
    if (kind === 'pe') {
      var tex = K.textTexture(64, 64, function (c, w, h) {
        c.fillStyle = '#2F8A3E'; c.fillRect(0, 0, w, h);
        c.fillStyle = '#E2C21E';
        c.beginPath(); c.moveTo(0, 0); c.lineTo(w * 0.5, 0); c.lineTo(w, h * 0.5); c.lineTo(w, h); c.lineTo(w * 0.5, h); c.lineTo(0, h * 0.5); c.closePath(); c.fill();
      });
      tex.wrapS = tex.wrapT = window.THREE.RepeatWrapping;
      tex.repeat.set(26, 1);
      m = K.mat.std(0xFFFFFF, 0.42, 0, { map: tex });
    } else if (kind === 'n') m = K.mat.std(0x2E5AA8, 0.42, 0);
    else m = K.mat.std(0x5A3721, 0.45, 0);
    wireMatCache[kind] = m;
    return m;
  }

  /* A DIN-rail miniature circuit breaker, 1 module (17,5 × 85 × 68 mm).
   * Back on the rail at z = 0, cap face at z = 68. Optional side cutaway
   * with the thermal bimetal strip. Returns {group, setLever(a), setIndicator(on), setHeat(h)} */
  function makeMCB(o) {
    var THREE = window.THREE;
    o = o || {};
    var grp = new THREE.Group();
    var mBody = K.mat.std(0xF2F1EC, 0.5, 0, { envMapIntensity: 0.8 });
    var prof = [[0, -42.5], [47, -42.5], [52, -37.5], [52, -24], [56, -22.5], [68, -21], [68, 21], [56, 22.5], [52, 24], [52, 37.5], [47, 42.5], [0, 42.5]];
    var radii = [1.2, 2.5, 1.5, 1.2, 1.5, 2.4, 2.4, 1.5, 1.2, 1.5, 2.5, 1.2];
    var right = new THREE.Mesh(extrudeX(roundedShape(prof, radii), -3.6, 8.75, 0.7), mBody);
    var leftShape = roundedShape(prof, radii);
    if (o.cutaway) leftShape.holes.push(roundRectPath(13, -31, 45, -4, 3));
    var left = new THREE.Mesh(extrudeX(leftShape, -8.75, -3.6, 0.7), mBody);
    right.castShadow = left.castShadow = true;
    right.receiveShadow = left.receiveShadow = true;
    grp.add(right, left);

    /* printed cap face */
    var capTex = K.textTexture(256, 616, function (c, w, h) {
      var s = w / 17.5;                          /* px per mm */
      function Y(mm) { return h / 2 - mm * s; }
      c.clearRect(0, 0, w, h);
      /* lever slot */
      c.fillStyle = '#2A2D33';
      K.rr(c, w / 2 - 5.2 * s, Y(9.6), 10.4 * s, 19.2 * s, 2.2 * s); c.fill();
      c.fillStyle = '#3C4048';
      K.rr(c, w / 2 - 4.6 * s, Y(9.0), 9.2 * s, 18 * s, 1.8 * s); c.fill();
      /* indicator frame */
      c.fillStyle = '#1F2227';
      K.rr(c, w / 2 - 3.6 * s, Y(18.3), 7.2 * s, 4.0 * s, 0.8 * s); c.fill();
      c.fillStyle = '#4A4E57';
      c.textAlign = 'center'; c.textBaseline = 'middle';
      c.font = '600 ' + (2.6 * s) + 'px ' + K.fonts.sans;
      c.fillText('I', w / 2, Y(11.8));
      c.fillText('O', w / 2, Y(-11.8));
      c.fillStyle = '#2B2E35';
      c.font = '700 ' + (5.6 * s) + 'px ' + K.fonts.sans;
      c.fillText('C16', w / 2, Y(-16.6));
      c.font = '500 ' + (1.7 * s) + 'px ' + K.fonts.sans;
      c.fillText('230/400 V~', w / 2, Y(14.8));
      c.lineWidth = 0.25 * s;
      c.strokeStyle = '#2B2E35';
      c.strokeRect(w / 2 - 3.4 * s, Y(-19.4) + 0.2 * s, 6.8 * s, 1.0 * s);
    });
    var cap = new THREE.Mesh(new THREE.PlaneGeometry(17.5 - 1.6, 42 - 1.4), new THREE.MeshStandardMaterial({ map: capTex, transparent: true, roughness: 0.5, metalness: 0 }));
    cap.position.set(0.0, 0, 68.04);
    grp.add(cap);
    /* contact-position indicator: red = contacts closed, green = open */
    var indMat = K.mat.std(0xC0392B, 0.35, 0, { emissive: 0x501008, emissiveIntensity: 0.4 });
    var ind = new THREE.Mesh(new THREE.PlaneGeometry(5.6, 2.6), indMat);
    ind.position.set(0, 16.3, 68.12);
    grp.add(ind);

    /* toggle lever */
    var mLever = K.mat.std(0x2E3239, 0.42, 0, { envMapIntensity: 0.7 });
    var leverG = roundBox(8.2, 5.0, 14, 1.4, 0.9, 3);
    leverG.translate(0, 0, 7);
    var lever = new THREE.Mesh(leverG, mLever);
    lever.castShadow = true;
    var pivot = new THREE.Group();
    pivot.position.set(0, 0, 61.5);
    pivot.add(lever);
    grp.add(pivot);

    /* terminal screws on the shoulders (skipped when the device is shown small) */
    var mScrew = K.mat.std(0xC9CDD3, 0.3, 1);
    var mHole = K.mat.std(0x23262B, 0.7, 0);
    if (!o.simple) [31, -31].forEach(function (y) {
      var hole = new THREE.Mesh(new THREE.CircleGeometry(3.4, 28), mHole);
      hole.position.set(0, y, 52.03);
      grp.add(hole);
      var head = new THREE.Mesh(new THREE.CylinderGeometry(2.7, 2.7, 1.4, 28), mScrew);
      head.rotation.x = Math.PI / 2;
      head.position.set(0, y, 51.6);
      grp.add(head);
      var slotM = K.mat.std(0x30343A, 0.6, 0);
      var s1 = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.7, 0.4), slotM);
      s1.position.set(0, y, 52.35); s1.rotation.z = 0.5;
      var s2 = s1.clone(); s2.rotation.z = 0.5 + Math.PI / 2;
      grp.add(s1, s2);
    });
    /* wire entries on the top and bottom faces */
    if (!o.simple) [1, -1].forEach(function (sg) {
      var en = new THREE.Mesh(new THREE.PlaneGeometry(8, 6.5), mHole);
      en.rotation.x = -sg * Math.PI / 2;
      en.position.set(0, sg * 42.53, 40);
      grp.add(en);
    });

    var bim = null, latch = null;
    if (o.cutaway) {
      /* interior seen through the side window */
      var inner = new THREE.Mesh(new THREE.PlaneGeometry(34, 30), K.mat.std(0x3A3E46, 0.8, 0));
      inner.rotation.y = -Math.PI / 2;
      inner.position.set(-3.75, -17.5, 29);
      grp.add(inner);
      /* fixed copper terminal block the bimetal is riveted to */
      var mCu = K.mat.copper({ roughness: 0.38 });
      var base = new THREE.Mesh(roundBox(3.6, 4.2, 6, 0.6, 0.4, 2), mCu);
      base.position.set(-6.2, -27.6, 26.6);
      grp.add(base);
      /* bimetal: brass (high expansion, outer) + steel (low expansion, inner); bends toward +z when hot */
      var BL = 20, BT = 1.1, NS = 20;
      var bg = new THREE.BoxGeometry(3.0, BL, BT, 1, NS, 2);
      bg.translate(0, BL / 2, 0);
      var colors = [], pos = bg.attributes.position;
      var cBrass = new THREE.Color(0xC9934E), cSteel = new THREE.Color(0x9EA4AD);
      for (var i = 0; i < pos.count; i++) {
        var c = pos.getZ(i) < 0 ? cBrass : cSteel;
        colors.push(c.r, c.g, c.b);
      }
      bg.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
      var mBim = K.mat.std(0xFFFFFF, 0.35, 0.85, { vertexColors: true, emissive: 0x000000 });
      bim = new THREE.Mesh(bg, mBim);
      bim.position.set(-6.2, -26.5, 28.4);
      bim.userData.orig = Float32Array.from(pos.array);
      grp.add(bim);
      /* trip latch above the strip tip */
      latch = new THREE.Group();
      latch.position.set(-6.2, -4.2, 30.6);
      var lb = new THREE.Mesh(roundBox(2.6, 2.2, 8, 0.6, 0.3, 2), K.mat.std(0x8B9099, 0.4, 0.7));
      lb.position.set(0, -1.2, 2.4);
      latch.add(lb);
      grp.add(latch);
      /* flexible copper braid from the strip tip to the contact */
      var braid = KGViz.wire([[-6.2, -7.2, 28.2], [-6.4, -5.2, 22], [-6.4, -7.5, 16], [-6.4, -4, 13.8]], { radius: 0.7, material: K.mat.copper({ roughness: 0.55 }) });
      grp.add(braid);
    }

    function bend(curv) {
      if (!bim) return;
      var pos = bim.geometry.attributes.position, O = bim.userData.orig;
      for (var i = 0; i < pos.count; i++) {
        var x = O[i * 3], y = O[i * 3 + 1], z = O[i * 3 + 2];
        if (Math.abs(curv) < 1e-5) { pos.setXYZ(i, x, y, z); continue; }
        var R = 1 / curv, ph = y * curv;
        pos.setXYZ(i, x, (R - z) * Math.sin(ph), R - (R - z) * Math.cos(ph));
      }
      pos.needsUpdate = true;
      bim.geometry.computeVertexNormals();
    }
    var lastCurv = -1;
    return {
      group: grp,
      setLever: function (on) { pivot.rotation.x = lerp(0.62, -0.5, on); },  /* on = 1 → lever up */
      setIndicator: function (on) {
        indMat.color.setHex(on ? 0xC0392B : 0x2E8B57);
        indMat.emissive.setHex(on ? 0x501008 : 0x0B3A1C);
      },
      setHeat: function (h) {
        if (!bim) return;
        var curv = 0.035 * h;
        if (Math.abs(curv - lastCurv) > 1e-5) { bend(curv); lastCurv = curv; }
        bim.material.emissive.setRGB(0.55 * h, 0.16 * h, 0.02 * h);
        latch.rotation.x = -0.32 * sm(clamp((h - 0.75) / 0.25, 0, 1));
      }
    };
  }

  /* ==================================================================
   * breaker · 325×190 · card · 3D
   * Loads switch on one by one; above 16 A the bimetal heats and bends,
   * the latch releases and the lever drops: the circuit opens.
   * ================================================================== */
  K.register('breaker', function (el, opts) {
    var THREE = window.THREE;
    var theme = opts.theme || 'card';
    var dark = theme === 'dark';
    var WIDE = (el.clientWidth || 0) >= 700;
    var HOME = viewOpt(opts, { yaw: -0.46, pitch: 0.1, distance: WIDE ? 300 : 330, target: WIDE ? [84, -11, 20] : [52, -13, 20] });
    var v = K.stage3d(el, {
      theme: theme, fov: 26, distance: HOME.distance, yaw: HOME.yaw, pitch: HOME.pitch, target: HOME.target,
      size: 60, shadows: false, minYaw: -1.2, maxYaw: 0.3, minPitch: -0.15, maxPitch: 0.6, minDistance: 200, maxDistance: 460
    });
    if (v.lights) {
      v.lights.key.position.set(30, 90, 220);
      v.lights.key.intensity = 1.3;
    }
    /* DIN rail TS35 */
    var mRail = K.mat.zinc({ roughness: 0.42 });
    var railLen = 74, railX = -52 + railLen / 2;
    [[0, 25, 1, -0.5], [12, 1, 7.5, -3.75], [-12, 1, 7.5, -3.75], [15, 5, 1, -7], [-15, 5, 1, -7]].forEach(function (p) {
      var b = new THREE.Mesh(new THREE.BoxGeometry(railLen, p[1], p[2]), mRail);
      b.position.set(railX, p[0], p[3]);
      b.receiveShadow = true;
      v.scene.add(b);
    });
    var mcb = makeMCB({ cutaway: true });
    v.scene.add(mcb.group);

    /* loads: abstract appliance blocks */
    var LOADS = [
      { w: 2000, y: 26 },
      { w: 1200, y: 0 },
      { w: 2400, y: -26 }
    ];
    var LX = WIDE ? 176 : 104, LZ = 12, BUSX = WIDE ? 146 : 80;
    var mBlock = K.mat.std(0xF4F3EF, 0.55, 0, { envMapIntensity: 0.8 });
    LOADS.forEach(function (L, i) {
      L.amp = L.w / 230;
      var b = new THREE.Mesh(roundBox(36, 19, 16, 3.2, 1.6, 3), mBlock);
      b.position.set(LX, L.y, LZ);
      b.castShadow = true; b.receiveShadow = true;
      v.scene.add(b);
      /* a recessed dark front panel, like an appliance display strip */
      var face = new THREE.Mesh(roundBox(24, 9, 1.2, 2.2, 0.4, 2), K.mat.std(0x2C3036, 0.45, 0, { envMapIntensity: 0.6, emissive: 0xF2B85E, emissiveIntensity: 0 }));
      face.position.set(LX + 3, L.y, LZ + 7.9);
      v.scene.add(face);
      L.faceMat = face.material;
      L.ledMat = K.mat.std(0x8E939C, 0.35, 0, { emissive: 0xF2C46B, emissiveIntensity: 0 });
      var led = new THREE.Mesh(new THREE.SphereGeometry(1.5, 16, 10), L.ledMat);
      led.scale.z = 0.5;
      led.position.set(LX - 13.5, L.y, LZ + 8.1);
      v.scene.add(led);
      L.label = v.label('', { at: [LX + 19, L.y, LZ + 6], cls: 'value', align: 'left', dx: 6 });
      L.label.el.style.fontSize = WIDE ? '20px' : '12px';
      if (WIDE) L.label.el.style.fontWeight = '600';
    });
    /* wiring: supply into the top terminal, the bottom terminal to the loads */
    var mL = wireMat('l');
    var wTop = KGViz.wire([[0, 96, 30], [0, 70, 34], [0, 52, 39], [0, 43.5, 40]], { radius: 1.5, material: mL });
    var wBot = KGViz.wire([[0, -43.5, 40], [0, -50, 39], [4, -56, 31], [30, -58.5, 18], [BUSX - 8, -57, LZ], [BUSX, -47, LZ], [BUSX, -26, LZ]], { radius: 1.5, material: mL });
    v.scene.add(wTop, wBot);
    var bus = KGViz.wire([[BUSX, -26.5, LZ], [BUSX, 0, LZ], [BUSX, 26, LZ]], { radius: 1.5, material: mL });
    v.scene.add(bus);
    LOADS.forEach(function (L) {
      v.scene.add(KGViz.wire([[BUSX, L.y, LZ], [LX - 16, L.y, LZ]], { radius: 1.5, material: mL, segments: 8 }));
    });
    var bimLabel = bigLab(v, v.label('bimetal', { at: [-8.8, -12, 30], cls: WIDE ? 'name' : 'tag', align: 'right', dx: -30, dy: 34, line: true }));
    if (WIDE) {
      bigLab(v, v.label('devre kesici', { at: [8, 36, 62], cls: 'name', align: 'left', dx: 60, dy: -30, line: true }));
    }
    /* current dots (conventional current, copper) */
    var path = new THREE.CurvePath();
    path.add(wTop.curve); path.add(new THREE.LineCurve3(V3(0, 43.5, 40), V3(0, -43.5, 40))); path.add(wBot.curve);
    var pathLen = path.getLength();
    var hiddenA = wTop.curve.getLength() / pathLen, hiddenB = (wTop.curve.getLength() + 87) / pathLen;
    var ND = 26;
    var dots = KGViz.instanced(ND, { radius: 1.25, material: K.mat.std(0xC8693A, 0.35, 0.2, { emissive: 0x8A3E16, emissiveIntensity: 0.5 }) });
    v.scene.add(dots);
    var tmp = new THREE.Vector3();

    var IN = 16, PERIOD = 11.4;
    var tag = fixedLabel(v, 'aşırı akım → devre kesilir', 'note chip', v.w - 12, WIDE ? 40 : 120, 'right');
    if (WIDE) { tag.el.style.fontSize = '20px'; tag.el.style.fontWeight = '600'; tag.el.style.color = P.copper; }
    tag.el.innerHTML = WIDE ? 'aşırı akım → devre kesilir' : 'aşırı akım →<br>devre kesilir';
    tag.el.style.lineHeight = '1.3';
    tag.opacity('0');
    var st = { flow: 0 };
    function timeline(t) {
      var ph = K.reducedMotion ? 5.9 : t % PERIOD;
      var on = [span(ph, 0.8, 1.15), span(ph, 2.0, 2.35), span(ph, 3.2, 3.55)];
      var trip = K.reducedMotion ? 0 : span(ph, 6.0, 6.4);
      var reclose = span(ph, 9.7, 10.3);
      var leverOn = ph < 6.0 ? 1 : ph < 9.7 ? 1 - dropSpring(trip) : easeInOut(reclose);
      var live = ph < 6.0 ? 1 : 1 - span(ph, 6.0, 6.3);
      if (ph >= 9.7) live = 0;
      var I = 0;
      for (var i = 0; i < 3; i++) I += LOADS[i].amp * sm(on[i]);
      I *= live;
      var heat = ph < 6.0 ? easeInOut(span(ph, 3.5, 6.0)) : 1 - easeOut(span(ph, 6.0, 9.6));
      return { ph: ph, on: on, live: live, I: I, lever: leverOn, heat: heat, tripped: ph >= 6.0 && ph < 10.3 };
    }
    /* horizontal current gauge along the bottom: 0–30 A with the 16 A rating */
    function drawBar(ctx, s) {
      var x0 = WIDE ? 70 : 50, x1 = v.w - (WIDE ? 110 : 62), y = v.h - (WIDE ? 24 : 15), hh = WIDE ? 12 : 7, Imax = 30;
      function X(I) { return x0 + (x1 - x0) * I / Imax; }
      ctx.save();
      ctx.fillStyle = dark ? P.night2 : '#EDECE7';
      K.rr(ctx, x0, y - hh / 2, x1 - x0, hh, hh / 2); ctx.fill();
      if (s.I > 0.05) {
        ctx.save();
        K.rr(ctx, x0, y - hh / 2, x1 - x0, hh, hh / 2); ctx.clip();
        var xi = X(Math.min(s.I, Imax)), xr = X(IN);
        ctx.fillStyle = P.copperFill;
        ctx.fillRect(x0, y - hh / 2, Math.min(xi, xr) - x0, hh);
        if (s.I > IN) { ctx.fillStyle = P.copper; ctx.fillRect(xr, y - hh / 2, xi - xr, hh); }
        ctx.restore();
      }
      var xr2 = Math.round(X(IN)) + 0.5;
      ctx.strokeStyle = dark ? P.onNight : P.ink;
      ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.moveTo(xr2, y - hh / 2 - 4); ctx.lineTo(xr2, y + hh / 2 + 2); ctx.stroke();
      ctx.restore();
      text(ctx, '16 A', xr2, y - hh / 2 - (WIDE ? 14 : 9), { size: WIDE ? 17 : 10.5, weight: 600, mono: true, color: dark ? P.onNight : P.ink, align: 'center', baseline: 'middle' });
      text(ctx, 'akım', x0 - 10, y, { size: WIDE ? 16 : 10.5, weight: 500, mono: true, color: P.muted, align: 'right', baseline: 'middle' });
      var over = s.I > IN;
      text(ctx, K.num(s.I, 1) + ' A', v.w - 10, y, { size: WIDE ? 22 : 12.5, weight: 600, mono: true, color: over ? P.copper : (dark ? P.onNight : P.ink), align: 'right', baseline: 'middle' });
    }
    function reset() { v.setView(HOME); }
    reset();
    return {
      reset: reset,
      frame: function (t, dt) {
        var s = timeline(t);
        mcb.setLever(s.lever);
        mcb.setIndicator(s.lever > 0.5);
        mcb.setHeat(s.heat);
        for (var i = 0; i < 3; i++) {
          var L = LOADS[i], a = sm(s.on[i]) * s.live;
          L.ledMat.emissiveIntensity = 2.2 * a;
          L.ledMat.color.setHex(a > 0.5 ? 0xF2C46B : 0x8E939C);
          L.faceMat.emissiveIntensity = 0.42 * a;
          setText(L.label, '+' + K.num(L.amp, 1) + ' A');
          setStyle(L.label.el, 'opacity', a > 0.02 ? (0.25 + 0.75 * a).toFixed(1) : '0');
        }
        /* conventional current: copper dots, speed ∝ I */
        st.flow += (K.reducedMotion ? 0 : (dt || 0)) * s.I * 0.012;
        var vis = clamp(s.I / 4, 0, 1);
        for (i = 0; i < ND; i++) {
          var u = (i / ND + st.flow) % 1;
          if (vis < 0.02 || (u > hiddenA - 0.005 && u < hiddenB + 0.005)) { dots.hideAt(i); continue; }
          path.getPointAt(u, tmp);
          dots.setAt(i, tmp.x, tmp.y, tmp.z + 1.6, vis);
        }
        dots.commit();
        tag.opacity(s.tripped ? '1' : '0');
        v.render(dt);
        if (K.skipRender) return;
        tag.place();
        drawBar(v.ctx, s);
        cornerTag(v.ctx, 'hızlandırılmış', v.w - 8, WIDE ? 14 : 11, dark, 'right');
      },
      resize: function () { v.sf.resize(); },
      dispose: function () { v.dispose(); }
    };
  });

  /* A tripped lever falls with an accelerating drop and a small rebound. x: 0..1 → 0..1 */
  function dropSpring(x) {
    x = clamp(x, 0, 1);
    if (x < 0.55) { var q = x / 0.55; return q * q; }
    var y = (x - 0.55) / 0.45;
    return 1 - 0.14 * Math.sin(Math.PI * y) * (1 - y);
  }
  /* Draw a copper arrow between two projected points, offset sideways in screen space. */
  function screenArrow(ctx, a, b, off, color, alpha) {
    var dx = b.x - a.x, dy = b.y - a.y, L = Math.hypot(dx, dy) || 1;
    var nx = -dy / L * off, ny = dx / L * off;
    K.arrow(ctx, a.x + nx, a.y + ny, b.x + nx, b.y + ny, { color: color, width: 2, head: 8, alpha: alpha });
  }
  /* Earth symbol (IEC 60417-5017): three bars of decreasing length. */
  function earthSymbol(mat) {
    var THREE = window.THREE;
    var grp = new THREE.Group();
    [[12, 0], [8, -3.2], [4, -6.4]].forEach(function (b) {
      var m = new THREE.Mesh(roundBox(b[0], 1.1, 1.1, 0.3, 0.2, 1), mat);
      m.position.y = b[1];
      grp.add(m);
    });
    var stem = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 7, 10), mat);
    stem.position.y = 3.5;
    grp.add(stem);
    return grp;
  }

  /* ==================================================================
   * rcd · 325×190 · card · 3D
   * Residual-current device principle: L and N pass through one toroidal
   * core. Equal currents → their fields cancel. A leak to earth makes them
   * unequal; the core is magnetised, the sense coil fires the trip relay.
   * ================================================================== */
  K.register('rcd', function (el, opts) {
    var THREE = window.THREE;
    var theme = opts.theme || 'card';
    var dark = theme === 'dark';
    var HOME = viewOpt(opts, { yaw: -0.62, pitch: 0.2, distance: 300, target: [-22, -6, 0] });
    var v = K.stage3d(el, {
      theme: theme, fov: 26, distance: HOME.distance, yaw: HOME.yaw, pitch: HOME.pitch, target: HOME.target,
      size: 60, shadows: false, minYaw: -1.3, maxYaw: 0.2, minPitch: -0.1, maxPitch: 0.7, minDistance: 230, maxDistance: 460
    });
    if (v.lights) { v.lights.key.intensity = 1.35; v.lights.key.position.set(40, 120, 140); }

    var Y_L = 6.5, Y_N = -6.5, XC = -58, R0 = 24, RT = 6.5;
    /* toroidal core */
    var mCore = K.mat.std(0x4B5058, 0.48, 0.4, { envMapIntensity: 0.9 });
    var core = new THREE.Mesh(new THREE.TorusGeometry(R0, RT, 32, 96), mCore);
    core.rotation.y = Math.PI / 2;           /* ring in the y-z plane, conductors along x */
    v.scene.add(core);
    /* magnetisation halo: appears only when the two currents differ */
    var mHalo = new THREE.MeshBasicMaterial({ color: 0xF2C46B, transparent: true, opacity: 0, depthWrite: false, toneMapped: false });
    var halo = new THREE.Mesh(new THREE.TorusGeometry(R0, RT + 1.6, 24, 96), mHalo);
    halo.rotation.y = Math.PI / 2;
    v.scene.add(halo);
    /* sense coil: 14 turns wound on the lower part of the core */
    var coilPts = [], TURNS = 14, th0 = -Math.PI * 0.8, th1 = -Math.PI * 0.2, rr = RT + 0.85;
    for (var i = 0; i <= TURNS * 28; i++) {
      var u = i / (TURNS * 28), th = th0 + (th1 - th0) * u, ph = u * TURNS * TAU;
      var rad = R0 + rr * Math.cos(ph);
      coilPts.push(V3(rr * Math.sin(ph), rad * Math.sin(th), rad * Math.cos(th)));
    }
    var mCoil = K.mat.copper({ roughness: 0.32, emissive: 0xF2A04A, emissiveIntensity: 0 });
    var coil = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(coilPts), TURNS * 40, 0.75, 6, false), mCoil);
    v.scene.add(coil);
    var coilEndA = coilPts[0], coilEndB = coilPts[coilPts.length - 1];

    /* conductors: supply side (left) → contacts → through the core → load (right) */
    var mL = wireMat('l'), mN = wireMat('n');
    var mCu = K.mat.copper({ roughness: 0.3 });
    var LOADX = 80;
    function lineWire(y, mat, x0, x1, extra) {
      var pts = [[x0, y, 0], [x1, y, 0]];
      if (extra) pts = extra;
      var w = KGViz.wire(pts, { radius: 2.4, material: mat, segments: 24, tension: 0 });
      v.scene.add(w);
      return w;
    }
    var wires = {
      L: [lineWire(Y_L, mL, -150, XC - 7), lineWire(Y_L, mL, XC + 7, LOADX - 12)],
      N: [lineWire(Y_N, mN, -150, XC - 7), lineWire(Y_N, mN, XC + 7, LOADX - 12)]
    };
    /* two-pole contact: fixed pads and hinged blades, linked by an insulating bar */
    var blades = [];
    [Y_L, Y_N].forEach(function (y) {
      [XC - 7, XC + 7].forEach(function (x) {
        var pad = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 2.6, 2.4, 20), mCu);
        pad.rotation.z = Math.PI / 2;
        pad.position.set(x, y, 0);
        v.scene.add(pad);
      });
      var hinge = new THREE.Group();
      hinge.position.set(XC - 6.5, y + 1.6, 0);
      var bl = new THREE.Mesh(roundBox(14, 1.6, 4, 0.5, 0.3, 2), K.mat.std(0xD9DDE2, 0.3, 1));
      bl.position.set(6.5, 0, 0);
      hinge.add(bl);
      v.scene.add(hinge);
      blades.push(hinge);
    });
    var linkBar = new THREE.Mesh(roundBox(2.4, Y_L - Y_N + 6, 2.4, 0.6, 0.3, 2), K.mat.std(0x6E737C, 0.5, 0.1));
    v.scene.add(linkBar);
    /* trip relay below the contacts: coil former + plunger */
    var relay = new THREE.Group();
    relay.position.set(XC + 3, -36, 0);
    var former = new THREE.Mesh(new THREE.CylinderGeometry(5.5, 5.5, 11, 28), K.mat.copper({ roughness: 0.45 }));
    relay.add(former);
    var capsT = new THREE.Mesh(new THREE.CylinderGeometry(6.6, 6.6, 1.4, 28), K.mat.std(0x2E3239, 0.5, 0));
    capsT.position.y = 6.2; relay.add(capsT);
    var capsB = capsT.clone(); capsB.position.y = -6.2; relay.add(capsB);
    var plunger = new THREE.Mesh(new THREE.CylinderGeometry(1.3, 1.3, 30, 14), K.mat.steel());
    relay.add(plunger);
    v.scene.add(relay);
    /* sense coil leads to the relay */
    var leadA = KGViz.wire([coilEndA, V3(coilEndA.x - 4, coilEndA.y - 14, coilEndA.z * 0.6), V3(-24, -42, -4), V3(XC + 9, -38, 0)], { radius: 0.6, material: mCu, castShadow: false });
    var leadB = KGViz.wire([coilEndB, V3(coilEndB.x - 4, coilEndB.y - 16, coilEndB.z * 0.6), V3(-24, -46, 4), V3(XC + 9, -33, 0)], { radius: 0.6, material: mCu, castShadow: false });
    v.scene.add(leadA, leadB);
    /* load */
    var load = new THREE.Mesh(roundBox(26, 34, 22, 3.5, 1.6, 3), K.mat.std(0xF2F1EC, 0.5, 0));
    load.position.set(LOADX, 0, 0);
    v.scene.add(load);
    /* earth */
    var mInk = K.mat.std(dark ? 0xC9CFDA : 0x2B2E35, 0.6, 0);
    var earth = earthSymbol(mInk);
    earth.scale.setScalar(1.3);
    earth.position.set(LOADX - 4, -54, 0);
    v.scene.add(earth);

    /* current dots (conventional current): L goes right, N comes back left */
    var ND = 18;
    var dotsL = KGViz.instanced(ND, { radius: 1.3, material: K.mat.std(0xC8693A, 0.35, 0.2, { emissive: 0x8A3E16, emissiveIntensity: 0.5 }) });
    var dotsN = KGViz.instanced(ND, { radius: 1.3, material: K.mat.std(0xC8693A, 0.35, 0.2, { emissive: 0x8A3E16, emissiveIntensity: 0.5 }) });
    v.scene.add(dotsL, dotsN);

    var lblFark = v.label('fark: 0 mA', { at: [-40, 40, 0], cls: 'value chip', align: 'center' });
    var lblCut = v.label('devre kesildi', { at: [-104, -20, 0], cls: 'note chip', align: 'left' });
    var lblLeak = v.label('kaçak', { at: [LOADX - 4, -30, 0], cls: 'tag', align: 'left', dx: 10 });

    var PERIOD = 11.5, I0 = 0.5;
    var st = { flow: 0 };
    function timeline(t) {
      var ph = K.reducedMotion ? 6.0 : t % PERIOD;
      var leakShow = span(ph, 2.8, 3.4) * (1 - span(ph, 8.2, 8.8));
      var leak = 0.03 * easeInOut(span(ph, 3.2, 5.0));       /* A */
      var trip = span(ph, 5.0, 5.25);
      var close = span(ph, 9.3, 9.8);
      var open = ph < 5.0 ? 0 : ph < 9.3 ? easeOut(trip) : 1 - easeInOut(close);
      var live = 1 - open;
      if (ph >= 5.0) leak = ph < 9.3 ? 0.03 * (1 - span(ph, 5.0, 5.15)) : 0;
      return { ph: ph, leakShow: leakShow, leak: leak * live, open: open, live: live, tripped: ph >= 5.05 && ph < 9.6 };
    }
    var A = { x: 0, y: 0, ok: true }, B = { x: 0, y: 0, ok: true }, tmp = new THREE.Vector3();
    var pLa = V3(-110, Y_L, 0), pLb = V3(-84, Y_L, 0), pNa = V3(-84, Y_N, 0), pNb = V3(-110, Y_N, 0);
    var pKa = V3(LOADX - 4, -17, 0), pKb = V3(LOADX - 4, -45, 0);
    function reset() { v.setView(HOME); }
    reset();
    return {
      reset: reset,
      frame: function (t, dt) {
        var s = timeline(t);
        var iL = (I0 + s.leak) * s.live, iN = I0 * s.live;
        var diff = Math.round((iL - iN) * 1000);
        var nmA = Math.round(iN * 1000), fmA = nmA + diff;
        st.dash = (st.dash || 0) + (K.reducedMotion ? 0 : (dt || 0)) * 14 * s.live;
        var imb = clamp(diff / 30, 0, 1);
        /* the core is magnetised only by the difference; the coil responds */
        var pulse = 0.75 + 0.25 * Math.sin(t * TAU * 1.0);
        mHalo.opacity = 0.32 * imb * pulse;
        mCoil.emissiveIntensity = 1.1 * imb * pulse;
        /* contacts: blades lift together, pushed by the relay plunger */
        for (var k = 0; k < 2; k++) blades[k].rotation.z = 0.5 * s.open;
        linkBar.position.set(XC + 3, (Y_L + Y_N) / 2 + 1.6 + 6.0 * s.open, 0);
        plunger.position.y = 13.2 + 6.0 * s.open;
        /* moving charges */
        st.flow += (K.reducedMotion ? 0 : (dt || 0)) * s.live * 0.32;
        for (var i = 0; i < ND; i++) {
          var u = (i / ND + st.flow) % 1;
          var x = lerp(-150, LOADX - 14, u);
          if (s.live < 0.05 || (x > XC - 9 && x < XC + 9)) { dotsL.hideAt(i); dotsN.hideAt(i); continue; }
          dotsL.setAt(i, x, Y_L, 2.6, s.live);
          dotsN.setAt(i, lerp(LOADX - 14, -150, u), Y_N, 2.6, s.live);
        }
        dotsL.commit(); dotsN.commit();
        /* the counter holds the value that tripped the device until it is switched back on */
        var shown = s.tripped ? 30 : diff;
        setText(lblFark, 'fark: ' + shown + ' mA');
        setStyle(lblFark.el, 'color', shown >= 15 ? P.copper : '');
        setStyle(lblCut.el, 'opacity', s.tripped ? '1' : '0');
        setStyle(lblLeak.el, 'opacity', s.leakShow.toFixed(1));
        v.render(dt);
        if (K.skipRender) return;
        var ctx = v.ctx;
        /* current arrows with values */
        var aa = s.live;
        if (aa > 0.02) {
          proj(v, pLa, A); proj(v, pLb, B);
          screenArrow(ctx, A, B, -9, P.copperFill, aa);
          text(ctx, 'faz: ' + fmA + ' mA', (A.x + B.x) / 2 - 2, Math.min(A.y, B.y) - 17, { size: 11.5, weight: 600, mono: true, color: P.copper, align: 'center', alpha: aa });
          proj(v, pNa, A); proj(v, pNb, B);
          screenArrow(ctx, A, B, -9, P.copperFill, aa);
          text(ctx, 'nötr: ' + nmA + ' mA', (A.x + B.x) / 2 + 2, Math.max(A.y, B.y) + 23, { size: 11.5, weight: 600, mono: true, color: P.copper, align: 'center', alpha: aa });
        }
        /* leak path to earth */
        if (s.leakShow > 0.01) {
          proj(v, pKa, A); proj(v, pKb, B);
          ctx.save();
          ctx.globalAlpha = s.leakShow * (0.35 + 0.65 * s.live);
          ctx.strokeStyle = P.copper;
          ctx.lineWidth = 1.6;
          ctx.setLineDash([4, 4]);
          ctx.lineDashOffset = -st.dash;
          ctx.beginPath(); ctx.moveTo(A.x, A.y); ctx.lineTo(B.x, B.y); ctx.stroke();
          ctx.restore();
        }
        cornerTag(ctx, 'yavaşlatılmış', v.w - 8, 11, dark, 'right');
      },
      resize: function () { v.sf.resize(); },
      dispose: function () { v.dispose(); }
    };
  });

  /* ==================================================================
   * earthing · 325×190 · card · 3D
   * A washing machine with a metal casing, a three-core cord (L, N, PE)
   * and an earthed socket. Fault: the live wire touches the casing; the
   * fault current takes the green-yellow earth wire into the ground and
   * the protective device opens the circuit.
   * Units: cm.
   * ================================================================== */
  K.register('earthing', function (el, opts) {
    var THREE = window.THREE;
    var theme = opts.theme || 'card';
    var dark = theme === 'dark';
    var HOME = viewOpt(opts, { yaw: -0.5, pitch: 0.17, distance: 352, target: [-6, 26, 4] });
    var v = K.stage3d(el, {
      theme: theme, fov: 26, distance: HOME.distance, yaw: HOME.yaw, pitch: HOME.pitch, target: HOME.target,
      size: 90, shadows: true, minYaw: -1.2, maxYaw: 0.3, minPitch: 0, maxPitch: 0.7, minDistance: 330, maxDistance: 650
    });
    if (v.lights) {
      v.lights.key.position.set(60, 170, 150);
      v.lights.key.intensity = 1.3;
      var sc = v.lights.key.shadow.camera;
      sc.left = -130; sc.right = 130; sc.top = 130; sc.bottom = -130; sc.far = 600;
      v.lights.key.shadow.mapSize.set(1024, 1024);
      v.lights.key.shadow.radius = 4;
      sc.updateProjectionMatrix();
      /* the shadow casters are static: render the shadow map once per activation */
      v.lights.key.shadow.autoUpdate = false;
      v.lights.key.shadow.needsUpdate = true;
    }
    /* diorama: soil block, floor slab, back wall */
    var soilTex = K.textTexture(256, 128, function (c, w, h) {
      c.fillStyle = '#8C6B4E'; c.fillRect(0, 0, w, h);
      var rng = K.rng(17);
      for (var i = 0; i < 900; i++) {
        var a = rng();
        c.fillStyle = a < 0.4 ? 'rgba(60,42,28,0.35)' : a < 0.75 ? 'rgba(176,142,108,0.35)' : 'rgba(120,96,74,0.5)';
        c.beginPath(); c.arc(rng() * w, rng() * h, 0.6 + rng() * 2.2, 0, TAU); c.fill();
      }
    });
    soilTex.wrapS = soilTex.wrapT = THREE.RepeatWrapping;
    soilTex.repeat.set(2, 1);
    var soil = new THREE.Mesh(roundBox(146, 28, 92, 1.2, 0.8, 2), K.mat.std(0xFFFFFF, 0.95, 0, { map: soilTex, envMapIntensity: 0.4 }));
    soil.position.set(2, -17, 0);
    soil.receiveShadow = false;
    v.scene.add(soil);
    var floor = new THREE.Mesh(roundBox(146, 4, 92, 1.2, 0.8, 2), K.mat.std(0xC9C1B2, 0.82, 0, { envMapIntensity: 0.5 }));
    floor.position.set(2, -1.9, 0);
    floor.receiveShadow = true;
    v.scene.add(floor);
    var wall = new THREE.Mesh(roundBox(146, 104, 5, 1.2, 0.8, 2), K.mat.std(0xCFCAC0, 0.9, 0, { envMapIntensity: 0.5 }));
    wall.position.set(2, 52, -43.5);
    wall.receiveShadow = true;
    v.scene.add(wall);
    var WZ = -41;                                   /* wall surface */

    /* washing machine: enamelled steel casing */
    var MX = 22, MZ = -6;
    var mCase = K.mat.std(0xF1F2F3, 0.3, 0.15, { envMapIntensity: 1.0 });   /* enamelled steel sheet */
    var body = new THREE.Mesh(roundBox(60, 85, 60, 3.2, 1.6, 3), mCase);
    body.position.set(MX, 42.5, MZ);
    body.castShadow = true;
    v.scene.add(body);
    var FZ = MZ + 30;                               /* front face */
    /* control panel strip */
    var panel = new THREE.Mesh(roundBox(56, 11, 1.2, 1.5, 0.5, 2), K.mat.std(0xE2E4E7, 0.45, 0.1));
    panel.position.set(MX, 78.5, FZ + 0.3);
    v.scene.add(panel);
    var knob = new THREE.Mesh(new THREE.CylinderGeometry(3.3, 3.5, 2.4, 32), K.mat.steel({ roughness: 0.25 }));
    knob.rotation.x = Math.PI / 2;
    knob.position.set(MX + 18, 78.5, FZ + 1.6);
    v.scene.add(knob);
    var disp = new THREE.Mesh(roundBox(12, 4.4, 0.6, 0.8, 0.2, 1), K.mat.std(0x22262C, 0.3, 0, { emissive: 0xD9E2E8, emissiveIntensity: 0 }));
    disp.position.set(MX + 2, 78.5, FZ + 1.0);
    v.scene.add(disp);
    var drawer = new THREE.Mesh(roundBox(15, 6.5, 1.2, 1, 0.4, 2), K.mat.std(0xF6F6F6, 0.4, 0.05));
    drawer.position.set(MX - 18, 78.5, FZ + 1.0);
    v.scene.add(drawer);
    /* porthole door: chrome ring, glass, rotating drum */
    var DY = 38;
    var ring = new THREE.Mesh(new THREE.TorusGeometry(16, 2.1, 20, 64), K.mat.steel({ roughness: 0.22 }));
    ring.position.set(MX, DY, FZ + 1.4);
    ring.castShadow = true;
    v.scene.add(ring);
    var drumTex = K.textTexture(256, 256, function (c, w, h) {
      var g = c.createRadialGradient(w / 2, h / 2, 10, w / 2, h / 2, w / 2);
      g.addColorStop(0, '#5E646C'); g.addColorStop(0.7, '#8C939B'); g.addColorStop(1, '#6A7078');
      c.fillStyle = g; c.fillRect(0, 0, w, h);
      c.fillStyle = 'rgba(30,34,40,0.55)';
      for (var r = 30; r < 120; r += 14) {
        var n = Math.floor(r * 0.42);
        for (var k = 0; k < n; k++) { var a = k / n * TAU; c.beginPath(); c.arc(w / 2 + Math.cos(a) * r, h / 2 + Math.sin(a) * r, 2.2, 0, TAU); c.fill(); }
      }
      c.fillStyle = '#B9BEC4';
      for (k = 0; k < 3; k++) { c.save(); c.translate(w / 2, h / 2); c.rotate(k * TAU / 3); c.fillRect(-6, 40, 12, 80); c.restore(); }
    });
    var drum = new THREE.Mesh(new THREE.CircleGeometry(14.2, 48), K.mat.std(0xFFFFFF, 0.45, 0.4, { map: drumTex }));
    drum.position.set(MX, DY, FZ + 0.15);
    v.scene.add(drum);
    var glass = new THREE.Mesh(new THREE.SphereGeometry(15.2, 40, 16, 0, TAU, 0, 0.42), new THREE.MeshPhysicalMaterial({ color: 0xBFD3E0, roughness: 0.05, metalness: 0, transparent: true, opacity: 0.32, clearcoat: 1, envMapIntensity: 1.5, depthWrite: false }));
    glass.rotation.x = Math.PI / 2;
    glass.position.set(MX, DY, FZ - 12.4);
    v.scene.add(glass);
    /* earth terminal on the left side panel, where the cord enters */
    var LX = MX - 30;                               /* left side face */
    var termPos = V3(LX - 0.4, 16, MZ - 21);
    var term = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.5, 1.2, 20), K.mat.std(0xC9CDD3, 0.3, 1));
    term.rotation.z = Math.PI / 2;
    term.position.copy(termPos);
    v.scene.add(term);
    /* fault point: the live core rubbed through its insulation against the casing */
    var faultPos = V3(LX - 0.3, 27, MZ - 14);
    var faultGlow = glowSprite('#F2B24E', 10, 0);
    faultGlow.position.copy(faultPos).add(V3(-0.8, 0, 0));
    v.scene.add(faultGlow);

    /* socket and plug on the wall */
    var SX = -40, SY = 30;
    var plate = new THREE.Mesh(roundBox(8.4, 8.4, 1.0, 1.2, 0.3, 2), K.mat.plasticWhite());
    plate.position.set(SX, SY, WZ + 0.5);
    v.scene.add(plate);
    var plug = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 2.9, 4.6, 28), K.mat.std(0xE9E8E4, 0.45, 0));
    plug.rotation.x = Math.PI / 2;
    plug.position.set(SX, SY, WZ + 3.3);
    plug.castShadow = true;
    v.scene.add(plug);
    /* consumer unit with a real-size MCB */
    var CUX = -40, CUY = 74;
    var cu = new THREE.Mesh(roundBox(15, 19, 6.4, 1.5, 0.6, 2), K.mat.plasticWhite());
    cu.position.set(CUX, CUY, WZ + 3.2);
    cu.castShadow = true;
    v.scene.add(cu);
    var cuIn = new THREE.Mesh(new THREE.PlaneGeometry(11.5, 15.5), K.mat.std(0x3A3E46, 0.8, 0));
    cuIn.position.set(CUX, CUY, WZ + 6.45);
    v.scene.add(cuIn);
    var mcb = makeMCB({ simple: true });
    mcb.group.scale.setScalar(0.12);
    mcb.group.position.set(CUX, CUY, WZ + 6.45 - 4.8);
    v.scene.add(mcb.group);

    /* wiring: L, N from the unit to the socket; PE from the socket into the ground */
    var mLw = wireMat('l'), mNw = wireMat('n'), mPE = wireMat('pe');
    v.scene.add(KGViz.wire([[CUX - 1.6, CUY - 9.6, WZ + 0.9], [CUX - 1.6, SY + 4.4, WZ + 0.9]], { radius: 0.55, material: mLw, segments: 12, tension: 0 }));
    v.scene.add(KGViz.wire([[CUX + 1.6, CUY - 9.6, WZ + 0.9], [CUX + 1.6, SY + 4.4, WZ + 0.9]], { radius: 0.55, material: mNw, segments: 12, tension: 0 }));
    var peWall = KGViz.wire([[SX, SY - 4.4, WZ + 0.9], [SX, 3, WZ + 0.9], [SX, 0.7, WZ + 3], [SX, 0.7, 40], [SX, 0.2, 45.4], [SX, -3, 46.3], [SX, -12.5, 46.3]], { radius: 0.6, material: mPE, segments: 90, tension: 0.15 });
    v.scene.add(peWall);
    /* earth rod on the cut face of the soil */
    var mRod = K.mat.copper({ roughness: 0.4, emissive: 0xE08A3C, emissiveIntensity: 0 });
    var rod = new THREE.Mesh(new THREE.CylinderGeometry(1.25, 1.25, 17, 18), mRod);
    rod.position.set(SX, -20.8, 46.2);
    rod.castShadow = true;
    v.scene.add(rod);
    var tip = new THREE.Mesh(new THREE.ConeGeometry(1.25, 2.6, 18), mRod);
    tip.rotation.x = Math.PI;
    tip.position.set(SX, -30.6, 46.2);
    v.scene.add(tip);
    var clamp1 = new THREE.Mesh(roundBox(3.2, 2.2, 2.4, 0.5, 0.3, 1), K.mat.std(0xB08D57, 0.35, 0.9));
    clamp1.position.set(SX, -12.6, 46.4);
    v.scene.add(clamp1);
    /* three-core cord from the plug to the machine (sheath removed to show the cores) */
    var cordStart = V3(SX, SY - 2.6, WZ + 4.6), cordEnd = V3(LX - 0.3, 18, MZ - 21);
    function cordPath(off) {
      return [
        V3(cordStart.x + off, cordStart.y, cordStart.z),
        V3(SX + off * 0.8 + 3, 12, WZ + 9),
        V3(-22 + off * 0.6, 2.6 + Math.abs(off) * 0.3, MZ - 24),
        V3(LX - 6, 8 + off * 0.4, MZ - 22 + off * 0.5),
        V3(cordEnd.x, cordEnd.y + off * 0.9, cordEnd.z + off * 0.3)
      ];
    }
    var cordL = KGViz.wire(cordPath(-1.25), { radius: 0.55, material: mLw, segments: 80 });
    var cordN = KGViz.wire(cordPath(0), { radius: 0.55, material: mNw, segments: 80 });
    var cordPE = KGViz.wire(cordPath(1.25), { radius: 0.55, material: mPE, segments: 80 });
    v.scene.add(cordL, cordN, cordPE);

    /* paths for the charge dots */
    var pathL = new THREE.CurvePath();
    pathL.add(new THREE.LineCurve3(V3(CUX - 1.6, CUY - 9.6, WZ + 1.6), V3(CUX - 1.6, SY + 4.4, WZ + 1.6)));
    pathL.add(new THREE.LineCurve3(V3(CUX - 1.6, SY + 4.4, WZ + 1.6), cordL.curve.getPointAt(0)));
    pathL.add(cordL.curve);
    var pathPE = new THREE.CurvePath();
    pathPE.add(new THREE.LineCurve3(faultPos, termPos));
    var pePts = cordPE.curve.getPoints(40).reverse();
    pathPE.add(new THREE.CatmullRomCurve3(pePts));
    pathPE.add(new THREE.LineCurve3(pePts[pePts.length - 1], V3(SX, SY - 4.4, WZ + 1.6)));
    pathPE.add(peWall.curve);
    pathPE.add(new THREE.LineCurve3(V3(SX, -12.5, 46.3), V3(SX, -29, 47.6)));
    var NDL = 22, NDP = 34;
    var dotMat = K.mat.std(0xC8693A, 0.35, 0.2, { emissive: 0x8A3E16, emissiveIntensity: 0.55 });
    var dotsL = KGViz.instanced(NDL, { radius: 0.78, material: dotMat });
    var dotsP = KGViz.instanced(NDP, { radius: 0.9, material: dotMat });
    v.scene.add(dotsL, dotsP);
    /* soil spreading: faint rings around the rod tip */
    var spread = [];
    for (var i = 0; i < 3; i++) {
      var sp = new THREE.Mesh(new THREE.RingGeometry(1, 1.5, 40), new THREE.MeshBasicMaterial({ color: 0xE39A6C, transparent: true, opacity: 0, depthWrite: false }));
      sp.position.set(SX, -24, 46.5);
      v.scene.add(sp);
      spread.push(sp);
    }

    var FDX = 24, FDY = -78;
    var lblFault = v.label('arıza: faz gövdeye değdi', { at: [faultPos.x, faultPos.y, faultPos.z], cls: 'note', align: 'left', dx: FDX, dy: FDY });
    lblFault.el.style.color = P.copper;
    lblFault.el.style.fontWeight = '600';
    var lblPE = v.label('toprak hattı:<br>akım için güvenli yol', { at: [SX, -12, 46], cls: 'note chip', align: 'left', dx: 14, html: true });
    lblPE.el.style.lineHeight = '1.3';
    var lblCut = v.label('sigorta attı', { at: [CUX - 7.5, CUY, WZ + 4], cls: 'note chip', align: 'right', dx: -10 });
    var FA = { x: 0, y: 0, ok: true };

    var PERIOD = 12.5;
    var st = { flowL: 0, flowP: 0, drum: 0 };
    function timeline(t) {
      var ph = K.reducedMotion ? 4.6 : t % PERIOD;
      var fault = span(ph, 3.0, 3.4) * (1 - span(ph, 9.4, 9.8));
      var trip = span(ph, 5.6, 6.0);
      var reclose = span(ph, 10.0, 10.6);
      var lever = ph < 5.6 ? 1 : ph < 10.0 ? 1 - dropSpring(trip) : easeInOut(reclose);
      var live = ph < 5.6 ? 1 : ph < 10.0 ? 1 - span(ph, 5.6, 5.75) : span(ph, 10.4, 10.6);
      var faultFlow = ph < 5.6 ? span(ph, 3.2, 3.6) : 1 - span(ph, 5.6, 5.75);
      if (ph >= 5.75) faultFlow = 0;
      return { ph: ph, fault: fault, lever: lever, live: live, faultFlow: faultFlow, tripped: ph >= 5.7 && ph < 10.3 };
    }
    var tmp = new THREE.Vector3();
    function reset() {
      v.setView(HOME); st.flowL = st.flowP = st.drum = 0;
      if (v.lights) v.lights.key.shadow.needsUpdate = true;
    }
    reset();
    return {
      reset: reset,
      frame: function (t, dt) {
        dt = dt || 0;
        var s = timeline(t);
        mcb.setLever(s.lever);
        mcb.setIndicator(s.lever > 0.5);
        /* drum turns while the machine has power */
        var mv = K.reducedMotion ? 0 : dt;
        st.drum += mv * 2.2 * s.live;
        drum.rotation.z = -st.drum;
        disp.material.emissiveIntensity = 0.55 * s.live;
        faultGlow.material.opacity = 0.9 * s.fault * (s.live > 0.5 ? 1 : 0.35);
        /* normal load current on L (copper dots toward the machine) */
        st.flowL += mv * (0.12 + 0.25 * s.faultFlow) * s.live;
        for (var i = 0; i < NDL; i++) {
          if (s.live < 0.05) { dotsL.hideAt(i); continue; }
          pathL.getPointAt((i / NDL + st.flowL) % 1, tmp);
          dotsL.setAt(i, tmp.x, tmp.y, tmp.z, s.live);
        }
        dotsL.commit();
        /* fault current: casing → earth terminal → PE core → socket → earth wire → rod */
        st.flowP += mv * 0.2 * s.faultFlow;
        for (i = 0; i < NDP; i++) {
          if (s.faultFlow < 0.03) { dotsP.hideAt(i); continue; }
          pathPE.getPointAt((i / NDP + st.flowP) % 1, tmp);
          dotsP.setAt(i, tmp.x, tmp.y, tmp.z, s.faultFlow);
        }
        dotsP.commit();
        mRod.emissiveIntensity = 0.5 * s.faultFlow;
        for (i = 0; i < 3; i++) {
          var q = K.reducedMotion ? 0.3 + i * 0.25 : ((t * 0.5 + i / 3) % 1);
          spread[i].scale.setScalar(2 + q * 9);
          spread[i].material.opacity = 0.45 * (1 - q) * s.faultFlow;
        }
        setStyle(lblFault.el, 'opacity', s.fault.toFixed(1));
        setStyle(lblPE.el, 'opacity', Math.max(s.faultFlow, s.tripped ? 0.75 : 0).toFixed(1));
        setStyle(lblCut.el, 'opacity', s.tripped ? '1' : '0');
        v.render(dt);
        if (K.skipRender) return;
        /* leader for the fault label, fading with it */
        if (s.fault > 0.01) {
          var c2 = v.ctx;
          proj(v, faultPos, FA);
          c2.save();
          c2.globalAlpha = s.fault;
          c2.strokeStyle = 'rgba(166,75,34,.75)';
          c2.fillStyle = 'rgba(166,75,34,.9)';
          c2.lineWidth = 1;
          c2.beginPath(); c2.moveTo(FA.x, FA.y); c2.lineTo(FA.x + FDX - 3, FA.y + FDY + 6); c2.stroke();
          c2.beginPath(); c2.arc(FA.x, FA.y, 2, 0, TAU); c2.fill();
          c2.restore();
        }
        cornerTag(v.ctx, 'yavaşlatılmış', 8, 11, dark);
      },
      resize: function () { v.sf.resize(); },
      dispose: function () { v.dispose(); }
    };
  });

  /* ==================================================================
   * current-scale · 640×340 · light · 2D
   * The scientific answer to "prize elimi sokarsam?": I = V ÷ R on a
   * logarithmic current axis with the IEC 60479-1 (50 Hz) effect zones.
   * ================================================================== */
  K.register('current-scale', function (el, opts) {
    var sf = K.surface(el), ctx = sf.ctx;
    var C = tone(opts.theme || 'light');
    var SRC = {
      pil: { v: 1.5, label: '1,5 V pil' },
      aku: { v: 12, label: '12 V akü' },
      priz: { v: 230, label: '230 V priz' }
    };
    /* simplified body model: ≤ 50 V → dry 100 kΩ, wet 10 kΩ; 230 V → dry 2 kΩ, wet 1 kΩ */
    function bodyR(v, skin) { return v <= 50 ? (skin === 'islak' ? 10000 : 100000) : (skin === 'islak' ? 1000 : 2000); }
    function currentMA(src, skin) { var v = SRC[src].v; return v / bodyR(v, skin) * 1000; }
    function fmtI(I) { return K.num(I, I < 0.1 ? 3 : I < 1 ? 2 : I < 10 ? 1 : 0); }
    function fmtV(v) { return K.num(v, v % 1 ? 1 : 0); }
    var ZONES = [
      { a: 0.01, b: 0.5, name: ['hissedilmez'], range: '< 0,5 mA', fill: P.neutral, alpha: 0.16 },
      { a: 0.5, b: 10, name: ['hissedilir,', 'kaslar kasılabilir'], range: '0,5–10 mA', fill: P.copperFill, alpha: 0.07 },
      { a: 10, b: 30, name: ['tuttuğunu', 'bırakamaz'], range: '10–30 mA', fill: P.copperFill, alpha: 0.14 },
      { a: 30, b: 50, name: ['solunum', 'güçleşir'], range: '30–50 mA', fill: P.copperFill, alpha: 0.21 },
      { a: 50, b: 1000, name: ['kalp ritmi', 'bozulabilir'], range: '> 50 mA', fill: P.copperFill, alpha: 0.29 }
    ];
    function zoneOf(I) { return I < 0.5 ? 0 : I < 10 ? 1 : I < 30 ? 2 : I < 50 ? 3 : 4; }
    var ZONE_TEXT = ['hissedilmez', 'hissedilir, kaslar kasılabilir', 'tuttuğunu bırakamaz', 'solunum güçleşir', 'kalp ritmi bozulabilir'];
    var BRACKET = 140;
    var MK = [
      { src: 'pil', skin: 'kuru', h: 36, side: 1, name: '1,5 V pil, kuru' },
      { src: 'aku', skin: 'kuru', h: 76, side: 1, name: '12 V akü, kuru' },
      { src: 'aku', skin: 'islak', h: 116, side: 1, name: '12 V akü, ıslak' },
      { src: 'priz', skin: 'kuru', h: 60, side: -1, name: 'kuru', priz: true },
      { src: 'priz', skin: 'islak', h: 98, side: 1, name: 'ıslak', priz: true },
      { src: 'pil', skin: 'islak', h: 140, side: 1, name: '1,5 V pil, ıslak', extra: true }
    ];
    MK.forEach(function (m) { m.I = currentMA(m.src, m.skin); m.L = Math.log(m.I) / Math.LN10; });
    var DROP0 = 0.5, DROPSTEP = 0.75, TOUR0 = DROP0 + DROPSTEP * 4 + 1.4, TOURSTEP = 3.4;

    var st = {};
    function findMarker(src, skin) {
      for (var i = 0; i < MK.length; i++) if (MK[i].src === src && MK[i].skin === skin) return i;
      return 0;
    }
    function reset() {
      st.auto = true;
      st.source = 'hepsi';
      st.skin = 'kuru';
      st.sel = 3;
      st.now = 0;
      st.needleA = 0;
      st.pos = MK[0].L; st.vel = 0;
      st.zoneHl = [0, 0, 0, 0, 0];
      MK.forEach(function (m, i) {
        m.t0 = m.extra ? null : DROP0 + DROPSTEP * i;
        m.alpha = 1; m.hl = 0; m.vis = m.extra ? 0 : 1;
      });
      if (K.reducedMotion) MK.forEach(function (m) { if (!m.extra) m.t0 = -10; });
    }
    function selected() {
      if (st.auto) {
        if (K.reducedMotion) return 3;
        if (st.now < TOUR0) return 0;
        return Math.floor((st.now - TOUR0) / TOURSTEP) % 5;
      }
      return st.sel;
    }
    function applySelection() {
      var src = st.source === 'hepsi' ? 'priz' : st.source;
      st.sel = findMarker(src, st.skin);
      var ex = MK[5];
      if (st.sel === 5 && ex.t0 === null) ex.t0 = st.now;
      if (st.sel !== 5) ex.t0 = null;
    }

    function update(t, dt) {
      st.now = t;
      var s = selected();
      var target = MK[s].L;
      if (K.reducedMotion) { st.pos = target; st.vel = 0; }
      /* critically damped needle */
      var w0 = 7;
      var steps = Math.max(1, Math.ceil(dt / 0.01)), h = dt / steps;
      for (var k = 0; k < steps; k++) {
        var acc = w0 * w0 * (target - st.pos) - 2 * w0 * st.vel;
        st.vel += acc * h; st.pos += st.vel * h;
      }
      var showNeedle = st.auto && !K.reducedMotion ? (t > TOUR0 - 0.6 ? 1 : 0) : 1;
      st.needleA = K.reducedMotion ? 1 : approach(st.needleA, showNeedle, 5, dt);
      if (st.auto && !K.reducedMotion && t < TOUR0 - 0.6) { st.pos = MK[0].L; st.vel = 0; }
      var zNow = zoneOf(Math.pow(10, st.pos));
      for (var z = 0; z < 5; z++) st.zoneHl[z] = approach(st.zoneHl[z], z === zNow ? st.needleA : 0, 6, dt);
      MK.forEach(function (m, i) {
        var dim = !st.auto && st.source !== 'hepsi' && i !== s;
        m.alpha = approach(m.alpha, dim ? 0.3 : 1, 6, dt);
        m.hl = approach(m.hl, i === s ? st.needleA : 0, 6, dt);
        m.vis = approach(m.vis, m.t0 === null ? 0 : 1, 8, dt);
      });
    }

    var layoutCache = null;
    function headerLayout(xOf) {
      if (layoutCache && layoutCache.key === sf.w + '|' + fontsReady()) return layoutCache.items;
      var items = ZONES.map(function (z) {
        var wN = 0;
        z.name.forEach(function (s) { wN = Math.max(wN, textW(ctx, s, 12.5, 500, false)); });
        var wR = textW(ctx, z.range, 11, 500, true);
        var c = (xOf(z.a) + xOf(z.b)) / 2;
        return { c: c, x: c, w: Math.max(wN, wR), lines: z.name.length };
      });
      /* resolve overlaps left to right, then pull back inside the frame */
      var gap = 12, i;
      for (var it = 0; it < 4; it++) {
        for (i = 1; i < items.length; i++) {
          var minX = items[i - 1].x + items[i - 1].w / 2 + gap + items[i].w / 2;
          if (items[i].x < minX) items[i].x = minX;
        }
        var over = items[items.length - 1].x + items[items.length - 1].w / 2 - (sf.w - 6);
        if (over > 0) for (i = items.length - 1; i >= 0; i--) {
          items[i].x -= over;
          if (i > 0) {
            var maxPrev = items[i].x - items[i].w / 2 - gap - items[i - 1].w / 2;
            if (items[i - 1].x > maxPrev) { over = items[i - 1].x - maxPrev; } else break;
          }
        }
      }
      layoutCache = { key: sf.w + '|' + fontsReady(), items: items };
      return items;
    }

    function draw(t) {
      var w = sf.w, h = sf.h;
      var xL = 46, xR = w - 34, yTop = 74, yAx = 240;
      function xOf(I) { return xL + (Math.log(I) / Math.LN10 + 2) / 5 * (xR - xL); }
      function xL10(L) { return xL + (L + 2) / 5 * (xR - xL); }
      sf.clear();
      var i, z, x, y;

      /* zone bands */
      for (i = 0; i < 5; i++) {
        z = ZONES[i];
        var x1 = Math.round(xOf(z.a)), x2 = Math.round(xOf(z.b));
        ctx.fillStyle = K.rgba(z.fill, z.alpha + 0.07 * st.zoneHl[i]);
        ctx.fillRect(x1, yTop, x2 - x1, yAx - yTop);
        ctx.fillStyle = K.rgba(i === 0 ? P.neutral : P.copperFill, 0.45 + 0.5 * st.zoneHl[i]);
        ctx.fillRect(x1, yTop, x2 - x1, 2);
      }
      /* decade guides */
      ctx.save();
      ctx.strokeStyle = K.rgba(C.ink, 0.07);
      ctx.lineWidth = 1;
      ctx.setLineDash([1, 3]);
      ctx.beginPath();
      for (i = -1; i <= 2; i++) { x = Math.round(xL10(i)) + 0.5; ctx.moveTo(x, yTop + 4); ctx.lineTo(x, yAx); }
      ctx.stroke();
      ctx.restore();

      /* zone header labels with leaders */
      var items = headerLayout(xOf);
      for (i = 0; i < 5; i++) {
        z = ZONES[i];
        var it = items[i], hl = st.zoneHl[i];
        var yR = yTop - 14;
        var col = K.mix(C.ink2, C.ink, hl);
        text(ctx, z.range, it.x, yR, { size: 11, weight: 500, mono: true, color: K.mix(C.muted, i === 0 ? C.ink2 : C.copper, hl), align: 'center' });
        for (var l = 0; l < z.name.length; l++) {
          text(ctx, z.name[l], it.x, yR - 15 - (z.name.length - 1 - l) * 15, { size: 12.5, weight: hl > 0.5 ? 600 : 500, color: col, align: 'center' });
        }
        ctx.save();
        ctx.strokeStyle = K.rgba(C.ink2, 0.45);
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(it.x, yTop - 9); ctx.lineTo(it.c, yTop - 1);
        ctx.stroke();
        ctx.restore();
      }

      /* residual-current device threshold */
      var x30 = Math.round(xOf(30)) + 0.5;
      ctx.save();
      ctx.strokeStyle = C.blue;
      ctx.lineWidth = 1.4;
      ctx.setLineDash([5, 4]);
      ctx.beginPath(); ctx.moveTo(x30, yTop + 3); ctx.lineTo(x30, yAx + 30); ctx.stroke();
      ctx.restore();
      text(ctx, '30 mA · kaçak akım rölesi', x30, yAx + 46, { size: 12.5, weight: 600, color: C.blue, align: 'center' });

      /* axis */
      ctx.save();
      ctx.strokeStyle = C.ink2;
      ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.moveTo(xL, yAx + 0.5); ctx.lineTo(xR, yAx + 0.5); ctx.stroke();
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (i = -2; i <= 3; i++) {
        x = Math.round(xL10(i)) + 0.5;
        ctx.moveTo(x, yAx); ctx.lineTo(x, yAx + 7);
        if (i < 3) for (var m = 2; m <= 9; m++) {
          var xm = Math.round(xL10(i + Math.log(m) / Math.LN10)) + 0.5;
          ctx.moveTo(xm, yAx); ctx.lineTo(xm, yAx + 3.5);
        }
      }
      ctx.stroke();
      ctx.restore();
      var DEC = ['0,01 mA', '0,1 mA', '1 mA', '10 mA', '100 mA', '1.000 mA'];
      for (i = 0; i < 6; i++) text(ctx, DEC[i], xL10(i - 2), yAx + 22, { size: 11.5, weight: 500, mono: true, color: C.ink2, align: 'center' });

      /* markers */
      var tt = st.now;
      var prizLanded = 1;
      for (i = 0; i < MK.length; i++) {
        var mk = MK[i];
        if (mk.t0 === null && mk.vis < 0.01) continue;
        var t0 = mk.t0 === null ? -10 : mk.t0;
        var pDrop = easeOut(span(tt, t0, t0 + 0.6));
        var pStem = easeInOut(span(tt, t0 + 0.5, t0 + 0.95));
        var pLab = span(tt, t0 + 0.7, t0 + 1.1);
        if (mk.priz) prizLanded = Math.min(prizLanded, pStem);
        if (tt < t0) { if (mk.priz) prizLanded = 0; continue; }
        var a = mk.alpha * mk.vis;
        var col2 = mk.priz ? C.copper : C.ink;
        var dotCol = mk.priz ? P.copperFill : C.ink;
        x = xOf(mk.I);
        y = lerp(yTop + 8, yAx, pDrop);
        var stemH = mk.priz ? BRACKET - 9 : mk.h;
        var yS = yAx - stemH * pStem;
        ctx.save();
        ctx.globalAlpha = a;
        if (pStem > 0) {
          ctx.strokeStyle = K.rgba(mk.priz ? P.copperFill : C.ink2, 0.75);
          ctx.lineWidth = 1;
          ctx.beginPath(); ctx.moveTo(Math.round(x) + 0.5, yAx - 5); ctx.lineTo(Math.round(x) + 0.5, Math.min(yAx - 5, yS)); ctx.stroke();
        }
        if (mk.hl > 0.01) {
          ctx.strokeStyle = K.rgba(dotCol, 0.35 * mk.hl);
          ctx.lineWidth = 1.5;
          ctx.beginPath(); ctx.arc(x, y, 7 + 4 * mk.hl, 0, TAU); ctx.stroke();
        }
        ctx.fillStyle = C.bg;
        ctx.beginPath(); ctx.arc(x, y, 6 + 1.2 * mk.hl, 0, TAU); ctx.fill();
        ctx.fillStyle = dotCol;
        ctx.beginPath(); ctx.arc(x, y, 4.4 + 1.2 * mk.hl, 0, TAU); ctx.fill();
        ctx.restore();
        if (pLab > 0) {
          var yl = yAx - mk.h;
          /* the 0,12 mA label moves to the left of its stem while the 0,15 mA marker is shown */
          var flip = i === 1 ? MK[5].vis : 0;
          for (var sdx = 0; sdx < 2; sdx++) {
            var side = sdx === 0 ? mk.side : -mk.side;
            var la = a * pLab * (sdx === 0 ? 1 - flip : flip);
            if (la < 0.01) continue;
            var lx = x + side * 8;
            var al = side > 0 ? 'left' : 'right';
            text(ctx, mk.name, lx, yl + 4, { size: 12, weight: 500, color: mk.priz ? C.copper : C.ink2, align: al, alpha: la });
            text(ctx, fmtI(mk.I) + ' mA', lx, yl + 19, { size: 13, weight: mk.hl > 0.5 ? 700 : 600, mono: true, color: col2, align: al, alpha: la });
          }
        }
      }
      /* "priz" bracket over the two mains markers */
      if (prizLanded > 0) {
        var xa = Math.round(xOf(MK[3].I)) + 0.5, xb = Math.round(xOf(MK[4].I)) + 0.5, yb = yAx - BRACKET + 0.5;
        var ab = prizLanded * Math.max(MK[3].alpha, MK[4].alpha);
        ctx.save();
        ctx.globalAlpha = ab;
        ctx.strokeStyle = P.copperFill;
        ctx.lineWidth = 1.3;
        ctx.lineJoin = 'round';
        var xm = (xa + xb) / 2, r = 5;
        ctx.beginPath();
        ctx.moveTo(xa, yb + 5);
        ctx.quadraticCurveTo(xa, yb, xa + r, yb);
        ctx.lineTo(xm - r, yb);
        ctx.quadraticCurveTo(xm, yb, xm, yb - 5);
        ctx.quadraticCurveTo(xm, yb, xm + r, yb);
        ctx.lineTo(xb - r, yb);
        ctx.quadraticCurveTo(xb, yb, xb, yb + 5);
        ctx.stroke();
        ctx.restore();
        text(ctx, '230 V priz', xm, yb - 11, { size: 13, weight: 600, color: C.copper, align: 'center', alpha: ab });
      }

      /* needle */
      if (st.needleA > 0.01) {
        x = xL10(st.pos);
        /* the needle rises to the selected marker's stem; its height follows the travel */
        var sm2 = MK[selected()];
        var hT = sm2.priz ? BRACKET - 9 : sm2.h;
        var far = clamp(Math.abs(sm2.L - st.pos) / 0.6, 0, 1);
        var hN = lerp(hT, 22, far);
        ctx.save();
        ctx.globalAlpha = st.needleA;
        ctx.strokeStyle = sm2.priz ? C.copper : C.ink;
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(x, yAx - 1); ctx.lineTo(x, yAx - hN); ctx.stroke();
        ctx.fillStyle = C.ink;
        ctx.beginPath();
        ctx.moveTo(x, yAx + 1.5); ctx.lineTo(x - 6, yAx + 12); ctx.lineTo(x + 6, yAx + 12); ctx.closePath();
        ctx.fill();
        ctx.restore();
      }

      /* model and source notes */
      text(ctx, 'Vücut direnci modeli: 1,5 V ve 12 V için kuru 100 kΩ, ıslak 10 kΩ · 230 V için kuru 2 kΩ, ıslak 1 kΩ', xL - 30, h - 26, { size: 11.5, color: C.muted });
    }

    /* readouts follow the needle; before the tour starts they show the default case (230 V, dry skin) */
    function readIndex() { return st.auto && st.now < TOUR0 - 0.6 ? 3 : selected(); }
    function formula() {
      var m = MK[readIndex()];
      var v = SRC[m.src].v, R = bodyR(v, m.skin);
      return 'I = V ÷ R = ' + fmtV(v) + ' V ÷ ' + K.num(R, 0) + ' Ω = ' + fmtI(m.I) + ' mA';
    }

    reset();
    return {
      reset: reset,
      frame: function (t, dt) {
        update(t, dt || 0.016);
        if (!K.skipRender) draw(t);
      },
      set: function (k, v) {
        if (k === 'source' && (v === 'pil' || v === 'aku' || v === 'priz' || v === 'hepsi')) st.source = v;
        else if (k === 'skin' && (v === 'kuru' || v === 'islak')) st.skin = v;
        else return;
        st.auto = false;
        applySelection();
      },
      read: function (k) {
        if (k === 'formula') return formula();
        if (k === 'effect') { var m = MK[readIndex()]; return fmtI(m.I) + ' mA: ' + ZONE_TEXT[zoneOf(m.I)]; }
        return '';
      },
      resize: function () { sf.resize(); layoutCache = null; },
      dispose: function () { sf.dispose(); }
    };
  });
})();
