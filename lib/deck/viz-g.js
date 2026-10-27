/* Köklerden Göklere · Builder G · Devre ve parçalar
 *   ohm-lab · circuit-loop · symbols-morph · resistor-zoom · breadboard-build · series-parallel
 *
 * Ortak parça standardı (birim: mm; H ve I yapıcıları da aynı ölçüleri kullanır)
 *   direnç     : eksenel karbon film, gövde 6,3 × 2,4 mm, bej #E3D2B0, uçları hafif şişkin,
 *                kalaylı çelik bacak Ø0,6 mm, IEC 60062 renk bantları (4 bant, ± %5 altın)
 *   LED        : 5 mm, epoksi kubbe Ø5 × 8,6 mm, flanş Ø5,8 mm (katot tarafı düz), anot bacağı uzun
 *   9 V pil    : 48,5 × 26,5 × 17,5 mm, çıtçıt uçlar (altıgen = −, yuvarlak = +)
 *   breadboard : yarım boy 82 × 55 mm, sıcak beyaz, 2,54 mm adım, kırmızı/mavi hat çizgileri
 *   kablo      : Ø1 mm, kırmızı / siyah / mavi / sarı
 *   ampul      : E10 duy, cam balon, görünür flaman, yanınca sıcak ışık
 *
 * Görünüm reçetesi (aynı görünüm için H ve I de bunu izleyebilir)
 *   - Açık temada pozlama ≈ 0,62–0,66; açık renkli plastikler envMapIntensity ≈ 0,55.
 *   - Direnç gövdesi dokuda #D5BB8F çizilir: ışık ve ton eşleme sonrası ekranda #E3D2B0 bejine oturur.
 *   - Cam ve epoksi: transmission yerine glassMat() (düşük taban opaklık + fresnel opaklığı + koyu kenar);
 *     şeffaf arka planda transmission görünmez olur ve fazladan tam ekran geçiş ister.
 *   - Kırmızı LED: koyu kırmızı hacim (arka yüzler, %84) + iç kurşun çerçeve + ince parlak dış kabuk.
 *   - Işıltılar normal karıştırma ile çizilir (paylaşılan şeffaf tuvalde toplamsal karıştırma koyu leke bırakır).
 *   - Elektronlar mavi küreler: tel üzerinde kameraya doğru tel yarıçapı kadar kaydırılır, gizli yollar lift < 0.
 *   - Gölge haritası yalnızca gölge düşüren parçalar hareket ederken yenilenir; gölgelendiriciler ilk karede derlenir.
 */
