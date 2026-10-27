/* Köklerden Göklere · Builder P: GND nedir? (odak slaytı)
 * ground-ref · 1120×440 tasarım alanı, kutuya sığacak şekilde ölçeklenir · 2B, açık/koyu tema
 * Solda 9 V pil + iki eşit direnç (A, B, C düğümleri) ve GND işareti; sağda "deniz seviyesi" benzetmesi.
 * GND seçimi (c|b|a), isteğe bağlı toprak teli (yüzer devre). Otomatik gösteri c, b, a, c+toprak gezer.
 * set('ref'|'earth', ...) gösteriyi durdurur. Sözleşme: kg-viz.js. Hareket frame(t, dt) içinden, rastgelelik yok.
 */
(function () {
  'use strict';
  var K = window.KGViz;
  if (!K) return;
  var P = K.palette;
  var clamp = K.clamp;

  var DW = 1120, DH = 440;
  var IDX = { a: 0, b: 1, c: 2 };
  var NAMES = ['A', 'B', 'C'];
  var POT = [9, 4.5, 0];               // gerçek potansiyeller (C'ye göre), V
  var PHASE = 6.5;                     // otomatik gösteri: her adım (s)
  var EXPLAIN = {
    c: 'GND = C: pilin eksi ucu 0 V olur; A 9 V, B 4,5 V yüksektedir.',
    b: 'GND = B: ortası 0 V; A +4,5 V, C −4,5 V, dirençlerde fark yine 4,5 V.',
    a: 'GND = A: pilin artı ucu 0 V; B −4,5 V, C −9 V, farklar yine aynı.'
  };
  var EXPLAIN_EARTH = 'GND toprağa bağlandı: tel boş kalır, akım 0 mA, hiçbir değer değişmez.';

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
      blueSoft: dark ? 'rgba(142,166,242,.22)' : 'rgba(35,67,176,.12)',
      cop: dark ? P.copperLight : P.copperFill,
      copText: dark ? P.copperLight : '#A64B22',
      grey: dark ? '#9AA3B2' : '#666C78',
      wireO: dark ? '#4A5160' : '#AEB3BE',
      wireI: dark ? '#262C3A' : '#E9E9E3',
      card: dark ? '#161B26' : '#FFFFFF',
      soil: dark ? '#2A2F3A' : '#E8E3D8',
      bg: dark ? P.night : P.paper
    };

    /* ---------- geometri (tasarım px, 1120×440) ---------- */
    var XL = 150, XR = 480, YT = 112, YB = 322;
    var NODE = [[XL, YT], [XR, YT], [XL, YB]];       // A, B, C
    var BAT_T = 160, BAT_B = 274;
    var R1 = { x0: 240, x1: 380, y: YT };
    var R2 = { x: XR, y0: 160, y1: 274 };
    var SOIL = 408;
    var GS = [
      { path: [[XL, YT], [90, YT], [90, 150]], x: 90, y: 150 },
      { path: [[XR, YT], [540, YT], [540, 150]], x: 540, y: 150 },
      { path: [[XL, YB], [XL, 362]], x: XL, y: 362 }
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
    /* deniz seviyesi kutusu */
    var LV = [84, 206, 328];             // A, B, C platform yükseklikleri (sabit)
    var IX = 640, IW = 456, IY = 14, IH = 412;

    /* ---------- durum ---------- */
    var ref, earth, auto, gn, eT, dotPhase, flash, lastRef, wave;
    function resetState() {
      ref = 'c'; earth = 0; auto = true;
      gn = [0, 0, 1];
      eT = 0;
      dotPhase = 0; flash = 0; lastRef = 'c'; wave = 0;
    }
    resetState();
    function refIdx() { return IDX[ref]; }
    function targetGn() { var r = [0, 0, 0]; r[refIdx()] = 1; return r; }
    function curBase() { return gn[0] * POT[0] + gn[1] * POT[1] + gn[2] * POT[2]; }
    function shown(i) { return POT[i] - curBase(); }
    function trueVal(i) { return POT[i] - POT[refIdx()]; }

    /* ---------- biçim ---------- */
    var NB = ' ';
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
    function polyline(g, pts, color, lw) {
      g.beginPath(); g.moveTo(pts[0][0], pts[0][1]);
      for (var i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]);
      g.strokeStyle = color; g.lineWidth = lw; g.stroke();
    }
    function wire(g, pts) {
      g.save(); g.lineJoin = 'round'; g.lineCap = 'butt';
      g.save(); g.translate(0, 2.5); polyline(g, pts, 'rgba(20,24,40,.09)', 17); g.restore();
      polyline(g, pts, C.wireO, 14);
      polyline(g, pts, C.wireI, 9.5);
      g.restore();
    }
    function groundSym(g, x, y, color, lw) {
      g.save(); g.strokeStyle = color; g.lineWidth = lw || 3; g.lineCap = 'round';
      var w = [36, 24, 12];
      for (var i = 0; i < 3; i++) {
        g.beginPath(); g.moveTo(x - w[i] / 2, y + 2 + i * 8); g.lineTo(x + w[i] / 2, y + 2 + i * 8); g.stroke();
      }
      g.beginPath(); g.moveTo(x, y - 2); g.lineTo(x, y + 2); g.stroke();
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

    /* ---------- parçalar ---------- */
    function drawDots(g) {
      var n = Math.round(LOOPLEN / 38), sp = LOOPLEN / n;
      g.save(); g.fillStyle = C.cop;
      for (var i = 0; i < n; i++) {
        var p = loopAt(i * sp + dotPhase);
        g.beginPath(); g.arc(p[0], p[1], 5.6, 0, 6.2832); g.fill();
      }
      g.restore();
    }
    function drawBattery(g) {
      var x = XL, w = 70;
      g.save();
      g.fillStyle = 'rgba(20,24,40,.12)';
      K.rr(g, x - w / 2 + 3, BAT_T + 5, w, BAT_B - BAT_T, 8); g.fill();
      g.fillStyle = C.ink2;
      K.rr(g, x - 13, BAT_T - 11, 26, 13, 3); g.fill();
      g.fillStyle = C.card;
      K.rr(g, x - w / 2, BAT_T, w, BAT_B - BAT_T, 8); g.fill();
      g.save();
      K.rr(g, x - w / 2, BAT_T, w, BAT_B - BAT_T, 8); g.clip();
      g.fillStyle = dark ? 'rgba(227,154,108,.24)' : 'rgba(200,105,58,.16)';
      g.fillRect(x - w / 2, BAT_T, w, 57);
      g.fillStyle = dark ? 'rgba(142,166,242,.24)' : 'rgba(35,67,176,.12)';
      g.fillRect(x - w / 2, BAT_T + 57, w, 57);
      g.restore();
      g.strokeStyle = C.ink2; g.lineWidth = 2;
      K.rr(g, x - w / 2, BAT_T, w, BAT_B - BAT_T, 8); g.stroke();
      g.restore();
      txt(g, '+', x, BAT_T + 38, { size: 34, weight: 600, color: C.copText, align: 'center' });
      txt(g, '9 V', x, BAT_T + 78, { size: 18, mono: true, weight: 700, color: C.ink, align: 'center' });
      txt(g, '−', x, BAT_B - 14, { size: 34, weight: 600, color: C.blue, align: 'center' });
    }
    function drawResistor(g, horiz) {
      var x, y, w, h;
      if (horiz) { x = R1.x0; y = R1.y - 17; w = R1.x1 - R1.x0; h = 34; }
      else { x = R2.x - 17; y = R2.y0; w = 34; h = R2.y1 - R2.y0; }
      g.save();
      g.fillStyle = 'rgba(20,24,40,.12)';
      K.rr(g, x + 2, y + 4, w, h, 7); g.fill();
      g.fillStyle = dark ? '#C8B48E' : '#E4D3AE';
      g.strokeStyle = C.ink2; g.lineWidth = 2;
      K.rr(g, x, y, w, h, 7); g.fill(); g.stroke();
      // renk halkaları: kahverengi, siyah, kırmızı (1 kΩ)
      var cols = ['#7A4A23', '#1D1D1D', '#C23A28'];
      for (var i = 0; i < 3; i++) {
        g.fillStyle = cols[i];
        if (horiz) g.fillRect(x + 28 + i * 24, y + 1, 10, h - 2);
        else g.fillRect(x + 1, y + 24 + i * 24, w - 2, 10);
      }
      g.restore();
    }
    function drawNodeMark(g, i, isRef, tt) {
      var p = NODE[i];
      if (isRef) {
        for (var j = 0; j < 2; j++) {
          var u = ((tt / 2.2 + j * 0.5) % 1);
          g.save(); g.globalAlpha = (1 - u) * 0.7; g.strokeStyle = C.ink; g.lineWidth = 3;
          g.beginPath(); g.arc(p[0], p[1], 20 + u * 24, 0, 6.2832); g.stroke(); g.restore();
        }
      }
      g.save();
      g.beginPath(); g.arc(p[0], p[1], 19, 0, 6.2832);
      g.fillStyle = isRef ? C.ink : C.card; g.fill();
      g.strokeStyle = C.ink; g.lineWidth = 2.4; g.stroke();
      g.restore();
      txt(g, NAMES[i], p[0], p[1] + 7, { size: 20, weight: 700, mono: true, color: isRef ? (dark ? P.night : '#FFFFFF') : C.ink, align: 'center' });
    }

    function drawSea(g, tt) {
      var X = IX, Y = IY, W = IW, H = IH;
      g.save();
      g.fillStyle = C.card;
      K.rr(g, X + 0.5, Y + 0.5, W, H, 12); g.fill();
      g.strokeStyle = C.line; g.lineWidth = 1.4; g.stroke();
      g.restore();
      var zy = LV[0] * gn[0] + LV[1] * gn[1] + LV[2] * gn[2];
      g.save();
      K.rr(g, X + 2, Y + 2, W - 3, H - 3, 11); g.clip();
      g.fillStyle = C.blueSoft;
      g.beginPath(); g.moveTo(X, zy);
      var xx;
      for (xx = X; xx <= X + W; xx += 6) g.lineTo(xx, zy + Math.sin((xx - X) / 14 + wave) * 2.6);
      g.lineTo(X + W, Y + H); g.lineTo(X, Y + H); g.closePath(); g.fill();
      g.strokeStyle = C.blue; g.lineWidth = 3;
      g.beginPath();
      for (xx = X; xx <= X + W; xx += 6) {
        var yy = zy + Math.sin((xx - X) / 14 + wave) * 2.6;
        if (xx === X) g.moveTo(xx, yy); else g.lineTo(xx, yy);
      }
      g.stroke();
      g.restore();
      // her basamak arasındaki sabit fark
      for (var b = 0; b < 2; b++) {
        var y0 = LV[b] + 24, y1 = LV[b + 1] - 24, mx = 1010;
        g.save(); g.strokeStyle = C.copText; g.fillStyle = C.copText; g.lineWidth = 2.4;
        g.globalAlpha = 0.9 + flash * 0.1;
        g.beginPath(); g.moveTo(mx, y0); g.lineTo(mx, y1); g.stroke();
        K.arrow(g, mx, y0 + 2, mx, y0 - 2, { color: C.copText, width: 2.4, head: 9 });
        K.arrow(g, mx, y1 - 2, mx, y1 + 2, { color: C.copText, width: 2.4, head: 9 });
        g.restore();
        txt(g, '4,5 V', mx + 12, (y0 + y1) / 2 + 7, { size: 20, weight: 700, mono: true, color: C.copText });
      }
      txt(g, 'deniz seviyesi = GND', X + 20, Y + H - 16, { size: 18, weight: 700, color: C.blue });
      // platformlar
      for (var i = 0; i < 3; i++) {
        var py = LV[i], v = shown(i);
        g.save();
        g.fillStyle = 'rgba(20,24,40,.12)';
        K.rr(g, X + 100, py - 4, 140, 10, 3); g.fill();
        g.fillStyle = C.ink2;
        K.rr(g, X + 98, py - 6, 140, 10, 3); g.fill();
        g.strokeStyle = C.muted; g.lineWidth = 1.6; g.setLineDash([4, 4]);
        g.beginPath(); g.moveTo(X + 168, py + 6); g.lineTo(X + 168, py + 44); g.stroke();
        g.restore();
        g.save();
        g.beginPath(); g.arc(X + 56, py - 2, 21, 0, 6.2832);
        g.fillStyle = gn[i] > 0.5 ? C.ink : C.card; g.fill();
        g.strokeStyle = C.ink; g.lineWidth = 2.4; g.stroke();
        g.restore();
        txt(g, NAMES[i], X + 56, py + 5, { size: 20, weight: 700, mono: true, color: gn[i] > 0.5 ? (dark ? P.night : '#FFFFFF') : C.ink, align: 'center' });
        g.save(); g.fillStyle = C.card; g.globalAlpha = 0.92; g.fillRect(X + 246, py - 20, 150, 40); g.restore();
        txt(g, fmt(v, true, true), X + 252, py + 9, { size: 30, mono: true, weight: 700, color: colorFor(v) });
      }
    }

    function frame(t, dt) {
      var g = sf.ctx, W = sf.w, H = sf.h;
      var d = clamp(dt, 0, 0.05);

      if (auto && !K.reducedMotion) {
        var ph = Math.floor(t / PHASE) % 4, tin = t - Math.floor(t / PHASE) * PHASE;
        ref = ph === 0 ? 'c' : ph === 1 ? 'b' : ph === 2 ? 'a' : 'c';
        earth = ph === 3 && tin > 1.6 ? 1 : 0;
      }
      if (ref !== lastRef) { flash = 1; lastRef = ref; }
      flash = Math.max(0, flash - d * 0.9);

      var tg = targetGn(), k = 1 - Math.exp(-5 * d), i;
      if (K.reducedMotion) k = 1;
      for (i = 0; i < 3; i++) gn[i] += (tg[i] - gn[i]) * k;
      eT += ((earth ? 1 : 0) - eT) * (K.reducedMotion ? 1 : (1 - Math.exp(-3.2 * d)));
      if (Math.abs(eT - (earth ? 1 : 0)) < 0.004) eT = earth ? 1 : 0;
      for (i = 0; i < 3; i++) if (Math.abs(gn[i] - tg[i]) < 0.002) gn[i] = tg[i];

      dotPhase += d * 55;
      wave += d * 1.5;
      var tt = K.reducedMotion ? 2 : t;

      sf.clear();
      var s = Math.min(W / DW, H / DH);
      g.save();
      g.translate((W - DW * s) / 2, (H - DH * s) / 2);
      g.scale(s, s);

      tag(g, 'basitleştirilmiş model', IX - 20, 24);

      // toprak şeridi
      g.save();
      g.fillStyle = C.soil;
      g.fillRect(24, SOIL, 570, 26);
      g.strokeStyle = C.muted; g.lineWidth = 1.6;
      g.beginPath(); g.moveTo(24, SOIL + 0.5); g.lineTo(594, SOIL + 0.5); g.stroke();
      g.lineWidth = 1; g.strokeStyle = C.wireO;
      for (var hx = 30; hx < 590; hx += 16) { g.beginPath(); g.moveTo(hx, SOIL + 26); g.lineTo(hx + 10, SOIL + 2); g.stroke(); }
      g.restore();

      // devre
      wire(g, LOOP);
      drawResistor(g, true);
      drawResistor(g, false);
      drawDots(g);
      drawBattery(g);

      // GND işaretleri ve isteğe bağlı toprak teli
      for (i = 0; i < 3; i++) {
        var a = gn[i];
        if (a < 0.02) continue;
        g.save();
        g.globalAlpha = a;
        g.lineCap = 'round'; g.lineJoin = 'round';
        polyline(g, GS[i].path, C.ink, 3);
        groundSym(g, GS[i].x, GS[i].y, C.ink, 3);
        g.restore();
        if (eT > 0.01) {
          var ys = GS[i].y + 22, ye = SOIL + 6, yc = ys + (ye - ys) * eT;
          g.save(); g.globalAlpha = a * Math.min(1, eT * 3);
          g.lineCap = 'round';
          polyline(g, [[GS[i].x, ys], [GS[i].x, yc]], C.grey, 4);
          g.restore();
          if (eT > 0.9 && a > 0.5) {
            var la = clamp((eT - 0.9) * 10, 0, 1) * a;
            g.save(); g.globalAlpha = la; g.fillStyle = C.grey;
            K.rr(g, GS[i].x - 5, SOIL - 10, 10, 24, 3); g.fill();
            g.restore();
            var onLeft = i === 0;
            txt(g, '0 mA', onLeft ? GS[i].x - 12 : GS[i].x + 14, (ys + SOIL) / 2 + 7, { size: 22, mono: true, weight: 700, color: C.grey, align: onLeft ? 'right' : 'left', alpha: la });
          }
        }
      }

      for (i = 0; i < 3; i++) drawNodeMark(g, i, gn[i] > 0.5, tt);
      drawSea(g, tt);

      g.restore();
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
        if (key === 'explain') return earth ? EXPLAIN_EARTH : EXPLAIN[ref];
        return '';
      },
      resize: function () { sf.resize(); },
      dispose: function () { sf.dispose(); }
    };
  });
})();
