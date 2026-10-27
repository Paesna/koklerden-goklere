/* Köklerden Göklere · Yapıcı J · Ölçüm ve mantık
 *   ramp-stairs · analog-sensors · adc · switch-yard · logic-gates · half-adder
 *
 * Ortak görsel dil: beyaz lehim maskeli kart, açıkta bakır yollar, mavi
 * elektron noktaları ve akım taşıyan yolda bakır parıltı. Pil, LED, direnç
 * ve anahtarlar Yapıcı G'nin bileşen standardına göre milimetre ölçüsüyle
 * modellenmiştir.
 */
(function () {
  'use strict';
  var K = window.KGViz;
  if (!K) return;
  var P = K.palette;
  var TAU = Math.PI * 2;
  var clamp = K.clamp, lerp = K.lerp;

  function TH() { return window.THREE; }
  function approach(cur, target, rate, dt) { return cur + (target - cur) * (1 - Math.exp(-rate * dt)); }
  function sm(x) { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); }
  function easeIO(x) { return K.ease.inOut(clamp(x, 0, 1)); }

  function child(el, css) {
    var d = document.createElement('div');
    d.style.cssText = 'position:absolute;' + css;
    el.appendChild(d);
    return d;
  }
  function ensureRelative(el) {
    if (window.getComputedStyle(el).position === 'static') el.style.position = 'relative';
  }
  function fontsReady() {
    try { return !document.fonts || document.fonts.check('12px "IBM Plex Mono"'); } catch (e) { return true; }
  }

  /* ------------------------------------------------------------------
   * Geometry helpers
   * ------------------------------------------------------------------ */

  /* Rounded box whose size can change without distorting the bevel. */
  function rboxCore(seg) {
    var THREE = TH();
    var S = seg * 2 + 1;
    var g = new THREE.BoxGeometry(1, 1, 1, S, S, S);
    var pos = g.attributes.position, nor = g.attributes.normal, n = pos.count;
    var sg = new Float32Array(n * 3), nv = new Float32Array(n * 3);
    var hs = 0.5 / S, v = new THREE.Vector3();
    for (var i = 0; i < n; i++) {
      var x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
      var sx = Math.sign(x), sy = Math.sign(y), sz = Math.sign(z);
      v.set(x - sx * hs, y - sy * hs, z - sz * hs).normalize();
      sg[i * 3] = sx; sg[i * 3 + 1] = sy; sg[i * 3 + 2] = sz;
      nv[i * 3] = v.x; nv[i * 3 + 1] = v.y; nv[i * 3 + 2] = v.z;
      nor.setXYZ(i, v.x, v.y, v.z);
    }
    g.setSize = function (w, h, d, r) {
      var rr = Math.max(0, Math.min(r, w / 2, h / 2, d / 2));
      var bx = Math.max(0, w / 2 - rr), by = Math.max(0, h / 2 - rr), bz = Math.max(0, d / 2 - rr);
      var a = pos.array;
      for (var i = 0; i < n; i++) {
        var j = i * 3;
        a[j] = bx * sg[j] + nv[j] * rr;
        a[j + 1] = by * sg[j + 1] + nv[j + 1] * rr;
        a[j + 2] = bz * sg[j + 2] + nv[j + 2] * rr;
      }
      pos.needsUpdate = true;
      g.computeBoundingSphere();
      g.computeBoundingBox();
      return g;
    };
    return g;
  }
  function rbox(w, h, d, r, seg) { return rboxCore(seg === undefined ? 3 : seg).setSize(w, h, d, r); }

  /* Round the corners of a 2D polyline ([[x, z], ...]) with arcs of radius r. */
  function fillet(pts, r, seg) {
    seg = seg || 8;
    if (pts.length < 3 || !r) return pts.slice();
    var out = [pts[0]];
    for (var i = 1; i < pts.length - 1; i++) {
      var p0 = pts[i - 1], p1 = pts[i], p2 = pts[i + 1];
      var ax = p0[0] - p1[0], az = p0[1] - p1[1], bx = p2[0] - p1[0], bz = p2[1] - p1[1];
      var la = Math.hypot(ax, az), lb = Math.hypot(bx, bz);
      if (la < 1e-6 || lb < 1e-6) continue;
      ax /= la; az /= la; bx /= lb; bz /= lb;
      var ang = Math.acos(clamp(ax * bx + az * bz, -1, 1));
      if (ang > Math.PI - 1e-3) { out.push(p1); continue; }
      var th = Math.tan(ang / 2);
      var d = Math.min(r / th, la * 0.5, lb * 0.5);
      var rr = d * th;
      var bisx = ax + bx, bisz = az + bz, bl = Math.hypot(bisx, bisz);
      bisx /= bl; bisz /= bl;
      var cd = rr / Math.sin(ang / 2);
      var cx = p1[0] + bisx * cd, cz = p1[1] + bisz * cd;
      var t1x = p1[0] + ax * d, t1z = p1[1] + az * d, t2x = p1[0] + bx * d, t2z = p1[1] + bz * d;
      var a1 = Math.atan2(t1z - cz, t1x - cx), a2 = Math.atan2(t2z - cz, t2x - cx);
      var da = a2 - a1;
      while (da > Math.PI) da -= TAU;
      while (da < -Math.PI) da += TAU;
      for (var k = 0; k <= seg; k++) {
        var a = a1 + da * k / seg;
        out.push([cx + Math.cos(a) * rr, cz + Math.sin(a) * rr]);
      }
    }
    out.push(pts[pts.length - 1]);
    return out;
  }

  /* Densify a polyline so that no segment is longer than `step`. */
  function densify(pts, step) {
    var out = [pts[0]];
    for (var i = 1; i < pts.length; i++) {
      var a = pts[i - 1], b = pts[i];
      var dl = 0;
      for (var c = 0; c < a.length; c++) dl += (b[c] - a[c]) * (b[c] - a[c]);
      dl = Math.sqrt(dl);
      var n = Math.max(1, Math.ceil(dl / step));
      for (var k = 1; k <= n; k++) {
        var f = k / n, p = [];
        for (c = 0; c < a.length; c++) p.push(a[c] + (b[c] - a[c]) * f);
        out.push(p);
      }
    }
    return out;
  }

  /* Arc-length parameterised 3D polyline: at(s, out) */
  function Path3(pts) {
    this.pts = pts;
    var cum = [0];
    for (var i = 1; i < pts.length; i++) {
      var a = pts[i - 1], b = pts[i];
      cum.push(cum[i - 1] + Math.sqrt((b[0] - a[0]) * (b[0] - a[0]) + (b[1] - a[1]) * (b[1] - a[1]) + (b[2] - a[2]) * (b[2] - a[2])));
    }
    this.cum = cum;
    this.len = cum[cum.length - 1];
  }
  Path3.prototype.at = function (s, out) {
    var c = this.cum, p = this.pts, n = c.length;
    if (s <= 0) { out[0] = p[0][0]; out[1] = p[0][1]; out[2] = p[0][2]; return out; }
    if (s >= this.len) { out[0] = p[n - 1][0]; out[1] = p[n - 1][1]; out[2] = p[n - 1][2]; return out; }
    var lo = 0, hi = n - 1;
    while (hi - lo > 1) { var mid = (lo + hi) >> 1; if (c[mid] <= s) lo = mid; else hi = mid; }
    var f = (s - c[lo]) / ((c[hi] - c[lo]) || 1);
    var a = p[lo], b = p[hi];
    out[0] = a[0] + (b[0] - a[0]) * f; out[1] = a[1] + (b[1] - a[1]) * f; out[2] = a[2] + (b[2] - a[2]) * f;
    return out;
  };
  function joinPaths(list) {
    var pts = [];
    list.forEach(function (seg) {
      seg.forEach(function (p, i) {
        if (pts.length && i === 0) {
          var q = pts[pts.length - 1];
          if (Math.abs(q[0] - p[0]) + Math.abs(q[1] - p[1]) + Math.abs(q[2] - p[2]) < 1e-6) return;
        }
        pts.push(p);
      });
    });
    return new Path3(pts);
  }

  /* Merge geometries (position, normal, uv) into one indexed geometry. */
  function mergeGeos(list) {
    var THREE = TH();
    var nV = 0, nI = 0;
    list.forEach(function (g) { nV += g.attributes.position.count; nI += g.index ? g.index.count : g.attributes.position.count; });
    var pos = new Float32Array(nV * 3), nor = new Float32Array(nV * 3), uv = new Float32Array(nV * 2);
    var idx = nV > 65000 ? new Uint32Array(nI) : new Uint16Array(nI);
    var vo = 0, io = 0;
    list.forEach(function (g) {
      var p = g.attributes.position, n = g.attributes.normal, t = g.attributes.uv, c = p.count, i, k;
      for (i = 0; i < c; i++) {
        pos[(vo + i) * 3] = p.getX(i); pos[(vo + i) * 3 + 1] = p.getY(i); pos[(vo + i) * 3 + 2] = p.getZ(i);
        if (n) { nor[(vo + i) * 3] = n.getX(i); nor[(vo + i) * 3 + 1] = n.getY(i); nor[(vo + i) * 3 + 2] = n.getZ(i); }
        if (t) { uv[(vo + i) * 2] = t.getX(i); uv[(vo + i) * 2 + 1] = t.getY(i); }
      }
      if (g.index) { for (k = 0; k < g.index.count; k++) idx[io + k] = g.index.getX(k) + vo; io += g.index.count; }
      else { for (k = 0; k < c; k++) idx[io + k] = vo + k; io += c; }
      vo += c;
    });
    var out = new THREE.BufferGeometry();
    out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    out.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
    out.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    out.setIndex(new THREE.BufferAttribute(idx, 1));
    out.computeBoundingSphere();
    return out;
  }
  /* Bake every static mesh under root into one mesh per material (fewer draw calls).
   * Objects flagged userData.keep (and their children) stay live. */
  function bake(root) {
    var THREE = TH();
    root.updateMatrixWorld(true);
    var groups = {}, order = [], dead = [];
    (function walk(o) {
      if (o.userData.keep) return;
      if (o.isMesh && !o.isInstancedMesh && o.geometry && o.geometry.attributes.normal) {
        var key = o.material.uuid;
        if (!groups[key]) { groups[key] = { mat: o.material, geos: [], cast: false, recv: false, order: o.renderOrder }; order.push(key); }
        var gg = o.geometry.clone();
        gg.applyMatrix4(o.matrixWorld);
        groups[key].geos.push(gg);
        groups[key].cast = groups[key].cast || o.castShadow;
        groups[key].recv = groups[key].recv || o.receiveShadow;
        dead.push(o);
      }
      o.children.slice().forEach(walk);
    })(root);
    dead.forEach(function (o) { if (o.parent) o.parent.remove(o); });
    var inv = new THREE.Matrix4().copy(root.matrixWorld).invert();
    order.forEach(function (key) {
      var e = groups[key];
      var mg = mergeGeos(e.geos);
      mg.applyMatrix4(inv);
      e.geos.forEach(function (g) { g.dispose(); });
      var m = new THREE.Mesh(mg, e.mat);
      m.castShadow = e.cast; m.receiveShadow = e.recv; m.renderOrder = e.order;
      root.add(m);
    });
  }

  /* Flat track (or halo strip) along a dense 2D path in the board plane.
   * Top face only when th <= 0. uv.x runs across the width, uv.y along the length. */
  function ribbonGeo(pts, w, th, y0) {
    var THREE = TH();
    var n = pts.length, pos = [], nor = [], uv = [], idx = [];
    var hw = w / 2, cum = 0, Ls = [], Rs = [], Ns = [], Cs = [];
    for (var i = 0; i < n; i++) {
      var a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)];
      var tx = b[0] - a[0], tz = b[1] - a[1], tl = Math.hypot(tx, tz) || 1;
      tx /= tl; tz /= tl;
      var nx = -tz, nz = tx;
      if (i > 0) cum += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
      Ls.push([pts[i][0] + nx * hw, pts[i][1] + nz * hw]);
      Rs.push([pts[i][0] - nx * hw, pts[i][1] - nz * hw]);
      Ns.push([nx, nz]);
      Cs.push(cum);
    }
    var yt = y0 + Math.max(0, th), base = 0;
    for (i = 0; i < n; i++) {
      pos.push(Ls[i][0], yt, Ls[i][1], Rs[i][0], yt, Rs[i][1]);
      nor.push(0, 1, 0, 0, 1, 0);
      uv.push(0, Cs[i], 1, Cs[i]);
    }
    for (i = 0; i < n - 1; i++) { var k = i * 2; idx.push(k, k + 2, k + 1, k + 1, k + 2, k + 3); }
    var topCount = idx.length;
    if (th > 0) {
      base = pos.length / 3;
      for (i = 0; i < n; i++) {
        pos.push(Ls[i][0], yt, Ls[i][1], Ls[i][0], y0, Ls[i][1]);
        nor.push(Ns[i][0], 0, Ns[i][1], Ns[i][0], 0, Ns[i][1]);
        uv.push(0, Cs[i], 0, Cs[i]);
      }
      for (i = 0; i < n - 1; i++) { k = base + i * 2; idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2); }
      base = pos.length / 3;
      for (i = 0; i < n; i++) {
        pos.push(Rs[i][0], yt, Rs[i][1], Rs[i][0], y0, Rs[i][1]);
        nor.push(-Ns[i][0], 0, -Ns[i][1], -Ns[i][0], 0, -Ns[i][1]);
        uv.push(1, Cs[i], 1, Cs[i]);
      }
      for (i = 0; i < n - 1; i++) { k = base + i * 2; idx.push(k, k + 2, k + 1, k + 1, k + 2, k + 3); }
    }
    var g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.setIndex(idx);
    g.userData.topCount = topCount;
    g.userData.length = cum;
    return g;
  }

  /* ------------------------------------------------------------------
   * Textures and small materials
   * ------------------------------------------------------------------ */
  function canvasTex(w, h, draw) {
    var THREE = TH();
    var tex = K.textTexture(w, h, draw);
    tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
    return tex;
  }
  /* Soft round sprite: white centre fading to transparent. */
  function softTex(power) {
    return canvasTex(128, 128, function (c, w, h) {
      var g = c.createRadialGradient(64, 64, 0, 64, 64, 64);
      var pw = power || 1;
      for (var i = 0; i <= 10; i++) {
        var f = i / 10;
        g.addColorStop(f, 'rgba(255,255,255,' + Math.pow(1 - f, 1.6 * pw).toFixed(4) + ')');
      }
      c.fillStyle = g;
      c.fillRect(0, 0, w, h);
    });
  }
  /* Across-width falloff for halo strips (uv.x 0..1). */
  function stripTex() {
    var THREE = TH();
    var tex = canvasTex(64, 4, function (c, w, h) {
      var g = c.createLinearGradient(0, 0, w, 0);
      g.addColorStop(0, 'rgba(255,255,255,0)');
      g.addColorStop(0.3, 'rgba(255,255,255,0.55)');
      g.addColorStop(0.5, 'rgba(255,255,255,1)');
      g.addColorStop(0.7, 'rgba(255,255,255,0.55)');
      g.addColorStop(1, 'rgba(255,255,255,0)');
      c.fillStyle = g;
      c.fillRect(0, 0, w, h);
    });
    tex.wrapT = THREE.RepeatWrapping;
    return tex;
  }
  function stdMat(color, rough, metal, extra) { return K.mat.std(color, rough, metal, extra); }

  /* ==================================================================
   * 1 · ramp-stairs  (W 1120 × 380)
   * ================================================================== */
  K.register('ramp-stairs', function (el, opts) {
    var THREE = TH();
    opts = opts || {};
    var theme = opts.theme || 'light';
    ensureRelative(el);
    var H3 = 252;
    var stageEl = child(el, 'left:0;top:0;right:0;height:' + H3 + 'px');
    var insetEl = child(el, 'left:0;right:0;bottom:0;top:' + H3 + 'px');
    var VIEW = { yaw: 0, pitch: 0.2, distance: 12.9, target: [-0.45, 1.14, 0] };
    var v = K.stage3d(stageEl, {
      theme: theme, fov: 15, yaw: VIEW.yaw, pitch: VIEW.pitch, distance: VIEW.distance, target: VIEW.target,
      size: 7, ground: -0.16, minYaw: -0.55, maxYaw: 0.55, minPitch: 0.03, maxPitch: 0.85, minDistance: 9, maxDistance: 20
    });
    var inset = K.surface(insetEl);
    if (v.lights) {
      v.lights.key.position.set(-3.5, 14, 4.2);
      v.lights.key.intensity = 1.55;
      v.lights.hemi.intensity = 0.3;
      v.lights.fill.intensity = 0.32;
      v.lights.rim.intensity = 0.35;
    }
    v.exposure = 0.98;

    var L = 4.6, HM = 2.0, D = 1.3, RB = 0.135, BEV = 0.022;
    var CXA = -3.35, CXD = 3.35;
    var X0A = CXA - L / 2, X0D = CXD - L / 2;
    var ALPHA = Math.atan2(HM, L);
    var SWEEP = 8, SAMPLES = 16, SEQ = [2, 4, 8, 16];

    var stoneMat = stdMat(0xC4B9A6, 0.74, 0, { envMapIntensity: 0.32 });
    var plinthMat = stdMat(0xB0A89B, 0.84, 0, { envMapIntensity: 0.3 });

    function plinth(cx) {
      var m = new THREE.Mesh(rbox(L + 0.8, 0.16, D + 0.6, 0.05, 2), plinthMat);
      m.position.set(cx, -0.08, 0);
      m.receiveShadow = true;
      v.scene.add(m);
    }
    plinth(CXA); plinth(CXD);

    /* Ramp: a bevelled wedge */
    var shp = new THREE.Shape();
    shp.moveTo(-L / 2 + 0.03, BEV);
    shp.lineTo(L / 2 - BEV, BEV);
    shp.lineTo(L / 2 - BEV, HM - BEV * 0.2);
    shp.lineTo(-L / 2 + 0.03, BEV + 0.004);
    var rampGeo = new THREE.ExtrudeGeometry(shp, { depth: D - 2 * BEV, bevelEnabled: true, bevelThickness: BEV, bevelSize: BEV, bevelSegments: 3, curveSegments: 4 });
    rampGeo.translate(0, 0, -(D - 2 * BEV) / 2);
    var ramp = new THREE.Mesh(rampGeo, stoneMat);
    ramp.position.x = CXA;
    ramp.castShadow = true; ramp.receiveShadow = true;
    v.scene.add(ramp);

    /* Stairs: 16 columns that re-flow between level counts */
    var cols = [];
    for (var i = 0; i < 16; i++) {
      var cg = rboxCore(2);
      var cm = new THREE.Mesh(cg, stoneMat);
      cm.castShadow = true; cm.receiveShadow = true;
      cm.visible = false;
      v.scene.add(cm);
      cols.push({ geo: cg, mesh: cm, w: -1, h: -1 });
    }
    function layout(N, i, out) {
      if (i < N) {
        var w = L / N;
        out[0] = X0D + i * w; out[1] = X0D + (i + 1) * w; out[2] = HM * i / (N - 1);
      } else { out[0] = X0D + L; out[1] = X0D + L; out[2] = HM; }
      return out;
    }

    /* Balls with a seam so rolling reads */
    function seamTex(bg, line) {
      return canvasTex(512, 256, function (c, w, h) {
        c.fillStyle = bg; c.fillRect(0, 0, w, h);
        c.fillStyle = line;
        c.fillRect(w * 0.25 - 2, 0, 4, h);
        c.fillRect(w * 0.75 - 2, 0, 4, h);
      });
    }
    var ballGeo = new THREE.SphereGeometry(RB, 48, 32);
    var ballA = new THREE.Mesh(ballGeo, new THREE.MeshPhysicalMaterial({ color: 0xffffff, map: seamTex('#1F3FB0', '#5F7BD8'), roughness: 0.32, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.08, envMapIntensity: 0.7 }));
    var ballD = new THREE.Mesh(ballGeo, new THREE.MeshPhysicalMaterial({ color: 0xD08A5C, map: seamTex('#FFFFFF', '#9A6A50'), roughness: 0.24, metalness: 1, clearcoat: 0.5, clearcoatRoughness: 0.1 }));
    ballA.castShadow = ballD.castShadow = true;
    v.scene.add(ballA); v.scene.add(ballD);

    /* DOM labels */
    var RXA = X0A - 0.42, RXD = X0D - 0.42;
    var hA = 1, qD = 0, NB = 2;
    var ZB = D / 2 - RB - 0.07;
    var valA = v.label('', { at: function () { return [RXA, hA, ZB]; }, cls: 'value', align: 'right', dx: -10 });
    var valD = v.label('', { at: function () { return [RXD, ballDH, ZB]; }, cls: 'value', align: 'right', dx: -10 });
    valA.el.style.color = P.blue; valD.el.style.color = P.copper;
    valA.el.style.fontSize = valD.el.style.fontSize = '14px';

    /* Signal */
    function wave(u) {
      return 0.5 + 0.27 * Math.sin(TAU * u) + 0.15 * Math.sin(2 * TAU * u + 0.9) + 0.055 * Math.sin(3 * TAU * u + 2.2);
    }
    function wv(u) { return clamp((wave(u) - 0.035) / 0.93, 0, 1); }
    function qlev(x, N) { return clamp(Math.round(x * (N - 1)), 0, N - 1); }

    var st = {};
    function reset() {
      st.auto = true;
      st.N = K.reducedMotion ? 8 : SEQ[0];
      st.morph = null;
      st.manualT = 0;
      v.setView(VIEW);
    }
    reset();

    var tmp = [0, 0, 0], tA = [0, 0, 0], tB = [0, 0, 0];
    var ballDH = 0, ballDX = 0;
    var lastT = 0;
    var curU = 0, curN = 2, morphK = 1, morphFrom = 2;

    function stateAt(t) {
      /* returns {u, N, from, k} for time t */
      if (st.auto && !K.reducedMotion) {
        var m = Math.floor(t / SWEEP);
        var N = SEQ[m % SEQ.length], from = m > 0 ? SEQ[(m - 1) % SEQ.length] : N;
        var k = m > 0 ? easeIO((t - m * SWEEP) / 1.1) : 1;
        return { u: (t % SWEEP) / SWEEP, N: N, from: from, k: k };
      }
      var u = K.reducedMotion ? 0.3 : (t % SWEEP) / SWEEP;
      if (st.morph) {
        var kk = easeIO((t - st.morph.t0) / 1.1);
        if (kk >= 1) { st.morph = null; return { u: u, N: st.N, from: st.N, k: 1 }; }
        return { u: u, N: st.N, from: st.morph.from, k: kk };
      }
      return { u: u, N: st.N, from: st.N, k: 1 };
    }

    /* During a change of level count the stairs keep the finer grid and only the
     * heights move: every step splits in two (one more bit) or merges back. */
    var FLOOR = 0.1;
    function colLayout(S, i, out) {
      colLayout0(S, i, out);
      if (out[1] - out[0] > 1e-4 && out[2] < FLOOR) out[2] = FLOOR;
      return out;
    }
    function colLayout0(S, i, out) {
      var Nf = S.from, Nt = S.N, k = S.k;
      if (k >= 1 || Nf === Nt) return layout(Nt, i, out);
      var Nfine = Math.max(Nf, Nt);
      if (i >= Nfine) { out[0] = out[1] = X0D + L; out[2] = 0; return out; }
      var w = L / Nfine, hf, ht;
      out[0] = X0D + i * w; out[1] = out[0] + w;
      if (Nt > Nf) { hf = HM * Math.floor(i / (Nt / Nf)) / (Nf - 1); ht = HM * i / (Nt - 1); }
      else { hf = HM * i / (Nf - 1); ht = HM * Math.floor(i / (Nf / Nt)) / (Nt - 1); }
      out[2] = lerp(hf, ht, k);
      return out;
    }
    var lA = [0, 0, 0];
    function surfaceAt(x, S) {
      var h = 0;
      for (var i = 0; i < 16; i++) {
        colLayout(S, i, lA);
        if (lA[1] - lA[0] < 1e-4) continue;
        if (lA[1] > x - RB * 0.6 && lA[0] < x + RB * 0.6) h = Math.max(h, lA[2]);
      }
      return h;
    }
    function treadX(q, N) { return X0D + (q + 0.5) * L / N; }

    function frame(t, dt) {
      lastT = t;
      var S = stateAt(t);
      curU = S.u; curN = S.N; morphK = S.k; morphFrom = S.from;
      var intro = K.reducedMotion ? 1 : easeIO(t / 1.0);

      /* stairs geometry */
      for (var i = 0; i < 16; i++) {
        colLayout(S, i, tA);
        var x0 = tA[0], x1 = tA[1], hy = tA[2] * intro;
        var c = cols[i], w = x1 - x0;
        if (w < 0.004 || hy < 0.004) { c.mesh.visible = false; continue; }
        c.mesh.visible = true;
        if (Math.abs(w - c.w) > 1e-4 || Math.abs(hy - c.h) > 1e-4) {
          c.geo.setSize(w, hy, D, 0.03);
          c.w = w; c.h = hy;
        }
        c.mesh.position.set(x0 + w / 2, hy / 2, 0);
      }

      /* analog ball rolls on the ramp */
      var x = wv(S.u);
      hA = x * HM;
      var cxc = X0A + hA / Math.tan(ALPHA);
      var off = RB + BEV * 0.6;
      ballA.position.set(cxc - Math.sin(ALPHA) * off, hA + Math.cos(ALPHA) * off, ZB);
      ballA.rotation.z = -(hA / Math.sin(ALPHA)) / RB;
      ballA.visible = intro > 0.02;

      /* digital ball: sampled, quantised, hops between treads */
      var j = Math.floor(S.u * SAMPLES);
      var uj = j / SAMPLES;
      var q = qlev(wv(uj), S.N);
      var qp = qlev(wv(((j - 1 + SAMPLES) % SAMPLES) / SAMPLES), S.N);
      NB = S.N;
      var tau = K.reducedMotion ? 1 : clamp((S.u - uj) * SWEEP / 0.42, 0, 1);
      var xq = treadX(q, S.N), xp = treadX(qp, S.N);
      var e = easeIO(tau);
      var bx = lerp(xp, xq, tau);
      var y0 = surfaceAt(xp, S), y1 = surfaceAt(xq, S);
      var apex = Math.max(y0, y1) + 0.22 + Math.abs(y1 - y0) * 0.12;
      var by;
      if (q === qp || tau >= 1) by = surfaceAt(bx, S);
      else {
        /* parabola through (0,y0), (1,y1) with peak ~apex */
        var s = tau;
        by = (1 - s) * (1 - s) * y0 + 2 * (1 - s) * s * (2 * apex - (y0 + y1) / 2) + s * s * y1;
        by = Math.min(by, apex + 0.05);
      }
      ballDH = by * intro;
      ballDX = bx;
      ballD.position.set(bx, ballDH + RB, ZB);
      ballD.rotation.z = -(bx - X0D) / RB;
      ballD.visible = intro > 0.02;

      valA.set(K.num(hA, 2) + ' m');
      qD = tau < 0.55 ? qp : q;
      valD.set((qD + 1) + '. basamak');

      v.render(dt);
      drawRulers();
      drawInset();
    }

    var pr = new THREE.Vector3();
    function proj(x, y, z) { pr.set(x, y, z); return v.project(pr); }

    function drawRulers() {
      var c = v.ctx;
      if (!c) return;
      c.save();
      var sx = v.w / 1120;
      K.label(c, 'ANALOG · rampa', 24 * sx, 18, { size: 12, mono: true, weight: 600, color: P.blue, spacing: 1.4 });
      K.label(c, 'her yükseklikte olabilir', 24 * sx, 36, { size: 13, color: P.muted });
      K.label(c, 'DİJİTAL · merdiven', 600 * sx, 18, { size: 12, mono: true, weight: 600, color: P.copper, spacing: 1.4 });
      K.label(c, 'yalnızca basamaklarda durabilir', 600 * sx, 36, { size: 13, color: P.muted });
      /* analog ruler: continuous scale */
      var b = proj(RXA, 0, ZB), tp = proj(RXA, HM, ZB);
      c.strokeStyle = K.rgba(P.ink2, 0.75);
      c.lineWidth = 1.2;
      c.beginPath(); c.moveTo(b.x, b.y); c.lineTo(tp.x, tp.y); c.stroke();
      for (var i = 0; i <= 20; i++) {
        var p = proj(RXA, HM * i / 20, ZB);
        var len = i % 10 === 0 ? 8 : i % 5 === 0 ? 6 : 3.5;
        c.lineWidth = i % 5 === 0 ? 1.2 : 0.9;
        c.beginPath(); c.moveTo(p.x, p.y); c.lineTo(p.x + len, p.y); c.stroke();
      }
      var dlp = proj(RXD, ballDH, ZB), dlx = dlp.x, dly = dlp.y;
      function nearD(px, py) { return Math.abs(py - dly) < 15 && px + 34 > dlx - 110; }
      var tickA = [['2 m', tp.x + 12, tp.y + 4], ['1 m', (b.x + tp.x) / 2 + 12, (b.y + tp.y) / 2 + 4], ['0', b.x + 12, b.y + 4]];
      tickA.forEach(function (tk) { if (!nearD(tk[1], tk[2] - 4)) K.label(c, tk[0], tk[1], tk[2], { size: 11, mono: true, color: P.muted }); });
      /* level line to the analog ball */
      var la = proj(RXA, hA, ZB), bpa = proj(ballA.position.x - RB * 0.4, hA + RB * 0.25, ZB);
      c.setLineDash([3, 3]);
      c.strokeStyle = K.rgba(P.blue, 0.8);
      c.beginPath(); c.moveTo(la.x, la.y); c.lineTo(bpa.x - 4, bpa.y); c.stroke();
      c.setLineDash([]);
      c.fillStyle = P.blue;
      c.beginPath(); c.arc(la.x, la.y, 3, 0, TAU); c.fill();

      /* digital ruler: only the allowed levels */
      b = proj(RXD, 0, ZB); tp = proj(RXD, HM, ZB);
      c.strokeStyle = K.rgba(P.ink2, 0.75);
      c.lineWidth = 1.2;
      c.beginPath(); c.moveTo(b.x, b.y); c.lineTo(tp.x, tp.y); c.stroke();
      var kk = morphK;
      function ticks(N, alpha) {
        if (alpha <= 0.01) return;
        c.globalAlpha = alpha;
        for (var i2 = 0; i2 < N; i2++) {
          var p2 = proj(RXD, HM * i2 / (N - 1), ZB);
          c.lineWidth = 1.6;
          c.strokeStyle = P.copper;
          c.beginPath(); c.moveTo(p2.x, p2.y); c.lineTo(p2.x + 8, p2.y); c.stroke();
        }
        c.globalAlpha = 1;
      }
      if (kk < 1) ticks(morphFrom, 1 - kk);
      ticks(curN, kk);
      var dl2 = proj(RXD, ballDH, ZB).y;
      if (Math.abs(tp.y - dl2) > 11) K.label(c, '2 m', tp.x + 12, tp.y + 4, { size: 11, mono: true, color: P.muted });
      if (Math.abs(b.y - dl2) > 11) K.label(c, '0', b.x + 12, b.y + 4, { size: 11, mono: true, color: P.muted });
      var ld = proj(RXD, ballDH, ZB), bpd = proj(ballDX - RB * 0.9, ballDH, ZB);
      c.setLineDash([3, 3]);
      c.strokeStyle = K.rgba(P.copper, 0.85);
      c.lineWidth = 1.2;
      c.beginPath(); c.moveTo(ld.x, ld.y); c.lineTo(bpd.x - 4, bpd.y); c.stroke();
      c.setLineDash([]);
      c.fillStyle = P.copper;
      c.beginPath(); c.arc(ld.x, ld.y, 3, 0, TAU); c.fill();
      c.restore();
    }

    function drawInset() {
      inset.clear();
      var c = inset.ctx, W = inset.w;
      var top = 22, bot = 92;
      var gA = { x0: 70, x1: 520 }, gD = { x0: 640, x1: 1090 };
      var sc = W / 1120;
      gA.x0 *= sc; gA.x1 *= sc; gD.x0 *= sc; gD.x1 *= sc;
      function Y(x) { return bot - x * (bot - top); }
      function frameBox(g) {
        c.strokeStyle = P.line;
        c.lineWidth = 1;
        c.beginPath(); c.moveTo(g.x0, bot + 0.5); c.lineTo(g.x1, bot + 0.5); c.stroke();
        c.beginPath(); c.moveTo(g.x0 + 0.5, top - 4); c.lineTo(g.x0 + 0.5, bot); c.stroke();
        K.label(c, '2 m', g.x0 - 6, top + 4, { size: 10, mono: true, color: P.muted, align: 'right' });
        K.label(c, '0', g.x0 - 6, bot + 3, { size: 10, mono: true, color: P.muted, align: 'right' });
        K.label(c, 'zaman →', g.x1, 110, { size: 10, mono: true, color: P.muted, align: 'right' });
      }
      function curve(g, color, width, alpha) {
        c.save();
        c.globalAlpha = alpha;
        c.strokeStyle = color; c.lineWidth = width; c.lineJoin = 'round';
        c.beginPath();
        for (var i = 0; i <= 240; i++) {
          var u = i / 240, x = lerp(g.x0, g.x1, u), y = Y(wv(u));
          if (i) c.lineTo(x, y); else c.moveTo(x, y);
        }
        c.stroke();
        c.restore();
      }
      function steps(g, N, alpha) {
        if (alpha <= 0.01) return;
        c.save();
        c.globalAlpha = alpha;
        c.strokeStyle = 'rgba(21,23,28,0.07)';
        c.lineWidth = 1;
        for (var l = 0; l < N; l++) {
          var yy = Math.round(Y(l / (N - 1))) + 0.5;
          c.beginPath(); c.moveTo(g.x0, yy); c.lineTo(g.x1, yy); c.stroke();
        }
        c.strokeStyle = P.copperFill; c.lineWidth = 2.2; c.lineJoin = 'miter';
        c.beginPath();
        for (var j = 0; j < SAMPLES; j++) {
          var q = qlev(wv(j / SAMPLES), N) / (N - 1);
          var xa = lerp(g.x0, g.x1, j / SAMPLES), xb = lerp(g.x0, g.x1, (j + 1) / SAMPLES);
          if (j) c.lineTo(xa, Y(q)); else c.moveTo(xa, Y(q));
          c.lineTo(xb, Y(q));
        }
        c.stroke();
        c.fillStyle = P.copperFill;
        for (j = 0; j < SAMPLES; j++) {
          var qq = qlev(wv(j / SAMPLES), N) / (N - 1);
          c.beginPath(); c.arc(lerp(g.x0, g.x1, j / SAMPLES), Y(qq), 2.6, 0, TAU); c.fill();
        }
        c.restore();
      }
      frameBox(gA); frameBox(gD);
      curve(gA, P.blue, 2.2, 1);
      curve(gD, P.blue, 1.6, 0.28);
      if (morphK < 1) steps(gD, morphFrom, 1 - morphK);
      steps(gD, curN, morphK);
      /* cursors */
      var cx = lerp(gA.x0, gA.x1, curU), cy = Y(wv(curU));
      c.strokeStyle = K.rgba(P.ink, 0.35); c.lineWidth = 1;
      c.beginPath(); c.moveTo(cx + 0.5, top - 4); c.lineTo(cx + 0.5, bot); c.stroke();
      c.fillStyle = P.blue; c.beginPath(); c.arc(cx, cy, 4.2, 0, TAU); c.fill();
      c.fillStyle = '#fff'; c.beginPath(); c.arc(cx, cy, 1.6, 0, TAU); c.fill();
      var dx = lerp(gD.x0, gD.x1, curU);
      var j = Math.floor(curU * SAMPLES);
      var dq = qlev(wv(j / SAMPLES), curN) / (curN - 1);
      c.strokeStyle = K.rgba(P.ink, 0.35);
      c.beginPath(); c.moveTo(dx + 0.5, top - 4); c.lineTo(dx + 0.5, bot); c.stroke();
      c.fillStyle = P.copperFill; c.beginPath(); c.arc(dx, Y(dq), 4.2, 0, TAU); c.fill();
      c.fillStyle = '#fff'; c.beginPath(); c.arc(dx, Y(dq), 1.6, 0, TAU); c.fill();
      /* titles and captions */
      var nb = Math.round(Math.log(curN) / Math.LN2);
      K.label(c, 'SÜREKLİ SİNYAL', gA.x0, 12, { size: 10.5, mono: true, weight: 600, color: P.blue, spacing: 1.2 });
      K.label(c, 'ÖRNEKLENMİŞ · ' + curN + ' SEVİYE = ' + nb + ' BİT (' + MUL[nb - 1] + ')', gD.x0, 12, { size: 10.5, mono: true, weight: 600, color: P.copper, spacing: 1.2 });
      K.label(c, 'kesintisiz değişir, her ara değeri alabilir', gA.x0, 110, { size: 12, color: P.muted });
      K.label(c, 'aralıklarla ölçülür, en yakın basamağa yuvarlanır', gD.x0, 110, { size: 12, color: P.muted });
    }

    function bitsOf(N) { return Math.round(Math.log(N) / Math.LN2); }
    var MUL = ['2', '2 × 2', '2 × 2 × 2', '2 × 2 × 2 × 2'];

    return {
      reset: reset,
      frame: frame,
      set: function (k, val) {
        if (k === 'levels') {
          var N = +val;
          if (SEQ.indexOf(N) < 0) return;
          var S = stateAt(lastT);
          if (st.auto) { st.auto = false; }
          if (N !== S.N || S.k < 1) st.morph = { from: S.k < 1 ? S.from : S.N, t0: lastT };
          if (N === S.N && S.k >= 1) st.morph = null;
          st.N = N;
        }
      },
      read: function (k) {
        if (k === 'analog') return 'Yükseklik: ' + K.num(hA, 2) + ' m';
        if (k === 'digital') return 'Basamak: ' + (qD + 1) + ' / ' + NB;
        if (k === 'bits') { var b = bitsOf(curN); return curN + ' seviye = ' + b + ' bit (' + MUL[b - 1] + ')'; }
        if (k === 'levels') return curN + ' seviye';
        return '';
      },
      resize: function () { v.sf.resize(); inset.resize(); },
      dispose: function () { v.dispose(); inset.dispose(); if (stageEl.parentNode) stageEl.parentNode.removeChild(stageEl); if (insetEl.parentNode) insetEl.parentNode.removeChild(insetEl); }
    };
  });

  /* ==================================================================
   * Circuit kit (millimetres): board, copper tracks, parts, electrons
   * ================================================================== */
  /* Shadow settings for millimetre-scale scenes (texel ~0,25 mm). */
  function mmShadows(v) {
    if (!v.lights) return;
    var sh = v.lights.key.shadow;
    sh.bias = -0.00015;
    sh.normalBias = 0.35;
    sh.radius = 4;
  }

  function circuitMats() {
    return {
      board: stdMat(0xF0F1F1, 0.66, 0, { envMapIntensity: 0.45 }),
      core: stdMat(0xCDBF8E, 0.72, 0, { envMapIntensity: 0.4 }),
      slate: stdMat(0x272B32, 0.44, 0, { envMapIntensity: 0.8 }),
      black: stdMat(0x1B1D22, 0.4, 0, { envMapIntensity: 0.8 }),
      brass: stdMat(0xD1B072, 0.3, 1),
      blade: stdMat(0xD8956A, 0.24, 1),
      tin: stdMat(0xD3D6DA, 0.22, 1),
      steel: stdMat(0xBCC1C8, 0.28, 1),
      pad: stdMat(0xD09A6A, 0.3, 0.92),
      batt: stdMat(0x2B2E35, 0.38, 0.35, { envMapIntensity: 0.9 }),
      wireRed: stdMat(0xB3352A, 0.42, 0),
      wireBlack: stdMat(0x24272C, 0.42, 0),
      resBody: stdMat(0xE3D2B0, 0.55, 0),
      dots: K.mat.electron(false),
      soft: softTex(),
      strip: stripTex()
    };
  }

  /* Copper tracks with an emissive "current" state and a soft halo strip. */
  function trackKit(scene, M, o) {
    var THREE = TH();
    o = o || {};
    var W = o.width || 2.2, TT = o.th || 0.12;
    var tracks = {}, list = [];
    var padGeo = new THREE.CylinderGeometry(1.75, 1.75, TT + 0.02, 28);
    var holeGeo = new THREE.CircleGeometry(0.55, 16);
    var holeMat = stdMat(0x3A3226, 0.8, 0);
    var jointGeo = new THREE.CylinderGeometry(0.45, 1.25, 0.75, 20);
    var SRt = o.staticRoot || scene;
    function add(name, pts, opt) {
      opt = opt || {};
      var dense = densify(fillet(pts, opt.r === undefined ? 2.6 : opt.r, 6), 1.2);
      var w = opt.width || W;
      var mat = stdMat(0xA3826A, 0.46, 0.55, { emissive: new THREE.Color(0xE0742E), emissiveIntensity: 0 });
      var mesh = new THREE.Mesh(ribbonGeo(dense, w, TT, 0), mat);
      mesh.receiveShadow = true;
      scene.add(mesh);
      var hmat = new THREE.MeshBasicMaterial({ color: o.haloColor || 0xE7874C, map: M.strip, transparent: true, opacity: 0, depthWrite: false, toneMapped: false });
      var halo = new THREE.Mesh(ribbonGeo(dense, opt.halo || o.halo || 7.5, 0, TT + 0.03), hmat);
      halo.renderOrder = 3;
      halo.visible = false;
      scene.add(halo);
      var t = { name: name, pts: dense, mesh: mesh, mat: mat, halo: halo, hmat: hmat, act: 0, target: 0, gain: opt.gain || 1 };
      tracks[name] = t;
      list.push(t);
      return t;
    }
    function pad(x, z, hole) {
      var m = new THREE.Mesh(padGeo, M.pad);
      m.position.set(x, (TT + 0.02) / 2, z);
      m.receiveShadow = true;
      SRt.add(m);
      if (hole) {
        var h = new THREE.Mesh(holeGeo, holeMat);
        h.rotation.x = -Math.PI / 2;
        h.position.set(x, TT + 0.04, z);
        SRt.add(h);
      }
      return m;
    }
    function joint(x, z) {
      pad(x, z, false);
      var j = new THREE.Mesh(jointGeo, M.tin);
      j.position.set(x, TT + 0.38, z);
      SRt.add(j);
      return j;
    }
    var colOff = new THREE.Color(0xA3826A), colOn = new THREE.Color(0xE58A4E);
    function update(dt) {
      for (var i = 0; i < list.length; i++) {
        var t = list[i];
        t.act = approach(t.act, t.target, 9, dt);
        if (t.act < 0.002) t.act = 0;
        t.mat.color.copy(colOff).lerp(colOn, clamp(t.act * t.gain, 0, 1));
        t.mat.emissiveIntensity = 0.75 * t.act * t.gain;
        t.hmat.opacity = 0.6 * t.act * t.gain;
        t.halo.visible = t.act > 0.004;
      }
    }
    function clearTargets() { for (var i = 0; i < list.length; i++) list[i].target = 0; }
    return { add: add, pad: pad, joint: joint, tracks: tracks, list: list, update: update, clearTargets: clearTargets, top: TT };
  }

  /* Electron dots moving around closed loops. */
  function dotKit(scene, cap, M, radius) {
    var mesh = K.instanced(cap, { radius: radius || 0.78, material: M.dots, detail: 1 });
    scene.add(mesh);
    var n = 0, tmp = [0, 0, 0];
    return {
      mesh: mesh,
      begin: function () { n = 0; },
      loop: function (path, phase, spacing, scale, hide) {
        if (scale < 0.02 || !path) return;
        var len = path.len, cnt = Math.max(1, Math.round(len / spacing)), sp = len / cnt;
        var ph = ((phase % len) + len) % len;
        for (var k = 0; k < cnt && n < cap; k++) {
          var s = (k * sp + ph) % len;
          if (hide && s > hide[0] && s < hide[1]) continue;
          path.at(s, tmp);
          mesh.setAt(n++, tmp[0], tmp[1], tmp[2], scale);
        }
      },
      end: function () { for (var i = n; i < cap; i++) mesh.hideAt(i); mesh.commit(); }
    };
  }

  /* Printed label plane (lies on a surface). */
  function decal(w, h, pxPerMm, draw, mat, drawLandscape, rot) {
    var THREE = TH();
    var tex = drawLandscape ?
      canvasTex(Math.round(h * pxPerMm), Math.round(w * pxPerMm), function (c) { c.scale(pxPerMm, pxPerMm); drawLandscape(c); }) :
      canvasTex(Math.round(w * pxPerMm), Math.round(h * pxPerMm), function (c, cw, ch) { c.scale(pxPerMm, pxPerMm); draw(c, w, h); });
    if (drawLandscape) { tex.center.set(0.5, 0.5); tex.rotation = rot === undefined ? -Math.PI / 2 : rot; }
    var m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat || new THREE.MeshStandardMaterial({ map: tex, transparent: true, roughness: 0.55, metalness: 0, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }));
    if (mat) mat.map = tex;
    m.userData.tex = tex;
    return m;
  }

  /* 9 V battery lying flat: long axis along local z, terminal end and snap at -z.
   * Snap wires end on two pads at local (±6,35, -36). */
  /* mode: undefined = label along the width, 'L' = lying with terminals to the left,
   * 'R' = lying with terminals to the right (label text always reads left to right). */
  function battery9V(M, landscape) {
    var mirror = landscape === 'R';
    var THREE = TH();
    var g = new THREE.Group();
    var LB = 48.5, WB = 26.5, HB = 17.5;
    var body = new THREE.Mesh(rbox(WB, HB, LB - 3.4, 1.6, 3), M.batt);
    body.position.set(0, HB / 2, 1.7);
    body.castShadow = true; body.receiveShadow = true;
    g.add(body);
    var cap = new THREE.Mesh(rbox(WB - 0.8, HB - 0.8, 3.6, 0.9, 2), M.black);
    cap.position.set(0, HB / 2, -LB / 2 + 1.8);
    cap.castShadow = true;
    g.add(cap);
    var label = landscape ? decal(WB - 2.4, LB - 6.4, 20, null, null, function (c) {
      var w = LB - 6.4, h = WB - 2.4;
      function X(f) { return mirror ? w * (1 - f) : w * f; }
      c.fillStyle = '#ECEBE6'; c.fillRect(0, 0, w, h);
      c.fillStyle = '#C8693A'; c.fillRect(mirror ? w * 0.8 : w * 0.13, 0, w * 0.07, h);
      c.fillStyle = '#2B2E35'; c.fillRect(mirror ? w * 0.87 : 0, 0, w * 0.13, h);
      c.fillStyle = '#F2EFE8';
      c.textAlign = 'center'; c.textBaseline = 'middle';
      c.font = '600 4.6px "IBM Plex Mono", monospace';
      c.fillText('+', X(0.065), mirror ? h * 0.73 : h * 0.27);
      c.fillText('−', X(0.065), mirror ? h * 0.27 : h * 0.73);
      c.fillStyle = '#1D2026';
      c.font = '600 10px "IBM Plex Mono", monospace';
      c.fillText('9 V', X(0.6) + (mirror ? 4 : 0), h * 0.45);
      c.font = '500 2.3px "IBM Plex Sans", sans-serif';
      c.fillStyle = 'rgba(29,32,38,0.6)';
      c.fillText('ALKALİN PİL · 6LR61', X(0.6) + (mirror ? 4 : 0), h * 0.8);
    }, mirror ? Math.PI / 2 : -Math.PI / 2) : decal(WB - 2.4, LB - 6.4, 20, function (c, w, h) {
      c.fillStyle = '#2B2E35'; c.fillRect(0, 0, w, h);
      c.fillStyle = '#C8693A'; c.fillRect(0, h * 0.17, w, h * 0.085);
      c.fillStyle = '#F2EFE8';
      c.textAlign = 'center'; c.textBaseline = 'middle';
      c.font = '600 6px "IBM Plex Mono", monospace';
      c.fillText('+', w * 0.74, h * 0.07);
      c.fillText('−', w * 0.26, h * 0.07);
      c.font = '600 11.5px "IBM Plex Mono", monospace';
      c.fillText('9 V', w / 2, h * 0.52);
      c.font = '500 2.6px "IBM Plex Sans", sans-serif';
      c.fillStyle = 'rgba(242,239,232,0.75)';
      c.fillText('ALKALİN PİL · 6LR61', w / 2, h * 0.7);
      c.fillStyle = '#C8693A'; c.fillRect(w * 0.3, h * 0.9, w * 0.4, 0.5);
    });
    label.rotation.x = -Math.PI / 2;
    label.position.set(0, HB + 0.02, 1.7);
    g.add(label);
    /* snap clip and its two wires */
    var clip = new THREE.Mesh(rbox(24, 7.4, 6.4, 1.3, 2), M.black);
    clip.position.set(0, HB / 2, -LB / 2 - 3.2);
    clip.castShadow = true;
    g.add(clip);
    [[6.35, M.wireRed], [-6.35, M.wireBlack]].forEach(function (d) {
      var w = K.wire([[d[0], HB / 2, -30.3], [d[0], HB / 2 - 0.5, -32.6], [d[0], 5.0, -35.2], [d[0], 1.7, -36.1], [d[0], 0.5, -36.0]], { radius: 0.8, material: d[1], segments: 48, radial: 10, tension: 0.3 });
      g.add(w);
    });
    return g;
  }

  /* Knife switch along local x (hinge at -x). Pads at x = ±11,8. */
  function knifeSwitch(M, sc) {
    var THREE = TH();
    sc = sc || 1;
    var outer = new THREE.Group();
    var g = new THREE.Group();
    g.scale.setScalar(sc);
    outer.add(g);
    var BH = 3.2;
    var base = new THREE.Mesh(rbox(20, BH, 8.4, 1.0, 2), M.slate);
    base.position.y = BH / 2;
    base.castShadow = true; base.receiveShadow = true;
    g.add(base);
    var HX = -6.8, JX = 5.6, PY = BH + 4.4;
    var cheek = rbox(3.2, 5.8, 0.8, 0.3, 1);
    var jawG = rbox(3.0, 5.2, 0.8, 0.3, 1);
    [-1, 1].forEach(function (s) {
      var a = new THREE.Mesh(cheek, M.brass); a.position.set(HX, BH + 2.9, s * 0.95); g.add(a);
      var b = new THREE.Mesh(jawG, M.brass); b.position.set(JX, BH + 2.6, s * 0.95); g.add(b);
    });
    var pin = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 3.4, 16), M.brass);
    pin.rotation.x = Math.PI / 2; pin.position.set(HX, PY, 0);
    g.add(pin);
    /* terminal straps from the posts down to the pads */
    var strap = rbox(4.2, 0.5, 2.6, 0.2, 1);
    [[-10.4, HX], [10.4, JX]].forEach(function (d) {
      var s = new THREE.Mesh(strap, M.brass); s.position.set(d[0], BH + 0.25, 0); g.add(s);
      var leg = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, BH + 0.4, 10), M.tin);
      leg.position.set(d[0] > 0 ? 11.8 : -11.8, (BH + 0.4) / 2, 0); g.add(leg);
      var s2 = new THREE.Mesh(rbox(2.4, 0.5, 2.0, 0.2, 1), M.brass); s2.position.set(d[0] > 0 ? 11.6 : -11.6, BH + 0.25, 0); g.add(s2);
    });
    var bladeG = new THREE.Group();
    bladeG.userData.keep = true;
    bladeG.position.set(HX, PY, 0);
    g.add(bladeG);
    var blade = new THREE.Mesh(rbox(16.6, 2.5, 0.9, 0.4, 2), M.blade);
    blade.position.x = 7.6;
    blade.castShadow = true;
    bladeG.add(blade);
    var handle = new THREE.Mesh(new THREE.CylinderGeometry(1.25, 1.5, 6.4, 22), M.black);
    handle.position.set(15.4, 4.2, 0);
    handle.castShadow = true;
    bladeG.add(handle);
    var knob = new THREE.Mesh(new THREE.SphereGeometry(1.25, 22, 12, 0, TAU, 0, Math.PI / 2), M.black);
    knob.position.set(15.4, 7.4, 0);
    bladeG.add(knob);
    var api = {
      group: outer, open: 0, pad: 11.8 * sc,
      set: function (a) { api.open = a; bladeG.rotation.z = a * 0.8; },
      closed: function () { return api.open < 0.02; },
      /* path points in local space from the hinge pad to the jaw pad (or reverse) */
      path: function (fromHinge) {
        var top = PY + 1.25 + 0.6 / sc;
        var p = [[-11.8, 0.9 / sc, 0], [-11.8, BH + 0.9, 0], [HX, top, 0], [JX, top, 0], [11.8, BH + 0.9, 0], [11.8, 0.9 / sc, 0]].map(function (q) { return [q[0] * sc, q[1] * sc, q[2] * sc]; });
        return fromHinge ? p : p.slice().reverse();
      }
    };
    return api;
  }

  /* 5 mm LED standing on the board, legs along local x (anode at -x, cathode +x). */
  function led5(M, color) {
    var THREE = TH();
    var g = new THREE.Group();
    var LIFT = 2.6;
    var tint = color || 0xE0453A;
    var legG = new THREE.CylinderGeometry(0.26, 0.26, LIFT + 1.2, 8);
    [-1.27, 1.27].forEach(function (x) {
      var l = new THREE.Mesh(legG, M.tin); l.position.set(x, (LIFT + 1.2) / 2, 0); g.add(l);
    });
    /* flange with the flat on the cathode side */
    var fs = new THREE.Shape();
    var a0 = Math.acos(2.45 / 2.9);
    fs.absarc(0, 0, 2.9, a0, TAU - a0, false);
    fs.lineTo(2.45, Math.sin(a0) * 2.9);
    var flange = new THREE.ExtrudeGeometry(fs, { depth: 1.0, bevelEnabled: true, bevelThickness: 0.12, bevelSize: 0.12, bevelSegments: 2, curveSegments: 40 });
    flange.rotateX(-Math.PI / 2);
    var epoxy = new THREE.MeshPhysicalMaterial({ color: tint, roughness: 0.1, metalness: 0, transparent: true, opacity: 0.58, clearcoat: 1, clearcoatRoughness: 0.05, depthWrite: false, emissive: new THREE.Color(tint), emissiveIntensity: 0 });
    var fm = new THREE.Mesh(flange, epoxy);
    fm.position.y = LIFT;
    g.add(fm);
    var prof = [];
    prof.push(new THREE.Vector2(0.001, LIFT + 1.0));
    prof.push(new THREE.Vector2(2.5, LIFT + 1.0));
    for (var i = 0; i <= 3; i++) prof.push(new THREE.Vector2(2.5, LIFT + 1.0 + 5.1 * i / 3));
    for (i = 1; i <= 16; i++) { var a = (i / 16) * Math.PI / 2; prof.push(new THREE.Vector2(Math.max(0.001, 2.5 * Math.cos(a)), LIFT + 6.1 + 2.5 * Math.sin(a))); }
    var dome = new THREE.Mesh(new THREE.LatheGeometry(prof, 40), epoxy);
    dome.renderOrder = 2;
    g.add(dome);
    /* lead frame inside */
    var anvil = new THREE.Mesh(rbox(1.8, 4.4, 0.5, 0.15, 1), M.steel); anvil.position.set(0.95, LIFT + 2.6, 0); g.add(anvil);
    var post = new THREE.Mesh(rbox(0.9, 4.6, 0.5, 0.15, 1), M.steel); post.position.set(-1.05, LIFT + 2.7, 0); g.add(post);
    var cup = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.45, 0.6, 16), M.steel); cup.position.set(0.7, LIFT + 5.05, 0); g.add(cup);
    var dieMat = stdMat(0x401010, 0.4, 0, { emissive: new THREE.Color(0xFF3A22), emissiveIntensity: 0 });
    var die = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.22, 0.4), dieMat); die.position.set(0.7, LIFT + 5.45, 0); g.add(die);
    var bw = new THREE.Mesh(new THREE.TubeGeometry(new THREE.QuadraticBezierCurve3(new THREE.Vector3(0.7, LIFT + 5.55, 0), new THREE.Vector3(-0.2, LIFT + 6.6, 0), new THREE.Vector3(-1.05, LIFT + 5.0, 0)), 12, 0.05, 5), M.brass);
    g.add(bw);
    var coreMat = new THREE.MeshBasicMaterial({ color: 0xFF5236, transparent: true, opacity: 0, depthWrite: false, toneMapped: false });
    var core = new THREE.Mesh(new THREE.SphereGeometry(2.05, 20, 14), coreMat);
    core.position.set(0, LIFT + 5.4, 0);
    core.scale.set(1, 1.45, 1);
    core.renderOrder = 1;
    core.userData.keep = true;
    g.add(core);
    /* glow sprite and light pool on the board */
    var sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: M.soft, color: 0xFF4A30, transparent: true, opacity: 0, depthWrite: false, toneMapped: false }));
    sp.position.set(0, LIFT + 5.6, 0);
    sp.scale.set(19, 19, 1);
    sp.renderOrder = 6;
    g.add(sp);
    var poolMat = new THREE.MeshBasicMaterial({ map: M.soft, color: 0xFF5A40, transparent: true, opacity: 0, depthWrite: false, toneMapped: false });
    var pool = new THREE.Mesh(new THREE.PlaneGeometry(22, 22), poolMat);
    pool.rotation.x = -Math.PI / 2; pool.position.y = 0.2; pool.renderOrder = 1;
    pool.userData.keep = true;
    g.add(pool);
    var api = {
      group: g, lit: 0,
      set: function (x) {
        api.lit = x;
        epoxy.emissiveIntensity = 0.7 * x;
        dieMat.emissiveIntensity = 6 * x;
        coreMat.opacity = 0.9 * x;
        core.visible = x > 0.01;
        sp.material.opacity = 0.85 * x;
        sp.visible = x > 0.01;
        poolMat.opacity = 0.32 * x;
        pool.visible = x > 0.01;
      },
      path: function (fromAnode) {
        var p = [[-1.27, 0.9, 0], [-1.27, LIFT + 1.5, 0], [-0.5, LIFT + 4.6, 0], [0.5, LIFT + 4.6, 0], [1.27, LIFT + 1.5, 0], [1.27, 0.9, 0]];
        return fromAnode ? p : p.slice().reverse();
      }
    };
    api.set(0);
    return api;
  }

  var BAND = { 0: '#1B1B1B', 1: '#6B3A1F', 2: '#C42B1C', 3: '#E07A1F', 4: '#E8C21A', 5: '#2E8B3A', 6: '#2A58C7', 7: '#7A3BB0', 8: '#8A8A8A', 9: '#F2F2F2' };
  function bandsFor(ohms) {
    var e = Math.floor(Math.log(ohms) / Math.LN10) - 1;
    var sig = Math.round(ohms / Math.pow(10, e));
    if (sig >= 100) { sig = Math.round(sig / 10); e += 1; }
    return [BAND[Math.floor(sig / 10)], BAND[sig % 10], BAND[e]];
  }
  /* Axial resistor along local x; pads at x = ±5,08. */
  function resistor(M, ohms) {
    var THREE = TH();
    var g = new THREE.Group();
    var YB = 2.9, L2 = 3.15;
    var prof = [], N = 48;
    for (var i = 0; i <= N; i++) {
      var y = -L2 + 2 * L2 * i / N, ay = Math.abs(y);
      var r = 1.1 + 0.12 * sm((ay - 1.6) / 0.7);
      var endR = 0.5;
      if (ay > L2 - endR) r *= Math.sqrt(Math.max(0, 1 - Math.pow((ay - (L2 - endR)) / endR, 2)));
      prof.push(new THREE.Vector2(Math.max(0.001, r), y));
    }
    var bands = bandsFor(ohms);
    var tex = canvasTex(8, 256, function (c, w, h) {
      c.fillStyle = '#E3D2B0'; c.fillRect(0, 0, w, h);
      function band(y0, y1, col) { c.fillStyle = col; c.fillRect(0, h * (y0 + L2) / (2 * L2), w, h * (y1 - y0) / (2 * L2)); }
      band(-2.25, -1.7, bands[0]); band(-1.35, -0.85, bands[1]); band(-0.5, 0.0, bands[2]); band(1.35, 1.85, '#C9A13B');
    });
    tex.flipY = false;
    var body = new THREE.Mesh(new THREE.LatheGeometry(prof, 28), stdMat(0xffffff, 0.55, 0, { map: tex }));
    body.rotation.z = -Math.PI / 2;
    body.position.y = YB;
    g.add(body);
    [-1, 1].forEach(function (s) {
      var w = K.wire([[s * 3.0, YB, 0], [s * 4.1, YB, 0], [s * 5.0, YB - 0.9, 0], [s * 5.08, 1.0, 0], [s * 5.08, -0.2, 0]], { radius: 0.3, material: M.tin, segments: 24, radial: 8 });
      w.castShadow = false;
      g.add(w);
    });
    return {
      group: g,
      path: function (fromNeg) {
        var p = [[-5.08, 0.9, 0], [-5.08, YB - 0.2, 0], [-3.4, YB + 1.35, 0], [3.4, YB + 1.35, 0], [5.08, YB - 0.2, 0], [5.08, 0.9, 0]];
        return fromNeg ? p : p.slice().reverse();
      }
    };
  }

  /* TO-92 NPN transistor: flat face toward +z. Pads E(-2,54,0) B(0,-2,5) C(2,54,0). */
  function to92(M) {
    var THREE = TH();
    var g = new THREE.Group();
    var Y0 = 3.2, HT = 5.0;
    var s = new THREE.Shape();
    var a0 = Math.asin(1.4 / 2.4);
    s.absarc(0, 0, 2.4, a0, Math.PI - a0, true);
    s.lineTo(Math.cos(a0) * 2.4, 1.4);
    var geo = new THREE.ExtrudeGeometry(s, { depth: HT, bevelEnabled: true, bevelThickness: 0.2, bevelSize: 0.18, bevelSegments: 2, curveSegments: 28 });
    geo.rotateX(Math.PI / 2);
    geo.translate(0, Y0 + HT, 0);
    var body = new THREE.Mesh(geo, M.black);
    body.castShadow = true;
    g.add(body);
    var face = decal(3.6, 3.2, 40, function (c, w, h) {
      c.fillStyle = 'rgba(205,208,214,0.9)';
      c.textAlign = 'center'; c.textBaseline = 'middle';
      c.font = '500 1.05px "IBM Plex Mono", monospace';
      c.fillText('NPN', w / 2, h * 0.36);
      c.font = '400 0.8px "IBM Plex Mono", monospace';
      c.fillText('E B C', w / 2, h * 0.7);
    });
    face.position.set(0, Y0 + HT / 2 + 0.2, 1.62);
    g.add(face);
    [[-2.54, 0], [0, -2.5], [2.54, 0]].forEach(function (p, i) {
      var top = [p[0] * 0.5, Y0 + 0.2, 0];
      var pts = i === 1 ? [[0, Y0 + 0.2, 0], [0, Y0 - 1.0, 0], [0, 1.6, -2.0], [0, 0.6, -2.5], [0, -0.2, -2.5]] : [top, [p[0] * 0.5, Y0 - 0.8, 0], [p[0], 1.4, 0], [p[0], -0.2, 0]];
      var w = K.wire(pts, { radius: 0.24, material: M.tin, segments: 20, radial: 6, tension: 0.2 });
      w.castShadow = false;
      g.add(w);
    });
    return {
      group: g,
      ce: function (fromE) {
        var p = [[-2.54, 0.9, 0], [-1.2, Y0 + 1.8, 0.4], [1.2, Y0 + 1.8, 0.4], [2.54, 0.9, 0]];
        return fromE ? p : p.slice().reverse();
      },
      eb: function () { return [[-2.54, 0.9, 0], [-0.8, Y0 + 1.4, -0.3], [0, 0.9, -2.5]]; }
    };
  }

  /* World-space helpers for parts placed on a board */
  function place(obj, x, z, rotY) {
    var g = obj.group || obj;
    g.position.set(x, 0, z);
    g.rotation.y = rotY || 0;
    return obj;
  }
  function toWorld(pts, x, z, rotY) {
    var c = Math.cos(rotY || 0), s = Math.sin(rotY || 0);
    return pts.map(function (p) { return [x + p[0] * c + p[2] * s, p[1], z - p[0] * s + p[2] * c]; });
  }
  function flat(pts2, y) { return pts2.map(function (p) { return [p[0], y, p[1]]; }); }

  /* Miniature E10 bulb in a black socket. Pads at local x = ±6. */
  function bulb(M) {
    var THREE = TH();
    var g = new THREE.Group();
    var sock = new THREE.Mesh(new THREE.CylinderGeometry(5.9, 6.3, 6, 36), M.black);
    sock.position.y = 3.0; sock.castShadow = true; sock.receiveShadow = true;
    g.add(sock);
    var collar = new THREE.Mesh(new THREE.CylinderGeometry(5.1, 5.3, 1.8, 36), M.brass);
    collar.position.y = 6.9;
    g.add(collar);
    var thread = new THREE.Mesh(new THREE.CylinderGeometry(4.6, 4.6, 1.6, 36), M.brass);
    thread.position.y = 8.4;
    g.add(thread);
    [-1, 1].forEach(function (s) {
      var tab = new THREE.Mesh(rbox(3.4, 0.6, 2.4, 0.2, 1), M.brass);
      tab.position.set(s * 6.2, 0.35, 0);
      g.add(tab);
    });
    var prof = [];
    var N = 26;
    for (var i = 0; i <= N; i++) {
      var f = i / N, y = 9.2 + f * 15.6, r;
      if (f < 0.16) r = 3.9 + 0.25 * f / 0.16;
      else if (f < 0.6) r = 4.15 + 2.35 * Math.sin((f - 0.16) / 0.44 * Math.PI / 2);
      else r = 6.5 * Math.sqrt(Math.max(0, 1 - Math.pow((f - 0.6) / 0.4, 2)));
      prof.push(new THREE.Vector2(Math.max(0.001, r), y));
    }
    var glassMat = new THREE.MeshPhysicalMaterial({ color: 0xF4F1EA, roughness: 0.04, metalness: 0, transparent: true, opacity: 0.34, clearcoat: 1, clearcoatRoughness: 0.03, depthWrite: false, emissive: new THREE.Color(0xFFCF85), emissiveIntensity: 0 });
    var glass = new THREE.Mesh(new THREE.LatheGeometry(prof, 40), glassMat);
    glass.renderOrder = 4;
    glass.userData.keep = true;
    g.add(glass);
    var supG = new THREE.CylinderGeometry(0.16, 0.16, 6.2, 6);
    [-1.7, 1.7].forEach(function (x) {
      var w = new THREE.Mesh(supG, M.steel);
      w.position.set(x, 12.9, 0);
      w.rotation.z = x > 0 ? -0.06 : 0.06;
      g.add(w);
    });
    var pts = [];
    for (i = 0; i <= 90; i++) {
      var t = i / 90, a = TAU * 7 * t;
      pts.push(new THREE.Vector3(-1.7 + 3.4 * t, 16.2 + 0.45 * Math.sin(a), 0.45 * Math.cos(a)));
    }
    var filMat = stdMat(0x6E6A66, 0.4, 0.8, { emissive: new THREE.Color(0xFFC46B), emissiveIntensity: 0 });
    var fil = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 140, 0.15, 5), filMat);
    fil.userData.keep = true;
    g.add(fil);
    var sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: M.soft, color: 0xF2C46B, transparent: true, opacity: 0, depthWrite: false, toneMapped: false }));
    sp.position.set(0, 16.5, 0);
    sp.scale.set(36, 36, 1);
    sp.renderOrder = 7;
    g.add(sp);
    var poolMat = new THREE.MeshBasicMaterial({ map: M.soft, color: 0xF2C46B, transparent: true, opacity: 0, depthWrite: false, toneMapped: false });
    var pool = new THREE.Mesh(new THREE.PlaneGeometry(44, 44), poolMat);
    pool.rotation.x = -Math.PI / 2; pool.position.y = 0.25; pool.renderOrder = 1;
    pool.userData.keep = true;
    g.add(pool);
    var api = {
      group: g, lit: 0,
      set: function (x) {
        api.lit = x;
        filMat.emissiveIntensity = 4.5 * x;
        glassMat.emissiveIntensity = 0.55 * x;
        glassMat.opacity = 0.34 + 0.26 * x;
        sp.material.opacity = 0.95 * x; sp.visible = x > 0.01;
        poolMat.opacity = 0.42 * x; pool.visible = x > 0.01;
      },
      path: function () { return [[-6, 0.9, 0], [-5, 4, 0], [-1.7, 9.5, 0], [1.7, 9.5, 0], [5, 4, 0], [6, 0.9, 0]]; }
    };
    api.set(0);
    return api;
  }

  /* Miniature toggle switch; the lever leans to +x for 1 and to -x for 0. */
  function toggleSwitch(M, padAt) {
    var THREE = TH();
    var g = new THREE.Group();
    padAt = padAt || [0, 8.5];
    var dx = padAt[0], dz = padAt[1], ll = Math.hypot(dx, dz);
    var lead = new THREE.Mesh(rbox(1.3, 0.5, ll, 0.2, 1), M.tin);
    lead.position.set(dx / 2, 0.3, dz / 2);
    lead.rotation.y = Math.atan2(dx, dz);
    g.add(lead);
    var body = new THREE.Mesh(rbox(8.2, 7.6, 11.4, 0.8, 2), M.black);
    body.position.y = 3.8; body.castShadow = true; body.receiveShadow = true;
    g.add(body);
    var nut = new THREE.Mesh(new THREE.CylinderGeometry(4.5, 4.5, 1.5, 6), M.steel);
    nut.position.y = 8.35;
    g.add(nut);
    var bush = new THREE.Mesh(new THREE.CylinderGeometry(3.0, 3.0, 4.4, 28), M.steel);
    bush.position.y = 11.3;
    g.add(bush);
    var ring = new THREE.Mesh(new THREE.CylinderGeometry(3.15, 3.15, 0.5, 28), M.steel);
    ring.position.y = 12.9;
    g.add(ring);
    var lev = new THREE.Group();
    lev.position.y = 13.4;
    lev.userData.keep = true;
    g.add(lev);
    var chrome = stdMat(0xD9DDE2, 0.16, 1);
    var rod = new THREE.Mesh(new THREE.CylinderGeometry(1.15, 0.95, 10.5, 20), chrome);
    rod.position.y = 5.25; rod.castShadow = true;
    lev.add(rod);
    var tip = new THREE.Mesh(new THREE.SphereGeometry(1.3, 20, 14), chrome);
    tip.position.y = 10.6;
    lev.add(tip);
    var api = {
      group: g, v: 0,
      set: function (x) { api.v = x; lev.rotation.z = -(x * 2 - 1) * 0.44; }
    };
    api.set(0);
    return api;
  }

  /* A pair of transistor switches at a junction. Input pad at local (-7,5, 0);
   * outputs (7,5, -3,5) and (7,5, 3,5); gate pads (0, -8) and (0, 8).
   * Channel "0" leads to the -z output, channel "1" to the +z output. */
  function forkModule(M) {
    var THREE = TH();
    var outer = new THREE.Group();
    var g = new THREE.Group();
    var SC = 1.25;
    g.scale.set(SC, 1, SC);
    outer.add(g);
    var body = new THREE.Mesh(rbox(11, 2.6, 12, 0.7, 2), M.black);
    body.position.y = 1.5; body.castShadow = true;
    g.add(body);
    var leadG = rbox(2.4, 0.5, 1.1, 0.15, 1);
    [[-6.3, 0, 0], [6.3, -3.5, 0], [6.3, 3.5, 0], [0, -6.6, 1], [0, 6.6, 1]].forEach(function (p) {
      var l = new THREE.Mesh(leadG, M.tin);
      l.position.set(p[0], 0.35, p[1]);
      if (p[2]) l.rotation.y = Math.PI / 2;
      g.add(l);
    });
    var top = decal(10.4, 11.4, 40, function (c, w, h) {
      c.fillStyle = 'rgba(232,234,238,0.85)';
      c.textAlign = 'center'; c.textBaseline = 'middle';
      c.font = '600 2.4px "IBM Plex Mono", monospace';
      c.fillText('0', w * 0.8, h * 0.15);
      c.fillText('1', w * 0.8, h * 0.85);
      c.strokeStyle = 'rgba(232,234,238,0.35)'; c.lineWidth = 0.18;
      c.strokeRect(0.5, 0.5, w - 1, h - 1);
    });
    top.rotation.x = -Math.PI / 2;
    top.position.y = 2.82;
    g.add(top);
    function bar(x0, z0, x1, z1, mat) {
      var len = Math.hypot(x1 - x0, z1 - z0);
      var m = new THREE.Mesh(rbox(len, 0.3, 1.05, 0.14, 1), mat);
      m.position.set((x0 + x1) / 2, 2.95, (z0 + z1) / 2);
      m.rotation.y = -Math.atan2(z1 - z0, x1 - x0);
      return m;
    }
    var stemMat = stdMat(0xC98C5E, 0.34, 0.88);
    g.add(bar(-5.2, 0, -2.6, 0, stemMat));
    var chMat = [0, 1].map(function () { return stdMat(0x4E4640, 0.5, 0.4, { emissive: new THREE.Color(0xD06A35), emissiveIntensity: 0 }); });
    var chU = bar(-2.6, 0, 4.4, -3.4, chMat[0]); chU.userData.keep = true; g.add(chU);
    var chL = bar(-2.6, 0, 4.4, 3.4, chMat[1]); chL.userData.keep = true; g.add(chL);
    var off = new THREE.Color(0x4E4640), on = new THREE.Color(0xD8A070);
    var api = {
      group: outer, k: [0, 0],
      set: function (onU, onL) {
        api.k = [onU, onL];
        [onU, onL].forEach(function (x, i) {
          chMat[i].color.copy(off).lerp(on, x);
          chMat[i].metalness = 0.4 + 0.5 * x;
          chMat[i].emissiveIntensity = 0.9 * x;
        });
      },
      path: function (lower) {
        var zs = lower ? 3.5 : -3.5;
        return [[-7.5, 0.9, 0], [-5.4, 3.5, 0], [-2.6, 3.7, 0], [4.4, 3.7, zs * 0.97], [6.6, 2.6, zs], [7.5, 0.9, zs]].map(function (p) { return [p[0] * SC, p[1], p[2] * SC]; });
      }
    };
    api.set(0, 0);
    return api;
  }

  /* ==================================================================
   * 4 · switch-yard  (W 1120 × 380)
   * ================================================================== */
  K.register('switch-yard', function (el, opts) {
    var THREE = TH();
    opts = opts || {};
    var theme = opts.theme || 'light';
    ensureRelative(el);
    var VIEW = { yaw: 0, pitch: 0.9, distance: 362, target: [-4, 0, 2] };
    var v = K.stage3d(el, {
      theme: theme, fov: 20, yaw: VIEW.yaw, pitch: VIEW.pitch, distance: VIEW.distance, target: VIEW.target,
      size: 150, ground: -1.62, near: 30, far: 3000, minYaw: -0.7, maxYaw: 0.7, minPitch: 0.45, maxPitch: 1.35, minDistance: 200, maxDistance: 480
    });
    if (v.lights) {
      v.lights.key.position.set(-80, 280, 150);
      v.lights.key.intensity = 1.45;
      v.lights.hemi.intensity = 0.42;
    }
    mmShadows(v);
    var M = circuitMats();
    var S = v.scene;
    var SR = new THREE.Group();
    S.add(SR);
    var BX0 = -136, BX1 = 134, BZ0 = -54, BZ1 = 58;
    var BW = BX1 - BX0, BD = BZ1 - BZ0, BCX = (BX0 + BX1) / 2, BCZ = (BZ0 + BZ1) / 2;
    var board = new THREE.Mesh(rbox(BW, 1.3, BD, 0.5, 2), M.core);
    board.position.set(BCX, -0.95, BCZ); board.receiveShadow = true; board.castShadow = true;
    SR.add(board);
    var mask = new THREE.Mesh(rbox(BW - 0.3, 0.16, BD - 0.3, 0.08, 1), M.board);
    mask.position.set(BCX, -0.08, BCZ); mask.receiveShadow = true;
    SR.add(mask);

    var TK = trackKit(S, M, { width: 2.8, halo: 9, staticRoot: SR });
    var DK = dotKit(S, 260, M, 0.95);
    var Y = 1.0;
    var LZ = { A: -39, B: -13, C: 13, D: 39 };
    var LX = 95, J1 = [-30, 0], J2A = [25, -22], J2B = [25, 22];
    var MX = 7.5 * 1.25, MZ = 3.5 * 1.25, MG = 8 * 1.25;

    /* silkscreen */
    var silk = decal(BW - 4, BD - 4, 6, function (c, w, h) {
      var ox = -BX0 - 2, oz = -BZ0 - 2;
      c.fillStyle = 'rgba(40,44,52,0.75)';
      c.textAlign = 'center'; c.textBaseline = 'middle';
      c.font = '600 3.6px "IBM Plex Mono", monospace';
      [J1[0], J2A[0]].forEach(function (x) {
        c.fillText('0', ox + x - 8.5, oz - 42);
        c.fillText('1', ox + x + 8.5, oz - 42);
      });
      c.font = '600 3.4px "IBM Plex Mono", monospace';
      c.fillText('−', ox - 64.5, oz - 11.5);
      c.fillText('+', ox - 64.5, oz + 11.5);
    });
    silk.rotation.x = -Math.PI / 2;
    silk.position.set(BCX, 0.02, BCZ);
    SR.add(silk);

    /* source */
    var bat = battery9V(M, 'R');
    place(bat, -105, 0, -Math.PI / 2);
    SR.add(bat);
    TK.joint(-69, -6.35); TK.joint(-69, 6.35);
    var inner = [[-69, 0.9, 6.35], [-70.5, 6.5, 6.35], [-75, 8.75, 6.35], [-92, 8.75, 6.35], [-92, 8.75, -6.35], [-75, 8.75, -6.35], [-70.5, 6.5, -6.35], [-69, 0.9, -6.35]];
    var innerLen = new Path3(inner).len;

    /* junction modules */
    var mods = [J1, J2A, J2B].map(function (p) {
      var m = forkModule(M);
      place(m, p[0], p[1], 0);
      SR.add(m.group);
      TK.pad(p[0] - MX, p[1]); TK.pad(p[0] + MX, p[1] - MZ); TK.pad(p[0] + MX, p[1] + MZ);
      TK.pad(p[0], p[1] - MG); TK.pad(p[0], p[1] + MG);
      return m;
    });
    /* lamps */
    var lamps = {};
    ['A', 'B', 'C', 'D'].forEach(function (k) {
      var b = bulb(M);
      place(b, LX, LZ[k], 0);
      SR.add(b.group);
      TK.joint(LX - 6, LZ[k]); TK.joint(LX + 6, LZ[k]);
      lamps[k] = b;
    });
    /* control switches */
    var swM = toggleSwitch(M); place(swM, J1[0], -43, 0); SR.add(swM.group);
    var swL = toggleSwitch(M); place(swL, J2A[0], -43, 0); SR.add(swL.group);
    TK.joint(J1[0], -34.5); TK.joint(J2A[0], -34.5);

    /* tracks */
    function T(n, p, o) { return TK.add(n, p, o); }
    T('trunk', [[-69, -6.35], [-58, -6.35], [-51, 0], [J1[0] - MX, 0]]);
    T('j1u', [[J1[0] + MX, -MZ], [-16, -MZ], [-3, -22], [J2A[0] - MX, -22]]);
    T('j1l', [[J1[0] + MX, MZ], [-16, MZ], [-3, 22], [J2B[0] - MX, 22]]);
    T('A', [[J2A[0] + MX, -22 - MZ], [40, -22 - MZ], [48, -39], [LX - 6, -39]]);
    T('B', [[J2A[0] + MX, -22 + MZ], [40, -22 + MZ], [48, -13], [LX - 6, -13]]);
    T('C', [[J2B[0] + MX, 22 - MZ], [40, 22 - MZ], [48, 13], [LX - 6, 13]]);
    T('D', [[J2B[0] + MX, 22 + MZ], [40, 22 + MZ], [48, 39], [LX - 6, 39]]);
    ['A', 'B', 'C', 'D'].forEach(function (k) { T('s' + k, [[LX + 6, LZ[k]], [112, LZ[k]]]); });
    T('bAB', [[112, -39], [112, -13]], { r: 0 });
    T('bBC', [[112, -13], [112, 13]], { r: 0 });
    T('bCD', [[112, 13], [112, 39]], { r: 0 });
    T('ret', [[112, 39], [112, 50], [-69, 50], [-69, 6.35]]);
    var cw = { width: 1.6, halo: 6 };
    T('ctlM', [[J1[0], -34.5], [J1[0], -MG]], cw);
    T('ctlL1', [[J2A[0], -34.5], [J2A[0], -22 - MG]], cw);
    T('ctlL2', [[J2A[0], -22 + MG], [J2B[0], 22 - MG]], cw);

    /* electron loops per code */
    var F = function (p) { return flat(p, Y); };
    function loopFor(code) {
      var hi = code.charAt(0) === '1', lo = code.charAt(1) === '1';
      var lamp = hi ? (lo ? 'D' : 'C') : (lo ? 'B' : 'A');
      var J2 = hi ? J2B : J2A;
      var pts = [].concat(
        F([[-69, -6.35], [-58, -6.35], [-51, 0], [J1[0] - MX, 0]]),
        toWorld(mods[0].path(hi), J1[0], J1[1], 0),
        F(fillet(hi ? [[J1[0] + MX, MZ], [-16, MZ], [-3, 22], [J2B[0] - MX, 22]] : [[J1[0] + MX, -MZ], [-16, -MZ], [-3, -22], [J2A[0] - MX, -22]], 2.6, 6)),
        toWorld(mods[hi ? 2 : 1].path(lo), J2[0], J2[1], 0),
        F(fillet(trackPts[lamp], 2.6, 6)),
        toWorld(lamps[lamp].path(), LX, LZ[lamp], 0),
        F([[LX + 6, LZ[lamp]], [112, LZ[lamp]], [112, 50], [-69, 50], [-69, 6.35]]),
        inner
      );
      var p = new Path3(densify(pts, 2));
      p.hide = [p.len - innerLen + 0.6, p.len - 0.4];
      p.lamp = lamp;
      var segs = ['trunk', hi ? 'j1l' : 'j1u', lamp, 's' + lamp, 'ret'];
      var order = ['A', 'B', 'C', 'D'], bus = ['bAB', 'bBC', 'bCD'];
      for (var i = order.indexOf(lamp); i < 3; i++) segs.push(bus[i]);
      p.segs = segs;
      return p;
    }
    var trackPts = {
      A: [[J2A[0] + MX, -22 - MZ], [40, -22 - MZ], [48, -39], [LX - 6, -39]],
      B: [[J2A[0] + MX, -22 + MZ], [40, -22 + MZ], [48, -13], [LX - 6, -13]],
      C: [[J2B[0] + MX, 22 - MZ], [40, 22 - MZ], [48, 13], [LX - 6, 13]],
      D: [[J2B[0] + MX, 22 + MZ], [40, 22 + MZ], [48, 39], [LX - 6, 39]]
    };
    var CODES = ['00', '01', '10', '11'];
    var loops = {};
    CODES.forEach(function (c) { loops[c] = loopFor(c); });
    bake(SR);

    /* labels */
    function lab(text, at, o) { o = o || {}; o.at = at; return v.label(text, o); }
    ['A', 'B', 'C', 'D'].forEach(function (k) {
      var L = lab(k, [117, 2, LZ[k]], { cls: 'name', align: 'left', dx: 2 });
      L.el.style.fontSize = '16px'; L.el.style.fontFamily = '"IBM Plex Mono", monospace';
    });
    var bitLab = [
      lab('', [J1[0] - 14, 2, -43], { cls: 'value', align: 'right' }),
      lab('', [J2A[0] - 14, 2, -43], { cls: 'value', align: 'right' })
    ];
    bitLab.forEach(function (L) { L.el.style.fontSize = '13px'; });
    var lTr = lab('transistör anahtarlar', [J2B[0], 3, J2B[1] + MG], { cls: 'note', dx: -34, dy: 22, line: true, align: 'right' });
    lTr.el.style.textShadow = '0 0 3px #F4F3EE, 0 0 3px #F4F3EE, 0 0 3px #F4F3EE';
    lab('elektronlar · hız abartılı', [BX0 + 4, 0, BZ1 - 3], { cls: 'tag', align: 'left' });

    /* state */
    var st = { auto: true, code: '00' };
    var STEP = 3.0;
    var bitAnim = [0, 0], chan = [[1, 0], [1, 0], [1, 0]], lampLv = { A: 0, B: 0, C: 0, D: 0 }, pathLv = {}, phase = 0;
    CODES.forEach(function (c) { pathLv[c] = 0; });
    function codeAt(t) { return CODES[Math.floor(t / STEP) % 4]; }
    function reset() {
      st.auto = !K.reducedMotion;
      st.code = K.reducedMotion ? '10' : '00';
      bitAnim = [+st.code.charAt(0), +st.code.charAt(1)];
      CODES.forEach(function (c) { pathLv[c] = 0; });
      Object.keys(lampLv).forEach(function (k) { lampLv[k] = 0; });
      phase = 0;
      TK.list.forEach(function (t) { t.act = 0; t.target = 0; });
      v.setView(VIEW);
    }
    reset();

    function frame(t, dt) {
      if (st.auto) st.code = codeAt(t);
      var bits = [+st.code.charAt(0), +st.code.charAt(1)];
      for (var i = 0; i < 2; i++) {
        var sp = dt / 0.35;
        bitAnim[i] = bitAnim[i] < bits[i] ? Math.min(bits[i], bitAnim[i] + sp) : Math.max(bits[i], bitAnim[i] - sp);
      }
      swM.set(easeIO(bitAnim[0])); swL.set(easeIO(bitAnim[1]));
      /* the transistors follow the gate voltage once the lever has moved */
      var gM = bitAnim[0] > 0.5 ? 1 : 0, gL = bitAnim[1] > 0.5 ? 1 : 0;
      var settled = Math.abs(bitAnim[0] - bits[0]) < 0.01 && Math.abs(bitAnim[1] - bits[1]) < 0.01;
      var cs = [[1 - gM, gM], [1 - gL, gL], [1 - gL, gL]];
      for (i = 0; i < 3; i++) {
        chan[i][0] = approach(chan[i][0], cs[i][0], 16, dt);
        chan[i][1] = approach(chan[i][1], cs[i][1], 16, dt);
        mods[i].set(chan[i][0], chan[i][1]);
      }
      var live = settled ? st.code : null;
      CODES.forEach(function (c) { pathLv[c] = approach(pathLv[c], c === live ? 1 : 0, 12, dt); if (pathLv[c] < 0.003) pathLv[c] = 0; });
      TK.clearTargets();
      CODES.forEach(function (c) {
        if (pathLv[c] <= 0) return;
        loops[c].segs.forEach(function (n) { TK.tracks[n].target = Math.max(TK.tracks[n].target, pathLv[c]); });
      });
      TK.tracks.ctlM.target = bitAnim[0] > 0.5 ? 1 : 0;
      TK.tracks.ctlL1.target = TK.tracks.ctlL2.target = bitAnim[1] > 0.5 ? 1 : 0;
      TK.update(dt);
      ['A', 'B', 'C', 'D'].forEach(function (k) {
        var target = 0;
        CODES.forEach(function (c) { if (loops[c].lamp === k) target = Math.max(target, pathLv[c]); });
        lampLv[k] = target;
        lamps[k].set(target);
      });
      phase += (K.reducedMotion ? 0 : 16) * dt;
      DK.begin();
      CODES.forEach(function (c) { if (pathLv[c] > 0.02) DK.loop(loops[c], phase, 5.2, pathLv[c], loops[c].hide); });
      DK.end();
      bitLab[0].set('1. bit = ' + bits[0]);
      bitLab[1].set('2. bit = ' + bits[1]);
      bitLab[0].el.style.color = bits[0] ? P.copper : P.muted;
      bitLab[1].el.style.color = bits[1] ? P.copper : P.muted;
      v.render(dt);
      drawOverlay(bits);
    }

    function lampOf(code) { return { '00': 'A', '01': 'B', '10': 'C', '11': 'D' }[code]; }
    function drawOverlay(bits) {
      var c = v.ctx;
      if (!c) return;
      var W = v.w, H = v.h, sx = W / 1120;
      var y = H - 24;
      var x0 = 24 * sx;
      K.label(c, 'Kod ' + st.code + ' → ' + lampOf(st.code) + ' lambası yanar', x0, y, { size: 19, mono: true, weight: 600, color: P.ink });
      var tx = 520 * sx;
      CODES.forEach(function (code, i) {
        var xx = tx + i * 118 * sx;
        var act = code === st.code;
        if (act) { c.fillStyle = K.rgba(P.copperFill, 0.15); K.rr(c, xx - 10, y - 18, 98, 26, 6); c.fill(); }
        K.label(c, code + ' → ' + lampOf(code), xx, y, { size: 15, mono: true, weight: act ? 600 : 400, color: act ? P.copper : P.muted });
      });
      K.label(c, 'transistör: 0 gelince üst yoldan, 1 gelince alt yoldan akım geçer', W - 16 * sx, 18, { size: 13, color: P.muted, align: 'right' });
    }

    return {
      reset: reset,
      frame: frame,
      set: function (k, val) {
        if (k !== 'code') return;
        var s = String(val);
        if (s.length === 1) s = '0' + s;
        if (CODES.indexOf(s) < 0) return;
        st.auto = false;
        st.code = s;
      },
      read: function (k) {
        if (k === 'route') return 'Kod ' + st.code + ' → ' + lampOf(st.code) + ' lambası yanar';
        return '';
      },
      resize: function () { v.sf.resize(); },
      dispose: function () { v.dispose(); }
    };
  });

  /* Logic gate block in the distinctive (ANSI/IEEE) outline, extruded.
   * kind: 'and' | 'xor'. Inputs at local (-16, ±5), output at (+16, 0). */
  function gateBlock(M, kind, text) {
    var THREE = TH();
    var g = new THREE.Group();
    var H = 4.0;
    var sh = new THREE.Shape();
    if (kind === 'and') {
      sh.moveTo(-11, -10); sh.lineTo(0, -10);
      sh.absarc(0, 0, 10, -Math.PI / 2, Math.PI / 2, false);
      sh.lineTo(-11, 10); sh.lineTo(-11, -10);
    } else {
      sh.moveTo(-10, -10);
      sh.quadraticCurveTo(3, -10, 12, 0);
      sh.quadraticCurveTo(3, 10, -10, 10);
      sh.quadraticCurveTo(-4.5, 0, -10, -10);
    }
    var ex = { depth: H, bevelEnabled: true, bevelThickness: 0.6, bevelSize: 0.55, bevelSegments: 3, curveSegments: 36 };
    var geo = new THREE.ExtrudeGeometry(sh, ex);
    geo.rotateX(-Math.PI / 2);
    geo.translate(0, 0.6, 0);
    var body = new THREE.Mesh(geo, M.gate);
    body.castShadow = true; body.receiveShadow = true;
    g.add(body);
    if (kind === 'xor') {
      var arc = new THREE.Shape();
      arc.moveTo(-14.6, -10);
      arc.quadraticCurveTo(-9.1, 0, -14.6, 10);
      arc.lineTo(-13.2, 10);
      arc.quadraticCurveTo(-7.7, 0, -13.2, -10);
      arc.lineTo(-14.6, -10);
      var ag = new THREE.ExtrudeGeometry(arc, { depth: H, bevelEnabled: true, bevelThickness: 0.4, bevelSize: 0.3, bevelSegments: 2, curveSegments: 30 });
      ag.rotateX(-Math.PI / 2);
      ag.translate(0, 0.4, 0);
      var am = new THREE.Mesh(ag, M.gate);
      am.castShadow = true;
      g.add(am);
    }
    var top = decal(24, 12, 30, function (c, w, h) {
      c.fillStyle = 'rgba(238,240,243,0.92)';
      c.textAlign = 'center'; c.textBaseline = 'middle';
      if (text.length > 4) {
        c.font = '600 2.7px "IBM Plex Sans", sans-serif';
        var parts = text.split(' ');
        c.fillText(parts[0], w / 2, h * 0.36);
        c.fillText(parts[1], w / 2, h * 0.64);
      } else {
        c.font = '600 4.6px "IBM Plex Sans", sans-serif';
        c.fillText(text, w / 2, h / 2);
      }
    });
    top.rotation.x = -Math.PI / 2;
    top.position.set(kind === 'and' ? -1.5 : 0.2, H + 1.25, 0);
    g.add(top);
    /* pins */
    var pinG = rbox(4.2, 0.6, 1.2, 0.2, 1);
    [[-13.6, -5], [-13.6, 5], [kind === 'and' ? 12.6 : 14.6, 0]].forEach(function (p) {
      var m = new THREE.Mesh(pinG, M.tin);
      m.position.set(p[0], 0.4, p[1]);
      g.add(m);
    });
    return { group: g };
  }

  /* ==================================================================
   * 6 · half-adder  (S 680 × 520)
   * ================================================================== */
  K.register('half-adder', function (el, opts) {
    var THREE = TH();
    opts = opts || {};
    var theme = opts.theme || 'light';
    ensureRelative(el);
    var VIEW = { yaw: 0, pitch: 0.92, distance: 262, target: [2, 0, 32] };
    var v = K.stage3d(el, {
      theme: theme, fov: 26, yaw: VIEW.yaw, pitch: VIEW.pitch, distance: VIEW.distance, target: VIEW.target,
      size: 110, ground: -1.62, near: 30, far: 3000, minYaw: -0.8, maxYaw: 0.8, minPitch: 0.45, maxPitch: 1.35, minDistance: 180, maxDistance: 460
    });
    if (v.lights) {
      v.lights.key.position.set(-60, 230, 120);
      v.lights.key.intensity = 1.45;
      v.lights.hemi.intensity = 0.42;
    }
    mmShadows(v);
    var M = circuitMats();
    M.gate = stdMat(0x2C3038, 0.4, 0.05, { envMapIntensity: 0.9 });
    var S = v.scene;
    var SR = new THREE.Group();
    S.add(SR);
    var BX0 = -76, BX1 = 80, BZ0 = -46, BZ1 = 48;
    var BW = BX1 - BX0, BD = BZ1 - BZ0, BCX = (BX0 + BX1) / 2, BCZ = (BZ0 + BZ1) / 2;
    var board = new THREE.Mesh(rbox(BW, 1.3, BD, 0.5, 2), M.core);
    board.position.set(BCX, -0.95, BCZ); board.receiveShadow = true; board.castShadow = true;
    SR.add(board);
    var mask = new THREE.Mesh(rbox(BW - 0.3, 0.16, BD - 0.3, 0.08, 1), M.board);
    mask.position.set(BCX, -0.08, BCZ); mask.receiveShadow = true;
    SR.add(mask);

    var TK = trackKit(S, M, { width: 2.3, halo: 8, staticRoot: SR });
    var GX = 6, GXOR = -21, GAND = 21;
    var AX = -58, BXs = -33;

    /* parts */
    var swA = toggleSwitch(M, [7, 0]); place(swA, AX, 0, 0); SR.add(swA.group);
    var swB = toggleSwitch(M, [7, 0]); place(swB, BXs, 0, 0); SR.add(swB.group);
    var gx = gateBlock(M, 'xor', 'ÖZEL VEYA'); place(gx, GX, GXOR, 0); SR.add(gx.group);
    var ga = gateBlock(M, 'and', 'VE'); place(ga, GX, GAND, 0); SR.add(ga.group);
    var rS = resistor(M, 220); place(rS, 40, GXOR, 0); SR.add(rS.group);
    var rC = resistor(M, 220); place(rC, 40, GAND, 0); SR.add(rC.group);
    var ledS = led5(M); place(ledS, 56, GXOR, 0); SR.add(ledS.group);
    var ledC = led5(M); place(ledC, 56, GAND, 0); SR.add(ledC.group);
    [[AX + 7, 0], [BXs + 7, 0], [GX - 16, GXOR - 5], [GX - 16, GXOR + 5], [GX - 16, GAND - 5], [GX - 16, GAND + 5],
     [GX + 17.2, GXOR], [GX + 15.2, GAND], [34.92, GXOR], [45.08, GXOR], [34.92, GAND], [45.08, GAND],
     [54.73, GXOR], [57.27, GXOR], [54.73, GAND], [57.27, GAND]].forEach(function (p) { TK.joint(p[0], p[1]); });

    /* silkscreen */
    var silk = decal(BW - 4, BD - 4, 7, function (c, w, h) {
      var ox = -BX0 - 2, oz = -BZ0 - 2;
      c.fillStyle = 'rgba(40,44,52,0.75)';
      c.textAlign = 'center'; c.textBaseline = 'middle';
      c.font = '600 4.2px "IBM Plex Mono", monospace';
      [AX, BXs].forEach(function (x) { c.fillText('0', ox + x - 7.5, oz - 9.5); c.fillText('1', ox + x + 7.5, oz - 9.5); });
      c.font = '500 2.6px "IBM Plex Mono", monospace';
    });
    silk.rotation.x = -Math.PI / 2;
    silk.position.set(BCX, 0.02, BCZ);
    SR.add(silk);

    /* tracks: A embraces B so nothing crosses */
    var T = function (n, p, o) { return TK.add(n, p, o); };
    T('a0', [[AX + 7, 0], [-46, 0]]);
    T('aU', [[-46, 0], [-46, GXOR - 5], [GX - 16, GXOR - 5]]);
    T('aL', [[-46, 0], [-46, GAND + 5], [GX - 16, GAND + 5]]);
    T('b0', [[BXs + 7, 0], [-21, 0]]);
    T('bU', [[-21, 0], [-21, GXOR + 5], [GX - 16, GXOR + 5]]);
    T('bL', [[-21, 0], [-21, GAND - 5], [GX - 16, GAND - 5]]);
    T('s1', [[GX + 17.2, GXOR], [34.92, GXOR]]);
    T('s2', [[45.08, GXOR], [54.73, GXOR]]);
    T('c1', [[GX + 15.2, GAND], [34.92, GAND]]);
    T('c2', [[45.08, GAND], [54.73, GAND]]);
    T('gS', [[57.27, GXOR], [70, GXOR], [70, 0]]);
    T('gC', [[57.27, GAND], [70, GAND], [70, 0]]);
    T('gnd', [[70, 0], [70, 38]], { r: 0 });
    TK.joint(70, 38);
    bake(SR);

    /* labels */
    function lab(text, at, o) { o = o || {}; o.at = at; return v.label(text, o); }
    var lA = lab('', [AX, 2, 9], { cls: 'value', align: 'center', valign: 'top' });
    var lB = lab('', [BXs, 2, 9], { cls: 'value', align: 'center', valign: 'top' });
    [lA, lB].forEach(function (L) { L.el.style.fontSize = '15px'; });
    var lS = lab('', [56, 9, GXOR - 6], { cls: 'value', align: 'center', valign: 'bottom' });
    var lC = lab('', [56, 9, GAND + 10], { cls: 'value', align: 'center', valign: 'top' });
    [lS, lC].forEach(function (L) { L.el.style.fontSize = '14px'; });
    lab('parlayan hat = 1 (gerilim var) · sönük hat = 0', [BX0 + 3, 0, BZ1 - 4], { cls: 'note', align: 'left' });
    var pinTags = [
      { at: [GX - 19.5, 2, GXOR - 5], f: function () { return IN.a; } },
      { at: [GX - 19.5, 2, GXOR + 5], f: function () { return IN.b; } },
      { at: [GX - 19.5, 2, GAND - 5], f: function () { return IN.b; } },
      { at: [GX - 19.5, 2, GAND + 5], f: function () { return IN.a; } },
      { at: [GX + 22, 2, GXOR], f: function () { return IN.a ^ IN.b; } },
      { at: [GX + 20, 2, GAND], f: function () { return IN.a & IN.b; } }
    ];
    pinTags.forEach(function (p) { p.L = lab('', p.at, { cls: 'value', dy: -11 }); p.L.el.style.fontSize = '12px'; p.L.el.style.fontWeight = '600'; });
    lab('basitleştirilmiş: kapı beslemeleri çizilmedi', [BX1 - 8, 0, BZ1 - 4], { cls: 'note', align: 'right' });

    /* state */
    var st = { auto: true };
    var IN = { a: 0, b: 0 };
    var STEP = 3.0;
    var lv = { a: 0, b: 0, s: 0, c: 0 }, anim = { a: 0, b: 0 };
    function autoAt(t) { var k = Math.floor(t / STEP) % 4; return { a: k >> 1, b: k & 1 }; }
    function reset() {
      st.auto = !K.reducedMotion;
      IN = K.reducedMotion ? { a: 1, b: 1 } : autoAt(0);
      anim.a = IN.a; anim.b = IN.b;
      lv = { a: IN.a, b: IN.b, s: IN.a ^ IN.b, c: IN.a & IN.b };
      TK.list.forEach(function (t) { t.act = 0; t.target = 0; });
      v.setView(VIEW);
    }
    reset();

    function frame(t, dt) {
      if (st.auto) IN = autoAt(t);
      ['a', 'b'].forEach(function (k) {
        var sp = dt / 0.3;
        anim[k] = anim[k] < IN[k] ? Math.min(IN[k], anim[k] + sp) : Math.max(IN[k], anim[k] - sp);
      });
      swA.set(easeIO(anim.a)); swB.set(easeIO(anim.b));
      var a = anim.a > 0.5 ? 1 : 0, b = anim.b > 0.5 ? 1 : 0;
      var sum = a ^ b, car = a & b;
      lv.a = approach(lv.a, a, 14, dt); lv.b = approach(lv.b, b, 14, dt);
      lv.s = approach(lv.s, sum, 11, dt); lv.c = approach(lv.c, car, 11, dt);
      TK.clearTargets();
      ['a0', 'aU', 'aL'].forEach(function (n) { TK.tracks[n].target = a; });
      ['b0', 'bU', 'bL'].forEach(function (n) { TK.tracks[n].target = b; });
      ['s1', 's2'].forEach(function (n) { TK.tracks[n].target = sum; });
      ['c1', 'c2'].forEach(function (n) { TK.tracks[n].target = car; });
      TK.tracks.gS.target = sum * 0.5; TK.tracks.gC.target = car * 0.5;
      TK.tracks.gnd.target = Math.max(sum, car) * 0.5;
      TK.update(dt);
      ledS.set(lv.s); ledC.set(lv.c);
      lA.set('A = ' + IN.a); lB.set('B = ' + IN.b);
      lA.el.style.color = IN.a ? P.copper : P.muted;
      lB.el.style.color = IN.b ? P.copper : P.muted;
      lS.set('Toplam = ' + (IN.a ^ IN.b)); lC.set('Elde = ' + (IN.a & IN.b));
      pinTags.forEach(function (p) { var vv = p.f(); p.L.set(String(vv)); p.L.el.style.color = vv ? P.copper : P.muted; });
      lS.el.style.color = (IN.a ^ IN.b) ? P.copper : P.muted;
      lC.el.style.color = (IN.a & IN.b) ? P.copper : P.muted;
      v.render(dt);
      draw2d();
    }

    function draw2d() {
      var c = v.ctx;
      if (!c) return;
      var W = v.w, H = v.h, sx = W / 680;
      var a = IN.a, b = IN.b, s = a ^ b, cr = a & b;
      var top = H - 150;
      c.save();
      c.strokeStyle = P.line; c.lineWidth = 1;
      c.beginPath(); c.moveTo(20 * sx, top - 8); c.lineTo(W - 20 * sx, top - 8); c.stroke();
      c.restore();
      /* column addition */
      var x1 = 112 * sx, y0 = top + 26;
      K.label(c, String(a), x1, y0, { size: 26, mono: true, weight: 600, color: P.ink, align: 'right' });
      K.label(c, 'A', x1 + 14, y0 - 2, { size: 12, mono: true, color: P.muted });
      K.label(c, '+', x1 - 44, y0 + 34, { size: 26, mono: true, weight: 500, color: P.ink2, align: 'right' });
      K.label(c, String(b), x1, y0 + 34, { size: 26, mono: true, weight: 600, color: P.ink, align: 'right' });
      K.label(c, 'B', x1 + 14, y0 + 32, { size: 12, mono: true, color: P.muted });
      c.save(); c.strokeStyle = P.ink2; c.lineWidth = 1.5;
      c.beginPath(); c.moveTo(x1 - 62, y0 + 46); c.lineTo(x1 + 6, y0 + 46); c.stroke(); c.restore();
      var cw = 31;
      if (cr) { c.fillStyle = K.rgba(P.copperFill, 0.16); K.rr(c, x1 - cw - 20, y0 + 52, 24, 34, 5); c.fill(); }
      if (s) { c.fillStyle = K.rgba(P.copperFill, 0.16); K.rr(c, x1 - 20, y0 + 52, 24, 34, 5); c.fill(); }
      K.label(c, String(cr), x1 - cw, y0 + 79, { size: 26, mono: true, weight: 600, color: cr ? P.copper : P.ink2, align: 'right' });
      K.label(c, String(s), x1, y0 + 79, { size: 26, mono: true, weight: 600, color: s ? P.copper : P.ink2, align: 'right' });
      K.label(c, 'elde', x1 - cw - 8, y0 + 101, { size: 10.5, mono: true, color: P.muted, align: 'center' });
      K.label(c, 'toplam', x1 - 4, y0 + 101, { size: 10.5, mono: true, color: P.muted, align: 'center' });
      /* sentence */
      var tx = 170 * sx;
      K.label(c, a + ' + ' + b + ' = ' + (cr ? '10' : String(s)) + ' (ikilik)', tx, y0 + 6, { size: 21, mono: true, weight: 600, color: P.ink });
      K.label(c, 'Onluk: ' + (a + b), tx, y0 + 36, { size: 16, mono: true, weight: 500, color: P.copper });
      var why = (a & b) ? ['İkilikte yalnız 0 ve 1 var:', '1 + 1 = 10, yani 0 yaz, 1 elde.'] : ['Sonuç tek basamağa sığar;', 'elde 0 kalır.'];
      K.label(c, why[0], tx, y0 + 64, { size: 12.5, color: P.muted });
      K.label(c, why[1], tx, y0 + 80, { size: 12.5, color: P.muted });
      K.label(c, 'ÖZEL VEYA: girişler farklıysa 1 · VE: ikisi de 1 ise 1', tx, y0 + 100, { size: 12, color: P.muted });
      /* truth table */
      var gx0 = 496 * sx, rowH = 17;
      var heads = ['A', 'B', 'Elde', 'Toplam', 'Onluk'], colX = [0, 26, 62, 108, 152];
      heads.forEach(function (hd, j) { K.label(c, hd, gx0 + colX[j] * sx, top + 8, { size: 11.5, mono: true, weight: 600, color: P.muted, align: 'center' }); });
      c.strokeStyle = P.line; c.beginPath(); c.moveTo(gx0 - 14, top + 15); c.lineTo(gx0 + 166 * sx, top + 15); c.stroke();
      for (var r = 0; r < 4; r++) {
        var ra = r >> 1, rb = r & 1, yy = top + 32 + r * rowH;
        var act = ra === a && rb === b;
        if (act) { c.fillStyle = K.rgba(P.copperFill, 0.15); K.rr(c, gx0 - 14, yy - 12, 180 * sx, 17, 4); c.fill(); }
        [ra, rb, ra & rb, ra ^ rb, ra + rb].forEach(function (val, j) {
          var isOut = j >= 2;
          K.label(c, String(val), gx0 + colX[j] * sx, yy, { size: 13.5, mono: true, weight: act ? 600 : 400, color: isOut && j < 4 && val ? P.copper : (act ? P.ink : P.muted), align: 'center' });
        });
      }
    }

    return {
      reset: reset,
      frame: frame,
      set: function (k, val) {
        if (k !== 'a' && k !== 'b') return;
        if (st.auto) { st.auto = false; IN = { a: IN.a, b: IN.b }; }   // keep what the buttons already show
        IN[k] = (val === 1 || val === '1' || val === true) ? 1 : 0;
      },
      read: function (k) {
        if (k === 'a' || k === 'b') return String(IN[k]);   // lets the deck mirror the demo on the toggle buttons
        var s = IN.a ^ IN.b, c = IN.a & IN.b;
        if (k === 'sum') return IN.a + ' + ' + IN.b + ' = ' + (c ? '10' : String(s)) + ' (ikilik)';
        if (k === 'decimal') return 'Onluk: ' + (IN.a + IN.b);
        return '';
      },
      resize: function () { v.sf.resize(); },
      dispose: function () { v.dispose(); }
    };
  });

  /* ==================================================================
   * Sensor parts (true size, mm)
   * ================================================================== */

  /* Serpentine CdS track of an LDR face, in face units (disc radius = 1).
   * Each sample: [u, v, du, dv] where (du, dv) points toward the + electrode. */
  function ldrTrack() {
    var runs = 6, u0 = -0.56, u1 = 0.56, v0 = -0.6, dv = 0.24, pts = [];
    for (var i = 0; i < runs; i++) {
      var v = v0 + i * dv, ltr = i % 2 === 0;
      var sideV = i % 2 === 0 ? -1 : 1;
      for (var k = 0; k <= 24; k++) {
        var f = k / 24, u = ltr ? lerp(u0, u1, f) : lerp(u1, u0, f);
        pts.push([u, v, 0, sideV]);
      }
      if (i < runs - 1) {
        var cxu = ltr ? u1 : u0, cv = v + dv / 2, r = dv / 2;
        for (k = 1; k < 12; k++) {
          var a = -Math.PI / 2 + Math.PI * k / 12;
          var x = ltr ? cxu + Math.cos(a) * r : cxu - Math.cos(a) * r, y = cv + Math.sin(a) * r;
          var nx = x - cxu, ny = y - cv, nl = Math.hypot(nx, ny) || 1;
          var out = ltr ? 1 : -1;
          pts.push([x, y, out * nx / nl, out * ny / nl]);
        }
      }
    }
    return { pts: pts, width: 0.085, u0: u0, u1: u1, v0: v0, dv: dv, runs: runs };
  }

  /* LDR: ceramic disc (Ø5,1 mm) facing +z, centre at the origin, leads downwards. */
  function ldrModel(M, track) {
    var THREE = TH();
    var g = new THREE.Group();
    var R = 2.55;
    var disc = new THREE.Mesh(new THREE.CylinderGeometry(R, R, 1.9, 48), stdMat(0xE9E1CD, 0.6, 0));
    disc.rotation.x = Math.PI / 2;
    disc.castShadow = true;
    g.add(disc);
    var face = decal(2 * R, 2 * R, 220, function (c, w, h) {
      var cx = w / 2, cy = h / 2;
      c.save();
      c.beginPath(); c.arc(cx, cy, R * 0.99, 0, TAU); c.clip();
      c.fillStyle = '#E9E1CD'; c.fillRect(0, 0, w, h);
      c.fillStyle = '#676D75'; c.beginPath(); c.arc(cx, cy, R * 0.86, 0, TAU); c.fill();
      c.strokeStyle = '#9A3713'; c.lineWidth = track.width * R * 2; c.lineJoin = 'round'; c.lineCap = 'round';
      c.beginPath();
      track.pts.forEach(function (p, i) { var x = cx + p[0] * R, y = cy - p[1] * R; if (i) c.lineTo(x, y); else c.moveTo(x, y); });
      c.stroke();
      c.restore();
    });
    face.position.z = 0.96;
    face.material.roughness = 0.8;
    face.material.envMapIntensity = 0.35;
    g.add(face);
    var coat = new THREE.Mesh(new THREE.SphereGeometry(12.6, 48, 6, 0, TAU, 0, 0.2), new THREE.MeshPhysicalMaterial({ color: 0xffffff, transparent: true, opacity: 0.16, roughness: 0.05, clearcoat: 1, depthWrite: false }));
    coat.rotation.x = Math.PI / 2;
    coat.position.z = 0.96 - 12.6 * Math.cos(0.2);
    coat.renderOrder = 3;
    g.add(coat);
    return { group: g, R: R };
  }

  /* NTC thermistor bead on two leads; optional quarter cut-away with an inner face. */
  function ntcModel(M, cut, ends) {
    var THREE = TH();
    var g = new THREE.Group();
    var epoxy = stdMat(0x2E211C, 0.28, 0.05, { envMapIntensity: 1.1 });
    var geo = cut ? new THREE.SphereGeometry(1, 40, 28, Math.PI / 2, Math.PI * 1.5) : new THREE.SphereGeometry(1, 36, 24);
    var bead = new THREE.Mesh(geo, epoxy);
    bead.scale.set(1.25, 1.55, 1.25);
    bead.castShadow = true;
    g.add(bead);
    if (cut) {
      var inner = stdMat(0x5B5550, 0.85, 0.05, { side: THREE.DoubleSide, map: canvasTex(128, 128, function (c, w, h) {
        c.fillStyle = '#5E5852'; c.fillRect(0, 0, w, h);
        var rr = K.rng(91);
        for (var i = 0; i < 260; i++) { c.fillStyle = 'rgba(' + (70 + rr() * 50 | 0) + ',' + (66 + rr() * 44 | 0) + ',' + (60 + rr() * 40 | 0) + ',0.9)'; c.beginPath(); c.arc(rr() * w, rr() * h, 2 + rr() * 5, 0, TAU); c.fill(); }
      }) });
      [0, 1].forEach(function (k) {
        var half = new THREE.Mesh(new THREE.CircleGeometry(1, 32, k === 0 ? Math.PI / 2 : -Math.PI / 2, Math.PI), inner);
        half.scale.set(1.25 * 0.99, 1.55 * 0.99, 1);
        half.rotation.y = k === 0 ? 0 : -Math.PI / 2;
        g.add(half);
      });
    }
    var lead = stdMat(0xC9CDD2, 0.3, 1);
    [-0.45, 0.45].forEach(function (x, i) {
      var pts = ends ? [[x, -1.2, 0], [x, -3, 0], [x * 2.6, -6, 0], [ends[i][0], ends[i][1] + 2.2, ends[i][2]], [ends[i][0], ends[i][1], ends[i][2]]] : [[x, -1.2, 0], [x, -3, 0], [x * 2.6, -5.5, 0], [x * 2.6, -12, 0]];
      var w = K.wire(pts, { radius: 0.15, material: lead, segments: 40, radial: 6, tension: 0.2 });
      w.castShadow = false;
      g.add(w);
    });
    return { group: g };
  }

  /* Rotary potentiometer (Ø16 mm) lying shaft-up with its cover cut away.
   * Track spans 270°, terminal 1 at 225°, terminal 3 at -45° (angles in the x/-z plane). */
  function potModel(M, noKnob) {
    var THREE = TH();
    var g = new THREE.Group();
    var A1 = 225 * Math.PI / 180, SPAN = 270 * Math.PI / 180;
    function polar(r, a, y) { return new THREE.Vector3(r * Math.cos(a), y, -r * Math.sin(a)); }
    var base = new THREE.Mesh(new THREE.CylinderGeometry(7.6, 7.6, 1.4, 48), stdMat(0x6B5644, 0.66, 0));
    base.position.y = 0.7; base.receiveShadow = true;
    g.add(base);
    function arcRing(r0, r1, a0, span, y, mat, segs) {
      var gg = new THREE.RingGeometry(r0, r1, segs, 1, 0, span);
      gg.rotateX(-Math.PI / 2);
      var m = new THREE.Mesh(gg, mat);
      m.rotation.y = a0;
      m.position.y = y;
      return m;
    }
    var track = arcRing(4.5, 6.3, A1 - SPAN, SPAN, 1.45, stdMat(0x1F1F21, 0.9, 0), 90);
    g.add(track);
    var actMat = new THREE.MeshBasicMaterial({ color: 0xF08A4B, transparent: true, opacity: 0.92, depthWrite: false, toneMapped: false });
    actMat.side = THREE.DoubleSide;
    var act = arcRing(4.75, 6.05, A1, -SPAN, 1.5, actMat, 90);
    act.renderOrder = 2;
    act.userData.keep = true;
    g.add(act);
    var coll = arcRing(1.7, 3.0, 0, TAU, 1.45, M.steel, 40);
    g.add(coll);
    [A1, A1 - SPAN].forEach(function (a) {
      var c = new THREE.Mesh(rbox(1.6, 0.3, 2.2, 0.1, 1), M.steel);
      c.position.copy(polar(5.4, a, 1.55));
      c.rotation.y = a;
      g.add(c);
    });
    var rot = new THREE.Group();
    rot.userData.keep = true;
    g.add(rot);
    var arm = new THREE.Mesh(rbox(5.6, 0.35, 1.5, 0.15, 1), M.brass);
    arm.position.set(2.9, 1.9, 0);
    rot.add(arm);
    var tip = new THREE.Mesh(new THREE.SphereGeometry(0.55, 14, 10), M.brass);
    tip.position.set(5.4, 1.7, 0);
    rot.add(tip);
    var shaft = new THREE.Mesh(new THREE.CylinderGeometry(2.9, 2.9, 7.5, 32), M.steel);
    shaft.position.y = noKnob ? 3.1 : 5.4; shaft.castShadow = true;
    rot.add(shaft);
    if (!noKnob) {
      var knob = new THREE.Mesh(rbox(13, 3.4, 4.2, 1.4, 2), stdMat(0x24272D, 0.45, 0));
      knob.position.set(2.2, 9.6, 0); knob.castShadow = true;
      rot.add(knob);
      var mark = new THREE.Mesh(new THREE.BoxGeometry(5.2, 0.12, 0.7), stdMat(0xF2F0EA, 0.5, 0));
      mark.position.set(5.2, 11.35, 0);
      rot.add(mark);
    } else shaft.scale.y = 0.45;
    var can = new THREE.Mesh(new THREE.CylinderGeometry(8.2, 8.2, 5.4, 48, 1, true, Math.PI * 0.5, Math.PI), stdMat(0xB8BDC4, 0.3, 1, { side: THREE.DoubleSide }));
    can.position.y = 2.7;
    g.add(can);
    var rim = new THREE.Mesh(new THREE.TorusGeometry(8.2, 0.35, 8, 48, Math.PI), stdMat(0xB8BDC4, 0.3, 1));
    rim.rotation.x = Math.PI / 2;
    rim.position.y = 5.4;
    g.add(rim);
    var tabs = [[A1, 'T1'], [-Math.PI / 2, 'T2'], [A1 - SPAN, 'T3']];
    var tabPos = tabs.map(function (d) {
      var p = polar(9.2, d[0], 0.6);
      var tb = new THREE.Mesh(rbox(1.4, 0.4, 3.4, 0.15, 1), M.tin);
      tb.position.copy(polar(8.6, d[0], 0.9));
      tb.rotation.y = d[0] + Math.PI / 2;
      g.add(tb);
      return [p.x, p.z];
    });
    var api = {
      group: g, rot: rot, act: act, A1: A1, SPAN: SPAN, tabs: tabPos,
      set: function (p) {
        var aw = A1 - SPAN * (1 - p);
        rot.rotation.y = aw;
        var frac = clamp(1 - p, 0, 1);
        act.geometry.setDrawRange(0, Math.round(frac * 90) * 6);
        act.visible = frac > 0.004;
        api.aw = aw;
      },
      arcPoint: function (s, out, y) {
        var a = A1 - s;
        out[0] = 5.4 * Math.cos(a); out[1] = y; out[2] = -5.4 * Math.sin(a);
        return out;
      }
    };
    return api;
  }

  /* Analog panel voltmeter 0–3,3 V. Origin at the base centre; faces +z. */
  function voltMeter(M) {
    var THREE = TH();
    var g = new THREE.Group();
    var W = 70, H = 58, D = 26;
    var tilt = new THREE.Group();
    tilt.rotation.x = -0.2;
    tilt.position.set(0, 0, -4);
    g.add(tilt);
    var body = new THREE.Mesh(rbox(W, H, D, 4, 3), stdMat(0x2A2E35, 0.42, 0.1, { envMapIntensity: 0.9 }));
    body.position.y = H / 2 + 1;
    body.castShadow = true; body.receiveShadow = true;
    tilt.add(body);
    var DW = 60, DH = 39;
    var dial = decal(DW, DH, 22, function (c, w, h) {
      var px = w / 2, py = h - 4.2, R = 30.5;
      c.fillStyle = '#F7F5EF'; c.fillRect(0, 0, w, h);
      function ang(v) { return (-46 + 92 * v / 3.3) * Math.PI / 180; }
      function P(r, a) { return [px + r * Math.sin(a), py - r * Math.cos(a)]; }
      c.strokeStyle = 'rgba(30,32,38,0.18)'; c.lineWidth = 1.0;
      c.beginPath(); c.arc(px, py, R - 6.1, -Math.PI / 2 - 0.81, -Math.PI / 2 + 0.81); c.stroke();
      c.strokeStyle = '#1E2026';
      for (var i = 0; i <= 33; i++) {
        var vv = i / 10, a = ang(vv), L = i % 10 === 0 ? 3.6 : i % 5 === 0 ? 2.6 : 1.5;
        c.lineWidth = i % 10 === 0 ? 0.42 : 0.26;
        var p0 = P(R, a), p1 = P(R - L, a);
        c.beginPath(); c.moveTo(p0[0], p0[1]); c.lineTo(p1[0], p1[1]); c.stroke();
      }
      c.beginPath(); c.lineWidth = 0.3; c.arc(px, py, R, -Math.PI / 2 + ang(0), -Math.PI / 2 + ang(3.3)); c.stroke();
      c.fillStyle = '#1E2026'; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.font = '600 5px "IBM Plex Mono", monospace';
      [0, 1, 2, 3].forEach(function (n) { var p = P(R - 8, ang(n)); c.fillText(String(n), p[0], p[1]); });
      c.font = '600 6.5px "IBM Plex Sans", sans-serif';
      c.fillText('V', px - 19, py - 3.2);
      c.font = '500 2.6px "IBM Plex Mono", monospace';
      c.fillStyle = 'rgba(30,32,38,0.6)';
      c.fillText('DC  0–3,3', px + 18, py - 3.2);
    });
    dial.position.set(0, H / 2 + 6.5, D / 2 + 0.05);
    tilt.add(dial);
    var pivotY = H / 2 + 6.5 - DH / 2 + 4.2;
    var ng = new THREE.Group();
    ng.position.set(0, pivotY, D / 2 + 0.6);
    ng.userData.keep = true;
    tilt.add(ng);
    var needle = new THREE.Mesh(new THREE.BoxGeometry(0.42, 29.5, 0.25), stdMat(0x15171C, 0.4, 0));
    needle.position.y = 14.75;
    ng.add(needle);
    var tipN = new THREE.Mesh(new THREE.BoxGeometry(0.24, 6, 0.26), stdMat(0xB3352A, 0.4, 0));
    tipN.position.y = 26.5;
    ng.add(tipN);
    var cap = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.2, 1.2, 24), stdMat(0x15171C, 0.4, 0.2));
    cap.rotation.x = Math.PI / 2;
    cap.position.set(0, pivotY, D / 2 + 0.9);
    tilt.add(cap);
    var glass = new THREE.Mesh(new THREE.PlaneGeometry(DW + 2, DH + 3), new THREE.MeshPhysicalMaterial({ color: 0xffffff, transparent: true, opacity: 0.1, roughness: 0.04, metalness: 0, clearcoat: 1, depthWrite: false }));
    glass.position.set(0, H / 2 + 6.5, D / 2 + 1.6);
    glass.renderOrder = 4;
    glass.userData.keep = true;
    tilt.add(glass);
    var posts = [];
    [[-17, 0xB3352A, '+'], [17, 0x23262C, '−']].forEach(function (d) {
      var cm = stdMat(d[1], 0.45, 0);
      var p1 = new THREE.Mesh(new THREE.CylinderGeometry(3.1, 3.4, 5, 28), cm);
      p1.rotation.x = Math.PI / 2;
      p1.position.set(d[0], 8.5, D / 2 + 2.5);
      p1.castShadow = true;
      tilt.add(p1);
      var ring = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.2, 1.4, 16), M.brass);
      ring.rotation.x = Math.PI / 2;
      ring.position.set(d[0], 8.5, D / 2 + 5.4);
      tilt.add(ring);
      posts.push(ring);
    });
    var api = {
      group: g,
      set: function (vv) { ng.rotation.z = -(-46 + 92 * clamp(vv, 0, 3.4) / 3.3) * Math.PI / 180; },
      postWorld: function (i) { g.updateMatrixWorld(true); return posts[i].getWorldPosition(new THREE.Vector3()); }
    };
    api.set(0);
    return api;
  }

  /* Banana-socket post: coloured insulator with a metal top. */
  function postTerminal(M, color) {
    var THREE = TH();
    var g = new THREE.Group();
    var body = new THREE.Mesh(new THREE.CylinderGeometry(3.4, 3.8, 7, 32), stdMat(color, 0.42, 0));
    body.position.y = 3.5; body.castShadow = true;
    g.add(body);
    var top = new THREE.Mesh(new THREE.CylinderGeometry(2.3, 2.3, 1.1, 28), M.brass);
    top.position.y = 7.4;
    g.add(top);
    var hole = new THREE.Mesh(new THREE.CircleGeometry(1.0, 20), stdMat(0x1A1A1A, 0.8, 0));
    hole.rotation.x = -Math.PI / 2; hole.position.y = 7.97;
    g.add(hole);
    return { group: g };
  }

  /* ==================================================================
   * 2 · analog-sensors  (S 680 × 520)
   * ================================================================== */
  K.register('analog-sensors', function (el, opts) {
    var THREE = TH();
    opts = opts || {};
    var theme = opts.theme || 'light';
    ensureRelative(el);
    var VIEW = { yaw: -0.06, pitch: 0.6, distance: 268, target: [36, 19, -1] };
    var v = K.stage3d(el, {
      theme: theme, fov: 28, yaw: VIEW.yaw, pitch: VIEW.pitch, distance: VIEW.distance, target: VIEW.target,
      size: 110, ground: -1.62, near: 20, far: 3000, minYaw: -0.8, maxYaw: 0.8, minPitch: 0.25, maxPitch: 1.3, minDistance: 170, maxDistance: 420
    });
    if (v.lights) {
      v.lights.key.position.set(-70, 220, 140);
      v.lights.key.intensity = 1.4;
      v.lights.hemi.intensity = 0.45;
    }
    mmShadows(v);
    var M = circuitMats();
    var S = v.scene;
    var SR = new THREE.Group();
    S.add(SR);

    /* ---- board ---- */
    var BX0 = -52, BX1 = 47, BZ0 = -24, BZ1 = 24;
    var BW = BX1 - BX0, BD = BZ1 - BZ0, BCX = (BX0 + BX1) / 2, BCZ = (BZ0 + BZ1) / 2;
    var board = new THREE.Mesh(rbox(BW, 1.3, BD, 0.5, 2), M.core);
    board.position.set(BCX, -0.95, BCZ); board.receiveShadow = true; board.castShadow = true;
    SR.add(board);
    var mask = new THREE.Mesh(rbox(BW - 0.3, 0.16, BD - 0.3, 0.08, 1), M.board);
    mask.position.set(BCX, -0.08, BCZ); mask.receiveShadow = true;
    SR.add(mask);
    var TK = trackKit(S, M, { width: 2.0, halo: 7, staticRoot: SR });
    var DK = dotKit(S, 120, M, 0.75);

    /* sensor site: three pads that fit the potentiometer; LDR and NTC use the outer two */
    var SITE = [-14, 3], SL = [-20.5, 9.5], SM = [-14, 12.2], SRp = [-7.5, 9.5];
    var VIN = [-43, -6], GNDP = [39, -6], TP = [8, -6], RX = 23;
    var pIn = postTerminal(M, 0xB3352A); place(pIn, VIN[0], VIN[1], 0); SR.add(pIn.group);
    var pG = postTerminal(M, 0x23262C); place(pG, GNDP[0], GNDP[1], 0); SR.add(pG.group);
    TK.joint(VIN[0], VIN[1]); TK.joint(GNDP[0], GNDP[1]);
    var R10 = resistor(M, 10000); place(R10, RX, TP[1], 0); SR.add(R10.group);
    TK.joint(RX - 5.08, TP[1]); TK.joint(RX + 5.08, TP[1]);
    TK.joint(SL[0], SL[1]); TK.joint(SM[0], SM[1]); TK.joint(SRp[0], SRp[1]);
    TK.joint(TP[0], TP[1]);
    var loopTP = new THREE.Mesh(new THREE.TorusGeometry(1.5, 0.28, 10, 24), M.tin);
    loopTP.position.set(TP[0], 3.2, TP[1]);
    SR.add(loopTP);
    var legTP = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 2, 8), M.tin);
    legTP.position.set(TP[0], 1, TP[1]);
    SR.add(legTP);
    TK.add('vin', [VIN, [-28, -6], [-28, SL[1]], SL]);
    TK.add('link', [SM, [SRp[0], SM[1]], SRp], { r: 1.2 });
    TK.add('vo', [SRp, [-1.5, SRp[1]], [-1.5, TP[1]], TP]);
    TK.add('r1', [TP, [RX - 5.08, TP[1]]]);
    TK.add('gnd', [[RX + 5.08, TP[1]], GNDP]);

    /* ---- meter and its leads ---- */
    var meter = voltMeter(M);
    place(meter, 86, -12, -0.1);
    meter.group.scale.setScalar(0.82);
    SR.add(meter.group);
    var mPlus = meter.postWorld(0), mMinus = meter.postWorld(1);
    SR.add(K.wire([[TP[0], 4.6, TP[1]], [TP[0] + 2, 10, TP[1] - 7], [34, 13, -17], [mPlus.x - 8, mPlus.y + 3, mPlus.z + 2], [mPlus.x, mPlus.y, mPlus.z + 1.2]], { radius: 0.9, material: M.wireRed, segments: 90, radial: 10 }));
    SR.add(K.wire([[GNDP[0], 8, GNDP[1]], [GNDP[0] + 4, 11, GNDP[1] + 2], [mMinus.x - 6, mMinus.y + 2, mMinus.z + 6], [mMinus.x, mMinus.y, mMinus.z + 1.2]], { radius: 0.9, material: M.wireBlack, segments: 70, radial: 10 }));

    /* ---- the three sensors on the board ---- */
    var trackInfo = ldrTrack();
    var small = {};
    var rel = function (p) { return [p[0] - SITE[0], p[1] - SITE[1]]; };
    (function () {
      var g = new THREE.Group();
      var l = ldrModel(M, trackInfo);
      l.group.position.set(0, 8.2, 0);
      l.group.rotation.x = -0.5;
      g.add(l.group);
      [[-1.7, rel(SL)], [1.7, rel(SRp)]].forEach(function (d) {
        g.add(K.wire([[d[0], 6.2, 1.0], [d[0], 4.2, 1.6], [d[1][0] * 0.7, 1.8, d[1][1] * 0.8], [d[1][0], 0.4, d[1][1]], [d[1][0], -0.2, d[1][1]]], { radius: 0.25, material: M.tin, segments: 30, radial: 6, tension: 0.25 }));
      });
      var lamp = new THREE.Group();
      var postM = stdMat(0x3A3F47, 0.35, 0.6);
      var baseL = new THREE.Mesh(new THREE.CylinderGeometry(6, 6.6, 2.2, 32), postM);
      baseL.position.set(-6, 1.1, -17); baseL.castShadow = true;
      lamp.add(baseL);
      lamp.add(K.wire([[-6, 2, -17], [-6, 27, -17], [-5.2, 35.5, -14.5], [-1.8, 37, -10], [0, 35.4, -7.6]], { radius: 0.9, material: postM, segments: 60, radial: 10, tension: 0.25 }));
      var head = new THREE.Mesh(new THREE.CylinderGeometry(4.0, 7.0, 10, 36, 1, true), stdMat(0x2E3239, 0.32, 0.55, { side: THREE.DoubleSide }));
      head.position.set(0, 30, -6);
      head.rotation.x = -0.266;
      head.castShadow = true;
      lamp.add(head);
      var cap = new THREE.Mesh(new THREE.CircleGeometry(4.0, 32), stdMat(0x2E3239, 0.32, 0.55));
      cap.position.set(0, 34.83, -7.3); cap.rotation.x = -Math.PI / 2 - 0.266;
      lamp.add(cap);
      var bulbMat = new THREE.MeshBasicMaterial({ color: 0xFFF1D0, toneMapped: false });
      var face = new THREE.Mesh(new THREE.CircleGeometry(6.6, 36), bulbMat);
      face.position.set(0, 25.3, -4.75);
      face.rotation.x = 1.305;
      face.userData.keep = true;
      lamp.add(face);
      var poolMat = new THREE.MeshBasicMaterial({ map: M.soft, color: 0xF2C46B, transparent: true, opacity: 0, depthWrite: false, toneMapped: false });
      var pool = new THREE.Mesh(new THREE.PlaneGeometry(30, 30), poolMat);
      pool.rotation.x = -Math.PI / 2; pool.position.set(0, 0.3, 2); pool.renderOrder = 1;
      pool.userData.keep = true;
      lamp.add(pool);
      g.add(lamp);
      /* photons travelling from the lamp to the LDR face */
      var NPH = 26;
      var phm = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.2, 0.2, 2.6, 6), new THREE.MeshBasicMaterial({ color: 0xF2C060, toneMapped: false }), NPH);
      phm.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      phm.frustumCulled = false;
      phm.userData.keep = true;
      g.add(phm);
      var pa = new THREE.Vector3(), pb = new THREE.Vector3(), pd = new THREE.Vector3(), q0 = new THREE.Quaternion(), m4 = new THREE.Matrix4(), one = new THREE.Vector3(1, 1, 1), yAx = new THREE.Vector3(0, 1, 0);
      var prs = K.rng(77), pseed = [];
      for (var pi = 0; pi < NPH; pi++) pseed.push([prs(), prs(), prs(), prs()]);
      small.isik = {
        group: g,
        set: function (x, t) {
          bulbMat.color.setRGB(0.32 + 0.68 * x, 0.3 + 0.64 * x, 0.25 + 0.55 * x);
          poolMat.opacity = 0.5 * x;
          var n = K.reducedMotion ? 0 : Math.round(3 + 22 * x), k;
          for (k = 0; k < NPH; k++) {
            if (k >= n) { m4.makeScale(0, 0, 0); phm.setMatrixAt(k, m4); continue; }
            var sd = pseed[k], ph = (t * 1.3 + sd[0]) % 1;
            pa.set((sd[1] - 0.5) * 7, 25.3 - sd[2] * 0.5, -4.75 + (sd[3] - 0.5) * 2);
            pb.set((sd[1] - 0.5) * 3, 8.2 + (sd[2] - 0.5) * 3, 0.6);
            pd.subVectors(pb, pa).normalize();
            q0.setFromUnitVectors(yAx, pd);
            pa.lerp(pb, ph);
            m4.compose(pa, q0, one);
            phm.setMatrixAt(k, m4);
          }
          phm.instanceMatrix.needsUpdate = true;
        }
      };
    })();
    (function () {
      var g = new THREE.Group();
      var n = ntcModel(M, false, [[rel(SL)[0], -11.6, rel(SL)[1]], [rel(SRp)[0], -11.6, rel(SRp)[1]]]);
      n.group.position.set(0, 11.6, 0);
      g.add(n.group);
      var heater = new THREE.Group();
      var cer = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 2.6, 14, 28), stdMat(0xEDE9E0, 0.6, 0));
      cer.rotation.z = Math.PI / 2;
      cer.position.set(0, 6.5, -8);
      cer.castShadow = true;
      heater.add(cer);
      var hp = [];
      for (var i = 0; i <= 160; i++) { var t = i / 160, a = TAU * 9 * t; hp.push(new THREE.Vector3(-5.8 + 11.6 * t, 6.5 + 2.75 * Math.cos(a), -8 + 2.75 * Math.sin(a))); }
      var coilMat = stdMat(0x8A6F5C, 0.45, 0.8, { emissive: new THREE.Color(0xD86A2E), emissiveIntensity: 0 });
      var coil = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(hp), 400, 0.22, 6), coilMat);
      coil.userData.keep = true;
      heater.add(coil);
      [-1, 1].forEach(function (s2) {
        heater.add(K.wire([[s2 * 7, 6.5, -8], [s2 * 8.5, 3, -8], [s2 * 8.5, -0.2, -8]], { radius: 0.3, material: M.tin, segments: 12, radial: 6 }));
      });
      g.add(heater);
      var waves = [];
      var wMat = new THREE.MeshBasicMaterial({ color: 0xE39A6C, transparent: true, opacity: 0, depthWrite: false, toneMapped: false });
      for (i = 0; i < 3; i++) {
        var wp = [];
        for (var k = 0; k <= 24; k++) wp.push(new THREE.Vector3(0.7 * Math.sin(k * 0.55 + i), k * 0.55, 0));
        var wg = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(wp), 40, 0.22, 4), wMat);
        wg.position.set(-3.5 + i * 3.5, 10, -8);
        wg.userData.keep = true;
        waves.push(wg);
        g.add(wg);
      }
      small.sicaklik = {
        group: g,
        set: function (T, tt) {
          var h = clamp(T / 50, 0, 1);
          coilMat.emissiveIntensity = 0.25 * h * h;
          wMat.opacity = 0.42 * h;
          waves.forEach(function (w, j) { var ph = ((tt * 0.55 + j / 3) % 1); w.position.y = 9.5 + ph * 7; w.scale.setScalar(0.7 + 0.5 * ph); w.visible = h > 0.03; });
        }
      };
    })();
    (function () {
      var g = new THREE.Group();
      var pot = potModel(M);
      g.add(pot.group);
      small.dugme = { group: g, pot: pot, set: function (p) { pot.set(p); } };
    })();
    ['isik', 'sicaklik', 'dugme'].forEach(function (k) { small[k].group.position.set(SITE[0], 0, SITE[1]); small[k].group.userData.keep = true; SR.add(small[k].group); });

    bake(SR);

    /* electron loop: 0 V post -> 10 kΩ -> Vout -> sensor -> 3,3 V post -> (supply, hidden under the board) */
    var Y = 0.9;
    function sensorPath(kind) {
      if (kind === 'dugme') return flat([SRp, [SRp[0], SM[1]], SM], Y).concat([[SITE[0] - 2, 3.4, SITE[1] + 4], [SITE[0] - 5, 3, SITE[1] + 4.5], [SL[0], Y, SL[1]]]);
      return [[SRp[0], Y, SRp[1]], [SRp[0] - 2, 5, SITE[1] + 2], [SL[0] + 2, 5, SITE[1] + 2], [SL[0], Y, SL[1]]];
    }
    function makeLoop(kind) {
      var under = [[VIN[0], 6, VIN[1]], [VIN[0], -4, VIN[1]], [GNDP[0], -4, GNDP[1]], [GNDP[0], 6, GNDP[1]]];
      var pts = [].concat(
        flat([GNDP, [RX + 5.08, TP[1]]], Y),
        toWorld(R10.path(false), RX, TP[1], 0),
        flat(fillet([[RX - 5.08, TP[1]], TP, [-1.5, TP[1]], [-1.5, SRp[1]], SRp], 2.6, 6), Y),
        sensorPath(kind),
        flat(fillet([SL, [-28, SL[1]], [-28, -6], VIN], 2.6, 6), Y),
        under
      );
      var p = new Path3(densify(pts, 1.5));
      var hideLen = new Path3(under).len;
      p.hide = [p.len - hideLen - 2, p.len + 1];
      return p;
    }
    var loops = { isik: makeLoop('isik'), sicaklik: makeLoop('sicaklik'), dugme: makeLoop('dugme') };

    /* ---- magnified inset: a second camera on true-size close-up models ---- */
    var SB = new THREE.Scene();
    K.studio(SB, { theme: theme, size: 20, shadows: false });
    var camB = new THREE.PerspectiveCamera(30, 1, 0.5, 600);
    var big = {};
    var bigL = ldrModel(M, trackInfo);
    SB.add(bigL.group);
    big.isik = { group: bigL.group, cam: [0, 0.2, 12.6], look: [0, 0.1, 0] };
    var bigN = ntcModel(M, true);
    var nWrap = new THREE.Group();
    nWrap.position.set(100, 0, 0);
    nWrap.rotation.y = Math.PI / 4 + 0.3;
    nWrap.add(bigN.group);
    SB.add(nWrap);
    big.sicaklik = { group: nWrap, cam: [100, 1.6, 10.5], look: [100, -0.5, 0] };
    var bigP = potModel(M, true);
    bigP.group.position.set(200, 0, 0);
    SB.add(bigP.group);
    big.dugme = { group: bigP.group, cam: [200, 40, 15], look: [200, 0.5, -0.6] };

    var elec = K.mat.electron(false);
    var PH = 70;
    var phMesh = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.05, 0.05, 1.5, 6), new THREE.MeshBasicMaterial({ color: 0xF2B84E, toneMapped: false }), PH);
    phMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    phMesh.frustumCulled = false;
    bigL.group.add(phMesh);
    var elL = K.instanced(140, { radius: 0.085, material: elec, detail: 1 }); bigL.group.add(elL);
    var elN = K.instanced(130, { radius: 0.07, material: elec, detail: 1 }); bigN.group.add(elN);
    var elP = K.instanced(60, { radius: 0.32, material: elec, detail: 1 }); bigP.group.add(elP);
    /* heat arriving at the bead in the close-up */
    var heatMat = new THREE.MeshBasicMaterial({ color: 0xE39A6C, transparent: true, opacity: 0, depthWrite: false, toneMapped: false });
    var heatW = [];
    for (var hw = 0; hw < 4; hw++) {
      var hpts = [];
      for (var k2 = 0; k2 <= 30; k2++) hpts.push(new THREE.Vector3(k2 * 0.12, 0.18 * Math.sin(k2 * 0.9), 0));
      var hm = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(hpts), 40, 0.035, 4), heatMat);
      SB.add(hm);
      heatW.push(hm);
    }
    var phDir = new THREE.Vector3(0.55, -0.62, -0.56).normalize();
    var mtx = new THREE.Matrix4(), qq = new THREE.Quaternion(), sc1 = new THREE.Vector3(1, 1, 1), pv = new THREE.Vector3();
    qq.setFromUnitVectors(new THREE.Vector3(0, 1, 0), phDir);
    var seeds = [], rr = K.rng(1234);
    for (var si = 0; si < 140; si++) seeds.push([rr(), rr(), rr(), rr()]);
    var faceR = bigL.R;

    /* ---- labels ---- */
    function lab(text, at, o) { o = o || {}; o.at = at; return v.label(text, o); }
    lab('3,3 V', [VIN[0], 9, VIN[1]], { cls: 'value', dy: -14 }).el.style.fontSize = '13px';
    lab('0 V', [GNDP[0], 9, GNDP[1]], { cls: 'value', dy: -14 }).el.style.fontSize = '13px';
    var lVo = lab('Vout', [TP[0], 5, TP[1]], { cls: 'value', dy: -16 });
    lVo.el.style.color = P.blue; lVo.el.style.fontSize = '13px';
    lab('10 kΩ', [RX, 4, TP[1]], { cls: 'value', dy: 18 }).el.style.fontSize = '13px';
    var lR = lab('', [SITE[0], 1, SITE[1] + 12], { cls: 'value', dy: 14 });
    lR.el.style.color = P.copper; lR.el.style.fontSize = '14px';
    var lV = lab('', [86, 2, 6], { cls: 'value', dy: 16 });
    lV.el.style.color = P.blue; lV.el.style.fontSize = '17px'; lV.el.style.fontWeight = '600';
    var lHeat = lab('ısıtıcı', [SITE[0] - 5, 8, SITE[1] - 8], { cls: 'note', dx: 62, dy: -52, line: true, align: 'left' });
    var lLamp = lab('lamba', [SITE[0] + 4, 31, SITE[1] - 6], { cls: 'note', dx: 30, dy: -6, line: true, align: 'left' });
    var lEl = lab('elektronlar · hız abartılı', [BX1, 0, BZ1 + 3], { cls: 'tag', align: 'right', valign: 'top', dy: 10 });
    lEl.el.style.fontSize = '13px';
    lHeat.el.style.fontSize = lLamp.el.style.fontSize = '13px';

    /* ---- state ---- */
    var KINDS = ['isik', 'sicaklik', 'dugme'];
    var st = { auto: true, sensor: 'isik', input: 50, target: 50, show: { isik: 1, sicaklik: 0, dugme: 0 }, phase: 0, needle: 0 };
    function resOf(kind, x) {
      if (kind === 'isik') return clamp(10000 * Math.pow(50 / Math.max(x, 2), 0.8), 500, 200000);
      if (kind === 'sicaklik') { var T = x / 2 + 273.15; return 10000 * Math.exp(3950 * (1 / T - 1 / 298.15)); }
      return 10000 * (1 - x / 100) + 50;
    }
    function kfmt(R) {
      var N = ' ', k = R / 1000, kr;
      if (R < 1000) { kr = Math.round(k * 100) / 100; return { k: kr, s: K.num(kr, 2) + N + 'kΩ', o: Math.round(R) + N + 'Ω' }; }
      if (R < 99950) { kr = Math.round(k * 10) / 10; return { k: kr, s: K.num(kr, 1) + N + 'kΩ', o: K.num(kr, 1) + N + 'kΩ' }; }
      kr = Math.round(k); return { k: kr, s: K.num(kr, 0) + N + 'kΩ', o: K.num(kr, 0) + N + 'kΩ' };
    }
    function calc() {
      var R = resOf(st.sensor, st.input), f = kfmt(R);
      var vout = 3.3 * 10 / (f.k + 10);
      return { R: R, f: f, vout: vout, vs: 3.3 - vout, I: 3.3 / (R + 10000) };
    }
    function autoInput(t) { return 50 - 46 * Math.cos(TAU * t / 14); }
    function reset() {
      st.auto = !K.reducedMotion;
      st.sensor = 'isik';
      st.input = st.target = K.reducedMotion ? 60 : autoInput(0);
      st.show = { isik: 1, sicaklik: 0, dugme: 0 };
      st.phase = 0;
      st.needle = calc().vout;
      TK.list.forEach(function (t) { t.act = 0; t.target = 0; });
      v.setView(VIEW);
    }
    reset();

    var tmp3 = [0, 0, 0], camLook = new THREE.Vector3(), camPos = new THREE.Vector3();
    var insetCam = { p: new THREE.Vector3().fromArray(big.isik.cam), l: new THREE.Vector3().fromArray(big.isik.look) };

    function frame(t, dt) {
      if (st.auto) st.target = autoInput(t);
      st.input = st.auto ? st.target : approach(st.input, st.target, 7, dt);
      if (Math.abs(st.input - st.target) < 0.01) st.input = st.target;
      var C = calc();
      KINDS.forEach(function (k) {
        st.show[k] = approach(st.show[k], k === st.sensor ? 1 : 0, 9, dt);
        var s = st.show[k];
        small[k].group.visible = s > 0.01;
        small[k].group.scale.setScalar(Math.max(0.001, easeIO(s)));
        big[k].group.visible = k === st.sensor;
      });
      lHeat.show(st.sensor === 'sicaklik' && st.show.sicaklik > 0.6);
      lLamp.show(st.sensor === 'isik' && st.show.isik > 0.6);
      var x = st.input / 100, tp = K.reducedMotion ? 2.0 : t;
      small.isik.set(x, tp);
      small.sicaklik.set(st.input / 2, tp);
      small.dugme.set(x);
      bigP.set(x);
      st.needle = approach(st.needle, C.vout, 5, dt);
      meter.set(st.needle);

      var Ii = C.I / (3.3 / 10050);
      TK.list.forEach(function (tr) { tr.target = 0.3 + 0.7 * Ii; });
      if (st.sensor !== 'dugme') TK.tracks.link.target = 0;
      TK.update(dt);
      st.phase += (K.reducedMotion ? 0 : 3 + 22 * Ii) * dt;
      DK.begin();
      DK.loop(loops[st.sensor], st.phase, 5, 1, loops[st.sensor].hide);
      DK.end();

      lR.set(C.f.o);
      lV.set(K.num(C.vout, 2) + ' V');

      var bk = big[st.sensor], kk = 1 - Math.exp(-10 * dt);
      insetCam.p.lerp(camPos.fromArray(bk.cam), kk);
      insetCam.l.lerp(camLook.fromArray(bk.look), kk);
      var drift = K.reducedMotion ? 0 : Math.sin(t * 0.35) * 0.5;
      camB.position.copy(insetCam.p);
      camB.position.x += drift * (st.sensor === 'dugme' ? 2 : 1);
      camB.lookAt(insetCam.l);
      insetParticles(tp, C);

      v.render(dt);
      drawOverlay(t, C);
    }

    function hash(a, b) { var h = Math.sin(a * 12.9898 + b * 78.233) * 43758.5453; return h - Math.floor(h); }
    function insetParticles(t, C) {
      var i, nL = 0, nP = 0, nN = 0, nPt = 0;
      if (st.sensor === 'isik') {
        var cnt = Math.min(130, Math.round(32 * 10000 / C.R));
        var nTrack = trackInfo.pts.length;
        for (i = 0; i < cnt; i++) {
          var sd = seeds[i], life = 1.5 + sd[2] * 1.1;
          var tt = t / life + sd[0], cyc = Math.floor(tt), age = tt - cyc;
          var p = trackInfo.pts[Math.floor(hash(cyc + 1, i) * nTrack) % nTrack];
          var u = p[0] * faceR, vv = p[1] * faceR, z0 = 1.04;
          if (age < 0.2) {
            if (nP < PH) {
              var back = (0.2 - age) / 0.2 * 9;
              pv.set(u - phDir.x * back, vv - phDir.y * back, z0 - phDir.z * back);
              mtx.compose(pv, qq, sc1);
              phMesh.setMatrixAt(nP++, mtx);
            }
          } else {
            var a2 = (age - 0.2) / 0.8, off = a2 * trackInfo.width * faceR * 0.9;
            var fade = Math.min(1, a2 * 6) * Math.min(1, (1 - a2) * 5);
            elL.setAt(nL++, u + p[2] * off, vv + p[3] * off, z0 + 0.05, fade);
          }
        }
      } else if (st.sensor === 'sicaklik') {
        var cnt2 = Math.min(120, Math.round(26 * 10000 / C.R));
        var amp = 0.03 + 0.06 * (st.input / 100);
        for (i = 0; i < cnt2; i++) {
          var s2 = seeds[i];
          var rad = Math.sqrt(s2[0]) * 0.92, yy = (s2[1] * 2 - 1) * Math.sqrt(Math.max(0, 1 - rad * rad)) * 0.92;
          var jx = amp * Math.sin(t * 9 + i * 1.3), jy = amp * Math.sin(t * 11 + i * 2.1);
          if (s2[2] < 0.5) elN.setAt(nN++, -1.25 * rad + jx, 1.55 * yy + jy, 0.07, 0.9);
          else elN.setAt(nN++, -0.07, 1.55 * yy + jy, 1.25 * rad + jx, 0.9);
        }
        var hT = clamp(st.input / 100, 0, 1);
        heatMat.opacity = 0.55 * hT;
        heatW.forEach(function (w, j) {
          var ph = (t * 0.45 + j / 4) % 1;
          w.visible = hT > 0.03;
          w.position.set(100 - 6.2 + ph * 3.2, -1.2 + j * 0.8, 1.2 - j * 0.2);
          w.scale.set(1, 1, 1);
        });
      } else {
        var span = bigP.SPAN * (1 - st.input / 100);
        if (span > 0.05) {
          var n3 = Math.max(1, Math.round(span / 0.42));
          for (i = 0; i < n3 && nPt < 60; i++) {
            var s3 = ((i / n3) * span + st.phase * 0.06) % span;
            bigP.arcPoint(span - s3, tmp3, 2.05);
            elP.setAt(nPt++, tmp3[0], tmp3[1], tmp3[2], 1);
          }
        }
      }
      if (st.sensor !== 'sicaklik') heatW.forEach(function (w) { w.visible = false; });
      for (i = nL; i < 140; i++) elL.hideAt(i);
      for (i = nN; i < 130; i++) elN.hideAt(i);
      for (i = nPt; i < 60; i++) elP.hideAt(i);
      elL.commit(); elN.commit(); elP.commit();
      for (i = nP; i < PH; i++) { mtx.makeScale(0, 0, 0); phMesh.setMatrixAt(i, mtx); }
      phMesh.instanceMatrix.needsUpdate = true;
    }

    var RB = K.renderer();
    var pr = new THREE.Vector3();
    function renderInset(c, cx, cy, rad) {
      if (K.skipRender || !RB) return;
      var k = v.sf.k, size = Math.round(rad * 2 * k), glc = RB.domElement;
      if (glc.width < size || glc.height < size) return;
      RB.setViewport(0, 0, size, size);
      RB.setScissor(0, 0, size, size);
      RB.setScissorTest(true);
      RB.setClearColor(0xFBFBF8, 1);
      RB.clear(true, true, true);
      RB.toneMappingExposure = 1.0;
      RB.render(SB, camB);
      RB.setClearColor(0x000000, 0);
      c.save();
      c.beginPath(); c.arc(cx, cy, rad, 0, TAU); c.clip();
      c.drawImage(glc, 0, glc.height - size, size, size, cx - rad, cy - rad, rad * 2, rad * 2);
      c.restore();
    }

    var TEXT = {
      isik: ['Işık, bağlı elektronlara enerji verip onları serbest bırakır.', 'Çok ışık → çok serbest elektron → direnç düşer.'],
      sicaklik: ['Isınan malzemede daha çok elektron serbest kalır.', 'Sıcaklık artar → direnç düşer (NTC).'],
      dugme: ['Düğme dönünce sürgü kayar, akımın yolu kısalır.', 'Kısa yol → az direnç.']
    };
    function inputText() {
      var x = st.input;
      if (st.sensor === 'isik') return 'Işık: %' + Math.round(x);
      if (st.sensor === 'sicaklik') { var T = Math.round(x) / 2; return 'Sıcaklık: ' + K.num(T, T % 1 ? 1 : 0) + ' °C'; }
      return 'Düğme: %' + Math.round(x);
    }

    function drawOverlay(t, C) {
      var c = v.ctx;
      if (!c) return;
      var W = v.w, H = v.h, sx = W / 680;
      var icx = 110 * sx, icy = 106, rad = 93;
      pr.set(SITE[0], 7, SITE[1]);
      var sp = v.project(pr);
      c.save();
      c.strokeStyle = K.rgba(P.ink2, 0.5); c.lineWidth = 1;
      c.beginPath(); c.arc(sp.x, sp.y, 13, 0, TAU); c.stroke();
      var dx = icx - sp.x, dy = icy - sp.y, dd = Math.hypot(dx, dy);
      if (dd > rad + 14) {
        var base = Math.atan2(dy, dx), alpha = Math.asin(clamp((rad - 13) / dd, -1, 1));
        [1, -1].forEach(function (sgn) {
          var a = base + sgn * (Math.PI / 2 + alpha);
          c.beginPath();
          c.moveTo(sp.x + Math.cos(a) * 13, sp.y + Math.sin(a) * 13);
          c.lineTo(icx + Math.cos(a) * rad, icy + Math.sin(a) * rad);
          c.stroke();
        });
      }
      c.fillStyle = 'rgba(21,23,28,0.06)';
      c.beginPath(); c.arc(icx + 2, icy + 3, rad + 2, 0, TAU); c.fill();
      c.restore();
      renderInset(c, icx, icy, rad);
      c.save();
      c.strokeStyle = P.ink2; c.lineWidth = 1.5;
      c.beginPath(); c.arc(icx, icy, rad, 0, TAU); c.stroke();
      c.restore();
      K.label(c, 'büyütülmüş', icx, icy + rad - 12, { size: 10.5, mono: true, color: P.muted, align: 'center', spacing: 1 });
      var lines = TEXT[st.sensor];
      K.label(c, inputText(), 232 * sx, 40, { size: 17, mono: true, weight: 600, color: P.ink });
      K.label(c, lines[0], 232 * sx, 64, { size: 12.5, color: P.ink2 });
      K.label(c, lines[1], 232 * sx, 82, { size: 12.5, color: P.copper, weight: 500 });
      var y0 = H - 66;
      c.save(); c.strokeStyle = P.line; c.beginPath(); c.moveTo(20 * sx, y0 - 22); c.lineTo(W - 20 * sx, y0 - 22); c.stroke(); c.restore();
      var parts = [['Vout = 3,3 V × 10 kΩ ÷ (', P.ink], [C.f.s, P.copper], [' + 10 kΩ) ≈ ', P.ink], [K.num(C.vout, 2) + ' V', P.blue]];
      c.save();
      c.font = K.font(15.5, 600, true);
      var tw = 0;
      parts.forEach(function (p) { tw += c.measureText(p[0]).width; });
      var x0 = (W - tw) / 2;
      parts.forEach(function (p) { c.fillStyle = p[1]; c.fillText(p[0], x0, y0); x0 += c.measureText(p[0]).width; });
      c.restore();
      var bx0 = 40 * sx, bx1 = W - 40 * sx, by = y0 + 18, bh = 16;
      var f = clamp(C.vs / 3.3, 0, 1), xm = lerp(bx0, bx1, f);
      c.fillStyle = K.rgba(P.copperFill, 0.22); K.rr(c, bx0, by, Math.max(1, xm - bx0), bh, 4); c.fill();
      c.fillStyle = K.rgba(P.blue, 0.2); K.rr(c, xm, by, Math.max(1, bx1 - xm), bh, 4); c.fill();
      c.strokeStyle = P.ink2; c.lineWidth = 1.2;
      c.beginPath(); c.moveTo(xm, by - 4); c.lineTo(xm, by + 2); c.moveTo(xm, by + bh - 2); c.lineTo(xm, by + bh + 4); c.stroke();
      K.label(c, 'sensör: ' + K.num(C.vs, 2) + ' V', bx0 + 8, by + 12, { size: 11.5, mono: true, color: P.copper, weight: 600 });
      K.label(c, '10 kΩ (Vout): ' + K.num(C.vout, 2) + ' V', bx1 - 8, by + 12, { size: 11.5, mono: true, color: P.blue, weight: 600, align: 'right' });
      K.label(c, '3,3 V iki direnç arasında, dirençlerle orantılı paylaşılır', W / 2, by + bh + 17, { size: 12, color: P.muted, align: 'center' });
    }

    return {
      reset: reset,
      frame: frame,
      set: function (k, val) {
        if (k === 'sensor') {
          var s = String(val);
          if (KINDS.indexOf(s) >= 0) st.sensor = s;
        } else if (k === 'input') {
          st.auto = false;
          st.target = clamp(+val, 0, 100);
        }
      },
      read: function (k) {
        var C = calc();
        if (k === 'resistance') return C.f.o;
        if (k === 'vout') return K.num(C.vout, 2) + ' V';
        if (k === 'formula') return 'Vout = 3,3 V × 10 kΩ ÷ (' + C.f.s + ' + 10 kΩ) ≈ ' + K.num(C.vout, 2) + ' V';
        if (k === 'input') return Math.round(st.input) + ' · ' + inputText();
        return '';
      },
      resize: function () { v.sf.resize(); },
      dispose: function () { K.disposeScene(SB); v.dispose(); }
    };
  });

  /* ==================================================================
   * 3 · adc  (S 680 × 520) · 12 bit, 0–4.095, 3,3 V reference
   * ================================================================== */
  K.register('adc', function (el, opts) {
    var THREE = TH();
    opts = opts || {};
    var theme = opts.theme || 'light';
    ensureRelative(el);
    var VIEW = { yaw: 0.0, pitch: 0.1, distance: 455, target: [2, 69, 0] };
    var v = K.stage3d(el, {
      theme: theme, fov: 26, yaw: VIEW.yaw, pitch: VIEW.pitch, distance: VIEW.distance, target: VIEW.target,
      size: 110, ground: -1.2, near: 30, far: 3000, minYaw: -0.6, maxYaw: 0.6, minPitch: -0.05, maxPitch: 0.9, minDistance: 250, maxDistance: 600
    });
    if (v.lights) {
      v.lights.key.position.set(-80, 200, 160);
      v.lights.key.intensity = 1.35;
      v.lights.hemi.intensity = 0.45;
    }
    mmShadows(v);
    var M = circuitMats();
    var S = v.scene;
    var SR = new THREE.Group();
    S.add(SR);

    var VREF = 3.3, NMAX = 4095;
    var LX = -73.8, LH = 88, LW = 30, LB = 56;
    function yOfV(x) { return LB + LH * clamp(x / VREF, 0, 1); }

    /* ---- measuring ladder ---- */
    var rail = stdMat(0x3B4048, 0.36, 0.55, { envMapIntensity: 0.9 });
    [-1, 1].forEach(function (s) {
      var r = new THREE.Mesh(rbox(4.2, LH + 12, 6, 1.4, 2), rail);
      r.position.set(LX + s * (LW / 2 + 2.1), LB - 6 + (LH + 12) / 2, -14);
      r.castShadow = true;
      SR.add(r);
    });
    var sill = new THREE.Mesh(rbox(LW + 8.4, 4, 8, 1.2, 2), rail);
    sill.position.set(LX, LB - 6, -14); sill.castShadow = true;
    SR.add(sill);
    var post = new THREE.Mesh(rbox(6, LB - 6, 5, 1.2, 2), rail);
    post.position.set(LX, (LB - 6) / 2, -16); post.castShadow = true;
    SR.add(post);
    var plate = new THREE.Mesh(rbox(30, 2.4, 22, 1, 2), rail);
    plate.position.set(LX, 1.2, -16); plate.castShadow = true; plate.receiveShadow = true;
    SR.add(plate);
    var back = new THREE.Mesh(rbox(LW, LH + 6, 1.4, 0.5, 1), stdMat(0xF4F3EF, 0.7, 0));
    back.position.set(LX, LB - 4 + (LH + 6) / 2 - 1, -17.6);
    back.receiveShadow = true;
    SR.add(back);
    var rungMat = stdMat(0xC9CDD3, 0.25, 1);
    var rungGeo = new THREE.CylinderGeometry(0.85, 0.85, LW, 16);
    var rungMeshes = [];
    for (var k = 0; k <= 16; k++) {
      var rg = new THREE.Mesh(k % 8 === 0 ? new THREE.CylinderGeometry(1.25, 1.25, LW, 18) : rungGeo, k === 16 ? rungMat : stdMat(0xC9CDD3, 0.25, 1, { emissive: new THREE.Color(0xD06A35), emissiveIntensity: 0 }));
      rg.rotation.z = Math.PI / 2;
      rg.position.set(LX, yOfV(VREF * k / 16), -12.8);
      rg.castShadow = true;
      rg.userData.keep = true;
      SR.add(rg);
      rungMeshes.push(rg);
    }
    /* the analog level: a blue column and a glowing surface */
    var colMat = new THREE.MeshPhysicalMaterial({ color: 0x3E63D8, transparent: true, opacity: 0.32, roughness: 0.3, metalness: 0, depthWrite: false });
    var colGeo = rboxCore(1);
    var column = new THREE.Mesh(colGeo, colMat);
    column.renderOrder = 2;
    column.userData.keep = true;
    SR.add(column);
    var surfMat = new THREE.MeshBasicMaterial({ color: 0x5A7CF0, toneMapped: false });
    var surf = new THREE.Mesh(rbox(LW - 1, 0.9, 5.4, 0.3, 1), surfMat);
    surf.userData.keep = true;
    SR.add(surf);
    var surfGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: M.soft, color: 0x5A7CF0, transparent: true, opacity: 0.35, depthWrite: false, toneMapped: false }));
    surfGlow.scale.set(LW + 18, 10, 1);
    SR.add(surfGlow);

    /* ---- bit lights: 12 LEDs on an upright strip ---- */
    var NB = 12, PITCH = 16.2, GAP = 9, SY = 21;
    var SX0 = -(11 * PITCH + 2 * GAP) / 2;
    function ledX(i) { return SX0 + i * PITCH + Math.floor(i / 4) * GAP; }
    var stripW = ledX(NB - 1) - SX0 + 16;
    var PH0 = 2.6, PH1 = SY + 11;
    var strip = new THREE.Mesh(rbox(stripW, PH1 - PH0, 1.6, 0.6, 2), M.board);
    strip.position.set(SX0 + (stripW - 16) / 2, (PH0 + PH1) / 2, -1);
    strip.castShadow = true; strip.receiveShadow = true;
    SR.add(strip);
    var stripCore = new THREE.Mesh(rbox(stripW - 0.4, PH1 - PH0 - 0.4, 1.1, 0.4, 1), M.core);
    stripCore.position.set(SX0 + (stripW - 16) / 2, (PH0 + PH1) / 2, -1.5);
    SR.add(stripCore);
    var bar = new THREE.Mesh(rbox(stripW + 4, 2.8, 12, 1.1, 2), rail);
    bar.position.set(SX0 + (stripW - 16) / 2, 1.4, -1.6);
    bar.castShadow = true; bar.receiveShadow = true;
    SR.add(bar);
    var leds = [];
    for (var i = 0; i < NB; i++) {
      var L = led5(M);
      L.group.rotation.x = Math.PI / 2;
      L.group.position.set(ledX(i), SY, -0.2);
      L.group.scale.setScalar(1.5);
      SR.add(L.group);
      leds.push(L);
    }
    bake(SR);

    /* ---- labels ---- */
    function lab(text, at, o) { o = o || {}; o.at = at; return v.label(text, o); }
    var gL = lab('', function () { return [LX - LW / 2 - 4, yOfV(st.v), -14]; }, { cls: 'value', align: 'right', dx: -8, html: true });
    gL.el.style.color = P.blue; gL.el.style.fontSize = '14px'; gL.el.style.textAlign = 'right';

    /* ---- state ---- */
    var PLAN = [1.65, 0.42, 2.9, 1.07, 3.21, 2.35], MOVE = 1.8, HOLD = 2.8;
    var st = { auto: true, v: 1.65, target: 1.65, lit: [] };
    for (i = 0; i < NB; i++) st.lit.push(0);
    function autoV(t) {
      var seg = MOVE + HOLD, n = PLAN.length;
      var tt = t + MOVE;
      var j = Math.floor(tt / seg), ph = tt - j * seg;
      var a = PLAN[(j - 1 + n * 100) % n], b = PLAN[j % n];
      if (ph < MOVE) return lerp(a, b, easeIO(ph / MOVE));
      return b;
    }
    /* the voltage as shown (2 decimals when it sits on a 0,01 V value, else 3) */
    function vshown(x) { var c = Math.abs(x * 100 - Math.round(x * 100)) < 0.02; return c ? Math.round(x * 100) / 100 : Math.round(x * 1000) / 1000; }
    function codeOf(x) { return clamp(Math.round(vshown(x) / VREF * NMAX), 0, NMAX); }
    function bin(n) { var s = n.toString(2); while (s.length < 12) s = '0' + s; return s.slice(0, 4) + ' ' + s.slice(4, 8) + ' ' + s.slice(8); }
    function vtxt(x) { var c = Math.abs(x * 100 - Math.round(x * 100)) < 0.02; return K.num(x, c ? 2 : 3) + ' V'; }
    function reset() {
      st.auto = !K.reducedMotion;
      st.v = st.target = 1.65;
      var n = codeOf(st.v);
      for (var b = 0; b < NB; b++) st.lit[b] = (n >> (NB - 1 - b)) & 1;
      v.setView(VIEW);
    }
    reset();

    function frame(t, dt) {
      if (st.auto) st.target = autoV(t);
      st.v = st.auto ? st.target : approach(st.v, st.target, 6, dt);
      if (Math.abs(st.v - st.target) < 0.0005) st.v = st.target;
      var n = codeOf(st.v);
      var h = yOfV(st.v) - LB;
      colGeo.setSize(LW - 1.4, Math.max(0.01, h), 4.6, 0.4);
      column.position.set(LX, LB + h / 2, -14.2);
      column.visible = h > 0.05;
      surf.position.set(LX, LB + h, -14.2);
      surfGlow.position.set(LX, LB + h, -13.5);
      var coarse = Math.min(15, Math.floor(n / 256));
      for (var r = 0; r < 16; r++) {
        var m = rungMeshes[r].material;
        m.emissiveIntensity = approach(m.emissiveIntensity, r === coarse ? 0.9 : 0, 10, dt);
      }
      for (var b = 0; b < NB; b++) {
        var on = (n >> (NB - 1 - b)) & 1;
        st.lit[b] = approach(st.lit[b], on, 12, dt);
        leds[b].set(st.lit[b]);
      }
      gL.set('<span style="font:500 10.5px IBM Plex Mono,monospace;color:#595E69;letter-spacing:.08em">GİRİŞ</span><br>' + vtxt(st.v));
      v.render(dt);
      draw2d(n);
    }

    var pr = new THREE.Vector3();
    function P3(x, y, z) { pr.set(x, y, z); return v.project(pr); }
    function draw2d(n) {
      var c = v.ctx;
      if (!c) return;
      var W = v.w, H = v.h, sx = W / 680;
      /* scale labels beside the ladder */
      var plv = P3(LX, yOfV(st.v), -14);
      [[0, '0 V', '0'], [0.5, '1,65 V', '2.048'], [1, '3,3 V', '4.095']].forEach(function (d) {
        var pl = P3(LX - LW / 2 - 4.5, yOfV(VREF * d[0]), -14), prr = P3(LX + LW / 2 + 4.5, yOfV(VREF * d[0]), -14);
        var near = clamp((Math.abs(pl.y - plv.y) - 10) / 8, 0, 1);
        K.label(c, d[1], pl.x - 8, pl.y + 4, { size: 11, mono: true, color: P.muted, align: 'right', alpha: near });
        K.label(c, d[2], prr.x + 8, prr.y + 4, { size: 11, mono: true, color: P.copper, align: 'left' });
      });
      var ptop = P3(LX, yOfV(VREF) + 12, -14);
      K.label(c, '16 kaba basamak', ptop.x, ptop.y - 14, { size: 11, mono: true, color: P.muted, align: 'center' });
      K.label(c, '× 256 ince basamak', ptop.x, ptop.y, { size: 11, mono: true, color: P.muted, align: 'center' });
      /* magnifier on the level */
      var exact = vshown(st.v) / VREF * NMAX;
      var lv = P3(LX + LW / 2 + 1, yOfV(st.v), -13);
      var mcx = 335 * sx, mcy = clamp(lv.y, 94, 214), R = 70;
      c.save();
      c.strokeStyle = K.rgba(P.ink2, 0.45); c.lineWidth = 1;
      c.strokeRect(lv.x - 3, lv.y - 7, 10, 14);
      c.beginPath(); c.moveTo(lv.x + 7, lv.y - 7); c.lineTo(mcx - R * 0.94, mcy - R * 0.34); c.stroke();
      c.beginPath(); c.moveTo(lv.x + 7, lv.y + 7); c.lineTo(mcx - R * 0.94, mcy + R * 0.34); c.stroke();
      c.fillStyle = '#FBFBF8';
      c.beginPath(); c.arc(mcx, mcy, R, 0, TAU); c.fill();
      c.clip();
      var SP = 15, kk;
      for (kk = -6; kk <= 6; kk++) {
        var code = n + kk;
        if (code < 0 || code > NMAX) continue;
        var yy = mcy - (code - exact) * SP;
        var act = kk === 0;
        c.strokeStyle = act ? P.copperFill : 'rgba(62,67,77,0.55)';
        c.lineWidth = act ? 2.2 : 1;
        c.beginPath(); c.moveTo(mcx - R, Math.round(yy) + 0.5); c.lineTo(mcx + R * 0.32, Math.round(yy) + 0.5); c.stroke();
        K.label(c, K.num(code, 0), mcx + R * 0.38, yy + 4, { size: act ? 12 : 11, mono: true, weight: act ? 600 : 400, color: act ? P.copper : P.muted });
      }
      c.fillStyle = K.rgba(P.blue, 0.12);
      c.fillRect(mcx - R, mcy, R * 2, R);
      c.strokeStyle = P.blue; c.lineWidth = 2;
      c.beginPath(); c.moveTo(mcx - R, mcy + 0.5); c.lineTo(mcx + R * 0.3, mcy + 0.5); c.stroke();
      c.restore();
      c.save();
      c.strokeStyle = P.ink2; c.lineWidth = 1.5;
      c.beginPath(); c.arc(mcx, mcy, R, 0, TAU); c.stroke();
      c.restore();
      K.label(c, 'büyüteç: bir basamak ≈ 0,8 mV', mcx + R + 10, mcy + R - 6, { size: 11.5, color: P.muted, align: 'left' });
      /* number */
      var nx = 640 * sx;
      K.label(c, 'SAYI (0–4.095)', nx, 40, { size: 10.5, mono: true, weight: 600, color: P.muted, align: 'right', spacing: 1.2 });
      K.label(c, K.num(n, 0), nx, 100, { size: 56, mono: true, weight: 600, color: P.ink, align: 'right' });
      K.label(c, '12 bitle yazılır; ikilik hâli aşağıda', nx, 128, { size: 12, color: P.muted, align: 'right' });
      /* bit digits above the LEDs, place values below */
      var terms = [];
      for (var b = 0; b < NB; b++) {
        var val = 1 << (NB - 1 - b);
        var on = (n >> (NB - 1 - b)) & 1;
        if (on) terms.push(K.num(val, 0));
        var pt = P3(ledX(b), SY + 13.5, 0), pb = P3(ledX(b), SY - 13, 0);
        K.label(c, String(on), pt.x, pt.y, { size: 21, mono: true, weight: 600, color: on ? P.copper : 'rgba(89,94,105,0.55)', align: 'center' });
        K.label(c, K.num(val, 0), pb.x, pb.y + 10, { size: 11.5, mono: true, weight: on ? 600 : 400, color: on ? P.copper : P.muted, align: 'center' });
      }
      var pg0 = P3(ledX(0) - 9, SY, 0);
      K.label(c, 'bit', pg0.x - 6, P3(0, SY + 13.5, 0).y, { size: 11, mono: true, color: P.muted, align: 'right' });
      K.label(c, 'değer', pg0.x - 6, P3(0, SY - 13, 0).y + 10, { size: 11, mono: true, color: P.muted, align: 'right' });
      var sumTxt = terms.length ? (terms.length > 1 ? terms.join(' + ') + ' = ' + K.num(n, 0) : terms[0]) : 'hiç LED yanmıyor = 0';
      var ys = P3(0, SY - 13, 0).y + 40;
      var pre = 'Yanan LED’lerin değerleri toplanır: ', fs1 = 12.5, w1, w2;
      c.save();
      for (var tries = 0; tries < 4; tries++) {
        c.font = K.font(fs1, 500, false); w1 = c.measureText(pre).width;
        c.font = K.font(fs1, 600, true); w2 = c.measureText(sumTxt).width;
        if (w1 + w2 <= W - 24) break;
        if (tries === 0) pre = 'Toplam: '; else fs1 -= 0.75;
      }
      c.restore();
      var xs = (W - w1 - w2) / 2;
      K.label(c, pre, xs, ys, { size: fs1, weight: 500, color: P.ink2 });
      K.label(c, sumTxt, xs + w1, ys, { size: fs1, mono: true, weight: 600, color: P.copper });
    }

    return {
      reset: reset,
      frame: frame,
      set: function (k, val) {
        if (k !== 'volt') return;
        st.auto = false;
        st.target = clamp(+val, 0, VREF);
      },
      read: function (k) {
        var n = codeOf(st.v);
        if (k === 'volt') return vtxt(st.v);
        if (k === 'number') return K.num(n, 0);
        if (k === 'formula') return vtxt(st.v) + ' ÷ 3,3 V × 4.095 ≈ ' + K.num(n, 0);
        if (k === 'bits') return bin(n);
        if (k === 'step') return 'Bir basamak ≈ 3,3 V ÷ 4.096 ≈ 0,8 mV';
        return '';
      },
      resize: function () { v.sf.resize(); },
      dispose: function () { v.dispose(); }
    };
  });

  /* ==================================================================
   * 5 · logic-gates  (W 1120 × 380)
   * ================================================================== */
  K.register('logic-gates', function (el, opts) {
    var THREE = TH();
    opts = opts || {};
    var theme = opts.theme || 'light';
    ensureRelative(el);
    var VIEW = { yaw: 0, pitch: 0.94, distance: 410, target: [4, 0, 22] };
    var v = K.stage3d(el, {
      theme: theme, fov: 18, yaw: VIEW.yaw, pitch: VIEW.pitch, distance: VIEW.distance, target: VIEW.target,
      size: 190, ground: -1.62, near: 30, far: 3000, minYaw: -0.7, maxYaw: 0.7, minPitch: 0.45, maxPitch: 1.35, minDistance: 240, maxDistance: 620
    });
    if (v.lights) {
      v.lights.key.position.set(-90, 330, 170);
      v.lights.key.intensity = 1.45;
      v.lights.hemi.intensity = 0.42;
    }
    mmShadows(v);
    var M = circuitMats();
    var S = v.scene;
    var SR = new THREE.Group();
    S.add(SR);

    var CX = [-112, 0, 112];
    var BX0 = -166, BX1 = 174, BD0 = -49, BD1 = 53;
    var BW = BX1 - BX0, BD = BD1 - BD0, BCX = (BX0 + BX1) / 2, BCZ = (BD0 + BD1) / 2;
    var board = new THREE.Mesh(rbox(BW, 1.3, BD, 0.5, 2), M.core);
    board.position.set(BCX, -0.95, BCZ);
    board.receiveShadow = true; board.castShadow = true;
    SR.add(board);
    var mask = new THREE.Mesh(rbox(BW - 0.3, 0.16, BD - 0.3, 0.08, 1), M.board);
    mask.position.set(BCX, -0.08, BCZ);
    mask.receiveShadow = true;
    SR.add(mask);

    var TK = trackKit(S, M, { width: 2.5, halo: 8.5, staticRoot: SR });
    var DK = dotKit(S, 460, M, 0.9);
    var Y = 0.95;
    var SW = 1.3, SP2 = 11.8 * SW;

    /* silkscreen */
    var silk = decal(BW - 4, BD - 4, 6, function (c, w, h) {
      var ox = -BX0 - 2, oz = -BD0 - 2;
      c.strokeStyle = 'rgba(40,44,52,0.45)'; c.fillStyle = 'rgba(40,44,52,0.7)';
      c.lineWidth = 0.35;
      c.textAlign = 'center'; c.textBaseline = 'middle';
      CX.forEach(function (cx, i) {
        if (i > 0) { c.setLineDash([1.4, 1.4]); c.beginPath(); c.moveTo(ox + cx - 52, 3); c.lineTo(ox + cx - 52, h - 3); c.stroke(); c.setLineDash([]); }
        c.font = '600 3.4px "IBM Plex Mono", monospace';
        c.fillText('+', ox + cx - 46.2, oz + 20.9);
        c.fillText('−', ox + cx - 46.2, oz + 33.6);
      });
    });
    silk.rotation.x = -Math.PI / 2;
    silk.position.set(BCX, 0.02, BCZ);
    silk.renderOrder = 1;
    SR.add(silk);

    /* battery at the bottom of each panel, terminals to the left */
    function panelBase(cx) {
      var bat = battery9V(M, true);
      place(bat, cx - 5.75, 27.25, Math.PI / 2);
      SR.add(bat);
      TK.joint(cx - 41.75, 20.9); TK.joint(cx - 41.75, 33.6);
      var inner = [[cx - 41.75, 0.9, 20.9], [cx - 40.5, 6.5, 20.9], [cx - 35.5, 8.75, 20.9], [cx - 20, 8.75, 20.9], [cx - 20, 8.75, 33.6], [cx - 35.5, 8.75, 33.6], [cx - 40.5, 6.5, 33.6], [cx - 41.75, 0.9, 33.6]];
      return { bat: bat, inner: inner, innerLen: new Path3(inner).len };
    }
    function T(name, pts2, cx, o) { return TK.add(name, pts2.map(function (p) { return [p[0] + cx, p[1]]; }), o); }
    function F(pts2, cx) { return flat(pts2.map(function (p) { return [p[0] + cx, p[1]]; }), Y); }
    function knife(cx, u, w) { var k = knifeSwitch(M, SW); place(k, cx + u, w, 0); SR.add(k.group); TK.joint(cx + u - SP2, w); TK.joint(cx + u + SP2, w); return k; }
    function loopOf(parts, base) {
      var p = new Path3(densify([].concat.apply([], parts).concat(base.inner), 2));
      p.hide = [p.len - base.innerLen + 0.6, p.len - 0.4];
      return p;
    }

    var panels = [];
    /* ---------- VE: two switches in series ---------- */
    (function () {
      var cx = CX[0], P = { name: 'and' };
      var base = panelBase(cx);
      P.swA = knife(cx, -16, -30);
      P.swB = knife(cx, 20, -30);
      P.R = resistor(M, 390); place(P.R, cx + 52, -15, Math.PI / 2); SR.add(P.R.group);
      P.led = led5(M); place(P.led, cx + 52, 6, -Math.PI / 2); SR.add(P.led.group);
      [[52, -20.08], [52, -9.92], [52, 4.73], [52, 7.27]].forEach(function (p) { TK.joint(cx + p[0], p[1]); });
      T('and.p', [[-41.75, 20.9], [-41.75, -30], [-16 - SP2, -30]], cx);
      T('and.ab', [[-16 + SP2, -30], [20 - SP2, -30]], cx);
      T('and.br', [[20 + SP2, -30], [52, -30], [52, -20.08]], cx);
      T('and.rl', [[52, -9.92], [52, 4.73]], cx);
      T('and.n', [[52, 7.27], [52, 46], [-41.75, 46], [-41.75, 33.6]], cx);
      P.loop = loopOf([
        F([[-41.75, 33.6], [-41.75, 46], [52, 46], [52, 7.27]], cx),
        toWorld(P.led.path(false), cx + 52, 6, -Math.PI / 2),
        F([[52, 4.73], [52, -9.92]], cx),
        toWorld(P.R.path(true), cx + 52, -15, Math.PI / 2),
        F([[52, -20.08], [52, -30], [20 + SP2, -30]], cx),
        toWorld(P.swB.path(false), cx + 20, -30, 0),
        F([[20 - SP2, -30], [-16 + SP2, -30]], cx),
        toWorld(P.swA.path(false), cx - 16, -30, 0),
        F([[-16 - SP2, -30], [-41.75, -30], [-41.75, 20.9]], cx)
      ], base);
      P.tracks = ['and.p', 'and.ab', 'and.br', 'and.rl', 'and.n'];
      panels.push(P);
    })();

    /* ---------- VEYA: two switches in parallel ---------- */
    (function () {
      var cx = CX[1], P = { name: 'or' };
      var base = panelBase(cx);
      P.swA = knife(cx, -8, -38);
      P.swB = knife(cx, -8, -8);
      P.R = resistor(M, 390); place(P.R, cx + 52, -15, Math.PI / 2); SR.add(P.R.group);
      P.led = led5(M); place(P.led, cx + 52, 6, -Math.PI / 2); SR.add(P.led.group);
      [[52, -20.08], [52, -9.92], [52, 4.73], [52, 7.27]].forEach(function (p) { TK.joint(cx + p[0], p[1]); });
      var hA = -8 - SP2, jA = -8 + SP2;
      T('or.p', [[-41.75, 20.9], [-41.75, -38], [-31, -38]], cx);
      T('or.a1', [[-31, -38], [hA, -38]], cx, { r: 0 });
      T('or.b1', [[-31, -38], [-31, -8], [hA, -8]], cx);
      T('or.b2', [[jA, -8], [20, -8], [20, -38]], cx);
      T('or.a2', [[jA, -38], [20, -38]], cx, { r: 0 });
      T('or.j', [[20, -38], [52, -38], [52, -20.08]], cx);
      T('or.rl', [[52, -9.92], [52, 4.73]], cx);
      T('or.n', [[52, 7.27], [52, 46], [-41.75, 46], [-41.75, 33.6]], cx);
      var common1 = [].concat(
        F([[-41.75, 33.6], [-41.75, 46], [52, 46], [52, 7.27]], cx),
        toWorld(P.led.path(false), cx + 52, 6, -Math.PI / 2),
        F([[52, 4.73], [52, -9.92]], cx),
        toWorld(P.R.path(true), cx + 52, -15, Math.PI / 2),
        F([[52, -20.08], [52, -38], [20, -38]], cx)
      );
      var viaA = [].concat(F([[20, -38], [jA, -38]], cx), toWorld(P.swA.path(false), cx - 8, -38, 0), F([[hA, -38], [-31, -38]], cx));
      var viaB = [].concat(F([[20, -38], [20, -8], [jA, -8]], cx), toWorld(P.swB.path(false), cx - 8, -8, 0), F([[hA, -8], [-31, -8], [-31, -38]], cx));
      var common2 = F([[-31, -38], [-41.75, -38], [-41.75, 20.9]], cx);
      P.loopA = loopOf([common1, viaA, common2], base);
      P.loopB = loopOf([common1, viaB, common2], base);
      panels.push(P);
    })();

    /* ---------- DEĞİL: a switch drives a transistor ---------- */
    (function () {
      var cx = CX[2], P = { name: 'not' };
      var base = panelBase(cx);
      P.swA = knife(cx, -8, -8);
      P.Rb = resistor(M, 10000); place(P.Rb, cx + 16, -8, 0); SR.add(P.Rb.group);
      P.Rc = resistor(M, 390); place(P.Rc, cx + 40, -20, Math.PI / 2); SR.add(P.Rc.group);
      P.Q = to92(M); place(P.Q, cx + 28, 2, 0); SR.add(P.Q.group);
      P.led = led5(M); place(P.led, cx + 52, 14, -Math.PI / 2); SR.add(P.led.group);
      var hA = -8 - SP2, jA = -8 + SP2;
      [[10.92, -8], [21.08, -8], [40, -25.08], [40, -14.92], [25.46, 2], [28, -0.5], [30.54, 2], [52, 12.73], [52, 15.27]].forEach(function (p) { TK.joint(cx + p[0], p[1]); });
      T('not.p', [[-41.75, 20.9], [-41.75, -30], [40, -30], [40, -25.08]], cx);
      T('not.in', [[-36, -30], [-36, -8], [hA, -8]], cx, { width: 1.7 });
      T('not.ab', [[jA, -8], [10.92, -8]], cx, { width: 1.7 });
      T('not.base', [[21.08, -8], [28, -8], [28, -0.5]], cx, { width: 1.7 });
      T('not.x', [[40, -14.92], [40, -4]], cx);
      T('not.c', [[40, -4], [40, 2], [30.54, 2]], cx);
      T('not.l', [[40, -4], [52, -4], [52, 12.73]], cx);
      T('not.e', [[25.46, 2], [25.46, 46]], cx);
      T('not.nL', [[52, 15.27], [52, 46], [25.46, 46]], cx);
      T('not.n', [[25.46, 46], [-41.75, 46], [-41.75, 33.6]], cx);
      var tailP = F([[40, -25.08], [40, -30], [-41.75, -30], [-41.75, 20.9]], cx);
      P.loopL = loopOf([
        F([[-41.75, 33.6], [-41.75, 46], [52, 46], [52, 15.27]], cx),
        toWorld(P.led.path(false), cx + 52, 14, -Math.PI / 2),
        F([[52, 12.73], [52, -4], [40, -4], [40, -14.92]], cx),
        toWorld(P.Rc.path(true), cx + 40, -20, Math.PI / 2),
        tailP
      ], base);
      P.loopQ = loopOf([
        F([[-41.75, 33.6], [-41.75, 46], [25.46, 46], [25.46, 2]], cx),
        toWorld(P.Q.ce(true), cx + 28, 2, 0),
        F([[30.54, 2], [40, 2], [40, -4], [40, -14.92]], cx),
        toWorld(P.Rc.path(true), cx + 40, -20, Math.PI / 2),
        tailP
      ], base);
      P.loopB = loopOf([
        F([[-41.75, 33.6], [-41.75, 46], [25.46, 46], [25.46, 2]], cx),
        toWorld(P.Q.eb(), cx + 28, 2, 0),
        F([[28, -0.5], [28, -8], [21.08, -8]], cx),
        toWorld(P.Rb.path(false), cx + 16, -8, 0),
        F([[10.92, -8], [jA, -8]], cx),
        toWorld(P.swA.path(false), cx - 8, -8, 0),
        F([[hA, -8], [-36, -8], [-36, -30], [-41.75, -30], [-41.75, 20.9]], cx)
      ], base);
      panels.push(P);
    })();
    var AND = panels[0], OR = panels[1], NOT = panels[2];
    bake(SR);

    /* ---- labels ---- */
    function lab(text, at, o) { o = o || {}; o.at = at; return v.label(text, o); }
    [['VE', 0], ['VEYA', 1], ['DEĞİL', 2]].forEach(function (d) {
      var L = lab(d[0], [CX[d[1]] - 47, 0, -42], { cls: 'name', align: 'left' });
      L.el.style.fontSize = '15px'; L.el.style.letterSpacing = '0.05em';
    });
    var swLabels = [
      { key: 'A', k: 'and_a', at: [CX[0] - 16, 2, -19.5] },
      { key: 'B', k: 'and_b', at: [CX[0] + 20, 2, -19.5] },
      { key: 'A', k: 'or_a', at: [CX[1] - 8, 2, -26] },
      { key: 'B', k: 'or_b', at: [CX[1] - 8, 2, 2.5] },
      { key: 'A', k: 'not_a', at: [CX[2] - 27, 2, -19] }
    ];
    swLabels.forEach(function (s) { s.L = lab('', s.at, { cls: 'value', align: 'center' }); s.L.el.style.fontSize = '13px'; s.L.el.style.background = 'rgba(244,243,238,0.9)'; s.L.el.style.borderRadius = '4px'; s.L.el.style.padding = '0 4px'; });
    var lQ = lab('transistör', [CX[2] + 28, 7, 2], { cls: 'note', dx: 16, dy: -66, line: true, align: 'left' });
    lQ.el.style.fontSize = '13px'; lQ.el.style.textShadow = '0 0 3px #F4F3EE, 0 0 3px #F4F3EE, 0 0 3px #F4F3EE';
    lab('elektronlar · hız abartılı', [BX0 + 4, 0, BD1 - 3], { cls: 'tag', align: 'left' });

    /* ---- state ---- */
    var IN, st = { auto: true };
    var STEP = 3.4;
    var anim = {};
    var phase = { and: 0, or: 0, notL: 0, notQ: 0, notB: 0 };
    var lvl = { and: 0, orA: 0, orB: 0, notL: 0, notQ: 0 };

    function autoInputs(t) {
      var k = Math.floor(t / STEP) % 4;
      var a = k >> 1, b = k & 1;
      return { and_a: a, and_b: b, or_a: a, or_b: b, not_a: b };
    }
    function reset() {
      st.auto = !K.reducedMotion;
      IN = K.reducedMotion ? { and_a: 1, and_b: 0, or_a: 1, or_b: 0, not_a: 1 } : autoInputs(0);
      Object.keys(IN).forEach(function (k) { anim[k] = IN[k] ? 0 : 1; });
      Object.keys(lvl).forEach(function (k) { lvl[k] = 0; });
      Object.keys(phase).forEach(function (k) { phase[k] = 0; });
      TK.list.forEach(function (t) { t.act = 0; t.target = 0; });
      v.setView(VIEW);
    }
    reset();

    function frame(t, dt) {
      if (st.auto) IN = autoInputs(t);
      Object.keys(IN).forEach(function (k) {
        var target = IN[k] ? 0 : 1, sp = dt / 0.45;
        anim[k] = anim[k] < target ? Math.min(target, anim[k] + sp) : Math.max(target, anim[k] - sp);
      });
      function ang(k) { return easeIO(anim[k]); }
      AND.swA.set(ang('and_a')); AND.swB.set(ang('and_b'));
      OR.swA.set(ang('or_a')); OR.swB.set(ang('or_b'));
      NOT.swA.set(ang('not_a'));
      var cA = AND.swA.closed() && AND.swB.closed();
      var oA = OR.swA.closed(), oB = OR.swB.closed();
      var nA = NOT.swA.closed();
      var r = 14;
      lvl.and = approach(lvl.and, cA ? 1 : 0, r, dt);
      lvl.orA = approach(lvl.orA, oA ? 1 : 0, r, dt);
      lvl.orB = approach(lvl.orB, oB ? 1 : 0, r, dt);
      lvl.notQ = approach(lvl.notQ, nA ? 1 : 0, r, dt);
      lvl.notL = approach(lvl.notL, nA ? 0 : 1, r, dt);

      TK.clearTargets();
      if (cA) AND.tracks.forEach(function (n) { TK.tracks[n].target = 1; });
      if (oA || oB) ['or.p', 'or.j', 'or.rl', 'or.n'].forEach(function (n) { TK.tracks[n].target = 1; });
      if (oA) { TK.tracks['or.a1'].target = 1; TK.tracks['or.a2'].target = 1; }
      if (oB) { TK.tracks['or.b1'].target = 1; TK.tracks['or.b2'].target = 1; }
      ['not.p', 'not.x', 'not.n'].forEach(function (n) { TK.tracks[n].target = 1; });
      if (nA) {
        ['not.c', 'not.e'].forEach(function (n) { TK.tracks[n].target = 1; });
        ['not.in', 'not.ab', 'not.base'].forEach(function (n) { TK.tracks[n].target = 0.4; });
      } else { TK.tracks['not.l'].target = 1; TK.tracks['not.nL'].target = 1; }
      TK.update(dt);

      AND.led.set(lvl.and);
      OR.led.set(Math.max(lvl.orA, lvl.orB));
      NOT.led.set(lvl.notL);

      var V = K.reducedMotion ? 0 : 15, SPC = 4.6;
      phase.and += V * dt * lvl.and;
      phase.or += V * dt * Math.max(lvl.orA, lvl.orB);
      phase.notL += V * dt * lvl.notL;
      phase.notQ += V * dt * lvl.notQ;
      phase.notB += V * 0.3 * dt * lvl.notQ;
      var both = lvl.orA > 0.5 && lvl.orB > 0.5;
      DK.begin();
      DK.loop(AND.loop, phase.and, SPC, lvl.and, AND.loop.hide);
      if (both) {
        DK.loop(OR.loopA, phase.or, SPC * 2, lvl.orA, OR.loopA.hide);
        DK.loop(OR.loopB, phase.or + SPC, SPC * 2, lvl.orB, OR.loopB.hide);
      } else {
        DK.loop(OR.loopA, phase.or, SPC, lvl.orA, OR.loopA.hide);
        DK.loop(OR.loopB, phase.or, SPC, lvl.orB, OR.loopB.hide);
      }
      DK.loop(NOT.loopL, phase.notL, SPC, lvl.notL, NOT.loopL.hide);
      DK.loop(NOT.loopQ, phase.notQ, SPC, lvl.notQ, NOT.loopQ.hide);
      DK.loop(NOT.loopB, phase.notB, SPC * 7, lvl.notQ * 0.85, NOT.loopB.hide);
      DK.end();

      swLabels.forEach(function (s) {
        var on = IN[s.k];
        s.L.set(s.key + ' = ' + on);
        s.L.el.style.color = on ? P.copper : P.muted;
      });

      v.render(dt);
      drawTables();
    }

    function out(name) {
      if (name === 'and') return IN.and_a & IN.and_b;
      if (name === 'or') return IN.or_a | IN.or_b;
      return IN.not_a ? 0 : 1;
    }
    var COLS = [
      { name: 'VE', key: 'and', rule: ['Seri bağlı: akım iki anahtardan da', 'geçmek zorunda.'], rows: [[0, 0, 0], [0, 1, 0], [1, 0, 0], [1, 1, 1]] },
      { name: 'VEYA', key: 'or', rule: ['Paralel bağlı: akımın iki yolu var;', 'anahtarlardan biri kapalıysa yeter.'], rows: [[0, 0, 0], [0, 1, 1], [1, 0, 1], [1, 1, 1]] },
      { name: 'DEĞİL', key: 'not', rule: ['A = 1 olunca transistör iletir; akım', 'LED’e uğramadan geçer.'], rows: [[0, 1], [1, 0]] }
    ];
    function drawTables() {
      var c = v.ctx;
      if (!c) return;
      var W = v.w, H = v.h, sx = W / 1120;
      var top = H - 100;
      COLS.forEach(function (col, i) {
        var x0 = (22 + i * 373) * sx;
        var a = col.key === 'and' ? IN.and_a : col.key === 'or' ? IN.or_a : IN.not_a;
        var b = col.key === 'and' ? IN.and_b : IN.or_b;
        var q = out(col.key);
        var eq = col.key === 'not' ? 'DEĞİL ' + a + ' = ' : a + ' ' + col.name + ' ' + b + ' = ';
        c.save();
        c.font = K.font(21, 600, true);
        var wEq = c.measureText(eq).width;
        c.restore();
        if (q) { c.fillStyle = K.rgba(P.copperFill, 0.16); K.rr(c, x0 + wEq - 5, top + 4, 24, 28, 5); c.fill(); }
        K.label(c, eq, x0, top + 25, { size: 21, mono: true, weight: 600, color: P.ink });
        K.label(c, String(q), x0 + wEq, top + 25, { size: 21, mono: true, weight: 600, color: q ? P.copper : P.ink });
        col.rule.forEach(function (line, j) { K.label(c, line, x0, top + 52 + j * 17, { size: 13, color: P.muted }); });
        var heads = col.key === 'not' ? ['A', 'LED'] : ['A', 'B', 'LED'];
        var tx = x0 + 242 * sx, rowH = 19, ty = top, PIT = 38;
        heads.forEach(function (hd, j) { K.label(c, hd, tx + j * PIT, ty + 10, { size: 13, mono: true, weight: 600, color: P.muted, align: 'center' }); });
        c.strokeStyle = P.line; c.lineWidth = 1;
        c.beginPath(); c.moveTo(tx - 17, ty + 18.5); c.lineTo(tx + (heads.length - 1) * PIT + 17, ty + 18.5); c.stroke();
        col.rows.forEach(function (row, rI) {
          var yy = ty + 35 + rI * rowH;
          var active = col.key === 'not' ? row[0] === a : (row[0] === a && row[1] === b);
          if (active) { c.fillStyle = K.rgba(P.copperFill, 0.15); K.rr(c, tx - 19, yy - 12.5, (heads.length - 1) * PIT + 38, 19, 4); c.fill(); }
          row.forEach(function (val, j) {
            var isOut = j === row.length - 1;
            K.label(c, String(val), tx + j * PIT, yy + 1, { size: 15, mono: true, weight: active ? 600 : 400, color: isOut ? (val ? P.copper : P.ink2) : (active ? P.ink : P.muted), align: 'center' });
          });
        });
      });
      K.label(c, 'anahtar kapalı = 1 · açık = 0 · LED yanıyor = 1', W - 14 * sx, 16, { size: 11.5, color: P.muted, align: 'right' });
    }

    return {
      reset: reset,
      frame: frame,
      set: function (k, val) {
        if (!(k in IN)) return;
        if (st.auto) { st.auto = false; IN = Object.assign({}, IN); }   // keep what the buttons already show
        IN[k] = (val === 1 || val === '1' || val === true) ? 1 : 0;
      },
      read: function (k) {
        if (k in IN) return String(IN[k]);   // lets the deck mirror the demo on the toggle buttons
        if (k === 'and') return IN.and_a + ' VE ' + IN.and_b + ' = ' + out('and');
        if (k === 'or') return IN.or_a + ' VEYA ' + IN.or_b + ' = ' + out('or');
        if (k === 'not') return 'DEĞİL ' + IN.not_a + ' = ' + out('not');
        return '';
      },
      resize: function () { v.sf.resize(); },
      dispose: function () { v.dispose(); }
    };
  });

})();
