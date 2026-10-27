/* Köklerden Göklere · Builder M: yön tartışması (odak slaytı)
 * direction-lab · 1120×440 tasarım alanı, kutuya sığacak şekilde ölçeklenir · 2B
 * Tek devre, dört görünüm: elektron, alan, franklin, hepsi. Otomatik gösteri 4 görünümü sırayla gezer.
 * set('view', ...) gösteriyi durdurur ve o görünümü sakin bir döngüde oynatır.
 * Sözleşme: kg-viz.js. Tüm hareket frame(t) içinden sürülür, rastgelelik KGViz.rng ile.
 */
(function () {
  'use strict';
  var K = window.KGViz;
  if (!K) return;
  var P = K.palette;
  var clamp = K.clamp;

  var VIEWS = ['elektron', 'alan', 'franklin', 'hepsi'];
  var DEMO = 8;
  var DW = 1120, DH = 440;

  var EXPLAIN = {
    elektron: 'Telde eksi yüklü elektronlar hareket eder: pilin eksi ucundan çıkıp artı uca doğru kayarlar.',
    alan: 'Elektrik alanı ve akım yönü artıdan eksiyedir; elektronlar eksi olduğu için alana ters yönde gider.',
    franklin: 'Franklin akan şeyin artı yüklü olduğunu sandı; lamba için fark yok, ışık aynı kalır.',
    hepsi: 'Elektronlar eksiden artıya gider, akım yönü ve alan artıdan eksiyedir: üçü de aynı olayı anlatır.'
  };

  K.register('direction-lab', function (el, opts) {
    opts = opts || {};
    var dark = (opts.theme || 'light') === 'dark';
    var sf = K.surface(el);
    var C = {
      ink: dark ? P.onNight : P.ink,
      ink2: dark ? '#C9CFDA' : P.ink2,
      muted: dark ? P.onNightMuted : P.muted,
      line: dark ? P.nightLine : P.line,
      blue: dark ? P.blueLight : P.blue,
      cop: dark ? P.copperLight : P.copperFill,
      copText: dark ? P.copperLight : (P.copperText || '#A64B22'),
      grey: dark ? '#9AA3B2' : '#666C78',
      wireO: dark ? '#4A5160' : '#AEB3BE',
      wireI: dark ? '#262C3A' : '#E9E9E3',
      card: dark ? '#161B26' : '#FFFFFF',
      lamp: '#F2C46B',
      fil: '#D98A2B'
    };

    /* ---------- geometri (tasarım px, 1120×440) ---------- */
    var X0 = 190, X1 = 930, YT = 128, YB = 344, YC = 236;
    var BT = 176, BB = 296;                 // pil gövdesi üst / alt
    var SEG = [                             // elektron yönü, pilin eksi ucundan
      [X0, BB, X0, YB],
      [X0, YB, X1, YB],
      [X1, YB, X1, YT],
      [X1, YT, X0, YT],
      [X0, YT, X0, BT]
    ];
    var SL = [], LOOP = 0, k;
    for (k = 0; k < SEG.length; k++) {
      SL.push(Math.abs(SEG[k][2] - SEG[k][0]) + Math.abs(SEG[k][3] - SEG[k][1]));
      LOOP += SL[k];
    }
    var VIS = LOOP;
    LOOP += BB - BT;
    var PT = { x: 0, y: 0, nx: 0, ny: 0 };
    function pointAt(s) {
      s = ((s % LOOP) + LOOP) % LOOP;
      if (s >= VIS) return false;
      for (var i = 0; i < SEG.length; i++) {
        if (s <= SL[i]) {
          var g = SEG[i], u = s / SL[i];
          var dx = Math.sign(g[2] - g[0]), dy = Math.sign(g[3] - g[1]);
          PT.x = g[0] + (g[2] - g[0]) * u; PT.y = g[1] + (g[3] - g[1]) * u;
          PT.nx = -dy; PT.ny = dx;
          return true;
        }
        s -= SL[i];
      }
      return false;
    }

    var SPACING = 46, N = Math.round(LOOP / SPACING);
    var rng = K.rng(1747);
    var dots = [];
    for (k = 0; k < N; k++) dots.push({ s0: k * LOOP / N, off: (rng() - 0.5) * 5, ph: rng() * 6.283 });
    var V_E = 38;                           // px/s: bilerek yavaş
    var V_WAVE = 330;

    /* ---------- durum ---------- */
    var view = 'elektron', auto = true, A = null;
    function targets(v) {
      return {
        elektron: v === 'elektron' || v === 'hepsi' ? 1 : 0,
        elabel: v === 'elektron' || v === 'hepsi' ? 1 : 0,
        dotsE: v === 'elektron' || v === 'hepsi' ? 1 : 0,
        dotsF: v === 'franklin' ? 1 : 0,
        field: v === 'alan' || v === 'hepsi' ? 1 : 0,
        flabel: v === 'alan' || v === 'hepsi' ? 1 : 0,
        cop: v === 'alan' || v === 'franklin' || v === 'hepsi' ? 1 : 0,
        copLab: v === 'alan' || v === 'hepsi' ? 1 : 0,
        fk: v === 'franklin' ? 1 : 0
      };
    }
    function resetState() { view = 'elektron'; auto = true; A = targets(view); }
    resetState();

    /* ---------- çizim yardımcıları ---------- */
    function txt(g, s, x, y, o) { K.label(g, s, x, y, o); }
    function charge(g, x, y, r, neg, a) {
      g.save();
      g.globalAlpha *= a;
      // yumuşak gölge
      g.fillStyle = 'rgba(20,24,40,.16)';
      g.beginPath(); g.arc(x + 1.2, y + 1.8, r, 0, 6.2832); g.fill();
      g.fillStyle = neg ? C.blue : C.cop;
      g.beginPath(); g.arc(x, y, r, 0, 6.2832); g.fill();
      g.fillStyle = 'rgba(255,255,255,.28)';
      g.beginPath(); g.arc(x - r * 0.3, y - r * 0.35, r * 0.45, 0, 6.2832); g.fill();
      g.strokeStyle = '#FFFFFF'; g.lineWidth = Math.max(1.6, r * 0.26); g.lineCap = 'round';
      g.beginPath(); g.moveTo(x - r * 0.5, y); g.lineTo(x + r * 0.5, y);
      if (!neg) { g.moveTo(x, y - r * 0.5); g.lineTo(x, y + r * 0.5); }
      g.stroke();
      g.restore();
    }
    function tag(g, s, xr, y, a) {
      g.save();
      g.globalAlpha *= a;
      g.font = K.font(14, 500, true);
      var w = g.measureText(s).width + 18;
      g.strokeStyle = C.muted; g.lineWidth = 1;
      K.rr(g, xr - w + 0.5, y - 16.5, w, 26, 5); g.stroke();
      g.restore();
      txt(g, s, xr - w + 9, y + 2, { size: 14, mono: true, weight: 500, color: C.muted, alpha: a });
    }
    function pulse(g, x, y, tt, color, a) {
      if (a <= 0.01) return;
      for (var j = 0; j < 2; j++) {
        var u = ((tt / 2.2 + j * 0.5) % 1);
        g.save();
        g.globalAlpha = a * (1 - u) * 0.8;
        g.strokeStyle = color; g.lineWidth = 3;
        g.beginPath(); g.arc(x, y, 30 + u * 34, 0, 6.2832); g.stroke();
        g.restore();
      }
    }

    function drawWire(g) {
      g.save();
      g.lineJoin = 'round'; g.lineCap = 'butt';
      g.beginPath();
      g.moveTo(X0, BT); g.lineTo(X0, YT); g.lineTo(X1, YT); g.lineTo(X1, YB); g.lineTo(X0, YB); g.lineTo(X0, BB);
      g.strokeStyle = 'rgba(20,24,40,.10)'; g.lineWidth = 20; g.translate(0, 2.5); g.stroke(); g.translate(0, -2.5);
      g.strokeStyle = C.wireO; g.lineWidth = 17; g.stroke();
      g.strokeStyle = C.wireI; g.lineWidth = 12; g.stroke();
      g.restore();
    }

    function drawLamp(g, tt) {
      var fl = 1 + (K.reducedMotion ? 0 : 0.015 * Math.sin(tt * 9));
      K.drawGlow(g, '#F7C867', X1, YC, 150, 0.55 * fl);
      K.drawGlow(g, '#FFE9B0', X1, YC, 70, 0.6);
      g.save();
      g.strokeStyle = C.lamp; g.lineWidth = 3; g.lineCap = 'round';
      for (var i = 0; i < 12; i++) {
        var a = i * Math.PI / 6 + 0.26;
        if (Math.abs(Math.cos(a)) < 0.2) continue;
        g.beginPath();
        g.moveTo(X1 + Math.cos(a) * 62, YC + Math.sin(a) * 62);
        g.lineTo(X1 + Math.cos(a) * 76, YC + Math.sin(a) * 76);
        g.stroke();
      }
      g.fillStyle = C.lamp;
      g.beginPath(); g.arc(X1, YC, 48, 0, 6.2832); g.fill();
      g.fillStyle = 'rgba(255,255,255,.45)';
      g.beginPath(); g.arc(X1, YC, 34, 0, 6.2832); g.fill();
      g.strokeStyle = C.ink2; g.lineWidth = 2.6;
      g.beginPath(); g.arc(X1, YC, 48, 0, 6.2832); g.stroke();
      g.strokeStyle = C.fil; g.lineWidth = 6;
      g.beginPath(); g.moveTo(X1, YC - 40); g.lineTo(X1, YC + 40); g.stroke();
      g.restore();
    }

    function drawBattery(g) {
      g.save();
      g.fillStyle = 'rgba(20,24,40,.12)';
      K.rr(g, X0 - 33, BT + 5, 70, BB - BT, 8); g.fill();
      g.fillStyle = C.ink2;
      K.rr(g, X0 - 14, BT - 12, 28, 14, 3); g.fill();
      g.fillStyle = C.card;
      K.rr(g, X0 - 36, BT, 72, BB - BT, 8); g.fill();
      g.save();
      K.rr(g, X0 - 36, BT, 72, BB - BT, 8); g.clip();
      g.fillStyle = dark ? 'rgba(227,154,108,.24)' : 'rgba(200,105,58,.16)';
      g.fillRect(X0 - 36, BT, 72, 60);
      g.fillStyle = dark ? 'rgba(142,166,242,.24)' : 'rgba(35,67,176,.12)';
      g.fillRect(X0 - 36, BT + 60, 72, 60);
      g.restore();
      g.strokeStyle = C.ink2; g.lineWidth = 2;
      K.rr(g, X0 - 36, BT, 72, BB - BT, 8); g.stroke();
      txt(g, '+', X0, BT + 44, { size: 38, weight: 600, color: C.copText, align: 'center' });
      txt(g, '−', X0, BB - 16, { size: 38, weight: 600, color: C.blue, align: 'center' });
      g.restore();
    }

    function drawCarriers(g, tt, dir, neg, a) {
      if (a <= 0.01) return;
      g.save();
      g.globalAlpha *= a;
      for (var i = 0; i < dots.length; i++) {
        var d = dots[i];
        if (!pointAt(d.s0 + dir * V_E * tt)) continue;
        var o = d.off + (K.reducedMotion ? 0 : Math.sin(tt * 3 + d.ph) * 1.0);
        charge(g, PT.x + PT.nx * o, PT.y + PT.ny * o, 7.2, neg, 1);
      }
      g.restore();
    }

    function fieldArrow(g, x1, y1, x2, y2, dist, tt, a) {
      var w = K.reducedMotion ? 0.5 : 0.5 + 0.5 * Math.cos(6.2832 * (dist - V_WAVE * tt) / 600);
      K.arrow(g, x1, y1, x2, y2, { color: C.grey, width: 3.2, head: 12, alpha: a * (0.38 + 0.62 * w) });
    }
    function drawField(g, tt, a) {
      if (a <= 0.01) return;
      var i, xs = [300, 440, 580, 720], x, L = X1 - X0;
      for (i = 0; i < xs.length; i++) {
        x = xs[i];
        fieldArrow(g, x - 30, YT + 24, x + 30, YT + 24, x - X0, tt, a);                    // üst: sağa
        fieldArrow(g, x + 30, YB - 24, x - 30, YB - 24, L + 216 + (X1 - x), tt, a);        // alt: sola
      }
      fieldArrow(g, X1 - 32, YT + 34, X1 - 32, YT + 66, L + 20, tt, a);
      fieldArrow(g, X1 - 32, YB - 66, X1 - 32, YB - 34, L + 160, tt, a);
    }

    function band(g, tt) {
      var xa = 420, xb = 740;
      // bakır ok (akım yönü / Franklin) y = 66, mavi ok (elektron) y = 98
      K.arrow(g, xa, 66, xb, 66, { color: C.cop, width: 4.2, head: 15, alpha: A.cop });
      K.arrow(g, xb, 98, xa, 98, { color: C.blue, width: 4.2, head: 15, alpha: A.elektron });
      var xr = xa - 16;
      txt(g, 'akım yönü: artıdan eksiye', xr, 73, { size: 21, weight: 700, color: C.copText, align: 'right', alpha: A.copLab });
      txt(g, 'Franklin’in tahmini: artı yükler akar', xr, 73, { size: 21, weight: 700, color: C.copText, align: 'right', alpha: A.fk });
      txt(g, 'elektronlar: eksiden artıya', xr, 105, { size: 21, weight: 700, color: C.blue, align: 'right', alpha: A.elabel });
    }

    function frame(t, dt) {
      var g = sf.ctx, W = sf.w, H = sf.h;
      if (auto && !K.reducedMotion) view = VIEWS[Math.floor(t / DEMO) % VIEWS.length];
      var T = targets(view), rate = 1 - Math.exp(-6 * Math.max(dt, 0.0001));
      for (var key in T) A[key] += (T[key] - A[key]) * rate;
      var tt = K.reducedMotion ? 2 : t;

      sf.clear();
      var s = Math.min(W / DW, H / DH);
      g.save();
      g.translate((W - DW * s) / 2, (H - DH * s) / 2);
      g.scale(s, s);

      tag(g, 'elektron hızı abartılı', DW - 24, 28, Math.max(A.dotsE, A.dotsF));
      band(g, tt);

      drawWire(g);
      drawLamp(g, tt);
      drawCarriers(g, tt, 1, true, A.dotsE);
      drawCarriers(g, tt, -1, false, A.dotsF);
      drawBattery(g);
      drawField(g, tt, A.field);

      // yumuşak vurgu: konuşulan şeyin üstünde
      pulse(g, X0, BB, tt, C.blue, A.elabel * (view === 'hepsi' ? 0 : 1));
      pulse(g, X0, BT, tt, C.cop, A.copLab * (view === 'hepsi' ? 0 : 1) + A.fk);

      txt(g, 'elektrik alanı', 560, 240, { size: 21, weight: 700, color: C.grey, align: 'center', alpha: A.flabel });
      txt(g, 'lamba için ikisi aynı: aynı ışık', 560, 240, { size: 21, weight: 700, color: C.ink, align: 'center', alpha: A.fk });
      txt(g, 'gerçek hareket yavaş, itiş çok hızlı', 560, 240, { size: 20, weight: 500, color: C.ink2, align: 'center', alpha: A.elabel * (1 - A.flabel) });

      g.restore();
    }

    return {
      reset: function () { resetState(); },
      frame: frame,
      set: function (key, val) {
        if (key === 'view' && VIEWS.indexOf(val) >= 0) { view = val; auto = false; }
      },
      read: function (key) {
        if (key === 'explain') return EXPLAIN[view];
        if (key === 'view') return view;
        return '';
      },
      resize: function () { sf.resize(); },
      dispose: function () { sf.dispose(); }
    };
  });
})();
