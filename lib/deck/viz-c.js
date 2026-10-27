/* Köklerden Göklere · Builder C · Malzeme
 * three-materials · keratin-water · doping · body-ions · touchscreen
 *
 * Her görsel KGViz.register(ad, fabrika) ile kaydolur ve kg-viz.js çekirdeğinin
 * sözleşmesine uyar: reset(), frame(t, dt), set(), read(), resize(), dispose().
 * Rastgelelik yalnızca KGViz.rng(tohum) ile; zamanlayıcı yok, her şey frame() ile.
 */
(function () {
  'use strict';
  var K = window.KGViz;
  if (!K) return;

  /* =====================================================================
   * Ortak yardımcılar
   * ===================================================================== */
  var TAU = Math.PI * 2;
  var P = K.palette;
  function clamp(x, a, b) { return x < a ? a : x > b ? b : x; }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function sstep(a, b, x) { return K.smoothstep(a, b, x); }
  /* Frame-rate independent exponential approach */
  function approach(cur, target, rate, dt) { return cur + (target - cur) * (1 - Math.exp(-rate * dt)); }
  function fract(x) { return x - Math.floor(x); }

  /* Superscript markup (the embedded Plex subset has no U+207A/U+207B glyphs) */
  function sup(s) { return '<span class="kgc-sup">' + s + '</span>'; }
  var ION = {
    na: 'Na' + sup('+'), k: 'K' + sup('+'), cl: 'Cl' + sup('−'), e: 'e' + sup('−'),
    p: 'P' + sup('+'), b: 'B' + sup('−')
  };

  (function injectCss() {
    if (document.querySelector('style[data-kgc]')) return;
    var css =
      '.kgc-sup{font-size:.7em;position:relative;top:-.48em;margin-left:.05em;line-height:0}' +
      '.kgc-row{display:flex;align-items:center;gap:14px;white-space:nowrap}' +
      '.kgc-it{display:inline-flex;align-items:center;gap:6px}' +
      '.kgc-dot{display:inline-block;width:10px;height:10px;border-radius:50%;flex:none}' +
      '.kgc-dot.sm{width:7px;height:7px}' +
      '.kgc-ring{display:inline-block;width:8px;height:8px;border-radius:50%;border:2px solid #C8693A;box-sizing:content-box;flex:none}' +
      '.kgc-key{font-family:' + K.fonts.mono + ';font-weight:500;color:#15171C;font-size:12px}' +
      '.kgc-plus{font-family:' + K.fonts.mono + ';font-weight:600;font-size:17px;line-height:1}' +
      '.kgc-status{font-family:' + K.fonts.mono + ';font-weight:500;font-size:13px;color:#15171C}' +
      '.kgc-status b{font-weight:600}' +
      '.kg-l.chip.kgc-strong{border-color:#D6D6CF;color:#15171C}' +
      '.kg-l.kgc-wrap{white-space:normal}';
    var s = document.createElement('style');
    s.setAttribute('data-kgc', '');
    s.textContent = css;
    (document.head || document.documentElement).appendChild(s);
  })();

  /* CSS sphere swatch for DOM legends: same light direction as the 3D studio key */
  function dotCss(hex, small) {
    return '<i class="kgc-dot' + (small ? ' sm' : '') + '" style="background:radial-gradient(circle at 34% 30%,' +
      K.mix(hex, '#FFFFFF', 0.5) + ' 0,' + hex + ' 55%,' + K.mix(hex, '#000000', 0.28) + ' 100%)"></i>';
  }
  function ringCss() { return '<i class="kgc-ring"></i>'; }

  /* Screen-fixed DOM labels that reuse the core label classes */
  function makeFixed(el) {
    var layer = document.createElement('div');
    layer.className = 'kg-labels';
    layer.style.zIndex = '3';
    el.appendChild(layer);
    var all = [];
    function px(v) { return typeof v === 'number' ? v + 'px' : v; }
    function add(html, o) {
      o = o || {};
      var d = document.createElement('div');
      d.className = 'kg-l ' + (o.cls || 'note');
      d.innerHTML = html;
      var s = d.style;
      if (o.left !== undefined) s.left = px(o.left);
      if (o.right !== undefined) { s.left = 'auto'; s.right = px(o.right); }
      if (o.top !== undefined) s.top = px(o.top);
      if (o.bottom !== undefined) { s.top = 'auto'; s.bottom = px(o.bottom); }
      if (o.center) s.transform = 'translateX(-50%)';
      if (o.style) s.cssText += ';' + o.style;
      layer.appendChild(d);
      var L = {
        el: d, html: html, want: html, vis: true, wait: 0,
        set: function (h) { if (h !== L.html) { L.html = h; L.want = h; d.innerHTML = h; } return L; },
        show: function (b) {
          b = b !== false;
          if (b !== L.vis) { L.vis = b; if (b) d.classList.remove('hide'); else d.classList.add('hide'); }
          return L;
        },
        /* Cross-fade to new text: fade out, swap, fade in (driven by frame dt) */
        swap: function (h, dt, visible) {
          visible = visible !== false;
          if (h !== L.html) {
            L.want = h;
            if (L.vis) { L.show(false); L.wait = 0; }
            L.wait += dt;
            if (L.wait > 0.36) { L.html = h; d.innerHTML = h; L.wait = 0; if (visible) L.show(true); }
          } else {
            L.show(visible);
          }
          return L;
        }
      };
      if (o.hidden) L.show(false);
      all.push(L);
      return L;
    }
    return {
      layer: layer, add: add, all: all,
      dispose: function () { if (layer.parentNode) layer.parentNode.removeChild(layer); }
    };
  }

  /* Geometry and instancing helpers (THREE is read lazily: scripts may load in any order) */
  function roundedBoxGeo(w, h, d, r, seg) {
    var THREE = window.THREE;
    r = Math.min(r, w / 2 - 1e-4, h / 2 - 1e-4, d / 2 - 1e-4);
    seg = seg || 3;
    var b = r * 0.999;
    var iw = w - 2 * b, ih = h - 2 * b;
    var rc = Math.min(r * 0.6, iw / 2 - 1e-5, ih / 2 - 1e-5);
    var x0 = -iw / 2, y0 = -ih / 2;
    var s = new THREE.Shape();
    if (rc > 1e-4) {
      s.moveTo(x0 + rc, y0);
      s.lineTo(x0 + iw - rc, y0);
      s.quadraticCurveTo(x0 + iw, y0, x0 + iw, y0 + rc);
      s.lineTo(x0 + iw, y0 + ih - rc);
      s.quadraticCurveTo(x0 + iw, y0 + ih, x0 + iw - rc, y0 + ih);
      s.lineTo(x0 + rc, y0 + ih);
      s.quadraticCurveTo(x0, y0 + ih, x0, y0 + ih - rc);
      s.lineTo(x0, y0 + rc);
      s.quadraticCurveTo(x0, y0, x0 + rc, y0);
    } else {
      s.moveTo(x0, y0); s.lineTo(x0 + iw, y0); s.lineTo(x0 + iw, y0 + ih); s.lineTo(x0, y0 + ih); s.lineTo(x0, y0);
    }
    var depth = Math.max(1e-4, d - 2 * b);
    var g = new THREE.ExtrudeGeometry(s, { depth: depth, bevelEnabled: true, bevelThickness: b, bevelSize: b, bevelSegments: seg, curveSegments: seg * 2 });
    g.translate(0, 0, -depth / 2);
    g.computeVertexNormals();
    return g;
  }

  /* InstancedMesh with in-place matrix writes: put(i, x, y, z, scale[, quaternion]) */
  function makeInst(geo, mat, n, o) {
    var THREE = window.THREE;
    o = o || {};
    var mesh = new THREE.InstancedMesh(geo, mat, n);
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    mesh.frustumCulled = false;
    mesh.castShadow = !!o.castShadow;
    mesh.receiveShadow = !!o.receiveShadow;
    var m = new THREE.Matrix4(), p = new THREE.Vector3(), s = new THREE.Vector3(), q0 = new THREE.Quaternion();
    mesh.put = function (i, x, y, z, sc, q) {
      p.set(x, y, z);
      if (sc <= 0) { sc = 1e-5; p.y -= 9999; }
      s.setScalar(sc);
      m.compose(p, q || q0, s);
      mesh.setMatrixAt(i, m);
    };
    mesh.putS = function (i, x, y, z, sx, sy, sz, q) {
      p.set(x, y, z); s.set(sx, sy, sz);
      m.compose(p, q || q0, s);
      mesh.setMatrixAt(i, m);
    };
    mesh.hide = function (i) { mesh.put(i, 0, 0, 0, 0); };
    mesh.commit = function () { mesh.instanceMatrix.needsUpdate = true; };
    return mesh;
  }

  /* Cylinder (unit height, along Y) placed between a and b */
  function bondMatrix(out, ax, ay, az, bx, by, bz, r, tmp) {
    var THREE = window.THREE;
    tmp = tmp || bondMatrix.tmp || (bondMatrix.tmp = { d: new THREE.Vector3(), q: new THREE.Quaternion(), up: new THREE.Vector3(0, 1, 0), p: new THREE.Vector3(), s: new THREE.Vector3() });
    tmp.d.set(bx - ax, by - ay, bz - az);
    var len = tmp.d.length();
    tmp.d.multiplyScalar(1 / Math.max(1e-9, len));
    tmp.q.setFromUnitVectors(tmp.up, tmp.d);
    tmp.p.set((ax + bx) / 2, (ay + by) / 2, (az + bz) / 2);
    tmp.s.set(r, len, r);
    out.compose(tmp.p, tmp.q, tmp.s);
    return out;
  }

  /* Uniform random direction (seeded) written into arr[o..o+2] with length s */
  function randDir(r, arr, o, s) {
    var u = r() * 2 - 1, a = r() * TAU, k = Math.sqrt(1 - u * u);
    arr[o] = k * Math.cos(a) * s; arr[o + 1] = k * Math.sin(a) * s; arr[o + 2] = u * s;
  }

  /* Smooth bounded pseudo-noise in [-1, 1] from incommensurate sines (deterministic in t) */
  function wob(t, ph, f) { return 0.55 * Math.sin(t * f + ph) + 0.3 * Math.sin(t * f * 1.73 + ph * 2.1) + 0.15 * Math.sin(t * f * 2.91 + ph * 0.7); }

  /* Electron gas in a box: random thermal velocity with exponential collision times,
   * reflecting y/z walls and periodic x (charge leaves into one plate and enters from the other). */
  function makeGas(n, seed, hx, hy, hz, speed, tau) {
    var g = { n: n, p: new Float32Array(n * 3), v: new Float32Array(n * 3), tc: new Float32Array(n), r: null };
    g.reset = function () {
      var r = g.r = K.rng(seed);
      for (var i = 0; i < n; i++) {
        g.p[i * 3] = (r() * 2 - 1) * hx; g.p[i * 3 + 1] = (r() * 2 - 1) * hy; g.p[i * 3 + 2] = (r() * 2 - 1) * hz;
        randDir(r, g.v, i * 3, speed * (0.65 + 0.7 * r()));
        g.tc[i] = -Math.log(1 - r() * 0.999) * tau;
      }
    };
    g.step = function (dt, dvx) {
      var r = g.r, p = g.p, v = g.v;
      for (var i = 0; i < n; i++) {
        var o = i * 3;
        g.tc[i] -= dt;
        if (g.tc[i] <= 0) { randDir(r, v, o, speed * (0.65 + 0.7 * r())); g.tc[i] = -Math.log(1 - r() * 0.999) * tau; }
        p[o] += (v[o] + dvx) * dt; p[o + 1] += v[o + 1] * dt; p[o + 2] += v[o + 2] * dt;
        if (p[o + 1] > hy) { p[o + 1] = 2 * hy - p[o + 1]; v[o + 1] = -Math.abs(v[o + 1]); }
        else if (p[o + 1] < -hy) { p[o + 1] = -2 * hy - p[o + 1]; v[o + 1] = Math.abs(v[o + 1]); }
        if (p[o + 2] > hz) { p[o + 2] = 2 * hz - p[o + 2]; v[o + 2] = -Math.abs(v[o + 2]); }
        else if (p[o + 2] < -hz) { p[o + 2] = -2 * hz - p[o + 2]; v[o + 2] = Math.abs(v[o + 2]); }
        if (p[o] < -hx) p[o] += 2 * hx; else if (p[o] > hx) p[o] -= 2 * hx;
      }
    };
    g.reset();
    return g;
  }

  /* Box size from the inline style (the slide may be hidden when the visual is built) */
  function boxWH(el, w0, h0) {
    var w = parseFloat(el.style.width) || el.offsetWidth || w0, h = parseFloat(el.style.height) || el.offsetHeight || h0;
    return { w: w, h: h, wide: w / h > 1.8 };
  }

  /* Canvas texture with text drawn after fonts are ready (redrawn once they load) */
  function liveTexture(w, h, draw) {
    var tex = K.textTexture(w, h, draw);
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(function () {
        var c = tex.image, ctx = c.getContext('2d');
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, c.width, c.height);
        draw(ctx, w, h);
        tex.needsUpdate = true;
      });
    }
    return tex;
  }

  /* =====================================================================
   * three-materials · W 1120×230 · light
   * Bakır (metal) · plastik (ametal) · silisyum (yarı iletken) yan yana.
   * ===================================================================== */
  K.register('three-materials', function (el, opts) {
    var THREE = window.THREE;
    K.renderer(); /* initialise colour management before any THREE.Color is created */
    opts = opts || {};
    var theme = opts.theme || 'light';
    if (window.getComputedStyle(el).position === 'static') el.style.position = 'relative';

    var HX = 1.2, HY = 0.4, HZ = 0.3, PLX = HX + 0.17;
    var HOME = { yaw: 0.22, pitch: 0.25, distance: 6.0, target: [0, -0.02, 0] };
    var st = { auto: true, field: 0, heat: 0, fieldK: 0, heatK: 0, view: 'hepsi' };
    var VN = ['bakir', 'plastik', 'silisyum'];
    function shown(i) { return st.view === 'hepsi' || st.view === VN[i]; }
    var reduced = K.reducedMotion;

    /* Shared geometry */
    var gSphere = new THREE.SphereGeometry(1, 14, 10);
    var gSphereLo = new THREE.SphereGeometry(1, 10, 7);
    var gIco = new THREE.IcosahedronGeometry(1, 1);
    var gIco0 = new THREE.IcosahedronGeometry(1, 0);
    var gCyl = new THREE.CylinderGeometry(1, 1, 1, 8, 1, true);
    var gTorus = new THREE.TorusGeometry(1, 0.3, 8, 28);
    var matE = K.mat.electron(false);
    var matEb = K.mat.electron(false); /* bound electrons: identical blue, slightly calmer */
    matEb.emissiveIntensity = 0.3;
    var matHole = new THREE.MeshBasicMaterial({ color: 0xC8693A, toneMapped: false });
    var matBond = K.mat.std(0xC4C8CF, 0.45, 0.0);

    var fixed = makeFixed(el);
    var panels = [];
    /* three equal panels in whole pixels: the shared renderer then keeps one buffer size */
    function panelW() { return st.view === 'hepsi' ? Math.max(1, Math.floor((el.offsetWidth || 1120) / 3)) : Math.max(1, el.offsetWidth || 1120); }
    function panelLeft(i) { return st.view === 'hepsi' ? Math.floor(((el.offsetWidth || 1120) - 3 * panelW()) / 2) + i * panelW() : 0; }
    function layoutPanel(div, i) { div.style.left = panelLeft(i) + 'px'; div.style.width = panelW() + 'px'; }

    var INFO = [
      { tag: 'BAKIR · İLETKEN', note: 'Serbest elektronlar bütün kristalde dolaşır' },
      { tag: 'PLASTİK · YALITKAN', note: 'Elektronlar bağlarda çift hâlinde kilitli' },
      { tag: 'SİLİSYUM · YARI İLETKEN', note: 'Az sayıda elektron bağından kopar; yerinde bir boşluk (eksik elektron) kalır' }
    ];

    function makePanel(idx) {
      var div = document.createElement('div');
      div.style.cssText = 'position:absolute;top:0;height:100%';
      el.appendChild(div);
      layoutPanel(div, idx);
      var v = K.stage3d(div, {
        theme: theme, fov: 24, distance: HOME.distance, yaw: HOME.yaw, pitch: HOME.pitch, target: HOME.target,
        size: 1.7, shadows: false, minPitch: 0.02, maxPitch: 1.1, minDistance: 2.6, maxDistance: 9
      });
      if (v.lights) {
        v.lights.key.intensity = 1.35;
        v.lights.hemi.intensity = 0.5;
      }
      var root = new THREE.Group();
      v.scene.add(root);

      /* Faint outline of the material piece */
      var edges = new THREE.LineSegments(
        new THREE.EdgesGeometry(new THREE.BoxGeometry(2 * HX + 0.1, 2 * HY + 0.1, 2 * HZ + 0.1)),
        new THREE.LineBasicMaterial({ color: 0x8A8F99, transparent: true, opacity: 0.32, depthWrite: false })
      );
      root.add(edges);

      /* Electrode plates: neutral metal; tinted + / − when voltage is applied */
      var plateGeo = roundedBoxGeo(2 * HZ + 0.22, 2 * HY + 0.22, 0.05, 0.022, 3);
      var plates = [];
      [-1, 1].forEach(function (sgn) {
        var m = K.mat.tin({ roughness: 0.34 });
        var pl = new THREE.Mesh(plateGeo, m);
        pl.rotation.y = Math.PI / 2;
        pl.position.set(sgn * PLX, 0, 0);
        root.add(pl);
        plates.push(pl);
      });
      var plusL = v.label('+', { at: [-PLX, HY + 0.11, 0], cls: 'value kgc-plus', dy: -11 });
      var minusL = v.label('−', { at: [PLX, HY + 0.11, 0], cls: 'value kgc-plus', dy: -11 });
      plusL.el.style.color = P.copper;
      minusL.el.style.color = P.blue;


      var info = INFO[idx];
      var tagL = fixed.add(info.tag, { cls: 'tag', top: 10 });
      var noteL = fixed.add(info.note, { cls: 'note', top: 27 });
      var statL = fixed.add('', { cls: 'kgc-status', bottom: 9 });
      [tagL, noteL, statL].forEach(function (L) { L.el.style.left = (panelLeft(idx) + 18) + 'px'; });

      return { v: v, div: div, root: root, plates: plates, plusL: plusL, minusL: minusL, tagL: tagL, noteL: noteL, statL: statL, update: null, reset: null };
    }

    /* ---------- Bakır: FCC iyon kafesi + elektron gazı ---------- */
    function buildCopper(pn) {
      var a2 = 0.2, ions = [];
      for (var i = 0; i <= 12; i++) for (var j = 0; j <= 4; j++) for (var k = 0; k <= 3; k++) {
        if ((i + j + k) & 1) continue;
        ions.push([(i - 6) * a2, (j - 2) * a2, (k - 1.5) * a2]);
      }
      var nI = ions.length;
      var ionMat = K.mat.ionPositive();
      ionMat.color.set(0xC8693A); ionMat.roughness = 0.4; ionMat.metalness = 0.2;
      var ionMesh = makeInst(gSphere, ionMat, nI);
      pn.root.add(ionMesh);
      var ph = new Float32Array(nI * 3), rr = K.rng(11);
      for (i = 0; i < nI * 3; i++) ph[i] = rr() * TAU;
      var gas = makeGas(nI, 29, HX, HY - 0.03, HZ - 0.03, 0.62, 0.32);
      var eMesh = makeInst(gIco, matE, nI);
      pn.root.add(eMesh);
      var drift = 0;
      pn.reset = function () { gas.reset(); drift = 0; };
      pn.update = function (t, dt) {
        var amp = 0.011;
        for (var i = 0; i < nI; i++) {
          var p = ions[i];
          ionMesh.put(i, p[0] + amp * Math.sin(t * 9.1 + ph[i * 3]), p[1] + amp * Math.sin(t * 8.3 + ph[i * 3 + 1]), p[2] + amp * Math.sin(t * 9.7 + ph[i * 3 + 2]), 0.058);
        }
        ionMesh.commit();
        drift = st.fieldK * 0.26;
        gas.step(reduced ? dt * 0.35 : dt, -drift);
        var pp = gas.p;
        for (i = 0; i < nI; i++) {
          var x = pp[i * 3];
          var sc = 0.031 * sstep(HX + 0.001, HX - 0.09, Math.abs(x));
          eMesh.put(i, x, pp[i * 3 + 1], pp[i * 3 + 2], sc);
        }
        eMesh.commit();
      };
    }

    /* ---------- Plastik: polietilen zincirleri (C dark grey, H white) ---------- */
    function buildPlastic(pn) {
      var s = 0.14;                      /* scene units per ångström */
      var nC = 13, dxA = 1.277, ampA = 0.4305, CH = 1.09, th = 54.5 * Math.PI / 180;
      var chains = [[0.17, 0, 0.73], [-0.17, 0, -0.73]];
      var C = [], H = [], bonds = [];
      var x0 = -((nC - 1) / 2) * dxA * s;
      chains.forEach(function (ch, ci) {
        var yc = ch[0], zc = ch[1], psi = ch[2];
        var zy = Math.cos(psi), zz = Math.sin(psi);      /* zigzag direction in the yz plane */
        var wy = -Math.sin(psi), wz = Math.cos(psi);     /* zigzag plane normal */
        var shift = (ci % 2) * 0.5 * dxA * s;
        var base = C.length;
        for (var n = 0; n < nC; n++) {
          var side = (n % 2) ? 1 : -1;
          var x = x0 + n * dxA * s + shift - 0.25 * dxA * s;
          var y = yc + side * ampA * s * zy, z = zc + side * ampA * s * zz;
          C.push([x, y, z]);
          if (n > 0) bonds.push([base + n - 1, base + n, 0]);
          for (var hh = -1; hh <= 1; hh += 2) {
            var ux = 0, uy = side * zy, uz = side * zz;
            var hx = x, hy = y + CH * s * (Math.cos(th) * uy + hh * Math.sin(th) * wy);
            var hz = z + CH * s * (Math.cos(th) * uz + hh * Math.sin(th) * wz);
            H.push([hx + ux, hy, hz]);
            bonds.push([base + n, H.length - 1, 1]);
          }
        }
      });
      var cMesh = makeInst(gSphere, K.mat.std(0x4A4F5A, 0.42, 0.05), C.length);
      var hMesh = makeInst(gSphereLo, K.mat.std(0xE9E7E1, 0.55, 0, { envMapIntensity: 0.6 }), H.length);
      var bMesh = new THREE.InstancedMesh(gCyl, matBond, bonds.length);
      bMesh.castShadow = false;
      var m4 = new THREE.Matrix4();
      var mids = new Float32Array(bonds.length * 3), perp = new Float32Array(bonds.length * 3);
      var cam = new THREE.Vector3(Math.sin(HOME.yaw) * Math.cos(HOME.pitch), Math.sin(HOME.pitch), Math.cos(HOME.yaw) * Math.cos(HOME.pitch));
      var d = new THREE.Vector3(), pv = new THREE.Vector3();
      bonds.forEach(function (b, i) {
        var A = C[b[0]], B = b[2] ? H[b[1]] : C[b[1]];
        bondMatrix(m4, A[0], A[1], A[2], B[0], B[1], B[2], 0.011);
        bMesh.setMatrixAt(i, m4);
        mids[i * 3] = (A[0] + B[0]) / 2; mids[i * 3 + 1] = (A[1] + B[1]) / 2; mids[i * 3 + 2] = (A[2] + B[2]) / 2;
        d.set(B[0] - A[0], B[1] - A[1], B[2] - A[2]).normalize();
        pv.crossVectors(d, cam).normalize();
        perp[i * 3] = pv.x; perp[i * 3 + 1] = pv.y; perp[i * 3 + 2] = pv.z;
      });
      C.forEach(function (p, i) { cMesh.put(i, p[0], p[1], p[2], 0.052); });
      H.forEach(function (p, i) { hMesh.put(i, p[0], p[1], p[2], 0.033); });
      cMesh.commit(); hMesh.commit();
      pn.root.add(cMesh, hMesh, bMesh);
      var nb = bonds.length;
      var eMesh = makeInst(gIco0, matEb, nb * 2);
      pn.root.add(eMesh);
      var ph = new Float32Array(nb * 4), rr = K.rng(5);
      for (var i = 0; i < nb * 4; i++) ph[i] = rr() * TAU;
      pn.reset = function () { };
      pn.update = function (t) {
        var sh = -0.022 * st.fieldK, a = reduced ? 0.002 : 0.0065;
        for (var i = 0; i < nb; i++) {
          var mx = mids[i * 3] + sh, my = mids[i * 3 + 1], mz = mids[i * 3 + 2];
          for (var k = 0; k < 2; k++) {
            var sg = k ? 0.026 : -0.026, q = ph[i * 4 + k * 2];
            eMesh.put(i * 2 + k,
              mx + perp[i * 3] * sg + a * Math.sin(t * 11 + q),
              my + perp[i * 3 + 1] * sg + a * Math.sin(t * 9.4 + q * 1.7),
              mz + perp[i * 3 + 2] * sg + a * Math.cos(t * 10.3 + ph[i * 4 + k * 2 + 1]), 0.019);
          }
        }
        eMesh.commit();
      };
    }

    /* ---------- Silisyum: elmas kafes, bağ elektronları, birkaç serbest elektron ve boşluk ---------- */
    function buildSilicon(pn) {
      var A = 0.64, atoms = [];
      var basis = [[0, 0, 0], [0, 0.5, 0.5], [0.5, 0, 0.5], [0.5, 0.5, 0]];
      var R2 = Math.SQRT1_2;
      /* lattice axes: [1-10] along x (long side), [001] up, [110] toward the viewer */
      for (var cx = -5; cx <= 5; cx++) for (var cy = -5; cy <= 5; cy++) for (var cz = -2; cz <= 1; cz++) {
        for (var b = 0; b < 4; b++) for (var o = 0; o <= 1; o++) {
          var la = (cx + basis[b][0] + o * 0.25) * A, lb = (cy + basis[b][1] + o * 0.25) * A, lc = (cz + basis[b][2] + o * 0.25 + 0.125) * A;
          var x = (la - lb) * R2 + 0.06, y = lc, z = (la + lb) * R2 - 0.07;
          if (Math.abs(x) <= HX + 0.01 && Math.abs(y) <= HY + 0.01 && Math.abs(z) <= HZ + 0.01) atoms.push([x, y, z]);
        }
      }
      var na = atoms.length, bl = A * Math.sqrt(3) / 4;
      var bonds = [], atomBonds = atoms.map(function () { return []; });
      for (var i = 0; i < na; i++) for (var j = i + 1; j < na; j++) {
        var dx = atoms[i][0] - atoms[j][0], dy = atoms[i][1] - atoms[j][1], dz = atoms[i][2] - atoms[j][2];
        if (Math.abs(Math.sqrt(dx * dx + dy * dy + dz * dz) - bl) < 0.01) {
          atomBonds[i].push(bonds.length); atomBonds[j].push(bonds.length); bonds.push([i, j]);
        }
      }
      var nb = bonds.length;
      var mid = new Float32Array(nb * 3), dir = new Float32Array(nb * 3);
      var nbr = bonds.map(function (bd, bi) {
        var s = atomBonds[bd[0]].concat(atomBonds[bd[1]]).filter(function (x) { return x !== bi; });
        return s;
      });
      var siMat = K.mat.std(0x646C7A, 0.4, 0.3, { envMapIntensity: 0.75 });
      var atomMesh = makeInst(gSphere, siMat, na);
      var bMesh = new THREE.InstancedMesh(gCyl, matBond, nb);
      var m4 = new THREE.Matrix4();
      bonds.forEach(function (bd, k) {
        var P1 = atoms[bd[0]], P2 = atoms[bd[1]];
        bondMatrix(m4, P1[0], P1[1], P1[2], P2[0], P2[1], P2[2], 0.013);
        bMesh.setMatrixAt(k, m4);
        mid[k * 3] = (P1[0] + P2[0]) / 2; mid[k * 3 + 1] = (P1[1] + P2[1]) / 2; mid[k * 3 + 2] = (P1[2] + P2[2]) / 2;
        var l = bl;
        dir[k * 3] = (P2[0] - P1[0]) / l; dir[k * 3 + 1] = (P2[1] - P1[1]) / l; dir[k * 3 + 2] = (P2[2] - P1[2]) / l;
      });
      pn.root.add(atomMesh, bMesh);
      var beMesh = makeInst(gIco0, matEb, nb * 2);
      var MAXF = 14;
      var fMesh = makeInst(gIco, matE, MAXF);
      var hMesh = makeInst(gTorus, matHole, MAXF * 2);
      pn.root.add(beMesh, fMesh, hMesh);
      var ph = new Float32Array(na * 3 + nb * 4), rr0 = K.rng(17);
      for (i = 0; i < ph.length; i++) ph[i] = rr0() * TAU;
      var warm = new THREE.Color(0xF2C46B), black = new THREE.Color(0x000000);
      var SLOT = 0.06;

      /* carrier state */
      var full, holes, free, rng, genT;
      function slotPos(b, out) {
        out[0] = mid[b * 3] + dir[b * 3] * SLOT; out[1] = mid[b * 3 + 1] + dir[b * 3 + 1] * SLOT; out[2] = mid[b * 3 + 2] + dir[b * 3 + 2] * SLOT;
        return out;
      }
      var tmpA = [0, 0, 0], tmpB = [0, 0, 0];
      function busy(b) {
        for (var i = 0; i < holes.length; i++) if (holes[i].b === b || holes[i].from === b) return true;
        return false;
      }
      function pickFull(pred) {
        for (var tries = 0; tries < 60; tries++) {
          var b = Math.floor(rng() * nb);
          if (full[b] && !busy(b) && (!pred || pred(b))) return b;
        }
        return -1;
      }
      function createPair(pred) {
        var b = pickFull(pred);
        if (b < 0) return;
        full[b] = 0;
        holes.push({ b: b, from: -1, k: 1, born: 0, next: 0.5 + rng() * 0.5, dying: -1 });
        slotPos(b, tmpA);
        var f = { p: [tmpA[0], tmpA[1], tmpA[2]], v: [0, 0, 0], tc: 0.2, born: 0, target: null, tk: 0 };
        randDir(rng, f.v, 0, 0.42);
        free.push(f);
      }
      function reset() {
        rng = K.rng(41);
        full = new Uint8Array(nb).fill(1);
        holes = []; free = [];
        genT = 0;
        createPair(); createPair();
        holes.forEach(function (h) { h.born = 1; });
        free.forEach(function (f) { f.born = 1; });
      }
      reset();
      pn.reset = reset;

      pn.update = function (t, dt) {
        var hk = st.heatK, fk = st.fieldK;
        var target = Math.round(lerp(2, 7, hk));
        var active = 0;
        for (var i = 0; i < free.length; i++) if (!free[i].target) active++;
        genT -= dt;
        if (active < target && genT <= 0) { createPair(); genT = 0.45; }
        else if (active > target && genT <= 0 && holes.length) {
          /* recombination: a free electron falls back into a hole */
          for (i = 0; i < free.length; i++) if (!free[i].target) break;
          var hI = -1;
          for (var j = 0; j < holes.length; j++) if (holes[j].dying < 0 && holes[j].k >= 1) { hI = j; break; }
          if (i < free.length && hI >= 0) { free[i].target = holes[hI]; free[i].tk = 0; holes[hI].dying = 0; }
          genT = 0.6;
        }
        var spd = reduced ? 0.35 : 1;
        /* holes hop: a neighbouring bond electron jumps in, the hole moves the other way */
        for (i = holes.length - 1; i >= 0; i--) {
          var h = holes[i];
          h.born = Math.min(1, h.born + dt * 3);
          if (h.k < 1) {
            h.k = Math.min(1, h.k + dt * 3.2 * spd);
            if (h.k >= 1) h.from = -1;
          }
          if (h.dying >= 0) continue;
          h.next -= dt * spd;
          if (h.next > 0 || h.k < 1) continue;
          h.next = lerp(0.85, 0.45, hk) * (0.7 + 0.6 * rng());
          if (fk > 0.5 && mid[h.b * 3] > HX - 0.22) {
            /* the hole reaches the − plate: an electron from the plate fills it; a new hole forms at the + side */
            full[h.b] = 1;
            var nbI = pickFull(function (b) { return mid[b * 3] < -HX + 0.25; });
            if (nbI >= 0) { full[nbI] = 0; h.b = nbI; h.born = 0; h.from = -1; h.k = 1; }
            else { holes.splice(i, 1); }
            continue;
          }
          var cand = nbr[h.b], tot = 0, w = [];
          for (j = 0; j < cand.length; j++) {
            var c = cand[j];
            var ok = full[c] && !busy(c);
            var wt = ok ? Math.exp(7 * fk * (mid[c * 3] - mid[h.b * 3])) : 0;
            w.push(wt); tot += wt;
          }
          if (tot <= 0) continue;
          var rsel = rng() * tot, pick = cand[0];
          for (j = 0; j < cand.length; j++) { rsel -= w[j]; if (rsel <= 0) { pick = cand[j]; break; } }
          full[h.b] = 1; full[pick] = 0;
          h.from = h.b; h.b = pick; h.k = 0;
        }
        /* free electrons */
        for (i = free.length - 1; i >= 0; i--) {
          var f = free[i];
          f.born = Math.min(1, f.born + dt * 3);
          if (f.target) {
            f.tk += dt * 1.6;
            slotPos(f.target.b, tmpB);
            var e = K.ease.inOut(Math.min(1, f.tk));
            f.p[0] = lerp(f.p[0], tmpB[0], e * 0.25 + 0.02); f.p[1] = lerp(f.p[1], tmpB[1], e * 0.25 + 0.02); f.p[2] = lerp(f.p[2], tmpB[2], e * 0.25 + 0.02);
            if (f.tk >= 1) {
              var hi = holes.indexOf(f.target);
              if (hi >= 0) { full[f.target.b] = 1; holes.splice(hi, 1); }
              free.splice(i, 1);
            }
            continue;
          }
          f.tc -= dt;
          if (f.tc <= 0) { randDir(rng, f.v, 0, 0.42 * (0.7 + 0.6 * rng())); f.tc = 0.25 + rng() * 0.35; }
          f.p[0] += (f.v[0] - 0.2 * fk) * dt * spd; f.p[1] += f.v[1] * dt * spd; f.p[2] += f.v[2] * dt * spd;
          var hy = HY - 0.04, hz = HZ - 0.04;
          if (f.p[1] > hy) { f.p[1] = 2 * hy - f.p[1]; f.v[1] = -Math.abs(f.v[1]); } else if (f.p[1] < -hy) { f.p[1] = -2 * hy - f.p[1]; f.v[1] = Math.abs(f.v[1]); }
          if (f.p[2] > hz) { f.p[2] = 2 * hz - f.p[2]; f.v[2] = -Math.abs(f.v[2]); } else if (f.p[2] < -hz) { f.p[2] = -2 * hz - f.p[2]; f.v[2] = Math.abs(f.v[2]); }
          if (f.p[0] < -HX) f.p[0] += 2 * HX; else if (f.p[0] > HX) f.p[0] -= 2 * HX;
        }
        /* draw atoms: thermal vibration grows with heat */
        var amp = (reduced ? 0.003 : 0.006) + 0.016 * hk;
        for (i = 0; i < na; i++) {
          var at = atoms[i];
          atomMesh.put(i, at[0] + amp * wob(t * 1.7, ph[i * 3], 7), at[1] + amp * wob(t * 1.7, ph[i * 3 + 1], 6.3), at[2] + amp * wob(t * 1.7, ph[i * 3 + 2], 7.7), 0.058);
        }
        atomMesh.commit();
        siMat.emissive.copy(black).lerp(warm, 0.12 * hk);
        /* bond electrons */
        var hiddenFrom = {};
        for (i = 0; i < holes.length; i++) if (holes[i].from >= 0 && holes[i].k < 1) hiddenFrom[holes[i].from] = holes[i];
        var ja = 0.004 + 0.006 * hk;
        for (var bb = 0; bb < nb; bb++) {
          for (var kk = 0; kk < 2; kk++) {
            var idx = bb * 2 + kk;
            if (kk === 1 && (!full[bb] || hiddenFrom[bb])) { beMesh.hide(idx); continue; }
            var sg = kk ? SLOT : -SLOT, q = ph[na * 3 + bb * 4 + kk * 2];
            beMesh.put(idx,
              mid[bb * 3] + dir[bb * 3] * sg + ja * Math.sin(t * 10 + q) - 0.012 * fk,
              mid[bb * 3 + 1] + dir[bb * 3 + 1] * sg + ja * Math.sin(t * 8.7 + q * 1.3),
              mid[bb * 3 + 2] + dir[bb * 3 + 2] * sg + ja * Math.cos(t * 9.6 + q), 0.018);
          }
        }
        beMesh.commit();
        /* free electrons (including hopping ones) */
        var fi = 0;
        for (i = 0; i < free.length && fi < MAXF; i++) {
          var fe = free[i];
          var fade = fe.born * (fe.target ? 1 - sstep(0.7, 1, fe.tk) : 1);
          var xf = fe.p[0], edge = sstep(HX + 0.001, HX - 0.08, Math.abs(xf));
          fMesh.put(fi++, xf, fe.p[1], fe.p[2], 0.033 * fade * edge);
        }
        for (i = 0; i < holes.length && fi < MAXF; i++) {
          var ho = holes[i];
          if (ho.from >= 0 && ho.k < 1) {
            /* the hopping bond electron travels from the new hole site to the old one */
            slotPos(ho.b, tmpA); slotPos(ho.from, tmpB);
            var e2 = K.ease.inOut(ho.k);
            var lift = Math.sin(Math.PI * e2) * 0.05;
            fMesh.put(fi++, lerp(tmpA[0], tmpB[0], e2), lerp(tmpA[1], tmpB[1], e2) + lift, lerp(tmpA[2], tmpB[2], e2), 0.018);
          }
        }
        for (; fi < MAXF; fi++) fMesh.hide(fi);
        fMesh.commit();
        /* hole rings face the camera */
        var cq = pn.v.camera.quaternion, ri = 0;
        for (i = 0; i < holes.length && ri < MAXF * 2; i++) {
          var hh = holes[i];
          var life = hh.born * (hh.dying >= 0 ? 1 : 1);
          var tgt = null;
          for (j = 0; j < free.length; j++) if (free[j].target === hh) { tgt = free[j]; break; }
          if (tgt) life *= 1 - sstep(0.6, 1, tgt.tk);
          slotPos(hh.b, tmpA);
          var kin = hh.from >= 0 ? sstep(0.35, 1, hh.k) : 1;
          hMesh.put(ri++, tmpA[0], tmpA[1], tmpA[2], 0.034 * life * kin, cq);
          if (hh.from >= 0 && hh.k < 1) {
            slotPos(hh.from, tmpB);
            hMesh.put(ri++, tmpB[0], tmpB[1], tmpB[2], 0.034 * (1 - sstep(0.5, 0.95, hh.k)), cq);
          }
        }
        for (; ri < MAXF * 2; ri++) hMesh.hide(ri);
        hMesh.commit();
      };
    }

    for (var i = 0; i < 3; i++) panels.push(makePanel(i));
    buildCopper(panels[0]);
    buildPlastic(panels[1]);
    buildSilicon(panels[2]);

    function relayout() {
      var single = st.view !== 'hepsi';
      panels.forEach(function (pn, i) {
        var sh = shown(i);
        pn.div.style.display = sh ? '' : 'none';
        layoutPanel(pn.div, i);
        [pn.tagL, pn.noteL, pn.statL].forEach(function (L) { L.el.style.left = (panelLeft(i) + (single ? 24 : 18)) + 'px'; });
        pn.tagL.el.style.fontSize = single ? '16px' : ''; pn.tagL.el.style.fontWeight = single ? '700' : '';
        pn.noteL.el.style.fontSize = single ? '16px' : ''; pn.noteL.el.style.top = single ? '34px' : '27px';
        pn.statL.el.style.fontSize = single ? '20px' : '';
        pn.tagL.show(sh);
        if (i !== 2) pn.noteL.show(sh);
        if (sh) pn.v.sf.resize();
        pn.v.setView({ distance: single ? 3.9 : HOME.distance });
      });
      tagSim.el.style.fontSize = single ? '12px' : '10px';
    }
    var tagSim = fixed.add('basitleştirilmiş model<br>kayma hızı abartılı', { cls: 'tag', right: 12, bottom: 9, style: 'letter-spacing:.04em;font-size:10px;text-align:right;line-height:1.35' });

    var neutral = new THREE.Color(0xC9CCD1), plusC = new THREE.Color(0xE0AE8E), minusC = new THREE.Color(0xA9B8E6);

    function statusText(i) {
      if (st.fieldK < 0.5) return 'gerilim yok · akım yok';
      if (i === 0) return 'akım: var';
      if (i === 1) return 'akım: yok';
      return st.heat ? 'akım: artıyor' : 'akım: çok az';
    }
    function statusHtml(i) {
      var s = statusText(i);
      if (st.fieldK < 0.5) return '<span style="color:#595E69">' + s + '</span>';
      var col = i === 1 ? '#595E69' : i === 0 ? P.blue : P.blue;
      var parts = s.split(': ');
      return parts[0] + ': <b style="color:' + col + '">' + parts[1] + '</b>';
    }

    var lastT = 0;
    var sway = 0;
    return {
      reset: function () {
        st.auto = true; st.field = 0; st.heat = 0; st.fieldK = 0; st.heatK = 0;
        lastT = 0; sway = 0;
        panels.forEach(function (pn) {
          pn.v.setView({ yaw: HOME.yaw, pitch: HOME.pitch, distance: HOME.distance, target: HOME.target });
          if (pn.reset) pn.reset();
        });
      },
      set: function (key, val) {
        if (key === 'view') {
          var vv = String(val).replace('ı', 'i').replace('İ', 'i').toLowerCase();
          st.view = VN.indexOf(vv) >= 0 ? vv : 'hepsi'; relayout();
        }
        else if (key === 'field') { st.auto = false; st.field = (+val) ? 1 : 0; }
        else if (key === 'heat') { st.auto = false; st.heat = (+val) ? 1 : 0; }
      },
      read: function (key) {
        if (key === 'copper') return statusText(0);
        if (key === 'plastic') return statusText(1);
        if (key === 'silicon') return statusText(2);
        if (key === 'field') return st.field ? '1 · gerilim var' : '0 · gerilim yok';
        if (key === 'heat') return st.heat ? '1 · ısıtıldı' : '0 · oda sıcaklığı';
        if (key === 'view') return st.view;
        if (key === 'explain') return st.view === 'bakir' ? 'Bakırda elektronlar serbest: gerilim gelince hep birlikte akar.' : st.view === 'plastik' ? 'Plastikte elektronlar bağlarda kilitli: gerilim gelse de akım yok.' : st.view === 'silisyum' ? 'Silisyumda ısı birkaç elektronu koparır: bir miktar akım geçer.' : 'Bakır iletir, plastik iletmez, silisyum ısınınca bir miktar iletir.';
        return '';
      },
      frame: function (t, dt) {
        if (st.auto) { st.field = Math.floor(t / 5) % 2; if (st.view === 'silisyum') st.heat = Math.floor(t / 10) % 2; }
        st.fieldK = approach(st.fieldK, st.field, 3.2, dt);
        st.heatK = approach(st.heatK, st.heat, 1.6, dt);
        /* keep the three cameras in sync: whichever was touched last leads */
        var lead = panels[0], best = Infinity;
        panels.forEach(function (pn) { if (pn.v.orbit.idle < best) { best = pn.v.orbit.idle; lead = pn; } });
        var idle = lead.v.orbit.idle;
        var sw = reduced ? 0 : 0.12 * Math.sin(t * TAU / 26);
        var dsw = sw - sway; sway = sw;
        if (idle > 4 && !lead.v.orbit.dragging && !lead.v.orbit.anim) lead.v.view.yaw += dsw;
        panels.forEach(function (pn, i) {
          if (!shown(i)) return;
          if (pn !== lead) {
            pn.v.view.yaw = lead.v.view.yaw; pn.v.view.pitch = lead.v.view.pitch; pn.v.view.distance = lead.v.view.distance;
            pn.v.view.target.copy(lead.v.view.target);
          }
          var fk = st.fieldK;
          pn.plates[0].material.color.copy(neutral).lerp(plusC, fk);
          pn.plates[1].material.color.copy(neutral).lerp(minusC, fk);
          pn.plusL.show(fk > 0.5); pn.minusL.show(fk > 0.5);
          if (i === 2) pn.noteL.swap(st.heat ? 'Isı, bağlardan yeni elektronlar koparır' : INFO[2].note, dt);
          pn.statL.set(statusHtml(i));
          pn.update(t, dt);
          pn.v.render(dt);
        });
        lastT = t;
      },
      resize: function () { relayout(); },
      dispose: function () {
        panels.forEach(function (pn) { pn.v.dispose(); if (pn.div.parentNode) pn.div.parentNode.removeChild(pn.div); });
        fixed.dispose();
      }
    };
  });


  /* =====================================================================
   * Molekül yardımcıları (dizi tabanlı vektörler, ångström birimi)
   * ===================================================================== */
  function v3sub(a, b) { return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]; }
  function v3add(a, b) { return [a[0] + b[0], a[1] + b[1], a[2] + b[2]]; }
  function v3mul(a, s) { return [a[0] * s, a[1] * s, a[2] * s]; }
  function v3dot(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }
  function v3cross(a, b) { return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]; }
  function v3len(a) { return Math.sqrt(v3dot(a, a)); }
  function v3norm(a) { var l = v3len(a) || 1; return [a[0] / l, a[1] / l, a[2] / l]; }
  /* NeRF: place atom d from a, b, c with bond |cd|, angle b-c-d and torsion a-b-c-d */
  function nerf(a, b, c, bond, ang, tor) {
    var bc = v3norm(v3sub(c, b)), n = v3norm(v3cross(v3sub(b, a), bc)), m = v3cross(n, bc);
    return v3add(c, v3add(v3mul(bc, -bond * Math.cos(ang)), v3add(v3mul(m, bond * Math.sin(ang) * Math.cos(tor)), v3mul(n, bond * Math.sin(ang) * Math.sin(tor)))));
  }

  /* Two keratin α-helices in a parallel, left-handed coiled coil (Ångström units).
   * Backbone from ideal geometry (Engh & Huber; φ −57°, ψ −47°, ω 180°): right-handed helix,
   * 3,6 residues per turn, 1,5 Å rise, L-amino acids. Side chains are simplified to CH3
   * (alanine-like) except one cysteine per chain; their sulfur atoms form the interchain
   * S–S (disulfide) bridge: Cβ–S 1,81 Å, S–S 2,04 Å, Cβ–S–S ≈ 104°.
   * The supercoil pitch is shortened (real ≈ 140 Å) so the twist reads over a short segment. */
  function buildCoiledCoil(NR, PITCH) {
    var D = Math.PI / 180, phi = -57 * D, psi = -47 * D, CYSR = Math.floor(NR / 2) + 2;
    var N = [[0, 0, 0]], CA = [[1.458, 0, 0]], C = [nerf([0, 1, 0], [0, 0, 0], [1.458, 0, 0], 1.525, 111.2 * D, phi)];
    var i, k;
    for (i = 1; i < NR; i++) {
      N.push(nerf(N[i - 1], CA[i - 1], C[i - 1], 1.329, 116.2 * D, psi));
      CA.push(nerf(CA[i - 1], C[i - 1], N[i], 1.458, 121.7 * D, Math.PI));
      C.push(nerf(C[i - 1], N[i], CA[i], 1.525, 111.2 * D, phi));
    }
    var res = [];
    for (i = 0; i < NR; i++) {
      var r = { N: N[i], CA: CA[i], C: C[i] };
      r.O = nerf(N[i], CA[i], C[i], 1.231, 120.5 * D, psi + Math.PI);
      r.H = i > 0 ? v3add(N[i], v3mul(v3norm(v3add(v3norm(v3sub(N[i], C[i - 1])), v3norm(v3sub(N[i], CA[i])))), 1.01))
        : nerf(C[0], CA[0], N[0], 1.01, 109.5 * D, Math.PI);
      var bb = v3sub(CA[i], N[i]), cc = v3sub(C[i], CA[i]), aa = v3cross(bb, cc);
      r.CB = v3add(v3add(v3add(v3mul(aa, -0.58273431), v3mul(bb, 0.56802827)), v3mul(cc, -0.54067466)), CA[i]);
      var u1 = v3norm(v3sub(N[i], CA[i])), u2 = v3norm(v3sub(C[i], CA[i])), u3 = v3norm(v3sub(r.CB, CA[i]));
      r.HA = v3add(CA[i], v3mul(v3norm(v3mul(v3add(v3add(u1, u2), u3), -1)), 1.09));
      r.HB = [60, 180, 300].map(function (tor) { return nerf(N[i], CA[i], r.CB, 1.09, 109.5 * D, tor * D); });
      res.push(r);
    }
    var cents = [];
    for (i = 0; i + 3 < NR; i++) cents.push(v3mul(v3add(v3add(CA[i], CA[i + 1]), v3add(CA[i + 2], CA[i + 3])), 0.25));
    var mean = [0, 0, 0];
    cents.forEach(function (p) { mean = v3add(mean, p); });
    mean = v3mul(mean, 1 / cents.length);
    var ax = v3norm(v3sub(cents[cents.length - 1], cents[0]));
    var ub = v3cross(ax, [0, 0, 1]);
    ub = v3len(ub) < 0.1 ? v3norm(v3cross(ax, [0, 1, 0])) : v3norm(ub);
    var wb = v3cross(ax, ub);
    var loc = res.map(function (R) {
      var o = {};
      ['N', 'H', 'CA', 'HA', 'C', 'O', 'CB'].forEach(function (key) { var q = v3sub(R[key], mean); o[key] = [v3dot(q, ax), v3dot(q, ub), v3dot(q, wb)]; });
      o.HB = R.HB.map(function (p) { var q = v3sub(p, mean); return [v3dot(q, ax), v3dot(q, ub), v3dot(q, wb)]; });
      return o;
    });
    var R0 = 4.9, PSIF = 0, ROT = 0;
    function coil(lp, h) {
      var x = lp[0], th = h * Math.PI - TAU * x / PITCH, a = th + PSIF;
      var y = R0 * Math.cos(th) + lp[1] * Math.cos(a) - lp[2] * Math.sin(a);
      var z = R0 * Math.sin(th) + lp[1] * Math.sin(a) + lp[2] * Math.cos(a);
      var cr = Math.cos(ROT), sr = Math.sin(ROT);
      return [x, y * cr - z * sr, y * sr + z * cr];
    }
    /* choose the helix face so the middle cysteines sit ≈ 4,0 Å apart without clashes elsewhere */
    var bestF = 0, bestS = 1e9, CYS = CYSR;
    for (var pf = 0; pf < 360; pf += 5) {
      PSIF = pf * D;
      var minCB = 1e9;
      for (i = 0; i < NR; i++) for (var j = 0; j < NR; j++) {
        var d0 = v3len(v3sub(coil(loc[i].CB, 0), coil(loc[j].CB, 1)));
        if (d0 < minCB) minCB = d0;
      }
      if (minCB < 3.0) continue;
      for (i = CYSR - 3; i <= CYSR + 3; i++) {
        var sc = Math.abs(v3len(v3sub(coil(loc[i].CB, 0), coil(loc[i].CB, 1))) - 4.0) + Math.abs(i - CYSR) * 0.02;
        if (sc < bestS) { bestS = sc; bestF = PSIF; CYS = i; }
      }
    }
    PSIF = bestF;
    /* core (a/d) positions get leucine, the 'knobs into holes' of the coiled coil; rotamer chosen
     * from the common Leu rotamers by maximising the distance to every other heavy atom */
    var heavy = [], leu = {};
    for (k = 0; k < 2; k++) for (i = 0; i < NR; i++) ['N', 'CA', 'C', 'O', 'CB'].forEach(function (key) { heavy.push({ p: coil(loc[i][key], k), r: i, h: k }); });
    var ROTS = [[-65, 175], [-177, 65], [-172, 145], [-85, 65], [62, 80], [-65, -60], [-177, -60]];
    for (i = 0; i < NR; i++) {
      if (i === CYS) continue;
      var pc = coil(loc[i].CB, 0);
      if (Math.sqrt(pc[1] * pc[1] + pc[2] * pc[2]) > 4.2) continue;
      var R = res[i], bestL = null;
      ROTS.forEach(function (rt) {
        var CG = nerf(R.N, R.CA, R.CB, 1.53, 116.3 * D, rt[0] * D);
        var CD1 = nerf(R.CA, R.CB, CG, 1.52, 110.4 * D, rt[1] * D), CD2 = nerf(R.CA, R.CB, CG, 1.52, 110.6 * D, (rt[1] + 120) * D);
        var sc3 = [CG, CD1, CD2].map(function (p) { var q = v3sub(p, mean); return [v3dot(q, ax), v3dot(q, ub), v3dot(q, wb)]; });
        var m = 1e9;
        for (var hh = 0; hh < 2; hh++) {
          var mine = sc3.map(function (p) { return coil(p, hh); });
          heavy.forEach(function (Hh) { if (Hh.r === i && Hh.h === hh) return; mine.forEach(function (q) { m = Math.min(m, v3len(v3sub(q, Hh.p))); }); });
          if (hh === 0) { var oth = sc3.map(function (p) { return coil(p, 1); }); mine.forEach(function (q) { oth.forEach(function (o) { m = Math.min(m, v3len(v3sub(q, o))); }); }); }
        }
        if (!bestL || m > bestL.m) bestL = { m: m, rt: rt, CG: CG, CD1: CD1, CD2: CD2 };
      });
      if (bestL.m < 2.9) continue;   /* a-layer residues pointing straight at each other stay alanine */
      var rt0 = bestL.rt, Lh = { CG: bestL.CG, CD1: bestL.CD1, CD2: bestL.CD2 };
      Lh.HB = [rt0[0] + 120, rt0[0] - 120].map(function (tor) { return nerf(R.N, R.CA, R.CB, 1.09, 109.5 * D, tor * D); });
      Lh.HG = nerf(R.CA, R.CB, Lh.CG, 1.09, 107 * D, (rt0[1] - 120) * D);
      Lh.HD1 = [60, 180, 300].map(function (tor) { return nerf(R.CB, Lh.CG, Lh.CD1, 1.09, 109.5 * D, tor * D); });
      Lh.HD2 = [60, 180, 300].map(function (tor) { return nerf(R.CB, Lh.CG, Lh.CD2, 1.09, 109.5 * D, tor * D); });
      ['CG', 'CD1', 'CD2', 'HG'].forEach(function (key) { var q = v3sub(Lh[key], mean); Lh[key] = [v3dot(q, ax), v3dot(q, ub), v3dot(q, wb)]; });
      ['HB', 'HD1', 'HD2'].forEach(function (key) { Lh[key] = Lh[key].map(function (p) { var q = v3sub(p, mean); return [v3dot(q, ax), v3dot(q, ub), v3dot(q, wb)]; }); });
      leu[i] = Lh;
      for (k = 0; k < 2; k++) ['CG', 'CD1', 'CD2'].forEach(function (key) { heavy.push({ p: coil(Lh[key], k), r: i, h: k }); });
    }
    /* rotate the dimer about x so the cysteine Cβ atoms are stacked vertically (bridge faces the viewer) */
    var c0 = coil(loc[CYS].CB, 0), c1 = coil(loc[CYS].CB, 1);
    ROT = -Math.atan2(c0[2] - c1[2], c0[1] - c1[1]);
    c0 = coil(loc[CYS].CB, 0); c1 = coil(loc[CYS].CB, 1);
    if (c0[1] < c1[1]) { ROT += Math.PI; c0 = coil(loc[CYS].CB, 0); c1 = coil(loc[CYS].CB, 1); }
    /* disulfide: relax S positions to the bond lengths and the 1–3 distance of a 104° angle */
    var Mid = v3mul(v3add(c0, c1), 0.5);
    var S0 = v3add(Mid, [0.55, 1.0, 1.15]), S1 = v3add(Mid, [-0.55, -1.0, 1.15]);
    var cons = [[c0, S0, 1.81, 1], [S0, S1, 2.04, 0], [S1, c1, 1.81, 2], [c0, S1, 3.04, 1], [c1, S0, 3.04, 2]];
    for (var it = 0; it < 240; it++) {
      cons.forEach(function (q) {
        var a = q[0], b = q[1], d = v3sub(b, a), L = v3len(d), corr = (L - q[2]) / L, jj;
        if (q[3] === 0) { for (jj = 0; jj < 3; jj++) { a[jj] += d[jj] * corr * 0.5; b[jj] -= d[jj] * corr * 0.5; } }
        else { for (jj = 0; jj < 3; jj++) b[jj] -= d[jj] * corr; }
      });
    }
    var atoms = [], bonds = [], pairs = [];
    function addAtom(e, p, h) { atoms.push({ e: e, p: p, h: h }); return atoms.length - 1; }
    var ssIdx = [];
    for (k = 0; k < 2; k++) {
      var prevC = -1, Sk = k ? S1 : S0;
      for (i = 0; i < NR; i++) {
        var L = loc[i];
        var iN = addAtom('N', coil(L.N, k), k), iH = addAtom('H', coil(L.H, k), k), iCA = addAtom('C', coil(L.CA, k), k);
        var iHA = addAtom('H', coil(L.HA, k), k), iC = addAtom('C', coil(L.C, k), k), iO = addAtom('O', coil(L.O, k), k);
        var iCB = addAtom('C', coil(L.CB, k), k);
        bonds.push([iN, iH], [iN, iCA, 'bb'], [iCA, iHA], [iCA, iC, 'bb'], [iC, iO, 'bb'], [iCA, iCB]);
        pairs.push([iN, iCA, 1], [iCA, iC, 1], [iC, iO, 2]);
        if (prevC >= 0) { bonds.push([prevC, iN, 'bb']); pairs.push([prevC, iN, 1]); }
        if (leu[i]) {
          var Lq = leu[i];
          var iCG = addAtom('C', coil(Lq.CG, k), k), iCD1 = addAtom('C', coil(Lq.CD1, k), k), iCD2 = addAtom('C', coil(Lq.CD2, k), k);
          bonds.push([iCB, iCG], [iCG, iCD1], [iCG, iCD2]);
          Lq.HB.forEach(function (p) { bonds.push([iCB, addAtom('H', coil(p, k), k)]); });
          bonds.push([iCG, addAtom('H', coil(Lq.HG, k), k)]);
          Lq.HD1.forEach(function (p) { bonds.push([iCD1, addAtom('H', coil(p, k), k)]); });
          Lq.HD2.forEach(function (p) { bonds.push([iCD2, addAtom('H', coil(p, k), k)]); });
          prevC = iC;
          continue;
        }
        var hb = L.HB.map(function (p) { return coil(p, k); });
        var skip = -1;
        if (i === CYS) {
          var best = -2, cbp = atoms[iCB].p, dS = v3norm(v3sub(Sk, cbp));
          hb.forEach(function (p, jh) { var dd = v3dot(v3norm(v3sub(p, cbp)), dS); if (dd > best) { best = dd; skip = jh; } });
          var iS = addAtom('S', Sk, k);
          bonds.push([iCB, iS]); pairs.push([iCB, iS, 1]);
          ssIdx.push(iS);
        }
        hb.forEach(function (p, jh) { if (jh !== skip) { var ih = addAtom('H', p, k); bonds.push([iCB, ih]); } });
        prevC = iC;
      }
    }
    bonds.push([ssIdx[0], ssIdx[1], 'ss']);
    pairs.push([ssIdx[0], ssIdx[1], 1]);
    /* centre line of each helix along the supercoil, for the translucent sheaths */
    function axisPt(h, x) { var th = h * Math.PI - TAU * x / PITCH, y = R0 * Math.cos(th), z = R0 * Math.sin(th), cr = Math.cos(ROT), sr = Math.sin(ROT); return [x, y * cr - z * sr, y * sr + z * cr]; }
    return { atoms: atoms, bonds: bonds, pairs: pairs, ss: ssIdx, nres: NR, axisPt: axisPt };
  }

  /* Analog panel ammeter: warm-white case, cream dial with a mirror arc, black needle (sc = size) */
  function makeAmmeter(sc) {
    var THREE = window.THREE;
    sc = sc || 1;
    var g = new THREE.Group();
    var W = 1.02 * sc, H = 0.78 * sc, Dp = 0.28 * sc;
    var body = new THREE.Mesh(roundedBoxGeo(W, H, Dp, 0.075 * sc, 4), K.mat.std(0xECEBE6, 0.5, 0));
    body.castShadow = true; body.receiveShadow = true;
    g.add(body);
    var bezel = new THREE.Mesh(roundedBoxGeo(W - 0.1 * sc, H - 0.2 * sc, 0.02 * sc, 0.01 * sc, 2), K.mat.std(0x2A2D33, 0.45, 0.1));
    bezel.position.set(0, 0.06 * sc, Dp / 2 + 0.002);
    g.add(bezel);
    var dialW = W - 0.14 * sc, dialH = H - 0.24 * sc;
    var PIVY = -0.2 * sc;
    var A0 = 48 * Math.PI / 180;
    var tex = liveTexture(640, Math.round(640 * dialH / dialW), function (ctx, w, h) {
      var kx = w / dialW * sc;
      ctx.fillStyle = '#F6F3EA';
      ctx.fillRect(0, 0, w, h);
      var px = w / 2, py = h / 2 - PIVY / sc * kx;
      var R = 0.335 * kx;
      ctx.lineCap = 'round';
      ctx.strokeStyle = 'rgba(150,156,166,0.55)'; ctx.lineWidth = 0.035 * kx;
      ctx.beginPath(); ctx.arc(px, py, R - 0.075 * kx, -Math.PI / 2 - A0, -Math.PI / 2 + A0); ctx.stroke();
      ctx.strokeStyle = '#15171C'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(px, py, R, -Math.PI / 2 - A0, -Math.PI / 2 + A0); ctx.stroke();
      for (var t2 = 0; t2 <= 20; t2++) {
        var a = -A0 + 2 * A0 * t2 / 20, major = t2 % 5 === 0;
        var r1 = R, r2 = R + (major ? 0.05 : 0.026) * kx;
        ctx.lineWidth = major ? 2.4 : 1.4;
        ctx.beginPath();
        ctx.moveTo(px + r1 * Math.sin(a), py - r1 * Math.cos(a));
        ctx.lineTo(px + r2 * Math.sin(a), py - r2 * Math.cos(a));
        ctx.stroke();
      }
      ctx.fillStyle = '#15171C';
      ctx.font = '500 ' + Math.round(0.075 * kx) + 'px ' + K.fonts.mono;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      var rz = R + 0.105 * kx;
      ctx.fillText('0', px + rz * Math.sin(-A0), py - rz * Math.cos(-A0));
      ctx.font = '600 ' + Math.round(0.11 * kx) + 'px ' + K.fonts.sans;
      ctx.fillText('A', px, py - 0.15 * kx);
    });
    var dial = new THREE.Mesh(new THREE.PlaneGeometry(dialW, dialH), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.75, metalness: 0 }));
    dial.position.set(0, 0.06 * sc, Dp / 2 + 0.014 * sc);
    g.add(dial);
    var pivot = new THREE.Group();
    pivot.position.set(0, 0.06 * sc + PIVY, Dp / 2 + 0.022 * sc);
    g.add(pivot);
    var needle = new THREE.Mesh(new THREE.BoxGeometry(0.01 * sc, 0.36 * sc, 0.004 * sc), K.mat.std(0x15171C, 0.4, 0));
    needle.position.y = 0.17 * sc;
    pivot.add(needle);
    var cap = new THREE.Mesh(new THREE.CylinderGeometry(0.03 * sc, 0.03 * sc, 0.014 * sc, 24), K.mat.std(0x2A2D33, 0.35, 0.3));
    cap.rotation.x = Math.PI / 2;
    pivot.add(cap);
    var glass = new THREE.Mesh(new THREE.PlaneGeometry(dialW, dialH),
      new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.04, metalness: 0, transparent: true, opacity: 0.1, clearcoat: 1, depthWrite: false }));
    glass.position.set(0, 0.06 * sc, Dp / 2 + 0.036 * sc);
    g.add(glass);
    /* binding posts on top: black (−) left, red (+) right */
    var posts = [];
    [[-0.3, 0x1E2128], [0.3, 0xB3352A]].forEach(function (q) {
      var post = new THREE.Group();
      var nut = new THREE.Mesh(new THREE.CylinderGeometry(0.055 * sc, 0.06 * sc, 0.07 * sc, 6), K.mat.std(q[1], 0.45, 0));
      var stud = new THREE.Mesh(new THREE.CylinderGeometry(0.02 * sc, 0.02 * sc, 0.06 * sc, 12), K.mat.copper());
      stud.position.y = 0.06 * sc;
      post.add(nut, stud);
      post.position.set(q[0] * sc, H / 2 + 0.03 * sc, 0);
      nut.castShadow = true;
      g.add(post);
      posts.push([q[0] * sc, H / 2 + 0.09 * sc, 0]);
    });
    return { group: g, pivot: pivot, A0: A0, posts: posts, h: H };
  }

  /* 9 V battery standing upright (48,5 × 26,5 × 17,5 mm), snap terminals on top: round +, hexagonal − */
  function makeBattery9V(sc) {
    var THREE = window.THREE;
    var g = new THREE.Group();
    var w = 26.5 * sc, h = 48.5 * sc, d = 17.5 * sc;
    var body = new THREE.Mesh(roundedBoxGeo(w, h, d, 2.2 * sc, 4), K.mat.std(0x2B2F37, 0.42, 0.15));
    body.castShadow = true; body.receiveShadow = true;
    g.add(body);
    var tex = liveTexture(256, 470, function (ctx, W, Hh) {
      ctx.fillStyle = '#2B2F37'; ctx.fillRect(0, 0, W, Hh);
      ctx.fillStyle = '#C8693A'; ctx.fillRect(0, Hh * 0.62, W, Hh * 0.025);
      ctx.fillStyle = '#F1F0EB';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = '600 ' + Math.round(W * 0.34) + 'px ' + K.fonts.mono;
      ctx.fillText('9 V', W / 2, Hh * 0.44);
      ctx.font = '500 ' + Math.round(W * 0.15) + 'px ' + K.fonts.mono;
      ctx.fillText('+', W * 0.27, Hh * 0.1);
      ctx.fillText('−', W * 0.73, Hh * 0.1);
    });
    var face = new THREE.Mesh(new THREE.PlaneGeometry(w - 3 * sc, h - 4 * sc), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.5 }));
    face.position.z = d / 2 + 0.002;
    g.add(face);
    var steel = K.mat.steel();
    var plus = new THREE.Mesh(new THREE.CylinderGeometry(2.6 * sc, 2.6 * sc, 3.6 * sc, 20), steel);
    plus.position.set(-6.35 * sc, h / 2 + 1.8 * sc, 0);
    var minus = new THREE.Mesh(new THREE.CylinderGeometry(4.2 * sc, 4.2 * sc, 3.2 * sc, 6), steel);
    minus.position.set(6.35 * sc, h / 2 + 1.6 * sc, 0);
    plus.castShadow = minus.castShadow = true;
    g.add(plus, minus);
    return { group: g, plus: [-6.35 * sc, h / 2 + 3.4 * sc, 0], minus: [6.35 * sc, h / 2 + 3.0 * sc, 0], h: h };
  }

  /* =====================================================================
   * keratin-water · S 680×520 · light
   * Kuru keratin yalıtkandır; ıslak yüzeyde sudaki iyonlar akımı taşır.
   * ===================================================================== */
  K.register('keratin-water', function (el, opts) {
    var THREE = window.THREE;
    K.renderer();
    opts = opts || {};
    var theme = opts.theme || 'light';
    var reduced = K.reducedMotion;
    var S = 0.1;                                   /* scene units per ångström */
    var GROUND = -2.2;
    var BOX = boxWH(el, 680, 520);
    var HOME = { yaw: 0.1, pitch: 0.28, distance: BOX.wide ? 9.9 : 11.9, target: [0, BOX.wide ? -0.5 : -0.36, 0.3] };
    var v = K.stage3d(el, {
      theme: theme, fov: 24, distance: HOME.distance, yaw: HOME.yaw, pitch: HOME.pitch, target: HOME.target,
      size: 3.0, ground: GROUND, minPitch: -0.05, maxPitch: 1.0, minDistance: 7, maxDistance: 19
    });
    if (v.lights) {
      v.lights.key.intensity = 1.45; v.lights.hemi.intensity = 0.55;
      if (v.lights.ground) v.lights.ground.material.opacity = 0.1;
      /* shadows only for the bench objects: a 1024 map over the bench is plenty */
      v.lights.key.shadow.mapSize.set(1024, 1024);
      var kc = v.lights.key.shadow.camera;
      kc.left = -3.4; kc.right = 3.4; kc.top = 3.4; kc.bottom = -3.4;
    }
    var scene = v.scene;
    var fixed = makeFixed(el);
    var st = { auto: true, surface: 'kuru', wetK: 0, ext: 0, curK: 0, needle: 0, nVel: 0, rock: 0, rockT: 0 };

    /* ---------- keratin coiled coil ---------- */
    var M = buildCoiledCoil(28, 84);
    var EL = {
      C: { c: 0x4A4F5A, r: 0.4 }, H: { c: 0xF1F0EB, r: 0.25 }, O: { c: 0xC0533F, r: 0.4 },
      N: { c: 0x3F5FBF, r: 0.4 }, S: { c: 0xD8B43C, r: 0.6 }
    };
    var gAtom = new THREE.SphereGeometry(1, 10, 7), gAtomLo = new THREE.SphereGeometry(1, 8, 6);
    var gIco = new THREE.IcosahedronGeometry(1, 0);
    var gCyl = new THREE.CylinderGeometry(1, 1, 1, 6, 1, true);
    var byEl = {};
    M.atoms.forEach(function (a, i) { (byEl[a.e] = byEl[a.e] || []).push(i); });
    var kGroup = new THREE.Group();
    scene.add(kGroup);
    var minX = Infinity, maxX = -Infinity;
    M.atoms.forEach(function (a) { minX = Math.min(minX, a.p[0]); maxX = Math.max(maxX, a.p[0]); });
    Object.keys(byEl).forEach(function (e) {
      var list = byEl[e];
      var mat = K.mat.std(EL[e].c, e === 'H' ? 0.5 : 0.38, 0.02);
      if (e === 'S') mat.setValues({ emissive: new THREE.Color(0x6B5410), emissiveIntensity: 0.3 });
      var mesh = makeInst(e === 'H' ? gAtomLo : gAtom, mat, list.length);
      list.forEach(function (ai, j) { var p = M.atoms[ai].p; mesh.put(j, p[0] * S, p[1] * S, p[2] * S, EL[e].r * S); });
      mesh.commit();
      kGroup.add(mesh);
    });
    var nBB = 0;
    M.bonds.forEach(function (b) { if (b[2] === 'bb') nBB++; });
    var bbMesh = new THREE.InstancedMesh(gCyl, K.mat.std(0x6E7480, 0.4, 0.05), nBB);
    var bMesh = new THREE.InstancedMesh(gCyl, K.mat.std(0xA3A8B2, 0.45, 0), M.bonds.length - 1 - nBB);
    var m4 = new THREE.Matrix4(), bi = 0, bbi = 0;
    M.bonds.forEach(function (b) {
      if (b[2] === 'ss') return;
      var A = M.atoms[b[0]].p, B = M.atoms[b[1]].p;
      if (b[2] === 'bb') { bondMatrix(m4, A[0] * S, A[1] * S, A[2] * S, B[0] * S, B[1] * S, B[2] * S, 0.21 * S); bbMesh.setMatrixAt(bbi++, m4); }
      else { bondMatrix(m4, A[0] * S, A[1] * S, A[2] * S, B[0] * S, B[1] * S, B[2] * S, 0.12 * S); bMesh.setMatrixAt(bi++, m4); }
    });
    kGroup.add(bbMesh, bMesh);
    var sA = M.atoms[M.ss[0]].p, sB = M.atoms[M.ss[1]].p;
    var ssBond = new THREE.Mesh(gCyl, K.mat.std(0xD8B43C, 0.35, 0.05, { emissive: 0x6B5410, emissiveIntensity: 0.4 }));
    bondMatrix(ssBond.matrix, sA[0] * S, sA[1] * S, sA[2] * S, sB[0] * S, sB[1] * S, sB[2] * S, 0.2 * S);
    ssBond.matrixAutoUpdate = false;
    kGroup.add(ssBond);
    var ssMid = new THREE.Vector3((sA[0] + sB[0]) / 2 * S, (sA[1] + sB[1]) / 2 * S, (sA[2] + sB[2]) / 2 * S);
    var ssHalo = new THREE.Mesh(gAtom, new THREE.MeshBasicMaterial({ color: 0xF2D27A, transparent: true, opacity: 0.22, depthWrite: false }));
    ssHalo.position.copy(ssMid);
    ssHalo.scale.set(2.3 * S, 2.3 * S, 2.3 * S);
    ssHalo.renderOrder = 3;
    kGroup.add(ssHalo);

    /* bonding electron pairs (backbone and disulfide), jiggling in place */
    var camDir = new THREE.Vector3(Math.sin(HOME.yaw) * Math.cos(HOME.pitch), Math.sin(HOME.pitch), Math.cos(HOME.yaw) * Math.cos(HOME.pitch));
    var eSlots = [];
    var dv = new THREE.Vector3(), pv = new THREE.Vector3();
    M.pairs.forEach(function (pr) {
      var A = M.atoms[pr[0]].p, B = M.atoms[pr[1]].p;
      var mx = (A[0] + B[0]) / 2 * S, my = (A[1] + B[1]) / 2 * S, mz = (A[2] + B[2]) / 2 * S;
      dv.set(B[0] - A[0], B[1] - A[1], B[2] - A[2]).normalize();
      pv.crossVectors(dv, camDir).normalize();
      var off = 0.3 * S;
      if (pr[2] === 2) {
        [-1, 1].forEach(function (sa) {
          [-1, 1].forEach(function (sp) {
            eSlots.push([mx + pv.x * off * sp + dv.x * 0.17 * S * sa, my + pv.y * off * sp + dv.y * 0.17 * S * sa, mz + pv.z * off * sp + dv.z * 0.17 * S * sa]);
          });
        });
      } else {
        [-1, 1].forEach(function (sp) { eSlots.push([mx + pv.x * off * sp, my + pv.y * off * sp, mz + pv.z * off * sp]); });
      }
    });
    var nE = eSlots.length;
    var eMesh = makeInst(gIco, K.mat.electron(false), nE);
    kGroup.add(eMesh);
    var ePh = new Float32Array(nE * 3), rr = K.rng(23), i;
    for (i = 0; i < nE * 3; i++) ePh[i] = rr() * TAU;

    /* ---------- electrodes ---------- */
    var XP = (Math.max(-minX, maxX) + 2.2) * S;
    var plateY0 = -1.18, plateY1 = 1.62, plateH = plateY1 - plateY0, plateY = (plateY0 + plateY1) / 2;
    var plateGeo = roundedBoxGeo(2.1, plateH, 0.07, 0.03, 3);
    [-1, 1].forEach(function (sg) {
      var m = K.mat.tin({ roughness: 0.32 });
      m.color.set(sg < 0 ? 0xE2B496 : 0xAFBDE8);
      var p = new THREE.Mesh(plateGeo, m);
      p.rotation.y = Math.PI / 2;
      p.position.set(sg * XP, plateY, 0);
      p.receiveShadow = true;
      scene.add(p);
    });
    var plusL = v.label('+', { at: [-XP, plateY + 0.2, 0], cls: 'value kgc-plus', dx: -58 });
    var minusL = v.label('−', { at: [XP, plateY + 0.2, 0], cls: 'value kgc-plus', dx: 44 });
    plusL.el.style.fontSize = minusL.el.style.fontSize = '22px';
    plusL.el.style.color = P.copper; minusL.el.style.color = P.blue;

    /* ---------- circuit on the bench: 9 V battery, ammeter, wires ---------- */
    var bat = makeBattery9V(0.017);
    bat.group.position.set(-0.62, GROUND + bat.h / 2, 0.75);
    scene.add(bat.group);
    var am = makeAmmeter(0.82);
    am.group.position.set(0.66, GROUND + am.h / 2 + 0.005, 0.78);
    am.group.rotation.x = -0.12;
    scene.add(am.group);
    am.group.updateMatrixWorld(true);
    bat.group.updateMatrixWorld(true);
    function worldOf(obj, p) { return new THREE.Vector3(p[0], p[1], p[2]).applyMatrix4(obj.matrixWorld); }
    var bp = worldOf(bat.group, bat.plus), bm = worldOf(bat.group, bat.minus);
    var aL = worldOf(am.group, am.posts[0]), aR = worldOf(am.group, am.posts[1]);
    var red = K.mat.plasticRed({ roughness: 0.4 }), black = K.mat.plasticBlack({ roughness: 0.42 });
    var wR = 0.02;
    scene.add(K.wire([[-XP, plateY0 + 0.03, 0.2], [-XP, plateY0 - 0.25, 0.3], [-XP + 0.25, plateY0 - 0.5, 0.55], [bp.x - 0.3, bp.y + 0.25, bp.z], [bp.x, bp.y + 0.1, bp.z], [bp.x, bp.y - 0.01, bp.z]], { radius: wR, material: red, tension: 0.5 }));
    scene.add(K.wire([[bm.x, bm.y - 0.01, bm.z], [bm.x, bm.y + 0.14, bm.z], [(bm.x + aL.x) / 2, Math.max(bm.y, aL.y) + 0.24, (bm.z + aL.z) / 2], [aL.x, aL.y + 0.14, aL.z], [aL.x, aL.y - 0.01, aL.z]], { radius: wR, material: black, tension: 0.5 }));
    scene.add(K.wire([[aR.x, aR.y - 0.01, aR.z], [aR.x, aR.y + 0.14, aR.z], [aR.x + 0.4, aR.y + 0.32, aR.z - 0.1], [XP - 0.25, plateY0 - 0.5, 0.55], [XP, plateY0 - 0.25, 0.3], [XP, plateY0 + 0.03, 0.2]], { radius: wR, material: black, tension: 0.5 }));

    /* ---------- water film: a height field draped over the protein surface ---------- */
    var FX0 = -XP + 0.035, FX1 = XP - 0.035, FZ = 0.68, NXF = 66, NZF = 16, TH = 0.4;
    var Hgrid = new Float32Array(NXF * NZF);
    (function () {
      var ix, iz, j;
      for (ix = 0; ix < NXF; ix++) for (iz = 0; iz < NZF; iz++) {
        var x = lerp(FX0, FX1, ix / (NXF - 1)) / S, z = lerp(-FZ, FZ, iz / (NZF - 1)) / S, hmax = -1e9;
        for (j = 0; j < M.atoms.length; j++) {
          var p = M.atoms[j].p, rv = (M.atoms[j].e === 'H' ? 1.1 : 1.6) + 0.8;
          var dx = p[0] - x, dz = p[2] - z, q = rv * rv - dx * dx - dz * dz;
          if (q > 0) { var hy = p[1] + Math.sqrt(q); if (hy > hmax) hmax = hy; }
        }
        Hgrid[ix * NZF + iz] = hmax;
      }
      var lowest = 1e9;
      for (j = 0; j < Hgrid.length; j++) if (Hgrid[j] > -1e8 && Hgrid[j] < lowest) lowest = Hgrid[j];
      for (j = 0; j < Hgrid.length; j++) if (Hgrid[j] < -1e8) Hgrid[j] = lowest;
      for (var pass = 0; pass < 9; pass++) {
        var cp = Hgrid.slice();
        for (ix = 0; ix < NXF; ix++) for (iz = 0; iz < NZF; iz++) {
          var s = 0, n = 0;
          for (var a = -1; a <= 1; a++) for (var b = -1; b <= 1; b++) {
            var xx = ix + a, zz = iz + b;
            if (xx < 0 || zz < 0 || xx >= NXF || zz >= NZF) continue;
            s += cp[xx * NZF + zz]; n++;
          }
          Hgrid[ix * NZF + iz] = s / n;
        }
      }
      for (j = 0; j < Hgrid.length; j++) Hgrid[j] *= S;
    })();
    function thAt(z) { return TH * Math.sqrt(Math.max(0, 1 - Math.pow(Math.abs(z) / FZ, 4))); }
    function hAt(x, z) {
      var fx = clamp((x - FX0) / (FX1 - FX0), 0, 1) * (NXF - 1), fz = clamp((z + FZ) / (2 * FZ), 0, 1) * (NZF - 1);
      var x0 = Math.floor(fx), z0 = Math.floor(fz), x1 = Math.min(NXF - 1, x0 + 1), z1 = Math.min(NZF - 1, z0 + 1);
      var tx = fx - x0, tz = fz - z0;
      return lerp(lerp(Hgrid[x0 * NZF + z0], Hgrid[x0 * NZF + z1], tz), lerp(Hgrid[x1 * NZF + z0], Hgrid[x1 * NZF + z1], tz), tx);
    }
    var filmGeo = new THREE.BufferGeometry();
    var fPos = new Float32Array(NXF * NZF * 2 * 3);
    var fIdx = [];
    function vi(ix, iz, top) { return (top * NXF * NZF) + ix * NZF + iz; }
    for (var ix = 0; ix < NXF - 1; ix++) for (var iz = 0; iz < NZF - 1; iz++) {
      var a = vi(ix, iz, 1), b = vi(ix + 1, iz, 1), c = vi(ix + 1, iz + 1, 1), d = vi(ix, iz + 1, 1);
      fIdx.push(a, d, b, b, d, c);
      a = vi(ix, iz, 0); b = vi(ix + 1, iz, 0); c = vi(ix + 1, iz + 1, 0); d = vi(ix, iz + 1, 0);
      fIdx.push(a, b, d, b, c, d);
    }
    filmGeo.setIndex(fIdx);
    filmGeo.setAttribute('position', new THREE.BufferAttribute(fPos, 3));
    var filmMat = new THREE.MeshPhysicalMaterial({
      color: 0x8DBCDD, roughness: 0.1, metalness: 0, transparent: true, opacity: 0,
      clearcoat: 0.5, clearcoatRoughness: 0.1, envMapIntensity: 0.8, depthWrite: false, side: THREE.DoubleSide
    });
    var film = new THREE.Mesh(filmGeo, filmMat);
    film.renderOrder = 2;
    scene.add(film);
    function updateFilm(ext, t) {
      var half = (FX1 - FX0) / 2, cx0 = (FX0 + FX1) / 2, reach = ext * (half + 0.25);
      for (var ix = 0; ix < NXF; ix++) {
        var x = lerp(FX0, FX1, ix / (NXF - 1));
        var front = sstep(reach, reach - 0.3, Math.abs(x - cx0));
        for (var iz = 0; iz < NZF; iz++) {
          var z = lerp(-FZ, FZ, iz / (NZF - 1));
          var edge = Math.sqrt(Math.max(0, 1 - Math.pow(Math.abs(z) / FZ, 4)));
          var base = Hgrid[ix * NZF + iz] - 0.06;
          var ripple = reduced ? 0 : 0.01 * Math.sin(x * 9 + t * 1.6) * Math.sin(z * 7 - t * 1.1);
          var th = TH * edge * front;
          var o1 = vi(ix, iz, 1) * 3, o0 = vi(ix, iz, 0) * 3;
          fPos[o1] = x; fPos[o1 + 1] = base + th + (th > 0.01 ? ripple : 0); fPos[o1 + 2] = z;
          fPos[o0] = x; fPos[o0 + 1] = base; fPos[o0 + 2] = z;
        }
      }
      filmGeo.attributes.position.needsUpdate = true;
      filmGeo.computeVertexNormals();
    }

    /* ---------- water molecules and hydrated ions ---------- */
    var WR = { O: 0.47 * S, H: 0.3 * S }, OH = 0.96 * S, HOH = 104.5 * Math.PI / 180;
    var RNA = 0.8 * S, RCL = 1.12 * S;
    var rngW = K.rng(77);
    var waters = [], ions = [];
    function randQuat(r) {
      var u1 = r(), u2 = r(), u3 = r();
      var qa = Math.sqrt(1 - u1), qb = Math.sqrt(u1);
      return new THREE.Quaternion(qa * Math.sin(TAU * u2), qa * Math.cos(TAU * u2), qb * Math.sin(TAU * u3), qb * Math.cos(TAU * u3));
    }
    var XI = FX1 - 0.14, ZI = FZ - 0.3;
    var occupied = [];
    function free2(x, z, r) {
      for (var j = 0; j < occupied.length; j++) { var o = occupied[j]; var dx = o[0] - x, dz = o[1] - z; if (dx * dx + dz * dz < (r + o[2]) * (r + o[2])) return false; }
      return true;
    }
    /* 4 Na+ and 4 Cl− (charge balanced), each with 4 hydration waters */
    var ionSpec = ['na', 'cl', 'na', 'cl', 'na', 'cl', 'na', 'cl'];
    ionSpec.forEach(function (typ, n) {
      var x, z, tries = 0;
      do { x = lerp(-XI + 0.3, XI - 0.3, (n + 0.5) / ionSpec.length) + (rngW() - 0.5) * 0.2; z = (rngW() * 2 - 1) * (ZI - 0.1); tries++; } while (!free2(x, z, 0.38) && tries < 40);
      occupied.push([x, z, 0.38]);
      var ion = { typ: typ, x0: x, x: x, z: z, y0: 0.55, ph: [rngW() * TAU, rngW() * TAU, rngW() * TAU], shell: [], w: rngW() * 0.6 + 0.3 };
      [[1, 1, 1], [1, -1, -1], [-1, 1, -1], [-1, -1, 1]].forEach(function (dd) {
        ion.shell.push({ dir: new THREE.Vector3(dd[0], dd[1], dd[2]).normalize(), tw: rngW() * TAU });
      });
      ions.push(ion);
    });
    var NFW = 34;
    for (i = 0; i < NFW; i++) {
      var wx0, wz0, tries2 = 0;
      do { wx0 = (rngW() * 2 - 1) * XI; wz0 = (rngW() * 2 - 1) * ZI; tries2++; } while (!free2(wx0, wz0, 0.15) && tries2 < 60);
      occupied.push([wx0, wz0, 0.15]);
      waters.push({ x: wx0, z: wz0, y0: 0.3 + rngW() * 0.4, q: randQuat(rngW), ax: new THREE.Vector3(rngW() - 0.5, rngW() - 0.5, rngW() - 0.5).normalize(), w: (rngW() * 0.8 + 0.4) * (rngW() < 0.5 ? -1 : 1), ph: [rngW() * TAU, rngW() * TAU, rngW() * TAU] });
    }
    var NW = NFW + ions.length * 4;
    var wO = makeInst(gAtomLo, K.mat.std(EL.O.c, 0.32, 0), NW);
    var wH = makeInst(gAtomLo, K.mat.std(EL.H.c, 0.4, 0), NW * 2);
    var naMesh = makeInst(gAtom, K.mat.std(0xC8693A, 0.34, 0.25), 4);
    var clMesh = makeInst(gAtom, K.mat.std(0x5873C9, 0.34, 0.1), 4);
    /* soft charge halos make the ions read as charged particles, not as more atoms */
    var naHalo = makeInst(gAtom, new THREE.MeshBasicMaterial({ color: 0xC8693A, transparent: true, opacity: 0.16, depthWrite: false }), 4);
    var clHalo = makeInst(gAtom, new THREE.MeshBasicMaterial({ color: 0x5873C9, transparent: true, opacity: 0.16, depthWrite: false }), 4);
    naHalo.renderOrder = clHalo.renderOrder = 3;
    naMesh.material.transparent = clMesh.material.transparent = true; naMesh.renderOrder = clMesh.renderOrder = 4;
    scene.add(wO, wH, naMesh, clMesh, naHalo, clHalo);
    var hL = new THREE.Vector3(Math.sin(HOH / 2) * OH, Math.cos(HOH / 2) * OH, 0), hR = new THREE.Vector3(-Math.sin(HOH / 2) * OH, Math.cos(HOH / 2) * OH, 0);
    var hLn = hL.clone().normalize();
    var tq = new THREE.Quaternion(), tq2 = new THREE.Quaternion(), qIon = new THREE.Quaternion();
    var tv = new THREE.Vector3(), tv2 = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0), xAxis = new THREE.Vector3(1, 0, 0), qa = new THREE.Quaternion(), qb = new THREE.Quaternion();
    function putWater(slot, ox, oy, oz, q, sc) {
      wO.put(slot, ox, oy, oz, WR.O * sc);
      tv.copy(hL).applyQuaternion(q); wH.put(slot * 2, ox + tv.x, oy + tv.y, oz + tv.z, WR.H * sc);
      tv.copy(hR).applyQuaternion(q); wH.put(slot * 2 + 1, ox + tv.x, oy + tv.y, oz + tv.z, WR.H * sc);
    }
    var naTagIon = ions[2], clTagIon = ions[5];
    var naTag = v.label('Na' + sup('+'), { cls: 'tag', html: true, dy: -17, at: new THREE.Vector3() });
    var clTag = v.label('Cl' + sup('−'), { cls: 'tag', html: true, dy: -19, at: new THREE.Vector3() });
    [naTag, clTag].forEach(function (L) { L.el.style.letterSpacing = '0'; L.el.style.fontSize = '12px'; L.el.style.fontWeight = '600'; });
    naTag.el.style.color = P.copper; clTag.el.style.color = P.blue;

    /* ---------- labels ---------- */
    var hp = new THREE.Vector3();
    (function () { /* a backbone carbon of the upper helix in the left third */
      var best = -1e9;
      M.atoms.forEach(function (a) { var p = a.p; if (a.e === 'C' && p[0] < -11 && p[0] > -15) { var sc2 = p[1] + 0.2 * p[2]; if (sc2 > best) { best = sc2; hp.set(p[0] * S, p[1] * S, p[2] * S); } } });
    })();
    /* anchors on the molecule follow its rocking */
    function onMol(p) { var out = new THREE.Vector3(); return function () { return out.copy(p).applyMatrix4(kGroup.matrixWorld); }; }
    var lHelix = v.label('α-sarmal: keratin zinciri', { at: onMol(hp), cls: 'note', dx: -14, dy: -52, line: true, align: 'center', valign: 'bottom' });
    var lSS = v.label('S–S köprüsü', { at: onMol(ssMid), cls: 'note', dx: -52, dy: 96, line: true, align: 'right', valign: 'top' });
    var ePick = new THREE.Vector3();
    (function () { /* a bonding pair on top of the right half, toward the front: its label sits in the clear band above the molecule */
      var best = -1e9;
      eSlots.forEach(function (s) { if (s[0] > 0.5 && s[0] < 0.9) { var sc3 = s[1] + 0.3 * s[2]; if (sc3 > best) { best = sc3; ePick.set(s[0], s[1], s[2]); } } });
    })();
    var lElec = v.label('bağ elektronları (çiftler)', { at: onMol(ePick), cls: 'note', dx: 12, dy: -54, line: true, align: 'center', valign: 'bottom' });
    var filmPt = new THREE.Vector3(1.25, hAt(1.25, -0.3) - 0.06 + thAt(-0.3) * 0.95, -0.3);
    var lFilm = v.label('su filmi', { at: filmPt, cls: 'note', dx: 34, dy: -44, line: true, align: 'left', valign: 'bottom' });
    var lAm = v.label('ampermetre', { at: [0.66 + 0.42, GROUND + 0.42, 0.8], cls: 'note', dx: 14, align: 'left' });
    [lHelix, lSS, lElec, lFilm, lAm].forEach(function (L) { L.el.style.fontSize = '15px'; L.el.style.fontWeight = '600'; L.el.style.color = P.ink; });

    var chip = fixed.add('Kuru keratin: elektronlar bağlarda kilitli', { cls: 'chip kgc-strong', left: 16, top: 14 });
    fixed.add(
      '<div class="kgc-row">' +
      '<span class="kgc-it">' + dotCss('#4A4F5A') + 'C karbon</span>' +
      '<span class="kgc-it">' + dotCss('#E4E2DB') + 'H hidrojen</span>' +
      '<span class="kgc-it">' + dotCss('#C0533F') + 'O oksijen</span>' +
      '<span class="kgc-it">' + dotCss('#3F5FBF') + 'N azot</span>' +
      '<span class="kgc-it">' + dotCss('#D8B43C') + 'S kükürt</span>' +
      '</div>', { cls: 'note', left: 16, bottom: 34 });
    var legend2 = fixed.add('', { cls: 'note', left: 16, bottom: 12 });
    fixed.add('basitleştirilmiş model · ölçekli değil', { cls: 'tag', right: 14, bottom: 12, style: 'letter-spacing:.04em;font-size:10px' });
    var LEG_DRY = '<div class="kgc-row"><span class="kgc-it">' + dotCss('#2848C8', true) + 'elektron (bağda)</span></div>';
    var LEG_WET = '<div class="kgc-row"><span class="kgc-it">' + dotCss('#2848C8', true) + 'elektron (bağda)</span>' +
      '<span class="kgc-it">' + dotCss('#C8693A') + '<span>Na' + sup('+') + ' sodyum iyonu</span></span>' +
      '<span class="kgc-it">' + dotCss('#5873C9') + '<span>Cl' + sup('−') + ' klorür iyonu</span></span></div>';

    function reset() {
      st.auto = true; st.surface = 'kuru'; st.wetK = 0; st.ext = 0; st.curK = 0; st.needle = 0; st.nVel = 0; st.rock = 0; st.rockT = 0;
      kGroup.rotation.x = 0;
      v.setView({ yaw: HOME.yaw, pitch: HOME.pitch, distance: HOME.distance, target: HOME.target });
      ions.forEach(function (ion) { ion.x = ion.x0; });
    }
    reset();

    return {
      reset: reset,
      set: function (key, val) {
        if (key === 'surface') { st.auto = false; st.surface = (val === 'islak' || val === 'ıslak') ? 'islak' : 'kuru'; }
      },
      read: function (key) {
        var on = st.curK > 0.5;
        if (key === 'current') return on ? 'Akım: var' : 'Akım: yok';
        if (key === 'explain') return st.surface === 'islak' ? 'Suda çözünmüş Na⁺ ve Cl⁻ iyonları iki elektrot arasında yükü taşır.' : 'Kuru keratinde elektronlar bağlarda kilitli: yük taşıyan yok.';
        if (key === 'why') return st.surface === 'islak'
          ? (on ? 'Artı iyonlar eksi elektroda, eksi iyonlar artı elektroda gider: ibre sapar' : 'Su filmi iki elektrodu birleştirince iyonlar yükü taşımaya başlar')
          : 'Serbest yük yok: ampermetrenin ibresi sıfırda kalır';
        return '';
      },
      frame: function (t, dt) {
        if (st.auto) st.surface = (Math.floor(t / 8) % 2) ? 'islak' : 'kuru';
        var wet = st.surface === 'islak' ? 1 : 0;
        /* while dry, the dimer rocks slowly about its long axis so the twist of the coiled coil reads in 3D;
         * it settles back to rest before any water arrives */
        if (!wet && !reduced) { st.rockT += dt; st.rock = 0.62 * Math.sin(TAU * st.rockT / 8); }
        else { st.rock = approach(st.rock, 0, 5, dt); st.rockT = 0; }
        kGroup.rotation.x = st.rock;
        var settled = Math.abs(st.rock) < 0.01;
        /* the film spreads from the middle outward, or evaporates back */
        var spd = reduced ? 1.6 : 0.75;
        st.ext = (wet && settled) ? Math.min(1, st.ext + dt * spd * (1.15 - 0.6 * st.ext)) : (wet ? st.ext : Math.max(0, st.ext - dt * spd * 1.1));
        st.wetK = approach(st.wetK, wet, 2.4, dt);
        st.curK = approach(st.curK, st.ext > 0.985 ? 1 : 0, 2.2, dt);
        filmMat.opacity = 0.3 * Math.min(1, st.ext * 3) * (0.35 + 0.65 * st.wetK);
        film.visible = st.ext > 0.002;
        if (film.visible) updateFilm(st.ext, t);

        /* ammeter needle: damped spring toward the current */
        var target = st.curK * (0.56 + (reduced ? 0 : 0.025 * Math.sin(t * 2.1) * Math.sin(t * 0.77)));
        var acc = (target - st.needle) * 38 - st.nVel * 9;
        st.nVel += acc * dt; st.needle += st.nVel * dt;
        am.pivot.rotation.z = am.A0 - 2 * am.A0 * clamp(st.needle, -0.02, 1.02);

        /* bonding electrons: they only jiggle in place */
        var ja = (reduced ? 0.02 : 0.055) * S, j;
        for (j = 0; j < nE; j++) {
          var s = eSlots[j];
          eMesh.put(j, s[0] + ja * Math.sin(t * 5.1 + ePh[j * 3]), s[1] + ja * Math.sin(t * 4.3 + ePh[j * 3 + 1]), s[2] + ja * Math.sin(t * 4.7 + ePh[j * 3 + 2]), 0.19 * S);
        }
        eMesh.commit();

        /* ions drift toward the opposite electrodes once the film bridges them */
        var half = (FX1 - FX0) / 2, cx0 = (FX0 + FX1) / 2, reach = st.ext * (half + 0.25);
        var vDrift = (reduced ? 0.06 : 0.16) * st.curK;
        var slot = 0, naI = 0, clI = 0;
        for (j = 0; j < ions.length; j++) {
          var ion = ions[j];
          var sgn = ion.typ === 'na' ? 1 : -1;      /* Na+ → − plate (right), Cl− → + plate (left) */
          ion.x += sgn * vDrift * dt;
          if (ion.x > XI) ion.x -= 2 * XI; else if (ion.x < -XI) ion.x += 2 * XI;
          var x = ion.x + 0.05 * wob(t, ion.ph[0], 1.3), z = clamp(ion.z + 0.05 * wob(t, ion.ph[1], 1.1), -ZI, ZI);
          var cover = sstep(reach, reach - 0.3, Math.abs(x - cx0));
          var vis = st.wetK * cover * sstep(XI, XI - 0.18, Math.abs(ion.x));
          var y = hAt(x, z) - 0.06 + thAt(z) * ion.y0 + 0.02 * wob(t, ion.ph[2], 1.5);
          var R = ion.typ === 'na' ? RNA : RCL;
          if (ion.typ === 'na') { naMesh.put(naI, x, y, z, R * vis); naHalo.put(naI++, x, y, z, R * 1.75 * vis); }
          else { clMesh.put(clI, x, y, z, R * vis); clHalo.put(clI++, x, y, z, R * 1.6 * vis); }
          if (ion === naTagIon) { naTag.at.set(x, y + R * 1.6, z); naTag.show(vis > 0.6); }
          if (ion === clTagIon) { clTag.at.set(x, y + R * 1.5, z); clTag.show(vis > 0.6); }
          /* hydration shell: water O faces Na+, one water H points at Cl− */
          tq.setFromAxisAngle(up, t * ion.w + ion.ph[0]);
          for (var kk = 0; kk < 4; kk++) {
            var sh = ion.shell[kk];
            var dist = (ion.typ === 'na' ? 2.4 : 3.15) * S;
            tv2.copy(sh.dir).applyQuaternion(tq);
            var ox = x + tv2.x * dist, oy = y + tv2.y * dist * 0.6, oz = z + tv2.z * dist;
            if (ion.typ === 'na') qIon.setFromUnitVectors(up, tv2);
            else { tv.copy(tv2).negate(); qIon.setFromUnitVectors(hLn, tv); }
            tq2.setFromAxisAngle(tv2, sh.tw + t * 0.4);
            qIon.premultiply(tq2);
            putWater(slot++, ox, oy, oz, qIon, vis);
          }
        }
        naMesh.commit(); clMesh.commit(); naHalo.commit(); clHalo.commit();
        for (j = 0; j < waters.length; j++) {
          var w = waters[j];
          var wx = w.x + 0.05 * wob(t, w.ph[0], 1.2), wz = clamp(w.z + 0.05 * wob(t, w.ph[1], 1.0), -ZI, ZI);
          var wy = hAt(wx, wz) - 0.06 + thAt(wz) * w.y0 + 0.02 * wob(t, w.ph[2], 1.4);
          var cov = sstep(reach, reach - 0.3, Math.abs(wx - cx0)) * st.wetK;
          tq.setFromAxisAngle(w.ax, t * w.w * (reduced ? 0.3 : 1));
          tq2.copy(w.q).premultiply(tq);
          if (st.curK > 0.01) {
            /* dipoles in the field: O (negative end) toward the + plate, the two H toward the - plate; thermal libration stays */
            qa.setFromUnitVectors(up, xAxis);
            qb.setFromAxisAngle(xAxis, w.ph[0]); qa.premultiply(qb);
            qb.setFromAxisAngle(w.ax, 0.5 * wob(t, w.ph[1], 1.7)); qa.premultiply(qb);
            tq2.slerp(qa, 0.78 * st.curK);
          }
          putWater(slot++, wx, wy, wz, tq2, cov);
        }
        wO.commit(); wH.commit();

        var wetShown = st.wetK > 0.5;
        chip.swap(wetShown ? 'Islak yüzey: sudaki iyonlar akımı taşır' : 'Kuru keratin: elektronlar bağlarda kilitli', dt);
        lFilm.show(st.ext > 0.9);
        lElec.show(!wetShown);
        lHelix.show(st.wetK < 0.3);
        lSS.show(st.wetK < 0.3);
        legend2.set(wetShown ? LEG_WET : LEG_DRY);
        v.render(dt);
      },
      resize: function () { v.sf.resize(); },
      dispose: function () { v.dispose(); fixed.dispose(); }
    };
  });

  /* =====================================================================
   * doping · S 680×520 · light
   * Saf silisyum, n tipi (fosfor) ve p tipi (bor) katkılama.
   * ===================================================================== */
  /* Equirectangular sphere texture with a centred symbol facing local +z (u = 0.25). */
  function atomLetterTexture(bg, fg, text, supText) {
    return liveTexture(512, 256, function (ctx, w, h) {
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = fg;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = '600 66px ' + K.fonts.sans;
      var cx = w * 0.25, cy = h * 0.5 + 3;
      if (supText) {
        var tw = ctx.measureText(text).width;
        ctx.fillText(text, cx - 11, cy);
        ctx.font = '600 42px ' + K.fonts.sans;
        ctx.fillText(supText, cx - 11 + tw / 2 + 14, cy - 22);
      } else {
        ctx.fillText(text, cx, cy);
      }
    });
  }

  K.register('doping', function (el, opts) {
    var THREE = window.THREE;
    K.renderer();
    opts = opts || {};
    var theme = opts.theme || 'light';
    var reduced = K.reducedMotion;
    var BOX = boxWH(el, 680, 520);
    var HOME = { yaw: 0.06, pitch: BOX.wide ? 0.78 : 0.7, distance: BOX.wide ? 10.6 : 19.5, target: [0, -0.15, -0.35] };
    var v = K.stage3d(el, {
      theme: theme, fov: 26, distance: HOME.distance, yaw: HOME.yaw, pitch: HOME.pitch, target: HOME.target,
      size: 5, ground: -0.42, minPitch: 0.2, maxPitch: 1.25, minDistance: 7, maxDistance: 26
    });
    if (v.lights) {
      v.lights.key.intensity = 1.35; v.lights.hemi.intensity = 0.55;
      v.lights.key.shadow.mapSize.set(1024, 1024);
      var kc = v.lights.key.shadow.camera;
      kc.left = -6.5; kc.right = 6.5; kc.top = 6.5; kc.bottom = -6.5;
      if (v.lights.ground) v.lights.ground.material.opacity = 0.09;
    }
    var scene = v.scene;
    var fixed = makeFixed(el);

    var NX = 8, NZ = 5, RA = 0.28, SLOT = 0.15, ER = 0.075, FY = 0.38;
    var X0 = -(NX - 1) / 2, Z0 = -(NZ - 1) / 2;
    var atoms = [];
    for (var j = 0; j < NZ; j++) for (var i = 0; i < NX; i++) atoms.push({ x: X0 + i, z: Z0 + j, i: i, j: j, bonds: [] });
    function aIdx(i, j) { return j * NX + i; }
    /* bonds: internal (atom–atom) and edge bonds that continue the crystal beyond the drawn slab */
    var bonds = [];
    function addBond(a, bIdx, dx, dz) {
      var A = atoms[a];
      var bx = bIdx >= 0 ? atoms[bIdx].x : A.x + dx, bz = bIdx >= 0 ? atoms[bIdx].z : A.z + dz;
      var bd = { a: a, b: bIdx, ax: A.x, az: A.z, bx: bx, bz: bz, dx: bx - A.x, dz: bz - A.z, edge: bIdx < 0 };
      bd.mx = (A.x + bx) / 2; bd.mz = (A.z + bz) / 2;
      bonds.push(bd);
      A.bonds.push(bonds.length - 1);
      if (bIdx >= 0) atoms[bIdx].bonds.push(bonds.length - 1);
    }
    for (j = 0; j < NZ; j++) for (i = 0; i < NX; i++) {
      var k = aIdx(i, j);
      if (i < NX - 1) addBond(k, aIdx(i + 1, j), 1, 0); else addBond(k, -1, 1, 0);
      if (j < NZ - 1) addBond(k, aIdx(i, j + 1), 0, 1); else addBond(k, -1, 0, 1);
      if (i === 0) addBond(k, -1, -1, 0);
      if (j === 0) addBond(k, -1, 0, -1);
    }
    var nb = bonds.length, nS = nb * 2;
    /* slot s = 2·bond + side; side 0 sits next to atom a, side 1 next to b */
    var slotX = new Float32Array(nS), slotZ = new Float32Array(nS), slotAtom = new Int16Array(nS);
    bonds.forEach(function (bd, bI) {
      slotX[bI * 2] = bd.mx - bd.dx * SLOT; slotZ[bI * 2] = bd.mz - bd.dz * SLOT; slotAtom[bI * 2] = bd.a;
      slotX[bI * 2 + 1] = bd.mx + bd.dx * SLOT; slotZ[bI * 2 + 1] = bd.mz + bd.dz * SLOT; slotAtom[bI * 2 + 1] = bd.b;
    });

    /* ---------- meshes ---------- */
    var gSph = new THREE.SphereGeometry(1, 28, 18);
    var gE = new THREE.IcosahedronGeometry(1, 1);
    var gCyl = new THREE.CylinderGeometry(1, 1, 1, 10, 1, true);
    var gRing = new THREE.TorusGeometry(1, 0.22, 10, 36);
    var texSi = atomLetterTexture('#9EA5B1', '#1B1E24', 'Si');
    var siMat = new THREE.MeshStandardMaterial({ map: texSi, roughness: 0.48, metalness: 0.12, envMapIntensity: 0.8 });
    var siMesh = makeInst(gSph, siMat, atoms.length, { castShadow: true });
    scene.add(siMesh);
    var DOP = { n: [[1, 1], [4, 3], [6, 1]], p: [[1, 3], [3, 1], [6, 3]] };
    var dopTex = {
      P: atomLetterTexture('#4A5162', '#FFFFFF', 'P'), Pp: atomLetterTexture('#4A5162', '#FFFFFF', 'P', '+'),
      B: atomLetterTexture('#544F5E', '#FFFFFF', 'B'), Bm: atomLetterTexture('#544F5E', '#FFFFFF', 'B', '−')
    };
    var dopMeshes = [0, 1, 2].map(function () {
      var m = new THREE.Mesh(gSph, new THREE.MeshStandardMaterial({ map: dopTex.P, roughness: 0.4, metalness: 0.15 }));
      m.castShadow = true; m.visible = false;
      scene.add(m);
      return m;
    });
    /* bonds: internal ones solid, edge ones fade out with an alpha gradient */
    var bondMat = K.mat.std(0xB9BEC7, 0.45, 0.05);
    var nInt = 0;
    bonds.forEach(function (bd) { if (!bd.edge) nInt++; });
    var bMesh = new THREE.InstancedMesh(gCyl, bondMat, nInt);
    /* alphaMap reads the green channel: opaque greyscale, white (visible) at the atom end = canvas top */
    var fadeTex = K.textTexture(4, 64, function (ctx, w, h) {
      var g = ctx.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, '#FFFFFF'); g.addColorStop(0.45, '#FFFFFF'); g.addColorStop(1, '#000000');
      ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    });
    fadeTex.encoding = THREE.LinearEncoding;
    var eMesh0 = new THREE.InstancedMesh(gCyl, new THREE.MeshStandardMaterial({ color: 0xB9BEC7, roughness: 0.45, metalness: 0.05, alphaMap: fadeTex, transparent: true, depthWrite: false }), nb - nInt);
    var m4 = new THREE.Matrix4(), bi = 0, ei = 0;
    bonds.forEach(function (bd) {
      if (!bd.edge) { bondMatrix(m4, bd.ax, 0, bd.az, bd.bx, 0, bd.bz, 0.035); bMesh.setMatrixAt(bi++, m4); }
      else {
        /* cylinder +y runs from the atom outward, so uv.v = 1 at the atom: alpha fades toward the outside */
        bondMatrix(m4, bd.ax + bd.dx * 0.95, 0, bd.az + bd.dz * 0.95, bd.ax, 0, bd.az, 0.035);
        eMesh0.setMatrixAt(ei++, m4);
      }
    });
    scene.add(bMesh, eMesh0);
    var elMat = K.mat.electron(false);
    var eMesh = makeInst(gE, elMat, nS);
    var MAXF = 8;
    var fMesh = makeInst(gE, elMat, MAXF + 6);
    var fHalo = makeInst(new THREE.SphereGeometry(1, 16, 12), new THREE.MeshBasicMaterial({ color: 0x2848C8, transparent: true, opacity: 0.28, depthWrite: false }), MAXF);
    fHalo.renderOrder = 3;
    scene.add(fHalo);
    var holeMat = new THREE.MeshBasicMaterial({ color: 0xC8693A, toneMapped: false });
    var hMesh = makeInst(gRing, holeMat, 12);
    var flashMat = new THREE.MeshBasicMaterial({ color: 0xF2C46B, transparent: true, opacity: 0.0, depthWrite: false, toneMapped: false });
    var flash = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 14), flashMat);
    flash.visible = false;
    scene.add(eMesh, fMesh, hMesh, flash);
    /* bond electron clouds: a soft translucent lobe along every bond whose density follows the electrons present */
    var cloudMat = new THREE.MeshBasicMaterial({ color: 0x3C5AD6, transparent: true, opacity: 0.17, depthWrite: false });
    var cloudMesh = makeInst(new THREE.SphereGeometry(1, 16, 10), cloudMat, nb);
    cloudMesh.renderOrder = 2;
    scene.add(cloudMesh);
    var cloudK = new Float32Array(nb);
    var thPh = new Float32Array(atoms.length * 3);
    (function () { var r0 = K.rng(5); for (var z = 0; z < thPh.length; z++) thPh[z] = r0() * TAU; })();

    /* electrode plates (appear with the field) */
    var PX = X0 - 1.12;
    var plateGeo = roundedBoxGeo(NZ + 0.6, 0.7, 0.07, 0.03, 3);
    var plates = [-1, 1].map(function (sg) {
      var m = K.mat.tin({ roughness: 0.32, transparent: true, opacity: 0 });
      m.color.set(sg < 0 ? 0xE2B496 : 0xAFBDE8);
      var p = new THREE.Mesh(plateGeo, m);
      p.rotation.y = Math.PI / 2;
      p.position.set(sg * -PX, -0.07, 0);
      p.visible = false;
      scene.add(p);
      return p;
    });
    var plusL = v.label('+', { at: [PX, 0.43, -NZ / 2 - 0.2], cls: 'value kgc-plus', dx: -16, dy: -14 });
    var minusL = v.label('−', { at: [-PX, 0.43, -NZ / 2 - 0.2], cls: 'value kgc-plus', dx: 16, dy: -14 });
    plusL.el.style.color = P.copper; minusL.el.style.color = P.blue;
    plusL.el.style.fontSize = minusL.el.style.fontSize = '22px';

    /* ---------- labels ---------- */
    var chip = fixed.add('', { cls: 'chip kgc-strong', left: 16, top: 14 });
    var sub = fixed.add('', { cls: 'note', left: 17, top: 46 });
    var legend = fixed.add('', { cls: 'note', left: 16, bottom: 12 });
    var tagReal = fixed.add('', { cls: 'tag', right: 14, bottom: 28, style: 'letter-spacing:.04em;font-size:10px;text-align:right' });
    fixed.add('basitleştirilmiş model · ölçekli değil', { cls: 'tag', right: 14, bottom: 12, style: 'letter-spacing:.04em;font-size:10px' });
    var dopAt = new THREE.Vector3();
    var lDop = v.label('', { at: dopAt, cls: 'note chip', dx: -6, dy: -62, line: true, align: 'center', valign: 'bottom', html: true });
    var holeAt = new THREE.Vector3(), freeAt = new THREE.Vector3();
    var lHole = v.label('boşluk', { at: holeAt, cls: 'tag chip', dx: -26, dy: -30, line: true, align: 'right', valign: 'bottom' });
    lHole.el.style.color = P.copper; lHole.el.style.letterSpacing = '0.04em';
    var lFree = v.label('serbest elektron', { at: freeAt, cls: 'tag chip', dy: -18, valign: 'bottom' });
    lFree.el.style.color = P.blue; lFree.el.style.letterSpacing = '0.04em';

    /* ---------- carrier state ---------- */
    var st = { auto: true, mode: 'saf', shown: '', field: 0, fieldK: 0, modeT: 0, swapK: 1 };
    var eOn = new Uint8Array(nS), rng, holes, frees, flights, genT, flashT;
    var dopSites = [], dopIon = [0, 0, 0], dopIonK = [0, 0, 0];
    var tmpA = [0, 0], cellW = NX - 1, cellD = NZ - 1;

    function cellCenter(ci, cj, out) { out[0] = X0 + ci + 0.5; out[1] = Z0 + cj + 0.5; return out; }
    function nearestCell(x, z) { return [clamp(Math.floor(x - X0), 0, cellW - 1), clamp(Math.floor(z - Z0), 0, cellD - 1)]; }
    function slotFree(s) {
      for (var q = 0; q < flights.length; q++) if (flights[q].from === s || flights[q].to === s) return false;
      for (q = 0; q < holes.length; q++) if (holes[q].slot === s) return false;
      return true;
    }
    function isInterior(s) { var b = bonds[s >> 1]; return !b.edge; }
    function newFree(x, z, y0, o) {
      var c = nearestCell(x, z);
      var f = { x: x, z: z, y: y0, ci: c[0], cj: c[1], px: x, pz: z, nx: 0, nz: 0, k: 1, born: 0, dead: -1, orbit: null, tag: false, exit: 0, target: null };
      cellCenter(c[0], c[1], tmpA); f.nx = tmpA[0]; f.nz = tmpA[1]; f.k = 0; f.px = x; f.pz = z;
      if (o) for (var key in o) f[key] = o[key];
      frees.push(f);
      return f;
    }
    function clearCarriers() {
      eOn.fill(1);
      holes = []; frees = []; flights = [];
      genT = 1.2; flashT = 9;
    }
    function setupMode(mode) {
      clearCarriers();
      dopSites = [];
      dopIon = [0, 0, 0]; dopIonK = [0, 0, 0];
      if (mode === 'n' || mode === 'p') {
        DOP[mode].forEach(function (ij, q) {
          var a = aIdx(ij[0], ij[1]);
          dopSites.push(a);
          if (mode === 'n') {
            /* the fifth electron starts in a loose orbit around its phosphorus atom */
            var A = atoms[a];
            newFree(A.x + 0.62, A.z, FY, { orbit: { a: a, ang: q * 2.1, t: 1.2 + q * 0.7 }, born: 0, tag: q === 2 });
          } else {
            /* boron brings only 3 electrons: one bond next to it misses its B-side electron */
            var A2 = atoms[a], bI = A2.bonds[(q + 1) % A2.bonds.length], bd = bonds[bI];
            var s = bI * 2 + (bd.a === a ? 0 : 1);
            eOn[s] = 0;
            holes.push({ slot: s, born: 0, next: 1.4 + q * 0.45, dop: q, tag: q === 0, dying: -1 });
          }
        });
      }
    }
    function reset() {
      rng = K.rng(97);
      st.auto = true; st.mode = 'saf'; st.shown = 'saf'; st.field = 0; st.fieldK = 0; st.modeT = 0; st.swapK = 1;
      setupMode('saf');
      v.setView({ yaw: HOME.yaw, pitch: HOME.pitch, distance: HOME.distance, target: HOME.target });
    }
    reset();

    /* ---------- dynamics ---------- */
    function startHop(h) {
      var s0 = h.slot, b0 = s0 >> 1, bd0 = bonds[b0];
      var near = [bd0.a, bd0.b], cand = [], w = [], tot = 0;
      near.forEach(function (at) {
        if (at < 0) return;
        atoms[at].bonds.forEach(function (bI) {
          if (bI === b0) return;
          for (var side = 0; side < 2; side++) {
            var s = bI * 2 + side;
            if (!eOn[s] || !slotFree(s)) continue;
            var dxs = slotX[s] - slotX[s0];
            var wt = Math.exp(3.2 * st.fieldK * dxs) * (slotAtom[s] === at ? 1.6 : 0.6);
            cand.push(s); w.push(wt); tot += wt;
          }
        });
      });
      if (!cand.length) return;
      var r = rng() * tot, pick = cand[0];
      for (var q = 0; q < cand.length; q++) { r -= w[q]; if (r <= 0) { pick = cand[q]; break; } }
      /* the neighbouring bond electron jumps into the hole; the hole appears where it left */
      eOn[pick] = 0;
      var bdp = bonds[pick >> 1];
      var via = (bdp.a === bd0.a || bdp.a === bd0.b) ? bdp.a : ((bdp.b >= 0 && (bdp.b === bd0.a || bdp.b === bd0.b)) ? bdp.b : -1);
      flights.push({ from: pick, to: s0, k: 0, via: via, hole: h });
      h.slot = pick;
      h.prev = s0;
      h.kin = 0;
      if (h.dop !== undefined && h.dop >= 0) { dopIon[h.dop] = 1; h.dop = -1; }
    }
    function stepFree(f, dt) {
      if (f.orbit) {
        var o = f.orbit, A = atoms[o.a];
        o.ang += dt * 2.1;
        f.x = A.x + Math.cos(o.ang) * 0.62; f.z = A.z + Math.sin(o.ang) * 0.62; f.y = FY;
        o.t -= dt;
        if (o.t <= 0) {
          var c = nearestCell(f.x, f.z);
          f.orbit = null; f.ci = c[0]; f.cj = c[1]; f.px = f.x; f.pz = f.z;
          cellCenter(c[0], c[1], tmpA); f.nx = tmpA[0]; f.nz = tmpA[1]; f.k = 0;
          var di = dopSites.indexOf(o.a);
          if (di >= 0) dopIon[di] = 1;
        }
        return;
      }
      if (f.target) {
        /* falling back into a hole */
        f.k = Math.min(1, f.k + dt * 1.9);
        var e = K.ease.inOut(f.k);
        f.x = lerp(f.px, slotX[f.target.slot], e); f.z = lerp(f.pz, slotZ[f.target.slot], e); f.y = lerp(FY, 0, e) + Math.sin(Math.PI * e) * 0.12;
        return;
      }
      f.k += dt * (reduced ? 0.9 : 2.1);
      if (f.k >= 1 && f.exit) {
        /* it left into the + plate; the external circuit returns an electron at the − side */
        f.exit = 0; f.ci = cellW - 1; f.px = -X0 + 0.95; f.pz = f.nz;
        cellCenter(f.ci, f.cj, tmpA); f.nx = tmpA[0]; f.nz = tmpA[1]; f.k = 0;
      } else if (f.k >= 1) {
        f.px = f.nx; f.pz = f.nz;
        /* choose the next cell: random walk, biased toward + when the field is on */
        var opts2 = [[1, 0], [-1, 0], [0, 1], [0, -1]], w = [], tot = 0, q;
        for (q = 0; q < 4; q++) {
          var ni = f.ci + opts2[q][0], nj = f.cj + opts2[q][1];
          var inside = ni >= 0 && ni < cellW && nj >= 0 && nj < cellD;
          var exitL = st.fieldK > 0.5 && ni < 0 && nj === f.cj;
          var wt = (inside || exitL) ? Math.exp(-2.6 * st.fieldK * opts2[q][0]) : 0;
          w.push(wt); tot += wt;
        }
        var r = rng() * tot, pick = 0;
        for (q = 0; q < 4; q++) { r -= w[q]; if (r <= 0) { pick = q; break; } }
        f.ci += opts2[pick][0]; f.cj += opts2[pick][1];
        if (f.ci < 0) { f.exit = 1; f.nx = X0 - 0.95; f.nz = f.pz; f.k = 0; }
        else {
          cellCenter(f.ci, f.cj, tmpA);
          f.nx = tmpA[0] + (rng() - 0.5) * 0.18; f.nz = tmpA[1] + (rng() - 0.5) * 0.18;
          f.k = 0;
        }
      }
      var e2 = K.ease.inOut(f.k);
      f.x = lerp(f.px, f.nx, e2); f.z = lerp(f.pz, f.nz, e2); f.y = FY + 0.03 * Math.sin(f.k * Math.PI);
    }
    function updateCarriers(t, dt) {
      var mode = st.shown, spd = reduced ? 0.5 : 1;
      var q;
      /* intrinsic pairs (saf): rare thermal generation and recombination */
      if (mode === 'saf') {
        genT -= dt;
        if (genT <= 0 && frees.length === 0 && holes.length === 0) {
          var tries = 0, s;
          do { s = Math.floor(rng() * nS); tries++; } while ((!isInterior(s) || !eOn[s] || slotX[s] < X0 + 1.5 || slotX[s] > -X0 - 1.5) && tries < 80);
          eOn[s] = 0;
          holes.push({ slot: s, born: 0, next: 1.3, dop: -1, tag: true, dying: -1 });
          var f = newFree(slotX[s], slotZ[s], 0, { tag: true });
          f.y = 0; f.k = 0;
          genT = 99;
          f.life = 4.2;
        }
        for (q = frees.length - 1; q >= 0; q--) {
          var fr = frees[q];
          if (fr.life !== undefined && !fr.target) {
            fr.life -= dt;
            if (fr.life <= 0 && holes.length && st.fieldK < 0.5) { fr.target = holes[0]; fr.px = fr.x; fr.pz = fr.z; fr.k = 0; holes[0].dying = 0; }
          }
        }
      }
      for (q = flights.length - 1; q >= 0; q--) {
        var fl = flights[q];
        fl.k += dt * (reduced ? 1.2 : 1.9);
        if (fl.k >= 1) { eOn[fl.to] = 1; flights.splice(q, 1); }
      }
      for (q = holes.length - 1; q >= 0; q--) {
        var h = holes[q];
        h.born = Math.min(1, h.born + dt * 2.5);
        if (h.kin !== undefined) h.kin = Math.min(1, h.kin + dt * 1.9);
        if (h.dying >= 0) continue;
        h.next -= dt * spd;
        var busyHop = false;
        for (var z2 = 0; z2 < flights.length; z2++) if (flights[z2].hole === h) busyHop = true;
        if (h.next > 0 || busyHop) continue;
        h.next = 1.15 + rng() * 0.25;
        /* with the field, a hole that reaches the − side is filled from the plate; a new one forms at the + side */
        if (st.fieldK > 0.5 && slotX[h.slot] > -X0 - 0.2) {
          eOn[h.slot] = 1;
          var ns, tr = 0;
          do { ns = Math.floor(rng() * nS); tr++; } while ((!eOn[ns] || slotX[ns] > X0 + 0.3 || !slotFree(ns)) && tr < 120);
          if (tr < 120) { eOn[ns] = 0; h.slot = ns; h.born = 0; h.kin = undefined; h.prev = undefined; }
          continue;
        }
        startHop(h);
      }
      for (q = frees.length - 1; q >= 0; q--) {
        var f2 = frees[q];
        f2.born = Math.min(1, f2.born + dt * 2.2);
        if (f2.y < FY - 0.001 && !f2.target && !f2.orbit) { f2.y = Math.min(FY, f2.y + dt * 1.2); }
        stepFree(f2, dt * spd);
        if (f2.target && f2.k >= 1) {
          /* recombination: the electron refills the bond; the energy leaves as heat (warm flash) */
          var hi = holes.indexOf(f2.target);
          if (hi >= 0) { eOn[f2.target.slot] = 1; holes.splice(hi, 1); }
          flash.position.set(f2.x, 0, f2.z); flashT = 0;
          frees.splice(q, 1);
          genT = 2.6;
        }
      }
      /* saf mode with the field: the pair separates and leaves at the plates; start a new pair later */
      if (mode === 'saf' && st.fieldK > 0.5 && frees.length === 0 && holes.length === 0 && genT > 50) genT = 1.5;
    }

    function holePos(s, out) { out[0] = slotX[s]; out[1] = slotZ[s]; return out; }
    var camQ = new THREE.Quaternion(), qz = new THREE.Quaternion(), zAxis = new THREE.Vector3(0, 0, 1), camV = new THREE.Vector3(), tv = new THREE.Vector3();
    var CHIP = {
      saf: 'Saf silisyum: her bağda 2 elektron',
      n: 'n tipi: fosforun 5. elektronu serbestçe dolaşır',
      p: 'p tipi: borun eksik elektronu bir boşluk bırakır'
    };
    var SUB = {
      saf: 'Her Si atomu 4 komşusuyla birer elektron paylaşır. Isı, çok seyrek olarak bir elektronu bağından koparır.',
      n: 'Fosforun 5 dış elektronu var; 4 bağ dolunca 1 elektron artar ve serbest kalır.',
      p: 'Borun 3 dış elektronu var. Komşu elektron boşluğa atlar; boşluk ters yöne ilerler.'
    };
    var REAL = {
      saf: 'gerçekte çok daha seyrek: trilyonlarca atomda yaklaşık bir çift',
      n: 'gerçekte katkı atomları çok daha seyrektir',
      p: 'gerçekte katkı atomları çok daha seyrektir'
    };
    function legendHtml(mode) {
      var s = '<div class="kgc-row">' +
        '<span class="kgc-it">' + dotCss('#A9AFBA') + 'Si: 4 dış elektron</span>';
      if (mode === 'n') s += '<span class="kgc-it">' + dotCss('#545B6B') + 'P: 5 dış elektron</span>';
      if (mode === 'p') s += '<span class="kgc-it">' + dotCss('#5C5866') + 'B: 3 dış elektron</span>';
      s += '<span class="kgc-it">' + dotCss('#2848C8', true) + 'elektron</span>';
      if (mode !== 'n') s += '<span class="kgc-it">' + ringCss() + 'boşluk</span>';
      return s + '</div>';
    }

    return {
      reset: reset,
      set: function (key, val) {
        if (key === 'mode') { st.auto = false; if (val === 'saf' || val === 'n' || val === 'p') st.mode = val; }
        else if (key === 'field') { st.auto = false; st.field = (+val) ? 1 : 0; }
      },
      read: function (key) {
        var m = st.mode;
        if (key === 'carrier') return m === 'n' ? 'Çoğunluk taşıyıcı: elektron (n tipi)' : m === 'p' ? 'Çoğunluk taşıyıcı: boşluk (p tipi)' : 'Saf silisyum: çok az taşıyıcı';
        if (key === 'dopant') return m === 'n' ? 'Fosfor: 5 dış elektron' : m === 'p' ? 'Bor: 3 dış elektron' : 'Katkı yok: hepsi silisyum (4 dış elektron)';
        if (key === 'field') return st.field ? '1 · gerilim var' : '0 · gerilim yok';
        if (key === 'explain') return m === 'n' ? 'Fosforun 5. elektronu bağa girmez: serbest kalıp akımı taşır.' : m === 'p' ? 'Borda bir elektron eksik: komşu elektronlar boşluğa atlar, boşluk ters yöne gider.' : 'Saf silisyumda her bağ dolu: serbest elektron neredeyse yok.';
        return '';
      },
      frame: function (t, dt) {
        if (st.auto) st.mode = ['saf', 'n', 'p'][Math.floor(t / 8) % 3];
        st.fieldK = approach(st.fieldK, st.field, 3, dt);
        /* mode change: carriers fade out, the lattice swaps dopants, then the new state starts */
        if (st.mode !== st.shown) {
          st.swapK -= dt * 2.6;
          if (st.swapK <= 0) { st.shown = st.mode; setupMode(st.shown); st.swapK = 0; }
        } else st.swapK = Math.min(1, st.swapK + dt * 2.2);
        var mode = st.shown, vis = sstep(0, 1, st.swapK);
        updateCarriers(t, dt);

        /* atoms: Si everywhere except dopant sites; letters turned toward the camera */
        camV.copy(v.camera.position);
        var ja = reduced ? 0 : 0.014;
        var q;
        for (q = 0; q < atoms.length; q++) {
          var A = atoms[q];
          var isDop = dopSites.indexOf(q) >= 0 && mode !== 'saf';
          tv.set(camV.x - A.x, camV.y, camV.z - A.z).normalize();
          camQ.setFromUnitVectors(zAxis, tv);
          if (isDop) { siMesh.put(q, 0, 0, 0, 0); continue; }
          siMesh.put(q, A.x + ja * wob(t * 1.6, thPh[q * 3], 7), ja * 0.6 * wob(t * 1.6, thPh[q * 3 + 1], 6.1), A.z + ja * wob(t * 1.6, thPh[q * 3 + 2], 7.7), RA, camQ);
        }
        siMesh.commit();
        for (q = 0; q < nb; q++) {
          var cb = bonds[q], cn = (eOn[q * 2] + eOn[q * 2 + 1]) * 0.5;
          cloudK[q] = approach(cloudK[q], cn, 9, dt);
          var cw = cloudK[q] * vis * (cb.edge ? 0.8 : 1);
          if (cw < 0.02) { cloudMesh.hide(q); continue; }
          var pulse = 1 + (reduced ? 0 : 0.05 * Math.sin(t * 3.1 + q * 1.9));
          if (cb.dz) cloudMesh.putS(q, cb.mx, 0, cb.mz, 0.14 * cw * pulse, 0.14 * cw * pulse, 0.37 * cw);
          else cloudMesh.putS(q, cb.mx, 0, cb.mz, 0.37 * cw, 0.14 * cw * pulse, 0.14 * cw * pulse);
        }
        cloudMesh.commit();
        for (q = 0; q < 3; q++) {
          var dm = dopMeshes[q];
          if (mode === 'saf' || q >= dopSites.length) { dm.visible = false; continue; }
          var D = atoms[dopSites[q]];
          dm.visible = true;
          dopIonK[q] = approach(dopIonK[q], dopIon[q], 6, dt);
          var tex = mode === 'n' ? (dopIonK[q] > 0.5 ? dopTex.Pp : dopTex.P) : (dopIonK[q] > 0.5 ? dopTex.Bm : dopTex.B);
          if (dm.material.map !== tex) { dm.material.map = tex; dm.material.needsUpdate = true; }
          dm.position.set(D.x, 0, D.z);
          tv.set(camV.x - D.x, camV.y, camV.z - D.z).normalize();
          dm.quaternion.setFromUnitVectors(zAxis, tv);
          var pop = 0.8 + 0.2 * vis;
          dm.scale.setScalar(RA * 1.1 * pop);
        }

        /* bond electrons */
        var je = reduced ? 0.004 : 0.012;
        for (q = 0; q < nS; q++) {
          if (!eOn[q]) { eMesh.hide(q); continue; }
          eMesh.put(q, slotX[q] + je * Math.sin(t * 6.2 + q * 1.3) - 0.02 * st.fieldK, 0.0 + je * Math.sin(t * 5.1 + q * 2.1), slotZ[q] + je * Math.cos(t * 5.7 + q * 0.7), ER);
        }
        eMesh.commit();
        /* free electrons, hopping electrons */
        var fi = 0, tagged = null;
        for (q = 0; q < frees.length && fi < MAXF; q++) {
          var f = frees[q];
          var edge = sstep(-X0 + 0.95, -X0 + 0.5, f.x) * sstep(X0 - 0.95, X0 - 0.5, f.x);
          fHalo.put(fi, f.x, f.y, f.z, ER * 2.3 * f.born * vis * edge * (f.target ? 1 - f.k : 1));
          fMesh.put(fi++, f.x, f.y, f.z, ER * 1.45 * f.born * vis * edge);
          if (f.tag && !tagged && !f.target) tagged = f;
        }
        for (q = 0; q < flights.length && fi < MAXF + 6; q++) {
          var fl = flights[q], e = K.ease.inOut(fl.k);
          var x0 = slotX[fl.from], z0 = slotZ[fl.from], x1 = slotX[fl.to], z1 = slotZ[fl.to];
          /* the jump arcs around the shared atom instead of cutting through it */
          var vx = fl.via >= 0 ? atoms[fl.via].x : (x0 + x1) / 2, vz = fl.via >= 0 ? atoms[fl.via].z : (z0 + z1) / 2;
          var mx = (x0 + x1) / 2, mz = (z0 + z1) / 2;
          var ox = mx - vx, oz = mz - vz, ol = Math.sqrt(ox * ox + oz * oz) || 1;
          var arc = Math.sin(Math.PI * e), bulge = ol > 0.05 ? arc * Math.max(0, 0.42 - ol) : 0;
          var lift = arc * (0.1 + (ol > 0.05 ? 0 : 0.32));
          fMesh.put(fi++, lerp(x0, x1, e) + (ol > 0.05 ? ox / ol * bulge : 0), lift, lerp(z0, z1, e) + (ol > 0.05 ? oz / ol * bulge : 0), ER * vis);
        }
        for (var hq = Math.min(fi, frees.length); hq < MAXF; hq++) fHalo.hide(hq);
        fHalo.commit();
        for (; fi < MAXF + 6; fi++) fMesh.hide(fi);
        fMesh.commit();
        /* holes: copper rings lying in the slab plane, facing up toward the viewer */
        var ri = 0, tagH = null;
        camQ.setFromUnitVectors(zAxis, tv.set(camV.x, camV.y, camV.z).normalize());
        for (q = 0; q < holes.length && ri < 12; q++) {
          var h = holes[q];
          var kin = h.kin === undefined ? 1 : sstep(0.0, 0.55, h.kin);
          var tgt = null;
          for (var z3 = 0; z3 < frees.length; z3++) if (frees[z3].target === h) tgt = frees[z3];
          var life = h.born * vis * (tgt ? 1 - sstep(0.75, 1, tgt.k) : 1);
          hMesh.put(ri++, slotX[h.slot], 0.14, slotZ[h.slot], ER * 1.5 * life * kin, camQ);
          if (h.prev !== undefined && h.kin < 1) hMesh.put(ri++, slotX[h.prev], 0.14, slotZ[h.prev], ER * 1.5 * vis * (1 - sstep(0.6, 1, h.kin)), camQ);
          if (h.tag && !tagH) tagH = h;
        }
        for (; ri < 12; ri++) hMesh.hide(ri);
        hMesh.commit();
        /* recombination flash: energy released as heat */
        flashT += dt;
        flash.visible = flashT < 0.9;
        if (flash.visible) { var fk = flashT / 0.9; flash.scale.setScalar(0.12 + 0.45 * fk); flashMat.opacity = 0.55 * (1 - fk); }

        /* plates */
        var pk = st.fieldK;
        plates.forEach(function (p) { p.visible = pk > 0.01; p.material.opacity = pk; });
        plusL.show(pk > 0.5); minusL.show(pk > 0.5);

        /* labels */
        chip.swap(CHIP[st.mode], dt);
        sub.swap(SUB[st.mode], dt);
        tagReal.swap(REAL[st.mode], dt);
        legend.set(legendHtml(mode));
        if (mode !== 'saf' && dopSites.length) {
          var D0 = atoms[dopSites[0]];
          dopAt.set(D0.x, RA, D0.z);
          lDop.set(mode === 'n' ? (dopIon[0] ? 'fosfor iyonu P' + sup('+') + ': yerinde kalır' : 'fosfor (P): 5 dış elektron') : (dopIon[0] ? 'bor iyonu B' + sup('−') + ': yerinde kalır' : 'bor (B): 3 dış elektron'));
          lDop.show(vis > 0.9);
        } else lDop.show(false);
        if (tagH && vis > 0.9) { holeAt.set(slotX[tagH.slot], 0.14, slotZ[tagH.slot]); lHole.show(true); } else lHole.show(false);
        if (tagged && vis > 0.9 && tagged.born > 0.8) { freeAt.set(tagged.x, tagged.y, tagged.z); lFree.show(true); } else lFree.show(false);
        v.render(dt);
      },
      resize: function () { v.sf.resize(); },
      dispose: function () { v.dispose(); fixed.dispose(); }
    };
  });


  /* =====================================================================
   * body-ions · C 325×150 · card
   * Vücut sıvısı: su molekülleri ve Na+, K+, Cl− iyonları; alan gelince ayrışan sürüklenme.
   * ===================================================================== */
  K.register('body-ions', function (el, opts) {
    var THREE = window.THREE;
    K.renderer();
    opts = opts || {};
    var theme = opts.theme || 'card';
    var reduced = K.reducedMotion;
    var HOME = { yaw: 0.0, pitch: 0.2, distance: 4.6, target: [0, 0.1, 0] };
    var v = K.stage3d(el, {
      theme: theme, fov: 24, distance: HOME.distance, yaw: HOME.yaw, pitch: HOME.pitch, target: HOME.target,
      size: 2.2, shadows: false, minPitch: -0.2, maxPitch: 0.9, minDistance: 3.4, maxDistance: 7, minYaw: -0.9, maxYaw: 0.9
    });
    if (v.lights) { v.lights.key.intensity = 1.35; v.lights.hemi.intensity = 0.55; }
    var scene = v.scene;
    var fixed = makeFixed(el);
    var BX = 1.55, BY = 0.42, BZ = 0.5;          /* half extents of the fluid volume */

    /* soft translucent volume: a rounded box seen through, with a gentle rim */
    var volGeo = roundedBoxGeo(2 * BX + 0.2, 2 * BY + 0.2, 2 * BZ + 0.2, 0.18, 5);
    var volBack = new THREE.Mesh(volGeo, new THREE.MeshStandardMaterial({ color: 0xD9E7F2, roughness: 0.5, metalness: 0, transparent: true, opacity: 0.35, side: THREE.BackSide, depthWrite: false }));
    var volFront = new THREE.Mesh(volGeo, new THREE.MeshPhysicalMaterial({ color: 0xE6F0F7, roughness: 0.12, metalness: 0, transparent: true, opacity: 0.05, clearcoat: 0.2, depthWrite: false }));
    volBack.renderOrder = 0; volFront.renderOrder = 5;
    scene.add(volBack, volFront);

    var gA = new THREE.SphereGeometry(1, 16, 12), gH = new THREE.SphereGeometry(1, 10, 8);
    var rng = K.rng(31);
    var R = { O: 0.072, H: 0.047, OH: 0.105, na: 0.085, k: 0.112, cl: 0.135 };
    var HOH = 104.5 * Math.PI / 180;
    var ions = [
      { t: 'na', x: -0.95, y: 0.08, z: 0.15 }, { t: 'na', x: 0.3, y: -0.12, z: -0.2 }, { t: 'na', x: 1.1, y: 0.18, z: -0.25 },
      { t: 'k', x: 0.55, y: 0.06, z: 0.15 },
      { t: 'cl', x: -0.5, y: 0.14, z: -0.2 }, { t: 'cl', x: -0.05, y: -0.14, z: 0.18 }, { t: 'cl', x: 1.3, y: -0.08, z: 0.1 }, { t: 'cl', x: -1.3, y: -0.12, z: -0.22 }
    ];
    ions.forEach(function (o) { o.x0 = o.x; o.ph = [rng() * TAU, rng() * TAU, rng() * TAU]; o.dx = 0; });
    var waters = [];
    for (var i = 0; i < 26; i++) {
      var w, ok = false, tries = 0;
      while (!ok && tries < 80) {
        w = { x: (rng() * 2 - 1) * (BX - 0.1), y: (rng() * 2 - 1) * (BY - 0.08), z: (rng() * 2 - 1) * (BZ - 0.1) };
        ok = true;
        for (var j = 0; j < ions.length && ok; j++) { var dx = w.x - ions[j].x, dy = w.y - ions[j].y, dz = w.z - ions[j].z; if (dx * dx + dy * dy + dz * dz < 0.09) ok = false; }
        for (j = 0; j < waters.length && ok; j++) { var ex = w.x - waters[j].x, ey = w.y - waters[j].y, ez = w.z - waters[j].z; if (ex * ex + ey * ey + ez * ez < 0.07) ok = false; }
        tries++;
      }
      w.ph = [rng() * TAU, rng() * TAU, rng() * TAU];
      w.ax = new THREE.Vector3(rng() - 0.5, rng() - 0.5, rng() - 0.5).normalize();
      w.q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(rng() - 0.5, rng() - 0.5, rng() - 0.5).normalize(), rng() * TAU);
      w.spin = (0.5 + rng() * 0.6) * (rng() < 0.5 ? -1 : 1);
      waters.push(w);
    }
    var wO = makeInst(gA, K.mat.std(0xCC8072, 0.4, 0), waters.length);
    var wH = makeInst(gH, K.mat.std(0xF1F0EB, 0.45, 0), waters.length * 2);
    var cat = makeInst(gA, K.mat.std(0xC8693A, 0.34, 0.25, { envMapIntensity: 0.45 }), 4);
    var an = makeInst(gA, K.mat.std(0x3D5BC4, 0.34, 0.1, { envMapIntensity: 0.45 }), 4);
    var catHalo = makeInst(gA, new THREE.MeshBasicMaterial({ color: 0xC8693A, transparent: true, opacity: 0.24, depthWrite: false }), 4);
    var anHalo = makeInst(gA, new THREE.MeshBasicMaterial({ color: 0x5873C9, transparent: true, opacity: 0.24, depthWrite: false }), 4);
    catHalo.renderOrder = anHalo.renderOrder = 3;
    scene.add(wO, wH, cat, an, catHalo, anHalo);

    /* field arrow above the volume, with + and − ends */
    var arrowMat = new THREE.MeshBasicMaterial({ color: 0x3E434D, transparent: true, opacity: 0, depthWrite: false });
    var arrow = new THREE.Group();
    var aLen = 2 * BX - 0.3;
    var shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, aLen - 0.1, 8), arrowMat);
    shaft.rotation.z = -Math.PI / 2; shaft.position.x = -0.05;
    var head = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.11, 16), arrowMat);
    head.rotation.z = -Math.PI / 2; head.position.x = aLen / 2 - 0.05;
    arrow.add(shaft, head);
    arrow.position.set(0, BY + 0.33, 0);
    scene.add(arrow);
    var plusL = v.label('+', { at: [-aLen / 2 - 0.12, BY + 0.33, 0], cls: 'value kgc-plus', dx: -4 });
    var minusL = v.label('−', { at: [aLen / 2 + 0.12, BY + 0.33, 0], cls: 'value kgc-plus', dx: 4 });
    plusL.el.style.color = P.copper; minusL.el.style.color = P.blue;
    plusL.el.style.fontSize = minusL.el.style.fontSize = '14px';

    function ionTag(html, col, below) {
      var L = v.label(html, { at: new THREE.Vector3(), cls: 'tag', html: true, dy: below ? 13 : -13, valign: below ? 'top' : 'bottom' });
      L.el.style.letterSpacing = '0'; L.el.style.fontSize = '11px'; L.el.style.fontWeight = '600'; L.el.style.color = col;
      return L;
    }
    var tagNa = ionTag('Na' + sup('+'), P.copper), tagK = ionTag('K' + sup('+'), P.copper), tagCl = ionTag('Cl' + sup('−'), P.blue, true);
    var tagged = { na: ions[0], k: ions[3], cl: ions[5] };
    fixed.add('ölçekli değil · yavaşlatılmış', { cls: 'tag', left: 8, top: 4, style: 'letter-spacing:.03em;font-size:9px' });

    var st = { fieldK: 0, phase: 0 };
    var tq = new THREE.Quaternion(), tq2 = new THREE.Quaternion(), tv = new THREE.Vector3();
    var hL = new THREE.Vector3(Math.sin(HOH / 2) * R.OH, Math.cos(HOH / 2) * R.OH, 0), hR = new THREE.Vector3(-Math.sin(HOH / 2) * R.OH, Math.cos(HOH / 2) * R.OH, 0);
    /* frame the volume for any card aspect (the deck uses 325 × 150; cards may be 325 × 190) */
    var lastW = 0, lastH = 0;
    function fitDistance() {
      var w = el.offsetWidth || 325, h = el.offsetHeight || 150, tn = Math.tan(12 * Math.PI / 180);
      return Math.max((BX + 0.32) / (tn * w / h), (BY + 0.53) / tn);
    }
    function reset() {
      st.fieldK = 0;
      ions.forEach(function (o) { o.x = o.x0; });
      var d = fitDistance();
      v.home.distance = d;
      lastW = el.offsetWidth; lastH = el.offsetHeight;
      v.setView({ yaw: HOME.yaw, pitch: HOME.pitch, distance: d, target: HOME.target });
    }
    reset();
    var EX = BX - 0.06;
    return {
      reset: reset,
      read: function (key) { return key === 'field' ? (st.fieldK > 0.5 ? 'Alan var: artı iyonlar bir yöne, eksi iyonlar öbür yöne' : 'Alan yok: iyonlar rastgele dolaşır') : ''; },
      frame: function (t, dt) {
        if (el.offsetWidth !== lastW || el.offsetHeight !== lastH) {
          lastW = el.offsetWidth; lastH = el.offsetHeight;
          var dd = fitDistance(); v.home.distance = dd; v.setView({ distance: dd });
        }
        /* every 4 s a faint field appears for ~2 s: cations drift toward −, anions toward + */
        var c = t % 4;
        var on = c > 1.4 && c < 3.5 ? 1 : 0;
        st.fieldK = approach(st.fieldK, on, 4, dt);
        arrowMat.opacity = 0.55 * st.fieldK;
        plusL.show(st.fieldK > 0.4); minusL.show(st.fieldK > 0.4);
        var drift = (reduced ? 0.1 : 0.32) * st.fieldK, amp = reduced ? 0.02 : 0.05;
        var ci = 0, ai = 0;
        for (var i = 0; i < ions.length; i++) {
          var o = ions[i], sg = (o.t === 'cl') ? -1 : 1;
          o.x += sg * drift * dt;
          if (o.x > EX) o.x -= 2 * EX; else if (o.x < -EX) o.x += 2 * EX;
          var x = o.x + amp * wob(t * 0.8, o.ph[0], 1.6), y = clamp(o.y + amp * 0.6 * wob(t * 0.8, o.ph[1], 1.4), -BY + 0.14, BY - 0.14), z = o.z + amp * wob(t * 0.8, o.ph[2], 1.2);
          var fade = sstep(EX, EX - 0.2, Math.abs(o.x));
          var r = R[o.t];
          if (o.t === 'cl') { an.put(ai, x, y, z, r * fade); anHalo.put(ai++, x, y, z, r * 1.65 * fade); }
          else { cat.put(ci, x, y, z, r * fade); catHalo.put(ci++, x, y, z, r * 1.75 * fade); }
          o.sx = x; o.sy = y; o.sz = z; o.fade = fade;
        }
        cat.commit(); an.commit(); catHalo.commit(); anHalo.commit();
        for (i = 0; i < waters.length; i++) {
          var w = waters[i];
          var wx = w.x + amp * wob(t * 0.8, w.ph[0], 1.5), wy = w.y + amp * wob(t * 0.8, w.ph[1], 1.3), wz = w.z + amp * wob(t * 0.8, w.ph[2], 1.1);
          tq.setFromAxisAngle(w.ax, t * w.spin * (reduced ? 0.3 : 1));
          tq2.copy(w.q).premultiply(tq);
          wO.put(i, wx, wy, wz, R.O);
          tv.copy(hL).applyQuaternion(tq2); wH.put(i * 2, wx + tv.x, wy + tv.y, wz + tv.z, R.H);
          tv.copy(hR).applyQuaternion(tq2); wH.put(i * 2 + 1, wx + tv.x, wy + tv.y, wz + tv.z, R.H);
        }
        wO.commit(); wH.commit();
        [[tagNa, tagged.na], [tagK, tagged.k], [tagCl, tagged.cl]].forEach(function (p) {
          var o = p[1];
          p[0].at.set(o.sx, o.sy + (p[1] === tagged.cl ? -1 : 1) * R[o.t] * 1.6, o.sz);
          var near = ions.some(function (q) { return q !== o && (q.t === 'cl') !== (o.t === 'cl') && q.fade > 0.5 && Math.abs(q.sx - o.sx) < 0.3 && Math.abs(q.sy - o.sy) < 0.3; });
          p[0].show(o.fade > 0.8 && !near);
        });
        v.render(dt);
      },
      resize: function () { v.sf.resize(); },
      dispose: function () { v.dispose(); fixed.dispose(); }
    };
  });










  /* =====================================================================
   * touchscreen · S 680×520 · light
   * Kapasitif ekran parmağı algılar; tırnağı ve kalın eldiveni algılamaz.
   * Birim: 1 = 1 mm.
   * ===================================================================== */

  /* Fingertip surface (local frame: +x from the tip toward the hand, +y dorsal/nail side, +z lateral).
   * Side profile: a nearly straight dorsal line ending just under the nail's free edge, and a rounded
   * palmar pulp that curves up to meet it. o: {L, W, Hd, Hp, sw, sp, grow} */
  function fingerShape(o) {
    var tipY = o.Hd - o.tipDrop;
    function prof(s) {
      var W = o.W * (1 + o.grow * s / o.L), Hd = o.Hd * (1 + 0.5 * o.grow * s / o.L), Hp = o.Hp * (1 + 0.3 * o.grow * s / o.L);
      /* pad bulge just behind the tip */
      Hp *= 1 + 0.07 * Math.exp(-Math.pow((s - o.sp * 0.95) / 4.5, 2));
      var w = s < o.sw ? W * Math.sqrt(Math.max(0, 1 - Math.pow((o.sw - s) / o.sw, 2))) : W;
      var D = s < o.tipDrop ? tipY + Math.sqrt(Math.max(0, o.tipDrop * o.tipDrop - Math.pow(o.tipDrop - s, 2))) : Hd;
      var B = s < o.sp ? tipY - (tipY + Hp) * Math.sqrt(Math.max(0, 1 - Math.pow((o.sp - s) / o.sp, 2))) : -Hp;
      return { w: w, top: D, bot: B };
    }
    function pt(s, phi, out) {
      var p = prof(s), c = (p.top + p.bot) / 2, h = (p.top - p.bot) / 2;
      var cy = Math.cos(phi), sz = Math.sin(phi), n = o.n || 2.5;
      var y = (cy >= 0 ? 1 : -1) * Math.pow(Math.abs(cy), 2 / n) * h;
      var z = (sz >= 0 ? 1 : -1) * Math.pow(Math.abs(sz), 2 / n) * p.w;
      out[0] = s; out[1] = c + y; out[2] = z;
      return out;
    }
    return { prof: prof, pt: pt, o: o };
  }
  /* Indexed grid geometry over (s, φ) with uv = (s / L, φ / 2π) */
  function fingerGeometry(F, s0, nS, nP, sStretch, disp) {
    var THREE = window.THREE;
    var o = F.o, pos = [], uv = [], idx = [], p = [0, 0, 0], q1 = [0, 0, 0], q2 = [0, 0, 0];
    for (var i = 0; i <= nS; i++) {
      var u = i / nS, s = s0 + (o.L - s0) * Math.pow(u, sStretch || 1.6);
      for (var j = 0; j <= nP; j++) {
        var phi = j / nP * TAU;
        F.pt(s, phi, p);
        var dd = disp ? disp(s, phi > Math.PI ? phi - TAU : phi) : 0;
        if (dd) {
          F.pt(s + 0.05, phi, q1); F.pt(s, phi + 0.01, q2);
          var ax = q1[0] - p[0], ay = q1[1] - p[1], az = q1[2] - p[2], bx = q2[0] - p[0], by = q2[1] - p[1], bz = q2[2] - p[2];
          var nx = ay * bz - az * by, ny = az * bx - ax * bz, nz = ax * by - ay * bx, nl = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1;
          if (ny < 0) { nx = -nx; ny = -ny; nz = -nz; }
          p[0] += nx / nl * dd; p[1] += ny / nl * dd; p[2] += nz / nl * dd;
        }
        pos.push(p[0], p[1], p[2]);
        uv.push((s - s0) / (o.L - s0), j / nP);
      }
    }
    for (i = 0; i < nS; i++) for (j = 0; j < nP; j++) {
      var a = i * (nP + 1) + j, b = a + nP + 1;
      idx.push(a, a + 1, b, b, a + 1, b + 1);
    }
    var g = new THREE.BufferGeometry();
    g.setIndex(idx);
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.computeVertexNormals();
    /* weld the seam normals (φ = 0 and 2π) */
    var nrm = g.attributes.normal;
    for (i = 0; i <= nS; i++) {
      var a0 = i * (nP + 1), a1 = a0 + nP;
      var nx = nrm.getX(a0) + nrm.getX(a1), ny = nrm.getY(a0) + nrm.getY(a1), nz = nrm.getZ(a0) + nrm.getZ(a1), l = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1;
      nrm.setXYZ(a0, nx / l, ny / l, nz / l); nrm.setXYZ(a1, nx / l, ny / l, nz / l);
    }
    return g;
  }
  /* Nail plate: a thin shell over the dorsal surface, straight beyond the flesh (free edge),
   * with a rounded proximal edge under the cuticle. Vertex colours: pink bed, white free edge, pale lunula. */
  function nailGeometry(F, o) {
    var THREE = window.THREE;
    var nS = 34, nP = 22, s0 = o.s0, s1 = o.s1, sB = o.sB, T = o.thick, lift = o.lift;
    var pos = [], col = [], idx = [];
    var p = [0, 0, 0], q = [0, 0, 0], r = [0, 0, 0];
    var cBed = new THREE.Color(0xD9A598), cFree = new THREE.Color(0xF1E8DD), cLun = new THREE.Color(0xE6CBC2), tmpC = new THREE.Color();
    function halfAng(s) {
      var a = o.ang;
      if (s > s1 - o.rr) a *= Math.sqrt(Math.max(0.02, 1 - Math.pow((s - (s1 - o.rr)) / o.rr, 2)));
      if (s < s0 + 0.7) a *= 0.86 + 0.14 * Math.sqrt(Math.max(0, 1 - Math.pow((s0 + 0.7 - s) / 0.7, 2)));
      return a;
    }
    /* surface point and outward normal at (s, φ), offset by d */
    function surf(s, phi, d, out) {
      var sr = Math.max(s, sB);
      F.pt(sr, phi, p);
      F.pt(sr + 0.05, phi, q); F.pt(sr, phi + 0.01, r);
      var ax = q[0] - p[0], ay = q[1] - p[1], az = q[2] - p[2], bx = r[0] - p[0], by = r[1] - p[1], bz = r[2] - p[2];
      var nx = ay * bz - az * by, ny = az * bx - ax * bz, nz = ax * by - ay * bx, l = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1;
      nx /= l; ny /= l; nz /= l;
      if (ny < 0 && phi > -1.2 && phi < 1.2) { nx = -nx; ny = -ny; nz = -nz; }
      out[0] = p[0] + nx * d - (sr - s); out[1] = p[1] + ny * d; out[2] = p[2] + nz * d;
      return out;
    }
    var tp = [0, 0, 0];
    function vcol(s, phi) {
      var a = halfAng(s);
      if (s < o.freeEdge) tmpC.copy(cFree);
      else {
        tmpC.copy(cBed);
        var e = Math.pow((s - (s1 - 3.2)) / 2.4, 2) + Math.pow(phi / (a * 0.8 + 1e-3), 2);
        if (e < 1) tmpC.lerp(cLun, 0.75 * (1 - e));
        var fe = sstep(o.freeEdge + 0.5, o.freeEdge, s);
        tmpC.lerp(cFree, fe);
      }
      return tmpC;
    }
    /* top (k = 0) and bottom (k = 1) grids */
    for (var k = 0; k < 2; k++) {
      for (var i = 0; i <= nS; i++) {
        var s = s0 + (s1 - s0) * i / nS, a = halfAng(s);
        for (var j = 0; j <= nP; j++) {
          var phi = -a + 2 * a * j / nP;
          surf(s, phi, k === 0 ? lift + T : lift, tp);
          pos.push(tp[0], tp[1], tp[2]);
          var c = vcol(s, phi);
          col.push(c.r, c.g, c.b);
        }
      }
    }
    var base1 = (nS + 1) * (nP + 1);
    for (i = 0; i < nS; i++) for (j = 0; j < nP; j++) {
      var A = i * (nP + 1) + j, Bq = A + nP + 1;
      idx.push(A, A + 1, Bq, Bq, A + 1, Bq + 1);
      idx.push(base1 + A, base1 + Bq, base1 + A + 1, base1 + Bq, base1 + Bq + 1, base1 + A + 1);
    }
    /* rim walls: free edge (i = 0), sides (j = 0, j = nP) */
    function wall(ia, ja, ib, jb) {
      var t1 = ia * (nP + 1) + ja, t2 = ib * (nP + 1) + jb;
      idx.push(t1, base1 + t1, t2, t2, base1 + t1, base1 + t2);
    }
    for (j = 0; j < nP; j++) wall(0, j + 1, 0, j);
    for (i = 0; i < nS; i++) { wall(i, 0, i + 1, 0); wall(i + 1, nP, i, nP); }
    var g = new THREE.BufferGeometry();
    g.setIndex(idx);
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    g.computeVertexNormals();
    return g;
  }
  /* Fingerprint ridges (whorl) as a bump texture on the pad; uv.x = s along the finger, uv.y = φ / 2π */
  function fingerprintTexture(L, s0) {
    var THREE = window.THREE;
    /* ridges ≈ 0,45 mm apart, a whorl centred on the pad, fading out toward the sides */
    var tex = K.textTexture(1024, 512, function (ctx, w, h) {
      ctx.fillStyle = '#808080'; ctx.fillRect(0, 0, w, h);
      var pu = w / (L - s0), pv = h / 42, cx = (8.5 - s0) * pu, cy = h * 0.5;
      ctx.lineWidth = 1.7;
      for (var r = 0.45; r < 8.5; r += 0.45) {
        var a = 1 - sstep(5.5, 8.4, r);
        ctx.strokeStyle = 'rgba(214,214,214,' + a.toFixed(3) + ')';
        ctx.beginPath();
        ctx.ellipse(cx, cy, r * pu * 1.05, r * pv * 0.92, 0.05, 0, TAU);
        ctx.stroke();
      }
    });
    tex.encoding = THREE.LinearEncoding;
    return tex;
  }
  /* Knitted wool: rows of V-stitches (colour and bump) */
  function knitTextures() {
    var THREE = window.THREE;
    function draw(ctx, w, h, bump) {
      var rng = K.rng(5);
      ctx.fillStyle = bump ? '#3A3A3A' : '#4C5363';
      ctx.fillRect(0, 0, w, h);
      var cols = 16, rows = 16, cw = w / cols, rh = h / rows;
      for (var r = 0; r < rows; r++) for (var c = 0; c < cols; c++) {
        var x = c * cw, y = r * rh, jit = (rng() - 0.5) * 0.12;
        for (var side = -1; side <= 1; side += 2) {
          ctx.save();
          ctx.translate(x + cw / 2 + side * cw * 0.2, y + rh * 0.5);
          ctx.rotate(side * 0.55 + jit);
          var g = ctx.createLinearGradient(-cw * 0.2, 0, cw * 0.2, 0);
          if (bump) { g.addColorStop(0, '#5A5A5A'); g.addColorStop(0.5, '#F0F0F0'); g.addColorStop(1, '#5A5A5A'); }
          else {
            var tone = 0.85 + rng() * 0.3;
            g.addColorStop(0, K.mix('#3E4452', '#000000', 0.1)); g.addColorStop(0.5, K.mix('#5E6677', '#8C93A3', tone - 0.85)); g.addColorStop(1, K.mix('#3E4452', '#000000', 0.1));
          }
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.ellipse(0, 0, cw * 0.2, rh * 0.62, 0, 0, TAU);
          ctx.fill();
          ctx.restore();
        }
      }
      /* loose fibres */
      ctx.globalAlpha = bump ? 0.35 : 0.18;
      ctx.strokeStyle = bump ? '#FFFFFF' : '#A7AEBD';
      ctx.lineWidth = 0.8;
      for (var f = 0; f < 260; f++) {
        var fx = rng() * w, fy = rng() * h, ang = rng() * TAU, len = 3 + rng() * 9;
        ctx.beginPath(); ctx.moveTo(fx, fy); ctx.lineTo(fx + Math.cos(ang) * len, fy + Math.sin(ang) * len); ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }
    var map = K.textTexture(256, 256, function (ctx, w, h) { draw(ctx, w, h, false); });
    var bump = K.textTexture(256, 256, function (ctx, w, h) { draw(ctx, w, h, true); });
    bump.encoding = THREE.LinearEncoding;
    [map, bump].forEach(function (t) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(7, 6); });
    return { map: map, bump: bump };
  }

  K.register('touchscreen', function (el, opts) {
    var THREE = window.THREE;
    K.renderer();
    opts = opts || {};
    var theme = opts.theme || 'light';
    var reduced = K.reducedMotion;
    var BOX = boxWH(el, 680, 520);
    var HOME = { yaw: -0.3, pitch: 0.38, distance: BOX.wide ? 64 : 96, target: BOX.wide ? [1.5, 5.5, 0] : [1.5, 4.2, 0] };
    var v = K.stage3d(el, {
      theme: theme, fov: 26, distance: HOME.distance, yaw: HOME.yaw, pitch: HOME.pitch, target: HOME.target,
      size: 24, minPitch: 0.12, maxPitch: 1.2, minDistance: 40, maxDistance: 150, near: 1, far: 800
    });
    if (v.lights) {
      v.lights.key.intensity = 1.45; v.lights.hemi.intensity = 0.55;
      v.lights.key.shadow.mapSize.set(1024, 1024);
      v.lights.key.shadow.bias = -0.0006;
      if (v.lights.ground) v.lights.ground.material.opacity = 0.1;
    }
    var scene = v.scene;
    var fixed = makeFixed(el);

    /* ---------- screen stack (cut-away piece, 28 × 18 mm) ---------- */
    var SX = 20, SZ = 10;
    var Y = { glassTop: 0, glassBot: -1.0, rxTop: -1.0, rxBot: -1.35, txTop: -1.5, txBot: -1.85, filmBot: -1.95, dispTop: -1.95, dispBot: -2.5, backBot: -2.9 };
    var COLS = [-17.5, -12.5, -7.5, -2.5, 2.5, 7.5, 12.5, 17.5], ROWS = [-7.5, -2.5, 2.5, 7.5];
    var TCOL = 4, TROW = 2;                      /* touched node: column 5, row 3 */
    var XT = COLS[TCOL], ZT = ROWS[TROW];
    function boxMesh(x0, x1, y0, y1, z0, z1, mats) {
      var m = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0), mats);
      m.position.set((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
      return m;
    }
    var glassTop = new THREE.MeshPhysicalMaterial({ color: 0xEEF4F4, roughness: 0.04, metalness: 0, transparent: true, opacity: 0.16, clearcoat: 1, clearcoatRoughness: 0.03, envMapIntensity: 1.3, depthWrite: false });
    var glassEdge = new THREE.MeshPhysicalMaterial({ color: 0xCFE5E1, roughness: 0.12, metalness: 0, transparent: true, opacity: 0.5, envMapIntensity: 1.0, depthWrite: false });
    var glass = boxMesh(-SX, SX, Y.glassBot, Y.glassTop, -SZ, SZ, [glassEdge, glassEdge, glassTop, glassEdge, glassEdge, glassEdge]);
    glass.renderOrder = 4;
    var film = boxMesh(-SX, SX, Y.filmBot, Y.glassBot, -SZ, SZ, new THREE.MeshStandardMaterial({ color: 0xE9EEF2, roughness: 0.3, transparent: true, opacity: 0.35, depthWrite: false }));
    film.renderOrder = 3;
    var uiTex = K.textTexture(1024, 660, function (ctx, w, h) {
      ctx.fillStyle = '#EDEFF2'; ctx.fillRect(0, 0, w, h);
      /* a quiet home-screen grid: rounded tiles, barely darker than the background */
      var cols = 6, rows = 4, pw = w / cols, ph = h / rows;
      for (var r = 0; r < rows; r++) for (var c = 0; c < cols; c++) {
        var x = c * pw + pw * 0.2, y = r * ph + ph * 0.18, s = Math.min(pw, ph) * 0.58;
        ctx.fillStyle = (r + c) % 3 === 0 ? '#E1E4EA' : (r + c) % 3 === 1 ? '#E5E7EB' : '#DFE3E9';
        K.rr(ctx, x, y, s, s, s * 0.24);
        ctx.fill();
      }
    });
    var dispSide = new THREE.MeshStandardMaterial({ color: 0x2C3038, roughness: 0.5, metalness: 0.2 });
    var dispTopMat = new THREE.MeshStandardMaterial({ map: uiTex, roughness: 0.35, metalness: 0, emissive: 0xFFFFFF, emissiveMap: uiTex, emissiveIntensity: 0.22 });
    var display = boxMesh(-SX, SX, Y.dispBot, Y.dispTop, -SZ, SZ, [dispSide, dispSide, dispTopMat, dispSide, dispSide, dispSide]);
    display.receiveShadow = true;
    var back = boxMesh(-SX, SX, Y.backBot, Y.dispBot, -SZ, SZ, new THREE.MeshStandardMaterial({ color: 0x8E949E, roughness: 0.35, metalness: 0.8 }));
    back.castShadow = true;
    scene.add(back, display, film, glass);

    /* transparent ITO electrodes: TX rows (lower), RX columns (upper) */
    function itoMat() { return new THREE.MeshStandardMaterial({ color: 0x6E8AD8, roughness: 0.3, metalness: 0, transparent: true, opacity: 0.42, emissive: 0x2343B0, emissiveIntensity: 0.12, depthWrite: false }); }
    var rows = ROWS.map(function (z) { var m = boxMesh(-SX, SX, Y.txBot, Y.txTop, z - 1.3, z + 1.3, itoMat()); m.renderOrder = 2; scene.add(m); return m; });
    var cols = COLS.map(function (x) { var m = boxMesh(x - 0.6, x + 0.6, Y.rxBot, Y.rxTop, -SZ, SZ, itoMat()); m.renderOrder = 2; scene.add(m); return m; });
    var nodeGlowTex = K.textTexture(128, 128, function (ctx, w, h) {
      var g = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
      g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.35, 'rgba(255,255,255,0.55)'); g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    });
    var nodeGlow = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: nodeGlowTex, color: 0x3A5BD0, transparent: true, opacity: 0, depthWrite: false }));
    nodeGlow.rotation.x = -Math.PI / 2;
    nodeGlow.position.set(XT, Y.rxTop + 0.01, ZT);
    nodeGlow.scale.setScalar(5.2);
    nodeGlow.renderOrder = 5;
    scene.add(nodeGlow);
    /* touch feedback on the display: a soft disc and an expanding ring */
    var pressDisc = new THREE.Mesh(new THREE.CircleGeometry(1, 48), new THREE.MeshBasicMaterial({ color: 0x2343B0, transparent: true, opacity: 0, depthWrite: false }));
    pressDisc.rotation.x = -Math.PI / 2; pressDisc.position.set(XT, Y.dispTop + 0.01, ZT); pressDisc.scale.setScalar(2.4);
    var ring = new THREE.Mesh(new THREE.RingGeometry(0.92, 1, 64), new THREE.MeshBasicMaterial({ color: 0x2343B0, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide }));
    ring.rotation.x = -Math.PI / 2; ring.position.set(XT, Y.dispTop + 0.012, ZT);
    pressDisc.renderOrder = ring.renderOrder = 1;
    scene.add(pressDisc, ring);

    /* ---------- fringe-field arcs (one tube buffer, updated in place) ---------- */
    /* fringe field of the row being driven: from the exposed TX surface beside each RX column,
     * up through the glass and down onto the column (three planes across the row's width) */
    var arcs = [];
    [0].forEach(function (dz) {
      COLS.forEach(function (xc) {
        [-1, 1].forEach(function (sd) {
          [[1.0, 0.55], [1.55, 1.15], [2.15, 1.8]].forEach(function (dh) {
            arcs.push({ a: [xc + sd * dh[0], Y.txTop, ZT + dz], b: [xc + sd * 0.32, Y.rxTop, ZT + dz], h: dh[1], plane: 'z' });
          });
        });
      });
    });
    var NA = arcs.length, NP = 22, RS = 6, AR = 0.055;
    var aPos = new Float32Array(NA * NP * RS * 3), aIdx = [];
    for (var ai = 0; ai < NA; ai++) for (var pi = 0; pi < NP - 1; pi++) for (var ri = 0; ri < RS; ri++) {
      var a0 = (ai * NP + pi) * RS + ri, a1 = (ai * NP + pi) * RS + (ri + 1) % RS, b0 = a0 + RS, b1 = a1 + RS;
      aIdx.push(a0, b0, a1, a1, b0, b1);
    }
    var arcGeo = new THREE.BufferGeometry();
    arcGeo.setIndex(aIdx);
    arcGeo.setAttribute('position', new THREE.BufferAttribute(aPos, 3));
    arcGeo.attributes.position.setUsage(THREE.DynamicDrawUsage);
    var arcMat = new THREE.MeshBasicMaterial({ color: 0x3557C9, transparent: true, opacity: 0.62, depthWrite: false });
    var arcMesh = new THREE.Mesh(arcGeo, arcMat);
    arcMesh.frustumCulled = false;
    arcMesh.renderOrder = 6;
    /* hidden parts of the lines (inside the glass edge or under the fingertip) show faintly, as in a technical drawing */
    var arcGhost = new THREE.Mesh(arcGeo, new THREE.MeshBasicMaterial({ color: 0x3557C9, transparent: true, opacity: 0.26, depthTest: false, depthWrite: false }));
    arcGhost.frustumCulled = false;
    arcGhost.renderOrder = 12;
    scene.add(arcMesh, arcGhost);
    arcs.forEach(function (A) { A.c = 0; A.cd = 0; A.f = [0, 0, 0]; A.n = [0, 1, 0]; A.dirty = true; });
    var B0 = [0, 0, 0], B1 = [0, 0, 0], B2 = [0, 0, 0], B3 = [0, 0, 0];
    function bez(t, out) {
      var u = 1 - t, a = u * u * u, b = 3 * u * u * t, c = 3 * u * t * t, d = t * t * t;
      out[0] = a * B0[0] + b * B1[0] + c * B2[0] + d * B3[0];
      out[1] = a * B0[1] + b * B1[1] + c * B2[1] + d * B3[1];
      out[2] = a * B0[2] + b * B1[2] + c * B2[2] + d * B3[2];
    }
    var cp = [], tg = [0, 0, 0];
    for (var cpi = 0; cpi < NP; cpi++) cp.push([0, 0, 0]);
    function buildArc(i) {
      var A = arcs[i], c = A.c, k = 1.33;
      B0[0] = A.a[0]; B0[1] = A.a[1]; B0[2] = A.a[2];
      B3[0] = lerp(A.b[0], A.f[0], c); B3[1] = lerp(A.b[1], A.f[1], c); B3[2] = lerp(A.b[2], A.f[2], c);
      var hh = A.h * (1 + A.cd), rise = Math.max(0.2, A.f[1] - A.a[1]);
      B1[0] = A.a[0]; B1[1] = A.a[1] + lerp(hh * k, rise * 0.5, c); B1[2] = A.a[2];
      B2[0] = lerp(A.b[0], A.f[0] + A.n[0] * rise * 0.45, c); B2[1] = lerp(A.b[1] + hh * k, A.f[1] + A.n[1] * rise * 0.45, c); B2[2] = lerp(A.b[2], A.f[2] + A.n[2] * rise * 0.45, c);
      for (var p = 0; p < NP; p++) bez(p / (NP - 1), cp[p]);
      var refx = A.plane === 'z' ? 0 : 1, refz = A.plane === 'z' ? 1 : 0;
      for (p = 0; p < NP; p++) {
        var pa = cp[Math.max(0, p - 1)], pb = cp[Math.min(NP - 1, p + 1)];
        tg[0] = pb[0] - pa[0]; tg[1] = pb[1] - pa[1]; tg[2] = pb[2] - pa[2];
        var tl = Math.sqrt(tg[0] * tg[0] + tg[1] * tg[1] + tg[2] * tg[2]) || 1;
        tg[0] /= tl; tg[1] /= tl; tg[2] /= tl;
        /* binormal = plane normal, normal = binormal × tangent */
        var bx = refx, by = 0, bz = refz;
        var dd = bx * tg[0] + bz * tg[2]; bx -= dd * tg[0]; by -= dd * tg[1]; bz -= dd * tg[2];
        var bl = Math.sqrt(bx * bx + by * by + bz * bz) || 1; bx /= bl; by /= bl; bz /= bl;
        var nx = by * tg[2] - bz * tg[1], ny = bz * tg[0] - bx * tg[2], nz = bx * tg[1] - by * tg[0];
        var taper = 0.55 + 0.45 * Math.sin(Math.PI * Math.min(1, Math.max(0, p / (NP - 1))));
        for (var r = 0; r < RS; r++) {
          var th = r / RS * TAU, cs = Math.cos(th) * AR * taper, sn = Math.sin(th) * AR * taper;
          var o3 = ((i * NP + p) * RS + r) * 3;
          aPos[o3] = cp[p][0] + nx * cs + bx * sn; aPos[o3 + 1] = cp[p][1] + ny * cs + by * sn; aPos[o3 + 2] = cp[p][2] + nz * cs + bz * sn;
        }
      }
      A.dirty = false;
    }
    for (ai = 0; ai < NA; ai++) buildArc(ai);
    arcGeo.attributes.position.needsUpdate = true;

    /* ---------- fingertip, nail and glove ---------- */
    var FO = { L: 46, W: 7.0, Hd: 5.0, Hp: 6.0, sw: 6.2, sp: 9.0, tipDrop: 1.4, grow: 0.12, n: 2.6 };
    var Fsh = fingerShape(FO);
    /* skin folds: the lateral nail folds and the cuticle sit slightly proud of the nail edges */
    var NOH = { s0: -0.6, s1: 12.2, ang: 0.82, rr: 2.4 };
    function nailHalf(s) { var a = NOH.ang; if (s > NOH.s1 - NOH.rr) a *= Math.sqrt(Math.max(0.02, 1 - Math.pow((s - (NOH.s1 - NOH.rr)) / NOH.rr, 2))); return a; }
    function foldDisp(s, phi) {
      if (s < 1.8 || s > NOH.s1 + 1.6) return 0;
      var a = nailHalf(Math.min(s, NOH.s1)), ap = Math.abs(phi);
      var lat = s <= NOH.s1 ? Math.exp(-Math.pow((ap - a - 0.08) / 0.07, 2)) : 0;
      var cut = (s > NOH.s1 - 0.6 && ap < NOH.ang * 0.9) ? Math.exp(-Math.pow((s - NOH.s1 - 0.25) / 0.45, 2)) : 0;
      return 0.42 * Math.max(lat * sstep(1.8, 3.2, s), cut);
    }
    var fGeo = fingerGeometry(Fsh, 0, 74, 72, 1.7, foldDisp);
    var fpTex = fingerprintTexture(FO.L, 0);
    var skin = new THREE.MeshPhysicalMaterial({
      color: 0xC4876B, roughness: 0.58, metalness: 0, sheen: 0.25, sheenRoughness: 0.6, sheenColor: new THREE.Color(0xE8B9A4),
      clearcoat: 0.08, clearcoatRoughness: 0.6, bumpMap: fpTex, bumpScale: 0.05, emissive: 0x3A1810, emissiveIntensity: 0.06
    });
    var finger = new THREE.Mesh(fGeo, skin);
    finger.castShadow = true;
    var NO = { s0: NOH.s0, s1: NOH.s1, sB: 1.4, thick: 0.38, lift: -0.06, ang: NOH.ang, rr: NOH.rr, freeEdge: 0.85 };
    var nail = new THREE.Mesh(nailGeometry(Fsh, NO), new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: 0.3, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.12, sheen: 0.2, sheenColor: new THREE.Color(0xFFFFFF), side: THREE.DoubleSide }));
    nail.castShadow = true;
    var GO = { L: 46, W: FO.W + 2.2, Hd: FO.Hd + 2.1, Hp: FO.Hp + 2.4, sw: 8.5, sp: 10.5, tipDrop: 4.2, grow: 0.08, n: 2.3 };
    var Gsh = fingerShape(GO);
    var gGeo = fingerGeometry(Gsh, 0, 64, 52, 1.6);
    var knit = knitTextures();
    var wool = new THREE.MeshPhysicalMaterial({ map: knit.map, bumpMap: knit.bump, bumpScale: 0.45, roughness: 0.92, metalness: 0, sheen: 1, sheenRoughness: 0.75, sheenColor: new THREE.Color(0xB8C0CE) });
    var glove = new THREE.Mesh(gGeo, wool);
    glove.castShadow = true;
    var hand = new THREE.Group();
    var fingerGrp = new THREE.Group(), gloveGrp = new THREE.Group();
    fingerGrp.add(finger, nail);
    gloveGrp.add(glove);
    gloveGrp.position.x = -2.4;              /* the glove tip sits ahead of the fingertip inside it */
    hand.add(fingerGrp, gloveGrp);
    scene.add(hand);
    var fPos0 = fGeo.attributes.position.array.slice(), gPos0 = gGeo.attributes.position.array.slice();

    /* poses: orientation (u = tip→hand, d = dorsal) and which point touches the glass */
    var up = new THREE.Vector3(0, 1, 0);
    function basis(u, dHint) {
      var U = new THREE.Vector3().fromArray(u).normalize();
      var Dv = new THREE.Vector3().fromArray(dHint);
      Dv.addScaledVector(U, -Dv.dot(U)).normalize();
      var Lv = new THREE.Vector3().crossVectors(U, Dv);
      var m = new THREE.Matrix4().makeBasis(U, Dv, Lv);
      return new THREE.Quaternion().setFromRotationMatrix(m);
    }
    var POSE = {
      parmak: { q: basis([0.86, 0.48, -0.18], [0, 1, 0]), glove: 0 },
      tirnak: { q: basis([0.3, 0.95, -0.1], [-0.62, -0.34, 0.7]), glove: 0 },
      eldiven: { q: basis([0.86, 0.48, -0.18], [0, 1, 0]), glove: 1 }
    };
    /* lowest point of a mesh set in a given orientation (local, before translation) */
    var tv = new THREE.Vector3(), tq = new THREE.Quaternion();
    function lowest(q, meshes, offs) {
      var best = null, by = Infinity;
      meshes.forEach(function (mesh, mi) {
        var arr = mesh.geometry.attributes.position.array;
        for (var i = 0; i < arr.length; i += 3) {
          tv.set(arr[i] + offs[mi], arr[i + 1], arr[i + 2]).applyQuaternion(q);
          if (tv.y < by) { by = tv.y; best = tv.clone(); }
        }
      });
      return best;
    }
    Object.keys(POSE).forEach(function (key) {
      var P0 = POSE[key];
      P0.low = P0.glove ? lowest(P0.q, [glove], [-2.4]) : lowest(P0.q, [finger, nail], [0, 0]);
      P0.lift = new THREE.Vector3(0, 1, 0).applyQuaternion(P0.q).multiplyScalar(0.25).add(new THREE.Vector3(1, 0, 0).applyQuaternion(P0.q)).add(up.clone().multiplyScalar(1.2)).normalize();
    });
    var press = { parmak: 0.55, tirnak: 0.0, eldiven: 0.25 };

    /* ---------- labels ---------- */
    var modeTag = fixed.add('', { cls: 'tag', left: 18, top: 14 });
    var chip = fixed.add('', { cls: 'chip kgc-strong', left: 16, top: 32 });
    chip.show(false);
    var lGlass = v.label('koruyucu cam', { at: [-15, -0.45, SZ], cls: 'note', dx: -12, dy: 40, line: true, align: 'right', valign: 'top' });
    var lIto = v.label('saydam elektrotlar: satırlar ve sütunlar', { at: [-9.5, Y.txTop + 0.02, SZ], cls: 'note', dx: -6, dy: 62, line: true, align: 'right', valign: 'top' });
    var lDisp = v.label('ekran (pikseller)', { at: [-4, -1.5, SZ], cls: 'note', dx: 0, dy: 84, line: true, align: 'right', valign: 'top' });
    var lField = v.label('elektrik alan çizgileri', { at: [COLS[1] + 1.55, Y.txTop + 1.15 * 0.75, ZT], cls: 'note', dx: -14, dy: -46, line: true, align: 'center', valign: 'bottom' });
    var fingerAt = new THREE.Vector3();
    var lFinger = v.label('', { at: fingerAt, cls: 'note chip', dx: 18, dy: -26, line: true, align: 'left', valign: 'bottom' });
    var numL = [];
    COLS.forEach(function (x, i) { var L = v.label(String(i + 1), { at: [x, 0.2, SZ + 1.5], cls: 'tag' }); L.el.style.letterSpacing = '0'; L.p3 = new THREE.Vector3(x, 0.2, SZ + 1.5); numL.push(L); });
    ROWS.forEach(function (z, i) { var L = v.label(String(i + 1), { at: [-SX - 1.8, 0, z], cls: 'tag' }); L.el.style.letterSpacing = '0'; L.p3 = new THREE.Vector3(-SX - 1.8, 0, z); numL.push(L); });
    var colCap = v.label('sütun', { at: [COLS[0] - 4.8, 0.2, SZ + 1.5], cls: 'tag', align: 'right' });
    var rowCap = v.label('satır', { at: [-SX - 1.8, 0, ROWS[0] - 3.8], cls: 'tag' });
    colCap.p3 = new THREE.Vector3(COLS[0] - 4.8, 0.2, SZ + 1.5); rowCap.p3 = new THREE.Vector3(-SX - 1.8, 0, ROWS[0] - 3.8);
    numL.push(colCap, rowCap);
    numL.forEach(function (L) { L.show(false); });
    lDisp.show(false);
    [lGlass, lIto, lField, lFinger].forEach(function (L) { L.el.style.fontSize = '15px'; L.el.style.fontWeight = '600'; L.el.style.color = P.ink; });
    [colCap, rowCap].forEach(function (L) { L.el.style.letterSpacing = '0.06em'; });
    fixed.add('ölçekli değil: cam ve alan çizgileri büyütülmüştür', { cls: 'tag', right: 14, bottom: 12, style: 'letter-spacing:.04em;font-size:10px' });

    var INFO = {
      parmak: { tag: 'PARMAK', note: 'parmak: içi tuzlu su, iletken', chip: 'Algılandı: sütun ' + (TCOL + 1) + ', satır ' + (TROW + 1), ok: true,
        why: 'Parmaktaki tuzlu su iletkendir: alan çizgilerini kendine çeker; parmak cama değince kesişimdeki sinyal eşiği geçer' },
      tirnak: { tag: 'TIRNAK', note: 'tırnak: keratin, yalıtkan', chip: 'Algılanmadı: iletken parmak camdan uzak', ok: false,
        why: 'Tırnak yalıtkandır ve iletken parmağı camdan uzak tutar: alan neredeyse değişmez, sinyal eşiğin altında kalır' },
      eldiven: { tag: 'ELDİVEN', note: 'yün eldiven: kalın, yalıtkan', chip: 'Algılanmadı: kalın kumaş yalıtkan', ok: false,
        why: 'Kalın yün kumaş yalıtkandır: iletken parmak alana yeterince yaklaşamaz' }
    };
    var ORDER = ['parmak', 'tirnak', 'eldiven'];
    var SIGN = 7.4;                              /* normalises a bare fingertip to ≈ 1 */
    var st = { auto: true, touch: 'parmak', pose: 'parmak', cyc: 0, lift: 1, sig: 0, det: 0, detT: 0, ringT: 9 };
    function reset() {
      st.auto = true; st.touch = 'parmak'; st.pose = 'parmak'; st.cyc = 0; st.lift = 1; st.sig = 0; st.det = 0; st.detT = 0; st.ringT = 9;
      arcs.forEach(function (A) { A.c = 0; A.cd = 0; A.dirty = true; });
      for (var q = 0; q < NA; q++) buildArc(q);
      arcGeo.attributes.position.needsUpdate = true;
      v.setView({ yaw: HOME.yaw, pitch: HOME.pitch, distance: HOME.distance, target: HOME.target });
    }
    reset();

    /* capsule approximating the conductive flesh of the fingertip pad */
    var capA = new THREE.Vector3(), capB = new THREE.Vector3(), tmpV = new THREE.Vector3(), tmpW = new THREE.Vector3();
    function capsuleNearest(px, py, pz, out) {
      tmpV.set(px, py, pz);
      var abx = capB.x - capA.x, aby = capB.y - capA.y, abz = capB.z - capA.z;
      var tt = clamp(((px - capA.x) * abx + (py - capA.y) * aby + (pz - capA.z) * abz) / (abx * abx + aby * aby + abz * abz), 0, 1);
      out.set(capA.x + abx * tt, capA.y + aby * tt, capA.z + abz * tt);
      return out;
    }
    var flat = { f: false, g: false };
    var invM = new THREE.Matrix4(), wv = new THREE.Vector3();
    function flatten(mesh, base, offX, on) {
      var arr = mesh.geometry.attributes.position.array;
      if (!on) {
        if (mesh.userData.flat) { arr.set(base); mesh.geometry.attributes.position.needsUpdate = true; mesh.userData.flat = false; }
        return;
      }
      mesh.updateMatrixWorld(true);
      invM.copy(mesh.matrixWorld).invert();
      var any = false;
      for (var i = 0; i < arr.length; i += 3) {
        wv.set(base[i], base[i + 1], base[i + 2]).applyMatrix4(mesh.matrixWorld);
        if (wv.y < 0.02) { wv.y = 0.02 + (wv.y - 0.02) * 0.04; wv.applyMatrix4(invM); arr[i] = wv.x; arr[i + 1] = wv.y; arr[i + 2] = wv.z; any = true; }
        else { arr[i] = base[i]; arr[i + 1] = base[i + 1]; arr[i + 2] = base[i + 2]; }
      }
      mesh.geometry.attributes.position.needsUpdate = true;
      mesh.userData.flat = any;
    }

    return {
      reset: reset,
      set: function (key, val) {
        if (key === 'touch' && INFO[val]) { st.auto = false; st.touch = val; }
      },
      read: function (key) {
        var I = INFO[st.pose];
        if (key === 'result') return I.ok ? (st.det > 0.5 ? 'Algılandı' : 'Algılama yok') : 'Algılanmadı';
        if (key === 'why') return I.why;
        if (key === 'explain') return I.ok ? 'Parmaktaki tuzlu su alan çizgilerini kendine çeker: ekran dokunuşu algılar.' : 'Tırnak ya da kalın kumaş yalıtkandır ve parmağı uzak tutar: alan değişmez.';
        return '';
      },
      frame: function (t, dt) {
        /* 6 s cycle: approach, touch, lift; the mode changes while the hand is out of view */
        var CY = 6;
        var cyc = Math.floor(t / CY), ph = t - cyc * CY;
        if (st.auto) st.touch = ORDER[cyc % 3];
        var liftT = ph < 1.3 ? 1 - K.ease.out(ph / 1.3) : ph < 4.5 ? 0 : ph < 5.4 ? K.ease.inOut((ph - 4.5) / 0.9) : 1;
        if (reduced) liftT = ph < 0.6 ? 1 - ph / 0.6 : ph < 5.2 ? 0 : 1;
        if (ph < 0.25 || st.pose === st.touch) st.pose = st.touch;
        var pose = POSE[st.pose];
        var info = INFO[st.pose];
        /* place the hand: lowest point on the touch spot, lifted along the pose's retreat direction */
        var sink = press[st.pose] * (1 - sstep(0, 0.12, liftT));
        hand.quaternion.copy(pose.q);
        hand.position.set(XT - pose.low.x, -pose.low.y - sink, ZT - pose.low.z).addScaledVector(pose.lift, 52 * liftT);
        gloveGrp.visible = !!pose.glove; fingerGrp.visible = !pose.glove;
        hand.updateMatrixWorld(true);
        flatten(finger, fPos0, 0, !pose.glove && st.pose === 'parmak' && liftT < 0.05);
        flatten(glove, gPos0, -2.4, !!pose.glove && liftT < 0.05);

        /* the conductive flesh: the finger's pad (inside the glove, the fabric keeps it ~2,4 mm away) */
        capA.set(FO.sp * 0.55, -1.2, 0).applyMatrix4(fingerGrp.matrixWorld);
        capB.set(FO.sp * 1.6, -0.6, 0).applyMatrix4(fingerGrp.matrixWorld);
        var capR = 5.3;
        var cond = st.pose === 'tirnak' ? 0 : 1;
        var sig = 0, i;
        for (i = 0; i < NA; i++) {
          var A = arcs[i];
          var apx = (A.a[0] + A.b[0]) / 2, apz = (A.a[2] + A.b[2]) / 2;
          /* the conductor surface right above the line's start */
          capsuleNearest(A.a[0], A.a[1] + 4, A.a[2], tmpW);
          var dx = A.a[0] - tmpW.x, dy = A.a[1] + 4 - tmpW.y, dz = A.a[2] - tmpW.z, dl = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1;
          var fy = tmpW.y + dy / dl * capR, gap = fy - A.a[1];
          /* a line ends on the conductor when the conductor is close enough above it; lines a little
           * further away are only stretched toward it (thick fabric keeps the flesh out of reach) */
          var target = cond * sstep(2.6, 1.35, gap) * (dy / dl < -0.2 ? 1 : 0);
          var nudge = cond * 0.2 * sstep(5.2, 2.9, gap) * (1 - target);
          if (st.pose === 'tirnak' && liftT < 0.2) {
            var ddx = apx - XT, ddz = apz - ZT;
            nudge = 0.1 * Math.exp(-(ddx * ddx + ddz * ddz) / 6);
          }
          var nc = approach(A.c, target, 6, dt), nd = approach(A.cd, nudge, 6, dt);
          if (Math.abs(nc - A.c) > 1e-4 || Math.abs(nd - A.cd) > 1e-4 || A.c > 0.001) {
            A.c = nc; A.cd = nd;
            A.f[0] = tmpW.x + dx / dl * capR; A.f[1] = fy; A.f[2] = tmpW.z + dz / dl * capR;
            A.n[0] = dx / dl; A.n[1] = dy / dl; A.n[2] = dz / dl;
            A.dirty = true;
          }
          sig += A.c + A.cd * 0.3;
        }
        var anyDirty = false;
        for (i = 0; i < NA; i++) if (arcs[i].dirty) { buildArc(i); anyDirty = true; }
        if (anyDirty) arcGeo.attributes.position.needsUpdate = true;

        /* sensing: the controller compares the change at each crossing with a threshold */
        st.sig = approach(st.sig, sig / SIGN, 5, dt);
        var detected = st.sig > 0.5 && liftT < 0.05;
        if (detected) st.detT += dt; else st.detT = 0;
        st.det = approach(st.det, detected && st.detT > 0.15 ? 1 : 0, 6, dt);
        rows.forEach(function (m, r) { var on = r === TROW ? st.det : 0; m.material.opacity = 0.38 + 0.5 * on; m.material.emissiveIntensity = 0.1 + 1.1 * on; m.material.color.setHex(on > 0.5 ? 0x3354C4 : 0x6E8AD8); });
        cols.forEach(function (m, c) { var on = c === TCOL ? st.det : 0; m.material.opacity = 0.38 + 0.5 * on; m.material.emissiveIntensity = 0.1 + 1.1 * on; m.material.color.setHex(on > 0.5 ? 0x3354C4 : 0x6E8AD8); });
        arcMat.opacity = 0.62 + (reduced ? 0 : 0.07 * Math.sin(t * 2.4));
        nodeGlow.material.opacity = 0.85 * st.det;
        pressDisc.material.opacity = 0.14 * st.det;
        if (st.det > 0.5) { st.ringT += dt; if (st.ringT > 1.25) st.ringT = 0; } else st.ringT = 9;
        var rk = clamp(st.ringT / 1.1, 0, 1);
        ring.scale.setScalar(1.2 + 4.4 * K.ease.out(rk));
        ring.material.opacity = st.ringT < 1.1 ? 0.55 * (1 - rk) * st.det : 0;

        /* labels and chips */
        modeTag.set(INFO[st.touch].tag);
        var touching = liftT < 0.05;
        var showChip = touching && (info.ok ? st.det > 0.5 : ph > 2.0);
        chip.set(info.chip);
        chip.show(showChip);
        chip.el.style.color = info.ok ? P.blue : P.ink;
        lFinger.set(info.note);
        if (pose.glove) fingerAt.set(18, 1.0, 0).applyMatrix4(gloveGrp.matrixWorld);
        else if (st.pose === 'tirnak') fingerAt.set(1.2, FO.Hd + 0.5, 0).applyMatrix4(fingerGrp.matrixWorld);
        else fingerAt.set(15, FO.Hd * 0.7, 2.5).applyMatrix4(fingerGrp.matrixWorld);
        lFinger.show(liftT < 0.3);
        v.render(dt);

        /* sensor readout (2D): change at the crossing against the detection threshold */
        var c2 = v.ctx, W = v.w, bx = W - 196, by = 22, bw = 176, bh = 8;
        /* soften the canvas edges where the hand leaves the frame (top and right) */
        c2.save();
        c2.globalCompositeOperation = 'destination-out';
        var gT = c2.createLinearGradient(0, 0, 0, 90);
        gT.addColorStop(0, 'rgba(0,0,0,1)'); gT.addColorStop(1, 'rgba(0,0,0,0)');
        c2.fillStyle = gT; c2.fillRect(0, 0, W, 90);
        var gR = c2.createLinearGradient(W, 0, W - 90, 0);
        gR.addColorStop(0, 'rgba(0,0,0,1)'); gR.addColorStop(1, 'rgba(0,0,0,0)');
        c2.fillStyle = gR; c2.fillRect(W - 90, 0, 90, v.h);
        c2.restore();
        c2.save();
        K.rr(c2, bx - 12, by - 17, bw + 24, 60, 8);
        c2.fillStyle = 'rgba(255,255,255,0.86)'; c2.fill();
        c2.strokeStyle = 'rgba(214,214,207,0.9)'; c2.lineWidth = 1; c2.stroke();
        K.label(c2, 'Sensör sinyali: değişim', bx, by, { size: 12, color: P.muted });
        K.rr(c2, bx, by + 9, bw, bh, 4);
        c2.fillStyle = 'rgba(21,23,28,0.07)'; c2.fill();
        var fillW = bw * clamp(st.sig / 1.2, 0, 1);
        if (fillW > 0.5) { K.rr(c2, bx, by + 9, Math.max(fillW, bh), bh, 4); c2.fillStyle = st.det > 0.5 ? P.blue : '#8A97C2'; c2.fill(); }
        var thx = bx + bw * (0.5 / 1.2);
        c2.strokeStyle = P.ink; c2.lineWidth = 1.2; c2.setLineDash([3, 3]);
        c2.beginPath(); c2.moveTo(thx, by + 5); c2.lineTo(thx, by + 21); c2.stroke();
        c2.setLineDash([]);
        K.label(c2, 'eşik', thx, by + 33, { size: 11, color: P.ink2, align: 'center', mono: true });
        c2.restore();
      },
      resize: function () { v.sf.resize(); },
      dispose: function () { v.dispose(); fixed.dispose(); }
    };
  });
})();
