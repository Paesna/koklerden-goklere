/* Köklerden Göklere · Builder R · PCB'deki toprak katmanı
 *
 * Kayıtlı görseller:
 *   ground-plane   (S 680×520)   GND katmanı: katmanlar, dönüş akımı, ortak sıfır, gürültü halkası
 *
 * set('view', 'plan' | 'donus' | 'ortak' | 'gurultu')   (ilk set() otomatik gösteriyi durdurur)
 * set('plane', 'yok' | 'var')                           (yalnız gurultu görünümünde karşılaştırmayı sabitler)
 * read('view')    -> 'plan' | 'donus' | 'ortak' | 'gurultu'
 * read('explain') -> o anki görünümün tek cümlelik açıklaması
 *
 * Dünya birimi = 1 mm gibi çizilir ama ölçekli DEĞİLDİR: bakır katman gerçekte ≈ 35 µm,
 * katmanlar arası ≈ 0,1–0,2 mm; burada okunsun diye büyütüldü.
 */
(function () {
  'use strict';
  var K = window.KGViz;
  if (!K) return;
  var clamp = K.clamp, lerp = K.lerp, EZ = K.ease;
  function TH() { return window.THREE; }
  function sm(x) { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); }

  var EXPLAIN = {
    plan: 'Üç kat: üstte parçalar ve yollar, ortada tek parça GND bakırı, altta yine yollar.',
    donus: 'Akım halka çizer: gidiş üstteki yoldan, dönüş GND katmanından, yolun hemen altından.',
    ortak: 'Üç parçanın GND ayağı aynı katmana bağlı: hepsi gerilimi aynı sıfırdan ölçer.',
    gurultu_yok: 'Katman yok: dönüş teli uzun yoldan dolaşır. Büyük halka gürültü yakalar.',
    gurultu_var: 'Katman var: dönüş yolun hemen altından gider. Küçük halka gürültü yakalamaz.'
  };
  var ORDER = ['plan', 'donus', 'ortak', 'gurultu'];
  var DUR = { plan: 6.5, donus: 8, ortak: 7, gurultu: 11 };

  var CAM = {
    plan: { yaw: 0.52, pitch: 0.46, distance: 188, gap: 14 },
    donus: { yaw: 0.42, pitch: 0.62, distance: 150, gap: 6.5 },
    ortak: { yaw: 0.34, pitch: 0.6, distance: 150, gap: 6.5 },
    gurultu: { yaw: 0.36, pitch: 0.7, distance: 152, gap: 3.6 }
  };

  K.register('ground-plane', function (el, opts) {
    var THREE = TH();
    opts = opts || {};
    var dark = opts.theme === 'dark';
    var v = K.stage3d(el, {
      theme: opts.theme, fov: 26, near: 2, far: 4000, yaw: 0.52, pitch: 0.46, distance: 205,
      target: [10, 14, 0], size: 60, ground: -3.5, minDistance: 90, maxDistance: 420
    });
    if (!v.ready) return { reset: function () {}, frame: function (t, dt) { v.render(dt); }, read: function (k) { return k === 'view' ? 'plan' : EXPLAIN.plan; } };

    var Lr = v.lights;
    if (Lr) {
      Lr.key.intensity *= 0.8; Lr.fill.intensity *= 0.85; Lr.rim.intensity *= 0.9; Lr.hemi.intensity *= 0.75;
      Lr.key.shadow.normalBias = 0.04; if (Lr.ground) Lr.ground.material.opacity = 0.11;
      v.exposure = 0.85;
    }

    var BW = 50, BH = 34, SH = 0.8;
    function dscale() { var a = (v.w || 680) / (v.h || 520); return a > 1.4 ? lerp(1, 0.66, clamp((a - 1.31) / 1.3, 0, 1)) : 1; }
    var TOPY = 0.85;           // dots ride this high above the top surface

    /* ---------- materials ---------- */
    var mMaskTop = K.mat.solderMask({ transparent: true, opacity: 0.85, depthWrite: false, side: THREE.DoubleSide });
    var mMaskBot = K.mat.solderMask({ transparent: true, opacity: 0.85, depthWrite: false, side: THREE.DoubleSide });
    var mFr4 = K.mat.fr4({ transparent: true, opacity: 0.4, depthWrite: false });
    var mPlane = K.mat.copper({ envMapIntensity: 0.6 });
    var mTrace = K.mat.copper({ envMapIntensity: 0.7 });
    var mTin = K.mat.tin({ envMapIntensity: 0.7 });
    var mDark = K.mat.plasticBlack();
    var mCer = K.mat.ceramic();
    var mRed = K.mat.plasticRed();

    function box(w, h, d, mat, x, y, z, cast) {
      var m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
      m.position.set(x, y, z);
      m.castShadow = cast !== false; m.receiveShadow = true;
      return m;
    }
    /* copper trace along a polyline on the layer surface (group y = surface) */
    function trace(group, pts, w) {
      var i;
      for (i = 0; i < pts.length - 1; i++) {
        var a = pts[i], b = pts[i + 1];
        var dx = b[0] - a[0], dz = b[1] - a[1], len = Math.sqrt(dx * dx + dz * dz);
        var m = box(len + w, 0.2, w, mTrace, (a[0] + b[0]) / 2, 0.1, (a[1] + b[1]) / 2, false);
        m.rotation.y = -Math.atan2(dz, dx);
        group.add(m);
      }
    }
    function pad(group, x, z, w, d) { group.add(box(w, 0.24, d || w, mTin, x, 0.12, z, false)); }
    var barrelGeo = new THREE.CylinderGeometry(0.8, 0.8, 1, 16, 1, true);
    var mBarrel = K.mat.copper({ side: THREE.DoubleSide, envMapIntensity: 0.7 });
    var holeGeo = new THREE.CircleGeometry(0.48, 16).rotateX(-Math.PI / 2);
    var mHole = new THREE.MeshBasicMaterial({ color: 0x14161B });
    var ringGeo = new THREE.RingGeometry(0.62, 1.15, 20).rotateX(-Math.PI / 2);
    var mRing = K.mat.tin({ side: THREE.DoubleSide });
    /* a via: plated barrel from the top layer down to the plane; pad + dark drill on top */
    function makeVia(gTopG, x, z) {
      var barrel = new THREE.Mesh(barrelGeo, mBarrel);
      barrel.castShadow = false;
      v.scene.add(barrel);
      var ring = new THREE.Mesh(ringGeo, mRing); ring.position.set(x, 0.27, z);
      var hole = new THREE.Mesh(holeGeo, mHole); hole.position.set(x, 0.29, z);
      gTopG.add(ring); gTopG.add(hole);
      return { x: x, z: z, barrel: barrel, ring: ring, hole: hole };
    }

    /* ---------- the three layers ---------- */
    var gTop = new THREE.Group(), gPlane = new THREE.Group(), gBot = new THREE.Group();
    v.scene.add(gTop); v.scene.add(gPlane); v.scene.add(gBot);

    var topSheet = box(BW, SH, BH, mMaskTop, 0, -SH / 2, 0, false);
    gTop.add(topSheet);
    var botSheet = box(BW, SH, BH, mMaskBot, 0, -SH / 2, 0, false);
    gBot.add(botSheet);
    trace(gBot, [[-18, -8], [-4, -8], [2, 0], [18, 0]], 0.9);
    trace(gBot, [[-12, 10], [10, 10]], 0.9);
    pad(gBot, -18, -8, 1.8); pad(gBot, 18, 0, 1.8); pad(gBot, -12, 10, 1.8); pad(gBot, 10, 10, 1.8);

    var plane = box(BW - 2, 0.6, BH - 2, mPlane, 0, -0.3, 0, true);
    gPlane.add(plane);

    var dielA = box(BW, 0.5, BH, mFr4, 0, 0, 0, false);   // between bottom and plane
    var dielB = box(BW, 0.5, BH, mFr4, 0, 0, 0, false);   // between plane and top
    v.scene.add(dielA); v.scene.add(dielB);

    /* ---------- top layer: signal path (plan, donus, gurultu) ---------- */
    var gSig = new THREE.Group(); gTop.add(gSig);
    var SIG = [[-15.5, -6], [0, -6], [8, 4], [16.8, 4]];
    var GNDPATH = [[21.2, 4], [16.8, 4], [8, 4], [0, -6], [-15.5, -6], [-22.5, -6]];
    trace(gSig, SIG, 0.9);
    pad(gSig, -15.5, -6, 2.0); pad(gSig, 16.8, 4, 2.0);
    pad(gSig, -22.5, -6, 2.4); pad(gSig, 21.2, 4, 2.4);
    gSig.add(box(5, 1.6, 4.4, mDark, -19, 0.8, -6));
    gSig.add(box(3.2, 1.2, 2.4, mCer, 19, 0.6, 4));
    var viaD = [makeVia(gSig, -22.5, -6), makeVia(gSig, 21.2, 4)];
    /* the long way round when there is no plane */
    var wirePts = [[21.2, 0.3, 4], [24, 0.3, 4], [24, 0.3, 14.6], [-24.4, 0.3, 14.6], [-24.4, 0.3, -6], [-22.5, 0.3, -6]];
    var wire = K.wire(wirePts, { radius: 0.3, material: mTrace, tension: 0.05, segments: 90, radial: 8 });
    wire.castShadow = false;
    gSig.add(wire);

    /* ---------- top layer: three components on a rail (ortak) ---------- */
    var gOrt = new THREE.Group(); gTop.add(gOrt);
    var OX = [-14, 0, 14];
    trace(gOrt, [[-21, -8], [21, -8]], 1.0);
    pad(gOrt, -21, -8, 2.2);
    OX.forEach(function (x, i) {
      trace(gOrt, [[x, -8], [x, -1.6]], 0.8);
      pad(gOrt, x, -1.6, 2.0); pad(gOrt, x, 5.6, 2.4);
      if (i === 0) gOrt.add(box(4.4, 1.6, 3.6, mDark, x, 0.8, 2));
      else if (i === 1) gOrt.add(box(2.4, 1.2, 3.4, mCer, x, 0.6, 2));
      else gOrt.add(box(3.0, 1.4, 3.4, mRed, x, 0.7, 2));
    });
    var viaO = OX.map(function (x) { return makeVia(gOrt, x, 5.6); });

    /* ---------- dots ---------- */
    var poolB = K.instanced(180, { radius: 0.78, material: K.mat.electron(dark) });
    var poolC = K.instanced(180, { radius: 0.78, material: new THREE.MeshBasicMaterial({ color: 0x7A3412, transparent: true, depthTest: false, toneMapped: false }) });
    poolC.renderOrder = 10;
    v.scene.add(poolB); v.scene.add(poolC);
    var lastB = 0, lastC = 0;

    /* ---------- state ---------- */
    var auto = true, view = 'plan', lastView = '', vt = 0, pinPlane = null;
    var gap = CAM.plan.gap, gapT = gap, opPlane = 1, opTop = 0.85;
    var yB = 0, yG = gap, yT = 2 * gap;

    function planeState(t) {
      if (pinPlane) return pinPlane;
      return (vt % 10) < 5 ? 'yok' : 'var';
    }

    function loopPts(withPlane, tp) {
      var yt = yT + TOPY, yg = yG + 0.55, p = [];
      p.push([-15.5, yt, -6, 0]); p.push([0, yt, -6, 0]); p.push([8, yt, 4, 0]); p.push([16.8, yt, 4, 0]);
      p.push([21.2, yt, 4, 0]);
      if (withPlane) {
        p.push([21.2, yg, 4, 1]);
        GNDPATH.forEach(function (q, i) { if (i > 0) p.push([q[0], yg, q[1], 1]); });
        p.push([-22.5, yt, -6, 0]);
        p.push([-15.5, yt, -6, 0]);
      } else {
        var wy = yT + 0.7;
        p.push([24, wy, 4, 0]); p.push([24, wy, 14.6, 0]); p.push([-24.4, wy, 14.6, 0]); p.push([-24.4, wy, -6, 0]);
        p.push([-22.5, wy, -6, 0]); p.push([-22.5, yt, -6, 0]); p.push([-15.5, yt, -6, 0]);
      }
      return p;
    }
    function ortakLoops() {
      var yt = yT + TOPY, yg = yG + 0.55;
      return OX.map(function (x) {
        return [[-21, yt, -8, 0], [x, yt, -8, 0], [x, yt, -1.6, 0], [x, yt, 5.6, 0], [x, yg, 5.6, 1], [-21, yg, 5.6, 1]];
      });
    }

    var tmpA = [0, 0, 0];
    function runLoop(pts, n, speed, t, closed) {
      var cum = [0], i;
      for (i = 1; i < pts.length; i++) {
        var dx = pts[i][0] - pts[i - 1][0], dy = pts[i][1] - pts[i - 1][1], dz = pts[i][2] - pts[i - 1][2];
        cum.push(cum[i - 1] + Math.sqrt(dx * dx + dy * dy + dz * dz));
      }
      var len = cum[cum.length - 1];
      return { pts: pts, cum: cum, len: len, n: n, speed: speed, t: t, closed: closed };
    }
    function placeDots(loops) {
      var nb = 0, nc = 0, li, i, j;
      for (li = 0; li < loops.length; li++) {
        var L = loops[li];
        for (i = 0; i < L.n; i++) {
          var s = ((i / L.n) * L.len + L.t * L.speed) % L.len;
          j = 0;
          while (j < L.cum.length - 2 && L.cum[j + 1] < s) j++;
          var seg = L.cum[j + 1] - L.cum[j], u = seg > 0 ? (s - L.cum[j]) / seg : 0;
          var a = L.pts[j], b = L.pts[j + 1];
          var sc = L.closed ? 1 : sm(s / 2.5) * sm((L.len - s) / 2.5);
          var x = lerp(a[0], b[0], u), y = lerp(a[1], b[1], u), z = lerp(a[2], b[2], u);
          if (a[3] === 1 && b[3] === 1 || (a[3] === 1 && u > 0.5)) {
            if (nc < 180) poolC.setAt(nc++, x, y, z, sc);
          } else if (nb < 180) poolB.setAt(nb++, x, y, z, sc);
        }
      }
      for (i = nb; i < lastB; i++) poolB.hideAt(i);
      for (i = nc; i < lastC; i++) poolC.hideAt(i);
      lastB = nb; lastC = nc;
      poolB.commit(); poolC.commit();
    }

    /* ---------- labels ---------- */
    var allLabels = [];
    function mk(text, anchor, o) {
      o = o || {};
      var vec = new THREE.Vector3();
      var lb = v.label(text, { cls: o.cls || 'plain', html: !!o.html, align: o.align || 'center', line: o.line !== false, dx: o.dx || 0, dy: o.dy || 0 });
      lb.at = function () { anchor(vec); return vec; };
      lb.el.style.fontSize = (o.size || 15) + 'px';
      lb.el.style.fontWeight = '500';
      lb.el.style.color = dark ? '#E6E9EF' : '#262A33';
      lb.show(false);
      allLabels.push(lb);
      return lb;
    }
    var lbTop = mk('üst katman:<br>parçalar ve yollar', function (p) { p.set(25, yT - 0.4, 2); }, { html: true, align: 'left', dx: 26, dy: -6 });
    var lbGnd = mk('GND katmanı:<br>tek parça bakır', function (p) { p.set(24, yG - 0.3, 2); }, { html: true, align: 'left', dx: 30, dy: 2 });
    var lbBot = mk('alt katman', function (p) { p.set(25, yB - 0.4, 2); }, { align: 'left', dx: 26, dy: 8 });
    var lbGo = mk('gidiş: üstteki yol', function (p) { p.set(0, yT + 0.4, -6); }, { align: 'center', dx: 0, dy: -46 });
    var lbRet = mk('dönüş yolu: yolun hemen altında', function (p) { p.set(-5, yG, -6); }, { align: 'center', dx: -40, dy: 74 });
    var lbVolt = OX.map(function (x, i) {
      return mk('<b>3,3 V</b> = GND\'ye<br>göre 3,3 V', function (p) { p.set(x, yT + 1.6, 2); }, { html: true, cls: 'chip', size: 15, align: 'center', dx: (i - 1) * 62, dy: i === 1 ? -96 : -50 });
    });
    var lbZero = mk('GND katmanı: ortak sıfır', function (p) { p.set(-22, yG, 12); }, { align: 'center', dx: -8, dy: 40 });
    var lbBig = mk('büyük halka: gürültüyü yakalar/yayar', function (p) { p.set(0, yT, 14.6); }, { align: 'center', dx: 0, dy: 42 });
    var lbWire = mk('dönüş teli: uzun yol', function (p) { p.set(24, yT, 9); }, { align: 'left', dx: 34, dy: 4 });
    var lbSmall = mk('küçük halka: dönüş yolun altında', function (p) { p.set(4, (yT + yG) / 2, -1); }, { align: 'center', dx: 70, dy: -92 });

    function setLabels(vw, ps) {
      lbTop.show(vw === 'plan'); lbGnd.show(vw === 'plan'); lbBot.show(vw === 'plan');
      lbGo.show(vw === 'donus'); lbRet.show(vw === 'donus');
      lbVolt.forEach(function (l) { l.show(vw === 'ortak'); });
      lbZero.show(vw === 'ortak');
      lbBig.show(vw === 'gurultu' && ps === 'yok'); lbWire.show(vw === 'gurultu' && ps === 'yok');
      lbSmall.show(vw === 'gurultu' && ps === 'var');
    }

    /* ---------- view switching ---------- */
    function goView(name) {
      view = name; vt = 0;
      var c = CAM[name];
      v.animateTo({ yaw: c.yaw, pitch: c.pitch, distance: c.distance * dscale(), target: [name === 'plan' ? 10 : 2, c.gap * 1.0 + 1, 0] }, K.reducedMotion ? 0.01 : 1.5);
    }
    function reset() {
      auto = true; pinPlane = null; view = 'plan'; vt = 0; lastView = '';
      gap = gapT = CAM.plan.gap; opPlane = 1; opTop = 0.85;
      v.setView({ yaw: CAM.plan.yaw, pitch: CAM.plan.pitch, distance: CAM.plan.distance * dscale(), target: [10, gap + 1, 0] });
      lastB = lastC = 180;
    }
    reset();

    function layout() {
      yB = 0; yG = gap; yT = 2 * gap;
      gBot.position.y = yB; gPlane.position.y = yG; gTop.position.y = yT;
      dielA.position.y = (yB + yG) / 2 - 0.1; dielB.position.y = (yG + yT) / 2 - 0.1;
      var h = yT - yG, mid = (yT + yG) / 2;
      var vs = viaD.concat(viaO);
      for (var i = 0; i < vs.length; i++) {
        vs[i].barrel.position.set(vs[i].x, mid, vs[i].z);
        vs[i].barrel.scale.y = h;
      }
    }

    function overlay(vw, ps) {
      var ctx = v.ctx;
      var pts, i, P, withPlane;
      if (vw === 'donus' || (vw === 'gurultu')) {
        withPlane = !(vw === 'gurultu' && ps === 'yok');
        pts = loopPts(withPlane);
        var xy = [];
        for (i = 0; i < pts.length; i++) { P = v.project(new THREE.Vector3(pts[i][0], pts[i][1], pts[i][2])); xy.push([P.x, P.y]); }
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(xy[0][0], xy[0][1]);
        for (i = 1; i < xy.length; i++) ctx.lineTo(xy[i][0], xy[i][1]);
        ctx.closePath();
        if (vw === 'gurultu') { ctx.fillStyle = K.rgba(K.palette.blue, withPlane ? 0.22 : 0.13); ctx.fill(); }
        ctx.lineJoin = 'round';
        ctx.lineWidth = 1.6;
        ctx.strokeStyle = vw === 'gurultu' && !withPlane ? K.palette.blue : K.palette.ink;
        ctx.globalAlpha = 0.85;
        ctx.stroke();
        ctx.restore();
      }
      K.label(ctx, 'ölçekli değil · basitleştirilmiş model', v.w - 14, v.h - 14, { mono: true, size: 12, weight: 500, spacing: 0.6, color: dark ? K.palette.onNightMuted : '#595E69', align: 'right' });
      if (vw === 'gurultu') {
        K.label(ctx, ps === 'yok' ? 'GND KATMANI YOK' : 'GND KATMANI VAR', 16, 28, { mono: true, size: 13, weight: 600, spacing: 1.3, color: ps === 'yok' ? K.palette.blue : K.palette.copper });
      }
    }

    return {
      reset: reset,
      set: function (key, val) {
        if (key === 'view' && CAM[val]) { auto = false; if (val !== view) goView(val); else vt = 0; }
        else if (key === 'plane') { auto = false; pinPlane = (val === 'yok' || val === 'var') ? val : null; if (view !== 'gurultu') goView('gurultu'); }
      },
      read: function (key) {
        if (key === 'view') return view;
        if (key === 'explain') return view === 'gurultu' ? EXPLAIN['gurultu_' + planeState()] : EXPLAIN[view];
        return '';
      },
      frame: function (t, dt) {
        var rm = K.reducedMotion;
        vt += dt;
        if (auto && !rm) {
          var cyc = 0, i, tt = t % (DUR.plan + DUR.donus + DUR.ortak + DUR.gurultu);
          for (i = 0; i < 4; i++) { if (tt < cyc + DUR[ORDER[i]]) break; cyc += DUR[ORDER[i]]; }
          var want = ORDER[Math.min(i, 3)];
          if (want !== view) { goView(want); vt = tt - cyc; }
        }
        if (view !== lastView) { lastView = view; }
        var ps = view === 'gurultu' ? planeState() : 'var';
        gapT = CAM[view].gap;
        var k = rm ? 1 : 1 - Math.exp(-dt * 4.2);
        gap += (gapT - gap) * k;
        var opPT = view === 'gurultu' && ps === 'yok' ? 0.12 : 1;
        opPlane += (opPT - opPlane) * k;
        var opTT = view === 'plan' ? 0.85 : 0.14;
        opTop += (opTT - opTop) * k;
        mMaskTop.opacity = opTop; mMaskBot.opacity = view === 'plan' ? 0.85 : 0.3;
        var tr = opPlane < 0.999;
        if (mPlane.transparent !== tr) { mPlane.transparent = tr; mPlane.needsUpdate = true; }
        mPlane.opacity = opPlane;
        mFr4.opacity = view === 'plan' ? 0.4 : 0.07;
        layout();

        var ortak = view === 'ortak';
        gSig.visible = !ortak; gOrt.visible = ortak;
        var noPlane = view === 'gurultu' && ps === 'yok';
        wire.visible = noPlane;
        viaD.forEach(function (x) { x.barrel.visible = !ortak && !noPlane; x.ring.visible = !noPlane; x.hole.visible = !noPlane; });
        viaO.forEach(function (x) { x.barrel.visible = ortak; });

        var loops = [], tdot = rm ? 0 : t;
        if (view === 'donus' || (view === 'gurultu')) loops.push(runLoop(loopPts(!noPlane), noPlane ? 22 : 12, noPlane ? 11 : 9, tdot, true));
        else if (ortak) ortakLoops().forEach(function (p) { loops.push(runLoop(p, 5, 9, tdot + p[1][0] * 0.05, false)); });
        placeDots(loops);

        setLabels(view, ps);
        v.render(dt);
        if (!K.skipRender) overlay(view, ps);
      }
    };
  });
})();
