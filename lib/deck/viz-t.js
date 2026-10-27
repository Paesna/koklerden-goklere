/* Köklerden Göklere · Builder T: işlemcinin içinde ne olur?
 * cpu-cycle · 1120×380 · 2B blok şeması
 * Komut döngüsü: getir, çöz, yürüt, yaz. Örnek program: R1 ← 5, R2 ← 7, R1 ← R1 + R2, belleğe yaz.
 * set('step', 'getir'|'coz'|'yurut'|'yaz') üçüncü satırı (toplama) o aşamada sürekli oynatır;
 * set('auto', 1) dört satırın hepsini dönüp dolaşan otomatik gösteriyi başlatır.
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
  var PH_LEN = 1.4;            // saniye
  var TICK = 0.35;             // saniye, bir aşama = 4 tık
  var N_LINES = 4;

  var PROG = [
    { t: 'R1 ← 5', code: '00010101', imm: '0101' },
    { t: 'R2 ← 7', code: '00100111', imm: '0111' },
    { t: 'R1 ← R1 + R2', code: '01000001', imm: '' },
    { t: 'belleğe yaz', code: '01100001', imm: '' }
  ];
  var LAMPS = ['sayıyı yükle', 'R1 oku', 'R2 oku', 'ALU: topla', 'yazmaca yaz', 'RAM’e yaz'];
  var LAMP_SETS = [
    [[0], [0], [0], [4]],
    [[0], [0], [0], [4]],
    [[], [1, 2, 3], [1, 2, 3], [4]],
    [[], [1], [1], [5]]
  ];

  function bin4(n) { var s = n.toString(2); while (s.length < 4) s = '0' + s; return s; }

  function explain(line, ph) {
    if (ph === 0) return 'Program sayacı sıradaki komutun yerini gösterir. O komut program belleğinden komut kaydına gelir; komut, bellekte duran bir sayıdır.';
    if (ph === 1) return 'Denetim birimi komutu çözer ve hangi parçaların çalışacağını belirleyen işaretleri yakar: hangi yazmaç okunacak, ALU ne yapacak.';
    if (ph === 2) {
      if (line === 2) return 'ALU çalışır: R1’deki 0101 ile R2’deki 0111 toplayıcıya girer, çıkışta 1100 (12) oluşur.';
      if (line === 3) return 'Bu komutta toplama yok: yazmaçtaki sonuç belleğe gönderilmek üzere hazırlanır.';
      return 'Bu komutta toplama yok: yüklenecek sayı komutun içinde hazır bekler.';
    }
    if (line === 2) return 'Sonuç 1100 (12) R1’e geri yazılır. Program sayacı bir sonraki satıra geçer ve döngü yeniden başlar.';
    if (line === 3) return 'R1’deki 12, veri belleğine (RAM) yazılır. Program bitti; sayaç başa döner.';
    return 'Sayı yazmaca yazılır. Program sayacı bir sonraki satıra geçer ve döngü yeniden başlar.';
  }

  K.register('cpu-cycle', function (el, opts) {
    opts = opts || {};
    var dark = (opts.theme || 'light') === 'dark';
    var sf = K.surface(el);
    var C = {
      ink: dark ? P.onNight : P.ink,
      ink2: dark ? '#C9CFDA' : P.ink2,
      muted: dark ? P.onNightMuted : P.muted,
      line: dark ? P.nightLine : P.line,
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
    var T, auto, stepKey, pinOff, autoOff, lamp, rawS, sTick;
    function resetState() {
      T = 0; auto = true; stepKey = 'yurut'; pinOff = 0; autoOff = 0;
      lamp = [0, 0, 0, 0, 0, 0];
    }
    resetState();

    function position() {
      // s: 0..16 program zamanı (satır × 4 + aşama + ilerleme)
      if (K.reducedMotion) return { s: auto ? 10.6 : 8 + PHASES.indexOf(stepKey) + 0.6 };
      if (auto) return { s: (((T - autoOff) / PH_LEN) % 16 + 16) % 16 };
      var u = (((T - pinOff) / PH_LEN) % 1 + 1) % 1;
      return { s: 8 + PHASES.indexOf(stepKey) + u };
    }

    /* ---------- geometry ---------- */
    var Y0 = 48, Y1 = 230;
    var B = {
      flash: { x: 16, y: Y0, w: 250, h: Y1 - Y0 },
      pc: { x: 306, y: Y0, w: 120, h: 56 },
      ir: { x: 306, y: 148, w: 120, h: 56 },
      ctl: { x: 466, y: Y0, w: 140, h: Y1 - Y0 },
      reg: { x: 656, y: Y0, w: 140, h: 88 },
      ram: { x: 656, y: 176, w: 140, h: 54 },
      alu: { x: 846, y: Y0, w: 258, h: Y1 - Y0 }
    };
    var LINE_Y = [116, 148, 180, 212];
    var IR_Y = 176;
    var R1Y = 92, R2Y = 118, RES_Y = 152;
    var CX = 930, CP = 17;       // ALU hücreleri
    var CL = 140, CW = 99;       // saat

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

    var PITCH = 11;
    function drawBit(g, x, y, vertical, b, col) {
      g.save();
      g.translate(x, y);
      if (vertical) g.rotate(Math.PI / 2);
      g.fillStyle = col;
      if (b) { g.fillRect(-3.5, -5.5, 7, 11); }
      else { g.globalAlpha *= 0.55; g.fillRect(-3.5, 2.5, 7, 3); }
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
      g.strokeStyle = C.edge; g.lineWidth = 14; g.stroke();
      g.strokeStyle = C.chan; g.lineWidth = 12; g.stroke();
      g.restore();
    }
    function tip(g, x, y, dx, dy, col) {
      g.save();
      g.fillStyle = col || C.muted;
      g.beginPath();
      g.moveTo(x, y);
      g.lineTo(x - dx * 8 - dy * 6, y - dy * 8 + dx * 6);
      g.lineTo(x - dx * 8 + dy * 6, y - dy * 8 - dx * 6);
      g.closePath(); g.fill();
      g.restore();
    }

    function txt(g, s, x, y, o) { K.label(g, s, x, y, o); }

    function block(g, b, on) {
      g.save();
      g.fillStyle = C.card;
      K.rr(g, b.x, b.y, b.w, b.h, 8); g.fill();
      g.strokeStyle = on ? C.cop : C.edge;
      g.lineWidth = on ? 2.6 : 1.6;
      K.rr(g, b.x, b.y, b.w, b.h, 8); g.stroke();
      g.restore();
    }

    function cell(g, x, y, b, w, h, filled) {
      g.save();
      if (filled === false) {
        g.strokeStyle = C.off; g.lineWidth = 1.2;
        K.rr(g, x + 0.5, y + 0.5, w - 1, h - 1, 3); g.stroke();
      } else if (b) {
        g.fillStyle = C.blue; K.rr(g, x, y, w, h, 3); g.fill();
      } else {
        g.fillStyle = C.blueSoft; K.rr(g, x, y, w, h, 3); g.fill();
        g.strokeStyle = C.blue; g.lineWidth = 1; K.rr(g, x + 0.5, y + 0.5, w - 1, h - 1, 3); g.stroke();
      }
      g.restore();
      if (filled !== false)
        txt(g, b ? '1' : '0', x + w / 2, y + h / 2 + 4.5, { size: 13, mono: true, weight: 600, color: b ? '#FFFFFF' : C.blue, align: 'center' });
    }
    function cells4(g, x, yc, val, shown) {
      var s = shown ? bin4(val) : '0000';
      for (var i = 0; i < 4; i++) cell(g, x + i * CP, yc - 10, s.charAt(i) === '1', 15, 20, shown ? true : false);
    }

    /* ---------- frame ---------- */
    function frame(t, dt) {
      var g = sf.ctx;
      dt = Math.min(Math.max(dt || 0, 0), 0.05);
      T += dt;
      var pos = position();
      var s = pos.s;
      var line = Math.floor(s / 4) % N_LINES, ph = Math.floor(s) % 4, u = s - Math.floor(s);
      var step = PHASES[ph];
      rawS = s; sTick = Math.floor(T / TICK);
      var lastTick = sTick;

      // register values, derived from program time
      var r1 = s >= 11.7 ? 12 : s >= 3.7 ? 5 : 0;
      var r2 = s >= 7.7 ? 7 : 0;
      var ram = s >= 15.7 ? 12 : 0;
      var pcLine = (ph === 3 && u > 0.85) ? (line + 1) % N_LINES : line;
      var irShown = ph > 0 || u > 0.75;

      // lamp easing
      var set = LAMP_SETS[line][ph], rate = 1 - Math.exp(-14 * Math.max(dt, 0.0001)), i;
      for (i = 0; i < 6; i++) lamp[i] += ((set.indexOf(i) >= 0 ? 1 : 0) - lamp[i]) * rate;

      // active blocks
      var on = {};
      if (ph === 0) { on.flash = on.pc = on.ir = true; }
      else if (ph === 1) { on.ir = on.ctl = true; }
      else if (ph === 2) { if (line === 2) { on.reg = on.alu = true; } else on.ctl = true; }
      else {
        if (line === 2) { on.alu = on.reg = true; }
        else if (line === 3) { on.reg = on.ram = true; }
        else { on.reg = on.ctl = true; }
      }

      sf.clear();

      /* top line */
      txt(g, (line + 1) + '. komut · ' + PROG[line].t + ' · ' + PH_NAME[ph], 16, 26, { size: 15, weight: 600, color: C.ink });
      g.save();
      g.font = K.font(13, 500, true);
      var tg = 'basitleştirilmiş model · yavaşlatılmış', tw = g.measureText(tg).width + 16;
      g.strokeStyle = C.muted; g.lineWidth = 1;
      K.rr(g, 1104 - tw + 0.5, 6.5, tw, 22, 5); g.stroke();
      g.restore();
      txt(g, tg, 1104 - tw + 8, 22, { size: 13, mono: true, weight: 500, color: C.muted });

      /* ---------- channels (under blocks) ---------- */
      var k;
      channel(g, [[330, 76], [240, 76]]);                           // adres
      for (k = 0; k < 4; k++) channel(g, [[230, LINE_Y[k]], [286, LINE_Y[k]]]);
      channel(g, [[286, LINE_Y[0]], [286, IR_Y], [330, IR_Y]]);     // komut yolu
      channel(g, [[400, IR_Y], [490, IR_Y]]);                       // IR → denetim
      channel(g, [[536, 70], [536, 41], [726, 41], [726, 70]]);      // denetim işaretleri
      channel(g, [[726, 41], [975, 41], [975, 70]]);
      channel(g, [[590, 203], [680, 203]]);
      channel(g, [[580, R1Y], [700, R1Y]]);
      channel(g, [[580, R2Y], [700, R2Y]]);
      channel(g, [[770, R1Y], [900, R1Y]]);                         // yazmaç → ALU
      channel(g, [[770, R2Y], [900, R2Y]]);
      channel(g, [[950, RES_Y], [726, RES_Y], [726, 110]]);         // sonuç
      channel(g, [[726, 110], [726, 205]]);

      /* ---------- trains ---------- */
      var addrBits = line === 0 ? '00' : line === 1 ? '01' : line === 2 ? '10' : '11';
      if (ph === 0) {
        drawTrain(g, mk([[330, 76], [240, 76]]), addrBits, K.span(u, 0, 0.4), C.cop);
        drawTrain(g, mk([[230, LINE_Y[line]], [286, LINE_Y[line]], [286, IR_Y], [330, IR_Y]]), PROG[line].code, K.span(u, 0.35, 1), C.cop);
      }
      if (ph === 1) {
        drawTrain(g, mk([[400, IR_Y], [490, IR_Y]]), PROG[line].code, K.span(u, 0, 0.55), C.cop);
        var q = K.span(u, 0.5, 1);
        if (line === 2) {
          drawTrain(g, mk([[536, 70], [536, 41], [726, 41], [726, 70]]), '111', q, C.cop);
          drawTrain(g, mk([[726, 41], [975, 41], [975, 70]]), '111', q, C.cop);
        } else if (line === 3) {
          drawTrain(g, mk([[536, 70], [536, 41], [726, 41], [726, 70]]), '111', q, C.cop);
        }
      }
      if (ph === 2 && line === 2) {
        drawTrain(g, mk([[770, R1Y], [900, R1Y]]), '0101', K.span(u, 0, 0.55), C.blue);
        drawTrain(g, mk([[770, R2Y], [900, R2Y]]), '0111', K.span(u, 0, 0.55), C.blue);
      }
      if (ph === 3) {
        var pw = K.span(u, 0, 0.7);
        if (line === 0) drawTrain(g, mk([[580, R1Y], [700, R1Y]]), '0101', pw, C.blue);
        if (line === 1) drawTrain(g, mk([[580, R2Y], [700, R2Y]]), '0111', pw, C.blue);
        if (line === 2) drawTrain(g, mk([[950, RES_Y], [726, RES_Y], [726, 110]]), '1100', pw, C.blue);
        if (line === 3) {
          drawTrain(g, mk([[726, 110], [726, 205]]), '1100', pw, C.blue);
          drawTrain(g, mk([[590, 203], [680, 203]]), '111', K.span(u, 0, 0.6), C.cop);
        }
      }

      /* ---------- blocks ---------- */
      block(g, B.flash, on.flash);
      block(g, B.pc, on.pc);
      block(g, B.ir, on.ir);
      block(g, B.ctl, on.ctl);
      block(g, B.reg, on.reg);
      block(g, B.ram, on.ram);
      block(g, B.alu, on.alu);

      /* arrow tips (outside blocks) */
      tip(g, 266, 76, -1, 0); tip(g, 306, IR_Y, 1, 0); tip(g, 466, IR_Y, 1, 0);
      tip(g, 726, 48, 0, 1, C.cop); tip(g, 975, 48, 0, 1, C.cop); tip(g, 656, 203, 1, 0, C.cop);
      tip(g, 656, R1Y, 1, 0); tip(g, 656, R2Y, 1, 0);
      tip(g, 846, R1Y, 1, 0); tip(g, 846, R2Y, 1, 0);
      tip(g, 726, 136, 0, -1); tip(g, 726, 176, 0, 1);

      /* ---------- flash ---------- */
      txt(g, 'Program belleği (flash)', 28, 68, { size: 15, weight: 600, color: C.ink });
      txt(g, 'kalıcı: komutlar sayı olarak durur', 28, 88, { size: 13, color: C.muted });
      for (k = 0; k < 4; k++) {
        var ly = LINE_Y[k], act = (k === line) && (ph > 0 || u > 0.3 || true);
        if (k === line) {
          g.save(); g.fillStyle = C.copSoft;
          K.rr(g, 24, ly - 15, 234, 30, 5); g.fill(); g.restore();
        }
        txt(g, String(k + 1), 34, ly + 5, { size: 14, mono: true, weight: 600, color: k === line ? C.copText : C.muted });
        txt(g, PROG[k].t, 54, ly + 5, { size: 14, weight: k === line ? 600 : 400, color: k === line ? C.ink : C.ink2 });
        txt(g, PROG[k].code.slice(0, 4) + ' ' + PROG[k].code.slice(4), 250, ly + 5, { size: 13, mono: true, color: k === line ? C.copText : C.muted, align: 'right' });
      }

      /* ---------- program counter / instruction register ---------- */
      txt(g, 'Program sayacı', 316, 68, { size: 14, weight: 600, color: C.ink });
      txt(g, 'satır ' + (pcLine + 1), 318, 94, { size: 18, mono: true, weight: 600, color: C.copText });
      txt(g, 'Komut kaydı', 316, 170, { size: 14, weight: 600, color: C.ink });
      if (irShown) txt(g, PROG[line].t, 318, 195, { size: 14, mono: true, weight: 500, color: C.ink });
      else txt(g, '—', 318, 195, { size: 14, mono: true, color: C.muted });

      /* ---------- control unit ---------- */
      txt(g, 'Denetim birimi', 478, 68, { size: 15, weight: 600, color: C.ink });
      for (k = 0; k < 6; k++) {
        var yy = 96 + k * 24, a = lamp[k];
        g.save();
        g.beginPath(); g.arc(486, yy - 4, 5.5, 0, 6.2832);
        g.fillStyle = C.off; g.fill();
        g.globalAlpha = a; g.fillStyle = C.cop; g.fill();
        g.globalAlpha = 1; g.strokeStyle = a > 0.5 ? C.cop : C.edge; g.lineWidth = 1.2; g.stroke();
        g.restore();
        txt(g, LAMPS[k], 498, yy, { size: 13, weight: a > 0.5 ? 600 : 400, color: a > 0.5 ? C.ink : C.muted });
      }

      /* ---------- registers ---------- */
      txt(g, 'Yazmaçlar', 668, 68, { size: 15, weight: 600, color: C.ink });
      txt(g, 'R1', 668, R1Y + 5, { size: 14, mono: true, weight: 600, color: C.ink });
      txt(g, 'R2', 668, R2Y + 5, { size: 14, mono: true, weight: 600, color: C.ink });
      var r1show = r1 > 0 || s >= 3.7, r2show = r2 > 0;
      cells4(g, 692, R1Y, r1, true);
      cells4(g, 692, R2Y, r2, true);
      txt(g, String(r1), 766, R1Y + 5, { size: 14, mono: true, color: C.muted });
      txt(g, String(r2), 766, R2Y + 5, { size: 14, mono: true, color: C.muted });

      /* ---------- RAM ---------- */
      txt(g, 'Veri belleği (RAM)', 668, 195, { size: 13, weight: 600, color: C.ink });
      cells4(g, 668, 216, ram, true);
      txt(g, ram ? '= ' + ram : '', 744, 221, { size: 14, mono: true, color: C.muted });

      /* ---------- ALU ---------- */
      txt(g, 'ALU', 862, 68, { size: 15, weight: 600, color: C.ink });
      txt(g, 'aritmetik mantık birimi', 898, 68, { size: 13, color: C.muted });
      // toplayıcı simgesi
      g.save();
      g.strokeStyle = on.alu ? C.cop : C.edge; g.lineWidth = 1.8; g.fillStyle = C.card;
      g.beginPath(); g.arc(1080, 64, 11, 0, 6.2832); g.fill(); g.stroke();
      g.beginPath(); g.moveTo(1074, 64); g.lineTo(1086, 64); g.moveTo(1080, 58); g.lineTo(1080, 70); g.stroke();
      g.restore();

      var addOn = line === 2 && (ph === 3 || (ph === 2 && u > 0.4));
      var resBits = '1100', resCount = 0;
      if (line === 2) {
        if (ph === 3) resCount = 4;
        else if (ph === 2) resCount = clamp(Math.floor((u - 0.6) / 0.1), 0, 4);
      }
      var rowsY = [R1Y, R2Y, RES_Y];
      var vals = [5, 7, 12], labs = ['R1', 'R2', ''];
      txt(g, 'R1', 862, R1Y + 5, { size: 13, mono: true, color: C.muted });
      txt(g, 'R2', 862, R2Y + 5, { size: 13, mono: true, color: C.muted });
      txt(g, '+', 908, R2Y + 6, { size: 18, mono: true, weight: 600, color: C.ink2, align: 'center' });
      txt(g, '=', 908, RES_Y + 6, { size: 18, mono: true, weight: 600, color: C.ink2, align: 'center' });
      var sA = bin4(5), sB = bin4(7);
      for (i = 0; i < 4; i++) {
        cell(g, CX + i * CP, R1Y - 10, sA.charAt(i) === '1', 15, 20, addOn ? true : false);
        cell(g, CX + i * CP, R2Y - 10, sB.charAt(i) === '1', 15, 20, addOn ? true : false);
        // sonuç: en sağdaki bit (en küçük basamak) önce
        var shown = (3 - i) < resCount;
        cell(g, CX + i * CP, RES_Y - 10, resBits.charAt(i) === '1', 15, 20, shown ? true : false);
      }
      g.save(); g.strokeStyle = C.ink2; g.lineWidth = 1.5;
      g.beginPath(); g.moveTo(CX - 4, 134.5); g.lineTo(CX + 4 * CP + 2, 134.5); g.stroke(); g.restore();
      if (addOn) {
        txt(g, '5', CX + 4 * CP + 12, R1Y + 5, { size: 14, mono: true, color: C.muted });
        txt(g, '7', CX + 4 * CP + 12, R2Y + 5, { size: 14, mono: true, color: C.muted });
      }
      if (resCount === 4) txt(g, '12', CX + 4 * CP + 12, RES_Y + 5, { size: 14, mono: true, weight: 600, color: C.copText });
      txt(g, 'toplayıcılar: VE / VEYA / ÖZEL VEYA', 862, 190, { size: 13, color: C.ink2 });
      txt(g, 'kapılarından yapılmıştır', 862, 208, { size: 13, color: C.ink2 });

      /* ---------- alt şerit: saat ---------- */
      txt(g, 'Saat', 16, 268, { size: 15, weight: 600, color: C.ink });
      txt(g, 'tık: ' + lastTick, 266, 268, { size: 17, mono: true, weight: 600, color: C.copText, align: 'right' });
      var wy0 = 280, wy1 = 306, v = 50 / TICK * 1.0 * 1;   // 50 px = bir tık dönemi
      g.save();
      g.strokeStyle = C.blue; g.lineWidth = 2; g.lineJoin = 'miter';
      g.beginPath();
      var xx, lvl, prev = null;
      for (xx = 16; xx <= 266; xx += 1) {
        var tau = T + (xx - CL) / v;
        var f = tau / TICK - Math.floor(tau / TICK);
        lvl = f < 0.5 ? wy0 : wy1;
        if (prev === null) g.moveTo(xx, lvl);
        else { if (lvl !== prev) g.lineTo(xx, prev); g.lineTo(xx, lvl); }
        prev = lvl;
      }
      g.stroke();
      g.strokeStyle = C.cop; g.lineWidth = 1.5; g.setLineDash([3, 3]);
      g.beginPath(); g.moveTo(CL + 0.5, 276); g.lineTo(CL + 0.5, 312); g.stroke();
      g.restore();
      txt(g, 'bir komutun her aşaması birkaç tık sürer', 16, 330, { size: 13, color: C.muted });

      /* ---------- alt şerit: aritmetik ve aşamalar ---------- */
      var done = r1 === 12 || (line === 2 && resCount === 4);
      txt(g, '5 + 7 = 12', 306, 292, { size: 26, mono: true, weight: 600, color: done ? C.copText : C.ink });
      txt(g, '0101 + 0111 = 1100', 306, 316, { size: 15, mono: true, color: C.ink2 });
      var cx = 560;
      for (k = 0; k < 4; k++) {
        var cw = 78, on2 = k === ph;
        g.save();
        g.fillStyle = on2 ? C.ink : 'transparent'; g.strokeStyle = on2 ? C.ink : C.edge; g.lineWidth = 1.2;
        K.rr(g, cx + 0.5, 272.5, cw, 30, 15); if (on2) g.fill(); g.stroke(); g.restore();
        txt(g, (k + 1) + ' ' + PH_NAME[k], cx + cw / 2 + 0.5, 292, { size: 14, weight: 600, color: on2 ? (dark ? P.night : '#FFFFFF') : C.ink2, align: 'center' });
        if (k < 3) txt(g, '→', cx + cw + 8, 292, { size: 14, color: C.muted, align: 'center' });
        cx += cw + 16;
      }
      // gerilim seviyesi göstergesi
      drawBit(g, 566, 324, false, true, C.blue);
      txt(g, '1: akım geçiyor, gerilim yüksek', 580, 330, { size: 13, color: C.ink2 });
      drawBit(g, 566 + 0, 346, false, false, C.blue);
      txt(g, '0: akım geçmiyor, gerilim alçak', 580, 352, { size: 13, color: C.ink2 });
      // kısa not: kopya rengi
      g.save(); g.fillStyle = C.cop; g.fillRect(842, 320, 7, 14); g.restore();
      txt(g, 'komut ve denetim işareti', 858, 331, { size: 13, color: C.ink2 });
      g.save(); g.fillStyle = C.blue; g.fillRect(842, 342, 7, 14); g.restore();
      txt(g, 'veri', 858, 353, { size: 13, color: C.ink2 });

      txt(g, '3 GHz = saniyede 3 milyar tık; ESP32: iki çekirdek, en çok 240 MHz', 16, 372, { size: 14, weight: 500, color: C.ink });
      txt(g, 'Her blok transistörlerden yapılmıştır.', 1104, 372, { size: 14, color: C.muted, align: 'right' });
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
        var s = position().s, line = Math.floor(s / 4) % N_LINES, ph = Math.floor(s) % 4;
        if (key === 'step') return PHASES[ph];
        if (key === 'auto') return auto ? '1' : '0';
        if (key === 'explain') return explain(line, ph);
        if (key === 'arith') return '5 + 7 = 12 · 0101 + 0111 = 1100';
        if (key === 'tick') return String(Math.floor(T / TICK));
        return '';
      },
      resize: function () { sf.resize(); },
      dispose: function () { sf.dispose(); }
    };
  });
})();
