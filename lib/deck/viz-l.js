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
   * 2D scene helpers (focus-slide visuals: big, few labels, one story)
   * ------------------------------------------------------------------ */
  var INK = P.ink, INK2 = P.ink2, MUTED = P.muted, BLUE = P.blue, COPPER = P.copperFill;

  /* story engine: list of [name, seconds]; returns the current segment for time t */
  function pickSeg(list, t) {
    var tot = 0, i;
    for (i = 0; i < list.length; i++) tot += list[i][1];
    var u = ((t % tot) + tot) % tot, a = 0;
    for (i = 0; i < list.length; i++) {
      if (u < a + list[i][1]) return { name: list[i][0], i: i, u: u - a, dur: list[i][1], cyc: u, tot: tot };
      a += list[i][1];
    }
    return { name: list[0][0], i: 0, u: 0, dur: list[0][1], cyc: 0, tot: tot };
  }
  /* 0 → 1 → 0 envelope for something that is shown between a and b of a segment */
  function env(u, a, b, fi, fo) { return sstep(a, a + (fi || 0.3), u) * (1 - sstep(b - (fo || 0.3), b, u)); }

  function fontOf(size, weight, mono) { return K.font(size, weight || 400, mono); }

  /* text on a chip (paper-white rounded plate). o: {size, weight, mono, color, align, alpha, pad} -> width */
  function chipText(c, txt, x, y, o) {
    o = o || {};
    var size = o.size || 18, pad = o.pad === undefined ? 9 : o.pad;
    c.save();
    c.font = fontOf(size, o.weight || 600, o.mono);
    var w = c.measureText(txt).width + pad * 2, h = size + 12;
    var al = o.align || 'left';
    var x0 = al === 'center' ? x - w / 2 : al === 'right' ? x - w : x;
    c.globalAlpha *= (o.alpha === undefined ? 1 : o.alpha);
    c.fillStyle = o.bg || 'rgba(255,255,255,0.94)';
    K.rr(c, x0, y - h / 2, w, h, 7); c.fill();
    c.strokeStyle = o.line || '#D6D6CF'; c.lineWidth = 1; c.stroke();
    c.fillStyle = o.color || INK;
    c.textAlign = 'left'; c.textBaseline = 'middle';
    c.fillText(txt, x0 + pad, y + 1);
    c.restore();
    return w;
  }

  function softShadow(c, x, y, rx, ry, a) {
    c.save();
    c.translate(x, y); c.scale(1, ry / rx);
    var g = c.createRadialGradient(0, 0, 0, 0, 0, rx);
    g.addColorStop(0, 'rgba(21,23,28,' + (0.28 * a) + ')');
    g.addColorStop(0.6, 'rgba(21,23,28,' + (0.1 * a) + ')');
    g.addColorStop(1, 'rgba(21,23,28,0)');
    c.fillStyle = g;
    c.beginPath(); c.arc(0, 0, rx, 0, Math.PI * 2); c.fill();
    c.restore();
  }

  /* leader line from a thing to its label */
  function leader(c, x1, y1, x2, y2, a, col) {
    c.save();
    c.globalAlpha *= (a === undefined ? 1 : a);
    c.strokeStyle = col || 'rgba(89,94,105,0.8)'; c.lineWidth = 1.2;
    c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.stroke();
    c.fillStyle = c.strokeStyle;
    c.beginPath(); c.arc(x1, y1, 2.4, 0, Math.PI * 2); c.fill();
    c.restore();
  }

  /* vertical metal-ish gradient helper */
  function vgrad(c, y0, y1, stops) {
    var g = c.createLinearGradient(0, y0, 0, y1);
    for (var i = 0; i < stops.length; i++) g.addColorStop(stops[i][0], stops[i][1]);
    return g;
  }

  /* glass/plastic tube lying horizontally from x0 to x1, centre y, thickness h */
  function hTube(c, x0, x1, y, h, body, hi) {
    c.save();
    K.rr(c, x0, y - h / 2, x1 - x0, h, h / 2);
    c.fillStyle = vgrad(c, y - h / 2, y + h / 2, [[0, K.mix(body, '#FFFFFF', 0.25)], [0.45, body], [1, K.mix(body, '#000000', 0.22)]]);
    c.fill();
    c.globalAlpha *= (hi === undefined ? 0.5 : hi);
    c.strokeStyle = '#FFFFFF'; c.lineWidth = Math.max(1, h * 0.08); c.lineCap = 'round';
    c.beginPath(); c.moveTo(x0 + h * 0.5, y - h * 0.26); c.lineTo(x1 - h * 0.5, y - h * 0.26); c.stroke();
    c.restore();
  }

  /* cheap deterministic hash → 0..1 */
  function hash1(n) { var s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); }

  /* base for 2D visuals: surface + clear + size */
  function base2d(el) {
    var sf = K.surface(el);
    return { sf: sf, begin: function () { sf.clear(); return sf.ctx; }, W: function () { return sf.w; }, H: function () { return sf.h; } };
  }


  /* ==================================================================
   * 1) net-speed · 1120×440 · light (2D)
   * bits flow in a tube → eight bits close into one byte → bytes fill a 4 GB film bar.
   * One big number: the download time. Auto-walk 16 → 100 → 1000 Mbps; set('speed', n) holds one.
   * ================================================================== */
  K.register('net-speed', function (el) {
    var B = base2d(el), sf = B.sf;
    var AUTO = [16, 100, 1000], RATE = { 16: 4, 100: 10, 1000: 26 };   // bits drawn per second (slowed)
    var FILM_MB = 4000, CYC = 11.5, VB = 150, VBY = 230;
    var X0 = 40, XPI = 322, XPO = 546, XBAR = 736, XBAR1 = 1080, YP = 168;
    var TP = (XPI - X0) / VB;
    var held = null, heldT0 = 0, lastT = 0, speedNow = 100, tail = 0;

    function mbs(sp) { return sp / 8; }
    function totalSec(sp) { return FILM_MB / mbs(sp); }
    function fmtShort(sec) {
      sec = Math.round(sec);
      var m = Math.floor(sec / 60), r = sec % 60;
      return m ? m + ' dk ' + (r < 10 ? '0' : '') + r + ' s' : r + ' s';
    }
    function fmtDur(sec) {
      sec = Math.round(sec);
      var m = Math.floor(sec / 60), r = sec % 60;
      return m ? nf(m) + ' dakika' + (r ? ' ' + nf(r) + ' saniye' : '') : nf(r) + ' saniye';
    }
    function state(t) {
      if (held) return { sp: held, u: (((t - heldT0) % CYC) + CYC) % CYC };
      return { sp: AUTO[Math.floor(t / CYC) % 3], u: t % CYC };
    }

    function bitSq(c, x, y, s, bit, a) {
      c.save(); c.globalAlpha *= a;
      K.rr(c, x - s / 2, y - s / 2, s, s, Math.max(1.5, s * 0.22));
      if (bit) { c.fillStyle = BLUE; c.fill(); }
      else { c.fillStyle = '#FFFFFF'; c.fill(); c.strokeStyle = BLUE; c.lineWidth = 1.2; c.stroke(); }
      if (s >= 11) {
        c.fillStyle = bit ? '#FFFFFF' : BLUE; c.font = fontOf(s * 0.72, 600, true);
        c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(bit ? '1' : '0', x, y + 0.5);
      }
      c.restore();
    }
    function byteBlock(c, x, y, a, sc) {
      c.save(); c.globalAlpha *= a; c.translate(x, y); c.scale(sc, sc);
      softShadow(c, 0, 24, 30, 6, 0.8);
      K.rr(c, -26, -16, 52, 32, 6); c.fillStyle = vgrad(c, -16, 16, [[0, '#3A3F4B'], [1, INK]]); c.fill();
      c.strokeStyle = 'rgba(255,255,255,0.28)'; c.lineWidth = 1;
      for (var i = 1; i < 8; i++) { c.beginPath(); c.moveTo(-26 + i * 6.5, -16); c.lineTo(-26 + i * 6.5, 16); c.stroke(); }
      c.restore();
    }

    function frame(t, dt) {
      lastT = t;
      var W = B.W(), H = B.H(), c = B.begin();
      var st = state(t), sp = st.sp, u = st.u;
      speedNow = sp;
      var r = RATE[sp], pitch = VB / r, total = totalSec(sp), MB = mbs(sp);
      var s = Math.min(W / 1120, H / 440);
      c.save(); c.translate((W - 1120 * s) / 2, (H - 440 * s) / 2); c.scale(s, s);

      /* tubes */
      hTube(c, X0 - 14, XPI + 8, YP, 34, '#D5DAE6');
      hTube(c, XPO - 8, XBAR - 14, YP, 56, '#CFD4E0');

      /* packer (glass box) */
      softShadow(c, (XPI + XPO) / 2, YP + 62, 110, 10, 1);
      K.rr(c, XPI, YP - 52, XPO - XPI, 104, 14);
      c.fillStyle = 'rgba(255,255,255,0.8)'; c.fill();
      c.strokeStyle = '#B8BCC6'; c.lineWidth = 1.5; c.stroke();

      var uBits = Math.min(u, 8.9);                         // the stream stops, the pipe empties
      var kmax = Math.floor(uBits * r), kmin = Math.max(0, Math.floor((uBits - TP) * r) - 1);
      for (var k = kmin; k <= kmax; k++) {
        var x = X0 + (u - k / r) * VB;
        if (k / r > 8.9 || x < X0 - 6 || x > XPI - 4) continue;
        var a = sstep(X0 - 6, X0 + 30, x);
        bitSq(c, x, YP, Math.min(21, Math.max(5, pitch * 0.78)), hash1(k * 7.3) > 0.5 ? 1 : 0, a);
      }

      /* the byte register */
      var narr = u >= TP ? Math.min(Math.floor((Math.min(u, 8.9 + TP) - TP) * r) + 1, 99999) : 0;
      if (u > 8.9 + TP + 0.4) narr = Math.floor((8.9) * r) + 1;
      var m = Math.floor(narr / 8), fill = narr % 8;
      var tcLast = m >= 1 ? TP + (m * 8 - 1) / r : -9, since = u - tcLast;
      var pcx = (XPI + XPO) / 2, slot = 21, sp8 = 25, sx0 = pcx - 8 * sp8 / 2 + sp8 / 2;
      if (m >= 1 && since < 0.35 && fill === 0) {
        var q = E.inOut(since / 0.35);
        for (var j = 0; j < 8; j++) {
          var bx = lerp(sx0 + j * sp8, pcx, q);
          bitSq(c, bx, YP, slot * (1 - 0.3 * q), hash1((m * 8 - 8 + j) * 7.3) > 0.5 ? 1 : 0, 1 - q * 0.9);
        }
        byteBlock(c, pcx, YP, q, 0.7 + 0.3 * q);
      } else {
        for (var j2 = 0; j2 < 8; j2++) {
          var on = j2 < fill;
          c.save();
          K.rr(c, sx0 + j2 * sp8 - slot / 2, YP - slot / 2, slot, slot, 3.5);
          c.strokeStyle = on ? 'rgba(35,67,176,0)' : 'rgba(89,94,105,0.45)'; c.lineWidth = 1; c.setLineDash([2, 2]); c.stroke();
          c.restore();
          if (on) bitSq(c, sx0 + j2 * sp8, YP, slot, hash1((m * 8 + j2) * 7.3) > 0.5 ? 1 : 0, 1);
        }
      }
      /* completion pulse on the packer */
      if (m >= 1 && since >= 0 && since < 0.5) {
        c.save(); c.globalAlpha = (1 - since / 0.5) * 0.5; c.strokeStyle = BLUE; c.lineWidth = 3;
        K.rr(c, XPI - 3 - since * 14, YP - 55 - since * 14, XPO - XPI + 6 + since * 28, 110 + since * 28, 16); c.stroke(); c.restore();
      }
      /* bytes in flight */
      var arrived = 0;
      for (var b = Math.max(1, m - 5); b <= m; b++) {
        var tcb = TP + (b * 8 - 1) / r, sb = u - tcb - 0.35;
        if (sb <= 0) continue;
        var bxp = XPO + sb * VBY;
        if (bxp < XBAR - 22) byteBlock(c, bxp, YP, 1, 1);
        else if (bxp < XBAR + 14) { var fa = 1 - (bxp - (XBAR - 22)) / 36; byteBlock(c, XBAR - 22, YP, fa, 1 - 0.2 * (1 - fa)); }
      }

      /* film bar */
      var p = sstep(1.0, 9.2, u) * 0 + clamp((u - 1.0) / 8.2, 0, 1);
      var bw = XBAR1 - XBAR, by = YP, bh = 52;
      softShadow(c, XBAR + bw / 2, by + 44, bw / 2 - 6, 8, 1);
      K.rr(c, XBAR, by - bh / 2, bw, bh, bh / 2); c.fillStyle = vgrad(c, by - bh / 2, by + bh / 2, [[0, '#E4E6EC'], [1, '#F4F4F0']]); c.fill();
      c.strokeStyle = '#B8BCC6'; c.lineWidth = 1.5; c.stroke();
      if (p > 0.002) {
        c.save(); K.rr(c, XBAR + 4, by - bh / 2 + 4, bw - 8, bh - 8, bh / 2 - 4); c.clip();
        var fw = (bw - 8) * p;
        c.fillStyle = vgrad(c, by - 22, by + 22, [[0, '#4A66CC'], [0.5, BLUE], [1, '#1B3390']]);
        c.fillRect(XBAR + 4, by - 22, fw, 44);
        c.fillStyle = 'rgba(255,255,255,0.28)'; c.fillRect(XBAR + 4, by - 19, fw, 9);
        c.restore();
      }
      K.label(c, '4 GB film', XBAR, YP - 44, { size: 20, weight: 700, color: INK });
      K.label(c, K.num(Math.round(p * 100)) + '%', XBAR1, YP - 44, { size: 18, weight: 600, mono: true, align: 'right', color: p >= 1 ? BLUE : MUTED });

      /* labels around the pipeline */
      K.label(c, nf(sp) + ' Mbps', X0, 76, { size: 36, weight: 700, color: BLUE });
      K.label(c, '8 bit = 1 bayt', pcx, YP + 88, { size: 19, weight: 600, align: 'center', color: INK });
      K.label(c, nf(MB, 2) + ' MB/s', (XPO + XBAR) / 2, YP - 44, { size: 24, weight: 700, align: 'center', color: INK });

      /* the one big number */
      var el_s = total * p;
      var txt = fmtShort(el_s);
      var done = p >= 1;
      c.save();
      c.font = fontOf(112, 600); c.textAlign = 'center'; c.textBaseline = 'alphabetic';
      var pop = done ? 1 + 0.04 * Math.exp(-(u - 9.2) * 3) * Math.cos((u - 9.2) * 9) : 1;
      c.translate(560, 368); c.scale(pop, pop);
      c.fillStyle = done ? BLUE : INK;
      if ('fontVariantNumeric' in c) c.fontVariantNumeric = 'tabular-nums';
      c.fillText(txt, 0, 0);
      c.restore();
      K.label(c, done ? 'indirme tamam' : 'geçen süre', 560, 408, { size: 18, weight: 500, align: 'center', color: done ? BLUE : MUTED });
      K.label(c, 'hızlandırılmış: bar 8 saniyede dolar', 1100, 432, { size: 13, mono: true, align: 'right', spacing: 0.3, color: MUTED });
      c.restore();
    }

    return {
      reset: function () { held = null; lastT = 0; },
      frame: frame,
      set: function (key, val) {
        if (key === 'speed') {
          var x = parseFloat(val), best = 100;
          AUTO.forEach(function (w) { if (Math.abs(w - x) < Math.abs(best - x)) best = w; });
          held = best; heldT0 = lastT;
        }
      },
      read: function (key) {
        var sp = speedNow, MB = mbs(sp), s = totalSec(sp);
        if (key === 'formula') return nf(sp) + ' Mbps ÷ 8 = ' + nf(MB, 2) + ' MB/s';
        if (key === 'time') return nf(FILM_MB) + ' MB ÷ ' + nf(MB, 2) + ' MB/s = ' + nf(s) + ' s' + (s >= 60 ? ' = ' + fmtDur(s) : '') + ' (ideal)';
        if (key === 'speed') return sp + ' Mbps';
        if (key === 'explain') {
          return nf(sp) + ' Mbps ÷ 8 = ' + nf(MB, 2) + ' MB/s: 4 GB’lık film ' + (s >= 60 ? 'yaklaşık ' + fmtDur(s) : 'yalnızca ' + fmtDur(s)) + ' içinde iner.';
        }
        return '';
      },
      dispose: function () { sf.dispose(); }
    };
  });


  /* ==================================================================
   * 2) phone-battery · 1120×440 · light (2D)
   * Cross-section of a lithium-ion cell: Li⁺ ions shuttle between the metal-oxide layers (right)
   * and the graphite layers (left); electrons go round the outer circuit. Charge ↔ use story.
   * ================================================================== */
  K.register('phone-battery', function (el) {
    var B = base2d(el), sf = B.sf;
    var CHG = [5, 18, 65], RATE = { 5: 0.03, 18: 0.07, 65: 0.13 }, DIS = 0.075;
    var LO = 0.2, HI = 0.9, N = 40;
    var XA0 = 168, XA1 = 518, XC0 = 598, XC1 = 948, YT = 198, YB = 372, WY = 104;
    var ROW = (YB - YT) / 8;
    var PATH = [[955, YT], [955, WY], [159, WY], [159, YT]];
    var L1 = YT - WY, PL = L1 + 796 + L1;
    var charger = 18, mode = 'sarj', soc = LO, hold = 0, phase = 0, flow = 0, modeB = 1, lastT = 0;

    /* ion assignment: fixed row/column per ion, filled into graphite in a scattered order */
    var ions = [], order = [];
    (function () {
      var i;
      for (i = 0; i < N; i++) order.push(i);
      order.sort(function (a, b) { return hash1(a * 3.7) - hash1(b * 3.7); });
      for (i = 0; i < N; i++) {
        var rank = order.indexOf(i), row = i % 8, col = Math.floor(i / 8);
        ions.push({
          thr: (rank + 0.5) / N, row: row, y: YT + ROW * (row + 0.5),
          xc: XC0 + 30 + col * 66 + (row % 2) * 12, xa: XA0 + 30 + (4 - col) * 66 - (row % 2) * 12,
          ph: hash1(i * 5.1) * 6.28
        });
      }
    })();

    function posOnPath(s) {
      s = ((s % PL) + PL) % PL;
      if (s < L1) return [955, YT - s];
      s -= L1;
      if (s < 796) return [955 - s, WY];
      s -= 796;
      return [159, WY + s];
    }

    function fmtTime() {
      return mode === 'sarj'
        ? '19,3 Wh ÷ ' + charger + ' W' + (charger === 65 ? ' ≈ ' + Math.round(19.3 / charger * 60) + ' dk' : ' ≈ ' + nf(19.3 / charger, 1) + ' saat') + ' (ideal)'
        : '19,3 Wh ÷ 2 W ≈ 9,6 saat';
    }

    function step(dt) {
      if (hold > 0) { hold -= dt; }
      else if (mode === 'sarj') {
        var taper = 1 - 0.8 * sstep(0.78, HI, soc);
        soc += RATE[charger] * taper * dt;
        if (soc >= HI - 0.005) { soc = HI - 0.005; hold = 1.4; mode = 'desarj'; }
      } else {
        soc -= DIS * dt;
        if (soc <= LO + 0.005) { soc = LO + 0.005; hold = 1.4; mode = 'sarj'; }
      }
    }

    function drawElectrode(c, x0, x1, kind) {
      var h = YB - YT, g;
      c.save();
      K.rr(c, x0, YT, x1 - x0, h, 3); c.clip();
      if (kind === 'g') {
        g = vgrad(c, YT, YB, [[0, '#3A3E48'], [1, '#22252C']]);
        c.fillStyle = g; c.fillRect(x0, YT, x1 - x0, h);
        c.fillStyle = 'rgba(214,168,76,' + (0.04 + soc * 0.30) + ')'; c.fillRect(x0, YT, x1 - x0, h);   // lithiated graphite turns gold
        c.strokeStyle = 'rgba(190,195,208,0.55)'; c.lineWidth = 2;
        for (var j = 0; j <= 8; j++) { c.beginPath(); c.moveTo(x0, YT + j * ROW); c.lineTo(x1, YT + j * ROW); c.stroke(); }
      } else {
        c.fillStyle = vgrad(c, YT, YB, [[0, '#D3D9E8'], [1, '#B8C0D6']]); c.fillRect(x0, YT, x1 - x0, h);
        c.strokeStyle = '#7C86A6'; c.lineWidth = 3;
        for (var j2 = 0; j2 <= 8; j2++) { c.beginPath(); c.moveTo(x0, YT + j2 * ROW); c.lineTo(x1, YT + j2 * ROW); c.stroke(); }
        c.fillStyle = '#5E6788';
        for (var j3 = 0; j3 <= 8; j3++) for (var xx = x0 + 14; xx < x1; xx += 34) { c.beginPath(); c.arc(xx + (j3 % 2) * 17, YT + j3 * ROW, 3, 0, 6.3); c.fill(); }
      }
      c.restore();
      c.strokeStyle = kind === 'g' ? '#14161B' : '#6F7894'; c.lineWidth = 1.5;
      K.rr(c, x0, YT, x1 - x0, h, 3); c.stroke();
    }

    function drawDevice(c, a, bt) {
      // charger
      if (a > 0.01) {
        c.save(); c.globalAlpha *= a;
        softShadow(c, 560, WY + 52, 120, 9, 1);
        K.rr(c, 450, WY - 42, 220, 84, 14); c.fillStyle = vgrad(c, WY - 42, WY + 42, [[0, '#4A505E'], [1, INK]]); c.fill();
        c.strokeStyle = 'rgba(255,255,255,0.18)'; c.lineWidth = 1.5; c.stroke();
        K.label(c, charger + ' W', 560, WY + 6, { size: 38, weight: 700, align: 'center', color: '#FFFFFF' });
        K.label(c, 'şarj aleti', 560, WY + 30, { size: 15, align: 'center', color: '#C9CFDA' });
        c.restore();
      }
      if (1 - a > 0.01) {
        c.save(); c.globalAlpha *= 1 - a;
        softShadow(c, 560, WY + 52, 120, 9, 1);
        K.rr(c, 450, WY - 42, 220, 84, 16); c.fillStyle = vgrad(c, WY - 42, WY + 42, [[0, '#2E323B'], [1, '#14161B']]); c.fill();
        c.strokeStyle = 'rgba(255,255,255,0.2)'; c.lineWidth = 1.5; c.stroke();
        K.rr(c, 458, WY - 34, 204, 68, 9);
        var gl = c.createLinearGradient(458, 0, 662, 0); gl.addColorStop(0, '#E8EEFA'); gl.addColorStop(1, '#F6EBD3');
        c.fillStyle = gl; c.fill();
        K.drawGlow(c, P.lamp, 560, WY, 90, 0.35 * (1 - a));
        K.label(c, 'telefon', 560, WY + 8, { size: 28, weight: 700, align: 'center', color: INK });
        c.restore();
      }
    }

    function frame(t, dt) {
      lastT = t;
      var W = B.W(), H = B.H(), c = B.begin();
      var s = Math.min(W / 1120, H / 440);
      step(dt);
      modeB = easeTo(modeB, mode === 'sarj' ? 1 : 0, 5, dt);
      var tgt = (mode === 'sarj' ? 1 : -1) * (hold > 0 ? 0.0 : (mode === 'sarj' ? (RATE[charger] / 0.07) * (1 - 0.7 * sstep(0.78, HI, soc)) : 1));
      flow = easeTo(flow, tgt, 2.2, dt);
      phase += flow * 95 * dt;

      c.save(); c.translate((W - 1120 * s) / 2, (H - 440 * s) / 2); c.scale(s, s);

      /* legend */
      K.drawSphere(c, COPPER, 52, 34, 8);
      K.label(c, 'Li⁺ iyonu', 68, 40, { size: 18, weight: 600, color: INK });
      K.drawSphere(c, '#2848C8', 190, 34, 6.5);
      K.label(c, 'elektron', 204, 40, { size: 18, weight: 600, color: INK });

      /* battery level gauge */
      var gx = 820, gy = 18, gw = 190, gh = 34;
      softShadow(c, gx + gw / 2, gy + gh + 6, gw / 2, 5, 0.7);
      K.rr(c, gx, gy, gw, gh, 8); c.fillStyle = '#FFFFFF'; c.fill(); c.strokeStyle = INK2; c.lineWidth = 2; c.stroke();
      c.fillStyle = INK2; K.rr(c, gx + gw + 1, gy + 10, 5, gh - 20, 2); c.fill();
      var lv = clamp((soc - 0.05) / 0.9, 0, 1);
      K.rr(c, gx + 4, gy + 4, Math.max(2, (gw - 8) * lv), gh - 8, 5);
      c.fillStyle = vgrad(c, gy, gy + gh, [[0, '#F7D98A'], [1, '#E2AE42']]); c.fill();
      K.label(c, '%' + Math.round(soc * 100), gx + gw + 70, gy + 26, { size: 26, weight: 600, mono: true, align: 'right', color: INK });

      /* outer circuit: wire */
      c.save();
      c.lineJoin = 'round'; c.lineCap = 'round';
      c.beginPath(); c.moveTo(PATH[0][0], PATH[0][1]); for (var pi = 1; pi < PATH.length; pi++) c.lineTo(PATH[pi][0], PATH[pi][1]);
      c.strokeStyle = 'rgba(21,23,28,0.12)'; c.lineWidth = 11; c.stroke();
      c.strokeStyle = '#8E4A28'; c.lineWidth = 8; c.stroke();
      c.strokeStyle = COPPER; c.lineWidth = 5.5; c.stroke();
      c.strokeStyle = 'rgba(255,255,255,0.35)'; c.lineWidth = 1.5; c.translate(0, -1.5); c.stroke();
      c.restore();
      /* electrons on the wire */
      var NE = 24;
      for (var e = 0; e < NE; e++) {
        var pp = posOnPath(e * PL / NE + phase);
        K.drawSphere(c, '#2848C8', pp[0], pp[1], 5.5);
      }
      drawDevice(c, modeB, 0);

      /* the pouch cell */
      softShadow(c, 560, YB + 16, 420, 11, 1);
      K.rr(c, 140, YT - 8, 836, YB - YT + 16, 14); c.fillStyle = '#F8F8F4'; c.fill();
      c.strokeStyle = '#9AA0AC'; c.lineWidth = 2; c.stroke();
      /* electrolyte */
      c.fillStyle = '#E4E9F6'; c.fillRect(XA1, YT, XC0 - XA1, YB - YT);
      drawElectrode(c, XA0, XA1, 'g');
      drawElectrode(c, XC0, XC1, 'c');
      /* separator */
      var xs = (XA1 + XC0) / 2;
      c.fillStyle = 'rgba(255,255,255,0.95)'; c.fillRect(xs - 3.5, YT, 7, YB - YT);
      c.strokeStyle = '#9AA3B2'; c.lineWidth = 1; c.strokeRect(xs - 3.5, YT, 7, YB - YT);
      c.fillStyle = '#C3C9D6';
      for (var pj = 0; pj < 8; pj++) c.fillRect(xs - 2.5, YT + ROW * (pj + 0.5) - 2, 5, 4);
      /* collectors + tabs */
      var cu = vgrad(c, YT, YB, [[0, '#E0905F'], [1, '#B25A2D']]);
      c.fillStyle = cu; c.fillRect(150, YT, 18, YB - YT);
      c.fillRect(152, YT - 30, 14, 34);
      var al = vgrad(c, YT, YB, [[0, '#E6E8EC'], [1, '#B5BAC4']]);
      c.fillStyle = al; c.fillRect(XC1, YT, 16, YB - YT);
      c.fillRect(948, YT - 30, 14, 34);

      /* direction chevrons in the electrolyte */
      var dir = mode === 'sarj' ? -1 : 1, ca = hold > 0 ? 0.25 : 0.55 + 0.35 * Math.sin(t * 3);
      K.arrow(c, xs - dir * 70, YB + 34, xs + dir * 70, YB + 34, { color: COPPER, width: 4, head: 14, alpha: ca });

      /* ions */
      var tt = K.reducedMotion ? 0 : t;
      for (var i = 0; i < N; i++) {
        var io = ions[i];
        var q = sstep(io.thr - 0.05, io.thr + 0.05, soc);
        var x, y;
        var jx = Math.sin(tt * 2.3 + io.ph) * 1.8, jy = Math.cos(tt * 2.9 + io.ph * 1.3) * 1.8;
        if (q <= 0) { x = io.xc + jx; y = io.y + jy; }
        else if (q >= 1) { x = io.xa + jx; y = io.y + jy; }
        else {
          var e2 = E.sine(q);
          x = lerp(io.xc, io.xa, e2); y = io.y + Math.sin(q * 6.28) * 5;
          K.drawGlow(c, COPPER, x, y, 24, 0.6 * Math.sin(q * Math.PI));
        }
        K.drawSphere(c, COPPER, x, y, 8);
        c.strokeStyle = 'rgba(255,255,255,0.85)'; c.lineWidth = 1.6;
        c.beginPath(); c.moveTo(x - 3, y); c.lineTo(x + 3, y); c.moveTo(x, y - 3); c.lineTo(x, y + 3); c.stroke();
      }

      /* labels */
      K.label(c, 'Grafit', (XA0 + XA1) / 2, YB + 40, { size: 20, weight: 700, align: 'center', color: INK });
      K.label(c, 'Metal oksit', (XC0 + XC1) / 2, YB + 40, { size: 20, weight: 700, align: 'center', color: INK });
      K.label(c, fmtTime(), 560, WY + 70, { size: 17, mono: true, weight: 500, align: 'center', color: INK2 });
      K.label(c, 'hızlandırılmış', 1100, 434, { size: 13, mono: true, align: 'right', spacing: 0.3, color: MUTED });
      c.restore();
    }

    return {
      reset: function () { charger = 18; mode = 'sarj'; soc = LO; hold = 0; phase = 0; flow = 0; modeB = 1; },
      frame: frame,
      set: function (key, val) {
        if (key === 'charger') {
          var x = parseFloat(val), best = 18;
          CHG.forEach(function (w) { if (Math.abs(w - x) < Math.abs(best - x)) best = w; });
          charger = best; mode = 'sarj'; hold = 0;
        } else if (key === 'mode') {
          mode = String(val) === 'desarj' ? 'desarj' : 'sarj'; hold = 0;
        }
      },
      read: function (key) {
        if (key === 'energy') return '5.000 mAh × 3,85 V ≈ 19,3 Wh';
        if (key === 'time') return '19,3 Wh ÷ ' + charger + ' W' + (charger === 65 ? ' ≈ ' + Math.round(19.3 / charger * 60) + ' dk' : ' ≈ ' + nf(19.3 / charger, 1) + ' saat') + ' (ideal)';
        if (key === 'note') return 'Gücü telefon belirler; son %20 yavaş dolar';
        if (key === 'charger') return charger + ' W';
        if (key === 'mode') return mode;
        if (key === 'state') return mode === 'sarj' ? 'Şarj ediliyor' : 'Kullanımda';
        if (key === 'explain') {
          return mode === 'sarj'
            ? 'Şarjda lityum iyonları metal oksitten grafite geçer; elektronlar da dış devreden aynı yöne gider.'
            : 'Kullanımda iyonlar grafitten metal okside döner; elektronlar telefondan geçip iş yapar.';
        }
        return '';
      },
      dispose: function () { sf.dispose(); }
    };
  });


  /* ==================================================================
   * 3) wireless · 1120×440 · light (2D)
   * One electromagnetic wave leaves an antenna whose electrons swing up and down. The auto story
   * walks through five bands; the ruler under the wave compares λ with an everyday object.
   * ================================================================== */
  K.register('wireless', function (el) {
    var B = base2d(el), sf = B.sf;
    var C = 3e8, SEG = 7;
    var BANDS = {
      fm: { name: 'FM radyo 100 MHz', short: 'FM radyo', f: 1e8, lam: 3, lamTxt: '3 m', words: '100 milyon', eq: '=', objM: 1.7, obj: 'insan boyu ≈ 1,7 m',
        expl: 'FM radyo: saniyede 100 milyon titreşim, dalga boyu 3 m; bir insan boyunun yaklaşık iki katı.' },
      wifi24: { name: 'Wi-Fi 2,4 GHz', short: 'Wi-Fi 2,4 GHz', f: 2.4e9, lam: 0.125, lamTxt: '12,5 cm', words: '2,4 milyar', eq: '=', objM: 0.15, obj: 'telefon ≈ 15 cm',
        expl: 'Wi-Fi 2,4 GHz: saniyede 2,4 milyar titreşim, dalga boyu 12,5 cm; yaklaşık bir telefon boyunda.' },
      g5: { name: 'Mobil 5G 3,5 GHz', short: 'Mobil 5G', f: 3.5e9, lam: C / 3.5e9, lamTxt: '8,6 cm', words: '3,5 milyar', eq: '≈', objM: 0.0856, obj: 'banka kartı = 8,56 cm',
        expl: '5G (3,5 GHz): saniyede 3,5 milyar titreşim, dalga boyu yaklaşık 8,6 cm; bir banka kartı kadar.' },
      wifi5: { name: 'Wi-Fi 5 GHz', short: 'Wi-Fi 5 GHz', f: 5e9, lam: 0.06, lamTxt: '6 cm', words: '5 milyar', eq: '=', objM: 0.026, obj: '1 TL madeni para = 2,6 cm',
        expl: 'Wi-Fi 5 GHz: saniyede 5 milyar titreşim, dalga boyu 6 cm; yaklaşık iki buçuk madeni para.' },
      isik: { name: 'Görünür ışık ≈ 500 THz', short: 'Görünür ışık', f: 5e14, lam: 6e-7, lamTxt: '600 nm', words: '500 trilyon', eq: '=', objM: 1e-7, obj: 'virüs ≈ 100 nm',
        expl: 'Görünür ışık: saniyede 500 trilyon titreşim, dalga boyu 600 nm; bir virüsün yaklaşık altı katı.' }
    };
    var KEYS = ['fm', 'wifi24', 'g5', 'wifi5', 'isik'];
    var X0 = 150, X1 = 1060, CY = 246, A = 62, LAM = 202, FV = 0.5;
    var held = null, shown = 'wifi24', want = 'fm', fa = 1, objLen = 0, mk = 0, lastT = 0, cur = 'fm';

    function logPos(f) { return (Math.log(f) / Math.LN10 - 7.6) / (15.1 - 7.6); }

    function formula(k) {
      var b = BANDS[k], lam = C / b.f;
      var lamS = k === 'g5' ? nf(lam, 3) : k === 'isik' ? nf(lam, 7) : nf(lam, 3);
      return 'λ = c ÷ f = 300.000.000 m/s ÷ ' + nf(b.f) + ' Hz ' + b.eq + ' ' + lamS + ' m' + (k === 'isik' ? ' = ' + b.lamTxt : '');
    }

    function frame(t, dt) {
      lastT = t;
      var W = B.W(), H = B.H(), c = B.begin();
      var s = Math.min(W / 1120, H / 440);
      cur = held || KEYS[Math.floor(t / SEG) % KEYS.length];
      want = cur;
      if (shown !== want) { fa = easeTo(fa, 0, 9, dt); if (fa < 0.04) { shown = want; } }
      else fa = easeTo(fa, 1, 7, dt);
      var b = BANDS[shown];
      var wantObj = b.objM / b.lam * LAM;
      objLen = easeTo(objLen, wantObj, 4, dt);
      mk = easeTo(mk, logPos(BANDS[want].f), 3.5, dt);
      var light = shown === 'isik';
      var colE = light ? '#D9822B' : BLUE, colB = light ? '#EBB868' : COPPER;
      var tt = K.reducedMotion ? 0 : t;

      c.save(); c.translate((W - 1120 * s) / 2, (H - 440 * s) / 2); c.scale(s, s);

      /* frequency ribbon */
      var rx0 = 150, rx1 = 1060, ry = 28;
      K.rr(c, rx0, ry - 4, rx1 - rx0, 8, 4); c.fillStyle = '#DCDFE6'; c.fill();
      for (var q = 0; q < KEYS.length; q++) {
        var qx = rx0 + (rx1 - rx0) * logPos(BANDS[KEYS[q]].f);
        c.fillStyle = '#8A909C'; c.beginPath(); c.arc(qx, ry, 3.5, 0, 6.3); c.fill();
      }
      var mx = rx0 + (rx1 - rx0) * mk;
      K.drawGlow(c, colE, mx, ry, 20, 0.5);
      c.fillStyle = colE; c.beginPath(); c.arc(mx, ry, 8, 0, 6.3); c.fill();
      c.strokeStyle = '#FFFFFF'; c.lineWidth = 2.5; c.stroke();
      K.label(c, 'düşük frekans', rx0 - 14, ry + 5, { size: 15, align: 'right', color: MUTED });
      K.label(c, 'yüksek', rx1 + 14, ry + 5, { size: 15, color: MUTED });

      /* names */
      c.save(); c.globalAlpha *= fa;
      K.label(c, b.short, 60, 100, { size: 38, weight: 700, color: INK });
      K.label(c, 'saniyede ' + b.words + ' titreşim', 60, 130, { size: 19, color: MUTED });
      K.label(c, 'λ ' + b.eq + ' ' + b.lamTxt, 1060, 104, { size: 56, weight: 600, mono: true, align: 'right', color: light ? '#B2661A' : COPPER });
      K.label(c, formula(shown), 1060, 134, { size: 15, mono: true, align: 'right', color: INK2 });
      c.restore();

      /* axis and wave */
      c.strokeStyle = 'rgba(89,94,105,0.4)'; c.lineWidth = 1.2; c.setLineDash([4, 5]);
      c.beginPath(); c.moveTo(X0 - 20, CY); c.lineTo(X1, CY); c.stroke(); c.setLineDash([]);
      var step = 3, x, y, ph, env_, e1, bb;
      var pts = [], ptsB = [];
      for (x = X0; x <= X1; x += step) {
        env_ = sstep(X0, X0 + 140, x);
        ph = 2 * Math.PI * ((x - X0) / LAM - FV * tt);
        e1 = A * env_ * Math.sin(ph);
        pts.push(x, CY - e1);
        bb = e1 * 0.78;
        ptsB.push(x + bb * 0.5, CY + bb * 0.34);
      }
      /* stems */
      c.lineWidth = 1;
      for (var i = 0; i < pts.length; i += 12) {
        var sx = pts[i], ey = pts[i + 1], bx = ptsB[i], by = ptsB[i + 1];
        c.strokeStyle = K.rgba(colE, 0.22); c.beginPath(); c.moveTo(sx, CY); c.lineTo(sx, ey); c.stroke();
        c.strokeStyle = K.rgba(colB, 0.26); c.beginPath(); c.moveTo(sx, CY); c.lineTo(bx, by); c.stroke();
      }
      function trace(arr, col, w) {
        c.beginPath();
        for (var j = 0; j < arr.length; j += 2) { if (j === 0) c.moveTo(arr[0], arr[1]); else c.lineTo(arr[j], arr[j + 1]); }
        c.strokeStyle = K.rgba(col, 0.16); c.lineWidth = w + 6; c.lineJoin = 'round'; c.stroke();
        c.strokeStyle = col; c.lineWidth = w; c.stroke();
      }
      trace(ptsB, colB, 2.4);
      trace(pts, colE, 3.4);

      /* antenna: electrons swinging up and down */
      if (!light) {
        var ax = 96, top = CY - 80, bot = CY + 78;
        softShadow(c, ax, bot + 8, 34, 6, 1);
        c.fillStyle = INK2; c.fillRect(ax - 3, top, 6, bot - top);
        c.beginPath(); c.moveTo(ax - 20, bot + 8); c.lineTo(ax + 20, bot + 8); c.lineTo(ax + 8, bot - 6); c.lineTo(ax - 8, bot - 6); c.closePath(); c.fill();
        c.fillStyle = '#E6E8EC'; c.beginPath(); c.arc(ax, top, 6, 0, 6.3); c.fill(); c.strokeStyle = INK2; c.lineWidth = 2; c.stroke();
        for (var ei = 0; ei < 5; ei++) {
          var ey2 = CY - 4 + (ei - 2) * 24 + 26 * Math.sin(2 * Math.PI * FV * tt * 1 + ei * 0.25);
          K.drawSphere(c, '#2848C8', ax, clamp(ey2, top + 12, bot - 14), 5.5);
        }
      } else {
        K.drawGlow(c, '#F2B24A', 96, CY, 70, 0.9);
        K.drawGlow(c, '#FFF3D0', 96, CY, 30, 1);
        c.fillStyle = '#FFF6DC'; c.beginPath(); c.arc(96, CY, 12, 0, 6.3); c.fill();
      }

      /* wavelength bracket riding a crest */
      var wrap = (LAM * (0.25 + FV * tt)) % LAM, xc0 = X0 + wrap;
      var xs0 = xc0 + LAM * Math.ceil((430 - xc0) / LAM);
      var ba = Math.sin(Math.PI * clamp((xs0 - 430) / LAM, 0, 1)) * fa;
      var by0 = CY - A - 32;
      if (ba > 0.02) {
        c.save(); c.globalAlpha *= ba;
        c.strokeStyle = 'rgba(21,23,28,0.35)'; c.lineWidth = 1; c.setLineDash([2, 3]);
        c.beginPath(); c.moveTo(xs0, by0); c.lineTo(xs0, CY - A - 4); c.moveTo(xs0 + LAM, by0); c.lineTo(xs0 + LAM, CY - A - 4); c.stroke(); c.setLineDash([]);
        K.arrow(c, xs0 + LAM / 2 - 14, by0, xs0 + 1, by0, { color: INK, width: 1.6, head: 8 });
        K.arrow(c, xs0 + LAM / 2 + 14, by0, xs0 + LAM - 1, by0, { color: INK, width: 1.6, head: 8 });
        K.label(c, 'λ', xs0 + LAM / 2, by0 + 7, { size: 22, weight: 700, align: 'center', color: INK });
        c.restore();
      }

      /* ruler: λ versus an everyday object */
      var RX = 430, y1 = 352, y2 = 396;
      c.save(); c.globalAlpha *= fa;
      K.rr(c, RX, y1 - 6, LAM, 12, 6); c.fillStyle = light ? '#D9822B' : COPPER; c.fill();
      K.label(c, 'λ', RX - 16, y1 + 7, { size: 22, weight: 700, align: 'right', color: INK });
      K.rr(c, RX, y2 - 6, Math.max(8, objLen), 12, 6); c.fillStyle = INK2; c.fill();
      K.label(c, b.obj, RX + Math.max(8, objLen) + 14, y2 + 6, { size: 20, weight: 600, color: INK });
      c.restore();
      K.label(c, 'yavaşlatılmış: titreşim gerçekte çok daha sık', 1100, 432, { size: 13, mono: true, align: 'right', spacing: 0.3, color: MUTED });
      c.restore();
    }

    return {
      reset: function () { held = null; shown = 'fm'; fa = 1; objLen = BANDS.fm.objM / BANDS.fm.lam * LAM; mk = logPos(BANDS.fm.f); },
      frame: frame,
      set: function (key, val) {
        if (key === 'band' && BANDS[String(val)]) { held = String(val); if (lastT < 0.5) { shown = held; fa = 1; objLen = BANDS[held].objM / BANDS[held].lam * LAM; mk = logPos(BANDS[held].f); } }
      },
      read: function (key) {
        var b = BANDS[cur];
        if (key === 'name') return b.name;
        if (key === 'formula') return formula(cur);
        if (key === 'wavelength') return b.lamTxt;
        if (key === 'band') return cur;
        if (key === 'explain') return b.expl;
        return '';
      },
      dispose: function () { sf.dispose(); }
    };
  });


  /* ==================================================================
   * 4) message-journey · 1120×440 · light (2D)
   * One continuous camera move along the whole route of a voice message:
   * phone → radio wave → mast → fibre (light) → ground dish → satellite → dish → phone.
   * A packet of eight bits travels the path; a chip names what it is made of right now.
   * ================================================================== */
  K.register('message-journey', function (el) {
    var B = base2d(el), sf = B.sf;
    var GY = 300, CY = 372, WORLD = 3420, LOOP = 30;
    var PH1 = 250, PH2 = 3040, PHY = 214, TOW = 680, DISH1 = 1850, DISH2 = 2650, SATX = 2250, SATY = 92;
    var AMBER = '#E0A030', camX = 0, prevCyc = 0, lastT = 0;

    /* packet route: [t0, t1, x0, y0, x1, y1, ease] */
    var ROUTE = [
      [5.2, 11.0, 294, 200, TOW, 98, 'io'],
      [11.0, 12.0, TOW, 98, TOW, CY, 'io'],
      [12.0, 17.0, TOW, CY, DISH1, CY, 'sl'],
      [17.0, 18.0, DISH1, CY, DISH1, 252, 'io'],
      [18.0, 20.6, DISH1, 252, SATX, SATY + 8, 'io'],
      [20.6, 23.2, SATX, SATY + 8, DISH2, 252, 'io'],
      [23.2, 24.2, DISH2, 252, DISH2, 252, 'io'],
      [24.2, 27.0, DISH2, 252, PH2 - 44, 200, 'io']
    ];
    var FORM = [
      [0, 'Ses', INK2], [1.8, 'Elektrik sinyali', BLUE], [3.6, 'Bitler (1 ve 0)', BLUE], [6, 'Radyo dalgası', COPPER],
      [11, 'Elektrik sinyali', BLUE], [12, 'Işık atımları', '#B77A12'], [17.4, 'Radyo dalgası', COPPER],
      [27, 'Bitler (1 ve 0)', BLUE], [28.1, 'Elektrik sinyali', BLUE], [29, 'Ses', INK2]
    ];
    var EXPL = [
      'Sesiniz önce elektrik sinyaline, sonra 1 ve 0’lara dönüşür.',
      'Telefon bitleri radyo dalgasına çevirir; baz istasyonu bu dalgayı yakalar.',
      'Kabloda bitler ışık atımlarıdır; ışık camın içinde yansıyarak ilerler.',
      'Uzak yerlere sinyal bir uyduya çıkıp inebilir: yine radyo dalgası.',
      'Karşı telefon bitleri yeniden elektriğe, sonra sese çevirir.'
    ];
    var BITS = '01001101';
    var chipText_ = '', chipCol = INK2, chipA = 1, chipShown = '';

    function route(t) {
      for (var i = 0; i < ROUTE.length; i++) {
        var r = ROUTE[i];
        if (t >= r[0] && t < r[1]) {
          var u = (t - r[0]) / (r[1] - r[0]);
          u = r[6] === 'io' ? E.sine(u) : u;
          return { x: lerp(r[2], r[4], u), y: lerp(r[3], r[5], u), seg: i, u: (t - r[0]) / (r[1] - r[0]) };
        }
      }
      return null;
    }
    function zig(x) { var p = (x / 38) % 1; if (p < 0) p += 1; return (p < 0.5 ? p * 4 - 1 : 3 - p * 4) * 5.2; }

    /* ---------- scenery ---------- */
    function drawPhone(c, x, y, mode, u, flip) {
      softShadow(c, x, GY + 4, 52, 8, 1);
      c.save();
      K.rr(c, x - 44, y - 82, 88, 164, 16); c.fillStyle = vgrad(c, y - 82, y + 82, [[0, '#4B515E'], [1, '#15171C']]); c.fill();
      c.strokeStyle = 'rgba(255,255,255,0.25)'; c.lineWidth = 1.5; c.stroke();
      K.rr(c, x - 37, y - 74, 74, 148, 10); c.fillStyle = '#F4F6FB'; c.fill();
      c.save(); K.rr(c, x - 37, y - 74, 74, 148, 10); c.clip();
      /* three layers: sound bars, electric line, bits */
      var aBars = 0, aLine = 0, aBits = 0;
      if (!flip) { aBars = 1 - sstep(1.5, 2.1, u); aLine = sstep(1.5, 2.1, u) * (1 - sstep(3.3, 3.9, u)); aBits = sstep(3.3, 3.9, u); }
      else { aBits = 1 - sstep(0.7, 1.3, u); aLine = sstep(0.7, 1.3, u) * (1 - sstep(1.9, 2.5, u)); aBars = sstep(1.9, 2.5, u); }
      var tt = K.reducedMotion ? 0 : lastT;
      if (aBars > 0.01) {
        c.globalAlpha = aBars;
        for (var i = 0; i < 9; i++) {
          var hgt = 14 + 40 * Math.abs(Math.sin(tt * 3.2 + i * 1.7) * Math.cos(tt * 1.3 + i * 0.6));
          c.fillStyle = INK2; K.rr(c, x - 31 + i * 7.4, y - hgt / 2, 5, hgt, 2.5); c.fill();
        }
      }
      if (aLine > 0.01) {
        c.globalAlpha = aLine; c.strokeStyle = BLUE; c.lineWidth = 3; c.beginPath();
        for (var k = 0; k <= 36; k++) { var xx = x - 33 + k * 1.83, yy = y + 24 * Math.sin(k * 0.55 + tt * 5) * Math.sin(k * 0.12 + 0.5); if (k === 0) c.moveTo(xx, yy); else c.lineTo(xx, yy); }
        c.stroke();
      }
      if (aBits > 0.01) {
        c.globalAlpha = aBits;
        c.font = fontOf(15, 600, true); c.fillStyle = BLUE; c.textAlign = 'center'; c.textBaseline = 'middle';
        for (var r = 0; r < 5; r++) {
          var s1 = '';
          for (var b = 0; b < 6; b++) s1 += (hash1(r * 11 + b * 3 + Math.floor(tt * 2.2) * 0.37) > 0.5 ? '1' : '0');
          c.fillText(s1, x, y - 48 + r * 24);
        }
      }
      c.restore();
      c.restore();
    }

    function drawTower(c, x) {
      softShadow(c, x, GY + 4, 56, 8, 1);
      c.strokeStyle = INK2; c.lineWidth = 3.4; c.lineJoin = 'round';
      var topY = 84, lw = function (y) { return lerp(7, 34, (y - topY) / (GY - topY)); };
      c.beginPath(); c.moveTo(x - lw(GY), GY); c.lineTo(x - lw(topY), topY); c.moveTo(x + lw(GY), GY); c.lineTo(x + lw(topY), topY); c.stroke();
      c.lineWidth = 2;
      c.beginPath();
      var left = true;
      for (var y = GY; y > topY + 20; y -= 30) {
        var y2 = y - 30;
        c.moveTo(x - lw(y), y); c.lineTo(x + lw(y2), y2);
        c.moveTo(x + lw(y), y); c.lineTo(x - lw(y2), y2);
        c.moveTo(x - lw(y2), y2); c.lineTo(x + lw(y2), y2);
      }
      c.stroke();
      for (var p = -1; p <= 1; p++) { K.rr(c, x + p * 15 - 5, 70, 10, 38, 3); c.fillStyle = '#F4F4F0'; c.fill(); c.strokeStyle = INK2; c.lineWidth = 1.5; c.stroke(); }
      K.rr(c, x + 38, GY - 40, 52, 40, 4); c.fillStyle = vgrad(c, GY - 40, GY, [[0, '#E4E6EC'], [1, '#B8BCC6']]); c.fill(); c.strokeStyle = INK2; c.lineWidth = 1.5; c.stroke();
    }

    function drawDish(c, x, ang) {
      softShadow(c, x, GY + 4, 46, 7, 1);
      c.fillStyle = INK2; c.fillRect(x - 5, 252, 10, GY - 252);
      K.rr(c, x - 38, GY - 36, 76, 36, 4); c.fillStyle = vgrad(c, GY - 36, GY, [[0, '#E4E6EC'], [1, '#B8BCC6']]); c.fill(); c.strokeStyle = INK2; c.lineWidth = 1.5; c.stroke();
      c.save(); c.translate(x, 250); c.rotate(ang);
      c.beginPath(); c.moveTo(-6, -50); c.quadraticCurveTo(-54, 0, -6, 50); c.quadraticCurveTo(-30, 0, -6, -50); c.closePath();
      c.fillStyle = vgrad(c, -50, 50, [[0, '#FFFFFF'], [1, '#C4C8D2']]); c.fill(); c.strokeStyle = INK2; c.lineWidth = 2; c.stroke();
      c.strokeStyle = INK2; c.lineWidth = 3; c.beginPath(); c.moveTo(-20, 0); c.lineTo(34, 0); c.stroke();
      c.fillStyle = INK; c.beginPath(); c.arc(34, 0, 5, 0, 6.3); c.fill();
      c.restore();
    }

    function drawSat(c, x, y) {
      softShadow(c, x, y + 62, 10, 3, 0);
      c.save(); c.translate(x, y); c.rotate(-0.12);
      [-1, 1].forEach(function (sg) {
        c.save(); c.translate(sg * 74, 0);
        K.rr(c, -46, -17, 92, 34, 3); c.fillStyle = '#1D2A5B'; c.fill();
        c.strokeStyle = 'rgba(190,205,240,0.55)'; c.lineWidth = 1;
        for (var i = 1; i < 4; i++) { c.beginPath(); c.moveTo(-46 + i * 23, -17); c.lineTo(-46 + i * 23, 17); c.stroke(); }
        c.beginPath(); c.moveTo(-46, 0); c.lineTo(46, 0); c.stroke();
        c.strokeStyle = '#C9CCD2'; c.lineWidth = 1.5; K.rr(c, -46, -17, 92, 34, 3); c.stroke();
        c.restore();
        c.fillStyle = '#9AA0AC'; c.fillRect(sg * 24 - 8, -3, 16, 6);
      });
      K.rr(c, -26, -32, 52, 64, 5); c.fillStyle = vgrad(c, -32, 32, [[0, '#E7BE63'], [0.5, '#C99A3E'], [1, '#8F6A22']]); c.fill();
      c.strokeStyle = 'rgba(255,240,190,0.5)'; c.lineWidth = 1;
      for (var j = -2; j <= 2; j++) { c.beginPath(); c.moveTo(-26, j * 12); c.lineTo(26, j * 12 + 4); c.stroke(); }
      c.fillStyle = '#F2F1EC'; c.beginPath(); c.arc(0, 36, 12, 0, Math.PI, false); c.fill(); c.strokeStyle = INK2; c.lineWidth = 1.4; c.stroke();
      c.restore();
    }

    function drawGround(c, x0, x1) {
      c.fillStyle = vgrad(c, GY, 440, [[0, '#E8E3D6'], [1, '#D5CEBD']]);
      c.fillRect(x0, GY, x1 - x0, 440 - GY);
      c.strokeStyle = 'rgba(120,108,84,0.18)'; c.lineWidth = 1;
      for (var i = 0; i < 40; i++) {
        var gx = Math.floor(x0 / 90) * 90 + i * 90 + hash1(i * 3.1 + Math.floor(x0 / 90)) * 40;
        var gy = GY + 12 + hash1(i * 7.7) * 100;
        c.beginPath(); c.moveTo(gx, gy); c.lineTo(gx + 20 + hash1(i) * 22, gy + 2); c.stroke();
      }
      c.strokeStyle = INK2; c.lineWidth = 2; c.beginPath(); c.moveTo(x0, GY); c.lineTo(x1, GY); c.stroke();
    }

    function drawCable(c, t, pkt) {
      var x0 = TOW - 40, x1 = DISH1 + 40;
      /* conduits */
      c.fillStyle = INK2;
      K.rr(c, TOW - 8, GY, 16, CY - GY, 4); c.fill();
      K.rr(c, DISH1 - 8, GY, 16, CY - GY, 4); c.fill();
      /* jacket */
      K.rr(c, x0, CY - 30, x1 - x0, 60, 30); c.fillStyle = vgrad(c, CY - 30, CY + 30, [[0, '#59606E'], [1, '#2B2F38']]); c.fill();
      /* cut-away window: cladding + core */
      var wx0 = TOW + 40, wx1 = DISH1 - 40;
      c.save(); K.rr(c, wx0, CY - 24, wx1 - wx0, 48, 24); c.clip();
      c.fillStyle = vgrad(c, CY - 24, CY + 24, [[0, '#EDF1F8'], [0.5, '#D8DFEC'], [1, '#B9C3D8']]); c.fillRect(wx0, CY - 24, wx1 - wx0, 48);
      c.fillStyle = vgrad(c, CY - 9, CY + 9, [[0, '#FFF4D6'], [0.5, '#F5E2AE'], [1, '#E8C877']]); c.fillRect(wx0, CY - 9, wx1 - wx0, 18);
      c.strokeStyle = 'rgba(120,130,150,0.8)'; c.lineWidth = 1.2;
      c.beginPath(); c.moveTo(wx0, CY - 9); c.lineTo(wx1, CY - 9); c.moveTo(wx0, CY + 9); c.lineTo(wx1, CY + 9); c.stroke();
      /* faint zig-zag ray: total internal reflection */
      c.strokeStyle = 'rgba(224,160,48,0.45)'; c.lineWidth = 1.6; c.beginPath();
      var xs = Math.max(wx0, camX - 20), xe = Math.min(wx1, camX + 1140);
      for (var x = Math.floor(xs / 19) * 19; x <= xe; x += 19) { var yy = CY + zig(x); if (x === Math.floor(xs / 19) * 19) c.moveTo(x, yy); else c.lineTo(x, yy); }
      c.stroke();
      /* light pulses (a stream of bits) */
      var lit = pkt && pkt.seg === 2;
      if (lit) {
        for (var k = 0; k < 5; k++) {
          var px = pkt.x - k * 110 - (k ? 0 : 0);
          if (px < wx0 || px > wx1) continue;
          var a = k === 0 ? 1 : 0.65 - k * 0.1;
          K.drawGlow(c, '#F2B24A', px, CY + zig(px), k === 0 ? 34 : 22, a);
          c.fillStyle = 'rgba(255,250,235,' + a + ')'; c.beginPath(); c.arc(px, CY + zig(px), k === 0 ? 5 : 3.4, 0, 6.3); c.fill();
        }
      }
      c.restore();
      c.strokeStyle = 'rgba(21,23,28,0.45)'; c.lineWidth = 1.5; K.rr(c, wx0, CY - 24, wx1 - wx0, 48, 24); c.stroke();
    }

    function arcs(c, ax, ay, bx, by, prog, half, spacing, col) {
      var d = Math.hypot(bx - ax, by - ay), th = Math.atan2(by - ay, bx - ax), r0 = prog * d;
      c.save(); c.strokeStyle = col; c.lineCap = 'round';
      for (var k = 0; k < 6; k++) {
        var r = r0 - k * spacing;
        if (r < 6) continue;
        c.globalAlpha = (1 - k / 6) * 0.85 * (1 - 0.5 * sstep(0.85, 1, prog));
        c.lineWidth = 3.4 - k * 0.3;
        c.beginPath(); c.arc(ax, ay, r, th - half, th + half); c.stroke();
      }
      c.restore();
    }

    function chip8(c, x, y, a, tt) {
      c.save(); c.globalAlpha *= a;
      K.drawGlow(c, BLUE, x, y, 62, 0.35);
      K.rr(c, x - 44, y - 15, 88, 30, 8); c.fillStyle = vgrad(c, y - 15, y + 15, [[0, '#3F5FCB'], [1, '#1B3390']]); c.fill();
      c.strokeStyle = 'rgba(255,255,255,0.35)'; c.lineWidth = 1; c.stroke();
      c.font = fontOf(16, 600, true); c.fillStyle = '#FFFFFF'; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.fillText(BITS, x, y + 1);
      c.restore();
    }

    function frame(t, dt) {
      lastT = t;
      var W = B.W(), H = B.H(), c = B.begin();
      var s = Math.min(W / 1120, H / 440);
      var cyc = t % LOOP;
      var pkt = route(cyc);
      var segIdx = Math.min(4, Math.floor(cyc / 6));
      /* camera follows the packet, with lag */
      var focus = cyc < 5.2 ? 0 : cyc > 27 ? WORLD : (pkt ? pkt.x - 470 : camX);
      if (pkt && cyc >= 5.2) focus = pkt.x - 470;
      focus = clamp(focus, 0, WORLD - 1120);
      if (cyc < prevCyc) camX = 0;
      prevCyc = cyc;
      camX = easeTo(camX, focus, 2.4, dt);

      c.save(); c.translate((W - 1120 * s) / 2, (H - 440 * s) / 2); c.scale(s, s);
      c.beginPath(); c.rect(0, 0, 1120, 440); c.clip();
      c.save(); c.translate(-Math.round(camX), 0);
      var vx0 = camX - 60, vx1 = camX + 1180;

      drawGround(c, vx0, vx1);
      drawCable(c, cyc, pkt);
      drawTower(c, TOW);
      drawDish(c, DISH1, -0.376);
      drawDish(c, DISH2, -2.76);
      drawSat(c, SATX, SATY);
      drawPhone(c, PH1, PHY, 0, cyc, false);
      drawPhone(c, PH2, PHY, 0, cyc - 27, true);

      /* sound around the phones */
      var sa = env(cyc, 0, 4.6, 0.4, 0.8);
      if (sa > 0.01) {
        for (var k = 0; k < 4; k++) {
          var rr = ((cyc * 36 + k * 30) % 120) + 16;
          c.save(); c.globalAlpha = sa * (1 - rr / 140) * 0.9; c.strokeStyle = INK2; c.lineWidth = 3; c.lineCap = 'round';
          c.beginPath(); c.arc(PH1 - 150, PHY + 6, rr, -0.55, 0.55); c.stroke(); c.restore();
        }
      }
      var sb = env(cyc, 28.6, 30.4, 0.3, 0.1);
      if (sb > 0.01) {
        for (var k2 = 0; k2 < 4; k2++) {
          var r2 = (((cyc - 28.6) * 40 + k2 * 28) % 112) + 12;
          c.save(); c.globalAlpha = sb * (1 - r2 / 130) * 0.9; c.strokeStyle = INK2; c.lineWidth = 3; c.lineCap = 'round';
          c.beginPath(); c.arc(PH2 + 38, PHY - 36, r2, -0.6, 0.6); c.stroke(); c.restore();
        }
      }

      /* radio waves along the radio hops */
      if (pkt) {
        if (pkt.seg === 0) arcs(c, 294, 200, TOW, 98, pkt.u, 0.34, 40, COPPER);
        else if (pkt.seg === 4) arcs(c, DISH1, 252, SATX, SATY + 8, pkt.u, 0.14, 44, COPPER);
        else if (pkt.seg === 5) arcs(c, SATX, SATY + 8, DISH2, 252, pkt.u, 0.14, 44, COPPER);
        else if (pkt.seg === 7) arcs(c, DISH2, 252, PH2 - 44, 200, pkt.u, 0.3, 40, COPPER);
      }

      /* packet */
      if (pkt) {
        var pa = sstep(5.2, 5.6, cyc) * (1 - sstep(26.6, 27.0, cyc));
        if (pkt.seg === 2) {
          /* the light pulses are drawn inside the cable */
        } else {
          chip8(c, pkt.x, pkt.y, pa, cyc);
        }
      }

      /* world labels, fading with distance from the packet */
      var px0 = pkt ? pkt.x : (cyc < 5.2 ? PH1 : PH2);
      function near(x, r) { return 1 - sstep(r, r + 220, Math.abs(px0 - x)); }
      if (sa > 0.01) chipText(c, 'Merhaba!', PH1 - 150, 150, { size: 22, weight: 700, align: 'center', alpha: sa });
      if (sb > 0.01) chipText(c, 'Merhaba!', PH2 + 110, 96, { size: 22, weight: 700, align: 'left', alpha: sb });
      var an = near(TOW, 120) * (pkt && pkt.seg <= 1 ? 1 : 0.0);
      if (an > 0.02) { chipText(c, 'baz istasyonu', TOW + 60, 118, { size: 19, weight: 700, alpha: an }); leader(c, TOW + 20, 100, TOW + 60, 118, an); }
      var af = (pkt && pkt.seg === 2) ? 1 : 0;
      if (af > 0) { chipText(c, 'fiber optik kablo', camX + 560, GY + 22, { size: 19, weight: 700, alpha: af * sstep(12.2, 13, cyc) * (1 - sstep(16.6, 17.2, cyc)) }); }
      var au = (pkt && (pkt.seg === 4 || pkt.seg === 5)) ? 1 : 0;
      if (au > 0) { var aua = au * sstep(18.2, 19, cyc) * (1 - sstep(22.6, 23.4, cyc)); chipText(c, 'uydu', SATX + 130, SATY + 4, { size: 19, weight: 700, alpha: aua }); }
      c.restore();

      /* camera-fixed overlay: what is the message made of right now? */
      var form = FORM[0];
      for (var fi = 0; fi < FORM.length; fi++) if (cyc >= FORM[fi][0]) form = FORM[fi];
      if (chipShown !== form[1]) { chipA = easeTo(chipA, 0, 14, dt); if (chipA < 0.05) { chipShown = form[1]; chipCol = form[2]; } }
      else chipA = easeTo(chipA, 1, 12, dt);
      c.save(); c.globalAlpha *= chipA;
      c.font = fontOf(32, 700); var plw = c.measureText(chipShown).width + 74;
      K.rr(c, 14, 10, plw, 84, 12); c.fillStyle = 'rgba(245,245,241,0.94)'; c.fill();
      K.label(c, 'mesaj şu an', 28, 34, { size: 15, color: MUTED });
      c.fillStyle = chipCol; c.beginPath(); c.arc(38, 68, 8, 0, 6.3); c.fill();
      K.label(c, chipShown, 56, 77, { size: 32, weight: 700, color: INK });
      c.restore();

      /* progress strip */
      var sx0 = 330, sx1 = 790, sy = 424;
      c.strokeStyle = '#CFCFC7'; c.lineWidth = 3; c.lineCap = 'round'; c.beginPath(); c.moveTo(sx0, sy); c.lineTo(sx1, sy); c.stroke();
      var pr = clamp(cyc / LOOP, 0, 1);
      c.strokeStyle = BLUE; c.beginPath(); c.moveTo(sx0, sy); c.lineTo(lerp(sx0, sx1, pr), sy); c.stroke();
      for (var di = 0; di < 5; di++) {
        var dx = lerp(sx0, sx1, (di + 0.5) / 5);
        c.fillStyle = di === segIdx ? BLUE : '#B8BCC6'; c.beginPath(); c.arc(dx, sy, di === segIdx ? 6 : 4, 0, 6.3); c.fill();
      }
      K.label(c, 'yavaşlatılmış', 1100, 430, { size: 13, mono: true, align: 'right', spacing: 0.3, color: MUTED });

      /* seam veil: the loop restarts behind a short fade */
      var veil = sstep(29.3, 29.95, cyc) + (1 - sstep(0.0, 0.5, cyc));
      if (veil > 0.002) { c.fillStyle = 'rgba(245,245,241,' + clamp(veil, 0, 1) + ')'; c.fillRect(-2, -2, 1124, 444); }
      c.restore();
    }

    return {
      reset: function () { camX = 0; prevCyc = 0; chipShown = 'Ses'; chipA = 1; chipCol = INK2; },
      frame: frame,
      read: function (key) {
        var cyc = lastT % LOOP;
        if (key === 'explain') return EXPL[Math.min(4, Math.floor(cyc / 6))];
        if (key === 'stage') return String(Math.min(4, Math.floor(cyc / 6)));
        return '';
      },
      dispose: function () { sf.dispose(); }
    };
  });


  /* ==================================================================
   * 5) copy-noise · 1120×440 · light (2D)
   * Two rows, five copies each. Both rows receive exactly the same noise at every copy step.
   * Analog: the noise stays in the recording and piles up. Digital: the receiver compares with a
   * threshold and rebuilds a clean signal, so the copy equals the original.
   * ================================================================== */
  K.register('copy-noise', function (el) {
    var B = base2d(el), sf = B.sf;
    var NB = 5, BW = 150, BH = 132, GAP = 34, BX0 = 196, LOOP = 14, STEP0 = 1.3, STEPD = 1.9;
    var ROWY = [46, 238];
    var AMP_A = 0.12, AMP_D = 0.13;
    var BITS = [1, 0, 1, 1, 0, 0, 1, 0];
    var lastT = 0;

    function sigA(x) { return 0.5 + 0.28 * Math.sin(6.2832 * 1.35 * x + 0.5) + 0.13 * Math.sin(6.2832 * 3.2 * x + 1.2); }
    function sqD(x) {
      var i = Math.min(7, Math.floor(x * 8)), f = x * 8 - i, v = BITS[i] ? 0.84 : 0.16;
      var edge = 0.12;
      if (f < edge && i > 0) { var pv = BITS[i - 1] ? 0.84 : 0.16; return lerp(pv, v, f / edge); }
      return v;
    }
    /* smooth noise for copy k: cubic interpolation of 16 random knots, plus a little hiss */
    function noise(k, x) {
      var p = x * 15, i = Math.floor(p), f = p - i, g = f * f * (3 - 2 * f);
      var a = hash1(k * 17.3 + i) * 2 - 1, b = hash1(k * 17.3 + i + 1) * 2 - 1;
      return lerp(a, b, g) + 0.28 * Math.sin(x * 90 + k * 5.1) * (hash1(k + 0.5) + 0.4);
    }
    function boxX(i) { return BX0 + i * (BW + GAP); }

    function trace(c, bx, by, fn, col, w, a, revealFrac) {
      var ix = bx + 12, iw = BW - 24, cy = by + BH / 2, ih = BH - 30;
      c.save();
      if (revealFrac < 1) { c.beginPath(); c.rect(bx, by, 12 + iw * revealFrac + 2, BH); c.clip(); }
      c.globalAlpha *= a; c.beginPath();
      var n = 72;
      for (var j = 0; j <= n; j++) {
        var x = j / n, y = cy - (clamp(fn(x), -0.05, 1.05) - 0.5) * ih;
        if (j === 0) c.moveTo(ix + iw * x, y); else c.lineTo(ix + iw * x, y);
      }
      c.strokeStyle = col; c.lineWidth = w; c.lineJoin = 'round'; c.lineCap = 'round'; c.stroke();
      c.restore();
    }

    function frame(t, dt) {
      lastT = t;
      var W = B.W(), H = B.H(), c = B.begin();
      var s = Math.min(W / 1120, H / 440);
      var u = t % LOOP;
      c.save(); c.translate((W - 1120 * s) / 2, (H - 440 * s) / 2); c.scale(s, s);

      for (var row = 0; row < 2; row++) {
        var by = ROWY[row], dig = row === 1;
        var col = dig ? BLUE : COPPER;
        /* arrows and the noise that joins at every copy step */
        for (var i = 0; i < NB; i++) {
          var bx = boxX(i);
          var ts = i === 0 ? -1 : STEP0 + STEPD * (i - 1);
          var shown = i === 0 ? 1 : sstep(ts, ts + 0.3, u);
          softShadow(c, bx + BW / 2, by + BH + 8, BW / 2 - 6, 5, 0.9);
          K.rr(c, bx, by, BW, BH, 10); c.fillStyle = '#FFFFFF'; c.fill();
          c.strokeStyle = '#D6D6CF'; c.lineWidth = 1.5; c.stroke();
          c.strokeStyle = 'rgba(21,23,28,0.1)'; c.lineWidth = 1;
          c.beginPath(); c.moveTo(bx + 10, by + BH / 2); c.lineTo(bx + BW - 10, by + BH / 2); c.stroke();
          /* threshold line */
          if (dig) {
            var th = 0.5, ty = by + BH / 2 - (th - 0.5) * (BH - 30);
            var flash = i === 0 ? 0 : Math.exp(-Math.max(0, u - (ts + 0.9)) * 3) * sstep(ts + 0.85, ts + 0.95, u);
            c.strokeStyle = K.rgba(COPPER, 0.55 + 0.45 * flash); c.lineWidth = 1.6 + flash * 2; c.setLineDash([5, 4]);
            c.beginPath(); c.moveTo(bx + 8, ty); c.lineTo(bx + BW - 8, ty); c.stroke(); c.setLineDash([]);
          }
          /* ghost of the original (end of the story) */
          var gh = sstep(10.2, 11, u) * 0.5;
          if (i > 0 && gh > 0.01) trace(c, bx, by, dig ? sqD : sigA, '#9AA0AC', 1.6, gh, 1);
          /* the signal itself */
          var rev = i === 0 ? 1 : E.inOut(clamp((u - ts) / 0.9, 0, 1));
          if (shown > 0.001) {
            var acc = function (x) { var v = sigA(x); for (var k = 1; k <= i; k++) v += noise(k, x) * AMP_A; return v; };
            if (!dig) trace(c, bx, by, acc, col, 3, 1, rev);
            else if (i === 0) trace(c, bx, by, sqD, col, 3, 1, 1);
            else {
              var cl = sstep(ts + 0.95, ts + 1.5, u);
              var fn = function (x) { return lerp(sqD(x) + noise(i, x) * AMP_D, sqD(x), cl); };
              trace(c, bx, by, fn, col, 3, 1, rev);
            }
          }
          /* box 0 label */
          if (i < NB - 1) {
            var ax0 = bx + BW + 5, ax1 = bx + BW + GAP - 5, ay = by + BH / 2;
            var act = env(u, STEP0 + STEPD * i - 0.9, STEP0 + STEPD * i + 0.1, 0.25, 0.25);
            K.arrow(c, ax0, ay, ax1, ay, { color: '#8A909C', width: 2.2, head: 9 });
            if (act > 0.01) {
              var pxp = lerp(ax0, ax1, clamp((u - (STEP0 + STEPD * i - 0.9)) / 1.0, 0, 1));
              K.drawGlow(c, col, pxp, ay, 20, act);
              /* a little noise squiggle joins the copy */
              c.save(); c.globalAlpha = act; c.strokeStyle = '#6B717D'; c.lineWidth = 2; c.beginPath();
              for (var q = 0; q <= 20; q++) { var qx = ax0 - 2 + q * 1.8, qy = ay - 26 + Math.sin(q * 1.9 + u * 22) * 7 * Math.sin(q * 0.16); if (q === 0) c.moveTo(qx, qy); else c.lineTo(qx, qy); }
              c.stroke(); c.restore();
            }
          }
        }
        /* final outline of the last copy */
        var fin = sstep(9.6, 10.2, u);
        if (fin > 0.01) {
          c.save(); c.globalAlpha = fin; c.strokeStyle = col; c.lineWidth = 3.5;
          K.rr(c, boxX(NB - 1) - 3, by - 3, BW + 6, BH + 6, 13); c.stroke(); c.restore();
        }
        /* row titles */
        K.label(c, dig ? 'DİJİTAL' : 'ANALOG', 36, by + 54, { size: 26, weight: 700, color: col });
        var sub = dig ? (u < 9.6 ? 'kesik çizgi: eşik' : 'yeniden üretilir') : (u < 9.6 ? 'gürültü kayda işler' : 'bozulma birikir');
        K.label(c, sub, 36, by + 82, { size: 18, weight: u < 9.6 ? 400 : 700, color: u < 9.6 ? MUTED : col });
      }
      K.label(c, 'orijinal', boxX(0) + BW / 2, 33, { size: 16, align: 'center', color: MUTED });
      K.label(c, '4. kopya', boxX(NB - 1) + BW / 2, 33, { size: 16, align: 'center', color: MUTED });
      /* seam veil */
      var veil = sstep(LOOP - 0.7, LOOP - 0.1, u) + (1 - sstep(0, 0.4, u)) * (t > 0.5 ? 1 : 0);
      if (veil > 0.002) { c.fillStyle = 'rgba(245,245,241,' + clamp(veil, 0, 1) + ')'; c.fillRect(0, 0, 1120, 440); }
      c.restore();
    }

    return {
      reset: function () { lastT = 0; },
      frame: frame,
      read: function (key) {
        var u = lastT % LOOP;
        if (key === 'explain') {
          if (u < 3) return 'Her kopyalamada kayda aynı küçük gürültü karışır.';
          if (u < 9.6) return 'Analogda gürültü birikir; dijitalde alıcı yalnızca “1 mi, 0 mı?” diye sorar.';
          return 'Sonuç: analog kopya bozuldu, dijital kopya orijinalle aynı.';
        }
        return '';
      },
      dispose: function () { sf.dispose(); }
    };
  });


  /* ==================================================================
   * 7) algo-lamp · 1120×440 · light (2D)
   * Street lamp with a light sensor (LDR) and a motion sensor (PIR). Next to it the logic card:
   * dark? AND motion? → lamp. Three cases of 8 s walk through the truth table:
   * day + walker (0 VE 1 = 0) · night, empty street (1 VE 0 = 0) · night + walker (1 VE 1 = 1).
   * ================================================================== */
  K.register('algo-lamp', function (el) {
    var B = base2d(el), sf = B.sf;
    var CASE = 8, LOOP = 24, GY = 372, POLE = 520, HX = 600, HY = 100;
    var CARD = { x: 730, y: 30, w: 374, h: 300 };
    var dayK = 1, lampA = 0, lastT = 0, st = { dark: 0, mot: 0, out: 0, lx: 12000 };
    var CITY = [[30, 120, 70], [112, 90, 54], [176, 150, 80], [268, 105, 62], [340, 135, 72], [422, 96, 50], [480, 125, 44]];
    var SENT = [
      'Gündüz: ışık çok, “karanlık” 0. Biri geçse bile lamba yanmaz (0 VE 1 = 0).',
      'Gece ama sokak boş: karanlık 1, hareket 0. Lamba yine yanmaz (1 VE 0 = 0).',
      'Gece ve biri yaklaşıyor: karanlık 1 VE hareket 1. Lamba yanar (1 VE 1 = 1).'
    ];

    function fmtLux(x) { return K.num(Math.round(x)) + ' lx'; }

    function person(c, x, col, phase) {
      c.save(); c.translate(x, GY);
      c.strokeStyle = col; c.fillStyle = col; c.lineCap = 'round';
      var sw = Math.sin(phase) * 13;
      c.lineWidth = 8;
      c.beginPath(); c.moveTo(0, -48); c.lineTo(sw, -2); c.moveTo(0, -48); c.lineTo(-sw, -2); c.stroke();      // legs
      c.lineWidth = 15; c.beginPath(); c.moveTo(0, -102); c.lineTo(0, -52); c.stroke();                       // torso
      c.lineWidth = 6; c.beginPath(); c.moveTo(0, -98); c.lineTo(-sw * 0.8, -62); c.moveTo(0, -98); c.lineTo(sw * 0.8, -62); c.stroke();  // arms
      c.beginPath(); c.arc(1, -118, 12, 0, 6.3); c.fill();
      c.restore();
    }

    function frame(t, dt) {
      lastT = t;
      var W = B.W(), H = B.H(), c = B.begin();
      var s = Math.min(W / 1120, H / 440);
      var u = t % LOOP, ci = Math.floor(u / CASE), cu = u - ci * CASE;
      var wantDay = ci === 0 ? 1 : 0;
      dayK = easeTo(dayK, wantDay, 2.2, dt);
      var hasPerson = ci !== 1;
      var px = -40 + 100 * cu;
      var inRange = hasPerson && px > 180 && px < 505;
      var lx = 4 + 11996 * dayK * dayK;
      var dark = lx < 20 ? 1 : 0, mot = inRange ? 1 : 0, out = dark && mot ? 1 : 0;
      st = { dark: dark, mot: mot, out: out, lx: lx };
      lampA = easeTo(lampA, out ? 1 : 0, 9, dt);

      c.save(); c.translate((W - 1120 * s) / 2, (H - 440 * s) / 2); c.scale(s, s);

      /* ---------- street scene (clipped panel) ---------- */
      c.save(); K.rr(c, 0, 0, 704, 440, 16); c.clip();
      var g = c.createLinearGradient(0, 0, 0, GY);
      g.addColorStop(0, K.mix('#0B0F1A', '#BFD6F2', dayK)); g.addColorStop(1, K.mix('#232C42', '#EAF1FA', dayK));
      c.fillStyle = g; c.fillRect(0, 0, 704, 440);
      /* stars, moon, sun */
      for (var i = 0; i < 34; i++) {
        var a = (1 - dayK) * (0.35 + 0.5 * hash1(i * 2.3)) * (0.7 + 0.3 * Math.sin(t * 1.3 + i));
        c.fillStyle = 'rgba(255,255,255,' + a + ')'; c.beginPath(); c.arc(20 + hash1(i * 7.1) * 660, 12 + hash1(i * 3.3) * 150, 0.8 + hash1(i) * 1.2, 0, 6.3); c.fill();
      }
      K.drawGlow(c, '#FFE7A0', 90, 64, 90, 0.8 * dayK);
      c.fillStyle = 'rgba(255,244,205,' + dayK + ')'; c.beginPath(); c.arc(90, 64, 24, 0, 6.3); c.fill();
      c.fillStyle = 'rgba(228,232,244,' + (1 - dayK) + ')'; c.beginPath(); c.arc(90, 64, 20, 0, 6.3); c.fill();
      c.fillStyle = K.mix('#0B0F1A', '#BFD6F2', dayK); c.globalAlpha = 1 - dayK; c.beginPath(); c.arc(100, 58, 18, 0, 6.3); c.fill(); c.globalAlpha = 1;
      /* skyline */
      CITY.forEach(function (b, bi) {
        var bx = b[0], bh = b[1], bw = b[2];
        c.fillStyle = K.mix('#121826', '#B3BDCC', dayK); c.fillRect(bx, GY - bh, bw, bh);
        for (var wy = GY - bh + 12; wy < GY - 14; wy += 18) for (var wx = bx + 8; wx < bx + bw - 10; wx += 14) {
          var on = hash1(bi * 31 + wx * 0.7 + wy * 1.3) > 0.62;
          c.fillStyle = on ? K.rgba('#F2C46B', (1 - dayK) * 0.8) : K.rgba('#FFFFFF', 0.12 * dayK);
          c.fillRect(wx, wy, 6, 8);
        }
      });
      /* ground */
      c.fillStyle = vgrad(c, GY, 440, [[0, K.mix('#232833', '#8E9299', dayK)], [1, K.mix('#161A22', '#74787F', dayK)]]); c.fillRect(0, GY, 704, 440 - GY);
      c.fillStyle = K.mix('#3A4152', '#B9BDC4', dayK); c.fillRect(0, GY, 704, 5);
      /* lamp light on the street */
      if (lampA > 0.01) {
        c.save(); c.globalAlpha = lampA;
        var cone = c.createLinearGradient(0, HY + 24, 0, GY);
        cone.addColorStop(0, 'rgba(255,224,150,0.42)'); cone.addColorStop(1, 'rgba(255,224,150,0.08)');
        c.fillStyle = cone; c.beginPath(); c.moveTo(HX - 14, HY + 26); c.lineTo(HX + 14, HY + 26); c.lineTo(HX + 190, GY); c.lineTo(HX - 190, GY); c.closePath(); c.fill();
        K.drawGlow(c, '#FFD98A', HX, GY + 4, 200, 0.55);
        K.drawGlow(c, '#FFE9B8', HX, HY + 26, 120, 0.9);
        c.restore();
      }
      /* PIR detection cone */
      var cp = c.createLinearGradient(POLE, 0, 160, 0);
      var pa = mot ? 0.26 : 0.09;
      cp.addColorStop(0, K.rgba(BLUE, pa)); cp.addColorStop(1, K.rgba(BLUE, pa * 0.3));
      c.fillStyle = cp; c.beginPath(); c.moveTo(POLE - 12, 204); c.lineTo(160, GY - 120); c.lineTo(160, GY); c.lineTo(POLE - 12, GY); c.closePath(); c.fill();
      c.strokeStyle = K.rgba(BLUE, mot ? 0.7 : 0.35); c.lineWidth = 1.5; c.setLineDash([6, 5]);
      c.beginPath(); c.moveTo(POLE - 12, 204); c.lineTo(160, GY - 120); c.moveTo(POLE - 12, 204); c.lineTo(160, GY); c.stroke(); c.setLineDash([]);

      /* pole, arm, housing */
      softShadow(c, POLE, GY + 6, 40, 7, 1);
      c.fillStyle = vgrad(c, 0, 1, [[0, '#4A505C'], [1, '#2A2E37']]);
      var pg = c.createLinearGradient(POLE - 7, 0, POLE + 7, 0); pg.addColorStop(0, '#5A6170'); pg.addColorStop(0.5, '#868D9C'); pg.addColorStop(1, '#3A3F4A');
      c.fillStyle = pg; c.fillRect(POLE - 7, HY, 14, GY - HY);
      K.rr(c, POLE - 12, GY - 14, 24, 14, 3); c.fill();
      c.fillStyle = pg; c.fillRect(POLE, HY - 5, HX - POLE, 10);
      K.rr(c, HX - 52, HY - 4, 104, 26, 10); c.fillStyle = vgrad(c, HY - 4, HY + 22, [[0, '#6A7180'], [1, '#2E333D']]); c.fill();
      /* bulb */
      c.fillStyle = K.mix('#59606E', '#FFE9B8', lampA); c.beginPath(); c.arc(HX, HY + 24, 13, 0, Math.PI, false); c.fill();
      /* LDR on the head */
      c.fillStyle = '#C9A25B'; c.beginPath(); c.arc(HX + 28, HY - 12, 9, 0, 6.3); c.fill();
      c.strokeStyle = '#5C4318'; c.lineWidth = 1.4; c.beginPath();
      for (var z = 0; z < 6; z++) { var zx = HX + 28 - 5 + z * 2, zy = HY - 12 + (z % 2 ? -4 : 4); if (z === 0) c.moveTo(zx, zy); else c.lineTo(zx, zy); }
      c.stroke();
      /* PIR dome on the pole */
      c.fillStyle = '#F2F3F6'; c.beginPath(); c.arc(POLE - 4, 204, 15, Math.PI * 0.5, Math.PI * 1.5, false); c.fill();
      c.strokeStyle = '#8A909C'; c.lineWidth = 1.3; c.stroke();
      c.strokeStyle = 'rgba(120,126,140,0.7)'; c.beginPath(); c.moveTo(POLE - 18, 204); c.lineTo(POLE - 4, 204); c.moveTo(POLE - 14, 196); c.lineTo(POLE - 4, 196); c.moveTo(POLE - 14, 212); c.lineTo(POLE - 4, 212); c.stroke();

      /* pedestrian */
      if (hasPerson) {
        var lit = clamp(lampA * (1 - Math.abs(px - HX) / 260), 0, 1);
        c.save(); c.globalAlpha = dayK; person(c, px, '#22262E', px * 0.085); c.restore();
        c.save(); c.globalAlpha = 1 - dayK; person(c, px, K.mix('#AEB6C8', '#F0F2F7', lit), px * 0.085); c.restore();
      }
      c.restore();

      /* ---------- leaders from the sensors to the card ---------- */
      c.save(); c.strokeStyle = 'rgba(89,94,105,0.65)'; c.lineWidth = 1.4; c.setLineDash([4, 5]);
      c.beginPath(); c.moveTo(HX + 38, HY - 16); c.lineTo(CARD.x - 4, 124);
      c.moveTo(POLE + 6, 206); c.lineTo(CARD.x - 4, 230); c.stroke(); c.setLineDash([]);
      c.restore();

      /* ---------- logic card ---------- */
      softShadow(c, CARD.x + CARD.w / 2, CARD.y + CARD.h + 12, CARD.w / 2 - 10, 8, 1);
      K.rr(c, CARD.x, CARD.y, CARD.w, CARD.h, 16); c.fillStyle = '#FFFFFF'; c.fill();
      c.strokeStyle = '#D6D6CF'; c.lineWidth = 1.5; c.stroke();
      function pill(x, y, val) {
        K.rr(c, x - 32, y - 24, 64, 48, 12);
        if (val) { c.fillStyle = vgrad(c, y - 24, y + 24, [[0, '#4A66CC'], [1, BLUE]]); c.fill(); }
        else { c.fillStyle = '#F4F4F0'; c.fill(); c.strokeStyle = '#B8BCC6'; c.lineWidth = 2; c.stroke(); }
        K.label(c, val ? '1' : '0', x, y + 12, { size: 34, weight: 700, mono: true, align: 'center', color: val ? '#FFFFFF' : '#8A909C' });
      }
      var y1 = CARD.y + 84, y2 = CARD.y + 198, px0 = CARD.x + 52;
      K.label(c, 'Karanlık mı?', CARD.x + 22, y1 - 34, { size: 20, weight: 700, color: INK });
      K.label(c, 'Hareket var mı?', CARD.x + 22, y2 - 34, { size: 20, weight: 700, color: INK });
      pill(px0, y1, dark); pill(px0, y2, mot);
      K.label(c, 'ışık: ' + fmtLux(lx), px0 - 32, y1 + 44, { size: 16, mono: true, color: MUTED });
      K.label(c, mot ? 'hareket: var' : 'hareket: yok', px0 - 32, y2 + 44, { size: 16, mono: true, color: MUTED });

      /* wires + AND gate */
      var gx = CARD.x + 262, gy = (y1 + y2) / 2, lampX = CARD.x + CARD.w - 46;
      function wire(x0, y0, x1, y1w, on) {
        c.save(); c.lineCap = 'round'; c.lineJoin = 'round';
        c.strokeStyle = on ? COPPER : '#B8BCC6'; c.lineWidth = on ? 4 : 3;
        c.beginPath(); c.moveTo(x0, y0); c.lineTo((x0 + x1) / 2, y0); c.lineTo((x0 + x1) / 2, y1w); c.lineTo(x1, y1w); c.stroke();
        if (on) {
          var L = Math.abs(x1 - x0) + Math.abs(y1w - y0);
          for (var d = 0; d < 3; d++) {
            var f = ((t * 0.9 + d / 3) % 1) * L, xx, yy, half = (x1 - x0) / 2;
            if (f < half) { xx = x0 + f; yy = y0; } else if (f < half + Math.abs(y1w - y0)) { xx = (x0 + x1) / 2; yy = y0 + (y1w > y0 ? 1 : -1) * (f - half); } else { xx = (x0 + x1) / 2 + (f - half - Math.abs(y1w - y0)); yy = y1w; }
            K.drawSphere(c, '#FFFFFF', xx, yy, 3);
          }
        }
        c.restore();
      }
      wire(px0 + 34, y1, gx - 40, gy - 16, dark);
      wire(px0 + 34, y2, gx - 40, gy + 16, mot);
      wire(gx + 40, gy, lampX - 30, gy, out);
      /* gate body */
      c.save();
      c.beginPath(); c.moveTo(gx - 40, gy - 34); c.lineTo(gx, gy - 34); c.arc(gx, gy, 34, -Math.PI / 2, Math.PI / 2, false); c.lineTo(gx - 40, gy + 34); c.closePath();
      c.fillStyle = out ? '#FFF7E2' : '#F4F4F0'; c.fill(); c.strokeStyle = INK; c.lineWidth = 2.5; c.stroke();
      c.restore();
      K.label(c, 'VE', gx - 12, gy + 8, { size: 24, weight: 700, align: 'center', color: INK });
      /* lamp icon */
      K.drawGlow(c, '#F2C46B', lampX, gy, 70, lampA * 0.9);
      c.fillStyle = K.mix('#D9DCE3', '#FFE29A', lampA); c.beginPath(); c.arc(lampX, gy - 4, 21, 0, 6.3); c.fill();
      c.strokeStyle = INK2; c.lineWidth = 2.2; c.stroke();
      c.fillStyle = INK2; K.rr(c, lampX - 11, gy + 16, 22, 11, 3); c.fill();
      K.label(c, 'Lamba', lampX, y1 - 34, { size: 20, weight: 700, align: 'center', color: INK });
      K.label(c, out ? 'yanar' : 'söner', lampX, gy + 54, { size: 20, weight: 700, align: 'center', color: out ? '#A66A0E' : MUTED });

      /* the equation */
      K.label(c, dark + ' VE ' + mot + ' = ' + out, CARD.x + CARD.w / 2, CARD.y + CARD.h - 22, { size: 36, weight: 600, mono: true, align: 'center', color: out ? '#A66A0E' : INK });
      K.label(c, 'sensör ölçer · mantık karar verir · devre uygular', CARD.x + CARD.w / 2, CARD.y + CARD.h + 44, { size: 15, align: 'center', color: MUTED });
      c.restore();
    }

    return {
      reset: function () { dayK = 1; lampA = 0; },
      frame: frame,
      read: function (key) {
        if (key === 'decision') return 'Karanlık (' + st.dark + ') VE hareket (' + st.mot + ') = ' + st.out + ' → lamba ' + (st.out ? 'yanar' : 'söner');
        if (key === 'light') return 'Işık: ' + fmtLux(st.lx);
        if (key === 'motion') return 'Hareket: ' + (st.mot ? 'var' : 'yok');
        if (key === 'explain') return SENT[Math.floor((lastT % LOOP) / CASE)];
        return '';
      },
      dispose: function () { sf.dispose(); }
    };
  });



  /* ==================================================================
   * 6) geo-orbit · 1120×440 · dark
   * One story: Earth turns once in 24 h (view "dunya") → camera pulls back to the geostationary
   * orbit to scale, 6,62 × Earth radius, satellite co-rotating above 42° E ("yorunge") → a signal
   * Ankara → satellite → Europe, 0,24 s ("sinyal"). set('view', ...) holds one view.
   * ================================================================== */
  K.register('geo-orbit', function (el, opts) {
    var THREE = TH();
    var R = 1, RG = 6.62, DEG = Math.PI / 180;
    var v = K.stage3d(el, {
      theme: 'dark', fov: 12, distance: 10.6, yaw: 0, pitch: 0.14, target: [0, 0, 0], near: 1, far: 4000,
      size: 8, shadows: false, minPitch: 0.05, maxPitch: 1.4, minDistance: 8, maxDistance: 60
    });
    v.orbit.dragging = false;
    var S = v.scene;
    var SUN = new THREE.Vector3(-0.62, 0.3, 0.72).normalize();
    if (v.lights) {
      v.lights.key.position.copy(SUN).multiplyScalar(50); v.lights.key.intensity = 1.6;
      v.lights.hemi.intensity = 0.12; v.lights.fill.intensity = 0.08; v.lights.rim.intensity = 0.25;
    }
    function frameView() { }

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
        '  col += vec3(1.0, 0.93, 0.8) * pow(max(dot(Nv, H), 0.0), 160.0) * sm * 0.12 * day;',
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
    var orbit = new THREE.Mesh(new THREE.TorusGeometry(RG, 0.034, 6, 360), new THREE.MeshBasicMaterial({ color: 0x8EA6F2, transparent: true, opacity: 0, depthWrite: false }));
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
    earthG.add(pathLine); pathLine.visible = false;
    var radGeo = new THREE.BufferGeometry().setFromPoints([SUBSAT, satTip.clone().multiplyScalar(0.985)]);
    var radial = new THREE.Line(radGeo, new THREE.LineDashedMaterial({ color: 0x9AA3B2, dashSize: 0.12, gapSize: 0.1, transparent: true, opacity: 0.6 }));
    radial.computeLineDistances();
    earthG.add(radial);
    var pts = glowPoints(8, 0.15, { additive: true, hard: true });
    S.add(pts);
    var pulse = glowPoints(4, 0.45, { additive: true });
    S.add(pulse);

    /* ---------- stars ---------- */
    var stars = glowPoints(5200, 1.15, { additive: true, hard: true, renderOrder: 0 });
    var stars2 = glowPoints(700, 2.1, { additive: true, hard: true, renderOrder: 0 });
    S.add(stars); S.add(stars2);
    (function () {
      var r = K.rng(1971), tmpV = new THREE.Vector3();
      stars.begin(); stars2.begin();
      for (var i = 0; i < 6200; i++) {
        var psi = (r() - 0.5) * 1.0, eps = -0.05 + r() * 0.95;
        tmpV.set(Math.sin(psi) * Math.cos(eps), -Math.sin(eps), -Math.cos(psi) * Math.cos(eps)).multiplyScalar(1500);
        var bright = Math.pow(r(), 3), tint = r();
        var cr = tint < 0.2 ? 1.0 : 0.85, cg = 0.9, cb = tint > 0.7 ? 1.0 : 0.88;
        if (bright > 0.55) stars2.add1(tmpV.x, tmpV.y, tmpV.z, cr, cg, cb, 0.55 + bright * 0.4);
        else stars.add1(tmpV.x, tmpV.y, tmpV.z, cr, cg, cb, 0.18 + bright * 0.75);
      }
      stars.end(); stars2.end();
    })();

    /* ---------- labels ---------- */
    var wSat = new THREE.Vector3(), wAnk = new THREE.Vector3(), wEur = new THREE.Vector3(), wHead = new THREE.Vector3(), tmp = new THREE.Vector3();
    var labSat = setLabelSize(v.label('Türksat 6A', { at: function () { return wSat; }, cls: 'name', dx: 0, dy: -52, align: 'center', valign: 'bottom', line: true }), 19);
    var labTR = setLabelSize(v.label('Ankara', { at: function () { return wAnk; }, cls: 'name chip', dx: 56, dy: -46, line: true, align: 'left', valign: 'middle' }), 17);
    var labEU = setLabelSize(v.label('Avrupa', { at: function () { return wEur; }, cls: 'name chip', dx: -56, dy: -46, line: true, align: 'right', valign: 'middle' }), 17);
    radial.visible = false;

    /* ---------- story ---------- */
    var STG = {
      dunya: { d: 10.6, p: 0.14, tx: 0, ty: 0, ring: 0, satS: 1.5 },
      yorunge: { d: 34, p: 0.42, tx: 0, ty: 0, ring: 1, satS: 1.5 },
      sinyal: { d: 22, p: 0.3, tx: 2.8, ty: -0.4, ring: 1, satS: 1.2 }
    };
    var EXPL = {
      dunya: 'Dünya kendi ekseni çevresinde 24 saatte bir kez döner.',
      yorunge: 'Ekvatorun 35.786 km yukarısındaki uydu da 24 saatte bir tur atar: yerden hep aynı yerde görünür.',
      sinyal: 'Ankara’dan uyduya çıkan ve Avrupa’ya inen sinyal yaklaşık 0,24 saniyede yol alır.'
    };
    var LAP = 33, ROT = 24, PULSE_AT = 3.2, PULSE_EVERY = 7.5;
    var TH_FACE = (-25 - SAT_LON) * DEG;
    var cam, th, held, stage, stageT0, lastT, tagA, sigA;
    function snapCam(k) { cam = { d: STG[k].d, p: STG[k].p, tx: STG[k].tx, ty: STG[k].ty, ring: STG[k].ring, satS: STG[k].satS }; }
    function stageAt(tt) { var c = tt % LAP; return c < 8 ? 'dunya' : c < 19 ? 'yorunge' : 'sinyal'; }
    function reset() {
      held = null; stage = 'dunya'; stageT0 = 0; lastT = 0; th = (-58 - SAT_LON) * DEG;
      snapCam('dunya'); tagA = [0, 0, 0]; sigA = 0;
    }
    reset();

    function frame(t, dt) {
      lastT = t;
      var tt = K.reducedMotion ? 0 : t;
      var want = held || stageAt(tt);
      if (want !== stage) { stage = want; stageT0 = t; }
      var T = STG[stage];
      var kc = 1.5;
      cam.d = easeTo(cam.d, T.d, kc, dt); cam.p = easeTo(cam.p, T.p, kc, dt);
      cam.tx = easeTo(cam.tx, T.tx, kc, dt); cam.ty = easeTo(cam.ty, T.ty, kc, dt);
      cam.ring = easeTo(cam.ring, T.ring, 2, dt); cam.satS = easeTo(cam.satS, T.satS, kc, dt);
      var settled = Math.abs(cam.d - T.d) < 0.05 * T.d;
      v.view.distance = cam.d; v.view.pitch = cam.p; v.view.target.set(cam.tx, cam.ty, 0);
      if (stage === 'sinyal') th = easeTo(th, TH_FACE + Math.PI * 2 * Math.round((th - TH_FACE) / (Math.PI * 2)), 1.4, dt);
      else if (!K.reducedMotion) th += dt * Math.PI * 2 / ROT;
      earthG.rotation.y = th;
      if (clouds) clouds.rotation.y = tt * 0.004;
      orbit.material.opacity = 0.55 * cam.ring;
      orbit.visible = cam.ring > 0.02;
      sat.visible = cam.ring > 0.05;
      sat.scale.setScalar(cam.satS);
      earthG.updateMatrixWorld(true);
      v.applyView(); v.camera.updateMatrixWorld(true);
      earthMat.uniforms.sunDirView.value.copy(SUN).transformDirection(v.camera.matrixWorldInverse);
      var q = new THREE.Quaternion();
      sat.getWorldQuaternion(q);
      tmp.copy(SUN).applyQuaternion(q.invert());
      var wa = Math.atan2(tmp.x, tmp.z);
      wings.forEach(function (w) { w.rotation.y = wa; });
      sat.getWorldPosition(wSat);
      earthG.localToWorld(wAnk.copy(ANK));
      earthG.localToWorld(wEur.copy(EUR));
      var camDir = tmp.copy(v.camera.position).normalize();
      var visA = clamp((wAnk.clone().normalize().dot(camDir) - 0.05) * 6, 0, 1);
      var visE = clamp((wEur.clone().normalize().dot(camDir) - 0.05) * 6, 0, 1);
      var mk = 1 - clamp((cam.d - 24) / 6, 0, 1);
      pts.begin();
      pts.add1(wAnk.x, wAnk.y, wAnk.z, 1.0, 0.62, 0.36, 0.95 * visA * mk);
      pts.add1(wEur.x, wEur.y, wEur.z, 1.0, 0.8, 0.55, 0.75 * visE * mk * (stage === 'sinyal' ? 1 : 0));
      pts.end();
      labTR.show(visA > 0.5 && settled && stage !== 'yorunge');
      labEU.show(visE > 0.5 && settled && stage === 'sinyal');
      labSat.show(settled && stage !== 'dunya');

      /* signal: up-link 1,2 s, down-link 1,2 s (10 × slowed), then hold */
      var ls = t - stageT0;
      var pc = stage === 'sinyal' && ls >= PULSE_AT ? ((ls - PULSE_AT) % PULSE_EVERY) : -1;
      if (K.reducedMotion && stage === 'sinyal') pc = 1.0;
      sigA = easeTo(sigA, stage === 'sinyal' ? 1 : 0, 4, dt);
      var up = span(pc, 0, 1.2), down = span(pc, 1.2, 2.4);
      var fadeP = 1 - span(pc, 4.2, 5.4);
      var head = pc < 0 ? 0 : (pc < 1.2 ? up * 0.5 : 0.5 + down * 0.5);
      for (var i = 0; i < NPATH * 2; i++) {
        var f = i / (NPATH * 2 - 1);
        var lit = pc >= 0 && f <= head ? 1 : 0;
        var hot = lit ? Math.exp(-(head - f) * 18) : 0;
        pathCol[i * 4] = lerp(0.55, 1.0, lit); pathCol[i * 4 + 1] = lerp(0.62, 0.86, lit); pathCol[i * 4 + 2] = lerp(0.72, 0.55, lit);
        pathCol[i * 4 + 3] = sigA * (lit ? ((0.35 + 0.65 * hot) * fadeP + 0.18 * (1 - fadeP)) : 0.2);
      }
      pathGeo.attributes.color.needsUpdate = true;
      pulse.begin();
      if (pc >= 0 && pc < 2.6) {
        var pl = head < 0.5 ? tmp.lerpVectors(ANK, satTip, head * 2) : tmp.lerpVectors(satTip, EUR, (head - 0.5) * 2);
        earthG.localToWorld(pl); wHead.copy(pl);
        pulse.add1(pl.x, pl.y, pl.z, 1.0, 0.86, 0.58, 1.0);
      }
      pulse.end();
      [pts, pulse, stars, stars2].forEach(function (p) { fixPoints(v, p); });
      /* satellite label stays inside the box */
      var sp = v.project(wSat);
      labSat.dx = clamp(sp.x, 90, v.w - 90) - sp.x;
      labSat.dy = sp.y < 90 ? 52 : -52;
      labSat.valign = sp.y < 90 ? 'top' : 'bottom';
      v.render(dt);

      /* the signal path is drawn in 2D so it stays crisp */
      if (sigA > 0.02) {
        var pA = v.project(wAnk), pS = v.project(wSat), pE = v.project(wEur), cc = v.ctx;
        cc.save(); cc.lineCap = 'round'; cc.lineJoin = 'round';
        cc.setLineDash([6, 7]); cc.strokeStyle = 'rgba(190,200,222,' + (0.4 * sigA) + ')'; cc.lineWidth = 1.6;
        cc.beginPath(); cc.moveTo(pA.x, pA.y); cc.lineTo(pS.x, pS.y); cc.lineTo(pE.x, pE.y); cc.stroke(); cc.setLineDash([]);
        if (pc >= 0) {
          var pH = pc < 2.4 ? v.project(wHead) : pE, la = sigA * (pc < 2.4 ? 1 : fadeP);
          cc.beginPath(); cc.moveTo(pA.x, pA.y); if (head >= 0.5) cc.lineTo(pS.x, pS.y); cc.lineTo(pH.x, pH.y);
          cc.strokeStyle = 'rgba(255,200,110,' + (0.28 * la) + ')'; cc.lineWidth = 10; cc.stroke();
          cc.strokeStyle = 'rgba(255,226,170,' + (0.95 * la) + ')'; cc.lineWidth = 3; cc.stroke();
        }
        cc.restore();
      }

      /* 2D overlay: tags and the one big number */
      var c = v.ctx, W = v.w, H = v.h;
      var on = [stage !== 'sinyal' && settled, stage === 'yorunge' && settled, stage === 'sinyal' && settled];
      for (var k = 0; k < 3; k++) tagA[k] = easeTo(tagA[k], on[k] ? 1 : 0, 6, dt);
      K.label(c, 'hızlandırılmış: 1 s = 1 saat', 18, 52, { size: 14, mono: true, spacing: 0.4, color: P.onNightMuted, alpha: tagA[0] });
      K.label(c, 'ölçekli: yörünge yarıçapı = 6,6 × Dünya yarıçapı', 18, 28, { size: 14, mono: true, spacing: 0.4, color: P.onNight, alpha: tagA[1] });
      K.label(c, 'sinyal 10 kat yavaşlatıldı', 18, 28, { size: 14, mono: true, spacing: 0.4, color: P.onNightMuted, alpha: tagA[2] });
      if (sigA > 0.02 && pc >= 0) {
        var realT = Math.min(0.24, pc / 10);
        K.label(c, 'gerçek süre', W - 24, 30, { size: 15, align: 'right', color: P.onNightMuted, alpha: sigA * fadeP });
        K.label(c, '2 × 35.786 km ÷ 300.000 km/s', W - 24, 112, { size: 15, mono: true, align: 'right', color: P.onNightMuted, alpha: sigA * fadeP });
        K.label(c, K.num(realT, 2) + ' s', W - 24, 82, { size: 52, weight: 500, mono: true, align: 'right', color: realT >= 0.24 ? P.lamp : P.onNight, alpha: sigA * fadeP });
      }
    }

    return {
      reset: reset,
      frame: frame,
      set: function (key, val) {
        if (key === 'view' && STG[String(val)]) {
          held = String(val); stage = held; stageT0 = lastT;
          if (lastT < 0.5) { snapCam(held); if (held === 'sinyal') th = TH_FACE; }
        }
      },
      read: function (key) {
        if (key === 'explain') return EXPL[stage];
        if (key === 'view') return stage;
        return '';
      },
      dispose: function () { v.dispose(); }
    };
  });

})();
