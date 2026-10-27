/* Köklerden Göklere · Builder AD: güneş hücresi
 * solar-lab · 1120×380 · 2B (düz, "müze çizimi" görünümü)
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
  var DEMO = 8;
  var GAP = 1.12;                       // silisyumun yasak aralığı, eV
  var HC = 1240;                        // eV·nm

  var EXPLAIN = {
    isik: 'Foton enerjisi 1,12 eV’tan büyükse silisyumda elektron-boşluk çifti açar; daha az enerjili foton geçer ya da ısıya döner.',
    alan: 'Birleşimdeki yerleşik alan elektronu n tarafına, boşluğu p tarafına iter; elektron geri geçemez. Yükler ayrılınca gerilim doğar.',
    devre: 'Elektron n kontağından kabloya çıkar, lambada iş yapar, arka kontaktan p tarafına dönüp bir boşlukla birleşir.',
    seri: 'Seri bağlı hücrelerin gerilimi toplanır, akım aynı kalır. Işık artınca akım artar, gerilim neredeyse aynı kalır; gece akım yok.',
    led: 'LED’de elektrik girer, ışık çıkar; güneş hücresinde ışık girer, elektrik çıkar. Yapı aynı p-n birleşimi, yön ters.'
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
    var CX0 = 150, CW = 350, CX1 = CX0 + CW;      // hücre
    var YT = 98, NH = 44, PH = 136, BK = 12;      // üst, n kalınlığı, p kalınlığı, arka kontak
    var YJ = YT + NH;                              // birleşim (142)
    var YP1 = YJ + PH;                             // p alt kenarı (278)
    var YB = YT - 9;                               // üst bara (89)
    var YR = YP1 + 6;                              // arka kontak orta çizgisi (284)
    var WX = 640, LY = 194, LR = 32;               // lamba
    var LT = LY - LR, LB = LY + LR;
    var PS = 175;                                  // foton hızı (px/s)

    var ISIK_SEQ = [[450, 420], [1500, 232], [650, 330], [1000, 440], [550, 272]];
    var ALAN_SEQ = [[550], [650], [450]];
    var DEVRE_SEQ = [[450], [550], [650], [1000]];

    /* ---------- durum ---------- */
    var rng = K.rng(9137);
    var view, auto, L, now, nextSpawn, idx, ph, cr, fl, lastPh, lampB, ionA, fieldA;
    function sceneView(v) { return v === 'isik' || v === 'alan' || v === 'devre'; }

    function resetState() {
      rng = K.rng(9137);
      view = 'isik'; auto = !K.reducedMotion; L = 1; now = 0; idx = 0;
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
      if (view === 'alan') ay = YJ + (rng() - 0.5) * 12;
      else if (nm < 500) ay = 106 + rng() * 10;
      else if (nm < 600) ay = 120 + rng() * 12;
      else if (nm < 800) ay = 190 + rng() * 30;
      else ay = 240 + rng() * 22;
      ph.push({ x: x, y: 34, nm: nm, ok: ok, ay: ay, st: 0, t: 0, flag: false });
    }

    function makePair(x, y) {
      var fast = view === 'devre';
      cr.push({ k: 'e', x: x, y: y, st: 0, v: fast ? 78 : 46, ph: rng() * 6.28, a: 0, age: 0 });
      cr.push({ k: 'h', x: x + 4, y: y, st: 0, v: fast ? 60 : 38, ph: rng() * 6.28, a: 0, age: 0, stack: rng() * 14 });
      fl.push({ x: x, y: y, t: 0, c: 'ink' });
    }

    function makePath(x) {
      var x2 = CX0 + 34 + rng() * (CW - 68);
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
          addPhoton(e[1] || (190 + ((idx * 97) % 280)), e[0]);
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
      g.strokeStyle = col; g.fillStyle = col; g.lineWidth = 2.4; g.lineJoin = 'round'; g.lineCap = 'round';
      g.beginPath();
      for (var s = 0; s <= len; s += 2) {
        var u = s / len;
        var yy = hy - dir * 8 - dir * (len - s);
        var xx = x + 4.4 * Math.sin(u * Math.PI) * Math.sin(s / lam * 6.2832);
        if (s === 0) g.moveTo(xx, yy); else g.lineTo(xx, yy);
      }
      g.stroke();
      g.beginPath();
      g.moveTo(x, hy); g.lineTo(x - 5.5, hy - dir * 10); g.lineTo(x + 5.5, hy - dir * 10);
      g.closePath(); g.fill();
      g.restore();
    }
    function drawE(g, x, y, a) {
      g.save(); g.globalAlpha *= a;
      g.fillStyle = C.blue;
      g.beginPath(); g.arc(x, y, 6.4, 0, 6.2832); g.fill();
      g.strokeStyle = '#FFFFFF'; g.lineWidth = 1.8; g.lineCap = 'round';
      g.beginPath(); g.moveTo(x - 3, y); g.lineTo(x + 3, y); g.stroke();
      g.restore();
    }
    function drawH(g, x, y, a) {
      g.save(); g.globalAlpha *= a;
      g.fillStyle = 'rgba(255,255,255,.9)';
      g.beginPath(); g.arc(x, y, 6.2, 0, 6.2832); g.fill();
      g.strokeStyle = C.cop; g.lineWidth = 2.4;
      g.beginPath(); g.arc(x, y, 6.2, 0, 6.2832); g.stroke();
      g.lineWidth = 1.8; g.lineCap = 'round';
      g.beginPath(); g.moveTo(x - 3, y); g.lineTo(x + 3, y); g.moveTo(x, y - 3); g.lineTo(x, y + 3); g.stroke();
      g.restore();
    }
    function ring(g, x, y, t, col) {
      var u = t / 0.45;
      g.save();
      g.globalAlpha *= (1 - u) * 0.85;
      g.strokeStyle = col; g.lineWidth = 2;
      g.beginPath(); g.arc(x, y, 7 + 12 * K.ease.out(u), 0, 6.2832); g.stroke();
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
      for (var k = 0; k < nf; k++) g.fillRect(x0 + (k + 0.5) * w / nf - 4, yT - 8, 8, 8);
      g.strokeStyle = C.metal; g.lineWidth = 3; g.lineCap = 'butt';
      g.beginPath(); g.moveTo(x0 + 4, yT - 9); g.lineTo(busX1 === undefined ? x0 + w : busX1, yT - 9); g.stroke();
      g.restore();
    }
    function wireRun(g, pts) {
      g.save(); g.lineJoin = 'round'; g.lineCap = 'butt';
      g.beginPath(); g.moveTo(pts[0][0], pts[0][1]);
      for (var i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]);
      g.strokeStyle = C.wireO; g.lineWidth = 9; g.stroke();
      g.strokeStyle = C.wireI; g.lineWidth = 5; g.stroke();
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
        g.beginPath(); g.arc(PT.x, PT.y, 4.2, 0, 6.2832); g.fill();
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

    /* ---------- büyük hücre sahnesi (isik / alan / devre) ---------- */
    function drawCellLabels(g) {
      txt(g, 'ön kontak', CX0 - 10, YB + 5, { size: 13, color: C.muted, align: 'right' });
      txt(g, 'n tipi', CX0 - 10, YT + 26, { size: 15, weight: 600, color: C.blue, align: 'right' });
      txt(g, 'birleşim', CX0 - 10, YJ + 5, { size: 14, weight: 600, color: C.copText, align: 'right' });
      txt(g, 'p tipi', CX0 - 10, YJ + 76, { size: 15, weight: 600, color: C.copText, align: 'right' });
      txt(g, 'arka kontak', CX0 - 10, YR + 5, { size: 13, color: C.muted, align: 'right' });
    }

    function drawDepletion(g, a) {
      if (a <= 0.01) return;
      g.save();
      g.globalAlpha = a;
      g.fillStyle = dark ? 'rgba(255,255,255,.07)' : 'rgba(21,23,28,.07)';
      g.fillRect(CX0 + 1, YJ - 16, CW - 2, 32);
      g.strokeStyle = C.muted; g.lineWidth = 1; g.setLineDash([2, 3]);
      g.beginPath(); g.moveTo(CX0, YJ - 16.5); g.lineTo(CX1, YJ - 16.5); g.moveTo(CX0, YJ + 16.5); g.lineTo(CX1, YJ + 16.5); g.stroke();
      g.setLineDash([]);
      for (var k = 0; k < 8; k++) {
        var x = CX0 + 30 + k * 41.5;
        g.fillStyle = C.pFill; g.strokeStyle = C.cop; g.lineWidth = 1.4;
        g.beginPath(); g.arc(x, YJ - 8, 6, 0, 6.2832); g.fill(); g.stroke();
        g.fillStyle = C.nFill; g.strokeStyle = C.blue;
        g.beginPath(); g.arc(x + 20, YJ + 8, 6, 0, 6.2832); g.fill(); g.stroke();
        g.strokeStyle = C.copText; g.lineWidth = 1.6; g.lineCap = 'round';
        g.beginPath(); g.moveTo(x - 3, YJ - 8); g.lineTo(x + 3, YJ - 8); g.moveTo(x, YJ - 11); g.lineTo(x, YJ - 5); g.stroke();
        g.strokeStyle = C.blue;
        g.beginPath(); g.moveTo(x + 17, YJ + 8); g.lineTo(x + 23, YJ + 8); g.stroke();
      }
      g.restore();
    }

    function drawScene(g) {
      var i, p, c;
      drawCellLabels(g);
      if (view === 'devre') {
        wireRun(g, [[CX1, YB], [WX, YB], [WX, LT]]);
        wireRun(g, [[CX1, YR], [WX, YR], [WX, LB]]);
      }
      drawStack(g, CX0, CW, YT, NH, PH, BK, 6, CX1);
      drawDepletion(g, ionA);

      // alan oklari
      if (fieldA > 0.01) {
        for (i = 0; i < 3; i++) K.arrow(g, 214 + i * 116, YJ - 14, 214 + i * 116, YJ + 15, { color: C.grey, width: 3, head: 10, alpha: fieldA });
        pill(g, 'yerleşik elektrik alanı: n tarafından p tarafına', CX0 + 12, YJ + 64, { color: C.ink2, alpha: fieldA, weight: 500 });
        // geri geçemeyen elektron
        var T = 3.0, tau = (now % (T + 0.8));
        if (tau < T) {
          var u = tau / T, yy = YT + 12 + 26 * Math.sin(u * Math.PI);
          var xx = 400;
          drawE(g, xx, yy, fieldA);
          var near = Math.sin(u * Math.PI);
          if (near > 0.7) {
            g.save(); g.globalAlpha = (near - 0.7) / 0.3 * fieldA;
            g.strokeStyle = C.copText; g.lineWidth = 2.6; g.lineCap = 'round';
            g.beginPath(); g.moveTo(xx - 6, YJ + 22 - 6); g.lineTo(xx + 6, YJ + 22 + 6); g.moveTo(xx + 6, YJ + 22 - 6); g.lineTo(xx - 6, YJ + 22 + 6); g.stroke();
            g.restore();
            pill(g, 'geri geçemez', xx + 14, YJ + 28, { color: C.copText, alpha: (near - 0.7) / 0.3 * fieldA, weight: 600 });
          }
        }
      }

      // devre: kablo üstü ok ve noktalar, lamba
      if (view === 'devre') {
        var ph0 = now * 135;
        K.arrow(g, 600, YB - 15, 548, YB - 15, { color: C.copText, width: 3, head: 11 });
        K.arrow(g, 548, YR + 17, 600, YR + 17, { color: C.copText, width: 3, head: 11 });
        K.arrow(g, WX + 52, LB + 24, WX + 52, LT - 8, { color: C.copText, width: 3, head: 11 });
        txt(g, 'akım yönü (bakır ok): artıdan eksiye', 548, YR + 38, { size: 13, weight: 500, color: C.copText });
        drawLamp(g, WX, LY, LR, lampB);
        txt(g, 'lamba', WX - 42, LY - 2, { size: 14, weight: 500, color: C.muted, align: 'right' });
        txt(g, '(ya da motor)', WX - 42, LY + 16, { size: 13, color: C.muted, align: 'right' });
      }

      // taşıyıcılar
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

      // fotonlar
      for (i = 0; i < ph.length; i++) {
        p = ph[i];
        if (p.st === 0) {
          packet(g, p.x, p.y, 1, p.nm, 1);
          if (view === 'isik') {
            var lab = K.num(p.nm, 0) + ' nm · ' + K.num(evOf(p.nm), 2) + ' eV';
            if (p.y < YT + 4) pill(g, lab, p.x + 14, Math.min(p.y - 4, 70), { mono: true, size: 13, color: pcol(p.nm), weight: 600 });
            else if (!p.ok) pill(g, 'çok az enerjili foton: geçer / ısıya dönüşür', p.x + 14, 220, { size: 13, color: C.ink, weight: 600 });
            else pill(g, lab, p.x + 14, p.y - 10, { mono: true, size: 13, color: pcol(p.nm), weight: 600 });
          }
        } else if (p.st === 2) {
          packet(g, p.x, p.y, 1, p.nm, 1 - p.t / 0.18, 1 - p.t / 0.18);
        } else if (p.st === 3) {
          var fa = 1 - p.t / 0.9;
          packet(g, p.x, YP1 - 6, 1, p.nm, fa * 0.5, 0.5 * fa + 0.1);
          g.save(); g.globalAlpha = fa; g.strokeStyle = C.copText; g.lineWidth = 2; g.lineCap = 'round';
          for (var q = 0; q < 3; q++) {
            var hx = p.x - 14 + q * 14, hy = YP1 - 20 - p.t * 18 - q * 3;
            g.beginPath(); g.moveTo(hx - 4, hy); g.quadraticCurveTo(hx - 2, hy - 5, hx, hy); g.quadraticCurveTo(hx + 2, hy + 5, hx + 4, hy); g.stroke();
          }
          g.restore();
          if (view === 'isik') pill(g, 'ısı', p.x + 24, YP1 - 24, { size: 13, color: C.copText, alpha: fa, weight: 600 });
        }
      }

      // gösterge
      var ly = 352;
      drawE(g, CX0 + 6, ly - 5, 1); txt(g, 'elektron', CX0 + 18, ly, { size: 13, color: C.ink2 });
      drawH(g, CX0 + 98, ly - 5, 1); txt(g, 'boşluk (elektronun bıraktığı yer)', CX0 + 110, ly, { size: 13, color: C.ink2 });
      txt(g, view === 'devre' ? 'n tarafı eksi uç, p tarafı artı uç gibi davranır' : 'kesit; katman kalınlıkları ölçekli değil', CX0 + 360, ly, { size: 13, color: C.muted });

      if (view === 'isik') drawIsikPanel(g);
      else if (view === 'alan') drawAlanPanel(g);
      else drawDevrePanel(g);
    }

    function drawIsikPanel(g) {
      var x0 = 620, w = 96, yC0 = 62, yC1 = 190, yV0 = 262, yV1 = 312, pe = 64;
      txt(g, 'enerji düzeyleri', x0, 46, { size: 13, mono: true, weight: 500, color: C.muted });
      g.save();
      g.fillStyle = C.nFill; g.fillRect(x0, yC0, w, yC1 - yC0);
      g.fillStyle = C.pFill; g.fillRect(x0, yV0, w, yV1 - yV0);
      g.strokeStyle = C.ink2; g.lineWidth = 1.4;
      g.strokeRect(x0 + 0.5, yC0 + 0.5, w - 1, yC1 - yC0 - 1);
      g.strokeRect(x0 + 0.5, yV0 + 0.5, w - 1, yV1 - yV0 - 1);
      g.restore();
      txt(g, 'iletim bandı', x0 + 8, yC0 + 20, { size: 13, weight: 600, color: C.blue });
      txt(g, 'değerlik bandı', x0 + 8, yV1 - 10, { size: 13, weight: 600, color: C.copText });
      // aralık ayracı
      var bx = x0 + w + 14;
      g.save(); g.strokeStyle = C.ink; g.lineWidth = 1.2;
      g.beginPath(); g.moveTo(bx - 5, yC1 + 0.5); g.lineTo(bx + 5, yC1 + 0.5); g.moveTo(bx - 5, yV0 + 0.5); g.lineTo(bx + 5, yV0 + 0.5); g.stroke();
      g.restore();
      K.arrow(g, bx, (yC1 + yV0) / 2, bx, yC1 + 1, { color: C.ink, width: 1.2, head: 6 });
      K.arrow(g, bx, (yC1 + yV0) / 2, bx, yV0 - 1, { color: C.ink, width: 1.2, head: 6 });
      txt(g, 'yasak aralık', bx + 12, (yC1 + yV0) / 2 - 6, { size: 13, color: C.muted });
      txt(g, '1,12 eV', bx + 12, (yC1 + yV0) / 2 + 14, { size: 16, mono: true, weight: 600, color: C.ink });

      var tx = 850, ty = 64;
      if (lastPh) {
        var u = clamp((now - lastPh.t) / 0.4, 0, 1);
        var cx = x0 + w / 2;
        var top = yV0 - Math.min(lastPh.E * pe, yV0 - yC0 - 8) * u;
        var col = pcol(lastPh.nm);
        if (u > 0.02) {
          K.arrow(g, cx, yV0 - 2, cx, top, { color: col, width: 3, head: 11 });
          if (lastPh.ok) {
            if (u >= 1) { drawE(g, cx + 20, top + 0, 1); drawH(g, cx - 22, yV0 + 14, 1); }
          } else if (u >= 1) {
            g.save(); g.strokeStyle = C.copText; g.lineWidth = 2.6; g.lineCap = 'round';
            g.beginPath(); g.moveTo(cx - 6, top - 14); g.lineTo(cx + 6, top - 2); g.moveTo(cx + 6, top - 14); g.lineTo(cx - 6, top - 2); g.stroke();
            g.restore();
            txt(g, 'yetmez', cx - 12, top - 4, { size: 13, weight: 600, color: C.copText, align: 'right' });
          }
        }
        var Es = K.num(lastPh.E, 2);
        txt(g, '1240 ÷ ' + K.num(lastPh.nm, 0) + ' nm = ' + Es + ' eV', tx, ty, { size: 15, mono: true, weight: 600, color: col });
        var msg = lastPh.ok
          ? Es + ' eV ≥ 1,12 eV: yeter. Elektron iletim bandına sıçrar, ardında bir boşluk bırakır.'
          : Es + ' eV < 1,12 eV: yetmez. Foton geçer ya da ısıya döner.';
        wrap(g, msg, tx, ty + 24, 246, 14, 19, C.ink2, 400);
      }
      var yy = 176;
      txt(g, 'silisyum için eşik', tx, yy, { size: 13, color: C.muted });
      txt(g, '1240 ÷ 1.100 nm ≈ 1,12 eV', tx, yy + 22, { size: 15, mono: true, weight: 600, color: C.copText });
      wrap(g, '1.100 nm’den uzun dalga boyunda foton yetmez. Daha kısa dalga boyunda fazla enerji ısıya gider.', tx, yy + 46, 246, 14, 19, C.ink2, 400);
    }

    function curveY(x) {
      var u = K.smoothstep(690, 770, x);
      return 250 + (136 - 250) * u;
    }
    function drawAlanPanel(g) {
      var x0 = 606, x1 = 836;
      // zemin
      g.save();
      g.beginPath(); g.moveTo(x0 + 10, 296);
      for (var x = x0 + 10; x <= x1; x += 4) g.lineTo(x, curveY(x));
      g.lineTo(x1, 296); g.closePath();
      g.fillStyle = C.gapFill; g.fill();
      g.beginPath();
      for (x = x0 + 10; x <= x1; x += 4) { if (x === x0 + 10) g.moveTo(x, curveY(x)); else g.lineTo(x, curveY(x)); }
      g.strokeStyle = C.ink2; g.lineWidth = 3; g.lineJoin = 'round'; g.stroke();
      g.restore();
      txt(g, 'elektron için enerji tepesi', x0, 50, { size: 13, mono: true, weight: 500, color: C.muted });
      K.arrow(g, x0 + 2, 262, x0 + 2, 84, { color: C.grey, width: 1.6, head: 8 });
      txt(g, 'enerji', x0 + 12, 98, { size: 13, color: C.muted });
      txt(g, 'n tarafı', 648, 316, { size: 14, weight: 600, color: C.blue, align: 'center' });
      txt(g, 'p tarafı', 800, 316, { size: 14, weight: 600, color: C.copText, align: 'center' });
      // top A: p'den n'ye iner
      var TA = 3.4, ua = (now % TA) / TA, xa = 812 - 160 * K.ease.sine(ua);
      drawE(g, xa, curveY(xa) - 8, 1);
      // top B: n tarafında, tepeye çıkamaz
      var TB = 3.0, tb = now % (TB + 0.8);
      if (tb < TB) {
        var ub = tb / TB, xb = 642 + 52 * Math.sin(ub * Math.PI);
        drawE(g, xb, curveY(xb) - 8, 1);
      }
      pill(g, 'geri çıkamaz', 712, 276, { size: 13, color: C.copText, weight: 600 });

      var tx = 868, w = 228, y = 64;
      txt(g, 'Yerleşik elektrik alanı', tx, y, { size: 15, weight: 600, color: C.copText });
      y = wrap(g, 'Birleşimin iki yanında hareketsiz iyonlar kalır: n tarafında artı, p tarafında eksi.', tx, y + 22, w, 14, 19, C.ink2, 400);
      y = wrap(g, 'Aralarında n’den p’ye bakan bir alan doğar.', tx, y + 6, w, 14, 19, C.ink2, 400);
      y = wrap(g, 'Elektron alana ters yönde, n tarafına itilir. Boşluk alan yönünde, p tarafına.', tx, y + 6, w, 14, 19, C.ink2, 400);
      wrap(g, 'Serbest elektron p tarafına geri geçemez: ışıkla ayrılan çift yeniden birleşmez.', tx, y + 6, w, 14, 19, C.ink, 600);
    }

    function drawDevrePanel(g) {
      var x0 = 756, w = 340;
      txt(g, 'açık devre gerilimi (yük bağlı değilken)', x0, 52, { size: 13, color: C.muted });
      txt(g, '≈ 0,5-0,6 V', x0, 86, { size: 26, mono: true, weight: 600, color: C.ink });
      wrap(g, 'Yük bağlıyken hücre yaklaşık 0,5 V verir. Gerilimi büyük ölçüde malzeme belirler; ışık artınca artan şey akımdır.', x0, 110, w, 14, 19, C.ink2, 400);
      // akım çubuğu
      var by = 192;
      txt(g, 'akım', x0, by + 12, { size: 14, weight: 600, color: C.ink2 });
      g.save();
      g.fillStyle = C.wireI; K.rr(g, x0 + 52, by, 200, 16, 4); g.fill();
      if (L > 0.01) { g.fillStyle = C.cop; K.rr(g, x0 + 52, by, Math.max(8, 200 * L), 16, 4); g.fill(); }
      g.strokeStyle = C.muted; g.lineWidth = 1; K.rr(g, x0 + 52.5, by + 0.5, 200, 16, 4); g.stroke();
      g.restore();
      txt(g, L < 0.03 ? 'gece: yok' : '%' + K.num(Math.round(L * 100), 0), x0 + 264, by + 13, { size: 14, mono: true, weight: 600, color: C.copText });
      var y = 242;
      var steps = [
        ['1', 'Foton elektron-boşluk çifti açar.'],
        ['2', 'Alan elektronu n tarafına, boşluğu p tarafına iter.'],
        ['3', 'Elektron kablodan lambaya, oradan p tarafına döner ve bir boşlukla birleşir.']
      ];
      for (var i = 0; i < steps.length; i++) {
        txt(g, steps[i][0], x0, y, { size: 14, mono: true, weight: 600, color: C.copText });
        y = wrap(g, steps[i][1], x0 + 20, y, w - 20, 14, 18, C.ink2, 400) + 3;
      }
    }

    /* ---------- seri görünümü ---------- */
    function cellGlyph(g, x, y, w, h) {
      g.fillStyle = C.nFill; g.strokeStyle = C.blue; g.lineWidth = w > 20 ? 1.6 : 1;
      g.fillRect(x, y, w, h);
      g.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
      if (w > 20) {
        g.strokeStyle = K.rgba(C.blue, 0.4); g.lineWidth = 1;
        g.beginPath();
        for (var k = 1; k < 5; k++) { g.moveTo(x + k * w / 5, y + 2); g.lineTo(x + k * w / 5, y + h - 2); }
        g.stroke();
      }
    }
    function drawSeri(g) {
      var v1 = volt1(L), i;
      var cellTxt = L > 0.97 ? '0,5' : (v1 <= 0 ? '0' : K.num(v1, 2));
      var rows = [
        { n: 1, y: 76, w: 60, gap: 0, label: '1 hücre' },
        { n: 6, y: 136, w: 60, gap: 12, label: '6 hücre' },
        { n: 36, y: 196, w: 9, gap: 3, label: '36 hücre' }
      ];
      var x0 = 130, h = 30;
      for (var r = 0; r < rows.length; r++) {
        var R = rows[r];
        txt(g, R.label, 24, R.y + 20, { size: 15, weight: 600, color: C.ink });
        for (i = 0; i < R.n; i++) {
          var x = x0 + i * (R.w + R.gap);
          if (i > 0 && R.gap >= 8) {
            g.save(); g.strokeStyle = C.metal; g.lineWidth = 2.5;
            g.beginPath(); g.moveTo(x - R.gap, R.y + h / 2); g.lineTo(x, R.y + h / 2); g.stroke(); g.restore();
          }
          cellGlyph(g, x, R.y, R.w, h);
        }
        var xe = x0 + R.n * R.w + (R.n - 1) * R.gap;
        txt(g, '−', x0 - 9, R.y + 22, { size: 20, weight: 600, color: C.blue, align: 'right' });
        txt(g, '+', xe + 9, R.y + 22, { size: 20, weight: 600, color: C.copText });
        var vt = R.n === 1 ? (cellTxt + ' V') : (R.n + ' × ' + cellTxt + ' V = ' + trim(K.num(R.n * v1, 1)) + ' V');
        txt(g, vt, 606, R.y + 22, { size: 16, mono: true, weight: 600, color: C.copText });
      }
      txt(g, 'seri: gerilimler toplanır, akım aynı', 24, 268, { size: 16, weight: 600, color: C.copText });
      txt(g, 'ışık artınca akım artar, gerilim neredeyse aynı kalır; gece akım yok', 24, 298, { size: 15, weight: 500, color: C.ink });
      txt(g, 'Işık yarıya inerse akım da yaklaşık yarıya iner; gerilim ise çok az düşer.', 24, 326, { size: 14, color: C.muted });

      // 60 hücreli panel
      var px = 818, py = 60, cs = 20, gp = 2, pad = 8;
      var pw = 6 * (cs + gp) - gp + pad * 2, phh = 10 * (cs + gp) - gp + pad * 2;
      txt(g, '60 hücreli panel', px, py - 10, { size: 14, weight: 600, color: C.ink });
      g.save();
      g.fillStyle = C.card; K.rr(g, px, py, pw, phh, 6); g.fill();
      g.strokeStyle = C.ink2; g.lineWidth = 1.6; K.rr(g, px + 0.5, py + 0.5, pw - 1, phh - 1, 6); g.stroke();
      g.restore();
      for (var rr = 0; rr < 10; rr++) for (var cc = 0; cc < 6; cc++) {
        cellGlyph(g, px + pad + cc * (cs + gp), py + pad + rr * (cs + gp), cs, cs);
      }
      var vp = 60 * v1;
      txt(g, '60 × ' + cellTxt + ' V ≈ ' + K.num(Math.round(vp), 0) + ' V', px, py + phh + 22, { size: 15, mono: true, weight: 600, color: C.copText });
      txt(g, '(yaklaşık)', px, py + phh + 40, { size: 13, color: C.muted });

      // çubuklar
      var bx1 = 994, bx2 = 1056, bw = 30, bt = 104, bh = 150;
      txt(g, 'panel', bx1, 62, { size: 13, mono: true, weight: 500, color: C.muted });
      var meters = [
        { x: bx1, f: L, col: C.cop, v: '%' + K.num(Math.round(L * 100), 0), n: 'akım' },
        { x: bx2, f: clamp(vp / 32, 0, 1), col: C.blue, v: K.num(vp, 1) + ' V', n: 'gerilim' }
      ];
      for (i = 0; i < 2; i++) {
        var m = meters[i];
        g.save();
        g.fillStyle = C.wireI; K.rr(g, m.x, bt, bw, bh, 4); g.fill();
        if (m.f > 0.005) { g.fillStyle = m.col; K.rr(g, m.x, bt + bh * (1 - m.f), bw, Math.max(6, bh * m.f), 4); g.fill(); }
        g.strokeStyle = C.muted; g.lineWidth = 1; K.rr(g, m.x + 0.5, bt + 0.5, bw, bh, 4); g.stroke();
        g.restore();
        txt(g, m.v, m.x + bw / 2, bt - 10, { size: 14, mono: true, weight: 600, color: C.ink, align: 'center' });
        txt(g, m.n, m.x + bw / 2, bt + bh + 20, { size: 14, weight: 600, color: C.ink2, align: 'center' });
      }
      if (L < 0.03) txt(g, 'gece: akım yok', bx1, bt + bh + 44, { size: 14, weight: 600, color: C.copText });
    }

    /* ---------- LED ve güneş hücresi ---------- */
    function drawLed(g) {
      var Y0 = 134, nH = 32, pH = 76, bk = 10, w = 260;
      var xL = 150, xR = 700, jy = Y0 + nH, bot = Y0 + nH + pH + bk;
      var busY = Y0 - 9, backY = Y0 + nH + pH + bk / 2;
      var i, tau;

      // bölme
      g.save(); g.strokeStyle = C.line; g.lineWidth = 1;
      g.beginPath(); g.moveTo(560.5, 52); g.lineTo(560.5, 300); g.stroke(); g.restore();

      txt(g, 'LED', 40, 64, { size: 20, weight: 600, color: C.ink });
      txt(g, 'elektrik girer, ışık çıkar', 96, 64, { size: 15, weight: 500, color: C.copText });
      txt(g, 'Güneş hücresi', 590, 64, { size: 20, weight: 600, color: C.ink });
      txt(g, 'ışık girer, elektrik çıkar', 742, 64, { size: 15, weight: 500, color: C.copText });

      // teller
      wireRun(g, [[70, 168], [70, busY], [xL, busY]]);
      wireRun(g, [[70, 232], [70, backY], [xL, backY]]);
      wireRun(g, [[xR + w, busY], [1040, busY], [1040, 168]]);
      wireRun(g, [[xR + w, backY], [1040, backY], [1040, 220]]);

      // pil
      g.save();
      g.fillStyle = C.card; K.rr(g, 52, 168, 36, 64, 6); g.fill();
      g.strokeStyle = C.ink2; g.lineWidth = 1.8; K.rr(g, 52, 168, 36, 64, 6); g.stroke();
      g.restore();
      txt(g, '−', 70, 194, { size: 24, weight: 600, color: C.blue, align: 'center' });
      txt(g, '+', 70, 224, { size: 24, weight: 600, color: C.copText, align: 'center' });
      txt(g, 'pil', 70, 274, { size: 14, color: C.muted, align: 'center' });

      drawStack(g, xL, w, Y0, nH, pH, bk, 4, xL + w);
      drawStack(g, xR, w, Y0, nH, pH, bk, 4, xR + w);
      var xs = [xL, xR];
      for (i = 0; i < 2; i++) {
        txt(g, 'n tipi', xs[i] + 10, Y0 + 21, { size: 14, weight: 600, color: C.blue });
        txt(g, 'p tipi', xs[i] + 10, jy + 24, { size: 14, weight: 600, color: C.copText });
        txt(g, 'birleşim', xs[i] + w - 8, jy + 18, { size: 13, weight: 500, color: C.muted, align: 'right' });
      }

      // lamba
      drawLamp(g, 1040, 194, 26, 0.9);
      txt(g, 'lamba', 1040, 262, { size: 14, color: C.muted, align: 'center' });

      // tel elektronları
      var phs = now * 50;
      dotsOn(g, [[70, 168], [70, busY], [xL, busY]], phs, 28, 1);
      dotsOn(g, [[xL, backY], [70, backY], [70, 232]], phs, 28, 1);
      dotsOn(g, [[xR + w, busY], [1040, busY], [1040, 168]], phs, 28, 1);
      dotsOn(g, [[1040, 220], [1040, backY], [xR + w, backY]], phs, 28, 1);

      // LED hareketi: elektron ve boşluk birleşir, foton çıkar
      var T = 2.4, cols = [xL + 74, xL + 128, xL + 182], offs = [0, 0.8, 1.6];
      for (i = 0; i < 3; i++) {
        tau = (now + offs[i]) % T;
        var cx = cols[i];
        if (tau < 0.9) {
          var e1 = K.ease.inOut(tau / 0.9);
          var af = Math.min(1, tau / 0.15);
          drawE(g, cx - 7, (Y0 + 8) + (jy - 6 - (Y0 + 8)) * e1, af);
          drawH(g, cx + 7, (backY - 14) + (jy + 6 - (backY - 14)) * e1, af);
        } else if (tau < 1.3) ring(g, cx, jy, (tau - 0.9) * 0.45 / 0.4, C.copText);
        if (tau >= 0.9 && tau < 2.1) {
          var pu = (tau - 0.9) / 1.2;
          packet(g, cx, jy - 8 - pu * 78, -1, 650, 1 - K.smoothstep(0.55, 1, pu), 0.8);
        }
      }
      // güneş hücresi hareketi
      for (i = 0; i < 3; i++) {
        tau = (now + offs[i]) % T;
        var sx = cols[i] + (xR - xL);
        if (tau < 0.8) {
          var d0 = tau / 0.8;
          packet(g, sx, 86 + d0 * (jy - 4 - 86), 1, 550, 1, 0.8);
        } else {
          var k2 = tau - 0.8;
          if (k2 < 0.45) ring(g, sx, jy, k2, C.ink);
          if (k2 < 0.7) drawE(g, sx - 6, jy - 6 - (jy - 6 - (Y0 + 8)) * K.ease.out(k2 / 0.6), 1 - K.smoothstep(0.5, 0.7, k2));
          if (k2 < 1.5) drawH(g, sx + 6, jy + 6 + (backY - 14 - jy - 6) * K.ease.out(k2 / 1.4), 1 - K.smoothstep(1.2, 1.5, k2));
        }
      }

      // notlar
      wrap(g, 'elektron ve boşluk birleşir, enerji foton olarak çıkar', 40, 296, 480, 14, 19, C.ink2, 400);
      wrap(g, 'foton çift açar, alan ayırır, elektronlar lambadan geçer', 590, 296, 480, 14, 19, C.ink2, 400);
      txt(g, 'aynı p-n yapısı, ters yönde çalışır', 560, 332, { size: 17, weight: 600, color: C.ink, align: 'center' });
      txt(g, 'LED’de de elektriğin bir kısmı ısıya gider', 40, 358, { size: 14, color: C.muted });
      txt(g, 'ticari paneller ışığın yaklaşık %15-22’sini elektriğe çevirir', 590, 358, { size: 14, weight: 600, color: C.copText });
    }

    /* ---------- kare ---------- */
    function frame(t, dt) {
      var g = sf.ctx;
      var d = clamp(dt, 0, 0.05);
      if (auto && !K.reducedMotion) {
        var v = VIEWS[Math.floor(Math.max(0, t) / DEMO) % VIEWS.length];
        var seg = Math.max(0, t) % DEMO;
        if (v !== view) enterView(v);
        if (v === 'seri') L = seg < 2.5 ? 1 : seg < 5.2 ? 1 - 0.75 * K.smoothstep(2.5, 5.2, seg) : 0.25 + 0.75 * K.smoothstep(5.2, 7.8, seg);
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
      txt(g, HEAD[view], 24, 27, { size: 14, weight: 600, color: C.ink2 });
      tag(g, 'ölçekli değil · basitleştirilmiş model', sf.w - 24, 27);
      if (sceneView(view)) drawScene(g);
      else if (view === 'seri') drawSeri(g);
      else drawLed(g);
    }

    resetState();

    return {
      reset: function () { resetState(); },
      frame: frame,
      set: function (key, val) {
        if (key === 'view' && VIEWS.indexOf(val) >= 0) {
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
