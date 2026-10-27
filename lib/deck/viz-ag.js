/* Köklerden Göklere · Bir dokunuşun yolculuğu
 * touch-journey · odak slayt, 1120×440 sanal sahne · açık/koyu tema (2B)
 * Üstte dokuz istasyonlu bir şerit ve atım; altta seçili istasyonun büyük kartı. Sonda mesaj izi (altı durak).
 * Dokunuştan yanan piksele dokuz istasyon; altta "mesaj gönderince" izi.
 * set('stop', 1..9) bir istasyonu seçer, set('auto', 1) atımı baştan sona gezdirir.
 * Sözleşme: kg-viz.js. Basitleştirilmiş model, yavaşlatılmış; değerler örnektir.
 */
(function () {
  'use strict';
  var K = window.KGViz;
  if (!K) return;
  var P = K.palette;
  var clamp = K.clamp;

  var STAGE = 3;            // her istasyon (sn)
  var HOP = 0.8;            // atımın bir istasyondan ötekine yolu (sn)
  var TSTEP = 1.5;          // mesaj izinde her durak (sn)
  var NS = 9, NT = 6;
  var AUTO_END = NS * STAGE;                 // 27
  var CYCLE = AUTO_END + NT * TSTEP + 1.5;   // 37,5

  var ST = [
    { name: 'Parmak', cap: 'Parmak camın yüzüne yaklaşınca altındaki iletken çizgilerle bir kondansatör gibi davranır.', tag: 'Dokunmatik ekran', ql: ['≈ 1 pF', 'ek sığa'], q: '≈ 1 pF ek sığa', dig: false,
      ex: 'Parmağın içindeki su iyonludur; vücut bu yüzden elektriği iletir. Parmak camın yüzüne yaklaşınca altındaki iletken çizgilerle bir kondansatör gibi davranır.' },
    { name: 'Kapasitif ızgara', cap: 'Parmak ızgaranın kesişimindeki elektrik alanını değiştirir; ölçülen fark yalnızca yaklaşık 0,05 V.', tag: 'Dokunmatik ekran', ql: ['≈ 0,05 V fark'], q: '≈ 0,05 V fark', dig: false,
      ex: 'Camın altında dik kesişen ince iletken çizgiler vardır; parmak kesişimin elektrik alanını değiştirir. Bu değişim ancak yaklaşık 0,05 V gibi çok küçük bir gerilim farkı olarak ölçülür.' },
    { name: 'Gürültü süzme', cap: 'Denetleyici ölçümü 16 kez alıp ortalar; rastgele gürültü yaklaşık 4 kat azalır.', tag: 'Gürültü nedir?', ql: ['16 örnek:', 'gürültü ÷ 4'], q: '16 örnek: gürültü ÷ 4', dig: false,
      ex: 'Küçük fark, gürültü yanında kaybolabilir; denetleyici ölçümü 16 kez alıp ortalar, süzgeçten geçirir ve yükseltir. Rastgele sapmalar birbirini götürür, gürültü yaklaşık 4 kat azalır.' },
    { name: 'ADC', cap: 'ADC gerilimi sayıya çevirir: 12 bitle 0-4.095 arası; 1,65 V ÷ 3,3 V × 4.095 ≈ 2.048.', tag: 'Analogdan sayıya', ql: ['2.048', '12 bit'], q: '2.048', dig: true,
      ex: 'ADC gerilimi sayıya çevirir; 12 bitle 0 ile 4.095 arasında sayı üretir. Örnekte 3,3 V tam ölçek ve 1,65 V gerilim var: 1,65 ÷ 3,3 × 4.095 ≈ 2.048.' },
    { name: 'Veri yolu', cap: 'Sayı bitler halinde I2C ya da SPI hattıyla işlemciye gider; alıcı her tıkta 1 ya da 0’ı okur.', tag: 'Sensör karta nasıl konuşur?', ql: ['0000 1000', '0000 0000'], q: '0000 1000 0000 0000', dig: true,
      ex: 'Sayı iki baytlık bitler halinde I2C ya da SPI ile işlemciye gider. I2C’de iki tel vardır: SDA veriyi, SCL saat tıklarını taşır; alıcı her tıkta teldeki 1 ya da 0’ı okur.' },
    { name: 'İşlemci', cap: 'İşlemci sayıyı alıp dokunuşun koordinatını hesaplar; toplayıcılar kapılardan, kapılar transistörlerden.', tag: 'İşlemcinin içinde ne olur?', ql: ['x = 540', 'y = 1.120'], q: 'x = 540, y = 1.120', dig: true,
      ex: 'İşlemci getir, çöz, yürüt, yaz adımlarıyla sayıyı alır ve dokunuşun koordinatını hesaplar. Hesabı toplayıcılar yapar; toplayıcılar mantık kapılarından, kapılar transistörlerden oluşur.' },
    { name: 'Bellek', cap: 'Sonuç RAM’de yük olarak durur: yük varsa 1, yoksa 0; elektrik gidince RAM boşalır.', tag: 'Kapılar nasıl hatırlar?', ql: ['1 = yük var', '0 = yük yok'], q: '1 = yük var, 0 = yük yok', dig: true,
      ex: 'Sonuç RAM’de bellek hücrelerinin yükü olarak durur: yük varsa 1, yoksa 0 okunur. RAM elektrik gidince boşalır; programın kendisi flash bellekte kalıcı olarak saklıdır.' },
    { name: 'Ekran', cap: 'Piksel kırmızı, yeşil ve mavi alt pikselden oluşur; parlaklık PWM ile ayarlanır, göz ortalamayı görür.', tag: 'Piksel nedir?', ql: ['RGB 200-80-40', 'PWM %60'], q: 'RGB 200-80-40 · PWM %60', dig: true,
      ex: 'Her piksel kırmızı, yeşil ve mavi alt pikselden oluşur ve sayıya göre yanar. Parlaklık PWM ile ayarlanır: ışık saniyede binlerce kez açılıp kapanır, göz ortalamasını görür.' },
    { name: 'Güç', cap: 'Pil gerilimi regülatörle 3,3 V olur; tüm parçalar aynı GND’yi sıfır noktası alır.', tag: 'GND nedir?', ql: ['3,7 V pil', '→ 3,3 V'], q: '3,7 V pil → 3,3 V', dig: false,
      ex: 'Pil gerilimi regülatörden geçip 3,3 V olur ve tüm parçalara dağıtılır. Hepsi aynı GND’yi sıfır noktası alır; GND bozulursa her ölçüm birlikte kayar.' }
  ];
  var MSG = {
    name: 'Mesaj gönderince',
    cap: 'Mesaj sayıdan radyo dalgasına çevrilir; baz istasyonu ve fiberle karşı telefona gider, yeniden sayı olur.',
    q: '0100 0001 → dalga',
    ex: 'Mesajı gönderince sayılar modülasyonla radyo dalgasına yazılır; dalga baz istasyonuna gider, oradan fiber kabloya geçer. Gerekirse uydu ya da yer hattıyla karşı telefona ulaşır ve yeniden sayıya çevrilir.'
  };
  var TRK = [
    { l: ['sayı'], k: 'num' },
    { l: ['radyo dalgası', '(modülasyon)'], k: 'wave' },
    { l: ['baz', 'istasyonu'], k: 'tower' },
    { l: ['fiber kablo'], k: 'fiber' },
    { l: ['uydu /', 'yer hattı'], k: 'sat' },
    { l: ['karşı telefon'], k: 'phone' }
  ];

  function ease(x) { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); }

  K.register('touch-journey', function (el, opts) {
    opts = opts || {};
    var dark = (opts.theme || 'light') === 'dark';
    var sf = K.surface(el);
    var C = {
      ink: dark ? P.onNight : P.ink,
      ink2: dark ? '#C9CFDA' : P.ink2,
      muted: dark ? P.onNightMuted : P.muted,
      line: dark ? P.nightLine : P.line,
      line2: dark ? '#3A4254' : P.line2,
      blue: dark ? P.blueLight : P.blue,
      cop: dark ? P.copperLight : P.copperFill,
      copText: dark ? P.copperLight : '#A64B22',
      card: dark ? '#161B26' : '#FFFFFF',
      bg: dark ? P.night : P.paper,
      noise: dark ? '#9AA3B2' : '#8A909C'
    };

    var VW = 1120, VH = 440;
    var cx = [];
    for (var i = 0; i < NS; i++) cx.push(100 + i * 115);
    var SY = 70;

    var auto = true, stop = 4, t0 = 0, lastT = 0;
    var px = cx[0], grow = [], i2;
    for (i2 = 0; i2 < NS; i2++) grow.push(0);
    var cur = { sel: 1, phase: 'st', tn: -1 };

    function resetState() {
      auto = true; stop = K.reducedMotion ? 4 : 1; auto = !K.reducedMotion;
      t0 = 0; lastT = 0; px = cx[stop - 1];
      for (var k = 0; k < NS; k++) grow[k] = 0;
    }
    resetState();

    function txt(g, s, x, y, o) { K.label(g, s, x, y, o); }

    function wrap(g, s, maxW, font) {
      g.save(); g.font = font;
      var words = s.split(' '), lines = [], line = '';
      for (var i = 0; i < words.length; i++) {
        var tr = line ? line + ' ' + words[i] : words[i];
        if (line && g.measureText(tr).width > maxW) { lines.push(line); line = words[i]; }
        else line = tr;
      }
      if (line) lines.push(line);
      g.restore();
      return lines;
    }

    /* ---------- state from time ---------- */
    function compute(t, dt) {
      var sel, phase = 'st', tn = -1, target;
      if (auto) {
        var T = (t - t0) % CYCLE;
        if (T < 0) T += CYCLE;
        if (T < AUTO_END) {
          var k = Math.floor(T / STAGE), loc = T - k * STAGE;
          var f = ease(loc / HOP);
          var a = k === 0 ? cx[0] : cx[k - 1];
          px = a + (cx[k] - a) * f;
          sel = loc >= HOP * 0.75 ? k + 1 : Math.max(1, k);
        } else if (T < AUTO_END + NT * TSTEP) {
          phase = 'msg'; sel = 0; px = cx[NS - 1];
          tn = Math.floor((T - AUTO_END) / TSTEP);
        } else { phase = 'msg'; sel = 0; px = cx[NS - 1]; tn = NT; }
        stop = sel;
        cur.T = T;
      } else {
        sel = stop;
        target = cx[stop - 1];
        px += (target - px) * Math.min(1, (dt || 0.016) * 6);
        if (Math.abs(px - target) < 0.3) px = target;
      }
      for (var i = 0; i < NS; i++) {
        var tg = sel === i + 1 ? 1 : 0;
        grow[i] += (tg - grow[i]) * Math.min(1, (dt || 0.016) * 9);
        if (Math.abs(grow[i] - tg) < 0.003) grow[i] = tg;
      }
      cur.sel = sel; cur.phase = phase; cur.tn = tn;
    }

    /* ---------- icons ---------- */
    function ln(g, pts, col, w, close) {
      g.strokeStyle = col; g.lineWidth = w; g.lineJoin = 'round'; g.lineCap = 'round';
      g.beginPath();
      for (var i = 0; i < pts.length; i++) { if (i) g.lineTo(pts[i][0], pts[i][1]); else g.moveTo(pts[i][0], pts[i][1]); }
      if (close) g.closePath();
      g.stroke();
    }
    function icon(g, k, x, y) {
      var i, j;
      g.save();
      g.lineCap = 'round'; g.lineJoin = 'round';
      if (k === 0) {
        g.fillStyle = C.card; g.strokeStyle = C.ink2; g.lineWidth = 2;
        g.beginPath(); g.moveTo(x - 10, y - 22); g.lineTo(x - 10, y + 1); g.arc(x, y + 1, 10, Math.PI, 0, true); g.lineTo(x + 10, y - 22);
        g.fill(); g.stroke();
        g.fillStyle = C.blue;
        [[-4, -12], [4, -5], [-3, 2], [3, -17]].forEach(function (p) { g.beginPath(); g.arc(x + p[0], y + p[1], 2, 0, 7); g.fill(); });
        ln(g, [[x - 20, y + 14], [x + 20, y + 14]], C.noise, 3);
      } else if (k === 1) {
        for (i = -1; i <= 1; i++) {
          ln(g, [[x - 21, y + i * 13], [x + 21, y + i * 13]], C.blue, 1.8);
          ln(g, [[x + i * 13, y - 19], [x + i * 13, y + 19]], C.noise, 1.8);
        }
        g.strokeStyle = C.copText; g.lineWidth = 2.2;
        g.beginPath(); g.arc(x, y, 8, 0, 7); g.stroke();
      } else if (k === 2) {
        var nz = [0, -9, 7, -6, 10, -8, 4, -10, 6];
        var pts = [];
        for (i = 0; i < nz.length; i++) pts.push([x - 22 + i * 2.6, y + nz[i]]);
        ln(g, pts, C.noise, 1.6);
        K.arrow(g, x - 1, y, x + 5, y, { color: C.ink2, width: 1.4, head: 6 });
        pts = [];
        for (i = 0; i <= 14; i++) pts.push([x + 7 + i, y - Math.sin(i / 14 * Math.PI * 2) * 6]);
        ln(g, pts, C.blue, 2.4);
      } else if (k === 3) {
        ln(g, [[x - 21, y + 15], [x + 21, y - 15]], C.line2, 1.6);
        ln(g, [[x - 21, y + 15], [x - 21, y + 8], [x - 10, y + 8], [x - 10, y], [x, y], [x, y - 8], [x + 10, y - 8], [x + 10, y - 16], [x + 21, y - 16]], C.blue, 2.4);
      } else if (k === 4) {
        g.fillStyle = C.card; g.strokeStyle = C.ink2; g.lineWidth = 1.8;
        [x - 22, x + 14].forEach(function (rx) { K.rr(g, rx, y - 14, 8, 28, 2); g.fill(); g.stroke(); });
        ln(g, [[x - 14, y - 6], [x - 8, y - 6], [x - 8, y - 11], [x - 2, y - 11], [x - 2, y - 6], [x + 4, y - 6], [x + 4, y - 11], [x + 10, y - 11], [x + 10, y - 6], [x + 14, y - 6]], C.blue, 2);
        ln(g, [[x - 14, y + 8], [x + 14, y + 8]], C.copText, 2);
      } else if (k === 5) {
        g.fillStyle = C.card; g.strokeStyle = C.ink2; g.lineWidth = 2;
        K.rr(g, x - 13, y - 13, 26, 26, 3); g.fill(); g.stroke();
        g.strokeStyle = C.blue; g.lineWidth = 1.6; g.strokeRect(x - 6, y - 6, 12, 12);
        for (i = -1; i <= 1; i++) {
          ln(g, [[x + i * 8, y - 13], [x + i * 8, y - 19]], C.ink2, 2);
          ln(g, [[x + i * 8, y + 13], [x + i * 8, y + 19]], C.ink2, 2);
          ln(g, [[x - 13, y + i * 8], [x - 19, y + i * 8]], C.ink2, 2);
          ln(g, [[x + 13, y + i * 8], [x + 19, y + i * 8]], C.ink2, 2);
        }
      } else if (k === 6) {
        var pat = [[1, 0, 1], [0, 1, 1], [1, 1, 0]];
        for (i = 0; i < 3; i++) for (j = 0; j < 3; j++) {
          var rx = x - 17 + j * 12, ry = y - 17 + i * 12;
          if (pat[i][j]) { g.fillStyle = C.blue; g.fillRect(rx, ry, 10, 10); }
          else { g.strokeStyle = C.noise; g.lineWidth = 1.4; g.strokeRect(rx + 0.5, ry + 0.5, 9, 9); }
        }
      } else if (k === 7) {
        g.fillStyle = C.card; g.strokeStyle = C.ink2; g.lineWidth = 2;
        K.rr(g, x - 21, y - 15, 42, 26, 3); g.fill(); g.stroke();
        var cols = ['#D2493D', '#3E9A5A', '#3B5BC4'];
        for (i = 0; i < 3; i++) { g.fillStyle = cols[i]; g.fillRect(x - 15 + i * 10, y - 10, 8, 16); }
        ln(g, [[x - 8, y + 18], [x + 8, y + 18]], C.ink2, 2);
        ln(g, [[x, y + 11], [x, y + 18]], C.ink2, 2);
      } else if (k === 8) {
        g.fillStyle = C.card; g.strokeStyle = C.ink2; g.lineWidth = 2;
        K.rr(g, x - 18, y - 20, 30, 18, 2); g.fill(); g.stroke();
        g.fillStyle = C.copText; g.fillRect(x + 12, y - 15, 4, 8);
        txt(g, '+', x - 10, y - 7, { size: 13, mono: true, weight: 700, color: C.copText, align: 'center' });
        txt(g, '−', x + 5, y - 7, { size: 13, mono: true, weight: 700, color: C.ink2, align: 'center' });
        ln(g, [[x - 3, y - 2], [x - 3, y + 6]], C.ink2, 2);
        ln(g, [[x - 14, y + 6], [x + 8, y + 6]], C.ink2, 2.2);
        ln(g, [[x - 10, y + 12], [x + 4, y + 12]], C.ink2, 2.2);
        ln(g, [[x - 6, y + 18], [x, y + 18]], C.ink2, 2.2);
      }
      g.restore();
    }
    function ticon(g, k, x, y, on) {
      var col = on ? C.copText : C.ink2, i;
      g.save();
      g.lineCap = 'round'; g.lineJoin = 'round';
      if (k === 'num') {
        g.fillStyle = C.card; g.strokeStyle = col; g.lineWidth = 1.8;
        K.rr(g, x - 16, y - 11, 32, 22, 3); g.fill(); g.stroke();
        txt(g, '0100', x, y + 5, { size: 13, mono: true, weight: 600, color: C.blue, align: 'center' });
      } else if (k === 'wave') {
        var pts = [];
        for (i = 0; i <= 36; i++) pts.push([x - 18 + i, y - Math.sin(i / 36 * Math.PI * 6) * 8]);
        ln(g, pts, on ? C.copText : C.blue, 2.2);
      } else if (k === 'tower') {
        ln(g, [[x - 8, y + 14], [x, y - 6], [x + 8, y + 14]], col, 2);
        ln(g, [[x - 4, y + 5], [x + 4, y + 5]], col, 1.6);
        g.strokeStyle = on ? C.copText : C.blue; g.lineWidth = 1.8;
        [8, 14].forEach(function (r) {
          g.beginPath(); g.arc(x, y - 8, r, -2.4, -0.74); g.stroke();
          g.beginPath(); g.arc(x, y - 8, r, Math.PI + 0.74, Math.PI + 2.4); g.stroke();
        });
      } else if (k === 'fiber') {
        ln(g, [[x - 20, y - 5], [x + 20, y - 5]], col, 1.8);
        ln(g, [[x - 20, y + 5], [x + 20, y + 5]], col, 1.8);
        g.fillStyle = on ? C.copText : C.blue;
        [-12, 0, 12].forEach(function (dx) { g.beginPath(); g.arc(x + dx, y, 2.6, 0, 7); g.fill(); });
      } else if (k === 'sat') {
        g.fillStyle = C.card; g.strokeStyle = col; g.lineWidth = 1.8;
        K.rr(g, x - 6, y - 7, 12, 14, 2); g.fill(); g.stroke();
        g.strokeRect(x - 21, y - 5, 12, 10); g.strokeRect(x + 9, y - 5, 12, 10);
        ln(g, [[x - 9, y], [x - 6, y]], col, 1.6); ln(g, [[x + 6, y], [x + 9, y]], col, 1.6);
      } else if (k === 'phone') {
        g.fillStyle = C.card; g.strokeStyle = col; g.lineWidth = 1.8;
        K.rr(g, x - 9, y - 15, 18, 30, 3); g.fill(); g.stroke();
        ln(g, [[x - 3, y + 10], [x + 3, y + 10]], col, 1.6);
      }
      g.restore();
    }

    /* ---------- kartlar ---------- */
    function stationCard(g, i, a) {
      var st = ST[i], x = 120, y = 150, w = 880, h = 250;
      g.save();
      g.globalAlpha *= a;
      g.shadowColor = 'rgba(21,23,28,.14)'; g.shadowBlur = 16; g.shadowOffsetY = 5;
      g.fillStyle = C.card; K.rr(g, x + 0.5, y + 0.5, w, h, 14); g.fill();
      g.shadowColor = 'transparent';
      g.strokeStyle = C.copText; g.lineWidth = 2; g.stroke();
      // büyük simge
      g.save(); g.translate(x + 170, y + 125); g.scale(2.9, 2.9); icon(g, i, 0, 0); g.restore();
      g.strokeStyle = C.line; g.lineWidth = 1;
      g.beginPath(); g.moveTo(x + 320.5, y + 30); g.lineTo(x + 320.5, y + h - 30); g.stroke();
      txt(g, (i + 1) + ' · ' + st.name, x + 356, y + 78, { size: 36, weight: 700, color: C.ink });
      txt(g, st.q, x + 356, y + 148, { size: 36, mono: true, weight: 700, color: st.dig ? C.blue : C.copText });
      txt(g, st.dig ? 'sayı (bitler)' : 'analog (gerilim, yük)', x + 356, y + 182, { size: 18, mono: true, weight: 500, color: st.dig ? C.blue : C.copText });
      txt(g, 'bu derslerde: ' + st.tag, x + 356, y + 222, { size: 20, weight: 500, color: C.ink2 });
      g.restore();
    }
    function msgTrack(g) {
      var tn = cur.tn, i, j;
      var tx = [], TY = 270;
      for (i = 0; i < NT; i++) tx.push(150 + i * 164);
      txt(g, MSG.name, 120, 184, { size: 36, weight: 700, color: C.copText });
      for (i = 0; i < NT - 1; i++) {
        var done = tn > i, a = tx[i] + 56, b = tx[i + 1] - 56;
        g.strokeStyle = C.line2; g.lineWidth = 3; g.lineCap = 'round';
        g.beginPath(); g.moveTo(a, TY); g.lineTo(b, TY); g.stroke();
        var fr = done ? 1 : (tn === i ? ease(((lastT - t0) % CYCLE - AUTO_END - i * TSTEP - 0.2) / (TSTEP - 0.5)) : 0);
        if (fr > 0) {
          g.strokeStyle = C.cop; g.lineWidth = 4.5;
          g.beginPath(); g.moveTo(a, TY); g.lineTo(a + (b - a) * fr, TY); g.stroke();
          if (fr < 1) { g.fillStyle = C.copText; g.beginPath(); g.arc(a + (b - a) * fr, TY, 7, 0, 7); g.fill(); }
        }
      }
      for (i = 0; i < NT; i++) {
        var onn = tn === i, lit = tn >= i;
        g.save();
        g.fillStyle = C.card; g.strokeStyle = lit ? C.copText : C.line2; g.lineWidth = onn ? 3.5 : 2;
        g.beginPath(); g.arc(tx[i], TY, 50, 0, 7); g.fill(); g.stroke();
        g.translate(tx[i], TY); g.scale(1.7, 1.7);
        ticon(g, TRK[i].k, 0, 0, lit);
        g.restore();
        if (onn) for (j = 0; j < TRK[i].l.length; j++)
          txt(g, TRK[i].l[j], tx[i], TY + 92 + j * 26, { size: 22, weight: 700, color: C.copText, align: 'center' });
      }
    }

    /* ---------- kare ---------- */
    function frame(t, dt) {
      var g = sf.ctx, i;
      lastT = t;
      compute(t, dt);
      var sel = cur.sel, msg = cur.phase === 'msg';
      sf.clear();
      var gsc = Math.min(sf.w / VW, sf.h / VH);
      g.save(); g.translate((sf.w - VW * gsc) / 2, (sf.h - VH * gsc) / 2); g.scale(gsc, gsc);

      // şerit: istasyonlar ve atım
      g.strokeStyle = C.line2; g.lineWidth = 4; g.lineCap = 'round';
      g.beginPath(); g.moveTo(cx[0], SY); g.lineTo(cx[NS - 1], SY); g.stroke();
      var pe = msg ? cx[NS - 1] : px;
      g.strokeStyle = C.cop; g.lineWidth = 5;
      g.beginPath(); g.moveTo(cx[0], SY); g.lineTo(pe, SY); g.stroke();
      for (i = 0; i < NS; i++) {
        var gw = grow[i], vis = (px >= cx[i] - 1 || msg), k = 1 + 0.35 * gw;
        g.save();
        g.shadowColor = 'rgba(21,23,28,.12)'; g.shadowBlur = 8; g.shadowOffsetY = 2;
        g.fillStyle = C.card; g.strokeStyle = (vis || gw > 0.05) ? C.copText : C.line2; g.lineWidth = 2 + 1.8 * gw;
        g.beginPath(); g.arc(cx[i], SY, 33 * k, 0, 7); g.fill();
        g.shadowColor = 'transparent'; g.stroke();
        g.translate(cx[i], SY); g.scale(0.95 * k, 0.95 * k);
        icon(g, i, 0, 0);
        g.restore();
        txt(g, String(i + 1), cx[i], SY + 62 + 10 * gw, { size: 17, mono: true, weight: 700, color: (gw > 0.5 || vis) ? C.copText : C.muted, align: 'center' });
      }
      if (!msg) {
        var pp = 0.5 + 0.5 * Math.sin(lastT * 6);
        g.fillStyle = C.cop; g.globalAlpha = 0.28;
        g.beginPath(); g.arc(px, SY, 42 + 3 * pp, 0, 7); g.fill(); g.globalAlpha = 1;
        g.fillStyle = C.copText; g.beginPath(); g.arc(px, SY - 44, 7, 0, 7); g.fill();
      }

      if (msg) msgTrack(g);
      else if (sel >= 1 && sel <= NS) stationCard(g, sel - 1, clamp(grow[sel - 1] * 1.2, 0, 1));

      txt(g, 'tüm değerler örnektir · yavaşlatılmış', VW - 6, VH - 8, { size: 14, mono: true, color: C.muted, align: 'right' });
      g.restore();
    }

    function info() {
      var s = cur.sel;
      if (s >= 1 && s <= NS) return ST[s - 1];
      return MSG;
    }

    return {
      reset: function () { resetState(); },
      frame: frame,
      set: function (key, val) {
        var n = parseInt(val, 10);
        if (key === 'stop' && n >= 1 && n <= NS) {
          if (auto) {
            auto = false;
          }
          stop = n;
        } else if (key === 'auto' && n === 1) {
          auto = true; t0 = lastT; px = cx[0];
        }
      },
      read: function (key) {
        if (key === 'stop') return String(cur.phase === 'msg' ? 0 : (auto ? cur.sel : stop));
        if (key === 'auto') return auto ? '1' : '0';
        if (key === 'name') return info().name;
        if (key === 'explain') return info().cap;
        if (key === 'explainLong') return info().ex;
        if (key === 'quantity') return info().q;
        if (key === 'tag') return info().tag || 'Bir 1 ve bir 0 dalgaya nasıl yazılır? · Bir mesajın yolculuğu';
        return '';
      },
      resize: function () { sf.resize(); },
      dispose: function () { sf.dispose(); }
    };
  });
})();
