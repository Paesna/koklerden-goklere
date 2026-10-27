/* Köklerden Göklere · Builder Q: toprak (odak slaytları a ve b)
 * earth-system · 1120×440 tasarım alanı, kutuya sığacak şekilde ölçeklenir · 2B
 * Görünümler: gnd, neden (hikâye a: GND ve toprak neden ortak referans),
 *             normal, ariza, yildirim (hikâye b: evdeki toprak, koruma topraklaması).
 * set('story','a'|'b') otomatik gösterinin hangi görünümleri gezeceğini seçer;
 * set('view', ...) gösteriyi durdurur ve o görünümü sakin bir döngüde oynatır.
 * Sözleşme: kg-viz.js. Tüm hareket frame(t, dt) içinden sürülür; rastgelelik KGViz.rng ile.
 */
(function () {
  'use strict';
  var K = window.KGViz;
  if (!K) return;
  var P = K.palette;
  var clamp = K.clamp;

  var DW = 1120, DH = 440;
  var VIEWS = ['normal', 'ariza', 'yildirim', 'neden', 'gnd'];
  var STORY = { a: ['gnd', 'neden'], b: ['normal', 'ariza', 'yildirim'] };
  var DUR = { gnd: 10, neden: 12, normal: 8, ariza: 10, yildirim: 10 };

  var EXPLAIN = {
    normal: 'Normalde akım faz ve nötr telinden geçer; toprak teli boştadır, metal gövde 0 V’ta durur.',
    ariza: 'Faz gövdeye değerse akım toprak teline kaçar, röle devreyi keser; dokunan kişi güvendedir.',
    yildirim: 'Paratoner yıldırım yükünü toprağa indirir; toprak yükü yayar, potansiyeli neredeyse değişmez.',
    neden: 'Toprak her yerdedir, çok büyüktür ve nemliyken iletir; bu yüzden ortak referans seçildi.',
    gnd: 'Devre toprağı (GND) pilin eksi ucudur, yere bağlı değildir; koruma topraklaması gövdeyi toprağa bağlar.'
  };

  var REASONS = [
    ['Her yerde var', 'Her binanın altında toprak vardır;', 'uzak bir iletken kurmak gerekmez.'],
    ['Çok büyük', 'Yük yayılır, potansiyel neredeyse', 'değişmez: sağlam bir referans.'],
    ['Nemli toprak iletir', 'Sudaki iyonlar akıma yol verir;', 'kuru toprak daha kötü iletir.'],
    ['Tarihsel: telgraf', '19. yüzyılda telgraf hatlarında', 'dönüş yolu olarak toprak kullanıldı.']
  ];

  /* ---------- sahne geometrisi (özgün 680×520 koordinatları) ---------- */
  var GY = 362;
  var HX0 = 190, HX1 = 540, HY0 = 200, FY = 350;
  var XP = 92, XH = 310, XL = 556;
  var ROD_END = 456, SOIL_Y = 484;
  /* sahne → tasarım dönüşümü */
  var S = 0.9, OX = 254, OY = -20;
  function SX(x) { return OX + S * x; }
  function SY(y) { return OY + S * y; }

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
      blue: P.blue, cop: P.copperFill, copText: P.copperText || '#A64B22',
      grey: '#666C78',
      soil: '#E8E0D2', soilDot: '#C4B79F',
      phase: '#3B2A1E', neut: P.blue,
      pe1: '#E3B422', pe2: '#2E8B4E',
      steel: '#DADDE2', card: '#FFFFFF', wireO: '#AEB3BE', wireI: '#E9E9E3',
      lamp: '#F2C46B', wall: '#FFFFFF', roof: '#E9E9E3'
    };

    var GYD = SY(GY);                         // tasarımda toprak yüzeyi
    var rng = K.rng(1752);
    var stip = [], i;
    for (i = 0; i < 260; i++) stip.push([rng() * DW, GYD + 6 + rng() * (DH - GYD - 8), 0.9 + rng() * 1.3]);

    var view = 'normal', story = 'b', auto = true, viewT0 = 0, lastT = 0, A = null, tt = 0;
    function targets(v) { var o = {}; VIEWS.forEach(function (n) { o[n] = n === v ? 1 : 0; }); return o; }
    function resetState() { view = STORY[story][0]; auto = true; viewT0 = 0; A = targets(view); }
    resetState();

    var Q = { x: 0, y: 0 };

    /* ---------- yardımcılar ---------- */
    function txt(g, s, x, y, o) { K.label(g, s, x, y, o); }
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
    function tag(g, s, xr, y) {
      g.save(); g.font = K.font(14, 500, true);
      var w = g.measureText(s).width + 18;
      g.strokeStyle = C.muted; g.lineWidth = 1;
      K.rr(g, xr - w + 0.5, y - 16.5, w, 26, 5); g.stroke(); g.restore();
      txt(g, s, xr - w + 9, y + 2, { size: 14, mono: true, weight: 500, color: C.muted });
    }
    function shadow(g, x, y, w, h, r) {
      g.save(); g.fillStyle = 'rgba(20,24,40,.10)'; K.rr(g, x + 2, y + 4, w, h, r); g.fill(); g.restore();
    }
    /* sağ sütundaki etiket: iki satıra kadar, sahnedeki noktaya ince çizgiyle bağlanır */
    function lab(g, lines, y, ax, ay, color, a) {
      if (a <= 0.01) return;
      var x = 800, ty = y;
      g.save(); g.globalAlpha *= a;
      g.strokeStyle = C.muted; g.lineWidth = 1.5;
      g.beginPath(); g.moveTo(x - 10, y - 7); g.lineTo(SX(ax), SY(ay)); g.stroke();
      g.fillStyle = C.ink; g.beginPath(); g.arc(SX(ax), SY(ay), 4, 0, 6.2832); g.fill();
      g.restore();
      for (var j = 0; j < lines.length; j++) {
        txt(g, lines[j], x, ty + j * 24, { size: j === 0 ? 20 : 18, weight: j === 0 ? 700 : 500, color: j === 0 ? color : C.ink2, alpha: a });
      }
    }

    /* ---------- sahne parçaları (özgün koordinatlar) ---------- */
    function drawHouse(g) {
      g.save();
      g.fillStyle = C.wall; g.strokeStyle = C.ink2; g.lineWidth = 2.4;
      g.fillRect(HX0, HY0, HX1 - HX0, FY - HY0); g.strokeRect(HX0, HY0, HX1 - HX0, FY - HY0);
      g.fillStyle = C.roof;
      g.beginPath(); g.moveTo(HX0 - 10, HY0); g.lineTo(365, 150); g.lineTo(HX1 + 10, HY0); g.closePath();
      g.fill(); g.stroke();
      g.fillStyle = '#CFCFC8';
      g.fillRect(HX0 - 4, FY, HX1 - HX0 + 8, GY - FY); g.strokeRect(HX0 - 4, FY, HX1 - HX0 + 8, GY - FY);
      g.restore();
    }
    function drawPole(g) {
      g.fillStyle = '#B8BCC6'; g.strokeStyle = C.ink2; g.lineWidth = 1.8;
      g.fillRect(58, 176, 14, GY - 176); g.strokeRect(58, 176, 14, GY - 176);
      g.fillStyle = C.card;
      K.rr(g, 40, 120, 64, 56, 5); g.fill(); g.stroke();
      g.lineWidth = 2.2;
      g.beginPath(); g.arc(62, 146, 14, 0, 6.2832); g.stroke();
      g.beginPath(); g.arc(80, 146, 14, 0, 6.2832); g.stroke();
      g.fillStyle = C.ink;
      g.beginPath(); g.arc(XP, 172, 3, 0, 6.2832); g.fill();
    }
    function drawMachine(g, spin) {
      g.save();
      shadow(g, 350, 262, 100, 88, 4);
      g.fillStyle = C.steel; g.strokeStyle = C.ink; g.lineWidth = 2.6;
      K.rr(g, 350, 262, 100, 88, 4); g.fill(); g.stroke();
      g.fillStyle = C.card; g.lineWidth = 2.2;
      g.beginPath(); g.arc(405, 306, 16, 0, 6.2832); g.fill(); g.strokeStyle = C.ink2; g.stroke();
      g.lineWidth = 2.4;
      for (var j = 0; j < 3; j++) {
        var a = spin + j * 2.0944;
        g.beginPath(); g.moveTo(405, 306); g.lineTo(405 + Math.cos(a) * 12, 306 + Math.sin(a) * 12); g.stroke();
      }
      g.restore();
    }
    function drawBoxes(g, tripped) {
      g.save();
      g.fillStyle = C.card; g.strokeStyle = C.ink2; g.lineWidth = 2;
      K.rr(g, 196, 212, 60, 50, 4); g.fill(); g.stroke();
      K.rr(g, 196, 306, 60, 36, 4); g.fill(); g.stroke();
      g.strokeStyle = C.ink; g.lineWidth = 3; g.lineCap = 'round';
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
        g.fillStyle = C.copText; g.fillRect(x - 4, 370, 8, ROD_END - 370);
        g.fillStyle = 'rgba(255,255,255,.22)'; g.fillRect(x - 3, 370, 2, ROD_END - 370);
      });
      g.fillStyle = C.copText;
      g.fillRect(XL - 4, GY + 2, 8, 430 - GY - 2);
      g.restore();
      strokePoly(g, ZH, C.grey, 2.4); strokePoly(g, ZP, C.grey, 2.4);
      strokePoly(g, [[XP, SOIL_Y], [XH, SOIL_Y]], C.grey, 1.6, [3, 5]);
    }
    function drawWires(g, faultStub) {
      strokePoly(g, [[XP, 172], [XP, 370]], C.neut, 3.4);
      strokePoly(g, PHASE, C.phase, 3.8);
      strokePoly(g, NEUT, C.neut, 3.8);
      peLine(g, PE_CABLE, 4.6); peLine(g, PE_BUS, 4.6);
      g.fillStyle = C.pe2;
      g.beginPath(); g.arc(350, 332, 4.4, 0, 6.2832); g.fill();
      if (faultStub > 0.01) {
        g.save(); g.globalAlpha *= faultStub;
        strokePoly(g, [[372, 306], [372, 270]], C.phase, 3.8, [4, 3]);
        K.drawGlow(g, '#F7C867', 372, 264, 34, 0.9);
        g.strokeStyle = C.lamp; g.lineWidth = 2.8; g.lineCap = 'round';
        for (var j = 0; j < 6; j++) {
          var a = j * 1.0472 + 0.3;
          g.beginPath(); g.moveTo(372 + Math.cos(a) * 5, 264 + Math.sin(a) * 5);
          g.lineTo(372 + Math.cos(a) * 12, 264 + Math.sin(a) * 12); g.stroke();
        }
        g.restore();
      }
    }

    function normalDots(g, a) {
      if (a <= 0.01) return;
      var amp = K.reducedMotion ? 0 : 16 * Math.sin(6.2832 * tt / 2.4);
      var k;
      for (k = 0; k < PP.len / 30; k++) { PP.at(k * 30 + 12 + amp, Q); dot(g, Q.x, Q.y, 4.4, C.blue, a); }
      for (k = 0; k < PN.len / 30; k++) { PN.at(k * 30 + 12 - amp, Q); dot(g, Q.x, Q.y, 4.4, C.blue, a); }
    }
    function faultCurrent(g, loc, a) {
      if (a <= 0.01) return;
      var head = clamp((loc - 0.9) / 1.5, 0, 1) * PF.len;
      if (head <= 1) return;
      var seg = [], s, step = 6;
      for (s = 0; s <= head; s += step) { PF.at(s, Q); seg.push([Q.x, Q.y]); }
      g.save(); g.globalAlpha *= a;
      strokePoly(g, seg, 'rgba(200,105,58,.28)', 10, null, 'round');
      g.restore();
      var sp = 26, off = K.reducedMotion ? 0 : (tt * 190) % sp;
      for (s = off; s < head; s += sp) { PF.at(s, Q); dot(g, Q.x, Q.y, 4.8, C.cop, a); }
    }
    function lightning(g, loc, a) {
      if (a <= 0.01) return;
      var flash = (loc > 0.6 && loc < 1.15) ? (Math.sin(loc * 70) > -0.3 ? 1 : 0.6) : 0;
      var cloud = [[440, 72, 20], [470, 62, 26], [502, 66, 22], [524, 76, 16], [452, 80, 16], [496, 80, 16]];
      g.save(); g.globalAlpha *= a;
      g.fillStyle = '#D3D6DC'; g.strokeStyle = C.ink2; g.lineWidth = 2;
      cloud.forEach(function (c) { g.beginPath(); g.arc(c[0], c[1], c[2], 0, 6.2832); g.fill(); g.stroke(); });
      cloud.forEach(function (c) { g.beginPath(); g.arc(c[0], c[1], c[2] - 1, 0, 6.2832); g.fill(); });
      g.restore();
      if (flash > 0) {
        var bolt = [[440, 88], [424, 98], [432, 100], [404, 110], [412, 112], [372, 118]];
        g.save(); g.globalAlpha *= a * flash;
        K.drawGlow(g, '#F7C867', 410, 104, 60, 0.9);
        strokePoly(g, bolt, 'rgba(120,150,255,.55)', 9, null, 'round');
        strokePoly(g, bolt, '#FFFFFF', 3.6, null, 'round');
        g.restore();
      }
      var t0 = loc - 1.0;
      if (t0 > 0 && loc < 8.5) {
        var fa = a * (1 - clamp((loc - 7.8) / 0.7, 0, 1)), s, off = K.reducedMotion ? 0 : (tt * 150) % 24;
        for (s = off; s < PC.len; s += 24) { PC.at(s, Q); dot(g, Q.x, Q.y, 4, C.blue, fa); }
      }
    }
    function rings(g, loc, a) {
      if (a <= 0.01 || loc < 1.4) return;
      var LIFE = 3.2, N = 3, k, age, r, th, fa;
      var fade = a * (1 - clamp((loc - 7.8) / 0.9, 0, 1)) * clamp((loc - 1.4) / 0.4, 0, 1);
      g.save();
      g.beginPath(); g.rect(-400, GY + 1, 1500, 520 - GY); g.clip();
      for (k = 0; k < N; k++) {
        age = K.reducedMotion ? (0.4 + k * 0.9) : (((loc - 1.4) - k * LIFE / N) % LIFE + LIFE) % LIFE;
        r = 20 + 105 * (age / LIFE);
        fa = fade * (1 - age / LIFE) * 0.95;
        if (fa <= 0.02) continue;
        g.strokeStyle = C.blue; g.globalAlpha = fa * 0.5; g.lineWidth = 1.8;
        g.beginPath(); g.arc(XL, 430, r, 0, Math.PI); g.stroke();
        g.globalAlpha = 1;
        for (th = 12; th <= 168; th += 26) {
          var an = th * Math.PI / 180, ca = Math.cos(an), sa = Math.sin(an);
          K.arrow(g, XL + ca * (r - 12), 430 + sa * (r - 12), XL + ca * (r + 4), 430 + sa * (r + 4),
            { color: C.blue, width: 2.6, head: 9, alpha: fa });
        }
      }
      g.restore();
    }
    function drawPerson(g, a) {
      if (a <= 0.01) return;
      g.save(); g.globalAlpha *= a;
      g.strokeStyle = C.ink2; g.lineWidth = 3.4; g.lineCap = 'round';
      g.beginPath();
      g.moveTo(508, 291); g.lineTo(508, 325);
      g.moveTo(508, 325); g.lineTo(498, 349); g.moveTo(508, 325); g.lineTo(518, 349);
      g.moveTo(508, 300); g.lineTo(452, 306);
      g.stroke();
      g.fillStyle = C.card; g.beginPath(); g.arc(508, 282, 9, 0, 6.2832); g.fill(); g.stroke();
      g.restore();
    }

    function drawScene(g, loc, a) {
      var tripAt = 3.6;
      var tripped = view === 'ariza' && loc >= tripAt ? 1 : 0;
      var faultOn = clamp((loc - 0.4) / 0.4, 0, 1) * A.ariza;
      var flowA = A.ariza * (loc < tripAt ? 1 : 1 - clamp((loc - tripAt) / 0.4, 0, 1));
      var spin = (view === 'ariza' && loc >= tripAt) ? 0.6 : tt * 3;

      // toprak (tasarım uzayında, tam genişlik)
      g.save(); g.globalAlpha = a;
      g.fillStyle = C.soil; g.fillRect(0, GYD, DW, DH - GYD);
      g.fillStyle = C.soilDot;
      for (var j = 0; j < stip.length; j++) { g.beginPath(); g.arc(stip[j][0], stip[j][1], stip[j][2], 0, 6.2832); g.fill(); }
      g.strokeStyle = C.ink2; g.lineWidth = 2;
      g.beginPath(); g.moveTo(0, GYD + 0.5); g.lineTo(DW, GYD + 0.5); g.stroke();
      g.restore();

      g.save();
      g.globalAlpha = a;
      g.translate(OX, OY); g.scale(S, S);
      drawHouse(g);
      drawPole(g);
      drawMachine(g, spin);
      drawBoxes(g, tripped);
      drawRods(g);
      drawWires(g, faultOn);
      normalDots(g, A.normal * 0.95);
      faultCurrent(g, loc, flowA);
      g.save(); g.globalAlpha *= 0.55 + 0.45 * A.yildirim;
      strokePoly(g, CONDUCTOR, C.copText, 3.4, null, 'round');
      g.fillStyle = C.copText;
      g.beginPath(); g.moveTo(365, 110); g.lineTo(360, 124); g.lineTo(370, 124); g.closePath(); g.fill();
      g.restore();
      lightning(g, loc, A.yildirim);
      rings(g, loc, A.yildirim);
      drawPerson(g, A.ariza * clamp((loc - 1.0) / 0.4, 0, 1));
      g.restore();

      // sağ sütun etiketleri
      var an = a;
      lab(g, ['faz ve nötr tel', 'akım ileri geri titreşir'], 80, 200, 232, C.phase, A.normal * an);
      lab(g, ['toprak teli (PE)', 'normalde akım geçmez'], 160, 288, 332, C.pe2, A.normal * an);
      lab(g, ['metal gövde ≈ 0 V'], 240, 440, 290, C.ink, A.normal * an);

      lab(g, ['faz teli gövdeye değdi'], 80, 372, 264, C.copText, A.ariza * an * clamp((loc - 0.3) / 0.4, 0, 1));
      lab(g, ['toprak teli akıma', 'kolay yol açar'], 150, 226, 354, C.pe2, A.ariza * an * clamp((loc - 1.2) / 0.5, 0, 1));
      lab(g, ['kaçak akım rölesi atar'], 225, 256, 236, C.ink, A.ariza * an * clamp((loc - tripAt) / 0.4, 0, 1));
      lab(g, ['gövde ≈ 0 V:', 'kişi güvende'], 280, 508, 300, C.blue, A.ariza * an * clamp((loc - tripAt - 0.4) / 0.5, 0, 1));

      lab(g, ['paratoner'], 70, 365, 114, C.copText, A.yildirim * an);
      lab(g, ['kalın iletken', 'yükü toprağa indirir'], 150, 556, 250, C.copText, A.yildirim * an * clamp((loc - 1.0) / 0.5, 0, 1));
      lab(g, ['toprak yükü yayar', 'potansiyeli neredeyse sabit'], 232, 580, 440, C.blue, A.yildirim * an * clamp((loc - 1.6) / 0.5, 0, 1));
    }

    /* ---------- görünüm: neden (dört neden, sırayla) ---------- */
    function drawIcon(g, k, cx, cy, on, loc) {
      var j;
      g.save();
      if (k === 0) {                       // her yerde: toprak üstünde evler, altında çubuklar
        g.fillStyle = C.soil; g.fillRect(cx - 105, cy + 30, 210, 56);
        g.strokeStyle = C.ink2; g.lineWidth = 2;
        g.beginPath(); g.moveTo(cx - 105, cy + 30.5); g.lineTo(cx + 105, cy + 30.5); g.stroke();
        for (j = -1; j <= 1; j++) {
          var hx = cx + j * 70;
          g.fillStyle = C.card; g.strokeStyle = C.ink2; g.lineWidth = 2;
          g.fillRect(hx - 24, cy - 8, 48, 38); g.strokeRect(hx - 24, cy - 8, 48, 38);
          g.fillStyle = C.roof;
          g.beginPath(); g.moveTo(hx - 30, cy - 8); g.lineTo(hx, cy - 34); g.lineTo(hx + 30, cy - 8); g.closePath(); g.fill(); g.stroke();
          g.fillStyle = C.copText; g.fillRect(hx - 3, cy + 30, 6, 40);
        }
      } else if (k === 1) {                // çok büyük: yer küresi, ortasında yayılan halkalar
        g.save();
        g.beginPath(); g.arc(cx, cy + 20, 84, 0, 6.2832); g.clip();
        g.fillStyle = C.soil; g.fillRect(cx - 90, cy - 70, 180, 180);
        for (j = 0; j < 3; j++) {
          var age = K.reducedMotion ? j * 0.3 : (((loc / 2.6) + j / 3) % 1);
          g.strokeStyle = C.blue; g.lineWidth = 2.4; g.globalAlpha = (1 - age) * 0.9;
          g.beginPath(); g.arc(cx, cy - 56, 8 + age * 110, 0, 6.2832); g.stroke();
        }
        g.restore();
        g.strokeStyle = C.ink2; g.lineWidth = 2.4;
        g.beginPath(); g.arc(cx, cy + 20, 84, 0, 6.2832); g.stroke();
        g.fillStyle = C.lamp; g.strokeStyle = C.ink2; g.lineWidth = 2;
        g.beginPath(); g.moveTo(cx + 4, cy - 100); g.lineTo(cx - 10, cy - 76); g.lineTo(cx, cy - 76); g.lineTo(cx - 6, cy - 54); g.lineTo(cx + 12, cy - 82); g.lineTo(cx + 2, cy - 82); g.closePath(); g.fill(); g.stroke();
      } else if (k === 2) {                // nemli toprak: su damlaları ve hareket eden iyonlar
        g.fillStyle = C.soil; g.fillRect(cx - 100, cy - 60, 200, 130);
        g.strokeStyle = C.ink2; g.lineWidth = 2; g.strokeRect(cx - 100, cy - 60, 200, 130);
        g.fillStyle = 'rgba(35,67,176,.28)';
        var dr = [[-70, -30], [-30, 30], [10, -40], [50, 20], [-60, 40], [70, -20], [30, 52], [-10, 4]];
        for (j = 0; j < dr.length; j++) { g.beginPath(); g.arc(cx + dr[j][0], cy + dr[j][1], 9, 0, 6.2832); g.fill(); }
        var ph = K.reducedMotion ? 0.3 : (loc / 4) % 1;
        for (j = 0; j < 4; j++) {
          var u = (ph + j / 4) % 1;
          dot(g, cx - 90 + u * 180, cy - 10 + (j % 2) * 40, 8, C.cop, 1);
          dot(g, cx + 90 - u * 180, cy + 10 - (j % 2) * 40 + 20, 8, C.blue, 1);
        }
      } else {                             // tarihsel: iki direk, tel ve toprak üzerinden dönüş
        g.fillStyle = C.soil; g.fillRect(cx - 110, cy + 40, 220, 40);
        g.strokeStyle = C.ink2; g.lineWidth = 2;
        g.beginPath(); g.moveTo(cx - 110, cy + 40.5); g.lineTo(cx + 110, cy + 40.5); g.stroke();
        [-80, 80].forEach(function (dx) {
          g.fillStyle = '#B8BCC6'; g.fillRect(cx + dx - 5, cy - 60, 10, 100); g.strokeRect(cx + dx - 5, cy - 60, 10, 100);
          g.fillStyle = C.ink2; g.fillRect(cx + dx - 18, cy - 60, 36, 6);
          g.fillStyle = C.copText; g.fillRect(cx + dx - 3, cy + 40, 6, 34);
        });
        g.strokeStyle = C.phase; g.lineWidth = 3;
        g.beginPath(); g.moveTo(cx - 80, cy - 54); g.lineTo(cx + 80, cy - 54); g.stroke();
        var p2 = K.reducedMotion ? 0.3 : (loc / 3) % 1;
        for (j = 0; j < 5; j++) {
          var w = (p2 + j / 5) % 1;
          dot(g, cx - 80 + w * 160, cy - 54, 6, C.blue, 1);
          dot(g, cx + 80 - w * 160, cy + 60, 6, C.blue, 0.8);
        }
      }
      g.restore();
    }
    function drawNeden(g, loc, a) {
      if (a <= 0.01) return;
      var act = K.reducedMotion ? 0 : Math.floor(loc / 3) % 4, k;
      var tin = K.reducedMotion ? 1 : (loc % 3);
      for (k = 0; k < 4; k++) {
        var cx = 140 + k * 280, on = k === act, al = a * (on ? 1 : 0.32);
        if (on) {
          g.save(); g.globalAlpha = a * clamp(tin / 0.4, 0, 1) * 0.9;
          g.fillStyle = 'rgba(35,67,176,.07)';
          K.rr(g, cx - 136, 52, 272, 340, 14); g.fill();
          g.strokeStyle = C.blue; g.lineWidth = 2;
          K.rr(g, cx - 136, 52, 272, 340, 14); g.stroke();
          g.restore();
        }
        g.save(); g.globalAlpha = al; drawIcon(g, k, cx, 160, on, loc); g.restore();
        txt(g, REASONS[k][0], cx, 296, { size: 24, weight: 700, color: C.ink, align: 'center', alpha: al });
        if (on) {
          var fa = a * clamp((tin - 0.2) / 0.4, 0, 1);
          txt(g, REASONS[k][1], cx, 332, { size: 17, weight: 500, color: C.ink2, align: 'center', alpha: fa });
          txt(g, REASONS[k][2], cx, 356, { size: 17, weight: 500, color: C.ink2, align: 'center', alpha: fa });
        }
      }
    }

    /* ---------- görünüm: gnd (iki ayrı toprak) ---------- */
    function drawGnd(g, loc, a) {
      if (a <= 0.01) return;
      var left = K.reducedMotion ? 1 : (loc < 5 ? 1 : 0.0);
      var aL = a * (0.45 + 0.55 * (loc < 5 ? 1 : 0.0)), aR = a * (0.45 + 0.55 * (loc < 5 ? 0.0 : 1));
      var ph = 0, i;
      /* sol: pilli devre, GND yere bağlı değil */
      g.save(); g.globalAlpha = aL;
      var bx = 120, by0 = 190, by1 = 300, tY = 160, bY = 330, lx = 400, ly = 245;
      var path = [[bx, by0], [bx, tY], [lx, tY], [lx, ly - 34], [lx, ly + 34], [lx, bY], [bx, bY], [bx, by1]];
      strokePoly(g, [[bx, by0], [bx, tY], [lx, tY], [lx, ly - 34]], C.wireO, 15);
      strokePoly(g, [[lx, ly + 34], [lx, bY], [bx, bY], [bx, by1]], C.wireO, 15);
      strokePoly(g, [[bx, by0], [bx, tY], [lx, tY], [lx, ly - 34]], C.wireI, 10);
      strokePoly(g, [[lx, ly + 34], [lx, bY], [bx, bY], [bx, by1]], C.wireI, 10);
      // pil
      shadow(g, bx - 36, by0, 72, by1 - by0, 8);
      g.fillStyle = C.ink2; K.rr(g, bx - 13, by0 - 11, 26, 13, 3); g.fill();
      g.fillStyle = C.card; g.strokeStyle = C.ink2; g.lineWidth = 2;
      K.rr(g, bx - 36, by0, 72, by1 - by0, 8); g.fill(); g.stroke();
      g.fillStyle = 'rgba(200,105,58,.16)'; g.fillRect(bx - 35, by0 + 1, 70, 54);
      g.fillStyle = 'rgba(35,67,176,.12)'; g.fillRect(bx - 35, by0 + 55, 70, 54);
      txt(g, '+', bx, by0 + 40, { size: 34, weight: 600, color: C.copText, align: 'center' });
      txt(g, '−', bx, by1 - 14, { size: 34, weight: 600, color: C.blue, align: 'center' });
      // lamba
      K.drawGlow(g, '#F7C867', lx, ly, 90, 0.5);
      g.fillStyle = C.lamp; g.beginPath(); g.arc(lx, ly, 36, 0, 6.2832); g.fill();
      g.fillStyle = 'rgba(255,255,255,.45)'; g.beginPath(); g.arc(lx, ly, 25, 0, 6.2832); g.fill();
      g.strokeStyle = C.ink2; g.lineWidth = 2.4; g.beginPath(); g.arc(lx, ly, 36, 0, 6.2832); g.stroke();
      g.strokeStyle = C.fil || '#D98A2B'; g.lineWidth = 4.5; g.beginPath(); g.moveTo(lx, ly - 30); g.lineTo(lx, ly + 30); g.stroke();
      // akım noktaları (geleneksel yön: artıdan eksiye)
      var loopPts = [[bx, by0], [bx, tY], [lx, tY], [lx, bY], [bx, bY], [bx, by1]];
      var pl = new Poly(loopPts), n = Math.round(pl.len / 40);
      for (i = 0; i < n; i++) {
        var s = ((i * pl.len / n) + (K.reducedMotion ? 0 : tt * 50)) % pl.len;
        pl.at(s, Q);
        if (Math.abs(Q.x - lx) < 1 && Q.y > ly - 38 && Q.y < ly + 38) continue;
        dot(g, Q.x, Q.y, 5.4, C.cop, 1);
      }
      // GND işareti: eksi uçtan alta, yere varmaz
      strokePoly(g, [[bx, bY], [bx, 372]], C.ink, 3, null, 'round');
      g.save(); g.strokeStyle = C.ink; g.lineWidth = 3; g.lineCap = 'round';
      [36, 24, 12].forEach(function (w, q) { g.beginPath(); g.moveTo(bx - w / 2, 376 + q * 8); g.lineTo(bx + w / 2, 376 + q * 8); g.stroke(); });
      g.restore();
      g.restore();
      txt(g, 'devre toprağı (GND)', 60, 58, { size: 24, weight: 700, color: C.ink, alpha: aL });
      txt(g, 'pilin eksi ucu: referans noktası,', 60, 92, { size: 18, weight: 500, color: C.ink2, alpha: aL });
      txt(g, 'yere bağlı değil', 60, 114, { size: 18, weight: 500, color: C.ink2, alpha: aL });
      if (loc < 5) {
        for (i = 0; i < 2; i++) {
          var u = ((tt / 2.2) + i * 0.5) % 1;
          g.save(); g.globalAlpha = a * (1 - u) * 0.7; g.strokeStyle = C.ink; g.lineWidth = 3;
          g.beginPath(); g.arc(bx, 384, 26 + u * 22, 0, 6.2832); g.stroke(); g.restore();
        }
      }

      /* sağ: çamaşır makinesi, PE teli, toprak */
      g.save(); g.globalAlpha = aR;
      var gy = 340;
      g.fillStyle = C.soil; g.fillRect(600, gy, 480, 100);
      g.strokeStyle = C.ink2; g.lineWidth = 2; g.beginPath(); g.moveTo(600, gy + 0.5); g.lineTo(1080, gy + 0.5); g.stroke();
      g.fillStyle = C.soilDot;
      for (i = 0; i < 40; i++) { g.beginPath(); g.arc(612 + (i * 97) % 460, gy + 12 + (i * 53) % 80, 1.6, 0, 6.2832); g.fill(); }
      shadow(g, 740, 150, 150, 150, 6);
      g.fillStyle = C.steel; g.strokeStyle = C.ink; g.lineWidth = 2.8;
      K.rr(g, 740, 150, 150, 150, 6); g.fill(); g.stroke();
      g.fillStyle = C.card; g.strokeStyle = C.ink2; g.lineWidth = 2.4;
      g.beginPath(); g.arc(815, 232, 34, 0, 6.2832); g.fill(); g.stroke();
      g.lineWidth = 2.6;
      for (i = 0; i < 3; i++) { var an = (K.reducedMotion ? 0.6 : tt * 3) + i * 2.0944; g.beginPath(); g.moveTo(815, 232); g.lineTo(815 + Math.cos(an) * 24, 232 + Math.sin(an) * 24); g.stroke(); }
      g.fillStyle = C.copText; g.fillRect(815 - 5, gy + 6, 10, 82);
      var pe = [[815, 300], [815, gy + 6]];
      peLine(g, [[740, 275], [700, 275], [700, gy + 20], [815, gy + 20]], 5);
      peLine(g, [[815, 300], [815, gy + 20]], 5);
      g.restore();
      txt(g, 'koruma topraklaması (PE)', 640, 58, { size: 24, weight: 700, color: C.ink, alpha: aR });
      txt(g, 'metal gövdeyi gerçek toprağa', 640, 92, { size: 18, weight: 500, color: C.ink2, alpha: aR });
      txt(g, 'bağlayan güvenlik teli', 640, 114, { size: 18, weight: 500, color: C.ink2, alpha: aR });
      if (loc >= 5) {
        for (i = 0; i < 2; i++) {
          var u2 = ((tt / 2.2) + i * 0.5) % 1;
          g.save(); g.globalAlpha = a * (1 - u2) * 0.7; g.strokeStyle = C.pe2; g.lineWidth = 3;
          g.beginPath(); g.ellipse(815, gy + 60, 30 + u2 * 30, 14 + u2 * 14, 0, 0, 6.2832); g.stroke(); g.restore();
        }
      }
      // ayraç
      g.save(); g.globalAlpha = a; g.strokeStyle = C.line2; g.lineWidth = 1.5; g.setLineDash([4, 6]);
      g.beginPath(); g.moveTo(560, 50); g.lineTo(560, 420); g.stroke(); g.restore();
    }

    /* ---------- kare ---------- */
    function frame(t, dt) {
      var g = sf.ctx, W = sf.w, H = sf.h;
      lastT = t;
      var loc;
      if (auto && !K.reducedMotion) {
        var seq = STORY[story], total = 0, j;
        for (j = 0; j < seq.length; j++) total += DUR[seq[j]];
        var m = t % total;
        for (j = 0; j < seq.length; j++) { if (m < DUR[seq[j]]) break; m -= DUR[seq[j]]; }
        view = seq[Math.min(j, seq.length - 1)];
        loc = m;
      } else if (K.reducedMotion) {
        loc = view === 'ariza' ? 2.6 : view === 'yildirim' ? 3 : view === 'gnd' ? 2 : 2;
      } else {
        loc = ((t - viewT0) % DUR[view] + DUR[view]) % DUR[view];
      }
      tt = K.reducedMotion ? 2 : t;
      var T = targets(view), rate = 1 - Math.exp(-9 * Math.max(dt, 0.0001)), key;
      for (key in T) A[key] += (T[key] - A[key]) * rate;
      var sa = K.reducedMotion ? 1 : clamp(loc / 0.4, 0, 1) * clamp((DUR[view] - loc) / 0.4, 0, 1);
      var scn = (A.normal + A.ariza + A.yildirim) * sa;

      sf.clear();
      g.save();
      var s = Math.min(W / DW, H / DH);
      g.translate((W - DW * s) / 2, (H - DH * s) / 2);
      g.scale(s, s);

      if (scn > 0.01) drawScene(g, loc, clamp(scn, 0, 1));
      drawNeden(g, loc, A.neden * sa);
      drawGnd(g, loc, A.gnd * sa);
      tag(g, 'ölçekli değil · basitleştirilmiş model', DW - 24, 24);

      g.restore();
    }

    return {
      reset: function () { resetState(); },
      frame: frame,
      set: function (key, val) {
        if (key === 'view' && VIEWS.indexOf(val) >= 0) { view = val; auto = false; viewT0 = lastT; }
        else if (key === 'story' && STORY[val]) { story = val; auto = true; view = STORY[val][0]; }
      },
      read: function (key) {
        if (key === 'explain') return EXPLAIN[view];
        if (key === 'view') return view;
        if (key === 'story') return story;
        return '';
      },
      resize: function () { sf.resize(); },
      dispose: function () { sf.dispose(); }
    };
  });
})();
