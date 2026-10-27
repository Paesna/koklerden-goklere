/* Köklerden Göklere · Builder T: işlemcinin içinde ne olur?
 * cpu-cycle · 1120×440 (her boyuta ölçeklenir) · 2B blok şeması
 * Komut döngüsü: getir, çöz, yürüt, yaz. Örnek program: R1 ← 5, R2 ← 7, R1 ← R1 + R2.
 * set('step', 'getir'|'coz'|'yurut'|'yaz') üçüncü satırı (toplama) o aşamada sürekli oynatır;
 * set('auto', 1) üç satırın hepsini dönüp dolaşan otomatik gösteriyi başlatır (varsayılan).
 * read('explain') o anki aşamanın tek cümlelik açıklaması; read('arith'), read('tick'), read('step'), read('auto').
 * Sözleşme: kg-viz.js. Hareket dt ile sürülür, rastgelelik yok.
 */
(function () {
  'use strict';
  var K = window.KGViz;
  if (!K) return;
  var P = K.palette;
  var clamp = K.clamp;

  var PHASES = ['getir', 'coz', 'yurut', 'yaz'];
  var PH_NAME = ['Getir', 'Çöz', 'Yürüt', 'Yaz'];
  var TICK = 0.35;             // saniye
  var N_LINES = 3;
  var VW = 1120, VH = 440;     // tasarım ölçüsü
  /* her satırın her aşamasının süresi (saniye): ilk iki satır hızlı, toplama yavaş */
  var PHLEN = [1.25, 1.25, 2.0];

  var PROG = [
    { t: 'R1 ← 5', code: '00010101', imm: '0101' },
    { t: 'R2 ← 7', code: '00100111', imm: '0111' },
    { t: 'R1 ← R1 + R2', code: '01000001', imm: '' }
  ];

  function bin4(n) { var s = n.toString(2); while (s.length < 4) s = '0' + s; return s; }

  function explain(line, ph) {
    if (ph === 0) return 'Getir: sıradaki komut bellekten çıkar ve denetim birimine gelir. Komut, bellekte duran bir sayıdır.';
    if (ph === 1) return 'Çöz: denetim birimi komutu okur ve hangi parçaların çalışacağını belirleyen işaretleri gönderir.';
    if (ph === 2) {
      if (line === 2) return 'Yürüt: R1 ve R2’deki sayılar ALU’ya girer; toplayıcı 0101 + 0111 = 1100 (12) üretir.';
      return 'Yürüt: bu komutta toplama yok; yüklenecek sayı komutun içinden yazmaca doğru yola çıkar.';
    }
    if (line === 2) return 'Yaz: sonuç 1100 (12) R1’e geri yazılır. Sıradaki komuta geçilir ve döngü yeniden başlar.';
    if (line === 0) return 'Yaz: 5 sayısı R1 yazmacına yazılır. Program sayacı sıradaki satıra geçer.';
    return 'Yaz: 7 sayısı R2 yazmacına yazılır. Program sayacı sıradaki satıra geçer.';
  }

  K.register('cpu-cycle', function (el, opts) {
    opts = opts || {};
    var dark = (opts.theme || 'light') === 'dark';
    var sf = K.surface(el);
    var C = {
      ink: dark ? P.onNight : P.ink,
      ink2: dark ? '#C9CFDA' : P.ink2,
      muted: dark ? P.onNightMuted : P.muted,
      blue: dark ? P.blueLight : P.blue,
      blueSoft: dark ? 'rgba(142,166,242,.18)' : P.blueSoft,
      cop: dark ? P.copperLight : P.copperFill,
      copText: dark ? P.copperLight : '#A64B22',
      copSoft: dark ? 'rgba(227,154,108,.2)' : P.copperSoft,
      card: dark ? '#161B26' : '#FFFFFF',
      edge: dark ? '#4A5160' : '#B8BCC6',
      chan: dark ? '#222836' : '#E6E6E0',
      off: dark ? '#2B3242' : '#D6D6CF'
    };

    /* ---------- state ---------- */
    var T, auto, stepKey, pinOff, autoOff;
    function resetState() { T = 0; auto = true; stepKey = 'yurut'; pinOff = 0; autoOff = 0; }
    resetState();

    /* program zamanı -> {line, ph, u, P} ; P: 0..12 yaklaşık ilerleme (yazmaç değerleri için) */
    function position() {
      var line, ph, u;
      if (K.reducedMotion) {
        if (auto) { line = 2; ph = 2; u = 0.7; } else { line = 2; ph = PHASES.indexOf(stepKey); u = 0.7; }
      } else if (auto) {
        var tot = 0, i;
        for (i = 0; i < N_LINES; i++) tot += 4 * PHLEN[i];
        var x = (((T - autoOff) % tot) + tot) % tot;
        for (i = 0; i < N_LINES; i++) {
          var d = 4 * PHLEN[i];
          if (x < d) { line = i; ph = Math.min(3, Math.floor(x / PHLEN[i])); u = (x - ph * PHLEN[i]) / PHLEN[i]; break; }
          x -= d;
        }
      } else {
        line = 2; ph = PHASES.indexOf(stepKey);
        u = ((((T - pinOff) / PHLEN[2]) % 1) + 1) % 1;
      }
      return { line: line, ph: ph, u: u, P: line * 4 + ph + u };
    }

    /* ---------- geometry (tasarım koordinatları) ---------- */
    var BY = 92, BH = 270;
    var B = {
      mem: { x: 30, y: BY, w: 250, h: BH },
      ctl: { x: 370, y: BY, w: 200, h: BH },
      reg: { x: 640, y: BY, w: 180, h: BH },
      alu: { x: 890, y: BY, w: 200, h: BH }
    };
    var ROW_Y = [196, 256, 316];            // bellek satırları
    var R1Y = 206, R2Y = 268;               // yazmaç satırları (ALU ile aynı hizada)
    var RES_Y = 332;
    var CELL_W = 28, CELL_H = 36, CP = 32;
    var REG_X = 682, ALU_X = 934;
    var CTL_Y = 72;                          // denetim işareti kanalı (blokların üstünde)
    var SY = 396;                            // adım şeridi

    /* ---------- path helpers ---------- */
    function mk(pts) {
      var segs = [], L = 0;
      for (var i = 0; i < pts.length - 1; i++) {
        var l = Math.abs(pts[i + 1][0] - pts[i][0]) + Math.abs(pts[i + 1][1] - pts[i][1]);
        segs.push(l); L += l;
      }
      return { pts: pts, segs: segs, L: L };
    }
    var PT = { x: 0, y: 0, v: false };
    function at(path, d) {
      for (var i = 0; i < path.segs.length; i++) {
        if (d <= path.segs[i] || i === path.segs.length - 1) {
          var a = path.pts[i], b = path.pts[i + 1], u = path.segs[i] ? clamp(d / path.segs[i], 0, 1) : 0;
          PT.x = a[0] + (b[0] - a[0]) * u; PT.y = a[1] + (b[1] - a[1]) * u;
          PT.v = Math.abs(b[1] - a[1]) > Math.abs(b[0] - a[0]);
          return PT;
        }
        d -= path.segs[i];
      }
      return PT;
    }

    var PITCH = 17;
    function drawBit(g, x, y, vertical, b, col) {
      g.save();
      g.translate(x, y);
      if (vertical) g.rotate(Math.PI / 2);
      g.fillStyle = col;
      if (b) { g.fillRect(-5, -8, 10, 16); }
      else { g.globalAlpha *= 0.55; g.fillRect(-5, 3, 10, 5); }
      g.restore();
    }
    function drawTrain(g, path, bits, p, col) {
      if (p <= 0 || p >= 1) return;
      var n = bits.length, total = path.L + n * PITCH;
      for (var i = 0; i < n; i++) {
        var d = p * total - i * PITCH;
        if (d < 0 || d > path.L) continue;
        var q = at(path, d);
        drawBit(g, q.x, q.y, q.v, bits.charAt(i) === '1', col);
      }
    }
    function channel(g, pts) {
      g.save();
      g.lineJoin = 'round'; g.lineCap = 'butt';
      g.beginPath(); g.moveTo(pts[0][0], pts[0][1]);
      for (var i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]);
      g.strokeStyle = C.edge; g.lineWidth = 20; g.stroke();
      g.strokeStyle = C.chan; g.lineWidth = 18; g.stroke();
      g.restore();
    }
    function tip(g, x, y, dx, dy, col) {
      g.save();
      g.fillStyle = col || C.muted;
      g.beginPath();
      g.moveTo(x, y);
      g.lineTo(x - dx * 11 - dy * 8, y - dy * 11 + dx * 8);
      g.lineTo(x - dx * 11 + dy * 8, y - dy * 11 - dx * 8);
      g.closePath(); g.fill();
      g.restore();
    }
    function txt(g, s, x, y, o) { K.label(g, s, x, y, o); }

    function block(g, b, on, t) {
      g.save();
      if (on) {
        g.globalAlpha = 0.16 + 0.07 * Math.sin(t * 5);
        g.fillStyle = C.cop;
        K.rr(g, b.x - 7, b.y - 7, b.w + 14, b.h + 14, 14); g.fill();
        g.globalAlpha = 1;
      }
      g.shadowColor = 'rgba(21,23,28,0.12)'; g.shadowBlur = 10; g.shadowOffsetY = 3;
      g.fillStyle = C.card;
      K.rr(g, b.x, b.y, b.w, b.h, 10); g.fill();
      g.shadowColor = 'transparent';
      g.strokeStyle = on ? C.cop : C.edge;
      g.lineWidth = on ? 3 : 1.8;
      K.rr(g, b.x, b.y, b.w, b.h, 10); g.stroke();
      g.restore();
    }

    function cell(g, x, y, b, filled) {
      g.save();
      if (filled === false) {
        g.strokeStyle = C.off; g.lineWidth = 1.4;
        K.rr(g, x + 0.5, y + 0.5, CELL_W - 1, CELL_H - 1, 4); g.stroke();
      } else if (b) {
        g.fillStyle = C.blue; K.rr(g, x, y, CELL_W, CELL_H, 4); g.fill();
      } else {
        g.fillStyle = C.blueSoft; K.rr(g, x, y, CELL_W, CELL_H, 4); g.fill();
        g.strokeStyle = C.blue; g.lineWidth = 1.2; K.rr(g, x + 0.5, y + 0.5, CELL_W - 1, CELL_H - 1, 4); g.stroke();
      }
      g.restore();
      if (filled !== false)
        txt(g, b ? '1' : '0', x + CELL_W / 2, y + CELL_H / 2 + 6, { size: 18, mono: true, weight: 600, color: b ? '#FFFFFF' : C.blue, align: 'center' });
    }
    function cells4(g, x, yc, val, shown) {
      var s = shown ? bin4(val) : '0000';
      for (var i = 0; i < 4; i++) cell(g, x + i * CP, yc - CELL_H / 2, s.charAt(i) === '1', shown ? true : false);
    }

    /* ---------- frame ---------- */
    function frame(t, dt) {
      var g = sf.ctx;
      dt = Math.min(Math.max(dt || 0, 0), 0.05);
      T += dt;
      var pos = position();
      var line = pos.line, ph = pos.ph, u = pos.u, Pp = pos.P, i, k;

      var r1 = Pp >= 11.7 ? 12 : Pp >= 3.7 ? 5 : 0;
      var r2 = Pp >= 7.7 ? 7 : 0;
      var pcLine = (ph === 3 && u > 0.85) ? (line + 1) % N_LINES : line;
      var irShown = ph > 0 || u > 0.75;

      var on = {};
      if (ph === 0) { on.mem = true; }
      else if (ph === 1) { on.ctl = true; }
      else if (ph === 2) { if (line === 2) { on.reg = on.alu = true; } else on.ctl = true; }
      else { if (line === 2) { on.alu = on.reg = true; } else on.reg = true; }

      /* kutuyu ölçekle ve ortala */
      sf.clear();
      var s = Math.min(sf.w / VW, sf.h / VH) * 0.97;
      g.save();
      g.translate((sf.w - VW * s) / 2, (sf.h - VH * s) / 2);
      g.scale(s, s);

      /* küçük etiket */
      g.save();
      g.font = K.font(14, 500, true);
      var tg = 'basitleştirilmiş model · yavaşlatılmış', tw = g.measureText(tg).width + 18;
      g.strokeStyle = C.muted; g.lineWidth = 1;
      K.rr(g, VW - 12 - tw + 0.5, 8.5, tw, 26, 6); g.stroke();
      g.restore();
      txt(g, tg, VW - 12 - tw + 9, 26, { size: 14, mono: true, weight: 500, color: C.muted });

      /* ---------- kanallar (blokların altında) ---------- */
      var yRow = ROW_Y[line];
      var pathFetch = [[280, yRow], [325, yRow], [325, 227], [370, 227]];
      for (k = 0; k < N_LINES; k++) channel(g, [[280, ROW_Y[k]], [325, ROW_Y[k]]]);
      channel(g, [[325, ROW_Y[0]], [325, ROW_Y[2]]]);
      channel(g, [[325, 227], [370, 227]]);
      channel(g, [[470, 92], [470, CTL_Y], [730, CTL_Y], [730, 92]]);          // işaretler: yazmaçlara
      channel(g, [[730, CTL_Y], [990, CTL_Y], [990, 92]]);                      // işaretler: ALU'ya
      channel(g, [[570, R1Y], [640, R1Y]]);                                      // yük yolu
      channel(g, [[570, R2Y], [640, R2Y]]);
      channel(g, [[820, R1Y], [890, R1Y]]);                                      // yazmaç -> ALU
      channel(g, [[820, R2Y], [890, R2Y]]);
      channel(g, [[890, RES_Y], [855, RES_Y], [855, 238], [820, 238]]);          // sonuç geri

      /* ---------- bit trenleri ---------- */
      if (ph === 0) {
        drawTrain(g, mk(pathFetch), PROG[line].code, K.span(u, 0.1, 1), C.cop);
      }
      if (ph === 1) {
        var q = K.span(u, 0.1, 1);
        if (line === 2) {
          drawTrain(g, mk([[470, 92], [470, CTL_Y], [730, CTL_Y], [730, 92]]), '111', q, C.cop);
          drawTrain(g, mk([[730, CTL_Y], [990, CTL_Y], [990, 92]]), '111', q, C.cop);
        } else {
          drawTrain(g, mk([[470, 92], [470, CTL_Y], [730, CTL_Y], [730, 92]]), '11', q, C.cop);
        }
      }
      if (ph === 2) {
        if (line === 2) {
          drawTrain(g, mk([[820, R1Y], [890, R1Y]]), '0101', K.span(u, 0.05, 0.6), C.blue);
          drawTrain(g, mk([[820, R2Y], [890, R2Y]]), '0111', K.span(u, 0.05, 0.6), C.blue);
        } else {
          drawTrain(g, mk([[570, line === 0 ? R1Y : R2Y], [640, line === 0 ? R1Y : R2Y]]), PROG[line].imm, K.span(u, 0.1, 0.95), C.blue);
        }
      }
      if (ph === 3 && line === 2) {
        drawTrain(g, mk([[890, RES_Y], [855, RES_Y], [855, 238], [820, 238]]), '1100', K.span(u, 0, 0.65), C.blue);
      }

      /* ---------- bloklar ---------- */
      block(g, B.mem, on.mem, T);
      block(g, B.ctl, on.ctl, T);
      block(g, B.reg, on.reg, T);
      block(g, B.alu, on.alu, T);

      tip(g, 370, 227, 1, 0); tip(g, 640, R1Y, 1, 0); tip(g, 640, R2Y, 1, 0);
      tip(g, 730, 92, 0, 1, C.cop); tip(g, 990, 92, 0, 1, C.cop);
      tip(g, 890, R1Y, 1, 0); tip(g, 890, R2Y, 1, 0); tip(g, 820, 238, -1, 0);

      /* ---------- bellek ---------- */
      txt(g, 'Bellek', B.mem.x + 20, 128, { size: 22, weight: 700, color: C.ink });
      for (k = 0; k < N_LINES; k++) {
        var ly = ROW_Y[k], act = k === pcLine;
        if (act) {
          g.save(); g.fillStyle = C.copSoft;
          K.rr(g, 40, ly - 24, 230, 48, 7); g.fill();
          g.fillStyle = C.cop;
          g.beginPath(); g.moveTo(47, ly - 8); g.lineTo(57, ly); g.lineTo(47, ly + 8); g.closePath(); g.fill();
          g.restore();
        }
        txt(g, PROG[k].t, 66, ly + 7, { size: 20, weight: act ? 700 : 500, color: act ? C.ink : C.ink2 });
      }

      /* ---------- denetim birimi ---------- */
      txt(g, 'Denetim birimi', B.ctl.x + 20, 128, { size: 22, weight: 700, color: C.ink });
      if (irShown) {
        txt(g, PROG[line].t, B.ctl.x + B.ctl.w / 2, 240, { size: 22, weight: 700, color: C.ink, align: 'center' });
        if (ph >= 1) {
          g.save(); g.strokeStyle = on.ctl ? C.cop : C.edge; g.lineWidth = 2.5;
          g.beginPath(); g.moveTo(B.ctl.x + 30, 254); g.lineTo(B.ctl.x + B.ctl.w - 30, 254); g.stroke(); g.restore();
        }
      } else {
        txt(g, '—', B.ctl.x + B.ctl.w / 2, 240, { size: 22, mono: true, color: C.muted, align: 'center' });
      }

      /* ---------- yazmaçlar ---------- */
      txt(g, 'Yazmaçlar', B.reg.x + 20, 128, { size: 22, weight: 700, color: C.ink });
      txt(g, 'R1', B.reg.x + 10, R1Y + 7, { size: 20, mono: true, weight: 600, color: C.ink });
      txt(g, 'R2', B.reg.x + 10, R2Y + 7, { size: 20, mono: true, weight: 600, color: C.ink });
      cells4(g, REG_X, R1Y, r1, true);
      cells4(g, REG_X, R2Y, r2, true);

      /* ---------- ALU ---------- */
      txt(g, 'ALU', B.alu.x + 20, 128, { size: 22, weight: 700, color: C.ink });
      var addOn = line === 2 && (ph === 3 || (ph === 2 && u > 0.55));
      var resBits = '1100', resCount = 0;
      if (line === 2) {
        if (ph === 3) resCount = 4;
        else if (ph === 2) resCount = clamp(Math.floor((u - 0.7) / 0.075), 0, 4);
      }
      txt(g, '+', B.alu.x + 18, R2Y + 8, { size: 26, mono: true, weight: 600, color: C.ink2 });
      var sA = bin4(5), sB = bin4(7);
      for (i = 0; i < 4; i++) {
        cell(g, ALU_X + i * CP, R1Y - CELL_H / 2, sA.charAt(i) === '1', addOn ? true : false);
        cell(g, ALU_X + i * CP, R2Y - CELL_H / 2, sB.charAt(i) === '1', addOn ? true : false);
        var shown = (3 - i) < resCount;
        cell(g, ALU_X + i * CP, RES_Y - CELL_H / 2, resBits.charAt(i) === '1', shown ? true : false);
      }
      g.save(); g.strokeStyle = C.ink2; g.lineWidth = 2;
      g.beginPath(); g.moveTo(ALU_X - 6, 298.5); g.lineTo(ALU_X + 4 * CP + 2, 298.5); g.stroke(); g.restore();
      if (resCount === 4) txt(g, '12', B.alu.x + B.alu.w - 14, RES_Y + 7, { size: 20, mono: true, weight: 700, color: C.copText, align: 'right' });

      /* ---------- adım şeridi ---------- */
      var cw = 124, gap = 32, x0 = (VW - (4 * cw + 3 * gap)) / 2;
      for (k = 0; k < 4; k++) {
        var on2 = k === ph, px = x0 + k * (cw + gap);
        g.save();
        g.fillStyle = on2 ? C.ink : 'transparent'; g.strokeStyle = on2 ? C.ink : C.edge; g.lineWidth = 1.6;
        K.rr(g, px + 0.5, SY - 17.5, cw, 36, 18); if (on2) g.fill(); g.stroke(); g.restore();
        txt(g, (k + 1) + ' ' + PH_NAME[k], px + cw / 2 + 0.5, SY + 6, { size: 18, weight: 700, color: on2 ? (dark ? P.night : '#FFFFFF') : C.ink2, align: 'center' });
        if (k < 3) tip(g, px + cw + gap - 6, SY, 1, 0, C.muted);
      }
      g.restore();
    }

    return {
      reset: function () { resetState(); },
      frame: frame,
      set: function (key, val) {
        if (key === 'step') {
          var v = String(val).toLowerCase();
          if (PHASES.indexOf(v) < 0) return;
          auto = false; stepKey = v; pinOff = T;
        } else if (key === 'auto') {
          if (+val) { auto = true; autoOff = T; }
        }
      },
      read: function (key) {
        var p = position();
        if (key === 'step') return PHASES[p.ph];
        if (key === 'auto') return auto ? '1' : '0';
        if (key === 'explain') return explain(p.line, p.ph);
        if (key === 'arith') return '5 + 7 = 12 · 0101 + 0111 = 1100';
        if (key === 'tick') return String(Math.floor(T / TICK));
        return '';
      },
      resize: function () { sf.resize(); },
      dispose: function () { sf.dispose(); }
    };
  });
})();
