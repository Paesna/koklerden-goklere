/* Köklerden Göklere · Builder K · Bilgisayar ve ekran (son kullanıcı bilgisayarı, günlük terimler)
 *
 *   bits-letter      8 transistör anahtar → ikilik sayı → onluk toplam → ASCII harfi
 *   computer-inside  patlatılmış masaüstü bilgisayar: güç kaynağı, anakart, işlemci, RAM, SSD, ekran
 *   pixel-zoom       ekrandan tek piksele ve üç alt piksele (R, G, B) yakınlaşma
 *   resolution       çözünürlük (piksel sayısı) ve yenileme hızı (Hz)
 *   data-sizes       bit → bayt → KB → MB → GB → TB ölçek merdiveni
 *   cpu-terms        GHz, çekirdek, RAM ve depolama
 */
(function () {
  'use strict';
  var K = window.KGViz;
  if (!K) return;
  var P = K.palette;
  var TAU = Math.PI * 2;
  var clamp = K.clamp, lerp = K.lerp;

  /* ------------------------------------------------------------------ */
  /* Shared helpers                                                       */
  /* ------------------------------------------------------------------ */

  function eio(x) { return K.ease.inOut(clamp(x, 0, 1)); }
  function eout(x) { return K.ease.out(clamp(x, 0, 1)); }
  function sm(a, b, x) { return K.smoothstep(a, b, x); }

  /* Colours used by 2D overlays, per theme */
  function themeColors(theme) {
    var dark = theme === 'dark';
    return {
      dark: dark,
      ink: dark ? P.onNight : P.ink,
      ink2: dark ? '#C9CFDA' : P.ink2,
      muted: dark ? P.onNightMuted : P.muted,
      faint: dark ? '#5C6577' : '#A3A8B1',
      line: dark ? P.nightLine : P.line,
      line2: dark ? '#323A4A' : P.line2,
      card: dark ? '#141925' : '#FFFFFF',
      copper: dark ? P.copperLight : P.copper,
      copperFill: P.copperFill,
      copperSoft: dark ? 'rgba(227,154,108,0.16)' : P.copperSoft,
      blue: dark ? P.blueLight : P.blue,
      blueSoft: dark ? 'rgba(142,166,242,0.18)' : P.blueSoft,
      paper: dark ? P.night : P.paper
    };
  }

  /* Rounded box with smooth normals: size w × h × d, edge radius r, s segments per rounded edge. */
  function rbox(w, h, d, r, s) {
    var THREE = window.THREE;
    s = s || 4;
    r = Math.max(1e-4, Math.min(r, w / 2 - 1e-5, h / 2 - 1e-5, d / 2 - 1e-5));
    var n = 2 * s + 1;
    var geo = new THREE.BoxGeometry(1, 1, 1, n, n, n);
    var pos = geo.attributes.position, nor = geo.attributes.normal;
    var half = [w / 2 - r, h / 2 - r, d / 2 - r];
    var c = [0, 0, 0], u = [0, 0, 0];
    for (var i = 0; i < pos.count; i++) {
      c[0] = pos.getX(i); c[1] = pos.getY(i); c[2] = pos.getZ(i);
      for (var a = 0; a < 3; a++) {
        var k = Math.round((c[a] + 0.5) * n);
        if (k <= s) { u[a] = (k - s) / s; c[a] = -half[a]; }
        else { u[a] = (k - s - 1) / s; c[a] = half[a]; }
      }
      var len = Math.sqrt(u[0] * u[0] + u[1] * u[1] + u[2] * u[2]) || 1;
      var nx = u[0] / len, ny = u[1] / len, nz = u[2] / len;
      pos.setXYZ(i, c[0] + r * nx, c[1] + r * ny, c[2] + r * nz);
      nor.setXYZ(i, nx, ny, nz);
    }
    geo.computeBoundingBox();
    geo.computeBoundingSphere();
    return geo;
  }

  function M(color, rough, metal, extra) { return K.mat.std(color, rough, metal, extra); }

  /* Merge static meshes that share a material (and shadow flags) into one mesh each: far fewer draw
   * calls on integrated graphics. Instanced meshes, multi-material meshes and anything under an object
   * flagged userData.keep (moving parts) are left alone. Call once, after the scene is assembled. */
  function mergeStatic(root) {
    var THREE = window.THREE;
    root.updateMatrixWorld(true);
    var inv = new THREE.Matrix4().copy(root.matrixWorld).invert();
    var buckets = {}, order = [];
    root.traverse(function (o) {
      if (!o.isMesh || o.isInstancedMesh || Array.isArray(o.material) || o === root) return;
      for (var p = o; p && p !== root; p = p.parent) if (p.userData.keep) return;
      var key = o.material.uuid + '|' + (o.castShadow ? 1 : 0) + (o.receiveShadow ? 1 : 0);
      if (!buckets[key]) { buckets[key] = []; order.push(key); }
      buckets[key].push(o);
    });
    var m4 = new THREE.Matrix4(), nm = new THREE.Matrix3(), v3 = new THREE.Vector3();
    order.forEach(function (key) {
      var list = buckets[key];
      if (list.length < 2) return;
      var hasUv = list.every(function (o) { return !!o.geometry.attributes.uv; });
      var nv = 0, ni = 0;
      list.forEach(function (o) {
        var g = o.geometry;
        nv += g.attributes.position.count;
        ni += g.index ? g.index.count : g.attributes.position.count;
      });
      var pos = new Float32Array(nv * 3), nor = new Float32Array(nv * 3), uv = hasUv ? new Float32Array(nv * 2) : null;
      var idx = nv > 65535 ? new Uint32Array(ni) : new Uint16Array(ni);
      var vo = 0, io = 0;
      list.forEach(function (o) {
        var g = o.geometry, P2 = g.attributes.position, N2 = g.attributes.normal, U2 = g.attributes.uv;
        m4.multiplyMatrices(inv, o.matrixWorld);
        nm.getNormalMatrix(m4);
        for (var i = 0; i < P2.count; i++) {
          var b = (vo + i) * 3;
          v3.fromBufferAttribute(P2, i).applyMatrix4(m4);
          pos[b] = v3.x; pos[b + 1] = v3.y; pos[b + 2] = v3.z;
          if (N2) { v3.fromBufferAttribute(N2, i).applyMatrix3(nm).normalize(); nor[b] = v3.x; nor[b + 1] = v3.y; nor[b + 2] = v3.z; }
          if (uv) { uv[(vo + i) * 2] = U2.getX(i); uv[(vo + i) * 2 + 1] = U2.getY(i); }
        }
        var j;
        if (g.index) { for (j = 0; j < g.index.count; j++) idx[io + j] = g.index.getX(j) + vo; io += g.index.count; }
        else { for (j = 0; j < P2.count; j++) idx[io + j] = vo + j; io += P2.count; }
        vo += P2.count;
        o.parent.remove(o);
      });
      var geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      geo.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
      if (uv) geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
      geo.setIndex(new THREE.BufferAttribute(idx, 1));
      geo.computeBoundingSphere();
      var mm = new THREE.Mesh(geo, list[0].material);
      mm.castShadow = list[0].castShadow;
      mm.receiveShadow = list[0].receiveShadow;
      root.add(mm);
    });
  }

  /* Compile shaders and upload textures at creation, so the first appearance of an object during a
   * camera move does not stall a frame. */
  function prewarm(v) {
    var r = K.renderer();
    if (!r || !v.ready) return;
    try {
      r.compile(v.scene, v.camera);
      v.scene.traverse(function (o) {
        var mats = o.material ? (Array.isArray(o.material) ? o.material : [o.material]) : [];
        mats.forEach(function (m) {
          ['map', 'emissiveMap', 'alphaMap'].forEach(function (k) { if (m[k] && m[k].isTexture && r.initTexture) r.initTexture(m[k]); });
        });
      });
    } catch (e) { /* a missing context is handled by the core */ }
  }

  /* Shift the rendered content without rotating the camera (fractions of the view):
   * fx > 0 moves the picture left, fy > 0 moves it up. Keeps perspective symmetric around the subject. */
  function shiftView(v, fx, fy) {
    v.camera.setViewOffset(1000, 1000, fx * 1000, fy * 1000, 1000, 1000);
    v.camera.aspect = Math.max(1, v.w || 1) / Math.max(1, v.h || 1);
    v.camera.updateProjectionMatrix();
  }

  function mesh(geo, mat, cast, receive) {
    var m = new window.THREE.Mesh(geo, mat);
    m.castShadow = !!cast;
    m.receiveShadow = receive !== false;
    return m;
  }

  /* Soft additive glow sprite */
  function glowSprite(hex, size, tex, dark) {
    var THREE = window.THREE;
    // additive only on dark themes: on the shared transparent canvas it can leave dark patches on light slides
    var mat = new THREE.SpriteMaterial({ map: tex, color: hex, transparent: true, opacity: 0, depthWrite: false, blending: dark ? THREE.AdditiveBlending : THREE.NormalBlending, toneMapped: false });
    var s = new THREE.Sprite(mat);
    s.scale.set(size, size, 1);
    return s;
  }
  function radialTex() {
    return K.textTexture(128, 128, function (ctx, w, h) {
      var g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
      g.addColorStop(0, 'rgba(255,255,255,1)');
      g.addColorStop(0.22, 'rgba(255,255,255,0.55)');
      g.addColorStop(0.55, 'rgba(255,255,255,0.12)');
      g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
    });
  }

  /* 2D text. Font and letter spacing are cached on the context: setting them is the costly part of
   * canvas text, so they change only when needed. beginOverlay() drops the cache once per frame
   * (a canvas resize resets the context state). */
  var fontCache = {};
  function fontStr(size, weight, mono) {
    var k = size + '|' + weight + '|' + (mono ? 1 : 0);
    return fontCache[k] || (fontCache[k] = K.font(size, weight, mono));
  }
  function setFont(ctx, f) { if (ctx.__kf !== f) { ctx.font = f; ctx.__kf = f; } }
  function setLS(ctx, sp) {
    if (!('letterSpacing' in ctx)) return;
    var s = sp + 'px';
    if (ctx.__kls !== s) { ctx.letterSpacing = s; ctx.__kls = s; }
  }
  function beginOverlay(ctx) { ctx.__kf = null; ctx.__kls = null; }
  function txt(ctx, s, x, y, o) {
    setFont(ctx, fontStr(o.size || 13, o.weight || 400, o.mono));
    setLS(ctx, o.spacing || 0);
    ctx.fillStyle = o.color || P.ink2;
    ctx.textAlign = o.align || 'left';
    ctx.textBaseline = o.baseline || 'alphabetic';
    var a = ctx.globalAlpha;
    if (o.alpha !== undefined) ctx.globalAlpha = a * clamp(o.alpha, 0, 1);
    ctx.fillText(s, x, y);
    ctx.globalAlpha = a;
  }
  function tw(ctx, s, size, weight, mono, spacing) {
    setFont(ctx, fontStr(size, weight || 400, mono));
    setLS(ctx, spacing || 0);
    return ctx.measureText(s).width;
  }
  /* Uppercase mono tag, matching the DOM 'tag' class */
  function tag(ctx, s, x, y, C, o) {
    o = o || {};
    txt(ctx, s, x, y, { size: o.size || 11, weight: 500, mono: true, color: o.color || C.muted, spacing: 1.3, align: o.align, alpha: o.alpha });
  }

  function bitsOf(code) { var b = []; for (var i = 7; i >= 0; i--) b.push((code >> i) & 1); return b; }
  var PLACE = [128, 64, 32, 16, 8, 4, 2, 1];

  /* ------------------------------------------------------------------ */
  /* Transistor switch tile (used by bits-letter and data-sizes)          */
  /* ------------------------------------------------------------------ */
  /* Tile anatomy (top view): source contact | channel window | gate bar | channel window | drain contact.
   * The channel glows copper when the switch conducts (bit = 1). Body spans y in [-0.13, 0.13]. */
  function makeTileKit() {
    return {
      body: rbox(1, 0.26, 1, 0.1, 4),
      si: rbox(0.86, 0.04, 0.86, 0.018, 2),
      pad: rbox(0.13, 0.05, 0.72, 0.02, 2),
      ch: rbox(0.48, 0.022, 0.66, 0.01, 2),
      ox: rbox(0.15, 0.012, 0.72, 0.005, 1),
      gate: rbox(0.09, 0.07, 0.74, 0.025, 2),
      bodyMat: M(0x1F232A, 0.42, 0.0, { envMapIntensity: 0.55 }),
      siMat: M(0x2C323C, 0.34, 0.55, { envMapIntensity: 0.45 }),
      padMat: K.mat.tin({ color: 0x8E949D, roughness: 0.38, envMapIntensity: 0.7 }),
      oxMat: M(0xCFD6DE, 0.15, 0, { transparent: true, opacity: 0.5 }),
      gateMat: K.mat.aluminium({ color: 0xA9AEB6, roughness: 0.34, envMapIntensity: 0.75 })
    };
  }
  function makeTile(kit) {
    var THREE = window.THREE;
    var g = new THREE.Group();
    var body = mesh(kit.body, kit.bodyMat, true, true);
    g.add(body);
    var si = mesh(kit.si, kit.siMat, false, true); si.position.y = 0.15; g.add(si);
    var p1 = mesh(kit.pad, kit.padMat, true, true); p1.position.set(-0.3, 0.195, 0); g.add(p1);
    var p2 = mesh(kit.pad, kit.padMat, true, true); p2.position.set(0.3, 0.195, 0); g.add(p2);
    var chMat = M(0x1C2026, 0.55, 0.0, { emissive: 0xD6501A, emissiveIntensity: 0, envMapIntensity: 0.35 });
    var ch = mesh(kit.ch, chMat, false, true); ch.position.set(0, 0.181, 0); g.add(ch);
    var ox = mesh(kit.ox, kit.oxMat, false, false); ox.position.set(0, 0.198, 0); g.add(ox);
    var gate = mesh(kit.gate, kit.gateMat, true, true); gate.position.set(0, 0.239, 0); g.add(gate);
    var off = new THREE.Color(0x1C2026), on = new THREE.Color(0xA94F24);
    return {
      group: g, chMat: chMat,
      setOn: function (x) {
        chMat.color.copy(off).lerp(on, x);
        chMat.emissiveIntensity = 0.56 * x;
      }
    };
  }

  /* A row of tiles drawn with one instanced mesh per part: each switch still dips and glows on its own,
   * at a handful of draw calls. The conducting channel is an emitting surface (unlit, own colour). */
  function makeTileRow(kit, xs) {
    var THREE = window.THREE;
    var n = xs.length, g = new THREE.Group();
    var defs = [
      [kit.body, kit.bodyMat, [[0, 0]], true],
      [kit.si, kit.siMat, [[0, 0.15]], false],
      [kit.pad, kit.padMat, [[-0.3, 0.195], [0.3, 0.195]], true],
      [kit.ox, kit.oxMat, [[0, 0.198]], false],
      [kit.gate, kit.gateMat, [[0, 0.239]], true]
    ];
    var parts = defs.map(function (d) {
      var im = new THREE.InstancedMesh(d[0], d[1], n * d[2].length);
      im.castShadow = d[3];
      im.receiveShadow = true;
      im.frustumCulled = false;
      g.add(im);
      return { im: im, offs: d[2] };
    });
    var ch = new THREE.InstancedMesh(kit.ch, new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false }), n);
    ch.frustumCulled = false;
    g.add(ch);
    var m = new THREE.Matrix4(), cOff = new THREE.Color(0x1E2228), cOn = new THREE.Color(0xDD7440), c = new THREE.Color();
    var row = {
      group: g,
      set: function (i, dip, on) {
        for (var p = 0; p < parts.length; p++) {
          var Pp = parts[p];
          for (var k = 0; k < Pp.offs.length; k++) {
            m.makeTranslation(xs[i] + Pp.offs[k][0], Pp.offs[k][1] - dip, 0);
            Pp.im.setMatrixAt(i * Pp.offs.length + k, m);
          }
        }
        m.makeTranslation(xs[i], 0.181 - dip, 0);
        ch.setMatrixAt(i, m);
        ch.setColorAt(i, c.copy(cOff).lerp(cOn, on));
      },
      commit: function () {
        for (var p = 0; p < parts.length; p++) parts[p].im.instanceMatrix.needsUpdate = true;
        ch.instanceMatrix.needsUpdate = true;
        ch.instanceColor.needsUpdate = true;
      }
    };
    for (var i = 0; i < n; i++) row.set(i, 0, 0);
    row.commit();
    return row;
  }

  /* ------------------------------------------------------------------ */
  /* Screen shader: one procedural landscape shown on a pixel grid.       */
  /* Far away a pixel is smaller than a screen fragment and the picture   */
  /* is smooth; closer, the pixels become blocks; very close, each pixel  */
  /* resolves into its red, green and blue subpixels.                     */
  /* ------------------------------------------------------------------ */
  var SCREEN_VS = [
    'varying vec2 vUv;',
    'void main() {',
    '  vUv = uv;',
    '  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);',
    '}'
  ].join('\n');

  var SCREEN_FS = [
    'uniform vec2 uRes;',
    'uniform vec2 uSel;',
    'uniform vec3 uSelCol;',
    'uniform float uSub;',
    'uniform float uOn;',
    'uniform vec4 uWin;',
    'uniform float uGrid;',
    'uniform float uLift;',
    'uniform vec2 uRes2;',
    'uniform float uWipe;',
    'varying vec2 vUv;',
    'const float A = 1.7777778;',
    'const vec2 SUN = vec2(0.70, 0.372);',
    'const float SUNR = 0.042;',
    'const float WL = 0.282;',
    'float h0(float x) { return 0.385 + 0.045 * sin(6.0 * x + 0.3) + 0.022 * sin(13.0 * x + 1.7) + 0.010 * sin(29.0 * x + 0.5); }',
    'float h1(float x) { return 0.325 + 0.055 * sin(4.2 * x + 2.1) + 0.026 * sin(11.0 * x + 0.4) + 0.010 * sin(23.0 * x + 2.0); }',
    'float h2(float x) { float a = (x - 0.10) / 0.24; float b = (x - 1.02) / 0.14; return 0.165 + 0.14 * exp(-a * a) + 0.08 * exp(-b * b) + 0.008 * sin(17.0 * x + 0.5); }',
    'float h3(float x) { return 0.07 + 0.03 * sin(2.5 * x + 0.8) + 0.008 * sin(11.0 * x); }',
    'vec3 skyCol(vec2 p, float aa) {',
    '  vec3 c = mix(vec3(0.98, 0.84, 0.68), vec3(0.66, 0.75, 0.85), smoothstep(0.34, 0.66, p.y));',
    '  c = mix(c, vec3(0.36, 0.52, 0.72), smoothstep(0.66, 1.05, p.y));',
    '  float r = length((p - SUN) * vec2(A, 1.0));',
    '  c = mix(c, vec3(1.0, 0.74, 0.45), 0.6 * exp(-r / 0.17));',
    '  c = mix(c, vec3(1.0, 0.55, 0.16), 0.9 * exp(-r / 0.06) * (1.0 - smoothstep(0.36, 0.5, p.y)));',
    '  c = mix(c, vec3(1.0, 0.97, 0.88), 1.0 - smoothstep(SUNR - aa, SUNR + aa, r));',
    '  return c;',
    '}',
    'vec3 upper(vec2 p, float aa) {',
    '  vec3 c = skyCol(p, aa);',
    '  float hz = exp(-length((p - SUN) * vec2(A, 1.0)) / 0.24);',
    '  float H = h0(p.x);',
    '  vec3 r0 = mix(vec3(0.60, 0.64, 0.75), vec3(0.71, 0.72, 0.81), smoothstep(H - 0.09, H, p.y));',
    '  r0 = mix(r0, vec3(0.95, 0.74, 0.58), 0.5 * hz);',
    '  c = mix(c, r0, smoothstep(-aa, aa, H - p.y));',
    '  H = h1(p.x);',
    '  vec3 r1 = mix(vec3(0.40, 0.47, 0.58), vec3(0.51, 0.56, 0.66), smoothstep(H - 0.09, H, p.y));',
    '  r1 = mix(r1, vec3(0.82, 0.62, 0.50), 0.32 * hz);',
    '  c = mix(c, r1, smoothstep(-aa, aa, H - p.y));',
    '  return c;',
    '}',
    'vec3 land(vec2 p, float aa) {',
    '  aa = max(aa, 1e-5);',
    '  vec3 c = upper(p, aa);',
    '  float x = p.x, y = p.y;',
    '  float e = smoothstep(-aa, aa, WL - y);',
    '  if (e > 0.0) {',
    '    vec3 w = upper(vec2(x, 2.0 * WL - y), aa) * vec3(0.78, 0.83, 0.88);',
    '    float gx = exp(-abs(x - SUN.x) * A / 0.028);',
    '    float ra = 1.0 - smoothstep(0.003, 0.01, aa);',
    '    float rip = mix(0.6, 0.5 + 0.5 * sin(y * 430.0 + sin(x * 57.0) * 2.0), ra);',
    '    w = mix(w, vec3(1.0, 0.85, 0.62), gx * (0.25 + 0.55 * rip) * smoothstep(0.14, WL, y));',
    '    c = mix(c, w, e);',
    '  }',
    '  float H = h2(x);',
    '  vec3 r2 = mix(vec3(0.23, 0.34, 0.29), vec3(0.34, 0.45, 0.38), smoothstep(H - 0.12, H, y));',
    '  c = mix(c, r2, smoothstep(-aa, aa, H - y));',
    '  H = h3(x);',
    '  vec3 r3 = mix(vec3(0.14, 0.22, 0.18), vec3(0.21, 0.31, 0.25), smoothstep(H - 0.08, H, y));',
    '  c = mix(c, r3, smoothstep(-aa, aa, H - y));',
    '  return clamp(c, 0.0, 1.0);',
    '}',
    /* one pixel: three vertical subpixel emitters in a black matrix */
    'vec3 subpix(vec2 pf, vec3 c, float fpp) {',
    '  float x3 = pf.x * 3.0;',
    '  float k = floor(x3);',
    '  vec2 q = vec2((fract(x3) - 0.5) / 3.0, pf.y - 0.5);',
    '  vec2 hs = vec2(0.39 / 3.0, 0.445);',
    '  float r = 0.03;',
    '  vec2 dd = abs(q) - (hs - r);',
    '  float d = length(max(dd, 0.0)) + min(max(dd.x, dd.y), 0.0) - r;',
    '  float aa = 1.2 / fpp;',
    '  float inside = 1.0 - smoothstep(-aa, aa, d);',
    '  float val = k < 0.5 ? c.r : (k < 1.5 ? c.g : c.b);',
    '  vec3 prim = k < 0.5 ? vec3(1.0, 0.12, 0.07) : (k < 1.5 ? vec3(0.15, 1.0, 0.2) : vec3(0.13, 0.3, 1.0));',
    '  float shade = 0.84 + 0.16 * (1.0 - smoothstep(0.0, 0.5, length(q * vec2(2.4, 1.0))));',
    '  vec3 em = prim * val * shade;',
    '  vec3 bm = vec3(0.032, 0.035, 0.042);',
    '  float halo = exp(-max(d, 0.0) / 0.022) * 0.3 * val;',
    '  return mix(bm + prim * halo, em, inside);',
    '}',
    'vec3 toLin(vec3 c) { return mix(c / 12.92, pow((c + 0.055) / 1.055, vec3(2.4)), step(0.04045, c)); }',
    'void main() {',
    '  vec2 uv = uWin.xy + vUv * uWin.zw;',
    '  vec2 R = uv.x < uWipe ? uRes2 : uRes;',
    '  vec2 pc = uv * R;',
    '  vec2 fw = fwidth(pc);',
    '  float ppf = max(max(fw.x, fw.y), 1e-6);',
    '  float fpp = 1.0 / ppf;',
    '  vec2 pi = floor(pc);',
    '  vec2 pf = pc - pi;',
    '  bool sel = abs(pi.x - uSel.x) < 0.5 && abs(pi.y - uSel.y) < 0.5;',
    '  vec3 cPix = sel ? uSelCol : land((pi + 0.5) / R, 1e-5);',
    '  vec3 col = cPix;',
    '  float tS = smoothstep(0.6, 1.3, ppf);',
    '  if (tS > 0.0) col = mix(cPix, land(uv, length(fwidth(uv)) * 0.9), tS);',
    '  if (uSub > 0.0) {',
    '    float tSub = smoothstep(14.0, 30.0, fpp) * uSub;',
    '    if (tSub > 0.0) col = mix(col, subpix(pf, cPix, fpp), tSub);',
    '  }',
    '  if (uGrid > 0.0) {',
    '    float dm = min(min(pf.x, 1.0 - pf.x), min(pf.y, 1.0 - pf.y)) * fpp;',
    '    float ln = (1.0 - smoothstep(0.35, 1.0, dm)) * smoothstep(5.0, 12.0, fpp) * uGrid;',
    '    col = mix(col, col * 0.72, ln);',
    '  }',
    '  if (uWipe > -0.5) { float wl = 1.0 - smoothstep(0.0, 2.2 * fwidth(uv.x), abs(uv.x - uWipe)); col = mix(col, vec3(1.0, 0.96, 0.88), wl * 0.95); }',
    '  col = mix(vec3(0.045, 0.05, 0.058), col, uOn) + uLift;',
    '  gl_FragColor = vec4(toLin(clamp(col, 0.0, 1.0)), 1.0);',
    '  #include <encodings_fragment>',
    '}'
  ].join('\n');

  function screenMaterial(o) {
    var THREE = window.THREE;
    o = o || {};
    return new THREE.ShaderMaterial({
      uniforms: {
        uRes: { value: new THREE.Vector2(o.res ? o.res[0] : 1920, o.res ? o.res[1] : 1080) },
        uSel: { value: new THREE.Vector2(o.sel ? o.sel[0] : -10, o.sel ? o.sel[1] : -10) },
        uSelCol: { value: new THREE.Vector3(1, 140 / 255, 40 / 255) },
        uSub: { value: o.sub ? 1 : 0 },
        uOn: { value: 1 },
        uWin: { value: new THREE.Vector4(0, 0, 1, 1) },
        uGrid: { value: o.grid || 0 },
        uLift: { value: 0 },
        uRes2: { value: new THREE.Vector2(o.res ? o.res[0] : 1920, o.res ? o.res[1] : 1080) },
        uWipe: { value: -1 }
      },
      vertexShader: SCREEN_VS,
      fragmentShader: SCREEN_FS,
      toneMapped: false,
      extensions: { derivatives: true }
    });
  }

  /* Flat-panel monitor in mm. The group origin is the centre of the active screen (screen plane z = 0).
   * o: {sw, sh (active area), bezel, chin, standGap, screenMat, bodyColor} → {group, screen, groundY, outer} */
  function makeMonitor(o) {
    var THREE = window.THREE;
    var sw = o.sw, sh = o.sh, bz = o.bezel || 6.5, chin = o.chin || 16;
    var W = sw + 2 * bz, H = sh + bz + chin;
    var cy = (chin - bz) / 2;               // outer frame centre is below the screen centre
    var g = new THREE.Group();
    var bodyMat = M(o.bodyColor || 0x2A2D33, 0.5, 0.1, { envMapIntensity: 0.7 });
    var bezelMat = M(0x121417, 0.5, 0.0, { envMapIntensity: 0.45 });
    var standMat = K.mat.aluminium({ color: 0x8C9199, roughness: 0.38, envMapIntensity: 0.8 });
    // bezel frame with an opening for the screen
    var s = new THREE.Shape();
    var rr = 5, x0 = -W / 2, y0 = -sh / 2 - chin, x1 = W / 2, y1 = sh / 2 + bz;
    s.moveTo(x0 + rr, y0); s.lineTo(x1 - rr, y0); s.quadraticCurveTo(x1, y0, x1, y0 + rr);
    s.lineTo(x1, y1 - rr); s.quadraticCurveTo(x1, y1, x1 - rr, y1); s.lineTo(x0 + rr, y1);
    s.quadraticCurveTo(x0, y1, x0, y1 - rr); s.lineTo(x0, y0 + rr); s.quadraticCurveTo(x0, y0, x0 + rr, y0);
    var hole = new THREE.Path();
    var hx = sw / 2 + 0.6, hy = sh / 2 + 0.6;
    hole.moveTo(-hx, -hy); hole.lineTo(-hx, hy); hole.lineTo(hx, hy); hole.lineTo(hx, -hy); hole.lineTo(-hx, -hy);
    s.holes.push(hole);
    var bezGeo = new THREE.ExtrudeGeometry(s, { depth: 1.4, bevelEnabled: true, bevelThickness: 0.7, bevelSize: 0.7, bevelSegments: 2, curveSegments: 5 });
    var bezel = mesh(bezGeo, bezelMat, true, true);
    bezel.position.z = -0.9;
    g.add(bezel);
    // panel body behind the bezel
    var body = mesh(rbox(W - 1, H - 1, 9, 3.5), bodyMat, true, true);
    body.position.set(0, -cy, -5.6);
    g.add(body);
    // rear housing (electronics, mount)
    var rear = mesh(rbox(sw * 0.6, sh * 0.62, 22, 9), bodyMat, true, true);
    rear.position.set(0, -sh * 0.04, -19);
    g.add(rear);
    // screen
    var screen = new THREE.Mesh(new THREE.PlaneGeometry(sw, sh, 32, 18), o.screenMat);
    g.add(screen);
    // stand: neck and base
    var standGap = o.standGap === undefined ? 105 : o.standGap;
    var groundY = -sh / 2 - chin - standGap;
    var neckTop = -sh * 0.04, neckLen = neckTop - groundY - 6;
    var neck = mesh(rbox(58, neckLen, 16, 5), standMat, true, true);
    neck.position.set(0, groundY + 6 + neckLen / 2, -36);
    g.add(neck);
    var base = mesh(rbox(sw * 0.44, 7, sh * 0.62, 3.2), standMat, true, true);
    base.position.set(0, groundY + 3.5, -40);
    g.add(base);
    return { group: g, screen: screen, groundY: groundY, outer: { w: W, h: H, cy: cy } };
  }

  /* ================================================================== */
  /* bits-letter · W 1120×380                                             */
  /* ================================================================== */
  /* ================================================================== */
  /* computer-inside · W 1120×380                                         */
  /* ================================================================== */
  K.register('computer-inside', function (el, opts) {
    var THREE = window.THREE;
    opts = opts || {};
    var theme = opts.theme || 'light';
    var C = themeColors(theme);
    var RM = K.reducedMotion;
    var GY = -12;                                    // desk (mm)
    var SC = 0.58;                                   // socket and power supply drawn smaller (ölçekli değil)

    var v = K.stage3d(el, {
      theme: theme, fov: 22, yaw: 0, pitch: 0.62, distance: 870, target: [6, 0, 6], near: 100, far: 4000,
      size: 420, ground: GY, minYaw: -0.35, maxYaw: 0.35, minPitch: 0.3, maxPitch: 1.05, minDistance: 600, maxDistance: 1100
    });
    shiftView(v, 0, -0.13);
    if (v.lights) {
      var kc = v.lights.key.shadow.camera;
      kc.left = -600; kc.right = 600; kc.top = 600; kc.bottom = -600; kc.far = 3000;
      kc.updateProjectionMatrix();
      v.lights.key.position.set(150, 900, 250);
    }
    var root = new THREE.Group();
    v.scene.add(root);

    function decal(tex, w, d, x, y, z, rough) {
      var m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), M(0xffffff, rough === undefined ? 0.6 : rough, 0, { map: tex }));
      m.rotation.x = -Math.PI / 2;
      m.position.set(x, y, z);
      m.receiveShadow = true;
      return m;
    }
    var BITS = 'DENEYAP'.split('').map(function (ch) { return bitsOf(ch.charCodeAt(0)); });

    /* ---------------- motherboard ---------------- */
    var BW = 305, BD = 244;
    var board = new THREE.Group();
    root.add(board);
    board.add(mesh(rbox(BW, 1.6, BD, 0.8, 2), M(0x1B1E23, 0.7, 0.05, { envMapIntensity: 0.4 }), true, true));
    var L = {
      cpu: [-22, -42], dimm: [[78, 30], [78, 52]], m2: [-74, 88], atx: [-146, -20], vrmA: [-86, -42], vrmB: [-22, -104],
      chipset: [-112, 40], pcie: [-40, 46]
    };
    var boardTex = K.textTexture(1220, 976, function (ctx, w, h) {
      var s = w / BW;
      function X(x) { return (x + BW / 2) * s; }
      function Z(z) { return (z + BD / 2) * s; }
      ctx.fillStyle = '#1C1F24'; ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = 'rgba(120,128,140,0.16)';
      ctx.lineWidth = 1.6;
      var rr = K.rng(11);
      for (var i = 0; i < 70; i++) {
        var x0 = rr() * w, z0 = rr() * h, len = 40 + rr() * 220, horiz = rr() < 0.5;
        ctx.beginPath(); ctx.moveTo(x0, z0);
        if (horiz) { ctx.lineTo(x0 + len, z0); ctx.lineTo(x0 + len + 20, z0 + 20); }
        else { ctx.lineTo(x0, z0 + len); ctx.lineTo(x0 + 20, z0 + len + 20); }
        ctx.stroke();
      }
      ctx.strokeStyle = 'rgba(150,158,170,0.24)';
      ctx.lineWidth = 1.3;
      for (var k = 0; k < 12; k++) {
        ctx.beginPath();
        ctx.moveTo(X(L.cpu[0] + 26), Z(L.cpu[1] - 10 + k * 2));
        ctx.lineTo(X(L.cpu[0] + 36 + k * 1.2), Z(L.cpu[1] - 10 + k * 2));
        ctx.lineTo(X(L.cpu[0] + 36 + k * 1.2), Z(L.dimm[0][1] - 8));
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(X(L.cpu[0] - 26), Z(L.cpu[1] + 8 + k * 1.6));
        ctx.lineTo(X(L.m2[0] + 30 - k * 1.4), Z(L.cpu[1] + 8 + k * 1.6));
        ctx.lineTo(X(L.m2[0] + 30 - k * 1.4), Z(L.m2[1] - 14));
        ctx.stroke();
      }
      ctx.strokeStyle = 'rgba(235,235,230,0.75)';
      ctx.fillStyle = 'rgba(235,235,230,0.8)';
      ctx.lineWidth = 2;
      ctx.font = '600 24px ' + K.fonts.mono;
      ctx.strokeRect(X(L.cpu[0] - 30), Z(L.cpu[1] - 30), 60 * s, 60 * s);
      ctx.fillText('CPU', X(L.cpu[0] - 29), Z(L.cpu[1] - 33));
      ctx.fillText('DIMM_A', X(L.dimm[0][0] + 74), Z(L.dimm[0][1] + 3));
      ctx.fillText('DIMM_B', X(L.dimm[1][0] + 74), Z(L.dimm[1][1] + 3));
      ctx.fillText('M.2', X(L.m2[0] - 52), Z(L.m2[1] + 20));
      ctx.fillText('ATX_PWR', X(L.atx[0] + 9), Z(L.atx[1] + 42));
      ctx.font = '500 17px ' + K.fonts.mono;
      for (var j = 0; j < 12; j++) ctx.fillText('C' + (101 + j), X(-6 + (j % 6) * 24), Z(100 + Math.floor(j / 6) * 9));
      ctx.fillStyle = '#B9BEC6';
      [[-146, -114], [146, -114], [-146, 114], [146, 114], [0, -114], [0, 114]].forEach(function (p) {
        ctx.beginPath(); ctx.arc(X(p[0]), Z(p[1]), 3.4 * s, 0, TAU); ctx.fill();
        ctx.fillStyle = '#16181C'; ctx.beginPath(); ctx.arc(X(p[0]), Z(p[1]), 1.8 * s, 0, TAU); ctx.fill();
        ctx.fillStyle = '#B9BEC6';
      });
    });
    var bdec = decal(boardTex, BW - 0.6, BD - 0.6, 0, 0.81, 0, 0.78);
    bdec.material.envMapIntensity = 0.35;
    board.add(bdec);
    var capGeo = new THREE.CylinderGeometry(3.1, 3.1, 7, 18);
    var caps = new THREE.InstancedMesh(capGeo, K.mat.aluminium({ color: 0xA9AEB6, roughness: 0.35 }), 22);
    var cm = new THREE.Matrix4(), capPos = [];
    for (var ci = 0; ci < 11; ci++) capPos.push([L.vrmA[0] - 13, L.cpu[1] - 34 + ci * 7.2]);
    for (ci = 0; ci < 11; ci++) capPos.push([L.cpu[0] - 36 + ci * 7.2, L.vrmB[1] + 16]);
    capPos.forEach(function (p, i) { cm.makeTranslation(p[0], 4.3, p[1]); caps.setMatrixAt(i, cm); });
    caps.castShadow = true; caps.receiveShadow = true;
    board.add(caps);
    var hsBaseMat = K.mat.aluminium({ color: 0x4C5159, roughness: 0.45 }), hsFinMat = K.mat.aluminium({ color: 0x5A6069, roughness: 0.42 });
    var slotMat = M(0x23262C, 0.5, 0.05), latchMat = M(0xD9D6CF, 0.5, 0), pinSteel = K.mat.steel({ roughness: 0.25 });
    function heatsink(w, h, d, x, z, fins, alongX) {
      var g = new THREE.Group();
      var base = mesh(rbox(w, 3, d, 1), hsBaseMat, true, true);
      base.position.y = 1.5;
      g.add(base);
      var fm = hsFinMat;
      for (var i = 0; i < fins; i++) {
        var f = mesh(rbox(alongX ? 1.4 : w, h, alongX ? d : 1.4, 0.5, 1), fm, true, true);
        var o = -0.5 + (i + 0.5) / fins;
        if (alongX) f.position.set(o * w, 3 + h / 2, 0); else f.position.set(0, 3 + h / 2, o * d);
        g.add(f);
      }
      g.position.set(x, 0.8, z);
      return g;
    }
    board.add(heatsink(16, 16, 62, L.vrmA[0], L.cpu[1], 7, false));
    board.add(heatsink(70, 16, 16, L.vrmB[0], L.vrmB[1], 9, true));
    var chipset = mesh(rbox(36, 7, 36, 2), hsBaseMat, true, true);
    chipset.position.set(L.chipset[0], 4.3, L.chipset[1]);
    board.add(chipset);
    var pcie = mesh(rbox(89, 11, 7.5, 1.2), slotMat, true, true);
    pcie.position.set(L.pcie[0], 6.3, L.pcie[1]);
    board.add(pcie);
    var atx = mesh(rbox(10, 14, 52, 1.2), M(0xE9E7E1, 0.55, 0), true, true);
    atx.position.set(L.atx[0], 7.8, L.atx[1]);
    board.add(atx);
    var ioShield = mesh(rbox(6, 22, 76, 1), K.mat.steel({ color: 0xA4AAB2, roughness: 0.4 }), true, true);
    ioShield.position.set(BW / 2 - 4, 12, -68);
    board.add(ioShield);

    /* ---------------- CPU socket and exploded CPU ---------------- */
    var CS = 1.8;                                    // CPU drawn 1,8× (ölçekli değil)
    var socket = new THREE.Group();
    socket.position.set(L.cpu[0], 0.8, L.cpu[1]);
    board.add(socket);
    var sFrame = mesh(rbox(46 * CS, 3.4, 50 * CS, 1), M(0x3A3E46, 0.45, 0.4), true, true);
    sFrame.position.y = 1.7;
    socket.add(sFrame);
    var lgaTex = K.textTexture(256, 256, function (ctx, w, h) {
      ctx.fillStyle = '#2B2E33'; ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#C9A24E';
      for (var i = 0; i < 40; i++) for (var j = 0; j < 40; j++) {
        if (i > 15 && i < 24 && j > 15 && j < 24) continue;
        ctx.fillRect(6 + i * 6.1, 6 + j * 6.1, 2.6, 2.6);
      }
    });
    socket.add(decal(lgaTex, 37.5 * CS * 0.98, 37.5 * CS * 0.98, 0, 3.45, 0, 0.35));
    var cpu = new THREE.Group();
    cpu.position.set(L.cpu[0], 0, L.cpu[1]);
    board.add(cpu);
    var substrate = mesh(rbox(37.5 * CS, 1.3, 37.5 * CS, 0.5, 1), M(0x2F5A3B, 0.5, 0.05), true, true);
    cpu.add(substrate);
    var dieTex = K.textTexture(512, 420, function (ctx, w, h) {
      ctx.fillStyle = '#1D2128'; ctx.fillRect(0, 0, w, h);
      var cores = [[16, 16], [134, 16], [16, 214], [134, 214]];
      cores.forEach(function (c) {
        ctx.fillStyle = '#3A414E'; ctx.fillRect(c[0], c[1], 110, 186);
        ctx.fillStyle = '#4C5463'; ctx.fillRect(c[0] + 8, c[1] + 8, 94, 60);
        ctx.fillStyle = '#2F3540';
        for (var i = 0; i < 6; i++) ctx.fillRect(c[0] + 8, c[1] + 80 + i * 16, 94, 10);
      });
      ctx.fillStyle = '#5E5048';
      for (var r = 0; r < 12; r++) for (var q = 0; q < 6; q++) ctx.fillRect(262 + q * 39, 16 + r * 32, 33, 26);
      ctx.strokeStyle = 'rgba(200,205,215,0.3)'; ctx.lineWidth = 2;
      ctx.strokeRect(6, 6, w - 12, h - 12);
    });
    var dieEm = K.textTexture(512, 420, function (ctx, w, h) {
      ctx.fillStyle = '#000'; ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#fff';
      [[16, 16], [134, 16], [16, 214], [134, 214]].forEach(function (c) { ctx.fillRect(c[0] + 8, c[1] + 8, 94, 60); });
    });
    var dieMat = M(0xffffff, 0.24, 0.4, { map: dieTex, emissive: 0xE8803F, emissiveMap: dieEm, emissiveIntensity: 0 });
    var dieSide = M(0x262A31, 0.3, 0.5);
    var die = mesh(new THREE.BoxGeometry(15 * CS, 0.8, 12.4 * CS), [dieSide, dieSide, dieMat, dieSide, dieSide, dieSide], true, true);
    cpu.add(die);
    var ihs = new THREE.Group();
    ihs.add(mesh(rbox(33 * CS, 2.6, 33 * CS, 1.6, 3), K.mat.steel({ color: 0xCBD0D6, roughness: 0.22 }), true, true));
    var lip = mesh(rbox(36 * CS, 0.9, 36 * CS, 0.45, 2), K.mat.steel({ color: 0xBFC4CB, roughness: 0.3 }), true, true);
    lip.position.y = -1.6;
    ihs.add(lip);
    cpu.add(ihs);

    /* ---------------- RAM: two DIMM slots and sticks ---------------- */
    var sticks = [];
    var chipMat = M(0x16181C, 0.42, 0.1);
    var ramPcbMat = M(0x2D5B3B, 0.45, 0.05);
    var goldMat = K.mat.gold({ roughness: 0.28 });
    L.dimm.forEach(function (p) {
      var slot = mesh(rbox(142, 8, 7, 1.2), slotMat, true, true);
      slot.position.set(p[0], 4.8, p[1]);
      board.add(slot);
      [-1, 1].forEach(function (sgn) {
        var latch = mesh(rbox(5, 10, 7.5, 1), latchMat, true, true);
        latch.position.set(p[0] + sgn * 73, 6, p[1]);
        board.add(latch);
      });
      var g = new THREE.Group();
      g.add(mesh(rbox(133.35, 31.25, 1.2, 0.5, 1), ramPcbMat, true, true));
      for (var c = 0; c < 8; c++) {
        [-1, 1].forEach(function (side) {
          var chip = mesh(rbox(10, 11.5, 1.1, 0.25, 1), chipMat, true, true);
          chip.position.set(-56.5 + c * 16.1 + (c >= 4 ? 4 : 0), 3, side * 1.15);
          g.add(chip);
        });
      }
      var fingers = mesh(new THREE.BoxGeometry(126, 3.6, 1.25), goldMat, false, true);
      fingers.position.set(0, -31.25 / 2 + 2.2, 0);
      g.add(fingers);
      g.position.set(p[0], 0, p[1]);
      board.add(g);
      sticks.push(g);
    });

    /* ---------------- M.2 SSD ---------------- */
    var SS = 1.25;                                   // drawn 1,25×
    var m2conn = mesh(rbox(22 * SS, 5, 9, 1), slotMat, true, true);
    m2conn.position.set(L.m2[0] - 40 * SS, 3.3, L.m2[1]);
    board.add(m2conn);
    var m2screw = mesh(new THREE.CylinderGeometry(2.6, 2.6, 4, 16), K.mat.steel({ roughness: 0.3 }), true, true);
    m2screw.position.set(L.m2[0] + 40 * SS, 2.8, L.m2[1]);
    board.add(m2screw);
    var ssd = new THREE.Group();
    ssd.add(mesh(rbox(80 * SS, 0.9, 22 * SS, 0.35, 1), M(0x17191D, 0.45, 0.05), true, true));
    var ssdLabelTex = K.textTexture(640, 176, function (ctx, w, h) {
      ctx.fillStyle = '#E9E8E3'; ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#2B2F36';
      ctx.font = '600 50px ' + K.fonts.sans;
      ctx.fillText('SSD', 26, 66);
      ctx.font = '500 27px ' + K.fonts.mono;
      ctx.fillStyle = '#5A606B';
      ctx.fillText('M.2 2280 · NAND flash', 26, 112);
      ctx.fillText('1 TB', 26, 152);
      ctx.fillStyle = '#C8693A'; ctx.fillRect(w - 70, 26, 44, 8);
    });
    var ssdLabel = mesh(new THREE.PlaneGeometry(58 * SS, 16 * SS), M(0xffffff, 0.55, 0, { map: ssdLabelTex }), false, true);
    ssdLabel.rotation.x = -Math.PI / 2;
    ssdLabel.position.set(4 * SS, 1.75, 0);
    ssd.add(ssdLabel);
    var nand = mesh(rbox(12 * SS, 1.3, 14 * SS, 0.3, 1), chipMat, true, true);
    nand.position.set(-30 * SS, 1.1, 0);
    ssd.add(nand);
    var ssdFingers = mesh(new THREE.BoxGeometry(4, 0.95, 19 * SS), goldMat, false, true);
    ssdFingers.position.set(-38.2 * SS, 0, 0);
    ssd.add(ssdFingers);
    ssd.position.set(L.m2[0], 0, L.m2[1]);
    board.add(ssd);

    /* ---------------- power supply with fan ---------------- */
    var PSU = { x: -222, z: 6, w: 150, h: 86, d: 140 };
    var psu = new THREE.Group();
    psu.scale.setScalar(SC);
    psu.position.set(PSU.x, GY + PSU.h / 2 * SC, PSU.z);
    root.add(psu);
    psu.add(mesh(rbox(PSU.w, PSU.h, PSU.d, 3, 3), M(0x23262B, 0.62, 0.15), true, true));
    var well = mesh(new THREE.CylinderGeometry(58, 58, 1.2, 64), M(0x0F1114, 0.8, 0), false, true);
    well.position.y = PSU.h / 2 + 0.2;
    psu.add(well);
    var fan = new THREE.Group();
    fan.userData.keep = true;
    fan.position.y = PSU.h / 2 + 1.6;
    psu.add(fan);
    fan.add(mesh(new THREE.CylinderGeometry(17, 17, 3, 40), M(0x2A2D33, 0.5, 0.1), false, true));
    var bladeShape = new THREE.Shape();
    bladeShape.moveTo(15, -5);
    bladeShape.bezierCurveTo(30, -12, 48, -9, 55, 2);
    bladeShape.bezierCurveTo(50, 10, 34, 13, 16, 7);
    bladeShape.lineTo(15, -5);
    var bladeGeo = new THREE.ExtrudeGeometry(bladeShape, { depth: 1, bevelEnabled: false });
    bladeGeo.rotateX(-Math.PI / 2);
    var bladeMat = M(0x353940, 0.48, 0.05);
    for (var b = 0; b < 7; b++) {
      var bl = mesh(bladeGeo, bladeMat, false, true);
      bl.rotation.y = b * TAU / 7;
      fan.add(bl);
    }
    var grilleMat = K.mat.steel({ color: 0x8E949C, roughness: 0.35 });
    [14, 26, 38, 50, 59].forEach(function (r) {
      var ring = mesh(new THREE.TorusGeometry(r, 0.9, 6, 72), grilleMat, false, true);
      ring.rotation.x = Math.PI / 2;
      ring.position.y = PSU.h / 2 + 4;
      psu.add(ring);
    });
    for (var sp = 0; sp < 4; sp++) {
      var spoke = mesh(new THREE.BoxGeometry(118, 1.4, 1.4), grilleMat, false, true);
      spoke.rotation.y = sp * Math.PI / 4;
      spoke.position.y = PSU.h / 2 + 4;
      psu.add(spoke);
    }
    var psuTex = K.textTexture(1024, 560, function (ctx, w, h) {
      ctx.fillStyle = '#DEDCD6'; ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#23262B';
      ctx.font = '600 64px ' + K.fonts.sans;
      ctx.fillText('GÜÇ KAYNAĞI', 46, 104);
      ctx.fillStyle = '#C8693A'; ctx.fillRect(46, 132, 120, 8);
      ctx.fillStyle = '#3E434D';
      ctx.font = '500 44px ' + K.fonts.mono;
      ctx.fillText('GİRİŞ  230 V ~ 50 Hz', 46, 236);
      ctx.fillText('ÇIKIŞ  +12 V  +5 V  +3,3 V', 46, 316);
      ctx.fillRect(700, 352, 120, 7);
      for (var i = 0; i < 4; i++) ctx.fillRect(700 + i * 33, 372, 22, 7);
      ctx.font = '500 34px ' + K.fonts.mono;
      ctx.fillText('doğru akım', 46, 384);
    });
    var psuLabel = mesh(new THREE.PlaneGeometry(118, 64.5), M(0xffffff, 0.6, 0, { map: psuTex }), false, true);
    psuLabel.position.set(0, -2, PSU.d / 2 + 0.3);
    psu.add(psuLabel);
    var inlet = mesh(rbox(3, 22, 28, 1), M(0x111316, 0.6, 0), false, true);
    inlet.position.set(-PSU.w / 2 - 1, 10, -30);
    psu.add(inlet);

    /* ---------------- wall socket and plug ---------------- */
    var wallG = new THREE.Group();
    wallG.scale.setScalar(SC);
    wallG.position.set(-318, GY, -70);
    root.add(wallG);
    var wall = mesh(rbox(110, 250, 14, 3), M(0xCDC9BF, 0.85, 0), true, true);
    wall.position.set(0, 125, -7);
    wallG.add(wall);
    var plate = mesh(rbox(80, 80, 9, 7, 3), M(0xF4F3EF, 0.42, 0), true, true);
    plate.position.set(0, 150, 4.5);
    wallG.add(plate);
    var recess = mesh(new THREE.CylinderGeometry(25, 25, 4, 48), M(0xD6D4CD, 0.5, 0), false, true);
    recess.rotation.x = Math.PI / 2;
    recess.position.set(0, 150, 8);
    wallG.add(recess);
    var plug = new THREE.Group();
    plug.userData.keep = true;
    var plugBody = mesh(new THREE.CylinderGeometry(19, 22, 30, 40), M(0x2A2D33, 0.5, 0.05), true, true);
    plugBody.rotation.x = Math.PI / 2;
    plugBody.position.z = 15;
    plug.add(plugBody);
    var plugTail = mesh(new THREE.CylinderGeometry(6, 9, 18, 24), M(0x2A2D33, 0.5, 0.05), true, true);
    plugTail.rotation.x = Math.PI / 2;
    plugTail.position.z = 38;
    plug.add(plugTail);
    [-9.5, 9.5].forEach(function (px2) {
      var pin = mesh(new THREE.CylinderGeometry(2.4, 2.4, 19, 16), pinSteel, false, true);
      pin.rotation.x = Math.PI / 2;
      pin.position.set(px2, 0, -9);
      plug.add(pin);
    });
    plug.position.set(0, 150, 8);
    wallG.add(plug);

    v.scene.updateMatrixWorld(true);
    function W2(obj, x, y, z) { return obj.localToWorld(new THREE.Vector3(x, y, z)); }
    var cableMat = M(0x2A2D33, 0.55, 0.05);
    var inletW = W2(psu, -PSU.w / 2 - 2, 10, -30);
    var mainsCable = null, mainsCurve = null, lastOff = -1;
    function buildMains(off) {
      if (Math.abs(off - lastOff) < 0.05) return;
      lastOff = off;
      plug.position.z = 8 + off;
      wallG.updateMatrixWorld(true);
      var a = W2(wallG, 0, 150, 8 + 47 + off), a2 = W2(wallG, 0, 140, 8 + 70 + off), a3 = W2(wallG, 6, 30, 8 + 92 + off);
      var pts = [a, a2, a3, new THREE.Vector3(a.x + 26, GY + 3, a.z + 54), new THREE.Vector3(inletW.x - 38, GY + 3, inletW.z + 10),
        new THREE.Vector3(inletW.x - 14, inletW.y, inletW.z), inletW];
      if (mainsCable) { root.remove(mainsCable); mainsCable.geometry.dispose(); }
      mainsCable = K.wire(pts, { radius: 2.4, material: cableMat, segments: 90, radial: 10 });
      mainsCable.userData.keep = true;
      mainsCable.receiveShadow = false;
      mainsCurve = mainsCable.curve;
      root.add(mainsCable);
    }
    buildMains(0);

    /* PSU → 24-pin connector */
    var psuOut = W2(psu, PSU.w / 2 + 1, 6, -10);
    var atxW = new THREE.Vector3(L.atx[0] - 6, 8, L.atx[1]);
    var bundle = K.wire([psuOut, new THREE.Vector3(psuOut.x + 26, psuOut.y - 4, psuOut.z - 8),
      new THREE.Vector3(atxW.x - 30, 10, atxW.z + 4), atxW], { radius: 5.2, material: M(0x1E2126, 0.62, 0.05), segments: 60, radial: 12 });
    root.add(bundle);

    /* ---------------- monitor and display cable ---------------- */
    var mmat = screenMaterial({ res: [1920, 1080] });
    var MSW = 140, MSH = 78.75;
    var mon = makeMonitor({ sw: MSW, sh: MSH, bezel: 3.2, chin: 7, screenMat: mmat, standGap: 48 });
    var MON = { x: 296, z: -10 };
    mon.group.position.set(MON.x, GY - mon.groundY, MON.z);
    mon.group.rotation.y = -0.34;
    root.add(mon.group);
    v.scene.updateMatrixWorld(true);
    var monBack = W2(mon.group, 0, -MSH / 2 - 30, -20);
    var dispCable = K.wire([[BW / 2 + 1, 12, -86], [BW / 2 + 22, GY + 3, -90], [monBack.x - 50, GY + 3, monBack.z - 20], [monBack.x - 6, GY + 3, monBack.z - 6], [monBack.x, monBack.y, monBack.z]],
      { radius: 2.2, material: cableMat, segments: 70, radial: 8 });
    root.add(dispCable);

    /* ---------------- flows: energy (warm) and data (blue) ---------------- */
    var NE = 10;
    var energy = K.instanced(NE * 2, { radius: 3, detail: 1, material: K.mat.glowBasic(0xF7D58A, 1) });
    root.add(energy);
    var ND = 14;
    var dataDots = K.instanced(ND, { radius: 2.2, detail: 1, material: K.mat.electron(C.dark) });
    root.add(dataDots);
    var ND2 = 7;
    var dispDots = K.instanced(ND2, { radius: 1.7, detail: 1, material: K.mat.electron(C.dark) });
    root.add(dispDots);

    /* exploded positions */
    var EX = { sub: 22, die: 36, ihsY: 66, ihsZ: -30, ram: [26, 50], ramZ: [10, -28], ssd: 30 };
    substrate.position.y = EX.sub;
    die.position.y = EX.die;
    ihs.position.set(0, EX.ihsY, EX.ihsZ);
    ihs.rotation.x = 0.32;
    sticks[0].position.y = EX.ram[0] + 15.6; sticks[0].position.z += EX.ramZ[0];
    sticks[1].position.y = EX.ram[1] + 15.6; sticks[1].position.z += EX.ramZ[1];
    ssd.position.y = EX.ssd;
    v.scene.updateMatrixWorld(true);
    var ssdTop = W2(ssd, 0, 1, 0), ssdLeft = W2(ssd, -30 * SS, 1, 0);
    var ramTop = [W2(sticks[0], -20, 16, 0), W2(sticks[1], 20, 16, 0)];
    var dataCurve = new THREE.QuadraticBezierCurve3(W2(ssd, 10, 2, 0), new THREE.Vector3(-20, 140, 70), W2(sticks[0], -30, 18, 0));

    /* shadows only where they read: the hero parts cast, the board and the desk receive */
    var casters = [psu.children[0], wall, plate, plugBody, substrate, ihs.children[0], sticks[0].children[0], sticks[1].children[0], ssd.children[0]];
    mon.group.traverse(function (o) { if (o.isMesh && o !== mon.screen) casters.push(o); });
    var receivers = [board.children[0], bdec, wall];
    root.traverse(function (o) {
      if (!o.isMesh || o.isInstancedMesh) return;
      o.castShadow = casters.indexOf(o) >= 0;
      o.receiveShadow = receivers.indexOf(o) >= 0;
    });
    caps.castShadow = false; caps.receiveShadow = false;
    /* fewer draw calls: bake every static part that shares a material */
    mergeStatic(root);

    /* ---------------- labels (DOM) ---------------- */
    var bigL = function (L) { L.el.style.fontSize = '18px'; L.el.style.fontWeight = '700'; return L; };
    var cpuTop = W2(ihs, 0, 2, 0);
    bigL(v.label('güç kaynağı<br><span style="font-family:' + K.fonts.mono.replace(/"/g, '&quot;') + ';font-weight:500;font-size:15px;color:' + C.ink2 + '">230 V AC → 12 / 5 / 3,3 V DC</span>',
      { at: W2(psu, -30, -PSU.h / 2 + 8, PSU.d / 2), cls: 'name', dx: -24, dy: 40, align: 'left', valign: 'top', line: true, html: true }));
    bigL(v.label('işlemci', { at: cpuTop, cls: 'name', dx: 0, dy: -46, align: 'center', line: true }));
        var pwChip = v.label('Priz: elektrik var', { at: W2(wallG, 0, 250, 0), cls: 'tag chip', dx: 0, dy: -16, align: 'center' });

    /* ---------------- power timeline ---------------- */
    var ON = 8, CUT = 5, CYC = ON + CUT;
    var LOAD0 = 0.75, ROWDT = 0.27, ROWF = 0.22, LOADEND = LOAD0 + 6 * ROWDT + ROWF;
    var REF = 1.8, LEAK = 0.46, ROWOFF = 0.13;
    var st = { now: 0, manual: false, pw: null, fanA: 0, fanW: 0, word: '' };

    function phase(t) {
      if (st.manual && st.pw) {
        var p = st.pw;
        return p.on ? { on: true, tau: t - p.t0, loading: p.loading } : { on: false, tau: t - p.t0, prevTau: p.prevTau, prevLoading: p.prevLoading };
      }
      var k = Math.floor(t / CYC), c = t - k * CYC;
      if (c < ON) return { on: true, tau: c, loading: k > 0 };
      return { on: false, tau: c - ON, prevTau: ON, prevLoading: k > 0 };
    }
    function steady(ts, r) {
      var off = r * ROWOFF;
      var since = ts < off ? ts : ((ts - off) % REF);
      return 1 - LEAK * since / REF;
    }
    function onCharge(tau, loading, r) {
      if (loading) {
        if (tau < LOADEND) return eio((tau - LOAD0 - r * ROWDT) / ROWF);
        return steady(tau - LOADEND, r);
      }
      return steady(tau, r);
    }
    function charge(P, r) {
      if (P.on) return onCharge(P.tau, P.loading, r);
      return onCharge(P.prevTau, P.prevLoading, r) * Math.exp(-P.tau / 0.22);
    }
    function screenB(P) {
      if (P.on) return P.loading ? eio((P.tau - LOADEND - 0.1) / 0.6) : 1;
      var b0 = P.prevLoading ? eio((P.prevTau - LOADEND - 0.1) / 0.6) : 1;
      return b0 * (1 - eio(P.tau / 0.35));
    }
    function plugOff(P) {
      if (P.on) return P.loading ? 46 * (1 - eio(P.tau / 0.5)) : 0;
      return 46 * eio(P.tau / 0.5);
    }
    function stateText(P) {
      if (P.on && P.loading && P.tau < LOADEND) return 'Elektrik geri geldi: veriler SSD’den RAM’e yükleniyor';
      if (P.on) return 'Elektrik var: RAM’deki yük sızar, her 64 ms’de tazelenir; SSD kalıcı saklar';
      if (P.tau < 0.9) return 'Elektrik kesildi: RAM’deki yükler boşalıyor';
      return 'Elektrik yok: RAM unuttu, SSD hatırlıyor';
    }

    /* ---------------- insets (2D) ---------------- */
    var tmpV = new THREE.Vector3();
    function proj(p) { return v.project(tmpV.copy(p)); }
    function panel(ctx, x, y, w, h) {
      ctx.fillStyle = C.card;
      K.rr(ctx, x, y, w, h, 9);
      ctx.fill();
      ctx.strokeStyle = C.line;
      ctx.lineWidth = 1;
      K.rr(ctx, x + 0.5, y + 0.5, w - 1, h - 1, 9);
      ctx.stroke();
    }
    function leader(ctx, x0, y0, p) {
      ctx.save();
      ctx.strokeStyle = C.dark ? 'rgba(154,163,178,.7)' : 'rgba(89,94,105,.6)';
      ctx.fillStyle = ctx.strokeStyle;
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(p.x, p.y); ctx.stroke();
      ctx.beginPath(); ctx.arc(p.x, p.y, 2, 0, TAU); ctx.fill();
      ctx.restore();
    }
    function statusChip(ctx, x, y, text, kind, alpha) {
      if (alpha <= 0.01) return;
      var w = tw(ctx, text, 11.5, 600) + 16;
      ctx.save();
      ctx.globalAlpha *= alpha;
      ctx.fillStyle = kind === 'copper' ? C.copperSoft : kind === 'blue' ? C.blueSoft : (C.dark ? '#1B2130' : '#F1F0EB');
      K.rr(ctx, x, y, w, 20, 10);
      ctx.fill();
      ctx.restore();
      txt(ctx, text, x + 8, y + 14, { size: 11.5, weight: 600, color: kind === 'copper' ? C.copper : kind === 'blue' ? C.blue : C.ink2, alpha: alpha });
    }
    var IW = 176, IH = 138, CELLW = 12, CELLH = 9, CP = 14, RP = 11;
    /* the static parts of both insets are drawn once into cached layers; each frame adds only what changes */
    var layers = { ram: null, ssd: null, k: 0, fontsOK: false };
    function fontsReady() {
      try { return document.fonts.check('600 14px "IBM Plex Sans"') && document.fonts.check('500 10px "IBM Plex Mono"'); } catch (e) { return true; }
    }
    function cellsStatic(ctx, ssdKind) {
      var gx = 12, gy = 32;
      for (var r = 0; r < 7; r++) {
        for (var c = 0; c < 8; c++) {
          var cx = gx + c * CP, cy = gy + r * RP;
          if (ssdKind) {
            ctx.fillStyle = C.dark ? '#1F2533' : '#EEEDE8';
            K.rr(ctx, cx, cy, CELLW, CELLH, 2);
            ctx.fill();
          }
          ctx.strokeStyle = ssdKind ? (C.dark ? '#4A5266' : '#AEB3BB') : (C.dark ? '#3A4254' : '#C9CCD2');
          ctx.lineWidth = 1;
          K.rr(ctx, cx + 0.5, cy + 0.5, CELLW - 1, CELLH - 1, 2);
          ctx.stroke();
          if (ssdKind && BITS[r][c]) {
            ctx.fillStyle = C.dark ? K.palette.blueLight : '#2848C8';
            for (var e = 0; e < 3; e++) { ctx.beginPath(); ctx.arc(cx + 3 + e * 3, cy + CELLH / 2, 1.25, 0, TAU); ctx.fill(); }
          }
        }
        txt(ctx, 'DENEYAP'[r], gx + 8 * CP + 6, gy + r * RP + 8.5, { size: 10.5, weight: 500, mono: true, color: C.faint });
      }
    }
    function buildLayers() {
      layers.k = K.pixelRatio();
      layers.fontsOK = fontsReady();
      layers.ram = K.layer(IW, IH);
      var c1 = layers.ram.ctx;
      beginOverlay(c1);
      panel(c1, 0, 0, IW, IH);
      txt(c1, 'RAM', 12, 21, { size: 14, weight: 600, color: C.ink });
      txt(c1, 'yük = bilgi', IW - 12, 21, { size: 11.5, color: C.muted, align: 'right' });
      cellsStatic(c1, false);
      layers.ssd = K.layer(IW, IH);
      var c2 = layers.ssd.ctx;
      beginOverlay(c2);
      panel(c2, 0, 0, IW, IH);
      txt(c2, 'SSD', 12, 21, { size: 14, weight: 600, color: C.ink });
      txt(c2, 'hapsolmuş elektron', IW - 12, 21, { size: 11.5, color: C.muted, align: 'right' });
      cellsStatic(c2, true);
    }
    function ensureLayers() {
      if (!layers.ram || layers.k !== K.pixelRatio() || (!layers.fontsOK && fontsReady())) buildLayers();
    }
    function drawRamInset(ctx, x, y, P) {
      ctx.drawImage(layers.ram.canvas, x, y, IW, IH);
      var gx = x + 12, gy = y + 32;
      var sweepRow = -1;
      if (P.on && (!P.loading || P.tau >= LOADEND)) {
        var ts = P.loading ? P.tau - LOADEND : P.tau;
        for (var r = 0; r < 7; r++) {
          var off = r * ROWOFF;
          if (ts >= off && ((ts - off) % REF) < 0.16) sweepRow = r;
        }
      }
      if (sweepRow >= 0) {
        ctx.globalAlpha = 0.6;
        ctx.fillStyle = C.blueSoft;
        ctx.fillRect(gx - 4, gy + sweepRow * RP - 1.5, 8 * CP + 4, RP);
        ctx.globalAlpha = 1;
      }
      ctx.fillStyle = C.dark ? K.palette.blueLight : '#2848C8';
      for (r = 0; r < 7; r++) {
        var q = charge(P, r);
        if (q <= 0.01) continue;
        ctx.globalAlpha = 0.25 + 0.75 * q;
        var hh = (CELLH - 2) * q;
        for (var c = 0; c < 8; c++) {
          if (!BITS[r][c]) continue;
          ctx.fillRect(gx + c * CP + 1.5, gy + r * RP + CELLH - 1 - hh, CELLW - 3, hh);
        }
      }
      ctx.globalAlpha = 1;
      var sy = y + IH - 26;
      if (P.on && P.loading && P.tau < LOADEND) statusChip(ctx, x + 12, sy, 'yükleniyor', 'blue', 1);
      else if (P.on) statusChip(ctx, x + 12, sy, 'tazeleniyor · yavaşlatılmış', 'plain', 1);
      else statusChip(ctx, x + 12, sy, P.tau < 0.9 ? 'boşalıyor' : 'RAM unuttu', 'copper', 1);
    }
    function drawSsdInset(ctx, x, y, P) {
      ctx.drawImage(layers.ssd.canvas, x, y, IW, IH);
      var sy = y + IH - 26;
      if (!P.on && P.tau > 0.9) statusChip(ctx, x + 12, sy, 'SSD hatırlıyor', 'blue', 1);
      else statusChip(ctx, x + 12, sy, 'elektrik olmadan da kalır', 'plain', 1);
    }

    function drawOverlay(P) {
      var ctx = v.ctx;
      beginOverlay(ctx);
      ensureLayers();
      var pS = proj(ssdLeft), pR = proj(ramTop[1]);
      var sx = clamp(pS.x - 170, 200, 400), rx = clamp(pR.x - 40, 640, 800);
      var IS = 1.32;
      leader(ctx, sx + IW * IS / 2, 8 + IH * IS, pS);
      leader(ctx, rx + IW * IS / 2, 8 + IH * IS, pR);
      ctx.save(); ctx.translate(sx, 8); ctx.scale(IS, IS); beginOverlay(ctx); drawSsdInset(ctx, 0, 0, P); ctx.restore();
      ctx.save(); ctx.translate(rx, 8); ctx.scale(IS, IS); beginOverlay(ctx); drawRamInset(ctx, 0, 0, P); ctx.restore();
      beginOverlay(ctx);
      tag(ctx, 'BASİTLEŞTİRİLMİŞ MODEL · ÖLÇEKLİ DEĞİL', 1106, v.h - 12, C, { align: 'right', size: 13 });
    }

    /* ---------------- frame ---------------- */
    var eTmp = new THREE.Vector3();
    function frame(t, dt) {
      st.now = t;
      var P = phase(t);
      // plug and mains cable
      buildMains(plugOff(P));
      // fan: spins up after power returns, coasts down after a cut
      var wMax = 9;
      var w = P.on ? (P.loading ? wMax * eio((P.tau - 0.5) / 1.2) : wMax) : wMax * Math.exp(-P.tau / 0.9);
      st.fanA += (RM ? w * 0.15 : w) * dt;
      fan.rotation.y = st.fanA;
      // energy along the mains cable and the 24-pin bundle
      var flowA = P.on ? (P.loading ? clamp((P.tau - 0.45) / 0.3, 0, 1) : 1) : 0;
      for (var i = 0; i < NE; i++) {
        var u = ((t * 0.45 + i / NE) % 1);
        if (flowA <= 0.01 || RM) { energy.hideAt(i); energy.hideAt(NE + i); continue; }
        mainsCurve.getPointAt(u, eTmp);
        energy.setAt(i, eTmp.x, eTmp.y, eTmp.z, flowA);
        bundle.curve.getPointAt(u, eTmp);
        energy.setAt(NE + i, eTmp.x, eTmp.y + 2, eTmp.z, flowA * 1.15);
      }
      energy.commit();
      // data: SSD → RAM while loading
      var loadA = P.on && P.loading && P.tau > LOAD0 - 0.25 && P.tau < LOADEND + 0.1 ? 1 : 0;
      for (i = 0; i < ND; i++) {
        if (!loadA || RM) { dataDots.hideAt(i); continue; }
        var u2 = ((t * 0.9 + i / ND) % 1);
        dataCurve.getPointAt(u2, eTmp);
        dataDots.setAt(i, eTmp.x, eTmp.y, eTmp.z, Math.min(1, Math.min(u2, 1 - u2) * 8));
      }
      dataDots.commit();
      // screen and display signal
      var sb = screenB(P);
      mmat.uniforms.uOn.value = sb;
      for (i = 0; i < ND2; i++) {
        if (sb < 0.5 || RM) { dispDots.hideAt(i); continue; }
        var u3 = ((t * 0.35 + i / ND2) % 1);
        dispCable.curve.getPointAt(u3, eTmp);
        dispDots.setAt(i, eTmp.x, eTmp.y + 1.5, eTmp.z, 1);
      }
      dispDots.commit();
      // the cores work while the computer runs
      dieMat.emissiveIntensity = sb * (0.35 + 0.15 * Math.sin(t * 2.1));
      if (st.pwOn !== P.on) { st.pwOn = P.on; pwChip.set(P.on ? 'Priz: elektrik var' : 'Priz: elektrik kesildi'); }
      st.text = stateText(P);
      v.render(dt);
      if (!K.skipRender) drawOverlay(P);
    }

    prewarm(v);
    return {
      reset: function () {
        st.manual = false; st.pw = null; st.now = 0; st.fanA = 0; st.pwOn = null;
        v.setView({ yaw: v.home.yaw, pitch: v.home.pitch, distance: v.home.distance, target: v.home.target.toArray() });
      },
      frame: frame,
      set: function (key, val) {
        if (key !== 'power') return;
        var want = String(val).toLowerCase();
        var on = want === 'acik' || want === 'açık' || want === '1' || want === 'on';
        var P = phase(st.now);
        if (P.on === on && st.manual) return;
        if (P.on === on) { st.manual = true; st.pw = P.on ? { on: true, t0: st.now - P.tau, loading: P.loading } : { on: false, t0: st.now - P.tau, prevTau: P.prevTau, prevLoading: P.prevLoading }; return; }
        st.manual = true;
        if (on) st.pw = { on: true, t0: st.now, loading: true };
        else st.pw = { on: false, t0: st.now, prevTau: P.tau, prevLoading: P.loading };
      },
      read: function (key) {
        if (key === 'state' || key === 'explain') return stateText(phase(st.now));
        if (key === 'formula') return '230 V AC → 12 V, 5 V, 3,3 V DC';
        return '';
      },
      resize: function () { },
      dispose: function () { v.dispose(); }
    };
  });

  /* ================================================================== */
  /* Focus-slide kit: flat 2D visuals drawn on a 1120 x 440 virtual stage */
  /* ================================================================== */
  var VW = 1120, VH = 440;

  function tx(ctx, s, x, y, o) { K.label(ctx, s, x, y, o); }
  function tm(ctx, s, size, weight, mono) { ctx.font = K.font(size, weight || 400, mono); return ctx.measureText(s).width; }
  function fmtN(n) { return K.num(n, 0); }
  function bump(x, a, b, c, d) { return sm(a, b, x) * (1 - sm(c, d, x)); }

  /* Wraps a scene function: the scene always draws in a 1120 x 440 box that is scaled to fit and centred. */
  function make2D(el, opts, impl) {
    var theme = (opts && opts.theme) || 'light';
    var C = themeColors(theme);
    var sf = K.surface(el);
    var inst = impl(C, sf) || {};
    return {
      reset: function () { if (inst.reset) inst.reset(); },
      frame: function (t, dt) {
        sf.clear();
        var W = sf.w, H = sf.h, S = Math.min(W / VW, H / VH);
        var ctx = sf.ctx;
        ctx.save();
        ctx.translate((W - VW * S) / 2, (H - VH * S) / 2);
        ctx.scale(S, S);
        inst.frame(ctx, t, dt, C);
        ctx.restore();
      },
      set: function (k, v) { if (inst.set) inst.set(k, v); },
      read: function (k) { return inst.read ? inst.read(k) : ''; },
      resize: function () { },
      dispose: function () { sf.dispose(); }
    };
  }

  /* text on a soft paper chip so it stays readable over a busy picture */
  function pill(ctx, s, x, y, size, weight, color, align, alpha, C) {
    var w = tm(ctx, s, size, weight) + 20, x0 = align === 'center' ? x - w / 2 : align === 'right' ? x - w : x;
    ctx.save(); ctx.globalAlpha *= alpha === undefined ? 1 : alpha;
    ctx.fillStyle = C.dark ? 'rgba(20,25,37,0.92)' : 'rgba(255,255,255,0.94)';
    K.rr(ctx, x0 - 2, y - size * 1.0, w + 4, size * 1.5, 8); ctx.fill();
    ctx.restore();
    tx(ctx, s, x0 + 10, y, { size: size, weight: weight, color: color, alpha: alpha });
  }
  function softShadow(ctx, blur, dy, a) {
    ctx.shadowColor = 'rgba(21,23,28,' + a + ')';
    ctx.shadowBlur = blur;
    ctx.shadowOffsetY = dy;
  }
  function noShadow(ctx) { ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.shadowOffsetY = 0; }

  /* Leader line with a small dot at the target */
  function leaderTo(ctx, x0, y0, x1, y1, C, alpha) {
    ctx.save();
    ctx.globalAlpha *= alpha === undefined ? 1 : alpha;
    ctx.strokeStyle = C.muted; ctx.fillStyle = C.muted; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
    ctx.beginPath(); ctx.arc(x1, y1, 3.5, 0, TAU); ctx.fill();
    ctx.restore();
  }

  /* One shared sunset picture (the thing a screen shows) */
  var sceneCv = null, picData = null;
  function getScene() {
    if (sceneCv) return sceneCv;
    var w = 960, h = 540;
    var c = document.createElement('canvas'); c.width = w; c.height = h;
    var g = c.getContext('2d');
    var sky = g.createLinearGradient(0, 0, 0, h * 0.64);
    sky.addColorStop(0, '#22397F'); sky.addColorStop(0.45, '#7A5CA6'); sky.addColorStop(0.8, '#E98B5C'); sky.addColorStop(1, '#F7BC72');
    g.fillStyle = sky; g.fillRect(0, 0, w, h);
    var rr = K.rng(5);
    g.fillStyle = 'rgba(255,255,255,0.8)';
    for (var i = 0; i < 40; i++) { g.globalAlpha = 0.15 + rr() * 0.6; g.fillRect(rr() * w, rr() * h * 0.3, 2, 2); }
    g.globalAlpha = 1;
    var sx = 680, sy = 232;
    var glow = g.createRadialGradient(sx, sy, 10, sx, sy, 220);
    glow.addColorStop(0, 'rgba(255,200,110,0.45)'); glow.addColorStop(1, 'rgba(255,170,90,0)');
    g.fillStyle = glow; g.fillRect(0, 0, w, h * 0.7);
    var sun = g.createRadialGradient(sx, sy, 0, sx, sy, 66);
    sun.addColorStop(0, '#FFB347'); sun.addColorStop(1, '#FF8F3A');
    g.fillStyle = sun; g.beginPath(); g.arc(sx, sy, 66, 0, TAU); g.fill();
    g.fillStyle = '#4A3466';
    g.beginPath(); g.moveTo(0, 360); g.lineTo(120, 270); g.lineTo(230, 330); g.lineTo(350, 240); g.lineTo(480, 345); g.lineTo(560, 330); g.lineTo(560, 400); g.lineTo(0, 400); g.fill();
    g.fillStyle = '#2B2149';
    g.beginPath(); g.moveTo(420, 390); g.lineTo(560, 320); g.lineTo(700, 380); g.lineTo(820, 340); g.lineTo(960, 392); g.lineTo(960, 410); g.lineTo(420, 410); g.fill();
    var lake = g.createLinearGradient(0, 388, 0, h);
    lake.addColorStop(0, '#E98B5C'); lake.addColorStop(1, '#2A2447');
    g.fillStyle = lake; g.fillRect(0, 388, w, h - 388);
    g.fillStyle = 'rgba(255,214,150,0.55)';
    for (var k = 0; k < 14; k++) { var ww = 120 - k * 6; g.fillRect(sx - ww / 2 + (rr() - 0.5) * 10, 396 + k * 9, ww, 3); }
    g.strokeStyle = '#1D1838'; g.lineWidth = 3;
    g.beginPath(); g.moveTo(90, 400); g.lineTo(90, 200); g.stroke();
    g.lineWidth = 2; g.beginPath(); g.moveTo(70, 225); g.lineTo(110, 225); g.moveTo(76, 245); g.lineTo(104, 245); g.stroke();
    g.lineWidth = 2.5; g.strokeStyle = '#2B2149';
    [[300, 120], [340, 95], [255, 150]].forEach(function (b) { g.beginPath(); g.moveTo(b[0] - 14, b[1] - 6); g.quadraticCurveTo(b[0] - 6, b[1] - 12, b[0], b[1]); g.quadraticCurveTo(b[0] + 6, b[1] - 12, b[0] + 14, b[1] - 6); g.stroke(); });
    sceneCv = c;
    return c;
  }
  function getPic() {
    if (picData) return picData;
    var c = document.createElement('canvas'); c.width = 320; c.height = 180;
    var g = c.getContext('2d');
    g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
    g.drawImage(getScene(), 0, 0, 320, 180);
    picData = { canvas: c, data: g.getImageData(0, 0, 320, 180).data };
    return picData;
  }

  /* ================================================================== */
  /* bits-letter                                                          */
  /* ================================================================== */
  K.register('bits-letter', function (el, opts) {
    return make2D(el, opts, function (C) {
      var WORD = 'DENEYAP', LT = K.reducedMotion ? 5 : 4.4, HOLD = 3.6, CYCLE = WORD.length * LT + HOLD;
      var ZERO = [0, 0, 0, 0, 0, 0, 0, 0];
      var st = { mode: 'auto', autoT0: 0, now: 0, man: null, pos: ZERO.slice(), E: null, word: '' };
      function codeOf(b) { var c = 0; for (var i = 0; i < 8; i++) c = c * 2 + (b[i] ? 1 : 0); return c; }
      function letterOf(code) { return code > 32 && code < 127 ? String.fromCharCode(code) : (code === 32 ? '␣' : ''); }
      function describe(b) {
        var terms = [];
        for (var i = 0; i < 8; i++) if (b[i]) terms.push(PLACE[i]);
        var code = codeOf(b);
        return { terms: terms, code: code, letter: letterOf(code), bits: b };
      }
      function sumStr(d) { return !d.terms.length ? '0' : d.terms.length === 1 ? String(d.terms[0]) : d.terms.join(' + ') + ' = ' + d.code; }
      function episode(t) {
        if (st.mode === 'manual' && st.man) return { prev: st.man.from, next: st.man.to, tau: t - st.man.t0, li: -1 };
        var a = Math.max(0, t - st.autoT0), k = Math.floor(a / CYCLE), c = a - k * CYCLE, n = WORD.length;
        var last = bitsOf(WORD.charCodeAt(n - 1));
        if (c >= n * LT) return { prev: last, next: last, tau: 99, li: n - 1, hold: c - n * LT };
        var li = Math.floor(c / LT);
        return { prev: li > 0 ? bitsOf(WORD.charCodeAt(li - 1)) : (k > 0 ? last : ZERO), next: bitsOf(WORD.charCodeAt(li)), tau: c - li * LT, li: li };
      }
      var T_SUM = 1.25, T_STEP = 0.36;
      function times(D) { var te = T_SUM + T_STEP * D.terms.length + 0.05; return { eq: te, letter: te + 0.55 }; }
      function explainOf(E) {
        var D = describe(E.next), tt = times(D);
        if (E.hold !== undefined) return 'DENEYAP: yedi harf, yedi bayt, elli altı küçük anahtar.';
        if (E.tau < T_SUM) return 'Anahtarlar yeni bir sayı kuruyor: açık anahtar 1, kapalı anahtar 0.';
        if (E.tau < tt.letter) return 'Açık anahtarların değerleri toplanır: ' + sumStr(D) + '.';
        return D.code + ' sayısı, ortak tabloda “' + (D.letter || '?') + '” harfidir.';
      }
      function drawSwitch(ctx, x, y, w, h, p, pulse) {
        var r = w * 0.46;
        // slot
        ctx.fillStyle = K.mix('#D9D8D1', '#F3DCCB', p);
        K.rr(ctx, x, y, w, h, r); ctx.fill();
        ctx.lineWidth = 2; ctx.strokeStyle = K.mix(C.dark ? '#3A4254' : '#C3C2BA', C.copper, p);
        K.rr(ctx, x + 1, y + 1, w - 2, h - 2, r); ctx.stroke();
        // inner rail
        ctx.fillStyle = 'rgba(21,23,28,0.10)';
        K.rr(ctx, x + w / 2 - 3, y + 14, 6, h - 28, 3); ctx.fill();
        // knob
        var kh = w - 14, ky = y + h - 7 - kh - p * (h - 14 - kh);
        if (p > 0.05) {
          var g = ctx.createRadialGradient(x + w / 2, ky + kh / 2, kh * 0.3, x + w / 2, ky + kh / 2, kh * 1.25);
          g.addColorStop(0, 'rgba(242,154,92,' + (0.5 * p) + ')'); g.addColorStop(1, 'rgba(242,154,92,0)');
          ctx.fillStyle = g; var gcx = x + w / 2, gcy = ky + kh / 2, gr = kh * 1.25; ctx.fillRect(gcx - gr, gcy - gr, gr * 2, gr * 2);
        }
        softShadow(ctx, 10, 4, 0.25);
        ctx.fillStyle = K.mix('#FFFFFF', '#C8693A', p);
        K.rr(ctx, x + 7, ky, kh, kh, kh * 0.42); ctx.fill();
        noShadow(ctx);
        ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.lineWidth = 1.5;
        K.rr(ctx, x + 9, ky + 2, kh - 4, kh * 0.45, kh * 0.25); ctx.stroke();
        if (pulse > 0.01) {
          ctx.strokeStyle = 'rgba(200,105,58,' + (0.7 * (1 - pulse)) + ')'; ctx.lineWidth = 3;
          var e = 6 + pulse * 18;
          K.rr(ctx, x - e, y - e, w + 2 * e, h + 2 * e, r + e); ctx.stroke();
        }
      }
      function frame(ctx, t) {
        st.now = t;
        var E = episode(t); st.E = E;
        var D = describe(E.next), Dp = describe(E.prev), tt = times(D);
        var SWW = 82, GAP = 16, X0 = 44, SY = 86, SH = 148;
        var i;
        for (i = 0; i < 8; i++) {
          var f = eio((E.tau - 0.1 - i * 0.1) / 0.4);
          st.pos[i] = E.prev[i] + (E.next[i] - E.prev[i]) * f;
        }
        var termIdx = 0;
        for (i = 0; i < 8; i++) {
          var x = X0 + i * (SWW + GAP), p = st.pos[i];
          var pulse = 0;
          if (E.next[i]) {
            var ti = termIdx++;
            var a = (E.tau - (T_SUM + ti * T_STEP)) / 0.7;
            if (a > 0 && a < 1) pulse = a;
          }
          drawSwitch(ctx, x, SY, SWW, SH, p, pulse);
          var cx = x + SWW / 2;
          tx(ctx, '1', cx, 60, { size: 44, weight: 500, mono: true, color: C.copper, align: 'center', alpha: p });
          tx(ctx, '0', cx, 60, { size: 44, weight: 500, mono: true, color: C.faint, align: 'center', alpha: 1 - p });
          tx(ctx, String(PLACE[i]), cx, SY + SH + 36, { size: 24, weight: 600, mono: true, color: K.mix(C.muted, C.ink, p), align: 'center' });
        }
        tx(ctx, 'basamak değeri', X0, SY + SH + 62, { size: 15, color: C.muted });
        // sum line
        var cxm = X0 + (8 * SWW + 7 * GAP) / 2, ys = 392, size = 34;
        var fullW = tm(ctx, sumStr(D), size, 600, true);
        if (fullW > 770) { size = Math.floor(size * 770 / fullW); fullW = tm(ctx, sumStr(D), size, 600, true); }
        var x0s = cxm - fullW / 2;
        var showPrev = E.hold === undefined && E.tau < 0.5 && Dp.terms.length > 0;
        if (showPrev) {
          var wp = tm(ctx, sumStr(Dp), 30, 600, true);
          tx(ctx, sumStr(Dp), cxm - wp / 2, ys, { size: 30, weight: 600, mono: true, color: C.ink2, alpha: 1 - E.tau / 0.5 });
        }
        var cursor = x0s;
        for (i = 0; i < D.terms.length; i++) {
          var s1 = (i > 0 ? ' + ' : '') + D.terms[i];
          var aa = eout((E.tau - (T_SUM + i * T_STEP)) / 0.3);
          if (E.hold !== undefined) aa = 1;
          tx(ctx, s1, cursor, ys + (1 - aa) * 10, { size: size, weight: 600, mono: true, color: C.copper, alpha: aa });
          cursor += tm(ctx, s1, size, 600, true);
        }
        if (D.terms.length > 1) {
          var ae = E.hold !== undefined ? 1 : eout((E.tau - tt.eq) / 0.3);
          tx(ctx, ' = ' + D.code, cursor, ys + (1 - ae) * 10, { size: size, weight: 700, mono: true, color: C.ink, alpha: ae });
        }
        // letter card
        var CX = 870, CY = 76, CW = 212, CH = 244;
        softShadow(ctx, 18, 6, 0.12);
        ctx.fillStyle = C.card; K.rr(ctx, CX, CY, CW, CH, 14); ctx.fill(); noShadow(ctx);
        ctx.strokeStyle = C.line; ctx.lineWidth = 1.5; K.rr(ctx, CX + 0.5, CY + 0.5, CW - 1, CH - 1, 14); ctx.stroke();
        var rv = E.hold !== undefined ? 1 : eio((E.tau - tt.letter) / 0.45);
        var pl = Dp.letter || '', nl = D.letter || '—';
        if (rv < 1 && pl) tx(ctx, pl, CX + CW / 2, CY + 160, { size: 150, weight: 600, color: C.ink, align: 'center', alpha: 1 - rv });
        tx(ctx, nl, CX + CW / 2, CY + 160 + (1 - rv) * 14, { size: 150, weight: 600, color: C.ink, align: 'center', alpha: rv });
        tx(ctx, 'ASCII ' + (rv > 0.5 ? D.code : Dp.code), CX + CW / 2, CY + CH - 22, { size: 20, weight: 500, mono: true, color: C.muted, align: 'center' });
        // arrow from the sum to the card
        var ar = E.hold !== undefined ? 1 : eio((E.tau - tt.eq) / 0.4) * (1 - eio((E.tau - tt.letter - 0.9) / 0.4));
        if (ar > 0.02 && D.terms.length > 1) {
          ctx.save(); ctx.globalAlpha *= ar; ctx.strokeStyle = C.copper; ctx.fillStyle = C.copper; ctx.lineWidth = 3;
          var ax = cursor + tm(ctx, ' = ' + D.code, size, 700, true) + 26, ay = ys - 12;
          ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(CX + CW / 2, ay); ctx.lineTo(CX + CW / 2, CY + CH + 10); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(CX + CW / 2 - 8, CY + CH + 18); ctx.lineTo(CX + CW / 2 + 8, CY + CH + 18); ctx.lineTo(CX + CW / 2, CY + CH + 4); ctx.fill();
          ctx.restore();
        }
        // word so far
        var shown;
        if (st.mode === 'manual') shown = D.letter && rv > 0.5 ? D.letter : '';
        else shown = E.hold !== undefined ? WORD : WORD.slice(0, E.li + (rv > 0.5 ? 1 : 0));
        st.word = shown;
        tx(ctx, shown, CX + CW / 2, 52, { size: 32, weight: 600, mono: true, color: C.ink, align: 'center', spacing: 4 });
      }
      return {
        reset: function () { st.mode = 'auto'; st.autoT0 = 0; st.man = null; st.now = 0; st.pos = ZERO.slice(); st.word = ''; },
        frame: frame,
        set: function (key, val) {
          if (key === 'bits') {
            var s = (typeof val === 'number' ? String(Math.round(val)) : String(val || '')).replace(/\s+/g, '');
            if (!/^[01]{1,8}$/.test(s)) return;
            s = ('00000000' + s).slice(-8);
            var to = s.split('').map(function (c) { return c === '1' ? 1 : 0; });
            if (st.mode === 'manual' && st.man && st.man.to.join('') === to.join('')) return;
            st.man = { from: st.pos.map(function (x) { return x > 0.5 ? 1 : 0; }), to: to, t0: st.now };
            st.mode = 'manual';
          } else if (key === 'auto') {
            if (+val === 1 || val === '1' || val === true) { st.mode = 'auto'; st.man = null; st.autoT0 = st.now; }
          }
        },
        read: function (key) {
          var b = st.pos.map(function (x) { return x > 0.5 ? 1 : 0; }), d = describe(b);
          if (key === 'binary') return b.slice(0, 4).join('') + ' ' + b.slice(4).join('');
          if (key === 'sum') return sumStr(d);
          if (key === 'letter') return d.letter || '—';
          if (key === 'word') return st.word || '—';
          if (key === 'explain') return st.E ? explainOf(st.E) : 'Sekiz anahtar, sekiz bit: açık = 1, kapalı = 0.';
          if (key === 'formula') { var E = st.E; return E ? sumStr(describe(E.next)) : ''; }
          return '';
        }
      };
    });
  });

  /* ================================================================== */
  /* pixel-zoom                                                           */
  /* ================================================================== */
  K.register('pixel-zoom', function (el, opts) {
    return make2D(el, opts, function (C) {
      var SW = 320, SH = 180, TX = 227, TY = 77;
      var S0 = 1.72, S1 = 300;
      var PIC = { x: 560 - SW * S0 / 2, y: 26 };
      var A0 = { x: PIC.x + TX * S0, y: PIC.y + TY * S0 }, A1 = { x: 262, y: 36 };
      var STEPS = [[255, 0, 0, 0], [0, 255, 0, 0], [0, 0, 255, 0], [255, 255, 0, 0], [255, 255, 255, 0]];
      var T_HOLD0 = 2.8, T_Z1 = 6, T_HOLD1 = 2.2, T_Z2 = 5, T_NAT = 1.8, T_STEP = 3.2, T_Z3 = 5;
      var bounds = [];
      (function () { var a = 0; [T_HOLD0, T_Z1, T_HOLD1, T_Z2, T_NAT, T_STEP * 5, T_STEP, T_Z3].forEach(function (d) { bounds.push(a); a += d; }); bounds.push(a); })();
      var CYC = bounds[8];
      var st = { auto: true, now: 0, zl: 0, tz: 0, col: null, tcol: null, txt: '', nat: null, stage: 0, step: -1 };
      function natural() {
        if (st.nat) return st.nat;
        var d = getPic().data, i = (TY * SW + TX) * 4;
        st.nat = [d[i], d[i + 1], d[i + 2]];
        return st.nat;
      }
      function auto(t) {
        var c = t % CYC, nat = natural(), zl = 0, col = nat, stage = 0, step = -1;
        if (c < bounds[1]) { zl = 0; stage = 0; }
        else if (c < bounds[2]) { zl = 0.36 * eio((c - bounds[1]) / T_Z1); stage = 1; }
        else if (c < bounds[3]) { zl = 0.36; stage = 1; }
        else if (c < bounds[4]) { zl = 0.36 + 0.64 * eio((c - bounds[3]) / T_Z2); stage = 2; }
        else if (c < bounds[5]) { zl = 1; stage = 2; }
        else if (c < bounds[7]) {
          zl = 1; stage = 3;
          var u = (c - bounds[5]) / T_STEP, k = Math.floor(u), f = eio(((u - k) * T_STEP) / 0.7);
          step = k;
          var from = k === 0 ? nat : STEPS[k - 1], to = k < 5 ? STEPS[k] : nat;
          col = [lerp(from[0], to[0], f), lerp(from[1], to[1], f), lerp(from[2], to[2], f)];
        } else { zl = 1 - eio((c - bounds[7]) / T_Z3); stage = 4; }
        return { zl: zl, col: col, stage: stage, step: step };
      }
      var cur = { zl: 0, col: [255, 150, 50], stage: 0, step: -1 };
      function colText(c) { return 'R ' + Math.round(c[0]) + ' · G ' + Math.round(c[1]) + ' · B ' + Math.round(c[2]); }
      function explainOf() {
        var c = cur;
        if (!st.auto) return c.zl < 0.5 ? 'Bütün ekran: milyonlarca küçük noktadan, piksellerden oluşur.' : 'Tek piksel: kırmızı, yeşil ve mavi üç küçük ışık. ' + colText(c.col) + '.';
        if (c.stage === 0) return 'Ekran, milyonlarca küçük noktadan oluşur. Şimdi yaklaşalım.';
        if (c.stage === 1) return 'Yaklaşınca resmin kare noktalardan, yani piksellerden oluştuğu görülür.';
        if (c.stage === 2) return 'Her pikselin içinde yan yana üç küçük ışık var: kırmızı, yeşil ve mavi.';
        if (c.stage === 4) return 'Uzaklaşınca üç ışık gözümüzde tek renk gibi birleşir.';
        var n = c.col, k = c.step;
        if (k === 0) return 'Yalnızca kırmızı ışık yanıyor: piksel kırmızı görünür.';
        if (k === 1) return 'Yalnızca yeşil ışık yanıyor.';
        if (k === 2) return 'Yalnızca mavi ışık yanıyor.';
        if (k === 3) return 'Kırmızı ile yeşil birlikte yanınca sarı görünür: ışıklar üst üste eklenir.';
        if (k === 4) return 'Üç ışık da tam parlaklıkta: beyaz.';
        return 'Bu piksel: kırmızı ' + Math.round(n[0]) + ', yeşil ' + Math.round(n[1]) + ', mavi ' + Math.round(n[2]) + ' parlaklıkta: turuncu.';
      }
      function frame(ctx, t, dt) {
        st.now = t;
        if (st.auto) { var a = auto(t); cur.zl = a.zl; cur.col = a.col; cur.stage = a.stage; cur.step = a.step; }
        else {
          var kz = 1 - Math.exp(-dt * 2.4);
          cur.zl += (st.tz - cur.zl) * kz;
          for (var q = 0; q < 3; q++) cur.col[q] += (st.tcol[q] - cur.col[q]) * (1 - Math.exp(-dt * 6));
        }
        var zl = cur.zl;
        var s = S0 * Math.pow(S1 / S0, zl);
        var Ax = lerp(A0.x, A1.x, zl), Ay = lerp(A0.y, A1.y, zl);
        function X(wx) { return (wx - TX) * s + Ax; }
        function Y(wy) { return (wy - TY) * s + Ay; }
        var px0 = X(0), py0 = Y(0), pw = SW * s, ph = SH * s;
        var frameA = 1 - sm(8, 26, s);
        // monitor
        if (frameA > 0.01) {
          ctx.save(); ctx.globalAlpha *= frameA;
          var b = 9 * s;
          softShadow(ctx, 26, 12, 0.22);
          ctx.fillStyle = '#1D1F24';
          K.rr(ctx, px0 - b, py0 - b, pw + 2 * b, ph + b + 14 * s, 4 * s); ctx.fill();
          noShadow(ctx);
          ctx.fillStyle = '#2A2D34';
          ctx.fillRect(px0 + pw / 2 - 22 * s, py0 + ph + 14 * s, 44 * s, 16 * s);
          ctx.fillStyle = '#23262C';
          K.rr(ctx, px0 + pw / 2 - 60 * s, py0 + ph + 30 * s, 120 * s, 6 * s, 3 * s); ctx.fill();
          ctx.restore();
        }
        // picture
        ctx.imageSmoothingEnabled = s < 3.2;
        ctx.drawImage(getPic().canvas, px0, py0, pw, ph);
        ctx.imageSmoothingEnabled = true;
        // cells
        if (s > 7) {
          var d = getPic().data;
          var ga = sm(7, 18, s), da = sm(60, 190, s);
          var i0 = Math.max(0, Math.floor(TX + (0 - Ax) / s)), i1 = Math.min(SW - 1, Math.floor(TX + (VW - Ax) / s));
          var j0 = Math.max(0, Math.floor(TY + (0 - Ay) / s)), j1 = Math.min(SH - 1, Math.floor(TY + (VH - Ay) / s));
          var gp = Math.max(0.5, s * 0.045) * ga;
          for (var j = j0; j <= j1; j++) {
            for (var i = i0; i <= i1; i++) {
              var o = (j * SW + i) * 4, r = d[o], g = d[o + 1], bl = d[o + 2];
              if (i === TX && j === TY) { r = cur.col[0]; g = cur.col[1]; bl = cur.col[2]; }
              var cx = X(i), cy = Y(j);
              if (ga > 0.02) { ctx.fillStyle = 'rgba(10,11,14,' + Math.min(1, ga * 0.7 + sm(40, 120, s) * 0.3) + ')'; ctx.fillRect(cx, cy, s, s); }
              var ix = cx + gp, iy = cy + gp, iw = s - 2 * gp;
              ctx.fillStyle = 'rgb(' + (r | 0) + ',' + (g | 0) + ',' + (bl | 0) + ')';
              ctx.fillRect(ix, iy, iw, iw);
              if (da > 0.01) {
                ctx.fillStyle = 'rgba(8,9,12,' + da + ')'; ctx.fillRect(ix, iy, iw, iw);
                var bw = iw / 3, ib = bw * 0.12;
                ctx.globalAlpha = da;
                ctx.fillStyle = 'rgb(' + (r | 0) + ',0,0)'; ctx.fillRect(ix + ib, iy, bw - 2 * ib, iw);
                ctx.fillStyle = 'rgb(0,' + (g | 0) + ',0)'; ctx.fillRect(ix + bw + ib, iy, bw - 2 * ib, iw);
                ctx.fillStyle = 'rgb(0,0,' + (bl | 0) + ')'; ctx.fillRect(ix + 2 * bw + ib, iy, bw - 2 * ib, iw);
                ctx.globalAlpha = 1;
                if (!(i === TX && j === TY)) { ctx.fillStyle = 'rgba(14,15,19,' + (0.6 * da) + ')'; ctx.fillRect(cx, cy, s, s); }
              }
            }
          }
        }
        // highlight of the target pixel
        var hl = bump(zl, 0.2, 0.34, 0.82, 0.97);
        if (hl > 0.01) {
          ctx.strokeStyle = 'rgba(200,105,58,' + hl + ')'; ctx.lineWidth = 3;
          ctx.strokeRect(Ax - 2, Ay - 2, s + 4, s + 4);
        }
        // lens
        var la = (st.auto ? sm(1.0, 1.8, st.now % CYC) : 1) * (1 - sm(0.02, 0.12, zl));
        if (la > 0.01) {
          var pulse = 0.5 + 0.5 * Math.sin(st.now * 3);
          ctx.strokeStyle = 'rgba(200,105,58,' + la + ')'; ctx.lineWidth = 2.5; ctx.setLineDash([6, 4]);
          ctx.strokeRect(X(TX - 13), Y(TY - 7.5), 26 * s, 15 * s);
          ctx.setLineDash([]);
          ctx.strokeStyle = 'rgba(200,105,58,' + (la * 0.5 * (1 - pulse)) + ')';
          ctx.strokeRect(X(TX - 13) - 6 * pulse, Y(TY - 7.5) - 6 * pulse, 26 * s + 12 * pulse, 15 * s + 12 * pulse);
        }
        // labels
        var a1 = (1 - sm(0.03, 0.14, zl)) * la;
        if (a1 > 0.02) {
          tx(ctx, 'ekran', 214, 150, { size: 24, weight: 700, color: C.ink, align: 'right', alpha: a1 });
          leaderTo(ctx, 222, 144, px0 - 6, 160, C, a1);
        }
        var a2 = bump(zl, 0.16, 0.28, 0.5, 0.66);
        if (a2 > 0.02) {
          var lx = Ax + s / 2 - 150, ly = Ay - 34;
          leaderTo(ctx, Math.max(60, lx) + 6, Math.max(34, ly) - 6, Ax + s * 0.15, Ay + s * 0.15, C, a2);
          pill(ctx, 'bir piksel', Math.max(60, lx) - 118, Math.max(34, ly), 24, 700, C.ink, 'left', a2, C);
        }
        var a3 = sm(0.94, 1, zl) * (cur.stage === 4 ? 0 : 1);
        if (a3 > 0.02) {
          var names = ['kırmızı', 'yeşil', 'mavi'], cols = ['#D43B33', '#2E9A4F', '#2D55D4'];
          for (var n = 0; n < 3; n++) pill(ctx, names[n], Ax + (n + 0.5) * s / 3, Ay + s + 40, 21, 700, cols[n], 'center', a3, C);
        }
        // swatch card: what the eye sees
        var sa = sm(0.88, 1, zl);
        if (sa > 0.02) {
          ctx.save(); ctx.globalAlpha *= sa;
          var cx0 = 800, cy0 = 70, cw = 280;
          softShadow(ctx, 18, 6, 0.14);
          ctx.fillStyle = C.card; K.rr(ctx, cx0, cy0, cw, 300, 14); ctx.fill(); noShadow(ctx);
          ctx.strokeStyle = C.line; ctx.lineWidth = 1.5; K.rr(ctx, cx0 + 0.5, cy0 + 0.5, cw - 1, 299, 14); ctx.stroke();
          ctx.fillStyle = 'rgb(' + (cur.col[0] | 0) + ',' + (cur.col[1] | 0) + ',' + (cur.col[2] | 0) + ')';
          K.rr(ctx, cx0 + 18, cy0 + 18, cw - 36, 170, 8); ctx.fill();
          tx(ctx, 'gözümüzün gördüğü renk', cx0 + cw / 2, cy0 + 216, { size: 16, color: C.muted, align: 'center' });
          var lab = ['R', 'G', 'B'], cc = ['#D43B33', '#2E9A4F', '#2D55D4'];
          for (var m = 0; m < 3; m++) {
            var bx = cx0 + 18 + m * ((cw - 36) / 3);
            tx(ctx, lab[m], bx + 4, cy0 + 262, { size: 22, weight: 700, mono: true, color: cc[m] });
            tx(ctx, String(Math.round(cur.col[m])), bx + 28, cy0 + 262, { size: 22, weight: 500, mono: true, color: C.ink });
          }
          ctx.restore();
        }
      }
      return {
        reset: function () {
          st.auto = true; st.now = 0; st.tz = 0; cur.zl = 0; cur.col = natural().slice(); st.tcol = natural().slice(); cur.stage = 0; cur.step = -1;
        },
        frame: frame,
        set: function (key, val) {
          if (key === 'r' || key === 'g' || key === 'b') {
            var n = clamp(Math.round(+val), 0, 255);
            if (isNaN(n)) return;
            if (st.auto) { st.auto = false; st.tcol = cur.col.slice(); st.tz = 1; }
            st.tcol[key === 'r' ? 0 : key === 'g' ? 1 : 2] = n;
          } else if (key === 'zoom') {
            if (st.auto) { st.auto = false; st.tcol = cur.col.slice(); }
            st.tz = +val >= 0.5 ? 1 : 0;
          }
        },
        read: function (key) {
          var c = cur.col;
          if (key === 'r') return String(Math.round(c[0]));
          if (key === 'g') return String(Math.round(c[1]));
          if (key === 'b') return String(Math.round(c[2]));
          if (key === 'rgb') return colText(c);
          if (key === 'formula') return '256 × 256 × 256 = 16.777.216 renk';
          if (key === 'explain') return explainOf();
          return '';
        }
      };
    });
  });

  /* ================================================================== */
  /* resolution                                                           */
  /* ================================================================== */
  K.register('resolution', function (el, opts) {
    return make2D(el, opts, function (C) {
      var RES = { '16x9': [16, 9], '32x18': [32, 18], '64x36': [64, 36], '128x72': [128, 72], '160x90': [160, 90], '1920x1080': [1920, 1080], '3840x2160': [3840, 2160] };
      var SEQ = [['16x9', 4], ['32x18', 3.6], ['64x36', 3.6], ['128x72', 4.2], ['1920x1080', 5], ['3840x2160', 6.2], ['hz10', 3.8], ['hz30', 3.8], ['hz60', 4.2]];
      var TOTAL = 0; SEQ.forEach(function (s) { TOTAL += s[1]; });
      var FX = 40, FY = 34, FW = 640, FH = 360;
      var cache = {};
      var st = { auto: true, now: 0, key: '16x9', prev: '', t0: 0, hz: 60, mode: 'res', manKey: '16x9', manT0: 0 };
      function count(k) { var r = RES[k]; return r[0] * r[1]; }
      function nameOf(k) { var r = RES[k]; return r[0] + ' × ' + r[1]; }
      function img(k) {
        var r = RES[k];
        if (r[0] > 400) return getScene();
        if (!cache[k]) {
          var c = document.createElement('canvas'); c.width = r[0]; c.height = r[1];
          var g = c.getContext('2d'); g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
          g.drawImage(getScene(), 0, 0, r[0], r[1]);
          cache[k] = c;
        }
        return cache[k];
      }
      /* which item of the story is on screen: {key, tau, prev} */
      function item(t) {
        if (!st.auto) {
          var tt0 = t - st.manT0;
          return { key: st.mode === 'hz' ? 'hz' + st.hz : st.manKey, tau: tt0, prev: st.prev };
        }
        var c = t % TOTAL, a = 0, i;
        for (i = 0; i < SEQ.length; i++) { if (c < a + SEQ[i][1]) break; a += SEQ[i][1]; }
        if (i >= SEQ.length) i = SEQ.length - 1;
        var prevKey = i > 0 ? SEQ[i - 1][0] : SEQ[SEQ.length - 1][0];
        return { key: SEQ[i][0], tau: c - a, prev: prevKey };
      }
      function isHz(k) { return k.indexOf('hz') === 0; }
      function explainOf(it) {
        var k = it.key;
        if (k === 'hz10') return '10 Hz: saniyede 10 görüntü; hareket kesik kesik görünür.';
        if (k === 'hz30') return '30 Hz: saniyede 30 görüntü; hareket daha akıcı.';
        if (k === 'hz60') return '60 Hz: saniyede 60 yeni görüntü; hareket pürüzsüz.';
        if (k === '16x9') return '16 × 9 = 144 piksel: görüntü kaba kutulardan oluşur.';
        if (k === '32x18') return 'Genişlik ve yükseklik iki katına çıktı: piksel sayısı 4 katına çıktı.';
        if (k === '64x36') return 'Yine iki kat: 2.304 piksel, resim netleşiyor.';
        if (k === '128x72') return '9.216 piksel: eğriler ve renk geçişleri belirmeye başlıyor.';
        if (k === '160x90') return '160 × 90 = 14.400 piksel: kutular hâlâ seçiliyor.';
        if (k === '1920x1080') return 'Full HD: 1920 × 1080 = 2.073.600 piksel; kutular gözle seçilmez.';
        return '4K: iki kat geniş, iki kat yüksek: Full HD’nin 4 katı, 8.294.400 piksel.';
      }
      function arrow(ctx, x0, y0, x1, y1, col, a) {
        ctx.save(); ctx.globalAlpha *= a; ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
        var ang = Math.atan2(y1 - y0, x1 - x0), hs = 11;
        ctx.beginPath(); ctx.moveTo(x1, y1);
        ctx.lineTo(x1 - hs * Math.cos(ang - 0.45), y1 - hs * Math.sin(ang - 0.45));
        ctx.lineTo(x1 - hs * Math.cos(ang + 0.45), y1 - hs * Math.sin(ang + 0.45)); ctx.fill();
        ctx.restore();
      }
      function chip(ctx, s, cx, cy, size, a) {
        ctx.save(); ctx.globalAlpha *= a;
        var w = tm(ctx, s, size, 700, true) + 22;
        ctx.fillStyle = C.copper; K.rr(ctx, cx - w / 2, cy - size * 0.95, w, size * 1.5, 8); ctx.fill();
        tx(ctx, s, cx, cy, { size: size, weight: 700, mono: true, color: '#FFFFFF', align: 'center' });
        ctx.restore();
      }
      function drawFrameImg(ctx, k, a) {
        var r = RES[k], cv = img(k);
        ctx.save(); ctx.globalAlpha *= a;
        ctx.imageSmoothingEnabled = r[0] > 400;
        ctx.drawImage(cv, FX, FY, FW, FH);
        var cell = FW / r[0];
        if (cell >= 4.5) {
          ctx.strokeStyle = 'rgba(12,12,18,' + clamp(0.18 + cell * 0.01, 0.2, 0.34) + ')'; ctx.lineWidth = 1;
          ctx.beginPath();
          for (var i = 1; i < r[0]; i++) { var x = FX + i * cell + 0.5; ctx.moveTo(x, FY); ctx.lineTo(x, FY + FH); }
          for (var j = 1; j < r[1]; j++) { var y = FY + j * cell + 0.5; ctx.moveTo(FX, y); ctx.lineTo(FX + FW, y); }
          ctx.stroke();
        }
        ctx.restore();
      }
      function frame(ctx, t, dt) {
        st.now = t;
        var it = item(t), k = it.key, tau = it.tau;
        st.cur = it;
        softShadow(ctx, 22, 8, 0.2);
        ctx.fillStyle = '#1D1F24'; K.rr(ctx, FX - 8, FY - 8, FW + 16, FH + 16, 8); ctx.fill(); noShadow(ctx);
        var col1 = C.ink, hzMode = isHz(k);
        if (!hzMode) {
          var fade = eio(tau / 0.55);
          if (it.prev && !isHz(it.prev) && fade < 1 && it.prev !== k) drawFrameImg(ctx, it.prev, 1);
          drawFrameImg(ctx, k, it.prev && !isHz(it.prev) && it.prev !== k ? fade : 1);
          // doubling arrows
          var pr = it.prev && RES[it.prev] ? RES[it.prev] : null, cr = RES[k];
          var dbl = pr && Math.abs(cr[0] / pr[0] - 2) < 0.01;
          var da = dbl ? bump(tau, 0.2, 0.7, 2.6, 3.2) : 0;
          if (da > 0.01) {
            arrow(ctx, FX + 40, FY - 22 + 0, FX + FW - 40, FY - 22, C.copper, da);
            arrow(ctx, FX + FW + 26, FY + 30, FX + FW + 26, FY + FH - 30, C.copper, da);
            chip(ctx, '× 2', FX + FW / 2, FY - 14, 20, da);
            chip(ctx, '× 2', FX + FW + 26, FY + FH / 2 + 7, 20, da);
          }
          if (k === '3840x2160') {
            var qa = sm(1.4, 2.2, tau);
            ctx.save(); ctx.globalAlpha *= qa;
            ctx.strokeStyle = 'rgba(255,255,255,0.95)'; ctx.lineWidth = 3; ctx.setLineDash([10, 6]);
            ctx.beginPath(); ctx.moveTo(FX + FW / 2, FY); ctx.lineTo(FX + FW / 2, FY + FH); ctx.moveTo(FX, FY + FH / 2); ctx.lineTo(FX + FW, FY + FH / 2); ctx.stroke();
            ctx.setLineDash([]);
            ctx.restore();
            for (var qi = 0; qi < 4; qi++) {
              var qx = FX + (qi % 2) * FW / 2 + FW / 4, qy = FY + Math.floor(qi / 2) * FH / 2 + FH / 4;
              ctx.save(); softShadow(ctx, 8, 2, 0.6);
              tx(ctx, 'Full HD', qx, qy + 7, { size: 22, weight: 700, color: '#FFFFFF', align: 'center', alpha: qa * sm(1.6 + qi * 0.25, 2.1 + qi * 0.25, tau) });
              ctx.restore();
            }
          }
          // right column
          var pc = count(k), pp = it.prev && RES[it.prev] ? count(it.prev) : pc;
          var shown = pp + (pc - pp) * eio(tau / 0.9);
          if (k === '16x9' && it.prev && isHz(it.prev)) shown = pc;
          var RX = 740;
          tx(ctx, 'ÇÖZÜNÜRLÜK', RX, 90, { size: 14, weight: 500, mono: true, color: C.muted, spacing: 1.4 });
          var nm = (k === '1920x1080' ? 'Full HD' : k === '3840x2160' ? '4K' : '');
          if (nm) tx(ctx, nm, RX, 140, { size: 34, weight: 700, color: C.copper });
          tx(ctx, nameOf(k), RX + (nm ? tm(ctx, nm + '  ', 34, 700) : 0), nm ? 140 : 140, { size: nm ? 26 : 38, weight: nm ? 500 : 700, mono: true, color: C.ink });
          tx(ctx, fmtN(shown), RX, 232, { size: 64, weight: 600, mono: true, color: C.ink });
          tx(ctx, 'piksel', RX, 268, { size: 24, weight: 500, color: C.ink2 });
          var xa = dbl ? bump(tau, 0.5, 1.0, 3.0, 3.6) : 0;
          if (xa > 0.01) chip(ctx, '4 kat piksel', RX + 80, 340, 24, xa);
          if (k === '3840x2160') chip(ctx, 'Full HD’nin 4 katı', RX + 112, 340, 22, sm(2, 2.7, tau));
        } else {
          // moving ball sampled at the refresh rate
          var hz = hzMode ? +k.slice(2) : st.hz;
          ctx.save();
          K.rr(ctx, FX, FY, FW, FH, 2); ctx.clip();
          ctx.imageSmoothingEnabled = true;
          ctx.drawImage(getScene(), FX, FY, FW, FH);
          ctx.fillStyle = 'rgba(15,15,25,0.30)'; ctx.fillRect(FX, FY, FW, FH);
          var tt = st.now, u = Math.floor(tt * hz) / hz;
          var bx = FX + 60 + (FW - 120) * (0.5 - 0.5 * Math.cos(u * TAU / 3.0));
          var by = FY + FH * 0.5 + Math.sin(u * TAU / 1.5) * FH * 0.2;
          var bg = ctx.createRadialGradient(bx - 8, by - 10, 4, bx, by, 34);
          bg.addColorStop(0, '#DCE3F6'); bg.addColorStop(1, '#2343B0');
          ctx.fillStyle = bg; ctx.beginPath(); ctx.arc(bx, by, 32, 0, TAU); ctx.fill();
          ctx.restore();
          // one-second strip with the refresh ticks
          var SX = FX, SY = FY + FH + 28, SWd = FW;
          ctx.fillStyle = C.line; ctx.fillRect(SX, SY, SWd, 2);
          var ph = (tt % 1);
          for (var n = 0; n <= hz; n++) {
            var tx0 = SX + SWd * n / hz, lit = n / hz <= ph;
            ctx.fillStyle = lit ? C.copper : C.faint;
            ctx.fillRect(tx0 - 1, SY - 8, 2, 18);
          }
          ctx.fillStyle = C.copper; ctx.beginPath(); ctx.arc(SX + SWd * ph, SY + 1, 6, 0, TAU); ctx.fill();
          tx(ctx, '1 saniye', SX + SWd, SY + 34, { size: 15, color: C.muted, align: 'right' });
          var RX2 = 740;
          tx(ctx, 'YENİLEME HIZI', RX2, 90, { size: 14, weight: 500, mono: true, color: C.muted, spacing: 1.4 });
          tx(ctx, hz + ' Hz', RX2, 190, { size: 76, weight: 600, mono: true, color: C.copper });
          tx(ctx, 'saniyede ' + hz, RX2, 240, { size: 26, weight: 600, color: C.ink });
          tx(ctx, 'yeni görüntü', RX2, 272, { size: 26, weight: 600, color: C.ink });
        }
      }
      return {
        reset: function () { st.auto = true; st.now = 0; st.prev = ''; st.hz = 60; st.mode = 'res'; st.manKey = '16x9'; st.manT0 = 0; },
        frame: frame,
        set: function (key, val) {
          if (key === 'res') {
            var s = String(val).toLowerCase().replace(/\s+/g, '').replace('×', 'x');
            if (!RES[s]) return;
            var wasKey = st.cur ? st.cur.key : '16x9';
            st.prev = isHz(wasKey) ? '' : wasKey;
            st.auto = false; st.mode = 'res'; st.manKey = s; st.manT0 = st.now;
          } else if (key === 'hz') {
            var n = +val, best = 60;
            [10, 30, 60].forEach(function (h) { if (Math.abs(h - n) < Math.abs(best - n)) best = h; });
            st.auto = false; st.mode = 'hz'; st.hz = best; st.manT0 = st.now;
          }
        },
        read: function (key) {
          var it = st.cur || { key: '16x9' }, k = it.key;
          var rk = isHz(k) ? '3840x2160' : k;
          if (key === 'pixels') return nameOf(rk) + ' = ' + fmtN(count(rk)) + ' piksel';
          if (key === 'hz') { var h = isHz(k) ? +k.slice(2) : st.hz; return h + ' Hz: saniyede ' + h + ' yeni görüntü'; }
          if (key === 'explain') return explainOf(it);
          if (key === 'formula') return isHz(k) ? '' : nameOf(rk) + ' = ' + fmtN(count(rk)) + ' piksel';
          return '';
        }
      };
    });
  });

  /* ================================================================== */
  /* data-sizes                                                           */
  /* ================================================================== */
  K.register('data-sizes', function (el, opts) {
    return make2D(el, opts, function (C) {
      var N = 5, BW = 160, GAP = 60, X0 = 40, BASE = 424;
      var NAMES = ['1 bayt', '1 kilobayt', '1 megabayt', '1 gigabayt', '1 terabayt'];
      var SUBS = ['bir harf', 'yarım sayfa yazı', 'bir fotoğraf', 'bir film', 'bir kütüphane'];
      var AMT = ['8 bit', '1.000 bayt', '1.000.000 bayt', '1 milyar bayt', '1 trilyon bayt'];
      var EXPL = [
        '1 bayt = 8 bit: bir harf. Her bit bir küçük anahtardır.',
        '1 kilobayt = 1.000 bayt: yaklaşık yarım sayfa yazı.',
        '1 megabayt = 1.000 kilobayt: bir fotoğraf ya da kitabın yazısı.',
        '1 gigabayt = 1.000 megabayt: kısa bir film.',
        '1 terabayt = 1.000 gigabayt: koca bir kütüphanenin yazısı.'
      ];
      var T0 = 0.5, DT = 2.2, HOLDT = 4.2, CYC = T0 + N * DT + HOLDT;
      var st = { now: 0, cur: -1 };
      function H(k) { return 90 + k * 52; }
      function drawObj(ctx, k, cx, by, a) {
        ctx.save(); ctx.globalAlpha *= a;
        var i;
        if (k === 0) {
          tx(ctx, 'A', cx, by - 30, { size: 54, weight: 700, color: C.ink, align: 'center' });
          var bits = [0, 1, 0, 0, 0, 0, 0, 1];
          for (i = 0; i < 8; i++) {
            ctx.fillStyle = bits[i] ? C.copper : (C.dark ? '#3A4254' : '#CFCEC6');
            K.rr(ctx, cx - 60 + i * 15.5, by - 20, 12, 18, 3); ctx.fill();
          }
        } else if (k === 1) {
          softShadow(ctx, 8, 3, 0.18);
          ctx.fillStyle = '#FFFFFF'; K.rr(ctx, cx - 36, by - 94, 72, 90, 4); ctx.fill(); noShadow(ctx);
          ctx.strokeStyle = C.line; ctx.lineWidth = 1.5; K.rr(ctx, cx - 36, by - 94, 72, 90, 4); ctx.stroke();
          ctx.fillStyle = '#B7BAC2';
          for (i = 0; i < 9; i++) ctx.fillRect(cx - 27, by - 82 + i * 8.4, i === 8 ? 28 : (i % 4 === 3 ? 40 : 54), 2.6);
        } else if (k === 2) {
          softShadow(ctx, 10, 4, 0.25);
          ctx.fillStyle = '#FFFFFF'; ctx.fillRect(cx - 62, by - 92, 124, 90); noShadow(ctx);
          ctx.imageSmoothingEnabled = true;
          ctx.drawImage(getScene(), cx - 56, by - 86, 112, 66);
          ctx.fillStyle = '#FFFFFF'; ctx.fillRect(cx - 56, by - 20, 112, 0);
        } else if (k === 3) {
          softShadow(ctx, 10, 4, 0.25);
          ctx.fillStyle = '#17181C'; K.rr(ctx, cx - 74, by - 92, 148, 88, 5); ctx.fill(); noShadow(ctx);
          ctx.fillStyle = '#F5F5F1';
          for (i = 0; i < 9; i++) { ctx.fillRect(cx - 68 + i * 16.5, by - 88, 8, 6); ctx.fillRect(cx - 68 + i * 16.5, by - 14, 8, 6); }
          ctx.imageSmoothingEnabled = true;
          for (i = 0; i < 3; i++) ctx.drawImage(getScene(), 190 + i * 100, 100 + i * 40, 280, 160, cx - 66 + i * 45, by - 76, 40, 58);
        } else {
          softShadow(ctx, 10, 4, 0.22);
          ctx.fillStyle = '#8A6B4A'; K.rr(ctx, cx - 76, by - 98, 152, 96, 4); ctx.fill(); noShadow(ctx);
          ctx.fillStyle = '#5E4630'; ctx.fillRect(cx - 70, by - 92, 140, 38); ctx.fillRect(cx - 70, by - 48, 140, 38);
          var rr = K.rng(9), cols = ['#2343B0', '#C8693A', '#6E7A8A', '#A8B0BD', '#3C4A5C', '#D8B07A', '#7F2F2A', '#3C7A5C'];
          for (var shelf = 0; shelf < 2; shelf++) {
            var xx = cx - 68, yb = by - 54 + shelf * 44;
            while (xx < cx + 64) {
              var bw = 4 + rr() * 5, bh = 22 + rr() * 12;
              ctx.fillStyle = cols[Math.floor(rr() * cols.length)];
              ctx.fillRect(xx, yb - bh, bw, bh);
              xx += bw + 0.8;
            }
          }
        }
        ctx.restore();
      }
      function frame(ctx, t) {
        st.now = t;
        var c = t % CYC, i;
        var cur = c < T0 ? -1 : Math.min(N, Math.floor((c - T0) / DT));
        st.cur = cur >= N ? N : cur;
        var outA = 1 - sm(CYC - 0.6, CYC, c);
        ctx.save(); ctx.globalAlpha *= outA;
        for (i = 0; i < N; i++) {
          var ta = T0 + i * DT, x = X0 + i * (BW + GAP), h = H(i);
          var rise = eio((c - ta) / 0.8);
          if (rise <= 0) continue;
          var hh = h * rise, top = BASE - hh;
          var active = cur === i;
          softShadow(ctx, 14, 5, 0.12);
          ctx.fillStyle = C.card; K.rr(ctx, x, top, BW, hh + 12, 10); ctx.fill(); noShadow(ctx);
          ctx.strokeStyle = active ? C.copper : C.line; ctx.lineWidth = active ? 3 : 1.5;
          K.rr(ctx, x + 0.5, top + 0.5, BW - 1, hh + 11, 10); ctx.stroke();
          ctx.fillStyle = K.mix(C.blueSoft && '#DCE3F6', '#2343B0', i / (N - 1));
          K.rr(ctx, x, top, BW, 7, 4); ctx.fill();
          var ta2 = sm(0.4, 0.8, rise);
          tx(ctx, NAMES[i], x + BW / 2, top + 36, { size: 24, weight: 700, color: C.ink, align: 'center', alpha: ta2 });
          tx(ctx, SUBS[i], x + BW / 2, top + 58, { size: 16, color: C.ink2, align: 'center', alpha: ta2 });
          tx(ctx, AMT[i], x + BW / 2, top + 80, { size: 15, weight: 500, mono: true, color: C.muted, align: 'center', alpha: ta2 });
          var oa = eout((c - ta - 0.5) / 0.6);
          if (oa > 0.01) {
            ctx.save(); ctx.translate(0, (1 - oa) * 14);
            drawObj(ctx, i, x + BW / 2, top - 6, oa);
            ctx.restore();
          }
          if (i > 0) {
            var ca = eout((c - ta + 0.1) / 0.5);
            var gx = x - GAP / 2, gy = top + 40;
            ctx.save(); ctx.globalAlpha *= ca;
            ctx.fillStyle = C.copper; K.rr(ctx, gx - 30, gy - 17, 60, 28, 8); ctx.fill();
            tx(ctx, '×1000', gx, gy + 3, { size: 16, weight: 700, mono: true, color: '#FFFFFF', align: 'center' });
            ctx.restore();
          }
        }
        ctx.restore();
      }
      return {
        reset: function () { st.now = 0; st.cur = -1; },
        frame: frame,
        read: function (key) {
          if (key === 'explain') return st.cur >= 0 && st.cur < N ? EXPL[st.cur] : (st.cur >= N ? 'Bayttan sonra her basamak bir öncekinin bin katıdır.' : 'Bir harf bir bayttır. Veriyi bayt cinsinden ölçeriz.');
          if (key === 'formula') return 'kilo = bin · mega = milyon · giga = milyar · tera = trilyon';
          return '';
        }
      };
    });
  });

  /* ================================================================== */
  /* cpu-terms                                                            */
  /* ================================================================== */
  K.register('cpu-terms', function (el, opts) {
    return make2D(el, opts, function (C) {
      var TOPICS = ['ghz', 'cekirdek', 'ram'];
      var DUR = { ghz: 10, cekirdek: 10, ram: 13 };
      var TOT = DUR.ghz + DUR.cekirdek + DUR.ram;
      var READ = {
        ghz: 'GHz: işlemcinin saat hızı. 3 GHz = saniyede 3 milyar tık; her tıkta işler bir adım ilerler',
        cekirdek: 'Çekirdek: işlemcinin içindeki bağımsız hesap birimi. 4 çekirdek aynı anda 4 iş yapabilir',
        ram: 'RAM çalışma masasıdır: küçük, hızlı, elektrik kesilince unutur. SSD raftır: büyük, daha yavaş, hatırlar'
      };
      var FORM = {
        ghz: '3 GHz = 3 × 1.000.000.000 = saniyede 3 milyar tık',
        cekirdek: '4 çekirdek, iş bölünebiliyorsa yaklaşık 4 kat çabuk bitirir',
        ram: 'RAM: 16 GB, çok hızlı · SSD: 512 GB, daha yavaş'
      };
      var st = { auto: true, now: 0, topic: 'ghz', t0: 0, loc: { topic: 'ghz', tau: 0 } };
      function where(t) {
        if (!st.auto) { var d = DUR[st.topic]; return { topic: st.topic, tau: (t - st.t0) % d }; }
        var c = t % TOT, a = 0;
        for (var i = 0; i < 3; i++) { var d2 = DUR[TOPICS[i]]; if (c < a + d2) return { topic: TOPICS[i], tau: c - a }; a += d2; }
        return { topic: 'ram', tau: 0 };
      }
      function fmtS(x) { return K.num(x, 1) + ' s'; }
      function lane(ctx, y, title, sub) {
        tx(ctx, title, 40, y + 44, { size: 34, weight: 700, color: C.ink });
        tx(ctx, sub, 40, y + 72, { size: 17, color: C.ink2 });
      }
      /* ---------------- GHz ---------------- */
      function sceneGhz(ctx, tau) {
        var run = Math.min(tau, 4.0), lanes = [{ f: 1, y: 56, t: '1 GHz', s: 'saniyede 1 milyar tık' }, { f: 3, y: 232, t: '3 GHz', s: 'saniyede 3 milyar tık' }];
        var TXs = 330, CWd = 58, CG = 4;
        lanes.forEach(function (L) {
          lane(ctx, L.y, L.t, L.s);
          var n = Math.floor(run * L.f + 1e-6);
          // clock wave over the last 2 s
          ctx.strokeStyle = C.blue; ctx.lineWidth = 2.5; ctx.beginPath();
          var WW = 12 * (CWd + CG), wy = L.y + 30, amp = 22;
          for (var px = 0; px <= WW; px += 3) {
            var tt = run - 2 * (1 - px / WW), ph = tt * L.f, hi = (ph - Math.floor(ph)) < 0.5;
            var yy = tt < 0 ? wy + amp : (hi ? wy : wy + amp);
            if (px === 0) ctx.moveTo(TXs + px, yy); else ctx.lineTo(TXs + px, yy);
          }
          ctx.stroke();
          for (var i = 0; i < 12; i++) {
            var cx = TXs + i * (CWd + CG), cy = L.y + 62, on = i < n;
            var age = on ? clamp((run - (i + 1) / L.f) / 0.35, 0, 1) : 0;
            ctx.fillStyle = on ? K.mix('#F3DCCB', C.blue, eout(age)) : (C.dark ? '#1F2533' : '#E9E8E1');
            K.rr(ctx, cx, cy, CWd, 56, 6); ctx.fill();
            if (on) { ctx.fillStyle = 'rgba(255,255,255,' + (0.9 * (1 - age)) + ')'; K.rr(ctx, cx, cy, CWd, 56, 6); ctx.fill(); }
          }
          tx(ctx, n + ' milyar tık', TXs + WW, L.y + 154, { size: 20, weight: 600, mono: true, color: C.ink, align: 'right' });
        });
        tx(ctx, 'her kutu = 1 milyar tık', 330, 432, { size: 15, color: C.muted });
        tx(ctx, 'ÇOK YAVAŞLATILMIŞ · geçen süre ' + fmtS(run), 1080, 432, { size: 14, weight: 500, mono: true, color: C.muted, align: 'right' });
      }
      /* ---------------- cores ---------------- */
      function sceneCores(ctx, tau) {
        var run = Math.min(tau, 8.0), D = 0.9;
        function doneAt(lanei, i) { return lanei === 0 ? (i + 1) * D : (Math.floor(i / 4) + 1) * D + (i % 4) * 0.04; }
        [0, 1].forEach(function (li) {
          var y = li === 0 ? 56 : 232;
          lane(ctx, y, li === 0 ? 'Tek çekirdek' : '4 çekirdek', li === 0 ? 'işleri sırayla yapar' : 'dört işi aynı anda yapar');
          var nc = li === 0 ? 1 : 4, size = li === 0 ? 74 : 40;
          var cx0 = 318;
          for (var c = 0; c < nc; c++) {
            var cx = cx0 + c * (size + 8), cy = y + 40 + (74 - size) / 2;
            var busy = li === 0 ? Math.floor(run / D) < 8 : Math.floor(run / D) < 2;
            var ph = (run / D) % 1;
            var pulse = busy ? 0.55 + 0.45 * Math.sin(ph * TAU) : 0;
            softShadow(ctx, 10, 3, 0.18);
            ctx.fillStyle = K.mix('#2A2D34', '#2343B0', 0.25 + 0.6 * pulse); K.rr(ctx, cx, cy, size, size, 8); ctx.fill(); noShadow(ctx);
            ctx.strokeStyle = 'rgba(255,255,255,0.25)'; ctx.lineWidth = 1.5; K.rr(ctx, cx + 6, cy + 6, size - 12, size - 12, 4); ctx.stroke();
          }
          var tx0 = 600;
          for (var i = 0; i < 8; i++) {
            var x = tx0 + i * 60, d = doneAt(li, i), done = run >= d, a = done ? clamp((run - d) / 0.4, 0, 1) : 0;
            ctx.fillStyle = K.mix('#F3DCCB', '#2343B0', eout(a)); K.rr(ctx, x, y + 52, 52, 52, 6); ctx.fill();
            if (done) { ctx.fillStyle = 'rgba(255,255,255,' + (0.9 * (1 - a)) + ')'; K.rr(ctx, x, y + 52, 52, 52, 6); ctx.fill(); }
          }
          var fin = li === 0 ? 8 * D : 2 * D + 0.12;
          tx(ctx, 'süre ' + fmtS(Math.min(run, fin)), 1080, y + 134, { size: 24, weight: 700, mono: true, color: run >= fin ? C.blue : C.ink, align: 'right' });
          tx(ctx, 'iş kutuları', 600, y + 134, { size: 15, color: C.muted });
        });
        tx(ctx, 'ÇOK YAVAŞLATILMIŞ', 1080, 432, { size: 14, weight: 500, mono: true, color: C.muted, align: 'right' });
      }
      /* ---------------- RAM and storage ---------------- */
      function packet(ctx, p0, p1, u, col) {
        var x = lerp(p0[0], p1[0], u), y = lerp(p0[1], p1[1], u);
        ctx.fillStyle = col; ctx.beginPath(); ctx.arc(x, y, 8, 0, TAU); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.beginPath(); ctx.arc(x - 2.5, y - 2.5, 3, 0, TAU); ctx.fill();
      }
      function sceneRam(ctx, tau) {
        var CPU = { x: 60, y: 150, w: 150, h: 150 };
        var RAM = { x: 360, y: 40, w: 220, h: 140 };
        var SSD = { x: 740, y: 190, w: 340, h: 210 };
        var cut = sm(10.2, 10.8, tau);
        var rc = [CPU.x + CPU.w, CPU.y + 40], rr0 = [RAM.x, RAM.y + RAM.h / 2];
        ctx.lineWidth = 5; ctx.lineCap = 'round';
        // buses
        ctx.strokeStyle = C.line2;
        ctx.beginPath(); ctx.moveTo(rc[0], rc[1]); ctx.lineTo(rc[0] + 60, rc[1]); ctx.lineTo(rc[0] + 60, rr0[1]); ctx.lineTo(rr0[0], rr0[1]); ctx.stroke();
        var sc = [CPU.x + CPU.w / 2, CPU.y + CPU.h], sp = [SSD.x, SSD.y + SSD.h / 2];
        ctx.beginPath(); ctx.moveTo(sc[0], sc[1]); ctx.lineTo(sc[0], SSD.y + SSD.h + 20 - 0); ctx.lineTo(sp[0] - 40, SSD.y + SSD.h + 20); ctx.lineTo(sp[0] - 40, sp[1]); ctx.lineTo(sp[0], sp[1]); ctx.stroke();
        ctx.lineCap = 'butt';
        // CPU
        softShadow(ctx, 14, 5, 0.2);
        ctx.fillStyle = '#2A2D34'; K.rr(ctx, CPU.x, CPU.y, CPU.w, CPU.h, 12); ctx.fill(); noShadow(ctx);
        ctx.fillStyle = '#3C4150'; K.rr(ctx, CPU.x + 28, CPU.y + 28, CPU.w - 56, CPU.h - 56, 8); ctx.fill();
        tx(ctx, 'işlemci', CPU.x + CPU.w / 2, CPU.y + CPU.h + 30, { size: 20, weight: 700, color: C.ink, align: 'center' });
        // RAM
        softShadow(ctx, 12, 4, 0.14);
        ctx.fillStyle = C.card; K.rr(ctx, RAM.x, RAM.y, RAM.w, RAM.h, 10); ctx.fill(); noShadow(ctx);
        ctx.strokeStyle = C.line; ctx.lineWidth = 1.5; K.rr(ctx, RAM.x + 0.5, RAM.y + 0.5, RAM.w - 1, RAM.h - 1, 10); ctx.stroke();
        var rows = 3, cols = 8, ramOn = 1 - cut;
        for (var r = 0; r < rows; r++) for (var c = 0; c < cols; c++) {
          var on = ((r * 5 + c * 3) % 4) !== 0;
          ctx.fillStyle = on ? K.mix('#E9E8E1', '#2343B0', ramOn) : '#E9E8E1';
          K.rr(ctx, RAM.x + 16 + c * 24.5, RAM.y + 50 + r * 26, 20, 20, 4); ctx.fill();
        }
        tx(ctx, 'RAM · 16 GB', RAM.x + 16, RAM.y + 34, { size: 20, weight: 700, color: C.ink });
        tx(ctx, 'küçük, çok hızlı', RAM.x + RAM.w / 2, RAM.y + RAM.h + 28, { size: 17, color: C.ink2, align: 'center' });
        // SSD
        softShadow(ctx, 12, 4, 0.14);
        ctx.fillStyle = C.card; K.rr(ctx, SSD.x, SSD.y, SSD.w, SSD.h, 10); ctx.fill(); noShadow(ctx);
        ctx.strokeStyle = C.line; ctx.lineWidth = 1.5; K.rr(ctx, SSD.x + 0.5, SSD.y + 0.5, SSD.w - 1, SSD.h - 1, 10); ctx.stroke();
        var saved = sm(8.0, 8.8, tau);
        for (r = 0; r < 5; r++) for (c = 0; c < 14; c++) {
          var on2 = ((r * 7 + c * 5) % 3) !== 0;
          var isNew = r === 4 && c >= 11;
          ctx.fillStyle = on2 || (isNew && saved > 0) ? K.mix('#E9E8E1', '#2343B0', isNew ? saved : 1) : '#E9E8E1';
          K.rr(ctx, SSD.x + 16 + c * 22.5, SSD.y + 52 + r * 26, 18, 18, 3); ctx.fill();
        }
        tx(ctx, 'SSD · 512 GB', SSD.x + 16, SSD.y + 34, { size: 20, weight: 700, color: C.ink });
        tx(ctx, 'büyük, daha yavaş', SSD.x + SSD.w / 2, SSD.y + SSD.h + 28, { size: 17, color: C.ink2, align: 'center' });
        // packets
        if (tau >= 1 && tau < 4.2) {
          var u = ((tau - 1) % 0.8) / 0.8, a = u < 0.5 ? u * 2 : 2 - u * 2;
          var path = [[rc[0], rc[1]], [rc[0] + 60, rc[1]], [rc[0] + 60, rr0[1]], [rr0[0], rr0[1]]];
          var seg = a * 3, si = Math.min(2, Math.floor(seg));
          packet(ctx, path[si], path[si + 1], seg - si, C.blue);
        }
        if (tau >= 4.4 && tau < 8.0) {
          var u2 = ((tau - 4.4) % 3.4) / 3.4, a2 = u2 < 0.5 ? u2 * 2 : 2 - u2 * 2;
          var path2 = [sc, [sc[0], SSD.y + SSD.h + 20], [sp[0] - 40, SSD.y + SSD.h + 20], [sp[0] - 40, sp[1]], sp];
          var lens = [], tot = 0;
          for (var q = 0; q < 4; q++) { var l = Math.abs(path2[q + 1][0] - path2[q][0]) + Math.abs(path2[q + 1][1] - path2[q][1]); lens.push(l); tot += l; }
          var d = a2 * tot, qi = 0;
          while (qi < 3 && d > lens[qi]) { d -= lens[qi]; qi++; }
          packet(ctx, path2[qi], path2[qi + 1], d / lens[qi], C.blue);
        }
        // save: item moves from RAM to SSD
        if (tau >= 6.4 && tau < 8.2) {
          var us = eio((tau - 6.4) / 1.8);
          var p0 = [RAM.x + RAM.w - 30, RAM.y + 110], p1 = [SSD.x + 16 + 12 * 22.5 + 9, SSD.y + 52 + 4 * 26 + 9];
          ctx.fillStyle = C.copper;
          K.rr(ctx, lerp(p0[0], p1[0], us) - 14, lerp(p0[1], p1[1], us) - 18, 28, 36, 4); ctx.fill();
          ctx.fillStyle = '#fff'; ctx.fillRect(lerp(p0[0], p1[0], us) - 8, lerp(p0[1], p1[1], us) - 8, 16, 3); ctx.fillRect(lerp(p0[0], p1[0], us) - 8, lerp(p0[1], p1[1], us) - 1, 12, 3);
        }
        if (cut > 0.01) {
          ctx.save(); ctx.globalAlpha *= cut;
          ctx.fillStyle = C.copper; K.rr(ctx, 420, 340, 250, 36, 8); ctx.fill();
          tx(ctx, 'ELEKTRİK KESİLDİ', 545, 365, { size: 17, weight: 700, mono: true, color: '#FFFFFF', align: 'center', spacing: 1 });
          ctx.restore();
        }
        if (tau > 7.2 && tau < 10) tx(ctx, 'kaydet', 380, 232, { size: 20, weight: 700, color: C.copper, alpha: bump(tau, 7.2, 7.6, 9.6, 10) });
      }
      function explainOf(w) {
        var tau = w.tau;
        if (w.topic === 'ghz') return tau < 1 ? 'İşlemcinin içinde bir saat var: her tıkta işler bir adım ilerler.' : '3 GHz işlemci saniyede 3 milyar tık atar: 1 GHz’den üç kat çok adım.';
        if (w.topic === 'cekirdek') return tau < 1.5 ? 'Çekirdek, işlemcinin içindeki bağımsız bir hesap birimidir.' : '4 çekirdek aynı anda dört iş yapar; sekiz iş çok daha çabuk biter.';
        if (tau < 1) return 'RAM ve SSD: ikisi de veri saklar ama farklı işler görür.';
        if (tau < 4.3) return 'RAM işlemcinin çalışma masasıdır: küçük ama çok hızlı.';
        if (tau < 6.4) return 'Depolama (SSD) raftır: büyük ama daha yavaş.';
        if (tau < 10.2) return 'Kaydedince çalışma masasındaki iş rafa konur.';
        return 'Elektrik kesilince RAM unutur; kaydedilen SSD’de kalır.';
      }
      function frame(ctx, t) {
        st.now = t;
        var w = where(t); st.loc = w;
        var d = DUR[w.topic], a = Math.min(1, w.tau / 0.45, (d - w.tau) / 0.45);
        ctx.save(); ctx.globalAlpha *= clamp(a, 0, 1);
        if (w.topic === 'ghz') sceneGhz(ctx, w.tau);
        else if (w.topic === 'cekirdek') sceneCores(ctx, w.tau);
        else sceneRam(ctx, w.tau);
        ctx.restore();
      }
      return {
        reset: function () { st.auto = true; st.now = 0; st.topic = 'ghz'; st.t0 = 0; },
        frame: frame,
        set: function (key, val) {
          if (key !== 'topic') return;
          var s = String(val).toLowerCase().replace('ç', 'c').replace('ı', 'i');
          if (TOPICS.indexOf(s) < 0) return;
          st.auto = false; st.topic = s; st.t0 = st.now;
        },
        read: function (key) {
          var w = st.loc;
          if (key === 'topic') return READ[w.topic];
          if (key === 'explain') return explainOf(w);
          if (key === 'formula') return FORM[w.topic];
          return '';
        }
      };
    });
  });

})();
