/* Köklerden Göklere · Builder AE: kapılar nasıl hatırlar?
 * latch-lab · odak slayt, 1120×440 sanal sahne (görünüme göre ölçeklenir) · 2B blok şeması (açık / koyu tema)
 * Görünümler: kapi (tek VEYA-DEĞİL kapısı), geri (geri beslemeli SR mandalı), bayt (8 mandal),
 *             dram (1 transistör + 1 kondansatör), flash (yüzen kapılı hücre).
 * set('view', ...), set('s', 0|1), set('r', 0|1), set('byte', '01000001'), set('bit', i), set('power', 0|1), set('auto', 1).
 * dram / flash görünümünde S yükselince 1 yazar, R yükselince 0 yazar (flash'ta 0 = elektron hapsedilmiş).
 * read: view, explain, q, state, s, r, byte, char.
 * Sözleşme: kg-viz.js. Hareket frame(t, dt) ile sürülür; rastgelelik K.rng ile.
 */
(function () {
  'use strict';
  var K = window.KGViz;
  if (!K) return;
  var P = K.palette;
  var clamp = K.clamp;

  var VIEWS = ['kapi', 'geri', 'bayt', 'dram', 'flash'];
  var TITLES = {
    kapi: 'TEK KAPI · VEYA-DEĞİL',
    geri: 'GERİ BESLEME · SR MANDALI',
    bayt: 'BAYT · SEKİZ MANDAL',
    dram: 'RAM HÜCRESİ · DRAM',
    flash: 'FLASH HÜCRESİ · SSD'
  };
  var DUR = { kapi: 9, geri: 9, bayt: 9, dram: 11, flash: 12 };   // her görünüm için saniye
  var VW = 1120, VH = 440;
  var TH = 0.45;       // okuma sınırı (yük oranı)
  var TAU = 4.2;       // sızıntı zaman sabiti (s), ders için yavaşlatılmış
  var REF = 2.4;       // yenileme aralığı (s): 64 ms yaklaşık 2,4 s olarak gösterilir
  var WIN = 9.6;       // grafik penceresi (s)

  function ap(cur, tgt, rate, d) { return cur + (tgt - cur) * (1 - Math.exp(-rate * d)); }

  K.register('latch-lab', function (el, opts) {
    opts = opts || {};
    var dark = (opts.theme || 'light') === 'dark';
    var sf = K.surface(el);
    var C = {
      ink: dark ? P.onNight : P.ink,
      ink2: dark ? '#C9CFDA' : P.ink2,
      muted: dark ? P.onNightMuted : P.muted,
      line: dark ? P.nightLine : P.line,
      blue: dark ? P.blueLight : P.blue,
      blueSoft: dark ? 'rgba(142,166,242,.18)' : P.blueSoft,
      cop: dark ? P.copperLight : P.copperFill,
      copText: dark ? P.copperLight : '#A64B22',
      copSoft: dark ? 'rgba(227,154,108,.2)' : P.copperSoft,
      copPale: dark ? '#3A2D28' : '#EFD9C8',
      card: dark ? '#161B26' : '#FFFFFF',
      edge: dark ? '#4A5160' : '#B8BCC6',
      chan: dark ? '#222836' : '#E6E6E0',
      fill: dark ? '#1B2130' : '#ECEBE4',
      grey: dark ? '#9AA3B2' : '#666C78',
      bg: dark ? P.night : P.paper,
      lamp: '#F2C46B',
      fil: '#D98A2B'
    };

    /* ---------- durum ---------- */
    var view, auto, curIdx, vT, hits;
    var s, r, q, qn, unk, wasForb, lv;
    var bits, pulse;
    var c, pw, refT, wl, wv, simT, hist, marks, leakPh, wlv, refFlash;
    var e, op, opT, hv, rdT, rdv, flPh;
    var evs, rnd;
    var lt = { sc: 1, ox: 0, oy: 0 };   // yerel çizim dönüşümü (sanal koordinata)
    var gt = { sc: 1, ox: 0, oy: 0 };   // sanal sahnenin ekrana dönüşümü
    function local(g, sc, ox, oy) { lt.sc = sc; lt.ox = ox; lt.oy = oy; g.save(); g.translate(ox, oy); g.scale(sc, sc); }
    function fit(g, x0, y0, x1, y1, maxK) {
      var w = x1 - x0, h = y1 - y0, k = Math.min(VW * 0.94 / w, VH * 0.88 / h, maxK || 9);
      local(g, k, (VW - w * k) / 2 - x0 * k, (VH - h * k) / 2 - y0 * k + 6);
    }
    function unlocal(g) { g.restore(); lt.sc = 1; lt.ox = 0; lt.oy = 0; }
    var cmpActive = { kapi: 0, geri: 0, bayt: 0, dram: 1, flash: 2 };

    function bitsFromString(str) {
      var a = [];
      for (var i = 0; i < 8; i++) a.push(str.charAt(i) === '1' ? 1 : 0);
      return a;
    }
    function dramInit(isAuto) {
      c = isAuto ? 0 : 1; pw = true; refT = 0; wl = 0; wv = null; simT = 0;
      hist = []; marks = []; leakPh = 0; wlv = 0; refFlash = 0;
    }
    function flashInit() {
      e = 0; op = null; opT = 0; hv = 0; pw = true; rdT = 1.0; rdv = 0; flPh = 0;
    }
    function enterView(v, isAuto) {
      view = v;
      vT = 0;
      evs = [];
      if (isAuto) { s = 0; r = 0; }
      if (v === 'geri' && isAuto) { q = 0; qn = 1; unk = false; wasForb = false; }
      if (v === 'bayt') {
        bits = bitsFromString('01000001'); pulse = [0, 0, 0, 0, 0, 0, 0, 0];
        if (isAuto) evs = [
          { t: 3.0, f: function () { flipBit(6, 1); } },
          { t: 4.0, f: function () { flipBit(7, 0); } }
        ];
      }
      if (v === 'dram') {
        dramInit(isAuto);
        if (isAuto) evs = [
          { t: 0.4, f: function () { dWrite(1); } },
          { t: 5.2, f: function () { setPower(false); } }
        ];
      }
      if (v === 'flash') {
        flashInit();
        if (isAuto) evs = [
          { t: 0.8, f: function () { fWrite(0); } },
          { t: 5.2, f: function () { setPower(false); } },
          { t: 7.2, f: function () { setPower(true); rdT = 1.6; } }
        ];
      }
    }
    function resetState() {
      s = 0; r = 0; q = 0; qn = 1; unk = false; wasForb = false;
      lv = { s: 0, r: 0, q: 0, qn: 1, g: 1 };
      bits = bitsFromString('01000001'); pulse = [0, 0, 0, 0, 0, 0, 0, 0];
      rnd = K.rng(11);
      auto = true; curIdx = 0; hits = []; demoT = 0;
      dramInit(true); flashInit();
      enterView('kapi', true);
      if (K.reducedMotion) { enterView('geri', true); q = 1; qn = 0; lv.q = 1; lv.qn = 0; }
    }
    resetState();

    function flipBit(i, v) {
      if (bits[i] === v) return;
      bits[i] = v; pulse[i] = v ? 0.9 : -0.9;
    }
    function dWrite(b) { if (!pw) return; wv = b; wl = 0.7; }
    function fWrite(b) { if (!pw) return; op = b ? 'erase' : 'prog'; opT = 1.6; }
    function setPower(on) {
      pw = !!on;
      if (view === 'dram') { if (!pw) { wl = 0; wv = null; } else refT = 0; }
      if (view === 'flash' && !pw) { op = null; }
    }

    /* ---------- mantık ---------- */
    function latchStep() {
      if (s && r) { q = 0; qn = 0; wasForb = true; return; }
      if (s) { q = 1; qn = 0; wasForb = false; unk = false; return; }
      if (r) { q = 0; qn = 1; wasForb = false; unk = false; return; }
      if (wasForb) { q = rnd() > 0.5 ? 1 : 0; qn = 1 - q; unk = true; wasForb = false; return; }
      qn = 1 - q;
    }
    function norOut() { return (s || r) ? 0 : 1; }
    function byteVal() { var v = 0; for (var i = 0; i < 8; i++) v = v * 2 + bits[i]; return v; }
    function byteStr() { return bits.join(''); }
    function charInfo(v) {
      if (v >= 33 && v <= 126) return { ch: String.fromCharCode(v), note: 'ASCII tablosunda bu sayının harfi' };
      if (v === 32) return { ch: '␣', note: 'ASCII: boşluk karakteri' };
      if (v < 32 || v === 127) return { ch: '·', note: 'görünmeyen kontrol karakteri' };
      return { ch: '·', note: 'ASCII tablosunun dışında' };
    }
    function sumText(v) {
      var parts = [];
      for (var i = 0; i < 8; i++) if (bits[i]) parts.push(String(Math.pow(2, 7 - i)));
      return parts.length ? parts.join(' + ') + ' = ' + v : '0';
    }
    function dramBit() { return c >= TH ? 1 : 0; }
    function flashBit() { return e < 0.5 ? 1 : 0; }

    var EXPLAIN = {
      kapi: function () {
        if (!s && !r) return 'Girişler 0, 0: çıkış 1. Girişi 1 yapıp geri alsanız da çıkış aynı: kapı hatırlamaz.';
        return 'Bir giriş 1 iken çıkış 0. Girişler 0’a dönünce çıkış hep aynı değere döner: kapının hafızası yok.';
      },
      geri: function () {
        if (s && r) return 'S = 1 ve R = 1: iki kapı da 0 verir. Birlikte bırakılırsa sonuç belli değil: yasak durum.';
        if (s) return 'S = 1: Q = 1 olur. Q alt kapıya döner ve onu 0’da tutar; S’yi bıraksanız da Q = 1 kalır.';
        if (r) return 'R = 1: Q = 0 olur. Q değil 1 olur ve üst kapıyı 0’da tutar; R’yi bıraksanız da Q = 0 kalır.';
        if (unk) return 'Yasak durumdan çıkıldı: Q belirsiz. S veya R ile yeniden yazmak gerekir.';
        return 'S = 0, R = 0: Q = ' + q + ' yerinde duruyor. Kapılar birbirini aynı durumda tutuyor: bit hatırlandı.';
      },
      bayt: function () {
        var v = byteVal(), ci = charInfo(v);
        return 'Her mandal bir bit tutar; sekizi bir bayt eder. Şu an ' + byteStr() + ' = ' + v + ': ' + (v >= 33 && v <= 126 ? 'ASCII’de ' + ci.ch + ' harfi.' : ci.note + '.');
      },
      dram: function () {
        if (!pw) return dramBit() ? 'Güç kesildi: yük sızıyor, yenileme yok; yük okuma sınırının altına inince bit unutulur.' : 'Güç yok ve yük bitti: bit unutuldu. Güç gelse de eski değer geri gelmez.';
        return 'Yük sızar; bu yüzden her 64 ms’de bir okunup geri yazılır (yaklaşık 16 yenileme / s).';
      },
      flash: function () {
        if (op === 'prog') return 'Yüksek gerilim elektronları ince oksitten yüzen kapıya iter; orada hapsolurlar.';
        if (op === 'erase') return 'Ters gerilim, hapsolmuş elektronları yüzen kapıdan boşaltır.';
        if (!pw) return flashBit() ? 'Güç yok. Yüzen kapıda elektron yok, hücre 1 olarak kalıyor.' : 'Güç yok ama elektronlar yüzen kapıda hapis: hücre 0’ı koruyor.';
        if (flashBit()) return 'Yüzen kapıda elektron yok: kanal akım geçiriyor (1). Yazmak için elektronları kapıya hapsederiz.';
        return 'Yüzen kapıda elektron var: kanal akım geçirmiyor (0). Güç gitse de hücre hatırlar.';
      }
    };

    function stateText() {
      if (view === 'kapi') return 'S = ' + s + ', R = ' + r + ' · çıkış ' + norOut();
      if (view === 'geri') {
        if (s && r) return 'S = 1, R = 1 · yasak durum';
        return 'S = ' + s + ', R = ' + r + ' · Q = ' + q + (!s && !r ? (unk ? ' belirsiz' : ' korunuyor') : ' yazıldı');
      }
      if (view === 'bayt') return byteStr() + ' = ' + byteVal();
      if (view === 'dram') return 'yük %' + Math.round(c * 100) + ' · bit ' + dramBit() + ' · güç ' + (pw ? 'var' : 'yok');
      return 'bit ' + flashBit() + ' · elektron ' + (flashBit() ? 'yok' : 'var') + ' · güç ' + (pw ? 'var' : 'yok');
    }
    function qNow() {
      if (view === 'kapi') return norOut();
      if (view === 'geri') return q;
      if (view === 'bayt') return bits[7];
      if (view === 'dram') return dramBit();
      return flashBit();
    }

    /* ---------- çizim yardımcıları ---------- */
    function txt(g, str, x, y, o) { K.label(g, str, x, y, o); }
    function wrap(g, text, x, y, w, size, pitch, color, weight, mono) {
      var words = text.split(' '), line = '', yy = y;
      for (var i = 0; i < words.length; i++) {
        var t2 = line ? line + ' ' + words[i] : words[i];
        g.save(); g.font = K.font(size, weight || 400, mono);
        var tooWide = g.measureText(t2).width > w;
        g.restore();
        if (tooWide && line) {
          txt(g, line, x, yy, { size: size, color: color, weight: weight, mono: mono });
          line = words[i]; yy += pitch;
        } else line = t2;
      }
      txt(g, line, x, yy, { size: size, color: color, weight: weight, mono: mono });
      return yy;
    }
    function tag(g, str, xr, y) {
      g.save();
      g.font = K.font(13, 500, true);
      var w = g.measureText(str).width + 16;
      g.strokeStyle = C.muted; g.lineWidth = 1;
      K.rr(g, xr - w + 0.5, y - 15.5, w, 24, 5); g.stroke();
      g.restore();
      txt(g, str, xr - w + 8, y + 1, { size: 13, mono: true, weight: 500, color: C.muted });
    }
    function charge(g, x, y, rad, neg, a) {
      g.save();
      g.globalAlpha *= a;
      g.fillStyle = neg ? C.blue : C.cop;
      g.beginPath(); g.arc(x, y, rad, 0, 6.2832); g.fill();
      g.strokeStyle = '#FFFFFF'; g.lineWidth = Math.max(1.4, rad * 0.28); g.lineCap = 'round';
      g.beginPath(); g.moveTo(x - rad * 0.5, y); g.lineTo(x + rad * 0.5, y);
      if (!neg) { g.moveTo(x, y - rad * 0.5); g.lineTo(x, y + rad * 0.5); }
      g.stroke();
      g.restore();
    }
    function wire(g, pts, level, feedback) {
      g.save();
      g.lineJoin = 'round'; g.lineCap = 'butt';
      g.beginPath(); g.moveTo(pts[0][0], pts[0][1]);
      for (var i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]);
      g.strokeStyle = feedback ? C.cop : C.edge; g.lineWidth = 8; g.stroke();
      g.strokeStyle = feedback ? K.mix(dark ? '#3A2D28' : '#F3DCCB', dark ? '#E39A6C' : '#C8693A', level) : K.mix(dark ? '#222836' : '#E6E6E0', dark ? '#8EA6F2' : '#2343B0', level);
      g.lineWidth = 5.4; g.stroke();
      g.restore();
    }
    function node(g, x, y, col) {
      g.save(); g.fillStyle = col || C.ink2;
      g.beginPath(); g.arc(x, y, 5, 0, 6.2832); g.fill(); g.restore();
    }
    function gate(g, x, y, w, h) {
      g.save();
      g.beginPath();
      g.moveTo(x, y);
      g.bezierCurveTo(x + w * 0.45, y, x + w * 0.8, y + h * 0.2, x + w, y + h / 2);
      g.bezierCurveTo(x + w * 0.8, y + h * 0.8, x + w * 0.45, y + h, x, y + h);
      g.quadraticCurveTo(x + w * 0.3, y + h / 2, x, y);
      g.closePath();
      g.fillStyle = C.card; g.fill();
      g.strokeStyle = C.ink2; g.lineWidth = 2.2; g.lineJoin = 'round'; g.stroke();
      g.beginPath(); g.arc(x + w + 6, y + h / 2, 6, 0, 6.2832);
      g.fillStyle = C.card; g.fill(); g.stroke();
      g.restore();
      txt(g, 'NOR', x + w * 0.46, y + h / 2 + 5, { size: 15, mono: true, weight: 600, color: C.ink2, align: 'center' });
    }
    function lamp(g, x, y, rad, b) {
      g.save();
      if (b > 0.02) {
        g.strokeStyle = C.lamp; g.lineWidth = 2.4; g.lineCap = 'round';
        g.globalAlpha = clamp(b * 1.2, 0, 1);
        for (var i = 0; i < 8; i++) {
          var a = (i + 0.5) * Math.PI / 4;
          g.beginPath();
          g.moveTo(x + Math.cos(a) * (rad + 6), y + Math.sin(a) * (rad + 6));
          g.lineTo(x + Math.cos(a) * (rad + 6 + 8 * b), y + Math.sin(a) * (rad + 6 + 8 * b));
          g.stroke();
        }
        g.globalAlpha = 1;
      }
      g.fillStyle = C.card;
      g.beginPath(); g.arc(x, y, rad, 0, 6.2832); g.fill();
      g.globalAlpha = clamp(b, 0, 1);
      g.fillStyle = C.lamp;
      g.beginPath(); g.arc(x, y, rad, 0, 6.2832); g.fill();
      g.fillStyle = 'rgba(255,255,255,.35)';
      g.beginPath(); g.arc(x, y, rad * 0.55, 0, 6.2832); g.fill();
      g.globalAlpha = 1;
      g.strokeStyle = C.ink2; g.lineWidth = 2;
      g.beginPath(); g.arc(x, y, rad, 0, 6.2832); g.stroke();
      g.restore();
    }
    function pill(g, cx, cy, level, label) {
      var w = 60, h = 30, x = cx - w / 2, y = cy - h / 2;
      g.save();
      g.fillStyle = K.mix(dark ? '#222836' : '#E6E6E0', dark ? '#8EA6F2' : '#2343B0', level);
      K.rr(g, x, y, w, h, 15); g.fill();
      g.strokeStyle = C.edge; g.lineWidth = 1.4; K.rr(g, x + 0.5, y + 0.5, w - 1, h - 1, 15); g.stroke();
      var kx = x + 15 + (w - 30) * level;
      g.fillStyle = level > 0.5 ? '#FFFFFF' : C.card;
      g.strokeStyle = C.ink2; g.lineWidth = 1.6;
      g.beginPath(); g.arc(kx, cy, 11, 0, 6.2832); g.fill(); g.stroke();
      g.restore();
      txt(g, level > 0.5 ? '1' : '0', level > 0.5 ? x + 15 : x + w - 15, cy + 5, { size: 14, mono: true, weight: 600, color: level > 0.5 ? '#FFFFFF' : C.muted, align: 'center', alpha: 1 });
      txt(g, label, cx - 42, cy + 7, { size: 20, mono: true, weight: 600, color: C.ink, align: 'right' });
    }
    function powerPill(g, x, y) {
      var w = 128, h = 28;
      g.save();
      g.fillStyle = pw ? C.card : C.copSoft;
      K.rr(g, x + 0.5, y + 0.5, w, h, 14); g.fill();
      g.strokeStyle = pw ? C.edge : C.cop; g.lineWidth = 1.6; g.stroke();
      g.fillStyle = pw ? C.blue : C.cop;
      g.beginPath(); g.arc(x + 15, y + h / 2 + 0.5, 6, 0, 6.2832); g.fill();
      g.restore();
      txt(g, pw ? 'güç: açık' : 'güç: kapalı', x + 29, y + 19, { size: 14, weight: 600, color: pw ? C.ink2 : C.copText });
      hits.push({ x: x * lt.sc + lt.ox, y: y * lt.sc + lt.oy, w: w * lt.sc, h: h * lt.sc, f: function () { auto = false; setPower(!pw); } });
    }

    /* ---------- görünümler ---------- */
    function drawKapi(g) {
      fit(g, 34, 90, 608, 224, 1.7);
      wire(g, [[122, 112], [230, 112], [230, 135], [302, 135]], lv.s, false);
      wire(g, [[122, 188], [230, 188], [230, 165], [302, 165]], lv.r, false);
      wire(g, [[412, 150], [536, 150]], lv.g, false);
      gate(g, 290, 115, 110, 70);
      lamp(g, 560, 150, 24, lv.g);
      pill(g, 92, 112, lv.s, 'S');
      pill(g, 92, 188, lv.r, 'R');
      txt(g, 'çıkış', 560, 204, { size: 15, weight: 600, color: C.ink2, align: 'center' });
      txt(g, 'VEYA-DEĞİL (NOR) kapısı', 345, 214, { size: 14, weight: 600, color: C.ink2, align: 'center' });
      unlocal(g);
    }

    function drawGeri(g) {
      fit(g, 30, 42, 730, 268, 1.6);
      var qw = [[520, 87], [520, 150], [290, 150], [290, 212], [334, 212]];
      var qnw = [[480, 227], [480, 165], [310, 165], [310, 102], [334, 102]];
      wire(g, [[122, 72], [334, 72]], lv.r, false);
      wire(g, [[122, 242], [334, 242]], lv.s, false);
      wire(g, [[452, 87], [618, 87]], lv.q, false);
      wire(g, [[452, 227], [624, 227]], lv.qn, false);
      wire(g, qw, lv.q, true);
      wire(g, qnw, lv.qn, true);
      node(g, 520, 87, C.cop); node(g, 480, 227, C.cop);
      gate(g, 330, 52, 110, 70);
      gate(g, 330, 192, 110, 70);
      lamp(g, 640, 87, 22, lv.q);
      lamp(g, 640, 227, 16, lv.qn);
      pill(g, 92, 72, lv.r, 'R');
      pill(g, 92, 242, lv.s, 'S');
      txt(g, 'Q', 676, 94, { size: 22, mono: true, weight: 700, color: C.ink });
      txt(g, 'Q değil', 666, 232, { size: 15, weight: 600, color: C.ink2 });
      txt(g, 'geri besleme', 405, 143, { size: 15, weight: 700, color: C.copText, align: 'center' });
      unlocal(g);
    }

    function drawBayt(g) {
      var x0 = 36, bw = 96, gap = 10, by = 96, bh = 150;
      for (var i = 0; i < 8; i++) {
        var x = x0 + i * (bw + gap), cx = x + bw / 2, on = bits[i] === 1;
        g.save();
        g.shadowColor = 'rgba(21,23,28,.14)'; g.shadowBlur = 10; g.shadowOffsetY = 3;
        g.fillStyle = C.card; K.rr(g, x + 0.5, by + 0.5, bw, bh, 10); g.fill();
        g.shadowColor = 'transparent';
        g.strokeStyle = on ? C.blue : C.edge; g.lineWidth = on ? 2.6 : 1.8; g.stroke();
        g.restore();
        g.save();
        g.fillStyle = on ? C.blue : C.card;
        g.beginPath(); g.arc(cx, by + 66, 30, 0, 6.2832); g.fill();
        g.strokeStyle = C.blue; g.lineWidth = 2.2; g.stroke();
        g.restore();
        txt(g, on ? '1' : '0', cx, by + 77, { size: 32, mono: true, weight: 700, color: on ? '#FFFFFF' : C.blue, align: 'center' });
        g.save();
        g.strokeStyle = C.cop; g.lineWidth = 2.4; g.lineCap = 'round';
        g.beginPath(); g.arc(cx, by + 120, 9, 0.4, 5.3); g.stroke();
        g.fillStyle = C.cop;
        g.beginPath(); g.moveTo(cx + 9, by + 114); g.lineTo(cx + 16, by + 121); g.lineTo(cx + 3.5, by + 125); g.closePath(); g.fill();
        g.restore();
        if (Math.abs(pulse[i]) > 0.02) {
          txt(g, pulse[i] > 0 ? 'S' : 'R', cx, by - 14, { size: 22, mono: true, weight: 700, color: C.copText, align: 'center', alpha: clamp(Math.abs(pulse[i]) * 1.6, 0, 1) });
        }
        (function (idx, hx, hy, hw, hh) {
          hits.push({ x: hx, y: hy, w: hw, h: hh, f: function () { auto = false; flipBit(idx, bits[idx] ? 0 : 1); } });
        })(i, x, by, bw, bh);
      }
      var xe = x0 + 8 * bw + 7 * gap;
      g.save();
      g.strokeStyle = C.copText; g.lineWidth = 2.6;
      g.beginPath(); g.moveTo(x0 + 0.5, by + bh + 14); g.lineTo(x0 + 0.5, by + bh + 24); g.lineTo(xe - 0.5, by + bh + 24); g.lineTo(xe - 0.5, by + bh + 14); g.stroke();
      g.restore();
      txt(g, '8 mandal = 1 bayt', (x0 + xe) / 2, by + bh + 62, { size: 26, weight: 700, color: C.ink, align: 'center' });

      var v = byteVal(), ci = charInfo(v);
      var X = 898, Y = 80, W = 190, H = 230;
      g.save();
      g.shadowColor = 'rgba(21,23,28,.14)'; g.shadowBlur = 10; g.shadowOffsetY = 3;
      g.fillStyle = C.card; K.rr(g, X + 0.5, Y + 0.5, W, H, 10); g.fill();
      g.shadowColor = 'transparent';
      g.strokeStyle = C.line; g.lineWidth = 1; g.stroke();
      g.restore();
      txt(g, byteStr(), X + W / 2, Y + 34, { size: 22, mono: true, weight: 700, color: C.blue, align: 'center' });
      txt(g, ci.ch, X + W / 2, Y + 150, { size: 110, mono: true, weight: 700, color: C.ink, align: 'center' });
      txt(g, v + '', X + W / 2, Y + 200, { size: 24, mono: true, weight: 600, color: C.copText, align: 'center' });
    }

    function drawDram(g) {
      local(g, 1.2, 14, 22);
      powerPill(g, 24, 28);
      // kelime hattı
      var wlCol = wlv > 0.5 ? C.cop : C.edge;
      g.save();
      g.lineJoin = 'round'; g.strokeStyle = wlCol; g.lineWidth = 6;
      g.beginPath(); g.moveTo(40, 100); g.lineTo(240, 100); g.lineTo(240, 124); g.stroke();
      g.restore();
      txt(g, 'kelime hattı (aç / kapa)', 40, 90, { size: 14, color: C.muted });
      // bit hattı
      wire(g, [[40, 150], [200, 150]], wv === 1 && wl > 0 ? 1 : 0, false);
      txt(g, 'bit hattı (veri)', 40, 176, { size: 14, color: C.muted });
      // transistör
      g.save();
      g.fillStyle = C.card; K.rr(g, 200.5, 124.5, 80, 54, 8); g.fill();
      g.strokeStyle = C.ink2; g.lineWidth = 2; g.stroke();
      g.restore();
      var tx = 270 - 4 * (1 - wlv), ty = 150 - 18 * (1 - wlv);
      g.save();
      g.fillStyle = C.bg; g.strokeStyle = C.ink2; g.lineWidth = 2;
      g.beginPath(); g.arc(210, 150, 4.5, 0, 6.2832); g.fill(); g.stroke();
      g.beginPath(); g.arc(270, 150, 4.5, 0, 6.2832); g.fill(); g.stroke();
      g.strokeStyle = wlv > 0.5 ? C.cop : C.ink; g.lineWidth = 4; g.lineCap = 'round';
      g.beginPath(); g.moveTo(210, 150); g.lineTo(tx, ty); g.stroke();
      g.restore();
      wire(g, [[280, 150], [370, 150], [370, 188]], c > TH ? c : 0, false);
      // kondansatör
      g.save();
      g.fillStyle = C.fill; g.fillRect(335, 193, 70, 33);
      g.fillStyle = C.ink2;
      K.rr(g, 335, 188, 70, 5, 2); g.fill();
      K.rr(g, 335, 226, 70, 5, 2); g.fill();
      g.restore();
      wire(g, [[370, 231], [370, 256]], 0, false);
      g.save();
      g.strokeStyle = C.ink2; g.lineWidth = 2.4;
      g.beginPath(); g.moveTo(354, 258); g.lineTo(386, 258); g.moveTo(359, 264); g.lineTo(381, 264); g.moveTo(364, 270); g.lineTo(376, 270); g.stroke();
      g.restore();
      var n = Math.round(c * 5);
      for (var i = 0; i < n; i++) {
        var cxx = 370 + (i - 2) * 12;
        charge(g, cxx, 202, 5.5, false, 1);
        charge(g, cxx, 217, 5.5, true, 1);
      }
      txt(g, 'kondansatör', 326, 214, { size: 14, weight: 500, color: C.ink2, align: 'right' });
      // sızıntı
      g.save();
      g.strokeStyle = C.cop; g.lineWidth = 1.6; g.setLineDash([4, 4]);
      g.beginPath(); g.moveTo(405, 190); g.lineTo(432, 190); g.lineTo(432, 229); g.lineTo(405, 229); g.stroke();
      g.setLineDash([]);
      if (c > 0.04) {
        g.fillStyle = C.blue;
        for (var k = 0; k < 3; k++) {
          var p = ((leakPh + k / 3) % 1);
          var yy = 229 - 39 * p;   // elektronlar eksiden artıya doğru
          g.globalAlpha = clamp(c * 1.4, 0, 1) * Math.sin(p * Math.PI);
          g.beginPath(); g.arc(432, yy, 3.6, 0, 6.2832); g.fill();
        }
      }
      g.restore();
      txt(g, 'sızıntı', 444, 214, { size: 14, weight: 500, color: C.copText });

      unlocal(g);
      // grafik
      local(g, 0.92, 600, 112);
      var X = 0, Y = 0, W = 496, H = 206;
      var px0 = 40, px1 = 480, py0 = 56, py1 = 178;
      g.save();
      g.fillStyle = C.card; K.rr(g, X + 0.5, Y + 0.5, W, H, 8); g.fill();
      g.strokeStyle = C.line; g.lineWidth = 1; g.stroke();
      g.restore();
      txt(g, 'kondansatörün yükü', px0, 36, { size: 17, weight: 700, color: C.ink });
      function gy(v) { return py1 - (py1 - py0) * v; }
      g.save();
      g.strokeStyle = C.edge; g.lineWidth = 1.2;
      g.beginPath(); g.moveTo(px0 + 0.5, py0 - 4); g.lineTo(px0 + 0.5, py1 + 0.5); g.lineTo(px1, py1 + 0.5); g.stroke();
      g.strokeStyle = C.grey; g.setLineDash([5, 4]);
      g.beginPath(); g.moveTo(px0, gy(TH) + 0.5); g.lineTo(px1, gy(TH) + 0.5); g.stroke();
      g.setLineDash([]);
      g.restore();
      txt(g, 'okuma sınırı', px0 + 8, gy(TH) - 7, { size: 16, weight: 600, color: C.muted });
      for (var m = 0; m < marks.length; m++) {
        var mx = px1 - (simT - marks[m]) / WIN * (px1 - px0);
        if (mx < px0 + 2) continue;
        g.save();
        g.strokeStyle = C.cop; g.lineWidth = 1.6; g.setLineDash([3, 3]);
        g.beginPath(); g.moveTo(mx + 0.5, py0 - 2); g.lineTo(mx + 0.5, py1); g.stroke();
        g.restore();
        txt(g, 'yenileme', mx, py1 + 24, { size: 16, weight: 600, color: C.copText, align: 'center' });
      }
      if (hist.length > 1) {
        g.save();
        g.strokeStyle = C.blue; g.lineWidth = 2.6; g.lineJoin = 'round';
        g.beginPath();
        var started = false;
        for (var h = 0; h < hist.length; h++) {
          var hx = px1 - (simT - hist[h][0]) / WIN * (px1 - px0);
          if (hx < px0) continue;
          if (!started) { g.moveTo(hx, gy(hist[h][1])); started = true; } else g.lineTo(hx, gy(hist[h][1]));
        }
        g.stroke();
        g.fillStyle = C.cop;
        g.beginPath(); g.arc(px1, gy(c), 5, 0, 6.2832); g.fill();
        g.restore();
      }
      if (!pw) txt(g, 'güç kesildi: yenileme yok', px1 - 8, 36, { size: 17, weight: 700, color: C.copText, align: 'right' });
      txt(g, 'yavaşlatılmış: 64 ms ≈ 2,4 s', px1, Y + H + 22, { size: 14, mono: true, color: C.muted, align: 'right' });
      unlocal(g);
      // : 'güç gidince yük boşalır: unutur', px0, 296, { size: 15, weight: 600, color: pw ? C.ink2 : C.copText });
    }

    function drawFlash(g) {
      fit(g, 20, 34, 520, 304, 1.55);
      powerPill(g, 24, 40);
      var reading = pw && !op && rdv > 0.5;
      // denetim kapısı
      g.save();
      g.fillStyle = C.card; K.rr(g, 160.5, 68.5, 230, 28, 4); g.fill();
      g.strokeStyle = C.ink2; g.lineWidth = 2; g.stroke();
      g.restore();
      txt(g, 'denetim kapısı', 275, 87, { size: 15, weight: 600, color: C.ink2, align: 'center' });
      wire(g, [[275, 68], [275, 50]], hv > 0.5 ? 1 : (rdv > 0.5 ? 0.5 : 0), false);
      var vlab = !pw ? 'gerilim yok' : (op ? 'yüksek gerilim' : (rdv > 0.5 ? 'orta gerilim (okuma)' : '0 V'));
      txt(g, 'kapı gerilimi: ' + vlab, 288, 60, { size: 14, weight: 600, color: op ? C.copText : C.ink2 });
      // oksit ve yüzen kapı
      g.save();
      g.fillStyle = C.fill; g.fillRect(160, 96, 230, 64);
      g.strokeStyle = C.muted; g.lineWidth = 1; g.setLineDash([4, 4]);
      g.strokeRect(160.5, 96.5, 229, 63); g.setLineDash([]);
      g.fillStyle = dark ? '#2B3242' : '#DAD9D1';
      K.rr(g, 176.5, 112.5, 198, 32, 3); g.fill();
      g.strokeStyle = C.ink2; g.lineWidth = 2; g.stroke();
      g.restore();
      txt(g, 'yüzen kapı', 400, 133, { size: 16, weight: 700, color: C.ink });
      // silisyum
      g.save();
      g.fillStyle = C.fill; g.fillRect(60, 160, 440, 90);
      g.fillStyle = C.blueSoft; g.fillRect(70, 160, 90, 40); g.fillRect(390, 160, 90, 40);
      g.strokeStyle = C.edge; g.lineWidth = 1.2;
      g.strokeRect(60.5, 160.5, 439, 89);
      g.restore();
      txt(g, 'kaynak', 115, 186, { size: 15, weight: 600, color: C.blue, align: 'center' });
      txt(g, 'savak', 435, 186, { size: 15, weight: 600, color: C.blue, align: 'center' });
      // elektronlar
      var n = Math.round(e * 8);
      for (var i = 0; i < n; i++) charge(g, 192 + i * 22, 128, 5.5, true, 1);
      // tünelleme
      if (op) {
        g.save();
        g.fillStyle = C.blue;
        for (var k = 0; k < 6; k++) {
          var p = (flPh * 0.9 + k / 6) % 1;
          var yy = op === 'prog' ? 172 - 30 * p : 142 + 30 * p;
          g.globalAlpha = Math.sin(p * Math.PI);
          g.beginPath(); g.arc(205 + k * 32, yy, 3.8, 0, 6.2832); g.fill();
        }
        g.restore();
      }
      // kanaldaki akım
      var cond = reading && flashBit() === 1;
      if (cond) {
        g.save();
        g.fillStyle = C.blue;
        for (var j = 0; j < 12; j++) {
          var u = (flPh * 0.7 + j / 12) % 1;
          g.beginPath(); g.arc(90 + u * 370, 172, 3.8, 0, 6.2832); g.fill();
        }
        g.restore();
      }
      txt(g, pw ? (reading ? (cond ? 'kanal: akım geçiyor (1)' : 'kanal: akım geçirmiyor (0)') : 'bit: ' + flashBit() + (flashBit() ? ' (elektron yok)' : ' (elektron var)')) : 'güç yok · bit: ' + flashBit() + (flashBit() ? ' (elektron yok)' : ' (elektron var)'), 24, 296, { size: 15, mono: true, weight: 600, color: C.ink });

      unlocal(g);
    }

    /* ---------- kare ---------- */
    var demoT = 0;
    function autoStep() {
      var tot = 0, i, idx = 0, lt0;
      for (i = 0; i < VIEWS.length; i++) tot += DUR[VIEWS[i]];
      lt0 = demoT % tot;
      for (i = 0; i < VIEWS.length; i++) { if (lt0 < DUR[VIEWS[i]]) { idx = i; break; } lt0 -= DUR[VIEWS[i]]; }
      if (idx !== curIdx) { curIdx = idx; enterView(VIEWS[idx], true); }
      if (view === 'kapi' || view === 'geri') {
        s = (lt0 >= 1.5 && lt0 < 3.5) ? 1 : 0;
        r = (lt0 >= 5.5 && lt0 < 7.5) ? 1 : 0;
      }
      for (var k = 0; k < evs.length; k++) if (!evs[k].done && lt0 >= evs[k].t) { evs[k].done = true; evs[k].f(); }
    }

    function frame(t, dt) {
      var g = sf.ctx;
      var d = clamp(dt, 0, 0.05);
      if (auto && !K.reducedMotion) { demoT += d; autoStep(); }
      hits.length = 0;

      if (view === 'geri') latchStep();
      lv.s = ap(lv.s, s, 14, d); lv.r = ap(lv.r, r, 14, d);
      lv.q = ap(lv.q, q, 14, d); lv.qn = ap(lv.qn, qn, 14, d);
      lv.g = ap(lv.g, norOut(), 14, d);

      for (var i = 0; i < 8; i++) {
        if (pulse[i] > 0) pulse[i] = Math.max(0, pulse[i] - d);
        else if (pulse[i] < 0) pulse[i] = Math.min(0, pulse[i] + d);
      }

      if (view === 'dram' && !K.reducedMotion) {
        simT += d;
        c *= Math.exp(-d / TAU);
        if (wl > 0) {
          wl = Math.max(0, wl - d);
          if (wv !== null) c += (wv - c) * (1 - Math.exp(-d / 0.12));
          if (wl === 0) wv = null;
        }
        if (refFlash > 0) refFlash = Math.max(0, refFlash - d);
        if (pw) {
          refT += d;
          if (refT >= REF) { refT = 0; marks.push(simT); wl = 0.6; wv = c >= TH ? 1 : 0; refFlash = 0.7; }
        }
        while (marks.length && simT - marks[0] > WIN + 1) marks.shift();
        if (!hist.length || simT - hist[hist.length - 1][0] >= 0.05) hist.push([simT, c]);
        while (hist.length && simT - hist[0][0] > WIN + 0.5) hist.shift();
        wlv = ap(wlv, wl > 0 ? 1 : 0, 14, d);
        leakPh = (leakPh + d * 0.9) % 1;
      }
      if (view === 'flash' && !K.reducedMotion) {
        flPh = (flPh + d) % 1000;
        if (op) {
          var tg = op === 'prog' ? 1 : 0;
          e += (tg > e ? 1 : -1) * d / 1.6;
          e = clamp(e, 0, 1);
          opT -= d;
          if (opT <= 0) { e = tg; op = null; }
        }
        hv = ap(hv, op ? 1 : 0, 10, d);
        if (pw) rdT += d;
        var ph = rdT % 3;
        rdv = ap(rdv, (pw && !op && ph >= 1.8) ? 1 : 0, 10, d);
      }

      sf.clear();
      gt.sc = Math.min(sf.w / VW, sf.h / VH); gt.ox = (sf.w - VW * gt.sc) / 2; gt.oy = (sf.h - VH * gt.sc) / 2;
      g.save(); g.translate(gt.ox, gt.oy); g.scale(gt.sc, gt.sc);
      txt(g, TITLES[view], 6, 20, { size: 15, mono: true, weight: 600, color: C.copText, spacing: 1.2 });
      if (view === 'kapi') drawKapi(g);
      else if (view === 'geri') drawGeri(g);
      else if (view === 'bayt') drawBayt(g);
      else if (view === 'dram') drawDram(g);
      else drawFlash(g);
      g.restore();
    }

    /* ---------- tıklama ---------- */
    function onDown(ev) {
      try {
        var rc = sf.canvas.getBoundingClientRect();
        if (!rc.width) return;
        var x = ((ev.clientX - rc.left) * sf.w / rc.width - gt.ox) / gt.sc, y = ((ev.clientY - rc.top) * sf.h / rc.height - gt.oy) / gt.sc;
        for (var i = 0; i < hits.length; i++) {
          var h = hits[i];
          if (x >= h.x && x <= h.x + h.w && y >= h.y && y <= h.y + h.h) { h.f(); return; }
        }
      } catch (err) { /* yoksay */ }
    }
    el.addEventListener('pointerdown', onDown);

    return {
      reset: function () { resetState(); },
      frame: frame,
      set: function (key, val) {
        var v;
        if (key === 'view') {
          if (VIEWS.indexOf(val) < 0) return;
          auto = false;
          if (val !== view) enterView(val, false);
          return;
        }
        if (key === 's' || key === 'r') {
          auto = false;
          v = (+val) ? 1 : 0;
          if (key === 's') { var ps = s; s = v; if (!ps && v) { if (view === 'dram') dWrite(1); else if (view === 'flash') fWrite(1); } }
          else { var pr = r; r = v; if (!pr && v) { if (view === 'dram') dWrite(0); else if (view === 'flash') fWrite(0); } }
          return;
        }
        if (key === 'byte') {
          var str = String(val);
          if (!/^[01]{1,8}$/.test(str)) return;
          while (str.length < 8) str = '0' + str;
          auto = false;
          bits = bitsFromString(str);
          return;
        }
        if (key === 'bit') {
          var i = Math.round(+val);
          if (i >= 0 && i < 8) { auto = false; flipBit(i, bits[i] ? 0 : 1); }
          return;
        }
        if (key === 'power') { auto = false; setPower(+val ? true : false); return; }
        if (key === 'auto') {
          if (+val) { resetState(); }
          else auto = false;
        }
      },
      read: function (key) {
        if (key === 'view') return view;
        if (key === 'explain') return EXPLAIN[view]();
        if (key === 'q') return String(qNow());
        if (key === 'state') return stateText();
        if (key === 's') return String(s);
        if (key === 'r') return String(r);
        if (key === 'byte') return byteStr();
        if (key === 'char') return charInfo(byteVal()).ch;
        return '';
      },
      resize: function () { sf.resize(); },
      dispose: function () { el.removeEventListener('pointerdown', onDown); sf.dispose(); }
    };
  });
})();
