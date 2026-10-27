/* Köklerden Göklere · Builder AA: statik elektrik
 * static-lab · 680×520 · 2B, düz "müze çizimi" biçimi
 * Beş görünüm: surtunme, cekim, nem, kivilcim, simsek.
 * Sözleşme: kg-viz.js. Hareket frame(t, dt) içinden sürülür, rastgelelik yok.
 */
(function () {
  'use strict';
  var K = window.KGViz;
  if (!K) return;
  var P = K.palette;
  var clamp = K.clamp;
  var PI = Math.PI, TAU = Math.PI * 2;

  var VIEWS = ['surtunme', 'cekim', 'nem', 'kivilcim', 'simsek'];
  var DEMO = 8;
  var STILL = { surtunme: 7, cekim: 5, nem: 6.5, kivilcim: 3.9, simsek: 5.2 };

  var EXPLAIN = {
    surtunme: 'Yalnızca elektronlar yer değiştirir: saç elektron verir, plastik balon alır. Saç artı, balon eksi yüklü olur; protonlar yerinde kalır.',
    cekim: 'Eksi yüklü balon, yüksüz kâğıttaki yükleri kaydırır: yakın yüz artı, uzak yüz eksi olur. Yakındaki artı daha güçlü çeker.',
    nem: 'Nemli havada yüzeydeki ince su tabakası yükü iletir ve yük havaya kaçar. Kuru havada yük kalır; kışın statik elektrik artar.',
    kivilcim: 'Vücuttaki yük kapı koluna yaklaşınca alan büyür; yaklaşık 3.000 V/mm aşılınca hava iletken olur ve kıvılcım çakar. Gerilim yüksek, yük çok az.',
    simsek: 'Bulutta buz parçacıkları çarpışır, yükler ayrılır. Hava dayanamayınca dev bir kıvılcım çakar; ısınan hava patlarcasına genişler: gök gürültüsü.'
  };
  var NUMBERS = {
    surtunme: '', cekim: '', nem: '',
    kivilcim: '3.000 V/mm × 3 mm ≈ 9.000 V',
    simsek: '1.000 ÷ 343 ≈ 2,9 s'
  };

  function sm(a, b, x) { var t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); }
  function lerp(a, b, t) { return a + (b - a) * t; }

  K.register('static-lab', function (el, opts) {
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
      blueSoft: dark ? '#1E2740' : P.blueSoft,
      cop: dark ? P.copperLight : P.copperFill,
      copText: dark ? P.copperLight : P.copper,
      grey: dark ? '#9AA3B2' : '#666C78',
      card: dark ? '#161B26' : '#FFFFFF',
      hairT: dark ? '#2A2722' : '#EAE3D6',
      balT: dark ? '#1C2335' : '#E2E7F3',
      solid: dark ? '#262D3B' : '#E4E1D8',
      skin: dark ? '#3A332D' : '#EADFD3',
      cloud: dark ? '#2B3140' : '#E3E5EA',
      water: dark ? '#2C4468' : '#BFD3EE',
      spark: P.lamp,
      white: dark ? '#EEF0F3' : '#FFFFFF'
    };

    var view, auto, vStart, tNow;
    function resetState() {
      view = 'surtunme'; auto = true; vStart = 0; tNow = 0;
      if (K.reducedMotion) view = 'surtunme';
    }
    resetState();

    /* ---------- yardımcılar ---------- */
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
    function charge(g, x, y, r, neg, a) {
      if (a <= 0.01) return;
      g.save();
      g.globalAlpha *= a;
      g.fillStyle = neg ? C.blue : C.cop;
      g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
      g.strokeStyle = '#FFFFFF'; g.lineWidth = Math.max(1.4, r * 0.28); g.lineCap = 'round';
      g.beginPath(); g.moveTo(x - r * 0.5, y); g.lineTo(x + r * 0.5, y);
      if (!neg) { g.moveTo(x, y - r * 0.5); g.lineTo(x, y + r * 0.5); }
      g.stroke();
      g.restore();
    }
    function arrow(g, x1, y1, x2, y2, color, w, a) {
      g.save();
      if (a !== undefined) g.globalAlpha *= a;
      var ang = Math.atan2(y2 - y1, x2 - x1), hs = 8 + w;
      g.strokeStyle = color; g.fillStyle = color; g.lineWidth = w; g.lineCap = 'round';
      g.beginPath(); g.moveTo(x1, y1);
      g.lineTo(x2 - Math.cos(ang) * hs * 0.6, y2 - Math.sin(ang) * hs * 0.6); g.stroke();
      g.beginPath(); g.moveTo(x2, y2);
      g.lineTo(x2 - Math.cos(ang - 0.45) * hs, y2 - Math.sin(ang - 0.45) * hs);
      g.lineTo(x2 - Math.cos(ang + 0.45) * hs, y2 - Math.sin(ang + 0.45) * hs);
      g.closePath(); g.fill();
      g.restore();
    }
    function pill(g, x, y, s, color, strong) {
      g.save();
      g.font = K.font(16, 600);
      var w = g.measureText(s).width + 24;
      g.strokeStyle = color; g.lineWidth = 1.5;
      K.rr(g, x + 0.5, y + 0.5, w, 30, 15);
      if (strong) { g.fillStyle = color; g.fill(); }
      g.stroke();
      g.restore();
      txt(g, s, x + 12.5, y + 21, { size: 16, weight: 600, color: strong ? '#FFFFFF' : color });
      return w;
    }
    function hline(g, x1, x2, y, color) {
      g.save(); g.strokeStyle = color; g.lineWidth = 1;
      g.beginPath(); g.moveTo(x1, y + 0.5); g.lineTo(x2, y + 0.5); g.stroke(); g.restore();
    }
    function balloon(g, bx, by, rx, ry, a) {
      g.save();
      g.fillStyle = C.blueSoft; g.strokeStyle = C.blue; g.lineWidth = 2;
      g.beginPath(); g.ellipse(bx, by, rx, ry, 0, 0, TAU); g.fill(); g.stroke();
      // bağlama ucu
      g.beginPath(); g.moveTo(bx - 5, by + ry + 7); g.lineTo(bx + 5, by + ry + 7); g.lineTo(bx, by + ry - 1); g.closePath();
      g.fillStyle = C.blue; g.fill();
      g.restore();
    }

    /* ======================= SÜRTÜNME ======================= */
    var ROWS = [-72, -36, 0, 36, 72];
    function vSurtunme(g, lt) {
      head(g, 'Sürtünme: elektronlar saçtan balona geçer');
      var p = sm(0.9, 6.2, lt);
      var rubAmp = sm(0, 0.5, lt) * (1 - sm(6.6, 7.2, lt));
      var by = 190 + Math.sin(lt * 3.4) * 14 * rubAmp, bx = 172;

      // saç
      g.save();
      g.strokeStyle = C.ink2; g.lineWidth = 2.2; g.lineCap = 'round';
      g.fillStyle = C.ink2;
      K.rr(g, 40, 64, 104, 12, 4); g.fill();
      for (var i = 0; i < 14; i++) {
        var x0 = 46 + i * 7, sw = (i % 3 - 1) * 5;
        g.beginPath(); g.moveTo(x0, 74);
        g.bezierCurveTo(x0 - 8, 150, x0 + 10, 220, x0 + sw, 304);
        g.stroke();
      }
      g.restore();
      // balon
      balloon(g, bx, by, 56, 68);
      // sürtme oku
      arrow(g, bx + 74, by - 46, bx + 74, by - 16, C.grey, 1.8, 0.0 + rubAmp);
      arrow(g, bx + 74, by - 16, bx + 74, by - 46, C.grey, 1.8, rubAmp);
      // genel görünümde yük işaretleri
      var k;
      for (k = 0; k < 5; k++) charge(g, 74 + (k % 2) * 18, 128 + k * 30, 6, false, p);
      for (k = 0; k < 6; k++) {
        var a = (120 + k * 24) * PI / 180;
        charge(g, bx + 40 * Math.cos(a), by + 52 * Math.sin(a), 6, true, p);
      }
      txt(g, 'saç', 92, 326, { size: 14, weight: 500, color: C.muted, align: 'center' });
      txt(g, 'plastik balon', bx + 10, by + 98, { size: 14, weight: 500, color: C.muted, align: 'center' });

      // yakınlaştırma merceği
      var cx = 484, cy = 196, R = 140;
      g.save();
      g.strokeStyle = C.line2; g.lineWidth = 1.2; g.setLineDash([4, 4]);
      var cpx = 128, cpy = 190;
      g.beginPath(); g.moveTo(cpx, cpy); g.lineTo(cx - R * Math.cos(0.5), cy - R * Math.sin(0.5));
      g.moveTo(cpx, cpy); g.lineTo(cx - R * Math.cos(0.5), cy + R * Math.sin(0.5));
      g.stroke(); g.setLineDash([]);
      g.fillStyle = C.ink; g.beginPath(); g.arc(cpx, cpy, 3.5, 0, TAU); g.fill();
      g.restore();

      g.save();
      g.beginPath(); g.arc(cx, cy, R, 0, TAU); g.clip();
      g.translate(cx, cy);
      g.fillStyle = C.balT; g.fillRect(-R, -R, R * 2, R * 2);
      g.fillStyle = C.hairT;
      g.beginPath(); g.moveTo(-R - 6, -R - 6);
      var yy;
      for (yy = -R; yy <= R; yy += 6) g.lineTo(4 * Math.sin(yy * 0.09), yy);
      g.lineTo(-R - 6, R + 6); g.closePath(); g.fill();
      g.strokeStyle = C.ink2; g.lineWidth = 1.5;
      g.beginPath();
      for (yy = -R; yy <= R; yy += 6) { var xx = 4 * Math.sin(yy * 0.09); if (yy === -R) g.moveTo(xx, yy); else g.lineTo(xx, yy); }
      g.stroke();
      // atomlar: artı = çekirdek (proton), mavi = elektron
      var n = 0, r;
      for (r = 0; r < ROWS.length; r++) {
        var ay = ROWS[r];
        charge(g, -95, ay, 11, false, 1);
        charge(g, -48, ay, 11, false, 1);
        charge(g, 48, ay, 11, false, 1);
        charge(g, 90, ay, 11, false, 1);
        charge(g, -80, ay - 14, 6.5, true, 1);
        charge(g, 63, ay - 14, 6.5, true, 1);
        charge(g, 105, ay - 14, 6.5, true, 1);
        var u = sm(r * 0.1, r * 0.1 + 0.5, p);
        if (u > 0.5) n++;
        var ex = lerp(-33, 32, u), ey = lerp(ay - 14, ay + 14, u) - Math.sin(PI * u) * 12;
        charge(g, ex, ey, 6.5, true, 1);
      }
      txt(g, 'saç', -70, -100, { size: 13, weight: 600, color: C.ink2, align: 'center' });
      txt(g, 'balon', 70, -100, { size: 13, weight: 600, color: C.ink2, align: 'center' });
      g.restore();
      g.save(); g.strokeStyle = C.ink; g.lineWidth = 1.6;
      g.beginPath(); g.arc(cx, cy, R, 0, TAU); g.stroke(); g.restore();

      // gösterge
      charge(g, 346, 362, 8, false, 1);
      txt(g, 'proton: yerinde kalır', 360, 367, { size: 13, color: C.ink2 });
      charge(g, 516, 362, 7, true, 1);
      txt(g, 'elektron: geçer', 528, 367, { size: 13, color: C.ink2 });

      hline(g, 24, 656, 380, C.line);
      var w1 = pill(g, 24, 392, n ? 'saç: + yüklü' : 'saç: yüksüz', n ? C.copText : C.muted, n > 0);
      pill(g, 24 + w1 + 12, 392, n ? 'balon: − yüklü' : 'balon: yüksüz', n ? C.blue : C.muted, n > 0);
      txt(g, 'geçen elektron (modelde): ' + n + ' / ' + ROWS.length, 24, 450, { size: 14, mono: true, weight: 500, color: C.ink2 });
      txt(g, 'yalnızca elektronlar yer değiştirir; protonlar yerinde kalır', 24, 482, { size: 17, weight: 600, color: C.ink });
    }

    /* ======================= ÇEKİM ======================= */
    function vCekim(g, lt) {
      head(g, 'Yüksüz cisim neden çekilir?');
      var a = sm(0.5, 2, lt) - sm(6.3, 7.6, lt);
      var q = sm(0.7, 1, a);

      // sol sütun: kâğıt sahnesi
      var by = 82 + 32 * a, bx = 140, k;
      g.save(); g.strokeStyle = C.ink2; g.lineWidth = 2;
      g.beginPath(); g.moveTo(24, 196); g.lineTo(330, 196); g.stroke(); g.restore();
      balloon(g, bx, by, 34, 40);
      for (k = 0; k < 4; k++) charge(g, bx + (k - 1.5) * 15, by + 20, 5.5, true, 1);
      for (k = 0; k < 3; k++) {
        var px = 104 + k * 34, py = 192 - 30 * q - k * 2 * q + Math.sin(lt * 9 + k) * 1.2 * q;
        g.save(); g.translate(px, py);
        g.rotate((k - 1) * 0.08 * q);
        g.fillStyle = C.white; g.strokeStyle = C.ink2; g.lineWidth = 1.5;
        g.fillRect(-13, -3, 26, 6); g.strokeRect(-13, -3, 26, 6);
        g.restore();
      }
      txt(g, 'yüklü balon', 24, 74, { size: 13, weight: 500, color: C.muted });
      txt(g, 'kâğıt parçaları', 24, 214, { size: 13, weight: 500, color: C.muted });
      hline(g, 24, 330, 226, C.line);

      // duvar sahnesi
      var wbx = 200 + 62 * a;
      g.save();
      g.fillStyle = C.solid; g.fillRect(290, 240, 38, 108);
      g.strokeStyle = C.ink2; g.lineWidth = 2; g.beginPath(); g.moveTo(290, 240); g.lineTo(290, 348); g.stroke();
      g.strokeStyle = C.line2; g.lineWidth = 1;
      for (k = 0; k < 8; k++) { g.beginPath(); g.moveTo(290, 252 + k * 14); g.lineTo(300, 244 + k * 14); g.stroke(); }
      g.restore();
      balloon(g, wbx, 296, 28, 34);
      for (k = 0; k < 3; k++) charge(g, wbx + 10, 280 + k * 16, 5.5, true, 1);
      for (k = 0; k < 3; k++) charge(g, 301, 276 + k * 20, 5.5, false, a);
      txt(g, 'balon duvara yapışır', 24, 258, { size: 13, weight: 500, color: C.muted });

      // bağlantı çizgileri
      var tx = 350, ty0 = 62, ty1 = 346;
      g.save(); g.strokeStyle = C.line2; g.lineWidth = 1.2; g.setLineDash([4, 4]);
      g.beginPath(); g.moveTo(150, 192 - 30 * q); g.lineTo(tx, 150); g.moveTo(150, 192 - 30 * q); g.lineTo(tx, 240); g.stroke();
      g.setLineDash([]);
      g.fillStyle = C.card; g.strokeStyle = C.ink; g.lineWidth = 1.5;
      K.rr(g, tx + 0.5, ty0 + 0.5, 306, ty1 - ty0, 10); g.fill(); g.stroke();
      g.restore();

      // yakından: balon yüzeyi
      txt(g, 'yakından: kâğıdın içi', tx + 14, ty0 + 22, { size: 14, weight: 600, color: C.ink });
      g.save();
      g.fillStyle = C.blueSoft; g.strokeStyle = C.blue; g.lineWidth = 1.5;
      K.rr(g, tx + 12, 98, 282, 26, 6); g.fill(); g.stroke(); g.restore();
      for (k = 0; k < 7; k++) charge(g, tx + 36 + k * 38, 111, 7, true, 1);
      txt(g, 'balon yüzeyi', tx + 14, 142, { size: 12, color: C.muted });

      // kâğıt içi: nötr atomlar, elektronlar aşağı kayar
      var X0 = tx + 20, PW = 266, PY = 176, PH = 94;
      g.save();
      g.fillStyle = C.white; g.strokeStyle = C.ink2; g.lineWidth = 1.5;
      K.rr(g, X0, PY, PW, PH, 4); g.fill(); g.stroke(); g.restore();
      var rr2, cc;
      for (rr2 = 0; rr2 < 3; rr2++) {
        for (cc = 0; cc < 7; cc++) {
          var axp = X0 + 24 + cc * 36, ayp = PY + 22 + rr2 * 26;
          charge(g, axp, ayp, 8, false, 1);
          charge(g, axp + 11, ayp + 11 * q - 5 * (1 - q) * 0, 5, true, 1);
        }
      }
      g.save();
      g.setLineDash([5, 4]); g.lineWidth = 2; g.globalAlpha = q;
      g.strokeStyle = C.cop; g.beginPath(); g.moveTo(X0 + 3, PY + 1); g.lineTo(X0 + PW - 3, PY + 1); g.stroke();
      g.strokeStyle = C.blue; g.beginPath(); g.moveTo(X0 + 3, PY + PH - 1); g.lineTo(X0 + PW - 3, PY + PH - 1); g.stroke();
      g.restore();
      txt(g, 'yakın yüz: +', X0, PY - 8, { size: 14, weight: 600, color: C.copText, alpha: 0.35 + 0.65 * q });
      txt(g, 'uzak yüz: −', X0, PY + PH + 19, { size: 14, weight: 600, color: C.blue, alpha: 0.35 + 0.65 * q });
      arrow(g, X0 + PW - 22, PY - 4, X0 + PW - 22, PY - 36, C.cop, 3.5, q);
      txt(g, 'çekim: güçlü', X0 + PW - 36, PY - 22, { size: 13, weight: 600, color: C.copText, align: 'right', alpha: q });
      arrow(g, X0 + PW - 22, PY + PH + 6, X0 + PW - 22, PY + PH + 22, C.grey, 2, q);
      txt(g, 'itme: zayıf', X0 + PW - 36, PY + PH + 19, { size: 13, color: C.grey, align: 'right', alpha: q });
      wrap(g, 'yakındaki artı daha güçlü çeker, uzaktaki eksi daha zayıf iter: kâğıt balona doğru gider', tx + 14, 316, 280, 13, 17, C.ink2, 400);

      hline(g, 24, 656, 380, C.line);
      txt(g, 'yüksüz kâğıt da çekilir: içindeki yükler kayar (kutuplanma)', 24, 410, { size: 17, weight: 600, color: C.ink });
      txt(g, 'duvar da aynı: balonun eksi yükü duvar yüzeyinde artı yük bırakır', 24, 441, { size: 15, color: C.ink2 });
      txt(g, 'kuvvet uzaklıkla hızla azalır: kâğıt balona yaklaşınca sıçrar', 24, 468, { size: 15, color: C.ink2 });
    }

    /* ======================= NEM ======================= */
    function vNem(g, lt) {
      head(g, 'Nem, yükü havaya kaçırır');
      var fade = sm(0, 0.4, lt);
      var panels = [{ x: 24, humid: false, title: 'kuru hava' }, { x: 346, humid: true, title: 'nemli hava' }];
      for (var pi = 0; pi < 2; pi++) {
        var pn = panels[pi], x = pn.x, k;
        g.save();
        g.fillStyle = C.card; g.strokeStyle = C.ink; g.lineWidth = 1.5;
        K.rr(g, x + 0.5, 52.5, 310, 290, 10); g.fill(); g.stroke(); g.restore();
        txt(g, pn.title, x + 16, 78, { size: 15, weight: 600, color: C.ink });
        txt(g, pn.humid ? 'havada su buharı var' : 'havada az su buharı', x + 294, 78, { size: 12, color: C.muted, align: 'right' });
        // plastik yüzey
        g.save();
        g.fillStyle = C.blueSoft; g.strokeStyle = C.blue; g.lineWidth = 1.5;
        K.rr(g, x + 40, 214, 230, 34, 4); g.fill(); g.stroke(); g.restore();
        txt(g, 'plastik yüzey', x + 155, 236, { size: 13, color: C.blue, align: 'center', weight: 500 });
        if (pn.humid) {
          g.save();
          g.fillStyle = C.water; g.globalAlpha = 0.9;
          K.rr(g, x + 38, 206, 234, 8, 3); g.fill();
          for (k = 0; k < 9; k++) { g.beginPath(); g.arc(x + 54 + k * 26, 205, 3.5 + (k % 2), 0, TAU); g.fill(); }
          g.restore();
          txt(g, 'ince su tabakası', x + 16, 270, { size: 13, weight: 500, color: C.blue });
          g.save(); g.strokeStyle = C.blue; g.lineWidth = 1;
          g.beginPath(); g.moveTo(x + 100, 262); g.lineTo(x + 118, 212); g.stroke(); g.restore();
        } else {
          txt(g, 'yüzey kuru: yük yerinde', x + 16, 270, { size: 13, weight: 500, color: C.ink2 });
        }
        if (pn.humid) {
          g.save(); g.fillStyle = C.water; g.globalAlpha = 0.8;
          for (k = 0; k < 7; k++) { g.beginPath(); g.arc(x + 40 + k * 37 + Math.sin(lt * 0.8 + k * 2) * 6, 112 + (k * 29 % 40) + Math.cos(lt * 0.7 + k) * 5, 3, 0, TAU); g.fill(); }
          g.restore();
        }
        // yükler
        var left = 0, N = 8;
        for (k = 0; k < N; k++) {
          var x0 = x + 52 + k * 29, y0 = 192;
          var te = 0.6 + k * 0.5, s = pn.humid ? lt - te : -1;
          if (s <= 0) {
            var bob = pn.humid ? 0 : Math.sin(lt * 2 + k) * 1.2;
            charge(g, x0, y0 + bob, 7.5, true, fade);
            left += 1;
          } else {
            var dx = (k - 3.5) * 10 * s, dy = -26 * s - 8 * s * s;
            var al = clamp(1 - s / 1.4, 0, 1);
            left += clamp(1 - s / 0.8, 0, 1);
            charge(g, x0 + dx, y0 + dy, 7.5, true, al);
            if (al > 0.05) arrow(g, x0 + dx * 0.5, y0 - 14 + dy * 0.2, x0 + dx * 0.5 + (k - 3.5) * 1.5, y0 - 26 + dy * 0.2, C.grey, 1.5, al * 0.8);
          }
        }
        // yük göstergesi
        var gaugeV = pn.humid ? left / N : 1;
        gaugeV *= fade;
        txt(g, 'yüzeydeki yük', x + 16, 304, { size: 13, weight: 500, color: C.muted });
        g.save();
        g.strokeStyle = C.line2; g.lineWidth = 1.2;
        K.rr(g, x + 120.5, 292.5, 172, 16, 4); g.stroke();
        g.fillStyle = C.blue;
        if (gaugeV > 0.02) { K.rr(g, x + 122, 294, 169 * gaugeV, 13, 3); g.fill(); }
        g.restore();
        txt(g, pn.humid ? (left < 0.5 ? 'yük havaya kaçtı' : 'yük azalıyor') : 'yük korunuyor', x + 16, 328, { size: 14, weight: 600, color: pn.humid ? C.copText : C.blue });
      }
      hline(g, 24, 656, 358, C.line);
      txt(g, 'kış ve kuru hava: statik elektrik artar', 24, 392, { size: 18, weight: 600, color: C.ink });
      txt(g, 'nemli havada su tabakası yükü iletir; yük yüzeyden kaçar', 24, 424, { size: 15, color: C.ink2 });
      txt(g, 'sürtünme yine yük ayırır; fark, yükün orada kalıp kalmamasıdır', 24, 452, { size: 15, color: C.ink2 });
    }

    /* ======================= KIVILCIM ======================= */
    var SPARK = [[0, 0], [0.18, -5], [0.3, 4], [0.47, -6], [0.6, 3], [0.78, -4], [1, 0]];
    function vKivilcim(g, lt) {
      head(g, 'Kapı kolunda kıvılcım');
      var gap = 12 - 9 * sm(0.4, 4.2, lt);
      var Vb = lt < 4.4 ? 9000 : Math.max(0, 9000 * (1 - (lt - 4.4) / 0.25));
      var E = Vb / gap;
      var sparkOn = lt >= 4.4 && lt < 4.9;
      var after = lt >= 4.5;
      var hx = 420, tx = hx - gap * 8, k;
      var chg = after ? clamp(1 - (lt - 4.4) / 0.4, 0, 1) : 1;

      // kapı ve kol
      g.save();
      g.fillStyle = C.solid; g.strokeStyle = C.ink2; g.lineWidth = 2;
      g.fillRect(480, 66, 120, 196); g.strokeRect(480, 66, 120, 196);
      g.restore();
      g.save();
      g.fillStyle = dark ? '#6B7384' : '#C9CCD1'; g.strokeStyle = C.ink; g.lineWidth = 1.6;
      K.rr(g, hx, 182, 108, 22, 11); g.fill(); g.stroke();
      g.beginPath(); g.arc(520, 193, 17, 0, TAU); g.fill(); g.stroke();
      g.restore();
      txt(g, 'metal kapı kolu', hx + 54, 168, { size: 13, weight: 500, color: C.muted, align: 'center' });
      // kolda karşı işaretli yük
      for (k = 0; k < 3; k++) charge(g, hx + 14 + k * 18, 193, 5.5, false, clamp((1 - gap / 12) * 1.6, 0, 1) * chg);

      // el ve kol
      g.save();
      g.fillStyle = C.skin; g.strokeStyle = C.ink2; g.lineWidth = 1.5;
      K.rr(g, tx - 232, 156, 150, 72, 14); g.fill(); g.stroke();
      K.rr(g, tx - 100, 181, 100, 24, 12); g.fill(); g.stroke();
      g.restore();
      for (k = 0; k < 3; k++) charge(g, tx - 22 - k * 20, 193, 5.5, true, chg);
      for (k = 0; k < 4; k++) charge(g, tx - 205 + k * 28, 192, 6, true, chg);
      txt(g, 'vücutta biriken yük', tx - 232, 146, { size: 13, weight: 500, color: C.muted });

      // alan çizgileri
      var fa = clamp(E / 3000, 0, 1) * 0.85 * (sparkOn || !after ? 1 : 0);
      if (fa > 0.02) {
        g.save(); g.strokeStyle = C.grey; g.lineWidth = 1.3; g.setLineDash([4, 4]); g.globalAlpha = fa;
        for (k = -2; k <= 2; k++) {
          g.beginPath(); g.moveTo(tx + 3, 193 + k * 3); g.quadraticCurveTo((tx + hx) / 2, 193 + k * 11, hx - 1, 193 + k * 3); g.stroke();
        }
        g.restore();
      }
      // aralık ölçüsü
      var dy = 222;
      if (!after || sparkOn) {
        g.save(); g.strokeStyle = C.ink2; g.lineWidth = 1.2;
        g.beginPath(); g.moveTo(tx, dy); g.lineTo(hx, dy);
        g.moveTo(tx, dy - 5); g.lineTo(tx, dy + 5); g.moveTo(hx, dy - 5); g.lineTo(hx, dy + 5); g.stroke(); g.restore();
        txt(g, 'd = ' + K.num(gap, 1) + ' mm', (tx + hx) / 2, dy + 18, { size: 13, mono: true, weight: 500, color: C.ink2, align: 'center' });
      }
      // kıvılcım
      if (sparkOn) {
        var fl = ((Math.floor((lt - 4.4) * 40)) % 2) ? 1 : 0.8;
        var pts = [];
        for (k = 0; k < SPARK.length; k++) pts.push([lerp(tx + 2, hx - 1, SPARK[k][0]), 193 + SPARK[k][1] * (1 + 0.4 * fl)]);
        g.save(); g.lineJoin = 'round'; g.lineCap = 'round'; g.globalAlpha = 1 - sm(4.7, 4.9, lt);
        g.strokeStyle = C.spark; g.lineWidth = 9; g.globalAlpha *= 0.55;
        g.beginPath(); g.moveTo(pts[0][0], pts[0][1]); for (k = 1; k < pts.length; k++) g.lineTo(pts[k][0], pts[k][1]); g.stroke();
        g.globalAlpha = 1 - sm(4.7, 4.9, lt);
        g.strokeStyle = dark ? '#FFFFFF' : C.ink; g.lineWidth = 2.4;
        g.beginPath(); g.moveTo(pts[0][0], pts[0][1]); for (k = 1; k < pts.length; k++) g.lineTo(pts[k][0], pts[k][1]); g.stroke();
        g.restore();
      }

      // alan göstergesi
      txt(g, 'elektrik alanı  E = V ÷ d', 24, 276, { size: 14, weight: 600, color: C.ink });
      var bx0 = 24, bw = 376, bmax = 3600;
      g.save();
      g.strokeStyle = C.line2; g.lineWidth = 1.2;
      K.rr(g, bx0 + 0.5, 286.5, bw, 18, 4); g.stroke();
      var fw = (bw - 3) * clamp(E / bmax, 0, 1);
      g.fillStyle = E >= 2950 ? C.copText : C.cop;
      if (fw > 1) { K.rr(g, bx0 + 2, 288, fw, 15, 3); g.fill(); }
      var thx = bx0 + 2 + (bw - 3) * 3000 / bmax;
      g.strokeStyle = C.ink; g.lineWidth = 1.6; g.beginPath(); g.moveTo(thx, 281); g.lineTo(thx, 310); g.stroke();
      g.restore();
      txt(g, 'hava ≈ 3.000 V/mm', thx, 326, { size: 12, mono: true, weight: 500, color: C.ink, align: 'center' });
      var line = after ? 'kıvılcım çaktı: hava iletken oldu, yük boşaldı'
        : 'E = ' + K.num(Vb, 0) + ' V ÷ ' + K.num(gap, 1) + ' mm ≈ ' + K.num(Math.round(E / 10) * 10, 0) + ' V/mm';
      wrap(g, line, 420, 292, 236, 13, 17, after ? C.copText : C.ink2, 500);

      hline(g, 24, 656, 350, C.line);
      txt(g, '3.000 V/mm × 3 mm ≈ 9.000 V', 24, 384, { size: 18, mono: true, weight: 600, color: C.copText });
      txt(g, 'binlerce volt', 372, 384, { size: 15, color: C.ink2 });
      txt(g, 'çok az yük: zararsız', 24, 418, { size: 17, weight: 600, color: C.ink, alpha: after ? 1 : 0.6 });
      txt(g, 'saniyenin milyonda biri kadar sürer', 24, 442, { size: 14, color: C.ink2, alpha: after ? 1 : 0.6 });
      txt(g, 'gerçekte tehlike: yük miktarı, voltaj değil', 24, 476, { size: 15, weight: 600, color: C.blue });
    }

    /* ======================= ŞİMŞEK ======================= */
    var LEAD = [[392, 152], [378, 170], [398, 186], [382, 204], [404, 218], [394, 234], [420, 246], [432, 254], [440, 262]];
    var BRANCH = [[[378, 170], [360, 184], [362, 198]], [[404, 218], [424, 224], [430, 236]]];
    var LEADLEN = (function () {
      var out = [0];
      for (var i = 1; i < LEAD.length; i++) out.push(out[i - 1] + Math.hypot(LEAD[i][0] - LEAD[i - 1][0], LEAD[i][1] - LEAD[i - 1][1]));
      return out;
    })();
    function leadPts(frac) {
      var tot = LEADLEN[LEADLEN.length - 1], s = frac * tot, pts = [LEAD[0]];
      for (var i = 1; i < LEAD.length; i++) {
        if (s >= LEADLEN[i]) pts.push(LEAD[i]);
        else {
          var u = (s - LEADLEN[i - 1]) / (LEADLEN[i] - LEADLEN[i - 1]);
          pts.push([lerp(LEAD[i - 1][0], LEAD[i][0], u), lerp(LEAD[i - 1][1], LEAD[i][1], u)]);
          break;
        }
      }
      return pts;
    }
    function strokePts(g, pts) {
      g.beginPath(); g.moveTo(pts[0][0], pts[0][1]);
      for (var i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]);
      g.stroke();
    }
    function vSimsek(g, lt) {
      head(g, 'Yıldırım: dev bir kıvılcım');
      var k;
      var cha = sm(0.3, 2.2, lt);
      var lead = clamp((lt - 1.8) / 1.5, 0, 1);
      // basamaklı ilerleme
      var leadQ = Math.floor(lead * 14) / 14 + (lead * 14 % 1 > 0.6 ? (lead * 14 % 1 - 0.6) / 0.4 / 14 : 0);
      var flash = lt >= 3.4 && lt < 3.95 ? 1 - (lt - 3.4) / 0.55 : 0;
      var struck = lt >= 3.4;

      // zemin
      g.save();
      g.fillStyle = C.solid; g.fillRect(24, 300, 632, 34);
      g.strokeStyle = C.ink2; g.lineWidth = 2; g.beginPath(); g.moveTo(24, 300); g.lineTo(656, 300); g.stroke();
      g.restore();
      txt(g, 'yer', 640, 322, { size: 13, weight: 500, color: C.muted, align: 'right' });
      // ağaç
      g.save(); g.fillStyle = C.ink2; g.strokeStyle = C.ink2; g.lineWidth = 3;
      g.beginPath(); g.moveTo(440, 300); g.lineTo(440, 270); g.stroke();
      g.beginPath(); g.moveTo(440, 258); g.lineTo(424, 292); g.lineTo(456, 292); g.closePath(); g.fill();
      g.restore();
      // gözlemci
      g.save(); g.strokeStyle = C.ink; g.fillStyle = C.ink; g.lineWidth = 2.5; g.lineCap = 'round';
      g.beginPath(); g.arc(110, 270, 6, 0, TAU); g.fill();
      g.beginPath(); g.moveTo(110, 277); g.lineTo(110, 296); g.moveTo(110, 283); g.lineTo(101, 292); g.moveTo(110, 283); g.lineTo(119, 292); g.stroke();
      g.restore();
      txt(g, 'gözlemci', 110, 322, { size: 13, weight: 500, color: C.muted, align: 'center' });

      // yerde artı yük
      for (k = 0; k < 7; k++) charge(g, 340 + k * 28 + (k > 3 ? 8 : 0), 292, 5.5, false, cha * (struck ? 1 - sm(3.9, 5.5, lt) : 1));

      // bulut
      var circ = [[250, 124, 30], [298, 104, 42], [358, 98, 48], [420, 110, 40], [470, 124, 28]];
      g.save(); g.lineWidth = 3.5; g.strokeStyle = C.ink2; g.fillStyle = C.cloud;
      for (k = 0; k < circ.length; k++) { g.beginPath(); g.arc(circ[k][0], circ[k][1], circ[k][2], 0, TAU); g.stroke(); }
      K.rr(g, 240, 112, 244, 44, 20); g.stroke();
      for (k = 0; k < circ.length; k++) { g.beginPath(); g.arc(circ[k][0], circ[k][1], circ[k][2], 0, TAU); g.fill(); }
      K.rr(g, 240, 112, 244, 44, 20); g.fill();
      g.restore();
      // buz parçacıkları
      for (k = 0; k < 5; k++) {
        var uu = (lt * 0.35 + k * 0.2) % 1;
        var cxp = 280 + k * 40 + Math.sin(lt * 1.5 + k) * 5;
        g.save();
        g.fillStyle = C.white; g.strokeStyle = C.ink2; g.lineWidth = 1.3;
        g.beginPath(); g.arc(cxp, 142 - uu * 36, 2.8, 0, TAU); g.fill(); g.stroke();   // küçük: yukarı
        var cyp = 80 + ((lt * 0.3 + k * 0.2) % 1) * 38;
        g.beginPath(); g.arc(cxp + 18, cyp, 5.5, 0, TAU); g.fill(); g.stroke();       // iri: aşağı
        g.restore();
      }
      // yük ayrışması
      for (k = 0; k < 6; k++) charge(g, 268 + k * 40, 66, 6.5, false, cha * (struck ? 1 - sm(3.9, 5.5, lt) * 0.6 : 1));
      for (k = 0; k < 5; k++) charge(g, 290 + k * 40, 146, 6.5, true, cha * (struck ? 1 - sm(3.9, 5.5, lt) * 0.6 : 1));
      txt(g, 'buz parçacıkları', 24, 86, { size: 13, weight: 500, color: C.muted });
      txt(g, 'çarpışır, yükler ayrılır', 24, 103, { size: 13, weight: 500, color: C.muted });
      txt(g, 'üst: artı', 514, 72, { size: 13, weight: 600, color: C.copText, alpha: cha });
      txt(g, 'alt: eksi', 514, 160, { size: 13, weight: 600, color: C.blue, alpha: cha });

      // basamaklı öncü
      if (lt >= 1.8 && flash <= 0 && !struck) {
        g.save(); g.strokeStyle = C.grey; g.lineWidth = 2; g.lineJoin = 'round'; g.lineCap = 'round';
        var lp = leadPts(clamp(leadQ, 0, 1));
        strokePts(g, lp);
        g.lineWidth = 1.4;
        if (lead > 0.3) strokePts(g, BRANCH[0]);
        if (lead > 0.75) strokePts(g, BRANCH[1]);
        g.restore();
        txt(g, 'basamaklı öncü', 358, 214, { size: 13, weight: 500, color: C.ink2, align: 'right' });
      }
      // ana atım
      if (struck) {
        var gl = lt < 3.95 ? flash : 0;
        var base = clamp(1 - (lt - 3.95) / 3.5, 0, 1) * 0.3;
        var al = Math.max(gl, base);
        g.save(); g.lineJoin = 'round'; g.lineCap = 'round';
        g.globalAlpha = al * 0.6; g.strokeStyle = C.spark; g.lineWidth = 12; strokePts(g, LEAD); strokePts(g, BRANCH[0]); strokePts(g, BRANCH[1]);
        g.globalAlpha = al; g.strokeStyle = dark ? '#FFFFFF' : C.ink; g.lineWidth = 2.6; strokePts(g, LEAD);
        g.lineWidth = 1.6; strokePts(g, BRANCH[0]); strokePts(g, BRANCH[1]);
        g.restore();
        if (lt < 4.9) {
          arrow(g, 456, 250, 456, 196, C.copText, 2.6, 1 - sm(4.4, 4.9, lt));
          txt(g, 'ana atım: parlak,', 470, 214, { size: 13, weight: 600, color: C.copText, alpha: 1 - sm(4.4, 4.9, lt) });
          txt(g, 'yukarı doğru', 470, 231, { size: 13, weight: 600, color: C.copText, alpha: 1 - sm(4.4, 4.9, lt) });
        }
        // ısınan kanal
        var ha = sm(4.2, 4.8, lt) * (1 - sm(7, 8, lt));
        txt(g, 'kanal ≈ 30.000 °C', 466, 190, { size: 13, mono: true, weight: 600, color: C.copText, alpha: ha });
        txt(g, 'hava patlarcasına genişler', 466, 207, { size: 13, color: C.ink2, alpha: ha });
        // ses halkaları
        var r0 = (lt - 3.4) * 105;
        g.save();
        g.beginPath(); g.rect(24, 150, 632, 150); g.clip();
        g.strokeStyle = C.grey; g.lineWidth = 1.6;
        for (k = 0; k < 3; k++) {
          var rr3 = r0 - k * 34;
          if (rr3 > 8) { g.globalAlpha = 0.75 - k * 0.22; g.beginPath(); g.arc(440, 215, rr3, 0, TAU); g.stroke(); }
        }
        g.restore();
        if (r0 >= 330) {
          var pa = 0.5 + 0.5 * Math.sin((lt - 6.5) * 9);
          txt(g, 'gök gürültüsü', 110, 252, { size: 14, weight: 600, color: C.copText, align: 'center', alpha: 0.6 + 0.4 * pa });
        }
      }
      if (struck) txt(g, 'ışık hemen, ses sonra', 24, 150, { size: 13, weight: 500, color: C.muted });

      hline(g, 24, 656, 346, C.line);
      txt(g, 'yaklaşık 30.000 A, saniyenin binde biri kadar sürer', 24, 378, { size: 17, weight: 600, color: C.ink });
      txt(g, 'kanaldaki hava ≈ 30.000 °C’ye ısınır ve patlarcasına genişler', 24, 408, { size: 15, color: C.ink2 });
      txt(g, 'gök gürültüsü: slayt 2’deki hesap (1.000 ÷ 343)', 24, 436, { size: 15, weight: 600, color: C.blue });
      txt(g, 'fırtınada açık alanda durulmaz', 24, 470, { size: 16, weight: 600, color: C.copText });
    }

    /* ======================= ANA ÇERÇEVE ======================= */
    function frame(t, dt) {
      var g = sf.ctx;
      tNow = t;
      var lt;
      if (K.reducedMotion) {
        if (auto) view = VIEWS[Math.floor(t / DEMO) % VIEWS.length];
        lt = STILL[view];
      } else if (auto) {
        view = VIEWS[Math.floor(t / DEMO) % VIEWS.length];
        lt = t % DEMO;
      } else {
        lt = (((t - vStart) % DEMO) + DEMO) % DEMO;
      }
      sf.clear();
      g.save();
      if (view === 'surtunme') vSurtunme(g, lt);
      else if (view === 'cekim') vCekim(g, lt);
      else if (view === 'nem') vNem(g, lt);
      else if (view === 'kivilcim') vKivilcim(g, lt);
      else vSimsek(g, lt);
      g.restore();
      tag(g, 'ölçekli değil · basitleştirilmiş model', sf.w - 24, 506);
    }

    return {
      reset: function () { resetState(); },
      frame: frame,
      set: function (key, val) {
        if (key === 'view' && VIEWS.indexOf(val) >= 0) {
          auto = false; view = val; vStart = tNow;
        }
      },
      read: function (key) {
        if (key === 'view') return view;
        if (key === 'explain') return EXPLAIN[view];
        if (key === 'numbers') return NUMBERS[view];
        return '';
      },
      resize: function () { sf.resize(); },
      dispose: function () { sf.dispose(); }
    };
  });
})();
