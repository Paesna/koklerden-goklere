/* Köklerden Göklere · Builder O: kondansatör
 * capacitor-lab · 680×520 · açık tema (2B)
 * Pil + anahtar, iki plaka ve yalıtkan, lamba. Üç kip: dolum, bekleme, bosalma.
 * Sözleşme: kg-viz.js. Tüm hareket frame(t, dt) içinden sürülür, rastgelelik yok.
 */
(function () {
  'use strict';
  var K = window.KGViz;
  if (!K) return;
  var P = K.palette;
  var clamp = K.clamp;

  var MODES = ['dolum', 'bekleme', 'bosalma'];
  var TABS = ['dolum', 'bekleme', 'boşalma'];
  var DEMO = 6;
  var VMAX = 9;          // pil gerilimi, V
  var CAP = 1;           // kapasite, mF
  var TAU_C = 1.6;       // dolum zaman sabiti (s), ders için hızlandırılmış
  var TAU_D = 1.7;       // boşalma zaman sabiti (s)

  var EXPLAIN = {
    dolum: 'Anahtar pile bağlı: pil alt plakaya elektron iter, üst plakadan elektron çeker. Plakalar arasındaki gerilim 9 V’a doğru yükselir, akım azalarak durur.',
    bekleme: 'Anahtar hiçbir yere bağlı değil: elektronlar yalıtkanı geçemez, yük plakalarda kalır. Gerilim sabit kalır, kondansatör yükünü saklar.',
    bosalma: 'Anahtar lambaya bağlı: alt plakadaki fazla elektronlar lambadan geçip üst plakaya gider. Lamba kısa süre yanar, gerilim düştükçe söner.'
  };
  var NOTE = {
    dolum: 'büyük direnç ve büyük kondansatör: yavaş dolar',
    bekleme: 'yük kalır: bağlantı yoksa elektronlar plakada beklemeye devam eder',
    bosalma: 'lamba yükü harcar: gerilim düştükçe ışık sönmeye başlar'
  };
  var TREND = { dolum: 'yükseliyor', bekleme: 'sabit', bosalma: 'düşüyor' };
  var ORDER = [4, 5, 3, 6, 2, 7, 1, 8, 0, 9];   // işaretlerin ortadan dışa dizilişi

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
      wireO: dark ? '#4A5160' : '#B8BCC6',
      wireI: dark ? '#222836' : '#E6E6E0',
      card: dark ? '#161B26' : '#FFFFFF',
      gapFill: dark ? '#1B2130' : '#ECEBE4',
      bg: dark ? P.night : P.paper,
      lamp: '#F2C46B',
      fil: '#D98A2B'
    };

    /* ---------- geometri (CSS px, 680x520) ---------- */
    var XB = 70, XC = 340, XL = 600;       // pil, kondansatör, lamba
    var YT = 136, YR = 336;                // üst tel, alt (ortak) tel
    var PL0 = 265, PL1 = 415;              // plaka x aralığı
    var PT0 = 186, PT1 = 196;              // üst plaka y
    var PB0 = 284, PB1 = 294;              // alt plaka y
    var XS0 = 250, XS1 = 430, BLADE = 90;  // anahtar temas noktaları, kol uzunluğu
    var YLAMP = 236, RLAMP = 28;
    var BT = 186, BB = 286;                // pil gövdesi

    /* elektron yolları */
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
    function wrap(g, text, x, y, w, size, pitch, color, weight) {
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
    function tag(g, s, xr, y) {
      g.save();
      g.font = K.font(13, 500, true);
      var w = g.measureText(s).width + 16;
      g.strokeStyle = C.muted; g.lineWidth = 1;
      K.rr(g, xr - w + 0.5, y - 15.5, w, 24, 5); g.stroke();
      g.restore();
      txt(g, s, xr - w + 8, y + 1, { size: 13, mono: true, weight: 500, color: C.muted });
    }
    function drawTabs(g) {
      var x = 24;
      g.save();
      g.font = K.font(13, 500, true);
      for (var i = 0; i < MODES.length; i++) {
        var w = g.measureText(TABS[i]).width + 22, on = MODES[i] === mode;
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

    function drawWires(g) {
      g.save();
      g.lineJoin = 'round'; g.lineCap = 'butt';
      function run(pts) {
        g.beginPath(); g.moveTo(pts[0][0], pts[0][1]);
        for (var i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]);
        g.strokeStyle = C.wireO; g.lineWidth = 11; g.stroke();
        g.strokeStyle = C.wireI; g.lineWidth = 7; g.stroke();
      }
      run([[XB, BT], [XB, YT], [XS0, YT]]);                    // pil artı ucu → sol temas
      run([[XS1, YT], [XL, YT], [XL, YLAMP - RLAMP]]);         // sağ temas → lamba
      run([[XC, YT], [XC, PT0]]);                              // oynak uç → üst plaka
      run([[XB, BB], [XB, YR], [XL, YR], [XL, YLAMP + RLAMP]]);// ortak alt tel
      run([[XC, YR], [XC, PB0 + 10]]);                         // alt plaka
      g.fillStyle = C.ink2;
      g.beginPath(); g.arc(XC, YR, 5.5, 0, 6.2832); g.fill();
      g.restore();
    }

    function drawSwitch(g) {
      var tx = XC + BLADE * Math.cos(ang), ty = YT - BLADE * Math.sin(ang);
      g.save();
      var cs = [XS0, XS1];
      for (var i = 0; i < 2; i++) {
        g.fillStyle = C.bg; g.strokeStyle = C.ink2; g.lineWidth = 2;
        g.beginPath(); g.arc(cs[i], YT, 5.5, 0, 6.2832); g.fill(); g.stroke();
      }
      g.strokeStyle = C.ink; g.lineWidth = 5; g.lineCap = 'round';
      g.beginPath(); g.moveTo(XC, YT); g.lineTo(tx, ty); g.stroke();
      g.fillStyle = C.ink;
      g.beginPath(); g.arc(XC, YT, 6.5, 0, 6.2832); g.fill();
      g.restore();
    }

    function drawBattery(g) {
      g.save();
      g.fillStyle = C.ink2;
      K.rr(g, XB - 11, BT - 9, 22, 11, 3); g.fill();
      g.fillStyle = C.card;
      K.rr(g, XB - 26, BT, 52, BB - BT, 6); g.fill();
      g.save();
      K.rr(g, XB - 26, BT, 52, BB - BT, 6); g.clip();
      g.fillStyle = dark ? 'rgba(227,154,108,.22)' : 'rgba(200,105,58,.15)';
      g.fillRect(XB - 26, BT, 52, 50);
      g.fillStyle = dark ? 'rgba(142,166,242,.22)' : 'rgba(35,67,176,.12)';
      g.fillRect(XB - 26, BT + 50, 52, 50);
      g.restore();
      g.strokeStyle = C.ink2; g.lineWidth = 1.8;
      K.rr(g, XB - 26, BT, 52, BB - BT, 6); g.stroke();
      g.restore();
      txt(g, '+', XB, BT + 36, { size: 28, weight: 600, color: C.copText, align: 'center' });
      txt(g, '−', XB, BB - 14, { size: 28, weight: 600, color: C.blue, align: 'center' });
    }

    function drawLamp(g, b) {
      var x = XL, y = YLAMP;
      g.save();
      if (b > 0.02) {
        g.strokeStyle = C.lamp; g.lineWidth = 2.4; g.lineCap = 'round';
        g.globalAlpha = clamp(b * 1.2, 0, 1);
        for (var i = 0; i < 8; i++) {
          var a = (i + 0.5) * Math.PI / 4;
          if (Math.abs(Math.cos(a)) < 0.2) continue;
          g.beginPath();
          g.moveTo(x + Math.cos(a) * (RLAMP + 8), y + Math.sin(a) * (RLAMP + 8));
          g.lineTo(x + Math.cos(a) * (RLAMP + 8 + 10 * b), y + Math.sin(a) * (RLAMP + 8 + 10 * b));
          g.stroke();
        }
        g.globalAlpha = 1;
      }
      g.fillStyle = C.card;
      g.beginPath(); g.arc(x, y, RLAMP, 0, 6.2832); g.fill();
      g.globalAlpha = clamp(b, 0, 1);
      g.fillStyle = C.lamp;
      g.beginPath(); g.arc(x, y, RLAMP, 0, 6.2832); g.fill();
      g.fillStyle = 'rgba(255,255,255,.35)';
      g.beginPath(); g.arc(x, y, RLAMP - 8, 0, 6.2832); g.fill();
      g.globalAlpha = 1;
      g.strokeStyle = C.ink2; g.lineWidth = 2;
      g.beginPath(); g.arc(x, y, RLAMP, 0, 6.2832); g.stroke();
      // filaman
      g.strokeStyle = b > 0.05 ? C.fil : C.grey; g.lineWidth = 3; g.lineJoin = 'round';
      g.beginPath(); g.moveTo(x, y - 22);
      g.lineTo(x - 7, y - 14); g.lineTo(x + 7, y - 6); g.lineTo(x - 7, y + 2); g.lineTo(x + 7, y + 10); g.lineTo(x, y + 18);
      g.lineTo(x, y + 22);
      g.stroke();
      g.restore();
    }

    function drawCapacitor(g, q) {
      g.save();
      // yalıtkan
      g.fillStyle = C.gapFill;
      g.fillRect(PL0, PT1, PL1 - PL0, PB0 - PT1);
      g.strokeStyle = C.muted; g.lineWidth = 1; g.setLineDash([4, 4]);
      g.beginPath();
      g.moveTo(PL0 + 0.5, PT1); g.lineTo(PL0 + 0.5, PB0);
      g.moveTo(PL1 - 0.5, PT1); g.lineTo(PL1 - 0.5, PB0);
      g.stroke(); g.setLineDash([]);
      // plakalar
      g.fillStyle = C.ink2;
      K.rr(g, PL0, PT0, PL1 - PL0, PT1 - PT0, 2); g.fill();
      K.rr(g, PL0, PB0, PL1 - PL0, PB1 - PB0, 2); g.fill();
      g.restore();
      txt(g, 'yalıtkan', XC, 245, { size: 14, weight: 600, color: C.ink2, align: 'center' });
      // yük işaretleri
      for (var j = 0; j < 10; j++) {
        var a = clamp(q * 10 - j, 0, 1);
        if (a <= 0.01) continue;
        var x = XC + (ORDER[j] - 4.5) * 14;
        charge(g, x, PT1 + 13, 6, false, a);
        charge(g, x, PB0 - 13, 6, true, a);
      }
      // elektrik alanı oku (artıdan eksiye)
      if (q > 0.02) {
        K.arrow(g, 292, 224, 292, 258, { color: C.grey, width: 2.4, head: 9, alpha: q });
        K.arrow(g, 388, 224, 388, 258, { color: C.grey, width: 2.4, head: 9, alpha: q });
      }
    }

    function drawDots(g, p, phs, a, dir) {
      if (a <= 0.02) return;
      var n = Math.round(p.L / 30), sp = p.L / n;
      g.save();
      g.fillStyle = C.blue;
      for (var i = 0; i < n; i++) {
        var s = ((i * sp + phs) % p.L + p.L) % p.L;
        at(p, s);
        var fade = clamp(Math.min(s, p.L - s) / 14, 0, 1) * a;
        if (p === PP.dis && Math.abs(PT.x - XL) < 1 && PT.y > YLAMP - RLAMP - 6 && PT.y < YLAMP + RLAMP + 6) continue;
        g.globalAlpha = fade;
        g.beginPath(); g.arc(PT.x, PT.y, 4.4, 0, 6.2832); g.fill();
      }
      g.restore();
    }

    function drawReadout(g, q) {
      var X = 24, Y = 372, W = 632, H = 80;
      g.save();
      g.fillStyle = C.card;
      K.rr(g, X + 0.5, Y + 0.5, W, H, 8); g.fill();
      g.strokeStyle = C.line; g.lineWidth = 1; g.stroke();
      g.restore();
      txt(g, 'gerilim', 40, 402, { size: 14, weight: 500, color: C.ink2 });
      // çubuk
      var bx = 104, bw = 262, by = 388, bh = 16;
      g.save();
      g.fillStyle = C.wireI;
      K.rr(g, bx, by, bw, bh, 4); g.fill();
      if (q > 0.005) {
        g.fillStyle = C.blue;
        K.rr(g, bx, by, Math.max(8, bw * q), bh, 4); g.fill();
      }
      g.strokeStyle = C.muted; g.lineWidth = 1;
      K.rr(g, bx + 0.5, by + 0.5, bw, bh, 4); g.stroke();
      g.restore();
      txt(g, K.num(v, 1) + ' V', 384, 404, { size: 20, mono: true, weight: 600, color: C.ink });
      txt(g, '0 → 9 V · ' + TREND[mode], 478, 402, { size: 13, mono: true, color: C.muted });
      // formül
      var f = K.num(CAP, 0) + ' mF × ' + K.num(v, 1) + ' V = ' + K.num(CAP * v, 1) + ' mC';
      txt(g, 'yük = kapasite × gerilim', 40, 428, { size: 15, mono: true, weight: 500, color: C.ink2 });
      txt(g, '→', 262, 428, { size: 15, mono: true, color: C.muted });
      txt(g, f, 284, 428, { size: 15, mono: true, weight: 600, color: C.copText });
      txt(g, NOTE[mode], 40, 446, { size: 13, color: C.muted });
    }

    function drawStrip(g) {
      var items = [
        ['şarj aletinde', 'dalgalanmayı düzeltir'],
        ['RAM’de', 'bir biti yük olarak tutar'],
        ['ekranda', 'parmağın yakınlığını hisseder']
      ];
      g.save();
      g.strokeStyle = C.line; g.lineWidth = 1;
      g.beginPath(); g.moveTo(24, 466.5); g.lineTo(656, 466.5); g.stroke();
      g.restore();
      var cw = 196, gap = 22;
      for (var i = 0; i < 3; i++) {
        var x = 24 + i * (cw + gap);
        txt(g, items[i][0] + ':', x, 487, { size: 13, mono: true, weight: 600, color: C.copText });
        wrap(g, items[i][1], x, 505, cw, 14, 17, C.ink2, 400);
      }
    }

    function frame(t, dt) {
      var g = sf.ctx;
      var d = clamp(dt, 0, 0.05);
      if (auto && !K.reducedMotion) mode = MODES[Math.floor(t / DEMO) % 3];
      // gerilim
      if (!K.reducedMotion) {
        if (mode === 'dolum') v += (VMAX - v) * (1 - Math.exp(-d / TAU_C));
        else if (mode === 'bosalma') v *= Math.exp(-d / TAU_D);
      }
      // anahtar kolu
      var tgt = angTarget();
      ang += (tgt - ang) * (1 - Math.exp(-7 * d));
      var connL = clamp((ang - (Math.PI - 0.35)) / 0.3, 0, 1);
      var connR = clamp(((0.35) - ang) / 0.3, 0, 1);
      var q = clamp(v / VMAX, 0, 1);
      flowC = connL * (1 - q);
      flowD = connR * q;
      var lampT = connR * Math.pow(q, 1.3);
      lampB += (lampT - lampB) * (1 - Math.exp(-12 * d));
      if (!K.reducedMotion) phase += d * 70 * Math.max(flowC, flowD);

      sf.clear();
      drawTabs(g);
      tag(g, 'basitleştirilmiş model', sf.w - 24, 27);

      drawWires(g);
      drawDots(g, PP.ch1, phase, flowC > 0.03 ? Math.min(1, flowC * 3) : 0);
      drawDots(g, PP.ch2, phase, flowC > 0.03 ? Math.min(1, flowC * 3) : 0);
      drawDots(g, PP.dis, phase, flowD > 0.03 ? Math.min(1, flowD * 3) : 0);
      drawSwitch(g);
      drawBattery(g);
      drawLamp(g, lampB);
      drawCapacitor(g, q);

      // adlar
      txt(g, 'artı plaka', PL0 - 10, PT1 - 1, { size: 14, weight: 500, color: C.copText, align: 'right' });
      txt(g, 'eksi plaka', PL0 - 10, PB1 - 1, { size: 14, weight: 500, color: C.blue, align: 'right' });
      txt(g, 'elektrik alanı', PL1 + 14, 245, { size: 14, weight: 500, color: C.grey, alpha: clamp(q * 3, 0, 1) });
      txt(g, 'anahtar', XC + 14, 170, { size: 14, weight: 500, color: C.muted });
      txt(g, 'pil · 9 V', XB, 360, { size: 14, weight: 500, color: C.muted, align: 'center' });
      txt(g, 'kondansatör', XC, 360, { size: 14, weight: 500, color: C.muted, align: 'center' });
      txt(g, 'lamba', XL, 360, { size: 14, weight: 500, color: C.muted, align: 'center' });

      drawReadout(g, q);
      drawStrip(g);
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
