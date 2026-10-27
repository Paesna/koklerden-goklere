/* Köklerden Göklere · Builder AD: güneş hücresi
 * solar-lab · odak slayt, 1120×440 sanal sahne (ölçeklenir) · 2B (düz, "müze çizimi" görünümü)
 * Grup a: isik · alan · devre (hücre gerilimi nasıl doğar). Grup b: seri · led (panel ve LED ile fark).
 * Görünümler: isik · alan · devre · seri · led
 * Silisyum hücre kesiti: foton elektron-boşluk çifti açar, birleşimin yerleşik alanı çifti ayırır,
 * elektronlar dış devreden geçer. Seri bağlama, ışık düzeyi ve LED ile karşılaştırma.
 * Sözleşme: kg-viz.js. Rastgelelik K.rng ile, otomatik gösteri ilk set() çağrısında durur.
 */
(function () {
  'use strict';
  var K = window.KGViz;
  if (!K) return;
  var P = K.palette;
  var clamp = K.clamp;

  var VIEWS = ['isik', 'alan', 'devre', 'seri', 'led'];
  var GROUPS = { a: ['isik', 'alan', 'devre'], b: ['seri', 'led'] };
  var DUR = { isik: 12, alan: 9, devre: 11, seri: 12, led: 10 };
  var VW = 1120, VH = 440;
  var GAP = 1.12;                       // silisyumun yasak aralığı, eV
  var HC = 1240;                        // eV·nm

  var EXPLAIN = {
    isik: 'Yeterli enerjili foton silisyumda elektron-boşluk çifti açar; zayıf foton geçer ya da ısıya döner.',
    alan: 'Birleşimdeki alan elektronu n tarafına, boşluğu p tarafına iter; çift birleşemez, gerilim doğar.',
    devre: 'Elektron kablodan lambaya gider, yük bırakıp p tarafına döner; devre kapalıdır, hücre yaklaşık 0,5 V verir.',
    seri: 'Seri bağlı hücrelerin gerilimi toplanır; ışık azalınca akım azalır, gerilim neredeyse aynı kalır.',
    led: 'LED’de elektrik girer, ışık çıkar; güneş hücresinde ışık girer, elektrik çıkar. Yapı aynı, yön ters.'
  };
  var HEAD = {
    isik: 'foton silisyuma çarpınca',
    alan: 'birleşimin yerleşik alanı',
    devre: 'hücre ve lamba: tam devre',
    seri: 'hücreleri art arda (seri) bağlayınca',
    led: 'LED ve güneş hücresi yan yana'
  };
  var NUMBERS = {
    isik: '1240 ÷ 1.100 nm ≈ 1,12 eV',
    alan: 'yerleşik alan n → p; elektron n’ye, boşluk p’ye',
    devre: 'hücre ≈ 0,5 V; akım ışıkla orantılı',
    seri: '1 × 0,5 V · 6 × 0,5 V = 3 V · 36 × 0,5 V = 18 V · 60 × 0,5 V ≈ 30 V',
    led: 'ticari panel: ışığın yaklaşık %15-22’si elektriğe'
  };

  /* seri hücre geriliminin ışıkla çok yavaş (logaritmik) değiştiği basit model */
  function volt1(L) { return L < 0.005 ? 0 : Math.max(0, 0.5 + 0.025 * Math.log(L)); }
  function evOf(nm) { return HC / nm; }
  function trim(s) { return s.replace(/,0$/, ''); }

  /* dalga boyuna göre renk (kızılötesi gri-mor) */
  function pcol(nm) {
    if (nm < 490) return '#5B3FD6';
    if (nm < 590) return '#2F9A4B';
    if (nm < 800) return '#D13B2A';
    return '#7A5F8C';
  }

  K.register('solar-lab', function (el, opts) {
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
      nFill: dark ? '#1E2850' : '#DCE3F6',
      pFill: dark ? '#46302A' : '#F3DCCB',
      metal: dark ? '#8A93A3' : '#7C828E',
      lamp: '#F2C46B',
      fil: '#D98A2B'
    };

    /* ---------- geometri (CSS px, 1120x380) ---------- */
    var CX0 = 150, CW = 520, CX1 = CX0 + CW;      // hücre
    var YT = 96, NH = 56, PH = 190, BK = 14;      // üst, n kalınlığı, p kalınlığı, arka kontak
    var YJ = YT + NH;                              // birleşim
    var YP1 = YJ + PH;                             // p alt kenarı
    var YB = YT - 9;                               // üst bara
    var YR = YP1 + 7;                              // arka kontak orta çizgisi
    var WX = 860, LY = Math.round((YB + YR) / 2), LR = 40;   // lamba
    var LT = LY - LR, LB = LY + LR;
    var PS = 175;                                  // foton hızı (px/s)

    var ISIK_SEQ = [[450, 0.77], [1500, 0.23], [650, 0.51], [1000, 0.83], [550, 0.35]];
    var ALAN_SEQ = [[550], [650], [450]];
    var DEVRE_SEQ = [[450], [550], [650], [1000]];

    /* ---------- durum ---------- */
    var rng = K.rng(9137);
    var grp = null, demoT = 0;
    var view, auto, L, now, nextSpawn, idx, ph, cr, fl, lastPh, lampB, ionA, fieldA;
    function sceneView(v) { return v === 'isik' || v === 'alan' || v === 'devre'; }

    function resetState() {
      rng = K.rng(9137);
      view = grp ? GROUPS[grp][0] : 'isik'; auto = !K.reducedMotion; L = 1; now = 0; idx = 0; demoT = 0;
      ph = []; cr = []; fl = []; lastPh = null; lampB = 0; ionA = 0; fieldA = 0;
      nextSpawn = 0.3;
      warm();
    }

    function enterView(v) {
      view = v; ph = []; cr = []; fl = []; idx = 0; lastPh = null;
      nextSpawn = now + 0.25;
      if (v === 'alan') { ionA = 1; fieldA = 1; }
      warm();
    }

    function warm() {
      if (!sceneView(view)) return;
      var n = view === 'devre' ? 220 : view === 'alan' ? 70 : 50;
      for (var i = 0; i < n; i++) { now += 1 / 30; sim(1 / 30); }
    }

    /* ---------- benzetim ---------- */
    function addPhoton(x, nm) {
      var ok = evOf(nm) >= GAP, ay;
      if (view === 'alan') ay = YJ + (rng() - 0.5) * 14;
      else if (nm < 500) ay = YT + 10 + rng() * 14;
      else if (nm < 600) ay = YT + 30 + rng() * 14;
      else if (nm < 800) ay = YJ + 60 + rng() * 40;
      else ay = YJ + 130 + rng() * 30;
      ph.push({ x: x, y: 30, nm: nm, ok: ok, ay: ay, st: 0, t: 0, flag: false });
    }

    function makePair(x, y) {
      var fast = view === 'devre';
      cr.push({ k: 'e', x: x, y: y, st: 0, v: fast ? 78 : 46, ph: rng() * 6.28, a: 0, age: 0 });
      cr.push({ k: 'h', x: x + 4, y: y, st: 0, v: fast ? 60 : 38, ph: rng() * 6.28, a: 0, age: 0, stack: rng() * 14 });
      fl.push({ x: x, y: y, t: 0, c: 'ink' });
    }

    function makePath(x) {
      var x2 = CX0 + 40 + rng() * (CW - 80);
      var pts = [[x, YT + 7], [x, YB], [WX, YB], [WX, LT], [WX, LB], [WX, YR], [x2, YR], [x2, YP1 - 12]];
      var segs = [], tot = 0;
      for (var i = 0; i < pts.length - 1; i++) {
        var l = Math.abs(pts[i + 1][0] - pts[i][0]) + Math.abs(pts[i + 1][1] - pts[i][1]);
        segs.push(l); tot += l;
      }
      return { pts: pts, segs: segs, L: tot, x2: x2 };
    }
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

    function sim(d) {
      var i, c, p;
      // doğma
      if (now >= nextSpawn) {
        var seq = view === 'isik' ? ISIK_SEQ : view === 'alan' ? ALAN_SEQ : DEVRE_SEQ;
        var iv;
        if (view === 'isik') iv = 1.25;
        else if (view === 'alan') iv = 0.85;
        else iv = L > 0.03 ? 0.55 / L : 0.3;
        if (view !== 'devre' || L > 0.03) {
          var e = seq[idx % seq.length];
          idx++;
          addPhoton(e[1] ? CX0 + e[1] * CW : CX0 + 40 + ((idx * 97) % (CW - 80)), e[0]);
        }
        nextSpawn = now + iv;
      }
      // fotonlar
      for (i = ph.length - 1; i >= 0; i--) {
        p = ph[i]; p.t += d;
        if (p.st === 0) {
          p.y += PS * d;
          if (!p.flag && p.y >= YT - 6) { p.flag = true; lastPh = { nm: p.nm, E: evOf(p.nm), ok: p.ok, t: now }; }
          if (p.ok && p.y >= p.ay) { p.y = p.ay; p.st = 2; p.t = 0; makePair(p.x, p.ay); }
          else if (!p.ok && p.y >= YP1 - 6) { p.st = 3; p.t = 0; }
        } else if (p.st === 2) { if (p.t > 0.18) ph.splice(i, 1); }
        else if (p.st === 3) { if (p.t > 0.9) ph.splice(i, 1); }
      }
      // yük taşıyıcılar
      for (i = cr.length - 1; i >= 0; i--) {
        c = cr[i];
        c.a = Math.min(1, c.a + d / 0.15);
        if (c.k === 'e') {
          if (c.st === 0) {
            c.y -= c.v * d;
            c.x = clamp(c.x + Math.sin(now * 4 + c.ph) * 5 * d, CX0 + 8, CX1 - 8);
            if (c.y <= YT + 7) {
              c.y = YT + 7;
              if (view === 'devre') { c.st = 2; c.s = 0; c.path = makePath(c.x); }
              else { c.st = 1; c.age = 0; }
            }
          } else if (c.st === 1) {
            c.age += d; if (c.age > 2.8) cr.splice(i, 1);
          } else if (c.st === 2) {
            c.s += 135 * d;
            if (c.s >= c.path.L) {
              var best = null, bd = 1e9;
              for (var j = 0; j < cr.length; j++) {
                var h = cr[j];
                if (h.k === 'h' && h.st === 1) { var dd = Math.abs(h.x - c.path.x2); if (dd < bd) { bd = dd; best = j; } }
              }
              if (best !== null && bd < 130) {
                fl.push({ x: cr[best].x, y: cr[best].y, t: 0, c: 'cop' });
                if (best > i) { cr.splice(best, 1); cr.splice(i, 1); } else { cr.splice(i, 1); cr.splice(best, 1); }
              } else cr.splice(i, 1);
            }
          }
        } else {
          if (c.st === 0) {
            c.y += c.v * d;
            c.x = clamp(c.x + Math.sin(now * 3 + c.ph) * 4 * d, CX0 + 8, CX1 - 8);
            if (c.y >= YP1 - 9 - c.stack) { c.st = 1; c.age = 0; c.y = YP1 - 9 - c.stack; }
          } else {
            c.age += d;
            if (view === 'devre' ? c.age > 9 : c.age > 2.8) cr.splice(i, 1);
          }
        }
      }
      for (i = fl.length - 1; i >= 0; i--) { fl[i].t += d; if (fl[i].t > 0.45) fl.splice(i, 1); }
    }

    /* ---------- çizim yardımcıları ---------- */
    function txt(g, s, x, y, o) { K.label(g, s, x, y, o); }
    function wrap(g, text, x, y, w, size, pitch, color, weight, mono) {
      var words = text.split(' '), line = '', yy = y;
      g.save(); g.font = K.font(size, weight || 400, mono);
      for (var i = 0; i < words.length; i++) {
        var t2 = line ? line + ' ' + words[i] : words[i];
        if (g.measureText(t2).width > w && line) {
          g.restore(); txt(g, line, x, yy, { size: size, color: color, weight: weight, mono: mono });
          g.save(); g.font = K.font(size, weight || 400, mono);
          line = words[i]; yy += pitch;
        } else line = t2;
      }
      g.restore();
      txt(g, line, x, yy, { size: size, color: color, weight: weight, mono: mono });
      return yy + pitch;
    }
    function pill(g, s, x, y, o) {
      o = o || {};
      var size = o.size || 13;
      g.save();
      g.font = K.font(size, o.weight || 500, o.mono);
      var w = g.measureText(s).width + 12;
      var x0 = o.align === 'right' ? x - w : x;
      g.globalAlpha *= (o.alpha === undefined ? 1 : o.alpha) * 0.9;
      g.fillStyle = C.bg;
      K.rr(g, x0, y - size - 2, w, size + 8, 5); g.fill();
      g.restore();
      txt(g, s, x0 + 6, y + 1, { size: size, color: o.color || C.ink2, weight: o.weight || 500, mono: o.mono, alpha: o.alpha });
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
    function packet(g, x, hy, dir, nm, alpha, lenScale) {
      var lam = clamp(nm / 24, 16, 62);
      var len = Math.max(40, lam * 2.2) * (lenScale === undefined ? 1 : lenScale);
      if (len < 6) return;
      var col = pcol(nm);
      g.save();
      g.globalAlpha *= alpha;
      g.strokeStyle = col; g.fillStyle = col; g.lineWidth = 3.4; g.lineJoin = 'round'; g.lineCap = 'round';
      g.beginPath();
      for (var s = 0; s <= len; s += 2) {
        var u = s / len;
        var yy = hy - dir * 8 - dir * (len - s);
        var xx = x + 6 * Math.sin(u * Math.PI) * Math.sin(s / lam * 6.2832);
        if (s === 0) g.moveTo(xx, yy); else g.lineTo(xx, yy);
      }
      g.stroke();
      g.beginPath();
      g.moveTo(x, hy); g.lineTo(x - 8, hy - dir * 14); g.lineTo(x + 8, hy - dir * 14);
      g.closePath(); g.fill();
      g.restore();
    }
    function drawE(g, x, y, a) {
      g.save(); g.globalAlpha *= a;
      g.fillStyle = C.blue;
      g.beginPath(); g.arc(x, y, 9, 0, 6.2832); g.fill();
      g.strokeStyle = '#FFFFFF'; g.lineWidth = 2.4; g.lineCap = 'round';
      g.beginPath(); g.moveTo(x - 4.5, y); g.lineTo(x + 4.5, y); g.stroke();
      g.restore();
    }
    function drawH(g, x, y, a) {
      g.save(); g.globalAlpha *= a;
      g.fillStyle = 'rgba(255,255,255,.9)';
      g.beginPath(); g.arc(x, y, 9, 0, 6.2832); g.fill();
      g.strokeStyle = C.cop; g.lineWidth = 3;
      g.beginPath(); g.arc(x, y, 9, 0, 6.2832); g.stroke();
      g.lineWidth = 2.2; g.lineCap = 'round';
      g.beginPath(); g.moveTo(x - 4.5, y); g.lineTo(x + 4.5, y); g.moveTo(x, y - 4.5); g.lineTo(x, y + 4.5); g.stroke();
      g.restore();
    }
    function ring(g, x, y, t, col) {
      var u = t / 0.45;
      g.save();
      g.globalAlpha *= (1 - u) * 0.85;
      g.strokeStyle = col; g.lineWidth = 2;
      g.beginPath(); g.arc(x, y, 10 + 18 * K.ease.out(u), 0, 6.2832); g.stroke();
      g.restore();
    }
    function drawStack(g, x0, w, yT, nH, pH, bk, nf, busX1) {
      g.save();
      g.fillStyle = C.nFill; g.fillRect(x0, yT, w, nH);
      g.fillStyle = C.pFill; g.fillRect(x0, yT + nH, w, pH);
      g.strokeStyle = C.ink2; g.lineWidth = 1.4;
      g.strokeRect(x0 + 0.5, yT + 0.5, w - 1, nH + pH - 1);
      g.strokeStyle = C.muted; g.lineWidth = 1; g.setLineDash([5, 4]);
      g.beginPath(); g.moveTo(x0, yT + nH + 0.5); g.lineTo(x0 + w, yT + nH + 0.5); g.stroke();
      g.setLineDash([]);
      g.fillStyle = C.metal;
      g.fillRect(x0, yT + nH + pH, w, bk);
      g.strokeStyle = C.ink2; g.lineWidth = 1;
      g.strokeRect(x0 + 0.5, yT + nH + pH + 0.5, w - 1, bk - 1);
      for (var k = 0; k < nf; k++) g.fillRect(x0 + (k + 0.5) * w / nf - 5, yT - 9, 10, 9);
      g.strokeStyle = C.metal; g.lineWidth = 4; g.lineCap = 'butt';
      g.beginPath(); g.moveTo(x0 + 4, yT - 9); g.lineTo(busX1 === undefined ? x0 + w : busX1, yT - 9); g.stroke();
      g.restore();
    }
    function wireRun(g, pts) {
      g.save(); g.lineJoin = 'round'; g.lineCap = 'butt';
      g.beginPath(); g.moveTo(pts[0][0], pts[0][1]);
      for (var i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]);
      g.strokeStyle = C.wireO; g.lineWidth = 12; g.stroke();
      g.strokeStyle = C.wireI; g.lineWidth = 7; g.stroke();
      g.restore();
    }
    function dotsOn(g, pts, phase, spacing, a) {
      var segs = [], tot = 0, i;
      for (i = 0; i < pts.length - 1; i++) {
        var l = Math.abs(pts[i + 1][0] - pts[i][0]) + Math.abs(pts[i + 1][1] - pts[i][1]);
        segs.push(l); tot += l;
      }
      var p = { pts: pts, segs: segs, L: tot };
      var n = Math.max(1, Math.round(tot / spacing)), sp = tot / n;
      g.save(); g.fillStyle = C.blue;
      for (i = 0; i < n; i++) {
        var s = ((i * sp + phase) % tot + tot) % tot;
        at(p, s);
        g.globalAlpha = a * clamp(Math.min(s, tot - s) / 12, 0, 1);
        g.beginPath(); g.arc(PT.x, PT.y, 5.4, 0, 6.2832); g.fill();
      }
      g.restore();
    }
    function drawLamp(g, x, y, r, b) {
      g.save();
      if (b > 0.02) {
        g.strokeStyle = C.lamp; g.lineWidth = 2.4; g.lineCap = 'round';
        g.globalAlpha = clamp(b * 1.2, 0, 1);
        for (var i = 0; i < 8; i++) {
          var a = (i + 0.5) * Math.PI / 4;
          if (Math.abs(Math.cos(a)) < 0.2) continue;
          g.beginPath();
          g.moveTo(x + Math.cos(a) * (r + 8), y + Math.sin(a) * (r + 8));
          g.lineTo(x + Math.cos(a) * (r + 8 + 10 * b), y + Math.sin(a) * (r + 8 + 10 * b));
          g.stroke();
        }
        g.globalAlpha = 1;
      }
      g.fillStyle = C.card;
      g.beginPath(); g.arc(x, y, r, 0, 6.2832); g.fill();
      g.globalAlpha = clamp(b, 0, 1);
      g.fillStyle = C.lamp;
      g.beginPath(); g.arc(x, y, r, 0, 6.2832); g.fill();
      g.fillStyle = 'rgba(255,255,255,.35)';
      g.beginPath(); g.arc(x, y, r - 8, 0, 6.2832); g.fill();
      g.globalAlpha = 1;
      g.strokeStyle = C.ink2; g.lineWidth = 2;
      g.beginPath(); g.arc(x, y, r, 0, 6.2832); g.stroke();
      var s = r / 32;
      g.strokeStyle = b > 0.05 ? C.fil : C.grey; g.lineWidth = 3; g.lineJoin = 'round';
      g.beginPath(); g.moveTo(x, y - 22 * s);
      g.lineTo(x - 7 * s, y - 14 * s); g.lineTo(x + 7 * s, y - 6 * s); g.lineTo(x - 7 * s, y + 2 * s); g.lineTo(x + 7 * s, y + 10 * s); g.lineTo(x, y + 18 * s);
      g.lineTo(x, y + 22 * s);
      g.stroke();
      g.restore();
    }

    /* ---------- hücre sahnesi (isik / alan / devre) ---------- */
    function drawCellLabels(g) {
      txt(g, 'n tipi', CX0 - 16, YT + NH / 2 + 7, { size: 20, weight: 700, color: C.blue, align: 'right' });
      txt(g, 'p tipi', CX0 - 16, YJ + PH / 2 + 7, { size: 20, weight: 700, color: C.copText, align: 'right' });
    }

    function drawDepletion(g, a) {
      if (a <= 0.01) return;
      g.save();
      g.globalAlpha = a;
      g.fillStyle = dark ? 'rgba(255,255,255,.07)' : 'rgba(21,23,28,.07)';
      g.fillRect(CX0 + 1, YJ - 22, CW - 2, 44);
      g.strokeStyle = C.muted; g.lineWidth = 1; g.setLineDash([2, 3]);
      g.beginPath(); g.moveTo(CX0, YJ - 22.5); g.lineTo(CX1, YJ - 22.5); g.moveTo(CX0, YJ + 22.5); g.lineTo(CX1, YJ + 22.5); g.stroke();
      g.setLineDash([]);
      for (var k = 0; k < 9; k++) {
        var x = CX0 + 36 + k * 56;
        g.fillStyle = C.pFill; g.strokeStyle = C.cop; g.lineWidth = 1.6;
        g.beginPath(); g.arc(x, YJ - 11, 8, 0, 6.2832); g.fill(); g.stroke();
        g.fillStyle = C.nFill; g.strokeStyle = C.blue;
        g.beginPath(); g.arc(x + 26, YJ + 11, 8, 0, 6.2832); g.fill(); g.stroke();
        g.strokeStyle = C.copText; g.lineWidth = 1.8; g.lineCap = 'round';
        g.beginPath(); g.moveTo(x - 4, YJ - 11); g.lineTo(x + 4, YJ - 11); g.moveTo(x, YJ - 15); g.lineTo(x, YJ - 7); g.stroke();
        g.strokeStyle = C.blue;
        g.beginPath(); g.moveTo(x + 22, YJ + 11); g.lineTo(x + 30, YJ + 11); g.stroke();
      }
      g.restore();
    }

    function drawLegend(g, y) {
      var x = CX0;
      drawE(g, x + 10, y - 5, 1); txt(g, 'elektron', x + 26, y, { size: 16, color: C.ink2 });
      drawH(g, x + 140, y - 5, 1); txt(g, 'boşluk', x + 156, y, { size: 16, color: C.ink2 });
    }

    function drawScene(g) {
      var i, p, c;
      drawCellLabels(g);
      if (view === 'devre') {
        wireRun(g, [[CX1, YB], [WX, YB], [WX, LT]]);
        wireRun(g, [[CX1, YR], [WX, YR], [WX, LB]]);
      }
      drawStack(g, CX0, CW, YT, NH, PH, BK, 8, CX1);
      drawDepletion(g, ionA);

      if (fieldA > 0.01) {
        for (i = 0; i < 3; i++) K.arrow(g, CX0 + 90 + i * 170, YJ - 22, CX0 + 90 + i * 170, YJ + 24, { color: C.grey, width: 4, head: 13, alpha: fieldA });
        pill(g, 'yerleşik elektrik alanı', CX0 + 16, YJ + 78, { color: C.ink, alpha: fieldA, weight: 600, size: 17 });
        var T = 3.0, tau = (now % (T + 0.8));
        if (tau < T) {
          var u = tau / T, yy = YT + 16 + 40 * Math.sin(u * Math.PI);
          var xx = CX0 + CW * 0.72;
          drawE(g, xx, yy, fieldA);
          var near = Math.sin(u * Math.PI);
          if (near > 0.7) {
            g.save(); g.globalAlpha = (near - 0.7) / 0.3 * fieldA;
            g.strokeStyle = C.copText; g.lineWidth = 3.2; g.lineCap = 'round';
            g.beginPath(); g.moveTo(xx - 8, YJ + 22); g.lineTo(xx + 8, YJ + 38); g.moveTo(xx + 8, YJ + 22); g.lineTo(xx - 8, YJ + 38); g.stroke();
            g.restore();
          }
        }
      }

      if (view === 'devre') {
        K.arrow(g, CX1 + 190, YB - 20, CX1 + 110, YB - 20, { color: C.copText, width: 4, head: 14 });
        K.arrow(g, CX1 + 110, YR + 22, CX1 + 190, YR + 22, { color: C.copText, width: 4, head: 14 });
        K.arrow(g, WX + 58, LB + 26, WX + 58, LT - 10, { color: C.copText, width: 4, head: 14 });
        txt(g, 'akım yönü', CX1 + 150, YR + 52, { size: 18, weight: 700, color: C.copText, align: 'center' });
        drawLamp(g, WX, LY, LR, lampB);
        txt(g, 'lamba', WX - LR - 16, LY + 6, { size: 18, weight: 600, color: C.ink2, align: 'right' });
        txt(g, '≈ 0,5 V', WX + 82, LY + 10, { size: 28, mono: true, weight: 600, color: C.ink });
      }

      for (i = 0; i < cr.length; i++) {
        c = cr[i];
        var a = c.a;
        if (c.k === 'e') {
          if (c.st === 1) a *= 1 - K.smoothstep(1.9, 2.8, c.age);
          if (c.st === 2) {
            at(c.path, c.s);
            if (Math.abs(PT.x - WX) < 1 && PT.y > LT - 6 && PT.y < LB + 6) continue;
            drawE(g, PT.x, PT.y, 1);
          } else drawE(g, c.x, c.y, a);
        } else {
          if (c.st === 1) a *= view === 'devre' ? 1 - K.smoothstep(7, 9, c.age) : 1 - K.smoothstep(1.9, 2.8, c.age);
          drawH(g, c.x, c.y, a);
        }
      }
      for (i = 0; i < fl.length; i++) ring(g, fl[i].x, fl[i].y, fl[i].t, fl[i].c === 'cop' ? C.cop : C.ink);

      for (i = 0; i < ph.length; i++) {
        p = ph[i];
        if (p.st === 0) {
          packet(g, p.x, p.y, 1, p.nm, 1);
          if (view === 'isik') {
            var lab = K.num(p.nm, 0) + ' nm · ' + K.num(evOf(p.nm), 2) + ' eV';
            if (p.y < YT + 4) pill(g, lab, p.x + 16, Math.min(p.y - 4, 74), { mono: true, size: 16, color: pcol(p.nm), weight: 600 });
            else if (!p.ok) pill(g, 'enerjisi yetmez: geçer', p.x + 16, YP1 - 60, { size: 16, color: C.ink, weight: 600 });
            else pill(g, lab, p.x + 16, p.y - 12, { mono: true, size: 16, color: pcol(p.nm), weight: 600 });
          }
        } else if (p.st === 2) {
          packet(g, p.x, p.y, 1, p.nm, 1 - p.t / 0.18, 1 - p.t / 0.18);
        } else if (p.st === 3) {
          var fa = 1 - p.t / 0.9;
          packet(g, p.x, YP1 - 6, 1, p.nm, fa * 0.5, 0.5 * fa + 0.1);
          g.save(); g.globalAlpha = fa; g.strokeStyle = C.copText; g.lineWidth = 2.4; g.lineCap = 'round';
          for (var q = 0; q < 3; q++) {
            var hx = p.x - 16 + q * 16, hy = YP1 - 22 - p.t * 20 - q * 3;
            g.beginPath(); g.moveTo(hx - 5, hy); g.quadraticCurveTo(hx - 2.5, hy - 6, hx, hy); g.quadraticCurveTo(hx + 2.5, hy + 6, hx + 5, hy); g.stroke();
          }
          g.restore();
        }
      }

      drawLegend(g, VH - 22);
      if (view === 'isik') drawIsikPanel(g);
      else if (view === 'alan') drawAlanPanel(g);
    }

    function drawIsikPanel(g) {
      var x0 = 820, w = 120, yC0 = 66, yC1 = 172, yV0 = 262, yV1 = 340, pe = 80;
      g.save();
      g.fillStyle = C.nFill; g.fillRect(x0, yC0, w, yC1 - yC0);
      g.fillStyle = C.pFill; g.fillRect(x0, yV0, w, yV1 - yV0);
      g.strokeStyle = C.ink2; g.lineWidth = 1.6;
      g.strokeRect(x0 + 0.5, yC0 + 0.5, w - 1, yC1 - yC0 - 1);
      g.strokeRect(x0 + 0.5, yV0 + 0.5, w - 1, yV1 - yV0 - 1);
      g.restore();
      txt(g, 'iletim bandı', x0 + w / 2, yC0 + 28, { size: 17, weight: 700, color: C.blue, align: 'center' });
      txt(g, 'değerlik bandı', x0 + w / 2, yV1 - 24, { size: 17, weight: 700, color: C.copText, align: 'center' });
      var bx = x0 + w + 18;
      g.save(); g.strokeStyle = C.ink; g.lineWidth = 1.4;
      g.beginPath(); g.moveTo(bx - 6, yC1 + 0.5); g.lineTo(bx + 6, yC1 + 0.5); g.moveTo(bx - 6, yV0 + 0.5); g.lineTo(bx + 6, yV0 + 0.5); g.stroke();
      g.restore();
      K.arrow(g, bx, (yC1 + yV0) / 2, bx, yC1 + 1, { color: C.ink, width: 1.4, head: 7 });
      K.arrow(g, bx, (yC1 + yV0) / 2, bx, yV0 - 1, { color: C.ink, width: 1.4, head: 7 });
      txt(g, '1,12 eV', bx + 14, (yC1 + yV0) / 2 + 8, { size: 20, mono: true, weight: 600, color: C.ink });

      if (lastPh) {
        var u = clamp((now - lastPh.t) / 0.4, 0, 1);
        var cx = x0 + w / 2;
        var top = yV0 - Math.min(lastPh.E * pe, yV0 - yC0 - 8) * u;
        var col = pcol(lastPh.nm);
        if (u > 0.02) {
          K.arrow(g, cx, yV0 - 2, cx, top, { color: col, width: 4, head: 13 });
          if (lastPh.ok) {
            if (u >= 1) { drawE(g, cx + 26, top + 0, 1); drawH(g, cx - 28, yV0 + 18, 1); }
          } else if (u >= 1) {
            g.save(); g.strokeStyle = C.copText; g.lineWidth = 3.2; g.lineCap = 'round';
            g.beginPath(); g.moveTo(cx - 8, top - 18); g.lineTo(cx + 8, top - 2); g.moveTo(cx + 8, top - 18); g.lineTo(cx - 8, top - 2); g.stroke();
            g.restore();
          }
        }
        txt(g, K.num(lastPh.E, 2) + ' eV', cx, yV1 + 30, { size: 20, mono: true, weight: 600, color: col, align: 'center' });
      }
    }

    function curveY(x) {
      var u = K.smoothstep(880, 960, x);
      return 330 + (170 - 330) * u;
    }
    function drawAlanPanel(g) {
      var x0 = 770, x1 = 1060;
      g.save();
      g.beginPath(); g.moveTo(x0 + 10, 372);
      for (var x = x0 + 10; x <= x1; x += 4) g.lineTo(x, curveY(x));
      g.lineTo(x1, 372); g.closePath();
      g.fillStyle = C.gapFill; g.fill();
      g.beginPath();
      for (x = x0 + 10; x <= x1; x += 4) { if (x === x0 + 10) g.moveTo(x, curveY(x)); else g.lineTo(x, curveY(x)); }
      g.strokeStyle = C.ink2; g.lineWidth = 4; g.lineJoin = 'round'; g.stroke();
      g.restore();
      K.arrow(g, x0 + 2, 340, x0 + 2, 100, { color: C.grey, width: 2, head: 10 });
      txt(g, 'enerji', x0 + 14, 112, { size: 18, weight: 600, color: C.ink2 });
      txt(g, 'n', 830, 396, { size: 22, weight: 700, color: C.blue, align: 'center' });
      txt(g, 'p', 1010, 396, { size: 22, weight: 700, color: C.copText, align: 'center' });
      var TA = 3.4, ua = (now % TA) / TA, xa = 1030 - 230 * K.ease.sine(ua);
      drawE(g, xa, curveY(xa) - 12, 1);
      var TB = 3.0, tb = now % (TB + 0.8);
      if (tb < TB) {
        var ub = tb / TB, xb = 808 + 66 * Math.sin(ub * Math.PI);
        drawE(g, xb, curveY(xb) - 12, 1);
      }
      pill(g, 'geri çıkamaz', 790, 288, { size: 17, color: C.copText, weight: 700 });
    }

    /* ---------- seri görünümü ---------- */
    function cellGlyph(g, x, y, w, h) {
      g.fillStyle = C.nFill; g.strokeStyle = C.blue; g.lineWidth = w > 20 ? 2 : 1.2;
      g.fillRect(x, y, w, h);
      g.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
      if (w > 20) {
        g.strokeStyle = K.rgba(C.blue, 0.4); g.lineWidth = 1;
        g.beginPath();
        for (var k = 1; k < 5; k++) { g.moveTo(x + k * w / 5, y + 3); g.lineTo(x + k * w / 5, y + h - 3); }
        g.stroke();
      }
    }
    function drawSeri(g) {
      var v1 = volt1(L), i;
      var cellTxt = L > 0.97 ? '0,5' : (v1 <= 0 ? '0' : K.num(v1, 2));
      var rows = [
        { n: 1, y: 86, w: 110, gap: 0, label: '1 hücre' },
        { n: 6, y: 186, w: 70, gap: 14, label: '6 hücre' },
        { n: 36, y: 286, w: 12, gap: 4, label: '36 hücre' }
      ];
      var x0 = 60, h = 58;
      for (var r = 0; r < rows.length; r++) {
        var R = rows[r];
        var vv = trim(K.num(R.n * v1, 1));
        txt(g, R.label + ' = ' + (R.n === 1 ? cellTxt : vv) + ' V', x0, R.y - 14, { size: 22, weight: 700, color: C.ink });
        for (i = 0; i < R.n; i++) {
          var x = x0 + i * (R.w + R.gap);
          if (i > 0 && R.gap >= 8) {
            g.save(); g.strokeStyle = C.metal; g.lineWidth = 3.5;
            g.beginPath(); g.moveTo(x - R.gap, R.y + h / 2); g.lineTo(x, R.y + h / 2); g.stroke(); g.restore();
          }
          cellGlyph(g, x, R.y, R.w, h);
        }
      }
      // akım çubuğu
      var by = 388;
      txt(g, 'akım', x0, by + 17, { size: 20, weight: 700, color: C.ink });
      g.save();
      g.fillStyle = C.wireI; K.rr(g, x0 + 80, by, 360, 24, 6); g.fill();
      if (L > 0.01) { g.fillStyle = C.cop; K.rr(g, x0 + 80, by, Math.max(10, 360 * L), 24, 6); g.fill(); }
      g.strokeStyle = C.muted; g.lineWidth = 1; K.rr(g, x0 + 80.5, by + 0.5, 360, 24, 6); g.stroke();
      g.restore();
      txt(g, L < 0.03 ? 'gece: yok' : '%' + K.num(Math.round(L * 100), 0), x0 + 460, by + 19, { size: 20, mono: true, weight: 600, color: C.copText });

      // 60 hücreli panel
      var cs = 28, gp = 3, pad = 10;
      var pw = 6 * (cs + gp) - gp + pad * 2, phh = 10 * (cs + gp) - gp + pad * 2;
      var px = 860, py = 72;
      g.save();
      g.shadowColor = 'rgba(21,23,28,.2)'; g.shadowBlur = 14; g.shadowOffsetY = 4;
      g.fillStyle = C.card; K.rr(g, px, py, pw, phh, 8); g.fill();
      g.shadowColor = 'transparent';
      g.strokeStyle = C.ink2; g.lineWidth = 2; K.rr(g, px + 0.5, py + 0.5, pw - 1, phh - 1, 8); g.stroke();
      g.restore();
      for (var rr = 0; rr < 10; rr++) for (var cc = 0; cc < 6; cc++) {
        cellGlyph(g, px + pad + cc * (cs + gp), py + pad + rr * (cs + gp), cs, cs);
      }
      var vp = 60 * v1;
      txt(g, '60 hücre ≈ ' + K.num(Math.round(vp), 0) + ' V', px + pw / 2, py - 14, { size: 22, weight: 700, color: C.ink, align: 'center' });
    }

    /* ---------- LED ve güneş hücresi ---------- */
    function drawLed(g) {
      var Y0 = 172, nH = 44, pH = 110, bk = 12, w = 300;
      var xL = 130, xR = 630;
      var jy = Y0 + nH, busY = Y0 - 9, backY = Y0 + nH + pH + bk / 2;
      var i, tau;
      var bxm = 60, lxm = 1050, my = 252;

      g.save(); g.strokeStyle = C.line; g.lineWidth = 1;
      g.beginPath(); g.moveTo(552.5, 56); g.lineTo(552.5, 400); g.stroke(); g.restore();

      txt(g, 'LED: elektrik girer, ışık çıkar', xL, 56, { size: 22, weight: 700, color: C.ink });
      txt(g, 'güneş hücresi: ışık girer, elektrik çıkar', xR, 56, { size: 22, weight: 700, color: C.ink });

      wireRun(g, [[bxm, my - 32], [bxm, busY], [xL, busY]]);
      wireRun(g, [[bxm, my + 32], [bxm, backY], [xL, backY]]);
      wireRun(g, [[xR + w, busY], [lxm, busY], [lxm, my - 32]]);
      wireRun(g, [[xR + w, backY], [lxm, backY], [lxm, my + 32]]);

      g.save();
      g.fillStyle = C.card; K.rr(g, bxm - 20, my - 32, 40, 64, 6); g.fill();
      g.strokeStyle = C.ink2; g.lineWidth = 2; K.rr(g, bxm - 20, my - 32, 40, 64, 6); g.stroke();
      g.restore();
      txt(g, '−', bxm, my - 6, { size: 26, weight: 600, color: C.blue, align: 'center' });
      txt(g, '+', bxm, my + 24, { size: 26, weight: 600, color: C.copText, align: 'center' });

      drawStack(g, xL, w, Y0, nH, pH, bk, 5, xL + w);
      drawStack(g, xR, w, Y0, nH, pH, bk, 5, xR + w);

      drawLamp(g, lxm, my, 30, 0.9);

      var phs = now * 50;
      dotsOn(g, [[bxm, my - 32], [bxm, busY], [xL, busY]], phs, 30, 1);
      dotsOn(g, [[xL, backY], [bxm, backY], [bxm, my + 32]], phs, 30, 1);
      dotsOn(g, [[xR + w, busY], [lxm, busY], [lxm, my - 32]], phs, 30, 1);
      dotsOn(g, [[lxm, my + 32], [lxm, backY], [xR + w, backY]], phs, 30, 1);

      var T = 2.4, cols = [xL + 60, xL + 150, xL + 240], offs = [0, 0.8, 1.6];
      for (i = 0; i < 3; i++) {
        tau = (now + offs[i]) % T;
        var cx = cols[i];
        if (tau < 0.9) {
          var e1 = K.ease.inOut(tau / 0.9);
          var af = Math.min(1, tau / 0.15);
          drawE(g, cx - 10, (Y0 + 12) + (jy - 8 - (Y0 + 12)) * e1, af);
          drawH(g, cx + 10, (backY - 18) + (jy + 8 - (backY - 18)) * e1, af);
        } else if (tau < 1.3) ring(g, cx, jy, (tau - 0.9) * 0.45 / 0.4, C.copText);
        if (tau >= 0.9 && tau < 2.1) {
          var pu = (tau - 0.9) / 1.2;
          packet(g, cx, jy - 12 - pu * 70, -1, 650, 1 - K.smoothstep(0.55, 1, pu), 0.8);
        }
      }
      for (i = 0; i < 3; i++) {
        tau = (now + offs[i]) % T;
        var sx = cols[i] + (xR - xL);
        if (tau < 0.8) {
          var d0 = tau / 0.8;
          packet(g, sx, 108 + d0 * (jy - 6 - 108), 1, 550, 1, 0.8);
        } else {
          var k2 = tau - 0.8;
          if (k2 < 0.45) ring(g, sx, jy, k2, C.ink);
          if (k2 < 0.7) drawE(g, sx - 9, jy - 8 - (jy - 8 - (Y0 + 12)) * K.ease.out(k2 / 0.6), 1 - K.smoothstep(0.5, 0.7, k2));
          if (k2 < 1.5) drawH(g, sx + 9, jy + 8 + (backY - 18 - jy - 8) * K.ease.out(k2 / 1.4), 1 - K.smoothstep(1.2, 1.5, k2));
        }
      }
      txt(g, 'aynı p-n yapısı, ters yönde çalışır', 560, 384, { size: 22, weight: 700, color: C.copText, align: 'center' });
      drawLegend(g, VH - 14);
    }

    /* ---------- kare ---------- */
    function pickView() {
      var list = grp ? GROUPS[grp] : VIEWS, tot = 0, i;
      for (i = 0; i < list.length; i++) tot += DUR[list[i]];
      var pos = demoT % tot;
      for (i = 0; i < list.length; i++) { if (pos < DUR[list[i]]) return [list[i], pos]; pos -= DUR[list[i]]; }
      return [list[0], 0];
    }
    function frame(t, dt) {
      var g = sf.ctx;
      var d = clamp(dt, 0, 0.05);
      if (auto && !K.reducedMotion) {
        demoT += d;
        var pv = pickView(), v = pv[0], seg = pv[1];
        if (v !== view) enterView(v);
        if (v === 'seri') L = seg < 3 ? 1 : seg < 6.5 ? 1 - 0.75 * K.smoothstep(3, 6.5, seg) : 0.25 + 0.75 * K.smoothstep(6.5, 10, seg);
        else L = 1;
      }
      now += d;
      if (sceneView(view)) sim(d);
      var lt = view === 'devre' ? (L > 0.03 ? clamp(L, 0, 1) * 0.95 : 0) : 0;
      lampB += (lt - lampB) * (1 - Math.exp(-8 * d));
      var ia = view === 'alan' ? 1 : 0;
      ionA += (ia - ionA) * (1 - Math.exp(-6 * d));
      fieldA += (ia - fieldA) * (1 - Math.exp(-6 * d));

      sf.clear();
      var sc = Math.min(sf.w / VW, sf.h / VH);
      g.save();
      g.translate((sf.w - VW * sc) / 2, (sf.h - VH * sc) / 2);
      g.scale(sc, sc);
      if (sceneView(view)) drawScene(g);
      else if (view === 'seri') drawSeri(g);
      else drawLed(g);
      tag(g, 'ölçekli değil · basitleştirilmiş model', VW - 6, 24);
      g.restore();
    }


    resetState();

    return {
      reset: function () { resetState(); },
      frame: frame,
      set: function (key, val) {
        if (key === 'group' && GROUPS[val]) {
          grp = val; auto = !K.reducedMotion; demoT = 0;
          if (GROUPS[val].indexOf(view) < 0) enterView(GROUPS[val][0]);
        } else if (key === 'view' && VIEWS.indexOf(val) >= 0) {
          auto = false;
          if (val !== view) enterView(val);
        } else if (key === 'light') {
          auto = false;
          var n = parseFloat(val);
          if (isFinite(n)) L = clamp(n > 1 ? n / 100 : n, 0, 1);
        }
      },
      read: function (key) {
        if (key === 'view') return view;
        if (key === 'explain') return EXPLAIN[view];
        if (key === 'light') return K.num(L, 2);
        if (key === 'volt') {
          if (view === 'seri') return L < 0.005 ? '0 V' : '≈ ' + K.num(Math.round(60 * volt1(L)), 0) + ' V';
          return L < 0.005 && view === 'devre' ? '0 V' : '≈ 0,5 V';
        }
        if (key === 'numbers') return NUMBERS[view];
        return '';
      },
      resize: function () { sf.resize(); },
      dispose: function () { sf.dispose(); }
    };
  });
})();
