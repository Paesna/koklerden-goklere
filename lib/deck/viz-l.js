/* Köklerden Göklere · Builder L: ağ, haberleşme ve gökler
 * net-speed · phone-battery · wireless · message-journey · copy-noise · geo-orbit · algo-lamp
 * Sözleşme: kg-viz.js (KGViz.register, stage3d, surface). Tüm hareket frame() içinden sürülür.
 */
(function () {
  'use strict';
  var K = window.KGViz;
  if (!K) return;
  var P = K.palette;
  var clamp = K.clamp, lerp = K.lerp, sstep = K.smoothstep, span = K.span, E = K.ease;

  function TH() { return window.THREE; }

  /* ------------------------------------------------------------------
   * Shared helpers
   * ------------------------------------------------------------------ */

  /* Turkish number, up to d decimals, trailing zeros trimmed: 12,5 · 2 · 1.000 */
  function nf(x, d) {
    var s = K.num(x, d || 0);
    if (d && s.indexOf(',') >= 0) s = s.replace(/0+$/, '').replace(/,$/, '');
    return s;
  }

  function easeTo(cur, target, rate, dt) { return cur + (target - cur) * (1 - Math.exp(-rate * dt)); }

  /* Rounded box with analytic normals (port of three's RoundedBoxGeometry). */
  function rbox(w, h, d, r, seg) {
    var THREE = TH();
    var s = (seg || 3) * 2 + 1;
    r = Math.min(w / 2, h / 2, d / 2, r);
    var g = new THREE.BoxGeometry(1, 1, 1, s, s, s).toNonIndexed();
    var pos = g.attributes.position.array, nor = g.attributes.normal.array;
    var bx = w / 2 - r, by = h / 2 - r, bz = d / 2 - r, hs = 0.5 / s;
    for (var i = 0; i < pos.length; i += 3) {
      var x = pos[i], y = pos[i + 1], z = pos[i + 2];
      var sx = Math.sign(x), sy = Math.sign(y), sz = Math.sign(z);
      var nx = x - sx * hs, ny = y - sy * hs, nz = z - sz * hs;
      var l = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1;
      nx /= l; ny /= l; nz /= l;
      pos[i] = bx * sx + nx * r; pos[i + 1] = by * sy + ny * r; pos[i + 2] = bz * sz + nz * r;
      nor[i] = nx; nor[i + 1] = ny; nor[i + 2] = nz;
    }
    g.computeBoundingBox(); g.computeBoundingSphere();
    return g;
  }

  function rrShape(w, h, r) {
    var THREE = TH(), s = new THREE.Shape(), x = -w / 2, y = -h / 2;
    r = Math.max(1e-4, Math.min(r, w / 2 - 1e-4, h / 2 - 1e-4));
    s.moveTo(x + r, y);
    s.lineTo(x + w - r, y); s.absarc(x + w - r, y + r, r, -Math.PI / 2, 0, false);
    s.lineTo(x + w, y + h - r); s.absarc(x + w - r, y + h - r, r, 0, Math.PI / 2, false);
    s.lineTo(x + r, y + h); s.absarc(x + r, y + h - r, r, Math.PI / 2, Math.PI, false);
    s.lineTo(x, y + r); s.absarc(x + r, y + r, r, Math.PI, Math.PI * 1.5, false);
    return s;
  }

  /* Rounded-rectangle slab (w × h in XY, corner radius r) extruded along z (depth d) with edge bevel b. Centred. */
  function slab(w, h, d, r, b, cs) {
    var THREE = TH();
    b = Math.max(0, Math.min(b || 0, d / 2 - 1e-3, r - 1e-3));
    var g = new THREE.ExtrudeGeometry(rrShape(w - 2 * b, h - 2 * b, Math.max(1e-3, r - b)), {
      depth: Math.max(1e-3, d - 2 * b), bevelEnabled: b > 0, bevelThickness: b, bevelSize: b,
      bevelSegments: 3, curveSegments: cs || 10
    });
    g.translate(0, 0, -(d - 2 * b) / 2);
    return g;
  }

  /* Same slab lying flat: thickness along y, footprint w (x) × dd (z). Bottom at y = 0. */
  function flatSlab(w, dd, th, r, b, cs) {
    var g = slab(w, dd, th, r, b, cs);
    g.rotateX(-Math.PI / 2);
    g.translate(0, th / 2, 0);
    return g;
  }

  function rrPlane(w, h, r, cs) { return new (TH().ShapeGeometry)(rrShape(w, h, r), cs || 8); }

  /* Soft radial sprite texture (white, alpha falloff). One per visual so dispose stays local. */
  function softTex(hard) {
    var THREE = TH(), c = document.createElement('canvas');
    c.width = c.height = 128;
    var g = c.getContext('2d'), gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    if (hard) {
      gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.45, 'rgba(255,255,255,0.8)');
      gr.addColorStop(0.75, 'rgba(255,255,255,0.18)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    } else {
      gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.22, 'rgba(255,255,255,0.6)');
      gr.addColorStop(0.55, 'rgba(255,255,255,0.14)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    }
    g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
    return new THREE.CanvasTexture(c);
  }

  /* Point sprites with per-point RGBA. Size is corrected every frame so it does not depend on the
   * shared renderer size (PointsMaterial scales by the renderer height, not by our viewport). */
  function glowPoints(n, worldSize, o) {
    var THREE = TH();
    o = o || {};
    var geo = new THREE.BufferGeometry();
    var pos = new Float32Array(n * 3), col = new Float32Array(n * 4);
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute('color', new THREE.BufferAttribute(col, 4).setUsage(THREE.DynamicDrawUsage));
    var mat = new THREE.PointsMaterial({
      size: 1, map: o.map || softTex(o.hard), vertexColors: true, transparent: true, depthWrite: false,
      depthTest: o.depthTest !== false, blending: THREE.NormalBlending,
      toneMapped: false, sizeAttenuation: true
    });
    var pts = new THREE.Points(geo, mat);
    pts.frustumCulled = false;
    pts.renderOrder = o.renderOrder || 5;
    var n0 = 0;
    pts.begin = function () { n0 = 0; };
    pts.add1 = function (x, y, z, r, g, b, a) {
      if (n0 >= n) return;
      pos[n0 * 3] = x; pos[n0 * 3 + 1] = y; pos[n0 * 3 + 2] = z;
      col[n0 * 4] = r; col[n0 * 4 + 1] = g; col[n0 * 4 + 2] = b; col[n0 * 4 + 3] = a;
      n0++;
    };
    pts.end = function () {
      geo.setDrawRange(0, n0);
      geo.attributes.position.needsUpdate = true;
      geo.attributes.color.needsUpdate = true;
    };
    pts.worldSize = worldSize;
    return pts;
  }
  var _sz = null;
  function fixPoints(v, pts) {
    var r = K.renderer();
    if (!r) return;
    var THREE = TH();
    _sz = _sz || new THREE.Vector2();
    r.getSize(_sz);
    var hPx = Math.max(1, Math.round(v.sf.h * v.sf.k));
    var gh = Math.max(hPx, _sz.y || hPx);
    var tf = Math.tan(v.camera.fov * Math.PI / 360);
    pts.material.size = pts.worldSize / tf * (hPx / gh);
  }

  /* Instanced mesh with full transform per instance (position, quaternion, non-uniform scale). */
  function instMesh(geo, mat, n) {
    var THREE = TH();
    var m = new THREE.InstancedMesh(geo, mat, n);
    m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    m.frustumCulled = false;
    var M = new THREE.Matrix4(), Q = new THREE.Quaternion(), S = new THREE.Vector3(), Pp = new THREE.Vector3(), C = new THREE.Color();
    var c0 = 0;
    m.begin = function () { c0 = 0; };
    m.put = function (x, y, z, sx, sy, sz, q) {
      if (c0 >= n) return -1;
      Pp.set(x, y, z); S.set(sx, sy === undefined ? sx : sy, sz === undefined ? sx : sz);
      M.compose(Pp, q || Q.set(0, 0, 0, 1), S);
      m.setMatrixAt(c0, M);
      return c0++;
    };
    m.color = function (i, r, g, b) { if (i >= 0) { C.setRGB(r, g, b); m.setColorAt(i, C); } };
    m.end = function () {
      m.count = c0;
      m.instanceMatrix.needsUpdate = true;
      if (m.instanceColor) m.instanceColor.needsUpdate = true;
    };
    return m;
  }

  /* Merge static child meshes of 'root' that share a material into one mesh per material
   * (fewer draw calls). Instanced meshes, multi-material meshes and meshes with children are left alone. */
  function mergeStatic(root) {
    var THREE = TH();
    root.updateMatrixWorld(true);
    var inv = new THREE.Matrix4().copy(root.matrixWorld).invert();
    var groups = {}, order = [];
    root.traverse(function (o) {
      if (!o.isMesh || o.isInstancedMesh || Array.isArray(o.material) || o.children.length || o.userData.keep) return;
      var g = o.geometry;
      if (!g.attributes.position || !g.attributes.normal || !g.attributes.uv) return;
      var k = o.material.uuid;
      if (!groups[k]) { groups[k] = []; order.push(k); }
      groups[k].push(o);
    });
    order.forEach(function (k) {
      var list = groups[k];
      if (list.length < 2) return;
      var pos = [], nor = [], uv = [], cast = false, recv = false, ro = 0;
      var m4 = new THREE.Matrix4(), nm = new THREE.Matrix3();
      list.forEach(function (o) {
        var g = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone();
        m4.multiplyMatrices(inv, o.matrixWorld);
        g.applyMatrix4(m4);
        pos.push(g.attributes.position.array); nor.push(g.attributes.normal.array); uv.push(g.attributes.uv.array);
        cast = cast || o.castShadow; recv = recv || o.receiveShadow; ro = Math.max(ro, o.renderOrder);
        g.dispose();
        o.parent.remove(o);
      });
      function cat(arrs) {
        var n = 0; arrs.forEach(function (a) { n += a.length; });
        var out = new Float32Array(n), off = 0;
        arrs.forEach(function (a) { out.set(a, off); off += a.length; });
        return out;
      }
      var geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(cat(pos), 3));
      geo.setAttribute('normal', new THREE.BufferAttribute(cat(nor), 3));
      geo.setAttribute('uv', new THREE.BufferAttribute(cat(uv), 2));
      geo.computeBoundingSphere();
      var mm = new THREE.Mesh(geo, list[0].material);
      mm.castShadow = cast; mm.receiveShadow = recv; mm.renderOrder = ro;
      root.add(mm);
    });
  }

  function shadowAll(o, cast, recv) {
    o.traverse(function (c) { if (c.isMesh) { c.castShadow = !!cast; c.receiveShadow = !!recv; } });
  }

  /* Canvas + CanvasTexture pair for printed or live screen content. */
  function canvasTex(w, h) {
    var THREE = TH(), c = document.createElement('canvas');
    c.width = w; c.height = h;
    var tex = new THREE.CanvasTexture(c);
    tex.encoding = THREE.sRGBEncoding;
    tex.anisotropy = 8;
    return { canvas: c, ctx: c.getContext('2d'), tex: tex };
  }

  function rrPath(g, x, y, w, h, r) { K.rr(g, x, y, w, h, r); }

  /* Re-draw canvas textures once webfonts are ready (no timers involved). */
  function onFonts(fn) {
    try { if (document.fonts && document.fonts.ready) document.fonts.ready.then(fn); } catch (e) { /* ignore */ }
  }

  function setLabelSize(L, px) { L.el.style.fontSize = px + 'px'; return L; }
  /* Change a DOM label only when its text really changes (avoids per-frame layout work). */
  function setIf(L, txt) { if (L._kgT !== txt) { L._kgT = txt; L.set(txt); } }
  function styleIf(L, prop, val) { var k = '_kgS' + prop; if (L[k] !== val) { L[k] = val; L.el.style[prop] = val; } }

  /* ------------------------------------------------------------------
   * Smartphone model (shared): rounded aluminium frame, glass front with a screen texture.
   * Local frame: width along x, height along y, thickness along z, screen facing +z. Centre at origin.
   * o: {w, h, d, screen: texture|null, color}
   * ------------------------------------------------------------------ */
  function makePhone(o) {
    var THREE = TH();
    o = o || {};
    var w = o.w || 7.2, h = o.h || 15.2, d = o.d || 0.8;
    var g = new THREE.Group();
    var frameMat = K.mat.std(o.color || 0x9AA0A8, 0.32, 1, { envMapIntensity: 1.1 });
    var body = new THREE.Mesh(slab(w, h, d, w * 0.14, d * 0.32, 14), frameMat);
    g.add(body);
    var glassMat = K.mat.std(0x0C0E12, 0.12, 0.0, { envMapIntensity: 1.3 });
    var glass = new THREE.Mesh(rrPlane(w - 0.22, h - 0.22, w * 0.125, 10), glassMat);
    glass.position.z = d / 2 + 0.002;
    g.add(glass);
    var screen = null;
    if (o.screen) {
      var sm = new THREE.MeshBasicMaterial({ map: o.screen, toneMapped: false });
      screen = new THREE.Mesh(rrPlane(w - 0.62, h - 0.62, w * 0.1, 10), sm);
      screen.position.z = d / 2 + 0.006;
      // UVs of ShapeGeometry are in shape units; remap to 0..1
      var uv = screen.geometry.attributes.uv, pa = screen.geometry.attributes.position;
      for (var i = 0; i < uv.count; i++) uv.setXY(i, pa.getX(i) / (w - 0.62) + 0.5, pa.getY(i) / (h - 0.62) + 0.5);
      uv.needsUpdate = true;
      g.add(screen);
    }
    // camera punch-hole
    var cam = new THREE.Mesh(new THREE.CircleGeometry(w * 0.035, 16), K.mat.std(0x050608, 0.2));
    cam.position.set(0, h / 2 - 0.62, d / 2 + 0.008);
    g.add(cam);
    // side buttons
    var btnMat = frameMat;
    var b1 = new THREE.Mesh(rbox(0.12, h * 0.1, d * 0.42, 0.05, 2), btnMat);
    b1.position.set(w / 2 + 0.03, h * 0.18, 0); g.add(b1);
    var b2 = new THREE.Mesh(rbox(0.12, h * 0.16, d * 0.42, 0.05, 2), btnMat);
    b2.position.set(w / 2 + 0.03, h * 0.02, 0); g.add(b2);
    g.userData = { w: w, h: h, d: d, screen: screen, body: body };
    return g;
  }

  /* ==================================================================
   * 1) net-speed · W 1120×380 · light
   * Mbps vs MB/s: bit pulses in a fibre, 8 bits latch into one byte, a laptop downloads a 4 GB film.
   * ================================================================== */
  K.register('net-speed', function (el, opts) {
    var THREE = TH();
    var theme = opts.theme || 'light';
    var dark = theme === 'dark';
    var v = K.stage3d(el, {
      theme: theme, fov: 22, distance: 104, yaw: 0, pitch: 0.24, target: [-7, 10.5, 0], near: 8, far: 900,
      size: 45, ground: 0, minYaw: -0.55, maxYaw: 0.55, minPitch: 0.03, maxPitch: 0.75
    });
    var S = v.scene;
    if (v.lights) {
      v.lights.key.intensity = 1.3; v.lights.hemi.intensity = 0.55;
      v.lights.key.position.set(-22, 80, 60);
    }

    var SPEEDS = [16, 100, 1000];
    var VIS = { 16: 3, 100: 8, 1000: 20 };      // bit pulses per second on screen (slowed)
    var X_IN = -98, X_END = -15.5;               // fibre entry (hidden) → receiver face
    var X_CUT = -55;                             // where the lengthwise cutaway begins
    var VB = 27;                                 // visual pulse speed in the glass (cm/s)
    var TRANSIT = (X_END - X_IN) / VB;
    var AX = 3.8;                                // cable axis height
    var PITCH = 2.0, REG0 = -10.2, NCELL = 8;    // byte register
    var REG_C = REG0 + PITCH * NCELL / 2;
    var FILM_MB = 4000, COMPRESS = 60;           // 1 visual second = 1 real minute

    /* ---------- fibre cable ---------- */
    var cable = new THREE.Group();
    S.add(cable);
    var layers = [
      { ro: 3.8, ri: 3.2, mat: K.mat.std(0x41454C, 0.55), name: 'jacket' },
      { ro: 3.2, ri: 2.5, mat: K.mat.std(0xD9C483, 0.85), name: 'aramid' },
      { ro: 2.5, ri: 1.45, mat: K.mat.std(0xEDEBE5, 0.6), name: 'buffer' },
      { ro: 1.45, ri: 0.7, mat: K.mat.std(0xA8C0CA, 0.22, 0, { envMapIntensity: 1.2 }), name: 'cladding' },
      { ro: 0.7, ri: 0, mat: K.mat.std(0x4C6876, 0.14, 0, { envMapIntensity: 1.2 }), name: 'core' }
    ];
    // aramid yarn texture for the cut face
    (function () {
      var ct = canvasTex(512, 64), g = ct.ctx, r = K.rng(77);
      g.fillStyle = '#C9AC5E'; g.fillRect(0, 0, 512, 64);
      for (var i = 0; i < 90; i++) {
        var y = r() * 64, a = 0.18 + r() * 0.3;
        g.strokeStyle = r() < 0.5 ? 'rgba(255,240,190,' + a + ')' : 'rgba(150,120,50,' + a * 0.7 + ')';
        g.lineWidth = 0.6 + r() * 1.4;
        g.beginPath(); g.moveTo(0, y);
        for (var x = 0; x <= 512; x += 32) g.lineTo(x, y + Math.sin(x * 0.02 + i) * 1.6);
        g.stroke();
      }
      ct.tex.wrapS = ct.tex.wrapT = THREE.RepeatWrapping;
      ct.tex.repeat.set(6, 1);
      layers[1].mat.map = ct.tex;
      layers[1].mat.color.set(0xffffff);
    })();
    var cutLen = X_END - X_CUT;
    // intact section (left): full jacket
    var intact = new THREE.Mesh(new THREE.CylinderGeometry(3.8, 3.8, X_CUT - X_IN, 64, 1, true), layers[0].mat);
    intact.geometry.rotateZ(-Math.PI / 2);
    intact.position.set((X_IN + X_CUT) / 2, AX, 0);
    intact.castShadow = true;
    cable.add(intact);
    layers.forEach(function (L, li) {
      // back half shell (only the jacket's outside is ever visible, but inner shells close the look at the step)
      if (li === 0) {
        var back = new THREE.Mesh(new THREE.CylinderGeometry(L.ro, L.ro, cutLen, 56, 1, true, Math.PI / 2, Math.PI), L.mat);
        back.geometry.rotateZ(-Math.PI / 2);
        back.position.set((X_CUT + X_END) / 2, AX, 0);
        back.castShadow = true;
        cable.add(back);
        var inner = new THREE.Mesh(new THREE.CylinderGeometry(L.ri, L.ri, cutLen, 56, 1, true, Math.PI / 2, Math.PI), K.mat.std(0x2F3238, 0.7, 0, { side: THREE.BackSide }));
        inner.geometry.rotateZ(-Math.PI / 2);
        inner.position.copy(back.position);
        cable.add(inner);
      }
      // lengthwise cut face (plane z = 0): strips above and below the axis
      var hgt = L.ro - L.ri;
      [1, -1].forEach(function (sgn) {
        if (L.ri === 0 && sgn < 0) return;
        var hh = L.ri === 0 ? L.ro * 2 : hgt;
        var cy = L.ri === 0 ? 0 : sgn * (L.ri + hgt / 2);
        var strip = new THREE.Mesh(new THREE.PlaneGeometry(cutLen, hh), L.mat);
        strip.position.set((X_CUT + X_END) / 2, AX + cy, 0);
        strip.receiveShadow = true;
        cable.add(strip);
      });
      // transverse half-ring at the step (faces +x)
      var ring = new THREE.Mesh(new THREE.RingGeometry(Math.max(0.0001, L.ri), L.ro, 48, 1, -Math.PI / 2, Math.PI), L.mat);
      ring.rotation.y = Math.PI / 2;
      ring.position.set(X_CUT, AX, 0);
      cable.add(ring);
    });

    (function () {
      var lm = new THREE.MeshBasicMaterial({ color: 0x23262B, transparent: true, opacity: 0.45, depthWrite: false });
      [3.2, 2.5, 1.45, 0.7].forEach(function (r) {
        [1, -1].forEach(function (sg) {
          var ln = new THREE.Mesh(new THREE.PlaneGeometry(cutLen, 0.07), lm);
          ln.position.set((X_CUT + X_END) / 2, AX + sg * r, 0.01);
          cable.add(ln);
        });
      });
    })();

    mergeStatic(cable);

    /* ---------- receiver block and byte register ---------- */
    var metal = K.mat.std(0x60656E, 0.42, 0.7);
    var recv = new THREE.Mesh(rbox(4.2, 8.4, 8.8, 0.7, 3), metal);
    recv.position.set(X_END + 2.1, 4.2, 0);
    recv.castShadow = true;
    S.add(recv);
    var lens = new THREE.Mesh(new THREE.CircleGeometry(1.0, 32), K.mat.std(0x1A1D22, 0.15));
    lens.rotation.y = -Math.PI / 2;
    lens.position.set(X_END - 0.01, AX, 0);
    S.add(lens);
    var regLen = PITCH * NCELL + 0.9;
    var reg = new THREE.Mesh(flatSlab(regLen, 5.2, 3.15, 0.6, 0.25), K.mat.std(0x3A3F47, 0.45, 0.4));
    reg.position.set(REG_C + 0.15, 0, 0);
    reg.castShadow = true; reg.receiveShadow = true;
    S.add(reg);
    // cell top: printed grid of 8 cells
    var cellTex = canvasTex(1024, 128);
    (function () {
      var g = cellTex.ctx, W = 1024, H = 128, cw = W / NCELL;
      g.fillStyle = '#2A2E35'; g.fillRect(0, 0, W, H);
      for (var i = 0; i < NCELL; i++) {
        g.fillStyle = '#20242A';
        rrPath(g, i * cw + 7, 14, cw - 14, H - 28, 14); g.fill();
        g.strokeStyle = 'rgba(230,232,236,0.22)'; g.lineWidth = 2;
        rrPath(g, i * cw + 7, 14, cw - 14, H - 28, 14); g.stroke();
      }
    })();
    var cellTop = new THREE.Mesh(new THREE.PlaneGeometry(PITCH * NCELL, PITCH * NCELL / 8), new THREE.MeshStandardMaterial({ map: cellTex.tex, roughness: 0.5 }));
    cellTop.rotation.x = -Math.PI / 2;
    cellTop.position.set(REG_C, 3.16, 0);
    S.add(cellTop);

    /* ---------- laptop ---------- */
    var lap = new THREE.Group();
    S.add(lap);
    var alu = K.mat.std(0xA3A7AE, 0.36, 1, { envMapIntensity: 1.05 });
    var LW = 31, LD = 21.5, LT = 1.45;
    var base = new THREE.Mesh(flatSlab(LW, LD, LT, 1.1, 0.32, 12), alu);
    base.castShadow = true; base.receiveShadow = true;
    lap.add(base);
    // keyboard: instanced keycaps
    var keyMat = K.mat.std(0x23262C, 0.55, 0);
    var keyGeo = rbox(1, 0.2, 1, 0.09, 1);
    var keys = [];
    (function () {
      var pitch = 1.93, kw = 1.68, z0 = -8.5;
      var x0 = -pitch * 13 / 2;
      for (var c = 0; c < 14; c++) keys.push([x0 + c * pitch, z0, kw, 0.85]);
      for (var r = 0; r < 4; r++) for (c = 0; c < 14; c++) keys.push([x0 + c * pitch, z0 + 1.45 + r * pitch, kw, kw - 0.08]);
      var zb = z0 + 1.45 + 4 * pitch;
      var row = [[1, kw], [1, kw], [1, kw], [1, 2.2], [5, 9.6], [1, 2.2], [1, kw], [1, kw], [1, kw]];
      var xs = -27.6 / 2;
      row.forEach(function (k) { keys.push([xs + k[1] / 2, zb, k[1], kw - 0.08]); xs += k[1] + (pitch - kw); });
    })();
    var keyIM = instMesh(keyGeo, keyMat, keys.length);
    keyIM.begin();
    keys.forEach(function (k) { keyIM.put(k[0], LT + 0.08, k[1], k[2], 1, k[3]); });
    keyIM.end();
    keyIM.receiveShadow = true;
    lap.add(keyIM);
    var pad = new THREE.Mesh(rrPlane(12.4, 7.6, 0.7), K.mat.std(0x9599A0, 0.22, 1, { envMapIntensity: 0.9 }));
    pad.rotation.x = -Math.PI / 2;
    pad.position.set(0, LT + 0.004, 6.3);
    lap.add(pad);
    var hinge = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, LW - 6, 24), K.mat.std(0x5D6168, 0.4, 0.8));
    hinge.rotation.z = Math.PI / 2;
    hinge.position.set(0, LT - 0.15, -LD / 2 + 0.4);
    lap.add(hinge);
    var lid = new THREE.Group();
    lid.position.set(0, LT - 0.1, -LD / 2 + 0.35);
    lid.rotation.x = -0.3;
    lap.add(lid);
    var LH = 20.6, LTk = 0.55;
    var lidBody = new THREE.Mesh(slab(LW, LH, LTk, 1.0, 0.2, 12), alu);
    lidBody.position.set(0, LH / 2, -LTk / 2);
    lidBody.castShadow = true;
    lid.add(lidBody);
    var bezel = new THREE.Mesh(rrPlane(LW - 0.5, LH - 0.5, 0.8), K.mat.std(0x0A0B0E, 0.12, 0, { envMapIntensity: 1.2 }));
    bezel.position.set(0, LH / 2, 0.02);
    lid.add(bezel);
    var scr = canvasTex(1024, 640);
    var SW = 28.2, SH = 17.6;
    var screen = new THREE.Mesh(new THREE.PlaneGeometry(SW, SH), new THREE.MeshBasicMaterial({ map: scr.tex, toneMapped: false }));
    screen.position.set(0, LH / 2 + 0.25, 0.06);
    lid.add(screen);
    var camDot = new THREE.Mesh(new THREE.CircleGeometry(0.16, 16), K.mat.std(0x1D2026, 0.3));
    camDot.position.set(0, LH - 0.55, 0.06);
    lid.add(camDot);
    // download bar fill: two caps + body, so the texture need not be redrawn every frame
    var BAR_X0 = (120 / 1024 - 0.5) * SW, BAR_W = 784 / 1024 * SW, BAR_Y = (0.5 - 271 / 640) * SH, BAR_R = 23 / 640 * SH;
    var fillMat = new THREE.MeshBasicMaterial({ color: 0x2343B0, toneMapped: false });
    var capL = new THREE.Mesh(new THREE.CircleGeometry(BAR_R, 24), fillMat);
    var capR = new THREE.Mesh(new THREE.CircleGeometry(BAR_R, 24), fillMat);
    var body = new THREE.Mesh(new THREE.PlaneGeometry(1, BAR_R * 2), fillMat);
    body.geometry.translate(0.5, 0, 0);
    [capL, capR, body].forEach(function (m) { m.position.set(0, 0, 0.012); screen.add(m); });
    capL.position.x = BAR_X0 + BAR_R; capL.position.y = capR.position.y = body.position.y = BAR_Y;
    function setBar(p) {
      var vis = p > 0.002;
      capL.visible = capR.visible = body.visible = vis;
      if (!vis) return;
      var xr = BAR_X0 + BAR_R + Math.max(0, (BAR_W - 2 * BAR_R) * p);
      capR.position.x = xr;
      body.position.x = BAR_X0 + BAR_R;
      body.scale.x = Math.max(1e-4, xr - (BAR_X0 + BAR_R));
    }
    lap.position.set(28.5, 0, -6);
    lap.rotation.y = -0.3;
    lap.updateMatrixWorld(true);
    // screen point where the download bar sits (texture x 0.5, y 0.47)
    var barPt = screen.localToWorld(new THREE.Vector3(0, SH * (0.5 - 0.47), 0.2));

    /* ---------- moving parts ---------- */
    var onesMat = new THREE.MeshBasicMaterial({ color: 0xFFF1D2, toneMapped: false });
    var zeroMat = K.mat.std(0xAEB8BE, 0.5, 0, { transparent: true, opacity: 0.9 });
    var capGeo = new THREE.CapsuleGeometry(0.4, 1.5, 4, 12); capGeo.rotateZ(Math.PI / 2);
    var pulses1 = instMesh(capGeo, onesMat, 90), pulses0 = instMesh(capGeo, zeroMat, 90);
    S.add(pulses1); S.add(pulses0);
    var beadGeo = new THREE.SphereGeometry(0.66, 22, 16);
    var beads1 = instMesh(beadGeo, onesMat, 64), beads0 = instMesh(beadGeo, K.mat.std(0x7F878F, 0.45), 64);
    beads1.castShadow = false;
    S.add(beads1); S.add(beads0);
    var glow = glowPoints(160, 4.6, {});
    S.add(glow);
    var halo = glowPoints(160, 9.5, {});
    S.add(halo);
    // byte boxes (pool)
    var boxGeo = rbox(PITCH * NCELL + 0.8, 2.1, 2.1, 0.4, 2);
    var boxEdges = new THREE.EdgesGeometry(new THREE.BoxGeometry(PITCH * NCELL + 0.8, 2.1, 2.1));
    var boxes = [];
    for (var bi = 0; bi < 6; bi++) {
      var bm = new THREE.Mesh(boxGeo, new THREE.MeshStandardMaterial({ color: 0xFFF6E6, roughness: 0.15, metalness: 0, transparent: true, opacity: 0.22, depthWrite: false }));
      var be = new THREE.LineSegments(boxEdges, new THREE.LineBasicMaterial({ color: dark ? 0xEEF0F3 : 0x3E434D, transparent: true, opacity: 0.6 }));
      bm.add(be);
      bm.visible = false;
      bm.renderOrder = 3;
      S.add(bm);
      boxes.push({ mesh: bm, edge: be });
    }

    /* ---------- bits ---------- */
    var NB = 4096, bitsArr = new Uint8Array(NB);
    (function () { var r = K.rng(4242); for (var i = 0; i < NB; i++) bitsArr[i] = r() < 0.5 ? 1 : 0; })();
    function bitAt(k) { return bitsArr[((k % NB) + NB) % NB]; }

    /* ---------- labels ---------- */
    var aCable = [-34, 8.2, 0], aReg = [REG_C, 4.6, 0], aLap = [26.5, 23.6, -13], aUnder = [28.5, 0, 6.5];
    var labSpeed = setLabelSize(v.label('100 Mbps', { at: aCable, cls: 'value', valign: 'bottom', dy: -24 }), 19);
    var labMbps = v.label('Mbps: saniyede milyon bit', { at: aCable, cls: 'tag', valign: 'bottom', dy: -5 });
    var labDiv = setLabelSize(v.label('÷ 8', { at: aReg, cls: 'value', valign: 'bottom', dy: -50 }), 19);
    labDiv.el.style.color = dark ? P.copperLight : P.copper;
    var labByte = v.label('8 bit = 1 bayt', { at: aReg, cls: 'tag', valign: 'bottom', dy: -31 });
    var labRate = setLabelSize(v.label('12,5 MB/s', { at: aLap, cls: 'value', valign: 'bottom', dy: -24 }), 19);
    var labMBs = v.label('MB/s: saniyede milyon bayt', { at: aLap, cls: 'tag', valign: 'bottom', dy: -5 });
    var labFilm = v.label('geçen süre: 0 saniye', { at: aUnder, cls: 'value', valign: 'top', dy: 10 });
    var labFast = v.label('indirme hızlandırıldı: 1 saniye = 1 dakika', { at: aUnder, cls: 'tag', valign: 'top', dy: 30 });
    var labSlow = v.label('ışık atımları yavaşlatıldı: gerçekte saniyede 100 milyon bit', { at: [-34, 0, 3.8], cls: 'tag', valign: 'top', dy: 10 });

    /* ---------- state ---------- */
    var speed, rateVis, bps, prog, simSec, phase, holdT, drainT, auto, screenKey = '', fontsOk = false;
    onFonts(function () { fontsOk = true; screenKey = ''; });

    function phiAt(t) {
      for (var i = bps.length - 1; i > 0; i--) if (t >= bps[i].t) break;
      return bps[i].phi + (t - bps[i].t) * bps[i].r;
    }
    function tOfPhi(p) {
      for (var i = bps.length - 1; i > 0; i--) if (p >= bps[i].phi) break;
      return bps[i].t + (p - bps[i].phi) / bps[i].r;
    }
    function mbs() { return speed / 8; }
    function totalSec() { return FILM_MB / mbs(); }
    function fmtDur(sec) {
      sec = Math.round(sec);
      var m = Math.floor(sec / 60), r = sec % 60;
      return m ? nf(m) + ' dakika' + (r ? ' ' + nf(r) + ' saniye' : '') : nf(r) + ' saniye';
    }
    function locDur(t) { return t + (/saniye$/.test(t) ? 'de' : 'da'); }
    function speedTxt() { return nf(speed) + ' Mbps'; }
    function updateTexts() {
      labSpeed.set(speedTxt());
      labRate.set(nf(mbs(), 2) + ' MB/s');
      labSlow.set('ışık atımları yavaşlatıldı: gerçekte saniyede ' + (speed >= 1000 ? '1 milyar' : nf(speed) + ' milyon') + ' bit');
    }

    var lastDraw = -1;
    function drawScreen(p, done, now) {
      setBar(p);
      var key = Math.floor(p * 100) + '|' + speed + '|' + (done ? 1 : 0) + '|' + fontsOk;
      if (key === screenKey) return;
      if (now !== undefined && lastDraw >= 0 && now - lastDraw < 0.12 && !done && p > 0.005) return;
      lastDraw = now === undefined ? -1 : now;
      screenKey = key;
      var g = scr.ctx, W = 1024, H = 640;
      var bg = g.createLinearGradient(0, 0, 0, H);
      bg.addColorStop(0, '#E4E8EE'); bg.addColorStop(1, '#D3D9E1');
      g.fillStyle = bg; g.fillRect(0, 0, W, H);
      // window card
      g.save();
      g.shadowColor = 'rgba(20,24,32,0.18)'; g.shadowBlur = 30; g.shadowOffsetY = 8;
      g.fillStyle = '#FFFFFF'; rrPath(g, 70, 90, W - 140, H - 180, 26); g.fill();
      g.restore();
      g.fillStyle = '#15171C'; g.font = '600 62px ' + K.fonts.sans; g.textBaseline = 'alphabetic';
      g.fillText('film.mp4', 120, 196);
      g.fillStyle = '#595E69'; g.font = '500 54px ' + K.fonts.mono; g.textAlign = 'right';
      g.fillText('4 GB', W - 120, 196);
      g.textAlign = 'left';
      // bar
      var bx = 120, by = 248, bw = W - 240, bh = 46;
      g.fillStyle = '#E3E5EA'; rrPath(g, bx, by, bw, bh, bh / 2); g.fill();
      g.fillStyle = '#15171C'; g.font = '500 112px ' + K.fonts.mono;
      g.fillText(done ? 'Bitti' : '%' + Math.floor(p * 100), 116, 440);
      g.fillStyle = '#3E434D'; g.font = '500 58px ' + K.fonts.mono; g.textAlign = 'right';
      g.fillText(nf(mbs(), 2) + ' MB/s', W - 120, 432);
      g.textAlign = 'left';
      scr.tex.needsUpdate = true;
    }

    function reset() {
      speed = 100; rateVis = VIS[speed];
      bps = [{ t: -TRANSIT, phi: 0, r: rateVis }];
      prog = 0; simSec = 0; phase = 'run'; holdT = 0; drainT = 0; auto = true;
      updateTexts();
      screenKey = ''; lastDraw = -1;
      drawScreen(0, false);
    }

    function setSpeed(val, now) {
      var x = parseFloat(val);
      if (!isFinite(x)) return;
      var best = SPEEDS[0];
      SPEEDS.forEach(function (s) { if (Math.abs(s - x) < Math.abs(best - x)) best = s; });
      if (best === speed) return;
      speed = best;
      if (now < 0.05) { bps = [{ t: -TRANSIT, phi: 0, r: VIS[speed] }]; prog = 0; simSec = 0; phase = 'run'; updateTexts(); return; }
      var ph = phiAt(now);
      bps.push({ t: now, phi: ph, r: VIS[speed] });
      while (bps.length > 1 && bps[1].t < now - TRANSIT - 4) bps.shift();
      // restart the download smoothly
      phase = 'drain'; drainT = 0;
      updateTexts();
    }

    var lastT = 0;
    var vtmp = new THREE.Vector3(), vA = new THREE.Vector3(), vB = new THREE.Vector3(), vC = new THREE.Vector3();
    var regDigits = [];

    function frame(t, dt) {
      lastT = t;
      var tm = K.reducedMotion ? 2.2 : t;
      /* download progress (compressed time) */
      if (!K.reducedMotion) {
        if (phase === 'run') {
          simSec += dt * COMPRESS;
          prog = Math.min(1, simSec / totalSec());
          if (prog >= 1) { phase = 'hold'; holdT = 0; }
        } else if (phase === 'hold') {
          holdT += dt;
          if (holdT > 2.6) { phase = 'drain'; drainT = 0; }
        } else if (phase === 'drain') {
          drainT += dt;
          prog = prog * Math.max(0, 1 - drainT / 0.5);
          if (drainT >= 0.5) { prog = 0; simSec = 0; phase = 'run'; }
        }
      } else { prog = 0.42; simSec = prog * totalSec(); }
      drawScreen(prog, phase === 'hold', t);
      var shownSec = phase === 'hold' ? totalSec() : (phase === 'drain' ? 0 : simSec);
      setIf(labFilm, (phase === 'hold' ? '4 GB film ' + locDur(fmtDur(totalSec())) + ' indi' : 'geçen süre: ' + fmtDur(shownSec)));

      /* pulses in the fibre */
      pulses1.begin(); pulses0.begin(); glow.begin(); halo.begin(); beads1.begin(); beads0.begin();
      var kHi = Math.floor(phiAt(tm)), kLo = Math.ceil(phiAt(tm - TRANSIT));
      for (var k = kHi; k >= kLo; k--) {
        var x = X_IN + VB * (tm - tOfPhi(k));
        if (x < X_CUT - 1 || x > X_END + 0.3) continue;
        var b = bitAt(k);
        var fadeIn = sstep(X_CUT - 1, X_CUT + 2, x);
        if (b) {
          pulses1.put(x, AX, 0.12, 1, 1, 1);
          glow.add1(x, AX, 0.5, 1.0, 0.86, 0.55, 0.9 * fadeIn);
          halo.add1(x, AX, 0.4, 0.98, 0.78, 0.42, 0.32 * fadeIn);
        } else {
          pulses0.put(x, AX, 0.12, 0.55, 0.6, 0.6);
        }
      }

      /* byte register: beads glide one cell per bit */
      var psi = phiAt(tm - TRANSIT);
      var gDone = Math.floor((psi - (NCELL - 0.5)) / NCELL) + 1; // groups latched so far
      if (gDone < 0) gDone = 0;
      regDigits.length = 0;
      for (k = NCELL * gDone; k <= Math.floor(psi); k++) {
        var u = psi - k;                 // cells travelled
        if (u < 0) continue;
        var bx = REG0 + u * PITCH;
        var enterA = sstep(0, 0.35, u);
        b = bitAt(k);
        var y = 3.82;
        if (b) {
          beads1.put(bx, y, 0, 0.6 + 0.4 * enterA);
          glow.add1(bx, y, 0.6, 1.0, 0.86, 0.55, 0.85 * enterA);
          halo.add1(bx, y + 0.2, 0.3, 0.98, 0.78, 0.42, 0.28 * enterA);
        } else beads0.put(bx, y, 0, 0.6 + 0.4 * enterA);
        regDigits.push(bx, 1.62, 2.62, b, enterA);
      }

      /* latched bytes: lift, enclose, fly into the screen */
      var FL = 1.55;
      var digFade = clamp(2.4 / VIS[speed], 0.1, 0.45);
      for (var bi = 0; bi < boxes.length; bi++) boxes[bi].mesh.visible = false;
      var used = 0;
      for (var gI = gDone - 1; gI >= 0 && used < boxes.length; gI--) {
        var tl = tOfPhi(NCELL * gI + NCELL - 0.5) + TRANSIT;
        var a = tm - tl;
        if (a < 0) continue;
        if (a > FL) break;
        var B = boxes[used++];
        var lift = E.out(span(a, 0, 0.32));
        var fly = E.inOut(span(a, 0.32, 1.35));
        var fade = 1 - span(a, 1.3, FL);
        vA.set(REG_C + 1.2 * lift, 3.82 + 3.2 * lift, 0.6 * lift);
        vC.copy(barPt);
        vB.set(vA.x + 0.62 * (vC.x - vA.x), vA.y + 0.15 * (vC.y - vA.y), 3.5);
        var q = fly, iq = 1 - q;
        var cx = iq * iq * vA.x + 2 * iq * q * vB.x + q * q * vC.x;
        var cy = iq * iq * vA.y + 2 * iq * q * vB.y + q * q * vC.y;
        var cz = iq * iq * vA.z + 2 * iq * q * vB.z + q * q * vC.z;
        var sc = lerp(1, 0.32, fly);
        B.mesh.visible = true;
        B.mesh.position.set(cx, cy, cz);
        B.mesh.scale.setScalar(sc);
        B.mesh.material.opacity = 0.24 * sstep(0.05, 0.3, a) * fade;
        B.edge.material.opacity = 0.6 * sstep(0.05, 0.3, a) * fade;
        for (var j = 0; j < NCELL; j++) {
          var kk = NCELL * gI + j;
          var px = cx + ((NCELL - 1 - j) - (NCELL - 1) / 2) * PITCH * sc;
          var bb = bitAt(kk);
          if (bb) {
            beads1.put(px, cy, cz, sc * fade + 0.001);
            glow.add1(px, cy, cz + 0.5, 1.0, 0.86, 0.55, 0.85 * fade);
          } else beads0.put(px, cy, cz, sc * fade + 0.001);
          if (a < digFade) regDigits.push(px, cy - 1.45 * sc, cz + 0.4, bb, 1 - span(a, digFade * 0.3, digFade));
        }
      }
      pulses1.end(); pulses0.end(); beads1.end(); beads0.end(); glow.end(); halo.end();
      fixPoints(v, glow); fixPoints(v, halo);

      v.render(dt);

      /* 2D overlay: bit digits under the register */
      var c = v.ctx;
      c.save();
      c.font = K.font(12, 500, true);
      c.textAlign = 'center'; c.textBaseline = 'top';
      for (var di = 0; di < regDigits.length; di += 5) {
        vtmp.set(regDigits[di], regDigits[di + 1], regDigits[di + 2]);
        var pp = v.project(vtmp);
        var onFace = regDigits[di + 1] < 1.7;
        c.globalAlpha = regDigits[di + 4];
        c.fillStyle = regDigits[di + 3] ? (onFace ? '#F5F5F1' : (dark ? P.onNight : P.ink)) : (onFace ? '#9AA3B2' : (dark ? P.onNightMuted : P.muted));
        c.fillText(regDigits[di + 3] ? '1' : '0', pp.x, pp.y - 7);
      }
      c.restore();
    }

    reset();
    return {
      reset: reset,
      frame: frame,
      set: function (key, val) {
        if (key === 'speed') { auto = false; setSpeed(val, lastT); }
      },
      read: function (key) {
        var MB = mbs();
        if (key === 'formula') return nf(speed) + ' Mbps ÷ 8 = ' + nf(MB, 2) + ' MB/s';
        if (key === 'time') {
          var s = totalSec();
          return nf(FILM_MB) + ' MB ÷ ' + nf(MB, 2) + ' MB/s = ' + nf(s) + ' s' + (s >= 60 ? ' = ' + fmtDur(s) : '') + ' (ideal)';
        }
        if (key === 'speed') return speedTxt();
        return '';
      },
      dispose: function () { v.dispose(); }
    };
  });

  /* ==================================================================
   * 2) phone-battery · S 680×520 · light
   * Li-ion pouch cell inside a phone, magnified section: Li⁺ ions shuttle between metal oxide and
   * graphite while electrons go round the outer circuit. Charge and use alternate.
   * ================================================================== */
  K.register('phone-battery', function (el, opts) {
    var THREE = TH();
    var theme = opts.theme || 'light';
    var dark = theme === 'dark';
    var v = K.stage3d(el, {
      theme: theme, fov: 27, distance: 58, yaw: 0, pitch: 0.46, target: [0.8, 6.3, 0.2], near: 4, far: 500,
      size: 20, ground: 0, minYaw: -0.7, maxYaw: 0.7, minPitch: 0.12, maxPitch: 1.0
    });
    var S = v.scene;
    if (v.lights) { v.lights.key.position.set(-10, 34, 26); v.lights.key.intensity = 1.25; v.lights.hemi.intensity = 0.55; }

    var WH = 19.25;                         // 5.000 mAh × 3,85 V
    var CHG = [5, 18, 65];
    var VOLT = { 5: '5 V ⎓ 1 A', 18: '9 V ⎓ 2 A', 65: '20 V ⎓ 3,25 A' };
    var HOURS_PER_S = 1 / 6;                // hızlandırılmış: 1 s = 10 dakika
    var NION = 20;

    /* ---------- magnified section (hero) ---------- */
    var W = 18, H = 8.0, D = 2.8;
    var sec = new THREE.Group();
    sec.position.set(0.8, 8.4, -7.2);
    sec.rotation.x = -0.2;
    S.add(sec);
    var X = { cu0: -W / 2, cu1: -W / 2 + 0.45, an1: -2.35, sep0: -0.32, sep1: 0.32, ca0: 2.35, al0: W / 2 - 0.45, al1: W / 2 };
    var matCu = K.mat.copper({ roughness: 0.32 });
    var matAl = K.mat.aluminium({ roughness: 0.3 });
    var matGr = K.mat.std(0x2F3236, 0.42, 0.15);
    var matOx = K.mat.std(0x5B5368, 0.5, 0.1);
    var matBackDark = K.mat.std(0x1E2126, 0.8);
    var matLiquid = K.mat.std(0xB4CAD5, 0.55);
    var matSep = K.mat.std(0xE9E7E1, 0.75);
    function boxAt(x0, x1, y0, y1, z0, z1, m, r) {
      var b = new THREE.Mesh(r ? rbox(x1 - x0, y1 - y0, z1 - z0, r, 2) : new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0), m);
      b.position.set((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
      sec.add(b);
      return b;
    }
    // foils with tabs
    boxAt(X.cu0, X.cu1, -H / 2, H / 2, -D / 2, D / 2, matCu, 0.06);
    boxAt(X.al0, X.al1, -H / 2, H / 2, -D / 2, D / 2, matAl, 0.06);
    boxAt(X.cu0 + 0.02, X.cu1 - 0.02, H / 2 - 0.1, H / 2 + 2.0, -0.7, 0.7, matCu, 0.05);
    boxAt(X.al0 + 0.02, X.al1 - 0.02, H / 2 - 0.1, H / 2 + 2.0, -0.7, 0.7, matAl, 0.05);
    // back walls: dark inside the electrodes, pale liquid between them
    boxAt(X.cu1, X.an1, -H / 2, H / 2, -D / 2, -D / 2 + 0.2, matBackDark);
    boxAt(X.ca0, X.al0, -H / 2, H / 2, -D / 2, -D / 2 + 0.2, matBackDark);
    boxAt(X.an1, X.ca0, -H / 2, H / 2, -D / 2, -D / 2 + 0.2, matLiquid);
    var liq = boxAt(X.an1, X.ca0, -H / 2, H / 2, -D / 2 + 0.2, D / 2 - 0.02, new THREE.MeshStandardMaterial({ color: 0x9FC0D0, roughness: 0.2, transparent: true, opacity: 0.32, depthWrite: false }));
    liq.renderOrder = 2;
    // floor and ceiling of the section (thin pouch film)
    var matFilm = K.mat.std(0xB9BDC4, 0.45, 0.6);
    boxAt(X.cu0, X.al1, -H / 2 - 0.16, -H / 2, -D / 2, D / 2, matFilm);
    boxAt(X.cu1, X.al0, H / 2, H / 2 + 0.16, -D / 2, D / 2, matFilm);
    // electrode sheets
    var NPL = 6, plTh = 0.34, y0p = -H / 2 + 0.5, dyp = (H - 1.0) / (NPL - 1);
    var rowsY = [];
    for (var k = 0; k < NPL; k++) {
      var yy = y0p + k * dyp;
      boxAt(X.cu1, X.an1, yy - plTh / 2, yy + plTh / 2, -D / 2 + 0.2, D / 2, matGr, 0.08);
      boxAt(X.ca0, X.al0, yy - plTh / 2, yy + plTh / 2, -D / 2 + 0.2, D / 2, matOx, 0.08);
      if (k < NPL - 1) rowsY.push(yy + dyp / 2);
    }
    // separator: a porous membrane, pores at the row heights
    var poreH = 0.46, cuts = [-H / 2];
    rowsY.forEach(function (y) { cuts.push(y - poreH / 2, y + poreH / 2); });
    cuts.push(H / 2);
    for (k = 0; k < cuts.length; k += 2) boxAt(X.sep0, X.sep1, cuts[k], cuts[k + 1], -D / 2 + 0.2, D / 2 - 0.05, matSep, 0.06);
    shadowAll(sec, false, false);
    mergeStatic(sec);

    /* ion sites and paths (section-local) */
    var zf = D / 2 + 0.16;
    var COLS = 4;
    function siteX(side, col) {
      // col 0 = deepest (far from separator)
      if (side < 0) return lerp(X.cu1 + 0.75, X.an1 - 0.55, col / (COLS - 1));
      return lerp(X.al0 - 0.75, X.ca0 + 0.55, col / (COLS - 1));
    }
    var ions = [];
    for (var i = 0; i < NION; i++) {
      var row = i % rowsY.length, lvl = Math.floor(i / rowsY.length);   // fill rows deep-first
      var ra = row, ca = lvl;                       // anode: deepest first
      var rc = (row + 2) % rowsY.length, cc = COLS - 1 - lvl;          // cathode: shallowest leaves first
      var pa = new THREE.Vector3(siteX(-1, ca), rowsY[ra], zf);
      var pc = new THREE.Vector3(siteX(1, cc), rowsY[rc], zf);
      var pore = rowsY[Math.round((ra + rc) / 2)];
      var pts = [
        pc,
        new THREE.Vector3(X.ca0 + 0.15, rowsY[rc], zf),
        new THREE.Vector3(1.0, lerp(rowsY[rc], pore, 0.7), zf),
        new THREE.Vector3(0, pore, zf),
        new THREE.Vector3(-1.0, lerp(rowsY[ra], pore, 0.7), zf),
        new THREE.Vector3(X.an1 - 0.15, rowsY[ra], zf),
        pa
      ];
      ions.push({ curve: new THREE.CatmullRomCurve3(pts, false, 'centripetal'), ph: i * 1.7 });
    }
    var ionIM = instMesh(new THREE.SphereGeometry(0.3, 18, 12), K.mat.std(0xC8693A, 0.38, 0.15, { emissive: 0x6A2A0C, emissiveIntensity: 0.25 }), NION);
    sec.add(ionIM);

    /* outer circuit: wire arc over the section from tab to tab */
    var yTab = H / 2 + 1.9;
    var wirePts = [
      new THREE.Vector3(X.cu0 + 0.22, yTab, 0), new THREE.Vector3(X.cu0 + 0.22, yTab + 0.9, 0),
      new THREE.Vector3(X.cu0 + 1.3, yTab + 1.8, 0), new THREE.Vector3(0, yTab + 1.95, 0),
      new THREE.Vector3(X.al1 - 1.3, yTab + 1.8, 0), new THREE.Vector3(X.al1 - 0.22, yTab + 0.9, 0),
      new THREE.Vector3(X.al1 - 0.22, yTab, 0)
    ];
    var wireCurve = new THREE.CatmullRomCurve3(wirePts, false, 'centripetal');
    var wireMat = K.mat.std(0x3E434D, 0.5);
    function wirePart(a, b) {
      var pp = [];
      for (var wi = 0; wi <= 40; wi++) pp.push(wireCurve.getPointAt(a + (b - a) * wi / 40));
      var m = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pp), 80, 0.13, 10, false), wireMat);
      sec.add(m);
    }
    wirePart(0, 0.41); wirePart(0.59, 1);
    var devBox = new THREE.Mesh(rbox(3.0, 1.1, 0.8, 0.3, 3), K.mat.std(0x2A2E36, 0.42, 0.2));
    devBox.position.copy(wireCurve.getPointAt(0.5));
    sec.add(devBox);
    var NE = 18;
    var eIM = instMesh(new THREE.SphereGeometry(0.27, 16, 10), K.mat.electron(dark), NE);
    sec.add(eIM);

    /* ---------- phone (back removed) ---------- */
    var ph = new THREE.Group();
    ph.position.set(-3.6, 0, 5.6);
    ph.rotation.y = 0.16 + Math.PI;
    S.add(ph);
    var PL = 15.4, PW = 7.3, PT = 0.82;
    var frameShape = rrShape(PL, PW, 1.05);
    frameShape.holes.push(rrShape(PL - 0.6, PW - 0.6, 0.8));
    var frameGeo = new THREE.ExtrudeGeometry(frameShape, { depth: PT, bevelEnabled: true, bevelThickness: 0.08, bevelSize: 0.08, bevelSegments: 2, curveSegments: 12 });
    frameGeo.rotateX(-Math.PI / 2);
    frameGeo.translate(0, 0.08, 0);
    var frameMesh = new THREE.Mesh(frameGeo, K.mat.std(0xA9AEB6, 0.3, 1));
    ph.add(frameMesh);
    var floor = new THREE.Mesh(flatSlab(PL - 0.5, PW - 0.5, 0.16, 0.8, 0.03), K.mat.std(0x3A3E45, 0.6, 0.3));
    floor.position.y = 0.04;
    ph.add(floor);
    var pouch = new THREE.Mesh(rbox(9.4, 0.42, 6.1, 0.18, 3), K.mat.std(0x1E2024, 0.38, 0.2));
    pouch.position.set(-0.5, 0.2 + 0.21, 0);
    ph.add(pouch);
    var pouchLab = canvasTex(1024, 640);
    (function () {
      var g = pouchLab.ctx;
      g.fillStyle = '#1E2024'; g.fillRect(0, 0, 1024, 640);
      g.fillStyle = '#E9EAEC';
      g.font = '600 64px ' + K.fonts.sans; g.fillText('Li-ion polimer pil', 70, 150);
      g.fillStyle = '#AEB4BE'; g.font = '500 56px ' + K.fonts.mono;
      g.fillText('Nominal 3,85 V', 70, 270);
      g.fillText('5.000 mAh', 70, 360);
      g.fillText('19,25 Wh', 70, 450);
      g.strokeStyle = 'rgba(233,234,236,0.35)'; g.lineWidth = 3;
      g.beginPath(); g.moveTo(70, 190); g.lineTo(954, 190); g.stroke();
      g.font = '400 34px ' + K.fonts.sans; g.fillStyle = '#7E8591';
      g.fillText('Delmeyin, ezmeyin, ısıtmayın.', 70, 560);
    })();
    var pouchLabMesh = new THREE.Mesh(rrPlane(8.4, 5.25, 0.3), new THREE.MeshStandardMaterial({ map: pouchLab.tex, roughness: 0.55 }));
    (function () {
      var uv = pouchLabMesh.geometry.attributes.uv, pa = pouchLabMesh.geometry.attributes.position;
      for (var i = 0; i < uv.count; i++) uv.setXY(i, pa.getX(i) / 8.4 + 0.5, pa.getY(i) / 5.25 + 0.5);
    })();
    pouchLabMesh.rotation.set(-Math.PI / 2, 0, Math.PI);
    pouchLabMesh.position.set(-0.5, 0.632, 0);
    ph.add(pouchLabMesh);
    // logic board, shield, camera
    var pcbMat = K.mat.std(0x1F3A2D, 0.45, 0.1);
    var board = new THREE.Mesh(flatSlab(2.5, PW - 0.75, 0.12, 0.3, 0.03), pcbMat);
    board.position.set(PL / 2 - 1.75, 0.2, 0);
    ph.add(board);
    var shield = new THREE.Mesh(flatSlab(1.7, 2.6, 0.26, 0.15, 0.04), K.mat.std(0x9EA3AA, 0.48, 1));
    shield.position.set(PL / 2 - 1.8, 0.32, 1.45);
    ph.add(shield);
    var camMod = new THREE.Mesh(flatSlab(1.8, 2.9, 0.5, 0.35, 0.08), K.mat.std(0x2A2D33, 0.4, 0.4));
    camMod.position.set(PL / 2 - 1.75, 0.32, -1.75);
    ph.add(camMod);
    [-2.45, -1.05].forEach(function (zz) {
      var lensR = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.12, 28), K.mat.std(0xB4B9C0, 0.25, 1));
      lensR.position.set(PL / 2 - 1.75, 0.88, zz); ph.add(lensR);
      var lensG = new THREE.Mesh(new THREE.CircleGeometry(0.36, 28), K.mat.std(0x0D1016, 0.08, 0, { envMapIntensity: 1.6 }));
      lensG.rotation.x = -Math.PI / 2; lensG.position.set(PL / 2 - 1.75, 0.945, zz); ph.add(lensG);
    });
    var flex = new THREE.Mesh(flatSlab(1.4, 1.3, 0.05, 0.15, 0.01), K.mat.std(0xC88738, 0.45, 0.1));
    flex.position.set(4.4, 0.6, 1.55);
    ph.add(flex);
    var sub = new THREE.Mesh(flatSlab(1.6, PW - 0.9, 0.12, 0.3, 0.03), pcbMat);
    sub.position.set(-PL / 2 + 1.25, 0.2, 0);
    ph.add(sub);
    var port = new THREE.Mesh(rbox(0.75, 0.34, 0.95, 0.15, 2), K.mat.std(0xC3C7CD, 0.28, 1));
    port.position.set(-PL / 2 + 0.55, 0.45, 0);
    ph.add(port);
    shadowAll(ph, true, true);
    ph.updateMatrixWorld(true);
    var portWorld = ph.localToWorld(new THREE.Vector3(-PL / 2 - 0.05, 0.45, 0));
    var portDir = ph.localToWorld(new THREE.Vector3(-PL / 2 - 1.05, 0.45, 0)).sub(portWorld).normalize();
    // zoom window on the pouch label (phone-local corners)
    var zoomWin = [[-1.0, 0.9], [-3.0, 0.9], [-3.0, -0.3], [-1.0, -0.3]].map(function (p) { return ph.localToWorld(new THREE.Vector3(p[0], 0.64, p[1])); });

    /* ---------- charger ---------- */
    var chg = new THREE.Group();
    chg.position.set(12.9, 0, 6.6);
    chg.rotation.y = -0.22;
    S.add(chg);
    var chgBody = new THREE.Mesh(rbox(4.0, 2.7, 4.0, 0.62, 4), K.mat.plasticWhite({ roughness: 0.32 }));
    chgBody.position.y = 1.35;
    chg.add(chgBody);
    var chgPortMesh = new THREE.Mesh(rbox(0.12, 0.34, 0.95, 0.06, 2), K.mat.std(0x22252B, 0.5));
    chgPortMesh.position.set(-2.0, 1.35, 0);
    chg.add(chgPortMesh);
    [-0.95, 0.95].forEach(function (zz) {
      var pin = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 1.4, 16), K.mat.steel());
      pin.rotation.z = Math.PI / 2;
      pin.position.set(2.0 + 0.7, 1.35, zz);
      var tip = new THREE.Mesh(new THREE.SphereGeometry(0.2, 16, 8), K.mat.steel());
      tip.position.set(2.0 + 1.4, 1.35, zz);
      chg.add(pin); chg.add(tip);
    });
    var chgLabs = {};
    function drawChgLab(w) {
      var ct = canvasTex(512, 384), g = ct.ctx;
      g.clearRect(0, 0, 512, 384);
      g.fillStyle = '#4A4F59'; g.textAlign = 'center';
      g.font = '600 132px ' + K.fonts.sans; g.fillText(w + ' W', 256, 190);
      g.font = '500 50px ' + K.fonts.mono; g.fillStyle = '#6A707B'; g.fillText(VOLT[w], 256, 290);
      ct.tex.needsUpdate = true;
      return ct;
    }
    CHG.forEach(function (w) { chgLabs[w] = drawChgLab(w); });
    onFonts(function () { CHG.forEach(function (w) { var n = drawChgLab(w); chgLabs[w].ctx.clearRect(0, 0, 512, 384); chgLabs[w].ctx.drawImage(n.canvas, 0, 0); chgLabs[w].tex.needsUpdate = true; n.tex.dispose(); }); });
    var chgLab = new THREE.Mesh(new THREE.PlaneGeometry(2.7, 2.025), new THREE.MeshStandardMaterial({ map: chgLabs[18].tex, transparent: true, roughness: 0.4 }));
    chgLab.position.set(0, 1.4, 2.006);
    chg.add(chgLab);
    shadowAll(chg, true, false);
    chg.updateMatrixWorld(true);
    var chgPortWorld = new THREE.Vector3(), chgDir = new THREE.Vector3();
    function chgPort() {
      chg.updateMatrixWorld(true);
      chg.localToWorld(chgPortWorld.set(-2.05, 1.35, 0));
      chg.localToWorld(chgDir.set(-3.05, 1.35, 0)).sub(chgPortWorld).normalize();
    }
    chgPort();

    /* cable (rebuilt only while the plug moves) */
    var cableMat = K.mat.plasticWhite({ roughness: 0.45 });
    var cableMesh = new THREE.Mesh(new THREE.BufferGeometry(), cableMat);
    cableMesh.castShadow = true;
    S.add(cableMesh);
    var plugMat = K.mat.plasticWhite({ roughness: 0.38 });
    var plugA = new THREE.Mesh(rbox(1.6, 0.62, 0.95, 0.24, 2), plugMat);
    var plugB = new THREE.Mesh(rbox(1.6, 0.62, 0.95, 0.24, 2), plugMat);
    plugA.castShadow = plugB.castShadow = true;
    S.add(plugA); S.add(plugB);
    var cableCurve = null, cableOff = -1, cableSc = -1;
    function buildCable(off) {
      if (Math.abs(off - cableOff) < 0.02 && Math.abs(chg.scale.x - cableSc) < 0.004) return;
      cableOff = off; cableSc = chg.scale.x;
      chgPort();
      var pEnd = portWorld.clone().addScaledVector(portDir, 0.8 + off);
      var pStart = chgPortWorld.clone().addScaledVector(chgDir, 0.8);
      var a = pStart.clone().addScaledVector(chgDir, 1.4);
      var b = pEnd.clone().addScaledVector(portDir, 1.6);
      var mid = a.clone().lerp(b, 0.5); mid.z += 1.6;
      a.y = 0.32; b.y = 0.32; mid.y = 0.22;
      var pts = [pStart, a, mid, b, pEnd];
      cableCurve = new THREE.CatmullRomCurve3(pts, false, 'centripetal');
      cableMesh.geometry.dispose();
      cableMesh.geometry = new THREE.TubeGeometry(cableCurve, 90, 0.2, 10, false);
      plugB.position.copy(portWorld).addScaledVector(portDir, 0.8 + off);
      plugB.lookAt(plugB.position.clone().add(portDir)); plugB.rotateY(Math.PI / 2);
      plugA.position.copy(chgPortWorld).addScaledVector(chgDir, 0.8);
      plugA.lookAt(plugA.position.clone().add(chgDir)); plugA.rotateY(Math.PI / 2);
    }
    var energy = glowPoints(24, 1.2, {});
    S.add(energy);
    var socGlow = glowPoints(2, 5.5, {});
    S.add(socGlow);
    var socPos = ph.localToWorld(new THREE.Vector3(PL / 2 - 1.8, 0.9, 1.45));

    /* ---------- labels ---------- */
    function secPt(x, y, z) { return sec.localToWorld(new THREE.Vector3(x, y, z)); }
    sec.updateMatrixWorld(true);
    var labMode = v.label('', { at: secPt(0, yTab + 2.0, 0), cls: 'chip', valign: 'bottom', dy: -40 });
    var labDev = v.label('', { at: secPt(0, yTab + 2.0, 0), cls: 'note', valign: 'bottom', dy: -16 });
    var labCu = v.label('bakır folyo (−)', { at: secPt(X.cu0 + 0.2, H / 2 + 1.0, 0.8), cls: 'note', align: 'right', dx: -10 });
    var labAl = v.label('alüminyum folyo (+)', { at: secPt(X.al1 - 0.2, H / 2 + 1.0, 0.8), cls: 'note', align: 'left', dx: 10 });
    var labAn = v.label('grafit (− uç)', { at: secPt((X.cu1 + X.an1) / 2, -H / 2 - 0.2, D / 2), cls: 'name', valign: 'top', dy: 6 });
    var labSep = v.label('ayırıcı ve elektrolit', { at: secPt(0, H / 2 + 0.2, 0), cls: 'note', valign: 'bottom', dy: -4 });
    var labCa = v.label('metal oksit (+ uç)', { at: secPt((X.ca0 + X.al0) / 2, -H / 2 - 0.2, D / 2), cls: 'name', valign: 'top', dy: 6 });
    var labMag = v.label('büyütülmüş kesit · ölçekli değil', { at: secPt(0, -H / 2 - 0.2, D / 2), cls: 'tag', valign: 'top', dy: 28 });
    var labChg = v.label('şarj aleti · 18 W', { at: chg.localToWorld(new THREE.Vector3(0, 2.8, 0)), cls: 'note', valign: 'bottom', dy: -14 });
    [labCu, labAl, labSep, labChg, labDev].forEach(function (l) { l.el.style.fontSize = '14px'; l.el.style.fontWeight = '500'; l.el.style.color = dark ? P.onNight : '#3E434D'; });
    labMag.el.style.fontSize = '13px';

    /* ---------- state ---------- */
    var mode, charger, q, auto, modeT, holdT, fadeA, chgScale, plugOff, eS, flow, wrapT, lastT = 0;
    function reset() {
      mode = 'sarj'; charger = 18; q = 0.14; auto = true; modeT = 0; holdT = 0; fadeA = 1; wrapT = -1;
      chgScale = 0.94; plugOff = 0; eS = 0; flow = 0;
      chgLab.material.map = chgLabs[18].tex;
      labChg.set('şarj aleti · 18 W');
      buildCable(0);
    }
    function chargeRate(qq) {
      var r = charger * HOURS_PER_S / WH;              // fraction per second
      if (qq > 0.8) r *= lerp(1, 0.32, (qq - 0.8) / 0.2);  // gerçekte son %20 yavaş
      return r;
    }
    var disRate = 0.105;

    function frame(t, dt) {
      lastT = t;
      if (K.reducedMotion) dt = 0;
      /* auto cycle: 8 s charge, 8 s use */
      if (auto && !K.reducedMotion) {
        modeT += dt;
        if (modeT >= 8) { modeT -= 8; mode = mode === 'sarj' ? 'desarj' : 'sarj'; if (mode === 'desarj') disRate = Math.max(0.06, (q - 0.14) / 7.6); }
      }
      /* integrate charge */
      var dq = 0;
      if (wrapT >= 0) {
        // manual mode: fade out, jump back, fade in (keeps showing the process)
        wrapT += dt;
        fadeA = wrapT < 0.45 ? 1 - wrapT / 0.45 : Math.min(1, (wrapT - 0.45) / 0.45);
        if (wrapT >= 0.45 && wrapT - dt < 0.45) q = mode === 'sarj' ? 0.14 : 0.97;
        if (wrapT >= 0.9) { wrapT = -1; fadeA = 1; }
      } else if (mode === 'sarj') {
        if (q < 0.999) dq = chargeRate(q) * dt;
        else if (!auto) { holdT += dt; if (holdT > 2.2) { holdT = 0; wrapT = 0; } }
      } else {
        if (q > 0.141) dq = -disRate * dt;
        else if (!auto) { holdT += dt; if (holdT > 2.2) { holdT = 0; wrapT = 0; } }
      }
      q = clamp(q + dq, 0.0, 1);
      flow = easeTo(flow, dt > 0 ? dq / dt : 0, 6, Math.max(dt, 1e-3));

      /* ions */
      ionIM.begin();
      var spanI = 4.5;
      for (var i = 0; i < NION; i++) {
        var p = clamp((q * (NION + spanI) - i) / spanI, 0, 1);
        var pe = E.sine(p);
        var P0 = ions[i].curve.getPointAt(pe);
        var rest = (p <= 0 || p >= 1) ? 1 : 0.25;
        var jx = Math.sin(t * 3.1 + ions[i].ph) * 0.05 * rest, jy = Math.cos(t * 2.7 + ions[i].ph * 1.3) * 0.05 * rest;
        ionIM.put(P0.x + jx, P0.y + jy, P0.z, fadeA);
      }
      ionIM.end();

      /* electrons on the outer wire: speed follows the ion flow */
      eS += flow * dt * -2.2;     // charging: e⁻ go from Al (+) over to Cu (−)
      eIM.begin();
      for (var e = 0; e < NE; e++) {
        var s = ((e / NE + eS) % 1 + 1) % 1;
        var pw = wireCurve.getPointAt(s);
        var edge = Math.min(sstep(0, 0.04, s), sstep(1, 0.96, s));
        eIM.put(pw.x, pw.y, pw.z + 0.05, 0.25 + 0.75 * edge);
      }
      eIM.end();

      /* charger plug and energy pulses */
      var plugged = mode === 'sarj' ? 1 : 0;
      plugOff = easeTo(plugOff, plugged ? 0 : 1.8, 5, Math.max(dt, 1e-3));
      if (K.reducedMotion) plugOff = plugged ? 0 : 1.8;
      var targetScale = charger === 5 ? 0.84 : charger === 65 ? 1.04 : 0.94;
      chgScale = easeTo(chgScale, targetScale, 6, Math.max(dt, 1e-3));
      chg.scale.setScalar(chgScale);
      buildCable(plugOff);
      energy.begin();
      if (plugged && q < 0.999 && cableCurve && wrapT < 0) {
        var ne = 6, spd = 0.18 + charger / 65 * 0.35;
        for (var j = 0; j < ne; j++) {
          var u = ((t * spd + j / ne) % 1 + 1) % 1;
          var pc = cableCurve.getPointAt(u);
          energy.add1(pc.x, pc.y + 0.25, pc.z, 1.0, 0.82, 0.45, 0.85 * Math.min(sstep(0, 0.08, u), sstep(1, 0.9, u)));
        }
      }
      energy.end();
      socGlow.begin();
      var use = mode === 'desarj' && q > 0.141 ? 1 : 0;
      socGlow.add1(socPos.x, socPos.y, socPos.z, 1.0, 0.8, 0.45, 0.4 * use);
      socGlow.end();
      fixPoints(v, energy); fixPoints(v, socGlow);

      /* texts */
      setIf(labDev, mode === 'sarj' ? 'şarj aleti' : 'telefonun devreleri');
      if (mode === 'sarj') setIf(labMode, q >= 0.999 ? 'Dolu: iyonların çoğu grafitte' : 'Şarj: Li⁺ iyonları grafite geçer, e⁻ dış devreden gelir');
      else setIf(labMode, q <= 0.141 ? 'Boş: iyonların çoğu metal oksitte' : 'Kullanım: Li⁺ metal okside döner, e⁻ telefonu çalıştırır');

      v.render(dt);

      /* 2D overlay: zoom lines, legend, charge gauge */
      var c = v.ctx;
      c.save();
      var fl = secPt(X.cu0, -H / 2 - 0.16, D / 2), fr = secPt(X.al1, -H / 2 - 0.16, D / 2);
      var A0 = v.project(fl), A1 = v.project(fr);
      var Z = zoomWin.map(function (p) { return v.project(p); });
      c.strokeStyle = dark ? 'rgba(154,163,178,.55)' : 'rgba(89,94,105,.5)';
      c.lineWidth = 1; c.setLineDash([3, 4]);
      c.beginPath(); c.moveTo(Z[3].x, Z[3].y); c.lineTo(A0.x, A0.y); c.moveTo(Z[2].x, Z[2].y); c.lineTo(A1.x, A1.y); c.stroke();
      c.setLineDash([]);
      c.strokeStyle = dark ? 'rgba(238,240,243,.8)' : 'rgba(21,23,28,.75)'; c.lineWidth = 1.3;
      c.beginPath(); c.moveTo(Z[0].x, Z[0].y);
      for (var zi = 1; zi < 4; zi++) c.lineTo(Z[zi].x, Z[zi].y);
      c.closePath(); c.stroke();
      // legend
      var lx = 16, ly = 18;
      K.drawSphere(c, P.copperFill, lx + 6, ly, 5.5);
      K.label(c, 'Li⁺ lityum iyonu', lx + 18, ly + 4.5, { size: 13, color: dark ? P.onNight : P.ink2 });
      K.drawSphere(c, dark ? P.blueLight : '#2848C8', lx + 6, ly + 22, 5.5);
      K.label(c, 'e⁻ elektron', lx + 18, ly + 26.5, { size: 13, color: dark ? P.onNight : P.ink2 });
      // gauge
      var gw = 132, gh = 14, gx = v.w - 16 - gw - 52, gy = v.h - 50;
      K.label(c, 'Pil doluluğu', gx, gy - 8, { size: 14, color: dark ? P.onNightMuted : P.muted });
      K.label(c, '%' + Math.round(q * 100), gx + gw + 10, gy + 12, { size: 15, weight: 500, mono: true, color: dark ? P.onNight : P.ink });
      c.strokeStyle = dark ? P.onNightMuted : P.ink2; c.lineWidth = 1.2;
      K.rr(c, gx, gy, gw, gh, 4); c.stroke();
      c.fillStyle = dark ? P.onNightMuted : P.ink2;
      c.fillRect(gx + gw + 1.5, gy + 4, 2.5, gh - 8);
      c.fillStyle = P.lamp;
      K.rr(c, gx + 2.5, gy + 2.5, Math.max(0, (gw - 5) * q), gh - 5, 2.5); c.fill();
      K.label(c, (mode === 'sarj' ? 'hızlandırılmış: 1 s ≈ 10 dk' : 'hızlandırılmış: 1 s ≈ 1 saat · ~2 W'), v.w - 16, gy + gh + 17, { size: 12, mono: true, spacing: 0.3, align: 'right', color: dark ? P.onNight : P.ink2 });
      c.restore();
    }

    reset();
    return {
      reset: reset,
      frame: frame,
      set: function (key, val) {
        if (key === 'mode') {
          auto = false;
          var m = String(val) === 'desarj' ? 'desarj' : 'sarj';
          if (m !== mode) { mode = m; holdT = 0; if (mode === 'desarj') disRate = 0.105; }
          // start the chosen process right away instead of idling at an end state
          if (wrapT < 0 && ((mode === 'desarj' && q < 0.35) || (mode === 'sarj' && q > 0.9))) wrapT = 0;
        } else if (key === 'charger') {
          auto = false;
          var x = parseFloat(val), best = 18;
          CHG.forEach(function (w) { if (Math.abs(w - x) < Math.abs(best - x)) best = w; });
          charger = best;
          chgLab.material.map = chgLabs[best].tex;
          chgLab.material.needsUpdate = true;
          labChg.set('şarj aleti · ' + best + ' W');
          if (mode !== 'sarj') { mode = 'sarj'; holdT = 0; }
        }
      },
      read: function (key) {
        if (key === 'energy') return '5.000 mAh × 3,85 V = 19.250 mWh = 19,25 Wh ≈ 19,3 Wh';
        if (key === 'time') return '19,3 Wh ÷ ' + charger + ' W' + (charger === 65 ? ' ≈ ' + Math.round(19.3 / charger * 60) + ' dk' : ' ≈ ' + nf(19.3 / charger, 1) + ' saat') + ' (ideal)';
        if (key === 'note') return 'Gücü telefon belirler; son %20 yavaş dolar';
        if (key === 'charger') return charger + ' W';
        if (key === 'mode') return mode;
        if (key === 'state') return mode === 'sarj' ? (q >= 0.999 ? 'Dolu' : 'Şarj ediliyor') : 'Kullanımda';
        return '';
      },
      dispose: function () { v.dispose(); }
    };
  });

  /* ==================================================================
   * 3) wireless · W 1120×380 · light
   * Spectrum ribbon (log scale) + the selected band as a travelling E/B wave over a ruler,
   * next to a real-size reference object. λ = c ÷ f.
   * ================================================================== */
  K.register('wireless', function (el, opts) {
    var THREE = TH();
    var theme = opts.theme || 'light';
    var dark = theme === 'dark';
    var v = K.stage3d(el, {
      theme: theme, fov: 24, distance: 58, yaw: 0.16, pitch: 0.17, target: [0.2, 7.4, 0], near: 3, far: 600,
      size: 30, ground: 0, minYaw: -0.6, maxYaw: 0.75, minPitch: 0.0, maxPitch: 0.7
    });
    var S = v.scene;
    if (v.lights) { v.lights.key.position.set(-14, 60, 50); v.lights.key.intensity = 1.2; v.lights.hemi.intensity = 0.6; }

    var C = 3e8;
    var ORDER = ['fm', 'wifi24', 'g5', 'wifi5', 'isik'];
    var BANDS = {
      fm: { name: 'FM radyo 100 MHz', f: 1e8, fTxt: '100 MHz', fEq: '=', lam: 3, lamTxt: '3 m', group: 'm', words: '100 milyon', obj: 'person', eq: '=', objTxt: 'yanında: insan, yaklaşık 1,7 m' },
      wifi24: { name: 'Wi-Fi 2,4 GHz', f: 2.4e9, fTxt: '2,4 GHz', fEq: '=', lam: 0.125, lamTxt: '12,5 cm', group: 'cm', words: '2,4 milyar', obj: 'phone', eq: '=', objTxt: 'arkasında: telefon, yaklaşık 15 cm' },
      g5: { name: 'Mobil 5G 3,5 GHz', f: 3.5e9, fTxt: '3,5 GHz', fEq: '=', lam: 3e8 / 3.5e9, lamTxt: '8,6 cm', group: 'cm', words: '3,5 milyar', obj: 'card', eq: '≈', objTxt: 'arkasında: banka kartı, 8,56 cm' },
      wifi5: { name: 'Wi-Fi 5 GHz', f: 5e9, fTxt: '5 GHz', fEq: '=', lam: 0.06, lamTxt: '6 cm', group: 'cm', words: '5 milyar', obj: 'coin', eq: '=', objTxt: 'arkasında: 1 TL madeni para, 2,6 cm' },
      isik: { name: 'Görünür ışık ≈ 500 THz', f: 5e14, fTxt: '500 THz', fEq: '≈', lam: 6e-7, lamTxt: '600 nm', group: 'nm', words: '500 trilyon', obj: null, eq: '=', objTxt: 'bir saç teli bundan yaklaşık 100 kat kalındır' }
    };
    var X0 = -26, XL = 52, WAVE_Y = 4.7, AMP = 2.4;
    var GROUPS = {
      m: { len: 10.4, unit: 'm', scale: XL / 10.4 },     // world units per metre
      cm: { len: 0.416, unit: 'cm', scale: XL / 0.416 },
      nm: { len: 3.9e-6, unit: 'nm', scale: XL / 3.9e-6 }
    };

    /* ---------- spectrum ribbon ---------- */
    var F0 = 7, F1 = 15;                         // log10 Hz range
    var RW = 62, RH = 4.6;
    function fpos(f) { return (Math.log(f) / Math.LN10 - F0) / (F1 - F0); }
    var rib = new THREE.Group();
    rib.position.set(0.3, 14.6, -7);
    rib.rotation.order = 'YXZ';
    rib.rotation.set(1.22, 0.17, 0);
    S.add(rib);
    var ribBody = new THREE.Mesh(rbox(RW, 0.42, RH, 0.18, 2), K.mat.std(0xE9E8E3, 0.55));
    rib.add(ribBody);
    var ribTex = canvasTex(4096, 300);
    function drawRibbon() {
      var g = ribTex.ctx, Wt = 4096, Ht = 300;
      g.clearRect(0, 0, Wt, Ht);
      g.fillStyle = '#F4F3EF'; g.fillRect(0, 0, Wt, Ht);
      var xr = function (f) { return fpos(f) * Wt; };
      // region tints
      g.fillStyle = 'rgba(35,67,176,0.045)'; g.fillRect(0, 0, xr(3e11), Ht);
      g.fillStyle = 'rgba(35,67,176,0.05)'; g.fillRect(xr(3e8), 0, xr(3e11) - xr(3e8), Ht);
      var ir = g.createLinearGradient(xr(3e11), 0, xr(4e14), 0);
      ir.addColorStop(0, 'rgba(160,60,40,0.03)'); ir.addColorStop(1, 'rgba(160,40,30,0.14)');
      g.fillStyle = ir; g.fillRect(xr(3e11), 0, xr(4e14) - xr(3e11), Ht);
      // visible light in true colour (f grows to the right: red → violet)
      var vis = g.createLinearGradient(xr(4e14), 0, xr(7.9e14), 0);
      [[4e14, '#B0122A'], [4.6e14, '#F0381E'], [5.0e14, '#FF9A12'], [5.2e14, '#F6E31E'], [5.6e14, '#45C23A'], [6.1e14, '#1EA6D6'], [6.6e14, '#2E4BE0'], [7.5e14, '#6A2BD0'], [7.9e14, '#5A1C9C']].forEach(function (s) {
        vis.addColorStop((fpos(s[0]) - fpos(4e14)) / (fpos(7.9e14) - fpos(4e14)), s[1]);
      });
      g.fillStyle = vis; g.fillRect(xr(4e14), 0, xr(7.9e14) - xr(4e14), Ht);
      var uv = g.createLinearGradient(xr(7.9e14), 0, Wt, 0);
      uv.addColorStop(0, 'rgba(90,28,156,0.25)'); uv.addColorStop(1, 'rgba(90,28,156,0)');
      g.fillStyle = uv; g.fillRect(xr(7.9e14), 0, Wt - xr(7.9e14), Ht);
      // centre line and decade ticks
      g.strokeStyle = 'rgba(21,23,28,0.35)'; g.lineWidth = 2;
      g.beginPath(); g.moveTo(0, Ht / 2); g.lineTo(Wt, Ht / 2); g.stroke();
      for (var d = 0; d <= 8; d++) {
        var x = Math.min(Wt - 3, Math.max(3, d / 8 * Wt));
        for (var m = 2; m < 10 && d < 8; m++) {
          var xm = (d + Math.log(m) / Math.LN10) / 8 * Wt;
          g.strokeStyle = 'rgba(21,23,28,0.3)'; g.lineWidth = 3;
          g.beginPath(); g.moveTo(xm, Ht / 2 - 14); g.lineTo(xm, Ht / 2 + 14); g.stroke();
        }
        g.strokeStyle = 'rgba(21,23,28,0.75)'; g.lineWidth = 5;
        g.beginPath(); g.moveTo(x, Ht / 2 - 34); g.lineTo(x, Ht / 2 + 34); g.stroke();
      }
      ribTex.tex.needsUpdate = true;
    }
    drawRibbon();
    onFonts(drawRibbon);
    var ribFace = new THREE.Mesh(new THREE.PlaneGeometry(RW - 0.4, RH - 0.4), new THREE.MeshStandardMaterial({ map: ribTex.tex, roughness: 0.6 }));
    ribFace.rotation.x = -Math.PI / 2;
    ribFace.position.y = 0.212;
    rib.add(ribFace);
    rib.updateMatrixWorld(true);
    function ribPt(f, lift) { return rib.localToWorld(new THREE.Vector3((fpos(f) - 0.5) * (RW - 0.4), 0.22 + (lift || 0), 0)); }
    // markers
    var mkMat = K.mat.std(0x3E434D, 0.4), mkSel = K.mat.std(0xC8693A, 0.35, 0.2, { emissive: 0x6A2A0C, emissiveIntensity: 0.3 });
    var markers = {};
    ORDER.concat(['bt']).forEach(function (k) {
      var f = k === 'bt' ? 2.4e9 : BANDS[k].f;
      var m = new THREE.Mesh(new THREE.SphereGeometry(0.34, 20, 14), mkMat);
      m.position.copy(rib.worldToLocal(ribPt(f, 0.15)));
      rib.add(m);
      markers[k] = m;
    });
    var ring = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.07, 10, 40), K.mat.std(0xC8693A, 0.35, 0.2));
    ring.rotation.x = Math.PI / 2;
    rib.add(ring);

    /* ---------- wave panel: ruler ---------- */
    var rulers = {};
    function drawRuler(gk) {
      var ct = rulers[gk] || canvasTex(4096, 256), g = ct.ctx, Wt = 4096, Ht = 256;
      g.clearRect(0, 0, Wt, Ht);
      g.fillStyle = '#F3F0E7'; g.fillRect(0, 0, Wt, Ht);
      var G = GROUPS[gk], ppm = Wt / G.len;
      g.fillStyle = '#2A2D33'; g.strokeStyle = '#2A2D33'; g.textAlign = 'center';
      var minor, major, lab, fmt;
      if (gk === 'm') { minor = 0.1; major = 1; lab = 1; fmt = function (x) { return nf(x) + ' m'; }; }
      else if (gk === 'cm') { minor = 0.001; major = 0.01; lab = 0.02; fmt = function (x) { return nf(Math.round(x * 100)); }; }
      else { minor = 1e-7; major = 5e-7; lab = 5e-7; fmt = function (x) { return nf(Math.round(x * 1e9)) + (Math.round(x * 1e9) === 0 ? '' : ''); }; }
      var n = Math.round(G.len / minor);
      for (var i = 0; i <= n; i++) {
        var xm = i * minor, x = xm * ppm;
        var isMaj = Math.abs(xm / major - Math.round(xm / major)) < 1e-6;
        var isHalf = gk === 'cm' && Math.abs(xm / 0.005 - Math.round(xm / 0.005)) < 1e-6;
        var len = isMaj ? 70 : isHalf ? 46 : 28;
        g.lineWidth = isMaj ? 4 : 2.5;
        g.beginPath(); g.moveTo(Math.min(Wt - 2, Math.max(2, x)), 0); g.lineTo(Math.min(Wt - 2, Math.max(2, x)), len); g.stroke();

      }

      ct.tex.needsUpdate = true;
      rulers[gk] = ct;
      return ct;
    }
    ['m', 'cm', 'nm'].forEach(drawRuler);
    onFonts(function () { ['m', 'cm', 'nm'].forEach(drawRuler); });
    var rulerG = new THREE.Group();
    rulerG.position.set(X0 + XL / 2, 0.75, 2.6);
    rulerG.rotation.x = 1.12;
    S.add(rulerG);
    var ruler = new THREE.Mesh(flatSlab(XL + 1.4, 2.3, 0.28, 0.22, 0.07), K.mat.std(0xF1EEE4, 0.55));
    ruler.position.y = -0.28;
    ruler.castShadow = true; ruler.receiveShadow = true;
    rulerG.add(ruler);
    var rulerFace = new THREE.Mesh(new THREE.PlaneGeometry(XL, 2.0), new THREE.MeshStandardMaterial({ map: rulers.cm.tex, roughness: 0.6, transparent: true }));
    rulerFace.rotation.x = -Math.PI / 2;
    rulerFace.position.set(0, 0.006, 0);
    rulerG.add(rulerFace);
    rulerG.updateMatrixWorld(true);
    function rulerPt(x, zz) { return rulerG.localToWorld(new THREE.Vector3(x - (X0 + XL / 2), 0.01, zz)); }

    /* ---------- wave: E and B as tubes + field vectors ---------- */
    function sineTube(nSeg, nRad, rad, mat) {
      var geo = new THREE.BufferGeometry();
      var nv = (nSeg + 1) * (nRad + 1);
      var pos = new Float32Array(nv * 3), nor = new Float32Array(nv * 3), idx = [];
      for (var i = 0; i < nSeg; i++) for (var j = 0; j < nRad; j++) {
        var a = i * (nRad + 1) + j, b = a + nRad + 1;
        idx.push(a, b, a + 1, b, b + 1, a + 1);
      }
      geo.setIndex(idx);
      geo.setAttribute('position', new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage));
      geo.setAttribute('normal', new THREE.BufferAttribute(nor, 3).setUsage(THREE.DynamicDrawUsage));
      var mesh = new THREE.Mesh(geo, mat);
      mesh.frustumCulled = false;
      // update: plane 'y' or 'z'; f(x) gives displacement
      mesh.update = function (x0, x1, plane, fx, dfx, rScale) {
        for (var i = 0; i <= nSeg; i++) {
          var x = lerp(x0, x1, i / nSeg), d = fx(x), dd = dfx(x);
          var tl = Math.sqrt(1 + dd * dd), tx = 1 / tl, td = dd / tl;   // tangent (x, d)
          var rr = rad * rScale(x);
          for (var j = 0; j <= nRad; j++) {
            var th = j / nRad * Math.PI * 2, cs = Math.cos(th), sn = Math.sin(th);
            // N1 = (-td, tx) in the oscillation plane, N2 = perpendicular axis
            var nx = -td * cs, nd = tx * cs, np = sn;
            var k = (i * (nRad + 1) + j) * 3;
            if (plane === 'y') { pos[k] = x + nx * rr; pos[k + 1] = WAVE_Y + d + nd * rr; pos[k + 2] = np * rr; nor[k] = nx; nor[k + 1] = nd; nor[k + 2] = np; }
            else { pos[k] = x + nx * rr; pos[k + 1] = WAVE_Y + np * rr; pos[k + 2] = d + nd * rr; nor[k] = nx; nor[k + 1] = np; nor[k + 2] = nd; }
          }
        }
        geo.attributes.position.needsUpdate = true;
        geo.attributes.normal.needsUpdate = true;
      };
      return mesh;
    }
    var eMat = K.mat.std(0x3E434D, 0.38, 0.1, { transparent: true });
    var bMat = K.mat.std(0x9AA1AC, 0.45, 0.1, { transparent: true });
    var eTube = sineTube(360, 8, 0.15, eMat), bTube = sineTube(360, 8, 0.11, bMat);
    eTube.castShadow = true;
    S.add(eTube); S.add(bTube);
    var vecGeo = new THREE.CylinderGeometry(0.045, 0.045, 1, 6, 1, true); vecGeo.translate(0, 0.5, 0);
    var eVecMat = new THREE.MeshBasicMaterial({ color: 0x3E434D, transparent: true, opacity: 0.4, depthWrite: false });
    var bVecMat = new THREE.MeshBasicMaterial({ color: 0x9AA1AC, transparent: true, opacity: 0.45, depthWrite: false });
    var eVec = instMesh(vecGeo, eVecMat, 96), bVec = instMesh(vecGeo, bVecMat, 96);
    S.add(eVec); S.add(bVec);
    var qZ = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI / 2);
    var qZn = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI / 2);
    var qYn = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), Math.PI);
    // propagation axis with arrow head
    var axisMat = K.mat.std(0x8A909A, 0.5);
    var axis = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, XL + 1.5, 8), axisMat);
    axis.rotation.z = Math.PI / 2; axis.position.set(X0 + XL / 2 + 0.6, WAVE_Y, 0);
    S.add(axis);
    var head = new THREE.Mesh(new THREE.ConeGeometry(0.32, 1.1, 18), axisMat);
    head.rotation.z = -Math.PI / 2; head.position.set(X0 + XL + 1.9, WAVE_Y, 0);
    S.add(head);

    /* ---------- reference objects ---------- */
    var objs = {};
    // person, 1,7 m (abstract figure)
    (function () {
      var g = new THREE.Group(), m = K.mat.std(0x8D939D, 0.6);
      var sc = GROUPS.m.scale;          // world units per metre
      function cap(r, len, x, y, rz) {
        var c = new THREE.Mesh(new THREE.CapsuleGeometry(r * sc, len * sc, 6, 14), m);
        c.position.set(x * sc, y * sc, 0); c.rotation.z = rz || 0; c.castShadow = true; g.add(c); return c;
      }
      cap(0.07, 0.74, -0.095, 0.44); cap(0.07, 0.74, 0.095, 0.44);
      cap(0.165, 0.44, 0, 1.17);
      cap(0.05, 0.58, -0.255, 1.1, 0.08); cap(0.05, 0.58, 0.255, 1.1, -0.08);
      var hd = new THREE.Mesh(new THREE.SphereGeometry(0.105 * sc, 24, 16), m);
      hd.position.set(0, 1.585 * sc, 0); hd.castShadow = true; g.add(hd);
      g.position.set(X0 + 3.5 * sc, 0, -4.6);
      objs.person = g;
    })();
    // phone, 15 cm long, lying behind the ruler
    (function () {
      var sct = canvasTex(256, 512), g2 = sct.ctx;
      var gr = g2.createLinearGradient(0, 0, 0, 512);
      gr.addColorStop(0, '#2B3A55'); gr.addColorStop(1, '#8696B0');
      g2.fillStyle = gr; g2.fillRect(0, 0, 256, 512);
      var sc = GROUPS.cm.scale;
      var p = makePhone({ w: 0.072 * sc, h: 0.15 * sc, d: 0.008 * sc, screen: sct.tex });
      p.rotation.set(0, 0, Math.PI / 2);
      p.position.set(X0 + 0.075 * sc, 0.036 * sc, -4.6);
      shadowAll(p, true, false);
      var g = new THREE.Group(); g.add(p);
      objs.phone = g;
    })();
    // bank card, 85,6 × 54 mm
    (function () {
      var ct = canvasTex(856, 540), g2 = ct.ctx;
      var gr = g2.createLinearGradient(0, 0, 856, 540);
      gr.addColorStop(0, '#3B4A63'); gr.addColorStop(1, '#22293A');
      g2.fillStyle = gr; g2.fillRect(0, 0, 856, 540);
      g2.fillStyle = '#D6B25E'; rrPath(g2, 90, 190, 118, 92, 14); g2.fill();
      g2.strokeStyle = 'rgba(80,60,20,0.55)'; g2.lineWidth = 3;
      g2.beginPath(); g2.moveTo(90, 236); g2.lineTo(208, 236); g2.moveTo(149, 190); g2.lineTo(149, 282); g2.stroke();
      g2.fillStyle = 'rgba(255,255,255,0.12)'; g2.fillRect(0, 400, 856, 6);
      var sc = GROUPS.cm.scale;
      var cw = 0.0856 * sc, chh = 0.054 * sc;
      var card = new THREE.Mesh(slab(cw, chh, 0.0008 * sc * 2, 0.0032 * sc, 0.0003 * sc), K.mat.std(0x2B3446, 0.4));
      var face = new THREE.Mesh(rrPlane(cw - 0.02, chh - 0.02, 0.0031 * sc), new THREE.MeshStandardMaterial({ map: ct.tex, roughness: 0.35 }));
      var uv = face.geometry.attributes.uv, pa = face.geometry.attributes.position;
      for (var i = 0; i < uv.count; i++) uv.setXY(i, pa.getX(i) / (cw - 0.02) + 0.5, pa.getY(i) / (chh - 0.02) + 0.5);
      face.position.z = 0.0009 * sc;
      card.add(face);
      card.position.set(X0 + cw / 2, chh / 2, -4.2);
      card.castShadow = true;
      var g = new THREE.Group(); g.add(card);
      objs.card = g;
    })();
    // 1 TL coin, Ø 26,15 mm, bimetal
    (function () {
      var sc = GROUPS.cm.scale, R = 0.026150 / 2 * sc, Tk = 0.0019 * sc;
      var g = new THREE.Group();
      var ringM = K.mat.std(0xC9A65A, 0.32, 1), coreM = K.mat.std(0xC4C8CE, 0.3, 1);
      var outer = new THREE.Mesh(new THREE.CylinderGeometry(R, R, Tk, 64), ringM);
      var core = new THREE.Mesh(new THREE.CylinderGeometry(R * 0.62, R * 0.62, Tk * 1.08, 56), coreM);
      var rim = new THREE.Mesh(new THREE.TorusGeometry(R * 0.965, Tk * 0.2, 8, 64), ringM);
      rim.rotation.x = Math.PI / 2; rim.position.y = Tk / 2;
      g.add(outer); g.add(core); g.add(rim);
      g.rotation.x = Math.PI / 2;
      g.position.set(X0 + R, R, -4.0);
      shadowAll(g, true, false);
      var g2 = new THREE.Group(); g2.add(g);
      objs.coin = g2;
    })();
    Object.keys(objs).forEach(function (k) { S.add(objs[k]); objs[k].visible = false; });
    var objFade = { person: 0, phone: 0, card: 0, coin: 0 };
    function setObjOpacity(o, a) {
      o.visible = a > 0.01;
      o.traverse(function (c) {
        if (c.material && !c.material.__kgBase) { c.material = c.material.clone(); c.material.__kgBase = true; c.material.transparent = true; }
        if (c.material) c.material.opacity = a;
        if (c.isMesh) c.castShadow = a > 0.9;
      });
      o.scale.setScalar(lerp(0.96, 1, a));
    }

    /* ---------- labels ---------- */
    var mkLab = {};
    var mkDef = {
      fm: { t: 'FM radyo', dx: 0, dy: -46 },
      wifi24: { t: 'Wi-Fi 2,4 GHz', dx: -50, dy: -46 },
      bt: { t: 'Bluetooth', dx: 0, dy: 52, below: true },
      g5: { t: '5G 3,5 GHz', dx: 70, dy: -46 },
      wifi5: { t: 'Wi-Fi 5 GHz', dx: 140, dy: -46 },
      isik: { t: 'görünür ışık', dx: -6, dy: -46 }
    };
    Object.keys(mkDef).forEach(function (k) {
      var d = mkDef[k];
      var f = k === 'bt' ? 2.4e9 : BANDS[k].f;
      mkLab[k] = v.label(d.t, { at: ribPt(f, 0.4), cls: 'note', dx: d.dx, dy: d.dy, line: true, valign: d.below ? 'top' : 'bottom', align: k === 'isik' ? 'right' : 'center' });
    });
    var hdr = [X0 + XL, WAVE_Y + AMP + 3.9, 0];
    var labName = v.label('', { at: hdr, cls: 'name', align: 'right', valign: 'bottom' });
    setLabelSize(labName, 16);
    var labFL = v.label('', { at: hdr, cls: 'value', align: 'right', valign: 'top', dy: 4 });
    var labObj = v.label('', { at: hdr, cls: 'note', align: 'right', valign: 'top', dy: 26 });
    var labSlow = v.label('', { at: [X0 + XL, 0, 3.4], cls: 'tag', align: 'right', valign: 'top', dy: 12 });
    var labE = v.label('elektrik alanı', { at: [X0 + XL + 1.0, WAVE_Y + AMP * 0.8, 0], cls: 'tag', align: 'left', dx: 8, line: true });
    var labB = v.label('manyetik alan', { at: [X0 + XL + 1.0, WAVE_Y - 0.4, AMP * 0.8], cls: 'tag', align: 'left', dx: 8, dy: 8, line: true });

    /* ---------- state ---------- */
    var band, auto, cycT, lamU, grp, fadeG, pendingG, phase0, selA = {};
    function bandSet(k, instant) {
      if (!BANDS[k]) return;
      band = k;
      var b = BANDS[k];
      if (instant) { grp = b.group; lamU = b.lam * GROUPS[grp].scale; fadeG = 1; pendingG = null; rulerFace.material.map = rulers[grp].tex; rulerFace.material.needsUpdate = true; }
      else if (b.group !== grp) { pendingG = b.group; }
      else pendingG = null;
      if (!pendingG) headerFor(b);

      var on = {};
      ORDER.forEach(function (o) { on[o] = o === k; });
      ORDER.concat(['bt']).forEach(function (o) {
        var isSel = o === k || (o === 'bt' && k === 'wifi24');
        mkLab[o].el.style.color = isSel ? (dark ? P.onNight : P.ink) : '';
        mkLab[o].el.style.fontWeight = isSel ? '600' : '';
      });
    }
    function headerFor(b) {
      labName.set(b.name);
      labFL.set('f ' + b.fEq + ' ' + b.fTxt + '   ·   λ ' + b.eq + ' ' + b.lamTxt);
      labObj.set(b.objTxt);
      labSlow.set('yavaşlatılmış: gerçekte saniyede ' + b.words + ' titreşim');
    }
    function reset() {
      auto = true; cycT = 0; phase0 = 0;
      bandSet('fm', true);
      objFade = { person: 1, phone: 0, card: 0, coin: 0 };
    }

    var vT = new THREE.Vector3();
    function frame(t, dt) {
      if (auto) {
        cycT += dt;
        if (cycT >= 6) { cycT -= 6; bandSet(ORDER[(ORDER.indexOf(band) + 1) % ORDER.length]); }
      }
      var b = BANDS[band];
      // group cross-fade
      if (pendingG) {
        fadeG -= dt / 0.45;
        if (fadeG <= 0) { fadeG = 0; grp = pendingG; pendingG = null; lamU = b.lam * GROUPS[grp].scale; rulerFace.material.map = rulers[grp].tex; rulerFace.material.needsUpdate = true; headerFor(b); }
      } else fadeG = Math.min(1, fadeG + dt / 0.45);
      var lamT = b.lam * GROUPS[grp].scale;
      if (!pendingG) lamU = easeTo(lamU, lamT, 4, Math.max(dt, 1e-3));
      // travelling phase: one wavelength per 1,8 s
      if (!K.reducedMotion) phase0 += dt / 1.8;
      var kk = Math.PI * 2 / lamU, ph = phase0 * Math.PI * 2;
      var xa = X0, xb = X0 + XL;
      var env = function (x) { return sstep(xa, xa + 2.2, x) * (1 - sstep(xb - 2.2, xb, x)); };
      var fE = function (x) { return AMP * Math.sin(kk * (x - xa) - ph) * env(x); };
      var dE = function (x) { return AMP * kk * Math.cos(kk * (x - xa) - ph) * env(x); };
      var isLight = band === 'isik' && !pendingG;
      eTube.update(xa, xb, 'y', fE, dE, function () { return 1; });
      bTube.update(xa, xb, 'z', fE, dE, function () { return 1; });
      eMat.opacity = bMat.opacity = fadeG;
      eVecMat.opacity = 0.4 * fadeG; bVecMat.opacity = 0.45 * fadeG;
      var col = isLight ? 0xF08A12 : 0x3E434D, colB = isLight ? 0xF6C27A : 0x9AA1AC;
      eMat.color.setHex(col); eVecMat.color.setHex(col); bMat.color.setHex(colB); bVecMat.color.setHex(colB);
      // field vectors every λ/8
      eVec.begin(); bVec.begin();
      var step = lamU / 8;
      var off = ((ph / kk) % step + step) % step;
      for (var x = xa + off; x < xb; x += step) {
        var d = fE(x);
        if (Math.abs(d) < 0.06) continue;
        if (d > 0) eVec.put(x, WAVE_Y, 0, 1, d, 1); else eVec.put(x, WAVE_Y, 0, 1, -d, 1, qYn);
        if (d > 0) bVec.put(x, WAVE_Y, 0, 1, d, 1, qZ); else bVec.put(x, WAVE_Y, 0, 1, -d, 1, qZn);
      }
      eVec.end(); bVec.end();
      // objects
      Object.keys(objFade).forEach(function (o) {
        var want = (!pendingG && b.obj === o) ? 1 : 0;
        objFade[o] = clamp(objFade[o] + (want ? dt / 0.5 : -dt / 0.35), 0, 1);
        if (K.reducedMotion) objFade[o] = want;
        setObjOpacity(objs[o], E.inOut(objFade[o]));
      });
      rulerFace.material.opacity = 0.35 + 0.65 * fadeG;

      [labName, labFL, labSlow, labObj].forEach(function (L) { styleIf(L, 'opacity', String(Math.round((0.25 + 0.75 * fadeG) * 50) / 50)); });
      // ribbon selection ring
      var mk = markers[band];
      ring.position.copy(mk.position);
      ring.scale.setScalar(1 + 0.08 * Math.sin(t * 2.2));
      ORDER.concat(['bt']).forEach(function (o) {
        var sel = o === band || (o === 'bt' && band === 'wifi24');
        markers[o].material = sel ? mkSel : mkMat;
        markers[o].scale.setScalar(sel ? 1.25 : 0.9);
      });
      styleIf(labE, 'color', isLight ? '#B85F00' : (dark ? P.onNight : P.ink));
      styleIf(labB, 'color', isLight ? '#C99A55' : '#7B828E');
      v.render(dt);

      /* 2D overlay: ribbon scale, ruler numbers, zoom lines and λ bracket */
      var c = v.ctx;
      c.save();
      (function () {
        var G = GROUPS[grp], step, f;
        if (grp === 'm') { step = 1; f = function (x) { return nf(x) + ' m'; }; }
        else if (grp === 'cm') { step = 0.02; f = function (x) { return nf(Math.round(x * 100)) + (Math.round(x * 100) % 10 === 0 ? ' cm' : ''); }; }
        else { step = 5e-7; f = function (x) { return nf(Math.round(x * 1e9)) + ' nm'; }; }
        c.globalAlpha = 0.25 + 0.75 * fadeG;
        c.font = K.font(11, 500, true); c.textAlign = 'center'; c.textBaseline = 'middle';
        c.fillStyle = dark ? P.onNight : P.ink2;
        for (var xm = 0; xm <= G.len + 1e-12; xm += step) {
          var rp = v.project(rulerPt(X0 + xm * G.scale, 0.45));
          var tx2 = f(xm);
          if (xm === 0) tx2 = '0';
          c.fillText(tx2, rp.x, rp.y);
        }
        c.globalAlpha = 1;
        c.textBaseline = 'alphabetic';
      })();
      var FL = ['10 MHz', '100 MHz', '1 GHz', '10 GHz', '100 GHz', '1 THz', '10 THz', '100 THz', '1000 THz'];
      c.font = K.font(11, 500, true); c.textAlign = 'center'; c.textBaseline = 'middle';
      for (var dd = 0; dd <= 8; dd++) {
        var lp = v.project(rib.localToWorld(vT.set((dd / 8 - 0.5) * (RW - 0.4), 0.22, RH * 0.3)));
        var lx = dd === 0 ? lp.x + 22 : dd === 8 ? lp.x - 20 : lp.x;
        c.fillStyle = dark ? P.onNightMuted : P.muted;
        c.fillText(FL[dd], dd === 8 ? lx - 6 : lx, dd === 8 ? lp.y + 17 : lp.y);
      }
      var RG = [[3e7, 'RADYO DALGALARI'], [1.6e10, 'MİKRODALGA (RADYO)'], [9e12, 'KIZILÖTESİ']];
      c.font = K.font(10, 600, true);
      if ('letterSpacing' in c) c.letterSpacing = '1px';
      RG.forEach(function (r) {
        var rp = v.project(rib.localToWorld(vT.set((fpos(r[0]) - 0.5) * (RW - 0.4), 0.22, -RH * 0.3)));
        c.fillStyle = dark ? P.onNightMuted : P.muted;
        c.fillText(r[1], rp.x, rp.y);
      });
      if ('letterSpacing' in c) c.letterSpacing = '0px';
      c.textBaseline = 'alphabetic';
      if (grp === 'nm') {
        var cp = v.project(rulerPt(X0, 1.05));
        K.label(c, 'cetvel büyütülmüş: 1.000 nm = 0,001 mm', cp.x, cp.y + 46, { size: 11, mono: true, spacing: 0.6, color: dark ? P.onNightMuted : P.muted, alpha: fadeG });
      }
      // λ bracket between two neighbouring crests that travel with the wave
      var crestLo = xa + 2.4, crestHi = xb - 2.2 - lamU;
      var nC = Math.ceil((kk * (crestLo - xa) - Math.PI / 2 - ph) / (Math.PI * 2));
      var xc0 = xa + (Math.PI / 2 + ph + Math.PI * 2 * nC) / kk;
      var crestU = clamp((xc0 - crestLo) / lamU, 0, 1);
      var crestA = sstep(0, 0.25, crestU) * (1 - sstep(0.75, 1, crestU)) * (xc0 <= crestHi ? 1 : 0);
      var yb = WAVE_Y + AMP + 1.0;
      var q0 = v.project(vT.set(xc0, yb, 0)), q1 = v.project(vT.set(xc0 + lamU, yb, 0));
      var a = fadeG * (pendingG ? 0 : 1) * crestA;
      if (a > 0.02) {
        c.globalAlpha = a;
        var ink = dark ? P.onNight : P.ink;
        c.strokeStyle = ink; c.fillStyle = ink; c.lineWidth = 1.3;
        c.beginPath(); c.moveTo(q0.x, q0.y - 6); c.lineTo(q0.x, q0.y + 6); c.moveTo(q1.x, q1.y - 6); c.lineTo(q1.x, q1.y + 6); c.stroke();
        K.arrow(c, (q0.x + q1.x) / 2, (q0.y + q1.y) / 2, q0.x + 1, q0.y, { color: ink, width: 1.3, head: 6 });
        K.arrow(c, (q0.x + q1.x) / 2, (q0.y + q1.y) / 2, q1.x - 1, q1.y, { color: ink, width: 1.3, head: 6 });
        var txt = 'λ ' + b.eq + ' ' + b.lamTxt;
        c.font = K.font(14, 500, true);
        var tw = c.measureText(txt).width + 12;
        c.fillStyle = dark ? P.night : P.paper;
        c.fillRect((q0.x + q1.x) / 2 - tw / 2, (q0.y + q1.y) / 2 - 10, tw, 20);
        K.label(c, txt, (q0.x + q1.x) / 2, (q0.y + q1.y) / 2 + 5, { size: 14, weight: 500, mono: true, align: 'center', color: ink });
        // dashed guides down to the crests
        c.setLineDash([2, 3]); c.lineWidth = 1; c.strokeStyle = dark ? 'rgba(238,240,243,.35)' : 'rgba(21,23,28,.3)';
        var g0 = v.project(rulerPt(xc0, -0.95)), g1 = v.project(rulerPt(xc0 + lamU, -0.95));
        c.beginPath(); c.moveTo(q0.x, q0.y + 6); c.lineTo(g0.x, g0.y); c.moveTo(q1.x, q1.y + 6); c.lineTo(g1.x, g1.y); c.stroke();
        c.setLineDash([]);
      }
      c.restore();
    }

    reset();
    return {
      reset: reset,
      frame: frame,
      set: function (key, val) {
        if (key === 'band') { auto = false; bandSet(String(val)); }
      },
      read: function (key) {
        var b = BANDS[band];
        if (key === 'name') return b.name;
        if (key === 'formula') {
          var lam = C / b.f;
          var lamS = band === 'g5' ? nf(lam, 3) : band === 'isik' ? nf(lam, 7) : nf(lam, 3);
          return 'λ = c ÷ f = 300.000.000 m/s ÷ ' + nf(b.f) + ' Hz ' + b.eq + ' ' + lamS + ' m' + (band === 'isik' ? ' = ' + b.lamTxt : '');
        }
        if (key === 'wavelength') return b.lamTxt;
        if (key === 'band') return band;
        return '';
      },
      dispose: function () { v.dispose(); }
    };
  });

  /* ==================================================================
   * 4) message-journey · W 1120×380 · light
   * A voice message: sound → microphone → bits → Wi-Fi → fibre (total internal reflection)
   * → backbone → 5G mast → second phone → speaker → sound. About 12 s loop.
   * ================================================================== */
  K.register('message-journey', function (el, opts) {
    var THREE = TH();
    var theme = opts.theme || 'light';
    var dark = theme === 'dark';
    var v = K.stage3d(el, {
      theme: theme, fov: 22, distance: 118, yaw: 0, pitch: 0.15, target: [0, 13.2, 0], near: 6, far: 900,
      size: 64, ground: 0, minYaw: -0.45, maxYaw: 0.45, minPitch: 0.03, maxPitch: 0.6
    });
    var S = v.scene;
    if (v.lights) { v.lights.key.position.set(-30, 110, 80); v.lights.key.intensity = 1.25; v.lights.hemi.intensity = 0.6; }
    var LOOP = 12;
    var XS = [-56, -42, -28, -14, 0, 14, 28, 42, 56];

    /* ---------- busts (abstract, no face) ---------- */
    var bustMat = K.mat.std(0xA7ACB4, 0.62);
    function bust(x) {
      var g = new THREE.Group();
      var torso = new THREE.Mesh(new THREE.CapsuleGeometry(2.35, 3.6, 8, 24), bustMat);
      torso.position.y = 4.15; torso.scale.set(1, 1, 0.8);
      var neck = new THREE.Mesh(new THREE.CylinderGeometry(0.82, 0.92, 1.4, 20), bustMat);
      neck.position.y = 8.0;
      var head = new THREE.Mesh(new THREE.SphereGeometry(1.95, 36, 24), bustMat);
      head.position.y = 10.25; head.scale.set(1, 1.08, 1);
      g.add(torso); g.add(neck); g.add(head);
      g.position.set(x, 0, 0);
      shadowAll(g, true, false);
      S.add(g);
      return g;
    }
    bust(-58.5); bust(58.5);

    /* ---------- phones (floating, product-style) ---------- */
    function phoneScreen(kind) {
      var ct = canvasTex(256, 512), g = ct.ctx;
      var gr = g.createLinearGradient(0, 0, 0, 512);
      gr.addColorStop(0, '#1B2130'); gr.addColorStop(1, '#2A3346');
      g.fillStyle = gr; g.fillRect(0, 0, 256, 512);
      g.fillStyle = 'rgba(255,255,255,0.92)';
      rrPath(g, 24, 214, 208, 76, 32); g.fill();
      g.fillStyle = '#3E434D';
      for (var i = 0; i < 17; i++) {
        var hh = 10 + Math.abs(Math.sin(i * 1.7) * 24 + Math.sin(i * 0.6) * 9);
        g.fillRect(76 + i * 8.6, 252 - hh / 2, 4.4, hh);
      }
      if (kind === 'rec') { g.fillStyle = '#C8693A'; g.beginPath(); g.arc(52, 252, 12, 0, Math.PI * 2); g.fill(); }
      else { g.fillStyle = '#3E434D'; g.beginPath(); g.moveTo(44, 238); g.lineTo(44, 266); g.lineTo(64, 252); g.closePath(); g.fill(); }
      return ct.tex;
    }
    var PH_Y = 10.6;
    var phA = makePhone({ w: 4.4, h: 9.0, d: 0.5, screen: phoneScreen('rec') });
    phA.position.set(-42, PH_Y, 0); phA.rotation.y = 0.3;
    var phB = makePhone({ w: 4.4, h: 9.0, d: 0.5, screen: phoneScreen('play') });
    phB.position.set(42, PH_Y, 0); phB.rotation.y = -0.3;
    shadowAll(phA, true, false); shadowAll(phB, true, false);
    S.add(phA); S.add(phB);

    /* ---------- router ---------- */
    var router = new THREE.Group();
    router.position.set(-14, 0, 0);
    S.add(router);
    var rBody = new THREE.Mesh(rbox(8.4, 2.3, 5.4, 0.6, 3), K.mat.std(0xEDECE7, 0.42));
    rBody.position.y = 1.15;
    router.add(rBody);
    var strip = new THREE.Mesh(rbox(6.4, 0.42, 0.1, 0.08, 2), K.mat.std(0x23262C, 0.3));
    strip.position.set(0, 1.25, 2.72);
    router.add(strip);
    var ledIM = instMesh(new THREE.BoxGeometry(0.34, 0.13, 0.06), new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false }), 4);
    router.add(ledIM);
    [-3.0, 3.0].forEach(function (x, i) {
      var ant = new THREE.Mesh(new THREE.CapsuleGeometry(0.27, 5.2, 4, 12), K.mat.std(0xE4E3DE, 0.45));
      ant.position.set(x, 4.7, -2.0); ant.rotation.z = i ? -0.12 : 0.12;
      router.add(ant);
    });
    shadowAll(router, true, true);

    /* ---------- fibre: lengthwise section with total internal reflection ---------- */
    var cableMat = K.mat.std(0xE5BF45, 0.5);      // single-mode patch cord yellow
    function cableAlong(pts, r) {
      var m = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, false, 'centripetal'), 60, r || 0.34, 10, false), cableMat);
      m.castShadow = true; S.add(m); return m;
    }
    var FX0 = -6.4, FX1 = 6.4, FY = 5.4, RJ = 2.3, RCL = 1.85, RCO = 0.95;
    cableAlong([new THREE.Vector3(-9.8, 1.2, 0.6), new THREE.Vector3(-8.7, 1.4, 0.6), new THREE.Vector3(-8.0, 3.6, 0.2), new THREE.Vector3(-7.4, FY, 0)]);
    cableAlong([new THREE.Vector3(7.4, FY, 0), new THREE.Vector3(8.4, 3.0, 0.4), new THREE.Vector3(9.4, 0.7, 1.4), new THREE.Vector3(10.6, 0.7, 1.6)]);
    var fib = new THREE.Group();
    fib.position.set(0, FY, 0);
    S.add(fib);
    var FL = FX1 - FX0;
    var jacketBack = new THREE.Mesh(new THREE.CylinderGeometry(RJ, RJ, FL, 48, 1, true, Math.PI / 2, Math.PI), cableMat);
    jacketBack.geometry.rotateZ(-Math.PI / 2);
    jacketBack.castShadow = true;
    fib.add(jacketBack);
    var layersF = [[RJ, RCL, cableMat], [RCL, RCO, K.mat.std(0xC9DCE3, 0.2, 0, { envMapIntensity: 1.2 })], [RCO, 0, K.mat.std(0x5F8798, 0.14, 0, { envMapIntensity: 1.2 })]];
    layersF.forEach(function (L) {
      [1, -1].forEach(function (sg) {
        if (L[1] === 0 && sg < 0) return;
        var hh = L[1] === 0 ? 2 * L[0] : L[0] - L[1];
        var st = new THREE.Mesh(new THREE.PlaneGeometry(FL, hh), L[2]);
        st.position.set(0, L[1] === 0 ? 0 : sg * (L[1] + hh / 2), 0.001);
        fib.add(st);
      });
      var ring = new THREE.Mesh(new THREE.RingGeometry(Math.max(1e-4, L[1]), L[0], 40, 1, -Math.PI / 2, Math.PI), L[2]);
      ring.rotation.y = -Math.PI / 2; ring.position.x = FX0;
      fib.add(ring);
      var ring2 = ring.clone(); ring2.rotation.y = Math.PI / 2; ring2.position.x = FX1;
      fib.add(ring2);
    });
    [RCL, RCO, -RCO, -RCL].forEach(function (y) {
      var ln = new THREE.Mesh(new THREE.PlaneGeometry(FL, 0.06), new THREE.MeshBasicMaterial({ color: 0x2C3A40, transparent: true, opacity: 0.35, depthWrite: false }));
      ln.position.set(0, y, 0.01);
      fib.add(ln);
    });
    // zig-zag path inside the core (bounces at the core-cladding boundary)
    var zig = [];
    (function () {
      var n = 7, a = RCO * 0.9;
      zig.push(new THREE.Vector3(FX0 - 0.8, FY, 0.06));
      for (var i = 0; i <= n; i++) zig.push(new THREE.Vector3(lerp(FX0 + 0.3, FX1 - 0.3, i / n), FY + (i % 2 ? -a : a), 0.06));
      zig.push(new THREE.Vector3(FX1 + 0.8, FY, 0.06));
    })();
    var zigCurve = new THREE.CurvePath();
    for (var zi = 0; zi < zig.length - 1; zi++) zigCurve.add(new THREE.LineCurve3(zig[zi], zig[zi + 1]));
    var zigTube = new THREE.Mesh(new THREE.TubeGeometry(zigCurve, 240, 0.06, 6, false), new THREE.MeshBasicMaterial({ color: 0xF2C46B, transparent: true, opacity: 0.45, toneMapped: false, depthWrite: false }));
    zigTube.renderOrder = 6;
    S.add(zigTube);
    var zigHot = new THREE.Mesh(new THREE.TubeGeometry(zigCurve, 240, 0.16, 8, false), new THREE.MeshBasicMaterial({ color: 0xFFD27A, toneMapped: false }));
    zigHot.renderOrder = 7;
    S.add(zigHot);
    var ZIG_SEG = 240;

    /* ---------- backbone: data-centre racks ---------- */
    var racks = new THREE.Group();
    racks.position.set(14, 0, -0.8);
    S.add(racks);
    var rackMat = K.mat.std(0x2B2E35, 0.45, 0.3), rackFaceMat = K.mat.std(0x1E2026, 0.6, 0.2);
    var rackX = [-3.55, 0, 3.55];
    rackX.forEach(function (x) {
      var r = new THREE.Mesh(rbox(3.35, 13.0, 4.2, 0.22, 2), rackMat);
      r.position.set(x, 6.5, 0);
      racks.add(r);
      var face = new THREE.Mesh(new THREE.PlaneGeometry(2.85, 12.3), rackFaceMat);
      face.position.set(x, 6.5, 2.105);
      racks.add(face);
    });
    var rackLeds = [];
    rackX.forEach(function (x, ri) {
      for (var row = 0; row < 12; row++) for (var col = 0; col < 3; col++) rackLeds.push([x - 0.85 + col * 0.85, 1.3 + row * 0.95, ri, row]);
    });
    var rLedIM = instMesh(new THREE.BoxGeometry(0.42, 0.14, 0.06), new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false }), rackLeds.length);
    racks.add(rLedIM);
    shadowAll(racks, true, true);
    mergeStatic(racks);
    cableAlong([new THREE.Vector3(19.4, 0.55, 0.8), new THREE.Vector3(22.5, 0.4, 1.8), new THREE.Vector3(24.2, 0.4, 1.6), new THREE.Vector3(25.4, 1.2, 0.9)]);

    /* ---------- 5G mast ---------- */
    var mast = new THREE.Group();
    mast.position.set(28.5, 0, -1.0);
    S.add(mast);
    var steel = K.mat.std(0xB4B9C1, 0.38, 0.85);
    var pole = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 1.0, 28.5, 28), steel);
    pole.position.y = 14.25;
    mast.add(pole);
    var cab = new THREE.Mesh(rbox(3.2, 3.2, 2.2, 0.25, 2), K.mat.std(0xD9DAD6, 0.5));
    cab.position.set(-2.5, 1.6, 1.1);
    mast.add(cab);
    var mhead = new THREE.Group();
    mhead.position.y = 27.3;
    mast.add(mhead);
    var panelMatM = K.mat.std(0xF1F0EC, 0.45);
    var ringT = new THREE.Mesh(new THREE.TorusGeometry(1.95, 0.11, 8, 3), steel);
    ringT.rotation.x = Math.PI / 2;
    mhead.add(ringT);
    for (var pa = 0; pa < 3; pa++) {
      var ang = pa / 3 * Math.PI * 2 + Math.PI / 6;
      var panel = new THREE.Mesh(rbox(1.25, 4.5, 0.55, 0.2, 2), panelMatM);
      panel.position.set(Math.cos(ang) * 2.05, 0.3, Math.sin(ang) * 2.05);
      panel.rotation.y = -ang + Math.PI / 2;
      mhead.add(panel);
    }
    var dish = new THREE.Mesh(new THREE.SphereGeometry(1.15, 28, 12, 0, Math.PI * 2, 0, Math.PI * 0.3), K.mat.std(0xEDECE8, 0.4, 0, { side: THREE.DoubleSide }));
    dish.rotation.z = Math.PI / 2; dish.position.set(-1.0, 21.5, 0);
    mast.add(dish);
    shadowAll(mast, true, false);
    mergeStatic(mast);
    mast.updateMatrixWorld(true);
    var antPt = mast.localToWorld(new THREE.Vector3(0.9, 27.6, 2.2));

    /* ---------- moving media ---------- */
    // air molecules on a jittered grid (A: mouth → mic, B: speaker → ear)
    var COLS = 24, ROWS = 7, NP = COLS * ROWS;
    var airMat = K.mat.std(dark ? 0xFFFFFF : 0x5E6B86, 0.55);
    var airGeo = new THREE.IcosahedronGeometry(0.24, 1);
    var airA = instMesh(airGeo, airMat, NP);
    var airB = instMesh(airGeo, airMat, NP);
    S.add(airA); S.add(airB);
    var air0 = [];
    (function () {
      var r = K.rng(909);
      for (var i = 0; i < NP; i++) air0.push([(i % COLS + 0.5 + (r() - 0.5) * 0.22) / COLS, (Math.floor(i / COLS) + 0.5 + (r() - 0.5) * 0.3) / ROWS, (r() - 0.5), r() * 6.28]);
    })();
    var mouthA = new THREE.Vector3(-56.2, 9.6, 0.4), micA = new THREE.Vector3(-42.7, 6.6, 0.3);
    var spkB = new THREE.Vector3(42.7, 6.6, 0.3), earB = new THREE.Vector3(56.2, 9.6, 0.4);
    var arcJobs = [];   // radio arcs, drawn in the 2D overlay
    // bits capsule
    var capsule = new THREE.Mesh(new THREE.CapsuleGeometry(1.15, 8.6, 8, 24), new THREE.MeshStandardMaterial({ color: 0xFFFFFF, roughness: 0.1, transparent: true, opacity: 0.0, depthWrite: false }));
    capsule.rotation.z = Math.PI / 2;
    S.add(capsule);
    var BITS = [0, 1, 1, 0, 1, 0, 0, 1];
    var bitOn = instMesh(new THREE.SphereGeometry(0.62, 18, 12), new THREE.MeshBasicMaterial({ color: 0xF6C96E, toneMapped: false }), 8);
    var bitOff = instMesh(new THREE.SphereGeometry(0.62, 18, 12), K.mat.std(0x8E969F, 0.5), 8);
    S.add(bitOn); S.add(bitOff);
    var glow = glowPoints(40, 5.5, {});
    S.add(glow);

    /* ---------- labels ---------- */
    var STG = [
      ['01', 'Ses', 'hava titreşir'],
      ['02', 'Mikrofon', 'basınç → gerilim'],
      ['03', 'Bitler', 'gerilim → 0 ve 1'],
      ['04', 'Wi-Fi', 'radyo dalgası'],
      ['05', 'Fiber optik', 'camda ışık'],
      ['06', 'İnternet omurgası', 'şehirler arası fiber'],
      ['07', 'Baz istasyonu', '5G radyo dalgası'],
      ['08', 'İkinci telefon', 'bit → gerilim'],
      ['09', 'Ses', 'hoparlör havayı titretir']
    ];
    var stageLabs = STG.map(function (s, i) {
      var html = '<div style="text-align:center;line-height:1.3">' +
        '<div style="font:600 13px ' + K.fonts.mono + ';letter-spacing:.08em;color:' + (dark ? P.copperLight : P.copper) + '">' + s[0] + '</div>' +
        '<div style="font-size:14px;font-weight:600;color:' + (dark ? P.onNight : P.ink) + '">' + s[1] + '</div>' +
        '<div style="font-size:12.5px;color:' + (dark ? P.onNight : P.ink2) + '">' + s[2] + '</div></div>';
      return v.label(html, { at: [XS[i], 0, 8], cls: 'note', html: true, valign: 'top', dy: 4 });
    });
    var tagScale = v.label('ölçekli değil · basitleştirilmiş', { at: [-62, 30, 0], cls: 'tag', align: 'left', valign: 'top' });
    var tagFib = v.label('<div style="text-align:center;line-height:1.25">tam yansıma<br><span style="font:500 10px ' + K.fonts.mono + ';letter-spacing:.1em;color:' + (dark ? P.onNightMuted : P.muted) + '">büyütülmüş</span></div>', { at: [0, FY + RJ + 0.3, 0], cls: 'note', html: true, valign: 'bottom', dy: -3 });

    /* ---------- timeline ---------- */
    var W8 = [[0.3, 1.8], [1.8, 2.6], [2.6, 3.5], [3.5, 4.7], [4.7, 6.3], [6.3, 7.5], [7.5, 9.0], [9.0, 9.8], [9.8, 11.3]];
    function stageAt(tt) {
      for (var i = 0; i < W8.length; i++) if (tt < W8[i][1]) return tt >= W8[i][0] ? i : (i > 0 ? i - 1 : -1);
      return 9;
    }
    var vA = new THREE.Vector3(), vB = new THREE.Vector3(), vC = new THREE.Vector3(), vArc = new THREE.Vector3();
    var phATop = new THREE.Vector3(-42, PH_Y + 4.7, 0.3), phBTop = new THREE.Vector3(42, PH_Y + 4.7, 0.3);
    var routerAnt = new THREE.Vector3(-14, 6.8, -1.6);
    var CAP = new THREE.Vector3(-28, 11.4, 0.3);
    var lastT = 0, labState = [];

    function disp(d) { return Math.exp(-d * d / 14) * 0.62 * Math.sin(d * 1.6); }
    function airField(im, from, to, cT, active, dir) {
      var dx = to.x - from.x, dy = to.y - from.y, L = Math.sqrt(dx * dx + dy * dy);
      var ux = dx / L, uy = dy / L, wdt = 3.6;
      im.begin();
      for (var i = 0; i < NP; i++) {
        var a = air0[i];
        var s = a[0];
        var off = (a[1] - 0.5) * wdt, oz = a[2] * 0.9;
        var amp = 0, comp = 0;
        if (active > 0) {
          var d = (s - cT) * L;
          amp = active * disp(d);
          comp = -active * (disp(d + 0.15) - disp(d - 0.15)) / 0.3;   // > 0: squeezed air
        }
        var jit = Math.sin(lastT * 2.3 + a[3]) * 0.04;
        var sx = from.x + ux * (s * L + amp) - uy * off;
        var sy = from.y + uy * (s * L + amp) + ux * off;
        var id = im.put(sx + jit, sy, from.z + oz, 1);
        var g = dark ? clamp(0.25 - comp * 0.2, 0.05, 0.55) : clamp(0.85 - comp * 0.7, 0.4, 1.0);
        im.color(id, g, g * 1.03, g * 1.1);
      }
      im.end();
    }
    function showArcs(from, to, k) { arcJobs.push([from.x, from.y, from.z, to.x, to.y, k]); }
    function drawArcs(c) {
      c.save();
      c.strokeStyle = dark ? P.onNight : P.ink2;
      c.lineWidth = 1.6; c.lineCap = 'round';
      arcJobs.forEach(function (J) {
        var dx = J[3] - J[0], dy = J[4] - J[1], ang = Math.atan2(dy, dx), L = Math.sqrt(dx * dx + dy * dy);
        for (var j = 0; j < 4; j++) {
          var q = J[5] * 1.3 - j * 0.14;
          if (q <= 0 || q >= 1) continue;
          var R = 1.0 + q * L;
          c.globalAlpha = 0.7 * Math.sin(q * Math.PI);
          c.beginPath();
          for (var i = 0; i <= 18; i++) {
            var th = ang - 0.5 + 1.0 * i / 18;
            var pp = v.project(vArc.set(J[0] + Math.cos(th) * R, J[1] + Math.sin(th) * R, J[2]));
            if (i) c.lineTo(pp.x, pp.y); else c.moveTo(pp.x, pp.y);
          }
          c.stroke();
        }
      });
      c.restore();
    }

    function frame(t, dt) {
      lastT = t;
      var tt = K.reducedMotion ? 5.4 : (t % LOOP);
      var st = stageAt(tt);
      arcJobs.length = 0;
      glow.begin();
      var k1 = span(tt, W8[0][0], W8[0][1]), k9 = span(tt, W8[8][0], W8[8][1]);
      airField(airA, mouthA, micA, lerp(-0.12, 1.08, k1), tt >= W8[0][0] - 0.2 && tt < W8[0][1] + 0.3 ? 1 : 0);
      airField(airB, spkB, earB, lerp(-0.12, 1.08, k9), tt >= W8[8][0] - 0.2 && tt < W8[8][1] + 0.3 ? 1 : 0);
      var Pp = null;
      if (st === 1) Pp = vA.copy(micA).lerp(phATop, E.inOut(span(tt, W8[1][0], W8[1][1])));
      else if (st === 2) Pp = vA.copy(phATop).lerp(CAP, E.inOut(span(tt, W8[2][0], W8[2][1])));
      else if (st === 3) {
        var k4 = span(tt, W8[3][0], W8[3][1]);
        Pp = vA.copy(CAP).lerp(routerAnt, E.inOut(k4));
        showArcs(vB.set(-40.8, 12.4, 0.4), routerAnt, k4);
      } else if (st === 4) {
        Pp = zigCurve.getPointAt(span(tt, W8[4][0], W8[4][1]));
      } else if (st === 5) {
        var k6 = span(tt, W8[5][0], W8[5][1]);
        Pp = vA.set(lerp(9.6, 19.6, k6), 1.0 + Math.sin(k6 * Math.PI) * 6.5, 1.6);
      } else if (st === 6) {
        var k7 = span(tt, W8[6][0], W8[6][1]);
        if (k7 < 0.38) { var u7 = E.inOut(k7 / 0.38); Pp = vA.set(lerp(25.6, 28.6, u7), lerp(1.4, 27.4, u7), 0.2); }
        else {
          var kr = (k7 - 0.38) / 0.62;
          Pp = vA.copy(antPt).lerp(phBTop, E.inOut(kr));
          showArcs(antPt, phBTop, kr);
        }
      } else if (st === 7) Pp = vA.copy(phBTop).lerp(spkB, E.inOut(span(tt, W8[7][0], W8[7][1])));
      if (Pp) glow.add1(Pp.x, Pp.y, Pp.z + 0.7, 1.0, 0.82, 0.45, 0.95);
      // fibre hot segment
      if (st === 4) {
        var seg = Math.floor(span(tt, W8[4][0], W8[4][1]) * ZIG_SEG);
        var s0 = Math.max(0, seg - 22);
        zigHot.visible = true;
        zigHot.geometry.setDrawRange(s0 * 48, Math.max(0, seg - s0) * 48);
        zigTube.material.opacity = 0.7;
      } else { zigHot.visible = false; zigTube.material.opacity = 0.45; }
      // bits capsule (3) rides the Wi-Fi wave (4)
      var capA = st === 2 ? span(tt, W8[2][0], W8[2][0] + 0.35) : st === 3 ? 1 - 0.5 * span(tt, W8[3][1] - 0.45, W8[3][1]) : st >= 4 && st <= 8 ? 0.5 : 0;
      if (K.reducedMotion) capA = 1;
      var cx = CAP.x, cy = CAP.y;
      if (st === 3 && Pp) { cx = Pp.x; cy = Pp.y; }
      capsule.position.set(cx, cy, 0.3);
      capsule.material.opacity = 0.26 * capA;
      capsule.visible = capA > 0.01;
      bitOn.begin(); bitOff.begin();
      var nLit = st === 2 ? Math.floor(span(tt, W8[2][0] + 0.15, W8[2][1] - 0.1) * 8.999) + 1 : 8;
      var shrink = st === 3 ? lerp(1, 0.75, span(tt, W8[3][0], W8[3][1])) : st >= 4 && st <= 8 ? 0.75 : 1;
      for (var b = 0; b < 8 && capA > 0.01; b++) {
        var bx = cx + (b - 3.5) * 1.32 * shrink, sc = Math.min(1, capA * 2) * shrink;
        if (BITS[b] && b < nLit) bitOn.put(bx, cy, 0.3, sc); else bitOff.put(bx, cy, 0.3, sc * 0.92);
      }
      bitOn.end(); bitOff.end();
      capsule.scale.setScalar(shrink);
      // router LEDs and rack LEDs
      ledIM.begin();
      for (var li = 0; li < 4; li++) {
        var idx = ledIM.put(-2.3 + li * 0.8, 1.25, 2.79, 1);
        var hot = (st === 3 || st === 4) && li === 1 ? 0.5 + 0.5 * Math.cos(tt * 5) : 0;
        ledIM.color(idx, lerp(0.55, 1.0, hot), lerp(0.62, 0.86, hot), lerp(0.66, 0.5, hot));
      }
      ledIM.end();
      rLedIM.begin();
      var k6c = st === 5 ? span(tt, W8[5][0], W8[5][1]) : -1;
      for (var ri = 0; ri < rackLeds.length; ri++) {
        var L = rackLeds[ri];
        var id = rLedIM.put(L[0], L[1], 2.14, 1);
        var base = 0.3 + 0.12 * Math.abs(Math.sin(ri * 12.9898));
        var wave = k6c >= 0 ? Math.exp(-Math.pow((L[2] + L[3] / 12) / 3 - k6c, 2) / 0.02) : 0;
        rLedIM.color(id, lerp(base, 1.0, wave), lerp(base + 0.08, 0.84, wave), lerp(base + 0.14, 0.5, wave));
      }
      rLedIM.end();
      fixPoints(v, glow);
      glow.end();
      for (var si = 0; si < stageLabs.length; si++) {
        var on = si === st ? 1 : 0;
        if (labState[si] !== on) { labState[si] = on; stageLabs[si].el.style.opacity = on ? '1' : '0.78'; }
      }
      v.render(dt);

      /* 2D overlay: radio arcs, voltage insets and bit digits */
      var c = v.ctx;
      drawArcs(c);
      function inset(pt, label, a, mode) {
        if (a <= 0.01) return;
        var p = v.project(pt);
        var w = 116, h = 46, x = p.x - w / 2, y = p.y - h - 10;
        c.save();
        c.globalAlpha = a;
        c.fillStyle = dark ? 'rgba(14,18,26,.92)' : 'rgba(255,255,255,.95)';
        c.strokeStyle = dark ? P.nightLine : P.line;
        K.rr(c, x, y, w, h, 7); c.fill(); c.stroke();
        K.label(c, label, x + 8, y + 13, { size: 10, mono: true, color: dark ? P.onNightMuted : P.muted, spacing: 0.5 });
        c.strokeStyle = dark ? P.blueLight : P.blue; c.lineWidth = 1.4;
        c.beginPath();
        for (var i = 0; i <= 60; i++) {
          var u = i / 60, xx = x + 8 + u * (w - 16);
          var yy = y + 30 + Math.sin(u * 19 + (mode ? 1.3 : 0)) * 7 * Math.sin(u * Math.PI) * (0.6 + 0.4 * Math.sin(u * 5.3));
          if (i) c.lineTo(xx, yy); else c.moveTo(xx, yy);
        }
        c.stroke();
        c.restore();
      }
      var aMic = st === 1 ? 1 : st === 2 ? 1 - span(tt, W8[2][0], W8[2][0] + 0.4) : 0;
      inset(vC.set(-42, PH_Y + 5.3, 0.3), 'gerilim', K.reducedMotion ? 0 : aMic, 0);
      var aSpk = st === 7 ? 1 : st === 8 ? 1 - span(tt, W8[8][0], W8[8][0] + 0.5) : 0;
      inset(vC.set(42, PH_Y + 5.3, 0.3), 'gerilim', K.reducedMotion ? 0 : aSpk, 1);
      if (capA > 0.01) {
        var pL = v.project(vC.set(cx - 5.4 * shrink, cy, 0.3)), pR = v.project(vC.set(cx + 5.4 * shrink, cy, 0.3));
        var hh2 = Math.abs(v.project(vC.set(cx, cy + 1.25 * shrink, 0.3)).y - pL.y);
        c.save();
        c.globalAlpha = capA * 0.9;
        c.strokeStyle = dark ? 'rgba(238,240,243,.55)' : 'rgba(62,67,77,.55)'; c.lineWidth = 1.2;
        K.rr(c, pL.x, pL.y - hh2, pR.x - pL.x, hh2 * 2, hh2); c.stroke();
        c.restore();
        var pb = v.project(vC.set(cx, cy + 1.75 * shrink, 0.3));
        c.save();
        c.globalAlpha = capA;
        c.font = K.font(13, 500, true); c.textAlign = 'center';
        c.fillStyle = dark ? P.onNight : P.ink;
        var str = '';
        for (var bb = 0; bb < 8; bb++) str += (bb < nLit ? BITS[bb] : '·') + (bb === 3 ? ' ' : '');
        c.fillText(str, pb.x, pb.y - 4);
        c.restore();
      }
    }

    return {
      reset: function () { labState = []; },
      frame: frame,
      dispose: function () { v.dispose(); }
    };
  });

  /* ==================================================================
   * 5) copy-noise · W 1120×380 · light (2D)
   * Analog copies accumulate noise; digital copies are read with a threshold and regenerated.
   * Both rows receive exactly the same noise at every copy step.
   * ================================================================== */
  K.register('copy-noise', function (el, opts) {
    var theme = opts.theme || 'light';
    var dark = theme === 'dark';
    var sf = K.surface(el);
    var C = {
      ink: dark ? P.onNight : P.ink, ink2: dark ? '#C9CFDA' : P.ink2, muted: dark ? P.onNightMuted : P.muted,
      card: dark ? '#161B26' : '#FFFFFF', border: dark ? P.nightLine : P.line, grid: dark ? 'rgba(238,240,243,.06)' : 'rgba(21,23,28,.05)',
      blue: dark ? P.blueLight : P.blue, copper: dark ? P.copperLight : P.copperFill, ghost: dark ? 'rgba(154,163,178,.35)' : 'rgba(184,188,198,.75)',
      noisy: dark ? 'rgba(154,163,178,.75)' : 'rgba(150,156,168,.9)'
    };
    var N = 220, NC = 5;
    var BITS = [0, 1, 1, 0, 1, 0, 0, 1];
    var LOOP = 13.6, STEP = 2.0, T0 = 0.9;

    /* ---------- signals (precomputed, deterministic) ---------- */
    var rng = K.rng(20261027);
    function gauss() { return (rng() + rng() + rng() + rng() - 2) * 0.866; }
    // noise per copy step: slow wander (survives the slight blur, so it piles up) + fine hiss
    var noise = [];
    for (var c = 0; c < NC; c++) {
      var b = new Float32Array(N), comps = [];
      for (var k = 0; k < 6; k++) comps.push([3 + rng() * 11, rng() * 6.283, 0.022 + rng() * 0.026]);
      for (var i = 0; i < N; i++) {
        var xx = i / (N - 1), v0 = 0;
        for (k = 0; k < comps.length; k++) v0 += comps[k][2] * Math.sin(6.283 * comps[k][0] * xx + comps[k][1]);
        b[i] = v0 + gauss() * 0.016;
      }
      noise.push(b);
    }
    function blur(src) {
      var o = new Float32Array(N);
      for (var i = 0; i < N; i++) o[i] = (src[Math.max(0, i - 1)] + 2 * src[i] + src[Math.min(N - 1, i + 1)]) / 4;
      return o;
    }
    var analog = [], digIn = [], digOut = [];
    var a0 = new Float32Array(N);
    for (i = 0; i < N; i++) {
      var x = i / (N - 1);
      a0[i] = 0.5 * Math.sin(Math.PI * 2 * 1.6 * x + 0.3) + 0.24 * Math.sin(Math.PI * 2 * 3.9 * x + 1.1) + 0.11 * Math.sin(Math.PI * 2 * 8.3 * x + 2.2);
    }
    analog.push(a0);
    for (c = 1; c < NC; c++) {
      var p = blur(analog[c - 1]);
      var q = new Float32Array(N);
      for (i = 0; i < N; i++) q[i] = p[i] * 0.95 + noise[c][i];
      analog.push(q);
    }
    var clean = new Float32Array(N);
    for (i = 0; i < N; i++) {
      var bi = Math.min(7, Math.floor(i / N * 8));
      clean[i] = BITS[bi] ? 0.62 : -0.62;
    }
    var soft = blur(blur(blur(clean)));
    digOut.push(clean); digIn.push(clean);
    for (c = 1; c < NC; c++) {
      var r2 = new Float32Array(N);
      for (i = 0; i < N; i++) r2[i] = soft[i] * 0.94 + noise[c][i];
      digIn.push(r2);
      digOut.push(clean);
    }

    /* ---------- layout ---------- */
    var L = {};
    function layout() {
      var W = sf.w, H = sf.h;
      L.left = Math.round(W * 0.135);
      L.right = Math.round(W * 0.152);
      L.gap = Math.round(W * 0.027);
      L.cw = (W - L.left - L.right - L.gap * (NC - 1)) / NC;
      L.top = 40;
      L.rowH = [Math.round(H * 0.33), Math.round(H * 0.4)];
      L.rowY = [L.top + 6, L.top + 6 + L.rowH[0] + Math.round(H * 0.07)];
    }
    layout();
    function cardX(ci) { return L.left + ci * (L.cw + L.gap); }

    function plot(g, arr, x0, y0, w, h, prog, color, width, scaleY, dash) {
      var n = Math.max(2, Math.floor(N * prog));
      g.setLineDash(dash || []);
      g.beginPath();
      for (var i = 0; i < n; i++) {
        var xx = x0 + i / (N - 1) * w, yy = y0 + h / 2 - arr[i] * h * (scaleY || 0.42);
        if (i) g.lineTo(xx, yy); else g.moveTo(xx, yy);
      }
      g.strokeStyle = color; g.lineWidth = width; g.lineJoin = 'round'; g.lineCap = dash ? 'butt' : 'round';
      g.stroke();
      g.setLineDash([]);
    }

    function frame(t, dt) {
      if (sf.w !== L.W || sf.h !== L.H) { layout(); L.W = sf.w; L.H = sf.h; }
      var g = sf.ctx;
      sf.clear();
      var tl = K.reducedMotion ? 11.5 : t % LOOP;
      var fadeOut = 1 - span(tl, LOOP - 0.9, LOOP - 0.2);
      // column headers
      var heads = ['Orijinal', 'Kopya 1', 'Kopya 2', 'Kopya 3', 'Kopya 4'];
      for (var ci = 0; ci < NC; ci++) {
        var st0 = T0 + (ci - 1) * STEP;
        var activeCol = ci === 0 || (tl >= st0 && tl < st0 + STEP && !K.reducedMotion);
        K.label(g, heads[ci], cardX(ci) + L.cw / 2, 26, { size: 12, mono: true, align: 'center', spacing: 0.8, color: activeCol ? C.ink : C.muted, weight: activeCol ? 600 : 500 });
      }
      // row titles
      var titles = [['Analog kopya', 'dalga olduğu gibi kopyalanır'], ['Dijital kopya', 'her bit eşikle yeniden okunur']];
      for (var ri = 0; ri < 2; ri++) {
        var cy = L.rowY[ri] + L.rowH[ri] / 2;
        K.label(g, titles[ri][0], 14, cy - 4, { size: 15, weight: 600, color: C.ink });
        var words = titles[ri][1].split(' '), line = '', ly = cy + 14;
        g.font = K.font(12, 400);
        for (var wi = 0; wi < words.length; wi++) {
          var test = line ? line + ' ' + words[wi] : words[wi];
          if (g.measureText(test).width > L.left - 26 && line) { K.label(g, line, 14, ly, { size: 12, color: C.muted }); line = words[wi]; ly += 15; }
          else line = test;
        }
        K.label(g, line, 14, ly, { size: 12, color: C.muted });
      }
      // cards
      for (ri = 0; ri < 2; ri++) {
        for (ci = 0; ci < NC; ci++) {
          var x0 = cardX(ci), y0 = L.rowY[ri], w = L.cw, h = L.rowH[ri];
          // progress of this copy
          var start = ci === 0 ? 0 : T0 + (ci - 1) * STEP;
          var kArrow = ci === 0 ? 1 : span(tl, start, start + 0.55);
          var kDraw = ci === 0 ? 1 : span(tl, start + 0.35, start + 1.25);
          var vis = (ci === 0 ? 1 : (kDraw > 0 ? 1 : 0)) * (ci === 0 ? 1 : fadeOut);
          g.save();
          g.fillStyle = C.card; g.strokeStyle = C.border; g.lineWidth = 1;
          K.rr(g, x0 + 0.5, y0 + 0.5, w - 1, h - 1, 10); g.fill(); g.stroke();
          g.restore();
          var px = x0 + 10, pw = w - 20, py = y0 + 10, ph = ri ? h - 40 : h - 20;
          // faint midline
          g.strokeStyle = C.grid; g.lineWidth = 1;
          g.beginPath(); g.moveTo(px, py + ph / 2); g.lineTo(px + pw, py + ph / 2); g.stroke();
          if (vis <= 0.001) continue;
          g.save();
          g.globalAlpha = vis;
          if (ri === 0) {
            if (ci > 0) plot(g, analog[0], px, py, pw, ph, 1, C.ghost, 1.3, 0.42, [3, 3]);
            plot(g, analog[ci], px, py, pw, ph, kDraw, C.blue, 2.0);
          } else {
            if (ci === 0) {
              plot(g, digOut[0], px, py, pw, ph, 1, C.copper, 2.2, 0.5);
            } else {
              plot(g, digIn[ci], px, py, pw, ph, kDraw, C.noisy, 1.3, 0.5);
              var kTh = span(tl, start + 1.05, start + 1.35);
              if (kTh > 0) {
                g.save();
                g.globalAlpha *= kTh;
                g.setLineDash([4, 4]); g.strokeStyle = C.ink2; g.lineWidth = 1.1;
                g.beginPath(); g.moveTo(px - 2, py + ph / 2); g.lineTo(px + pw + 2, py + ph / 2); g.stroke();
                g.setLineDash([]);
                g.restore();
              }
              var kRe = span(tl, start + 1.3, start + 1.9);
              if (kRe > 0) plot(g, digOut[ci], px, py, pw, ph, kRe, C.copper, 2.2, 0.5);
              if (kTh > 0) {
                g.save();
                g.globalAlpha *= kTh;
                g.fillStyle = C.card; g.fillRect(px + pw - 38, py + ph / 2 - 19, 39, 15);
                K.label(g, 'eşik', px + pw - 2, py + ph / 2 - 7, { size: 11, mono: true, weight: 500, align: 'right', color: C.ink2, spacing: 0.5 });
                g.restore();
              }
            }
            // bit digits
            var kDig = ci === 0 ? 1 : span(tl, start + 1.3, start + 1.9);
            for (var b = 0; b < 8; b++) {
              if ((b + 0.5) / 8 > kDig + 0.02) continue;
              K.label(g, String(BITS[b]), px + (b + 0.5) / 8 * pw, y0 + h - 11, { size: 12, mono: true, weight: 500, align: 'center', color: C.ink });
            }
          }
          g.restore();
          // copy arrow and "+ gürültü" between cards
          if (ci > 0 && kArrow > 0) {
            var ax0 = x0 - L.gap + 3, ax1 = x0 - 3, ay = y0 + h / 2;
            g.save();
            g.globalAlpha = fadeOut;
            K.arrow(g, ax0, ay, lerp(ax0 + 4, ax1, E.out(kArrow)), ay, { color: C.copper, width: 1.6, head: 6 });
            K.label(g, '+', (ax0 + ax1) / 2, ay - 9, { size: 12, mono: true, weight: 600, align: 'center', color: C.copper, alpha: kArrow });
            g.restore();
          }
        }
      }
      // legend
      (function () {
        var ly = L.rowY[1] + L.rowH[1] + 21, lx = L.left;
        function sw(color, dash, w) {
          g.save(); g.strokeStyle = color; g.lineWidth = w; g.setLineDash(dash || []);
          g.beginPath(); g.moveTo(lx, ly - 4); g.lineTo(lx + 18, ly - 4); g.stroke(); g.restore();
          lx += 24;
        }
        function tx(str) { K.label(g, str, lx, ly, { size: 12, color: C.muted }); g.font = K.font(12, 400); lx += g.measureText(str).width + 20; }
        K.label(g, '+', lx + 4, ly, { size: 12, mono: true, color: C.copper, weight: 600 }); lx += 18;
        tx('her kopyada iki satıra da aynı gürültü eklenir');
        sw(C.ghost, [3, 3], 1.3); tx('orijinal (karşılaştırma için)');
        sw(C.noisy, null, 1.3); tx('gelen gürültülü sinyal');
        sw(C.ink2, [4, 4], 1.1); tx('eşik');
        sw(C.copper, null, 2.2); tx('yeniden üretilen bitler');
      })();
      // verdicts
      var vk = K.reducedMotion ? 1 : span(tl, T0 + 3 * STEP + 1.9, T0 + 3 * STEP + 2.6) * fadeOut;
      var vx = cardX(NC - 1) + L.cw + 16;
      if (vk > 0) {
        g.save();
        g.globalAlpha = vk;
        var y1 = L.rowY[0] + L.rowH[0] / 2;
        K.label(g, 'bozulma', vx, y1 - 3, { size: 14, weight: 600, color: C.ink });
        K.label(g, 'birikir', vx, y1 + 15, { size: 14, weight: 600, color: C.ink });
        var y2 = L.rowY[1] + L.rowH[1] / 2 - 8;
        K.label(g, 'her kopyada', vx, y2 - 3, { size: 14, weight: 600, color: C.ink });
        K.label(g, 'yeniden', vx, y2 + 15, { size: 14, weight: 600, color: C.ink });
        K.label(g, 'üretilir', vx, y2 + 33, { size: 14, weight: 600, color: C.ink });
        g.fillStyle = C.blue; g.fillRect(vx - 9, y1 - 15, 3, 34);
        g.fillStyle = C.copper; g.fillRect(vx - 9, y2 - 15, 3, 52);
        g.restore();
      }
    }

    return {
      reset: function () { },
      frame: frame,
      resize: function () { layout(); },
      dispose: function () { sf.dispose(); }
    };
  });

  /* ==================================================================
   * 6) geo-orbit · F 1280×720 · dark
   * Earth (textured from window.KG_TEX when present), the geostationary orbit to scale
   * (6,62 × Earth radius), a satellite co-rotating above 42° E and a signal pulse
   * Ankara → satellite → Europe.
   * ================================================================== */
  K.register('geo-orbit', function (el, opts) {
    var THREE = TH();
    var R = 1, RG = 6.62, DEG = Math.PI / 180;
    var EARTH_X = 930 / 1280, EARTH_Y = 360 / 720;
    var v = K.stage3d(el, {
      theme: 'dark', fov: 12, distance: 72, yaw: 0, pitch: 0.76, target: [0, 0, 0], near: 1, far: 4000,
      size: 8, shadows: false, minPitch: 0.3, maxPitch: 1.4, minDistance: 52, maxDistance: 110
    });
    var S = v.scene;
    var SUN = new THREE.Vector3(-0.62, 0.3, 0.72).normalize();
    if (v.lights) {
      v.lights.key.position.copy(SUN).multiplyScalar(50); v.lights.key.intensity = 1.6;
      v.lights.hemi.intensity = 0.12; v.lights.fill.intensity = 0.08; v.lights.rim.intensity = 0.25;
    }
    function frameView() {
      var W = Math.max(1, v.sf.w), H = Math.max(1, v.sf.h);
      v.camera.setViewOffset(W, H, -(EARTH_X * W - W / 2), -(EARTH_Y * H - H / 2), W, H);
    }
    frameView();

    /* ---------- textures ---------- */
    var TEX = window.KG_TEX || null;
    function imgTex(uri) {
      var tx = new THREE.Texture();
      var img = new Image();
      img.onload = function () { tx.image = img; tx.needsUpdate = true; };
      img.src = uri;
      tx.anisotropy = 8;
      return tx;
    }
    var dayTex, nightTex, specTex, cloudTex, hasTex = !!(TEX && TEX.day);
    if (hasTex) {
      dayTex = imgTex(TEX.day);
      nightTex = TEX.lights ? imgTex(TEX.lights) : null;
      specTex = TEX.spec ? imgTex(TEX.spec) : null;
      cloudTex = TEX.clouds ? imgTex(TEX.clouds) : null;
    } else {
      // tasteful procedural globe: deep ocean with a fine graticule (no invented coastlines)
      var gt = canvasTex(1024, 512), g = gt.ctx;
      var gr = g.createLinearGradient(0, 0, 0, 512);
      gr.addColorStop(0, '#1A3157'); gr.addColorStop(0.5, '#24497A'); gr.addColorStop(1, '#1A3157');
      g.fillStyle = gr; g.fillRect(0, 0, 1024, 512);
      g.strokeStyle = 'rgba(200,220,255,0.16)'; g.lineWidth = 1.2;
      for (var lo = 0; lo <= 360; lo += 15) { var x = lo / 360 * 1024; g.beginPath(); g.moveTo(x, 0); g.lineTo(x, 512); g.stroke(); }
      for (var la = -75; la <= 75; la += 15) { var y = (90 - la) / 180 * 512; g.beginPath(); g.moveTo(0, y); g.lineTo(1024, y); g.stroke(); }
      g.strokeStyle = 'rgba(200,220,255,0.32)'; g.lineWidth = 2;
      g.beginPath(); g.moveTo(0, 256); g.lineTo(1024, 256); g.stroke();
      gt.tex.encoding = THREE.LinearEncoding;
      dayTex = gt.tex;
    }
    var blank = new THREE.DataTexture(new Uint8Array([0, 0, 0, 255]), 1, 1);
    blank.needsUpdate = true;

    /* ---------- Earth ---------- */
    var earthG = new THREE.Group();
    S.add(earthG);
    var earthMat = new THREE.ShaderMaterial({
      uniforms: {
        dayTex: { value: dayTex }, nightTex: { value: nightTex || blank }, specTex: { value: specTex || blank },
        sunDir: { value: SUN.clone() }, sunDirView: { value: new THREE.Vector3() },
        hasLights: { value: nightTex ? 1 : 0 }, hasSpec: { value: specTex ? 1 : 0 }
      },
      vertexShader: [
        'varying vec2 vUv; varying vec3 vWN; varying vec3 vN; varying vec3 vV;',
        'void main(){',
        '  vUv = uv;',
        '  vWN = normalize(mat3(modelMatrix) * normal);',
        '  vN = normalize(normalMatrix * normal);',
        '  vec4 mv = modelViewMatrix * vec4(position, 1.0);',
        '  vV = normalize(-mv.xyz);',
        '  gl_Position = projectionMatrix * mv;',
        '}'
      ].join('\n'),
      fragmentShader: [
        'uniform sampler2D dayTex; uniform sampler2D nightTex; uniform sampler2D specTex;',
        'uniform vec3 sunDir; uniform vec3 sunDirView; uniform float hasLights; uniform float hasSpec;',
        'varying vec2 vUv; varying vec3 vWN; varying vec3 vN; varying vec3 vV;',
        'vec3 toLin(vec3 c){ return pow(c, vec3(2.2)); }',
        'void main(){',
        '  vec3 N = normalize(vWN);',
        '  float ndl = dot(N, normalize(sunDir));',
        '  float day = smoothstep(-0.1, 0.22, ndl);',
        '  vec3 dayC = toLin(texture2D(dayTex, vUv).rgb);',
        '  vec3 col = dayC * (max(ndl, 0.0) * 1.55 + 0.035);',
        '  vec3 Nv = normalize(vN); vec3 Vv = normalize(vV);',
        '  vec3 H = normalize(normalize(sunDirView) + Vv);',
        '  float sm = hasSpec > 0.5 ? texture2D(specTex, vUv).r : 0.35;',
        '  col += vec3(1.0, 0.93, 0.8) * pow(max(dot(Nv, H), 0.0), 70.0) * sm * 0.2 * day;',
        '  float L = hasLights > 0.5 ? texture2D(nightTex, vUv).r : 0.0;',
        '  vec3 night = vec3(1.0, 0.72, 0.38) * pow(L, 1.5) * 1.15 + dayC * 0.012;',
        '  col = mix(night, col, day);',
        '  float fres = pow(1.0 - max(dot(Nv, Vv), 0.0), 2.6);',
        '  col += vec3(0.32, 0.55, 1.0) * fres * (0.12 + 0.8 * smoothstep(-0.25, 0.5, ndl)) * 0.55;',
        '  gl_FragColor = vec4(col, 1.0);',
        '  #include <tonemapping_fragment>',
        '  #include <encodings_fragment>',
        '}'
      ].join('\n')
    });
    var earth = new THREE.Mesh(new THREE.SphereGeometry(R, 128, 96), earthMat);
    earthG.add(earth);
    var clouds = null;
    if (cloudTex) {
      var cloudMat = new THREE.ShaderMaterial({
        uniforms: { cloudTex: { value: cloudTex }, sunDir: { value: SUN.clone() } },
        vertexShader: 'varying vec2 vUv; varying vec3 vWN; void main(){ vUv = uv; vWN = normalize(mat3(modelMatrix) * normal); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
        fragmentShader: [
          'uniform sampler2D cloudTex; uniform vec3 sunDir; varying vec2 vUv; varying vec3 vWN;',
          'void main(){',
          '  float c = texture2D(cloudTex, vUv).r;',
          '  float ndl = dot(normalize(vWN), normalize(sunDir));',
          '  float day = smoothstep(-0.12, 0.25, ndl);',
          '  vec3 col = vec3(1.0) * (max(ndl, 0.0) * 1.05 + 0.04);',
          '  gl_FragColor = vec4(col, c * 0.78 * (0.12 + 0.88 * day));',
          '  #include <tonemapping_fragment>',
          '  #include <encodings_fragment>',
          '}'
        ].join('\n'),
        transparent: true, depthWrite: false
      });
      clouds = new THREE.Mesh(new THREE.SphereGeometry(R * 1.006, 96, 64), cloudMat);
      earthG.add(clouds);
    }
    var atmMat = new THREE.ShaderMaterial({
      uniforms: { sunDir: { value: SUN.clone() } },
      vertexShader: 'varying vec3 vN; varying vec3 vV; varying vec3 vWN; void main(){ vN = normalize(normalMatrix * normal); vWN = normalize(mat3(modelMatrix) * normal); vec4 mv = modelViewMatrix * vec4(position, 1.0); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }',
      fragmentShader: [
        'uniform vec3 sunDir; varying vec3 vN; varying vec3 vV; varying vec3 vWN;',
        'void main(){',
        '  float x = clamp(-dot(normalize(vN), normalize(vV)), 0.0, 1.0);',
        '  float a = pow(clamp(x * 2.6, 0.0, 1.0), 1.7) * (1.0 - smoothstep(0.42, 0.62, x));',
        '  float lit = 0.18 + 0.82 * smoothstep(-0.35, 0.55, dot(normalize(vWN), normalize(sunDir)));',
        '  gl_FragColor = vec4(vec3(0.42, 0.64, 1.0), clamp(a * lit * 0.95, 0.0, 1.0));',
        '}'
      ].join('\n'),
      side: THREE.BackSide, transparent: true, depthWrite: false
    });
    var atm = new THREE.Mesh(new THREE.SphereGeometry(R * 1.1, 96, 64), atmMat);
    S.add(atm);

    function geoPos(latDeg, lonDeg, r) {
      var la = latDeg * DEG, lo = lonDeg * DEG;
      return new THREE.Vector3(Math.cos(la) * Math.cos(lo) * r, Math.sin(la) * r, -Math.cos(la) * Math.sin(lo) * r);
    }

    /* ---------- orbit (to scale) ---------- */
    var orbit = new THREE.Mesh(new THREE.TorusGeometry(RG, 0.02, 6, 360), new THREE.MeshBasicMaterial({ color: 0x8EA6F2, transparent: true, opacity: 0.5, depthWrite: false }));
    orbit.rotation.x = Math.PI / 2;
    S.add(orbit);

    /* ---------- satellite (enlarged), child of the rotating Earth group ---------- */
    var SAT_LON = 42;
    var satPosL = geoPos(0, SAT_LON, RG);
    var sat = new THREE.Group();
    sat.position.copy(satPosL);
    sat.rotation.y = Math.atan2(-Math.cos(SAT_LON * DEG), Math.sin(SAT_LON * DEG));   // +z → nadir
    sat.scale.setScalar(1.6);
    earthG.add(sat);
    var foil = canvasTex(256, 256);
    (function () {
      var gg = foil.ctx, r = K.rng(31);
      gg.fillStyle = '#C99A3E'; gg.fillRect(0, 0, 256, 256);
      for (var i = 0; i < 140; i++) {
        var x0 = r() * 256, y0 = r() * 256, w0 = 10 + r() * 50, h0 = 6 + r() * 26;
        var gr2 = gg.createLinearGradient(x0, y0, x0 + w0, y0 + h0);
        gr2.addColorStop(0, 'rgba(255,226,150,' + (0.15 + r() * 0.35) + ')');
        gr2.addColorStop(1, 'rgba(120,80,20,' + (0.1 + r() * 0.3) + ')');
        gg.fillStyle = gr2;
        gg.beginPath(); gg.moveTo(x0, y0); gg.lineTo(x0 + w0, y0 + r() * h0); gg.lineTo(x0 + w0 * r(), y0 + h0); gg.closePath(); gg.fill();
      }
    })();
    var busMat = new THREE.MeshStandardMaterial({ color: 0xFFFFFF, map: foil.tex, metalness: 1, roughness: 0.32 });
    var bus = new THREE.Mesh(rbox(0.12, 0.12, 0.15, 0.012, 2), busMat);
    sat.add(bus);
    var white = K.mat.std(0xF2F1EC, 0.4, 0.05);
    var dishPts = [];
    for (var di = 0; di <= 12; di++) { var rr0 = di / 12 * 0.075; dishPts.push(new THREE.Vector2(rr0, rr0 * rr0 * 4.2)); }
    var dish = new THREE.Mesh(new THREE.LatheGeometry(dishPts, 32), new THREE.MeshStandardMaterial({ color: 0xF4F3EF, roughness: 0.45, side: THREE.DoubleSide }));
    dish.rotation.x = Math.PI / 2;             // opens toward +z (Earth)
    dish.position.set(0.0, 0.02, 0.078);
    sat.add(dish);
    var feed = new THREE.Mesh(new THREE.ConeGeometry(0.012, 0.05, 12), white);
    feed.rotation.x = -Math.PI / 2; feed.position.set(0, 0.02, 0.14);
    sat.add(feed);
    var dish2 = new THREE.Mesh(new THREE.LatheGeometry(dishPts.map(function (p) { return new THREE.Vector2(p.x * 0.55, p.y * 0.55); }), 24), new THREE.MeshStandardMaterial({ color: 0xF4F3EF, roughness: 0.45, side: THREE.DoubleSide }));
    dish2.rotation.order = 'YXZ'; dish2.rotation.set(Math.PI / 2, 0.5, 0); dish2.position.set(0.05, -0.04, 0.077);
    sat.add(dish2);
    var cellTex = canvasTex(128, 512);
    (function () {
      var gg = cellTex.ctx;
      gg.fillStyle = '#1A2238'; gg.fillRect(0, 0, 128, 512);
      gg.strokeStyle = 'rgba(170,185,215,0.55)'; gg.lineWidth = 1.5;
      for (var x = 0; x <= 128; x += 32) { gg.beginPath(); gg.moveTo(x, 0); gg.lineTo(x, 512); gg.stroke(); }
      for (var y = 0; y <= 512; y += 32) { gg.beginPath(); gg.moveTo(0, y); gg.lineTo(128, y); gg.stroke(); }
      gg.strokeStyle = 'rgba(210,215,225,0.9)'; gg.lineWidth = 5; gg.strokeRect(2, 2, 124, 508);
    })();
    var panelMat = new THREE.MeshStandardMaterial({ map: cellTex.tex, metalness: 0.45, roughness: 0.32 });
    var wings = [];
    [1, -1].forEach(function (sg) {
      var w = new THREE.Group();
      w.position.y = sg * 0.06;
      var yoke = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.07, 6), K.mat.std(0xC9CCD1, 0.35, 1));
      yoke.position.y = sg * 0.035; w.add(yoke);
      var pnl = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.4, 0.005), panelMat);
      pnl.position.y = sg * (0.07 + 0.2);
      w.add(pnl);
      sat.add(w);
      wings.push(w);
    });

    /* ---------- ground points and signal path (Earth-local, co-rotating) ---------- */
    var ANK = geoPos(39.9, 32.8, R * 1.003), EUR = geoPos(52.5, 13.4, R * 1.003);
    var SUBSAT = geoPos(0, SAT_LON, R * 1.002);
    var NPATH = 120;
    var pathGeo = new THREE.BufferGeometry();
    var pathPos = new Float32Array(NPATH * 2 * 3), pathCol = new Float32Array(NPATH * 2 * 4);
    var satTip = satPosL.clone();
    for (var pi = 0; pi < NPATH; pi++) {
      var u = pi / (NPATH - 1);
      var a1 = new THREE.Vector3().lerpVectors(ANK, satTip, u), b1 = new THREE.Vector3().lerpVectors(satTip, EUR, u);
      pathPos.set([a1.x, a1.y, a1.z], pi * 3);
      pathPos.set([b1.x, b1.y, b1.z], (NPATH + pi) * 3);
    }
    pathGeo.setAttribute('position', new THREE.BufferAttribute(pathPos, 3));
    pathGeo.setAttribute('color', new THREE.BufferAttribute(pathCol, 4).setUsage(THREE.DynamicDrawUsage));
    var pathLine = new THREE.Line(pathGeo, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, depthWrite: false }));
    earthG.add(pathLine);
    var radGeo = new THREE.BufferGeometry().setFromPoints([SUBSAT, satTip.clone().multiplyScalar(0.985)]);
    var radial = new THREE.Line(radGeo, new THREE.LineDashedMaterial({ color: 0x9AA3B2, dashSize: 0.12, gapSize: 0.1, transparent: true, opacity: 0.6 }));
    radial.computeLineDistances();
    earthG.add(radial);
    var pts = glowPoints(8, 0.42, { additive: true, hard: true });
    S.add(pts);
    var pulse = glowPoints(4, 0.75, { additive: true });
    S.add(pulse);

    /* ---------- stars ---------- */
    var stars = glowPoints(1800, 1.15, { additive: true, hard: true, renderOrder: 0 });
    var stars2 = glowPoints(260, 2.1, { additive: true, hard: true, renderOrder: 0 });
    S.add(stars); S.add(stars2);
    (function () {
      var r = K.rng(1971);
      v.applyView(); frameView(); v.camera.updateMatrixWorld(true);
      var fwd = new THREE.Vector3(); v.camera.getWorldDirection(fwd);
      var up = new THREE.Vector3(0, 1, 0), right = new THREE.Vector3().crossVectors(fwd, up).normalize();
      up.crossVectors(right, fwd).normalize();
      var tmpV = new THREE.Vector3();
      stars.begin(); stars2.begin();
      for (var i = 0; i < 4200; i++) {
        var ax = (r() - 0.5) * 0.9, ay = (r() - 0.5) * 0.62;
        tmpV.copy(fwd).addScaledVector(right, ax).addScaledVector(up, ay).normalize().multiplyScalar(1500).add(v.camera.position);
        var pp = v.project(tmpV);
        if (pp.x < 640 / 1280 * v.w && r() < 0.88) continue;
        var bright = Math.pow(r(), 3);
        var tint = r();
        var cr = tint < 0.2 ? 1.0 : 0.85, cg = 0.9, cb = tint > 0.7 ? 1.0 : 0.88;
        if (bright > 0.55) stars2.add1(tmpV.x, tmpV.y, tmpV.z, cr, cg, cb, 0.55 + bright * 0.4);
        else stars.add1(tmpV.x, tmpV.y, tmpV.z, cr, cg, cb, 0.18 + bright * 0.75);
      }
      stars.end(); stars2.end();
    })();

    /* ---------- labels ---------- */
    var wSat = new THREE.Vector3(), wAnk = new THREE.Vector3(), wEur = new THREE.Vector3(), wMid = new THREE.Vector3(), tmp = new THREE.Vector3();
    var labSat = v.label('uydu · 42° Doğu', { at: function () { return wSat; }, cls: 'name', dx: 0, dy: -60, align: 'center', valign: 'bottom' });
    var labSatN = v.label('<div style="text-align:inherit">35.786 km yükseklikte<br>Dünya ile birlikte döner</div>', { at: function () { return wSat; }, cls: 'note', html: true, dx: 24, dy: -28, align: 'left', valign: 'top' });
    var labTR = v.label('Türkiye', { at: function () { return wAnk; }, cls: 'note', dx: -112, dy: 24, line: true, align: 'right', valign: 'middle' });
    var labEU = v.label('Avrupa', { at: function () { return wEur; }, cls: 'note', dx: -112, dy: -34, line: true, align: 'right', valign: 'middle' });
    var orbitLabPt = new THREE.Vector3();
    var labOrbit = v.label('yer durağan yörünge', { at: function () { return orbitLabPt; }, cls: 'tag', dx: 0, dy: -26, valign: 'bottom' });

    var ROT = 24, THETA0 = (-58 - SAT_LON) * DEG, PULSE_EVERY = 8;
    var lastT = 0;
    function frame(t, dt) {
      lastT = t;
      frameView();
      var tt = K.reducedMotion ? 0 : t;
      var th = THETA0 + tt / ROT * Math.PI * 2;
      earthG.rotation.y = th;
      if (clouds) clouds.rotation.y = tt * 0.004;
      earthG.updateMatrixWorld(true);
      // sun direction in view space for the specular term
      v.applyView(); v.camera.updateMatrixWorld(true);
      earthMat.uniforms.sunDirView.value.copy(SUN).transformDirection(v.camera.matrixWorldInverse);
      // wings track the sun (rotate about the satellite's north-south axis)
      var q = new THREE.Quaternion();
      sat.getWorldQuaternion(q);
      tmp.copy(SUN).applyQuaternion(q.invert());
      var wa = Math.atan2(tmp.x, tmp.z);
      wings.forEach(function (w) { w.rotation.y = wa; });
      // world anchors
      sat.getWorldPosition(wSat);
      earthG.localToWorld(wAnk.copy(ANK));
      earthG.localToWorld(wEur.copy(EUR));
      earthG.localToWorld(wMid.copy(SUBSAT).lerp(satPosL, 0.5));
      // ground markers (fade on the far side)
      var camDir = tmp.copy(v.camera.position).normalize();
      var visA = clamp((wAnk.clone().normalize().dot(camDir) - 0.05) * 6, 0, 1);
      var visE = clamp((wEur.clone().normalize().dot(camDir) - 0.05) * 6, 0, 1);
      pts.begin();
      pts.add1(wAnk.x, wAnk.y, wAnk.z, 1.0, 0.62, 0.36, 0.95 * visA);
      pts.add1(wEur.x, wEur.y, wEur.z, 1.0, 0.8, 0.55, 0.75 * visE);
      pts.end();
      labTR.show(visA > 0.5); labEU.show(visE > 0.5);
      // pulse: up-link 1,2 s, down-link 1,2 s (10 × slowed), then hold
      var pc = K.reducedMotion ? 3.0 : (tt % PULSE_EVERY);
      var up = span(pc, 0.4, 1.6), down = span(pc, 1.6, 2.8);
      var fadeP = 1 - span(pc, 5.2, 6.4);
      var head = pc < 1.6 ? up * 0.5 : 0.5 + down * 0.5;
      for (var i = 0; i < NPATH * 2; i++) {
        var f = i / (NPATH * 2 - 1);
        var lit = f <= head ? 1 : 0;
        var hot = lit ? Math.exp(-(head - f) * 18) : 0;
        pathCol[i * 4] = lerp(0.55, 1.0, lit); pathCol[i * 4 + 1] = lerp(0.62, 0.86, lit); pathCol[i * 4 + 2] = lerp(0.72, 0.55, lit);
        pathCol[i * 4 + 3] = (pc < 0.4 ? 0.12 : (lit ? (0.35 + 0.65 * hot) * fadeP + 0.12 * (1 - fadeP) : 0.12));
      }
      pathGeo.attributes.color.needsUpdate = true;
      pulse.begin();
      if (pc >= 0.4 && pc < 2.8) {
        var pl = head < 0.5 ? tmp.lerpVectors(ANK, satTip, head * 2) : tmp.lerpVectors(satTip, EUR, (head - 0.5) * 2);
        earthG.localToWorld(pl);
        pulse.add1(pl.x, pl.y, pl.z, 1.0, 0.86, 0.58, 1.0);
      }
      pulse.end();
      [pts, pulse, stars, stars2].forEach(function (p) { fixPoints(v, p); });
      // satellite label: on the outward side of the orbit, kept inside the frame
      var sp = v.project(wSat), ec = v.project(tmp.set(0, 0, 0));
      var wl = Math.max(labSat.el.offsetWidth, labSatN.el.offsetWidth) || 170;
      var nH = labSat.el.offsetHeight || 17, tH = labSatN.el.offsetHeight || 32, bh = nH + tH + 2;
      var ox = sp.x - ec.x, oy = sp.y - ec.y, ol = Math.sqrt(ox * ox + oy * oy) || 1;
      ox /= ol; oy /= ol;
      var zones = [[v.w - 480, 28, 480, 140], [v.w - 460, v.h - 180, 460, 140], [ec.x - 70, ec.y - 70, 140, 140]];
      function cost(r) {
        var c0 = 0;
        c0 += Math.max(0, 16 - r[0]) + Math.max(0, r[0] + r[2] - (v.w - 80)) + Math.max(0, 12 - r[1]) + Math.max(0, r[1] + r[3] - (v.h - 12));
        zones.forEach(function (z) {
          var ix = Math.max(0, Math.min(r[0] + r[2], z[0] + z[2]) - Math.max(r[0], z[0]));
          var iy = Math.max(0, Math.min(r[1] + r[3], z[1] + z[3]) - Math.max(r[1], z[1]));
          c0 += ix * iy * 0.5;
        });
        return c0;
      }
      var best = null;
      [[-oy, ox], [oy, -ox], [0, -1], [-1, 0], [1, 0], [0, 1]].forEach(function (pp) {
        var rect, mode;
        if (Math.abs(pp[0]) >= Math.abs(pp[1])) {
          var x0 = pp[0] > 0 ? sp.x + 40 : sp.x - 40 - wl;
          rect = [x0, sp.y - bh / 2, wl, bh]; mode = pp[0] > 0 ? 'R' : 'L';
        } else {
          var cxl = clamp(sp.x, 18 + wl / 2, v.w - 18 - wl / 2);
          rect = [cxl - wl / 2, pp[1] > 0 ? sp.y + 46 : sp.y - 46 - bh, wl, bh]; mode = pp[1] > 0 ? 'D' : 'U';
        }
        var cc = cost(rect);
        if (!best || cc < best.c) best = { c: cc, r: rect, m: mode };
      });
      var r0 = best.r;
      if (best.m === 'R' || best.m === 'L') {
        labSat.align = labSatN.align = best.m === 'R' ? 'left' : 'right';
        styleIf(labSatN, 'textAlign', labSat.align); styleIf(labSat, 'textAlign', labSat.align);
        labSat.dx = labSatN.dx = (best.m === 'R' ? r0[0] : r0[0] + wl) - sp.x;
        labSat.valign = 'bottom'; labSat.dy = r0[1] + nH - sp.y;
        labSatN.valign = 'top'; labSatN.dy = r0[1] + nH + 2 - sp.y;
      } else {
        labSat.align = labSatN.align = 'center';
        styleIf(labSatN, 'textAlign', 'center'); styleIf(labSat, 'textAlign', 'center');
        labSat.dx = labSatN.dx = r0[0] + wl / 2 - sp.x;
        labSat.valign = 'bottom'; labSat.dy = r0[1] + nH - sp.y;
        labSatN.valign = 'top'; labSatN.dy = r0[1] + nH + 2 - sp.y;
      }
      // orbit label at the far-left of the ellipse
      orbitLabPt.set(-RG * 0.72, 0, -RG * 0.69);
      v.render(dt);

      /* 2D overlay: formula, live timer, tags */
      var c = v.ctx, W = v.w, H = v.h;
      /* kept clear of the deck's footer band (y > 630) and top bar (y < 90) */
      var bx = W - 40, by = H - 140;
      var realT = pc < 0.4 ? 0 : Math.min(0.24, (pc - 0.4) / 10);
      K.label(c, '35.786 km × 2 ÷ 300.000 km/s ≈ 0,24 s', bx, by, { size: 17, weight: 500, mono: true, align: 'right', color: P.onNight });
      K.label(c, 'en kısa yol: uyduya çıkış + iniş süresi', bx, by - 26, { size: 13, align: 'right', color: P.onNightMuted });
      var timer = 'şu an: ' + K.num(realT, 2) + ' s';
      K.label(c, timer, bx, by + 26, { size: 13, mono: true, align: 'right', color: pc >= 0.4 && pc < 2.8 ? P.lamp : P.onNightMuted });
      K.label(c, 'sinyal 10 kat yavaşlatıldı', bx, by + 46, { size: 11, mono: true, align: 'right', spacing: 1, color: P.onNightMuted });
      K.label(c, 'ölçekli: yörünge yarıçapı, Dünya yarıçapının 6,6 katı', bx, 106, { size: 13, mono: true, align: 'right', spacing: 0.5, color: P.onNight });
      K.label(c, 'hızlandırılmış: gerçekte 24 saatte bir tur', bx, 128, { size: 13, mono: true, align: 'right', spacing: 0.5, color: P.onNight });
      K.label(c, 'uydu büyütülerek çizildi', bx, 150, { size: 13, mono: true, align: 'right', spacing: 0.5, color: P.onNight });
    }

    return {
      reset: function () { },
      frame: frame,
      dispose: function () { v.dispose(); }
    };
  });

  /* ==================================================================
   * 7) algo-lamp · S 680×520 · light, own frame
   * A street at dusk: lamp with an LDR on its head and a PIR motion sensor. A tiny program
   * runs line by line (0,6 s per line): the lamp lights only when dark AND motion.
   * ================================================================== */
  K.register('algo-lamp', function (el, opts) {
    var THREE = TH();
    el.style.borderRadius = '14px';
    el.style.overflow = 'hidden';
    var v = K.stage3d(el, {
      theme: 'light', fov: 30, distance: 14.2, yaw: -0.3, pitch: 0.075, target: [-0.9, 2.7, 0.6], near: 0.3, far: 400,
      size: 7, env: false, minYaw: -1.0, maxYaw: 0.4, minPitch: 0.02, maxPitch: 0.6, minDistance: 9, maxDistance: 22
    });
    var S = v.scene;
    var L0 = v.lights;
    S.fog = new THREE.Fog(0xDCE6EE, 30, 120);
    var CYCLE = 16, LINE_T = 0.4, DARK_LX = 20, LAMP_X = 0;

    /* ---------- ground: road, curb, sidewalk, verge ---------- */
    var groundTex = canvasTex(1024, 1024);
    (function () {
      var g = groundTex.ctx, r = K.rng(5);
      g.fillStyle = '#7F8A72'; g.fillRect(0, 0, 1024, 1024);
      for (var i = 0; i < 2600; i++) { g.fillStyle = 'rgba(' + (60 + r() * 40 | 0) + ',' + (80 + r() * 40 | 0) + ',' + (50 + r() * 30 | 0) + ',0.25)'; g.fillRect(r() * 1024, r() * 1024, 2, 2); }
    })();
    groundTex.tex.wrapS = groundTex.tex.wrapT = THREE.RepeatWrapping;
    groundTex.tex.repeat.set(20, 20);
    var ground = new THREE.Mesh(new THREE.PlaneGeometry(300, 300), new THREE.MeshStandardMaterial({ map: groundTex.tex, roughness: 0.95 }));
    ground.rotation.x = -Math.PI / 2; ground.position.y = -0.02; ground.receiveShadow = true;
    S.add(ground);
    var road = new THREE.Mesh(new THREE.PlaneGeometry(300, 7), K.mat.std(0x41454C, 0.9));
    road.rotation.x = -Math.PI / 2; road.position.set(0, 0.0, 6.0); road.receiveShadow = true;
    S.add(road);
    var dashIM = instMesh(new THREE.PlaneGeometry(1.6, 0.12), K.mat.std(0xE9E7DF, 0.7), 60);
    dashIM.begin();
    var qFlat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI / 2);
    for (var di = 0; di < 60; di++) dashIM.put(-90 + di * 3.2, 0.01, 6.0, 1, 1, 1, qFlat);
    dashIM.end();
    dashIM.receiveShadow = true;
    S.add(dashIM);
    var walkTex = canvasTex(512, 256);
    (function () {
      var g = walkTex.ctx, r = K.rng(8);
      g.fillStyle = '#C9C5BB'; g.fillRect(0, 0, 512, 256);
      for (var i = 0; i < 1800; i++) { var c = 170 + r() * 50 | 0; g.fillStyle = 'rgba(' + c + ',' + (c - 4) + ',' + (c - 12) + ',0.18)'; g.fillRect(r() * 512, r() * 256, 2, 2); }
      g.strokeStyle = 'rgba(110,105,96,0.45)'; g.lineWidth = 3;
      for (var x = 0; x <= 512; x += 128) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, 256); g.stroke(); }
      g.beginPath(); g.moveTo(0, 128); g.lineTo(512, 128); g.stroke();
    })();
    walkTex.tex.wrapS = walkTex.tex.wrapT = THREE.RepeatWrapping;
    walkTex.tex.repeat.set(75, 1);
    var walk = new THREE.Mesh(new THREE.BoxGeometry(300, 0.14, 2.6), [K.mat.std(0xC2BEB4, 0.85), K.mat.std(0xC2BEB4, 0.85), new THREE.MeshStandardMaterial({ map: walkTex.tex, roughness: 0.85 }), K.mat.std(0xC2BEB4, 0.85), K.mat.std(0xC2BEB4, 0.85), K.mat.std(0xC2BEB4, 0.85)]);
    walk.position.set(0, 0.07, 1.2); walk.receiveShadow = true;
    S.add(walk);
    var curb = new THREE.Mesh(new THREE.BoxGeometry(300, 0.2, 0.22), K.mat.std(0xD6D3CB, 0.75));
    curb.position.set(0, 0.1, 2.55); curb.receiveShadow = true; curb.castShadow = false;
    S.add(curb);

    /* ---------- houses and trees (calm low-poly) ---------- */
    var town = new THREE.Group();
    S.add(town);
    var winMat = new THREE.MeshStandardMaterial({ color: 0x2C333D, roughness: 0.3, emissive: 0xFFC779, emissiveIntensity: 0 });
    var winDark = K.mat.std(0x2C333D, 0.3);
    function house(x, z, w, h, d, col, roofCol, lit) {
      var g = new THREE.Group();
      var body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), K.mat.std(col, 0.85));
      body.position.y = h / 2; body.castShadow = true; body.receiveShadow = true;
      g.add(body);
      var roofShape = new THREE.Shape();
      roofShape.moveTo(-w / 2 - 0.25, 0); roofShape.lineTo(w / 2 + 0.25, 0); roofShape.lineTo(0, h * 0.42); roofShape.closePath();
      var roof = new THREE.Mesh(new THREE.ExtrudeGeometry(roofShape, { depth: d + 0.4, bevelEnabled: false }), K.mat.std(roofCol, 0.8, 0, { flatShading: true }));
      roof.position.set(0, h, -d / 2 - 0.2); roof.castShadow = true;
      g.add(roof);
      var nx = Math.max(1, Math.floor(w / 1.4));
      for (var row = 0; row < 2; row++) for (var i = 0; i < nx; i++) {
        var on = lit.indexOf(row * nx + i) >= 0;
        var wdw = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.78), on ? winMat : winDark);
        wdw.position.set(-w / 2 + (i + 0.5) * w / nx, h * (row ? 0.7 : 0.3), d / 2 + 0.01);
        g.add(wdw);
      }
      g.position.set(x, 0, z);
      town.add(g);
      return g;
    }
    house(-17, -15.5, 5.2, 4.2, 4.5, 0xE7E1D5, 0x8E7E73, [0, 3]);
    house(-9.2, -16.5, 6.0, 5.0, 5.0, 0xD8DADC, 0x6F7378, [1, 2, 4]);
    house(-1.2, -15.8, 5.4, 4.4, 4.6, 0xDDD0B9, 0x8A6E5E, [0, 5]);
    house(6.8, -16.6, 5.0, 4.8, 4.6, 0xE3E1DA, 0x7A7470, [2]);
    house(14.5, -15.6, 5.6, 4.0, 4.6, 0xE0D8C8, 0x857467, [1, 3]);
    var leafMat = K.mat.std(0x7E9B74, 0.85, 0, { flatShading: true }), trunkMat = K.mat.std(0x6E5A48, 0.9);
    [[-7.5, -4.5, 1.25], [6.8, -5.5, 1.1], [-15, -4.0, 1.3], [16, -6.5, 1.2]].forEach(function (tr) {
      var g = new THREE.Group();
      var trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.14, 1.6, 8), trunkMat);
      trunk.position.y = 0.8; trunk.castShadow = true; g.add(trunk);
      var c1 = new THREE.Mesh(new THREE.IcosahedronGeometry(tr[2], 1), leafMat);
      c1.position.y = 1.6 + tr[2] * 0.75; c1.castShadow = true; g.add(c1);
      g.position.set(tr[0], 0, tr[1]);
      town.add(g);
    });
    mergeStatic(town);

    /* ---------- street lamp ---------- */
    var lamp = new THREE.Group();
    lamp.position.set(LAMP_X, 0.14, 0.1);
    S.add(lamp);
    var anth = K.mat.std(0x3B3F46, 0.42, 0.6);
    var base = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.2, 0.55, 24), anth);
    base.position.y = 0.275; lamp.add(base);
    var pole = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.1, 5.0, 24), anth);
    pole.position.y = 2.5; lamp.add(pole);
    var armCurve = new THREE.CubicBezierCurve3(new THREE.Vector3(0, 4.85, 0), new THREE.Vector3(0, 5.35, 0), new THREE.Vector3(0.45, 5.42, 0.3), new THREE.Vector3(1.25, 5.3, 0.75));
    var arm = new THREE.Mesh(new THREE.TubeGeometry(armCurve, 40, 0.05, 12, false), anth);
    lamp.add(arm);
    var head = new THREE.Group();
    head.position.set(1.42, 5.24, 0.85);
    head.rotation.y = -0.55; head.rotation.z = -0.06;
    lamp.add(head);
    var hb = new THREE.Mesh(rbox(0.98, 0.13, 0.4, 0.06, 3), anth);
    head.add(hb);
    var ledMat = new THREE.MeshStandardMaterial({ color: 0xCFCBC2, roughness: 0.35, emissive: 0xFFE2B0, emissiveIntensity: 0 });
    var led = new THREE.Mesh(rrPlane(0.86, 0.3, 0.05), ledMat);
    led.rotation.x = Math.PI / 2; led.position.y = -0.066;
    head.add(led);
    // LDR photocell on top of the head
    var ldrBase = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.08, 0.06, 24), K.mat.std(0xD9D7D1, 0.5));
    ldrBase.position.set(0.18, 0.095, 0); head.add(ldrBase);
    var ldrDome = new THREE.Mesh(new THREE.SphereGeometry(0.07, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0xF2EEDF, roughness: 0.15, transparent: true, opacity: 0.75 }));
    ldrDome.position.set(0.18, 0.125, 0); head.add(ldrDome);
    var ldrCell = new THREE.Mesh(new THREE.CircleGeometry(0.04, 20), K.mat.std(0xA8552E, 0.5));
    ldrCell.rotation.x = -Math.PI / 2; ldrCell.position.set(0.18, 0.127, 0); head.add(ldrCell);
    // PIR motion sensor on the pole
    var pir = new THREE.Group();
    pir.position.set(0, 3.15, 0.1);
    pir.rotation.y = -0.2;
    lamp.add(pir);
    var pirBox = new THREE.Mesh(rbox(0.16, 0.16, 0.12, 0.03, 2), K.mat.plasticWhite({ roughness: 0.45 }));
    pirBox.position.z = 0.1; pir.add(pirBox);
    var pirDome = new THREE.Mesh(new THREE.IcosahedronGeometry(0.075, 1), K.mat.std(0xF4F2EC, 0.35, 0, { flatShading: true }));
    pirDome.position.set(0, -0.02, 0.17); pirDome.scale.set(1, 1, 0.75); pir.add(pirDome);
    lamp.traverse(function (c) { if (c.isMesh) { c.castShadow = true; } });
    lamp.updateMatrixWorld(true);
    var ldrWorld = head.localToWorld(new THREE.Vector3(0.18, 0.16, 0));
    var pirWorld = pir.localToWorld(new THREE.Vector3(0, 0, 0.22));
    var headWorld = head.localToWorld(new THREE.Vector3(0, -0.07, 0));

    // lamp light: spot + soft visible cone + pool
    var spot = new THREE.SpotLight(0xFFD7A0, 0, 16, 0.78, 0.55, 1.2);
    spot.position.copy(headWorld);
    spot.target.position.set(headWorld.x, 0, headWorld.z + 0.2);
    spot.castShadow = true;
    spot.shadow.mapSize.set(1024, 1024);
    spot.shadow.bias = -0.0005;
    S.add(spot); S.add(spot.target);
    var coneMat = new THREE.ShaderMaterial({
      uniforms: { k: { value: 0 } },
      vertexShader: 'varying float vY; varying vec3 vN; varying vec3 vV; void main(){ vY = position.y; vN = normalize(normalMatrix * normal); vec4 mv = modelViewMatrix * vec4(position, 1.0); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }',
      fragmentShader: 'uniform float k; varying float vY; varying vec3 vN; varying vec3 vV; void main(){ float h = clamp((vY + 2.6) / 5.2, 0.0, 1.0); float edge = pow(abs(dot(normalize(vN), normalize(vV))), 1.2); gl_FragColor = vec4(vec3(1.0, 0.88, 0.66), clamp(k * 0.22 * h * h * edge, 0.0, 1.0)); }',
      transparent: true, depthWrite: false, side: THREE.DoubleSide
    });
    var cone = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 3.0, 5.2, 40, 1, true), coneMat);
    cone.position.set(headWorld.x, headWorld.y - 2.6, headWorld.z + 0.1);
    S.add(cone);
    // PIR detection zone on the sidewalk
    var zoneMat = new THREE.MeshBasicMaterial({ color: 0x3E434D, transparent: true, opacity: 0.08, depthWrite: false });
    var zone = new THREE.Mesh(new THREE.CircleGeometry(3.4, 40, Math.PI * 0.05, Math.PI * 0.9), zoneMat);
    zone.rotation.x = -Math.PI / 2; zone.position.set(LAMP_X, 0.15, 0.2);
    zone.scale.set(1, 0.42, 1);
    S.add(zone);

    /* ---------- pedestrians (abstract capsules) ---------- */
    var pedMat = K.mat.std(0x5C6370, 0.7);
    function ped() {
      var g = new THREE.Group();
      var torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.2, 0.42, 6, 16), pedMat);
      torso.position.y = 1.18; torso.scale.set(1, 1, 0.75); torso.castShadow = true; g.add(torso);
      var legs = [];
      [-0.085, 0.085].forEach(function (ox) {
        var lg = new THREE.Mesh(new THREE.CapsuleGeometry(0.075, 0.62, 4, 10), pedMat);
        lg.geometry.translate(0, -0.38, 0);
        lg.position.set(0, 0.86, ox); lg.castShadow = true; g.add(lg); legs.push(lg);
      });
      var hd = new THREE.Mesh(new THREE.SphereGeometry(0.125, 20, 14), pedMat);
      hd.position.y = 1.64; hd.castShadow = true; g.add(hd);
      g.userData.legs = legs;
      g.visible = false;
      S.add(g);
      return g;
    }
    var peds = [ped(), ped()];
    // [start time, duration, direction, lane z]
    var WALKS = [[0.6, 5.0, 1, 1.85], [6.0, 4.6, 1, 1.7], [10.8, 4.4, -1, 2.0]];

    /* ---------- labels ---------- */
    var sensorHtml = function (a, b) { return '<div style="font:500 13px ' + K.fonts.mono + ';color:#15171C">' + a + '</div><div style="font-size:11px;color:#595E69">' + b + '</div>'; };
    var labL = v.label(sensorHtml('Işık: 12 lx', 'ışık sensörü (LDR)'), { at: ldrWorld, cls: 'chip', html: true, dx: 30, dy: -18, line: true, align: 'left', valign: 'bottom' });
    var labM = v.label(sensorHtml('Hareket: yok', 'hareket sensörü (PIR)'), { at: pirWorld, cls: 'chip', html: true, dx: 62, dy: 0, line: true, align: 'left', valign: 'middle' });
    var labFast = v.label('hızlandırılmış: bir gün 16 saniye', { at: [LAMP_X, 0, 2.6], cls: 'tag chip', dx: 0, dy: 0, align: 'center', valign: 'top' });

    /* ---------- day–night model ---------- */
    // phase u in [0,1): 0 late afternoon → 0,22 sunset → 0,3 night … 0,72 dawn → 0,86 day
    function luxAt(tt) {
      var u = (tt % CYCLE) / CYCLE;
      var lg;   // log10 lux
      if (u < 0.08) lg = lerp(3.9, 3.6, u / 0.08);
      else if (u < 0.3) lg = lerp(3.6, 0.45, E.sine((u - 0.08) / 0.22));
      else if (u < 0.68) lg = 0.45 + 0.08 * Math.sin(u * 40);
      else if (u < 0.9) lg = lerp(0.45, 4.2, E.sine((u - 0.68) / 0.22));
      else lg = lerp(4.2, 3.9, (u - 0.9) / 0.1);
      return Math.pow(10, lg);
    }
    function motionAt(tt) {
      var c = tt % CYCLE;
      for (var i = 0; i < WALKS.length; i++) {
        var w = WALKS[i], k = (c - w[0]) / w[1];
        if (k < 0 || k > 1) continue;
        var x = w[2] > 0 ? lerp(-7, 6.2, k) : lerp(6.2, -7, k);
        if (Math.abs(x - LAMP_X) < 3.1) return true;
      }
      return false;
    }
    function fmtLux(lx) {
      if (lx >= 1000) return nf(Math.round(lx / 100) * 100) + ' lx';
      if (lx >= 100) return nf(Math.round(lx / 10) * 10) + ' lx';
      return nf(Math.round(lx)) + ' lx';
    }

    /* ---------- program state ---------- */
    var pc, nextPc, stepT, readLx, readMot, lampOn, lampK, lastCond, lastDark, lastMot;
    function reset() {
      stepT = 0; readLx = luxAt(0); readMot = false; lampOn = false; lampK = 0;
      lastCond = 0; lastDark = readLx < DARK_LX ? 1 : 0; lastMot = 0;
      pc = 0; nextPc = runLine(0, 0);       // a line acts as soon as it is highlighted
    }
    function runLine(line, tt) {
      if (line === 0) { readLx = luxAt(tt); return 1; }
      if (line === 1) { readMot = motionAt(tt); return 2; }
      if (line === 2) {
        lastDark = readLx < DARK_LX ? 1 : 0; lastMot = readMot ? 1 : 0;
        lastCond = lastDark && lastMot ? 1 : 0;
        if (lastCond) { lampOn = true; return 0; }
        return 3;
      }
      lampOn = false; return 0;
    }
    reset();

    var skyTop = new THREE.Color(), skyBot = new THREE.Color(), cA = new THREE.Color(), cB = new THREE.Color();
    var SKY = [
      [0.0, '#86AED6', '#E3E9EC'], [0.12, '#6D8FC0', '#F0D2B0'], [0.22, '#3E5487', '#EEA77E'],
      [0.3, '#16223F', '#3B4767'], [0.66, '#121C35', '#34405E'], [0.74, '#4B5D8E', '#E9B59A'],
      [0.82, '#7FA6D2', '#EAD9C8'], [1.0, '#86AED6', '#E3E9EC']
    ];
    function sky(u) {
      for (var i = 0; i < SKY.length - 1; i++) {
        if (u <= SKY[i + 1][0]) {
          var k = E.sine((u - SKY[i][0]) / (SKY[i + 1][0] - SKY[i][0]));
          skyTop.set(SKY[i][1]).lerp(cA.set(SKY[i + 1][1]), k);
          skyBot.set(SKY[i][2]).lerp(cB.set(SKY[i + 1][2]), k);
          return;
        }
      }
    }
    var lastBg = '', labCache = ['', ''];

    function frame(t, dt) {
      var tt = K.reducedMotion ? 7.4 : t;
      var u = (tt % CYCLE) / CYCLE;
      var lx = luxAt(tt);
      var dayK = clamp((Math.log(lx) / Math.LN10 - 0.45) / 3.4, 0, 1);   // 0 night … 1 day
      // program: one line every 0,4 s
      if (!K.reducedMotion) {
        stepT += dt;
        while (stepT >= LINE_T) { stepT -= LINE_T; pc = nextPc; nextPc = runLine(pc, tt); }
      } else { readLx = luxAt(tt); readMot = true; lastDark = 1; lastMot = 1; lastCond = 1; lampOn = true; pc = 2; }
      // in bright daylight the lamp is off whatever the last read said
      if (!K.reducedMotion && dayK > 0.6) { lampOn = false; lastCond = 0; lastDark = 0; }
      lampK = easeTo(lampK, lampOn ? 1 : 0, 9, Math.max(dt, 1e-3));
      if (K.reducedMotion) lampK = lampOn ? 1 : 0;
      // sky (CSS background of the frame) and fog
      sky(u);
      var bg = 'linear-gradient(180deg,' + '#' + skyTop.getHexString() + ' 0%,' + '#' + skyBot.getHexString() + ' 62%,' + '#' + skyBot.getHexString() + ' 100%)';
      if (bg !== lastBg) { el.style.background = bg; lastBg = bg; }
      S.fog.color.copy(skyBot);
      // lights
      if (L0) {
        var warm = 1 - clamp(Math.abs(u - 0.2) / 0.1, 0, 1) * 1;
        L0.key.intensity = 0.06 + 1.25 * dayK;
        L0.key.color.setRGB(1, lerp(1, 0.78, warm), lerp(1, 0.6, warm));
        L0.key.position.set(-14, lerp(3, 16, dayK), 9);
        L0.hemi.intensity = 0.14 + 0.5 * dayK;
        L0.hemi.color.setRGB(lerp(0.55, 1, dayK), lerp(0.62, 1, dayK), lerp(0.85, 1, dayK));
        L0.fill.intensity = 0.06 + 0.3 * dayK;
        L0.rim.intensity = 0.1 + 0.3 * dayK;
      }
      v.exposure = lerp(1.25, 1.0, dayK);
      winMat.emissiveIntensity = (1 - dayK) * 1.1;
      // lamp
      ledMat.emissiveIntensity = lampK * 2.4;
      spot.intensity = lampK * 7;
      coneMat.uniforms.k.value = lampK * (1 - dayK * 0.85);
      // pedestrians
      var c = tt % CYCLE, used = 0;
      peds.forEach(function (p) { p.visible = false; });
      for (var i = 0; i < WALKS.length && used < peds.length; i++) {
        var w = WALKS[i], k = (c - w[0]) / w[1];
        if (k < 0 || k > 1) continue;
        var p = peds[used++];
        var x = w[2] > 0 ? lerp(-7, 6.2, k) : lerp(6.2, -7, k);
        var step = (c - w[0]) * 2 * Math.PI * 0.95;
        p.visible = true;
        p.position.set(x, 0.14 + Math.abs(Math.sin(step)) * 0.03, w[3]);
        p.userData.legs[0].rotation.z = Math.sin(step) * 0.38;
        p.userData.legs[1].rotation.z = -Math.sin(step) * 0.38;
      }
      var motNow = readMot;
      zoneMat.color.setHex(motNow ? 0xC8693A : 0x3E434D);
      zoneMat.opacity = motNow ? 0.3 : 0.08;
      // labels
      var lt = fmtLux(readLx), mt = readMot ? 'var' : 'yok';
      if (lt !== labCache[0]) { labCache[0] = lt; labL.set(sensorHtml('Işık: ' + lt, 'ışık sensörü (LDR)')); }
      if (mt !== labCache[1]) { labCache[1] = mt; labM.set(sensorHtml('Hareket: ' + mt, 'hareket sensörü (PIR)')); }
      v.render(dt);

      /* 2D overlay: the code panel */
      var g = v.ctx;
      var lines = ['Işık sensörünü oku', 'Hareket sensörünü oku', 'Işık < 20 lx VE hareket varsa lambayı yak', 'Değilse lambayı söndür'];
      var px = 16, py = 16, lh = 24, pw = 372, ph = 16 + lines.length * lh + 44;
      g.save();
      g.fillStyle = 'rgba(14,18,26,0.92)';
      K.rr(g, px, py, pw, ph, 12); g.fill();
      var active = K.reducedMotion ? 2 : pc;   // line being executed now
      for (var li = 0; li < lines.length; li++) {
        var ly = py + 14 + li * lh;
        if (li === active) {
          g.fillStyle = 'rgba(238,240,243,0.09)';
          K.rr(g, px + 8, ly - 2, pw - 16, lh - 2, 6); g.fill();
          g.fillStyle = P.copperLight;
          g.fillRect(px + 8, ly + 2, 3, lh - 10);
        }
        K.label(g, String(li + 1), px + 22, ly + 15, { size: 12, mono: true, color: li === active ? P.copperLight : '#6C7586' });
        K.label(g, lines[li], px + 42, ly + 15, { size: 13, mono: true, color: li === active ? '#FFFFFF' : '#B9C0CC' });
        if (li < 2) K.label(g, '→ ' + (li === 0 ? fmtLux(readLx) : (readMot ? 'var' : 'yok')), px + pw - 18, ly + 15, { size: 12, mono: true, align: 'right', color: P.copperLight });
      }
      var sy = py + 14 + lines.length * lh + 8;
      g.strokeStyle = 'rgba(238,240,243,0.12)'; g.lineWidth = 1;
      g.beginPath(); g.moveTo(px + 14, sy); g.lineTo(px + pw - 14, sy); g.stroke();
      var status = 'karanlık ' + lastDark + ' VE hareket ' + lastMot + ' = ' + lastCond;
      K.label(g, status, px + 22, sy + 21, { size: 12, mono: true, color: '#9AA3B2' });
      K.label(g, lastCond ? 'lamba yanar' : 'lamba söner', px + pw - 18, sy + 21, { size: 12, mono: true, weight: 600, align: 'right', color: lastCond ? P.lamp : '#9AA3B2' });
      g.restore();
    }

    return {
      reset: reset,
      frame: frame,
      read: function (key) {
        if (key === 'decision') return 'Karanlık (' + lastDark + ') VE hareket (' + lastMot + ') = ' + lastCond + ' → lamba ' + (lastCond ? 'yanar' : 'söner');
        if (key === 'light') return 'Işık: ' + fmtLux(readLx);
        if (key === 'motion') return 'Hareket: ' + (readMot ? 'var' : 'yok');
        return '';
      },
      dispose: function () { v.dispose(); }
    };
  });

  /* @@NEXT@@ */
})();
