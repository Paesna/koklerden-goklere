/* Köklerden Göklere · Builder M: yön tartışması
 * direction-lab · 1120×380 · açık tema (2B)
 * Tek devre, dört görünüm: elektron, alan, franklin, hepsi.
 * Sözleşme: kg-viz.js. Tüm hareket frame(t) içinden sürülür, rastgelelik KGViz.rng ile.
 */
(function () {
  'use strict';
  var K = window.KGViz;
  if (!K) return;
  var P = K.palette;
  var clamp = K.clamp;

  var VIEWS = ['elektron', 'alan', 'franklin', 'hepsi'];
  var TABS = ['elektron', 'alan', 'Franklin', 'hepsi'];
  var DEMO = 8;

  var EXPLAIN = {
    elektron: 'Metal telde hareket eden, eksi yüklü elektronlardır. Pilin eksi ucundan çıkıp lambadan geçer ve çok yavaş bir sürüklenmeyle artı uca doğru ilerlerler.',
    alan: 'Elektrik alanı, artı bir deneme yükünün itildiği yönü gösterir: artıdan eksiye. Elektron eksi yüklü olduğu için alana ters yönde hızlanır.',
    franklin: 'Franklin 1747’de akan şeyin artı yüklü olduğunu sandı. Lambanın yanması için bunun önemi yok: ışık ve enerji aynı kalır.',
    hepsi: 'Elektronlar eksiden artıya gider; alan ve akım yönü artıdan eksiye gösterilir. Franklin’in seçimi tersine çıktı, ama hesaplar tutarlı olduğu için eski yön kaldı.'
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
      copText: dark ? P.copperLight : P.copperText || '#A64B22',
      grey: dark ? '#9AA3B2' : '#666C78',
      wireO: dark ? '#4A5160' : '#B8BCC6',
      wireI: dark ? '#222836' : '#E6E6E0',
      card: dark ? '#161B26' : '#FFFFFF',
      lamp: '#F2C46B',
      fil: '#D98A2B'
    };

    /* ---------- geometry (CSS px at 1120×380) ---------- */
    var X0 = 130, X1 = 990, YT = 104, YB = 262, YC = 183;
    var BT = 133, BB = 233;                 // battery body top / bottom
    var SEG = [                             // electron direction, from battery minus
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
    var VIS = LOOP;                         // visible wire length
    LOOP += BB - BT;                        // plus the hidden path inside the battery
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

    /* ---------- carriers ---------- */
    var SPACING = 36, N = Math.round(LOOP / SPACING);
    var rng = K.rng(1747);
    var dots = [];
    for (k = 0; k < N; k++) dots.push({ s0: k * LOOP / N, off: (rng() - 0.5) * 4.2, ph: rng() * 6.283 });
    var V_E = 36;                           // px/s, deliberately slow; field wave is much faster
    var V_WAVE = 300;

    /* ---------- state ---------- */
    var view = 'elektron', auto = true;
    var A = null;
    function targets(v) {
      return {
        v_elektron: v === 'elektron' ? 1 : 0,
        v_alan: v === 'alan' ? 1 : 0,
        v_franklin: v === 'franklin' ? 1 : 0,
        v_hepsi: v === 'hepsi' ? 1 : 0,
        dotsE: v === 'elektron' || v === 'hepsi' ? 1 : 0,
        dotsF: v === 'franklin' ? 1 : 0,
        field: v === 'alan' || v === 'hepsi' ? 1 : 0,
        cop: v === 'alan' || v === 'franklin' || v === 'hepsi' ? 1 : 0,
        copLab: v === 'alan' || v === 'hepsi' ? 1 : 0,
        inset: v === 'alan' ? 1 : 0,
        legend: v === 'hepsi' ? 1 : 0
      };
    }
    function resetState() { view = 'elektron'; auto = true; A = targets(view); }
    resetState();

    /* ---------- drawing helpers ---------- */
    function txt(g, s, x, y, o) { K.label(g, s, x, y, o); }
    function wrap(g, text, x, y, w, size, pitch, color, weight) {
      g.save(); g.font = K.font(size, weight || 400); g.restore();
      var words = text.split(' '), line = '', yy = y;
      g.save(); g.font = K.font(size, weight || 400);
      for (var i = 0; i < words.length; i++) {
        var t2 = line ? line + ' ' + words[i] : words[i];
        if (g.measureText(t2).width > w && line) {
          g.restore(); txt(g, line, x, yy, { size: size, color: color, weight: weight });
          g.save(); g.font = K.font(size, weight || 400);
          line = words[i]; yy += pitch;
        } else line = t2;
      }
      g.restore();
      txt(g, line, x, yy, { size: size, color: color, weight: weight });
    }
    function charge(g, x, y, r, neg, a) {
      g.save();
      g.globalAlpha *= a;
      g.fillStyle = neg ? C.blue : C.cop;
      g.beginPath(); g.arc(x, y, r, 0, 6.2832); g.fill();
      g.strokeStyle = '#FFFFFF'; g.lineWidth = Math.max(1.4, r * 0.28); g.lineCap = 'round';
      g.beginPath(); g.moveTo(x - r * 0.5, y); g.lineTo(x + r * 0.5, y);
      if (!neg) { g.moveTo(x, y - r * 0.5); g.lineTo(x, y + r * 0.5); }
      g.stroke();
      g.restore();
    }
    function tag(g, s, xr, y, a) {
      g.save();
      g.globalAlpha *= a;
      g.font = K.font(13, 500, true);
      var w = g.measureText(s).width + 16;
      g.strokeStyle = C.muted; g.lineWidth = 1;
      K.rr(g, xr - w + 0.5, y - 15.5, w, 24, 5); g.stroke();
      g.restore();
      txt(g, s, xr - w + 8, y + 1, { size: 13, mono: true, weight: 500, color: C.muted, alpha: a });
    }

    function drawWire(g) {
      g.save();
      g.lineJoin = 'round'; g.lineCap = 'butt';
      g.beginPath();
      g.moveTo(X0, BT); g.lineTo(X0, YT); g.lineTo(X1, YT); g.lineTo(X1, YB); g.lineTo(X0, YB); g.lineTo(X0, BB);
      g.strokeStyle = C.wireO; g.lineWidth = 13; g.stroke();
      g.strokeStyle = C.wireI; g.lineWidth = 9; g.stroke();
      g.restore();
    }

    function drawLamp(g) {
      // lit identically in every view
      g.save();
      g.strokeStyle = C.lamp; g.lineWidth = 2.2; g.lineCap = 'round';
      for (var i = 0; i < 8; i++) {
        var a = (i + 0.5) * Math.PI / 4;
        if (Math.abs(Math.cos(a)) < 0.2) continue;
        g.beginPath();
        g.moveTo(X1 + Math.cos(a) * 42, YC + Math.sin(a) * 42);
        g.lineTo(X1 + Math.cos(a) * 52, YC + Math.sin(a) * 52);
        g.stroke();
      }
      g.fillStyle = C.lamp;
      g.beginPath(); g.arc(X1, YC, 34, 0, 6.2832); g.fill();
      g.fillStyle = 'rgba(255,255,255,.35)';
      g.beginPath(); g.arc(X1, YC, 25, 0, 6.2832); g.fill();
      g.strokeStyle = C.ink2; g.lineWidth = 2;
      g.beginPath(); g.arc(X1, YC, 34, 0, 6.2832); g.stroke();
      // filament along the current path
      g.strokeStyle = C.fil; g.lineWidth = 5;
      g.beginPath(); g.moveTo(X1, YC - 28); g.lineTo(X1, YC + 28); g.stroke();
      g.restore();
    }

    function drawBattery(g) {
      g.save();
      g.fillStyle = C.ink2;
      K.rr(g, X0 - 11, BT - 9, 22, 11, 3); g.fill();
      g.fillStyle = C.card;
      K.rr(g, X0 - 28, BT, 56, BB - BT, 6); g.fill();
      g.save();
      K.rr(g, X0 - 28, BT, 56, BB - BT, 6); g.clip();
      g.fillStyle = dark ? 'rgba(227,154,108,.22)' : 'rgba(200,105,58,.15)';
      g.fillRect(X0 - 28, BT, 56, 50);
      g.fillStyle = dark ? 'rgba(142,166,242,.22)' : 'rgba(35,67,176,.12)';
      g.fillRect(X0 - 28, BT + 50, 56, 50);
      g.restore();
      g.strokeStyle = C.ink2; g.lineWidth = 1.8;
      K.rr(g, X0 - 28, BT, 56, BB - BT, 6); g.stroke();
      txt(g, '+', X0, BT + 36, { size: 30, weight: 600, color: C.copText, align: 'center' });
      txt(g, '−', X0, BB - 14, { size: 30, weight: 600, color: C.blue, align: 'center' });
      g.restore();
      txt(g, 'artı uç', X0 - 38, BT + 4, { size: 14, weight: 500, color: C.copText, align: 'right' });
      txt(g, 'eksi uç', X0 - 38, BB, { size: 14, weight: 500, color: C.blue, align: 'right' });
      txt(g, 'pil', X0 + 38, YC + 5, { size: 14, weight: 500, color: C.muted });
      txt(g, 'lamba', X1 + 58, YC + 5, { size: 14, weight: 500, color: C.muted });
    }

    function drawCarriers(g, tt, dir, neg, a) {
      if (a <= 0.01) return;
      g.save();
      g.globalAlpha *= a;
      for (var i = 0; i < dots.length; i++) {
        var d = dots[i];
        if (!pointAt(d.s0 + dir * V_E * tt)) continue;
        var o = d.off + (K.reducedMotion ? 0 : Math.sin(tt * 3 + d.ph) * 0.9);
        charge(g, PT.x + PT.nx * o, PT.y + PT.ny * o, 5.6, neg, 1);
      }
      g.restore();
    }

    /* conventional-path distance for the field wave: from battery plus, clockwise on screen */
    function fieldArrow(g, x1, y1, x2, y2, dist, tt, a) {
      var w = K.reducedMotion ? 0.5 : 0.5 + 0.5 * Math.cos(6.2832 * (dist - V_WAVE * tt) / 520);
      K.arrow(g, x1, y1, x2, y2, { color: C.grey, width: 2.6, head: 10, alpha: a * (0.4 + 0.6 * w) });
    }
    function drawField(g, tt, a) {
      if (a <= 0.01) return;
      var i, xs = [250, 370, 490, 610, 730, 850], x;
      for (i = 0; i < xs.length; i++) {
        x = xs[i];
        fieldArrow(g, x - 24, YT + 17, x + 24, YT + 17, x - X0, tt, a);                     // top: to the right
        fieldArrow(g, x + 24, YB - 17, x - 24, YB - 17, 860 + 158 + (X1 - x), tt, a);       // bottom: to the left
      }
      fieldArrow(g, X1 - 24, YT + 10, X1 - 24, YT + 40, 860 + 20, tt, a);                    // right, above lamp
      fieldArrow(g, X1 - 24, YB - 40, X1 - 24, YB - 10, 860 + 130, tt, a);                  // right, below lamp
    }

    function drawInset(g, t, a) {
      if (a <= 0.01) return;
      var L0 = 440, L1 = 810, T = 4.4, TH = 3.6, acc = 2 * (L1 - L0) / (TH * TH);
      var tau = K.reducedMotion ? 2.2 : t % T;
      var tc = Math.min(tau, TH);
      var f = clamp(tau / 0.3, 0, 1) * (1 - clamp((tau - TH) / (T - TH), 0, 1));
      var dx = 0.5 * acc * tc * tc;
      var rows = [{ y: 181, neg: false, name: 'artı deneme yükü' }, { y: 217, neg: true, name: 'eksi deneme yükü (elektron)' }];
      for (var r = 0; r < 2; r++) {
        var row = rows[r];
        txt(g, row.name, L0 - 28, row.y + 5, { size: 14, weight: 500, color: row.neg ? C.blue : C.copText, align: 'right', alpha: a });
        for (var q = 0; q < 4; q++) {
          var ax = L0 + 30 + q * 100;
          K.arrow(g, ax - 20, row.y, ax + 20, row.y, { color: C.grey, width: 2, head: 8, alpha: a * 0.45 });
        }
        var cx = row.neg ? L1 - dx : L0 + dx, dir = row.neg ? -1 : 1;
        g.save(); g.globalAlpha *= a * f;
        charge(g, cx, row.y, 8.5, row.neg, 1);
        K.arrow(g, cx + dir * 14, row.y, cx + dir * (14 + 14 + Math.min(34, tc * 16)), row.y, { color: row.neg ? C.blue : C.cop, width: 3, head: 9 });
        g.restore();
      }
    }

    function topBand(g, a) {
      // direction arrow above the top wire, shared slot for all views
      var yA = 84;
      var aB = A.v_elektron, aC = A.cop;
      K.arrow(g, 790, yA, 330, yA, { color: C.blue, width: 3.2, head: 12, alpha: aB });
      K.arrow(g, 330, yA, 790, yA, { color: C.cop, width: 3.2, head: 12, alpha: aC });
      var yL = 62;
      txt(g, 'elektronlar: eksiden artıya (gerçek hareket, yavaş)', 560, yL, { size: 16, weight: 600, color: C.blue, align: 'center', alpha: A.v_elektron });
      txt(g, 'akım yönü (uzlaşım): artıdan eksiye', 560, yL, { size: 16, weight: 600, color: C.copText, align: 'center', alpha: A.copLab });
      txt(g, 'Franklin’in tahmini (1747): akan şey artı yüklü sanıldı', 560, yL, { size: 16, weight: 600, color: C.copText, align: 'center', alpha: A.v_franklin });
    }

    function drawTabs(g) {
      var x = 24;
      g.save();
      g.font = K.font(13, 500, true);
      for (var i = 0; i < VIEWS.length; i++) {
        var w = g.measureText(TABS[i]).width + 22, on = VIEWS[i] === view;
        g.fillStyle = on ? C.ink : 'transparent';
        g.strokeStyle = on ? C.ink : C.line;
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

    var TL = [
      { h: '1747 · Franklin', b: 'sürtünmeyle biriken yüke “artı” dedi, akımı artıdan eksiye sandı', v: 'franklin' },
      { h: '1897 · Thomson', b: 'elektronu buldu, taşıyıcı eksi yüklü çıktı', v: 'elektron' },
      { h: 'Bugün', b: 'eski yön uzlaşım olarak kaldı', v: 'hepsi' }
    ];
    function drawTimeline(g, W) {
      g.save();
      g.strokeStyle = C.line; g.lineWidth = 1;
      g.beginPath(); g.moveTo(24, 316.5); g.lineTo(W - 24, 316.5); g.stroke();
      g.restore();
      var cw = (W - 48 - 2 * 28) / 3;
      for (var i = 0; i < 3; i++) {
        var x = 24 + i * (cw + 28), on = TL[i].v === view || (view === 'hepsi' && i === 2);
        g.save(); g.fillStyle = on ? C.copText : C.muted;
        g.beginPath(); g.arc(x + 4, 334, 3.5, 0, 6.2832); g.fill(); g.restore();
        txt(g, TL[i].h, x + 16, 339, { size: 13, mono: true, weight: 600, color: on ? C.ink : C.ink2 });
        wrap(g, TL[i].b, x + 16, 357, cw - 16, 13, 16, on ? C.ink : C.ink2, 400);
      }
    }

    function frame(t, dt) {
      var g = sf.ctx, W = sf.w;
      if (auto && !K.reducedMotion) view = VIEWS[Math.floor(t / DEMO) % VIEWS.length];
      var T = targets(view), rate = 1 - Math.exp(-10 * Math.max(dt, 0.0001));
      for (var key in T) A[key] += (T[key] - A[key]) * rate;
      var tt = K.reducedMotion ? 2 : t;

      sf.clear();
      drawTabs(g);
      var tagA = Math.max(A.dotsE, A.dotsF);
      if (A.dotsF > 0.01 || A.dotsE > 0.01) {
        tag(g, 'hız abartılı', W - 24, 27, A.dotsE);
        tag(g, 'varsayım, gerçek değil', W - 24, 27, A.dotsF);
      }
      topBand(g, 1);

      drawWire(g);
      drawLamp(g);
      drawCarriers(g, tt, 1, true, A.dotsE);
      drawCarriers(g, tt, -1, false, A.dotsF);
      drawBattery(g);
      drawField(g, tt, A.field);
      drawInset(g, tt, A.inset);

      // interior texts
      txt(g, 'elektrik alanı: artı yükü iten yön', 560, 150, { size: 16, weight: 600, color: C.grey, align: 'center', alpha: A.v_alan });
      txt(g, 'elektron eksi uçtan çıkar, lambadan geçer, artı uca varır', 560, 186, { size: 15, color: C.ink2, align: 'center', alpha: A.v_elektron });
      txt(g, 'lamba için ikisi aynı: aynı ışık, aynı enerji', 560, 186, { size: 16, weight: 600, color: C.ink, align: 'center', alpha: A.v_franklin });

      // legend and note (hepsi)
      var la = A.legend;
      if (la > 0.01) {
        var lx = 236, ly = [152, 182, 212];
        charge(g, lx + 14, ly[0] - 5, 5.6, true, la);
        K.arrow(g, lx, ly[1] - 5, lx + 30, ly[1] - 5, { color: C.grey, width: 2.6, head: 10, alpha: la });
        K.arrow(g, lx, ly[2] - 5, lx + 30, ly[2] - 5, { color: C.cop, width: 3.2, head: 11, alpha: la });
        txt(g, 'mavi = elektron hareketi', lx + 44, ly[0], { size: 15, weight: 500, color: C.blue, alpha: la });
        txt(g, 'gri = elektrik alanı', lx + 44, ly[1], { size: 15, weight: 500, color: C.grey, alpha: la });
        txt(g, 'bakır = akım yönü (uzlaşım)', lx + 44, ly[2], { size: 15, weight: 500, color: C.copText, alpha: la });
        g.save(); g.globalAlpha *= la;
        wrap(g, 'Elektronlar alana ters yönde sürüklenir, uzlaşım akımı alanla aynı yönde gösterilir. Lamba için ikisi aynı.', 560, 152, 330, 14, 20, C.ink2, 400);
        g.restore();
      }
      drawTimeline(g, W);
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
