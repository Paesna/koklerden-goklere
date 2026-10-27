/* Köklerden Göklere · ölçü aletleri
 * meter-lab · odak slayt (1120×440 sanal sahne, ölçeklenir) · açık/koyu tema (2B)
 * Sabit devre: 9 V pil + 450 Ω direnç (9 V ÷ 450 Ω = 0,02 A = 20 mA).
 * Görünümler: voltmetre (paralel), ampermetre (seri), ohmmetre (parça ayrı, güç yok),
 * yanlis (sembolik uyarı: ampermetre pile paralel), multimetre (kadran ve girişler).
 * Sözleşme: kg-viz.js. Tüm hareket frame(t, dt) içinden sürülür, rastgelelik yok.
 */
(function () {
  'use strict';
  var K = window.KGViz;
  if (!K) return;
  var P = K.palette;
  var clamp = K.clamp;

  var VIEWS = ['voltmetre', 'ampermetre', 'ohmmetre', 'yanlis', 'multimetre'];
  var TABS = ['voltmetre', 'ampermetre', 'ohmmetre', 'yanlış', 'multimetre'];
  var AUTO = ['voltmetre', 'ampermetre', 'ohmmetre', 'multimetre'];
  var DEMO = 8;          // her görünüm için saniye
  var DIAL_STEP = 1.3;   // multimetre kadranı her konumda bekleme süresi
  var FUSE_AT = 3.0;     // yanlış görünümde sigortanın attığı an (s)

  var VW = 1120, VH = 440;
  var EXPLAIN = {
    voltmetre: 'Voltmetre devreye paralel bağlanır; iç direnci çok büyük olduğu için devreyi bozmaz.',
    ampermetre: 'Ampermetre seri bağlanır: devre açılır, tüm akım aletin içinden geçer; iç direnci çok küçüktür.',
    ohmmetre: 'Ohmmetre kendi küçük akımını gönderir: güç kapalı olmalı, parça devreden ayrı olmalı.',
    yanlis: 'Ampermetreyi pile paralel bağlamak kısa devredir ve sigorta atar. Gerçekte denenmez.',
    multimetre: 'Multimetre tek alette üç ölçer: kadran neyi ölçeceğini, giriş jakı kablonun yerini belirler.'
  };
  var NOTE = {
    voltmetre: 'paralel: devre kapalı kalır',
    ampermetre: 'seri: devre açılıp araya girilir',
    ohmmetre: 'güç kapalı, parça ayrı',
    yanlis: 'sembolik gösterim, deney değil',
    multimetre: 'prizi yalnızca elektrikçi ölçer'
  };
  var READING = { voltmetre: '9,00 V', ampermetre: '20,0 mA', ohmmetre: '450 Ω', yanlis: 'aşırı akım' };
  var NUMBERS = {
    voltmetre: '9 V ÷ 450 Ω = 0,02 A = 20 mA',
    ampermetre: '9 V ÷ (450 Ω + 1 Ω) = 19,96 mA ≈ 20,0 mA',
    ohmmetre: '9 V ÷ 0,02 A = 450 Ω',
    yanlis: '9 V ÷ 1 Ω = 9 A (devrede 20 mA yerine)'
  };

  /* multimetre kadranı: simge, ad, örnek, ekran, ekran etiketi, giriş (0 = VΩ, 1 = mA/A) */
  var DIAL = [
    { sym: 'dc', name: 'doğru gerilim', sub: 'pil, adaptör çıkışı, USB', show: '9,00 V', tag: 'DC', jack: 0 },
    { sym: 'ac', name: 'alternatif gerilim', sub: 'yönü sürekli değişen gerilim', show: '6,00 V', tag: 'AC', jack: 0 },
    { sym: 'A', name: 'akım', sub: 'devreye seri bağlanır', show: '20,0 mA', tag: 'DC', jack: 1 },
    { sym: 'ohm', name: 'direnç', sub: 'güç kapalı, parça devreden ayrı', show: '450 Ω', tag: '', jack: 0 },
    { sym: 'diode', name: 'diyot testi', sub: 'tek yön: ileri yönde yaklaşık 0,6 V', show: '0,62 V', tag: 'diyot', jack: 0 },
    { sym: 'cont', name: 'süreklilik', sub: 'uçlar arası bağlıysa bip sesi', show: '0,3 Ω', tag: 'bip', jack: 0 }
  ];
  var DIAL_ANG = [-90, -30, 30, 90, 150, 210];

  /* devre geometrisi (CSS px, 680×520) */
  var XB = 150, XR = 970, YT = 235, YB = 395;      // pil teli, sağ tel, üst tel, alt tel
  var RX0 = 700, RX1 = 900;                        // direnç uçları (tel noktaları)
  var RXC = 800, RYAWAY = 315;                     // direncin merkezi, ayrılmış yeri
  var BOXW = 280, BOXH = 146;
  var BAT_Y0 = 298, BAT_Y1 = 326;                  // pil plakaları

  var KEYS = ['bx', 'by', 'rjx', 'rjy', 'bjx', 'bjy', 'rtx', 'rty', 'btx', 'bty', 'rsx', 'rsy', 'bsx', 'bsy',
    'lead', 'gap', 'away', 'mm', 'dm', 'dy', 'dohm'];
  function mk(a) { var o = {}; for (var i = 0; i < KEYS.length; i++) o[KEYS[i]] = a[i]; return o; }
  var TG = {
    //            bx   by   rjx  rjy  bjx bjy  rtx  rty  btx  bty  rsx  rsy bsx bsy lead gap away mm dm dy dohm
    voltmetre:  mk([800, 98, -50, 64, 50, 64, 700, 235, 900, 235, -22, 0, 22, 0, 1, 0, 0, 0, 1, 0, 0]),
    ampermetre: mk([420, 235, -140, 0, 140, 0, 700, 235, 900, 235, -22, 0, 22, 0, 0, 1, 0, 0, 1, 0, 0]),
    ohmmetre:   mk([800, 98, -50, 64, 50, 64, 700, 315, 900, 315, -12, 0, 12, 0, 1, 0, 1, 0, 0, 0, 1]),
    yanlis:     mk([400, 312, -140, -26, -140, 26, 150, 268, 150, 360, 0, -22, 0, 22, 1, 0, 0, 0, 0.5, 1, 0]),
    multimetre: mk([800, 98, -50, 64, 50, 64, 700, 235, 900, 235, -22, 0, 22, 0, 0, 0, 0, 1, 0, 0, 0])
  };

  /* ---------- yol yardımcıları ---------- */
  function mkPath(pts) {
    var segs = [], L = 0;
    for (var i = 0; i < pts.length - 1; i++) {
      var l = Math.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1]);
      segs.push(l); L += l;
    }
    return { pts: pts, segs: segs, L: L };
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
  /* ikinci dereceden eğri örnekleri: (j) → (t), orta nokta (sx, sy) kadar kaydırılır */
  function curve(jx, jy, tx, ty, sx, sy) {
    var cx = (jx + tx) / 2 + sx * 2, cy = (jy + ty) / 2 + sy * 2, out = [];
    for (var i = 0; i <= 14; i++) {
      var u = i / 14, w = 1 - u;
      out.push([w * w * jx + 2 * w * u * cx + u * u * tx, w * w * jy + 2 * w * u * cy + u * u * ty]);
    }
    return out;
  }
  var MAIN = mkPath([[XB, BAT_Y0 - 2], [XB, YT], [XR, YT], [XR, YB], [XB, YB], [XB, BAT_Y1 + 2]]);

  K.register('meter-lab', function (el, opts) {
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
      copText: dark ? P.copperLight : '#A64B22',
      copSoft: dark ? 'rgba(227,154,108,.16)' : P.copperSoft,
      wireO: dark ? '#4A5160' : '#B8BCC6',
      wireI: dark ? '#222836' : '#E6E6E0',
      card: dark ? '#161B26' : '#FFFFFF',
      lcd: dark ? '#202733' : '#E6E9DC',
      dial: dark ? '#202733' : '#ECECE5',
      bg: dark ? P.night : P.paper,
      red: dark ? '#E0675B' : '#B3342A',
      blk: dark ? '#9AA3B2' : '#15171C'
    };

    var v, auto, vt, disp, ph1, ph2, ph3, cur, la, mmN;
    function resetState() {
      v = K.reducedMotion ? 'voltmetre' : 'voltmetre';
      auto = !K.reducedMotion;
      vt = K.reducedMotion ? 4 : 0;
      disp = K.reducedMotion ? 9 : 0;
      ph1 = ph2 = ph3 = 0;
      cur = {};
      for (var i = 0; i < KEYS.length; i++) cur[KEYS[i]] = TG.voltmetre[KEYS[i]];
      la = { voltmetre: 1, ampermetre: 0, ohmmetre: 0, yanlis: 0 };
    }
    resetState();
    function enter(nv) {
      if (nv === v) return;
      v = nv; vt = 0; disp = 0;
      if (K.reducedMotion) { for (var i = 0; i < KEYS.length; i++) cur[KEYS[i]] = TG[v][KEYS[i]]; }
    }

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
      for (var i = 0; i < VIEWS.length; i++) {
        var w = g.measureText(TABS[i]).width + 22, on = VIEWS[i] === v;
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

    /* tel: dış çizgi + iç dolgu */
    function run(g, pts, a, dash) {
      g.save();
      g.globalAlpha *= a;
      g.lineJoin = 'round'; g.lineCap = 'butt';
      g.beginPath(); g.moveTo(pts[0][0], pts[0][1]);
      for (var i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]);
      if (dash) {
        g.setLineDash([8, 8]); g.strokeStyle = C.wireO; g.lineWidth = 4; g.stroke();
      } else {
        g.strokeStyle = C.wireO; g.lineWidth = 12; g.stroke();
        g.strokeStyle = C.wireI; g.lineWidth = 7; g.stroke();
      }
      g.restore();
    }

    function dots(g, p, phase, a, gap, r) {
      if (a <= 0.02 || p.L < 12) return;
      var n = Math.max(1, Math.round(p.L / gap)), sp = p.L / n;
      g.save();
      g.fillStyle = C.cop;
      for (var i = 0; i < n; i++) {
        var s = ((i * sp + phase) % p.L + p.L) % p.L;
        at(p, s);
        g.globalAlpha = clamp(Math.min(s, p.L - s) / 14, 0, 1) * a;
        g.beginPath(); g.arc(PT.x, PT.y, r, 0, 6.2832); g.fill();
      }
      g.restore();
    }
    function dotsLoop(g, p, phase, a, gap, r) {
      if (a <= 0.02) return;
      var n = Math.max(1, Math.round(p.L / gap)), sp = p.L / n;
      g.save();
      g.fillStyle = C.card; g.strokeStyle = C.cop; g.lineWidth = 2; g.globalAlpha *= a;
      for (var i = 0; i < n; i++) {
        at(p, ((i * sp + phase) % p.L + p.L) % p.L);
        if (PT.x > RXC - 70 && PT.x < RXC + 70 && PT.y > RYAWAY - 26 && PT.y < RYAWAY + 26) continue;   // direncin gövdesi
        g.beginPath(); g.arc(PT.x, PT.y, r, 0, 6.2832); g.fill(); g.stroke();
      }
      g.restore();
    }

    function drawBattery(g, a) {
      g.save();
      g.globalAlpha *= a;
      g.fillStyle = C.bg;
      g.fillRect(XB - 40, BAT_Y0 - 10, 80, BAT_Y1 - BAT_Y0 + 20);
      g.strokeStyle = C.ink; g.lineCap = 'butt';
      g.lineWidth = 3.4;
      g.beginPath(); g.moveTo(XB - 36, BAT_Y0); g.lineTo(XB + 36, BAT_Y0); g.stroke();
      g.lineWidth = 9;
      g.beginPath(); g.moveTo(XB - 18, BAT_Y1); g.lineTo(XB + 18, BAT_Y1); g.stroke();
      g.restore();
      txt(g, '+', XB + 50, BAT_Y0 + 8, { size: 28, weight: 600, color: C.copText, alpha: a });
      txt(g, '−', XB + 50, BAT_Y1 + 10, { size: 28, weight: 600, color: C.blue, alpha: a });
    }

    function drawResistor(g, y) {
      var x = RXC;
      run(g, [[RX0, y], [x - 65, y]], 1);
      run(g, [[x + 65, y], [RX1, y]], 1);
      g.save();
      g.shadowColor = 'rgba(21,23,28,.18)'; g.shadowBlur = 10; g.shadowOffsetY = 3;
      g.fillStyle = C.card; g.strokeStyle = C.ink2; g.lineWidth = 2.5;
      K.rr(g, x - 65, y - 22, 130, 44, 6); g.fill();
      g.shadowColor = 'transparent'; g.stroke();
      g.restore();
      txt(g, '450 Ω', x, y + 7, { size: 20, mono: true, weight: 600, color: C.ink, align: 'center' });
    }

    function fuse(g, x, y, ang, open) {
      g.save();
      g.translate(x, y); g.rotate(ang); g.scale(1.45, 1.45);
      g.fillStyle = C.card; g.strokeStyle = C.ink2; g.lineWidth = 1.8;
      K.rr(g, -19, -8, 38, 16, 3); g.fill(); g.stroke();
      g.strokeStyle = open ? C.muted : C.ink; g.lineWidth = 2; g.lineCap = 'round';
      g.beginPath();
      if (!open) { g.moveTo(-17, 0); g.lineTo(17, 0); }
      else {
        g.moveTo(-17, 0); g.lineTo(-9, 0); g.lineTo(-7, -4);
        g.moveTo(17, 0); g.lineTo(9, 0); g.lineTo(7, 4);
      }
      g.stroke();
      g.restore();
    }

    function leadStroke(g, pts, col, a) {
      g.save();
      g.globalAlpha *= a;
      g.lineJoin = 'round'; g.lineCap = 'round';
      g.beginPath(); g.moveTo(pts[0][0], pts[0][1]);
      for (var i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]);
      g.strokeStyle = C.card; g.lineWidth = 9; g.stroke();
      g.strokeStyle = col; g.lineWidth = 5.5; g.stroke();
      var e = pts[pts.length - 1];
      g.fillStyle = col; g.strokeStyle = C.card; g.lineWidth = 2;
      g.beginPath(); g.arc(e[0], e[1], 5, 0, 6.2832); g.fill(); g.stroke();
      g.restore();
    }

    function drawBox(g, cx, cy, view) {
      var ox = cx - BOXW / 2, oy = cy - BOXH / 2;
      g.save();
      g.shadowColor = 'rgba(21,23,28,.22)'; g.shadowBlur = 16; g.shadowOffsetY = 5;
      g.fillStyle = C.card; g.strokeStyle = C.ink2; g.lineWidth = 2.5;
      K.rr(g, ox, oy, BOXW, BOXH, 14); g.fill();
      g.shadowColor = 'transparent'; g.stroke();
      g.fillStyle = C.lcd; g.strokeStyle = C.line; g.lineWidth = 1;
      K.rr(g, ox + 14, oy + 14, BOXW - 28, 66, 7); g.fill(); g.stroke();
      g.restore();
      var shown;
      if (view === 'yanlis') shown = vt >= FUSE_AT ? '- - -' : 'aşırı';
      else if (view === 'voltmetre') shown = K.num(disp, 2) + ' V';
      else if (view === 'ampermetre') shown = K.num(disp, 1) + ' mA';
      else shown = K.num(Math.round(disp), 0) + ' Ω';
      if (view === 'multimetre') shown = '';
      txt(g, shown, ox + BOXW - 26, oy + 66, { size: 40, mono: true, weight: 600, color: C.ink, align: 'right' });
      var dx = ox + 46, dy = oy + 112;
      g.save();
      g.fillStyle = C.dial; g.strokeStyle = C.ink2; g.lineWidth = 2;
      g.beginPath(); g.arc(dx, dy, 24, 0, 6.2832); g.fill(); g.stroke();
      g.restore();
      var letter = view === 'ohmmetre' ? 'Ω' : (view === 'voltmetre' ? 'V' : 'A');
      txt(g, letter, dx, dy + 7, { size: 22, weight: 600, color: C.ink, align: 'center' });
      var y0 = oy + 112, xa = ox + 92, xb = ox + BOXW - 18;
      g.save();
      g.strokeStyle = C.ink2; g.lineWidth = 2; g.lineCap = 'butt';
      if (view === 'ohmmetre') {
        g.beginPath(); g.moveTo(xa, y0); g.lineTo(xa + 52, y0); g.moveTo(xa + 84, y0); g.lineTo(xb, y0); g.stroke();
        g.lineWidth = 3;
        g.beginPath(); g.moveTo(xa + 60, y0 - 13); g.lineTo(xa + 60, y0 + 13); g.stroke();
        g.lineWidth = 6.5;
        g.beginPath(); g.moveTo(xa + 75, y0 - 7); g.lineTo(xa + 75, y0 + 7); g.stroke();
        g.restore();
      } else {
        var lab = view === 'voltmetre' ? '10 MΩ' : '≈ 1 Ω';
        g.beginPath(); g.moveTo(xa, y0); g.lineTo(xa + 10, y0); g.moveTo(xb - 10, y0); g.lineTo(xb, y0); g.stroke();
        g.fillStyle = C.card;
        K.rr(g, xa + 10, y0 - 14, xb - xa - 20, 28, 4); g.fill(); g.stroke();
        g.restore();
        txt(g, lab, (xa + xb) / 2, y0 + 6, { size: 16, mono: true, weight: 600, color: C.ink, align: 'center' });
      }
    }

    function jack(g, x, y, col, ring) {
      g.save();
      g.fillStyle = col; g.strokeStyle = C.card; g.lineWidth = 2.4;
      g.beginPath(); g.arc(x, y, 9, 0, 6.2832); g.fill(); g.stroke();
      if (ring) { g.strokeStyle = C.cop; g.lineWidth = 2; g.beginPath(); g.arc(x, y, 12, 0, 6.2832); g.stroke(); }
      g.restore();
    }

    /* ---------- devre sahnesi ---------- */
    function drawScene(g, a) {
      if (a <= 0.01) return;
      var away = cur.away, wa = 1 - 0.65 * away, bx = cur.bx, by = cur.by;
      g.save();
      g.globalAlpha *= a;
      var gl = RX0 + (cur.bx - BOXW / 2 - RX0) * cur.gap;
      var gr = RX0 + (cur.bx + BOXW / 2 - RX0) * cur.gap;
      // teller
      run(g, [[XB, BAT_Y0], [XB, YT], [Math.min(gl, RX0), YT]], wa);
      run(g, [[gr, YT], [RX0, YT]], wa);
      run(g, [[RX1, YT], [XR, YT], [XR, YB], [XB, YB], [XB, BAT_Y1]], wa);
      if (away > 0.02) {
        // ayrılan direncin boşalttığı yer
        g.save(); g.globalAlpha *= away * 0.8; run(g, [[RX0, YT], [RX1, YT]], 1, true); g.restore();
      }
      // direnç yerinde ise üstteki telin arasından geçer
      var resY = YT + (RYAWAY - YT) * away;
      // akım noktaları (geleneksel yön)
      dots(g, MAIN, ph1, cur.dm, 30, 4.4);
      var jrx = bx + cur.rjx, jry = by + cur.rjy, jbx = bx + cur.bjx, jby = by + cur.bjy;
      var lr = curve(jrx, jry, cur.rtx, cur.rty, cur.rsx, cur.rsy);
      var lb = curve(jbx, jby, cur.btx, cur.bty, cur.bsx, cur.bsy);
      // pil
      drawBattery(g, wa);
      // direnç
      drawResistor(g, resY);
      // ölçü aleti ve uçlar
      var open = v === 'yanlis' && vt >= FUSE_AT;
      // kısa yol noktaları (yanlış), ölçüm akımı (ohmmetre)
      var sw = clamp(vt / 2.5, 0, 1);
      if (cur.dy > 0.02) {
        var rev = lr.slice().reverse(), pts = [[XB, BAT_Y0 - 2]].concat(rev, [[bx, by]], lb, [[XB, BAT_Y1 + 2]]);
        dots(g, mkPath(pts), ph2, cur.dy, 30 - 10 * sw, 4.4 + 5 * sw);
      }
      leadStroke(g, lr, C.red, cur.lead);
      leadStroke(g, lb, C.blk, cur.lead);
      if (cur.dohm > 0.02) {
        var pts2 = lr.concat([[cur.btx, cur.bty]], lb.slice().reverse(), [[bx, by]]);
        dotsLoop(g, mkPath(pts2), ph3, cur.dohm, 34, 3.6);
      }
      if (cur.dy > 0.02 || (v === 'yanlis' && cur.lead > 0.5)) {
        // sigorta kırmızı ucun ortasında
        var mi = 7, p0 = lr[mi - 1], p1 = lr[mi + 1];
        g.save(); g.globalAlpha *= cur.lead;
        fuse(g, lr[mi][0], lr[mi][1], Math.atan2(p1[1] - p0[1], p1[0] - p0[0]), open);
        g.restore();
      }
      drawBox(g, bx, by, v === 'multimetre' ? 'voltmetre' : v);
      jack(g, jrx, jry, C.red, false);
      jack(g, jbx, jby, C.blk, false);
      g.restore();

      // etiketler (en çok 4)
      var pa = function (name) { return la[name] * a; };
      var lx = bx - BOXW / 2 - 22;
      txt(g, 'pil · 9 V', XB - 54, BAT_Y0 + 20, { size: 20, weight: 600, color: C.ink, align: 'right', alpha: a * (1 - cur.dy * 0.6) });
      txt(g, 'çıkarıldı', XB - 54, BAT_Y0 + 44, { size: 16, weight: 500, color: C.copText, align: 'right', alpha: clamp(away * 2 - 0.6, 0, 1) * a });
      txt(g, 'voltmetre: paralel', lx, by - 6, { size: 20, weight: 600, color: C.ink, align: 'right', alpha: pa('voltmetre') });
      txt(g, 'iç direnç 10 MΩ, devre kapalı', lx, by + 20, { size: 16, color: C.ink2, align: 'right', alpha: pa('voltmetre') });
      txt(g, 'ampermetre: seri', bx, 358, { size: 20, weight: 600, color: C.ink, align: 'center', alpha: pa('ampermetre') });
      txt(g, 'devre açıldı, tüm akım aletin içinden', bx, 382, { size: 16, color: C.ink2, align: 'center', alpha: pa('ampermetre') });
      txt(g, 'ohmmetre: kendi küçük pili', lx, by - 6, { size: 20, weight: 600, color: C.ink, align: 'right', alpha: pa('ohmmetre') });
      txt(g, 'güç kapalı, parça devreden ayrı', lx, by + 20, { size: 16, color: C.ink2, align: 'right', alpha: pa('ohmmetre') });
      var ya = pa('yanlis');
      txt(g, 'kısa devre: sigorta atar', 620, 118, { size: 22, weight: 600, color: C.copText, alpha: ya });
      txt(g, 'sembolik gösterim, gerçekte denenmez', 620, 146, { size: 16, weight: 500, color: C.ink2, alpha: ya });
    }

    /* ---------- multimetre sahnesi ---------- */
    function sym(g, kind, cx, cy, col, sz) {
      sz = sz || 20;
      g.save();
      g.strokeStyle = col; g.fillStyle = col; g.lineWidth = 1.8; g.lineCap = 'round'; g.lineJoin = 'round';
      var ty = cy + sz * 0.34;
      if (kind === 'dc' || kind === 'ac') {
        txt(g, 'V', cx - 9, ty, { size: sz, weight: 600, color: col, align: 'center' });
        var x0 = cx + 2;
        if (kind === 'dc') {
          g.beginPath(); g.moveTo(x0, cy - 9); g.lineTo(x0 + 14, cy - 9); g.stroke();
          g.setLineDash([3.2, 2.6]);
          g.beginPath(); g.moveTo(x0, cy - 3); g.lineTo(x0 + 14, cy - 3); g.stroke();
        } else {
          g.beginPath();
          for (var i = 0; i <= 16; i++) {
            var u = i / 16, px = x0 + u * 15, py = cy - 7 - 3.6 * Math.sin(u * 6.2832);
            if (i) g.lineTo(px, py); else g.moveTo(px, py);
          }
          g.stroke();
        }
      } else if (kind === 'A') {
        txt(g, 'A', cx, ty, { size: sz, weight: 600, color: col, align: 'center' });
      } else if (kind === 'ohm') {
        txt(g, 'Ω', cx, ty, { size: sz, weight: 600, color: col, align: 'center' });
      } else if (kind === 'diode') {
        g.beginPath(); g.moveTo(cx - 15, cy); g.lineTo(cx - 6, cy); g.moveTo(cx + 7, cy); g.lineTo(cx + 15, cy); g.stroke();
        g.beginPath(); g.moveTo(cx - 6, cy - 8); g.lineTo(cx - 6, cy + 8); g.lineTo(cx + 7, cy); g.closePath(); g.stroke();
        g.beginPath(); g.moveTo(cx + 7, cy - 8); g.lineTo(cx + 7, cy + 8); g.stroke();
      } else if (kind === 'cont') {
        g.beginPath(); g.arc(cx - 11, cy, 2.2, 0, 6.2832); g.fill();
        for (var r = 1; r <= 3; r++) {
          g.beginPath(); g.arc(cx - 11, cy, 4 + r * 5, -0.85, 0.85); g.stroke();
        }
      }
      g.restore();
    }

    function drawMulti(g, a) {
      if (a <= 0.01) return;
      var n = Math.floor(vt / DIAL_STEP);
      var idx = n % 6;
      var f = clamp((vt - n * DIAL_STEP) / 0.35, 0, 1);
      var from = n >= 1 ? -90 + 60 * (n - 1) : -90, to = -90 + 60 * n;
      var ang = (from + (to - from) * K.ease.inOut(f)) * Math.PI / 180;
      var D = DIAL[idx];
      g.save();
      g.globalAlpha *= a;
      g.translate(190, -36); g.scale(1.14, 1.14);
      var BX = 24, BY = 52, BW = 296, BH = 352;
      g.shadowColor = 'rgba(21,23,28,.2)'; g.shadowBlur = 18; g.shadowOffsetY = 6;
      g.fillStyle = C.card; g.strokeStyle = C.ink2; g.lineWidth = 2;
      K.rr(g, BX, BY, BW, BH, 18); g.fill();
      g.shadowColor = 'transparent'; g.stroke();
      g.fillStyle = C.lcd; g.strokeStyle = C.line; g.lineWidth = 1;
      K.rr(g, BX + 16, BY + 16, BW - 32, 56, 6); g.fill(); g.stroke();
      txt(g, D.tag, BX + 28, BY + 38, { size: 14, mono: true, weight: 500, color: C.muted });
      txt(g, D.show, BX + BW - 28, BY + 60, { size: 32, mono: true, weight: 600, color: C.ink, align: 'right' });
      var cx = BX + BW / 2, cy = 226, R = 86;
      g.fillStyle = C.dial; g.strokeStyle = C.ink2; g.lineWidth = 2;
      g.beginPath(); g.arc(cx, cy, 46, 0, 6.2832); g.fill(); g.stroke();
      g.strokeStyle = C.line; g.lineWidth = 1;
      g.beginPath(); g.arc(cx, cy, 58, 0, 6.2832); g.stroke();
      for (var i = 0; i < 6; i++) {
        var ra = DIAL_ANG[i] * Math.PI / 180, sel = i === idx;
        g.strokeStyle = sel ? C.cop : C.muted; g.lineWidth = sel ? 3 : 1.5; g.lineCap = 'round';
        g.beginPath(); g.moveTo(cx + Math.cos(ra) * 52, cy + Math.sin(ra) * 52); g.lineTo(cx + Math.cos(ra) * 62, cy + Math.sin(ra) * 62); g.stroke();
        sym(g, DIAL[i].sym, cx + Math.cos(ra) * R, cy + Math.sin(ra) * R, sel ? C.copText : C.ink2, 20);
      }
      g.strokeStyle = C.ink; g.lineWidth = 5; g.lineCap = 'round';
      g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + Math.cos(ang) * 38, cy + Math.sin(ang) * 38); g.stroke();
      g.fillStyle = C.ink; g.beginPath(); g.arc(cx, cy, 6, 0, 6.2832); g.fill();
      var jx = [BX + 58, cx, BX + BW - 58], jn = ['COM', 'VΩ', 'mA/A'], jc = [C.blk, C.red, C.red];
      var used = [true, D.jack === 0, D.jack === 1];
      for (var j = 0; j < 3; j++) {
        jack(g, jx[j], 356, jc[j], used[j]);
        txt(g, jn[j], jx[j], 388, { size: 14, mono: true, weight: 500, color: used[j] ? C.copText : C.muted, align: 'center' });
      }
      // sağ sütun: kadran konumları, seçili olanın altında kısa açıklama
      for (var k = 0; k < 6; k++) {
        var y = 70 + k * 49, on = k === idx;
        if (on) {
          g.fillStyle = C.copSoft;
          K.rr(g, 350, y - 10, 330, 46, 6); g.fill();
          g.fillStyle = C.cop; g.fillRect(350, y - 6, 3, 38);
        }
        sym(g, DIAL[k].sym, 384, y + 13, on ? C.copText : C.ink2, 22);
        txt(g, DIAL[k].name, 418, y + 12, { size: 18, weight: on ? 700 : 500, color: on ? C.ink : C.ink2 });
        if (on) txt(g, DIAL[k].sub, 418, y + 30, { size: 14, color: C.muted });
      }
      g.restore();
    }

    function frame(t, dt) {
      var g = sf.ctx;
      var d = clamp(dt, 0, 0.05);
      if (auto && !K.reducedMotion) enter(AUTO[Math.floor(t / DEMO) % AUTO.length]);
      if (!K.reducedMotion) vt += d;
      var tg = TG[v], kk = K.reducedMotion ? 1 : 1 - Math.exp(-6 * d);
      for (var i = 0; i < KEYS.length; i++) cur[KEYS[i]] += (tg[KEYS[i]] - cur[KEYS[i]]) * kk;
      // yanlış görünümde sigorta attıktan sonra kısa yoldaki akım biter
      if (v === 'yanlis' && vt >= FUSE_AT) cur.dy += (0 - cur.dy) * (K.reducedMotion ? 1 : 1 - Math.exp(-5 * d));
      for (var nm in la) la[nm] += ((nm === v ? 1 : 0) - la[nm]) * (K.reducedMotion ? 1 : 1 - Math.exp(-7 * d));
      var dt0 = v === 'voltmetre' ? 9 : v === 'ampermetre' ? 20 : v === 'ohmmetre' ? 450 : 0;
      disp += (dt0 - disp) * (K.reducedMotion ? 1 : 1 - Math.exp(-8 * d));
      if (Math.abs(dt0 - disp) < 0.004 * (dt0 || 1)) disp = dt0;
      var sw = clamp(vt / 2.5, 0, 1);
      if (!K.reducedMotion) {
        ph1 += d * 46 * cur.dm;
        ph2 += d * (50 + 150 * sw);
        ph3 += d * 26;
      }

      sf.clear();
      var sc = Math.min(sf.w / VW, sf.h / VH);
      g.save();
      g.translate((sf.w - VW * sc) / 2, (sf.h - VH * sc) / 2);
      g.scale(sc, sc);
      drawScene(g, 1 - cur.mm);
      drawMulti(g, cur.mm);
      tag(g, 'ölçekli değil · basitleştirilmiş model', VW - 6, VH - 14);
      g.restore();

    }

    function dialIdx() { return Math.floor(vt / DIAL_STEP) % 6; }

    return {
      reset: function () { resetState(); },
      frame: frame,
      set: function (key, val) {
        if (key === 'view') {
          if (val === 'yanlış') val = 'yanlis';
          if (VIEWS.indexOf(val) >= 0) { auto = false; enter(val); }
        }
      },
      read: function (key) {
        if (key === 'view') return v;
        if (key === 'explain') return EXPLAIN[v];
        if (key === 'reading') return v === 'multimetre' ? DIAL[dialIdx()].show : READING[v];
        if (key === 'numbers') return v === 'multimetre' ? 'kadran: ' + DIAL[dialIdx()].name : NUMBERS[v];
        return '';
      },
      resize: function () { sf.resize(); },
      dispose: function () { sf.dispose(); }
    };
  });
})();
