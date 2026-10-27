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
  K.register('bits-letter', function (el, opts) {
    var THREE = window.THREE;
    opts = opts || {};
    var theme = opts.theme || 'light';
    var C = themeColors(theme);
    var N = 8, PX = 1.12;
    var v = K.stage3d(el, {
      theme: theme, fov: 24, yaw: 0, pitch: 0.7, distance: 14.0, target: [0, -0.3, 0.1],
      size: 6, ground: -0.29, minYaw: -0.3, maxYaw: 0.3, minPitch: 0.3, maxPitch: 1.05, minDistance: 11, maxDistance: 18
    });
    if (v.lights) {
      v.lights.key.position.set(3, 9, 7);
      v.lights.key.shadow.camera.left = -7; v.lights.key.shadow.camera.right = 7;
      v.lights.key.shadow.camera.top = 7; v.lights.key.shadow.camera.bottom = -7;
      v.lights.key.shadow.camera.updateProjectionMatrix();
    }
    // one byte = one tray holding eight switches
    var tray = mesh(rbox(N * PX + 0.42, 0.16, 1.5, 0.07, 4), M(0xD8D5CD, 0.62, 0, { envMapIntensity: 0.65 }), true, true);
    tray.position.set(0, -0.21, 0);
    shiftView(v, 0.188, -0.085);
    v.scene.add(tray);
    var kit = makeTileKit();
    var gtex = radialTex();
    var tiles = [], glows = [], xs = [];
    for (var i = 0; i < N; i++) xs.push((i - 3.5) * PX);
    var row = makeTileRow(kit, xs);
    v.scene.add(row.group);
    for (i = 0; i < N; i++) {
      var T = { x: xs[i] };
      var gs = glowSprite(0xF29A5C, 1.25, gtex, C.dark);
      gs.position.set(T.x, 0.3, 0);
      v.scene.add(gs);
      tiles.push(T); glows.push(gs);
    }
    var EPC = 4;
    var elec = K.instanced(N * EPC, { radius: 0.04, detail: 1, material: K.mat.electron(C.dark) });
    v.scene.add(elec);

    var WORD = 'DENEYAP';
    var RM = K.reducedMotion;
    var LT = RM ? 5 : 3.7;            // seconds per letter
    var HOLD = 3.4;                    // hold the finished word
    var CLR = 0.9;                     // clearing at the end of the hold
    var CYCLE = WORD.length * LT + HOLD;
    var ZERO = [0, 0, 0, 0, 0, 0, 0, 0];

    var st = { mode: 'auto', autoT0: 0, now: 0, man: null, glow: ZERO.slice(), bits: bitsOf(68), wordShown: '' };

    /* Timing of one episode (bits flip, terms fly to the sum, letter appears) */
    var STAG = RM ? 0 : 0.085, FLIP = RM ? 0.2 : 0.32, D0 = 0.12;
    function termStart(j) { return (RM ? 0.3 : 0.78) + j * (RM ? 0 : 0.15); }
    var FLYD = RM ? 0.01 : 0.55;
    function eqStart(nTerms) { return termStart(Math.max(0, nTerms - 1)) + FLYD + 0.05; }

    function codeOfBits(b) { var c = 0; for (var i = 0; i < 8; i++) c = c * 2 + (b[i] ? 1 : 0); return c; }
    function letterOf(code) {
      if (code >= 33 && code <= 126) return String.fromCharCode(code);
      if (code === 32) return 'boşluk';
      return '';
    }

    /* Episode at time t: {prev, next, tau, li, wordIdx, clear} */
    function episode(t) {
      if (st.mode === 'manual' && st.man) {
        return { prev: st.man.from, next: st.man.to, tau: t - st.man.t0, li: -1, prevText: st.man.prevText };
      }
      var a = Math.max(0, t - st.autoT0);
      var cyc = a % CYCLE;
      var nW = WORD.length;
      if (cyc >= nW * LT) {
        var h = cyc - nW * LT;
        var last = bitsOf(WORD.charCodeAt(nW - 1));
        if (h > HOLD - CLR) return { prev: last, next: ZERO, tau: h - (HOLD - CLR), li: nW - 1, clear: true, hold: h };
        return { prev: last, next: last, tau: LT + h, li: nW - 1, hold: h };
      }
      var li = Math.floor(cyc / LT);
      var tau = cyc - li * LT;
      var prev = li > 0 ? bitsOf(WORD.charCodeAt(li - 1)) : ZERO;
      return { prev: prev, next: bitsOf(WORD.charCodeAt(li)), tau: tau, li: li };
    }
    function flipP(E, i) { return eio((E.tau - D0 - i * STAG) / FLIP); }

    /* Turn a target bit array into the display description */
    function describe(bits) {
      var terms = [], idx = [];
      for (var i = 0; i < 8; i++) if (bits[i]) { terms.push(PLACE[i]); idx.push(i); }
      var code = codeOfBits(bits);
      return { terms: terms, idx: idx, code: code, letter: letterOf(code) };
    }

    function binStr(b) { return b.slice(0, 4).join('') + ' ' + b.slice(4).join(''); }
    function sumStr(d) {
      if (!d.terms.length) return '0';
      if (d.terms.length === 1) return String(d.terms[0]);
      return d.terms.join(' + ') + ' = ' + d.code;
    }

    /* ---------- overlay ---------- */
    var X0 = 716;                    // right panel left edge
    var CARD = { x: 958, y: 30, w: 134, h: 166 };
    function drawOverlay(E, t) {
      var ctx = v.ctx;
      beginOverlay(ctx);
      var D = describe(E.next);
      var Dprev = describe(E.prev);
      var tiles2 = [];
      var i, k;
      // tile anchors
      for (i = 0; i < N; i++) {
        var top = v.project([tiles[i].x, 0.27, -0.05]);
        var bot = v.project([tiles[i].x, -0.13, 0.52]);
        tiles2.push({ x: top.x, ty: top.y, by: bot.y });
      }
      // header
      tag(ctx, '8 TRANSİSTÖR ANAHTAR · 8 BİT = 1 BAYT', Math.max(18, tiles2[0].x - 34), Math.max(30, tiles2[0].ty - 82), C);
      // bit digits above tiles
      for (i = 0; i < N; i++) {
        var g = st.glow[i];
        var x = tiles2[i].x, y = tiles2[i].ty - 30;
        txt(ctx, '1', x, y - (1 - g) * 9, { size: 30, weight: 500, mono: true, color: C.copper, align: 'center', alpha: g });
        txt(ctx, '0', x, y + g * 9, { size: 30, weight: 500, mono: true, color: C.faint, align: 'center', alpha: 1 - g });
        // place values under tiles
        var pv = String(PLACE[i]);
        var col = K.mix(C.muted, C.ink, g);
        txt(ctx, pv, x, tiles2[i].by + 26, { size: 16, weight: 500, mono: true, color: col, align: 'center' });
      }
      var noteY = tiles2[0].by + 62;
      txt(ctx, 'Akım geçiyor = 1 · akım yok = 0. Sağdan sola her basamağın değeri bir öncekinin iki katıdır.', Math.max(18, tiles2[0].x - 34), noteY, { size: 12.5, color: C.muted });

      // divider
      ctx.fillStyle = C.line;
      ctx.fillRect(X0 - 26, 34, 1, 312);

      // binary string
      tag(ctx, 'İKİLİK SAYI', X0, 44, C);
      var bx = X0, by = 84, bs = 32;
      var cw = tw(ctx, '0', bs, 500, true);
      for (i = 0; i < 8; i++) {
        var gx = bx + i * cw + (i >= 4 ? cw * 0.6 : 0);
        var g2 = st.glow[i];
        txt(ctx, '1', gx, by, { size: bs, weight: 500, mono: true, color: C.copper, alpha: g2 });
        txt(ctx, '0', gx, by, { size: bs, weight: 500, mono: true, color: C.ink2, alpha: 1 - g2 });
      }

      // sum: previous fades, terms fly in
      tag(ctx, 'ONLUK DEĞER', X0, 124, C);
      var sumY = 158;
      var maxW = CARD.x - X0 - 18;
      var fadePrev = 1 - clamp(E.tau / 0.3, 0, 1);
      if (E.clear) fadePrev = 1 - clamp(E.tau / 0.5, 0, 1);
      if (E.li !== undefined && (E.hold !== undefined && !E.clear)) fadePrev = 0;
      var showPrev = (E.prev !== ZERO || E.prevText) && fadePrev > 0;
      if (E.clear) {
        drawSumStatic(ctx, Dprev, X0, sumY, maxW, fadePrev);
      } else if (E.hold !== undefined) {
        drawSumStatic(ctx, D, X0, sumY, maxW, 1);
      } else {
        if (showPrev && E.tau < 0.3) drawSumStatic(ctx, E.prevText || Dprev, X0, sumY, maxW, fadePrev);
        drawSumAnimated(ctx, D, tiles2, X0, sumY, maxW, E.tau);
      }

      // ASCII neighbourhood and letter card
      var lt = letterPhase(E, D);
      drawAscii(ctx, E, D, Dprev, lt);
      drawCard(ctx, E, D, Dprev, lt);
      drawWord(ctx, E, D, lt);
    }

    function sumLayout(ctx, d, maxW) {
      var size = 22, s = sumStr(d);
      var plus = ' + ', eq = ' = ';
      var w = tw(ctx, s, size, 500, true);
      if (w > maxW) {
        size = Math.floor(22 * maxW / w);
        if (size < 17) {
          // long sums (many 1 bits): drop the spaces around + and fit again
          plus = '+';
          s = d.terms.join('+') + ' = ' + d.code;
          w = tw(ctx, s, 22, 500, true);
          size = Math.max(12, Math.min(22, Math.floor(22 * maxW / w)));
        }
      }
      setFont(ctx, fontStr(size, 500, true));
      var parts = [], x = 0, j;
      var wPlus = ctx.measureText(plus).width, wEq = ctx.measureText(eq).width;
      for (j = 0; j < d.terms.length; j++) {
        if (j > 0) { parts.push({ kind: 'plus', x: x, w: wPlus }); x += wPlus; }
        var ts = String(d.terms[j]);
        var w2 = ctx.measureText(ts).width;
        parts.push({ kind: 'term', j: j, s: ts, x: x, w: w2 });
        x += w2;
      }
      if (d.terms.length > 1) {
        parts.push({ kind: 'eq', x: x, w: wEq }); x += wEq;
        var rs = String(d.code);
        parts.push({ kind: 'res', s: rs, x: x, w: ctx.measureText(rs).width });
      }
      return { size: size, parts: parts, plus: plus, eq: eq };
    }
    function drawSumStatic(ctx, d, x0, y, maxW, alpha) {
      if (alpha <= 0) return;
      if (!d.terms.length) { txt(ctx, '0', x0, y, { size: 22, weight: 500, mono: true, color: C.ink, alpha: alpha }); return; }
      var L = sumLayout(ctx, d, maxW);
      for (var j = 0; j < L.parts.length; j++) {
        var p = L.parts[j];
        if (p.kind === 'term') txt(ctx, p.s, x0 + p.x, y, { size: L.size, weight: 500, mono: true, color: C.copper, alpha: alpha });
        else if (p.kind === 'plus') txt(ctx, L.plus, x0 + p.x, y, { size: L.size, weight: 500, mono: true, color: C.muted, alpha: alpha });
        else if (p.kind === 'eq') txt(ctx, ' = ', x0 + p.x, y, { size: L.size, weight: 500, mono: true, color: C.muted, alpha: alpha });
        else txt(ctx, p.s, x0 + p.x, y, { size: L.size, weight: 600, mono: true, color: C.ink, alpha: alpha });
      }
    }
    function drawSumAnimated(ctx, d, tiles2, x0, y, maxW, tau) {
      if (!d.terms.length) {
        txt(ctx, '0', x0, y, { size: 22, weight: 500, mono: true, color: C.ink, alpha: clamp((tau - termStart(0)) / 0.3, 0, 1) });
        return;
      }
      var L = sumLayout(ctx, d, maxW);
      var eqA = clamp((tau - eqStart(d.terms.length)) / 0.3, 0, 1);
      for (var j = 0; j < L.parts.length; j++) {
        var p = L.parts[j];
        if (p.kind === 'term') {
          var f = eio((tau - termStart(p.j)) / FLYD);
          if (f <= 0) continue;
          var ti = d.idx[p.j];
          var sx = tiles2[ti].x, sy = tiles2[ti].by + 26;
          var ex = x0 + p.x + p.w / 2, ey = y;
          if (f < 1) {
            var cx = sx + (ex - sx) * 0.62, cy = Math.max(sy, ey) + 8;
            var u = 1 - f;
            var px = u * u * sx + 2 * u * f * cx + f * f * ex;
            var py = u * u * sy + 2 * u * f * cy + f * f * ey;
            var size = lerp(16, L.size, f);
            txt(ctx, p.s, px, py, { size: size, weight: 500, mono: true, color: C.copper, align: 'center', alpha: clamp(f * 4, 0, 1) });
          } else {
            txt(ctx, p.s, x0 + p.x, y, { size: L.size, weight: 500, mono: true, color: C.copper });
          }
        } else if (p.kind === 'plus') {
          var nextTerm = L.parts[j + 1];
          var fa = clamp((tau - termStart(nextTerm.j) - FLYD * 0.6) / 0.25, 0, 1);
          txt(ctx, L.plus, x0 + p.x, y, { size: L.size, weight: 500, mono: true, color: C.muted, alpha: fa });
        } else if (p.kind === 'eq') {
          txt(ctx, ' = ', x0 + p.x, y, { size: L.size, weight: 500, mono: true, color: C.muted, alpha: eqA });
        } else {
          txt(ctx, p.s, x0 + p.x, y, { size: L.size, weight: 600, mono: true, color: C.ink, alpha: eqA });
        }
      }
    }

    /* Letter timing inside an episode: 0 → 1 as the letter appears */
    function letterPhase(E, D) {
      if (E.hold !== undefined && !E.clear) return 1;
      if (E.clear) return 1;
      var t0 = eqStart(D.terms.length) + 0.35;
      return eio((E.tau - t0) / 0.4);
    }

    function drawAscii(ctx, E, D, Dprev, lp) {
      var y0 = 196;
      tag(ctx, 'ASCII TABLOSU', X0, y0, C);
      var showD = E.clear ? Dprev : D;
      var a = E.clear ? 1 - clamp(E.tau / 0.5, 0, 1) : lp;
      var prevA = (!E.clear && E.hold === undefined) ? (1 - clamp(E.tau / 0.3, 0, 1)) : 0;
      var cellW = 44, cellH = 52, gap = 6, x = X0, y = y0 + 12;
      // neighbourhood frame always visible (faint)
      var bigShown = showD.code > 127 && a > 0.01;
      for (var k = -2; k <= 2 && !bigShown; k++) {
        var cx = x + (k + 2) * (cellW + gap);
        ctx.strokeStyle = C.line;
        ctx.lineWidth = 1;
        K.rr(ctx, cx + 0.5, y + 0.5, cellW, cellH, 6);
        ctx.stroke();
      }
      function cells(d, alpha, hi) {
        if (alpha <= 0 || d.code > 127) return;
        for (var k = -2; k <= 2; k++) {
          var code = d.code + k;
          var cx = x + (k + 2) * (cellW + gap);
          if (k === 0 && hi) {
            ctx.save();
            ctx.globalAlpha *= alpha;
            ctx.fillStyle = C.copperSoft;
            K.rr(ctx, cx, y, cellW + 1, cellH + 1, 6);
            ctx.fill();
            ctx.strokeStyle = C.copperFill;
            ctx.lineWidth = 1.5;
            K.rr(ctx, cx + 0.75, y + 0.75, cellW - 0.5, cellH - 0.5, 6);
            ctx.stroke();
            ctx.restore();
          }
          if (code < 0 || code > 127) continue;
          var L = (code >= 33 && code <= 126) ? String.fromCharCode(code) : (code === 32 ? '␣' : '·');
          txt(ctx, String(code), cx + cellW / 2, y + 17, { size: 11.5, weight: 500, mono: true, color: k === 0 ? C.copper : C.muted, align: 'center', alpha: alpha });
          txt(ctx, L, cx + cellW / 2, y + 42, { size: 19, weight: 600, color: k === 0 ? C.ink : C.ink2, align: 'center', alpha: alpha * (k === 0 ? 1 : 0.75) });
        }
      }
      if (prevA > 0 && (E.prev !== ZERO || E.prevText)) cells(E.prevText || Dprev, prevA, true);
      cells(showD, a, true);
      if (bigShown) txt(ctx, 'ASCII tablosu 127’de biter', x, y + 30, { size: 12.5, color: C.muted, alpha: a });
    }

    function drawCard(ctx, E, D, Dprev, lp) {
      var c = CARD;
      ctx.fillStyle = C.card;
      K.rr(ctx, c.x, c.y, c.w, c.h, 10);
      ctx.fill();
      ctx.strokeStyle = C.line;
      ctx.lineWidth = 1;
      K.rr(ctx, c.x + 0.5, c.y + 0.5, c.w - 1, c.h - 1, 10);
      ctx.stroke();
      tag(ctx, 'HARF', c.x + 12, c.y + 22, C);
      var d = E.clear ? Dprev : D, a = E.clear ? 1 - clamp(E.tau / 0.5, 0, 1) : lp;
      var prevA = (!E.clear && E.hold === undefined) ? (1 - clamp(E.tau / 0.3, 0, 1)) : 0;
      function glyph(dd, alpha, sc) {
        if (alpha <= 0) return;
        var L = dd.letter;
        if (L === 'boşluk') {
          txt(ctx, 'boşluk', c.x + c.w / 2, c.y + c.h / 2 + 14, { size: 22, weight: 600, color: C.ink, align: 'center', alpha: alpha });
        } else if (!L) {
          txt(ctx, '—', c.x + c.w / 2, c.y + c.h / 2 + 18, { size: 48, weight: 400, color: C.faint, align: 'center', alpha: alpha });
        } else {
          txt(ctx, L, c.x + c.w / 2, c.y + c.h / 2 + 44 - (1 - sc) * 10, { size: 116 * (0.92 + 0.08 * sc), weight: 600, color: C.ink, align: 'center', alpha: alpha });
        }
        txt(ctx, dd.code > 127 ? dd.code + ' · ASCII dışı' : 'ASCII ' + dd.code, c.x + c.w / 2, c.y + c.h + 22, { size: 12.5, weight: 500, mono: true, color: C.muted, align: 'center', alpha: alpha });
      }
      if (prevA > 0 && (E.prev !== ZERO || E.prevText)) glyph(E.prevText || Dprev, prevA, 1);
      // while the sum is still being built: a quiet question mark
      var qa = Math.min(1 - prevA, clamp(1 - a * 3, 0, 1));
      if (qa > 0.01 && !E.clear) txt(ctx, '?', c.x + c.w / 2, c.y + c.h / 2 + 30, { size: 72, weight: 400, color: C.line2, align: 'center', alpha: qa });
      glyph(d, a, a);
      if (!d.letter && a > 0.5 && !E.clear) {
        var why = d.code > 127 ? 'ASCII yalnızca 0–127' : 'kontrol kodu: yazılmaz';
        txt(ctx, why, c.x + c.w / 2, c.y + c.h - 18, { size: 11.5, color: C.muted, align: 'center', alpha: a });
      }
    }

    function letterDone(E, D, j) {
      return j < E.li || (j === E.li && (E.hold !== undefined || (letterPhase(E, D) >= 1 && flyP(E, D) >= 1)));
    }
    function drawWord(ctx, E, D, lp) {
      var auto = st.mode === 'auto';
      var y0 = 292;
      var wa = auto ? 1 : 0;
      if (E.clear) wa = 1 - clamp(E.tau / 0.6, 0, 1);
      if (!auto) {
        // manual mode: a small reference instead of the word
        var ra = clamp((E.tau - 0.2) / 0.5, 0, 1);
        tag(ctx, 'ASCII ARALIKLARI', X0, y0, C, { alpha: ra });
        var rows = [['65–90', 'büyük harfler A … Z'], ['97–122', 'küçük harfler a … z'], ['48–57', 'rakamlar 0 … 9'], ['32', 'boşluk']];
        for (var r = 0; r < rows.length; r++) {
          txt(ctx, rows[r][0], X0, y0 + 24 + r * 17, { size: 12.5, weight: 500, mono: true, color: C.copper, alpha: ra });
          txt(ctx, rows[r][1], X0 + 62, y0 + 24 + r * 17, { size: 12.5, color: C.ink2, alpha: ra });
        }
        return;
      }
      if (wa <= 0) return;
      tag(ctx, 'KELİME', X0, y0, C, { alpha: wa });
      var cellW = 46, gap = 8, y = y0 + 12, cellH = 52;
      for (var j = 0; j < WORD.length; j++) {
        var cx = X0 + j * (cellW + gap);
        var done = letterDone(E, D, j);
        var current = j === E.li && !done;
        ctx.save();
        ctx.globalAlpha *= wa;
        ctx.strokeStyle = current ? C.copperFill : C.line;
        ctx.lineWidth = current ? 1.5 : 1;
        K.rr(ctx, cx + 0.5, y + 0.5, cellW, cellH, 6);
        ctx.stroke();
        ctx.restore();
        if (done) {
          var ch = WORD[j];
          txt(ctx, ch, cx + cellW / 2, y + 30, { size: 24, weight: 600, color: C.ink, align: 'center', alpha: wa });
          txt(ctx, String(WORD.charCodeAt(j)), cx + cellW / 2, y + 46, { size: 12, weight: 500, mono: true, color: C.muted, align: 'center', alpha: wa });
        }
      }
      // flying letter from the card into its cell
      var f = flyP(E, D);
      if (auto && !E.clear && E.hold === undefined && f > 0 && f < 1) {
        var c = CARD;
        var sx = c.x + c.w / 2, sy = c.y + c.h / 2 + 44;
        var ex = X0 + E.li * (cellW + gap) + cellW / 2, ey = y + 33;
        var u = eio(f);
        var px = lerp(sx, ex, u), py = lerp(sy, ey, u) - Math.sin(Math.PI * u) * 30;
        txt(ctx, D.letter, px, py, { size: lerp(116, 26, u), weight: 600, color: C.copper, align: 'center', alpha: 0.9 });
      }
    }
    function flyP(E, D) {
      if (E.li < 0) return 0;
      var t0 = Math.max(eqStart(D.terms.length) + 1.0, LT - 1.05);
      return clamp((E.tau - t0) / 0.6, 0, 1);
    }

    /* ---------- per-frame 3D ---------- */
    function frame(t, dt) {
      st.now = t;
      var E = episode(t);
      for (var i = 0; i < N; i++) {
        var p = flipP(E, i);
        var g = lerp(E.prev[i], E.next[i], p);
        st.glow[i] = g;
        var T = tiles[i];
        var dip = (E.prev[i] !== E.next[i]) ? Math.sin(Math.PI * p) * 0.035 : 0;
        row.set(i, dip, g);
        glows[i].material.opacity = (C.dark ? 0.5 : 0.26) * g;
        glows[i].position.y = 0.32 - dip;
        for (var k = 0; k < EPC; k++) {
          var id = i * EPC + k;
          if (g < 0.04) { elec.hideAt(id); continue; }
          var ph = RM ? (k + 0.5) / EPC : ((t * 0.55 + k / EPC + i * 0.137) % 1);
          var fade = Math.min(1, Math.min(ph, 1 - ph) * 8);
          elec.setAt(id, T.x - 0.215 + ph * 0.43, 0.205 - dip, (k - 1.5) * 0.15, g * fade);
        }
      }
      elec.commit();
      row.commit();
      // readouts follow what is on screen
      for (i = 0; i < N; i++) st.bits[i] = st.glow[i] >= 0.5 ? 1 : 0;
      if (st.mode === 'auto') {
        var Dn = describe(E.next), w = '';
        if (!E.clear || E.tau < 0.3) for (var j = 0; j < WORD.length; j++) if (letterDone(E, Dn, j)) w += WORD[j];
        st.wordShown = w;
      }
      v.render(dt);
      if (!K.skipRender) drawOverlay(E, t);
    }

    function snapshotText() {
      var E = episode(st.now);
      return describe(E.next);
    }

    prewarm(v);
    var api = {
      reset: function () {
        st.mode = 'auto'; st.autoT0 = 0; st.man = null; st.now = 0;
        st.glow = ZERO.slice(); st.bits = ZERO.slice(); st.wordShown = '';
        v.setView({ yaw: v.home.yaw, pitch: v.home.pitch, distance: v.home.distance, target: v.home.target.toArray() });
      },
      frame: frame,
      set: function (key, val) {
        if (key === 'bits') {
          var s = typeof val === 'number' ? String(Math.round(val)) : String(val || '');
          s = s.replace(/\s+/g, '');
          if (/^[01]{1,8}$/.test(s)) s = ('00000000' + s).slice(-8); else return;
          var to = s.split('').map(function (c) { return c === '1' ? 1 : 0; });
          if (st.mode === 'manual' && st.man && st.man.to.join('') === to.join('')) return;
          var prevText = snapshotText();
          st.man = { from: st.glow.slice(), to: to, t0: st.now, prevText: prevText };
          st.mode = 'manual';
        } else if (key === 'auto') {
          if (+val === 1 || val === '1' || val === true) {
            st.mode = 'auto'; st.man = null; st.autoT0 = st.now;
          }
        }
      },
      read: function (key) {
        var b = st.bits, d = describe(b);
        if (key === 'binary') return binStr(b);
        if (key === 'sum') return sumStr(d);
        if (key === 'letter') return d.letter || '—';
        if (key === 'word') {
          if (st.mode === 'manual') return (d.letter && d.letter !== 'boşluk') ? d.letter : '—';
          return st.wordShown || '—';
        }
        return '';
      },
      resize: function () { },
      dispose: function () { v.dispose(); }
    };
    return api;
  });

  /* ================================================================== */
  /* pixel-zoom · S 680×520                                               */
  /* ================================================================== */
  K.register('pixel-zoom', function (el, opts) {
    var THREE = window.THREE;
    opts = opts || {};
    var theme = opts.theme || 'light';
    var C = themeColors(theme);
    var RES = [1920, 1080], SW = 531.4, SH = 298.9;   // 24 inç 16:9, mm
    var PIT = SW / RES[0];                              // piksel aralığı ≈ 0,277 mm
    var SEL = [1296, 400];                              // seçili piksel (alttan sayılır)
    var PX = ((SEL[0] + 0.5) / RES[0] - 0.5) * SW, PY = ((SEL[1] + 0.5) / RES[1] - 0.5) * SH;
    var DEF = [255, 140, 40];

    var smat = screenMaterial({ res: RES, sel: SEL, sub: true, grid: 1 });
    var mon = makeMonitor({ sw: SW, sh: SH, screenMat: smat });
    mon.group.position.set(-PX, -PY, 0);            // the selected pixel sits at the world origin
    var groundY = -PY + mon.groundY;

    var FAR = { yaw: 0.34, pitch: 0.1, distance: 1260, target: [-PX + 8, -PY - 52, -30] };
    var SH_FAR = [-0.07, 0.035], SH_NEAR = [0, 0.02];
    var D1 = 1.0;
    var v = K.stage3d(el, {
      theme: theme, fov: 28, yaw: FAR.yaw, pitch: FAR.pitch, distance: FAR.distance, target: FAR.target,
      size: 420, ground: groundY, near: 1, far: 9000, minDistance: 0.2, maxDistance: 5000, minPitch: -0.4, maxPitch: 0.95
    });
    v.scene.add(mon.group);
    shiftView(v, SH_FAR[0], SH_FAR[1]);

    var RM = K.reducedMotion;
    var ZIN = 7.5, ZOUT = 4.5, HOLD_OUT = 2.5, HOLD_IN = 9.5;
    var CYC = HOLD_OUT + ZIN + HOLD_IN + ZOUT;
    var st = {
      now: 0, auto: true,
      s: 0, zoomTw: null,
      col: DEF.slice(), colTw: null, target: DEF.slice(),
      user: { yaw: 0, pitch: 0, lastYaw: FAR.yaw, lastPitch: FAR.pitch, lastDist: FAR.distance }
    };
    v.orbit.home = function () { st.user.yaw = 0; st.user.pitch = 0; };

    /* auto colour demo while zoomed in: additive mixing */
    var DEMO = [[255, 140, 40], [255, 255, 255], [255, 255, 0], [255, 140, 40]];
    function autoColor(tin) {
      var seg = 2.3, tr = 0.6;
      var i = Math.floor(tin / seg);
      if (i >= DEMO.length - 1) return DEMO[DEMO.length - 1];
      var f = eio((tin - i * seg - (seg - tr)) / tr);
      var a = DEMO[i], b = DEMO[i + 1];
      return [lerp(a[0], b[0], f), lerp(a[1], b[1], f), lerp(a[2], b[2], f)];
    }
    function autoState(t) {
      if (RM) return { s: 1, col: DEF };              // reduced motion: hold the single-pixel view
      var c = t % CYC;
      if (c < HOLD_OUT) return { s: 0, col: DEF };
      c -= HOLD_OUT;
      if (c < ZIN) return { s: eio(c / ZIN), col: DEF };
      c -= ZIN;
      if (c < HOLD_IN) return { s: 1, col: RM ? DEF : autoColor(c) };
      c -= HOLD_IN;
      return { s: 1 - eio(c / ZOUT), col: DEF };
    }

    function camAt(s) {
      var u = K.smoothstep(0, 0.36, s), a = K.smoothstep(0.06, 0.5, s);
      return {
        yaw: lerp(FAR.yaw, 0, a), pitch: lerp(FAR.pitch, 0, a),
        dist: FAR.distance * Math.pow(D1 / FAR.distance, s),
        tx: lerp(FAR.target[0], 0, u), ty: lerp(FAR.target[1], 0, u), tz: lerp(FAR.target[2], 0, u),
        sx: lerp(SH_FAR[0], SH_NEAR[0], u), sy: lerp(SH_FAR[1], SH_NEAR[1], u)
      };
    }

    function stopAuto() {
      if (!st.auto) return;
      st.auto = false;
      st.zoomTw = null;
      st.colTw = null;
    }
    function zoomTo(z) {
      if (RM) { st.s = z; st.zoomTw = null; return; }
      var from = st.s;
      var dur = Math.abs(z - from) * (z > from ? ZIN : ZOUT);
      st.zoomTw = { from: from, to: z, t0: st.now, dur: Math.max(0.3, dur) };
    }
    function colorTo(c) {
      st.colTw = { from: st.col.slice(), to: c.slice(), t0: st.now, dur: 0.45 };
    }

    function applyCamera(dt) {
      var U = st.user, view = v.view;
      // orbit drags since our last write become a user offset that relaxes when idle
      U.yaw += view.yaw - U.lastYaw;
      U.pitch += view.pitch - U.lastPitch;
      if (Math.abs(view.distance - U.lastDist) > 1e-9 && U.lastDist > 0) {
        // mouse wheel: zoom through the scale
        var dz = Math.log(view.distance / U.lastDist) / Math.log(D1 / FAR.distance);
        stopAuto();
        st.zoomTw = null;
        st.s = clamp(st.s + dz, 0, 1);
      }
      if (v.orbit.idle > 4) { var k = Math.exp(-dt * 0.8); U.yaw *= k; U.pitch *= k; }
      var c = camAt(st.s);
      view.yaw = c.yaw + U.yaw;
      view.pitch = clamp(c.pitch + U.pitch, -0.4, 0.95);
      view.distance = c.dist;
      view.target.set(c.tx, c.ty, c.tz);
      U.lastYaw = view.yaw; U.lastPitch = view.pitch; U.lastDist = view.distance;
      shiftView(v, c.sx, c.sy);
      v.camera.near = Math.max(0.02, c.dist * 0.05);
      v.camera.far = c.dist * 4 + 4000;
      v.camera.updateProjectionMatrix();
    }

    /* ---------- overlay ---------- */
    var tmpV = new THREE.Vector3();
    function proj(x, y, z) { tmpV.set(x, y, z); return v.project(tmpV); }
    function chip(ctx, x, y, w, h, alpha) {
      ctx.save();
      ctx.globalAlpha *= alpha;
      ctx.fillStyle = C.dark ? 'rgba(14,18,26,0.88)' : 'rgba(255,255,255,0.93)';
      K.rr(ctx, x, y, w, h, 7);
      ctx.fill();
      ctx.strokeStyle = C.line;
      ctx.lineWidth = 1;
      K.rr(ctx, x + 0.5, y + 0.5, w - 1, h - 1, 7);
      ctx.stroke();
      ctx.restore();
    }
    function bin8(n) { var s = ('00000000' + Math.round(n).toString(2)).slice(-8); return s.slice(0, 4) + ' ' + s.slice(4); }
    function niceLen(pxPerMm) {
      var opts2 = [200, 100, 50, 20, 10, 5, 2, 1, 0.5, 0.2, 0.1];
      for (var i = 0; i < opts2.length; i++) { var L = opts2[i]; if (L * pxPerMm <= 120) return L; }
      return 0.1;
    }
    function lenLabel(L) {
      if (L >= 10) return K.num(L / 10, 0) + ' cm';
      return K.num(L, L < 1 ? 1 : 0) + ' mm';
    }
    function hint(c) {
      var r = c[0], g = c[1], b = c[2];
      if (r > 247 && g > 247 && b > 247) return 'Üçü de en parlak: beyaz görünür';
      if (r < 8 && g < 8 && b < 8) return 'Üçü de kapalı: siyah görünür';
      if (r > 247 && g > 247 && b < 8) return 'Kırmızı + yeşil ışık: sarı görünür';
      if (r > 247 && b > 247 && g < 8) return 'Kırmızı + mavi ışık: mor görünür';
      if (g > 247 && b > 247 && r < 8) return 'Yeşil + mavi ışık: camgöbeği görünür';
      return 'Üç ışığın karışımı tek renk görünür';
    }

    function drawOverlay() {
      var ctx = v.ctx, W = v.w, H = v.h, s = st.s;
      beginOverlay(ctx);
      var c = camAt(s);
      // --- title with stage ---
      var stages = [
        { a: 1 - K.smoothstep(0.22, 0.27, s), t: 'Ekran', d: '1920 × 1080 = 2.073.600 piksel' },
        { a: K.smoothstep(0.28, 0.33, s) * (1 - K.smoothstep(0.7, 0.75, s)), t: 'Pikseller', d: 'Resim, küçük renkli karelerden oluşur' },
        { a: K.smoothstep(0.76, 0.81, s), t: 'Tek piksel', d: 'Üç küçük ışık: kırmızı, yeşil, mavi' }
      ];
      var tw0 = 0;
      for (var i = 0; i < stages.length; i++) {
        if (stages[i].a > 0.01) tw0 = Math.max(tw0, stages[i].a * Math.max(tw(ctx, stages[i].t, 17, 600), tw(ctx, stages[i].d, 13, 400)));
      }
      chip(ctx, 10, 10, Math.max(250, tw0 + 26), 82, 1);   // always drawn: dark text must not sit on the dark monitor bezel
      for (i = 0; i < stages.length; i++) {
        if (stages[i].a <= 0.01) continue;
        txt(ctx, stages[i].t, 22, 34, { size: 17, weight: 600, color: C.ink, alpha: stages[i].a });
        txt(ctx, stages[i].d, 22, 54, { size: 13, color: C.ink2, alpha: stages[i].a });
      }
      // --- scale bar at the target plane ---
      var visH = 2 * c.dist * Math.tan(v.camera.fov * Math.PI / 360);
      var pxmm = H / visH;
      var L = niceLen(pxmm), bl = L * pxmm;
      var sx = 22, sy = 74;
      ctx.fillStyle = C.ink2;
      ctx.fillRect(sx, sy, bl, 2);
      ctx.fillRect(sx, sy - 4, 1.5, 10);
      ctx.fillRect(sx + bl - 1.5, sy - 4, 1.5, 10);
      txt(ctx, lenLabel(L), sx + bl + 8, sy + 5, { size: 12, weight: 500, mono: true, color: C.ink2 });

      // --- selected pixel marker ---
      var p0 = proj(0, 0, 0);
      var half = PIT / 2;
      var pa = proj(-half, half, 0), pb = proj(half, -half, 0);
      var pw = Math.abs(pb.x - pa.x);
      var mA = 1 - K.smoothstep(0.42, 0.5, s);
      if (mA > 0.01 && p0.visible) {
        var r = Math.max(9, pw * 0.7 + 6);
        ctx.save();
        ctx.globalAlpha *= mA;
        ctx.strokeStyle = C.copperFill;
        ctx.lineWidth = 1.6;
        ctx.beginPath(); ctx.arc(p0.x, p0.y, r, 0, TAU); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(p0.x - r * 0.72, p0.y - r * 0.72); ctx.lineTo(p0.x - r - 26, p0.y - r - 26); ctx.stroke();
        ctx.restore();
        txt(ctx, 'seçili piksel', p0.x - r - 30, p0.y - r - 31, { size: 12.5, weight: 600, color: C.copper, align: 'right', alpha: mA });
      }
      var sqA = K.smoothstep(0.44, 0.52, s);
      if (sqA > 0.01) {
        ctx.save();
        ctx.globalAlpha *= sqA;
        ctx.strokeStyle = C.copperFill;
        ctx.lineWidth = lerp(1.6, 2, K.smoothstep(0.85, 1, s));
        var m = lerp(3, 1, K.smoothstep(0.7, 1, s));
        var qx = Math.min(pa.x, pb.x) - m, qy = Math.min(pa.y, pb.y) - m;
        ctx.strokeRect(qx, qy, pw + 2 * m, Math.abs(pb.y - pa.y) + 2 * m);
        ctx.restore();
        var la = K.smoothstep(0.86, 0.94, s);
        var lx = qx + pw + 2 * m + 8, ly = qy - 2;
        var lt1 = 'seçili piksel ≈ 0,28 mm', lt2 = '1 piksel = 3 alt piksel';
        var lw = lerp(tw(ctx, lt1, 12.5, 600), tw(ctx, lt2, 12.5, 600), la) + 16;
        if (lx + lw > W - 8) lx = W - 8 - lw;
        chip(ctx, lx, ly - 4, lw, 24, sqA);
        txt(ctx, lt1, lx + 8, ly + 12, { size: 12.5, weight: 600, color: C.copper, alpha: sqA * (1 - la) });
        txt(ctx, lt2, lx + 8, ly + 12, { size: 12.5, weight: 600, color: C.copper, alpha: sqA * la });
      }
      // --- subpixel chips at deep zoom ---
      var spA = K.smoothstep(0.9, 0.98, s);
      if (spA > 0.01) {
        var names = ['R', 'G', 'B'];
        var cols = ['#C8322A', '#2E9B45', '#2F5BD8'];
        for (var k = 0; k < 3; k++) {
          var cx = ((k + 0.5) / 3 - 0.5) * PIT;
          var pp = proj(cx, -0.36 * PIT, 0);
          var val = Math.round(st.col[k]);
          var cw = 84, chh = 44;
          var x = pp.x - cw / 2, y = pp.y - chh / 2;
          chip(ctx, x, y, cw, chh, spA);
          ctx.save(); ctx.globalAlpha *= spA; ctx.fillStyle = cols[k]; K.rr(ctx, x + 10, y + 10, 9, 9, 2); ctx.fill(); ctx.restore();
          txt(ctx, names[k] + ' ' + val, x + 25, y + 19, { size: 14, weight: 600, mono: true, color: C.ink, alpha: spA });
          txt(ctx, bin8(val), x + 10, y + 36, { size: 11, weight: 500, mono: true, color: C.muted, alpha: spA });
        }
      }
      // --- selected-pixel card ---
      var cw2 = 318, ch2 = 92, cx2 = 16, cy2 = H - ch2 - 16;
      chip(ctx, cx2, cy2, cw2, ch2, 1);
      tag(ctx, 'SEÇİLİ PİKSEL', cx2 + 14, cy2 + 22, C);
      var col = st.col;
      ctx.fillStyle = 'rgb(' + Math.round(col[0]) + ',' + Math.round(col[1]) + ',' + Math.round(col[2]) + ')';
      K.rr(ctx, cx2 + 14, cy2 + 32, 46, 46, 6);
      ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.12)';
      ctx.lineWidth = 1;
      K.rr(ctx, cx2 + 14.5, cy2 + 32.5, 45, 45, 6);
      ctx.stroke();
      txt(ctx, 'R ' + Math.round(col[0]) + ' · G ' + Math.round(col[1]) + ' · B ' + Math.round(col[2]), cx2 + 72, cy2 + 47, { size: 14, weight: 600, mono: true, color: C.ink });
      txt(ctx, hint(col), cx2 + 72, cy2 + 65, { size: 12.5, color: C.ink2 });
      txt(ctx, '256 × 256 × 256 = 16.777.216 renk', cx2 + 72, cy2 + 82, { size: 11.5, weight: 500, mono: true, color: C.muted });
      // --- note ---
      var nt = '24 inç ekran · 1 piksel ≈ 0,28 mm';
      var nw = tw(ctx, nt, 11.5, 400) + 16;
      chip(ctx, W - 16 - nw, H - 16 - 24, nw, 24, 1);
      txt(ctx, nt, W - 24, H - 24, { size: 11.5, color: C.muted, align: 'right' });
    }

    function frame(t, dt) {
      st.now = t;
      if (st.auto) {
        var A = autoState(t);
        st.s = A.s;
        st.col = A.col.slice();
      } else {
        if (st.zoomTw) {
          var z = st.zoomTw, f = eio((t - z.t0) / z.dur);
          st.s = lerp(z.from, z.to, f);
          if (f >= 1) st.zoomTw = null;
        }
        if (st.colTw) {
          var ct = st.colTw, g = eio((t - ct.t0) / ct.dur);
          for (var i = 0; i < 3; i++) st.col[i] = lerp(ct.from[i], ct.to[i], g);
          if (g >= 1) st.colTw = null;
        }
      }
      smat.uniforms.uSelCol.value.set(st.col[0] / 255, st.col[1] / 255, st.col[2] / 255);
      applyCamera(dt);
      v.render(dt);
      if (!K.skipRender) drawOverlay();
    }

    prewarm(v);
    var api = {
      reset: function () {
        st.auto = true; st.s = 0; st.zoomTw = null; st.colTw = null;
        st.col = DEF.slice(); st.target = DEF.slice(); st.now = 0;
        st.user.yaw = 0; st.user.pitch = 0;
        v.setView({ yaw: FAR.yaw, pitch: FAR.pitch, distance: FAR.distance, target: FAR.target });
        st.user.lastYaw = FAR.yaw; st.user.lastPitch = FAR.pitch; st.user.lastDist = FAR.distance;
      },
      frame: frame,
      set: function (key, val) {
        if (key === 'r' || key === 'g' || key === 'b') {
          var n = clamp(Math.round(+val), 0, 255);
          if (isNaN(n)) return;
          var wasAuto = st.auto;
          if (wasAuto) { stopAuto(); st.target = st.col.slice(); zoomTo(1); }
          st.target[key === 'r' ? 0 : key === 'g' ? 1 : 2] = n;
          colorTo(st.target);
        } else if (key === 'zoom') {
          stopAuto();
          if (!st.colTw) st.target = st.col.slice();
          zoomTo(+val >= 0.5 ? 1 : 0);
        }
      },
      read: function (key) {
        var c = st.col;
        if (key === 'r') return String(Math.round(c[0]));
        if (key === 'g') return String(Math.round(c[1]));
        if (key === 'b') return String(Math.round(c[2]));
        if (key === 'rgb') return 'R ' + Math.round(c[0]) + ' · G ' + Math.round(c[1]) + ' · B ' + Math.round(c[2]);
        if (key === 'formula') return '256 × 256 × 256 = 16.777.216 renk';
        return '';
      },
      resize: function () { },
      dispose: function () { v.dispose(); }
    };
    return api;
  });

  /* ================================================================== */
  /* resolution · W 1120×380                                              */
  /* ================================================================== */
  var BALL_FS = [
    'uniform vec2 uBall;',
    'uniform float uOn;',
    'varying vec2 vUv;',
    'const float A = 1.7777778;',
    'vec3 toLin(vec3 c) { return mix(c / 12.92, pow((c + 0.055) / 1.055, vec3(2.4)), step(0.04045, c)); }',
    'void main() {',
    '  vec2 p = vUv;',
    '  float fy = 0.16;',
    '  vec3 col = mix(vec3(0.86, 0.90, 0.95), vec3(0.60, 0.71, 0.85), p.y);',
    '  float ga = fwidth(p.y);',
    '  float g = 1.0 - smoothstep(fy - ga, fy + ga, p.y);',
    '  col = mix(col, mix(vec3(0.66, 0.62, 0.57), vec3(0.76, 0.72, 0.66), p.y / fy), g);',
    '  float bh = max(0.0, uBall.y - fy - 0.075);',
    '  vec2 sd = (p - vec2(uBall.x, fy - 0.01)) * vec2(A * 1.3, 5.0);',
    '  float sh = exp(-dot(sd, sd) / (0.012 + bh * 0.05)) * 0.45 * (1.0 - smoothstep(0.0, 0.7, bh));',
    '  col *= 1.0 - sh * g;',
    '  vec2 d = (p - uBall) * vec2(A, 1.0);',
    '  float r = 0.075;',
    '  float dist = length(d);',
    '  float aa = fwidth(dist) * 1.2;',
    '  float inside = 1.0 - smoothstep(r - aa, r + aa, dist);',
    '  vec2 n2 = d / r;',
    '  vec3 n = vec3(n2, sqrt(max(0.0, 1.0 - dot(n2, n2))));',
    '  float lit = clamp(0.5 + 0.5 * dot(n, normalize(vec3(-0.45, 0.55, 0.7))), 0.0, 1.0);',
    '  vec3 ball = mix(vec3(0.42, 0.16, 0.06), vec3(0.94, 0.58, 0.36), lit);',
    '  ball += vec3(0.25) * pow(max(0.0, dot(n, normalize(vec3(-0.35, 0.45, 0.82)))), 24.0);',
    '  col = mix(col, ball, inside);',
    '  col = mix(vec3(0.045, 0.05, 0.058), col, uOn);',
    '  gl_FragColor = vec4(toLin(clamp(col, 0.0, 1.0)), 1.0);',
    '  #include <encodings_fragment>',
    '}'
  ].join('\n');

  K.register('resolution', function (el, opts) {
    var THREE = window.THREE;
    opts = opts || {};
    var theme = opts.theme || 'light';
    var C = themeColors(theme);
    var ORDER = ['16x9', '160x90', '1920x1080', '3840x2160'];
    var RES = { '16x9': [16, 9], '160x90': [160, 90], '1920x1080': [1920, 1080], '3840x2160': [3840, 2160] };
    var HZS = [10, 30, 60];
    var SWL = 531.4, SHL = 298.9;           // left: 24 inç
    var SWR = 365, SHR = 205.3;             // right: 16,5 inç

    var v = K.stage3d(el, {
      theme: theme, fov: 24, yaw: 0, pitch: 0.07, distance: 1526, target: [0, 0, 0], near: 300, far: 6000,
      size: 700, minYaw: -0.22, maxYaw: 0.22, minPitch: -0.02, maxPitch: 0.45, minDistance: 1250, maxDistance: 1900
    });
    if (v.lights) {
      var kc = v.lights.key.shadow.camera;
      kc.left = -1100; kc.right = 1100; kc.top = 900; kc.bottom = -900; kc.near = 10; kc.far = 4000;
      kc.updateProjectionMatrix();
      v.lights.key.position.set(200, 1700, 300);
    }
    function catcher(w, d, x, y, z) {
      var m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), new THREE.ShadowMaterial({ opacity: C.dark ? 0.35 : 0.09 }));
      m.rotation.x = -Math.PI / 2;
      m.position.set(x, y, z);
      m.receiveShadow = true;
      v.scene.add(m);
    }

    // left monitor: the landscape at a chosen resolution
    var matA = screenMaterial({ res: RES['16x9'], grid: 1 });
    var monA = makeMonitor({ sw: SWL, sh: SHL, screenMat: matA, standGap: 92 });
    var LX = -560, LY = 68;
    monA.group.position.set(LX, LY, 0);
    v.scene.add(monA.group);
    catcher(1000, 700, LX, LY + monA.groundY, -60);

    // magnifier lens: the same shader, a tiny window of the screen
    var LOUPE_R = 94, MAG = 48;
    var srcU = 0.6833, srcV = 0.3423;           // lower-left edge of the sun disc
    var srcR = LOUPE_R / MAG;                   // mm on the screen
    var matL = screenMaterial({ res: RES['16x9'], grid: 1 });
    matL.uniforms.uWin.value.set(srcU - srcR / SWL, srcV - srcR / SHL, 2 * srcR / SWL, 2 * srcR / SHL);
    var loupe = new THREE.Group();
    var disc = new THREE.Mesh(new THREE.CircleGeometry(LOUPE_R, 72), matL);
    loupe.add(disc);
    var ring = mesh(new THREE.TorusGeometry(LOUPE_R + 2.5, 4.2, 18, 96), K.mat.steel({ color: 0x9DA3AB, roughness: 0.26 }), false, false);
    loupe.add(ring);
    var LPX = -154, LPY = 89, LPZ = 120;
    loupe.position.set(LPX, LPY, LPZ);
    v.scene.add(loupe);
    var srcWorld = new THREE.Vector3(LX + (srcU - 0.5) * SWL, LY + (srcV - 0.5) * SHL, 0.5);

    // right monitor: a ball redrawn at 10 / 30 / 60 Hz
    var matB = new THREE.ShaderMaterial({
      uniforms: { uBall: { value: new THREE.Vector2(0.2, 0.4) }, uOn: { value: 1 } },
      vertexShader: SCREEN_VS, fragmentShader: BALL_FS, toneMapped: false, extensions: { derivatives: true }
    });
    var monB = makeMonitor({ sw: SWR, sh: SHR, bezel: 5.5, chin: 12, screenMat: matB, standGap: 50 });
    var RX = 540, RY = 100;
    monB.group.position.set(RX, RY, 0);
    v.scene.add(monB.group);
    catcher(700, 500, RX, RY + monB.groundY, -40);

    var RM = K.reducedMotion;
    var STEP = 4.2, WIPE = 0.9;
    var st = { now: 0, auto: true, cur: '16x9', wipe: null, hz: 60 };

    function resAt(t) {
      // auto: res index from time, wipe at each boundary
      var k = Math.floor(t / STEP);
      var cur = ORDER[k % 4], prev = ORDER[(k + 3) % 4];
      var w = k > 0 && !RM ? (t - k * STEP) / WIPE : 1;
      return { cur: cur, prev: prev, w: w };
    }
    function startWipe(to) {
      if (to === st.cur && !st.wipe) return;
      var from = st.wipe ? (st.wipe.p >= 0.5 ? st.wipe.to : st.wipe.from) : st.cur;
      st.wipe = { from: from, to: to, t0: st.now, p: 0 };
      st.cur = to;
    }

    /* ball motion: across the screen in 1 s, back in 1 s; two bounces per second */
    function ballAt(t) {
      var c = t % 2, f = c < 1 ? c : 2 - c;
      var u = (t * 2) % 1;
      return [0.12 + 0.76 * f, 0.16 + 0.075 + 0.56 * 4 * u * (1 - u)];
    }

    var tmpV = new THREE.Vector3();
    function proj(x, y, z) { tmpV.set(x, y, z); return v.project(tmpV); }
    function fmtRes(key) { var r = RES[key]; return r[0] + ' × ' + r[1]; }
    function count(key) { var r = RES[key]; return K.num(r[0] * r[1], 0); }

    function drawOverlay(t) {
      var ctx = v.ctx, W = v.w, H = v.h;
      beginOverlay(ctx);
      // ----- left: resolution -----
      var key = st.cur;
      tag(ctx, 'ÇÖZÜNÜRLÜK', 40, 28, C);
      var rel = key === '3840x2160' ? '4K: Full HD’nin 2 × 2 = 4 katı piksel, pikseller yarı boyda'
        : key === '1920x1080' ? 'Full HD: her satırda 1920, her sütunda 1080 piksel'
        : key === '160x90' ? 'Pikseller hâlâ tek tek görülüyor: kenarlar basamaklı'
        : 'Yalnızca 144 piksel: resim tanınmıyor';
      txt(ctx, rel, 40, 48, { size: 13, color: C.ink2 });
      // loupe connector lines
      var ps = proj(srcWorld.x, srcWorld.y, srcWorld.z);
      var pc = proj(LPX, LPY, LPZ), pe = proj(LPX + LOUPE_R + 2.5, LPY, LPZ);
      var Rl = Math.abs(pe.x - pc.x) + 3, rs = 5;
      var dx = pc.x - ps.x, dy = pc.y - ps.y, dl = Math.sqrt(dx * dx + dy * dy) || 1;
      var a0 = Math.atan2(dy, dx), b0 = Math.asin(clamp((Rl - rs) / dl, -1, 1));
      ctx.save();
      ctx.strokeStyle = C.dark ? 'rgba(154,163,178,.7)' : 'rgba(89,94,105,.55)';
      ctx.lineWidth = 1;
      for (var sgn = -1; sgn <= 1; sgn += 2) {
        var ang = a0 + sgn * (Math.PI / 2 + b0);
        ctx.beginPath();
        ctx.moveTo(ps.x + Math.cos(ang) * rs, ps.y + Math.sin(ang) * rs);
        ctx.lineTo(pc.x + Math.cos(ang) * Rl, pc.y + Math.sin(ang) * Rl);
        ctx.stroke();
      }
      ctx.beginPath(); ctx.arc(ps.x, ps.y, rs, 0, TAU); ctx.stroke();
      ctx.restore();
      txt(ctx, 'büyüteç · ' + MAG + ' kat', pc.x, pc.y + Rl + 18, { size: 12, weight: 500, mono: true, color: C.muted, align: 'center' });
      // resolution chips: every chip shows its multiplication
      var x0 = 40, y0 = 316, cw = 138, chh = 50, gap = 8;
      for (var i = 0; i < 4; i++) {
        var k = ORDER[i], on = k === key;
        var x = x0 + i * (cw + gap);
        ctx.fillStyle = on ? C.copperSoft : C.card;
        K.rr(ctx, x, y0, cw, chh, 8);
        ctx.fill();
        ctx.strokeStyle = on ? C.copperFill : C.line;
        ctx.lineWidth = on ? 1.5 : 1;
        K.rr(ctx, x + 0.5, y0 + 0.5, cw - 1, chh - 1, 8);
        ctx.stroke();
        txt(ctx, fmtRes(k), x + 12, y0 + 21, { size: 13.5, weight: 600, mono: true, color: on ? C.ink : C.ink2 });
        txt(ctx, '= ' + count(k) + ' piksel', x + 12, y0 + 40, { size: 12, color: on ? C.copper : C.muted });
      }

      // ----- right: refresh rate -----
      var RX0 = 652;
      tag(ctx, 'YENİLEME HIZI', RX0, 28, C);
      txt(ctx, st.hz + ' Hz: saniyede ' + st.hz + ' yeni görüntü', RX0, 48, { size: 13, color: C.ink2 });
      // filmstrips
      var sx0 = 716, sx1 = 1092, sw = sx1 - sx0, sh = 25, sy0 = 262;
      var tau = RM ? 0.999 : t % 1;
      for (var r = 0; r < 3; r++) {
        var hz = HZS[r], act = hz === st.hz;
        var y = sy0 + r * (sh + 7);
        var al = act ? 1 : 0.55;
        txt(ctx, hz + ' Hz', RX0, y + 18, { size: 13, weight: 600, mono: true, color: act ? C.ink : C.muted });
        ctx.save();
        ctx.globalAlpha *= al;
        ctx.fillStyle = '#23262C';
        K.rr(ctx, sx0, y, sw, sh, 3);
        ctx.fill();
        // sprocket holes
        ctx.fillStyle = 'rgba(245,245,241,0.55)';
        for (var hx = sx0 + 5; hx < sx1 - 4; hx += 9) {
          ctx.fillRect(hx, y + 2, 4, 2.5);
          ctx.fillRect(hx, y + sh - 4.5, 4, 2.5);
        }
        var cwf = sw / hz;
        var nowK = Math.floor(tau * hz);
        // frame borders
        ctx.fillStyle = 'rgba(245,245,241,0.22)';
        for (var f = 1; f < hz; f++) ctx.fillRect(sx0 + f * cwf - 0.5, y + 6, 1, sh - 12);
        // ball imprints (height of the ball in each frame)
        for (f = 0; f < hz; f++) {
          var tf = Math.floor(t) + f / hz;
          var b = ballAt(tf);
          var hh = (b[1] - 0.235) / 0.56;
          var cx = sx0 + (f + 0.5) * cwf, cy = y + sh - 8 - hh * (sh - 16);
          var fresh = f <= nowK;
          ctx.fillStyle = fresh ? '#E39A6C' : 'rgba(227,154,108,0.35)';
          ctx.beginPath(); ctx.arc(cx, cy, 3.3, 0, TAU); ctx.fill();
        }
        // current frame
        if (act) {
          ctx.strokeStyle = '#F2C46B';
          ctx.lineWidth = 1.5;
          ctx.strokeRect(sx0 + nowK * cwf + 0.75, y + 0.75, Math.max(2, cwf - 1.5), sh - 1.5);
        }
        ctx.restore();
      }
      var yb = sy0 + 3 * (sh + 7) + 4;
      txt(ctx, '0 s', sx0, yb + 9, { size: 11, weight: 500, mono: true, color: C.muted });
      txt(ctx, '1 saniyedeki kareler · nokta: topun o karedeki yeri', (sx0 + sx1) / 2, yb + 9, { size: 11, color: C.muted, align: 'center' });
      txt(ctx, '1 s', sx1, yb + 9, { size: 11, weight: 500, mono: true, color: C.muted, align: 'right' });
      var ms = K.num(1000 / st.hz, st.hz === 10 ? 0 : 1);
      txt(ctx, 'Bir görüntü 1.000 ms ÷ ' + st.hz + (st.hz === 10 ? ' = ' : ' ≈ ') + ms + ' ms ekranda kalır', RX0, 248, { size: 12.5, color: C.ink2 });
    }

    function frame(t, dt) {
      st.now = t;
      var cur, from = null, p = 1;
      if (st.auto) {
        var A = resAt(t);
        st.cur = A.cur;
        if (A.w < 1) { from = A.prev; p = A.w; }
      } else if (st.wipe) {
        st.wipe.p = clamp((t - st.wipe.t0) / WIPE, 0, 1);
        if (st.wipe.p < 1) { from = st.wipe.from; p = st.wipe.p; } else st.wipe = null;
      }
      cur = st.cur;
      var u = [matA.uniforms, matL.uniforms];
      for (var i = 0; i < 2; i++) {
        var U = u[i];
        if (from) {
          U.uRes.value.set(RES[from][0], RES[from][1]);
          U.uRes2.value.set(RES[cur][0], RES[cur][1]);
          U.uWipe.value = eio(p);
        } else {
          U.uRes.value.set(RES[cur][0], RES[cur][1]);
          U.uRes2.value.set(RES[cur][0], RES[cur][1]);
          U.uWipe.value = -1;
        }
      }
      // ball: sample and hold at the chosen refresh rate
      var tf = RM ? 0.3 : Math.floor(t * st.hz) / st.hz;
      var b = ballAt(tf);
      matB.uniforms.uBall.value.set(b[0], b[1]);
      loupe.quaternion.copy(v.camera.quaternion);
      v.render(dt);
      if (!K.skipRender) drawOverlay(t);
    }

    function normRes(val) {
      var s = String(val).toLowerCase().replace(/\s+/g, '').replace('×', 'x');
      return RES[s] ? s : null;
    }

    prewarm(v);
    return {
      reset: function () {
        st.auto = true; st.cur = '16x9'; st.wipe = null; st.hz = 60; st.now = 0;
        v.setView({ yaw: v.home.yaw, pitch: v.home.pitch, distance: v.home.distance, target: v.home.target.toArray() });
      },
      frame: frame,
      set: function (key, val) {
        if (key === 'res') {
          var r = normRes(val);
          if (!r) return;
          st.auto = false;
          startWipe(r);
        } else if (key === 'hz') {
          var n = +val, best = 60;
          HZS.forEach(function (h) { if (Math.abs(h - n) < Math.abs(best - n)) best = h; });
          st.auto = false;
          st.hz = best;
        }
      },
      read: function (key) {
        if (key === 'pixels') return fmtRes(st.cur) + ' = ' + count(st.cur) + ' piksel';
        if (key === 'hz') return st.hz + ' Hz: saniyede ' + st.hz + ' yeni görüntü';
        return '';
      },
      resize: function () { },
      dispose: function () { v.dispose(); }
    };
  });

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
      theme: theme, fov: 22, yaw: 0, pitch: 0.62, distance: 780, target: [6, 0, 6], near: 100, far: 4000,
      size: 420, ground: GY, minYaw: -0.35, maxYaw: 0.35, minPitch: 0.3, maxPitch: 1.05, minDistance: 600, maxDistance: 1000
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
    var cpuTop = W2(ihs, 0, 2, 0);
    v.label('güç kaynağı<br><span style="font-family:' + K.fonts.mono.replace(/"/g, '&quot;') + ';font-weight:500;font-size:12px;color:' + C.ink2 + '">230 V AC → 12 / 5 / 3,3 V DC</span>',
      { at: W2(psu, -30, -PSU.h / 2 + 8, PSU.d / 2), cls: 'name', dx: -24, dy: 40, align: 'left', valign: 'top', line: true, html: true });
    v.label('işlemci', { at: cpuTop, cls: 'name', dx: 0, dy: -46, align: 'center', line: true });
    v.label('ekran', { at: W2(mon.group, 0, MSH / 2 + 4, 0), cls: 'name', dx: 0, dy: -30, align: 'center', line: true });
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
      var sx = clamp(pS.x - 100, 280, 470), rx = clamp(pR.x - 40, 610, 760);
      leader(ctx, sx + IW / 2, 10 + IH, pS);
      leader(ctx, rx + IW / 2, 10 + IH, pR);
      drawSsdInset(ctx, sx, 10, P);
      drawRamInset(ctx, rx, 10, P);
      tag(ctx, 'ÖLÇEKLİ DEĞİL · BASİTLEŞTİRİLMİŞ MODEL', 1106, 370, C, { align: 'right' });
      // legend for the two kinds of dots
      ctx.fillStyle = '#F2C46B'; ctx.beginPath(); ctx.arc(26, 365, 4, 0, TAU); ctx.fill();
      txt(ctx, 'enerji', 35, 369, { size: 12, color: C.ink2 });
      ctx.fillStyle = C.dark ? K.palette.blueLight : '#2848C8'; ctx.beginPath(); ctx.arc(86, 365, 4, 0, TAU); ctx.fill();
      txt(ctx, 'veri (elektrik sinyali)', 95, 369, { size: 12, color: C.ink2 });
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
        if (key === 'state') return st.text || stateText(phase(st.now));
        return '';
      },
      resize: function () { },
      dispose: function () { v.dispose(); }
    };
  });

  /* ================================================================== */
  /* data-sizes · W 1120×380                                              */
  /* ================================================================== */
  var PAGE_TEXT = 'Bilgisayar her şeyi bitlerle saklar. Bir bit, küçük bir anahtarın durumudur: akım geçiyorsa 1, geçmiyorsa 0. ' +
    'Sekiz bit bir bayt eder ve bir bayt tek bir harfi tutabilir. Bu sayfadaki yazı 800 harfe yakındır; yani yaklaşık bir kilobayttır. ' +
    'Bir kitabın bütün yazısı yaklaşık bir megabayt tutar. Telefonla çekilen bir fotoğraf birkaç megabayt, bir film ise birkaç gigabayt yer kaplar. ' +
    'Bir terabayt, koca bir kütüphanedeki kitapların yazısını taşıyabilir. Ekrandaki her piksel üç sayıyla, kırmızı, yeşil ve mavi parlaklığıyla tanımlanır. ' +
    'Bir şarkı, saniyede on binlerce kez ölçülen ses basıncını gösteren sayılardan oluşur. Sayılar bitlere, bitler elektriğe dönüşür. ' +
    'Bütün bu bilgi, milyarlarca küçük anahtarın açık ya da kapalı olmasıyla saklanır; elektrik bu anahtarlara yön verir.';

  K.register('data-sizes', function (el, opts) {
    var THREE = window.THREE;
    opts = opts || {};
    var theme = opts.theme || 'light';
    var C = themeColors(theme);
    var RM = K.reducedMotion;
    var LOG8 = Math.log(8) / Math.LN10;

    /* steps: height on a logarithmic scale (× 1.000 → same rise; bit → bayt is × 8) */
    var STEPS = [
      { name: '1 bit', short: '1 bit', note: 'bir anahtar: 0 ya da 1', head: '1 bit', sub: 'bir anahtar: akım var (1) ya da yok (0)', log: 0, top: 0.42 },
      { name: '1 bayt = 8 bit', short: '1 bayt', note: 'bir harf: A = 0100 0001', head: '1 bayt = 8 bit', sub: '8 anahtar: bir harf', log: LOG8, top: 0.95 },
      { name: '1 KB = 1.000 bayt', short: '1 KB', note: '≈ 1.000 harf: yarım sayfa yazı', head: '1 KB = 1.000 bayt', sub: '1.000 × 8 = 8.000 bit', log: 3 + LOG8, top: 2.12 },
      { name: '1 MB = 1.000 KB', short: '1 MB', note: '≈ 1 milyon harf: bir kitap', head: '1 MB = 1.000 KB', sub: '= 1.000.000 bayt (bir milyon)', log: 6 + LOG8, top: 2.1 },
      { name: '1 GB = 1.000 MB', short: '1 GB', note: '≈ 15–30 dakikalık HD film', head: '1 GB = 1.000 MB', sub: '= 1.000.000.000 bayt (bir milyar)', log: 9 + LOG8, top: 1.98 },
      { name: '1 TB = 1.000 GB', short: '1 TB', note: '≈ 1 milyon kitap: bir kütüphane', head: '1 TB = 1.000 GB', sub: '= 1.000.000.000.000 bayt (bir trilyon)', log: 12 + LOG8, top: 2.3 }
    ];
    var SW = 2.5, SD = 2.3, H0 = 0.5, KH = 0.26;
    STEPS.forEach(function (s, i) { s.x = i * SW; s.h = H0 + s.log * KH; });

    var v = K.stage3d(el, {
      theme: theme, fov: 24, yaw: -0.34, pitch: 0.2, distance: 7, target: [0, 1.2, 0.3], near: 0.2, far: 200,
      size: 9, ground: 0, minYaw: -0.9, maxYaw: 0.5, minPitch: 0.02, maxPitch: 0.9, minDistance: 3.5, maxDistance: 30
    });
    if (v.lights) {
      var kc = v.lights.key.shadow.camera;
      kc.left = -12; kc.right = 12; kc.top = 12; kc.bottom = -12; kc.far = 60;
      kc.updateProjectionMatrix();
      v.lights.key.position.set(13, 15, 12);
      v.lights.key.target.position.set(6.5, 0, 0);
      v.scene.add(v.lights.key.target);
    }
    var stoneMat = M(0xDDD9D0, 0.86, 0, { envMapIntensity: 0.65 });
    var inlayMat = K.mat.copper({ roughness: 0.35 });
    STEPS.forEach(function (s) {
      var b = mesh(rbox(SW - 0.03, s.h, SD, 0.05, 3), stoneMat, true, true);
      b.position.set(s.x, s.h / 2, 0);
      v.scene.add(b);
      var inlay = mesh(new THREE.BoxGeometry(SW - 0.2, 0.025, 0.025), inlayMat, false, true);
      inlay.position.set(s.x, s.h - 0.06, SD / 2 + 0.004);
      v.scene.add(inlay);
    });

    /* 1 · bit: one switch, conducting */
    var kit = makeTileKit();
    var chOn = M(0x1C2026, 0.55, 0.0, { emissive: 0xD6501A, emissiveIntensity: 0, envMapIntensity: 0.35 });
    var chOff = chOn.clone();
    function shareChannel(T, on) {
      T.setOn(on);
      var shared = on ? chOn : chOff;
      shared.color.copy(T.chMat.color); shared.emissiveIntensity = T.chMat.emissiveIntensity;
      T.group.traverse(function (o) { if (o.material === T.chMat) o.material = shared; });
    }
    var t1 = makeTile(kit);
    t1.group.scale.setScalar(1.05);
    t1.group.position.set(STEPS[0].x, STEPS[0].h + 0.13 * 1.05, 0.15);
    shareChannel(t1, 1);
    v.scene.add(t1.group);

    /* 2 · byte: eight switches spelling A = 0100 0001 */
    var A_BITS = bitsOf(65);
    for (var i = 0; i < 8; i++) {
      var tt = makeTile(kit);
      tt.group.scale.setScalar(0.26);
      tt.group.position.set(STEPS[1].x + (i - 3.5) * 0.285, STEPS[1].h + 0.13 * 0.26, 0.35);
      shareChannel(tt, A_BITS[i]);
      v.scene.add(tt.group);
    }

    /* 3 · KB: a sheet with about 1.000 characters (half a page) */
    var pageTex = K.textTexture(1024, 1448, function (ctx, w, h) {
      ctx.fillStyle = '#FBFAF6'; ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#2B2F36';
      ctx.font = '400 30px ' + K.fonts.sans;
      var words = PAGE_TEXT.split(' '), line = '', y = 120, lh = 44, x0 = 90, maxW = w - 180;
      for (var k = 0; k < words.length; k++) {
        var test = line ? line + ' ' + words[k] : words[k];
        if (ctx.measureText(test).width > maxW && line) { ctx.fillText(line, x0, y); y += lh; line = words[k]; }
        else line = test;
      }
      if (line) ctx.fillText(line, x0, y);
      ctx.fillStyle = '#A64B22';
      ctx.font = '500 26px ' + K.fonts.mono;
      ctx.fillText('≈ ' + K.num(PAGE_TEXT.length, 0) + ' harf ≈ 1 KB', x0, y + 74);
    });
    var page = new THREE.Group();
    var paperSide = M(0xF4F3EE, 0.9, 0);
    page.add(mesh(new THREE.BoxGeometry(1.48, 2.1, 0.012), [paperSide, paperSide, paperSide, paperSide, M(0xffffff, 0.86, 0, { map: pageTex }), paperSide], true, true));
    var easel = mesh(rbox(0.06, 1.7, 0.06, 0.02, 1), M(0x8A8F99, 0.4, 0.6), true, true);
    easel.position.set(0, -0.2, -0.32);
    easel.rotation.x = 0.36;
    page.add(easel);
    page.rotation.x = -0.3;
    page.position.set(STEPS[2].x, STEPS[2].h + 1.02, 0.25);
    v.scene.add(page);

    /* 4 · MB: a thick hardcover book */
    var book = new THREE.Group();
    var coverMat = M(0x253461, 0.62, 0.05);
    var coverTex = K.textTexture(512, 728, function (ctx, w, h) {
      ctx.fillStyle = '#253461'; ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#C8693A'; ctx.fillRect(70, 150, w - 140, 6); ctx.fillRect(70, h - 156, w - 140, 6);
      ctx.fillStyle = '#E9E2D6';
      ctx.textAlign = 'center';
      ctx.font = '600 60px ' + K.fonts.sans;
      ctx.fillText('1 milyon', w / 2, h / 2 - 8);
      ctx.font = '400 42px ' + K.fonts.sans;
      ctx.fillText('harf', w / 2, h / 2 + 52);
    });
    var bw = 1.4, bh = 2.0, bt = 0.42;
    var frontC = mesh(new THREE.BoxGeometry(bw, bh, 0.035), [coverMat, coverMat, coverMat, coverMat, M(0xffffff, 0.6, 0.05, { map: coverTex }), coverMat], true, true);
    frontC.position.z = bt / 2;
    book.add(frontC);
    var backC = mesh(new THREE.BoxGeometry(bw, bh, 0.035), coverMat, true, true);
    backC.position.z = -bt / 2;
    book.add(backC);
    var spine = mesh(new THREE.CylinderGeometry(bt / 2 + 0.017, bt / 2 + 0.017, bh, 24, 1, false, Math.PI, Math.PI), coverMat, true, true);
    spine.position.x = -bw / 2;
    book.add(spine);
    var leaves = mesh(rbox(bw - 0.06, bh - 0.06, bt - 0.02, 0.01, 1), M(0xEFE8D8, 0.85, 0), true, true);
    leaves.position.x = 0.02;
    book.add(leaves);
    book.rotation.y = 0.34;
    book.position.set(STEPS[3].x + 0.05, STEPS[3].h + bh / 2, 0.2);
    v.scene.add(book);

    /* 5 · GB: a film reel with a strip of frames */
    var reel = new THREE.Group();
    var flange = new THREE.Shape();
    flange.absarc(0, 0, 0.9, 0, TAU, false);
    for (var hc = 0; hc < 5; hc++) {
      var hp = new THREE.Path();
      var ha = hc * TAU / 5 + 0.3;
      hp.absarc(Math.cos(ha) * 0.52, Math.sin(ha) * 0.52, 0.19, 0, TAU, true);
      flange.holes.push(hp);
    }
    var flGeo = new THREE.ExtrudeGeometry(flange, { depth: 0.03, bevelEnabled: true, bevelThickness: 0.012, bevelSize: 0.012, bevelSegments: 2, curveSegments: 40 });
    var flMat = K.mat.aluminium({ color: 0xC7CBD1, roughness: 0.3 });
    var fl1 = mesh(flGeo, flMat, true, true); fl1.position.z = 0.17; reel.add(fl1);
    var fl2 = mesh(flGeo, flMat, true, true); fl2.position.z = -0.2; reel.add(fl2);
    var wound = mesh(new THREE.CylinderGeometry(0.72, 0.72, 0.32, 64), M(0x2A2420, 0.45, 0.1), true, true);
    wound.rotation.x = Math.PI / 2;
    reel.add(wound);
    var hubM = mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.46, 24), K.mat.steel({ roughness: 0.3 }), true, true);
    hubM.rotation.x = Math.PI / 2;
    reel.add(hubM);
    var filmTex = K.textTexture(1024, 96, function (ctx, w, h) {
      ctx.fillStyle = '#2A2420'; ctx.fillRect(0, 0, w, h);
      for (var f = 0; f < 12; f++) {
        ctx.fillStyle = 'rgba(214,170,120,0.55)';
        ctx.fillRect(10 + f * 85, 20, 72, 56);
        ctx.fillStyle = '#E9E2D6';
        for (var s2 = 0; s2 < 4; s2++) { ctx.fillRect(14 + f * 85 + s2 * 20, 5, 9, 8); ctx.fillRect(14 + f * 85 + s2 * 20, 83, 9, 8); }
      }
    });
    var strip = mesh(new THREE.PlaneGeometry(1.5, 0.15), M(0xffffff, 0.45, 0, { map: filmTex, side: THREE.DoubleSide }), true, true);
    strip.rotation.x = -Math.PI / 2;
    strip.position.set(0.82, -0.875, 0.3);
    reel.add(strip);
    reel.rotation.y = -0.22;
    reel.position.set(STEPS[4].x - 0.2, STEPS[4].h + 0.92, 0.05);
    v.scene.add(reel);

    /* 6 · TB: a library: two bookcases full of books */
    var lib = new THREE.Group();
    var woodMat = K.mat.wood({ color: 0x9C7A55, roughness: 0.7 }), backMat = M(0x7E6246, 0.8, 0);
    var SHELVES = 4, CASES = 2;
    var books = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), M(0xffffff, 0.7, 0), 30 * SHELVES * CASES);
    books.castShadow = true; books.receiveShadow = true;
    var spineCols = [0x2A3F6E, 0x8C3B22, 0x3E5C4A, 0xD9D2C2, 0x4A4E57, 0xA9864F, 0x6B2E2A, 0x1F2B48, 0xB8AFA0];
    var rngB = K.rng(31), mtx = new THREE.Matrix4(), col = new THREE.Color(), bi = 0;
    for (var cs = 0; cs < CASES; cs++) {
      var cg = new THREE.Group();
      var cw = 1.05, ch = 2.15, cd = 0.42;
      [-1, 1].forEach(function (sg) { var sd = mesh(rbox(0.05, ch, cd, 0.015, 1), woodMat, true, true); sd.position.set(sg * cw / 2, ch / 2, 0); cg.add(sd); });
      for (var sh = 0; sh <= SHELVES; sh++) {
        var bd = mesh(rbox(cw, 0.045, cd, 0.012, 1), woodMat, true, true);
        bd.position.set(0, 0.03 + sh * (ch - 0.06) / SHELVES, 0);
        cg.add(bd);
      }
      var backP = mesh(new THREE.BoxGeometry(cw, ch, 0.02), backMat, false, true);
      backP.position.set(0, ch / 2, -cd / 2);
      cg.add(backP);
      var cx = (cs - 0.5) * 1.1;
      cg.position.set(cx, 0, 0);
      lib.add(cg);
      for (sh = 0; sh < SHELVES; sh++) {
        var x = -cw / 2 + 0.04, y0 = 0.055 + sh * (ch - 0.06) / SHELVES;
        while (x < cw / 2 - 0.07 && bi < books.count) {
          var bwid = 0.028 + rngB() * 0.022, bhgt = 0.32 + rngB() * 0.13, bdep = 0.26 + rngB() * 0.08;
          mtx.makeScale(bwid, bhgt, bdep);
          mtx.setPosition(cx + x + bwid / 2, y0 + bhgt / 2, 0.02);
          books.setMatrixAt(bi, mtx);
          col.setHex(spineCols[Math.floor(rngB() * spineCols.length)]);
          books.setColorAt(bi, col);
          bi++;
          x += bwid + 0.003;
        }
      }
    }
    books.count = bi;
    lib.add(books);
    lib.rotation.y = -0.1;
    lib.position.set(STEPS[5].x, STEPS[5].h, -0.1);
    v.scene.add(lib);

    mergeStatic(v.scene);

    /* ---------------- labels ---------------- */
    var mono = K.fonts.mono.replace(/"/g, '&quot;');
    function capHtml(s) {
      return '<span style="font-family:' + mono + ';font-weight:500;font-size:15px;color:' + C.ink + '">' + s.name + '</span>' +
        '<br><span style="font-weight:400;font-size:12.5px;color:' + C.ink2 + '">' + s.note + '</span>';
    }
    STEPS.forEach(function (s, k) {
      s.cap = v.label(capHtml(s), { at: [s.x, s.h + s.top + 0.12, 0.2], cls: 'name', valign: 'bottom', align: 'center', html: true });
      s.cap.el.style.textAlign = 'center';
      s.sh = v.label(s.short, { at: [s.x, s.h + s.top + 0.12, 0.2], cls: 'value', valign: 'bottom', align: 'center' });
    });
    var mult = [];
    for (i = 0; i < 5; i++) {
      mult.push(v.label(i === 0 ? '× 8' : '× 1.000', { at: [STEPS[i + 1].x - SW / 2 + 0.02, (STEPS[i].h + STEPS[i + 1].h) / 2, SD / 2 + 0.01], cls: 'tag chip', align: 'center' }));
    }
    var letterA = v.label('A', { at: [STEPS[1].x, STEPS[1].h + 0.2, 0.35], cls: 'name', valign: 'bottom', align: 'center' });
    letterA.el.style.fontSize = '30px';
    letterA.el.style.color = C.copper;
    /* everyday examples: fixed on screen under the heading (a point on the view ray always projects to the same pixel) */
    var exTmp = new THREE.Vector3();
    function fixedAt(px, py) { return function () { return exTmp.set(px / v.w * 2 - 1, 1 - py / v.h * 2, 0.5).unproject(v.camera); }; }
    var exHead = v.label('GÜNLÜK ÖRNEKLER', { at: fixedAt(22, 104), cls: 'tag', align: 'left', valign: 'middle' });
    var exSong = v.label('Bir şarkı (MP3) ≈ 4 MB', { at: fixedAt(22, 126), cls: 'note', align: 'left', valign: 'middle' });
    var exPhoto = v.label('Bir telefon fotoğrafı ≈ 3 MB', { at: fixedAt(22, 146), cls: 'note', align: 'left', valign: 'middle' });
    var exFilm = v.label('1 saatlik HD film ≈ 2–4 GB', { at: fixedAt(22, 166), cls: 'note', align: 'left', valign: 'middle' });
    [exSong, exPhoto, exFilm].forEach(function (L) { L.el.style.fontSize = '13px'; });

    /* ---------------- camera path ---------------- */
    var HOLD = 1.3, MOVE = 1.25;
    var PAN = STEPS.length * HOLD + (STEPS.length - 1) * MOVE;    // ≈ 14 s
    var OVER = 3.4, BACK = 1.8, CYC = PAN + OVER + BACK;
    function focusPose(k) {
      var s = STEPS[k];
      return { x: s.x + 0.6, y: s.h + s.top * 0.85 + 0.12, z: 0.3, d: 8.8, yaw: -0.36, pitch: 0.12 };
    }
    var OVERVIEW = { x: 6.9, y: 2.45, z: 0, d: 21.5, yaw: -0.3, pitch: 0.2 };
    function lerpPose(a, b, f) {
      return { x: lerp(a.x, b.x, f), y: lerp(a.y, b.y, f), z: lerp(a.z, b.z, f), d: Math.exp(lerp(Math.log(a.d), Math.log(b.d), f)), yaw: lerp(a.yaw, b.yaw, f), pitch: lerp(a.pitch, b.pitch, f) };
    }
    function poseAt(t) {
      if (RM) return OVERVIEW;
      var c = t % CYC;
      if (c < PAN) {
        var seg = HOLD + MOVE, k = Math.floor(c / seg), r = c - k * seg;
        if (k >= STEPS.length - 1) return focusPose(STEPS.length - 1);
        if (r < HOLD) return focusPose(k);
        return lerpPose(focusPose(k), focusPose(k + 1), eio((r - HOLD) / MOVE));
      }
      c -= PAN;
      if (c < OVER) return lerpPose(focusPose(STEPS.length - 1), OVERVIEW, eio(c / 1.7));
      c -= OVER;
      return lerpPose(OVERVIEW, focusPose(0), eio(c / BACK));
    }
    function focusOf(P) {
      // continuous focus position (0..5) and how far the camera has pulled back (0..1)
      var f = clamp((P.x - 0.6) / SW, 0, STEPS.length - 1);
      return { f: f, far: K.smoothstep(9, 15, P.d) };
    }

    var user = { yaw: 0, pitch: 0, ly: -0.36, lp: 0.17 };
    var st2 = { hiM: null, hiG: null };
    v.orbit.home = function () { user.yaw = 0; user.pitch = 0; };
    var lastOp = [];
    function setOp(L, k, op) {
      var q = Math.round(op * 100) / 100;
      if (lastOp[k] === q) return;
      lastOp[k] = q;
      L.el.style.opacity = q;
    }
    function frame(t, dt) {
      var P = poseAt(t);
      user.yaw += v.view.yaw - user.ly; user.pitch += v.view.pitch - user.lp;
      if (v.orbit.idle > 4) { var kd = Math.exp(-dt * 0.8); user.yaw *= kd; user.pitch *= kd; }
      v.view.target.set(P.x, P.y, P.z);
      v.view.distance = P.d;
      v.view.yaw = P.yaw + user.yaw;
      v.view.pitch = clamp(P.pitch + user.pitch, 0.02, 0.9);
      user.ly = v.view.yaw; user.lp = v.view.pitch;
      var F = focusOf(P);
      STEPS.forEach(function (s, k) {
        setOp(s.cap, k, (1 - F.far) * clamp(1 - Math.abs(F.f - k) * 2.2, 0, 1));
        setOp(s.sh, 10 + k, F.far);
      });
      mult.forEach(function (L, k) { setOp(L, 20 + k, 1); });
      setOp(letterA, 30, 1 - F.far * 0.4);
      var mbA = 1 - clamp(Math.abs(F.f - 3) - 0.1, 0, 1), gbA = 1 - clamp(Math.abs(F.f - 4) - 0.1, 0, 1);
      var exOn = function (a) { return Math.max(F.far * 0.9, 0.8 + 0.2 * a); };
      setOp(exSong, 40, exOn(mbA)); setOp(exPhoto, 41, exOn(mbA)); setOp(exFilm, 42, exOn(gbA));
      var hiM = mbA > 0.5 && F.far < 0.5, hiG = gbA > 0.5 && F.far < 0.5;
      if (st2.hiM !== hiM) { st2.hiM = hiM; exSong.el.style.color = exPhoto.el.style.color = hiM ? C.copper : ''; exSong.el.style.fontWeight = exPhoto.el.style.fontWeight = hiM ? '600' : ''; }
      if (st2.hiG !== hiG) { st2.hiG = hiG; exFilm.el.style.color = hiG ? C.copper : ''; exFilm.el.style.fontWeight = hiG ? '600' : ''; }
      v.render(dt);
      if (K.skipRender) return;
      var ctx = v.ctx;
      beginOverlay(ctx);
      tag(ctx, 'VERİ BÜYÜKLÜKLERİ · ÖLÇEKLİ DEĞİL', 22, 30, C);
      var fk = Math.round(F.f);
      var a1 = 1 - F.far;
      var ha = a1 * (1 - Math.min(1, Math.abs(F.f - fk) * 2.2));
      txt(ctx, STEPS[fk].head, 22, 54, { size: 17, weight: 600, mono: true, color: C.ink, alpha: ha });
      txt(ctx, STEPS[fk].sub, 22, 74, { size: 13, weight: 500, mono: fk >= 2, color: C.ink2, alpha: ha });
      txt(ctx, 'Her basamak bir öncekinin 1.000 katı (bit → bayt: 8 katı)', 22, 54, { size: 16, weight: 600, color: C.ink, alpha: F.far });
      txt(ctx, 'Bazı sistemler 1 KB = 1.024 bayt kullanır', v.w - 18, v.h - 16, { size: 12, color: C.muted, align: 'right' });
    }

    prewarm(v);
    return {
      reset: function () { user.yaw = 0; user.pitch = 0; },
      frame: frame,
      resize: function () { },
      dispose: function () { v.dispose(); }
    };
  });

  /* ================================================================== */
  /* cpu-terms · W 1120×380                                               */
  /* ================================================================== */
  K.register('cpu-terms', function (el, opts) {
    var THREE = window.THREE;
    opts = opts || {};
    var theme = opts.theme || 'light';
    var C = themeColors(theme);
    var RM = K.reducedMotion;
    var TOPICS = ['ghz', 'cekirdek', 'ram'];
    var READ = {
      ghz: 'GHz: işlemcinin saat hızı. 3 GHz = saniyede 3 milyar tık; her tıkta işler bir adım ilerler',
      cekirdek: 'Çekirdek: işlemcinin içindeki bağımsız hesap birimi. 4 çekirdek aynı anda 4 iş yapabilir',
      ram: 'RAM çalışma masasıdır: küçük, hızlı, elektrik kesilince unutur. SSD raftır: büyük, daha yavaş, hatırlar'
    };
    var PX = [-4.45, 0, 4.45];                         // panel centres (world x)

    var v = K.stage3d(el, {
      theme: theme, fov: 24, yaw: 0, pitch: 0.3, distance: 11.2, target: [0, 0.75, 0], near: 0.5, far: 100,
      size: 7, ground: 0, minYaw: -0.3, maxYaw: 0.3, minPitch: 0.1, maxPitch: 0.8, minDistance: 9, maxDistance: 15
    });
    shiftView(v, 0, -0.04);
    if (v.lights) {
      var kc = v.lights.key.shadow.camera;
      kc.left = -9; kc.right = 9; kc.top = 9; kc.bottom = -9; kc.far = 50;
      kc.updateProjectionMatrix();
      v.lights.key.position.set(4, 11, 8);
    }
    function W2(obj, x, y, z) { return obj.localToWorld(new THREE.Vector3(x, y, z)); }

    /* ================= 1 · GHz: clock signal and tick counter ================= */
    var g1 = new THREE.Group();
    g1.position.x = PX[0];
    v.scene.add(g1);
    // oscilloscope-like plate
    var scopeTex = K.textTexture(1024, 300, function (ctx, w, h) {
      ctx.fillStyle = '#161A21'; ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = 'rgba(160,170,190,0.13)'; ctx.lineWidth = 2;
      for (var x = 0; x <= w; x += w / 10) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
      for (var y = 0; y <= h; y += h / 4) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }
    });
    var plateW = 3.5, plateH = 1.03;
    var frameMat = M(0x2A2E35, 0.5, 0.2);
    var plate = mesh(rbox(plateW + 0.16, plateH + 0.16, 0.1, 0.06, 3), frameMat, true, true);
    plate.position.set(0, 1.62, -0.06);
    g1.add(plate);
    var screen1 = mesh(new THREE.PlaneGeometry(plateW, plateH), M(0xffffff, 0.35, 0, { map: scopeTex }), false, false);
    screen1.position.set(0, 1.62, 0.0);
    g1.add(screen1);
    var stand1 = mesh(rbox(0.5, 1.05, 0.12, 0.04, 2), frameMat, true, true);
    stand1.position.set(0, 0.62, -0.12);
    g1.add(stand1);
    // square wave: 5 periods; copper "trace" segments
    var NPER = 5, WX0 = -1.55, WX1 = 1.55, PER = (WX1 - WX0) / NPER, LO = 1.34, HI = 1.9, TH = 0.045;
    var waveMat = M(0xD9814A, 0.35, 0.2, { emissive: 0xE07A3E, emissiveIntensity: 0.55 });
    var segs = [];
    for (var p = 0; p < NPER; p++) {
      var x0 = WX0 + p * PER;
      segs.push([x0, LO, x0, HI]);                 // rising edge
      segs.push([x0, HI, x0 + PER / 2, HI]);       // high
      segs.push([x0 + PER / 2, HI, x0 + PER / 2, LO]); // falling edge
      segs.push([x0 + PER / 2, LO, x0 + PER, LO]); // low
    }
    var edgeMeshes = [];
    segs.forEach(function (s, k) {
      var len = Math.hypot(s[2] - s[0], s[3] - s[1]) + TH;
      var vert = Math.abs(s[2] - s[0]) < 1e-6;
      var m = mesh(new THREE.BoxGeometry(vert ? TH : len, vert ? len : TH, TH), k % 4 === 0 ? waveMat.clone() : waveMat, false, false);
      m.position.set((s[0] + s[2]) / 2, (s[1] + s[3]) / 2, 0.04);
      g1.add(m);
      if (k % 4 === 0) edgeMeshes.push(m);
    });
    var cursor = mesh(new THREE.PlaneGeometry(0.035, plateH * 0.92), K.mat.glowBasic(0xF2C46B, 0.9), false, false);
    cursor.position.set(WX0, 1.62, 0.07);
    cursor.userData.keep = true;
    g1.add(cursor);
    // odometer counter: 6 drums
    var digitTex = K.textTexture(640, 96, function (ctx, w, h) {
      ctx.fillStyle = '#F4F3EF'; ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#15171C';
      ctx.font = '600 70px ' + K.fonts.sans;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      for (var d = 0; d < 10; d++) ctx.fillText(String(d), d * 64 + 32, h / 2 + 4);
    });
    var DR = 0.36, DL = 0.3, NDR = 6;
    var faceH = 2 * DR * Math.sin(Math.PI / 10) * 1.02;
    var faceGeos = [];
    for (var d = 0; d < 10; d++) {
      var fg = new THREE.PlaneGeometry(DL * 0.92, faceH);
      var uv = fg.attributes.uv;
      for (var q = 0; q < uv.count; q++) uv.setX(q, (d + uv.getX(q)) / 10);
      faceGeos.push(fg);
    }
    var faceMat = M(0xffffff, 0.5, 0, { map: digitTex });
    var drums = [];
    var counter = new THREE.Group();
    counter.position.set(0, 0.46, 0.25);
    counter.rotation.x = -0.3;
    g1.add(counter);
    var housing = mesh(rbox(NDR * DL + 0.22, DR * 2 + 0.16, DR * 2 + 0.1, 0.06, 3), frameMat, true, true);
    housing.position.z = -0.08;
    counter.add(housing);
    for (var di = 0; di < NDR; di++) {
      var drum = new THREE.Group();
      drum.position.set((di - (NDR - 1) / 2) * DL, 0, DR * 0.0 + 0.02);
      for (d = 0; d < 10; d++) {
        var f = new THREE.Mesh(faceGeos[d], faceMat);
        var ang = d * TAU / 10;
        // digit d sits at angle ang; rotating the drum by -ang brings it to the front
        f.position.set(0, Math.sin(ang) * DR * Math.cos(Math.PI / 10), Math.cos(ang) * DR * Math.cos(Math.PI / 10));
        f.rotation.x = -ang;
        drum.add(f);
      }
      drum.userData.keep = true;
      counter.add(drum);
      drums.push(drum);
    }
    var counterWindow = mesh(new THREE.PlaneGeometry(NDR * DL + 0.06, faceH * 1.15), M(0xffffff, 0.05, 0, { transparent: true, opacity: 0.08 }), false, false);
    counterWindow.position.set(0, 0, DR + 0.05);
    counter.add(counterWindow);

    /* ================= 2 · cores: a die with four cores ================= */
    var g2 = new THREE.Group();
    g2.position.x = PX[1];
    v.scene.add(g2);
    var chip2 = new THREE.Group();
    chip2.position.set(0, 0.98, 0);
    chip2.rotation.x = 0.62;
    chip2.scale.setScalar(0.84);
    g2.add(chip2);
    var stand2 = mesh(rbox(0.5, 0.62, 0.3, 0.06, 2), frameMat, true, true);
    stand2.position.set(0, 0.31, -0.3);
    g2.add(stand2);
    chip2.add(mesh(rbox(3.0, 0.08, 2.5, 0.05, 2), M(0x2F5A3B, 0.5, 0.05), true, true));
    var dieTop = mesh(rbox(2.5, 0.07, 2.05, 0.03, 2), M(0x1F232B, 0.28, 0.5), true, true);
    dieTop.position.y = 0.075;
    chip2.add(dieTop);
    var coreTex = K.textTexture(256, 256, function (ctx, w, h) {
      ctx.fillStyle = '#39404D'; ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#4A5262'; ctx.fillRect(18, 18, w - 36, 80);
      ctx.fillStyle = '#2E3440';
      for (var i = 0; i < 7; i++) ctx.fillRect(18, 116 + i * 18, w - 36, 11);
    });
    var cores = [], coreMats = [];
    var CORE_POS = [[-0.58, -0.47], [0.58, -0.47], [-0.58, 0.47], [0.58, 0.47]];
    CORE_POS.forEach(function (cp) {
      var cmat = M(0xffffff, 0.3, 0.35, { map: coreTex, emissive: 0xE07A3E, emissiveIntensity: 0 });
      var core = mesh(rbox(1.02, 0.05, 0.8, 0.02, 1), cmat, true, true);
      core.position.set(cp[0], 0.13, cp[1]);
      chip2.add(core);
      cores.push(core); coreMats.push(cmat);
    });
    // task blocks: 4 in work, 4 waiting
    var taskCols = [0x2343B0, 0xC8693A, 0x5E6A7D, 0x3E6B55];
    var taskGeo = rbox(0.42, 0.2, 0.34, 0.05, 2);
    var tasks = [];
    for (var tk = 0; tk < 8; tk++) {
      var tm = mesh(taskGeo, M(taskCols[tk % 4], 0.45, 0.05), false, true);
      tm.userData.keep = true;
      chip2.add(tm);
      tasks.push(tm);
    }
    var barGeo = new THREE.BoxGeometry(1, 0.012, 0.06);
    var bars = [];
    for (tk = 0; tk < 4; tk++) {
      var bm = mesh(barGeo, K.mat.glowBasic(0xF2C46B, 0.95), false, false);
      bm.userData.keep = true;
      chip2.add(bm);
      bars.push(bm);
    }

    /* ================= 3 · RAM and storage: desk and shelf ================= */
    var g3 = new THREE.Group();
    g3.position.x = PX[2];
    v.scene.add(g3);
    var wood = K.mat.wood({ color: 0xB08A5E, roughness: 0.68 });
    var darkWood = K.mat.wood({ color: 0x8E6B47, roughness: 0.7 });
    // desk (RAM): small
    var desk = new THREE.Group();
    desk.position.set(-1.0, 0, 0.25);
    g3.add(desk);
    var top3 = mesh(rbox(1.7, 0.07, 0.95, 0.025, 2), wood, true, true);
    top3.position.y = 0.92;
    desk.add(top3);
    [[-0.78, -0.4], [0.78, -0.4], [-0.78, 0.4], [0.78, 0.4]].forEach(function (lp) {
      var leg = mesh(rbox(0.06, 0.88, 0.06, 0.02, 1), darkWood, true, true);
      leg.position.set(lp[0], 0.44, lp[1]);
      desk.add(leg);
    });
    // shelf (SSD): large
    var shelf = new THREE.Group();
    shelf.position.set(1.05, 0, -0.15);
    g3.add(shelf);
    var SHW = 1.25, SHH = 2.3, SHD = 0.42, SHN = 4;
    [-1, 1].forEach(function (sg) { var sd = mesh(rbox(0.06, SHH, SHD, 0.02, 1), darkWood, true, true); sd.position.set(sg * SHW / 2, SHH / 2, 0); shelf.add(sd); });
    for (var sh = 0; sh <= SHN; sh++) {
      var bd = mesh(rbox(SHW, 0.05, SHD, 0.015, 1), darkWood, true, true);
      bd.position.set(0, 0.03 + sh * (SHH - 0.06) / SHN, 0);
      shelf.add(bd);
    }
    var back3 = mesh(new THREE.BoxGeometry(SHW, SHH, 0.02), M(0x7E6246, 0.8, 0), false, true);
    back3.position.set(0, SHH / 2, -SHD / 2);
    shelf.add(back3);
    var shelfBooks = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), M(0xffffff, 0.7, 0), 120);
    shelfBooks.castShadow = true; shelfBooks.receiveShadow = true;
    var spineCols = [0x2A3F6E, 0x8C3B22, 0x3E5C4A, 0xD9D2C2, 0x4A4E57, 0xA9864F, 0x6B2E2A, 0x1F2B48];
    var rngB = K.rng(77), mtx = new THREE.Matrix4(), colr = new THREE.Color(), nb = 0;
    var gap = { shelf: 2, x0: -0.18, x1: 0.12 };      // the gap left by the books that travel
    for (sh = 0; sh < SHN; sh++) {
      var x = -SHW / 2 + 0.06, yb = 0.055 + sh * (SHH - 0.06) / SHN;
      while (x < SHW / 2 - 0.08 && nb < 120) {
        var bw2 = 0.045 + rngB() * 0.03, bh2 = 0.36 + rngB() * 0.13;
        mtx.makeScale(bw2, bh2, 0.3);
        mtx.setPosition(x + bw2 / 2, yb + bh2 / 2, 0.02);
        shelfBooks.setMatrixAt(nb, mtx);
        colr.setHex(spineCols[Math.floor(rngB() * spineCols.length)]);
        shelfBooks.setColorAt(nb, colr);
        nb++;
        x += bw2 + 0.004;
      }
    }
    shelfBooks.count = nb;
    shelf.add(shelfBooks);
    // three travelling books (the program)
    var travel = [];
    var travelCols = [0xC8693A, 0x2343B0, 0x3E5C4A];
    for (var tb = 0; tb < 3; tb++) {
      var tgrp = new THREE.Group();
      tgrp.userData.keep = true;
      var bodyB = mesh(new THREE.BoxGeometry(0.075, 0.44, 0.3), M(travelCols[tb], 0.6, 0.02), true, true);
      tgrp.add(bodyB);
      g3.add(tgrp);
      travel.push({ g: tgrp, mat: bodyB.material, from: new THREE.Vector3(shelf.position.x + gap.x0 + 0.04 + tb * 0.09, 0.055 + gap.shelf * (SHH - 0.06) / SHN + 0.22, shelf.position.z + 0.3), to: new THREE.Vector3(desk.position.x - 0.45 + tb * 0.45, 0.92 + 0.05, desk.position.z + 0.02) });
    }

    drums.forEach(function (dr) { dr.userData.keep = false; mergeStatic(dr); dr.userData.keep = true; });
    mergeStatic(v.scene);

    /* ---------------- labels ---------------- */
    v.scene.updateMatrixWorld(true);
    var sub = function (t2) { return '<br><span style="font-weight:400;font-size:12px;color:' + C.ink2 + '">' + t2 + '</span>'; };
    var labDesk = v.label('RAM: çalışma masası' + sub('küçük, hızlı, elektrik kesilince unutur'), { at: W2(desk, -0.1, 0, 0.5), cls: 'name', dy: 6, align: 'center', valign: 'top', html: true });
    labDesk.el.style.textAlign = 'center';
    var labShelf = v.label('SSD: raf' + sub('büyük, daha yavaş, hatırlar'), { at: [PX[2] + 1.05, 2.42, -0.15], cls: 'name', dy: -8, align: 'center', valign: 'bottom', html: true });
    labShelf.el.style.textAlign = 'center';

    /* ---------------- timing ---------------- */
    var TOPIC_T = 6, RATE = 1.2;              // ticks per second (slowed)
    var st = { now: 0, auto: true, topic: 'ghz', hl: [1, 0.35, 0.35], tw: null, t0: 0 };
    function activeAt(t) { return st.auto ? TOPICS[Math.floor(t / TOPIC_T) % 3] : st.topic; }

    /* cores: all four take a task together, work, hand them over */
    var CORE_CYC = 4;
    function coreState(t) {
      var c = t % CORE_CYC, n = Math.floor(t / CORE_CYC);
      return { c: c, n: n };
    }
    var tmpA = new THREE.Vector3();
    function setTask(k, x, y, z, s, op) {
      var m = tasks[k];
      m.position.set(x, y, z);
      m.scale.setScalar(Math.max(0.0001, s));
      m.visible = s > 0.01;
    }

    /* desk and shelf loop (6 s): books fly to the desk, work, power cut clears the desk */
    var RAM_CYC = 6;

    function frame(t, dt) {
      st.now = t;
      var act = activeAt(t);
      var ai = TOPICS.indexOf(act);
      // eased highlight weights
      for (var i = 0; i < 3; i++) {
        var target = i === ai ? 1 : 0.3;
        st.hl[i] += (target - st.hl[i]) * (1 - Math.exp(-dt * 5));
      }
      /* ---- 1 · clock ---- */
      var ticks = RM ? 0 : t * RATE;
      var sweep = (ticks % NPER) / NPER;
      cursor.position.x = WX0 + sweep * (WX1 - WX0) + 0.001;
      edgeMeshes.forEach(function (m, k) {
        var since = ((ticks % NPER) - k);
        var fl = since >= 0 && since < 0.35 ? 1 - since / 0.35 : 0;
        m.material.emissiveIntensity = 0.55 + 2.2 * fl;
      });
      // the counter rolls at each rising edge (integer tick): base shows the settled value, roll the change
      var count = Math.floor(ticks), frac = ticks - count;
      var base = Math.max(0, count - 1), roll = count >= 1 ? eio(clamp(frac / 0.28, 0, 1)) : 0;
      var rest = base;
      for (var place = 0; place < NDR; place++) {
        var digit = rest % 10;
        rest = Math.floor(rest / 10);
        var pw = Math.pow(10, place);
        var rolls = place === 0 || (base % pw) === pw - 1;
        drums[NDR - 1 - place].rotation.x = (digit + (rolls ? roll : 0)) * TAU / 10;
      }
      /* ---- 2 · cores ---- */
      var cs = coreState(RM ? 1.5 : t);
      for (var k = 0; k < 4; k++) {
        var cp = CORE_POS[k];
        var qx = -1.95, qz = -0.75 + k * 0.5;                // queue (left)
        var ox = 1.95;                                        // out (right)
        var c = cs.c;
        var inP = eio((c - k * 0.08) / 0.7), outP = eio((c - 3.1 - k * 0.06) / 0.6);
        var work = clamp((c - 0.75) / 2.3, 0, 1);
        // working task k
        var x, y, z;
        if (outP <= 0) {
          x = lerp(qx, cp[0], inP); z = lerp(qz, cp[1], inP); y = 0.28 + Math.sin(Math.PI * inP) * 0.45;
        } else {
          x = lerp(cp[0], ox, outP); z = lerp(cp[1], -0.75 + k * 0.5, outP); y = 0.28 + Math.sin(Math.PI * outP) * 0.45;
        }
        setTask(k, x, y, z, outP >= 1 ? 0 : 1);
        // next task waits in the queue, slides in from the left edge
        // the next task rises into the queue from the board while the current ones travel to the cores
        var rise = eio((c - 0.25 - k * 0.07) / 0.6);
        setTask(4 + k, qx, lerp(-0.25, 0.28, rise), qz, c < 0.25 ? 0 : 1);
        tasks[k].material.color.setHex(taskCols[(cs.n + k) % 4]);
        tasks[4 + k].material.color.setHex(taskCols[(cs.n + 1 + k) % 4]);
        coreMats[k].emissiveIntensity = (inP >= 1 && outP <= 0 ? 0.55 + 0.25 * Math.sin(t * 6 + k) : 0) * (RM ? 0.6 : 1);
        var bar = bars[k];
        bar.visible = inP >= 1 && outP <= 0;
        bar.scale.x = Math.max(0.001, work * 0.86);
        bar.position.set(cp[0] - 0.43 + work * 0.43, 0.17, cp[1] + 0.33);
      }
      st.done = cs.n * 4 + (cs.c >= 3.7 ? 4 : 0);
      /* ---- 3 · desk and shelf ---- */
      var rc = RM ? 3 : t % RAM_CYC;
      var cut = rc > 4.3 && rc < 5.4;
      for (var b = 0; b < 3; b++) {
        var T = travel[b];
        var fp = eio((rc - 0.5 - b * 0.35) / 0.9);
        var fade = rc < 4.3 ? 1 : 1 - clamp((rc - 4.3) / 0.35, 0, 1);
        tmpA.lerpVectors(T.from, T.to, fp);
        tmpA.y += Math.sin(Math.PI * fp) * 0.55;
        T.g.position.copy(tmpA);
        // standing on the shelf → lying open on the desk
        T.g.rotation.z = fp * Math.PI / 2;
        T.g.rotation.y = fp * 0.35 * (b - 1);
        var onDesk = fp >= 1;
        var vis = rc < 0.5 ? 0 : fade;
        T.g.visible = rc >= 0.5 && vis > 0.02;
        T.g.scale.setScalar(Math.max(0.0001, rc >= 4.3 ? vis : clamp((rc - 0.5 - b * 0.35) / 0.25, 0, 1)));
      }
      st.ramPhase = rc < 0.5 ? 'idle' : rc < 2.2 ? 'open' : rc < 4.3 ? 'work' : rc < 5.4 ? 'cut' : 'empty';
      v.render(dt);
      if (!K.skipRender) drawOverlay(t, ai);
    }
    /* ---------------- overlay ---------------- */
    var PANEL_W = 1120 / 3;
    function drawOverlay(t, ai) {
      var ctx = v.ctx, W = v.w, H = v.h;
      beginOverlay(ctx);
      // veil over inactive panels
      for (var i = 0; i < 3; i++) {
        var dim = 1 - (st.hl[i] - 0.3) / 0.7;
        if (dim > 0.01) {
          ctx.fillStyle = K.rgba(C.paper, 0.62 * dim);
          ctx.fillRect(i * PANEL_W, 0, PANEL_W, H);
        }
      }
      // dividers
      ctx.fillStyle = C.line;
      ctx.fillRect(PANEL_W, 26, 1, H - 52);
      ctx.fillRect(2 * PANEL_W, 26, 1, H - 52);
      var heads = [
        ['GHz · SAAT HIZI', 'Her tık, işlerin bir adım ilerlemesi'],
        ['ÇEKİRDEK', 'İşlemcinin içindeki hesap birimleri'],
        ['RAM VE DEPOLAMA', 'Masa ve raf']
      ];
      var foot = [
        '3 GHz = saniyede 3 milyar tık (yavaşlatılmış)',
        '4 çekirdek: aynı anda 4 iş',
''
      ];
      for (i = 0; i < 3; i++) {
        var a = 0.45 + 0.55 * (st.hl[i] - 0.3) / 0.7;
        var x0 = i * PANEL_W + 22;
        tag(ctx, heads[i][0], x0, 30, C, { alpha: a, color: i === ai ? C.copper : C.muted });
        txt(ctx, heads[i][1], x0, 50, { size: 13, color: C.ink2, alpha: a });
        txt(ctx, foot[i], x0, H - 18, { size: 13, weight: 600, color: C.ink, alpha: a });
      }
      // GHz: tick count and the real numbers
      var ticks = Math.floor(RM ? 0 : t * RATE);
      var a1 = 0.45 + 0.55 * (st.hl[0] - 0.3) / 0.7;
      txt(ctx, '1 tık = 1 s ÷ 3.000.000.000 ≈ 0,33 nanosaniye', 22, H - 58, { size: 12, weight: 500, mono: true, color: C.ink2, alpha: a1 });
      txt(ctx, 'Bu sürede ışık bile yalnızca 10 cm yol alır', 22, H - 40, { size: 12, color: C.muted, alpha: a1 });
      var pc = v.project(W2(counter, (NDR / 2) * DL + 0.2, 0, 0));
      txt(ctx, 'tık', pc.x + 6, pc.y + 5, { size: 13, weight: 600, color: C.ink2, alpha: a1 });
      // levels 1 / 0 next to the wave
      var pHi = v.project(W2(g1, -plateW / 2 - 0.16, HI, 0)), pLo = v.project(W2(g1, -plateW / 2 - 0.16, LO, 0));
      txt(ctx, '1', pHi.x, pHi.y + 5, { size: 13, weight: 600, mono: true, color: C.copper, align: 'right', alpha: a1 });
      txt(ctx, '0', pLo.x, pLo.y + 5, { size: 13, weight: 600, mono: true, color: C.muted, align: 'right', alpha: a1 });
      // cores: finished jobs
      var a2 = 0.45 + 0.55 * (st.hl[1] - 0.3) / 0.7;
      var px2 = PANEL_W + 22;
      txt(ctx, 'Biten iş: ' + st.done, px2, H - 40, { size: 12.5, weight: 500, mono: true, color: C.ink2, alpha: a2 });
      var pq = v.project(W2(chip2, -1.95, 0.3, -1.1)), po = v.project(W2(chip2, 1.95, 0.3, -1.1));
      txt(ctx, 'sıradaki işler', pq.x, pq.y - 6, { size: 12, color: C.muted, align: 'center', alpha: a2 });
      txt(ctx, 'biten', po.x, po.y - 6, { size: 12, color: C.muted, align: 'center', alpha: a2 });
      // desk and shelf: notes
      var a3 = 0.45 + 0.55 * (st.hl[2] - 0.3) / 0.7;
      var px3 = 2 * PANEL_W + 22;
      var ph = st.ramPhase;
      var msg = ph === 'open' ? 'Program açılıyor: SSD’den RAM’e' : ph === 'work' ? 'Çalışırken her şey masada: hızlı' : ph === 'cut' || ph === 'empty' ? 'Elektrik kesildi: masa boşaldı, raf duruyor' : 'Program kapalı';
      txt(ctx, msg, px3, H - 18, { size: 13, weight: 600, color: ph === 'cut' || ph === 'empty' ? C.copper : C.ink, alpha: a3 });
      labDesk.el.style.opacity = labShelf.el.style.opacity = String(Math.round(a3 * 100) / 100);
    }

    prewarm(v);
    return {
      reset: function () {
        st.auto = true; st.topic = 'ghz'; st.hl = [1, 0.3, 0.3];
        v.setView({ yaw: v.home.yaw, pitch: v.home.pitch, distance: v.home.distance, target: v.home.target.toArray() });
      },
      frame: frame,
      set: function (key, val) {
        if (key !== 'topic') return;
        var s = String(val).toLowerCase().replace('ç', 'c').replace('ı', 'i');
        if (TOPICS.indexOf(s) < 0) return;
        st.auto = false;
        st.topic = s;
      },
      read: function (key) {
        if (key === 'topic') return READ[activeAt(st.now)];
        return '';
      },
      resize: function () { },
      dispose: function () { v.dispose(); }
    };
  });

})();
