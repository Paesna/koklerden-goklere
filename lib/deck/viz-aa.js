/* Köklerden Göklere · Builder AA: statik elektrik
 * static-lab · 1120×440 (odak slaytı) · 2B, düz "müze çizimi" biçimi
 * Beş görünüm: surtunme, cekim, nem, kivilcim, simsek. Otomatik gezinti her görünümü ~8 sn gösterir.
 * set('view', ...) gezintiyi durdurur ve o görünümü döngüde tutar.
 * Her görünüm tasarım uzayında çizilir ve kutuya sığdırılır (fit); etiketler ekranda >= 15 px kalır.
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

  /* Altyazı cümleleri: her biri tek cümle, <= 110 karakter */
  var EXPLAIN = {
    surtunme: 'Sürtünmede yalnızca elektronlar saçtan balona geçer: saç artı, balon eksi yüklü olur.',
    cekim: 'Eksi yüklü balon kâğıttaki yükleri kaydırır; yakın yüz artı olduğu için kâğıt balona çekilir.',
    nem: 'Nemli havada ince su tabakası yükü havaya kaçırır; kuru havada yük yerinde kalır.',
    kivilcim: '3 mm aralıkta yaklaşık 9.000 V: hava dayanamaz, kıvılcım çakar ve yük boşalır.',
    simsek: 'Bulutta ayrılan yük yere dev bir kıvılcım gibi boşalır; ışığı hemen görür, sesi geç duyarız.'
  };
  var NUMBERS = {
    surtunme: '', cekim: '', nem: '',
    kivilcim: '≈ 3.000 V/mm × 3 mm ≈ 9.000 V',
    simsek: 'ses: 1.000 m ÷ 343 m/s ≈ 2,9 s'
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

    var view, auto, vStart, tNow, SC = 1;
    function resetState() {
      view = 'surtunme'; auto = true; vStart = 0; tNow = 0;
    }
    resetState();

    /* ---------- sığdırma: tasarım dikdörtgenini kutuya oturtur ---------- */
    function fit(g, rx, ry, rw, rh, maxS) {
      var W = sf.w, H = sf.h;
      SC = Math.min(W * 0.96 / rw, H * 0.94 / rh, maxS || 9);
      g.translate((W - rw * SC) / 2 - rx * SC, (H - rh * SC) / 2 - ry * SC);
      g.scale(SC, SC);
    }
    /* etiket: boyut ekran pikselidir (>= 15) */
    function lab(g, s, x, y, o) {
      o = o || {};
      var q = { size: (o.size || 16) / SC, weight: o.weight || 600, color: o.color || C.ink, align: o.align, mono: o.mono, alpha: o.alpha };
      K.label(g, s, x, y, q);
    }
    function chipLab(g, s, x, y, o) {
      o = o || {};
      var px = (o.size || 16);
      g.save(); g.font = K.font(px / SC, o.weight || 600, o.mono);
      var w = g.measureText(s).width + 16 / SC, h = (px + 10) / SC;
      var x0 = o.align === 'center' ? x - w / 2 : o.align === 'right' ? x - w : x;
      g.globalAlpha *= (o.alpha === undefined ? 1 : o.alpha);
      g.fillStyle = dark ? 'rgba(14,18,26,.88)' : 'rgba(255,255,255,.92)';
      g.strokeStyle = o.border || C.line2; g.lineWidth = 1 / SC;
      K.rr(g, x0, y - px * 0.95 / SC - 3 / SC, w, h, 6 / SC); g.fill(); g.stroke();
      g.restore();
      lab(g, s, x0 + 8 / SC, y, o);
    }
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
    /* yumuşak vurgu halkası */
    function ring(g, x, y, r, t, a) {
      var p = (t * 0.8) % 1;
      g.save();
      g.globalAlpha *= a * (1 - p) * 0.8;
      g.strokeStyle = C.copText; g.lineWidth = 3 / SC;
      g.beginPath(); g.arc(x, y, r * (0.7 + 0.5 * p), 0, TAU); g.stroke();
      g.restore();
    }
    function balloon(g, bx, by, rx, ry) {
      g.save();
      g.fillStyle = C.blueSoft; g.strokeStyle = C.blue; g.lineWidth = 2;
      g.beginPath(); g.ellipse(bx, by, rx, ry, 0, 0, TAU); g.fill(); g.stroke();
      g.beginPath(); g.moveTo(bx - 5, by + ry + 7); g.lineTo(bx + 5, by + ry + 7); g.lineTo(bx, by + ry - 1); g.closePath();
      g.fillStyle = C.blue; g.fill();
      g.restore();
    }

    /* ======================= SÜRTÜNME ======================= */
    var ROWS = [-72, -36, 0, 36, 72];
    function vSurtunme(g, lt) {
      fit(g, 30, 52, 600, 322, 1.6);
      var p = sm(0.9, 6.2, lt);
      var rubAmp = sm(0, 0.5, lt) * (1 - sm(6.6, 7.2, lt));
      var by = 190 + Math.sin(lt * 3.4) * 14 * rubAmp, bx = 172;
      var i, k;

      g.save();
      g.strokeStyle = C.ink2; g.lineWidth = 2.2; g.lineCap = 'round';
      g.fillStyle = C.ink2;
      K.rr(g, 40, 64, 104, 12, 4); g.fill();
      for (i = 0; i < 14; i++) {
        var x0 = 46 + i * 7, sw = (i % 3 - 1) * 5;
        g.beginPath(); g.moveTo(x0, 74);
        g.bezierCurveTo(x0 - 8, 150, x0 + 10, 220, x0 + sw, 304);
        g.stroke();
      }
      g.restore();
      balloon(g, bx, by, 56, 68);
      arrow(g, bx + 74, by - 46, bx + 74, by - 16, C.grey, 1.8, rubAmp);
      arrow(g, bx + 74, by - 16, bx + 74, by - 46, C.grey, 1.8, rubAmp);
      for (k = 0; k < 5; k++) charge(g, 74 + (k % 2) * 18, 128 + k * 30, 6, false, p);
      for (k = 0; k < 6; k++) {
        var a = (120 + k * 24) * PI / 180;
        charge(g, bx + 40 * Math.cos(a), by + 52 * Math.sin(a), 6, true, p);
      }

      /* yakınlaştırma merceği */
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
      g.restore();
      g.save(); g.strokeStyle = C.ink; g.lineWidth = 1.6;
      g.beginPath(); g.arc(cx, cy, R, 0, TAU); g.stroke(); g.restore();
      lab(g, 'saç', cx - 70, cy - R + 44, { size: 17, color: C.ink2, align: 'center' });
      lab(g, 'balon', cx + 70, cy - R + 44, { size: 17, color: C.ink2, align: 'center' });
      /* geçiş vurgusu */
      if (p > 0.02 && p < 0.97) ring(g, cx, cy, 40, lt, 1);

      /* sonuç etiketleri */
      var c1 = n ? C.copText : C.muted, c2 = n ? C.blue : C.muted;
      chipLab(g, n ? 'saç: artı yüklü' : 'saç: yüksüz', 40, 346, { size: 17, color: c1, border: c1 });
      chipLab(g, n ? 'balon: eksi yüklü' : 'balon: yüksüz', 222, 346, { size: 17, color: c2, border: c2 });
    }

    /* ======================= ÇEKİM ======================= */
    function vCekim(g, lt) {
      fit(g, 24, 56, 636, 296, 1.5);
      var a = sm(0.5, 2, lt) - sm(6.3, 7.6, lt);
      var q = sm(0.7, 1, a);
      var k, oy = 70;

      /* sol: balon ve kâğıtlar */
      var by = 82 + 32 * a + oy, bx = 140;
      g.save(); g.strokeStyle = C.ink2; g.lineWidth = 2;
      g.beginPath(); g.moveTo(24, 196 + oy); g.lineTo(330, 196 + oy); g.stroke(); g.restore();
      balloon(g, bx, by, 34, 40);
      for (k = 0; k < 4; k++) charge(g, bx + (k - 1.5) * 15, by + 20, 5.5, true, 1);
      for (k = 0; k < 3; k++) {
        var px = 104 + k * 34, py = 192 + oy - 30 * q - k * 2 * q + Math.sin(lt * 9 + k) * 1.2 * q;
        g.save(); g.translate(px, py);
        g.rotate((k - 1) * 0.08 * q);
        g.fillStyle = C.white; g.strokeStyle = C.ink2; g.lineWidth = 1.5;
        g.fillRect(-13, -3, 26, 6); g.strokeRect(-13, -3, 26, 6);
        g.restore();
      }
      lab(g, 'yüklü balon', bx + 44, by - 6, { size: 16, color: C.ink2 });
      lab(g, 'kâğıt parçaları', 100, 196 + oy + 26, { size: 16, color: C.ink2 });

      /* bağlantı çizgileri */
      var tx = 350, ty0 = 62, ty1 = 346;
      g.save(); g.strokeStyle = C.line2; g.lineWidth = 1.2; g.setLineDash([4, 4]);
      g.beginPath(); g.moveTo(150, 192 + oy - 30 * q); g.lineTo(tx, 150); g.moveTo(150, 192 + oy - 30 * q); g.lineTo(tx, 240); g.stroke();
      g.setLineDash([]);
      g.fillStyle = C.card; g.strokeStyle = C.ink; g.lineWidth = 1.5;
      K.rr(g, tx + 0.5, ty0 + 0.5, 306, ty1 - ty0, 10); g.fill(); g.stroke();
      g.restore();

      /* yakından: balon yüzeyi ve kâğıdın içi */
      lab(g, 'yakından: kâğıdın içi', tx + 14, ty0 + 26, { size: 16, color: C.ink });
      g.save();
      g.fillStyle = C.blueSoft; g.strokeStyle = C.blue; g.lineWidth = 1.5;
      K.rr(g, tx + 12, 98, 282, 26, 6); g.fill(); g.stroke(); g.restore();
      for (k = 0; k < 7; k++) charge(g, tx + 36 + k * 38, 111, 7, true, 1);

      var X0 = tx + 20, PW = 266, PY = 150, PH = 130;
      g.save();
      g.fillStyle = C.white; g.strokeStyle = C.ink2; g.lineWidth = 1.5;
      K.rr(g, X0, PY, PW, PH, 4); g.fill(); g.stroke(); g.restore();
      var rr2, cc;
      for (rr2 = 0; rr2 < 3; rr2++) {
        for (cc = 0; cc < 7; cc++) {
          var axp = X0 + 24 + cc * 36, ayp = PY + 26 + rr2 * 38;
          charge(g, axp, ayp, 8, false, 1);
          charge(g, axp + 11, ayp + 11 * q, 5, true, 1);
        }
      }
      g.save();
      g.setLineDash([5, 4]); g.lineWidth = 2.5; g.globalAlpha = q;
      g.strokeStyle = C.cop; g.beginPath(); g.moveTo(X0 + 3, PY + 1); g.lineTo(X0 + PW - 3, PY + 1); g.stroke();
      g.strokeStyle = C.blue; g.beginPath(); g.moveTo(X0 + 3, PY + PH - 1); g.lineTo(X0 + PW - 3, PY + PH - 1); g.stroke();
      g.restore();
      lab(g, 'yakın yüz: artı', X0, PY - 8, { size: 16, color: C.copText, alpha: 0.35 + 0.65 * q });
      lab(g, 'uzak yüz: eksi', X0, PY + PH + 22, { size: 16, color: C.blue, alpha: 0.35 + 0.65 * q });
      arrow(g, X0 + PW - 24, PY - 4, X0 + PW - 24, PY - 40, C.cop, 3.5, q);
      arrow(g, X0 + PW - 24, PY + PH + 6, X0 + PW - 24, PY + PH + 24, C.grey, 2, q);
      if (q > 0.05 && q < 0.99) ring(g, X0 + PW / 2, PY + 4, 34, lt, q);
    }

    /* ======================= NEM ======================= */
    function vNem(g, lt) {
      fit(g, 24, 46, 632, 304, 1.5);
      var fade = sm(0, 0.4, lt);
      var panels = [{ x: 24, humid: false, title: 'kuru hava' }, { x: 346, humid: true, title: 'nemli hava' }];
      var pi, k;
      for (pi = 0; pi < 2; pi++) {
        var pn = panels[pi], x = pn.x;
        g.save();
        g.fillStyle = C.card; g.strokeStyle = C.ink; g.lineWidth = 1.5;
        K.rr(g, x + 0.5, 52.5, 310, 290, 10); g.fill(); g.stroke(); g.restore();
        lab(g, pn.title, x + 16, 82, { size: 18, color: C.ink });
        g.save();
        g.fillStyle = C.blueSoft; g.strokeStyle = C.blue; g.lineWidth = 1.5;
        K.rr(g, x + 40, 214, 230, 34, 4); g.fill(); g.stroke(); g.restore();
        if (pn.humid) {
          g.save();
          g.fillStyle = C.water; g.globalAlpha = 0.9;
          K.rr(g, x + 38, 206, 234, 8, 3); g.fill();
          for (k = 0; k < 9; k++) { g.beginPath(); g.arc(x + 54 + k * 26, 205, 3.5 + (k % 2), 0, TAU); g.fill(); }
          g.restore();
          lab(g, 'ince su tabakası', x + 16, 274, { size: 16, color: C.blue });
          g.save(); g.fillStyle = C.water; g.globalAlpha = 0.8;
          for (k = 0; k < 7; k++) { g.beginPath(); g.arc(x + 40 + k * 37 + Math.sin(lt * 0.8 + k * 2) * 6, 112 + (k * 29 % 40) + Math.cos(lt * 0.7 + k) * 5, 3, 0, TAU); g.fill(); }
          g.restore();
        }
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
        var gaugeV = (pn.humid ? left / N : 1) * fade;
        g.save();
        g.strokeStyle = C.line2; g.lineWidth = 1.2;
        K.rr(g, x + 20.5, 292.5, 270, 16, 4); g.stroke();
        g.fillStyle = C.blue;
        if (gaugeV > 0.02) { K.rr(g, x + 22, 294, 267 * gaugeV, 13, 3); g.fill(); }
        g.restore();
        lab(g, pn.humid ? (left < 0.5 ? 'yük havaya kaçtı' : 'yük azalıyor') : 'yük korunuyor', x + 16, 332, { size: 17, color: pn.humid ? C.copText : C.blue });
      }
    }

    /* ======================= KIVILCIM ======================= */
    var SPARK = [[0, 0], [0.18, -5], [0.3, 4], [0.47, -6], [0.6, 3], [0.78, -4], [1, 0]];
    function vKivilcim(g, lt) {
      fit(g, 76, 96, 540, 246, 2.1);
      var gap = 12 - 9 * sm(0.4, 4.2, lt);
      var Vb = lt < 4.4 ? 9000 : Math.max(0, 9000 * (1 - (lt - 4.4) / 0.25));
      var E = Vb / gap;
      var sparkOn = lt >= 4.4 && lt < 4.9;
      var after = lt >= 4.5;
      var hx = 420, tx = hx - gap * 8, k;
      var chg = after ? clamp(1 - (lt - 4.4) / 0.4, 0, 1) : 1;

      /* kapı ve kol */
      g.save();
      g.fillStyle = C.solid; g.strokeStyle = C.ink2; g.lineWidth = 2;
      g.fillRect(480, 112, 120, 140); g.strokeRect(480, 112, 120, 140);
      g.restore();
      g.save();
      g.fillStyle = dark ? '#6B7384' : '#C9CCD1'; g.strokeStyle = C.ink; g.lineWidth = 1.6;
      K.rr(g, hx, 182, 108, 22, 11); g.fill(); g.stroke();
      g.beginPath(); g.arc(520, 193, 17, 0, TAU); g.fill(); g.stroke();
      g.restore();
      lab(g, 'metal kapı kolu', hx + 54, 168, { size: 16, color: C.ink2, align: 'center' });
      for (k = 0; k < 3; k++) charge(g, hx + 14 + k * 18, 193, 5.5, false, clamp((1 - gap / 12) * 1.6, 0, 1) * chg);

      /* el ve kol */
      g.save();
      g.fillStyle = C.skin; g.strokeStyle = C.ink2; g.lineWidth = 1.5;
      K.rr(g, tx - 232, 156, 150, 72, 14); g.fill(); g.stroke();
      K.rr(g, tx - 100, 181, 100, 24, 12); g.fill(); g.stroke();
      g.restore();
      for (k = 0; k < 3; k++) charge(g, tx - 22 - k * 20, 193, 5.5, true, chg);
      for (k = 0; k < 4; k++) charge(g, tx - 205 + k * 28, 192, 6, true, chg);
      lab(g, 'vücutta biriken yük', tx - 232, 146, { size: 16, color: C.ink2 });

      /* alan çizgileri */
      var fa = clamp(E / 3000, 0, 1) * 0.85 * (sparkOn || !after ? 1 : 0);
      if (fa > 0.02) {
        g.save(); g.strokeStyle = C.grey; g.lineWidth = 1.3; g.setLineDash([4, 4]); g.globalAlpha = fa;
        for (k = -2; k <= 2; k++) {
          g.beginPath(); g.moveTo(tx + 3, 193 + k * 3); g.quadraticCurveTo((tx + hx) / 2, 193 + k * 11, hx - 1, 193 + k * 3); g.stroke();
        }
        g.restore();
      }
      /* aralık ölçüsü */
      var dy = 224;
      if (!after || sparkOn) {
        g.save(); g.strokeStyle = C.ink2; g.lineWidth = 1.2;
        g.beginPath(); g.moveTo(tx, dy); g.lineTo(hx, dy);
        g.moveTo(tx, dy - 5); g.lineTo(tx, dy + 5); g.moveTo(hx, dy - 5); g.lineTo(hx, dy + 5); g.stroke(); g.restore();
        lab(g, 'aralık d = ' + K.num(gap, 1) + ' mm', (tx + hx) / 2, dy + 22, { size: 16, mono: true, color: C.ink2, align: 'center' });
      }
      /* kıvılcım */
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

      /* alan göstergesi */
      var bx0 = 76, bw = 530, bmax = 3600, by0 = 290;
      g.save();
      g.strokeStyle = C.line2; g.lineWidth = 1.2;
      K.rr(g, bx0 + 0.5, by0 + 0.5, bw, 20, 4); g.stroke();
      var fw = (bw - 3) * clamp(E / bmax, 0, 1);
      g.fillStyle = E >= 2950 ? C.copText : C.cop;
      if (fw > 1) { K.rr(g, bx0 + 2, by0 + 2, fw, 17, 3); g.fill(); }
      var thx = bx0 + 2 + (bw - 3) * 3000 / bmax;
      g.strokeStyle = C.ink; g.lineWidth = 1.8; g.beginPath(); g.moveTo(thx, by0 - 6); g.lineTo(thx, by0 + 28); g.stroke();
      g.restore();
      lab(g, 'hava dayanır: ≈ 3.000 V/mm', thx, by0 + 50, { size: 16, color: C.ink, align: 'center' });
      var line = after ? 'kıvılcım çaktı: yük boşaldı'
        : 'alan E = ' + K.num(Vb, 0) + ' V ÷ ' + K.num(gap, 1) + ' mm ≈ ' + K.num(Math.round(E / 10) * 10, 0) + ' V/mm';
      lab(g, line, bx0, by0 - 12, { size: 16, mono: !after, color: after ? C.copText : C.ink2 });
      if (!after && E > 2400) ring(g, thx - 20, by0 + 10, 22, lt, clamp((E - 2400) / 600, 0, 1));
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
      fit(g, 24, 50, 636, 290, 1.5);
      var k;
      var cha = sm(0.3, 2.2, lt);
      var lead = clamp((lt - 1.8) / 1.5, 0, 1);
      var leadQ = Math.floor(lead * 14) / 14 + (lead * 14 % 1 > 0.6 ? (lead * 14 % 1 - 0.6) / 0.4 / 14 : 0);
      var flash = lt >= 3.4 && lt < 3.95 ? 1 - (lt - 3.4) / 0.55 : 0;
      var struck = lt >= 3.4;

      /* yer */
      g.save();
      g.fillStyle = C.solid; g.fillRect(24, 300, 636, 40);
      g.strokeStyle = C.ink2; g.lineWidth = 2; g.beginPath(); g.moveTo(24, 300); g.lineTo(660, 300); g.stroke();
      g.restore();
      /* ağaç */
      g.save(); g.fillStyle = C.ink2; g.strokeStyle = C.ink2; g.lineWidth = 3;
      g.beginPath(); g.moveTo(440, 300); g.lineTo(440, 270); g.stroke();
      g.beginPath(); g.moveTo(440, 258); g.lineTo(424, 292); g.lineTo(456, 292); g.closePath(); g.fill();
      g.restore();
      /* gözlemci */
      g.save(); g.strokeStyle = C.ink; g.fillStyle = C.ink; g.lineWidth = 2.5; g.lineCap = 'round';
      g.beginPath(); g.arc(110, 270, 6, 0, TAU); g.fill();
      g.beginPath(); g.moveTo(110, 277); g.lineTo(110, 296); g.moveTo(110, 283); g.lineTo(101, 292); g.moveTo(110, 283); g.lineTo(119, 292); g.stroke();
      g.restore();

      /* yerde artı yük */
      for (k = 0; k < 7; k++) charge(g, 340 + k * 28 + (k > 3 ? 8 : 0), 292, 5.5, false, cha * (struck ? 1 - sm(3.9, 5.5, lt) : 1));

      /* bulut */
      var circ = [[250, 124, 30], [298, 104, 42], [358, 98, 48], [420, 110, 40], [470, 124, 28]];
      g.save(); g.lineWidth = 3.5; g.strokeStyle = C.ink2; g.fillStyle = C.cloud;
      for (k = 0; k < circ.length; k++) { g.beginPath(); g.arc(circ[k][0], circ[k][1], circ[k][2], 0, TAU); g.stroke(); }
      K.rr(g, 240, 112, 244, 44, 20); g.stroke();
      for (k = 0; k < circ.length; k++) { g.beginPath(); g.arc(circ[k][0], circ[k][1], circ[k][2], 0, TAU); g.fill(); }
      K.rr(g, 240, 112, 244, 44, 20); g.fill();
      g.restore();
      /* buz parçacıkları */
      for (k = 0; k < 5; k++) {
        var uu = (lt * 0.35 + k * 0.2) % 1;
        var cxp = 280 + k * 40 + Math.sin(lt * 1.5 + k) * 5;
        g.save();
        g.fillStyle = C.white; g.strokeStyle = C.ink2; g.lineWidth = 1.3;
        g.beginPath(); g.arc(cxp, 142 - uu * 36, 2.8, 0, TAU); g.fill(); g.stroke();
        var cyp = 80 + ((lt * 0.3 + k * 0.2) % 1) * 38;
        g.beginPath(); g.arc(cxp + 18, cyp, 5.5, 0, TAU); g.fill(); g.stroke();
        g.restore();
      }
      for (k = 0; k < 6; k++) charge(g, 268 + k * 40, 66, 6.5, false, cha * (struck ? 1 - sm(3.9, 5.5, lt) * 0.6 : 1));
      for (k = 0; k < 5; k++) charge(g, 290 + k * 40, 146, 6.5, true, cha * (struck ? 1 - sm(3.9, 5.5, lt) * 0.6 : 1));
      if (lt < 3.4) lab(g, 'buz parçacıkları çarpışır, yükler ayrılır', 24, 92, { size: 16, color: C.ink2, alpha: sm(0.2, 1, lt) });

      /* basamaklı öncü */
      if (lt >= 1.8 && flash <= 0 && !struck) {
        g.save(); g.strokeStyle = C.grey; g.lineWidth = 2; g.lineJoin = 'round'; g.lineCap = 'round';
        var lp = leadPts(clamp(leadQ, 0, 1));
        strokePts(g, lp);
        g.lineWidth = 1.4;
        if (lead > 0.3) strokePts(g, BRANCH[0]);
        if (lead > 0.75) strokePts(g, BRANCH[1]);
        g.restore();
        lab(g, 'basamaklı öncü', 352, 222, { size: 16, color: C.ink2, align: 'right' });
      }
      /* ana atım */
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
          lab(g, 'ana atım: parlak, yukarı doğru', 470, 224, { size: 16, color: C.copText, alpha: 1 - sm(4.4, 4.9, lt) });
        }
        /* ses halkaları */
        var r0 = (lt - 3.4) * 105;
        g.save();
        g.beginPath(); g.rect(24, 150, 636, 150); g.clip();
        g.strokeStyle = C.grey; g.lineWidth = 1.6;
        for (k = 0; k < 3; k++) {
          var rr3 = r0 - k * 34;
          if (rr3 > 8) { g.globalAlpha = 0.75 - k * 0.22; g.beginPath(); g.arc(440, 215, rr3, 0, TAU); g.stroke(); }
        }
        g.restore();
        if (r0 >= 330) {
          var pa = 0.5 + 0.5 * Math.sin((lt - 6.5) * 9);
          lab(g, 'gök gürültüsü', 110, 252, { size: 17, color: C.copText, align: 'center', alpha: 0.6 + 0.4 * pa });
        } else if (lt > 4.6) {
          lab(g, 'ışık hemen gelir, ses yoldadır', 24, 190, { size: 16, color: C.ink2, alpha: sm(4.6, 5.2, lt) });
        }
      }
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
      K.label(g, 'ölçekli değil · basitleştirilmiş', sf.w - 12, 16, { mono: true, size: 12, weight: 500, color: C.muted, align: 'right' });
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
