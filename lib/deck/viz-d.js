/* Köklerden Göklere · Görseller D · "Telin içi"
 * current-gate · voltage-push · resistance-scatter · drift-signal · dc-ac
 *
 * Ortak görsel dil: boyuna kesilip önü açılmış bir bakır tel. PVC kılıfın ön yarısı
 * soyulmuş, bakırın ön yarısı kesilmiştir; arka yarıda bakır iyonları düzenli bir örgü
 * oluşturur ve hafifçe titreşir. Mavi elektronlar her zaman hızlı ve rastgele ısıl
 * hareket yapar; gerilim varken bunun üstüne yavaş bir kayma eklenir (abartılı).
 */
(function () {
  'use strict';
  var K = window.KGViz;
  if (!K) return;
  var P = K.palette;
  var TAU = Math.PI * 2;

  /* ------------------------------------------------------------------ */
  /* Küçük yardımcılar                                                   */
  /* ------------------------------------------------------------------ */
  function clamp(x, a, b) { return x < a ? a : x > b ? b : x; }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function approach(cur, tgt, dt, rate) { return cur + (tgt - cur) * (1 - Math.exp(-rate * dt)); }

  /* Deterministic integer hash → [0, 1) */
  function hash(i, k, c) {
    var h = Math.imul((i | 0) + 0x3C6EF372, 0x27D4EB2D) ^ Math.imul((k | 0) + 0x1B873593, 0x165667B1) ^ Math.imul((c | 0) + 0x5BD1E995, 0x9E3779B1);
    h ^= h >>> 15; h = Math.imul(h, 0x85EBCA77);
    h ^= h >>> 13; h = Math.imul(h, 0xC2B2AE3D);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  }

  /* Shortest Turkish number with at most maxDec decimals: 3 → "3", 0,35 → "0,35" */
  function fmtMin(x, maxDec) {
    for (var d = 0; d <= maxDec; d++) {
      var p = Math.pow(10, d), r = Math.round(x * p) / p;
      if (Math.abs(r - x) < 1e-9) return K.num(r, d);
    }
    return K.num(x, maxDec);
  }
  var SUP = { '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹', '-': '⁻' };
  function sup(n) { return String(n).split('').map(function (c) { return SUP[c] || c; }).join(''); }
  /* 6,24 × 10¹⁸ */
  function sci(x, dig) {
    if (!x) return '0';
    var e = Math.floor(Math.log(Math.abs(x)) / Math.LN10 + 1e-12);
    var ms = K.num(x / Math.pow(10, e), dig);
    if (ms.indexOf('10') === 0) { e += 1; ms = K.num(x / Math.pow(10, e), dig); }
    return ms + ' × 10' + sup(e);
  }

  /* Fit the home camera to the box: the scenes were composed for a reference aspect ratio */
  function fitStage(el, o, refAsp, lo, hi) {
    var asp = Math.max(0.3, el.offsetWidth) / Math.max(1, el.offsetHeight);
    var k = clamp(refAsp / asp, lo || 0.45, hi || 1.7);
    o.distance *= k;
    if (o.minDistance) o.minDistance *= k;
    if (o.maxDistance) o.maxDistance *= k;
    return o;
  }
  function setFont(ctx, size, weight, mono) { ctx.font = K.font(size, weight, mono); }
  function textW(ctx, s, size, weight, mono) { setFont(ctx, size, weight, mono); return ctx.measureText(s).width; }

  /* Dissolve the left/right edges of the canvas so objects that run past the frame do not end in a hard cut */
  function fadeEdges(ctx, w, h, f) {
    ctx.save();
    ctx.globalCompositeOperation = 'destination-out';
    var g = ctx.createLinearGradient(0, 0, f, 0);
    g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, f, h);
    g = ctx.createLinearGradient(w - f, 0, w, 0);
    g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,1)');
    ctx.fillStyle = g; ctx.fillRect(w - f, 0, f, h);
    ctx.restore();
  }

  /* Small mono tag (same voice as the core's .tag labels) */
  function drawTag(ctx, text, x, y, align, color, alpha) {
    K.label(ctx, text, x, y, { size: 11, weight: 500, mono: true, color: color || P.muted, align: align || 'left', spacing: 1.2, alpha: alpha });
  }

  /* Legend: ion and electron, drawn as small shaded spheres (optional field arrow) */
  function drawLegend(ctx, x, y, dark, alpha, field) {
    ctx.save();
    if (alpha !== undefined) ctx.globalAlpha *= alpha;
    var col = dark ? P.onNightMuted : P.ink2;
    K.drawSphere(ctx, '#C8693A', x + 7, y - 5, 7);
    K.label(ctx, 'bakır iyonu (Cu+)', x + 18, y, { size: 15, color: col });
    var w = textW(ctx, 'bakır iyonu (Cu+)', 15, 400) + 40;
    K.drawSphere(ctx, '#2848C8', x + w + 5, y - 5, 5.2);
    K.label(ctx, 'serbest elektron', x + w + 14, y, { size: 15, color: col });
    if (field) {
      var w2 = w + 14 + textW(ctx, 'serbest elektron', 15, 400) + 28;
      K.arrow(ctx, x + w2 + 22, y - 4, x + w2, y - 4, { color: dark ? '#C9CFDA' : P.ink2, width: 1.6, head: 7, alpha: 0.85 });
      K.label(ctx, field, x + w2 + 30, y, { size: 15, color: col });
    }
    ctx.restore();
  }

  /* Top-left instrument readout: small label, big mono value with unit, optional sub line */
  function drawReadout(ctx, x, y, label, value, unit, sub, dark, alpha) {
    var ink = dark ? P.onNight : P.ink, muted = dark ? P.onNightMuted : P.muted;
    ctx.save();
    if (alpha !== undefined) ctx.globalAlpha *= alpha;
    K.label(ctx, label, x, y, { size: 13, weight: 500, color: muted });
    K.label(ctx, value, x, y + 40, { size: 38, weight: 500, mono: true, color: ink });
    if (unit) K.label(ctx, unit, x + textW(ctx, value, 38, 500, true) + 9, y + 40, { size: 17, weight: 500, mono: true, color: dark ? P.onNightMuted : P.ink2 });
    if (sub) K.label(ctx, sub, x, y + 64, { size: 13, mono: true, color: muted });
    ctx.restore();
  }

  /* Round terminal badge: "+" in copper, "−" in blue */
  function drawBadge(ctx, x, y, sign, alpha) {
    ctx.save();
    if (alpha !== undefined) ctx.globalAlpha *= alpha;
    var c = sign > 0 ? P.copperFill : P.blue;
    ctx.fillStyle = c;
    ctx.beginPath(); ctx.arc(x, y, 15, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 2.6; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x - 6.5, y); ctx.lineTo(x + 6.5, y);
    if (sign > 0) { ctx.moveTo(x, y - 6.5); ctx.lineTo(x, y + 6.5); }
    ctx.stroke();
    ctx.restore();
  }

  /* ------------------------------------------------------------------ */
  /* Geometry: a profile in the (x, r) half-plane revolved about the x    */
  /* axis over angles [a0, a1] (y = r·cos a, z = r·sin a). Partial sweeps */
  /* get flat cut faces. Crisp profile edges, smooth around the axis.     */
  /* ------------------------------------------------------------------ */
  function revolve(profile, a0, a1, seg) {
    var THREE = window.THREE;
    var n = profile.length, i, area = 0;
    for (i = 0; i < n; i++) { var p0 = profile[i], q0 = profile[(i + 1) % n]; area += p0[0] * q0[1] - q0[0] * p0[1]; }
    if (area < 0) profile = profile.slice().reverse();
    var full = a1 - a0 >= TAU - 1e-6;
    var pos = [], nor = [], idx = [], uvs = [];
    function addV(x, y, z, nx, ny, nz, uu, vv) { pos.push(x, y, z); nor.push(nx, ny, nz); uvs.push(uu || 0, vv || 0); return pos.length / 3 - 1; }
    function tri(a, b, c) {
      var ax = pos[a * 3], ay = pos[a * 3 + 1], az = pos[a * 3 + 2];
      var ux = pos[b * 3] - ax, uy = pos[b * 3 + 1] - ay, uz = pos[b * 3 + 2] - az;
      var wx = pos[c * 3] - ax, wy = pos[c * 3 + 1] - ay, wz = pos[c * 3 + 2] - az;
      var cx = uy * wz - uz * wy, cy = uz * wx - ux * wz, cz = ux * wy - uy * wx;
      var nx = nor[a * 3] + nor[b * 3] + nor[c * 3], ny = nor[a * 3 + 1] + nor[b * 3 + 1] + nor[c * 3 + 1], nz = nor[a * 3 + 2] + nor[b * 3 + 2] + nor[c * 3 + 2];
      if (cx * nx + cy * ny + cz * nz < 0) idx.push(a, c, b); else idx.push(a, b, c);
    }
    for (i = 0; i < n; i++) {
      var p = profile[i], q = profile[(i + 1) % n];
      if (p[1] < 1e-7 && q[1] < 1e-7) continue;
      var dx = q[0] - p[0], dr = q[1] - p[1], L = Math.sqrt(dx * dx + dr * dr);
      if (L < 1e-9) continue;
      var enx = dr / L, enr = -dx / L;
      var base = pos.length / 3, s;
      for (s = 0; s <= seg; s++) {
        var ang = a0 + (a1 - a0) * s / seg, c = Math.cos(ang), sn = Math.sin(ang);
        addV(p[0], p[1] * c, p[1] * sn, enx, enr * c, enr * sn, p[0], s / seg);
        addV(q[0], q[1] * c, q[1] * sn, enx, enr * c, enr * sn, q[0], s / seg);
      }
      for (s = 0; s < seg; s++) {
        var i0 = base + s * 2;
        if (p[1] > 1e-7) tri(i0, i0 + 1, i0 + 2);
        if (q[1] > 1e-7) tri(i0 + 1, i0 + 3, i0 + 2);
      }
    }
    if (!full) {
      var contour = profile.map(function (pp) { return new THREE.Vector2(pp[0], pp[1]); });
      var tris = THREE.ShapeUtils.triangulateShape(contour, []);
      [a0, a1].forEach(function (ang, k) {
        var c = Math.cos(ang), sn = Math.sin(ang);
        var ny = k === 0 ? sn : -sn, nz = k === 0 ? -c : c;
        var b0 = pos.length / 3;
        profile.forEach(function (pp) { addV(pp[0], pp[1] * c, pp[1] * sn, 0, ny, nz); });
        tris.forEach(function (tt) { tri(b0 + tt[0], b0 + tt[1], b0 + tt[2]); });
      });
    }
    var geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geo.setIndex(idx);
    geo.computeBoundingSphere();
    return geo;
  }

  /* Smooth normals only across edges flatter than `angle` (keeps big faces flat, bevels soft) */
  function creased(geo, angle) {
    var THREE = window.THREE;
    if (geo.index) geo = geo.toNonIndexed();
    var pos = geo.attributes.position.array, n = pos.length / 3, nt = n / 3;
    var fa = new Float32Array(nt * 3), fu = new Float32Array(nt * 3);
    var map = {}, t, c, key;
    function k3(i) { return Math.round(pos[i * 3] * 1e4) + '_' + Math.round(pos[i * 3 + 1] * 1e4) + '_' + Math.round(pos[i * 3 + 2] * 1e4); }
    for (t = 0; t < nt; t++) {
      var i0 = t * 3, i1 = i0 + 1, i2 = i0 + 2;
      var ux = pos[i1 * 3] - pos[i0 * 3], uy = pos[i1 * 3 + 1] - pos[i0 * 3 + 1], uz = pos[i1 * 3 + 2] - pos[i0 * 3 + 2];
      var wx = pos[i2 * 3] - pos[i0 * 3], wy = pos[i2 * 3 + 1] - pos[i0 * 3 + 1], wz = pos[i2 * 3 + 2] - pos[i0 * 3 + 2];
      var cx = uy * wz - uz * wy, cy = uz * wx - ux * wz, cz = ux * wy - uy * wx;
      var L = Math.sqrt(cx * cx + cy * cy + cz * cz) || 1e-12;
      fa[t * 3] = cx; fa[t * 3 + 1] = cy; fa[t * 3 + 2] = cz;
      fu[t * 3] = cx / L; fu[t * 3 + 1] = cy / L; fu[t * 3 + 2] = cz / L;
      for (c = 0; c < 3; c++) { key = k3(i0 + c); (map[key] || (map[key] = [])).push(t); }
    }
    var cosA = Math.cos(angle), nor = new Float32Array(n * 3);
    for (t = 0; t < nt; t++) {
      for (c = 0; c < 3; c++) {
        var list = map[k3(t * 3 + c)], sx = 0, sy = 0, sz = 0;
        for (var m = 0; m < list.length; m++) {
          var q = list[m];
          if (fu[t * 3] * fu[q * 3] + fu[t * 3 + 1] * fu[q * 3 + 1] + fu[t * 3 + 2] * fu[q * 3 + 2] >= cosA) { sx += fa[q * 3]; sy += fa[q * 3 + 1]; sz += fa[q * 3 + 2]; }
        }
        var l2 = Math.sqrt(sx * sx + sy * sy + sz * sz) || 1;
        var o = (t * 3 + c) * 3;
        nor[o] = sx / l2; nor[o + 1] = sy / l2; nor[o + 2] = sz / l2;
      }
    }
    geo.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
    return geo;
  }

  /* Rounded rectangle shape centred on the origin */
  function rrShape(w, h, r) {
    var THREE = window.THREE;
    var s = new THREE.Shape(), x = -w / 2, y = -h / 2;
    r = Math.min(r, w / 2, h / 2);
    s.moveTo(x + r, y);
    s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r);
    s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r);
    s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
    return s;
  }
  /* Box with rounded vertical edges (rc) and a soft bevel (b) all round; size w × h × d, centred */
  function roundedBox(w, h, d, rc, b) {
    var THREE = window.THREE;
    b = b === undefined ? Math.min(w, h, d) * 0.08 : b;
    var geo = new THREE.ExtrudeGeometry(rrShape(w - 2 * b, h - 2 * b, Math.max(0.001, rc - b)), {
      depth: Math.max(0.001, d - 2 * b), bevelEnabled: b > 0, bevelThickness: b, bevelSize: b, bevelSegments: 3, curveSegments: 8
    });
    geo.translate(0, 0, -(d - 2 * b) / 2);
    return creased(geo, 0.6);
  }

  /* ------------------------------------------------------------------ */
  /* Procedural cable textures (built once, shared by every wire)         */
  /* ------------------------------------------------------------------ */
  var wireTex = null;
  function wireTextures() {
    if (wireTex) return wireTex;
    var THREE = window.THREE, rnd = K.rng(2024), i, j;
    /* 1) cut face of a stranded conductor: 37 fine strands in hexagonal packing, each polished
     *    cut surface catching the light a little differently, dark gaps between them */
    var N = 512, c = document.createElement('canvas'); c.width = c.height = N;
    var g = c.getContext('2d');
    g.fillStyle = '#2B170C'; g.fillRect(0, 0, N, N);
    var rs = 33.5, cx = N / 2, cy = N / 2, dxs = 2 * rs * 1.012;
    for (var q = -3; q <= 3; q++) for (var r = -3; r <= 3; r++) {
      if (Math.abs(q + r) > 3) continue;
      var sx = cx + dxs * (q + r / 2) + (rnd() - 0.5) * 2.4, sy = cy + dxs * r * 0.8660254 + (rnd() - 0.5) * 2.4;
      var rr2 = rs * (0.94 + rnd() * 0.05), lum = 0.82 + rnd() * 0.22, hot = rnd() * 0.22;
      var gr = g.createRadialGradient(sx - rr2 * 0.3, sy - rr2 * 0.34, rr2 * 0.05, sx, sy, rr2);
      function cc(a, b2, c2) { return 'rgb(' + Math.round(a * lum) + ',' + Math.round(b2 * lum) + ',' + Math.round(c2 * lum) + ')'; }
      gr.addColorStop(0, cc(250, 196 - hot * 30, 150 - hot * 40));
      gr.addColorStop(0.55, cc(222, 144, 96));
      gr.addColorStop(1, cc(150, 84, 50));
      g.fillStyle = gr; g.beginPath(); g.arc(sx, sy, rr2, 0, TAU); g.fill();
      /* fine polishing marks across the cut */
      g.save(); g.beginPath(); g.arc(sx, sy, rr2, 0, TAU); g.clip();
      g.strokeStyle = 'rgba(255,230,200,0.10)'; g.lineWidth = 1;
      var ang = rnd() * Math.PI;
      for (j = -3; j <= 3; j++) {
        var off = j * rr2 * 0.3 + (rnd() - 0.5) * 3;
        g.beginPath(); g.moveTo(sx - Math.cos(ang) * rr2 - Math.sin(ang) * off, sy - Math.sin(ang) * rr2 + Math.cos(ang) * off);
        g.lineTo(sx + Math.cos(ang) * rr2 - Math.sin(ang) * off, sy + Math.sin(ang) * rr2 + Math.cos(ang) * off); g.stroke();
      }
      g.restore();
    }
    var face = new THREE.CanvasTexture(c);
    face.encoding = THREE.sRGBEncoding; face.anisotropy = 8;
    /* 2) twisted strands on the bare copper: one lay of the helix as a tileable stripe */
    var M = 128, c2 = document.createElement('canvas'); c2.width = c2.height = M;
    var g2 = c2.getContext('2d'), im = g2.createImageData(M, M);
    for (j = 0; j < M; j++) for (i = 0; i < M; i++) {
      var f = ((j - i) / M % 1 + 1) % 1, pr = Math.sqrt(Math.max(0, 1 - Math.pow(2 * f - 1, 2)));
      var hv = Math.round(95 + 160 * pr), o4 = (j * M + i) * 4;
      im.data[o4] = hv; im.data[o4 + 1] = hv; im.data[o4 + 2] = hv; im.data[o4 + 3] = 255;
    }
    g2.putImageData(im, 0, 0);
    var lay = new THREE.CanvasTexture(c2);
    lay.wrapS = lay.wrapT = THREE.RepeatWrapping; lay.repeat.set(1.3, 30); lay.anisotropy = 8;
    lay.encoding = THREE.sRGBEncoding;
    var layBump = new THREE.CanvasTexture(c2);
    layBump.wrapS = layBump.wrapT = THREE.RepeatWrapping; layBump.repeat.set(1.3, 30);
    wireTex = { face: face, lay: lay, bump: layBump };
    return wireTex;
  }

  /* ------------------------------------------------------------------ */
  /* The shared wire: cutaway cable + ion lattice + electrons             */
  /* Local frame: wire axis = x. Cut plane z = 0; the lattice fills the   */
  /* back half (z ≤ 0). The group is tilted about x so the cut faces the  */
  /* camera a little.                                                     */
  /* o: {R conductor radius, J jacket thickness, A window half-length,  */
  /*     peel (bare copper strip), X cable half-length, a lattice step,  */
  /*     rIon, rEl, jit (thermal jitter radius), tilt, pos, seed, dark,  */
  /*     front:false (no front jacket), copper:false (no solid ends),    */
  /*     margin (hidden wrap zone), pvc, ionDetail, depthShade, eCell}   */
  /* ------------------------------------------------------------------ */
  function makeWire(parent, o) {
    var THREE = window.THREE;
    var R = o.R, J = o.J, A = o.A, peel = o.peel === undefined ? 0.5 : o.peel, X = o.X;
    var a = o.a, rIon = o.rIon, rEl = o.rEl, jit = o.jit;
    var margin = o.margin === undefined ? 0.55 : o.margin;
    var g = new THREE.Group();
    if (o.tilt) g.rotation.x = -o.tilt;
    if (o.pos) g.position.fromArray(o.pos);
    parent.add(g);

    var mats = [];
    var TX = wireTextures();
    /* PVC: matte body with a faint satin coat, a little light scattering warms the thick parts */
    var mPvc = new THREE.MeshPhysicalMaterial({ color: o.pvc === undefined ? 0xD6D1C7 : o.pvc, roughness: 0.58, metalness: 0, clearcoat: 0.22, clearcoatRoughness: 0.42, envMapIntensity: 0.4, emissive: 0x2A1D0E, emissiveIntensity: 0.1 });
    var mCu = K.mat.std(0xFFFFFF, 0.34, 1, { map: TX.lay, bumpMap: TX.bump, bumpScale: 1.6, color: 0xE0A47C, envMapIntensity: 1.0 });
    var mFace = K.mat.std(0xFFFFFF, 0.3, 1, { map: TX.face, envMapIntensity: 1.1, emissive: 0xFFFFFF, emissiveMap: TX.face, emissiveIntensity: 0.32 });
    var mWall = K.mat.std(0x8E5636, 0.62, 0.5, { envMapIntensity: 0.5 });
    mats.push(mPvc, mCu, mFace, mWall);
    var bj = Math.min(0.035, J * 0.3), bc = 0.028;
    function jacketProf(x0, x1) { return [[x0, R], [x1, R], [x1, R + J - bj], [x1 - bj, R + J], [x0 + bj, R + J], [x0, R + J - bj]]; }
    function addMesh(geo, mat, cast) { var m = new THREE.Mesh(geo, mat); m.castShadow = !!cast; m.receiveShadow = true; g.add(m); return m; }
    var parts = {};
    if (J > 0) {
      parts.jacketBack = addMesh(revolve(jacketProf(-X, X), Math.PI, TAU, 64), mPvc, true);
      if (o.front !== false) {
        parts.jacketR = addMesh(revolve(jacketProf(A + peel, X), 0, Math.PI, 64), mPvc, true);
        parts.jacketL = addMesh(revolve(jacketProf(-X, -(A + peel)), 0, Math.PI, 64), mPvc, true);
      }
    }
    var Rc = R - 0.004;
    /* back wall of the bore: the matte inside of the copper body that the lattice sits in */
    if (J > 0 && o.wall !== false) parts.wall = addMesh(revolve([[-A, R - 0.012], [A, R - 0.012], [A, R - 0.001], [-A, R - 0.001]], Math.PI, TAU, 64), mWall, false);
    if (o.copper !== false) {
      /* stranded cut faces */
      var fr = Rc - bc;
      [-1, 1].forEach(function (sd) {
        var dsc = new THREE.Mesh(new THREE.CircleGeometry(fr, 64), mFace);
        dsc.position.x = sd * (A - 0.0025); dsc.rotation.y = -sd * Math.PI / 2; dsc.rotation.z = sd > 0 ? 0 : 0.5;
        dsc.receiveShadow = true; g.add(dsc);
        parts[sd > 0 ? 'faceR' : 'faceL'] = dsc;
      });
      parts.cuR = addMesh(revolve([[A, 0], [X - 0.003, 0], [X - 0.003, Rc], [A + bc, Rc], [A, Rc - bc]], 0, TAU, 64), mCu, true);
      parts.cuL = addMesh(revolve([[-X + 0.003, 0], [-A, 0], [-A, Rc - bc], [-A - bc, Rc], [-X + 0.003, Rc]], 0, TAU, 64), mCu, true);
    }

    /* Ion lattice (simple cubic, spacing a; one layer lies in the cut plane) */
    var ions = [];
    var nxI = Math.max(1, Math.round(2 * A / a)), ax = 2 * A / nxI;
    var lim = R - rIon - 0.02;
    for (var i = 0; i < nxI; i++) {
      var x = -A + (i + 0.5) * ax;
      for (var k = 0; k <= 8; k++) for (var j = -8; j <= 8; j++) {
        var y = j * a, z = -k * a;
        if (y * y + z * z <= lim * lim) ions.push(x, y, z);
      }
    }
    var nIon = ions.length / 3;
    var ionB = new Float32Array(ions);
    var ionPh = new Float32Array(nIon * 3), ionW = new Float32Array(nIon * 3);
    var rng = K.rng(o.seed || 7);
    for (i = 0; i < nIon * 3; i++) { ionPh[i] = rng() * TAU; ionW[i] = 8 + rng() * 6; }
    var ionMat = o.ionMat || K.mat.std(0xD08A5C, 0.36, 1, { envMapIntensity: 1.0 });
    mats.push(ionMat);
    var ionMesh = K.instanced(nIon, { geometry: new THREE.IcosahedronGeometry(rIon, o.ionDetail === undefined ? 2 : o.ionDetail), material: ionMat });
    ionMesh.castShadow = o.ionShadow !== false;
    ionMesh.receiveShadow = true;
    /* depth cue: deeper layers slightly darker so the cut face reads first */
    var ionShade = new Float32Array(nIon);
    var col = new THREE.Color();
    for (i = 0; i < nIon; i++) {
      var depth = -ionB[i * 3 + 2] / a;
      ionShade[i] = 1 - Math.min(0.42, depth * (o.depthShade === undefined ? 0.17 : o.depthShade));
      col.setRGB(ionShade[i], ionShade[i], ionShade[i]);
      ionMesh.setColorAt(i, col);
    }
    g.add(ionMesh);

    /* Electrons: jittered grid with the same density as the ions, over the wrap range */
    var xmin = -A - margin, Pd = 2 * (A + margin);
    var Re = R - rEl - jit * 0.7;
    var cell = o.eCell || a;
    var els = [];
    for (x = xmin + cell / 2; x < xmin + Pd; x += cell) {
      for (y = -Re + cell / 2; y < Re; y += cell) {
        for (z = -cell / 2; z > -Re; z -= cell) {
          var px = x + (rng() - 0.5) * cell * 0.92, py = y + (rng() - 0.5) * cell * 0.92, pz = z + (rng() - 0.5) * cell * 0.92;
          if (pz > -0.035 || py * py + pz * pz > Re * Re) continue;
          if (px < xmin) px += Pd; else if (px >= xmin + Pd) px -= Pd;
          els.push(px, py, pz);
        }
      }
    }
    var nEl = els.length / 3;
    var elB = new Float32Array(els);
    var elDur = new Float32Array(nEl), elPh = new Float32Array(nEl);
    for (i = 0; i < nEl; i++) { elDur[i] = 0.13 + rng() * 0.11; elPh[i] = rng() * 50; }
    var elMat = o.elMat || K.mat.electron(o.dark);
    mats.push(elMat);
    var elMesh = K.instanced(nEl, { geometry: new THREE.IcosahedronGeometry(rEl, 1), material: elMat });
    elMesh.castShadow = o.elShadow !== false;
    g.add(elMesh);
    var elPos = new Float32Array(nEl * 3);

    g.updateMatrixWorld(true);
    /* presence (0..1) for masked visuals: each particle eases fully in or out, so no
     * particle is ever left half-sized at the boundary when the sliders are at rest */
    var ionPres = new Float32Array(nIon).fill(1), elPres = new Float32Array(nEl).fill(1);
    var elRad = new Float32Array(nEl);
    for (i = 0; i < nEl; i++) elRad[i] = Math.sqrt(elB[i * 3 + 1] * elB[i * 3 + 1] + elB[i * 3 + 2] * elB[i * 3 + 2]);

    var W = {
      group: g, parts: parts, mats: mats, R: R, A: A, X: X, a: a,
      ionMesh: ionMesh, elMesh: elMesh, nIon: nIon, nEl: nEl, ionShade: ionShade,
      ionB: ionB, elB: elB, elPos: elPos, xmin: xmin, P: Pd, ionPres: ionPres,
      /* p: {vib, jit, jrate, kick (Float32Array), kickAmp, escale (Float32Array), off (Float32Array ×3),
       *     maskA, maskR (visible half-length and radius), dt, X (extra x offset per electron)} */
      update: function (t, D, p) {
        p = p || {};
        var vib = p.vib === undefined ? 0.012 : p.vib;
        var jamp = (p.jit === undefined ? 1 : p.jit) * jit;
        var jrate = p.jrate === undefined ? 1 : p.jrate;
        var kick = p.kick, kAmp = p.kickAmp || 0;
        var mA = p.maskA, mR = p.maskR, fade = 0.12;
        var pk = 1 - Math.exp(-(p.dt === undefined ? 1 / 60 : p.dt) / 0.16);
        var ii, b, s;
        for (ii = 0; ii < nIon; ii++) {
          b = ii * 3;
          var amp = vib + (kick ? kick[ii] * kAmp : 0);
          var ix = ionB[b], iy = ionB[b + 1], iz = ionB[b + 2];
          s = 1;
          if (mA !== undefined) {
            var inside = Math.abs(ix) + rIon * 0.6 <= mA && Math.sqrt(iy * iy + iz * iz) + rIon <= mR + 0.01;
            ionPres[ii] += ((inside ? 1 : 0) - ionPres[ii]) * pk;
            if (ionPres[ii] < 0.002) ionPres[ii] = 0; else if (ionPres[ii] > 0.998) ionPres[ii] = 1;
            s = K.ease.out(ionPres[ii]);
          }
          if (s <= 0.001) { ionMesh.setAt(ii, 0, -999, 0, 0.0001); continue; }
          ionMesh.setAt(ii,
            ix + amp * Math.sin(t * ionW[b] + ionPh[b]),
            iy + amp * Math.sin(t * ionW[b + 1] + ionPh[b + 1]),
            iz + amp * 0.8 * Math.sin(t * ionW[b + 2] + ionPh[b + 2]), s);
        }
        ionMesh.commit();
        var esc = p.escale, xo = p.X, off = p.off;
        for (ii = 0; ii < nEl; ii++) {
          b = ii * 3;
          var u = elB[b] + D + (xo ? xo[ii] : 0);
          var xw = xmin + ((u - xmin) % Pd + Pd) % Pd;
          var ph = t * jrate / elDur[ii] + elPh[ii];
          var kk = Math.floor(ph), f = ph - kk;
          var hx0 = hash(ii, kk, 0) * 2 - 1, hy0 = hash(ii, kk, 1) * 2 - 1, hz0 = hash(ii, kk, 2) * 2 - 1;
          var hx1 = hash(ii, kk + 1, 0) * 2 - 1, hy1 = hash(ii, kk + 1, 1) * 2 - 1, hz1 = hash(ii, kk + 1, 2) * 2 - 1;
          var jx = (hx0 + (hx1 - hx0) * f) * jamp, jy = (hy0 + (hy1 - hy0) * f) * jamp, jz = (hz0 + (hz1 - hz0) * f) * jamp * 0.8;
          if (off) { jx += off[b]; jy += off[b + 1]; jz += off[b + 2]; }
          var X0 = xw + jx, Y0 = elB[b + 1] + jy, Z0 = Math.min(elB[b + 2] + jz, 0.02);
          elPos[b] = X0; elPos[b + 1] = Y0; elPos[b + 2] = Z0;
          s = esc ? esc[ii] : 1;
          if (mA !== undefined) {
            /* radial: eased presence by the base position; ends: electrons flow in and out */
            var inR = elRad[ii] + rEl + jit * 0.6 <= mR;
            elPres[ii] += ((inR ? 1 : 0) - elPres[ii]) * pk;
            if (elPres[ii] < 0.002) elPres[ii] = 0; else if (elPres[ii] > 0.998) elPres[ii] = 1;
            s *= K.ease.out(elPres[ii]) * clamp((mA - Math.abs(X0)) / fade, 0, 1);
          }
          if (s <= 0.001) elMesh.setAt(ii, 0, -999, 0, 0.0001);
          else elMesh.setAt(ii, X0, Y0, Z0, s);
        }
        elMesh.commit();
      },
      /* set presence instantly for a mask (used by reset) */
      snap: function (mA, mR) {
        for (var q = 0; q < nIon; q++) {
          var qx = ionB[q * 3], qy = ionB[q * 3 + 1], qz = ionB[q * 3 + 2];
          ionPres[q] = (Math.abs(qx) + rIon * 0.6 <= mA && Math.sqrt(qy * qy + qz * qz) + rIon <= mR + 0.01) ? 1 : 0;
        }
        for (q = 0; q < nEl; q++) elPres[q] = (elRad[q] + rEl + jit * 0.6 <= mR) ? 1 : 0;
      },
      /* world position of electron i (after update) */
      elWorld: function (ii, out) {
        out = out || new THREE.Vector3();
        out.set(elPos[ii * 3], elPos[ii * 3 + 1], elPos[ii * 3 + 2]);
        return g.localToWorld(out);
      },
      toWorld: function (x, y, z, out) {
        out = out || new THREE.Vector3();
        out.set(x, y, z);
        return g.localToWorld(out);
      },
      /* pick the electron closest to a local point (used to choose the tracked electron) */
      nearestElectron: function (x, y, z) {
        var best = -1, bd = 1e9;
        for (var ii = 0; ii < nEl; ii++) {
          var dx = elB[ii * 3] - x, dy = elB[ii * 3 + 1] - y, dz = elB[ii * 3 + 2] - z;
          var d = dx * dx + dy * dy + dz * dz;
          if (d < bd) { bd = d; best = ii; }
        }
        return best;
      }
    };
    return W;
  }

  /* Slide entry: start slightly wider and settle onto the home view */
  function introCam(v, home, k, dyaw, dpitch) {
    if (K.reducedMotion) { v.setView(home); return; }
    v.setView({ yaw: home.yaw + dyaw, pitch: home.pitch + dpitch, distance: home.distance * k, target: home.target });
    v.animateTo(home, 1.8);
  }

  /* A fading polyline trail for one tracked electron (2D overlay) */
  function makeTrail(n) {
    var xs = new Float32Array(n * 3), sx = new Float32Array(n), sy = new Float32Array(n), cnt = 0, head = 0, p = null;
    var BANDS = 10;
    return {
      clear: function () { cnt = 0; head = 0; },
      push: function (v3) {
        xs[head * 3] = v3.x; xs[head * 3 + 1] = v3.y; xs[head * 3 + 2] = v3.z;
        head = (head + 1) % n; if (cnt < n) cnt++;
      },
      /* older parts fade out; drawn in a few alpha bands, projected without allocation */
      draw: function (ctx, v, color, width, alpha) {
        if (cnt < 2) return;
        p = p || new window.THREE.Vector3();
        var m, id;
        for (m = 0; m < cnt; m++) {
          id = (head - cnt + m + n) % n;
          p.set(xs[id * 3], xs[id * 3 + 1], xs[id * 3 + 2]).project(v.camera);
          sx[m] = (p.x + 1) / 2 * v.w; sy[m] = (1 - p.y) / 2 * v.h;
        }
        ctx.save();
        var base = ctx.globalAlpha;
        ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        ctx.strokeStyle = color; ctx.lineWidth = width;
        for (var b = 0; b < BANDS; b++) {
          var m0 = Math.floor(b * (cnt - 1) / BANDS), m1 = Math.floor((b + 1) * (cnt - 1) / BANDS);
          if (m1 <= m0) continue;
          ctx.globalAlpha = base * alpha * Math.pow((b + 1) / BANDS, 1.6);
          ctx.beginPath(); ctx.moveTo(sx[m0], sy[m0]);
          for (m = m0 + 1; m <= m1; m++) ctx.lineTo(sx[m], sy[m]);
          ctx.stroke();
        }
        ctx.restore();
      }
    };
  }

  /* ================================================================== */
  /* current-gate · S 680×520 · Akım nedir                               */
  /* ================================================================== */
  K.register('current-gate', function (el, opts) {
    var THREE = window.THREE;
    var theme = opts.theme || 'light', dark = theme === 'dark';
    var v = K.stage3d(el, fitStage(el, {
      theme: theme, fov: 26, yaw: -0.3, pitch: 0.36, distance: 18.8, target: [0.2, -0.3, 0],
      size: 6, ground: -1.52, minYaw: -1.1, maxYaw: 0.6, minPitch: 0.02, maxPitch: 0.95, minDistance: 12, maxDistance: 26
    }, 680 / 520, 0.64));
    var A = 3.78;
    var W = makeWire(v.scene, { R: 1.2, J: 0.3, A: A, peel: 0.5, X: 10, a: 0.42, rIon: 0.105, rEl: 0.062, jit: 0.095, tilt: 0.0, seed: 11, dark: dark, depthShade: 0.26 });
    var gx = 0;

    /* Counting gate: a copper-tinted cross-section of the conductor */
    var gateMat = new THREE.MeshBasicMaterial({ color: 0xC8693A, transparent: true, opacity: 0.15, depthWrite: false, side: THREE.DoubleSide });
    var gate = new THREE.Mesh(new THREE.CircleGeometry(1.19, 72), gateMat);
    gate.rotation.y = Math.PI / 2;
    gate.position.x = gx;
    gate.renderOrder = 2;
    W.group.add(gate);
    var rim = new THREE.Mesh(new THREE.TorusGeometry(1.19, 0.022, 12, 120), K.mat.copper({ roughness: 0.25 }));
    rim.rotation.y = Math.PI / 2;
    rim.position.x = gx;
    W.group.add(rim);

    var ripples = [];
    var ringGeo = new THREE.RingGeometry(0.075, 0.1, 48);
    for (var r = 0; r < 24; r++) {
      var rm = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color: 0xB4531F, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide }));
      rm.rotation.y = Math.PI / 2; rm.visible = false; rm.renderOrder = 3;
      W.group.add(rm);
      ripples.push({ m: rm, age: 9 });
    }
    var rippleNext = 0;
    function spawnRipple(y, z) {
      var R0 = ripples[rippleNext]; rippleNext = (rippleNext + 1) % ripples.length;
      R0.age = 0; R0.m.position.set(gx + 0.004, y, z); R0.m.visible = true;
    }

    /* Labels */
    var lblGate = v.label('kesit', { at: W.toWorld(gx, 1.19, 0), cls: 'name', dx: 26, dy: -58, line: true, align: 'left', valign: 'bottom' });
        var chip0 = v.label('Akım yok: elektronlar rastgele hareket eder, kesitten net geçiş olmaz', { at: [-0.75, -1.52, 2.05], cls: 'note chip', dy: 0 });
    chip0.show(false);

    /* State */
    var I = 1, Iset = 1, touched = false, D = 0, count = 0, flash = 0, rate = 0;
    var last = new Int32Array(W.nEl), glow = new Float32Array(W.nEl), escale = new Float32Array(W.nEl);
    var VPA = 0.42;            /* visual drift (world units / s) per ampere: one lattice step per second at 1 A */
    var tracer = W.nearestElectron(-A + 0.9, -0.45, -0.18);
    var trail = makeTrail(240), trailLastX = 0;
    var tmp = new THREE.Vector3();
    var home = { yaw: v.view.yaw, pitch: v.view.pitch, distance: v.view.distance, target: v.view.target.toArray() };

    function resetCounts() {
      for (var i = 0; i < W.nEl; i++) { last[i] = Math.floor((W.elB[i * 3] + D - gx) / W.P); glow[i] = 0; }
    }

    var stamps = new Float32Array(96).fill(-9), stampNext = 0;
    /* self-playing story: no current → 1 A → 2 A → back to rest (12 s) */
    var CYC = 12, lastCyc = 0;
    function autoI(t) {
      var u = ((t % CYC) + CYC) % CYC;
      if (u < 2) return 0;
      if (u < 7) return 1;
      if (u < 11) return 2;
      return 0;
    }
    function reset() {
      I = 0; Iset = 1; touched = false; D = 0; count = 0; flash = 0; rate = 0; lastCyc = 0;
      stamps.fill(-9); stampNext = 0;
      resetCounts();
      for (var i = 0; i < ripples.length; i++) { ripples[i].age = 9; ripples[i].m.visible = false; }
      trail.clear();
      introCam(v, home, 1.07, 0.05, 0.03);
    }
    reset();

    function drawOverlay(t) {
      var ctx = v.ctx, w = v.w, h = v.h;
      var ink = dark ? P.onNight : P.ink, muted = dark ? P.onNightMuted : P.muted;
      /* tracer */
      trail.draw(ctx, v, dark ? P.blueLight : '#2848C8', 1.6, 0.7);
      if (Math.abs(W.elPos[tracer * 3]) < A - 0.1) {
        var tp = v.project(W.elWorld(tracer, tmp));
        ctx.save(); ctx.strokeStyle = K.rgba('#2848C8', 0.85); ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(tp.x, tp.y, 9, 0, TAU); ctx.stroke(); ctx.restore();
      }
      /* counter: one big number */
      var x0 = 30, y0 = 34;
      K.label(ctx, 'Kesitten geçen', x0, y0, { size: 16, weight: 600, color: muted });
      var s = K.num(count, 0);
      K.label(ctx, s, x0, y0 + 44, { size: 44, weight: 500, mono: true, color: ink });
      var nw = textW(ctx, s, 44, 500, true);
      K.label(ctx, 'elektron', x0 + nw + 10, y0 + 44, { size: 18, weight: 500, color: muted });
      K.label(ctx, 'Akım: ' + K.num(Math.round(I * 10) / 10, 1) + ' A', x0, y0 + 80, { size: 22, weight: 600, mono: true, color: P.copper });
      /* direction arrows under the wire */
      var aAlpha = clamp(I / 0.25, 0, 1);
      if (aAlpha > 0.01) {
        var ax0 = w * 0.34, ax1 = w * 0.6;
        K.arrow(ctx, ax0, h - 56, ax1, h - 56, { color: '#2848C8', width: 3, head: 11, alpha: aAlpha });
        K.label(ctx, 'elektronlar', ax1 + 14, h - 50, { size: 18, weight: 600, color: P.blue, alpha: aAlpha });
        K.arrow(ctx, ax1, h - 24, ax0, h - 24, { color: P.copperFill, width: 3, head: 11, alpha: aAlpha });
        K.label(ctx, 'akım yönü', ax0 - 14, h - 18, { size: 18, weight: 600, color: P.copper, align: 'right', alpha: aAlpha });
      }
      /* legend and tag */
      drawLegend(ctx, w - 360, 34, dark);
      drawTag(ctx, 'kayma hızı abartılı', w - 24, h - 8, 'right');
    }

    return {
      reset: reset,
      set: function (key, val) {
        if (key === 'current' && isFinite(+val)) { Iset = clamp(+val, 0, 2); touched = true; }
      },
      read: function (key) {
        var Ir = Math.round((touched ? Iset : I) * 10) / 10;
        if (key === 'current') return K.num(Ir, 1) + ' A';
        if (key === 'perSecond') return Ir < 0.05 ? 'Saniyede net 0 elektron' : 'Saniyede ' + sci(Ir / 1.602176634e-19, 2) + ' elektron';
        if (key === 'formula') {
          if (Ir < 0.05) return '0 C ÷ (1,602 × 10⁻¹⁹ C) = 0';
          return fmtMin(Ir, 1) + ' C ÷ (1,602 × 10⁻¹⁹ C) ≈ ' + sci(Ir / 1.602176634e-19, 2);
        }
        if (key === 'count') return 'Kesitten geçen: ' + K.num(count, 0);
        if (key === 'explain') return 'Akım, kesitten saniyede geçen elektron yükünün miktarıdır.';
        return '';
      },
      frame: function (t, dt) {
        var tgt = touched ? Iset : autoI(t);
        if (!touched) {
          /* every loop starts from an identical state: the counter restarts with the cycle */
          var cyc = Math.floor(t / CYC);
          if (cyc !== lastCyc) { lastCyc = cyc; count = 0; stamps.fill(-9); resetCounts(); }
        }
        I = approach(I, tgt, dt, touched ? 5 : 3.2);
        if (Math.abs(I - tgt) < 1e-4) I = tgt;
        var red = K.reducedMotion;
        D += I * VPA * (red ? 0.6 : 1) * dt;
        /* crossings (net, by the drifting base position) */
        var i;
        for (i = 0; i < W.nEl; i++) {
          var c = Math.floor((W.elB[i * 3] + D - gx) / W.P);
          if (c !== last[i]) {
            if (c > last[i]) {
              count += c - last[i];
              stamps[stampNext] = t; stampNext = (stampNext + 1) % stamps.length;
              flash += 1;
              glow[i] = 1;
              spawnRipple(W.elPos[i * 3 + 1], W.elPos[i * 3 + 2]);
            } else count -= last[i] - c;
            last[i] = c;
          }
          glow[i] = Math.max(0, glow[i] - dt * 2.2);
          escale[i] = 1 + 0.45 * glow[i] * glow[i];
        }
        W.update(t, D, { jit: red ? 0.35 : 1, jrate: red ? 0.4 : 1, escale: escale });
        /* gate glow follows the smoothed crossing rate (no strobing); ripples mark single crossings */
        var kr = Math.exp(-dt / 0.7);
        rate = rate * kr + flash * (1 - kr) / Math.max(dt, 1e-4);
        flash = 0;
        gateMat.opacity = 0.11 + 0.17 * clamp(rate / 22, 0, 1);
        for (i = 0; i < ripples.length; i++) {
          var R0 = ripples[i];
          if (R0.age > 1) continue;
          R0.age += dt;
          var k = R0.age / 0.9;
          if (k >= 1) { R0.m.visible = false; R0.age = 9; continue; }
          var sc = 1 + 5 * K.ease.out(k);
          R0.m.scale.set(sc, sc, sc);
          R0.m.material.opacity = 0.75 * (1 - k) * (1 - k);
        }
        /* tracer trail */
        W.elWorld(tracer, tmp);
        var lx = W.elPos[tracer * 3];
        if (lx < trailLastX - 1) trail.clear();
        trailLastX = lx;
        if (Math.abs(lx) < A - 0.05) trail.push(tmp); else trail.clear();
        chip0.show(I < 0.05);
        v.render(dt);
        if (!K.skipRender) { fadeEdges(v.ctx, v.w, v.h, 48); drawOverlay(t); }
      },
      dispose: function () { v.dispose(); }
    };
  });

  /* ================================================================== */
  /* voltage-push · S 680×520 · Gerilim nedir                            */
  /* ================================================================== */
  K.register('voltage-push', function (el, opts) {
    var THREE = window.THREE;
    var theme = opts.theme || 'light', dark = theme === 'dark';
    var v = K.stage3d(el, {
      theme: theme, fov: 26, yaw: 0, pitch: 0.46, distance: 24.5, target: [0, 0.35, -2.1],
      size: 7, ground: -1.52, minYaw: -0.9, maxYaw: 0.6, minPitch: 0.1, maxPitch: 1.0, minDistance: 15, maxDistance: 32
    });
    var A = 3.36, X = 4.7, R = 1.2, RES = 10;
    var W = makeWire(v.scene, { R: R, J: 0.3, A: A, peel: 0.42, X: X, a: 0.42, rIon: 0.105, rEl: 0.062, jit: 0.095, tilt: 0.5, seed: 23, dark: dark, depthShade: 0.26 });
    var scene = v.scene;
    function add(geo, mat, cast, parent) { var m = new THREE.Mesh(geo, mat); m.castShadow = cast !== false; m.receiveShadow = true; (parent || scene).add(m); return m; }
    function mirror(prof, s) { return s > 0 ? prof : prof.map(function (p) { return [-p[0], p[1]]; }); }

    /* Terminal caps on the wire ends: nickel-plated, with a coloured polarity band */
    var mSteel = K.mat.steel({ roughness: 0.3 });
    var mBlue = K.mat.std(0x2343B0, 0.42, 0.1);
    var mCopperPaint = K.mat.std(0xC8693A, 0.42, 0.15);
    var RCAP = 1.6;
    [-1, 1].forEach(function (s) {
      var x0 = X - 0.5, x1 = X + 0.24;
      add(revolve(mirror([[x0, 0], [x1, 0], [x1, RCAP - 0.08], [x1 - 0.08, RCAP], [x0 + 0.06, RCAP], [x0, RCAP - 0.06]], s), 0, TAU, 72), mSteel);
      add(revolve(mirror([[X - 0.2, RCAP - 0.004], [X - 0.04, RCAP - 0.004], [X - 0.04, RCAP + 0.022], [X - 0.2, RCAP + 0.022]], s), 0, TAU, 72), s > 0 ? mCopperPaint : mBlue, false);
    });

    /* Battery-like source behind the wire */
    var BY = 1.25, BZ = -4.5;
    var bat = new THREE.Group();
    bat.position.set(0, BY, BZ);
    scene.add(bat);
    var RB = 1.15, LB = 4.42;
    var mSleeve = K.mat.std(0x2A2E36, 0.42, 0.15);
    add(revolve([[-LB, 0], [LB, 0], [LB, RB - 0.06], [LB - 0.06, RB], [-LB + 0.06, RB], [-LB, RB - 0.06]], 0, TAU, 72), mSleeve, true, bat);
    add(revolve([[LB - 0.95, RB - 0.01], [LB - 0.12, RB - 0.01], [LB - 0.12, RB + 0.012], [LB - 0.95, RB + 0.012]], 0, TAU, 72), mCopperPaint, false, bat);
    add(revolve([[LB - 0.02, 0], [LB + 0.1, 0], [LB + 0.1, RB - 0.1], [LB - 0.02, RB - 0.04]], 0, TAU, 72), mSteel, true, bat);
    add(revolve([[LB + 0.08, 0], [LB + 0.2, 0], [LB + 0.2, 0.4], [LB + 0.16, 0.46], [LB + 0.08, 0.46]], 0, TAU, 48), mSteel, true, bat);
    add(revolve([[-LB - 0.1, 0], [-LB + 0.02, 0], [-LB + 0.02, RB - 0.04], [-LB - 0.1, RB - 0.1]], 0, TAU, 72), mSteel, true, bat);
    /* display window on the source: shows the voltage */
    var dispCanvas = document.createElement('canvas');
    dispCanvas.width = 512; dispCanvas.height = 150;
    var dispTex = new THREE.CanvasTexture(dispCanvas);
    dispTex.encoding = THREE.sRGBEncoding; dispTex.anisotropy = 8;
    var dispText = '', dispFontOk = false;
    function drawDisplay(txt) {
      var c = dispCanvas.getContext('2d');
      c.clearRect(0, 0, 512, 150);
      c.fillStyle = '#ECEAE3'; K.rr(c, 0, 0, 512, 150, 18); c.fill();
      c.textBaseline = 'middle';
      c.fillStyle = '#15171C'; c.font = '500 86px ' + K.fonts.mono; c.textAlign = 'right';
      c.fillText(txt, 488, 80);
      dispTex.needsUpdate = true;
      dispText = txt;
    }
    var ang = 0.5;
    var bezel = add(roundedBox(3.3, 1.08, 0.12, 0.12, 0.03), K.mat.plasticBlack({ roughness: 0.35 }), false, bat);
    bezel.position.set(-0.6, Math.sin(ang) * (RB + 0.02), Math.cos(ang) * (RB + 0.02));
    bezel.rotation.x = -ang;
    var screen = new THREE.Mesh(new THREE.PlaneGeometry(3.08, 0.9), new THREE.MeshBasicMaterial({ map: dispTex, toneMapped: false }));
    screen.position.set(0, 0, 0.065);
    bezel.add(screen);
    drawDisplay('3,0 V');

    /* Copper straps joining the source terminals to the wire caps */
    var mCu = K.mat.copper();
    [-1, 1].forEach(function (s) {
      /* from inside the cap (y 0, z −0.9) to the source terminal (y BY, z BZ) */
      var y0 = 0, z0 = -0.9, len = Math.sqrt(BY * BY + (BZ - z0) * (BZ - z0)) + 0.3;
      var strap = add(roundedBox(0.2, 0.62, len, 0.06, 0.03), mCu, true);
      strap.position.set(s * (X - 0.12), (y0 + BY) / 2, (z0 + BZ) / 2 - 0.15);
      strap.rotation.x = Math.atan2(BY - y0, -(BZ - z0));
    });

    /* Field arrows inside the wire, pointing from + to − */
    var arrowShape = new THREE.Shape();
    arrowShape.moveTo(0, -0.028); arrowShape.lineTo(0.72, -0.028); arrowShape.lineTo(0.72, -0.085); arrowShape.lineTo(1, 0);
    arrowShape.lineTo(0.72, 0.085); arrowShape.lineTo(0.72, 0.028); arrowShape.lineTo(0, 0.028); arrowShape.lineTo(0, -0.028);
    var arrowGeo = new THREE.ShapeGeometry(arrowShape);
    var fieldMat = new THREE.MeshBasicMaterial({ color: dark ? 0xC9CFDA : 0x3E434D, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide });
    var fieldArrows = [];
    [-0.63, 0.63].forEach(function (y) {
      for (var c = 0; c < 5; c++) {
        var m = new THREE.Mesh(arrowGeo, fieldMat);
        m.position.set(-2.4 + c * 1.2 + 0.45, y, 0.3);
        m.renderOrder = 4;
        W.group.add(m);
        fieldArrows.push(m);
      }
    });

    /* Labels */
    var lblSrc = v.label('gerilim kaynağı', { at: [3.0, BY + RB * 0.9, BZ + RB * 0.4], cls: 'note', dx: 18, dy: -36, line: true, align: 'left', valign: 'bottom' });
    var lblR = v.label('tel: R = 10 Ω', { at: W.toWorld(0.6, -1.5, 0.2), cls: 'note', dx: 0, dy: 30, line: true, align: 'center', valign: 'top' });
    var chip0 = v.label('Gerilim yok: elektronlar yalnızca rastgele hareket eder, net akış yok', { at: W.toWorld(0.6, -1.5, 0.2), cls: 'note chip', dy: 52, valign: 'top' });
    chip0.show(false);

    /* State */
    var V = 3, Vset = 3, touched = false, D = 0;
    var VPV = 0.1;   /* visual drift per volt (world units / s) */
    var tracer = W.nearestElectron(-A + 0.7, -0.4, -0.15);
    var trail = makeTrail(240), trailLastX = 0;
    var tmp = new THREE.Vector3();
    var home = { yaw: v.view.yaw, pitch: v.view.pitch, distance: v.view.distance, target: v.view.target.toArray() };

    function autoV(t) {
      var tau = ((t + 2.8) % 12 + 12) % 12;
      if (tau < 1.2) return 0;
      if (tau < 6) return 12 * K.ease.sine((tau - 1.2) / 4.8);
      if (tau < 7.2) return 12;
      return 12 * (1 - K.ease.sine((tau - 7.2) / 4.8));
    }
    function shownV() { return Math.round(V * 2) / 2; }
    function reset() {
      V = 3; Vset = 3; touched = false; D = 0;
      trail.clear();
      introCam(v, home, 1.06, 0.04, 0.03);
    }
    reset();

    function drawOverlay() {
      var ctx = v.ctx, w = v.w, h = v.h;
      var Vs = shownV(), Is = Vs / RES;
      trail.draw(ctx, v, dark ? P.blueLight : '#2848C8', 1.6, 0.7);
      if (Math.abs(W.elPos[tracer * 3]) < A - 0.1) {
        var tp = v.project(W.elWorld(tracer, tmp));
        ctx.save(); ctx.strokeStyle = K.rgba('#2848C8', 0.85); ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(tp.x, tp.y, 9, 0, TAU); ctx.stroke(); ctx.restore();
      }
      drawReadout(ctx, 30, 40, 'Akım', K.num(Is, 2), 'A', '= ' + K.num(Vs, 1) + ' V ÷ 10 Ω', dark);
      /* polarity badges printed on the caps, with what each pole does */
      var noteCol = dark ? P.onNightMuted : P.ink2, na = clamp(0.25 + V / 1.5, 0.25, 1);
      tmp.set(-X + 0.1, 0.1, RCAP); var pl = v.project(tmp);
      drawBadge(ctx, pl.x, pl.y, -1);
      tmp.set(-X + 0.1, -RCAP, 0.9); var plb = v.project(tmp);
      K.label(ctx, 'elektronları iter', pl.x, plb.y + 26, { size: 13, color: noteCol, align: 'center', alpha: na });
      tmp.set(X - 0.1, 0.1, RCAP); var pr = v.project(tmp);
      drawBadge(ctx, pr.x, pr.y, 1);
      tmp.set(X - 0.1, -RCAP, 0.9); var prb = v.project(tmp);
      K.label(ctx, 'elektronları çeker', pr.x, prb.y + 26, { size: 13, color: noteCol, align: 'center', alpha: na });
      drawLegend(ctx, 30, h - 26, dark, undefined, 'elektrik alanı (artıdan eksiye)');
      drawTag(ctx, 'basitleştirilmiş model', w - 24, 30, 'right');
      drawTag(ctx, 'kayma hızı abartılı gösterilmiştir', w - 24, 47, 'right');
    }

    return {
      reset: reset,
      set: function (key, val) {
        if (key === 'voltage' && isFinite(+val)) { Vset = clamp(+val, 0, 12); touched = true; }
      },
      read: function (key) {
        var Vs = touched ? Math.round(Vset * 10) / 10 : shownV(), Is = Vs / RES;
        if (key === 'voltage') return K.num(Vs, 1) + ' V';
        if (key === 'current') return K.num(Is, 2) + ' A';
        if (key === 'formula') return 'I = ' + fmtMin(Vs, 1) + ' V ÷ 10 Ω = ' + fmtMin(Is, 2) + ' A';
        var vmm = Is / (8.5e28 * 1.602176634e-19 * 1e-6) * 1000;
        if (key === 'drift') {
          if (Vs < 0.05) return '1 mm² telde gerçek kayma hızı: 0 (net akış yok)';
          var e = Math.floor(Math.log(vmm) / Math.LN10);
          return '1 mm² telde gerçek kayma hızı ≈ ' + K.num(vmm, Math.max(0, 1 - e)) + ' mm/s';
        }
        if (key === 'driftHour') {
          if (Vs < 0.05) return 'Saatte 0 cm';
          return 'Saatte ≈ ' + K.num(vmm * 360, 1) + ' cm';
        }
        return '';
      },
      frame: function (t, dt) {
        var tgt = touched ? Vset : autoV(t);
        V = touched ? approach(V, tgt, dt, 5) : tgt;
        if (Math.abs(V - tgt) < 1e-4) V = tgt;
        var red = K.reducedMotion;
        D += V * VPV * (red ? 0.6 : 1) * dt;
        W.update(t, D, { jit: red ? 0.35 : 1, jrate: red ? 0.4 : 1 });
        /* field arrows: longer and darker with more voltage */
        var k = V / 12;
        fieldMat.opacity = k <= 0.002 ? 0 : 0.28 + 0.42 * k;
        for (var i = 0; i < fieldArrows.length; i++) {
          var m = fieldArrows[i];
          m.visible = k > 0.002;
          m.scale.set(-(0.35 + 0.6 * k), 1, 1);
        }
        var txt = K.num(shownV(), 1) + ' V';
        if (!dispFontOk && document.fonts && document.fonts.check && document.fonts.check('500 40px "IBM Plex Mono"')) { dispFontOk = true; dispText = ''; }
        if (txt !== dispText) drawDisplay(txt);
        W.elWorld(tracer, tmp);
        var lx = W.elPos[tracer * 3];
        if (lx < trailLastX - 1) trail.clear();
        trailLastX = lx;
        if (Math.abs(lx) < A - 0.05) trail.push(tmp); else trail.clear();
        chip0.show(V < 0.05);
        v.render(dt);
        if (!K.skipRender) drawOverlay();
      },
      dispose: function () { dispTex.dispose(); v.dispose(); }
    };
  });

  /* Soft warm flash sprite texture (collisions, energy) */
  var flashTexCache = {};
  function flashTexture(key, inner, mid) {
    if (flashTexCache[key]) return flashTexCache[key];
    var THREE = window.THREE;
    var c = document.createElement('canvas'); c.width = c.height = 128;
    var g = c.getContext('2d');
    var gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    gr.addColorStop(0, inner); gr.addColorStop(0.32, mid); gr.addColorStop(1, 'rgba(255,150,60,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
    var tex = new THREE.CanvasTexture(c);
    tex.encoding = THREE.sRGBEncoding;
    flashTexCache[key] = tex;
    return tex;
  }

  /* ================================================================== */
  /* resistance-scatter · S 680×520 · Direnç nedir                       */
  /* ================================================================== */
  K.register('resistance-scatter', function (el, opts) {
    var THREE = window.THREE;
    var theme = opts.theme || 'light', dark = theme === 'dark';
    var v = K.stage3d(el, {
      theme: theme, fov: 26, yaw: 0.4, pitch: 0.4, distance: 20, target: [-0.2, 0.25, 0],
      size: 6.5, ground: -1.66, minYaw: -0.6, maxYaw: 1.1, minPitch: 0.05, maxPitch: 1.0, minDistance: 13, maxDistance: 30
    });
    /* total sample length = LU × length; conductor radius = RU × √area */
    var LU = 2.0, RU = 0.66, AMAX = 3.6, RMAX = 1.32, JR = 0.25, E = 0.42, PEEL = 0.2;
    var W = makeWire(v.scene, { R: RMAX, J: 0, A: AMAX, X: AMAX, copper: false, a: 0.42, rIon: 0.105, rEl: 0.062, jit: 0.09, margin: 0.75, seed: 31, dark: dark, depthShade: 0.24 });
    var scene = v.scene;
    function add(geo, mat, cast, parent) { var m = new THREE.Mesh(geo, mat); m.castShadow = cast !== false; m.receiveShadow = true; (parent || scene).add(m); return m; }

    /* Unit-size parts, scaled live: PVC cradle in the window, solid copper ends with a
     * short full jacket, and thin insulated leads out to the rest of the circuit */
    var mPvc = K.mat.std(0xD3CFC7, 0.6, 0, { envMapIntensity: 0.38 });
    var mCu = K.mat.copper();
    var cradle = add(revolve([[-1, 1], [1, 1], [1, 1 + JR], [-1, 1 + JR]], Math.PI, TAU, 64), mPvc, true);
    var cuGeo = revolve([[0, 0], [1, 0], [1, 0.97], [0.94, 1], [0.06, 1], [0, 0.97]], 0, TAU, 72);
    var jkGeo = revolve([[0, 1.0], [1, 1.0], [1, 1 + JR - 0.03], [0.93, 1 + JR], [0.07, 1 + JR], [0, 1 + JR - 0.03]], 0, TAU, 72);
    var cuR = add(cuGeo, mCu), cuL = add(cuGeo, mCu);
    var jkR = add(jkGeo, mPvc), jkL = add(jkGeo, mPvc);
    cuL.scale.x = -1; jkL.scale.x = -1;
    var mLead = K.mat.std(0x2E323A, 0.5, 0);
    var leadGeo = revolve([[0, 0], [1, 0], [1, 0.13], [0, 0.13]], 0, TAU, 24);
    var leadR = add(leadGeo, mLead, false), leadL = add(leadGeo, mLead, false);
    leadL.scale.x = -1;
    var kesitRim = new THREE.Mesh(new THREE.TorusGeometry(1, 0.02, 10, 120), K.mat.std(0xC8693A, 0.35, 0.3, { emissive: 0x8A3E16, emissiveIntensity: 0.25 }));
    kesitRim.rotation.y = Math.PI / 2;
    scene.add(kesitRim);
    /* warm interior light: the energy lost in collisions heats the lattice */
    var heatLights = [new THREE.PointLight(0xFF7A30, 0, 3.2, 2), new THREE.PointLight(0xFF7A30, 0, 3.2, 2)];
    heatLights.forEach(function (L) { scene.add(L); });

    /* Collision flashes */
    var flashTex = flashTexture('spark', 'rgba(255,250,232,1)', 'rgba(255,170,84,0.82)');
    var flashes = [];
    for (var f = 0; f < 56; f++) {
      var sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: flashTex, transparent: true, depthWrite: false, opacity: 0, toneMapped: false }));
      sp.visible = false; sp.renderOrder = 5;
      W.group.add(sp);
      flashes.push({ s: sp, age: 9 });
    }
    var flashNext = 0;

    /* Ion lookup by lattice index, for fast nearest-ion queries */
    var ionIdx = {};
    var ax = 2 * AMAX / Math.max(1, Math.round(2 * AMAX / W.a));
    for (var i = 0; i < W.nIon; i++) {
      var ii = Math.round((W.ionB[i * 3] + AMAX) / ax - 0.5), jj = Math.round(W.ionB[i * 3 + 1] / W.a), kk = Math.round(-W.ionB[i * 3 + 2] / W.a);
      ionIdx[ii + ',' + jj + ',' + kk] = i;
    }
    function ionNear(x, y, z) {
      var i0 = Math.round((x + AMAX) / ax - 0.5), j0 = Math.round(y / W.a), k0 = Math.round(-z / W.a);
      var best = -1, bd = 1e9;
      for (var di = -1; di <= 1; di++) for (var dj = -1; dj <= 1; dj++) for (var dk = -1; dk <= 1; dk++) {
        var id = ionIdx[(i0 + di) + ',' + (j0 + dj) + ',' + (k0 + dk)];
        if (id === undefined) continue;
        var ex = W.ionB[id * 3] - x, ey = W.ionB[id * 3 + 1] - y, ez = W.ionB[id * 3 + 2] - z;
        var d = ex * ex + ey * ey + ez * ez;
        if (d < bd) { bd = d; best = id; }
      }
      return best;
    }

    /* Labels */
    var tmpL = new THREE.Vector3();
    var lblKesit = v.label('kesit', { at: function () { tmpL.set(Lh + E, rr * 0.55, rr * 0.55); return tmpL; }, cls: 'name', dx: 34, dy: -70, line: true, align: 'left', valign: 'bottom' });
    var kesitText = '';

    /* State */
    var Lt = 2, At = 2, Lc = 2, Ac = 2, touched = false, D = 0, heat = 0.5, acc = 0;
    var Lh = LU - E, rr = RU * Math.SQRT2;
    var kick = new Float32Array(W.nIon), off = new Float32Array(W.nEl * 3);
    var rng = K.rng(97);
    var col = new THREE.Color(), warm = new THREE.Color(0xFF9A4A);
    var tmp = new THREE.Vector3();
    var home = { yaw: v.view.yaw, pitch: v.view.pitch, distance: v.view.distance, target: v.view.target.toArray() };
    var AUTO = [[2, 2, 4], [4, 2, 5], [2, 2, 2.5], [2, 1, 5], [2, 4, 5], [2, 2, 2.5]], AUTO_T = 24;
    var ionMat = W.ionMesh.material;
    ionMat.emissive = new THREE.Color(0xC8400E);
    ionMat.emissiveIntensity = 0;

    function autoTarget(t) {
      var tau = t % AUTO_T, acc0 = 0;
      for (var q = 0; q < AUTO.length; q++) {
        if (tau < acc0 + AUTO[q][2]) return AUTO[q];
        acc0 += AUTO[q][2];
      }
      return AUTO[0];
    }
    function heatOf(R) { return clamp((Math.log(R) + Math.log(4)) / (2 * Math.log(4)), 0, 1); }
    function fmtR(R) {
      var r2 = Math.round(R * 100) / 100;
      var s = Math.abs(r2 * 10 - Math.round(r2 * 10)) < 1e-9 ? K.num(r2, 1) : K.num(r2, 2);
      return (Math.abs(R - r2) > 1e-9 ? '≈ ' : '') + s;
    }
    function heatWord(R) { return R < 0.75 ? 'az' : R <= 1.5 ? 'orta' : 'çok'; }
    function readLA() { return touched ? [Lt, At] : (function () { var a = autoTarget(tNow); return [a[0], a[1]]; })(); }
    var tNow = 0;

    function reset() {
      Lt = 2; At = 2; Lc = 2; Ac = 2; touched = false; D = 0; heat = heatOf(1); acc = 0; tNow = 0;
      Lh = LU - E; rr = RU * Math.SQRT2; W.snap(Lh, rr);
      kick.fill(0); off.fill(0);
      for (var q = 0; q < flashes.length; q++) { flashes[q].age = 9; flashes[q].s.visible = false; }
      rng = K.rng(97);
      introCam(v, home, 1.07, -0.05, 0.03);
    }
    reset();

    function spawnCollision() {
      var e = -1;
      for (var tries = 0; tries < 10; tries++) {
        var c = Math.floor(rng() * W.nEl);
        var px = W.elPos[c * 3], py = W.elPos[c * 3 + 1], pz = W.elPos[c * 3 + 2];
        if (Math.abs(px) < Lh - 0.2 && Math.sqrt(py * py + pz * pz) < rr - 0.15) { e = c; break; }
      }
      if (e < 0) return;
      var ex = W.elPos[e * 3], ey = W.elPos[e * 3 + 1], ez = W.elPos[e * 3 + 2];
      var ion = ionNear(ex, ey, ez);
      if (ion < 0) return;
      var ix = W.ionB[ion * 3], iy = W.ionB[ion * 3 + 1], iz = W.ionB[ion * 3 + 2];
      var dx = ex - ix, dy = ey - iy, dz = ez - iz, dl = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1;
      dx /= dl; dy /= dl; dz /= dl;
      kick[ion] = 1;
      off[e * 3] += dx * 0.07 - 0.05; off[e * 3 + 1] += dy * 0.07; off[e * 3 + 2] += dz * 0.07;
      var F = flashes[flashNext]; flashNext = (flashNext + 1) % flashes.length;
      F.age = 0; F.s.visible = true;
      F.s.position.set(ix + dx * 0.13, iy + dy * 0.13, iz + dz * 0.13 + 0.04);
    }

    function drawOverlay() {
      var ctx = v.ctx, w = v.w, h = v.h;
      var la = readLA(), R = la[0] / la[1];
      var ink = dark ? P.onNight : P.ink, muted = dark ? P.onNightMuted : P.muted;
      drawReadout(ctx, 30, 40, 'Direnç', fmtR(R).replace('≈ ', ''), 'kat', 'uzunluk ÷ kesit = ' + fmtMin(la[0], 1) + ' ÷ ' + fmtMin(la[1], 1), dark);
      /* heat meter */
      var hw = heatWord(R), lvl = hw === 'az' ? 1 : hw === 'orta' ? 2 : 3;
      var y0 = 128;
      K.label(ctx, 'Isınma', 30, y0, { size: 13, weight: 500, color: muted });
      var cols = ['#E8B48C', '#DC8550', '#C4532A'];
      for (var q = 0; q < 3; q++) {
        ctx.fillStyle = q < lvl ? cols[q] : (dark ? '#262D3B' : '#E3E3DD');
        K.rr(ctx, 84 + q * 30, y0 - 9, 26, 9, 4.5); ctx.fill();
      }
      K.label(ctx, hw, 84 + 3 * 30 + 6, y0, { size: 13, weight: 600, color: ink });
      K.label(ctx, 'aynı akım: ince telde elektronlar daha hızlı', 30, y0 + 20, { size: 12, color: muted });
      /* length dimension in the sample's own plane, with extension lines from both ends */
      var yb = -rr * (1 + JR) - 0.12, yd = Math.min(-1.62, yb - 0.3);
      tmp.set(-Lh - E, yb, 0); var e0 = v.project(tmp);
      tmp.set(Lh + E, yb, 0); var e1 = v.project(tmp);
      tmp.set(-Lh - E, yd, 0); var a0 = v.project(tmp);
      tmp.set(Lh + E, yd, 0); var a1 = v.project(tmp);
      ctx.save();
      ctx.strokeStyle = dark ? P.onNightMuted : P.ink2; ctx.lineWidth = 1; ctx.globalAlpha = 0.8;
      ctx.beginPath(); ctx.moveTo(e0.x, e0.y); ctx.lineTo(a0.x, a0.y + 6); ctx.moveTo(e1.x, e1.y); ctx.lineTo(a1.x, a1.y + 6); ctx.stroke();
      ctx.lineWidth = 1.3; ctx.globalAlpha = 0.9;
      K.arrow(ctx, (a0.x + a1.x) / 2, (a0.y + a1.y) / 2, a0.x, a0.y, { color: dark ? P.onNightMuted : P.ink2, width: 1.3, head: 7 });
      K.arrow(ctx, (a0.x + a1.x) / 2, (a0.y + a1.y) / 2, a1.x, a1.y, { color: dark ? P.onNightMuted : P.ink2, width: 1.3, head: 7 });
      ctx.restore();
      K.label(ctx, 'uzunluk ' + fmtMin(la[0], 1), (a0.x + a1.x) / 2, (a0.y + a1.y) / 2 + 24, { size: 13, weight: 600, color: ink, align: 'center' });
      /* legend + tag */
      drawLegend(ctx, 30, h - 26, dark);
      var lx = 30 + textW(ctx, 'bakır iyonu (Cu+)', 13, 400) + 54 + textW(ctx, 'serbest elektron', 13, 400) + 28;
      K.drawGlow(ctx, '#F08A3A', lx + 6, h - 30, 9, 0.9);
      K.label(ctx, 'çarpışma: enerji ısıya dönüşür', lx + 20, h - 26, { size: 13, color: dark ? P.onNightMuted : P.ink2 });
      drawTag(ctx, 'basitleştirilmiş model', w - 24, 30, 'right');
      drawTag(ctx, 'kayma hızı abartılı gösterilmiştir', w - 24, 47, 'right');
    }

    return {
      reset: reset,
      set: function (key, val) {
        if ((key !== 'length' && key !== 'area') || !isFinite(+val) || val === '' || val === null) return;
        /* first touch: the other slider still shows its default */
        if (!touched) { Lt = 2; At = 2; touched = true; }
        if (key === 'length') Lt = clamp(+val, 1, 4);
        if (key === 'area') At = clamp(+val, 1, 4);
      },
      read: function (key) {
        var la = readLA(), R = la[0] / la[1];
        if (key === 'resistance') return 'Direnç: ' + fmtR(R) + ' kat';
        if (key === 'formula') {
          var r2 = Math.round(R * 100) / 100;
          return 'uzunluk ÷ kesit = ' + fmtMin(la[0], 1) + ' ÷ ' + fmtMin(la[1], 1) + (Math.abs(R - r2) > 1e-9 ? ' ≈ ' : ' = ') + fmtMin(r2, 2);
        }
        if (key === 'heat') return 'Isınma: ' + heatWord(R);
        /* live slider values, so the deck can keep its sliders in sync during the auto loop */
        if (key === 'length') return fmtMin(la[0], 1);
        if (key === 'area') return fmtMin(la[1], 1);
        return '';
      },
      frame: function (t, dt) {
        tNow = t;
        var tg = touched ? [Lt, At] : autoTarget(t);
        Lc = approach(Lc, tg[0], dt, 2.6); Ac = approach(Ac, tg[1], dt, 2.6);
        if (Math.abs(Lc - tg[0]) < 1e-4) Lc = tg[0];
        if (Math.abs(Ac - tg[1]) < 1e-4) Ac = tg[1];
        Lh = LU * Lc / 2 - E; rr = RU * Math.sqrt(Ac);
        var red = K.reducedMotion;
        /* same current through every sample: thinner → faster drift */
        D += 0.34 * (2 / Ac) * (red ? 0.5 : 1) * dt;
        var Rc = Lc / Ac;
        heat = approach(heat, heatOf(Rc), dt, 0.9);
        /* collisions: rate ∝ heat produced (∝ R at the same current) */
        acc += 7.5 * Rc * (red ? 0.4 : 1) * dt;
        var guard = 0;
        while (acc >= 1 && guard++ < 6) { acc -= 1; spawnCollision(); }
        if (acc > 1) acc = 1;
        var q;
        for (q = 0; q < W.nIon; q++) kick[q] *= Math.exp(-dt / 0.55);
        var dec = Math.exp(-dt / 0.14);
        for (q = 0; q < off.length; q++) off[q] *= dec;
        W.update(t, D, { vib: 0.01 + 0.02 * heat, kick: kick, kickAmp: 0.05, off: off, maskA: Lh, maskR: rr, jit: red ? 0.35 : 1, jrate: red ? 0.4 : 1, dt: dt });
        /* warm tint: global heat glow plus a brief glow on struck ions */
        ionMat.emissiveIntensity = 0.34 * Math.pow(heat, 1.8);
        for (q = 0; q < 2; q++) {
          heatLights[q].position.set((q ? 0.5 : -0.5) * Lh, 0.1, 0.55);
          heatLights[q].distance = 1.6 + rr * 1.8;
          heatLights[q].intensity = 3.4 * Math.pow(heat, 2.2) * (0.6 + 0.4 * Math.min(1, Lh / 1.5));
        }
        for (q = 0; q < W.nIon; q++) {
          var s = W.ionShade[q], k = kick[q] * 0.75, hw2 = 0.22 * heat * heat;
          col.setRGB(s * (1 + hw2 * 0.1) + (warm.r - s) * k, s * (1 - hw2 * 0.25) + (warm.g - s) * k, s * (1 - hw2 * 0.6) + (warm.b - s) * k);
          W.ionMesh.setColorAt(q, col);
        }
        W.ionMesh.instanceColor.needsUpdate = true;
        /* geometry follows the sliders */
        cradle.scale.set(Lh, rr, rr);
        cuR.position.x = Lh; cuL.position.x = -Lh;
        cuR.scale.set(E, rr - 0.004, rr - 0.004); cuL.scale.set(-E, rr - 0.004, rr - 0.004);
        jkR.position.x = Lh + PEEL; jkL.position.x = -Lh - PEEL;
        jkR.scale.set(E - PEEL, rr, rr); jkL.scale.set(-(E - PEEL), rr, rr);
        leadR.position.x = Lh + E - 0.02; leadL.position.x = -Lh - E + 0.02;
        leadR.scale.x = 12 - Lh; leadL.scale.x = -(12 - Lh);
        kesitRim.position.x = Lh + E + 0.003; kesitRim.scale.set(rr * 0.985, rr * 0.985, rr * 0.985);
        var kt = 'kesit ' + fmtMin(readLA()[1], 1);
        if (kt !== kesitText) { lblKesit.set(kt); kesitText = kt; }
        for (q = 0; q < flashes.length; q++) {
          var F = flashes[q];
          if (F.age > 1) continue;
          F.age += dt;
          var kf = F.age / 0.5;
          if (kf >= 1) { F.s.visible = false; F.age = 9; continue; }
          var sc = 0.26 + 0.36 * K.ease.out(Math.min(1, kf * 2));
          F.s.scale.set(sc, sc, sc);
          F.s.material.opacity = 0.95 * (1 - kf) * (1 - kf);
        }
        v.render(dt);
        if (!K.skipRender) { fadeEdges(v.ctx, v.w, v.h, 48); drawOverlay(); }
      },
      dispose: function () { v.dispose(); }
    };
  });

  /* ------------------------------------------------------------------ */
  /* Shared small objects for the circuit band visuals                    */
  /* ------------------------------------------------------------------ */

  /* 9 V battery (48,5 × 26,5 × 17,5 mm proportions), standing, with a snap clip on top.
   * Returns {group, red: [x,y,z] lead exit (+), black: lead exit (−)} in group space. */
  function make9V(s) {
    var THREE = window.THREE;
    var g = new THREE.Group();
    var w = 26.5 * s, h = 48.5 * s, d = 17.5 * s;
    var body = new THREE.Mesh(roundedBox(w, h, d, 2.2 * s, 0.9 * s), K.mat.std(0x2A2E36, 0.42, 0.1));
    body.position.y = h / 2; body.castShadow = true; body.receiveShadow = true;
    g.add(body);
    function paint(c, W, H) {
      c.clearRect(0, 0, W, H);
      c.fillStyle = '#2A2E36'; c.fillRect(0, 0, W, H);
      c.fillStyle = '#C8693A'; c.fillRect(0, 0, W, 64);
      c.fillStyle = '#F4F2EC'; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.font = '600 112px ' + K.fonts.mono; c.fillText('9\u2009V', W / 2, 210);
      c.font = '500 26px ' + K.fonts.sans; c.fillStyle = '#B9BCC4'; c.fillText('alkalin pil', W / 2, 300);
      c.font = '600 40px ' + K.fonts.sans; c.fillStyle = '#FFFFFF';
      c.fillText('+', 62, 33); c.fillText('−', W - 62, 33);
    }
    var tex = K.textTexture(256, 400, paint);
    var fontOk = !!(document.fonts && document.fonts.check && document.fonts.check('600 40px "IBM Plex Mono"'));
    var label = new THREE.Mesh(new THREE.PlaneGeometry(w - 2.6 * s, h - 9 * s), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.45, metalness: 0.05 }));
    label.position.set(0, h / 2 - 2.5 * s, d / 2 + 0.002);
    label.receiveShadow = true;
    g.add(label);
    var clip = new THREE.Mesh(roundedBox(w * 0.86, 5.5 * s, d * 0.82, 1.6 * s, 0.7 * s), K.mat.plasticBlack({ roughness: 0.45 }));
    clip.position.y = h + 2.2 * s; clip.castShadow = true;
    g.add(clip);
    return {
      group: g, h: h, w: w, d: d, red: [w * 0.43, h + 2.4 * s, 2.6 * s], black: [w * 0.43, h + 2.4 * s, -2.6 * s],
      /* repaint the printed label once the deck fonts have loaded */
      refresh: function () {
        if (fontOk || !document.fonts || !document.fonts.check || !document.fonts.check('600 40px "IBM Plex Mono"')) return;
        fontOk = true;
        var c = tex.image.getContext('2d');
        paint(c, tex.image.width, tex.image.height);
        tex.needsUpdate = true;
      }
    };
  }

  /* Toggle switch on a small base; returns {group, lever pivot, left/right terminal points} */
  function makeToggle(s) {
    var THREE = window.THREE;
    var g = new THREE.Group();
    var base = new THREE.Mesh(roundedBox(1.6 * s, 0.5 * s, 1.0 * s, 0.14 * s, 0.05 * s), K.mat.std(0x2E323A, 0.5, 0));
    base.position.y = 0.25 * s; base.castShadow = true; base.receiveShadow = true;
    g.add(base);
    var steel = K.mat.steel({ roughness: 0.22 });
    var nut = new THREE.Mesh(new THREE.CylinderGeometry(0.27 * s, 0.27 * s, 0.09 * s, 6), steel);
    nut.position.y = 0.545 * s; nut.castShadow = true; g.add(nut);
    var bush = new THREE.Mesh(new THREE.CylinderGeometry(0.17 * s, 0.17 * s, 0.26 * s, 28), steel);
    bush.position.y = 0.68 * s; bush.castShadow = true; g.add(bush);
    var pivot = new THREE.Group();
    pivot.position.y = 0.78 * s;
    g.add(pivot);
    var lever = new THREE.Mesh(new THREE.CylinderGeometry(0.05 * s, 0.075 * s, 0.82 * s, 20), steel);
    lever.position.y = 0.41 * s; lever.castShadow = true;
    pivot.add(lever);
    var tip = new THREE.Mesh(new THREE.SphereGeometry(0.06 * s, 16, 12), steel);
    tip.position.y = 0.82 * s; pivot.add(tip);
    var brass = K.mat.std(0xC9A44E, 0.3, 1);
    [-1, 1].forEach(function (k) {
      var lug = new THREE.Mesh(new THREE.CylinderGeometry(0.1 * s, 0.1 * s, 0.08 * s, 16), brass);
      lug.position.set(k * 0.6 * s, 0.53 * s, 0); g.add(lug);
    });
    return { group: g, pivot: pivot, left: [-0.6 * s, 0.56 * s, 0], right: [0.6 * s, 0.56 * s, 0] };
  }

  /* Miniature filament bulb in a socket on a small base */
  function makeBulb(s, dark) {
    var THREE = window.THREE;
    var g = new THREE.Group();
    var base = new THREE.Mesh(roundedBox(1.5 * s, 0.36 * s, 1.1 * s, 0.14 * s, 0.05 * s), K.mat.std(0x2E323A, 0.5, 0));
    base.position.y = 0.18 * s; base.castShadow = true; base.receiveShadow = true; g.add(base);
    var socket = new THREE.Mesh(new THREE.LatheGeometry([
      new THREE.Vector2(0.0, 0.36 * s), new THREE.Vector2(0.36 * s, 0.36 * s), new THREE.Vector2(0.37 * s, 0.4 * s), new THREE.Vector2(0.34 * s, 0.86 * s),
      new THREE.Vector2(0.31 * s, 0.9 * s), new THREE.Vector2(0.0, 0.9 * s)], 40), K.mat.plasticBlack({ roughness: 0.4 }));
    socket.castShadow = true; g.add(socket);
    var nickel = K.mat.std(0xC8CBD0, 0.28, 1);
    var screw = new THREE.Mesh(new THREE.CylinderGeometry(0.265 * s, 0.265 * s, 0.2 * s, 32), nickel);
    screw.position.y = 0.98 * s; g.add(screw);
    for (var r = 0; r < 2; r++) {
      var ring = new THREE.Mesh(new THREE.TorusGeometry(0.268 * s, 0.022 * s, 8, 40), nickel);
      ring.rotation.x = Math.PI / 2; ring.position.y = (0.93 + r * 0.08) * s; g.add(ring);
    }
    var gp = [[0.24, 1.06], [0.25, 1.18], [0.3, 1.3], [0.45, 1.46], [0.57, 1.66], [0.62, 1.88], [0.6, 2.08], [0.5, 2.3], [0.32, 2.46], [0.12, 2.53], [0.0, 2.545]];
    var glassMat = new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.06, metalness: 0, transparent: true, opacity: 0.2, envMapIntensity: 1.4, clearcoat: 1, clearcoatRoughness: 0.05, depthWrite: false, side: THREE.DoubleSide });
    var glass = new THREE.Mesh(new THREE.LatheGeometry(gp.map(function (p) { return new THREE.Vector2(p[0] * s, p[1] * s); }), 48), glassMat);
    glass.renderOrder = 6;
    g.add(glass);
    var wireMat = K.mat.std(0x8E9198, 0.35, 1);
    [-1, 1].forEach(function (k) {
      var sup = K.wire([[k * 0.1 * s, 1.08 * s, 0], [k * 0.12 * s, 1.5 * s, 0], [k * 0.17 * s, 1.86 * s, 0]], { radius: 0.012 * s, material: wireMat, castShadow: false });
      g.add(sup);
    });
    var pts = [];
    for (var q = 0; q <= 160; q++) {
      var u = q / 160, a = u * 8 * TAU;
      pts.push(new THREE.Vector3((-0.17 + 0.34 * u) * s, 1.88 * s + Math.cos(a) * 0.04 * s, Math.sin(a) * 0.04 * s));
    }
    var filMat = K.mat.std(0x6E6A64, 0.4, 0.6, { emissive: 0xFFB24A, emissiveIntensity: 0 });
    var fil = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 320, 0.009 * s, 6, false), filMat);
    g.add(fil);
    var glowTex = flashTexture('lamp', 'rgba(255,236,190,1)', 'rgba(242,196,107,0.55)');
    var glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, transparent: true, depthWrite: false, opacity: 0, toneMapped: false }));
    glow.position.set(0, 1.88 * s, 0); glow.scale.set(3.2 * s, 3.2 * s, 1); glow.renderOrder = 7;
    g.add(glow);
    var light = new THREE.PointLight(0xFFC46B, 0, 7 * s, 2);
    light.position.set(0, 1.88 * s, 0.25 * s);
    g.add(light);
    return {
      group: g, terminal: [0.62 * s, 0.4 * s, 0.25 * s], terminal2: [0.62 * s, 0.4 * s, -0.25 * s],
      set: function (k) {
        filMat.emissiveIntensity = 3.2 * k;
        filMat.color.setRGB(0.43 + 0.5 * k, 0.42 + 0.3 * k, 0.4);
        glow.material.opacity = 0.95 * k;
        light.intensity = 2.2 * k;
        glassMat.opacity = 0.2 + 0.12 * k;
        glassMat.emissive = glassMat.emissive || new THREE.Color();
        glassMat.emissive.setRGB(1, 0.78, 0.45); glassMat.emissiveIntensity = 0.35 * k;
      }
    };
  }

  /* Energy front: a soft halo around the cable with a bright travelling band (shader) */
  function makeEnergyHalo(radius, length) {
    var THREE = window.THREE;
    var mat = new THREE.ShaderMaterial({
      uniforms: { uFront: { value: -99 }, uStart: { value: -99 }, uBand: { value: 0 }, uFill: { value: 0.2 }, uColor: { value: new THREE.Color(0xF2B347) }, uOpacity: { value: 1 } },
      vertexShader: [
        'varying float vAxis; varying vec3 vN; varying vec3 vV;',
        'void main() {',
        '  vAxis = position.y;',
        '  vec4 mv = modelViewMatrix * vec4(position, 1.0);',
        '  vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz);',
        '  gl_Position = projectionMatrix * mv;',
        '}'].join('\n'),
      fragmentShader: [
        'uniform float uFront; uniform float uStart; uniform float uBand; uniform float uFill; uniform vec3 uColor; uniform float uOpacity;',
        'varying float vAxis; varying vec3 vN; varying vec3 vV;',
        'void main() {',
        '  float inside = smoothstep(uStart - 0.35, uStart + 0.35, vAxis) * (1.0 - smoothstep(uFront - 0.35, uFront + 0.35, vAxis));',
        '  float d = vAxis - uFront;',
        '  float band = exp(-d * d / 0.45) * uBand;',
        '  float rim = pow(1.0 - abs(dot(normalize(vN), normalize(vV))), 1.5);',
        '  float a = (band * 0.62 + inside * uFill) * (0.5 + 0.5 * rim) * uOpacity;',
        '  gl_FragColor = vec4(uColor * (1.0 + band * 0.25), a);',
        '}'].join('\n'),
      transparent: true, depthWrite: false, side: THREE.DoubleSide
    });
    var mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, length, 64, 1, true), mat);
    mesh.rotation.z = -Math.PI / 2;
    mesh.renderOrder = 8;
    return { mesh: mesh, u: mat.uniforms };
  }

  /* ================================================================== */
  /* drift-signal · W 1120×300 · Elektrik nasıl yol alır                 */
  /* ================================================================== */
  K.register('drift-signal', function (el, opts) {
    var THREE = window.THREE;
    var theme = opts.theme || 'light', dark = theme === 'dark';
    var v = K.stage3d(el, {
      theme: theme, fov: 20, yaw: 0, pitch: 0.2, distance: 24.5, target: [-0.3, 2.05, 0],
      size: 11, ground: 0, minYaw: -0.45, maxYaw: 0.45, minPitch: 0.02, maxPitch: 0.7, minDistance: 24, maxDistance: 44
    });
    var scene = v.scene;
    var CX = 0.6, CH = 8.9, R = 0.95, J = 0.22, RJ = R + J;
    var W = makeWire(scene, { R: R, J: J, A: CH - 0.75, peel: 0.3, X: CH, a: 0.42, rIon: 0.105, rEl: 0.062, jit: 0.085, tilt: 0.12, pos: [CX, RJ, 0], seed: 41, dark: dark, depthShade: 0.26, ionDetail: 1 });

    /* battery, switch, bulb */
    var bat = make9V(0.056);
    bat.group.position.set(-13.0, 0, 0.1);
    scene.add(bat.group);
    var sw = makeToggle(1.0);
    sw.group.position.set(-10.55, 0, 0.2);
    scene.add(sw.group);
    var bulb = makeBulb(1.32, dark);
    bulb.group.position.set(12.25, 0, 0);
    scene.add(bulb.group);

    /* leads */
    function P3(g, p) { return new THREE.Vector3(p[0], p[1], p[2]).applyMatrix4(g.matrixWorld); }
    scene.updateMatrixWorld(true);
    var mRed = K.mat.std(0xB3352A, 0.45, 0), mBlack = K.mat.std(0x23262D, 0.45, 0);
    var bRed = P3(bat.group, bat.red), bBlack = P3(bat.group, bat.black);
    var sL = P3(sw.group, sw.left), sR = P3(sw.group, sw.right);
    var cL = new THREE.Vector3(CX - CH - 0.05, RJ, 0), cR = new THREE.Vector3(CX + CH + 0.05, RJ, 0);
    var bT = P3(bulb.group, bulb.terminal), bT2 = P3(bulb.group, bulb.terminal2);
    scene.add(K.wire([bRed, [bRed.x + 0.5, bRed.y - 0.1, bRed.z + 0.2], [sL.x - 0.5, 0.8, 0.5], [sL.x, sL.y + 0.05, sL.z]], { radius: 0.07, material: mRed }));
    scene.add(K.wire([[sR.x, sR.y + 0.05, sR.z], [sR.x + 0.45, 0.75, 0.35], [cL.x - 0.55, cL.y - 0.25, 0.1], cL], { radius: 0.07, material: mRed }));
    scene.add(K.wire([cR, [cR.x + 0.55, cR.y - 0.3, 0.1], [bT.x - 0.4, 0.55, 0.4], bT], { radius: 0.07, material: mRed }));
    scene.add(K.wire([bT2, [bT2.x - 0.5, 0.25, -0.9], [CX + 6, 0.12, -1.75], [CX - 6, 0.12, -1.75], [bBlack.x + 1.3, 0.25, -1.1], [bBlack.x + 0.45, bBlack.y - 0.3, bBlack.z - 0.2], bBlack], { radius: 0.07, material: mBlack, segments: 240 }));
    /* copper end discs where the leads join the conductor */
    var stub = new THREE.MeshStandardMaterial({ color: 0xD08A5C, roughness: 0.3, metalness: 1 });
    [cL, cR].forEach(function (p, k) {
      var m = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.12, 24), stub);
      m.rotation.z = Math.PI / 2; m.position.copy(p); m.position.x += k ? -0.04 : 0.04; scene.add(m);
    });

    /* energy halo around the cable */
    var halo = makeEnergyHalo(RJ + 0.1, 2 * CH + 0.2);
    halo.mesh.position.set(CX, RJ, 0);
    scene.add(halo.mesh);
    var xL = -CH - 0.1, xR = CH + 0.1;   /* halo axis coordinates of the cable ends */

    /* labels */
    var lblBat = v.label('9 V pil', { at: [-13.0, 3.05, 0], cls: 'note', dx: 0, dy: -14 });
    var lblSw = v.label('anahtar açık: devre kesik', { at: [-10.55, 0, 0.9], cls: 'note', dx: 0, dy: 22 });
    var lblBulb = v.label('ampul', { at: [12.25, 3.45, 0], cls: 'note', dx: 0, dy: -12 });

    /* State: phase machine driven by the switch */
    var touched = false, closed = false, tClose = -1, tOpen = -1, frozen = 0, lever = 0, lit = 0, swText = '';
    var tmp = new THREE.Vector3();
    var home = { yaw: v.view.yaw, pitch: v.view.pitch, distance: v.view.distance, target: v.view.target.toArray() };
    var AUTO = 12, CLOSE_AT = 1.0, OPEN_AFTER = 8;
    var tNow = 0;

    function elapsed() {
      if (closed) return Math.max(0, tNow - tClose);
      return frozen;
    }
    function shown() { return Math.floor(elapsed() * 10 + 1e-6) / 10; }
    function reset() {
      touched = false; closed = false; tClose = -1; tOpen = -1; frozen = 0; lever = 0; lit = 0; tNow = 0;
      introCam(v, home, 1.04, 0, 0.02);
    }
    reset();
    function doClose(t) { if (!closed) { closed = true; tClose = t; tOpen = -1; frozen = 0; } }
    function doOpen(t) { if (closed) { frozen = Math.max(0, t - tClose); closed = false; tOpen = t; } }

    function drawOverlay() {
      var ctx = v.ctx, w = v.w, h = v.h;
      var ink = dark ? P.onNight : P.ink, muted = dark ? P.onNightMuted : P.muted;
      var td = shown(), alpha = closed || td === 0 ? 1 : 0.55;
      var cols = [
        ['Geçen süre', K.num(td, 1) + ' s'],
        ['Elektronların yolu', K.num(0.05 * td, 2) + ' mm'],
        ['Enerjinin alabileceği yol', K.num(200000 * td, 0) + ' km']
      ];
      var xs = [262, 498, 760];
      for (var q = 0; q < 3; q++) {
        K.label(ctx, cols[q][0], xs[q], 30, { size: 13, weight: 500, color: muted, alpha: alpha });
        K.label(ctx, cols[q][1], xs[q], 62, { size: 27, weight: 500, mono: true, color: q === 1 ? '#2343B0' : q === 2 ? '#A64B22' : ink, alpha: alpha });
      }
      K.label(ctx, '0,05 mm/s × t  (≈ 18 cm/saat)', xs[1], 82, { size: 11, mono: true, color: muted, alpha: alpha });
      K.label(ctx, '200.000 km/s × t', xs[2], 82, { size: 11, mono: true, color: muted, alpha: alpha });
      if (200000 * td >= 384400) {
        var tw = textW(ctx, "Ay'ın uzaklığını geçti", 13, 500) + 20, mx = xs[2] + textW(ctx, cols[2][1], 27, 500, true) + 16, my = 44;
        if (mx + tw > w - 8) { mx = xs[2]; my = 92; }
        ctx.save(); ctx.globalAlpha *= alpha;
        ctx.fillStyle = dark ? 'rgba(14,18,26,.85)' : 'rgba(255,255,255,.92)';
        ctx.strokeStyle = dark ? '#262D3B' : '#E3E3DD'; ctx.lineWidth = 1;
        K.rr(ctx, mx, my, tw, 24, 6); ctx.fill(); ctx.stroke();
        K.label(ctx, "Ay'ın uzaklığını geçti", mx + 10, my + 17, { size: 13, weight: 500, color: ink });
        ctx.restore();
      }
      /* tags under the cable */
      tmp.set(CX - CH + 1.4, 0, 1.2); var pa = v.project(tmp);
      tmp.set(CX + CH - 0.2, 0, 1.2); var pb = v.project(tmp);
      drawTag(ctx, 'Enerji cephesi: 100 milyon kat yavaşlatılmış', pa.x, h - 32, 'left', P.copper);
      drawTag(ctx, 'Elektronların ilerleyişi: gerçek hızda, durmuş gibi', pb.x, h - 13, 'right', P.blue);
    }

    return {
      reset: reset,
      set: function (key, val) {
        if (key !== 'switch') return;
        if (!touched) { touched = true; if (closed) doOpen(tNow); }
        if (val === 'kapali') doClose(tNow); else if (val === 'acik') doOpen(tNow);
      },
      read: function (key) {
        var td = shown();
        if (key === 'elapsed') return 'Geçen süre: ' + K.num(td, 1) + ' s';
        if (key === 'electron') return 'Elektronların yolu: ' + K.num(0.05 * td, 2) + ' mm';
        if (key === 'energy') return 'Enerjinin alabileceği yol: ' + K.num(200000 * td, 0) + ' km';
        if (key === 'switch') return closed ? 'Anahtar kapalı: devre tamam' : 'Anahtar açık: devre kesik';
        return '';
      },
      frame: function (t, dt) {
        tNow = t;
        bat.refresh();
        if (!touched) {
          var c = t % AUTO, cyc = Math.floor(t / AUTO);
          var tc = cyc * AUTO + CLOSE_AT;
          if (c >= CLOSE_AT && c < CLOSE_AT + OPEN_AFTER) { if (!closed || tClose !== tc) { closed = true; tClose = tc; frozen = 0; tOpen = -1; } }
          else if (c >= CLOSE_AT + OPEN_AFTER) { if (closed) { frozen = OPEN_AFTER; closed = false; tOpen = tc + OPEN_AFTER; } }
          else { if (closed || frozen) { closed = false; frozen = 0; tOpen = -1; } }
          /* counters fade back to zero just before the next cycle */
        }
        /* switch lever */
        lever = approach(lever, closed ? 1 : 0, dt, 14);
        sw.pivot.rotation.z = lerp(0.42, -0.42, lever);
        var st = closed ? 'anahtar kapalı: devre tamam' : 'anahtar açık: devre kesik';
        if (st !== swText) { lblSw.set(st); swText = st; }
        /* energy front: sweeps the cable in 0,6 s after closing; a dark front after opening */
        var sweep = 0.6;
        if (closed) {
          var k = clamp((t - tClose) / sweep, 0, 1);
          halo.u.uStart.value = xL;
          halo.u.uFront.value = lerp(xL, xR + 0.6, k);
          halo.u.uBand.value = k < 1 ? 1 : Math.max(0, 1 - (t - tClose - sweep) / 0.35);
          halo.u.uFill.value = 0.15;
        } else if (tOpen >= 0) {
          var k2 = clamp((t - tOpen) / sweep, 0, 1);
          halo.u.uStart.value = lerp(xL - 0.6, xR + 0.6, k2);
          halo.u.uFront.value = xR + 0.6;
          halo.u.uBand.value = 0;
          halo.u.uFill.value = 0.15;
        } else {
          halo.u.uStart.value = xR + 1; halo.u.uFront.value = xL - 1; halo.u.uBand.value = 0;
        }
        /* bulb: lights when the front arrives, goes dark when the dark front arrives */
        var on = closed ? (t - tClose >= sweep) : (tOpen >= 0 && t - tOpen < sweep && frozen > sweep);
        lit = approach(lit, on ? 1 : 0, dt, on ? 16 : 7);
        bulb.set(lit);
        /* electrons: real drift (0,05 mm/s on a cable ≈ 1,2 m long) is invisible here */
        var D = closed ? 0.05e-3 * (t - tClose) * (2 * CH / 1.2) : 0;
        W.update(t, D, { jit: K.reducedMotion ? 0.35 : 1, jrate: K.reducedMotion ? 0.4 : 1 });
        v.render(dt);
        if (!K.skipRender) drawOverlay();
      },
      dispose: function () { v.dispose(); }
    };
  });

  /* ================================================================== */
  /* dc-ac · W 1120×380 · Doğru akım ve alternatif akım                  */
  /* ================================================================== */
  K.register('dc-ac', function (el, opts) {
    var THREE = window.THREE;
    var theme = opts.theme || 'light', dark = theme === 'dark';
    var v = K.stage3d(el, {
      theme: theme, fov: 20, yaw: 0, pitch: 0.22, distance: 24, target: [0, 1.25, 0],
      size: 9, ground: -1.26, minYaw: -0.35, maxYaw: 0.35, minPitch: 0.05, maxPitch: 0.6, minDistance: 19, maxDistance: 32
    });
    var scene = v.scene;
    var XC = 5.95, R = 1.0, J = 0.24, A = 3.78;
    var wires = [-1, 1].map(function (s, k) {
      return makeWire(scene, { R: R, J: J, A: A, peel: 0.32, X: A + 0.95, a: 0.42, rIon: 0.105, rEl: 0.062, jit: 0.085, tilt: 0.2, pos: [s * XC, 0, 0], seed: 51 + k * 7, dark: dark, depthShade: 0.26 });
    });
    var Wdc = wires[0], Wac = wires[1];
    var tracers = [Wdc.nearestElectron(-1.2, -0.3, -0.2), Wac.nearestElectron(-0.6, -0.3, -0.2)];
    var trails = [makeTrail(120), makeTrail(120)];
    var trailLast = [0, 0];

    /* State */
    var mode = 'both', dimDC = 0, dimAC = 0, Ddc = 0, sweepStart = 0, refX = 0;
    var tmp = new THREE.Vector3(), tmp2 = new THREE.Vector3();
    var home = { yaw: v.view.yaw, pitch: v.view.pitch, distance: v.view.distance, target: v.view.target.toArray() };
    var VDC = 0.55, AAC = 0.42, SWEEP = 3;  /* visual units; AC slowed to 1 Hz; graph shows 3 periods */
    var tNow = 0;

    /* dim a wire by fading its materials toward the slide background (stays opaque) */
    var bgCol = new THREE.Color(dark ? 0x0E121A : 0xF5F5F1);
    function setDim(W, d) {
      for (var q = 0; q < W.mats.length; q++) {
        var m = W.mats[q], u = m.userData;
        if (!u.c0) { u.c0 = m.color.clone(); u.m0 = m.metalness; u.r0 = m.roughness; u.e0 = m.emissiveIntensity || 0; u.v0 = m.envMapIntensity === undefined ? 1 : m.envMapIntensity; }
        var k = 0.74 * d;
        m.color.copy(u.c0).lerp(bgCol, k);
        m.metalness = u.m0 * (1 - d);
        m.roughness = u.r0 + (0.7 - u.r0) * d;
        if (m.emissiveIntensity !== undefined) m.emissiveIntensity = u.e0 * (1 - d);
        m.envMapIntensity = u.v0 * (1 - 0.6 * d);
      }
    }
    function reset() {
      mode = 'both'; dimDC = 0; dimAC = 0; Ddc = 0; tNow = 0; sweepStart = 0;
      trails[0].clear(); trails[1].clear();
      setDim(Wdc, 0); setDim(Wac, 0);
      introCam(v, home, 1.03, 0, 0.015);
    }
    reset();

    /* graph card */
    function drawGraph(ctx, x0, w, ac, tau, alpha) {
      var ink = dark ? P.onNight : P.ink, muted = dark ? P.onNightMuted : P.muted;
      ctx.save();
      ctx.globalAlpha *= alpha;
      var y0 = 42, h = 120;
      K.label(ctx, ac ? 'Alternatif akım (AC)' : 'Doğru akım (DC)', x0, 30, { size: 15, weight: 600, color: ink });
      K.label(ctx, ac ? 'tepe ≈ 325 V · kesikli çizgi: etkin 230 V' : 'gerilim sabit · yön hep aynı', x0 + w, 30, { size: 12, mono: ac, color: muted, align: 'right' });
      ctx.fillStyle = dark ? '#161B26' : '#FFFFFF';
      ctx.strokeStyle = dark ? '#262D3B' : '#E3E3DD'; ctx.lineWidth = 1;
      K.rr(ctx, x0 + 0.5, y0 + 0.5, w - 1, h - 1, 10); ctx.fill(); ctx.stroke();
      var px0 = x0 + 62, px1 = x0 + w - 16, pw = px1 - px0;
      var ymid = y0 + 61, amp = 31;
      /* grid: one period per division (20 ms real) */
      ctx.strokeStyle = dark ? '#262D3B' : '#ECECE6'; ctx.lineWidth = 1;
      for (var q = 1; q <= 3; q++) {
        var gx = Math.round(px0 + pw * q / 3) + 0.5;
        ctx.beginPath(); ctx.moveTo(gx, y0 + 24); ctx.lineTo(gx, y0 + h - 22); ctx.stroke();
        K.label(ctx, (20 * q) + ' ms', q === 3 ? gx - 2 : gx, y0 + h - 8, { size: 11, mono: true, color: muted, align: q === 3 ? 'right' : 'center' });
      }
      K.label(ctx, '0', px0, y0 + h - 8, { size: 11, mono: true, color: muted, align: 'center' });
      /* zero line and y labels */
      ctx.strokeStyle = dark ? '#3A4252' : '#C9C9C2';
      ctx.beginPath(); ctx.moveTo(px0, Math.round(ymid) + 0.5); ctx.lineTo(px1, Math.round(ymid) + 0.5); ctx.stroke();
      K.label(ctx, '0', px0 - 10, ymid + 4, { size: 11, mono: true, color: muted, align: 'right' });
      if (ac) {
        K.label(ctx, '+325 V', px0 - 10, ymid - amp + 4, { size: 11, mono: true, color: muted, align: 'right' });
        K.label(ctx, '−325 V', px0 - 10, ymid + amp + 4, { size: 11, mono: true, color: muted, align: 'right' });
        ctx.save(); ctx.setLineDash([3, 4]); ctx.strokeStyle = dark ? '#4A5366' : '#C9C9C2';
        var ry = amp * 230 / 325;
        ctx.beginPath(); ctx.moveTo(px0, ymid - ry); ctx.lineTo(px1, ymid - ry); ctx.moveTo(px0, ymid + ry); ctx.lineTo(px1, ymid + ry); ctx.stroke();
        ctx.restore();
        K.label(ctx, 'etkin 230 V', px1 - 4, ymid - ry - 4, { size: 10, mono: true, color: muted, align: 'right' });
      } else {
        K.label(ctx, '+V', px0 - 10, ymid - amp + 4, { size: 11, mono: true, color: muted, align: 'right' });
      }
      /* trace: the swept part solid, the rest faint */
      var cur = (tau % SWEEP) / SWEEP;
      function yAt(u) { return ac ? ymid - amp * Math.sin(TAU * 3 * u) : ymid - amp; }
      function path(u0, u1) {
        ctx.beginPath();
        var n = Math.max(2, Math.ceil((u1 - u0) * 240));
        for (var s = 0; s <= n; s++) { var u = u0 + (u1 - u0) * s / n; var X = px0 + pw * u, Y = yAt(u); if (s) ctx.lineTo(X, Y); else ctx.moveTo(X, Y); }
        ctx.stroke();
      }
      ctx.lineJoin = 'round'; ctx.lineCap = 'round';
      ctx.strokeStyle = ink; ctx.lineWidth = 2;
      ctx.globalAlpha *= 0.25; path(cur, 1); ctx.globalAlpha /= 0.25;
      path(0, cur);
      /* "şimdi" cursor */
      var fadeC = clamp(Math.min((tau % SWEEP) / 0.12, (SWEEP - tau % SWEEP) / 0.12), 0, 1);
      var cx = px0 + pw * cur, cy = yAt(cur);
      ctx.save(); ctx.globalAlpha *= fadeC;
      ctx.strokeStyle = P.copperFill; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.moveTo(Math.round(cx) + 0.5, y0 + 22); ctx.lineTo(Math.round(cx) + 0.5, y0 + h - 22); ctx.stroke();
      ctx.fillStyle = P.copperFill; ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(cx, cy, 5, 0, TAU); ctx.fill(); ctx.stroke();
      K.label(ctx, 'şimdi', cx, y0 + 16, { size: 11, weight: 600, color: P.copper, align: 'center' });
      ctx.restore();
      ctx.restore();
    }

    function drawWireMarks(ctx, W, idx, ac, tau, alpha) {
      var muted = dark ? P.onNightMuted : P.muted;
      ctx.save(); ctx.globalAlpha *= alpha;
      /* polarity badges at the wire ends: fixed for DC, flipping for AC */
      var s = ac ? Math.sin(TAU * tau) : 1, k = ac ? Math.min(1, Math.abs(s) * 1.6) : 1;
      var pL = v.project(W.toWorld(-W.X + 0.36, 0.05, R + J, tmp)), pR = v.project(W.toWorld(W.X - 0.36, 0.05, R + J, tmp));
      if (k > 0.03) {
        ctx.save(); ctx.translate(pL.x, pL.y); ctx.scale(k, k); drawBadge(ctx, 0, 0, s >= 0 ? -1 : 1); ctx.restore();
        ctx.save(); ctx.translate(pR.x, pR.y); ctx.scale(k, k); drawBadge(ctx, 0, 0, s >= 0 ? 1 : -1); ctx.restore();
      }
      /* tracked electron: ring, trail and its displacement from the reference mark */
      trails[idx].draw(ctx, v, '#2848C8', 1.5, 0.65);
      var lx = W.elPos[tracers[idx] * 3];
      if (Math.abs(lx) < W.A - 0.1) {
        var tp = v.project(W.elWorld(tracers[idx], tmp));
        ctx.strokeStyle = K.rgba('#2848C8', 0.9); ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(tp.x, tp.y, 9, 0, TAU); ctx.stroke();
      }
      ctx.restore();
    }

    return {
      reset: reset,
      set: function (key, val) {
        if (key === 'mode' && (val === 'dc' || val === 'ac' || val === 'both')) mode = val;
      },
      read: function (key) {
        if (key === 'freq') return '50 Hz: saniyede 50 tam salınım × 2 = 100 yön değişimi';
        if (key === 'dc') return 'Doğru akım: elektronlar hep aynı yöne kayar';
        if (key === 'ac') return 'Alternatif akım: elektronlar ileri geri salınır, net yer değiştirme sıfır';
        return '';
      },
      frame: function (t, dt) {
        tNow = t;
        var red = K.reducedMotion;
        var tau = red ? t * 0.5 : t;    /* visual time (AC at 1 Hz) */
        dimDC = approach(dimDC, mode === 'ac' ? 1 : 0, dt, 5);
        dimAC = approach(dimAC, mode === 'dc' ? 1 : 0, dt, 5);
        setDim(Wdc, dimDC); setDim(Wac, dimAC);
        Ddc += VDC * (red ? 0.5 : 1) * dt;
        var Xac = -AAC * Math.cos(TAU * tau);
        var jp = { jit: red ? 0.35 : 1, jrate: red ? 0.4 : 1 };
        Wdc.update(t, Ddc, jp);
        Wac.update(t, Xac, jp);
        [Wdc, Wac].forEach(function (W, i) {
          W.elWorld(tracers[i], tmp2);
          var lx = W.elPos[tracers[i] * 3];
          if (lx < trailLast[i] - 1 || Math.abs(lx) > W.A - 0.05) trails[i].clear();
          else trails[i].push(tmp2);
          trailLast[i] = lx;
        });
        v.render(dt);
        if (!K.skipRender) {
          var ctx = v.ctx, w = v.w, h = v.h;
          var aDC = 1 - 0.75 * dimDC, aAC = 1 - 0.75 * dimAC;
          drawGraph(ctx, 40, 480, false, tau, aDC);
          drawGraph(ctx, 600, 480, true, tau, aAC);
          drawWireMarks(ctx, Wdc, 0, false, tau, aDC);
          drawWireMarks(ctx, Wac, 1, true, tau, aAC);
          var ink2 = dark ? P.onNightMuted : P.ink2;
          K.label(ctx, 'Elektronlar hep aynı yöne kayar', 40, h - 44, { size: 13, color: ink2, alpha: aDC });
          drawTag(ctx, 'kayma hızı abartılı gösterilmiştir', 40, h - 24, 'left', undefined, aDC);
          drawTag(ctx, 'basitleştirilmiş model', 40, h - 9, 'left', undefined, aDC);
          K.label(ctx, 'Elektronlar ileri geri salınır: net yer değiştirme sıfır', 600, h - 44, { size: 13, color: ink2, alpha: aAC });
          drawTag(ctx, 'yavaşlatılmış: gerçekte saniyede 50 kez ileri geri (50 Hz)', 600, h - 24, 'left', undefined, aAC);
          drawTag(ctx, 'salınım genliği abartılı gösterilmiştir', 600, h - 9, 'left', undefined, aAC);
        }
      },
      dispose: function () { v.dispose(); }
    };
  });
})();
