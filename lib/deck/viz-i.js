/* Köklerden Göklere · Builder I · PCB ve sensör görselleri
 *
 * Kayıtlı görseller:
 *   pcb-from-breadboard  (W 1120×380)  breadboard devresinden baskılı devre kartına
 *   pcb-layers           (S 680×520)   4 katmanlı kartın katmanları
 *   dev-board            (S 680×520)   ESP32 tarzı geliştirme kartı turu
 *   sensors-phone        (S 680×520)   telefondaki sensörler
 *   ultrasonic           (S 680×520)   ultrasonik mesafe ölçümü
 *
 * Tüm sahnelerde 1 dünya birimi = 1 mm. Kart çizimleri "kart koordinatı"nda
 * yapılır: orijin kart merkezi, x sağa, y izleyiciye doğru (tuval gibi).
 */
(function () {
  'use strict';
  var K = window.KGViz;
  if (!K) return;
  var clamp = K.clamp, lerp = K.lerp, span = K.span, EZ = K.ease;

  function TH() { return window.THREE; }
  function sm(x) { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); }

  /* ------------------------------------------------------------------
   * Fonts for canvas textures. The deck loads IBM Plex via fonts.css; if a
   * face is not ready yet when a texture is drawn, redraw it once it is.
   * ------------------------------------------------------------------ */
  var SANS = '"IBM Plex Sans", "Segoe UI", Arial, sans-serif';
  var MONO = '"IBM Plex Mono", Consolas, monospace';
  var FACES = ['500 24px "IBM Plex Mono"', '400 24px "IBM Plex Mono"', '600 24px "IBM Plex Sans"', '500 24px "IBM Plex Sans"', '400 24px "IBM Plex Sans"'];
  function fontsMissing() {
    if (!document.fonts || !document.fonts.check) return false;
    try {
      for (var i = 0; i < FACES.length; i++) if (!document.fonts.check(FACES[i])) return true;
    } catch (e) { return false; }
    return false;
  }
  function afterFonts(texs) {
    if (!fontsMissing() || !document.fonts.load) return;
    Promise.all(FACES.map(function (f) { return document.fonts.load(f); })).then(function () {
      texs.forEach(function (t) { if (t && t.redraw) t.redraw(); });
    }, function () {});
  }
  function font(px, weight, mono) { return (weight || 400) + ' ' + px + 'px ' + (mono ? MONO : SANS); }

  /* Canvas texture that can be redrawn. o: {linear, repeat, aniso} */
  function canvasTex(w, h, draw, o) {
    var THREE = TH();
    o = o || {};
    var c = document.createElement('canvas');
    c.width = w; c.height = h;
    var tex = new THREE.CanvasTexture(c);
    tex.encoding = o.linear ? THREE.LinearEncoding : THREE.sRGBEncoding;
    tex.anisotropy = o.aniso || 8;
    if (o.repeat) tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.redraw = function () {
      var ctx = c.getContext('2d');
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, w, h);
      draw(ctx, w, h);
      tex.needsUpdate = true;
    };
    tex.redraw();
    return tex;
  }
  /* Texture drawn in board millimetres (origin at the board centre, y towards the viewer). */
  function boardTex(W, H, pxmm, draw, o) {
    var w = Math.round(W * pxmm), h = Math.round(H * pxmm);
    return canvasTex(w, h, function (ctx) {
      ctx.setTransform(w / W, 0, 0, h / H, w / 2, h / 2);
      draw(ctx);
    }, o);
  }
  function rrPath(ctx, cx, cy, w, h, r) { K.rr(ctx, cx - w / 2, cy - h / 2, w, h, r); }
  function poly(ctx, pts) {
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (var i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  }
  function disc(ctx, x, y, r) { ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); }
  /* Rounded rectangle added as a sub-path (no beginPath), for even-odd cut-outs */
  function rrSub(ctx, x, y, w, h, r) {
    r = Math.max(0, Math.min(r, w / 2, h / 2));
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  /* ------------------------------------------------------------------
   * Geometry helpers (board coordinates: shape y = −board y)
   * ------------------------------------------------------------------ */
  function addRR(path, cx, cy, w, h, r) {
    var x0 = cx - w / 2, x1 = cx + w / 2, y0 = -cy - h / 2, y1 = -cy + h / 2;
    r = Math.max(0.001, Math.min(r, w / 2 - 0.001, h / 2 - 0.001));
    path.moveTo(x0 + r, y0);
    path.lineTo(x1 - r, y0); path.absarc(x1 - r, y0 + r, r, -Math.PI / 2, 0, false);
    path.lineTo(x1, y1 - r); path.absarc(x1 - r, y1 - r, r, 0, Math.PI / 2, false);
    path.lineTo(x0 + r, y1); path.absarc(x0 + r, y1 - r, r, Math.PI / 2, Math.PI, false);
    path.lineTo(x0, y0 + r); path.absarc(x0 + r, y0 + r, r, Math.PI, Math.PI * 1.5, false);
    return path;
  }
  function rrShape(cx, cy, w, h, r) { return addRR(new (TH().Shape)(), cx, cy, w, h, r); }
  function rrHole(cx, cy, w, h, r) { return addRR(new (TH().Path)(), cx, cy, w, h, r); }
  function circShape(x, y, r) { var s = new (TH().Shape)(); s.absarc(x, -y, r, 0, Math.PI * 2, false); return s; }
  function circHole(x, y, r) { var p = new (TH().Path)(); p.absarc(x, -y, r, 0, Math.PI * 2, true); return p; }

  /* ExtrudeGeometry lying flat: bottom at y = 0, top at y = thick.
   * Groups: 0 bottom face, 1 top face, 2 side walls. */
  function slab(shape, thick, o) {
    var THREE = TH();
    o = o || {};
    var bt = o.bevel === undefined ? Math.min(0.25, thick * 0.18) : o.bevel;
    var g = new THREE.ExtrudeGeometry(shape, {
      depth: Math.max(0.0005, thick - 2 * bt), bevelEnabled: bt > 0, bevelThickness: bt,
      bevelSize: o.bevelSize === undefined ? bt : o.bevelSize, bevelSegments: o.bevelSegments || 2,
      curveSegments: o.curveSegments || 16, steps: 1
    });
    g.rotateX(-Math.PI / 2);
    g.translate(0, bt, 0);
    var gr = g.groups;
    if (gr.length >= 2) {
      var caps = gr[0], sides = gr[1], half = caps.count / 2;
      g.clearGroups();
      g.addGroup(caps.start, half, 0);
      g.addGroup(caps.start + half, half, 1);
      g.addGroup(sides.start, sides.count, 2);
    }
    return g;
  }
  /* Rounded box centred on x/z, bottom at y = 0 */
  function rbox(w, h, d, r, bevel, segs) {
    var b = bevel === undefined ? Math.min(w, h, d) * 0.12 : bevel;
    return slab(rrShape(0, 0, w - 2 * b, d - 2 * b, Math.max(0.01, r - b)), h, { bevel: b, bevelSegments: segs || 3, curveSegments: 8 });
  }
  function flat(shape, segs) { var g = new (TH().ShapeGeometry)(shape, segs || 16); g.rotateX(-Math.PI / 2); return g; }
  /* Top-view UVs for a W×H board: u along x, v along −z (canvas top = far edge) */
  function topUV(g, W, H) {
    var THREE = TH();
    var p = g.attributes.position;
    var uv = g.attributes.uv;
    if (!uv || uv.count !== p.count) { uv = new THREE.BufferAttribute(new Float32Array(p.count * 2), 2); g.setAttribute('uv', uv); }
    for (var i = 0; i < p.count; i++) uv.setXY(i, p.getX(i) / W + 0.5, 0.5 - p.getZ(i) / H);
    uv.needsUpdate = true;
    return g;
  }
  /* Merge geometries (positions, normals, uvs) into one non-indexed geometry */
  function merge(list) {
    var THREE = TH();
    var parts = [], total = 0;
    list.forEach(function (g) {
      var n = g.index ? g.toNonIndexed() : g;
      if (!n.attributes.normal) n.computeVertexNormals();
      parts.push(n); total += n.attributes.position.count;
    });
    var pos = new Float32Array(total * 3), nor = new Float32Array(total * 3), uv = new Float32Array(total * 2), o = 0;
    parts.forEach(function (g) {
      var n = g.attributes.position.count;
      pos.set(g.attributes.position.array, o * 3);
      nor.set(g.attributes.normal.array, o * 3);
      if (g.attributes.uv) uv.set(g.attributes.uv.array, o * 2);
      o += n;
    });
    var out = new THREE.BufferGeometry();
    out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    out.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
    out.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    return out;
  }
  function placed(g, x, y, z, ry, rx, rz) {
    if (rx) g.rotateX(rx);
    if (rz) g.rotateZ(rz);
    if (ry) g.rotateY(ry);
    g.translate(x || 0, y || 0, z || 0);
    return g;
  }
  function lathe(pts, segs) {
    var THREE = TH();
    return new THREE.LatheGeometry(pts.map(function (p) { return new THREE.Vector2(p[0], p[1]); }), segs || 32);
  }
  /* Open tube (plated barrel), bottom at y = 0, height 1 */
  function barrel(r, segs) {
    var g = new (TH().CylinderGeometry)(r, r, 1, segs || 18, 1, true);
    g.translate(0, 0.5, 0);
    return g;
  }

  /* Flat copper features as real geometry (crisp at any distance), lying in the
   * XZ plane at y = 0, facing up. traces: [{w, p: [[x, y], ...]}] (board coords),
   * pads: [{x, y, w, h}] rectangles, rings: [{x, y, d, drill, sq}] (round or square
   * pad with a hole), discs: [{x, y, d}]. */
  function flatFeatures(o) {
    var THREE = TH();
    var pos = [];
    function tri(ax, az, bx, bz, cx, cz) {
      var cr = (bx - ax) * (cz - az) - (bz - az) * (cx - ax);
      if (cr > 0) pos.push(ax, 0, az, cx, 0, cz, bx, 0, bz);
      else pos.push(ax, 0, az, bx, 0, bz, cx, 0, cz);
    }
    function discT(x, z, r, n) {
      for (var i = 0; i < n; i++) {
        var a0 = i / n * Math.PI * 2, a1 = (i + 1) / n * Math.PI * 2;
        tri(x, z, x + Math.cos(a0) * r, z + Math.sin(a0) * r, x + Math.cos(a1) * r, z + Math.sin(a1) * r);
      }
    }
    function quad(ax, az, bx, bz, cx, cz, dx, dz) { tri(ax, az, bx, bz, cx, cz); tri(ax, az, cx, cz, dx, dz); }
    (o.traces || []).forEach(function (t) {
      var h = t.w / 2, p = t.p, i;
      for (i = 0; i < p.length - 1; i++) {
        var a = p[i], b = p[i + 1];
        var dx = b[0] - a[0], dz = b[1] - a[1], l = Math.hypot(dx, dz) || 1;
        var nx = -dz / l * h, nz = dx / l * h;
        quad(a[0] + nx, a[1] + nz, b[0] + nx, b[1] + nz, b[0] - nx, b[1] - nz, a[0] - nx, a[1] - nz);
      }
      for (i = 0; i < p.length; i++) discT(p[i][0], p[i][1], h, 14);
    });
    (o.pads || []).forEach(function (p) {
      var x0 = p.x - p.w / 2, x1 = p.x + p.w / 2, z0 = p.y - p.h / 2, z1 = p.y + p.h / 2;
      quad(x0, z0, x1, z0, x1, z1, x0, z1);
    });
    (o.discs || []).forEach(function (p) { discT(p.x, p.y, p.d / 2, 24); });
    (o.rings || []).forEach(function (p) {
      var n = 32, ri = p.drill / 2, ro = p.d / 2;
      for (var i = 0; i < n; i++) {
        var a0 = i / n * Math.PI * 2, a1 = (i + 1) / n * Math.PI * 2;
        var c0 = Math.cos(a0), s0 = Math.sin(a0), c1 = Math.cos(a1), s1 = Math.sin(a1);
        var r0 = p.sq ? ro / Math.max(Math.abs(c0), Math.abs(s0)) : ro;
        var r1 = p.sq ? ro / Math.max(Math.abs(c1), Math.abs(s1)) : ro;
        quad(p.x + c0 * ri, p.y + s0 * ri, p.x + c0 * r0, p.y + s0 * r0, p.x + c1 * r1, p.y + s1 * r1, p.x + c1 * ri, p.y + s1 * ri);
      }
    });
    var g = new THREE.BufferGeometry();
    var arr = new Float32Array(pos);
    var nor = new Float32Array(arr.length);
    for (var k = 1; k < nor.length; k += 3) nor[k] = 1;
    g.setAttribute('position', new THREE.BufferAttribute(arr, 3));
    g.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
    g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(arr.length / 3 * 2), 2));
    return g;
  }

  /* Uniform Catmull-Rom through control points [[x,y,z],...] → n+1 samples into out */
  function sampleCR(ctrl, n, out) {
    var m = ctrl.length;
    for (var i = 0; i <= n; i++) {
      var u = i / n * (m - 1);
      var k = Math.min(m - 2, Math.floor(u)), f = u - k, f2 = f * f, f3 = f2 * f;
      var p0 = ctrl[Math.max(0, k - 1)], p1 = ctrl[k], p2 = ctrl[k + 1], p3 = ctrl[Math.min(m - 1, k + 2)];
      for (var c = 0; c < 3; c++) {
        out[i * 3 + c] = p1[c] + 0.5 * (p2[c] - p0[c]) * f +
          (p0[c] - 2.5 * p1[c] + 2 * p2[c] - 0.5 * p3[c]) * f2 +
          (-0.5 * p0[c] + 1.5 * p1[c] - 1.5 * p2[c] + 0.5 * p3[c]) * f3;
      }
    }
    return out;
  }

  /* Tube whose centre line is rewritten in place every frame (no allocation).
   * update(P, rw, rh): P = Float32Array of (nSeg+1)*3 points; rw/rh = horizontal and
   * vertical radii, so a round wire can flatten into a ribbon (copper trace). */
  function dynTube(nSeg, radial, mat) {
    var THREE = TH();
    var R1 = radial + 1, nV = (nSeg + 1) * R1;
    var pos = new Float32Array(nV * 3), nor = new Float32Array(nV * 3);
    var idx = [];
    for (var i = 0; i < nSeg; i++) for (var j = 0; j < radial; j++) {
      var a = i * R1 + j, b = (i + 1) * R1 + j, c = (i + 1) * R1 + j + 1, d = i * R1 + j + 1;
      idx.push(a, d, b, b, d, c);
    }
    var g = new THREE.BufferGeometry();
    g.setIndex(idx);
    var pa = new THREE.BufferAttribute(pos, 3), na = new THREE.BufferAttribute(nor, 3);
    pa.setUsage(THREE.DynamicDrawUsage); na.setUsage(THREE.DynamicDrawUsage);
    g.setAttribute('position', pa);
    g.setAttribute('normal', na);
    var mesh = new THREE.Mesh(g, mat);
    mesh.frustumCulled = false;
    var cosT = new Float32Array(R1), sinT = new Float32Array(R1);
    for (j = 0; j <= radial; j++) { cosT[j] = Math.cos(j / radial * Math.PI * 2); sinT[j] = Math.sin(j / radial * Math.PI * 2); }
    var sx = 1, sy = 0, sz = 0;
    mesh.nSeg = nSeg;
    mesh.update = function (P, rw, rh) {
      var n = nSeg;
      sx = 1; sy = 0; sz = 0;
      // initial side vector from the first non-vertical tangent
      for (var q = 0; q < n; q++) {
        var dx0 = P[(q + 1) * 3] - P[q * 3], dz0 = P[(q + 1) * 3 + 2] - P[q * 3 + 2];
        var l0 = Math.hypot(dx0, dz0);
        if (l0 > 1e-4) { sx = -dz0 / l0; sz = dx0 / l0; break; }
      }
      for (var i2 = 0; i2 <= n; i2++) {
        var i0 = Math.max(0, i2 - 1), i1 = Math.min(n, i2 + 1);
        var tx = P[i1 * 3] - P[i0 * 3], ty = P[i1 * 3 + 1] - P[i0 * 3 + 1], tz = P[i1 * 3 + 2] - P[i0 * 3 + 2];
        var tl = Math.hypot(tx, ty, tz) || 1;
        tx /= tl; ty /= tl; tz /= tl;
        // side = t × up (horizontal); keep the previous one on vertical runs
        var cx = -tz, cz = tx, cl = Math.hypot(cx, cz);
        if (cl > 0.15) {
          cx /= cl; cz /= cl;
          if (cx * sx + cz * sz < 0) { cx = -cx; cz = -cz; }
          sx = cx; sy = 0; sz = cz;
        } else {
          // project the previous side onto the plane normal to t
          var dp = sx * tx + sy * ty + sz * tz;
          sx -= dp * tx; sy -= dp * ty; sz -= dp * tz;
          var sl = Math.hypot(sx, sy, sz) || 1;
          sx /= sl; sy /= sl; sz /= sl;
        }
        // n = s × t
        var nx = sy * tz - sz * ty, ny = sz * tx - sx * tz, nz = sx * ty - sy * tx;
        if (ny < 0) { nx = -nx; ny = -ny; nz = -nz; }
        var px = P[i2 * 3], py = P[i2 * 3 + 1], pz = P[i2 * 3 + 2];
        for (var j2 = 0; j2 <= radial; j2++) {
          var cc = cosT[j2], ss = sinT[j2];
          var o = (i2 * R1 + j2) * 3;
          pos[o] = px + sx * cc * rw + nx * ss * rh;
          pos[o + 1] = py + sy * cc * rw + ny * ss * rh;
          pos[o + 2] = pz + sz * cc * rw + nz * ss * rh;
          var ax = sx * cc / rw + nx * ss / rh, ay = sy * cc / rw + ny * ss / rh, az = sz * cc / rw + nz * ss / rh;
          var al = Math.hypot(ax, ay, az) || 1;
          nor[o] = ax / al; nor[o + 1] = ay / al; nor[o + 2] = az / al;
        }
      }
      pa.needsUpdate = true; na.needsUpdate = true;
    };
    return mesh;
  }

  /* Soft radial sprite texture for light and glow */
  var glowTexCache = null;
  function glowTex() {
    if (glowTexCache) return glowTexCache;
    glowTexCache = canvasTex(128, 128, function (ctx) {
      var g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
      g.addColorStop(0, 'rgba(255,255,255,1)');
      g.addColorStop(0.18, 'rgba(255,255,255,0.75)');
      g.addColorStop(0.45, 'rgba(255,255,255,0.22)');
      g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, 128, 128);
    }, { linear: true });
    return glowTexCache;
  }
  function glowSprite(color, size, opacity, normalBlend) {
    var THREE = TH();
    var s = new THREE.Sprite(new THREE.SpriteMaterial({
      map: glowTex(), color: color, transparent: true, opacity: opacity === undefined ? 1 : opacity,
      blending: normalBlend ? THREE.NormalBlending : THREE.AdditiveBlending, depthWrite: false, toneMapped: false
    }));
    s.scale.set(size, size, size);
    return s;
  }

  /* Polyline helper: cumulative lengths and point-at-distance (no allocation) */
  function pathOf(pts) {
    var L = [0];
    for (var i = 1; i < pts.length; i++) {
      var a = pts[i - 1], b = pts[i];
      L.push(L[i - 1] + Math.hypot(b[0] - a[0], b[1] - a[1], (b[2] || 0) - (a[2] || 0)));
    }
    return {
      pts: pts, L: L, len: L[L.length - 1],
      at: function (d, out) {
        d = clamp(d, 0, this.len);
        var i = 1;
        while (i < L.length - 1 && L[i] < d) i++;
        var a = pts[i - 1], b = pts[i], k = (d - L[i - 1]) / Math.max(1e-6, L[i] - L[i - 1]);
        out[0] = a[0] + (b[0] - a[0]) * k;
        out[1] = a[1] + (b[1] - a[1]) * k;
        out[2] = (a[2] || 0) + ((b[2] || 0) - (a[2] || 0)) * k;
        return out;
      }
    };
  }

  /* Scale the shared studio rig for a scene (light-coloured objects need less) */
  function tuneLights(v, o) {
    var Lr = v.lights;
    if (!Lr) return;
    o = o || {};
    Lr.key.intensity *= o.key === undefined ? 1 : o.key;
    Lr.fill.intensity *= o.fill === undefined ? 1 : o.fill;
    Lr.rim.intensity *= o.rim === undefined ? 1 : o.rim;
    Lr.hemi.intensity *= o.hemi === undefined ? 1 : o.hemi;
    if (o.shadowBias !== undefined) Lr.key.shadow.normalBias = o.shadowBias;
    if (o.exposure) v.exposure = o.exposure;
    if (Lr.ground && o.shadow !== undefined) Lr.ground.material.opacity = o.shadow;
  }

  /* Common colours (sRGB hex) */
  var COL = {
    copper: '#D08A5C', copperDark: '#B9714A', gold: '#DDA94A', tin: '#C9CCD1',
    mask: '#155C38', maskDeep: '#174F35', silk: '#F4F4F0', fr4: '#CDBB82'
  };

  /* Woven glass-fibre texture for FR-4 / prepreg (tileable) */
  function weaveTex(base, light, dark) {
    return canvasTex(256, 256, function (ctx) {
      ctx.fillStyle = dark;
      ctx.fillRect(0, 0, 256, 256);
      var n = 4, cell = 256 / n, bw = cell * 0.78;
      function band(x, y, w, h, horiz) {
        var g = horiz ? ctx.createLinearGradient(0, y, 0, y + h) : ctx.createLinearGradient(x, 0, x + w, 0);
        g.addColorStop(0, dark); g.addColorStop(0.22, base); g.addColorStop(0.5, light); g.addColorStop(0.78, base); g.addColorStop(1, dark);
        ctx.fillStyle = g;
        K.rr(ctx, x, y, w, h, Math.min(w, h) * 0.45);
        ctx.fill();
        ctx.save();
        ctx.globalAlpha = 0.18;
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 0.8;
        for (var k = 1; k < 6; k++) {
          ctx.beginPath();
          if (horiz) { ctx.moveTo(x + 3, y + h * k / 6); ctx.lineTo(x + w - 3, y + h * k / 6); }
          else { ctx.moveTo(x + w * k / 6, y + 3); ctx.lineTo(x + w * k / 6, y + h - 3); }
          ctx.stroke();
        }
        ctx.restore();
      }
      var i, j;
      // vertical bundles first, then horizontal ones on a checker (over/under)
      for (i = 0; i < n; i++) for (j = 0; j < n; j++) {
        var x = i * cell + (cell - bw) / 2, y = j * cell + (cell - bw) / 2;
        if ((i + j) % 2 === 0) { band(x, j * cell - 2, bw, cell + 4, false); band(i * cell - 2, y, cell + 4, bw, true); }
        else { band(i * cell - 2, y, cell + 4, bw, true); band(x, j * cell - 2, bw, cell + 4, false); }
      }
    }, { repeat: true });
  }

  /* =====================================================================
   * pcb-layers · S 680×520 · light
   * A small 4-layer board that explodes into its layers.
   * ===================================================================== */
  K.register('pcb-layers', function (el, opts) {
    var THREE = TH();
    opts = opts || {};
    var FACT = 'Bakır yolların kalınlığı ≈ 35 µm: bir saç telinin yarısı kadar';
    var v = K.stage3d(el, {
      theme: opts.theme, fov: 26, near: 2, far: 4000, yaw: 0.5, pitch: 0.5, distance: 250,
      target: [4, 38, 0], size: 60, ground: 0, minDistance: 140, maxDistance: 520
    });
    if (!v.ready) return { reset: function () {}, frame: function (t, dt) { v.render(dt); }, read: function () { return FACT; } };
    var dark = opts.theme === 'dark';
    tuneLights(v, { key: 0.8, fill: 0.85, rim: 0.9, hemi: 0.75, shadowBias: 0.04, shadow: 0.11, exposure: 0.82 });

    /* ---------- board layout (mm, board coordinates) ---------- */
    var BW = 50, BH = 34, BR = 2.2;
    var smd = [];
    var u1x = -7, u1y = 0, i;
    for (i = 0; i < 4; i++) {
      smd.push({ x: u1x - 2.7, y: u1y - 1.905 + i * 1.27, w: 1.55, h: 0.6 });
      smd.push({ x: u1x + 2.7, y: u1y - 1.905 + i * 1.27, w: 1.55, h: 0.6 });
    }
    function p0805(x, y) { smd.push({ x: x - 0.95, y: y, w: 1.0, h: 1.3 }); smd.push({ x: x + 0.95, y: y, w: 1.0, h: 1.3 }); }
    p0805(-7, -5.6); p0805(4.5, -1.27); p0805(4.5, 1.27); p0805(0.5, 6.0); p0805(5.0, 6.0);
    var tht = [];
    var jNet = ['3V3', 'SDA', 'SCL', 'GND'];
    for (i = 0; i < 4; i++) tht.push({ x: 17, y: -3.81 + i * 2.54, d: 1.75, drill: 1.0, sq: i === 0, net: jNet[i] });
    var mholes = [[-21.6, -13.6], [21.6, -13.6], [-21.6, 13.6], [21.6, 13.6]];
    var vias = [
      { x: -10.2, y: -5.6, net: 'GND' },
      { x: -13.4, y: 11.6, net: 'GND' },
      { x: -6.05, y: -8.6, net: '3V3' },
      { x: 14.3, y: -6.51, net: '3V3' },
      { x: 14.3, y: 6.51, net: 'GND' },
      { x: -12.2, y: -3.105, net: 'SIG' },
      { x: 7.5, y: 9.6, net: 'SIG' },
      { x: 8.4, y: 6.0, net: 'GND' }
    ];
    var VIA_D = 0.8, VIA_DRILL = 0.36;
    var tp1 = { x: 12.0, y: 9.6, d: 1.6 };
    var topTr = [
      { w: 0.6, p: [[-4.3, -1.905], [-3.2, -1.905], [-3.2, -4.0], [-4.8, -5.6], [-6.05, -5.6]] },
      { w: 0.6, p: [[-6.05, -5.6], [-6.05, -8.6]] },
      { w: 0.6, p: [[-7.95, -5.6], [-10.2, -5.6]] },
      { w: 0.6, p: [[-9.7, 1.905], [-11.2, 1.905], [-13.4, 4.105], [-13.4, 11.6]] },
      { w: 0.38, p: [[-9.7, -1.905], [-11.0, -1.905], [-12.2, -3.105]] },
      { w: 0.38, p: [[-4.3, -0.635], [-2.0, -0.635], [-1.365, -1.27], [3.55, -1.27]] },
      { w: 0.38, p: [[-4.3, 0.635], [-2.0, 0.635], [-1.365, 1.27], [3.55, 1.27]] },
      { w: 0.38, p: [[5.45, -1.27], [17, -1.27]] },
      { w: 0.38, p: [[5.45, 1.27], [17, 1.27]] },
      { w: 0.6, p: [[17, -3.81], [14.3, -6.51]] },
      { w: 0.6, p: [[17, 3.81], [14.3, 6.51]] },
      { w: 0.38, p: [[7.5, 9.6], [12.0, 9.6]] },
      { w: 0.38, p: [[-4.3, 1.905], [-3.2, 1.905], [-3.2, 3.6], [-0.8, 6.0], [-0.45, 6.0]] },
      { w: 0.38, p: [[1.45, 6.0], [4.05, 6.0]] },
      { w: 0.6, p: [[5.95, 6.0], [8.4, 6.0]] }
    ];
    var botTr = [
      { w: 0.38, p: [[-12.2, -3.105], [-12.2, 6.5], [-9.1, 9.6], [7.5, 9.6]] },
      { w: 0.6, p: [[14.3, -6.51], [10.5, -10.3], [-3.0, -10.3]] }
    ];
    var pulsePath = [[-9.7, 1.905], [-11.2, 1.905], [-13.4, 4.105], [-13.4, 11.6]];

    /* ---------- textures ---------- */
    function cutHoles(ctx, extra) {
      ctx.save();
      ctx.globalCompositeOperation = 'destination-out';
      ctx.fillStyle = '#000';
      tht.forEach(function (h) { disc(ctx, h.x, h.y, h.drill / 2 + (extra || 0)); ctx.fill(); });
      vias.forEach(function (h) { disc(ctx, h.x, h.y, VIA_DRILL / 2 + (extra || 0)); ctx.fill(); });
      mholes.forEach(function (h) { disc(ctx, h[0], h[1], 1.6 + (extra || 0)); ctx.fill(); });
      ctx.restore();
    }
    function traces(ctx, list, color) {
      ctx.strokeStyle = color;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      list.forEach(function (t) { ctx.lineWidth = t.w; poly(ctx, t.p); ctx.stroke(); });
    }
    function padsTHT(ctx, color, all) {
      ctx.fillStyle = color;
      tht.forEach(function (h) {
        if (h.sq) { rrPath(ctx, h.x, h.y, h.d, h.d, 0.12); ctx.fill(); }
        else { disc(ctx, h.x, h.y, h.d / 2); ctx.fill(); }
      });
      vias.forEach(function (h) { disc(ctx, h.x, h.y, VIA_D / 2); ctx.fill(); });
      if (all) { disc(ctx, tp1.x, tp1.y, tp1.d / 2); ctx.fill(); }
    }
    var ringsAll = tht.map(function (h) { return { x: h.x, y: h.y, d: h.d, drill: h.drill, sq: h.sq }; })
      .concat(vias.map(function (h) { return { x: h.x, y: h.y, d: VIA_D, drill: VIA_DRILL }; }));
    var geoL1Cu = flatFeatures({ traces: topTr });
    var geoL1Au = flatFeatures({ pads: smd, rings: ringsAll, discs: [tp1] });
    var geoL4Cu = flatFeatures({ traces: botTr });
    var geoL4Au = flatFeatures({ rings: ringsAll });
    function plane(net) {
      return boardTex(BW, BH, 12, function (ctx) {
        ctx.fillStyle = COL.copper;
        rrPath(ctx, 0, 0, BW - 1.0, BH - 1.0, BR - 0.5);
        ctx.fill();
        ctx.save();
        ctx.globalCompositeOperation = 'destination-out';
        ctx.fillStyle = '#000';
        function relief(x, y, r0, r1) {
          ctx.save();
          ctx.beginPath();
          ctx.arc(x, y, r1, 0, Math.PI * 2);
          ctx.arc(x, y, r0, 0, Math.PI * 2, true);
          ctx.fill('evenodd');
          ctx.restore();
        }
        vias.forEach(function (h) {
          if (h.net === net) relief(h.x, h.y, 0.55, 0.85);
          else { disc(ctx, h.x, h.y, 0.85); ctx.fill(); }
        });
        mholes.forEach(function (h) { disc(ctx, h[0], h[1], 2.6); ctx.fill(); });
        tht.forEach(function (h) {
          if (h.net === net) relief(h.x, h.y, h.d / 2 + 0.05, h.d / 2 + 0.4);
          else { disc(ctx, h.x, h.y, h.d / 2 + 0.45); ctx.fill(); }
        });
        ctx.restore();
        // thermal spokes back in
        ctx.fillStyle = COL.copper;
        function spokes(x, y, r1, w) {
          ctx.fillRect(x - w / 2, y - r1 - 0.05, w, 2 * r1 + 0.1);
          ctx.fillRect(x - r1 - 0.05, y - w / 2, 2 * r1 + 0.1, w);
        }
        vias.forEach(function (h) { if (h.net === net) spokes(h.x, h.y, 0.85, 0.3); });
        tht.forEach(function (h) { if (h.net === net) spokes(h.x, h.y, h.d / 2 + 0.4, 0.45); });
        cutHoles(ctx);
      });
    }
    var texL2 = plane('GND'), texL3 = plane('3V3');
    function maskTex(top, baked) {
      return boardTex(BW, BH, baked ? 20 : 12, function (ctx) {
        ctx.fillStyle = COL.mask;
        rrPath(ctx, 0, 0, BW, BH, BR);
        ctx.fill();
        if (baked) {
          // copper under the mask shows as slightly raised, lighter green
          ctx.globalAlpha = 0.55;
          traces(ctx, topTr.map(function (t) { return { w: t.w + 0.22, p: t.p }; }), '#0F4429');
          ctx.globalAlpha = 1;
          traces(ctx, topTr, '#3A8352');
          ctx.globalAlpha = 0.5;
          traces(ctx, topTr.map(function (t) { return { w: t.w * 0.45, p: t.p }; }), '#4C9A63');
          ctx.globalAlpha = 1;
        }
        ctx.save();
        ctx.globalCompositeOperation = 'destination-out';
        ctx.fillStyle = '#000';
        if (top) smd.forEach(function (p) { rrPath(ctx, p.x, p.y, p.w + 0.1, p.h + 0.1, 0.1); ctx.fill(); });
        tht.forEach(function (h) {
          if (h.sq) { rrPath(ctx, h.x, h.y, h.d + 0.1, h.d + 0.1, 0.15); ctx.fill(); }
          else { disc(ctx, h.x, h.y, h.d / 2 + 0.05); ctx.fill(); }
        });
        vias.forEach(function (h) { disc(ctx, h.x, h.y, VIA_D / 2 + 0.05); ctx.fill(); });
        mholes.forEach(function (h) { disc(ctx, h[0], h[1], 1.6); ctx.fill(); });
        if (top) { disc(ctx, tp1.x, tp1.y, tp1.d / 2 + 0.05); ctx.fill(); }
        ctx.restore();
      });
    }
    var texMask = maskTex(true, false), texMaskBaked = maskTex(true, true);
    var texSilk = boardTex(BW, BH, 24, function (ctx) {
      ctx.strokeStyle = ctx.fillStyle = COL.silk;
      ctx.lineWidth = 0.15;
      ctx.lineCap = 'round';
      // U1
      poly(ctx, [[-8.6, -2.6], [-5.4, -2.6]]); ctx.stroke();
      poly(ctx, [[-8.6, 2.6], [-5.4, 2.6]]); ctx.stroke();
      disc(ctx, -10.7, -2.95, 0.25); ctx.fill();
      // C1, R1, R2 outlines
      [[-7, -5.6], [4.5, -1.27], [4.5, 1.27], [0.5, 6.0], [5.0, 6.0]].forEach(function (c) {
        poly(ctx, [[c[0] - 0.35, c[1] - 0.95], [c[0] + 0.35, c[1] - 0.95]]); ctx.stroke();
        poly(ctx, [[c[0] - 0.35, c[1] + 0.95], [c[0] + 0.35, c[1] + 0.95]]); ctx.stroke();
      });
      // LED cathode bar
      ctx.lineWidth = 0.25;
      poly(ctx, [[6.75, 5.15], [6.75, 6.85]]); ctx.stroke();
      ctx.lineWidth = 0.15;
      // J1 outline
      rrPath(ctx, 17, 0, 2.9, 10.5, 0.1); ctx.stroke();
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = font(1.25, 600);
      ctx.fillText('U1', -7, 3.9);
      ctx.fillText('C1', -7, -3.95);
      ctx.fillText('R1', 4.5, -2.85);
      ctx.fillText('R2', 4.5, 2.85);
      ctx.fillText('J1', 17, -6.4);
      ctx.fillText('TP1', 12.0, 11.35);
      ctx.fillText('R3', 0.5, 7.65);
      ctx.fillText('D1', 5.0, 7.65);
      ctx.font = font(0.95, 500);
      ctx.textAlign = 'left';
      ['3V3', 'SDA', 'SCL', 'GND'].forEach(function (s, k) { ctx.fillText(s, 18.95, -3.81 + k * 2.54); });
      ctx.font = font(1.05, 500);
      ctx.textAlign = 'center';
      ctx.fillText('4 KATMAN · 1,6 mm', -6, 13.5);
      ctx.fillText('rev 1.0', 11.5, 13.5);
    });
    var texWeave = weaveTex('#C4B378', '#D3C48E', '#9C8B55');
    texWeave.repeat.set(BW / 3.2, BH / 3.2);
    var texWeaveCore = weaveTex('#AE9A58', '#BEAA68', '#85733F');
    texWeaveCore.repeat.set(BW / 3.2, BH / 3.2);
    afterFonts([texSilk]);

    /* ---------- geometry ---------- */
    function withHoles(shape) {
      tht.forEach(function (h) { shape.holes.push(circHole(h.x, h.y, h.drill / 2)); });
      vias.forEach(function (h) { shape.holes.push(circHole(h.x, h.y, VIA_DRILL / 2)); });
      mholes.forEach(function (h) { shape.holes.push(circHole(h[0], h[1], 1.6)); });
      return shape;
    }
    var mEdge = new THREE.MeshStandardMaterial({ color: 0xA8955C, roughness: 0.75, metalness: 0, envMapIntensity: 0.35 });
    var mWeave = new THREE.MeshStandardMaterial({ color: 0xffffff, map: texWeave, roughness: 0.55, metalness: 0, envMapIntensity: 0.3 });
    var mWeaveCore = new THREE.MeshStandardMaterial({ color: 0xffffff, map: texWeaveCore, roughness: 0.62, metalness: 0, envMapIntensity: 0.3 });
    function copperMat(tex) {
      return new THREE.MeshStandardMaterial({ map: tex, color: 0xffffff, metalness: 1, roughness: 0.46, envMapIntensity: 0.62, alphaTest: 0.5, side: THREE.DoubleSide });
    }
    var planeGeo = topUV(new THREE.PlaneGeometry(BW, BH).rotateX(-Math.PI / 2), BW, BH);

    var board = new THREE.Group();
    v.scene.add(board);
    var BASE = 9, GAP = 8.6;

    var L = [];
    function addLayer(key, mesh, y0, label) {
      board.add(mesh);
      var o = { key: key, mesh: mesh, y0: y0, slot: L.length, label: label, y: y0 };
      L.push(o);
      return o;
    }
    function dielectric(th, core) {
      var g = topUV(slab(withHoles(rrShape(0, 0, BW, BH, BR)), th, { bevel: 0 }), BW, BH);
      var mw = core ? mWeaveCore : mWeave;
      var m = new THREE.Mesh(g, [mw, mw, mEdge]);
      m.castShadow = true; m.receiveShadow = true;
      return m;
    }
    var mMask = new THREE.MeshPhysicalMaterial({ map: texMask, color: 0xffffff, transparent: true, opacity: 0, roughness: 0.55, side: THREE.DoubleSide, depthWrite: false, envMapIntensity: 0.18 });
    var mMaskBaked = new THREE.MeshPhysicalMaterial({ map: texMaskBaked, color: 0xffffff, transparent: true, opacity: 1, roughness: 0.5, clearcoat: 0.12, clearcoatRoughness: 0.5, side: THREE.DoubleSide, depthWrite: false, envMapIntensity: 0.16 });
    var mSilk = new THREE.MeshStandardMaterial({ map: texSilk, color: 0xffffff, roughness: 0.75, transparent: true, side: THREE.DoubleSide, depthWrite: false, envMapIntensity: 0.5 });
    var mCu = new THREE.MeshStandardMaterial({ color: COL.copper, metalness: 1, roughness: 0.36, envMapIntensity: 0.85, side: THREE.DoubleSide });
    var mAu = new THREE.MeshStandardMaterial({ color: COL.gold, metalness: 1, roughness: 0.26, envMapIntensity: 0.9, side: THREE.DoubleSide });
    function copperLayer(gCu, gAu) {
      var g = new THREE.Group();
      var a = new THREE.Mesh(gCu, mCu), b = new THREE.Mesh(gAu, mAu);
      b.position.y = 0.004;
      a.castShadow = b.castShadow = true;
      a.receiveShadow = b.receiveShadow = true;
      g.add(a); g.add(b);
      return g;
    }

    // a = anchor for the label, in board coordinates (a feature that belongs to that layer)
    var lyL4 = addLayer('L4', copperLayer(geoL4Cu, geoL4Au), -0.02, 'alt bakır');
    lyL4.a = [-6.0, 9.6];
    var lyPP2 = addLayer('pp2', dielectric(0.22), 0, 'prepreg');
    var lyL3 = addLayer('L3', new THREE.Mesh(planeGeo, copperMat(texL3)), 0.24, 'iç bakır: besleme (3,3 V)');
    lyL3.a = [-23.6, 15.6];
    addLayer('core', dielectric(1.0, true), 0.22, 'FR-4 çekirdek');
    var lyL2 = addLayer('L2', new THREE.Mesh(planeGeo, copperMat(texL2)), 1.24, 'iç bakır: GND (0 V)');
    lyL2.a = [-23.6, 15.6];
    addLayer('pp1', dielectric(0.22), 1.22, 'prepreg: reçineli cam elyaf');
    var lyL1 = addLayer('L1', copperLayer(geoL1Cu, geoL1Au), 1.465, 'üst bakır: yollar, pedler');
    lyL1.a = [-13.4, 6.0];
    var maskGroup = new THREE.Group();
    var maskPlain = new THREE.Mesh(planeGeo, mMask), maskBaked = new THREE.Mesh(planeGeo, mMaskBaked);
    maskPlain.renderOrder = 2; maskBaked.renderOrder = 2;
    maskGroup.add(maskPlain); maskGroup.add(maskBaked);
    var lyMask = addLayer('mask', maskGroup, 1.5, 'lehim maskesi');
    lyMask.a = [-23.4, 15.4];
    var lySilk = addLayer('silk', new THREE.Mesh(planeGeo, mSilk), 1.53, 'serigrafi: yazılar');
    lySilk.a = [-12.4, 13.5];
    lySilk.mesh.renderOrder = 4;
    // faint sheet so the floating silkscreen reads as a layer while exploded
    var ghost = new THREE.Mesh(planeGeo, new THREE.MeshBasicMaterial({ color: dark ? 0xAAB3C4 : 0x7B8494, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide }));
    ghost.renderOrder = 3;
    board.add(ghost);
    L.forEach(function (l) { l.mesh.receiveShadow = true; });
    lyL1.mesh.castShadow = lyL2.mesh.castShadow = lyL4.mesh.castShadow = true;
    L[3].mesh.castShadow = true;

    // plated barrels: vias and the header's through-holes
    var mBarrel = new THREE.MeshStandardMaterial({ color: COL.copper, metalness: 1, roughness: 0.3, side: THREE.DoubleSide });
    var barrelGeo = merge(vias.map(function (h) { return placed(barrel(VIA_DRILL / 2 - 0.01, 14), h.x, 0, h.y); })
      .concat(tht.map(function (h) { return placed(barrel(h.drill / 2 - 0.01, 22), h.x, 0, h.y); })));
    var barrels = new THREE.Mesh(barrelGeo, mBarrel);
    barrels.castShadow = true;
    board.add(barrels);

    /* ---------- current pulse ---------- */
    var pulse = glowSprite(0xF2B550, 5.6, 0, true);
    var pulseCore = glowSprite(0xFFFFFF, 1.8, 0);
    board.add(pulse); board.add(pulseCore);
    var trail = [];
    for (var ti = 0; ti < 7; ti++) { var tsp = glowSprite(0xF2B550, 3.6 - ti * 0.3, 0, true); trail.push(tsp); board.add(tsp); }
    var viaPulse = glowSprite(0xF2B550, 3.6, 0, true);
    viaPulse.material.depthTest = false;
    viaPulse.renderOrder = 5;
    board.add(viaPulse);
    var ringTex = canvasTex(256, 256, function (ctx) {
      var g = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
      g.addColorStop(0, 'rgba(255,255,255,0)');
      g.addColorStop(0.55, 'rgba(255,255,255,0.05)');
      g.addColorStop(0.84, 'rgba(255,255,255,0.85)');
      g.addColorStop(0.92, 'rgba(255,255,255,0.35)');
      g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, 256, 256);
    }, { linear: true });
    var ring = new THREE.Mesh(new THREE.PlaneGeometry(2, 2).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({ map: ringTex, color: 0xFFD9A0, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, side: THREE.DoubleSide }));
    ring.renderOrder = 4;
    board.add(ring);
    var pPath = pathOf(pulsePath.map(function (p) { return [p[0], 0, p[1]]; }));
    var tmpP = [0, 0, 0];
    var viaPx = pulsePath[pulsePath.length - 1][0], viaPz = pulsePath[pulsePath.length - 1][1];

    /* ---------- labels ---------- */
    var COLR = 204, MINGAP = 27;
    var tmpV = new THREE.Vector3();
    var colY = [], anY = [];
    function anchorOf(l, out) {
      if (l.a) out.set(l.a[0], l.y + 0.02, l.a[1]);
      else out.set(-BW / 2 + 0.6, l.y + (l.key === 'core' ? 0.5 : 0.11), BH / 2);
      return board.localToWorld(out);
    }
    // evenly spaced label column that follows the stack (bottom label = layer 0)
    function computeColumn() {
      var j, n = L.length, sumA = 0, sumC = 0;
      for (j = 0; j < n; j++) { anY[j] = v.project(anchorOf(L[j], tmpV)).y; colY[j] = anY[j]; }
      for (j = 1; j < n; j++) if (colY[j] > colY[j - 1] - MINGAP) colY[j] = colY[j - 1] - MINGAP;
      for (j = 0; j < n; j++) { sumA += anY[j]; sumC += colY[j]; }
      var sh = (sumA - sumC) / n;
      for (j = 0; j < n; j++) colY[j] += sh;
    }
    var labels = L.map(function (l, idx) {
      var lab = v.label(l.label, { cls: 'plain', align: 'right', line: true, dx: 0, dy: 0 });
      var anchor = new THREE.Vector3();
      lab.at = function () {
        if (idx === 0) computeColumn();
        anchorOf(l, anchor);
        var P = v.project(anchor);
        lab.dx = COLR - P.x;
        lab.dy = colY[idx] - P.y;
        return anchor;
      };
      return lab;
    });
    var viaLab = v.label('via: kaplamalı delik,<br>katmanları birbirine<br>bağlar', { cls: 'plain', html: true, align: 'left', line: true, dx: 30, dy: 30 });
    var viaAnchor = new THREE.Vector3();
    viaLab.at = function () {
      var h = vias[4];
      viaAnchor.set(h.x, lerp(lyL2.y, lyL1.y, 0.35), h.y);
      board.localToWorld(viaAnchor);
      return viaAnchor;
    };
    var asmLab1 = v.label('yeşil maskenin altında bakır yollar', { cls: 'plain', align: 'right', line: true, dx: 110, dy: -120 });
    var asmA1 = new THREE.Vector3();
    asmLab1.at = function () { asmA1.set(9.5, lyMask.y, -1.27); board.localToWorld(asmA1); return asmA1; };
    var asmLab2 = v.label('altın kaplı pedler', { cls: 'plain', align: 'left', line: true, dx: 50, dy: 62 });
    var asmA2 = new THREE.Vector3();
    asmLab2.at = function () { asmA2.set(17, lyMask.y, 3.81); board.localToWorld(asmA2); return asmA2; };
    var asmLab3 = v.label('via', { cls: 'plain', align: 'right', line: true, dx: -52, dy: 44 });
    var asmA3 = new THREE.Vector3();
    asmLab3.at = function () { asmA3.set(-13.4, lyMask.y, 11.6); board.localToWorld(asmA3); return asmA3; };
    // projector-sized label text
    labels.concat([viaLab, asmLab1, asmLab2, asmLab3]).forEach(function (lb) { lb.el.style.fontSize = '15px'; lb.el.style.fontWeight = '500'; lb.el.style.color = dark ? '#E6E9EF' : '#262A33'; });

    /* ---------- state ---------- */
    var auto = true, target = 0, e = 0, lastTarget = -1;
    var VIEW0 = { yaw: 0.42, pitch: 0.72, distance: 150, target: [0, 0, 3] };
    var VIEW1 = { yaw: 0.42, pitch: 0.44, distance: 250, target: [-10, 40, 0] };

    function layout(ex) {
      var k = EZ.inOut(clamp(ex, 0, 1));
      for (var j = 0; j < L.length; j++) {
        var l = L[j];
        l.y = l.y0 + l.slot * GAP * k;
        l.mesh.position.y = l.y;
      }
      barrels.position.y = lyL4.y - 0.02;
      barrels.scale.y = (lyL1.y - lyL4.y) + 0.04;
      return k;
    }

    function reset() {
      auto = true; target = 0; e = 0; lastTarget = 0;
      board.rotation.set(0, 0, 0);
      board.position.set(0, BASE, 0);
      layout(0);
      v.setView(VIEW0);
    }

    reset();
    return {
      reset: reset,
      set: function (key, val) {
        if (key === 'exploded') { auto = false; target = (+val) ? 1 : 0; }
      },
      read: function (key) {
        if (key === 'fact') return FACT;
        if (key === 'exploded') return target ? '1 · katmanlar ayrık' : '0 · kart birleşik';
        return '';
      },
      frame: function (t, dt) {
        var rm = K.reducedMotion;
        if (auto) {
          target = t < 3 ? 0 : (Math.floor((t - 3) / 8) % 2 === 0 ? 1 : 0);
          if (rm) target = 1;
        }
        if (target !== lastTarget) {
          lastTarget = target;
          var to = target ? VIEW1 : VIEW0;
          v.animateTo({ distance: to.distance, pitch: to.pitch, target: to.target }, rm ? 0.01 : 1.8);
        }
        var speed = dt / (rm ? 0.01 : 1.8);
        if (e < target) e = Math.min(target, e + speed); else if (e > target) e = Math.max(target, e - speed);
        var k = layout(e);
        board.rotation.y = rm ? 0 : Math.sin(t * 2 * Math.PI / 28) * 0.28;

        // pulse every 4,2 s: top trace (1,2 s) → down the via (0,8 s) → spreads in the plane (1,4 s)
        var pc = rm ? -1 : (t % 4.2);
        var on = pc >= 0;
        var a = on ? span(pc, 0.2, 1.4) : 0, b = on ? span(pc, 1.4, 2.2) : 0, c = on ? span(pc, 2.2, 3.6) : 0;
        if (on && pc > 0.2 && pc < 1.4) {
          pPath.at(pPath.len * EZ.inOut(a), tmpP);
          pulse.position.set(tmpP[0], lyL1.y + 0.3, tmpP[2]);
          pulseCore.position.copy(pulse.position);
          var fa = Math.min(1, a * 6) * Math.min(1, (1 - a) * 8 + 0.6);
          pulse.material.opacity = 0.95 * fa; pulseCore.material.opacity = 0.9 * fa;
          var head = pPath.len * EZ.inOut(a);
          for (var tj = 0; tj < trail.length; tj++) {
            pPath.at(Math.max(0, head - (tj + 1) * 0.9), tmpP);
            trail[tj].position.set(tmpP[0], lyL1.y + 0.25, tmpP[2]);
            trail[tj].material.opacity = fa * 0.55 * (1 - tj / trail.length);
          }
        } else {
          pulse.material.opacity = 0; pulseCore.material.opacity = 0;
          for (var tk = 0; tk < trail.length; tk++) trail[tk].material.opacity = 0;
        }
        if (on && pc >= 1.4 && pc < 2.2 && k > 0.35) {
          viaPulse.position.set(viaPx, lerp(lyL1.y, lyL2.y, EZ.inOut(b)), viaPz);
          viaPulse.material.opacity = 0.9 * Math.min(1, (k - 0.35) * 3);
        } else viaPulse.material.opacity = 0;
        if (on && pc >= 2.2 && pc < 3.6 && k > 0.35) {
          var rr = 1.5 + EZ.out(c) * 12;
          ring.scale.set(rr, 1, rr);
          ring.position.set(viaPx, lyL2.y + 0.08, viaPz);
          ring.material.opacity = 0.9 * Math.pow(1 - c, 1.4) * Math.min(1, (k - 0.35) * 3);
        } else ring.material.opacity = 0;

        // assembled: opaque mask with the copper relief; separating: translucent sheet
        var ms = sm(k / 0.14);
        mMaskBaked.opacity = 1 - ms;
        mMask.opacity = 0.8 * ms;
        maskBaked.visible = ms < 0.999;
        maskPlain.visible = ms > 0.001;
        ghost.position.y = lySilk.y - 0.04;
        ghost.material.opacity = 0.42 * k;
        ghost.visible = k > 0.01;
        var showEx = k > 0.7;
        for (var j = 0; j < labels.length; j++) labels[j].show(showEx);
        viaLab.show(showEx);
        var showAsm = k < 0.08;
        asmLab1.show(showAsm); asmLab2.show(showAsm); asmLab3.show(showAsm);
        v.render(dt);
        if (!K.skipRender && k > 0.7) {
          K.label(v.ctx, 'KALINLIKLAR ÖLÇEKLİ DEĞİL', v.w - 16, v.h - 16, { mono: true, size: 11, weight: 500, spacing: 1.3, color: dark ? K.palette.onNightMuted : '#595E69', align: 'right', alpha: span(k, 0.7, 1) });
        }
      }
    };
  });

  /* =====================================================================
   * dev-board · S 680×520 · light
   * A generic ESP32-style development board (no logos): guided tour.
   * ===================================================================== */
  K.register('dev-board', function (el, opts) {
    var THREE = TH();
    opts = opts || {};
    var dark = opts.theme === 'dark';
    var TEXT = {
      usb: 'USB-C girişi: kablodan 5 V güç (VBUS) ve veri (D+, D−) girer; GND dönüş yoludur.',
      usbchip: 'USB-seri çevirici çip: bilgisayardan gelen D+/D− verisini işlemcinin TX/RX hattına çevirir, yanıtı geri taşır.',
      regulator: 'Regülatör: 5 V girer, 3,3 V çıkar; aradaki 5 − 3,3 = 1,7 V ısıya dönüşür.',
      mcu: 'ESP32 modülü: 240 MHz çift çekirdek, 520 KB RAM, 4 MB flaş ve radyo (Wi-Fi, Bluetooth) tek modülde.',
      crystal: 'Kristal: saniyede 40 milyon kez titreşir (40 MHz); işlemcinin tüm işleri bu saat tıklarıyla ilerler.',
      antenna: 'Anten: PCB üzerindeki zikzak bakır yol; 2,4 GHz radyo dalgası yayar ve yakalar (Wi-Fi, Bluetooth).',
      buttons: 'Düğmeler: EN kartı yeniden başlatır; BOOT ile birlikte basılınca kart yeni program yüklemeye hazırlanır.',
      pins: 'Pinler: 3V3 pini 3,3 V verir, GND 0 V noktasıdır, GPIO pinleri 0 ya da 3,3 V okur veya verir.',
      gnd: 'GND pinleri ve toprak katmanı: kart boyunca tek bakır ağdır; hepsi aynı sıfır noktasıdır (0 V).',
      led: 'Güç LED\'i: küçük bir dirençten geçen akımla yanar; kartın elektrik aldığını gösterir.',
      caps: 'Kondansatör ve dirençler: küçük kondansatörler gerilimi düzler; USB\'deki iki 5,1 kΩ direnç kartı 5 V isteyen cihaz olarak tanıtır.'
    };
    var ORDER = ['usb', 'usbchip', 'regulator', 'mcu', 'crystal', 'antenna', 'buttons', 'pins', 'gnd', 'led', 'caps'];
    var HOME = { yaw: 0.52, pitch: 0.62, distance: 182, target: [1, 15, 1] };
    var v = K.stage3d(el, {
      theme: opts.theme, fov: 28, near: 2, far: 3000, yaw: HOME.yaw, pitch: HOME.pitch, distance: HOME.distance,
      target: HOME.target, size: 48, ground: 0, minDistance: 40, maxDistance: 360
    });
    (function () {
      var cv = v.sf && v.sf.canvas;
      if (!cv) return;
      var mh = 'linear-gradient(to right, transparent, #000 28px, #000 calc(100% - 28px), transparent)', mv = 'linear-gradient(to bottom, transparent, #000 28px, #000 calc(100% - 28px), transparent)';
      cv.style.webkitMaskImage = mh + ', ' + mv; cv.style.maskImage = mh + ', ' + mv;
      cv.style.webkitMaskComposite = 'source-in'; cv.style.maskComposite = 'intersect';
    })();
    if (!v.ready) return { reset: function () {}, frame: function (t, dt) { v.render(dt); }, read: function (k) { return k === 'part' ? TEXT.usb : ''; } };
    tuneLights(v, { key: 0.85, fill: 0.9, rim: 1.0, hemi: 0.8, shadowBias: 0.03, shadow: 0.16, exposure: 0.92 });

    var i, j;
    var BW = 64, BH = 28, BT = 1.6, BR = 1.4;
    var LIFT = 12, Y0 = 8.5 + LIFT, TOP = Y0 + BT, PINBOT = LIFT;   // the board floats a little, product-shot style
    var PINX = [];
    for (i = 0; i < 20; i++) PINX.push(-24.13 + i * 2.54);
    var ROWY = [-12.7, 12.7];
    var NAMES = [
      ['VIN', 'GND', 'A0', 'A1', 'A2', 'A3', 'A4', 'A5', 'TX', 'RX', 'D14', 'D15', 'D16', 'D17', 'D18', 'D19', 'MOSI', 'MISO', 'SCK', '3V3'],
      ['5V', 'GND', 'D0', 'D1', 'D2', 'D3', 'D4', 'D5', 'D6', 'D7', 'D8', 'D9', 'D10', 'D11', 'D12', 'D13', 'SDA', 'SCL', 'GND', '3V3']
    ];

    /* ---------- layout (board coordinates, mm) ---------- */
    var REG = { x: -16.5, y: -6.2 };          // SOT-223 body centre
    var UART = { x: -16.5, y: 5.0 };          // USB–UART bridge, QFN 4×4
    var LED = { x: -7.6, y: 8.4 };            // 0603 power LED
    var MOD = { x0: 6.5, x1: 32, y0: -9, y1: 9 };
    var CAN = { x0: 6.8, x1: 24.2, y0: -8, y1: 8 };
    var BTN = [{ x: -26.4, y: -8.0, name: 'EN' }, { x: -26.4, y: 8.0, name: 'BOOT' }];
    var passives = [
      { x: -21.6, y: -6.2, r: 1, s: '0805', c: 1 }, { x: -11.4, y: -6.2, r: 1, s: '0805', c: 1 },
      { x: -20.6, y: 5.0, r: 1, s: '0402', c: 1 }, { x: -12.6, y: 5.0, r: 1, s: '0402', c: 1 },
      { x: -16.5, y: 8.2, r: 0, s: '0402', c: 0 }, { x: -16.5, y: 1.8, r: 0, s: '0402', c: 0 },
      { x: -7.6, y: 6.4, r: 0, s: '0402', c: 0 }, { x: -22.6, y: -9.3, r: 0, s: '0402', c: 0 },
      { x: -22.6, y: 9.3, r: 0, s: '0402', c: 0 }, { x: -2.2, y: -6.0, r: 1, s: '0603', c: 1 },
      { x: -2.2, y: -2.0, r: 1, s: '0603', c: 1 }, { x: 2.4, y: -8.2, r: 0, s: '0402', c: 1 },
      { x: 2.4, y: 7.6, r: 0, s: '0402', c: 0 }, { x: -2.2, y: 3.4, r: 1, s: '0402', c: 0 },
      { x: -8.0, y: -2.4, r: 0, s: '0603', c: 1 },
      { x: -24.0, y: -3.6, r: 1, s: '0603', c: 0 }, { x: -24.0, y: 3.2, r: 1, s: '0603', c: 0 }    // 5,1 kΩ CC resistors
    ];
    var SZ = { '0402': [1.0, 0.5, 0.35], '0603': [1.6, 0.8, 0.45], '0805': [2.0, 1.25, 0.6] };

    // copper (under the mask): power path and signal traces
    var powerTr = [
      { w: 0.9, p: [[-27.6, -1.4], [-22.4, -1.4], [-20.2, -3.6], [-14.2, -3.6], [-14.2, -4.3]] },          // VBUS → IN
      { w: 0.9, p: [[-16.5, -8.6], [-16.5, -10.2], [5.2, -10.2], [7.6, -7.8]] }                         // OUT → module 3V3
    ];
    var sigTr = [
      { w: 0.25, p: [[-27.6, 0.5], [-21.0, 0.5], [-18.5, 3.0]] },
      { w: 0.25, p: [[-27.6, 1.2], [-21.4, 1.2], [-18.5, 4.1]] },
      { w: 0.25, p: [[-14.5, 4.2], [-6.0, 4.2], [-4.0, 2.2], [5.4, 2.2], [6.5, 1.1]] },
      { w: 0.25, p: [[-14.5, 5.6], [-5.6, 5.6], [-3.6, 3.6], [5.4, 3.6], [6.5, 2.5]] },
      { w: 0.25, p: [[-24.2, -8.0], [-22.0, -8.0], [-19.6, -10.4]] },
      { w: 0.25, p: [[-24.2, 8.0], [-21.0, 8.0], [-19.4, 6.4]] },
      { w: 0.4, p: [[-7.6, 7.3], [-7.6, 5.2]] }
    ];
    // module edge pads to header pins
    for (i = 0; i < 12; i++) {
      var mx = 8.6 + i * 1.27;
      var pk = 12 + Math.round(i * 0.62);
      var px = PINX[Math.min(19, pk)];
      sigTr.push({ w: 0.25, p: [[mx, 9.2], [mx, 10.0], [px, 10.0 + Math.min(1.2, Math.abs(px - mx) * 0.2)], [px, 12.7]] });
      sigTr.push({ w: 0.25, p: [[mx, -9.2], [mx, -10.0], [px, -10.0 - Math.min(1.2, Math.abs(px - mx) * 0.2)], [px, -12.7]] });
    }
    for (i = 2; i < 11; i++) {
      sigTr.push({ w: 0.25, p: [[PINX[i], 12.7], [PINX[i], 11.0], [PINX[i] + 1.0, 10.0], [PINX[i] + 1.0, 9.4 - (i % 3) * 0.6]] });
      sigTr.push({ w: 0.25, p: [[PINX[i], -12.7], [PINX[i], -11.0], [PINX[i] + 1.0, -10.0 + (i > 6 ? 0 : 0.0)]] });
    }
    var viasD = [[-19.6, -10.4], [-19.4, 6.4], [-6.0, 4.2], [-4.4, -3.8], [3.4, -4.4], [3.6, 5.2], [-12.0, 0.0], [-25.0, -4.6], [-25.0, 4.6]];
    for (i = 2; i < 11; i++) viasD.push([PINX[i] + 1.0, 9.4 - (i % 3) * 0.6]);

    /* ---------- textures ---------- */
    var MASK = '#1F3263', MASK_TR = '#2B4479', SILK = '#EEF0F2';
    function traceStroke(ctx, list, color, extra) {
      ctx.strokeStyle = color; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      list.forEach(function (t) { ctx.lineWidth = t.w + (extra || 0); poly(ctx, t.p); ctx.stroke(); });
    }
    var texTop = boardTex(BW, BH, 22, function (ctx) {
      ctx.fillStyle = MASK;
      rrPath(ctx, 0, 0, BW, BH, BR); ctx.fill();
      // copper relief under the mask
      ctx.globalAlpha = 0.5; traceStroke(ctx, powerTr.concat(sigTr), '#16244A', 0.18); ctx.globalAlpha = 1;
      traceStroke(ctx, powerTr.concat(sigTr), MASK_TR);
      // keep-out under the antenna: no copper, slightly different tone
      ctx.fillStyle = 'rgba(255,255,255,0.03)';
      ctx.fillRect(24.4, -9.4, 7.6, 18.8);
      // silkscreen
      ctx.strokeStyle = ctx.fillStyle = SILK;
      ctx.lineWidth = 0.15;
      // header outlines
      ROWY.forEach(function (ry) { rrPath(ctx, 0, ry, 51.2, 2.7, 0.2); ctx.stroke(); });
      // pin labels, rotated, inside the board
      ctx.font = font(0.86, 600);
      ctx.textBaseline = 'middle';
      for (var r = 0; r < 2; r++) {
        for (var k = 0; k < 20; k++) {
          ctx.save();
          var ly = r === 0 ? -10.75 : 10.75;
          ctx.translate(PINX[k], ly);
          ctx.rotate(-Math.PI / 2);
          ctx.textAlign = r === 0 ? 'right' : 'left';
          ctx.fillText(NAMES[r][k], r === 0 ? 0.55 : -0.55, 0);
          ctx.restore();
        }
      }
      // component marks
      ctx.font = font(1.1, 600);
      ctx.textAlign = 'center';
      BTN.forEach(function (b) { ctx.fillText(b.name, b.x + 0.2, b.y + (b.y < 0 ? -2.75 : 2.75)); });
      ctx.fillText('PWR', LED.x + 2.6, LED.y + 0.05);
      ctx.font = font(0.95, 500);
      ctx.fillText('3V3', REG.x, REG.y - 3.3);
      rrPath(ctx, REG.x, REG.y + 0.4, 8.2, 7.6, 0.3); ctx.stroke();
      rrPath(ctx, UART.x, UART.y, 5.4, 5.4, 0.3); ctx.stroke();
      disc(ctx, UART.x - 3.1, UART.y - 3.1, 0.22); ctx.fill();
      // board name and version (generic, no logo)
      ctx.font = font(1.25, 600);
      ctx.textAlign = 'left';
      ctx.fillText('ESP32 · Wi-Fi + BT', -11.2, -0.6);
      ctx.font = font(0.95, 500);
      ctx.fillText('geliştirme kartı · v1.0', -11.2, 1.25);
      ctx.fillText('5V', -27.2, -3.2);
      // antenna keep-out marks
      ctx.setLineDash([0.5, 0.45]);
      ctx.strokeRect(24.5, -9.5, 7.3, 19);
      ctx.setLineDash([]);
    });
    var texModule = boardTex(25.5, 18, 26, function (ctx) {
      ctx.fillStyle = '#17181C';
      rrPath(ctx, 0, 0, 25.5, 18, 0.4); ctx.fill();
      // castellated pads along the edges
      ctx.fillStyle = '#C9A24C';
      for (var k = 0; k < 14; k++) {
        var x = -10.5 + k * 1.27;
        rrPath(ctx, x, -8.6, 0.8, 1.0, 0.1); ctx.fill();
        rrPath(ctx, x, 8.6, 0.8, 1.0, 0.1); ctx.fill();
      }
      for (k = 0; k < 10; k++) { rrPath(ctx, -12.35, -5.7 + k * 1.27, 1.0, 0.8, 0.1); ctx.fill(); }
      // meandering inverted-F antenna, copper under black mask
      ctx.strokeStyle = '#8E7440';
      ctx.lineWidth = 0.42;
      ctx.lineJoin = 'miter';
      var ax0 = 6.6, ax1 = 11.9, yy = -7.6;
      ctx.beginPath();
      ctx.moveTo(ax0, -7.6); ctx.lineTo(ax0, 6.6);
      ctx.moveTo(ax0 + 0.9, -7.6); ctx.lineTo(ax0 + 0.9, -5.2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(ax0, 6.6);
      var up = false;
      for (var m = 0; m < 6; m++) {
        var y1 = 6.6 - m * 2.4;
        ctx.lineTo(up ? ax0 + 0.9 : ax1, y1);
        ctx.lineTo(up ? ax0 + 0.9 : ax1, y1 - 1.2);
        ctx.lineTo(up ? ax1 : ax0 + 0.9, y1 - 1.2);
        up = !up;
      }
      ctx.stroke();
      ctx.fillStyle = '#8E7440';
      ctx.fillRect(ax0 - 0.3, yy - 0.3, 1.6, 0.6);
    });
    var texCanTop = canvasTex(256, 256, function (ctx) {
      // brushed tin-plated steel with a small generic data-matrix
      var rnd = K.rng(77);
      ctx.fillStyle = '#B9BEC6';
      ctx.fillRect(0, 0, 256, 256);
      for (var k = 0; k < 520; k++) {
        ctx.fillStyle = rnd() < 0.5 ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.05)';
        ctx.fillRect(0, rnd() * 256, 256, 0.6 + rnd() * 1.2);
      }
      ctx.fillStyle = 'rgba(40,44,52,0.55)';
      var n = 12, s = 3.4, ox = 176, oy = 30;
      for (var a = 0; a < n; a++) for (var b = 0; b < n; b++) {
        if (a === 0 || b === n - 1 || (a + b * 3 + (a * b) % 5) % 3 === 0) ctx.fillRect(ox + a * s, oy + b * s, s - 0.4, s - 0.4);
      }
    });
    var texReg = canvasTex(128, 64, function (ctx) {
      ctx.fillStyle = '#1C1D21'; ctx.fillRect(0, 0, 128, 64);
      ctx.fillStyle = 'rgba(210,212,216,0.75)';
      ctx.font = font(15, 500, true);
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('3V3  K12', 64, 30);
    });
    afterFonts([texTop, texReg]);

    /* ---------- materials ---------- */
    var mBoardTop = new THREE.MeshPhysicalMaterial({ map: texTop, roughness: 0.5, clearcoat: 0.2, clearcoatRoughness: 0.45, envMapIntensity: 0.45 });
    var mBoardEdge = new THREE.MeshStandardMaterial({ color: 0x2A3550, roughness: 0.7 });
    var mBoardBot = new THREE.MeshStandardMaterial({ color: 0x1F2D52, roughness: 0.6 });
    var mGold = K.mat.gold({ roughness: 0.26, envMapIntensity: 0.9 });
    var mTin = K.mat.tin({ roughness: 0.2, envMapIntensity: 1.0 });
    var mSteel = K.mat.steel({ roughness: 0.32 });
    var mCanTop = new THREE.MeshStandardMaterial({ map: texCanTop, metalness: 1, roughness: 0.34, color: 0xffffff });
    var mEpoxy = new THREE.MeshStandardMaterial({ color: 0x1D1E22, roughness: 0.62, metalness: 0 });
    var mRegTop = new THREE.MeshStandardMaterial({ map: texReg, roughness: 0.62 });
    var mPlastic = K.mat.plasticBlack({ roughness: 0.55 });
    var mCeramic = new THREE.MeshStandardMaterial({ color: 0xB59468, roughness: 0.55 });
    var mResBlack = new THREE.MeshStandardMaterial({ color: 0x202126, roughness: 0.5 });
    var texAntGlow = boardTex(25.5, 18, 12, function (ctx) {
      ctx.fillStyle = '#000'; ctx.fillRect(-13, -9, 26, 18);
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 0.55; ctx.lineJoin = 'miter';
      var ax0 = 6.6, ax1 = 11.9, up = false;
      ctx.beginPath(); ctx.moveTo(ax0, -7.6); ctx.lineTo(ax0, 6.6); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(ax0, 6.6);
      for (var m = 0; m < 6; m++) {
        var y1 = 6.6 - m * 2.4;
        ctx.lineTo(up ? ax0 + 0.9 : ax1, y1); ctx.lineTo(up ? ax0 + 0.9 : ax1, y1 - 1.2); ctx.lineTo(up ? ax1 : ax0 + 0.9, y1 - 1.2);
        up = !up;
      }
      ctx.stroke();
    });
    var mModule = new THREE.MeshStandardMaterial({ map: texModule, roughness: 0.48, envMapIntensity: 0.5, emissiveMap: texAntGlow, emissive: 0xF2B550, emissiveIntensity: 0 });
    var mModuleEdge = new THREE.MeshStandardMaterial({ color: 0x2A2B30, roughness: 0.6 });
    var mRubber = new THREE.MeshStandardMaterial({ color: 0x3A3E46, roughness: 0.62 });
    var mCable = new THREE.MeshStandardMaterial({ color: 0x3A3E46, roughness: 0.55 });

    var root = new THREE.Group();
    v.scene.add(root);
    function at(x, y) { return [x, y]; }

    /* ---------- board ---------- */
    var holes = [];
    ROWY.forEach(function (ry) { PINX.forEach(function (px) { holes.push([px, ry]); }); });
    var bShape = rrShape(0, 0, BW, BH, BR);
    holes.forEach(function (h) { bShape.holes.push(circHole(h[0], h[1], 0.5)); });
    var boardGeo = topUV(slab(bShape, BT, { bevel: 0.12, bevelSegments: 2, curveSegments: 10 }), BW, BH);
    var boardMesh = new THREE.Mesh(boardGeo, [mBoardBot, mBoardTop, mBoardEdge]);
    boardMesh.position.y = Y0;
    boardMesh.castShadow = true; boardMesh.receiveShadow = true;
    root.add(boardMesh);

    // exposed pads (gold) and vias (tin)
    var padRings = [], padRects = [];
    ROWY.forEach(function (ry, r) { PINX.forEach(function (px, k) { padRings.push({ x: px, y: ry, d: 1.75, drill: 1.0, sq: k === 0 }); }); });
    passives.forEach(function (p) {
      var s = SZ[p.s], L2 = s[0] / 2 + 0.15;
      var pw = s[1] * 0.9 + 0.2, pl = s[0] * 0.45;
      if (p.r) { padRects.push({ x: p.x, y: p.y - L2 + pl / 2, w: pw, h: pl }); padRects.push({ x: p.x, y: p.y + L2 - pl / 2, w: pw, h: pl }); }
      else { padRects.push({ x: p.x - L2 + pl / 2, y: p.y, w: pl, h: pw }); padRects.push({ x: p.x + L2 - pl / 2, y: p.y, w: pl, h: pw }); }
    });
    [-2.3, 0, 2.3].forEach(function (dx) { padRects.push({ x: REG.x + dx, y: REG.y + 3.15, w: 1.1, h: 1.9 }); });
    padRects.push({ x: REG.x, y: REG.y - 3.15, w: 3.4, h: 1.9 });
    padRects.push({ x: LED.x - 0.85, y: LED.y, w: 0.75, h: 0.9 }); padRects.push({ x: LED.x + 0.85, y: LED.y, w: 0.75, h: 0.9 });
    BTN.forEach(function (b) { [[-2.6, -1.3], [2.6, -1.3], [-2.6, 1.3], [2.6, 1.3]].forEach(function (o) { padRects.push({ x: b.x + o[0], y: b.y + o[1], w: 1.0, h: 0.9 }); }); });
    for (i = 0; i < 6; i++) { padRects.push({ x: UART.x - 2.25, y: UART.y - 1.25 + i * 0.5, w: 0.6, h: 0.28 }); padRects.push({ x: UART.x + 2.25, y: UART.y - 1.25 + i * 0.5, w: 0.6, h: 0.28 }); }
    for (i = 0; i < 14; i++) { padRects.push({ x: MOD.x0 + 2.25 + i * 1.27, y: -9.3, w: 0.9, h: 1.2 }); padRects.push({ x: MOD.x0 + 2.25 + i * 1.27, y: 9.3, w: 0.9, h: 1.2 }); }
    for (i = 0; i < 10; i++) padRects.push({ x: MOD.x0 - 0.3, y: -5.7 + i * 1.27, w: 1.2, h: 0.9 });
    [-1, 1].forEach(function (sgn) { padRects.push({ x: -28.6, y: sgn * 4.0, w: 1.4, h: 1.2 }); });
    var gPads = flatFeatures({ rings: padRings, pads: padRects });
    var padMesh = new THREE.Mesh(gPads, mGold);
    padMesh.position.y = TOP + 0.02;
    padMesh.receiveShadow = true;
    root.add(padMesh);
    var gVias = flatFeatures({ rings: viasD.map(function (p) { return { x: p[0], y: p[1], d: 0.62, drill: 0.3 }; }) });
    var viaMesh = new THREE.Mesh(gVias, mTin);
    viaMesh.position.y = TOP + 0.02;
    root.add(viaMesh);
    // plated barrels of the header holes
    var barrelsGeo = merge(holes.map(function (h) { return placed(barrel(0.5, 14), h[0], 0, h[1]); }));
    var barrelsMesh = new THREE.Mesh(barrelsGeo, new THREE.MeshStandardMaterial({ color: COL.gold, metalness: 1, roughness: 0.3, side: THREE.DoubleSide }));
    barrelsMesh.position.y = Y0 - 0.01;
    barrelsMesh.scale.y = BT + 0.04;
    root.add(barrelsMesh);

    /* ---------- pin headers (pins point down, soldered on top) ---------- */
    var gPins = new THREE.Group();
    root.add(gPins);
    ROWY.forEach(function (ry) {
      var strip = new THREE.Mesh(rbox(50.8, 2.5, 2.5, 0.25, 0.18), mPlastic);
      strip.position.set(0, Y0 - 2.5, ry);
      strip.castShadow = true; strip.receiveShadow = true;
      gPins.add(strip);
    });
    var pinGeo = new THREE.BoxGeometry(0.64, 11.5, 0.64);
    pinGeo.translate(0, 11.5 / 2, 0);
    var pinMesh = new THREE.InstancedMesh(pinGeo, mGold, 40);
    var filletGeo = lathe([[0.0, 0], [0.86, 0], [0.8, 0.1], [0.62, 0.3], [0.47, 0.6], [0.4, 0.88], [0.0, 0.88]], 20);
    var filletMesh = new THREE.InstancedMesh(filletGeo, mTin, 40);
    var M4 = new THREE.Matrix4();
    j = 0;
    ROWY.forEach(function (ry) {
      PINX.forEach(function (px) {
        M4.makeTranslation(px, PINBOT, ry); pinMesh.setMatrixAt(j, M4);
        M4.makeTranslation(px, TOP + 0.02, ry); filletMesh.setMatrixAt(j, M4);
        j++;
      });
    });
    pinMesh.castShadow = true; filletMesh.castShadow = false;
    gPins.add(pinMesh); gPins.add(filletMesh);

    /* ---------- a jumper wire that slides up onto one pin (pins stop) ---------- */
    var JPX = PINX[6], JPZ = 12.7;
    var housing = new THREE.Mesh(rbox(2.54, 9, 2.54, 0.3, 0.14), new THREE.MeshStandardMaterial({ color: 0xC8322B, roughness: 0.5 }));
    housing.castShadow = true;
    root.add(housing);
    var jWire = dynTube(56, 10, new THREE.MeshStandardMaterial({ color: 0xC8322B, roughness: 0.4 }));
    jWire.castShadow = true;
    root.add(jWire);
    var jCtrl = [[0, 0, 0], [0, 0, 0], [0, 0, 0], [0, 0, 0], [0, 0, 0], [0, 0, 0]];
    var jPts = new Float32Array(57 * 3);
    var HOUSE_ON = Y0 - 2.5 - 0.15 - 9, HOUSE_OFF = 0.6;
    function placeJumper(k) {
      var hb = lerp(HOUSE_OFF, HOUSE_ON, k);
      housing.position.set(JPX, hb, JPZ);
      jCtrl[0][0] = JPX; jCtrl[0][1] = hb + 0.2; jCtrl[0][2] = JPZ;
      jCtrl[1][0] = JPX; jCtrl[1][1] = Math.max(0.62, hb - 2.2); jCtrl[1][2] = JPZ + 0.6;
      jCtrl[2][0] = JPX - 0.8; jCtrl[2][1] = Math.max(0.62, hb * 0.25); jCtrl[2][2] = JPZ + 6.5;
      jCtrl[3][0] = JPX - 1.5; jCtrl[3][1] = 0.62; jCtrl[3][2] = JPZ + 10;
      jCtrl[4][0] = JPX - 3; jCtrl[4][1] = 0.62; jCtrl[4][2] = JPZ + 18;
      jCtrl[5][0] = JPX - 5; jCtrl[5][1] = 0.62; jCtrl[5][2] = JPZ + 26;
      sampleCR(jCtrl, 56, jPts);
      jWire.update(jPts, 0.62, 0.62);
    }
    placeJumper(0);

    /* ---------- USB-C receptacle, plug and cable ---------- */
    var gUsb = new THREE.Group();
    root.add(gUsb);
    function stadium(w, h, path) {
      var r = h / 2, p = path || new THREE.Shape();
      p.moveTo(-w / 2 + r, -r);
      p.lineTo(w / 2 - r, -r);
      p.absarc(w / 2 - r, 0, r, -Math.PI / 2, Math.PI / 2, false);
      p.lineTo(-w / 2 + r, r);
      p.absarc(-w / 2 + r, 0, r, Math.PI / 2, Math.PI * 1.5, false);
      return p;
    }
    var shellShape = stadium(8.94, 3.26);
    shellShape.holes.push(stadium(8.34, 2.66, new THREE.Path()));
    var shellGeo = new THREE.ExtrudeGeometry(shellShape, { depth: 7.35, bevelEnabled: false, curveSegments: 14 });
    shellGeo.rotateY(-Math.PI / 2);                 // shape x → world z, extrusion → −x
    var shell = new THREE.Mesh(shellGeo, mSteel);
    shell.position.set(-25.65, TOP + 1.63, 0);
    shell.castShadow = true;
    gUsb.add(shell);
    var backCap = new THREE.Mesh(new THREE.ShapeGeometry(stadium(8.6, 2.9), 12).rotateY(-Math.PI / 2), mSteel);
    backCap.position.set(-25.7, TOP + 1.63, 0);
    gUsb.add(backCap);
    var tongue = new THREE.Mesh(rbox(5.2, 0.62, 6.6, 0.2, 0.1), mPlastic);
    tongue.position.set(-29.4, TOP + 1.32, 0);
    gUsb.add(tongue);
    [-1, 1].forEach(function (sgn) {
      var tab = new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.8, 0.3), mSteel);
      tab.position.set(-28.6, TOP + 0.5, sgn * 4.55);
      gUsb.add(tab);
    });
    // plug (slides in) and cable
    var plug = new THREE.Group();
    gUsb.add(plug);
    var plugShell = new THREE.Mesh(new THREE.ExtrudeGeometry(stadium(8.25, 2.56), { depth: 6.6, bevelEnabled: false, curveSegments: 14 }).rotateY(-Math.PI / 2), mSteel);
    plugShell.position.set(6.6, 0, 0);
    plug.add(plugShell);
    var over = new THREE.Mesh(rbox(15, 6.4, 12.4, 2.6, 1.2, 4), mRubber);
    over.geometry.translate(0, -3.2, 0);
    over.position.set(-7.5, 0, 0);
    over.castShadow = true;
    plug.add(over);
    var cableCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-15, 0, 0), new THREE.Vector3(-26, -2.2, 0.5), new THREE.Vector3(-36, -(TOP - 0.3) * 0.55, 3),
      new THREE.Vector3(-46, -(TOP - 0.3) * 0.95, 9), new THREE.Vector3(-62, -(TOP - 0.3), 17), new THREE.Vector3(-110, -(TOP - 0.3), 24)
    ]);
    var cable = new THREE.Mesh(new THREE.TubeGeometry(cableCurve, 90, 1.9, 14, false), mCable);
    cable.castShadow = true;
    plug.add(cable);
    var strain = new THREE.Mesh(lathe([[0, 0], [2.6, 0], [2.4, 3], [2.05, 6.5], [1.95, 7], [0, 7]], 18).rotateZ(Math.PI / 2), mRubber);
    strain.position.set(-15, 0, 0);
    plug.add(strain);
    plug.position.set(-33, TOP + 1.63, 0);
    var PLUG_IN_X = -33 - 0.0, PLUG_OUT_X = -33 - 13;
    var plugPulses = [];
    for (i = 0; i < 5; i++) { var ps = glowSprite(0xF2B550, 3.6, 0, true); plugPulses.push(ps); plug.add(ps); }

    /* ---------- regulator (SOT-223) ---------- */
    var gReg = new THREE.Group();
    gReg.position.set(REG.x, TOP, REG.y);
    root.add(gReg);
    var regBody = new THREE.Mesh(rbox(6.5, 1.6, 3.5, 0.3, 0.12), [mEpoxy, mRegTop, mEpoxy]);
    regBody.position.y = 0.1;
    regBody.castShadow = true;
    gReg.add(regBody);
    function gullLeg(width, len, out) {
      // bent lead seen from the side: from the body (h 0.75) down to the pad
      var s = new THREE.Shape(), t = 0.25;
      s.moveTo(0, 0.75); s.lineTo(0.45, 0.75); s.quadraticCurveTo(0.7, 0.75, 0.72, 0.5); s.lineTo(0.78, 0.22);
      s.quadraticCurveTo(0.82, 0.0, 1.05, 0.0); s.lineTo(len, 0.0); s.lineTo(len, t);
      s.lineTo(1.05, t); s.quadraticCurveTo(1.02, t, 1.0, 0.36); s.lineTo(0.95, 0.6); s.quadraticCurveTo(0.9, 1.0, 0.45, 1.0);
      s.lineTo(0, 1.0); s.lineTo(0, 0.75);
      var g = new THREE.ExtrudeGeometry(s, { depth: width, bevelEnabled: false, curveSegments: 6 });
      g.translate(0, 0, -width / 2);
      g.rotateY(out);
      return g;
    }
    [-2.3, 0, 2.3].forEach(function (dx) {
      var lg = new THREE.Mesh(gullLeg(0.7, 1.75, -Math.PI / 2), mTin);
      lg.position.set(dx, 0, 1.75);
      gReg.add(lg);
    });
    var tabL = new THREE.Mesh(gullLeg(3.0, 1.75, Math.PI / 2), mTin);
    tabL.position.set(0, 0, -1.75);
    gReg.add(tabL);

    /* ---------- USB–UART chip (QFN) ---------- */
    var qfn = new THREE.Mesh(rbox(4, 0.85, 4, 0.12, 0.06), mEpoxy);
    qfn.position.set(UART.x, TOP, UART.y);
    qfn.castShadow = true;
    root.add(qfn);
    var dot = new THREE.Mesh(new THREE.CircleGeometry(0.25, 16).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x55585F, roughness: 0.8 }));
    dot.position.set(UART.x - 1.3, TOP + 0.86, UART.y - 1.3);
    root.add(dot);

    /* ---------- buttons ---------- */
    var gBtn = new THREE.Group();
    root.add(gBtn);
    var btnCaps = [];
    BTN.forEach(function (b) {
      var base = new THREE.Mesh(rbox(4.6, 0.85, 3.6, 0.3, 0.12), mPlastic);
      base.position.set(b.x, TOP, b.y);
      base.castShadow = true;
      gBtn.add(base);
      var plate = new THREE.Mesh(rbox(4.8, 0.22, 3.8, 0.35, 0.06), mSteel);
      plate.position.set(b.x, TOP + 0.85, b.y);
      gBtn.add(plate);
      var cap = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.1, 0.6, 24), mPlastic);
      cap.position.set(b.x, TOP + 1.37, b.y);
      gBtn.add(cap);
      btnCaps.push(cap);
      [[-2.55, -1.3], [2.55, -1.3], [-2.55, 1.3], [2.55, 1.3]].forEach(function (o) {
        var f = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.2, 0.6), mTin);
        f.position.set(b.x + o[0], TOP + 0.1, b.y + o[1]);
        gBtn.add(f);
      });
    });

    /* ---------- passives (instanced) ---------- */
    var nC = 0, nR = 0;
    passives.forEach(function (p) { if (p.c) nC++; else nR++; });
    var unitBox = rbox(1, 1, 1, 0.12, 0.08);
    var capMesh = new THREE.InstancedMesh(unitBox, mCeramic, nC);
    var resMesh = new THREE.InstancedMesh(unitBox, mResBlack, nR);
    var endMesh = new THREE.InstancedMesh(unitBox, mTin, passives.length * 2);
    var q = new THREE.Quaternion(), sc = new THREE.Vector3(), pv = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
    var ic = 0, ir = 0, ie = 0;
    passives.forEach(function (p) {
      var s = SZ[p.s];
      q.setFromAxisAngle(up, p.r ? Math.PI / 2 : 0);
      sc.set(s[0] * 0.62, s[2], s[1]);
      pv.set(p.x, TOP + 0.03, p.y);
      M4.compose(pv, q, sc);
      if (p.c) capMesh.setMatrixAt(ic++, M4); else resMesh.setMatrixAt(ir++, M4);
      [-1, 1].forEach(function (sg) {
        sc.set(s[0] * 0.2, s[2] + 0.02, s[1] + 0.02);
        var off = sg * s[0] * 0.4;
        pv.set(p.x + (p.r ? 0 : off), TOP + 0.02, p.y + (p.r ? off : 0));
        M4.compose(pv, q, sc);
        endMesh.setMatrixAt(ie++, M4);
      });
    });
    capMesh.castShadow = resMesh.castShadow = true;
    root.add(capMesh); root.add(resMesh); root.add(endMesh);

    /* ---------- power LED (0603) ---------- */
    var gLed = new THREE.Group();
    gLed.position.set(LED.x, TOP, LED.y);
    root.add(gLed);
    var ledBase = new THREE.Mesh(rbox(1.6, 0.3, 0.8, 0.08, 0.05), new THREE.MeshStandardMaterial({ color: 0xE9E6DD, roughness: 0.6 }));
    gLed.add(ledBase);
    var mLedLens = new THREE.MeshStandardMaterial({ color: 0xF2C9C0, roughness: 0.25, emissive: 0xFF3A22, emissiveIntensity: 0 });
    var ledLens = new THREE.Mesh(rbox(1.2, 0.32, 0.72, 0.1, 0.08), mLedLens);
    ledLens.position.y = 0.3;
    gLed.add(ledLens);
    [-1, 1].forEach(function (sg) {
      var e = new THREE.Mesh(rbox(0.3, 0.42, 0.82, 0.05, 0.04), mTin);
      e.position.set(sg * 0.66, 0, 0);
      gLed.add(e);
    });
    var ledGlow = glowSprite(0xFF5A3A, 7, 0);
    ledGlow.position.set(0, 0.9, 0);
    gLed.add(ledGlow);
    var ledGlow2 = glowSprite(0xFF3A22, 3, 0, true);
    ledGlow2.position.set(0, 0.7, 0);
    gLed.add(ledGlow2);

    /* ---------- module: PCB, shield can, chips under the can, antenna ---------- */
    var gMod = new THREE.Group();
    root.add(gMod);
    var modW = MOD.x1 - MOD.x0, modH = MOD.y1 - MOD.y0, modCx = (MOD.x0 + MOD.x1) / 2;
    var modGeo = topUV(slab(rrShape(0, 0, modW, modH, 0.4), 0.8, { bevel: 0.06 }), modW, modH);
    var modPcb = new THREE.Mesh(modGeo, [mModuleEdge, mModule, mModuleEdge]);
    modPcb.position.set(modCx, TOP + 0.04, 0);
    modPcb.castShadow = true; modPcb.receiveShadow = true;
    gMod.add(modPcb);
    // half-holes on the module edge (castellations): small gold half-cylinders
    var castGeo = [];
    for (i = 0; i < 14; i++) {
      castGeo.push(placed(new THREE.CylinderGeometry(0.36, 0.36, 0.84, 10, 1, true, 0, Math.PI), MOD.x0 + 2.25 + i * 1.27, TOP + 0.46, -9.0, Math.PI));
      castGeo.push(placed(new THREE.CylinderGeometry(0.36, 0.36, 0.84, 10, 1, true, 0, Math.PI), MOD.x0 + 2.25 + i * 1.27, TOP + 0.46, 9.0, 0));
    }
    var cast = new THREE.Mesh(merge(castGeo), new THREE.MeshStandardMaterial({ color: COL.gold, metalness: 1, roughness: 0.3, side: THREE.DoubleSide }));
    gMod.add(cast);
    var MODTOP = TOP + 0.84;
    // chips under the can
    var esp = new THREE.Mesh(rbox(5, 0.85, 5, 0.12, 0.06), mEpoxy);
    esp.position.set(12.2, MODTOP, -1.2);
    gMod.add(esp);
    var espDot = dot.clone(); espDot.position.set(10.3, MODTOP + 0.86, -3.1); gMod.add(espDot);
    var flash = new THREE.Mesh(rbox(5.2, 0.75, 4.2, 0.1, 0.06), mEpoxy);
    flash.position.set(19.6, MODTOP, -2.6);
    gMod.add(flash);
    for (i = 0; i < 4; i++) {
      [-1, 1].forEach(function (sg) {
        var lead = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.18, 0.7), mTin);
        lead.position.set(19.6 - 1.9 + i * 1.27, MODTOP + 0.08, -2.6 + sg * 2.35);
        gMod.add(lead);
      });
    }
    var xtal = new THREE.Mesh(rbox(3.2, 0.7, 2.5, 0.2, 0.08), mSteel);
    xtal.position.set(12.2, MODTOP, 4.6);
    gMod.add(xtal);
    var xtalBase = new THREE.Mesh(rbox(3.3, 0.25, 2.6, 0.15, 0.06), new THREE.MeshStandardMaterial({ color: 0xE8E1CF, roughness: 0.6 }));
    xtalBase.position.set(12.2, MODTOP, 4.6);
    gMod.add(xtalBase);
    [[16.5, 3.5], [17.8, 3.5], [19.1, 3.5], [20.4, 3.5], [16.5, 5.6], [21.2, 1.0], [8.6, 2.8], [8.6, -5.6]].forEach(function (p, k) {
      var c = new THREE.Mesh(rbox(1.0, 0.45, 0.5, 0.08, 0.05), k % 3 === 0 ? mResBlack : mCeramic);
      c.position.set(p[0], MODTOP, p[1]);
      gMod.add(c);
    });
    // shield can (lifts in the mcu stop)
    var gCan = new THREE.Group();
    gMod.add(gCan);
    var canW = CAN.x1 - CAN.x0, canH = CAN.y1 - CAN.y0, canCx = (CAN.x0 + CAN.x1) / 2;
    var canGeo = topUV(slab(rrShape(0, 0, canW, canH, 0.7), 2.4, { bevel: 0.32, bevelSegments: 3 }), canW, canH);
    var canMesh = new THREE.Mesh(canGeo, [mSteel, mCanTop, mSteel]);
    canMesh.castShadow = true; canMesh.receiveShadow = true;
    gCan.add(canMesh);
    gCan.position.set(canCx, MODTOP, 0);

    /* ---------- antenna waves ---------- */
    var waveMat = new THREE.MeshBasicMaterial({ color: dark ? 0x8EA6F2 : 0x2343B0, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide });
    var waves = [];
    for (i = 0; i < 4; i++) {
      var wv = new THREE.Mesh(new THREE.TorusGeometry(1, 0.0075, 6, 120), waveMat.clone());
      wv.rotation.x = Math.PI / 2;
      wv.position.set(28.6, MODTOP + 0.5, 0);
      waves.push(wv);
      root.add(wv);
    }

    /* ---------- power path pulses on the board ---------- */
    var pathIn = pathOf([[-33, 0, 0], [-27.6, 0, -1.4], [-22.4, 0, -1.4], [-20.2, 0, -3.6], [-14.2, 0, -3.6], [-14.2, 0, -4.3]]);
    var pathOut = pathOf([[-16.5, 0, -8.6], [-16.5, 0, -10.2], [5.2, 0, -10.2], [7.6, 0, -7.8]]);
    var pathLed = pathOf([[-22.4, 0, -1.4], [-12.0, 0, 0.0], [-9.0, 0, 3.0], [-7.6, 0, 5.2], [-7.6, 0, 8.4]]);
    var NP = 6;
    var pulsesIn = [], pulsesOut = [], pulsesLed = [];
    for (i = 0; i < NP; i++) {
      var a1 = glowSprite(0xF2B550, 3.2, 0, true); pulsesIn.push(a1); root.add(a1);
      var a2 = glowSprite(0xF2B550, 2.4, 0, true); pulsesOut.push(a2); root.add(a2);
    }
    for (i = 0; i < 3; i++) { var a3 = glowSprite(0xF2B550, 2.6, 0, true); pulsesLed.push(a3); root.add(a3); }
    var tmpA = [0, 0, 0];

    /* ---------- data path pulses (D+/D− → bridge → TX/RX → module), blue = signal ---------- */
    var pathDp = pathOf([[-27.6, 0, 0.5], [-21.0, 0, 0.5], [-18.5, 0, 3.0]]);
    var pathDm = pathOf([[-27.6, 0, 1.2], [-21.4, 0, 1.2], [-18.5, 0, 4.1]]);
    var pathTx = pathOf([[-14.5, 0, 4.2], [-6.0, 0, 4.2], [-4.0, 0, 2.2], [5.4, 0, 2.2], [6.5, 0, 1.1]]);
    var pathRx = pathOf([[6.5, 0, 2.5], [5.4, 0, 3.6], [-3.6, 0, 3.6], [-5.6, 0, 5.6], [-14.5, 0, 5.6]]);
    var dataPaths = [pathDp, pathDm, pathTx, pathRx], dataPulses = [];
    dataPaths.forEach(function (pp) {
      var arr = [];
      for (i = 0; i < 4; i++) { var dp = glowSprite(0x3556D8, 3.2, 0, true); arr.push(dp); root.add(dp); }
      dataPulses.push(arr);
    });

    /* ---------- highlight rings (copper) and the ground plane tint ---------- */
    var mRing = new THREE.MeshBasicMaterial({ color: 0xFF9A55, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide });
    var ringGeo = new THREE.RingGeometry(0.66, 1.0, 40).rotateX(-Math.PI / 2);
    var ringPool = [];
    for (i = 0; i < 10; i++) { var rg = new THREE.Mesh(ringGeo, mRing); rg.visible = false; root.add(rg); ringPool.push(rg); }
    var RINGS = {
      caps: [[-21.6, -6.2, 1.3], [-11.4, -6.2, 1.3], [-20.6, 5.0, 1.15], [-12.6, 5.0, 1.15], [-24.0, -3.6, 1.15], [-24.0, 3.2, 1.15]],
      gnd: [[PINX[1], -12.7, 1.45], [PINX[1], 12.7, 1.45], [PINX[18], 12.7, 1.45], [REG.x - 2.3, REG.y + 3.15, 1.3], [UART.x, UART.y, 2.9], [LED.x + 0.85, LED.y, 1.0], [MOD.x0 + 2.25 + 4 * 1.27, 9.3, 1.1]]
    };
    var gndPlane = new THREE.Mesh(new THREE.PlaneGeometry(BW - 1.4, BH - 1.4).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({ color: 0xC8693A, transparent: true, opacity: 0, depthWrite: false }));
    gndPlane.position.set(0, TOP + 0.06, 0);
    gndPlane.visible = false;
    root.add(gndPlane);
    // one connected net: nodes joined by a dashed overlay
    var GNDNODES = [[-29.5, TOP + 3.4, 0], [PINX[1], TOP + 0.3, -12.7], [REG.x - 2.3, TOP + 0.5, REG.y + 3.15], [UART.x, TOP + 0.9, UART.y],
      [PINX[1], TOP + 0.3, 12.7], [LED.x + 0.85, TOP + 0.4, LED.y], [MOD.x0 + 2.25 + 4 * 1.27, TOP + 0.5, 9.3], [PINX[18], TOP + 0.3, 12.7]];
    var gndPts = GNDNODES.map(function (p) { return new THREE.Vector3(p[0], p[1], p[2]); });

    /* ---------- parts: bounds, views, labels ---------- */
    function bounds(x0, y0, z0, x1, y1, z1) { return [new THREE.Vector3(x0, y0, z0), new THREE.Vector3(x1, y1, z1)]; }
    var PART = {
      usb: { b: bounds(-41, TOP - 4.5, -6.6, -25.2, TOP + 4.6, 6.6), view: { yaw: -0.42, pitch: 0.5, distance: 160, target: [-27, TOP, 1] },
        name: 'USB-C girişi', anchor: [-28.5, TOP + 3.3, -2.0], dx: 34, dy: -74 },
      regulator: { b: bounds(REG.x - 3.7, TOP, REG.y - 3.6, REG.x + 3.7, TOP + 1.8, REG.y + 3.6), view: { yaw: 0.32, pitch: 0.92, distance: 120, target: [REG.x + 1.5, TOP, REG.y + 1.5] },
        name: 'Gerilim regülatörü', anchor: [REG.x - 2.6, TOP + 1.7, REG.y - 1.0], dx: -70, dy: -66 },
      mcu: { b: bounds(MOD.x0 - 0.5, TOP, MOD.y0 - 0.6, CAN.x1 + 0.5, TOP + 4.4, MOD.y1 + 0.6), view: { yaw: 0.3, pitch: 0.86, distance: 118, target: [17, TOP + 3, -1] },
        name: 'Mikrodenetleyici modülü', anchor: [CAN.x0 + 1.5, MODTOP + 2.6, 2.0], dx: 40, dy: -120 },
      antenna: { b: bounds(24.3, TOP, MOD.y0 - 0.6, MOD.x1 + 0.5, TOP + 1.6, MOD.y1 + 0.6), view: { yaw: 0.26, pitch: 0.9, distance: 145, target: [25, TOP, 1] },
        name: 'PCB anten', anchor: [30.6, MODTOP, -7.6], dx: 20, dy: -60 },
      pins: { b: bounds(-25.6, PINBOT - 0.5, 11.3, 25.6, TOP + 1.6, 14.1), view: { yaw: 0.16, pitch: 0.42, distance: 150, target: [-6, Y0 - 3, 11] },
        name: 'Pinler', anchor: [PINX[2], TOP + 1.4, 12.7], dx: -20, dy: -80 },
      led: { b: bounds(LED.x - 1.3, TOP, LED.y - 1.0, LED.x + 4.6, TOP + 0.9, LED.y + 1.0), view: { yaw: 0.42, pitch: 0.86, distance: 92, target: [LED.x + 1.2, TOP, LED.y] },
        name: "Güç LED'i", anchor: [LED.x, TOP + 0.6, LED.y], dx: 90, dy: -80 },
      usbchip: { b: bounds(UART.x - 2.9, TOP, UART.y - 2.9, UART.x + 2.9, TOP + 1.2, UART.y + 2.9), view: { yaw: 0.3, pitch: 0.9, distance: 105, target: [-15, TOP, 3.5] },
        name: 'USB-seri çevirici çip', anchor: [UART.x, TOP + 1.0, UART.y], dx: 10, dy: -88 },
      crystal: { b: bounds(10.0, TOP, 3.0, 14.4, TOP + 2.2, 6.2), view: { yaw: 0.3, pitch: 0.88, distance: 100, target: [14, TOP + 3, 0] },
        name: 'Kristal osilatör', anchor: [12.2, MODTOP + 0.8, 4.6], dx: -30, dy: 80 },
      buttons: { b: bounds(-29.2, TOP, -10.4, -23.6, TOP + 2.2, 10.4), view: { yaw: 0.12, pitch: 1.2, distance: 100, target: [-23, TOP, 0] },
        name: 'EN ve BOOT düğmeleri', anchor: [-22.6, TOP + 0.3, 0], dx: 70, dy: 0 },
      gnd: { b: bounds(-32, TOP - 0.2, -14, 32, TOP + 1.2, 14), view: { yaw: 0.3, pitch: 0.95, distance: 152, target: [-1, TOP, 1] },
        name: 'GND pinleri ve toprak katmanı', anchor: [-3, TOP + 0.3, -9.5], dx: 0, dy: -80 },
      caps: { b: bounds(-26.2, TOP, -8.0, -10.4, TOP + 1.2, 9.2), view: { yaw: 0.3, pitch: 0.95, distance: 108, target: [-18, TOP, 0.5] },
        name: 'Kondansatör ve dirençler', anchor: [-16.5, TOP + 0.6, 0.6], dx: 62, dy: -22 }
    };
    // leader lines are drawn by this visual after the spotlight veil (so the veil never covers them)
    var leaders = [];
    function lab(text, o) {
      var wantLine = !!o.line;
      o.line = false;
      var L = v.label(text, o);
      L.show(false);
      if (wantLine) leaders.push({ L: L, at: new THREE.Vector3().fromArray(o.at) });
      return L;
    }
    ORDER.forEach(function (k) {
      var P = PART[k];
      P.label = lab(P.name, { cls: 'name chip', at: P.anchor, align: 'center', valign: 'bottom', line: true, dx: P.dx, dy: P.dy });
    });
    var tag5 = lab('5 V', { cls: 'value chip', at: [-40, TOP + 2, 0], dy: -20 });
    var tagIn = lab('giriş 5 V', { cls: 'value chip', at: [REG.x + 2.3, TOP + 0.4, REG.y + 3.2], dx: 62, dy: 44, line: true });
    var tagOut = lab('çıkış 3,3 V', { cls: 'value chip', at: [REG.x + 0.8, TOP + 0.5, REG.y - 3.0], dx: 74, dy: -34, line: true });
    var tagEsp = lab('çip: 2 çekirdek 240 MHz + 520 KB RAM', { cls: 'note chip', at: [12.2, MODTOP + 0.9, -1.2], dx: 40, dy: 105, align: 'left', line: true });
    var tagFlash = lab('flaş 4 MB: program burada durur', { cls: 'note chip', at: [19.6, MODTOP + 0.8, -2.6], dx: 40, dy: -58, align: 'left', line: true });
    var tagRadio = lab('Wi-Fi + Bluetooth radyosu', { cls: 'note chip', at: [10.6, MODTOP + 0.9, 0.8], dx: -60, dy: 70, align: 'center', line: true });
    var tagDp = lab('D+ / D−: USB verisi', { cls: 'note chip', at: [-24.0, TOP + 0.3, 0.85], dx: -50, dy: -62, align: 'center', line: true });
    var tagTx = lab('TX / RX: işlemciye seri hat', { cls: 'note chip', at: [-3.0, TOP + 0.3, 3.0], dx: 20, dy: -66, align: 'center', line: true });
    var tagXt = lab('40 MHz: saniyede 40 milyon tık', { cls: 'value chip', at: [12.2, MODTOP + 0.8, 4.6], dx: 70, dy: -50, align: 'left', line: true });
    var tagEn = lab('EN: kartı sıfırlar', { cls: 'note chip', at: [BTN[0].x, TOP + 1.9, BTN[0].y], dx: 60, dy: -14, align: 'left', line: true });
    var tagBoot = lab('BOOT: program yükleme kipi', { cls: 'note chip', at: [BTN[1].x, TOP + 1.9, BTN[1].y], dx: 60, dy: 14, align: 'left', line: true });
    var tagGnd = lab('hepsi aynı sıfır noktası', { cls: 'value chip', at: [-3, TOP + 0.3, 0], dx: 0, dy: -30 });
    var tagPlane = lab('altta: tüm kartı kaplayan toprak katmanı', { cls: 'note chip', at: [14, TOP + 0.1, -10], dx: 0, dy: -36 });
    var tagPG = lab('GND: 0 V', { cls: 'value chip', at: [PINX[1], PINBOT - 0.5, 12.7], dx: -6, dy: 44, line: true });
    var tagP3 = lab('3V3: 3,3 V çıkış', { cls: 'value chip', at: [PINX[19], PINBOT - 0.5, 12.7], dx: -10, dy: 44, line: true });
    var tagPIO = lab('GPIO: 0 ya da 3,3 V', { cls: 'value chip', at: [PINX[10], PINBOT - 0.5, 12.7], dx: 0, dy: 76, line: true });
    var tagCap = lab('kondansatör: gerilimi düzler', { cls: 'note chip', at: [-21.6, TOP + 0.9, -6.2], dx: -10, dy: -46, align: 'center', line: true });
    var tagCap2 = lab('çipin yanında: gürültüyü süzer', { cls: 'note chip', at: [-12.6, TOP + 0.9, 5.0], dx: 70, dy: 50, align: 'left', line: true });
    var tagCc = lab('CC direnci: 5,1 kΩ', { cls: 'value chip', at: [-24.0, TOP + 0.9, 3.2], dx: -10, dy: 70, align: 'center', line: true });
    var tagRf = lab('2,4 GHz radyo dalgası (gözle görülmez)', { cls: 'note chip', at: [28.4, MODTOP + 0.4, 0], dx: 0, dy: 96 });
    var tagPitch = lab('2,54 mm', { cls: 'value chip', at: [PINX[13] + 1.27, PINBOT - 2.2, 12.7], dy: 16 });
    var tagWire = lab("kablo: sensöre, LED'e ya da motor sürücüsüne gider", { cls: 'note chip', at: [PINX[6], PINBOT - 7, 16], dx: -40, dy: 54, align: 'center', line: true });

    /* ---------- state ---------- */
    var auto = true, cur = -1, chosen = 'usb', stopT = 0;
    var rect = { x0: 0, y0: 0, x1: v.w, y1: v.h, a: 0 };
    var canLift = 0, plugX = PLUG_IN_X, ledOn = 1, jumperK = 0;
    var corner = new THREE.Vector3();
    var dimA = new THREE.Vector3(PINX[13], PINBOT - 1.2, 12.7), dimB = new THREE.Vector3(PINX[14], PINBOT - 1.2, 12.7);

    function goTo(name, instant) {
      var P = PART[name];
      if (instant) v.setView(P.view); else v.animateTo(P.view, 1.5);
    }

    function reset() {
      auto = true; cur = -1; chosen = 'usb'; stopT = 0;
      canLift = 0; plugX = PLUG_IN_X; ledOn = 1;
      rect.a = 0;
      v.setView(HOME);
      ORDER.forEach(function (k) { PART[k].label.show(false); });
    }

    function projRect(P) {
      var x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9, b = P.b;
      for (var c = 0; c < 8; c++) {
        corner.set(c & 1 ? b[1].x : b[0].x, c & 2 ? b[1].y : b[0].y, c & 4 ? b[1].z : b[0].z);

        var s = v.project(corner);
        x0 = Math.min(x0, s.x); y0 = Math.min(y0, s.y); x1 = Math.max(x1, s.x); y1 = Math.max(y1, s.y);
      }
      return [x0 - 12, y0 - 12, x1 + 12, y1 + 12];
    }

    reset();
    return {
      reset: reset,
      set: function (key, val) {
        if (key === 'part' && PART[val]) {
          auto = false;
          if (chosen !== val || cur < 0) { chosen = val; cur = ORDER.indexOf(val); stopT = 0; goTo(val); }
        }
      },
      read: function (key) { return key === 'part' ? TEXT[chosen] : ''; },
      frame: function (t, dt) {
        var rm = K.reducedMotion;
        if (auto) {
          var idx = t < 0.9 ? -1 : Math.floor((t - 0.9) / 5) % ORDER.length;
          if (idx !== cur) {
            cur = idx;
            if (idx >= 0) { chosen = ORDER[idx]; stopT = 0; goTo(chosen, rm); }
          }
        }
        if (cur >= 0) stopT += dt;
        var active = cur >= 0 ? chosen : null;
        var st = stopT;

        // plug: pulled out and pushed in at the start of the USB stop
        var plugTarget = PLUG_IN_X;
        if (active === 'usb' && !rm) {
          var outK = span(st, 0.0, 0.5) * (1 - span(st, 1.3, 2.3));
          plugTarget = lerp(PLUG_IN_X, PLUG_OUT_X, EZ.inOut(outK));
          plugX = plugTarget;
        } else plugX += (plugTarget - plugX) * Math.min(1, dt * 6);
        plug.position.x = plugX;
        var connected = plugX > PLUG_IN_X - 0.6;
        // LED follows power (with a short delay after plugging in)
        var ledTarget = connected ? 1 : 0;
        ledOn += (ledTarget - ledOn) * Math.min(1, dt * (ledTarget ? 5 : 12));
        mLedLens.emissiveIntensity = 2.2 * ledOn;
        ledGlow.material.opacity = 0.75 * ledOn;
        ledGlow2.material.opacity = 0.55 * ledOn;

        // can lift in the MCU stop
        var canPart = active === 'mcu' || active === 'crystal';
        var liftT = canPart ? EZ.inOut(span(st, 1.4, 2.6)) : 0;
        canLift += (liftT - canLift) * Math.min(1, dt * (canPart ? 20 : 4));
        gCan.position.y = MODTOP + canLift * 9;
        gCan.position.z = -canLift * 12.5;
        gCan.rotation.x = -canLift * 0.32;

        // jumper wire slides onto a pin in the pins stop
        var jT = active === 'pins' ? EZ.inOut(span(st, 1.6, 2.7)) : 0;
        jumperK = active === 'pins' ? jT : Math.max(0, jumperK - dt * 1.5);
        housing.visible = jWire.visible = jumperK > 0.001;
        if (housing.visible) placeJumper(jumperK);

        // pulses: cable → board → regulator → module (usb / regulator / led stops)
        var showIn = active === 'usb' || active === 'regulator' || active === 'led';
        var flowK = showIn && connected ? Math.min(1, (st - (active === 'usb' ? 2.3 : 0.4)) * 2) : 0;
        flowK = clamp(flowK, 0, 1) * (rm ? 0.6 : 1);
        for (i = 0; i < plugPulses.length; i++) {
          var cu = ((t * 0.5 + i / plugPulses.length) % 1);
          cableCurve.getPointAt(1 - cu, pv);
          plugPulses[i].position.copy(pv);
          plugPulses[i].material.opacity = flowK * (active === 'usb' ? 0.9 : 0.6) * Math.sin(Math.PI * cu);
        }
        for (i = 0; i < NP; i++) {
          var u = (t * 0.45 + i / NP) % 1;
          pathIn.at(u * pathIn.len, tmpA);
          pulsesIn[i].position.set(tmpA[0], TOP + 0.35, tmpA[2]);
          pulsesIn[i].material.opacity = flowK * 0.9 * Math.min(1, Math.sin(Math.PI * u) * 3);
          var outOn = active === 'regulator' ? flowK : 0;
          pathOut.at(u * pathOut.len, tmpA);
          pulsesOut[i].position.set(tmpA[0], TOP + 0.3, tmpA[2]);
          pulsesOut[i].material.opacity = outOn * 0.75 * Math.min(1, Math.sin(Math.PI * u) * 3);
        }
        for (i = 0; i < pulsesLed.length; i++) {
          var ul = (t * 0.4 + i / pulsesLed.length) % 1;
          pathLed.at(ul * pathLed.len, tmpA);
          pulsesLed[i].position.set(tmpA[0], TOP + 0.3, tmpA[2]);
          pulsesLed[i].material.opacity = (active === 'led' ? flowK : 0) * 0.8 * Math.min(1, Math.sin(Math.PI * ul) * 3);
        }

        // data path (usbchip stop): blue pulses D+/D− → bridge → TX → module, RX back
        var dataOn = active === 'usbchip' ? clamp((st - 0.5) * 1.5, 0, 1) * (rm ? 0.6 : 1) : 0;
        for (j = 0; j < dataPaths.length; j++) {
          for (i = 0; i < 4; i++) {
            var ud = (t * (j < 2 ? 0.5 : 0.4) + i / 4 + j * 0.13) % 1;
            dataPaths[j].at(ud * dataPaths[j].len, tmpA);
            dataPulses[j][i].position.set(tmpA[0], TOP + 0.32, tmpA[2]);
            dataPulses[j][i].material.opacity = dataOn * 0.9 * Math.min(1, Math.sin(Math.PI * ud) * 3);
          }
        }

        // highlight rings (caps, gnd) and the ground-plane tint
        var ringList = active === 'caps' ? RINGS.caps : active === 'gnd' ? RINGS.gnd : null;
        var ringK = ringList ? clamp((st - 0.7) * 2, 0, 1) : 0;
        mRing.opacity = ringK * 0.95;
        for (i = 0; i < ringPool.length; i++) {
          var rl = ringList && ringList[i];
          ringPool[i].visible = !!rl && ringK > 0.01;
          if (rl) { ringPool[i].position.set(rl[0], TOP + 0.12, rl[1]); ringPool[i].scale.set(rl[2], 1, rl[2]); }
        }
        var gndK = active === 'gnd' ? clamp((st - 0.9) * 1.6, 0, 1) : 0;
        gndPlane.visible = gndK > 0.01;
        gndPlane.material.opacity = 0.2 * gndK;

        // buttons: EN and BOOT are pressed in turn
        var bp0 = 0, bp1 = 0;
        if (active === 'buttons' && !rm) {
          var bph = st % 4;
          bp0 = Math.sin(Math.PI * clamp((bph - 1.2) / 0.5, 0, 1));
          bp1 = Math.sin(Math.PI * clamp((bph - 2.6) / 0.5, 0, 1));
        }
        btnCaps[0].position.y = TOP + 1.37 - 0.42 * bp0;
        btnCaps[1].position.y = TOP + 1.37 - 0.42 * bp1;

        // antenna waves
        var waveOn = active === 'antenna' ? clamp((st - 1.2) * 2, 0, 1) : 0;
        for (i = 0; i < waves.length; i++) {
          var ph = rm ? (i + 1) / 5 : ((t * 0.38 + i / waves.length) % 1);
          var R = 5 + ph * 26;
          waves[i].scale.set(R, R, R * 0.6);
          waves[i].material.opacity = waveOn * 0.55 * Math.min(1, ph * 5) * (1 - ph);
        }
        mModule.emissiveIntensity = waveOn * (0.55 + 0.25 * Math.sin(t * 5));

        // labels
        ORDER.forEach(function (k) { PART[k].label.show(active === k && st > 1.0); });
        tag5.show(active === 'usb' && flowK > 0.5);
        tagIn.show(active === 'regulator' && st > 1.3);
        tagOut.show(active === 'regulator' && st > 1.8);
        tagEsp.show(active === 'mcu' && canLift > 0.85);
        tagFlash.show(active === 'mcu' && canLift > 0.85);
        tagRadio.show(active === 'mcu' && canLift > 0.85);
        tagDp.show(active === 'usbchip' && st > 1.2);
        tagTx.show(active === 'usbchip' && st > 1.6);
        tagXt.show(active === 'crystal' && canLift > 0.85);
        tagEn.show(active === 'buttons' && st > 1.2);
        tagBoot.show(active === 'buttons' && st > 1.6);
        tagGnd.show(active === 'gnd' && gndK > 0.8);
        tagPlane.show(active === 'gnd' && gndK > 0.8);
        tagPG.show(active === 'pins' && st > 1.4);
        tagP3.show(active === 'pins' && st > 1.4);
        tagPIO.show(active === 'pins' && st > 1.8);
        tagCap.show(active === 'caps' && st > 1.2);
        tagCap2.show(active === 'caps' && st > 1.6);
        tagCc.show(active === 'caps' && st > 2.0);
        tagRf.show(active === 'antenna' && waveOn > 0.5);
        tagPitch.show(active === 'pins' && st > 1.4);
        tagWire.show(active === 'pins' && jumperK > 0.95);

        v.render(dt);

        // spotlight: veil over everything except the active part, with copper corner marks
        v.camera.updateMatrixWorld();
        var target = active ? projRect(PART[active]) : null;
        var aT = active && st > 0.9 ? 1 : 0;
        if (target) {
          var kk = rect.a < 0.05 ? 1 : Math.min(1, dt * 7);
          rect.x0 += (target[0] - rect.x0) * kk; rect.y0 += (target[1] - rect.y0) * kk;
          rect.x1 += (target[2] - rect.x1) * kk; rect.y1 += (target[3] - rect.y1) * kk;
        }
        rect.a += (aT - rect.a) * Math.min(1, dt * 5);
        if (!K.skipRender) {
          if (rect.a > 0.01) {
            var c = v.ctx, W = v.w, H = v.h;
            var rx = Math.max(-20, rect.x0), ry = Math.max(-20, rect.y0), rw = Math.min(W + 20, rect.x1) - rx, rh = Math.min(H + 20, rect.y1) - ry;
            c.save();
            c.globalAlpha = 0.18 * rect.a;
            c.fillStyle = dark ? '#0E121A' : '#F5F5F1';
            c.beginPath();
            c.rect(0, 0, W, H);
            rrSub(c, rx, ry, rw, rh, 12);
            c.fill('evenodd');
            c.globalAlpha = rect.a;
            c.strokeStyle = dark ? '#E39A6C' : '#A64B22';
            c.lineWidth = 1.6;
            c.lineCap = 'round';
            var L = Math.min(18, rw / 4, rh / 4);
            c.beginPath();
            c.moveTo(rx, ry + L); c.lineTo(rx, ry); c.lineTo(rx + L, ry);
            c.moveTo(rx + rw - L, ry); c.lineTo(rx + rw, ry); c.lineTo(rx + rw, ry + L);
            c.moveTo(rx + rw, ry + rh - L); c.lineTo(rx + rw, ry + rh); c.lineTo(rx + rw - L, ry + rh);
            c.moveTo(rx + L, ry + rh); c.lineTo(rx, ry + rh); c.lineTo(rx, ry + rh - L);
            c.stroke();
            c.restore();
          }
          var cx2 = v.ctx;
          cx2.save();
          cx2.strokeStyle = cx2.fillStyle = dark ? 'rgba(154,163,178,.85)' : 'rgba(89,94,105,.85)';
          cx2.lineWidth = 1;
          for (var li = 0; li < leaders.length; li++) {
            var ld = leaders[li];
            if (!ld.L.visible) continue;
            var PP = v.project(ld.at);
            if (!PP.visible) continue;
            cx2.beginPath(); cx2.moveTo(PP.x, PP.y); cx2.lineTo(PP.x + ld.L.dx, PP.y + ld.L.dy); cx2.stroke();
            cx2.beginPath(); cx2.arc(PP.x, PP.y, 2, 0, Math.PI * 2); cx2.fill();
          }
          // mcu: dashed windows around the chips inside the module
          if (active === 'mcu' && canLift > 0.85) {
            cx2.save();
            cx2.strokeStyle = dark ? '#E39A6C' : '#C8693A'; cx2.lineWidth = 1.6; cx2.setLineDash([5, 4]);
            [[9.5, -3.9, 14.9, 1.5], [16.8, -4.9, 22.4, -0.3]].forEach(function (w) {
              var bx0 = 1e9, by0 = 1e9, bx1 = -1e9, by1 = -1e9;
              for (var cc = 0; cc < 4; cc++) {
                var q2 = v.project([cc & 1 ? w[2] : w[0], MODTOP + 0.9, cc & 2 ? w[3] : w[1]]);
                bx0 = Math.min(bx0, q2.x); by0 = Math.min(by0, q2.y); bx1 = Math.max(bx1, q2.x); by1 = Math.max(by1, q2.y);
              }
              cx2.strokeRect(bx0 - 3, by0 - 3, bx1 - bx0 + 6, by1 - by0 + 6);
            });
            cx2.restore();
          }
          // crystal: a small 40 MHz wave next to the label
          if (active === 'crystal' && canLift > 0.85) {
            var xp = v.project([12.2, MODTOP + 0.8, 4.6]);
            var wx = xp.x + 70, wy = xp.y - 100, ww = 120, wh = 14;
            cx2.save();
            cx2.strokeStyle = dark ? '#8EA6F2' : '#2343B0'; cx2.lineWidth = 2; cx2.lineJoin = 'round';
            cx2.beginPath();
            for (var wi = 0; wi <= 60; wi++) {
              var wxx = wx + wi / 60 * ww, wyy = wy - Math.sin(wi / 60 * Math.PI * 8 - (rm ? 0 : t * 12)) * wh;
              if (wi) cx2.lineTo(wxx, wyy); else cx2.moveTo(wxx, wyy);
            }
            cx2.stroke();
            cx2.restore();
          }
          // gnd: dashed overlay joining every GND point into one net
          if (active === 'gnd' && gndK > 0.01) {
            var gp = gndPts.map(function (p) { return v.project(p); });
            cx2.save();
            cx2.globalAlpha = gndK;
            cx2.strokeStyle = '#F0B27F'; cx2.lineWidth = 2.2; cx2.lineJoin = 'round';
            cx2.setLineDash([9, 6]); cx2.lineDashOffset = rm ? 0 : -t * 22;
            cx2.beginPath();
            for (var gi = 0; gi < gp.length; gi++) { if (gi) cx2.lineTo(gp[gi].x, gp[gi].y); else cx2.moveTo(gp[gi].x, gp[gi].y); }
            cx2.lineWidth = 5; cx2.strokeStyle = 'rgba(21,23,28,.75)'; cx2.stroke();
            cx2.lineWidth = 2.6; cx2.strokeStyle = '#F0B27F'; cx2.stroke();
            cx2.setLineDash([]);
            for (gi = 0; gi < gp.length; gi++) {
              cx2.beginPath(); cx2.arc(gp[gi].x, gp[gi].y, 4.2, 0, Math.PI * 2);
              cx2.fillStyle = '#F0B27F'; cx2.fill();
              cx2.lineWidth = 1.4; cx2.strokeStyle = '#15171C'; cx2.stroke();
            }
            cx2.restore();
          }
          // pin pitch: a small dimension line between two pin tips
          if (active === 'pins' && st > 1.4) {
            var dA = v.project(dimA), dB = v.project(dimB);
            var ang = Math.atan2(dB.y - dA.y, dB.x - dA.x), nxp = -Math.sin(ang) * 5, nyp = Math.cos(ang) * 5;
            cx2.globalAlpha = Math.min(1, (st - 1.4) * 3);
            cx2.strokeStyle = dark ? '#EEF0F3' : '#15171C';
            cx2.beginPath();
            cx2.moveTo(dA.x, dA.y); cx2.lineTo(dB.x, dB.y);
            cx2.moveTo(dA.x - nxp, dA.y - nyp); cx2.lineTo(dA.x + nxp, dA.y + nyp);
            cx2.moveTo(dB.x - nxp, dB.y - nyp); cx2.lineTo(dB.x + nxp, dB.y + nyp);
            cx2.stroke();
          }
          cx2.restore();
        }
      }
    };
  });

  /* =====================================================================
   * ultrasonic · S 680×520 · light
   * HC-SR04-style module on a holder, a box on the table, a ruler.
   * Time of flight: d = 343 × t ÷ 2.
   * ===================================================================== */
  K.register('ultrasonic', function (el, opts) {
    var THREE = TH();
    opts = opts || {};
    var dark = opts.theme === 'dark';
    var C_SOUND = 343;
    var v = K.stage3d(el, {
      theme: opts.theme, fov: 26, near: 4, far: 12000, yaw: -0.42, pitch: 0.24, distance: 880,
      target: [260, 60, 0], size: 700, ground: 0, minDistance: 150, maxDistance: 6000, minPitch: 0.05, maxPitch: 1.0
    });
    function fmtTime(d) { return K.num(2 * d / 100 / C_SOUND * 1000, 2); }
    function timeSec(d) { var ms = 2 * d / 100 / C_SOUND * 1000; return Math.round(ms * 100) / 100 / 1000; }
    function fmtSec(d) { return K.num(timeSec(d), 5); }
    function result(d) { return C_SOUND * timeSec(d) / 2; }
    var D_DEF = 50;
    if (!v.ready) {
      return {
        reset: function () {}, frame: function (t, dt) { v.render(dt); },
        read: function (k) { return k === 'distance' ? '50 cm' : k === 'time' ? 'Yankı süresi: 2,92 ms' : 'd = 343 m/s × 0,00292 s ÷ 2 ≈ 0,50 m'; }
      };
    }
    tuneLights(v, { key: 0.85, fill: 0.9, rim: 0.9, hemi: 0.85, shadowBias: 0.6, shadow: 0.12, exposure: 0.95 });
    var KEYOFF = v.lights ? v.lights.key.position.clone() : new THREE.Vector3(560, 1190, 840);

    var i;
    /* ---------- module geometry (transducer fronts at x = 0) ---------- */
    var HC = 76;                       // height of the module centre
    var PCB_T = 1.6, CAN_L = 12.2, CAN_R = 8.1, CAN_DY = 13;
    var PCB_X = -CAN_L - PCB_T;        // back face of the PCB
    var Ty = HC + CAN_DY, Ry = HC - CAN_DY;
    var gMod = new THREE.Group();
    v.scene.add(gMod);
    // PCB texture: blue mask, silkscreen "T", "R", pin names (the module is mounted with its long side vertical)
    var texHC = boardTex(20, 45, 26, function (ctx) {
      // board coordinates here: x across (20 mm), y along (45 mm, top = T end)
      ctx.fillStyle = '#1F5DB0';
      rrPath(ctx, 0, 0, 20, 45, 0.6); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.10)'; ctx.lineWidth = 0.35; ctx.lineCap = 'round';
      poly(ctx, [[-6, -6], [-6, 6]]); ctx.stroke();
      poly(ctx, [[5.5, -4], [7.5, -2], [7.5, 8]]); ctx.stroke();
      ctx.fillStyle = '#EEF0F2';
      ctx.font = font(2.6, 600);
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('T', -7.4, -19.6);
      ctx.fillText('R', -7.4, 19.4);
      ctx.font = font(1.15, 600);
      ctx.save();
      ctx.translate(7.0, 0); ctx.rotate(Math.PI / 2);
      ['VCC', 'Trig', 'Echo', 'Gnd'].forEach(function (s, k) { ctx.fillText(s, -3.81 + k * 2.54, 0); });
      ctx.restore();
      ctx.fillStyle = '#C9A24C';
      [[-8.6, -20.6], [8.6, -20.6], [-8.6, 20.6], [8.6, 20.6]].forEach(function (p) { disc(ctx, p[0], p[1], 0.9); ctx.fill(); });
      ctx.fillStyle = '#0B1220';
      [[-8.6, -20.6], [8.6, -20.6], [-8.6, 20.6], [8.6, 20.6]].forEach(function (p) { disc(ctx, p[0], p[1], 0.5); ctx.fill(); });
    });
    var texMesh = canvasTex(256, 256, function (ctx) {
      ctx.fillStyle = '#2A2D33';
      ctx.fillRect(0, 0, 256, 256);
      ctx.strokeStyle = '#B8BCC4';
      ctx.lineWidth = 2.1;
      for (var k = 0; k < 256; k += 6) {
        ctx.beginPath(); ctx.moveTo(k, 0); ctx.lineTo(k, 256); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, k); ctx.lineTo(256, k); ctx.stroke();
      }
      var g = ctx.createRadialGradient(128, 128, 60, 128, 128, 128);
      g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.35)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, 256, 256);
    });
    afterFonts([texHC]);
    // the module board stands in the YZ plane facing +x
    var hcShape = rrShape(0, 0, 20, 45, 0.8);
    var hcGeo = topUV(slab(hcShape, PCB_T, { bevel: 0.1 }), 20, 45);
    var mHCtop = new THREE.MeshStandardMaterial({ map: texHC, roughness: 0.45, envMapIntensity: 0.5 });
    var mHCedge = new THREE.MeshStandardMaterial({ color: 0x1A4A8C, roughness: 0.6 });
    var hcMesh = new THREE.Mesh(hcGeo, [mHCedge, mHCtop, mHCedge]);
    // the slab lies flat; stand it up facing +x: thickness (local y) → world x,
    // board 'along' (local z, T end negative) → world y (T up), board 'across' (local x) → world −z
    hcMesh.quaternion.setFromRotationMatrix(new THREE.Matrix4().set(
      0, 1, 0, 0,
      0, 0, -1, 0,
      -1, 0, 0, 0,
      0, 0, 0, 1));
    var hcHolder = new THREE.Group();
    hcHolder.add(hcMesh);
    hcHolder.position.set(PCB_X, HC, 0);
    gMod.add(hcHolder);
    hcMesh.castShadow = true; hcMesh.receiveShadow = true;

    var mAlu = K.mat.aluminium({ roughness: 0.38 });
    var mMesh = new THREE.MeshStandardMaterial({ map: texMesh, roughness: 0.55, metalness: 0.6 });
    function transducer(y) {
      var g = new THREE.Group();
      // can body with a rolled front lip (lathe around +x)
      var prof = [[0, 0], [CAN_R - 0.2, 0], [CAN_R, 0.3], [CAN_R, CAN_L - 0.9], [CAN_R - 0.25, CAN_L - 0.35], [CAN_R - 0.75, CAN_L - 0.05], [CAN_R - 1.25, CAN_L - 0.3], [CAN_R - 1.25, CAN_L - 0.9]];
      var body = new THREE.Mesh(lathe(prof, 48).rotateZ(-Math.PI / 2), mAlu);
      body.castShadow = true;
      g.add(body);
      var mesh = new THREE.Mesh(new THREE.CircleGeometry(CAN_R - 1.2, 40).rotateY(Math.PI / 2), mMesh);
      mesh.position.x = CAN_L - 0.85;
      g.add(mesh);
      g.position.set(-CAN_L, y, 0);
      return g;
    }
    var canT = transducer(Ty), canR = transducer(Ry);
    gMod.add(canT); gMod.add(canR);
    // crystal (HC-49/S) between the cans
    var xtal = new THREE.Mesh(rbox(4.4, 3.4, 11, 1.6, 0.6, 4), K.mat.steel({ roughness: 0.25 }));
    xtal.rotation.z = -Math.PI / 2;
    xtal.position.set(-CAN_L, HC, 1.0);
    gMod.add(xtal);
    // right-angle-free straight header on the side edge: 4 pins pointing −z, with jumper housings
    var mPinG = K.mat.gold({ roughness: 0.3 });
    var hdr = new THREE.Mesh(rbox(2.5, 10.2, 2.5, 0.2, 0.12), K.mat.plasticBlack());
    hdr.position.set(PCB_X + 0.8, HC - 5.1, -10 - 1.25);
    gMod.add(hdr);
    var wiresCol = [0xC0392B, 0xE3A90E, 0x2E5BC4, 0x22252B];
    var hdrY = [HC + 3.81, HC + 1.27, HC - 1.27, HC - 3.81];
    hdrY.forEach(function (yy, k) {
      var pin = new THREE.Mesh(new THREE.BoxGeometry(0.64, 0.64, 9), mPinG);
      pin.position.set(PCB_X + 0.8, yy, -10 - 4.5);
      gMod.add(pin);
      var hs = new THREE.Mesh(new THREE.BoxGeometry(2.5, 2.5, 13), K.mat.plasticBlack({ roughness: 0.5 }));
      hs.position.set(PCB_X + 0.8, yy, -10 - 3.5 - 6.5);
      hs.castShadow = true;
      gMod.add(hs);
      var w = K.wire([[PCB_X + 0.8, yy, -27], [PCB_X + 0.8, yy - 2, -34], [PCB_X - 2 - k * 1.4, yy * 0.45, -44], [PCB_X - 6 - k * 3, 1.2, -60], [PCB_X - 18 - k * 6, 1.2, -140], [PCB_X - 40 - k * 10, 1.2, -320]],
        { radius: 0.7, material: new THREE.MeshStandardMaterial({ color: wiresCol[k], roughness: 0.45 }), segments: 90, radial: 8 });
      gMod.add(w);
    });
    // holder: base, column and a clamp plate behind the board
    var mHolder = new THREE.MeshStandardMaterial({ color: 0x3E434D, roughness: 0.6, metalness: 0.05 });
    var base = new THREE.Mesh(rbox(64, 5, 52, 4, 1.4, 3), mHolder);
    base.position.set(PCB_X - 22, 0, 0);
    base.castShadow = true; base.receiveShadow = true;
    gMod.add(base);
    var col = new THREE.Mesh(rbox(10, HC + 6, 14, 2, 1.0, 3), mHolder);
    col.position.set(PCB_X - 10, 4.5, 0);
    col.castShadow = true;
    gMod.add(col);
    var clampPlate = new THREE.Mesh(rbox(5, 36, 16, 1.5, 0.8, 3), mHolder);
    clampPlate.position.set(PCB_X - 2.5, HC - 18, 0);
    clampPlate.castShadow = true;
    gMod.add(clampPlate);
    [HC + 20.6, HC - 20.6].forEach(function (yy) {
      [-8.6, 8.6].forEach(function (zz) {
        var screw = new THREE.Mesh(new THREE.CylinderGeometry(1.25, 1.25, 1.2, 16).rotateZ(Math.PI / 2), K.mat.steel({ roughness: 0.3 }));
        screw.position.set(-CAN_L + 0.55, yy, zz);
        gMod.add(screw);
      });
    });

    /* ---------- ruler (aluminium, cm) ---------- */
    var RZ = 52, RW = 40, RSEG = 520, NSEG = 4;
    var mRulerEdge = K.mat.aluminium({ roughness: 0.45 });
    var rulerTex = [];
    for (i = 0; i < NSEG; i++) {
      (function (seg) {
        var tex = canvasTex(2048, 128, function (ctx, w, h) {
          var g = ctx.createLinearGradient(0, 0, 0, h);
          g.addColorStop(0, '#E4E6EA'); g.addColorStop(1, '#D3D6DC');
          ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
          var pxmm = w / RSEG;
          ctx.fillStyle = '#1B1D22';
          for (var mm = 0; mm <= RSEG; mm += 1) {
            var x = mm * pxmm, cm = seg * RSEG + mm;   // mm from the ruler zero
            if (cm % 10 !== 0) continue;
            var c = cm / 10;
            var L = c % 10 === 0 ? 0.48 : c % 5 === 0 ? 0.34 : 0.22;
            ctx.fillRect(x - 1.1, 0, 2.2, h * L);
            if (c % 10 === 0 && x > 30 && x < w - 30) {
              ctx.font = font(46, 600, true);
              ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
              ctx.fillText(String(c), x, h - 12);
            }
          }
          if (seg === 0) {
            ctx.font = font(22, 500, true);
            ctx.textAlign = 'left';
            ctx.fillText('cm', 18, h - 20);
          }
        });
        rulerTex.push(tex);
        var m = new THREE.Mesh(rbox(RSEG, 1.4, RW, 0.6, 0.3, 2), [new THREE.MeshStandardMaterial({ color: 0xC9CCD2 }), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.55, metalness: 0.15, envMapIntensity: 0.6 }), mRulerEdge]);
        topUV(m.geometry, RSEG, RW);
        m.position.set(seg * RSEG + RSEG / 2, 0.02, RZ);
        m.receiveShadow = true;
        v.scene.add(m);
      })(i);
    }
    afterFonts(rulerTex);

    /* ---------- box (cardboard) ---------- */
    var BX = 160, BYH = 130, BZ = 180;
    var texKraft = canvasTex(256, 256, function (ctx) {
      var rnd = K.rng(31);
      ctx.fillStyle = '#C39A6B'; ctx.fillRect(0, 0, 256, 256);
      for (var k = 0; k < 900; k++) {
        ctx.fillStyle = rnd() < 0.5 ? 'rgba(255,240,215,0.06)' : 'rgba(90,60,30,0.06)';
        ctx.fillRect(rnd() * 256, rnd() * 256, 1 + rnd() * 3, 1 + rnd() * 3);
      }
    }, { repeat: true });
    texKraft.repeat.set(1 / 70, 1 / 70);
    var mKraft = new THREE.MeshStandardMaterial({ map: texKraft, roughness: 0.88, envMapIntensity: 0.4 });
    var gBox = new THREE.Group();
    v.scene.add(gBox);
    var boxMesh = new THREE.Mesh(rbox(BX, BYH, BZ, 3, 1.6, 3), mKraft);
    boxMesh.position.set(BX / 2, 0, 0);
    boxMesh.castShadow = true; boxMesh.receiveShadow = true;
    gBox.add(boxMesh);
    var seam = new THREE.Mesh(new THREE.BoxGeometry(BX - 4, 0.4, 0.8), new THREE.MeshStandardMaterial({ color: 0x8C6A45, roughness: 0.9 }));
    seam.position.set(BX / 2, BYH + 0.1, 0);
    gBox.add(seam);
    var tape = new THREE.Mesh(new THREE.BoxGeometry(BX + 2, 0.3, 48), new THREE.MeshStandardMaterial({ color: 0xD8B98C, roughness: 0.25, transparent: true, opacity: 0.55 }));
    tape.position.set(BX / 2, BYH + 0.25, 0);
    gBox.add(tape);
    var tapeFront = new THREE.Mesh(new THREE.BoxGeometry(0.3, 40, 48), tape.material);
    tapeFront.position.set(-0.15, BYH - 20, 0);
    gBox.add(tapeFront);

    /* ---------- pressure shells (8-cycle burst) ---------- */
    var LAMBDA = C_SOUND / 40000 * 1000;          // 8,6 mm
    var CAP = 0.27;                                // half-angle of the drawn beam (≈ 15°, as in the module's data)
    var alphaTex = canvasTex(4, 128, function (ctx, w, h) {
      var g = ctx.createLinearGradient(0, 0, 0, h);   // canvas top = pole (uv.y = 1)
      g.addColorStop(0, 'rgba(255,255,255,1)');
      g.addColorStop(0.55, 'rgba(255,255,255,0.8)');
      g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    }, { linear: true });
    var capGeo = new THREE.SphereGeometry(1, 40, 10, 0, Math.PI * 2, 0, CAP);
    capGeo.rotateZ(-Math.PI / 2);                  // pole +y → +x
    var capGeoBack = new THREE.SphereGeometry(1, 40, 10, 0, Math.PI * 2, 0, CAP);
    capGeoBack.rotateZ(Math.PI / 2);               // pole +y → −x
    var WAVE = dark ? 0x8EA6F2 : 0x2343B0;
    // sound does not pass through the table: drop wave fragments below it
    function aboveTable(mat) {
      mat.onBeforeCompile = function (sh) {
        sh.vertexShader = 'varying float vWy;\nvarying float vWz;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nvec4 kgW = modelMatrix * vec4(transformed, 1.0);\nvWy = kgW.y; vWz = kgW.z;');
        // fade the beam above and beside the box, so a far, wide shell never forms a wall
        sh.fragmentShader = 'varying float vWy;\nvarying float vWz;\n' + sh.fragmentShader.replace('void main() {', 'void main() {\nif (vWy < 1.5) discard;')
          .replace('#include <dithering_fragment>', '#include <dithering_fragment>\ngl_FragColor.a *= (1.0 - smoothstep(110.0, 190.0, vWy)) * (1.0 - smoothstep(90.0, 150.0, abs(vWz)));');
      };
      mat.customProgramCacheKey = function () { return 'kg-above-table-2'; };
      return mat;
    }
    function capMesh(geo) {
      var m = new THREE.Mesh(geo, aboveTable(new THREE.MeshBasicMaterial({ color: WAVE, alphaMap: alphaTex, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide })));
      m.renderOrder = 3;
      m.frustumCulled = false;
      v.scene.add(m);
      return m;
    }
    var outCaps = [], echoCaps = [];
    for (i = 0; i < 8; i++) { outCaps.push(capMesh(capGeo)); echoCaps.push(capMesh(capGeoBack)); }
    // crisp wavefront arcs in the vertical plane through the beam axis
    var arcGeo = new THREE.TorusGeometry(1, 0.0032, 4, 64, 2 * CAP);
    arcGeo.rotateZ(-CAP);
    var arcGeoBack = new THREE.TorusGeometry(1, 0.0032, 4, 64, 2 * CAP);
    arcGeoBack.rotateZ(Math.PI - CAP);
    function arcMesh(geo) {
      var m = new THREE.Mesh(geo, aboveTable(new THREE.MeshBasicMaterial({ color: WAVE, transparent: true, opacity: 0, depthWrite: false })));
      m.renderOrder = 4;
      m.frustumCulled = false;
      v.scene.add(m);
      return m;
    }
    var outArcs = [], echoArcs = [];
    for (i = 0; i < 8; i++) { outArcs.push(arcMesh(arcGeo)); echoArcs.push(arcMesh(arcGeoBack)); }

    /* ---------- emitter / receiver glow (shared by the main view and the close-up) ---------- */
    var mGlowT = new THREE.MeshBasicMaterial({ color: WAVE, transparent: true, opacity: 0, depthWrite: false, toneMapped: false });
    var mGlowR = mGlowT.clone();
    [[Ty, mGlowT], [Ry, mGlowR]].forEach(function (p) {
      var gd = new THREE.Mesh(new THREE.CircleGeometry(CAN_R - 1.3, 40).rotateY(Math.PI / 2), p[1]);
      gd.position.set(-0.7, p[0], 0);
      gd.renderOrder = 5;
      gMod.add(gd);
    });

    /* ---------- close-up inset of the module ----------
     * Rendered with the shared renderer into a corner of its canvas and copied into this
     * visual's (GPU-backed) canvas: a separate small stage would force a slow GPU readback. */
    var IN = { size: 150, right: 18, bottom: 34 };
    var inScene = new THREE.Scene();
    K.studio(inScene, { theme: opts.theme, size: 60, shadows: false });
    var inCam = new THREE.PerspectiveCamera(24, 1, 2, 3000);
    (function () {
      var yaw = 0.9, pitch = 0.1, d = 168, tx = -7, ty = HC, tz = 4;
      inCam.position.set(tx + d * Math.sin(yaw) * Math.cos(pitch), ty + d * Math.sin(pitch), tz + d * Math.cos(yaw) * Math.cos(pitch));
      inCam.lookAt(tx, ty, tz);
      inCam.updateMatrixWorld();
    })();
    // own material copies: sharing materials between two scenes with different lights
    // would force a shader-program swap on every frame
    var inMod = gMod.clone(true), matMap = new Map();
    inMod.traverse(function (o) {
      if (!o.material) return;
      var one = function (m) { if (!matMap.has(m)) matMap.set(m, m.clone()); return matMap.get(m); };
      o.material = Array.isArray(o.material) ? o.material.map(one) : one(o.material);
    });
    inScene.add(inMod);
    var inGlowT = matMap.get(mGlowT), inGlowR = matMap.get(mGlowR);
    var inP = new THREE.Vector3();
    function inProject(x, y, z) { inP.set(x, y, z).project(inCam); return [(inP.x + 1) / 2 * IN.size, (1 - inP.y) / 2 * IN.size]; }
    var inAlpha = 0;
    function drawInset(c) {
      var r = K.renderer();
      if (!r || inAlpha < 0.01) return;
      var k = v.sf.k, px = Math.round(IN.size * k), glc = r.domElement;
      if (glc.width < px || glc.height < px) return;
      r.setViewport(0, 0, px, px); r.setScissor(0, 0, px, px); r.setScissorTest(true);
      r.setClearColor(0x000000, 0); r.clear(true, true, true);
      r.toneMappingExposure = 0.95;
      r.render(inScene, inCam);
      var x = v.w - IN.right - IN.size, y = v.h - IN.bottom - IN.size, rad = IN.size / 2;
      c.save();
      c.globalAlpha = inAlpha;
      c.beginPath(); c.arc(x + rad, y + rad, rad, 0, Math.PI * 2);
      c.fillStyle = dark ? '#161B26' : '#FFFFFF'; c.fill();
      c.save(); c.clip();
      c.drawImage(glc, 0, glc.height - px, px, px, x, y, IN.size, IN.size);
      c.restore();
      c.strokeStyle = dark ? '#262D3B' : '#E3E3DD'; c.lineWidth = 1;
      c.beginPath(); c.arc(x + rad, y + rad, rad - 0.5, 0, Math.PI * 2); c.stroke();
      var pT = inProject(0, Ty + CAN_R + 2, 0), pR = inProject(0, Ry - CAN_R - 2, 0);
      K.label(c, 'T', x + pT[0], y + pT[1] - 4, { size: 13, weight: 600, color: dark ? '#EEF0F3' : '#15171C', align: 'center' });
      K.label(c, 'R', x + pR[0], y + pR[1] + 14, { size: 13, weight: 600, color: dark ? '#EEF0F3' : '#15171C', align: 'center' });
      K.label(c, 'MODÜL, YAKINDAN', x + rad, y + IN.size + 15, { mono: true, size: 10, weight: 500, spacing: 1.2, color: dark ? '#9AA3B2' : '#595E69', align: 'center' });
      c.restore();
    }

    /* ---------- labels ---------- */
    var labT = v.label('T · verici', { cls: 'name', at: [-2, Ty + CAN_R - 1, 0], dx: 52, dy: -40, line: true, align: 'left', valign: 'bottom' });
    var labR = v.label('R · alıcı', { cls: 'name', at: [-2, Ry - CAN_R + 1, 0], dx: 58, dy: 42, line: true, align: 'left', valign: 'top' });


    var boxAnchor = new THREE.Vector3();
    var labD = v.label('50 cm', { cls: 'value chip', align: 'center' });
    labD.at = function () { boxAnchor.set(dCur * 10, 1.6, RZ + RW / 2 + 6); return boxAnchor; };


    /* ---------- state ---------- */
    var AUTO_SEQ = [50, 50, 120, 120, 25, 25, 180, 180, 80, 80];
    var auto = true, dTarget = D_DEF, dCur = D_DEF, seqIdx = 0;
    var cyc = 0, cycD = D_DEF, measured = null, settled = true;
    var tmp = new THREE.Vector3();
    var imgX = 0, pathR = 0, tHit = 0, tArr = 0, tEnd = 0, Trt = 0, cvis = 0;
    var T0 = 0.45, HOLD = 2.3;

    function plan(d) {
      // visual round trip grows gently with distance; the clock shows the real time
      cycD = d;
      var dm = d * 10;
      Trt = 1.25 + 2.1 * Math.sqrt(d / 200);
      imgX = 2 * dm;                                         // mirror image of T behind the box face
      pathR = Math.hypot(imgX - 0, Ty - Ry);                 // image source → R
      cvis = pathR / Trt;                                    // the echo front covers the whole T → box → R path
      tHit = T0 + dm / cvis;
      tArr = T0 + Trt;
      tEnd = tArr + HOLD;
      cyc = 0;
      measured = null;
    }

    function reset() {
      auto = true; dTarget = D_DEF; dCur = D_DEF; seqIdx = 0;
      plan(D_DEF);
      v.setView({ yaw: -0.42, pitch: 0.24 });
      framed = false;
      for (var s2 = 0; s2 < 6; s2++) frameView(0.05, true);
      for (var k = 0; k < 8; k++) { outCaps[k].material.opacity = 0; echoCaps[k].material.opacity = 0; }
    }

    // auto-framing: keep the module (left) and the box face (right) inside the frame
    var fL = new THREE.Vector3(), fR = new THREE.Vector3(), framed = false;
    function frameView(dt, snap) {
      var dm = dCur * 10;
      var vw = v.w || 680, vh = v.h || 520;
      if (!framed || snap) {
        v.view.target.set(dm * 0.5 - 30, 58, 0);
        v.view.distance = Math.max(470, (dm + 300) * 1.5);
        framed = true;
      }
      v.applyView();
      v.camera.updateMatrixWorld();
      var pL = v.project(fL.set(-70, 60, 0)), pR = { x: -1e9 };
      for (var bi = 0; bi < 8; bi++) {
        var bp = v.project(fR.set(dm + (bi & 1 ? BX : 0), (bi & 2) ? BYH : 0, (bi & 4) ? BZ / 2 : -BZ / 2));
        if (bp.x > pR.x) pR = { x: bp.x };
      }
      var want = vw - 120, have = Math.max(40, pR.x - pL.x);
      var k = snap ? 1 : Math.min(1, dt * 4);
      var dist = v.view.distance * Math.pow(have / want, k);
      v.view.distance = clamp(dist, 380, 9000);
      var worldPerPx = 2 * v.view.distance * Math.tan(13 * Math.PI / 180) * (vw / vh) / vw;
      var mid = (pL.x + pR.x) / 2, wantMid = vw / 2;
      v.view.target.x += (mid - wantMid) * worldPerPx * 0.9 * k;
      v.view.target.y = 58 + Math.min(40, dm * 0.015);
      if (v.lights) {
        v.lights.key.target.position.set(dm * 0.5, 0, 0);
        v.lights.key.position.set(dm * 0.5 + KEYOFF.x, KEYOFF.y, KEYOFF.z);
      }
    }

    function drawPanel(c, tNow) {
      var x = 16, y = 16, w = 262, h = 104;
      var ink = dark ? '#EEF0F3' : '#15171C', mut = dark ? '#9AA3B2' : '#595E69';
      c.save();
      c.fillStyle = dark ? 'rgba(22,27,38,0.92)' : 'rgba(255,255,255,0.92)';
      c.strokeStyle = dark ? '#262D3B' : '#E3E3DD';
      c.lineWidth = 1;
      K.rr(c, x, y, w, h, 10); c.fill(); c.stroke();
      K.label(c, 'YANKI SÜRESİ', x + 14, y + 22, { mono: true, size: 11, weight: 500, spacing: 1.3, color: mut });
      K.label(c, tNow < tArr ? 'şu ana kadar' : 'yavaşlatılmış', x + w - 14, y + 22, { mono: true, size: 11, weight: 500, spacing: 1.0, color: mut, align: 'right' });
      // clock: real time, counts during the flight
      var prog = clamp((tNow - T0) / (tArr - T0), 0, 1);
      var tReal = prog * timeSec(cycD) * 1000;
      var ms = 2 * cycD / 100 / C_SOUND * 1000;
      var txt = K.num(tReal, 2);
      K.label(c, txt + ' ms', x + 14, y + 52, { mono: true, size: 24, weight: 500, color: ink });
      // bar: out and back halves
      var bx = x + 14, by = y + 64, bw = w - 28, bh = 6;
      c.fillStyle = dark ? '#262D3B' : '#E3E3DD';
      K.rr(c, bx, by, bw, bh, 3); c.fill();
      var outK = clamp((tNow - T0) / (tHit - T0), 0, 1), backK = clamp((tNow - tHit) / (tArr - tHit), 0, 1);
      c.fillStyle = dark ? '#8EA6F2' : '#2343B0';
      if (outK > 0) { K.rr(c, bx, by, bw / 2 * outK, bh, 3); c.fill(); }
      c.fillStyle = dark ? '#E39A6C' : '#C8693A';
      if (backK > 0) { K.rr(c, bx + bw / 2, by, bw / 2 * backK, bh, 3); c.fill(); }
      c.fillStyle = dark ? '#0E121A' : '#FFFFFF';
      c.fillRect(bx + bw / 2 - 1, by - 1, 2, bh + 2);
      K.label(c, 'gidiş', bx, by + 22, { size: 12, color: mut });
      K.label(c, 'dönüş', bx + bw / 2 + 4, by + 22, { size: 12, color: mut });
      K.label(c, '÷ 2', bx + bw, by + 22, { mono: true, size: 12, color: mut, align: 'right' });
      c.restore();
      // result card
      var rA = clamp((tNow - tArr - 0.15) / 0.4, 0, 1);
      if (rA > 0) {
        var ry = y + h + 10, rh = 54;
        c.save();
        c.globalAlpha = rA;
        c.fillStyle = dark ? 'rgba(22,27,38,0.92)' : 'rgba(255,255,255,0.92)';
        c.strokeStyle = dark ? '#262D3B' : '#E3E3DD';
        K.rr(c, x, ry, w, rh, 10); c.fill(); c.stroke();
        K.label(c, 'd = 343 m/s × ' + fmtSec(cycD) + ' s ÷ 2', x + 14, ry + 22, { mono: true, size: 12, color: mut });
        K.label(c, '≈ ' + K.num(result(cycD), 2) + ' m', x + 14, ry + 44, { mono: true, size: 16, weight: 500, color: dark ? '#E39A6C' : '#A64B22' });
        c.restore();
      }
    }

    reset();
    return {
      reset: reset,
      set: function (key, val) {
        if (key === 'distance') {
          auto = false;
          var d = clamp(Math.round(+val), 5, 200);
          if (isFinite(d)) dTarget = d;
        }
      },
      read: function (key) {
        var d = Math.round(dCur);
        if (key === 'distance') return d + ' cm';
        if (key === 'time') return 'Yankı süresi: ' + fmtTime(d) + ' ms';
        if (key === 'formula') return 'd = 343 m/s × ' + fmtSec(d) + ' s ÷ 2 ≈ ' + K.num(result(d), 2) + ' m';
        return '';
      },
      frame: function (t, dt) {
        var rm = K.reducedMotion;
        // auto-demo: measure each distance in the sequence, sliding the box in between
        if (auto && settled && cyc >= tEnd - 0.05) {
          seqIdx = (seqIdx + 1) % AUTO_SEQ.length;
          dTarget = AUTO_SEQ[seqIdx];
        }
        // slide the box (critically damped, no jumps)
        var diff = dTarget - dCur;
        var step = diff * Math.min(1, dt * 3.2);
        if (Math.abs(diff) < 0.05) { dCur = dTarget; } else dCur += step;
        var moving = Math.abs(dTarget - dCur) > 0.05;
        if (moving) { settled = false; }
        else if (!settled) { settled = true; plan(dCur); }
        if (Math.abs(cycD - dCur) > 0.01 && !moving && settled && cyc === 0) plan(dCur);

        cyc += moving ? 0 : dt;
        if (!moving && cyc >= tEnd) { plan(dCur); }
        var tc = rm ? (tHit + (tArr - tHit) * 0.45) : cyc;
        var dm = dCur * 10;
        gBox.position.x = dm;

        // shells
        var on = !moving;
        var rFront = (tc - T0) * cvis;
        for (var k = 0; k < 8; k++) {
          var env = Math.sin(Math.PI * (k + 0.5) / 8);
          var r = rFront - k * LAMBDA;
          var oc = outCaps[k];
          if (on && r > 1 && r < dm + 60) {
            oc.position.set(0, Ty, 0);
            oc.scale.setScalar(r);
            var fadeOut = r > dm ? 1 - (r - dm) / 60 : 1;
            oc.material.opacity = 0.03 * env * fadeOut * Math.min(1, r / 12) / (1 + r / 250);
            outArcs[k].position.copy(oc.position); outArcs[k].scale.setScalar(r);
            outArcs[k].material.opacity = 0.85 * env * fadeOut * Math.min(1, r / 12);
          } else { oc.material.opacity = 0; outArcs[k].material.opacity = 0; }
          var re = (tc - T0) * cvis - k * LAMBDA;
          var ec = echoCaps[k];
          if (on && re > dm && re < pathR + 30) {
            ec.position.set(imgX, Ty, 0);
            ec.scale.setScalar(re);
            var fadeIn = Math.min(1, (re - dm) / Math.max(30, dm * 0.15));
            var fadeEnd = re > pathR ? 1 - (re - pathR) / 30 : 1;
            ec.material.opacity = 0.028 * env * fadeIn * fadeEnd / (1 + re / 250);
            echoArcs[k].position.copy(ec.position); echoArcs[k].scale.setScalar(re);
            echoArcs[k].material.opacity = 0.8 * env * fadeIn * fadeEnd;
          } else { ec.material.opacity = 0; echoArcs[k].material.opacity = 0; }
        }
        labD.set(Math.round(dCur) + ' cm');

        frameView(dt);
        v.render(dt);
        if (!K.skipRender) {
          var c = v.ctx;
          // distance arrow along the ruler: 0 → d
          var a0 = v.project(tmp.set(0, 2, RZ - RW / 2 - 4));
          var a1x = v.project(tmp.set(dm, 2, RZ - RW / 2 - 4));
          c.save();
          c.strokeStyle = c.fillStyle = dark ? '#E39A6C' : '#A64B22';
          c.lineWidth = 1.4;
          if (Math.hypot(a1x.x - a0.x, a1x.y - a0.y) > 24) {
            K.arrow(c, (a0.x + a1x.x) / 2, (a0.y + a1x.y) / 2, a1x.x, a1x.y, { color: c.strokeStyle, width: 1.4, head: 7 });
            K.arrow(c, (a0.x + a1x.x) / 2, (a0.y + a1x.y) / 2, a0.x, a0.y, { color: c.strokeStyle, width: 1.4, head: 7 });
          }
          c.restore();
          drawPanel(c, moving ? 0 : tc);
        }
        // emitter and receiver glow, close-up inset
        var emitK = on ? clamp(1 - Math.abs(tc - T0 - 0.12) / 0.22, 0, 1) : 0;
        var recvK = on ? clamp(1 - Math.abs(tc - tArr - 0.12) / 0.28, 0, 1) : 0;
        mGlowT.opacity = inGlowT.opacity = 0.75 * emitK;
        mGlowR.opacity = inGlowR.opacity = 0.75 * recvK;
        inAlpha += ((dCur >= 28 ? 1 : 0) - inAlpha) * Math.min(1, dt * 4);
        if (!K.skipRender) drawInset(v.ctx);
      }
    };
  });

  /* =====================================================================
   * Shared component models (Builder G standard, mm)
   * ===================================================================== */
  var BAND = {
    black: '#1B1B1B', brown: '#6B3A1F', red: '#C42B1C', orange: '#E07A1F', yellow: '#E8C21A',
    green: '#2E8B3A', blue: '#2A58C7', violet: '#7A3BB0', grey: '#8A8A8A', white: '#F2F2F2'
  };
  /* Axial carbon-film resistor, body 6,3 × 2,4 mm, legs bent down by `drop` mm at ±pitch/2 */
  function makeResistor(bands, pitch, drop, mats) {
    var THREE = TH();
    var g = new THREE.Group();
    var prof = [[0, -3.15], [0.55, -3.12], [0.95, -3.0], [1.17, -2.75], [1.22, -2.4], [1.2, -1.95], [1.12, -1.55], [1.1, -1.0],
      [1.1, 1.0], [1.12, 1.55], [1.2, 1.95], [1.22, 2.4], [1.17, 2.75], [0.95, 3.0], [0.55, 3.12], [0, 3.15]];
    function rAt(y) {
      for (var i = 1; i < prof.length; i++) if (y <= prof[i][1]) {
        var a = prof[i - 1], b = prof[i], k = (y - a[1]) / Math.max(1e-6, b[1] - a[1]);
        return a[0] + (b[0] - a[0]) * k;
      }
      return 0;
    }
    var body = new THREE.Mesh(lathe(prof, 40).rotateZ(-Math.PI / 2), mats.body);
    body.castShadow = true;
    g.add(body);
    var pos = [-2.25, -1.2, -0.15, 2.3], wid = [0.62, 0.6, 0.6, 0.6];
    bands.forEach(function (c, i) {
      var y0 = pos[i] - wid[i] / 2, y1 = pos[i] + wid[i] / 2, pts = [];
      for (var k = 0; k <= 6; k++) { var yy = y0 + (y1 - y0) * k / 6; pts.push([rAt(yy) * 1.012 + 0.004, yy]); }
      var m = c === 'gold' ? K.mat.std(0xC9A13B, 0.32, 1) : c === 'silver' ? K.mat.std(0xBFC3C8, 0.3, 1) : K.mat.std(BAND[c], 0.55, 0);
      if (mats.fade) { m.transparent = true; mats.fade.push(m); }
      var b = new THREE.Mesh(lathe(pts, 40).rotateZ(-Math.PI / 2), m);
      g.add(b);
    });
    var hp = pitch / 2;
    [-1, 1].forEach(function (s) {
      var w = K.wire([[s * 3.0, 0, 0], [s * (hp - 0.9), 0, 0], [s * (hp - 0.25), -0.3, 0], [s * hp, -1.0, 0], [s * hp, -drop, 0]],
        { radius: 0.3, material: mats.lead, segments: 40, radial: 8, tension: 0.2 });
      g.add(w);
    });
    return g;
  }

  /* 5 mm LED (red): dome Ø5 × 8,6 mm, flange Ø5,8 with a flat on the cathode side (+x), anode leg longer */
  function makeLED(mats, legA, legK) {
    var THREE = TH();
    var g = new THREE.Group();
    var shape = new THREE.Shape();
    var R = 2.9, fx = 2.5, a0 = Math.acos(fx / R);
    shape.absarc(0, 0, R, a0, Math.PI * 2 - a0, false);
    shape.lineTo(fx, R * Math.sin(a0));
    var flange = new THREE.ExtrudeGeometry(shape, { depth: 1.0, bevelEnabled: true, bevelThickness: 0.12, bevelSize: 0.12, bevelSegments: 2, curveSegments: 32 });
    flange.rotateX(-Math.PI / 2);
    flange.translate(0, 0.12, 0);
    var dome = lathe([[0, 1.0], [2.48, 1.0], [2.5, 1.2], [2.5, 6.1], [2.42, 6.75], [2.17, 7.35], [1.77, 7.86], [1.25, 8.24], [0.65, 8.5], [0, 8.6]], 48);
    var epo = new THREE.Mesh(merge([flange, dome]), mats.epoxy);
    epo.castShadow = true;
    epo.renderOrder = 2;
    g.add(epo);
    // lead frame inside: cathode anvil with reflector cup, anode post, die and bond wire
    var anvil = new THREE.Mesh(merge([placed(new THREE.BoxGeometry(0.5, 4.6, 0.5), 1.27, 2.6, 0), placed(lathe([[0, 0], [0.6, 0], [0.95, 0.55], [0.8, 0.6], [0, 0.2]], 24), 0.85, 4.9, 0)]), mats.frame);
    g.add(anvil);
    var post = new THREE.Mesh(merge([placed(new THREE.BoxGeometry(0.5, 4.2, 0.5), -1.27, 2.4, 0), placed(new THREE.BoxGeometry(0.9, 0.45, 0.5), -0.95, 4.7, 0)]), mats.frame);
    g.add(post);
    var die = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.22, 0.32), mats.die);
    die.position.set(0.85, 5.18, 0);
    g.add(die);
    var bond = K.wire([[0.85, 5.29, 0], [0.3, 6.0, 0], [-0.6, 5.6, 0], [-0.95, 4.95, 0]], { radius: 0.03, material: mats.gold, segments: 24, radial: 5, castShadow: false });
    g.add(bond);
    // legs below the flange
    var legs = new THREE.Mesh(merge([placed(new THREE.BoxGeometry(0.5, legA, 0.5), -1.27, -legA / 2 + 0.2, 0), placed(new THREE.BoxGeometry(0.5, legK, 0.5), 1.27, -legK / 2 + 0.2, 0)]), mats.lead);
    legs.castShadow = true;
    g.add(legs);
    g.die = die;
    return g;
  }

  /* =====================================================================
   * pcb-from-breadboard · W 1120×380 · light
   * ===================================================================== */
  K.register('pcb-from-breadboard', function (el, opts) {
    var THREE = TH();
    opts = opts || {};
    var dark = opts.theme === 'dark';
    var VIEW = { yaw: 0.0, pitch: 0.68, distance: 214, target: [-9, 2, -14] };
    var CLOSE = { yaw: 0.0, pitch: 0.5, distance: 150, target: [62, 20, 4] };
    var v = K.stage3d(el, {
      theme: opts.theme, fov: 24, near: 2, far: 3000, yaw: VIEW.yaw, pitch: VIEW.pitch, distance: VIEW.distance,
      target: VIEW.target, size: 110, ground: 0, minDistance: 120, maxDistance: 520, minPitch: 0.15, maxPitch: 1.3
    });
    if (!v.ready) return { reset: function () {}, frame: function (t, dt) { v.render(dt); } };
    tuneLights(v, { key: 0.85, fill: 0.9, rim: 0.95, hemi: 0.8, shadowBias: 0.05, shadow: 0.13, exposure: 0.92 });
    // the loop pauses at the end of each step so its caption can be read: [scene time u, hold in s]
    var HOLDS = [[1.9, 1.5], [4.3, 2.0], [5.6, 2.5], [7.4, 2.0], [12.0, 2.0], [13.6, 1.5]];
    var SEGS = [], LOOP = 0;
    (function () {
      var tt = 0, uu = 0;
      HOLDS.concat([[15, 0]]).forEach(function (h) {
        SEGS.push({ t0: tt, t1: tt + (h[0] - uu), u0: uu, u1: h[0] });
        tt += h[0] - uu; uu = h[0];
        if (h[1] > 0) { SEGS.push({ t0: tt, t1: tt + h[1], u0: uu, u1: uu }); tt += h[1]; }
      });
      LOOP = tt;
    })();
    function sceneU(t) {
      var tl = t % LOOP;
      for (var q = 0; q < SEGS.length; q++) {
        var sg = SEGS[q];
        if (tl < sg.t1) return sg.u1 === sg.u0 ? sg.u0 : sg.u0 + (tl - sg.t0);
      }
      return 15;
    }
    var i, j;
    var fadeMats = [];            // materials faded in the loop reset
    function fm(m) { m.transparent = true; fadeMats.push(m); return m; }

    /* ---------- breadboard (half size, 82 × 55 × 8,5 mm) ---------- */
    var BB = { x: -70, w: 82, d: 55, h: 8.5 };
    var ROWZ = { a: -13.97, b: -11.43, c: -8.89, d: -6.35, e: -3.81, f: 3.81, g: 6.35, h: 8.89, i: 11.43, j: 13.97 };
    var RAIL = { bPlus: -21.59, bMinus: -19.05, fMinus: 19.05, fPlus: 21.59 };
    function colX(c) { return (c - 15.5) * 2.54; }
    function railX(n) { return (n + Math.floor(n / 5) - 14.5) * 2.54; }
    var texBB = boardTex(BB.w, BB.d, 14, function (ctx) {
      ctx.fillStyle = '#F2EFE7';
      rrPath(ctx, 0, 0, BB.w, BB.d, 2.4); ctx.fill();
      // grooves: centre channel and rail separations
      ctx.fillStyle = '#D9D4C8';
      ctx.fillRect(-BB.w / 2 + 1.5, -1.1, BB.w - 3, 2.2);
      ctx.fillStyle = 'rgba(0,0,0,0.05)';
      ctx.fillRect(-BB.w / 2 + 1.5, -17.0, BB.w - 3, 0.6);
      ctx.fillRect(-BB.w / 2 + 1.5, 16.4, BB.w - 3, 0.6);
      function hole(x, z) {
        ctx.fillStyle = '#3A3B3F';
        rrPath(ctx, x, z, 1.05, 1.05, 0.12); ctx.fill();
        ctx.fillStyle = '#18191C';
        rrPath(ctx, x + 0.08, z + 0.08, 0.72, 0.72, 0.08); ctx.fill();
      }
      var c, r;
      for (c = 1; c <= 30; c++) for (r in ROWZ) hole(colX(c), ROWZ[r]);
      for (var n = 0; n < 25; n++) { [RAIL.bPlus, RAIL.bMinus, RAIL.fMinus, RAIL.fPlus].forEach(function (z) { hole(railX(n), z); }); }
      // rail lines and polarity marks
      ctx.lineWidth = 0.45;
      [[RAIL.bPlus - 1.75, '#C42B1C'], [RAIL.bMinus + 1.75, '#2A58C7'], [RAIL.fMinus - 1.75, '#2A58C7'], [RAIL.fPlus + 1.75, '#C42B1C']].forEach(function (L) {
        ctx.strokeStyle = L[1];
        poly(ctx, [[-35.5, L[0]], [35.5, L[0]]]); ctx.stroke();
      });
      ctx.font = font(1.9, 600);
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      [[RAIL.bPlus, '+', '#C42B1C'], [RAIL.bMinus, '−', '#2A58C7'], [RAIL.fMinus, '−', '#2A58C7'], [RAIL.fPlus, '+', '#C42B1C']].forEach(function (L) {
        ctx.fillStyle = L[2];
        ctx.fillText(L[1], -38.6, L[0]); ctx.fillText(L[1], 38.6, L[0]);
      });
      ctx.fillStyle = '#8A8D94';
      ctx.font = font(1.25, 500);
      [1, 5, 10, 15, 20, 25, 30].forEach(function (k) { ctx.fillText(String(k), colX(k), -15.9); ctx.fillText(String(k), colX(k), 15.9); });
      'abcdefghij'.split('').forEach(function (L) { ctx.fillText(L, -39.0, ROWZ[L]); ctx.fillText(L, 39.0, ROWZ[L]); });
    });
    afterFonts([texBB]);
    var bbGeo = topUV(slab(rrShape(0, 0, BB.w - 1.2, BB.d - 1.2, 2.0), BB.h, { bevel: 0.6, bevelSegments: 3, curveSegments: 8 }), BB.w, BB.d);
    var mBBside = new THREE.MeshStandardMaterial({ color: 0xEDE9E0, roughness: 0.62 });
    var bbMesh = new THREE.Mesh(bbGeo, [mBBside, new THREE.MeshStandardMaterial({ map: texBB, roughness: 0.6, envMapIntensity: 0.5 }), mBBside]);
    bbMesh.position.set(BB.x, 0, 0);
    bbMesh.castShadow = true; bbMesh.receiveShadow = true;
    v.scene.add(bbMesh);
    function bbHole(c, z) { return [BB.x + colX(c), BB.h, z]; }
    function bbRail(n, z) { return [BB.x + railX(n), BB.h, z]; }
    // the hidden metal strip of column 13 (glows while it becomes a trace)
    var stripGlow = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.2, 11.6), new THREE.MeshBasicMaterial({ color: 0xE39A6C, transparent: true, opacity: 0, depthWrite: false, toneMapped: false }));
    stripGlow.position.set(BB.x + colX(13), BB.h + 0.06, (ROWZ.a + ROWZ.e) / 2);
    v.scene.add(stripGlow);

    /* ---------- PCB (46 × 30 mm) on brass standoffs ---------- */
    var PB = { x: 70, w: 46, d: 30, t: 1.6, so: 5 };
    var PTOP = PB.so + PB.t;
    var PADS = [
      { k: 'J1+', x: -16, y: -2.54, d: 2.4, drill: 1.3, sq: true },
      { k: 'J1-', x: -16, y: 2.54, d: 2.4, drill: 1.3 },
      { k: 'R1a', x: -6, y: -7, d: 1.9, drill: 0.9 },
      { k: 'R1b', x: 4.16, y: -7, d: 1.9, drill: 0.9 },
      { k: 'D1a', x: 10.73, y: 0, d: 1.8, drill: 0.9 },
      { k: 'D1k', x: 13.27, y: 0, d: 1.8, drill: 0.9, sq: true }
    ];
    var MH = [[-20, -12], [20, -12], [-20, 12], [20, 12]];
    var TR = [
      [[-16, -2.54], [-12.5, -2.54], [-8.04, -7.0], [-6, -7]],
      [[4.16, -7], [6.5, -7], [10.73, -2.77], [10.73, 0]],
      [[13.27, 0], [13.27, 5.0], [10.27, 8.0], [-10.0, 8.0], [-15.46, 2.54], [-16, 2.54]]
    ];
    var gPcb = new THREE.Group();                    // lifts and flips while soldering
    v.scene.add(gPcb);
    var pShape = rrShape(0, 0, PB.w - 0.4, PB.d - 0.4, 1.6);
    PADS.forEach(function (p) { pShape.holes.push(circHole(p.x, p.y, p.drill / 2)); });
    MH.forEach(function (m) { pShape.holes.push(circHole(m[0], m[1], 1.6)); });
    var mFr4 = new THREE.MeshStandardMaterial({ color: 0xCDBB82, roughness: 0.62, envMapIntensity: 0.4 });
    var mFr4Bot = new THREE.MeshStandardMaterial({ color: 0xCDBB82, roughness: 0.62, envMapIntensity: 0.4 });
    var mFr4Edge = new THREE.MeshStandardMaterial({ color: 0xB9A56E, roughness: 0.7 });
    var pcbMesh = new THREE.Mesh(slab(pShape, PB.t, { bevel: 0.15, bevelSegments: 2, curveSegments: 20 }), [mFr4Bot, mFr4, mFr4Edge]);
    pcbMesh.position.y = -PB.t / 2;                  // group origin = board centre
    pcbMesh.castShadow = true; pcbMesh.receiveShadow = true;
    gPcb.add(pcbMesh);
    var mPad = new THREE.MeshStandardMaterial({ color: COL.copper, metalness: 1, roughness: 0.3, side: THREE.DoubleSide });
    var padGeo = flatFeatures({ rings: PADS.map(function (p) { return { x: p.x, y: p.y, d: p.d, drill: p.drill, sq: p.sq }; }) });
    var padTop = new THREE.Mesh(padGeo, mPad); padTop.position.y = PB.t / 2 + 0.03; gPcb.add(padTop);
    var padBot = new THREE.Mesh(padGeo, mPad); padBot.position.y = -PB.t / 2 - 0.03; gPcb.add(padBot);
    var barrels = new THREE.Mesh(merge(PADS.map(function (p) { return placed(barrel(p.drill / 2 - 0.01, 18), p.x, 0, p.y); })), mPad);
    barrels.position.y = -PB.t / 2 - 0.02; barrels.scale.y = PB.t + 0.04;
    gPcb.add(barrels);
    // solder mask (descends, green) with openings at the pads, and the silkscreen
    var mShape = rrShape(0, 0, PB.w - 0.5, PB.d - 0.5, 1.55);
    PADS.forEach(function (p) { mShape.holes.push(p.sq ? rrHole(p.x, p.y, p.d + 0.25, p.d + 0.25, 0.15) : circHole(p.x, p.y, p.d / 2 + 0.12)); });
    MH.forEach(function (m) { mShape.holes.push(circHole(m[0], m[1], 1.75)); });
    var mMask = new THREE.MeshPhysicalMaterial({ color: COL.mask, transparent: true, opacity: 0, roughness: 0.42, clearcoat: 0.2, clearcoatRoughness: 0.4, envMapIntensity: 0.35, depthWrite: false });
    var maskMesh = new THREE.Mesh(flat(mShape, 20), mMask);
    maskMesh.renderOrder = 2;
    gPcb.add(maskMesh);
    var texSilk = boardTex(PB.w, PB.d, 26, function (ctx) {
      ctx.strokeStyle = ctx.fillStyle = COL.silk;
      ctx.lineWidth = 0.18; ctx.lineCap = 'round';
      rrPath(ctx, -0.92, -7, 8.0, 3.0, 0.4); ctx.stroke();                 // R1 outline
      ctx.beginPath(); ctx.arc(12, 0, 3.15, Math.acos(2.6 / 3.15), Math.PI * 2 - Math.acos(2.6 / 3.15)); ctx.stroke();
      poly(ctx, [[14.6, -1.78], [14.6, 1.78]]); ctx.stroke();               // flat = cathode side
      rrPath(ctx, -15.6, 0, 8.4, 11.4, 0.3); ctx.stroke();                 // J1 outline
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = font(1.7, 600);
      ctx.fillText('R1', -0.92, -10.2);
      ctx.fillText('D1', 12, -4.6);
      ctx.fillText('J1', -15.6, -7.4);
      ctx.font = font(1.9, 600);
      ctx.fillText('+', -12.4, -4.6);
      ctx.fillText('−', -12.4, 4.7);
      ctx.font = font(1.15, 500);
      ctx.fillText('390 Ω', -0.92, -4.3);
      ctx.fillText('9 V LED · v1', 6.5, 12.2);
    });
    afterFonts([texSilk]);
    var mSilk = new THREE.MeshStandardMaterial({ map: texSilk, transparent: true, opacity: 0, roughness: 0.7, depthWrite: false });
    var silkMesh = new THREE.Mesh(topUV(new THREE.PlaneGeometry(PB.w, PB.d).rotateX(-Math.PI / 2), PB.w, PB.d), mSilk);
    silkMesh.renderOrder = 3;
    silkMesh.position.y = PB.t / 2 + 0.07;
    gPcb.add(silkMesh);
    // standoffs (stay on the table) and their screws (ride with the board)
    var mBrass = K.mat.std(0xC9A35A, 0.35, 1);
    var heads = [], hexes = [];
    var mHex = mBrass.clone(); mHex.transparent = true;
    var mHead = fm(K.mat.steel({ roughness: 0.3 }));
    MH.forEach(function (m) {
      var hex = new THREE.Mesh(new THREE.CylinderGeometry(2.75, 2.75, PB.so, 6), mHex);
      hexes.push(hex);
      hex.position.set(PB.x + m[0], PB.so / 2, m[1]);
      hex.castShadow = true;
      v.scene.add(hex);
      var head = new THREE.Mesh(lathe([[0, 0], [2.6, 0], [2.6, 0.6], [2.3, 1.3], [1.4, 1.6], [0, 1.65]], 24), mHead);
      head.position.set(m[0], PB.t / 2 + 0.02, m[1]);
      gPcb.add(head);
      heads.push(head);
    });

    /* ---------- traces: morphing tubes (jumpers → copper) ---------- */
    var NS = 56;
    var mJR = fm(new THREE.MeshStandardMaterial({ color: 0xC0392B, roughness: 0.45 }));
    var mJK = fm(new THREE.MeshStandardMaterial({ color: 0x22252B, roughness: 0.45 }));
    var mStrip = fm(K.mat.tin({ roughness: 0.3 }));
    var tubes = [dynTube(NS, 12, mJR), dynTube(NS, 12, mStrip), dynTube(NS, 12, mJK)];
    tubes.forEach(function (tb) { tb.castShadow = true; gPcb.add(tb); });   // in board space: they flip with the board
    function resample(ctrl, smooth) {
      // arc-length resampling of a polyline (or of a smooth CR curve) into NS+1 points
      var dense = [], k, n = smooth ? 200 : 0;
      if (smooth) { var tmpA = new Float32Array((n + 1) * 3); sampleCR(ctrl, n, tmpA); for (k = 0; k <= n; k++) dense.push([tmpA[k * 3], tmpA[k * 3 + 1], tmpA[k * 3 + 2]]); }
      else dense = ctrl;
      var P = pathOf(dense), out = new Float32Array((NS + 1) * 3), q = [0, 0, 0];
      for (k = 0; k <= NS; k++) { P.at(P.len * k / NS, q); out[k * 3] = q[0]; out[k * 3 + 1] = q[1]; out[k * 3 + 2] = q[2]; }
      return out;
    }
    function arch(a, b, hgt) {
      return [[a[0], a[1] - 1.2, a[2]], [a[0], a[1] + hgt * 0.7, a[2]], [a[0] + (b[0] - a[0]) * 0.5, a[1] + hgt, a[2] + (b[2] - a[2]) * 0.5], [b[0], b[1] + hgt * 0.7, b[2]], [b[0], b[1] - 1.2, b[2]]];
    }
    var A = [
      resample(arch(bbRail(4, RAIL.bPlus), bbHole(9, ROWZ.a), 5.5), true),
      resample([[BB.x + colX(13), BB.h - 1.5, ROWZ.a], [BB.x + colX(13), BB.h - 1.5, ROWZ.e]], false),
      resample(arch(bbHole(14, ROWZ.a), bbRail(17, RAIL.bMinus), 5.5), true)
    ];
    // breadboard poses are converted into the board's rest frame
    var RESTX = PB.x, RESTY = PB.so + PB.t / 2;
    A.forEach(function (arr) { for (var q = 0; q < arr.length; q += 3) { arr[q] -= RESTX; arr[q + 1] -= RESTY; } });
    var B = TR.map(function (pl) { return resample(pl.map(function (p) { return [p[0], PB.t / 2 + 0.06, p[1]]; }), false); });
    var pts = new Float32Array((NS + 1) * 3);
    var cJ = [new THREE.Color(0xC0392B), new THREE.Color(0xC9CCD1), new THREE.Color(0x22252B)];
    var cCu = new THREE.Color(COL.copper), cUnder = new THREE.Color(0x8FD39C), tmpC = new THREE.Color();
    var cGold = new THREE.Color(COL.gold), cFr4 = new THREE.Color(0xCDBB82), cMaskCol = new THREE.Color(COL.mask);
    var tubeMats = [mJR, mStrip, mJK];
    function morph(idx, k, landK, maskK) {
      // k: 0 on the breadboard … 1 lying on the PCB. Lift, fly in an arc, land and flatten.
      var a = A[idx], b = B[idx];
      var lift = EZ.inOut(clamp(k / 0.18, 0, 1)) * 8;
      var f = EZ.inOut(clamp((k - 0.12) / 0.7, 0, 1));
      var land = EZ.inOut(clamp((k - 0.78) / 0.22, 0, 1));
      var hop = Math.sin(Math.PI * f) * 18;
      for (var q = 0; q <= NS; q++) {
        var o = q * 3;
        pts[o] = lerp(a[o], b[o], f);
        pts[o + 2] = lerp(a[o + 2], b[o + 2], f);
        var ya = a[o + 1] + lift, yb = b[o + 1] + 8 * (1 - land);
        pts[o + 1] = lerp(ya, yb, f) + hop;
      }
      var rw = lerp(0.5, 0.5, land), rh = lerp(0.5, 0.045, land);
      if (idx === 1) { rw = lerp(0.55, 0.5, land); rh = lerp(0.15, 0.045, land); }
      tubes[idx].update(pts, rw, rh);
      var m = tubeMats[idx];
      var cuK = clamp((k - 0.45) / 0.4, 0, 1);
      tmpC.copy(cJ[idx]).lerp(cCu, cuK);
      if (maskK > 0) tmpC.lerp(cUnder, maskK);
      m.color.copy(tmpC);
      m.metalness = lerp(idx === 1 ? 1 : 0, 1, cuK) * (1 - 0.85 * maskK);
      m.roughness = lerp(0.45, 0.3, cuK) + 0.15 * maskK;
    }

    /* ---------- components ---------- */
    var mBody = fm(K.mat.ceramic({ roughness: 0.55 }));
    var mLead = fm(K.mat.tin({ roughness: 0.28 }));
    var rMats = { body: mBody, lead: mLead, fade: fadeMats };
    var res = makeResistor(['orange', 'white', 'brown', 'gold'], 10.16, 5.6, rMats);
    v.scene.add(res);
    var mEpoxy = fm(K.mat.epoxy(0xC8301E, { roughness: 0.1, transmission: 0.38, thickness: 3, emissive: 0xFF2A1A, emissiveIntensity: 0 }));
    var mDie = fm(new THREE.MeshStandardMaterial({ color: 0x8A2018, emissive: 0xFF3A20, emissiveIntensity: 0, roughness: 0.4 }));
    var ledMats = { epoxy: mEpoxy, frame: fm(K.mat.steel({ roughness: 0.3 })), die: mDie, gold: K.mat.gold(), lead: mLead };
    var led = makeLED(ledMats, 7.2, 6.4);
    v.scene.add(led);
    var ledGlow = glowSprite(0xFF4A30, 15, 0, false);
    ledGlow.renderOrder = 6;
    led.add(ledGlow); ledGlow.position.set(0, 6.0, 0);
    var ledGlowCore = glowSprite(0xFFD9C8, 4.5, 0, false);
    ledGlowCore.renderOrder = 7;
    led.add(ledGlowCore); ledGlowCore.position.set(0.6, 5.2, 0);
    // positions: breadboard and PCB (the PCB pose is relative to the PCB group)
    var R_BB = new THREE.Vector3(BB.x + (colX(9) + colX(13)) / 2, BB.h + 2.6, ROWZ.d);
    var L_BB = new THREE.Vector3(BB.x + (colX(13) + colX(14)) / 2, BB.h + 2.0, ROWZ.b);
    var R_PCB = new THREE.Vector3((-6 + 4.16) / 2, PB.t / 2 + 1.4, -7);
    var L_PCB = new THREE.Vector3(12, PB.t / 2 + 1.5, 0);

    // J1: 2-pole screw terminal, 5,08 mm pitch, wire entries towards −x
    var gJ1 = new THREE.Group();
    var mJ1 = fm(new THREE.MeshStandardMaterial({ color: 0x2F6FB5, roughness: 0.5 }));
    var mJ1dark = fm(new THREE.MeshStandardMaterial({ color: 0x15171C, roughness: 0.6 }));
    var mScrew = fm(K.mat.steel({ roughness: 0.28 }));
    var jb = new THREE.Mesh(rbox(7.6, 9.6, 10.16, 0.6, 0.3, 2), mJ1);
    jb.castShadow = true;
    gJ1.add(jb);
    [-2.54, 2.54].forEach(function (z) {
      var hole = new THREE.Mesh(new THREE.BoxGeometry(0.3, 3.0, 3.2), mJ1dark);
      hole.position.set(-3.82, 3.0, z);
      gJ1.add(hole);
      var sc = new THREE.Mesh(lathe([[0, 0], [1.55, 0], [1.55, 0.5], [1.35, 0.75], [0, 0.78]], 24), mScrew);
      sc.position.set(0.4, 9.0, z);
      gJ1.add(sc);
      var slot = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.3, 0.42), mJ1dark);
      slot.position.set(0.4, 9.7, z);
      slot.rotation.y = 0.6;
      gJ1.add(slot);
      var pin = new THREE.Mesh(new THREE.BoxGeometry(1.0, 4.4, 1.0), mLead);
      pin.position.set(0, -2.0, z);
      gJ1.add(pin);
    });
    gJ1.position.set(-16, PB.t / 2 + 0.02, 0);
    gPcb.add(gJ1);

    // solder joints on the bottom side: shiny concave cones around each lead
    var mSolder = fm(new THREE.MeshStandardMaterial({ color: 0xD3D6DB, metalness: 1, roughness: 0.12, emissive: 0xFF8A3D, emissiveIntensity: 0 }));
    var coneGeo = lathe([[0, 0], [1.15, 0], [1.1, -0.14], [0.9, -0.42], [0.64, -0.8], [0.46, -1.2], [0.36, -1.45], [0, -1.47]], 28);
    var flashes = [];
    var joints = PADS.map(function (p) {
      var m = new THREE.Mesh(coneGeo, mSolder);
      m.position.set(p.x, -PB.t / 2 - 0.03, p.y);
      m.scale.set(0.001, 0.001, 0.001);
      gPcb.add(m);
      var fl = glowSprite(0xFFB060, 7, 0, true);
      fl.position.set(p.x, -PB.t / 2 - 1.0, p.y);
      fl.renderOrder = 6;
      gPcb.add(fl);
      flashes.push(fl);
      return m;
    });

    /* ---------- 9 V battery with snap (lies along x between the boards, snap towards the breadboard) ---------- */
    var gBat = new THREE.Group();
    gBat.position.set(2, 0, -35);
    gBat.rotation.y = -Math.PI / 2;                 // local +z (terminals) → world −x
    v.scene.add(gBat);
    // printed sleeve on the upper face: 26,5 mm across × 46,5 mm long; text runs along world +x
    var texBat = canvasTex(300, 526, function (ctx, w, h) {
      ctx.fillStyle = '#2B2F36'; ctx.fillRect(0, 0, w, h);
      ctx.save();
      ctx.translate(w / 2, h / 2);
      ctx.rotate(-Math.PI / 2);
      ctx.fillStyle = '#C8693A'; ctx.fillRect(-h / 2, w * 0.2, h, w * 0.07);
      ctx.fillStyle = '#EEF0F3';
      ctx.font = font(118, 600);
      ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
      ctx.fillText('9 V', 30, w * 0.1);
      ctx.font = font(26, 500, true);
      ctx.fillStyle = '#9AA3B2';
      ctx.fillText('ALKALİN PİL', 30, w * 0.42);
      ctx.restore();
    });
    afterFonts([texBat]);
    var mBatSide = new THREE.MeshStandardMaterial({ color: 0x2B2F36, roughness: 0.45 });
    var batBody = new THREE.Mesh(topUV(rbox(26.5, 17.5, 46.5, 2.2, 0.8, 3), 26.5, 46.5), [mBatSide, new THREE.MeshStandardMaterial({ map: texBat, roughness: 0.42 }), mBatSide]);
    batBody.castShadow = true; batBody.receiveShadow = true;
    gBat.add(batBody);
    var batCap = new THREE.Mesh(rbox(26.2, 17.2, 2.2, 2.0, 0.5, 3), K.mat.steel({ roughness: 0.35 }));
    batCap.position.set(0, 0.15, 23.2);
    gBat.add(batCap);
    var snap = new THREE.Mesh(rbox(25, 13, 7, 2.4, 1.0, 3), K.mat.plasticBlack({ roughness: 0.5 }));
    snap.position.set(0, 2.2, 27.6);
    snap.castShadow = true;
    gBat.add(snap);
    var mWR = new THREE.MeshStandardMaterial({ color: 0xC0392B, roughness: 0.45 });
    var mWK = new THREE.MeshStandardMaterial({ color: 0x22252B, roughness: 0.45 });
    var wires = [dynTube(80, 10, mWR), dynTube(80, 10, mWK)];
    wires.forEach(function (w) { w.castShadow = true; v.scene.add(w); });
    // snap exits (world): red on the far side, black on the near side
    var SR = [-29.6, 8.4, -39], SK = [-29.6, 8.4, -31];
    var J1W = function (z, dx) { return [PB.x - 16 - 2.6 + dx, PTOP + 3.0, z]; };
    var hR = bbRail(23, RAIL.bPlus), hK = bbRail(22, RAIL.bMinus);
    var WA = [
      [SR, [-32.5, 6.5, -33], [-35, 4.5, -29], [hR[0] + 0.6, 9.5, hR[2] - 2.5], [hR[0], 12.5, hR[2]], [hR[0], 7.0, hR[2]]],
      [SK, [-32.5, 6.5, -25], [-35.5, 4.5, -22.5], [hK[0] + 0.6, 9.5, hK[2] - 1.5], [hK[0], 12.5, hK[2]], [hK[0], 7.0, hK[2]]]
    ];
    var WB = [
      [SR, [-36.5, 4.0, -30], [-31, 0.8, -15], [8, 0.8, -11], J1W(-2.54, -6), J1W(-2.54, 3)],
      [SK, [-35.5, 4.0, -22], [-27, 0.8, -8], [12, 0.8, -4], J1W(2.54, -6), J1W(2.54, 3)]
    ];
    var wCtrl = [[], []];
    for (i = 0; i < 2; i++) for (j = 0; j < 6; j++) wCtrl[i].push([0, 0, 0]);
    var wPts = new Float32Array(81 * 3);
    function placeWires(k) {
      var f = EZ.inOut(clamp(k, 0, 1)), hop = Math.sin(Math.PI * f) * 5;
      for (var w = 0; w < 2; w++) {
        for (var c = 0; c < 6; c++) {
          for (var q = 0; q < 3; q++) wCtrl[w][c][q] = lerp(WA[w][c][q], WB[w][c][q], f);
          if (c >= 2) wCtrl[w][c][1] += hop * (c === 5 ? 0.6 : c / 5);
        }
        sampleCR(wCtrl[w], 80, wPts);
        wires[w].update(wPts, 0.55, 0.55);
      }
    }

    /* ---------- energy pulses along the PCB traces ---------- */
    var loopPath = pathOf([[-16, -2.54], [-12.5, -2.54], [-8.04, -7.0], [-6, -7], [4.16, -7], [6.5, -7], [10.73, -2.77], [10.73, 0], [13.27, 0], [13.27, 5.0], [10.27, 8.0], [-10.0, 8.0], [-15.46, 2.54], [-16, 2.54]].map(function (p) { return [p[0], 0, p[1]]; }));
    var pulses = [];
    var pulseCores = [];
    for (i = 0; i < 6; i++) {
      var sp = glowSprite(0xF2B550, 5.2, 0, true); sp.renderOrder = 6; pulses.push(sp); gPcb.add(sp);
      var spc = glowSprite(0xFFF4E0, 1.8, 0, false); spc.renderOrder = 7; pulseCores.push(spc); gPcb.add(spc);
    }
    var bbPulsesPath = null;

    /* ---------- labels ---------- */
    var labBB = v.label('breadboard: denemek için', { cls: 'tag', at: [BB.x, 0, BB.d / 2 + 3], dy: 6, valign: 'top' });
    var labPCB = v.label('PCB: kalıcı, küçük, seri üretim', { cls: 'tag', at: [PB.x, 0, PB.d / 2 + 3], dy: 6, valign: 'top' });
    var STEPS = [
      [0.0, 2.2, 'Breadboard: devre çalışıyor, ama kablolar ve parçalar yalnızca takılı'],
      [2.2, 4.6, '1 · Kablolar ve tahtanın içindeki metal şeritler, kartta bakır yollara dönüşür'],
      [4.6, 5.9, '2 · Yeşil lehim maskesi bakırı örter; pedler açıkta kalır, yazılar basılır'],
      [5.9, 7.7, '3 · Parçalar deliklerine yerleşir'],
      [7.7, 10.9, '4 · Kart ters çevrilir, bacaklar alttan lehimlenir'],
      [10.9, 12.3, '5 · Pil kabloları vidalı klemense bağlanır'],
      [12.3, 14.3, 'Devre artık kalıcı: akım bakır yollardan akar, LED yanar']
    ];

    /* ---------- timeline ---------- */
    var u = 0, lastU = 0;
    function reset() { u = 0; lastU = 0; v.setView(VIEW); }
    var tmpV = new THREE.Vector3();
    function setFade(a) { for (var q = 0; q < fadeMats.length; q++) fadeMats[q].opacity = a; }

    function apply(uu, tt) {
      var k, a;
      // reset crossfade at the end of the loop
      var fadeOut = span(uu, 14.2, 14.6), fadeIn = span(uu, 14.6, 15.0);
      var backToBB = uu >= 14.6;
      // jumpers → traces
      var kJ = backToBB ? 0 : span(uu, 2.2, 4.6);
      var maskK = backToBB ? 0 : EZ.inOut(span(uu, 4.6, 5.6));
      for (k = 0; k < 3; k++) morph(k, k === 1 ? span(uu, 2.6, 4.6) * (backToBB ? 0 : 1) : kJ, 0, maskK);
      stripGlow.material.opacity = backToBB ? 0 : 0.9 * Math.sin(Math.PI * span(uu, 2.3, 3.4));
      // mask, pad finish, silkscreen
      var dropY = (1 - maskK) * 14;
      maskMesh.position.y = PB.t / 2 + 0.11 + dropY;
      mMask.opacity = (backToBB ? 0 : 0.82 * Math.min(1, maskK * 1.6)) * (1 - fadeOut);
      var finishK = backToBB ? 1 - fadeIn : maskK;
      mPad.color.copy(cCu).lerp(cGold, finishK);
      mFr4Bot.color.copy(cFr4).lerp(cMaskCol, finishK);
      mSilk.opacity = (backToBB ? 0 : span(uu, 5.2, 5.9)) * (1 - fadeOut);
      // components: breadboard → PCB (with an arc), J1 drops in
      var kc = backToBB ? 0 : EZ.inOut(span(uu, 5.9, 7.5));
      var hop = Math.sin(Math.PI * kc) * 30;
      gPcb.updateMatrixWorld();
      tmpV.copy(R_PCB); gPcb.localToWorld(tmpV);
      res.position.lerpVectors(R_BB, tmpV, kc); res.position.y += hop;
      tmpV.copy(L_PCB); gPcb.localToWorld(tmpV);
      led.position.lerpVectors(L_BB, tmpV, kc); led.position.y += hop;
      var jk = backToBB ? 0 : EZ.out(span(uu, 6.4, 7.5));
      gJ1.position.y = PB.t / 2 + 0.02 + (1 - jk) * 24;
      gJ1.visible = jk > 0.001 && fadeOut < 1;
      // flip for soldering (board, components ride along)
      var up = EZ.inOut(span(uu, 7.7, 8.5)) * (1 - EZ.inOut(span(uu, 10.1, 10.9)));
      var flip = EZ.inOut(span(uu, 8.0, 8.9)) * (1 - EZ.inOut(span(uu, 9.9, 10.8)));
      gPcb.position.set(PB.x, PB.so + PB.t / 2 + up * 24, up * 16);
      // the loose standoffs fade while the board is lifted away from them
      var hexA = 1 - clamp(up * 1.6, 0, 1);
      for (k = 0; k < hexes.length; k++) { hexes[k].visible = hexA > 0.02; mHex.opacity = hexA; }
      gPcb.rotation.x = flip * Math.PI * 1.16;      // a little past flat: the solder side faces the viewer
      // components follow the board while it is up
      if (uu > 7.5 && !backToBB) {
        gPcb.updateMatrixWorld();
        res.position.copy(R_PCB); gPcb.localToWorld(res.position);
        led.position.copy(L_PCB); gPcb.localToWorld(led.position);
        res.quaternion.copy(gPcb.quaternion); led.quaternion.copy(gPcb.quaternion);
      } else { res.quaternion.identity(); led.quaternion.identity(); }
      // solder cones grow, glowing as molten metal, then cool
      for (k = 0; k < joints.length; k++) {
        var t0 = 8.95 + k * 0.17;
        var g = backToBB ? 0 : EZ.out(span(uu, t0, t0 + 0.45));
        joints[k].scale.set(Math.max(0.001, g), Math.max(0.001, g), Math.max(0.001, g));
        flashes[k].material.opacity = backToBB ? 0 : 0.85 * Math.sin(Math.PI * span(uu, t0, t0 + 0.7));
      }
      mSolder.emissiveIntensity = 0.9 * (1 - span(uu, 9.4, 10.6)) * (uu > 8.9 ? 1 : 0);
      // battery wires: breadboard rails → J1, and back for the next round
      var wk = uu < 10.9 ? 0 : uu < 14.0 ? span(uu, 10.9, 12.2) : 1 - span(uu, 14.0, 15.0);
      placeWires(wk);
      // the board is screwed to its standoffs after soldering
      var hk = uu >= 10.9 && uu < 14.6 ? EZ.out(span(uu, 10.9, 11.4)) : 0;
      for (k = 0; k < heads.length; k++) { heads[k].visible = hk > 0.001; heads[k].position.y = PB.t / 2 + 0.02 + (1 - hk) * 7; }
      // LEDs: breadboard circuit lit until the jumpers lift; PCB circuit lit after J1 is connected
      var litBB = uu < 2.35 ? clamp(uu / 0.25, 0, 1) : 0;
      var litPCB = uu > 12.15 && uu < 14.0 ? clamp((uu - 12.15) * 4, 0, 1) * clamp((14.0 - uu) * 6, 0, 1) : 0;
      var lit = Math.max(litBB, litPCB);
      mDie.emissiveIntensity = 3.0 * lit;
      mEpoxy.emissiveIntensity = 0.55 * lit;
      ledGlow.material.opacity = 0.62 * lit;
      ledGlowCore.material.opacity = 0.7 * lit;
      // energy pulses along the copper (seen through the mask)
      for (k = 0; k < pulses.length; k++) {
        var pu = (tt * 0.42 + k / pulses.length) % 1;
        loopPath.at(pu * loopPath.len, tmpA3);
        pulses[k].position.set(tmpA3[0], PB.t / 2 + 0.35, tmpA3[2]);
        pulses[k].material.opacity = litPCB * 0.9;
        pulseCores[k].position.copy(pulses[k].position);
        pulseCores[k].material.opacity = litPCB * 0.9;
      }
      // fade for the loop reset
      setFade(backToBB ? fadeIn : 1 - fadeOut);
      labBB.show(uu < 4.0 || uu > 14.6);
      labPCB.show(uu > 12.2 && uu < 14.3);
      return uu;
    }
    var tmpA3 = [0, 0, 0];

    reset();
    return {
      reset: reset,
      frame: function (t, dt) {
        var rm = K.reducedMotion;
        u = rm ? 13.2 : sceneU(t);
        // a gentle dolly to the board while it is soldered (unless the teacher is steering the view)
        if (!rm && v.orbit.idle > 4) {
          if (lastU < 7.6 && u >= 7.6) v.animateTo(CLOSE, 1.3);
          if (lastU < 10.8 && u >= 10.8) v.animateTo(VIEW, 1.5);
        }
        if (u < lastU) v.setView(VIEW);
        lastU = u;
        apply(u, t);
        v.render(dt);
        if (!K.skipRender) {
          var c = v.ctx, st = null;
          for (var q = 0; q < STEPS.length; q++) if (u >= STEPS[q][0] && u < STEPS[q][1]) st = STEPS[q];
          if (st) {
            var a = Math.min(span(u, st[0], st[0] + 0.35), 1 - span(u, st[1] - 0.3, st[1]));
            K.label(c, st[2], v.w / 2, 26, { size: 15, weight: 500, color: dark ? '#EEF0F3' : '#15171C', align: 'center', alpha: a });
          }
        }
      }
    };
  });

  /* =====================================================================
   * Spotlight: veil over the scene except one part, copper corner marks,
   * and leader lines drawn after the veil (shared by the tour visuals)
   * ===================================================================== */
  function spotlight(v, dark) {
    var THREE = TH();
    var rect = { x0: 0, y0: 0, x1: 0, y1: 0, a: 0 };
    var cv = new THREE.Vector3();
    return {
      rect: rect,
      /* pts: array of world Vector3 that bound the part (or null) */
      update: function (dt, pts, on) {
        var tgt = null;
        if (pts && pts.length) {
          var x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
          for (var i = 0; i < pts.length; i++) {
            var s = v.project(pts[i]);
            x0 = Math.min(x0, s.x); y0 = Math.min(y0, s.y); x1 = Math.max(x1, s.x); y1 = Math.max(y1, s.y);
          }
          tgt = [x0 - 12, y0 - 12, x1 + 12, y1 + 12];
        }
        if (tgt) {
          var kk = rect.a < 0.05 ? 1 : Math.min(1, dt * 7);
          rect.x0 += (tgt[0] - rect.x0) * kk; rect.y0 += (tgt[1] - rect.y0) * kk;
          rect.x1 += (tgt[2] - rect.x1) * kk; rect.y1 += (tgt[3] - rect.y1) * kk;
        }
        rect.a += ((on && tgt ? 1 : 0) - rect.a) * Math.min(1, dt * 5);
      },
      draw: function () {
        if (rect.a <= 0.01) return;
        var c = v.ctx, W = v.w, H = v.h;
        var rx = Math.max(-20, rect.x0), ry = Math.max(-20, rect.y0), rw = Math.min(W + 20, rect.x1) - rx, rh = Math.min(H + 20, rect.y1) - ry;
        c.save();
        c.globalAlpha = 0.4 * rect.a;
        c.fillStyle = dark ? '#0E121A' : '#F5F5F1';
        c.beginPath(); c.rect(0, 0, W, H); rrSub(c, rx, ry, rw, rh, 12); c.fill('evenodd');
        c.globalAlpha = rect.a;
        c.strokeStyle = dark ? '#E39A6C' : '#A64B22';
        c.lineWidth = 1.6; c.lineCap = 'round';
        var L = Math.min(18, rw / 4, rh / 4);
        c.beginPath();
        c.moveTo(rx, ry + L); c.lineTo(rx, ry); c.lineTo(rx + L, ry);
        c.moveTo(rx + rw - L, ry); c.lineTo(rx + rw, ry); c.lineTo(rx + rw, ry + L);
        c.moveTo(rx + rw, ry + rh - L); c.lineTo(rx + rw, ry + rh); c.lineTo(rx + rw - L, ry + rh);
        c.moveTo(rx + L, ry + rh); c.lineTo(rx, ry + rh); c.lineTo(rx, ry + rh - L);
        c.stroke();
        c.restore();
      },
      leaders: function (list) {
        var c = v.ctx;
        c.save();
        c.strokeStyle = c.fillStyle = dark ? 'rgba(154,163,178,.85)' : 'rgba(89,94,105,.85)';
        c.lineWidth = 1;
        for (var i = 0; i < list.length; i++) {
          var ld = list[i];
          if (!ld.L.visible) continue;
          var at = typeof ld.at === 'function' ? ld.at() : ld.at;
          var P = v.project(at);
          if (!P.visible) continue;
          c.beginPath(); c.moveTo(P.x, P.y); c.lineTo(P.x + ld.L.dx, P.y + ld.L.dy); c.stroke();
          c.beginPath(); c.arc(P.x, P.y, 2, 0, Math.PI * 2); c.fill();
        }
        c.restore();
      }
    };
  }

  /* Rounded-rectangle panel standing in the XY plane, thickness along +z.
   * Groups: 0 back (z = 0), 1 front (z = t), 2 sides. UVs: u = x/W + ½, v = y/H + ½. */
  function panel(w, h, t, r, bevel, holes) {
    var THREE = TH();
    var s = new THREE.Shape();
    var x0 = -w / 2, x1 = w / 2, y0 = -h / 2, y1 = h / 2;
    r = Math.min(r, w / 2 - 0.01, h / 2 - 0.01);
    s.moveTo(x0 + r, y0); s.lineTo(x1 - r, y0); s.absarc(x1 - r, y0 + r, r, -Math.PI / 2, 0, false);
    s.lineTo(x1, y1 - r); s.absarc(x1 - r, y1 - r, r, 0, Math.PI / 2, false);
    s.lineTo(x0 + r, y1); s.absarc(x0 + r, y1 - r, r, Math.PI / 2, Math.PI, false);
    s.lineTo(x0, y0 + r); s.absarc(x0 + r, y0 + r, r, Math.PI, Math.PI * 1.5, false);
    if (holes) holes.forEach(function (hp) { s.holes.push(hp); });
    var b = bevel || 0;
    var g = new THREE.ExtrudeGeometry(s, { depth: Math.max(0.001, t - 2 * b), bevelEnabled: b > 0, bevelThickness: b, bevelSize: b, bevelSegments: 3, curveSegments: 18, steps: 1 });
    g.translate(0, 0, b);
    var gr = g.groups;
    if (gr.length >= 2) {
      var caps = gr[0], sides = gr[1], half = caps.count / 2;
      g.clearGroups();
      g.addGroup(caps.start, half, 0); g.addGroup(caps.start + half, half, 1); g.addGroup(sides.start, sides.count, 2);
    }
    var p = g.attributes.position, uv = g.attributes.uv;
    for (var i = 0; i < p.count; i++) uv.setXY(i, p.getX(i) / w + 0.5, p.getY(i) / h + 0.5);
    uv.needsUpdate = true;
    return g;
  }

  /* =====================================================================
   * sensors-phone · S 680×520 · light
   * ===================================================================== */
  K.register('sensors-phone', function (el, opts) {
    var THREE = TH();
    opts = opts || {};
    var dark = opts.theme === 'dark';
    var TEXT = {
      kamera: 'Kamera: ışık → elektrik (her pikselde)',
      mikrofon: 'Mikrofon: ses basıncı → elektrik',
      ivme: 'İvmeölçer: hızlanma ve yer çekimi → elektrik',
      isik: 'Işık sensörü: ortam ışığı → elektrik → ekran parlaklığı',
      yakinlik: 'Yakınlık sensörü: yansıyan kızılötesi → elektrik → ekran kapanır',
      dokunmatik: 'Dokunmatik: parmak elektrik alanını değiştirir → konum',
      gps: 'GPS: uydu sinyallerinin varış süreleri → konum'
    };
    var ORDER = ['kamera', 'mikrofon', 'ivme', 'isik', 'yakinlik', 'dokunmatik', 'gps'];
    var HOME = { yaw: 0.5, pitch: 0.12, distance: 470, target: [6, 2, 0] };
    var v = K.stage3d(el, {
      theme: opts.theme, fov: 26, near: 2, far: 5000, yaw: HOME.yaw, pitch: HOME.pitch, distance: HOME.distance,
      target: HOME.target, size: 110, ground: -86, minDistance: 90, maxDistance: 900, minPitch: -0.6, maxPitch: 1.2
    });
    if (!v.ready) return { reset: function () {}, frame: function (t, dt) { v.render(dt); }, read: function (k) { return k === 'sensor' ? TEXT.kamera : ''; } };
    tuneLights(v, { key: 0.85, fill: 0.95, rim: 1.0, hemi: 0.85, shadowBias: 0.08, shadow: 0.1, exposure: 0.95 });
    var i, j;
    var W = 71.5, H = 147, R = 10.5;
    var phone = new THREE.Group();
    v.scene.add(phone);
    var Lyr = {};
    // exploded as a diagonal fan: every layer keeps a clear, readable face
    function layer(name, off) { var g = new THREE.Group(); g.position.set(off[0], off[1], off[2]); phone.add(g); Lyr[name] = g; return g; }
    var gBack = layer('back', [63, 15, -66]), gBat = layer('battery', [42, 10, -44]), gBoard = layer('board', [21, 5, -22]),
      gFrame = layer('frame', [0, 0, 0]), gDisp = layer('display', [-21, -5, 22]), gTouch = layer('touch', [-42, -10, 44]), gGlass = layer('glass', [-63, -15, 66]);
    // the front stack slides aside when a part on the main board is shown
    var FRONT = [gDisp, gTouch, gGlass, gFrame];
    FRONT.forEach(function (g) { g.userData.base = g.position.clone(); });
    var aside = 0;

    /* ---------- textures ---------- */
    var texWall = canvasTex(512, 1024, function (ctx, w, h) {
      var g = ctx.createLinearGradient(0, 0, w * 0.4, h);
      g.addColorStop(0, '#2A3F7A'); g.addColorStop(0.55, '#3E6C8F'); g.addColorStop(1, '#D59A6A');
      ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
      var r = ctx.createRadialGradient(w * 0.7, h * 0.72, 10, w * 0.7, h * 0.72, w * 0.7);
      r.addColorStop(0, 'rgba(255,214,160,0.55)'); r.addColorStop(1, 'rgba(255,214,160,0)');
      ctx.fillStyle = r; ctx.fillRect(0, 0, w, h);
      // gentle hills
      ctx.fillStyle = 'rgba(20,30,50,0.35)';
      ctx.beginPath(); ctx.moveTo(0, h * 0.8);
      for (var x = 0; x <= w; x += 8) ctx.lineTo(x, h * 0.8 - Math.sin(x / w * 5.2) * 26 - x / w * 30);
      ctx.lineTo(w, h); ctx.lineTo(0, h); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.88)';
      ctx.font = font(78, 500); ctx.textAlign = 'center';
      ctx.fillText('14:05', w / 2, h * 0.2);
      ctx.font = font(24, 400);
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      ctx.fillText('Salı, 27 Ekim', w / 2, h * 0.245);
      // punch-hole camera
      ctx.fillStyle = '#05070A';
      ctx.beginPath(); ctx.arc(w / 2, h * 0.035, 13, 0, Math.PI * 2); ctx.fill();
    });
    var texTouch = canvasTex(256, 512, function (ctx, w, h) {
      ctx.clearRect(0, 0, w, h);
      ctx.strokeStyle = 'rgba(90,120,210,0.55)';
      ctx.lineWidth = 1.4;
      for (var x = 8; x < w; x += 16) { ctx.beginPath(); ctx.moveTo(x, 4); ctx.lineTo(x, h - 4); ctx.stroke(); }
      ctx.strokeStyle = 'rgba(200,120,80,0.45)';
      for (var y = 8; y < h; y += 16) { ctx.beginPath(); ctx.moveTo(4, y); ctx.lineTo(w - 4, y); ctx.stroke(); }
    });
    var texBorder = canvasTex(256, 512, function (ctx, w, h) {
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = '#0A0C10';
      ctx.beginPath(); rrSub(ctx, 0, 0, w, h, 36); rrSub(ctx, 6, 6, w - 12, h - 12, 30); ctx.fill('evenodd');
      ctx.fillStyle = 'rgba(10,12,16,0.9)';
      K.rr(ctx, w / 2 - 22, 9, 44, 4, 2); ctx.fill();                       // earpiece slot
    });
    var texBat = canvasTex(256, 330, function (ctx, w, h) {
      ctx.fillStyle = '#C9CCD1'; ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#20232A'; K.rr(ctx, 14, 40, w - 28, h - 70, 10); ctx.fill();
      ctx.fillStyle = '#EEF0F3'; ctx.textAlign = 'center';
      ctx.font = font(24, 600); ctx.fillText('Li-ion pil', w / 2, 100);
      ctx.font = font(19, 500, true);
      ctx.fillText('3,85 V', w / 2, 150); ctx.fillText('5.000 mAh', w / 2, 180); ctx.fillText('19,3 Wh', w / 2, 210);
    });
    var texBoard = canvasTex(256, 200, function (ctx, w, h) {
      ctx.fillStyle = '#16301F'; ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = 'rgba(120,170,120,0.35)'; ctx.lineWidth = 1.2;
      var rnd = K.rng(5);
      for (var k = 0; k < 40; k++) { var y = rnd() * h; ctx.beginPath(); ctx.moveTo(rnd() * w, y); ctx.lineTo(rnd() * w, y); ctx.lineTo(rnd() * w, y + (rnd() - 0.5) * 30); ctx.stroke(); }
    });
    afterFonts([texWall, texBat]);

    /* ---------- back (glass) with the camera island ---------- */
    var mBackGlass = new THREE.MeshPhysicalMaterial({ color: 0x4A5263, roughness: 0.42, clearcoat: 0.6, clearcoatRoughness: 0.3, envMapIntensity: 0.6 });
    var back = new THREE.Mesh(panel(W, H, 0.9, R, 0.25), mBackGlass);
    back.castShadow = true;
    gBack.add(back);
    var CAMX = 18, CAMY = 52;
    var island = new THREE.Mesh(panel(30, 30, 1.4, 7, 0.4), new THREE.MeshPhysicalMaterial({ color: 0x3E4554, roughness: 0.2, clearcoat: 1, clearcoatRoughness: 0.15 }));
    island.position.set(CAMX, CAMY, -1.4);
    gBack.add(island);
    var mLensRing = K.mat.steel({ roughness: 0.25 });
    var mLensGlass = new THREE.MeshPhysicalMaterial({ color: 0x0B0E14, roughness: 0.05, metalness: 0.2, clearcoat: 1, envMapIntensity: 1.2 });
    [[CAMX - 6.5, CAMY + 6.5], [CAMX - 6.5, CAMY - 6.5]].forEach(function (p) {
      var ring = new THREE.Mesh(new THREE.CylinderGeometry(5.0, 5.2, 1.6, 40).rotateX(Math.PI / 2), mLensRing);
      ring.position.set(p[0], p[1], -2.0);
      gBack.add(ring);
      var lens = new THREE.Mesh(new THREE.CircleGeometry(4.1, 40).rotateY(Math.PI), mLensGlass);
      lens.position.set(p[0], p[1], -2.85);
      gBack.add(lens);
    });
    var flash = new THREE.Mesh(new THREE.CircleGeometry(2.2, 24).rotateY(Math.PI), new THREE.MeshStandardMaterial({ color: 0xF2E7C8, roughness: 0.3 }));
    flash.position.set(CAMX + 7, CAMY + 7, -1.45);
    gBack.add(flash);

    /* ---------- battery (pouch) ---------- */
    var bat = new THREE.Mesh(panel(60, 78, 4.0, 3, 0.8), [new THREE.MeshStandardMaterial({ color: 0xC9CCD1, roughness: 0.35, metalness: 0.4 }), new THREE.MeshStandardMaterial({ map: texBat, roughness: 0.4, metalness: 0.2 }), new THREE.MeshStandardMaterial({ color: 0xBFC3C9, roughness: 0.4, metalness: 0.4 })]);
    bat.position.set(0, -24, 0);
    bat.castShadow = true;
    gBat.add(bat);

    /* ---------- main board (top) and bottom sub-board ---------- */
    var mPCB = [new THREE.MeshStandardMaterial({ color: 0x14281B, roughness: 0.5 }), new THREE.MeshStandardMaterial({ map: texBoard, roughness: 0.45 }), new THREE.MeshStandardMaterial({ color: 0x1D3524, roughness: 0.6 })];
    var board = new THREE.Mesh(panel(60, 44, 0.8, 3, 0.1), mPCB);
    board.position.set(0, 46, 0);
    gBoard.add(board);
    var sub = new THREE.Mesh(panel(56, 13, 0.8, 2.5, 0.1), mPCB);
    sub.position.set(0, -64, 0);
    gBoard.add(sub);
    var mChip = new THREE.MeshStandardMaterial({ color: 0x1B1D22, roughness: 0.55 });
    var mCan = K.mat.steel({ roughness: 0.3 });
    function boxAt(w, h, d, x, y, z, m, parent) {
      var b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
      b.position.set(x, y, z);
      (parent || gBoard).add(b);
      return b;
    }
    var soc = boxAt(22, 18, 1.6, -4, 48, 1.6, mCan);                    // shield over SoC + RAM
    boxAt(9, 6, 1.0, 17, 60, 1.3, mChip);                                 // flash
    var imu = boxAt(3.2, 2.6, 1.0, -21, 36, 1.3, mChip);                 // accelerometer (IMU)
    var gnss = boxAt(4.0, 4.0, 1.0, 16, 34, 1.3, mChip);                 // GPS receiver
    boxAt(8, 3, 1.4, -20, 60, 1.5, mChip);                               // board-to-board connector
    boxAt(10, 3, 1.4, 6, 30, 1.5, mChip);
    var camMod = new THREE.Group();                                      // rear camera module (on the back side of the board)
    camMod.position.set(CAMX - 6.5, CAMY, -2.6);
    gBoard.add(camMod);
    boxAt(9.5, 22, 4.6, 0, 0, 0, new THREE.MeshStandardMaterial({ color: 0x23262D, roughness: 0.5 }), camMod);
    [6.5, -6.5].forEach(function (yy) {
      var lb = new THREE.Mesh(new THREE.CylinderGeometry(3.2, 3.2, 1.2, 32).rotateX(Math.PI / 2), mChip);
      lb.position.set(0, yy, -2.8);
      camMod.add(lb);
    });
    var usb = new THREE.Mesh(rbox(9, 3.2, 7.4, 1.5, 0.5, 3), mCan);
    usb.rotation.x = Math.PI / 2;
    usb.position.set(0, -67, 1.0);
    gBoard.add(usb);
    var mic = boxAt(3.5, 2.6, 1.0, -14, -66, 1.3, mCan);                // MEMS microphone (metal lid)

    /* ---------- frame (aluminium band with buttons and openings) ---------- */
    var mAlu = K.mat.aluminium({ roughness: 0.3 });
    var inner = new THREE.Path();
    (function () {
      var w = W - 4.4, h = H - 4.4, r = R - 2, x0 = -w / 2, x1 = w / 2, y0 = -h / 2, y1 = h / 2;
      inner.moveTo(x0 + r, y0); inner.lineTo(x1 - r, y0); inner.absarc(x1 - r, y0 + r, r, -Math.PI / 2, 0, false);
      inner.lineTo(x1, y1 - r); inner.absarc(x1 - r, y1 - r, r, 0, Math.PI / 2, false);
      inner.lineTo(x0 + r, y1); inner.absarc(x0 + r, y1 - r, r, Math.PI / 2, Math.PI, false);
      inner.lineTo(x0, y0 + r); inner.absarc(x0 + r, y0 + r, r, Math.PI, Math.PI * 1.5, false);
    })();
    var frame = new THREE.Mesh(panel(W, H, 7.8, R, 0.6, [inner]), mAlu);
    frame.castShadow = true;
    gFrame.add(frame);
    [[-W / 2 - 0.4, 34, 9], [-W / 2 - 0.4, 22, 9], [W / 2 + 0.4, 28, 14]].forEach(function (b) {
      var btn = new THREE.Mesh(rbox(1.2, 6, b[2], 0.5, 0.3, 2), mAlu);
      btn.rotation.x = Math.PI / 2;
      btn.position.set(b[0], b[1] + b[2] / 2, 3.9 + 3);
      gFrame.add(btn);
    });
    var mDark = new THREE.MeshStandardMaterial({ color: 0x0B0D11, roughness: 0.7 });
    var port = new THREE.Mesh(new THREE.BoxGeometry(9, 0.6, 3.4), mDark);
    port.position.set(0, -H / 2 + 0.1, 3.9);
    gFrame.add(port);
    for (i = 0; i < 6; i++) { var hole = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 0.6, 12), mDark); hole.position.set(10 + i * 2.2, -H / 2 + 0.1, 3.9); gFrame.add(hole); }
    var micHole = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.6, 12), mDark);
    micHole.position.set(-14, -H / 2 + 0.1, 3.9);
    gFrame.add(micHole);

    /* ---------- display (OLED) with the light / proximity module above it ---------- */
    var mScreen = new THREE.MeshStandardMaterial({ color: 0x07090C, roughness: 0.2, metalness: 0.1, emissiveMap: texWall, emissive: 0xffffff, emissiveIntensity: 1.0 });
    var disp = new THREE.Mesh(panel(W - 3, H - 3, 0.9, R - 1.5, 0.15), [new THREE.MeshStandardMaterial({ color: 0x15171C, roughness: 0.6 }), mScreen, new THREE.MeshStandardMaterial({ color: 0x22252B, roughness: 0.5 })]);
    gDisp.add(disp);
    var sensMod = new THREE.Group();
    sensMod.position.set(13, H / 2 - 5.2, 1.1);
    gDisp.add(sensMod);
    boxAt(9, 2.6, 1.0, 0, 0, 0, mChip, sensMod);
    var irLed = new THREE.Mesh(new THREE.CircleGeometry(0.55, 16), new THREE.MeshStandardMaterial({ color: 0x3A1B1B, roughness: 0.3, emissive: 0xB0202A, emissiveIntensity: 0 }));
    irLed.position.set(-2.6, 0, 0.52); sensMod.add(irLed);
    var irRx = new THREE.Mesh(new THREE.CircleGeometry(0.55, 16), new THREE.MeshStandardMaterial({ color: 0x2A2E3A, roughness: 0.2 }));
    irRx.position.set(0.2, 0, 0.52); sensMod.add(irRx);
    var als = new THREE.Mesh(new THREE.CircleGeometry(0.55, 16), new THREE.MeshStandardMaterial({ color: 0x9AA4B8, roughness: 0.2, emissive: 0xF2C46B, emissiveIntensity: 0 }));
    als.position.set(3.0, 0, 0.52); sensMod.add(als);

    /* ---------- touch layer and cover glass ---------- */
    var mTouch = new THREE.MeshBasicMaterial({ map: texTouch, transparent: true, opacity: 0.85, depthWrite: false, side: THREE.DoubleSide });
    var touch = new THREE.Mesh(panel(W - 3.5, H - 3.5, 0.12, R - 1.8, 0), mTouch);
    touch.renderOrder = 2;
    gTouch.add(touch);
    var mFilm = new THREE.MeshBasicMaterial({ color: 0xBCC8E6, transparent: true, opacity: 0.12, depthWrite: false, side: THREE.DoubleSide });
    var film = new THREE.Mesh(panel(W - 3.5, H - 3.5, 0.1, R - 1.8, 0), mFilm);
    film.renderOrder = 1;
    gTouch.add(film);
    var mGlass = new THREE.MeshPhysicalMaterial({ color: 0xE4EEF5, roughness: 0.04, metalness: 0, transparent: true, opacity: 0.16, envMapIntensity: 0.7, depthWrite: false });
    var mGlassEdge = new THREE.MeshPhysicalMaterial({ color: 0xBFD3E0, roughness: 0.1, metalness: 0, transparent: true, opacity: 0.75, envMapIntensity: 1.0, depthWrite: false });
    var glass = new THREE.Mesh(panel(W, H, 0.8, R, 0.3), [mGlass, mGlass, mGlassEdge]);
    glass.renderOrder = 4;
    gGlass.add(glass);
    var border = new THREE.Mesh(panel(W - 0.2, H - 0.2, 0.05, R, 0), new THREE.MeshBasicMaterial({ map: texBorder, alphaTest: 0.5 }));
    border.position.z = -0.02;
    border.renderOrder = 3;
    gGlass.add(border);

    /* ---------- layer labels (overview) ---------- */
    var leaders = [];
    function lab(text, o, atFn) {
      var want = !!o.line; o.line = false;
      var L = v.label(text, o);
      if (want) leaders.push({ L: L, at: atFn || new THREE.Vector3().fromArray(o.at) });
      return L;
    }
    function onLayer(g, x, y, z) { var p = new THREE.Vector3(); return function () { p.set(x, y, z); g.localToWorld(p); return p; }; }
    var LAY = [
      ['ön cam', gGlass, 0], ['dokunmatik katman', gTouch, 1], ['ekran (OLED)', gDisp, 0], ['çerçeve', gFrame, 1],
      ['ana kart', gBoard, 0], ['pil', gBat, 1], ['arka kapak', gBack, 0]
    ];
    var layLabels = LAY.map(function (d) {
      var top = d[2] === 0;
      var yA = top ? (d[1] === gBoard ? 68 : d[1] === gBat ? 15 : H / 2) : (d[1] === gBat ? -63 : d[1] === gBoard ? 24 : -H / 2);
      var f = onLayer(d[1], 0, yA, 0.5);
      var L = lab(d[0], { cls: 'note', align: 'center', valign: top ? 'bottom' : 'top', line: true, dx: 0, dy: top ? -18 : 18 }, f);
      L.at = f;
      return L;
    });

    /* ---------- sensor parts: bounds, views and labels ---------- */
    function ptsOf(g, b) {
      var pts = [];
      for (var c = 0; c < 8; c++) pts.push(new THREE.Vector3());
      return function () {
        for (var c = 0; c < 8; c++) { pts[c].set(c & 1 ? b[3] : b[0], c & 2 ? b[4] : b[1], c & 4 ? b[5] : b[2]); g.localToWorld(pts[c]); }
        return pts;
      };
    }
    var PART = {
      kamera: { g: gBack, b: [CAMX - 15, CAMY - 15, -3.2, CAMX + 15, CAMY + 15, 0.9], view: { yaw: Math.PI + 0.42, pitch: 0.14, distance: 420 }, off: [-44, -38, 0],
        name: 'arka kamera', anchor: [CAMX + 15, CAMY + 15, -1.4], dx: 60, dy: -46 },
      mikrofon: { g: gBoard, b: [-17, -68, 0, -11, -63.5, 2], view: { yaw: 0.42, pitch: -0.34, distance: 470 }, off: [-4, 36, 6],
        name: 'mikrofon', anchor: [-14, -66, 1.8], dx: 70, dy: 56 },
      ivme: { g: gBoard, b: [-23, 34.5, 0, -19, 37.5, 2], view: { yaw: 0.36, pitch: 0.12, distance: 480 }, off: [-54, -10, 10],
        name: 'ivmeölçer çipi', anchor: [-21, 37.3, 1.8], dx: 56, dy: -64 },
      isik: { g: gDisp, b: [16, H / 2 - 7, 0.5, 18, H / 2 - 3.5, 2], view: { yaw: 0.42, pitch: 0.3, distance: 400 }, off: [-4, 2, 8],
        name: 'ışık sensörü', anchor: [16, H / 2 - 5.2, 1.6], dx: 40, dy: 70 },
      yakinlik: { g: gDisp, b: [8.5, H / 2 - 7, 0.5, 14, H / 2 - 3.5, 2], view: { yaw: 1.0, pitch: 0.14, distance: 400 }, off: [-34, -10, 40],
        name: 'yakınlık sensörü', anchor: [10.4, H / 2 - 5.2, 1.6], dx: -70, dy: -66 },
      dokunmatik: { g: gTouch, b: [-W / 2 + 2, -H / 2 + 2, 0, W / 2 - 2, H / 2 - 2, 0.2], view: { yaw: 0.62, pitch: 0.14, distance: 440 }, off: [0, 4, 14], viewAt: [10, -14, 0],
        name: 'dokunmatik katman', anchor: [-W / 2 + 6, H / 2 - 16, 0.1], dx: -50, dy: -40 },
      gps: { g: gBoard, b: [14, 32, 0, 18, 36, 2], view: { yaw: 0.6, pitch: 0.36, distance: 800 }, off: [-30, 14, 10],
        name: 'GPS alıcısı', anchor: [16, 36, 1.8], dx: 80, dy: -46 }
    };
    ORDER.forEach(function (k) {
      var P = PART[k];
      P.pts = ptsOf(P.g, P.b);
      var aFn = onLayer(P.g, P.anchor[0], P.anchor[1], P.anchor[2]);
      P.label = lab(P.name, { cls: 'name', align: 'center', valign: P.dy < 0 ? 'bottom' : 'top', line: true, dx: P.dx, dy: P.dy }, aFn);
      P.label.at = aFn;
      P.label.show(false);
    });

    /* ---------- principle props ---------- */
    var props = new THREE.Group();
    v.scene.add(props);
    // camera: light rays into the lens and a magnified Bayer pixel grid
    var gCam = new THREE.Group(); props.add(gCam);
    var rayMat = new THREE.MeshBasicMaterial({ color: 0xE8C27A, transparent: true, opacity: 0, depthWrite: false });
    var rays = [], photons = [], rayFrom = [];
    var PHC = [0xFFF1D6, 0xE0533F, 0x5FB46A, 0x4F74D9, 0xFFF1D6];
    for (i = 0; i < 5; i++) {
      var ry = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 1, 6, 1, true), rayMat); gCam.add(ry); rays.push(ry);
      rayFrom.push(new THREE.Vector3());
      for (j = 0; j < 2; j++) { var ph = glowSprite(PHC[(i + j) % 5], 4.2, 0, true); gCam.add(ph); photons.push(ph); }
    }
    var NPX = 8, NPY = 6;
    var pixGeo = new THREE.BoxGeometry(4.2, 4.2, 0.8);
    var pixCol = new THREE.Color();
    var pixels = new THREE.InstancedMesh(pixGeo, new THREE.MeshBasicMaterial({ toneMapped: false }), NPX * NPY);
    var pixBase = [];
    for (i = 0; i < NPY; i++) for (j = 0; j < NPX; j++) {
      var bayer = (i % 2 === 0) ? (j % 2 === 0 ? [0.85, 0.2, 0.18] : [0.25, 0.75, 0.3]) : (j % 2 === 0 ? [0.25, 0.75, 0.3] : [0.2, 0.35, 0.9]);
      pixBase.push(bayer);
      pixels.setMatrixAt(i * NPX + j, new THREE.Matrix4().makeTranslation((j - NPX / 2 + 0.5) * 4.6, (i - NPY / 2 + 0.5) * 4.6, 0));
      pixels.setColorAt(i * NPX + j, new THREE.Color(0.1, 0.1, 0.1));
    }
    var gPix = new THREE.Group();
    gPix.add(pixels);
    var pixFrame = new THREE.Mesh(rbox(40, 1.2, 30, 2, 0.5, 2), new THREE.MeshStandardMaterial({ color: 0x23262D, roughness: 0.6 }));
    pixFrame.rotation.x = Math.PI / 2; pixFrame.position.z = -0.9;
    gPix.add(pixFrame);
    gCam.add(gPix);
    // microphone: sound arcs and a magnified membrane over a perforated back plate
    var gMic = new THREE.Group(); props.add(gMic);
    var soundMat = new THREE.MeshBasicMaterial({ color: dark ? 0x8EA6F2 : 0x2343B0, transparent: true, opacity: 0, depthWrite: false });
    var arcs = [];
    for (i = 0; i < 4; i++) { var ar = new THREE.Mesh(new THREE.TorusGeometry(1, 0.012, 4, 48, Math.PI * 0.6), soundMat.clone()); ar.rotation.z = Math.PI * 1.2; gMic.add(ar); arcs.push(ar); }
    var memb = new THREE.Mesh(new THREE.CylinderGeometry(9, 9, 0.35, 48), new THREE.MeshStandardMaterial({ color: 0xC9A35A, metalness: 0.8, roughness: 0.3 }));
    var plate = new THREE.Mesh(new THREE.CylinderGeometry(9.4, 9.4, 1.0, 48), new THREE.MeshStandardMaterial({ color: 0x8A8F99, metalness: 0.7, roughness: 0.4 }));
    var gMem = new THREE.Group();
    gMem.add(plate); plate.position.y = -2.2;
    gMem.add(memb);
    gMic.add(gMem);
    // accelerometer: magnified proof mass on folded springs between comb fingers
    var gAcc = new THREE.Group(); props.add(gAcc);
    var mSi = new THREE.MeshStandardMaterial({ color: 0x9EA6B4, metalness: 0.6, roughness: 0.35 });
    var mAnchor = new THREE.MeshStandardMaterial({ color: 0x4A505C, roughness: 0.5 });
    var accBase = new THREE.Mesh(rbox(54, 1.2, 34, 2, 0.4, 2), new THREE.MeshStandardMaterial({ color: 0x2A2E36, roughness: 0.6 }));
    accBase.rotation.x = Math.PI / 2; accBase.position.z = -1.6;
    gAcc.add(accBase);
    var mass = new THREE.Group();
    mass.add(new THREE.Mesh(new THREE.BoxGeometry(22, 12, 2), mSi));
    for (i = 0; i < 5; i++) { var fg = new THREE.Mesh(new THREE.BoxGeometry(1.0, 6, 1.6), mSi); fg.position.set(-8 + i * 4, 9, 0); mass.add(fg); var fg2 = fg.clone(); fg2.position.y = -9; mass.add(fg2); }
    gAcc.add(mass);
    for (i = 0; i < 4; i++) { var ff = new THREE.Mesh(new THREE.BoxGeometry(1.0, 6, 1.6), mAnchor); ff.position.set(-6 + i * 4, 10.5, 0); gAcc.add(ff); var ff2 = ff.clone(); ff2.position.y = -10.5; gAcc.add(ff2); }
    [[-1, 1], [1, 1], [-1, -1], [1, -1]].forEach(function (s) {
      var an = new THREE.Mesh(new THREE.BoxGeometry(3, 3, 2), mAnchor); an.position.set(s[0] * 21, s[1] * 4, 0); gAcc.add(an);
    });
    var springs = [];
    [[-1, 1], [1, 1], [-1, -1], [1, -1]].forEach(function (s) {
      var sp = dynTube(40, 6, mSi); sp.userData.s = s; gAcc.add(sp); springs.push(sp);
    });
    var springPts = new Float32Array(41 * 3);
    function placeSprings(dx) {
      springs.forEach(function (sp) {
        var s = sp.userData.s, x0 = s[0] * 19.5, x1 = s[0] * 11 + dx, y = s[1] * 4;
        for (var q = 0; q <= 40; q++) {
          var f = q / 40;
          springPts[q * 3] = lerp(x0, x1, f);
          springPts[q * 3 + 1] = y + Math.sin(f * Math.PI * 6) * 1.6 * Math.sin(Math.PI * f);
          springPts[q * 3 + 2] = 0;
        }
        sp.update(springPts, 0.32, 0.32);
      });
    }
    placeSprings(0);
    // light sensor: a lamp above the phone
    var lamp = glowSprite(0xF2C46B, 44, 0, true);
    props.add(lamp);
    var lampCore = glowSprite(0xFFF6E0, 12, 0, false);
    props.add(lampCore);
    // proximity: an ear-like surface approaching, and the infrared beam
    var ear = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 32), new THREE.MeshStandardMaterial({ color: 0xDDAE90, roughness: 0.62 }));
    ear.scale.set(22, 30, 12);
    props.add(ear);
    var earRim = new THREE.Mesh(new THREE.TorusGeometry(0.72, 0.13, 14, 48, Math.PI * 1.45), ear.material);
    earRim.rotation.z = Math.PI * 0.32;
    earRim.position.z = -0.78;
    earRim.scale.set(1, 1, 0.5);
    ear.add(earRim);
    // inner ear (concha) so the shape reads as an ear and not as an egg
    var concha = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 16), new THREE.MeshStandardMaterial({ color: 0xC99679, roughness: 0.7 }));
    concha.scale.set(0.42, 0.5, 0.2);
    concha.position.set(0.05, 0.05, -0.9);
    ear.add(concha);
    var concha2 = concha.clone(); concha2.position.z = 0.9; ear.add(concha2);
    var irMat = new THREE.LineDashedMaterial({ color: 0xB0202A, dashSize: 2.2, gapSize: 1.6, transparent: true, opacity: 0 });
    var irGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()]);
    var irLine = new THREE.Line(irGeo, irMat);
    irLine.frustumCulled = false;
    props.add(irLine);
    // touch: a fingertip, field lines and the sensed point
    // a smooth, slightly tapered fingertip (tip at the origin, pointing along −y)
    var finger = new THREE.Mesh(lathe([[0, 0], [2.6, 0.35], [4.6, 1.5], [6.0, 3.3], [6.9, 5.8], [7.3, 9], [7.5, 16], [7.9, 30], [8.6, 36], [8.2, 42], [8.6, 50], [8.6, 58], [0, 58]], 40),
      new THREE.MeshStandardMaterial({ color: 0xDDAE90, roughness: 0.58 }));
    props.add(finger);
    // nail on the side facing away from the screen
    var nail = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 16), new THREE.MeshStandardMaterial({ color: 0xE9C4AC, roughness: 0.35 }));
    nail.scale.set(3.8, 6.5, 0.8);
    nail.position.set(0, 9, -7.2);
    finger.add(nail);
    var fingerDir = new THREE.Vector3(0.42, -0.5, 0.76).normalize(), yAxis = new THREE.Vector3(0, 1, 0);
    var fieldMat = new THREE.MeshBasicMaterial({ color: dark ? 0x8EA6F2 : 0x2343B0, transparent: true, opacity: 0, depthWrite: false });
    var fields = [];
    for (i = 0; i < 6; i++) { var fl = new THREE.Mesh(new THREE.TorusGeometry(1, 0.045, 5, 32, Math.PI), fieldMat); fl.renderOrder = 6; props.add(fl); fields.push(fl); }
    var fieldBasis = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, 1), new THREE.Vector3(1, 0, 0)));
    var tring = new THREE.Mesh(new THREE.RingGeometry(3.2, 4.0, 40), new THREE.MeshBasicMaterial({ color: 0xC8693A, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide }));
    tring.renderOrder = 7;
    props.add(tring);
    // GPS: four satellites and their signals
    var sats = [];
    var mGoldFoil = K.mat.gold({ roughness: 0.4 });
    var mPanel = new THREE.MeshStandardMaterial({ color: 0x2A3F7A, roughness: 0.3, metalness: 0.5 });
    [[-150, 190, -40], [-30, 215, 30], [110, 215, -70], [190, 170, 50]].forEach(function (p) {
      var g = new THREE.Group();
      g.add(new THREE.Mesh(new THREE.BoxGeometry(10, 10, 14), mGoldFoil));
      var pnl = new THREE.Mesh(new THREE.BoxGeometry(34, 0.6, 10), mPanel); pnl.position.x = 0; g.add(pnl);
      g.position.set(p[0], p[1], p[2]);
      props.add(g);
      sats.push(g);
    });
    var sigs = sats.map(function () { var s = glowSprite(dark ? 0x8EA6F2 : 0x2343B0, 10, 0, true); s.renderOrder = 6; props.add(s); return s; });
    var sigLineMat = new THREE.LineDashedMaterial({ color: dark ? 0x8EA6F2 : 0x2343B0, dashSize: 5, gapSize: 4, transparent: true, opacity: 0 });
    var sigLines = sats.map(function () {
      var g = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]);
      var l = new THREE.Line(g, sigLineMat); l.frustumCulled = false; props.add(l); return l;
    });

    // principle captions (drawn at the bottom of the visual)
    var CAPTION = {
      kamera: 'Görüntü sensörü (büyütülmüş): her piksel ışığı elektrik yüküne çevirir',
      mikrofon: 'Mikrofon zarı (büyütülmüş): ses dalgası zarı titretir, gerilim değişir',
      ivme: 'İvmeölçer (büyütülmüş): telefon hızlanınca ya da eğilince yaylı kütle kayar; kayma ölçülür',
      isik: 'Ortam aydınlandıkça sensör daha çok akım üretir; ekran parlaklaşır',
      yakinlik: 'Kızılötesi ışık (gözle görülmez) kulağa çarpıp yansır; ekran kapanır',
      dokunmatik: 'Parmak, elektrotlar arasındaki alanı değiştirir; kesişim noktası konumu verir',
      gps: 'En az 4 uydudan gelen sinyallerin varış süresi farkları konumu verir'
    };
    var linkA = new THREE.Vector3(), linkB = new THREE.Vector3();
    var camRight = new THREE.Vector3(), camUp = new THREE.Vector3();
    var insetPts = [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()];

    /* ---------- state ---------- */
    var spot = spotlight(v, dark);
    var auto = true, cur = -1, chosen = 'kamera', st = 0;
    var dispBright = 1, tmp = new THREE.Vector3(), tmp2 = new THREE.Vector3(), tmp3 = new THREE.Vector3();
    function goTo(name, instant) {
      var P = PART[name];
      phone.updateMatrixWorld(true);
      var va = P.viewAt || P.anchor;
      // use the layer's rest position (the front stack may still be sliding back)
      var p = new THREE.Vector3(va[0], va[1], va[2]).add(P.g.userData.base || P.g.position);
      phone.localToWorld(p);
      var to = { yaw: P.view.yaw, pitch: P.view.pitch, distance: P.view.distance, target: [p.x + P.off[0], p.y + P.off[1], p.z + P.off[2]] };
      if (instant) v.setView(to); else v.animateTo(to, 1.6);
    }
    function reset() {
      auto = true; cur = -1; chosen = 'kamera'; st = 0; dispBright = 1;
      v.setView(HOME);
      spot.rect.a = 0;
    }
    function wpos(g, x, y, z, out) { out.set(x, y, z); return g.localToWorld(out); }

    reset();
    return {
      reset: reset,
      set: function (key, val) {
        if (key === 'sensor' && PART[val]) {
          auto = false;
          if (chosen !== val || cur < 0) { chosen = val; cur = ORDER.indexOf(val); st = 0; goTo(val); }
        }
      },
      read: function (key) { return key === 'sensor' ? TEXT[chosen] : ''; },
      frame: function (t, dt) {
        var rm = K.reducedMotion;
        if (auto) {
          var idx = t < 1.2 ? -1 : Math.floor((t - 1.2) / 5) % ORDER.length;
          if (idx !== cur) { cur = idx; if (idx >= 0) { chosen = ORDER[idx]; st = 0; goTo(chosen, rm); } }
        }
        if (cur >= 0) st += dt;
        var act = cur >= 0 ? chosen : null;
        var asideT = (act === 'ivme' || act === 'gps') ? 1 : 0;
        aside += (asideT - aside) * Math.min(1, dt * 2.2);
        var ak = EZ.inOut(clamp(aside, 0, 1));
        for (var fi = 0; fi < FRONT.length; fi++) {
          var bp = FRONT[fi].userData.base;
          FRONT[fi].position.set(bp.x - ak * (fi === 3 ? 30 : 62), bp.y, bp.z + ak * (fi === 3 ? 6 : 14));
        }
        var on = function (k) { return act === k ? clamp((st - 1.3) * 2.5, 0, 1) : 0; };
        var ta = rm ? 2.2 : st;
        phone.updateMatrixWorld(true);

        // accelerometer: the whole phone rocks gently; the proof mass lags behind
        var acc = on('ivme');
        var rock = acc * Math.sin(ta * 3.1) * 0.07;
        phone.rotation.z = rock;
        var accel = -acc * Math.cos(ta * 3.1);
        mass.position.x = accel * 2.2;
        placeSprings(mass.position.x);
        gAcc.visible = acc > 0.01;
        if (gAcc.visible) {
          wpos(gBoard, -66, 34, 50, tmp);
          gAcc.position.copy(tmp);
          gAcc.scale.setScalar(0.8 * acc + 0.001);
          gAcc.lookAt(v.camera.position);
          gAcc.rotateZ(phone.rotation.z);
        }

        // camera
        var cam = on('kamera');
        gCam.visible = cam > 0.01;
        if (gCam.visible) {
          wpos(gBack, CAMX - 6.5, CAMY + 6.5, -2.9, tmp2);
          for (i = 0; i < rays.length; i++) {
            wpos(gBack, CAMX - 6.5 + (i - 2) * 16, CAMY + 6.5 + 26 - i * 9, -90, rayFrom[i]);
            rays[i].position.copy(tmp2).add(rayFrom[i]).multiplyScalar(0.5);
            rays[i].scale.set(1, tmp2.distanceTo(rayFrom[i]), 1);
            rays[i].lookAt(tmp2); rays[i].rotateX(Math.PI / 2);
            for (j = 0; j < 2; j++) {
              var pu = (ta * 0.55 + i * 0.13 + j * 0.5) % 1;
              var phs = photons[i * 2 + j];
              phs.position.lerpVectors(rayFrom[i], tmp2, pu);
              phs.material.opacity = cam * 0.95 * Math.min(1, (1 - pu) * 6) * Math.min(1, pu * 5);
            }
          }
          rayMat.opacity = 0.35 * cam;
          wpos(gBack, CAMX - 74, CAMY - 22, -16, tmp);
          gPix.position.copy(tmp);
          gPix.lookAt(v.camera.position);
          gPix.scale.setScalar(cam);
          for (i = 0; i < NPY; i++) for (j = 0; j < NPX; j++) {
            var k2 = i * NPX + j, b = pixBase[k2];
            var light = clamp(Math.sin(ta * 1.6 - j * 0.35 - i * 0.2) * 0.5 + 0.55, 0, 1) * clamp((ta - 1.3) * 1.5, 0, 1);
            pixels.setColorAt(k2, pixCol.setRGB(0.08 + b[0] * light, 0.08 + b[1] * light, 0.08 + b[2] * light));
          }
          pixels.instanceColor.needsUpdate = true;
        }

        // microphone
        var mc = on('mikrofon');
        gMic.visible = mc > 0.01;
        if (gMic.visible) {
          wpos(gFrame, -14, -H / 2 - 4, 3.9, tmp);
          for (i = 0; i < arcs.length; i++) {
            var ph = (ta * 0.6 + i / arcs.length) % 1;
            arcs[i].position.copy(tmp);
            arcs[i].scale.setScalar(52 - ph * 46);
            arcs[i].material.opacity = mc * 0.6 * Math.sin(Math.PI * ph);
          }
          wpos(gFrame, -40, -H / 2 - 22, 10, tmp2);
          gMem.position.copy(tmp2);
          gMem.scale.setScalar(mc);
          memb.position.y = Math.sin(ta * 7) * 0.9 * mc;
          memb.scale.set(1, 1 + Math.abs(Math.sin(ta * 7)) * 0.4, 1);
        }

        // ambient light: lamp brightness drives the display brightness
        var li = on('isik');
        var amb = 0.35 + 0.65 * (0.5 - 0.5 * Math.cos(ta * 1.3));
        wpos(gDisp, -6, H / 2 + 34, 44, tmp);
        lamp.position.copy(tmp); lampCore.position.copy(tmp);
        lamp.material.opacity = li * 0.5 * amb; lampCore.material.opacity = li * 0.9 * amb;
        als.material.emissiveIntensity = li * 1.6 * amb;

        // proximity: ear approaches, IR beam reflects, the display turns off when near
        var px = on('yakinlik');
        var near = px * (0.5 - 0.5 * Math.cos(ta * 1.25));
        ear.visible = px > 0.01;
        if (ear.visible) {
          wpos(gGlass, 14, H / 2 - 6, 55 - near * 38, tmp);
          ear.position.copy(tmp);
          ear.quaternion.copy(phone.quaternion);
          var a = wpos(gDisp, 10.4, H / 2 - 5.2, 1.6, tmp2).clone();
          var surf = tmp.clone().add(tmp2.set(0, 0, -12).applyQuaternion(phone.quaternion));
          var bpt = wpos(gDisp, 13.2, H / 2 - 5.2, 1.6, tmp3);
          var pa = irGeo.attributes.position;
          pa.setXYZ(0, a.x, a.y, a.z); pa.setXYZ(1, surf.x, surf.y, surf.z); pa.setXYZ(2, bpt.x, bpt.y, bpt.z);
          pa.needsUpdate = true;
          irLine.computeLineDistances();
          irMat.opacity = px * 0.9;
          irLed.material.emissiveIntensity = px * (0.6 + 0.4 * Math.sin(ta * 12));
        } else irMat.opacity = 0;
        // display brightness
        var target = 1;
        if (act === 'isik') target = 0.25 + 0.95 * amb;
        if (act === 'yakinlik') target = near > 0.62 ? 0.0 : 1;
        dispBright += (target - dispBright) * Math.min(1, dt * 3);
        mScreen.emissiveIntensity = dispBright;

        // touch
        var tc = on('dokunmatik');
        finger.visible = tc > 0.01;
        var press = tc * (0.5 - 0.5 * Math.cos(ta * 1.4));
        if (finger.visible) {
          wpos(gTouch, 10, -14, 26 - press * 13.5, tmp);
          finger.position.copy(tmp);
          finger.quaternion.setFromUnitVectors(yAxis, fingerDir).premultiply(phone.quaternion);
        }
        for (i = 0; i < fields.length; i++) {
          var f = fields[i];
          var oy = -14 + (i - 2.5) * 8;
          wpos(gTouch, 10, oy, 0.2, tmp);
          f.position.copy(tmp);
          // arc spans along the phone's height and rises out of the layer towards the finger
          f.quaternion.copy(phone.quaternion).multiply(fieldBasis);
          var reach = 4 + press * 13 * Math.exp(-Math.pow((i - 2.5) / 1.5, 2));
          f.scale.set(3.6, reach, 1);
          f.material.opacity = tc * 0.85;
        }
        wpos(gTouch, 10, -14, 0.25, tmp);
        tring.position.copy(tmp); tring.quaternion.copy(phone.quaternion);
        tring.material.opacity = tc * clamp((press - 0.75) * 5, 0, 1);

        // GPS: pulses from four satellites, arriving at different times
        var gp = on('gps');
        wpos(gBoard, 16, 34, 2, tmp);
        sigLineMat.opacity = gp * 0.35;
        for (i = 0; i < sats.length; i++) {
          sats[i].visible = gp > 0.01;
          sats[i].lookAt(tmp);
          var u = ((ta * 0.45) + i * 0.17) % 1;
          sigs[i].position.lerpVectors(sats[i].position, tmp, u);
          sigs[i].material.opacity = gp * 0.95 * Math.min(1, Math.sin(Math.PI * u) * 2.5);
          var lp = sigLines[i].geometry.attributes.position;
          lp.setXYZ(0, sats[i].position.x, sats[i].position.y, sats[i].position.z); lp.setXYZ(1, tmp.x, tmp.y, tmp.z); lp.needsUpdate = true;
          sigLines[i].computeLineDistances();
        }

        // labels and tags
        var showLay = !act || st < 0.8;
        layLabels.forEach(function (L) { L.show(showLay && cur < 0); });
        ORDER.forEach(function (k) { PART[k].label.show(act === k && st > 1.1); });

        v.render(dt);
        v.camera.updateMatrixWorld();
        // the spotlight frames the part together with its magnified view
        var spts = act ? PART[act].pts() : null;
        if (spts) {
          spts = spts.slice(0, 8);
          var inset = act === 'kamera' && cam > 0.5 ? [gPix.position, 22] : act === 'mikrofon' && mc > 0.5 ? [gMem.position, 11] : act === 'ivme' && acc > 0.5 ? [gAcc.position, 23] : null;
          if (inset) {
            camRight.setFromMatrixColumn(v.camera.matrixWorld, 0); camUp.setFromMatrixColumn(v.camera.matrixWorld, 1);
            for (var q = 0; q < 4; q++) {
              var cp = insetPts[q].copy(inset[0]);
              cp.addScaledVector(camRight, (q & 1 ? 1 : -1) * inset[1]).addScaledVector(camUp, (q & 2 ? 1 : -1) * inset[1]);
              spts.push(cp);
            }
          }
        }
        spot.update(dt, spts, act && st > 0.9 && act !== 'gps');
        if (!K.skipRender) {
          spot.draw();
          spot.leaders(leaders);
          var c = v.ctx;
          // dashed link from a magnified inset to the real part
          var link = null;
          if (act === 'kamera' && cam > 0.5) { wpos(gBack, CAMX - 6.5, CAMY + 6.5, -2.9, linkA); linkB.copy(gPix.position); link = 1; }
          if (act === 'mikrofon' && mc > 0.5) { wpos(gBoard, -14, -66, 1.8, linkA); linkB.copy(gMem.position); link = 1; }
          if (act === 'ivme' && acc > 0.5) { wpos(gBoard, -21, 36, 1.8, linkA); linkB.copy(gAcc.position); link = 1; }
          if (link) {
            var p1 = v.project(linkA), p2 = v.project(linkB);
            c.save();
            c.strokeStyle = dark ? 'rgba(227,154,108,.8)' : 'rgba(166,75,34,.75)';
            c.lineWidth = 1.2; c.setLineDash([4, 4]);
            c.beginPath(); c.moveTo(p1.x, p1.y); c.lineTo(p2.x, p2.y); c.stroke();
            c.restore();
          }
          // caption chip at the bottom
          if (act && st > 1.4) {
            var txt = CAPTION[act], ca = clamp((st - 1.4) * 3, 0, 1);
            c.save();
            c.font = font(13, 400);
            var tw = c.measureText(txt).width + 24, cx = v.w / 2 - tw / 2, cy = v.h - 40;
            c.globalAlpha = ca;
            c.fillStyle = dark ? 'rgba(22,27,38,0.92)' : 'rgba(255,255,255,0.94)';
            c.strokeStyle = dark ? '#262D3B' : '#E3E3DD';
            K.rr(c, cx, cy, tw, 28, 8); c.fill(); c.stroke();
            c.restore();
            K.label(c, txt, v.w / 2, cy + 18.5, { size: 13, color: dark ? '#EEF0F3' : '#3E434D', align: 'center', alpha: ca });
            if (act === 'gps') K.label(c, 'ölçekli değil: uydular ≈ 20.000 km yukarıda · yavaşlatılmış', v.w / 2, cy - 10, { mono: true, size: 11, weight: 500, spacing: 1.0, color: dark ? K.palette.onNightMuted : '#595E69', align: 'center', alpha: ca });
          }
        }
      }
    };
  });
})();
