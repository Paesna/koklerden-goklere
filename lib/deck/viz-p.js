/* Köklerden Göklere · Builder P: GND nedir?
 * ground-ref · 680×520 · açık/koyu tema (2B)
 * 9 V pil + iki eşit direnç (A, B, C düğümleri), voltmetre, GND seçimi (c|b|a),
 * deniz seviyesi benzetmesi, isteğe bağlı toprak teli (yüzer devre), sembol şeridi.
 * Sözleşme: kg-viz.js. Tüm hareket frame(t, dt) içinden sürülür, rastgelelik yok.
 */
(function () {
  'use strict';
  var K = window.KGViz;
  if (!K) return;
  var P = K.palette;
  var clamp = K.clamp;

  var KEYS = ['c', 'b', 'a'];
  var IDX = { a: 0, b: 1, c: 2 };
  var NAMES = ['A', 'B', 'C'];
  var POT = [9, 4.5, 0];               // gerçek potansiyeller (C'ye göre), V
  var PHASE = 5.2;                     // otomatik gösteri: her adım (s)
  var PILL = {
    c: 'GND = C: pilin eksi ucu',
    b: 'GND = B: iki direncin arası',
    a: 'GND = A: pilin artı ucu'
  };
  var EXPLAIN = {
    c: 'GND = C: pilin eksi ucunu 0 V kabul ettik. A noktası 9 V, B noktası 4,5 V yüksekte. Her gerilim, GND’ye göre ölçülür.',
    b: 'GND = B: iki direncin arasını 0 V seçtik. A, B’nin 4,5 V üstünde (+4,5 V), C ise 4,5 V altında (−4,5 V). Dirençlerdeki gerilim aynı kaldı.',
    a: 'GND = A: pilin artı ucunu 0 V seçtik. B −4,5 V, C −9 V olur. Sayılar değişti, dirençlerin üzerindeki 4,5 V değişmedi.'
  };
  var EARTH_ADD = ' GND’den toprağa tel çekildi: tel boş kalır, akım 0 mA; devredeki akım ve gerilimler aynı kalır.';

  K.register('ground-ref', function (el, opts) {
    opts = opts || {};
    var dark = (opts.theme || 'light') === 'dark';
    var sf = K.surface(el);
    var C = {
      ink: dark ? P.onNight : P.ink,
      ink2: dark ? '#C9CFDA' : P.ink2,
      muted: dark ? P.onNightMuted : P.muted,
      line: dark ? P.nightLine : P.line,
      blue: dark ? P.blueLight : P.blue,
      blueSoft: dark ? 'rgba(142,166,242,.20)' : P.blueSoft,
      cop: dark ? P.copperLight : P.copperFill,
      copText: dark ? P.copperLight : '#A64B22',
      copSoft: dark ? 'rgba(227,154,108,.16)' : P.copperSoft,
      grey: dark ? '#9AA3B2' : '#666C78',
      wireO: dark ? '#4A5160' : '#B8BCC6',
      wireI: dark ? '#222836' : '#E6E6E0',
      card: dark ? '#161B26' : '#FFFFFF',
      soil: dark ? '#2A2F3A' : '#E8E3D8',
      bg: dark ? P.night : P.paper,
      gy: '#3E8E41', yl: '#E5C100'
    };

    /* ---------- geometri (CSS px, 680x520) ---------- */
    var XL = 110, XR = 380, YT = 102, YB = 250;      // devre dikdörtgeni
    var NODE = [[XL, YT], [XR, YT], [XL, YB]];       // A, B, C
    var BAT_T = 136, BAT_B = 216;                    // pil gövdesi
    var R1 = { x0: 200, x1: 290, y: YT };            // yatay direnç
    var R2 = { x: XR, y0: 137, y1: 215 };            // dikey direnç
    var MET = { x: 158, y: 158, w: 108, h: 56 };     // voltmetre gövdesi
    var SOIL = 316;                                  // toprak çizgisi
    // GND sembolünün asıldığı noktalar: [stub yolu, sembol x, sembol y]
    var GS = [
      { path: [[XL, YT], [68, YT], [68, 116]], x: 68, y: 116 },
      { path: [[XR, YT], [422, YT], [422, 116]], x: 422, y: 116 },
      { path: [[XL, YB], [XL, 266]], x: XL, y: 266 }
    ];
    var LOOP = [[XL, BAT_T], [XL, YT], [XR, YT], [XR, YB], [XL, YB], [XL, BAT_B]];
    var LOOPLEN = 0, SEG = [];
    (function () {
      for (var i = 0; i < LOOP.length - 1; i++) {
        var l = Math.abs(LOOP[i + 1][0] - LOOP[i][0]) + Math.abs(LOOP[i + 1][1] - LOOP[i][1]);
        SEG.push(l); LOOPLEN += l;
      }
    })();
    function loopAt(s) {
      s = ((s % LOOPLEN) + LOOPLEN) % LOOPLEN;
      for (var i = 0; i < SEG.length; i++) {
        if (s <= SEG[i] || i === SEG.length - 1) {
          var a = LOOP[i], b = LOOP[i + 1], u = SEG[i] ? s / SEG[i] : 0;
          return [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u];
        }
        s -= SEG[i];
      }
      return LOOP[0];
    }

    /* ---------- durum ---------- */
    var ref, earth, auto, gn, eT, mw, dotPhase, flash, lastRef;
    function resetState() {
      ref = 'c'; earth = 0; auto = true;
      gn = [0, 0, 1];        // GND ağırlıkları (A, B, C)
      eT = 0;
      mw = [1, 0, 0];        // voltmetre kırmızı ucunun düğüm ağırlıkları
      dotPhase = 0; flash = 0; lastRef = 'c';
    }
    resetState();
    function refIdx() { return IDX[ref]; }
    function targetGn() { var r = [0, 0, 0]; r[refIdx()] = 1; return r; }
    function curBase() { return gn[0] * POT[0] + gn[1] * POT[1] + gn[2] * POT[2]; }
    function shown(i) { return POT[i] - curBase(); }
    function trueVal(i) { return POT[i] - POT[refIdx()]; }

    /* ---------- biçim ---------- */
    var NB = ' ';
    function fmt(v, plus, nb) {
      if (Math.abs(v) < 0.05) return '0' + (nb ? NB : ' ') + 'V';
      var d = Math.abs(v - Math.round(v)) < 0.05 ? 0 : 1;
      var s = K.num(Math.round(v * 10) / 10, d);
      if (plus && v > 0) s = '+' + s;
      return s + (nb ? NB : ' ') + 'V';
    }
    function voltsText() {
      var plus = ref !== 'c', out = [];
      for (var i = 0; i < 3; i++) out.push(NAMES[i] + ' ' + fmt(trueVal(i), plus, false));
      return out.join(' · ');
    }
    function colorFor(v) { return v > 0.05 ? C.copText : (v < -0.05 ? C.blue : C.ink); }

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
    function polyline(g, pts, color, lw) {
      g.beginPath(); g.moveTo(pts[0][0], pts[0][1]);
      for (var i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]);
      g.strokeStyle = color; g.lineWidth = lw; g.stroke();
    }
    function wire(g, pts) {
      g.save(); g.lineJoin = 'round'; g.lineCap = 'butt';
      polyline(g, pts, C.wireO, 11);
      polyline(g, pts, C.wireI, 7);
      g.restore();
    }
    function groundSym(g, x, y, color, lw) {
      g.save(); g.strokeStyle = color; g.lineWidth = lw || 2.4; g.lineCap = 'round';
      var w = [24, 16, 8];
      for (var i = 0; i < 3; i++) {
        g.beginPath(); g.moveTo(x - w[i] / 2, y + 2 + i * 6); g.lineTo(x + w[i] / 2, y + 2 + i * 6); g.stroke();
      }
      g.beginPath(); g.moveTo(x, y - 2); g.lineTo(x, y + 2); g.stroke();
      g.restore();
    }
    function chassisSym(g, x, y, color) {
      g.save(); g.strokeStyle = color; g.lineWidth = 2.4; g.lineCap = 'round';
      g.beginPath(); g.moveTo(x, y - 2); g.lineTo(x, y + 4); g.stroke();
      g.beginPath(); g.moveTo(x - 13, y + 4); g.lineTo(x + 13, y + 4); g.stroke();
      g.lineWidth = 2;
      for (var i = 0; i < 3; i++) {
        var xx = x - 9 + i * 9;
        g.beginPath(); g.moveTo(xx, y + 5); g.lineTo(xx - 6, y + 14); g.stroke();
      }
      g.restore();
    }
    function chip(g, s, cx, cy, color, bold, a) {
      g.save();
      g.globalAlpha *= a === undefined ? 1 : a;
      g.font = K.font(16, bold ? 600 : 500, true);
      var w = g.measureText(s).width + 16;
      g.fillStyle = C.card;
      K.rr(g, cx - w / 2 + 0.5, cy - 13.5, w, 26, 6); g.fill();
      g.strokeStyle = C.line; g.lineWidth = 1; g.stroke();
      g.restore();
      txt(g, s, cx, cy + 5.5, { size: 16, mono: true, weight: bold ? 600 : 500, color: color, align: 'center', alpha: a });
    }
    function chipLeft(g, s, x, cy, color, a) {
      g.save();
      g.font = K.font(16, 600, true);
      var w = g.measureText(s).width + 16;
      g.restore();
      chip(g, s, x + w / 2, cy, color, true, a);
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

    /* ---------- parçalar ---------- */
    function drawDots(g) {
      var n = Math.round(LOOPLEN / 34), sp = LOOPLEN / n;
      g.save(); g.fillStyle = C.cop;
      for (var i = 0; i < n; i++) {
        var p = loopAt(i * sp + dotPhase);
        g.beginPath(); g.arc(p[0], p[1], 4.4, 0, 6.2832); g.fill();
      }
      g.restore();
    }
    function drawBattery(g) {
      var x = XL, w = 48;
      g.save();
      g.fillStyle = C.ink2;
      K.rr(g, x - 9, BAT_T - 8, 18, 10, 3); g.fill();
      g.fillStyle = C.card;
      K.rr(g, x - w / 2, BAT_T, w, BAT_B - BAT_T, 6); g.fill();
      g.save();
      K.rr(g, x - w / 2, BAT_T, w, BAT_B - BAT_T, 6); g.clip();
      g.fillStyle = dark ? 'rgba(227,154,108,.22)' : 'rgba(200,105,58,.15)';
      g.fillRect(x - w / 2, BAT_T, w, 40);
      g.fillStyle = dark ? 'rgba(142,166,242,.22)' : 'rgba(35,67,176,.12)';
      g.fillRect(x - w / 2, BAT_T + 40, w, 40);
      g.restore();
      g.strokeStyle = C.ink2; g.lineWidth = 1.8;
      K.rr(g, x - w / 2, BAT_T, w, BAT_B - BAT_T, 6); g.stroke();
      g.restore();
      txt(g, '+', x, BAT_T + 27, { size: 24, weight: 600, color: C.copText, align: 'center' });
      txt(g, '9 V', x, BAT_T + 46, { size: 14, mono: true, weight: 600, color: C.ink, align: 'center' });
      txt(g, '−', x, BAT_B - 8, { size: 24, weight: 600, color: C.blue, align: 'center' });
    }
    function drawResistor(g, horiz, nameTxt, nx, ny, align) {
      g.save();
      g.fillStyle = C.card; g.strokeStyle = C.ink2; g.lineWidth = 2;
      if (horiz) K.rr(g, R1.x0, R1.y - 13, R1.x1 - R1.x0, 26, 4);
      else K.rr(g, R2.x - 13, R2.y0, 26, R2.y1 - R2.y0, 4);
      g.fill(); g.stroke();
      g.restore();
      txt(g, nameTxt, nx, ny, { size: 14, weight: 500, color: C.ink2, align: align || 'center' });
    }
    function drawNodeMark(g, i, isRef) {
      var p = NODE[i];
      g.save();
      g.beginPath(); g.arc(p[0], p[1], 12, 0, 6.2832);
      g.fillStyle = isRef ? C.ink : C.card; g.fill();
      g.strokeStyle = C.ink; g.lineWidth = 1.8; g.stroke();
      g.restore();
      txt(g, NAMES[i], p[0], p[1] + 5, { size: 14, weight: 600, mono: true, color: isRef ? (dark ? P.night : '#FFFFFF') : C.ink, align: 'center' });
    }
    function bez(p0, p1, p2, p3, u) {
      var a = 1 - u, b = a * a * a, c = 3 * a * a * u, d = 3 * a * u * u, e = u * u * u;
      return [b * p0[0] + c * p1[0] + d * p2[0] + e * p3[0], b * p0[1] + c * p1[1] + d * p2[1] + e * p3[1]];
    }
    function weightedPos(w) {
      var x = 0, y = 0;
      for (var i = 0; i < 3; i++) { x += w[i] * NODE[i][0]; y += w[i] * NODE[i][1]; }
      return [x, y];
    }
    function drawLead(g, t0, t1, tip, color, side) {
      // t0: çıkış, t1: kontrol, tip: uç noktası
      var same = (tip[0] - t0[0]) * side > 0 ? 22 : 55;
      var c1 = [t0[0] + side * same, t0[1] + 10];
      var c2 = [tip[0] + (tip[0] > 240 ? -34 : 40), tip[1] + (tip[1] < 175 ? 34 : -22)];
      g.save(); g.lineCap = 'round';
      g.beginPath(); g.moveTo(t0[0], t0[1]);
      g.bezierCurveTo(c1[0], c1[1], c2[0], c2[1], tip[0], tip[1]);
      g.strokeStyle = C.ink; g.lineWidth = 5.2; g.stroke();
      g.strokeStyle = color; g.lineWidth = 3; g.stroke();
      g.restore();
    }
    function drawVoltmeter(g, reading, mpos, gpos, plus) {
      // uçlar: siyah sol, kırmızı sağ
      var tl = [MET.x - 2, MET.y + MET.h - 14], tr = [MET.x + MET.w + 2, MET.y + MET.h - 14];
      drawLead(g, tl, null, gpos, dark ? '#9AA3B2' : '#2A2D35', -1);
      drawLead(g, tr, null, mpos, '#D4452B', 1);
      // ölçüm uçları (prob)
      [[gpos, dark ? '#9AA3B2' : '#2A2D35'], [mpos, '#D4452B']].forEach(function (a) {
        g.save();
        g.fillStyle = C.ink; g.strokeStyle = a[1]; g.lineWidth = 2;
        g.beginPath(); g.arc(a[0][0], a[0][1], 6.5, 0, 6.2832); g.fill(); g.stroke();
        g.restore();
      });
      g.save();
      g.fillStyle = C.card; g.strokeStyle = C.ink; g.lineWidth = 2;
      K.rr(g, MET.x, MET.y, MET.w, MET.h, 7); g.fill(); g.stroke();
      g.fillStyle = dark ? '#0E121A' : '#ECEBE4';
      K.rr(g, MET.x + 8, MET.y + 8, MET.w - 16, 26, 4); g.fill();
      g.restore();
      txt(g, fmt(reading, true, true), MET.x + MET.w - 14, MET.y + 28, { size: 17, mono: true, weight: 600, color: colorFor(reading), align: 'right' });
      txt(g, 'V', MET.x + 16, MET.y + 28, { size: 14, mono: true, weight: 600, color: C.muted });
      txt(g, 'voltmetre', MET.x + MET.w / 2, MET.y + 52, { size: 13, weight: 500, color: C.muted, align: 'center' });
      // terminal başları
      g.save();
      g.fillStyle = dark ? '#9AA3B2' : '#2A2D35';
      g.beginPath(); g.arc(tl[0] + 2, tl[1], 4, 0, 6.2832); g.fill();
      g.fillStyle = '#D4452B';
      g.beginPath(); g.arc(tr[0] - 2, tr[1], 4, 0, 6.2832); g.fill();
      g.restore();
    }

    function drawInset(g, zeroY) {
      var X = 470, Y = 52, W = 186, H = 186;
      g.save();
      g.fillStyle = C.card;
      K.rr(g, X + 0.5, Y + 0.5, W, H, 8); g.fill();
      g.strokeStyle = C.line; g.lineWidth = 1; g.stroke();
      g.restore();
      txt(g, 'yükseklik deniz seviyesine', X + 10, Y + 20, { size: 13, weight: 500, color: C.ink2 });
      txt(g, 'göre; gerilim GND’ye göre', X + 10, Y + 37, { size: 13, weight: 600, color: C.ink });
      var lv = [Y + 68, Y + 108, Y + 148];
      var zy = lv[0] * gn[0] + lv[1] * gn[1] + lv[2] * gn[2];
      // deniz
      g.save();
      K.rr(g, X + 2, Y + 44, W - 3, H - 45, 6); g.clip();
      g.fillStyle = C.blueSoft;
      g.beginPath(); g.moveTo(X, zy);
      for (var xx = X; xx <= X + W; xx += 6) g.lineTo(xx, zy + Math.sin((xx - X) / 9 + wave) * 1.8);
      g.lineTo(X + W, Y + H); g.lineTo(X, Y + H); g.closePath(); g.fill();
      g.strokeStyle = C.blue; g.lineWidth = 2;
      g.beginPath();
      for (var x2 = X; x2 <= X + W; x2 += 6) {
        var yy = zy + Math.sin((x2 - X) / 9 + wave) * 1.8;
        if (x2 === X) g.moveTo(x2, yy); else g.lineTo(x2, yy);
      }
      g.stroke();
      g.restore();
      txt(g, 'deniz seviyesi = GND', X + 10, Y + H - 8, { size: 13, weight: 500, color: C.blue });
      // platformlar
      for (var i = 0; i < 3; i++) {
        var py = lv[i], v = shown(i);
        g.save();
        g.fillStyle = C.ink2;
        K.rr(g, X + 52, py - 3, 60, 6, 2); g.fill();
        g.strokeStyle = C.muted; g.lineWidth = 1.2; g.setLineDash([3, 3]);
        g.beginPath(); g.moveTo(X + 82, py + 3); g.lineTo(X + 82, py + 40); g.stroke();
        g.restore();
        g.save();
        g.beginPath(); g.arc(X + 30, py, 11, 0, 6.2832);
        g.fillStyle = gn[i] > 0.5 ? C.ink : C.card; g.fill();
        g.strokeStyle = C.ink; g.lineWidth = 1.6; g.stroke();
        g.restore();
        txt(g, NAMES[i], X + 30, py + 5, { size: 13, weight: 600, mono: true, color: gn[i] > 0.5 ? (dark ? P.night : '#FFFFFF') : C.ink, align: 'center' });
        g.save(); g.fillStyle = C.card; g.globalAlpha = 0.85; g.fillRect(X + 118, py - 10, 62, 20); g.restore();
        txt(g, fmt(v, true, true), X + 122, py + 5, { size: 14, mono: true, weight: 600, color: colorFor(v) });
      }
      // fark oku: A ile C arası sabit kalan yükseklik farkı
      return zy;
    }

    function drawAcross(g) {
      var base = 342;
      txt(g, 'GND nerede olursa olsun değişmeyenler', 24, base, { size: 13, mono: true, weight: 500, color: C.muted });
      var cells = [
        ['R1 üzerinde (A − B)', '4,5 V'],
        ['R2 üzerinde (B − C)', '4,5 V'],
        ['devreden geçen akım', '4,5 mA']
      ];
      var cw = 200, gap = 16, y = base + 10, h = 54;
      for (var i = 0; i < 3; i++) {
        var x = 24 + i * (cw + gap);
        g.save();
        g.fillStyle = C.copSoft;
        K.rr(g, x + 0.5, y + 0.5, cw, h, 8); g.fill();
        g.strokeStyle = C.cop; g.lineWidth = 1.2 + flash * 1.6; g.stroke();
        g.restore();
        txt(g, cells[i][0], x + 12, y + 20, { size: 13, weight: 500, color: C.ink2 });
        txt(g, cells[i][1], x + 12, y + 44, { size: 20, mono: true, weight: 600, color: C.copText });
      }
    }

    function drawSymbols(g) {
      var y0 = 426;
      g.save();
      g.strokeStyle = C.line; g.lineWidth = 1;
      g.beginPath(); g.moveTo(24, y0 + 0.5); g.lineTo(656, y0 + 0.5); g.stroke();
      g.restore();
      txt(g, 'üç ayrı kavram, benzer çizimler: sembolün yanındaki etikete bakılır', 24, y0 + 20, { size: 13, mono: true, weight: 500, color: C.muted });
      var cw = 200, gap = 16, y = y0 + 34;
      var items = [
        ['devre toprağı · GND', '0 V seçtiğimiz referans noktası'],
        ['şasi', 'cihazın metal gövdesi'],
        ['koruma topraklaması · PE', 'güvenlik hattı: prizdeki toprak ucu']
      ];
      for (var i = 0; i < 3; i++) {
        var x = 24 + i * (cw + gap);
        var sx = x + 18, sy = y + 8;
        if (i === 0) groundSym(g, sx, sy, C.ink, 2.4);
        else if (i === 1) chassisSym(g, sx, sy, C.ink);
        else {
          groundSym(g, sx, sy, C.ink, 2.4);
          g.save();
          g.fillStyle = C.gy; g.fillRect(sx - 12, sy + 26, 12, 5);
          g.fillStyle = C.yl; g.fillRect(sx, sy + 26, 12, 5);
          g.restore();
        }
        txt(g, items[i][0], x + 44, y + 14, { size: 14, weight: 600, color: i === 0 ? C.copText : C.ink });
        wrap(g, items[i][1], x + 44, y + 33, cw - 48, 13, 16, C.ink2, 400);
      }
    }

    var wave = 0;

    function frame(t, dt) {
      var g = sf.ctx;
      var d = clamp(dt, 0, 0.05);

      // otomatik gösteri
      if (auto && !K.reducedMotion) {
        var ph = Math.floor(t / PHASE) % 4, tin = t - Math.floor(t / PHASE) * PHASE;
        ref = ph === 0 ? 'c' : ph === 1 ? 'b' : ph === 2 ? 'a' : 'c';
        earth = ph === 3 && tin > 1.4 ? 1 : 0;
      }
      if (ref !== lastRef) { flash = 1; lastRef = ref; }
      flash = Math.max(0, flash - d * 0.9);

      // geçişler
      var tg = targetGn(), k = 1 - Math.exp(-6 * d);
      if (K.reducedMotion) k = 1;
      for (var i = 0; i < 3; i++) gn[i] += (tg[i] - gn[i]) * k;
      eT += ((earth ? 1 : 0) - eT) * (K.reducedMotion ? 1 : (1 - Math.exp(-3.2 * d)));
      if (Math.abs(eT - (earth ? 1 : 0)) < 0.004) eT = earth ? 1 : 0;
      for (i = 0; i < 3; i++) if (Math.abs(gn[i] - tg[i]) < 0.002) gn[i] = tg[i];

      // voltmetre: GND dışındaki iki düğüm sırayla
      var others = [];
      for (i = 0; i < 3; i++) if (i !== refIdx()) others.push(i);
      var mi = others[Math.floor(t / 2.6) % 2];
      var mt = [0, 0, 0]; mt[mi] = 1;
      var kk = 1 - Math.exp(-7 * d);
      for (i = 0; i < 3; i++) mw[i] += (mt[i] - mw[i]) * (K.reducedMotion ? 1 : kk);

      dotPhase += d * 55;
      wave += d * 1.6;

      sf.clear();
      // başlık
      g.save();
      g.font = K.font(14, 500, true);
      var pw = g.measureText(PILL[ref]).width + 26;
      g.fillStyle = C.ink;
      K.rr(g, 24.5, 10.5, pw, 28, 14); g.fill();
      g.restore();
      txt(g, PILL[ref], 24 + 13, 29.5, { size: 14, mono: true, weight: 500, color: dark ? P.night : '#FFFFFF' });
      tag(g, 'basitleştirilmiş model', sf.w - 24, 28);

      // toprak çizgisi
      var soilTxt = earth ? 'toprak' : 'toprak';
      g.save();
      g.fillStyle = C.soil;
      g.fillRect(24, SOIL, 632, 12);
      g.strokeStyle = C.muted; g.lineWidth = 1.4;
      g.beginPath(); g.moveTo(24, SOIL + 0.5); g.lineTo(656, SOIL + 0.5); g.stroke();
      g.lineWidth = 1; g.strokeStyle = C.wireO;
      for (var hx = 30; hx < 650; hx += 14) { g.beginPath(); g.moveTo(hx, SOIL + 12); g.lineTo(hx + 8, SOIL + 1); g.stroke(); }
      g.restore();
      txt(g, soilTxt + ' (gerçek yer)', 656, SOIL - 6, { size: 13, weight: 500, color: C.muted, align: 'right' });

      // devre telleri
      wire(g, LOOP);
      drawDots(g);
      // pil, dirençler
      drawBattery(g);
      drawResistor(g, true, 'R1 · 1.000 Ω', (R1.x0 + R1.x1) / 2, YT - 22);
      drawResistor(g, false, 'R2', XR - 22, (R2.y0 + R2.y1) / 2 - 2, 'right');
      txt(g, '1.000 Ω', XR - 22, (R2.y0 + R2.y1) / 2 + 15, { size: 13, weight: 400, color: C.muted, align: 'right' });

      // GND sembolleri ve toprak teli
      for (i = 0; i < 3; i++) {
        var a = gn[i];
        if (a < 0.02) continue;
        g.save();
        g.globalAlpha = a;
        g.lineCap = 'round'; g.lineJoin = 'round';
        polyline(g, GS[i].path, C.ink, 2.4);
        g.restore();
        g.save(); g.globalAlpha = a;
        groundSym(g, GS[i].x, GS[i].y, C.ink, 2.4);
        g.restore();
        if (eT > 0.01) {
          var ys = GS[i].y + 16, ye = SOIL + 9, yc = ys + (ye - ys) * eT;
          g.save(); g.globalAlpha = a * Math.min(1, eT * 3);
          g.lineCap = 'round';
          polyline(g, [[GS[i].x, ys], [GS[i].x, yc]], C.grey, 3);
          g.restore();
          if (eT > 0.9) {
            g.save(); g.globalAlpha = a * clamp((eT - 0.9) * 10, 0, 1);
            g.fillStyle = C.grey;
            K.rr(g, GS[i].x - 3, SOIL - 6, 6, 16, 2); g.fill();
            g.restore();
            var onLeft = i === 0;
            var tx = onLeft ? GS[i].x - 8 : GS[i].x + 8;
            txt(g, '0 mA', tx, (ys + SOIL) / 2 + 5, { size: 14, mono: true, weight: 600, color: C.grey, align: onLeft ? 'right' : 'left', alpha: a * clamp((eT - 0.9) * 10, 0, 1) });
          }
        }
      }

      // voltmetre (düğümlerin altında kalmasın diye önce)
      var reading = 0;
      for (i = 0; i < 3; i++) reading += mw[i] * shown(i);
      drawVoltmeter(g, reading, weightedPos(mw), weightedPos(gn), true);

      // düğüm işaretleri ve gerilim etiketleri
      var plus = ref !== 'c';
      for (i = 0; i < 3; i++) {
        drawNodeMark(g, i, gn[i] > 0.5);
        var v = shown(i), s = fmt(v, plus, true);
        if (i === 2) chipLeft(g, s, 132, 266, colorFor(v), 1);
        else chip(g, s, NODE[i][0], NODE[i][1] - 32, colorFor(v), gn[i] > 0.5, 1);
      }

      // durum yazısı
      var st1 = earth ? 'GND toprağa bağlı:' : 'toprağa bağlı değil:';
      var st2 = earth ? 'tel boş, akım ve gerilimler aynı' : 'pilli devre yüzer';
      txt(g, st1, 470, 262, { size: 14, weight: 600, color: C.ink });
      wrap(g, st2, 470, 280, 186, 13, 16, C.ink2, 400);

      drawInset(g, 0);
      drawAcross(g);
      drawSymbols(g);
    }

    return {
      reset: function () { resetState(); },
      frame: frame,
      set: function (key, val) {
        if (key === 'ref') {
          val = String(val).toLowerCase();
          if (IDX[val] !== undefined) { auto = false; ref = val; }
        } else if (key === 'earth') {
          auto = false;
          earth = (val === 1 || val === '1' || val === true || val === 'true') ? 1 : 0;
        }
      },
      read: function (key) {
        if (key === 'ref') return ref;
        if (key === 'earth') return String(earth);
        if (key === 'volts') return voltsText();
        if (key === 'explain') return EXPLAIN[ref] + (earth ? EARTH_ADD : '');
        return '';
      },
      resize: function () { sf.resize(); },
      dispose: function () { sf.dispose(); }
    };
  });
})();
