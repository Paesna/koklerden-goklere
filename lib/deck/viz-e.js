/* Köklerden Göklere · Builder E · Enerji ve şebeke
 * battery-aa · energy-chain · power-meter · charger-3d · grid-journey
 * Ortak çekirdek: kg-viz.js (KGViz). Sahne birimleri: milimetre (pil, şarj aleti,
 * sayaç) ya da serbest birim (dioramalar). Her şey frame() ile sürülür.
 */
(function () {
  'use strict';
  var K = window.KGViz;
  if (!K) return;
  var PAL = K.palette;
  var TAU = Math.PI * 2;
  var clamp = K.clamp, lerp = K.lerp, span = K.span, EASE = K.ease;

  /* ------------------------------------------------------------------ *
   * Label styles used by this file (scoped class names)
   * ------------------------------------------------------------------ */
  (function injectCss() {
    var mono = K.fonts.mono, sans = K.fonts.sans;
    var css =
      '.kg-l.kge-a{font-family:' + sans + ';font-size:18px;font-weight:600;color:#15171C;letter-spacing:.005em}' +
      '.kg-l.kge-a i{font-style:normal;font-weight:400;color:#595E69}' +
      '.kg-l.kge-s{font-family:' + sans + ';font-size:17px;font-weight:600;color:#15171C}' +
      '.kg-l.kge-s i{font-style:normal;font-weight:400;color:#595E69}' +
      '.kg-l.kge-v{font-family:' + mono + ';font-size:16px;font-weight:600;color:#15171C;background:rgba(255,255,255,.92);border:1px solid #E3E3DD;border-radius:6px;padding:3px 8px}' +
      '.kg-l.kge-v.on{color:#A64B22;border-color:#E9C2A8}' +
      '.kg-l.kge-c{font-family:' + sans + ';font-size:17px;font-weight:600;color:#15171C;background:rgba(255,255,255,.94);border:1px solid #E3E3DD;border-radius:7px;padding:4px 9px}' +
      '.kg-l.kge-c b{font-family:' + mono + ';font-weight:500;color:#A64B22}' +
      '.kg-l.kge-t{font-family:' + mono + ';font-size:11px;font-weight:500;letter-spacing:.1em;color:#595E69}' +
      '.kg-l.kge-u{font-family:' + mono + ';font-size:12px;font-weight:500;color:#3E434D}' +
      '.kg-l.kge-u b{font-weight:600;color:#A64B22}' +
      '.kg-l.kge-p{font-family:' + mono + ';font-size:26px;font-weight:600;color:#15171C}' +
      '.kg-l.kge-p.neg{color:#2343B0}.kg-l.kge-p.pos{color:#A64B22}' +
      '.kg-dark .kg-l.kge-a,.kg-dark .kg-l.kge-s{color:#EEF0F3}.kg-dark .kg-l.kge-a i,.kg-dark .kg-l.kge-s i{color:#9AA3B2}' +
      '.kg-dark .kg-l.kge-v,.kg-dark .kg-l.kge-c{color:#EEF0F3;background:rgba(14,18,26,.88);border-color:#262D3B}' +
      '.kg-dark .kg-l.kge-t{color:#9AA3B2}';
    var s = document.createElement('style');
    s.setAttribute('data-kg-viz-e', '');
    s.textContent = css;
    (document.head || document.documentElement).appendChild(s);
  })();

  /* ------------------------------------------------------------------ *
   * Small helpers
   * ------------------------------------------------------------------ */
  function approach(cur, target, rate, dt) { return cur + (target - cur) * (1 - Math.exp(-rate * dt)); }
  function sstep(a, b, x) { return K.smoothstep(a, b, x); }
  /* 0 → 1 → 0 window: rises over [a, a+r], falls over [b-r, b] */
  function win(t, a, b, r) { return sstep(a, a + r, t) * (1 - sstep(b - r, b, t)); }

  /* Fade a DOM label with inline opacity while keeping the core's hide logic intact */
  function fade(L, a) {
    if (a <= 0.02) {
      if (L.visible) L.show(false);
      if (L.el.style.opacity !== '') L.el.style.opacity = '';
    } else {
      if (!L.visible) L.show(true);
      var s = a >= 0.99 ? '1' : a.toFixed(2);
      if (L.el.style.opacity !== s) L.el.style.opacity = s;
    }
  }
  function setHTML(L, html) { if (L._h !== html) { L._h = html; L.el.innerHTML = html; } }

  function fontsReady() {
    try { return !document.fonts || document.fonts.check('600 20px "IBM Plex Sans"') && document.fonts.check('500 20px "IBM Plex Mono"'); }
    catch (e) { return true; }
  }
  function requestFonts() {
    try {
      if (document.fonts && document.fonts.load) {
        document.fonts.load('600 20px "IBM Plex Sans"');
        document.fonts.load('500 20px "IBM Plex Sans"');
        document.fonts.load('400 20px "IBM Plex Sans"');
        document.fonts.load('500 20px "IBM Plex Mono"');
      }
    } catch (e) { /* ignore */ }
  }
  var SANS = '"IBM Plex Sans", "Segoe UI", sans-serif', MONO = '"IBM Plex Mono", Consolas, monospace';

  /* Canvas texture that can be redrawn once the webfonts are available */
  function liveTexture(w, h, draw, o) {
    var THREE = window.THREE;
    o = o || {};
    var tex = K.textTexture(w, h, draw);
    tex.userData.redraw = function () {
      var c = tex.image, ctx = c.getContext('2d');
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, c.width, c.height);
      draw(ctx, c.width, c.height);
      tex.needsUpdate = true;
    };
    if (o.repeat) { tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.repeat.set(o.repeat[0], o.repeat[1]); }
    return tex;
  }
  /* Calls redraw() on every live texture once fonts become available (checked from frame()) */
  function FontWatch(texes) {
    this.done = fontsReady();
    this.texes = texes;
    if (!this.done) requestFonts();
    else texes.forEach(function (t) { t.userData.redraw(); });
  }
  FontWatch.prototype.tick = function () {
    if (this.done) return;
    if (fontsReady()) { this.done = true; this.texes.forEach(function (t) { t.userData.redraw(); }); }
  };

  /* Seeded noise texture for cut surfaces */
  function grainTexture(size, seed, base, specks, rep) {
    var THREE = window.THREE;
    var tex = K.textTexture(size, size, function (ctx, w, h) {
      var rng = K.rng(seed);
      ctx.fillStyle = base; ctx.fillRect(0, 0, w, h);
      specks.forEach(function (sp) {
        ctx.fillStyle = sp.c;
        ctx.globalAlpha = sp.a === undefined ? 1 : sp.a;
        for (var i = 0; i < sp.n; i++) {
          var x = rng() * w, y = rng() * h, r = sp.r0 + rng() * (sp.r1 - sp.r0);
          for (var ox = -1; ox <= 1; ox++) for (var oy = -1; oy <= 1; oy++) {
            var X = x + ox * w, Y = y + oy * h;
            if (X < -r || X > w + r || Y < -r || Y > h + r) continue;
            ctx.beginPath();
            if (sp.line) { ctx.ellipse(X, Y, r * 0.22, r * 2.6, (rng() - 0.5) * 0.5, 0, TAU); }
            else ctx.arc(X, Y, r, 0, TAU);
            ctx.fill();
          }
        }
        ctx.globalAlpha = 1;
      });
    });
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(rep, rep);
    return tex;
  }

  /* ------------------------------------------------------------------ *
   * Profiles and lathe solids (sharp corners, arc-length UVs, cut faces)
   * ------------------------------------------------------------------ */
  function Profile() { this.p = []; }
  Profile.prototype._push = function (r, y, sharp) {
    var q = this.p[this.p.length - 1];
    if (q && Math.abs(q.r - r) < 1e-6 && Math.abs(q.y - y) < 1e-6) { q.sharp = q.sharp && sharp; return; }
    this.p.push({ r: r, y: y, sharp: sharp });
  };
  Profile.prototype.m = function (r, y) { this._push(r, y, true); return this; };
  Profile.prototype.arc = function (cr, cy, rad, a0, a1, n) {
    n = n || 8;
    for (var i = 0; i <= n; i++) {
      var a = a0 + (a1 - a0) * i / n;
      this._push(cr + rad * Math.cos(a), cy + rad * Math.sin(a), false);
    }
    return this;
  };
  Profile.prototype.pts = function () {
    var p = this.p.slice();
    var a = p[0], b = p[p.length - 1];
    if (p.length > 2 && Math.abs(a.r - b.r) < 1e-6 && Math.abs(a.y - b.y) < 1e-6) { a.sharp = a.sharp && b.sharp; p.pop(); }
    return p;
  };
  Profile.prototype.shape = function () {
    var THREE = window.THREE;
    var p = this.pts();
    var s = new THREE.Shape();
    s.moveTo(p[0].r, p[0].y);
    for (var i = 1; i < p.length; i++) s.lineTo(p[i].r, p[i].y);
    s.closePath();
    return s;
  };

  /* Closed CCW profile in (r, y) revolved around +Y. o: {segs, uv(entry, f) -> [u, v]} */
  function latheGeo(profile, o) {
    var THREE = window.THREE;
    o = o || {};
    var segs = o.segs || 64;
    var pts = profile.pts(), n = pts.length, i;
    var edges = [];
    for (i = 0; i < n; i++) {
      var a = pts[i], b = pts[(i + 1) % n];
      var dx = b.r - a.r, dy = b.y - a.y, len = Math.sqrt(dx * dx + dy * dy) || 1e-9;
      edges.push({ nr: dy / len, ny: -dx / len, len: len });
    }
    var ring = [], acc = 0;
    for (i = 0; i <= n; i++) {
      var k = i % n, p = pts[k];
      var ein = edges[(k - 1 + n) % n], eout = edges[k];
      if (i > 0) acc += edges[i - 1].len;
      if (p.sharp) {
        if (i > 0) ring.push({ r: p.r, y: p.y, nr: ein.nr, ny: ein.ny, s: acc });
        if (i < n) ring.push({ r: p.r, y: p.y, nr: eout.nr, ny: eout.ny, s: acc });
      } else {
        var nr = ein.nr + eout.nr, ny = ein.ny + eout.ny, l = Math.sqrt(nr * nr + ny * ny) || 1;
        ring.push({ r: p.r, y: p.y, nr: nr / l, ny: ny / l, s: acc });
      }
    }
    var total = acc || 1;
    var pos = [], nor = [], uv = [], idx = [];
    for (var j = 0; j < ring.length; j++) {
      var e = ring[j];
      for (var m = 0; m <= segs; m++) {
        var f = m / segs, ph = f * TAU, sn = Math.sin(ph), cs = Math.cos(ph);
        pos.push(e.r * sn, e.y, e.r * cs);
        nor.push(e.nr * sn, e.ny, e.nr * cs);
        if (o.uv) { var u = o.uv(e, f); uv.push(u[0], u[1]); } else uv.push(e.s / total, f);
      }
    }
    var W = segs + 1;
    for (j = 0; j < ring.length - 1; j++) {
      var e0 = ring[j], e1 = ring[j + 1];
      if (Math.abs(e0.r - e1.r) < 1e-7 && Math.abs(e0.y - e1.y) < 1e-7) continue;
      if (e0.r < 1e-7 && e1.r < 1e-7) continue;
      for (m = 0; m < segs; m++) {
        var A = j * W + m, B = A + 1, D = (j + 1) * W + m, C = D + 1;
        idx.push(A, B, D, C, D, B);
      }
    }
    var g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.setIndex(idx);
    return g;
  }

  /* Rounded box centred at the origin (w along x, h along y, d along z) */
  function roundedBox(w, h, d, r, segs) {
    var THREE = window.THREE;
    r = Math.min(r, w / 2 - 1e-3, h / 2 - 1e-3, d / 2 - 1e-3);
    var iw = w - 2 * r, ih = h - 2 * r, c = Math.min(iw, ih) * 0.001 + 1e-4;
    var s = new THREE.Shape();
    var x0 = -iw / 2, y0 = -ih / 2;
    s.moveTo(x0 + c, y0);
    s.lineTo(x0 + iw - c, y0); s.absarc(x0 + iw - c, y0 + c, c, -Math.PI / 2, 0, false);
    s.lineTo(x0 + iw, y0 + ih - c); s.absarc(x0 + iw - c, y0 + ih - c, c, 0, Math.PI / 2, false);
    s.lineTo(x0 + c, y0 + ih); s.absarc(x0 + c, y0 + ih - c, c, Math.PI / 2, Math.PI, false);
    s.lineTo(x0, y0 + c); s.absarc(x0 + c, y0 + c, c, Math.PI, Math.PI * 1.5, false);
    var g = new THREE.ExtrudeGeometry(s, {
      depth: Math.max(1e-4, d - 2 * r), bevelEnabled: true, bevelThickness: r, bevelSize: r,
      bevelSegments: segs || 4, curveSegments: segs || 4, steps: 1
    });
    g.translate(0, 0, -(d - 2 * r) / 2);
    g.computeVertexNormals();
    return g;
  }

  /* Rounded rectangle shape (centred) */
  function rrShape(w, h, r) {
    var THREE = window.THREE;
    var s = new THREE.Shape(), x = -w / 2, y = -h / 2;
    r = Math.min(r, w / 2, h / 2);
    s.moveTo(x + r, y);
    s.lineTo(x + w - r, y); s.absarc(x + w - r, y + r, r, -Math.PI / 2, 0, false);
    s.lineTo(x + w, y + h - r); s.absarc(x + w - r, y + h - r, r, 0, Math.PI / 2, false);
    s.lineTo(x + r, y + h); s.absarc(x + r, y + h - r, r, Math.PI / 2, Math.PI, false);
    s.lineTo(x, y + r); s.absarc(x + r, y + r, r, Math.PI, Math.PI * 1.5, false);
    return s;
  }
  function rrPath(w, h, r, cx, cy) {
    var THREE = window.THREE;
    var s = new THREE.Path(), x = cx - w / 2, y = cy - h / 2;
    r = Math.min(r, w / 2, h / 2);
    s.moveTo(x + r, y);
    s.lineTo(x + w - r, y); s.absarc(x + w - r, y + r, r, -Math.PI / 2, 0, false);
    s.lineTo(x + w, y + h - r); s.absarc(x + w - r, y + h - r, r, 0, Math.PI / 2, false);
    s.lineTo(x + r, y + h); s.absarc(x + r, y + h - r, r, Math.PI / 2, Math.PI, false);
    s.lineTo(x, y + r); s.absarc(x + r, y + r, r, Math.PI, Math.PI * 1.5, false);
    return s;
  }

  /* Polyline with arc-length parametrisation (constant-speed motion) */
  function Poly(points) {
    this.p = points; this.c = [0];
    for (var i = 1; i < points.length; i++) this.c.push(this.c[i - 1] + points[i].distanceTo(points[i - 1]));
    this.len = this.c[this.c.length - 1];
  }
  Poly.prototype.at = function (s, out) {
    var p = this.p, c = this.c, n = p.length;
    if (s <= 0) return out.copy(p[0]);
    if (s >= this.len) return out.copy(p[n - 1]);
    var lo = 0, hi = n - 1;
    while (hi - lo > 1) { var mid = (lo + hi) >> 1; if (c[mid] <= s) lo = mid; else hi = mid; }
    var f = (s - c[lo]) / ((c[hi] - c[lo]) || 1);
    return out.copy(p[lo]).lerp(p[hi], f);
  };
  function curvePoly(curve, n) {
    var pts = [];
    for (var i = 0; i <= n; i++) pts.push(curve.getPoint(i / n));
    return new Poly(pts);
  }
  function v3(x, y, z) { return new window.THREE.Vector3(x, y, z); }

  /* Merge simple non-indexed/indexed geometries that share attributes position+normal(+uv) */
  function mergeGeos(list) {
    var THREE = window.THREE;
    var pos = [], nor = [], idx = [], off = 0;
    list.forEach(function (g) {
      var gi = g.index ? g : g;
      var P = gi.attributes.position, N = gi.attributes.normal;
      for (var i = 0; i < P.count; i++) { pos.push(P.getX(i), P.getY(i), P.getZ(i)); nor.push(N.getX(i), N.getY(i), N.getZ(i)); }
      if (gi.index) { var I = gi.index; for (i = 0; i < I.count; i++) idx.push(I.getX(i) + off); }
      else for (i = 0; i < P.count; i++) idx.push(i + off);
      off += P.count;
    });
    var m = new THREE.BufferGeometry();
    m.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    m.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
    m.setIndex(idx);
    return m;
  }

  /* Compile every material once at creation (all objects temporarily visible),
   * so the first appearance of a part never stalls the slide. */
  function precompile(v) {
    var r = K.renderer();
    if (!r || !v || !v.scene) return;
    var hidden = [];
    v.scene.traverse(function (o) { if (!o.visible) { hidden.push(o); o.visible = true; } });
    try { v.scene.updateMatrixWorld(true); r.compile(v.scene, v.camera); } catch (e) { /* ignore */ }
    for (var i = 0; i < hidden.length; i++) hidden[i].visible = false;
  }
  /* Merge static, untextured meshes per material to cut draw calls. */
  function bakeStatic(scene, exclude) {
    var THREE = window.THREE;
    scene.updateMatrixWorld(true);
    var buckets = {}, order = [];
    scene.traverse(function (o) {
      if (!o.isMesh || o.isInstancedMesh || !o.geometry || !o.material || Array.isArray(o.material)) return;
      if (exclude && exclude(o)) return;
      var m = o.material;
      if (m.map || m.vertexColors || m.transparent || !o.geometry.attributes.normal) return;
      var key = m.uuid + '|' + (o.castShadow ? 1 : 0) + (o.receiveShadow ? 1 : 0);
      if (!buckets[key]) { buckets[key] = []; order.push(key); }
      buckets[key].push(o);
    });
    order.forEach(function (key) {
      var list = buckets[key];
      if (list.length < 2) return;
      var geos = list.map(function (o) { var g = o.geometry.clone(); g.applyMatrix4(o.matrixWorld); return g; });
      var mesh = new THREE.Mesh(mergeGeos(geos), list[0].material);
      mesh.castShadow = list[0].castShadow; mesh.receiveShadow = list[0].receiveShadow;
      list.forEach(function (o) { if (o.parent) o.parent.remove(o); });
      scene.add(mesh);
    });
  }

  /* Small 2D helpers for overlays */
  function tag2d(ctx, text, x, y, o) {
    o = o || {};
    K.label(ctx, text, x, y, { size: o.size || 11, weight: 500, mono: true, color: o.color || PAL.muted, align: o.align || 'left', spacing: o.spacing === undefined ? 1.1 : o.spacing, alpha: o.alpha });
  }

  /* Keep the main object filling the box at any aspect ratio: zoom the camera around its target.
   * ref = aspect the view was composed for; zw = zoom wanted at 1120x440 (aspect 2.545);
   * in-between aspects interpolate, narrower boxes zoom out. Smoothed with dt so mode changes ease. */
  function fitZoom(v, ref, zw, dt) {
    var a = v.sf.w / Math.max(1, v.sf.h);
    var z = a >= ref ? 1 + (zw - 1) * clamp((a - ref) / (2.545 - ref), 0, 1.4) : a / ref;
    var c = v.camera.zoom;
    var n = dt ? c + (z - c) * (1 - Math.exp(-3 * dt)) : z;
    if (Math.abs(c - n) > 1e-4) { v.camera.zoom = n; v.camera.updateProjectionMatrix(); }
    return n;
  }

  /* Mode controller: auto-cycles until the first set() */
  function ModeCycle(modes, period, initial) {
    this.modes = modes; this.period = period; this.initial = initial || modes[0];
    this.reset();
  }
  ModeCycle.prototype.reset = function () { this.auto = true; this.mode = this.initial; this.start = 0; this.idx = this.modes.indexOf(this.initial); };
  ModeCycle.prototype.set = function (m, t) {
    if (this.modes.indexOf(m) < 0) return false;
    this.auto = false;
    if (m !== this.mode) { this.mode = m; this.start = t; }
    return true;
  };
  ModeCycle.prototype.tick = function (t) {
    if (!this.auto) return;
    var k = Math.floor(t / this.period);
    var m = this.modes[(this.modes.indexOf(this.initial) + k) % this.modes.length];
    if (m !== this.mode) { this.mode = m; this.start = k * this.period; }
  };
  ModeCycle.prototype.local = function (t) { return t - this.start; };

  /* Second render pass of the same scene through another camera, drawn into a circle
   * on the visual's 2D canvas (a magnifier inset). Uses the shared renderer. */
  function renderInset(v, cam, cx, cy, rad, alpha) {
    var r = K.renderer();
    if (!r || K.skipRender || alpha <= 0.01) return false;
    var k = v.sf.k, size = Math.max(2, Math.round(rad * 2 * k));
    var cv = r.domElement;
    if (cv.width < size || cv.height < size) return false;
    r.setViewport(0, 0, size, size);
    r.setScissor(0, 0, size, size);
    r.setScissorTest(true);
    r.setClearColor(0x000000, 0);
    r.clear(true, true, true);
    var au = r.shadowMap.autoUpdate;
    r.shadowMap.autoUpdate = false;
    r.render(v.scene, cam);
    r.shadowMap.autoUpdate = au;
    var ctx = v.ctx;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.beginPath(); ctx.arc(cx, cy, rad, 0, TAU); ctx.clip();
    ctx.drawImage(cv, 0, cv.height - size, size, size, cx - rad, cy - rad, rad * 2, rad * 2);
    ctx.restore();
    return true;
  }
  /* Project a world point through an inset camera to canvas px inside the inset square */
  function projInset(cam, p, cx, cy, rad, tmp) {
    tmp.copy(p).project(cam);
    return { x: cx - rad + (tmp.x + 1) * rad, y: cy - rad + (1 - tmp.y) * rad };
  }
  /* Place a unit-height Y-aligned mesh between two points */
  var _up = null, _dir = null;
  function orientBetween(mesh, a, b) {
    var THREE = window.THREE;
    if (!_up) { _up = new THREE.Vector3(0, 1, 0); _dir = new THREE.Vector3(); }
    _dir.subVectors(b, a);
    var len = _dir.length();
    mesh.position.addVectors(a, b).multiplyScalar(0.5);
    if (len > 1e-6) mesh.quaternion.setFromUnitVectors(_up, _dir.multiplyScalar(1 / len));
    mesh.scale.set(1, Math.max(1e-3, len), 1);
  }
  function chip2d(ctx, text, x, y, o) {
    o = o || {};
    ctx.save();
    if (o.alpha !== undefined) ctx.globalAlpha *= o.alpha;
    ctx.font = K.font(o.size || 12, o.weight || 500, o.mono);
    var w = ctx.measureText(text).width, h = (o.size || 12) + 8;
    var bx = o.align === 'right' ? x - w - 14 : o.align === 'center' ? x - w / 2 - 7 : x;
    ctx.fillStyle = o.bg || 'rgba(255,255,255,0.92)';
    K.rr(ctx, bx, y - h / 2, w + 14, h, 5); ctx.fill();
    if (o.border !== false) { ctx.strokeStyle = o.borderColor || 'rgba(21,23,28,0.12)'; ctx.lineWidth = 1; ctx.stroke(); }
    ctx.fillStyle = o.color || PAL.ink;
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    ctx.fillText(text, bx + 7, y + 0.5);
    ctx.restore();
  }

  /* ================================================================== *
   * battery-aa · S 680×520 · light
   * A real AA alkaline cell (LR6): anatomy cutaway, chemistry, 9 V = 6 × 1,5 V
   * Units: millimetres.
   * ================================================================== */
  K.register('battery-aa', function (el, opts) {
    var THREE = window.THREE;
    opts = opts || {};
    var theme = opts.theme || 'light';
    var dark = theme === 'dark';
    var RM = K.reducedMotion;

    var VIEW = {
      anatomi: { yaw: 0.34, pitch: 0.5, distance: 141, target: [0.6, -1.2, 0] },
      calisma: { yaw: 0.3, pitch: 0.46, distance: 214, target: [-10, 2, -14] },
      seri: { yaw: 0.3, pitch: 0.3, distance: 232, target: [160, 20, 4] }
    };
    if (opts.cam && opts.camMode && VIEW[opts.camMode]) {
      var oc = opts.cam;
      VIEW[opts.camMode] = { yaw: oc[0], pitch: oc[1], distance: oc[2], target: [oc[3], oc[4], oc[5]] };
    }
    var v = K.stage3d(el, {
      theme: theme, fov: 24, yaw: VIEW.anatomi.yaw, pitch: VIEW.anatomi.pitch, distance: VIEW.anatomi.distance,
      target: VIEW.anatomi.target, size: 42, ground: -11, minPitch: -0.05, maxPitch: 1.2,
      minDistance: 60, maxDistance: 480, exposure: 1.0, near: 2, far: 3000
    });
    var renderer = K.renderer();
    if (renderer) renderer.localClippingEnabled = true;
    var scene = v.scene;
    var lights = v.lights;
    var keyOff = lights ? lights.key.position.clone() : null;
    if (lights) { lights.key.intensity = 1.35; lights.fill.intensity = 0.5; }

    /* ---------- clipping planes for the quarter cutaway ---------- */
    var clipA = new THREE.Plane(), clipB = new THREE.Plane();
    var planeA = new THREE.Plane(new THREE.Vector3(-1, 0, 0), 0);
    var planeB = new THREE.Plane(new THREE.Vector3(1, 0, 0), 0);
    var CLIP = [clipA, clipB];
    function clipped(m) { m.clippingPlanes = CLIP; m.clipIntersection = true; m.clipShadows = true; return m; }

    /* ---------- printed label ---------- */
    var LBL_W = 1536, LBL_H = 1456, LBL_Y0 = 1.0, LBL_Y1 = 48.5;
    function drawDC(ctx, x, y, w, lw, col) {
      ctx.fillStyle = col;
      ctx.fillRect(x, y, w, lw);
      var dash = w / 5;
      for (var i = 0; i < 3; i++) ctx.fillRect(x + i * dash * 2, y + lw * 2.6, dash, lw);
    }
    function drawLabel(ctx, W, H) {
      var mx = W / (LBL_Y1 - LBL_Y0), my = H / (TAU * 7.25);
      ctx.fillStyle = '#1C2028'; ctx.fillRect(0, 0, W, H);
      /* + end band: brushed metallic print with a copper hairline */
      var bx0 = W - 7.6 * mx, bx1 = W - 1.0 * mx;
      var g = ctx.createLinearGradient(bx0, 0, bx1, 0);
      g.addColorStop(0, '#6F757D'); g.addColorStop(0.45, '#8B9199'); g.addColorStop(1, '#7A8088');
      ctx.fillStyle = g; ctx.fillRect(bx0, 0, bx1 - bx0, H);
      ctx.fillStyle = '#C8693A'; ctx.fillRect(bx0 - 1.2 * mx, 0, 0.42 * mx, H);
      /* − end hairline */
      ctx.fillStyle = 'rgba(238,240,243,0.45)'; ctx.fillRect(3.4 * mx, 0, 0.16 * mx, H);
      ctx.textBaseline = 'middle';
      /* fine print band that stays visible in the open (cutaway) pose */
      [0.318, 0.818].forEach(function (f) {
        var cy = f * H;
        ctx.textAlign = 'left';
        ctx.fillStyle = 'rgba(238,240,243,0.86)';
        ctx.font = '500 ' + Math.round(1.55 * my) + 'px ' + MONO;
        if ('letterSpacing' in ctx) ctx.letterSpacing = Math.round(0.3 * mx) + 'px';
        ctx.fillText('ALKALİN · LR6 · AA', 6.0 * mx, cy);
        var xs = 6.0 * mx + ctx.measureText('ALKALİN · LR6 · AA').width + 2.4 * mx;
        if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
        ctx.font = '600 ' + Math.round(1.9 * my) + 'px ' + SANS;
        ctx.fillText('1,5 V', xs, cy + 0.05 * my);
        var tw0 = ctx.measureText('1,5 V').width;
        drawDC(ctx, xs + tw0 + 0.8 * mx, cy - 0.55 * my, 2.2 * mx, 0.17 * my, 'rgba(238,240,243,0.86)');
        ctx.fillStyle = '#1C2028';
        var pcx = W - 4.3 * mx, ps = 2.2 * mx, pt = 0.46 * mx;
        ctx.fillRect(pcx - ps / 2, cy - pt / 2, ps, pt);
        ctx.fillRect(pcx - pt / 2, cy - ps / 2, pt, ps);
        ctx.fillStyle = '#EEF0F3';
        ctx.fillRect(1.0 * mx, cy - 0.24 * my, 1.4 * mx, 0.48 * my);
      });
      [0.09, 0.59].forEach(function (f) {
        var cy = f * H;
        /* + mark on the band */
        ctx.fillStyle = '#1C2028';
        var pcx = (bx0 + bx1) / 2, ps = 3.0 * mx, pt = 0.6 * mx;
        ctx.fillRect(pcx - ps / 2, cy - pt / 2, ps, pt);
        ctx.fillRect(pcx - pt / 2, cy - ps / 2, pt, ps);
        /* − mark near the negative end */
        ctx.fillStyle = '#EEF0F3';
        ctx.fillRect(1.0 * mx, cy - 0.3 * my, 1.7 * mx, 0.6 * my);
        /* main value, "1,5 V" */
        ctx.textAlign = 'left';
        ctx.fillStyle = '#F4F4F1';
        var fs = Math.round(7.0 * my);
        ctx.font = '600 ' + fs + 'px ' + SANS;
        ctx.fillText('1,5', 12.6 * mx, cy + 0.25 * my);
        var w15 = ctx.measureText('1,5').width;
        ctx.font = '400 ' + fs + 'px ' + SANS;
        ctx.fillText('V', 12.6 * mx + w15 + 0.32 * fs, cy + 0.25 * my);
        /* AA badge */
        var bxa = 30.4 * mx, bw = 6.6 * mx, bh = 4.6 * my;
        ctx.strokeStyle = '#EEF0F3'; ctx.lineWidth = 0.26 * mx;
        K.rr(ctx, bxa, cy - bh / 2, bw, bh, 1.0 * mx); ctx.stroke();
        ctx.fillStyle = '#EEF0F3';
        ctx.font = '600 ' + Math.round(3.1 * my) + 'px ' + SANS;
        ctx.textAlign = 'center';
        ctx.fillText('AA', bxa + bw / 2, cy + 0.18 * my);
        /* small print */
        ctx.textAlign = 'left';
        ctx.fillStyle = 'rgba(238,240,243,0.8)';
        ctx.font = '500 ' + Math.round(1.5 * my) + 'px ' + MONO;
        if ('letterSpacing' in ctx) ctx.letterSpacing = Math.round(0.34 * mx) + 'px';
        ctx.fillText('ALKALİN', 5.2 * mx, cy - 4.3 * my);
        ctx.fillText('LR6', 30.4 * mx, cy - 4.3 * my);
        if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
        ctx.font = '500 ' + Math.round(1.32 * my) + 'px ' + MONO;
        ctx.fillStyle = 'rgba(238,240,243,0.55)';
        ctx.fillText('şarj edilmez · ateşe atılmaz', 5.2 * mx, cy + 4.5 * my);
        ctx.fillStyle = 'rgba(238,240,243,0.2)';
        ctx.fillRect(5.2 * mx, cy - 3.15 * my, 31.8 * mx, 0.09 * my);
      });
    }
    var labelTex = liveTexture(LBL_W, LBL_H, drawLabel);
    var texCath = grainTexture(256, 11, '#24262A', [
      { c: '#34373D', n: 1000, r0: 2, r1: 6 }, { c: '#151618', n: 520, r0: 2, r1: 5 }, { c: '#4E525A', n: 180, r0: 1.4, r1: 2.6, a: 0.75 }], 1 / 3);
    var texGel = grainTexture(256, 23, '#E4E6E9', [
      { c: '#8F959C', n: 760, r0: 2.5, r1: 6.5 }, { c: '#71777F', n: 340, r0: 2, r1: 4 }, { c: '#F4F6F8', n: 300, r0: 1, r1: 2.2 }], 1 / 3);
    var texSep = grainTexture(256, 37, '#F1EBDA', [
      { c: '#DDD4BE', n: 260, r0: 3, r1: 6, line: true, a: 0.9 }, { c: '#FFFFFF', n: 120, r0: 2, r1: 4, line: true, a: 0.7 }], 1 / 2);
    var fw = new FontWatch([labelTex]);

    /* ---------- materials ---------- */
    var mSteel = clipped(K.mat.steel({ color: 0xCED2D7, roughness: 0.2, metalness: 1, envMapIntensity: 1.1 }));
    var mLabel = clipped(new THREE.MeshPhysicalMaterial({ map: labelTex, roughness: 0.36, metalness: 0, clearcoat: 0.65, clearcoatRoughness: 0.14 }));
    var mCath = clipped(K.mat.std(0x26282C, 0.85, 0));
    var mSep = clipped(K.mat.std(0xEFE8D6, 0.9, 0));
    var mGel = clipped(K.mat.std(0x7D838A, 0.6, 0.15));
    var mBrass = clipped(K.mat.std(0xD1A85A, 0.28, 1));
    var mSeal = clipped(K.mat.std(0xE4DECF, 0.5, 0));
    function cutMat(color, rough, metal, map) {
      return K.mat.std(color, rough, metal, { side: THREE.DoubleSide, map: map || null, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 });
    }
    var cSteel = cutMat(0xC8CCD2, 0.32, 1);
    var cLabel = cutMat(0x2A2E36, 0.6, 0);
    var cCath = cutMat(0xFFFFFF, 0.88, 0, texCath);
    var cSep = cutMat(0xFFFFFF, 0.92, 0, texSep);
    var GEL0 = new THREE.Color(0x80868D), GEL1 = new THREE.Color(0xC9C3B6);
    var cGel = cutMat(0xFFFFFF, 0.66, 0.12, texGel); cGel.color.copy(GEL0);
    var cBrass = cutMat(0xD6AF63, 0.36, 1);
    var cSeal = cutMat(0xE9E4D6, 0.55, 0);

    /* ---------- AA cell geometry (lathe coordinates: r, y; y = 0 at the − cap) ---------- */
    var P = {};
    P.can = new Profile().m(5.9, 0.1).m(6.25, 0.1).arc(6.25, 1.0, 0.9, -Math.PI / 2, 0, 8)
      .m(7.15, 48.5).arc(6.35, 48.5, 0.8, 0, Math.PI / 2, 8)
      .m(3.05, 49.3).arc(3.05, 49.6, 0.3, -Math.PI / 2, -Math.PI, 5)
      .m(2.65, 50.15).arc(2.3, 50.15, 0.35, 0, Math.PI / 2, 5)
      .m(0, 50.5).m(0, 50.2).m(2.0, 50.2).arc(2.0, 49.85, 0.35, Math.PI / 2, 0, 5)
      .m(2.45, 49.3).arc(2.75, 49.3, 0.3, Math.PI, Math.PI * 1.5, 5)
      .m(6.35, 49.0).arc(6.35, 48.5, 0.5, Math.PI / 2, 0, 8)
      .m(6.85, 1.0).arc(6.25, 1.0, 0.6, 0, -Math.PI / 2, 8)
      .m(5.9, 0.4);
    P.label = new Profile().m(6.0, 0.0).m(6.25, 0.0).arc(6.25, 1.0, 1.0, -Math.PI / 2, 0, 8)
      .m(7.25, 48.5).arc(6.35, 48.5, 0.9, 0, Math.PI / 2, 8)
      .m(5.4, 49.4).m(5.4, 49.3)
      .m(6.35, 49.3).arc(6.35, 48.5, 0.8, Math.PI / 2, 0, 8)
      .m(7.15, 1.0).arc(6.25, 1.0, 0.9, 0, -Math.PI / 2, 8)
      .m(6.0, 0.1);
    P.cath = new Profile().m(4.5, 5.0).m(6.84, 5.0).m(6.84, 48.4).m(6.3, 48.97).m(4.5, 48.97);
    P.sep = new Profile().m(4.18, 3.1).m(4.5, 3.1).m(4.5, 48.97).m(0, 48.97).m(0, 48.72).m(4.18, 48.72);
    P.gel = new Profile().m(0.7, 6.6).m(4.18, 6.6).m(4.18, 48.72).m(0, 48.72).m(0, 37.7).arc(0, 37.0, 0.7, Math.PI / 2, 0, 6);
    P.nail = new Profile().m(0, 0.25).m(1.3, 0.25).m(1.3, 0.55).m(0.7, 0.55).m(0.7, 37.0).arc(0, 37.0, 0.7, 0, Math.PI / 2, 6);
    P.seal = new Profile().m(0.7, 0.9).m(1.7, 0.9).m(1.7, 2.6).m(5.4, 2.6).m(5.4, 0.42).m(6.2, 0.42).m(6.8, 1.05)
      .m(6.8, 4.9).m(5.95, 4.9).m(5.95, 3.1).m(1.7, 3.1).m(1.7, 5.6).m(0.7, 5.6);
    P.cap = new Profile().m(0, 0).m(4.95, 0).m(5.35, 0.4).m(5.35, 1.5).m(5.1, 1.5).m(5.1, 0.5).m(4.85, 0.25).m(0, 0.25);

    var aaRoot = new THREE.Group(); scene.add(aaRoot);
    var cellOuter = new THREE.Group(); aaRoot.add(cellOuter); cellOuter.rotation.z = -Math.PI / 2;
    var cellRoll = new THREE.Group(); cellOuter.add(cellRoll);
    var cell = new THREE.Group(); cellRoll.add(cell); cell.position.y = -25.25;
    var facesA = [], facesB = [];
    function addPart(prof, solid, cut, segs, uvFn, cast) {
      var mesh = new THREE.Mesh(latheGeo(prof, { segs: segs, uv: uvFn }), solid);
      mesh.castShadow = !!cast; mesh.receiveShadow = true;
      cell.add(mesh);
      var sg = new THREE.ShapeGeometry(prof.shape(), 4);
      var fa = new THREE.Mesh(sg, cut), fb = new THREE.Mesh(sg, cut);
      fa.rotation.y = fb.rotation.y = -Math.PI / 2;
      fa.receiveShadow = fb.receiveShadow = true;
      cell.add(fa); cell.add(fb);
      facesA.push(fa); facesB.push(fb);
      return mesh;
    }
    addPart(P.label, mLabel, cLabel, 144, function (e, f) { return [clamp((e.y - LBL_Y0) / (LBL_Y1 - LBL_Y0), 0, 1), 1 - f]; }, true);
    addPart(P.can, mSteel, cSteel, 144, null, true);
    addPart(P.cath, mCath, cCath, 72);
    addPart(P.sep, mSep, cSep, 72);
    addPart(P.gel, mGel, cGel, 72);
    addPart(P.nail, mBrass, cBrass, 40);
    addPart(P.seal, mSeal, cSeal, 72);
    addPart(P.cap, mSteel, cSteel, 96, null, true);

    function applyCut(theta) {
      var open = theta > 0.002;
      for (var i = 0; i < facesA.length; i++) {
        facesA[i].visible = open; facesB[i].visible = open;
        facesB[i].rotation.y = -Math.PI / 2 + theta;
      }
      planeB.normal.set(Math.cos(theta), 0, -Math.sin(theta));
      planeB.constant = 0;
      aaRoot.updateMatrixWorld(true);
      clipA.copy(planeA).applyMatrix4(cellRoll.matrixWorld);
      clipB.copy(planeB).applyMatrix4(cellRoll.matrixWorld);
    }
    /* points on the two cut faces, in world space */
    function faceAPoint(r, y, lift, out) { out.set(lift === undefined ? 0.05 : lift, y, r); return cell.localToWorld(out); }
    function faceBPoint(r, y, lift, out) { out.set(r, y, lift === undefined ? 0.05 : lift); return cell.localToWorld(out); }

    /* ---------- holder, wires and bulb (mode "calisma") ---------- */
    var rig = new THREE.Group(); scene.add(rig);
    var rigMats = [];
    function rigMat(m, base) { rigMats.push(m); m.userData.baseOpacity = base === undefined ? 1 : base; return m; }
    var mHolder = rigMat(K.mat.std(0x25282E, 0.55, 0));
    var mNickel = rigMat(K.mat.steel({ color: 0xC6CAD0, roughness: 0.25 }));
    var mBase = rigMat(K.mat.std(0x2C3037, 0.48, 0));
    var mSocket = rigMat(K.mat.std(0xC9CDD2, 0.3, 1));
    var mCore = rigMat(K.mat.copper({ roughness: 0.32 }));
    var mSheath = rigMat(new THREE.MeshStandardMaterial({ color: 0xF4F3EE, roughness: 0.2, metalness: 0, transparent: true, opacity: 0.34, depthWrite: false }), 0.34);
    var mGlass = rigMat(new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.05, metalness: 0, transparent: true, opacity: 0.24, depthWrite: false, clearcoat: 1, clearcoatRoughness: 0.05, emissive: 0xF2C46B, emissiveIntensity: 0 }), 0.24);
    var mStem = rigMat(new THREE.MeshStandardMaterial({ color: 0xf4f4f0, roughness: 0.1, transparent: true, opacity: 0.45, depthWrite: false }), 0.45);
    var mFil = rigMat(K.mat.std(0x8A8F99, 0.4, 0.8, { emissive: 0xFFC46B, emissiveIntensity: 0 }));

    (function buildHolder() {
      var s = new THREE.Shape();
      var Rt = 8.0, yTop = -4.4, zW = 8.4;
      var zr = Math.sqrt(Rt * Rt - yTop * yTop), a0 = Math.atan2(yTop, zr);
      s.moveTo(-zW, -10.6); s.lineTo(zW, -10.6); s.lineTo(zW, yTop); s.lineTo(zr, yTop);
      for (var i = 1; i <= 24; i++) { var a = a0 + (-Math.PI - 2 * a0) * (i / 24); s.lineTo(Math.cos(a) * Rt, Math.sin(a) * Rt); }
      s.lineTo(-zW, yTop); s.closePath();
      var g = new THREE.ExtrudeGeometry(s, { depth: 56.0, bevelEnabled: true, bevelThickness: 0.4, bevelSize: 0.4, bevelSegments: 2, curveSegments: 6 });
      g.translate(0, 0, -56.0 / 2 - 2.0);
      g.rotateY(Math.PI / 2);
      var trough = new THREE.Mesh(g, mHolder);
      trough.castShadow = true; trough.receiveShadow = true;
      rig.add(trough);
      var wl = new THREE.Mesh(roundedBox(2.6, 15.6, 17.6, 0.9, 3), mHolder);
      wl.position.set(-32.1, -3.2, 0); wl.castShadow = wl.receiveShadow = true; rig.add(wl);
      var wr = new THREE.Mesh(roundedBox(2.6, 15.6, 17.6, 0.9, 3), mHolder);
      wr.position.set(27.6, -3.2, 0); wr.castShadow = wr.receiveShadow = true; rig.add(wr);
      var pts = [], turns = 5.5, N = 220;
      for (i = 0; i <= N; i++) {
        var u = i / N, ang = u * turns * TAU, rad = lerp(4.0, 1.5, u);
        pts.push(new THREE.Vector3(lerp(-30.8, -25.55, u), Math.sin(ang) * rad, Math.cos(ang) * rad));
      }
      var spring = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 360, 0.3, 8, false), mNickel);
      spring.castShadow = true; rig.add(spring);
      var plate = new THREE.Mesh(roundedBox(0.5, 7.0, 6.4, 0.2, 2), mNickel);
      plate.position.set(26.04, 0, 0); rig.add(plate);
      var dimple = new THREE.Mesh(new THREE.SphereGeometry(1.4, 20, 12, 0, TAU, 0, Math.PI / 2), mNickel);
      dimple.rotation.z = Math.PI / 2; dimple.position.set(25.79, 0, 0); dimple.scale.set(1, 0.35, 1);
      rig.add(dimple);
    })();

    /* bulb (E10, 1,5 V) in a socket on a small stand, behind the holder */
    var BULB = new THREE.Vector3(8, -11, -40);
    var filamentWorld = new THREE.Vector3();
    var bulbLight = new THREE.PointLight(0xF2C46B, 0, 140, 2);
    (function buildBulb() {
      var g = new THREE.Group(); g.position.copy(BULB); rig.add(g);
      var base = new Profile().m(0, 0).m(8.7, 0).arc(8.7, 0.9, 0.9, -Math.PI / 2, 0, 5).m(9.6, 2.2).arc(8.8, 2.2, 0.8, 0, Math.PI / 2, 5).m(2.6, 3.0).m(2.6, 7.0).m(0, 7.0);
      var bm = new THREE.Mesh(latheGeo(base, { segs: 64 }), mBase); bm.castShadow = bm.receiveShadow = true; g.add(bm);
      var sock = new Profile().m(0, 7.0).m(5.0, 7.0).m(5.0, 13.2).arc(4.6, 13.2, 0.4, 0, Math.PI / 2, 4).m(4.2, 13.6).m(4.2, 13.2).m(0, 13.2);
      var sm = new THREE.Mesh(latheGeo(sock, { segs: 56 }), mSocket); sm.castShadow = true; g.add(sm);
      var th = new Profile();
      th.m(0, 13.2);
      for (var i = 0; i <= 40; i++) th._push(3.95 + 0.2 * Math.sin(i / 40 * TAU * 2.5), 13.2 + i * 0.09, false);
      th.m(3.95, 16.9).m(3.4, 16.9).m(0, 16.9);
      var tm = new THREE.Mesh(latheGeo(th, { segs: 48 }), mSocket); g.add(tm);
      var gl = new Profile().m(0, 16.9).m(3.4, 16.9).m(3.4, 18.6);
      var cy = 24.2, R = 5.8, yy = cy - Math.sqrt(R * R - 3.4 * 3.4);
      gl.m(3.4, yy).arc(0, cy, R, Math.atan2(yy - cy, 3.4), Math.PI / 2, 20);
      var glass = new THREE.Mesh(latheGeo(gl, { segs: 48 }), mGlass); glass.renderOrder = 3; g.add(glass);
      var supL = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 7.4, 6), mNickel); supL.position.set(-1.6, 21.2, 0); g.add(supL);
      var supR = supL.clone(); supR.position.x = 1.6; g.add(supR);
      var stem = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 1.3, 2.6, 16), mStem);
      stem.position.set(0, 18.6, 0); g.add(stem);
      var fp = [];
      for (i = 0; i <= 160; i++) {
        var u = i / 160, a = u * 9 * TAU;
        fp.push(new THREE.Vector3(lerp(-1.6, 1.6, u), 24.9 + Math.sin(a) * 0.3 + Math.sin(u * Math.PI) * 0.35, Math.cos(a) * 0.3));
      }
      var fil = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(fp), 320, 0.07, 5, false), mFil);
      g.add(fil);
      [-5.4, 5.4].forEach(function (x) {
        var sc = new THREE.Mesh(new THREE.CylinderGeometry(1.15, 1.15, 0.8, 20), mSocket);
        sc.position.set(x, 3.2, 5.6); g.add(sc);
      });
      filamentWorld.set(BULB.x, BULB.y + 25.0, BULB.z);
      bulbLight.position.set(BULB.x, BULB.y + 25.0, BULB.z + 3);
      scene.add(bulbLight);
    })();

    var B = BULB;
    var negWire = new THREE.CatmullRomCurve3([
      v3(-33.4, -7.8, -6.0), v3(-37.0, -9.7, -13), v3(-30, -9.9, -27), v3(-12, -9.9, -33.5), v3(B.x - 7.6, -8.6, B.z + 6.4), v3(B.x - 5.4, -7.2, B.z + 5.6)
    ], false, 'catmullrom', 0.5);
    var posWire = new THREE.CatmullRomCurve3([
      v3(B.x + 5.4, -7.2, B.z + 5.6), v3(B.x + 7.6, -8.6, B.z + 6.4), v3(24, -9.9, -31.5), v3(33.2, -9.8, -22), v3(33.6, -9.6, -12), v3(28.9, -7.8, -6.0)
    ], false, 'catmullrom', 0.5);
    [negWire, posWire].forEach(function (c) {
      var core = new THREE.Mesh(new THREE.TubeGeometry(c, 160, 0.42, 8, false), mCore); core.castShadow = true; rig.add(core);
      var sh = new THREE.Mesh(new THREE.TubeGeometry(c, 160, 1.15, 14, false), mSheath); sh.renderOrder = 2; rig.add(sh);
    });
    var extPts = [];
    (function () {
      var i;
      extPts.push(v3(-25.4, 0, 0), v3(-28.5, 0, 0), v3(-30.9, 0, 0), v3(-32.2, -3.6, -2.4), v3(-33.4, -7.8, -6.0));
      for (i = 1; i <= 80; i++) extPts.push(negWire.getPoint(i / 80));
      extPts.push(v3(B.x - 3.0, B.y + 3.2, B.z + 2.0), v3(B.x - 1.4, B.y + 8.0, B.z), v3(B.x - 1.6, B.y + 17.6, B.z), v3(B.x - 1.6, B.y + 24.9, B.z));
      for (i = 1; i <= 24; i++) extPts.push(v3(B.x + lerp(-1.6, 1.6, i / 24), B.y + 24.9 + Math.sin(i / 24 * Math.PI) * 0.35, B.z + 0.3));
      extPts.push(v3(B.x + 1.6, B.y + 17.6, B.z), v3(B.x + 1.4, B.y + 8.0, B.z), v3(B.x + 3.0, B.y + 3.2, B.z + 2.0), v3(B.x + 5.4, B.y + 3.8, B.z + 5.6));
      for (i = 1; i <= 80; i++) extPts.push(posWire.getPoint(i / 80));
      extPts.push(v3(27.8, -3.6, -2.4), v3(26.6, 0, 0), v3(25.9, 0, 0), v3(25.35, 0, 0));
    })();
    var EXT = new Poly(extPts);

    /* ---------- chemistry (lathe coordinates on cut face A) ---------- */
    var DS = 3.0;                 /* electron spacing along the chain, mm */
    var NZ = 22;                  /* zinc atoms that react during one discharge */
    var rngZ = K.rng(4242);
    var zOrder = [];
    (function () {
      for (var i = 0; i < NZ; i++) {
        var y = lerp(9.0, 45.6, (i + 0.5) / NZ) + (rngZ() - 0.5) * 1.0;
        var r = [1.7, 2.75, 3.5][i % 3] + (rngZ() - 0.5) * 0.2;
        zOrder.push({ y: y, r: r });
      }
      for (i = zOrder.length - 1; i > 0; i--) { var j = Math.floor(rngZ() * (i + 1)); var tt = zOrder[i]; zOrder[i] = zOrder[j]; zOrder[j] = tt; }
    })();
    var LIFT = 0.6;
    function anodePath(site) {
      return new Poly([v3(LIFT, site.y, site.r), v3(LIFT, site.y - 0.5, Math.max(0.95, site.r - 1.2)), v3(LIFT, site.y - 1.1, 0.36), v3(LIFT, 1.2, 0.36), v3(LIFT, 0.3, 0.12)]);
    }
    function cathodePath(y, rc) {
      return new Poly([v3(LIFT, 50.45, 0.15), v3(LIFT, 50.35, 2.1), v3(LIFT, 49.15, 2.6), v3(LIFT, 49.15, 6.2), v3(LIFT, 48.5, 7.0), v3(LIFT, y + 0.9, 7.0), v3(LIFT, y, rc)]);
    }
    var zPaths = zOrder.map(anodePath);
    var Lz = zPaths.map(function (p) { return p.len; });
    var N0 = 2;
    zOrder.forEach(function (s, k) { N0 = Math.max(N0, Math.ceil(Lz[k] / DS - 2 * k - 0.5)); });
    var PEND = N0 + 2 * NZ;
    var LEXT = EXT.len;
    var MLAG = 0;
    zOrder.forEach(function (s, k) {
      var lc = cathodePath(s.y, 5.6).len;
      MLAG = Math.max(MLAG, Math.ceil(((Lz[k] + LEXT + lc) / DS + 5) / 2));
    });
    function slotSite(n) {
      var j = Math.floor((n - N0) / 2) + MLAG;
      var ev = ((j % NZ) + NZ) % NZ;
      return { y: zOrder[ev].y, rc: 5.45 + ((n & 1) ? 0.85 : 0.0) };
    }
    var cathCache = {};
    function cathFor(n) {
      var c = cathCache[n];
      if (!c) { var s = slotSite(n); c = cathCache[n] = cathodePath(s.y, s.rc); }
      return c;
    }
    /* discharge progress: flow profile → conveyor position P(u), u ∈ [0, 1] */
    var FLOW_N = 600, flowCum = new Float32Array(FLOW_N + 1);
    (function () {
      var acc = 0;
      for (var i = 1; i <= FLOW_N; i++) {
        var u = (i - 0.5) / FLOW_N;
        acc += sstep(0, 0.03, u) * (1 - 0.5 * sstep(0.55, 0.9, u)) * (1 - sstep(0.86, 1.0, u));
        flowCum[i] = acc;
      }
      for (i = 0; i <= FLOW_N; i++) flowCum[i] /= acc;
    })();
    function convP(u) {
      if (u <= 0) return 0;
      if (u >= 1) return PEND;
      var x = u * FLOW_N, i = Math.floor(x), f = x - i;
      return PEND * lerp(flowCum[i], flowCum[i + 1], f);
    }
    function convRate(u) {
      if (u <= 0 || u >= 1) return 0;
      var du = 0.002;
      return (convP(Math.min(1, u + du)) - convP(Math.max(0, u - du))) / (2 * du);
    }
    var T_SETUP = 1.6, T_RUN = 8.0;
    var PEAK_RATE = 1;
    (function () { var m = 0; for (var i = 1; i < 200; i++) m = Math.max(m, convRate(i / 200) / T_RUN); PEAK_RATE = m || 1; })();

    var mZn = K.mat.std(0xDDE2E8, 0.17, 0.92, { envMapIntensity: 1.35 });
    var mZnO = K.mat.std(0xFAF8F2, 0.55, 0, { emissive: 0xffffff, emissiveIntensity: 0.12 });
    var mOH = K.mat.std(0x7E94E2, 0.4, 0, { emissive: 0x2A44A8, emissiveIntensity: 0.25 });
    var mH = K.mat.std(0xF6F7FA, 0.4, 0);
    var mE = K.mat.electron(dark);
    var mAbs = K.mat.glowBasic(0x8EA6F2, 0);
    var znMesh = K.instanced(NZ, { radius: 0.62, material: mZn, detail: 2 });
    var znoMesh = K.instanced(NZ, { radius: 0.66, material: mZnO, detail: 2 });
    var MAXOH = 48;
    var ohMesh = K.instanced(MAXOH, { radius: 0.4, material: mOH, detail: 2 });
    var hMesh = K.instanced(MAXOH, { radius: 0.23, material: mH, detail: 1 });
    var MAXEI = 80;
    var eInMesh = K.instanced(MAXEI, { radius: 0.36, material: mE, detail: 2 });
    cell.add(znMesh); cell.add(znoMesh); cell.add(ohMesh); cell.add(hMesh); cell.add(eInMesh);
    var MAXEX = Math.ceil(LEXT / DS) + 4;
    var eExMesh = K.instanced(MAXEX, { radius: 0.55, material: mE, detail: 2 });
    scene.add(eExMesh);

    /* magnifier camera (frontal to cut face A) */
    var camI = new THREE.PerspectiveCamera(20, 1, 1, 600);
    var INSET = { x: 128, y: 132, r: 108, focusY: 27.0, focusR: 3.7, span: 9.8 };

    /* ---------- 9 V battery: six cells in series (mode "seri") ---------- */
    var NINE = new THREE.Vector3(160, -11, 0);
    var nine = new THREE.Group(); nine.position.copy(NINE); scene.add(nine);
    var mJacket = new THREE.MeshPhysicalMaterial({ color: 0x1C2028, roughness: 0.36, metalness: 0.15, clearcoat: 0.6, clearcoatRoughness: 0.16, transparent: false, opacity: 1 });
    var mBottom = K.mat.steel({ color: 0xC9CDD2, roughness: 0.25 });
    var mTop = K.mat.std(0x2A2E35, 0.5, 0);
    var mSnap = K.mat.steel({ color: 0xD3D6DB, roughness: 0.18 });
    var mStrip = K.mat.steel({ color: 0xC4C8CE, roughness: 0.28 });
    var mStripOn = K.mat.std(0xD08A5C, 0.3, 1, { emissive: 0xC8693A, emissiveIntensity: 0.55 });
    var CELL_R = 4.15, CELL_H = 42.5, CELL_Y = 1.6;
    var PACK_X = 8.6, PACK_Z = 4.3, ROW_X = 12.4;
    var packSlots = [[-1, 1], [0, 1], [1, 1], [1, -1], [0, -1], [-1, -1]];
    var cells9 = [], rings9 = [], ringMats = [];
    var jacket, jacketDecal, bottomPlate, topPlate, strips = [], leads = [];
    (function build9() {
      var i;
      var outer = rrShape(26.5, 17.5, 2.0);
      outer.holes.push(rrPath(25.9, 16.9, 1.7, 0, 0));
      var jg = new THREE.ExtrudeGeometry(outer, { depth: 45.4, bevelEnabled: false, curveSegments: 10 });
      jg.rotateX(-Math.PI / 2);
      jacket = new THREE.Mesh(jg, mJacket);
      jacket.position.y = 0.6; jacket.castShadow = true; jacket.receiveShadow = true;
      nine.add(jacket);
      var dtex = liveTexture(1024, 1692, function (ctx, W, H) {
        ctx.clearRect(0, 0, W, H);
        var mm = W / 23;
        ctx.fillStyle = '#C8693A'; ctx.fillRect(0, 2.6 * mm, W, 0.45 * mm);
        ctx.fillStyle = '#F4F4F1';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.font = '600 ' + Math.round(9.0 * mm) + 'px ' + SANS;
        ctx.fillText('9 V', W / 2, H * 0.4);
        ctx.font = '500 ' + Math.round(1.6 * mm) + 'px ' + MONO;
        if ('letterSpacing' in ctx) ctx.letterSpacing = Math.round(0.4 * mm) + 'px';
        ctx.fillStyle = 'rgba(238,240,243,0.8)';
        ctx.fillText('ALKALİN', W / 2, H * 0.6);
        ctx.fillText('6LR61', W / 2, H * 0.655);
        if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
        ctx.fillStyle = 'rgba(238,240,243,0.25)'; ctx.fillRect(4 * mm, H * 0.545, W - 8 * mm, 0.12 * mm);
      });
      fw.texes.push(dtex);
      if (fw.done) dtex.userData.redraw();
      var mDecal = new THREE.MeshPhysicalMaterial({ map: dtex, transparent: true, roughness: 0.34, metalness: 0, clearcoat: 0.6, clearcoatRoughness: 0.16, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
      jacketDecal = new THREE.Mesh(new THREE.PlaneGeometry(23, 38), mDecal);
      jacketDecal.position.set(0, 22.7, 8.77);
      jacket.add(jacketDecal);
      bottomPlate = new THREE.Mesh(roundedBox(26.3, 1.0, 17.3, 0.4, 2), mBottom);
      bottomPlate.position.y = 0.5; bottomPlate.receiveShadow = true; nine.add(bottomPlate);
      var cellProf = new Profile().m(0, 0).m(CELL_R - 0.5, 0).arc(CELL_R - 0.5, 0.5, 0.5, -Math.PI / 2, 0, 4)
        .m(CELL_R, CELL_H - 0.5).arc(CELL_R - 0.5, CELL_H - 0.5, 0.5, 0, Math.PI / 2, 4).m(0, CELL_H);
      var nubProf = new Profile().m(0, 0).m(1.6, 0).m(1.6, 0.6).arc(1.3, 0.6, 0.3, 0, Math.PI / 2, 3).m(0, 0.9);
      var capProf = new Profile().m(0, 0).m(CELL_R - 0.4, 0).m(CELL_R - 0.4, 0.3).m(0, 0.3);
      var cellGeo = latheGeo(cellProf, { segs: 48 });
      var nubGeo = latheGeo(nubProf, { segs: 24 });
      var capGeo = latheGeo(capProf, { segs: 32 });
      var mSleeve = new THREE.MeshPhysicalMaterial({ color: 0x343A45, roughness: 0.36, metalness: 0.05, clearcoat: 0.5, clearcoatRoughness: 0.2 });
      for (i = 0; i < 6; i++) {
        var cg = new THREE.Group();
        var sl = packSlots[i];
        cg.userData.pack = new THREE.Vector3(sl[0] * PACK_X, CELL_Y, sl[1] * PACK_Z);
        cg.userData.row = new THREE.Vector3((i - 2.5) * ROW_X, CELL_Y, 9);
        cg.position.copy(cg.userData.pack);
        var body = new THREE.Mesh(cellGeo, mSleeve); body.castShadow = true; body.receiveShadow = true; cg.add(body);
        var plusTop = (i % 2 === 1);
        var nub = new THREE.Mesh(nubGeo, mSnap);
        var capm = new THREE.Mesh(capGeo, mSnap);
        if (plusTop) { nub.position.y = CELL_H; capm.rotation.x = Math.PI; capm.position.y = 0.25; }
        else { capm.position.y = CELL_H - 0.25; nub.rotation.x = Math.PI; nub.position.y = 0.0; }
        cg.add(nub); cg.add(capm);
        var rm = K.mat.std(0xC8693A, 0.4, 0.3, { emissive: 0xC8693A, emissiveIntensity: 0 });
        ringMats.push(rm);
        var ring = new THREE.Mesh(new THREE.TorusGeometry(CELL_R + 0.03, 0.2, 8, 48), rm);
        ring.rotation.x = Math.PI / 2; ring.position.y = plusTop ? CELL_H - 3.0 : 3.0;
        cg.add(ring);
        cg.userData.plusTop = plusTop;
        nine.add(cg);
        cells9.push(cg);
      }
      /* series connections (chain neighbours): bottom 1-2, top 2-3, bottom 3-4, top 4-5, bottom 5-6 */
      [[0, 1, false], [1, 2, true], [2, 3, false], [3, 4, true], [4, 5, false]].forEach(function (d) {
        var m = new THREE.Mesh(roundedBox(1, 0.3, 3.0, 0.12, 2), mStrip);
        m.userData.a = d[0]; m.userData.b = d[1]; m.userData.top = d[2];
        nine.add(m); strips.push(m);
      });
      topPlate = new THREE.Group();
      var plate = new THREE.Mesh(roundedBox(25.8, 2.6, 16.8, 0.8, 3), mTop);
      plate.position.y = 1.3; plate.castShadow = true; plate.receiveShadow = true; topPlate.add(plate);
      var pp = new Profile().m(0, 0).m(3.0, 0).m(3.0, 0.6).m(2.3, 0.9).m(2.3, 1.7).arc(2.6, 2.4, 0.76, -Math.PI * 0.62, Math.PI * 0.5, 8).m(0, 3.16);
      var plus = new THREE.Mesh(latheGeo(pp, { segs: 40 }), mSnap); plus.position.set(6.35, 2.6, 0); plus.castShadow = true; topPlate.add(plus);
      var hexS = new THREE.Shape();
      for (i = 0; i < 6; i++) { var a = i / 6 * TAU + Math.PI / 6; if (i === 0) hexS.moveTo(Math.cos(a) * 4.4, Math.sin(a) * 4.4); else hexS.lineTo(Math.cos(a) * 4.4, Math.sin(a) * 4.4); }
      var hole = new THREE.Path(); hole.absarc(0, 0, 2.7, 0, TAU, true); hexS.holes.push(hole);
      var hg = new THREE.ExtrudeGeometry(hexS, { depth: 3.0, bevelEnabled: true, bevelThickness: 0.25, bevelSize: 0.25, bevelSegments: 2, curveSegments: 20 });
      hg.rotateX(-Math.PI / 2);
      var minus = new THREE.Mesh(hg, mSnap); minus.position.set(-6.35, 2.6, 0); minus.castShadow = true; topPlate.add(minus);
      topPlate.position.y = 46.0;
      nine.add(topPlate);
      var mLead = K.mat.steel({ color: 0xC4C8CE, roughness: 0.3 });
      for (i = 0; i < 2; i++) {
        var ld = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 1, 8), mLead);
        nine.add(ld); leads.push(ld);
      }
    })();

    /* ---------- DOM labels ---------- */
    var aLabels = [];
    function anat(html, fn, dx, dy) {
      var L = v.label(html, { at: fn, cls: 'kge-a', dx: dx, dy: dy, line: true, html: true, align: 'center', valign: dy < 0 ? 'bottom' : 'top' });
      L.show(false);
      aLabels.push(L);
      return L;
    }
    function onA(r, y) { var w = new THREE.Vector3(); return function () { return faceAPoint(r, y, 0.05, w); }; }
    function onB(r, y) { var w = new THREE.Vector3(); return function () { return faceBPoint(r, y, 0.05, w); }; }
    function onCell(x, y, z) { var w = new THREE.Vector3(), l = new THREE.Vector3(x, y, z); return function () { return cell.localToWorld(w.copy(l)); }; }
    anat('çelik gövde <i>(+ toplayıcı)</i>', onA(7.0, 41.0), 30, -62);
    anat('mangan dioksit <i>(+ uç)</i>', onA(5.8, 27.0), -4, -78);
    anat('ayırıcı', onA(4.34, 13.5), -70, -66);
    anat('çinko tozu jeli <i>(− uç)</i>', onB(2.6, 31.0), 70, 100);
    anat('pirinç toplayıcı çivi', onB(0.4, 18.0), -60, 104);

    var cMinus = v.label('−', { at: [-32.1, 5.4, 0], cls: 'kge-p neg', dx: 0, dy: -12 });
    var cPlus = v.label('+', { at: [27.6, 5.4, 0], cls: 'kge-p pos', dx: 0, dy: -12 });
    var cDead = v.label('Biten pil: çinko tükenir, elektron değil', { at: [0, -11, 10], cls: 'kge-c', dy: 30 });
    var cElec = v.label('elektronlar', { at: function () { return tmpL.copy(negWire.getPoint(0.62)); }, cls: 'kge-t', dx: 0, dy: 16 });
    var tmpL = new THREE.Vector3();
    [cMinus, cPlus, cDead, cElec].forEach(function (L) { L.show(false); });

    var sLabels = [];
    var sumLabel = v.label('', { at: [NINE.x, NINE.y + 74, 9], cls: 'kge-c', html: true });
    sumLabel.show(false);
    for (var si = 0; si < 6; si++) {
      (function (ci) {
        var w = new THREE.Vector3();
        var L = v.label('1,5 V', { at: function () { return cells9[ci].localToWorld(w.set(0, -1.2, 0)); }, cls: 'kge-v', dy: 18 });
        L.show(false);
        sLabels.push(L);
      })(si);
    }
    var tmpT1 = new THREE.Vector3(), tmpT2 = new THREE.Vector3();
    var termMinus = v.label('−', { at: function () { return topPlate.localToWorld(tmpT1.set(-6.35, 6.6, 0)); }, cls: 'kge-p neg', dy: -8 });
    var termPlus = v.label('+', { at: function () { return topPlate.localToWorld(tmpT2.set(6.35, 6.6, 0)); }, cls: 'kge-p pos', dy: -8 });
    termMinus.show(false); termPlus.show(false);

    /* ---------- state ---------- */
    var modes = new ModeCycle(['anatomi', 'calisma', 'seri'], 12, 'anatomi');
    var st = {};
    var chem = { left: 1, bright: 0, dead: 0 };
    function setHome(V) {
      v.home.yaw = V.yaw; v.home.pitch = V.pitch; v.home.distance = V.distance; v.home.target.fromArray(V.target);
    }
    function resetState() {
      modes.reset();
      st.cut = 0; st.rig = 0; st.prevMode = null; st.count = -1; st.seriActive = false; st.lt9 = -1;
      chem.left = 1; chem.bright = 0; chem.dead = 0;
      v.setView(VIEW.anatomi);
      setHome(VIEW.anatomi);
    }
    function setRigOpacity(a) {
      rig.visible = a > 0.01;
      for (var i = 0; i < rigMats.length; i++) {
        var m = rigMats[i], base = m.userData.baseOpacity;
        var wantT = base < 1 || a < 0.999;
        if (m.transparent !== wantT) { m.transparent = wantT; m.needsUpdate = true; }
        m.opacity = base * a;
      }
    }

    var ROLL_FINAL = -Math.PI / 2 + 0.1;
    var CAL_PERIOD_MANUAL = 14.6, SERI_PERIOD_MANUAL = 14.5;
    var wv = new THREE.Vector3(), wv2 = new THREE.Vector3(), wv3 = new THREE.Vector3();
    var lastT = 0;

    function frame(t, dt) {
      lastT = t;
      fw.tick();
      modes.tick(t);
      var mode = modes.mode, lt = modes.local(t);
      var manual = !modes.auto;
      if (manual && mode === 'anatomi') lt = lt % 16;
      if (mode !== st.prevMode) {
        st.prevMode = mode;
        var V = VIEW[mode];
        if (t > 0.05) v.animateTo(V, 1.6); else v.setView(V);
        setHome(V);
      }
      if (RM) lt = Math.max(lt, mode === 'anatomi' ? 9 : mode === 'calisma' ? 6.6 : 10);

      /* ---- AA cell: roll and cut ---- */
      var wantCut = 0, roll = ROLL_FINAL;
      if (mode === 'anatomi') {
        var rollT = RM ? 1 : EASE.sine(span(lt, 0.0, 3.5));
        roll = ROLL_FINAL - (1 - rollT) * Math.PI * 1.5;
        wantCut = lt > 3.4 ? 1 : 0;
      } else if (mode === 'calisma') wantCut = 1;
      st.cut = RM ? wantCut : approach(st.cut, wantCut, wantCut > st.cut ? 2.4 : 4.0, dt);
      aaRoot.visible = !(mode === 'seri' && lt > 1.9);
      cellRoll.rotation.y = roll;
      aaRoot.rotation.y = (mode === 'anatomi' && !RM) ? Math.sin(Math.max(0, lt - 4.2) * 0.42) * 0.11 * sstep(4.0, 6.0, lt) : 0;
      applyCut(EASE.inOut(clamp(st.cut, 0, 1)) * Math.PI / 2);

      /* ---- rig (holder, bulb, wires) ---- */
      var rigTarget = mode === 'calisma' ? 1 : 0;
      st.rig = RM ? rigTarget : approach(st.rig, rigTarget, 3.0, dt);
      setRigOpacity(EASE.inOut(clamp(st.rig, 0, 1)));

      /* ---- chemistry ---- */
      var period = manual ? CAL_PERIOD_MANUAL : 1e9;
      var clt = mode === 'calisma' ? (manual ? lt % period : lt) : 0;
      var u = (clt - T_SETUP) / T_RUN;
      var Pc = mode === 'calisma' ? convP(u) : 0;
      var rate = mode === 'calisma' ? convRate(u) / T_RUN : 0;
      var restore = manual && mode === 'calisma' ? sstep(period - 1.6, period - 0.3, clt) : 0;
      var showChem = mode === 'calisma' ? sstep(0.4, 1.2, clt) * (lt < 1.0 ? sstep(0.4, 1.2, lt) : 1) : 0;
      updateChem(Pc, rate, showChem, restore, t, dt);

      /* ---- 9 V (frozen while the camera pans away, reset once off screen) ---- */
      var lt9 = -1;
      if (mode === 'seri') { lt9 = manual ? lt % SERI_PERIOD_MANUAL : lt; st.lt9 = lt9; }
      else if (st.lt9 >= 0 && lt < 1.9) lt9 = st.lt9;
      else st.lt9 = -1;
      update9(lt9, manual && mode === 'seri');

      /* ---- lights and shadow catcher follow the camera target ---- */
      if (lights) {
        var tx = v.view.target.x;
        lights.key.position.set(keyOff.x + tx, keyOff.y, keyOff.z);
        lights.key.target.position.set(tx, 0, 0);
        lights.key.target.updateMatrixWorld();
        if (lights.ground) lights.ground.position.x = tx;
      }

      updateLabels(mode, lt, clt);
      fitZoom(v, 680 / 520, mode === 'anatomi' ? 1.8 : mode === 'calisma' ? 1.5 : 1.35, t > 0.05 ? dt : 0);
      layoutInset();
      v.render(dt);
      if (!K.skipRender) overlay(mode, lt, clt);
    }

    function updateChem(Pc, rate, vis, restore, t, dt) {
      var visible = vis > 0.01;
      znMesh.visible = znoMesh.visible = ohMesh.visible = hMesh.visible = eInMesh.visible = visible;
      eExMesh.visible = st.rig > 0.05;
      var sc = vis, k, q, z;
      for (k = 0; k < NZ; k++) {
        var site = zOrder[k];
        var pBirth = N0 + 2 * k + 0.5 - Lz[k] / DS;
        var f = clamp((Pc - pBirth) / 0.9, 0, 1) * (1 - restore);
        var sZn = (1 - EASE.inOut(f)) * sc, sZo = EASE.out(f) * sc;
        if (sZn > 0.01) znMesh.setAt(k, LIFT, site.y, site.r, sZn); else znMesh.hideAt(k);
        if (sZo > 0.01) znoMesh.setAt(k, LIFT, site.y, site.r, sZo); else znoMesh.hideAt(k);
      }
      znMesh.commit(); znoMesh.commit();
      var leftFrac = lerp(1 - clamp((Pc - N0) / (2 * NZ), 0, 1), 1, restore);
      chem.left = leftFrac;
      cGel.color.copy(GEL0).lerp(GEL1, 1 - leftFrac);
      cGel.metalness = lerp(0.12, 0.0, 1 - leftFrac);
      mGel.color.setRGB(cGel.color.r * 0.8, cGel.color.g * 0.8, cGel.color.b * 0.8);

      /* internal electrons: anode side (zinc → nail → cap) */
      var ei = 0;
      if (visible) {
        for (k = 0; k < NZ && ei < MAXEI; k++) {
          var pB = N0 + 2 * k + 0.5 - Lz[k] / DS;
          if (Pc < pB) continue;
          for (q = 0; q < 2; q++) {
            var d = (N0 + 2 * k + q + 0.5 - Pc) * DS;
            if (d <= 0) continue;
            var L = Lz[k], s = Math.max(0, L - d);
            zPaths[k].at(s, wv);
            if (s <= 0.001) { var pop = clamp((Pc - pB) / 0.5, 0, 1); wv.y += (q ? 1.05 : -1.05) * pop; wv.z += 0.2 * pop; }
            eInMesh.setAt(ei++, wv.x, wv.y, wv.z, sc * (1 - restore));
          }
        }
        /* cathode side: slots that passed the + nub travel to their MnO₂ site */
        var nMin = Math.floor(Pc - (LEXT + 62) / DS) - 2, nMax = Math.ceil(Pc - LEXT / DS) + 1;
        for (var n = nMin; n <= nMax && ei < MAXEI; n++) {
          var dist = (Pc - n - 0.5) * DS - LEXT;
          if (dist < 0) continue;
          var cp = cathFor(n);
          if (dist > cp.len) continue;
          cp.at(dist, wv);
          var shrink = clamp((cp.len - dist) / 0.8, 0, 1);
          eInMesh.setAt(ei++, wv.x, wv.y, wv.z, sc * (0.35 + 0.65 * shrink) * (1 - restore));
        }
      }
      for (z = ei; z < MAXEI; z++) eInMesh.hideAt(z);
      eInMesh.commit();

      /* OH⁻ ions: produced where electrons are absorbed (MnO₂), drifting across the separator to a zinc site */
      var oi = 0;
      if (visible) {
        for (k = 0; k < NZ && oi < MAXOH - 1; k++) {
          var target = zOrder[k];
          var pReact = N0 + 2 * k + 0.5 - Lz[k] / DS;
          var nA = N0 + 2 * (k - MLAG);
          var pAbs = nA + 0.5 + (LEXT + cathFor(nA).len) / DS;
          var pStart = Math.min(pAbs, pReact - 3);
          if (Pc < pStart || Pc > pReact + 0.25) continue;
          var f2 = clamp((Pc - pStart) / Math.max(0.5, pReact - pStart), 0, 1);
          var fe = EASE.inOut(f2);
          var gone = Pc > pReact ? clamp(1 - (Pc - pReact) / 0.25, 0, 1) : 1;
          for (q = 0; q < 2; q++) {
            var r0 = 5.45 + q * 0.85, y0 = target.y + (q ? 0.75 : -0.75);
            var rr = lerp(r0, target.r + 0.3, fe);
            var yy = lerp(y0, target.y + (q ? 0.62 : -0.62), fe) + Math.sin(f2 * 8.0 + k + q * 2) * 0.32 * (1 - fe);
            var a = t * 1.1 + k * 1.7 + q * 2.1;
            var sO = sc * gone * (1 - restore) * (0.4 + 0.6 * sstep(0, 0.12, f2));
            ohMesh.setAt(oi, LIFT + 0.1, yy, rr, sO);
            hMesh.setAt(oi, LIFT + 0.1 + Math.cos(a) * 0.22, yy + Math.sin(a) * 0.46, rr + Math.cos(a) * 0.4, sO);
            oi++;
          }
        }
      }
      for (z = oi; z < MAXOH; z++) { ohMesh.hideAt(z); hMesh.hideAt(z); }
      ohMesh.commit(); hMesh.commit();

      /* external electrons: one uniform chain, moving only while the reaction runs */
      var vis2 = clamp(st.rig, 0, 1);
      var nhi = Math.floor(Pc - 0.5), frac = Pc - 0.5 - nhi;
      for (var i = 0; i < MAXEX; i++) {
        var dd = (frac + i) * DS;
        if (dd > LEXT || vis2 < 0.02) { eExMesh.hideAt(i); continue; }
        var nn = nhi - i;
        EXT.at(dd, wv);
        var jit = 0.12;
        wv.x += Math.sin(t * 7.1 + nn * 2.3) * jit; wv.y += Math.sin(t * 6.3 + nn * 1.7) * jit; wv.z += Math.cos(t * 6.7 + nn * 3.1) * jit;
        eExMesh.setAt(i, wv.x, wv.y, wv.z, vis2);
      }
      eExMesh.commit();

      var cur = clamp(rate / PEAK_RATE, 0, 1);
      chem.bright = approach(chem.bright, cur, 6, dt);
      var b = chem.bright * clamp(st.rig, 0, 1);
      mFil.emissiveIntensity = 2.8 * b;
      mGlass.emissiveIntensity = 0.25 * b;
      bulbLight.intensity = 0.9 * b;
      chem.dead = Pc >= PEND - 0.01 && restore < 0.5 ? 1 : 0;
    }

    function update9(lt, manual) {
      var active = lt >= 0;
      var open = 0, unfold = 0, count = -1, i;
      if (active) {
        open = sstep(1.4, 2.9, lt);
        unfold = sstep(2.8, 4.4, lt);
        count = (lt - 4.6) / 0.75;
        if (manual) { var back = sstep(SERI_PERIOD_MANUAL - 1.8, SERI_PERIOD_MANUAL - 0.2, lt); open *= 1 - back; unfold *= 1 - back; if (back > 0) count = -1; }
        if (RM) { open = 1; unfold = 1; count = 9; }
      }
      /* case: jacket lifts away, bottom plate fades */
      var jo = 1 - sstep(0.1, 0.8, open);
      jacket.position.y = 0.6 + EASE.inOut(open) * 60;
      jacket.visible = jo > 0.01;
      bottomPlate.visible = jo > 0.01;
      if ((jo < 0.999) !== mJacket.transparent) { mJacket.transparent = jo < 0.999; mJacket.needsUpdate = true; }
      mJacket.opacity = jo;
      jacketDecal.material.opacity = jo;
      if ((jo < 0.999) !== mBottom.transparent) { mBottom.transparent = jo < 0.999; mBottom.needsUpdate = true; }
      mBottom.opacity = jo;
      /* cells: from the 3 × 2 pack to a single row, staggered */
      for (i = 0; i < 6; i++) {
        var c = cells9[i], A = c.userData.pack, Bp = c.userData.row;
        var f = EASE.inOut(clamp((unfold - i * 0.06) / 0.7, 0, 1));
        c.position.lerpVectors(A, Bp, f);
        c.position.y = CELL_Y + Math.sin(f * Math.PI) * 4.0;
        var lit = active ? clamp(count - i + 1, 0, 1) : 0;
        ringMats[i].emissiveIntensity = lit * 0.9;
      }
      /* top plate floats above the row */
      var fu = EASE.inOut(unfold);
      topPlate.position.set(0, 46.0 + EASE.inOut(open) * 6 + fu * 8, lerp(0, 9, fu));
      /* strips follow their two cells */
      for (i = 0; i < strips.length; i++) {
        var sp = strips[i], ca = cells9[sp.userData.a].position, cb = cells9[sp.userData.b].position;
        var yS = sp.userData.top ? CELL_H + 0.35 : -0.3;
        wv.set(ca.x, ca.y + yS, ca.z); wv2.set(cb.x, cb.y + yS, cb.z);
        sp.position.addVectors(wv, wv2).multiplyScalar(0.5);
        var len = Math.hypot(cb.x - ca.x, cb.z - ca.z) + 3.4;
        sp.rotation.set(0, -Math.atan2(cb.z - ca.z, cb.x - ca.x), 0);
        sp.scale.set(len, 1, 1);
        var on = active && count > Math.max(sp.userData.a, sp.userData.b) - 0.5;
        sp.material = on ? mStripOn : mStrip;
      }
      /* leads from the snaps to the chain ends (cell 1 top: −, cell 6 top: +) */
      for (i = 0; i < 2; i++) {
        var ce = cells9[i === 0 ? 0 : 5].position;
        wv.set(ce.x, ce.y + CELL_H + 0.6, ce.z);
        wv2.copy(topPlate.position); wv2.x += i === 0 ? -6.35 : 6.35; wv2.y += 0.2;
        orientBetween(leads[i], wv, wv2);
        leads[i].material = (active && count > (i === 0 ? 0.5 : 5.5)) ? mStripOn : mStrip;
      }
      st.count = count;
      st.seriActive = active;
      st.unfold = unfold;
    }

    function updateLabels(mode, lt, clt) {
      var i;
      for (i = 0; i < aLabels.length; i++) fade(aLabels[i], mode === 'anatomi' ? sstep(4.4 + i * 0.4, 5.0 + i * 0.4, lt) : 0);
      var cA = mode === 'calisma' ? sstep(1.4, 2.2, clt) : 0;
      var dA = mode === 'calisma' ? chem.dead * sstep(T_SETUP + T_RUN, T_SETUP + T_RUN + 0.6, clt) : 0;
      fade(cMinus, cA); fade(cPlus, cA); fade(cElec, 0);
      fade(cDead, dA);
      var seriA = (mode === 'seri' || lt < 1.2) && st.seriActive;
      for (i = 0; i < 6; i++) {
        var L = sLabels[i];
        var on = seriA ? clamp(st.count - i + 1, 0, 1) : 0;
        var base = seriA ? sstep(4.0, 4.5, lt) * 0.5 : 0;
        fade(L, Math.max(on, base));
        var want = on > 0.5 ? 'kg-l kge-v on' : 'kg-l kge-v';
        if (!L.visible) want += ' hide';
        if (L.el.className !== want) L.el.className = want;
      }
      var k = seriA ? Math.floor(clamp(st.count + 1, 0, 6)) : 0;
      if (k > 0) {
        setHTML(sumLabel, k >= 6 && st.count >= 6.2 ? '6 × 1,5 V = <b>9 V</b>' : sumText(k));
        fade(sumLabel, 1);
      } else fade(sumLabel, 0);
      var tA = seriA ? sstep(4.2, 4.8, lt) : 0;
      fade(termMinus, tA); fade(termPlus, tA);
    }
    function sumText(k) {
      var parts = [];
      for (var i = 0; i < k; i++) parts.push('1,5');
      return parts.join(' + ') + ' = <b>' + K.num(1.5 * k, 1) + ' V</b>';
    }

    /* ---------- 2D overlay ---------- */
    function overlay(mode, lt, clt) {
      var ctx = v.ctx, W = v.w, H = v.h;
      if (mode === 'anatomi') {
        var dimA = RM ? 0 : win(lt, 0.8, 3.9, 0.6);
        if (dimA > 0.01) drawDims(ctx, dimA);
        var tagA = sstep(4.2, 5.0, lt);
        if (tagA > 0.01) tag2d(ctx, 'çeyrek kesit · AA (LR6) · 50,5 × 14,5 mm', 18, H - 16, { alpha: tagA });
      } else if (mode === 'calisma') {
        var a = sstep(1.0, 1.8, clt) * (1 - sstep(0, 1, -lt));
        if (chem.bright > 0.01 && st.rig > 0.5) {
          var pp = v.project(filamentWorld);
          K.drawGlow(ctx, PAL.lamp, pp.x, pp.y, 64, 0.5 * chem.bright);
          K.drawGlow(ctx, '#FFF4DA', pp.x, pp.y, 15, 0.9 * chem.bright);
        }
        if (a > 0.01) {
          drawInset(ctx, a);
          drawEnergyBar(ctx, W - 290, 20, 266, a);
          drawLegend(ctx, 20, H - 84, a);
          tag2d(ctx, 'basitleştirilmiş · hızlandırılmış', W - 24, 76, { alpha: a, align: 'right' });
        }
      }
    }
    function drawDims(ctx, a) {
      var L0 = cell.localToWorld(wv.set(0, 0, 0));
      var x0 = L0.x;
      var L1 = cell.localToWorld(wv.set(0, 50.5, 0));
      var x1 = L1.x;
      var p0 = v.project(wv.set(x0, -9.5, 9)), p1 = v.project(wv2.set(x1, -9.5, 9));
      ctx.save();
      ctx.globalAlpha = a;
      ctx.strokeStyle = PAL.muted; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(p0.x, p0.y); ctx.lineTo(p1.x, p1.y); ctx.stroke();
      [p0, p1].forEach(function (p) { ctx.beginPath(); ctx.moveTo(p.x, p.y - 6); ctx.lineTo(p.x, p.y + 6); ctx.stroke(); });
      K.label(ctx, '50,5 mm', (p0.x + p1.x) / 2, (p0.y + p1.y) / 2 + 20, { mono: true, size: 12, weight: 500, color: PAL.ink2, align: 'center' });
      var q0 = v.project(wv.set(x0 - 6, -7.25, 0)), q1 = v.project(wv2.set(x0 - 6, 7.25, 0));
      ctx.beginPath(); ctx.moveTo(q0.x, q0.y); ctx.lineTo(q1.x, q1.y); ctx.stroke();
      [q0, q1].forEach(function (p) { ctx.beginPath(); ctx.moveTo(p.x - 5, p.y); ctx.lineTo(p.x + 5, p.y); ctx.stroke(); });
      K.label(ctx, 'Ø 14,5 mm', Math.min(q0.x, q1.x) - 10, (q0.y + q1.y) / 2 + 4, { mono: true, size: 12, weight: 500, color: PAL.ink2, align: 'right' });
      ctx.restore();
    }
    function drawEnergyBar(ctx, x, y, w, a) {
      ctx.save(); ctx.globalAlpha = a;
      K.label(ctx, 'Kimyasal enerji (kalan çinko)', x, y + 10, { size: 15, weight: 500, color: PAL.ink2 });
      ctx.fillStyle = PAL.line; K.rr(ctx, x, y + 18, w, 8, 4); ctx.fill();
      var f = clamp(chem.left, 0, 1);
      if (f > 0.005) { ctx.fillStyle = PAL.copperFill; K.rr(ctx, x, y + 18, Math.max(8, w * f), 8, 4); ctx.fill(); }
      K.label(ctx, '%' + Math.round(f * 100), x + w, y + 10, { size: 15, weight: 500, mono: true, color: PAL.copper, align: 'right' });
      ctx.restore();
    }
    function drawLegend(ctx, x, y, a) {
      ctx.save(); ctx.globalAlpha = a;
      var items = [['#2848C8', 'elektron (e⁻)'], ['#7E94E2', 'hidroksit iyonu (OH⁻)'], ['#B7BDC5', 'çinko (Zn)'], ['#F3F1EA', 'çinko oksit (ZnO)']];
      for (var i = 0; i < items.length; i++) {
        var yy = y + i * 20;
        K.drawSphere(ctx, items[i][0], x + 5, yy, 4.5);
        if (i === 3) { ctx.strokeStyle = 'rgba(21,23,28,0.25)'; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.arc(x + 5, yy, 4.6, 0, TAU); ctx.stroke(); }
        K.label(ctx, items[i][1], x + 16, yy + 5, { size: 15, color: PAL.ink2 });
      }
      ctx.restore();
    }
    var tmpP = new THREE.Vector3();
    function layoutInset() {
      var W = v.w, H = v.h, wide = W / H > 1.8;
      INSET.r = wide ? Math.min(150, H * 0.31) : 108;
      INSET.x = wide ? INSET.r + 24 : 128;
      INSET.y = wide ? INSET.r + 22 : 132;
    }
    function drawInset(ctx, a) {
      var I = INSET;
      /* aim the magnifier camera squarely at face A */
      faceAPoint(I.focusR, I.focusY, 0, wv);
      faceAPoint(I.focusR, I.focusY, 1, wv2);
      wv2.sub(wv).normalize();
      var D = (I.span / 2) / Math.tan(camI.fov * Math.PI / 360);
      camI.position.copy(wv).addScaledVector(wv2, D);
      camI.position.y += D * 0.12;
      camI.up.set(0, 1, 0);
      camI.lookAt(wv);
      camI.updateMatrixWorld();
      camI.updateProjectionMatrix();
      /* connector to the magnified spot */
      var spot = v.project(faceAPoint(I.focusR, I.focusY, 0, wv3));
      ctx.save();
      ctx.globalAlpha = a;
      var ang = Math.atan2(spot.y - I.y, spot.x - I.x);
      ctx.save();
      ctx.globalAlpha = a;
      ctx.strokeStyle = 'rgba(21,23,28,0.3)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(spot.x, spot.y, 9, 0, TAU); ctx.stroke();
      var ex = I.x + Math.cos(ang) * I.r, ey = I.y + Math.sin(ang) * I.r;
      ctx.beginPath(); ctx.moveTo(ex, ey); ctx.lineTo(spot.x - Math.cos(ang) * 9, spot.y - Math.sin(ang) * 9); ctx.stroke();
      /* lens body */
      ctx.fillStyle = 'rgba(21,23,28,0.07)';
      ctx.beginPath(); ctx.arc(I.x, I.y + 3, I.r + 2, 0, TAU); ctx.fill();
      ctx.fillStyle = '#FBFBF9';
      ctx.beginPath(); ctx.arc(I.x, I.y, I.r, 0, TAU); ctx.fill();
      ctx.restore();
      var rv = rig.visible, ev = eExMesh.visible, bl = bulbLight.visible;
      rig.visible = false; eExMesh.visible = false; bulbLight.visible = false;
      renderInset(v, camI, I.x, I.y, I.r, a);
      rig.visible = rv; eExMesh.visible = ev; bulbLight.visible = bl;
      ctx.save();
      ctx.globalAlpha = a;
      ctx.strokeStyle = 'rgba(21,23,28,0.22)'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(I.x, I.y, I.r, 0, TAU); ctx.stroke();
      ctx.restore();
      tag2d(ctx, 'kesit · büyütülmüş', I.x, I.y + I.r + 18, { alpha: a, align: 'center' });
      /* layer names inside the lens */
      var L = [
        [7.0, 'çelik gövde (+)', '#15171C'],
        [5.7, '+ uç: MnO₂', '#15171C'],
        [4.34, 'ayırıcı: yalnız iyon geçer', '#15171C'],
        [2.3, '− uç: çinko (Zn)', '#15171C'],
        [0.35, 'pirinç çivi (−)', '#15171C']
      ];
      for (var i = 0; i < L.length; i++) {
        var p = projInset(camI, faceAPoint(L[i][0], I.focusY - 2.5, 0.5, tmpP), I.x, I.y, I.r, wv3);
        var dxl = p.x - I.x, dyl = p.y - I.y;
        if (dxl * dxl + dyl * dyl > (I.r - 10) * (I.r - 10)) continue;
        chip2d(ctx, L[i][1], Math.max(p.x, I.x - Math.sqrt(Math.max(0, (I.r - 12) * (I.r - 12) - dyl * dyl))), p.y, { size: I.r > 120 ? 14 : 11, alpha: a, bg: 'rgba(255,255,255,0.85)', border: false });
      }
    }

    resetState();
    precompile(v);

    return {
      reset: function () { resetState(); },
      frame: frame,
      set: function (key, val) { if (key === 'mode') modes.set(String(val), lastT); },
      read: function (key) {
        var m = modes.mode;
        if (key === 'voltage') { if (m === 'seri') return '9 V'; if (m === 'calisma' && chem.dead) return 'Pil bitti'; return '1,5 V'; }
        if (key === 'formula') {
          if (m === 'seri') return '6 × 1,5 V = 9 V';
          if (m === 'calisma') return 'Zn + 2 OH⁻ → ZnO + H₂O + 2 e⁻';
          return 'Kimyasal enerji → elektrik enerjisi';
        }
        if (key === 'mode') return m;
        if (key === 'explain') {
          if (m === 'seri') return 'Hücreler arka arkaya bağlanır, gerilimleri toplanır: 6 × 1,5 V = 9 V.';
          if (m === 'calisma') return chem.dead ? 'Çinko bitti: pil boşaldı. Elektronlar tükenmedi, tepkimeye girecek çinko tükendi.' : 'Çinko elektron verir; elektronlar lambadan dolaşıp mangan dioksite gider.';
          return 'Pil, çelik bir kabın içinde katmanlı bir kimya düzeneğidir: ortada çinko, çevresinde mangan dioksit.';
        }
        return '';
      },
      resize: function () { },
      dispose: function () { v.dispose(); }
    };
  });

  /* ================================================================== *
   * power-meter · S 680×520 · light
   * A classic Ferraris (induction) electricity meter wired to a device.
   * Disc speed ∝ power; the kWh counter integrates P × t (1 s = 1 saat).
   * Units: millimetres.
   * ================================================================== */

  /* Fade helper for a group whose materials are collected in a list */
  function GroupFader(group) {
    var mats = [];
    group.traverse(function (o) {
      if (!o.material) return;
      (Array.isArray(o.material) ? o.material : [o.material]).forEach(function (m) {
        if (mats.indexOf(m) < 0) { m.userData.baseOpacity = m.opacity; m.userData.baseTransparent = m.transparent; mats.push(m); }
      });
    });
    this.group = group; this.mats = mats; this.a = -1;
  }
  GroupFader.prototype.set = function (a) {
    if (Math.abs(a - this.a) < 1e-4) return;
    this.a = a;
    this.group.visible = a > 0.005;
    for (var i = 0; i < this.mats.length; i++) {
      var m = this.mats[i], t = m.userData.baseTransparent || a < 0.999;
      if (m.transparent !== t) { m.transparent = t; m.needsUpdate = true; }
      m.opacity = m.userData.baseOpacity * a;
    }
  };

  function softSprite(size, inner) {
    return K.textTexture(size, size, function (ctx, w) {
      var g = ctx.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
      g.addColorStop(0, 'rgba(255,255,255,1)');
      g.addColorStop(inner || 0.35, 'rgba(255,255,255,0.55)');
      g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, w, w);
    });
  }

  /* E27 lamp base (thread + insulator + contact), y = 0 at the contact tip */
  function e27Profile() {
    var p = new Profile().m(0, 0).m(4.2, 0).arc(4.2, 1.0, 1.0, -Math.PI / 2, 0, 3).m(5.2, 2.2).m(9.0, 2.6).m(9.6, 6.0).m(12.6, 6.6);
    for (var i = 0; i <= 64; i++) p._push(12.9 + 0.75 * Math.sin(i / 64 * TAU * 4.5), 7.0 + i * 0.3, false);
    p.m(13.4, 26.6).m(13.4, 27.4).m(0, 27.4);
    return p;
  }
  /* trim ultra-thin seam: sample a few profile points on demand */

  K.register('power-meter', function (el, opts) {
    var THREE = window.THREE;
    opts = opts || {};
    var theme = opts.theme || 'light';
    var RM = K.reducedMotion;
    var CAM = { yaw: 0.1, pitch: 0.36, distance: 900, target: [-50, 150, -80] };
    if (opts.cam) CAM = { yaw: opts.cam[0], pitch: opts.cam[1], distance: opts.cam[2], target: [opts.cam[3], opts.cam[4], opts.cam[5]] };
    var v = K.stage3d(el, {
      theme: theme, fov: 26, yaw: CAM.yaw, pitch: CAM.pitch, distance: CAM.distance, target: CAM.target,
      size: 320, ground: 0, minDistance: 420, maxDistance: 1500, near: 10, far: 8000, exposure: 1.0, minPitch: -0.05, maxPitch: 1.0
    });
    var scene = v.scene;
    if (v.lights) { v.lights.key.intensity = 1.35; }

    var DEV = {
      led: { name: 'LED ampul', w: 9, amp: '0,04' },
      akkor: { name: 'Eski tip ampul', w: 60, amp: '0,26' },
      isitici: { name: 'Su ısıtıcısı', w: 2000, amp: '8,7' }
    };
    var ORDER = ['akkor', 'led', 'isitici'];

    /* ---------- wooden board ---------- */
    var woodTex = K.textTexture(512, 512, function (ctx, w, h) {
      var rng = K.rng(77);
      ctx.fillStyle = '#CDB48C'; ctx.fillRect(0, 0, w, h);
      for (var i = 0; i < 70; i++) {
        var y0 = rng() * h, amp = 4 + rng() * 10, ph = rng() * TAU;
        ctx.strokeStyle = 'rgba(150,115,70,' + (0.05 + rng() * 0.09).toFixed(3) + ')';
        ctx.lineWidth = 0.6 + rng() * 2.2;
        ctx.beginPath();
        for (var x = 0; x <= w; x += 8) { var yy = y0 + Math.sin(x / w * TAU * 1.3 + ph) * amp; if (x === 0) ctx.moveTo(x, yy); else ctx.lineTo(x, yy); }
        ctx.stroke();
      }
    });
    woodTex.wrapS = woodTex.wrapT = THREE.RepeatWrapping;
    woodTex.repeat.set(1 / 200, 1 / 330);
    var board = new THREE.Mesh(roundedBox(170, 330, 18, 4, 3), K.mat.wood({ color: 0xFFFFFF, map: woodTex, roughness: 0.72 }));
    board.position.set(-118, 165, -10);
    board.castShadow = true; board.receiveShadow = true;
    scene.add(board);

    /* ---------- the meter ---------- */
    var meter = new THREE.Group(); meter.position.set(-118, 52, 0); scene.add(meter);
    var mBake = K.mat.std(0x1D1F24, 0.42, 0.0);
    var base = new THREE.Mesh(roundedBox(136, 226, 24, 9, 4), mBake);
    base.position.set(0, 113, 12); base.castShadow = true; base.receiveShadow = true; meter.add(base);
    var term = new THREE.Mesh(roundedBox(126, 58, 30, 6, 3), K.mat.std(0x23262C, 0.5, 0));
    term.position.set(0, 30, 39); term.castShadow = true; term.receiveShadow = true; meter.add(term);
    /* two screws on the terminal cover */
    var mScrew = K.mat.steel({ color: 0xBFC4CA, roughness: 0.3 });
    [-40, 40].forEach(function (x) {
      var s = new THREE.Mesh(new THREE.CylinderGeometry(3.2, 3.2, 1.4, 20), mScrew);
      s.rotation.x = Math.PI / 2; s.position.set(x, 30, 54.6); meter.add(s);
    });
    /* inner chamber back */
    var chamber = new THREE.Mesh(roundedBox(118, 146, 4, 3, 2), K.mat.std(0x2A2D33, 0.6, 0));
    chamber.position.set(0, 145, 26); meter.add(chamber);
    /* nameplate with counter window and disc slot */
    var PL = { w: 108, h: 130, cy: 143, z: 44 };
    var WIN = { w: 64, h: 9, y: 34 }, SLOT = { w: 88, h: 32, y: -40 };
    var plateTex = liveTexture(1080, 1300, function (ctx, W, H) {
      var k = W / PL.w;
      function X(x) { return (x + PL.w / 2) * k; }
      function Y(y) { return (PL.h / 2 - y) * k; }
      ctx.fillStyle = '#F2EEE3'; ctx.fillRect(0, 0, W, H);
      ctx.strokeStyle = 'rgba(21,23,28,0.35)'; ctx.lineWidth = 0.35 * k;
      K.rr(ctx, 3 * k, 3 * k, W - 6 * k, H - 6 * k, 3 * k); ctx.stroke();
      /* counter window frame */
      ctx.fillStyle = '#15171C';
      K.rr(ctx, X(-WIN.w / 2 - 2.2), Y(WIN.y + WIN.h / 2 + 2.2), (WIN.w + 4.4) * k, (WIN.h + 4.4) * k, 1.6 * k); ctx.fill();
      ctx.fillStyle = '#B3352A';
      ctx.fillRect(X(WIN.w / 2 - 10.4), Y(WIN.y + WIN.h / 2 + 2.2), 10.4 * k + 2.2 * k, 1.1 * k);
      /* disc slot frame */
      ctx.fillStyle = '#2A2D33';
      K.rr(ctx, X(-SLOT.w / 2 - 1.6), Y(SLOT.y + SLOT.h / 2 + 1.6), (SLOT.w + 3.2) * k, (SLOT.h + 3.2) * k, 2 * k); ctx.fill();
      ctx.fillStyle = '#15171C'; ctx.textBaseline = 'middle';
      ctx.textAlign = 'center';
      ctx.font = '600 ' + Math.round(11 * k) + 'px ' + SANS;
      ctx.fillText('kWh', X(0), Y(14));
      ctx.font = '700 ' + Math.round(8.6 * k) + 'px ' + MONO;
      ctx.fillStyle = '#15171C';
      ctx.fillText('230 V  50 Hz', X(0), Y(3));
      ctx.fillText('10 (40) A', X(0), Y(-9));
    });
    var plateShape = rrShape(PL.w, PL.h, 4);
    plateShape.holes.push(rrPath(WIN.w, WIN.h, 1.2, 0, WIN.y));
    plateShape.holes.push(rrPath(SLOT.w, SLOT.h, 2.0, 0, SLOT.y));
    var plateGeo = new THREE.ExtrudeGeometry(plateShape, { depth: 1, bevelEnabled: false, curveSegments: 6 });
    (function () {
      var p = plateGeo.attributes.position, uv = plateGeo.attributes.uv;
      for (var i = 0; i < p.count; i++) uv.setXY(i, (p.getX(i) + PL.w / 2) / PL.w, (p.getY(i) + PL.h / 2) / PL.h);
      uv.needsUpdate = true;
    })();
    var plate = new THREE.Mesh(plateGeo, K.mat.std(0xFFFFFF, 0.6, 0, { map: plateTex }));
    plate.position.set(0, PL.cy, PL.z);
    plate.receiveShadow = true;
    meter.add(plate);

    /* counter wheels: 5 black + 1 red (tenths) */
    function wheelTex(bg, fg) {
      return liveTexture(1000, 96, function (ctx, W, H) {
        ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = fg; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.font = '500 92px ' + MONO;
        for (var d = 0; d < 10; d++) {
          ctx.save();
          ctx.translate((d + 0.5) * W / 10, H / 2);
          ctx.rotate(Math.PI / 2);
          ctx.fillText(String(d), 0, 5);
          ctx.restore();
        }
      });
    }
    var tBlack = wheelTex('#17191D', '#F2F2EE'), tRed = wheelTex('#A8302A', '#FBF4EE');
    var fw = new FontWatch([plateTex, tBlack, tRed]);
    var WR = 10.5, WW = 9.2;
    var wheelGeo = new THREE.CylinderGeometry(WR, WR, WW, 40, 1, false);
    wheelGeo.rotateZ(Math.PI / 2);
    var wheels = [];
    for (var wi = 0; wi < 6; wi++) {
      var red = wi === 5;
      var wm = [K.mat.std(0xFFFFFF, 0.5, 0, { map: red ? tRed : tBlack }), K.mat.std(red ? 0x8E2822 : 0x15171C, 0.5, 0), K.mat.std(red ? 0x8E2822 : 0x15171C, 0.5, 0)];
      var wh = new THREE.Mesh(wheelGeo, wm);
      wh.position.set(-WIN.w / 2 + 5.4 + wi * 10.64, PL.cy + WIN.y, PL.z - WR + 0.3);
      meter.add(wh);
      wheels.push(wh);
    }
    /* aluminium disc with 100 rim ticks and a red mark */
    var rimTex = liveTexture(2048, 32, function (ctx, W, H) {
      ctx.fillStyle = '#C9CDD2'; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = '#2A2D33';
      for (var i = 0; i < 100; i++) ctx.fillRect(i / 100 * W, 0, W / 100 * 0.18, H * (i % 10 === 0 ? 1 : 0.6));
      ctx.fillStyle = '#D0200F'; ctx.fillRect(0, 0, W * 0.12, H);
    });
    rimTex.anisotropy = 8;
    var topTex = K.textTexture(512, 512, function (ctx, W, H) {
      ctx.fillStyle = '#C9CDD2'; ctx.fillRect(0, 0, W, H);
      var g = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, W / 2);
      g.addColorStop(0, 'rgba(255,255,255,0.0)'); g.addColorStop(1, 'rgba(255,255,255,0.12)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = '#C42B1C';
      ctx.beginPath(); ctx.moveTo(W / 2, H / 2);
      ctx.arc(W / 2, H / 2, W / 2, -0.02, 0.62); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#C9CDD2';
      ctx.beginPath(); ctx.arc(W / 2, H / 2, W * 0.36, 0, TAU); ctx.fill();
    });
    var DISC = { r: 46, y: PL.cy + SLOT.y, z: PL.z + 5 - 46 };
    var disc = new THREE.Mesh(new THREE.CylinderGeometry(DISC.r, DISC.r, 3, 128, 1, false), [
      K.mat.std(0xFFFFFF, 0.32, 0.9, { map: rimTex }), K.mat.std(0xFFFFFF, 0.3, 0.9, { map: topTex }), K.mat.std(0xC9CDD2, 0.3, 0.9)
    ]);
    disc.position.set(0, DISC.y, DISC.z);
    meter.add(disc);
    var spindle = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.2, 40, 10), mScrew);
    spindle.position.set(0, DISC.y, DISC.z); meter.add(spindle);
    /* brake magnet straddling the disc edge (visible through the slot, left side) */
    var brake = new THREE.Mesh(roundedBox(14, 22, 20, 2, 2), K.mat.std(0x3A3F48, 0.4, 0.6));
    brake.position.set(-30, DISC.y, DISC.z + 30); meter.add(brake);
    /* clear cover */
    var mCover = new THREE.MeshPhysicalMaterial({ color: 0xffffff, transparent: true, opacity: 0.12, roughness: 0.04, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.03, depthWrite: false });
    var cover = new THREE.Mesh(roundedBox(126, 152, 62, 10, 4), mCover);
    cover.position.set(0, 145, 55); cover.renderOrder = 5; meter.add(cover);

    /* ---------- devices ---------- */
    var DEVPOS = new THREE.Vector3(118, 0, -250);
    if (opts.dev) DEVPOS.set(opts.dev[0], 0, opts.dev[1]);
    var devs = {};
    var mBlackPl = K.mat.std(0x1E2128, 0.48, 0);
    var mWhitePl = K.mat.std(0xF1F0EB, 0.5, 0);
    var mAlu = K.mat.aluminium({ roughness: 0.3 });
    var e27 = latheGeo(e27Profile(), { segs: 48 });

    function lampStand(g) {
      var bp = new Profile().m(0, 0).m(52, 0).arc(52, 3, 3, -Math.PI / 2, 0, 4).m(55, 9).arc(50, 9, 5, 0, Math.PI / 2, 5).m(12, 14).m(10, 14).m(10, 62).m(0, 62);
      var b = new THREE.Mesh(latheGeo(bp, { segs: 64 }), mBlackPl); b.castShadow = b.receiveShadow = true; g.add(b);
      var sp = new Profile().m(0, 62).m(19, 62).arc(19, 65, 3, -Math.PI / 2, 0, 4).m(22, 100).m(16, 104).m(16, 100).m(0, 100);
      var s = new THREE.Mesh(latheGeo(sp, { segs: 56 }), mWhitePl); s.castShadow = true; g.add(s);
      return 84;            /* y of the bulb contact tip */
    }
    /* LED bulb */
    (function () {
      var g = new THREE.Group(); g.position.copy(DEVPOS);
      var y0 = lampStand(g);
      var bulb = new THREE.Group(); bulb.position.y = y0; g.add(bulb);
      var b = new THREE.Mesh(e27, mAlu); b.castShadow = true; bulb.add(b);
      var ins = new THREE.Mesh(latheGeo(new Profile().m(0, 0).m(9.0, 2.6).m(9.6, 6.0).m(0, 6.0), { segs: 32 }), mBlackPl); bulb.add(ins);
      var hp = new Profile().m(0, 27.4).m(13.6, 27.4).m(14.2, 30).arc(25.0, 52, 22.8, Math.PI * 1.08, Math.PI * 0.6, 10).m(0, 54);
      hp = new Profile().m(0, 27.4).m(13.8, 27.4).m(15.0, 33).m(19.5, 46).m(24.5, 54).m(25.2, 56).m(0, 56);
      var h = new THREE.Mesh(latheGeo(hp, { segs: 64 }), K.mat.std(0xF3F2EE, 0.42, 0)); h.castShadow = true; bulb.add(h);
      var dp = new Profile().m(0, 55).m(25.0, 55);
      var cy = 78, R = 30, yy = cy - Math.sqrt(R * R - 25 * 25);
      dp.m(25.0, yy).arc(0, cy, R, Math.atan2(yy - cy, 25), Math.PI / 2, 24);
      var mDome = K.mat.std(0xF7F6F2, 0.55, 0, { emissive: 0xFFF1D6, emissiveIntensity: 0 });
      var dome = new THREE.Mesh(latheGeo(dp, { segs: 64 }), mDome); dome.castShadow = true; bulb.add(dome);
      scene.add(g);
      devs.led = { g: g, fader: new GroupFader(g), glowAt: new THREE.Vector3(DEVPOS.x, DEVPOS.y + y0 + 78, DEVPOS.z), on: function (b) { mDome.emissiveIntensity = 0.9 * b; } };
    })();
    /* Incandescent bulb (clear glass, visible filament) */
    (function () {
      var g = new THREE.Group(); g.position.copy(DEVPOS);
      var y0 = lampStand(g);
      var bulb = new THREE.Group(); bulb.position.y = y0; g.add(bulb);
      var b = new THREE.Mesh(e27, mAlu); b.castShadow = true; bulb.add(b);
      var ins = new THREE.Mesh(latheGeo(new Profile().m(0, 0).m(9.0, 2.6).m(9.6, 6.0).m(0, 6.0), { segs: 32 }), mBlackPl); bulb.add(ins);
      var gp = new Profile().m(0, 27.0).m(13.4, 27.0).m(13.6, 34).arc(36.0, 40, 22.8, Math.PI * 0.95, Math.PI * 0.62, 6);
      var cy = 76, R = 30;
      gp = new Profile().m(0, 27.0).m(13.4, 27.0).m(13.8, 36).m(17.5, 46).m(24.5, 54);
      var yy = cy - Math.sqrt(R * R - 26 * 26);
      gp.m(26, yy).arc(0, cy, R, Math.atan2(yy - cy, 26), Math.PI / 2, 26);
      var mGl = new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.03, metalness: 0, transparent: true, opacity: 0.2, depthWrite: false, clearcoat: 1, clearcoatRoughness: 0.03, emissive: 0xF2C46B, emissiveIntensity: 0 });
      var glass = new THREE.Mesh(latheGeo(gp, { segs: 64 }), mGl); glass.renderOrder = 4; bulb.add(glass);
      var mStemG = new THREE.MeshStandardMaterial({ color: 0xf6f5f0, roughness: 0.1, transparent: true, opacity: 0.5, depthWrite: false });
      var stem = new THREE.Mesh(latheGeo(new Profile().m(0, 27).m(6, 27).m(3.2, 52).m(2.2, 60).m(0, 60), { segs: 24 }), mStemG); bulb.add(stem);
      var mWire = K.mat.steel({ color: 0xB9BEC6, roughness: 0.35 });
      var lw = new THREE.CylinderGeometry(0.35, 0.35, 1, 6);
      [[-6, 60, 76], [6, 60, 76]].forEach(function (d) {
        var w = new THREE.Mesh(lw, mWire);
        orientBetween(w, v3(d[0] * 0.3, 52, 0), v3(d[0], d[2], 0)); bulb.add(w);
      });
      var hook = new THREE.Mesh(lw, mWire); orientBetween(hook, v3(0, 60, 0), v3(0, 79, 0)); bulb.add(hook);
      var fp = [];
      for (var i = 0; i <= 260; i++) {
        var u = i / 260, a = u * 22 * TAU;
        var x = lerp(-6, 6, u), arcY = 76 + Math.sin(u * Math.PI) * 3.0;
        fp.push(new THREE.Vector3(x, arcY + Math.sin(a) * 0.55, Math.cos(a) * 0.55));
      }
      var mFil = K.mat.std(0x7E838C, 0.4, 0.8, { emissive: 0xFFB347, emissiveIntensity: 0 });
      var fil = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(fp), 700, 0.16, 5, false), mFil); bulb.add(fil);
      var pl = new THREE.PointLight(0xF2B860, 0, 700, 2); pl.position.set(0, 78, 0); bulb.add(pl);
      scene.add(g);
      devs.akkor = { g: g, fader: new GroupFader(g), glowAt: new THREE.Vector3(DEVPOS.x, DEVPOS.y + y0 + 78, DEVPOS.z), on: function (b) { mFil.emissiveIntensity = 3.2 * b; mGl.emissiveIntensity = 0.16 * b; pl.intensity = 0.9 * b; } };
    })();
    /* Electric kettle on its power base */
    var steam;
    (function () {
      var g = new THREE.Group(); g.position.copy(DEVPOS); g.position.x += 6;
      var bp = new Profile().m(0, 0).m(84, 0).arc(84, 4, 4, -Math.PI / 2, 0, 4).m(88, 12).arc(82, 12, 6, 0, Math.PI / 2, 5).m(0, 18);
      var bm = new THREE.Mesh(latheGeo(bp, { segs: 72 }), mBlackPl); bm.castShadow = bm.receiveShadow = true; g.add(bm);
      var kp = new Profile().m(0, 19).m(70, 19).arc(70, 31, 12, -Math.PI / 2, 0, 6).m(82, 40).m(75, 196).arc(67, 196, 8, 0, Math.PI / 2, 5).m(60, 204).m(60, 202).m(0, 202);
      var mSteelK = K.mat.steel({ color: 0xD3D6DA, roughness: 0.26, metalness: 1 });
      var body = new THREE.Mesh(latheGeo(kp, { segs: 96 }), mSteelK); body.castShadow = true; body.receiveShadow = true; g.add(body);
      var bandP = new Profile().m(0, 19).m(71, 19).arc(71, 30, 11, -Math.PI / 2, 0, 5).m(82.4, 34).m(0, 34);
      var band = new THREE.Mesh(latheGeo(bandP, { segs: 96 }), mBlackPl); g.add(band);
      var lp = new Profile().m(0, 202).m(61, 202).arc(55, 204, 6.3, -0.32, Math.PI / 2, 6).m(18, 216).m(12, 222).m(0, 223);
      var lid = new THREE.Mesh(latheGeo(lp, { segs: 72 }), mBlackPl); lid.castShadow = true; g.add(lid);
      /* spout */
      var spP = new Profile().m(0, 0).m(13, 0).m(9, 30).m(0, 30);
      var sp = new THREE.Mesh(latheGeo(spP, { segs: 32 }), mSteelK);
      sp.scale.set(1, 1, 0.55); sp.rotation.z = Math.PI * 0.36; sp.position.set(-66, 176, 0); g.add(sp);
      /* handle */
      var hc = new THREE.CatmullRomCurve3([v3(70, 182, 0), v3(104, 186, 0), v3(118, 150, 0), v3(112, 90, 0), v3(98, 62, 0), v3(80, 56, 0)], false, 'catmullrom', 0.4);
      var handle = new THREE.Mesh(new THREE.TubeGeometry(hc, 64, 9.5, 14, false), mBlackPl); handle.castShadow = true; g.add(handle);
      /* switch with an orange indicator */
      var mLed = K.mat.std(0xC86A2A, 0.3, 0, { emissive: 0xFF8A3A, emissiveIntensity: 0 });
      var sw = new THREE.Mesh(roundedBox(14, 8, 12, 2.5, 2), mLed); sw.position.set(94, 56, 0); g.add(sw);
      /* water window with level ticks */
      var wwTex = K.textTexture(64, 512, function (ctx, W, H) {
        ctx.fillStyle = '#1F2633'; ctx.fillRect(0, 0, W, H);
        var gw = ctx.createLinearGradient(0, H * 0.45, 0, H);
        gw.addColorStop(0, '#6F8FC7'); gw.addColorStop(1, '#3E5C99');
        ctx.fillStyle = gw; ctx.fillRect(0, H * 0.45, W, H * 0.55);
        ctx.fillStyle = 'rgba(255,255,255,0.75)';
        for (var i = 1; i < 8; i++) ctx.fillRect(W * 0.55, H * i / 8, W * 0.45, 3);
      });
      var ww = new THREE.Mesh(new THREE.PlaneGeometry(13, 110), K.mat.std(0xFFFFFF, 0.15, 0, { map: wwTex }));
      ww.position.set(46, 112, 64); ww.rotation.y = 0.62; ww.rotation.x = -0.04;
      g.add(ww);
      g.rotation.y = -0.2;
      /* steam (soft points) */
      var N = 54, pos = new Float32Array(N * 3);
      var sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      var sm = new THREE.PointsMaterial({ map: softSprite(128, 0.15), color: 0xC0C6CF, size: 92, transparent: true, opacity: 0, depthWrite: false, sizeAttenuation: true });
      steam = new THREE.Points(sg, sm); steam.frustumCulled = false;
      g.add(steam);
      scene.add(g);
      devs.isitici = { g: g, fader: new GroupFader(g), glowAt: null, on: function (b) { mLed.emissiveIntensity = 1.6 * b; } };
      devs.isitici.steam = { pos: pos, geo: sg, mat: sm, N: N, origin: v3(-84, 190, 0) };
    })();

    /* ---------- cables ---------- */
    var mCable = K.mat.std(0xC9CBCF, 0.55, 0);
    var cOut = K.wire([[-98, 53, 40], [-96, 28, 34], [-88, 6, 24], [-30, 4.5, 14], [DEVPOS.x - 70, 4.5, DEVPOS.z + 120], [DEVPOS.x - 40, 4.5, DEVPOS.z + 30], [DEVPOS.x - 30, 5, DEVPOS.z + 6]], { radius: 3.6, material: mCable, segments: 160 });
    scene.add(cOut);
    var cIn = K.wire([[-140, 53, 40], [-142, 28, 34], [-150, 6, 26], [-185, 4.5, 40], [-215, 4.5, 56]], { radius: 3.6, material: mCable, segments: 120 });
    scene.add(cIn);

    /* ---------- labels ---------- */
    var tmpA = new THREE.Vector3(), tmpB = new THREE.Vector3();
    var lDisc = v.label('alüminyum disk<br><i>güçle orantılı döner</i>', { at: function () { return meter.localToWorld(tmpA.set(30, DISC.y, PL.z + 3)); }, cls: 'kge-s', dx: -150, dy: 26, line: true, html: true, align: 'right', valign: 'middle' });
    var lCount = v.label('', { at: function () { return meter.localToWorld(tmpB.set(33, PL.cy + WIN.y, PL.z + 1)); }, cls: 'kge-s', dx: -150, dy: -40, line: true, html: true, align: 'right', valign: 'middle' });
    var tmpC = new THREE.Vector3();
    var lDev = v.label('', { at: function () { return tmpC.set(DEVPOS.x + 4, 258, DEVPOS.z); }, cls: 'kge-c', html: true });

    /* ---------- state ---------- */
    var cyc = new ModeCycle(ORDER, 8, 'akkor');
    var st = { energy: 4172.6, angle: 0, P: 60, devStart: 0, cur: 'akkor', fades: { led: 0, akkor: 1, isitici: 0 }, hours: 0, prev: null };
    var lastT = 0;
    function resetState() {
      cyc.reset();
      st.energy = 4172.6; st.angle = 0.0; st.P = 60; st.devStart = 0; st.cur = 'akkor'; st.prev = null;
      st.fades = { led: 0, akkor: 1, isitici: 0 };
      st.bright = { led: 0, akkor: 0, isitici: 0 };
      v.setView(CAM);
    }

    var sTmp = new THREE.Vector3();
    function frame(t, dt) {
      lastT = t;
      fw.tick();
      cyc.tick(t);
      var d = cyc.mode;
      if (d !== st.cur) { st.cur = d; st.devStart = t; }
      var hours = RM ? 6 : Math.max(0, t - st.devStart);
      st.hours = hours;
      /* device fades: the outgoing one leaves before the next arrives */
      ORDER.forEach(function (k) {
        var target = k === d ? 1 : 0;
        var since = t - st.devStart;
        if (k === d && since < 0.45 && st.prev !== null) target = 0;
        st.fades[k] = RM ? target : approach(st.fades[k], target, target > st.fades[k] ? 5 : 7, dt);
        var a = st.fades[k];
        devs[k].fader.set(EASE.inOut(clamp(a, 0, 1)));
        devs[k].g.position.y = (1 - a) * -6;
        var on = k === d ? sstep(0.5, 1.1, since) : 0;
        st.bright[k] = RM ? (k === d ? 1 : 0) : approach(st.bright[k], on, 5, dt);
        devs[k].on(st.bright[k] * a);
      });
      st.prev = d;
      /* displayed power eases to the device power (the disc has inertia) */
      var Pt = DEV[d].w * sstep(0.5, 1.1, t - st.devStart);
      st.P = RM ? DEV[d].w : approach(st.P, Pt, 3.0, dt);
      st.energy += st.P * dt / 1000;               /* 1 s = 1 h → W·h → kWh */
      st.angle += TAU * 1.2 * st.P / 2000 * dt;
      disc.rotation.y = -st.angle;
      /* counter wheels (odometer with carry) */
      var tenths = st.energy * 10;
      for (var i = 0; i < 6; i++) {
        var k10 = Math.pow(10, 5 - i);
        var digit = Math.floor(tenths / k10) % 10;
        var lower = tenths % k10;
        var carry = i === 5 ? clamp((tenths % 1 - 0.85) / 0.15, 0, 1) : clamp(lower - (k10 - 1), 0, 1);
        wheels[i].rotation.x = (digit + carry + 0.5) / 10 * TAU;
      }
      /* steam */
      var S = devs.isitici.steam, sa = st.bright.isitici * st.fades.isitici;
      S.mat.opacity = 0.2 * sa;
      if (sa > 0.01) {
        for (var j = 0; j < S.N; j++) {
          var ph = ((t * 0.22 + j / S.N) % 1);
          var sx = S.origin.x - ph * 40 + Math.sin(j * 1.7 + t * 0.9) * 14 * ph;
          var sy = S.origin.y + ph * 105;
          var sz = Math.cos(j * 2.3 + t * 0.7) * 16 * ph;
          S.pos[j * 3] = sx; S.pos[j * 3 + 1] = sy; S.pos[j * 3 + 2] = sz;
        }
        S.geo.attributes.position.needsUpdate = true;
      }
      /* labels */
      var la = sstep(0.4, 1.0, t);
      fade(lDisc, la); fade(lCount, la);
      var ev = Math.floor(st.energy * 10) / 10, ei = Math.floor(ev), ed = Math.round((ev - ei) * 10) % 10;
      setHTML(lCount, 'sayaç <i>(kWh)</i><br><b style="font-family:' + K.fonts.mono.replace(/"/g, "'") + ';font-weight:500;font-size:14px">' + ('0000' + ei).slice(-5) + ',' + ed + ' kWh</b>');
      setHTML(lDev, DEV[d].name + ' · <b>' + K.num(DEV[d].w, 0) + ' W</b>');
      fade(lDev, sstep(0.55, 0.9, t - st.devStart) * la);

      fitZoom(v, 680 / 520, 1.3, t > 0.05 ? dt : 0);
      v.render(dt);
      if (!K.skipRender) overlay(t);
    }
    function overlay(t) {
      var ctx = v.ctx, W = v.w, H = v.h;
      var d = st.cur;
      ORDER.forEach(function (k) {
        var b = st.bright[k] * st.fades[k];
        var g = devs[k].glowAt;
        if (!g || b < 0.01) return;
        var p = v.project(g);
        if (k === 'akkor') {
          K.drawGlow(ctx, PAL.lamp, p.x, p.y, 110, 0.55 * b);
          K.drawGlow(ctx, '#FFF2D6', p.x, p.y, 30, 0.9 * b);
        } else {
          K.drawGlow(ctx, '#FFE9C4', p.x, p.y, 96, 0.5 * b);
          K.drawGlow(ctx, '#FFFFFF', p.x, p.y, 38, 0.45 * b);
        }
      });
      tag2d(ctx, 'hızlandırılmış: 1 saniye = 1 saat', 18, H - 16, { size: 13 });
      var hrs = Math.floor(st.hours);
      K.label(ctx, 'Süre: ' + hrs + ' saat', W - 18, H - 16, { mono: true, size: 16, weight: 600, color: PAL.ink2, align: 'right' });
    }

    function kwhText(x) {
      if (x === 0) return '0';
      var s = x >= 100 ? K.num(x, 0) : x >= 10 ? K.num(x, 1) : x >= 1 ? K.num(x, 2) : K.num(x, 3);
      if (s.indexOf(',') >= 0) s = s.replace(/0+$/, '').replace(/,$/, '');
      return s;
    }

    resetState();
    precompile(v);
    return {
      reset: resetState,
      frame: frame,
      set: function (key, val) { if (key === 'device') cyc.set(String(val), lastT); },
      read: function (key) {
        var d = DEV[cyc.mode];
        if (key === 'power') return K.num(d.w, 0) + ' W';
        if (key === 'formula') return 'P = V × I = 230 V × ' + d.amp + ' A ≈ ' + K.num(d.w, 0) + ' W';
        if (key === 'energy') {
          var h = Math.floor(st.hours);
          return 'E = ' + K.num(d.w, 0) + ' W × ' + h + ' saat = ' + K.num(d.w * h, 0) + ' Wh = ' + kwhText(d.w * h / 1000) + ' kWh';
        }
        if (key === 'device') return cyc.mode;
        if (key === 'explain') return { akkor: 'Eski tip ampul 60 W: disk orta hızda döner, sayaç yavaş yavaş artar.', led: 'LED ampul yalnızca 9 W: disk çok yavaş döner, sayaç neredeyse artmaz.', isitici: 'Isıtıcı 2.000 W: disk hızla döner, sayaç çabucak artar.' }[cyc.mode] || '';
        return '';
      },
      dispose: function () { v.dispose(); }
    };
  });

  /* ================================================================== *
   * charger-3d · S 680×520 · light
   * A white USB-C phone charger: printed rating label, V / A / W / Hz
   * explained on the object, and an opened view of the AC → DC path.
   * Units: millimetres. Bench at y = 0.
   * ================================================================== */
  K.register('charger-3d', function (el, opts) {
    var THREE = window.THREE;
    opts = opts || {};
    var theme = opts.theme || 'light';
    var RM = K.reducedMotion;
    var CAM = { yaw: 0.1, pitch: 0.4, distance: 420, target: [92, 36, -30] };
    if (opts.cam) CAM = { yaw: opts.cam[0], pitch: opts.cam[1], distance: opts.cam[2], target: [opts.cam[3], opts.cam[4], opts.cam[5]] };
    var v = K.stage3d(el, {
      theme: theme, fov: 26, yaw: CAM.yaw, pitch: CAM.pitch, distance: CAM.distance, target: CAM.target,
      size: 110, ground: 0, minDistance: 160, maxDistance: 700, near: 2, far: 4000, exposure: 1.0, minPitch: 0.05, maxPitch: 1.2
    });
    var scene = v.scene;
    if (v.lights) { v.lights.key.intensity = 1.3; v.lights.fill.intensity = 0.55; }

    var BW = 70, BH = 44, BD = 26, SPLIT = -10;   /* body size; split height (local) */
    var root = new THREE.Group(); scene.add(root);
    var ch = new THREE.Group(); ch.position.set(-22, BH / 2, 30); root.add(ch);
    var body = new THREE.Group(); ch.add(body);

    var mShell = new THREE.MeshPhysicalMaterial({ color: 0xF4F3EF, roughness: 0.34, metalness: 0, clearcoat: 0.35, clearcoatRoughness: 0.3 });
    var mShellTop = mShell.clone();
    var mNickel = K.mat.steel({ color: 0xD0D4D9, roughness: 0.2 });
    var mSleeve = K.mat.std(0xEDEBE4, 0.45, 0);
    var mDark = K.mat.std(0x23262C, 0.5, 0);

    /* shell: one seamless rounded body, split at SPLIT by clipping planes (tray below, cover above) */
    var renderer = K.renderer();
    if (renderer) renderer.localClippingEnabled = true;
    var bodyGeo = roundedBox(BW, BH, BD, 6.5, 6);
    var clipTray = new THREE.Plane(), clipCover = new THREE.Plane();
    var pTray = new THREE.Plane(new THREE.Vector3(0, -1, 0), SPLIT), pCover = new THREE.Plane(new THREE.Vector3(0, 1, 0), -SPLIT);
    mShell.side = THREE.DoubleSide; mShell.clippingPlanes = [clipTray]; mShell.clipShadows = true;
    mShellTop.side = THREE.DoubleSide; mShellTop.clippingPlanes = [clipCover]; mShellTop.clipShadows = true;
    var mPlug = new THREE.MeshPhysicalMaterial({ color: 0xF4F3EF, roughness: 0.34, metalness: 0, clearcoat: 0.35, clearcoatRoughness: 0.3 });
    var tray = new THREE.Mesh(bodyGeo, mShell);
    tray.castShadow = true; tray.receiveShadow = true; body.add(tray);
    var topG = new THREE.Group(); body.add(topG);
    var cover = new THREE.Mesh(bodyGeo, mShellTop);
    cover.castShadow = true; cover.receiveShadow = true; topG.add(cover);
    /* wall thickness at the cut, and a fine seam line */
    var rimS = rrShape(BW - 0.3, BD - 0.3, 6.3); rimS.holes.push(rrPath(BW - 3.4, BD - 3.4, 4.8, 0, 0));
    var rimG = new THREE.ExtrudeGeometry(rimS, { depth: 0.5, bevelEnabled: false, curveSegments: 10 }); rimG.rotateX(-Math.PI / 2);
    var rimT = new THREE.Mesh(rimG, mPlug); rimT.position.y = SPLIT - 0.52; body.add(rimT);
    var rimC = new THREE.Mesh(rimG, mPlug); rimC.position.y = SPLIT + 0.02; topG.add(rimC);
    var seamPts = rrShape(BW + 0.02, BD + 0.02, 6.5).getSpacedPoints(160).map(function (p) { return new THREE.Vector3(p.x, SPLIT, -p.y); });
    var seam = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(seamPts, true), 220, 0.16, 5, true), K.mat.std(0xC9C8C1, 0.6, 0));
    topG.add(seam);
    function updateShellClip() {
      tray.updateMatrixWorld(true); cover.updateMatrixWorld(true);
      clipTray.copy(pTray).applyMatrix4(tray.matrixWorld);
      clipCover.copy(pCover).applyMatrix4(cover.matrixWorld);
    }

    /* Europlug pins on the left end (CEE 7/16: Ø4 × 19 mm, 19 mm apart, 10 mm insulated) */
    var pins = new THREE.Group(); body.add(pins);
    [-9.5, 9.5].forEach(function (y) {
      var sl = new THREE.Mesh(new THREE.CylinderGeometry(2.0, 2.0, 10, 24), mSleeve);
      sl.rotation.z = Math.PI / 2; sl.position.set(-BW / 2 - 5, y, 0); sl.castShadow = true; pins.add(sl);
      var tipP = new Profile().m(0, 0).m(2.0, 0).m(2.0, 7.8).arc(1.2, 7.8, 0.8, 0, Math.PI / 2, 4).m(0, 8.6);
      var tip = new THREE.Mesh(latheGeo(tipP, { segs: 24 }), mNickel);
      tip.rotation.z = Math.PI / 2; tip.position.set(-BW / 2 - 10, y, 0); tip.castShadow = true; pins.add(tip);
    });
    var pinTipWorld = new THREE.Vector3(-BW / 2 - 19, 0, 0);

    /* USB-C port on the right end, with a plugged-in cable */
    var portShape = rrShape(8.6, 2.8, 1.35);
    portShape.holes.push(rrPath(7.8, 2.0, 0.95, 0, 0));
    var pg = new THREE.ExtrudeGeometry(portShape, { depth: 2.0, bevelEnabled: false, curveSegments: 8 });
    pg.rotateY(Math.PI / 2);
    var port = new THREE.Mesh(pg, mNickel); port.position.set(BW / 2 - 1.6, 0, 0); body.add(port);
    var plug = new THREE.Mesh(roundedBox(20, 7.2, 11.5, 3.0, 4), mPlug);
    plug.position.set(BW / 2 + 10.4, 0, 0); plug.castShadow = true; body.add(plug);
    var strain = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 3.0, 8, 20), mPlug);
    strain.rotation.z = -Math.PI / 2; strain.position.set(BW / 2 + 24, 0, 0); body.add(strain);

    /* printed rating label on the front face (decal), with highlight underlines */
    var LBL = { w: 62, h: 26, cy: 5 };
    var spans = {};
    var labelTex = liveTexture(1240, 520, function (ctx, W, H) {
      var k = W / LBL.w;
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = '#15181D';
      ctx.textBaseline = 'alphabetic';
      ctx.textAlign = 'left';
      var x0 = 3.0 * k;
      function seg(parts, y, size, weight) {
        ctx.font = (weight || 500) + ' ' + Math.round(size * k) + 'px ' + SANS;
        var x = x0;
        parts.forEach(function (p) {
          var w = ctx.measureText(p[0]).width;
          if (p[2]) drawDCsym(ctx, x + 0.3 * k, y - size * 0.62 * k, 2.6 * k, 0.32 * k), w = 3.3 * k;
          else ctx.fillText(p[0], x, y);
          if (p[1]) spans[p[1]] = (spans[p[1]] || []).concat([[x / k, (x + w) / k, y / k]]);
          x += w;
        });
      }
      for (var key in spans) delete spans[key];
      ctx.font = '600 ' + Math.round(3.3 * k) + 'px ' + SANS;
      ctx.fillStyle = '#0E1116';
      ctx.fillText('USB-C şarj adaptörü', x0, 5.6 * k);
      ctx.fillStyle = '#15181D';
      seg([['Giriş: ', null], ['100–240 V', 'V'], [' ~ ', null], ['50/60 Hz', 'Hz'], [' ', null], ['0,5 A', null]], 12.0 * k, 3.35);
      seg([['Çıkış: ', null], ['5 V', 'V'], [' ', null], ['', null, true], [' ', null], ['3 A', 'A'], [' · ', null], ['15 W', 'W']], 18.2 * k, 3.35);
    });
    function drawDCsym(ctx, x, y, w, lw) {
      ctx.fillRect(x, y, w, lw);
      var d = w / 5;
      for (var i = 0; i < 3; i++) ctx.fillRect(x + i * d * 2, y + lw * 2.4, d, lw);
    }
    var fw = new FontWatch([labelTex]);
    var decal = new THREE.Mesh(new THREE.PlaneGeometry(LBL.w, LBL.h), new THREE.MeshStandardMaterial({ map: labelTex, transparent: true, roughness: 0.5, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }));
    decal.position.set(0, LBL.cy, BD / 2 + 0.02); topG.add(decal);
    /* underline bars, positioned from the measured text spans */
    var mUnder = K.mat.std(0xC8693A, 0.4, 0.2, { emissive: 0xE07A3C, emissiveIntensity: 0.1, transparent: true, opacity: 0 });
    var bars = { V: [], A: [], W: [], Hz: [] };
    var barGeo = new THREE.PlaneGeometry(1, 3.8);
    Object.keys(bars).forEach(function (key) {
      for (var i = 0; i < 2; i++) {
        var m = new THREE.Mesh(barGeo, mUnder.clone()); m.visible = false;
        m.material.polygonOffset = true; m.material.polygonOffsetFactor = -1; m.material.polygonOffsetUnits = -1;
        topG.add(m); bars[key].push(m);
      }
    });
    function layoutBars() {
      Object.keys(bars).forEach(function (key) {
        var list = spans[key] || [];
        bars[key].forEach(function (m, i) {
          var s = list[i];
          if (!s) { m.userData.ok = false; return; }
          m.userData.ok = true;
          m.scale.x = s[1] - s[0];
          m.position.set(-LBL.w / 2 + (s[0] + s[1]) / 2, LBL.cy + LBL.h / 2 - s[2] + 1.2, BD / 2 + 0.005);
        });
      });
    }

    /* ---------- inside: PCB and the AC → DC path ---------- */
    var inside = new THREE.Group(); body.add(inside);
    var mPCB = K.mat.solderMask({ roughness: 0.42 });
    var pcb = new THREE.Mesh(roundedBox(64, 1.6, 21, 0.6, 2), mPCB);
    pcb.position.set(1, SPLIT - 4.2, 0); pcb.receiveShadow = true; inside.add(pcb);
    var PCBY = SPLIT - 3.4;
    /* copper traces (silk-like lines) */
    var mTrace = K.mat.std(0xB7894E, 0.35, 0.7);
    [[-26, -5, -6, -5], [-6, -5, 6, -5], [-26, 5, -6, 5], [12, 6, 30, 6], [12, -6, 30, -6]].forEach(function (s) {
      var tr = new THREE.Mesh(new THREE.BoxGeometry(Math.abs(s[2] - s[0]), 0.08, 0.9), mTrace);
      tr.position.set((s[0] + s[2]) / 2, PCBY + 0.05, s[1]); inside.add(tr);
    });
    /* pin terminals */
    [-9.5, 9.5].forEach(function (y, i) {
      var a = v3(-BW / 2 + 2.2, y, 0), b = v3(-BW / 2 + 7.5, PCBY + 0.6, i ? 3.2 : -3.2);
      var strap = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 1, 8), mNickel);
      orientBetween(strap, a, b); inside.add(strap);
    });
    /* bridge rectifier: four axial diodes (black body, silver cathode band) */
    var mDiode = K.mat.std(0x1B1C20, 0.35, 0);
    var mBand = K.mat.std(0xC9CCD1, 0.3, 0.6);
    var diodes = new THREE.Group(); inside.add(diodes);
    diodes.scale.setScalar(1.8); diodes.position.set(22.25 * 0.8, -0.8 * PCBY, 0);
    var mFrame = K.mat.std(0xC8693A, 0.4, 0.3, { emissive: 0xC8693A, emissiveIntensity: 0.25 });
    [[-21.5, -9.4, 19.5, 0.5], [-21.5, 9.4, 19.5, 0.5], [-31.2, 0, 0.5, 18.8], [-11.8, 0, 0.5, 18.8]].forEach(function (f) {
      var fb = new THREE.Mesh(new THREE.BoxGeometry(f[2], 0.15, f[3]), mFrame); fb.position.set(f[0], PCBY + 0.1, f[1]); inside.add(fb);
    });
    /* four 1N4007-type diodes mounted upright, as in compact chargers */
    [[-25, -3.4], [-25, 3.4], [-19.5, -3.4], [-19.5, 3.4]].forEach(function (d, i) {
      var g = new THREE.Group();
      var bd = new THREE.Mesh(new THREE.CylinderGeometry(1.35, 1.35, 5.2, 18), mDiode); bd.position.y = 4.2; g.add(bd);
      var bn = new THREE.Mesh(new THREE.CylinderGeometry(1.38, 1.38, 0.9, 18), mBand); bn.position.y = (i % 2) ? 6.2 : 2.2; g.add(bn);
      var ld = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 1.6, 6), mNickel); ld.position.y = 0.8; g.add(ld);
      var loop = new THREE.Mesh(new THREE.TorusGeometry(1.4, 0.3, 6, 16, Math.PI), mNickel); loop.position.set(1.4, 6.8, 0); g.add(loop);
      var ld2 = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 6.8, 6), mNickel); ld2.position.set(2.8, 3.4, 0); g.add(ld2);
      g.position.set(d[0], PCBY, d[1]); diodes.add(g);
    });
    /* bulk electrolytic capacitor */
    var capG = new THREE.Group(); capG.position.set(-6, PCBY, -2); inside.add(capG);
    var capTex = K.textTexture(512, 256, function (ctx, W, H) {
      ctx.fillStyle = '#23324D'; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = '#9FB0CC'; ctx.fillRect(W * 0.62, 0, W * 0.16, H);
      ctx.fillStyle = '#E8ECF2'; ctx.font = '600 44px ' + MONO; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.save(); ctx.translate(W * 0.3, H / 2); ctx.fillText('10 µF 400 V', 0, 0); ctx.restore();
      ctx.fillStyle = '#23324D'; ctx.font = '700 60px ' + SANS;
      ctx.fillText('−', W * 0.7, H / 2);
    });
    var capBody = new THREE.Mesh(new THREE.CylinderGeometry(5.0, 5.0, 16, 40, 1, true), K.mat.std(0xFFFFFF, 0.4, 0, { map: capTex }));
    capBody.position.y = 8.4; capG.add(capBody);
    var capTop = new THREE.Mesh(latheGeo(new Profile().m(0, 0).m(5.0, 0).m(5.0, 0.4).arc(4.6, 0.4, 0.4, 0, Math.PI / 2, 3).m(0, 0.8), { segs: 40 }), K.mat.aluminium({ roughness: 0.32 }));
    capTop.position.y = 16.4; capG.add(capTop);
    var vent = new THREE.Mesh(new THREE.BoxGeometry(6.4, 0.12, 0.35), mDark); vent.position.y = 17.25; capG.add(vent);
    var vent2 = vent.clone(); vent2.rotation.y = Math.PI / 3; capG.add(vent2);
    var vent3 = vent.clone(); vent3.rotation.y = -Math.PI / 3; capG.add(vent3);
    /* switching transformer: EE ferrite core, bobbin, yellow tape */
    var trG = new THREE.Group(); trG.position.set(11, PCBY, 0); inside.add(trG);
    var mFerrite = K.mat.std(0x3B3E44, 0.55, 0.2);
    var bob = new THREE.Mesh(roundedBox(10, 13, 15, 0.6, 2), K.mat.std(0x1E2026, 0.6, 0)); bob.position.y = 7.5; trG.add(bob);
    var tape = new THREE.Mesh(roundedBox(10.4, 9.6, 15.4, 1.6, 3), K.mat.std(0xE3C24A, 0.42, 0)); tape.position.y = 7.6; trG.add(tape);
    [-6.2, 6.2].forEach(function (x) {
      var leg = new THREE.Mesh(roundedBox(2.6, 14, 13, 0.4, 2), mFerrite); leg.position.set(x, 7.2, 0); trG.add(leg);
    });
    var yoke = new THREE.Mesh(roundedBox(15, 2.6, 13, 0.4, 2), mFerrite); yoke.position.set(0, 14.6, 0); trG.add(yoke);
    var yoke2 = yoke.clone(); yoke2.position.y = 0.4; trG.add(yoke2);
    /* controller IC and optocoupler */
    var ic = new THREE.Mesh(roundedBox(5, 1.6, 4, 0.3, 2), mDark); ic.position.set(-1, PCBY + 0.8, 7.0); inside.add(ic);
    var opto = new THREE.Mesh(roundedBox(4.6, 3.2, 6.4, 0.4, 2), K.mat.std(0xF2F1EC, 0.5, 0)); opto.position.set(21, PCBY + 1.6, 7.5); inside.add(opto);
    /* output capacitor */
    var oc = new THREE.Mesh(new THREE.CylinderGeometry(3.0, 3.0, 9, 28), K.mat.std(0x2A2C33, 0.4, 0)); oc.position.set(23, PCBY + 4.5, -4); inside.add(oc);
    var ocTop = new THREE.Mesh(new THREE.CylinderGeometry(2.8, 2.8, 0.4, 28), K.mat.aluminium({ roughness: 0.32 })); ocTop.position.set(23, PCBY + 9.1, -4); inside.add(ocTop);
    /* USB-C receptacle body */
    var rec = new THREE.Mesh(roundedBox(7, 3.4, 9.2, 1.4, 3), mNickel); rec.position.set(BW / 2 - 4.6, 0, 0); inside.add(rec);
    inside.visible = false;

    /* ---------- the phone (lying flat, screen up) and the cable ---------- */
    var PH_TILT = 1.02;
    var phone = new THREE.Group(); phone.position.set(212, 0, -84); phone.rotation.y = -1.2; root.add(phone);
    var phoneTilt = new THREE.Group(); phoneTilt.rotation.x = Math.PI / 2 - PH_TILT; phoneTilt.position.set(0, 14 + 76 * Math.sin(Math.PI / 2 - PH_TILT), -76 * Math.cos(Math.PI / 2 - PH_TILT) + 4); phone.add(phoneTilt);
    /* a simple aluminium stand */
    var mStand = K.mat.aluminium({ roughness: 0.34 });
    var sBase = new THREE.Mesh(roundedBox(64, 3, 58, 1.2, 2), mStand); sBase.position.set(0, 1.5, -6); sBase.castShadow = sBase.receiveShadow = true; phone.add(sBase);
    var sBack = new THREE.Mesh(roundedBox(56, 3, 84, 1.2, 2), mStand);
    sBack.rotation.x = Math.PI / 2 - PH_TILT; sBack.position.set(0, 24, -40); sBack.castShadow = true; phone.add(sBack);
    var sLip = new THREE.Mesh(roundedBox(64, 12, 3, 1.2, 2), mStand); sLip.position.set(0, 7, 12); sLip.castShadow = true; phone.add(sLip);
    var ps = rrShape(72, 150, 9.5);
    var pgeo = new THREE.ExtrudeGeometry(ps, { depth: 5.6, bevelEnabled: true, bevelThickness: 1.2, bevelSize: 1.2, bevelSegments: 3, curveSegments: 12 });
    pgeo.rotateX(-Math.PI / 2); pgeo.translate(0, 1.2, 0);
    pgeo.translate(0, -4.0, 0);
    var pbody = new THREE.Mesh(pgeo, K.mat.std(0x2B2F37, 0.32, 0.6)); pbody.castShadow = true; pbody.receiveShadow = true; phoneTilt.add(pbody);
    var screenCv = document.createElement('canvas'); screenCv.width = 360; screenCv.height = 750;
    var screenTex = new THREE.CanvasTexture(screenCv); screenTex.encoding = THREE.sRGBEncoding; screenTex.anisotropy = 8;
    var screen = new THREE.Mesh(new THREE.PlaneGeometry(67, 145), new THREE.MeshStandardMaterial({ map: screenTex, roughness: 0.3, metalness: 0, emissive: 0xffffff, emissiveMap: screenTex, emissiveIntensity: 0.9, envMapIntensity: 0.12 }));
    screen.rotation.x = -Math.PI / 2; screen.position.y = 4.1; phoneTilt.add(screen);
    var lastPct = -1, lastFontOK = false;
    function drawScreen(pct, w) {
      var ctx = screenCv.getContext('2d'), W = screenCv.width, H = screenCv.height;
      ctx.fillStyle = '#0E121A'; ctx.fillRect(0, 0, W, H);
      /* battery icon, rotated so it reads from the charger side */
      ctx.save(); ctx.translate(W / 2, H * 0.47);
      var bw = 132, bh = 300;
      ctx.strokeStyle = '#EEF0F3'; ctx.lineWidth = 10;
      K.rr(ctx, -bw / 2, -bh / 2, bw, bh, 22); ctx.stroke();
      ctx.fillStyle = '#EEF0F3'; K.rr(ctx, -30, -bh / 2 - 26, 60, 20, 6); ctx.fill();
      var fh = (bh - 32) * clamp(pct / 100, 0, 1);
      ctx.fillStyle = pct >= 99.5 ? '#E39A6C' : '#C8693A';
      if (fh > 1) { K.rr(ctx, -bw / 2 + 16, bh / 2 - 16 - fh, bw - 32, fh, 10); ctx.fill(); }
      ctx.restore();
      ctx.fillStyle = '#EEF0F3'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = '600 66px ' + SANS;
      ctx.fillText('%' + Math.round(pct), W / 2, H * 0.83);
      ctx.font = '500 30px ' + MONO; ctx.fillStyle = '#9AA3B2';
      ctx.fillText(w ? 'şarj · 15 W' : 'şarj oluyor', W / 2, H * 0.91);
      screenTex.needsUpdate = true;
    }
    drawScreen(42, false);
    root.updateMatrixWorld(true);
    var phonePort = phoneTilt.localToWorld(new THREE.Vector3(0, 0.5, 76.5));
    var portDir = phoneTilt.localToWorld(new THREE.Vector3(0, 0.5, 92)).sub(phonePort).normalize();
    var cableStart = new THREE.Vector3(ch.position.x + BW / 2 + 27, ch.position.y, ch.position.z);
    var cableCurve = new THREE.CatmullRomCurve3([
      cableStart, v3(cableStart.x + 12, cableStart.y - 4, cableStart.z + 1), v3(cableStart.x + 24, 2.2, cableStart.z + 8),
      v3(cableStart.x + 46, 2.0, cableStart.z - 6), phonePort.clone().addScaledVector(portDir, 48).setY(2.0),
      phonePort.clone().addScaledVector(portDir, 22).setY(3.0), phonePort.clone().addScaledVector(portDir, 9), phonePort
    ], false, 'catmullrom', 0.5);
    var mCableS = new THREE.MeshPhysicalMaterial({ color: 0xF3F2EE, roughness: 0.4, metalness: 0, transparent: true, opacity: 1, clearcoat: 0.2, depthWrite: true });
    var cable = new THREE.Mesh(new THREE.TubeGeometry(cableCurve, 220, 1.9, 14, false), mCableS); cable.castShadow = true; root.add(cable);
    /* two conductors inside the cable (seen when the sheath turns clear in "A") */
    var cPts = cableCurve.getSpacedPoints(220), condA = [], condB = [];
    (function () {
      var tng = new THREE.Vector3(), nrm = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
      for (var i = 0; i < cPts.length; i++) {
        var a = cPts[Math.max(0, i - 1)], b = cPts[Math.min(cPts.length - 1, i + 1)];
        tng.subVectors(b, a).normalize();
        nrm.crossVectors(tng, up).normalize();
        condA.push(cPts[i].clone().addScaledVector(nrm, 0.75));
        condB.push(cPts[i].clone().addScaledVector(nrm, -0.75));
      }
    })();
    var PA = new Poly(condA), PB = new Poly(condB);
    var condMatA = K.mat.std(0xB3352A, 0.45, 0), condMatB = K.mat.std(0x2B2F37, 0.45, 0);
    var wireA = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(condA), 220, 0.42, 6, false), condMatA);
    var wireB = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(condB), 220, 0.42, 6, false), condMatB);
    wireA.visible = wireB.visible = false; root.add(wireA); root.add(wireB);
    var NE = 26;
    var eA = K.instanced(NE, { radius: 0.62, material: K.mat.electron(false), detail: 1 });
    var eB = K.instanced(NE, { radius: 0.62, material: K.mat.electron(false), detail: 1 });
    root.add(eA); root.add(eB);

    /* pressure arrows at the port (V) */
    var mArrow = K.mat.std(0xC8693A, 0.4, 0.1, { emissive: 0xC8693A, emissiveIntensity: 0.25, transparent: true, opacity: 0 });
    var arrows = [];
    for (var ai = 0; ai < 3; ai++) {
      var ag = new THREE.Group();
      var shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 7, 12), mArrow); shaft.rotation.z = -Math.PI / 2; shaft.position.x = 3.5; ag.add(shaft);
      var head = new THREE.Mesh(new THREE.ConeGeometry(1.5, 3.4, 16), mArrow); head.rotation.z = -Math.PI / 2; head.position.x = 8.6; ag.add(head);
      body.add(ag); arrows.push(ag);
    }

    /* ---------- labels ---------- */
    var tmp1 = new THREE.Vector3(), tmp2 = new THREE.Vector3(), tmp3 = new THREE.Vector3(), tmp4 = new THREE.Vector3();
    var lV = v.label('<b>5 V</b>: telefona giden itiş', { at: function () { return body.localToWorld(tmp1.set(BW / 2 + 34, 17, 0)); }, cls: 'kge-c', html: true, dy: -8 });
    var tmpCA = new THREE.Vector3();
    var lA = v.label('<b>3 A</b>: kablodan geçen akım', { at: function () { return root.localToWorld(cableCurve.getPoint(0.3, tmpCA)); }, cls: 'kge-c', html: true, dy: 34, dx: -40 });
    var lW = v.label('5 V × 3 A = <b>15 W</b>', { at: function () { return phoneTilt.localToWorld(tmp3.set(-36, 6, 10)); }, cls: 'kge-c', html: true, dx: -16, align: 'right' });
    var lT = v.label('transformatör <i>gerilimi düşürür</i>', { at: function () { return body.localToWorld(tmp4.set(11, PCBY + 15.5, 0)); }, cls: 'kge-s', html: true, dx: 80, dy: -70, line: true, valign: 'bottom' });
    var tmp5 = new THREE.Vector3(), tmp6 = new THREE.Vector3();
    var lD = v.label('diyotlar<br><i>AC → DC</i>', { at: function () { return body.localToWorld(tmp5.set(-22, PCBY + 7.2, 0)); }, cls: 'kge-s', html: true, dx: -46, dy: 78, line: true, align: 'center', valign: 'top' });
    var lC = v.label('kondansatör<br><i>dalgalanmayı düzeltir</i>', { at: function () { return body.localToWorld(tmp6.set(-6, PCBY + 17.5, -2)); }, cls: 'kge-s', html: true, dx: -150, dy: -62, line: true, align: 'center', valign: 'bottom' });
    [lV, lA, lW, lT, lD, lC].forEach(function (L) { L.show(false); });

    /* ---------- state ---------- */
    var UNITS = ['V', 'A', 'W', 'Hz', 'hepsi', 'ic'];
    var cyc = new ModeCycle(UNITS, 6.5, 'V');
    var st = {};
    var lastT = 0;
    var effects = { V: 0, A: 0, W: 0, Hz: 0 };
    function resetState() {
      cyc.reset();
      st.open = 0; st.openTarget = 0; st.pct = 42; st.turn = 0; st.viewOpen = 0;
      v.home.yaw = CAM.yaw; v.home.pitch = CAM.pitch; v.home.distance = CAM.distance; v.home.target.fromArray(CAM.target);
      effects.V = effects.A = effects.W = effects.Hz = 0;
      v.setView(CAM);
    }
    function active(u, mode) { return mode === 'hepsi' || mode === u ? 1 : 0; }

    function frame(t, dt) {
      lastT = t;
      if (fw.tick(), fw.done && !lastFontOK) { lastFontOK = true; lastPct = -1; }
      cyc.tick(t);
      var mode = cyc.mode, lt = cyc.local(t);
      if (cyc.auto) st.openTarget = mode === 'ic' ? 1 : 0;
      var on = sstep(0.3, 1.0, t);
      ['V', 'A', 'W', 'Hz'].forEach(function (u) {
        var target = active(u, mode) * on;
        effects[u] = RM ? target : approach(effects[u], target, 4, dt);
      });
      /* opening */
      st.open = RM ? st.openTarget : approach(st.open, st.openTarget, 3.0, dt);
      var o = EASE.inOut(clamp(st.open, 0, 1));
      topG.position.set(0, o * 55, -o * 40);
      topG.rotation.x = -o * 0.9;
      var shellA = 1 - 0.85 * sstep(0, 0.8, o);
      topG.visible = o < 0.8;
      decal.visible = o < 0.6;
      phone.visible = cable.visible = o < 0.5;
      if ((shellA < 0.999) !== mShellTop.transparent) { mShellTop.transparent = shellA < 0.999; mShellTop.needsUpdate = true; }
      mShellTop.opacity = shellA;
      inside.visible = o > 0.01;
      var wantView = st.openTarget ? 1 : 0;
      if (wantView !== st.viewOpen) {
        st.viewOpen = wantView;
        var VV = wantView ? { yaw: CAM.yaw + 0.04, pitch: 0.85, distance: CAM.distance * 0.7, target: [-14, 6, 30] } : CAM;
        if (t > 0.05) v.animateTo(VV, 1.4); else v.setView(VV);
        v.home.yaw = VV.yaw; v.home.pitch = VV.pitch; v.home.distance = VV.distance; v.home.target.fromArray(VV.target);
      }
      /* slow turntable motion; the whole set turns toward the pins for "Hz" */
      var want = effects.Hz * 0.32;
      st.turn = RM ? want : approach(st.turn, want, 1.6, dt);
      root.rotation.y = st.turn + (RM ? 0 : Math.sin(t * 0.26) * 0.09);
      root.updateMatrixWorld(true);
      updateShellClip();
      rimT.visible = rimC.visible = o > 0.002;

      /* label underline bars */
      layoutBars();
      Object.keys(bars).forEach(function (u) {
        var a = effects[u];
        bars[u].forEach(function (m) {
          m.visible = m.userData.ok && a > 0.01 && o < 0.6;
          m.material.opacity = a * 0.5;
          m.material.emissiveIntensity = 0.1 + 0.06 * Math.sin(t * 3.0);
        });
      });

      /* V: pressure arrows pushing out of the port */
      var aV = effects.V;
      mArrow.opacity = aV;
      for (var i = 0; i < arrows.length; i++) {
        var ag = arrows[i];
        ag.visible = aV > 0.01 && o < 0.5;
        var ph = ((t * 0.55 + i / arrows.length) % 1);
        ag.position.set(BW / 2 + 30 + ph * 14, 9 + (i - 1) * 5.5, 0);
        var s = Math.sin(ph * Math.PI);
        ag.scale.setScalar(0.6 + 0.6 * s);
      }
      mArrow.opacity = aV * 0.95;

      /* A: the sheath turns translucent, electrons flow in both conductors (a closed loop) */
      var aA = effects.A;
      var sheathA = 1 - 0.68 * aA;
      if ((sheathA < 0.999) !== mCableS.transparent) { mCableS.transparent = sheathA < 0.999; mCableS.depthWrite = !(sheathA < 0.999); mCableS.needsUpdate = true; }
      mCableS.opacity = sheathA;
      wireA.visible = wireB.visible = aA > 0.01;
      eA.visible = eB.visible = aA > 0.01 && o < 0.5;
      if (o >= 0.5) wireA.visible = wireB.visible = false;
      if (aA > 0.01) {
        for (i = 0; i < NE; i++) {
          var f = ((i / NE) + t * 0.11) % 1;
          PA.at((1 - f) * PA.len, tmp2); eA.setAt(i, tmp2.x, tmp2.y + 0.25, tmp2.z, aA);
          PB.at(f * PB.len, tmp3); eB.setAt(i, tmp3.x, tmp3.y + 0.25, tmp3.z, aA);
        }
        eA.commit(); eB.commit();
      }

      /* W: the phone battery fills */
      var aW = effects.W;
      if (aW > 0.05) st.pct = Math.min(100, st.pct + dt * 12 * aW);
      if (st.pct >= 100 && mode !== 'W' && mode !== 'hepsi') st.pct = 42;
      if (mode === 'W' && lt < 0.05) st.pct = Math.min(st.pct, 42);
      var pr = Math.round(st.pct);
      if (pr !== lastPct) { lastPct = pr; drawScreen(st.pct, aW > 0.5); }

      /* labels */
      fade(lV, effects.V * (1 - sstep(0.05, 0.5, o)));
      fade(lA, effects.A * (1 - sstep(0.05, 0.5, o)));
      fade(lW, effects.W * (1 - sstep(0.05, 0.5, o)));
      var oa = sstep(0.55, 0.95, st.open);
      fade(lT, oa); fade(lD, oa); fade(lC, oa);

      fitZoom(v, 680 / 520, st.viewOpen ? 2.0 : 1.12, t > 0.05 ? dt : 0);
      v.render(dt);
      if (!K.skipRender) overlay(t);
    }

    function overlay(t) {
      var ctx = v.ctx, H = v.h;
      if (effects.W > 0.01) tag2d(ctx, 'şarj hızlandırılmış', 18, H - 16, { alpha: effects.W });
      var aHz = effects.Hz;
      if (aHz > 0.01) {
        body.localToWorld(tmp4.copy(pinTipWorld));
        var p = v.project(tmp4);
        var w = 132, h = 64, x = clamp(p.x - w - 14, 10, v.w - w - 10), y = clamp(p.y - h - 22, 10, H - h - 10);
        ctx.save();
        ctx.globalAlpha = aHz;
        ctx.fillStyle = 'rgba(255,255,255,0.94)'; ctx.strokeStyle = '#E3E3DD'; ctx.lineWidth = 1;
        K.rr(ctx, x, y, w, h, 8); ctx.fill(); ctx.stroke();
        ctx.strokeStyle = 'rgba(21,23,28,0.12)';
        ctx.beginPath(); ctx.moveTo(x + 10, y + 34); ctx.lineTo(x + w - 10, y + 34); ctx.stroke();
        ctx.strokeStyle = PAL.copperFill; ctx.lineWidth = 2;
        ctx.beginPath();
        for (var i = 0; i <= 80; i++) {
          var u = i / 80, xx = x + 10 + u * (w - 20);
          var yy = y + 34 - Math.sin(u * TAU * 2.5 - t * 2.2) * 13;
          if (i === 0) ctx.moveTo(xx, yy); else ctx.lineTo(xx, yy);
        }
        ctx.stroke();
        K.label(ctx, '50 Hz', x + 10, y + h - 7, { mono: true, size: 12, weight: 600, color: PAL.copper });
        K.label(ctx, 'yavaşlatılmış', x + w - 10, y + 14, { mono: true, size: 10, weight: 500, color: PAL.muted, align: 'right' });
        ctx.strokeStyle = 'rgba(89,94,105,0.6)'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(x + w * 0.62, y + h); ctx.lineTo(p.x, p.y); ctx.stroke();
        ctx.fillStyle = 'rgba(89,94,105,0.8)'; ctx.beginPath(); ctx.arc(p.x, p.y, 2, 0, TAU); ctx.fill();
        ctx.restore();
      }
    }

    var READ = {
      ic: 'Adaptörün içi: diyotlar akımı düzeltir, transformatör gerilimi 5 volta indirir.',
      V: 'Volt (V): itiş. Prizimizdeki 230 V alternatif gerilim, şarj adaptöründe telefon için 5 V doğru gerilime düşürülür.',
      A: 'Amper (A): akış. Kablodan her saniye geçen yük miktarı; bu adaptör en çok 3 A verir.',
      W: 'Watt (W): güç. 5 V × 3 A = 15 W: her saniye 15 joule enerji aktarılır.',
      Hz: 'Hertz (Hz): prizdeki akım saniyede 50 kez ileri geri salınır (50 Hz).',
      hepsi: 'Giriş 230 V ~ 50 Hz → çıkış 5 V doğru gerilim, 3 A: 5 V × 3 A = 15 W.'
    };

    resetState();
    precompile(v);
    return {
      reset: resetState,
      frame: frame,
      set: function (key, val) {
        if (key === 'unit') cyc.set(String(val), lastT);
        else if (key === 'open') { cyc.auto = false; st.openTarget = (+val) ? 1 : 0; }
      },
      read: function (key) {
        if (key === 'unit') return READ[cyc.mode] || '';
        if (key === 'explain') return { V: 'Volt (V) itiştir: prizdeki 230 V, adaptörde telefon için 5 V doğru gerilime düşer.', A: 'Amper (A) akıştır: kablodan her saniye geçen yük. Bu adaptör en çok 3 A verir.', W: 'Watt (W) güçtür: 5 V × 3 A = 15 W, yani her saniye 15 joule enerji aktarılır.', Hz: 'Hertz (Hz): prizdeki akım saniyede 50 kez ileri geri salınır.', hepsi: 'Etiket: giriş 230 V ~ 50 Hz, çıkış 5 V ⎓ 3 A, güç 15 W.', ic: 'İçeride diyotlar akımı düzeltir, kondansatör yumuşatır, transformatör gerilimi 5 volta indirir.' }[cyc.mode] || '';
        if (key === 'open') return st.openTarget ? '1' : '0';
        return '';
      },
      dispose: function () { v.dispose(); }
    };
  });

  /* ================================================================== *
   * Shared diorama parts (energy-chain, grid-journey)
   * A museum-style landscape slab with a cut soil face, lattice towers,
   * catenary conductors, houses and transformers. Free units.
   * ================================================================== */
  var DIO = {};

  /* terrain heightfield with vertex colours */
  DIO.terrain = function (x0, x1, z0, z1, nx, nz, hFn, colFn) {
    var THREE = window.THREE;
    var g = new THREE.PlaneGeometry(x1 - x0, z1 - z0, nx, nz);
    g.rotateX(-Math.PI / 2);
    g.translate((x0 + x1) / 2, 0, (z0 + z1) / 2);
    var p = g.attributes.position, cols = new Float32Array(p.count * 3), c = new THREE.Color();
    for (var i = 0; i < p.count; i++) {
      var x = p.getX(i), z = p.getZ(i), y = hFn(x, z);
      p.setY(i, y);
    }
    g.computeVertexNormals();
    var n = g.attributes.normal;
    for (i = 0; i < p.count; i++) {
      colFn(p.getX(i), p.getY(i), p.getZ(i), n.getY(i), c);
      cols[i * 3] = c.r; cols[i * 3 + 1] = c.g; cols[i * 3 + 2] = c.b;
    }
    g.setAttribute('color', new THREE.BufferAttribute(cols, 3));
    var m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.92, metalness: 0 }));
    m.receiveShadow = true; m.castShadow = true;
    return m;
  };

  /* soil strata texture for the cut faces (v: 0 = base, 1 = top of the slab) */
  DIO.strata = function (seed) {
    var THREE = window.THREE;
    var tex = K.textTexture(512, 512, function (ctx, W, H) {
      var rng = K.rng(seed || 5);
      var bands = [['#8C8379', 0.0], ['#9C8F80', 0.22], ['#B59C77', 0.42], ['#A58864', 0.6], ['#8E7353', 0.74], ['#6F5641', 0.86], ['#5E4836', 1.0]];
      for (var i = 0; i < bands.length - 1; i++) {
        var y0 = H * (1 - bands[i + 1][1]), y1 = H * (1 - bands[i][1]);
        ctx.fillStyle = bands[i][0];
        ctx.fillRect(0, y0, W, y1 - y0 + 1);
      }
      for (i = 0; i < 900; i++) {
        ctx.fillStyle = 'rgba(' + (rng() < 0.5 ? '255,255,255' : '40,30,20') + ',' + (0.04 + rng() * 0.07).toFixed(3) + ')';
        var x = rng() * W, y = rng() * H, r = 1 + rng() * 3.5;
        ctx.beginPath(); ctx.ellipse(x, y, r * 2.2, r, 0, 0, TAU); ctx.fill();
      }
      for (i = 0; i < 26; i++) {
        ctx.strokeStyle = 'rgba(40,30,20,0.12)'; ctx.lineWidth = 1;
        var yy = rng() * H;
        ctx.beginPath(); ctx.moveTo(0, yy);
        for (var xx = 0; xx <= W; xx += 32) ctx.lineTo(xx, yy + Math.sin(xx * 0.02 + i) * 3);
        ctx.stroke();
      }
    });
    tex.wrapS = THREE.RepeatWrapping;
    return tex;
  };

  /* vertical cut face following the terrain profile along x at z = zf (faces +z) */
  DIO.frontFace = function (x0, x1, zf, base, hFn, tex, n, top, flip) {
    var THREE = window.THREE;
    var pos = [], uv = [], idx = [];
    n = n || 200;
    var span = (top || 16) - base;
    for (var i = 0; i <= n; i++) {
      var x = x0 + (x1 - x0) * i / n, y = hFn(x, zf);
      pos.push(x, y, zf, x, base, zf);
      uv.push((x - x0) / 40, (y - base) / span, (x - x0) / 40, 0);
    }
    for (i = 0; i < n; i++) {
      var a = i * 2, b = a + 1, c = a + 2, d = a + 3;
      if (flip) idx.push(a, c, b, b, c, d); else idx.push(a, b, c, b, d, c);
    }
    var g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.setIndex(idx); g.computeVertexNormals();
    var m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ map: tex, color: 0xC9BBA3, roughness: 0.95, metalness: 0 }));
    m.receiveShadow = true;
    return m;
  };
  /* side cut face at x = xs, following the profile along z (faces ±x) */
  DIO.sideFace = function (xs, z0, z1, base, hFn, tex, faceRight, top) {
    var THREE = window.THREE;
    var pos = [], uv = [], idx = [], n = 40, span = (top || 16) - base;
    for (var i = 0; i <= n; i++) {
      var z = z0 + (z1 - z0) * i / n, y = hFn(xs, z);
      pos.push(xs, y, z, xs, base, z);
      uv.push((z - z0) / 40, (y - base) / span, (z - z0) / 40, 0);
    }
    for (i = 0; i < n; i++) {
      var a = i * 2, b = a + 1, c = a + 2, d = a + 3;
      if (faceRight) idx.push(a, c, b, b, c, d); else idx.push(a, b, c, b, d, c);
    }
    var g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.setIndex(idx); g.computeVertexNormals();
    return new THREE.Mesh(g, new THREE.MeshStandardMaterial({ map: tex, color: 0xC9BBA3, roughness: 0.95, metalness: 0 }));
  };

  /* a lattice transmission tower (single circuit, horizontal phases) as one merged mesh */
  DIO.tower = function (h, o) {
    var THREE = window.THREE;
    o = o || {};
    var b = o.base || h * 0.16, tp = o.top || h * 0.05, arm = o.arm || h * 0.36, t = o.member || h * 0.012;
    var geos = [];
    var up = new THREE.Vector3(0, 1, 0), d = new THREE.Vector3(), q = new THREE.Quaternion(), m4 = new THREE.Matrix4(), sc = new THREE.Vector3();
    function member(a, c, thick) {
      d.subVectors(c, a);
      var len = d.length();
      if (len < 1e-6) return;
      var g = new THREE.BoxGeometry(thick || t, len, thick || t);
      q.setFromUnitVectors(up, d.normalize());
      m4.compose(new THREE.Vector3().addVectors(a, c).multiplyScalar(0.5), q, sc.set(1, 1, 1));
      g.applyMatrix4(m4);
      geos.push(g);
    }
    function corner(y, sx, sz) { var w = lerp(b, tp, Math.pow(y / h, 0.85)); return new THREE.Vector3(sx * w, y, sz * w); }
    var levels = [0, 0.18, 0.34, 0.48, 0.6, 0.71, 0.8, 0.88, 0.94, 1.0].map(function (f) { return f * h; });
    var S = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
    for (var i = 0; i < levels.length - 1; i++) {
      var y0 = levels[i], y1 = levels[i + 1];
      for (var k = 0; k < 4; k++) {
        var s0 = S[k], s1 = S[(k + 1) % 4];
        member(corner(y0, s0[0], s0[1]), corner(y1, s0[0], s0[1]), t * 1.6);
        member(corner(y1, s0[0], s0[1]), corner(y1, s1[0], s1[1]));
        member(corner(y0, s0[0], s0[1]), corner(y1, s1[0], s1[1]), t * 0.8);
        member(corner(y0, s1[0], s1[1]), corner(y1, s0[0], s0[1]), t * 0.8);
      }
    }
    /* cross-arm truss along x at the top */
    var ya = h * 0.94, yb = h;
    var armPts = [];
    for (var sx = -1; sx <= 1; sx += 2) {
      var a0 = new THREE.Vector3(sx * tp, ya, -tp), a1 = new THREE.Vector3(sx * arm, ya, -tp * 0.5);
      var a2 = new THREE.Vector3(sx * tp, ya, tp), a3 = new THREE.Vector3(sx * arm, ya, tp * 0.5);
      var a4 = new THREE.Vector3(sx * tp, yb, 0), a5 = new THREE.Vector3(sx * arm * 0.92, ya + (yb - ya) * 0.35, 0);
      member(a0, a1); member(a2, a3); member(a4, a5); member(a1, a5); member(a3, a5);
      for (var j = 1; j <= 3; j++) {
        var f = j / 4;
        member(new THREE.Vector3(sx * lerp(tp, arm, f), ya, -tp * lerp(1, 0.5, f)), new THREE.Vector3(sx * lerp(tp, arm, f), ya, tp * lerp(1, 0.5, f)), t * 0.8);
        member(new THREE.Vector3(sx * lerp(tp, arm, f), ya, -tp * lerp(1, 0.5, f)), new THREE.Vector3(sx * lerp(tp, arm * 0.92, f), lerp(yb, ya + (yb - ya) * 0.35, f), 0), t * 0.7);
      }
      armPts.push(new THREE.Vector3(sx * arm * 0.95, ya, 0));
    }
    armPts.splice(1, 0, new THREE.Vector3(0, ya, 0));
    /* earth-wire peaks */
    for (sx = -1; sx <= 1; sx += 2) {
      member(new THREE.Vector3(sx * tp, yb, -tp), new THREE.Vector3(sx * tp * 2.2, yb + h * 0.07, 0));
      member(new THREE.Vector3(sx * tp, yb, tp), new THREE.Vector3(sx * tp * 2.2, yb + h * 0.07, 0));
    }
    var mesh = new THREE.Mesh(mergeGeos(geos), o.material || K.mat.steel({ color: 0xA9AEB6, roughness: 0.45 }));
    mesh.castShadow = true;
    /* insulator strings (dark glass discs) hanging from the phase points */
    var grp = new THREE.Group(); grp.add(mesh);
    var mIns = o.insMat || K.mat.std(0x5B6E7A, 0.25, 0.1);
    var ins = [];
    var strL = o.string || h * 0.09;
    armPts.forEach(function (p) {
      var s = new THREE.Mesh(new THREE.CylinderGeometry(t * 2.2, t * 2.2, strL, 8), mIns);
      s.position.set(p.x, p.y - strL / 2, p.z); grp.add(s);
      ins.push(new THREE.Vector3(p.x, p.y - strL, p.z));
    });
    grp.userData.phases = ins;          /* conductor attachment points (local) */
    grp.userData.peaks = [new THREE.Vector3(-tp * 2.2, yb + h * 0.07, 0), new THREE.Vector3(tp * 2.2, yb + h * 0.07, 0)];
    return grp;
  };

  /* catenary-like sag between two points (parabola approximation) */
  DIO.catenary = function (a, b, sag, n) {
    var THREE = window.THREE;
    var pts = [];
    n = n || 24;
    for (var i = 0; i <= n; i++) {
      var f = i / n;
      var p = new THREE.Vector3().lerpVectors(a, b, f);
      p.y -= sag * 4 * f * (1 - f);
      pts.push(p);
    }
    return pts;
  };
  DIO.cable = function (pts, r, mat) {
    var THREE = window.THREE;
    var c = new THREE.CatmullRomCurve3(pts, false, 'catmullrom', 0.5);
    var m = new THREE.Mesh(new THREE.TubeGeometry(c, Math.max(8, pts.length * 2), r, 5, false), mat);
    return m;
  };

  /* a small gable-roof house; returns {group, windowMat} */
  DIO.house = function (w, h, d, o) {
    var THREE = window.THREE;
    o = o || {};
    var g = new THREE.Group();
    var mWall = o.wall || K.mat.std(0xF1EEE6, 0.75, 0);
    var mRoof = o.roof || K.mat.std(0xA9573A, 0.7, 0);
    var walls = new THREE.Mesh(roundedBox(w, h, d, Math.min(w, h, d) * 0.03, 2), mWall);
    walls.position.y = h / 2; walls.castShadow = walls.receiveShadow = true; g.add(walls);
    var rh = o.roofH || w * 0.42;
    var s = new THREE.Shape();
    s.moveTo(-w / 2 - w * 0.08, 0); s.lineTo(0, rh); s.lineTo(w / 2 + w * 0.08, 0); s.lineTo(w / 2 + w * 0.08 - w * 0.04, 0); s.lineTo(0, rh - w * 0.05); s.lineTo(-w / 2 - w * 0.08 + w * 0.04, 0);
    s.closePath();
    var gable = new THREE.Shape(); gable.moveTo(-w / 2, 0); gable.lineTo(0, rh * 0.94); gable.lineTo(w / 2, 0); gable.closePath();
    var gg = new THREE.ExtrudeGeometry(gable, { depth: d, bevelEnabled: false });
    gg.translate(0, h, -d / 2);
    var gm = new THREE.Mesh(gg, mWall); gm.castShadow = true; g.add(gm);
    var rg = new THREE.ExtrudeGeometry(s, { depth: d * 1.14, bevelEnabled: false });
    rg.translate(0, h, -d * 0.57);
    var roof = new THREE.Mesh(rg, mRoof); roof.castShadow = true; roof.receiveShadow = true; g.add(roof);
    var mWin = o.win || K.mat.std(0x3A3F48, 0.3, 0, { emissive: 0xF2C46B, emissiveIntensity: 0 });
    var wins = o.windows || [[-w * 0.24, h * 0.52], [w * 0.24, h * 0.52]];
    wins.forEach(function (p) {
      var wm = new THREE.Mesh(new THREE.PlaneGeometry(w * 0.2, h * 0.3), mWin);
      wm.position.set(p[0], p[1], d / 2 + 0.01); g.add(wm);
      var fr = new THREE.Mesh(new THREE.PlaneGeometry(w * 0.24, h * 0.34), K.mat.std(0xFFFFFF, 0.6, 0));
      fr.position.set(p[0], p[1], d / 2 + 0.005); g.add(fr);
    });
    if (o.door !== false) {
      var door = new THREE.Mesh(new THREE.PlaneGeometry(w * 0.16, h * 0.46), K.mat.std(0x6B5A4A, 0.6, 0));
      door.position.set(o.doorX === undefined ? 0 : o.doorX, h * 0.23, d / 2 + 0.01); g.add(door);
    }
    if (o.chimney) {
      var ch = new THREE.Mesh(new THREE.BoxGeometry(w * 0.1, rh * 0.6, w * 0.1), mRoof);
      ch.position.set(w * 0.22, h + rh * 0.55, -d * 0.15); ch.castShadow = true; g.add(ch);
    }
    return { group: g, windowMat: mWin };
  };

  /* an oil-filled power transformer: tank, radiators, bushings, conservator */
  DIO.transformer = function (s, o) {
    var THREE = window.THREE;
    o = o || {};
    var g = new THREE.Group();
    var mTank = o.tank || K.mat.std(0x8E98A3, 0.5, 0.4);
    var tank = new THREE.Mesh(roundedBox(2.2 * s, 1.8 * s, 1.5 * s, 0.08 * s, 2), mTank);
    tank.position.y = 0.9 * s + 0.2 * s; tank.castShadow = tank.receiveShadow = true; g.add(tank);
    var plinth = new THREE.Mesh(new THREE.BoxGeometry(2.6 * s, 0.2 * s, 1.9 * s), K.mat.std(0xC9C6BE, 0.85, 0)); plinth.position.y = 0.1 * s; g.add(plinth);
    for (var i = 0; i < 6; i++) {
      var fin = new THREE.Mesh(new THREE.BoxGeometry(0.06 * s, 1.4 * s, 0.5 * s), mTank);
      fin.position.set(-0.8 * s + i * 0.32 * s, 1.0 * s, 1.0 * s); fin.castShadow = true; g.add(fin);
      var fin2 = fin.clone(); fin2.position.z = -1.0 * s; g.add(fin2);
    }
    var cons = new THREE.Mesh(new THREE.CylinderGeometry(0.22 * s, 0.22 * s, 1.6 * s, 16), mTank);
    cons.rotation.z = Math.PI / 2; cons.position.set(0, 2.35 * s, -0.45 * s); cons.castShadow = true; g.add(cons);
    var mPor = o.porcelain || K.mat.std(0x7C5A48, 0.3, 0);
    var bushTops = [];
    [-0.6, 0, 0.6].forEach(function (x) {
      var bh = (o.bushingH || 0.9) * s;
      var bu = new THREE.Mesh(new THREE.CylinderGeometry(0.07 * s, 0.11 * s, bh, 10), mPor);
      bu.position.set(x * s, 2.0 * s + bh / 2, 0.25 * s); bu.castShadow = true; g.add(bu);
      for (var k = 0; k < 4; k++) {
        var sh = new THREE.Mesh(new THREE.CylinderGeometry(0.15 * s, 0.15 * s, 0.04 * s, 12), mPor);
        sh.position.set(x * s, 2.05 * s + bh * (0.25 + k * 0.2), 0.25 * s); g.add(sh);
      }
      bushTops.push(new THREE.Vector3(x * s, 2.0 * s + bh, 0.25 * s));
    });
    g.userData.bushings = bushTops;
    return g;
  };

  /* ================================================================== *
   * energy-chain · W 1120×380 · light
   * Sun → sea (evaporation) → cloud and rain → dam → turbine and
   * generator → transmission line → a house whose lamp glows.
   * A travelling highlight follows the energy along the chain (10 s loop).
   * ================================================================== */
  K.register('energy-chain', function (el, opts) {
    var THREE = window.THREE;
    opts = opts || {};
    var theme = opts.theme || 'light';
    var RM = K.reducedMotion;
    var CAM = { yaw: 0.0, pitch: 0.34, distance: 128, target: [1.5, 3.2, -4] };
    if (opts.cam) CAM = { yaw: opts.cam[0], pitch: opts.cam[1], distance: opts.cam[2], target: [opts.cam[3], opts.cam[4], opts.cam[5]] };
    var v = K.stage3d(el, {
      theme: theme, fov: 20, yaw: CAM.yaw, pitch: CAM.pitch, distance: CAM.distance, target: CAM.target,
      size: 46, ground: -7.6, minDistance: 80, maxDistance: 240, near: 1, far: 2000, exposure: 0.92, minPitch: 0.05, maxPitch: 0.95,
      minYaw: -0.6, maxYaw: 0.6
    });
    var scene = v.scene;
    if (v.lights) {
      var KL = v.lights.key;
      KL.position.set(-26, 52, 34); KL.intensity = 1.15;
      KL.shadow.camera.left = -78; KL.shadow.camera.right = 78; KL.shadow.camera.top = 50; KL.shadow.camera.bottom = -50;
      KL.shadow.camera.far = 200; KL.shadow.camera.updateProjectionMatrix();
      v.lights.hemi.intensity = 0.32; v.lights.fill.intensity = 0.32;
    }

    var X0 = -60, X1 = 60, Z0 = -16, Z1 = 6, BASE = -6.5;
    var SEA = 0, RES = 6.4;
    function bump(x, c, w) { var d = (x - c) / w; return Math.exp(-d * d); }
    function mountain(x) { return 1.0 + 2.4 * sstep(-26, -20, x) + 5.4 * bump(x, -13.5, 3.8) + 3.8 * bump(x, -7.0, 2.6) + 2.6 * bump(x, -18.5, 2.4); }
    function profile(x) {
      if (x < -33) return -2.4;
      if (x < -26) return lerp(-2.4, 1.0, sstep(-33, -26, x));
      if (x < 0) return lerp(mountain(x), 2.0, sstep(-4.0, -0.2, x));
      if (x < 10.2) return 2.0;
      return lerp(2.0, 1.4, sstep(10.2, 13, x)) + (0.3 * Math.sin(x * 0.35) + 0.22 * Math.sin(x * 0.81 + 1.3)) * sstep(24, 29, x);
    }
    function hgt(x, z) {
      var y = profile(x);
      var back = sstep(Z1, Z0, z);
      if (x > -26 && x < 0) y += (back * (3.2 + 2.6 * bump(x, -13, 6)) + Math.sin(z * 0.8 + x * 0.45) * 0.7 * sstep(-26, -21, x)) * (1 - sstep(-3.5, -0.2, x));
      if (x >= 10.2) y += back * (1.8 * bump(x, 13, 4) + 1.0 * sstep(17, 24, x));
      return y;
    }
    var cSand = new THREE.Color(0xCDBB92), cGrass = new THREE.Color(0x7F9A61), cForest = new THREE.Color(0x587548),
      cRock = new THREE.Color(0x837D76), cSeabed = new THREE.Color(0xB3A37C), cField = new THREE.Color(0x9AA672);
    function col(x, y, z, ny, c) {
      if (y < -0.3) c.copy(cSeabed);
      else if (y < 1.3 && x < -22) c.copy(cSand);
      else if (ny < 0.66) c.copy(cRock).lerp(cForest, 0.35);
      else if (y > 4.2) c.copy(cForest).lerp(cRock, clamp((y - 7.2) / 3.2, 0, 0.75));
      else if (x > 18) c.copy(cField).lerp(cGrass, 0.5 + 0.5 * Math.sin(x * 0.6 + z * 0.9));
      else c.copy(cGrass);
    }
    var land = DIO.terrain(X0, X1, Z0, Z1, 240, 44, hgt, col);
    scene.add(land);
    var strataTex = DIO.strata(9);
    scene.add(DIO.frontFace(X0, X1, Z1, BASE, hgt, strataTex, 240, 12));
    scene.add(DIO.sideFace(X0, Z0, Z1, BASE, hgt, strataTex, false, 12));
    scene.add(DIO.sideFace(X1, Z0, Z1, BASE, hgt, strataTex, true, 12));

    /* sea: animated surface + a translucent water section on the cut face */
    var SEA_X1 = -26.4;
    var seaGeo = new THREE.PlaneGeometry(SEA_X1 - X0, Z1 - Z0, 60, 18);
    seaGeo.rotateX(-Math.PI / 2); seaGeo.translate((X0 + SEA_X1) / 2, SEA, (Z0 + Z1) / 2);
    var seaBase = Float32Array.from(seaGeo.attributes.position.array);
    var mSea = new THREE.MeshPhysicalMaterial({ color: 0x3F6F96, roughness: 0.3, metalness: 0, clearcoat: 0.4, clearcoatRoughness: 0.35, transparent: true, opacity: 0.93 });
    var sea = new THREE.Mesh(seaGeo, mSea); sea.receiveShadow = true; scene.add(sea);
    var mWaterSec = new THREE.MeshStandardMaterial({ color: 0x3E6A8E, roughness: 0.4, transparent: true, opacity: 0.86 });
    var waterSec = new THREE.Shape(); waterSec.moveTo(X0, SEA);
    for (var wx = X0; wx <= SEA_X1; wx += 0.4) waterSec.lineTo(wx, Math.min(SEA, hgt(wx, Z1)));
    waterSec.lineTo(SEA_X1, SEA); waterSec.closePath();
    var ws = new THREE.Mesh(new THREE.ShapeGeometry(waterSec), mWaterSec); ws.position.z = Z1 + 0.02; scene.add(ws);
    /* reservoir behind the dam */
    var resGeo = new THREE.PlaneGeometry(14.5, Z1 - Z0, 1, 1); resGeo.rotateX(-Math.PI / 2); resGeo.translate(2.95, RES, (Z0 + Z1) / 2);
    var mRes = new THREE.MeshPhysicalMaterial({ color: 0x3C6C90, roughness: 0.1, metalness: 0, clearcoat: 0.7, transparent: true, opacity: 0.94 });
    scene.add(new THREE.Mesh(resGeo, mRes));
    var resSec = new THREE.Shape(); resSec.moveTo(-4.3, RES);
    for (var rx = -4.3; rx <= 10.2; rx += 0.25) resSec.lineTo(rx, Math.min(RES, hgt(rx, Z1)));
    resSec.lineTo(10.2, RES); resSec.closePath();
    var rs = new THREE.Mesh(new THREE.ShapeGeometry(resSec), mWaterSec); rs.position.z = Z1 + 0.02; scene.add(rs);
    /* dam: concrete gravity section across the valley */
    var dam = new THREE.Shape(); dam.moveTo(10.0, 1.6); dam.lineTo(10.2, 7.6); dam.lineTo(11.0, 7.6); dam.lineTo(13.2, 1.6); dam.closePath();
    var dg = new THREE.ExtrudeGeometry(dam, { depth: Z1 - Z0, bevelEnabled: false }); dg.translate(0, 0, Z0);
    var mConc = K.mat.std(0xD3D0C8, 0.85, 0);
    var damM = new THREE.Mesh(dg, mConc); damM.castShadow = damM.receiveShadow = true; scene.add(damM);
    var river = new THREE.Mesh(new THREE.PlaneGeometry(9, 1.6), new THREE.MeshPhysicalMaterial({ color: 0x5C86A6, roughness: 0.15, clearcoat: 0.5 }));
    river.rotation.x = -Math.PI / 2; river.position.set(17.5, 1.47, -6.5); scene.add(river);

    /* power house (front wall cut away): turbine below, generator above, one shaft */
    var PHS = 1.45;
    var PH = new THREE.Vector3(18.2, 1.42, 0.6);
    var phG = new THREE.Group(); phG.position.copy(PH); phG.scale.setScalar(PHS); scene.add(phG);
    var mWallPH = K.mat.std(0xEAE7E0, 0.8, 0);
    var floor = new THREE.Mesh(new THREE.BoxGeometry(5.6, 0.3, 4.6), mWallPH); floor.position.y = 0.15; floor.receiveShadow = true; phG.add(floor);
    var backW = new THREE.Mesh(new THREE.BoxGeometry(5.6, 5.2, 0.3), mWallPH); backW.position.set(0, 2.6, -2.15); backW.castShadow = true; backW.receiveShadow = true; phG.add(backW);
    var sideL = new THREE.Mesh(new THREE.BoxGeometry(0.3, 5.2, 4.6), mWallPH); sideL.position.set(-2.65, 2.6, 0); sideL.castShadow = true; sideL.receiveShadow = true; phG.add(sideL);
    var sideR = sideL.clone(); sideR.position.x = 2.65; phG.add(sideR);
    var roofPH = new THREE.Mesh(roundedBox(6.0, 0.35, 5.0, 0.08, 2), K.mat.std(0x7E848C, 0.6, 0.2)); roofPH.position.set(0, 5.35, 0); roofPH.castShadow = true; phG.add(roofPH);
    var mCut = K.mat.std(0xB4B0A7, 0.9, 0);
    [-2.65, 2.65].forEach(function (x) { var c = new THREE.Mesh(new THREE.BoxGeometry(0.31, 5.2, 0.05), mCut); c.position.set(x, 2.6, 2.31); phG.add(c); });
    var mSteelD = K.mat.steel({ color: 0x8F969F, roughness: 0.4 });
    var casing = new THREE.Mesh(new THREE.TorusGeometry(1.0, 0.3, 10, 28), mSteelD);
    casing.rotation.x = Math.PI / 2; casing.position.set(-0.3, 1.05, 0); phG.add(casing);
    var runner = new THREE.Group(); runner.position.set(-0.3, 1.05, 0); phG.add(runner);
    var mRun = K.mat.std(0xC9AC70, 0.3, 0.9);
    runner.add(new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.32, 0.5, 16), mRun));
    for (var bi = 0; bi < 9; bi++) {
      var bl = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.36, 0.06), mRun);
      var ba = bi / 9 * TAU;
      bl.position.set(Math.cos(ba) * 0.5, 0, Math.sin(ba) * 0.5); bl.rotation.y = -ba + 0.6; bl.rotation.x = 0.35;
      runner.add(bl);
    }
    var shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 2.3, 10), K.mat.steel({ roughness: 0.3 }));
    shaft.position.set(-0.3, 2.3, 0); phG.add(shaft);
    var stator = new THREE.Mesh(new THREE.TorusGeometry(0.98, 0.25, 12, 36), K.mat.copper({ roughness: 0.36 }));
    stator.rotation.x = Math.PI / 2; stator.position.set(-0.3, 3.6, 0); phG.add(stator);
    /* coil windings as copper rings around the stator */
    for (var ci = 0; ci < 12; ci++) {
      var ring = new THREE.Mesh(new THREE.TorusGeometry(0.27, 0.05, 6, 14), K.mat.copper({ roughness: 0.32 }));
      var ca = ci / 12 * TAU;
      ring.position.set(-0.3 + Math.cos(ca) * 0.98, 3.6, Math.sin(ca) * 0.98);
      ring.rotation.y = -ca;
      phG.add(ring);
    }
    var statorBand = new THREE.Mesh(new THREE.CylinderGeometry(1.32, 1.32, 0.95, 36, 1, true, Math.PI * 0.12, Math.PI * 1.15), K.mat.std(0x5D646E, 0.5, 0.4, { side: THREE.DoubleSide }));
    statorBand.position.set(-0.3, 3.6, 0); phG.add(statorBand);
    var rotor = new THREE.Group(); rotor.position.set(-0.3, 3.6, 0); phG.add(rotor);
    var magN = new THREE.Mesh(roundedBox(0.66, 0.6, 0.42, 0.06, 2), K.mat.std(0xB3352A, 0.45, 0.1)); magN.position.x = 0.34; rotor.add(magN);
    var magS = new THREE.Mesh(roundedBox(0.66, 0.6, 0.42, 0.06, 2), K.mat.std(0x8A8F99, 0.45, 0.2)); magS.position.x = -0.34; rotor.add(magS);
    /* outgoing cable from the generator to the gantry */
    phG.updateMatrixWorld(true);
    var genWorld = phG.localToWorld(new THREE.Vector3(-0.3, 3.6, 0));

    /* penstock: reservoir → through the dam → power house */
    var pen = new THREE.CatmullRomCurve3([v3(8.2, 3.4, -1.0), v3(11.4, 3.1, -0.4), v3(13.6, 2.3, 0.2), v3(15.2, 2.95, 0.6), v3(17.6, 2.95, 0.6)], false, 'catmullrom', 0.4);
    var penM = new THREE.Mesh(new THREE.TubeGeometry(pen, 48, 0.42, 12, false), mSteelD);
    penM.castShadow = true; scene.add(penM);

    /* transmission line: gantry → towers → house */
    var mSteel = K.mat.steel({ color: 0xA2A8B0, roughness: 0.45 });
    var towers = [], towerX = [31, 40.5, 49], TH = 8.4;
    towerX.forEach(function (x) {
      var tw = DIO.tower(TH, { material: mSteel, member: 0.085, base: 1.05, top: 0.32, arm: 2.0, string: 0.6 });
      tw.position.set(x, hgt(x, -4) - 0.1, -4); tw.rotation.y = Math.PI / 2; scene.add(tw); towers.push(tw);
    });
    var GX = 25.8;
    var gantry = new THREE.Group(); gantry.position.set(GX, hgt(GX, -3), -3); scene.add(gantry);
    [-2.1, 2.1].forEach(function (z) {
      var post = new THREE.Mesh(new THREE.BoxGeometry(0.18, 5.6, 0.18), mSteel); post.position.set(0, 2.8, z); post.castShadow = true; gantry.add(post);
    });
    var beam = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.18, 4.6), mSteel); beam.position.set(0, 5.5, 0); gantry.add(beam);
    var GY = gantry.position.y + 5.3;
    var gantryPts = [1.7, 0, -1.7].map(function (z) { return new THREE.Vector3(GX, GY, -3 + z); });
    var mCond = K.mat.std(0x50565F, 0.4, 0.6);
    var phasePaths = [];
    var allTow = towers.map(function (tw) { tw.updateMatrixWorld(true); return tw.userData.phases.map(function (p) { return tw.localToWorld(p.clone()); }); });
    for (var ph = 0; ph < 3; ph++) {
      var pts = [];
      var seq = [gantryPts[ph]].concat(allTow.map(function (a) { return a[ph]; }));
      for (var s = 0; s < seq.length - 1; s++) {
        var cat = DIO.catenary(seq[s], seq[s + 1], 0.85, 18);
        if (s > 0) cat.shift();
        pts = pts.concat(cat);
      }
      phasePaths.push(pts);
      scene.add(DIO.cable(pts, 0.05, mCond));
    }
    /* generator → gantry lead */
    var lead = [v3(genWorld.x + 1.2, PH.y + 7.7, PH.z), v3(GX - 1.4, GY + 0.3, -2.2), gantryPts[1].clone()];
    scene.add(DIO.cable(lead, 0.05, mCond));
    var hx = 55.0, hz = -1.2, hy = hgt(hx, hz);
    var house = DIO.house(4.4, 3.0, 3.6, { chimney: true, windows: [[-1.05, 1.6], [1.05, 1.6]], doorX: 0 });
    house.group.position.set(hx, hy - 0.05, hz); scene.add(house.group);
    var PX = 52.2;
    var pole = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.14, 6.0, 8), K.mat.std(0x8C7B66, 0.8, 0));
    pole.position.set(PX, hgt(PX, -1.4) + 3.0, -1.4); pole.castShadow = true; scene.add(pole);
    var lastTw = allTow[allTow.length - 1];
    var poleTop = new THREE.Vector3(PX, hgt(PX, -1.4) + 5.8, -1.4);
    var drop1 = DIO.catenary(lastTw[1], poleTop, 0.6, 14);
    scene.add(DIO.cable(drop1, 0.045, mCond));
    var eave = new THREE.Vector3(hx - 2.0, hy + 3.1, hz + 0.6);
    var drop2 = DIO.catenary(poleTop, eave, 0.22, 8);
    scene.add(DIO.cable(drop2, 0.04, mCond));
    var windowWorld = new THREE.Vector3(hx + 1.05, hy + 1.6, hz + 1.85);

    /* sun with a soft corona (no rays) */
    var SUN = new THREE.Vector3(-50, 15.5, -14);
    var sun = new THREE.Mesh(new THREE.SphereGeometry(2.8, 40, 24), new THREE.MeshBasicMaterial({ color: 0xFFE6A8, toneMapped: false }));
    sun.position.copy(SUN); scene.add(sun);
    var corona2 = new THREE.Sprite(new THREE.SpriteMaterial({ map: softSprite(256, 0.12), color: 0xFFF1CC, transparent: true, opacity: 0.7, depthWrite: false }));
    corona2.scale.set(7, 7, 1); corona2.position.copy(SUN); scene.add(corona2);
    var corona = new THREE.Sprite(new THREE.SpriteMaterial({ map: softSprite(256, 0.22), color: 0xFFCB6B, transparent: true, opacity: 0.55, depthWrite: false }));
    corona.scale.set(15, 15, 1); corona.position.copy(SUN); scene.add(corona);

    /* cloud: soft clustered puffs over the mountains */
    var CLOUD = new THREE.Vector3(-12.5, 16.6, -8.0);
    var cloud = new THREE.Group(); cloud.position.copy(CLOUD); scene.add(cloud);
    var mCloud = K.mat.std(0xFBFBFA, 1.0, 0, { emissive: 0xffffff, emissiveIntensity: 0.06 });
    var mCloudDark = K.mat.std(0xD9DDE3, 1.0, 0);
    var mCloudShadow = new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false });
    var cloudTex = softSprite(128, 0.5);
    var rngC = K.rng(321), puffs = [];
    for (var pi = 0; pi < 30; pi++) {
      var r = 1.0 + rngC() * 1.6;
      var px = (rngC() - 0.5) * 14, pz = (rngC() - 0.5) * 4.4, py = (rngC() * 1.3) * (1 - Math.abs(px) / 9) + 0.3;
      r *= 0.82;
      /* invisible shadow caster + soft billboard for the visible volume */
      var puff = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 2), mCloudShadow);
      puff.position.set(px, py, pz); puff.castShadow = true; cloud.add(puff);
      var spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: cloudTex, color: py < 0.8 ? 0xDCE2EA : (py < 1.3 ? 0xF4F6F9 : 0xFFFFFF), transparent: true, opacity: 0.9, depthWrite: false }));
      spr.scale.set(r * 5.2, r * 4.2, 1); spr.position.copy(puff.position); cloud.add(spr);
      puffs.push({ m: puff, s: spr, base: puff.position.clone(), ph: rngC() * TAU });
    }

    /* rain streaks below the cloud */
    var NR = 150, rngR = K.rng(99);
    var rainGeo = new THREE.CylinderGeometry(0.035, 0.035, 0.95, 4);
    var mRain = new THREE.MeshBasicMaterial({ color: 0x6E95BA, transparent: true, opacity: 0.6, depthWrite: false });
    var rain = new THREE.InstancedMesh(rainGeo, mRain, NR); rain.instanceMatrix.setUsage(THREE.DynamicDrawUsage); rain.frustumCulled = false; scene.add(rain);
    var drops = [];
    for (var di = 0; di < NR; di++) drops.push({ x: CLOUD.x + (rngR() - 0.5) * 11, z: CLOUD.z + (rngR() - 0.5) * 4, ph: rngR() });
    var rainM = new THREE.Matrix4();

    /* evaporation: soft rising particles above the sea */
    var NV = 80, rngV = K.rng(77);
    var vapPos = new Float32Array(NV * 3), vap = [];
    for (var vi = 0; vi < NV; vi++) vap.push({ x: -55 + rngV() * 26, z: Z0 + 2 + rngV() * (Z1 - Z0 - 3), ph: rngV(), sp: 0.7 + rngV() * 0.6 });
    var vapGeo = new THREE.BufferGeometry(); vapGeo.setAttribute('position', new THREE.BufferAttribute(vapPos, 3));
    var mVap = new THREE.PointsMaterial({ map: softSprite(64, 0.3), color: 0xEDF2F7, size: 1.4, transparent: true, opacity: 0.8, depthWrite: false, sizeAttenuation: true });
    var vapPts = new THREE.Points(vapGeo, mVap); vapPts.frustumCulled = false; scene.add(vapPts);

    /* ---------- the energy path (highlight) ---------- */
    var STG = [
      { name: 'güneş ışığı', x: -53, t0: 0.0, t1: 1.5 },
      { name: 'ısı · buharlaşma', x: -33, t0: 1.5, t1: 3.1 },
      { name: 'potansiyel enerji', x: -5, t0: 3.1, t1: 4.9 },
      { name: 'kinetik enerji', x: 13.5, t0: 4.9, t1: 6.2 },
      { name: 'elektrik enerjisi', x: 36, t0: 6.2, t1: 8.5 },
      { name: 'ışık ve ısı', x: 55, t0: 8.5, t1: 10.0 }
    ];
    var PER = 10;
    var legs = [
      new Poly([SUN.clone(), v3(-38, 0.25, -3)]),
      new Poly([v3(-38, 0.25, -3), v3(-34, 4, -4), v3(-27, 9, -5.5), v3(-20, 13.5, -6.5), CLOUD.clone().add(v3(-1, 0, 0))]),
      new Poly([CLOUD.clone().add(v3(1.5, -1, 0)), v3(-10.5, 11.5, -5.5), v3(-7.5, 8.5, -4.4), v3(-3.5, RES + 0.6, -3.5), v3(0.5, RES + 0.15, -2.6), v3(7.2, RES + 0.15, -1.6)]),
      new Poly([v3(8.2, 3.4, -1.0)].concat(pen.getPoints(16)).concat([phG.localToWorld(new THREE.Vector3(-0.3, 1.05, 0))])),
      new Poly([phG.localToWorld(new THREE.Vector3(-0.3, 1.05, 0)), genWorld.clone()].concat(lead).concat(phasePaths[1].slice(1)).concat(drop1.slice(1)).concat(drop2.slice(1))),
      new Poly([eave.clone(), windowWorld.clone()])
    ];
    function pathAt(tt, out) {
      for (var i = 0; i < STG.length; i++) {
        var S = STG[i];
        if (tt < S.t1 || i === STG.length - 1) {
          var f = EASE.inOut(clamp((tt - S.t0) / (S.t1 - S.t0), 0, 1));
          legs[i].at(f * legs[i].len, out);
          return i;
        }
      }
      return 0;
    }

    /* generator magnifier (second render pass) */
    var camG = new THREE.PerspectiveCamera(30, 1, 0.5, 400);
    var GEN = { r: 60 };

    /* ---------- labels ---------- */
    var tagPts = STG.map(function (S) { return new THREE.Vector3(S.x, BASE, Z1); });
    var tags = STG.map(function (S) { return v.label(S.name, { at: [S.x, BASE, Z1], cls: 'kge-v', dy: 20 }); });


    /* ---------- frame ---------- */
    var st = { yawOff: 0 };
    var tmpA = new THREE.Vector3();
    var trail = [];
    for (var ti = 0; ti < 7; ti++) trail.push(new THREE.Vector3());
    var trailN = 0;
    function reset() { v.setView(CAM); st.yawOff = 0; trailN = 0; }
    function frame(t, dt) {
      var tt = RM ? 9.0 : (t % PER);
      var stage = pathAt(tt, tmpA);
      st.stage = stage; st.dt = dt;
      var sp = seaGeo.attributes.position;
      if (!RM) {
        for (var i = 0; i < sp.count; i++) {
          var x = seaBase[i * 3], z = seaBase[i * 3 + 2];
          sp.setY(i, SEA + Math.sin(x * 0.8 + t * 1.1) * 0.07 + Math.sin(z * 1.3 - t * 0.9 + x * 0.3) * 0.05);
        }
        sp.needsUpdate = true;
        seaGeo.computeVertexNormals();
      }
      var evap = stage === 1 ? 1 : 0;
      for (i = 0; i < NV; i++) {
        var V = vap[i], f = (((RM ? 0 : t) * 0.09 * V.sp) + V.ph) % 1;
        vapPos[i * 3] = V.x + f * 9 + Math.sin(f * 6 + i) * 0.6;
        vapPos[i * 3 + 1] = SEA + 0.3 + f * 13.5;
        vapPos[i * 3 + 2] = V.z + Math.cos(f * 5 + i) * 0.5;
      }
      vapGeo.attributes.position.needsUpdate = true;
      mVap.opacity = 0.5 + 0.35 * evap;
      for (i = 0; i < puffs.length; i++) {
        var P = puffs[i];
        P.m.position.set(P.base.x + Math.sin(t * 0.25 + P.ph) * 0.15, P.base.y + Math.sin(t * 0.3 + P.ph * 1.3) * 0.1, P.base.z);
        P.s.position.copy(P.m.position);
      }
      var rainA = stage === 2 ? 1 : 0;
      mRain.opacity = 0.35 + 0.35 * rainA;
      for (i = 0; i < NR; i++) {
        var D = drops[i];
        var ground = hgt(D.x, D.z) + 0.2, top = CLOUD.y - 0.6;
        var ff = (((RM ? 0 : t) * 0.65 + D.ph) % 1);
        rainM.makeTranslation(D.x - ff * 0.6, lerp(top, ground, ff), D.z);
        rain.setMatrixAt(i, rainM);
      }
      rain.instanceMatrix.needsUpdate = true;
      runner.rotation.y = RM ? 0.4 : -t * 2.0;
      rotor.rotation.y = RM ? 0.4 : -t * 2.0;
      var win = 0.6 + 0.4 * (stage === 5 ? sstep(STG[5].t0, STG[5].t0 + 0.4, tt) : 0);
      house.windowMat.emissiveIntensity = 1.4 * win;
      if (!RM && v.orbit && !v.orbit.dragging && !v.orbit.anim && v.orbit.idle > 3) {
        var target = Math.sin(t * 0.12) * 0.045;
        v.view.yaw += (target - st.yawOff);
        st.yawOff = target;
      }
      for (i = 0; i < tags.length; i++) {
        var dS = Math.abs(i - stage);
        fade(tags[i], dS === 0 ? 1 : (i === stage - 1 ? 0.45 : 0));
        var cls = i === stage ? 'kg-l kge-v on' : 'kg-l kge-v';
        if (!tags[i].visible) cls += ' hide';
        if (tags[i].el.className !== cls) tags[i].el.className = cls;
      }
      /* one shared baseline for the whole tag row (the lowest projected point) */
      var tagY = [], tagMax = -1e9;
      for (i = 0; i < tags.length; i++) {
        tagY[i] = v.project(tagPts[i]).y;
        if (tagY[i] > tagMax) tagMax = tagY[i];
      }
      for (i = 0; i < tags.length; i++) tags[i].dy = 22 + (tagMax - tagY[i]);
      fitZoom(v, 1120 / 380, 1, 0);
      /* trail ring buffer */
      for (i = trail.length - 1; i > 0; i--) trail[i].copy(trail[i - 1]);
      trail[0].copy(tmpA);
      trailN = Math.min(trail.length, trailN + 1);
      v.render(dt);
      if (!K.skipRender) overlay(t, stage, tt);
    }
    var gp = new THREE.Vector3(), gq = new THREE.Vector3();
    function overlay(t, stage, tt) {
      var ctx = v.ctx;
      var pw = v.project(windowWorld);
      K.drawGlow(ctx, PAL.lamp, pw.x, pw.y, 26 + 16 * (stage === 5 ? 1 : 0), 0.45 + 0.4 * (stage === 5 ? 1 : 0));
      /* generator magnifier above the power house (only while the story is about it) */
      st.magA = RM ? 1 : approach(st.magA === undefined ? 0 : st.magA, (stage === 3 || stage === 4) ? 1 : 0, 3, st.dt || 0.016);
      var gs = v.project(genWorld);
      var cx = gs.x - 4, cy = Math.max(GEN.r + 12, gs.y - 150), R = GEN.r;
      phG.localToWorld(gp.set(-0.3, 2.9, 0));
      camG.position.copy(gp).add(gq.set(0.0, 4.6 * PHS, 5.6 * PHS));
      camG.lookAt(gp);
      camG.updateMatrixWorld(); camG.updateProjectionMatrix();
      var magOn = st.magA > 0.02;
      ctx.save();
      ctx.globalAlpha = st.magA;
      if (magOn) {
      ctx.strokeStyle = 'rgba(21,23,28,0.28)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(cx, cy + R); ctx.lineTo(gs.x, gs.y - 10); ctx.stroke();
      ctx.beginPath(); ctx.arc(gs.x, gs.y, 10, 0, TAU); ctx.stroke();
      ctx.fillStyle = 'rgba(21,23,28,0.06)'; ctx.beginPath(); ctx.arc(cx, cy + 3, R + 2, 0, TAU); ctx.fill();
      ctx.fillStyle = '#FBFBF9'; ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.fill();
      }
      ctx.restore();
      if (magOn) {
      rain.visible = false; vapPts.visible = false; roofPH.visible = false;
      renderInset(v, camG, cx, cy, R, st.magA);
      rain.visible = true; vapPts.visible = true; roofPH.visible = true;
      ctx.save();
      ctx.globalAlpha = st.magA;
      ctx.strokeStyle = 'rgba(21,23,28,0.22)'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.stroke();
      ctx.restore();
      K.label(ctx, 'Faraday, 1831', cx + R + 14, cy - 8, { mono: true, size: 15, weight: 500, color: PAL.muted, spacing: 1, alpha: st.magA });
      K.label(ctx, 'hareket → elektrik', cx + R + 14, cy + 14, { mono: true, size: 18, weight: 600, color: PAL.copper, alpha: st.magA });
      }
      if (!RM && trailN > 0) {
        for (var i = trailN - 1; i >= 0; i--) {
          var p = v.project(trail[i]);
          var a = (1 - i / trail.length);
          K.drawGlow(ctx, '#FFE6B0', p.x, p.y, 15 * a + 6, 0.55 * a);
        }
        var p0 = v.project(trail[0]);
        K.drawGlow(ctx, '#FFFFFF', p0.x, p0.y, 9, 0.95);
      }
      tag2d(ctx, 'basitleştirilmiş model · ölçekli değil', v.w - 18, 22, { align: 'right' });
    }
    reset();
    precompile(v);
    return {
      reset: reset,
      frame: frame,
      read: function (key) {
        if (key === 'explain') {
          return ['Güneş ışığı enerji taşır ve denizi ısıtır.', 'Isınan deniz suyu buharlaşır; buhar yükselip bulut olur.',
            'Yağmur suyu yüksekteki baraj gölüne taşır: yükseklik enerjisi.', 'Düşen su türbini döndürür: yükseklik enerjisi hareket enerjisine dönüşür.',
            'Dönen jeneratör elektrik üretir; elektrik hatlarla eve gider.', 'Lamba elektriği ışığa ve ısıya çevirir. Enerji yok olmaz.'][st.stage || 0];
        }
        return '';
      },
      dispose: function () { v.dispose(); }
    };
  });

  /* ================================================================== *
   * grid-journey · W 1120×380 · light
   * Power plant → step-up transformer → lattice towers → substation →
   * distribution transformer → houses. Energy pulses ride the conductors;
   * a 2D band underneath shows the current for the same power.
   * ================================================================== */
  K.register('grid-journey', function (el, opts) {
    var THREE = window.THREE;
    opts = opts || {};
    var theme = opts.theme || 'light';
    var RM = K.reducedMotion;
    var CAM = { yaw: 0.0, pitch: 0.36, distance: 126, target: [1.5, 4.6, -4] };
    if (opts.cam) CAM = { yaw: opts.cam[0], pitch: opts.cam[1], distance: opts.cam[2], target: [opts.cam[3], opts.cam[4], opts.cam[5]] };
    var v = K.stage3d(el, {
      theme: theme, fov: 20, yaw: CAM.yaw, pitch: CAM.pitch, distance: CAM.distance, target: CAM.target,
      size: 46, ground: -5.6, minDistance: 80, maxDistance: 240, near: 1, far: 2000, exposure: 0.92, minPitch: 0.05, maxPitch: 0.95,
      minYaw: -0.6, maxYaw: 0.6
    });
    var scene = v.scene;
    if (v.lights) {
      var KL = v.lights.key;
      KL.position.set(-24, 52, 36); KL.intensity = 1.15;
      KL.shadow.camera.left = -78; KL.shadow.camera.right = 78; KL.shadow.camera.top = 50; KL.shadow.camera.bottom = -50;
      KL.shadow.camera.far = 200; KL.shadow.camera.updateProjectionMatrix();
      v.lights.hemi.intensity = 0.32; v.lights.fill.intensity = 0.32;
    }

    var X0 = -60, X1 = 60, Z0 = -15, Z1 = 6, BASE = -5.5;
    function hgt(x, z) {
      var back = sstep(Z1, Z0, z);
      return 1.0 + 0.45 * Math.sin(x * 0.21 + 0.6) + 0.3 * Math.sin(x * 0.53 + z * 0.4) + back * (0.9 + 1.4 * (0.5 + 0.5 * Math.sin(x * 0.12 + 1.1)));
    }
    var cGrass = new THREE.Color(0x7C9860), cField = new THREE.Color(0x98A56E), cDry = new THREE.Color(0xB3AE7E), cPad = new THREE.Color(0xC4C0B6);
    function col(x, y, z, ny, c) {
      var f = 0.5 + 0.5 * Math.sin(x * 0.55 + z * 0.8);
      c.copy(cGrass).lerp(cField, f * 0.8);
      if (Math.sin(x * 0.27 - z * 0.33) > 0.75) c.lerp(cDry, 0.5);
      if ((x > -56 && x < -33 && z > -10 && z < 2) || (x > 17 && x < 28 && z > -9 && z < 1)) c.copy(cPad);
    }
    var land = DIO.terrain(X0, X1, Z0, Z1, 220, 40, function (x, z) {
      var y = hgt(x, z);
      if (x > -56 && x < -33 && z > -10 && z < 2) y = lerp(y, 1.2, 0.85);
      if (x > 17 && x < 28 && z > -9 && z < 1) y = lerp(y, 1.2, 0.85);
      return y;
    }, col);
    scene.add(land);
    function H(x, z) {
      var y = hgt(x, z);
      if (x > -56 && x < -33 && z > -10 && z < 2) y = lerp(y, 1.2, 0.85);
      if (x > 17 && x < 28 && z > -9 && z < 1) y = lerp(y, 1.2, 0.85);
      return y;
    }
    var strataTex = DIO.strata(13);
    scene.add(DIO.frontFace(X0, X1, Z1, BASE, H, strataTex, 220, 8));
    scene.add(DIO.sideFace(X0, Z0, Z1, BASE, H, strataTex, false, 8));
    scene.add(DIO.sideFace(X1, Z0, Z1, BASE, H, strataTex, true, 8));

    var mWall = K.mat.std(0xE6E3DB, 0.8, 0);
    var mRoof = K.mat.std(0x7E848C, 0.6, 0.2);
    var mSteel = K.mat.steel({ color: 0xA2A8B0, roughness: 0.45 });
    var mCond = K.mat.std(0x50565F, 0.4, 0.6);
    var mConc = K.mat.std(0xC9C6BE, 0.85, 0);

    /* ---------- 1. power plant: turbine hall with the generator visible ---------- */
    var PL = new THREE.Group(); PL.position.set(-47.5, 1.2, -4); scene.add(PL);
    var hall = new THREE.Mesh(roundedBox(11, 5.4, 6, 0.12, 2), mWall); hall.position.set(0, 2.7, 0); hall.castShadow = hall.receiveShadow = true; PL.add(hall);
    var hroof = new THREE.Mesh(roundedBox(11.4, 0.4, 6.4, 0.1, 2), mRoof); hroof.position.set(0, 5.6, 0); hroof.castShadow = true; PL.add(hroof);
    /* a glazed opening in the front wall shows the turbine-generator set */
    var glass = new THREE.Mesh(new THREE.PlaneGeometry(7.4, 3.0), new THREE.MeshPhysicalMaterial({ color: 0xDCE6EE, roughness: 0.08, transparent: true, opacity: 0.18, depthWrite: false }));
    glass.position.set(0.4, 2.4, 3.02); PL.add(glass);
    var cav = new THREE.Mesh(new THREE.BoxGeometry(7.4, 3.0, 0.4), K.mat.std(0x3A3F47, 0.7, 0, { side: THREE.BackSide }));
    cav.position.set(0.4, 2.4, 2.85); PL.add(cav);
    hall.material = mWall;
    var gen = new THREE.Group(); gen.position.set(0.4, 1.75, 2.35); PL.add(gen);
    var genBody = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.75, 3.0, 28), K.mat.std(0x3F5D7C, 0.45, 0.3));
    genBody.rotation.z = Math.PI / 2; genBody.position.x = 1.4; gen.add(genBody);
    var turb = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.85, 2.6, 24), K.mat.steel({ color: 0xA7ADB5, roughness: 0.35 }));
    turb.rotation.z = Math.PI / 2; turb.position.x = -1.6; gen.add(turb);
    var coupling = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.36, 20), K.mat.std(0xC8693A, 0.4, 0.4));
    coupling.rotation.z = Math.PI / 2; coupling.position.x = -0.15; gen.add(coupling);
    var mark = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.12, 0.84), K.mat.std(0xF1F0EB, 0.5, 0)); coupling.add(mark);
    var stack = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.9, 13, 24), mConc); stack.position.set(-4.4, 6.5, -2.0); stack.castShadow = true; PL.add(stack);
    var stackTop = new THREE.Mesh(new THREE.CylinderGeometry(0.66, 0.66, 0.6, 24), K.mat.std(0x8B9097, 0.6, 0.2)); stackTop.position.set(-4.4, 12.9, -2.0); PL.add(stackTop);
    PL.updateMatrixWorld(true);
    var genOut = PL.localToWorld(new THREE.Vector3(4.6, 4.0, 0.0));

    /* ---------- 2. step-up transformer ---------- */
    var TU = DIO.transformer(1.25, { bushingH: 1.0 }); TU.position.set(-37.5, 1.2, -3.6); TU.rotation.y = 0; scene.add(TU);
    TU.updateMatrixWorld(true);
    var tuB = TU.userData.bushings.map(function (p) { return TU.localToWorld(p.clone()); });
    /* bus from the generator to the transformer low-voltage side */
    var busA = [genOut.clone(), v3(-40.8, 4.3, -3.2), tuB[1].clone().add(v3(-1.6, -0.6, 0))];
    scene.add(DIO.cable(busA, 0.07, K.mat.copper({ roughness: 0.35 })));

    /* ---------- 3. transmission line: four lattice towers ---------- */
    var towerX = [-29, -15.5, -2, 11.5], TH = 9.6;
    var towers = towerX.map(function (x) {
      var tw = DIO.tower(TH, { material: mSteel, member: 0.09, base: 1.15, top: 0.34, arm: 2.2, string: 0.7 });
      tw.position.set(x, H(x, -4) - 0.1, -4); tw.rotation.y = Math.PI / 2; scene.add(tw);
      tw.updateMatrixWorld(true);
      return tw;
    });
    var tPh = towers.map(function (tw) { return tw.userData.phases.map(function (p) { return tw.localToWorld(p.clone()); }); });
    /* a dead-end gantry beside the step-up transformer */
    function gantry(x, z, hgtG, wdt) {
      var g = new THREE.Group(); g.position.set(x, H(x, z), z); scene.add(g);
      [-wdt / 2, wdt / 2].forEach(function (zz) {
        var post = new THREE.Mesh(new THREE.BoxGeometry(0.2, hgtG, 0.2), mSteel); post.position.set(0, hgtG / 2, zz); post.castShadow = true; g.add(post);
      });
      var bm = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, wdt + 0.4), mSteel); bm.position.set(0, hgtG - 0.1, 0); g.add(bm);
      var y = g.position.y + hgtG - 0.9;
      return [wdt * 0.36, 0, -wdt * 0.36].map(function (zz) { return new THREE.Vector3(x, y, z + zz); });
    }
    var gA = gantry(-34.0, -4, 7.6, 4.6);
    /* transformer HV bushings → gantry */
    for (var b = 0; b < 3; b++) scene.add(DIO.cable([tuB[b].clone(), v3(-35.2, tuB[b].y + 1.4, gA[b].z * 0.5 + tuB[b].z * 0.5), gA[b].clone()], 0.045, mCond));
    var phasePath = [[], [], []];
    for (var ph = 0; ph < 3; ph++) {
      var seq = [gA[ph]].concat(tPh.map(function (a) { return a[ph]; }));
      var pts = [];
      for (var s = 0; s < seq.length - 1; s++) { var c = DIO.catenary(seq[s], seq[s + 1], 1.0, 18); if (s > 0) c.shift(); pts = pts.concat(c); }
      phasePath[ph] = pts;
    }

    /* ---------- 4. substation (fenced yard) ---------- */
    var SUB = new THREE.Group(); SUB.position.set(22.5, 1.2, -4); scene.add(SUB);
    var gB = gantry(18.4, -4, 7.0, 4.6);
    for (ph = 0; ph < 3; ph++) {
      var last = tPh[3][ph];
      var c2 = DIO.catenary(last, gB[ph], 0.7, 14);
      c2.shift();
      phasePath[ph] = phasePath[ph].concat(c2);
      scene.add(DIO.cable(phasePath[ph], 0.05, mCond));
    }
    var TS = DIO.transformer(0.9, { bushingH: 0.8 }); TS.position.set(0.8, 0, 0.6); SUB.add(TS);
    SUB.updateMatrixWorld(true);
    var tsB = TS.userData.bushings.map(function (p) { return TS.localToWorld(p.clone()); });
    for (ph = 0; ph < 3; ph++) scene.add(DIO.cable([gB[ph].clone(), v3(20.2, gB[ph].y - 1.2, (gB[ph].z + tsB[ph].z) / 2), tsB[ph].clone()], 0.04, mCond));
    /* fence */
    var fence = new THREE.Group(); SUB.add(fence);
    var mFence = K.mat.std(0x9AA0A8, 0.5, 0.6);
    var FW = 10.5, FD = 7.6;
    var fpts = [[-FW / 2, -FD / 2], [FW / 2, -FD / 2], [FW / 2, FD / 2], [-FW / 2, FD / 2]];
    for (var fi = 0; fi < 4; fi++) {
      var a0 = fpts[fi], a1 = fpts[(fi + 1) % 4];
      var len = Math.hypot(a1[0] - a0[0], a1[1] - a0[1]);
      var nPost = Math.round(len / 1.3);
      for (var pk = 0; pk < nPost; pk++) {
        var fx = lerp(a0[0], a1[0], pk / nPost), fz = lerp(a0[1], a1[1], pk / nPost);
        var post = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.6, 6), mFence); post.position.set(fx, 0.8, fz); fence.add(post);
      }
      [0.55, 1.4].forEach(function (hh) {
        var rail = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, len, 4), mFence);
        rail.position.set((a0[0] + a1[0]) / 2, hh, (a0[1] + a1[1]) / 2);
        rail.rotation.z = Math.PI / 2; rail.rotation.y = -Math.atan2(a1[1] - a0[1], a1[0] - a0[0]);
        fence.add(rail);
      });
    }
    var gC = gantry(27.0, -4, 5.4, 3.0);
    for (ph = 0; ph < 3; ph++) scene.add(DIO.cable([tsB[ph].clone().add(v3(0, 0.05, 0)), v3(25.2, tsB[ph].y + 0.6, (tsB[ph].z + gC[ph].z) / 2), gC[ph].clone()], 0.035, mCond));

    /* ---------- 5. medium-voltage poles → distribution transformer ---------- */
    var mPole = K.mat.std(0xBDB8AE, 0.8, 0);
    function mvPole(x, z, hp) {
      var g = new THREE.Group(); g.position.set(x, H(x, z), z); scene.add(g);
      var pole = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.19, hp, 10), mPole); pole.position.y = hp / 2; pole.castShadow = true; g.add(pole);
      var arm = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.14, 2.6), mSteel); arm.position.y = hp - 0.4; g.add(arm);
      var y = g.position.y + hp - 0.15;
      return [1.05, 0, -1.05].map(function (zz) { return new THREE.Vector3(x, y, z + zz); });
    }
    var mv1 = mvPole(32.8, -3.4, 5.6);
    var dPole = mvPole(39.4, -3.0, 6.0);
    var mvPath = [];
    for (ph = 0; ph < 3; ph++) {
      var mp = DIO.catenary(gC[ph], mv1[ph], 0.35, 10).concat(DIO.catenary(mv1[ph], dPole[ph], 0.35, 10).slice(1));
      scene.add(DIO.cable(mp, 0.035, mCond));
      if (ph === 1) mvPath = mp;
    }
    /* pole-mounted distribution transformer */
    var dt = new THREE.Group(); dt.position.set(39.4, H(39.4, -3.0) + 3.4, -2.55); scene.add(dt);
    var tank = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.62, 1.5, 24), K.mat.std(0x8E98A3, 0.5, 0.4)); tank.castShadow = true; dt.add(tank);
    for (var fn = 0; fn < 8; fn++) {
      var fin = new THREE.Mesh(new THREE.BoxGeometry(0.06, 1.1, 0.28), K.mat.std(0x8E98A3, 0.5, 0.4));
      var fa = fn / 8 * TAU; fin.position.set(Math.cos(fa) * 0.7, 0, Math.sin(fa) * 0.7); fin.rotation.y = -fa; dt.add(fin);
    }
    var lid = new THREE.Mesh(new THREE.CylinderGeometry(0.66, 0.66, 0.1, 24), K.mat.std(0x7C8691, 0.5, 0.4)); lid.position.y = 0.8; dt.add(lid);
    [-0.3, 0, 0.3].forEach(function (zz) {
      var bu = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 0.45, 8), K.mat.std(0x7C5A48, 0.3, 0)); bu.position.set(0, 1.05, zz); dt.add(bu);
    });
    dt.updateMatrixWorld(true);
    var dtOut = dt.localToWorld(new THREE.Vector3(0.62, 0.2, 0.0));

    /* ---------- 6. houses on the low-voltage line ---------- */
    var houses = [
      { x: 46.5, z: -1.2, w: 3.6, h: 2.6, d: 3.0, roof: 0xA9573A },
      { x: 52.0, z: -4.6, w: 3.0, h: 2.3, d: 2.8, roof: 0x8C6A55 },
      { x: 56.6, z: -0.6, w: 3.4, h: 2.5, d: 3.0, roof: 0xA9573A }
    ];
    var winMats = [], houseEaves = [];
    houses.forEach(function (hs) {
      var hh = DIO.house(hs.w, hs.h, hs.d, { roof: K.mat.std(hs.roof, 0.7, 0), chimney: true, windows: [[-hs.w * 0.24, hs.h * 0.52], [hs.w * 0.24, hs.h * 0.52]] });
      var y = H(hs.x, hs.z);
      hh.group.position.set(hs.x, y - 0.05, hs.z); scene.add(hh.group);
      winMats.push(hh.windowMat);
      houseEaves.push(new THREE.Vector3(hs.x - hs.w * 0.45, y + hs.h + 0.1, hs.z + hs.d * 0.3));
      hs.win = new THREE.Vector3(hs.x + hs.w * 0.24, y + hs.h * 0.52, hs.z + hs.d / 2 + 0.05);
    });
    var lvPole = mvPole(44.0, -2.6, 4.4);
    var lvA = DIO.catenary(dtOut, lvPole[1], 0.25, 8);
    scene.add(DIO.cable(lvA, 0.03, mCond));
    var lvPaths = houseEaves.map(function (e) {
      var p = DIO.catenary(lvPole[1], e, 0.25, 10);
      scene.add(DIO.cable(p, 0.028, mCond));
      return p;
    });

    /* ---------- energy route (for the pulses) ---------- */
    var route = [genOut.clone()].concat(busA.slice(1)).concat([tuB[1].clone(), gA[1].clone()]).concat(phasePath[1].slice(1))
      .concat([tsB[1].clone(), gC[1].clone()]).concat(mvPath.slice(1)).concat([dtOut.clone()]).concat(lvA.slice(1));
    var ROUTE = new Poly(route);
    var LVP = lvPaths.map(function (p) { return new Poly(p); });
    var side = [new Poly(phasePath[0]), new Poly(phasePath[2])];
    /* stage boundaries along the route (arc length), for the current band */
    function sAt(p) { var best = 0, bd = 1e9; for (var i = 0; i < route.length; i++) { var d = route[i].distanceTo(p); if (d < bd) { bd = d; best = ROUTE.c[i]; } } return best; }
    var S_TU = sAt(tuB[1]), S_SUB = sAt(tsB[1]), S_DT = sAt(dtOut);

    /* ---------- labels ---------- */
    function chip(html, at, dy) { var L = v.label(html, { at: at, cls: 'kge-c', html: true, dy: dy }); return L; }
    var labels = [
      chip('Santral<br><b>10–25 kV</b>', [-49.5, 15.6, -6], -10),
      chip('Yükseltici trafo<br><b>↑ 400 kV</b>', [-37.5, 6.4, -3.6], -18),
      chip('İletim hattı<br><b>154–400 kV</b>', [-8.8, 12.6, -4], -16),
      chip('Trafo merkezi<br><b>34,5 kV</b>', [22.5, 6.4, -4], -22),
      chip('Dağıtım trafosu<br><b>400 / 230 V</b>', [39.4, 8.4, -3], -14),
      chip('Evler<br><b>230 V</b>', [52.6, 6.6, -2.6], -18)
    ];

    /* ---------- frame ---------- */
    var st = { yawOff: 0 };
    var tmp = new THREE.Vector3();
    var PULSES = 7, PER = 7.0, STORY = 20;
    var pulsePos = [];
    for (var pp = 0; pp < PULSES; pp++) pulsePos.push(new THREE.Vector3());
    function reset() { v.setView(CAM); st.yawOff = 0; }
    function frame(t, dt2) {
      coupling.rotation.x = RM ? 0.5 : t * 6.0;
      for (var i = 0; i < winMats.length; i++) winMats[i].emissiveIntensity = 1.35;
      if (!RM && v.orbit && !v.orbit.dragging && !v.orbit.anim && v.orbit.idle > 3) {
        var target = Math.sin(t * 0.12) * 0.045;
        v.view.yaw += (target - st.yawOff);
        st.yawOff = target;
      }
      /* story: 0-12 s the journey (labels follow the leading pulse, two at a time), 12-20 s the current band */
      var lt = RM ? 15 : t % STORY;
      st.lt = lt;
      for (i = 0; i < labels.length; i++) {
        var a = win(lt, i * 1.9 + 0.2, i * 1.9 + 4.6, 0.5);
        if (lt > 12 && (i === 1 || i === 4)) a = Math.max(a, win(lt, 12, 19.6, 0.6));
        fade(labels[i], a);
      }
      st.bandA = 0.3 + 0.7 * sstep(11, 12.6, lt) * (1 - sstep(19.4, 20, lt));
      fitZoom(v, 1120 / 380, 1, 0);
      v.render(dt2);
      if (!K.skipRender) overlay(t);
    }
    var pA = new THREE.Vector3(), pB = new THREE.Vector3();
    function overlay(t) {
      var ctx = v.ctx, W = v.w, Hh = v.h;
      /* energy pulses: along the route, then branching to the three houses */
      var total = ROUTE.len;
      for (var k = 0; k < PULSES; k++) {
        var f = RM ? (k + 0.5) / PULSES : ((t / PER + k / PULSES) % 1);
        var s = f * (total + 9);
        if (s <= total) {
          ROUTE.at(s, pA);
          var q = v.project(pA);
          K.drawGlow(ctx, '#FFE3A6', q.x, q.y, 13, 0.75);
          K.drawGlow(ctx, '#FFFFFF', q.x, q.y, 5, 0.9);
          if (s > S_TU + 2 && s < S_SUB - 2) {
            for (var sd = 0; sd < 2; sd++) {
              side[sd].at(Math.min(side[sd].len, (s - S_TU) * (side[sd].len / Math.max(1, S_SUB - S_TU))), pB);
              var q2 = v.project(pB);
              K.drawGlow(ctx, '#FFE3A6', q2.x, q2.y, 10, 0.5);
            }
          }
        } else {
          var fs = (s - total) / 9;
          for (var hk = 0; hk < LVP.length; hk++) {
            LVP[hk].at(fs * LVP[hk].len, pB);
            var q3 = v.project(pB);
            K.drawGlow(ctx, '#FFE3A6', q3.x, q3.y, 10, 0.7 * (1 - fs * 0.5));
          }
        }
      }
      /* windows glow */
      houses.forEach(function (hs) { var q = v.project(hs.win); K.drawGlow(ctx, PAL.lamp, q.x, q.y, 18, 0.5); });
      drawBand(ctx, W, Hh, t);
    }
    /* current band: thickness on a log scale, same power on every stage */
    var BAND = [
      { s0: 0, s1: 0, I: 20, txt: '20 A' },
      { s0: 0, s1: 0, I: 1, txt: '1 A' },
      { s0: 0, s1: 0, I: 11.6, txt: '≈ 12 A' },
      { s0: 0, s1: 0, I: 1000, txt: '1.000 A' }
    ];
    function thick(I) { return 2 + 3.2 * Math.log(I) / Math.LN10; }
    function drawBand(ctx, W, Hh, t) {
      var xs = [v.project(genOut).x, v.project(tuB[1]).x, v.project(tsB[1]).x, v.project(dtOut).x, Math.min(W - 24, v.project(houses[2].win).x + 30)];
      var y = Hh - 30;
      ctx.save();
      ctx.globalAlpha = st.bandA === undefined ? 1 : st.bandA;
      /* the band */
      ctx.fillStyle = KGViz.rgba(PAL.copperFill, 0.85);
      ctx.beginPath();
      var top = [], bot = [];
      for (var x = xs[0]; x <= xs[4]; x += 2) {
        var seg = x < xs[1] ? 0 : x < xs[2] ? 1 : x < xs[3] ? 2 : 3;
        var th = thick(BAND[seg].I);
        for (var bnd = 1; bnd <= 3; bnd++) {
          var d = x - xs[bnd];
          if (Math.abs(d) < 14) { var prev = thick(BAND[bnd - 1].I), next = thick(BAND[bnd].I); th = lerp(prev, next, sstep(-14, 14, d)); }
        }
        top.push([x, y - th / 2]); bot.push([x, y + th / 2]);
      }
      ctx.moveTo(top[0][0], top[0][1]);
      for (var i = 1; i < top.length; i++) ctx.lineTo(top[i][0], top[i][1]);
      for (i = bot.length - 1; i >= 0; i--) ctx.lineTo(bot[i][0], bot[i][1]);
      ctx.closePath(); ctx.fill();
      /* moving sheen to show flow */
      if (!RM) {
        var g = ctx.createLinearGradient(0, 0, W, 0);
        var ph = (t * 0.12) % 1;
        for (var k2 = -1; k2 <= 1; k2++) {
          var c0 = clamp(ph + k2 * 0.25 - 0.03, 0, 1), c1 = clamp(ph + k2 * 0.25, 0, 1), c2 = clamp(ph + k2 * 0.25 + 0.03, 0, 1);
          if (c2 > c0) { g.addColorStop(c0, 'rgba(255,240,220,0)'); g.addColorStop(c1, 'rgba(255,240,220,0.55)'); g.addColorStop(c2, 'rgba(255,240,220,0)'); }
        }
        ctx.globalCompositeOperation = 'source-atop';
        ctx.fillStyle = g; ctx.fillRect(xs[0], y - 10, xs[4] - xs[0], 20);
        ctx.globalCompositeOperation = 'source-over';
      }
      /* labels per segment */
      for (i = 0; i < 4; i++) {
        var cx = (xs[i] + xs[i + 1]) / 2;
        K.label(ctx, BAND[i].txt, cx, y - thick(BAND[i].I) / 2 - 6, { mono: true, size: 17, weight: 700, color: PAL.copper, align: 'center' });
      }
      K.label(ctx, 'akım (aynı güç için)', xs[0] - 12, y - 4, { size: 15, weight: 600, color: PAL.ink2, align: 'right' });
      tag2d(ctx, 'kalınlık ölçeksiz', xs[0] - 12, y + 14, { align: 'right', size: 12 });
      ctx.restore();
    }
    bakeStatic(scene, function (o) { return o === coupling || o === mark || o === land; });
    reset();
    precompile(v);
    return {
      reset: reset,
      frame: frame,
      read: function (key) {
        if (key === 'formula') return 'Aynı güç: 400.000 V × 1 A = 400 V × 1.000 A';
        if (key === 'explain') return (st.lt || 0) < 12 ? 'Enerji santralden eve yolculuk eder: gerilim önce yükselir, sonra adım adım düşürülür.' : 'Aynı güç yüksek gerilimde küçük akımla taşınır; küçük akım kabloda az ısı kaybı demektir.';
        if (key === 'loss') return 'Isı kaybı akımın karesiyle büyür: 1.000 kat az akım → 1.000.000 kat az kayıp';
        return '';
      },
      dispose: function () { v.dispose(); }
    };
  });
})();
