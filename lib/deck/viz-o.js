/* Köklerden Göklere · Builder O: kondansatör (odak slaytı)
 * capacitor-lab · 1120×440 tasarım alanı, kutuya sığacak şekilde ölçeklenir · 2B
 * Pil + anahtar, iki plaka ve yalıtkan, lamba. Üç kip: dolum, bekleme, bosalma.
 * Otomatik gösteri üç kipi sırayla gezer; set('mode', ...) o kipi sakin bir döngüde oynatır.
 * Sözleşme: kg-viz.js. Tüm hareket frame(t, dt) içinden sürülür, rastgelelik yok.
 */
(function () {
  'use strict';
  var K = window.KGViz;
  if (!K) return;
  var P = K.palette;
  var clamp = K.clamp;

  var MODES = ['dolum', 'bekleme', 'bosalma'];
  var DEMO = 8;
  var DW = 1120, DH = 440;
  var VMAX = 9;          // pil gerilimi, V
  var CAP = 1;           // kapasite, mF
  var TAU_C = 1.7;       // dolum zaman sabiti (s), ders için hızlandırılmış
  var TAU_D = 2.0;       // boşalma zaman sabiti (s)

  var EXPLAIN = {
    dolum: 'Pil bağlı: alt plakaya elektron birikir, üst plakadan çekilir. Gerilim 9 V’a yükselir, akım durur.',
    bekleme: 'Pil çıkarıldı: elektronlar yalıtkanı geçemez, yük plakalarda kalır; gerilim sabit kalır.',
    bosalma: 'Lambaya bağlanınca elektronlar lambadan geri akar; lamba kısa süre yanar ve söner.'
  };
  var ORDER = [3, 4, 2, 5, 1, 6, 0, 7];   // işaretlerin ortadan dışa dizilişi

  K.register('capacitor-lab', function (el, opts) {
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
      gapFill: dark ? '#1B2130' : '#ECEBE4',
      plate: dark ? '#8A93A5' : '#4A5160',
      bg: dark ? P.night : P.paper,
      lamp: '#F2C46B',
      fil: '#D98A2B'
    };

    /* ---------- geometri (tasarım px, 1120×440) ---------- */
    var XB = 130, XC = 560, XL = 990;
    var YT = 150, YR = 380;
    var PL0 = 410, PL1 = 710;
    var PT0 = 222, PT1 = 236;              // üst plaka
    var PB0 = 322, PB1 = 336;              // alt plaka
    var BLADE = 96, XS0 = XC - BLADE, XS1 = XC + BLADE;
    var YLAMP = 265, RLAMP = 44;
    var BT = 210, BB = 330;                // pil gövdesi

    var PATHS = {
      ch1: [[XB, BB], [XB, YR], [XC, YR], [XC, PB1]],
      ch2: [[XC, PT0], [XC, YT], [XB, YT], [XB, BT]],
      dis: [[XC, PB1], [XC, YR], [XL, YR], [XL, YT], [XC, YT], [XC, PT0]]
    };
    function prep(pts) {
      var segs = [], L = 0;
      for (var i = 0; i < pts.length - 1; i++) {
        var l = Math.abs(pts[i + 1][0] - pts[i][0]) + Math.abs(pts[i + 1][1] - pts[i][1]);
        segs.push(l); L += l;
      }
      return { pts: pts, segs: segs, L: L };
    }
    var PP = { ch1: prep(PATHS.ch1), ch2: prep(PATHS.ch2), dis: prep(PATHS.dis) };
    var PT = { x: 0, y: 0 };
    function at(p, s) {
      for (var i = 0; i < p.segs.length; i++) {
        if (s <= p.segs[i] || i === p.segs.length - 1) {
          var a = p.pts[i], b = p.pts[i + 1], u = p.segs[i] ? clamp(s / p.segs[i], 0, 1) : 0;
          PT.x = a[0] + (b[0] - a[0]) * u; PT.y = a[1] + (b[1] - a[1]) * u;
          return;
        }
        s -= p.segs[i];
      }
    }

    /* ---------- durum ---------- */
    var mode, auto, v, ang, phase, lampB, flowC, flowD;
    function resetState() {
      mode = K.reducedMotion ? 'bekleme' : 'dolum';
      auto = true;
      v = K.reducedMotion ? 8.6 : 0;
      ang = mode === 'dolum' ? Math.PI : Math.PI / 2;
      phase = 0; lampB = 0; flowC = 0; flowD = 0;
    }
    resetState();
    function angTarget() { return mode === 'dolum' ? Math.PI : (mode === 'bosalma' ? 0 : Math.PI / 2); }

    /* ---------- çizim yardımcıları ---------- */
    function txt(g, s, x, y, o) { K.label(g, s, x, y, o); }
    function charge(g, x, y, r, neg, a) {
      g.save();
      g.globalAlpha *= a;
      g.fillStyle = neg ? C.blue : C.cop;
      g.beginPath(); g.arc(x, y, r, 0, 6.2832); g.fill();
      g.fillStyle = 'rgba(255,255,255,.26)';
      g.beginPath(); g.arc(x - r * 0.3, y - r * 0.35, r * 0.45, 0, 6.2832); g.fill();
      g.strokeStyle = '#FFFFFF'; g.lineWidth = Math.max(1.6, r * 0.26); g.lineCap = 'round';
      g.beginPath(); g.moveTo(x - r * 0.5, y); g.lineTo(x + r * 0.5, y);
      if (!neg) { g.moveTo(x, y - r * 0.5); g.lineTo(x, y + r * 0.5); }
      g.stroke();
      g.restore();
    }
    function tag(g, s, xr, y) {
      g.save();
      g.font = K.font(14, 500, true);
      var w = g.measureText(s).width + 18;
      g.strokeStyle = C.muted; g.lineWidth = 1;
      K.rr(g, xr - w + 0.5, y - 16.5, w, 26, 5); g.stroke();
      g.restore();
      txt(g, s, xr - w + 9, y + 2, { size: 14, mono: true, weight: 500, color: C.muted });
    }
    function ring(g, x, y, rx, ry, tt, color, a) {
      if (a <= 0.01) return;
      for (var j = 0; j < 2; j++) {
        var u = ((tt / 2.4 + j * 0.5) % 1);
        g.save();
        g.globalAlpha = a * (1 - u) * 0.75;
        g.strokeStyle = color; g.lineWidth = 3;
        g.beginPath(); g.ellipse(x, y, rx + u * 26, ry + u * 26, 0, 0, 6.2832); g.stroke();
        g.restore();
      }
    }

    function drawWires(g) {
      g.save();
      g.lineJoin = 'round'; g.lineCap = 'butt';
      function run(pts) {
        g.beginPath(); g.moveTo(pts[0][0], pts[0][1]);
        for (var i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]);
        g.save(); g.translate(0, 2.5); g.strokeStyle = 'rgba(20,24,40,.09)'; g.lineWidth = 17; g.stroke(); g.restore();
        g.strokeStyle = C.wireO; g.lineWidth = 14; g.stroke();
        g.strokeStyle = C.wireI; g.lineWidth = 9.5; g.stroke();
      }
      run([[XB, BT], [XB, YT], [XS0, YT]]);
      run([[XS1, YT], [XL, YT], [XL, YLAMP - RLAMP]]);
      run([[XC, YT], [XC, PT0]]);
      run([[XB, BB], [XB, YR], [XL, YR], [XL, YLAMP + RLAMP]]);
      run([[XC, YR], [XC, PB1]]);
      g.fillStyle = C.ink2;
      g.beginPath(); g.arc(XC, YR, 7, 0, 6.2832); g.fill();
      g.restore();
    }

    function drawSwitch(g) {
      var tx = XC + BLADE * Math.cos(ang), ty = YT - BLADE * Math.sin(ang);
      g.save();
      var cs = [XS0, XS1];
      for (var i = 0; i < 2; i++) {
        g.fillStyle = C.bg; g.strokeStyle = C.ink2; g.lineWidth = 2.6;
        g.beginPath(); g.arc(cs[i], YT, 7.5, 0, 6.2832); g.fill(); g.stroke();
      }
      g.strokeStyle = 'rgba(20,24,40,.14)'; g.lineWidth = 7; g.lineCap = 'round';
      g.beginPath(); g.moveTo(XC, YT + 3); g.lineTo(tx, ty + 3); g.stroke();
      g.strokeStyle = C.ink; g.lineWidth = 6;
      g.beginPath(); g.moveTo(XC, YT); g.lineTo(tx, ty); g.stroke();
      g.fillStyle = C.ink;
      g.beginPath(); g.arc(XC, YT, 8.5, 0, 6.2832); g.fill();
      g.restore();
    }

    function drawBattery(g) {
      var w = 76;
      g.save();
      g.fillStyle = 'rgba(20,24,40,.12)';
      K.rr(g, XB - w / 2 + 3, BT + 5, w, BB - BT, 8); g.fill();
      g.fillStyle = C.ink2;
      K.rr(g, XB - 14, BT - 12, 28, 14, 3); g.fill();
      g.fillStyle = C.card;
      K.rr(g, XB - w / 2, BT, w, BB - BT, 8); g.fill();
      g.save();
      K.rr(g, XB - w / 2, BT, w, BB - BT, 8); g.clip();
      g.fillStyle = dark ? 'rgba(227,154,108,.24)' : 'rgba(200,105,58,.16)';
      g.fillRect(XB - w / 2, BT, w, 60);
      g.fillStyle = dark ? 'rgba(142,166,242,.24)' : 'rgba(35,67,176,.12)';
      g.fillRect(XB - w / 2, BT + 60, w, 60);
      g.restore();
      g.strokeStyle = C.ink2; g.lineWidth = 2;
      K.rr(g, XB - w / 2, BT, w, BB - BT, 8); g.stroke();
      g.restore();
      txt(g, '+', XB, BT + 44, { size: 38, weight: 600, color: C.copText, align: 'center' });
      txt(g, '−', XB, BB - 16, { size: 38, weight: 600, color: C.blue, align: 'center' });
    }

    function drawLamp(g, b, tt) {
      var x = XL, y = YLAMP;
      if (b > 0.03) {
        K.drawGlow(g, '#F7C867', x, y, 130, 0.6 * b);
        K.drawGlow(g, '#FFE9B0', x, y, 62, 0.65 * b);
      }
      g.save();
      if (b > 0.02) {
        g.strokeStyle = C.lamp; g.lineWidth = 3; g.lineCap = 'round';
        g.globalAlpha = clamp(b * 1.2, 0, 1);
        for (var i = 0; i < 12; i++) {
          var a = i * Math.PI / 6 + 0.26;
          if (Math.abs(Math.cos(a)) < 0.2) continue;
          g.beginPath();
          g.moveTo(x + Math.cos(a) * (RLAMP + 12), y + Math.sin(a) * (RLAMP + 12));
          g.lineTo(x + Math.cos(a) * (RLAMP + 12 + 14 * b), y + Math.sin(a) * (RLAMP + 12 + 14 * b));
          g.stroke();
        }
        g.globalAlpha = 1;
      }
      g.fillStyle = C.card;
      g.beginPath(); g.arc(x, y, RLAMP, 0, 6.2832); g.fill();
      g.globalAlpha = clamp(b, 0, 1);
      g.fillStyle = C.lamp;
      g.beginPath(); g.arc(x, y, RLAMP, 0, 6.2832); g.fill();
      g.fillStyle = 'rgba(255,255,255,.45)';
      g.beginPath(); g.arc(x, y, RLAMP - 13, 0, 6.2832); g.fill();
      g.globalAlpha = 1;
      g.strokeStyle = C.ink2; g.lineWidth = 2.6;
      g.beginPath(); g.arc(x, y, RLAMP, 0, 6.2832); g.stroke();
      g.strokeStyle = b > 0.05 ? C.fil : C.grey; g.lineWidth = 4.5; g.lineJoin = 'round';
      g.beginPath(); g.moveTo(x, y - 36);
      g.lineTo(x - 11, y - 22); g.lineTo(x + 11, y - 10); g.lineTo(x - 11, y + 4); g.lineTo(x + 11, y + 16); g.lineTo(x, y + 28);
      g.lineTo(x, y + 36);
      g.stroke();
      g.restore();
    }

    function drawCapacitor(g, q) {
      g.save();
      g.fillStyle = C.gapFill;
      g.fillRect(PL0, PT1, PL1 - PL0, PB0 - PT1);
      // yumuşak alan tonu
      if (q > 0.02) {
        g.fillStyle = K.rgba('#6E7BC8', 0.10 * q);
        g.fillRect(PL0, PT1, PL1 - PL0, PB0 - PT1);
      }
      g.strokeStyle = C.muted; g.lineWidth = 1; g.setLineDash([5, 5]);
      g.beginPath();
      g.moveTo(PL0 + 0.5, PT1); g.lineTo(PL0 + 0.5, PB0);
      g.moveTo(PL1 - 0.5, PT1); g.lineTo(PL1 - 0.5, PB0);
      g.stroke(); g.setLineDash([]);
      // plakalar
      g.fillStyle = 'rgba(20,24,40,.13)';
      K.rr(g, PL0 + 2, PT0 + 3, PL1 - PL0, PT1 - PT0, 3); g.fill();
      K.rr(g, PL0 + 2, PB0 + 3, PL1 - PL0, PB1 - PB0, 3); g.fill();
      g.fillStyle = C.plate;
      K.rr(g, PL0, PT0, PL1 - PL0, PT1 - PT0, 3); g.fill();
      K.rr(g, PL0, PB0, PL1 - PL0, PB1 - PB0, 3); g.fill();
      g.fillStyle = 'rgba(255,255,255,.22)';
      g.fillRect(PL0 + 3, PT0 + 2, PL1 - PL0 - 6, 2);
      g.fillRect(PL0 + 3, PB0 + 2, PL1 - PL0 - 6, 2);
      g.restore();
      // elektrik alanı okları: işaret sütunlarının arasında
      if (q > 0.02) {
        for (var k = 0; k <= 8; k++) {
          var ax = XC + (k - 4) * 36;
          K.arrow(g, ax, PT1 + 20, ax, PB0 - 20, { color: C.grey, width: 2, head: 8, alpha: 0.5 * q });
        }
      }
      // yük işaretleri
      for (var j = 0; j < 8; j++) {
        var a = clamp(q * 8 - j, 0, 1);
        if (a <= 0.01) continue;
        var x = XC + (ORDER[j] - 3.5) * 36;
        charge(g, x, PT1 + 17, 9.5, false, a);
        charge(g, x, PB0 - 17, 9.5, true, a);
      }
    }

    function drawDots(g, p, phs, a) {
      if (a <= 0.02) return;
      var n = Math.round(p.L / 34), sp = p.L / n;
      g.save();
      g.fillStyle = C.blue;
      for (var i = 0; i < n; i++) {
        var s = ((i * sp + phs) % p.L + p.L) % p.L;
        at(p, s);
        var fade = clamp(Math.min(s, p.L - s) / 16, 0, 1) * a;
        if (p === PP.dis && Math.abs(PT.x - XL) < 1 && PT.y > YLAMP - RLAMP - 8 && PT.y < YLAMP + RLAMP + 8) continue;
        g.globalAlpha = fade;
        g.beginPath(); g.arc(PT.x, PT.y, 5.6, 0, 6.2832); g.fill();
      }
      g.restore();
    }

    function frame(t, dt) {
      var g = sf.ctx, W = sf.w, H = sf.h;
      var d = clamp(dt, 0, 0.05);
      if (auto && !K.reducedMotion) mode = MODES[Math.floor(t / DEMO) % 3];
      if (!K.reducedMotion) {
        if (mode === 'dolum') v += (VMAX - v) * (1 - Math.exp(-d / TAU_C));
        else if (mode === 'bosalma') v *= Math.exp(-d / TAU_D);
      }
      var tgt = angTarget();
      ang += (tgt - ang) * (1 - Math.exp(-6 * d));
      var connL = clamp((ang - (Math.PI - 0.35)) / 0.3, 0, 1);
      var connR = clamp(((0.35) - ang) / 0.3, 0, 1);
      var q = clamp(v / VMAX, 0, 1);
      flowC = connL * (1 - q);
      flowD = connR * q;
      var lampT = connR * Math.pow(q, 1.3);
      lampB += (lampT - lampB) * (1 - Math.exp(-12 * d));
      if (!K.reducedMotion) phase += d * 70 * Math.max(flowC, flowD);
      var tt = K.reducedMotion ? 2 : t;

      sf.clear();
      var s = Math.min(W / DW, H / DH);
      g.save();
      g.translate((W - DW * s) / 2, (H - DH * s) / 2);
      g.scale(s, s);

      tag(g, 'basitleştirilmiş model', DW - 24, 24);

      drawWires(g);
      drawDots(g, PP.ch1, phase, flowC > 0.03 ? Math.min(1, flowC * 3) : 0);
      drawDots(g, PP.ch2, phase, flowC > 0.03 ? Math.min(1, flowC * 3) : 0);
      drawDots(g, PP.dis, phase, flowD > 0.03 ? Math.min(1, flowD * 3) : 0);
      drawSwitch(g);
      drawBattery(g);
      drawLamp(g, lampB, tt);
      drawCapacitor(g, q);

      // yumuşak vurgu: konuşulan şeyin üstünde
      if (mode === 'bosalma') ring(g, XL, YLAMP, RLAMP + 8, RLAMP + 8, tt, '#D9962B', lampB > 0.1 ? 1 : 0.4);
      else ring(g, XC, (PT0 + PB1) / 2, 170, 74, tt, C.blue, mode === 'dolum' ? 0.8 : 0.5);

      // adlar (en çok beş)
      txt(g, 'pil', XB, 418, { size: 20, weight: 700, color: C.ink2, align: 'center' });
      txt(g, 'lamba', XL, 418, { size: 20, weight: 700, color: C.ink2, align: 'center' });
      txt(g, 'yalıtkan', PL1 + 56, (PT1 + PB0) / 2 + 7, { size: 20, weight: 700, color: C.ink2 });
      K.arrow(g, PL1 + 48, (PT1 + PB0) / 2, PL1 - 6, (PT1 + PB0) / 2, { color: C.ink2, width: 2, head: 9 });
      txt(g, 'plakalar arası', PL0 - 28, PT1 + 14, { size: 16, weight: 600, color: C.muted, align: 'right' });
      txt(g, K.num(v, 1) + ' V', PL0 - 28, PT1 + 58, { size: 36, mono: true, weight: 700, color: C.ink, align: 'right' });

      g.restore();
    }

    return {
      reset: function () { resetState(); },
      frame: frame,
      set: function (key, val) {
        if (key === 'mode' && MODES.indexOf(val) >= 0) {
          auto = false;
          if (val !== 'dolum' && v < 0.5) v = VMAX * 0.96;   // boş kondansatörde bekleme/boşalma anlamsız
          mode = val;
        }
      },
      read: function (key) {
        if (key === 'mode') return mode;
        if (key === 'explain') return EXPLAIN[mode];
        if (key === 'volt') return K.num(v, 1) + ' V';
        if (key === 'formula') return 'yük = kapasite × gerilim: ' + K.num(CAP, 0) + ' mF × ' + K.num(v, 1) + ' V = ' + K.num(CAP * v, 1) + ' mC';
        return '';
      },
      resize: function () { sf.resize(); },
      dispose: function () { sf.dispose(); }
    };
  });
})();
