/* Köklerden Göklere · Builder Y: mıknatıs ve elektrik
 * magnet-lab · 1120×380 · 2B, düz "müze çizimi" biçimi
 * Altı görünüm: miknatis, tel, bobin, indukleme, jenerator, motor.
 * Sözleşme: kg-viz.js. Hareket frame(t, dt) içinden sürülür, rastgelelik yok.
 */
(function () {
  'use strict';
  var K = window.KGViz;
  if (!K) return;
  var P = K.palette;
  var clamp = K.clamp;
  var PI = Math.PI, TAU = Math.PI * 2;

  var VIEWS = ['miknatis', 'tel', 'bobin', 'indukleme', 'jenerator', 'motor'];
  var DEMO = 8;

  var EXPLAIN = {
    miknatis: 'Mıknatısın çevresindeki manyetik alan kuzey kutbundan çıkıp güney kutbuna girer; pusula iğneleri bu alanı gösterir.',
    tel: 'Akım geçen telin çevresinde halkalar biçiminde manyetik alan oluşur; pusula iğnesi akım geçince sapar (Oersted, 1820).',
    bobin: 'Teli sarınca her sarımın alanı üst üste biner ve bobin çubuk mıknatıs gibi olur. Sarım sayısı ve demir çekirdek gücü artırır.',
    indukleme: 'Mıknatıs bobine girip çıkarken bobinden geçen alan değişir ve bobinde gerilim oluşur; mıknatıs duruyorsa gerilim yoktur (Faraday, 1831).',
    jenerator: 'Mıknatıs döndükçe bobinden geçen alan sürekli yön değiştirir; gerilim artı ile eksi arasında gidip gelir: alternatif akım.',
    motor: 'Mıknatısın alanındaki telden akım geçince tel itilir ve halka döner. Komütatör akımı her yarım turda çevirip dönüşü sürdürür.'
  };

  /* ---------- alan çizgileri: iki kutuplu (±hl) model, N sağda ---------- */
  function dip(px, py, hl, out) {
    var ax = px - hl, bx = px + hl;
    var ra = Math.sqrt(ax * ax + py * py) || 1e-3, rb = Math.sqrt(bx * bx + py * py) || 1e-3;
    var ra3 = ra * ra * ra, rb3 = rb * rb * rb;
    var x = ax / ra3 - bx / rb3, y = py / ra3 - py / rb3;
    var m = Math.sqrt(x * x + y * y) || 1e-9;
    out[0] = x / m; out[1] = y / m;
  }
  function trace(hl, angs, rx, ry, r0) {
    var groups = [], o = [0, 0], ds = 3;
    for (var a = 0; a < angs.length; a++) {
      var ar = angs[a] * PI / 180;
      var x = hl + r0 * Math.cos(ar), y = r0 * Math.sin(ar);
      var pts = [[x, y]], reached = false;
      for (var n = 0; n < 1400; n++) {
        dip(x, y, hl, o);
        var mx = x + o[0] * ds * 0.5, my = y + o[1] * ds * 0.5;
        dip(mx, my, hl, o);
        x += o[0] * ds; y += o[1] * ds;
        pts.push([x, y]);
        var dx = x + hl;
        if (dx * dx + y * y < r0 * r0) { reached = true; break; }
        if (Math.abs(x) > rx || Math.abs(y) > ry) break;
      }
      var k = Math.min(Math.floor(pts.length / 2), 48);
      if (k > pts.length - 2) k = pts.length - 2;
      var g = [{ pts: pts, ai: Math.max(0, k) }];
      if (!reached) {
        var rev = [];
        for (var i = pts.length - 1; i >= 0; i--) rev.push([-pts[i][0], pts[i][1]]);
        g.push({ pts: rev, ai: Math.max(0, Math.min(rev.length - 2, rev.length - 1 - k - 1)) });
      }
      groups.push(g);
    }
    return groups;
  }
  var ORDER = [35, -35, 70, -70, 10, -10, 55, -55, 82, -82];

  /* ---------- yol yardımcıları ---------- */
  function prepPath(pts) {
    var segs = [], L = 0;
    for (var i = 0; i < pts.length - 1; i++) {
      var dx = pts[i + 1][0] - pts[i][0], dy = pts[i + 1][1] - pts[i][1];
      var l = Math.sqrt(dx * dx + dy * dy);
      segs.push(l); L += l;
    }
    return { pts: pts, segs: segs, L: L };
  }
  var PT = [0, 0, 0];
  function atPath(p, s) {
    for (var i = 0; i < p.segs.length; i++) {
      if (s <= p.segs[i] || i === p.segs.length - 1) {
        var a = p.pts[i], b = p.pts[i + 1], u = p.segs[i] ? clamp(s / p.segs[i], 0, 1) : 0;
        PT[0] = a[0] + (b[0] - a[0]) * u;
        PT[1] = a[1] + (b[1] - a[1]) * u;
        PT[2] = (a[2] || 0) + ((b[2] || 0) - (a[2] || 0)) * u;
        return PT;
      }
      s -= p.segs[i];
    }
    return PT;
  }
  /* sarmal: kenar görünüşte sinüs eğrisi; z > 0 öndeki sarım. Uçlar alt noktada. */
  function helix(x0, x1, cy, ry, N, per) {
    var pts = [], n = N * per;
    for (var i = 0; i <= n; i++) {
      var ph = -PI / 2 + TAU * N * i / n;
      pts.push([x0 + (x1 - x0) * i / n, cy - ry * Math.sin(ph), Math.cos(ph)]);
    }
    return pts;
  }
  function wrapAng(a) { while (a > PI) a -= TAU; while (a < -PI) a += TAU; return a; }

  K.register('magnet-lab', function (el, opts) {
    opts = opts || {};
    var dark = (opts.theme || 'light') === 'dark';
    var sf = K.surface(el);
    var C = {
      ink: dark ? P.onNight : P.ink,
      ink2: dark ? '#C9CFDA' : P.ink2,
      muted: dark ? P.onNightMuted : P.muted,
      line: dark ? P.nightLine : P.line,
      line2: dark ? '#303849' : P.line2,
      blue: dark ? P.blueLight : P.blue,
      cop: dark ? P.copperLight : P.copperFill,
      copText: dark ? P.copperLight : P.copper,
      grey: dark ? '#9AA3B2' : '#666C78',
      wireO: dark ? '#4A5160' : '#B8BCC6',
      wireI: dark ? '#222836' : '#E6E6E0',
      card: dark ? '#161B26' : '#FFFFFF',
      bg: dark ? P.night : P.paper,
      iron: dark ? '#6B7384' : '#C9CCD1',
      red: '#B8392B',
      white: dark ? '#EEF0F3' : '#FFFFFF'
    };

    /* ---------- önceden hesaplanan alan çizgileri ---------- */
    var F_BAR = trace(70, [0, 18, -18, 38, -38, 58, -58, 76, -76, 88, -88], 300, 150, 9);
    var F_COIL = trace(105, ORDER, 330, 150, 12);
    var F_MOVE = trace(55, [30, -30, 62, -62, 84, -84], 230, 120, 9);
    var F_GEN = trace(62, [30, -30, 62, -62, 84, -84], 200, 120, 9);
    var HELIX = {};
    function getHelix(x0, x1, cy, ry, N) {
      var key = [x0, x1, cy, ry, N].join('_');
      if (!HELIX[key]) HELIX[key] = helix(x0, x1, cy, ry, N, 28);
      return HELIX[key];
    }

    /* ---------- durum ---------- */
    var view, auto, vStart, tNow, vt;
    var turns, core, coreA, speed, curManual, cur, swAng;
    var theta, thM, indStage, indTimer, indProg, mx, phiPrev, volt, mAng, firstInd;
    var nTel = [], nMag = [], clips = [], dotPh, i0;
    var CLIP_N = 6;
    var BOB = { x0: 230, x1: 440, cy: 130, ry: 40, yb: 312, fl: 294 };

    function buildNeedles() {
      var i, a;
      nMag = [];
      var cx = 300, cy = 172;
      for (i = 0; i < 16; i++) {
        a = i * TAU / 16 + 0.2;
        nMag.push({ x: cx + 215 * Math.cos(a), y: cy + 100 * Math.sin(a), a: -PI / 2, w: 0 });
      }
      nMag.push({ x: cx - 135, y: cy, a: -PI / 2, w: 0 });
      nMag.push({ x: cx + 135, y: cy, a: -PI / 2, w: 0 });
      nTel = [];
      var rings = [[40, 8, 0.4], [74, 12, 0.1], [108, 16, 0.3]];
      for (i = 0; i < rings.length; i++) {
        for (var j = 0; j < rings[i][1]; j++) {
          a = rings[i][2] + j * TAU / rings[i][1];
          nTel.push({ r: rings[i][0], ang: a, x: 290 + rings[i][0] * Math.cos(a), y: 172 + rings[i][0] * Math.sin(a), a: -PI / 2, w: 0 });
        }
      }
    }
    function buildClips() {
      clips = [];
      for (var i = 0; i < CLIP_N; i++) {
        clips.push({ x: BOB.x1 + 40 + i * 13, y: BOB.fl - 7, v: 0, rot: PI / 2 + (i % 2 ? 0.12 : -0.1), att: false });
      }
    }
    function enterView(v, t, isAuto) {
      view = v;
      vStart = isAuto ? Math.floor(t / DEMO) * DEMO : t;
      indStage = 0; indTimer = 0.5; indProg = 0; mx = 0; phiPrev = null; volt = 0;
    }
    function resetState() {
      view = 'miknatis'; auto = true; vStart = 0; tNow = 0; vt = 0;
      turns = 3; core = 0; coreA = 0; speed = 1; curManual = null; cur = 0; swAng = -0.9;
      theta = 0; thM = 0.5; mAng = 0; dotPh = 0; firstInd = true;
      indStage = 0; indTimer = 0.5; indProg = 0; mx = 0; phiPrev = null; volt = 0;
      buildNeedles(); buildClips();
      if (K.reducedMotion) { view = 'miknatis'; }
    }
    resetState();

    function sVal() {
      var tbl = core ? { 1: 6, 3: 12, 6: 18 } : { 1: 1, 3: 3, 6: 6 };
      return tbl[turns];
    }
    function clipCount() { return Math.round(sVal() / 3); }
    function fmtV(v) {
      if (Math.abs(v) < 0.05) return '0,0';
      return K.num(v, 1);
    }

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
      return yy;
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
    function head(g, s) { txt(g, s, 24, 29, { size: 17, weight: 600, color: C.ink }); }
    function headHead(g, x, y, s) { txt(g, s, x, y, { size: 15, weight: 600, color: C.ink }); }
    function arrowHead(g, x, y, ang, size, color, alpha) {
      g.save();
      if (alpha !== undefined) g.globalAlpha *= alpha;
      g.fillStyle = color;
      g.beginPath();
      g.moveTo(x, y);
      g.lineTo(x - Math.cos(ang - 0.42) * size, y - Math.sin(ang - 0.42) * size);
      g.lineTo(x - Math.cos(ang + 0.42) * size, y - Math.sin(ang + 0.42) * size);
      g.closePath(); g.fill();
      g.restore();
    }
    function drawLines(g, set, count, ox, oy, rot, alpha, lw) {
      g.save();
      g.translate(ox, oy); g.rotate(rot);
      g.strokeStyle = C.grey; g.fillStyle = C.grey; g.lineWidth = lw; g.lineJoin = 'round';
      g.globalAlpha = alpha;
      var n = Math.min(count, set.length);
      for (var i = 0; i < n; i++) {
        for (var q = 0; q < set[i].length; q++) {
          var L = set[i][q], p = L.pts;
          g.beginPath(); g.moveTo(p[0][0], p[0][1]);
          for (var j = 1; j < p.length; j++) g.lineTo(p[j][0], p[j][1]);
          g.stroke();
          var a = p[L.ai], b = p[L.ai + 1];
          if (a && b) arrowHead(g, a[0] + (b[0] - a[0]) * 0.5, a[1] + (b[1] - a[1]) * 0.5, Math.atan2(b[1] - a[1], b[0] - a[0]), 7.5, C.grey);
        }
      }
      g.restore();
    }
    function drawMagnet(g, cx, cy, hl, hh, rot, flip) {
      g.save();
      g.translate(cx, cy); g.rotate(rot);
      var nc = flip ? C.blue : C.cop, sc = flip ? C.cop : C.blue;
      g.save();
      K.rr(g, -hl, -hh, hl * 2, hh * 2, 3); g.clip();
      g.fillStyle = sc; g.fillRect(-hl, -hh, hl, hh * 2);
      g.fillStyle = nc; g.fillRect(0, -hh, hl, hh * 2);
      g.restore();
      g.strokeStyle = C.ink; g.lineWidth = 1.5;
      K.rr(g, -hl + 0.5, -hh + 0.5, hl * 2 - 1, hh * 2 - 1, 3); g.stroke();
      g.restore();
      var lx = [flip ? 'S' : 'N', flip ? 'N' : 'S'];
      for (var i = 0; i < 2; i++) {
        var px = (i === 0 ? 1 : -1) * hl / 2;
        var ca = Math.cos(rot), sa = Math.sin(rot);
        txt(g, lx[i], cx + px * ca, cy + px * sa + 6, { size: Math.min(18, hh * 1.05), weight: 700, color: '#FFFFFF', align: 'center' });
      }
    }
    function needle(g, x, y, a, L) {
      g.save();
      g.translate(x, y); g.rotate(a);
      g.fillStyle = C.red;
      g.beginPath(); g.moveTo(L, 0); g.lineTo(0, -3.6); g.lineTo(0, 3.6); g.closePath(); g.fill();
      g.fillStyle = C.white; g.strokeStyle = C.grey; g.lineWidth = 1;
      g.beginPath(); g.moveTo(-L, 0); g.lineTo(0, -3.6); g.lineTo(0, 3.6); g.closePath(); g.fill(); g.stroke();
      g.fillStyle = C.ink;
      g.beginPath(); g.arc(0, 0, 1.8, 0, TAU); g.fill();
      g.restore();
    }
    function stepNeedle(n, target, d) {
      var da = wrapAng(target - n.a);
      n.w += (60 * da - 7 * n.w) * d;
      n.a += n.w * d;
    }
    function wire(g, pts) {
      g.save();
      g.lineJoin = 'round'; g.lineCap = 'butt';
      g.beginPath(); g.moveTo(pts[0][0], pts[0][1]);
      for (var i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]);
      g.strokeStyle = C.wireO; g.lineWidth = 9; g.stroke();
      g.strokeStyle = C.wireI; g.lineWidth = 5; g.stroke();
      g.restore();
    }
    function coilStrands(g, pts, front) {
      g.save();
      g.lineCap = 'round'; g.lineJoin = 'round';
      var run = [];
      function flush() {
        if (run.length < 2) { run = []; return; }
        g.beginPath(); g.moveTo(run[0][0], run[0][1]);
        for (var k = 1; k < run.length; k++) g.lineTo(run[k][0], run[k][1]);
        g.globalAlpha = front ? 1 : 0.4;
        g.strokeStyle = C.copText; g.lineWidth = front ? 8 : 6; g.stroke();
        g.strokeStyle = C.cop; g.lineWidth = front ? 5 : 3.5; g.stroke();
        run = [];
      }
      for (var i = 0; i < pts.length; i++) {
        var isF = pts[i][2] >= -0.0001;
        if (isF === front) run.push(pts[i]);
        else { if (run.length) { run.push(pts[i]); flush(); } }
      }
      flush();
      g.restore();
    }
    function dotsOn(g, path, ph, alpha, sp, rad) {
      if (alpha <= 0.02) return;
      var n = Math.max(2, Math.round(path.L / sp)), s2 = path.L / n;
      g.save(); g.fillStyle = C.cop;
      for (var i = 0; i < n; i++) {
        var s = (((i * s2 + ph) % path.L) + path.L) % path.L;
        atPath(path, s);
        var fade = clamp(Math.min(s, path.L - s) / 10, 0, 1) * alpha;
        g.globalAlpha = fade * (PT[2] < 0 ? 0.45 : 1);
        g.beginPath(); g.arc(PT[0], PT[1], rad || 3.6, 0, TAU); g.fill();
        g.strokeStyle = C.white; g.lineWidth = 1; g.globalAlpha = fade * (PT[2] < 0 ? 0.3 : 0.8); g.stroke();
      }
      g.restore();
    }
    function badge(g, x, y, s, col, a) {
      g.save(); g.globalAlpha *= a;
      g.fillStyle = col;
      g.beginPath(); g.arc(x, y, 11, 0, TAU); g.fill();
      g.restore();
      txt(g, s, x, y + 5.5, { size: 15, weight: 700, color: '#FFFFFF', align: 'center', alpha: a });
    }
    function symbolIO(g, x, y, r, out, col) {
      g.save();
      g.fillStyle = col;
      g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
      g.strokeStyle = '#FFFFFF'; g.fillStyle = '#FFFFFF'; g.lineWidth = 2; g.lineCap = 'round';
      if (out) { g.beginPath(); g.arc(x, y, r * 0.3, 0, TAU); g.fill(); }
      else {
        var d = r * 0.42;
        g.beginPath(); g.moveTo(x - d, y - d); g.lineTo(x + d, y + d); g.moveTo(x + d, y - d); g.lineTo(x - d, y + d); g.stroke();
      }
      g.restore();
    }
    function clipShape(g, x, y, rot, a) {
      g.save();
      g.translate(x, y); g.rotate(rot - PI / 2 * 0);
      g.strokeStyle = C.grey; g.lineWidth = 1.7; g.lineJoin = 'round';
      K.rr(g, -6, -12, 12, 24, 6); g.stroke();
      K.rr(g, -3, -6, 6, 15, 3); g.stroke();
      g.restore();
    }

    /* ---------- görünümler ---------- */
    function drawMiknatis(g, d) {
      head(g, 'Mıknatıs ve manyetik alan');
      var cx = 300, cy = 172, hl = 70, hh = 21;
      g.save(); g.beginPath(); g.rect(20, 40, 560, 262); g.clip();
      drawLines(g, F_BAR, 99, cx, cy, 0, 0.8, 1.2);
      g.restore();
      // pusulalar
      var o = [0, 0];
      for (var i = 0; i < nMag.length; i++) {
        var n = nMag[i];
        dip(n.x - cx, n.y - cy, hl, o);
        stepNeedle(n, Math.atan2(o[1], o[0]), d);
        needle(g, n.x, n.y, n.a, 11);
      }
      drawMagnet(g, cx, cy, hl, hh, 0, false);
      txt(g, 'kuzey', cx + hl / 2, cy + hh + 18, { size: 13, color: C.copText, align: 'center', weight: 600 });
      txt(g, 'güney', cx - hl / 2, cy + hh + 18, { size: 13, color: C.blue, align: 'center', weight: 600 });
      txt(g, 'manyetik alan: kuzeyden güneye çizilir', 24, 322, { size: 15, weight: 600, color: C.ink });
      txt(g, 'kırmızı uç: iğnenin kuzeyi gösteren ucu', 580, 322, { size: 13, color: C.muted, align: 'right' });

      // sağ panel
      g.save(); g.strokeStyle = C.line2; g.lineWidth = 1;
      g.beginPath(); g.moveTo(596.5, 46); g.lineTo(596.5, 318); g.stroke(); g.restore();
      headHead(g, 622, 61, 'aynı kutuplar iter, farklı kutuplar çeker');
      var rows = [{ y: 138, attract: true, l1: 'farklı kutuplar', l2: 'birbirini çeker' },
                  { y: 250, attract: false, l1: 'aynı kutuplar', l2: 'birbirini iter' }];
      var ph = 0.5 - 0.5 * Math.cos(tNow * 1.5);
      for (var r = 0; r < 2; r++) {
        var R = rows[r];
        var gap = R.attract ? 90 - 66 * ph : 24 + 66 * ph;
        var xm = 900, w2 = 40, h2 = 17;
        var xl = xm - gap / 2 - w2, xr = xm + gap / 2 + w2;
        drawMagnet(g, xl, R.y, w2, h2, 0, false);
        drawMagnet(g, xr, R.y, w2, h2, 0, !R.attract ? true : false);
        var ay = R.y - 34;
        if (R.attract) {
          K.arrow(g, xl - 6, ay, xl + 30, ay, { color: C.ink2, width: 2, head: 9, dash: [5, 4] });
          K.arrow(g, xr + 6, ay, xr - 30, ay, { color: C.ink2, width: 2, head: 9, dash: [5, 4] });
        } else {
          K.arrow(g, xl + 6, ay, xl - 30, ay, { color: C.ink2, width: 2, head: 9, dash: [5, 4] });
          K.arrow(g, xr - 6, ay, xr + 30, ay, { color: C.ink2, width: 2, head: 9, dash: [5, 4] });
        }
        txt(g, R.l1, 622, R.y - 3, { size: 14, weight: 500, color: C.ink2 });
        txt(g, R.l2, 622, R.y + 16, { size: 14, weight: 600, color: C.copText });
      }
      txt(g, 'kesik oklar: kuvvetin yönü', 1090, 320, { size: 13, color: C.muted, align: 'right' });
    }

    function drawTel(g, d) {
      head(g, 'Akım manyetik alan oluşturur');
      var cx = 290, cy = 172;
      var on = cur;
      // halkalar
      var radii = [40, 74, 108];
      g.save();
      g.lineWidth = 1.3;
      for (var i = 0; i < radii.length; i++) {
        g.strokeStyle = C.grey; g.globalAlpha = 0.15 + 0.75 * on;
        g.setLineDash(on > 0.5 ? [] : [3, 5]);
        g.beginPath(); g.arc(cx, cy, radii[i], 0, TAU); g.stroke();
        g.setLineDash([]);
        for (var k = 0; k < 2; k++) {
          var th = (k ? 2.2 : -0.75) + i * 0.5;
          var px = cx + radii[i] * Math.cos(th), py = cy + radii[i] * Math.sin(th);
          arrowHead(g, px, py, Math.atan2(-Math.cos(th), Math.sin(th)), 8, C.grey, 0.15 + 0.85 * on);
        }
      }
      g.restore();
      // iğneler
      for (var j = 0; j < nTel.length; j++) {
        var n = nTel[j], th2 = n.ang, k2 = 5 * 40 / n.r * on;
        var vx = Math.sin(th2) * k2, vy = -Math.cos(th2) * k2 - 1;
        stepNeedle(n, Math.atan2(vy, vx), d);
        needle(g, n.x, n.y, n.a, 10);
      }
      // tel kesiti
      g.save();
      g.fillStyle = on > 0.5 ? C.cop : C.grey;
      g.beginPath(); g.arc(cx, cy, 15, 0, TAU); g.fill();
      g.strokeStyle = C.ink; g.lineWidth = 1.5; g.stroke();
      g.restore();
      if (on > 0.5) { g.save(); g.fillStyle = '#FFFFFF'; g.beginPath(); g.arc(cx, cy, 4.5, 0, TAU); g.fill(); g.restore(); }
      // etiketler
      var pill = on > 0.5 ? 'akım var' : 'akım yok';
      txt(g, pill, 24, 56, { size: 15, mono: true, weight: 600, color: on > 0.5 ? C.copText : C.muted });
      txt(g, 'üstten bakış: akım size doğru', 24, 76, { size: 13, color: C.muted });
      txt(g, 'akım yok: iğneler aynı yöne bakar (Dünya’nın alanı)', 24, 304, { size: 14, color: C.ink2 });
      txt(g, 'akım var: iğneler telin çevresinde dizilir', 24, 322, { size: 14, color: C.ink2, weight: 600 });

      // sağ: yandan görünüş
      g.save(); g.strokeStyle = C.line2; g.lineWidth = 1;
      g.beginPath(); g.moveTo(596.5, 46); g.lineTo(596.5, 318); g.stroke(); g.restore();
      var wx = 730;
      wire(g, [[wx, 62], [wx, 296]]);
      txt(g, '−', wx, 56, { size: 20, weight: 600, color: C.blue, align: 'center' });
      txt(g, '+', wx, 318, { size: 20, weight: 600, color: C.copText, align: 'center' });
      var wpath = prepPath([[wx, 296], [wx, 62]]);
      dotsOn(g, wpath, dotPh, on > 0.3 ? on : 0, 28, 3.6);
      var cys = [110, 175, 240];
      for (var q = 0; q < 3; q++) {
        g.save();
        g.lineWidth = 1.4; g.strokeStyle = C.grey;
        g.globalAlpha = 0.15 + 0.8 * on;
        g.setLineDash([4, 4]);
        g.beginPath(); g.ellipse(wx, cys[q], 62, 17, 0, PI, TAU); g.stroke();
        g.setLineDash([]);
        g.beginPath(); g.ellipse(wx, cys[q], 62, 17, 0, 0, PI); g.stroke();
        g.restore();
        arrowHead(g, wx + 30, cys[q] + 17 * Math.sqrt(1 - 900 / 3844) + 0.5, -0.15, 9, C.grey, 0.15 + 0.85 * on);
        arrowHead(g, wx - 30, cys[q] - 17 * Math.sqrt(1 - 900 / 3844), PI - 0.15, 9, C.grey, (0.15 + 0.85 * on) * 0.5);
      }
      // sağ el kuralı
      var rx = 850;
      txt(g, 'SAĞ EL KURALI', rx, 92, { size: 13, mono: true, weight: 600, color: C.copText });
      txt(g, 'başparmak: akım yönü', rx, 116, { size: 15, color: C.ink, weight: 500 });
      txt(g, 'dört parmak: alan yönü', rx, 138, { size: 15, color: C.ink, weight: 500 });
      K.arrow(g, rx + 8, 188, rx + 8, 154, { color: C.copText, width: 2.4, head: 9 });
      txt(g, 'akım', rx + 22, 176, { size: 13, color: C.copText });
      g.save(); g.strokeStyle = C.grey; g.lineWidth = 1.6; g.lineCap = 'round';
      g.beginPath(); g.ellipse(rx + 8, 205, 38, 9, 0, 0.1, PI - 0.1); g.stroke(); g.restore();
      arrowHead(g, rx + 8 + 38 * Math.cos(0.12), 205 + 9 * Math.sin(0.12), -1.35, 8, C.grey);
      txt(g, 'alan', rx + 56, 212, { size: 13, color: C.grey });
      wrap(g, 'Oersted, 1820: akım geçirilen telin yanındaki pusula iğnesi saptı.', rx, 258, 245, 14, 18, C.ink2, 400);
    }

    function drawBobin(g, d) {
      head(g, 'Bobin: elektromıknatıs');
      var b = BOB, x0 = b.x0, x1 = b.x1, cy = b.cy, ry = b.ry, yb = b.yb;
      var hp = getHelix(x0, x1, cy, ry, turns);
      var sv = sVal(), on = cur;
      var nl = sv <= 1 ? 2 : sv <= 3 ? 4 : sv <= 6 ? 6 : sv <= 12 ? 8 : 10;
      g.save(); g.beginPath(); g.rect(20, 40, 620, 256); g.clip();
      drawLines(g, F_COIL, Math.round(nl * on), (x0 + x1) / 2, cy, 0, 0.75, 1.2);
      if (on > 0.05) {
        g.save(); g.globalAlpha = on;
        for (var i = -1; i <= 1; i++) {
          var yy = cy + i * 14;
          g.strokeStyle = C.grey; g.lineWidth = 1.2;
          g.beginPath(); g.moveTo(x1 - 6, yy); g.lineTo(x0 + 6, yy); g.stroke();
          arrowHead(g, (x0 + x1) / 2 - 4, yy, PI, 7.5, C.grey);
          arrowHead(g, (x0 + x1) / 2 + 60, yy, PI, 7.5, C.grey);
        }
        g.restore();
      }
      g.restore();
      // devre telleri
      var bx = (x0 + x1) / 2, xs0 = x0 + 40, xs1 = x0 + 90;
      wire(g, [[x0, cy + ry], [x0, yb], [xs0, yb]]);
      wire(g, [[xs1, yb], [bx - 10, yb]]);
      wire(g, [[bx + 10, yb], [x1, yb], [x1, cy + ry]]);
      // pil
      g.save(); g.fillStyle = C.bg; g.fillRect(bx - 12, yb - 17, 24, 34); g.restore();
      g.save(); g.strokeStyle = C.ink; g.lineWidth = 2.4;
      g.beginPath(); g.moveTo(bx - 5, yb - 15); g.lineTo(bx - 5, yb + 15); g.stroke();
      g.lineWidth = 4.2; g.beginPath(); g.moveTo(bx + 5, yb - 8); g.lineTo(bx + 5, yb + 8); g.stroke(); g.restore();
      txt(g, '+', bx - 12, yb - 19, { size: 15, weight: 600, color: C.copText, align: 'center' });
      txt(g, '−', bx + 12, yb - 19, { size: 15, weight: 600, color: C.blue, align: 'center' });
      // anahtar
      g.save();
      g.fillStyle = C.bg; g.strokeStyle = C.ink2; g.lineWidth = 2;
      [xs0, xs1].forEach(function (x) { g.beginPath(); g.arc(x, yb, 4.5, 0, TAU); g.fill(); g.stroke(); });
      g.strokeStyle = C.ink; g.lineWidth = 4; g.lineCap = 'round';
      g.beginPath(); g.moveTo(xs0, yb);
      g.lineTo(xs0 + 50 * Math.cos(swAng), yb + 50 * Math.sin(swAng)); g.stroke();
      g.restore();
      txt(g, 'anahtar', (xs0 + xs1) / 2, yb + 22, { size: 13, color: C.muted, align: 'center' });
      // demir çekirdek ve bobin
      coilStrands(g, hp, false);
      if (coreA > 0.02) {
        g.save(); g.globalAlpha = coreA;
        g.fillStyle = C.iron; g.strokeStyle = C.grey; g.lineWidth = 1.4;
        K.rr(g, x0 - 16, cy - 24, x1 - x0 + 32, 48, 4); g.fill(); g.stroke();
        g.strokeStyle = C.grey; g.globalAlpha = coreA * 0.5; g.lineWidth = 1;
        for (var h = x0 - 8; h < x1 + 12; h += 12) { g.beginPath(); g.moveTo(h, cy + 22); g.lineTo(h + 12, cy - 22); g.stroke(); }
        g.restore();
        txt(g, 'demir çekirdek', (x0 + x1) / 2, cy - ry - 14, { size: 14, weight: 500, color: C.ink2, align: 'center', alpha: coreA });
      }
      coilStrands(g, hp, true);
      // akım noktaları
      var pth = [[bx - 14, yb, 0], [x0, yb, 0], [x0, cy + ry, 0]];
      for (var q = 0; q < hp.length; q++) pth.push(hp[q]);
      pth.push([x1, cy + ry, 0], [x1, yb, 0], [bx + 14, yb, 0]);
      dotsOn(g, prepPath(pth), dotPh, on > 0.3 ? on : 0, 30, 3.6);
      // kutup rozetleri
      badge(g, x0 - 28, cy, 'N', C.cop, on);
      badge(g, x1 + 28, cy, 'S', C.blue, on);
      // ataşlar
      g.save(); g.strokeStyle = C.line2; g.lineWidth = 1.5;
      g.beginPath(); g.moveTo(x1 + 10, b.fl + 0.5); g.lineTo(x1 + 120, b.fl + 0.5); g.stroke(); g.restore();
      for (var c = 0; c < CLIP_N; c++) clipShape(g, clips[c].x, clips[c].y, clips[c].rot - (clips[c].att ? 0 : 0), 1);
      txt(g, 'ataşlar', x1 + 66, b.fl + 18, { size: 13, color: C.muted, align: 'center' });
      txt(g, 'akım ' + (on > 0.5 ? 'var' : 'yok'), 24, 56, { size: 15, mono: true, weight: 600, color: on > 0.5 ? C.copText : C.muted });

      // sağ: güç
      var X = 690;
      g.save(); g.strokeStyle = C.line2; g.lineWidth = 1;
      g.beginPath(); g.moveTo(662.5, 46); g.lineTo(662.5, 318); g.stroke(); g.restore();
      txt(g, 'mıknatıs gücü', X, 66, { size: 15, weight: 600, color: C.ink });
      var bw = 400, by = 78;
      g.save();
      g.fillStyle = C.wireI; K.rr(g, X, by, bw, 16, 4); g.fill();
      var fr = clamp(sv / 18, 0, 1) * on;
      if (fr > 0.004) { g.fillStyle = C.copText; K.rr(g, X, by, Math.max(8, bw * fr), 16, 4); g.fill(); }
      g.strokeStyle = C.muted; g.lineWidth = 1; K.rr(g, X + 0.5, by + 0.5, bw, 16, 4); g.stroke();
      g.restore();
      txt(g, 'sarım sayısı: ' + turns, X, 124, { size: 15, mono: true, weight: 500, color: C.ink2 });
      txt(g, 'demir çekirdek: ' + (core ? 'var' : 'yok'), X + 190, 124, { size: 15, mono: true, weight: 500, color: C.ink2 });
      txt(g, readStrength(), X, 156, { size: 20, mono: true, weight: 600, color: C.copText });
      var yy = wrap(g, 'Her sarım kendi alanını üretir; sarımlar sıklaştıkça bu alanlar üst üste biner.', X, 190, bw, 14.5, 19, C.ink2, 400);
      yy = wrap(g, 'Bobinin içinde alan çizgileri aynı yöne gider, dışarıda bir çubuk mıknatıs gibi dağılır.', X, yy + 24, bw, 14.5, 19, C.ink2, 400);
      wrap(g, 'Demir çekirdek alanı kat kat güçlendirir.', X, yy + 24, bw, 14.5, 19, C.ink2, 400);
      txt(g, 'elektromıknatıs: akımı kesince mıknatıslık biter', X, 318, { size: 15, weight: 600, color: C.copText });
    }

    function drawMeter(g, bx, by, bw, bh, defl, label) {
      g.save();
      g.fillStyle = C.card; K.rr(g, bx + 0.5, by + 0.5, bw, bh, 10); g.fill();
      g.strokeStyle = C.line2; g.lineWidth = 1.2; g.stroke();
      g.restore();
      var px = bx + bw / 2, py = by + bh - 54, R = 112;
      var A0 = -PI / 2 - 0.87, A1 = -PI / 2 + 0.87;
      g.save();
      g.strokeStyle = C.ink2; g.lineWidth = 1.6;
      g.beginPath(); g.arc(px, py, R, A0, A1); g.stroke();
      for (var i = -5; i <= 5; i++) {
        var a = -PI / 2 + i * 0.87 / 5, big = (i % 5 === 0);
        g.beginPath(); g.moveTo(px + Math.cos(a) * (R - (big ? 14 : 8)), py + Math.sin(a) * (R - (big ? 14 : 8)));
        g.lineTo(px + Math.cos(a) * R, py + Math.sin(a) * R); g.lineWidth = big ? 2 : 1.2; g.stroke();
      }
      g.restore();
      txt(g, '0', px, py - R + 34, { size: 13, weight: 500, color: C.ink2, align: 'center' });
      txt(g, '−', px - Math.sin(0.87) * (R - 28) - 2, py - Math.cos(0.87) * (R - 28) + 6, { size: 18, weight: 600, color: C.blue, align: 'center' });
      txt(g, '+', px + Math.sin(0.87) * (R - 28) + 2, py - Math.cos(0.87) * (R - 28) + 6, { size: 18, weight: 600, color: C.copText, align: 'center' });
      var na = -PI / 2 + defl * 0.87;
      g.save();
      g.strokeStyle = C.red; g.lineWidth = 2.6; g.lineCap = 'round';
      g.beginPath(); g.moveTo(px - Math.cos(na) * 14, py - Math.sin(na) * 14); g.lineTo(px + Math.cos(na) * (R - 10), py + Math.sin(na) * (R - 10)); g.stroke();
      g.fillStyle = C.ink; g.beginPath(); g.arc(px, py, 6, 0, TAU); g.fill();
      g.restore();
    }

    function drawInd(g, d) {
      head(g, 'Değişen alan gerilim oluşturur');
      var x0 = 430, x1 = 580, cy = 140, ry = 42, hl = 55;
      var hp = getHelix(x0, x1, cy, ry, turns);
      var xTip = 300 + mx * 260, mc = xTip - hl;
      // alan çizgileri (mıknatısla gider)
      g.save(); g.beginPath(); g.rect(20, 40, 740, 150); g.clip();
      drawLines(g, F_MOVE, 6, mc, cy, 0, 0.42, 1.1);
      g.restore();
      // teller
      wire(g, [[x0, cy + ry], [x0, 300], [950, 300], [950, 278]]);
      wire(g, [[x1, cy + ry], [x1, 278], [870, 278]]);
      coilStrands(g, hp, false);
      drawMagnet(g, mc, cy, hl, 17, 0, false);
      coilStrands(g, hp, true);
      // voltmetre
      var defl = clamp(volt / 2, -1, 1);
      drawMeter(g, 790, 52, 300, 218, mAng, 'V');
      g.save(); g.fillStyle = C.ink2;
      [870, 950].forEach(function (x) { g.beginPath(); g.arc(x, 278, 5, 0, TAU); g.fill(); });
      g.restore();
      txt(g, 'voltmetre', 806, 74, { size: 13, color: C.muted });
      txt(g, readVolt(), 940, 256, { size: 16, mono: true, weight: 600, color: C.ink, align: 'center' });
      // durum
      var v = indVel();
      var st = v > 0.02 ? 'mıknatıs bobine yaklaşıyor: gerilim artı' : (v < -0.02 ? 'mıknatıs bobinden uzaklaşıyor: gerilim eksi' : 'mıknatıs duruyor: gerilim 0');
      var sc = v > 0.02 ? C.copText : (v < -0.02 ? C.blue : C.muted);
      txt(g, st, 24, 56, { size: 15, weight: 600, color: sc });
      txt(g, 'bobin: ' + turns + ' sarım', (x0 + x1) / 2, cy - ry - 16, { size: 14, color: C.ink2, align: 'center', weight: 500 });
      txt(g, 'mıknatıs hızı: ×' + speed, 24, 214, { size: 15, mono: true, weight: 500, color: C.ink2 });
      wrap(g, 'Gerilim, alanın ne kadar hızlı değiştiğiyle ve sarım sayısıyla artar.', 24, 242, 372, 14.5, 19, C.ink2, 400);
      wrap(g, 'Gerilimin işareti, mıknatıs girerken ve çıkarken ters olur.', 24, 286, 372, 14.5, 19, C.ink2, 400);
      txt(g, 'değişen manyetik alan, bobinde gerilim oluşturur', 24, 322, { size: 15, weight: 600, color: C.copText });
    }

    function genV() { return -Math.sin(theta); }
    function drawGen(g, d) {
      head(g, 'Jeneratör: dönen mıknatıs');
      var mxc = 250, myc = 160, x0 = 316, x1 = 456, cy = 160, ry = 46;
      var hp = getHelix(x0, x1, cy, ry, 5);
      // türbin
      var tx = 80, ty = 160;
      g.save();
      g.translate(tx, ty); g.rotate(-theta);
      g.fillStyle = C.grey;
      for (var i = 0; i < 6; i++) {
        g.save(); g.rotate(i * TAU / 6);
        g.beginPath(); g.moveTo(10, -5); g.quadraticCurveTo(32, -8, 46, 6); g.lineTo(46, 14); g.quadraticCurveTo(26, 2, 10, 5); g.closePath(); g.fill();
        g.restore();
      }
      g.fillStyle = C.ink2; g.beginPath(); g.arc(0, 0, 12, 0, TAU); g.fill();
      g.restore();
      txt(g, 'türbin', tx, ty + 74, { size: 14, weight: 500, color: C.ink2, align: 'center' });
      txt(g, 'su · buhar · rüzgâr', tx, 78, { size: 13, color: C.muted, align: 'center' });
      K.arrow(g, tx, 84, tx, 104, { color: C.muted, width: 1.6, head: 8 });
      // mil
      g.save(); g.strokeStyle = C.grey; g.lineWidth = 6; g.lineCap = 'butt';
      g.beginPath(); g.moveTo(tx + 12, ty); g.lineTo(mxc, myc); g.stroke(); g.restore();
      // alan çizgileri
      g.save(); g.beginPath(); g.rect(20, 40, 500, 200); g.clip();
      drawLines(g, F_GEN, 6, mxc, myc, -theta, 0.4, 1.1);
      g.restore();
      // teller
      wire(g, [[x0, cy + ry], [x0, 286], [510, 286]]);
      wire(g, [[x1, cy + ry], [x1, 262], [510, 262]]);
      coilStrands(g, hp, false);
      drawMagnet(g, mxc, myc, 62, 18, -theta, false);
      coilStrands(g, hp, true);
      // akım noktaları (yerinde gidip gelir)
      var off = 14 * Math.cos(theta);
      var pth = [[510, 286, 0], [x0, 286, 0], [x0, cy + ry, 0]];
      for (var q = 0; q < hp.length; q++) pth.push(hp[q]);
      pth.push([x1, cy + ry, 0], [x1, 262, 0], [510, 262, 0]);
      var pp = prepPath(pth);
      dotsOn(g, pp, off, 1, 30, 3.4);
      txt(g, 'bobin', (x0 + x1) / 2, cy - ry - 22, { size: 14, weight: 500, color: C.ink2, align: 'center' });
      txt(g, 'dönen mıknatıs', mxc, 248, { size: 14, weight: 500, color: C.ink2, align: 'center' });
      K.arrow(g, 480, 310, 520, 310, { color: C.muted, width: 1.6, head: 8 });
      txt(g, 'şebekeye', 474, 315, { size: 13, color: C.muted, align: 'right' });

      // grafik
      var gx0 = 596, gx1 = 1084, gy0 = 56, gy1 = 206, z = 131, A = 62;
      g.save();
      g.fillStyle = C.card; K.rr(g, gx0 - 36 + 0.5, gy0 - 8 + 0.5, gx1 - gx0 + 50, gy1 - gy0 + 16, 8); g.fill();
      g.strokeStyle = C.line2; g.lineWidth = 1; g.stroke();
      g.strokeStyle = C.ink2; g.lineWidth = 1;
      g.beginPath(); g.moveTo(gx0, z + 0.5); g.lineTo(gx1 + 6, z + 0.5); g.stroke();
      g.beginPath(); g.moveTo(gx0 + 0.5, gy0); g.lineTo(gx0 + 0.5, gy1); g.stroke();
      g.restore();
      txt(g, '+', gx0 - 16, z - A + 6, { size: 18, weight: 600, color: C.copText, align: 'center' });
      txt(g, '−', gx0 - 16, z + A + 6, { size: 18, weight: 600, color: C.blue, align: 'center' });
      txt(g, 'gerilim', gx0 + 8, gy0 + 6, { size: 13, color: C.muted });
      txt(g, 'zaman', gx1 - 4, z + 20, { size: 13, color: C.muted, align: 'right' });
      var fd = 0.55, Tw = 3 / fd;
      g.save();
      g.beginPath(); g.rect(gx0, gy0 - 4, gx1 - gx0 + 4, gy1 - gy0 + 8); g.clip();
      g.strokeStyle = C.blue; g.lineWidth = 2.6; g.lineJoin = 'round';
      g.beginPath();
      for (var x = gx0; x <= gx1; x += 3) {
        var s = -(gx1 - x) / (gx1 - gx0) * Tw;
        var yv = z - A * (-Math.sin(theta + TAU * fd * s));
        if (x === gx0) g.moveTo(x, yv); else g.lineTo(x, yv);
      }
      g.stroke();
      g.restore();
      var vnow = genV();
      g.save(); g.fillStyle = C.cop; g.strokeStyle = C.card; g.lineWidth = 2;
      g.beginPath(); g.arc(gx1, z - A * vnow, 6, 0, TAU); g.fill(); g.stroke(); g.restore();
      var st = vnow > 0.3 ? 'N kutbu bobine yaklaşıyor: gerilim artı' : (vnow < -0.3 ? 'N kutbu bobinden uzaklaşıyor: gerilim eksi' : 'alan en büyük ya da en küçük: gerilim sıfırdan geçer');
      txt(g, st, gx0 - 36, 232, { size: 15, weight: 600, color: vnow > 0.3 ? C.copText : (vnow < -0.3 ? C.blue : C.muted) });
      txt(g, 'saniyede 50 tur: 50 Hz', gx0 - 36, 258, { size: 18, mono: true, weight: 600, color: C.ink });
      txt(g, '(gerçekte 1 tur = 1 ÷ 50 = 0,02 s; burada yavaşlatıldı)', gx0 - 36, 278, { size: 13, color: C.muted });
      wrap(g, 'Yarım turda alanın yönü ters döner ve gerilimin işareti değişir: alternatif akım. Santralde su, buhar ya da rüzgâr türbini, türbin de mıknatısı döndürür.', gx0 - 36, 300, 500, 14, 17, C.ink2, 400);
    }

    function drawMotor(g, d) {
      head(g, 'Elektrik motoru: jeneratörün tersi');
      var cx = 300, cy = 170, r = 62;
      // kutuplar
      var NX = 70, SX = 430, PW = 100, PY = 88, PH = 164;
      g.save();
      g.fillStyle = C.cop; K.rr(g, NX, PY, PW, PH, 4); g.fill();
      g.fillStyle = C.blue; K.rr(g, SX, PY, PW, PH, 4); g.fill();
      g.strokeStyle = C.ink; g.lineWidth = 1.5;
      K.rr(g, NX + 0.5, PY + 0.5, PW, PH, 4); g.stroke();
      K.rr(g, SX + 0.5, PY + 0.5, PW, PH, 4); g.stroke();
      g.restore();
      txt(g, 'N', NX + PW / 2, cy + 12, { size: 38, weight: 700, color: '#FFFFFF', align: 'center' });
      txt(g, 'S', SX + PW / 2, cy + 12, { size: 38, weight: 700, color: '#FFFFFF', align: 'center' });
      // alan okları
      for (var i = 0; i < 5; i++) {
        var yy = cy - 56 + i * 28;
        K.arrow(g, NX + PW + 12, yy, SX - 12, yy, { color: C.grey, width: 1.3, head: 8, alpha: 0.9 });
      }
      txt(g, 'manyetik alan: N’den S’ye', cx, 76, { size: 14, weight: 500, color: C.grey, align: 'center' });
      // halka (uçtan görünüş)
      var c1 = Math.cos(thM), s1 = Math.sin(thM);
      var p1 = [cx + r * c1, cy - r * s1], p2 = [cx - r * c1, cy + r * s1];
      g.save();
      g.strokeStyle = C.line2; g.lineWidth = 1; g.setLineDash([3, 5]);
      g.beginPath(); g.arc(cx, cy, r, 0, TAU); g.stroke(); g.setLineDash([]);
      g.strokeStyle = C.copText; g.lineWidth = 7; g.lineCap = 'round';
      g.beginPath(); g.moveTo(p1[0], p1[1]); g.lineTo(p2[0], p2[1]); g.stroke();
      g.strokeStyle = C.cop; g.lineWidth = 4;
      g.beginPath(); g.moveTo(p1[0], p1[1]); g.lineTo(p2[0], p2[1]); g.stroke();
      g.fillStyle = C.ink; g.beginPath(); g.arc(cx, cy, 5, 0, TAU); g.fill();
      g.restore();
      var ps = [p1, p2];
      for (var k = 0; k < 2; k++) {
        var rt = ps[k][0] > cx;
        symbolIO(g, ps[k][0], ps[k][1], 12, rt, rt ? C.copText : C.blue);
        var ay = rt ? -1 : 1, L = 46;
        var y1 = ps[k][1] + ay * 16;
        var ax = ps[k][0] + (rt ? 22 : -22);
        K.arrow(g, ax, y1, ax, y1 + ay * L, { color: C.ink, width: 2.4, head: 10 });
        txt(g, 'F', ax + (rt ? 9 : -9), y1 + ay * L * 0.6 + 5, { size: 15, weight: 700, color: C.ink, align: rt ? 'left' : 'right' });
      }
      // dönüş oku
      var ra = r + 22;
      g.save(); g.strokeStyle = C.muted; g.lineWidth = 1.4;
      g.beginPath(); g.arc(cx, cy, ra, -2.55, -1.05); g.stroke(); g.restore();
      arrowHead(g, cx + ra * Math.cos(-2.55), cy + ra * Math.sin(-2.55), Math.atan2(-Math.cos(-2.55), Math.sin(-2.55)), 9, C.muted);
      // açıklama
      symbolIO(g, 36, 304, 8, true, C.copText);
      txt(g, 'akım okuyucuya doğru', 50, 309, { size: 13, color: C.ink2 });
      symbolIO(g, 214, 304, 8, false, C.blue);
      txt(g, 'akım sayfanın içine doğru', 228, 309, { size: 13, color: C.ink2 });
      txt(g, 'kıvrık ok: dönüş yönü', 400, 309, { size: 13, color: C.ink2 });

      // sağ: komütatör
      g.save(); g.strokeStyle = C.line2; g.lineWidth = 1;
      g.beginPath(); g.moveTo(586.5, 46); g.lineTo(586.5, 318); g.stroke(); g.restore();
      var kx = 720, ky = 160, kr = 34;
      var rightA = Math.cos(thM) > 0;
      var A1 = -(thM + PI / 2), A2 = -(thM - PI / 2);
      g.save(); g.lineWidth = 11; g.lineCap = 'butt';
      g.strokeStyle = rightA ? C.cop : C.blue;
      g.beginPath(); g.arc(kx, ky, kr, A1 + 0.05, A2 - 0.05); g.stroke();
      g.strokeStyle = rightA ? C.blue : C.cop;
      g.beginPath(); g.arc(kx, ky, kr, A2 + 0.05, A1 + TAU - 0.05); g.stroke();
      g.restore();
      g.save(); g.fillStyle = C.ink;
      K.rr(g, kx + kr + 2, ky - 8, 28, 16, 2); g.fill();
      K.rr(g, kx - kr - 30, ky - 8, 28, 16, 2); g.fill();
      g.restore();
      txt(g, 'komütatör', kx, ky + kr + 26, { size: 14, weight: 500, color: C.ink2, align: 'center' });
      txt(g, 'fırça', kx + kr + 16, ky - 16, { size: 13, color: C.muted, align: 'center' });
      txt(g, 'fırça', kx - kr - 16, ky - 16, { size: 13, color: C.muted, align: 'center' });
      // pil ve teller
      var bx = 1000, bTop = 108, bBot = 212;
      wire(g, [[kx + kr + 30, ky], [kx + kr + 60, ky], [kx + kr + 60, 84], [bx, 84], [bx, bTop]]);
      wire(g, [[kx - kr - 30, ky], [kx - kr - 60, ky], [kx - kr - 60, 240], [bx, 240], [bx, bBot]]);
      g.save();
      g.fillStyle = C.card; K.rr(g, bx - 26, bTop, 52, bBot - bTop, 6); g.fill();
      g.strokeStyle = C.ink2; g.lineWidth = 1.8; K.rr(g, bx - 26, bTop, 52, bBot - bTop, 6); g.stroke();
      g.restore();
      txt(g, '+', bx, bTop + 34, { size: 28, weight: 600, color: C.copText, align: 'center' });
      txt(g, '−', bx, bBot - 18, { size: 28, weight: 600, color: C.blue, align: 'center' });
      txt(g, 'pil', bx + 34, bTop + 52, { size: 13, color: C.muted });
      wrap(g, 'Komütatör, halka yarım tur dönünce akımın yönünü çevirir. Böylece sağdaki tel hep yukarı, soldaki tel hep aşağı itilir ve dönüş sürer.', 610, 278, 480, 14.5, 18.5, C.ink2, 400);
      txt(g, 'akım + manyetik alan = kuvvet: elektrik motoru', 610, 322, { size: 15, weight: 600, color: C.copText });
    }

    function drawSummary(g) {
      var act = (view === 'tel' || view === 'bobin') ? 0 : (view === 'indukleme' || view === 'jenerator') ? 1 : view === 'motor' ? 2 : -1;
      g.save(); g.strokeStyle = C.line2; g.lineWidth = 1;
      g.beginPath(); g.moveTo(20, 336.5); g.lineTo(1100, 336.5); g.stroke(); g.restore();
      var cells = [['elektrik akımı', 'manyetik alan'], ['değişen manyetik alan', 'gerilim'], ['akım + manyetik alan', 'kuvvet']];
      for (var i = 0; i < 3; i++) {
        var x = 20 + i * 372, on = (i === act);
        var col = on ? C.copText : C.ink2, wt = on ? 600 : 500;
        g.save(); g.font = K.font(15.5, wt);
        var w1 = g.measureText(cells[i][0]).width, w2 = g.measureText(' → ').width;
        g.restore();
        txt(g, cells[i][0], x, 357, { size: 15.5, weight: wt, color: col });
        txt(g, '→', x + w1 + 7, 357, { size: 15.5, weight: 600, color: C.cop });
        txt(g, cells[i][1], x + w1 + w2 + 4, 357, { size: 15.5, weight: wt, color: col });
        if (i > 0) { g.save(); g.strokeStyle = C.line2; g.beginPath(); g.moveTo(x - 14.5, 344); g.lineTo(x - 14.5, 362); g.stroke(); g.restore(); }
      }
      txt(g, 'Bu üç olay jeneratörün, transformatörün, motorun, hoparlörün ve antenin temelidir.', 20, 376, { size: 13.5, color: C.muted });
    }

    /* ---------- fizik / durum güncelleme ---------- */
    function phiOf(x) { return 1 / (1 + Math.exp(-(x - 500) / 36)); }
    function indVel() { return indVelV; }
    var indVelV = 0;

    function curTarget() {
      if (curManual !== null) return curManual;
      if (view === 'tel') { var p = vt % 6; return (p >= 1.2 && p < 4.8) ? 1 : 0; }
      if (view === 'bobin') {
        if (auto) return vt >= 7 ? 0 : 1;
        var q = vt % 10; return (q >= 8 && q < 9.6) ? 0 : 1;
      }
      return 1;
    }
    function autoParams() {
      if (view === 'bobin') {
        if (vt < 1.8) { turns = 1; core = 0; } else if (vt < 3.4) { turns = 3; core = 0; } else if (vt < 4.8) { turns = 6; core = 0; } else { turns = 6; core = 1; }
      } else if (view === 'indukleme') {
        turns = 3; speed = vt < 4.4 ? 1 : 3;
      }
    }
    function update(t, d) {
      tNow = t;
      if (auto && !K.reducedMotion) {
        var idx = Math.floor(t / DEMO) % VIEWS.length;
        if (VIEWS[idx] !== view) enterView(VIEWS[idx], t, true);
        vt = t - Math.floor(t / DEMO) * DEMO;
        autoParams();
      } else vt = t - vStart;
      // akım
      var ct = curTarget();
      cur += (ct - cur) * (1 - Math.exp(-10 * d));
      swAng += ((cur > 0.5 ? 0 : -0.9) - swAng) * (1 - Math.exp(-12 * d));
      coreA += ((core ? 1 : 0) - coreA) * (1 - Math.exp(-8 * d));
      if (!K.reducedMotion) dotPh += d * 70 * cur;
      // jeneratör ve motor
      if (!K.reducedMotion) { theta += d * TAU * 0.55; thM += d * 1.5; }
      // indükleme
      if (view === 'indukleme') {
        if (indStage === 0 || indStage === 2) {
          indTimer -= d;
          if (indTimer <= 0) { indStage = (indStage + 1) % 4; indProg = 0; }
        } else {
          indProg += d * speed / 1.7;
          if (indProg >= 1) { indProg = 1; indStage = (indStage + 1) % 4; indTimer = 0.9; }
        }
        var e = K.ease.inOut(clamp(indProg, 0, 1));
        mx = indStage === 1 ? e : (indStage === 2 ? 1 : (indStage === 3 ? 1 - e : 0));
        var xt = 300 + mx * 260, ph = phiOf(xt);
        if (phiPrev === null) phiPrev = ph;
        var vtgt = 0;
        if (d > 0.0005) vtgt = 0.085 * turns * (ph - phiPrev) / d;
        phiPrev = ph;
        indVelV = vtgt;
        volt += (vtgt - volt) * (1 - Math.exp(-d * 30));
        mAng += (clamp(volt / 2, -1, 1) - mAng) * (1 - Math.exp(-d * 14));
      } else { volt = 0; }
      // ataşlar
      if (view === 'bobin') {
        var cn = cur > 0.5 ? clipCount() : 0;
        for (var i = 0; i < CLIP_N; i++) {
          var c = clips[i], hy = 168 + i * 17 + 11 + 3;
          if (i < cn) {
            c.att = true; c.v = 0;
            c.y += (hy - c.y) * (1 - Math.exp(-9 * d));
            c.x += (BOB.x1 + 22 - c.x) * (1 - Math.exp(-9 * d));
            c.rot += (0 - c.rot) * (1 - Math.exp(-9 * d));
          } else {
            c.att = false;
            var fy = BOB.fl - 7;
            if (c.y < fy - 0.5) { c.v += 1000 * d; c.y = Math.min(fy, c.y + c.v * d); if (c.y >= fy) c.v = 0; }
            var rxp = BOB.x1 + 40 + i * 13, rr = PI / 2 + (i % 2 ? 0.12 : -0.1);
            c.x += (rxp - c.x) * (1 - Math.exp(-6 * d));
            c.rot += (rr - c.rot) * (1 - Math.exp(-6 * d));
          }
        }
      }
    }

    function readStrength() {
      var n = cur > 0.5 ? clipCount() : 0;
      return 'kuvvet: ' + n + ' ataş';
    }
    function readVolt() {
      return 'gerilim: ' + fmtV(volt) + ' V (örnek)';
    }

    function frame(t, dt) {
      var g = sf.ctx;
      var d = clamp(dt, 0, 0.05);
      update(t, d);
      sf.clear();
      tag(g, 'ölçekli değil · basitleştirilmiş model', sf.w - 20, 27);
      if (view === 'miknatis') drawMiknatis(g, d);
      else if (view === 'tel') drawTel(g, d);
      else if (view === 'bobin') drawBobin(g, d);
      else if (view === 'indukleme') drawInd(g, d);
      else if (view === 'jenerator') drawGen(g, d);
      else drawMotor(g, d);
      drawSummary(g);
    }

    return {
      reset: function () { resetState(); },
      frame: frame,
      set: function (key, val) {
        if (key === 'view') {
          if (VIEWS.indexOf(val) < 0) return;
          auto = false; curManual = null; enterView(val, tNow, false);
        } else if (key === 'turns') {
          var n = +val; if (!(n > 0)) return;
          auto = false;
          turns = n <= 2 ? 1 : (n <= 4 ? 3 : 6);
        } else if (key === 'core') {
          auto = false; core = (+val) ? 1 : 0;
        } else if (key === 'speed') {
          var s = +val; if (!(s > 0)) return;
          auto = false; speed = s <= 1.5 ? 1 : (s <= 2.5 ? 2 : 3);
        } else if (key === 'current') {
          auto = false; curManual = (+val) ? 1 : 0;
        }
      },
      read: function (key) {
        if (key === 'view') return view;
        if (key === 'explain') return EXPLAIN[view];
        if (key === 'turns') return String(turns);
        if (key === 'core') return String(core);
        if (key === 'speed') return String(speed);
        if (key === 'current') return cur > 0.5 ? '1' : '0';
        if (key === 'strength') return readStrength();
        if (key === 'volt') return readVolt();
        return '';
      },
      resize: function () { sf.resize(); },
      dispose: function () { sf.dispose(); }
    };
  });
})();
