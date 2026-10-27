/* Köklerden Göklere · Builder A görselleri (Açılış)
 *   field-dipole · thunder · op-add · op-sub · op-mul · op-div · op-and · roots-to-sky
 * Sözleşme: KGViz.register(ad, fabrika) → { reset, frame, set?, read?, resize?, dispose? }
 */
(function () {
  'use strict';
  if (!window.KGViz) return;
  var K = window.KGViz;
  var P = K.palette;
  var clamp = K.clamp, lerp = K.lerp, sstep = K.smoothstep, span = K.span, E = K.ease;
  var TAU = Math.PI * 2;

  /* ------------------------------------------------------------------
   * Shared helpers
   * ------------------------------------------------------------------ */

  /* sRGB hex → plain float triple (for ShaderMaterials that write sRGB directly) */
  function srgb(hex) {
    var THREE = window.THREE;
    return new THREE.Vector3(((hex >> 16) & 255) / 255, ((hex >> 8) & 255) / 255, (hex & 255) / 255);
  }

  function noop() { }

  /* Screen-space ribbon lines: constant pixel width, soft edges, optional
   * growth (per-vertex delay), dashes (arc length), screen-x and depth fades. */
  var LINE_VS = [
    'uniform vec2 uRes;',
    'uniform float uWidth;',
    'attribute vec3 aPrev;',
    'attribute vec3 aNext;',
    'attribute float aSide;',
    'attribute vec4 aData;',
    'varying vec4 vData;',
    'varying float vEdge;',
    'varying float vDepth;',
    'varying float vSx;',
    'varying float vSy;',
    'void main() {',
    '  mat4 mvp = projectionMatrix * modelViewMatrix;',
    '  vec4 c = mvp * vec4(position, 1.0);',
    '  vec4 p = mvp * vec4(aPrev, 1.0);',
    '  vec4 n = mvp * vec4(aNext, 1.0);',
    '  vec2 hr = uRes * 0.5;',
    '  vec2 d = n.xy / n.w * hr - p.xy / p.w * hr;',
    '  float L = length(d);',
    '  d = L > 1e-6 ? d / L : vec2(1.0, 0.0);',
    '  float hw = uWidth * 0.5 + 1.0;',
    '  c.xy += vec2(-d.y, d.x) * (hw * aSide) / hr * c.w;',
    '  gl_Position = c;',
    '  vEdge = aSide * hw;',
    '  vData = aData;',
    '  vDepth = -(modelViewMatrix * vec4(position, 1.0)).z;',
    '  vSx = (c.x / c.w * 0.5 + 0.5) * uRes.x;',
    '  vSy = (1.0 - (c.y / c.w * 0.5 + 0.5)) * uRes.y;',
    '}'
  ].join('\n');

  var LINE_FS = [
    'uniform vec3 uColor;',
    'uniform float uOpacity;',
    'uniform float uWidth;',
    'uniform float uTime;',
    'uniform float uGrow;',
    'uniform vec2 uDash;',
    'uniform float uDashShift;',
    'uniform vec2 uFadeX;',
    'uniform vec3 uFadeY;',
    'uniform vec3 uDepthFade;',
    'uniform float uHead;',
    'uniform vec2 uTrail;',
    'varying vec4 vData;',
    'varying float vEdge;',
    'varying float vDepth;',
    'varying float vSx;',
    'varying float vSy;',
    'void main() {',
    '  float a = clamp(uWidth * 0.5 + 0.5 - abs(vEdge), 0.0, 1.0) * min(uWidth, 1.0);',
    '  a *= vData.z * uOpacity;',
    '  if (uTrail.y > 0.0) a *= smoothstep(uTrail.x - uTrail.y, uTrail.x, vData.x) * (1.0 - smoothstep(uTrail.x, uTrail.x + 0.004, vData.x));',
    '  if (uGrow > 0.0) {',
    '    float pr = (uTime - vData.w) / uGrow;',
    '    a *= 1.0 - smoothstep(pr - uHead, pr, vData.x);',
    '  }',
    '  if (uDash.x > 0.0) {',
    '    float m = mod(vData.y + uDashShift, uDash.x + uDash.y);',
    '    a *= smoothstep(0.0, uDash.x * 0.2, m) * (1.0 - smoothstep(uDash.x * 0.8, uDash.x, m));',
    '  }',
    '  if (uFadeX.y > uFadeX.x) a *= smoothstep(uFadeX.x, uFadeX.y, vSx);',
    '  if (uFadeY.y > uFadeY.x) a *= mix(1.0, uFadeY.z, smoothstep(uFadeY.x, uFadeY.y, vSy));',
    '  if (uDepthFade.y > uDepthFade.x) a *= mix(1.0, uDepthFade.z, smoothstep(uDepthFade.x, uDepthFade.y, vDepth));',
    '  if (a < 0.002) discard;',
    '  gl_FragColor = vec4(uColor, a);',
    '}'
  ].join('\n');

  /* lines: [{ pts: [[x,y,z]...] | Float32Array(xyz...), alpha: number | Float32Array per point, delay: number }] */
  function lineGeometry(lines) {
    var THREE = window.THREE;
    var nv = 0, ni = 0, li, j;
    for (li = 0; li < lines.length; li++) {
      var np = ptsCount(lines[li].pts);
      if (np < 2) continue;
      nv += np * 2; ni += (np - 1) * 6;
    }
    var pos = new Float32Array(nv * 3), prev = new Float32Array(nv * 3), next = new Float32Array(nv * 3);
    var side = new Float32Array(nv), data = new Float32Array(nv * 4);
    var idx = new (nv > 65535 ? Uint32Array : Uint16Array)(ni);
    var v0 = 0, i0 = 0;
    for (li = 0; li < lines.length; li++) {
      var Ln = lines[li], pts = Ln.pts, n = ptsCount(pts);
      if (n < 2) continue;
      var flat = toFlat(pts);
      var total = 0, cum = new Float32Array(n);
      for (j = 1; j < n; j++) {
        var dx = flat[j * 3] - flat[j * 3 - 3], dy = flat[j * 3 + 1] - flat[j * 3 - 2], dz = flat[j * 3 + 2] - flat[j * 3 - 1];
        total += Math.sqrt(dx * dx + dy * dy + dz * dz);
        cum[j] = total;
      }
      for (j = 0; j < n; j++) {
        var jp = Math.max(0, j - 1), jn = Math.min(n - 1, j + 1);
        var al = typeof Ln.alpha === 'number' ? Ln.alpha : Ln.alpha ? Ln.alpha[j] : 1;
        for (var s = 0; s < 2; s++) {
          var vi = v0 + j * 2 + s;
          pos[vi * 3] = flat[j * 3]; pos[vi * 3 + 1] = flat[j * 3 + 1]; pos[vi * 3 + 2] = flat[j * 3 + 2];
          prev[vi * 3] = flat[jp * 3]; prev[vi * 3 + 1] = flat[jp * 3 + 1]; prev[vi * 3 + 2] = flat[jp * 3 + 2];
          next[vi * 3] = flat[jn * 3]; next[vi * 3 + 1] = flat[jn * 3 + 1]; next[vi * 3 + 2] = flat[jn * 3 + 2];
          side[vi] = s ? 1 : -1;
          data[vi * 4] = total > 0 ? cum[j] / total : 0;
          data[vi * 4 + 1] = cum[j];
          data[vi * 4 + 2] = al;
          data[vi * 4 + 3] = Ln.delay || 0;
        }
      }
      for (j = 0; j < n - 1; j++) {
        var a = v0 + j * 2, b = a + 1, c = a + 2, d = a + 3;
        idx[i0++] = a; idx[i0++] = c; idx[i0++] = b;
        idx[i0++] = b; idx[i0++] = c; idx[i0++] = d;
      }
      v0 += n * 2;
    }
    var g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('aPrev', new THREE.BufferAttribute(prev, 3));
    g.setAttribute('aNext', new THREE.BufferAttribute(next, 3));
    g.setAttribute('aSide', new THREE.BufferAttribute(side, 1));
    g.setAttribute('aData', new THREE.BufferAttribute(data, 4));
    g.setIndex(new THREE.BufferAttribute(idx, 1));
    g.computeBoundingSphere();
    return g;
  }
  function ptsCount(p) { return p && p.length ? (typeof p[0] === 'number' ? p.length / 3 : p.length) : 0; }
  function toFlat(p) {
    if (typeof p[0] === 'number') return p;
    var f = new Float32Array(p.length * 3);
    for (var i = 0; i < p.length; i++) {
      var q = p[i];
      if (q.isVector3) { f[i * 3] = q.x; f[i * 3 + 1] = q.y; f[i * 3 + 2] = q.z; }
      else { f[i * 3] = q[0]; f[i * 3 + 1] = q[1]; f[i * 3 + 2] = q[2]; }
    }
    return f;
  }

  /* o: {color, opacity, width, grow, head, dash:[d,g], fadeX:[x0,x1], depthFade:[near,far,min], blending, depthTest} */
  function lineMaterial(o) {
    var THREE = window.THREE;
    o = o || {};
    return new THREE.ShaderMaterial({
      uniforms: {
        uRes: { value: new THREE.Vector2(800, 600) },
        uWidth: { value: o.width || 1.2 },
        uColor: { value: srgb(o.color === undefined ? 0xffffff : o.color) },
        uOpacity: { value: o.opacity === undefined ? 1 : o.opacity },
        uTime: { value: 0 },
        uGrow: { value: o.grow || 0 },
        uHead: { value: o.head || 0.04 },
        uDash: { value: new THREE.Vector2(o.dash ? o.dash[0] : 0, o.dash ? o.dash[1] : 0) },
        uDashShift: { value: 0 },
        uFadeX: { value: new THREE.Vector2(o.fadeX ? o.fadeX[0] : 0, o.fadeX ? o.fadeX[1] : 0) },
        uFadeY: { value: new THREE.Vector3(o.fadeY ? o.fadeY[0] : 0, o.fadeY ? o.fadeY[1] : 0, o.fadeY ? o.fadeY[2] : 1) },
        uDepthFade: { value: new THREE.Vector3(o.depthFade ? o.depthFade[0] : 0, o.depthFade ? o.depthFade[1] : 0, o.depthFade ? o.depthFade[2] : 1) },
        uTrail: { value: new THREE.Vector2(0, 0) }
      },
      vertexShader: LINE_VS,
      fragmentShader: LINE_FS,
      transparent: true,
      depthWrite: false,
      depthTest: o.depthTest !== false,
      side: THREE.DoubleSide,
      blending: o.blending || THREE.NormalBlending
    });
  }

  /* Soft luminous points (particles, glints). */
  var PT_VS = [
    'uniform float uPR;',
    'uniform vec2 uRes;',
    'attribute float aSize;',
    'attribute float aAlpha;',
    'varying float vA;',
    'varying float vSx;',
    'varying float vSy;',
    'void main() {',
    '  vec4 mv = modelViewMatrix * vec4(position, 1.0);',
    '  vec4 c = projectionMatrix * mv;',
    '  gl_Position = c;',
    '  gl_PointSize = aSize * uPR;',
    '  vA = aAlpha;',
    '  vSx = (c.x / c.w * 0.5 + 0.5) * uRes.x;',
    '  vSy = (1.0 - (c.y / c.w * 0.5 + 0.5)) * uRes.y;',
    '}'
  ].join('\n');
  var PT_FS = [
    'uniform vec3 uColor;',
    'uniform vec3 uCore;',
    'uniform vec2 uFadeX;',
    'uniform vec3 uFadeY;',
    'uniform float uOpacity;',
    'uniform float uCoreR;',
    'varying float vA;',
    'varying float vSx;',
    'varying float vSy;',
    'void main() {',
    '  vec2 q = gl_PointCoord * 2.0 - 1.0;',
    '  float r = length(q);',
    '  if (r > 1.0) discard;',
    '  float core = 1.0 - smoothstep(uCoreR * 0.55, uCoreR, r);',
    '  float halo = pow(1.0 - r, 2.2) * 0.75;',
    '  float a = (core + halo * (1.0 - core)) * vA * uOpacity;',
    '  if (uFadeX.y > uFadeX.x) a *= smoothstep(uFadeX.x, uFadeX.y, vSx);',
    '  if (uFadeY.y > uFadeY.x) a *= mix(1.0, uFadeY.z, smoothstep(uFadeY.x, uFadeY.y, vSy));',
    '  if (a < 0.003) discard;',
    '  gl_FragColor = vec4(mix(uColor, uCore, core), a);',
    '}'
  ].join('\n');

  function pointsCloud(n, o) {
    var THREE = window.THREE;
    o = o || {};
    var g = new THREE.BufferGeometry();
    var pos = new Float32Array(n * 3), size = new Float32Array(n), alpha = new Float32Array(n);
    for (var i = 0; i < n; i++) { size[i] = o.size || 8; pos[i * 3 + 1] = -9999; }
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('aSize', new THREE.BufferAttribute(size, 1).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('aAlpha', new THREE.BufferAttribute(alpha, 1).setUsage(THREE.DynamicDrawUsage));
    var m = new THREE.ShaderMaterial({
      uniforms: {
        uPR: { value: 1 }, uRes: { value: new THREE.Vector2(800, 600) },
        uColor: { value: srgb(o.color === undefined ? 0x8EA6F2 : o.color) },
        uCore: { value: srgb(o.core === undefined ? 0xffffff : o.core) },
        uFadeX: { value: new THREE.Vector2(o.fadeX ? o.fadeX[0] : 0, o.fadeX ? o.fadeX[1] : 0) },
        uFadeY: { value: new THREE.Vector3(o.fadeY ? o.fadeY[0] : 0, o.fadeY ? o.fadeY[1] : 0, o.fadeY ? o.fadeY[2] : 1) },
        uOpacity: { value: o.opacity === undefined ? 1 : o.opacity },
        uCoreR: { value: o.coreR || 0.32 }
      },
      vertexShader: PT_VS, fragmentShader: PT_FS,
      transparent: true, depthWrite: false, depthTest: o.depthTest !== false,
      blending: o.blending || THREE.NormalBlending
    });
    var pts = new THREE.Points(g, m);
    pts.frustumCulled = false;
    pts.pos = pos; pts.size = size; pts.alpha = alpha;
    pts.commit = function () {
      g.attributes.position.needsUpdate = true;
      g.attributes.aSize.needsUpdate = true;
      g.attributes.aAlpha.needsUpdate = true;
    };
    return pts;
  }

  /* Keep shader resolution uniforms in step with the stage canvas. */
  function syncRes(v, mats) {
    for (var i = 0; i < mats.length; i++) {
      var u = mats[i].uniforms;
      if (u.uRes) u.uRes.value.set(v.sf.w, v.sf.h);
      if (u.uPR) u.uPR.value = v.sf.k;
    }
  }

  /* Radial glow sprite texture (cached per colour). */
  var glowTexCache = {};
  function glowTexture(hex) {
    if (glowTexCache[hex]) return glowTexCache[hex];
    var tex = K.textTexture(128, 128, function (ctx, w, h) {
      var g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
      g.addColorStop(0, K.rgba(hex, 1));
      g.addColorStop(0.25, K.rgba(hex, 0.5));
      g.addColorStop(0.6, K.rgba(hex, 0.12));
      g.addColorStop(1, K.rgba(hex, 0));
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
    });
    glowTexCache[hex] = tex;
    return tex;
  }
  function glowSprite(hex, size, opacity) {
    var THREE = window.THREE;
    var s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(hex), transparent: true, depthWrite: false, opacity: opacity === undefined ? 1 : opacity, toneMapped: false }));
    s.scale.set(size, size, 1);
    return s;
  }

  /* Rounded box (all edges rounded) via a rounded-rect extrusion with a rounded bevel. */
  function roundedRectShape(w, h, r) {
    var THREE = window.THREE;
    var s = new THREE.Shape();
    var x = -w / 2, y = -h / 2;
    r = Math.min(r, w / 2, h / 2);
    s.moveTo(x + r, y);
    s.lineTo(x + w - r, y);
    s.quadraticCurveTo(x + w, y, x + w, y + r);
    s.lineTo(x + w, y + h - r);
    s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    s.lineTo(x + r, y + h);
    s.quadraticCurveTo(x, y + h, x, y + h - r);
    s.lineTo(x, y + r);
    s.quadraticCurveTo(x, y, x + r, y);
    return s;
  }
  function roundedBox(w, h, d, r, bevel, segs) {
    var THREE = window.THREE;
    bevel = Math.min(bevel === undefined ? r * 0.5 : bevel, d * 0.49, w * 0.49, h * 0.49);
    var shape = roundedRectShape(w - bevel * 2, h - bevel * 2, Math.max(0.0001, r - bevel));
    var g = new THREE.ExtrudeGeometry(shape, {
      depth: Math.max(0.0001, d - bevel * 2), bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel,
      bevelSegments: segs || 5, curveSegments: 10
    });
    g.translate(0, 0, -(d - bevel * 2) / 2);
    g.computeVertexNormals();
    return g;
  }

  /* Lathe from [r, y] pairs. */
  function lathe(prof, seg) {
    var THREE = window.THREE;
    var pts = prof.map(function (p) { return new THREE.Vector2(Math.max(0, p[0]), p[1]); });
    return new THREE.LatheGeometry(pts, seg || 48);
  }

  function mesh(geo, mat, cast, recv) {
    var THREE = window.THREE;
    var m = new THREE.Mesh(geo, mat);
    m.castShadow = !!cast;
    m.receiveShadow = recv !== false;
    return m;
  }

  /* Label helpers */
  function labelOpacity(L, a) {
    a = clamp(a, 0, 1);
    if (L._a === a) return;
    L._a = a;
    L.el.style.transition = 'none';
    L.el.style.opacity = a.toFixed(3);
    L.show(a > 0.01);
  }

  function setTitleStyle(L, css) { for (var k in css) L.el.style[k] = css[k]; return L; }

  /* Deterministic value noise (terrain, cloud and texture detail). */
  function hash2(x, y, s) { var h = Math.sin(x * 127.1 + y * 311.7 + s * 74.7) * 43758.5453; return h - Math.floor(h); }
  function vnoise(x, y, s) {
    var xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
    var u = xf * xf * (3 - 2 * xf), w = yf * yf * (3 - 2 * yf);
    var a = hash2(xi, yi, s), b = hash2(xi + 1, yi, s), c = hash2(xi, yi + 1, s), d = hash2(xi + 1, yi + 1, s);
    return lerp(lerp(a, b, u), lerp(c, d, u), w);
  }
  function fbm(x, y, s, oct) {
    var t = 0, a = 0.5, f = 1, n = 0;
    for (var i = 0; i < (oct || 4); i++) { t += a * vnoise(x * f, y * f, s + i * 17); n += a; f *= 2.03; a *= 0.5; }
    return t / n;
  }

  /* Linear (non-colour) data texture from a per-pixel function fn(u, v) → [r, g, b] in 0..1. */
  function dataTexture(w, h, fn, repeat) {
    var THREE = window.THREE;
    var c = document.createElement('canvas');
    c.width = w; c.height = h;
    var ctx = c.getContext('2d'), img = ctx.createImageData(w, h), d = img.data;
    for (var y = 0; y < h; y++) {
      for (var x = 0; x < w; x++) {
        var o = fn((x + 0.5) / w, (y + 0.5) / h);
        var i = (y * w + x) * 4;
        d[i] = o[0] * 255; d[i + 1] = o[1] * 255; d[i + 2] = o[2] * 255; d[i + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
    var tex = new THREE.CanvasTexture(c);
    tex.encoding = THREE.LinearEncoding;
    if (repeat) tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    return tex;
  }

  /* ==================================================================
   * thunder · S 680×520 · light, own dusk-sky frame
   * World units: kilometres. House (observer) at x ≤ 0, strike at x = D on the road (z = 0).
   * ================================================================== */
  K.register('thunder', function (el, opts) {
    var THREE = window.THREE;
    opts = opts || {};
    el.style.borderRadius = '14px';
    el.style.overflow = 'hidden';
    el.style.background = 'linear-gradient(180deg,#8796AD 0%,#B3BAC4 52%,#E2C5A3 100%)';
    var HOME = { yaw: -0.2, pitch: 0.075, distance: 7.3, target: [1.38, 0.85, 0] };
    /* the 3 km storm needs a wider frame; 1 km and 2 km share the home view */
    /* the wide 1120 x 440 focus box needs the cloud and the road in one frame, centred between them */
    var wideBox = (parseFloat(el.style.width) || el.clientWidth || 680) / (parseFloat(el.style.height) || el.clientHeight || 520) > 1.9;
    if (wideBox) { HOME.distance = 7.6; HOME.target = [1.55, 1.12, 0]; HOME.pitch = 0.05; }
    function viewFor(d) {
      var k = Math.max(0, d - 2);
      return { target: [HOME.target[0] + 0.4 * k, HOME.target[1], HOME.target[2]], distance: HOME.distance + 0.9 * k };
    }
    var v = K.stage3d(el, {
      theme: 'light', fov: 24, yaw: HOME.yaw, pitch: HOME.pitch, distance: HOME.distance, target: HOME.target,
      size: 0.7, near: 0.02, far: 160, minYaw: -0.6, maxYaw: 0.25, minPitch: 0.02, maxPitch: 0.3, minDistance: 5.6, maxDistance: wideBox ? 10 : 8.6
    });
    var reduced = K.reducedMotion;
    var SOUND = 0.343;            /* km per second */
    var STRIKE = 1.0;             /* s into each cycle */
    var HOLD = 2.5;

    /* --- dusk lighting --- */
    v.scene.fog = new THREE.Fog(0xAEB4BE, 8.5, 34);
    if (v.lights) {
      v.lights.hemi.color.set(0xAEB8C8); v.lights.hemi.groundColor.set(0x5E584C); v.lights.hemi.intensity = 0.6;
      v.lights.key.color.set(0xFFD9B0); v.lights.key.intensity = 1.35;
      v.lights.key.position.set(-1.6, 0.75, 1.5);
      v.lights.key.shadow.camera.left = -0.9; v.lights.key.shadow.camera.right = 0.9;
      v.lights.key.shadow.camera.top = 0.9; v.lights.key.shadow.camera.bottom = -0.9;
      v.lights.key.shadow.camera.near = 0.1; v.lights.key.shadow.camera.far = 6;
      v.lights.key.shadow.camera.updateProjectionMatrix();
      v.lights.key.shadow.mapSize.set(1024, 1024);
      v.lights.key.shadow.normalBias = 0.002;
      v.lights.key.shadow.bias = -0.0004;
      v.lights.fill.color.set(0xC9D3E6); v.lights.fill.intensity = 0.35;
      v.lights.rim.intensity = 0.25;
    }

    /* --- sky dome (follows the camera) --- */
    var skyMat = new THREE.ShaderMaterial({
      uniforms: {
        uTop: { value: srgb(0x7D8BA2) }, uMid: { value: srgb(0xADB5C1) }, uHor: { value: srgb(0xE5C6A2) },
        uSun: { value: new THREE.Vector3(-0.95, 0.05, -0.3).normalize() },
        uFlash: { value: 0 }, uBolt: { value: new THREE.Vector3(0, 0.1, -1) }
      },
      vertexShader: 'varying vec3 vDir; void main(){ vDir = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: [
        'uniform vec3 uTop; uniform vec3 uMid; uniform vec3 uHor; uniform vec3 uSun; uniform float uFlash; uniform vec3 uBolt;',
        'varying vec3 vDir;',
        'void main() {',
        '  vec3 d = normalize(vDir);',
        '  float e = d.y;',
        '  vec3 c = mix(uHor, uMid, smoothstep(-0.01, 0.13, e));',
        '  c = mix(c, uTop, smoothstep(0.08, 0.42, e));',
        '  float s = max(dot(d, uSun), 0.0);',
        '  c += vec3(0.16, 0.09, 0.03) * pow(s, 5.0) * (1.0 - smoothstep(0.0, 0.3, e));',
        '  float b = max(dot(d, normalize(uBolt)), 0.0);',
        '  c += vec3(0.62, 0.66, 0.78) * uFlash * (pow(b, 90.0) * 0.55 + pow(b, 12.0) * 0.22);',
        '  gl_FragColor = vec4(c, 1.0);',
        '}'
      ].join('\n'),
      side: THREE.BackSide, depthWrite: false, depthTest: false
    });
    var sky = new THREE.Mesh(new THREE.SphereGeometry(80, 48, 24), skyMat);
    sky.renderOrder = -10;
    sky.frustumCulled = false;
    v.scene.add(sky);

    /* --- terrain --- */
    var stormU = { value: new THREE.Vector3(2.4, 0, -0.45) };
    function terrainH(x, z) {
      /* a broad plain around the measuring line, rolling hills behind it, ridges on the horizon */
      var plain = (fbm(x * 0.45 + 10, z * 0.45 + 3, 5, 3) - 0.5) * 0.03;
      var hills = (fbm(x * 0.32 + 4, z * 0.32 + 1, 8, 4) - 0.38) * 0.42;
      var ridges = fbm(x * 0.13 + 2, z * 0.2 + 7, 9, 4) * 2.2 - 0.35;
      var h = plain;
      h = lerp(h, Math.max(plain, hills), sstep(-2.6, -5.5, z));
      h = lerp(h, Math.max(h, ridges), sstep(-7, -13, z));
      h = lerp(h, -0.004, sstep(0.35, 0.08, Math.abs(z)) * sstep(-1.5, -0.6, x) * sstep(5.4, 4.6, x));
      return h;
    }
    (function buildTerrain() {
      var xs = [], zs = [];
      for (var x = -5.5; x <= 11.01; x += 0.11) xs.push(x);
      var z = 3.8;
      while (z > -24) { zs.push(z); z -= 0.05 + 0.055 * Math.abs(z); }
      var nx = xs.length, nz = zs.length;
      var pos = new Float32Array(nx * nz * 3), col = new Float32Array(nx * nz * 3);
      var cA = new THREE.Color(0x4A5A37), cB = new THREE.Color(0x6A693B), cC = new THREE.Color(0x5C5038), cD = new THREE.Color(0x3D4A30), tc = new THREE.Color();
      for (var j = 0; j < nz; j++) {
        for (var i = 0; i < nx; i++) {
          var k = j * nx + i, X = xs[i], Z = zs[j], H = terrainH(X, Z);
          pos[k * 3] = X; pos[k * 3 + 1] = H; pos[k * 3 + 2] = Z;
          var n1 = fbm(X * 0.55, Z * 0.9, 21, 3), n2 = fbm(X * 0.35 + 3, Z * 0.5, 33, 3);
          tc.copy(cA).lerp(cB, sstep(0.45, 0.68, n1) * 0.55).lerp(cC, sstep(0.55, 0.75, n2) * 0.4).lerp(cD, sstep(0.1, 0.5, H) * 0.4);
          tc.multiplyScalar(lerp(1, 0.78, sstep(0.9, 3.6, Z)));
          col[k * 3] = tc.r; col[k * 3 + 1] = tc.g; col[k * 3 + 2] = tc.b;
        }
      }
      var idx = [];
      for (j = 0; j < nz - 1; j++) {
        for (i = 0; i < nx - 1; i++) {
          var a = j * nx + i, b = a + 1, c = a + nx, d = c + 1;
          idx.push(a, b, c, b, d, c);
        }
      }
      var g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      g.setAttribute('color', new THREE.BufferAttribute(col, 3));
      g.setIndex(idx);
      g.computeVertexNormals();
      var tm = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, metalness: 0, envMapIntensity: 0.45 });
      /* the storm's shadow on the land, following the cloud */
      tm.onBeforeCompile = function (sh) {
        sh.uniforms.uStorm = stormU;
        sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vWPos;')
          .replace('#include <begin_vertex>', '#include <begin_vertex>\nvWPos = (modelMatrix * vec4(transformed, 1.0)).xyz;');
        sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform vec3 uStorm;\nvarying vec3 vWPos;')
          .replace('#include <color_fragment>', '#include <color_fragment>\n{ vec2 dd = (vWPos.xz - uStorm.xz) / vec2(1.6, 1.2); diffuseColor.rgb *= 1.0 - 0.42 * exp(-dot(dd, dd)); }');
      };
      var m = mesh(g, tm, false, true);
      v.scene.add(m);
    })();

    /* --- road along the measuring line, km posts --- */
    var road = mesh(new THREE.PlaneGeometry(5.4, 0.045), K.mat.std(0xA79E8A, 0.95, 0, { envMapIntensity: 0.5 }), false, true);
    road.rotation.x = -Math.PI / 2;
    road.position.set(2.05, 0.003, 0.0);
    v.scene.add(road);
    var postMat = K.mat.std(0xF2F1EC, 0.6, 0), capMat = K.mat.std(0x2B2F37, 0.5, 0);
    var postGeo = roundedBox(0.02, 0.075, 0.02, 0.004, 0.003, 2), capGeo = roundedBox(0.0215, 0.02, 0.0215, 0.004, 0.003, 2);
    for (var pk = 0; pk <= 3; pk++) {
      var post = mesh(postGeo, postMat, true, true);
      post.position.set(pk, 0.0375, 0.05);
      var cap = mesh(capGeo, capMat, true, false);
      cap.position.set(pk, 0.066, 0.05);
      v.scene.add(post); v.scene.add(cap);
    }

    /* --- the house (observer). Exaggerated in size; its right wall sits at x = 0. --- */
    var house = new THREE.Group();
    house.scale.setScalar(1.3);
    v.scene.add(house);
    var wallMat = K.mat.std(0xEDE6DA, 0.85, 0), roofMat = K.mat.std(0x5A2E25, 0.68, 0), trimMat = K.mat.std(0x3A3631, 0.7, 0);
    var body = mesh(roundedBox(0.2, 0.1, 0.14, 0.005, 0.003, 2), wallMat, true, true);
    body.position.set(-0.11, 0.05, -0.13);
    house.add(body);
    var plinth = mesh(roundedBox(0.21, 0.012, 0.15, 0.002, 0.002, 1), K.mat.std(0x8E877A, 0.9, 0), true, true);
    plinth.position.set(-0.11, 0.004, -0.13);
    house.add(plinth);
    var rs = new THREE.Shape();
    rs.moveTo(-0.088, 0); rs.lineTo(0.088, 0); rs.lineTo(0, 0.072); rs.lineTo(-0.088, 0);
    var roofG = new THREE.ExtrudeGeometry(rs, { depth: 0.222, bevelEnabled: true, bevelThickness: 0.002, bevelSize: 0.002, bevelSegments: 1 });
    roofG.translate(0, 0, -0.111);
    var roof = mesh(roofG, roofMat, true, true);
    roof.rotation.y = Math.PI / 2;
    roof.position.set(-0.11, 0.1, -0.13);
    house.add(roof);
    var chim = mesh(roundedBox(0.016, 0.05, 0.016, 0.002, 0.002, 1), K.mat.std(0x9C8F80, 0.9, 0), true, false);
    chim.position.set(-0.165, 0.15, -0.155);
    house.add(chim);
    var door = mesh(new THREE.PlaneGeometry(0.026, 0.052), K.mat.std(0x5A4434, 0.7, 0), false, false);
    door.position.set(-0.165, 0.028, -0.0595);
    house.add(door);
    /* window that rattles */
    var win = new THREE.Group();
    win.position.set(-0.075, 0.056, -0.0595);
    house.add(win);
    var glassMat = new THREE.MeshStandardMaterial({ color: 0xF2C46B, emissive: 0xF2C46B, emissiveIntensity: 0.85, roughness: 0.3 });
    var pane = mesh(new THREE.PlaneGeometry(0.034, 0.03), glassMat, false, false);
    win.add(pane);
    var frameBars = [[0, 0.0165, 0.038, 0.004], [0, -0.0165, 0.038, 0.004], [0.0175, 0, 0.004, 0.036], [-0.0175, 0, 0.004, 0.036], [0, 0, 0.0025, 0.03], [0, 0, 0.034, 0.0025]];
    frameBars.forEach(function (b) {
      var bar = mesh(new THREE.BoxGeometry(b[2], b[3], 0.003), trimMat, false, false);
      bar.position.set(b[0], b[1], 0.0012);
      win.add(bar);
    });
    var win2 = win.clone();
    win2.position.set(-0.035, 0.056, -0.0595);
    house.add(win2);
    var winGlow = glowSprite('#F2C46B', 0.09, 0.35);
    winGlow.position.set(-0.055, 0.056, -0.05);
    house.add(winGlow);

    /* a few slender cypresses near the house and along the road for scale */
    var treeGeo = lathe([[0, 0], [0.008, 0.004], [0.017, 0.03], [0.019, 0.07], [0.015, 0.11], [0.008, 0.145], [0.002, 0.162], [0, 0.166]], 18);
    var treeMat = K.mat.std(0x2C3828, 0.95, 0, { envMapIntensity: 0.45 });
    [[-0.3, -0.2, 1.0], [-0.26, -0.33, 0.85], [0.42, -0.42, 0.75], [1.62, -0.55, 0.7], [2.55, -0.62, 0.8], [3.35, -0.5, 0.7]].forEach(function (tp) {
      var tr = mesh(treeGeo, treeMat, false, false);
      tr.position.set(tp[0], terrainH(tp[0], tp[1]) - 0.004, tp[1]);
      tr.scale.setScalar(tp[2]);
      v.scene.add(tr);
    });

    /* --- storm cloud (cumulonimbus): lit billboard puffs ---
     * Each puff is a camera-facing quad with a cauliflower-edged density texture, shaded as a
     * soft sphere (its own normal) inside the cloud body (puff normal), with a flat dark base. */
    var SUN = new THREE.Vector3(-0.82, 0.34, 0.46).normalize();
    var puffTex = dataTexture(160, 160, function (u, w) {
      var x = u * 2 - 1, y = w * 2 - 1;
      var d = 1 - Math.sqrt(x * x + y * y) / 0.6;
      var br = K.rng(77);
      for (var b = 0; b < 7; b++) {
        var a = b / 7 * TAU + br() * 0.6, rr = 0.32 + br() * 0.14, cx = Math.cos(a) * rr, cy = Math.sin(a) * rr, rad = 0.26 + br() * 0.14;
        d = Math.max(d, 1 - Math.sqrt((x - cx) * (x - cx) + (y - cy) * (y - cy)) / rad);
      }
      var n = fbm(u * 6, w * 6, 11, 5);
      var e = d + (n - 0.5) * 0.42;
      var dens = clamp(e / 0.2, 0, 1);
      dens = dens * dens * (3 - 2 * dens);
      return [dens, n, clamp(e * 1.6, 0, 1)];
    });
    var crng = K.rng(31);
    var puffs = [];
    var pi;
    function addPuff(x, y, z, size, asp, nx, ny, nz) { puffs.push({ p: [x, y, z], s: size, asp: asp, n: [nx, ny, nz] }); }
    /* flat base */
    for (pi = 0; pi < 30; pi++) {
      var bx = (crng() * 2 - 1) * 1.05, bz = (crng() * 2 - 1) * 0.55;
      addPuff(bx, 1.0 + crng() * 0.07, bz, 0.34 + crng() * 0.2, 0.45, bx * 0.4, -1, bz * 0.4);
    }
    /* main tower: puffs on the surface of a slightly leaning column */
    for (pi = 0; pi < 96; pi++) {
      var hh = crng(), ang = crng() * TAU;
      var Rh = 0.74 - hh * 0.2 + Math.sin(hh * 6 + 1) * 0.06;
      var rad = Rh * (0.55 + 0.45 * Math.sqrt(crng()));
      var axis = 0.1 + hh * 0.12;
      var px = axis + Math.cos(ang) * rad, pz = Math.sin(ang) * rad * 0.7, py = 1.1 + hh * 1.35;
      addPuff(px, py, pz, (0.2 + crng() * 0.22) * (1 - hh * 0.15), 1, Math.cos(ang), 0.25 + hh * 0.5, Math.sin(ang));
    }
    /* small crisp turrets on the sunlit upper-left */
    for (pi = 0; pi < 26; pi++) {
      var th = crng() * Math.PI * 0.85 + Math.PI * 0.08, hq = 0.55 + crng() * 0.5;
      var Rq = 0.74 - hq * 0.2;
      addPuff(0.1 + hq * 0.12 + Math.cos(th) * Rq * 1.02, 1.1 + hq * 1.35 + Math.sin(th) * 0.08, (crng() * 2 - 1) * 0.3, 0.14 + crng() * 0.1, 1, Math.cos(th), 0.6, 0.3);
    }
    /* anvil spreading at the top */
    for (pi = 0; pi < 22; pi++) {
      var ax = (crng() * 2 - 1) * 1.55 + 0.25;
      addPuff(ax, 2.42 + crng() * 0.2 + Math.abs(ax - 0.25) * 0.05, (crng() * 2 - 1) * 0.5, 0.36 + crng() * 0.22, 0.55, ax * 0.3, 1, 0.2);
    }
    /* junction ring where the flat base meets the tower */
    for (pi = 0; pi < 14; pi++) {
      var ja = pi / 14 * TAU;
      addPuff(0.1 + Math.cos(ja) * 0.74, 1.08 + crng() * 0.08, Math.sin(ja) * 0.52, 0.28 + crng() * 0.08, 0.7, Math.cos(ja), 0.1, Math.sin(ja));
    }
    var np = puffs.length;
    /* sort far-to-near for the home view (the camera stays close to it) */
    (function () {
      var tgt = new THREE.Vector3().fromArray(HOME.target), cpi = Math.cos(HOME.pitch);
      var cp = new THREE.Vector3(tgt.x + HOME.distance * Math.sin(HOME.yaw) * cpi, tgt.y + HOME.distance * Math.sin(HOME.pitch), tgt.z + HOME.distance * Math.cos(HOME.yaw) * cpi);
      puffs.forEach(function (q) { q.d = Math.pow(q.p[0] + 2 - cp.x, 2) + Math.pow(q.p[1] - cp.y, 2) + Math.pow(q.p[2] - cp.z, 2); });
      puffs.sort(function (a, b) { return b.d - a.d; });
    })();
    var iPos = new Float32Array(np * 3), iData = new Float32Array(np * 4), iN = new Float32Array(np * 4);
    for (pi = 0; pi < np; pi++) {
      var q = puffs[pi], nl = Math.sqrt(q.n[0] * q.n[0] + q.n[1] * q.n[1] + q.n[2] * q.n[2]) || 1;
      iPos[pi * 3] = q.p[0]; iPos[pi * 3 + 1] = q.p[1]; iPos[pi * 3 + 2] = q.p[2];
      iData[pi * 4] = q.s * 2; iData[pi * 4 + 1] = crng() * TAU; iData[pi * 4 + 2] = (crng() - 0.5) * 0.1; iData[pi * 4 + 3] = 0.85 + crng() * 0.15;
      iN[pi * 4] = q.n[0] / nl; iN[pi * 4 + 1] = q.n[1] / nl; iN[pi * 4 + 2] = q.n[2] / nl; iN[pi * 4 + 3] = q.asp;
    }
    var quad = new THREE.PlaneGeometry(1, 1);
    var cg = new THREE.InstancedBufferGeometry();
    cg.index = quad.index;
    cg.setAttribute('position', quad.attributes.position);
    cg.setAttribute('uv', quad.attributes.uv);
    cg.setAttribute('iPos', new THREE.InstancedBufferAttribute(iPos, 3));
    cg.setAttribute('iData', new THREE.InstancedBufferAttribute(iData, 4));
    cg.setAttribute('iN', new THREE.InstancedBufferAttribute(iN, 4));
    cg.instanceCount = np;
    var cloudMat = new THREE.ShaderMaterial({
      uniforms: {
        uTex: { value: puffTex }, uOffset: { value: new THREE.Vector3(2, 0, 0) },
        uSunW: { value: SUN.clone() }, uSunV: { value: SUN.clone() },
        uBase: { value: srgb(0x394050) }, uMid: { value: srgb(0x687082) }, uTop: { value: srgb(0xBDC2CA) }, uWarm: { value: srgb(0x2A1C0C) },
        uFlash: { value: 0 }, uBolt: { value: new THREE.Vector3(2, 1, 0) }, uOpacity: { value: 1 }, uTime: { value: 0 }
      },
      vertexShader: [
        'attribute vec3 iPos;', 'attribute vec4 iData;', 'attribute vec4 iN;',
        'uniform vec3 uOffset;', 'uniform vec3 uSunW;', 'uniform float uTime;',
        'varying vec2 vUv;', 'varying vec2 vQ;', 'varying float vShade;', 'varying float vA;', 'varying float vH;', 'varying vec3 vW;', 'varying float vDiff;',
        'void main() {',
        '  vec3 wp = iPos + uOffset;',
        '  vec4 mv = viewMatrix * vec4(wp, 1.0);',
        '  float rot = iData.y + uTime * 0.02 * (fract(iData.z * 91.0) - 0.5);',
        '  float c = cos(rot), s = sin(rot);',
        '  vec2 q = position.xy;',
        '  float br = 1.0 + 0.025 * sin(uTime * 0.35 + iData.y * 3.0);',
        '  mv.xy += vec2(q.x, q.y * iN.w) * iData.x * br;',
        '  gl_Position = projectionMatrix * mv;',
        '  vUv = vec2(c * q.x - s * q.y, s * q.x + c * q.y) + 0.5;',
        '  vQ = q; vShade = iData.z; vA = iData.w; vH = (iPos.y - 0.98) / 1.55; vW = wp;',
        '  vDiff = dot(iN.xyz, uSunW);',
        '}'
      ].join('\n'),
      fragmentShader: [
        'uniform sampler2D uTex; uniform vec3 uBase; uniform vec3 uMid; uniform vec3 uTop; uniform vec3 uWarm; uniform vec3 uSunV;',
        'uniform float uFlash; uniform vec3 uBolt; uniform float uOpacity;',
        'varying vec2 vUv; varying vec2 vQ; varying float vShade; varying float vA; varying float vH; varying vec3 vW; varying float vDiff;',
        'void main() {',
        '  vec4 tx = texture2D(uTex, vUv);',
        '  float dens = tx.r;',
        '  if (dens < 0.01) discard;',
        '  vec2 qq = vQ * 2.0;',
        '  vec3 nl = normalize(vec3(qq, sqrt(max(0.0, 1.0 - dot(qq, qq))) + 0.25));',
        '  float l2 = dot(nl, uSunV);',
        '  float lit = clamp(0.42 + 0.38 * vDiff + 0.42 * l2 + (tx.g - 0.5) * 0.4, 0.0, 1.0);',
        '  float h = clamp(vH + vQ.y * 0.12, 0.0, 1.0);',
        '  float under = smoothstep(0.0, 0.16, h);',
        '  vec3 shadowC = mix(uBase, mix(uBase, uMid, 0.55), under);',
        '  vec3 litC = mix(uMid, uTop, smoothstep(0.1, 0.85, h));',
        '  vec3 col = mix(shadowC, litC, lit * (0.35 + 0.65 * under));',
        '  col += uWarm * pow(lit, 2.0) * smoothstep(0.25, 1.0, h);',
        '  col *= 1.0 + vShade;',
        '  col = mix(col, col * 0.9 + 0.08, (1.0 - tx.b) * 0.3);',
        '  float fd = distance(vW, uBolt);',
        '  col += vec3(0.62, 0.66, 0.8) * uFlash * exp(-fd * fd / 0.32) * (1.0 - 0.4 * under);',
        '  gl_FragColor = vec4(col, dens * vA * uOpacity);',
        '}'
      ].join('\n'),
      transparent: true, depthWrite: false
    });
    var cloud = new THREE.Mesh(cg, cloudMat);
    cloud.frustumCulled = false;
    cloud.renderOrder = 5;
    v.scene.add(cloud);

    /* rain shaft beside the strike */
    var rainTex = dataTexture(64, 128, function (u, w) {
      var col = Math.floor(u * 64);
      var s = hash2(col, 3, 5) > 0.55 ? 0.6 + 0.4 * hash2(col, 9, 2) : 0.15 * hash2(col, 1, 7);
      var n = fbm(u * 3, w * 6, 4, 3);
      return [s * (0.6 + 0.4 * n), n, 0];
    }, true);
    var rainMat = new THREE.ShaderMaterial({
      uniforms: { uTex: { value: rainTex }, uTime: { value: 0 }, uColor: { value: srgb(0x737D8E) }, uOpacity: { value: 0.26 }, uFlash: { value: 0 } },
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: [
        'uniform sampler2D uTex; uniform float uTime; uniform vec3 uColor; uniform float uOpacity; uniform float uFlash;',
        'varying vec2 vUv;',
        'void main() {',
        '  vec2 uv = vec2(vUv.x * 1.3 + vUv.y * 0.16, vUv.y * 0.5 + uTime * 0.6);',
        '  float s = texture2D(uTex, uv).r;',
        '  float side = smoothstep(0.0, 0.3, vUv.x) * smoothstep(1.0, 0.62, vUv.x);',
        '  float vert = smoothstep(0.0, 0.55, vUv.y) * smoothstep(1.0, 0.9, vUv.y);',
        '  float a = (0.55 + 0.45 * s) * side * vert * uOpacity;',
        '  gl_FragColor = vec4(uColor + uFlash * 0.25, a);',
        '}'
      ].join('\n'),
      transparent: true, depthWrite: false
    });
    var rain = new THREE.Mesh(new THREE.PlaneGeometry(0.75, 1.06), rainMat);
    rain.renderOrder = 4;
    v.scene.add(rain);

    /* --- lightning: three seeded branching variants --- */
    function boltVariant(seed) {
      var r = K.rng(seed);
      function md(p0, p1, depth, rough, out) {
        if (depth === 0) { out.push(p0); return; }
        var dx = p1[0] - p0[0], dy = p1[1] - p0[1], len = Math.sqrt(dx * dx + dy * dy) || 1e-6;
        var off = (r() * 2 - 1) * rough * len;
        var m = [(p0[0] + p1[0]) / 2 - dy / len * off, (p0[1] + p1[1]) / 2 + dx / len * off, (p0[2] + p1[2]) / 2 + (r() * 2 - 1) * rough * len * 0.4];
        md(p0, m, depth - 1, rough, out);
        md(m, p1, depth - 1, rough, out);
      }
      var top = [0.06 + (r() - 0.5) * 0.16, 1.03, -0.05], main = [];
      md(top, [0, 0, 0], 6, 0.2, main);
      main.push([0, 0, 0]);
      var lines = [{ pts: main, alpha: 1 }];
      var nb = 5 + Math.floor(r() * 3);
      for (var b = 0; b < nb; b++) {
        var i0 = Math.floor((0.1 + r() * 0.5) * main.length), p0 = main[i0];
        var side = r() < 0.5 ? -1 : 1, ang = side * (0.45 + r() * 0.6), L = 0.1 + r() * 0.22;
        var p1 = [p0[0] + Math.sin(ang) * L, p0[1] - Math.cos(ang) * L, p0[2] + (r() - 0.5) * 0.08];
        var bp = [];
        md(p0, p1, 4, 0.24, bp);
        bp.push(p1);
        var al = new Float32Array(bp.length);
        for (var k = 0; k < bp.length; k++) al[k] = 0.75 * (1 - k / bp.length) + 0.05;
        lines.push({ pts: bp, alpha: al });
      }
      return lines;
    }
    var boltHaloMat = lineMaterial({ color: 0x9FB2F5, opacity: 0, width: 26 });
    var boltGlowMat = lineMaterial({ color: 0xC3CEFF, opacity: 0, width: 10 });
    var boltCoreMat = lineMaterial({ color: 0xFFFFFF, opacity: 0, width: 2.6 });
    var bolts = [];
    for (var bv = 0; bv < 3; bv++) {
      var bg = lineGeometry(boltVariant(101 + bv * 7));
      var grp = new THREE.Group();
      var hm = new THREE.Mesh(bg, boltHaloMat), gm = new THREE.Mesh(bg, boltGlowMat), cm = new THREE.Mesh(bg, boltCoreMat);
      hm.renderOrder = 7.5; gm.renderOrder = 8; cm.renderOrder = 9;
      hm.frustumCulled = gm.frustumCulled = cm.frustumCulled = false;
      grp.add(hm); grp.add(gm); grp.add(cm);
      grp.visible = false;
      v.scene.add(grp);
      bolts.push(grp);
    }
    var flashLight = new THREE.PointLight(0xDCE3FF, 0, 4.5, 1.3);
    v.scene.add(flashLight);
    var strikeGlow = glowSprite('#E6ECFF', 0.22, 0);
    strikeGlow.renderOrder = 9;
    v.scene.add(strikeGlow);

    /* --- sound wavefront: thin translucent hemisphere + ground ring --- */
    var shellMat = new THREE.ShaderMaterial({
      uniforms: { uColor: { value: srgb(0xFFF8EE) }, uOpacity: { value: 0 } },
      vertexShader: [
        'varying vec3 vN; varying vec3 vV;',
        'void main() {',
        '  vec4 wp = modelMatrix * vec4(position, 1.0);',
        '  vN = normalize(mat3(modelMatrix) * normal);',
        '  vV = normalize(cameraPosition - wp.xyz);',
        '  gl_Position = projectionMatrix * viewMatrix * wp;',
        '}'
      ].join('\n'),
      fragmentShader: [
        'uniform vec3 uColor; uniform float uOpacity;',
        'varying vec3 vN; varying vec3 vV;',
        'void main() {',
        '  float f = 1.0 - abs(dot(normalize(vN), normalize(vV)));',
        '  float a = uOpacity * (0.07 + 0.85 * pow(f, 3.2));',
        '  gl_FragColor = vec4(uColor, a);',
        '}'
      ].join('\n'),
      transparent: true, depthWrite: false
    });
    var shell = new THREE.Mesh(new THREE.SphereGeometry(1, 80, 30, 0, TAU, 0, Math.PI / 2), shellMat);
    shell.renderOrder = 6;
    shell.visible = false;
    v.scene.add(shell);
    var circlePts = [];
    for (var ci = 0; ci <= 160; ci++) circlePts.push([Math.cos(ci / 160 * TAU), 0, Math.sin(ci / 160 * TAU)]);
    var ringMat = lineMaterial({ color: 0xFFF8EE, opacity: 0, width: 1.6 });
    var ring = new THREE.Mesh(lineGeometry([{ pts: circlePts }]), ringMat);
    ring.renderOrder = 7; ring.frustumCulled = false; ring.visible = false;
    v.scene.add(ring);
    var rippleMat = lineMaterial({ color: 0xFFF8EE, opacity: 0, width: 1.4 });
    var ripple = new THREE.Mesh(lineGeometry([{ pts: circlePts }]), rippleMat);
    ripple.renderOrder = 7; ripple.frustumCulled = false; ripple.visible = false;
    v.scene.add(ripple);
    var lineMats = [boltHaloMat, boltGlowMat, boltCoreMat, ringMat, rippleMat];

    /* --- labels --- */
    var kmLabels = [];
    for (var kl = 0; kl <= 3; kl++) {
      kmLabels.push(setTitleStyle(v.label(kl + ' km', { at: [kl, 0, 0.05], cls: 'value', dy: 17 }), { fontSize: wideBox ? '17px' : '13px', fontWeight: '700', color: '#FFFFFF', textShadow: '0 1px 2px rgba(20,26,14,.65), 0 0 4px rgba(20,26,14,.45)' }));
    }
    var houseTop = new THREE.Vector3(-0.14, 0.22, -0.17);
    var counter = setTitleStyle(v.label('0,0 s', { at: houseTop, cls: 'value', dy: -24 }), { fontSize: wideBox ? '32px' : '22px', fontWeight: '600', letterSpacing: '.01em' });
    var lightLabel = v.label('Işık: hemen ulaşır (saniyede 300.000 km)', { at: [-0.1, 0.02, -0.02], cls: 'chip', dx: -46, dy: 64, align: 'left', line: true });
    var heardLabel = setTitleStyle(v.label('Ses ulaştı', { at: houseTop, cls: 'name chip', dx: 44, dy: -24, align: 'left' }), { color: P.copper });
    var waveAt = new THREE.Vector3();
    var waveLabel = v.label('Ses: saniyede 343 m', { at: waveAt, cls: 'chip', dy: -18 });
    [lightLabel, heardLabel, waveLabel].forEach(function (L) { if (wideBox) L.el.style.fontSize = '16px'; labelOpacity(L, 0); });

    /* --- state --- */
    var D = 2, Dfrom = 2, Dt0 = -10, DTW = 1.4, Dvis = 2;
    var camFrom = null, camTo = null;   /* camera tween, driven by frame() time like the cloud's */
    var cycleStart = 0, cycleIdx = 0, lastT = 0, restartAt = -1, prev = null;
    function travel(d) { return d / SOUND; }
    function cycleLen(d) { return STRIKE + travel(d) + HOLD + 0.7; }
    function fmtS(x) { return K.num(Math.floor(x * 10 + 1e-6) / 10, 1) + ' s'; }

    function flashEnv(ts) {
      /* leader flash, a short dark gap, then a weaker return stroke with a long afterglow */
      if (ts < 0 || ts > 0.55) return 0;
      var a = 0;
      if (ts < 0.025) a = ts / 0.025;
      else if (ts < 0.07) a = 1;
      else a = Math.exp(-(ts - 0.07) / 0.03);
      var u = ts - 0.14, b = 0;
      if (u > 0) b = 0.72 * Math.min(1, u / 0.015) * Math.exp(-u / 0.07);
      return Math.max(a, b);
    }

    var tmpV = new THREE.Vector3();

    function frame(t, dt) {
      lastT = t;
      Dvis = lerp(Dfrom, D, E.inOut(span(t, Dt0, Dt0 + DTW)));
      if (camTo) {
        var ck = E.inOut(span(t, Dt0, Dt0 + DTW));
        v.setView({ distance: lerp(camFrom.distance, camTo.distance, ck), target: [lerp(camFrom.target[0], camTo.target[0], ck), lerp(camFrom.target[1], camTo.target[1], ck), lerp(camFrom.target[2], camTo.target[2], ck)] });
        if (ck >= 1) camTo = null;
      }
      if (restartAt >= 0) { cycleStart = restartAt; restartAt = -1; }
      var tau = t - cycleStart;
      var L = cycleLen(D);
      if (!reduced && tau >= L) { var nwrap = Math.floor(tau / L); cycleStart += nwrap * L; cycleIdx += nwrap; tau = t - cycleStart; }
      var T = travel(D);
      if (reduced) tau = STRIKE + T + 0.8;
      var ts = tau - STRIKE;                 /* time since the flash */
      var arrived = ts >= T;
      var sinceArr = ts - T;
      var endFade = 1 - sstep(T + HOLD, T + HOLD + 0.6, ts);

      /* cloud, rain and bolt follow the (tweened) strike distance */
      cloudMat.uniforms.uOffset.value.set(Dvis + Math.sin(t * 0.05) * 0.03, 0, 0);
      cloudMat.uniforms.uTime.value = reduced ? 0 : t;
      rain.position.set(Dvis + 0.62, 0.5, -0.22);
      stormU.value.set(Dvis + 0.4, 0, -0.45);
      rain.quaternion.copy(v.camera.quaternion);
      rainMat.uniforms.uTime.value = reduced ? 0 : t;

      var f = reduced ? 0 : flashEnv(ts);
      var variant = cycleIdx % bolts.length;
      for (var b = 0; b < bolts.length; b++) {
        bolts[b].visible = f > 0.001 && b === variant;
        bolts[b].position.set(Dvis, 0, 0);
      }
      boltCoreMat.uniforms.uOpacity.value = f;
      boltGlowMat.uniforms.uOpacity.value = 0.7 * f;
      boltHaloMat.uniforms.uOpacity.value = 0.22 * f * f;
      flashLight.intensity = 2.4 * f;
      flashLight.position.set(Dvis + 0.05, 0.55, 0.35);
      strikeGlow.position.set(Dvis, 0.02, 0.01);
      strikeGlow.material.opacity = 0.9 * f;
      cloudMat.uniforms.uFlash.value = f;
      v.camera.updateMatrixWorld();
      cloudMat.uniforms.uSunV.value.copy(SUN).transformDirection(v.camera.matrixWorldInverse);
      cloudMat.uniforms.uBolt.value.set(Dvis + 0.05, 1.05, 0);
      rainMat.uniforms.uFlash.value = f;
      skyMat.uniforms.uFlash.value = f;
      skyMat.uniforms.uBolt.value.set(Dvis + 0.05, 1.0, 0).sub(v.camera.position);
      v.exposure = 1 + 0.12 * f;

      /* the event being shown: the current cycle, or (right after a distance change, before the
       * next strike) the previous event fading out where it happened */
      var evTs = ts, evT = T, evX = Dvis, evA = 1, oldEvent = false;
      if (tau < 0 && prev && t - prev.t0 < 0.6) {
        oldEvent = true;
        evTs = prev.ts + (t - prev.t0); evT = prev.T; evX = prev.x; evA = 1 - sstep(0, 0.5, t - prev.t0);
      }
      /* sound shell */
      var r = Math.max(0.0001, SOUND * evTs);
      var shellOn = evTs > 0 && (tau >= 0 || oldEvent);
      var shellA = shellOn ? sstep(0, 0.25, evTs) * (1 - sstep(evT, evT + 1.3, evTs)) * evA : 0;
      shell.visible = shellA > 0.002;
      shell.position.set(evX, 0, 0);
      shell.scale.set(r, r, r);
      shellMat.uniforms.uOpacity.value = 0.55 * shellA;
      ring.visible = shell.visible;
      ring.position.set(evX, 0.006, 0);
      ring.scale.set(r, 1, r);
      ringMat.uniforms.uOpacity.value = 0.85 * shellA;

      /* arrival: window rattle and a ripple at the house */
      var rat = arrived && sinceArr < 1.0 && !reduced ? Math.exp(-sinceArr * 4.5) * Math.sin(sinceArr * TAU * 7) : 0;
      win.position.x = -0.075 + rat * 0.0035;
      win2.position.x = -0.035 - rat * 0.003;
      win.rotation.z = rat * 0.06; win2.rotation.z = -rat * 0.05;
      house.position.x = rat * 0.0012;
      var rp = arrived ? span(sinceArr, 0, 1.4) : 0;
      ripple.visible = arrived && rp < 1 && !reduced;
      ripple.position.set(-0.08, 0.006, -0.1);
      ripple.scale.set(0.06 + 0.32 * E.out(rp), 1, 0.06 + 0.32 * E.out(rp));
      rippleMat.uniforms.uOpacity.value = 0.9 * (1 - rp);

      /* labels (every change of visibility is a fade) */
      var evArr = evTs >= evT, evEnd = 1 - sstep(evT + HOLD, evT + HOLD + 0.6, evTs);
      var shown = evTs >= 0 ? Math.min(evTs, evT) : 0;
      var cA;
      if (oldEvent) cA = (evTs >= 0 ? evEnd : 0.45) * evA;
      else if (tau < 0) cA = prev ? 0.45 * sstep(prev.t0 + 0.5, prev.t0 + 0.9, t) : 0.45;
      else if (ts < 0) cA = 0.45 * sstep(0, 0.4, tau);
      else cA = endFade;
      if (!oldEvent && tau < 0) shown = 0;
      counter.set(fmtS(shown));
      labelOpacity(counter, cA);
      counter.el.style.color = evArr && evTs >= 0 && (tau >= 0 || oldEvent) ? P.copper : P.ink;
      labelOpacity(lightLabel, (tau >= 0 || oldEvent) ? sstep(0.05, 0.3, evTs) * evEnd * evA : 0);
      labelOpacity(heardLabel, (tau >= 0 || oldEvent) && evArr ? sstep(evT, evT + 0.25, evTs) * evEnd * evA : 0);
      waveAt.set(evX - r, 0.04, 0.0);
      var evD = oldEvent ? prev.d : D;
      labelOpacity(waveLabel, (tau >= 0 || oldEvent) && evTs > 0 ? sstep(0.25, 0.7, evTs) * (1 - sstep(evD - 0.62, evD - 0.42, r)) * evA : 0);
      if (reduced) { labelOpacity(counter, 1); }

      syncRes(v, lineMats);
      sky.position.copy(v.camera.position);
      v.render(dt);

      if (!K.skipRender) {
        var ctx = v.ctx;
        K.label(ctx, 'mesafeler ölçekli · ev ve direkler büyütülmüş', v.w - 14, v.h - 14, { size: wideBox ? 13 : 10.5, mono: true, color: 'rgba(250,248,243,0.82)', align: 'right', spacing: 0.4 });
      }
    }

    function setDistance(d) {
      d = Math.round(clamp(+d || 2, 1, 3));
      if (d === D) return;
      /* remember the event in progress so it can fade out where it is */
      var tsNow = lastT - cycleStart - STRIKE;
      prev = { t0: lastT, ts: tsNow, T: travel(D), x: Dvis, d: D };
      Dfrom = Dvis; D = d; Dt0 = lastT;
      restartAt = lastT + DTW + 0.35 - STRIKE;
      cycleIdx++;
      var to = viewFor(d);
      v.home.target.fromArray(to.target); v.home.distance = to.distance;   /* double-click returns to this framing */
      camFrom = { distance: v.view.distance, target: v.view.target.toArray() }; camTo = to;
    }

    return {
      reset: function () {
        D = 2; Dfrom = 2; Dvis = 2; Dt0 = -10; cycleStart = 0; cycleIdx = 0; lastT = 0; restartAt = -1; prev = null; camTo = null;
        v.home.target.fromArray(HOME.target); v.home.distance = HOME.distance;
        v.setView({ yaw: HOME.yaw, pitch: HOME.pitch, distance: HOME.distance, target: HOME.target });
      },
      frame: frame,
      set: function (k, val) { if (k === 'distance') setDistance(val); },
      read: function (k) {
        var T = travel(D), Tr = Math.round(T * 10) / 10;
        if (k === 'time') return K.num(Tr, 1) + ' s';
        if (k === 'formula') return K.num(D * 1000, 0) + ' m ÷ 343 m/s ≈ ' + K.num(Tr, 1) + ' s';
        if (k === 'rule') return 'Pratik kural: ' + K.num(Tr, 1) + ' s ÷ 3 ≈ ' + K.num(Math.round(Tr / 3 * 10) / 10, 1) + ' km';
        if (k === 'distance') return D + ' km';
        return '';
      },
      dispose: function () { v.dispose(); }
    };
  });

  /* ------------------------------------------------------------------
   * Small-tile helpers (op-* cards)
   * ------------------------------------------------------------------ */

  /* Canvas texture for printed markings, redrawn once the embedded fonts are ready. */
  function printTexture(w, h, draw) {
    var tex = K.textTexture(w, h, draw);
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(function () {
        var c = tex.image, ctx = c.getContext('2d');
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, w, h);
        draw(ctx, w, h);
        tex.needsUpdate = true;
      });
    }
    return tex;
  }

  function tileStage(el, o) {
    /* wide focus-slide boxes (1120 x 440) show the same scene closer so the objects fill the frame */
    var bw = parseFloat(el.style.width) || el.clientWidth || 208, bh = parseFloat(el.style.height) || el.clientHeight || 150;
    var wide = bw / bh > 1.9 ? (o.wideK || 0.62) : 1;
    o.distance = (o.distance || 20) * wide;
    var v = K.stage3d(el, {
      theme: o.theme || 'card', fov: o.fov || 24, orbit: false, yaw: o.yaw || 0, pitch: o.pitch || 0.4,
      distance: o.distance || 20, target: o.target || [0, 0, 0], size: o.size || 4,
      ground: o.ground === undefined ? 0 : o.ground, shadows: o.shadows, near: o.near || 0.5, far: o.far || 400
    });
    v.wide = wide < 1 || bw / bh > 1.9;
    if (v.lights) {
      v.lights.key.shadow.mapSize.set(1024, 1024);
      v.lights.key.shadow.radius = 4;
    }
    return v;
  }

  function tileLabel(v, text, o) {
    var L = v.label(text, o);
    L.el.style.fontSize = v.wide ? Math.max(18, parseFloat(o.size || '12px') * 1.45) + 'px' : (o.size || '12px');
    if (o.color) L.el.style.color = o.color;
    if (o.weight) L.el.style.fontWeight = o.weight;
    labelOpacity(L, 0);
    return L;
  }

  /* --- AA alkaline cell, 50,5 × 14,5 mm (units: cm), axis along +y, + end up --- */
  var aaLabelTex = null;
  function aaCell() {
    var THREE = window.THREE;
    if (!aaLabelTex) {
      aaLabelTex = printTexture(1024, 1024, function (ctx, w, h) {
        ctx.fillStyle = '#22252C';
        ctx.fillRect(0, 0, w, h);
        ctx.save();
        ctx.translate(w / 2, h / 2);
        ctx.rotate(-Math.PI / 2);
        /* X runs along the cell (− end −512 … + end +512); Y runs around it (0 faces the viewer) */
        ctx.fillStyle = '#B85E31';
        ctx.fillRect(262, -520, 260, 1040);
        ctx.fillStyle = 'rgba(244,242,236,0.6)';
        ctx.fillRect(252, -520, 5, 1040);
        ctx.fillStyle = '#F4F2EC';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = '600 168px "IBM Plex Mono", Consolas, monospace';
        ctx.fillText('1,5 V', -52, 6);
        ctx.font = '600 92px "IBM Plex Sans", "Segoe UI", sans-serif';
        ctx.fillText('AA', -392, 4);
        ctx.fillStyle = 'rgba(244,242,236,0.55)';
        ctx.fillRect(-470, 118, 700, 3);
        ctx.fillRect(-470, -121, 700, 3);
        /* + mark on the copper band, − mark at the flat end */
        ctx.fillStyle = '#22252C';
        ctx.fillRect(392 - 46, -9, 92, 18);
        ctx.fillRect(392 - 9, -46, 18, 92);
        ctx.restore();
      });
      aaLabelTex.anisotropy = 8;
    }
    var g = new THREE.Group();
    var labelMat = new THREE.MeshPhysicalMaterial({ map: aaLabelTex, roughness: 0.4, metalness: 0, clearcoat: 0.55, clearcoatRoughness: 0.22, envMapIntensity: 0.7 });
    var sleeve = mesh(new THREE.CylinderGeometry(0.725, 0.725, 4.62, 72, 1, true), labelMat, true, true);
    sleeve.rotation.y = Math.PI;
    g.add(sleeve);
    var darkFilm = new THREE.MeshPhysicalMaterial({ color: 0x22252C, roughness: 0.4, clearcoat: 0.55, clearcoatRoughness: 0.22, envMapIntensity: 0.7 });
    var copperFilm = new THREE.MeshPhysicalMaterial({ color: 0xB85E31, roughness: 0.4, clearcoat: 0.55, clearcoatRoughness: 0.22, envMapIntensity: 0.7 });
    var shB = mesh(lathe([[0.6, -2.47], [0.66, -2.455], [0.705, -2.42], [0.722, -2.37], [0.725, -2.31]], 72), darkFilm, true, true);
    var shT = mesh(lathe([[0.725, 2.31], [0.722, 2.36], [0.705, 2.41], [0.665, 2.44], [0.61, 2.452]], 72), copperFilm, true, true);
    g.add(shB); g.add(shT);
    var steel = K.mat.steel({ roughness: 0.2, color: 0xC4C8CE });
    var capB = mesh(lathe([[0, -2.525], [0.46, -2.525], [0.53, -2.515], [0.575, -2.495], [0.6, -2.47]], 72), steel, true, true);
    var ring = mesh(lathe([[0.595, -2.47], [0.62, -2.462]], 72), K.mat.std(0x16181C, 0.6, 0), false, true);
    var capT = mesh(lathe([[0.61, 2.452], [0.56, 2.458], [0.36, 2.462], [0.3, 2.468], [0.282, 2.48], [0.276, 2.505], [0.262, 2.522], [0.2, 2.525], [0, 2.525]], 72), steel, true, true);
    g.add(capB); g.add(ring); g.add(capT);
    return g;
  }

  /* ==================================================================
   * op-add · T 208×150 · card — 1,5 V + 1,5 V = 3 V (two AA cells in series)
   * ================================================================== */
  K.register('op-add', function (el, opts) {
    var THREE = window.THREE;
    var v = tileStage(el, { yaw: 0.16, pitch: 0.36, distance: 22.5, target: [0, 1.9, 0], size: 6 });
    var reduced = K.reducedMotion;
    var A = aaCell(), B = aaCell();
    A.rotation.z = B.rotation.z = -Math.PI / 2;
    A.position.y = B.position.y = 0.725;
    v.scene.add(A); v.scene.add(B);
    var lsum = tileLabel(v, '3 V', { at: [0, 1.5, 0], cls: 'value', dy: -44, size: '15px', weight: '600', color: P.copper });
    var GAP = 1.1;
    var pA = new THREE.Vector3(), pB = new THREE.Vector3();

    function frame(t, dt) {
      var ph = reduced ? 4 : t % 6;
      var apart = 1 - E.inOut(span(ph, 1.5, 2.7)) + E.inOut(span(ph, 5.25, 6.0));
      if (t < 6 && !reduced) apart = Math.max(apart, 1 - E.inOut(span(t, 1.5, 2.7)));
      A.position.x = -2.525 - apart * GAP;
      B.position.x = 2.525 + apart * GAP;
      var joined = 1 - sstep(0.0, 0.04, apart);
      var sumA = reduced ? 1 : sstep(2.8, 3.15, ph) * (1 - sstep(5.05, 5.35, ph)) * joined;
      labelOpacity(lsum, sumA);
      v.render(dt);
      if (!K.skipRender && sumA > 0.01) {
        /* bracket spanning the joined pair */
        var c = v.ctx;
        pA.set(A.position.x - 2.525, 1.5, 0); pB.set(B.position.x + 2.525, 1.5, 0);
        var a = v.project(pA), b = v.project(pB);
        var y = Math.min(a.y, b.y) - 26;
        c.save();
        c.globalAlpha = sumA;
        c.strokeStyle = 'rgba(166,75,34,0.85)';
        c.lineWidth = 1.2;
        c.beginPath();
        c.moveTo(a.x, y + 7); c.lineTo(a.x, y); c.lineTo(b.x, y); c.lineTo(b.x, y + 7);
        c.stroke();
        c.restore();
      }
    }
    return {
      reset: function () { },
      frame: frame,
      dispose: function () { v.dispose(); }
    };
  });

  /* --- vertex-colour helper: colour each vertex by a function of its position and normal --- */
  function paintVertices(geo, fn) {
    var THREE = window.THREE;
    var p = geo.attributes.position, n = geo.attributes.normal, c = new Float32Array(p.count * 3), col = new THREE.Color();
    for (var i = 0; i < p.count; i++) {
      fn(p.getX(i), p.getY(i), p.getZ(i), n.getX(i), n.getY(i), n.getZ(i), col);
      c[i * 3] = col.r; c[i * 3 + 1] = col.g; c[i * 3 + 2] = col.b;
    }
    geo.setAttribute('color', new THREE.BufferAttribute(c, 3));
    return geo;
  }

  /* A barn swallow (units: cm). Faces +x, feet at the origin (the top of the perch). */
  function swallow() {
    var THREE = window.THREE;
    var cBack = new THREE.Color(0x1B2235), cBelly = new THREE.Color(0xEFE7D7), cThroat = new THREE.Color(0x7E3A24);
    var featherMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.42, metalness: 0.18, envMapIntensity: 0.9 });
    var darkMat = K.mat.std(0x1C2436, 0.38, 0.22, { envMapIntensity: 0.9 });
    var bird = new THREE.Group();
    var body = new THREE.Group();
    body.position.set(0.2, 2.25, 0);
    body.rotation.z = 0.36;
    bird.add(body);
    /* torso: lathe along y, laid along +x */
    var torsoG = lathe([[0, -4.6], [0.5, -4.2], [1.0, -3.3], [1.42, -2.0], [1.68, -0.6], [1.72, 0.7], [1.58, 1.9], [1.22, 2.9], [0.75, 3.5], [0, 3.75]], 40);
    torsoG.rotateZ(-Math.PI / 2);
    torsoG.scale(1, 1, 0.92);
    paintVertices(torsoG, function (x, y, z, nx, ny, nz, col) {
      var top = sstep(-0.35, 0.3, ny + y * 0.05);
      col.copy(cBelly).lerp(cBack, top);
      if (x > 1.6 && ny < 0.25) col.lerp(cThroat, sstep(1.6, 2.6, x) * (1 - sstep(-0.1, 0.25, ny)));
    });
    var torso = mesh(torsoG, featherMat, true, false);
    body.add(torso);
    /* head */
    var headG = new THREE.SphereGeometry(1.16, 32, 24);
    headG.scale(1.12, 0.98, 0.92);
    paintVertices(headG, function (x, y, z, nx, ny, nz, col) {
      col.copy(cBack);
      var forehead = sstep(0.72, 0.9, nx) * sstep(-0.05, 0.12, ny) * (1 - sstep(0.4, 0.55, ny));
      var throat = sstep(0.2, 0.55, nx) * (1 - sstep(-0.45, -0.1, ny));
      col.lerp(cThroat, Math.max(forehead, throat));
    });
    var head = new THREE.Group();
    head.position.set(3.4, 0.95, 0);
    body.add(head);
    head.add(mesh(headG, featherMat, true, false));
    var beak = mesh(new THREE.ConeGeometry(0.34, 0.95, 16), darkMat, false, false);
    beak.rotation.z = -Math.PI / 2 - 0.12;
    beak.position.set(1.55, -0.16, 0);
    head.add(beak);
    var eyeMat = K.mat.std(0x07080A, 0.12, 0, { envMapIntensity: 1.4 });
    [-1, 1].forEach(function (s) {
      var eye = mesh(new THREE.SphereGeometry(0.17, 12, 10), eyeMat, false, false);
      eye.position.set(0.7, 0.28, s * 0.92);
      head.add(eye);
    });
    /* folded wings: long, pointed, crossing over the tail */
    var wingG = lathe([[0, -5.6], [0.45, -4.6], [0.85, -2.6], [1.05, -0.4], [1.0, 1.6], [0.62, 2.9], [0, 3.3]], 24);
    wingG.rotateZ(-Math.PI / 2);
    wingG.scale(1, 0.62, 0.24);
    [-1, 1].forEach(function (s) {
      var w = mesh(wingG, darkMat, true, false);
      w.position.set(-2.2, 0.55, s * 1.42);
      w.rotation.set(s * 0.06, s * -0.1, -0.12);
      body.add(w);
    });
    /* forked tail with long outer streamers */
    var streamerG = lathe([[0, -4.8], [0.1, -4.0], [0.24, -1.6], [0.36, 0.3], [0.3, 0.9], [0, 1.1]], 12);
    streamerG.rotateZ(-Math.PI / 2);
    streamerG.scale(1, 0.32, 1);
    [-1, 1].forEach(function (s) {
      var st = mesh(streamerG, darkMat, true, false);
      st.position.set(-5.1, 0.05, s * 0.42);
      st.rotation.set(0, s * 0.14, -0.05);
      body.add(st);
    });
    var tailG = lathe([[0, -2.0], [0.55, -1.6], [0.6, 0], [0.42, 0.6], [0, 0.8]], 14);
    tailG.rotateZ(-Math.PI / 2);
    tailG.scale(1, 0.25, 1);
    var tail = mesh(tailG, darkMat, true, false);
    tail.position.set(-4.4, 0.1, 0);
    body.add(tail);
    /* legs and toes gripping the perch */
    var legMat = K.mat.std(0x2A2523, 0.6, 0);
    var feet = [];
    [-1, 1].forEach(function (s) {
      var leg = mesh(new THREE.CylinderGeometry(0.13, 0.15, 1.3, 8), legMat, false, false);
      leg.position.set(0.1, 0.62, s * 0.62);
      bird.add(leg);
      var toe = mesh(new THREE.TorusGeometry(1.46, 0.12, 6, 18, Math.PI * 0.95), legMat, false, false);
      toe.position.set(0.1, -1.35, s * 0.62);
      toe.rotation.z = -Math.PI * 0.12;
      bird.add(toe);
      feet.push(new THREE.Vector3(0.1, 0, s * 0.62));
    });
    bird.head = head;
    bird.body = body;
    bird.feet = feet;
    return bird;
  }

  /* ==================================================================
   * op-sub · T 208×150 · card — 10.000 V − 10.000 V = 0 V (bird on a live conductor)
   * ================================================================== */
  K.register('op-sub', function (el, opts) {
    var THREE = window.THREE;
    var v = tileStage(el, { yaw: 0.6, pitch: 0.03, distance: 80, wideK: 0.7, target: [0, -2.2, 0], size: 30, ground: undefined, fov: 24, near: 1, far: 800 });
    var reduced = K.reducedMotion;
    if (v.lights) { v.lights.key.position.set(25, 50, 60); v.lights.key.intensity = 1.6; }
    /* stranded aluminium conductor resting on two pin insulators (x = ±20 cm) with a slight sag */
    var strandTex = dataTexture(128, 32, function (u, w) {
      var s = (u * 6 + w * 12) % 1;
      var groove = Math.pow(Math.abs(s - 0.5) * 2, 6);
      var g = 1 - groove * 0.85;
      return [g, g, g];
    }, true);
    strandTex.repeat.set(26, 1);
    var R = 1.35, PX = 29;
    function wireY(x) { var ax = Math.abs(x); return ax <= PX ? -0.55 * (1 - (x / PX) * (x / PX)) : -(ax - PX) * 0.05 - 0.0006 * (ax - PX) * (ax - PX); }
    var cpts = [];
    for (var i = 0; i <= 60; i++) {
      var x = -75 + 150 * i / 60;
      cpts.push(new THREE.Vector3(x, wireY(x), 0));
    }
    var wireCurve = new THREE.CatmullRomCurve3(cpts);
    var wireMat = K.mat.aluminium({ color: 0xBFC3C9, roughness: 0.4, map: strandTex, bumpMap: strandTex, bumpScale: 0.3 });
    var wire = mesh(new THREE.TubeGeometry(wireCurve, 200, R, 20, false), wireMat, true, true);
    v.scene.add(wire);
    function wireTopAt(x) { return wireY(x) + R; }

    /* glazed porcelain pin insulators on steel pins, conductor tied into the top groove */
    var porcelain = new THREE.MeshPhysicalMaterial({ color: 0x5E3221, roughness: 0.2, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.08, envMapIntensity: 1.25 });
    var pinG = lathe([[0, 0], [2.4, -0.1], [3.2, -0.6], [3.4, -1.4], [2.8, -2.2], [3.4, -3.0], [3.8, -3.8], [8.4, -6.4], [8.6, -6.9], [7.8, -7.15], [4.6, -6.7], [4.8, -8.6], [6.8, -10.4], [7.0, -10.8], [6.2, -11.05], [4.2, -10.7], [3.8, -14.2], [4.0, -14.6], [1.7, -14.6], [0, -14.6]], 64);
    var steelPin = K.mat.zinc({ roughness: 0.4 });
    var tieMat = K.mat.aluminium({ color: 0xB0B5BC, roughness: 0.35 });
    [-1, 1].forEach(function (s) {
      var xs = s * PX;
      var ins = new THREE.Group();
      ins.position.set(xs, -R + 0.15, 0);
      ins.add(mesh(pinG, porcelain, true, true));
      var pin = mesh(new THREE.CylinderGeometry(1.3, 1.5, 30, 16), steelPin, true, false);
      pin.position.y = -14.6 - 15;
      ins.add(pin);
      v.scene.add(ins);
      for (var k = -2; k <= 2; k++) {
        if (k === 0) continue;
        var tie = mesh(new THREE.TorusGeometry(R + 0.22, 0.2, 8, 24), tieMat, false, false);
        tie.rotation.y = Math.PI / 2;
        tie.position.set(xs + k * 1.1, wireY(xs + k * 1.1), 0);
        v.scene.add(tie);
      }
    });

    var bird = swallow();
    bird.rotation.y = -2.09;
    bird.scale.setScalar(1.15);
    bird.position.set(0, wireTopAt(0), 0);
    v.scene.add(bird);
    var footL = new THREE.Vector3(), footR = new THREE.Vector3(), mid = new THREE.Vector3();
    var lL = tileLabel(v, '10.000 V', { at: footL, cls: 'value', dx: v.wide ? -92 : -32, dy: v.wide ? 34 : 24, valign: 'top', line: true, size: '12px' });
    var lR = tileLabel(v, '10.000 V', { at: footR, cls: 'value', dx: v.wide ? 92 : 33, dy: v.wide ? 34 : 24, valign: 'top', line: true, size: '12px' });
    var lD = tileLabel(v, '0 V fark', { at: mid, cls: 'value chip', dy: v.wide ? 66 : 46, valign: 'top', size: '12px', weight: '600', color: P.copper });

    function frame(t, dt) {
      var ph = reduced ? 3.5 : t % 6;
      bird.head.rotation.y = reduced ? 0 : Math.sin(t * 0.9) * 0.28 + Math.sin(t * 2.3) * 0.06;
      bird.head.rotation.z = reduced ? 0 : Math.sin(t * 0.7 + 1) * 0.06;
      bird.body.rotation.z = 0.36 + (reduced ? 0 : Math.sin(t * 1.7) * 0.012);
      bird.updateMatrixWorld(true);
      footL.copy(bird.feet[0]); bird.localToWorld(footL);
      footR.copy(bird.feet[1]); bird.localToWorld(footR);
      var lx = footL.x, rx = footR.x;
      if (lx > rx) { var tmp = footL.clone(); footL.copy(footR); footR.copy(tmp); }
      footL.y = footR.y = wireTopAt(0) - 0.4;
      mid.copy(footL).add(footR).multiplyScalar(0.5);
      labelOpacity(lL, reduced ? 1 : sstep(0.5, 0.9, ph) * (1 - sstep(5.3, 5.8, ph)));
      labelOpacity(lR, reduced ? 1 : sstep(1.2, 1.6, ph) * (1 - sstep(5.3, 5.8, ph)));
      labelOpacity(lD, reduced ? 1 : sstep(2.4, 2.9, ph) * (1 - sstep(5.3, 5.8, ph)));
      v.render(dt);
    }
    return { reset: function () { }, frame: frame, dispose: function () { v.dispose(); } };
  });

  /* Flat rounded slab lying in the xz plane (rounded corners seen from above); thickness along y. */
  function flatSlab(w, d, h, r, bevel) {
    var g = roundedBox(w, d, h, r, bevel === undefined ? Math.min(h * 0.45, r * 0.5) : bevel, 4);
    g.rotateX(-Math.PI / 2);
    return g;
  }

  /* ==================================================================
   * op-mul · T 208×150 · card — 5 V × 3 A = 15 W (charger, cable, phone)
   * ================================================================== */
  K.register('op-mul', function (el, opts) {
    var THREE = window.THREE;
    var v = tileStage(el, { yaw: 0.0, pitch: 0.86, distance: 53, wideK: 0.82, target: [-0.6, 0.6, 0.2], size: 12 });
    var reduced = K.reducedMotion;

    /* charger cube: Europlug pins on the left face, USB-C port on the right face */
    var white = K.mat.plasticWhite({ roughness: 0.32, envMapIntensity: 0.9 });
    var charger = new THREE.Group();
    charger.position.set(-8.0, 0, -2.6);
    charger.rotation.y = -0.18;
    v.scene.add(charger);
    var cBody = mesh(roundedBox(3.6, 3.4, 3.0, 0.62, 0.5, 5), white, true, true);
    cBody.position.y = 1.7;
    charger.add(cBody);
    var pinMat = K.mat.steel({ roughness: 0.25 });
    [-0.95, 0.95].forEach(function (z) {
      var pin = mesh(new THREE.CylinderGeometry(0.2, 0.2, 1.9, 16), pinMat, true, true);
      pin.rotation.z = Math.PI / 2;
      pin.position.set(-1.8 - 0.95, 1.7, z * 0.55);
      charger.add(pin);
      var tip = mesh(new THREE.SphereGeometry(0.2, 12, 8), pinMat, false, false);
      tip.position.set(-1.8 - 1.9, 1.7, z * 0.55);
      charger.add(tip);
    });
    var port = mesh(roundedBox(0.92, 0.36, 0.2, 0.16, 0.04, 2), K.mat.std(0x15171C, 0.5, 0.2), false, false);
    port.rotation.y = Math.PI / 2;
    port.position.set(1.79, 1.45, 0);
    charger.add(port);

    /* phone lying screen-up, bottom edge towards the charger */
    var phone = new THREE.Group();
    phone.position.set(4.6, 0, -0.9);
    phone.rotation.y = Math.PI / 2 + 0.06;
    v.scene.add(phone);
    var frameMat = K.mat.std(0x3A3E46, 0.32, 0.85, { envMapIntensity: 1 });
    var pBody = mesh(flatSlab(15.0, 7.2, 0.8, 0.95, 0.3), frameMat, true, true);
    pBody.position.y = 0.4;
    phone.add(pBody);
    var screenMat = new THREE.MeshPhysicalMaterial({ color: 0x0B0D12, roughness: 0.2, metalness: 0, clearcoat: 0.5, clearcoatRoughness: 0.12, emissive: 0x0B1019, emissiveIntensity: 1, envMapIntensity: 0.3 });
    var screen = mesh(flatSlab(14.5, 6.75, 0.04, 0.8, 0.01), screenMat, false, true);
    screen.position.y = 0.81;
    phone.add(screen);
    /* battery icon: outline, terminal cap and a fill that grows */
    var iconMat = new THREE.MeshBasicMaterial({ color: 0xE8EAEE, toneMapped: false });
    var fillMat = new THREE.MeshBasicMaterial({ color: 0xF2C46B, toneMapped: false });
    var icon = new THREE.Group();
    icon.position.set(0.6, 0.84, 0);
    icon.rotation.y = -Math.PI / 2;
    phone.add(icon);
    var IW = 4.6, IH = 2.0, T = 0.16;
    [[0, IH / 2 - T / 2, IW, T], [0, -IH / 2 + T / 2, IW, T], [-IW / 2 + T / 2, 0, T, IH], [IW / 2 - T / 2, 0, T, IH]].forEach(function (b) {
      var bar = new THREE.Mesh(new THREE.BoxGeometry(b[2], 0.02, b[3]), iconMat);
      bar.position.set(b[0], 0, b[1]);
      icon.add(bar);
    });
    var capB = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.02, 0.8), iconMat);
    capB.position.set(IW / 2 + 0.16, 0, 0);
    icon.add(capB);
    var FW = IW - T * 2 - 0.28;
    var fillG = new THREE.BoxGeometry(FW, 0.02, IH - T * 2 - 0.28);
    fillG.translate(FW / 2, 0, 0);
    var fill = new THREE.Mesh(fillG, fillMat);
    fill.position.set(-FW / 2, 0.005, 0);
    icon.add(fill);
    var phonePort = mesh(roundedBox(0.2, 0.3, 0.86, 0.12, 0.04, 2), K.mat.std(0x15171C, 0.5, 0.2), false, false);
    phonePort.position.set(-7.5, 0.4, 0);
    phone.add(phonePort);

    /* USB-C cable from the charger port to the phone port */
    charger.updateMatrixWorld(true); phone.updateMatrixWorld(true);
    var a0 = charger.localToWorld(new THREE.Vector3(1.8 + 1.25, 1.45, 0));
    var b0 = phone.localToWorld(new THREE.Vector3(-7.5 - 1.25, 0.4, 0));
    var dirA = new THREE.Vector3(Math.cos(charger.rotation.y), 0, -Math.sin(charger.rotation.y));
    var cablePts = [a0, a0.clone().addScaledVector(dirA, 0.9).add(new THREE.Vector3(0, -0.5, 0)), new THREE.Vector3(-4.6, 0.2, 2.2), new THREE.Vector3(-2.4, 0.2, 6.6), new THREE.Vector3(1.6, 0.2, 9.0), b0.clone().add(new THREE.Vector3(-0.1, -0.15, 1.0)), b0];
    var cable = K.wire(cablePts, { radius: 0.2, material: K.mat.plasticWhite({ roughness: 0.45 }), segments: 120, tension: 0.5 });
    v.scene.add(cable);
    var plugG = roundedBox(2.4, 0.62, 1.0, 0.28, 0.2, 3);
    var plugA = mesh(plugG, white, true, true);
    plugA.position.copy(charger.localToWorld(new THREE.Vector3(1.8 + 1.2, 1.45, 0)));
    plugA.rotation.y = charger.rotation.y;
    v.scene.add(plugA);
    var plugB = mesh(plugG, white, true, true);
    plugB.position.copy(phone.localToWorld(new THREE.Vector3(-7.5 - 1.2, 0.4, 0)));
    plugB.rotation.y = phone.rotation.y;
    v.scene.add(plugB);

    /* energy pulses travelling along the cable */
    var ND = 8;
    var dots = pointsCloud(ND, { color: 0xDB9128, core: 0xFFF3D6, size: 10, coreR: 0.42 });
    dots.renderOrder = 4;
    v.scene.add(dots);
    var tmpP = new THREE.Vector3();

    var l5 = tileLabel(v, '5 V', { at: [-5.6, 1.6, -2.2], cls: 'value', dx: 4, dy: -26, valign: 'bottom' });
    var l3 = tileLabel(v, '3 A', { at: [-3.4, 0.2, 5.2], cls: 'value', dx: -16, dy: 12, align: 'right' });
    var l15 = tileLabel(v, '15 W', { at: phone.localToWorld(new THREE.Vector3(7.5, 0.9, 0)), cls: 'value', dy: -6, valign: 'bottom', size: '14px', weight: '600', color: P.copper });

    function frame(t, dt) {
      var ph = reduced ? 4.5 : t % 6;
      var flow = reduced ? 1 : sstep(0.3, 0.7, ph) * (1 - sstep(5.3, 5.8, ph));
      for (var i = 0; i < ND; i++) {
        var u = ((reduced ? 0 : t * 0.14) + i / ND) % 1;
        cable.curve.getPointAt(u, tmpP);
        dots.pos[i * 3] = tmpP.x; dots.pos[i * 3 + 1] = tmpP.y + 0.22; dots.pos[i * 3 + 2] = tmpP.z;
        dots.alpha[i] = flow * sstep(0, 0.06, u) * (1 - sstep(0.94, 1, u));
        dots.size[i] = 10;
      }
      dots.commit();
      var lev = reduced ? 0.8 : lerp(0.12, 1, E.inOut(span(ph, 0.6, 5.2)) * (1 - E.inOut(span(ph, 5.45, 5.95))));
      fill.scale.x = Math.max(0.001, lev);
      labelOpacity(l5, reduced ? 1 : sstep(0.5, 0.9, ph) * (1 - sstep(5.3, 5.8, ph)));
      labelOpacity(l3, reduced ? 1 : sstep(1.1, 1.5, ph) * (1 - sstep(5.3, 5.8, ph)));
      labelOpacity(l15, reduced ? 1 : sstep(2.3, 2.8, ph) * (1 - sstep(5.3, 5.8, ph)));
      syncRes(v, [dots.material]);
      v.render(dt);
      if (!K.skipRender) smallTag(v, 'zaman ölçekli değil', 6, v.h - 6);
    }
    return { reset: function () { }, frame: frame, dispose: function () { v.dispose(); } };
  });

  /* --- 9 V battery, 26,5 × 48,5 × 17,5 mm (units: cm), standing, terminals on top (+ round, − hexagonal) --- */
  var nineTex = null;
  function nineVolt() {
    var THREE = window.THREE;
    if (!nineTex) {
      nineTex = printTexture(256, 448, function (ctx, w, h) {
        ctx.fillStyle = '#22252C'; ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = '#B85E31'; ctx.fillRect(0, 0, w, 74);
        ctx.fillStyle = 'rgba(244,242,236,0.6)'; ctx.fillRect(0, 74, w, 3);
        ctx.fillStyle = '#F4F2EC';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.font = '600 118px "IBM Plex Mono", Consolas, monospace';
        ctx.fillText('9 V', w / 2, 228);
        ctx.fillStyle = 'rgba(244,242,236,0.55)';
        ctx.fillRect(34, 318, w - 68, 3);
        ctx.font = '500 30px "IBM Plex Sans", "Segoe UI", sans-serif';
        ctx.fillText('alkalin', w / 2, 360);
        ctx.fillStyle = '#22252C';
        ctx.font = '600 52px "IBM Plex Mono", Consolas, monospace';
        ctx.fillText('+', 64, 38);
        ctx.fillText('−', w - 64, 38);
      });
    }
    var g = new THREE.Group();
    var film = new THREE.MeshPhysicalMaterial({ color: 0x22252C, roughness: 0.4, clearcoat: 0.5, clearcoatRoughness: 0.2, envMapIntensity: 0.7 });
    var body = mesh(roundedBox(2.65, 4.6, 1.75, 0.28, 0.16, 3), film, true, true);
    body.position.y = 2.3;
    g.add(body);
    var face = mesh(new THREE.PlaneGeometry(2.3, 4.1), new THREE.MeshPhysicalMaterial({ map: nineTex, roughness: 0.4, clearcoat: 0.5, clearcoatRoughness: 0.2, envMapIntensity: 0.7 }), false, true);
    face.position.set(0, 2.3, 0.876);
    g.add(face);
    var steel = K.mat.steel({ roughness: 0.24, color: 0xC4C8CE });
    var top = mesh(roundedBox(2.5, 0.26, 1.6, 0.22, 0.08, 2), steel, true, true);
    top.position.y = 4.7;
    g.add(top);
    var plus = mesh(lathe([[0, 0], [0.3, 0], [0.31, 0.06], [0.27, 0.2], [0.3, 0.28], [0.22, 0.34], [0, 0.34]], 24), steel, true, false);
    plus.position.set(-0.635, 4.83, 0);
    g.add(plus);
    var minus = mesh(new THREE.CylinderGeometry(0.44, 0.44, 0.3, 6), steel, true, false);
    minus.position.set(0.635, 4.98, 0);
    g.add(minus);
    var hole = mesh(new THREE.CylinderGeometry(0.26, 0.26, 0.02, 20), K.mat.std(0x30333A, 0.5, 0.6), false, false);
    hole.position.set(0.635, 5.135, 0);
    g.add(hole);
    g.plusTop = new THREE.Vector3(-0.635, 5.15, 0);
    g.minusTop = new THREE.Vector3(0.635, 5.15, 0);
    return g;
  }

  /* --- axial carbon-film resistor with IEC 60062 bands (units: cm). Axis along x. --- */
  var BAND = { black: 0x1B1B1B, brown: 0x6B3A1F, red: 0xC42B1C, orange: 0xE07A1F, yellow: 0xE8C21A, green: 0x2E8B3A, blue: 0x2A58C7, violet: 0x7A3BB0, grey: 0x8A8A8A, white: 0xF2F2F2 };
  function resistor(L, D, bands, leadLen) {
    var THREE = window.THREE;
    var g = new THREE.Group();
    var r = D / 2, h = L / 2;
    var prof = [[0, -h], [r * 0.7, -h + 0.01], [r * 0.98, -h + r * 0.35], [r, -h + r * 0.8], [r * 0.93, -h + r * 1.5], [r * 0.9, -h + r * 2.1], [r * 0.9, h - r * 2.1], [r * 0.93, h - r * 1.5], [r, h - r * 0.8], [r * 0.98, h - r * 0.35], [r * 0.7, h - 0.01], [0, h]];
    var bodyG = lathe(prof, 32);
    bodyG.rotateZ(-Math.PI / 2);
    g.add(mesh(bodyG, K.mat.ceramic({ color: 0xE3D2B0, roughness: 0.5, envMapIntensity: 0.7 }), true, true));
    var pos = [-h + L * 0.27, -h + L * 0.4, -h + L * 0.53, h - L * 0.22];
    bands.forEach(function (b, i) {
      var isGold = b === 'gold';
      var m = isGold ? K.mat.gold({ color: 0xC9A13B, roughness: 0.3 }) : K.mat.std(BAND[b], 0.45, 0);
      var rr = i === 0 ? r * 0.93 + 0.004 : r * 0.9 + 0.004;
      var band = mesh(new THREE.CylinderGeometry(rr, rr, L * 0.075, 32, 1, true), m, false, false);
      band.rotation.z = Math.PI / 2;
      band.position.x = pos[i];
      g.add(band);
    });
    var leadMat = K.mat.tin({ roughness: 0.3 });
    [-1, 1].forEach(function (s) {
      var lead = mesh(new THREE.CylinderGeometry(0.03, 0.03, leadLen, 10), leadMat, true, false);
      lead.rotation.z = Math.PI / 2;
      lead.position.x = s * (h + leadLen / 2 - 0.02);
      g.add(lead);
    });
    g.ends = [new THREE.Vector3(-(h + leadLen), 0, 0), new THREE.Vector3(h + leadLen, 0, 0)];
    return g;
  }

  /* --- desk analog ammeter, 0 … 0,05 A (units: cm). Face towards +z. --- */
  var meterTex = null;
  function ammeter() {
    var THREE = window.THREE;
    if (!meterTex) {
      meterTex = printTexture(512, 400, function (ctx, w, h) {
        ctx.fillStyle = '#F7F6F1'; ctx.fillRect(0, 0, w, h);
        var cx = w / 2, cy = 352, R = 268;
        ctx.strokeStyle = '#15171C'; ctx.fillStyle = '#15171C';
        ctx.lineWidth = 4;
        ctx.beginPath(); ctx.arc(cx, cy, R, -Math.PI / 2 - 0.84, -Math.PI / 2 + 0.84); ctx.stroke();
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        for (var i = 0; i <= 25; i++) {
          var a = -Math.PI / 2 - 0.84 + i / 25 * 1.68, major = i % 5 === 0;
          var r1 = R, r2 = R + (major ? 26 : 13);
          ctx.lineWidth = major ? 5 : 3;
          ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1); ctx.lineTo(cx + Math.cos(a) * r2, cy + Math.sin(a) * r2); ctx.stroke();
          if (major) {
            ctx.font = '600 27px "IBM Plex Mono", Consolas, monospace';
            var lab = i === 0 ? '0' : '0,0' + (i / 5);
            ctx.fillText(lab, cx + Math.cos(a) * (R + 52), cy + Math.sin(a) * (R + 52));
          }
        }
        ctx.fillStyle = '#A64B22';
        ctx.fillRect(cx - 120, 300, 240, 3);
        ctx.fillStyle = '#15171C';
        ctx.font = '600 64px "IBM Plex Sans", "Segoe UI", sans-serif';
        ctx.fillText('A', cx, 248);
      });
    }
    var g = new THREE.Group();
    var shell = K.mat.std(0x3B3F47, 0.42, 0.1);
    var body = mesh(roundedBox(5.4, 4.6, 2.8, 0.42, 0.24, 3), shell, true, true);
    body.position.y = 2.3;
    g.add(body);
    var face = mesh(new THREE.PlaneGeometry(4.6, 3.6), new THREE.MeshStandardMaterial({ map: meterTex, roughness: 0.7, envMapIntensity: 0.6 }), false, true);
    face.position.set(0, 2.45, 1.405);
    g.add(face);
    var cover = mesh(new THREE.PlaneGeometry(4.7, 3.7), new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.05, metalness: 0, transparent: true, opacity: 0.05, clearcoat: 1, envMapIntensity: 0.5 }), false, false);
    cover.position.set(0, 2.45, 1.47);
    g.add(cover);
    /* needle: pivot near the bottom of the dial */
    var pivot = new THREE.Group();
    pivot.position.set(0, 2.45 - 3.6 / 2 + 3.6 * (48 / 400), 1.43);
    g.add(pivot);
    var needle = new THREE.Mesh(new THREE.BoxGeometry(0.035, 2.55, 0.01), K.mat.std(0x15171C, 0.4, 0));
    needle.position.y = 1.25;
    pivot.add(needle);
    var hub = mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.06, 16), K.mat.std(0x15171C, 0.4, 0), false, false);
    hub.rotation.x = Math.PI / 2;
    pivot.add(hub);
    /* binding posts on top: black (−) left, red (+) right */
    var posts = [];
    [[-1.55, 0x1E2128], [1.55, 0xB3352A]].forEach(function (pp) {
      var post = mesh(lathe([[0, 0], [0.32, 0], [0.34, 0.1], [0.3, 0.42], [0.34, 0.5], [0.24, 0.62], [0, 0.62]], 20), K.mat.std(pp[1], 0.4, 0), true, false);
      post.position.set(pp[0], 4.6, 0.55);
      g.add(post);
      posts.push(new THREE.Vector3(pp[0], 5.2, 0.55));
    });
    g.pivot = pivot;
    g.minusPost = posts[0];
    g.plusPost = posts[1];
    g.angleFor = function (frac) { return 0.84 - clamp(frac, -0.03, 1.03) * 1.68; };
    return g;
  }

  /* Chain of curves sampled by arc length; segments marked hidden pass inside parts. */
  function makePath(segs) {
    var THREE = window.THREE;
    var items = [], total = 0;
    segs.forEach(function (s) {
      var len = s.curve.getLength();
      items.push({ c: s.curve, a: total, len: len, rev: !!s.rev, show: s.show !== false });
      total += len;
    });
    return {
      length: total,
      at: function (d, out) {
        d = ((d % total) + total) % total;
        for (var i = 0; i < items.length; i++) {
          var it = items[i];
          if (d <= it.a + it.len || i === items.length - 1) {
            var u = clamp((d - it.a) / it.len, 0, 1);
            it.c.getPointAt(it.rev ? 1 - u : u, out);
            var edge = Math.min(d - it.a, it.a + it.len - d);
            return it.show ? clamp(edge / 0.35, 0, 1) : 0;
          }
        }
        return 0;
      }
    };
  }

  function smallTag(v, text, x, y, align) {
    K.label(v.ctx, text, x, y, { size: v.wide ? 13 : 9.5, mono: true, color: 'rgba(89,94,105,0.95)', align: align || 'left', spacing: 0.3 });
  }

  /* ==================================================================
   * op-div · T 208×150 · card — 9 V ÷ 450 Ω ≈ 0,02 A (battery, resistor, ammeter)
   * ================================================================== */
  K.register('op-div', function (el, opts) {
    var THREE = window.THREE;
    var v = tileStage(el, { yaw: 0.06, pitch: 0.46, distance: 35, wideK: 0.7, target: [0.0, 3.0, 0.6], size: 9 });
    var reduced = K.reducedMotion;
    var bat = nineVolt();
    bat.position.set(-6.4, 0, -0.4);
    bat.rotation.y = 0.12;
    v.scene.add(bat);
    /* 450 Ω: yellow (4), green (5), brown (×10), matching the tile's equation 9 V ÷ 450 Ω */
    var res = resistor(2.1, 0.7, ['yellow', 'green', 'brown', 'gold'], 0.55);
    res.position.set(-0.4, 0.36, 3.1);
    v.scene.add(res);
    var met = ammeter();
    met.position.set(5.9, 0, -0.3);
    met.rotation.y = -0.16;
    v.scene.add(met);
    bat.updateMatrixWorld(true); res.updateMatrixWorld(true); met.updateMatrixWorld(true);
    var bP = bat.localToWorld(bat.plusTop.clone()), bM = bat.localToWorld(bat.minusTop.clone());
    var rL = res.localToWorld(res.ends[0].clone()), rR = res.localToWorld(res.ends[1].clone());
    var mP = met.localToWorld(met.plusPost.clone()), mM = met.localToWorld(met.minusPost.clone());
    var V3 = function (x, y, z) { return new THREE.Vector3(x, y, z); };
    var red = K.mat.plasticRed({ roughness: 0.42 }), black = K.mat.plasticBlack({ roughness: 0.45 });
    var wA = K.wire([bP, V3(bP.x - 0.5, bP.y + 0.8, bP.z + 0.2), V3(-8.5, 3.6, 0.9), V3(-8.3, 0.3, 2.6), V3(-4.6, 0.12, 3.5), V3(-2.6, 0.2, 3.25), rL], { radius: 0.1, material: red, segments: 110 });
    var wB = K.wire([rR, V3(2.2, 0.2, 3.25), V3(6.0, 0.12, 3.2), V3(9.2, 0.3, 1.6), V3(9.1, 3.6, 0.3), V3(mP.x + 0.5, mP.y + 0.8, mP.z - 0.1), mP], { radius: 0.1, material: red, segments: 110 });
    var wC = K.wire([mM, V3(mM.x - 0.2, mM.y + 0.8, mM.z - 0.5), V3(3.7, 2.2, -3.0), V3(1.6, 0.12, -3.7), V3(-3.2, 0.12, -3.6), V3(-5.0, 2.6, -2.5), V3(bM.x, bM.y + 0.8, bM.z - 0.5), bM], { radius: 0.1, material: black, segments: 130 });
    v.scene.add(wA); v.scene.add(wB); v.scene.add(wC);
    /* electron path: battery − → black wire → meter → red wire → resistor → red wire → battery + */
    var path = makePath([
      { curve: wC.curve, rev: true },
      { curve: new THREE.LineCurve3(mM, mP), show: false },
      { curve: wB.curve, rev: true },
      { curve: new THREE.LineCurve3(rR, rL), show: false },
      { curve: wA.curve, rev: true },
      { curve: new THREE.LineCurve3(bP, bM), show: false }
    ]);
    var NE = 30;
    var dots = pointsCloud(NE, { color: 0x2343B0, core: 0x8EA6F2, size: 8, coreR: 0.5 });
    dots.renderOrder = 4;
    v.scene.add(dots);
    var tp = new THREE.Vector3();
    var lA = tileLabel(v, '0,02 A', { at: met.localToWorld(new THREE.Vector3(-0.2, 5.9, 0)), cls: 'value', dy: -4, valign: 'bottom', size: '14px', weight: '600', color: P.copper });
    var lV = tileLabel(v, '9 V', { at: bat.localToWorld(new THREE.Vector3(0, 6.0, 0)), cls: 'value', dy: -4, valign: 'bottom', size: '12px' });
    var lR = tileLabel(v, '450 Ω', { at: [-0.4, 0.85, 3.1], cls: 'value', dy: -4, valign: 'bottom', size: '12px' });

    function frame(t, dt) {
      var ph = reduced ? 4 : t;
      var on = reduced ? 1 : sstep(0.4, 1.0, ph);
      for (var i = 0; i < NE; i++) {
        var a = path.at((reduced ? 0 : t * 1.4) + i / NE * path.length, tp);
        dots.pos[i * 3] = tp.x; dots.pos[i * 3 + 1] = tp.y + 0.12; dots.pos[i * 3 + 2] = tp.z;
        dots.alpha[i] = a * on;
        dots.size[i] = 8;
      }
      dots.commit();
      var tau = Math.max(0, ph - 0.5);
      var frac = 0.4 * (1 - Math.exp(-tau * 2.6) * Math.cos(tau * 5.2));
      met.pivot.rotation.z = met.angleFor(reduced ? 0.4 : frac);
      labelOpacity(lA, reduced ? 1 : sstep(1.6, 2.1, ph));
      labelOpacity(lV, reduced ? 1 : sstep(0.2, 0.6, ph));
      labelOpacity(lR, reduced ? 1 : sstep(0.8, 1.2, ph));
      syncRes(v, [dots.material]);
      v.render(dt);
      if (!K.skipRender) smallTag(v, 'akış hızlandırılmış', 6, v.h - 6);
    }
    return { reset: function () { }, frame: frame, dispose: function () { v.dispose(); } };
  });

  /* ==================================================================
   * op-and · T 208×150 · card — A VE B = Q (front-loading washing machine)
   * Units: 10 cm. Body 60 × 85 × 56 cm.
   * ================================================================== */
  K.register('op-and', function (el, opts) {
    var THREE = window.THREE;
    var v = tileStage(el, { yaw: -0.36, pitch: 0.16, distance: 31, wideK: 0.74, target: [0.3, 4.3, 0], size: 6 });
    var reduced = K.reducedMotion;
    if (v.lights) v.lights.key.position.set(-4, 10, 8);
    var white = K.mat.plasticWhite({ roughness: 0.38, envMapIntensity: 0.85 });
    var greyTrim = K.mat.std(0xD9DBDF, 0.35, 0.2);
    var chrome = K.mat.steel({ roughness: 0.18, color: 0xD7DADF });
    var FZ = 2.8;   /* front face z */
    /* cabinet with a round tunnel for the drum */
    var bev = 0.2;
    var cab = roundedRectShape(6 - bev * 2, 8.5 - bev * 2, 0.3 - bev);
    var tunnel = new THREE.Path();
    tunnel.absarc(0, 3.85 - 4.35, 2.2 + bev, 0, TAU, true);
    cab.holes.push(tunnel);
    var cabG = new THREE.ExtrudeGeometry(cab, { depth: 5.6 - bev * 2, bevelEnabled: true, bevelThickness: bev, bevelSize: bev, bevelSegments: 3, curveSegments: 56 });
    cabG.translate(0, 0, -(5.6 - bev * 2) / 2);
    var body = mesh(cabG, white, true, true);
    body.position.y = 4.35;
    v.scene.add(body);
    /* control strip */
    var strip = mesh(roundedBox(5.7, 1.05, 0.12, 0.12, 0.04, 2), greyTrim, false, true);
    strip.position.set(0, 7.75, FZ + 0.02);
    v.scene.add(strip);
    var drawer = mesh(roundedBox(1.7, 0.8, 0.1, 0.1, 0.03, 2), white, false, true);
    drawer.position.set(-1.85, 7.75, FZ + 0.1);
    v.scene.add(drawer);
    var knob = mesh(lathe([[0, 0], [0.38, 0], [0.4, 0.06], [0.36, 0.26], [0, 0.28]], 32), chrome, true, false);
    knob.rotation.x = Math.PI / 2;
    knob.position.set(-0.2, 7.75, FZ + 0.08);
    v.scene.add(knob);
    var disp = mesh(roundedBox(0.95, 0.42, 0.04, 0.06, 0.015, 1), K.mat.std(0x15171C, 0.3, 0.1), false, false);
    disp.position.set(0.95, 7.75, FZ + 0.09);
    v.scene.add(disp);
    var btnMat = new THREE.MeshStandardMaterial({ color: 0xE9E6DD, roughness: 0.35, emissive: 0xF2C46B, emissiveIntensity: 0 });
    var btn = mesh(lathe([[0, 0], [0.24, 0], [0.25, 0.05], [0.22, 0.12], [0, 0.13]], 28), btnMat, false, false);
    btn.rotation.x = Math.PI / 2;
    btn.position.set(2.1, 7.75, FZ + 0.08);
    v.scene.add(btn);
    var btnGlow = glowSprite('#F2C46B', 1.3, 0);
    btnGlow.position.set(2.1, 7.75, FZ + 0.25);
    v.scene.add(btnGlow);
    /* drum: perforated stainless cylinder with three lifters and some laundry */
    var perfTex = dataTexture(256, 64, function (u, w) {
      var x = u * 48, y = w * 12;
      var row = Math.floor(y), off = row % 2 ? 0.5 : 0;
      var dx = (x + off) % 1 - 0.5, dy = y % 1 - 0.5;
      var d = Math.sqrt(dx * dx + dy * dy);
      var g = d < 0.2 ? 0.25 : 0.92 + 0.08 * hash2(Math.floor(x), row, 3);
      return [g, g, g];
    }, true);
    var drum = new THREE.Group();
    drum.position.set(0, 3.85, FZ - 2.0);
    v.scene.add(drum);
    var drumMat = K.mat.steel({ map: perfTex, roughness: 0.32, side: THREE.BackSide, color: 0xC9CDD3 });
    var shellG = new THREE.CylinderGeometry(2.05, 2.05, 3.4, 48, 1, true);
    shellG.rotateX(Math.PI / 2);
    drum.add(mesh(shellG, drumMat, false, true));
    var back = mesh(new THREE.CircleGeometry(2.05, 48), K.mat.steel({ roughness: 0.4, color: 0xAEB3BA }), false, true);
    back.position.z = -1.7;
    drum.add(back);
    var spinner = new THREE.Group();
    drum.add(spinner);
    for (var k = 0; k < 3; k++) {
      var lifter = mesh(roundedBox(0.5, 0.5, 3.2, 0.15, 0.1, 2), K.mat.steel({ roughness: 0.3 }), false, true);
      var an = k / 3 * TAU;
      lifter.position.set(Math.cos(an) * 1.85, Math.sin(an) * 1.85, 0);
      lifter.rotation.z = an;
      spinner.add(lifter);
    }
    /* laundry: folded fabric lumps that rest at the bottom and tumble while the drum turns */
    var clothCols = [0x4F6898, 0xC9A55E, 0xE6E2D8, 0x8E5446, 0x62806E, 0x3E4552];
    var crng = K.rng(9);
    var laundry = [];
    for (var c = 0; c < 7; c++) {
      var lump = new THREE.SphereGeometry(0.6 + crng() * 0.22, 24, 16);
      var pa = lump.attributes.position;
      var s1 = crng() * 6, s2 = crng() * 6;
      for (var q = 0; q < pa.count; q++) {
        var px = pa.getX(q), py = pa.getY(q), pz = pa.getZ(q);
        var f = 1 + 0.16 * Math.sin(px * 6 + s1) * Math.cos(py * 5 - s2) + 0.08 * Math.sin(pz * 11 + px * 7) + 0.05 * Math.sin(py * 15 + s1);
        pa.setXYZ(q, px * f * 1.3, py * f * 0.72, pz * f * 1.05);
      }
      lump.computeVertexNormals();
      var cm = mesh(lump, K.mat.std(clothCols[c % clothCols.length], 0.95, 0, { envMapIntensity: 0.5 }), false, true);
      var base = { a: -Math.PI / 2 + (c - 3) * 0.24 + (crng() - 0.5) * 0.12, r: 1.42 - Math.abs(c - 3) * 0.04 + crng() * 0.1, z: (crng() - 0.5) * 2.0, ph: crng() * TAU, rx: crng() * 3, ry: crng() * 3 };
      cm.rotation.set(base.rx, base.ry, 0);
      drum.add(cm);
      laundry.push({ m: cm, b: base });
    }
    var gasket = mesh(new THREE.TorusGeometry(1.95, 0.22, 14, 48), K.mat.std(0x4A4E56, 0.7, 0), false, true);
    gasket.position.set(0, 3.85, FZ - 0.18);
    v.scene.add(gasket);
    /* door on a left-hand hinge: white ring, chrome trim, tinted glass bowl */
    var hinge = new THREE.Group();
    hinge.position.set(-2.45, 3.85, FZ + 0.12);
    v.scene.add(hinge);
    var door = new THREE.Group();
    door.position.set(2.45, 0, 0);
    hinge.add(door);
    var ringG = lathe([[1.62, 0.0], [2.3, 0.0], [2.42, 0.12], [2.42, 0.28], [2.25, 0.4], [1.75, 0.42], [1.6, 0.3]], 64);
    ringG.rotateX(Math.PI / 2);
    door.add(mesh(ringG, white, true, true));
    var trim = mesh(new THREE.TorusGeometry(1.72, 0.07, 10, 64), chrome, false, false);
    trim.position.z = 0.42;
    door.add(trim);
    var bowlG = new THREE.SphereGeometry(2.4, 48, 16, 0, TAU, 0, 0.75);
    bowlG.rotateX(-Math.PI / 2);
    bowlG.translate(0, 0, -2.4 * Math.cos(0.75) + 0.42);
    var glass = mesh(bowlG, new THREE.MeshPhysicalMaterial({ color: 0x3A4654, roughness: 0.06, metalness: 0, transparent: true, opacity: 0.38, clearcoat: 1, clearcoatRoughness: 0.04, envMapIntensity: 1.1, depthWrite: false }), false, false);
    glass.renderOrder = 3;
    door.add(glass);
    var handle = mesh(roundedBox(0.28, 1.2, 0.3, 0.1, 0.06, 2), greyTrim, false, false);
    handle.position.set(2.32, 0, 0.3);
    door.add(handle);
    /* feet */
    [[-2.6, 2.4], [2.6, 2.4], [-2.6, -2.4], [2.6, -2.4]].forEach(function (fp) {
      var foot = mesh(new THREE.CylinderGeometry(0.22, 0.26, 0.18, 12), K.mat.plasticBlack(), false, false);
      foot.position.set(fp[0], 0.05, fp[1]);
      v.scene.add(foot);
    });

    var lA = tileLabel(v, 'A = 0', { at: [-2.4, 3.85, FZ], cls: 'value', dx: -34, dy: 0, align: 'right', line: true });
    var lB = tileLabel(v, 'B = 0', { at: [2.1, 7.95, FZ], cls: 'value', dx: 20, dy: -14, align: 'left', line: true });
    var lQ = tileLabel(v, 'Q = 0', { at: [1.3, 3.2, FZ - 0.6], cls: 'value', dx: 33, dy: 12, align: 'left', line: true });
    var lastA = -1, lastB = -1, lastQ = -1;
    var spinAngle = 0, spinVel = 0, prevT = 0;

    function frame(t, dt) {
      var T = reduced ? 4.5 : t % 12;
      var phase2 = T >= 6;
      /* door angle: 0 = closed; open = 1.75 rad (towards the viewer, hinge on the left) */
      var open;
      if (!phase2) open = 1 - E.inOut(span(T, 0.5, 1.6));
      else open = E.inOut(span(T, 6.1, 7.0));
      if (T > 11.6) open = 1;
      hinge.rotation.y = -open * 1.75;
      var A = open < 0.02 ? 1 : 0;
      var B = (!phase2 && T >= 2.2 && T < 5.7) || (phase2 && T >= 7.6 && T < 11.2) ? 1 : 0;
      var Q = A && B ? 1 : 0;
      /* drum speed eases up/down (about 0,8 turns per second while washing) */
      var target = Q ? 5.0 : 0;
      var ddt = reduced ? 0 : Math.max(0, Math.min(0.05, t - prevT));
      prevT = t;
      spinVel += (target - spinVel) * Math.min(1, ddt * 2.2);
      spinAngle += spinVel * ddt;
      if (reduced) spinAngle = 0.4;
      spinner.rotation.z = -spinAngle;
      var sN = clamp(spinVel / 5, 0, 1);
      for (var li = 0; li < laundry.length; li++) {
        var Lc = laundry[li], b = Lc.b;
        /* carried up the rising side by the lifters, then tumbling back down */
        var cyc = (spinAngle * 0.32 + b.ph) % TAU;
        var lift = sN * (0.55 + 0.35 * Math.sin(cyc));
        var a = b.a - lift - sN * 0.25;
        var rr = b.r - sN * 0.15 * (1 + Math.sin(cyc * 2));
        Lc.m.position.set(Math.cos(a) * rr, Math.sin(a) * rr, b.z);
        Lc.m.rotation.set(b.rx + spinAngle * 0.6 * sN, b.ry + spinAngle * 0.35 * sN, 0);
      }
      btnMat.emissiveIntensity = lerp(btnMat.emissiveIntensity, B ? 1.6 : 0, reduced ? 1 : Math.min(1, ddt * 10));
      btnGlow.material.opacity = 0.55 * btnMat.emissiveIntensity / 1.6;
      if (A !== lastA) { lA.set('A = ' + A); lastA = A; }
      if (B !== lastB) { lB.set('B = ' + B); lastB = B; }
      if (Q !== lastQ) { lQ.set('Q = ' + Q); lQ.el.style.color = Q ? P.copper : P.ink; lQ.el.style.fontWeight = Q ? '600' : '500'; lastQ = Q; }
      var la = reduced ? 1 : sstep(0.15, 0.5, t);
      labelOpacity(lA, la); labelOpacity(lB, la); labelOpacity(lQ, la);
      v.render(dt);
    }
    return {
      reset: function () { spinAngle = 0; spinVel = 0; prevT = 0; lastA = lastB = lastQ = -1; },
      frame: frame,
      dispose: function () { v.dispose(); }
    };
  });

  /* ------------------------------------------------------------------
   * roots-to-sky emblems (each about 1,2 units tall, base at y = 0)
   * ------------------------------------------------------------------ */
  function emblemAtom() {
    var THREE = window.THREE;
    var g = new THREE.Group();
    var core = new THREE.Group();
    core.position.y = 0.62;
    g.add(core);
    var pm = K.mat.proton(), nm = K.mat.neutron();
    var nuc = [[0, 0, 0], [0.1, 0.05, 0.03], [-0.08, 0.07, -0.05], [0.02, -0.09, 0.08], [-0.06, -0.05, -0.1], [0.07, -0.04, -0.09], [-0.03, 0.11, 0.07]];
    nuc.forEach(function (p, i) {
      var s = mesh(new THREE.SphereGeometry(0.075, 18, 12), i % 2 ? nm : pm, true, false);
      s.position.set(p[0], p[1], p[2]);
      core.add(s);
    });
    /* the classic emblem: three tilted circular orbits at 0°, 60° and 120° around the view axis */
    var orbitMat = K.mat.std(0x7D8494, 0.4, 0.3);
    var orbits = [];
    for (var k = 0; k < 3; k++) {
      var outer = new THREE.Group();
      outer.rotation.z = k * Math.PI / 3 + 0.2;
      core.add(outer);
      var o = new THREE.Group();
      o.rotation.x = 1.22;
      outer.add(o);
      o.add(mesh(new THREE.TorusGeometry(0.52, 0.008, 6, 120), orbitMat, false, false));
      var e = mesh(new THREE.SphereGeometry(0.048, 14, 10), K.mat.electron(false), false, false);
      o.add(e);
      orbits.push({ g: o, e: e });
    }
    g.tick = function (t, glow) {
      for (var i = 0; i < orbits.length; i++) {
        var a = t * (1.0 + i * 0.22) + i * 2.1;
        orbits[i].e.position.set(Math.cos(a) * 0.52, Math.sin(a) * 0.52, 0);
      }
      core.rotation.y = Math.sin(t * 0.4) * 0.25;
    };
    return g;
  }

  function emblemLed() {
    var THREE = window.THREE;
    var g = new THREE.Group();
    /* 5 mm red LED, magnified: epoxy dome, flange with flat, anode (long) and cathode legs */
    var led = new THREE.Group();
    led.position.set(-0.18, 0, 0.02);
    g.add(led);
    var legMat = K.mat.tin({ roughness: 0.3 });
    [[-0.07, 0.42], [0.07, 0.5]].forEach(function (l) {
      var leg = mesh(new THREE.CylinderGeometry(0.014, 0.014, l[1], 8), legMat, true, false);
      leg.position.set(l[0], l[1] / 2, 0);
      led.add(leg);
    });
    var epoxy = new THREE.MeshPhysicalMaterial({ color: 0xD8473C, roughness: 0.12, metalness: 0, transparent: true, opacity: 0.78, clearcoat: 1, clearcoatRoughness: 0.05, envMapIntensity: 1.2, emissive: 0xFF3B2A, emissiveIntensity: 0 });
    var flange = mesh(lathe([[0, 0], [0.29, 0], [0.29, 0.05], [0.25, 0.06], [0, 0.06]], 32), epoxy, true, false);
    flange.position.y = 0.5;
    led.add(flange);
    var domeProf = [[0.25, 0.06]];
    for (var i = 0; i <= 10; i++) { var a = i / 10 * Math.PI / 2; domeProf.push([0.25 * Math.cos(a), 0.36 + 0.25 * Math.sin(a)]); }
    var dome = mesh(lathe(domeProf, 32), epoxy, true, false);
    dome.position.y = 0.5;
    led.add(dome);
    var die = mesh(new THREE.BoxGeometry(0.05, 0.02, 0.05), new THREE.MeshBasicMaterial({ color: 0x5A1E18, toneMapped: false }), false, false);
    die.position.y = 0.72;
    led.add(die);
    var glow = glowSprite('#FF5A3C', 1.1, 0);
    glow.position.y = 0.75;
    led.add(glow);
    /* carbon-film resistor lying in front: red · red · brown · gold */
    var res = resistor(0.5, 0.19, ['red', 'red', 'brown', 'gold'], 0.24);
    res.position.set(0.3, 0.1, 0.12);
    res.rotation.y = 0.5;
    g.add(res);
    g.tick = function (t, glowA) {
      epoxy.emissiveIntensity = 0.85 * glowA;
      die.material.color.setRGB(0.35 + 0.65 * glowA, 0.12 + 0.3 * glowA, 0.09 + 0.2 * glowA);
      glow.material.opacity = 0.75 * glowA;
    };
    return g;
  }

  function emblemPcb() {
    var THREE = window.THREE;
    var g = new THREE.Group();
    var tex = printTexture(512, 352, function (ctx, w, h) {
      ctx.fillStyle = '#1F4F3B'; ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = '#2E6A4F'; ctx.lineWidth = 9; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      var tr = [[[60, 300], [60, 220], [140, 140], [200, 140]], [[100, 300], [100, 240], [160, 180], [200, 180]], [[312, 160], [380, 160], [440, 100], [440, 60]], [[312, 200], [400, 200], [460, 260], [460, 300]], [[256, 250], [256, 300]], [[150, 60], [230, 60], [230, 110]]];
      tr.forEach(function (pl) { ctx.beginPath(); ctx.moveTo(pl[0][0], pl[0][1]); for (var i = 1; i < pl.length; i++) ctx.lineTo(pl[i][0], pl[i][1]); ctx.stroke(); });
      ctx.fillStyle = '#E2B865';
      [[60, 312], [100, 312], [140, 312], [180, 312], [440, 48], [460, 312], [150, 60], [256, 312]].forEach(function (p) { ctx.beginPath(); ctx.arc(p[0], p[1], 15, 0, TAU); ctx.fill(); });
      ctx.fillStyle = '#1F4F3B';
      [[60, 312], [100, 312], [140, 312], [180, 312], [440, 48], [460, 312], [150, 60], [256, 312]].forEach(function (p) { ctx.beginPath(); ctx.arc(p[0], p[1], 5, 0, TAU); ctx.fill(); });
      ctx.fillStyle = '#F4F4F0';
      ctx.font = '600 26px "IBM Plex Mono", Consolas, monospace';
      ctx.fillText('U1', 214, 108);
      ctx.fillText('R1', 330, 128);
      ctx.strokeStyle = '#F4F4F0'; ctx.lineWidth = 3;
      ctx.strokeRect(196, 116, 120, 120);
      ctx.strokeRect(318, 216, 70, 34);
    });
    var board = new THREE.Group();
    board.position.set(0, 0.5, 0);
    board.rotation.x = -0.95;
    g.add(board);
    var fr4 = K.mat.fr4();
    var core = mesh(roundedBox(1.2, 0.82, 0.045, 0.05, 0.012, 2), fr4, true, true);
    board.add(core);
    var top = mesh(new THREE.PlaneGeometry(1.19, 0.81), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.36, metalness: 0 }), false, true);
    top.position.z = 0.0236;
    board.add(top);
    var chip = mesh(roundedBox(0.27, 0.27, 0.06, 0.02, 0.01, 1), K.mat.plasticBlack({ roughness: 0.55 }), true, false);
    chip.position.set(-0.03, 0.015, 0.055);
    board.add(chip);
    var pinMat = K.mat.tin({ roughness: 0.3 });
    for (var s = 0; s < 4; s++) {
      for (var k = 0; k < 5; k++) {
        var pin = mesh(new THREE.BoxGeometry(0.018, 0.04, 0.012), pinMat, false, false);
        var off = -0.1 + k * 0.05;
        if (s === 0) pin.position.set(off - 0.03, 0.015 + 0.155, 0.032);
        if (s === 1) pin.position.set(off - 0.03, 0.015 - 0.155, 0.032);
        if (s === 2) { pin.position.set(-0.03 - 0.155, 0.015 + off, 0.032); pin.rotation.z = Math.PI / 2; }
        if (s === 3) { pin.position.set(-0.03 + 0.155, 0.015 + off, 0.032); pin.rotation.z = Math.PI / 2; }
        board.add(pin);
      }
    }
    var smd = mesh(roundedBox(0.1, 0.05, 0.03, 0.01, 0.006, 1), K.mat.std(0x2B2B2E, 0.5, 0), false, false);
    smd.position.set(0.3, -0.06, 0.04);
    board.add(smd);
    var stand = mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.5, 10), K.mat.steel(), true, false);
    stand.position.set(0, 0.25, -0.12);
    g.add(stand);
    g.tick = function () { };
    return g;
  }

  function emblemSonar() {
    var THREE = window.THREE;
    var g = new THREE.Group();
    var tex = printTexture(512, 256, function (ctx, w, h) {
      ctx.fillStyle = '#1F55A8'; ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#F4F4F0';
      ctx.font = '600 36px "IBM Plex Mono", Consolas, monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('T', 128, 232);
      ctx.fillText('R', 384, 232);
      ctx.fillStyle = '#E2B865';
      for (var i = 0; i < 4; i++) { ctx.beginPath(); ctx.arc(196 + i * 40, 226, 9, 0, TAU); ctx.fill(); }
    });
    var board = new THREE.Group();
    board.position.y = 0.42;
    g.add(board);
    board.add(mesh(roundedBox(1.2, 0.56, 0.04, 0.03, 0.01, 2), K.mat.fr4({ color: 0x1F55A8 }), true, true));
    var face = mesh(new THREE.PlaneGeometry(1.19, 0.55), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.38 }), false, true);
    face.position.z = 0.0206;
    board.add(face);
    var meshTex = dataTexture(64, 64, function (u, w) {
      var x = u * 16, y = w * 16, dx = x % 1 - 0.5, dy = y % 1 - 0.5;
      var gg = Math.sqrt(dx * dx + dy * dy) < 0.3 ? 0.18 : 0.42;
      return [gg, gg, gg];
    });
    [-0.3, 0.3].forEach(function (x) {
      var can = mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.17, 40, 1, true), K.mat.aluminium({ roughness: 0.3 }), true, false);
      can.rotation.x = Math.PI / 2;
      can.position.set(x, 0.03, 0.105);
      board.add(can);
      var rim = mesh(new THREE.TorusGeometry(0.2, 0.012, 8, 40), K.mat.aluminium({ roughness: 0.25 }), false, false);
      rim.position.set(x, 0.03, 0.19);
      board.add(rim);
      var grille = mesh(new THREE.CircleGeometry(0.19, 40), new THREE.MeshStandardMaterial({ map: meshTex, roughness: 0.7, metalness: 0.3 }), false, false);
      grille.position.set(x, 0.03, 0.185);
      board.add(grille);
    });
    var pinMat = K.mat.gold({ roughness: 0.3 });
    for (var i = 0; i < 4; i++) {
      var pin = mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.22, 8), pinMat, true, false);
      pin.position.set(-0.09 + i * 0.06, -0.38, 0);
      board.add(pin);
    }
    g.tick = function () { };
    return g;
  }

  function emblemLaptop() {
    var THREE = window.THREE;
    var g = new THREE.Group();
    var alu = K.mat.aluminium({ color: 0xC9CCD2, roughness: 0.34 });
    var base = mesh(roundedBox(1.36, 0.06, 0.9, 0.06, 0.02, 2), alu, true, true);
    base.position.y = 0.03;
    g.add(base);
    var keysTex = dataTexture(256, 128, function (u, w) {
      var x = u * 15, y = w * 6;
      var inKey = (x % 1) > 0.12 && (x % 1) < 0.88 && (y % 1) > 0.16 && (y % 1) < 0.84;
      var gg = inKey ? 0.16 : 0.32;
      return [gg, gg, gg];
    });
    var keys = mesh(new THREE.PlaneGeometry(1.12, 0.42), new THREE.MeshStandardMaterial({ map: keysTex, roughness: 0.6 }), false, false);
    keys.rotation.x = -Math.PI / 2;
    keys.position.set(0, 0.062, -0.12);
    g.add(keys);
    var pad = mesh(new THREE.PlaneGeometry(0.4, 0.22), K.mat.std(0xB4B8BF, 0.4, 0.4), false, false);
    pad.rotation.x = -Math.PI / 2;
    pad.position.set(0, 0.062, 0.27);
    g.add(pad);
    var lid = new THREE.Group();
    lid.position.set(0, 0.06, -0.44);
    lid.rotation.x = -0.32;
    g.add(lid);
    var back = mesh(roundedBox(1.36, 0.88, 0.035, 0.06, 0.012, 2), alu, true, true);
    back.position.y = 0.44;
    lid.add(back);
    var screenTex = printTexture(512, 320, function (ctx, w, h) {
      ctx.fillStyle = '#F5F5F1'; ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#E3E3DD'; ctx.fillRect(0, 0, w, 30);
      ctx.fillStyle = '#A64B22'; ctx.fillRect(28, 64, 120, 12);
      ctx.fillStyle = '#3E434D';
      for (var i = 0; i < 6; i++) ctx.fillRect(28, 100 + i * 30, 200 + ((i * 53) % 120), 9);
      ctx.fillStyle = '#2343B0';
      ctx.font = '600 64px "IBM Plex Mono", Consolas, monospace';
      ctx.fillText('1 0', 330, 210);
    });
    var scrMat = new THREE.MeshBasicMaterial({ map: screenTex, toneMapped: false, color: 0xDDDDDD });
    var bezel = mesh(new THREE.PlaneGeometry(1.3, 0.82), K.mat.std(0x15171C, 0.3, 0), false, false);
    bezel.position.set(0, 0.44, 0.019);
    lid.add(bezel);
    var scr = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.72), scrMat);
    scr.position.set(0, 0.44, 0.021);
    lid.add(scr);
    g.tick = function (t, glowA) { scrMat.color.setScalar(0.82 + 0.18 * glowA); };
    return g;
  }

  function satellite() {
    var THREE = window.THREE;
    var g = new THREE.Group();
    var foilTex = dataTexture(64, 64, function (u, w) {
      var n = fbm(u * 8, w * 8, 5, 3);
      var gg = 0.75 + 0.25 * n;
      return [gg, gg, gg];
    });
    var body = mesh(roundedBox(0.34, 0.34, 0.44, 0.03, 0.015, 1), K.mat.gold({ map: foilTex, roughness: 0.42, color: 0xD9A94E }), true, false);
    g.add(body);
    var cellTex = dataTexture(128, 64, function (u, w) {
      var x = u * 10, y = w * 4;
      var line = (x % 1) < 0.07 || (y % 1) < 0.1;
      var gg = line ? 0.62 : 0.18;
      return [gg * 0.7, gg * 0.8, gg * 1.25];
    });
    var panelMat = new THREE.MeshStandardMaterial({ map: cellTex, roughness: 0.32, metalness: 0.5, color: 0x5A6E9E });
    [-1, 1].forEach(function (s) {
      var arm = mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.18, 6), K.mat.steel(), false, false);
      arm.rotation.z = Math.PI / 2;
      arm.position.x = s * 0.26;
      g.add(arm);
      var panel = mesh(new THREE.BoxGeometry(0.86, 0.012, 0.32), panelMat, true, false);
      panel.position.x = s * (0.35 + 0.43);
      g.add(panel);
    });
    var dish = mesh(lathe([[0, 0], [0.06, 0.003], [0.12, 0.014], [0.16, 0.03], [0.165, 0.036]], 24), K.mat.plasticWhite({ side: THREE.DoubleSide }), false, false);
    dish.rotation.x = Math.PI;
    dish.position.set(0, -0.2, 0.05);
    g.add(dish);
    return g;
  }

  /* ==================================================================
   * roots-to-sky · 1120×400 · light — journey map of the deck
   * ================================================================== */
  K.register('roots-to-sky', function (el, opts) {
    var THREE = window.THREE;
    var HOME = { yaw: 0.0, pitch: 0.3, distance: 22.4, target: [0.55, 1.75, -0.4] };
    var v = K.stage3d(el, { theme: 'light', fov: 22, orbit: false, yaw: HOME.yaw, pitch: HOME.pitch, distance: HOME.distance, target: HOME.target, size: 9, ground: 0, near: 0.5, far: 300 });
    var reduced = K.reducedMotion;
    if (v.lights) {
      v.lights.key.position.set(-6, 16, 11);
      v.lights.key.shadow.camera.left = -14; v.lights.key.shadow.camera.right = 14;
      v.lights.key.shadow.camera.top = 10; v.lights.key.shadow.camera.bottom = -10;
      v.lights.key.shadow.camera.updateProjectionMatrix();
      v.lights.key.shadow.radius = 6;
      v.lights.key.intensity = 1.45;
      if (v.lights.ground) v.lights.ground.material.opacity = 0.04;
    }
    var TRAVEL = 12, INTRO = 4.6, PAUSE = 2.2;

    /* --- the path --- */
    var V3 = function (x, y, z) { return new THREE.Vector3(x, y, z); };
    var curve = new THREE.CatmullRomCurve3([V3(-8.7, 0.03, 1.2), V3(-6.7, 0.1, 1.6), V3(-4.2, 0.44, 0.9), V3(-1.5, 0.95, 0.1), V3(1.2, 1.5, -0.5), V3(3.9, 2.1, -0.6), V3(6.2, 2.72, -1.1), V3(7.9, 3.35, -1.6)], false, 'catmullrom', 0.45);
    var STU = [0.1, 0.29, 0.48, 0.67, 0.86];
    function ribbonGeo(n, wFn, th) {
      var pos = [], uu = [], idx = [];
      var up = V3(0, 1, 0), p = V3(0, 0, 0), t = V3(0, 0, 0), side = V3(0, 0, 0), nrm = V3(0, 0, 0);
      var rows = [];
      for (var i = 0; i <= n; i++) {
        var u = i / n;
        curve.getPointAt(u, p); curve.getTangentAt(u, t);
        side.crossVectors(t, up).normalize();
        nrm.crossVectors(side, t).normalize();
        var w = wFn(u) / 2;
        rows.push({ u: u, L: p.clone().addScaledVector(side, w), R: p.clone().addScaledVector(side, -w), n: nrm.clone() });
      }
      function strip(offA, offB, which) {
        var base = pos.length / 3;
        rows.forEach(function (r) {
          var A = which === 'top' ? r.L.clone().addScaledVector(r.n, th / 2) : which === 'bot' ? r.R.clone().addScaledVector(r.n, -th / 2) : which === 'left' ? r.L.clone().addScaledVector(r.n, -th / 2) : r.R.clone().addScaledVector(r.n, th / 2);
          var B = which === 'top' ? r.R.clone().addScaledVector(r.n, th / 2) : which === 'bot' ? r.L.clone().addScaledVector(r.n, -th / 2) : which === 'left' ? r.L.clone().addScaledVector(r.n, th / 2) : r.R.clone().addScaledVector(r.n, -th / 2);
          pos.push(A.x, A.y, A.z, B.x, B.y, B.z);
          uu.push(r.u, r.u);
        });
        for (var j = 0; j < rows.length - 1; j++) {
          var a = base + j * 2, b = a + 1, c = a + 2, d = a + 3;
          idx.push(a, b, c, b, d, c);
        }
      }
      strip(0, 0, 'top'); strip(0, 0, 'bot'); strip(0, 0, 'left'); strip(0, 0, 'right');
      var g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      g.setAttribute('aU', new THREE.Float32BufferAttribute(uu, 1));
      g.setIndex(idx);
      g.computeVertexNormals();
      return g;
    }
    var revealU = { value: 0 };
    function revealMaterial(mat) {
      mat.onBeforeCompile = function (sh) {
        sh.uniforms.uReveal = revealU;
        sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute float aU;\nvarying float vU;')
          .replace('#include <begin_vertex>', '#include <begin_vertex>\nvU = aU;');
        sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform float uReveal;\nvarying float vU;')
          .replace('#include <clipping_planes_fragment>', '#include <clipping_planes_fragment>\nif (vU > uReveal) discard;');
      };
      return mat;
    }
    var ribbonMat = revealMaterial(K.mat.std(0xE9E6DC, 0.62, 0, { envMapIntensity: 0.8, side: THREE.DoubleSide }));
    var revealDepth = revealMaterial(new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking }));
    var ribbon = mesh(ribbonGeo(320, function (u) { return 0.62; }, 0.07), ribbonMat, true, true);
    ribbon.customDepthMaterial = revealDepth;
    v.scene.add(ribbon);
    /* inlaid copper trace along the ribbon, and the traveller's warm trail */
    var tracePts = [];
    var tp = V3(0, 0, 0), tt = V3(0, 0, 0), ts = V3(0, 0, 0), tn = V3(0, 0, 0);
    for (var i = 0; i <= 300; i++) {
      var u = i / 300;
      curve.getPointAt(u, tp); curve.getTangentAt(u, tt);
      ts.crossVectors(tt, V3(0, 1, 0)).normalize(); tn.crossVectors(ts, tt).normalize();
      tracePts.push([tp.x + tn.x * 0.045, tp.y + tn.y * 0.045, tp.z + tn.z * 0.045]);
    }
    var traceGeo = lineGeometry([{ pts: tracePts }]);
    var traceMat = lineMaterial({ color: 0xC8693A, opacity: 0.95, width: 2.0, grow: 1, head: 0.02 });
    var trace = new THREE.Mesh(traceGeo, traceMat);
    trace.renderOrder = 3; trace.frustumCulled = false;
    v.scene.add(trace);
    var trailMat = lineMaterial({ color: 0xF2C46B, opacity: 0, width: 4.2 });
    var trail = new THREE.Mesh(traceGeo, trailMat);
    trail.renderOrder = 4; trail.frustumCulled = false;
    v.scene.add(trail);

    /* --- roots: copper circuit-trace branches growing down into the ground below the start ---
     * Drawn as a soil cross-section: a faint ground line, roots in the vertical plane beneath it,
     * 45° circuit bends, and every tip ends in a via pad. Angles: −π/2 = straight down. */
    var rootLines = [[], [], []], pads = [];
    var start = curve.getPointAt(0);
    var RZ = start.z + 0.05;
    var Q = Math.PI / 4;
    function seg(p, dirs, lens) {
      var pts = [[p.x, p.y, RZ]], q = p.clone();
      for (var i = 0; i < dirs.length; i++) {
        q.x += Math.cos(dirs[i]) * lens[i] * 1.32; q.y += Math.sin(dirs[i]) * lens[i] * 1.32;
        pts.push([q.x, q.y, RZ]);
      }
      return { pts: pts, end: q };
    }
    function branch(p, depth, dirs, lens, delay, kids) {
      var s = seg(p, dirs, lens);
      rootLines[depth].push({ pts: s.pts, delay: delay });
      if (kids && kids.length) kids.forEach(function (k) { branch(s.end, depth + 1, k[0], k[1], delay + 0.34, k[2]); });
      else pads.push({ p: s.end, delay: delay + 0.3 });
    }
    var root0 = V3(start.x + 0.15, -0.02, RZ);
    branch(root0, 0, [-2 * Q, -3 * Q], [0.22, 0.5], 0.0, [
      [[-3 * Q, -2 * Q], [0.32, 0.28], [[[-2 * Q], [0.26]], [[-3 * Q, 4 * Q], [0.22, 0.2]]]],
      [[4 * Q, -3 * Q], [0.42, 0.22], [[[-3 * Q], [0.24]], [[4 * Q], [0.3]]]]
    ]);
    branch(root0, 0, [-2 * Q, -2 * Q], [0.3, 0.32], 0.1, [
      [[-1 * Q, -2 * Q], [0.26, 0.24], [[[-2 * Q], [0.22]], [[-1 * Q], [0.2]]]],
      [[-3 * Q], [0.3], null]
    ]);
    branch(root0, 0, [-1 * Q, -2 * Q], [0.36, 0.22], 0.18, [
      [[0, -1 * Q], [0.34, 0.22], [[[-2 * Q], [0.22]], [[0], [0.28]]]],
      [[-2 * Q], [0.3], null]
    ]);
    /* the soil surface line */
    var gl = [], ga = [];
    for (var gi = 0; gi <= 40; gi++) { var gx = lerp(start.x - 2.6, start.x + 2.8, gi / 40); gl.push([gx, 0.0, RZ]); ga.push(Math.sin(gi / 40 * Math.PI)); }
    var groundMat = lineMaterial({ color: 0xA9A397, opacity: 0.7, width: 1.1, grow: 0.8, head: 0.3 });
    var groundLine = new THREE.Mesh(lineGeometry([{ pts: gl, alpha: new Float32Array(ga), delay: 0 }]), groundMat);
    groundLine.renderOrder = 2; groundLine.frustumCulled = false;
    v.scene.add(groundLine);
    if (v.lights && v.lights.ground) v.lights.ground.material.depthWrite = false;
    var rootMats = [groundMat], rootW = [2.4, 1.7, 1.2];
    for (var d = 0; d < 3; d++) {
      if (!rootLines[d].length) continue;
      var rm = lineMaterial({ color: 0xB9622F, opacity: 0.95, width: rootW[d], grow: 0.55, head: 0.15 });
      var rmesh = new THREE.Mesh(lineGeometry(rootLines[d]), rm);
      rmesh.renderOrder = 2; rmesh.frustumCulled = false;
      v.scene.add(rmesh);
      rootMats.push(rm);
    }
    var padGeo = new THREE.CylinderGeometry(0.075, 0.075, 0.02, 24);
    padGeo.rotateX(Math.PI / 2);
    var padMat = K.mat.copper({ roughness: 0.35 });
    var padHoleMat = K.mat.std(0x3A2A20, 0.6, 0);
    var holeGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.022, 14);
    holeGeo.rotateX(Math.PI / 2);
    var padMeshes = pads.map(function (pd) {
      var m = mesh(padGeo, padMat, false, false);
      m.position.set(pd.p.x, pd.p.y, RZ);
      var hole = mesh(holeGeo, padHoleMat, false, false);
      hole.position.z = 0.002;
      m.add(hole);
      v.scene.add(m);
      return { m: m, delay: pd.delay };
    });

    /* --- stations --- */
    var builders = [emblemAtom, emblemLed, emblemPcb, emblemSonar, emblemLaptop];
    var names = [['01', 'Elektrik', 'Atomdan akıma'], ['02', 'Devre', 'Direnç, diyot, LED, transistör'], ['03', 'PCB', 'Bakır yollar ve katmanlar'], ['04', 'Sensör', 'Dünyayı ölçmek'], ['05', 'Bilgisayar', '1 ve 0\'ın dünyası']];
    var pedMat = K.mat.std(0xFBFAF7, 0.5, 0, { envMapIntensity: 0.9 });
    var stations = STU.map(function (u, i) {
      var p = curve.getPointAt(u);
      var grp = new THREE.Group();
      grp.position.copy(p);
      v.scene.add(grp);
      var landing = mesh(new THREE.CylinderGeometry(0.78, 0.78, 0.07, 48), revealMaterial(K.mat.std(0xE9E6DC, 0.62, 0)), true, true);
      landing.customDepthMaterial = revealDepth;
      landing.geometry = landing.geometry.clone();
      var cnt = landing.geometry.attributes.position.count;
      landing.geometry.setAttribute('aU', new THREE.Float32BufferAttribute(new Float32Array(cnt).fill(u), 1));
      grp.add(landing);
      var lift = new THREE.Group();
      grp.add(lift);
      var ped = mesh(lathe([[0, 0], [0.56, 0], [0.6, 0.03], [0.6, 0.27], [0.58, 0.3], [0, 0.3]], 48), pedMat, true, true);
      ped.position.y = 0.035;
      lift.add(ped);
      var ringMat = new THREE.MeshStandardMaterial({ color: 0xC8693A, roughness: 0.3, metalness: 1, emissive: 0xF2A35C, emissiveIntensity: 0 });
      var ring = mesh(new THREE.TorusGeometry(0.6, 0.018, 8, 64), ringMat, false, false);
      ring.rotation.x = Math.PI / 2;
      ring.position.y = 0.32;
      lift.add(ring);
      var em = builders[i]();
      em.position.y = 0.335;
      em.scale.setScalar(1.22);
      em.rotation.y = [0.2, -0.25, 0.15, -0.2, -0.35][i];
      lift.add(em);
      var html = '<div style="text-align:center;line-height:1.25">' +
        '<span style="font:500 14px ' + K.fonts.mono + ';letter-spacing:.08em;color:#A64B22">' + names[i][0] + '</span>' +
        '<span style="font:700 18px ' + K.fonts.sans + ';color:#15171C;margin-left:7px">' + names[i][1] + '</span><br>' +
        '<span style="font:400 15px ' + K.fonts.sans + ';color:#595E69">' + names[i][2] + '</span></div>';
      var L = v.label(html, { at: p.clone().add(V3(0, 2.12, 0)), cls: 'note', html: true, valign: 'bottom', dy: -2 });
      labelOpacity(L, 0);
      return { u: u, grp: grp, lift: lift, em: em, ringMat: ringMat, label: L, glow: 0 };
    });

    /* --- sky end: dotted ascent and an orbiting satellite --- */
    var endP = curve.getPointAt(1);
    var orbitC = V3(9.85, 4.05, -2.4), ORB = 0.95;
    var ascent = [];
    for (var a2 = 0; a2 <= 40; a2++) {
      var s2 = a2 / 40;
      ascent.push([lerp(endP.x, orbitC.x - 0.4, s2), lerp(endP.y, orbitC.y - ORB * 0.55, E.out(s2)), lerp(endP.z, orbitC.z, s2)]);
    }
    var ascentMat = lineMaterial({ color: 0xC8693A, opacity: 0.8, width: 1.6, dash: [0.12, 0.16], grow: 0.8, head: 0.1 });
    var ascentMesh = new THREE.Mesh(lineGeometry([{ pts: ascent, delay: 0 }]), ascentMat);
    ascentMesh.renderOrder = 3; ascentMesh.frustumCulled = false;
    v.scene.add(ascentMesh);
    var orbitPts = [];
    var oq = new THREE.Quaternion().setFromEuler(new THREE.Euler(1.15, 0.2, 0.25));
    for (var k2 = 0; k2 <= 160; k2++) {
      var an = k2 / 160 * TAU;
      var op = V3(Math.cos(an) * ORB, 0, Math.sin(an) * ORB).applyQuaternion(oq).add(orbitC);
      orbitPts.push([op.x, op.y, op.z]);
    }
    var orbitMat = lineMaterial({ color: 0x595E69, opacity: 0.55, width: 1.1, dash: [0.08, 0.1], grow: 1.0, head: 0.2 });
    var orbitMesh = new THREE.Mesh(lineGeometry([{ pts: orbitPts, delay: 0 }]), orbitMat);
    orbitMesh.renderOrder = 3; orbitMesh.frustumCulled = false;
    v.scene.add(orbitMesh);
    var sat = satellite();
    sat.traverse(function (o) { o.castShadow = false; });
    sat.scale.setScalar(0.62);
    v.scene.add(sat);
    var satAt = V3(0, 0, 0);
    var endLabelHtml = '<div style="text-align:right;line-height:1.25">' +
      '<span style="font:700 18px ' + K.fonts.sans + ';color:#15171C">Gökler</span><br>' +
      '<span style="font:400 15px ' + K.fonts.sans + ';color:#595E69">Haberleşme ve uydular</span></div>';
    var endLabel = v.label(endLabelHtml, { at: orbitC.clone().add(V3(1.3, -1.15, 0)), cls: 'note', html: true, align: 'right', valign: 'top', dy: 2 });
    labelOpacity(endLabel, 0);

    /* --- traveller --- */
    var orb = new THREE.Mesh(new THREE.SphereGeometry(0.11, 20, 14), new THREE.MeshBasicMaterial({ color: 0xFFF6E4, toneMapped: false }));
    v.scene.add(orb);
    var orbGlow = glowSprite('#F2B04B', 1.6, 0);
    orbGlow.renderOrder = 6;
    v.scene.add(orbGlow);
    var orbP = V3(0, 0, 0);
    var lineMats = rootMats.concat([traceMat, trailMat, ascentMat, orbitMat]);

    function frame(t, dt) {
      var T = reduced ? 30 : t;
      /* intro */
      rootMats.forEach(function (m) { m.uniforms.uTime.value = T; });
      padMeshes.forEach(function (pm) { var k = E.out(span(T, pm.delay, pm.delay + 0.4)); pm.m.scale.set(k + 0.001, k + 0.001, 1); });
      var rev = E.inOut(span(T, 0.8, 3.2));
      revealU.value = rev * 1.001;
      traceMat.uniforms.uTime.value = rev;
      ascentMat.uniforms.uTime.value = Math.max(0, T - 3.1);
      orbitMat.uniforms.uTime.value = Math.max(0, T - 3.4);
      stations.forEach(function (st, i) {
        var t0 = 1.3 + i * 0.42;
        var k = E.outQuint ? E.outQuint(span(T, t0, t0 + 0.7)) : E.out(span(T, t0, t0 + 0.7));
        st.lift.scale.setScalar(0.001 + 0.999 * k);
        st.lift.position.y = -0.25 * (1 - k);
        labelOpacity(st.label, sstep(t0 + 0.3, t0 + 0.8, T));
      });
      labelOpacity(endLabel, sstep(3.8, 4.4, T));
      /* satellite on its orbit */
      var sa = T * 0.55;
      satAt.set(Math.cos(sa) * ORB, 0, Math.sin(sa) * ORB).applyQuaternion(oq).add(orbitC);
      sat.position.copy(satAt);
      sat.rotation.set(0.3, -sa + 0.4, 0.15);
      sat.visible = T > 3.4;
      sat.scale.setScalar(0.62 * E.out(span(T, 3.4, 4.0)) + 0.0001);
      /* traveller: 12 s along the path, then up to the orbit, then a pause */
      var cyc = TRAVEL + 1.6 + PAUSE;
      var tau = reduced ? -1 : (T - INTRO) % cyc;
      var onPath = T > INTRO && tau >= 0 && tau < TRAVEL;
      var up = T > INTRO && tau >= TRAVEL && tau < TRAVEL + 1.6;
      var pu = onPath ? E.sine(tau / TRAVEL) * 0.15 + (tau / TRAVEL) * 0.85 : 1;
      var orbA = 0;
      if (onPath) {
        curve.getPointAt(pu, orbP);
        curve.getTangentAt(pu, tt); ts.crossVectors(tt, V3(0, 1, 0)).normalize(); tn.crossVectors(ts, tt).normalize();
        orbP.addScaledVector(tn, 0.16);
        orbA = sstep(0, 0.4, tau) ;
        trailMat.uniforms.uTrail.value.set(pu, 0.16);
        trailMat.uniforms.uOpacity.value = 0.95;
      } else if (up) {
        var su = (tau - TRAVEL) / 1.6, ai = Math.min(ascent.length - 1, Math.floor(su * (ascent.length - 1)));
        var aj = Math.min(ascent.length - 1, ai + 1), fr = su * (ascent.length - 1) - ai;
        orbP.set(lerp(ascent[ai][0], ascent[aj][0], fr), lerp(ascent[ai][1], ascent[aj][1], fr), lerp(ascent[ai][2], ascent[aj][2], fr));
        orbA = 1 - sstep(0.6, 1, su);
        trailMat.uniforms.uOpacity.value = 0.95 * (1 - sstep(0, 0.4, su));
      } else {
        trailMat.uniforms.uOpacity.value = 0;
      }
      orb.position.copy(orbP);
      orbGlow.position.copy(orbP);
      orb.visible = orbA > 0.01;
      orb.scale.setScalar(0.4 + 0.6 * orbA);
      orbGlow.material.opacity = 0.85 * orbA;
      /* stations brighten as the traveller passes */
      stations.forEach(function (st, i) {
        var near = onPath ? Math.exp(-Math.pow((pu - st.u) / 0.035, 2)) : 0;
        var after = onPath && pu > st.u ? Math.exp(-(pu - st.u) * 4) : 0;
        var target = reduced ? 0.4 : Math.max(near, after * 0.6);
        st.glow += (target - st.glow) * Math.min(1, (dt || 0.016) * 6);
        st.ringMat.emissiveIntensity = 1.4 * st.glow;
        st.lift.position.y += 0.05 * near;
        if (st.em.tick) st.em.tick(T, st.glow);
      });
      /* slow parallax drift */
      if (!reduced) {
        v.view.yaw = HOME.yaw + Math.sin(t * 0.11) * 0.035;
        v.view.pitch = HOME.pitch + Math.sin(t * 0.07 + 1) * 0.012;
      }
      syncRes(v, lineMats);
      v.render(dt);
    }
    return {
      reset: function () {
        v.setView({ yaw: HOME.yaw, pitch: HOME.pitch, distance: HOME.distance, target: HOME.target });
        stations.forEach(function (st) { st.glow = 0; });
      },
      frame: frame,
      dispose: function () { v.dispose(); }
    };
  });

  /* ==================================================================
   * field-dipole · F 1280×720 · dark
   * ================================================================== */
  K.register('field-dipole', function (el, opts) {
    var THREE = window.THREE;
    opts = opts || {};
    var closing = opts.variant === 'closing';
    var C = closing
      ? { cx: 1035 / 1280, cy: 470 / 720, ppu: 135, n: 26, rot: 0.6, fade: [640, 900] }
      : { cx: 1000 / 1280, cy: 400 / 720, ppu: 160, n: 40, rot: 0.25, fade: [560, 780] };
    var FOV = 26, PITCH = 0.2;
    var dist = 720 / (2 * Math.tan(FOV / 2 * Math.PI / 180) * C.ppu);
    var v = K.stage3d(el, { theme: 'dark', fov: FOV, orbit: false, yaw: 0, pitch: PITCH, distance: dist, size: 3, shadows: false, near: 0.5, far: 60 });
    var reduced = K.reducedMotion;
    var lastW = -1, lastH = -1;
    function applyOffset() {
      var w = v.sf.w || 1280, h = v.sf.h || 720;
      lastW = v.sf.w; lastH = v.sf.h;
      v.camera.setViewOffset(w, h, w * (0.5 - C.cx), h * (0.5 - C.cy), w, h);
    }
    applyOffset();
    if (v.lights) {
      v.lights.key.intensity = 1.25;
      v.lights.rim.intensity = 0.9;
      v.lights.fill.intensity = 0.25;
      v.lights.hemi.intensity = 0.2;
    }

    var R = 0.15;                       /* charge radius in world units (≈ 24 px on the cover) */
    var QA = [-1, 0, 0], QB = [1, 0, 0]; /* +q at A, −q at B */

    function efield(x, y, z, o) {
      var ax = x + 1, ay = y, az = z, ra2 = ax * ax + ay * ay + az * az, ka = 1 / (ra2 * Math.sqrt(ra2));
      var bx = x - 1, by = y, bz = z, rb2 = bx * bx + by * by + bz * bz, kb = 1 / (rb2 * Math.sqrt(rb2));
      o[0] = ax * ka - bx * kb; o[1] = ay * ka - by * kb; o[2] = az * ka - bz * kb;
      return o;
    }
    var fe = [0, 0, 0];
    function dir(x, y, z, o) {
      efield(x, y, z, o);
      var m = Math.sqrt(o[0] * o[0] + o[1] * o[1] + o[2] * o[2]) || 1;
      o[0] /= m; o[1] /= m; o[2] /= m;
      return m;
    }
    function emag(x, y, z) { efield(x, y, z, fe); return Math.sqrt(fe[0] * fe[0] + fe[1] * fe[1] + fe[2] * fe[2]); }

    /* RK4 field-line trace from a point on the + sphere, unit-speed parametrisation. */
    function trace(x, y, z) {
      var pts = [x, y, z];
      var k1 = [0, 0, 0], k2 = [0, 0, 0], k3 = [0, 0, 0], k4 = [0, 0, 0];
      var reached = false;
      for (var s = 0; s < 1400; s++) {
        var rb = Math.sqrt((x - 1) * (x - 1) + y * y + z * z);
        var ra = Math.sqrt((x + 1) * (x + 1) + y * y + z * z);
        var h = 0.012 + 0.03 * clamp(Math.min(ra, rb) - 0.3, 0, 1);
        dir(x, y, z, k1);
        dir(x + k1[0] * h / 2, y + k1[1] * h / 2, z + k1[2] * h / 2, k2);
        dir(x + k2[0] * h / 2, y + k2[1] * h / 2, z + k2[2] * h / 2, k3);
        dir(x + k3[0] * h, y + k3[1] * h, z + k3[2] * h, k4);
        var nx = x + h / 6 * (k1[0] + 2 * k2[0] + 2 * k3[0] + k4[0]);
        var ny = y + h / 6 * (k1[1] + 2 * k2[1] + 2 * k3[1] + k4[1]);
        var nz = z + h / 6 * (k1[2] + 2 * k2[2] + 2 * k3[2] + k4[2]);
        var nrb = Math.sqrt((nx - 1) * (nx - 1) + ny * ny + nz * nz);
        if (nrb <= R) {
          /* finish exactly on the − sphere surface */
          var t = (rb - R) / Math.max(1e-6, rb - nrb);
          pts.push(x + (nx - x) * t, y + (ny - y) * t, z + (nz - z) * t);
          reached = true;
          break;
        }
        x = nx; y = ny; z = nz;
        pts.push(x, y, z);
        var rho = Math.sqrt(y * y + z * z);
        if (rho > 5.2 || x < -7.5 || x > 5) break;
      }
      return { pts: new Float32Array(pts), reached: reached };
    }

    var group = new THREE.Group();
    v.scene.add(group);

    /* --- field lines (Fibonacci directions on the + sphere) --- */
    var N = C.n, GA = Math.PI * (3 - Math.sqrt(5));
    var lines = [], lineDefs = [];
    var EMIN = 0.018, EMAX = 0.42;
    for (var i = 0; i < N; i++) {
      var cx = 1 - (2 * i + 1) / N;
      var rr = Math.sqrt(1 - cx * cx), ph = i * GA + 0.4;
      var tr = trace(-1 + cx * R, rr * Math.cos(ph) * R, rr * Math.sin(ph) * R);
      var f = tr.pts, n = f.length / 3;
      var alpha = new Float32Array(n), speed = new Float32Array(n), tau = new Float32Array(n);
      for (var j = 0; j < n; j++) {
        var m = emag(f[j * 3], f[j * 3 + 1], f[j * 3 + 2]);
        var a = sstep(EMIN, EMAX, m);
        alpha[j] = Math.pow(a, 0.85);
        speed[j] = clamp(0.55 * m, 0.11, 1.7);
        if (j > 0) {
          var dx = f[j * 3] - f[j * 3 - 3], dy = f[j * 3 + 1] - f[j * 3 - 2], dz = f[j * 3 + 2] - f[j * 3 - 1];
          tau[j] = tau[j - 1] + Math.sqrt(dx * dx + dy * dy + dz * dz) * 2 / (speed[j] + speed[j - 1]);
        }
      }
      /* staggered growth: inner lines first, sweeping outwards */
      var delay = 0.25 + (i / N) * 1.1;
      lines.push({ pts: f, alpha: alpha, delay: delay });
      lineDefs.push({ f: f, n: n, tau: tau, T: tau[n - 1], alpha: alpha, reached: tr.reached, delay: delay });
    }
    var lineMat = lineMaterial({ color: 0x8EA6F2, opacity: 0.5, width: 1.3, grow: 1.15, head: 0.05, fadeX: C.fade, fadeY: [585, 612, 0.15], depthFade: [dist - 2.2, dist + 2.2, 0.38] });
    var lineMesh = new THREE.Mesh(lineGeometry(lines), lineMat);
    lineMesh.frustumCulled = false;
    lineMesh.renderOrder = 2;
    group.add(lineMesh);

    /* --- faint equipotential rings (true V = 1/ra − 1/rb contours) --- */
    function pot(x, rho) {
      var ra = Math.sqrt((x + 1) * (x + 1) + rho * rho), rb = Math.sqrt((x - 1) * (x - 1) + rho * rho);
      return 1 / ra - 1 / rb;
    }
    function contour(sign, V0, segs) {
      /* closed curve around the charge at x = −sign, in the (x, rho) half-planes; returns [[x, rho]...] */
      var cxq = -sign, out = [];
      for (var k = 0; k <= segs; k++) {
        var th = k / segs * TAU;
        var c = Math.cos(th), s = Math.sin(th);
        var lo = 0.02, hi = 1.9;
        for (var it = 0; it < 40; it++) {
          var mid = (lo + hi) / 2;
          var val = sign * pot(cxq + c * mid, s * mid);
          if (val > V0) lo = mid; else hi = mid;
        }
        var rr2 = (lo + hi) / 2;
        out.push([cxq + c * rr2, s * rr2]);
      }
      return out;
    }
    var rings = [];
    [[1, 0.36], [1, 0.62], [-1, 0.36], [-1, 0.62]].forEach(function (lv, li) {
      var sign = lv[0], r0 = lv[1];
      var V0 = 1 / r0 - 1 / (2 + r0);
      var cur = contour(sign, V0, 160);
      [0, Math.PI / 3, 2 * Math.PI / 3].forEach(function (az) {
        var pts = cur.map(function (q) { return [q[0], q[1] * Math.cos(az), q[1] * Math.sin(az)]; });
        rings.push({ pts: pts, alpha: 1, delay: 1.2 + li * 0.12 });
      });
      /* the circle where the surface meets the plane through the charge, perpendicular to the axis */
      var cxq = -sign, lo = 0.02, hi = 1.9;
      for (var it = 0; it < 40; it++) { var mid = (lo + hi) / 2; if (sign * pot(cxq, mid) > V0) lo = mid; else hi = mid; }
      var rc = (lo + hi) / 2, circ = [];
      for (var k = 0; k <= 120; k++) { var th = k / 120 * TAU; circ.push([cxq, Math.cos(th) * rc, Math.sin(th) * rc]); }
      rings.push({ pts: circ, alpha: 1, delay: 1.2 + li * 0.12 });
    });
    var ringMat = lineMaterial({ color: 0x8EA6F2, opacity: 0.3, width: 1.0, grow: 1.4, head: 0.1, dash: [0.03, 0.045], fadeX: C.fade, fadeY: [585, 612, 0.15], depthFade: [dist - 1, dist + 1, 0.45] });
    var ringMesh = new THREE.Mesh(lineGeometry(rings), ringMat);
    ringMesh.frustumCulled = false;
    ringMesh.renderOrder = 1;
    group.add(ringMesh);

    /* --- flowing particles --- */
    var parts = [];
    lineDefs.forEach(function (L, li) {
      var M = clamp(Math.round(L.T / 1.5), 1, 9);
      for (var k = 0; k < M; k++) parts.push({ L: L, ph: (k + 0.37 * (li % 3)) / M * L.T });
    });
    var pc = pointsCloud(parts.length, { color: 0xE39A6C, core: 0xFFF1E8, size: 12, coreR: 0.24, fadeX: C.fade, fadeY: [585, 612, 0.15] });
    pc.renderOrder = 3;
    group.add(pc);

    /* --- the charges --- */
    function signTex(minus, bump) {
      return K.textTexture(1024, 512, function (ctx, w, h) {
        ctx.fillStyle = bump ? '#ffffff' : '#ffffff';
        ctx.fillRect(0, 0, w, h);
        var cx = w * 0.25, cy = h * 0.5, arm = 74, half = 10;
        ctx.filter = bump ? 'blur(3px)' : 'blur(1.2px)';
        ctx.fillStyle = bump ? '#000000' : (minus ? '#3a4a7a' : '#6e3c22');
        ctx.fillRect(cx - arm, cy - half, arm * 2, half * 2);
        if (!minus) ctx.fillRect(cx - half, cy - arm, half * 2, arm * 2);
        ctx.filter = 'none';
      });
    }
    var sphGeo = new THREE.SphereGeometry(R, 72, 48);
    var plusMat = K.mat.copper({ map: signTex(false, false), bumpMap: signTex(false, true), bumpScale: 0.006, roughness: 0.26, envMapIntensity: 1.1 });
    var minusMat = K.mat.std(0x4A6AD8, 0.25, 0.7, { map: signTex(true, false), bumpMap: signTex(true, true), bumpScale: 0.006, emissive: 0x0E1A46, emissiveIntensity: 1, envMapIntensity: 1.1 });
    var plus = new THREE.Mesh(sphGeo, plusMat), minus = new THREE.Mesh(sphGeo, minusMat);
    plus.position.fromArray(QA); minus.position.fromArray(QB);
    v.scene.add(plus); v.scene.add(minus);
    var gPlus = glowSprite('#E39A6C', R * 7, 0.22), gMinus = glowSprite('#8EA6F2', R * 7, 0.22);
    gPlus.position.fromArray(QA); gMinus.position.fromArray(QB);
    gPlus.renderOrder = 0; gMinus.renderOrder = 0;
    v.scene.add(gPlus); v.scene.add(gMinus);

    /* a few drifting dust motes at different depths give the dark room some air */
    var NM = closing ? 40 : 64, dr = K.rng(9), motes = [];
    for (var mi = 0; mi < NM; mi++) motes.push({ x: (dr() * 2 - 1) * 3.2, y: (dr() * 2 - 1) * 1.9, z: (dr() * 2 - 1) * 1.6, p: dr() * TAU, w: 0.05 + dr() * 0.1, s: 3 + dr() * 5, a: 0.1 + dr() * 0.28 });
    var dust = pointsCloud(NM, { color: 0x9FB0E6, core: 0xFFFFFF, size: 5, coreR: 0.5, fadeX: C.fade, fadeY: [585, 612, 0.15] });
    dust.renderOrder = 1;
    group.add(dust);
    function placeDust(t, appear) {
      for (var i = 0; i < NM; i++) {
        var m = motes[i];
        dust.pos[i * 3] = m.x + Math.sin(t * m.w + m.p) * 0.12;
        dust.pos[i * 3 + 1] = m.y + Math.sin(t * m.w * 0.7 + m.p * 2) * 0.1 + 0.02 * t * m.w;
        dust.pos[i * 3 + 2] = m.z;
        dust.alpha[i] = m.a * appear * (0.65 + 0.35 * Math.sin(t * 0.5 + m.p));
        dust.size[i] = m.s;
      }
      dust.commit();
    }
    var mats = [lineMat, ringMat, pc.material, dust.material];
    var tmpV = new THREE.Vector3();

    function placeParticles(t) {
      var flowT = Math.max(0, t - 2.3);
      var fadeIn = sstep(2.3, 3.4, t);
      var speedK = reduced ? 0.15 : 1;
      for (var i = 0; i < parts.length; i++) {
        var p = parts[i], L = p.L;
        var tt = (flowT * speedK + p.ph) % L.T;
        /* binary search in cumulative travel time */
        var lo = 0, hi = L.n - 1;
        while (hi - lo > 1) { var mid = (lo + hi) >> 1; if (L.tau[mid] <= tt) lo = mid; else hi = mid; }
        var seg = L.tau[hi] - L.tau[lo], u = seg > 0 ? (tt - L.tau[lo]) / seg : 0;
        var f = L.f;
        pc.pos[i * 3] = lerp(f[lo * 3], f[hi * 3], u);
        pc.pos[i * 3 + 1] = lerp(f[lo * 3 + 1], f[hi * 3 + 1], u);
        pc.pos[i * 3 + 2] = lerp(f[lo * 3 + 2], f[hi * 3 + 2], u);
        var al = lerp(L.alpha[lo], L.alpha[hi], u);
        var endFade = sstep(0, 0.12, tt) * (L.reached ? 1 : sstep(L.T, L.T * 0.85, tt));
        pc.alpha[i] = al * endFade * fadeIn;
        pc.size[i] = 9 + 6 * al;
      }
      pc.commit();
    }

    function frame(t, dt) {
      if (v.sf.w !== lastW || v.sf.h !== lastH) applyOffset();
      syncRes(v, mats);
      var tt = reduced ? 10 : t;
      lineMat.uniforms.uTime.value = tt;
      ringMat.uniforms.uTime.value = tt;
      group.rotation.x = C.rot + (reduced ? 0 : 0.04 * t);
      var appear = E.out(span(tt, 0, 0.9));
      plus.scale.setScalar(0.6 + 0.4 * appear); minus.scale.setScalar(0.6 + 0.4 * appear);
      plusMat.opacity = minusMat.opacity = appear;
      plusMat.transparent = minusMat.transparent = appear < 1;
      gPlus.material.opacity = gMinus.material.opacity = 0.22 * appear;
      placeParticles(tt);
      placeDust(reduced ? 0 : t, E.out(span(tt, 0.3, 2.0)));
      plus.lookAt(v.camera.position);
      minus.lookAt(v.camera.position);
      v.render(dt);
    }

    return {
      reset: function () { },
      frame: frame,
      resize: function () { applyOffset(); },
      dispose: function () { v.dispose(); }
    };
  });

  /* ==================================================================
   * op-tour · 1120×440 · card — the five operation scenes told one after another
   * (add, sub, mul, div, and); set('view', 'add'|'sub'|'mul'|'div'|'and'|'auto') pins one scene.
   * Only one WebGL scene exists at a time; the next is built while the previous fades out.
   * ================================================================== */
  K.register('op-tour', function (el, opts) {
    el.style.position = el.style.position || 'relative';
    var bw = parseFloat(el.style.width) || el.clientWidth || 1120, bh = parseFloat(el.style.height) || el.clientHeight || 440;
    var SEG = 9.5, FADE = 0.6;
    var VIEWS = [
      { id: 'add', viz: 'op-add', ex: 'Toplama: arka arkaya bağlı iki pilin gerilimleri toplanır.', f: '1,5 V + 1,5 V = 3,0 V' },
      { id: 'sub', viz: 'op-sub', ex: 'Çıkarma: kuşun iki ayağı arasında fark yok, akım geçmez.', f: '10.000 V − 10.000 V = 0 V' },
      { id: 'mul', viz: 'op-mul', ex: 'Çarpma: gerilim çarpı akım, şarj aletinin gücünü verir.', f: '5 V × 3 A = 15 W' },
      { id: 'div', viz: 'op-div', ex: 'Bölme: gerilim bölü direnç, devreden geçen akımı verir.', f: '9 V ÷ 450 Ω = 0,02 A' },
      { id: 'and', viz: 'op-and', ex: 'Mantık: makine ancak kapak kapalı VE düğmeye basılıysa çalışır.', f: '1 VE 1 = 1 · 0 VE 1 = 0' }
    ];
    var pinned = -1, cur = -1, curStart = 0, child = null, host = null, old = null, oldHost = null, oldUntil = 0, lastT = 0;
    function build(i, t) {
      var d = document.createElement('div');
      d.style.cssText = 'position:absolute;left:0;top:0;width:' + bw + 'px;height:' + bh + 'px;opacity:0';
      d.setAttribute('data-theme', 'card');
      el.appendChild(d);
      var inst = null;
      try { inst = K.create(VIEWS[i].viz, d, opts); } catch (e) { if (window.console) console.error(e); }
      if (inst && inst.reset) inst.reset();
      return { d: d, inst: inst };
    }
    function drop(o) {
      if (!o) return;
      try { if (o.inst && o.inst.dispose) o.inst.dispose(); } catch (e) { }
      if (o.d.parentNode) o.d.parentNode.removeChild(o.d);
    }
    function pick(t) {
      var i = pinned >= 0 ? pinned : (K.reducedMotion ? 0 : Math.floor(t / SEG) % VIEWS.length);
      if (i !== cur) {
        if (old) drop(old);
        old = child; oldUntil = t + FADE;
        child = build(i, t);
        cur = i; curStart = t;
      }
    }
    pick(0);
    return {
      reset: function () { pinned = -1; },
      set: function (k, val) {
        if (k !== 'view') return;
        var ix = VIEWS.map(function (x) { return x.id; }).indexOf(String(val));
        pinned = ix;
        if (ix >= 0) pick(lastT);
      },
      read: function (k) {
        var V = VIEWS[Math.max(0, cur)];
        if (k === 'explain') return V.ex;
        if (k === 'formula') return V.f;
        if (k === 'view') return V.id;
        return '';
      },
      frame: function (t, dt) {
        lastT = t;
        if (pinned < 0) pick(t);
        var lt = t - curStart;
        if (child) {
          child.d.style.opacity = String(E.inOut(span(lt, 0, FADE)) * (pinned >= 0 ? 1 : 1 - E.inOut(span(lt, SEG - FADE * 0.5, SEG))));
          if (child.inst) child.inst.frame(lt, dt);
        }
        if (old) {
          if (t >= oldUntil) { drop(old); old = null; }
          else {
            old.d.style.opacity = String(1 - E.inOut(span(t, oldUntil - FADE, oldUntil)));
            if (old.inst) old.inst.frame(SEG - 0.01, dt);
          }
        }
      },
      resize: function () { },
      dispose: function () { drop(child); drop(old); child = old = null; }
    };
  });

})();
