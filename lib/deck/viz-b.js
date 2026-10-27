/* Köklerden Göklere · Builder B · Atom görselleri
 *   hook-atom       H + H → H₂ (bağ bulutu)
 *   zoom-to-atom    kablodan bakır çekirdeğine ölçek yolculuğu
 *   atom-cloud      karbon: basitleştirilmiş model ↔ olasılık bulutu
 *   coulomb         iki yüklü küre, alan çizgileri, 1/d² kuvvet
 *   valence-detach  bakırda dış elektronların serbest kalması (elektron denizi)
 * Tek IIFE, KGViz çekirdeği üzerine. Bütün hareket frame() ile sürülür.
 */
(function () {
  'use strict';
  var K = window.KGViz;
  if (!K) return;
  var P = K.palette;
  var clamp = K.clamp, lerp = K.lerp, sstep = K.smoothstep;
  var TAU = Math.PI * 2;

  /* ------------------------------------------------------------------
   * Küçük yardımcılar
   * ------------------------------------------------------------------ */
  function rgb01(hex) {
    var c = parseInt(String(hex).replace('#', ''), 16);
    return [((c >> 16) & 255) / 255, ((c >> 8) & 255) / 255, (c & 255) / 255];
  }
  function v3hex(hex) { var c = rgb01(hex); return new window.THREE.Vector3(c[0], c[1], c[2]); }
  function eio(x) { return K.ease.inOut(clamp(x, 0, 1)); }
  function esin(x) { return K.ease.sine(clamp(x, 0, 1)); }
  function moveTo(cur, target, step) { var d = target - cur; return Math.abs(d) <= step ? target : cur + (d > 0 ? step : -step); }
  function approach(cur, target, dt, tau) { return target + (cur - target) * Math.exp(-dt / Math.max(1e-4, tau)); }
  function fmt(x, d) { return K.num(x, d); }
  /* sign strings may arrive as '-', '−' or '+' */
  function signOf(s) { s = String(s).trim(); return (s === '-' || s === '−' || s === '–' || s === 'eksi' || s === 'neg') ? -1 : 1; }

  /* Pixels per world unit at view depth 1 (device px), for size-attenuated points */
  function pxScale(v) {
    var fov = v.camera.fov * Math.PI / 180;
    return (Math.max(1, v.sf.h) * v.sf.k) / (2 * Math.tan(fov / 2));
  }

  /* Sum of k unit exponentials → Gamma(k, scale) */
  function gammaK(rng, k, scale) {
    var p = 1;
    for (var i = 0; i < k; i++) p *= 1 - rng();
    return -Math.log(Math.max(p, 1e-300)) * scale;
  }
  function uniDir(rng, o) {
    var z = 2 * rng() - 1, a = TAU * rng(), s = Math.sqrt(Math.max(0, 1 - z * z));
    o[0] = s * Math.cos(a); o[1] = s * Math.sin(a); o[2] = z;
    return o;
  }
  /* Angular density ∝ cos²θ about an axis (p orbital): cosθ = cbrt(2u − 1) exactly */
  function pDir(rng, axis, o) {
    var c = Math.cbrt(2 * rng() - 1), s = Math.sqrt(Math.max(0, 1 - c * c)), a = TAU * rng();
    var p = s * Math.cos(a), q = s * Math.sin(a);
    if (axis === 0) { o[0] = c; o[1] = p; o[2] = q; }
    else if (axis === 1) { o[0] = p; o[1] = c; o[2] = q; }
    else { o[0] = p; o[1] = q; o[2] = c; }
    return o;
  }
  /* Inverse-CDF sampler for any radial probability density P(r) on [0, rMax] */
  function radialSampler(pdf, rMax, n) {
    var cdf = new Float64Array(n + 1), acc = 0, h = rMax / n, prev = pdf(0);
    for (var i = 1; i <= n; i++) { var cur = pdf(i * h); acc += 0.5 * (prev + cur) * h; cdf[i] = acc; prev = cur; }
    for (i = 1; i <= n; i++) cdf[i] /= acc;
    return function (u) {
      var lo = 0, hi = n;
      while (hi - lo > 1) { var mid = (lo + hi) >> 1; if (cdf[mid] <= u) lo = mid; else hi = mid; }
      var f = (u - cdf[lo]) / Math.max(1e-12, cdf[hi] - cdf[lo]);
      return (lo + f) * h;
    };
  }

  /* Delta-based camera sway so that teacher drags are preserved */
  function makeSway() {
    var st = { y: 0, p: 0 };
    return {
      apply: function (v, yaw, pitch) {
        v.view.yaw += yaw - st.y; st.y = yaw;
        if (pitch !== undefined) { v.view.pitch += pitch - st.p; st.p = pitch; }
      },
      reset: function () { st.y = 0; st.p = 0; }
    };
  }
  function homeView(v) {
    v.setView({ yaw: v.home.yaw, pitch: v.home.pitch, distance: v.home.distance, target: v.home.target.toArray() });
  }

  /* Screen-fixed DOM label inside the visual's label layer */
  function fixedLabel(v, text, cls, o) {
    o = o || {};
    var host = v.el.querySelector('.kg-labels') || v.el;
    var d = document.createElement('div');
    d.className = 'kg-l ' + (cls || 'chip');
    if (o.html) d.innerHTML = text; else d.textContent = text;
    host.appendChild(d);
    var L = {
      el: d, txt: text, x: o.x || 0, y: o.y || 0, align: o.align || 'left', valign: o.valign || 'top', visible: true,
      place: function () {
        var bw = d.offsetWidth, bh = d.offsetHeight;
        var ox = L.align === 'right' ? -bw : L.align === 'center' ? -bw / 2 : 0;
        var oy = L.valign === 'bottom' ? -bh : L.valign === 'middle' ? -bh / 2 : 0;
        d.style.transform = 'translate(' + Math.round(L.x + ox) + 'px,' + Math.round(L.y + oy) + 'px)';
        return L;
      },
      set: function (t) {
        if (t !== L.txt) { L.txt = t; if (o.html) d.innerHTML = t; else d.textContent = t; L.place(); }
        return L;
      },
      show: function (b) {
        b = b !== false;
        if (b !== L.visible) { L.visible = b; if (b) d.classList.remove('hide'); else d.classList.add('hide'); }
        return L;
      },
      at: function (x, y, align, valign) { L.x = x; L.y = y; if (align) L.align = align; if (valign) L.valign = valign; return L.place(); }
    };
    L.place();
    return L;
  }
  function showL(L, b) { if (L) L.show(!!b); }

  /* ------------------------------------------------------------------
   * Soft point sprites (electron clouds). Premultiplied output:
   * light theme → normal blending (density accumulates like ink),
   * dark theme  → additive blending (density accumulates like light).
   * ------------------------------------------------------------------ */
  var PT_HEAD = [
    'uniform float uScale;', 'uniform float uSize;', 'uniform float uMinPx;', 'uniform float uMaxPx;',
    'uniform vec2 uDepth;', 'uniform float uFadeNear;',
    'attribute float aSize;', 'attribute float aAlpha;', 'attribute float aTint;',
    '#ifdef USE_ACOLOR', 'attribute vec3 aColor;', 'varying vec3 vC;', '#endif',
    'varying float vA;', 'varying float vT;', 'varying float vD;'
  ].join('\n');
  var PT_TAIL = [
    '  vec4 mv = modelViewMatrix * vec4(p, 1.0);',
    '  float d = max(-mv.z, 1e-6);',
    '  float px = uSize * aSize * uScale / d;',
    '  if (px < uMinPx) { float rr = px / uMinPx; a *= rr * rr; px = uMinPx; }',
    '  if (px > uMaxPx) { float rq = uMaxPx / px; a *= rq * rq; px = uMaxPx; }',
    '  if (uFadeNear > 0.0) a *= smoothstep(uFadeNear * 0.35, uFadeNear, d);',
    '  vA = a; vT = aTint;',
    '#ifdef USE_ACOLOR',
    '  vC = aColor;',
    '#endif',
    '  vD = clamp((d - uDepth.x) / max(uDepth.y - uDepth.x, 1e-6), 0.0, 1.0);',
    '  gl_PointSize = px;',
    '  gl_Position = projectionMatrix * mv;'
  ].join('\n');
  var PT_VS = PT_HEAD + '\nvoid main(){\n  vec3 p = position;\n  float a = aAlpha;\n' + PT_TAIL + '\n}';
  var PT_FS = [
    'uniform vec3 uC0;', 'uniform vec3 uC1;', 'uniform float uOpacity;', 'uniform float uFar;', 'uniform float uSoft;', 'uniform float uAddK;',
    'varying float vA;', 'varying float vT;', 'varying float vD;',
    '#ifdef USE_ACOLOR', 'varying vec3 vC;', '#endif',
    'void main(){',
    '  vec2 c = gl_PointCoord * 2.0 - 1.0;',
    '  float r2 = dot(c, c);',
    '  if (r2 > 1.0) discard;',
    '  float e = exp(-uSoft);',
    '  float g = (exp(-r2 * uSoft) - e) / (1.0 - e);',
    '  float a = g * vA * uOpacity * mix(1.0, uFar, vD);',
    '#ifdef USE_ACOLOR',
    '  vec3 col = mix(vC, uC1, vT);',
    '#else',
    '  vec3 col = mix(uC0, uC1, vT);',
    '#endif',
    '#ifdef ADDITIVE',
    '  gl_FragColor = vec4(col * a, a * uAddK);',
    '#else',
    '  gl_FragColor = vec4(col * a, a);',
    '#endif',
    '}'
  ].join('\n');

  function pointsMaterial(o) {
    var THREE = window.THREE;
    o = o || {};
    var c0 = rgb01(o.color || P.blue), c1 = rgb01(o.color2 || o.color || P.blue);
    var defs = {};
    if (o.additive) defs.ADDITIVE = 1;
    if (o.vertexColors) defs.USE_ACOLOR = 1;
    var uniforms = {
      uScale: { value: 500 }, uSize: { value: o.size || 0.1 },
      uMinPx: { value: o.minPx === undefined ? 1.2 : o.minPx }, uMaxPx: { value: o.maxPx || 64 },
      uDepth: { value: new THREE.Vector2(o.near || 0, o.far || 100) },
      uFar: { value: o.farAlpha === undefined ? 1 : o.farAlpha },
      uFadeNear: { value: o.fadeNear || 0 },
      uC0: { value: new THREE.Vector3(c0[0], c0[1], c0[2]) },
      uC1: { value: new THREE.Vector3(c1[0], c1[1], c1[2]) },
      uOpacity: { value: o.opacity === undefined ? 1 : o.opacity },
      uSoft: { value: o.soft || 3.0 },
      uAddK: { value: Math.max(c0[0], c0[1], c0[2], c1[0], c1[1], c1[2]) }
    };
    if (o.uniforms) for (var k in o.uniforms) uniforms[k] = o.uniforms[k];
    return new THREE.ShaderMaterial({
      uniforms: uniforms,
      vertexShader: o.vs || PT_VS,
      fragmentShader: o.fs || PT_FS,
      defines: defs,
      transparent: true, depthWrite: false, depthTest: o.depthTest !== false,
      blending: o.additive ? THREE.AdditiveBlending : THREE.NormalBlending,
      premultipliedAlpha: true
    });
  }
  /* BufferGeometry for points with the standard attributes */
  function pointsGeometry(n, dynamic) {
    var THREE = window.THREE;
    var g = new THREE.BufferGeometry();
    var pos = new THREE.BufferAttribute(new Float32Array(n * 3), 3);
    if (dynamic) pos.setUsage(THREE.DynamicDrawUsage);
    g.setAttribute('position', pos);
    g.setAttribute('aSize', new THREE.BufferAttribute(new Float32Array(n).fill(1), 1));
    g.setAttribute('aAlpha', new THREE.BufferAttribute(new Float32Array(n).fill(1), 1));
    g.setAttribute('aTint', new THREE.BufferAttribute(new Float32Array(n), 1));
    return g;
  }

  /* ------------------------------------------------------------------
   * Screen-space polylines: crisp, depth-tested, any pixel width
   * ------------------------------------------------------------------ */
  var LN_VS = [
    'uniform vec2 uRes;', 'uniform float uWidth;',
    'attribute vec3 aPrev;', 'attribute vec3 aNext;', 'attribute float aSide;', 'attribute float aAlpha;', 'attribute float aU;',
    'varying float vA;', 'varying float vS;', 'varying float vU;', 'varying float vW;',
    'void main(){',
    '  mat4 m = projectionMatrix * modelViewMatrix;',
    '  vec4 c = m * vec4(position, 1.0);',
    '  vec4 pp = m * vec4(aPrev, 1.0);',
    '  vec4 nn = m * vec4(aNext, 1.0);',
    '  vec2 asp = vec2(uRes.x / uRes.y, 1.0);',
    '  vec2 cs = c.xy / c.w * asp;',
    '  vec2 ps = pp.xy / pp.w * asp;',
    '  vec2 ns = nn.xy / nn.w * asp;',
    '  vec2 d1 = cs - ps; vec2 d2 = ns - cs;',
    '  float l1 = length(d1); float l2 = length(d2);',
    '  vec2 dir = vec2(1.0, 0.0);',
    '  float miter = 1.0;',
    '  if (l1 > 1e-7 && l2 > 1e-7) {',
    '    dir = normalize(d1 / l1 + d2 / l2);',
    '    vec2 n1 = vec2(-d1.y, d1.x) / l1;',
    '    miter = 1.0 / max(dot(vec2(-dir.y, dir.x), n1), 0.6);',
    '  } else if (l1 > 1e-7) { dir = d1 / l1; } else if (l2 > 1e-7) { dir = d2 / l2; }',
    '  vec2 nrm = vec2(-dir.y, dir.x);',
    '  float w = uWidth + 1.2;',
    '  vec2 off = nrm * (0.5 * w * miter * aSide) * (2.0 / uRes.y);',
    '  off.x /= asp.x;',
    '  c.xy += off * c.w;',
    '  gl_Position = c;',
    '  vA = aAlpha; vS = aSide; vU = aU; vW = w;',
    '}'
  ].join('\n');
  var LN_FS = [
    'uniform vec3 uColor;', 'uniform float uOpacity;', 'uniform float uDash;', 'uniform float uDashOn;', 'uniform float uAddK;', 'uniform float uFlow;', 'uniform float uPhase;',
    'varying float vA;', 'varying float vS;', 'varying float vU;', 'varying float vW;',
    'void main(){',
    '  float d = abs(vS) * vW * 0.5;',
    '  float a = clamp(vW * 0.5 - d, 0.0, 1.0);',
    '  if (uDash > 0.0) { float f = fract(vU * uDash); a *= smoothstep(0.0, 0.06, f) * (1.0 - smoothstep(uDashOn, uDashOn + 0.06, f)); }',
    '  if (uFlow > 0.0) { float fp = fract(vU / uFlow - uPhase) - 0.5; a *= 0.42 + 1.1 * exp(-fp * fp / 0.012); }',
    '  a *= vA * uOpacity;',
    '  if (a < 0.002) discard;',
    '#ifdef ADDITIVE',
    '  gl_FragColor = vec4(uColor * a, a * uAddK);',
    '#else',
    '  gl_FragColor = vec4(uColor * a, a);',
    '#endif',
    '}'
  ].join('\n');

  function LineBatch(maxPts, o) {
    var THREE = window.THREE;
    o = o || {};
    var nv = maxPts * 2;
    var pos = new Float32Array(nv * 3), prv = new Float32Array(nv * 3), nxt = new Float32Array(nv * 3);
    var side = new Float32Array(nv), alp = new Float32Array(nv), uu = new Float32Array(nv);
    for (var i = 0; i < maxPts; i++) { side[2 * i] = -1; side[2 * i + 1] = 1; }
    var Idx = nv > 65000 ? Uint32Array : Uint16Array;
    var idx = new Idx(maxPts * 6);
    var geo = new THREE.BufferGeometry();
    function dyn(arr, n) { var a = new THREE.BufferAttribute(arr, n); a.setUsage(THREE.DynamicDrawUsage); return a; }
    var A = { position: dyn(pos, 3), aPrev: dyn(prv, 3), aNext: dyn(nxt, 3), aAlpha: dyn(alp, 1), aU: dyn(uu, 1) };
    for (var k in A) geo.setAttribute(k, A[k]);
    geo.setAttribute('aSide', new THREE.BufferAttribute(side, 1));
    var IA = dyn(idx, 1);
    geo.setIndex(IA);
    var col = rgb01(o.color || P.ink2);
    var defs = {};
    if (o.additive) defs.ADDITIVE = 1;
    var mat = new THREE.ShaderMaterial({
      uniforms: {
        uRes: { value: new THREE.Vector2(800, 600) }, uWidth: { value: o.width || 1.4 },
        uColor: { value: new THREE.Vector3(col[0], col[1], col[2]) }, uOpacity: { value: o.opacity === undefined ? 1 : o.opacity },
        uFlow: { value: o.flow || 0 }, uPhase: { value: 0 }, uDash: { value: o.dash || 0 }, uDashOn: { value: o.dashOn || 0.5 }, uAddK: { value: Math.max(col[0], col[1], col[2]) }
      },
      vertexShader: LN_VS, fragmentShader: LN_FS, defines: defs, side: THREE.DoubleSide,
      transparent: true, depthWrite: false, depthTest: o.depthTest !== false,
      blending: o.additive ? THREE.AdditiveBlending : THREE.NormalBlending,
      premultipliedAlpha: true
    });
    var mesh = new THREE.Mesh(geo, mat);
    mesh.frustumCulled = false;
    if (o.renderOrder) mesh.renderOrder = o.renderOrder;
    var np = 0, ni = 0;
    var B = {
      mesh: mesh, mat: mat, max: maxPts,
      begin: function () { np = 0; ni = 0; },
      room: function (n) { return np + n + 1 <= maxPts; },
      /* pts: flat xyz array; n points starting at point index s (default 0); alpha: number or per-point array (indexed like pts) */
      add: function (pts, n, alpha, closed, s) {
        s = s || 0;
        var total = closed ? n + 1 : n;
        if (n < 2 || np + total > maxPts) return false;
        var base = np, cum = 0, lx = 0, ly = 0, lz = 0;
        for (var i = 0; i < total; i++) {
          var ii = closed ? i % n : i;
          var o3 = (s + ii) * 3;
          var x = pts[o3], y = pts[o3 + 1], z = pts[o3 + 2];
          var ip = closed ? (ii - 1 + n) % n : ii - 1, inx = closed ? (ii + 1) % n : ii + 1;
          var px, py, pz, qx, qy, qz;
          if (ip >= 0) { px = pts[(s + ip) * 3]; py = pts[(s + ip) * 3 + 1]; pz = pts[(s + ip) * 3 + 2]; }
          if (inx < n) { qx = pts[(s + inx) * 3]; qy = pts[(s + inx) * 3 + 1]; qz = pts[(s + inx) * 3 + 2]; }
          if (ip < 0) { px = 2 * x - qx; py = 2 * y - qy; pz = 2 * z - qz; }
          if (inx >= n) { qx = 2 * x - px; qy = 2 * y - py; qz = 2 * z - pz; }
          if (i > 0) { var ddx = x - lx, ddy = y - ly, ddz = z - lz; cum += Math.sqrt(ddx * ddx + ddy * ddy + ddz * ddz); }
          lx = x; ly = y; lz = z;
          var a = typeof alpha === 'number' ? alpha : alpha[s + ii];
          for (var sd = 0; sd < 2; sd++) {
            var vi = (base + i) * 2 + sd, v3 = vi * 3;
            pos[v3] = x; pos[v3 + 1] = y; pos[v3 + 2] = z;
            prv[v3] = px; prv[v3 + 1] = py; prv[v3 + 2] = pz;
            nxt[v3] = qx; nxt[v3 + 1] = qy; nxt[v3 + 2] = qz;
            alp[vi] = a; uu[vi] = cum;
          }
        }
        for (i = 0; i < total - 1; i++) {
          var a0 = (base + i) * 2;
          idx[ni++] = a0; idx[ni++] = a0 + 1; idx[ni++] = a0 + 2;
          idx[ni++] = a0 + 1; idx[ni++] = a0 + 3; idx[ni++] = a0 + 2;
        }
        np += total;
        return true;
      },
      end: function () {
        geo.setDrawRange(0, ni);
        var cnt = np * 2;
        for (var key in A) {
          var at = A[key];
          at.updateRange.offset = 0;
          at.updateRange.count = Math.max(1, cnt * at.itemSize);
          at.needsUpdate = true;
        }
        IA.updateRange.offset = 0; IA.updateRange.count = Math.max(1, ni);
        IA.needsUpdate = true;
      },
      res: function (v) { mat.uniforms.uRes.value.set(Math.max(1, v.sf.w * v.sf.k), Math.max(1, v.sf.h * v.sf.k)); },
      opacity: function (x) { mat.uniforms.uOpacity.value = x; mesh.visible = x > 0.002; }
    };
    return B;
  }
  /* closed circle polyline in the plane spanned by unit vectors u, w */
  function circlePts(out, off, n, cx, cy, cz, r, u, w) {
    for (var i = 0; i < n; i++) {
      var a = TAU * i / n, ca = Math.cos(a) * r, sa = Math.sin(a) * r, o3 = (off + i) * 3;
      out[o3] = cx + ca * u[0] + sa * w[0];
      out[o3 + 1] = cy + ca * u[1] + sa * w[1];
      out[o3 + 2] = cz + ca * u[2] + sa * w[2];
    }
  }
  function norm3(a) { var l = Math.sqrt(a[0] * a[0] + a[1] * a[1] + a[2] * a[2]) || 1; a[0] /= l; a[1] /= l; a[2] /= l; return a; }
  function cross3(a, b) { return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]; }
  function basisFor(n) {
    var ref = Math.abs(n[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0];
    var u = norm3(cross3(ref, n)), w = norm3(cross3(n, u));
    return { u: u, w: w };
  }

  /* ------------------------------------------------------------------
   * Nucleus packing (deterministic relaxation) and instanced nucleons
   * ------------------------------------------------------------------ */
  function packNucleus(count, rN, seed) {
    var rng = K.rng(seed), pts = [], i, j, it;
    var R0 = rN * Math.cbrt(count / 0.6);
    for (i = 0; i < count; i++) {
      var d = uniDir(rng, [0, 0, 0]), r = R0 * Math.cbrt(rng());
      pts.push([d[0] * r, d[1] * r, d[2] * r]);
    }
    var minD = 2 * rN * 0.9;
    for (it = 0; it < 420; it++) {
      for (i = 0; i < count; i++) {
        for (j = i + 1; j < count; j++) {
          var a = pts[i], b = pts[j];
          var dx = b[0] - a[0], dy = b[1] - a[1], dz = b[2] - a[2];
          var dd = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1e-6;
          if (dd < minD) {
            var push = (minD - dd) * 0.5 / dd;
            a[0] -= dx * push; a[1] -= dy * push; a[2] -= dz * push;
            b[0] += dx * push; b[1] += dy * push; b[2] += dz * push;
          }
        }
      }
      var k = it < 200 ? 0.03 : it < 340 ? 0.015 : 0.006;
      for (i = 0; i < count; i++) { pts[i][0] *= 1 - k; pts[i][1] *= 1 - k; pts[i][2] *= 1 - k; }
    }
    return pts;
  }
  function makeNucleus(Z, N, rN, seed, o) {
    var THREE = window.THREE;
    o = o || {};
    var pts = packNucleus(Z + N, rN, seed);
    var rng = K.rng(seed * 7 + 3), order = [];
    for (var i = 0; i < pts.length; i++) order.push(i);
    for (i = order.length - 1; i > 0; i--) { var j = Math.floor(rng() * (i + 1)); var tmp = order[i]; order[i] = order[j]; order[j] = tmp; }
    var isP = new Array(pts.length);
    for (i = 0; i < pts.length; i++) isP[order[i]] = i < Z;
    var geo = new THREE.IcosahedronGeometry(rN, o.detail === undefined ? 3 : o.detail);
    var pm = o.protonMat || K.mat.proton(), nm = o.neutronMat || K.mat.neutron();
    var pI = new THREE.InstancedMesh(geo, pm, Z), nI = new THREE.InstancedMesh(geo, nm, N);
    var m = new THREE.Matrix4(), pi = 0, ni = 0;
    var protons = [], neutrons = [];
    for (i = 0; i < pts.length; i++) {
      m.makeTranslation(pts[i][0], pts[i][1], pts[i][2]);
      if (isP[i]) { pI.setMatrixAt(pi++, m); protons.push(pts[i]); } else { nI.setMatrixAt(ni++, m); neutrons.push(pts[i]); }
    }
    pI.instanceMatrix.needsUpdate = true; nI.instanceMatrix.needsUpdate = true;
    pI.castShadow = nI.castShadow = !!o.castShadow;
    var g = new THREE.Group();
    g.add(pI); g.add(nI);
    return { group: g, protons: protons, neutrons: neutrons, pI: pI, nI: nI, pm: pm, nm: nm, rN: rN };
  }
  /* front-most nucleon of a set (for label anchoring) in a given view direction */
  function frontMost(list, dir) {
    var best = list[0], bd = -1e9;
    for (var i = 0; i < list.length; i++) {
      var p = list[i], d = p[0] * dir[0] + p[1] * dir[1] + p[2] * dir[2];
      if (d > bd) { bd = d; best = p; }
    }
    return best;
  }

  /* Overlay text with a real superscript exponent: 10^e unit */
  function drawPow10(ctx, x, y, e, size, color, unit) {
    ctx.save();
    ctx.fillStyle = color;
    ctx.textBaseline = 'alphabetic';
    ctx.textAlign = 'left';
    ctx.font = K.font(size, 500, true);
    ctx.fillText('10', x, y);
    var w = ctx.measureText('10').width;
    var es = (e < 0 ? '−' : '') + Math.abs(e);
    var ss = Math.round(size * 0.68);
    ctx.font = K.font(ss, 500, true);
    ctx.fillText(es, x + w + size * 0.04, y - size * 0.42);
    var w2 = ctx.measureText(es).width;
    var end = x + w + size * 0.04 + w2;
    if (unit) {
      ctx.font = K.font(size, 400, true);
      ctx.fillText(unit, end + size * 0.32, y);
      end += size * 0.32 + ctx.measureText(unit).width;
    }
    ctx.restore();
    return end - x;
  }
  var SUP = { '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹', '−': '⁻', '-': '⁻' };
  function supStr(n) {
    var s = (n < 0 ? '−' : '') + Math.abs(n), out = '';
    for (var i = 0; i < s.length; i++) out += SUP[s[i]] || s[i];
    return out;
  }

  /* ==================================================================
   * hook-atom · 256×150 · H + H → H₂
   * Electron density of two 1s orbitals ψ = ψA + ψB (LCAO), sampled with a
   * Metropolis walk carried continuously through the approach (keyframes
   * in R), then interpolated. Each point also turns about the bond axis at
   * its own rate: the density is axially symmetric, so it stays exact.
   * ================================================================== */
  K.register('hook-atom', function (el, opts) {
    var THREE = window.THREE;
    opts = opts || {};
    var theme = opts.theme || 'light', dark = theme === 'dark';
    var v = K.stage3d(el, { theme: theme, fov: 24, distance: 21, yaw: 0, pitch: 0.2, size: 4, shadows: false, minDistance: 15, maxDistance: 30, minPitch: -0.7, maxPitch: 0.9 });
    v.lights.key.intensity = 1.35;
    var reduced = K.reducedMotion;

    var N = 3800, HALF = N >> 1;
    var rng = K.rng(424242);
    var KF = 22, Rk = new Float32Array(KF), k, i;
    for (k = 0; k < KF; k++) Rk[k] = 1.4 + 4.6 * Math.pow(1 - k / (KF - 1), 1.3);
    function zeta(R) { return 1 + 0.24 * sstep(3.6, 1.4, R); }
    function dens(x, y, z, R, ze) {
      var ax = x + R / 2, bx = x - R / 2, yz = y * y + z * z;
      var s = Math.exp(-ze * Math.sqrt(ax * ax + yz)) + Math.exp(-ze * Math.sqrt(bx * bx + yz));
      return s * s;
    }
    var cur = new Float32Array(N * 3), dir = [0, 0, 0];
    var R0 = Rk[0], z0 = zeta(R0);
    for (i = 0; i < N; i++) {
      var r = gammaK(rng, 3, 1 / (2 * z0));
      uniDir(rng, dir);
      var cx = i < HALF ? -R0 / 2 : R0 / 2;
      cur[i * 3] = cx + r * dir[0]; cur[i * 3 + 1] = r * dir[1]; cur[i * 3 + 2] = r * dir[2];
    }
    function metro(R, steps, step) {
      var ze = zeta(R);
      for (var s = 0; s < steps; s++) {
        for (var j = 0; j < N; j++) {
          var x = cur[j * 3], y = cur[j * 3 + 1], z = cur[j * 3 + 2];
          var d0 = dens(x, y, z, R, ze);
          var nx = x + (rng() * 2 - 1) * step, ny = y + (rng() * 2 - 1) * step, nz = z + (rng() * 2 - 1) * step;
          var d1 = dens(nx, ny, nz, R, ze);
          if (d1 >= d0 || rng() * d0 < d1) { cur[j * 3] = nx; cur[j * 3 + 1] = ny; cur[j * 3 + 2] = nz; }
        }
      }
    }
    metro(R0, 24, 0.6);
    var frames = [cur.slice()];
    for (k = 1; k < KF; k++) {
      var dR = Rk[k] - Rk[k - 1], zp = zeta(Rk[k - 1]), Rp = Rk[k - 1];
      for (i = 0; i < N; i++) {
        var x = cur[i * 3], y = cur[i * 3 + 1], z = cur[i * 3 + 2], yz = y * y + z * z;
        var wa = Math.exp(-2 * zp * Math.sqrt((x + Rp / 2) * (x + Rp / 2) + yz));
        var wb = Math.exp(-2 * zp * Math.sqrt((x - Rp / 2) * (x - Rp / 2) + yz));
        var w = wa / (wa + wb + 1e-30);
        cur[i * 3] += w * (-dR / 2) + (1 - w) * (dR / 2);
      }
      metro(Rk[k], k === KF - 1 ? 44 : 14, 0.5);
      frames.push(cur.slice());
    }

    var geo = pointsGeometry(N, true);
    var pos = geo.attributes.position.array, aS = geo.attributes.aSize.array, aA = geo.attributes.aAlpha.array, aT = geo.attributes.aTint.array;
    var ang0 = new Float32Array(N), angW = new Float32Array(N);
    for (i = 0; i < N; i++) {
      aS[i] = 0.75 + 0.5 * rng(); aA[i] = dark ? 0.22 : 0.095; aT[i] = rng();
      ang0[i] = TAU * rng(); angW[i] = (0.22 + 0.5 * rng()) * (rng() < 0.5 ? -1 : 1);
    }
    var mat = pointsMaterial({
      color: dark ? P.blueLight : '#1F3DA6', color2: dark ? '#C3CFF7' : '#3D5DCB',
      size: 0.46, minPx: 1.5, maxPx: 24, soft: 2.2, additive: dark, farAlpha: 0.5
    });
    var cloud = new THREE.Points(geo, mat);
    cloud.frustumCulled = false;
    v.scene.add(cloud);
    var pGeo = new THREE.SphereGeometry(0.3, 32, 20), pMat = K.mat.proton();
    pMat.depthTest = false; pMat.transparent = true;
    pMat.emissive = new THREE.Color(0x8A3E16); pMat.emissiveIntensity = 0.25;
    var pA = new THREE.Mesh(pGeo, pMat), pB = new THREE.Mesh(pGeo, pMat);
    pA.renderOrder = pB.renderOrder = 5;
    v.scene.add(pA); v.scene.add(pB);

    var Rnow = 6;
    var atA = new THREE.Vector3(), atB = new THREE.Vector3();
    var tagH2 = v.label('H<sub>2</sub>', { at: [0, 2.45, 0], cls: 'tag', html: true });
    var tagA = v.label('H', { at: function () { return atA.set(-Rnow / 2, 2.6, 0); }, cls: 'tag' });
    var tagB = v.label('H', { at: function () { return atB.set(Rnow / 2, 2.6, 0); }, cls: 'tag' });
    [tagH2, tagA, tagB].forEach(function (L) { L.el.style.letterSpacing = '0.02em'; L.el.style.fontSize = '14px'; L.el.style.color = dark ? '#E8ECF4' : '#15171C'; });
    var sway = makeSway();

    function Rof(t) {
      var u = t % 7;
      if (u < 0.5) return 6;
      if (u < 2.7) return lerp(6, 1.4, eio((u - 0.5) / 2.2));
      if (u < 5.0) return 1.4;
      if (u < 6.6) return lerp(1.4, 6, eio((u - 5.0) / 1.6));
      return 6;
    }

    return {
      reset: function () { homeView(v); sway.reset(); },
      frame: function (t, dt) {
        var R = reduced ? 1.4 : Rof(t);
        Rnow = R;
        var kk = 0;
        while (kk < KF - 2 && Rk[kk + 1] > R) kk++;
        var f = clamp((Rk[kk] - R) / (Rk[kk] - Rk[kk + 1]), 0, 1);
        var A0 = frames[kk], A1 = frames[kk + 1];
        var tt = reduced ? 0 : t;
        for (var j = 0; j < N; j++) {
          var o3 = j * 3;
          var x = A0[o3] + (A1[o3] - A0[o3]) * f;
          var y = A0[o3 + 1] + (A1[o3 + 1] - A0[o3 + 1]) * f;
          var z = A0[o3 + 2] + (A1[o3 + 2] - A0[o3 + 2]) * f;
          var a = ang0[j] + angW[j] * tt, ca = Math.cos(a), sa = Math.sin(a);
          pos[o3] = x; pos[o3 + 1] = y * ca - z * sa; pos[o3 + 2] = y * sa + z * ca;
        }
        geo.attributes.position.needsUpdate = true;
        pA.position.set(-R / 2, 0, 0);
        pB.position.set(R / 2, 0, 0);
        var bonded = sstep(2.0, 1.5, R);
        showL(tagH2, bonded > 0.5);
        showL(tagA, R > 3.2); showL(tagB, R > 3.2);
        if (!reduced) sway.apply(v, 0.22 * Math.sin(TAU * t / 14));
        mat.uniforms.uScale.value = pxScale(v);
        var cd = v.view.distance;
        mat.uniforms.uDepth.value.set(cd - 3, cd + 3);
        v.render(dt);
      },
      read: function () { return ''; },
      dispose: function () { v.dispose(); }
    };
  });

  /* ==================================================================
   * atom-cloud · 680×520 · carbon (6 p, 6 n, 6 e)
   * Hydrogen-like orbitals with Clementi–Raimondi effective charges:
   *   1s Z=5,673 · 2s Z=3,217 · 2p Z=3,136 (Hund: 2p_x¹ 2p_y¹)
   * ================================================================== */
  var AC_VS = [
    PT_HEAD,
    'uniform float uMorph;', 'uniform float uTime;',
    'uniform vec3 uRU0;', 'uniform vec3 uRW0;', 'uniform vec3 uRU1;', 'uniform vec3 uRW1;',
    'uniform float uRR0;', 'uniform float uRR1;', 'uniform float uRA0;', 'uniform float uRA1;',
    'attribute vec3 aCloud;', 'attribute float aAng;', 'attribute float aRing;', 'attribute float aDelay;', 'attribute vec3 aJit;',
    'void main(){',
    '  bool inner = aRing < 0.5;',
    '  float ang = aAng + (inner ? uRA0 : uRA1);',
    '  vec3 U = inner ? uRU0 : uRU1; vec3 W = inner ? uRW0 : uRW1; float R = inner ? uRR0 : uRR1;',
    '  vec3 ringP = R * (cos(ang) * U + sin(ang) * W) + aJit * 0.035;',
    '  float m = clamp((uMorph - aDelay * 0.42) / 0.58, 0.0, 1.0);',
    '  m = m * m * (3.0 - 2.0 * m);',
    '  vec3 p = mix(ringP, aCloud, m) + aJit * (0.55 * sin(3.14159 * m));',
    '  float tw = 0.8 + 0.2 * sin(uTime * (0.6 + aDelay * 1.1) + aAng * 3.0);',
    '  float a = aAlpha * smoothstep(0.0, 0.22, uMorph) * tw;',
    PT_TAIL,
    '}'
  ].join('\n');

  K.register('atom-cloud', function (el, opts) {
    var THREE = window.THREE;
    opts = opts || {};
    var theme = opts.theme || 'light', dark = theme === 'dark';
    var v = K.stage3d(el, { theme: theme, fov: 28, distance: 16, yaw: 0, pitch: 0.3, target: [0, -0.05, 0], size: 5, shadows: false, minDistance: 11, maxDistance: 28 });
    v.lights.key.intensity = 1.6;
    var reduced = K.reducedMotion;
    var root = new THREE.Group();
    v.scene.add(root);

    /* nucleus: 6 protons + 6 neutrons (not to scale) */
    var nuc = makeNucleus(6, 6, 0.13, 61, { detail: 3, neutronMat: K.mat.std(0x9AA0AB, 0.42, 0.05) });
    root.add(nuc.group);

    /* rings of the simplified shell model */
    var n0 = norm3([-0.55, 0.5, 0.7]), n1 = norm3([0.5, 0.62, 0.6]);
    var b0 = basisFor(n0), b1 = basisFor(n1);
    var RR0 = 1.0, RR1 = 2.3;
    var rings = LineBatch(300, { color: dark ? P.blueLight : P.blue, width: 1.3 });
    var rp = new Float32Array(260 * 3);
    circlePts(rp, 0, 128, 0, 0, 0, RR0, b0.u, b0.w);
    circlePts(rp, 128, 128, 0, 0, 0, RR1, b1.u, b1.w);
    rings.begin(); rings.add(rp, 128, 0.5, true, 0); rings.add(rp, 128, 0.5, true, 128); rings.end();
    root.add(rings.mesh);

    var eMesh = K.instanced(6, { radius: 0.14, detail: 3, dark: dark });
    root.add(eMesh);

    /* the probability cloud */
    var NP = 6000;
    var g = pointsGeometry(NP, false);
    var aS = g.attributes.aSize.array, aA = g.attributes.aAlpha.array, aT = g.attributes.aTint.array;
    var cl = new Float32Array(NP * 3), aAng = new Float32Array(NP), aRing = new Float32Array(NP), aDel = new Float32Array(NP), aJit = new Float32Array(NP * 3);
    var aCol = new Float32Array(NP * 3);
    var PAL = dark ? [rgb01('#C9D4FA'), rgb01('#7F96E6'), rgb01('#A9BCF8'), rgb01('#8FD0F0')] : [rgb01('#13276B'), rgb01('#A7B6E8'), rgb01('#1B3AAE'), rgb01('#2C88CF')];
    var rng = K.rng(6006), d = [0, 0, 0], jd = [0, 0, 0], i;
    /* 2p lobes drawn slightly narrower than the exact cos² weighting so the two dumbbells read at a glance */
    function pLobe(rg, axis, o) {
      var u = 2 * rg() - 1, c = (u < 0 ? -1 : 1) * Math.pow(Math.abs(u), 1 / 6), sn = Math.sqrt(Math.max(0, 1 - c * c)), an = TAU * rg();
      var pp = sn * Math.cos(an), qq = sn * Math.sin(an);
      if (axis === 0) { o[0] = c; o[1] = pp; o[2] = qq; } else { o[0] = pp; o[1] = c; o[2] = qq; }
      return o;
    }
    var s2 = radialSampler(function (r) { var Z = 3.217, q = 2 - Z * r; return r * r * q * q * Math.exp(-Z * r); }, 10, 5000);
    for (i = 0; i < NP; i++) {
      var r, kind;
      if (i < 1500) { kind = 0; r = gammaK(rng, 3, 1 / (2 * 5.673)); uniDir(rng, d); }
      else if (i < 2700) { kind = 1; r = s2(rng()); uniDir(rng, d); }
      else if (i < 4350) { kind = 2; r = gammaK(rng, 7, 0.26); pLobe(rng, 0, d); }
      else { kind = 3; r = gammaK(rng, 7, 0.26); pLobe(rng, 1, d); }
      cl[i * 3] = r * d[0]; cl[i * 3 + 1] = r * d[1]; cl[i * 3 + 2] = r * d[2];
      aRing[i] = kind === 0 ? 0 : 1;
      aAng[i] = TAU * rng();
      aDel[i] = rng();
      uniDir(rng, jd);
      var jm = 0.3 + 0.7 * rng();
      aJit[i * 3] = jd[0] * jm; aJit[i * 3 + 1] = jd[1] * jm; aJit[i * 3 + 2] = jd[2] * jm;
      aS[i] = (kind === 0 ? 0.8 : 1) * (0.85 + 0.3 * rng());
      aA[i] = kind === 0 ? 0.42 : kind === 1 ? 0.12 : 0.6;
      aT[i] = 0;
      var pc = PAL[kind];
      aCol[i * 3] = pc[0]; aCol[i * 3 + 1] = pc[1]; aCol[i * 3 + 2] = pc[2];
    }
    g.setAttribute('aCloud', new THREE.BufferAttribute(cl, 3));
    g.setAttribute('aAng', new THREE.BufferAttribute(aAng, 1));
    g.setAttribute('aRing', new THREE.BufferAttribute(aRing, 1));
    g.setAttribute('aDelay', new THREE.BufferAttribute(aDel, 1));
    g.setAttribute('aJit', new THREE.BufferAttribute(aJit, 3));
    g.setAttribute('aColor', new THREE.BufferAttribute(aCol, 3));
    /* two layers over the same samples: a soft density fog and fine crisp dots */
    var shared = {
      uMorph: { value: 0 }, uTime: { value: 0 },
      uRU0: { value: new THREE.Vector3().fromArray(b0.u) }, uRW0: { value: new THREE.Vector3().fromArray(b0.w) },
      uRU1: { value: new THREE.Vector3().fromArray(b1.u) }, uRW1: { value: new THREE.Vector3().fromArray(b1.w) },
      uRR0: { value: RR0 }, uRR1: { value: RR1 }, uRA0: { value: 0 }, uRA1: { value: 0 }
    };
    var gF = new THREE.BufferGeometry();
    ['position', 'aTint', 'aCloud', 'aAng', 'aRing', 'aDelay', 'aJit', 'aColor'].forEach(function (nm) { gF.setAttribute(nm, g.getAttribute(nm)); });
    var fS = new Float32Array(NP), fA = new Float32Array(NP);
    for (i = 0; i < NP; i++) {
      var kd = i < 1500 ? 0 : i < 2700 ? 1 : 2;
      fS[i] = kd === 0 ? 0.42 : kd === 1 ? 0.7 : 0.78;
      fA[i] = kd === 0 ? 0.085 : kd === 1 ? 0.009 : 0.07;
    }
    gF.setAttribute('aSize', new THREE.BufferAttribute(fS, 1));
    gF.setAttribute('aAlpha', new THREE.BufferAttribute(fA, 1));
    var fogMat = pointsMaterial({ vs: AC_VS, vertexColors: true, size: 0.62, minPx: 2, maxPx: 28, soft: 2.4, additive: dark, farAlpha: 0.55, uniforms: shared });
    var dotMat = pointsMaterial({ vs: AC_VS, vertexColors: true, size: 0.042, minPx: 1.5, maxPx: 6, soft: 1.3, additive: dark, farAlpha: 0.4, uniforms: shared });
    var fog = new THREE.Points(gF, fogMat), dots = new THREE.Points(g, dotMat);
    fog.frustumCulled = dots.frustumCulled = false;
    root.add(fog); root.add(dots);
    var cmats = [fogMat, dotMat];

    /* labels */
    function rootAnchor(x, y, z) {
      var p = new THREE.Vector3();
      return function () { p.set(x, y, z); return p.applyMatrix4(root.matrixWorld); };
    }
    function ringAnchor(R, b, a) {
      var p = new THREE.Vector3(), ca = Math.cos(a) * R, sa = Math.sin(a) * R;
      return function () { p.set(ca * b.u[0] + sa * b.w[0], ca * b.u[1] + sa * b.w[1], ca * b.u[2] + sa * b.w[2]); return p.applyMatrix4(root.matrixWorld); };
    }
    var lNuc = v.label('çekirdek: 6 proton + 6 nötron', { at: [0.06, -0.12, 0.1], cls: 'note', dx: 120, dy: 120, line: true, align: 'left' });
    var l1s = v.label('1s', { at: [0, 0.05, 0], cls: 'value', dx: -60, dy: -52, line: true, align: 'right' });
    var l2s = v.label('2s', { at: rootAnchor(-1.3, -1.3, 0.3), cls: 'value', dx: -50, dy: 44, line: true, align: 'right' });
    var l2p = v.label('2p', { at: rootAnchor(0.0, 1.9, 0), cls: 'value', dx: 56, dy: -26, line: true, align: 'left' });
    var l2p2 = v.label('2p', { at: rootAnchor(1.9, 0.0, 0), cls: 'value', dx: 56, dy: 34, line: true, align: 'left' });
    var lConf = fixedLabel(v, 'Karbon: 6 elektron = 2 + 4', 'note', { x: 20, y: 50 });
    var lR0 = v.label('1. katman: 2 elektron', { at: ringAnchor(RR0, b0, 3.7), cls: 'note', dx: -110, dy: 0, line: true, align: 'right' });
    var lR1 = v.label('2. katman: 4 elektron', { at: ringAnchor(RR1, b1, -0.5), cls: 'note', dx: 90, dy: 40, line: true, align: 'left' });
    var chip = fixedLabel(v, 'Basitleştirilmiş model', 'chip', { x: 18, y: 16 });
    var tagScale = fixedLabel(v, 'Ölçekli değil: çekirdek, atomdan on binlerce kat küçüktür', 'note', { x: 18, y: 500, valign: 'bottom' });

    [lConf, tagScale].forEach(function (L) { L.el.style.fontSize = '14px'; if (!dark) L.el.style.color = '#3E434D'; });
    [l1s, l2s, l2p, l2p2].forEach(function (L) { L.el.style.fontSize = '22px'; L.el.style.fontWeight = '700'; });
    [lNuc, lR0, lR1].forEach(function (L) { L.el.style.fontSize = '17px'; L.el.style.fontWeight = '600'; L.el.style.color = dark ? '#E8ECF4' : '#15171C'; });
    var auto = true, morph = 0, target = 0, spin = 0, orbitT = 0;
    var eAng = [0, Math.PI, 0, Math.PI / 2, Math.PI, Math.PI * 1.5];
    var sway = makeSway();

    function modeName() { return target > 0.5 ? 'Olasılık bulutu' : 'Basitleştirilmiş model'; }

    return {
      reset: function () { auto = true; morph = 0; target = 0; spin = 0; orbitT = 0; homeView(v); sway.reset(); },
      set: function (key, val) {
        if (key !== 'mode') return;
        auto = false;
        var s = String(val).toLowerCase();
        target = (s === 'cloud' || s === 'bulut') ? 1 : 0;
      },
      read: function (key) { return key === 'mode' ? modeName() : key === 'explain' ? (target > 0.5 ? 'Elektron bir bulut gibi yayılır.' : 'Basitleştirilmiş atom modeli.') : ''; },
      frame: function (t, dt) {
        if (auto) target = Math.floor(t / 9) % 2;
        morph = moveTo(morph, target, dt / 2);
        var m = eio(morph);
        if (!reduced) { spin += dt; orbitT += dt; }
        root.rotation.y = 0.55 * Math.sin(TAU * spin / 26);
        root.scale.setScalar(1 + 0.42 * (1 - m));
        root.updateMatrixWorld();
        var w0 = 0.85, w1 = 0.55;
        var ra0 = orbitT * w0, ra1 = orbitT * w1;
        shared.uRA0.value = ra0; shared.uRA1.value = ra1;
        shared.uMorph.value = m;
        shared.uTime.value = reduced ? 0 : t;
        var es = 1 - sstep(0.0, 0.35, m);
        nuc.group.scale.setScalar(1 - 0.38 * m);
        for (var j = 0; j < 6; j++) {
          var inner = j < 2, R = inner ? RR0 : RR1, b = inner ? b0 : b1;
          var a = eAng[j] + (inner ? ra0 : ra1), ca = Math.cos(a) * R, sa = Math.sin(a) * R;
          eMesh.setAt(j, ca * b.u[0] + sa * b.w[0], ca * b.u[1] + sa * b.w[1], ca * b.u[2] + sa * b.w[2], Math.max(0.0001, es));
        }
        eMesh.commit();
        eMesh.visible = es > 0.001;
        rings.opacity(1 - sstep(0.05, 0.55, m));
        rings.res(v);
        var psc = pxScale(v), cd = v.view.distance;
        for (var mi = 0; mi < 2; mi++) { cmats[mi].uniforms.uScale.value = psc; cmats[mi].uniforms.uDepth.value.set(cd - 3, cd + 3); }
        showL(lR0, m < 0.25); showL(lR1, m < 0.25);
        showL(l1s, m > 0.75); showL(l2s, m > 0.75); showL(l2p, m > 0.75); showL(l2p2, m > 0.75);
        var wideFS = v.w / v.h > 1.8;
        chip.show(!wideFS); lConf.show(!wideFS);
        chip.set(target > 0.5 ? 'Olasılık bulutu: elektronun bulunabileceği yerler' : 'Basitleştirilmiş model');
        lConf.set(target > 0.5 ? 'Karbon: 2 + 2 + 2 = 6 elektron (1s, 2s, 2p)' : 'Karbon: 6 elektron = 2 + 4');
        if (!reduced) sway.apply(v, 0.08 * Math.sin(TAU * t / 23));
        v.render(dt);
      },
      dispose: function () { v.dispose(); }
    };
  });

  /* ==================================================================
   * coulomb · 680×520 · two charged metal spheres on glass stands
   * Field of two point charges, F ∝ q_a·q_b / d² (relative to d = 4 cm)
   * ================================================================== */
  function woodTexture(seed) {
    return K.textTexture(1024, 512, function (ctx, w, h) {
      var rng = K.rng(seed);
      ctx.fillStyle = '#D7B892';
      ctx.fillRect(0, 0, w, h);
      for (var i = 0; i < 260; i++) {
        var y0 = rng() * h, amp = 2 + rng() * 7, f = 0.002 + rng() * 0.006, ph = rng() * TAU;
        var dark = rng() < 0.55;
        ctx.strokeStyle = dark ? 'rgba(150,104,62,' + (0.05 + rng() * 0.11) + ')' : 'rgba(246,226,196,' + (0.05 + rng() * 0.1) + ')';
        ctx.lineWidth = 0.6 + rng() * 2.4;
        ctx.beginPath();
        for (var x = 0; x <= w; x += 8) {
          var y = y0 + Math.sin(x * f + ph) * amp + Math.sin(x * f * 3.1 + ph * 1.7) * amp * 0.3;
          if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
      for (i = 0; i < 9000; i++) {
        ctx.fillStyle = 'rgba(120,80,40,' + (rng() * 0.05) + ')';
        ctx.fillRect(rng() * w, rng() * h, 1 + rng() * 3, 1);
      }
    });
  }
  function rulerTexture(lenCm, widCm, zeroCm) {
    var pxcm = 128;
    var W = Math.round(lenCm * pxcm), H = Math.round(widCm * pxcm);
    return K.textTexture(W, H, function (ctx, w, h) {
      var g = ctx.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, '#E9EBEE'); g.addColorStop(1, '#D7DADF');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
      var rng = K.rng(9);
      for (var i = 0; i < 700; i++) {
        ctx.fillStyle = rng() < 0.5 ? 'rgba(255,255,255,0.18)' : 'rgba(120,126,136,0.10)';
        ctx.fillRect(0, rng() * h, w, 1);
      }
      ctx.fillStyle = '#1A1C21';
      ctx.strokeStyle = '#1A1C21';
      var maxMm = Math.floor((lenCm - zeroCm - 0.5) * 10);
      for (var mm = 0; mm <= maxMm; mm++) {
        var x = (zeroCm + mm / 10) * pxcm;
        var L = mm % 10 === 0 ? 0.42 : mm % 5 === 0 ? 0.3 : 0.19;
        ctx.fillRect(Math.round(x - (mm % 10 === 0 ? 2 : 1.25)), 0, mm % 10 === 0 ? 4 : 2.5, L * h);
      }
      ctx.font = '500 70px ' + K.fonts.mono;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'alphabetic';
      for (var c = 0; c * 10 <= maxMm; c++) ctx.fillText(String(c), (zeroCm + c) * pxcm, h * 0.83);
      ctx.font = '500 46px ' + K.fonts.mono;
      ctx.textAlign = 'left';
      ctx.fillText('cm', (zeroCm + Math.floor(maxMm / 10)) * pxcm + 0.24 * pxcm, h * 0.83);
    });
  }
  function signTexture(sign) {
    return K.textTexture(512, 256, function (ctx, w, h) {
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, w, h);
      var cx = w * 0.25, cy = h * 0.5, L = 44, T = 14;
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(cx - L, cy - T / 2, 2 * L, T);
      if (sign > 0) ctx.fillRect(cx - T / 2, cy - L, T, 2 * L);
    });
  }
  /* Clear glass on a light page: transparent centre, defined edges (Fresnel-weighted alpha) */
  function glassMaterial(color) {
    var THREE = window.THREE;
    var m = new THREE.MeshPhysicalMaterial({ color: color, roughness: 0.05, metalness: 0, transparent: true, opacity: 1, envMapIntensity: 1.8, clearcoat: 1, clearcoatRoughness: 0.04, depthWrite: false });
    m.onBeforeCompile = function (sh) {
      sh.fragmentShader = sh.fragmentShader.replace('#include <output_fragment>', [
        '#include <output_fragment>',
        '{ float fr = pow(1.0 - abs(dot(normalize(normal), normalize(vViewPosition))), 1.6);',
        '  gl_FragColor.rgb *= mix(1.0, 0.72, fr);',
        '  float lum = dot(gl_FragColor.rgb, vec3(0.299, 0.587, 0.114));',
        '  gl_FragColor.a = clamp(mix(0.07, 0.62, fr) + 0.6 * clamp(lum - 1.25, 0.0, 1.0), 0.0, 0.9); }'
      ].join('\n'));
    };
    m.customProgramCacheKey = function () { return 'kg-glass-fresnel'; };
    return m;
  }
  function roundRectShape(x0, y0, w, h, r) {
    var s = new window.THREE.Shape();
    s.moveTo(x0 + r, y0);
    s.lineTo(x0 + w - r, y0); s.quadraticCurveTo(x0 + w, y0, x0 + w, y0 + r);
    s.lineTo(x0 + w, y0 + h - r); s.quadraticCurveTo(x0 + w, y0 + h, x0 + w - r, y0 + h);
    s.lineTo(x0 + r, y0 + h); s.quadraticCurveTo(x0, y0 + h, x0, y0 + h - r);
    s.lineTo(x0, y0 + r); s.quadraticCurveTo(x0, y0, x0 + r, y0);
    return s;
  }
  /* A slab: footprint rectangle in x–z, top at y = top. Shape coords are (x, −z) in cm. */
  function slab(x0, z0, w, d, thick, r, bevel, mat, top) {
    var THREE = window.THREE;
    var sh = roundRectShape(x0, -z0 - d, w, d, r);
    var geo = new THREE.ExtrudeGeometry(sh, { depth: thick, bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 3, curveSegments: 10 });
    geo.rotateX(-Math.PI / 2);
    geo.translate(0, top - thick - bevel, 0);
    var mesh = new THREE.Mesh(geo, mat);
    mesh.receiveShadow = true;
    return mesh;
  }

  K.register('coulomb', function (el, opts) {
    var THREE = window.THREE;
    opts = opts || {};
    var theme = opts.theme || 'light';
    var XA = -3.2, YC = 6.6, RS = 0.7;
    var dimA = new THREE.Vector3(), dimB = new THREE.Vector3();
    var wideC = (el.clientWidth || 680) / (el.clientHeight || 520) > 1.8;
    var v = K.stage3d(el, {
      theme: theme, fov: 26, distance: wideC ? 24 : 31, yaw: -0.08, pitch: wideC ? 0.32 : 0.4, target: wideC ? [XA + 4.2, 4.1, 1.6] : [XA + 3.6, 4.15, 1.0],
      size: 11, ground: -2.2, minDistance: wideC ? 14 : 24, maxDistance: 52, minPitch: 0.05, maxPitch: 0.95
    });
    v.lights.key.intensity = 1.55;
    v.lights.hemi.intensity = 0.5;
    var reduced = K.reducedMotion;

    /* bench */
    var wood = woodTexture(31);
    wood.wrapS = wood.wrapT = THREE.RepeatWrapping;
    wood.repeat.set(1 / 34, 1 / 17);
    var bench = slab(XA - 14, -7.5, 36, 17, 1.6, 0.6, 0.25, K.mat.wood({ map: wood, roughness: 0.58, color: 0xE6CFA8 }), 0);
    v.scene.add(bench);

    /* ruler: 0 under sphere A */
    var RL = 13.4, RW = 2.6, ZERO = 0.7;
    var rtex = rulerTexture(RL, RW, ZERO);
    rtex.wrapS = rtex.wrapT = THREE.ClampToEdgeWrapping;
    rtex.repeat.set(1 / RL, 1 / RW);
    rtex.offset.set(0, 0);
    var rShape = roundRectShape(0, 0, RL, RW, 0.12);
    var rGeo = new THREE.ExtrudeGeometry(rShape, { depth: 0.1, bevelEnabled: true, bevelThickness: 0.025, bevelSize: 0.025, bevelSegments: 2, curveSegments: 6 });
    rGeo.rotateX(-Math.PI / 2);
    var ruler = new THREE.Mesh(rGeo, K.mat.std(0xffffff, 0.38, 0.55, { map: rtex }));
    var RZ = 3.4;
    ruler.position.set(XA - ZERO, 0.0, RZ);
    ruler.castShadow = true; ruler.receiveShadow = true;
    v.scene.add(ruler);

    /* stands */
    var baseGeo = new THREE.LatheGeometry([
      new THREE.Vector2(0, 0), new THREE.Vector2(0.86, 0), new THREE.Vector2(0.9, 0.04), new THREE.Vector2(0.9, 0.3),
      new THREE.Vector2(0.86, 0.38), new THREE.Vector2(0.3, 0.42), new THREE.Vector2(0.27, 0.6), new THREE.Vector2(0, 0.6)
    ], 48);
    var baseMat = K.mat.std(0x2A2E35, 0.42, 0.65);
    var rodH = YC - RS + 0.08 - 0.55;
    var rodGeo = new THREE.CylinderGeometry(0.17, 0.17, rodH, 32, 1, false);
    rodGeo.translate(0, 0.55 + rodH / 2, 0);
    var glass = glassMaterial(0xD5E2E7);
    var cupGeo = new THREE.LatheGeometry([new THREE.Vector2(0, 0), new THREE.Vector2(0.24, 0), new THREE.Vector2(0.3, 0.12), new THREE.Vector2(0.2, 0.2), new THREE.Vector2(0, 0.2)], 32);
    var steel = K.mat.steel();
    var sphGeo = new THREE.SphereGeometry(RS, 64, 48);
    var cCopper = new THREE.Color(0xD08A5C), cBlue = new THREE.Color(0x4A6BD6);
    var texPlus = signTexture(1), texMinus = signTexture(-1);
    function stand() {
      var g = new THREE.Group();
      var b = new THREE.Mesh(baseGeo, baseMat); b.castShadow = true; b.receiveShadow = true; g.add(b);
      var rod = new THREE.Mesh(rodGeo, glass); rod.castShadow = false; g.add(rod);
      var cup = new THREE.Mesh(cupGeo, steel); cup.position.y = YC - RS - 0.12; cup.castShadow = true; g.add(cup);
      var m = new THREE.MeshStandardMaterial({ color: cCopper.clone(), metalness: 1, roughness: 0.24, emissive: 0xFFFFFF, emissiveIntensity: 0.85, emissiveMap: texPlus });
      var s = new THREE.Mesh(sphGeo, m); s.position.y = YC; s.castShadow = true; g.add(s);
      v.scene.add(g);
      return { g: g, mat: m, sign: 1 };
    }
    var SA = stand(), SB = stand();

    /* field lines */
    var NPLANE = 6, NLINE = 6, MAXSTEP = 230;
    var lines = LineBatch(2 * NPLANE * NLINE * (MAXSTEP + 2), { color: '#2F3540', width: 1.15, flow: 1.7 });
    v.scene.add(lines.mesh);
    var coneGeo = new THREE.ConeGeometry(0.1, 0.3, 14);
    var MAXC = 2 * NPLANE * NLINE;
    var cones = new THREE.InstancedMesh(coneGeo, K.mat.std(0x3E434D, 0.5, 0), MAXC);
    cones.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    cones.frustumCulled = false;
    v.scene.add(cones);
    var buf2 = new Float32Array((MAXSTEP + 2) * 2), buf3 = new Float32Array((MAXSTEP + 2) * 3), alp3 = new Float32Array(MAXSTEP + 2);
    var qa = 1, qb = -1, qaT = 1, qbT = -1, dCur = 4, dSet = 4, auto = true;
    var charges = [{ x: 0, q: 1 }, { x: 0, q: -1 }];
    var E = [0, 0];
    function field(x, r) {
      var ex = 0, er = 0;
      for (var c = 0; c < 2; c++) {
        var dx = x - charges[c].x, d2 = dx * dx + r * r, dd = Math.sqrt(d2), k = charges[c].q / (d2 * dd + 1e-9);
        ex += k * dx; er += k * r;
      }
      E[0] = ex; E[1] = er;
      return Math.sqrt(ex * ex + er * er);
    }
    function dirAt(x, r, sg, out) {
      var m = field(x, r) + 1e-12;
      out[0] = sg * E[0] / m; out[1] = sg * E[1] / m;
    }
    var k1 = [0, 0], k2 = [0, 0], k3 = [0, 0], k4 = [0, 0];
    /* trace one line in the (x, ρ) half-plane; returns point count and whether it ended on a sphere */
    var traceEnd = 0;
    function trace(ci, theta, sg) {
      var c = charges[ci], o = charges[1 - ci];
      var x = c.x + (RS + 0.02) * Math.cos(theta), r = (RS + 0.02) * Math.sin(theta);
      var n = 0;
      buf2[0] = x; buf2[1] = r; n = 1;
      traceEnd = 0;
      for (var s = 0; s < MAXSTEP; s++) {
        var dc = Math.sqrt((x - c.x) * (x - c.x) + r * r), dO = Math.sqrt((x - o.x) * (x - o.x) + r * r);
        var h = clamp(0.06 + 0.07 * Math.min(dc, dO), 0.06, 0.32);
        dirAt(x, r, sg, k1);
        dirAt(x + k1[0] * h / 2, r + k1[1] * h / 2, sg, k2);
        dirAt(x + k2[0] * h / 2, r + k2[1] * h / 2, sg, k3);
        dirAt(x + k3[0] * h, r + k3[1] * h, sg, k4);
        x += h * (k1[0] + 2 * k2[0] + 2 * k3[0] + k4[0]) / 6;
        r += h * (k1[1] + 2 * k2[1] + 2 * k3[1] + k4[1]) / 6;
        if (r < 0) r = -r;
        var dOn = Math.sqrt((x - o.x) * (x - o.x) + r * r);
        if (dOn < RS + 0.01) {
          var f = (RS + 0.01) / dOn;
          x = o.x + (x - o.x) * f; r = r * f;
          buf2[n * 2] = x; buf2[n * 2 + 1] = r; n++;
          traceEnd = 1;
          break;
        }
        buf2[n * 2] = x; buf2[n * 2 + 1] = r; n++;
        if (Math.abs(x - (charges[0].x + charges[1].x) / 2) > 15 || r > 10.5) break;
      }
      return n;
    }
    function flipPts(b, al, m) {
      for (var i = 0, j = m - 1; i < j; i++, j--) {
        for (var c = 0; c < 3; c++) { var t = b[i * 3 + c]; b[i * 3 + c] = b[j * 3 + c]; b[j * 3 + c] = t; }
        var ta = al[i]; al[i] = al[j]; al[j] = ta;
      }
    }
    var m4 = new THREE.Matrix4(), qtn = new THREE.Quaternion(), vUp = new THREE.Vector3(0, 1, 0), vDir = new THREE.Vector3(), vPos = new THREE.Vector3(), vScl = new THREE.Vector3();
    var labelAnchor = new THREE.Vector3(XA + 2, YC + 3, 0);
    var camDir = new THREE.Vector3();
    function rebuildLines() {
      camDir.copy(v.camera.position).sub(v.view.target).normalize();
      charges[0].x = XA; charges[0].q = qa;
      charges[1].x = XA + dCur; charges[1].q = qb;
      lines.begin();
      var nc = 0, bestTop = -1;
      for (var ci = 0; ci < 2; ci++) {
        var q = charges[ci].q, qo = charges[1 - ci].q;
        if (Math.abs(q) < 0.02) continue;
        var w, sg;
        if (q > 0) { w = Math.abs(q); sg = 1; }
        else { sg = -1; w = qo > 0 ? Math.max(0, (Math.abs(q) - qo) / Math.abs(q)) : Math.abs(q); }
        if (w < 0.01) continue;
        var towards = charges[1 - ci].x > charges[ci].x ? 1 : -1;
        for (var j = 0; j < NLINE; j++) {
          var ct = 1 - 2 * (j + 0.5) / NLINE;
          var th = Math.acos(ct);
          if (towards < 0) th = Math.PI - th;
          var n = trace(ci, th, sg);
          if (n < 3) continue;
          var ended = traceEnd;
          /* arc length for the arrowhead position */
          var Ltot = 0;
          for (var s = 1; s < n; s++) Ltot += Math.hypot(buf2[s * 2] - buf2[s * 2 - 2], buf2[s * 2 + 1] - buf2[s * 2 - 1]);
          var Larrow = ended ? Ltot * 0.5 : Math.min(Ltot * 0.5, 2.2);
          for (var pl = 0; pl < NPLANE; pl++) {
            var ph = TAU * pl / NPLANE, cph = Math.cos(ph), sph = Math.sin(ph);
            var m = 0, cut = false, acc = 0, ax = 0, ay = 0, az = 0, tx = 0, ty = 0, tz = 0, gotA = false;
            for (s = 0; s < n; s++) {
              var X = buf2[s * 2], Rr = buf2[s * 2 + 1];
              var Y = YC + Rr * cph, Z = Rr * sph;
              if (Y < 0.04) { cut = true; break; }
              buf3[m * 3] = X; buf3[m * 3 + 1] = Y; buf3[m * 3 + 2] = Z;
              var dmin = Math.min(Math.hypot(X - charges[0].x, Rr), Math.hypot(X - charges[1].x, Rr));
              alp3[m] = w * 0.6 * (1 - sstep(2.8, 6.6, dmin)) * (0.42 + 0.58 * sstep(-5, 3, Z));
              if (s > 0) {
                var seg = Math.hypot(X - buf3[m * 3 - 3], Y - buf3[m * 3 - 2], Z - buf3[m * 3 - 1]);
                if (!gotA && acc + seg >= Larrow) { gotA = true; ax = X; ay = Y; az = Z; tx = X - buf3[m * 3 - 3]; ty = Y - buf3[m * 3 - 2]; tz = Z - buf3[m * 3 - 1]; }
                acc += seg;
              }
              m++;
            }
            if (m >= 2) {
              /* flow runs along the field: lines traced from a negative charge are written backwards */
              if (sg < 0) flipPts(buf3, alp3, m);
              lines.add(buf3, m, alp3, false, 0);
              if (sg < 0) flipPts(buf3, alp3, m);
            }
            if (pl === 0) {
              for (s = 2; s < m; s += 2) {
                var ex = buf3[s * 3] - (charges[1].x + 2.1), ey = buf3[s * 3 + 1] - (YC + 2.3);
                var dd2 = ex * ex + ey * ey;
                if (bestTop < 0 || dd2 < bestTop) { bestTop = dd2; labelAnchor.set(buf3[s * 3], buf3[s * 3 + 1], buf3[s * 3 + 2]); }
              }
            }
            vDir.set(tx, ty, tz).normalize();
            if (gotA && nc < MAXC && Math.abs(vDir.dot(camDir)) < 0.72) {
              if (sg < 0) vDir.negate();
              qtn.setFromUnitVectors(vUp, vDir);
              vPos.set(ax, ay, az);
              var sc = w * (0.55 + 0.45 * sstep(-6, 3, az));
              vScl.set(sc, sc, sc);
              m4.compose(vPos, qtn, vScl);
              cones.setMatrixAt(nc++, m4);
            }
            if (cut && m < 2) continue;
          }
        }
      }
      lines.end();
      cones.count = nc;
      cones.instanceMatrix.needsUpdate = true;
    }

    /* force arrows */
    function makeArrow() {
      var g = new THREE.Group();
      var mat = K.mat.std(0x15171C, 0.45, 0.1);
      var shaft = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 1, 18), mat);
      var head = new THREE.Mesh(new THREE.ConeGeometry(1, 1, 28), mat);
      shaft.castShadow = head.castShadow = true;
      g.add(shaft); g.add(head);
      v.scene.add(g);
      var stemMat = K.mat.std(0x3E434D, 0.5, 0.2);
      var stem = new THREE.Mesh(new THREE.CylinderGeometry(0.034, 0.034, 1, 12), stemMat);
      var foot = new THREE.Mesh(new THREE.SphereGeometry(0.06, 16, 12), stemMat);
      v.scene.add(stem); v.scene.add(foot);
      return {
        g: g, mat: mat,
        set: function (x0, y, z, dir, len) {
          var hl = Math.min(0.46, len * 0.55), sl = Math.max(0.0001, len - hl);
          var y0 = YC + RS - 0.02, sh = Math.max(0.001, y - y0);
          stem.position.set(x0, y0 + sh / 2, z); stem.scale.set(1, sh, 1);
          foot.position.set(x0, y, z);
          stem.visible = foot.visible = len > 0.02;
          g.position.set(x0, y, z);
          g.rotation.set(0, 0, dir > 0 ? -Math.PI / 2 : Math.PI / 2);
          shaft.scale.set(0.075, sl, 0.075); shaft.position.y = sl / 2;
          head.scale.set(0.2, hl, 0.2); head.position.y = sl + hl / 2;
          g.visible = len > 0.02;
        }
      };
    }
    var FA = makeArrow(), FB = makeArrow();
    var cInk = new THREE.Color(0x15171C), cCop = new THREE.Color(0xC8693A);

    /* labels */
    var chip = fixedLabel(v, 'Zıt yükler birbirini çeker', 'chip', { x: 18, y: 16 });
    var lForce = v.label('kuvvet: 1,0 birim', { at: [0, 0, 0], cls: 'value chip', dy: -22 });
    var lGlass = v.label('cam ayak: yalıtkan', { at: [XA, 2.6, 0], cls: 'note', dx: -96, dy: 26, line: true, align: 'right' });
    var lField = v.label('elektrik alan çizgileri', { at: labelAnchor, cls: 'note', dx: 46, dy: -30, line: true, align: 'left' });
    var fPos = new THREE.Vector3();
    lForce.at = fPos;
    [lForce, lGlass, lField].forEach(function (L) { L.el.style.fontSize = '17px'; L.el.style.fontWeight = '600'; L.el.style.color = '#15171C'; });

    function fmtTrim(x) {
      var r2 = Math.round(x * 100) / 100;
      var exact = Math.abs(x - r2) < 1e-9;
      var s = K.num(r2, 2).replace(/,(\d*?)0+$/, ',$1').replace(/,$/, '');
      return { s: s, exact: exact };
    }
    function dRead() { return auto ? Math.round(dCur * 10) / 10 : Math.round(dCur * 2) / 2; }
    function kindStr() { return (qaT * qbT) < 0 ? 'Zıt yükler birbirini çeker' : 'Aynı yükler birbirini iter'; }
    function forceNum(d) { var F = (4 / d) * (4 / d); return fmtTrim(F).s; }
    function forceStr(d) { return 'Kuvvet: ' + forceNum(d) + ' birim (4 cm\'de 1 birim)'; }
    var cSteel = new THREE.Color(0xB9BEC6);
    function tintSphere(S, q) {
      if (q >= 0) S.mat.color.copy(cSteel).lerp(cCopper, q);
      else S.mat.color.copy(cSteel).lerp(cBlue, -q);
      var sg = q >= 0 ? 1 : -1;
      if (sg !== S.sign) { S.sign = sg; S.mat.emissiveMap = sg > 0 ? texPlus : texMinus; S.mat.needsUpdate = true; }
    }
    var L1 = 0.5, LMAX = 2.2; /* arrow length = F ÷ 2 cm: exactly proportional, and at 2 cm just reaches the partner sphere */
    function formulaStr(d) {
      var F = (4 / d) * (4 / d), ft = fmtTrim(F);
      var dd = K.num(d, d % 1 === 0 ? 0 : 1);
      var s = '(4 cm ÷ ' + dd + ' cm)² ' + (ft.exact ? '=' : '≈') + ' ' + ft.s + ' birim';
      if (Math.abs(d - 2) < 1e-6) s += ': mesafe yarıya inince kuvvet 4 katına çıkar';
      else if (Math.abs(d - 8) < 1e-6) s += ': mesafe 2 katına çıkınca kuvvet 4\'te 1\'ine iner';
      return s;
    }
    var lastKey = '', sinceBuild = 9;
    var sway = makeSway();

    return {
      reset: function () {
        auto = true; qa = qaT = 1; qb = qbT = -1; dSet = 4; dCur = 4; lastKey = '';
        homeView(v); sway.reset();
      },
      set: function (key, val) {
        if (key === 'distance') { auto = false; dSet = clamp(+val || 4, 2, 8); }
        else if (key === 'qa') { auto = false; qaT = signOf(val); }
        else if (key === 'qb') { auto = false; qbT = signOf(val); }
        else if (key === 'sweep') { auto = true; }
      },
      read: function (key) {
        var d = dRead();
        if (key === 'distance') return K.num(dCur, 1) + ' cm';
        if (key === 'kind') return kindStr();
        if (key === 'force') return forceStr(d);
        if (key === 'formula') return formulaStr(d);
        if (key === 'explain') return kindStr() + '.';
        return '';
      },
      frame: function (t, dt) {
        if (auto) { dCur = reduced ? 4 : 5 + 2 * Math.sin(TAU * t / 16 - Math.PI / 6); }
        else dCur = approach(dCur, dSet, dt, 0.28);
        qa = moveTo(qa, qaT, dt / 0.8);
        qb = moveTo(qb, qbT, dt / 0.8);
        /* field lines: rebuilt when something changed; during the slow auto sweep every other frame is enough */
        var key = dCur.toFixed(4) + '|' + qa.toFixed(3) + '|' + qb.toFixed(3);
        sinceBuild++;
        if (key !== lastKey && (!auto || sinceBuild >= 2 || K.skipRender)) { lastKey = key; sinceBuild = 0; rebuildLines(); }
        var XB = XA + dCur;
        SA.g.position.x = XA;
        SB.g.position.x = XB;
        /* sphere tint and engraved sign follow the charge */
        tintSphere(SA, qa); tintSphere(SB, qb);
        /* forces: magnitude ∝ |qa·qb| (4/d)², repulsive if qa·qb > 0 (Newton 3: equal and opposite) */
        var prod = qa * qb, F = Math.abs(prod) * (4 / dCur) * (4 / dCur);
        var L = Math.min(LMAX, L1 * F);
        var rep = prod > 0;
        var yA = YC + RS + 0.5;
        var lane = 0;
        if (!rep) lane = 0.36 * sstep(-0.4, 0.2, L - (dCur / 2 - 0.25));
        FA.set(XA, yA + lane, 0, rep ? -1 : 1, L);
        FB.set(XB, yA - lane, 0, rep ? 1 : -1, L);
        var colr = rep ? cCop : cInk;
        FA.mat.color.copy(colr); FB.mat.color.copy(colr);
        fPos.set(XA + dCur / 2, yA + 0.95 + lane, 0);
        var dShow = dRead();
        lForce.set((rep ? 'itme' : 'çekme') + ' kuvveti: ' + forceNum(dShow) + ' birim');
        showL(lForce, F > 0.05 && Math.abs(Math.abs(prod) - 1) < 0.05);
        chip.set(kindStr());
        chip.show(v.w / v.h < 1.8);
        lines.res(v);
        lines.mat.uniforms.uPhase.value = reduced ? 0 : (t * 0.5) % 1;
        if (!reduced) sway.apply(v, 0.06 * Math.sin(TAU * t / 26));
        v.render(dt);
        if (K.skipRender) return;
        /* dimension line in front of the ruler: from mark 0 (sphere A) to sphere B */
        var ctx = v.ctx;
        dimA.set(XA, 0.02, RZ + 0.75); dimB.set(XB, 0.02, RZ + 0.75);
        var pa = v.project(dimA), pb = v.project(dimB);
        dimA.z = RZ + 0.1; dimB.z = RZ + 0.1;
        var qa2 = v.project(dimA), qb2 = v.project(dimB);
        ctx.save();
        ctx.strokeStyle = K.rgba(P.ink, 0.75);
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(qa2.x, qa2.y + 2); ctx.lineTo(pa.x, pa.y + 6);
        ctx.moveTo(qb2.x, qb2.y + 2); ctx.lineTo(pb.x, pb.y + 6);
        ctx.stroke();
        var mx = (pa.x + pb.x) / 2, my = (pa.y + pb.y) / 2;
        K.arrow(ctx, mx, my, pa.x + 1, pa.y, { color: P.ink, width: 1.2, head: 7 });
        K.arrow(ctx, mx, my, pb.x - 1, pb.y, { color: P.ink, width: 1.2, head: 7 });
        var txt = 'd = ' + K.num(dShow, 1) + ' cm';
        ctx.font = K.font(13, 500, true);
        var tw = ctx.measureText(txt).width;
        ctx.fillStyle = 'rgba(245,245,241,0.94)';
        K.rr(ctx, mx - tw / 2 - 7, my - 10, tw + 14, 20, 5);
        ctx.fill();
        K.label(ctx, txt, mx, my + 0.5, { size: 13, weight: 500, mono: true, color: P.ink, align: 'center', baseline: 'middle' });
        ctx.restore();
      },
      dispose: function () { wood.dispose(); rtex.dispose(); texPlus.dispose(); texMinus.dispose(); v.dispose(); }
    };
  });
  /* ==================================================================
   * Shared: copper shells as Slater-type orbitals, Clementi–Raimondi
   * exponents ζ (1/a0). Radial density r^(2n)·e^(−2ζr) → r ~ Gamma(2n+1, 1/(2ζ)).
   * ================================================================== */
  var CU_SHELLS = [
    { n: 1, z: 28.339, e: 2, k: 0 },   /* 1s  (Z_eff 28,339) */
    { n: 2, z: 10.437, e: 2, k: 1 },   /* 2s  (20,874 ÷ 2) */
    { n: 2, z: 12.549, e: 6, k: 1 },   /* 2p  (25,097 ÷ 2) */
    { n: 3, z: 4.910, e: 2, k: 2 },    /* 3s  (14,731 ÷ 3) */
    { n: 3, z: 4.748, e: 6, k: 2 },    /* 3p  (14,243 ÷ 3) */
    { n: 3, z: 4.400, e: 10, k: 2 },   /* 3d  (13,201 ÷ 3) */
    { n: 4, z: 1.4605, e: 1, k: 3 }    /* 4s  (5,842 ÷ 4)  */
  ];
  function cuRadius(rng, sh) { return gammaK(rng, 2 * sh.n + 1, 1 / (2 * sh.z)); }

  /* Per-instance alpha for an InstancedMesh with a standard material */
  function instAlpha(mesh, count) {
    var THREE = window.THREE;
    var arr = new Float32Array(count).fill(1);
    var attr = new THREE.InstancedBufferAttribute(arr, 1);
    attr.setUsage(THREE.DynamicDrawUsage);
    mesh.geometry.setAttribute('aIA', attr);
    var mat = mesh.material;
    mat.transparent = true;
    mat.onBeforeCompile = function (sh) {
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute float aIA;\nvarying float vIA;')
        .replace('#include <begin_vertex>', '#include <begin_vertex>\nvIA = aIA;');
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying float vIA;')
        .replace('#include <color_fragment>', '#include <color_fragment>\ndiffuseColor.a *= vIA;');
    };
    mat.customProgramCacheKey = function () { return 'kg-inst-alpha'; };
    return { arr: arr, attr: attr, commit: function () { attr.needsUpdate = true; } };
  }

  /* Column (projected) density of a spherically symmetric density rho(r) on [0, rMax], as a sprite */
  function columnTexture(rho, rMax, N) {
    var nb = 220, prof = new Float64Array(nb + 1), mx = 0, ib, iz;
    for (ib = 0; ib <= nb; ib++) {
      var b = rMax * ib / nb, zMax = Math.sqrt(Math.max(0, rMax * rMax - b * b)), nz = 180, hz = zMax / nz, sum = 0;
      for (iz = 0; iz <= nz; iz++) { var z = iz * hz; sum += (iz === 0 || iz === nz ? 0.5 : 1) * rho(Math.sqrt(b * b + z * z)); }
      prof[ib] = sum * hz;
      if (prof[ib] > mx) mx = prof[ib];
    }
    return K.textTexture(N, N, function (ctx, w, h) {
      var img = ctx.createImageData(w, h), d = img.data;
      for (var y = 0; y < h; y++) {
        for (var x = 0; x < w; x++) {
          var dx = (x + 0.5) / w * 2 - 1, dy = (y + 0.5) / h * 2 - 1, rr = Math.sqrt(dx * dx + dy * dy);
          var f = 0;
          if (rr < 1) { var fi = rr * nb, i0 = Math.floor(fi), fr = fi - i0; f = (prof[i0] * (1 - fr) + prof[Math.min(nb, i0 + 1)] * fr) / mx; }
          var o = (y * w + x) * 4;
          d[o] = d[o + 1] = d[o + 2] = 255; d[o + 3] = Math.round(255 * f);
        }
      }
      ctx.putImageData(img, 0, 0);
    });
  }
  /* Camera-facing quads (instanced) with a texture alpha and per-instance alpha */
  var BB_VS = [
    'attribute float aIA;', 'varying vec2 vUv;', 'varying float vA;',
    'void main(){',
    '  vec4 c = modelViewMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);',
    '  float sc = length(instanceMatrix[0].xyz);',
    '  c.xy += position.xy * sc;',
    '  gl_Position = projectionMatrix * c;',
    '  vUv = uv; vA = aIA;',
    '}'
  ].join('\n');
  var BB_FS = [
    'uniform sampler2D uMap;', 'uniform vec3 uColor;', 'uniform float uOpacity;', 'uniform float uAddK;', 'varying vec2 vUv;', 'varying float vA;',
    'void main(){',
    '  float a = texture2D(uMap, vUv).a * vA * uOpacity;',
    '  if (a < 0.002) discard;',
    '#ifdef ADDITIVE',
    '  gl_FragColor = vec4(uColor * a, a * uAddK);',
    '#else',
    '  gl_FragColor = vec4(uColor * a, a);',
    '#endif',
    '}'
  ].join('\n');
  function billboards(count, tex, color, o) {
    var THREE = window.THREE;
    o = o || {};
    var geo = new THREE.PlaneGeometry(1, 1);
    var c = rgb01(color), defs = {};
    if (o.additive) defs.ADDITIVE = 1;
    var mat = new THREE.ShaderMaterial({
      uniforms: { uMap: { value: tex }, uColor: { value: new THREE.Vector3(c[0], c[1], c[2]) }, uOpacity: { value: o.opacity === undefined ? 1 : o.opacity }, uAddK: { value: Math.max(c[0], c[1], c[2]) } },
      vertexShader: BB_VS, fragmentShader: BB_FS, defines: defs, transparent: true, depthWrite: false, premultipliedAlpha: true,
      blending: o.additive ? THREE.AdditiveBlending : THREE.NormalBlending
    });
    var mesh = new THREE.InstancedMesh(geo, mat, count);
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    mesh.frustumCulled = false;
    var arr = new Float32Array(count).fill(1), attr = new THREE.InstancedBufferAttribute(arr, 1);
    attr.setUsage(THREE.DynamicDrawUsage);
    geo.setAttribute('aIA', attr);
    var m4 = new THREE.Matrix4();
    return {
      mesh: mesh, mat: mat, alpha: arr,
      setAt: function (i, x, y, z, size) { m4.makeScale(size, size, size); m4.setPosition(x, y, z); mesh.setMatrixAt(i, m4); },
      commit: function () { mesh.instanceMatrix.needsUpdate = true; attr.needsUpdate = true; }
    };
  }

  /* Copper "+" glyph as a screen-sized point with a light halo (ions) */
  var PLUS_VS = [
    'uniform float uPx;', 'attribute float aAlpha;', 'varying float vA;', 'varying float vPx;',
    'void main(){',
    '  vec4 mv = modelViewMatrix * vec4(position, 1.0);',
    '  gl_PointSize = uPx; vPx = uPx; vA = aAlpha;',
    '  gl_Position = projectionMatrix * mv;',
    '}'
  ].join('\n');
  var PLUS_FS = [
    'uniform vec3 uColor;', 'uniform vec3 uHalo;', 'varying float vA;', 'varying float vPx;',
    'float box(vec2 p, vec2 b){ vec2 d = abs(p) - b; return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0); }',
    'void main(){',
    '  vec2 c = gl_PointCoord * 2.0 - 1.0;',
    '  float px = 2.0 / vPx;',
    '  float d = min(box(c, vec2(0.56, 0.13)), box(c, vec2(0.13, 0.56)));',
    '  float fill = clamp(0.5 - d / px, 0.0, 1.0);',
    '  float halo = clamp(0.5 - (d - 2.0 * px) / px, 0.0, 1.0) * 0.9;',
    '  float a = max(fill, halo) * vA;',
    '  if (a < 0.003) discard;',
    '  vec3 col = mix(uHalo, uColor, fill);',
    '  gl_FragColor = vec4(col * a, a);',
    '}'
  ].join('\n');
  function plusPoints(n, color, halo) {
    var THREE = window.THREE;
    var g = new THREE.BufferGeometry();
    var pos = new THREE.BufferAttribute(new Float32Array(n * 3), 3), al = new THREE.BufferAttribute(new Float32Array(n), 1);
    pos.setUsage(THREE.DynamicDrawUsage); al.setUsage(THREE.DynamicDrawUsage);
    g.setAttribute('position', pos); g.setAttribute('aAlpha', al);
    var m = new THREE.ShaderMaterial({
      uniforms: { uPx: { value: 16 }, uColor: { value: v3hex(color) }, uHalo: { value: v3hex(halo) } },
      vertexShader: PLUS_VS, fragmentShader: PLUS_FS, transparent: true, depthWrite: false, premultipliedAlpha: true
    });
    var pts = new THREE.Points(g, m);
    pts.frustumCulled = false;
    pts.renderOrder = 6;
    return { pts: pts, pos: pos.array, al: al.array, mat: m, commit: function () { pos.needsUpdate = true; al.needsUpdate = true; } };
  }

  /* ==================================================================
   * valence-detach · 680×520 · how the outer electrons leave their atoms
   * A 3×3×3 block of copper atoms (simple cubic for clarity, labelled as a
   * simplified model). Each atom: nucleus, 28 inner electrons (K, L, M
   * shells sampled from the Slater orbitals above), one 4s electron on a
   * loose precessing orbit inside its faint 4s cloud. When the atoms come
   * close, the 4s clouds overlap: in the overlap region an electron is
   * pulled by two ions alike, so it can carry on to the neighbour. Each
   * electron then wanders from ion to ion (paths through the bond
   * midpoints). On separation, each ion takes back exactly one electron.
   * ================================================================== */
  var VD_VS = [
    PT_HEAD,
    'uniform vec3 uAtom[27];', 'uniform float uAtomA[27];', 'attribute float aAtom;',
    'void main(){',
    '  int ai = int(aAtom + 0.5);',
    '  vec3 p = position + uAtom[ai];',
    '  float a = aAlpha * uAtomA[ai];',
    PT_TAIL,
    '}'
  ].join('\n');

  K.register('valence-detach', function (el, opts) {
    var THREE = window.THREE;
    opts = opts || {};
    var theme = opts.theme || 'light', dark = theme === 'dark';
    var v = K.stage3d(el, { theme: theme, fov: 28, distance: 4.5, yaw: 0.6, pitch: 0.42, size: 3, shadows: false, minDistance: 2.4, maxDistance: 24, minPitch: -1.0, maxPitch: 1.3 });
    v.lights.key.intensity = 1.5;
    var reduced = K.reducedMotion;
    var NA = 27, CEN = 13, DFAR = 2.6, A0 = 0.2070; /* a0 in units of the Cu–Cu distance: 0,0529 nm ÷ 0,2556 nm */
    var grid = [], i, j, k, a, q, ix, r, e;
    for (i = -1; i <= 1; i++) for (j = -1; j <= 1; j++) for (k = -1; k <= 1; k++) grid.push([i, j, k]);
    var atomPos = [];
    for (a = 0; a < NA; a++) atomPos.push(new THREE.Vector3());
    var Dnow = DFAR;
    function Dof(s) { return 1 + (DFAR - 1) * Math.pow(1 - clamp(s, 0, 1), 1.6); }
    function layout(s) { Dnow = Dof(s); for (var n = 0; n < NA; n++) atomPos[n].set(grid[n][0] * Dnow, grid[n][1] * Dnow, grid[n][2] * Dnow); }
    layout(0);
    var NB = [];
    for (a = 0; a < NA; a++) {
      NB.push([]);
      for (var ax = 0; ax < 3; ax++) {
        for (var sg = -1; sg <= 1; sg += 2) {
          var gg = grid[a].slice();
          gg[ax] += sg;
          if (gg[ax] < -1 || gg[ax] > 1) continue;
          NB[a].push((gg[0] + 1) * 9 + (gg[1] + 1) * 3 + (gg[2] + 1));
        }
      }
    }

    /* nuclei */
    var nucMesh = K.instanced(NA, { radius: 0.042, detail: 2, material: K.mat.proton({ emissive: 0x6A2C10, emissiveIntensity: 0.25 }) });
    var nucA = instAlpha(nucMesh, NA);
    v.scene.add(nucMesh);

    /* inner electrons (28 per atom) and the faint 4s cloud, in atom-local coordinates */
    var uAtom = [], uInA = [], uHaA = [];
    for (a = 0; a < NA; a++) { uAtom.push(new THREE.Vector3()); uInA.push(1); uHaA.push(1); }
    var rng = K.rng(2929), d3 = [0, 0, 0];
    var PER = 130, NIN = NA * PER;
    var gIn = pointsGeometry(NIN, false), inP = gIn.attributes.position.array, inS = gIn.attributes.aSize.array;
    var inAtom = new Float32Array(NIN);
    var cum = [], tot = 0;
    for (i = 0; i < 6; i++) { tot += CU_SHELLS[i].e; cum.push(tot); }
    for (a = 0; a < NA; a++) {
      for (q = 0; q < PER; q++) {
        ix = a * PER + q;
        var u = rng() * tot, sh = 0;
        while (u > cum[sh]) sh++;
        r = cuRadius(rng, CU_SHELLS[sh]) * A0;
        uniDir(rng, d3);
        inP[ix * 3] = r * d3[0]; inP[ix * 3 + 1] = r * d3[1]; inP[ix * 3 + 2] = r * d3[2];
        inS[ix] = (CU_SHELLS[sh].k < 2 ? 0.55 : 1) * (0.75 + 0.5 * rng());
        inAtom[ix] = a;
      }
    }
    gIn.setAttribute('aAtom', new THREE.BufferAttribute(inAtom, 1));
    var inMat = pointsMaterial({
      vs: VD_VS, color: dark ? '#AFC0F6' : '#304EBC', size: 0.042, minPx: 1.2, maxPx: 12, soft: 2.0, additive: dark, farAlpha: 0.5,
      opacity: dark ? 0.26 : 0.18, uniforms: { uAtom: { value: uAtom }, uAtomA: { value: uInA } }
    });
    var inPts = new THREE.Points(gIn, inMat);
    inPts.frustumCulled = false;
    v.scene.add(inPts);

    /* the 4s cloud: exact projected density of the 4s Slater orbital, one billboard per atom */
    var Z4 = CU_SHELLS[6].z, HR = 5.8;
    var haloTex = columnTexture(function (rr) { return Math.pow(rr, 6) * Math.exp(-2 * Z4 * rr); }, HR, 256);
    var halos = billboards(NA, haloTex, dark ? '#8EA6F2' : '#3F5CC8', { additive: dark, opacity: dark ? 0.32 : 0.2 });
    v.scene.add(halos.mesh);
    var HSIZE = 2 * HR * A0;

    /* outer electrons, their trails and loose orbits */
    var eMesh = K.instanced(NA, { radius: 0.058, detail: 3, dark: dark });
    var eA = instAlpha(eMesh, NA);
    v.scene.add(eMesh);
    var TR = 10;
    var trails = LineBatch(NA * (TR + 2), { color: dark ? P.blueLight : P.blue, width: 1.6 });
    var orbits = LineBatch(NA * 70, { color: dark ? P.blueLight : P.blue, width: 1.1, dash: 9, dashOn: 0.5 });
    v.scene.add(orbits.mesh);
    v.scene.add(trails.mesh);
    var trBuf = new Float32Array((TR + 2) * 3), trAl = new Float32Array(TR + 2), obBuf = new Float32Array(66 * 3);

    /* ions: copper "+" */
    var plus = plusPoints(NA, P.copper, dark ? P.night : '#FFFFFF');
    v.scene.add(plus.pts);

    /* ---------------- electron motion model ---------------- */
    var EL = [], taken = new Array(NA);
    var NICE = basisFor(norm3([0.15, 0.62, 0.77]));
    function newElectrons() {
      var er = K.rng(777);
      EL = [];
      for (var n = 0; n < NA; n++) {
        var n0 = uniDir(er, [0, 0, 0]), b = basisFor(n0);
        var el2 = {
          id: n, om: 1.1 + 0.35 * er(), Om: 0.12 + 0.1 * er(), pa: uniDir(er, [0, 0, 0]), r0: 0.58 + 0.08 * er(), ph1: TAU * er(),
          rng: K.rng(1000 + n * 17), free: false, prev: null, t0: -1e9, bl: 1, sOn: 0.7, sOff: 0.6
        };
        el2.cur = { kind: 0, host: n, u0: b.u, w0: b.w, tref: 0, phase: TAU * er(), sign: er() < 0.5 ? 1 : -1, Om: el2.Om };
        if (n === CEN) { el2.cur.u0 = NICE.u.slice(); el2.cur.w0 = NICE.w.slice(); el2.cur.Om = 0.05; el2.cur.phase = 0.4; el2.cur.sign = 1; }
        EL.push(el2);
        taken[n] = n;
      }
      var order = [];
      for (n = 0; n < NA; n++) if (n !== CEN) order.push(n);
      for (n = order.length - 1; n > 0; n--) { var jj = Math.floor(er() * (n + 1)); var tmp = order[n]; order[n] = order[jj]; order[jj] = tmp; }
      order.unshift(CEN);
      for (n = 0; n < NA; n++) { EL[order[n]].sOn = 0.58 + 0.28 * n / (NA - 1); EL[order[n]].sOff = EL[order[n]].sOn - 0.12; }
    }

    var Ut = [0, 0, 0], Wt = [0, 0, 0];
    function rotInto(vv, kk, c, s, out) {
      var kx = kk[0], ky = kk[1], kz = kk[2], x = vv[0], y = vv[1], z = vv[2], dt3 = kx * x + ky * y + kz * z;
      out[0] = x * c + (ky * z - kz * y) * s + kx * dt3 * (1 - c);
      out[1] = y * c + (kz * x - kx * z) * s + ky * dt3 * (1 - c);
      out[2] = z * c + (kx * y - ky * x) * s + kz * dt3 * (1 - c);
    }
    function orbitBasis(el2, o, t) {
      var ang = o.Om * (t - o.tref), c = Math.cos(ang), s = Math.sin(ang);
      rotInto(o.u0, el2.pa, c, s, Ut); rotInto(o.w0, el2.pa, c, s, Wt);
    }
    function orbitR(el2, t) { return el2.r0 * (1 + 0.09 * Math.sin(0.8 * t + el2.ph1)); }
    function orbitPos(el2, o, t, out) {
      orbitBasis(el2, o, t);
      var R = orbitR(el2, t), th = o.phase + o.sign * el2.om * (t - o.tref);
      var ct = Math.cos(th) * R, st = Math.sin(th) * R, Pp = atomPos[o.host];
      out[0] = Pp.x + ct * Ut[0] + st * Wt[0];
      out[1] = Pp.y + ct * Ut[1] + st * Wt[1];
      out[2] = Pp.z + ct * Ut[2] + st * Wt[2];
    }
    var VFREE = 1.25;
    function wpX(ch, n, c) { return atomPos[ch.wh[n]].getComponent(c) + ch.wo[n * 3 + c] * Dnow; }
    function pushWp(ch, h, ox, oy, oz) {
      ch.wh.push(h); ch.wo.push(ox, oy, oz);
      var n = ch.wh.length;
      if (n === 1) { ch.T.push(ch.tStart); return; }
      var g0 = grid[ch.wh[n - 2]], g1 = grid[h];
      var dx = (g1[0] + ox) - (g0[0] + ch.wo[(n - 2) * 3]), dy = (g1[1] + oy) - (g0[1] + ch.wo[(n - 2) * 3 + 1]), dz = (g1[2] + oz) - (g0[2] + ch.wo[(n - 2) * 3 + 2]);
      ch.T.push(ch.T[n - 2] + Math.max(0.18, Math.sqrt(dx * dx + dy * dy + dz * dz) / VFREE));
    }
    function extendChain(el2, ch, hops) {
      var R = el2.rng;
      for (var n = 0; n < hops; n++) {
        var h = ch.last, list = NB[h], nx = list[Math.floor(R() * list.length)];
        if (nx === ch.prevHost && list.length > 1 && R() < 0.8) nx = list[(list.indexOf(nx) + 1 + Math.floor(R() * (list.length - 1))) % list.length];
        var gx = grid[nx][0] - grid[h][0], gy = grid[nx][1] - grid[h][1], gz = grid[nx][2] - grid[h][2];
        var pb = basisFor([gx, gy, gz]);
        var a1 = R() * TAU, m1 = 0.06 + 0.1 * R();
        var c1 = Math.cos(a1) * m1, s1 = Math.sin(a1) * m1;
        pushWp(ch, h, gx * 0.5 + pb.u[0] * c1 + pb.w[0] * s1, gy * 0.5 + pb.u[1] * c1 + pb.w[1] * s1, gz * 0.5 + pb.u[2] * c1 + pb.w[2] * s1);
        var a2 = a1 + Math.PI * (0.55 + 0.9 * R()), m2 = 0.4 + 0.14 * R();
        var c2 = Math.cos(a2) * m2, s2 = Math.sin(a2) * m2;
        pushWp(ch, nx, pb.u[0] * c2 + pb.w[0] * s2 + gx * 0.1, pb.u[1] * c2 + pb.w[1] * s2 + gy * 0.1, pb.u[2] * c2 + pb.w[2] * s2 + gz * 0.1);
        ch.prevHost = h; ch.last = nx;
      }
    }
    function newChain(el2, host, t, p) {
      var ch = { kind: 1, wh: [], wo: [], T: [], tStart: t, last: host, prevHost: -1, seg: 0 };
      var Pp = atomPos[host];
      pushWp(ch, host, (p[0] - Pp.x) / Dnow, (p[1] - Pp.y) / Dnow, (p[2] - Pp.z) / Dnow);
      extendChain(el2, ch, 10);
      return ch;
    }
    function chainSeg(ch, t) {
      var T = ch.T, n = T.length, s = Math.min(ch.seg, n - 2);
      if (t < T[0]) return 0;
      while (s > 0 && T[s] > t) s--;
      while (s < n - 2 && T[s + 1] <= t) s++;
      return s;
    }
    var C0 = [0, 0, 0], C1 = [0, 0, 0], C2 = [0, 0, 0], C3 = [0, 0, 0];
    function chainPos(el2, ch, t, out, live) {
      if (live && t > ch.T[ch.T.length - 3]) extendChain(el2, ch, 6);
      var s = chainSeg(ch, t);
      if (live) ch.seg = s;
      var n = ch.T.length;
      var uu = clamp((t - ch.T[s]) / Math.max(1e-6, ch.T[s + 1] - ch.T[s]), 0, 1);
      var i0 = Math.max(0, s - 1), i3 = Math.min(n - 1, s + 2);
      for (var c = 0; c < 3; c++) { C0[c] = wpX(ch, i0, c); C1[c] = wpX(ch, s, c); C2[c] = wpX(ch, s + 1, c); C3[c] = wpX(ch, i3, c); }
      var u2 = uu * uu, u3 = u2 * uu;
      for (c = 0; c < 3; c++) {
        out[c] = 0.5 * (2 * C1[c] + (-C0[c] + C2[c]) * uu + (2 * C0[c] - 5 * C1[c] + 4 * C2[c] - C3[c]) * u2 + (-C0[c] + 3 * C1[c] - 3 * C2[c] + C3[c]) * u3);
      }
    }
    /* the ion an electron is currently circling (odd waypoints sit around an ion) */
    function chainHost(ch, t) {
      var s = chainSeg(ch, t);
      var w = (s % 2 === 1) ? s : Math.min(s + 1, ch.wh.length - 1);
      return ch.wh[w];
    }
    function modePos(el2, m, t, out, live) { if (m.kind === 0) orbitPos(el2, m, t, out); else chainPos(el2, m, t, out, live); }
    var TA = [0, 0, 0], TB = [0, 0, 0];
    function ePos(el2, t, out, live) {
      modePos(el2, el2.cur, t, out, live);
      if (el2.prev && t < el2.t0 + el2.bl) {
        var w = sstep(0, el2.bl, t - el2.t0);
        modePos(el2, el2.prev, t, TB, false);
        out[0] = TB[0] + (out[0] - TB[0]) * w; out[1] = TB[1] + (out[1] - TB[1]) * w; out[2] = TB[2] + (out[2] - TB[2]) * w;
      }
      return out;
    }
    function detach(el2, t) {
      var p = ePos(el2, t, [0, 0, 0], false);
      taken[el2.cur.host] = -1;
      el2.prev = el2.cur; el2.cur = newChain(el2, el2.cur.host, t, p); el2.t0 = t; el2.bl = 0.9; el2.free = true;
    }
    function recapture(el2, t) {
      var p = ePos(el2, t, [0, 0, 0], false), p0 = ePos(el2, t - 0.03, [0, 0, 0], false);
      var pref = chainHost(el2.cur, t), best = -1, bd = 1e9;
      if (pref >= 0 && taken[pref] < 0) best = pref;
      else {
        for (var n = 0; n < NA; n++) {
          if (taken[n] >= 0) continue;
          var dx = atomPos[n].x - p[0], dy = atomPos[n].y - p[1], dz = atomPos[n].z - p[2], dd = dx * dx + dy * dy + dz * dz;
          if (dd < bd) { bd = dd; best = n; }
        }
      }
      if (best < 0) return;
      taken[best] = el2.id;
      var Pp = atomPos[best];
      var uu = norm3([p[0] - Pp.x, p[1] - Pp.y, p[2] - Pp.z]);
      var vel = [p[0] - p0[0], p[1] - p0[1], p[2] - p0[2]];
      var dv = vel[0] * uu[0] + vel[1] * uu[1] + vel[2] * uu[2];
      var ww = [vel[0] - dv * uu[0], vel[1] - dv * uu[1], vel[2] - dv * uu[2]];
      if (Math.sqrt(ww[0] * ww[0] + ww[1] * ww[1] + ww[2] * ww[2]) < 1e-6) ww = basisFor(uu).u; else norm3(ww);
      el2.prev = el2.cur;
      el2.cur = { kind: 0, host: best, u0: uu, w0: ww, tref: t, phase: 0, sign: 1, Om: best === CEN ? 0.05 : el2.Om };
      el2.t0 = t; el2.bl = 1.1; el2.free = false;
    }
    /* give the centre atom an open, readable orbit again (smooth glide), used when the atoms are apart */
    function niceCentre(t) {
      for (var n = 0; n < NA; n++) {
        var el2 = EL[n];
        if (el2.free || el2.cur.host !== CEN) continue;
        var p = ePos(el2, t, [0, 0, 0], false), Pp = atomPos[CEN];
        var dx = p[0] - Pp.x, dy = p[1] - Pp.y, dz = p[2] - Pp.z;
        var ph = Math.atan2(dx * NICE.w[0] + dy * NICE.w[1] + dz * NICE.w[2], dx * NICE.u[0] + dy * NICE.u[1] + dz * NICE.u[2]);
        el2.prev = el2.cur;
        el2.cur = { kind: 0, host: CEN, u0: NICE.u.slice(), w0: NICE.w.slice(), tref: t, phase: ph, sign: 1, Om: 0.05 };
        el2.t0 = t; el2.bl = 1.3;
      }
    }

    /* ---------------- labels ---------------- */
    var offIn = new THREE.Vector3(-0.1, -0.12, 0.1), lInP = new THREE.Vector3(), lOutP = new THREE.Vector3(), lIonP = new THREE.Vector3();
    var lIn = v.label('iç elektronlar (28)', { at: function () { return lInP.copy(atomPos[CEN]).add(offIn); }, cls: 'note', dx: -112, dy: 92, line: true, align: 'right' });
    lIn.el.style.fontSize = '17px'; lIn.el.style.color = dark ? '#C9CFDA' : '#3E434D';
    var lOut = v.label('dış elektron (1): çekirdeğe zayıf bağlı', { at: lOutP, cls: 'name', dx: 0, dy: 0, line: true, align: 'left', valign: 'bottom' });
    var lShield = fixedLabel(v, '28 iç elektron, 29 protonun çekiminin çoğunu perdeler', 'note', { x: 318, y: 64 });
    var OUTX = 300, OUTY = 58;
    lOut.el.style.fontSize = '18px'; lShield.el.style.fontSize = '16px'; lShield.el.style.color = dark ? '#C9CFDA' : '#15171C';
    var ION = 2 * 9 + 2 * 3 + 0;
    var lIon = v.label('bakır iyonu: Cu<sup>+</sup>', { at: lIonP, cls: 'name', html: true, dx: 40, dy: -50, line: true, align: 'left' });
    var chip = fixedLabel(v, 'Ayrık atom: dış elektron kendi atomunda', 'chip', { x: 18, y: 16 });
    var tag = fixedLabel(v, 'basitleştirilmiş model · yavaşlatılmış', 'tag', { x: 18, y: 502, valign: 'bottom' });
    tag.el.style.letterSpacing = '0.06em';

    var auto = true, sNow = 0, sSet = 0, lastDist = 0, sPrev = 0;
    var stateTxt = 'Ayrık atom: dış elektron kendi atomunda';
    var atomA = new Float32Array(NA), ionA = new Float32Array(NA);
    var sway = makeSway();
    var camP = new THREE.Vector3(), towardCam = new THREE.Vector3(), tmpA3 = new THREE.Vector3();
    var EP = [0, 0, 0];
    function autoS(t) {
      var x = t % 15.5;
      if (x < 2.5) return 0;
      if (x < 7.5) return eio((x - 2.5) / 5);
      if (x < 12.5) return 1;
      return 1 - eio((x - 12.5) / 3);
    }
    function distOf(s) { return 4.5 + 6.6 * sstep(0, 0.36, s) - 2.4 * sstep(0.36, 1, s); }
    function freeCount() { var n = 0; for (var m = 0; m < NA; m++) if (EL[m].free) n++; return n; }

    function resetAll() {
      auto = true; sNow = 0; sSet = 0; sPrev = 0; stateTxt = 'Ayrık atom: dış elektron kendi atomunda';
      newElectrons();
      for (var n = 0; n < NA; n++) { ionA[n] = 0; atomA[n] = n === CEN ? 1 : 0; }
      homeView(v); sway.reset(); lastDist = v.view.distance;
      layout(0);
    }
    resetAll();

    return {
      reset: resetAll,
      set: function (key, val) {
        if (key !== 'spacing') return;
        auto = false;
        sSet = clamp(+val || 0, 0, 1);
      },
      read: function (key) {
        var nf = freeCount();
        if (key === 'spacing') return K.num(sNow, 2);
        if (key === 'state') return stateTxt;
        if (key === 'count') {
          if (nf === NA) return 'Kristal: 3 × 3 × 3 = 27 atom, her biri 1 elektron bırakır: 27 × 1 = 27 serbest elektron';
          if (nf === 0) return 'Serbest elektron yok: kristalin 27 atomu (3 × 3 × 3) elektronlarını kendi üzerinde tutuyor';
          return 'Serbest elektron: ' + nf + ' / 27 atom';
        }
        return '';
      },
      frame: function (t, dt) {
        var tm = reduced ? t * 0.35 : t;
        var s;
        if (auto) { s = autoS(t); sNow = s; } else { sNow = moveTo(sNow, sSet, dt * 0.45); s = sNow; }
        if (s <= 0.0001 && sPrev > 0.0001) niceCentre(tm);
        sPrev = s;
        layout(s);
        /* camera follows the spacing (as a delta, so teacher drags and zoom are kept) */
        var dd = distOf(s) * (v.w / v.h > 1.8 ? 1.14 : 1);
        v.view.distance += dd - lastDist; lastDist = dd;
        if (!reduced) sway.apply(v, 0.16 * Math.sin(TAU * t / 31));
        /* state changes */
        for (q = 0; q < NA; q++) {
          e = EL[q];
          if (!e.free && s >= e.sOn) detach(e, tm);
          else if (e.free && s <= e.sOff) recapture(e, tm);
        }
        /* per-atom visibility, ions */
        camP.copy(v.camera.position);
        var vis = sstep(0.02, 0.26, s), dCen = camP.distanceTo(atomPos[CEN]);
        for (q = 0; q < NA; q++) {
          var near = sstep(0.9, 2.0, camP.distanceTo(atomPos[q]));
          atomA[q] = (q === CEN ? 1 : vis) * near;
          uAtom[q].copy(atomPos[q]);
          uInA[q] = atomA[q];
          halos.setAt(q, atomPos[q].x, atomPos[q].y, atomPos[q].z, HSIZE);
          var farK = 1 - 0.5 * sstep(-Dnow * 1.2, Dnow * 1.5, camP.distanceTo(atomPos[q]) - dCen);
          halos.alpha[q] = atomA[q] * farK * (1 - 0.5 * sstep(0.7, 1, s));
          nucMesh.setAt(q, atomPos[q].x, atomPos[q].y, atomPos[q].z, 1);
          nucA.arr[q] = atomA[q];
          var ionT = 1;
          if (taken[q] >= 0) { var eb = EL[taken[q]]; ionT = (eb.prev && eb.prev.kind === 1) ? 1 - sstep(0, eb.bl, tm - eb.t0) : 0; }
          ionA[q] = approach(ionA[q], ionT, dt, 0.15);
          towardCam.copy(camP).sub(atomPos[q]).normalize().multiplyScalar(0.11);
          plus.pos[q * 3] = atomPos[q].x + towardCam.x; plus.pos[q * 3 + 1] = atomPos[q].y + towardCam.y; plus.pos[q * 3 + 2] = atomPos[q].z + towardCam.z;
          plus.al[q] = ionA[q] * atomA[q] * (0.55 + 0.45 * farK);
        }
        nucMesh.commit(); nucA.commit(); plus.commit(); halos.commit();
        plus.mat.uniforms.uPx.value = 15 * v.sf.k;
        /* electrons, trails, loose orbits */
        trails.begin(); orbits.begin();
        for (q = 0; q < NA; q++) {
          e = EL[q];
          ePos(e, tm, EP, true);
          var host = e.free ? -1 : e.cur.host;
          var ea = e.free ? 1 : atomA[host];
          if (e.prev && e.prev.kind === 0 && tm < e.t0 + e.bl) ea = Math.max(ea, atomA[e.prev.host]);
          eMesh.setAt(q, EP[0], EP[1], EP[2], 1);
          eA.arr[q] = ea;
          if (ea < 0.02) continue;
          for (var p = 0; p <= TR; p++) {
            ePos(e, tm - p * 0.03, TA, false);
            trBuf[p * 3] = TA[0]; trBuf[p * 3 + 1] = TA[1]; trBuf[p * 3 + 2] = TA[2];
            var f = 1 - p / TR;
            trAl[p] = f * f * 0.5 * ea;
          }
          trails.add(trBuf, TR + 1, trAl, false, 0);
          if (!e.free) {
            var bw = sstep(0, e.bl, tm - e.t0);
            var oa = 0.32 * atomA[host] * bw * (1 - sstep(0.75, 1, s));
            if (oa > 0.01) {
              orbitBasis(e, e.cur, tm);
              var R = orbitR(e, tm), Pp = atomPos[host];
              circlePts(obBuf, 0, 64, Pp.x, Pp.y, Pp.z, R, Ut, Wt);
              orbits.add(obBuf, 64, oa, true, 0);
            }
          }
        }
        eMesh.commit(); eA.commit();
        trails.end(); orbits.end();
        trails.res(v); orbits.res(v);
        var psc = pxScale(v), cd = v.view.distance;
        inMat.uniforms.uScale.value = psc;
        inMat.uniforms.uDepth.value.set(cd - 2, cd + 2.5);
        /* labels */
        var ce = null;
        for (q = 0; q < NA; q++) if (!EL[q].free && EL[q].cur.host === CEN) ce = EL[q];
        if (ce) {
          /* anchor: the point of the centre orbit nearest to the fixed label position */
          orbitBasis(ce, ce.cur, tm);
          var Rr = orbitR(ce, tm), bestD = 1e9, Pc = atomPos[CEN];
          for (var ai = 0; ai < 24; ai++) {
            var an = TAU * ai / 24, ca2 = Math.cos(an) * Rr, sa2 = Math.sin(an) * Rr;
            tmpA3.set(Pc.x + ca2 * Ut[0] + sa2 * Wt[0], Pc.y + ca2 * Ut[1] + sa2 * Wt[1], Pc.z + ca2 * Ut[2] + sa2 * Wt[2]);
            var pr = v.project(tmpA3), dd2 = (pr.x - OUTX - 20) * (pr.x - OUTX - 20) + (pr.y - OUTY) * (pr.y - OUTY);
            if (dd2 < bestD) { bestD = dd2; lOutP.copy(tmpA3); lOut.dx = OUTX - pr.x; lOut.dy = OUTY - 4 - pr.y; }
          }
        }
        var iso = s < 0.06;
        showL(lIn, iso); showL(lOut, iso && ce); showL(lShield, iso && ce);
        lIonP.copy(atomPos[ION]);
        var nf = freeCount();
        showL(lIon, s > 0.95 && nf === NA);
        var rising = auto ? autoS(t + 0.05) >= s : sSet >= s;
        var st;
        if (s < 0.04) st = 'Ayrık atom: dış elektron kendi atomunda';
        else if (nf === NA && s > 0.97) st = 'Kristal: dış elektronlar serbestçe dolaşıyor';
        else if (!rising) st = 'Atomlar ayrılıyor: her iyon bir elektron geri alır';
        else if (nf > 0) st = 'Dış bulutlar örtüştü: elektronlar komşu atomlara geçiyor';
        else st = 'Atomlar yaklaşıyor: dış orbitler üst üste biniyor';
        chip.set(st); stateTxt = st;
        v.render(dt);
        if (K.skipRender) return;
        /* small counter */
        var ctx = v.ctx, W = v.w, H = v.h;
        var txt = s < 0.04 ? 'serbest elektron: 0 / 1' : 'serbest elektron: ' + nf + ' / 27';
        ctx.save();
        ctx.font = K.font(13, 500, true);
        var tw = ctx.measureText(txt).width;
        ctx.fillStyle = dark ? 'rgba(14,18,26,0.85)' : 'rgba(255,255,255,0.9)';
        ctx.strokeStyle = dark ? '#262D3B' : '#E3E3DD';
        ctx.lineWidth = 1;
        K.rr(ctx, W - tw - 34, H - 40, tw + 16, 24, 6);
        ctx.fill(); ctx.stroke();
        K.label(ctx, txt, W - 26, H - 27.5, { size: 13, weight: 500, mono: true, color: dark ? P.onNight : P.ink, align: 'right', baseline: 'middle' });
        ctx.restore();
      },
      dispose: function () { haloTex.dispose(); v.dispose(); }
    };
  });

  /* ==================================================================
   * zoom-to-atom · 680×520 · dark frame · powers-of-ten dive into copper
   * One camera at a fixed distance. Every scale layer is modelled in its
   * own unit (mm, µm, nm, pm, fm) and scaled by 10^(unit − z), where
   * z = log10(metres per world unit). The layers share one orientation:
   * the cut face of a copper strand, so the dive is continuous:
   * cable → strand end → etched grains on that face → surface atoms →
   * FCC lattice with its electron sea → one Cu atom → its nucleus.
   * ================================================================== */

  /* Tubes along (nearly) +z with end caps, merged into two geometries */
  function tubeBundle(list) {
    var THREE = window.THREE;
    var sp = [], sn = [], su = [], si = [], cp = [], cn = [], cu = [], ci = [];
    var P0 = [0, 0], P1 = [0, 0];
    for (var q = 0; q < list.length; q++) {
      var s = list[q], base = sp.length / 3, a, b;
      for (a = 0; a <= s.seg; a++) {
        var z = s.z0 + (s.z1 - s.z0) * a / s.seg;
        s.path(z, P0); s.path(z + 0.01, P1);
        var T = norm3([P1[0] - P0[0], P1[1] - P0[1], 0.01]);
        var N = norm3(cross3(T, [1, 0, 0])), B = cross3(T, N);
        for (b = 0; b <= s.rad; b++) {
          var th = TAU * b / s.rad, c = Math.cos(th), sn2 = Math.sin(th);
          var nx = N[0] * c + B[0] * sn2, ny = N[1] * c + B[1] * sn2, nz = N[2] * c + B[2] * sn2;
          sp.push(P0[0] + s.r * nx, P0[1] + s.r * ny, z + s.r * nz);
          sn.push(nx, ny, nz);
          su.push(b / s.rad, a / s.seg);
        }
      }
      for (a = 0; a < s.seg; a++) {
        for (b = 0; b < s.rad; b++) {
          var i0 = base + a * (s.rad + 1) + b, i1 = i0 + 1, i2 = i0 + s.rad + 1, i3 = i2 + 1;
          si.push(i0, i1, i2, i1, i3, i2);
        }
      }
      if (s.cap !== false) {
        s.path(s.z1, P0); s.path(s.z1 - 0.01, P1);
        var Te = norm3([P0[0] - P1[0], P0[1] - P1[1], 0.01]);
        var Ne = norm3(cross3(Te, [1, 0, 0])), Be = cross3(Te, Ne);
        var cb = cp.length / 3;
        cp.push(P0[0], P0[1], s.z1); cn.push(Te[0], Te[1], Te[2]); cu.push(0.5, 0.5);
        for (b = 0; b <= s.rad; b++) {
          var th2 = TAU * b / s.rad, c2 = Math.cos(th2), s2 = Math.sin(th2);
          cp.push(P0[0] + s.r * (Ne[0] * c2 + Be[0] * s2), P0[1] + s.r * (Ne[1] * c2 + Be[1] * s2), s.z1 + s.r * (Ne[2] * c2 + Be[2] * s2));
          cn.push(Te[0], Te[1], Te[2]);
          cu.push(0.5 + 0.5 * c2, 0.5 + 0.5 * s2);
        }
        for (b = 0; b < s.rad; b++) ci.push(cb, cb + 1 + b, cb + 2 + b);
      }
    }
    function mk(p, n, u, idx) {
      var g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3));
      g.setAttribute('normal', new THREE.Float32BufferAttribute(n, 3));
      g.setAttribute('uv', new THREE.Float32BufferAttribute(u, 2));
      g.setIndex(idx);
      return g;
    }
    return { sides: mk(sp, sn, su, si), caps: mk(cp, cn, cu, ci) };
  }

  /* Etched copper section: Voronoi grains with annealing twins (canvas polygons) */
  function grainTexture(seed, G, N) {
    var THREE = window.THREE;
    var rng = K.rng(seed), seeds = [], gx, gy, i, j, k;
    for (gy = 0; gy < G; gy++) for (gx = 0; gx < G; gx++) seeds.push([(gx + 0.1 + 0.8 * rng()) / G, (gy + 0.1 + 0.8 * rng()) / G]);
    function clip(poly, nx, ny, c) {
      var out = [];
      for (var q = 0; q < poly.length; q++) {
        var A = poly[q], Bp = poly[(q + 1) % poly.length];
        var da = nx * A[0] + ny * A[1] - c, db = nx * Bp[0] + ny * Bp[1] - c;
        if (da <= 0) out.push(A);
        if ((da <= 0) !== (db <= 0)) { var t = da / (da - db); out.push([A[0] + (Bp[0] - A[0]) * t, A[1] + (Bp[1] - A[1]) * t]); }
      }
      return out;
    }
    var cells = [];
    for (i = 0; i < seeds.length; i++) {
      var poly = [[0, 0], [1, 0], [1, 1], [0, 1]], si2 = seeds[i];
      for (j = 0; j < seeds.length; j++) {
        if (j === i) continue;
        var sj = seeds[j], dx = sj[0] - si2[0], dy = sj[1] - si2[1];
        if (dx * dx + dy * dy > 9 / (G * G)) continue;
        poly = clip(poly, dx, dy, (sj[0] * sj[0] + sj[1] * sj[1] - si2[0] * si2[0] - si2[1] * si2[1]) / 2);
        if (poly.length < 3) break;
      }
      cells.push(poly);
    }
    /* per grain: orientation contrast (tone), roughness, annealing twins */
    var info = [];
    for (k = 0; k < cells.length; k++) {
      var tw = rng() < 0.45, bands = [];
      if (tw) {
        var nb = 1 + Math.floor(rng() * 3), pos0 = (rng() - 0.5) * 0.7;
        for (var b = 0; b < nb; b++) { bands.push([pos0 + b * (0.18 + 0.2 * rng()), 0.06 + 0.14 * rng()]); }
      }
      info.push({ tone: rng(), rough: 0.25 + 0.5 * rng(), twin: tw, ang: rng() * Math.PI, bands: bands, t2: rng(), r2: 0.25 + 0.5 * rng(), ga: rng() * TAU });
    }
    /* boundary point near the centre, for a label */
    var ci0 = 0, bd = 1e9;
    for (i = 0; i < seeds.length; i++) { var dd = Math.pow(seeds[i][0] - 0.5, 2) + Math.pow(seeds[i][1] - 0.5, 2); if (dd < bd) { bd = dd; ci0 = i; } }
    var cpoly = cells[ci0], bpt = cpoly[0], bdd = 1e9;
    for (i = 0; i < cpoly.length; i++) {
      var A2 = cpoly[i], B2 = cpoly[(i + 1) % cpoly.length], mx = (A2[0] + B2[0]) / 2, my = (A2[1] + B2[1]) / 2;
      var d2 = Math.pow(mx - 0.47, 2) + Math.pow(my - 0.55, 2);
      if (d2 < bdd) { bdd = d2; bpt = [mx, my]; }
    }
    function toneRGB(t) { return 'rgb(' + Math.round(158 + 76 * t) + ',' + Math.round(86 + 70 * t) + ',' + Math.round(54 + 58 * t) + ')'; }
    function grey(r) { var g = Math.round(255 * r); return 'rgb(' + g + ',' + g + ',' + g + ')'; }
    function paint(ctx, w, h, rough) {
      function path(p2) { ctx.beginPath(); for (var q = 0; q < p2.length; q++) { var X = p2[q][0] * w, Y = (1 - p2[q][1]) * h; if (q) ctx.lineTo(X, Y); else ctx.moveTo(X, Y); } ctx.closePath(); }
      ctx.fillStyle = rough ? grey(0.8) : '#6A3A20';
      ctx.fillRect(0, 0, w, h);
      for (var q = 0; q < cells.length; q++) {
        if (cells[q].length < 3) continue;
        var f = info[q];
        ctx.fillStyle = rough ? grey(f.rough) : toneRGB(f.tone);
        path(cells[q]); ctx.fill();
        ctx.strokeStyle = ctx.fillStyle; ctx.lineWidth = 1.6; ctx.stroke();
        ctx.save(); path(cells[q]); ctx.clip();
        var cx = seeds[q][0] * w, cy = (1 - seeds[q][1]) * h, cw = w / G;
        if (!rough) {
          var gr = ctx.createLinearGradient(cx - Math.cos(f.ga) * cw, cy - Math.sin(f.ga) * cw, cx + Math.cos(f.ga) * cw, cy + Math.sin(f.ga) * cw);
          gr.addColorStop(0, 'rgba(255,240,225,0.10)'); gr.addColorStop(1, 'rgba(60,24,8,0.10)');
          ctx.fillStyle = gr; ctx.fillRect(cx - 2 * cw, cy - 2 * cw, 4 * cw, 4 * cw);
        }
        if (f.twin) {
          ctx.translate(cx, cy); ctx.rotate(f.ang);
          ctx.fillStyle = rough ? grey(f.r2) : toneRGB(f.t2);
          for (var b2 = 0; b2 < f.bands.length; b2++) ctx.fillRect(-2 * cw, f.bands[b2][0] * cw, 4 * cw, f.bands[b2][1] * cw);
        }
        ctx.restore();
      }
      ctx.lineJoin = 'round';
      for (q = 0; q < cells.length; q++) {
        if (cells[q].length < 3) continue;
        if (!rough) continue;
        path(cells[q]);
        ctx.strokeStyle = grey(0.95);
        ctx.lineWidth = w / 2200; ctx.stroke();
      }
      if (!rough) {
        var r2 = K.rng(seed + 9);
        for (q = 0; q < 12000; q++) {
          ctx.fillStyle = r2() < 0.5 ? 'rgba(60,26,10,' + (0.1 + 0.2 * r2()) + ')' : 'rgba(255,230,210,' + (0.05 + 0.1 * r2()) + ')';
          var s2 = 0.6 + 1.4 * r2();
          ctx.fillRect(r2() * w, r2() * h, s2, s2);
        }
        for (q = 0; q < 18; q++) {
          ctx.strokeStyle = 'rgba(255,232,214,' + (0.03 + 0.05 * r2()) + ')';
          ctx.lineWidth = 0.8 + 1.2 * r2();
          var yy = r2() * h, sl = (r2() - 0.5) * 0.25;
          ctx.beginPath(); ctx.moveTo(0, yy); ctx.lineTo(w, yy + sl * w); ctx.stroke();
        }
      }
    }
    var tex = K.textTexture(N, N, function (ctx, w, h) { paint(ctx, w, h, false); });
    var c2 = document.createElement('canvas');
    c2.width = c2.height = N / 2;
    var ctx2 = c2.getContext('2d');
    ctx2.scale(0.5, 0.5);
    paint(ctx2, N, N, true);
    var rough = new THREE.CanvasTexture(c2);
    return { tex: tex, rough: rough, boundary: bpt, center: seeds[ci0], cells: cells };
  }
  function radialAlphaTexture(inner) {
    return K.textTexture(256, 256, function (ctx, w, h) {
      var g = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
      g.addColorStop(0, '#FFFFFF'); g.addColorStop(inner, '#FFFFFF'); g.addColorStop(1, '#000000');
      ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    });
  }
  /* Roughness streaks of a cutter-sheared copper face (grey = roughness) */
  function cutTexture(seed) {
    var THREE = window.THREE;
    var c = document.createElement('canvas');
    c.width = c.height = 512;
    var ctx = c.getContext('2d'), w = 512, h = 512, rng = K.rng(seed);
    ctx.fillStyle = 'rgb(110,110,110)'; ctx.fillRect(0, 0, w, h);
    ctx.save(); ctx.translate(w / 2, h / 2); ctx.rotate(0.5);
    for (var i = 0; i < 520; i++) {
      var y = (rng() - 0.5) * h * 1.5, g = Math.round(85 + 70 * rng());
      ctx.strokeStyle = 'rgba(' + g + ',' + g + ',' + g + ',' + (0.12 + 0.2 * rng()) + ')';
      ctx.lineWidth = 0.6 + 3 * rng();
      ctx.beginPath(); ctx.moveTo(-w, y); ctx.lineTo(w, y + (rng() - 0.5) * 5); ctx.stroke();
    }
    ctx.restore();
    var gr = ctx.createRadialGradient(w / 2, h / 2, w * 0.38, w / 2, h / 2, w / 2);
    gr.addColorStop(0, 'rgba(200,200,200,0)'); gr.addColorStop(1, 'rgba(230,230,230,0.8)');
    ctx.fillStyle = gr; ctx.fillRect(0, 0, w, h);
    return new THREE.CanvasTexture(c);
  }
  function atomTileTexture() {
    var tex = K.textTexture(128, 128, function (ctx, w, h) {
      ctx.fillStyle = '#5A311B'; ctx.fillRect(0, 0, w, h);
      var g = ctx.createRadialGradient(w * 0.44, h * 0.42, w * 0.03, w / 2, h / 2, w * 0.36);
      g.addColorStop(0, '#FFE6D2'); g.addColorStop(0.3, '#ECAA80'); g.addColorStop(0.78, '#A85E36'); g.addColorStop(1, 'rgba(90,49,27,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(w / 2, h / 2, w * 0.34, 0, TAU); ctx.fill();
    });
    return tex;
  }

  K.register('zoom-to-atom', function (el, opts) {
    var THREE = window.THREE;
    opts = opts || {};
    var theme = opts.theme || 'dark', dark = theme === 'dark';
    var v = K.stage3d(el, {
      theme: theme, fov: 30, distance: 10, yaw: 0, pitch: 0.1, target: [0, 0, 0], size: 4, shadows: false,
      near: 0.02, far: 900, minDistance: 7.5, maxDistance: 13, minPitch: -0.45, maxPitch: 0.75
    });
    v.lights.key.intensity = 1.7; v.lights.rim.intensity = 1.0; v.lights.fill.intensity = 0.45; v.lights.hemi.intensity = 0.4;
    v.exposure = 1.05;
    var reduced = K.reducedMotion;
    var world = new THREE.Group();
    world.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), new THREE.Vector3(0.5, 0.34, 0.8).normalize());
    var roll = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), 0.35);
    world.quaternion.multiply(roll);
    v.scene.add(world);
    var tmpV = new THREE.Vector3(), tmpM = new THREE.Matrix4();

    function Layer(unitExp) {
      var g = new THREE.Group();
      world.add(g);
      var L = {
        g: g, u: unitExp, mats: [], alpha: 0, scale: 1,
        add: function (o) { g.add(o); return o; },
        mat: function (m, base) {
          m.transparent = true;
          var b = base === undefined ? (m.uniforms && m.uniforms.uOpacity ? m.uniforms.uOpacity.value : m.opacity) : base;
          L.mats.push({ m: m, base: b });
          return m;
        },
        setAlpha: function (a) {
          L.alpha = a; g.visible = a > 0.003;
          for (var i = 0; i < L.mats.length; i++) {
            var e = L.mats[i];
            if (e.m.uniforms && e.m.uniforms.uOpacity) e.m.uniforms.uOpacity.value = e.base * a; else e.m.opacity = e.base * a;
          }
        },
        setZ: function (z) { L.scale = Math.pow(10, L.u - z); g.scale.setScalar(L.scale); return L.scale; },
        anchor: function (x, y, zz) { var p = new THREE.Vector3(); return function () { p.set(x, y, zz); return p.applyMatrix4(g.matrixWorld); }; },
        anchorV: function (vec) { var p = new THREE.Vector3(); return function () { return p.copy(vec).applyMatrix4(g.matrixWorld); }; }
      };
      return L;
    }

    /* ---------------- layer 0: household cable, mm (H05VV-F 3G1,5) ---------------- */
    var L0 = Layer(-3);
    var R_OUT = 3.7, R_IN = 2.95, Z_SH = -13, Z_BACK = -90, R_INS = 1.42, Z_INS = -5.2, LAY = 18;
    var ANG = [Math.PI / 3, Math.PI, 5 * Math.PI / 3];
    var AX = [-2.7 * Math.cos(ANG[0]), -2.7 * Math.sin(ANG[0])];
    function coreC(ci, z, out) {
      var a = ANG[ci], f = sstep(Z_SH - 1, Z_INS - 1.2, z), rr = 1.67 + (2.7 - 1.67) * f;
      out[0] = AX[0] + rr * Math.cos(a); out[1] = AX[1] + rr * Math.sin(a);
      return out;
    }
    var pvcWhite = L0.mat(K.mat.std(0xE9E6DF, 0.5, 0));
    var sheathPts = [
      new THREE.Vector2(R_OUT, Z_BACK), new THREE.Vector2(R_OUT, Z_SH - 0.08), new THREE.Vector2(R_OUT - 0.08, Z_SH),
      new THREE.Vector2(R_IN + 0.06, Z_SH), new THREE.Vector2(R_IN, Z_SH - 0.06), new THREE.Vector2(R_IN, Z_BACK)
    ];
    var shGeo = new THREE.LatheGeometry(sheathPts, 96);
    shGeo.rotateX(Math.PI / 2);
    var sheath = new THREE.Mesh(shGeo, pvcWhite);
    sheath.position.set(AX[0], AX[1], 0);
    L0.add(sheath);
    var plug = new THREE.Mesh(new THREE.CircleGeometry(R_IN, 48), L0.mat(K.mat.std(0x15110E, 0.9, 0)));
    plug.position.set(AX[0], AX[1], Z_SH - 2.4);
    L0.add(plug);
    var gyTex = K.textTexture(64, 256, function (ctx, w, h) {
      ctx.fillStyle = '#2F8A43'; ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#E3C232'; ctx.fillRect(0, h * 0.06, w, h * 0.2); ctx.fillRect(0, h * 0.56, w, h * 0.2);
    });
    var insMats = [L0.mat(K.mat.std(0x6A3F24, 0.42, 0)), L0.mat(K.mat.std(0x2A58B5, 0.42, 0)), L0.mat(K.mat.std(0xffffff, 0.42, 0, { map: gyTex }))];
    var cutMats = [L0.mat(K.mat.std(0x5E3820, 0.75, 0)), L0.mat(K.mat.std(0x26509F, 0.75, 0)), L0.mat(K.mat.std(0x2E7A3D, 0.75, 0))];
    var cc = [0, 0];
    for (var ci2 = 0; ci2 < 3; ci2++) {
      var cpts = [];
      for (var zi = 0; zi <= 12; zi++) { var zz = Z_SH - 5 + (Z_INS - Z_SH + 5) * zi / 12; coreC(ci2, zz, cc); cpts.push(new THREE.Vector3(cc[0], cc[1], zz)); }
      var tg = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(cpts), 64, R_INS, 40, false);
      L0.add(new THREE.Mesh(tg, insMats[ci2]));
      coreC(ci2, Z_INS, cc);
      var ring = new THREE.Mesh(new THREE.RingGeometry(0.83, R_INS, 56), cutMats[ci2]);
      ring.position.set(cc[0], cc[1], Z_INS);
      L0.add(ring);
      var stop = new THREE.Mesh(new THREE.CircleGeometry(0.84, 40), plug.material);
      stop.position.set(cc[0], cc[1], Z_INS - 0.12);
      L0.add(stop);
    }
    /* 30 strands of Ø 0,25 mm per core (class 5 flexible conductor) */
    var RINGS = [[1, 0], [6, 0.255], [12, 0.505], [11, 0.75]];
    var srng = K.rng(515), strands = [];
    for (ci2 = 0; ci2 < 3; ci2++) {
      for (var rg = 0; rg < RINGS.length; rg++) {
        for (var si3 = 0; si3 < RINGS[rg][0]; si3++) {
          (function (core, ringI, idx, nInRing, rad0) {
            var a0 = TAU * idx / nInRing + ringI * 0.4, spl = ringI === 0 ? 0 : ringI === 1 ? 0.1 : 0.2;
            var focus = core === 0 && ringI === 0;
            var zEnd = focus ? 0 : core === 0 ? -(0.03 + 0.1 * srng()) : -(0.35 + 0.25 * srng());
            var detail = core === 0 ? (ringI <= 1 ? 40 : ringI === 2 ? 28 : 18) : 10;
            strands.push({
              r: 0.125, rad: detail, seg: core === 0 ? (ringI <= 1 ? 22 : 14) : 8, z0: Z_INS - 0.5, z1: zEnd,
              path: function (z, out) {
                coreC(core, z, out);
                var ang = a0 + TAU * z / LAY, rr = rad0 * (1 + spl * sstep(-2.4, 0, z));
                out[0] += rr * Math.cos(ang); out[1] += rr * Math.sin(ang);
                return out;
              }
            });
          })(ci2, rg, si3, RINGS[rg][0], RINGS[rg][1]);
        }
      }
    }
    var bundle = tubeBundle(strands);
    var copperMat = L0.mat(K.mat.copper({ roughness: 0.34 }));
    var cutTex = cutTexture(77);
    var capMat = L0.mat(K.mat.std(0xC9824F, 0.62, 1, { roughnessMap: cutTex, envMapIntensity: 0.55 }));
    L0.add(new THREE.Mesh(bundle.sides, copperMat));
    L0.add(new THREE.Mesh(bundle.caps, capMat));

    /* ---------------- layer 2: etched grains on the strand's end face, µm ---------------- */
    var L2 = Layer(-6);
    var PATCH = 30;
    var gt = grainTexture(4242, 26, 2048);
    var patchMat = L2.mat(K.mat.std(0xffffff, 0.85, 0.8, { map: gt.tex, roughnessMap: gt.rough, alphaMap: radialAlphaTexture(0.78), depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -4 }));
    var patch = new THREE.Mesh(new THREE.CircleGeometry(PATCH, 128), patchMat);
    /* put the centre of one grain on the zoom axis, so the dive continues inside a single crystal */
    var pcx = -(gt.center[0] - 0.5) * 2 * PATCH, pcy = -(gt.center[1] - 0.5) * 2 * PATCH;
    patch.position.set(pcx, pcy, 0.05);
    L2.add(patch);
    var gbP = new THREE.Vector3((gt.boundary[0] - 0.5) * 2 * PATCH + pcx, (gt.boundary[1] - 0.5) * 2 * PATCH + pcy, 0.05);
    /* grain boundaries as crisp screen-space lines (stay sharp at any magnification) */
    var gbLines = LineBatch(9000, { color: '#3A1A0C', width: 1.4, renderOrder: 3 });
    (function () {
      var buf = new Float32Array(64 * 3), al = new Float32Array(64);
      gbLines.begin();
      for (var c = 0; c < gt.cells.length; c++) {
        var pl = gt.cells[c];
        if (pl.length < 3 || pl.length > 60) continue;
        var ok = true;
        for (var q = 0; q < pl.length; q++) {
          var x = (pl[q][0] - 0.5) * 2 * PATCH + pcx, y = (pl[q][1] - 0.5) * 2 * PATCH + pcy, rr = Math.sqrt((x - pcx) * (x - pcx) + (y - pcy) * (y - pcy));
          if (rr > 0.97 * PATCH) { ok = false; break; }
          buf[q * 3] = x; buf[q * 3 + 1] = y; buf[q * 3 + 2] = 0.06;
          al[q] = 0.85 * (1 - sstep(0.72 * PATCH, 0.95 * PATCH, rr));
        }
        if (ok) gbLines.add(buf, pl.length, al, true, 0);
      }
      gbLines.end();
    })();
    L2.add(gbLines.mesh);
    L2.mat(gbLines.mat, 1);

    /* ---------------- layer 3a: surface atoms (Cu(100), square lattice 0,2556 nm), nm ---------------- */
    var L3a = Layer(-9);
    var SA = 0.2556, NREP = 4001;
    var tileTex = atomTileTexture();
    tileTex.wrapS = tileTex.wrapT = THREE.RepeatWrapping;
    tileTex.repeat.set(NREP, NREP);
    tileTex.anisotropy = 8;
    var surfMat = L3a.mat(K.mat.std(0xffffff, 0.4, 0.7, { map: tileTex, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -2 }));
    var surf = new THREE.Mesh(new THREE.PlaneGeometry(SA * NREP, SA * NREP), surfMat);
    L3a.add(surf);

    /* ---------------- layer 3b: FCC lattice block + electron sea, nm ---------------- */
    var L3 = Layer(-9);
    var AL = 0.3615, M = 4, RION = 0.064;
    var ionPos = [];
    for (var ly = 0; ly < 3; ly++) {
      var off2 = (ly % 2) * 0.5;
      for (var ii = -M; ii <= M; ii++) for (var jj = -M; jj <= M; jj++) {
        var x2 = (ii + off2) * SA, y2 = (jj + off2) * SA;
        if (Math.sqrt(x2 * x2 + y2 * y2) > (M + 0.3) * SA) continue;
        if (ly === 0 && ii === 0 && jj === 0) continue;
        ionPos.push([x2, y2, -ly * AL / 2]);
      }
    }
    var ionMat = L3.mat(K.mat.copper({ roughness: 0.32 }));
    var ions = K.instanced(ionPos.length, { radius: RION, detail: 2, material: ionMat });
    var ionsA = instAlpha(ions, ionPos.length);
    for (var ip = 0; ip < ionPos.length; ip++) {
      var rr2 = Math.sqrt(ionPos[ip][0] * ionPos[ip][0] + ionPos[ip][1] * ionPos[ip][1]);
      ions.setAt(ip, ionPos[ip][0], ionPos[ip][1], ionPos[ip][2], 1);
      ionsA.arr[ip] = (1 - sstep(2.6 * SA, (M + 0.3) * SA, rr2)) * (1 - 0.3 * (-ionPos[ip][2] / AL));
    }
    ions.commit(); ionsA.commit();
    L3.add(ions);
    var focusIonMat = L3.mat(K.mat.copper({ roughness: 0.32 }));
    var focusIon = new THREE.Mesh(new THREE.SphereGeometry(RION, 48, 32), focusIonMat);
    L3.add(focusIon);
    /* one free electron per atom, wandering around the octahedral sites (slowed down) */
    var NE = 0, eHome = [];
    for (ly = 0; ly < 3; ly++) {
      var off3 = ((ly + 1) % 2) * 0.5;
      for (ii = -M; ii <= M; ii++) for (jj = -M; jj <= M; jj++) {
        var x3 = (ii + off3) * SA, y3 = (jj + off3) * SA;
        if (Math.sqrt(x3 * x3 + y3 * y3) > (M - 0.2) * SA) continue;
        eHome.push([x3, y3, -ly * AL / 2]);
      }
    }
    NE = eHome.length;
    var seaG = pointsGeometry(NE, true), seaP = seaG.attributes.position.array, seaA = seaG.attributes.aAlpha.array, seaS = seaG.attributes.aSize.array;
    var erng2 = K.rng(888), ePh = new Float32Array(NE * 6);
    for (var ie = 0; ie < NE; ie++) {
      for (var c6 = 0; c6 < 6; c6++) ePh[ie * 6 + c6] = c6 < 3 ? TAU * erng2() : 0.5 + 0.7 * erng2();
      var rr3 = Math.sqrt(eHome[ie][0] * eHome[ie][0] + eHome[ie][1] * eHome[ie][1]);
      seaA[ie] = (1 - sstep(2.4 * SA, (M - 0.2) * SA, rr3)) * (eHome[ie][2] < -0.3 ? 0.7 : 1);
      seaS[ie] = 0.8 + 0.4 * erng2();
    }
    var seaMat = L3.mat(pointsMaterial({ color: '#A3B8F8', color2: '#D2DCFB', size: 0.085, minPx: 1.5, maxPx: 40, soft: 1.8, additive: true, farAlpha: 0.75 }), 1);
    var sea = new THREE.Points(seaG, seaMat);
    sea.frustumCulled = false;
    L3.add(sea);

    /* ---------------- layer 4: one copper atom, pm (29 electrons) ---------------- */
    var L4 = Layer(-12);
    var A0PM = 52.918, PERE = 150;
    var nAt = 0;
    for (var sh2 = 0; sh2 < CU_SHELLS.length; sh2++) nAt += CU_SHELLS[sh2].e * PERE;
    var atG = pointsGeometry(nAt, false), atP = atG.attributes.position.array, atS = atG.attributes.aSize.array, atA = atG.attributes.aAlpha.array, atT = atG.attributes.aTint.array;
    var atC = new Float32Array(nAt * 3);
    var arng = K.rng(2929), dd3 = [0, 0, 0], ia = 0;
    var SHC = [rgb01('#F2F5FF'), rgb01('#D6E0FF'), rgb01('#8EA6F2'), rgb01('#B4C6FA')];
    var SHPEAK = [1.85, 9.0, 34, 145];
    var SHA = [0.75, 0.6, 0.42, 0.95];
    for (sh2 = 0; sh2 < CU_SHELLS.length; sh2++) {
      var shl = CU_SHELLS[sh2];
      for (var pe = 0; pe < shl.e * PERE; pe++) {
        var rpm = cuRadius(arng, shl) * A0PM;
        uniDir(arng, dd3);
        atP[ia * 3] = rpm * dd3[0]; atP[ia * 3 + 1] = rpm * dd3[1]; atP[ia * 3 + 2] = rpm * dd3[2];
        atS[ia] = SHPEAK[shl.k] * (shl.k === 3 ? 0.052 : 0.075) * (0.8 + 0.4 * arng());
        atA[ia] = SHA[shl.k];
        atT[ia] = shl.k === 3 ? 1 : 0;
        var colr = SHC[shl.k];
        atC[ia * 3] = colr[0]; atC[ia * 3 + 1] = colr[1]; atC[ia * 3 + 2] = colr[2];
        ia++;
      }
    }
    atG.setAttribute('aColor', new THREE.BufferAttribute(atC, 3));
    var AT_VS = [
      PT_HEAD, 'uniform float uTime;',
      'void main(){',
      '  vec3 p = position;',
      '  float h = fract(sin(dot(position.xy, vec2(12.9898, 78.233)) + position.z * 0.37) * 43758.5453);',
      '  float a = aAlpha * mix(1.0, 0.35 + 0.65 * (0.5 + 0.5 * sin(uTime * (0.8 + 0.9 * h) + h * 40.0)), aTint);',
      PT_TAIL,
      '  vT = 0.0;',
      '}'
    ].join('\n');
    var atMat = L4.mat(pointsMaterial({ vs: AT_VS, vertexColors: true, size: 1, minPx: 1.1, maxPx: 34, soft: 2.3, additive: true, farAlpha: 0.65, fadeNear: 3.2, uniforms: { uTime: { value: 0 } } }), 1);
    atMat.uniforms.uC1.value.set(0, 0, 0);
    var atPts = new THREE.Points(atG, atMat);
    atPts.frustumCulled = false;
    L4.add(atPts);
    var shellLines = LineBatch(4 * 130, { color: P.blueLight, width: 1.1, additive: true, dash: 0, opacity: 1 });
    L4.add(shellLines.mesh);
    L4.mat(shellLines.mat, 1);
    var ringBuf = new Float32Array(130 * 3);

    /* nucleus glow seen from afar (constant screen size) */
    var glowTex = columnTexture(function (rr) { return Math.exp(-rr * rr * 6); }, 1, 128);
    var glow = billboards(1, glowTex, P.copperLight, { additive: true, opacity: 1 });
    world.add(glow.mesh);

    /* ---------------- layer 5: copper-63 nucleus, fm (29 p + 34 n) ---------------- */
    var L5 = Layer(-15);
    var nucl = makeNucleus(29, 34, 0.86, 6363, {
      detail: 3,
      protonMat: L5.mat(K.mat.std(0xC4682F, 0.38, 0.1, { emissive: 0x3A160A, emissiveIntensity: 0.4 })),
      neutronMat: L5.mat(K.mat.std(0x6E747F, 0.46, 0.05, { emissive: 0x101318, emissiveIntensity: 0.4, envMapIntensity: 0.7 }))
    });
    L5.add(nucl.group);
    var nm4 = new THREE.Matrix4();

    /* ---------------- labels ---------------- */
    var lab = {
      sheath: v.label('PVC kılıf: yalıtkan', { at: L0.anchor(AX[0] + R_OUT * Math.cos(1.2), AX[1] + R_OUT * Math.sin(1.2), Z_SH - 3), cls: 'note', dx: -40, dy: -110, line: true, align: 'right' }),
      wires: v.label('bakır teller: iletken', { at: L0.anchor(0.62, 0.32, -1.6), cls: 'note', dx: 92, dy: -64, line: true, align: 'left' }),
      strand: v.label('tek bir bakır tel: ≈ 0,25 mm', { at: L0.anchor(0.1, 0.07, -0.3), cls: 'note chip', dx: 40, dy: -150, line: true, align: 'left' }),
      grain: v.label('tane sınırı', { at: L2.anchorV(gbP), cls: 'note chip', dx: 70, dy: -80, line: true, align: 'left' }),
      grainNote: fixedLabel(v, 'Her tane, atomları düzenli dizilmiş küçük bir kristaldir', 'note chip', { x: 320, y: 496, align: 'center', valign: 'bottom' }),
      ions: v.label('bakır iyonları', { at: L3.anchor(2 * SA, -SA, 0), cls: 'note chip', dx: 30, dy: 130, line: true, align: 'left' }),
      sea: v.label('serbest elektronlar: elektron denizi', { at: L3.anchor(-1.5 * SA, 1.5 * SA, -0.09), cls: 'note chip', dx: 80, dy: -150, line: true, align: 'center' }),
      inner: v.label('iç elektronlar: 2 + 8 + 18 = 28', { at: L4.anchor(-24, -24, 0), cls: 'note', dx: -110, dy: 96, line: true, align: 'right' }),
      outer: v.label('dış elektron: 1 (4. katman)', { at: L4.anchor(102, 102, 0), cls: 'note', dx: 54, dy: -54, line: true, align: 'left' }),
      prot: v.label('29 proton: artı (+) yüklü', { at: [0, 0, 0], cls: 'note', dx: -84, dy: -70, line: true, align: 'right' }),
      neut: v.label('34 nötron: yüksüz', { at: [0, 0, 0], cls: 'note', dx: 92, dy: 84, line: true, align: 'left' }),
      empty: fixedLabel(v, 'Atomun içi neredeyse tamamen boş', 'note', { x: 340, y: 494, align: 'center', valign: 'bottom' }),
      tag: fixedLabel(v, 'basitleştirilmiş model', 'tag', { x: 22, y: 500, valign: 'bottom' })
    };
    lab.tag.el.style.letterSpacing = '0.08em';
    ['sheath', 'wires', 'strand', 'grain', 'grainNote', 'ions', 'sea', 'inner', 'outer', 'prot', 'neut', 'empty'].forEach(function (kk) {
      var st = lab[kk].el.style, isChip = / chip/.test(lab[kk].el.className);
      st.fontSize = '14px'; st.color = '#E8ECF4';
      if (!isChip) { st.background = 'rgba(14,18,26,0.72)'; st.padding = '2px 8px'; st.borderRadius = '8px'; }
    });
    var protP = new THREE.Vector3(), neutP = new THREE.Vector3();
    lab.prot.at = protP; lab.neut.at = neutP;

    /* ---------------- zoom schedule ---------------- */
    var ZS = [-2.5, -3.62, -5.6, -9.4, -9.97, -14.58];
    var ES = [-2, -4, -6, -9, -10, -14];
    var NAMES = ['Kablo', 'Bakır teller', 'Kristal taneleri', 'Atom dizisi', 'Bakır atomu', 'Çekirdek'];
    var SEGS = [[0, 0, 2.6], [0, 1, 2.3], [1, 1, 2.3], [1, 2, 2.7], [2, 2, 2.3], [2, 3, 5.0], [3, 3, 2.6], [3, 4, 1.9], [4, 4, 2.6], [4, 5, 5.4], [5, 5, 3.0], [5, 0, 10.0]];
    var SEGS_RM = [[0, 0, 7], [0, 1, 1.8], [1, 1, 7], [1, 2, 1.8], [2, 2, 7], [2, 3, 2.2], [3, 3, 7], [3, 4, 1.4], [4, 4, 7], [4, 5, 2.4], [5, 5, 7], [5, 0, 2.6]];
    function total(sg) { var s = 0; for (var i = 0; i < sg.length; i++) s += sg[i][2]; return s; }
    function zAuto(t) {
      var sg = reduced ? SEGS_RM : SEGS, u = t % total(sg);
      for (var i = 0; i < sg.length; i++) {
        var d = sg[i][2];
        if (u < d) return lerp(ZS[sg[i][0]], ZS[sg[i][1]], eio(u / d));
        u -= d;
      }
      return ZS[0];
    }
    function expOf(z) {
      if (z >= ZS[0]) return ES[0] + (z - ZS[0]);
      for (var i = 0; i < 5; i++) if (z >= ZS[i + 1]) return lerp(ES[i], ES[i + 1], (z - ZS[i]) / (ZS[i + 1] - ZS[i]));
      return ES[5] + (z - ZS[5]);
    }
    function nearestStop(z) { var b = 0, bd = 1e9; for (var i = 0; i < 6; i++) { var d = Math.abs(z - ZS[i]); if (d < bd) { bd = d; b = i; } } return b; }
    /* stop name; between the atom and the nucleus the picture is empty space, so it says so */
    function stageName(z) {
      for (var k = 0; k < 6; k++) if (Math.abs(z - ZS[k]) < 0.5) return NAMES[k];
      var e = expOf(z);
      if (e < -10.5 && e > -13.5) return 'Atomun içi: boşluk';
      return NAMES[nearestStop(z)];
    }
    function near(z, k) { return 1 - sstep(0.06, 0.22, Math.abs(z - ZS[k])); }
    function win(z, inA, inB, outA, outB) { return sstep(inA, inB, -z) * (1 - sstep(outA, outB, -z)); }

    var auto = true, zCur = ZS[0], fly = null, stopSel = -1;
    var sway = makeSway();
    var camLocal = new THREE.Vector3(), invM = new THREE.Matrix4();

    function applyZ(z, t) {
      /* layer windows (−z = decades of zoom) */
      L0.setAlpha(1 - sstep(4.95, 5.4, -z));
      L2.setAlpha(win(z, 4.5, 5.0, 8.0, 8.6));
      gbLines.mat.uniforms.uOpacity.value = L2.alpha * sstep(4.95, 5.35, -z);
      gbLines.res(v);
      L3a.setAlpha(win(z, 8.2, 8.8, 8.75, 9.15));
      L3.setAlpha(win(z, 8.6, 9.05, 9.62, 9.86));
      L4.setAlpha(win(z, 9.55, 9.85, 12.3, 12.85));
      L5.setAlpha(sstep(12.85, 13.45, -z));
      L0.setZ(z); L2.setZ(z); L3a.setZ(z); L3.setZ(z); L4.setZ(z); L5.setZ(z);
      v.exposure = 1.05 - 0.22 * win(z, 2.9, 3.3, 4.5, 4.9) - 0.27 * win(z, 3.2, 3.5, 7.0, 7.6) - 0.12 * sstep(13, 13.6, -z);
      focusIonMat.opacity = L3.alpha * (1 - sstep(9.55, 9.82, -z));
      ionMat.opacity = L3.alpha;
      world.updateMatrixWorld(true);
      var psc = pxScale(v);
      if (L3.g.visible) {
        seaMat.uniforms.uScale.value = psc; seaMat.uniforms.uSize.value = 0.085 * L3.scale;
        seaMat.uniforms.uDepth.value.set(9, 11.5);
        var tt = reduced ? t * 0.3 : t;
        for (var q = 0; q < NE; q++) {
          var h = eHome[q], o = q * 6;
          seaP[q * 3] = h[0] + 0.1 * Math.sin(ePh[o + 3] * tt + ePh[o]);
          seaP[q * 3 + 1] = h[1] + 0.1 * Math.sin(ePh[o + 4] * tt + ePh[o + 1]);
          seaP[q * 3 + 2] = h[2] + 0.06 * Math.sin(ePh[o + 5] * tt + ePh[o + 2]);
        }
        seaG.attributes.position.needsUpdate = true;
      }
      if (L4.g.visible) {
        /* past the atom stop the sprites grow slowly: flying through reads as a clean starfield */
        var s4 = Math.pow(10, -12 - ZS[4]);
        atMat.uniforms.uScale.value = psc;
        atMat.uniforms.uSize.value = L4.scale <= s4 ? L4.scale : s4 * Math.pow(L4.scale / s4, 0.25);
        atMat.uniforms.uTime.value = reduced ? 0 : t;
        atMat.uniforms.uDepth.value.set(8, 12);
        /* shell rings facing the camera, in pm */
        invM.copy(L4.g.matrixWorld).invert();
        camLocal.copy(v.camera.position).applyMatrix4(invM).normalize();
        var bs = basisFor([camLocal.x, camLocal.y, camLocal.z]);
        shellLines.begin();
        for (var k2 = 0; k2 < 4; k2++) {
          var rpx = SHPEAK[k2] * L4.scale * psc / 10;
          var ra = (k2 === 0 ? 0.0 : 0.5) * (1 - sstep(260, 520, rpx)) * sstep(3, 10, rpx);
          if (ra < 0.01) continue;
          circlePts(ringBuf, 0, 128, 0, 0, 0, SHPEAK[k2], bs.u, bs.w);
          shellLines.add(ringBuf, 128, ra, true, 0);
        }
        shellLines.end();
        shellLines.res(v);
      }
      if (L5.g.visible) {
        var jt = reduced ? 0 : t;
        var lists = [[nucl.pI, nucl.protons], [nucl.nI, nucl.neutrons]];
        for (var li = 0; li < 2; li++) {
          var mesh = lists[li][0], arr = lists[li][1];
          for (var n = 0; n < arr.length; n++) {
            var b = arr[n], ph = n * 1.7 + li * 0.9;
            nm4.makeTranslation(b[0] + 0.05 * Math.sin(jt * 1.3 + ph), b[1] + 0.05 * Math.sin(jt * 1.1 + ph * 1.3), b[2] + 0.05 * Math.sin(jt * 0.9 + ph * 0.7));
            mesh.setMatrixAt(n, nm4);
          }
          mesh.instanceMatrix.needsUpdate = true;
        }
      }
      /* nucleus glow: visible while the nucleus is still too small to resolve */
      var ga = sstep(10.6, 11.4, -z) * (1 - sstep(13.15, 13.6, -z));
      var gpx = 7 + 14 * sstep(11, 13.4, -z);
      glow.setAt(0, 0, 0, 0, gpx * (2 * 10 * Math.tan(15 * Math.PI / 180)) / Math.max(1, v.h));
      glow.alpha[0] = ga;
      glow.commit();
      glow.mesh.visible = ga > 0.003;
    }

    function labelsFor(z) {
      showL(lab.sheath, near(z, 0) > 0.5); showL(lab.wires, near(z, 0) > 0.5);
      showL(lab.strand, near(z, 1) > 0.5);
      showL(lab.grain, near(z, 2) > 0.5); lab.grainNote.show(near(z, 2) > 0.5);
      showL(lab.ions, near(z, 3) > 0.5); showL(lab.sea, near(z, 3) > 0.5);
      showL(lab.inner, near(z, 4) > 0.5); showL(lab.outer, near(z, 4) > 0.5);
      showL(lab.prot, near(z, 5) > 0.5); showL(lab.neut, near(z, 5) > 0.5);
      lab.empty.show(-z > 11.2 && -z < 13.3);
      var tg = near(z, 3) > 0.5 ? 'basitleştirilmiş model · yavaşlatılmış' : near(z, 4) > 0.5 ? 'olasılık bulutu: 29 elektron' : near(z, 5) > 0.5 ? 'basitleştirilmiş model' : '';
      if (tg) lab.tag.set(tg);
      lab.tag.show(!!tg);
      if (L5.g.visible) {
        invM.copy(L5.g.matrixWorld).invert();
        camLocal.copy(v.camera.position).applyMatrix4(invM).normalize();
        var cd = [camLocal.x, camLocal.y, camLocal.z];
        tmpV.set(0, 0, 0).applyMatrix4(L5.g.matrixWorld);
        var pc = v.project(tmpV);
        var fp = pickNucleon(nucl.protons, cd, pc.x - 60, pc.y - 55), fn = pickNucleon(nucl.neutrons, cd, pc.x + 60, pc.y + 60);
        protP.set(fp[0], fp[1], fp[2]).applyMatrix4(L5.g.matrixWorld);
        neutP.set(fn[0], fn[1], fn[2]).applyMatrix4(L5.g.matrixWorld);
      }
    }

    /* a camera-facing nucleon whose screen position is nearest to (tx, ty) */
    var pickV = new THREE.Vector3();
    function pickNucleon(list, cd, tx, ty) {
      var best = list[0], bd = 1e18;
      for (var i = 0; i < list.length; i++) {
        var p = list[i], len = Math.sqrt(p[0] * p[0] + p[1] * p[1] + p[2] * p[2]) + 1e-6;
        if ((p[0] * cd[0] + p[1] * cd[1] + p[2] * cd[2]) / len < 0.45) continue;
        pickV.set(p[0], p[1], p[2]).applyMatrix4(L5.g.matrixWorld);
        var pr = v.project(pickV), d = (pr.x - tx) * (pr.x - tx) + (pr.y - ty) * (pr.y - ty);
        if (d < bd) { bd = d; best = p; }
      }
      return best;
    }
    function drawOverlay(z) {
      var ctx = v.ctx, W = v.w, H = v.h;
      var e = Math.round(expOf(z));
      ctx.save();
      /* HUD panels keep the readout and the gauge legible over bright metal */
      var name = stageName(z);
      ctx.font = K.font(15, 500, false);
      var nw = ctx.measureText(name).width;
      ctx.font = K.font(34, 500, true);
      var bw = ctx.measureText('10').width + 34 * 0.68 * 0.6 * (e <= -10 ? 3 : 2) + 20;
      var pw = Math.max(nw, bw) + 26;
      ctx.fillStyle = 'rgba(14,18,26,0.74)'; ctx.strokeStyle = 'rgba(38,45,59,0.9)'; ctx.lineWidth = 1;
      K.rr(ctx, 12, 12, pw, 84, 10); ctx.fill(); ctx.stroke();
      var gx = W - 34, g0 = 70, g1 = H - 74;
      K.rr(ctx, W - 88, g0 - 20, 72, g1 - g0 + 40, 10); ctx.fill(); ctx.stroke();
      drawPow10(ctx, 24, 56, e, 34, P.onNight, 'm');
      K.label(ctx, name, 25, 82, { size: 15, weight: 500, color: P.onNightMuted });
      /* depth gauge on the right: 10^-2 … 10^-14 m */
      function yOf(E) { return g0 + (-2 - E) / 12 * (g1 - g0); }
      ctx.strokeStyle = 'rgba(154,163,178,0.35)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(gx, g0); ctx.lineTo(gx, g1); ctx.stroke();
      for (var E = -2; E >= -14; E--) {
        var y = Math.round(yOf(E)) + 0.5, isStop = ES.indexOf(E) >= 0;
        ctx.strokeStyle = isStop ? 'rgba(198,206,219,0.75)' : 'rgba(154,163,178,0.35)';
        ctx.beginPath(); ctx.moveTo(gx - (isStop ? 7 : 4), y); ctx.lineTo(gx, y); ctx.stroke();
        if (isStop) drawPow10(ctx, gx - 52, y + 5, E, 14, '#E8ECF4', '');
      }
      var ey = yOf(expOf(z));
      ctx.fillStyle = P.blueLight;
      ctx.beginPath(); ctx.arc(gx, ey, 3.6, 0, TAU); ctx.fill();
      ctx.strokeStyle = K.rgba(P.blueLight, 0.5);
      ctx.beginPath(); ctx.arc(gx, ey, 7, 0, TAU); ctx.stroke();
      ctx.restore();
    }

    function resetAll() {
      auto = true; fly = null; stopSel = -1; zCur = ZS[0];
      homeView(v); sway.reset();
    }
    resetAll();

    return {
      reset: resetAll,
      set: function (key, val) {
        if (key !== 'stop') return;
        var k = Math.round(+val);
        if (!(k >= 0 && k <= 5)) return;
        auto = false; stopSel = k;
        fly = { from: zCur, to: ZS[k], t: 0, dur: Math.min(7, 1.0 + 0.42 * Math.abs(ZS[k] - zCur)) };
      },
      read: function (key) {
        if (key === 'stop') return String(nearestStop(zCur));
        if (key === 'scale') return '10' + supStr(Math.round(expOf(zCur))) + ' m';
        if (key === 'stage') return stageName(zCur);
        if (key === 'explain') return 'Ölçek: ' + '10' + supStr(Math.round(expOf(zCur))) + ' m, ' + stageName(zCur) + '.';
        return '';
      },
      frame: function (t, dt) {
        if (auto) zCur = zAuto(t);
        else if (fly) {
          fly.t += dt;
          zCur = lerp(fly.from, fly.to, eio(fly.t / fly.dur));
          if (fly.t >= fly.dur) { zCur = fly.to; fly = null; }
        }
        if (!reduced) sway.apply(v, 0.12 * Math.sin(TAU * t / 34), 0.05 * Math.sin(TAU * t / 27));
        applyZ(zCur, t);
        labelsFor(zCur);
        v.render(dt);
        if (K.skipRender) return;
        drawOverlay(zCur);
      },
      dispose: function () { glowTex.dispose(); v.dispose(); }
    };
  });

})();