(function () {
  'use strict';
  var K = window.KGViz, THREE = window.THREE;
  if (!K || !THREE) return;

  var PAL = K.palette;
  var TAU = Math.PI * 2;
  var clamp = K.clamp, lerp = K.lerp, sstep = K.smoothstep, span = K.span, EZ = K.ease;

  /* =====================================================================
   * Small math helpers
   * ===================================================================== */
  /* label classes used only by this file (larger, darker text for the projector) */
  (function () {
    try {
      if (document.getElementById('kg-g-style')) return;
      var st = document.createElement('style');
      st.id = 'kg-g-style';
      st.textContent =
        '.kg-l.lbl-ink{font-size:15px;font-weight:500;color:#1B1B1B;text-shadow:0 0 3px #F5F4EF,0 0 6px #F5F4EF}' +
        '.kg-l.tag2{font-size:14px;font-weight:500;letter-spacing:.01em;color:#15171C;line-height:1.3;white-space:nowrap}' +
        '.kg-l.tag2.chip{padding:4px 9px}' +
        /* clear-reading label sizes for the six visuals of this file (projector, 1120 x 440 focus slides) */
        ['ohm-lab', 'circuit-loop', 'symbols-morph', 'resistor-zoom', 'breadboard-build', 'series-parallel'].map(function (id) {
          var q = '[data-viz="' + id + '"] .kg-l';
          return q + '.name{font-size:19px;font-weight:700}' + q + '.value{font-size:18px;font-weight:600}' + q + '.tag{font-size:13px}';
        }).join('');
      document.head.appendChild(st);
    } catch (e) { /* cosmetic only */ }
  })();
  /* soft fade at the canvas edges so a zoomed-in scene never ends in a hard cut */
  function softEdge(el, pct) {
    var g1 = 'linear-gradient(to right, transparent, #000 ' + pct + '%, #000 ' + (100 - pct) + '%, transparent)';
    var g2 = 'linear-gradient(to bottom, transparent, #000 ' + pct + '%, #000 ' + (100 - pct) + '%, transparent)';
    try {
      el.style.webkitMaskImage = g1 + ', ' + g2; el.style.maskImage = g1 + ', ' + g2;
      el.style.webkitMaskComposite = 'source-in'; el.style.maskComposite = 'intersect';
    } catch (e) { /* cosmetic only */ }
  }
  /* camera distance for the current box: the scene is composed for aspect a0 (680 x 520); in a wide
   * box (1120 x 440) the height limits the fit, so the camera moves in until the objects fill the box */
  function fitDist(v, base, a0, k) {
    var a = (v.w || 680) / Math.max(1, v.h || 520);
    var t = clamp((a - a0) / (2.55 - a0), 0, 1);
    return base * lerp(1, k === undefined ? 0.72 : k, t);
  }
  function approach(cur, target, rate, dt) { return target + (cur - target) * Math.exp(-rate * dt); }
  function v3(x, y, z) { return new THREE.Vector3(x, y, z); }
  function fmt(x, d) { return K.num(x, d); }

  /* =====================================================================
   * Geometry helpers
   * ===================================================================== */
  function expandSharp(prof) {
    var pts = [];
    for (var i = 0; i < prof.length; i++) {
      var p = prof[i];
      if (p[2] && i > 0 && i < prof.length - 1) { pts.push([p[0], p[1], -1]); pts.push([p[0], p[1], 1]); }
      else pts.push([p[0], p[1], 0]);
    }
    return pts;
  }
  function profNormals(pts) {
    var n = pts.length, out = [];
    for (var i = 0; i < n; i++) {
      var a, b;
      if (pts[i][2] === -1) { a = pts[i - 1]; b = pts[i]; }
      else if (pts[i][2] === 1) { a = pts[i]; b = pts[i + 1]; }
      else { a = pts[Math.max(0, i - 1)]; b = pts[Math.min(n - 1, i + 1)]; }
      var dh = b[0] - a[0], dr = b[1] - a[1], L = Math.sqrt(dh * dh + dr * dr) || 1;
      out.push([-dr / L, dh / L]);
    }
    return out;
  }

  /* Lathe around x or y with analytic normals. prof: [[h, r, sharp?], ...] listed so that the
   * outside is on the left of travel (bottom → top). o: {axis, segs, phi0, phiLen, uv:'axial'|'around', h0, h1} */
  function lathe(prof, o) {
    o = o || {};
    var segs = o.segs || 48, axisX = o.axis === 'x';
    var phi0 = o.phi0 || 0, phiLen = o.phiLen === undefined ? TAU : o.phiLen;
    var pts = expandSharp(prof), nr = profNormals(pts), n = pts.length, cols = segs + 1;
    var h0 = o.h0 === undefined ? pts[0][0] : o.h0, h1 = o.h1 === undefined ? pts[n - 1][0] : o.h1;
    var pos = new Float32Array(n * cols * 3), nor = new Float32Array(n * cols * 3), uv = new Float32Array(n * cols * 2);
    for (var i = 0; i < n; i++) {
      var h = pts[i][0], r = pts[i][1], na = nr[i][0], nrr = nr[i][1];
      var ua = clamp((h - h0) / ((h1 - h0) || 1), 0, 1);
      for (var j = 0; j <= segs; j++) {
        var th = phi0 + phiLen * j / segs, c = Math.cos(th), s = Math.sin(th), k = i * cols + j;
        if (axisX) {
          pos[k * 3] = h; pos[k * 3 + 1] = r * c; pos[k * 3 + 2] = r * s;
          nor[k * 3] = na; nor[k * 3 + 1] = nrr * c; nor[k * 3 + 2] = nrr * s;
        } else {
          pos[k * 3] = r * s; pos[k * 3 + 1] = h; pos[k * 3 + 2] = r * c;
          nor[k * 3] = nrr * s; nor[k * 3 + 1] = na; nor[k * 3 + 2] = nrr * c;
        }
        var va = o.uvAbs ? (phi0 + phiLen * j / segs) / TAU : j / segs;
        if (o.uv === 'around') { uv[k * 2] = va; uv[k * 2 + 1] = ua; }
        else { uv[k * 2] = ua; uv[k * 2 + 1] = va; }
      }
    }
    var idx = [];
    for (i = 0; i < n - 1; i++) {
      if (pts[i][2] === -1) continue;
      for (j = 0; j < segs; j++) {
        var a = i * cols + j, b = (i + 1) * cols + j, c2 = i * cols + j + 1, d = (i + 1) * cols + j + 1;
        idx.push(a, c2, b, c2, d, b);
      }
    }
    var g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
    g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    g.setIndex(idx);
    return g;
  }

  /* Rounded box (all edges rounded with radius r), smooth analytic normals, planar UVs per face. */
  function roundBox(w, h, d, r, seg) {
    seg = seg || 3;
    r = Math.max(1e-4, Math.min(r, w / 2 - 1e-4, h / 2 - 1e-4, d / 2 - 1e-4));
    var n = seg * 2 + 1;
    var g = new THREE.BoxGeometry(1, 1, 1, n, n, n);
    var pos = g.attributes.position, nor = g.attributes.normal, uv = g.attributes.uv;
    var bx = w / 2 - r, by = h / 2 - r, bz = d / 2 - r, hs = 0.5 / n, per = (n + 1) * (n + 1);
    var v = new THREE.Vector3();
    for (var i = 0; i < pos.count; i++) {
      var x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
      var sx = x < 0 ? -1 : 1, sy = y < 0 ? -1 : 1, sz = z < 0 ? -1 : 1;
      v.set(x - sx * hs, y - sy * hs, z - sz * hs).normalize();
      var px = bx * sx + v.x * r, py = by * sy + v.y * r, pz = bz * sz + v.z * r;
      pos.setXYZ(i, px, py, pz);
      nor.setXYZ(i, v.x, v.y, v.z);
      var f = Math.floor(i / per);
      if (f < 2) uv.setXY(i, (f === 0 ? -pz : pz) / d + 0.5, py / h + 0.5);
      else if (f < 4) uv.setXY(i, px / w + 0.5, (f === 2 ? -pz : pz) / d + 0.5);
      else uv.setXY(i, (f === 4 ? px : -px) / w + 0.5, py / h + 0.5);
    }
    return g;
  }

  /* Rounded-rectangle loop in the XZ plane: [x, z, nx, nz] */
  function rrLoop(a, b, rc, nc) {
    var cs = [[a - rc, b - rc], [-(a - rc), b - rc], [-(a - rc), -(b - rc)], [a - rc, -(b - rc)]], out = [];
    for (var k = 0; k < 4; k++) for (var i = 0; i <= nc; i++) {
      var ph = (k + i / nc) * Math.PI / 2, c = Math.cos(ph), s = Math.sin(ph);
      out.push([cs[k][0] + rc * c, cs[k][1] + rc * s, c, s]);
    }
    out.push(out[0]);
    return out;
  }
  /* Sweep a profile [[y, dr, sharp?]] (bottom → top) around a rounded rectangle (half sizes a, b; corner rc).
   * u runs around (reads left → right from outside), v by y. Returns geometry and the face spans in u. */
  function sweepRR(a, b, rc, prof, o) {
    o = o || {};
    var nc = o.nc || 8;
    var loop = rrLoop(a, b, rc, nc), m = loop.length;
    var S = [0], j;
    for (j = 1; j < m; j++) S.push(S[j - 1] + Math.hypot(loop[j][0] - loop[j - 1][0], loop[j][1] - loop[j - 1][1]));
    var St = S[m - 1];
    var pts = expandSharp(prof), nr = profNormals(pts), n = pts.length;
    var y0 = o.y0 === undefined ? pts[0][0] : o.y0, y1 = o.y1 === undefined ? pts[n - 1][0] : o.y1;
    var pos = new Float32Array(n * m * 3), nor = new Float32Array(n * m * 3), uv = new Float32Array(n * m * 2);
    for (var i = 0; i < n; i++) {
      var y = pts[i][0], dr = pts[i][1], na = nr[i][0], nrr = nr[i][1];
      for (j = 0; j < m; j++) {
        var L = loop[j], k = i * m + j;
        pos[k * 3] = L[0] + L[2] * dr; pos[k * 3 + 1] = y; pos[k * 3 + 2] = L[1] + L[3] * dr;
        nor[k * 3] = nrr * L[2]; nor[k * 3 + 1] = na; nor[k * 3 + 2] = nrr * L[3];
        uv[k * 2] = 1 - S[j] / St; uv[k * 2 + 1] = clamp((y - y0) / ((y1 - y0) || 1), 0, 1);
      }
    }
    var idx = [];
    for (i = 0; i < n - 1; i++) {
      if (pts[i][2] === -1) continue;
      for (j = 0; j < m - 1; j++) {
        var A = i * m + j, B = (i + 1) * m + j, C = i * m + j + 1, D = (i + 1) * m + j + 1;
        idx.push(A, B, C, B, D, C);
      }
    }
    var g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
    g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    g.setIndex(idx);
    /* face spans in u (front = +z face, right = +x face, ...) */
    var q = Math.PI / 2 * rc, fa = 2 * (a - rc), fb = 2 * (b - rc);
    g.userData.spans = {
      front: [1 - (q + fa) / St, 1 - q / St],
      left: [1 - (2 * q + fa + fb) / St, 1 - (2 * q + fa) / St],
      back: [1 - (3 * q + 2 * fa + fb) / St, 1 - (3 * q + fa + fb) / St],
      perimeter: St
    };
    return g;
  }

  function rrShape(w, h, r) {
    var s = new THREE.Shape(), x0 = -w / 2, y0 = -h / 2, x1 = w / 2, y1 = h / 2;
    r = Math.min(r, w / 2, h / 2);
    s.moveTo(x0 + r, y0);
    s.lineTo(x1 - r, y0); s.absarc(x1 - r, y0 + r, r, -Math.PI / 2, 0, false);
    s.lineTo(x1, y1 - r); s.absarc(x1 - r, y1 - r, r, 0, Math.PI / 2, false);
    s.lineTo(x0 + r, y1); s.absarc(x0 + r, y1 - r, r, Math.PI / 2, Math.PI, false);
    s.lineTo(x0, y0 + r); s.absarc(x0 + r, y0 + r, r, Math.PI, Math.PI * 1.5, false);
    return s;
  }
  /* Flat rounded-rect cap in the XZ plane at height y, facing up (or down). UVs 0..1 over the rect. */
  function rrCap(a, b, rc, y, down) {
    var g = new THREE.ShapeGeometry(rrShape(a * 2, b * 2, rc), 10);
    var uv = g.attributes.uv;
    for (var i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) / (2 * a) + 0.5, uv.getY(i) / (2 * b) + 0.5);
    g.rotateX(down ? Math.PI / 2 : -Math.PI / 2);
    g.translate(0, y, 0);
    return g;
  }

  /* Polyline with rounded corners as a CurvePath (for bent leads and formed jumpers). */
  function roundedPath(pts, rad) {
    var path = new THREE.CurvePath();
    var P = pts.map(function (p) { return p.isVector3 ? p.clone() : v3(p[0], p[1], p[2]); });
    var cur = P[0].clone();
    for (var i = 1; i < P.length - 1; i++) {
      var a = P[i - 1], b = P[i], c = P[i + 1];
      var d1 = b.clone().sub(a), d2 = c.clone().sub(b);
      var l1 = d1.length(), l2 = d2.length();
      var rr = Math.min(rad, l1 * 0.48, l2 * 0.48);
      d1.normalize(); d2.normalize();
      var p1 = b.clone().addScaledVector(d1, -rr), p2 = b.clone().addScaledVector(d2, rr);
      if (cur.distanceTo(p1) > 1e-5) path.add(new THREE.LineCurve3(cur.clone(), p1));
      path.add(new THREE.QuadraticBezierCurve3(p1, b.clone(), p2));
      cur = p2;
    }
    path.add(new THREE.LineCurve3(cur, P[P.length - 1]));
    return path;
  }
  function tubeGeo(path, radius, radial, segs) {
    return new THREE.TubeGeometry(path, segs || Math.max(12, Math.round(path.getLength() * 3)), radius, radial || 10, false);
  }

  /* Merge geometries (position, normal, optional uv) into one non-indexed geometry. */
  function mergeGeos(list) {
    var hasUV = true, total = 0;
    var gs = list.map(function (g) {
      var x = g.index ? g.toNonIndexed() : g;
      if (!x.attributes.normal) x.computeVertexNormals();
      if (!x.attributes.uv) hasUV = false;
      total += x.attributes.position.count;
      return x;
    });
    var pos = new Float32Array(total * 3), nor = new Float32Array(total * 3), uv = hasUV ? new Float32Array(total * 2) : null, o = 0;
    gs.forEach(function (g) {
      pos.set(g.attributes.position.array, o * 3);
      nor.set(g.attributes.normal.array, o * 3);
      if (uv) uv.set(g.attributes.uv.array, o * 2);
      o += g.attributes.position.count;
    });
    var out = new THREE.BufferGeometry();
    out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    out.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
    if (uv) out.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    return out;
  }

  function mesh(geo, mat, cast, recv) {
    var m = new THREE.Mesh(geo, mat);
    m.castShadow = !!cast;
    m.receiveShadow = recv !== false;
    return m;
  }

  /* Canvas textures. Colour maps are sRGB; data maps (roughness/metalness/bump) stay linear. */
  function colorTex(w, h, draw) { return K.textTexture(w, h, draw); }
  function dataTex(w, h, draw) { var t = K.textTexture(w, h, draw); t.encoding = THREE.LinearEncoding; return t; }

  /* Redraws text textures once the webfonts are ready (canvas text drawn earlier may use a fallback). */
  function FontWatch() {
    var list = [], done = false;
    try { if (document.fonts && document.fonts.load) { document.fonts.load('500 20px "IBM Plex Mono"'); document.fonts.load('600 20px "IBM Plex Sans"'); } } catch (e) { /* ignore */ }
    return {
      add: function (tex, draw) { list.push([tex, draw]); return tex; },
      tick: function () {
        if (done) return;
        var ok = true;
        try { ok = !document.fonts || (document.fonts.check('500 20px "IBM Plex Mono"') && document.fonts.check('600 20px "IBM Plex Sans"')); } catch (e) { ok = true; }
        if (!ok) return;
        done = true;
        list.forEach(function (it) {
          var c = it[0].image, ctx = c.getContext('2d');
          ctx.setTransform(1, 0, 0, 1, 0, 0);
          ctx.clearRect(0, 0, c.width, c.height);
          it[1](ctx, c.width, c.height);
          it[0].needsUpdate = true;
        });
      }
    };
  }
  function fontTex(fw, w, h, draw) { return fw.add(colorTex(w, h, draw), draw); }

  /* Clear glass / epoxy that reads on a light slide: low base alpha, fresnel-driven alpha and a
   * soft dark rim at grazing angles (product-photo "black flag" edges), speculars raise alpha. */
  function glassMat(o) {
    o = o || {};
    var m = new THREE.MeshPhysicalMaterial({
      color: o.color === undefined ? 0xffffff : o.color, roughness: o.rough === undefined ? 0.05 : o.rough, metalness: 0,
      transparent: true, opacity: o.opacity === undefined ? 0.12 : o.opacity,
      clearcoat: o.clearcoat === undefined ? 1 : o.clearcoat, clearcoatRoughness: 0.04,
      envMapIntensity: o.env === undefined ? 1.2 : o.env, depthWrite: false,
      emissive: o.emissive === undefined ? 0x000000 : o.emissive, emissiveIntensity: 0,
      side: o.side === undefined ? THREE.FrontSide : o.side
    });
    var U = {
      uFres: { value: o.fres === undefined ? 0.55 : o.fres },
      uSpecA: { value: o.specA === undefined ? 0.6 : o.specA },
      uRim: { value: new THREE.Color(o.rim === undefined ? 0x56606C : o.rim) },
      uRimAmt: { value: o.rimAmt === undefined ? 0.5 : o.rimAmt }
    };
    m.userData.U = U;
    m.onBeforeCompile = function (sh) {
      sh.uniforms.uFres = U.uFres; sh.uniforms.uSpecA = U.uSpecA; sh.uniforms.uRim = U.uRim; sh.uniforms.uRimAmt = U.uRimAmt;
      sh.fragmentShader = 'uniform float uFres;\nuniform float uSpecA;\nuniform vec3 uRim;\nuniform float uRimAmt;\n' +
        sh.fragmentShader.replace('#include <output_fragment>', [
          '#include <output_fragment>',
          '{',
          '  float kgNv = clamp(abs(dot(normalize(normal), normalize(vViewPosition))), 0.0, 1.0);',
          '  float kgF = pow(1.0 - kgNv, 2.6);',
          '  float kgS = clamp(dot(totalSpecular, vec3(0.3333)), 0.0, 1.0);',
          '  gl_FragColor.rgb = mix(gl_FragColor.rgb, uRim, kgF * uRimAmt);',
          '  gl_FragColor.a = clamp(gl_FragColor.a + kgF * uFres + kgS * uSpecA, 0.0, 1.0);',
          '}'
        ].join('\n'));
    };
    m.customProgramCacheKey = function () { return 'kg-g-glass'; };
    return m;
  }

  /* Soft round sprite for light halos (normal blending reads well on light paper). */
  function glowTexture() {
    return colorTex(128, 128, function (ctx, w) {
      var g = ctx.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
      g.addColorStop(0, 'rgba(255,255,255,1)');
      g.addColorStop(0.18, 'rgba(255,255,255,0.62)');
      g.addColorStop(0.45, 'rgba(255,255,255,0.18)');
      g.addColorStop(0.75, 'rgba(255,255,255,0.04)');
      g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, w);
    });
  }
  function glowSprite(tex, color, size, additive) {
    var m = new THREE.SpriteMaterial({
      map: tex, color: color, transparent: true, depthWrite: false, opacity: 0, toneMapped: false,
      blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending
    });
    var s = new THREE.Sprite(m);
    s.scale.set(size, size, 1);
    s.renderOrder = 10;
    return s;
  }

  /* Path lookup table for fast, allocation-free sampling by arc length. */
  function makeLUT(curve, n) {
    n = n || 240;
    var len = curve.getLength(), arr = new Float32Array((n + 1) * 3), tan = new Float32Array((n + 1) * 3);
    var p = new THREE.Vector3(), t = new THREE.Vector3();
    for (var i = 0; i <= n; i++) {
      curve.getPointAt(i / n, p);
      curve.getTangentAt(Math.min(i / n, 1), t);
      arr[i * 3] = p.x; arr[i * 3 + 1] = p.y; arr[i * 3 + 2] = p.z;
      tan[i * 3] = t.x; tan[i * 3 + 1] = t.y; tan[i * 3 + 2] = t.z;
    }
    return {
      len: len, n: n,
      at: function (s, out, loop) {
        var u = loop ? (((s / len) % 1) + 1) % 1 : clamp(s / len, 0, 1);
        var f = u * n, i0 = Math.min(n - 1, Math.floor(f)), k = f - i0;
        out.x = arr[i0 * 3] + (arr[i0 * 3 + 3] - arr[i0 * 3]) * k;
        out.y = arr[i0 * 3 + 1] + (arr[i0 * 3 + 4] - arr[i0 * 3 + 1]) * k;
        out.z = arr[i0 * 3 + 2] + (arr[i0 * 3 + 5] - arr[i0 * 3 + 2]) * k;
        return out;
      },
      tanAt: function (s, out, loop) {
        var u = loop ? (((s / len) % 1) + 1) % 1 : clamp(s / len, 0, 1);
        var i0 = Math.min(n, Math.round(u * n));
        return out.set(tan[i0 * 3], tan[i0 * 3 + 1], tan[i0 * 3 + 2]);
      }
    };
  }

  /* =====================================================================
   * Materials (one set per visual so dispose() stays local)
   * ===================================================================== */
  function Mats() {
    var c = {};
    function g(k, f) { if (!c[k]) c[k] = f(); return c[k]; }
    return {
      tin: function () { return g('tin', function () { return K.mat.tin({ roughness: 0.24, color: 0xD3D6DA }); }); },
      steel: function () { return g('steel', function () { return K.mat.steel({ roughness: 0.3 }); }); },
      nickel: function () { return g('nickel', function () { return K.mat.std(0xC9CCD0, 0.22, 1); }); },
      brass: function () { return g('brass', function () { return K.mat.std(0xCDAE6A, 0.3, 1); }); },
      copper: function () { return g('copper', function () { return K.mat.copper(); }); },
      gold: function () { return g('gold', function () { return K.mat.gold(); }); },
      blackPlastic: function () { return g('bp', function () { return K.mat.std(0x1D1F24, 0.48, 0); }); },
      darkPlastic: function () { return g('dp', function () { return K.mat.std(0x2C2F36, 0.55, 0); }); },
      whitePlastic: function () { return g('wp', function () { return K.mat.plasticWhite({ roughness: 0.5 }); }); },
      insRed: function () { return g('ir', function () { return K.mat.std(0xC0322A, 0.42, 0); }); },
      insBlack: function () { return g('ib', function () { return K.mat.std(0x23252B, 0.45, 0); }); },
      insBlue: function () { return g('iu', function () { return K.mat.std(0x2C55C9, 0.42, 0); }); },
      insYellow: function () { return g('iy', function () { return K.mat.std(0xE6B422, 0.42, 0); }); },
      ink: function () { return g('ink', function () { return K.mat.std(0x15171C, 0.62, 0); }); },
      electron: function () { return g('el', function () { return K.mat.electron(false); }); },
      arrow: function () { return g('arrow', function () { return K.mat.std(0xC8693A, 0.38, 0.2, { emissive: 0x7A3311, emissiveIntensity: 0.35 }); }); },
      shared: c
    };
  }

  /* =====================================================================
   * Component library (mm)
   * ===================================================================== */

  /* ---------- Resistor: IEC 60062 colour code ---------- */
  var BANDS = [
    { n: 'siyah', c: '#1B1B1B' }, { n: 'kahverengi', c: '#6B3A1F' }, { n: 'kırmızı', c: '#C42B1C' },
    { n: 'turuncu', c: '#E07A1F' }, { n: 'sarı', c: '#E8C21A' }, { n: 'yeşil', c: '#2E8B3A' },
    { n: 'mavi', c: '#2A58C7' }, { n: 'mor', c: '#7A3BB0' }, { n: 'gri', c: '#8A8A8A' }, { n: 'beyaz', c: '#F2F2F2' }
  ];
  var GOLD = { n: 'altın', c: '#C9A13B', metal: true };
  var E12 = [10, 12, 15, 18, 22, 27, 33, 39, 47, 56, 68, 82];
  function nearestE12(R) {
    var best = 100, bd = 1e9;
    for (var dec = 1; dec <= 1e5; dec *= 10) for (var i = 0; i < E12.length; i++) {
      var v = E12[i] * dec, d = Math.abs(Math.log(v / R));
      if (d < bd) { bd = d; best = v; }
    }
    return best;
  }
  /* bands for an E12 value >= 10 Ω */
  function bandCode(R) {
    var m = Math.floor(Math.log10(R) + 1e-9) - 1;
    var sig = Math.round(R / Math.pow(10, m));
    var d1 = Math.floor(sig / 10), d2 = sig % 10;
    return { d1: d1, d2: d2, m: m, sig: sig, bands: [BANDS[d1], BANDS[d2], BANDS[m], GOLD] };
  }

  /* body: the standard beige #E3D2B0; the texture uses a slightly deeper tone so the lit, tone-mapped
   * render lands on that beige instead of washing out to cream */
  var RES = { L: 6.3, R: 1.2, Rm: 1.085, lead: 0.3, body: '#D5BB8F' };
  var BAND_POS = [1.02, 1.86, 2.70, 5.22], BAND_W = 0.6;

  function resistorProfile() {
    var L = RES.L, R = RES.R, Rm = RES.Rm, rr = 0.42, lr = RES.lead, i, a;
    var left = [];
    for (i = 0; i <= 5; i++) { a = i / 5 * Math.PI / 2; left.push([-0.5 + 0.44 * Math.sin(a), lr + 0.36 * (1 - Math.cos(a))]); }
    left.push([-0.03, 0.72]);
    for (i = 0; i <= 7; i++) { a = i / 7 * Math.PI / 2; left.push([rr - rr * Math.cos(a), (R - rr) + rr * Math.sin(a)]); }
    var body = [], N = 72;
    for (i = 1; i < N; i++) {
      var h = rr + (L - 2 * rr) * i / N, d = Math.min(h, L - h);
      body.push([h, Rm + (R - Rm) * (1 - sstep(1.15, 2.05, d))]);
    }
    var p = left.concat(body);
    for (i = left.length - 1; i >= 0; i--) p.push([L - left[i][0], left[i][1]]);
    return p;
  }

  /* paints body + bands. bandsA (old) right of the sweep, bandsB (new) left of it. */
  function paintResistor(ctx, W, H, bandsA, bandsB, sweep) {
    ctx.fillStyle = RES.body;
    ctx.fillRect(0, 0, W, H);
    /* lacquer mottling along the body (dip-coated enamel is never perfectly even) */
    var mr = K.rng(77), mx;
    for (mx = 0; mx < W; mx += 2) {
      ctx.fillStyle = mr() < 0.5 ? 'rgba(120,88,46,' + (mr() * 0.05) + ')' : 'rgba(255,244,220,' + (mr() * 0.06) + ')';
      ctx.fillRect(mx, 0, 2 + mr() * 3, H);
    }
    var L = RES.L, sx = sweep * W;
    for (var k = 0; k < 4; k++) {
      var x0 = (BAND_POS[k] - BAND_W / 2) / L * W, x1 = (BAND_POS[k] + BAND_W / 2) / L * W;
      var cA = bandsA[k].c, cB = bandsB[k].c;
      if (sx <= x0) { ctx.fillStyle = cA; ctx.fillRect(x0, 0, x1 - x0, H); }
      else if (sx >= x1) { ctx.fillStyle = cB; ctx.fillRect(x0, 0, x1 - x0, H); }
      else {
        ctx.fillStyle = cB; ctx.fillRect(x0, 0, sx - x0, H);
        ctx.fillStyle = cA; ctx.fillRect(sx, 0, x1 - sx, H);
      }
      /* printed band edges: ink bleeds a little into the lacquer, so the edge is soft and slightly uneven */
      var fe = W / 1024 * 3;
      ctx.fillStyle = RES.body;
      ctx.globalAlpha = 0.45; ctx.fillRect(x0, 0, fe, H); ctx.fillRect(x1 - fe, 0, fe, H);
      ctx.globalAlpha = 0.2; ctx.fillRect(x0 + fe, 0, fe, H); ctx.fillRect(x1 - 2 * fe, 0, fe, H);
      ctx.globalAlpha = 1;
    }
    if (sweep > 0 && sweep < 1) {
      var g = ctx.createLinearGradient(sx - 40, 0, sx + 40, 0);
      g.addColorStop(0, 'rgba(255,255,255,0)');
      g.addColorStop(0.5, 'rgba(255,255,255,0.55)');
      g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g;
      ctx.fillRect(sx - 40, 0, 80, H);
    }
  }
  function paintResistorData(ctx, W, H) {
    /* G = roughness, B = metalness */
    ctx.fillStyle = 'rgb(0,128,0)';
    ctx.fillRect(0, 0, W, H);
    var L = RES.L;
    for (var k = 0; k < 4; k++) {
      var x0 = (BAND_POS[k] - BAND_W / 2) / L * W, x1 = (BAND_POS[k] + BAND_W / 2) / L * W;
      ctx.fillStyle = k === 3 ? 'rgb(0,92,235)' : 'rgb(0,104,0)';
      ctx.fillRect(x0, 0, x1 - x0, H);
    }
  }

  /* Resistor. o: {value, leads:{type:'straight', len} | {type:'bent', span, drop, rise}, segs}
   * Local frame: body along x, centred at the origin. Returns {group, body, setValue(R, animate), update(dt)} */
  function makeResistor(M, o) {
    o = o || {};
    var grp = new THREE.Group();
    var geo = M.shared.resBody || (M.shared.resBody = lathe(resistorProfile(), { axis: 'x', segs: o.segs || 40, h0: 0, h1: RES.L }));
    var cur = bandCode(o.value || 220).bands, next = cur, sweep = 1;
    var tex = colorTex(1024, 8, function (ctx, w, h) { paintResistor(ctx, w, h, cur, cur, 1); });
    tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
    var data = M.shared.resData || (M.shared.resData = dataTex(1024, 8, paintResistorData));
    var mat = new THREE.MeshStandardMaterial({ map: tex, roughnessMap: data, metalnessMap: data, roughness: 1, metalness: 1, envMapIntensity: 0.65 });
    var body = mesh(geo, mat, true, true);
    body.position.x = -RES.L / 2;
    grp.add(body);
    var lt = o.leads || { type: 'straight', len: 10 };
    var leadMat = M.tin(), lr = RES.lead;
    if (lt.type === 'straight') {
      var cg = M.shared['resLead' + lt.len] || (M.shared['resLead' + lt.len] = (function () {
        var len = lt.len, p = [[0, 0], [0, lr * 0.9], [0.05, lr], [len, lr]];
        var gg = lathe(p, { axis: 'x', segs: 14 });
        return gg;
      })());
      var l1 = mesh(cg, leadMat, true), l2 = mesh(cg, leadMat, true);
      l1.position.x = -RES.L / 2 - lt.len - 0.3; l1.rotation.y = 0;
      l1.scale.x = 1;
      // lathe profile starts at h=0 (cut end) and runs to len; place so the cut end is outward
      l1.position.x = -RES.L / 2 - 0.3 - lt.len;
      l2.rotation.y = Math.PI;
      l2.position.x = RES.L / 2 + 0.3 + lt.len;
      grp.add(l1, l2);
    } else {
      /* bent for a board: span = hole distance, drop = depth below body axis to the board surface + insertion */
      var hs = lt.span / 2, dz = lt.drop, br = 0.75;
      var pl = roundedPath([[-RES.L / 2 + 0.2, 0, 0], [-hs, 0, 0], [-hs, -dz, 0]], br);
      var pr = roundedPath([[RES.L / 2 - 0.2, 0, 0], [hs, 0, 0], [hs, -dz, 0]], br);
      grp.add(mesh(tubeGeo(pl, lr, 10, 40), leadMat, true), mesh(tubeGeo(pr, lr, 10, 40), leadMat, true));
    }
    var api = {
      group: grp, body: body, material: mat, value: o.value || 220,
      setValue: function (R, animate) {
        api.value = R;
        var nb = bandCode(R).bands;
        if (!animate) { cur = next = nb; sweep = 1; repaint(); return; }
        cur = mixBands(); next = nb; sweep = 0;
      },
      update: function (dt) {
        if (sweep >= 1) return;
        sweep = Math.min(1, sweep + dt / 0.9);
        repaint();
        if (sweep >= 1) cur = next;
      }
    };
    function mixBands() { return sweep >= 1 ? next : next; }
    function repaint() {
      var c = tex.image, ctx = c.getContext('2d');
      paintResistor(ctx, c.width, c.height, cur, next, EZ.inOut(sweep));
      tex.needsUpdate = true;
    }
    return api;
  }

  /* ---------- 5 mm LED ---------- */
  function ledEpoxyGeo() {
    var prof = [[0, 0], [0, 2.82], [0.07, 2.9], [0.93, 2.9], [1.0, 2.83], [1.0, 2.5, 1], [3.5, 2.5], [6.1, 2.5]];
    for (var i = 1; i <= 18; i++) { var a = i / 18 * Math.PI / 2; prof.push([6.1 + 2.5 * Math.sin(a), 2.5 * Math.cos(a)]); }
    var g = lathe(prof, { axis: 'y', segs: 56 });
    var p = g.attributes.position, n = g.attributes.normal;
    for (var k = 0; k < p.count; k++) {
      if (p.getY(k) <= 1.0005 && p.getX(k) < -2.55) {
        p.setX(k, -2.55);
        if (p.getY(k) > 0.03 && p.getY(k) < 0.97) n.setXYZ(k, -1, 0, 0);
      }
    }
    return g;
  }
  function extrudeXY(pts, depth) {
    var s = new THREE.Shape();
    s.moveTo(pts[0][0], pts[0][1]);
    for (var i = 1; i < pts.length; i++) s.lineTo(pts[i][0], pts[i][1]);
    s.closePath();
    var g = new THREE.ExtrudeGeometry(s, { depth: depth, bevelEnabled: false, curveSegments: 4 });
    g.translate(0, 0, -depth / 2);
    return g;
  }

  /* LED. o: {legA, legC (visible lengths below the flange), tint, glowTex}
   * Local frame: y up, flange bottom at y = 0, anode leg at x = +1.27, cathode (flat side) at x = −1.27. */
  function makeLED(M, o) {
    o = o || {};
    var grp = new THREE.Group();
    var epoxyGeo = M.shared.ledEpoxy || (M.shared.ledEpoxy = ledEpoxyGeo());
    /* Layered epoxy: a deep-red translucent volume (back faces), the lead frame drawn over it,
     * then a thin clear glossy skin (front faces). Reads as saturated red glass on light paper. */
    var tint = o.tint === undefined ? 0x8A1510 : o.tint;
    var volume = glassMat({ color: tint, opacity: 0.84, fres: 0.16, specA: 0.05, rim: 0x4A0806, rimAmt: 0.5, emissive: 0xFF2A14, side: THREE.BackSide, env: 0.35 });
    volume.toneMapped = false;
    var epoxy = glassMat({ color: 0xC8584C, opacity: 0.1, fres: 0.5, specA: 0.8, rim: 0x5A0E0A, rimAmt: 0.6, emissive: 0xFF3A20, env: 1.0 });
    var tintC = new THREE.Color(tint), burntC = new THREE.Color(0x3C1A10);
    var back = mesh(epoxyGeo, volume, false, false);
    back.renderOrder = 4;
    var front = mesh(epoxyGeo, epoxy, false, false);
    front.renderOrder = 6;
    grp.add(back, front);
    /* inner lead frame (drawn between the two epoxy layers) */
    var frameMat = M.shared.ledFrame || (M.shared.ledFrame = K.mat.std(0xC98F86, 0.34, 1, { transparent: true, opacity: 1, depthWrite: true, envMapIntensity: 0.8 }));
    var anvil = mesh(M.shared.ledAnvil || (M.shared.ledAnvil = extrudeXY([[-1.52, -0.05], [-1.02, -0.05], [-1.02, 2.0], [0.42, 3.05], [0.42, 4.05], [-1.78, 4.05], [-1.78, 2.55], [-1.52, 2.2]], 0.5)), frameMat, false);
    var post = mesh(M.shared.ledPost || (M.shared.ledPost = extrudeXY([[1.02, -0.05], [1.52, -0.05], [1.52, 3.55], [1.42, 4.25], [0.76, 4.25], [0.76, 3.95], [1.02, 3.6]], 0.5)), frameMat, false);
    var cup = mesh(M.shared.ledCup || (M.shared.ledCup = lathe([[3.72, 0.0], [3.72, 0.34], [4.38, 0.66], [4.42, 0.7]], { axis: 'y', segs: 24 })), frameMat, false);
    cup.material = frameMat;
    cup.position.x = -0.2;
    var dieMat = new THREE.MeshStandardMaterial({ color: 0x9A3A2C, roughness: 0.4, metalness: 0, emissive: 0xFF2A14, emissiveIntensity: 0, toneMapped: false });
    var die = mesh(M.shared.ledDie || (M.shared.ledDie = new THREE.BoxGeometry(0.32, 0.2, 0.32)), dieMat, false);
    die.position.set(-0.2, 3.84, 0);
    var bondCurve = new THREE.CubicBezierCurve3(v3(-0.2, 3.95, 0), v3(-0.15, 4.75, 0), v3(0.9, 4.85, 0), v3(1.05, 4.25, 0));
    var bond = mesh(M.shared.ledBond || (M.shared.ledBond = new THREE.TubeGeometry(bondCurve, 20, 0.035, 5, false)), M.shared.ledGold || (M.shared.ledGold = K.mat.gold({ transparent: true, opacity: 1 })), false);
    dieMat.transparent = true;
    [anvil, post, cup, die, bond].forEach(function (m) { m.renderOrder = 5; });
    grp.add(anvil, post, cup, die, bond);
    /* legs (square 0.5 mm in reality; drawn as fine rounded bars) */
    var legA = o.legA === undefined ? 27 : o.legA, legC = o.legC === undefined ? 25 : o.legC;
    var legMat = M.tin();
    var legGeoA = new THREE.CylinderGeometry(0.27, 0.27, legA, 8, 1, false);
    legGeoA.translate(0, -legA / 2, 0);
    var legGeoC = new THREE.CylinderGeometry(0.27, 0.27, legC, 8, 1, false);
    legGeoC.translate(0, -legC / 2, 0);
    var la = mesh(legGeoA, legMat, true), lc = mesh(legGeoC, legMat, true);
    la.position.x = 1.27; lc.position.x = -1.27;
    grp.add(la, lc);
    /* light */
    var halo = o.glowTex ? glowSprite(o.glowTex, 0xFF3B22, 16, false) : null;
    if (halo) { halo.position.set(0, 5.4, 0); halo.renderOrder = 3; grp.add(halo); }
    var core = o.glowTex ? glowSprite(o.glowTex, 0xFFC2A6, 3.2, false) : null;
    if (core) { core.position.set(-0.2, 4.0, 0); core.renderOrder = 7; grp.add(core); }
    var api = {
      group: grp, legA: la, legC: lc, epoxy: epoxy, die: dieMat, halo: halo, level: 0, burnt: 0, flash: 0,
      /* level 0..1 brightness; burnt 0..1 (dark brown die); flash 0..1 (over-current flash) */
      set: function (level, burnt, flash) {
        level = clamp(level, 0, 1); burnt = clamp(burnt || 0, 0, 1); flash = clamp(flash || 0, 0, 1);
        api.level = level; api.burnt = burnt; api.flash = flash;
        var lit = level * (1 - burnt);
        dieMat.emissiveIntensity = lit * 3.2 + flash * 6;
        dieMat.emissive.setRGB(1, 0.16 + flash * 0.75, 0.08 + flash * 0.7);
        dieMat.color.setRGB(lerp(0.6, 0.16, burnt), lerp(0.23, 0.09, burnt), lerp(0.17, 0.05, burnt));
        epoxy.emissiveIntensity = lit * 0.12 + flash * 1.0;
        epoxy.emissive.setRGB(1, 0.12 + flash * 0.7, 0.06 + flash * 0.6);
        epoxy.userData.U.uRimAmt.value = 0.6 * (1 - lit * 0.6);
        volume.emissiveIntensity = lit * 0.95 + flash * 1.4;
        volume.emissive.setRGB(1, 0.07 + flash * 0.7, 0.03 + flash * 0.6);
        volume.userData.U.uRimAmt.value = 0.5 * (1 - lit * 0.5);
        volume.color.copy(tintC).lerp(burntC, burnt * 0.55);
        if (halo) {
          halo.material.opacity = Math.min(1, lit * 0.55 + flash * 0.9);
          halo.material.color.setRGB(1, 0.16 + flash * 0.65, 0.1 + flash * 0.6);
          var s = 15 + lit * 7 + flash * 18;
          halo.scale.set(s, s, 1);
        }
        if (core) {
          core.material.opacity = Math.min(1, lit * 0.85 + flash);
          var c = 2.6 + lit * 1.6 + flash * 6;
          core.scale.set(c, c, 1);
        }
      }
    };
    api.set(0, 0, 0);
    return api;
  }

  /* ---------- 9 V battery (6LR61) ---------- */
  var B9 = { W: 26.5, D: 17.5, Hc: 45.6, rc: 2.0, pitch: 12.7 };
  function paint9VLabel(spans, side) {
    return function (ctx, W, H) {
      if (side) { paint9VSide(ctx, W, H, spans, side === 'flip'); return; }
      ctx.fillStyle = '#2A2D34';
      ctx.fillRect(0, 0, W, H);
      /* fine vertical brushed texture */
      for (var i = 0; i < W; i += 3) { ctx.fillStyle = 'rgba(255,255,255,' + (0.012 + 0.012 * ((i * 7919) % 13) / 13) + ')'; ctx.fillRect(i, 0, 1, H); }
      ctx.fillStyle = '#C8693A';
      ctx.fillRect(0, H * 0.135, W, H * 0.014);
      ctx.fillStyle = 'rgba(200,105,58,0.55)';
      ctx.fillRect(0, H * 0.87, W, H * 0.008);
      var f = spans.front, cx = (f[0] + f[1]) / 2 * W, fw = (f[1] - f[0]) * W;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'alphabetic';
      ctx.fillStyle = '#F3F1EA';
      ctx.font = '600 ' + Math.round(H * 0.30) + 'px "IBM Plex Sans", "Segoe UI", sans-serif';
      ctx.fillText('9 V', cx, H * 0.6);
      ctx.fillStyle = '#AEB4BF';
      ctx.font = '500 ' + Math.round(H * 0.055) + 'px "IBM Plex Mono", Consolas, monospace';
      ctx.fillText('ALKALİN · 6LR61', cx, H * 0.75);
      /* polarity marks above each terminal (front face: + at world +x, − at −x) */
      var halfFlat = B9.W / 2 - B9.rc;
      function ux(x) { return (f[0] + (x + halfFlat) / (2 * halfFlat) * (f[1] - f[0])) * W; }
      ctx.font = '600 ' + Math.round(H * 0.075) + 'px "IBM Plex Sans", sans-serif';
      ctx.fillStyle = '#E39A6C';
      ctx.fillText('+', ux(B9.pitch / 2), H * 0.105);
      ctx.fillStyle = '#C9CFDA';
      ctx.fillText('−', ux(-B9.pitch / 2), H * 0.105);
      /* back face: small print */
      var b = spans.back, bx = (b[0] + b[1]) / 2 * W;
      ctx.fillStyle = '#9AA3B2';
      ctx.font = '500 ' + Math.round(H * 0.05) + 'px "IBM Plex Mono", monospace';
      ctx.fillText('9 V ⎓', bx, H * 0.42);
      ctx.fillText('6LR61', bx, H * 0.5);
      ctx.fillText('IEC 60086', bx, H * 0.58);
      void fw;
    };
  }
  /* Label variant for a battery lying on its back: text runs along the length (reads from the + / − end side). */
  function paint9VSide(ctx, W, H, spans, flip) {
    var RT = flip ? Math.PI / 2 : -Math.PI / 2;
    ctx.fillStyle = '#2A2D34';
    ctx.fillRect(0, 0, W, H);
    for (var i = 0; i < W; i += 3) { ctx.fillStyle = 'rgba(255,255,255,' + (0.012 + 0.012 * ((i * 7919) % 13) / 13) + ')'; ctx.fillRect(i, 0, 1, H); }
    ctx.fillStyle = '#C8693A';
    ctx.fillRect(0, H * 0.135, W, H * 0.014);
    ctx.fillStyle = 'rgba(200,105,58,0.55)';
    ctx.fillRect(0, H * 0.87, W, H * 0.008);
    var f = spans.front, cx = (f[0] + f[1]) / 2 * W, fw = (f[1] - f[0]) * W;
    ctx.save();
    ctx.translate(cx, H * 0.5);
    ctx.rotate(RT);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#F3F1EA';
    ctx.font = '600 ' + Math.round(fw * 0.5) + 'px "IBM Plex Sans", "Segoe UI", sans-serif';
    ctx.fillText('9 V', -H * 0.02, -fw * 0.07);
    ctx.fillStyle = '#AEB4BF';
    ctx.font = '500 ' + Math.round(fw * 0.13) + 'px "IBM Plex Mono", Consolas, monospace';
    ctx.fillText('ALKALİN · 6LR61', -H * 0.02, fw * 0.3);
    ctx.restore();
    var halfFlat = B9.W / 2 - B9.rc;
    function ux(x) { return (f[0] + (x + halfFlat) / (2 * halfFlat) * (f[1] - f[0])) * W; }
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '600 ' + Math.round(H * 0.07) + 'px "IBM Plex Sans", sans-serif';
    ctx.save(); ctx.translate(ux(B9.pitch / 2), H * 0.075); ctx.rotate(RT); ctx.fillStyle = '#E39A6C'; ctx.fillText('+', 0, 0); ctx.restore();
    ctx.save(); ctx.translate(ux(-B9.pitch / 2), H * 0.075); ctx.rotate(RT); ctx.fillStyle = '#C9CFDA'; ctx.fillText('−', 0, 0); ctx.restore();
  }

  /* 9 V battery standing upright, base at y = 0, terminals on top (+ at x = +6.35, − at x = −6.35).
   * o.side: label text runs along the length (for a battery lying on its back). */
  function make9V(M, fw, o) {
    o = o || {};
    var grp = new THREE.Group();
    var a = B9.W / 2, b = B9.D / 2, rc = B9.rc, Hc = B9.Hc;
    var can = sweepRR(a, b, rc, [[0, -0.95], [0.08, -0.55], [0.35, -0.12], [0.8, 0], [Hc - 0.9, 0], [Hc - 0.35, -0.14], [Hc - 0.06, -0.6], [Hc, -0.95]], { nc: 8 });
    var canMat = M.nickel();
    grp.add(mesh(can, canMat, true));
    grp.add(mesh(rrCap(a - 0.95, b - 0.95, rc - 0.95, 0.0, true), canMat, false));
    /* printed shrink label */
    var lab = sweepRR(a, b, rc, [[1.25, -0.2], [1.5, 0.02], [1.8, 0.07], [Hc - 2.1, 0.07], [Hc - 1.8, 0.02], [Hc - 1.55, -0.2]], { nc: 8, y0: 1.8, y1: Hc - 2.1 });
    var spans = lab.userData.spans;
    var labTex = fontTex(fw, 1024, 512, paint9VLabel(spans, o.side));
    grp.add(mesh(lab, new THREE.MeshStandardMaterial({ map: labTex, roughness: 0.42, metalness: 0.05, envMapIntensity: 0.8 }), true));
    /* dark insulating top with the crimped rim */
    var topY = Hc - 0.95 * 0;
    var top = mesh(rrCap(a - 0.95, b - 0.95, rc - 0.95, Hc, false), M.blackPlastic(), false);
    grp.add(top);
    /* + stud (round) */
    var plus = lathe([[0, 3.3], [0.12, 3.3], [0.2, 2.45], [1.05, 2.35], [1.45, 2.78], [2.05, 2.8], [2.35, 2.55], [2.5, 2.0], [2.55, 0]], { axis: 'y', segs: 36 });
    var pm = mesh(plus, M.nickel(), true);
    pm.position.set(B9.pitch / 2, Hc, 0);
    grp.add(pm);
    /* − socket (hexagonal outer, split petals) */
    var hex = new THREE.Shape(), R6 = 4.15;
    for (var i = 0; i < 6; i++) { var ang = Math.PI / 6 + i * Math.PI / 3; if (i === 0) hex.moveTo(R6 * Math.cos(ang), R6 * Math.sin(ang)); else hex.lineTo(R6 * Math.cos(ang), R6 * Math.sin(ang)); }
    hex.closePath();
    var hole = new THREE.Path(); hole.absarc(0, 0, 2.75, 0, TAU, true);
    hex.holes.push(hole);
    var hg = new THREE.ExtrudeGeometry(hex, { depth: 2.3, bevelEnabled: true, bevelThickness: 0.2, bevelSize: 0.18, bevelSegments: 2, curveSegments: 20 });
    hg.rotateX(-Math.PI / 2);
    var mm = mesh(hg, M.nickel(), true);
    mm.position.set(-B9.pitch / 2, Hc + 0.2, 0);
    grp.add(mm);
    /* six petal slits of the − socket, merged into one mesh */
    var slits = M.shared.slits || (M.shared.slits = (function () {
      var parts = [];
      for (var k = 0; k < 6; k++) {
        var b = new THREE.BoxGeometry(1.6, 1.4, 0.32), a2 = k * Math.PI / 3;
        b.rotateY(a2);
        b.translate(Math.cos(a2) * 3.45, 0, -Math.sin(a2) * 3.45);
        parts.push(b);
      }
      return mergeGeos(parts);
    })());
    var sl = mesh(slits, M.blackPlastic(), false);
    sl.position.set(-B9.pitch / 2, Hc + 2.2, 0);
    grp.add(sl);
    void topY;
    return { group: grp, plusTop: v3(B9.pitch / 2, Hc + 2.6, 0), minusTop: v3(-B9.pitch / 2, Hc + 2.6, 0), height: Hc + 2.6 };
  }

  /* ---------- miniature bulb (E10) ---------- */
  function bulbGlassGeo() {
    var p = [[8.4, 3.2], [9.6, 3.28], [10.6, 3.32], [11.7, 3.42], [12.7, 3.68], [13.5, 4.02]];
    var cy = 17.7, R = 5.6;
    var a0 = Math.asin((13.9 - cy) / R);
    for (var i = 0; i <= 26; i++) { var a = a0 + (Math.PI / 2 - a0) * i / 26; p.push([cy + R * Math.sin(a), R * Math.cos(a)]); }
    return lathe(p, { axis: 'y', segs: 48 });
  }
  function bulbBaseGeo() {
    var p = [[-0.55, 0], [-0.5, 0.9], [-0.25, 1.3], [0, 1.4], [0.05, 2.3], [0.7, 2.7], [0.85, 3.6]];
    var pitch = 1.814;
    for (var y = 1.0; y <= 9.2; y += 0.15) {
      var ph = Math.sin((y - 1.0) / pitch * TAU);
      p.push([y, 4.6 + 0.2 * (ph > 0 ? Math.pow(ph, 0.7) : -Math.pow(-ph, 1.3))]);
    }
    p.push([9.5, 4.6]); p.push([9.75, 4.2]); p.push([9.8, 3.35]);
    return lathe(p, { axis: 'y', segs: 32 });
  }
  /* Bulb standing on its base contact at y = 0. Returns {group, set(level 0..1, warmth 0..1)} */
  function makeBulb(M, o) {
    o = o || {};
    var grp = new THREE.Group();
    var base = mesh(M.shared.bulbBase || (M.shared.bulbBase = bulbBaseGeo()), M.nickel(), true);
    grp.add(base);
    var ins = mesh(M.shared.bulbIns || (M.shared.bulbIns = lathe([[-0.05, 1.5], [0.3, 2.9], [0.95, 3.7]], { axis: 'y', segs: 24 })), M.blackPlastic(), false);
    grp.add(ins);
    var tip = mesh(M.shared.bulbTip || (M.shared.bulbTip = lathe([[-0.75, 0], [-0.7, 0.5], [-0.5, 1.05], [-0.05, 1.45]], { axis: 'y', segs: 20 })), M.tin(), false);
    grp.add(tip);
    /* glass */
    var gm = glassMat({ color: 0xF4F6F8, opacity: 0.08, fres: 0.6, specA: 0.7, rim: 0x4E5864, rimAmt: 0.55, emissive: 0xFFC46B, env: 1.3 });
    var gGeo = M.shared.bulbGlass || (M.shared.bulbGlass = bulbGlassGeo());
    var gBack = mesh(gGeo, glassMat({ color: 0xF4F6F8, opacity: 0.05, fres: 0.3, specA: 0.3, rim: 0x4E5864, rimAmt: 0.3, emissive: 0xFFC46B, side: THREE.BackSide, env: 1.0 }), false, false);
    gBack.renderOrder = 4;
    var gFront = mesh(gGeo, gm, false, false);
    gFront.renderOrder = 5;
    grp.add(gBack, gFront);
    /* glass stem (pinch) and lead-in wires */
    var stem = mesh(M.shared.bulbStem || (M.shared.bulbStem = lathe([[9.0, 1.9], [11.6, 1.6], [12.9, 1.15], [13.4, 0.75], [13.55, 0]], { axis: 'y', segs: 20 })), new THREE.MeshPhysicalMaterial({ color: 0xE9EEF0, roughness: 0.25, transparent: true, opacity: 0.55, depthWrite: false }), false);
    stem.renderOrder = 3;
    grp.add(stem);
    var wireMat = M.shared.bulbWire || (M.shared.bulbWire = K.mat.std(0x9EA3AA, 0.35, 1));
    var leadIns = M.shared.bulbLeadIns || (M.shared.bulbLeadIns = mergeGeos([-1, 1].map(function (s) {
      var c = new THREE.CatmullRomCurve3([v3(s * 0.55, 10.5, 0), v3(s * 0.62, 12.6, 0), v3(s * 1.15, 15.4, 0), v3(s * 1.45, 17.5, 0)]);
      return new THREE.TubeGeometry(c, 16, 0.11, 6, false);
    })));
    grp.add(mesh(leadIns, wireMat, false));
    /* coiled tungsten filament */
    var pts = [], turns = 11, Lf = 2.5, rf = 0.26;
    for (var i = 0; i <= 220; i++) {
      var t = i / 220, ang = t * turns * TAU;
      pts.push(v3(-Lf / 2 + Lf * t, 17.55 + rf * Math.cos(ang), rf * Math.sin(ang)));
    }
    pts.unshift(v3(-1.45, 17.5, 0)); pts.push(v3(1.45, 17.5, 0));
    var filMat = new THREE.MeshStandardMaterial({ color: 0x5E5A56, roughness: 0.45, metalness: 0.6, emissive: 0xFFD08A, emissiveIntensity: 0, toneMapped: false });
    var fil = mesh(M.shared.filGeo || (M.shared.filGeo = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 300, 0.055, 5, false)), filMat, false);
    grp.add(fil);
    var halo = o.glowTex ? glowSprite(o.glowTex, 0xF2C46B, 34, false) : null;
    if (halo) { halo.position.set(0, 17.6, 0); grp.add(halo); }
    var light = null;
    if (o.light) {
      light = new THREE.PointLight(0xFFC27A, 0, o.lightDist || 120, 2);
      light.position.set(0, 17.6, 0);
      grp.add(light);
    }
    var api = {
      group: grp, glass: gm, filament: filMat, halo: halo, light: light, level: 0,
      /* level 0..1: 0 off, 0.4 dim orange, 1 full warm white */
      set: function (level) {
        level = clamp(level, 0, 1);
        api.level = level;
        var hot = sstep(0.05, 1, level);
        filMat.emissiveIntensity = level > 0.01 ? 0.6 + hot * 3.4 : 0;
        filMat.emissive.setRGB(1, lerp(0.42, 0.86, hot), lerp(0.12, 0.62, hot));
        gm.emissiveIntensity = level * (o.boost ? 0.55 : 0.22);
        gBack.material.emissiveIntensity = level * 0.18;
        if (halo) {
          halo.material.opacity = o.boost ? Math.min(1, level * 1.1) : Math.min(0.9, level * 0.85);
          halo.material.color.setRGB(1, lerp(0.52, 0.84, hot), lerp(0.18, 0.52, hot));
          var s = o.boost ? 22 + level * 44 : 20 + level * 26;
          halo.scale.set(s, s, 1);
        }
        if (light) light.intensity = level * (o.lightMax || 1.6);
      }
    };
    api.set(0);
    return api;
  }

  /* Performance helpers.
   * - The key light's shadow map is re-rendered only while something that casts a shadow moves:
   *   frame() passes a motion signature; a change triggers one shadow update.
   * - On the first frame (slide activation) every shader of the scene is compiled at once, including parts
   *   that appear later, so nothing stalls mid-animation; slides that are never shown cost nothing. */
  function Prep(v) {
    var sh = v.lights && v.lights.key ? v.lights.key.shadow : null, last = NaN, quiet = 0, warm = false;
    if (sh) { sh.autoUpdate = false; sh.needsUpdate = true; }
    return {
      track: function (sig) {
        if (!warm) {
          warm = true;
          try { var r = K.renderer(); if (r) r.compile(v.scene, v.camera); } catch (e) { /* compile lazily instead */ }
        }
        if (!sh) return;
        if (sig !== last) { last = sig; quiet = 0; sh.needsUpdate = true; }
        else if (quiet < 2) { quiet++; sh.needsUpdate = true; }   /* settle one more frame after motion stops */
      },
      force: function () { if (sh) sh.needsUpdate = true; last = NaN; }
    };
  }

  /* v.label wrapper: show() takes any truthy value (the core treats only `false` as hidden). */
  function lbl(v, text, o) {
    var L = v.label(text, o), sh = L.show;
    L.show = function (b) { return sh(!!b); };
    return L;
  }

  /* Fixed corner tag in the visual's label layer (same .kg-l styling as v.label). pos: 'bl' | 'br' | 'tl' | 'tr' */
  function cornerTag(v, text, pos, cls) {
    var layer = v.el.querySelector('.kg-labels') || v.el;
    var d = document.createElement('div');
    d.className = 'kg-l ' + (cls || 'tag');
    d.textContent = text;
    layer.appendChild(d);
    var api = {
      el: d, visible: true,
      set: function (tx) { if (d.textContent !== tx) d.textContent = tx; return api; },
      show: function (b) {
        b = b !== false;
        if (b !== api.visible) { api.visible = b; d.classList.toggle('hide', !b); }
        if (b) {
          var bw = d.offsetWidth, bh = d.offsetHeight;
          var x = pos.charAt(1) === 'r' ? v.w - bw - 14 : 14, y = pos.charAt(0) === 'b' ? v.h - bh - 12 : 12;
          d.style.transform = 'translate(' + Math.round(x) + 'px,' + Math.round(y) + 'px)';
        }
        return api;
      }
    };
    return api;
  }

  /* ---------- battery snap (sits on the 9 V terminals; battery-local coordinates) ---------- */
  /* T-type snap: moulded cap over the terminals, both leads leave from its +x end (toward the circuit). */
  function makeSnap(M) {
    var g = new THREE.Group(), y0 = B9.Hc + 1.1, h = 8.0;
    var body = mesh(roundBox(25.8, h, 15.8, 2.6, 3), M.blackPlastic(), true);
    body.position.y = y0 + h / 2;
    g.add(body);
    var relief = mesh(M.shared.snapRelief || (M.shared.snapRelief = roundBox(3.2, 4.2, 8.6, 1.5, 2)), M.blackPlastic(), false);
    relief.position.set(12.9 + 1.2, y0 + h / 2, 0);
    g.add(relief);
    return { group: g, exitX: 12.9 + 2.6, exitY: y0 + h / 2, exitZ: 2.2 };
  }

  /* ---------- wires ---------- */
  /* Pre-formed breadboard jumper between two holes (world coordinates on a board whose top is at y = top).
   * Insulation Ø1 mm, bare tinned tips into the holes. */
  function makeJumper(M, xa, za, xb, zb, top, insMat, o) {
    o = o || {};
    var g = new THREE.Group(), hgt = top + (o.height || 1.35), dep = top - 5;
    var full = roundedPath([[xa, dep, za], [xa, hgt, za], [xb, hgt, zb], [xb, dep, zb]], 1.0);
    var ins = roundedPath([[xa, top + 0.45, za], [xa, hgt, za], [xb, hgt, zb], [xb, top + 0.45, zb]], 1.0);
    g.add(mesh(tubeGeo(full, 0.3, 8, 60), M.tin(), false));
    g.add(mesh(tubeGeo(ins, 0.5, 12, 70), insMat, true));
    /* electron path: down into hole a ... out of hole b (reversed when needed) */
    g.userData.path = full;
    return g;
  }
  /* Flexible stranded wire (battery snap lead) through control points pts, ending in a board hole at (xh, top, zh). */
  function makeLead(M, pts, xh, zh, top, insMat) {
    var all = pts.map(function (p) { return p.clone(); });
    all.push(v3(xh, top + 4.2, zh), v3(xh, top + 0.75, zh));
    var curve = new THREE.CatmullRomCurve3(all, false, 'centripetal');
    var g = new THREE.Group();
    g.add(mesh(new THREE.TubeGeometry(curve, 90, 0.68, 12, false), insMat, true));
    var tip = new THREE.LineCurve3(v3(xh, top + 1.2, zh), v3(xh, top - 5, zh));
    g.add(mesh(new THREE.TubeGeometry(tip, 4, 0.36, 8, false), M.tin(), false));
    g.userData.curve = curve;
    g.userData.tip = tip;
    return g;
  }

  /* ---------- electron path: concatenated segments, uniform arc-length table with a per-point lift ---------- */
  function PathLUT(segs, step) {
    step = step || 0.4;
    var raw = [], lifts = [];
    segs.forEach(function (sg, k) {
      var c = sg.curve, len = c.getLength(), n = Math.max(2, Math.ceil(len / (step * 0.5)));
      for (var i = (k === 0 ? 0 : 1); i <= n; i++) { raw.push(c.getPointAt(i / n)); lifts.push(sg.lift || 0); }
    });
    var cum = [0], i;
    for (i = 1; i < raw.length; i++) cum.push(cum[i - 1] + raw[i].distanceTo(raw[i - 1]));
    var total = cum[cum.length - 1], N = Math.max(2, Math.ceil(total / step));
    var arr = new Float32Array((N + 1) * 4), j = 0;
    for (i = 0; i <= N; i++) {
      var s = total * i / N;
      while (j < cum.length - 2 && cum[j + 1] < s) j++;
      var k = clamp((s - cum[j]) / ((cum[j + 1] - cum[j]) || 1), 0, 1);
      arr[i * 4] = lerp(raw[j].x, raw[j + 1].x, k);
      arr[i * 4 + 1] = lerp(raw[j].y, raw[j + 1].y, k);
      arr[i * 4 + 2] = lerp(raw[j].z, raw[j + 1].z, k);
      arr[i * 4 + 3] = lerp(lifts[j], lifts[j + 1], k);
    }
    return {
      len: total,
      /* writes the point into out and returns the lift */
      at: function (s, out) {
        var u = ((s % total) + total) % total / total * N, i0 = Math.min(N - 1, Math.floor(u)), f = u - i0, b = i0 * 4;
        out.x = arr[b] + (arr[b + 4] - arr[b]) * f;
        out.y = arr[b + 1] + (arr[b + 5] - arr[b + 1]) * f;
        out.z = arr[b + 2] + (arr[b + 6] - arr[b + 2]) * f;
        return arr[b + 3] + (arr[b + 7] - arr[b + 3]) * f;
      }
    };
  }
  /* Electron dots along a LUT. Dots are pushed toward the camera by the local lift so they ride on
   * the visible side of the conductor. hidden(s) may return true to hide a dot (e.g. inside a battery). */
  function Dots(v, M, n, radius) {
    var inst = K.instanced(n, { radius: radius, material: M.electron(), detail: 1 });
    inst.renderOrder = 2;
    v.scene.add(inst);
    var p = new THREE.Vector3(), d = new THREE.Vector3();
    /* Each carrier gets its own fixed random character so the stream reads as a crowd of charged
     * particles that jostle and collide while drifting, not as evenly strung beads:
     *   jit  : static spacing error (fraction of the spacing)
     *   amp/w/ph : bounded speed fluctuation (kicks and slow-downs from collisions with the lattice)
     *   lat  : lateral thermal wobble direction and size
     *   sz   : size variation */
    function h01(i, k) { var x = Math.sin((i + 1) * 12.9898 + k * 78.233) * 43758.5453; return x - Math.floor(x); }
    var R = [];
    for (var q = 0; q < n; q++) {
      R.push({
        jit: (h01(q, 1) - 0.5) * 0.7, amp: 0.18 + h01(q, 2) * 0.32, w: 0.35 + h01(q, 3) * 0.55, ph: h01(q, 4) * TAU,
        lx: h01(q, 5) - 0.5, ly: h01(q, 6) - 0.5, lz: h01(q, 7) - 0.5, lw: 0.9 + h01(q, 8) * 1.4, lp: h01(q, 9) * TAU,
        sz: 0.82 + h01(q, 10) * 0.36
      });
    }
    return {
      mesh: inst,
      /* offset in mm along the path, spacing in mm, scaleFn(s, i) → scale (0 hides) */
      update: function (lut, offset, spacing, scaleFn, count) {
        var cam = v.camera.position, m = count === undefined ? n : Math.min(n, count);
        for (var i = 0; i < n; i++) {
          if (i >= m) { inst.hideAt(i); continue; }
          var r = R[i];
          var s = offset + i * spacing + spacing * (r.jit + r.amp * Math.sin(offset * r.w / spacing * 0.9 + r.ph));
          var lift = lut.at(s, p);
          if (lift < -0.01) { inst.hideAt(i); continue; }
          var sc = scaleFn ? scaleFn(((s % lut.len) + lut.len) % lut.len, i) : 1;
          if (sc <= 0.001) { inst.hideAt(i); continue; }
          d.copy(cam).sub(p).normalize();
          var th = Math.sin(offset * r.lw / spacing * 1.6 + r.lp) * radius * 0.55;
          inst.setAt(i, p.x + d.x * lift + r.lx * th * 1.6, p.y + d.y * lift + r.ly * th * 1.6, p.z + d.z * lift + r.lz * th * 1.6, sc * r.sz);
        }
        inst.commit();
      },
      hide: function () { for (var i = 0; i < n; i++) inst.hideAt(i); inst.commit(); }
    };
  }

  /* ---------- half-size breadboard (82 × 55 mm, 400 holes) ---------- */
  var BB = { W: 82, D: 55, H: 8.5, P: 2.54, rc: 2.2, ins: 0.55 };
  var ROWZ = { a: 13.97, b: 11.43, c: 8.89, d: 6.35, e: 3.81, f: -3.81, g: -6.35, h: -8.89, i: -11.43, j: -13.97 };
  /* rails: outer rows are +, inner rows are − (front = +z) */
  var RAILZ = { fp: 24.13, fm: 21.59, bp: -24.13, bm: -21.59 };
  var RAIL_COLS = [2, 3, 4, 5, 6, 8, 9, 10, 11, 12, 14, 15, 16, 17, 18, 20, 21, 22, 23, 24, 26, 27, 28, 29, 30];
  function colX(c) { return (c - 15.5) * BB.P; }
  function rowZ(r) { return ROWZ[r] !== undefined ? ROWZ[r] : RAILZ[r]; }

  function paintBoardTop(ctx, W, Hh) {
    var a = BB.W / 2, b = BB.D / 2, k = W / BB.W;
    function X(x) { return (x + a) * k; }
    function Z(z) { return (z + b) * k; }
    ctx.fillStyle = '#F2EFE7';
    ctx.fillRect(0, 0, W, Hh);
    var rng = K.rng(11);
    for (var i = 0; i < 2600; i++) {
      ctx.fillStyle = 'rgba(90,80,60,' + (0.008 + rng() * 0.018) + ')';
      ctx.fillRect(rng() * W, rng() * Hh, 1 + rng() * 3, 1 + rng() * 3);
    }
    function line(z, col) { ctx.fillStyle = col; ctx.fillRect(X(-37.4), Z(z) - 0.21 * k, 74.8 * k, 0.42 * k); }
    line(26.0, '#D0392B'); line(19.75, '#2B57C8'); line(-26.0, '#D0392B'); line(-19.75, '#2B57C8');
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '600 ' + Math.round(2.3 * k) + 'px "IBM Plex Sans", "Segoe UI", sans-serif';
    [[RAILZ.fp, '+', '#D0392B'], [RAILZ.fm, '−', '#2B57C8'], [RAILZ.bp, '+', '#D0392B'], [RAILZ.bm, '−', '#2B57C8']].forEach(function (r) {
      ctx.fillStyle = r[2];
      ctx.fillText(r[1], X(-37.0), Z(r[0]));
      ctx.fillText(r[1], X(39.3), Z(r[0]));
    });
    ctx.fillStyle = '#9C998F';
    ctx.font = '500 ' + Math.round(1.5 * k) + 'px "IBM Plex Mono", Consolas, monospace';
    'abcdefghij'.split('').forEach(function (r) { ctx.fillText(r, X(-39.3), Z(ROWZ[r])); ctx.fillText(r, X(39.3), Z(ROWZ[r])); });
    [1, 5, 10, 15, 20, 25, 30].forEach(function (c) { ctx.fillText(String(c), X(colX(c)), Z(16.6)); ctx.fillText(String(c), X(colX(c)), Z(-16.6)); });
  }

  function funnelGeo() {
    /* rings: [y, half size, brightness] from the surface down */
    var R = [[0, 0.77, 0.95], [-0.48, 0.44, 0.8], [-0.9, 0.44, 0.34], [-2.3, 0.44, 0.09]];
    var pos = [], nor = [], col = [];
    var inward = [[0, 0, 1], [-1, 0, 0], [0, 0, -1], [1, 0, 0]];
    function corner(r, i) { var h = r[1], c = [[-h, -h], [h, -h], [h, h], [-h, h]][i]; return [c[0], r[0], c[1]]; }
    function push(p, n, b) { pos.push(p[0], p[1], p[2]); nor.push(n[0], n[1], n[2]); col.push(b * 0.98, b * 0.965, b * 0.93); }
    for (var r = 0; r < R.length - 1; r++) {
      var A = R[r], B = R[r + 1], dy = A[0] - B[0], dh = A[1] - B[1], L = Math.hypot(dy, dh);
      var ny = dh / L, ni = dy / L;
      for (var s = 0; s < 4; s++) {
        var n = [inward[s][0] * ni, ny, inward[s][2] * ni];
        var a0 = corner(A, s), a1 = corner(A, (s + 1) % 4), b0 = corner(B, s), b1 = corner(B, (s + 1) % 4);
        push(a0, n, A[2]); push(b0, n, B[2]); push(b1, n, B[2]);
        push(a0, n, A[2]); push(b1, n, B[2]); push(a1, n, A[2]);
      }
    }
    var Z = R[R.length - 1], up = [0, 1, 0];
    push(corner(Z, 0), up, 0.06); push(corner(Z, 3), up, 0.06); push(corner(Z, 2), up, 0.06);
    push(corner(Z, 0), up, 0.06); push(corner(Z, 2), up, 0.06); push(corner(Z, 1), up, 0.06);
    var g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    return g;
  }
  /* Spring strip along z (length len): a U channel whose two walls carry one V-shaped contact pair per hole.
   * Bottom at y = 0, height 3.4 mm, opening upward. */
  function clipGeo(len, holes) {
    var s = new THREE.Shape();
    s.moveTo(-0.82, 0); s.lineTo(0.82, 0); s.lineTo(0.82, 1.7); s.lineTo(0.32, 2.6); s.lineTo(0.13, 2.6); s.lineTo(0.62, 1.74); s.lineTo(0.6, 0.22);
    s.lineTo(-0.6, 0.22); s.lineTo(-0.62, 1.74); s.lineTo(-0.13, 2.6); s.lineTo(-0.32, 2.6); s.lineTo(-0.82, 1.7); s.closePath();
    var parts = [], n = holes || Math.max(1, Math.round(len / BB.P)), seg = len / n;
    for (var i = 0; i < n; i++) {
      var g = new THREE.ExtrudeGeometry(s, { depth: seg * 0.86, bevelEnabled: false });
      g.translate(0, 0, -len / 2 + i * seg + seg * 0.07);
      parts.push(g);
    }
    /* continuous base strip joining the contacts */
    var base = new THREE.BoxGeometry(1.64, 0.24, len);
    base.translate(0, 0.12, 0);
    parts.push(base);
    return mergeGeos(parts);
  }
  /* half of the board top (front: z > 0 or back: z < 0) as a shape around the trench, with the holes of that half */
  function boardHalfShape(front, holes) {
    var a = BB.W / 2 - BB.ins, b = BB.D / 2 - BB.ins, r = BB.rc - BB.ins, s = front ? -1 : 1, hh = 0.77;
    var sh = new THREE.Shape();
    /* shape y = −z; front half has y < 0 */
    sh.moveTo(-a, 0); sh.lineTo(-38.6, 0); sh.lineTo(-38.6, s * 1.55); sh.lineTo(38.6, s * 1.55); sh.lineTo(38.6, 0); sh.lineTo(a, 0);
    if (front) {
      sh.lineTo(a, -(b - r)); sh.absarc(a - r, -(b - r), r, 0, -Math.PI / 2, true);
      sh.lineTo(-(a - r), -b); sh.absarc(-(a - r), -(b - r), r, -Math.PI / 2, -Math.PI, true);
    } else {
      sh.lineTo(a, b - r); sh.absarc(a - r, b - r, r, 0, Math.PI / 2, false);
      sh.lineTo(-(a - r), b); sh.absarc(-(a - r), b - r, r, Math.PI / 2, Math.PI, false);
    }
    sh.closePath();
    holes.forEach(function (h) {
      if ((h[1] > 0) !== front) return;
      var p = new THREE.Path(), x = h[0], y = -h[1];
      p.moveTo(x - hh, y - hh); p.lineTo(x + hh, y - hh); p.lineTo(x + hh, y + hh); p.lineTo(x - hh, y + hh); p.closePath();
      sh.holes.push(p);
    });
    return sh;
  }

  /* Breadboard centred at the origin, bottom at y = 0, top surface at y = BB.H; length along x, front = +z. */
  function makeBreadboard(M, fw) {
    var grp = new THREE.Group();
    var a = BB.W / 2, b = BB.D / 2, rc = BB.rc, H = BB.H, ins = BB.ins;
    var mats = [];
    function pm(o) {
      var m = new THREE.MeshStandardMaterial(Object.assign({ roughness: 0.55, metalness: 0, transparent: true, opacity: 1, depthWrite: true, envMapIntensity: 0.55 }, o));
      mats.push(m);
      return m;
    }
    var shell = pm({ color: 0xF1EEE6 });
    var body = mesh(sweepRR(a, b, rc, [[0, -0.5], [0.22, -0.1], [0.6, 0], [H - 0.65, 0], [H - 0.28, -0.16], [H - 0.06, -0.42], [H, -ins]], { nc: 6 }), shell, true, true);
    grp.add(body);
    grp.add(mesh(rrCap(a - 0.5, b - 0.5, rc - 0.5, 0.0, true), shell, false, false));
    var holes = [];
    for (var c = 1; c <= 30; c++) 'abcdefghij'.split('').forEach(function (r) { holes.push([colX(c), ROWZ[r]]); });
    RAIL_COLS.forEach(function (cc) { [RAILZ.fp, RAILZ.fm, RAILZ.bp, RAILZ.bm].forEach(function (z) { holes.push([colX(cc), z]); }); });
    var topTex = fontTex(fw, 2048, 1374, paintBoardTop);
    function topHalf(front, mat) {
      var g = new THREE.ShapeGeometry(boardHalfShape(front, holes), 6);
      var uv = g.attributes.uv;
      for (var i = 0; i < uv.count; i++) uv.setXY(i, (uv.getX(i) + a) / (2 * a), (uv.getY(i) + b) / (2 * b));
      g.rotateX(-Math.PI / 2);
      g.translate(0, H, 0);
      return mesh(g, mat, false, true);
    }
    /* the front half can be ghosted (x-ray); the back half always stays solid */
    var frontMat = pm({ map: topTex }), backMat = new THREE.MeshStandardMaterial({ map: topTex, roughness: 0.55, envMapIntensity: 0.55 });
    var topF = topHalf(true, frontMat), topB = topHalf(false, backMat);
    grp.add(topF, topB);
    /* hole funnels */
    var fMatF = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.62, transparent: true, opacity: 1, depthWrite: true, envMapIntensity: 0.45 });
    var fMatB = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.62, envMapIntensity: 0.45 });
    mats.push(fMatF);
    var fg = funnelGeo(), m4 = new THREE.Matrix4();
    var hF = holes.filter(function (h) { return h[1] > 0; }), hB = holes.filter(function (h) { return h[1] < 0; });
    var funF = new THREE.InstancedMesh(fg, fMatF, hF.length), funB = new THREE.InstancedMesh(fg, fMatB, hB.length);
    hF.forEach(function (h, k) { m4.makeTranslation(h[0], H, h[1]); funF.setMatrixAt(k, m4); });
    hB.forEach(function (h, k) { m4.makeTranslation(h[0], H, h[1]); funB.setMatrixAt(k, m4); });
    funF.receiveShadow = funB.receiveShadow = true;
    grp.add(funF, funB);
    /* centre trench */
    var trMat = new THREE.MeshStandardMaterial({ color: 0xE6E2D8, side: THREE.BackSide, roughness: 0.7, envMapIntensity: 0.5 });
    var trench = mesh(new THREE.BoxGeometry(77.2, 2.6, 3.1), trMat, false, true);
    trench.position.set(0, H - 1.3 + 0.001, 0);
    grp.add(trench);
    /* inside (seen only in the x-ray): a floor and the spring strips of the front half */
    var floor = mesh(new THREE.PlaneGeometry(2 * a - 2, b - 2.6), new THREE.MeshStandardMaterial({ color: 0xE9E5DC, roughness: 0.8, envMapIntensity: 0.4 }), false, true);
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(0, 0.9, b / 2 + 0.3);
    var clipMat = K.mat.tin({ roughness: 0.3, color: 0xC4C8CD });
    var clips = new THREE.InstancedMesh(clipGeo(12.2, 5), clipMat, 30);
    for (c = 1; c <= 30; c++) { m4.makeTranslation(colX(c), 4.2, ROWZ.c); clips.setMatrixAt(c - 1, m4); }
    var railGeo = clipGeo(73.4, 29);
    railGeo.rotateY(Math.PI / 2);
    var rails = new THREE.InstancedMesh(railGeo, clipMat, 2);
    [RAILZ.fp, RAILZ.fm].forEach(function (z, k) { m4.makeTranslation(colX(16), 4.2, z); rails.setMatrixAt(k, m4); });
    var inside = new THREE.Group();
    inside.add(floor, clips, rails);
    inside.visible = false;
    grp.add(inside);
    return {
      group: grp, inside: inside, clipMat: clipMat,
      /* 0 = solid board, 1 = x-ray of the front half (plastic ghosted, metal strips visible) */
      setXray: function (k) {
        var on = k > 0.002;
        inside.visible = on;
        frontMat.opacity = 1 - 0.74 * k;
        fMatF.opacity = 1 - 0.86 * k;
        frontMat.depthWrite = fMatF.depthWrite = !on;
      }
    };
  }

  /* =====================================================================
   * breadboard-build · S 680×520 · light
   * The user's first real circuit, step by step.
   * ===================================================================== */
  K.register('breadboard-build', function (el, opts) {
    var v = K.stage3d(el, {
      theme: opts.theme || 'light', fov: 30, distance: 175, yaw: -0.6, pitch: 0.72, target: [-12, 6, 6],
      size: 80, ground: 0, near: 2, far: 3000, minPitch: 0.2, maxPitch: 1.35, minDistance: 70, maxDistance: 330
    });
    v.exposure = 0.62;
    softEdge(el, 5);
    var M = Mats(), fw = FontWatch(), gt = glowTexture(), H = BB.H;
    var board = makeBreadboard(M, fw);
    v.scene.add(board.group);
    var X8 = colX(8), X9 = colX(9), X2 = colX(2), X3 = colX(3);

    /* step 0 highlight: the 5-hole strip of column 8 (a–e) and the + rail strip */
    var hiMat = K.mat.std(0xC8693A, 0.35, 0.6, { emissive: 0xC8693A, emissiveIntensity: 0.55, transparent: true, opacity: 0 });
    var hiClip = mesh(clipGeo(12.3, 5), hiMat, false, false);
    hiClip.position.set(X8, 4.18, ROWZ.c);
    hiClip.scale.set(1.1, 1.02, 1);
    var hiRailGeo = clipGeo(73.6, 29);
    hiRailGeo.rotateY(Math.PI / 2);
    var hiRail = mesh(hiRailGeo, hiMat, false, false);
    hiRail.position.set(colX(16), 4.18, RAILZ.fp);
    hiRail.scale.set(1, 1.02, 1.1);
    v.scene.add(hiClip, hiRail);
    var ringMat = new THREE.MeshBasicMaterial({ color: 0xC8693A, transparent: true, opacity: 0, depthWrite: false, toneMapped: false });
    var ringGeo = new THREE.RingGeometry(1.0, 1.45, 32);
    ringGeo.rotateX(-Math.PI / 2);
    var rings = [];
    ['a', 'b', 'c', 'd', 'e'].forEach(function (r) {
      var m = mesh(ringGeo, ringMat, false, false);
      m.position.set(X8, H + 0.04, ROWZ[r]);
      m.renderOrder = 3;
      rings.push(m);
      v.scene.add(m);
    });

    /* shared-strip tints shown when a part lands (step 2: column 8 + rail; step 3: column 9 + rail) */
    var tintMat = [0, 1].map(function () { return new THREE.MeshBasicMaterial({ color: 0xC8693A, transparent: true, opacity: 0, depthWrite: false, toneMapped: false }); });
    var tintRingMat = [0, 1].map(function () { return new THREE.MeshBasicMaterial({ color: 0xC8693A, transparent: true, opacity: 0, depthWrite: false, toneMapped: false }); });
    function tintLane(m, x0, z0, x1, z1, w) {
      var len = Math.hypot(x1 - x0, z1 - z0) + 1.8;
      var g = new THREE.PlaneGeometry(len, w);
      g.rotateX(-Math.PI / 2);
      var o = mesh(g, m, false, false);
      o.position.set((x0 + x1) / 2, H + 0.05, (z0 + z1) / 2);
      o.rotation.y = -Math.atan2(z1 - z0, x1 - x0);
      o.renderOrder = 1;
      v.scene.add(o);
    }
    tintLane(tintMat[0], X8, ROWZ.e, X8, ROWZ.a, 2.2);
    tintLane(tintMat[0], colX(2), RAILZ.fp, colX(30), RAILZ.fp, 2.0);
    tintLane(tintMat[1], X9, ROWZ.e, X9, ROWZ.a, 2.2);
    tintLane(tintMat[1], colX(2), RAILZ.fm, colX(30), RAILZ.fm, 2.0);
    [[0, X8], [1, X9]].forEach(function (pr) {
      ['a', 'b', 'c', 'd', 'e'].forEach(function (r) {
        var m = mesh(ringGeo, tintRingMat[pr[0]], false, false);
        m.position.set(pr[1], H + 0.06, ROWZ[r]);
        m.renderOrder = 3;
        v.scene.add(m);
      });
    });

    /* LED: anode (long leg) in d8, cathode in d9 */
    var LED_Y = H + 7.5;
    var led = makeLED(M, { glowTex: gt, legA: 15.5, legC: 13.5 });
    var ledRig = new THREE.Group();
    ledRig.position.set((X8 + X9) / 2, LED_Y, ROWZ.d);
    ledRig.add(led.group);
    v.scene.add(ledRig);
    led.group.rotation.y = Math.PI;
    var ledLight = new THREE.PointLight(0xFF2A18, 0, 70, 2);
    ledLight.position.set((X8 + X9) / 2, LED_Y + 7, ROWZ.d + 1);
    v.scene.add(ledLight);

    /* resistor 390 Ω: + rail (front outer, column 8) → a8 */
    var RES_Y = H + 2.25;
    var res = makeResistor(M, { value: 390, leads: { type: 'bent', span: 10.16, drop: RES_Y - H + 4.9 } });
    var resRig = new THREE.Group();
    resRig.position.set(X8, RES_Y, (RAILZ.fp + ROWZ.a) / 2);
    res.group.rotation.y = -Math.PI / 2;
    resRig.add(res.group);
    v.scene.add(resRig);
    /* bypass wire (replaces the resistor) */
    var byRig = new THREE.Group();
    byRig.add(makeJumper(M, X8, RAILZ.fp, X8, ROWZ.a, H, M.insRed(), { height: 1.6 }));
    v.scene.add(byRig);

    /* black jumper: b9 → − rail (front inner, column 9) */
    var jmpRig = new THREE.Group();
    var jmp = makeJumper(M, X9, RAILZ.fm, X9, ROWZ.b, H, M.insBlack(), { height: 1.25 });
    jmpRig.add(jmp);
    v.scene.add(jmpRig);

    /* 9 V battery lying on its back (label up) in front of the board, left of the rails; snap leads arc over the board edge
     * (red lead → + rail at column 2, black lead → − rail at column 4) */
    var X4 = colX(4);
    var bat = make9V(M, fw, { side: 'flip' });
    var batRig = new THREE.Group();
    var BQ = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(v3(0, 0, 1), v3(1, 0, 0), v3(0, 1, 0)));
    var batRot = new THREE.Group();
    batRot.rotation.y = -Math.PI / 2;
    batRot.position.set(-58, 0, -32.7);
    batRig.add(batRot);
    bat.group.quaternion.copy(BQ);
    bat.group.position.set(0, B9.D / 2, 0);
    batRot.add(bat.group);
    var snap = makeSnap(M);
    snap.group.quaternion.copy(BQ).multiply(new THREE.Quaternion().setFromAxisAngle(v3(0, 1, 0), Math.PI));
    snap.group.position.copy(bat.group.position);
    batRot.add(snap.group);
    v.scene.add(batRig);
    batRig.updateMatrixWorld(true);
    var batInv = new THREE.Matrix4().copy(bat.group.matrixWorld).invert();
    function batW(x, y, z) { return bat.group.localToWorld(v3(x, y, z)); }
    function snapW(x, y, z) { return snap.group.localToWorld(v3(x, y, z)); }
    var exitP = snapW(snap.exitX, snap.exitY, snap.exitZ), exitM = snapW(snap.exitX, snap.exitY, -snap.exitZ);
    var outDir = snapW(1, 0, 0).sub(snapW(0, 0, 0)).normalize();
    var redLead = makeLead(M, [exitP, exitP.clone().addScaledVector(outDir, 3.5).add(v3(0, 0.6, 0)), v3(-38.5, 12.5, 21.5), v3(-35.2, 12.5, 23.6)], X2, RAILZ.fp, H, M.insRed());
    var blackLead = makeLead(M, [exitM, exitM.clone().addScaledVector(outDir, 3.5).add(v3(0, 1.6, 0)), v3(-37, 18, 18), v3(-30.5, 17, 20.4)], X4, RAILZ.fm, H, M.insBlack());
    batRig.add(redLead, blackLead);
    var snapRig = batRig;

    /* current lanes: the hidden metal strips that carry the current, shown faintly on the surface */
    var laneMat = new THREE.MeshBasicMaterial({ color: 0xC8693A, transparent: true, opacity: 0, depthWrite: false, toneMapped: false });
    function lane(x0, z0, x1, z1) {
      var len = Math.hypot(x1 - x0, z1 - z0) + 1.6;
      var g = new THREE.PlaneGeometry(len, 1.25);
      g.rotateX(-Math.PI / 2);
      var m = mesh(g, laneMat, false, false);
      m.position.set((x0 + x1) / 2, H + 0.03, (z0 + z1) / 2);
      m.rotation.y = -Math.atan2(z1 - z0, x1 - x0);
      m.renderOrder = 1;
      v.scene.add(m);
    }
    lane(X4, RAILZ.fm, X9, RAILZ.fm);
    lane(X9, ROWZ.b, X9, ROWZ.d);
    lane(X8, ROWZ.d, X8, ROWZ.a);
    lane(X8, RAILZ.fp, X2, RAILZ.fp);

    /* electron path (electron direction: battery − → black lead → − rail → jumper → column 9 → LED → column 8 → resistor → + rail → red lead → battery +) */
    var SURF = H + 0.22;
    function L3(a, b) { return new THREE.LineCurve3(a, b); }
    var bc = blackLead.userData.curve, rcv = redLead.userData.curve;
    var batMinus = batW(-B9.pitch / 2, B9.Hc + 1.5, 0), batPlus = batW(B9.pitch / 2, B9.Hc + 1.5, 0);
    var ledX = (X8 + X9) / 2;
    function ledPath(rev) {
      /* cathode leg up → die → bond wire → anode leg down; rev swaps the columns */
      var xc = rev ? X8 : X9, xa = rev ? X9 : X8, s = rev ? -1 : 1;
      return [
        { curve: L3(v3(xc, SURF, ROWZ.d), v3(xc, LED_Y + 3.6, ROWZ.d)), lift: 0.42 },
        { curve: new THREE.CubicBezierCurve3(v3(xc, LED_Y + 3.6, ROWZ.d), v3(ledX + s * 0.2, LED_Y + 3.9, ROWZ.d), v3(ledX - s * 0.6, LED_Y + 4.9, ROWZ.d), v3(xa, LED_Y + 4.2, ROWZ.d)), lift: 0.2 },
        { curve: L3(v3(xa, LED_Y + 4.2, ROWZ.d), v3(xa, SURF, ROWZ.d)), lift: 0.42 }
      ];
    }
    function buildPath(rev, bypass) {
      var segs = [
        { curve: L3(batMinus, bc.points[0]), lift: 0 },
        { curve: bc, lift: 0.85 },
        { curve: L3(v3(X4, H + 0.75, RAILZ.fm), v3(X4, SURF, RAILZ.fm)), lift: 0.45 },
        { curve: L3(v3(X4, SURF, RAILZ.fm), v3(X9, SURF, RAILZ.fm)), lift: 0.3 },
        { curve: L3(v3(X9, SURF, RAILZ.fm), v3(X9, H + 1.25, RAILZ.fm)), lift: 0.6 },
        { curve: L3(v3(X9, H + 1.25, RAILZ.fm), v3(X9, H + 1.25, ROWZ.b)), lift: 0.6 },
        { curve: L3(v3(X9, H + 1.25, ROWZ.b), v3(X9, SURF, ROWZ.b)), lift: 0.6 },
        { curve: L3(v3(X9, SURF, ROWZ.b), v3(X9, SURF, ROWZ.d)), lift: 0.3 }
      ];
      segs = segs.concat(ledPath(rev));
      var top = bypass ? H + 1.6 : RES_Y;
      segs.push({ curve: L3(v3(X8, SURF, ROWZ.d), v3(X8, SURF, ROWZ.a)), lift: 0.3 });
      segs.push({ curve: L3(v3(X8, SURF, ROWZ.a), v3(X8, top, ROWZ.a)), lift: 0.45 });
      segs.push({ curve: L3(v3(X8, top, ROWZ.a), v3(X8, top, RAILZ.fp)), lift: bypass ? 0.62 : 1.32 });
      segs.push({ curve: L3(v3(X8, top, RAILZ.fp), v3(X8, SURF, RAILZ.fp)), lift: 0.45 });
      segs.push({ curve: L3(v3(X8, SURF, RAILZ.fp), v3(X2, SURF, RAILZ.fp)), lift: 0.3 });
      segs.push({ curve: L3(v3(X2, SURF, RAILZ.fp), v3(X2, H + 0.75, RAILZ.fp)), lift: 0.45 });
      var rpts = rcv.getSpacedPoints(80).reverse();
      segs.push({ curve: new THREE.CatmullRomCurve3(rpts), lift: 0.85 });
      segs.push({ curve: L3(rpts[rpts.length - 1], batPlus), lift: 0 });
      segs.push({ curve: new THREE.QuadraticBezierCurve3(batPlus, batW(0, 12, 0), batMinus), lift: 0 });
      return PathLUT(segs, 0.35);
    }
    var paths = {};
    function pathFor(rev, by) { var k = (rev ? 1 : 0) + (by ? 2 : 0); return paths[k] || (paths[k] = buildPath(rev, by)); }
    var batInterior = (function () {
      var q = v3(), ax = v3(0, 1, 0);
      return function (p) {
        q.copy(p).applyMatrix4(batInv);
        return (Math.abs(q.x) < 13.4 && Math.abs(q.z) < 8.9 && q.y < B9.Hc + 9.2) || (q.x > -snap.exitX && Math.abs(q.z) < 8 && q.y > B9.Hc && q.y < B9.Hc + 9.2);
      };
    })();
    var NDOT = 58;
    var dots = Dots(v, M, NDOT, 0.48);
    var tmpP = new THREE.Vector3();

    /* labels */
    var lab = {
      strip: lbl(v, 'her 5\'li sıra içeriden bağlı', { at: [X8, H, ROWZ.e], cls: 'tag chip', dx: 70, dy: -95, line: true, align: 'left' }),
      rail: lbl(v, 'uzun şerit: + hattı boydan boya bağlı', { at: [colX(11), H, RAILZ.fp], cls: 'tag chip', dx: 10, dy: 66, line: true, align: 'center' }),
      anode: lbl(v, 'uzun bacak: anot (+)', { at: function () { return tmpAnode; }, cls: 'tag chip', dx: -150, dy: -10, line: true, align: 'right' }),
      cathode: lbl(v, 'kısa bacak: katot (−)', { at: function () { return tmpCath; }, cls: 'tag chip', dx: 120, dy: -40, line: true, align: 'left' }),
      res: lbl(v, '390 Ω direnç', { at: [X8, RES_Y + 1.2, (RAILZ.fp + ROWZ.a) / 2], cls: 'name chip', dx: -120, dy: 40, line: true, align: 'right' }),
      jmp: lbl(v, 'siyah kablo: katot → − hattı', { at: [X9, H + 1.4, (RAILZ.fm + ROWZ.b) / 2 + 2], cls: 'tag chip', dx: 30, dy: 78, line: true, align: 'left' }),
      bat: lbl(v, '9 V pil · kırmızı +, siyah −', { at: function () { return batLabelAt; }, cls: 'name chip', dx: -30, dy: 56, line: true, align: 'center' }),
      el: lbl(v, 'elektronlar', { at: [colX(5), SURF, RAILZ.fm], cls: 'tag chip', dx: 30, dy: -85, line: true, align: 'center' }),
      mA: lbl(v, '≈ 18 mA', { at: [ledX, LED_Y + 9, ROWZ.d], cls: 'value chip', dx: 70, dy: -40, line: true, align: 'left' }),
      rev: lbl(v, 'ters yön:<br>diyot geçirmez', { at: [ledX, LED_Y + 4, ROWZ.d], cls: 'tag chip', html: true, dx: 46, dy: 8, line: true, align: 'left' }),
      by: lbl(v, 'dirençsiz:<br>aşırı akım,<br>LED bozulur', { at: [ledX, LED_Y + 4, ROWZ.d], cls: 'tag chip', html: true, dx: 46, dy: 8, line: true, align: 'left' }),
      speed: cornerTag(v, 'elektron hızı abartılı gösterilmiştir', 'bl')
    };
    var tmpAnode = new THREE.Vector3(), tmpCath = new THREE.Vector3(), batLabelAt = batW(0, 22, 9);

    /* state */
    var S = {};
    var VIEWS = [
      { yaw: 0.34, pitch: 0.86, distance: 140, target: [-8, 3, 10] },
      { yaw: 0.55, pitch: 0.5, distance: 98, target: [-18, 17, 10] },
      { yaw: 0.62, pitch: 0.58, distance: 74, target: [-19, 9, 14] },
      { yaw: 0.62, pitch: 0.58, distance: 74, target: [-19, 9, 14] },
      { yaw: 0.66, pitch: 0.6, distance: 108, target: [-32, 8, 8] },
      { yaw: 0.66, pitch: 0.6, distance: 108, target: [-32, 8, 8] }
    ];
    function reset() {
      S = {
        auto: !K.reducedMotion, step: K.reducedMotion ? 5 : 0, reverse: 0, bypass: 0, viewStep: -1,
        pLed: 0, pRes: 0, pBy: 0, pJmp: 0, pSnap: 0, pBat: 0, xray: 0, flow: 0, offset: 0, light: 0,
        rot: Math.PI, rotFrom: Math.PI, rotTo: Math.PI, flipT: 1, burn: 0, burnT: -1, flash: 0, replacing: false,
        lanes: 0, lastStepT: 0
      };
      if (K.reducedMotion) { S.pLed = S.pRes = S.pJmp = S.pSnap = S.pBat = 1; }
      v.setView(VIEWS[S.step]);
      S.viewStep = S.step;
    }
    reset();

    function placeY(p, lift) { var e = EZ.out(clamp(p, 0, 1)); return (1 - e) * lift; }
    /* LED: descend, hover so the longer anode leg can be seen, then push in */
    function ledLift(p) {
      if (p < 0.38) return lerp(46, 9, EZ.out(p / 0.38));
      if (p < 0.72) return 9;
      return lerp(9, 0, EZ.inOut((p - 0.72) / 0.28));
    }
    function stepPresence(cur, target, dt, dur) {
      if (cur < target) return Math.min(target, cur + dt / dur);
      if (cur > target) return Math.max(target, cur - dt / (dur * 0.7));
      return cur;
    }

    function frame(t, dt) {
      fw.tick();
      if (S.auto) S.step = Math.min(5, Math.floor(t / 3.5));
      var st = S.step;
      /* camera per step (only when the teacher is not steering it) */
      if (S.viewStep !== st) {
        S.viewStep = st;
        if (v.orbit.idle > 3 || S.auto) v.animateTo(VIEWS[st], 1.5);
      }
      /* presences */
      var wantRes = st >= 2 && !S.bypass, wantBy = st >= 2 && S.bypass;
      S.pLed = stepPresence(S.pLed, (st >= 1 && !S.replacing) ? 1 : 0, dt, 2.7);
      if (S.replacing && S.pLed <= 0) { S.replacing = false; S.burn = 0; S.burnT = -1; S.flash = 0; }
      S.pRes = stepPresence(S.pRes, wantRes && S.pBy <= 0.01 ? 1 : 0, dt, 0.9);
      S.pBy = stepPresence(S.pBy, wantBy && S.pRes <= 0.01 ? 1 : 0, dt, 0.9);
      S.pJmp = stepPresence(S.pJmp, st >= 3 ? 1 : 0, dt, 0.9);
      S.pSnap = stepPresence(S.pSnap, st >= 4 ? 1 : 0, dt, 0.9);
      S.pBat = stepPresence(S.pBat, st >= 4 && S.pSnap > 0.7 ? 1 : 0, dt, 0.7);
      S.xray = approach(S.xray, st === 0 ? 1 : 0, 4, dt);
      board.setXray(S.xray);
      var hk = st === 0 ? sstep(0.5, 1, S.xray) : 0;
      hiMat.opacity = hk * 0.95;
      ringMat.opacity = sstep(0.3, 1, S.xray) * (st === 0 ? 1 : 0);
      hiClip.visible = hiRail.visible = hiMat.opacity > 0.01;

      /* LED flip (reverse) */
      var wantRot = S.reverse ? 0 : Math.PI;
      if (wantRot !== S.rotTo) { S.rotFrom = S.rot; S.rotTo = wantRot; S.flipT = 0; }
      var flipLift = 0;
      if (S.flipT < 1) {
        S.flipT = Math.min(1, S.flipT + dt / 1.7);
        var f = S.flipT;
        flipLift = 14 * (sstep(0, 0.3, f) - sstep(0.7, 1, f));
        S.rot = lerp(S.rotFrom, S.rotTo, sstep(0.3, 0.7, f));
      } else S.rot = S.rotTo;
      led.group.rotation.y = S.rot;
      var ledSeated = S.pLed > 0.999 && S.flipT >= 1;
      var reversed = S.rotTo === 0;

      ledRig.position.y = LED_Y + ledLift(S.pLed) + flipLift;
      ledRig.visible = S.pLed > 0.001;
      resRig.position.y = placeY(S.pRes, 40); resRig.visible = S.pRes > 0.001;
      res.group.position.y = RES_Y;
      resRig.position.y += 0;
      byRig.position.y = placeY(S.pBy, 40); byRig.visible = S.pBy > 0.001;
      jmpRig.position.y = placeY(S.pJmp, 40); jmpRig.visible = S.pJmp > 0.001;
      batRig.position.y = placeY(S.pSnap, 70); batRig.visible = S.pSnap > 0.001;

      /* circuit logic */
      var complete = st >= 5 && S.pBat > 0.999 && S.pSnap > 0.999 && S.pJmp > 0.999 && ledSeated && (S.pRes > 0.999 || S.pBy > 0.999);
      var conducts = complete && !reversed && S.burn < 1;
      var bypassed = S.pBy > 0.999;
      if (conducts && bypassed && S.burnT < 0) S.burnT = 0;
      if (S.burnT >= 0 && S.burn < 1) {
        S.burnT += dt;
        S.flash = sstep(0.55, 0.75, S.burnT) * (1 - sstep(0.8, 1.35, S.burnT));
        if (S.burnT > 0.8) S.burn = Math.min(1, (S.burnT - 0.8) / 0.5);
      } else S.flash = approach(S.flash, 0, 6, dt);
      if (!S.bypass && S.burn > 0 && !S.replacing && S.pBy <= 0.01) S.replacing = true;
      var flowTarget = conducts ? (bypassed ? 1 + 5 * sstep(0, 0.6, Math.max(0, S.burnT)) : 1) : 0;
      if (S.burn >= 1) flowTarget = 0;
      S.flow = approach(S.flow, flowTarget, conducts ? 2.5 : 4, dt);
      var speed = (K.reducedMotion ? 2.5 : 5.5) * S.flow;
      S.offset += speed * dt;
      var lightTarget = conducts ? (bypassed ? 1.6 : 1) : 0;
      S.light = approach(S.light, lightTarget, 5, dt);
      led.set(Math.min(1, S.light), S.burn, S.flash);
      ledLight.intensity = (Math.min(1, S.light) * (1 - S.burn) * 0.55 + S.flash * 1.5);
      ledLight.position.set(ledX, ledRig.position.y + 6, ROWZ.d + 1);

      /* electrons: visible once the loop is complete (step 5) */
      var showDots = st >= 5 && S.pBat > 0.99 && ledSeated;
      S.lanes = approach(S.lanes, showDots ? 1 : 0, 3, dt);
      laneMat.opacity = S.lanes * 0.28;
      if (showDots) {
        var lut = pathFor(reversed, bypassed);
        var sp = lut.len / NDOT;
        dots.update(lut, -S.offset, sp, function (s) {
          lut.at(s, tmpP);
          return batInterior(tmpP) ? 0 : 1;
        });
      } else dots.hide();

      /* label anchors */
      var ly = ledRig.position.y;
      var aX = reversed ? X9 : X8, cX = reversed ? X8 : X9;
      tmpAnode.set(aX, ly - 4.5, ROWZ.d);
      tmpCath.set(cX, ly - 3.5, ROWZ.d);
      S.tint0 = approach(S.tint0 || 0, st === 2 && S.pRes > 0.99 ? 1 : 0, 3.5, dt);
      S.tint1 = approach(S.tint1 || 0, st === 3 && S.pJmp > 0.99 ? 1 : 0, 3.5, dt);
      var pulse = 0.55 + 0.45 * Math.sin(t * 4);
      tintMat[0].opacity = S.tint0 * 0.34; tintMat[1].opacity = S.tint1 * 0.34;
      tintRingMat[0].opacity = S.tint0 * pulse; tintRingMat[1].opacity = S.tint1 * pulse;
      lab.strip.show(st === 0 && S.xray > 0.6);
      lab.rail.show(st === 0 && S.xray > 0.6);
      lab.anode.show(st === 1 && S.pLed > 0.3);
      lab.cathode.show(st === 1 && S.pLed > 0.3);
      lab.res.show(st === 2 && S.pRes > 0.9);
      lab.jmp.show(st === 3 && S.pJmp > 0.9);
      lab.bat.show(st === 4 && S.pBat > 0.9);
      lab.el.show(showDots && conducts && S.flow > 0.5 && !bypassed);
      lab.mA.show(showDots && conducts && !bypassed && S.light > 0.6);
      lab.rev.show(reversed && S.pLed > 0.5);
      lab.by.show(S.bypass === 1 && S.pBy > 0.5);
      lab.speed.show(showDots && S.flow > 0.05);
      prep.track(S.pLed + S.pRes * 3 + S.pBy * 5 + S.pJmp * 7 + S.pSnap * 11 + S.pBat * 13 + S.flipT * 17 + S.rot * 19 + ledRig.position.y * 23);
      v.render(dt);
    }

    var prep = Prep(v);
    var STEP_TXT = [
      'Başlangıç · Boş breadboard: her 5\'li sıra içeriden bağlı',
      'Adım 1 · LED takılır: uzun bacak anot (+), kısa bacak katot (−)',
      'Adım 2 · 390 Ω direnç: + hattından LED\'in anot sırasına',
      'Adım 3 · Siyah kablo: LED\'in katot sırasından − hattına',
      'Adım 4 · 9 V pil bağlanır: kırmızı + hattına, siyah − hattına',
      'Adım 5 · Devre tamam: elektronlar akar, LED yanar'
    ];
    return {
      reset: reset,
      frame: frame,
      set: function (key, val) {
        S.auto = false;
        if (key === 'step') S.step = clamp(Math.round(+val), 0, 5);
        else if (key === 'reverse') S.reverse = +val ? 1 : 0;
        else if (key === 'bypass') S.bypass = +val ? 1 : 0;
      },
      read: function (key) {
        var st = S.step;
        if (key === 'formula') return 'R = (9 V − 2 V) ÷ 0,02 A = 350 Ω → standart 390 Ω';
        if (key === 'step') {
          if (st === 5 && S.rotTo === 0) return 'Adım 5 · LED ters takılı: diyot akımı geçirmez, LED yanmaz';
          if (st === 5 && S.bypass) return S.burn >= 1 ? 'Adım 5 · Dirençsiz: aşırı akım LED\'i bozdu' : 'Adım 5 · Dirençsiz: akımı sınırlayan bir şey yok';
          return STEP_TXT[st];
        }
        if (key === 'current') {
          if (st < 5) return 'I = 0: devre henüz tamamlanmadı';
          if (S.rotTo === 0) return 'I ≈ 0: LED ters yönde akım geçirmez';
          if (S.bypass) return S.burn >= 1 ? 'I = 0: LED bozuldu, devre açıldı' : 'Direnç yok: akım sınırlanmaz, çok büyür';
          return 'I = 7 V ÷ 390 Ω ≈ 18 mA';
        }
        return '';
      },
      dispose: function () { v.dispose(); }
    };
  });

  /* =====================================================================
   * resistor-zoom · S 680×520 · light
   * A large realistic carbon-film resistor; cutaway shows the layers.
   * ===================================================================== */
  var RZ_TURNS = { 220: 4, 330: 5, 1000: 7, 10000: 10 };
  function valueText(R) {
    if (R >= 1000) return fmt(R / 1000, 0) + ' kΩ (' + fmt(R, 0) + ' Ω)';
    return fmt(R, 0) + ' Ω';
  }
  function bandInfo(R) {
    var c = bandCode(R), mult = Math.pow(10, c.m);
    return {
      names: c.bands.map(function (b) { return b.n; }),
      bands: c.bands,
      roles: ['1. rakam', '2. rakam', 'çarpan', 'tolerans'],
      vals: [String(c.d1), String(c.d2), '× ' + fmt(mult, 0), '± %5'],
      formula: c.d1 + '' + c.d2 + ' × ' + fmt(mult, 0) + ' = ' + fmt(R, 0) + ' Ω (± %5)'
    };
  }

  /* outer lacquer radius at axial position h (matches resistorProfile) */
  var RZ_PROF = null;
  function rOut(h) {
    if (!RZ_PROF) RZ_PROF = resistorProfile();
    var p = RZ_PROF;
    if (h <= p[0][0]) return p[0][1];
    for (var i = 1; i < p.length; i++) if (p[i][0] >= h) {
      var k = (h - p[i - 1][0]) / ((p[i][0] - p[i - 1][0]) || 1);
      return lerp(p[i - 1][1], p[i][1], k);
    }
    return p[p.length - 1][1];
  }
  var RZ = { core: 0.8, film: 0.85, cap: 1.0, capL: [0.18, 1.36], capR: [4.94, 6.12] };
  function rIn(h) {
    if (h < RZ.capL[0] || h > RZ.capR[1]) return RES.lead;
    if (h <= RZ.capL[1] || h >= RZ.capR[0]) return RZ.cap;
    return RZ.film;
  }
  /* a closed lacquer shell segment between inner and outer radius over phi ∈ [a0, a0 + len], with cut faces */
  function lacquerShell(a0, len, segs) {
    var outer = lathe(resistorProfile(), { axis: 'x', segs: segs, phi0: a0, phiLen: len, h0: 0, h1: RES.L });
    var hs = [], i, N = 120;
    for (i = 0; i <= N; i++) hs.push(-0.5 + (RES.L + 1.0) * i / N);
    /* inner surface: profile listed right→left so normals face the axis */
    var inner = [];
    for (i = N; i >= 0; i--) {
      var h = hs[i], r = rIn(h);
      inner.push([h, r]);
    }
    var innerG = lathe(inner, { axis: 'x', segs: segs, phi0: a0, phiLen: len, h0: 0, h1: RES.L });
    function face(th, sgn) {
      var pos = [], nor = [], uv = [], c = Math.cos(th), s = Math.sin(th), nx = 0, ny = -s * sgn, nz = c * sgn;
      for (var k = 0; k < N; k++) {
        var h0 = hs[k], h1 = hs[k + 1];
        var a = [h0, rIn(h0)], b = [h0, rOut(h0)], c2 = [h1, rOut(h1)], d = [h1, rIn(h1)];
        var q = [a, b, c2, a, c2, d];
        if (sgn > 0) q = [a, c2, b, a, d, c2];
        q.forEach(function (p) { pos.push(p[0], p[1] * c, p[1] * s); nor.push(nx, ny, nz); uv.push(clamp(p[0] / RES.L, 0, 1), 0.5); });
      }
      var g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
      g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
      return g;
    }
    return { outer: outer, inner: innerG, faceA: face(a0, -1), faceB: face(a0 + len, 1) };
  }

  K.register('resistor-zoom', function (el, opts) {
    var v = K.stage3d(el, {
      theme: opts.theme || 'light', fov: 24, distance: 21.5, yaw: 0, pitch: 0.24, target: [0, 0, 0],
      size: 9, ground: -1.8, near: 0.3, far: 400, minPitch: -0.2, maxPitch: 1.1, minDistance: 11, maxDistance: 40
    });
    v.exposure = 0.5;
    var M = Mats(), fw = FontWatch();
    var rig = new THREE.Group();          /* rotates about the resistor axis (x) */
    v.scene.add(rig);
    var body = new THREE.Group();
    body.position.x = -RES.L / 2;
    rig.add(body);

    /* lacquer with colour bands */
    var bandsCur = bandCode(220).bands, bandsNext = bandsCur, sweep = 1;
    var tex = colorTex(1024, 8, function (ctx, w, h) { paintResistor(ctx, w, h, bandsCur, bandsCur, 1); });
    /* satin lacquer for the close-up: softer highlights so red stays red and orange stays orange */
    var data = dataTex(1024, 8, function (ctx, W, H) {
      ctx.fillStyle = 'rgb(0,176,0)';
      ctx.fillRect(0, 0, W, H);
      for (var k = 0; k < 4; k++) {
        var x0 = (BAND_POS[k] - BAND_W / 2) / RES.L * W, x1 = (BAND_POS[k] + BAND_W / 2) / RES.L * W;
        ctx.fillStyle = k === 3 ? 'rgb(0,110,235)' : 'rgb(0,160,0)';
        ctx.fillRect(x0, 0, x1 - x0, H);
      }
    });
    function lacMat(transparent) {
      return new THREE.MeshStandardMaterial({ map: tex, roughnessMap: data, metalnessMap: data, roughness: 1, metalness: 0.55, envMapIntensity: 0.3, transparent: !!transparent, opacity: 1, side: THREE.FrontSide });
    }
    var innerMat = new THREE.MeshStandardMaterial({ color: 0x6E5C42, roughness: 0.85, envMapIntensity: 0.25 });
    var cutMat = new THREE.MeshStandardMaterial({ color: 0xE8D9BA, roughness: 0.85, envMapIntensity: 0.35 });
    var WC = 1.48, WL = 2.3, W0 = WC - WL / 2;      /* removable window (≈130°) aimed at the viewer */
    var rest = lacquerShell(W0 + WL, TAU - WL, 52);
    var wedge = lacquerShell(W0, WL, 52);
    var restMat = lacMat(false);
    body.add(mesh(rest.outer, restMat, true), mesh(rest.inner, innerMat, false), mesh(rest.faceA, cutMat, false), mesh(rest.faceB, cutMat, false));
    var wedgeGrp = new THREE.Group();
    var wOuter = lacMat(true), wInner = innerMat.clone(), wCut = cutMat.clone();
    [wInner, wCut].forEach(function (m) { m.transparent = true; });
    wedgeGrp.add(mesh(wedge.outer, wOuter, true), mesh(wedge.inner, wInner, false), mesh(wedge.faceA, wCut, false), mesh(wedge.faceB, wCut, false));
    body.add(wedgeGrp);

    /* carbon film with the helical trim groove (texture), exaggerated thickness */
    var turns = RZ_TURNS[220];
    var F0 = RZ.capL[1] - 0.02, F1 = RZ.capR[0] + 0.02, FS = 3.25;
    function paintFilm(ctx, W, H) {
      ctx.fillStyle = '#2B2A29';
      ctx.fillRect(0, 0, W, H);
      var rng = K.rng(5);
      for (var i = 0; i < 900; i++) { ctx.fillStyle = 'rgba(255,255,255,' + (0.02 + rng() * 0.04) + ')'; ctx.fillRect(rng() * W, rng() * H, 2, 2); }
      /* helix: v = turns·u (wrapping); groove width ≈ 0.11 mm along h */
      var gw = 0.15 / (F1 - F0) * W;
      ctx.fillStyle = '#EDE6D6';
      for (var k = -turns - 2; k <= 2; k++) {
        ctx.beginPath();
        ctx.moveTo(0, (k) * H);
        ctx.lineTo(gw, (k) * H);
        ctx.lineTo(W + gw, (k + turns) * H);
        ctx.lineTo(W, (k + turns) * H);
        ctx.closePath();
        ctx.fill();
      }
    }
    var filmTex = colorTex(1024, 512, paintFilm);
    filmTex.wrapT = THREE.RepeatWrapping;
    var filmMat = new THREE.MeshStandardMaterial({ map: filmTex, roughness: 0.55, metalness: 0.15, envMapIntensity: 0.6 });
    var filmMatW = filmMat.clone(); filmMatW.transparent = true; filmMatW.map = filmTex;
    var fA = lathe([[F0, RZ.film], [FS, RZ.film]], { axis: 'x', segs: 64, h0: F0, h1: F1, uvAbs: true });
    var fB = lathe([[FS, RZ.film], [F1, RZ.film]], { axis: 'x', segs: 54, phi0: W0 + WL, phiLen: TAU - WL, h0: F0, h1: F1, uvAbs: true });
    var fW = lathe([[FS, RZ.film], [F1, RZ.film]], { axis: 'x', segs: 36, phi0: W0, phiLen: WL, h0: F0, h1: F1, uvAbs: true });
    body.add(mesh(fA, filmMat, false), mesh(fB, filmMat, false));
    var filmWedge = mesh(fW, filmMatW, false);
    body.add(filmWedge);
    /* film step edge (where the film wedge is cut away) */
    var stepRing = mesh(lathe([[FS, RZ.core], [FS + 0.001, RZ.film]], { axis: 'x', segs: 36, phi0: W0, phiLen: WL }), new THREE.MeshStandardMaterial({ color: 0x1E1D1C, roughness: 0.6 }), false);
    body.add(stepRing);
    /* ceramic core */
    var core = mesh(lathe([[RZ.capL[0] + 0.1, 0], [RZ.capL[0] + 0.1, RZ.core - 0.05], [RZ.capL[0] + 0.16, RZ.core], [RZ.capR[1] - 0.16, RZ.core], [RZ.capR[1] - 0.1, RZ.core - 0.05], [RZ.capR[1] - 0.1, 0]], { axis: 'x', segs: 48 }),
      new THREE.MeshStandardMaterial({ color: 0xF3F0E9, roughness: 0.78, envMapIntensity: 0.5 }), false);
    body.add(core);
    /* metal end caps */
    var capMat = K.mat.std(0xC2C5CA, 0.32, 1);
    function capGeo(left) {
      var a = left ? RZ.capL : RZ.capR, p;
      if (left) p = [[a[0], 0], [a[0], RZ.cap - 0.12], [a[0] + 0.06, RZ.cap - 0.02], [a[0] + 0.14, RZ.cap], [a[1] - 0.05, RZ.cap], [a[1], RZ.cap - 0.06], [a[1], RZ.film]];
      else p = [[a[0], RZ.film], [a[0], RZ.cap - 0.06], [a[0] + 0.05, RZ.cap], [a[1] - 0.14, RZ.cap], [a[1] - 0.06, RZ.cap - 0.02], [a[1], RZ.cap - 0.12], [a[1], 0]];
      return lathe(p, { axis: 'x', segs: 48 });
    }
    body.add(mesh(capGeo(true), capMat, false), mesh(capGeo(false), capMat, false));
    /* leads, welded to the caps */
    var LL = 24;
    var leadG = lathe([[0, 0], [0, 0.26], [0.04, RES.lead], [LL, RES.lead]], { axis: 'x', segs: 18 });
    var leadMat = K.mat.tin({ roughness: 0.22, color: 0xD6D9DD });
    var l1 = mesh(leadG, leadMat, true), l2 = mesh(leadG, leadMat, true);
    l1.position.x = RZ.capL[0] - LL + 0.02;
    l2.rotation.y = Math.PI;
    l2.position.x = RZ.capR[1] + LL - 0.02;
    body.add(l1, l2);

    /* labels: band decoding (closed) and anatomy (open) */
    function bandAt(k) { return function () { return bandPts[k]; }; }
    var bandPts = [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()];
    var bl = [
      lbl(v, '', { at: bandAt(0), cls: 'name chip', html: true, dx: -70, dy: -112, line: true, align: 'right' }),
      lbl(v, '', { at: bandAt(1), cls: 'name chip', html: true, dx: -40, dy: 112, line: true, align: 'right' }),
      lbl(v, '', { at: bandAt(2), cls: 'name chip', html: true, dx: 34, dy: -112, line: true, align: 'left' }),
      lbl(v, '', { at: bandAt(3), cls: 'name chip', html: true, dx: 40, dy: 112, line: true, align: 'left' })
    ];
    var anat = {};
    var A = {};
    function aAt(k) { return function () { return A[k]; }; }
    ['lac', 'film', 'groove', 'core', 'cap', 'lead'].forEach(function (k) { A[k] = new THREE.Vector3(); });
    anat.lac = lbl(v, 'lak kaplama ve renk halkaları', { at: aAt('lac'), cls: 'tag2 chip', dx: -20, dy: -120, line: true, align: 'left' });
    anat.film = lbl(v, 'karbon film:<br>akım bu ince katmandan geçer', { html: true, at: aAt('film'), cls: 'tag2 chip', dx: -10, dy: 120, line: true, align: 'center' });
    anat.groove = lbl(v, 'spiral kesik: değeri ayarlar', { at: aAt('groove'), cls: 'tag2 chip', dx: 30, dy: -116, line: true, align: 'left' });
    anat.core = lbl(v, 'seramik çubuk: yalıtkan', { at: aAt('core'), cls: 'tag2 chip', dx: 70, dy: 92, line: true, align: 'left' });
    anat.cap = lbl(v, 'metal uç kapak', { at: aAt('cap'), cls: 'tag2 chip', dx: 66, dy: -66, line: true, align: 'left' });
    anat.lead = lbl(v, 'bacak: kalaylı tel', { at: aAt('lead'), cls: 'tag2 chip', dx: -30, dy: 64, line: true, align: 'right' });
    var cornerT = cornerTag(v, 'basitleştirilmiş kesit · katman kalınlıkları abartılı', 'bl');
    if (v.lights && v.lights.ground) v.lights.ground.material.opacity = 0.075;

    var S = {};
    var PRES = -0.55;   /* rotation that turns the opening toward the (raised) camera */
    function reset() {
      S = { auto: true, value: 220, cut: 0, cutK: 0, rot: PRES - 2.2, spin: 1, lastV: 220, lastOpen: false };
      setValue(220, false);
      v.setView({ yaw: 0, pitch: 0.24, distance: 21.5, target: [0, 0, 0] });
    }
    function setValue(R, animate) {
      if (!animate) { bandsCur = bandsNext = bandCode(R).bands; sweep = 1; repaint(); }
      else { bandsCur = sweep >= 1 ? bandsNext : bandsNext; bandsNext = bandCode(R).bands; sweep = 0; }
      if (turns !== RZ_TURNS[R]) {
        turns = RZ_TURNS[R];
        var c = filmTex.image, ctx = c.getContext('2d');
        paintFilm(ctx, c.width, c.height);
        filmTex.needsUpdate = true;
      }
      S.prevValue = S.value || R;
      S.value = R;
      updateBandLabels();
    }
    function repaint() {
      var c = tex.image, ctx = c.getContext('2d');
      paintResistor(ctx, c.width, c.height, bandsCur, bandsNext, EZ.inOut(sweep));
      tex.needsUpdate = true;
    }
    var shownInfo = ['', '', '', ''];
    function updateBandLabels() {
      var info = bandInfo(S.value), old = bandInfo(S.prevValue || S.value);
      for (var k = 0; k < 4; k++) {
        var passed = sweep >= 1 || EZ.inOut(sweep) * RES.L > BAND_POS[k];
        var inf = passed ? info : old;
        var html = '<span style="font:500 11px/1.3 ' + K.fonts.mono + ';letter-spacing:.06em;color:#595E69">' + inf.roles[k] + '</span><br>' +
          inf.names[k] + ' = <span style="font-family:' + K.fonts.mono + '">' + inf.vals[k] + '</span>';
        if (html !== shownInfo[k]) { shownInfo[k] = html; bl[k].set(html); }
      }
    }
    reset();

    var tmp = new THREE.Vector3(), q = new THREE.Vector3();
    function local(x, r, ang, out) {
      /* body-local point on the axis frame → world */
      out.set(x - RES.L / 2, r * Math.cos(ang), r * Math.sin(ang));
      out.applyAxisAngle(q.set(1, 0, 0), rig.rotation.x);
      return out;
    }
    function frame(t, dt) {
      fw.tick();
      if (S.auto) S.cut = K.reducedMotion ? 0 : (Math.floor(t / 6) % 2);
      /* rotation: spins while closed; settles to the presentation angle to open */
      var wantOpen = S.cut === 1;
      if (wantOpen !== S.lastOpen) {
        S.lastOpen = wantOpen;
        if (v.orbit.idle > 3 || S.auto) v.animateTo({ yaw: wantOpen ? 0.1 : 0, pitch: wantOpen ? 0.5 : 0.24, distance: wantOpen ? 20.5 : 21.5, target: [0, 0, 0] }, 1.6);
      }
      if (wantOpen) {
        var target = PRES + Math.round((S.rot - PRES) / TAU) * TAU;
        if (target < S.rot - 0.6) target += TAU;
        S.rot = approach(S.rot, target, 3.2, dt);
        S.spin = approach(S.spin, 0, 4, dt);
        var aligned = Math.abs(S.rot - target) < 0.08;
        S.cutK = Math.min(1, S.cutK + (aligned ? dt / 1.5 : 0));
      } else {
        S.cutK = Math.max(0, S.cutK - dt / 1.1);
        S.spin = approach(S.spin, S.cutK > 0.02 ? 0 : 1, 2, dt);
        S.rot += dt * (K.reducedMotion ? 0.08 : 0.34) * S.spin;
      }
      var rock = Math.sin(t * 0.7) * 0.06 * (1 - S.spin);
      rig.rotation.x = S.rot + rock;
      rig.rotation.z = Math.sin(t * 0.21) * 0.035;
      /* wedges lift out radially and fade */
      var kc = EZ.inOut(sstep(0, 0.62, S.cutK)), kf = EZ.inOut(sstep(0.45, 1, S.cutK));
      var dir = WC;
      wedgeGrp.position.set(0, Math.cos(dir) * 2.6 * kc, Math.sin(dir) * 2.6 * kc);
      wedgeGrp.visible = kc < 0.995;
      [wOuter, wInner, wCut].forEach(function (m) { m.opacity = 1 - sstep(0.25, 0.95, kc); m.depthWrite = kc < 0.05; });
      filmWedge.position.set(0, Math.cos(WC) * 1.5 * kf, Math.sin(WC) * 1.5 * kf);
      filmWedge.visible = kf < 0.995;
      filmMatW.opacity = 1 - sstep(0.2, 0.95, kf);
      filmMatW.depthWrite = kf < 0.05;
      /* band sweep */
      if (sweep < 1) { sweep = Math.min(1, sweep + dt / 0.9); repaint(); if (sweep >= 1) bandsCur = bandsNext; updateBandLabels(); }
      /* label anchors: world angle wa (0 = up, π/2 = toward the viewer) → body-local angle */
      var rx = rig.rotation.x;
      function wa(a) { return a - rx; }
      for (var k = 0; k < 4; k++) {
        var ang = k === 1 || k === 3 ? wa(Math.PI - 0.35) : wa(0.3);
        local(BAND_POS[k], rOut(BAND_POS[k]) * 1.01, ang, bandPts[k]);
      }
      local(0.9, rOut(0.9), wa(-0.28), A.lac);
      local(2.0, RZ.film, wa(1.75), A.film);
      grooveAnchor(A.groove, wa(1.05));
      local(4.35, RZ.core, wa(1.5), A.core);
      local(5.55, RZ.cap, wa(0.95), A.cap);
      local(-3.4, RES.lead, wa(1.4), A.lead);
      var showBands = S.cutK < 0.05;
      for (k = 0; k < 4; k++) bl[k].show(showBands);
      var showAnat = S.cutK > 0.92;
      Object.keys(anat).forEach(function (kk) { anat[kk].show(showAnat); });
      cornerT.show(S.cutK > 0.5);
      prep.track(t);
      v.render(dt);
      drawScale();
    }
    function grooveAnchor(out, want) {
      /* the painted helix sits at local angle −TAU·turns·u (u along the film); pick the point nearest 'want' */
      var best = F0 + 1, bd = 1e9;
      for (var i = 0; i <= 120; i++) {
        var h = 2.1 + (FS - 0.2 - 2.1) * i / 120;
        var ang = -TAU * turns * (h - F0) / (F1 - F0) + 0.03;
        var d = Math.abs(Math.atan2(Math.sin(ang - want), Math.cos(ang - want)));
        if (d < bd) { bd = d; best = h; }
      }
      local(best, RZ.film * 1.01, -TAU * turns * (best - F0) / (F1 - F0) + 0.03, out);
    }
    /* 1 mm scale bar (true size reference), bottom right */
    var pa = new THREE.Vector3(), pb = new THREE.Vector3();
    function drawScale() {
      if (K.skipRender) return;
      var ctx = v.ctx;
      pa.set(-0.5, -1.9, 0); pb.set(0.5, -1.9, 0);
      var A2 = v.project(pa), B2 = v.project(pb);
      var px = Math.abs(B2.x - A2.x);
      var x1 = v.w - 26, x0 = x1 - px, y = v.h - 40;
      ctx.save();
      ctx.strokeStyle = PAL.ink2;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(x0, y - 4); ctx.lineTo(x0, y + 4); ctx.moveTo(x0, y); ctx.lineTo(x1, y); ctx.moveTo(x1, y - 4); ctx.lineTo(x1, y + 4);
      ctx.stroke();
      ctx.restore();
      K.label(ctx, '1 mm', (x0 + x1) / 2, y - 9, { size: 12, mono: true, align: 'center', color: PAL.ink2 });
      K.label(ctx, 'gerçek gövde boyu 6,3 mm', x1, y + 22, { size: 11, mono: true, align: 'right', color: PAL.muted });
    }
    void tmp;
    var prep = Prep(v);
    return {
      reset: reset,
      frame: frame,
      set: function (key, val) {
        S.auto = false;
        if (key === 'value') {
          var R = +val;
          if (!RZ_TURNS[R]) R = [220, 330, 1000, 10000].reduce(function (a, b) { return Math.abs(Math.log(b / R)) < Math.abs(Math.log(a / R)) ? b : a; });
          if (R !== S.value) setValue(R, true);
        } else if (key === 'cut') S.cut = +val ? 1 : 0;
      },
      read: function (key) {
        var info = bandInfo(S.value);
        if (key === 'bands') return info.names.join(' · ');
        if (key === 'formula') return info.formula;
        if (key === 'value') return valueText(S.value);
        return '';
      },
      dispose: function () { v.dispose(); }
    };
  });

  /* =====================================================================
   * Bench instruments (ohm-lab)
   * ===================================================================== */

  /* Binding post facing +y: metal base and stem, coloured cap with a banana socket. Height ≈ 15 mm. */
  function makeBindingPost(M, capColor) {
    var g = new THREE.Group();
    var metal = mesh(M.shared.bpMetal || (M.shared.bpMetal = lathe([[0, 0], [0, 5.0], [0.5, 5.3], [2.2, 5.3], [2.6, 4.6], [2.7, 2.2], [5.2, 2.2], [5.2, 0]], { axis: 'y', segs: 6 })), M.nickel(), true);
    g.add(metal);
    var capMat = M.shared['bpCap' + capColor] || (M.shared['bpCap' + capColor] = K.mat.std(capColor, 0.38, 0, { envMapIntensity: 0.8 }));
    var cap = mesh(M.shared.bpCap || (M.shared.bpCap = lathe([[4.8, 0], [4.8, 4.9], [5.3, 5.5], [13.2, 5.25], [14.0, 4.7], [14.4, 3.4], [14.3, 2.1], [13.0, 2.0], [13.0, 0]], { axis: 'y', segs: 32 })), capMat, true);
    g.add(cap);
    return g;
  }

  function paintPSUPanel(ctx, W, H) {
    /* panel 87 × 55 mm, origin at the centre */
    var k = W / 87;
    function X(x) { return (x + 43.5) * k; }
    function Y(y) { return (27.5 - y) * k; }
    ctx.fillStyle = '#25282E';
    ctx.fillRect(0, 0, W, H);
    var g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, 'rgba(255,255,255,0.05)'); g.addColorStop(1, 'rgba(0,0,0,0.08)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    /* display bezel */
    K.rr(ctx, X(-38), Y(22.5), 52 * k, 25 * k, 1.6 * k);
    ctx.fillStyle = '#121418'; ctx.fill();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#AEB4BF';
    ctx.font = '500 ' + Math.round(2.6 * k) + 'px "IBM Plex Mono", Consolas, monospace';
    ctx.fillText('GERİLİM', X(28), Y(25.6));
    ctx.fillText('ÇIKIŞ', X(23), Y(-6.5));
    ctx.fillText('GÜÇ', X(-31), Y(-6.5));
    ctx.fillStyle = '#8A919D';
    ctx.font = '500 ' + Math.round(2.3 * k) + 'px "IBM Plex Mono", Consolas, monospace';
    ctx.fillText('DC GÜÇ KAYNAĞI · 0–12 V', X(-12), Y(-6.5));
    /* knob scale */
    ctx.strokeStyle = '#C9CFDA';
    ctx.lineWidth = 0.35 * k;
    for (var v = 0; v <= 12; v++) {
      var a = (225 - 270 * v / 12) * Math.PI / 180, r0 = 11.2, r1 = v % 3 === 0 ? 13.2 : 12.4;
      ctx.beginPath();
      ctx.moveTo(X(28 + r0 * Math.cos(a)), Y(7.5 + r0 * Math.sin(a)));
      ctx.lineTo(X(28 + r1 * Math.cos(a)), Y(7.5 + r1 * Math.sin(a)));
      ctx.stroke();
      if (v % 3 === 0) {
        ctx.fillStyle = '#AEB4BF';
        ctx.font = '500 ' + Math.round(2.2 * k) + 'px "IBM Plex Mono", Consolas, monospace';
        ctx.fillText(String(v), X(28 + 15.2 * Math.cos(a)), Y(7.5 + 15.2 * Math.sin(a)));
      }
    }
    /* output terminals marks */
    ctx.font = '600 ' + Math.round(3.6 * k) + 'px "IBM Plex Sans", sans-serif';
    ctx.fillStyle = '#C9CFDA'; ctx.fillText('−', X(14), Y(-10.5));
    ctx.fillStyle = '#E36A5C'; ctx.fillText('+', X(32), Y(-10.5));
    /* power switch recess */
    K.rr(ctx, X(-36), Y(-11), 10 * k, 13 * k, 1.2 * k);
    ctx.fillStyle = '#16181C'; ctx.fill();
  }
  function paintPSUDisplay(val) {
    return function (ctx, W, H) {
      ctx.fillStyle = '#0B0E12';
      ctx.fillRect(0, 0, W, H);
      ctx.textBaseline = 'alphabetic';
      ctx.textAlign = 'right';
      ctx.font = '500 ' + Math.round(H * 0.7) + 'px "IBM Plex Mono", Consolas, monospace';
      ctx.fillStyle = '#E8EEF5';
      ctx.shadowColor = 'rgba(200,220,255,0.35)';
      ctx.shadowBlur = H * 0.05;
      ctx.fillText(val, W * 0.8, H * 0.8);
      ctx.shadowBlur = 0;
      ctx.font = '500 ' + Math.round(H * 0.36) + 'px "IBM Plex Mono", Consolas, monospace';
      ctx.textAlign = 'left';
      ctx.fillText('V', W * 0.84, H * 0.8);
    };
  }
  /* Bench DC supply, bottom at y = 0, front face toward +z. Returns posts (world-local) and setVoltage(V). */
  function makePSU(M, fw) {
    var g = new THREE.Group();
    var W = 96, H = 64, D = 112, FT = 2.5, cy = FT + H / 2, fz = D / 2;
    var caseMat = K.mat.std(0xC8CCD2, 0.36, 0.55, { envMapIntensity: 0.85 });
    g.add(mesh(roundBox(W, H, D, 4.5, 4), caseMat, true, true));
    g.children[0].position.y = cy;
    var bezel = mesh(roundBox(W - 5, H - 5, 4, 2.2, 3), K.mat.std(0x24272D, 0.5, 0.1), false, true);
    bezel.position.set(0, cy, fz - 0.6);
    g.add(bezel);
    var panel = mesh(new THREE.PlaneGeometry(87, 55), new THREE.MeshStandardMaterial({ map: fontTex(fw, 1024, 648, paintPSUPanel), roughness: 0.6, metalness: 0.1, envMapIntensity: 0.45 }), false, false);
    panel.position.set(0, cy, fz + 1.42);
    g.add(panel);
    /* display */
    var shown = '';
    var dispDraw = paintPSUDisplay('0,0');
    var dispTex = fontTex(fw, 512, 220, function (ctx, w, h) { dispDraw(ctx, w, h); });
    var disp = mesh(new THREE.PlaneGeometry(48, 20.6), new THREE.MeshBasicMaterial({ map: dispTex, toneMapped: false }), false, false);
    disp.position.set(-12, cy + 10, fz + 1.5);
    g.add(disp);
    var dglass = mesh(new THREE.PlaneGeometry(50, 22.6), glassMat({ color: 0xffffff, opacity: 0.03, fres: 0.25, specA: 0.5, rimAmt: 0, env: 1.4 }), false, false);
    dglass.position.set(-12, cy + 10, fz + 1.9);
    dglass.renderOrder = 6;
    g.add(dglass);
    /* knob */
    var knob = new THREE.Group();
    var kb = mesh(lathe([[0, 0], [0, 9.6], [1.1, 9.6], [1.6, 8.6], [2.0, 8.2], [10.8, 7.9], [11.6, 7.3], [12.0, 6.0], [12.0, 0]], { axis: 'y', segs: 48 }), K.mat.std(0x1C1E23, 0.4, 0.2), true);
    kb.rotation.x = Math.PI / 2;
    knob.add(kb);
    var ptr = mesh(new THREE.BoxGeometry(0.9, 6.2, 0.4), new THREE.MeshBasicMaterial({ color: 0xF2F2EE, toneMapped: false }), false, false);
    ptr.position.set(0, 3.0, 12.05);
    knob.add(ptr);
    knob.position.set(28, cy + 7.5, fz + 1.45);
    g.add(knob);
    /* output posts */
    var pp = makeBindingPost(M, 0xC0322A), pm = makeBindingPost(M, 0x202227);
    [pm, pp].forEach(function (p, i) { p.rotation.x = Math.PI / 2; p.position.set(i ? 32 : 14, cy - 16, fz + 1.4); g.add(p); });
    /* power rocker */
    var rock = mesh(roundBox(8, 11, 4, 1.2, 2), K.mat.std(0x2E3138, 0.45, 0), false);
    rock.position.set(-31, cy - 17.5, fz + 2.6);
    rock.rotation.x = -0.12;
    g.add(rock);
    /* feet */
    [[-40, -46], [40, -46], [-40, 46], [40, 46]].forEach(function (f) {
      var ft = mesh(M.shared.foot || (M.shared.foot = new THREE.CylinderGeometry(4, 4.4, FT + 0.2, 20)), M.blackPlastic(), false);
      ft.position.set(f[0], FT / 2, f[1]);
      g.add(ft);
    });
    return {
      group: g,
      plus: v3(32, cy - 16, fz + 15.5), minus: v3(14, cy - 16, fz + 15.5),
      setVoltage: function (V) {
        var s = fmt(V, 1);
        if (s !== shown) { shown = s; dispDraw = paintPSUDisplay(s); var c = dispTex.image, cx = c.getContext('2d'); dispDraw(cx, c.width, c.height); dispTex.needsUpdate = true; }
        knob.rotation.z = -(270 * V / 12 - 135) * Math.PI / 180;
      }
    };
  }

  function paintMeterScale(ctx, W, H) {
    /* plate 66 × 46 mm, pivot at (0, −19) */
    var k = W / 66;
    function X(x) { return (x + 33) * k; }
    function Y(y) { return (23 - y) * k; }
    ctx.fillStyle = '#F7F6F1';
    ctx.fillRect(0, 0, W, H);
    var px = 0, py = -19, R = 38, i, a;
    /* anti-parallax mirror arc */
    ctx.lineWidth = 2.2 * k;
    var mg = ctx.createLinearGradient(X(-30), 0, X(30), 0);
    mg.addColorStop(0, '#B9BEC6'); mg.addColorStop(0.5, '#E9ECF0'); mg.addColorStop(1, '#AEB3BB');
    ctx.strokeStyle = mg;
    ctx.beginPath();
    ctx.arc(X(px), Y(py), (R + 2.6) * k, -Math.PI / 2 - 0.9, -Math.PI / 2 + 0.9);
    ctx.stroke();
    ctx.strokeStyle = '#1D1F24';
    for (i = 0; i <= 50; i++) {
      var v = i * 2;
      a = (-50 + v) * Math.PI / 180;
      var len = v % 20 === 0 ? 4.6 : v % 10 === 0 ? 3.4 : 2.2;
      ctx.lineWidth = (v % 10 === 0 ? 0.42 : 0.26) * k;
      ctx.beginPath();
      ctx.moveTo(X(px + R * Math.sin(a)), Y(py + R * Math.cos(a)));
      ctx.lineTo(X(px + (R - len) * Math.sin(a)), Y(py + (R - len) * Math.cos(a)));
      ctx.stroke();
    }
    ctx.lineWidth = 0.4 * k;
    ctx.beginPath();
    ctx.arc(X(px), Y(py), R * k, -Math.PI / 2 - 50 * Math.PI / 180, -Math.PI / 2 + 50 * Math.PI / 180);
    ctx.stroke();
    ctx.fillStyle = '#15171C';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '500 ' + Math.round(5 * k) + 'px "IBM Plex Mono", Consolas, monospace';
    for (i = 0; i <= 5; i++) {
      a = (-50 + i * 20) * Math.PI / 180;
      ctx.fillText(String(i * 20), X(px + (R - 8.4) * Math.sin(a)), Y(py + (R - 8.4) * Math.cos(a)));
    }
    ctx.font = '600 ' + Math.round(7.2 * k) + 'px "IBM Plex Sans", sans-serif';
    ctx.fillText('mA', X(0), Y(1.5));
    ctx.font = '500 ' + Math.round(3.6 * k) + 'px "IBM Plex Mono", monospace';
    ctx.fillStyle = '#595E69';
    ctx.fillText('DC · 0–100 mA', X(0), Y(-6));
  }
  function paintMeterBase(ctx, W, H) {
    ctx.fillStyle = '#2A2D33';
    ctx.fillRect(0, 0, W, H);
    var k = W / 66;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '600 ' + Math.round(4 * k) + 'px "IBM Plex Sans", sans-serif';
    ctx.fillStyle = '#E36A5C'; ctx.fillText('+', (33 - 17) * k, 4.2 * k);
    ctx.fillStyle = '#C9CFDA'; ctx.fillText('−', (33 + 17) * k, 4.2 * k);
    ctx.font = '500 ' + Math.round(2.3 * k) + 'px "IBM Plex Mono", Consolas, monospace';
    ctx.fillStyle = '#9AA3B2';
    ctx.fillText('AMPERMETRE', 33 * k, 15.2 * k);
  }
  /* Analog panel ammeter 0–100 mA, bottom at y = 0, front toward +z. */
  function makeAmmeter(M, fw) {
    var g = new THREE.Group();
    var W = 76, H = 76, D = 40, FT = 2, fz = D / 2;
    var housing = mesh(roundBox(W, H, D, 5, 4), K.mat.std(0x2B2E35, 0.42, 0.05, { envMapIntensity: 0.7 }), true, true);
    housing.position.y = FT + H / 2;
    g.add(housing);
    var plateY = FT + H - 7 - 23;
    var plate = mesh(new THREE.PlaneGeometry(66, 46), new THREE.MeshStandardMaterial({ map: fontTex(fw, 1024, 714, paintMeterScale), roughness: 0.62, envMapIntensity: 0.4 }), false, true);
    plate.position.set(0, plateY, fz + 0.06);
    g.add(plate);
    /* bezel frame around the window */
    var fm = K.mat.std(0x1D2025, 0.4, 0.2);
    [[0, 23.9, 68.5, 1.8], [0, -23.9, 68.5, 1.8], [-33.9, 0, 1.8, 49.6], [33.9, 0, 1.8, 49.6]].forEach(function (b) {
      var bx = mesh(new THREE.BoxGeometry(b[2], b[3], 3.2), fm, false, false);
      bx.position.set(b[0], plateY + b[1], fz + 1.2);
      g.add(bx);
    });
    var win = mesh(new THREE.PlaneGeometry(66, 46), glassMat({ color: 0xffffff, opacity: 0.04, fres: 0.35, specA: 0.55, rimAmt: 0, env: 1.5 }), false, false);
    win.position.set(0, plateY, fz + 2.6);
    win.renderOrder = 6;
    g.add(win);
    /* needle on its pivot */
    var pivot = new THREE.Group();
    pivot.position.set(0, plateY - 19, fz + 0.9);
    var ns = new THREE.Shape();
    ns.moveTo(-0.55, -5.5); ns.lineTo(0.55, -5.5); ns.lineTo(0.42, 0); ns.lineTo(0.12, 39.5); ns.lineTo(-0.12, 39.5); ns.lineTo(-0.42, 0); ns.closePath();
    var needle = mesh(new THREE.ExtrudeGeometry(ns, { depth: 0.25, bevelEnabled: false }), K.mat.std(0x15171C, 0.5, 0.1), false, false);
    pivot.add(needle);
    /* soft shadow of the needle on the dial (the needle floats a millimetre above the plate) */
    var nShadow = mesh(new THREE.ShapeGeometry(ns), new THREE.MeshBasicMaterial({ color: 0x20242B, transparent: true, opacity: 0.2, depthWrite: false }), false, false);
    nShadow.position.set(0.9, -1.1, -0.72);
    nShadow.renderOrder = 3;
    pivot.add(nShadow);
    var cw = mesh(new THREE.CylinderGeometry(1.9, 1.9, 0.6, 20), K.mat.std(0x15171C, 0.4, 0.3), false, false);
    cw.rotation.x = Math.PI / 2; cw.position.set(0, -5.6, 0.2);
    pivot.add(cw);
    var cap = mesh(lathe([[0, 2.6], [0.8, 2.4], [1.6, 1.6], [1.9, 0]], { axis: 'y', segs: 20 }), K.mat.std(0x101114, 0.35, 0.3), false, false);
    cap.rotation.x = Math.PI / 2; cap.position.z = 0.3;
    pivot.add(cap);
    g.add(pivot);
    /* lower panel with terminals */
    var base = mesh(new THREE.PlaneGeometry(66, 19), new THREE.MeshStandardMaterial({ map: fontTex(fw, 1024, 296, paintMeterBase), roughness: 0.55, envMapIntensity: 0.4 }), false, false);
    base.position.set(0, FT + 12.5, fz + 0.06);
    g.add(base);
    var pp = makeBindingPost(M, 0xC0322A), pm = makeBindingPost(M, 0x202227);
    [pp, pm].forEach(function (p, i) { p.rotation.x = Math.PI / 2; p.scale.setScalar(0.85); p.position.set(i ? 17 : -17, FT + 8.4, fz); g.add(p); });
    var screw = mesh(new THREE.CylinderGeometry(2.1, 2.1, 1, 20), M.nickel(), false);
    screw.rotation.x = Math.PI / 2;
    screw.position.set(0, plateY - 26.6, fz + 0.5);
    g.add(screw);
    /* needle dynamics (slightly under-damped, like a real moving-coil meter) */
    var ang = -50, vel = 0;
    return {
      group: g,
      plus: v3(-17, FT + 8.4, fz + 12), minus: v3(17, FT + 8.4, fz + 12),
      update: function (mA, dt) {
        var target = -50 + clamp(mA, -2, 104) * 1.0;
        var steps = Math.max(1, Math.ceil(dt / 0.01)), h = dt / steps;
        for (var i = 0; i < steps; i++) {
          var acc = 60 * (target - ang) - 9.5 * vel;
          vel += acc * h; ang += vel * h;
          if (ang > 54) { ang = 54; vel = -Math.abs(vel) * 0.3; }
          if (ang < -52) { ang = -52; vel = Math.abs(vel) * 0.3; }
        }
        pivot.rotation.z = -ang * Math.PI / 180;
      },
      reset: function () { ang = -50; vel = 0; pivot.rotation.z = 50 * Math.PI / 180; }
    };
  }

  /* Brass terminal pillar for the resistor stand (y up), lead clamp at h ≈ 20. */
  function pillarGeo() {
    return lathe([[0, 0], [0, 4.6], [0.4, 4.9], [1.8, 4.9], [2.3, 3.4], [2.4, 2.1], [17.6, 2.1], [17.7, 4.1], [18.1, 4.35], [19.2, 4.35], [19.4, 2.4], [21.1, 2.4], [21.3, 4.35], [24.2, 4.35], [24.6, 3.8], [25.0, 2.2], [25.1, 0]], { axis: 'y', segs: 28 });
  }

  /* =====================================================================
   * ohm-lab · S 680×520 · light
   * ===================================================================== */
  function mAText(mA) {
    if (mA >= 99.95) return fmt(mA, 0);
    var r = Math.round(mA);
    return Math.abs(mA - r) < 0.05 ? fmt(r, 0) : fmt(mA, 1);
  }
  function vText(V) { return Math.abs(V - Math.round(V)) < 1e-6 ? fmt(V, 0) : fmt(V, 1); }

  K.register('ohm-lab', function (el, opts) {
    var v = K.stage3d(el, {
      theme: opts.theme || 'light', fov: 26, distance: 480, yaw: 0.06, pitch: 0.42, target: [0, 22, 18],
      size: 170, ground: -6, near: 4, far: 5000, minPitch: 0.1, maxPitch: 1.2, minDistance: 260, maxDistance: 800
    });
    v.exposure = 0.66;
    var M = Mats(), fw = FontWatch();
    /* bench mat */
    var matTex = colorTex(512, 512, function (ctx, w, h) {
      ctx.fillStyle = '#CBD1D6'; ctx.fillRect(0, 0, w, h);
      var rng = K.rng(3);
      for (var i = 0; i < 9000; i++) { ctx.fillStyle = 'rgba(' + (rng() < 0.5 ? '255,255,255' : '40,50,60') + ',' + (0.03 + rng() * 0.05) + ')'; ctx.fillRect(rng() * w, rng() * h, 1.5, 1.5); }
    });
    matTex.wrapS = matTex.wrapT = THREE.RepeatWrapping;
    matTex.repeat.set(3, 2);
    var bench = mesh(roundBox(340, 6, 214, 2.6, 3), new THREE.MeshStandardMaterial({ map: matTex, roughness: 0.88, envMapIntensity: 0.4 }), true, true);
    bench.position.set(0, -3, 6);
    v.scene.add(bench);

    var psu = makePSU(M, fw);
    psu.group.position.set(-88, 0, -40);
    psu.group.rotation.y = 0.16;
    v.scene.add(psu.group);
    var meter = makeAmmeter(M, fw);
    meter.group.position.set(92, 0, -34);
    meter.group.rotation.y = -0.2;
    v.scene.add(meter.group);

    /* resistor on its stand (resistor drawn 4× magnified) */
    var RS = 4, PX = 31;
    var stand = new THREE.Group();
    stand.position.set(0, 0, 70);
    v.scene.add(stand);
    var sbase = mesh(roundBox(86, 9, 30, 3, 3), K.mat.std(0x33363C, 0.5, 0.05, { envMapIntensity: 0.6 }), true, true);
    sbase.position.y = 4.5;
    stand.add(sbase);
    var plate = mesh(new THREE.PlaneGeometry(40, 9), new THREE.MeshStandardMaterial({ map: fontTex(fw, 640, 144, function (ctx, w, h) {
      ctx.fillStyle = '#33363C'; ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#AEB4BF'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = '500 ' + Math.round(h * 0.42) + 'px "IBM Plex Mono", Consolas, monospace';
      ctx.fillText('DİRENÇ', w / 2, h / 2);
    }), roughness: 0.5 }), false, false);
    plate.position.set(0, 4.5, 15.05);
    stand.add(plate);
    var pg = pillarGeo(), brass = M.brass();
    [-PX, PX].forEach(function (x) { var p = mesh(pg, brass, true); p.position.set(x, 9, 0); stand.add(p); });
    var res = makeResistor(M, { value: 470, leads: { type: 'straight', len: PX / RS - RES.L / 2 - 0.3 } });
    res.group.scale.setScalar(RS);
    res.group.position.set(0, 9 + 20.2, 0);
    stand.add(res.group);

    /* test leads (Ø 3 mm silicone) */
    function leadMat(c) { return K.mat.std(c, 0.5, 0, { envMapIntensity: 0.6 }); }
    function wpt(o, p) { return o.group.localToWorld(p.clone()); }
    v.scene.updateMatrixWorld(true);
    var pPlus = wpt(psu, psu.plus), pMinus = wpt(psu, psu.minus);
    var mPlus = wpt(meter, meter.plus), mMinus = wpt(meter, meter.minus);
    var sL = v3(-PX, 13, 70 + 2.6), sR = v3(PX, 13, 70 + 2.6);
    function cable(pts, color) {
      var c = new THREE.CatmullRomCurve3(pts, false, 'centripetal');
      var m = mesh(new THREE.TubeGeometry(c, 160, 1.5, 12, false), leadMat(color), true, true);
      v.scene.add(m);
      return c;
    }
    var redC = cable([pPlus, pPlus.clone().add(v3(3, -3, 9)), v3(pPlus.x + 16, 1.6, pPlus.z + 2), v3(-14, 1.6, -40), v3(30, 1.6, -44), v3(mPlus.x - 14, 1.6, mPlus.z + 6), mPlus.clone().add(v3(-1, -3, 9)), mPlus], 0xC0322A);
    var yelC = cable([mMinus, mMinus.clone().add(v3(2, -3, 9)), v3(mMinus.x + 4, 1.6, mMinus.z + 28), v3(72, 1.6, 76), v3(48, 1.6, 82), v3(sR.x + 7, 3, sR.z + 5), sR], 0xE6B422);
    var blkC = cable([sL, v3(sL.x - 7, 3, sL.z + 5), v3(-50, 1.6, 82), v3(-74, 1.6, 66), v3(pMinus.x - 6, 1.6, pMinus.z + 24), pMinus.clone().add(v3(-1, -3, 9)), pMinus], 0x23252B);
    /* banana plugs */
    [[pPlus, 0xC0322A], [mPlus, 0xC0322A], [mMinus, 0xE6B422], [pMinus, 0x23252B]].forEach(function (b) {
      var pl = mesh(M.shared.plug || (M.shared.plug = new THREE.CylinderGeometry(2.6, 2.4, 9, 20)), leadMat(b[1]), true);
      pl.position.copy(b[0]);
      v.scene.add(pl);
    });
    /* electron path: PSU − → black lead → resistor (left → right) → yellow lead → meter − … meter + → red lead → PSU + */
    function L3(a, b) { return new THREE.LineCurve3(a, b); }
    function rev(c) { return new THREE.CatmullRomCurve3(c.getSpacedPoints(120).reverse()); }
    var rY = 9 + 20.2, sz = 70;
    var segs = [
      { curve: rev(blkC), lift: 1.7 },
      { curve: L3(sL, v3(-PX, rY, sz)), lift: 2.4 },
      { curve: L3(v3(-PX, rY, sz), v3(PX, rY, sz)), lift: 1.4 },
      { curve: L3(v3(PX, rY, sz), sR), lift: 2.4 },
      { curve: rev(yelC), lift: 1.7 },
      { curve: L3(mMinus, mPlus), lift: -1 },
      { curve: rev(redC), lift: 1.7 },
      { curve: L3(pPlus, pMinus), lift: -1 }
    ];
    var lut = PathLUT(segs, 0.8);
    var NDOT = 64;
    var dots = Dots(v, M, NDOT, 1.3);

    /* labels */
    var lab = {
      psu: lbl(v, 'güç kaynağı', { at: [-88, 70, -40], cls: 'name', dx: -10, dy: -22, align: 'center' }),
      meter: lbl(v, 'ampermetre', { at: [92, 80, -34], cls: 'name', dx: 0, dy: -22, align: 'center' }),
      res: lbl(v, '', { at: [0, 4, 86], cls: 'value chip', html: true, dx: 0, dy: 30, line: false, align: 'center', valign: 'top' }),
      over: lbl(v, 'ölçek sonu: akım 100 mA\'i aştı', { at: [92, 80, -34], cls: 'tag chip', dx: 0, dy: -50, align: 'center' })
    };
    var corner = cornerTag(v, 'ölçekli değil · elektron hızı abartılı', 'bl');

    var S = {};
    function reset() {
      S = { V: 9, R: 450, Vout: 0, auto: true, offset: 0, shownR: -1, view: S && S.view ? S.view : 'all' };
      meter.reset();
      psu.setVoltage(0);
      res.setValue(nearestE12(450), false);
      v.setView({ yaw: 0.06, pitch: 0.42, distance: fitDist(v, 480, 1.31, 0.8), target: [0, 26, 22] });
    }
    reset();
    function resLabel() {
      var e = nearestE12(S.R);
      var html = '<span style="font-family:' + K.fonts.mono + '">' + fmt(S.R, 0) + ' Ω</span>';
      if (e !== S.R) html += '<br><span style="font:400 15px/1.3 ' + K.fonts.sans + ';color:#595E69">renk halkaları: en yakın standart ' + fmt(e, 0) + ' Ω</span>';
      lab.res.set(html);
    }
    resLabel();
    /* auto-demo (deck sliders follow via read): halve V → I halves; double R → I halves */
    var DEMOS = {
      all: [[[0, 9, 450], [6, 4.5, 450], [10, 9, 450], [14, 9, 900], [18, 9, 450]], 22],
      voltage: [[[0, 3, 450], [6, 9, 450], [12, 6, 450], [18, 9, 450]], 24],
      resistance: [[[0, 9, 300], [6, 9, 900], [12, 9, 450], [18, 9, 300]], 24]
    };
    function demo(t) {
      var D = DEMOS[S.view] || DEMOS.all, c = t % D[1], row = D[0][0];
      for (var i = 0; i < D[0].length; i++) if (c >= D[0][i][0]) row = D[0][i];
      return row;
    }
    function applyR(R) {
      if (R === S.R) return;
      S.R = R;
      var e = nearestE12(R);
      if (e !== res.value) res.setValue(e, true);
    }
    function frame(t, dt) {
      fw.tick();
      if (S.auto && !K.reducedMotion) { var d = demo(t); S.V = d[1]; applyR(d[2]); }
      /* power-on ramp at the start, then follow the knob */
      var rate = t < 1.2 ? 2.2 : 4;
      S.Vout = approach(S.Vout, t < 0.35 && S.auto ? 0 : S.V, rate, dt);
      if (Math.abs(S.Vout - S.V) < 0.004) S.Vout = S.V;
      psu.setVoltage(S.Vout);
      var mA = S.Vout / S.R * 1000;
      meter.update(mA, dt);
      res.update(dt);
      if (S.shownR !== S.R) { S.shownR = S.R; resLabel(); }
      /* electrons: speed ∝ current */
      var speed = (K.reducedMotion ? 0.12 : 0.42) * mA;
      S.offset += speed * dt;
      dots.update(lut, -S.offset, lut.len / NDOT, null, mA < 0.05 ? 0 : NDOT);
      lab.over.show(mA > 100.5);
      corner.show(true);
      prep.track(Math.round(S.Vout * 20));
      v.render(dt);
    }
    var prep = Prep(v);
    return {
      reset: reset,
      frame: frame,
      set: function (key, val) {
        if (key === 'view') { S.view = String(val); S.auto = true; return; }
        S.auto = false;
        if (key === 'voltage') S.V = clamp(Math.round(+val * 2) / 2, 0, 12);
        else if (key === 'resistance') applyR(clamp(Math.round(+val / 50) * 50, 100, 1000));
      },
      read: function (key) {
        var I = S.V / S.R, mA = I * 1000;
        if (key === 'voltage') return fmt(S.V, 1) + ' V';
        if (key === 'resistance') return fmt(S.R, 0) + ' Ω';
        if (key === 'current') return mAText(mA) + ' mA';
        if (key === 'formula') {
          var mAr = mA >= 99.95 ? Math.round(mA) : Math.round(mA * 10) / 10;
          var eq = Math.abs(mA - mAr) < 1e-9 ? ' = ' : ' ≈ ';
          return 'I = ' + vText(S.V) + ' V ÷ ' + fmt(S.R, 0) + ' Ω' + eq + fmt(mAr / 1000, mAr % 1 ? 4 : 3) + ' A = ' + mAText(mAr) + ' mA';
        }
        return '';
      },
      dispose: function () { v.dispose(); }
    };
  });

  /* =====================================================================
   * School-kit parts on a wooden board (circuit-loop, series-parallel)
   * ===================================================================== */

  function paintWood(seed, base) {
    return function (ctx, W, H) {
      ctx.fillStyle = base || '#D9BC93';
      ctx.fillRect(0, 0, W, H);
      var rng = K.rng(seed || 21), i, x;
      for (i = 0; i < 150; i++) {
        var y0 = rng() * H, amp = 2 + rng() * 7, f = 0.002 + rng() * 0.004, ph = rng() * 6, dark = rng() < 0.6;
        ctx.strokeStyle = dark ? 'rgba(120,80,40,' + (0.035 + rng() * 0.06) + ')' : 'rgba(255,240,215,' + (0.05 + rng() * 0.07) + ')';
        ctx.lineWidth = 0.6 + rng() * 2.2;
        ctx.beginPath();
        for (x = 0; x <= W; x += 16) {
          var y = y0 + Math.sin(x * f + ph) * amp + Math.sin(x * f * 3.1 + ph * 2) * amp * 0.3;
          if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
      for (i = 0; i < 2600; i++) { ctx.fillStyle = 'rgba(110,70,30,' + (0.02 + rng() * 0.04) + ')'; ctx.fillRect(rng() * W, rng() * H, 1 + rng() * 6, 1); }
    };
  }
  /* wooden base board: w × d, thickness t, top at y = t */
  function makeBoard(w, d, t, seed) {
    var tex = colorTex(1024, Math.round(1024 * d / w), paintWood(seed));
    tex.anisotropy = 8;
    var m = mesh(roundBox(w, t, d, 3, 3), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.72, envMapIntensity: 0.45 }), true, true);
    m.position.y = t / 2;
    return m;
  }
  /* brass screw terminal head with washer, standing on y = 0 */
  function makeScrew(M) {
    var g = new THREE.Group();
    var w = mesh(M.shared.washer || (M.shared.washer = lathe([[0, 0.9], [0, 4.0], [0.3, 4.2], [0.8, 4.2], [0.8, 0.9]], { axis: 'y', segs: 24 })), M.nickel(), false);
    g.add(w);
    var h = mesh(M.shared.screwHead || (M.shared.screwHead = lathe([[0.8, 0], [0.8, 3.2], [1.8, 3.15], [2.6, 2.6], [3.0, 1.4], [3.1, 0]], { axis: 'y', segs: 28 })), M.brass(), true);
    g.add(h);
    var slot = mesh(M.shared.screwSlot || (M.shared.screwSlot = new THREE.BoxGeometry(5.2, 0.8, 0.7)), K.mat.std(0x6B5A34, 0.6, 0.6), false);
    slot.position.y = 3.05;
    g.add(slot);
    return g;
  }

  /* ---------- AA cell (50,5 × 14,5 mm) lying along +x, − end at x = 0, axis at y = 0 ---------- */
  function paintAALabel(ctx, W, H) {
    /* u = along the cell (− → +, 47 mm), v = around (≈ 46 mm): near-isotropic canvas.
     * Print is centred where the cell faces an observer above and in front (θ ≈ 0,7 rad) and repeated opposite. */
    var mm = W / 47;
    ctx.fillStyle = '#2C3038';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#B8BCC6';
    ctx.fillRect(W * 0.865, 0, 0.5 * mm, H);
    ctx.save();
    ctx.translate(0, H);
    ctx.scale(1, -1);
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';
    for (var k = 0; k < 2; k++) {
      var cy = H * (0.7 / TAU + k * 0.5);
      ctx.fillStyle = '#F1EFE8';
      ctx.font = '600 ' + Math.round(6.2 * mm) + 'px "IBM Plex Sans", "Segoe UI", sans-serif';
      ctx.fillText('1,5 V', W * 0.33, cy);
      ctx.fillStyle = '#AEB4BF';
      ctx.font = '500 ' + Math.round(2.4 * mm) + 'px "IBM Plex Mono", Consolas, monospace';
      ctx.fillText('AA · LR6', W * 0.69, cy);
      ctx.fillStyle = '#E39A6C';
      ctx.font = '600 ' + Math.round(4.2 * mm) + 'px "IBM Plex Sans", sans-serif';
      ctx.fillText('+', W * 0.93, cy);
    }
    ctx.restore();
  }
  function makeAACell(M, fw) {
    var g = new THREE.Group(), R = 7.25, L = 50.5;
    var can = lathe([[0.05, 0], [0.05, 5.6], [0, 6.2], [0.25, 6.9], [0.6, 7.2], [1.0, R], [L - 2.2, R], [L - 1.7, 7.1], [L - 1.5, 6.4], [L - 1.5, 2.9], [L - 1.3, 2.8], [L - 0.2, 2.7], [L, 2.35], [L, 0]], { axis: 'x', segs: 40 });
    g.add(mesh(can, M.nickel(), true));
    var tex = M.shared.aaTex || (M.shared.aaTex = fontTex(fw, 1024, 1000, paintAALabel));
    var lab = lathe([[1.1, R - 0.05], [1.3, R + 0.06], [L - 2.6, R + 0.06], [L - 2.4, R - 0.05]], { axis: 'x', segs: 40, h0: 1.3, h1: L - 2.6 });
    g.add(mesh(lab, M.shared.aaMat || (M.shared.aaMat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.4, metalness: 0.05, envMapIntensity: 0.75 })), true));
    return g;
  }
  /* In-line 2 × AA holder along x (− end at −x), bottom at y = 0. Returns terminals (local). */
  function makeAAHolder(M, fw) {
    var g = new THREE.Group(), Lc = 50.5, len = 2 * Lc + 10, w = 17.5;
    var pl = M.shared.holderMat || (M.shared.holderMat = K.mat.std(0x22252B, 0.5, 0, { envMapIntensity: 0.6 }));
    var base = mesh(roundBox(len, 3, w, 1.2, 2), pl, true, true);
    base.position.y = 1.5;
    g.add(base);
    [-1, 1].forEach(function (s) {
      var rail = mesh(roundBox(len - 8, 6.5, 1.6, 0.6, 2), pl, true, true);
      rail.position.set(0, 3 + 3.25 - 0.5, s * (w / 2 - 0.8));
      g.add(rail);
      var end = mesh(roundBox(5, 15, w, 1.4, 2), pl, true, true);
      end.position.set(s * (len / 2 - 2.5), 7.5, 0);
      g.add(end);
    });
    var cy = 3 + 7.25;
    var c1 = makeAACell(M, fw), c2 = makeAACell(M, fw);
    c1.position.set(-Lc - 0.2 + 1.2, cy, 0);
    c2.position.set(0.2 + 1.2, cy, 0);
    g.add(c1, c2);
    /* − spring and + plate */
    var pts = [];
    for (var i = 0; i <= 120; i++) { var a = i / 120 * 5 * TAU; pts.push(v3(-len / 2 + 5 + i / 120 * 2.6, cy + 3.2 * Math.cos(a), 3.2 * Math.sin(a))); }
    g.add(mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 200, 0.32, 6, false), M.nickel(), false));
    var plate = mesh(new THREE.BoxGeometry(0.6, 9, 9), M.nickel(), false);
    plate.position.set(len / 2 - 5.3, cy, 0);
    g.add(plate);
    return { group: g, minus: v3(-len / 2 - 0.5, cy, 0), plus: v3(len / 2 + 0.5, cy, 0), len: len };
  }

  /* ---------- knife switch (school kit), along x: hinge at −x, jaws at +x; bottom at y = 0 ---------- */
  function makeKnifeSwitch(M) {
    var g = new THREE.Group();
    var porcelain = M.shared.porc || (M.shared.porc = K.mat.std(0xF3F1EA, 0.28, 0, { envMapIntensity: 0.8 }));
    var base = mesh(roundBox(56, 6, 22, 2.2, 3), porcelain, true, true);
    base.position.y = 3;
    g.add(base);
    var brass = M.brass();
    var PX = -15, PY = 15;
    [-1, 1].forEach(function (s) {
      var hp = mesh(roundBox(7, 12, 1.4, 0.4, 2), brass, true);
      hp.position.set(PX, 6 + 6, s * 2.3);
      g.add(hp);
      var jp = mesh(roundBox(6, 10, 1.3, 0.4, 2), brass, true);
      jp.position.set(13, 6 + 5, s * 1.55);
      jp.rotation.x = -s * 0.06;
      g.add(jp);
    });
    var pin = mesh(new THREE.CylinderGeometry(1.1, 1.1, 6.8, 16), M.nickel(), false);
    pin.rotation.x = Math.PI / 2;
    pin.position.set(PX, PY, 0);
    g.add(pin);
    var blade = new THREE.Group();
    blade.position.set(PX, PY, 0);
    var bar = mesh(roundBox(36, 4.6, 1.6, 0.5, 2), M.copper(), true);
    bar.position.set(17, 0, 0);
    blade.add(bar);
    var grip = mesh(lathe([[0, 0], [0, 2.4], [1.2, 3.1], [9.5, 3.1], [11.2, 2.4], [11.6, 0]], { axis: 'x', segs: 28 }), M.blackPlastic(), true);
    grip.position.set(34.5, 0, 0);
    blade.add(grip);
    g.add(blade);
    var sL = makeScrew(M), sR = makeScrew(M);
    sL.position.set(-24, 6, 0); sR.position.set(22, 6, 0);
    g.add(sL, sR);
    return {
      group: g, blade: blade, termL: v3(-24, 9.2, 0), termR: v3(22, 9.2, 0),
      /* open 0..1 → blade angle */
      setOpen: function (k) { blade.rotation.z = EZ.inOut(clamp(k, 0, 1)) * 0.95; }
    };
  }

  /* ---------- E10 lamp holder with a bulb; bottom at y = 0 ---------- */
  function makeLampHolder(M, gt, o) {
    o = o || {};
    var g = new THREE.Group();
    var bm = M.shared.holderDark || (M.shared.holderDark = K.mat.std(0x2C2F36, 0.5, 0.02, { envMapIntensity: 0.6 }));
    var base = mesh(roundBox(34, 7, 26, 2.2, 3), bm, true, true);
    base.position.y = 3.5;
    g.add(base);
    var collar = mesh(M.shared.collar || (M.shared.collar = lathe([[0, 7.2], [0.6, 7.6], [7.8, 7.6], [8.6, 7.1], [9.2, 6.4], [9.2, 5.3], [8.2, 5.25], [1.6, 5.25]], { axis: 'y', segs: 40 })), M.brass(), true);
    collar.position.y = 7;
    g.add(collar);
    var bulbRig = new THREE.Group();
    bulbRig.position.y = 7 + 0.9;
    var bulb = makeBulb(M, { glowTex: gt, light: !!o.light, lightDist: o.lightDist || 90, lightMax: o.lightMax || 1.2, boost: o.boost });
    bulbRig.add(bulb.group);
    g.add(bulbRig);
    var sL = makeScrew(M), sR = makeScrew(M);
    sL.position.set(-12.5, 7, 6.5); sR.position.set(12.5, 7, 6.5);
    g.add(sL, sR);
    return { group: g, bulb: bulb, bulbRig: bulbRig, termL: v3(-12.5, 10.2, 6.5), termR: v3(12.5, 10.2, 6.5) };
  }

  /* ---------- 5 × 20 mm glass fuse in a holder, along x; bottom at y = 0 ---------- */
  function makeFuseHolder(M, gt) {
    var g = new THREE.Group();
    var bm = M.shared.holderDark || (M.shared.holderDark = K.mat.std(0x2C2F36, 0.5, 0.02, { envMapIntensity: 0.6 }));
    var base = mesh(roundBox(44, 5, 13, 1.6, 2), bm, true, true);
    base.position.y = 2.5;
    g.add(base);
    var FY = 5 + 6.2;
    /* spring clips */
    [-1, 1].forEach(function (s) {
      [-1, 1].forEach(function (t) {
        var leaf = mesh(M.shared.clipLeaf || (M.shared.clipLeaf = roundBox(4.2, 8.6, 0.5, 0.2, 1)), M.tin(), true);
        leaf.position.set(s * 7.5, 5 + 4.3, t * 2.75);
        leaf.rotation.x = t * 0.08;
        g.add(leaf);
      });
      var foot = mesh(new THREE.BoxGeometry(4.4, 0.6, 6.4), M.tin(), false);
      foot.position.set(s * 7.5, 5.2, 0);
      g.add(foot);
    });
    /* fuse body */
    var fuse = new THREE.Group();
    fuse.position.y = FY;
    var capGeo = M.shared.fuseCap || (M.shared.fuseCap = lathe([[0, 0], [0, 2.45], [0.25, 2.65], [6, 2.65], [6, 2.4]], { axis: 'x', segs: 28 }));
    var cL = mesh(capGeo, M.nickel(), true), cR = mesh(capGeo, M.nickel(), true);
    cL.position.x = -10; cR.rotation.y = Math.PI; cR.position.x = 10;
    fuse.add(cL, cR);
    var gl = glassMat({ color: 0xF4F6F8, opacity: 0.06, fres: 0.5, specA: 0.6, rim: 0x4E5864, rimAmt: 0.45, emissive: 0xFFB060, env: 1.3 });
    var glass = mesh(lathe([[-4.2, 2.35], [4.2, 2.35]], { axis: 'x', segs: 32 }), gl, false, false);
    glass.renderOrder = 5;
    fuse.add(glass);
    /* the fuse wire (drawn thicker than reality so it can be seen), in two halves so it can part in the middle */
    var wMat = new THREE.MeshStandardMaterial({ color: 0x8E939B, roughness: 0.35, metalness: 0.9, emissive: 0xFF8A2A, emissiveIntensity: 0, toneMapped: false, transparent: true, opacity: 1 });
    var hw = new THREE.CylinderGeometry(0.3, 0.3, 7.2, 10);
    hw.rotateZ(Math.PI / 2);
    hw.translate(-3.6, 0, 0);
    var wl = mesh(hw, wMat, false, false), wr = mesh(hw, wMat, false, false);
    wr.rotation.y = Math.PI;
    var beadG = new THREE.SphereGeometry(0.62, 14, 10);
    var bl = mesh(beadG, wMat, false, false), br = mesh(beadG, wMat, false, false);
    bl.visible = br.visible = false;
    [wl, wr, bl, br].forEach(function (m) { m.renderOrder = 4; });
    var soot = mesh(lathe([[-2.2, 2.3], [2.2, 2.3]], { axis: 'x', segs: 24 }), new THREE.MeshBasicMaterial({ color: 0x45403A, transparent: true, opacity: 0, depthWrite: false }), false, false);
    soot.renderOrder = 6;
    fuse.add(wl, wr, bl, br, soot);
    var glow = gt ? glowSprite(gt, 0xFF9A40, 14, false) : null;
    if (glow) { glow.renderOrder = 7; fuse.add(glow); }
    g.add(fuse);
    var sL = makeScrew(M), sR = makeScrew(M);
    sL.position.set(-17.5, 5, 0); sR.position.set(17.5, 5, 0);
    g.add(sL, sR);
    return {
      group: g, fuse: fuse, termL: v3(-17.5, 8.2, 0), termR: v3(17.5, 8.2, 0), wireL: v3(-6.9, FY, 0), wireR: v3(6.9, FY, 0),
      /* heat 0..1 glow; broken 0..1 parts the wire; flash 0..1 the moment it melts */
      set: function (heat, broken, flash) {
        flash = flash || 0;
        wMat.emissiveIntensity = heat * 2.8 + flash * 4;
        wMat.emissive.setRGB(1, 0.42 + heat * 0.4, 0.1 + heat * 0.35 + flash * 0.4);
        gl.emissiveIntensity = heat * 0.3 + flash * 0.6;
        var gap = sstep(0, 1, broken) * 2.6;
        wl.scale.x = wr.scale.x = Math.max(0.05, (7.2 - gap) / 7.2);
        bl.visible = br.visible = broken > 0.05;
        bl.position.x = -gap; br.position.x = gap;
        soot.material.opacity = sstep(0, 1, broken) * 0.38;
        if (glow) {
          glow.material.opacity = Math.min(1, heat * 0.55 + flash * 0.9);
          var s = 10 + heat * 6 + flash * 14;
          glow.scale.set(s, s, 1);
        }
      }
    };
  }

  /* =====================================================================
   * circuit-loop · S 680×520 · light
   * Loop: 2 × AA → knife switch → fuse → lamp → back (electrons from − to +).
   * ===================================================================== */
  K.register('circuit-loop', function (el, opts) {
    var HOME = { yaw: 0.12, pitch: 0.86, distance: 350, target: [2, 4, -2] };
    var SHORTV = { yaw: 0.22, pitch: 0.74, distance: 190, target: [26, 16, -30] };
    var FUSEV = { yaw: 0.16, pitch: 0.66, distance: 92, target: [-2, 17, -33] };
    var v = K.stage3d(el, {
      theme: opts.theme || 'light', fov: 28, distance: HOME.distance, yaw: HOME.yaw, pitch: HOME.pitch, target: HOME.target,
      size: 130, ground: 0, near: 4, far: 5000, minPitch: 0.2, maxPitch: 1.35, minDistance: 150, maxDistance: 700
    });
    v.exposure = 0.64;
    softEdge(el, 5);
    HOME.distance = fitDist(v, 350, 1.31, 0.74);
    v.setView(HOME);
    var M = Mats(), fw = FontWatch(), gt = glowTexture();
    var BT = 12;
    v.scene.add(makeBoard(210, 140, BT, 31));
    /* parts */
    var hold = makeAAHolder(M, fw);
    hold.group.position.set(0, BT, 44);
    var sw = makeKnifeSwitch(M);
    sw.group.position.set(-62, BT, -36);
    var fuse = makeFuseHolder(M, gt);
    fuse.group.position.set(-2, BT, -33);
    var lamp = makeLampHolder(M, gt, { light: true, lightDist: 150, lightMax: 2.4, boost: true });
    lamp.group.position.set(58, BT, -38);
    v.scene.add(hold.group, sw.group, lamp.group, fuse.group);
    v.scene.updateMatrixWorld(true);
    function W(part, p) { return part.group.localToWorld(p.clone()); }
    var hMinus = W(hold, hold.minus), hPlus = W(hold, hold.plus);
    var swL = W(sw, sw.termL), swR = W(sw, sw.termR);
    var fuL = W(fuse, fuse.termL), fuR = W(fuse, fuse.termR);
    var lpL = W(lamp, lamp.termL), lpR = W(lamp, lamp.termR);
    /* insulated wires (Ø 2 mm) lying on the board */
    var Y = BT + 1.1;
    function wire(pts, color) {
      var c = new THREE.CatmullRomCurve3(pts, false, 'centripetal');
      v.scene.add(mesh(new THREE.TubeGeometry(c, 140, 1.05, 10, false), K.mat.std(color, 0.45, 0, { envMapIntensity: 0.6 }), true, true));
      return c;
    }
    function lug(p) {
      var r = mesh(M.shared.lug || (M.shared.lug = new THREE.TorusGeometry(2.6, 0.55, 8, 20)), M.tin(), false);
      r.rotation.x = Math.PI / 2;
      r.position.set(p.x, p.y - 2.3, p.z);
      v.scene.add(r);
    }
    function dn(p) { return p.clone().add(v3(0, -2.2, 0)); }
    var w1 = wire([hMinus, hMinus.clone().add(v3(-7, -2, 0)), v3(-84, Y, 32), v3(-92, Y, 4), v3(-92, Y, -18), v3(swL.x - 3, Y + 1.5, swL.z + 6), dn(swL)], 0x23252B);
    var w2 = wire([dn(swR), v3(swR.x + 4, Y + 1.6, swR.z + 5), v3((swR.x + fuL.x) / 2, Y, swR.z + 8), v3(fuL.x - 4, Y + 1.6, fuL.z + 5), dn(fuL)], 0xE6B422);
    var w3 = wire([dn(fuR), v3(fuR.x + 4, Y + 1.6, fuR.z + 5), v3((fuR.x + lpL.x) / 2, Y, fuR.z + 9), v3(lpL.x - 4, Y + 1.6, lpL.z + 5), dn(lpL)], 0xE6B422);
    var w4 = wire([dn(lpR), v3(lpR.x + 5, Y + 1.6, lpR.z + 5), v3(88, Y, -10), v3(86, Y, 26), v3(70, Y, 44), hPlus.clone().add(v3(7, -2, 0)), hPlus], 0xC0322A);
    [swL, swR, fuL, fuR, lpL, lpR].forEach(lug);
    /* bare copper short-circuit wire across the lamp terminals */
    var shortRig = new THREE.Group();
    var sc = new THREE.CatmullRomCurve3([lpL.clone().add(v3(-2.6, 0.2, 2.6)), lpL.clone().add(v3(-0.6, 1.6, 0)), lpL.clone().add(v3(3, 2.8, 0)), v3((lpL.x + lpR.x) / 2, lpL.y + 4.2, lpL.z + 1.5), lpR.clone().add(v3(-3, 2.8, 0)), lpR.clone().add(v3(0.6, 1.6, 0)), lpR.clone().add(v3(2.6, 0.2, 2.6))], false, 'centripetal');
    var shortMat = K.mat.copper({ emissive: 0xFF6A1A, emissiveIntensity: 0 });
    shortRig.add(mesh(new THREE.TubeGeometry(sc, 80, 0.65, 8, false), shortMat, true));
    v.scene.add(shortRig);

    /* electron path (electron direction: holder − → switch → fuse → lamp filament → holder +) */
    function L3(a, b) { return new THREE.LineCurve3(a, b); }
    var swPivot = W(sw, v3(-15, 15, 0)), swJaw = W(sw, v3(13, 15, 0));
    var fwL = W(fuse, fuse.wireL), fwR = W(fuse, fuse.wireR);
    function B(x, y) { return W(lamp, v3(x, 7.9 + y, 0)); }
    var filament = new THREE.CurvePath();
    filament.add(L3(B(-0.55, 10.4), B(-0.62, 12.6)));
    filament.add(new THREE.QuadraticBezierCurve3(B(-0.62, 12.6), B(-1.2, 15.6), B(-1.45, 17.5)));
    filament.add(L3(B(-1.45, 17.5), B(1.45, 17.5)));
    filament.add(new THREE.QuadraticBezierCurve3(B(1.45, 17.5), B(1.2, 15.6), B(0.62, 12.6)));
    filament.add(L3(B(0.62, 12.6), B(0.55, 10.4)));
    var IN_BULB = 0.42;     /* dots shrink inside the bulb so they fit the fine wires */
    function buildPath(short) {
      var segs = [
        { curve: w1, lift: 1.25 },
        { curve: L3(dn(swL), swPivot), lift: -1 },
        { curve: L3(swPivot, swJaw), lift: 2.6 },
        { curve: L3(swJaw, dn(swR)), lift: -1 },
        { curve: w2, lift: 1.25 },
        { curve: L3(dn(fuL), fwL), lift: -1 },
        { curve: L3(fwL, fwR), lift: 0.01 },
        { curve: L3(fwR, dn(fuR)), lift: -1 },
        { curve: w3, lift: 1.25 }
      ];
      if (short) segs.push({ curve: sc, lift: 0.85 });
      else {
        segs.push({ curve: L3(dn(lpL), B(-0.55, 10.4)), lift: -1 });
        segs.push({ curve: filament, lift: 0.02 });
        segs.push({ curve: L3(B(0.55, 10.4), dn(lpR)), lift: -1 });
      }
      segs.push({ curve: w4, lift: 1.25 });
      segs.push({ curve: L3(hPlus, hMinus), lift: -1 });
      return PathLUT(segs, 0.5);
    }
    var pathN = buildPath(false), pathS = buildPath(true);
    var NDOT = 74;
    var dots = Dots(v, M, NDOT, 1.05);
    var tp = new THREE.Vector3(), bulbC = B(0, 15), fuseC = W(fuse, v3(0, 11.2, 0));
    function dotScale(lut) {
      return function (s) {
        lut.at(s, tp);
        if (S.open > 0.02 && Math.abs(tp.y - swPivot.y) < 1.5 && Math.abs(tp.z - swPivot.z) < 3 && tp.x > swPivot.x - 0.5 && tp.x < swJaw.x + 0.5) return 0;
        if (tp.distanceTo(bulbC) < 8.5 && tp.y > BT + 14) return IN_BULB;
        if (Math.abs(tp.x - fuseC.x) < 7.2 && Math.abs(tp.z - fuseC.z) < 2 && Math.abs(tp.y - fuseC.y) < 1.5) return 0.36;
        return 1;
      };
    }
    var scaleN = dotScale(pathN), scaleS = dotScale(pathS);

    /* conventional current arrows: flat copper chevrons outside the loop, + → − (opposite to the electrons) */
    var ash = new THREE.Shape();
    ash.moveTo(3.4, 0); ash.lineTo(-2.4, 2.9); ash.lineTo(-1.0, 0); ash.lineTo(-2.4, -2.9); ash.closePath();
    var arrowGeo = new THREE.ExtrudeGeometry(ash, { depth: 0.7, bevelEnabled: true, bevelThickness: 0.25, bevelSize: 0.22, bevelSegments: 2 });
    arrowGeo.rotateX(-Math.PI / 2);
    var NARR = 10;
    var arrows = new THREE.InstancedMesh(arrowGeo, M.arrow(), NARR);
    arrows.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    arrows.frustumCulled = false;
    v.scene.add(arrows);
    var outerPts = [];
    [w4, w3, w2, w1].forEach(function (w) { w.getSpacedPoints(70).reverse().forEach(function (p) { outerPts.push(v3(p.x, BT + 0.4, p.z)); }); });
    var arrowLUT = makeLUT(new THREE.CatmullRomCurve3(outerPts, false, 'centripetal'), 700);
    var cen = v3(0, BT, 4);
    var am = new THREE.Matrix4(), aq = new THREE.Quaternion(), ap = new THREE.Vector3(), at = new THREE.Vector3(), as = new THREE.Vector3(), ax = v3(1, 0, 0);
    function outward(p, d) { var ox = p.x - cen.x, oz = p.z - cen.z, ol = Math.hypot(ox, oz) || 1; p.x += ox / ol * d; p.z += oz / ol * d; return p; }
    function placeArrows(offset, k) {
      for (var i = 0; i < NARR; i++) {
        var u = ((offset + i / NARR) % 1 + 1) % 1, s = u * arrowLUT.len;
        arrowLUT.at(s, ap, true);
        arrowLUT.tanAt(s, at, true);
        at.y = 0; at.normalize();
        outward(ap, 8.5); ap.y = BT + 0.3;
        aq.setFromUnitVectors(ax, at);
        var vis = k * sstep(0.03, 0.09, u) * (1 - sstep(0.92, 0.98, u));
        as.setScalar(Math.max(0.0001, vis));
        am.compose(ap, aq, as);
        arrows.setMatrixAt(i, am);
      }
      arrows.instanceMatrix.needsUpdate = true;
    }

    /* labels */
    var elAt = w1.getPointAt(0.42).add(v3(0, 1.2, 0));
    var curAt = outward(w4.getPointAt(0.42), 8.5); curAt.y = BT + 0.6;
    var lab = {
      bat: lbl(v, 'pil: 2 × 1,5 V = 3 V', { at: [0, BT, 57], cls: 'lbl-ink', dx: 0, dy: 14, align: 'center', valign: 'top' }),
      sw: lbl(v, 'anahtar', { at: [-62, BT + 26, -36], cls: 'lbl-ink', dx: 0, dy: -14, align: 'center' }),
      fuse: lbl(v, 'sigorta', { at: [-2, BT + 15, -33], cls: 'lbl-ink', dx: 0, dy: -18, align: 'center' }),
      lamp: lbl(v, 'lamba', { at: [58, BT + 34, -38], cls: 'lbl-ink', dx: 0, dy: -16, align: 'center' }),
      el: lbl(v, 'elektronlar: eksiden artıya', { at: function () { return elAt; }, cls: 'tag chip', dx: 70, dy: 6, line: true, align: 'left' }),
      cur: lbl(v, 'akım yönü: artıdan eksiye', { at: function () { return curAt; }, cls: 'tag chip', dx: -70, dy: 4, line: true, align: 'right' }),
      open: lbl(v, 'Yol yok: akım yok', { at: [-62, BT + 30, -36], cls: 'chip name', dx: -18, dy: -72, align: 'center' }),
      shortW: lbl(v, 'çıplak tel: lambayı atlayan kısa yol', { at: [(lpL.x + lpR.x) / 2, lpL.y + 4, lpL.z + 1.5], cls: 'tag chip', dx: -40, dy: 70, line: true, align: 'right' }),
      blown: lbl(v, 'Kısa devre: sigorta attı', { at: [-2, BT + 14, -33], cls: 'chip name', dx: 0, dy: -58, line: true, align: 'center' })
    };
    var tagSpeed = cornerTag(v, 'elektron hızı abartılı gösterilmiştir', 'bl');

    var S = {};
    var STATES = ['kapali', 'acik', 'kisa'];
    function reset() {
      S = { auto: !K.reducedMotion, story: S && S.story ? S.story : '', state: 'kapali', open: 0, flow: 0, offset: 0, aoff: 0, light: 0, sk: 0, sT: -1, fuseHeat: 0, broken: 0, flash: 0, wireHeat: 0, fuseSwap: 0, camBeat: 0 };
      fuse.fuse.position.y = 5 + 6.2;
      fuse.set(0, 0, 0);
      v.setView(HOME);
    }
    reset();
    /* focus-slide stories (view key): cause first, then effect, calm loop */
    function storyState(t) {
      var c;
      if (S.story === 'kapali') { c = t % 11; return c < 1.6 ? 'acik' : 'kapali'; }
      if (S.story === 'acik') { c = t % 10; return c < 3.2 ? 'kapali' : 'acik'; }
      c = t % 15;
      return c < 2 ? 'kapali' : c < 11 ? 'kisa' : 'kapali';
    }
    function autoState(t) {
      if (S.story) return storyState(t);
      var c = t % 17;
      if (c < 6) return 'kapali';
      if (c < 10) return 'acik';
      return 'kisa';
    }
    function frame(t, dt) {
      fw.tick();
      if (S.auto) {
        var ns = autoState(t);
        if (ns !== S.state) setState(ns);
      }
      var st = S.state;
      /* switch blade: open only in 'acik' */
      S.open = approach(S.open, st === 'acik' ? 1 : 0, 5, dt);
      sw.setOpen(S.open);
      /* short-circuit sequence */
      if (st === 'kisa') { if (S.sT < 0) S.sT = 0; S.sT += dt; }
      var sT = S.sT;
      S.sk = st === 'kisa' ? EZ.out(clamp(sT / 1.0, 0, 1)) : approach(S.sk, 0, 5, dt);
      shortRig.position.y = (1 - S.sk) * 70;
      shortRig.visible = S.sk > 0.001;
      var contact = st === 'kisa' && sT >= 1.0;
      var wasBroken = S.broken >= 1;
      if (st === 'kisa' && sT > 3.8 && S.broken < 1) S.broken = Math.min(1, S.broken + dt / 0.3);
      if (st === 'kisa' && sT > 3.8 && sT < 4.3) S.flash = sstep(3.8, 3.9, sT) * (1 - sstep(4.0, 4.3, sT)); else S.flash = 0;
      if (st !== 'kisa' && (S.broken > 0 || S.fuseSwap > 0)) {
        /* a fresh fuse goes in: lift, swap, drop */
        S.fuseSwap = Math.min(1, S.fuseSwap + dt / 1.0);
        if (S.fuseSwap >= 0.5 && S.broken > 0) { S.broken = 0; S.fuseHeat = 0; }
      }
      if (S.fuseSwap > 0) {
        fuse.fuse.position.y = 5 + 6.2 + Math.sin(S.fuseSwap * Math.PI) * 14;
        if (S.fuseSwap >= 1) { S.fuseSwap = 0; fuse.fuse.position.y = 5 + 6.2; }
      }
      void wasBroken;
      var closed = S.open < 0.04;
      var conducts = closed && S.broken < 0.5 && st !== 'acik' && S.fuseSwap === 0;
      var shorted = contact && S.broken < 0.5;
      /* heating */
      S.wireHeat = approach(S.wireHeat, shorted ? 1 : 0, shorted ? 0.9 : 1.6, dt);
      var heatTarget = shorted ? sstep(1.5, 3.7, sT) : 0;
      S.fuseHeat = S.broken >= 1 ? approach(S.fuseHeat, 0, 3, dt) : approach(S.fuseHeat, heatTarget, 6, dt);
      fuse.set(S.fuseHeat, S.broken, S.flash);
      shortMat.emissiveIntensity = S.wireHeat * 0.9;
      /* lamp */
      var lampTarget = conducts && !shorted ? 1 : 0;
      S.light = approach(S.light, lampTarget, lampTarget > S.light ? 6 : 9, dt);
      lamp.bulb.set(S.light * 0.92);
      /* flow */
      var flowT = conducts ? (shorted ? 4.5 : 1) : 0;
      S.flow = approach(S.flow, flowT, 3, dt);
      var speed = (K.reducedMotion ? 4 : 11) * S.flow;
      S.offset += speed * dt;
      var lut = shorted ? pathS : pathN;
      dots.update(lut, -S.offset, lut.len / NDOT, shorted ? scaleS : scaleN);
      S.aoff += speed * dt / arrowLUT.len;
      placeArrows(S.aoff, sstep(0.05, 0.4, S.flow));
      /* camera: lean in to the fuse and lamp during the short circuit */
      var steer = v.orbit.idle > 3 || S.auto;
      if (st === 'kisa') {
        var beat = sT < 0.9 ? 0 : sT < 2.9 ? 1 : sT < 5.7 ? 2 : 3;
        if (beat !== S.camBeat) {
          S.camBeat = beat;
          if (steer && beat === 1) v.animateTo(SHORTV, 1.8);
          if (steer && beat === 2) v.animateTo(FUSEV, 1.3);
          if (steer && beat === 3) v.animateTo(HOME, 1.6);
        }
      } else if (S.camBeat > 0) {
        if (S.camBeat < 3 && steer) v.animateTo(HOME, 1.6);
        S.camBeat = 0;
      }
      /* labels */
      var busy = st === 'kisa';
      var fs = S.story !== ''; /* focus slide: at most five labels, one idea */
      lab.bat.show(!busy && !fs); lab.sw.show(!busy && st !== 'acik'); lab.lamp.show(!busy); lab.fuse.show(!busy && (!fs || S.story === 'kisa'));
      lab.el.show(S.flow > 0.3 && !busy && S.story !== 'kisa');
      lab.cur.show(S.flow > 0.3 && !busy && !fs);
      lab.open.show(st === 'acik' && S.open > 0.6);
      lab.shortW.show(st === 'kisa' && sT > 1.1 && sT < 2.9);
      lab.blown.show(st === 'kisa' && S.broken >= 1);
      tagSpeed.show(S.flow > 0.05);
      prep.track(S.open * 3 + S.sk * 5 + S.fuseSwap * 7);
      v.render(dt);
    }
    var prep = Prep(v);
    function setState(ns) {
      if (STATES.indexOf(ns) < 0 || ns === S.state) return;
      S.sT = ns === 'kisa' ? 0 : -1;
      S.state = ns;
    }
    return {
      reset: reset,
      frame: frame,
      set: function (key, val) {
        if (key === 'view') { S.story = String(val); S.auto = !K.reducedMotion; return; }
        if (key !== 'state') return;
        S.auto = false;
        setState(String(val));
      },
      read: function (key) {
        if (key === 'explain') return S.state === 'acik' ? 'Yol kopunca akım her yerde durur ve lamba söner.' : S.state === 'kisa' ? 'Akım lambayı atlayınca çok büyür; sigorta eriyip devreyi açar.' : 'Kapalı yolda akım dolaşır ve lamba yanar.';
        if (key !== 'state') return '';
        if (S.state === 'acik') return 'Anahtar açık: yol yok, akım yok, lamba söner';
        if (S.state === 'kisa') return S.broken >= 1 ? 'Kısa devre: akım çok büyüdü, sigorta eridi ve devreyi açtı' : 'Kısa devre: çıplak tel lambayı atlar, akım çok büyür';
        return 'Anahtar kapalı: yol tamam, akım dolaşır, lamba yanar';
      },
      dispose: function () { v.dispose(); }
    };
  });

  /* =====================================================================
   * series-parallel · W 1120×380 · light
   * ===================================================================== */
  K.register('series-parallel', function (el, opts) {
    var HOME = { yaw: 0, pitch: 0.72, distance: 326, target: [0, 10, 0] };
    var v = K.stage3d(el, {
      theme: opts.theme || 'light', fov: 26, distance: HOME.distance, yaw: HOME.yaw, pitch: HOME.pitch, target: HOME.target,
      size: 150, ground: 0, near: 4, far: 5000, minPitch: 0.25, maxPitch: 1.3, minDistance: 220, maxDistance: 600, minYaw: -0.8, maxYaw: 0.8
    });
    v.exposure = 0.64;
    var M = Mats(), fw = FontWatch(), gt = glowTexture();
    var BT = 10, OX = 99;
    function L3(a, b) { return new THREE.LineCurve3(a, b); }
    function revC(c) { return new THREE.CatmullRomCurve3(c.getSpacedPoints(140).reverse()); }

    /* one board: battery lying label-up at the front left, snap leads toward the back; returns helpers in world coordinates */
    function board(ox, seed) {
      var g = new THREE.Group();
      g.position.x = ox;
      v.scene.add(g);
      g.add(makeBoard(168, 112, BT, seed));
      var bat = make9V(M, fw, { side: true });
      var q = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(v3(0, 0, 1), v3(1, 0, 0), v3(0, 1, 0)));
      bat.group.quaternion.copy(q);
      bat.group.position.set(-78, BT + B9.D / 2, 28);
      g.add(bat.group);
      var snap = makeSnap(M);
      snap.group.quaternion.copy(q).multiply(new THREE.Quaternion().setFromAxisAngle(v3(0, 1, 0), Math.PI));
      snap.group.position.copy(bat.group.position);
      g.add(snap.group);
      g.updateMatrixWorld(true);
      var api = {
        group: g, ox: ox,
        W: function (x, y, z) { return v3(x + ox, y, z); },
        snapW: function (p) { return snap.group.localToWorld(p.clone()); },
        batW: function (p) { return bat.group.localToWorld(p.clone()); }
      };
      api.exitRed = api.snapW(v3(snap.exitX, snap.exitY, snap.exitZ));
      api.exitBlack = api.snapW(v3(snap.exitX, snap.exitY, -snap.exitZ));
      api.plusT = api.batW(v3(B9.pitch / 2, B9.Hc + 1.5, 0));
      api.minusT = api.batW(v3(-B9.pitch / 2, B9.Hc + 1.5, 0));
      api.batMid = api.batW(v3(0, 18, 0));
      return api;
    }
    function lampAt(b, x, z) {
      var lh = makeLampHolder(M, gt, { light: true, lightDist: 95, lightMax: 1.1 });
      lh.group.position.set(x, BT, z);
      b.group.add(lh.group);
      b.group.updateMatrixWorld(true);
      lh.L = lh.group.localToWorld(lh.termL.clone()); lh.R = lh.group.localToWorld(lh.termR.clone());
      lh.dL = lh.L.clone().add(v3(0, -2.2, 0)); lh.dR = lh.R.clone().add(v3(0, -2.2, 0));
      lh.B = function (px, py) { return lh.group.localToWorld(v3(px, 7.9 + py, 0)); };
      lh.centre = lh.B(0, 15);
      var f = new THREE.CurvePath();
      f.add(L3(lh.B(-0.55, 10.4), lh.B(-0.62, 12.6)));
      f.add(new THREE.QuadraticBezierCurve3(lh.B(-0.62, 12.6), lh.B(-1.2, 15.6), lh.B(-1.45, 17.5)));
      f.add(L3(lh.B(-1.45, 17.5), lh.B(1.45, 17.5)));
      f.add(new THREE.QuadraticBezierCurve3(lh.B(1.45, 17.5), lh.B(1.2, 15.6), lh.B(0.62, 12.6)));
      f.add(L3(lh.B(0.62, 12.6), lh.B(0.55, 10.4)));
      lh.filLR = f;
      /* electrons through the lamp from the right terminal to the left one */
      lh.segRL = [
        { curve: L3(lh.dR, lh.B(0.55, 10.4)), lift: -1 },
        { curve: new THREE.CatmullRomCurve3(f.getSpacedPoints(60).reverse()), lift: 0.02 },
        { curve: L3(lh.B(-0.55, 10.4), lh.dL), lift: -1 }
      ];
      return lh;
    }
    /* smooth cable through control points, resampled and kept above the board surface */
    function cable(pts, r) {
      var c0 = new THREE.CatmullRomCurve3(pts, false, 'centripetal');
      var dense = c0.getSpacedPoints(160).map(function (p) { return v3(p.x, Math.max(p.y, BT + r + 0.08), p.z); });
      return new THREE.CatmullRomCurve3(dense, false, 'catmullrom', 0.5);
    }
    function wire(pts, color) {
      var c = cable(pts, 1.0);
      v.scene.add(mesh(new THREE.TubeGeometry(c, 160, 1.0, 10, false), K.mat.std(color, 0.45, 0, { envMapIntensity: 0.6 }), true, true));
      return c;
    }
    function lead(pts, color) {
      var c = cable(pts, 0.75);
      v.scene.add(mesh(new THREE.TubeGeometry(c, 160, 0.75, 10, false), K.mat.std(color, 0.45, 0, { envMapIntensity: 0.6 }), true, true));
      return c;
    }
    function lug(p) {
      var r = mesh(M.shared.lug || (M.shared.lug = new THREE.TorusGeometry(2.6, 0.55, 8, 20)), M.tin(), false);
      r.rotation.x = Math.PI / 2;
      r.position.set(p.x, p.y - 2.3, p.z);
      v.scene.add(r);
    }
    var Y = BT + 1.0;

    /* ---- series: battery + → lamp A → lamp B → battery − ---- */
    var sb = board(-OX, 41);
    var sA = lampAt(sb, -8, -26), sB = lampAt(sb, 46, -26);
    var sRed = lead([sb.exitRed, sb.exitRed.clone().add(v3(0, 0.5, -5)), sb.W(-36, Y + 1, -4), sb.W(-26, Y + 1.5, -14), sA.dL], 0xC0322A);
    var sMid = wire([sA.dR, sA.dR.clone().add(v3(4, 1.4, 4)), sb.W(19, Y, -14), sB.dL.clone().add(v3(-4, 1.4, 4)), sB.dL], 0xE6B422);
    var sBlack = lead([sb.exitBlack, sb.exitBlack.clone().add(v3(0, 0.6, -5)), sb.W(-28, Y, 6), sb.W(30, Y, 14), sb.W(66, Y, 4), sB.dR.clone().add(v3(4, 1.4, 5)), sB.dR], 0x23252B);
    [sA.L, sA.R, sB.L, sB.R].forEach(lug);
    /* electron loop: − → black lead → lamp B → yellow → lamp A → red lead → + → (inside the battery) → − */
    var sSegs = [{ curve: L3(sb.minusT, sb.exitBlack), lift: -1 }, { curve: sBlack, lift: 0.95 }]
      .concat(sB.segRL)
      .concat([{ curve: revC(sMid), lift: 1.2 }])
      .concat(sA.segRL)
      .concat([{ curve: revC(sRed), lift: 0.95 }, { curve: L3(sb.exitRed, sb.plusT), lift: -1 }, { curve: new THREE.QuadraticBezierCurve3(sb.plusT, sb.batMid, sb.minusT), lift: -1 }]);
    var sLUT = PathLUT(sSegs, 0.5);

    /* ---- parallel: two lamps side by side; a + bridge runs behind them, a − bridge in front ---- */
    var pb = board(OX, 43);
    var pA = lampAt(pb, 4, -26), pB = lampAt(pb, 58, -26);
    var pRed = lead([pb.exitRed, pb.exitRed.clone().add(v3(0, 0.5, -5)), pb.W(-32, Y + 1, -6), pb.W(-20, Y + 1.5, -16), pA.dL.clone().add(v3(-5, 1.4, 3)), pA.dL], 0xC0322A);
    var pBlack = lead([pb.exitBlack, pb.exitBlack.clone().add(v3(0, 0.6, -5)), pb.W(-26, Y, 6), pb.W(-2, Y, 12), pb.W(14, Y, 2), pA.dR.clone().add(v3(2, 1.4, 6)), pA.dR], 0x23252B);
    var pPlusRail = wire([pA.dL, pA.dL.clone().add(v3(-5, 1.4, -2)), pb.W(-14, Y, -26), pb.W(-14, Y, -46), pb.W(32, Y, -46), pb.W(32, Y, -26), pB.dL.clone().add(v3(-5, 1.4, 4)), pB.dL], 0xE6B422);
    var pMinusRail = wire([pA.dR, pA.dR.clone().add(v3(4, 1.4, 5)), pb.W(24, Y, -8), pb.W(64, Y, -8), pB.dR.clone().add(v3(4, 1.4, 5)), pB.dR], 0xE6B422);
    [pA.L, pA.R, pB.L, pB.R].forEach(lug);
    var pHead = [{ curve: L3(pb.minusT, pb.exitBlack), lift: -1 }, { curve: pBlack, lift: 0.95 }];
    var pTail = [{ curve: revC(pRed), lift: 0.95 }, { curve: L3(pb.exitRed, pb.plusT), lift: -1 }, { curve: new THREE.QuadraticBezierCurve3(pb.plusT, pb.batMid, pb.minusT), lift: -1 }];
    function segLen(list) { return list.reduce(function (a, sg) { return a + sg.curve.getLength(); }, 0); }
    var headLen = segLen(pHead), tailLen = segLen(pTail);
    /* loop A: straight through lamp A;  loop B: − bridge → lamp B → + bridge */
    var pLoopA = PathLUT(pHead.concat(pA.segRL).concat(pTail), 0.5);
    var pLoopB = PathLUT(pHead.concat([{ curve: pMinusRail, lift: 1.2 }]).concat(pB.segRL).concat([{ curve: revC(pPlusRail), lift: 1.2 }]).concat(pTail), 0.5);

    /* dots */
    var NS = 46, NP = 34;
    var dS = Dots(v, M, NS, 0.95), dA = Dots(v, M, NP, 0.95), dB = Dots(v, M, NP, 0.95);
    var tp = new THREE.Vector3();
    function inLamp(lh, p) { return p.distanceTo(lh.centre) < 9 && p.y > BT + 13; }

    /* bulbs unscrew: rotate (thread pitch ≈ 1,8 mm) then lift clear */
    function bulbPose(lh, k) {
      var turns = 2.6 * sstep(0, 0.65, k), lift = 1.8 * turns + 13 * EZ.inOut(sstep(0.6, 1, k));
      lh.bulbRig.rotation.y = -turns * TAU;
      lh.bulbRig.position.y = 7.9 + lift;
      lh.bulbRig.position.x = 4 * EZ.inOut(sstep(0.6, 1, k));
    }

    /* labels */
    var lab = {
      sT: lbl(v, 'Seri', { at: [-OX - 82, BT, -54], cls: 'name', dx: 4, dy: -16, align: 'left' }),
      pT: lbl(v, 'Paralel', { at: [OX - 82, BT, -54], cls: 'name', dx: 4, dy: -16, align: 'left' }),
      sVA: lbl(v, '4,5 V', { at: function () { return sA.B(0, 26); }, cls: 'value chip', dx: 0, dy: -18, align: 'center' }),
      sVB: lbl(v, '4,5 V', { at: function () { return sB.B(0, 26); }, cls: 'value chip', dx: 0, dy: -18, align: 'center' }),
      pVA: lbl(v, '9 V', { at: function () { return pA.B(0, 26); }, cls: 'value chip', dx: 0, dy: -18, align: 'center' }),
      pVB: lbl(v, '9 V', { at: function () { return pB.B(0, 26); }, cls: 'value chip', dx: 0, dy: -18, align: 'center' }),
      sSame: lbl(v, 'aynı akım', { at: [-OX + 19, Y, -14], cls: 'tag', dx: 0, dy: 22, align: 'center' }),
      pI1: lbl(v, 'I₁', { at: [OX + 50, Y, -12], cls: 'value', dx: 16, dy: 0, align: 'left' }),
      pI2: lbl(v, 'I₂', { at: function () { return pB.B(12, -2); }, cls: 'value', dx: 20, dy: 26, align: 'left' }),
      pI: lbl(v, 'I = I₁ + I₂', { at: [OX + 20, Y, 10], cls: 'value', dx: 0, dy: 16, align: 'center' }),
      sOff: lbl(v, 'yol kesildi: iki lamba da söner', { at: [-OX + 19, BT + 30, -26], cls: 'tag chip', dx: 0, dy: -64, align: 'center' }),
      pOn: lbl(v, 'diğer kol çalışmaya devam eder', { at: [OX + 4, BT + 30, -26], cls: 'tag chip', dx: 0, dy: -56, align: 'center' })
    };
    var corner = cornerTag(v, 'elektron hızı abartılı · akım ne kadar büyükse o kadar hızlı', 'bl');

    var S = {};
    var U0 = 13;   /* mm/s per unit branch current (exaggerated) */
    function reset() {
      S = { auto: !K.reducedMotion, remove: 0, rk: 0, Is: 0.5, IpA: 1, IpB: 1, sOff: 0 };
      /* place dots evenly in time of flight */
      S.ss = []; S.sa = []; S.sbb = [];
      var i;
      for (i = 0; i < NS; i++) S.ss.push(sLUT.len * i / NS);
      var vm = 2, vb = 1;
      function placeParallel(lut, arr, phase) {
        var branch = lut.len - headLen - tailLen;
        var T = headLen / vm + branch / vb + tailLen / vm;
        for (var k = 0; k < NP; k++) {
          var tau = ((k + phase) / NP) * T, s;
          if (tau < headLen / vm) s = tau * vm;
          else if (tau < headLen / vm + branch / vb) s = headLen + (tau - headLen / vm) * vb;
          else s = headLen + branch + (tau - headLen / vm - branch / vb) * vm;
          arr.push(s);
        }
      }
      placeParallel(pLoopA, S.sa, 0);
      placeParallel(pLoopB, S.sbb, 0.5);
      v.setView(HOME);
    }
    reset();
    function advance(arr, lut, vMain, vBranch, dt, splitHead, splitTail) {
      for (var i = 0; i < arr.length; i++) {
        var s = arr[i];
        var vv = (splitHead !== undefined && (s < splitHead || s > lut.len - splitTail)) ? vMain : vBranch;
        s += vv * dt;
        if (s >= lut.len) s -= lut.len;
        arr[i] = s;
      }
    }
    function frame(t, dt) {
      fw.tick();
      if (S.auto) S.remove = Math.floor(t / 6) % 2;
      /* unscrew / screw back (1,8 s) */
      S.rk = S.remove ? Math.min(1, S.rk + dt / 1.8) : Math.max(0, S.rk - dt / 1.8);
      bulbPose(sB, S.rk);
      bulbPose(pB, S.rk);
      var contact = S.rk < 0.12;
      /* currents (relative to one parallel branch) */
      S.Is = approach(S.Is, contact ? 0.5 : 0, 7, dt);
      S.IpA = approach(S.IpA, 1, 7, dt);
      S.IpB = approach(S.IpB, contact ? 1 : 0, 7, dt);
      /* lamp brightness: series 4,5 V each → about a quarter of the power: dim and orange */
      sA.bulb.set(0.6 * sstep(0.05, 0.5, S.Is));
      sB.bulb.set(0.6 * sstep(0.05, 0.5, S.Is));
      pA.bulb.set(S.IpA * 0.95);
      pB.bulb.set(S.IpB * 0.95);
      var u = (K.reducedMotion ? 0.35 : 1) * U0;
      advance(S.ss, sLUT, 0, u * S.Is, dt);
      var main = u * (S.IpA + S.IpB);
      advance(S.sa, pLoopA, main, u * S.IpA, dt, headLen, tailLen);
      advance(S.sbb, pLoopB, main, u * S.IpB, dt, headLen, tailLen);
      /* draw dots */
      var away = S.rk > 0.02;
      drawDots(dS, sLUT, S.ss, function (p) { return away && inLamp(sB, p) ? 0 : 1; });
      drawDots(dA, pLoopA, S.sa, null);
      drawDots(dB, pLoopB, S.sbb, function (p, s) {
        if (away && inLamp(pB, p)) return 0;
        return sstep(0.05, 0.6, S.IpB);
      });
      /* labels */
      lab.sVA.show(S.Is > 0.25); lab.sVB.show(S.Is > 0.25 && S.rk < 0.05);
      lab.pVA.show(true); lab.pVB.show(S.rk < 0.05);
      lab.sSame.show(S.Is > 0.25);
      lab.pI1.show(false); lab.pI2.show(false); lab.pI.show(S.IpB > 0.5);
      lab.sOff.show(S.rk > 0.5); lab.pOn.show(S.rk > 0.5);
      corner.show(true);
      prep.track(S.rk);
      v.render(dt);
    }
    var dp = new THREE.Vector3(), dd = new THREE.Vector3();
    function drawDots(D, lut, arr, scaleFn) {
      var inst = D.mesh, cam = v.camera.position;
      for (var i = 0; i < arr.length; i++) {
        var s = arr[i], lift = lut.at(s, dp);
        if (lift < -0.01) { inst.hideAt(i); continue; }
        var sc = scaleFn ? scaleFn(dp, s) : 1;
        if (inLampAny(dp)) sc *= 0.42;
        if (sc <= 0.01) { inst.hideAt(i); continue; }
        dd.copy(cam).sub(dp).normalize();
        inst.setAt(i, dp.x + dd.x * lift, dp.y + dd.y * lift, dp.z + dd.z * lift, sc);
      }
      inst.commit();
    }
    function inLampAny(p) { return inLamp(sA, p) || inLamp(sB, p) || inLamp(pA, p) || inLamp(pB, p); }
    var prep = Prep(v);
    return {
      reset: reset,
      frame: frame,
      set: function (key, val) {
        if (key !== 'remove') return;
        S.auto = false;
        S.remove = +val ? 1 : 0;
      },
      read: function (key) {
        var off = S.rk >= 0.12;
        if (key === 'series') return off ? 'Seri: yol kesildi, akım yok; iki lamba da söner' : 'Seri: 4,5 V + 4,5 V = 9 V; iki lambadan aynı akım geçer';
        if (key === 'parallel') return off ? 'Paralel: kalan lamba yine 9 V alır; I = I₁ (I₂ = 0)' : 'Paralel: her lamba 9 V alır; I = I₁ + I₂';
        return '';
      },
      dispose: function () { v.dispose(); }
    };
  });

  /* ---------- rectifier diode (1N4007-style, DO-41) along x, cathode band at +x, axis at y = 0 ---------- */
  function makeDiode(M, leadLen) {
    var g = new THREE.Group(), L = 5.2, R = 1.35;
    var prof = [[-L / 2 - 0.25, 0.4], [-L / 2, 0.75], [-L / 2 + 0.12, 1.15], [-L / 2 + 0.45, R], [L / 2 - 0.45, R], [L / 2 - 0.12, 1.15], [L / 2, 0.75], [L / 2 + 0.25, 0.4]];
    g.add(mesh(lathe(prof, { axis: 'x', segs: 32 }), K.mat.std(0x1C1D21, 0.42, 0, { envMapIntensity: 0.8 }), true));
    var band = mesh(lathe([[L / 2 - 1.35, R + 0.012], [L / 2 - 0.55, R + 0.012]], { axis: 'x', segs: 32 }), K.mat.std(0xBFC2C8, 0.4, 0.3), false);
    g.add(band);
    var ll = leadLen || 6;
    var lg = lathe([[0, 0], [0, 0.36], [0.04, 0.4], [ll, 0.4]], { axis: 'x', segs: 12 });
    var a = mesh(lg, M.tin(), true), b = mesh(lg, M.tin(), true);
    a.position.x = -L / 2 - 0.2 - ll;
    b.rotation.y = Math.PI; b.position.x = L / 2 + 0.2 + ll;
    g.add(a, b);
    return g;
  }

  /* =====================================================================
   * symbols-morph · W 1120×400 · light
   * Upright display tiles: the real part on the front, its IEC 60617 symbol on the back.
   * Each tile turns in sequence; then four tiles assemble into one closed schematic.
   * ===================================================================== */
  K.register('symbols-morph', function (el, opts) {
    var ROW = { yaw: 0, pitch: 0.16, distance: 292, target: [0, 7, 0] };
    var SCHEM = { yaw: 0, pitch: 0, distance: 300, target: [0, 44, 0] };
    var v = K.stage3d(el, {
      theme: opts.theme || 'light', fov: 20, distance: ROW.distance, yaw: ROW.yaw, pitch: ROW.pitch, target: ROW.target,
      size: 150, ground: 0, near: 2, far: 4000, minPitch: -0.1, maxPitch: 0.9, minYaw: -0.7, maxYaw: 0.7, minDistance: 200, maxDistance: 520
    });
    v.exposure = 0.64;
    var M = Mats(), fw = FontWatch(), gt = glowTexture();
    var ink = K.mat.std(0x17191E, 0.6, 0, { transparent: true, opacity: 1, envMapIntensity: 0.5 });
    var TW = 38, TH = 30, TT = 1.2, FOOT = 2.4, TY = FOOT + TH / 2;

    /* ---- symbol drawing helpers: drawing plane XY, strokes extruded toward +z ---- */
    var SD = 0.55;
    function sLine(g, x0, y0, x1, y1, w, mat) {
      var len = Math.hypot(x1 - x0, y1 - y0);
      var m = mesh(new THREE.BoxGeometry(len + w, w, SD), mat || ink, false, false);
      m.position.set((x0 + x1) / 2, (y0 + y1) / 2, SD / 2);
      m.rotation.z = Math.atan2(y1 - y0, x1 - x0);
      g.add(m);
      return m;
    }
    function sShape(g, shape, mat) {
      var m = mesh(new THREE.ExtrudeGeometry(shape, { depth: SD, bevelEnabled: false, curveSegments: 28 }), mat || ink, false, false);
      g.add(m);
      return m;
    }
    function tri(x0, h, x1) { var s = new THREE.Shape(); s.moveTo(x0, -h); s.lineTo(x1, 0); s.lineTo(x0, h); s.closePath(); return s; }
    function ring(cx, cy, r0, r1) { var s = new THREE.Shape(); s.absarc(cx, cy, r1, 0, TAU, false); var h = new THREE.Path(); h.absarc(cx, cy, r0, 0, TAU, true); s.holes.push(h); return s; }
    function rectRing(w, h, t) {
      var s = new THREE.Shape(); s.moveTo(-w / 2, -h / 2); s.lineTo(w / 2, -h / 2); s.lineTo(w / 2, h / 2); s.lineTo(-w / 2, h / 2); s.closePath();
      var p = new THREE.Path(); p.moveTo(-w / 2 + t, -h / 2 + t); p.lineTo(-w / 2 + t, h / 2 - t); p.lineTo(w / 2 - t, h / 2 - t); p.lineTo(w / 2 - t, -h / 2 + t); p.closePath();
      s.holes.push(p);
      return s;
    }
    function arrowSym(g, x0, y0, x1, y1, mat) {
      var a = Math.atan2(y1 - y0, x1 - x0), L = 2.6, Wd = 1.3;
      sLine(g, x0, y0, x1 - Math.cos(a) * L * 0.8, y1 - Math.sin(a) * L * 0.8, 0.75, mat);
      var hs = new THREE.Shape();
      hs.moveTo(x1, y1);
      hs.lineTo(x1 - Math.cos(a) * L - Math.sin(a) * Wd, y1 - Math.sin(a) * L + Math.cos(a) * Wd);
      hs.lineTo(x1 - Math.cos(a) * L + Math.sin(a) * Wd, y1 - Math.sin(a) * L - Math.cos(a) * Wd);
      hs.closePath();
      sShape(g, hs, mat);
    }
    var W = 0.75;
    var ledGlowMat = K.mat.std(0x17191E, 0.6, 0, { transparent: true, opacity: 1, envMapIntensity: 0.5, emissive: 0xFF3020, emissiveIntensity: 0 });
    var SYM = {
      pil: function (g) {
        sLine(g, -15, 0, -1.5, 0, W); sLine(g, 1.5, 0, 15, 0, W);
        sLine(g, -1.5, -6.6, -1.5, 6.6, W); sLine(g, 1.5, -3.3, 1.5, 3.3, 2.0);
        var plus = new THREE.Group(); plus.position.set(-5.4, 5.6, 0);
        sLine(plus, -1.35, 0, 1.35, 0, 0.5); sLine(plus, 0, -1.35, 0, 1.35, 0.5);
        var minus = new THREE.Group(); minus.position.set(5.4, 5.6, 0);
        sLine(minus, -1.35, 0, 1.35, 0, 0.5);
        g.add(plus, minus);
        g.userData.signs = [plus, minus];
      },
      direnc: function (g) { sShape(g, rectRing(15, 5.6, W)); sLine(g, -15, 0, -7.5, 0, W); sLine(g, 7.5, 0, 15, 0, W); },
      led: function (g) {
        sShape(g, tri(-3.8, 4.3, 3.8)); sLine(g, 3.8, -4.3, 3.8, 4.3, 0.9);
        sLine(g, -15, 0, -3.8, 0, W); sLine(g, 3.8, 0, 15, 0, W);
        arrowSym(g, -0.2, 5.4, 3.6, 9.2, ledGlowMat); arrowSym(g, 2.8, 4.4, 6.6, 8.2, ledGlowMat);
      },
      diyot: function (g) { sShape(g, tri(-3.8, 4.3, 3.8)); sLine(g, 3.8, -4.3, 3.8, 4.3, 0.9); sLine(g, -15, 0, -3.8, 0, W); sLine(g, 3.8, 0, 15, 0, W); },
      anahtar: function (g) {
        sShape(g, ring(-6.5, 0, 0.6, 1.2)); sShape(g, ring(6.5, 0, 0.6, 1.2));
        sLine(g, -15, 0, -7.7, 0, W); sLine(g, 7.7, 0, 15, 0, W);
        var lever = new THREE.Group();
        lever.position.set(-6.5, 0, 0);
        sLine(lever, 0.7, 0, 13.8, 0, W);
        g.add(lever);
        g.userData.lever = lever;
      },
      lamba: function (g) {
        sShape(g, ring(0, 0, 5.05, 5.8));
        sLine(g, -4.0, -4.0, 4.0, 4.0, 0.65); sLine(g, -4.0, 4.0, 4.0, -4.0, 0.65);
        sLine(g, -15, 0, -5.8, 0, W); sLine(g, 5.8, 0, 15, 0, W);
      }
    };

    /* ---- parts mounted on the tile fronts (tile front at z = TT/2) ---- */
    function part(key) {
      var g = new THREE.Group(), c, z0 = TT / 2;
      if (key === 'pil') {
        c = make9V(M, fw).group;
        c.scale.setScalar(0.5);
        c.position.set(0, -12.4, z0 + B9.D / 4);
      } else if (key === 'direnc') {
        c = makeResistor(M, { value: 470, leads: { type: 'straight', len: 5.6 } }).group;
        c.scale.setScalar(1.5);
        c.position.set(0, 0, z0 + RES.R * 1.5);
      } else if (key === 'led') {
        var led = makeLED(M, { legA: 9.6, legC: 8.2, glowTex: null });
        c = led.group;
        c.scale.setScalar(1.3);
        c.position.set(0, -1.6, z0 + 2.9 * 1.3);
      } else if (key === 'diyot') {
        c = makeDiode(M, 4.6);
        c.scale.setScalar(2.3);
        c.position.set(0, 0, z0 + 1.35 * 2.3);
      } else if (key === 'anahtar') {
        c = makeKnifeSwitch(M).group;
        c.rotation.x = Math.PI / 2;
        c.scale.setScalar(0.52);
        c.position.set(0, 0, z0);
      } else {
        c = makeBulb(M, {}).group;
        c.scale.setScalar(1.05);
        c.position.set(0, -12.6, z0 + 5.8 * 1.05);
      }
      g.add(c);
      return g;
    }

    var KEYS = ['pil', 'direnc', 'led', 'diyot', 'anahtar', 'lamba'];
    var NAMES = { pil: 'pil', direnc: 'direnç', led: 'LED', diyot: 'diyot', anahtar: 'anahtar', lamba: 'lamba' };
    var tileGeo = roundBox(TW, TH, TT, 0.5, 2), footGeo = roundBox(22, FOOT, 9, 0.8, 2);
    var footMat = K.mat.std(0x2C2F36, 0.45, 0.05, { envMapIntensity: 0.6, transparent: true, opacity: 1 });
    var tiles = [];
    KEYS.forEach(function (key, i) {
      var slot = new THREE.Group();          /* position and in-plane rotation */
      var turn = new THREE.Group();          /* turns about y to show the back */
      slot.add(turn);
      var paperMat = new THREE.MeshStandardMaterial({ color: 0xFBFBF8, roughness: 0.8, envMapIntensity: 0.55, transparent: true, opacity: 1 });
      var tileMesh = mesh(tileGeo, paperMat, true, true);
      turn.add(tileMesh);
      var front = part(key);
      turn.add(front);
      var sym = new THREE.Group();
      SYM[key](sym);
      var back = new THREE.Group();
      back.rotation.y = Math.PI;
      back.position.z = -TT / 2;
      back.add(sym);
      turn.add(back);
      var foot = mesh(footGeo, footMat, true, true);
      v.scene.add(slot, foot);
      var lab = lbl(v, NAMES[key], { at: function () { return tiles[i].labAt; }, cls: 'name', align: 'center', valign: 'top' });
      tiles.push({ key: key, slot: slot, turn: turn, front: front, back: back, sym: sym, foot: foot, paperMat: paperMat, tileMesh: tileMesh, label: lab, labAt: new THREE.Vector3(), rowX: (i - 2.5) * 46 });
    });
    var T_ = {}; tiles.forEach(function (c) { T_[c.key] = c; });

    /* ---- schematic board, wires and electrons ---- */
    var boardMat = new THREE.MeshBasicMaterial({ color: 0xFBFBF8, transparent: true, opacity: 0, toneMapped: false });
    var sheet = mesh(roundBox(250, 90, 1.0, 1.2, 2), boardMat, false, true);
    sheet.position.set(0, 44, -2.2);
    sheet.visible = false;
    v.scene.add(sheet);
    /* final loop: corners at x = ±97, y = 10 and 68 */
    var XL = -97, XR = 97, YT = 68, YB = 10, YM = 39, ZW = TT / 2 + 0.002;
    var FIN = { pil: [XL, YM, -Math.PI / 2], anahtar: [-44, YT, 0], direnc: [44, YT, 0], led: [XR, YM, -Math.PI / 2] };
    var wires = [];
    function wireSeg(x0, y0, x1, y1) {
      var len = Math.hypot(x1 - x0, y1 - y0);
      var geo = new THREE.BoxGeometry(len + W, W, SD);
      geo.translate((len + W) / 2 - W / 2, 0, 0);
      var m = mesh(geo, ink, false, false);
      m.position.set(x0, y0, ZW + SD / 2);
      m.rotation.z = Math.atan2(y1 - y0, x1 - x0);
      m.visible = false;
      v.scene.add(m);
      wires.push(m);
    }
    wireSeg(XL, YM + 15, XL, YT); wireSeg(XL, YT, -59, YT);            /* + → switch */
    wireSeg(-29, YT, 29, YT);                                           /* switch → resistor */
    wireSeg(59, YT, XR, YT); wireSeg(XR, YT, XR, YM + 15);             /* resistor → LED anode */
    wireSeg(XR, YM - 15, XR, YB); wireSeg(XR, YB, XL, YB); wireSeg(XL, YB, XL, YM - 15); /* LED cathode → − */
    /* electron loop (electron direction: − → LED → resistor → switch → +) */
    var ZE = TT / 2 + 1.0;
    var loopPts = [[XL, YM - 15], [XL, YB], [XR, YB], [XR, YM - 15], [XR, YM + 15], [XR, YT], [59, YT], [29, YT], [-29, YT], [-59, YT], [XL, YT], [XL, YM + 15]];
    var loopPath = new THREE.CurvePath();
    for (var i = 0; i < loopPts.length; i++) {
      var a = loopPts[i], b = loopPts[(i + 1) % loopPts.length];
      loopPath.add(new THREE.LineCurve3(v3(a[0], a[1], ZE), v3(b[0], b[1], ZE)));
    }
    var loopLUT = makeLUT(loopPath, 900);
    var NE = 10;
    var eDots = K.instanced(NE, { radius: 1.3, material: M.electron(), detail: 2 });
    v.scene.add(eDots);
    var ledHalo = glowSprite(gt, 0xFF3A22, 30, false);
    ledHalo.position.set(XR + 6, YM - 5, 2);
    v.scene.add(ledHalo);

    var tagScale = cornerTag(v, 'ölçekli değil · IEC 60617 devre sembolleri', 'bl');
    var tagFlow = lbl(v, 'elektron akışı: − kutuptan + kutba', { at: [0, YB, ZE], cls: 'tag chip', dx: 0, dy: 12, align: 'center', valign: 'top' });
    var tagClosed = lbl(v, 'anahtar kapandı: yol tamam', { at: [-44, YT + TH / 2, 0], cls: 'tag chip', dx: 0, dy: -10, align: 'center', valign: 'bottom' });

    var LOOP = 16;
    var S = {};
    function reset() { S = { auto: true, phase: K.reducedMotion ? 1 : 0 }; v.setView(K.reducedMotion ? SCHEM : ROW); }
    reset();
    var tmp = new THREE.Vector3();
    function frame(t, dt) {
      fw.tick();
      var T = K.reducedMotion ? 13 : t % LOOP;
      var asm = EZ.inOut(span(T, 8.3, 10.3));
      var out = span(T, 15.15, 15.95);
      /* camera: frontal on the row, then on the schematic board */
      var phase = T < 8.2 || T >= 15.15 ? 0 : 1;
      if (phase !== S.phase && !K.reducedMotion) { S.phase = phase; if (v.orbit.idle > 3 || S.auto) v.animateTo(phase ? SCHEM : ROW, phase ? 2.1 : 0.85); }
      tiles.forEach(function (c, i) {
        var si = K.reducedMotion ? 1 : EZ.outQuint(clamp((T - i * 0.08) / 0.8, 0, 1));
        /* turn to the symbol side, one after another */
        var f0 = 1.1 + i * 1.15;
        var flip = K.reducedMotion ? 1 : EZ.inOut(span(T, f0, f0 + 1.15));
        c.turn.rotation.y = flip * Math.PI;
        c.turn.position.z = Math.sin(flip * Math.PI) * 9;
        c.front.visible = flip < 0.5;
        c.back.visible = flip >= 0.5;
        var fin = FIN[c.key];
        var x = c.rowX, y = TY, rz = 0, sc = si, zz = 0;
        if (fin) {
          x = lerp(c.rowX, fin[0], asm); y = lerp(TY, fin[1], asm); rz = lerp(0, fin[2], asm);
          /* tiles travelling left pass in front, those travelling right pass behind */
          zz = (fin[0] < c.rowX ? 1 : -1) * 8 * Math.sin(Math.PI * asm);
        } else {
          var gone = EZ.in(span(T, 8.3, 9.2));
          sc *= 1 - gone;
          y -= gone * 6;
        }
        sc *= 1 - 0.05 * out;
        c.slot.position.set(x, y, zz);
        c.slot.rotation.z = rz;
        c.slot.scale.setScalar(Math.max(0.0001, sc));
        c.slot.visible = sc > 0.001;
        /* feet stay on the ground and fade as the tiles lift into the schematic */
        var fk = (1 - span(T, 8.3, 9.0)) * si * (fin ? 1 : sc);
        c.foot.position.set(c.rowX, FOOT / 2, 0);
        c.foot.scale.setScalar(Math.max(0.0001, fk));
        c.foot.visible = fk > 0.01;
        c.paperMat.opacity = (1 - span(T, 9.2, 9.9)) * (1 - out);
        c.paperMat.depthWrite = c.paperMat.opacity > 0.99;
        c.tileMesh.castShadow = c.paperMat.opacity > 0.6;
        /* names: under the tile in the row, beside it in the schematic */
        if (fin && asm > 0.5) {
          if (c.key === 'pil') c.labAt.set(x + 13, y + 4, 0);
          else if (c.key === 'led') c.labAt.set(x - 13, y + 4, 0);
          else c.labAt.set(x, y - 4, 0);
        } else c.labAt.set(x, FOOT * 0.2, 4);
        c.label.show(sc > 0.5 && T < 15.1 && (asm < 0.02 || asm > 0.97));
      });
      /* labels in the schematic sit inside the loop */
      T_.pil.label.el.style.textAlign = 'left';
      /* keep the battery's + and − signs upright while its tile turns into the loop */
      T_.pil.sym.userData.signs.forEach(function (sg) { sg.rotation.z = -T_.pil.slot.rotation.z; });
      /* switch: drawn open, closes once the loop is complete */
      var close = EZ.inOut(span(T, 10.7, 11.3));
      T_.anahtar.sym.userData.lever.rotation.z = lerp(0.48, 0.03, close);
      /* board and wires */
      sheet.visible = T > 8.8 && out < 1;
      boardMat.opacity = span(T, 8.8, 9.8) * (1 - out);
      boardMat.depthWrite = boardMat.opacity > 0.99;
      for (var k = 0; k < wires.length; k++) {
        var gk = span(T, 9.7 + k * 0.12, 10.2 + k * 0.12);
        wires[k].scale.x = Math.max(0.0001, gk);
        wires[k].visible = gk > 0.001 && out < 1;
      }
      ink.opacity = 1 - out;
      ledGlowMat.opacity = 1 - out;
      /* electrons and LED light once the switch is closed */
      var run = span(T, 11.3, 11.8) * (1 - span(T, 14.9, 15.3));
      var pos = (T - 11.3) * 28;
      for (var e = 0; e < NE; e++) {
        if (run < 0.01 || out > 0) { eDots.hideAt(e); continue; }
        loopLUT.at(pos + e * loopLUT.len / NE, tmp, true);
        eDots.setAt(e, tmp.x, tmp.y, tmp.z, run);
      }
      eDots.commit();
      var glow = K.reducedMotion ? 1 : span(T, 11.4, 12.0) * (1 - span(T, 14.9, 15.4));
      ledGlowMat.emissiveIntensity = glow * 1.6;
      ledGlowMat.color.setRGB(lerp(0.011, 0.85, glow), lerp(0.012, 0.13, glow), lerp(0.015, 0.08, glow));
      ledHalo.material.opacity = glow * 0.42;
      tagFlow.show(run > 0.5);
      tagClosed.show(close > 0.9 && run > 0.2);
      tagScale.show(true);
      prep.track(T < 10.7 || T > 15.1 ? T : -1);
      v.render(dt);
    }
    var prep = Prep(v);
    return {
      reset: reset,
      frame: frame,
      dispose: function () { v.dispose(); }
    };
  });

})();
