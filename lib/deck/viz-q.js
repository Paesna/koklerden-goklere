/* Köklerden Göklere · Builder Q: toprak
 * earth-system · 680×520 · açık tema (2B)
 * Dikey kesit: trafo direği, ev, priz, çamaşır makinesi, toprak teli (PE), topraklama çubuğu.
 * Görünümler: normal, ariza, yildirim, neden (set('view', ...)). Sözleşme: kg-viz.js.
 * Tüm hareket frame(t, dt) içinden sürülür; rastgelelik KGViz.rng ile.
 */
(function () {
  'use strict';
  var K = window.KGViz;
  if (!K) return;
  var P = K.palette;
  var clamp = K.clamp;

  var VIEWS = ['normal', 'ariza', 'yildirim', 'neden'];
  var DEMO = 10;          // seconds per view in the auto demo, also the loop length of one view

  var EXPLAIN = {
    normal: 'Faz ve nötr çalışma akımını taşır. Toprak telinden akım geçmez; gövde yaklaşık 0 V’ta durur.',
    ariza: 'Akım toprak telinden çubuğa, topraktan nötrün topraklamasına döner. Röle atar; gövde 0 V’a yakın kalır, kişi güvendedir.',
    yildirim: 'Paratoner yıldırım yükünü toprağa indirir; toprak yükü yayar ve potansiyeli neredeyse değişmez.',
    neden: 'Her yerdedir, çok büyüktür, nemliyken iletir; telgrafta dönüş yoluydu. Bu yüzden ortak referans seçildi.'
  };

  var HEAD = {
    normal: 'Normal çalışma: akım faz ve nötr telinde',
    ariza: 'Arıza: faz gövdeye değdi, akım toprak teline kaçar',
    yildirim: 'Yıldırım: paratoner yükü toprağa taşır',
    neden: 'Neden toprak seçildi?'
  };
  var SUB = {
    normal: 'elektronlar iki telde ileri geri titreşir (alternatif akım)',
    ariza: 'röle sembolik ve hızlandırılmış · gerçekte denenmez',
    yildirim: 'yük çubuktan inip toprakta her yöne yayılır',
    neden: ''
  };

  var REASONS = [
    ['Her yerde var', 'Her binanın altında toprak vardır; uzak bir iletken kurmak gerekmez.'],
    ['Çok büyük', 'Yük yayılır, toprağın potansiyeli neredeyse değişmez: sağlam bir referans.'],
    ['Nemli toprak iletir', 'Sudaki iyonlar akıma yol verir; kuru toprak daha kötü iletir.'],
    ['Tarihsel', '19. yüzyılda telgraf hatlarında dönüş yolu olarak toprak kullanıldı.']
  ];

  /* ---------- geometry (CSS px at 680×520) ---------- */
  var GY = 362;                               // ground surface
  var HX0 = 190, HX1 = 540, HY0 = 200, FY = 350;   // house walls and floor
  var XP = 92, XH = 310, XL = 556;            // pole rod, house rod, lightning rod
  var ROD_END = 456, SOIL_Y = 484;            // rod tips and soil "bus"

  function zigV(x, y0, y1, n, amp) {
    var pts = [[x, y0]], i, s = (y1 - y0) / (n + 1);
    for (i = 1; i <= n; i++) pts.push([x + (i % 2 ? amp : -amp), y0 + s * i]);
    pts.push([x, y1]);
    return pts;
  }
  function cat() {
    var out = [], i, a;
    for (i = 0; i < arguments.length; i++) { a = arguments[i]; out = out.concat(a); }
    return out;
  }

  var PHASE = [[104, 160], [165, 160], [165, 232], [244, 232], [244, 318], [372, 318], [372, 306], [389, 306]];
  var NEUT = [[104, 172], [150, 172], [150, 248], [208, 248], [208, 324], [428, 324], [428, 306], [421, 306]];
  var PE_CABLE = [[350, 332], [226, 332]];
  var PE_BUS = [[226, 332], [226, 376], [XH, 376]];
  var ZH = zigV(XH, ROD_END, 478, 4, 7), ZP = zigV(XP, ROD_END, 478, 4, 7);
  var FAULT = cat(
    PHASE.slice(0, 7), [[372, 264], [358, 264], [358, 332], [226, 332], [226, 376], [XH, 376]],
    ZH, [[XH, SOIL_Y], [XP, SOIL_Y]], ZP.slice().reverse(), [[XP, 176], [XP, 172]]
  );
  var CONDUCTOR = [[365, 118], [365, 150], [XL, 201.6], [XL, 430]];

  function Poly(pts) {
    this.pts = pts; this.cum = [0];
    for (var i = 1; i < pts.length; i++) {
      this.cum.push(this.cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
    }
    this.len = this.cum[pts.length - 1];
  }
  Poly.prototype.at = function (s, out) {
    var c = this.cum, p = this.pts, i = 1;
    s = clamp(s, 0, this.len);
    while (i < c.length - 1 && c[i] < s) i++;
    var u = (s - c[i - 1]) / Math.max(1e-6, c[i] - c[i - 1]);
    out.x = p[i - 1][0] + (p[i][0] - p[i - 1][0]) * u;
    out.y = p[i - 1][1] + (p[i][1] - p[i - 1][1]) * u;
    return out;
  };
  var PP = new Poly(PHASE), PN = new Poly(NEUT), PF = new Poly(FAULT), PC = new Poly(CONDUCTOR);

  K.register('earth-system', function (el, opts) {
    opts = opts || {};
    var sf = K.surface(el);
    var C = {
      ink: P.ink, ink2: P.ink2, muted: P.muted, line: P.line, line2: P.line2,
      blue: P.blue, cop: P.copperFill, copText: P.copper,
      grey: '#666C78',
      soil: '#E8E0D2', soilDot: '#C4B79F',
      phase: '#3B2A1E', neut: P.blue,
      pe1: '#E3B422', pe2: '#2E8B4E',
      steel: '#DADDE2', card: '#FFFFFF',
      lamp: '#F2C46B', wall: '#FFFFFF', roof: '#E9E9E3'
    };

    var rng = K.rng(1752);
    var stip = [], i;
    for (i = 0; i < 170; i++) stip.push([rng() * 680, GY + 6 + rng() * (520 - GY - 8), 0.8 + rng() * 1.2]);

    var view = 'normal', auto = true, lastView = '', vt = 0, A = null, tt = 0;
    function targets(v) { var o = {}; VIEWS.forEach(function (n) { o[n] = n === v ? 1 : 0; }); return o; }
    function resetState() { view = 'normal'; auto = true; lastView = ''; vt = 0; A = targets(view); }
    resetState();

    var Q = { x: 0, y: 0 };

    /* ---------- helpers ---------- */
    function txt(g, s, x, y, o) { K.label(g, s, x, y, o); }
    function wrap(g, text, x, y, w, size, pitch, color, weight) {
      var words = text.split(' '), line = '', yy = y, t2;
      g.save(); g.font = K.font(size, weight || 400);
      for (var j = 0; j < words.length; j++) {
        t2 = line ? line + ' ' + words[j] : words[j];
        if (g.measureText(t2).width > w && line) {
          txt(g, line, x, yy, { size: size, color: color, weight: weight });
          line = words[j]; yy += pitch;
        } else line = t2;
      }
      g.restore();
      txt(g, line, x, yy, { size: size, color: color, weight: weight });
    }
    function chip(g, s, x, y, o, a) {
      // text on a soil-coloured plate so rings and lines do not run through it
      g.save(); g.font = K.font(o.size, o.weight || 500, o.mono);
      var w = g.measureText(s).width;
      g.restore();
      var x0 = o.align === 'center' ? x - w / 2 : x;
      g.save(); g.globalAlpha *= a; g.fillStyle = o.plate || C.soil;
      g.fillRect(x0 - 5, y - o.size, w + 10, o.size + 7); g.restore();
      txt(g, s, x, y, { size: o.size, weight: o.weight || 500, color: o.color, align: o.align, mono: o.mono, alpha: a });
    }
    function strokePoly(g, pts, color, width, dash, cap) {
      g.save();
      g.lineJoin = 'round'; g.lineCap = cap || 'butt';
      g.strokeStyle = color; g.lineWidth = width;
      if (dash) g.setLineDash(dash);
      g.beginPath(); g.moveTo(pts[0][0], pts[0][1]);
      for (var j = 1; j < pts.length; j++) g.lineTo(pts[j][0], pts[j][1]);
      g.stroke(); g.restore();
    }
    function peLine(g, pts, w) {
      strokePoly(g, pts, C.pe1, w);
      strokePoly(g, pts, C.pe2, w, [6, 6]);
    }
    function dot(g, x, y, r, fill, a) {
      g.save(); g.globalAlpha *= a;
      g.fillStyle = fill; g.strokeStyle = '#FFFFFF'; g.lineWidth = 1.5;
      g.beginPath(); g.arc(x, y, r, 0, 6.2832); g.fill(); g.stroke(); g.restore();
    }
    function tag(g, s, x, y) {
      g.save(); g.font = K.font(12, 500, true);
      var w = g.measureText(s).width + 16;
      g.strokeStyle = C.muted; g.lineWidth = 1;
      K.rr(g, x + 0.5, y - 15.5, w, 23, 5); g.stroke(); g.restore();
      txt(g, s, x + 8, y, { size: 12, mono: true, weight: 500, color: C.muted });
    }

    /* ---------- static scene ---------- */
    function drawGround(g) {
      g.fillStyle = C.soil; g.fillRect(0, GY, 680, 520 - GY);
      g.fillStyle = C.soilDot;
      for (var j = 0; j < stip.length; j++) {
        g.beginPath(); g.arc(stip[j][0], stip[j][1], stip[j][2], 0, 6.2832); g.fill();
      }
      g.strokeStyle = C.ink2; g.lineWidth = 1.6;
      g.beginPath(); g.moveTo(0, GY + 0.5); g.lineTo(680, GY + 0.5); g.stroke();
    }
    function drawHouse(g) {
      g.save();
      g.fillStyle = C.wall; g.strokeStyle = C.ink2; g.lineWidth = 2;
      g.fillRect(HX0, HY0, HX1 - HX0, FY - HY0); g.strokeRect(HX0, HY0, HX1 - HX0, FY - HY0);
      g.fillStyle = C.roof;
      g.beginPath(); g.moveTo(HX0 - 10, HY0); g.lineTo(365, 150); g.lineTo(HX1 + 10, HY0); g.closePath();
      g.fill(); g.stroke();
      g.fillStyle = '#CFCFC8';
      g.fillRect(HX0 - 4, FY, HX1 - HX0 + 8, GY - FY); g.strokeRect(HX0 - 4, FY, HX1 - HX0 + 8, GY - FY);
      g.restore();
    }
    function drawPole(g) {
      g.fillStyle = '#B8BCC6'; g.strokeStyle = C.ink2; g.lineWidth = 1.6;
      g.fillRect(58, 176, 14, GY - 176); g.strokeRect(58, 176, 14, GY - 176);
      g.fillStyle = C.card;
      K.rr(g, 40, 120, 64, 56, 5); g.fill(); g.stroke();
      g.lineWidth = 2;
      g.beginPath(); g.arc(62, 146, 14, 0, 6.2832); g.stroke();
      g.beginPath(); g.arc(80, 146, 14, 0, 6.2832); g.stroke();
      g.fillStyle = C.ink;
      g.beginPath(); g.arc(XP, 172, 3, 0, 6.2832); g.fill();
    }
    function drawMachine(g, spin) {
      g.save();
      g.fillStyle = C.steel; g.strokeStyle = C.ink; g.lineWidth = 2.4;
      K.rr(g, 350, 262, 100, 88, 4); g.fill(); g.stroke();
      g.fillStyle = C.card; g.lineWidth = 2;
      g.beginPath(); g.arc(405, 306, 16, 0, 6.2832); g.fill(); g.strokeStyle = C.ink2; g.stroke();
      g.lineWidth = 2.2;
      for (var j = 0; j < 3; j++) {
        var a = spin + j * 2.0944;
        g.beginPath(); g.moveTo(405, 306); g.lineTo(405 + Math.cos(a) * 12, 306 + Math.sin(a) * 12); g.stroke();
      }
      g.restore();
    }
    function drawBoxes(g, tripped) {
      g.save();
      g.fillStyle = C.card; g.strokeStyle = C.ink2; g.lineWidth = 1.8;
      K.rr(g, 196, 212, 60, 50, 4); g.fill(); g.stroke();       // breaker box
      K.rr(g, 196, 306, 60, 36, 4); g.fill(); g.stroke();       // socket
      // lever
      g.strokeStyle = C.ink; g.lineWidth = 2.6; g.lineCap = 'round';
      g.beginPath(); g.moveTo(226, 252);
      if (tripped > 0.5) g.lineTo(237, 231); else g.lineTo(226, 222);
      g.stroke();
      g.fillStyle = C.ink;
      g.beginPath(); g.arc(226, 252, 3, 0, 6.2832); g.arc(226, 222, 3, 0, 6.2832); g.fill();
      g.restore();
    }
    function drawRods(g) {
      g.save();
      [XP, XH].forEach(function (x) {
        g.fillStyle = C.copText; g.strokeStyle = C.ink2; g.lineWidth = 1;
        g.fillRect(x - 4, 370, 8, ROD_END - 370);
      });
      g.fillStyle = C.copText;
      g.fillRect(XL - 4, GY + 2, 8, 430 - GY - 2);
      g.restore();
      strokePoly(g, ZH, C.grey, 2.2); strokePoly(g, ZP, C.grey, 2.2);
      strokePoly(g, [[XP, SOIL_Y], [XH, SOIL_Y]], C.grey, 1.4, [3, 5]);
    }

    function drawWires(g, faultStub) {
      // pole earth wire and phase/neutral
      strokePoly(g, [[XP, 172], [XP, 370]], C.neut, 3);
      strokePoly(g, PHASE, C.phase, 3.4);
      strokePoly(g, NEUT, C.neut, 3.4);
      peLine(g, PE_CABLE, 4); peLine(g, PE_BUS, 4);
      g.fillStyle = C.pe2;
      g.beginPath(); g.arc(350, 332, 4, 0, 6.2832); g.fill();
      if (faultStub > 0.01) {
        g.save(); g.globalAlpha *= faultStub;
        strokePoly(g, [[372, 306], [372, 270]], C.phase, 3.4, [4, 3]);
        // spark
        g.strokeStyle = C.lamp; g.lineWidth = 2.4; g.lineCap = 'round';
        for (var j = 0; j < 6; j++) {
          var a = j * 1.0472 + 0.3;
          g.beginPath(); g.moveTo(372 + Math.cos(a) * 5, 264 + Math.sin(a) * 5);
          g.lineTo(372 + Math.cos(a) * 11, 264 + Math.sin(a) * 11); g.stroke();
        }
        g.restore();
      }
    }

    /* ---------- moving parts ---------- */
    function normalDots(g, a) {
      if (a <= 0.01) return;
      var amp = K.reducedMotion ? 0 : 16 * Math.sin(6.2832 * tt / 2.4);
      var k;
      for (k = 0; k < PP.len / 30; k++) {
        PP.at(k * 30 + 12 + amp, Q); dot(g, Q.x, Q.y, 4, C.blue, a);
      }
      for (k = 0; k < PN.len / 30; k++) {
        PN.at(k * 30 + 12 - amp, Q); dot(g, Q.x, Q.y, 4, C.blue, a);
      }
    }
    function faultCurrent(g, loc, a) {
      // copper path through PE, rod, soil and neutral earth; fades when the relay trips
      if (a <= 0.01) return;
      var head = clamp((loc - 0.9) / 1.5, 0, 1) * PF.len;
      if (head <= 1) return;
      var seg = [], s, step = 6;
      for (s = 0; s <= head; s += step) { PF.at(s, Q); seg.push([Q.x, Q.y]); }
      g.save(); g.globalAlpha *= a;
      strokePoly(g, seg, 'rgba(200,105,58,.28)', 9, null, 'round');
      g.restore();
      var sp = 26, off = K.reducedMotion ? 0 : (tt * 190) % sp;
      for (s = off; s < head; s += sp) {
        PF.at(s, Q); dot(g, Q.x, Q.y, 4.2, C.cop, a);
      }
    }
    function lightning(g, loc, a) {
      if (a <= 0.01) return;
      var flash = (loc > 0.6 && loc < 1.15) ? (Math.sin(loc * 70) > -0.3 ? 1 : 0.6) : 0;
      var cloud = [[440, 72, 20], [470, 62, 26], [502, 66, 22], [524, 76, 16], [452, 80, 16], [496, 80, 16]];
      g.save(); g.globalAlpha *= a;
      g.fillStyle = '#D3D6DC'; g.strokeStyle = C.ink2; g.lineWidth = 1.8;
      cloud.forEach(function (c) { g.beginPath(); g.arc(c[0], c[1], c[2], 0, 6.2832); g.fill(); g.stroke(); });
      cloud.forEach(function (c) { g.beginPath(); g.arc(c[0], c[1], c[2] - 1, 0, 6.2832); g.fill(); });
      g.restore();
      if (flash > 0) {
        var bolt = [[440, 88], [424, 98], [432, 100], [404, 110], [412, 112], [372, 118]];
        g.save(); g.globalAlpha *= a * flash;
        strokePoly(g, bolt, C.ink2, 7, null, 'round');
        strokePoly(g, bolt, C.lamp, 4, null, 'round');
        g.restore();
      }
      // charge running down the conductor
      var t0 = loc - 1.0;
      if (t0 > 0 && loc < 8.5) {
        var fa = a * (1 - clamp((loc - 7.8) / 0.7, 0, 1)), s, off = K.reducedMotion ? 0 : (tt * 150) % 24;
        for (s = off; s < PC.len; s += 24) { PC.at(s, Q); dot(g, Q.x, Q.y, 3.6, C.blue, fa); }
      }
    }
    function rings(g, loc, a) {
      if (a <= 0.01 || loc < 1.4) return;
      var LIFE = 3.2, N = 3, k, age, r, th, fa;
      var fade = a * (1 - clamp((loc - 7.8) / 0.9, 0, 1)) * clamp((loc - 1.4) / 0.4, 0, 1);
      g.save();
      g.beginPath(); g.rect(0, GY + 1, 680, 520 - GY); g.clip();
      for (k = 0; k < N; k++) {
        age = K.reducedMotion ? (0.4 + k * 0.9) : (((loc - 1.4) - k * LIFE / N) % LIFE + LIFE) % LIFE;
        r = 20 + 105 * (age / LIFE);
        fa = fade * (1 - age / LIFE) * 0.95;
        if (fa <= 0.02) continue;
        g.strokeStyle = C.blue; g.globalAlpha = fa * 0.5; g.lineWidth = 1.5;
        g.beginPath(); g.arc(XL, 430, r, 0, Math.PI); g.stroke();
        g.globalAlpha = 1;
        for (th = 12; th <= 168; th += 26) {
          var an = th * Math.PI / 180, ca = Math.cos(an), sa = Math.sin(an);
          K.arrow(g, XL + ca * (r - 12), 430 + sa * (r - 12), XL + ca * (r + 4), 430 + sa * (r + 4),
            { color: C.blue, width: 2.2, head: 8, alpha: fa });
        }
      }
      g.restore();
    }

    function drawPerson(g, a) {
      if (a <= 0.01) return;
      g.save(); g.globalAlpha *= a;
      g.strokeStyle = C.ink2; g.lineWidth = 3; g.lineCap = 'round';
      g.beginPath();
      g.moveTo(508, 291); g.lineTo(508, 325);
      g.moveTo(508, 325); g.lineTo(498, 349); g.moveTo(508, 325); g.lineTo(518, 349);
      g.moveTo(508, 300); g.lineTo(452, 306);
      g.stroke();
      g.fillStyle = C.card; g.beginPath(); g.arc(508, 282, 9, 0, 6.2832); g.fill(); g.stroke();
      g.restore();
    }

    function cards(g, a) {
      if (a <= 0.01) return;
      var act = K.reducedMotion ? 0 : Math.floor(vt / 2.2) % 4;
      for (var j = 0; j < 4; j++) {
        var x = 24 + (j % 2) * 328, y = 62 + Math.floor(j / 2) * 116, on = j === act;
        g.save(); g.globalAlpha *= a;
        g.fillStyle = C.card; g.strokeStyle = on ? C.ink : C.line2; g.lineWidth = on ? 2 : 1.2;
        K.rr(g, x + 0.5, y + 0.5, 304, 104, 8); g.fill(); g.stroke();
        g.fillStyle = on ? C.copText : C.ink2;
        g.beginPath(); g.arc(x + 28, y + 30, 14, 0, 6.2832); g.fill();
        g.restore();
        txt(g, String(j + 1), x + 28, y + 36, { size: 16, weight: 600, color: '#FFFFFF', align: 'center', alpha: a });
        txt(g, REASONS[j][0], x + 52, y + 36, { size: 17, weight: 600, color: C.ink, alpha: a });
        g.save(); g.globalAlpha *= a;
        wrap(g, REASONS[j][1], x + 16, y + 66, 274, 14, 19, C.ink2, 400);
        g.restore();
      }
    }

    /* ---------- frame ---------- */
    function frame(t, dt) {
      var g = sf.ctx;
      if (auto && !K.reducedMotion) {
        var want = VIEWS[Math.floor(t / DEMO) % VIEWS.length];
        if (want !== view) { view = want; }
      }
      if (view !== lastView) { lastView = view; vt = 0; }
      vt += Math.max(dt, 0);
      var loc = K.reducedMotion ? (view === 'ariza' ? 2.6 : view === 'yildirim' ? 3 : 2) : (vt % DEMO);
      tt = K.reducedMotion ? 2 : t;
      var T = targets(view), rate = 1 - Math.exp(-10 * Math.max(dt, 0.0001)), key;
      for (key in T) A[key] += (T[key] - A[key]) * rate;

      var tripAt = 3.6;
      var tripped = view === 'ariza' && loc >= tripAt ? 1 : 0;
      var faultOn = clamp((loc - 0.4) / 0.4, 0, 1) * A.ariza;
      var flowA = A.ariza * (loc < tripAt ? 1 : 1 - clamp((loc - tripAt) / 0.4, 0, 1));
      var running = !(view === 'ariza' && loc >= tripAt);
      var spin = running ? tt * 3 : 0.6;
      if (view === 'ariza' && loc >= tripAt) spin = 0.6;

      sf.clear();
      var sceneA = 1 - 0.8 * A.neden;
      g.save(); g.globalAlpha = sceneA;

      drawGround(g);
      drawHouse(g);
      drawPole(g);
      drawMachine(g, spin);
      drawBoxes(g, tripped);
      drawRods(g);
      drawWires(g, faultOn);

      normalDots(g, A.normal * 0.95 + A.yildirim * 0.0);
      faultCurrent(g, loc, flowA);

      // conductor and lightning rod (always present, active in the lightning view)
      g.save(); g.globalAlpha *= 0.5 + 0.5 * A.yildirim;
      strokePoly(g, CONDUCTOR, C.copText, 3, null, 'round');
      g.fillStyle = C.copText;
      g.beginPath(); g.moveTo(365, 112); g.lineTo(361, 124); g.lineTo(369, 124); g.closePath(); g.fill();
      g.restore();
      lightning(g, loc, A.yildirim);
      rings(g, loc, A.yildirim);
      drawPerson(g, A.ariza * clamp((loc - 1.0) / 0.4, 0, 1));

      // ----- labels (scene) -----
      txt(g, 'dağıtım trafosu', 24, 112, { size: 13, weight: 600, color: C.ink });
      txt(g, 'faz', 174, 196, { size: 13, weight: 600, color: C.phase });
      txt(g, 'nötr', 144, 214, { size: 13, weight: 600, color: C.neut, align: 'right' });
      txt(g, 'nötr toprağa bağlı', 104, 418, { size: 13, color: C.ink2 });
      txt(g, 'çamaşır makinesi', 350, 254, { size: 13, weight: 600, color: C.ink });
      txt(g, 'metal gövde', 472, 254, { size: 13, color: C.ink2, alpha: 1 - A.ariza });
      txt(g, 'metal gövde', 472, 254, { size: 13, color: C.ink2, alpha: A.ariza * (1 - clamp((loc - 1.0) / 0.4, 0, 1)) });
      txt(g, 'priz', 264, 304, { size: 13, weight: 600, color: C.ink });
      txt(g, 'toprak teli (PE)', 298, 396, { size: 13, weight: 600, color: C.pe2, align: 'right' });
      txt(g, 'bakır çubuk', 322, 436, { size: 13, color: C.ink2 });
      txt(g, 'toprak', 24, 392, { size: 13, color: C.muted });
      txt(g, 'R = toprak direnci', 108, 474, { size: 13, color: C.grey });
      txt(g, '≈ 0 V', 400, 343, { size: 13, mono: true, weight: 600, color: C.ink2, align: 'center' });

      // relay text
      txt(g, 'kaçak akım rölesi', 264, 226, { size: 13, weight: 600, color: C.ink, alpha: 1 - tripped * A.ariza });
      txt(g, 'attı: devre kesildi', 264, 226, { size: 13, weight: 600, color: C.copText, alpha: tripped * A.ariza });

      // view specific
      txt(g, 'normalde toprak telinden', 332, 396, { size: 13, weight: 600, color: C.pe2, alpha: A.normal });
      txt(g, 'akım geçmez', 332, 413, { size: 13, weight: 600, color: C.pe2, alpha: A.normal });
      txt(g, 'toprak teli akıma kolay yol açar', 332, 396, { size: 13, weight: 600, color: C.pe2, alpha: A.ariza });
      chip(g, 'arıza akımı toprak üzerinden döner', 332, 466, { size: 13, weight: 600, color: C.copText }, A.ariza * flowA);
      var pa = A.ariza * clamp((loc - 1.0) / 0.4, 0, 1);
      txt(g, 'gövde ≈ 0 V,', 532, 222, { size: 13, weight: 600, color: C.blue, align: 'right', alpha: pa });
      txt(g, 'dokunan kişi güvende', 532, 237, { size: 13, weight: 600, color: C.blue, align: 'right', alpha: pa });
      txt(g, 'paratoner', 374, 128, { size: 13, weight: 600, color: C.copText, alpha: 0.6 + 0.4 * A.yildirim });
      chip(g, 'toprak yükü yayar ve yutar', 345, 508, { size: 16, weight: 600, color: C.blue }, A.yildirim * clamp((loc - 1.4) / 0.5, 0, 1));
      g.restore();

      // ----- headline and tags -----
      txt(g, HEAD.normal, 24, 30, { size: 16, weight: 600, color: C.ink, alpha: A.normal });
      txt(g, HEAD.ariza, 24, 30, { size: 16, weight: 600, color: C.ink, alpha: A.ariza });
      txt(g, HEAD.yildirim, 24, 30, { size: 16, weight: 600, color: C.ink, alpha: A.yildirim });
      txt(g, HEAD.neden, 24, 30, { size: 16, weight: 600, color: C.ink, alpha: A.neden });
      txt(g, SUB.normal, 24, 52, { size: 14, color: C.ink2, alpha: A.normal });
      txt(g, SUB.ariza, 24, 52, { size: 14, color: C.copText, alpha: A.ariza });
      txt(g, SUB.yildirim, 24, 52, { size: 14, color: C.ink2, alpha: A.yildirim });

      cards(g, A.neden);
      tag(g, 'ölçekli değil · basitleştirilmiş model', 24, 509);
    }

    return {
      reset: function () { resetState(); },
      frame: frame,
      set: function (key, val) {
        if (key === 'view' && VIEWS.indexOf(val) >= 0) { view = val; auto = false; lastView = ''; }
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
