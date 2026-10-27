/* Köklerden Göklere · sunum görselleri çekirdeği (2B + 3B)
 *
 * Her görsel KGViz.register(ad, fabrika) ile kaydolur. Fabrika (el, opts) alır
 * ve şu nesneyi döndürür:
 *   { reset(), frame(t, dt), resize()?, set(key, value)?, read(key)?, dispose()? }
 * Sunum, yalnızca etkin slayttaki görsellerin frame() işlevini tek bir
 * requestAnimationFrame döngüsünden çağırır: t etkinleşmeden bu yana geçen
 * saniye, dt son kareden bu yana geçen saniyedir (en çok 0,05).
 *
 * 3B görseller tek bir ortak WebGL bağlamında çizilir (KGViz.stage3d) ve her
 * görselin kendi 2B tuvaline kopyalanır; böylece slayt sayısı ne olursa olsun
 * tarayıcının WebGL bağlam sınırına takılmayız.
 */
(function () {
  'use strict';

  var palette = {
    paper: '#F5F5F1', surface: '#FFFFFF', line: '#E3E3DD', line2: '#D6D6CF',
    ink: '#15171C', ink2: '#3E434D', muted: '#595E69',
    blue: '#2343B0', blueSoft: '#DCE3F6',
    copper: '#A64B22', copperFill: '#C8693A', copperSoft: '#F3DCCB',
    neutral: '#B8BCC6',
    night: '#0E121A', night2: '#161B26', nightLine: '#262D3B',
    onNight: '#EEF0F3', onNightMuted: '#9AA3B2',
    blueLight: '#8EA6F2', copperLight: '#E39A6C',
    lamp: '#F2C46B'
  };

  var fonts = {
    sans: "'IBM Plex Sans', 'Segoe UI', system-ui, sans-serif",
    mono: "'IBM Plex Mono', Consolas, monospace"
  };

  var registry = {};
  var surfaces = [];
  var spriteCache = {};

  function clamp(x, a, b) { return x < a ? a : x > b ? b : x; }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function smoothstep(a, b, x) { var t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); }

  function hexToRgb(hex) {
    var h = hex.replace('#', '');
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    var n = parseInt(h, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }

  /* Label styles for 3D overlays, injected once */
  (function injectCss() {
    var css =
      '.kg-labels{position:absolute;left:0;top:0;right:0;bottom:0;pointer-events:none;z-index:2;overflow:hidden}' +
      '.kg-l{position:absolute;left:0;top:0;white-space:nowrap;font-family:' + fonts.sans + ';font-size:13px;line-height:1.25;color:#3E434D;transition:opacity .35s ease}' +
      '.kg-l.name{font-weight:600;color:#15171C}' +
      '.kg-l.tag{font-family:' + fonts.mono + ';font-size:11px;font-weight:500;letter-spacing:.12em;color:#595E69}' +
      '.kg-l.value{font-family:' + fonts.mono + ';font-weight:500;color:#15171C}' +
      '.kg-l.note{font-size:12px;color:#595E69}' +
      '.kg-l.chip{background:rgba(255,255,255,.9);border:1px solid #E3E3DD;border-radius:6px;padding:3px 7px}' +
      '.kg-l.hide{opacity:0}' +
      '.kg-dark .kg-l{color:#C9CFDA}.kg-dark .kg-l.name,.kg-dark .kg-l.value{color:#EEF0F3}' +
      '.kg-dark .kg-l.tag,.kg-dark .kg-l.note{color:#9AA3B2}' +
      '.kg-dark .kg-l.chip{background:rgba(14,18,26,.85);border-color:#262D3B}';
    var s = document.createElement('style');
    s.setAttribute('data-kg-viz', '');
    s.textContent = css;
    (document.head || document.documentElement).appendChild(s);
  })();

  var KGViz = {
    palette: palette,
    fonts: fonts,
    stageScale: 1,
    /* When true, stage3d.render() skips GPU work (used to fast-forward time). */
    skipRender: false,
    reducedMotion: !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches),

    register: function (name, factory) { registry[name] = factory; },
    has: function (name) { return !!registry[name]; },
    names: function () { return Object.keys(registry); },
    create: function (name, el, opts) {
      var factory = registry[name];
      if (!factory) return null;
      return factory(el, opts || {}) || null;
    },

    /* Backing-store density: device pixels × current stage scale, capped. */
    /* quality (0.45–1) is lowered automatically by the deck when frames take too long. */
    quality: 1,
    pixelRatio: function () { return Math.max(1, Math.min(2.5, (window.devicePixelRatio || 1) * KGViz.stageScale) * KGViz.quality); },
    setStageScale: function (s) {
      KGViz.stageScale = s;
      surfaces.forEach(function (sf) { sf.resize(); });
    },
    setQuality: function (q) {
      q = Math.max(0.7, Math.min(1, q));
      if (Math.abs(q - KGViz.quality) < 0.01) return;
      KGViz.quality = q;
      surfaces.forEach(function (sf) { sf.resize(); });
    },

    /* A 2D canvas filling `el`. Draw in CSS px; the transform handles density. */
    surface: function (el) {
      var canvas = document.createElement('canvas');
      canvas.setAttribute('aria-hidden', 'true');
      canvas.style.cssText = 'position:absolute;left:0;top:0;width:100%;height:100%;display:block';
      if (window.getComputedStyle(el).position === 'static') el.style.position = 'relative';
      el.appendChild(canvas);
      var sf = {
        canvas: canvas,
        ctx: canvas.getContext('2d'),
        w: 0, h: 0, k: 1,
        resize: function () {
          sf.w = el.offsetWidth;
          sf.h = el.offsetHeight;
          sf.k = KGViz.pixelRatio();
          canvas.width = Math.max(1, Math.round(sf.w * sf.k));
          canvas.height = Math.max(1, Math.round(sf.h * sf.k));
          sf.ctx.setTransform(sf.k, 0, 0, sf.k, 0, 0);
        },
        clear: function () {
          sf.ctx.setTransform(1, 0, 0, 1, 0, 0);
          sf.ctx.clearRect(0, 0, canvas.width, canvas.height);
          sf.ctx.setTransform(sf.k, 0, 0, sf.k, 0, 0);
        },
        dispose: function () {
          var i = surfaces.indexOf(sf);
          if (i >= 0) surfaces.splice(i, 1);
          if (canvas.parentNode) canvas.parentNode.removeChild(canvas);
        }
      };
      sf.resize();
      surfaces.push(sf);
      return sf;
    },

    /* An offscreen 2D canvas at the current density, for caching static layers. */
    layer: function (w, h) {
      var k = KGViz.pixelRatio();
      var c = document.createElement('canvas');
      c.width = Math.max(1, Math.round(w * k));
      c.height = Math.max(1, Math.round(h * k));
      var ctx = c.getContext('2d');
      ctx.setTransform(k, 0, 0, k, 0, 0);
      return { canvas: c, ctx: ctx, w: w, h: h, k: k };
    },

    /* Seeded PRNG (mulberry32): deterministic frames for review. */
    rng: function (seed) {
      var a = (seed >>> 0) || 1;
      return function () {
        a = (a + 0x6D2B79F5) >>> 0;
        var t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      };
    },

    clamp: clamp,
    lerp: lerp,
    smoothstep: smoothstep,
    /* 0→1 progress of t through [a, b] */
    span: function (t, a, b) { return clamp((t - a) / (b - a), 0, 1); },
    ease: {
      linear: function (t) { return t; },
      in: function (t) { return t * t * t; },
      out: function (t) { return 1 - Math.pow(1 - t, 3); },
      inOut: function (t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; },
      outQuint: function (t) { return 1 - Math.pow(1 - t, 5); },
      sine: function (t) { return 0.5 - 0.5 * Math.cos(Math.PI * t); }
    },

    rgba: function (hex, a) { var c = hexToRgb(hex); return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + a + ')'; },
    mix: function (hexA, hexB, t) {
      var a = hexToRgb(hexA), b = hexToRgb(hexB);
      return 'rgb(' + Math.round(lerp(a[0], b[0], t)) + ',' + Math.round(lerp(a[1], b[1], t)) + ',' + Math.round(lerp(a[2], b[2], t)) + ')';
    },

    /* Turkish number formatting: 0,05 · 300.000 */
    num: function (x, digits) {
      var d = digits === undefined ? 0 : digits;
      var s = Math.abs(x).toFixed(d).split('.');
      s[0] = s[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
      return (x < 0 ? '−' : '') + s.join(',');
    },

    font: function (size, weight, mono) {
      return (weight || 400) + ' ' + size + 'px ' + (mono ? fonts.mono : fonts.sans);
    },

    /* 2D text helper. o: {size, weight, mono, color, align, baseline, spacing (px), alpha} */
    label: function (ctx, text, x, y, o) {
      o = o || {};
      ctx.save();
      ctx.font = KGViz.font(o.size || 13, o.weight || 400, o.mono);
      ctx.fillStyle = o.color || palette.ink2;
      ctx.textAlign = o.align || 'left';
      ctx.textBaseline = o.baseline || 'alphabetic';
      if (o.alpha !== undefined) ctx.globalAlpha *= o.alpha;
      if ('letterSpacing' in ctx) ctx.letterSpacing = (o.spacing || 0) + 'px';
      ctx.fillText(text, x, y);
      ctx.restore();
    },

    /* Rounded-rectangle path */
    rr: function (ctx, x, y, w, h, r) {
      r = Math.min(r, w / 2, h / 2);
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.arcTo(x + w, y, x + w, y + h, r);
      ctx.arcTo(x + w, y + h, x, y + h, r);
      ctx.arcTo(x, y + h, x, y, r);
      ctx.arcTo(x, y, x + w, y, r);
      ctx.closePath();
    },

    /* Straight 2D arrow. o: {color, width, head, alpha, dash} */
    arrow: function (ctx, x1, y1, x2, y2, o) {
      o = o || {};
      var head = o.head || 7, ang = Math.atan2(y2 - y1, x2 - x1);
      ctx.save();
      if (o.alpha !== undefined) ctx.globalAlpha *= o.alpha;
      ctx.strokeStyle = ctx.fillStyle = o.color || palette.ink;
      ctx.lineWidth = o.width || 1.2;
      ctx.lineCap = 'round';
      if (o.dash) ctx.setLineDash(o.dash);
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2 - Math.cos(ang) * head * 0.6, y2 - Math.sin(ang) * head * 0.6);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.moveTo(x2, y2);
      ctx.lineTo(x2 - Math.cos(ang - 0.42) * head, y2 - Math.sin(ang - 0.42) * head);
      ctx.lineTo(x2 - Math.cos(ang + 0.42) * head, y2 - Math.sin(ang + 0.42) * head);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    },

    /* Cached soft radial sprite for light and glow (avoids shadowBlur). */
    glow: function (hex, radius) {
      var key = hex + '|' + radius + '|' + KGViz.pixelRatio();
      if (spriteCache[key]) return spriteCache[key];
      var L = KGViz.layer(radius * 2, radius * 2);
      var g = L.ctx.createRadialGradient(radius, radius, 0, radius, radius, radius);
      g.addColorStop(0, KGViz.rgba(hex, 1));
      g.addColorStop(0.35, KGViz.rgba(hex, 0.45));
      g.addColorStop(1, KGViz.rgba(hex, 0));
      L.ctx.fillStyle = g;
      L.ctx.fillRect(0, 0, radius * 2, radius * 2);
      spriteCache[key] = L.canvas;
      return L.canvas;
    },
    drawGlow: function (ctx, hex, x, y, radius, alpha) {
      var s = KGViz.glow(hex, radius);
      ctx.save();
      ctx.globalAlpha *= (alpha === undefined ? 1 : alpha);
      ctx.drawImage(s, x - radius, y - radius, radius * 2, radius * 2);
      ctx.restore();
    },

    /* Shaded 2D sphere sprite (ion, atom). */
    sphere: function (hex, r) {
      var key = 'sph|' + hex + '|' + r + '|' + KGViz.pixelRatio();
      if (spriteCache[key]) return spriteCache[key];
      var L = KGViz.layer(r * 2 + 2, r * 2 + 2);
      var c = r + 1;
      var g = L.ctx.createRadialGradient(c - r * 0.35, c - r * 0.4, r * 0.1, c, c, r);
      g.addColorStop(0, KGViz.mix(hex, '#FFFFFF', 0.45));
      g.addColorStop(0.55, hex);
      g.addColorStop(1, KGViz.mix(hex, '#000000', 0.25));
      L.ctx.fillStyle = g;
      L.ctx.beginPath();
      L.ctx.arc(c, c, r, 0, Math.PI * 2);
      L.ctx.fill();
      spriteCache[key] = L.canvas;
      return L.canvas;
    },
    drawSphere: function (ctx, hex, x, y, r, alpha) {
      var s = KGViz.sphere(hex, r);
      ctx.save();
      if (alpha !== undefined) ctx.globalAlpha *= alpha;
      ctx.drawImage(s, x - r - 1, y - r - 1, r * 2 + 2, r * 2 + 2);
      ctx.restore();
    }
  };

  /* =====================================================================
   * 3D: one shared WebGL renderer, blitted into each visual's 2D canvas
   * ===================================================================== */

  var gl = null;
  var envTex = null;

  function hasThree() { return typeof window.THREE !== 'undefined'; }

  /* Treat hex colours as sRGB from the very start, so colours created before the first
   * 3D stage (module-level constants, early materials) match those created after it. */
  if (hasThree() && window.THREE.ColorManagement) window.THREE.ColorManagement.legacyMode = false;

  function glInit() {
    if (gl) return gl;
    if (!hasThree()) return null;
    var THREE = window.THREE;
    if (THREE.ColorManagement) THREE.ColorManagement.legacyMode = false;
    var canvas = document.createElement('canvas');
    var renderer;
    try {
      renderer = new THREE.WebGLRenderer({
        /* Edge smoothing (MSAA) is expensive and unnecessary once we already draw at ≥2× density. ?aa=0/1 forces it. */
        canvas: canvas, antialias: /[?&]aa=1/.test(location.search) || (!/[?&]aa=0/.test(location.search) && KGViz.pixelRatio() < 2), alpha: true, premultipliedAlpha: true,
        powerPreference: 'high-performance', preserveDrawingBuffer: false
      });
    } catch (e) {
      if (window.console) console.warn('KGViz: WebGL başlatılamadı', e);
      return null;
    }
    renderer.setPixelRatio(1);
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.setClearColor(0x000000, 0);
    renderer.autoClear = false;
    gl = { renderer: renderer, canvas: canvas, w: 0, h: 0, lost: false };
    canvas.addEventListener('webglcontextlost', function (e) { e.preventDefault(); gl.lost = true; }, false);
    canvas.addEventListener('webglcontextrestored', function () { gl.lost = false; }, false);
    return gl;
  }

  /* Size the shared drawing buffer to exactly this visual. Point sprites and other
   * size-dependent effects then behave the same in the deck as in the harness. The buffer
   * is only reallocated when the size changes, which normally happens on slide changes. */
  function glEnsure(w, h) {
    if (w !== gl.w || h !== gl.h) {
      gl.w = w;
      gl.h = h;
      gl.renderer.setSize(gl.w, gl.h, false);
    }
  }

  KGViz.hasWebGL = function () { return !!glInit(); };
  KGViz.renderer = function () { var g = glInit(); return g ? g.renderer : null; };

  /* Neutral studio environment for reflections (PMREM of THREE.RoomEnvironment). */
  KGViz.envMap = function () {
    if (envTex) return envTex;
    var g = glInit();
    if (!g) return null;
    var THREE = window.THREE;
    var pmrem = new THREE.PMREMGenerator(g.renderer);
    var room = THREE.RoomEnvironment ? new THREE.RoomEnvironment() : null;
    if (room) {
      envTex = pmrem.fromScene(room, 0.04).texture;
      if (room.dispose) room.dispose();
    }
    pmrem.dispose();
    return envTex;
  };

  /* Standard three-point studio lighting with an optional shadow catcher.
   * o: {theme:'light'|'dark'|'card', size: scene radius in world units,
   *     shadows: bool, ground: y of shadow catcher (omit for none), env: bool} */
  KGViz.studio = function (scene, o) {
    var THREE = window.THREE;
    o = o || {};
    var s = o.size || 6;
    var dark = o.theme === 'dark';
    if (o.env !== false) scene.environment = KGViz.envMap();
    var hemi = new THREE.HemisphereLight(0xffffff, dark ? 0x1a1f2b : 0xe7e2d8, dark ? 0.25 : 0.4);
    scene.add(hemi);
    var key = new THREE.DirectionalLight(0xffffff, dark ? 1.1 : 1.5);
    key.position.set(s * 0.8, s * 1.7, s * 1.2);
    if (o.shadows !== false) {
      key.castShadow = true;
      /* 1024² keeps soft contact shadows while staying cheap on school laptops */
      key.shadow.mapSize.set(o.shadowSize || 1024, o.shadowSize || 1024);
      var c = key.shadow.camera;
      c.left = -s * 1.6; c.right = s * 1.6; c.top = s * 1.6; c.bottom = -s * 1.6;
      c.near = 0.05; c.far = s * 8;
      key.shadow.bias = -0.0003;
      key.shadow.normalBias = 0.02;
      key.shadow.radius = 3;
    }
    scene.add(key);
    scene.add(key.target);
    var fill = new THREE.DirectionalLight(0xe2e8ff, dark ? 0.3 : 0.4);
    fill.position.set(-s * 1.3, s * 0.6, s * 0.9);
    scene.add(fill);
    var rim = new THREE.DirectionalLight(0xffffff, dark ? 0.7 : 0.45);
    rim.position.set(-s * 0.4, s * 1.0, -s * 1.5);
    scene.add(rim);
    var ground = null;
    if (typeof o.ground === 'number') {
      ground = new THREE.Mesh(new THREE.PlaneGeometry(s * 10, s * 10), new THREE.ShadowMaterial({ opacity: dark ? 0.35 : 0.13 }));
      ground.rotation.x = -Math.PI / 2;
      ground.position.y = o.ground;
      ground.receiveShadow = true;
      scene.add(ground);
    }
    return { hemi: hemi, key: key, fill: fill, rim: rim, ground: ground };
  };

  /* Shared material presets so every scene speaks the same visual language. */
  KGViz.mat = {
    std: function (color, rough, metal, extra) {
      var THREE = window.THREE;
      var m = new THREE.MeshStandardMaterial({ color: color, roughness: rough === undefined ? 0.5 : rough, metalness: metal || 0 });
      if (extra) m.setValues(extra);
      return m;
    },
    copper: function (x) { return KGViz.mat.std(0xD08A5C, 0.3, 1, x); },
    copperOxide: function (x) { return KGViz.mat.std(0xA8653E, 0.55, 0.8, x); },
    tin: function (x) { return KGViz.mat.std(0xC9CCD1, 0.32, 1, x); },
    steel: function (x) { return KGViz.mat.std(0xB9BEC6, 0.28, 1, x); },
    zinc: function (x) { return KGViz.mat.std(0xA7ADB6, 0.5, 0.9, x); },
    gold: function (x) { return KGViz.mat.std(0xE2B865, 0.25, 1, x); },
    aluminium: function (x) { return KGViz.mat.std(0xD4D7DC, 0.35, 1, x); },
    plasticWhite: function (x) { return KGViz.mat.std(0xF1F0EB, 0.55, 0, x); },
    plasticBlack: function (x) { return KGViz.mat.std(0x1E2128, 0.5, 0, x); },
    plasticGrey: function (x) { return KGViz.mat.std(0x8A8F99, 0.5, 0, x); },
    plasticRed: function (x) { return KGViz.mat.std(0xB3352A, 0.45, 0, x); },
    plasticBlue: function (x) { return KGViz.mat.std(0x2343B0, 0.45, 0, x); },
    ceramic: function (x) { return KGViz.mat.std(0xE3D2B0, 0.6, 0, x); },
    fr4: function (x) { return KGViz.mat.std(0xC8B784, 0.7, 0, x); },
    solderMask: function (x) { return KGViz.mat.std(0x1F4F3B, 0.38, 0, x); },
    silkscreen: function (x) { return KGViz.mat.std(0xF4F4F0, 0.6, 0, x); },
    wood: function (x) { return KGViz.mat.std(0xCDAA80, 0.75, 0, x); },
    paper: function (x) { return KGViz.mat.std(0xF5F5F1, 0.9, 0, x); },
    glass: function (x) {
      var THREE = window.THREE;
      var m = new THREE.MeshPhysicalMaterial({ color: 0xffffff, metalness: 0, roughness: 0.04, transmission: 0.95, thickness: 0.5, ior: 1.5, transparent: true });
      if (x) m.setValues(x);
      return m;
    },
    epoxy: function (tint, x) {
      var THREE = window.THREE;
      var m = new THREE.MeshPhysicalMaterial({ color: tint === undefined ? 0xffffff : tint, metalness: 0, roughness: 0.1, transmission: 0.88, thickness: 2, ior: 1.52, transparent: true });
      if (x) m.setValues(x);
      return m;
    },
    water: function (x) {
      var THREE = window.THREE;
      var m = new THREE.MeshPhysicalMaterial({ color: 0xcfe0ee, metalness: 0, roughness: 0.08, transmission: 0.9, thickness: 1.5, ior: 1.33, transparent: true });
      if (x) m.setValues(x);
      return m;
    },
    /* Particles: consistent colour semantics across the deck */
    electron: function (dark) { return KGViz.mat.std(dark ? 0x8EA6F2 : 0x2848C8, 0.42, 0, { emissive: dark ? 0x6F8BE6 : 0x1A36A8, emissiveIntensity: dark ? 0.9 : 0.4, envMapIntensity: 0.45 }); },
    hole: function () { return KGViz.mat.std(0xC8693A, 0.35, 0, { emissive: 0x8A3E16, emissiveIntensity: 0.35 }); },
    proton: function () { return KGViz.mat.std(0xC8693A, 0.4, 0.1); },
    neutron: function () { return KGViz.mat.std(0xB8BCC6, 0.45, 0.05); },
    ionPositive: function () { return KGViz.mat.std(0xD08A5C, 0.35, 0.3); },
    ionNegative: function () { return KGViz.mat.std(0x5873C9, 0.35, 0.1); },
    glowBasic: function (color, opacity) {
      var THREE = window.THREE;
      return new THREE.MeshBasicMaterial({ color: color, transparent: true, opacity: opacity === undefined ? 1 : opacity, depthWrite: false, toneMapped: false });
    }
  };

  /* Instanced spheres for many particles. Returns InstancedMesh with setAt(i,x,y,z,scale) and commit(). */
  KGViz.instanced = function (count, o) {
    var THREE = window.THREE;
    o = o || {};
    var geo = o.geometry || new THREE.IcosahedronGeometry(o.radius || 0.05, o.detail === undefined ? 2 : o.detail);
    var mat = o.material || KGViz.mat.electron(o.dark);
    var mesh = new THREE.InstancedMesh(geo, mat, count);
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    mesh.castShadow = !!o.castShadow;
    mesh.frustumCulled = false;
    var m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3();
    mesh.setAt = function (i, x, y, z, sc) {
      p.set(x, y, z);
      s.setScalar(sc === undefined ? 1 : sc);
      m.compose(p, q, s);
      mesh.setMatrixAt(i, m);
    };
    mesh.hideAt = function (i) { mesh.setAt(i, 0, -9999, 0, 0.0001); };
    mesh.commit = function () { mesh.instanceMatrix.needsUpdate = true; };
    return mesh;
  };

  /* Insulated wire or bare conductor along points. o: {radius, material, segments, closed} */
  KGViz.wire = function (points, o) {
    var THREE = window.THREE;
    o = o || {};
    var pts = points.map(function (p) { return p.isVector3 ? p : new THREE.Vector3(p[0], p[1], p[2]); });
    var curve = new THREE.CatmullRomCurve3(pts, !!o.closed, 'catmullrom', o.tension === undefined ? 0.4 : o.tension);
    var geo = new THREE.TubeGeometry(curve, o.segments || Math.max(32, pts.length * 24), o.radius || 0.05, o.radial || 12, !!o.closed);
    var mesh = new THREE.Mesh(geo, o.material || KGViz.mat.plasticRed());
    mesh.castShadow = o.castShadow !== false;
    mesh.receiveShadow = true;
    mesh.curve = curve;
    return mesh;
  };

  /* Canvas texture for printed markings (battery labels, chip text, scale ticks). */
  KGViz.textTexture = function (w, h, draw) {
    var THREE = window.THREE;
    var c = document.createElement('canvas');
    c.width = w; c.height = h;
    var ctx = c.getContext('2d');
    draw(ctx, w, h);
    var tex = new THREE.CanvasTexture(c);
    tex.encoding = THREE.sRGBEncoding;
    tex.anisotropy = 8;
    return tex;
  };

  KGViz.disposeScene = function (scene) {
    if (!scene) return;
    scene.traverse(function (o) {
      if (o.geometry) o.geometry.dispose();
      if (o.material) {
        (Array.isArray(o.material) ? o.material : [o.material]).forEach(function (m) {
          for (var k in m) { if (m[k] && m[k].isTexture) m[k].dispose(); }
          m.dispose();
        });
      }
    });
  };

  /* Drag-to-orbit camera rig with damping, wheel zoom and double-click reset. */
  function makeOrbit(el, view, o) {
    var st = {
      enabled: o.orbit !== false,
      dragging: false, lx: 0, ly: 0, vy: 0, vp: 0, idle: 99, anim: null,
      minPitch: o.minPitch === undefined ? -0.15 : o.minPitch,
      maxPitch: o.maxPitch === undefined ? 1.25 : o.maxPitch,
      minYaw: o.minYaw === undefined ? -Infinity : o.minYaw,
      maxYaw: o.maxYaw === undefined ? Infinity : o.maxYaw,
      minDist: o.minDistance || view.distance * 0.55,
      maxDist: o.maxDistance || view.distance * 1.8,
      autoRotate: o.autoRotate || 0
    };
    function clampView() {
      view.pitch = clamp(view.pitch, st.minPitch, st.maxPitch);
      view.yaw = clamp(view.yaw, st.minYaw, st.maxYaw);
      view.distance = clamp(view.distance, st.minDist, st.maxDist);
    }
    st.clampView = clampView;
    if (!st.enabled) return st;
    el.style.touchAction = 'none';
    el.style.cursor = 'grab';
    el.addEventListener('pointerdown', function (e) {
      if (!st.enabled || e.button > 0) return;
      st.dragging = true; st.lx = e.clientX; st.ly = e.clientY; st.idle = 0; st.anim = null;
      st.vy = st.vp = 0;
      try { el.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
      el.style.cursor = 'grabbing';
    });
    el.addEventListener('pointermove', function (e) {
      if (!st.dragging) return;
      var s = KGViz.stageScale || 1;
      var dx = (e.clientX - st.lx) / s, dy = (e.clientY - st.ly) / s;
      st.lx = e.clientX; st.ly = e.clientY;
      st.vy = -dx * 0.008; st.vp = dy * 0.006;
      view.yaw += st.vy; view.pitch += st.vp;
      clampView();
      st.idle = 0;
    });
    function end() { st.dragging = false; el.style.cursor = 'grab'; }
    el.addEventListener('pointerup', end);
    el.addEventListener('pointercancel', end);
    el.addEventListener('wheel', function (e) {
      if (!st.enabled) return;
      e.preventDefault();
      view.distance *= Math.exp(e.deltaY * 0.0012);
      clampView();
      st.idle = 0;
    }, { passive: false });
    el.addEventListener('dblclick', function () { st.home && st.home(); });
    return st;
  }

  /* A 3D stage inside `el`. o: {theme, fov, near, far, yaw, pitch, distance,
   * target:[x,y,z], orbit:bool, autoRotate:rad/s, minPitch, maxPitch, minYaw, maxYaw,
   * minDistance, maxDistance, studio:bool, size, shadows, ground, exposure} */
  KGViz.stage3d = function (el, o) {
    var THREE = window.THREE;
    o = o || {};
    var g = glInit();
    var sf = KGViz.surface(el);
    if (o.theme === 'dark') el.classList.add('kg-dark');
    var labelsEl = document.createElement('div');
    labelsEl.className = 'kg-labels';
    el.appendChild(labelsEl);
    var lblTick = 0;

    var scene = new THREE.Scene();
    var camera = new THREE.PerspectiveCamera(o.fov || 30, Math.max(1, sf.w) / Math.max(1, sf.h), o.near || 0.05, o.far || 2000);
    var view = {
      yaw: o.yaw === undefined ? 0.5 : o.yaw,
      pitch: o.pitch === undefined ? 0.35 : o.pitch,
      distance: o.distance || 10,
      target: new THREE.Vector3().fromArray(o.target || [0, 0, 0])
    };
    var home = { yaw: view.yaw, pitch: view.pitch, distance: view.distance, target: view.target.clone() };
    var orbit = makeOrbit(el, view, o);
    var labels = [];
    var tmp = new THREE.Vector3();
    var lastW = 0, lastH = 0;

    var v = {
      el: el, sf: sf, ctx: sf.ctx, scene: scene, camera: camera, view: view, home: home, orbit: orbit,
      w: sf.w, h: sf.h, exposure: o.exposure || 1, manualCamera: false, ready: !!g,
      lights: null,

      /* Place the camera from yaw/pitch/distance around the target */
      applyView: function () {
        var cp = Math.cos(view.pitch);
        camera.position.set(
          view.target.x + view.distance * Math.sin(view.yaw) * cp,
          view.target.y + view.distance * Math.sin(view.pitch),
          view.target.z + view.distance * Math.cos(view.yaw) * cp
        );
        camera.lookAt(view.target);
      },

      /* Smooth programmatic camera move. to: {yaw, pitch, distance, target:[x,y,z]} */
      animateTo: function (to, dur) {
        orbit.anim = {
          t: 0, dur: dur || 1.2,
          from: { yaw: view.yaw, pitch: view.pitch, distance: view.distance, target: view.target.clone() },
          to: {
            yaw: to.yaw === undefined ? view.yaw : to.yaw,
            pitch: to.pitch === undefined ? view.pitch : to.pitch,
            distance: to.distance === undefined ? view.distance : to.distance,
            target: to.target ? new THREE.Vector3().fromArray(to.target) : view.target.clone()
          }
        };
      },
      /* Jump without animation (used by reset()) */
      setView: function (to) {
        if (to.yaw !== undefined) view.yaw = to.yaw;
        if (to.pitch !== undefined) view.pitch = to.pitch;
        if (to.distance !== undefined) view.distance = to.distance;
        if (to.target) view.target.fromArray(to.target);
        orbit.anim = null; orbit.vy = orbit.vp = 0;
      },
      goHome: function (dur) {
        v.animateTo({ yaw: home.yaw, pitch: home.pitch, distance: home.distance, target: home.target.toArray() }, dur || 0.9);
      },

      /* DOM label anchored to a 3D point. o: {at: Vector3|[x,y,z]|function, cls:'name'|'tag'|'value'|'note'|'chip' (space separated),
       *   dx, dy (px offset), align:'left'|'center'|'right', valign:'top'|'middle'|'bottom', line: bool (leader line), html: bool} */
      label: function (text, lo) {
        lo = lo || {};
        var div = document.createElement('div');
        div.className = 'kg-l ' + (lo.cls || 'name');
        if (lo.html) div.innerHTML = text; else div.textContent = text;
        labelsEl.appendChild(div);
        var L = {
          el: div, at: lo.at, dx: lo.dx || 0, dy: lo.dy || 0, align: lo.align || 'center', valign: lo.valign || 'middle',
          line: !!lo.line, visible: lo.visible !== false, opacity: 1, sx: 0, sy: 0,
          set: function (t) { if (L._t !== t) { L._t = t; L._cw = 0; if (lo.html) div.innerHTML = t; else div.textContent = t; } return L; },
          show: function (b) { L.visible = b !== false; return L; }
        };
        labels.push(L);
        return L;
      },

      /* Project a 3D point to stage px within this visual: {x, y, visible} */
      project: function (p) {
        tmp.copy(p.isVector3 ? p : tmp.fromArray(p));
        tmp.project(camera);
        return { x: (tmp.x + 1) / 2 * sf.w, y: (1 - tmp.y) / 2 * sf.h, visible: tmp.z < 1 && tmp.z > -1 };
      },

      /* Advance the camera rig, draw the scene and position labels. Call once at the end of frame(). */
      render: function (dt) {
        dt = dt === undefined ? 1 / 60 : dt;
        if (sf.w !== lastW || sf.h !== lastH) {
          lastW = sf.w; lastH = sf.h;
          camera.aspect = Math.max(1, sf.w) / Math.max(1, sf.h);
          camera.updateProjectionMatrix();
          v.w = sf.w; v.h = sf.h;
        }
        if (orbit.anim) {
          var A = orbit.anim;
          A.t += dt;
          var k = KGViz.ease.inOut(clamp(A.t / A.dur, 0, 1));
          view.yaw = lerp(A.from.yaw, A.to.yaw, k);
          view.pitch = lerp(A.from.pitch, A.to.pitch, k);
          view.distance = lerp(A.from.distance, A.to.distance, k);
          view.target.lerpVectors(A.from.target, A.to.target, k);
          if (A.t >= A.dur) orbit.anim = null;
        } else if (!orbit.dragging && (orbit.vy || orbit.vp)) {
          var damp = Math.pow(0.004, dt);
          view.yaw += orbit.vy; view.pitch += orbit.vp;
          orbit.vy *= damp; orbit.vp *= damp;
          if (Math.abs(orbit.vy) < 1e-5) orbit.vy = 0;
          if (Math.abs(orbit.vp) < 1e-5) orbit.vp = 0;
          orbit.clampView();
        }
        orbit.idle += dt;
        if (orbit.autoRotate && !orbit.dragging && !orbit.anim && orbit.idle > 4) view.yaw += orbit.autoRotate * dt;
        if (!v.manualCamera) v.applyView();
        if (KGViz.skipRender) return;

        sf.clear();
        if (g && !g.lost) {
          var r = g.renderer;
          var wPx = Math.max(1, Math.round(sf.w * sf.k)), hPx = Math.max(1, Math.round(sf.h * sf.k));
          glEnsure(wPx, hPx);
          r.setViewport(0, 0, wPx, hPx);
          r.setScissor(0, 0, wPx, hPx);
          r.setScissorTest(true);
          r.toneMappingExposure = v.exposure;
          r.setClearColor(0x000000, 0);
          r.clear(true, true, true);
          r.render(scene, camera);
          sf.ctx.drawImage(g.canvas, 0, g.h - hPx, wPx, hPx, 0, 0, sf.w, sf.h);
        }

        lblTick++;
        for (var i = 0; i < labels.length; i++) {
          var L = labels[i];
          var at = typeof L.at === 'function' ? L.at() : L.at;
          if (!at || !L.visible) { L.el.classList.add('hide'); continue; }
          var P = v.project(at.isVector3 ? at : new THREE.Vector3(at[0], at[1], at[2]));
          if (!P.visible) { L.el.classList.add('hide'); continue; }
          L.el.classList.remove('hide');
          /* Reading offsetWidth right after writing a transform forces a layout per label per frame.
           * Label sizes rarely change, so measure once, then re-measure one label at a time. */
          var bw, bh;
          var sig = L.el.textContent.length + (L.el.className.length << 12);   // text or class changed → re-measure
          if (!L._cw || sig !== L._sig || (lblTick + i) % 60 === 0) { L._sig = sig; L._cw = L.el.offsetWidth; L._ch = L.el.offsetHeight; }
          bw = L._cw; bh = L._ch;
          var x = P.x + L.dx, y = P.y + L.dy;
          var ox = L.align === 'left' ? 0 : L.align === 'right' ? -bw : -bw / 2;
          var oy = L.valign === 'top' ? 0 : L.valign === 'bottom' ? -bh : -bh / 2;
          L.el.style.transform = 'translate(' + Math.round(x + ox) + 'px,' + Math.round(y + oy) + 'px)';
          if (L.line && (L.dx || L.dy)) {
            var c = sf.ctx;
            c.save();
            c.strokeStyle = o.theme === 'dark' ? 'rgba(154,163,178,.7)' : 'rgba(89,94,105,.7)';
            c.lineWidth = 1;
            c.beginPath();
            c.moveTo(P.x, P.y);
            c.lineTo(x, y);
            c.stroke();
            c.fillStyle = c.strokeStyle;
            c.beginPath(); c.arc(P.x, P.y, 2, 0, Math.PI * 2); c.fill();
            c.restore();
          }
        }
      },

      dispose: function () {
        KGViz.disposeScene(scene);
        labels.length = 0;
        if (labelsEl.parentNode) labelsEl.parentNode.removeChild(labelsEl);
        sf.dispose();
      }
    };
    orbit.home = function () { v.goHome(); };
    if (o.studio !== false && g) {
      v.lights = KGViz.studio(scene, { theme: o.theme, size: o.size, shadows: o.shadows, ground: o.ground, env: o.env });
    }
    v.applyView();
    return v;
  };

  window.KGViz = KGViz;
})();
