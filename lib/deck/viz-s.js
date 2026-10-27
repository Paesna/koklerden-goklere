/* Köklerden Göklere · viz-s · USB-C kablosunun içi (3B yakınlaştırma)
 *
 *   usbc-zoom   kablo → kesit → konnektör → kontaklar; GND, VBUS, CC, D+/D−
 *               set('stop', 'kablo'|'kesit'|'konnektor'|'pin')
 *               read('stop' | 'name' | 'explain' | 'scale')
 *
 * Dört katman, her biri kendi ölçüsünde modellenir; kamera ve katman ölçekleri
 * ortak bir yakınlaştırma değişkeni z (0…3) ile sürülür (zoom-to-atom ile aynı fikir).
 * Ölçekli değildir: kılavuz çizim olarak basitleştirilmiştir.
 */
(function () {
  'use strict';
  var K = window.KGViz, THREE = window.THREE;
  if (!K || !THREE) return;
  var TAU = Math.PI * 2, P = K.palette;
  var clamp = K.clamp, lerp = K.lerp, S = K.smoothstep;
  function eio(x) { return K.ease.inOut(clamp(x, 0, 1)); }

  /* ------------------------------------------------------------ shapes */
  function rrPath(path, w, h, r) {
    var x = -w / 2, y = -h / 2;
    r = Math.min(r, w / 2, h / 2);
    path.moveTo(x + r, y);
    path.lineTo(x + w - r, y);
    path.absarc(x + w - r, y + r, r, -Math.PI / 2, 0, false);
    path.lineTo(x + w, y + h - r);
    path.absarc(x + w - r, y + h - r, r, 0, Math.PI / 2, false);
    path.lineTo(x + r, y + h);
    path.absarc(x + r, y + h - r, r, Math.PI / 2, Math.PI, false);
    path.lineTo(x, y + r);
    path.absarc(x + r, y + r, r, Math.PI, Math.PI * 1.5, false);
    return path;
  }
  function rrShape(w, h, r) { return rrPath(new THREE.Shape(), w, h, r); }
  /* rounded box centred on the origin; extruded along z */
  function roundedBox(w, h, d, r, b) {
    b = b || 0.03;
    var g = new THREE.ExtrudeGeometry(rrShape(w - 2 * b, h - 2 * b, Math.max(0.001, r - b)),
      { depth: d - 2 * b, bevelEnabled: true, bevelThickness: b, bevelSize: b, bevelSegments: 3, curveSegments: 10 });
    g.translate(0, 0, -(d - 2 * b) / 2);
    return g;
  }
  function mesh(geo, mat, parent, x, y, z) {
    var m = new THREE.Mesh(geo, mat);
    m.position.set(x || 0, y || 0, z || 0);
    if (parent) parent.add(m);
    return m;
  }
  /* cylinder along z whose front end sits at zEnd */
  function cylZ(r, len, mat, parent, x, y, zEnd, seg) {
    var g = new THREE.CylinderGeometry(r, r, len, seg || 28, 1, false);
    g.rotateX(Math.PI / 2);
    return mesh(g, mat, parent, x, y, zEnd - len / 2);
  }
  function box(w, h, d, mat, parent, x, y, z) { return mesh(new THREE.BoxGeometry(w, h, d), mat, parent, x, y, z); }

  /* ------------------------------------------------------------ textures */
  function endTex(ins, cu, n, bare) {
    return K.textTexture(128, 128, function (ctx, w, h) {
      ctx.fillStyle = bare ? '#C4C8CF' : ins;
      ctx.fillRect(0, 0, w, h);
      var c = w / 2, R = bare ? 60 : 44, sp = [[0, 0]], k, i;
      if (n > 1) for (k = 0; k < 6; k++) sp.push([Math.cos(k * TAU / 6), Math.sin(k * TAU / 6)]);
      if (n > 7) for (k = 0; k < 12; k++) sp.push([Math.cos(k * TAU / 12 + 0.26) * 1.9, Math.sin(k * TAU / 12 + 0.26) * 1.9]);
      var sr = n > 7 ? R / 4.1 : n > 1 ? R / 3.1 : R * 0.9;
      if (!bare) { ctx.fillStyle = '#8F5430'; ctx.beginPath(); ctx.arc(c, c, R, 0, TAU); ctx.fill(); }
      for (i = 0; i < sp.length; i++) {
        var sx = c + sp[i][0] * sr * 2.0 * (n > 7 ? 1 : 1), sy = c + sp[i][1] * sr * 2.0;
        if (n <= 1) { sx = c; sy = c; }
        ctx.fillStyle = bare ? '#E7EAEE' : cu;
        ctx.beginPath(); ctx.arc(sx, sy, sr * 0.92, 0, TAU); ctx.fill();
      }
    });
  }
  function braidTex() {
    var t = K.textTexture(128, 128, function (ctx, w, h) {
      ctx.fillStyle = '#9AA1AC'; ctx.fillRect(0, 0, w, h);
      ctx.lineWidth = 7;
      for (var s = -1; s <= 1; s += 2) {
        for (var i = -4; i < 9; i++) {
          ctx.strokeStyle = (i % 2) ? '#D5D9DF' : '#B4BAC4';
          ctx.beginPath();
          if (s < 0) { ctx.moveTo(i * 16 - 24, -8); ctx.lineTo(i * 16 + 104, 136); } else { ctx.moveTo(i * 16 + 104, -8); ctx.lineTo(i * 16 - 24, 136); }
          ctx.stroke();
        }
      }
    });
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    return t;
  }
  function liveCanvasTex(w, h) {
    var c = document.createElement('canvas'); c.width = w; c.height = h;
    var t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding; t.anisotropy = 8;
    return { c: c, ctx: c.getContext('2d'), tex: t };
  }

  /* ------------------------------------------------------------ data */
  var STOPS = ['kablo', 'kesit', 'konnektor', 'pin'];
  var NAMES = ['USB-C kablosu', 'Kablonun kesiti', 'Konnektör (fiş)', 'Bir sıra kontak'];
  var BTN = ['Kablo', 'Kesit', 'Konnektör', 'Pin'];
  var SCALE = [
    'tipik uzunluk: yaklaşık 1 m',
    'tipik kablo: çap yaklaşık 3–5 mm',
    'fiş genişliği: yaklaşık 8 mm',
    'kontaklar arası: yaklaşık 0,5 mm'
  ];
  var EXPLAIN = [
    'Kablo, şarj adaptörünü ve cihazı bağlar. İçinde kimi güç, kimi veri taşıyan teller var.',
    'Kırmızı VBUS ve siyah GND akımın gidiş ve dönüş yoludur. D+ ile D− veriyi, CC teli anlaşmayı taşır.',
    'Fişte iki sıra, 24 kontak var. İki sıra aynı dizildiği için fiş ters takılsa da uçlar eşleşir.',
    'GND: devrenin sıfır volt referansı; akımın kaynağa döndüğü yol. 5 V, VBUS ile GND farkıdır.'
  ];

  var C = {
    gnd: 0x23262C, vbus: 0xC8362B, cc: 0xE0A12E, dp: 0x2F9B55, dm: 0xF6F6F2, sbu: 0x8B63B8, ss: 0x8D95A3
  };
  var HEX = { gnd: '#23262C', vbus: '#C8362B', cc: '#E0A12E', dp: '#2F9B55', dm: '#F6F6F2', sbu: '#8B63B8', ss: '#8D95A3' };
  /* receptacle contact types, A1 … A12; row B is the same list rotated half a turn */
  var ROW = ['gnd', 'ss', 'ss', 'vbus', 'cc', 'dp', 'dm', 'sbu', 'vbus', 'ss', 'ss', 'gnd'];
  var ROWN = ['A1', 'A2', 'A3', 'A4', 'A5', 'A6', 'A7', 'A8', 'A9', 'A10', 'A11', 'A12'];

  /* ------------------------------------------------------------ factory */
  K.register('usbc-zoom', function (el, opts) {
    opts = opts || {};
    var theme = opts.theme || 'light';
    var reduced = K.reducedMotion;
    var v = K.stage3d(el, {
      theme: theme, fov: 28, distance: 12.5, yaw: 0.3, pitch: 0.42, target: [0, 0, 0], size: 4, shadows: true,
      orbit: false, near: 0.05, far: 200
    });
    if (v.lights) { v.lights.key.intensity = 1.45; v.lights.fill.intensity = 0.5; v.lights.hemi.intensity = 0.45; }
    v.exposure = 0.92;
    var root = new THREE.Group();
    v.scene.add(root);
    var tmpV = new THREE.Vector3();

    /* ---- layers with crossfade opacity */
    function Layer(rotY) {
      var g = new THREE.Group();
      g.rotation.y = rotY || 0;
      root.add(g);
      var L = {
        g: g, mats: [], alpha: 1,
        mat: function (m) { L.mats.push({ m: m, base: m.opacity, tr: m.transparent }); return m; },
        std: function (color, rough, metal, extra) { return L.mat(K.mat.std(color, rough, metal, extra)); },
        setAlpha: function (a) {
          L.alpha = a; g.visible = a > 0.004;
          for (var i = 0; i < L.mats.length; i++) {
            var e = L.mats[i];
            if (a >= 0.999) { e.m.opacity = e.base; e.m.transparent = e.tr; } else { e.m.opacity = e.base * a; e.m.transparent = true; }
          }
        }
      };
      return L;
    }
    var L0 = Layer(0), L1 = Layer(Math.PI / 2), L2 = Layer(Math.PI / 2), L3 = Layer(Math.PI / 2);

    /* =====================================================================
     * layer 0 · the whole cable between a dev board and a charger (world axes)
     * ===================================================================== */
    var GY = -0.14;                    /* table height */
    var shGround = L0.mat(new THREE.ShadowMaterial({ opacity: 0.16 }));
    var ground = mesh(new THREE.PlaneGeometry(16, 10), shGround, L0.g, 0, GY, 0);
    ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true;

    var mJacket = L0.std(0x30343B, 0.5, 0);
    var cablePts = [[-1.62, 0, 0], [-1.1, 0, 0.2], [-0.5, 0, -0.18], [0, 0, 0], [0.55, 0, 0.2], [1.1, 0.04, -0.14], [1.66, 0.17, 0]];
    var cableCurve = new THREE.CatmullRomCurve3(cablePts.map(function (p) { return new THREE.Vector3(p[0], p[1], p[2]); }), false, 'catmullrom', 0.5);
    var cable = mesh(new THREE.TubeGeometry(cableCurve, 160, 0.13, 20, false), mJacket, L0.g);
    cable.castShadow = true;

    /* dev board */
    var BX = -3.0, mMask = L0.std(0x1F4F3B, 0.4, 0), mSteel = L0.mat(K.mat.steel({ color: 0xC9CDD3, roughness: 0.28 }));
    var mBlack = L0.std(0x1E2128, 0.5, 0), mWhite = L0.std(0xF4F3EF, 0.38, 0), mTin = L0.mat(K.mat.tin());
    var board = new THREE.Group(); board.position.set(BX, GY, 0.1); L0.g.add(board);
    var b1 = box(1.5, 0.07, 1.05, mMask, board, 0, 0.035, 0); b1.castShadow = true; b1.receiveShadow = true;
    var mod = box(0.58, 0.07, 0.46, mSteel, board, -0.18, 0.105, -0.12); mod.castShadow = true;
    box(0.58, 0.012, 0.18, mBlack, board, -0.18, 0.075, 0.28);
    box(0.2, 0.05, 0.2, mBlack, board, 0.3, 0.095, 0.2).castShadow = true;
    box(0.16, 0.05, 0.16, mBlack, board, 0.38, 0.095, -0.3).castShadow = true;
    box(1.3, 0.05, 0.05, mBlack, board, -0.05, 0.095, -0.46);
    box(1.3, 0.05, 0.05, mBlack, board, -0.05, 0.095, 0.46);
    var port0 = box(0.3, 0.12, 0.36, mSteel, board, 0.66, 0.13, 0); port0.castShadow = true;
    /* plug on the board end */
    var plugA = box(0.3, 0.095, 0.29, mTin, L0.g, -2.12, 0, 0.1);
    var plugAo = mesh(roundedBox(0.34, 0.22, 0.55, 0.08, 0.025), mJacket, L0.g, -1.74, 0, 0.1);
    plugAo.rotation.y = Math.PI / 2; plugAo.scale.set(1, 1, 1); plugAo.castShadow = true;
    plugA.position.y = 0;
    /* charger */
    var chg = mesh(roundedBox(0.92, 0.62, 1.2, 0.12, 0.04), mWhite, L0.g, 2.75, GY + 0.31, 0.0);
    chg.rotation.y = Math.PI / 2; chg.castShadow = true;
    var plugB = box(0.34, 0.095, 0.29, mTin, L0.g, 2.3, 0.17, 0);
    var plugBo = mesh(roundedBox(0.34, 0.22, 0.55, 0.08, 0.025), mJacket, L0.g, 1.9, 0.17, 0);
    plugBo.rotation.y = Math.PI / 2; plugBo.castShadow = true;
    var slot = box(0.04, 0.13, 0.3, mBlack, L0.g, 2.16, 0.17, 0);
    /* cut plane marker around the cable middle */
    var mMark = L0.mat(new THREE.MeshBasicMaterial({ color: 0xC8693A, transparent: true, opacity: 0.9 }));
    var mark = mesh(new THREE.TorusGeometry(0.2, 0.012, 8, 48), mMark, L0.g, 0, 0, 0);
    mark.rotation.y = Math.PI / 2;
    var markDisc = mesh(new THREE.CircleGeometry(0.2, 40), L0.mat(new THREE.MeshBasicMaterial({ color: 0xC8693A, transparent: true, opacity: 0.16, side: THREE.DoubleSide, depthWrite: false })), L0.g, 0, 0, 0);
    markDisc.rotation.y = Math.PI / 2;

    /* =====================================================================
     * layer 1 · cut across the cable (local frame: face looks toward +z)
     * ===================================================================== */
    var R_J = 1.55, R_JI = 1.36, R_B = 1.34, R_BI = 1.23;
    var Z_J = 0, Z_B = 0.35, Z_F = 0.35;
    function tubeGeo(ro, ri, len, zFront) {
      var sh = new THREE.Shape(); sh.absarc(0, 0, ro, 0, TAU, false);
      var hole = new THREE.Path(); hole.absarc(0, 0, ri, 0, TAU, true); sh.holes.push(hole);
      var g = new THREE.ExtrudeGeometry(sh, { depth: len, bevelEnabled: false, curveSegments: 72 });
      g.translate(0, 0, zFront - len);
      return g;
    }
    var jacket = mesh(tubeGeo(R_J, R_JI, 6, Z_J), L1.std(0x30343B, 0.5, 0, { side: THREE.DoubleSide }), L1.g);
    var bt = braidTex(); bt.repeat.set(6, 6);
    var braid = mesh(tubeGeo(R_B, R_BI, 6, Z_B), L1.std(0xFFFFFF, 0.38, 0.85, { map: bt, side: THREE.DoubleSide }), L1.g);
    var filler = cylZ(R_BI - 0.005, 6, L1.std(0xE6E1D2, 0.85, 0), L1.g, 0, 0, Z_F, 56);

    function wire(x, y, r, zEnd, len, ins, tex, side) {
      var m = L1.std(ins, 0.45, 0);
      cylZ(r, len, m, L1.g, x, y, zEnd, 28);
      var d = mesh(new THREE.CircleGeometry(r, 36), L1.std(0xFFFFFF, 0.5, 0.1, { map: tex }), L1.g, x, y, zEnd + 0.002);
      return d;
    }
    wire(-0.52, 0.40, 0.34, 0.55, 6, C.vbus, endTex('#C8362B', '#D99060', 19, false));
    wire(0.52, 0.40, 0.34, 0.55, 6, C.gnd, endTex('#23262C', '#D99060', 19, false));
    wire(-0.08, -0.30, 0.11, 0.7, 6, C.cc, endTex('#E0A12E', '#D99060', 7, false));
    /* drain wire: bare strands */
    cylZ(0.07, 6, L1.mat(K.mat.tin({ roughness: 0.3 })), L1.g, 0, 1.12, 0.55, 14);
    mesh(new THREE.CircleGeometry(0.07, 20), L1.std(0xFFFFFF, 0.4, 0.5, { map: endTex('', '', 7, true) }), L1.g, 0, 1.12, 0.552);
    /* twisted pairs */
    function twistedPair(cx, cy, a, r, zEnd, pitch, col1, col2, tex1, tex2) {
      var m1 = L1.std(col1, 0.45, 0), m2 = L1.std(col2, 0.45, 0);
      [[1, m1, tex1], [-1, m2, tex2]].forEach(function (w) {
        var pts = [], n = 60, z0 = zEnd - 3.2;
        for (var i = 0; i <= n; i++) {
          var z = zEnd - (zEnd - z0) * (1 - i / n);
          var ph = (zEnd - z) / pitch * TAU;
          pts.push(new THREE.Vector3(cx + w[0] * a * Math.cos(ph), cy + w[0] * a * Math.sin(ph), z));
        }
        var tg = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 200, r, 16, false);
        mesh(tg, w[1], L1.g);
        mesh(new THREE.CircleGeometry(r, 32), L1.std(0xFFFFFF, 0.5, 0.1, { map: w[2] }), L1.g, cx + w[0] * a, cy, zEnd + 0.002);
      });
    }
    twistedPair(-0.62, -0.52, 0.16, 0.16, 1.15, 1.15, C.dp, C.dm, endTex('#2F9B55', '#D99060', 7, false), endTex('#F6F6F2', '#D99060', 7, false));
    twistedPair(0.34, -0.78, 0.14, 0.13, 0.9, 1.0, 0x7A828F, 0x959DAA, endTex('#7A828F', '#D99060', 7, false), endTex('#959DAA', '#D99060', 7, false));
    twistedPair(0.86, -0.30, 0.14, 0.13, 0.9, 1.0, 0x7A828F, 0x959DAA, endTex('#7A828F', '#D99060', 7, false), endTex('#959DAA', '#D99060', 7, false));
    /* foil outline around the grey pairs */
    var mFoil = L1.mat(new THREE.MeshStandardMaterial({ color: 0xB4BAC4, roughness: 0.35, metalness: 0.7, side: THREE.DoubleSide }));
    [[0.34, -0.78, 0.9], [0.86, -0.30, 0.9]].forEach(function (p) {
      var ring = mesh(new THREE.RingGeometry(0.88, 1, 40), mFoil, L1.g, p[0], p[1], p[2] + 0.004);
      ring.scale.set(0.34, 0.2, 1);
    });

    /* =====================================================================
     * layer 2 · the plug (local frame: mouth looks toward +z, width along x)
     * ===================================================================== */
    var PY = 0.74, PZ = 1.3;             /* top-row centre (local, before the shift) */
    var pivot = new THREE.Group(); pivot.position.set(0, -0.0, -PZ); L2.g.add(pivot);
    var rollG = new THREE.Group(); pivot.add(rollG);
    var SW = 6.0, SH = 1.9, SL = 2.4, WALL = 0.09;
    var shellShape = rrShape(SW, SH, 0.72);
    shellShape.holes.push(rrPath(new THREE.Path(), SW - 2 * WALL, SH - 2 * WALL, 0.72 - WALL));
    var shellGeo = new THREE.ExtrudeGeometry(shellShape, { depth: SL, bevelEnabled: false, curveSegments: 14 });
    var mShell = L2.mat(K.mat.steel({ color: 0xC9CDD3, roughness: 0.26, side: THREE.DoubleSide }));
    var shell = mesh(shellGeo, mShell, rollG);
    /* contact carriers + back wall */
    var mCarrier = L2.std(0x2A2E36, 0.55, 0);
    box(SW - 2 * WALL - 1.0, 0.1, 1.9, mCarrier, rollG, 0, SH / 2 - WALL - 0.05, 1.2);
    box(SW - 2 * WALL - 1.0, 0.1, 1.9, mCarrier, rollG, 0, -(SH / 2 - WALL - 0.05), 1.2);
    box(SW - 2 * WALL, SH - 2 * WALL, 0.1, L2.std(0x14161B, 0.7, 0), rollG, 0, 0, 0.3);
    var CP = 0.4;                         /* contact pitch */
    var contactMats = {};
    Object.keys(C).forEach(function (k) { contactMats[k] = L2.std(C[k], 0.5, 0.1); });
    var contacts = [], i;
    for (i = 0; i < 12; i++) {
      var cx = (i - 5.5) * CP;
      var cu = box(0.26, 0.085, 1.55, contactMats[ROW[i]], rollG, cx, SH / 2 - WALL - 0.14, 1.35); contacts.push(cu);
      var cl = box(0.26, 0.085, 1.55, contactMats[ROW[11 - i]], rollG, cx, -(SH / 2 - WALL - 0.14), 1.35); contacts.push(cl);
    }
    /* overmoulded body, strain relief, cable */
    var mOver = L2.std(0x30343B, 0.5, 0);
    var over = mesh(roundedBox(6.8, 3.0, 3.2, 0.9, 0.05), mOver, rollG, 0, 0, -1.6); over.castShadow = false;
    var relief = mesh(new THREE.CylinderGeometry(1.35, 1.55, 1.4, 40), mOver, rollG, 0, 0, -3.9);
    relief.rotation.x = Math.PI / 2;
    cylZ(1.3, 6, mOver, rollG, 0, 0, -4.4, 40);
    /* seam ring between shell and body */
    mesh(new THREE.TorusGeometry(0.01, 0.01, 4, 4), mOver, rollG);

    /* =====================================================================
     * layer 3 · one row of contacts with a voltmeter (local frame as layer 2)
     * ===================================================================== */
    var PITCH3 = 0.47;
    var carrier3 = box(6.0, 0.16, 2.3, L3.std(0x9AA2AF, 0.6, 0), L3.g, 0, -0.1, 0.0); carrier3.receiveShadow = false;
    var pin3 = [];
    for (i = 0; i < 12; i++) {
      var px = (i - 5.5) * PITCH3, typ = ROW[i];
      var cm = L3.std(C[typ], 0.5, 0.1);
      var bl = box(0.31, 0.12, 1.75, cm, L3.g, px, 0.04, 0.1);
      var tip = box(0.31, 0.12, 0.2, cm, L3.g, px, 0.04, 1.12);
      tip.rotation.x = 0.0;
      pin3.push({ x: px, type: typ, z: 0.98 });
    }
    /* voltmeter */
    var meter = new THREE.Group(); meter.position.set(-0.7, -0.55, 3.2); meter.rotation.x = -0.35; L3.g.add(meter);
    mesh(roundedBox(2.4, 1.05, 0.34, 0.14, 0.03), L3.std(0xF4F3EF, 0.4, 0), meter, 0, 0, 0);
    var disp = liveCanvasTex(384, 160);
    var dispMesh = mesh(new THREE.PlaneGeometry(1.9, 0.62), L3.mat(new THREE.MeshBasicMaterial({ map: disp.tex, toneMapped: false })), meter, 0, 0.12, 0.175);
    var jackR = mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.06, 16), L3.std(0xC8362B, 0.4, 0.2), meter, -0.45, 0.53, 0.0);
    var jackB = mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.06, 16), L3.std(0x23262C, 0.4, 0.2), meter, -0.82, 0.53, 0.0);
    var A4x = pin3[3].x, A1x = pin3[0].x;
    function probe(tipX, col, jackLocal, bend) {
      var tipP = new THREE.Vector3(tipX, 0.2, 1.1);
      var handle = new THREE.Vector3(tipX + 0.18, 0.85, 1.95);
      var mP = L3.std(col, 0.4, 0.1);
      var cone = mesh(new THREE.CylinderGeometry(0.01, 0.06, 0.55, 14), L3.mat(K.mat.steel()), L3.g);
      var dir = handle.clone().sub(tipP).normalize();
      cone.position.copy(tipP).addScaledVector(dir, 0.27);
      cone.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().negate().negate());
      cone.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().negate());
      var grip = mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.75, 14), mP, L3.g);
      grip.position.copy(tipP).addScaledVector(dir, 0.55 + 0.37);
      grip.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().negate());
      /* lead from the grip end to the meter jack (jack world position in layer-3 local space) */
      var jack = new THREE.Vector3(jackLocal[0], jackLocal[1], jackLocal[2]);
      var end = tipP.clone().addScaledVector(dir, 1.3);
      var lead = new THREE.CatmullRomCurve3([end, end.clone().add(new THREE.Vector3(0.2 * bend, 0.2, 0.6)), jack.clone().add(new THREE.Vector3(0, 0.5, 0.1)), jack], false, 'catmullrom', 0.5);
      mesh(new THREE.TubeGeometry(lead, 48, 0.035, 8, false), L3.std(col, 0.5, 0), L3.g);
    }
    function jackPos(lx, ly) { var vv = new THREE.Vector3(lx, 0.58, 0.0).applyEuler(meter.rotation).add(meter.position); return [vv.x, vv.y, vv.z]; }
    probe(A4x, 0xC8362B, jackPos(-0.45, 0), 1);
    probe(A1x, 0x23262C, jackPos(-0.82, 0), -1);

    /* =====================================================================
     * labels
     * ===================================================================== */
    var labels = [];
    function lab(stop, html, grp, p, dx, dy, align, cls) {
      var vec = new THREE.Vector3();
      var L = v.label(html, {
        at: function () { return vec.set(p[0], p[1], p[2]).applyMatrix4(grp.matrixWorld); },
        cls: cls || 'name', dx: dx, dy: dy, align: align || 'left', html: true, line: !cls || cls.indexOf('chip') < 0, visible: false
      });
      L.stop = stop;
      labels.push(L);
      return L;
    }
    function N(name, note) { return name + (note ? '<br><span style="font-weight:400;font-size:13px;color:#595E69">' + note + '</span>' : ''); }

    /* stop 0 */
    lab(0, N('geliştirme kartı'), L0.g, [BX, GY + 0.12, 0.1], -4, -66, 'center');
    lab(0, N('şarj adaptörü'), L0.g, [2.75, GY + 0.62, 0], 6, -62, 'center');
    lab(0, N('USB-C kablosu', 'içinde birkaç ince tel var'), L0.g, [-0.5, 0.13, -0.18], -36, 74, 'center');
    lab(0, N('kesit düzlemi', 'sonraki adımda buraya yaklaşıyoruz'), L0.g, [0, 0.2, 0], 38, -88, 'left');

    /* stop 1 (local xy, face at the front) */
    lab(1, N('dış kılıf', 'plastik koruma'), L1.g, [-1.5, 0.1, 0], -40, -4, 'right');
    lab(1, N('örgülü blendaj', 'metal örgü, parazitten korur'), L1.g, [-1.28, -0.5, Z_B], -52, 22, 'right');
    lab(1, N('drain teli', 'blendaja değen çıplak tel'), L1.g, [0.0, 1.12, 0.55], 74, -52, 'left');
    lab(1, N('VBUS: kalın kırmızı tel', '5 V (+), akımın gidiş yolu'), L1.g, [-0.7, 0.58, 0.55], -96, -100, 'right');
    lab(1, N('GND: kalın siyah tel', '0 V, referans · dönüş yolu'), L1.g, [0.72, 0.58, 0.55], 84, -58, 'left');
    lab(1, N('CC: ince tel', 'yön ve güç anlaşması'), L1.g, [-0.08, -0.3, 0.7], 28, 118, 'left');
    lab(1, N('bükümlü çift: veri', 'D+ yeşil · D− beyaz'), L1.g, [-0.78, -0.52, 1.15], -60, 56, 'right');
    lab(1, N('hızlı veri çiftleri', '(bazı kablolarda)'), L1.g, [1.0, -0.3, 0.9], 70, 40, 'left');

    /* stop 2 */
    lab(2, N('metal kabuk'), L2.g, [-2.2, 0.95, 1.3 - PZ], -30, -90, 'right');
    lab(2, N('plastik gövde'), L2.g, [-3.0, 0.9, -1.6 - PZ + 0.0], -26, -26, 'right');
    lab(2, N('kablo'), L2.g, [-0.6, 1.3, -4.6 - PZ + 0.0], 24, -52, 'left');
    lab(2, N('kontaklar', 'üst sıra 12 + alt sıra 12'), L2.g, [2.3, 0.74, 1.9 - PZ], 20, -66, 'right').roll = true;
    lab(2, N('ters takılır', 'iki sıra aynı dizilimde:<br>yarım tur çevrilince<br>aynı uçlar eşleşir'), L2.g, [2.3, -0.74, 1.9 - PZ], 20, 52, 'right').roll = true;

    /* stop 3: pin names, staggered so neighbours do not collide */
    var pinNames = { 0: 'GND', 3: 'VBUS', 4: 'CC1', 5: 'D+', 6: 'D−', 11: 'GND' };
    var pinLab = {};
    [0, 3, 4, 5, 6, 11].forEach(function (ix, k) {
      var up = (ix === 3 || ix === 5) ? -92 : (ix === 4 || ix === 6) ? -52 : -62;
      var html = '<span style="font:500 11px ' + K.fonts.mono + ';color:#595E69">' + ROWN[ix] + '</span><br><b style="font-weight:600">' + pinNames[ix] + '</b>';
      pinLab[ix] = lab(3, html, L3.g, [pin3[ix].x, 0.12, -0.7], 0, up, 'center', 'name');
    });
    var voltChip = lab(3, 'VBUS − GND = 5 V', L3.g, [0.2, -0.55, 3.2], 56, 40, 'left', 'value chip');
    voltChip.line = false;
    var gndNote = lab(3, '5 V, GND’ye göre ölçülür', L3.g, [0.2, -0.55, 3.2], 56, 76, 'left', 'name');
    gndNote.line = false;

    /* =====================================================================
     * camera per stop, zoom ladder and alpha windows
     * ===================================================================== */
    var CAMS = [
      { yaw: 0.32, pitch: 0.42, dist: 12.0, t: [-0.05, 0.0, 0] },
      { yaw: 1.34, pitch: 0.2, dist: 11.2, t: [0.25, -0.05, 0] },
      { yaw: 1.22, pitch: 0.14, dist: 17, t: [-1.0, 0, 0] },
      { yaw: 1.3, pitch: 0.5, dist: 13.2, t: [1.3, 0.1, 0] }
    ];
    var LN = [0, Math.log(12), Math.log(12), Math.log(12) + Math.log(1.4)];
    function Lz(z) { var i = Math.min(2, Math.floor(z)), f = z - i; return lerp(LN[i], LN[i + 1], f); }
    function fitPos(z) { return z; }

    function applyZ(z, t, dt) {
      var a0 = 1 - S(0.4, 0.68, z);
      var a1 = S(0.4, 0.68, z) * (1 - S(1.38, 1.62, z));
      var a2 = S(1.38, 1.62, z) * (1 - S(2.38, 2.62, z));
      var a3 = S(2.38, 2.62, z);
      L0.setAlpha(a0); L1.setAlpha(a1); L2.setAlpha(a2); L3.setAlpha(a3);
      var lz = Lz(z);
      L0.g.scale.setScalar(Math.exp(lz - LN[0]));
      L1.g.scale.setScalar(Math.exp(lz - LN[1]));
      L2.g.scale.setScalar(Math.exp(lz - LN[2]));
      L3.g.scale.setScalar(Math.exp(lz - LN[3]));
      /* camera */
      var i = Math.min(2, Math.floor(z)), f = z - i, A = CAMS[i], B = CAMS[i + 1];
      var sw = reduced ? 0 : 1;
      v.view.yaw = lerp(A.yaw, B.yaw, f) + sw * 0.06 * Math.sin(TAU * t / 17);
      v.view.pitch = lerp(A.pitch, B.pitch, f) + sw * 0.02 * Math.sin(TAU * t / 13);
      v.view.distance = lerp(A.dist, B.dist, f);
      v.view.target.set(lerp(A.t[0], B.t[0], f), lerp(A.t[1], B.t[1], f), lerp(A.t[2], B.t[2], f));
    }

    /* =====================================================================
     * state, schedule, readouts
     * ===================================================================== */
    var SEGS = [[0, 0, 4.2], [0, 1, 3.0], [1, 1, 6.4], [1, 2, 2.6], [2, 2, 7.4], [2, 3, 2.6], [3, 3, 5.4], [3, 0, 4.6]];
    var SEGS_RM = [[0, 0, 6], [0, 1, 1.2], [1, 1, 7], [1, 2, 1.2], [2, 2, 7], [2, 3, 1.2], [3, 3, 7], [3, 0, 1.6]];
    function zAuto(t) {
      var sg = reduced ? SEGS_RM : SEGS, tot = 0, k;
      for (k = 0; k < sg.length; k++) tot += sg[k][2];
      var u = t % tot;
      for (k = 0; k < sg.length; k++) {
        var d = sg[k][2];
        if (u < d) return lerp(sg[k][0], sg[k][1], eio(u / d));
        u -= d;
      }
      return 0;
    }
    var auto = true, zCur = 0, fly = null, stopSel = 0, dwell = 0, prevStop = -1, rollA = 0;
    function nearest(z) { return clamp(Math.round(z), 0, 3); }
    function nearK(z, k) { return 1 - S(0.06, 0.2, Math.abs(z - k)); }

    /* meter display */
    var lastVal = -1;
    function drawMeter(val) {
      var q = Math.round(val * 10);
      if (q === lastVal) return;
      lastVal = q;
      var c = disp.ctx, w = disp.c.width, h = disp.c.height;
      c.fillStyle = '#C9D6C4'; c.fillRect(0, 0, w, h);
      c.fillStyle = '#2A3A2B';
      c.font = '500 30px ' + K.fonts.mono; c.textAlign = 'left'; c.textBaseline = 'alphabetic';
      c.fillText('VBUS − GND', 20, 46);
      c.font = '500 86px ' + K.fonts.mono; c.textAlign = 'right';
      c.fillText((q / 10).toFixed(1).replace('.', ','), w - 96, 134);
      c.font = '500 44px ' + K.fonts.mono; c.textAlign = 'left';
      c.fillText('V', w - 84, 134);
      disp.tex.needsUpdate = true;
    }
    drawMeter(0);

    /* 2D overlay: stop name, scale, stop track, legend, model tag */
    function drawOverlay(z) {
      var ctx = v.ctx, W = v.w, H = v.h, k = nearest(z);
      ctx.save();
      /* header */
      var name = NAMES[k], sc = SCALE[k];
      ctx.font = K.font(15, 600, false);
      var nw = ctx.measureText(name).width;
      ctx.font = K.font(12.5, 500, true);
      var sw = ctx.measureText(sc).width;
      var pw = Math.max(nw, sw) + 24;
      ctx.fillStyle = 'rgba(255,255,255,0.9)'; ctx.strokeStyle = P.line; ctx.lineWidth = 1;
      K.rr(ctx, 12, 12, pw, 52, 8); ctx.fill(); ctx.stroke();
      K.label(ctx, name, 24, 33, { size: 15, weight: 600, color: P.ink });
      K.label(ctx, sc, 24, 54, { size: 12.5, weight: 500, mono: true, color: P.muted });
      /* stop track */
      var tx = W - 22 - 3 * 26;
      ctx.strokeStyle = P.line2; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(tx, 26); ctx.lineTo(tx + 78, 26); ctx.stroke();
      for (var q = 0; q < 4; q++) {
        var on = Math.abs(z - q) < 0.5;
        ctx.fillStyle = on ? P.blue : P.paper; ctx.strokeStyle = on ? P.blue : P.neutral; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(tx + q * 26, 26, on ? 5.5 : 4, 0, TAU); ctx.fill(); ctx.stroke();
      }
      var fz = z; ctx.fillStyle = P.copperFill;
      ctx.beginPath(); ctx.arc(tx + fz * 26, 26, 2.2, 0, TAU); ctx.fill();
      K.label(ctx, BTN[k].toLocaleLowerCase('tr'), W - 22 - 78 + 78, 50, { size: 12, mono: true, color: P.muted, align: 'right', spacing: 0.5 });
      /* tag */
      K.label(ctx, 'ölçekli değil · basitleştirilmiş model', W - 14, H - 14, { size: 11, weight: 500, mono: true, color: P.muted, align: 'right', spacing: 0.6 });
      /* stop 1: note */
      var a1 = nearK(z, 1);
      if (a1 > 0.02) {
        ctx.globalAlpha = a1;
        ctx.fillStyle = 'rgba(255,255,255,0.92)'; ctx.strokeStyle = P.line; K.rr(ctx, 14, H - 70, 360, 50, 8); ctx.fill(); ctx.stroke();
        K.label(ctx, 'Sadece şarj için yapılmış kablolarda', 26, H - 48, { size: 13, color: P.ink2 });
        K.label(ctx, 'yalnızca VBUS, GND ve CC bulunur.', 26, H - 29, { size: 13, weight: 600, color: P.ink });
        ctx.globalAlpha = 1;
      }
      /* stop 2: legend */
      var a2 = nearK(z, 2);
      if (a2 > 0.02) {
        ctx.globalAlpha = a2;
        var items = [['gnd', 'GND (4)'], ['vbus', 'VBUS (4)'], ['cc', 'CC (2)'], ['dp', 'D+ / D− (4)'], ['sbu', 'SBU (2)'], ['ss', 'hızlı çiftler (8)']];
        var lx = 14, ly = H - 104, lw = 336;
        ctx.fillStyle = 'rgba(255,255,255,0.92)'; ctx.strokeStyle = P.line; K.rr(ctx, lx, ly, lw, 90, 8); ctx.fill(); ctx.stroke();
        K.label(ctx, 'kontak grupları · 12 + 12 = 24', lx + 12, ly + 20, { size: 11, weight: 500, mono: true, color: P.muted, spacing: 0.5 });
        for (var n = 0; n < 6; n++) {
          var cxm = lx + 12 + Math.floor(n / 3) * 164, cym = ly + 42 + (n % 3) * 20;
          ctx.fillStyle = HEX[items[n][0]]; ctx.strokeStyle = 'rgba(21,23,28,0.35)'; ctx.lineWidth = 1;
          K.rr(ctx, cxm, cym - 9, 16, 12, 3); ctx.fill(); ctx.stroke();
          if (items[n][0] === 'dp') { ctx.fillStyle = HEX.dm; K.rr(ctx, cxm + 9, cym - 9, 7, 12, 3); ctx.fill(); ctx.stroke(); }
          K.label(ctx, items[n][1], cxm + 24, cym + 1, { size: 13, color: P.ink });
        }
        ctx.globalAlpha = 1;
      }
      ctx.restore();
    }

    function resetAll() {
      auto = true; fly = null; zCur = 0; stopSel = 0; dwell = 0; prevStop = -1; rollA = 0;
    }
    resetAll();

    var inst = {
      reset: resetAll,
      set: function (key, val) {
        if (key !== 'stop') return;
        var k = typeof val === 'number' ? val : STOPS.indexOf(String(val));
        if (k < 0 && /^[0-3]$/.test(String(val))) k = +val;
        if (!(k >= 0 && k <= 3)) return;
        auto = false; stopSel = k;
        fly = { from: zCur, to: k, t: 0, dur: reduced ? 0.01 : Math.min(4.2, 1.3 + 0.8 * Math.abs(k - zCur)) };
      },
      read: function (key) {
        var k = nearest(zCur);
        if (key === 'stop') return STOPS[k];
        if (key === 'name') return NAMES[k];
        if (key === 'explain') return EXPLAIN[k];
        if (key === 'scale') return SCALE[k];
        return '';
      },
      frame: function (t, dt) {
        if (auto) zCur = zAuto(t);
        else if (fly) {
          fly.t += dt;
          zCur = lerp(fly.from, fly.to, eio(fly.t / fly.dur));
          if (fly.t >= fly.dur) { zCur = fly.to; fly = null; }
        }
        var z = zCur;
        var stopNow = -1;
        for (var q = 0; q < 4; q++) if (Math.abs(z - q) < 0.03) stopNow = q;
        if (stopNow !== prevStop) { dwell = 0; prevStop = stopNow; } else dwell += dt;

        /* the plug turns half a turn: both rows are the same, so it fits either way */
        var target;
        if (stopNow === 2 && !reduced) {
          var u = dwell % 7.2, cyc = Math.floor(dwell / 7.2);
          target = Math.PI * (cyc + eio(K.span(u, 2.4, 4.4)));
          rollA = lerp(rollA, target, Math.min(1, dt * 12));
        } else if (z < 1.7 || z > 2.3) { rollA = 0; } else {
          rollA = lerp(rollA, Math.round(rollA / Math.PI) * Math.PI, Math.min(1, dt * 8));
        }
        rollG.rotation.z = rollA;

        applyZ(z, t, dt);
        /* meter */
        drawMeter(stopNow === 3 ? 5 * eio(K.span(dwell, 0.6, 1.8)) : (z > 2.5 ? 0 : 0));
        root.updateMatrixWorld(true);
        var rolled = Math.abs(Math.sin(rollA)) > 0.04;
        for (var i = 0; i < labels.length; i++) labels[i].show(nearK(z, labels[i].stop) > 0.5 && !(labels[i].roll && rolled));
        v.render(dt);
        if (K.skipRender) return;
        drawOverlay(z);
      },
      resize: function () { },
      dispose: function () { disp.tex.dispose(); v.dispose(); }
    };
    return inst;
  });
})();
