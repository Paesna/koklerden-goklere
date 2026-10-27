/* Köklerden Göklere · Builder N: modülasyon (odak slaytı)
 * modulation-lab · 1120×440 tasarım alanı, kutuya sığacak şekilde ölçeklenir · 2B
 * Bit dizisi bir taşıyıcı dalgaya nasıl yazılır, alıcı nasıl geri okur.
 * Görünümler: tasiyici, genlik (AM), frekans (FM), gurultu. Otomatik gösteri sırayla gezer;
 * set('view', ...) o görünümü sakin bir döngüde oynatır.
 * Sözleşme: kg-viz.js. Tüm hareket frame(t) içinden sürülür, rastgelelik KGViz.rng ile.
 */
(function () {
  'use strict';
  var K = window.KGViz;
  if (!K) return;
  var P = K.palette;
  var clamp = K.clamp;

  var VIEWS = ['tasiyici', 'genlik', 'frekans', 'gurultu'];
  var DEMO = 10;
  var BITS = [1, 0, 1, 1, 0, 1, 0, 0];
  var NB = BITS.length;
  var BIT_T = 0.8;        // bit başına saniye
  var T0 = 0.6;           // ilerleme çizgisinin başlangıcı
  var DELAY = 0.5;        // alıcı gecikmesi (bit)
  var DW = 1120, DH = 440;

  var EXPLAIN = {
    tasiyici: 'Anten düzgün bir taşıyıcı dalga yayar; dalga hep aynıdır ve tek başına hiçbir bit taşımaz.',
    genlik: 'AM: güçlü dalga 1, zayıf dalga 0. Alıcı gücü bir eşikle karşılaştırıp bitleri geri okur.',
    frekans: 'FM: sık salınım 1, seyrek salınım 0. Güç sabit kalır; alıcı sıklığı ölçer.',
    gurultu: 'Yolda küçük bozulmalar karışır ama eşiği aşmaz; alıcı aynı bitleri okur.'
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
      copText: dark ? P.copperLight : (P.copperText || '#A64B22'),
      grey: dark ? '#9AA3B2' : '#666C78',
      card: dark ? '#161B26' : '#FFFFFF',
      onFill: dark ? P.night : '#FFFFFF'
    };

    /* ---------- geometri (tasarım px, 1120×440) ---------- */
    var BW = 120, XL = 80, NX = NB * BW, XR = XL + NX;
    var Y_BOX = 38, H_BOX = 46;
    var CY = 214, AMP = 84;
    var Y_REC = 348, H_REC = 46;
    var THR = 0.62;
    var FLO = 1.5, FHI = 4;

    /* ---------- önceden hesaplanan sinyaller, px başına bir örnek ---------- */
    var rng = K.rng(2026);
    var ampAM = [], phAM = [], phFM = [], frq = [], nz = [], nzSlow = [];
    var i;
    function smooth(u) { return u * u * (3 - 2 * u); }
    function levelAt(x, lo, hi) {
      var pos = x / BW, bi = Math.min(NB - 1, Math.floor(pos)), f = pos - bi, cur = BITS[bi] ? hi : lo, prev, nxt, TW = 0.16;
      if (f < TW / 2 && bi > 0) { prev = BITS[bi - 1] ? hi : lo; return prev + (cur - prev) * smooth(0.5 + f / TW); }
      if (f > 1 - TW / 2 && bi < NB - 1) { nxt = BITS[bi + 1] ? hi : lo; return cur + (nxt - cur) * smooth((f - (1 - TW / 2)) / TW * 0.5); }
      return cur;
    }
    var cyc = 0, n1 = 0, n2 = 0;
    for (i = 0; i <= NX; i++) {
      ampAM.push(levelAt(i, 0.28, 1));
      phAM.push(6.2832 * 3 * i / BW);
      frq.push(levelAt(i, FLO, FHI));
      cyc += frq[i] / BW;
      phFM.push(6.2832 * cyc);
      n1 = n1 * 0.6 + (rng() - 0.5) * 2;
      n2 = n2 * 0.97 + (rng() - 0.5) * 0.2;
      nz.push(n1);
      nzSlow.push(n2);
    }
    var nzMax = 0.0001, nsMax = 0.0001;
    for (i = 0; i <= NX; i++) { nzMax = Math.max(nzMax, Math.abs(nz[i])); nsMax = Math.max(nsMax, Math.abs(nzSlow[i])); }

    /* ---------- durum ---------- */
    var view = 'tasiyici', auto = true, viewT0 = 0, lastT = 0;
    function resetState() { view = 'tasiyici'; auto = true; viewT0 = 0; lastT = 0; }
    resetState();

    function txY(v, k) {
      if (v === 'tasiyici') return 0.9;
      if (v === 'frekans') return 0.85;
      return ampAM[k];
    }
    function phaseOf(v, k) { return v === 'frekans' ? phFM[k] : phAM[k]; }
    function measured(v, k) {
      if (v === 'tasiyici') return 0.9;
      if (v === 'frekans') return frq[k] / FHI;
      var m = ampAM[k];
      if (v === 'gurultu') m += 0.12 * nzSlow[k] / nsMax + 0.04 * nz[k] / nzMax;
      return m;
    }
    function thrFor(v) { return v === 'frekans' ? 0.7 : THR; }
    function recovered(v, bi) {
      var k = Math.round((bi + 0.5) * BW);
      return measured(v, k) > thrFor(v) ? 1 : 0;
    }

    function txt(g, s, x, y, o) { K.label(g, s, x, y, o); }
    function tag(g, s, xr, y) {
      g.save();
      g.font = K.font(14, 500, true);
      var w = g.measureText(s).width + 18;
      g.strokeStyle = C.muted; g.lineWidth = 1;
      K.rr(g, xr - w + 0.5, y - 16.5, w, 26, 5); g.stroke();
      g.restore();
      txt(g, s, xr - w + 9, y + 2, { size: 14, mono: true, weight: 500, color: C.muted });
    }

    function wavePath(g, v, k1, tt, noisy) {
      var k, y;
      g.beginPath();
      for (k = 0; k <= k1; k++) {
        y = txY(v, k) * Math.sin(phaseOf(v, k) - tt * 5);
        if (noisy) y += 0.22 * nz[k] / nzMax;
        y = CY - clamp(y, -1.3, 1.3) * AMP;
        if (k === 0) g.moveTo(XL + k, y); else g.lineTo(XL + k, y);
      }
      g.stroke();
    }

    function sentBoxes(g, p, a) {
      var cur = p >= 0 && p < NB ? Math.floor(p) : -1;
      for (var j = 0; j < NB; j++) {
        var x = XL + j * BW + 6, w = BW - 12, on = j === cur, past = p >= j + 1;
        g.save();
        g.globalAlpha *= a;
        g.fillStyle = on ? C.blue : (past ? K.rgba(dark ? '#8EA6F2' : '#2343B0', 0.12) : C.card);
        g.strokeStyle = on || past ? C.blue : C.line;
        if (view === 'tasiyici') { g.strokeStyle = C.line; g.fillStyle = C.card; }
        g.lineWidth = on ? 2 : 1.4;
        K.rr(g, x + 0.5, Y_BOX + 0.5, w, H_BOX, 8); g.fill(); g.stroke();
        g.restore();
        txt(g, String(BITS[j]), x + w / 2, Y_BOX + 33, {
          size: 30, weight: 600, mono: true, align: 'center', alpha: a,
          color: on ? C.onFill : (view === 'tasiyici' ? C.muted : C.ink)
        });
      }
    }
    function recBoxes(g, p, a) {
      for (var j = 0; j < NB; j++) {
        var x = XL + j * BW + 6, w = BW - 12;
        var shown = view !== 'tasiyici' && (p - DELAY) > j + 0.55;
        g.save();
        g.globalAlpha *= a;
        if (shown) {
          g.fillStyle = C.cop; g.strokeStyle = C.cop; g.lineWidth = 1.4;
          K.rr(g, x + 0.5, Y_REC + 0.5, w, H_REC, 8); g.fill(); g.stroke();
        } else {
          g.strokeStyle = C.line; g.lineWidth = 1.4; g.setLineDash([5, 5]);
          K.rr(g, x + 0.5, Y_REC + 0.5, w, H_REC, 8); g.stroke();
        }
        g.restore();
        if (shown) txt(g, String(recovered(view, j)), x + w / 2, Y_REC + 33, { size: 30, weight: 600, mono: true, align: 'center', alpha: a, color: C.onFill });
        else txt(g, view === 'tasiyici' ? '–' : '?', x + w / 2, Y_REC + 32, { size: 24, mono: true, align: 'center', alpha: a, color: C.muted });
      }
    }

    function frame(t, dt) {
      var g = sf.ctx, W = sf.w, H = sf.h;
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
      var fade = clamp(local / 0.35, 0, 1) * clamp((DEMO - local) / 0.35, 0, 1);
      if (K.reducedMotion) fade = 1;
      var tt = K.reducedMotion ? 2 : t;
      var p = (local - T0) / BIT_T;
      if (p < 0) p = 0;
      var px = Math.min(NB, p), rxp = clamp(p - DELAY, 0, NB);
      var kTx = Math.round(px * BW);
      var curBit = p < NB && view !== 'tasiyici' ? Math.floor(p) : -1;

      sf.clear();
      var s = Math.min(W / DW, H / DH);
      g.save();
      g.translate((W - DW * s) / 2, (H - DH * s) / 2);
      g.scale(s, s);

      tag(g, 'yavaşlatılmış', DW - 24, 24);

      /* satır adları */
      txt(g, 'gönderilen bitler', XL, 28, { size: 17, weight: 700, color: C.ink2 });
      txt(g, 'okunan bitler', XL, Y_REC - 12, { size: 17, weight: 700, color: C.copText });

      /* sütun kılavuzları ve geçerli bit rengi */
      g.save();
      g.globalAlpha = fade;
      if (curBit >= 0) {
        g.fillStyle = K.rgba(dark ? '#8EA6F2' : '#2343B0', 0.07);
        g.fillRect(XL + curBit * BW, Y_BOX + H_BOX + 8, BW, Y_REC - Y_BOX - H_BOX - 22);
      }
      g.strokeStyle = C.line; g.lineWidth = 1; g.setLineDash([2, 5]);
      for (i = 0; i <= NB; i++) {
        g.beginPath(); g.moveTo(XL + i * BW + 0.5, Y_BOX + H_BOX + 8); g.lineTo(XL + i * BW + 0.5, Y_REC - 14); g.stroke();
      }
      g.setLineDash([]);
      g.beginPath(); g.moveTo(XL, CY + 0.5); g.lineTo(XR, CY + 0.5); g.stroke();
      g.restore();

      sentBoxes(g, view === 'tasiyici' ? -1 : px, fade);

      /* eşik çizgileri (yalnızca genlik okuyan görünümlerde) */
      if (view === 'genlik' || view === 'gurultu') {
        g.save();
        g.globalAlpha = fade * 0.9;
        g.strokeStyle = C.copText; g.lineWidth = 2; g.setLineDash([8, 6]);
        var ty1 = CY - THR * AMP, ty2 = CY + THR * AMP;
        g.beginPath(); g.moveTo(XL, ty1); g.lineTo(XR, ty1); g.moveTo(XL, ty2); g.lineTo(XR, ty2); g.stroke();
        g.restore();
        txt(g, 'eşik', XR + 10, ty1 + 6, { size: 18, weight: 700, color: C.copText, alpha: fade });
      }

      /* dalga */
      g.save();
      g.globalAlpha = fade;
      g.beginPath(); g.rect(XL, CY - AMP * 1.4, NX + 2, AMP * 2.8); g.clip();
      g.strokeStyle = C.blue; g.lineWidth = 3.2; g.lineJoin = 'round';
      wavePath(g, view, view === 'tasiyici' ? Math.min(NX, Math.round(clamp((local - 0.4) / 3.2, 0, 1) * NX)) : kTx, tt, view === 'gurultu');
      g.restore();

      if (view === 'gurultu' && px > 1.6) {
        txt(g, 'yolda karışan gürültü', XL + 1.5 * BW, CY - AMP - 22, { size: 17, weight: 700, color: C.grey, align: 'center', alpha: fade });
      }
      if (view === 'tasiyici') {
        txt(g, 'değişmeyen taşıyıcı dalga', XL + NX / 2, CY - AMP - 24, { size: 18, weight: 700, color: C.ink2, align: 'center', alpha: fade });
      }

      recBoxes(g, view === 'tasiyici' ? 0 : p, fade);

      /* ilerleme çizgisi */
      if (px < NB && px > 0) {
        g.save(); g.globalAlpha = fade * 0.9;
        g.strokeStyle = C.ink2; g.lineWidth = 2;
        var hx = XL + px * BW;
        g.beginPath(); g.moveTo(hx, CY - AMP - 8); g.lineTo(hx, CY + AMP + 8); g.stroke();
        g.restore();
      }

      g.restore();
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
