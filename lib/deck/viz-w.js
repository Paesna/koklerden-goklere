/* Köklerden Göklere · Akkor lamba nasıl çalışır?
 *
 * Kayıtlı görsel:
 *   lamp-lab   (S 680×520)   3B: akkor lambanın kesiti, tel, çarpışma, renk, karşılaştırma
 *
 * set('view', 'lamba' | 'tel' | 'carpisma' | 'renk' | 'karsilastir')   (ilk set() otomatik gösteriyi durdurur)
 * set('volt', 0..230)    gerilim; 0 / 50 / 120 / 230 V adımları sunumdaki düğmelerdir
 * read('view')    -> görünüm adı
 * read('explain') -> o anki görünümün 1-2 cümlelik açıklaması
 * read('temp')    -> '≈ 2.500 °C'
 * read('volt')    -> '230 V'
 *
 * Ölçekli DEĞİLDİR: tel, iyonlar ve elektronlar okunsun diye çok büyütülmüştür.
 * Sıcaklıklar yaklaşık değerlerdir (sıcaklık gerilimle yaklaşık orantılı büyür; tablo TEMP_TABLE).
 */
(function () {
  'use strict';
  var K = window.KGViz;
  if (!K) return;
  var clamp = K.clamp, lerp = K.lerp;
  var TAU = Math.PI * 2;
  function TH() { return window.THREE; }
  function sm(x) { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); }

  var ORDER = ['lamba', 'tel', 'carpisma', 'renk', 'karsilastir'];
  var DUR = { lamba: 9, tel: 8, carpisma: 8, renk: 8.5, karsilastir: 8 };

  var EXPLAIN = {
    lamba: 'Akım kontak ucundan girer, ince tungsten telden geçer, vida yanından çıkar. Tel ısınıp parlar.',
    tel: 'Akım aynıdır; ince ve uzun telin direnci büyüktür, ısı yalnızca telde çıkar.',
    carpisma: 'Elektronlar iyonlara çarpar; enerjileri iyonların titreşimine, yani ısıya dönüşür.',
    renk: 'Isınan her cisim ışık yayar; sıcaklık arttıkça renk kırmızıdan beyaza kayar. Işığın payı yaklaşık %5.',
    karsilastir: 'Aynı ışık için akkor 60 W, LED 9 W çeker: 60 ÷ 9 ≈ 6,7 kat. Akkorda fark ısı olur.'
  };

  /* gerilim (V) -> filaman sıcaklığı (°C), yaklaşık */
  var TEMP_TABLE = [[0, 20], [50, 800], [120, 1800], [230, 2500]];
  function tempOf(V) {
    var i;
    V = clamp(V, 0, 230);
    for (i = 0; i < TEMP_TABLE.length - 1; i++) {
      if (V <= TEMP_TABLE[i + 1][0]) {
        var a = TEMP_TABLE[i], b = TEMP_TABLE[i + 1];
        return lerp(a[1], b[1], (V - a[0]) / (b[0] - a[0]));
      }
    }
    return 2500;
  }
  /* sıcaklığa göre ışıma rengi (kabaca kara cisim) ve parlaklık */
  var CSTOPS = [
    [450, 0.0, 0.0, 0.0], [650, 0.4, 0.012, 0.0], [800, 0.7, 0.035, 0.003], [1000, 0.95, 0.09, 0.008],
    [1500, 1.0, 0.25, 0.03], [2000, 1.0, 0.42, 0.1], [2500, 1.0, 0.6, 0.26], [3000, 1.0, 0.75, 0.45]
  ];
  function colorForT(T) {
    var i, o = { r: 0, g: 0, b: 0, i: 0 };
    if (T <= CSTOPS[0][0]) return o;
    if (T >= CSTOPS[CSTOPS.length - 1][0]) T = CSTOPS[CSTOPS.length - 1][0];
    for (i = 0; i < CSTOPS.length - 1; i++) {
      if (T <= CSTOPS[i + 1][0]) {
        var a = CSTOPS[i], b = CSTOPS[i + 1], u = (T - a[0]) / (b[0] - a[0]);
        o.r = lerp(a[1], b[1], u); o.g = lerp(a[2], b[2], u); o.b = lerp(a[3], b[3], u);
        break;
      }
    }
    o.i = 0.85 + 0.35 * sm((T - 450) / 2050);
    return o;
  }
  function cssColor(T, a) {
    var c = colorForT(T);
    if (c.i === 0) return 'rgba(120,124,132,' + (a === undefined ? 1 : a) + ')';
    function g(x) { return Math.round(clamp(Math.pow(clamp(x * c.i, 0, 1), 1 / 2.2), 0, 1) * 255); }
    return 'rgba(' + g(c.r) + ',' + g(c.g) + ',' + g(c.b) + ',' + (a === undefined ? 1 : a) + ')';
  }
  function colourName(T) {
    if (T < 500) return 'soğuk, ışık yok';
    if (T < 1100) return 'koyu kırmızı';
    if (T < 1700) return 'turuncu';
    if (T < 2200) return 'sarımsı turuncu';
    return 'sarımsı beyaz';
  }
  function fmtTemp(T) {
    var r = T < 100 ? Math.round(T) : Math.round(T / 50) * 50;
    return '≈ ' + K.num(r, 0) + ' °C';
  }

  /* ---------- 3B yardımcılar ---------- */
  function lathe(pts, segs, ps, pl) {
    var THREE = TH();
    return new THREE.LatheGeometry(pts.map(function (p) { return new THREE.Vector2(p[0], p[1]); }), segs || 48, ps || 0, pl || TAU);
  }
  function mkPath(pts) {
    var cum = [0], i;
    for (i = 1; i < pts.length; i++) {
      var dx = pts[i][0] - pts[i - 1][0], dy = pts[i][1] - pts[i - 1][1], dz = pts[i][2] - pts[i - 1][2];
      cum.push(cum[i - 1] + Math.sqrt(dx * dx + dy * dy + dz * dz));
    }
    return { pts: pts, cum: cum, len: cum[cum.length - 1] };
  }
  function pathAt(P, s, out) {
    var j = 0;
    while (j < P.cum.length - 2 && P.cum[j + 1] < s) j++;
    var seg = P.cum[j + 1] - P.cum[j], u = seg > 0 ? (s - P.cum[j]) / seg : 0;
    var a = P.pts[j], b = P.pts[j + 1];
    out[0] = lerp(a[0], b[0], u); out[1] = lerp(a[1], b[1], u); out[2] = lerp(a[2], b[2], u); out[3] = lerp(a[3], b[3], u);
  }

  K.register('lamp-lab', function (el, opts) {
    var THREE = TH();
    opts = opts || {};
    var dark = opts.theme === 'dark';
    var CAM = {
      lamba: { yaw: 0.42, pitch: 0.1, distance: 218, target: [0, 22, 0] },
      tel: { yaw: 0.22, pitch: 0.2, distance: 178, target: [0, -6, 0] },
      carpisma: { yaw: 0.3, pitch: 0.38, distance: 128, target: [0, 0, 0] },
      renk: { yaw: 0.16, pitch: 0.22, distance: 138, target: [0, -13, 0] },
      karsilastir: { yaw: 0.14, pitch: 0.14, distance: 238, target: [0, 18, 0] }
    };
    var v = K.stage3d(el, {
      theme: opts.theme, fov: 26, near: 2, far: 2000, yaw: CAM.lamba.yaw, pitch: CAM.lamba.pitch, distance: CAM.lamba.distance,
      target: CAM.lamba.target, size: 60, minDistance: 50, maxDistance: 420, minPitch: -0.2, maxPitch: 1.1
    });
    if (!v.ready) {
      return { reset: function () {}, frame: function (t, dt) { v.render(dt); }, read: function (k) { return k === 'view' ? 'lamba' : k === 'explain' ? EXPLAIN.lamba : k === 'temp' ? '≈ 2.500 °C' : '230 V'; } };
    }
    var Lr = v.lights;
    if (Lr) {
      Lr.key.intensity *= 0.85; Lr.fill.intensity *= 0.9; Lr.rim.intensity *= 0.9; Lr.hemi.intensity *= 0.8;
      Lr.key.shadow.normalBias = 0.04;
      Lr.key.shadow.camera.left = -90; Lr.key.shadow.camera.right = 90; Lr.key.shadow.camera.top = 90; Lr.key.shadow.camera.bottom = -90;
      Lr.key.shadow.camera.far = 600; Lr.key.shadow.camera.updateProjectionMatrix();
      v.exposure = 0.92;
    }

    /* ---------- malzemeler ---------- */
    var mCopper = K.mat.copper({ envMapIntensity: 0.8 });
    var mCopperT = K.mat.copper({ transparent: true, opacity: 0.4, depthWrite: false });
    var mSteel = K.mat.steel();
    var mShell = K.mat.aluminium({ side: THREE.DoubleSide, envMapIntensity: 0.9 });
    var mBrass = K.mat.std(0xB8964E, 0.3, 1);
    var mBlack = K.mat.plasticBlack();
    var mInsul = new THREE.MeshStandardMaterial({ color: 0xB3352A, roughness: 0.45, metalness: 0, transparent: true, opacity: 0.32, depthWrite: false });
    var mGlass = new THREE.MeshPhysicalMaterial({ color: 0xD5E2EC, roughness: 0.04, metalness: 0, transparent: true, opacity: 0.3, side: THREE.DoubleSide, depthWrite: false, envMapIntensity: 1.4 });
    var mStem = new THREE.MeshPhysicalMaterial({ color: 0xE9EEF0, roughness: 0.25, transparent: true, opacity: 0.5, depthWrite: false, envMapIntensity: 1.0 });
    function makeFil() {
      return new THREE.MeshStandardMaterial({ color: 0x5A5C62, roughness: 0.45, metalness: 0.7, emissive: 0x000000, emissiveIntensity: 0, toneMapped: false });
    }
    var filSmall = makeFil(), filBig = makeFil(), filCmp = makeFil();
    function applyFil(mat, T) {
      var c = colorForT(T);
      mat.emissive.setRGB(c.r, c.g, c.b);
      mat.emissiveIntensity = c.i;
    }

    /* ---------- parçalar ---------- */
    function seg(group, a, b, r, mat, cast) {
      var dx = b[0] - a[0], dy = b[1] - a[1], dz = b[2] - a[2], len = Math.sqrt(dx * dx + dy * dy + dz * dz);
      var m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 1, 10), mat);
      m.position.set((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2);
      m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(dx, dy, dz).normalize());
      m.scale.y = len;
      m.castShadow = cast !== false; m.receiveShadow = true;
      group.add(m);
    }
    function poly(group, pts, r, mat, cast) {
      var i;
      for (i = 0; i < pts.length - 1; i++) seg(group, pts[i], pts[i + 1], r, mat, cast);
      for (i = 1; i < pts.length - 1; i++) {
        var j = new THREE.Mesh(new THREE.SphereGeometry(r, 10, 8), mat);
        j.position.set(pts[i][0], pts[i][1], pts[i][2]);
        group.add(j);
      }
    }

    /* bükülü bükülü tel: ikincil sarmalın etrafına birincil sarmal */
    var CoilCurve = (function () {
      /* THREE.Curve bir ES sınıfıdır: Object.create ile genişletilemez */
      return class extends THREE.Curve {
        constructor(len, R2, r1, N2, N1) {
          super();
          this.len = len; this.R2 = R2; this.r1 = r1; this.N2 = N2; this.N1 = N1;
        }
        getPoint(t, target) {
          target = target || new THREE.Vector3();
          var a2 = t * this.N2 * TAU, ca = Math.cos(a2), sa = Math.sin(a2), R2 = this.R2, k = this.N2 * TAU;
          var sx = this.len * (t - 0.5), sy = R2 * ca, sz = R2 * sa;
          var tx = this.len, ty = -R2 * sa * k, tz = R2 * ca * k, tl = Math.sqrt(tx * tx + ty * ty + tz * tz);
          tx /= tl; ty /= tl; tz /= tl;
          var nx = 0, ny = -ca, nz = -sa, d = nx * tx + ny * ty + nz * tz;
          nx -= d * tx; ny -= d * ty; nz -= d * tz;
          var nl = Math.sqrt(nx * nx + ny * ny + nz * nz);
          nx /= nl; ny /= nl; nz /= nl;
          var bx = ty * nz - tz * ny, by = tz * nx - tx * nz, bz = tx * ny - ty * nx;
          var a1 = t * this.N1 * TAU, c1 = Math.cos(a1) * this.r1, s1 = Math.sin(a1) * this.r1;
          return target.set(sx + c1 * nx + s1 * bx, sy + c1 * ny + s1 * by, sz + c1 * nz + s1 * bz);
        }
      };
    })();
    function coilMesh(len, R2, r1, N2, N1, wr, segs, mat) {
      var curve = new CoilCurve(len, R2, r1, N2, N1);
      var m = new THREE.Mesh(new THREE.TubeGeometry(curve, segs, wr, 6, false), mat);
      m.castShadow = true;
      m.curve = curve;
      return m;
    }

    /* akkor ampul. cut: vida gövdesi önden kesik (kesit görünümü) */
    var shellPts = [[6.6, 2.6], [7.9, 3.2], [8.3, 4]];
    (function () {
      var y;
      for (y = 4.5; y <= 19.5; y += 0.5) shellPts.push([8.15 + 0.45 * Math.sin((y - 4.5) / 3 * TAU), y]);
      shellPts.push([8.2, 20]); shellPts.push([7.6, 21]);
    })();
    var geoShellFull = lathe(shellPts, 40);
    var geoShellCut = lathe(shellPts, 40, 0.85, TAU - 1.7);
    var geoGlass = lathe([[7.6, 20], [7.7, 24], [8.6, 27.5], [10.6, 30.5], [12.8, 33.5], [14.0, 37], [14.5, 41], [14.4, 45], [13.6, 50], [11.8, 54.5], [8.5, 58.5], [4.5, 61], [0, 61.8]], 56);
    var geoStem = lathe([[6.2, 21], [4.6, 23.4], [3.1, 26], [2.9, 36], [2.4, 37.4], [0, 37.6]], 28);

    function buildBulb(cut, filMat, withLeads) {
      var g = new THREE.Group(), m;
      m = new THREE.Mesh(cut ? geoShellCut : geoShellFull, mShell); m.castShadow = true; m.receiveShadow = true; g.add(m);
      m = new THREE.Mesh(new THREE.CylinderGeometry(7.4, 7.4, 2.2, 32), mBlack); m.position.set(0, 3.3, 0); m.castShadow = true; g.add(m);
      m = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 2.6, 5.8, 20), mBrass); m.position.set(0, 1.7, 0); m.castShadow = true; g.add(m);
      m = new THREE.Mesh(new THREE.SphereGeometry(2.6, 20, 10, 0, TAU, Math.PI / 2, Math.PI / 2), mBrass); m.position.set(0, -1.2, 0); g.add(m);
      var gl = new THREE.Mesh(geoGlass, mGlass); gl.renderOrder = 6; g.add(gl);
      var st = new THREE.Mesh(geoStem, mStem); st.renderOrder = 5; g.add(st);
      /* besleme telleri, destek telleri */
      var coil = coilMesh(16, 1.3, 0.55, 7, 70, 0.17, 800, filMat);
      coil.position.set(0, 47, 0);
      g.add(coil);
      var F0 = coil.curve.getPoint(0), F1 = coil.curve.getPoint(1);
      var f0 = [F0.x, F0.y + 47, F0.z], f1 = [F1.x, F1.y + 47, F1.z];
      poly(g, [[0, 4.4, 0], [-2.4, 10, 0], [-2.4, 37, 0]], 0.38, mCopper, false);
      poly(g, [[2.4, 15, 0], [2.4, 37, 0]], 0.38, mCopper, false);
      poly(g, [[8.0, 10.5, 0], [2.4, 15, 0]], 0.38, mCopper, false);
      poly(g, [[-2.4, 37, 0], f0], 0.2, mSteel, false);
      poly(g, [[2.4, 37, 0], f1], 0.2, mSteel, false);
      return { group: g, coil: coil, f0: f0, f1: f1, glass: gl };
    }

    function buildLed() {
      var g = new THREE.Group(), m;
      m = new THREE.Mesh(geoShellFull, mShell); m.castShadow = true; g.add(m);
      m = new THREE.Mesh(new THREE.CylinderGeometry(7.4, 7.4, 2.2, 32), mBlack); m.position.set(0, 3.3, 0); g.add(m);
      m = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 2.6, 5.8, 20), mBrass); m.position.set(0, 1.7, 0); g.add(m);
      var body = [[7.6, 20.5], [8.2, 23]], y;
      for (y = 24; y <= 33; y += 0.6) body.push([8.6 + (y - 24) * 0.33 + 0.45 * Math.sin((y - 24) / 1.8 * TAU), y]);
      body.push([11.5, 33.4]);
      m = new THREE.Mesh(lathe(body, 48), K.mat.aluminium({ side: THREE.DoubleSide, roughness: 0.4 })); m.castShadow = true; g.add(m);
      var domeMat = new THREE.MeshPhysicalMaterial({ color: 0xF4F2EC, roughness: 0.55, metalness: 0, transparent: true, opacity: 0.8, emissive: 0xFFE2B0, emissiveIntensity: 0, side: THREE.DoubleSide, depthWrite: false });
      var dome = new THREE.Mesh(lathe([[11.5, 33.4], [13.4, 38], [14.3, 44], [14.3, 49], [13.4, 55], [11, 60], [7.5, 63], [3, 64.6], [0, 65]], 56), domeMat);
      dome.castShadow = true; dome.renderOrder = 6; g.add(dome);
      /* yarı saydam kubbenin içinde küçük kart: LED çipleri tek tek çizilmez */
      m = new THREE.Mesh(new THREE.CylinderGeometry(4.6, 4.6, 0.8, 24), mBlack); m.position.set(0, 36, 0); g.add(m);
      return { group: g, dome: domeMat };
    }

    /* ---------- sahne grupları ---------- */
    var gLamba = new THREE.Group(), gTel = new THREE.Group(), gLat = new THREE.Group(), gCmp = new THREE.Group();
    v.scene.add(gLamba); v.scene.add(gTel); v.scene.add(gLat); v.scene.add(gCmp);

    /* -- lamba: kesit -- */
    var bulbA = buildBulb(true, filSmall);
    gLamba.add(bulbA.group);
    var CABLE_Y = -9;
    poly(gLamba, [[0, -1, 0], [0, CABLE_Y, 0]], 0.6, mCopper, false);
    poly(gLamba, [[8.4, 10.5, 0], [16, 10.5, 0], [16, CABLE_Y, 0]], 0.6, mCopper, false);
    (function () {
      var m;
      m = new THREE.Mesh(new THREE.CylinderGeometry(1.25, 1.25, 7.4, 14, 1, true), mInsul); m.position.set(0, -5.4, 0); gLamba.add(m);
      m = new THREE.Mesh(new THREE.CylinderGeometry(1.25, 1.25, 19.5, 14, 1, true), mInsul); m.position.set(16, 0.25, 0); gLamba.add(m);
      m = new THREE.Mesh(new THREE.CylinderGeometry(1.25, 1.25, 6.6, 14, 1, true), mInsul); m.rotation.z = Math.PI / 2; m.position.set(12.2, 10.5, 0); gLamba.add(m);
    })();
    var gasLight = new THREE.PointLight(0xFFC27A, 0, 120, 1.4);
    gasLight.position.set(0, 47, 6);
    gLamba.add(gasLight);
    var gasPool = K.instanced(34, { radius: 0.3, material: new THREE.MeshBasicMaterial({ color: 0x7F93AB, transparent: true, opacity: 0.8 }) });
    gLamba.add(gasPool);
    var rngG = K.rng(7), gasSeed = [];
    (function () {
      var i;
      for (i = 0; i < 34; i++) {
        var a = rngG() * TAU, b = Math.acos(2 * rngG() - 1), rr = 0.35 + 0.65 * Math.cbrt(rngG());
        gasSeed.push({ x: rr * 9.2 * Math.sin(b) * Math.cos(a), y: 45 + rr * 11.5 * Math.cos(b) + 0, z: rr * 9.2 * Math.sin(b) * Math.sin(a), p: rngG() * TAU, q: rngG() * TAU, w: 0.6 + rngG() * 0.8 });
      }
    })();
    var poolLamba = K.instanced(30, { radius: 0.62, material: K.mat.electron(dark) });
    gLamba.add(poolLamba);
    var pathLamba = (function () {
      var pts = [[0, -9, 0, 1], [0, 4.4, 0, 1], [-2.4, 10, 0, 1], [-2.4, 37, 0, 1], [bulbA.f0[0], bulbA.f0[1], bulbA.f0[2], 0.5]];
      var n = 90, i;
      for (i = 1; i < n; i++) {
        var p = bulbA.coil.curve.getPoint(i / n);
        pts.push([p.x, p.y + 47, p.z, 0.5]);
      }
      pts.push([bulbA.f1[0], bulbA.f1[1], bulbA.f1[2], 0.5]);
      pts.push([2.4, 37, 0, 1]); pts.push([2.4, 15, 0, 1]); pts.push([8.0, 10.5, 0, 1]); pts.push([16, 10.5, 0, 1]); pts.push([16, CABLE_Y, 0, 1]);
      return mkPath(pts);
    })();

    /* -- tel: iri filaman, kalın kablo -- */
    var COIL = { len: 44, R2: 4.0, r1: 1.5 };
    var coilBig = coilMesh(COIL.len, COIL.R2, COIL.r1, 7, 70, 0.5, 1100, filBig);
    gTel.add(coilBig);
    var cb0 = coilBig.curve.getPoint(0), cb1 = coilBig.curve.getPoint(1);
    var gThick = new THREE.Group(); gTel.add(gThick);
    (function () {
      var L = [-52, cb0.x - 4], R = [cb1.x + 4, 52], m;
      m = new THREE.Mesh(new THREE.CylinderGeometry(3, 3, L[1] - L[0], 24), mCopperT); m.rotation.z = Math.PI / 2; m.position.set((L[0] + L[1]) / 2, cb0.y, cb0.z); gThick.add(m);
      m = new THREE.Mesh(new THREE.CylinderGeometry(3, 3, R[1] - R[0], 24), mCopperT); m.rotation.z = Math.PI / 2; m.position.set((R[0] + R[1]) / 2, cb1.y, cb1.z); gThick.add(m);
      m = new THREE.Mesh(new THREE.CylinderGeometry(3, 0.5, 4, 24), mCopperT); m.rotation.z = Math.PI / 2; m.position.set(cb0.x - 2, cb0.y, cb0.z); gThick.add(m);
      m = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 3, 4, 24), mCopperT); m.rotation.z = Math.PI / 2; m.position.set(cb1.x + 2, cb1.y, cb1.z); gThick.add(m);
    })();
    var poolTel = K.instanced(44, { radius: 0.95, material: K.mat.electron(dark) });
    gTel.add(poolTel);
    var pathTel = (function () {
      var pts = [[-52, cb0.y, cb0.z, 1], [cb0.x - 4, cb0.y, cb0.z, 1], [cb0.x, cb0.y, cb0.z, 0.55]];
      var n = 160, i;
      for (i = 1; i < n; i++) { var p = coilBig.curve.getPoint(i / n); pts.push([p.x, p.y, p.z, 0.55]); }
      pts.push([cb1.x, cb1.y, cb1.z, 0.55]); pts.push([cb1.x + 4, cb1.y, cb1.z, 1]); pts.push([52, cb1.y, cb1.z, 1]);
      return mkPath(pts);
    })();

    /* -- çarpışma: kafes -- */
    var NX = 9, NY = 4, NZ = 2, SP = 6.6, RI = 1.55, RE = 0.75;
    var NION = NX * NY * NZ;
    var mIon = K.mat.std(0xFFFFFF, 0.38, 0.55, { envMapIntensity: 0.8 });
    var ions = K.instanced(NION, { radius: RI, detail: 3, material: mIon, castShadow: true });
    gLat.add(ions);
    var ionSeed = [], ionCur = [], ionPulse = [], ii, jj, kk;
    var rngI = K.rng(31);
    function ionBase(i, j, k) { return [(i - (NX - 1) / 2) * SP, (j - (NY - 1) / 2) * SP, (k - (NZ - 1) / 2) * SP]; }
    function ionIdx(i, j, k) { return (i * NY + j) * NZ + k; }
    for (ii = 0; ii < NX; ii++) for (jj = 0; jj < NY; jj++) for (kk = 0; kk < NZ; kk++) {
      ionSeed.push({ b: ionBase(ii, jj, kk), p: [rngI() * TAU, rngI() * TAU, rngI() * TAU], w: 5.2 + rngI() * 2.6 });
      ionCur.push([0, 0, 0]); ionPulse.push(0);
    }
    var colGrey = new THREE.Color(0x9AA0AB), colWarm = new THREE.Color(0xE9955A), colTmp = new THREE.Color();
    ions.setColorAt(0, colGrey);
    var NEL = 22;
    var poolEl = K.instanced(NEL, { radius: RE, detail: 2, material: K.mat.electron(dark) });
    gLat.add(poolEl);
    var rngE = K.rng(5);
    var els = [];
    function respawn(e) {
      e.ti = Math.floor(rngE() * NX); e.tj = Math.floor(rngE() * NY); e.tk = Math.floor(rngE() * NZ);
      var b = ionBase(e.ti, e.tj, e.tk), a = rngE() * TAU;
      e.x = b[0] - 4.2; e.y = b[1] + Math.sin(a) * 2.6; e.z = b[2] + Math.cos(a) * 2.6;
    }
    for (ii = 0; ii < NEL; ii++) { var e0 = {}; respawn(e0); els.push(e0); }
    var arrowGeo = new THREE.ConeGeometry(0.55, 2.0, 8); arrowGeo.translate(0, 1.0, 0);
    var mArrow = K.mat.std(0xC8693A, 0.4, 0.1, { emissive: 0x8A3E16, emissiveIntensity: 0.5 });
    var arrows = [], yAxis = new THREE.Vector3(0, 1, 0);
    for (ii = 0; ii < 26; ii++) {
      var am = new THREE.Mesh(arrowGeo, mArrow); am.visible = false; gLat.add(am);
      arrows.push({ m: am, age: 9, life: 1.1, d: new THREE.Vector3(), p: new THREE.Vector3() });
    }
    var rngA = K.rng(77);
    function spawnArrow(c) {
      var k;
      for (k = 0; k < arrows.length; k++) if (arrows[k].age >= arrows[k].life) {
        var A = arrows[k];
        A.d.set(rngA() - 0.5, rngA() - 0.35, rngA() - 0.3).normalize();
        A.p.set(c[0], c[1], c[2]).addScaledVector(A.d, RI + 0.2);
        A.age = 0; A.life = 0.9 + rngA() * 0.5;
        A.m.quaternion.setFromUnitVectors(yAxis, A.d);
        return;
      }
    }

    /* -- karşılaştırma -- */
    var bulbC = buildBulb(false, filCmp, true);
    var led = buildLed();
    bulbC.group.position.set(-27, 0, 0); led.group.position.set(27, 0, 0);
    bulbC.group.scale.setScalar(0.94); led.group.scale.setScalar(0.94);
    gCmp.add(bulbC.group); gCmp.add(led.group);
    var catcher = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), new THREE.ShadowMaterial({ opacity: 0.13 }));
    catcher.rotation.x = -Math.PI / 2; catcher.position.y = -0.4; catcher.receiveShadow = true;
    gCmp.add(catcher);
    var cmpLight = new THREE.PointLight(0xFFC27A, 0, 120, 1.4); cmpLight.position.set(-27, 44, 8); gCmp.add(cmpLight);
    var cmpLightL = new THREE.PointLight(0xFFE6BF, 0, 120, 1.4); cmpLightL.position.set(27, 44, 8); gCmp.add(cmpLightL);

    /* ---------- durum ---------- */
    var auto = true, view = 'lamba', vt = 0, lastT = 0;
    var voltPinned = null, volt = 230, flow = 0, hueClock = 0;
    var tmpP = [0, 0, 0, 0];
    var lastLam = 30, lastTel = 44;

    function voltTarget() {
      if (voltPinned !== null) return voltPinned;
      if (view === 'renk') {
        if (vt < 1.6) return 0;
        if (vt < 3.6) return 50;
        if (vt < 5.6) return 120;
        return 230;
      }
      if (view === 'carpisma') return Math.round((140 + 90 * Math.sin(vt * 0.85 - 0.6)) / 5) * 5;
      return 230;
    }

    /* ---------- etiketler ---------- */
    var allLabels = [];
    function mk(text, anchor, o) {
      o = o || {};
      var vec = new THREE.Vector3();
      var lb = v.label(text, { cls: 'plain chip', html: !!o.html, align: o.align || 'center', line: o.line !== false, dx: o.dx || 0, dy: o.dy || 0 });
      lb.at = function () { anchor(vec); return vec; };
      lb.el.style.fontSize = (o.size || 13) + 'px';
      lb.el.style.fontWeight = '500';
      lb.el.style.color = dark ? '#E6E9EF' : '#262A33';
      lb.show(false);
      lb.view = o.view;
      allLabels.push(lb);
      return lb;
    }
    mk('cam balon', function (p) { p.set(-13.9, 48, 0); }, { view: 'lamba', align: 'right', dx: -34, dy: -12 });
    mk('gaz dolgusu: argon-azot gazı', function (p) { p.set(-7, 54, 3); }, { view: 'lamba', align: 'right', dx: -72, dy: -26 });
    mk('destek teli', function (p) { p.set(-4.7, 42, 0); }, { view: 'lamba', align: 'right', dx: -84, dy: 12 });
    mk('besleme teli', function (p) { p.set(-2.4, 29, 0); }, { view: 'lamba', align: 'right', dx: -97, dy: -4 });
    mk('filaman: ince tungsten tel', function (p) { p.set(6.5, 48, 0); }, { view: 'lamba', align: 'left', dx: 65, dy: -32 });
    mk('cam ayak', function (p) { p.set(2.9, 30, 0); }, { view: 'lamba', align: 'left', dx: 84, dy: 0 });
    mk('vida yanı (kontak)', function (p) { p.set(-8.3, 14, 4); }, { view: 'lamba', align: 'right', dx: -65, dy: -10 });
    mk('kontak ucu', function (p) { p.set(-2.2, -0.5, 1); }, { view: 'lamba', align: 'right', dx: -98, dy: -8 });
    mk('kalın bakır kablo: ısınmaz', function (p) { p.set(16, -5, 0); }, { view: 'lamba', align: 'left', dx: 20, dy: -28 });
    mk('kalın kablo', function (p) { p.set(-38, cb0.y + 3, 0); }, { view: 'tel', align: 'center', dx: 0, dy: -40 });
    mk('ince tel: aynı akım, dar yol', function (p) { p.set(0, 7.5, 3); }, { view: 'tel', align: 'center', dx: 0, dy: -52 });
    mk('bükülü bükülü tel', function (p) { p.set(10, -6, 0); }, { view: 'tel', align: 'center', dx: 40, dy: 44 });
    mk('kalın kablo', function (p) { p.set(38, cb1.y + 3, 0); }, { view: 'tel', align: 'center', dx: 0, dy: -40 });

    function setLabels() { allLabels.forEach(function (l) { l.show(l.view === view); }); }

    /* ---------- görünüm geçişi ---------- */
    function applyGroups() {
      gLamba.visible = view === 'lamba';
      gTel.visible = view === 'tel' || view === 'renk';
      gThick.visible = view === 'tel'; poolTel.visible = view === 'tel';
      gLat.visible = view === 'carpisma';
      gCmp.visible = view === 'karsilastir';
      setLabels();
    }
    function goView(name) {
      view = name; vt = 0;
      var c = CAM[name];
      v.setView({ yaw: c.yaw - 0.16, pitch: c.pitch + 0.05, distance: c.distance * 1.16, target: c.target });
      v.animateTo({ yaw: c.yaw, pitch: c.pitch, distance: c.distance, target: c.target }, K.reducedMotion ? 0.01 : 1.4);
      coilBig.position.set(0, 0, 0);
      applyGroups();
    }
    function reset() {
      auto = true; voltPinned = null; volt = 230; flow = 0; view = 'lamba'; vt = 0;
      var c = CAM.lamba;
      v.setView({ yaw: c.yaw, pitch: c.pitch, distance: c.distance, target: c.target });
      lastLam = lastTel = 60;
      applyGroups();
    }
    reset();

    /* ---------- 2B katman ---------- */
    function chip(ctx, x, y, w, h) {
      ctx.save();
      ctx.fillStyle = dark ? 'rgba(14,18,26,.88)' : 'rgba(255,255,255,.92)';
      ctx.strokeStyle = dark ? '#262D3B' : '#E3E3DD';
      ctx.lineWidth = 1;
      K.rr(ctx, x, y, w, h, 6);
      ctx.fill(); ctx.stroke();
      ctx.restore();
    }
    function wrapLines(ctx, text, maxW, font) {
      ctx.save(); ctx.font = font;
      var words = text.split(' '), lines = [], cur = '', i;
      for (i = 0; i < words.length; i++) {
        var tst = cur ? cur + ' ' + words[i] : words[i];
        if (ctx.measureText(tst).width > maxW && cur) { lines.push(cur); cur = words[i]; } else cur = tst;
      }
      if (cur) lines.push(cur);
      ctx.restore();
      return lines;
    }
    var INK = dark ? '#E6E9EF' : '#262A33', MUTED = dark ? K.palette.onNightMuted : '#595E69';
    function note(ctx, label, text, x, y, w) {
      var lines = wrapLines(ctx, label + ' ' + text, w - 20, K.font(13, 500));
      var h = 12 + lines.length * 17;
      chip(ctx, x, y, w, h);
      lines.forEach(function (ln, i) {
        if (i === 0) {
          K.label(ctx, label, x + 10, y + 12 + 12, { size: 13, weight: 700, color: K.palette.copper });
          ctx.save(); ctx.font = K.font(13, 700);
          var lw = ctx.measureText(label + ' ').width; ctx.restore();
          K.label(ctx, ln.slice(label.length + 1), x + 10 + lw, y + 24, { size: 13, weight: 500, color: INK });
        } else K.label(ctx, ln, x + 10, y + 24 + i * 17, { size: 13, weight: 500, color: INK });
      });
      return h;
    }
    function wavy(ctx, x, y, len, phase, color, w) {
      ctx.save();
      ctx.strokeStyle = color; ctx.lineWidth = w; ctx.lineCap = 'round';
      ctx.beginPath();
      var s;
      for (s = 0; s <= len; s += 3) {
        var px = x + Math.sin(s * 0.16 + phase) * 4 * Math.min(1, s / 14), py = y - s;
        if (s === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.stroke();
      ctx.restore();
    }
    function glowAt(p, hex, r, a) {
      if (a <= 0.01) return;
      K.drawGlow(v.ctx, hex, p.x, p.y, r, a);
    }

    function overlay(T, L, t) {
      var ctx = v.ctx, W = v.w, H = v.h;
      var fade = K.reducedMotion ? 1 : sm(vt / 0.45);
      ctx.save();
      ctx.globalAlpha = fade;
      var P;
      if (view === 'lamba') {
        var c = colorForT(T);
        if (c.i > 0) {
          P = v.project(new THREE.Vector3(0, 47, 0));
          var a = clamp((T - 500) / 2000, 0, 1);
          glowAt(P, '#F2C46B', 52 + 30 * a, 0.12 + 0.3 * a);
          glowAt(P, '#FFF1CC', 22 + 10 * a, 0.3 * a);
        }
        K.label(ctx, '60 W ÷ 230 V ≈ 0,26 A', 14, 24, { size: 14, weight: 600, mono: true, color: INK });
        K.label(ctx, 'sıcakken R = 230 ÷ 0,26 ≈ 880 Ω', 14, 44, { size: 13, weight: 500, mono: true, color: MUTED });
        var h1 = note(ctx, 'ömür:', 'tungsten yavaş yavaş buharlaşır, tel incelir. En ince yer en çok ısınır ve sonunda kopar.', 14, 420, W - 28);
        note(ctx, 'açılış:', 'soğukken direnç yaklaşık 10 kat küçüktür, akım ilk anda büyüktür; bu yüzden çoğu kez açarken yanar.', 14, 420 + h1 + 6, W - 28);
      } else if (view === 'tel') {
        K.label(ctx, 'aynı akım', W / 2, 322, { size: 15, weight: 700, color: K.palette.blue, align: 'center' });
        var cy = 380, rx = [170, 510], rad = [38, 10], names = ['kalın bakır kablo', 'ince tungsten tel'];
        var texts = [['geniş kesit: elektronlar rahat geçer', 'direnç küçük → ısınmaz'], ['dar kesit: elektronlar sıkışır', 'direnç büyük → ısınır']];
        var q, n;
        for (q = 0; q < 2; q++) {
          ctx.save();
          ctx.beginPath(); ctx.arc(rx[q], cy, rad[q], 0, TAU);
          ctx.fillStyle = q === 0 ? K.rgba(K.palette.copperFill, 0.35) : cssColor(Math.max(T, 520), 0.6);
          ctx.fill();
          ctx.lineWidth = 2; ctx.strokeStyle = q === 0 ? K.palette.copper : '#4B4F57'; ctx.stroke();
          ctx.restore();
          for (n = 0; n < 7; n++) {
            var ang = n * 2.4 + t * (0.5 + 0.12 * n) * (q ? 2.2 : 1) + q, rr = (rad[q] - 5) * Math.sqrt(((n * 0.37 + 0.13) % 1)) * 0.95;
            var ex = rx[q] + Math.cos(ang) * rr + Math.sin(t * 5 + n) * (q ? 0.6 : 1.2), ey = cy + Math.sin(ang) * rr + Math.cos(t * 4.3 + n) * (q ? 0.6 : 1.2);
            K.drawSphere(ctx, '#2848C8', ex, ey, q ? 2.7 : 4, 1);
          }
          K.label(ctx, names[q], rx[q], cy - rad[q] - 12, { size: 14, weight: 700, color: INK, align: 'center' });
          K.label(ctx, texts[q][0], rx[q], 440 + (q ? 0 : 0), { size: 13, weight: 500, color: INK, align: 'center' });
          K.label(ctx, texts[q][1], rx[q], 458, { size: 13, weight: 700, color: q ? K.palette.copper : MUTED, align: 'center' });
        }
        K.label(ctx, '→', 340, cy + 5, { size: 22, weight: 500, color: MUTED, align: 'center' });
        K.label(ctx, 'kesit alanı yaklaşık 14 kat küçük', 340, cy + 28, { size: 12.5, weight: 500, color: MUTED, align: 'center' });
        K.label(ctx, 'tel de uzundur: uzun ve dar yol = büyük direnç', 340, 488, { size: 13.5, weight: 600, color: INK, align: 'center' });
        if (T > 500) { P = v.project(new THREE.Vector3(0, 0, 0)); glowAt(P, '#F2C46B', 150, 0.1 * clamp((T - 500) / 2000, 0, 1)); }
      } else if (view === 'carpisma') {
        /* gösterge: akım */
        var bx = W - 190, by = 30;
        K.label(ctx, 'akım', bx, by - 8, { size: 13, weight: 600, color: INK });
        ctx.fillStyle = dark ? '#262D3B' : '#E3E3DD'; ctx.fillRect(bx, by, 160, 8);
        ctx.fillStyle = K.palette.blue; ctx.fillRect(bx, by, 160 * clamp(Math.pow(L, 0.6), 0, 1), 8);
        K.label(ctx, K.num(Math.round(volt)) + ' V · ' + fmtTemp(T), bx, by + 28, { size: 13, weight: 600, mono: true, color: INK });
        /* gösterge anahtarı */
        K.drawSphere(ctx, '#2848C8', 24, 28, 5, 1);
        K.label(ctx, 'elektron (yavaşlatılmış)', 36, 33, { size: 13, weight: 500, color: INK });
        K.drawSphere(ctx, '#9AA0AB', 24, 52, 7, 1);
        K.label(ctx, 'tungsten iyonu: yerinde titreşir', 36, 57, { size: 13, weight: 500, color: INK });
        ctx.fillStyle = K.palette.copperFill;
        ctx.beginPath(); ctx.moveTo(24, 70); ctx.lineTo(19, 82); ctx.lineTo(29, 82); ctx.closePath(); ctx.fill();
        K.label(ctx, 'ısı', 36, 82, { size: 13, weight: 500, color: INK });
        chip(ctx, 14, H - 78, W - 28, 52);
        K.label(ctx, 'çarpışma: elektronun enerjisi ısıya dönüşür', W / 2, H - 56, { size: 16, weight: 700, color: INK, align: 'center' });
        K.label(ctx, 'akım artınca elektron daha çok çarpar, iyonlar daha şiddetli titreşir', W / 2, H - 36, { size: 13, weight: 500, color: MUTED, align: 'center' });
      } else if (view === 'renk') {
        var x0 = 40, x1 = W - 40, sw = x1 - x0, TMAX = 3500, ys = 292, hs = 22;
        function tx(Tc) { return x0 + sw * Tc / TMAX; }
        K.label(ctx, K.num(Math.round(volt)) + ' V  →  ' + fmtTemp(T) + ' · ' + colourName(T), x0, 270, { size: 16, weight: 700, mono: true, color: INK });
        var px;
        for (px = 0; px < sw; px += 2) {
          var Tc = px / sw * TMAX;
          ctx.fillStyle = Tc < 460 ? (dark ? '#3A404C' : '#B8BCC6') : cssColor(Tc, 1);
          ctx.fillRect(x0 + px, ys, 2.5, hs);
        }
        ctx.strokeStyle = dark ? '#262D3B' : '#9AA0AB'; ctx.lineWidth = 1; ctx.strokeRect(x0 - 0.5, ys - 0.5, sw + 1, hs + 1);
        var marks = [[20, 'soğuk', 'görünmez', 'left'], [700, '700 °C', 'koyu kırmızı', 'center'], [1500, '1.500 °C', 'turuncu', 'center'], [2500, '2.500 °C', 'sarımsı beyaz', 'center'], [3422, '3.422 °C', 'tungsten erir', 'right']];
        marks.forEach(function (m, i) {
          var mx = i === 0 ? x0 : tx(m[0]);
          ctx.strokeStyle = INK; ctx.lineWidth = 1.2;
          ctx.beginPath(); ctx.moveTo(mx, ys + hs); ctx.lineTo(mx, ys + hs + 6); ctx.stroke();
          var al = m[3] === 'right' ? 'right' : m[3] === 'left' ? 'left' : 'center';
          var lx = i === 4 ? x1 + 4 : mx;
          K.label(ctx, m[1], lx, ys + hs + 22, { size: 13, weight: 700, color: i === 4 ? K.palette.copper : INK, align: al, mono: true });
          K.label(ctx, m[2], lx, ys + hs + 38, { size: 13, weight: 500, color: i === 4 ? K.palette.copper : MUTED, align: al });
        });
        var mxk = x0 + sw * clamp(T, 0, TMAX) / TMAX;
        ctx.fillStyle = INK;
        ctx.beginPath(); ctx.moveTo(mxk, ys - 2); ctx.lineTo(mxk - 6, ys - 12); ctx.lineTo(mxk + 6, ys - 12); ctx.closePath(); ctx.fill();
        /* enerji bölünmesi */
        var yb = 420, fr = T >= 2400 ? 0.05 : T >= 500 ? 0.05 * Math.pow(clamp((T - 500) / 1900, 0, 1), 2) : 0;
        ctx.fillStyle = K.palette.copperFill; ctx.fillRect(x0, yb, sw, 22);
        ctx.fillStyle = '#F2C46B'; ctx.fillRect(x0, yb, Math.max(fr > 0 ? 3 : 0, sw * fr), 22);
        K.label(ctx, 'ısı (çoğu kızılötesi, gözle görünmez)', x0 + 40, yb + 16, { size: 13, weight: 600, color: '#FFFFFF' });
        K.label(ctx, T >= 2400 ? 'ışık ≈ %5' : T >= 500 ? 'ışık: %5’ten az' : 'ışık yok', x0, yb - 8, { size: 13, weight: 700, color: INK });
        K.label(ctx, 'enerjinin yaklaşık %5’i görünür ışık, geri kalanı ısı', W / 2, yb + 48, { size: 14, weight: 600, color: INK, align: 'center' });
      } else if (view === 'karsilastir') {
        var PA = v.project(new THREE.Vector3(-27, 47, 0)), PL = v.project(new THREE.Vector3(27, 47, 0));
        var ph = t * 3;
        glowAt(PA, '#F2C46B', 70, 0.28); glowAt(PL, '#F2C46B', 70, 0.28);
        glowAt(PA, '#D9602B', 150, 0.2); glowAt(PL, '#F0B27A', 70, 0.05);
        var wi;
        var TA = v.project(new THREE.Vector3(-27, 60, 0)), TL = v.project(new THREE.Vector3(27, 62, 0));
        for (wi = 0; wi < 5; wi++) wavy(ctx, TA.x - 40 + wi * 20, TA.y - 2, 16 + (wi % 2) * 6, ph + wi * 1.3, K.rgba('#B8431A', 0.75), 2.2);
        wavy(ctx, TL.x, TL.y - 4, 10, ph, K.rgba('#B8431A', 0.55), 1.8);
        K.label(ctx, 'AKKOR · sıcak', PA.x, 16, { size: 12.5, weight: 700, mono: true, spacing: 1, color: K.palette.copper, align: 'center' });
        K.label(ctx, 'LED · ılık', PL.x, 16, { size: 12.5, weight: 700, mono: true, spacing: 1, color: MUTED, align: 'center' });
        /* enerji çubukları (7 px = 1 W) */
        var bx0 = 22, k = 7, rows = [[60, 3, 384, 'akkor lamba 60 W', 'ışık ≈ 3 W + ısı ≈ 57 W'], [9, 3, 434, 'LED lamba 9 W', 'ışık ≈ 3 W + ısı ≈ 6 W']];
        rows.forEach(function (r) {
          var wTot = r[0] * k;
          K.label(ctx, r[3], bx0, r[2] - 6, { size: 13.5, weight: 700, color: INK });
          ctx.fillStyle = K.palette.copperFill; ctx.fillRect(bx0, r[2], wTot, 16);
          ctx.fillStyle = '#F2C46B'; ctx.fillRect(bx0, r[2], r[1] * k, 16);
          K.label(ctx, r[4], bx0 + wTot + 10, r[2] + 13, { size: 13, weight: 500, color: INK });
        });
        ctx.fillStyle = '#F2C46B'; ctx.fillRect(bx0, 466, 12, 12);
        K.label(ctx, 'ışık', bx0 + 18, 477, { size: 13, weight: 500, color: INK });
        ctx.fillStyle = K.palette.copperFill; ctx.fillRect(bx0 + 62, 466, 12, 12);
        K.label(ctx, 'ısı', bx0 + 80, 477, { size: 13, weight: 500, color: INK });
        K.label(ctx, 'aynı ışık için 60 W ve 9 W: 60 ÷ 9 ≈ 6,7 kat', bx0 + 150, 477, { size: 14.5, weight: 700, color: INK });
      }
      ctx.restore();
      K.label(ctx, 'ölçekli değil · basitleştirilmiş model', W - 14, H - 9, { mono: true, size: 12, weight: 500, spacing: 0.6, color: MUTED, align: 'right' });
    }

    /* ---------- kare ---------- */
    function placeDots(pool, last, n, P, flowS, scaleBase) {
      var i;
      for (i = 0; i < n; i++) {
        var s = (((i / n) * P.len + flowS) % P.len + P.len) % P.len;
        pathAt(P, s, tmpP);
        var sc = scaleBase * tmpP[3] * sm(s / 3) * sm((P.len - s) / 3);
        pool.setAt(i, tmpP[0], tmpP[1], tmpP[2], sc);
      }
      for (i = n; i < last; i++) pool.hideAt(i);
      pool.commit();
    }

    function updateLattice(t, dt, L) {
      var A = 0.18 + 1.45 * L, fw = 1 + 0.9 * L, i, j, e;
      for (i = 0; i < NION; i++) {
        var S = ionSeed[i], c = ionCur[i];
        c[0] = S.b[0] + A * Math.sin(t * S.w * fw + S.p[0]);
        c[1] = S.b[1] + A * Math.sin(t * S.w * 1.13 * fw + S.p[1]);
        c[2] = S.b[2] + A * Math.sin(t * S.w * 0.91 * fw + S.p[2]);
        ionPulse[i] = Math.max(0, ionPulse[i] - dt * 2.2);
        var heat = clamp(0.5 * Math.pow(L, 1.4) + ionPulse[i] * 0.6, 0, 1);
        colTmp.copy(colGrey).lerp(colWarm, heat);
        ions.setColorAt(i, colTmp);
        ions.setAt(i, c[0], c[1], c[2], 1 + 0.22 * ionPulse[i]);
      }
      ions.commit(); ions.instanceColor.needsUpdate = true;
      var spd = (L > 0.001 ? 4.5 + 9 * L : 0) * (K.reducedMotion ? 0 : 1);
      for (j = 0; j < NEL; j++) {
        e = els[j];
        var ti = ionIdx(e.ti, e.tj, e.tk), tc = ionCur[ti];
        var dx = tc[0] - e.x, dy = tc[1] - e.y, dz = tc[2] - e.z, d = Math.sqrt(dx * dx + dy * dy + dz * dz);
        if (d <= RI + RE + 0.05) {
          if (spd > 0) {
            ionPulse[ti] = 1;
            if (rngA() < 0.16) spawnArrow(tc);
            var r = rngE(), di = r < 0.58 ? 1 : r < 0.72 ? -1 : 0, dj = 0, dk = 0;
            if (di === 0 || rngE() < 0.45) { if (rngE() < 0.5) dj = rngE() < 0.5 ? 1 : -1; else dk = rngE() < 0.5 ? 1 : -1; }
            var ni = e.ti + di, nj = clamp(e.tj + dj, 0, NY - 1), nk = clamp(e.tk + dk, 0, NZ - 1);
            /* kafesten ayrılma noktası */
            e.x = tc[0] - dx / d * (RI + RE + 0.1); e.y = tc[1] - dy / d * (RI + RE + 0.1); e.z = tc[2] - dz / d * (RI + RE + 0.1);
            if (ni >= NX) {
              var b0 = ionBase(0, nj, nk);
              e.x = b0[0] - 8; e.y = b0[1] + (rngE() - 0.5) * 3; e.z = b0[2] + (rngE() - 0.5) * 3; ni = 0;
            } else if (ni < 0) ni = 0;
            if (ni === e.ti && nj === e.tj && nk === e.tk) nj = (e.tj + 1) % NY;
            e.ti = ni; e.tj = nj; e.tk = nk;
          }
        } else if (spd > 0) {
          var stp = Math.min(d, spd * dt);
          e.x += dx / d * stp; e.y += dy / d * stp; e.z += dz / d * stp;
        }
        poolEl.setAt(j, e.x, e.y, e.z, 1);
      }
      poolEl.commit();
      for (i = 0; i < arrows.length; i++) {
        var Ar = arrows[i];
        if (Ar.age >= Ar.life) { Ar.m.visible = false; continue; }
        Ar.age += dt;
        Ar.m.visible = Ar.age < Ar.life;
        Ar.m.position.copy(Ar.p).addScaledVector(Ar.d, Ar.age * 7);
        Ar.m.scale.setScalar(Math.max(0.01, Math.sin(Math.PI * clamp(Ar.age / Ar.life, 0, 1))) * 1.1);
      }
    }

    function frame(t, dt) {
      var rm = K.reducedMotion;
      dt = dt || 0.016;
      vt += dt; lastT = t;
      if (auto && !rm) {
        var tot = 0, cyc = 0, i;
        for (i = 0; i < ORDER.length; i++) tot += DUR[ORDER[i]];
        var tt = t % tot;
        for (i = 0; i < ORDER.length; i++) { if (tt < cyc + DUR[ORDER[i]]) break; cyc += DUR[ORDER[i]]; }
        var want = ORDER[Math.min(i, ORDER.length - 1)];
        if (want !== view) { goView(want); vt = tt - cyc; }
      }
      var vtgt = voltTarget();
      volt += (vtgt - volt) * (rm ? 1 : 1 - Math.exp(-dt * 5));
      if (Math.abs(vtgt - volt) < 0.4) volt = vtgt;
      var T = tempOf(volt), L = volt / 230;
      var cur = Math.pow(L, 0.6);
      flow += dt * (rm ? 0 : 7 * cur);
      applyFil(filSmall, T); applyFil(filBig, T); applyFil(filCmp, view === 'karsilastir' ? tempOf(230) : T);
      var lampT = view === 'karsilastir' ? tempOf(230) : T;
      var lv = clamp((lampT - 450) / 2050, 0, 1);

      if (view === 'lamba') {
        gasLight.intensity = 2.2 * Math.pow(lv, 0.8);
        placeDots(poolLamba, lastLam, 30, pathLamba, flow * 2.2 * 0 + flow * 1.3, 1);
        lastLam = 30;
        var gi;
        for (gi = 0; gi < gasSeed.length; gi++) {
          var G = gasSeed[gi], tm = rm ? 0 : t;
          gasPool.setAt(gi, G.x + 0.9 * Math.sin(tm * G.w + G.p), G.y + 0.9 * Math.sin(tm * G.w * 1.1 + G.q), G.z + 0.9 * Math.cos(tm * G.w * 0.9 + G.p), 1);
        }
        gasPool.commit();
      } else if (view === 'tel') {
        placeDots(poolTel, lastTel, 44, pathTel, flow * 2.6, 1);
        lastTel = 44;
      } else if (view === 'carpisma') {
        updateLattice(rm ? 0 : t, dt, L);
      } else if (view === 'karsilastir') {
        cmpLight.intensity = 1.6; cmpLightL.intensity = 1.2;
        led.dome.emissiveIntensity = 0.55;
        applyFil(filCmp, tempOf(230));
      }
      if (view !== 'karsilastir') { cmpLight.intensity = 0; cmpLightL.intensity = 0; }
      if (view !== 'lamba') gasLight.intensity = 0;
      v.render(dt);
      if (!K.skipRender) overlay(T, L, rm ? 0 : t);
    }

    return {
      reset: reset,
      frame: frame,
      set: function (key, val) {
        if (key === 'view' && CAM[val]) { auto = false; if (val !== view) goView(val); else vt = 0; }
        else if (key === 'volt') { auto = false; var n = parseFloat(val); if (!isNaN(n)) voltPinned = clamp(n, 0, 230); }
      },
      read: function (key) {
        if (key === 'view') return view;
        if (key === 'explain') return EXPLAIN[view];
        if (key === 'temp') return fmtTemp(tempOf(volt));
        if (key === 'volt') return Math.round(voltTarget()) + ' V';
        return '';
      }
    };
  });
})();
