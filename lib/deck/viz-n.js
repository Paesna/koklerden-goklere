/* Köklerden Göklere · Builder N: modülasyon
 * modulation-lab · 1120×380 · açık tema (2B)
 * Bit dizisi bir taşıyıcı dalgaya nasıl yazılır, alıcı nasıl geri okur.
 * Görünümler: tasiyici, genlik (AM), frekans (FM), gurultu.
 * Sözleşme: kg-viz.js. Tüm hareket frame(t) içinden sürülür, rastgelelik KGViz.rng ile.
 */
(function () {
  'use strict';
  var K = window.KGViz;
  if (!K) return;
  var P = K.palette;
  var clamp = K.clamp;

  var VIEWS = ['tasiyici', 'genlik', 'frekans', 'gurultu'];
  var TABS = ['taşıyıcı', 'genlik (AM)', 'frekans (FM)', 'gürültü'];
  var DEMO = 9;
  var BITS = [1, 0, 1, 1, 0, 1, 0, 0];
  var NB = BITS.length;
  var BIT_T = 0.75;       // seconds per bit
  var T0 = 0.5;           // playhead start
  var DELAY = 0.4;        // receiver lag in bits

  var CAPTION = {
    tasiyici: 'taşıyıcı dalga: kendi başına bilgi taşımaz',
    genlik: 'güçlü salınım = 1, zayıf salınım = 0',
    frekans: 'sık salınım = 1, seyrek salınım = 0 (FM radyonun FM’i bu)',
    gurultu: 'küçük bozulmalar eşiği aşmaz: bilgi bozulmadan okunur'
  };
  var EXPLAIN = {
    tasiyici: 'Anten önce düzgün bir taşıyıcı dalga yayar. Bu dalga hep aynıdır, bu yüzden tek başına hiçbir bit taşımaz.',
    genlik: 'Verici, dalganın gücünü bite göre değiştirir: 1 için güçlü, 0 için zayıf. Alıcı gücü bir eşikle karşılaştırıp bitleri geri okur.',
    frekans: 'Verici, dalganın sıklığını bite göre değiştirir: 1 için sık, 0 için seyrek. Güç sabit kalır; alıcı salınımın ne kadar hızlı olduğunu ölçer.',
    gurultu: 'Yolda dalgaya küçük bozulmalar karışır. Güçlü ve zayıf düzeyler eşikten hâlâ açıkça ayrıldığı için alıcı aynı bitleri okur: dijital bilgi böyle korunur.'
  };

  K.register('modulation-lab', function (el, opts) {
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
      copText: dark ? P.copperLight : P.copperText || '#A64B22',
      grey: dark ? '#9AA3B2' : '#666C78',
      card: dark ? '#161B26' : '#FFFFFF',
      onFill: dark ? P.night : '#FFFFFF'
    };

    /* ---------- geometry (CSS px at 1120×380) ---------- */
    var XL = 180, BW = 114, NX = NB * BW, XR = XL + NX;   // 8 × 114 = 912, ends at 1092
    var Y_BOX = 48, H_BOX = 38;
    var CY_TX = 132, A_TX = 34;
    var CY_RX = 222, A_RX = 20;
    var M_TOP = 250, M_BOT = 304;                         // measurement plot
    var Y_REC = 316, H_REC = 36;
    var Y_CAP = 372;
    var THR = 0.62;

    /* ---------- precomputed signals, one sample per px ---------- */
    var rng = K.rng(2026);
    var ampAM = [], phAM = [], phFM = [], frq = [], nz = [], nzSlow = [];
    var i, b;
    function smooth(u) { return u * u * (3 - 2 * u); }
    function levelAt(x, lo, hi) {              // bit-wise level with short ramps
      var pos = x / BW, bi = Math.min(NB - 1, Math.floor(pos)), f = pos - bi, cur = BITS[bi] ? hi : lo, prev, nxt, TW = 0.16;
      if (f < TW / 2 && bi > 0) { prev = BITS[bi - 1] ? hi : lo; return prev + (cur - prev) * smooth(0.5 + f / TW); }
      if (f > 1 - TW / 2 && bi < NB - 1) { nxt = BITS[bi + 1] ? hi : lo; return cur + (nxt - cur) * smooth((f - (1 - TW / 2)) / TW * 0.5); }
      return cur;
    }
    var cyc = 0, n1 = 0, n2 = 0;
    for (i = 0; i <= NX; i++) {
      ampAM.push(levelAt(i, 0.28, 1));
      phAM.push(6.2832 * 4 * i / BW);
      frq.push(levelAt(i, 2, 5));
      cyc += frq[i] / BW;
      phFM.push(6.2832 * cyc);
      n1 = n1 * 0.55 + (rng() - 0.5) * 2;     // bumps, a few px wide
      n2 = n2 * 0.97 + (rng() - 0.5) * 0.2;   // slow wander for the measured strength
      nz.push(n1);
      nzSlow.push(n2);
    }
    var nzMax = 0.0001, nsMax = 0.0001;
    for (i = 0; i <= NX; i++) { nzMax = Math.max(nzMax, Math.abs(nz[i])); nsMax = Math.max(nsMax, Math.abs(nzSlow[i])); }

    /* ---------- state ---------- */
    var view = 'tasiyici', auto = true, viewT0 = 0, lastT = 0;
    function resetState() { view = 'tasiyici'; auto = true; viewT0 = 0; lastT = 0; }
    resetState();

    /* ---------- per-view signal definitions ---------- */
    function txY(v, k) {      // transmitted waveform value in -1..1 at sample k
      if (v === 'tasiyici') return 0.9;
      if (v === 'frekans') return 0.85;
      return ampAM[k];
    }
    function phaseOf(v, k) { return v === 'frekans' ? phFM[k] : phAM[k]; }
    function measured(v, k) { // what the receiver measures, 0..1
      if (v === 'tasiyici') return 0.9;
      if (v === 'frekans') return frq[k] / 5;
      var m = ampAM[k];
      if (v === 'gurultu') m += 0.12 * nzSlow[k] / nsMax * 1.0 + 0.04 * nz[k] / nzMax;
      return m;
    }
    function recovered(v, bi) {
      var k = Math.round((bi + 0.5) * BW);
      return measured(v, k) > (v === 'frekans' ? 0.7 : THR) ? 1 : 0;
    }
    function thrFor(v) { return v === 'frekans' ? 0.7 : THR; }

    /* ---------- drawing helpers ---------- */
    function txt(g, s, x, y, o) { K.label(g, s, x, y, o); }
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
      for (var j = 0; j < VIEWS.length; j++) {
        var w = g.measureText(TABS[j]).width + 22, on = VIEWS[j] === view;
        g.fillStyle = on ? C.ink : 'transparent';
        g.strokeStyle = on ? C.ink : C.line;
        g.lineWidth = 1;
        K.rr(g, x + 0.5, 10.5, w, 26, 13);
        if (on) g.fill();
        g.stroke();
        g.fillStyle = on ? (dark ? P.night : '#FFFFFF') : C.muted;
        g.textAlign = 'center'; g.textBaseline = 'alphabetic';
        g.fillText(TABS[j], x + 0.5 + w / 2, 28);
        x += w + 8;
      }
      g.restore();
    }

    /* flat antenna: mast, two arms, base; arcs show waves leaving or arriving */
    function antenna(g, cx, cy, tx, tt, a) {
      g.save();
      g.strokeStyle = C.ink2; g.fillStyle = C.ink2; g.lineWidth = 2.4; g.lineCap = 'round'; g.lineJoin = 'round';
      g.beginPath(); g.moveTo(cx, cy + 26); g.lineTo(cx, cy - 18); g.stroke();
      g.beginPath(); g.moveTo(cx - 12, cy - 30); g.lineTo(cx, cy - 18); g.lineTo(cx + 12, cy - 30); g.stroke();
      K.rr(g, cx - 14, cy + 26, 28, 7, 2); g.fill();
      g.beginPath(); g.arc(cx, cy - 18, 3.2, 0, 6.2832); g.fill();
      // arcs on the right (towards the other antenna)
      g.lineWidth = 2;
      for (var j = 0; j < 3; j++) {
        var u = ((tt * 0.8 + j / 3) % 1);
        if (!tx) u = 1 - u;
        var r = 12 + u * 22, al = (tx ? 1 - u : u) * a;
        g.strokeStyle = C.blue; g.globalAlpha = Math.max(0, al) * 0.9;
        g.beginPath(); g.arc(cx + 2, cy - 18, r, -0.9, 0.9); g.stroke();
      }
      g.restore();
    }

    function wavePath(g, cy, amp, v, k0, k1, tt, noisy, scale) {
      var k, y, s = scale || 1, step = 1;
      g.beginPath();
      for (k = k0; k <= k1; k += step) {
        y = txY(v, k) * Math.sin(phaseOf(v, k) - tt * 5);
        if (noisy) y += 0.2 * nz[k] / nzMax;
        y = cy - clamp(y, -1.25, 1.25) * amp * s;
        if (k === k0) g.moveTo(XL + k, y); else g.lineTo(XL + k, y);
      }
      g.stroke();
    }

    function sentBoxes(g, p, a) {
      var cur = p >= 0 && p < NB ? Math.floor(p) : -1;
      for (var j = 0; j < NB; j++) {
        var x = XL + j * BW + 5, w = BW - 10, on = j === cur, past = p >= j + 1;
        g.save();
        g.globalAlpha *= a;
        g.fillStyle = on ? C.blue : (past ? K.rgba(dark ? '#8EA6F2' : '#2343B0', 0.12) : C.card);
        g.strokeStyle = on || past ? C.blue : C.line;
        if (view === 'tasiyici') { g.strokeStyle = C.line; g.fillStyle = C.card; }
        g.lineWidth = on ? 1.6 : 1.2;
        K.rr(g, x + 0.5, Y_BOX + 0.5, w, H_BOX, 7); g.fill(); g.stroke();
        g.restore();
        txt(g, String(BITS[j]), x + w / 2, Y_BOX + 28, {
          size: 24, weight: 600, mono: true, align: 'center', alpha: a,
          color: on ? C.onFill : (view === 'tasiyici' ? C.muted : C.ink)
        });
      }
    }
    function recBoxes(g, p, a) {
      for (var j = 0; j < NB; j++) {
        var x = XL + j * BW + 5, w = BW - 10;
        var shown = view !== 'tasiyici' && (p - DELAY) > j + 0.55;
        g.save();
        g.globalAlpha *= a;
        if (shown) {
          g.fillStyle = C.cop; g.strokeStyle = C.cop; g.lineWidth = 1.2;
          K.rr(g, x + 0.5, Y_REC + 0.5, w, H_REC, 7); g.fill(); g.stroke();
        } else {
          g.strokeStyle = C.line; g.lineWidth = 1.2; g.setLineDash([4, 4]);
          K.rr(g, x + 0.5, Y_REC + 0.5, w, H_REC, 7); g.stroke();
        }
        g.restore();
        if (shown) txt(g, String(recovered(view, j)), x + w / 2, Y_REC + 27, { size: 24, weight: 600, mono: true, align: 'center', alpha: a, color: C.onFill });
        else txt(g, view === 'tasiyici' ? '–' : '?', x + w / 2, Y_REC + 26, { size: 20, mono: true, align: 'center', alpha: a, color: C.muted });
      }
    }

    function frame(t, dt) {
      var g = sf.ctx, W = sf.w;
      lastT = t;
      var local;
      if (auto && !K.reducedMotion) {
        var idx = Math.floor(t / DEMO);
        view = VIEWS[idx % VIEWS.length];
        local = t - idx * DEMO;
      } else if (K.reducedMotion) {
        local = 7.5;
      } else {
        local = ((t - viewT0) % DEMO + DEMO) % DEMO;
      }
      var fade = clamp(local / 0.3, 0, 1) * clamp((DEMO - local) / 0.3, 0, 1);
      if (K.reducedMotion) fade = 1;
      var tt = K.reducedMotion ? 2 : t;
      var p = (local - T0) / BIT_T;                 // playhead in bits, may exceed NB
      if (p < 0) p = 0;
      var px = Math.min(NB, p), rxp = clamp(p - DELAY, 0, NB);
      var kTx = Math.round(px * BW), kRx = Math.round(rxp * BW);
      var curBit = p < NB && view !== 'tasiyici' ? Math.floor(p) : -1;

      sf.clear();
      drawTabs(g);
      tag(g, 'yavaşlatılmış', W - 24, 27);

      /* left column: antenna icons and row names */
      antenna(g, 62, CY_TX - 2, true, tt, 1);
      txt(g, 'verici', 62, CY_TX + 50, { size: 14, weight: 600, color: C.ink2, align: 'center' });
      antenna(g, 62, CY_RX + 18, false, tt, 1);
      txt(g, 'alıcı', 62, CY_RX + 70, { size: 14, weight: 600, color: C.ink2, align: 'center' });
      txt(g, 'gönderilen', 24, Y_BOX + 17, { size: 13, color: C.muted });
      txt(g, 'bitler', 24, Y_BOX + 34, { size: 13, color: C.muted });
      txt(g, 'okunan', 24, Y_REC + 15, { size: 13, color: C.copText });
      txt(g, 'bitler', 24, Y_REC + 32, { size: 13, color: C.copText });

      /* column guides and current-bit tint */
      g.save();
      g.globalAlpha = fade;
      if (curBit >= 0) {
        g.fillStyle = K.rgba(dark ? '#8EA6F2' : '#2343B0', 0.07);
        g.fillRect(XL + curBit * BW, CY_TX - 52, BW, M_BOT - (CY_TX - 52));
      }
      g.strokeStyle = C.line; g.lineWidth = 1; g.setLineDash([2, 4]);
      for (i = 0; i <= NB; i++) {
        g.beginPath(); g.moveTo(XL + i * BW + 0.5, CY_TX - 52); g.lineTo(XL + i * BW + 0.5, M_BOT); g.stroke();
      }
      g.setLineDash([]);
      // baselines
      g.beginPath(); g.moveTo(XL, CY_TX + 0.5); g.lineTo(XR, CY_TX + 0.5);
      g.moveTo(XL, CY_RX + 0.5); g.lineTo(XR, CY_RX + 0.5); g.stroke();
      g.restore();

      sentBoxes(g, view === 'tasiyici' ? -1 : px, fade);

      /* transmitted wave */
      g.save();
      g.globalAlpha = fade;
      g.beginPath(); g.rect(XL, CY_TX - 52, NX + 2, 104); g.clip();
      g.strokeStyle = C.blue; g.lineWidth = 2.4; g.lineJoin = 'round';
      wavePath(g, CY_TX, A_TX, view, 0, kTx, tt, false, 1);
      g.restore();

      /* received wave (delayed; noisy in the gurultu view) */
      g.save();
      g.globalAlpha = fade;
      g.beginPath(); g.rect(XL, CY_RX - 28, NX + 2, 56); g.clip();
      g.strokeStyle = C.blue; g.lineWidth = 2; g.lineJoin = 'round';
      wavePath(g, CY_RX, A_RX, view, 0, kRx, tt, view === 'gurultu', 1);
      g.restore();

      /* measurement plot */
      g.save();
      g.globalAlpha = fade;
      g.strokeStyle = C.muted; g.lineWidth = 1;
      g.beginPath(); g.moveTo(XL, M_BOT + 0.5); g.lineTo(XR, M_BOT + 0.5); g.stroke();
      var mname = view === 'frekans' ? 'ölçülen sıklık' : 'ölçülen güç';
      txt(g, mname, XL - 12, M_BOT, { size: 13, color: C.ink2, align: 'right' });
      if (view !== 'tasiyici') {
        var ty = M_BOT - thrFor(view) * (M_BOT - M_TOP);
        g.strokeStyle = C.copText; g.lineWidth = 2; g.setLineDash([7, 5]);
        g.beginPath(); g.moveTo(XL, ty); g.lineTo(XR, ty); g.stroke();
        g.setLineDash([]);
        txt(g, 'eşik', XL - 12, ty + 5, { size: 15, weight: 600, color: C.copText, align: 'right' });
      }
      g.beginPath(); g.rect(XL, M_TOP - 6, NX + 2, M_BOT - M_TOP + 10); g.clip();
      g.strokeStyle = view === 'gurultu' ? C.ink2 : C.ink; g.lineWidth = 2.2; g.lineJoin = 'round';
      g.beginPath();
      for (var k = 0; k <= kRx; k += 2) {
        var yy = M_BOT - clamp(measured(view, k), 0, 1) * (M_BOT - M_TOP);
        if (k === 0) g.moveTo(XL + k, yy); else g.lineTo(XL + k, yy);
      }
      g.stroke();
      g.restore();
      if (view === 'tasiyici') {
        txt(g, 'değişim yok: okunacak bit yok', XL + NX / 2, M_TOP + 30, { size: 14, color: C.muted, align: 'center', alpha: fade });
      }
      if (view === 'gurultu' && rxp > 2) {
        txt(g, 'yolda karışan gürültü', XL + 1.5 * BW, CY_RX - 28, { size: 13, color: C.grey, align: 'center', alpha: fade, weight: 500 });
      }

      recBoxes(g, view === 'tasiyici' ? 0 : p, fade);

      /* playhead */
      if (px < NB && px > 0) {
        g.save(); g.globalAlpha = fade * 0.9;
        g.strokeStyle = C.ink2; g.lineWidth = 1.5;
        var hx = XL + px * BW;
        g.beginPath(); g.moveTo(hx, CY_TX - 50); g.lineTo(hx, CY_TX + 50); g.stroke();
        g.restore();
      }

      /* caption */
      txt(g, CAPTION[view], XL + NX / 2, Y_CAP, { size: 16, weight: 600, color: C.ink, align: 'center', alpha: fade });
    }

    return {
      reset: function () { resetState(); },
      frame: frame,
      set: function (key, val) {
        if (key === 'view' && VIEWS.indexOf(val) >= 0) {
          view = val; auto = false; viewT0 = lastT;
        }
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
