/* Köklerden Göklere · Builder H · Yarı iletkenler
 * pn-junction · led-physics · led-anatomy · mosfet · sand-to-chip
 * Bileşen standardı: Builder G (5 mm LED ölçüleri ve malzemeleri).
 */
(function () {
  'use strict';
  if (!window.KGViz) return;
  var K = window.KGViz;
  var P = K.palette;

  /* =====================================================================
   * Shared helpers
   * ===================================================================== */

  /* Rounded box (same approach as three's RoundedBoxGeometry), centred. */
  function roundedBox(w, h, d, r, s) {
    var THREE = window.THREE;
    s = s || 3;
    var seg = s * 2 + 1;
    r = Math.min(r, w / 2 - 1e-4, h / 2 - 1e-4, d / 2 - 1e-4);
    var g0 = new THREE.BoxGeometry(1, 1, 1, seg, seg, seg);
    var g = g0.toNonIndexed();
    g0.dispose();
    var pos = g.attributes.position.array, nor = g.attributes.normal.array;
    var bx = w / 2 - r, by = h / 2 - r, bz = d / 2 - r, half = 0.5 / seg;
    for (var i = 0; i < pos.length; i += 3) {
      var x = pos[i], y = pos[i + 1], z = pos[i + 2];
      var nx = x - Math.sign(x) * half, ny = y - Math.sign(y) * half, nz = z - Math.sign(z) * half;
      var l = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1;
      nx /= l; ny /= l; nz /= l;
      pos[i] = bx * Math.sign(x) + nx * r;
      pos[i + 1] = by * Math.sign(y) + ny * r;
      pos[i + 2] = bz * Math.sign(z) + nz * r;
      nor[i] = nx; nor[i + 1] = ny; nor[i + 2] = nz;
    }
    g.attributes.position.needsUpdate = true;
    g.computeBoundingSphere();
    return g;
  }

  /* Rounded rectangle Shape (for extrusions). */
  function rrShape(w, h, r, cx, cy) {
    var THREE = window.THREE;
    cx = cx || 0; cy = cy || 0;
    var x = cx - w / 2, y = cy - h / 2;
    r = Math.min(r, w / 2, h / 2);
    var s = new THREE.Shape();
    s.moveTo(x + r, y);
    s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r);
    s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r);
    s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
    return s;
  }

  /* Soft radial glow texture (white, alpha falloff), cached. */
  var glowTexCache = null;
  function glowTexture() {
    if (glowTexCache) return glowTexCache;
    var THREE = window.THREE;
    var c = document.createElement('canvas');
    c.width = c.height = 128;
    var x = c.getContext('2d');
    var g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.18, 'rgba(255,255,255,0.75)');
    g.addColorStop(0.45, 'rgba(255,255,255,0.22)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = g;
    x.fillRect(0, 0, 128, 128);
    glowTexCache = new THREE.CanvasTexture(c);
    return glowTexCache;
  }
  function glowSprite(color, size, opacity, additive) {
    var THREE = window.THREE;
    var m = new THREE.SpriteMaterial({
      map: glowTexture(), color: color, transparent: true, depthWrite: false, toneMapped: false,
      opacity: opacity === undefined ? 1 : opacity,
      blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending
    });
    var s = new THREE.Sprite(m);
    s.scale.setScalar(size);
    return s;
  }

  /* Instanced mesh with in-place matrix updates. */
  function instances(geo, mat, n) {
    var THREE = window.THREE;
    var mesh = new THREE.InstancedMesh(geo, mat, n);
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    mesh.frustumCulled = false;
    var m = new THREE.Matrix4(), p = new THREE.Vector3(), s = new THREE.Vector3(), q0 = new THREE.Quaternion();
    mesh.put = function (i, x, y, z, sx, sy, sz, q) {
      p.set(x, y, z);
      s.set(sx, sy === undefined ? sx : sy, sz === undefined ? sx : sz);
      m.compose(p, q || q0, s);
      mesh.setMatrixAt(i, m);
    };
    mesh.hide = function (i) { m.makeScale(0, 0, 0); mesh.setMatrixAt(i, m); };
    mesh.done = function () { mesh.instanceMatrix.needsUpdate = true; if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true; };
    for (var i = 0; i < n; i++) mesh.hide(i);
    return mesh;
  }

  /* Font readiness for canvas textures (redraw once the embedded fonts arrive). */
  var fontState = { ok: false, next: 0 };
  function fontsOk() {
    if (fontState.ok) return true;
    var now = (window.performance && performance.now()) || 0;
    if (now < fontState.next) return false;
    fontState.next = now + 400;
    try {
      if (!document.fonts) { fontState.ok = true; return true; }
      fontState.ok = document.fonts.check("500 20px 'IBM Plex Mono'") && document.fonts.check("600 20px 'IBM Plex Sans'") && document.fonts.check("400 20px 'IBM Plex Sans'");
      if (!fontState.ok) {
        document.fonts.load("500 20px 'IBM Plex Mono'");
        document.fonts.load("400 20px 'IBM Plex Mono'");
        document.fonts.load("600 20px 'IBM Plex Sans'");
        document.fonts.load("400 20px 'IBM Plex Sans'");
      }
    } catch (e) { fontState.ok = true; }
    return fontState.ok;
  }

  /* Canvas texture whose drawing is redone when text changes or fonts load. */
  function liveTexture(cw, ch, draw) {
    var THREE = window.THREE;
    var c = document.createElement('canvas');
    c.width = cw; c.height = ch;
    var ctx = c.getContext('2d');
    var tex = new THREE.CanvasTexture(c);
    tex.encoding = THREE.sRGBEncoding;
    tex.anisotropy = 8;
    var last = null, lastF = null;
    return {
      tex: tex,
      update: function (key) {
        var f = fontsOk();
        if (key === last && f === lastF) return;
        last = key; lastF = f;
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, cw, ch);
        draw(ctx, cw, ch, key);
        tex.needsUpdate = true;
      }
    };
  }

  /* Screen-fixed anchor for DOM labels (px inside the visual). */
  function screenAt(v, x, y) {
    var THREE = window.THREE;
    var p = new THREE.Vector3();
    return function () {
      p.set(x / Math.max(1, v.w) * 2 - 1, -(y / Math.max(1, v.h)) * 2 + 1, 0);
      p.unproject(v.camera);
      return p;
    };
  }

  /* Leader line in the core's style, drawn after v.render(). */
  function leader(ctx, ax, ay, bx, by, alpha, dark) {
    if (alpha <= 0.01) return;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = dark ? 'rgba(154,163,178,.75)' : 'rgba(89,94,105,.7)';
    ctx.fillStyle = ctx.strokeStyle;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(ax, ay);
    ctx.lineTo(bx, by);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(ax, ay, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  /* Glass-like translucent material with a Fresnel edge and an optional
   * x-dependent tint (p | depletion | n) plus dashed boundary lines. */
  function glassMat(o) {
    var THREE = window.THREE;
    var m = new THREE.MeshStandardMaterial({
      color: o.color === undefined ? 0xffffff : o.color, roughness: o.rough === undefined ? 0.2 : o.rough, metalness: 0,
      transparent: true, opacity: o.opacity === undefined ? 0.2 : o.opacity, depthWrite: false,
      side: o.side === undefined ? THREE.FrontSide : o.side, envMapIntensity: o.env === undefined ? 0.8 : o.env
    });
    var U = {
      uW: { value: o.w === undefined ? 0.5 : o.w },
      uP: { value: new THREE.Color(o.p === undefined ? 0xffffff : o.p) },
      uN: { value: new THREE.Color(o.n === undefined ? 0xffffff : o.n) },
      uMid: { value: new THREE.Color(o.mid === undefined ? 0xffffff : o.mid) },
      uEdge: { value: o.edge === undefined ? 1.6 : o.edge },
      uLine: { value: new THREE.Color(o.lineColor === undefined ? 0x595E69 : o.lineColor) },
      uLineA: { value: o.lineA === undefined ? 0 : o.lineA },
      uMidA: { value: o.midA === undefined ? 0 : o.midA },
      uAxis: { value: o.axis === 'y' ? 1 : 0 },
      uC: { value: o.center || 0 },
      uDash: { value: o.dash === false ? 0 : 1 }
    };
    m.userData.u = U;
    m.onBeforeCompile = function (sh) {
      Object.keys(U).forEach(function (k) { sh.uniforms[k] = U[k]; });
      sh.vertexShader = sh.vertexShader
        .replace('#include <common>', '#include <common>\nvarying vec3 vLoc;')
        .replace('#include <begin_vertex>', '#include <begin_vertex>\nvLoc = position;');
      sh.fragmentShader = sh.fragmentShader
        .replace('#include <common>', '#include <common>\nvarying vec3 vLoc;\nuniform float uW; uniform vec3 uP; uniform vec3 uN; uniform vec3 uMid; uniform float uEdge; uniform vec3 uLine; uniform float uLineA; uniform float uMidA; uniform float uAxis; uniform float uC; uniform float uDash;')
        .replace('#include <color_fragment>',
          '#include <color_fragment>\n' +
          'float cc = mix(vLoc.x, vLoc.y, uAxis) - uC;\n' +
          'float aax = max(fwidth(cc), 1e-4);\n' +
          'float sp = smoothstep(-uW - aax, -uW + aax, cc);\n' +
          'float sn = smoothstep(uW - aax, uW + aax, cc);\n' +
          'vec3 tint = mix(uP, uMid, sp); tint = mix(tint, uN, sn);\n' +
          'diffuseColor.rgb *= tint;\n' +
          'float dB = abs(abs(cc) - uW);\n' +
          'float dash = mix(1.0, step(0.42, fract(mix(vLoc.y + vLoc.z, vLoc.x + vLoc.z, uAxis) * 4.0)), uDash);\n' +
          'float ln = (1.0 - smoothstep(aax * 0.6, aax * 1.6, dB)) * dash * uLineA;\n' +
          'float ln0 = (1.0 - smoothstep(aax * 0.4, aax * 1.4, abs(cc))) * uMidA;\n' +
          'float lnAll = max(ln, ln0);\n' +
          'diffuseColor.rgb = mix(diffuseColor.rgb, uLine, lnAll);\n' +
          'diffuseColor.a = max(diffuseColor.a, lnAll * 0.85);')
        .replace('#include <output_fragment>',
          'float frs = pow(1.0 - abs(dot(normalize(normal), normalize(vViewPosition))), 2.0);\n' +
          'diffuseColor.a = clamp(diffuseColor.a * (1.0 + uEdge * frs), 0.0, 1.0);\n' +
          'gl_FragColor = vec4( outgoingLight, diffuseColor.a );\n' +
          '#include <output_fragment>');
    };
    return m;
  }

  /* Clear plastic skin (same technique as Builder G's LED epoxy): physical material with
   * Fresnel- and highlight-driven alpha, so a mostly transparent body keeps crisp highlights. */
  function skinMat(o) {
    var THREE = window.THREE;
    o = o || {};
    var m = new THREE.MeshPhysicalMaterial({
      color: o.color === undefined ? 0xffffff : o.color, roughness: o.rough === undefined ? 0.06 : o.rough, metalness: 0,
      transparent: true, opacity: o.opacity === undefined ? 0.12 : o.opacity,
      clearcoat: o.clearcoat === undefined ? 1 : o.clearcoat, clearcoatRoughness: 0.05,
      envMapIntensity: o.env === undefined ? 1.2 : o.env, depthWrite: false,
      emissive: o.emissive === undefined ? 0x000000 : o.emissive, emissiveIntensity: 0,
      side: o.side === undefined ? THREE.FrontSide : o.side
    });
    var U = {
      uFres: { value: o.fres === undefined ? 0.5 : o.fres },
      uSpecA: { value: o.specA === undefined ? 0.6 : o.specA },
      uRim: { value: new THREE.Color(o.rim === undefined ? 0x56606C : o.rim) },
      uRimAmt: { value: o.rimAmt === undefined ? 0.4 : o.rimAmt },
      uFade: { value: 1 }
    };
    m.userData.U = U;
    m.onBeforeCompile = function (sh) {
      Object.keys(U).forEach(function (k) { sh.uniforms[k] = U[k]; });
      sh.fragmentShader = 'uniform float uFres;\nuniform float uSpecA;\nuniform vec3 uRim;\nuniform float uRimAmt;\nuniform float uFade;\n' +
        sh.fragmentShader.replace('#include <output_fragment>', [
          '#include <output_fragment>',
          '{',
          '  float hNv = clamp(abs(dot(normalize(normal), normalize(vViewPosition))), 0.0, 1.0);',
          '  float hF = pow(1.0 - hNv, 2.6);',
          '  float hS = clamp(dot(totalSpecular, vec3(0.3333)), 0.0, 1.0);',
          '  gl_FragColor.rgb = mix(gl_FragColor.rgb, uRim, hF * uRimAmt);',
          '  gl_FragColor.a = clamp(gl_FragColor.a + hF * uFres + hS * uSpecA, 0.0, 1.0) * uFade;',
          '}'
        ].join('\n'));
    };
    m.customProgramCacheKey = function () { return 'kg-h-skin'; };
    return m;
  }

  /* Turkish signed volts, e.g. "+0,7 V", "−3,0 V", "0,0 V". */
  function fmtV(x, d) {
    d = d === undefined ? 1 : d;
    var s = K.num(Math.abs(x), d);
    var z = Math.abs(x) < Math.pow(10, -d) / 2;
    return (z ? '' : (x > 0 ? '+' : '−')) + s + ' V';
  }

  /* Fit the camera distance so a scene of needW x needH world units fills the box (vertical fov fixed). */
  function fitCam(v, fov, needW, needH, st) {
    if (!v.w || !v.h) return;
    var key = v.w + 'x' + v.h;
    if (st.fitKey === key) return;
    st.fitKey = key;
    var th = Math.tan(fov * Math.PI / 360) * 2;
    var d = Math.max(needH / th, needW / ((v.w / v.h) * th));
    v.home.distance = d;
    v.view.distance = d;
  }
  /* Label sizing for the large focus-slide format. */
  function bigLab(L, px, bold) { L.el.style.fontSize = px + 'px'; if (bold) L.el.style.fontWeight = '700'; return L; }

  /* Wavelength (nm) to an sRGB hex (approximation for display). */
  var LED_COLORS = {
    kirmizi: { nm: 630, ev: 1240 / 630, hex: 0xE8412C, css: '#E8412C', name: 'kırmızı', mat: 'AlGaInP' },
    yesil: { nm: 525, ev: 1240 / 525, hex: 0x1FB65A, css: '#1FB65A', name: 'yeşil', mat: 'InGaN' },
    mavi: { nm: 465, ev: 1240 / 465, hex: 0x2F66F0, css: '#2F66F0', name: 'mavi', mat: 'InGaN' }
  };

  /* Common pieces */
  function disposeAll(v) { if (v && v.dispose) v.dispose(); }

  /* =====================================================================
   * 1) pn-junction · S 680×520 · light
   * ===================================================================== */
  K.register('pn-junction', function (el, opts) {
    var THREE = window.THREE;
    opts = opts || {};
    var theme = opts.theme || 'light';
    var dark = theme === 'dark';
    var v = K.stage3d(el, {
      theme: theme, fov: 24, distance: 10.4, yaw: -0.12, pitch: 0.24, target: [0.05, -0.3, 0.3],
      size: 5, ground: -2.05, minPitch: 0.08, maxPitch: 0.95, minYaw: -0.95, maxYaw: 0.7, minDistance: 4, maxDistance: 40
    });
    v.exposure = 1.0;
    var scene = v.scene;
    var rng = K.rng(1907);

    /* ---- geometry constants ---- */
    var BW = 6.4, BH = 2.0, BD = 1.7;            // block
    var XI = 3.02, YI = 0.8, ZI = 0.66;           // interior bounds for carriers
    var NCOL = 5, COLS = 0.6, X0 = 0.3;            // ion columns per side
    var ROWS = [-0.5, 0.0, 0.5], LAYERS = [-0.3, 0.3];

    /* ---- block: glass shell (back + front) with p | depletion | n tint ---- */
    var shellGeo = roundedBox(BW, BH, BD, 0.14, 4);
    var tintP = new THREE.Color(0xF2D3BD), tintN = new THREE.Color(0xCFDAF3), tintMid = new THREE.Color(0xFFFFFF);
    var backMat = glassMat({ side: THREE.BackSide, opacity: 0.5, p: tintP, n: tintN, mid: tintMid, edge: 0.4, rough: 0.5, env: 0.3, lineA: 0.55, midA: 0.25 });
    var frontMat = glassMat({ side: THREE.FrontSide, opacity: 0.16, p: tintP, n: tintN, mid: tintMid, edge: 2.4, rough: 0.12, env: 1.0, lineA: 0.7, midA: 0.3 });
    var shellBack = new THREE.Mesh(shellGeo, backMat);
    shellBack.renderOrder = 1;
    var shellFront = new THREE.Mesh(shellGeo, frontMat);
    shellFront.renderOrder = 3;
    scene.add(shellBack, shellFront);
    // shadow proxy (invisible caster so the glass block still drops a soft shadow)
    var shadowProxy = new THREE.Mesh(roundedBox(BW * 0.98, BH * 0.9, BD * 0.9, 0.12, 2), new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false }));
    shadowProxy.castShadow = true;
    scene.add(shadowProxy);

    /* ---- metal contact plates ---- */
    var plateGeo = roundedBox(0.16, BH + 0.24, BD + 0.24, 0.05, 3);
    var plateMat = K.mat.aluminium({ roughness: 0.38 });
    var plates = [-1, 1].map(function (s) {
      var m = new THREE.Mesh(plateGeo, plateMat);
      m.position.set(s * (BW / 2 + 0.09), 0, 0);
      m.castShadow = true; m.receiveShadow = true;
      scene.add(m);
      // terminal post on the outer face
      var post = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.28, 20), K.mat.steel({ roughness: 0.3 }));
      post.rotation.z = Math.PI / 2;
      post.position.set(s * (BW / 2 + 0.3), -0.55, 0);
      post.castShadow = true;
      scene.add(post);
      var nut = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.07, 6), K.mat.steel({ roughness: 0.35 }));
      nut.rotation.z = Math.PI / 2;
      nut.position.set(s * (BW / 2 + 0.22), -0.55, 0);
      scene.add(nut);
      return m;
    });

    /* ---- bipolar DC source on the bench (under the block, in front) ---- */
    var SUP = { x: 0, y: -2.05, z: 1.05, w: 2.0, h: 0.58, d: 0.95 };
    var supply = new THREE.Group();
    supply.position.set(SUP.x, SUP.y, SUP.z);
    scene.add(supply);
    var supBody = new THREE.Mesh(roundedBox(SUP.w, SUP.h, SUP.d, 0.1, 4), K.mat.std(0xDAD8D1, 0.55, 0));
    supBody.position.y = SUP.h / 2;
    supBody.castShadow = true; supBody.receiveShadow = true;
    supply.add(supBody);
    var bezel = new THREE.Mesh(roundedBox(1.3, 0.4, 0.05, 0.04, 3), K.mat.std(0x23272F, 0.4, 0));
    bezel.position.set(0, SUP.h / 2, SUP.d / 2 + 0.005);
    supply.add(bezel);
    var disp = liveTexture(512, 160, function (c, w, h, txt) {
      c.fillStyle = '#161A21';
      c.fillRect(0, 0, w, h);
      var g = c.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, 'rgba(255,255,255,0.06)');
      g.addColorStop(1, 'rgba(255,255,255,0)');
      c.fillStyle = g;
      c.fillRect(0, 0, w, h * 0.5);
      c.font = "500 96px 'IBM Plex Mono', Consolas, monospace";
      c.fillStyle = '#EEF0F3';
      c.textAlign = 'right';
      c.textBaseline = 'middle';
      c.fillText(txt, w - 34, h * 0.54);
    });
    var dispMesh = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.355), new THREE.MeshBasicMaterial({ map: disp.tex, toneMapped: false }));
    dispMesh.position.set(0, SUP.h / 2, SUP.d / 2 + 0.034);
    supply.add(dispMesh);
    // binding posts on top (red = p side, black = n side); the wire enters the stud from the side
    var POST_Y = SUP.y + SUP.h + 0.16;
    function bindingPost(color, x) {
      var g = new THREE.Group();
      var collar = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.115, 0.06, 28), K.mat.std(color, 0.45, 0));
      collar.position.y = 0.03;
      var stud = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.042, 0.2, 16), K.mat.tin());
      stud.position.y = 0.15;
      var knob = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.09, 0.13, 28), K.mat.std(color, 0.42, 0));
      knob.position.y = 0.3;
      var top = new THREE.Mesh(new THREE.SphereGeometry(0.085, 28, 10, 0, Math.PI * 2, 0, Math.PI / 2), K.mat.std(color, 0.42, 0));
      top.scale.y = 0.45;
      top.position.y = 0.365;
      [collar, stud, knob, top].forEach(function (m) { m.castShadow = true; g.add(m); });
      g.position.set(x, SUP.h, -0.12);
      supply.add(g);
      return g;
    }
    bindingPost(0xB3352A, -0.72);
    bindingPost(0x22252B, 0.72);

    /* ---- wires from plate terminals to the binding posts ---- */
    var PZ = SUP.z - 0.12;
    var wireP = K.wire([
      [-(BW / 2 + 0.44), -0.55, 0], [-(BW / 2 + 0.85), -0.7, 0.12], [-(BW / 2 + 0.75), -1.5, 0.55],
      [-2.2, -1.95, 1.0], [-1.25, -1.83, PZ], [-0.78, POST_Y, PZ]
    ], { radius: 0.04, material: K.mat.plasticRed({ roughness: 0.45 }), tension: 0.5 });
    var wireN = K.wire([
      [0.78, POST_Y, PZ], [1.25, -1.83, PZ], [2.2, -1.95, 1.0],
      [(BW / 2 + 0.75), -1.5, 0.55], [(BW / 2 + 0.85), -0.7, 0.12], [(BW / 2 + 0.44), -0.55, 0]
    ], { radius: 0.04, material: K.mat.plasticBlack({ roughness: 0.45 }), tension: 0.5 });
    scene.add(wireP, wireN);
    var wireSamples = [wireP, wireN].map(function (w) { return w.curve.getSpacedPoints(240); });
    var wireLen = [wireP.curve.getLength(), wireN.curve.getLength()];
    var BEAD_GAP = 0.34;
    var nBeads = [Math.floor(wireLen[0] / BEAD_GAP), Math.floor(wireLen[1] / BEAD_GAP)];
    var beads = instances(new THREE.IcosahedronGeometry(0.052, 1), K.mat.electron(dark), nBeads[0] + nBeads[1]);
    scene.add(beads);

    /* ---- fixed dopant ions ---- */
    var ions = [];
    // staggered lattice: front layer on whole columns/rows, back layer offset by half a step
    [-1, 1].forEach(function (side) {
      for (var k = 0; k < NCOL; k++) for (var j = 0; j < ROWS.length; j++) {
        ions.push({ x: side * (X0 + COLS * k), y: ROWS[j] * 1.1, z: LAYERS[1], side: side, unc: 0 });
      }
      for (var k2 = 0; k2 < NCOL - 1; k2++) for (var j2 = 0; j2 < ROWS.length - 1; j2++) {
        ions.push({ x: side * (X0 + COLS * (k2 + 0.5)), y: (ROWS[j2] + ROWS[j2 + 1]) * 0.55, z: LAYERS[0], side: side, unc: 0 });
      }
    });
    var ionMat = K.mat.std(0xffffff, 0.45, 0.05, { envMapIntensity: 0.5 });
    var ionMesh = instances(new THREE.IcosahedronGeometry(1, 2), ionMat, ions.length);
    scene.add(ionMesh);
    var barMat = new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false });
    var barH = instances(new THREE.BoxGeometry(1, 1, 1), barMat, ions.length);
    var barV = instances(new THREE.BoxGeometry(1, 1, 1), barMat, ions.length);
    scene.add(barH, barV);
    var colNeg = new THREE.Color(0x4F69C2), colPos = new THREE.Color(0xC8693A);
    var colDimP = new THREE.Color(0xE9D3C4), colDimN = new THREE.Color(0xD3DBEE);
    var tmpC = new THREE.Color(), tmpC2 = new THREE.Color();
    ions.forEach(function (o, i) { ionMesh.setColorAt(i, colNeg); barH.setColorAt(i, tmpC.set(0xffffff)); barV.setColorAt(i, tmpC.set(0xffffff)); });

    /* ---- mobile carriers ---- */
    var NMAX = 46;
    function makeCarriers(kind) {
      var arr = [];
      for (var i = 0; i < NMAX; i++) arr.push({ kind: kind, st: 0, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, a: 0, sx: 0, sy: 0, sz: 0, tx: 0, ty: 0, tz: 0, t0: 0, dur: 1 });
      return arr;
    }
    var holes = makeCarriers('h'), elecs = makeCarriers('e');
    var holeMesh = instances(new THREE.TorusGeometry(0.088, 0.025, 8, 28), K.mat.hole(), NMAX);
    var elecMesh = instances(new THREE.IcosahedronGeometry(0.08, 2), K.mat.electron(dark), NMAX);
    holeMesh.castShadow = false;
    scene.add(holeMesh, elecMesh);

    /* ---- recombination flashes ---- */
    var flashes = [];
    for (var fi = 0; fi < 10; fi++) {
      var sp = glowSprite(0xFFC678, 0.6, 0);
      sp.renderOrder = 5;
      scene.add(sp);
      flashes.push({ s: sp, t: -9, x: 0, y: 0, z: 0 });
    }

    /* ---- labels ---- */
    var labP = bigLab(v.label('p tipi', { at: [-1.75, BH / 2, -BD / 2], cls: 'name', dy: -16 }), 21, true);
    var labN = bigLab(v.label('n tipi', { at: [1.75, BH / 2, -BD / 2], cls: 'name', dy: -16 }), 21, true);
    var labDep = bigLab(v.label('engel bölgesi', { at: [0, BH / 2, -BD / 2], cls: 'name', dy: -50 }), 20, true);
    var labDepNote = bigLab(v.label('', { at: [0, BH / 2, -BD / 2], cls: 'note', dy: -28 }), 16, false);
    var labRec = { show: function () {} };
    var labPlateL = v.label('+', { at: [-(BW / 2 + 0.17), 0.35, 0], cls: 'value', dx: -14, align: 'right' });
    var labPlateR = v.label('−', { at: [(BW / 2 + 0.17), 0.35, 0], cls: 'value', dx: 14, align: 'left' });
    labPlateL.el.style.fontSize = labPlateR.el.style.fontSize = '34px';
    labPlateL.el.style.fontWeight = labPlateR.el.style.fontWeight = '600';
    var labModel = v.label('basitleştirilmiş model · ölçekli değil', { at: screenAt(v, 18, 20), cls: 'tag', align: 'left' });
    labModel.el.style.fontSize = '13px';
    /* barrier: a soft grey band exactly over the depletion zone, so the wall reads at a glance */
    var barBox = new THREE.Mesh(new THREE.BoxGeometry(1, BH - 0.06, BD - 0.06), new THREE.MeshBasicMaterial({ color: 0x3A4050, transparent: true, opacity: 0.2, depthWrite: false, toneMapped: false }));
    barBox.renderOrder = 2;
    scene.add(barBox);

    /* ---- physics model ---- */
    var IS = 2.5e-9, NVT = 1.75 * 0.0259, RS = 0.2, VBI = 0.72, W0 = 0.6;
    function diodeI(V) {
      if (V <= 0.3) return IS * (Math.exp(V / NVT) - 1);
      var vj = Math.min(V, 0.95);
      for (var k = 0; k < 24; k++) {
        var e = IS * Math.exp(vj / NVT);
        var g = vj + RS * (e - IS) - V;
        var dg = 1 + RS * e / NVT;
        var nv = vj - g / dg;
        if (Math.abs(nv - vj) < 1e-9) { vj = nv; break; }
        vj = nv;
      }
      return IS * (Math.exp(vj / NVT) - 1);
    }
    function depW(V) { return Math.max(0.12, W0 * Math.sqrt(Math.max(0, VBI - V) / VBI)); }
    function flowOf(I) { return I <= 1e-4 ? 0 : K.clamp(Math.log(I / 1e-4) / Math.LN10 / 2, 0, 1); }
    function fmtI(I) {
      var a = Math.abs(I);
      if (a < 1e-5) return '≈ 0 mA';
      if (a < 1e-3) return '≈ ' + K.num(a * 1e3, 2) + ' mA';
      if (a < 0.01) return '≈ ' + K.num(a * 1e3, 1) + ' mA';
      if (a < 1) return '≈ ' + K.num(a * 1e3, 0) + ' mA';
      return '≈ ' + K.num(a, 1) + ' A';
    }

    /* ---- state ---- */
    var S = {};
    function autoBias(t) {
      // 24 s story: 0 V (equilibrium) → −3 V (reverse, barrier widens) → +0,8 V (forward, barrier opens) → 0 V
      var c = ((t % 24) + 24) % 24;
      var E = K.ease.inOut;
      if (c < 5.0) return 0;
      if (c < 6.6) return K.lerp(0, -3, E((c - 5.0) / 1.6));
      if (c < 11.5) return -3;
      if (c < 14.2) return K.lerp(-3, 0.8, E((c - 11.5) / 2.7));
      if (c < 21.5) return 0.8;
      return K.lerp(0.8, 0, E((c - 21.5) / 2.5));
    }
    function seedCarriers() {
      var w = depW(0);
      [holes, elecs].forEach(function (arr, si) {
        var side = si === 0 ? -1 : 1;
        var target = 0;
        ions.forEach(function (o) { if (o.side === side) target += 1 - K.smoothstep(w + 0.14, w - 0.14, Math.abs(o.x)); });
        target = Math.round(target);
        for (var i = 0; i < NMAX; i++) {
          var c = arr[i];
          if (i < target) {
            c.st = 1; c.a = 1;
            var u = (i + 0.5) / target;
            c.x = side * (w + 0.2 + (XI - w - 0.25) * ((u * 7.31 + rng() * 0.3) % 1));
            c.y = (rng() * 2 - 1) * YI * 0.9; c.z = (rng() * 2 - 1) * ZI * 0.9;
            c.vx = c.vy = c.vz = 0;
          } else { c.st = 0; c.a = 0; }
        }
      });
    }
    function reset() {
      S.fitKey = '';
      S.auto = !K.reducedMotion;
      S.biasTarget = K.reducedMotion ? 0.7 : 0;
      S.bias = S.biasTarget;
      S.w = depW(S.bias);
      S.recAcc = 0;
      S.cool = [0, 0];
      S.phase = [0, 0];
      S.phaseT = [0, 0];
      S.intro = K.reducedMotion ? 1 : 0;
      S.flashI = 0;
      rng = K.rng(1907);
      ions.forEach(function (o) { o.unc = 1 - K.smoothstep(S.w - 0.14, S.w + 0.14, Math.abs(o.x)); });
      seedCarriers();
      flashes.forEach(function (f) { f.t = -9; f.s.material.opacity = 0; });
      v.setView({ yaw: v.home.yaw, pitch: v.home.pitch, distance: v.home.distance, target: v.home.target.toArray() });
    }

    var camQ = new THREE.Quaternion(), camPos = new THREE.Vector3(), dirV = new THREE.Vector3();

    function aliveCount(arr) { var n = 0; for (var i = 0; i < NMAX; i++) if (arr[i].st === 1 || arr[i].st === 4) n++; return n; }

    function stepCarriers(arr, side, dt, t, target, drift) {
      // side: -1 holes (p), +1 electrons (n)
      var w = S.w, xIn = side * (w + 0.13);
      var plateX = side * XI;
      var n = aliveCount(arr), ci = side < 0 ? 0 : 1;
      S.cool[ci] -= dt;
      if (S.cool[ci] <= 0) {
        if (n > target + 0.5) {
          // the carrier nearest its contact leaves through the plate
          var best = -1, bx = -1;
          for (var i = 0; i < NMAX; i++) if (arr[i].st === 1 && Math.abs(arr[i].x) > bx) { bx = Math.abs(arr[i].x); best = i; }
          if (best >= 0) {
            var c = arr[best];
            c.st = 2; c.t0 = t; c.dur = 0.55; c.sx = c.x; c.sy = c.y; c.sz = c.z; c.tx = plateX + side * 0.08; c.ty = c.y; c.tz = c.z;
            S.cool[ci] = 0.14;
          }
        } else if (n < target - 0.5) {
          for (var j = 0; j < NMAX; j++) if (arr[j].st === 0) {
            var d = arr[j];
            d.st = 4; d.a = 0; d.t0 = t;
            d.x = plateX - side * 0.05; d.y = (rng() * 2 - 1) * YI * 0.85; d.z = (rng() * 2 - 1) * ZI * 0.85;
            d.vx = -side * (0.35 + rng() * 0.3); d.vy = (rng() - 0.5) * 0.3; d.vz = (rng() - 0.5) * 0.3;
            // a carrier entering at a contact = one electron step in that wire
            if (side < 0) S.phaseT[0] += 1; else S.phaseT[1] += 1;
            S.cool[ci] = 0.14;
            break;
          }
        }
      }
      var damp = Math.exp(-1.6 * dt);
      var A = 2.2;
      for (var k = 0; k < NMAX; k++) {
        var c2 = arr[k];
        if (c2.st === 0) continue;
        if (c2.st === 2 || c2.st === 3) {
          var u = K.clamp((t - c2.t0) / c2.dur, 0, 1), e = K.ease.inOut(u);
          c2.x = K.lerp(c2.sx, c2.tx, e); c2.y = K.lerp(c2.sy, c2.ty, e); c2.z = K.lerp(c2.sz, c2.tz, e);
          if (c2.st === 2) {
            c2.a = 1 - K.smoothstep(0.55, 1, u);
            if (u >= 1) { c2.st = 0; c2.a = 0; if (side < 0) S.phaseT[0] -= 1; else S.phaseT[1] -= 1; }
          } else if (u >= 1) {
            c2.st = 0; c2.a = 0;
          }
          continue;
        }
        if (c2.st === 4) { c2.a = Math.min(1, c2.a + dt / 0.35); if (c2.a >= 1) c2.st = 1; }
        // thermal motion (Ornstein-Uhlenbeck)
        c2.vx = c2.vx * damp + (rng() - 0.5) * A * dt * 2;
        c2.vy = c2.vy * damp + (rng() - 0.5) * A * dt * 2;
        c2.vz = c2.vz * damp + (rng() - 0.5) * A * dt * 2;
        // drift towards the junction under forward bias
        c2.vx += -side * drift * dt;
        // soft wall at the depletion edge: pushes the carrier back into its own region
        var over = side < 0 ? c2.x - xIn : xIn - c2.x;
        if (over > 0) c2.vx += side * (over * 9 + 0.6) * dt;
        // mutual repulsion (keeps the density even)
        for (var m = 0; m < NMAX; m++) {
          if (m === k) continue;
          var o2 = arr[m];
          if (o2.st !== 1 && o2.st !== 4) continue;
          var dx = c2.x - o2.x, dy = c2.y - o2.y, dz = c2.z - o2.z;
          var d2 = dx * dx + dy * dy + dz * dz;
          if (d2 < 0.2025 && d2 > 1e-6) {
            var dd = Math.sqrt(d2), f = (1 - dd / 0.45) * 1.1 * dt / dd;
            c2.vx += dx * f; c2.vy += dy * f; c2.vz += dz * f;
          }
        }
        c2.x += c2.vx * dt; c2.y += c2.vy * dt; c2.z += c2.vz * dt;
        // walls of the crystal (and never deeper than the junction plane)
        if (c2.x < -XI) { c2.x = -XI; c2.vx = Math.abs(c2.vx); } else if (c2.x > XI) { c2.x = XI; c2.vx = -Math.abs(c2.vx); }
        if (side < 0 && c2.x > -0.02) { c2.x = -0.02; c2.vx = -Math.abs(c2.vx); }
        if (side > 0 && c2.x < 0.02) { c2.x = 0.02; c2.vx = Math.abs(c2.vx); }
        if (c2.y < -YI) { c2.y = -YI; c2.vy = Math.abs(c2.vy); } else if (c2.y > YI) { c2.y = YI; c2.vy = -Math.abs(c2.vy); }
        if (c2.z < -ZI) { c2.z = -ZI; c2.vz = Math.abs(c2.vz); } else if (c2.z > ZI) { c2.z = ZI; c2.vz = -Math.abs(c2.vz); }
      }
    }

    function triggerRecombination(t) {
      var hb = -1, hx = -99, eb = -1, ex = 99;
      for (var i = 0; i < NMAX; i++) {
        if (holes[i].st === 1 && holes[i].x > hx) { hx = holes[i].x; hb = i; }
        if (elecs[i].st === 1 && elecs[i].x < ex) { ex = elecs[i].x; eb = i; }
      }
      if (hb < 0 || eb < 0 || hx < -1.6 || ex > 1.6) return false;
      var h = holes[hb], e = elecs[eb];
      var mx = (rng() - 0.5) * 0.36, my = (h.y + e.y) / 2, mz = (h.z + e.z) / 2;
      var dur = K.clamp(Math.max(Math.abs(h.x - mx), Math.abs(e.x - mx)) / 1.4, 0.5, 1.3);
      [h, e].forEach(function (c) { c.st = 3; c.t0 = t; c.dur = dur; c.sx = c.x; c.sy = c.y; c.sz = c.z; c.tx = mx; c.ty = my; c.tz = mz; });
      var F = flashes[S.flashI++ % flashes.length];
      F.t = t + dur; F.x = mx; F.y = my; F.z = mz;
      return true;
    }

    function drawCarriers() {
      camQ.copy(v.camera.quaternion);
      var g = S.intro;
      for (var i = 0; i < NMAX; i++) {
        var h = holes[i], e = elecs[i], ha = h.a * g, ea = e.a * g;
        if (h.st === 0 || ha <= 0.001) holeMesh.hide(i); else holeMesh.put(i, h.x, h.y, h.z, ha, ha, ha, camQ);
        if (e.st === 0 || ea <= 0.001) elecMesh.hide(i); else elecMesh.put(i, e.x, e.y, e.z, ea);
      }
      holeMesh.done(); elecMesh.done();
    }

    function drawIons() {
      camPos.copy(v.camera.position);
      camQ.copy(v.camera.quaternion);
      for (var i = 0; i < ions.length; i++) {
        var o = ions[i];
        var u = o.unc * S.intro;
        // covered ion: a faint lattice point; uncovered ion: a charged sphere with its sign
        var r = 0.03 + 0.068 * u;
        ionMesh.put(i, o.x, o.y, o.z, r);
        if (o.side < 0) tmpC.copy(colDimP).lerp(colNeg, u); else tmpC.copy(colDimN).lerp(colPos, u);
        ionMesh.setColorAt(i, tmpC);
        if (u < 0.08) { barH.hide(i); barV.hide(i); continue; }
        dirV.set(camPos.x - o.x, camPos.y - o.y, camPos.z - o.z).normalize().multiplyScalar(r * 1.01);
        var bx = o.x + dirV.x, by = o.y + dirV.y, bz = o.z + dirV.z;
        var L = r * 1.2 * K.smoothstep(0.08, 0.5, u), T = r * 0.27;
        tmpC2.set(0xffffff);
        barH.put(i, bx, by, bz, L, T, 0.004, camQ);
        barH.setColorAt(i, tmpC2);
        if (o.side > 0) { barV.put(i, bx, by, bz, T, L, 0.004, camQ); barV.setColorAt(i, tmpC2); } else barV.hide(i);
      }
      ionMesh.done(); barH.done(); barV.done();
    }

    function drawBeads(dt) {
      for (var w = 0; w < 2; w++) {
        S.phase[w] += (S.phaseT[w] - S.phase[w]) * Math.min(1, dt * 2.4);
        var smp = wireSamples[w], n = nBeads[w], off = w === 0 ? 0 : nBeads[0];
        var L = wireLen[w];
        for (var i = 0; i < n; i++) {
          var s = ((i + S.phase[w]) * BEAD_GAP) % L;
          if (s < 0) s += L;
          var u = s / L;
          // fade near the ends (plate post and binding post)
          var edge = Math.min(u, 1 - u) * L;
          var sc = K.smoothstep(0.05, 0.35, edge);
          var fidx = u * (smp.length - 1), i0 = Math.floor(fidx), fr = fidx - i0;
          var a = smp[i0], b = smp[Math.min(smp.length - 1, i0 + 1)];
          if (sc < 0.02) beads.hide(off + i);
          else beads.put(off + i, a.x + (b.x - a.x) * fr, a.y + (b.y - a.y) * fr, a.z + (b.z - a.z) * fr, sc);
        }
      }
      beads.done();
    }

    function drawFlashes(t) {
      for (var i = 0; i < flashes.length; i++) {
        var F = flashes[i], age = t - F.t;
        if (age < 0 || age > 0.9) { F.s.material.opacity = 0; F.s.visible = false; continue; }
        F.s.visible = true;
        F.s.position.set(F.x, F.y, F.z);
        var k = age / 0.9;
        F.s.scale.setScalar(0.45 + 0.85 * K.ease.out(k));
        F.s.material.opacity = Math.min(1, (1 - k) * (1 - k) * 1.25);
      }
    }

    /* ---- I–V inset (2D) ---- */
    var IV = { x: 440, y: 8, w: 230, h: 160 };
    var GVS = [-5, -4, -3, -2, -1, 1, 2];
    var ivCurve = null;
    function drawIV(ctx, V, I) {
      var x0 = IV.x, y0 = IV.y, w = IV.w, h = IV.h;
      var px0 = x0 + 14, px1 = x0 + w - 14, py0 = y0 + 42, py1 = y0 + h - 46;
      var imax = 0.04;
      // split voltage axis: reverse side (−5…0 V) compressed, forward side (0…+2 V) wider
      var xz = px0 + (px1 - px0) * 0.42;
      function X(vv) { return vv < 0 ? xz + vv / 5 * (xz - px0) : xz + vv / 2 * (px1 - xz); }
      function Y(ii) { return py1 - K.clamp(ii, 0, imax) / imax * (py1 - py0); }
      var ink = dark ? P.onNight : P.ink, tc = dark ? P.onNightMuted : P.muted;
      ctx.save();
      K.rr(ctx, x0 + 0.5, y0 + 0.5, w - 1, h - 1, 10);
      ctx.fillStyle = dark ? 'rgba(22,27,38,0.92)' : 'rgba(255,255,255,0.94)';
      ctx.fill();
      ctx.strokeStyle = dark ? P.nightLine : P.line;
      ctx.lineWidth = 1;
      ctx.stroke();
      K.label(ctx, 'Akım – gerilim', x0 + 12, y0 + 19, { size: 12, weight: 600, color: ink });
      K.label(ctx, 'akım', xz + 5, py0 - 8, { size: 12, color: tc, align: 'left' });
      K.label(ctx, '40 mA', xz - 4, py0 + 8, { size: 12, mono: true, color: tc, align: 'right' });
      // grid
      ctx.strokeStyle = dark ? 'rgba(255,255,255,0.07)' : 'rgba(21,23,28,0.06)';
      var gvs = GVS;
      for (var g = 0; g < gvs.length; g++) { var gx = Math.round(X(gvs[g])) + 0.5; ctx.beginPath(); ctx.moveTo(gx, py0); ctx.lineTo(gx, py1); ctx.stroke(); }
      for (var gi = 1; gi <= 4; gi++) { var yy = Math.round(py1 - gi / 4 * (py1 - py0)) + 0.5; ctx.beginPath(); ctx.moveTo(px0, yy); ctx.lineTo(px1, yy); ctx.stroke(); }
      // axes
      ctx.strokeStyle = tc;
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(px0, Math.round(py1) + 0.5); ctx.lineTo(px1, Math.round(py1) + 0.5); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(Math.round(xz) + 0.5, py0 - 2); ctx.lineTo(Math.round(xz) + 0.5, py1); ctx.stroke();
      // threshold marker at ≈ 0,6 V
      var xk = Math.round(X(0.6)) + 0.5;
      ctx.setLineDash([2, 3]);
      ctx.beginPath(); ctx.moveTo(xk, py0 + 4); ctx.lineTo(xk, py1); ctx.stroke();
      ctx.setLineDash([]);
      // curve (clipped at the top: the real current keeps rising steeply)
      if (!ivCurve) {
        ivCurve = [];
        for (var k = 0; k <= 400; k++) { var vv = -5 + 7 * k / 400; ivCurve.push([vv, diodeI(vv)]); }
        for (var k2 = 0; k2 <= 120; k2++) { var v2 = 0.55 + 0.25 * k2 / 120; ivCurve.push([v2, diodeI(v2)]); }
        ivCurve.sort(function (a, b) { return a[0] - b[0]; });
      }
      ctx.save();
      ctx.beginPath();
      ctx.rect(px0 - 2, py0 - 1, px1 - px0 + 4, py1 - py0 + 3);
      ctx.clip();
      ctx.beginPath();
      for (var c = 0; c < ivCurve.length; c++) {
        var cx = X(ivCurve[c][0]), cy = py1 - Math.max(0, ivCurve[c][1]) / imax * (py1 - py0);
        if (c === 0) ctx.moveTo(cx, cy); else ctx.lineTo(cx, cy);
        if (cy < py0 - 6) break;
      }
      ctx.strokeStyle = ink;
      ctx.lineWidth = 1.7;
      ctx.lineJoin = 'round';
      ctx.stroke();
      ctx.restore();
      // tick labels
      K.label(ctx, '−5 V', px0, py1 + 15, { size: 12, mono: true, color: tc, align: 'left' });
      K.label(ctx, '0', xz, py1 + 15, { size: 12, mono: true, color: tc, align: 'center' });
      K.label(ctx, '0,6', xk, py1 + 15, { size: 12, mono: true, color: tc, align: 'center' });
      K.label(ctx, '+2 V', px1, py1 + 15, { size: 12, mono: true, color: tc, align: 'right' });
      K.label(ctx, 'ters yön', (px0 + xz) / 2, py1 - 12, { size: 12, color: tc, align: 'center' });
      K.label(ctx, 'ileri yön', px1 - 2, py1 - 12, { size: 12, color: tc, align: 'right' });
      // moving dot
      var dxp = X(K.clamp(V, -5, 2)), clipped = I > imax, dyp = Y(I);
      K.drawGlow(ctx, P.copperFill, dxp, dyp, 12, 0.4);
      ctx.beginPath(); ctx.arc(dxp, dyp, 4.4, 0, Math.PI * 2);
      ctx.fillStyle = P.copperFill; ctx.fill();
      ctx.lineWidth = 1.5; ctx.strokeStyle = '#fff'; ctx.stroke();
      if (clipped) K.arrow(ctx, dxp + 9, dyp + 9, dxp + 9, dyp - 5, { color: P.copper, width: 1.3, head: 5.5 });
      ctx.strokeStyle = dark ? P.nightLine : P.line;
      ctx.beginPath(); ctx.moveTo(x0 + 10, y0 + h - 24.5); ctx.lineTo(x0 + w - 10, y0 + h - 24.5); ctx.stroke();
      var hot = V >= 0.8, fc = hot ? P.copper : tc;
      K.label(ctx, hot ? 'Akım çok artar; direnç sınırlar' : '0,6 V üstünde akım hızla artar', x0 + 12, y0 + h - 9, { size: 12, color: fc });
      ctx.restore();
    }

    /* ---- legend (2D, bottom-left) ---- */
    function drawLegend(ctx) {
      var x = 16, y = 492;
      ctx.save();
      var tc = dark ? P.onNightMuted : P.ink2;
      // hole
      ctx.beginPath(); ctx.arc(x + 6, y, 5, 0, Math.PI * 2);
      ctx.lineWidth = 2.2; ctx.strokeStyle = P.copperFill; ctx.stroke();
      K.label(ctx, 'boşluk', x + 17, y + 4, { size: 12, color: tc });
      x += 74;
      K.drawSphere(ctx, '#2848C8', x + 6, y, 5.5);
      K.label(ctx, 'elektron', x + 17, y + 4, { size: 12, color: tc });
      x += 82;
      K.drawSphere(ctx, '#4F69C2', x + 6, y, 6);
      ctx.fillStyle = '#fff'; ctx.fillRect(x + 3, y - 0.8, 6, 1.6);
      K.drawSphere(ctx, '#C8693A', x + 22, y, 6);
      ctx.fillRect(x + 19, y - 0.8, 6, 1.6); ctx.fillRect(x + 21.2, y - 3, 1.6, 6);
      K.label(ctx, 'sabit iyonlar (yer değiştirmez)', x + 34, y + 4, { size: 12, color: tc });
      // diode symbol: the triangle points from the p side to the n side
      var sx = 392, ink = dark ? P.onNight : P.ink;
      ctx.beginPath(); ctx.moveTo(sx, y - 7); ctx.lineTo(sx, y + 7); ctx.lineTo(sx + 16, y); ctx.closePath();
      ctx.fillStyle = ink; ctx.fill();
      ctx.beginPath(); ctx.moveTo(sx + 17, y - 7); ctx.lineTo(sx + 17, y + 7);
      ctx.lineWidth = 2; ctx.strokeStyle = ink; ctx.stroke();
      K.label(ctx, 'diyot sembolü: akım ok yönünde geçer', sx + 30, y + 4, { size: 12, color: tc });
      ctx.restore();
    }

    reset();

    return {
      reset: reset,
      set: function (key, val) {
        if (key === 'bias') {
          var b = parseFloat(val);
          if (isNaN(b)) return;
          S.auto = false;
          S.biasTarget = K.clamp(b, -5, 2);
        }
      },
      read: function (key) {
        var V = Math.round(S.bias * 10) / 10;
        if (key === 'bias') return fmtV(V, 1);
        if (key === 'current') return 'Akım ' + fmtI(diodeI(S.bias));
        if (key === 'explain') {
          var Ie = diodeI(S.bias);
          if (V <= -0.05) return 'Ters bağlantı: engel genişler, elektron ve boşluklar uzaklaşır, akım geçmez.';
          if (Math.abs(V) < 0.05) return 'p ve n birleşince sınırda taşıyıcısız bir engel oluşur: akım geçmez.';
          if (Ie < 3e-3) return 'İleri bağlantı: gerilim engeli daraltıyor ama henüz aşamadı, akım çok az.';
          return 'İleri bağlantı: engel aşıldı, elektron ve boşluklar sınırda birleşir, akım geçer.';
        }
        if (key === 'state') {
          var I = diodeI(S.bias);
          if (V <= -0.05) return 'Ters yön: akım geçmez';
          if (Math.abs(V) < 0.05) return 'Gerilim yok: denge, net akım yok';
          if (I < 1e-3) return 'İleri yön: eşik aşılmadı, akım çok az';
          return 'İleri yön: akım geçer';
        }
        return '';
      },
      frame: function (t, dt) {
        dt = Math.min(dt, 0.05);
        if (S.auto) S.biasTarget = autoBias(t);
        S.bias += (S.biasTarget - S.bias) * Math.min(1, dt * (S.auto ? 12 : 3.2));
        var V = S.bias, I = diodeI(V), f = flowOf(I);
        S.w = depW(V);
        // ions: uncovered inside the depletion zone
        for (var i = 0; i < ions.length; i++) {
          var o = ions[i];
          var target = 1 - K.smoothstep(S.w - 0.14, S.w + 0.14, Math.abs(o.x));
          o.unc += (target - o.unc) * Math.min(1, dt * 5);
        }
        // targets: one mobile carrier per covered ion (charge neutrality)
        var tp = 0, tn = 0;
        for (var j = 0; j < ions.length; j++) { if (ions[j].side < 0) tp += 1 - ions[j].unc; else tn += 1 - ions[j].unc; }
        var drift = f * 0.9;
        var mot = K.reducedMotion ? 0.5 : 1;
        stepCarriers(holes, -1, dt * mot, t, tp, drift);
        stepCarriers(elecs, 1, dt * mot, t, tn, drift);
        // recombination events under forward bias
        S.recAcc += f * 3.6 * dt * mot;
        while (S.recAcc >= 1) { S.recAcc -= 1; if (!triggerRecombination(t)) break; }
        // shell uniforms
        backMat.userData.u.uW.value = frontMat.userData.u.uW.value = S.w;
        barBox.scale.x = Math.max(0.01, 2 * S.w);
        barBox.material.opacity = 0.17 + 0.05 * Math.min(1, S.w / W0);
        fitCam(v, 24, 9.6, 4.35, S);
        S.intro = Math.min(1, S.intro + dt / 0.9);
        // labels
        labRec.show(f > 0.35);
        var fwd = V > 0.05, rev = V < -0.05;
        labPlateL.set(rev ? '−' : (fwd ? '+' : ''));
        labPlateR.set(rev ? '+' : (fwd ? '−' : ''));
        labPlateL.el.style.color = rev ? P.blue : P.copper;
        labPlateR.el.style.color = rev ? P.copper : P.blue;
        labDepNote.set(rev ? 'genişler: akım geçmez' : (f > 0.35 ? 'daralır: taşıyıcılar geçer' : (fwd ? 'daralıyor: akım henüz çok az' : 'denge: taşıyıcısız ince bölge')));
        disp.update(fmtV(Math.round(V * 10) / 10, 1));
        if (!K.skipRender) {
          drawIons();
          drawCarriers();
          drawBeads(dt);
          drawFlashes(t);
        } else {
          for (var w2 = 0; w2 < 2; w2++) S.phase[w2] += (S.phaseT[w2] - S.phase[w2]) * Math.min(1, dt * 2.4);
        }
        v.render(dt);
        /* the I-V inset and the legend are no longer drawn (focus-slide format keeps one idea on screen) */
      },
      resize: function () {},
      dispose: function () { v.dispose(); }
    };
  });

  /* =====================================================================
   * 2) led-physics · S 680×520 · light
   * ===================================================================== */
  function hslRGB(h, s, l) {
    h = (((h % 360) + 360) % 360) / 60;
    var c = (1 - Math.abs(2 * l - 1)) * s, x = c * (1 - Math.abs(h % 2 - 1)), m = l - c / 2;
    var r = 0, g = 0, b = 0;
    if (h < 1) { r = c; g = x; } else if (h < 2) { r = x; g = c; } else if (h < 3) { g = c; b = x; }
    else if (h < 4) { g = x; b = c; } else if (h < 5) { r = x; b = c; } else { r = c; b = x; }
    return [r + m, g + m, b + m];
  }
  var SPEC_H = [[380, 272], [420, 258], [440, 246], [465, 228], [480, 212], [490, 194], [505, 152], [525, 128], [560, 82], [580, 56], [600, 36], [630, 8], [660, 0], [720, 0]];
  function specRGB(nm) {
    var h = 0;
    for (var i = 0; i < SPEC_H.length - 1; i++) {
      if (nm <= SPEC_H[i + 1][0]) { var a = SPEC_H[i], b = SPEC_H[i + 1]; h = a[1] + (b[1] - a[1]) * (nm - a[0]) / (b[0] - a[0]); break; }
    }
    var c = hslRGB(h, 0.74, 0.5);
    var e = nm < 425 ? K.smoothstep(380, 425, nm) : nm > 665 ? 1 - K.smoothstep(665, 720, nm) : 1;
    var d = [0.25, 0.26, 0.3];
    return [d[0] + (c[0] - d[0]) * e, d[1] + (c[1] - d[1]) * e, d[2] + (c[2] - d[2]) * e];
  }
  var LEDC = {
    kirmizi: { nm: 630, hex: 0xE5391F, css: '#E5391F', name: 'kırmızı', Name: 'Kırmızı', mat: 'AlGaInP' },
    yesil: { nm: 525, hex: 0x22B04A, css: '#22B04A', name: 'yeşil', Name: 'Yeşil', mat: 'InGaN' },
    mavi: { nm: 465, hex: 0x2F5FEA, css: '#2F5FEA', name: 'mavi', Name: 'Mavi', mat: 'InGaN' }
  };
  function evOf(key) { return 1240 / LEDC[key].nm; }

  /* Photon wave packet: a sine under a Gaussian envelope, as a thin tube along local x. */
  function packetGeo(lambda, cycles, amp, radius) {
    var THREE = window.THREE;
    var L = lambda * cycles, N = Math.ceil(cycles * 18), pts = [];
    for (var i = 0; i <= N; i++) {
      var x = -L / 2 + L * i / N;
      var env = Math.exp(-Math.pow(x / (L * 0.3), 2));
      pts.push(new THREE.Vector3(x, amp * env * Math.sin(2 * Math.PI * x / lambda), 0));
    }
    return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), N * 2, radius, 6, false);
  }

  K.register('led-physics', function (el, opts) {
    var THREE = window.THREE;
    opts = opts || {};
    var theme = opts.theme || 'light';
    var dark = theme === 'dark';
    var v = K.stage3d(el, {
      theme: theme, fov: 26, distance: 9, yaw: 0.1, pitch: 0.07, target: [0, 0.6, 0],
      size: 5, ground: -1.12, minYaw: -0.5, maxYaw: 0.8, minPitch: 0, maxPitch: 0.75, minDistance: 3, maxDistance: 30
    });
    var scene = v.scene;
    if (v.lights && v.lights.ground) v.lights.ground.material.opacity = 0.08;
    var rng = K.rng(4471);
    var tmpCol = new THREE.Color();
    var ORDER = ['kirmizi', 'yesil', 'mavi'];

    /* ---- magnified chip: n layer (bottom), junction, p layer (top) ---- */
    var CX = 0, CW = 6.0, CD = 1.5, Y0 = -1.15, YN = -0.1, YP = 0.1, Y1 = 0.95;
    var chipH = Y1 - Y0, chipCY = (Y0 + Y1) / 2;
    var chipGeo = roundedBox(CW, chipH, CD, 0.07, 3);
    var tN = new THREE.Color(0xCFDAF3), tP = new THREE.Color(0xF2D3BD), tA = new THREE.Color(0xFFFFFF);
    var chipBackMat = glassMat({ side: THREE.BackSide, axis: 'y', center: -chipCY, w: 0.12, p: tN, n: tP, mid: tA, opacity: 0.55, edge: 0.4, rough: 0.5, env: 0.3, lineA: 0.5, dash: false });
    var chipFrontMat = glassMat({ side: THREE.FrontSide, axis: 'y', center: -chipCY, w: 0.12, p: tN, n: tP, mid: tA, opacity: 0.15, edge: 2.4, rough: 0.12, env: 1.0, lineA: 0.65, dash: false });
    var chipBack = new THREE.Mesh(chipGeo, chipBackMat), chipFront = new THREE.Mesh(chipGeo, chipFrontMat);
    chipBack.position.set(CX, chipCY, 0); chipFront.position.set(CX, chipCY, 0);
    chipBack.renderOrder = 1; chipFront.renderOrder = 3;
    scene.add(chipBack, chipFront);
    var chipShadow = new THREE.Mesh(roundedBox(CW, chipH, CD, 0.07, 1), new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false }));
    chipShadow.position.copy(chipBack.position);
    chipShadow.castShadow = true;
    scene.add(chipShadow);
    var activeMat = new THREE.MeshBasicMaterial({ color: LEDC.kirmizi.hex, transparent: true, opacity: 0.2, depthWrite: false, toneMapped: false });
    var active = new THREE.Mesh(new THREE.BoxGeometry(CW - 0.12, YP - YN, CD - 0.12), activeMat);
    active.position.set(CX, 0, 0);
    active.renderOrder = 2;
    scene.add(active);
    var gold = K.mat.gold({ roughness: 0.28 });
    var base = new THREE.Mesh(roundedBox(CW + 0.1, 0.12, CD + 0.1, 0.04, 2), gold);
    base.position.set(CX, Y0 - 0.06, 0);
    base.castShadow = true; base.receiveShadow = true;
    scene.add(base);
    var PADX = CX - CW / 2 + 0.9;
    var pad = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.05, 36), gold);
    pad.position.set(PADX, Y1 + 0.025, 0);
    scene.add(pad);
    var ball = new THREE.Mesh(new THREE.SphereGeometry(0.1, 24, 12), gold);
    ball.scale.y = 0.62;
    ball.position.set(PADX, Y1 + 0.08, 0);
    scene.add(ball);
    var bond = K.wire([[PADX, Y1 + 0.1, 0], [PADX, Y1 + 0.32, 0], [PADX - 0.3, Y1 + 0.6, 0], [PADX - 1.1, Y1 + 0.74, 0], [PADX - 3.4, Y1 + 0.8, 0]], { radius: 0.032, material: gold, tension: 0.5, castShadow: false });
    scene.add(bond);

    /* ---- band diagram ---- */
    var DX = 2.15, DW = 2.2, DD = 0.8, BT = 0.36, EV = -0.88, KE = 0.8;
    var bandGeo = roundedBox(DW, BT, DD, 0.06, 3);
    function bandPair(tint) {
      var b = new THREE.Mesh(bandGeo, glassMat({ side: THREE.BackSide, p: tint, n: tint, mid: tint, opacity: 0.6, edge: 0.4, rough: 0.5, env: 0.3 }));
      var f = new THREE.Mesh(bandGeo, glassMat({ side: THREE.FrontSide, p: tint, n: tint, mid: tint, opacity: 0.2, edge: 2.2, rough: 0.12, env: 1.0 }));
      b.renderOrder = 1; f.renderOrder = 3;
      var g = new THREE.Group();
      g.add(b, f);
      scene.add(g);
      return g;
    }
    var vb = bandPair(tP), cb = bandPair(tN);
    vb.position.set(DX, EV - BT / 2, 0);
    vb.visible = cb.visible = false;   // band diagram removed from the screen (kept in the notes)

    /* ---- carriers ---- */
    function pool(n) { var a = []; for (var i = 0; i < n; i++) a.push({ st: 0, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, a: 0, sx: 0, sy: 0, sz: 0, tx: 0, ty: 0, tz: 0, t0: 0, dur: 1, ly: 0, ev: null }); return a; }
    var NE = 14, NH = 12, ND = 6;
    var cE = pool(NE), cH = pool(NH), dE = pool(ND), dH = pool(ND);
    var eGeo = new THREE.IcosahedronGeometry(0.105, 2), hGeo = new THREE.TorusGeometry(0.115, 0.03, 8, 28);
    var eMat = K.mat.electron(dark), hMat = K.mat.hole();
    var ceMesh = instances(eGeo, eMat, NE), chMesh = instances(hGeo, hMat, NH);
    var deMesh = instances(eGeo, eMat, ND), dhMesh = instances(hGeo, hMat, ND);
    scene.add(ceMesh, chMesh, deMesh, dhMesh);
    var RE = { x0: CX - CW / 2 + 0.16, x1: CX + CW / 2 - 0.16, y0: Y0 + 0.12, y1: YN - 0.06, z0: -0.48, z1: 0.48 };
    var RH = { x0: CX - CW / 2 + 0.16, x1: CX + CW / 2 - 0.16, y0: YP + 0.06, y1: Y1 - 0.12, z0: -0.48, z1: 0.48 };
    var RD = { x0: DX - DW / 2 + 0.2, x1: DX + DW / 2 - 0.2, z0: -0.22, z1: 0.22 };

    /* ---- photons and flashes ---- */
    var pGeo = {};
    ORDER.forEach(function (k) { pGeo[k] = packetGeo(0.3 * LEDC[k].nm / 630, 4, 0.12, 0.03); });
    var photons = [];
    for (var pi = 0; pi < 14; pi++) {
      var pm = new THREE.Mesh(pGeo.kirmizi, new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false, toneMapped: false }));
      pm.renderOrder = 6;
      pm.visible = false;
      var pg = glowSprite(0xffffff, 0.75, 0);
      pg.renderOrder = 5;
      scene.add(pm, pg);
      photons.push({ m: pm, g: pg, on: false, t0: 0, x: 0, y: 0, z: 0, dx: 1, dy: 0, dz: 0, sp: 1.4, life: 1.6, key: 'kirmizi' });
    }
    var flashes = [];
    for (var fi = 0; fi < 6; fi++) {
      var fs = glowSprite(0xffffff, 0.8, 0);
      fs.renderOrder = 5;
      scene.add(fs);
      flashes.push({ s: fs, t: -9, x: 0, y: 0, z: 0, key: 'kirmizi', big: 1 });
    }
    var basis = new THREE.Matrix4(), bx = new THREE.Vector3(), by = new THREE.Vector3(), bz = new THREE.Vector3(), viewV = new THREE.Vector3();

    /* ---- labels ---- */
    var tagChip = v.label('LED çipinin büyütülmüş kesiti · yavaşlatılmış · ölçekli değil', { at: screenAt(v, 18, 20), cls: 'tag', align: 'left' });
    tagChip.el.style.fontSize = '13px';
    var labP = bigLab(v.label('p tipi', { at: [CX - CW / 2, (YP + Y1) / 2, CD / 2], cls: 'name', dx: -18, align: 'right', line: true }), 20, true);
    var labJn = bigLab(v.label('ışık burada doğar', { at: [CX - CW / 2, 0, CD / 2], cls: 'name', dx: -18, align: 'right', line: true }), 20, true);
    var labN = bigLab(v.label('n tipi', { at: [CX - CW / 2, (Y0 + YN) / 2, CD / 2], cls: 'name', dx: -18, align: 'right', line: true }), 20, true);
    var labPlus = v.label('+', { at: [PADX - 2.0, Y1 + 0.78, 0], cls: 'value', dy: -20 });
    var labMinus = v.label('−', { at: [CX - CW / 2 - 0.1, Y0 - 0.06, CD / 2], cls: 'value', dx: -22, align: 'right' });
    labPlus.el.style.color = P.copper; labMinus.el.style.color = P.blue;
    labPlus.el.style.fontSize = labMinus.el.style.fontSize = '32px';
    labPlus.el.style.fontWeight = labMinus.el.style.fontWeight = '600';
    var anchorCB = new THREE.Vector3(), anchorVB = new THREE.Vector3(), anchorBr = new THREE.Vector3();
    var labMat = { set: function () {} }, labEv = labMat, labEvF = labMat, labNeed = labMat;
    var phAnchor = new THREE.Vector3();
    var labPh = bigLab(v.label('foton', { at: function () { return phAnchor; }, cls: 'name', dx: 16, align: 'left' }), 18, true);
    labPh.show(false);

    /* ---- state ---- */
    var S = {};
    var EVI = 1.0, LEAD = 1.4, FALL = 0.38;
    function seed(arr, n, R, chip) {
      for (var i = 0; i < arr.length; i++) {
        var c = arr[i];
        c.ev = null;
        if (i < n) {
          c.st = 1; c.a = 1;
          c.x = K.lerp(R.x0, R.x1, (i + 0.5) / n + (rng() - 0.5) * 0.12);
          c.y = chip ? K.lerp(R.y0, R.y1, rng()) : 0;
          c.ly = chip ? 0 : (rng() - 0.5) * 0.12;
          c.z = K.lerp(R.z0, R.z1, rng());
          c.vx = c.vy = c.vz = 0;
        } else { c.st = 0; c.a = 0; }
      }
    }
    function reset() {
      rng = K.rng(4471);
      S.fitKey = '';
      S.auto = !K.reducedMotion;
      S.key = 'kirmizi';
      S.gap = evOf('kirmizi');
      S.col = new THREE.Color(LEDC.kirmizi.hex);
      S.nextEv = 1.0;
      S.glow = 0;
      S.cool = [0, 0, 0, 0];
      S.intro = K.reducedMotion ? 1 : 0;
      S.lastPh = null;
      seed(cE, 12, RE, true); seed(cH, 10, RH, true); seed(dE, 0, RD, false); seed(dH, 0, RD, false);
      photons.forEach(function (p) { p.on = false; p.m.visible = false; p.g.visible = false; });
      flashes.forEach(function (f) { f.t = -9; f.s.visible = false; });
      v.setView({ yaw: v.home.yaw, pitch: v.home.pitch, distance: v.home.distance, target: v.home.target.toArray() });
    }

    function ecOf(gap) { return EV + KE * gap; }

    function pick(arr, score) {
      var best = -1, bs = -1e9;
      for (var i = 0; i < arr.length; i++) if (arr[i].st === 1) { var s = score(arr[i]); if (s > bs) { bs = s; best = i; } }
      return best < 0 ? null : arr[best];
    }

    function startEvent(tm) {
      var ev = { tm: tm, key: S.key, done: false };
      // chip: the electron nearest the junction and a hole nearest the junction meet in the junction
      var e = pick(cE, function (c) { return c.y + rng() * 0.35; });
      var h = pick(cH, function (c) { return -c.y + rng() * 0.35; });
      if (e && h) {
        var mx = K.clamp((e.x + h.x) / 2 + (rng() - 0.5) * 0.3, CX - CW / 2 + 0.3, CX + CW / 2 - 0.3);
        var mz = K.clamp((e.z + h.z) / 2, -0.35, 0.45);
        [e, h].forEach(function (c) { c.st = 3; c.t0 = tm - LEAD; c.dur = LEAD; c.sx = c.x; c.sy = c.y; c.sz = c.z; c.tx = mx; c.ty = 0; c.tz = mz; c.ev = ev; });
        ev.cx = mx; ev.cz = mz; ev.chip = true;
      }
      return ev;
    }
    var events = [];

    function emitPhoton(x, y, z, dx, dy, dz, key, t, sp, life) {
      for (var i = 0; i < photons.length; i++) {
        var p = photons[i];
        if (p.on) continue;
        var l = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1;
        p.on = true; p.t0 = t; p.x = x; p.y = y; p.z = z; p.dx = dx / l; p.dy = dy / l; p.dz = dz / l; p.key = key; p.sp = sp; p.life = life;
        p.m.geometry = pGeo[key];
        p.m.material.color.setHex(LEDC[key].hex);
        p.g.material.color.setHex(LEDC[key].hex);
        return p;
      }
    }
    function flash(x, y, z, key, t, big) {
      for (var i = 0; i < flashes.length; i++) {
        var f = flashes[i];
        if (t - f.t < 0.7) continue;
        f.t = t; f.x = x; f.y = y; f.z = z; f.key = key; f.big = big;
        f.s.material.color.setHex(LEDC[key].hex);
        return;
      }
    }

    function stepChip(arr, R, dir, dt, t, target, ci) {
      // dir: +1 electrons drift up towards the junction, −1 holes drift down
      var n = 0;
      for (var i = 0; i < arr.length; i++) if (arr[i].st === 1 || arr[i].st === 4) n++;
      S.cool[ci] -= dt;
      if (n < target && S.cool[ci] <= 0) {
        for (var j = 0; j < arr.length; j++) if (arr[j].st === 0) {
          var c = arr[j];
          c.st = 4; c.a = 0; c.ev = null;
          c.x = K.lerp(R.x0, R.x1, rng());
          c.y = dir > 0 ? R.y0 : R.y1;
          c.z = K.lerp(R.z0, R.z1, rng());
          c.vx = (rng() - 0.5) * 0.3; c.vy = dir * 0.35; c.vz = (rng() - 0.5) * 0.2;
          S.cool[ci] = 0.3;
          break;
        }
      }
      var damp = Math.exp(-1.5 * dt);
      for (var k = 0; k < arr.length; k++) {
        var p = arr[k];
        if (p.st === 0) continue;
        if (p.st === 3) {
          var u = K.clamp((t - p.t0) / p.dur, 0, 1), e = K.ease.inOut(u);
          p.x = K.lerp(p.sx, p.tx, e); p.y = K.lerp(p.sy, p.ty, e); p.z = K.lerp(p.sz, p.tz, e);
          if (u >= 1) { p.st = 0; p.a = 0; p.ev = null; }
          continue;
        }
        if (p.st === 4) { p.a = Math.min(1, p.a + dt / 0.4); if (p.a >= 1) p.st = 1; }
        p.vx = p.vx * damp + (rng() - 0.5) * 4 * dt;
        p.vy = p.vy * damp + (rng() - 0.5) * 4 * dt + dir * 0.18 * dt;
        p.vz = p.vz * damp + (rng() - 0.5) * 4 * dt;
        for (var m = 0; m < arr.length; m++) {
          if (m === k || (arr[m].st !== 1 && arr[m].st !== 4)) continue;
          var ddx = p.x - arr[m].x, ddy = p.y - arr[m].y, ddz = p.z - arr[m].z, d2 = ddx * ddx + ddy * ddy + ddz * ddz;
          if (d2 < 0.16 && d2 > 1e-6) { var dd = Math.sqrt(d2), f = (1 - dd / 0.4) * 0.9 * dt / dd; p.vx += ddx * f; p.vy += ddy * f; p.vz += ddz * f; }
        }
        p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
        if (p.x < R.x0) { p.x = R.x0; p.vx = Math.abs(p.vx); } else if (p.x > R.x1) { p.x = R.x1; p.vx = -Math.abs(p.vx); }
        if (p.y < R.y0) { p.y = R.y0; p.vy = Math.abs(p.vy); } else if (p.y > R.y1) { p.y = R.y1; p.vy = -Math.abs(p.vy); }
        if (p.z < R.z0) { p.z = R.z0; p.vz = Math.abs(p.vz); } else if (p.z > R.z1) { p.z = R.z1; p.vz = -Math.abs(p.vz); }
      }
    }

    function stepBand(arr, dt, t, target, ci, isE) {
      var n = 0;
      for (var i = 0; i < arr.length; i++) if (arr[i].st === 1 || arr[i].st === 4) n++;
      S.cool[ci] -= dt;
      if (n < target && S.cool[ci] <= 0) {
        for (var j = 0; j < arr.length; j++) if (arr[j].st === 0) {
          var c = arr[j];
          c.st = 4; c.a = 0; c.ev = null;
          c.x = K.lerp(RD.x0, RD.x1, rng()); c.z = K.lerp(RD.z0, RD.z1, rng()); c.ly = (rng() - 0.5) * 0.12;
          c.vx = (rng() - 0.5) * 0.3; c.vz = 0;
          S.cool[ci] = 0.45;
          break;
        }
      }
      var damp = Math.exp(-1.2 * dt);
      for (var k = 0; k < arr.length; k++) {
        var p = arr[k];
        if (p.st === 0 || p.st === 5) continue;
        if (p.st === 3) {
          // move above the hole, then fall
          var u = K.clamp((t - p.t0) / (LEAD - FALL), 0, 1), e = K.ease.inOut(u);
          p.x = K.lerp(p.sx, p.tx, e); p.z = K.lerp(p.sz, p.tz, e);
          continue;
        }
        if (p.st === 4) { p.a = Math.min(1, p.a + dt / 0.5); if (p.a >= 1) p.st = 1; }
        p.vx = p.vx * damp + (rng() - 0.5) * 2.4 * dt;
        p.vz = p.vz * damp + (rng() - 0.5) * 1.2 * dt;
        for (var m = 0; m < arr.length; m++) {
          if (m === k || (arr[m].st !== 1 && arr[m].st !== 4)) continue;
          var ddx = p.x - arr[m].x;
          if (Math.abs(ddx) < 0.4) p.vx += Math.sign(ddx || 1) * (0.4 - Math.abs(ddx)) * 2.2 * dt;
        }
        p.x += p.vx * dt; p.z += p.vz * dt;
        if (p.x < RD.x0) { p.x = RD.x0; p.vx = Math.abs(p.vx); } else if (p.x > RD.x1) { p.x = RD.x1; p.vx = -Math.abs(p.vx); }
        if (p.z < RD.z0) { p.z = RD.z0; p.vz = Math.abs(p.vz); } else if (p.z > RD.z1) { p.z = RD.z1; p.vz = -Math.abs(p.vz); }
      }
    }

    var camQ = new THREE.Quaternion();
    function draw(t, ec) {
      camQ.copy(v.camera.quaternion);
      var g = S.intro;
      for (var i = 0; i < NE; i++) { var e = cE[i]; if (e.st === 0) ceMesh.hide(i); else ceMesh.put(i, e.x, e.y, e.z, e.a * g); }
      for (var j = 0; j < NH; j++) { var h = cH[j]; if (h.st === 0) chMesh.hide(j); else chMesh.put(j, h.x, h.y, h.z, h.a * g, h.a * g, h.a * g, camQ); }
      var cbMid = ec + BT / 2, vbMid = EV - BT / 2;
      for (var k = 0; k < ND; k++) {
        var de = dE[k];
        if (de.st === 0) deMesh.hide(k);
        else {
          var y = cbMid + de.ly;
          if (de.st === 3 && de.ev) {
            var fu = K.clamp((t - (de.ev.tm - FALL)) / FALL, 0, 1);
            y = K.lerp(cbMid + de.ly, vbMid, fu * fu);
            de.y = y;
          }
          deMesh.put(k, de.x, y, de.z, de.a * g);
        }
        var dh = dH[k];
        if (dh.st === 0) dhMesh.hide(k); else dhMesh.put(k, dh.x, vbMid + dh.ly, dh.z, dh.a * g, dh.a * g, dh.a * g, camQ);
      }
      ceMesh.done(); chMesh.done(); deMesh.done(); dhMesh.done();
      // photons
      for (var p = 0; p < photons.length; p++) {
        var ph = photons[p];
        if (!ph.on) { ph.m.visible = false; ph.g.visible = false; continue; }
        var age = t - ph.t0;
        if (age > ph.life || age < 0) { ph.on = false; ph.m.visible = false; ph.g.visible = false; continue; }
        var d = ph.sp * age;
        var px = ph.x + ph.dx * d, py = ph.y + ph.dy * d, pz = ph.z + ph.dz * d;
        var op = K.smoothstep(0, 0.12, age) * (1 - K.smoothstep(ph.life * 0.65, ph.life, age));
        ph.m.visible = ph.g.visible = true;
        ph.m.position.set(px, py, pz);
        bx.set(ph.dx, ph.dy, ph.dz);
        viewV.copy(v.camera.position).sub(ph.m.position).normalize();
        by.crossVectors(viewV, bx).normalize();
        bz.crossVectors(bx, by);
        basis.makeBasis(bx, by, bz);
        ph.m.quaternion.setFromRotationMatrix(basis);
        ph.m.material.opacity = op;
        ph.g.position.set(px, py, pz);
        ph.g.material.opacity = op * 0.42;
        ph.g.scale.setScalar(1.35);
      }
      for (var f = 0; f < flashes.length; f++) {
        var F = flashes[f], fa = t - F.t;
        if (fa < 0 || fa > 0.7) { F.s.visible = false; continue; }
        F.s.visible = true;
        F.s.position.set(F.x, F.y, F.z);
        var kq = fa / 0.7;
        F.s.scale.setScalar((0.5 + 1.1 * K.ease.out(kq)) * F.big);
        F.s.material.opacity = (1 - kq) * (1 - kq) * 0.95;
      }
    }

    /* ---- 2D: transition arrow, gap bracket, spectrum strip ---- */
    var pA = new THREE.Vector3(), pB = new THREE.Vector3();
    var stripLayer = null, stripK = 0;
    var SX0 = 44, SX1 = 636, SY = 452, SH = 11;
    var NMT = [400, 450, 500, 550, 600, 650, 700], EVT = [1.8, 2.0, 2.2, 2.4, 2.6, 2.8, 3.0];
    function nmX(nm) { return SX0 + (nm - 380) / (720 - 380) * (SX1 - SX0); }
    function buildStrip() {
      stripK = K.pixelRatio();
      stripLayer = K.layer(SX1 - SX0, SH);
      var c = stripLayer.ctx, w = SX1 - SX0;
      for (var i = 0; i < w; i++) {
        var rgb = specRGB(380 + (720 - 380) * (i + 0.5) / w);
        c.fillStyle = 'rgb(' + Math.round(rgb[0] * 255) + ',' + Math.round(rgb[1] * 255) + ',' + Math.round(rgb[2] * 255) + ')';
        c.fillRect(i, 0, 1.2, SH);
      }
    }
    function draw2D(t, ec) {
      var ctx = v.ctx;
      var ink = dark ? P.onNight : P.ink, mut = dark ? P.onNightMuted : P.muted;
      ctx.save();
      // gap bracket (left of the band diagram)
      var bxw = DX - DW / 2 - 0.2;
      var a = v.project(pA.set(bxw, EV, DD / 2)), b = v.project(pB.set(bxw, ec, DD / 2));
      ctx.strokeStyle = ink; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.moveTo(a.x - 5, a.y + 0.5); ctx.lineTo(a.x + 5, a.y + 0.5); ctx.moveTo(b.x - 5, b.y + 0.5); ctx.lineTo(b.x + 5, b.y + 0.5); ctx.stroke();
      K.arrow(ctx, (a.x + b.x) / 2, (a.y + b.y) / 2, b.x, b.y + 1, { color: ink, width: 1.2, head: 6 });
      K.arrow(ctx, (a.x + b.x) / 2, (a.y + b.y) / 2, a.x, a.y - 1, { color: ink, width: 1.2, head: 6 });
      // dashed guides from the bracket to the band edges
      ctx.setLineDash([2, 3]);
      ctx.strokeStyle = K.rgba(dark ? P.onNightMuted : P.muted, 0.6);
      var a2 = v.project(pA.set(DX - DW / 2 + 0.05, EV, DD / 2)), b2 = v.project(pB.set(DX - DW / 2 + 0.05, ec, DD / 2));
      ctx.beginPath(); ctx.moveTo(a.x + 5, a.y + 0.5); ctx.lineTo(a2.x, a2.y + 0.5); ctx.moveTo(b.x + 5, b.y + 0.5); ctx.lineTo(b2.x, b2.y + 0.5); ctx.stroke();
      ctx.setLineDash([]);
      // falling-electron arrows
      for (var i = 0; i < events.length; i++) {
        var ev = events[i];
        if (!ev.diag) continue;
        var u = (t - (ev.tm - FALL)) / FALL;
        if (u < 0 || u > 1.6) continue;
        var al = u <= 1 ? 0.75 : 0.75 * (1 - (u - 1) / 0.6);
        var top = v.project(pA.set(ev.dx, ec, ev.dz)), bot = v.project(pB.set(ev.dx, EV, ev.dz));
        var yy = K.lerp(top.y, bot.y, Math.min(1, u * u));
        ctx.save();
        ctx.globalAlpha = al;
        ctx.setLineDash([3, 3]);
        ctx.strokeStyle = P.blue; ctx.lineWidth = 1.3;
        ctx.beginPath(); ctx.moveTo(top.x, top.y); ctx.lineTo(top.x + (bot.x - top.x) * Math.min(1, u * u), yy); ctx.stroke();
        ctx.restore();
      }
      // spectrum strip with the photon-energy scale above and the wavelength scale below
      if (!stripLayer || stripK !== K.pixelRatio()) buildStrip();
      var nmT = NMT, evT = EVT;
      ctx.drawImage(stripLayer.canvas, SX0, SY, SX1 - SX0, SH);
      ctx.strokeStyle = dark ? 'rgba(255,255,255,0.18)' : 'rgba(21,23,28,0.14)';
      ctx.lineWidth = 1;
      ctx.strokeRect(SX0 + 0.5, SY + 0.5, SX1 - SX0 - 1, SH - 1);
      var nmNow = 1240 / S.gap, xm = nmX(nmNow);
      for (var n1 = 0; n1 < nmT.length; n1++) {
        var xn = Math.round(nmX(nmT[n1])) + 0.5;
        ctx.strokeStyle = mut; ctx.beginPath(); ctx.moveTo(xn, SY + SH); ctx.lineTo(xn, SY + SH + 4); ctx.stroke();
        if (Math.abs(xn - xm) > 30) K.label(ctx, String(nmT[n1]), xn, SY + SH + 16, { size: 12, mono: true, color: mut, align: 'center' });
      }
      K.label(ctx, String(Math.round(nmNow)), xm, SY + SH + 16, { size: 12.5, mono: true, weight: 500, color: ink, align: 'center' });
      K.label(ctx, 'nm', SX1 + 6, SY + SH + 16, { size: 12, mono: true, color: mut, align: 'left' });
      for (var e1 = 0; e1 < evT.length; e1++) {
        var xe = Math.round(nmX(1240 / evT[e1])) + 0.5;
        ctx.strokeStyle = mut; ctx.beginPath(); ctx.moveTo(xe, SY - 4); ctx.lineTo(xe, SY); ctx.stroke();
        if (Math.abs(xe - xm) > 30) K.label(ctx, K.num(evT[e1], 1), xe, SY - 8, { size: 12, mono: true, color: mut, align: 'center' });
      }
      K.label(ctx, K.num(S.gap, 2), xm, SY - 14, { size: 12.5, mono: true, weight: 500, color: ink, align: 'center' });
      K.label(ctx, 'eV', SX1 + 6, SY - 8, { size: 12, mono: true, color: mut, align: 'left' });
      K.label(ctx, 'foton enerjisi', SX0 - 2, SY - 22, { size: 12, color: mut, align: 'left' });
      K.label(ctx, 'dalga boyu', SX0 - 2, SY + SH + 31, { size: 12, color: mut, align: 'left' });
      // marker at the current wavelength (eased with the gap)
      ctx.strokeStyle = ink; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(xm, SY - 4); ctx.lineTo(xm, SY + SH + 4); ctx.stroke();
      ctx.strokeStyle = dark ? P.night : '#FFFFFF'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(xm - 2.5, SY + 1); ctx.lineTo(xm - 2.5, SY + SH - 1); ctx.moveTo(xm + 2.5, SY + 1); ctx.lineTo(xm + 2.5, SY + SH - 1); ctx.stroke();
      ctx.restore();
    }

    reset();

    return {
      reset: reset,
      set: function (key, val) {
        if (key === 'color' && LEDC[val]) { S.auto = false; S.key = val; }
      },
      read: function (key) {
        var c = LEDC[S.key], E = 1240 / c.nm, Es = K.num(E, 1);
        if (key === 'wavelength') return c.nm + ' nm';
        if (key === 'energy') return '≈ ' + Es + ' eV';
        if (key === 'formula') {
          var Vs = Es.replace(/,0$/, '');
          var NB = ' ';
          return '1240 ÷ ' + c.nm + ' ≈' + NB + Es + NB + 'eV → ' + c.name + ' LED en az ≈' + NB + Vs + NB + 'V ister';
        }
        if (key === 'material') return c.mat;
        if (key === 'explain') {
          if (S.key === 'yesil') return 'Enerji aralığı büyüdükçe dalga boyu kısalır: yeşil LED, 525 nm.';
          if (S.key === 'mavi') return 'En büyük enerji aralığı en kısa dalga boyunu verir: mavi LED, 465 nm.';
          return 'Elektron boşlukla birleşir, enerjisini foton verir: kırmızı LED, 630 nm.';
        }
        return '';
      },
      frame: function (t, dt) {
        dt = Math.min(dt, 0.05);
        if (S.auto) S.key = ORDER[Math.floor(Math.max(0, t) / 9) % 3];
        var tg = evOf(S.key);
        S.gap += (tg - S.gap) * Math.min(1, dt * 3.2);
        S.col.lerp(tmpCol.setHex(LEDC[S.key].hex), Math.min(1, dt * 3.2));
        S.intro = Math.min(1, S.intro + dt / 0.8);
        var ec = ecOf(S.gap);
        var slow = K.reducedMotion ? 1.8 : 1;
        // schedule events
        while (t >= S.nextEv - LEAD) { events.push(startEvent(S.nextEv)); S.nextEv += EVI * slow; }
        // resolve events at their meeting time
        for (var i = events.length - 1; i >= 0; i--) {
          var ev = events[i];
          if (!ev.done && t >= ev.tm) {
            ev.done = true;
            if (ev.chip) {
              flash(ev.cx, 0, ev.cz, ev.key, ev.tm, 1.5);
              var ang = (rng() - 0.5) * 1.5 + K.clamp((CX - ev.cx) * 0.12, -0.3, 0.3);
              S.lastPh = emitPhoton(ev.cx, 0.02, ev.cz, Math.sin(ang), Math.cos(ang), 0.18, ev.key, ev.tm, 1.5, 1.35);
              S.glow = 1;
            }

          }
          if (t > ev.tm + 2) events.splice(i, 1);
        }
        for (var q = 0; q < photons.length; q++) { var phq = photons[q]; if (phq.on && t - phq.t0 > phq.life) { phq.on = false; phq.m.visible = false; phq.g.visible = false; } }
        stepChip(cE, RE, 1, dt / slow, t, 12, 0);
        stepChip(cH, RH, -1, dt / slow, t, 10, 1);
        S.glow = Math.max(0, S.glow - dt * 1.6);
        // band positions and colours
        cb.position.set(DX, ec + BT / 2, 0);
        anchorCB.set(DX + DW / 2, ec + BT, 0);
        anchorBr.set(DX - DW / 2 - 0.2, (EV + ec) / 2, DD / 2);
        activeMat.color.copy(S.col);
        activeMat.opacity = 0.16 + 0.32 * S.glow;
        var c = LEDC[S.key];
        labEv.set(K.num(S.gap, 2) + ' eV');
        labEvF.set('1240 ÷ ' + c.nm);
        labMat.set(c.mat);
        labNeed.set(c.Name + ' LED en az ≈ ' + K.num(evOf(S.key), 1).replace(/,0$/, '') + ' V ister');
        var lp = S.lastPh;
        if (lp && lp.on && t - lp.t0 > 0.35 && t - lp.t0 < lp.life * 0.8) {
          var dd = lp.sp * (t - lp.t0);
          phAnchor.set(lp.x + lp.dx * dd, lp.y + lp.dy * dd, lp.z + lp.dz * dd);
          labPh.set('foton · ' + LEDC[lp.key].nm + ' nm');
          labPh.el.style.color = LEDC[lp.key].css;
          labPh.show(true);
        } else labPh.show(false);
        fitCam(v, 26, 9.4, 4.3, S);
        if (!K.skipRender) draw(t, ec);
        v.render(dt);
      },
      resize: function () { stripLayer = null; },
      dispose: function () { v.dispose(); }
    };
  });

  /* =====================================================================
   * 3) led-anatomy · S 680×520 · light
   *    5 mm LED per Builder G's standard (mm units, flange bottom at y = 0,
   *    anode lead at x = +1,27, cathode lead and flange flat at −x).
   * ===================================================================== */
  function extrudePoly(pts, depth, bevel) {
    var THREE = window.THREE;
    var s = new THREE.Shape();
    s.moveTo(pts[0][0], pts[0][1]);
    for (var i = 1; i < pts.length; i++) s.lineTo(pts[i][0], pts[i][1]);
    s.closePath();
    var b = bevel || 0;
    var g = new THREE.ExtrudeGeometry(s, { depth: depth - 2 * b, bevelEnabled: b > 0, bevelThickness: b, bevelSize: b, bevelSegments: 2, curveSegments: 6 });
    g.translate(0, 0, -(depth - 2 * b) / 2);
    g.computeVertexNormals();
    return g;
  }
  function wedgeTexture() {
    var THREE = window.THREE;
    var c = document.createElement('canvas');
    c.width = 128; c.height = 256;
    var x = c.getContext('2d');
    var img = x.createImageData(128, 256);
    for (var j = 0; j < 256; j++) {
      var v0 = j / 255;                       // 0 at the apex (bottom of texture is v=0 in UV, top row j=0 is v=1)
      var along = 1 - v0;                    // distance from apex, 0..1
      for (var i = 0; i < 128; i++) {
        var u = (i + 0.5) / 128 * 2 - 1;      // −1..1 across
        var across = Math.abs(u);
        var hw = 0.16 + 0.84 * Math.pow(along, 0.8);   // the beam widens with distance (a cone)
        var a = Math.pow(Math.max(0, 1 - across / hw), 1.5) * Math.pow(1 - along, 1.2) * K.smoothstep(0, 0.05, along + 0.02);
        var k = (j * 128 + i) * 4;
        img.data[k] = 255; img.data[k + 1] = 255; img.data[k + 2] = 255; img.data[k + 3] = Math.round(255 * a);
      }
    }
    x.putImageData(img, 0, 0);
    var t = new THREE.CanvasTexture(c);
    return t;
  }

  K.register('led-anatomy', function (el, opts) {
    var THREE = window.THREE;
    opts = opts || {};
    var theme = opts.theme || 'light';
    var dark = theme === 'dark';
    var v = K.stage3d(el, {
      theme: theme, fov: 26, distance: 24, yaw: 0, pitch: 0.1, target: [6.4, -5.6, 0],
      size: 26, ground: -21.5, minPitch: -0.3, maxPitch: 0.9, minDistance: 8, maxDistance: 110
    });
    var scene = v.scene;
    if (v.lights) {
      v.lights.key.position.set(18, 34, 30);
      if (v.lights.ground) v.lights.ground.material.opacity = 0;
    }

    /* ---- rigs: tilt (fixed) → spin (about the LED axis) → parts ---- */
    var TILT = -Math.PI / 2 + 0.1;   // lens points to the right, legs to the left (fills a wide box)
    var tilt = new THREE.Group();
    tilt.rotation.z = TILT;
    scene.add(tilt);
    var spin = new THREE.Group();
    tilt.add(spin);
    var gBody = new THREE.Group(), gCath = new THREE.Group(), gAnode = new THREE.Group();
    spin.add(gBody, gCath, gAnode);

    /* ---- epoxy body (lathe) with the flat on the cathode side of the flange ---- */
    var prof = [[0, 0], [2.78, 0], [2.88, 0.04], [2.9, 0.12], [2.9, 0.9], [2.86, 0.97], [2.78, 1.0], [2.5, 1.0], [2.5, 6.1]];
    for (var di = 1; di <= 24; di++) { var aa = di / 24 * Math.PI / 2; prof.push([2.5 * Math.cos(aa), 6.1 + 2.5 * Math.sin(aa)]); }
    var epoxyGeo = new THREE.LatheGeometry(prof.map(function (p) { return new THREE.Vector2(Math.max(0.0001, p[0]), p[1]); }), 96);
    (function flatten() {
      var pos = epoxyGeo.attributes.position;
      for (var k = 0; k < pos.count; k++) {
        if (pos.getY(k) <= 1.0005 && pos.getX(k) < -2.55) pos.setX(k, -2.55);
      }
      epoxyGeo.computeVertexNormals();
    })();
    // slightly red-tinted clear epoxy: a light red volume (far wall) + a clear glossy skin
    var epoxyBackMat = skinMat({ color: 0xE04A36, opacity: 0.3, fres: 0.12, specA: 0.04, rim: 0x6E140A, rimAmt: 0.35, emissive: 0xFF2A12, env: 0.4, side: THREE.BackSide });
    var epoxyMat = skinMat({ color: 0xF7C9C0, opacity: 0.07, fres: 0.42, specA: 0.9, rim: 0x8C2416, rimAmt: 0.42, emissive: 0xFF3418, env: 1.25 });
    var epoxyBack = new THREE.Mesh(epoxyGeo, epoxyBackMat);
    epoxyBack.renderOrder = 4;
    var epoxy = new THREE.Mesh(epoxyGeo, epoxyMat);
    epoxy.renderOrder = 6;
    gBody.add(epoxyBack, epoxy);

    /* ---- lead frame ---- */
    var frameMat = K.mat.tin({ roughness: 0.26 });
    var silver = K.mat.std(0xEDEFF2, 0.12, 1, { envMapIntensity: 1.2 });
    var goldM = K.mat.gold({ roughness: 0.22 });
    // cathode anvil (flag) + reflector cup + die
    var anvil = new THREE.Mesh(extrudePoly([[-1.52, -0.02], [-1.02, -0.02], [-1.02, 2.0], [-0.62, 2.55], [-0.62, 3.32], [-1.78, 3.32], [-1.78, 2.55], [-1.52, 2.2]], 0.5, 0.04), frameMat);
    var cupProf = [[0.0001, 3.8], [0.3, 3.8], [0.74, 4.42], [0.79, 4.46], [0.86, 4.46], [0.9, 4.42], [0.9, 3.36], [0.84, 3.3], [0.0001, 3.3]];
    var cup = new THREE.Mesh(new THREE.LatheGeometry(cupProf.map(function (p) { return new THREE.Vector2(p[0], p[1]); }), 48), silver);
    cup.position.x = -0.2;
    var dieMat = new THREE.MeshStandardMaterial({ color: 0x5E2A22, roughness: 0.45, metalness: 0.1, emissive: 0xFF2A12, emissiveIntensity: 0 });
    var die = new THREE.Mesh(roundedBox(0.25, 0.16, 0.25, 0.015, 1), dieMat);
    die.position.set(-0.2, 3.88, 0);
    var diePad = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.02, 16), goldM);
    diePad.position.set(-0.2, 3.97, 0);
    var legC = new THREE.Mesh(roundedBox(0.5, 25, 0.5, 0.06, 2), frameMat);
    legC.position.set(-1.27, -12.5, 0);
    gCath.add(anvil, cup, die, diePad, legC);
    // anode post + gold bond wire (ball bond on the die, wedge bond on the post)
    var post = new THREE.Mesh(extrudePoly([[1.02, -0.02], [1.52, -0.02], [1.52, 3.55], [1.42, 4.25], [0.92, 4.25], [0.92, 3.95], [1.02, 3.6]], 0.5, 0.04), frameMat);
    var legA = new THREE.Mesh(roundedBox(0.5, 27, 0.5, 0.06, 2), frameMat);
    legA.position.set(1.27, -13.5, 0);
    var bondCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.2, 3.98, 0), new THREE.Vector3(-0.18, 4.5, 0), new THREE.Vector3(0.05, 4.92, 0),
      new THREE.Vector3(0.55, 4.98, 0), new THREE.Vector3(0.98, 4.6, 0), new THREE.Vector3(1.12, 4.27, 0)
    ], false, 'catmullrom', 0.5);
    var bond = new THREE.Mesh(new THREE.TubeGeometry(bondCurve, 64, 0.03, 8, false), goldM);
    var ballBond = new THREE.Mesh(new THREE.SphereGeometry(0.055, 16, 10), goldM);
    ballBond.position.set(-0.2, 3.99, 0);
    gAnode.add(post, legA, bond, ballBond);
    [anvil, cup, legC, post, legA].forEach(function (m) { m.castShadow = true; m.receiveShadow = true; });
    var bodyShadow = new THREE.Mesh(epoxyGeo, new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false }));
    bodyShadow.castShadow = true;
    gBody.add(bodyShadow);

    /* ---- light: die glow, internal red light, beam through the lens ---- */
    var ledLight = new THREE.PointLight(0xFF3A20, 0, 14, 2);
    ledLight.position.set(-0.2, 4.15, 0);
    gCath.add(ledLight);
    var glowA = glowSprite(0xFF3B22, 3.6, 0);
    glowA.position.set(-0.2, 4.0, 0);
    glowA.renderOrder = 7;
    gCath.add(glowA);
    var glowB = glowSprite(0xFFD2C0, 0.9, 0);
    glowB.position.set(-0.2, 4.0, 0);
    glowB.renderOrder = 8;
    gCath.add(glowB);
    var halo = glowSprite(0xFF4528, 9, 0);
    halo.position.set(-0.1, 5.6, 0);
    halo.renderOrder = 3;
    gBody.add(halo);
    var beamMat = new THREE.MeshBasicMaterial({ map: wedgeTexture(), color: 0xFF4A2E, transparent: true, opacity: 0, depthWrite: false, toneMapped: false, side: THREE.DoubleSide });
    var beamGeo = new THREE.PlaneGeometry(1, 1);
    beamGeo.translate(0, 0.5, 0);
    var beam = new THREE.Mesh(beamGeo, beamMat);
    beam.renderOrder = 2;
    scene.add(beam);

    /* ---- labels: fixed screen slots with elbow leader lines ---- */
    var W = new THREE.Vector3();
    function lp(obj, a, b) {
      var pA = new THREE.Vector3().fromArray(a), pB = new THREE.Vector3().fromArray(b || a);
      return function (e) { return obj.localToWorld(W.copy(pA).lerp(pB, e)); };
    }
    /* positions are fractions of the box; A = assembled, E = exploded; sa/se = visibility in each view */
    var LBL = [
      { t: 'epoksi mercek', a: lp(gBody, [0.8, 8.2, 1.4]), A: [0.8, 0.1], E: [0.86, 0.1], sa: 1, se: 1 },
      { t: 'düz kenar: katot tarafı', a: lp(gBody, [-2.55, 0.5, 0.6]), A: [0.43, 0.1], E: [0.43, 0.1], sa: 1, se: 0, right: true },
      { t: 'katot (−): kısa bacak', a: lp(gCath, [-1.27, -6.5, 0.25]), A: [0.14, 0.1], E: [0.14, 0.1], sa: 1, se: 0 },
      { t: 'anot (+): uzun bacak', a: lp(gAnode, [1.27, -6.5, 0.25]), A: [0.14, 0.9], E: [0.14, 0.9], sa: 1, se: 0 },
      { t: 'altın bağlantı teli', a: lp(gAnode, [0.55, 4.98, 0.03]), A: [0.5, 0.1], E: [0.5, 0.1], sa: 0, se: 1 },
      { t: 'yarı iletken çip (≈ 0,25 mm)', a: lp(gCath, [-0.2, 3.92, 0.13]), A: [0.52, 0.9], E: [0.53, 0.9], sa: 0, se: 1 },
      { t: 'yansıtıcı çanak', a: lp(gCath, [-0.86, 4.36, 0.3]), A: [0.33, 0.9], E: [0.33, 0.9], sa: 0, se: 1, right: true }
    ];
    LBL.forEach(function (L) {
      L.pos = [0, 0];
      L.lab = v.label(L.t, { at: (function (LL) { var p = new THREE.Vector3(); return function () { p.set(LL.pos[0] / Math.max(1, v.w) * 2 - 1, -(LL.pos[1] / Math.max(1, v.h)) * 2 + 1, 0).unproject(v.camera); return p; }; })(L), cls: 'name', align: 'center' });
      bigLab(L.lab, 18, true);
      L.alpha = 1;
    });
    var tagOn = { show: function () {}, set: function () {} };

    /* ---- state ---- */
    var S = {};
    var CAM = {
      A: { t: new THREE.Vector3(), d: 24 },
      E: { t: new THREE.Vector3(), d: 30 }
    };
    tilt.updateMatrixWorld(true);
    CAM.A.t.set(0, 3.0, 0).applyMatrix4(tilt.matrixWorld);
    CAM.E.t.set(0, 4.8, 0).applyMatrix4(tilt.matrixWorld);
    function fitAnat() {
      if (!v.w || !v.h) return;
      var key = v.w + 'x' + v.h;
      if (S.fitKey === key) return;
      S.fitKey = key;
      var th = Math.tan(26 * Math.PI / 360) * 2, asp = v.w / v.h;
      CAM.A.d = Math.max(8.6 / th, 20 / (asp * th));
      CAM.E.d = Math.max(8.6 / th, 21.5 / (asp * th));
    }
    function reset() {
      S.fitKey = '';
      S.auto = !K.reducedMotion;
      S.ex = 0; S.exT = 0;
      S.on = 1; S.onV = 1;
      S.userCam = false;
      v.setView({ yaw: 0, pitch: 0.1, distance: CAM.A.d, target: CAM.A.t.toArray() });
    }
    var axisW = new THREE.Vector3(), apex = new THREE.Vector3(), xb = new THREE.Vector3(), yb = new THREE.Vector3(), zb = new THREE.Vector3(), mB = new THREE.Matrix4(), toCam = new THREE.Vector3();
    var pa = new THREE.Vector3();
    reset();

    return {
      reset: reset,
      set: function (key, val) {
        var n = +val;
        if (key === 'exploded') { S.auto = false; S.exT = n ? 1 : 0; }
        else if (key === 'on') { S.on = n ? 1 : 0; }
      },
      read: function (key) {
        if (key === 'exploded') return S.exT ? 'Parçalarına ayrılmış görünüm' : 'Bütün LED';
        if (key === 'on') return S.on ? 'LED yanıyor' : 'LED sönük';
        if (key === 'explain') return S.ex > 0.5 ? 'Kubbe kalkınca içindeki çip, altın tel ve yansıtıcı çanak görünür.' : 'Uzun bacak anot (+), kısa bacak ve düz kenar katottur (−).';
        return '';
      },
      frame: function (t, dt) {
        dt = Math.min(dt, 0.05);
        if (S.auto) { var cyc = ((t % 20) + 20) % 20; S.exT = (cyc >= 7 && cyc < 17) ? 1 : 0; }
        fitAnat();
        var rate = K.reducedMotion ? 0.4 : 0.5;
        S.ex += K.clamp(S.exT - S.ex, -dt * rate, dt * rate);
        var e = K.ease.inOut(K.clamp(S.ex, 0, 1));
        S.onV += (S.on - S.onV) * Math.min(1, dt * 5);
        // spin gently about the LED's own axis
        var ph = K.reducedMotion ? 0 : Math.sin(t * 2 * Math.PI / 18);
        spin.rotation.y = -0.32 + 0.3 * ph;
        // explode: the epoxy lifts along the axis, the two halves of the lead frame part slightly
        gBody.position.y = 5.4 * e;
        // the die and its gold wire stay together: the contact must not be cut while the chip shines
        // camera follows the explode state
        var vw = v.view;
        vw.target.lerpVectors(CAM.A.t, CAM.E.t, e);
        vw.distance = K.lerp(CAM.A.d, CAM.E.d, e);
        // light
        var L = S.onV;
        dieMat.emissiveIntensity = 3.2 * L;
        dieMat.color.setRGB(K.lerp(0.37, 0.95, L), K.lerp(0.16, 0.32, L), K.lerp(0.13, 0.22, L));
        epoxyMat.emissiveIntensity = 0.3 * L * (1 - 0.75 * e);
        halo.material.opacity = 0.42 * L * (1 - e);
        epoxyBackMat.emissiveIntensity = 0.95 * L * (1 - 0.8 * e);
        ledLight.intensity = 0.9 * L;
        glowA.material.opacity = 0.7 * L;
        glowB.material.opacity = 0.95 * L;
        glowA.scale.setScalar(3.0 + 0.6 * e);
        tagOn.show(L > 0.5);
        tagOn.set(e > 0.5 ? 'merceksiz: ışık geniş bir açıyla dağılır' : 'mercek ışığı dar bir demete toplar');
        // beam: focused by the lens (assembled) or wide from the bare cup (exploded)
        scene.updateMatrixWorld(true);
        axisW.set(0, 1, 0).transformDirection(spin.matrixWorld);
        var apexLocal = K.lerp(8.6, 4.5, e);
        apex.set(-0.2, apexLocal, 0);
        spin.localToWorld(apex);
        var len = K.lerp(6, 6.5, e), wid = K.lerp(6.2, 10, e);
        toCam.copy(v.camera.position).sub(apex).normalize();
        yb.copy(axisW);
        xb.crossVectors(yb, toCam).normalize();
        zb.crossVectors(xb, yb);
        mB.makeBasis(xb, yb, zb);
        beam.quaternion.setFromRotationMatrix(mB);
        beam.position.copy(apex).addScaledVector(axisW, -0.4);
        beam.scale.set(wid, len, 1);
        beamMat.opacity = K.lerp(0.42, 0.26, e) * L;
        v.render(dt);
        if (K.skipRender) return;
        // labels and leader lines
        var ctx = v.ctx;
        for (var i = 0; i < LBL.length; i++) {
          var Lb = LBL[i];
          Lb.pos[0] = K.lerp(Lb.A[0], Lb.E[0], e) * v.w;
          Lb.pos[1] = K.lerp(Lb.A[1], Lb.E[1], e) * v.h;
          var al = K.lerp(Lb.sa, Lb.se, e);
          Lb.lab.el.style.opacity = al.toFixed(3);
          if (al < 0.02) continue;
          var P2 = v.project(Lb.a(e));
          var lw = Lb.lab.el.offsetWidth;
          var ey = Lb.pos[1] + (Lb.pos[1] < v.h / 2 ? 15 : -15);
          var ex = Lb.pos[0], kx = Lb.pos[0];
          ctx.save();
          ctx.globalAlpha = al;
          ctx.strokeStyle = dark ? 'rgba(154,163,178,.75)' : 'rgba(89,94,105,.72)';
          ctx.fillStyle = ctx.strokeStyle;
          ctx.lineWidth = 1;
          ctx.beginPath(); ctx.moveTo(P2.x, P2.y); ctx.lineTo(kx, ey); ctx.stroke();
          ctx.beginPath(); ctx.arc(P2.x, P2.y, 2.2, 0, Math.PI * 2); ctx.fill();
          ctx.restore();
          if (lw < 0) break;
        }
      },
      resize: function () {},
      dispose: function () { v.dispose(); }
    };
  });

  /* =====================================================================
   * Shared small parts: 5 mm LED (Builder G standard) and an axial resistor
   * ===================================================================== */
  function makeMiniLED(scale, legA, legC) {
    var THREE = window.THREE;
    var g = new THREE.Group();
    var prof = [[0, 0], [2.78, 0], [2.88, 0.04], [2.9, 0.12], [2.9, 0.9], [2.86, 0.97], [2.78, 1.0], [2.5, 1.0], [2.5, 6.1]];
    for (var i = 1; i <= 16; i++) { var a = i / 16 * Math.PI / 2; prof.push([2.5 * Math.cos(a), 6.1 + 2.5 * Math.sin(a)]); }
    var geo = new THREE.LatheGeometry(prof.map(function (p) { return new THREE.Vector2(Math.max(0.0001, p[0]), p[1]); }), 48);
    var pos = geo.attributes.position;
    for (var k = 0; k < pos.count; k++) if (pos.getY(k) <= 1.0005 && pos.getX(k) < -2.55) pos.setX(k, -2.55);
    geo.computeVertexNormals();
    var backM = skinMat({ color: 0xE04A36, opacity: 0.34, fres: 0.12, specA: 0.04, rim: 0x6E140A, rimAmt: 0.35, emissive: 0xFF2A12, env: 0.4, side: THREE.BackSide });
    var frontM = skinMat({ color: 0xF7C9C0, opacity: 0.08, fres: 0.42, specA: 0.9, rim: 0x8C2416, rimAmt: 0.42, emissive: 0xFF3418, env: 1.25 });
    var b = new THREE.Mesh(geo, backM), f = new THREE.Mesh(geo, frontM);
    b.renderOrder = 4; f.renderOrder = 6;
    var frame = K.mat.tin({ roughness: 0.28 });
    var anvil = new THREE.Mesh(extrudePoly([[-1.52, -0.02], [-1.02, -0.02], [-1.02, 2.0], [-0.62, 2.55], [-0.62, 3.32], [-1.78, 3.32], [-1.78, 2.55], [-1.52, 2.2]], 0.5, 0.03), frame);
    var post = new THREE.Mesh(extrudePoly([[1.02, -0.02], [1.52, -0.02], [1.52, 3.55], [1.42, 4.25], [0.92, 4.25], [0.92, 3.95], [1.02, 3.6]], 0.5, 0.03), frame);
    var cup = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.84, 1.1, 24), K.mat.std(0xEDEFF2, 0.14, 1));
    cup.position.set(-0.2, 3.9, 0);
    var dieM = new THREE.MeshStandardMaterial({ color: 0x5E2A22, roughness: 0.45, emissive: 0xFF2A12, emissiveIntensity: 0 });
    var die = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.2, 0.4), dieM);
    die.position.set(-0.2, 4.55, 0);
    var lA = new THREE.Mesh(roundedBox(0.5, legA, 0.5, 0.06, 1), frame);
    lA.position.set(1.27, -legA / 2, 0);
    var lC = new THREE.Mesh(roundedBox(0.5, legC, 0.5, 0.06, 1), frame);
    lC.position.set(-1.27, -legC / 2, 0);
    var glow = glowSprite(0xFF3B22, 14, 0);
    glow.position.set(-0.2, 5.0, 0);
    glow.renderOrder = 7;
    var core = glowSprite(0xFFD2C0, 3.2, 0);
    core.position.set(-0.2, 4.7, 0);
    core.renderOrder = 8;
    g.add(b, f, anvil, post, cup, die, lA, lC, glow, core);
    [anvil, post, lA, lC].forEach(function (m) { m.castShadow = true; });
    g.scale.setScalar(scale);
    return {
      group: g,
      set: function (L) {
        dieM.emissiveIntensity = 3.4 * L;
        dieM.color.setRGB(K.lerp(0.37, 0.95, L), K.lerp(0.16, 0.32, L), K.lerp(0.13, 0.22, L));
        frontM.emissiveIntensity = 0.16 * L;
        backM.emissiveIntensity = 0.85 * L;
        glow.material.opacity = 0.62 * L;
        core.material.opacity = 0.9 * L;
        glow.scale.setScalar(10 + 6 * L);
      }
    };
  }
  var BAND = { 0: '#1B1B1B', 1: '#6B3A1F', 2: '#C42B1C', 3: '#E07A1F', 4: '#E8C21A', 5: '#2E8B3A', 6: '#2A58C7', 7: '#7A3BB0', 8: '#8A8A8A', 9: '#F2F2F2', gold: '#C9A13B' };
  function makeResistor(scale, digits) {
    // axial carbon film: body 6,3 × 2,4 mm, bulged ends, Ø0,6 mm tinned leads (Builder G standard)
    var THREE = window.THREE;
    var g = new THREE.Group();
    var prof = [[0.0001, -3.15], [0.7, -3.15], [1.05, -3.05], [1.22, -2.75], [1.25, -2.3], [1.16, -1.85], [1.08, -1.5], [1.08, 1.5], [1.16, 1.85], [1.25, 2.3], [1.22, 2.75], [1.05, 3.05], [0.7, 3.15], [0.0001, 3.15]];
    var geo = new THREE.LatheGeometry(prof.map(function (p) { return new THREE.Vector2(p[0], p[1]); }), 40);
    // colour bands as thin rings (exact placement, crisp edges)
    var bodyM = K.mat.std(0xE3D2B0, 0.55, 0);
    var body = new THREE.Mesh(geo, bodyM);
    g.add(body);
    var ys = [-2.3, -1.25, -0.25, 1.9];
    var cols = [BAND[digits[0]], BAND[digits[1]], BAND[digits[2]], BAND.gold];
    for (var i = 0; i < 4; i++) {
      var r = i === 0 || i === 3 ? 1.265 : 1.095;
      var ring = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 0.55, 40, 1, true), i === 3 ? K.mat.std(0xC9A13B, 0.35, 0.8) : K.mat.std(new THREE.Color(cols[i]).getHex(), 0.5, 0));
      ring.position.y = ys[i];
      g.add(ring);
    }
    var leadM = K.mat.tin({ roughness: 0.3 });
    var lead = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 14, 10), leadM);
    g.add(lead);
    body.castShadow = true;
    g.rotation.z = Math.PI / 2;
    g.scale.setScalar(scale);
    return g;
  }

  /* =====================================================================
   * 4) mosfet · S 680×520 · light
   *    n-channel enhancement MOSFET in cross-section, wired to a supply:
   *    0 V → S, gate output → G, +5 V → 330 Ω → LED → D.
   * ===================================================================== */
  K.register('mosfet', function (el, opts) {
    var THREE = window.THREE;
    opts = opts || {};
    var theme = opts.theme || 'light';
    var dark = theme === 'dark';
    var v = K.stage3d(el, {
      theme: theme, fov: 24, distance: 11, yaw: -0.1, pitch: 0.16, target: [0.08, -0.25, 0],
      size: 5, ground: -2.4, minPitch: -0.05, maxPitch: 0.9, minYaw: -0.9, maxYaw: 0.7, minDistance: 4, maxDistance: 40
    });
    var scene = v.scene;
    if (v.lights && v.lights.ground) v.lights.ground.material.opacity = 0.05;
    var rng = K.rng(9050);

    /* ---- cross-section geometry (front face at z = FZ) ---- */
    var BW = 8.8, BH = 2.4, BD = 2.0, FZ = BD / 2;
    var WX = 1.05, WD = 0.85, WR = 0.42;          // well inner edge, depth, corner radius
    var OXT = 0.1, GL = 1.2;                       // oxide thickness (exaggerated), gate half-length
    var XMAX = BW / 2 - 0.13;
    function wellOf(x, y, m) {
      // which n+ well contains (x, y) on the face: −1 source, +1 drain, 0 none; m > 0 grows the well
      m = m || 0;
      var ax = Math.abs(x);
      if (ax < WX - m || y < -WD - m || y > m) return 0;
      var cx = WX + WR, cy = -WD + WR;
      if (ax < cx && y < cy) {
        var dx = ax - cx, dy = y - cy;
        if (dx * dx + dy * dy > (WR + m) * (WR + m)) return 0;
      }
      return x < 0 ? -1 : 1;
    }
    var faceTex = K.textTexture(1600, 600, function (c, w, h) {
      var sx = w / BW, sy = h / BH;
      function X(x) { return (x + BW / 2) * sx; }
      function Y(y) { return -y * sy; }
      c.fillStyle = '#F0DCCB'; c.fillRect(0, 0, w, h);
      c.fillStyle = 'rgba(166,75,34,0.13)';
      for (var gx = 0.15; gx < BW; gx += 0.3) for (var gy = 0.15; gy < BH; gy += 0.3) { c.beginPath(); c.arc(gx * sx, gy * sy, 2, 0, Math.PI * 2); c.fill(); }
      [-1, 1].forEach(function (s) {
        var r = WR * sx, xin = s < 0 ? X(-WX) : X(WX), xout = s < 0 ? 0 : w, yb = Y(-WD);
        c.beginPath();
        c.moveTo(xout, 0); c.lineTo(xin, 0); c.lineTo(xin, yb - r);
        c.arcTo(xin, yb, xin - s * r * -1 + (s < 0 ? -r : r) * 0, yb, r);
        c.lineTo(xout, yb);
        c.closePath();
        c.fillStyle = '#C9D6F2'; c.fill();
        c.lineWidth = 3; c.strokeStyle = 'rgba(35,67,176,0.45)';
        c.beginPath(); c.moveTo(xin, 0); c.lineTo(xin, yb - r); c.arcTo(xin, yb, s < 0 ? xin - r : xin + r, yb, r); c.lineTo(xout, yb); c.stroke();
        c.fillStyle = 'rgba(35,67,176,0.62)';
        c.textAlign = 'center'; c.textBaseline = 'middle';
        var lx = s < 0 ? X(-BW / 2 + 0.5) : X(BW / 2 - 0.5);
        c.font = "600 80px 'IBM Plex Sans', 'Segoe UI', sans-serif";
        c.fillText('n', lx, Y(-0.6));
      });
      c.fillStyle = 'rgba(166,75,34,0.7)';
      c.textAlign = 'center'; c.textBaseline = 'middle';
      c.font = "600 80px 'IBM Plex Sans', 'Segoe UI', sans-serif";
      c.fillText('p', X(-2.55), Y(-1.95));
      c.font = "600 44px 'IBM Plex Sans', 'Segoe UI', sans-serif";
      c.fillStyle = 'rgba(150,66,28,0.92)';
      c.textAlign = 'left';
      c.fillText('tipi silisyum (taban)', X(-2.32), Y(-1.98));
    });
    var block = new THREE.Mesh(roundedBox(BW, BH, BD, 0.05, 3), K.mat.std(0xD8D1CA, 0.6, 0.05));
    block.position.set(0, -BH / 2, 0);
    block.castShadow = true; block.receiveShadow = true;
    scene.add(block);
    var face = new THREE.Mesh(new THREE.PlaneGeometry(BW - 0.06, BH - 0.06), new THREE.MeshBasicMaterial({ map: faceTex, toneMapped: false }));
    face.position.set(0, -BH / 2, FZ + 0.002);
    scene.add(face);
    [-1, 1].forEach(function (s) {
      var strip = new THREE.Mesh(new THREE.PlaneGeometry(BW / 2 - WX - 0.04, BD - 0.06), K.mat.std(0xC9D6F2, 0.7, 0));
      strip.rotation.x = -Math.PI / 2;
      strip.position.set(s * (WX + (BW / 2 - WX) / 2 - 0.02), 0.003, 0);
      strip.receiveShadow = true;
      scene.add(strip);
    });
    var oxide = new THREE.Mesh(roundedBox(2 * GL + 0.12, OXT, BD - 0.02, 0.02, 2), new THREE.MeshPhysicalMaterial({ color: 0xF6F8FA, roughness: 0.1, metalness: 0, transparent: true, opacity: 0.88, clearcoat: 1, clearcoatRoughness: 0.08 }));
    oxide.position.set(0, OXT / 2, 0);
    oxide.receiveShadow = true;
    scene.add(oxide);
    var gate = new THREE.Mesh(roundedBox(2 * GL - 0.1, 0.42, BD - 0.08, 0.04, 3), K.mat.std(0x7C838D, 0.34, 0.85));
    gate.position.set(0, OXT + 0.21, 0);
    gate.castShadow = true;
    scene.add(gate);
    var contactM = K.mat.aluminium({ roughness: 0.3 });
    [-1, 1].forEach(function (s) {
      var c = new THREE.Mesh(roundedBox(1.3, 0.22, BD - 0.4, 0.04, 2), contactM);
      c.position.set(s * 2.25, 0.11, 0);
      c.castShadow = true; c.receiveShadow = true;
      scene.add(c);
    });
    var pinM = K.mat.tin({ roughness: 0.3 });
    var PIN_TOP = 1.0, XS = -2.25, XG = 0, XD = 2.25;
    [[XS, 0.22], [XG, OXT + 0.42], [XD, 0.22]].forEach(function (p) {
      var h = PIN_TOP - p[1];
      var pin = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, h, 12), pinM);
      pin.position.set(p[0], p[1] + h / 2, 0);
      pin.castShadow = true;
      scene.add(pin);
      var cap = new THREE.Mesh(new THREE.SphereGeometry(0.07, 16, 10), pinM);
      cap.position.set(p[0], PIN_TOP, 0);
      scene.add(cap);
    });

    /* ---- supply bar: 0 V (common), gate output (display), +5 V ---- */
    var BOX = { y: 3.36, w: 6.3, h: 0.62, d: 0.8 };
    var box = new THREE.Mesh(roundedBox(BOX.w, BOX.h, BOX.d, 0.1, 4), K.mat.std(0xDAD8D1, 0.55, 0));
    box.position.set(0, BOX.y, 0);
    box.castShadow = true;
    scene.add(box);
    var DISPX = -1.12;
    var gDisp = liveTexture(512, 160, function (c, w, h, txt) {
      c.fillStyle = '#161A21'; c.fillRect(0, 0, w, h);
      c.font = "500 92px 'IBM Plex Mono', Consolas, monospace";
      c.fillStyle = '#EEF0F3'; c.textAlign = 'right'; c.textBaseline = 'middle';
      c.fillText(txt, w - 30, h * 0.54);
    });
    var bez = new THREE.Mesh(roundedBox(1.3, 0.44, 0.05, 0.04, 2), K.mat.std(0x23272F, 0.4, 0));
    bez.position.set(DISPX, BOX.y + 0.02, BOX.d / 2 + 0.01);
    scene.add(bez);
    var dispM = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.375), new THREE.MeshBasicMaterial({ map: gDisp.tex, toneMapped: false }));
    dispM.position.set(DISPX, BOX.y + 0.02, BOX.d / 2 + 0.04);
    scene.add(dispM);
    var POSTY = BOX.y - 0.02, POSTZ = BOX.d / 2;
    var XP = 2.38;
    function post(color, x) {
      var g = new THREE.Group();
      var ring = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.05, 24), K.mat.tin());
      ring.rotation.x = Math.PI / 2; ring.position.z = 0.025;
      var knob = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.095, 0.17, 24), K.mat.std(color, 0.42, 0));
      knob.rotation.x = Math.PI / 2; knob.position.z = 0.13;
      g.add(ring, knob);
      g.position.set(x, POSTY, POSTZ);
      scene.add(g);
    }
    post(0x22252B, XS); post(0xD9A21B, XG); post(0xB3352A, XP);

    /* ---- drain line: +5 V → 330 Ω → LED (lying, dome towards the gate) → D ---- */
    var LS = 0.085, LX = 1.6, LY = 1.56;
    var led = makeMiniLED(LS, 9, 7.5);
    led.group.rotation.z = Math.PI / 2;
    led.group.position.set(LX, LY, 0);
    scene.add(led.group);
    var anodeEnd = new THREE.Vector3(LX + 9 * LS, LY + 1.27 * LS, 0), cathEnd = new THREE.Vector3(LX + 7.5 * LS, LY - 1.27 * LS, 0);
    var ledLight = new THREE.PointLight(0xFF3A20, 0, 3.2, 2);
    ledLight.position.set(LX - 0.6, LY + 0.2, 0.4);
    scene.add(ledLight);
    var res = makeResistor(0.085, [3, 3, 1]);
    res.rotation.z = 0;
    var RY = 2.43;
    res.position.set(anodeEnd.x, RY, 0);
    scene.add(res);
    var RTOP = RY + 0.6, RBOT = RY - 0.6;

    /* ---- wires (z = 0 plane, hanging from the posts) ---- */
    var insBlack = K.mat.plasticBlack({ roughness: 0.45 }), insRed = K.mat.plasticRed({ roughness: 0.45 }), insYel = K.mat.std(0xD9A21B, 0.45, 0);
    var hang = function (x, yEnd) { return [[x, POSTY, POSTZ + 0.21], [x, POSTY - 0.2, POSTZ + 0.12], [x, POSTY - 0.55, 0.06], [x, yEnd, 0]]; };
    var wS = K.wire(hang(XS, PIN_TOP + 0.03).concat([]), { radius: 0.04, material: insBlack });
    var wG = K.wire(hang(XG, PIN_TOP + 0.03), { radius: 0.04, material: insYel });
    var wP = K.wire(hang(XP, RTOP), { radius: 0.04, material: insRed });
    var wA = K.wire([[XP, RBOT, 0], [XP, (RBOT + anodeEnd.y) / 2, 0], [anodeEnd.x, anodeEnd.y + 0.02, 0]], { radius: 0.04, material: insRed });
    var wD = K.wire([[cathEnd.x, cathEnd.y - 0.02, 0], [cathEnd.x - 0.05, (cathEnd.y + PIN_TOP) / 2, 0], [XD, PIN_TOP + 0.03, 0]], { radius: 0.04, material: insBlack });
    scene.add(wS, wG, wP, wA, wD);
    var joints = [anodeEnd, cathEnd].map(function (p) { var j = new THREE.Mesh(new THREE.SphereGeometry(0.055, 16, 10), K.mat.tin({ roughness: 0.25 })); j.position.copy(p); scene.add(j); return j; });
    // electron paths in the outer circuit (electron direction)
    function sp(w, n) { return w.curve.getSpacedPoints(n); }
    var pathS = sp(wS, 100);
    var pathD = [].concat(sp(wD, 30).reverse(), sp(wA, 30).reverse(), sp(wP, 70).reverse());
    function cumul(pts) { var c = [0]; for (var i = 1; i < pts.length; i++) c.push(c[i - 1] + pts[i].distanceTo(pts[i - 1])); return c; }
    var paths = [pathS, pathD].map(function (p) { var c = cumul(p); return { p: p, c: c, L: c[c.length - 1] }; });
    var GAP = 0.28;
    var nb = [Math.floor(paths[0].L / GAP), Math.floor(paths[1].L / GAP)];
    var beads = instances(new THREE.IcosahedronGeometry(0.05, 1), K.mat.electron(dark), nb[0] + nb[1]);
    scene.add(beads);
    function pointAt(P, s, out) {
      var c = P.c, lo = 0, hi = c.length - 1;
      while (hi - lo > 1) { var mid = (lo + hi) >> 1; if (c[mid] < s) lo = mid; else hi = mid; }
      var f = (s - c[lo]) / Math.max(1e-6, c[hi] - c[lo]);
      return out.copy(P.p[lo]).lerp(P.p[hi], f);
    }

    /* ---- carriers on the cut face ---- */
    var CZ = FZ + 0.07;
    function pool(n) { var a = []; for (var i = 0; i < n; i++) a.push({ x: 0, y: 0, z: 0, vx: 0, vy: 0, a: 1, w: 0 }); return a; }
    var NHOLE = 36, NWELL = 12, NCH = 18;
    var holesC = pool(NHOLE), wellE = pool(NWELL * 2), chE = pool(NCH);
    var hMesh = instances(new THREE.TorusGeometry(0.085, 0.024, 8, 28), K.mat.hole(), NHOLE);
    var eMesh = instances(new THREE.IcosahedronGeometry(0.075, 2), K.mat.electron(dark), NWELL * 2 + NCH);
    scene.add(hMesh, eMesh);
    var chanM = new THREE.MeshBasicMaterial({ color: 0x3550C8, transparent: true, opacity: 0, depthWrite: false, toneMapped: false });
    var chan = new THREE.Mesh(new THREE.PlaneGeometry(2 * WX + 0.3, 0.13), chanM);
    chan.position.set(0, -0.07, FZ + 0.012);
    chan.renderOrder = 2;
    scene.add(chan);
    var depM = new THREE.MeshBasicMaterial({ color: 0xFFFFFF, transparent: true, opacity: 0, depthWrite: false, toneMapped: false });
    var dep = new THREE.Mesh(new THREE.PlaneGeometry(2 * WX - 0.02, 1), depM);
    dep.renderOrder = 1;
    scene.add(dep);
    var NPLUS = 8;
    var plusMat = new THREE.MeshBasicMaterial({ color: 0xC8693A, toneMapped: false });
    var plusH = instances(new THREE.BoxGeometry(1, 1, 1), plusMat, NPLUS), plusV = instances(new THREE.BoxGeometry(1, 1, 1), plusMat, NPLUS);
    scene.add(plusH, plusV);

    /* ---- labels ---- */
    bigLab(v.label('S · kaynak', { at: [XS, 0.62, 0], cls: 'name', dx: -12, align: 'right' }), 20, true);
    bigLab(v.label('G · kapı', { at: [XG, 0.82, 0], cls: 'name', dx: 14, align: 'left' }), 20, true);
    bigLab(v.label('D · akaç', { at: [XD, 0.62, 0], cls: 'name', dx: 14, align: 'left' }), 20, true);
    var labGv = v.label('0,0 V', { at: [XG, 1.12, 0], cls: 'value', dy: -4 });
    labGv.el.style.fontSize = '24px'; labGv.el.style.fontWeight = '600';
    var labOx = { show: function () {} };
    var labCh = bigLab(v.label('kanal: elektronlar doldurdu', { at: [0.2, -0.08, FZ + 0.05], cls: 'name chip', dy: 78, line: true }), 18, true);
    var labDep = bigLab(v.label('boşluklar aşağı itilir', { at: [-0.55, -0.42, FZ + 0.05], cls: 'name chip', dy: 78, line: true }), 18, true);
    bigLab(v.label('LED', { at: [LX - 0.55, LY + 0.25, 0], cls: 'name', dy: -14 }), 20, true);
    var tagMp = new THREE.Vector3();
    var tagM = v.label('ölçekli değil · basitleştirilmiş model', { at: function () { tagMp.set((v.w - 16) / Math.max(1, v.w) * 2 - 1, -((v.h - 14) / Math.max(1, v.h)) * 2 + 1, 0); return tagMp.unproject(v.camera); }, cls: 'tag', align: 'right' });
    tagM.el.style.fontSize = '13px';

    /* ---- model ---- */
    var S = {};
    var VTH = 0.7, IMAX = (5 - 2) / 330, KN = ((5 - 2) / 330) / 0.16;   // channel and LED current reach full value 0,4 V above the threshold
    function drainI(vg) { return vg <= VTH ? 0 : Math.min(IMAX, KN * (vg - VTH) * (vg - VTH)); }
    // keep-out zone under the substrate caption so carriers never cover the text
    function labelZone(x, y) { return x < -0.2 && y < -1.75; }
    function seedCarriers() {
      var i = 0, guard = 0;
      while (i < NHOLE && guard++ < 6000) {
        var x = (rng() * 2 - 1) * XMAX, y = -0.12 - rng() * (BH - 0.26);
        if (wellOf(x, y, 0.1) || labelZone(x, y) || (Math.abs(x) < WX + 0.1 && y > -0.55)) continue;
        var h = holesC[i++]; h.x = x; h.y = y; h.vx = h.vy = 0; h.z = CZ + (rng() - 0.5) * 0.04;
      }
      for (var k = 0; k < NWELL * 2; k++) {
        var e = wellE[k], s = k < NWELL ? -1 : 1, g2 = 0;
        do { e.x = s * (WX + 0.12 + rng() * (XMAX - WX - 0.12)); e.y = -0.1 - rng() * (WD - 0.16); } while (!wellOf(e.x, e.y, -0.08) && g2++ < 60);
        e.vx = e.vy = 0; e.z = CZ + (rng() - 0.5) * 0.04; e.w = s;
      }
      for (var c = 0; c < NCH; c++) { var ch = chE[c]; ch.x = -WX - 0.15 + (2 * WX + 0.3) * (c + 0.5) / NCH; ch.y = -0.07; ch.z = CZ + 0.006; }
    }
    function reset() {
      rng = K.rng(9050);
      S.fitKey = '';
      S.auto = !K.reducedMotion;
      S.vgT = K.reducedMotion ? 3.3 : 0;
      S.vg = S.vgT;
      S.chg = K.reducedMotion ? 1 : 0;
      S.phase = [0, 0];
      S.plus = 8 * S.vg / 3.3;
      seedCarriers();
      v.setView({ yaw: v.home.yaw, pitch: v.home.pitch, distance: v.home.distance, target: v.home.target.toArray() });
    }
    var camQ = new THREE.Quaternion(), tv = new THREE.Vector3();
    function stepHoles(dt, depth) {
      var damp = Math.exp(-1.6 * dt);
      for (var i = 0; i < NHOLE; i++) {
        var h = holesC[i];
        h.vx = h.vx * damp + (rng() - 0.5) * 3.2 * dt;
        h.vy = h.vy * damp + (rng() - 0.5) * 3.2 * dt;
        // the positive gate repels holes from the surface under it
        if (depth > 0 && Math.abs(h.x) < WX + 0.12 && h.y > -depth - 0.12) h.vy -= ((h.y + depth + 0.12) * 9 + 0.5) * dt;
        for (var m = 0; m < NHOLE; m++) {
          if (m === i) continue;
          var o = holesC[m], dx = h.x - o.x, dy = h.y - o.y, d2 = dx * dx + dy * dy;
          if (d2 < 0.16 && d2 > 1e-6) { var d = Math.sqrt(d2), f = (1 - d / 0.4) * 0.9 * dt / d; h.vx += dx * f; h.vy += dy * f; }
        }
        var nx = h.x + h.vx * dt, ny = h.y + h.vy * dt;
        if (nx < -XMAX || nx > XMAX) { h.vx = -h.vx; nx = h.x; }
        if (ny < -BH + 0.13 || ny > -0.09) { h.vy = -h.vy; ny = h.y; }
        if (wellOf(nx, ny, 0.1)) { h.vx = -h.vx * 0.5; h.vy = -Math.abs(h.vy) - 0.05; nx = h.x; ny = h.y; }
        if (labelZone(nx, ny) && !labelZone(h.x, h.y)) { h.vy = Math.abs(h.vy) + 0.05; nx = h.x; ny = h.y; }
        h.x = nx; h.y = ny;
      }
    }
    function stepWells(dt) {
      var damp = Math.exp(-1.6 * dt);
      for (var i = 0; i < NWELL * 2; i++) {
        var e = wellE[i];
        e.vx = e.vx * damp + (rng() - 0.5) * 3.4 * dt;
        e.vy = e.vy * damp + (rng() - 0.5) * 3.4 * dt;
        for (var m = 0; m < NWELL * 2; m++) {
          if (m === i || wellE[m].w !== e.w) continue;
          var o = wellE[m], dx = e.x - o.x, dy = e.y - o.y, d2 = dx * dx + dy * dy;
          if (d2 < 0.14 && d2 > 1e-6) { var d = Math.sqrt(d2), f = (1 - d / 0.37) * 0.9 * dt / d; e.vx += dx * f; e.vy += dy * f; }
        }
        var nx = e.x + e.vx * dt, ny = e.y + e.vy * dt;
        if (wellOf(nx, ny, -0.08) !== e.w || Math.abs(nx) > XMAX || ny > -0.09) { e.vx = -e.vx; e.vy = -e.vy; nx = e.x; ny = e.y; }
        e.x = nx; e.y = ny;
      }
    }
    function draw(c) {
      camQ.copy(v.camera.quaternion);
      for (var i = 0; i < NHOLE; i++) { var h = holesC[i]; hMesh.put(i, h.x, h.y, h.z, 1, 1, 1, camQ); }
      for (var k = 0; k < NWELL * 2; k++) { var e = wellE[k]; eMesh.put(k, e.x, e.y, e.z, 1); }
      for (var j = 0; j < NCH; j++) {
        // channel electrons appear in proportion to the inversion charge
        var vis = K.clamp(c * (NCH + 3) - j * 1.0, 0, 1);
        var ch = chE[j], idx = NWELL * 2 + j;
        if (vis < 0.03) eMesh.hide(idx); else eMesh.put(idx, ch.x, ch.y, ch.z, 1.25 * vis);
      }
      hMesh.done(); eMesh.done();
      var np = S.plus;
      for (var p = 0; p < NPLUS; p++) {
        var a = K.clamp(np - p, 0, 1);
        if (a < 0.02) { plusH.hide(p); plusV.hide(p); continue; }
        var px = -GL + 0.25 + (2 * GL - 0.5) * p / (NPLUS - 1);
        plusH.put(p, px, OXT + 0.12, FZ - 0.025, 0.14 * a, 0.032, 0.01);
        plusV.put(p, px, OXT + 0.12, FZ - 0.025, 0.032, 0.14 * a, 0.01);
      }
      plusH.done(); plusV.done();
    }
    function drawBeads() {
      for (var w = 0; w < 2; w++) {
        var P = paths[w], n = nb[w], off = w === 0 ? 0 : nb[0];
        for (var i = 0; i < n; i++) {
          var s = ((i * GAP + S.phase[w]) % P.L + P.L) % P.L;
          var sc = K.smoothstep(0.03, 0.22, Math.min(s, P.L - s));
          pointAt(P, s, tv);
          if (sc < 0.02) beads.hide(off + i); else beads.put(off + i, tv.x, tv.y, tv.z, sc);
        }
      }
      beads.done();
    }
    function drawLegend(ctx) {
      var x = 16, y = 504, tc = dark ? P.onNightMuted : P.ink2;
      ctx.save();
      ctx.beginPath(); ctx.arc(x + 6, y, 5, 0, Math.PI * 2);
      ctx.lineWidth = 2.2; ctx.strokeStyle = P.copperFill; ctx.stroke();
      K.label(ctx, 'boşluk', x + 17, y + 4, { size: 12, color: tc });
      x += 72;
      K.drawSphere(ctx, '#2848C8', x + 6, y, 5.5);
      K.label(ctx, 'elektron', x + 17, y + 4, { size: 12, color: tc });
      x += 82;
      ctx.fillStyle = P.copperFill;
      ctx.fillRect(x + 1, y - 1, 10, 2.2); ctx.fillRect(x + 4.9, y - 4.9, 2.2, 10);
      K.label(ctx, 'kapıdaki + yük', x + 17, y + 4, { size: 12, color: tc });
      ctx.restore();
    }

    reset();

    return {
      reset: reset,
      set: function (key, val) {
        if (key === 'gate') { var g = parseFloat(val); if (!isNaN(g)) { S.auto = false; S.vgT = K.clamp(g, 0, 3.3); } }
      },
      read: function (key) {
        if (key === 'gate') return K.num(Math.round(S.vg * 10) / 10, 1) + ' V';
        if (key === 'state') return Math.min(1, drainI(S.vg) / IMAX) * S.chg >= 0.5 ? 'Kanal açık: 1' : (S.vg > VTH + 0.05 ? 'Kanal oluşuyor: akım az' : 'Kanal kapalı: 0');
        if (key === 'explain') {
          if (S.vg < 0.1 && S.vgT < 0.1) return 'Kapıda gerilim yok: kaynak ile akaç arasında kanal yok, akım geçmez, LED sönük.';
          if (S.vgT < S.vg - 0.05) return 'Kapı gerilimi kalkınca kanal boşalır: akım durur, LED söner.';
          if (S.chg < 0.85) return 'Kapıdaki artı yük boşlukları iter, elektronları kapının altına çeker: kanal oluşuyor.';
          return 'Elektronlar kanalı doldurdu: kaynaktan akaca akım geçer, LED yanar.';
        }
        if (key === 'size') return 'Bugünkü çiplerde bu anahtar yalnızca birkaç on nanometre büyüklüğündedir';
        return '';
      },
      frame: function (t, dt) {
        dt = Math.min(dt, 0.05);
        if (S.auto) { var cyc = ((t % 16) + 16) % 16; S.vgT = (cyc >= 3.5 && cyc < 11.5) ? 3.3 : 0; }
        // the gate voltage swings slowly (≈ 2 s for 0 ↔ 3,3 V) so the story can be followed
        S.vg += K.clamp(S.vgT - S.vg, -dt * 1.7, dt * 1.7);
        var vg = S.vg;
        var c0 = K.clamp((vg - VTH) / 0.4, 0, 1);
        // channel charge: electrons gather under the gate over about two seconds
        S.chg += K.clamp(c0 - S.chg, -dt * 0.9, dt * 0.5);
        var c = S.chg;
        var I = drainI(vg), flow = Math.min(1, I / IMAX) * c;
        var depth = vg > 0.02 ? 0.22 + 0.36 * Math.sqrt(Math.min(vg, VTH) / VTH) : 0;
        S.plus += (8 * vg / 3.3 - S.plus) * Math.min(1, dt * 6);
        var mot = K.reducedMotion ? 0.5 : 1;
        stepHoles(dt * mot, depth);
        stepWells(dt * mot);
        for (var j = 0; j < NCH; j++) {
          var ch = chE[j];
          ch.x += flow * 0.7 * dt * mot;
          if (ch.x > WX + 0.15) ch.x -= 2 * WX + 0.3;
          ch.y = -0.07 + Math.sin(t * 2.3 + j * 1.7) * 0.012;
        }
        S.phase[0] += flow * 0.85 * dt * mot;
        S.phase[1] += flow * 0.85 * dt * mot;
        chanM.opacity = 0.5 * Math.pow(c, 0.6);
        depM.opacity = 0.55 * K.smoothstep(0.02, 0.4, vg);
        dep.scale.set(1, Math.max(0.001, depth), 1);
        dep.position.set(0, -depth / 2, FZ + 0.006);
        led.set(K.clamp(flow, 0, 1));
        ledLight.intensity = 0.7 * flow;
        labCh.show(c > 0.85 && vg > 0.5 && S.vgT >= S.vg - 0.05);
        labDep.show(vg > 0.1 && c < 0.85 && S.vgT >= S.vg - 0.05);
        labGv.set(K.num(Math.round(vg * 10) / 10, 1) + ' V');
        labGv.el.style.color = vg > 0.1 ? P.copper : P.muted;
        fitCam(v, 24, 10.8, 5.15, S);
        gDisp.update(K.num(Math.round(vg * 10) / 10, 1) + ' V');
        if (!K.skipRender) { draw(c); drawBeads(); }
        v.render(dt);
        /* legend no longer drawn (focus-slide format) */
      },
      resize: function () {},
      dispose: function () { v.dispose(); }
    };
  });

  /* =====================================================================
   * 5) sand-to-chip · S 680×520 · light
   * ===================================================================== */
  /* Abstract but plausible die floorplan (cores, cache banks, graphics tiles, pad ring). */
  function dieFloorplan(w, h) {
    var c = document.createElement('canvas');
    c.width = w; c.height = h;
    var x = c.getContext('2d');
    var r = K.rng(77);
    x.fillStyle = '#29303F'; x.fillRect(0, 0, w, h);
    // pad ring
    x.fillStyle = 'rgba(190,168,118,0.75)';
    var pw = w * 0.012, ph = h * 0.022, step = w * 0.024;
    for (var px = w * 0.05; px < w * 0.95; px += step) { x.fillRect(px, h * 0.02, pw, ph); x.fillRect(px, h * 0.958, pw, ph); }
    for (var py = h * 0.06; py < h * 0.94; py += step) { x.fillRect(w * 0.016, py, ph * 0.9, pw * 1.1); x.fillRect(w * 0.966, py, ph * 0.9, pw * 1.1); }
    function block(bx, by, bw, bh, col) {
      x.fillStyle = col; x.fillRect(bx, by, bw, bh);
      x.strokeStyle = 'rgba(160,176,206,0.35)'; x.lineWidth = Math.max(1, w / 500); x.strokeRect(bx + 0.5, by + 0.5, bw - 1, bh - 1);
    }
    function stripes(bx, by, bw, bh, col, n, vertical) {
      x.fillStyle = col;
      for (var i = 0; i < n; i++) {
        if (vertical) x.fillRect(bx + bw * i / n, by, bw / n * 0.55, bh);
        else x.fillRect(bx, by + bh * i / n, bw, bh / n * 0.55);
      }
    }
    var X0 = w * 0.08, Y0 = h * 0.09, W = w * 0.84, H = h * 0.82;
    // four CPU cores (left)
    for (var cy = 0; cy < 2; cy++) for (var cx = 0; cx < 2; cx++) {
      var bx = X0 + cx * W * 0.27, by = Y0 + cy * H * 0.36, bw = W * 0.255, bh = H * 0.34;
      block(bx, by, bw, bh, '#36435E');
      stripes(bx + bw * 0.06, by + bh * 0.08, bw * 0.4, bh * 0.36, 'rgba(120,150,190,0.35)', 14, false);
      block(bx + bw * 0.52, by + bh * 0.08, bw * 0.42, bh * 0.36, '#3E5168');
      for (var k = 0; k < 18; k++) {
        var sx = bx + bw * (0.06 + r() * 0.8), sy = by + bh * (0.5 + r() * 0.4);
        x.fillStyle = ['#435A72', '#4A4E6E', '#3B5A62', '#55546A'][k % 4];
        x.fillRect(sx, sy, bw * (0.04 + r() * 0.1), bh * (0.04 + r() * 0.08));
      }
    }
    // cache banks (right)
    for (var bk = 0; bk < 3; bk++) for (var bj = 0; bj < 2; bj++) {
      var cbx = X0 + W * (0.58 + bj * 0.21), cby = Y0 + bk * H * 0.245, cbw = W * 0.195, cbh = H * 0.225;
      block(cbx, cby, cbw, cbh, bj ? '#2F4C5D' : '#35566A');
      stripes(cbx + 2, cby + 2, cbw - 4, cbh - 4, 'rgba(150,190,210,0.22)', 22, false);
    }
    // graphics tiles (bottom left)
    for (var gx = 0; gx < 8; gx++) for (var gy = 0; gy < 2; gy++) {
      block(X0 + gx * W * 0.066, Y0 + H * (0.75 + gy * 0.125), W * 0.058, H * 0.105, gy ? '#4B4766' : '#524C70');
    }
    // fine noise
    for (var n = 0; n < w * h * 0.004; n++) {
      x.fillStyle = 'rgba(255,255,255,' + (0.02 + r() * 0.05).toFixed(3) + ')';
      x.fillRect(r() * w, r() * h, 1, 1);
    }
    return c;
  }

  K.register('sand-to-chip', function (el, opts) {
    var THREE = window.THREE;
    opts = opts || {};
    var theme = opts.theme || 'light';
    var dark = theme === 'dark';
    var v = K.stage3d(el, {
      theme: theme, fov: 28, distance: 10.3, yaw: 0, pitch: 0.34, target: [0, 0.2, 0],
      size: 4, ground: -1.65, minPitch: 0, maxPitch: 1.1, minDistance: 4, maxDistance: 30
    });
    var scene = v.scene;
    if (v.lights && v.lights.ground) { v.lights.ground.material.opacity = 0.1; v.lights.ground.material.depthWrite = false; }
    var NAMES = ['Kum (SiO₂)', 'Silisyum külçe', 'Yonga plaka · 300 mm', 'Çip', 'Transistörler'];
    var NOTES = [
      'Kuvars kumu silisyum ve oksijenden oluşur. Önce içinden çok saf silisyum elde edilir.',
      'Erimiş silisyumdan (1.414 °C) tek kristal, döndürülerek yavaşça yukarı çekilir.',
      'Külçe ≈ 0,8 mm kalınlıkta dilimlenir ve ayna gibi parlatılır. Yüzlerce çip aynı plakada birlikte üretilir.',
      'Plaka kesilir; her çip koruyucu bir kılıfa yerleştirilir ve altındaki yüzlerce minik lehim topuyla karta bağlanır.',
      'Çipin yüzeyinde milyarlarca minik anahtar açılıp kapanır: her biri 1 ya da 0.'
    ];
    var SHORT = ['kum', 'külçe', 'plaka', 'çip', 'transistör'];
    var EXPLAIN = [
      'Kum, silisyum ve oksijenden oluşur; içinden çok saf silisyum elde edilir.',
      'Erimiş silisyumdan tek kristal, dönerek yavaşça yukarı çekilir: külçe.',
      'Külçe ince dilimlenip aynaya dönene kadar parlatılır: plakada yüzlerce çip olur.',
      'Plaka kesilir; çip kılıfa konur, altındaki minik lehim topları onu karta bağlar.',
      'Çipin yüzeyinde milyarlarca minik anahtar açılıp kapanır: her biri 1 ya da 0.'
    ];

    function fader(group) {
      var mats = [], casters = [];
      group.traverse(function (o) {
        if (o.castShadow) casters.push(o);
        if (!o.material) return;
        (Array.isArray(o.material) ? o.material : [o.material]).forEach(function (m) {
          if (m.userData.noFade || mats.indexOf(m) >= 0) return;
          mats.push(m); m.userData.baseOp = m.opacity; m.userData.baseTr = m.transparent;
        });
      });
      var cur = -1;
      return function (a) {
        group.visible = a > 0.004;
        if (Math.abs(a - cur) < 1e-4) return;
        cur = a;
        for (var i = 0; i < mats.length; i++) {
          var m = mats[i], tr = m.userData.baseTr || a < 0.999;
          m.opacity = m.userData.baseOp * a;
          if (m.transparent !== tr) { m.transparent = tr; m.needsUpdate = true; }
          m.depthWrite = a > 0.6 || m.userData.baseTr === false && a > 0.6;
        }
        for (var j = 0; j < casters.length; j++) casters[j].castShadow = a > 0.7;
      };
    }

    /* ---------- stage 0: quartz sand (1 unit ≈ 4,5 mm) ---------- */
    var sand = new THREE.Group();
    (function () {
      var rr = K.rng(31);
      var cols = [0xE6C995, 0xD9B47A, 0xCC9F62, 0xEEDDBA, 0xF3EBDC, 0xB98856, 0x9A8670, 0x6E655C];
      var weights = [0.26, 0.24, 0.16, 0.08, 0.04, 0.10, 0.07, 0.05];
      function pickCol() { var u = rr(), a = 0; for (var i = 0; i < cols.length; i++) { a += weights[i]; if (u <= a) return cols[i]; } return cols[0]; }
      var R = 2.0, Hh = 1.3;
      function hgt(r) { return r >= R ? 0 : Hh * Math.pow(1 - Math.pow(r / R, 1.35), 1.55); }
      // opaque core under the grains, so the ground never shows through the heap
      var corePts = [];
      for (var ci = 0; ci <= 24; ci++) { var cr = R * ci / 24; corePts.push(new THREE.Vector2(Math.max(0.0001, cr), hgt(cr) * 0.93)); }
      var core = new THREE.Mesh(new THREE.LatheGeometry(corePts, 48), K.mat.std(0xD8BD8A, 0.9, 0));
      core.receiveShadow = true; core.castShadow = false;
      sand.add(core);
      var N = 640, col = new THREE.Color(), q = new THREE.Quaternion(), e = new THREE.Euler(), m4 = new THREE.Matrix4(), p = new THREE.Vector3(), s = new THREE.Vector3();
      for (var vi = 0; vi < 3; vi++) {
        var geo = new THREE.IcosahedronGeometry(1, 0);
        var pos = geo.attributes.position, key = {}, jr = K.rng(100 + vi);
        for (var k = 0; k < pos.count; k++) {
          var kk = Math.round(pos.getX(k) * 1000) + ',' + Math.round(pos.getY(k) * 1000) + ',' + Math.round(pos.getZ(k) * 1000);
          if (!key[kk]) key[kk] = 0.78 + jr() * 0.42;
          pos.setXYZ(k, pos.getX(k) * key[kk], pos.getY(k) * key[kk], pos.getZ(k) * key[kk]);
        }
        geo.computeVertexNormals();
        var mat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3, metalness: 0, flatShading: true, envMapIntensity: 1.0, emissive: 0x2A1A08, emissiveIntensity: 0.35 });
        var im = new THREE.InstancedMesh(geo, mat, N);
        im.castShadow = true; im.receiveShadow = true;
        for (var i = 0; i < N; i++) {
          var onHeap = i < N * 0.92;
          var th = rr() * Math.PI * 2;
          var rad = onHeap ? R * Math.pow(rr(), 0.62) * 1.02 : R * (1.0 + rr() * (0.15 + 0.3 * Math.abs(Math.cos(th))));
          var gr = 0.055 + rr() * 0.04;
          var y = hgt(rad) + gr * 0.45 - rr() * 0.03;
          p.set(Math.cos(th) * rad, y + 0.02, Math.sin(th) * rad);
          e.set(rr() * 6.3, rr() * 6.3, rr() * 6.3); q.setFromEuler(e);
          s.set(gr * (0.8 + rr() * 0.5), gr * (0.7 + rr() * 0.4), gr * (0.8 + rr() * 0.5));
          m4.compose(p, q, s);
          im.setMatrixAt(i, m4);
          im.setColorAt(i, col.setHex(pickCol()));
        }
        im.instanceMatrix.needsUpdate = true;
        sand.add(im);
      }
    })();
    scene.add(sand);

    /* ---------- stage 1: Czochralski ingot pulled from the melt (1 unit ≈ 27 cm) ---------- */
    var ingotStage = new THREE.Group();
    var MELT_Y = -0.95;
    var meltPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -MELT_Y);
    var rnd = K.renderer();
    if (rnd) rnd.localClippingEnabled = true;
    var ingot = new THREE.Group();
    var meltGlowS, meltLight;
    (function () {
      var stripe = K.textTexture(512, 512, function (c, w, h) {
        c.fillStyle = '#8F98A6'; c.fillRect(0, 0, w, h);
        for (var i = 0; i < 4; i++) { var x0 = (i + 0.5) / 4 * w; c.fillStyle = 'rgba(255,255,255,0.32)'; c.fillRect(x0 - 2, 0, 4, h); c.fillStyle = 'rgba(40,46,56,0.25)'; c.fillRect(x0 + 2, 0, 3, h); }
        for (var j = 0; j < h; j += 3) { c.fillStyle = 'rgba(255,255,255,' + (j % 9 === 0 ? 0.05 : 0.02) + ')'; c.fillRect(0, j, w, 1); }
      });
      stripe.wrapS = THREE.RepeatWrapping;
      var prof = [[0.0001, MELT_Y - 0.02], [0.5, MELT_Y - 0.02], [0.55, MELT_Y + 0.03], [0.55, 1.35], [0.5, 1.47], [0.3, 1.66], [0.12, 1.84], [0.05, 1.93], [0.035, 2.0], [0.035, 2.3], [0.055, 2.32], [0.055, 2.42], [0.0001, 2.43]];
      var geo = new THREE.LatheGeometry(prof.map(function (p) { return new THREE.Vector2(p[0], p[1]); }), 72);
      var mat = K.mat.std(0xffffff, 0.2, 0.85, { map: stripe, envMapIntensity: 1.15, clippingPlanes: [meltPlane], clipShadows: true });
      var body = new THREE.Mesh(geo, mat);
      body.castShadow = true;
      ingot.add(body);
      var chuck = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.22, 24), K.mat.steel({ roughness: 0.35 }));
      chuck.position.y = 2.53;
      var cable = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 2.4, 8), K.mat.steel({ roughness: 0.4 }));
      cable.position.y = 3.8;
      ingot.add(chuck, cable);
      ingotStage.add(ingot);
      // crucible: graphite susceptor with a quartz liner, melt surface glowing
      var cProf = [[0.0001, -1.62], [0.95, -1.62], [1.06, -1.55], [1.1, -1.4], [1.1, -0.78], [1.06, -0.74], [1.0, -0.78], [0.98, -1.4], [0.9, -1.5], [0.0001, -1.5]];
      var cruc = new THREE.Mesh(new THREE.LatheGeometry(cProf.map(function (p) { return new THREE.Vector2(p[0], p[1]); }), 72), K.mat.std(0x3B3F47, 0.78, 0.2));
      cruc.castShadow = true; cruc.receiveShadow = true;
      var lProf = [[0.97, -0.8], [0.99, -0.76], [1.02, -0.76], [1.0, -0.8], [0.99, -1.38]];
      var liner = new THREE.Mesh(new THREE.LatheGeometry(lProf.map(function (p) { return new THREE.Vector2(p[0], p[1]); }), 72), K.mat.std(0xEDEAE3, 0.5, 0));
      var meltMat = new THREE.MeshBasicMaterial({ color: 0xFFB14E, toneMapped: false, transparent: true });
      var melt = new THREE.Mesh(new THREE.CircleGeometry(0.985, 72), meltMat);
      melt.rotation.x = -Math.PI / 2; melt.position.y = MELT_Y;
      var ringMat = new THREE.MeshBasicMaterial({ color: 0xFFE6B0, toneMapped: false, transparent: true });
      var ring = new THREE.Mesh(new THREE.RingGeometry(0.55, 0.66, 72), ringMat);
      ring.rotation.x = -Math.PI / 2; ring.position.y = MELT_Y + 0.004;
      meltGlowS = glowSprite(0xFFB056, 2.8, 0.55);
      meltGlowS.material.userData.noFade = true;
      meltGlowS.position.set(0, MELT_Y + 0.25, 0.2);
      meltLight = new THREE.PointLight(0xFFA65A, 1.4, 3.2, 2);
      meltLight.position.set(0, MELT_Y + 0.12, 1.1);
      ingotStage.add(cruc, liner, melt, ring, meltGlowS, meltLight);
    })();
    scene.add(ingotStage);

    /* ---------- stage 2: 300 mm wafer (radius 1,6 units = 150 mm) ---------- */
    var WR = 1.6, DIEW = 18, DIEH = 15.4;   // die size in mm
    var floor = dieFloorplan(512, 438);
    var waferTex = K.textTexture(2048, 2048, function (c, w, h) {
      c.fillStyle = '#C3C9D1'; c.fillRect(0, 0, w, h);
      var mm = w / 300, cx = w / 2, cy = h / 2;
      c.save();
      c.beginPath(); c.arc(cx, cy, 147 * mm, 0, Math.PI * 2); c.clip();
      var nx = Math.ceil(150 / DIEW) + 1, ny = Math.ceil(150 / DIEH) + 1;
      for (var i = -nx; i < nx; i++) for (var j = -ny; j < ny; j++) {
        var x0 = cx + (i * DIEW + 0.15) * mm, y0 = cy + (j * DIEH + 0.15) * mm;
        c.drawImage(floor, x0, y0, (DIEW - 0.3) * mm, (DIEH - 0.3) * mm);
      }
      c.restore();
      c.strokeStyle = 'rgba(255,255,255,0.35)'; c.lineWidth = 3;
      c.beginPath(); c.arc(cx, cy, 147 * mm, 0, Math.PI * 2); c.stroke();
    });
    waferTex.repeat.set(1 / (2 * WR), 1 / (2 * WR));
    waferTex.offset.set(0.5, 0.5);
    var waferStage = new THREE.Group(), waferTilt = new THREE.Group(), waferSpin = new THREE.Group();
    waferStage.add(waferTilt); waferTilt.add(waferSpin);
    (function () {
      var shape = new THREE.Shape(), Nn = 160;
      for (var i = 0; i <= Nn; i++) {
        var th = -Math.PI / 2 + Math.PI * 2 * i / Nn, rr = WR;
        var d = Math.abs(Math.atan2(Math.sin(th + Math.PI / 2), Math.cos(th + Math.PI / 2)));
        if (d < 0.03) rr = WR - 0.035 * Math.sqrt(1 - Math.pow(d / 0.03, 2));
        if (i === 0) shape.moveTo(Math.cos(th) * rr, Math.sin(th) * rr); else shape.lineTo(Math.cos(th) * rr, Math.sin(th) * rr);
      }
      var geo = new THREE.ExtrudeGeometry(shape, { depth: 0.02, bevelEnabled: false, curveSegments: 1 });
      geo.translate(0, 0, -0.01);
      var mat = new THREE.MeshPhysicalMaterial({
        map: waferTex, color: 0xffffff, metalness: 0.7, roughness: 0.14, envMapIntensity: 0.72,
        iridescence: 0.85, iridescenceIOR: 1.46, iridescenceThicknessRange: [280, 760], clearcoat: 0.5, clearcoatRoughness: 0.08
      });
      var wafer = new THREE.Mesh(geo, mat);
      wafer.castShadow = true; wafer.receiveShadow = true;
      waferSpin.add(wafer);
    })();
    scene.add(waferStage);
    // die chosen for the zoom: the one just above-right of the centre
    var DIE_U = 0.5 * DIEW, DIE_V = 0.5 * DIEH;   // die centre in mm (texture coords, +v is down in the canvas)
    var dieLocal = new THREE.Vector3(DIE_U / 150 * WR, -DIE_V / 150 * WR, 0.011);

    /* ---------- stage 3: packaged chip (1 unit ≈ 17 mm) ---------- */
    var chipStage = new THREE.Group(), chipPose = new THREE.Group();
    chipStage.add(chipPose);
    var DIE_W = 1.08, DIE_D = DIE_W * DIEH / DIEW, chipBalls = null;
    (function () {
      var sub = new THREE.Mesh(roundedBox(2.4, 0.12, 2.4, 0.04, 2), K.mat.std(0x2F4A3F, 0.55, 0.05));
      sub.castShadow = true; sub.receiveShadow = true;
      var edge = new THREE.Mesh(roundedBox(2.36, 0.02, 2.36, 0.01, 1), K.mat.std(0xC8B784, 0.7, 0));
      edge.position.y = -0.045;
      var dieTex = new THREE.CanvasTexture(floor);
      dieTex.encoding = THREE.sRGBEncoding; dieTex.anisotropy = 8;
      var dieMat = new THREE.MeshPhysicalMaterial({ map: dieTex, metalness: 0.35, roughness: 0.22, iridescence: 0.35, iridescenceIOR: 1.46, iridescenceThicknessRange: [220, 600], envMapIntensity: 1.1 });
      var die = new THREE.Mesh(roundedBox(DIE_W, 0.07, DIE_D, 0.008, 1), K.mat.std(0x3A4150, 0.4, 0.4));
      die.position.y = 0.06 + 0.035 + 0.012;
      var dieTop = new THREE.Mesh(new THREE.PlaneGeometry(DIE_W - 0.01, DIE_D - 0.01), dieMat);
      dieTop.rotation.x = -Math.PI / 2; dieTop.position.y = 0.06 + 0.07 + 0.0125;
      var under = new THREE.Mesh(roundedBox(DIE_W + 0.08, 0.03, DIE_D + 0.08, 0.015, 2), K.mat.std(0xD9CDB3, 0.6, 0));
      under.position.y = 0.075;
      chipPose.add(sub, edge, die, dieTop, under);
      // small decoupling capacitors around the die
      var capM = K.mat.std(0x9C7B55, 0.5, 0.1), capEnd = K.mat.tin({ roughness: 0.3 });
      var cr = K.rng(5);
      for (var i = 0; i < 14; i++) {
        var side = i % 4, tpos = (Math.floor(i / 4) + 0.6 + cr() * 0.4) / 4.2 * 1.9 - 0.95;
        var cxp = side === 0 ? tpos : side === 1 ? 0.92 : side === 2 ? -tpos : -0.92;
        var czp = side === 0 ? -0.92 : side === 1 ? tpos : side === 2 ? 0.92 : -tpos;
        var cap = new THREE.Group();
        var b = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.045, 0.05), capM);
        var e1 = new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.047, 0.052), capEnd); e1.position.x = -0.045;
        var e2 = e1.clone(); e2.position.x = 0.045;
        cap.add(b, e1, e2);
        cap.position.set(cxp, 0.083, czp);
        if (side % 2) cap.rotation.y = Math.PI / 2;
        chipPose.add(cap);
      }
      var tri = new THREE.Mesh(new THREE.CircleGeometry(0.06, 3), K.mat.gold({ roughness: 0.3 }));
      tri.rotation.x = -Math.PI / 2; tri.position.set(-1.08, 0.062, -1.08);
      chipPose.add(tri);
      // solder balls underneath (seen at the edges)
      var balls = new THREE.InstancedMesh(new THREE.SphereGeometry(0.045, 8, 6), K.mat.tin({ roughness: 0.25 }), 196);
      var m4 = new THREE.Matrix4(), bi = 0;
      for (var gx = 0; gx < 14; gx++) for (var gz = 0; gz < 14; gz++) { m4.makeTranslation(-1.04 + gx * 0.16, -0.085, -1.04 + gz * 0.16); balls.setMatrixAt(bi++, m4); }
      balls.castShadow = true;
      chipPose.add(balls);
      chipBalls = balls;
    })();
    scene.add(chipStage);
    var chipDieLocal = new THREE.Vector3(0.12, 0.06 + 0.07 + 0.013, -0.08);

    /* ---------- stage 4: a field of FinFET transistors (gate pitch ≈ 50 nm) ---------- */
    var fetStage = new THREE.Group(), fetPose = new THREE.Group();
    fetStage.add(fetPose);
    var NF = 12, NG = 11, FP = 0.2, GP = 0.36, FH = 0.34, FW = 0.05, GW = 0.13, GH = 0.46, GROUP = 3;
    var gateCells = [], gateMesh, capMesh, chMesh;
    (function () {
      var LX = NG * GP + 0.5, LZ = NF * FP + 0.6;
      var base = new THREE.Mesh(roundedBox(LX, 0.24, LZ, 0.03, 2), K.mat.std(0x9AA2AE, 0.55, 0.15));
      base.position.y = -0.12;
      base.receiveShadow = true;
      var sti = new THREE.Mesh(new THREE.BoxGeometry(LX - 0.04, 0.1, LZ - 0.04), K.mat.std(0xE9ECEF, 0.6, 0));
      sti.position.y = 0.05;
      sti.receiveShadow = true;
      fetPose.add(base, sti);
      var finM = K.mat.std(0x8D98AC, 0.38, 0.35);
      for (var f = 0; f < NF; f++) {
        var fin = new THREE.Mesh(roundedBox(LX - 0.3, FH, FW, 0.012, 1), finM);
        fin.position.set(0, FH / 2, -LZ / 2 + 0.3 + f * FP);
        fin.castShadow = true; fin.receiveShadow = true;
        fetPose.add(fin);
      }
      var nCells = NG * (NF / GROUP);
      gateMesh = new THREE.InstancedMesh(roundedBox(GW, GH, GROUP * FP - 0.06, 0.02, 1), K.mat.std(0xffffff, 0.32, 0.8), nCells);
      capMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(GW * 0.82, 0.012, GROUP * FP - 0.1), new THREE.MeshStandardMaterial({ color: 0xE07A3A, emissive: 0xE07A3A, emissiveIntensity: 0.6, roughness: 0.5, metalness: 0, transparent: true, opacity: 0.95 }), nCells);
      chMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(0.07, 0.03, FW + 0.022), new THREE.MeshStandardMaterial({ color: 0x3B63E6, emissive: 0x3B63E6, emissiveIntensity: 0.6, roughness: 0.5, metalness: 0 }), nCells * GROUP * 2);
      gateMesh.castShadow = true;
      [gateMesh, capMesh, chMesh].forEach(function (m) { m.instanceMatrix.setUsage(THREE.DynamicDrawUsage); m.frustumCulled = false; });
      var cr = K.rng(808), ci = 0, m4 = new THREE.Matrix4();
      for (var g = 0; g < NG; g++) for (var k = 0; k < NF / GROUP; k++) {
        var gx = -NG * GP / 2 + GP / 2 + g * GP, gz = -LZ / 2 + 0.3 + (k * GROUP + (GROUP - 1) / 2) * FP;
        gateCells.push({ x: gx, z: gz, k: k, ph: cr() * 6.28, w: 0.55 + cr() * 0.7, lvl: 0, i: ci });
        m4.makeTranslation(gx, GH / 2 - 0.01, gz);
        gateMesh.setMatrixAt(ci, m4);
        gateMesh.setColorAt(ci, new THREE.Color(0xB7BDC6));
        ci++;
      }
      fetPose.add(gateMesh, capMesh, chMesh);
    })();
    scene.add(fetStage);
    var fetFocus = new THREE.Vector3(0, 0.3, 0);

    /* ---------- fades, captions, overlays ---------- */
    var fades = [fader(sand), fader(ingotStage), fader(waferStage), fader(chipStage), fader(fetStage)];
    var stages = [sand, ingotStage, waferStage, chipStage, fetStage];
    function screenFn(f) { var p = new THREE.Vector3(); return function () { var q = f(); p.set(q[0] / Math.max(1, v.w) * 2 - 1, -(q[1] / Math.max(1, v.h)) * 2 + 1, 0); p.unproject(v.camera); return p; }; }
    var capTag = { set: function () {}, el: { style: {} } };
    var capNote = { set: function () {}, el: { style: {} } };
    var capName = bigLab(v.label('', { at: screenAt(v, 26, 34), cls: 'name', align: 'left' }), 26, true);
    var tagSlow = v.label('yavaşlatılmış', { at: screenFn(function () { return [v.w - 26, 30]; }), cls: 'tag', align: 'right' });
    tagSlow.el.style.fontSize = '13px';
    tagSlow.el.style.whiteSpace = 'pre';
    tagSlow.el.style.textAlign = 'right';

    /* real-world scale of each stage at rest: world units per metre, and the scale bar */
    var SCALE = [
      { upm: 1 / 0.0045, bar: 0.002, txt: '2 mm' },
      { upm: 1 / 0.2727, bar: 0.3, txt: '30 cm' },
      { upm: WR / 0.15, bar: 0.1, txt: '10 cm' },
      { upm: DIE_W / (DIEW / 1000), bar: 0.01, txt: '1 cm' },
      { upm: GP / 50e-9, bar: 100e-9, txt: '100 nm' }
    ];

    var S = {};
    var GROUND_Y = [-1.02, -1.62, -1.5, -0.36, -0.58];
    function reset() {
      S.fitKey = '';
      S.auto = true;
      S.p = 0; S.from = 0; S.to = 0; S.tw = 1; S.twDur = 1;
      S.target = 0;
      S.autoIdx = 0;
      S.capIdx = -1;
      v.setView({ yaw: v.home.yaw, pitch: v.home.pitch, distance: v.home.distance, target: v.home.target.toArray() });
    }
    function goTo(k) {
      if (k === S.to && S.tw < 1) return;
      S.from = S.p; S.to = k; S.tw = 0;
      S.twDur = K.clamp(2.2 * Math.abs(k - S.p), 2.4, 4.4);
    }

    var Fw = new THREE.Vector3(), tmp = new THREE.Vector3(), tmp2 = new THREE.Vector3(), m4b = new THREE.Matrix4(), col = new THREE.Color();
    var ZO = 5.5;
    function poseStages(p, t) {
      var k = Math.floor(p), f = p - k;
      if (k >= 5) { k = 0; f = 0; }
      var a = [0, 0, 0, 0, 0];
      // rest poses (slow idle motion)
      var idle = K.reducedMotion ? 0 : t;
      sand.position.set(0, -1.02, 0); sand.scale.setScalar(1.2); sand.rotation.set(0, idle * 0.05, 0);
      ingotStage.position.set(0, 0, 0); ingotStage.scale.setScalar(1); ingotStage.rotation.set(0, 0, 0);
      ingot.rotation.y = idle * 0.35;
      ingot.position.y = 0;
      waferStage.position.set(0, 0.0, 0); waferStage.scale.setScalar(1.2); waferStage.rotation.set(0, 0, 0);
      waferTilt.rotation.set(-1.0, 0, 0);
      waferSpin.rotation.z = idle * 0.06;
      chipStage.position.set(0, -0.2, 0); chipStage.scale.setScalar(1.7); chipStage.rotation.set(0.22, 0, 0);
      chipPose.rotation.set(0, 0.62 + Math.sin(idle * 0.25) * 0.12, 0);
      fetStage.position.set(0, -0.3, 0); fetStage.scale.setScalar(1.25); fetStage.rotation.set(0, 0, 0);
      fetPose.rotation.set(0, 0.55, 0);
      var e = K.ease.inOut(f);
      if (f < 1e-6) { a[k] = 1; return a; }
      if (k === 0) {
        // sand → ingot: the sand melts away; the crystal is pulled up out of the glowing melt
        a[0] = 1 - K.smoothstep(0.1, 0.55, f);
        sand.scale.setScalar(1.2 * (1 - 0.25 * e));
        sand.position.y = -1.02 - 0.35 * e;
        a[1] = K.smoothstep(0.3, 0.7, f);
        ingot.position.y = -2.6 * (1 - K.ease.out(K.smoothstep(0.35, 1, f)));
      } else if (k === 1) {
        // ingot → wafer: a slice leaves the ingot and turns to face us
        a[1] = 1 - K.smoothstep(0.25, 0.7, f);
        ingotStage.position.y = -0.6 * e;
        a[2] = K.smoothstep(0.05, 0.4, f);
        var s0 = 0.55 / WR;
        waferStage.scale.setScalar(K.lerp(s0, 1.2, e));
        waferStage.position.set(0, K.lerp(-0.3, 0.0, e), 0);
        waferTilt.rotation.x = K.lerp(-Math.PI / 2, -1.0, e);
        waferSpin.rotation.z = idle * 0.06 * e;
      } else if (k === 2 || k === 3) {
        // zoom: wafer → one die → chip; chip → die surface → transistors
        var cur = stages[k], nxt = stages[k + 1];
        cur.updateMatrixWorld(true);
        if (k === 2) waferSpin.localToWorld(Fw.copy(dieLocal)); else chipPose.localToWorld(Fw.copy(chipDieLocal));
        var sc = Math.pow(ZO, e);
        // x' = x·s + F·(1 − e − s): F stays put while scaling, then slides to the centre
        cur.scale.multiplyScalar(sc);
        cur.position.copy(Fw).multiplyScalar(1 - e - sc).add(tmp.copy(cur.position).multiplyScalar(sc));
        a[k] = 1 - K.smoothstep(0.25, 0.5, f);
        var sn = Math.pow(ZO, e - 1);
        nxt.scale.multiplyScalar(sn);
        nxt.position.copy(Fw).multiplyScalar(1 - e).add(tmp.copy(nxt.position).multiplyScalar(sn));
        a[k + 1] = K.smoothstep(0.2, 0.5, f);
        if (k === 2) chipStage.rotation.x = K.lerp(0.52, 0.22, e);
      } else if (k === 4) {
        // back to the beginning: transistors fade out, sand fades in
        a[4] = 1 - K.smoothstep(0.0, 0.5, f);
        fetStage.scale.setScalar(1.25 * (1 - 0.3 * e));
        a[0] = K.smoothstep(0.4, 1, f);
        sand.scale.setScalar(1.2 * (0.8 + 0.2 * e));
      }
      return a;
    }

    function drawOverlay(alphas, t) {
      var ctx = v.ctx, ink = dark ? P.onNight : P.ink, mut = dark ? P.onNightMuted : P.muted;
      var W = v.w, H = v.h;
      // progress: five dots, bottom right
      var dx = 30, x0 = W - 34 - dx * 4, y0 = H - 24;
      ctx.save();
      ctx.strokeStyle = dark ? P.nightLine : P.line2; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(x0, y0 + 0.5); ctx.lineTo(x0 + dx * 4, y0 + 0.5); ctx.stroke();
      var pp = S.p >= 4.5 ? 0 : S.p;
      for (var i = 0; i < 5; i++) {
        var on = Math.max(0, 1 - Math.abs(pp - i) * 1.6);
        ctx.beginPath(); ctx.arc(x0 + i * dx, y0 + 0.5, 4.5 + 2.5 * on, 0, Math.PI * 2);
        ctx.fillStyle = on > 0.5 ? (dark ? P.onNight : P.ink) : (dark ? P.night : P.paper);
        ctx.fill();
        ctx.strokeStyle = on > 0.5 ? ink : mut; ctx.stroke();
      }
      // scale bar for the dominant stage (bottom left)
      var dom = 0, best = -1;
      for (var k = 0; k < 5; k++) if (alphas[k] > best) { best = alphas[k]; dom = k; }
      var st = stages[dom], sc = st.scale.x;
      st.updateMatrixWorld(true);
      var cw = tmp.setFromMatrixPosition(st.matrixWorld);
      var a = v.project(cw), ax = a.x, b = v.project(tmp2.set(cw.x + 1, cw.y, cw.z));
      var pxPerUnit = Math.abs(b.x - ax);
      var len = SCALE[dom].bar * SCALE[dom].upm * sc * pxPerUnit;
      if (len > 8 && len < 300) {
        var bx0 = 28, bx1 = bx0 + len, by = H - 26;
        ctx.globalAlpha = K.smoothstep(0.5, 0.8, best);
        ctx.strokeStyle = ink; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(bx0, by); ctx.lineTo(bx1, by); ctx.moveTo(bx0, by - 5); ctx.lineTo(bx0, by + 5); ctx.moveTo(bx1, by - 5); ctx.lineTo(bx1, by + 5); ctx.stroke();
        K.label(ctx, SCALE[dom].txt, bx0, by - 12, { size: 15, mono: true, weight: 500, color: ink, align: 'left' });
      }
      // legend for the transistor field: only while that stage is on screen
      if (dom === 4 && best > 0.5) {
        var la = K.smoothstep(0.5, 0.8, best) * (1 - K.smoothstep(0.25, 0.48, Math.abs(S.p - Math.round(S.p))));
        ctx.globalAlpha = la;
        var lc = dark ? P.onNightMuted : P.ink2;
        [['#E07A3A', 'kanal var = 1 · akım geçer'], ['#B7BDC6', 'kanal yok = 0 · akım geçmez']].forEach(function (r, ri) {
          var ly = 78 + ri * 26;
          ctx.fillStyle = r[0]; ctx.fillRect(28, ly - 7, 18, 12);
          K.label(ctx, r[1], 54, ly + 4, { size: 16, color: lc });
        });
      }
      ctx.restore();
    }

    reset();
    var lastAlphas = [1, 0, 0, 0, 0];

    return {
      reset: reset,
      set: function (key, val) {
        if (key === 'stage') {
          var k = Math.round(+val);
          if (isNaN(k)) return;
          S.auto = false;
          if (S.p > 4) { S.p = S.p >= 4.5 ? 0 : 4; S.tw = 1; }
          goTo(K.clamp(k, 0, 4));
        }
      },
      read: function (key) {
        if (key === 'stage') { var i = Math.round(S.p) % 5; return NAMES[i]; }
        if (key === 'explain') return EXPLAIN[Math.round(S.p) % 5];
        return '';
      },
      frame: function (t, dt) {
        dt = Math.min(dt, 0.05);
        if (S.auto) {
          var idx = Math.floor(Math.max(0, t) / (K.reducedMotion ? 10 : 7));
          if (idx !== S.autoIdx) {
            S.autoIdx = idx;
            var nxt = idx % 5;
            if (idx > 0) { if (nxt === 0) goTo(5); else goTo(nxt); }
          }
        }
        if (S.tw < 1) {
          S.tw = Math.min(1, S.tw + dt / S.twDur);
          S.p = K.lerp(S.from, S.to, K.ease.inOut(S.tw));
          if (S.tw >= 1 && S.to >= 5) { S.p = 0; S.to = 0; S.from = 0; }
        }
        var alphas = poseStages(S.p, t);
        for (var i = 0; i < 5; i++) fades[i](alphas[i]);
        if (chipBalls) chipBalls.visible = alphas[3] > 0.97;
        // the shadow catcher follows the visible stage (each object keeps its contact shadow)
        if (v.lights && v.lights.ground) {
          var gy = 0, gw = 0;
          for (var gi = 0; gi < 5; gi++) { gy += GROUND_Y[gi] * alphas[gi]; gw += alphas[gi]; }
          v.lights.ground.position.y = gw > 0 ? gy / gw : GROUND_Y[0];
        }
        lastAlphas = alphas;
        // melt glow follows the ingot stage alpha
        meltGlowS.material.opacity = 0.5 * alphas[1] * (0.9 + 0.1 * Math.sin(t * 3.1));
        meltLight.intensity = 1.4 * alphas[1];
        ingotStage.updateMatrixWorld(true);
        meltPlane.constant = -(ingotStage.position.y + MELT_Y * ingotStage.scale.y);
        // transistor switching (slowed down: real switching is billions of times per second)
        if (alphas[4] > 0.01) {
          var cells = gateCells, m4 = m4b, ci2 = 0;
          for (var c = 0; c < cells.length; c++) {
            var cel = cells[c];
            var on = Math.sin(t * cel.w + cel.ph) + 0.35 * Math.sin(t * 0.7 + cel.x * 2.1 - cel.k) > 0.25 ? 1 : 0;
            cel.lvl += (on - cel.lvl) * Math.min(1, dt * 7);
            var L = cel.lvl;
            gateMesh.setColorAt(c, col.setRGB(K.lerp(0.72, 0.86, L), K.lerp(0.74, 0.55, L), K.lerp(0.78, 0.38, L)));
            if (L < 0.02) { m4.makeScale(0, 0, 0); }
            else { m4.makeScale(L, 1, 1); m4.setPosition(cel.x, GH - 0.004, cel.z); }
            capMesh.setMatrixAt(c, m4);
            for (var fi2 = 0; fi2 < GROUP; fi2++) {
              var fz = cel.z + (fi2 - (GROUP - 1) / 2) * FP;
              for (var sd = -1; sd <= 1; sd += 2) {
                if (L < 0.02) m4.makeScale(0, 0, 0);
                else { m4.makeScale(L, 1, 1); m4.setPosition(cel.x + sd * (GW / 2 + 0.035), FH + 0.004, fz); }
                chMesh.setMatrixAt(ci2++, m4);
              }
            }
          }
          gateMesh.instanceColor.needsUpdate = true;
          capMesh.instanceMatrix.needsUpdate = true;
          chMesh.instanceMatrix.needsUpdate = true;
        }
        // captions follow the nearest stage, with a soft cross-fade near the midpoint
        var near = Math.round(S.p) % 5, frac = Math.abs(S.p - Math.round(S.p));
        if (near !== S.capIdx) {
          S.capIdx = near;
          capTag.set((near + 1) + ' / 5');
          capName.set(NAMES[near]);
          capNote.set(NOTES[near]);
        }
        var ca = 1 - K.smoothstep(0.25, 0.48, frac);
        capTag.el.style.opacity = capName.el.style.opacity = capNote.el.style.opacity = ca.toFixed(3);
        tagSlow.show(near === 4 || near === 1);
        tagSlow.set(near === 4 ? 'basitleştirilmiş model · yavaşlatılmış\ngerçekte saniyede milyarlarca kez' : 'hızlandırılmış\ngerçekte saatlerce sürer');
        tagSlow.el.style.opacity = (near === 4 || near === 1) ? ca.toFixed(3) : '0';
        v.render(dt);
        if (!K.skipRender) drawOverlay(alphas, t);
      },
      resize: function () {},
      dispose: function () { v.dispose(); }
    };
  });

})();
