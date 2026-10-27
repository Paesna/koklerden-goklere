/* Köklerden Göklere · Elektrik ve Elektronik Laboratuvarı
   Shared runtime: renderer, camera, labels, module switching, render loop. */
(function () {
  'use strict';

  const KG = (window.KG = { factories: [], mods: [], active: -1 });
  const U = (KG.util = {});

  /* ---------- small utilities ---------- */
  U.TAU = Math.PI * 2;
  U.clamp = (x, a, b) => (x < a ? a : x > b ? b : x);
  U.lerp = (a, b, t) => a + (b - a) * t;
  U.rnd = (a, b) => a + Math.random() * (b - a);
  U.approach = (x, target, step) => x + U.clamp(target - x, -step, step);
  U.easeOut = t => 1 - Math.pow(1 - t, 3);
  U.easeInOut = t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  U.smooth = (a, b, x) => { const t = U.clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  U.nf = (x, d) => x.toLocaleString('tr-TR', { minimumFractionDigits: d || 0, maximumFractionDigits: d || 0 });
  U.sup = n => String(n).replace(/-/g, '⁻').replace(/[0-9]/g, c => '⁰¹²³⁴⁵⁶⁷⁸⁹'[+c]);
  U.SANS = '"IBM Plex Sans","Segoe UI",system-ui,sans-serif';
  U.MONO = '"IBM Plex Mono",Consolas,"Courier New",monospace';
  U.$ = id => document.getElementById(id);

  U.segGroup = function (el, onPick) {
    const btns = Array.from(el.querySelectorAll('button'));
    const set = v => btns.forEach(b => b.setAttribute('aria-pressed', String(b.dataset.v === String(v))));
    btns.forEach(b => {
      b.type = 'button';
      b.addEventListener('click', () => { set(b.dataset.v); onPick(b.dataset.v); });
    });
    return set;
  };

  U.rr = function (g, x, y, w, h, r) {
    g.beginPath();
    g.moveTo(x + r, y);
    g.arcTo(x + w, y, x + w, y + h, r);
    g.arcTo(x + w, y + h, x, y + h, r);
    g.arcTo(x, y + h, x, y, r);
    g.arcTo(x, y, x + w, y, r);
    g.closePath();
  };

  KG.register = (i, factory) => { KG.factories[i] = factory; };

  /* ---------- DOM ---------- */
  const stage = U.$('stage');
  const glCanvas = U.$('gl');
  const c2d = U.$('c2d');
  const waveCv = U.$('wave');
  const labelLayer = U.$('labels');
  const tabs = Array.from(document.querySelectorAll('.tab'));
  const panels = Array.from(document.querySelectorAll('.mp'));
  const failEl = U.$('fail');
  const btnReset = U.$('btn-reset');
  const btnFs = U.$('btn-fs');
  const snote = U.$('snote');
  const shint = U.$('shint');
  KG.dom = { stage, glCanvas, c2d, waveCv, labelLayer };
  KG.reduceMotion = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  KG.DPR = Math.min(window.devicePixelRatio || 1, 1.75);

  /* ---------- three.js setup ---------- */
  KG.has3D = false;
  function init3D() {
    if (typeof window.THREE === 'undefined' || !THREE.OrbitControls || !THREE.RoomEnvironment) return 'lib';
    let r;
    try {
      r = new THREE.WebGLRenderer({ canvas: glCanvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
    } catch (e) { return 'webgl'; }
    if (THREE.ColorManagement) THREE.ColorManagement.legacyMode = false;
    r.setPixelRatio(KG.DPR);
    r.setClearColor(0x000000, 0);
    r.outputEncoding = THREE.sRGBEncoding;
    r.toneMapping = THREE.ACESFilmicToneMapping;
    r.toneMappingExposure = 1.0;
    r.shadowMap.enabled = true;
    r.shadowMap.type = THREE.PCFSoftShadowMap;
    KG.renderer = r;
    KG.camera = new THREE.PerspectiveCamera(38, 1, 0.05, 400);
    const c = (KG.controls = new THREE.OrbitControls(KG.camera, glCanvas));
    c.enableDamping = true; c.dampingFactor = 0.08; c.rotateSpeed = 0.7; c.zoomSpeed = 0.8; c.panSpeed = 0.6;
    const pmrem = new THREE.PMREMGenerator(r);
    KG.envTex = pmrem.fromScene(new THREE.RoomEnvironment(), 0.04).texture;
    pmrem.dispose();
    KG.maxAniso = r.capabilities.getMaxAnisotropy();
    install3DHelpers();
    KG.has3D = true;
    return 'ok';
  }

  KG._installHelpers = () => install3DHelpers();
  function install3DHelpers() {
    const V3 = (U.V3 = (x, y, z) => new THREE.Vector3(x || 0, y || 0, z || 0));
    const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _s = new THREE.Vector3(), _d = new THREE.Vector3(), _c = new THREE.Vector3();
    const Q0 = (U.Q0 = new THREE.Quaternion());
    const YUP = V3(0, 1, 0);
    U.M4 = _m;

    U.setInst = (mesh, i, pos, scale, quat) => { _m.compose(pos, quat || Q0, _s.setScalar(scale)); mesh.setMatrixAt(i, _m); };
    U.bondMatrix = (a, b, r) => {
      _d.subVectors(b, a);
      const len = _d.length() || 1e-6;
      _q.setFromUnitVectors(YUP, _d.divideScalar(len));
      _c.addVectors(a, b).multiplyScalar(0.5);
      return _m.compose(_c, _q, _s.set(r, len, r));
    };
    U.randDir = v => { const u = U.rnd(-1, 1), t = U.rnd(0, U.TAU), s = Math.sqrt(1 - u * u); return v.set(s * Math.cos(t), u, s * Math.sin(t)); };

    U.canvasTex = (c, srgb) => {
      const t = new THREE.CanvasTexture(c);
      if (srgb !== false) t.encoding = THREE.sRGBEncoding;
      t.anisotropy = Math.min(8, KG.maxAniso || 1);
      return t;
    };

    const gc = document.createElement('canvas');
    gc.width = gc.height = 128;
    const gg = gc.getContext('2d');
    const gr = gg.createRadialGradient(64, 64, 0, 64, 64, 64);
    gr.addColorStop(0, 'rgba(255,255,255,1)');
    gr.addColorStop(0.18, 'rgba(255,255,255,.6)');
    gr.addColorStop(0.5, 'rgba(255,255,255,.13)');
    gr.addColorStop(1, 'rgba(255,255,255,0)');
    gg.fillStyle = gr;
    gg.fillRect(0, 0, 128, 128);
    KG.glowTex = new THREE.CanvasTexture(gc);

    const dc = document.createElement('canvas');
    dc.width = dc.height = 64;
    const dg = dc.getContext('2d');
    const dr = dg.createRadialGradient(32, 32, 0, 32, 32, 32);
    dr.addColorStop(0, 'rgba(255,255,255,1)');
    dr.addColorStop(0.55, 'rgba(255,255,255,.85)');
    dr.addColorStop(1, 'rgba(255,255,255,0)');
    dg.fillStyle = dr;
    dg.fillRect(0, 0, 64, 64);
    KG.dotTex = new THREE.CanvasTexture(dc);

    U.glow = (color, size, opacity) => {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: KG.glowTex, color, transparent: true, opacity: opacity == null ? 1 : opacity, depthWrite: false, blending: THREE.AdditiveBlending }));
      s.scale.setScalar(size);
      return s;
    };

    U.makeFloor = (radius, y, color) => {
      const c = document.createElement('canvas');
      c.width = c.height = 256;
      const g = c.getContext('2d');
      const grd = g.createRadialGradient(128, 128, 0, 128, 128, 128);
      grd.addColorStop(0, '#fff'); grd.addColorStop(0.45, '#fff'); grd.addColorStop(1, '#000');
      g.fillStyle = grd;
      g.fillRect(0, 0, 256, 256);
      const mat = new THREE.MeshStandardMaterial({ color: color || 0x1f2532, roughness: 0.9, metalness: 0, transparent: true, alphaMap: new THREE.CanvasTexture(c), envMapIntensity: 0.3, depthWrite: false });
      const m = new THREE.Mesh(new THREE.CircleGeometry(radius, 72), mat);
      m.rotation.x = -Math.PI / 2;
      m.position.y = y;
      m.receiveShadow = true;
      m.renderOrder = -1;
      return m;
    };

    U.keyLight = (scene, o) => {
      o = o || {};
      const pos = o.pos || [5, 11, 8], size = o.size || 10, tg = o.target || [0, 0, 0];
      const L = new THREE.DirectionalLight(0xffffff, o.intensity != null ? o.intensity : 1.25);
      L.position.set(pos[0] + tg[0], pos[1] + tg[1], pos[2] + tg[2]);
      L.target.position.set(tg[0], tg[1], tg[2]);
      if (o.shadow !== false) {
        L.castShadow = true;
        const ms = o.map || 1024;
        L.shadow.mapSize.set(ms, ms);
        const c = L.shadow.camera;
        c.left = -size; c.right = size; c.top = size; c.bottom = -size; c.near = 0.5; c.far = 90;
        L.shadow.bias = -0.0004;
        L.shadow.normalBias = 0.03;
      }
      scene.add(L, L.target);
      const fill = new THREE.DirectionalLight(0xb4c2ff, o.fill != null ? o.fill : 0.3);
      fill.position.set(-pos[0], pos[1] * 0.5, -pos[2]);
      scene.add(fill);
      scene.environment = KG.envTex;
      return L;
    };

    U.roundedPath = (pts, rad, seg) => {
      seg = seg || 8;
      const out = [pts[0].clone()];
      const push = p => { if (out[out.length - 1].distanceToSquared(p) > 1e-8) out.push(p); };
      for (let i = 1; i < pts.length - 1; i++) {
        const p0 = pts[i - 1], p1 = pts[i], p2 = pts[i + 1];
        const d1 = p1.clone().sub(p0), d2 = p2.clone().sub(p1);
        const l1 = d1.length(), l2 = d2.length();
        const r = Math.min(rad, l1 * 0.5, l2 * 0.5);
        const a = p1.clone().addScaledVector(d1.normalize(), -r);
        const b = p1.clone().addScaledVector(d2.normalize(), r);
        for (let k = 0; k <= seg; k++) {
          const t = k / seg;
          push(a.clone().multiplyScalar((1 - t) * (1 - t)).addScaledVector(p1, 2 * (1 - t) * t).addScaledVector(b, t * t));
        }
      }
      push(pts[pts.length - 1].clone());
      return out;
    };
    U.curveFrom = (pts, rad) => {
      const c = new THREE.CatmullRomCurve3(U.roundedPath(pts, rad), false, 'centripetal');
      c.arcLengthDivisions = 1600;
      return c;
    };
    U.sampler = (curve, n) => {
      n = n || 900;
      const P = curve.getSpacedPoints(n);
      return {
        length: curve.getLength(),
        at(u, out) {
          u = ((u % 1) + 1) % 1;
          const f = u * n, i = Math.floor(f), t = f - i;
          const a = P[i], b = P[Math.min(i + 1, n)];
          return out.set(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t, a.z + (b.z - a.z) * t);
        }
      };
    };
    U.roundRectShape = (w, h, r) => {
      const s = new THREE.Shape(), x = -w / 2, y = -h / 2;
      s.moveTo(x + r, y);
      s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r);
      s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
      s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r);
      s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
      return s;
    };
  }

  /* ---------- labels projected onto 3D objects ---------- */
  let curLabels = [];
  KG.setLabels = function (defs) {
    labelLayer.textContent = '';
    curLabels = (defs || []).map(d => {
      const el = document.createElement('div');
      el.className = 'lbl' + (d.flat ? ' flat' : '');
      const sp = document.createElement('span');
      const txt = typeof d.text === 'function' ? d.text() : d.text;
      sp.textContent = txt;
      el.appendChild(sp);
      el.style.opacity = '0';
      labelLayer.appendChild(el);
      return { el, sp, d, last: txt };
    });
  };
  let _pv = null;
  function updateLabels() {
    if (!curLabels.length) return;
    if (!_pv) _pv = new THREE.Vector3();
    const w = stage.clientWidth, h = stage.clientHeight;
    for (const L of curLabels) {
      const d = L.d;
      if (d.vis && !d.vis()) { L.el.style.opacity = '0'; continue; }
      const p = typeof d.pos === 'function' ? d.pos() : d.pos;
      if (!p) { L.el.style.opacity = '0'; continue; }
      const cam = d.cam ? d.cam() : KG.camera;
      _pv.copy(p).project(cam);
      if (_pv.z > 1 || _pv.z < -1 || Math.abs(_pv.x) > 1.1 || Math.abs(_pv.y) > 1.1) { L.el.style.opacity = '0'; continue; }
      L.el.style.opacity = d.alpha ? String(d.alpha()) : '1';
      L.el.style.transform = 'translate(' + ((_pv.x * 0.5 + 0.5) * w).toFixed(1) + 'px,' + ((-_pv.y * 0.5 + 0.5) * h).toFixed(1) + 'px)';
      if (typeof d.text === 'function') {
        const t = d.text();
        if (t !== L.last) { L.sp.textContent = t; L.last = t; }
      }
    }
  }

  /* ---------- camera flight for orbit modules ---------- */
  let fly = null;
  function flyTo(M, fromFar) {
    const hp = new THREE.Vector3().fromArray(M.home.p), ht = new THREE.Vector3().fromArray(M.home.t);
    const p0 = fromFar ? new THREE.Vector3().fromArray(M.from) : KG.camera.position.clone();
    const t0 = fromFar ? ht.clone() : KG.controls.target.clone();
    if (fromFar) { KG.camera.position.copy(p0); KG.controls.target.copy(t0); }
    fly = { k: 0, dur: KG.reduceMotion ? 0.01 : fromFar ? 1.7 : 1.0, p0, p1: hp, t0, t1: ht, lift: fromFar ? 1.2 : 0.3 };
    KG.controls.enabled = false;
  }
  function stepFly(dt) {
    fly.k = Math.min(1, fly.k + dt / fly.dur);
    const e = U.easeInOut(fly.k);
    KG.camera.position.lerpVectors(fly.p0, fly.p1, e);
    KG.camera.position.y += Math.sin(Math.PI * e) * fly.lift;
    KG.controls.target.lerpVectors(fly.t0, fly.t1, e);
    KG.camera.lookAt(KG.controls.target);
    if (fly.k >= 1) { fly = null; KG.controls.enabled = true; }
  }
  function applyLimits(M) {
    const c = KG.controls, l = M.lim || {};
    c.minDistance = l.min || 2;
    c.maxDistance = l.max || 40;
    c.minPolarAngle = l.minPolar || 0;
    c.maxPolarAngle = l.maxPolar || Math.PI * 0.62;
    c.minAzimuthAngle = l.minAz != null ? l.minAz : -Infinity;
    c.maxAzimuthAngle = l.maxAz != null ? l.maxAz : Infinity;
    c.enablePan = l.pan !== false;
    KG.camera.fov = M.fov || 38;
    KG.camera.near = l.near || 0.05;
    KG.camera.far = l.far || 400;
    KG.camera.updateProjectionMatrix();
  }
  function clampTarget(M) {
    const ht = M._ht || (M._ht = new THREE.Vector3().fromArray(M.home.t));
    const t = KG.controls.target, maxR = (M.lim && M.lim.pan) || 7;
    const d = t.distanceTo(ht);
    if (d > maxR) t.sub(ht).multiplyScalar(maxR / d).add(ht);
  }

  /* ---------- module switching ---------- */
  const sk = U.$('sk'), stt = U.$('stt');
  KG.refreshNote = function () {
    const M = KG.mods[KG.active];
    if (!M) return;
    snote.textContent = M.note ? M.note() : '';
  };

  function ensureBuilt(M) {
    if (M.built || !KG.has3D) return;
    M.build();
    M.built = true;
    if (M.onResize) M.onResize(stage.clientWidth, stage.clientHeight);
  }

  KG.applyView = function () {
    const M = KG.mods[KG.active];
    if (!M) return;
    const is2D = !!(M.is2D && M.is2D());
    stage.classList.toggle('two-d', is2D);
    KG.refreshNote();
    if (is2D) {
      btnReset.hidden = true; shint.hidden = true; failEl.hidden = true;
      KG.setLabels([]);
      return;
    }
    btnReset.hidden = false;
    shint.hidden = !!M.custom;
    if (!KG.has3D) { failEl.hidden = false; KG.setLabels([]); return; }
    failEl.hidden = true;
    ensureBuilt(M);
    KG.setLabels(M.labels || []);
    if (M.custom) {
      KG.controls.enabled = false;
      fly = null;
    } else {
      applyLimits(M);
      flyTo(M, true);
    }
  };

  KG.activate = function (i, opts) {
    opts = opts || {};
    if (!KG.mods[i]) return;
    if (i === KG.active && !opts.force) return;
    const prev = KG.mods[KG.active];
    if (prev && prev.exit) prev.exit();
    KG.active = i;
    tabs.forEach((t, k) => { t.setAttribute('aria-selected', String(k === i)); t.tabIndex = k === i ? 0 : -1; });
    panels.forEach((p, k) => { p.hidden = k !== i; });
    if (opts.focusTab) tabs[i].focus();
    U.$('panel').scrollTop = 0;
    const M = KG.mods[i];
    sk.textContent = M.kicker;
    stt.textContent = M.title;
    U.$('eqn').hidden = !M.showEqn;
    waveCv.style.display = M.showWave ? 'block' : 'none';
    U.$('jov').hidden = !M.custom;
    U.$('jbar').hidden = !M.custom;
    snote.hidden = !!M.custom;
    if (history.replaceState) history.replaceState(null, '', '#m' + i);
    if (M.enter) M.enter();
    KG.applyView();
  };

  /* ---------- resize ---------- */
  function resize() {
    const w = stage.clientWidth, h = stage.clientHeight;
    if (!w || !h) return;
    if (KG.has3D) {
      KG.renderer.setSize(w, h, false);
      KG.camera.aspect = w / h;
      KG.camera.updateProjectionMatrix();
      KG.mods.forEach(M => { if (M && M.built && M.onResize) M.onResize(w, h); });
    }
    c2d.width = Math.round(w * KG.DPR);
    c2d.height = Math.round(h * KG.DPR);
    const r = waveCv.getBoundingClientRect();
    waveCv.width = Math.round((r.width || 300) * KG.DPR);
    waveCv.height = Math.round((r.height || 132) * KG.DPR);
  }
  KG.resize = resize;

  /* ---------- loop ---------- */
  let last = 0, T = 0;
  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
    last = now;
    if (document.hidden || KG.active < 0) return;
    T += dt;
    const M = KG.mods[KG.active];
    if (M.tick) M.tick(dt, T);
    if (M.is2D && M.is2D()) { M.draw2D(dt, T); return; }
    if (!KG.has3D || !M.built) return;
    if (M.custom) {
      M.update(dt, T);
      M.render();
      updateLabels();
      return;
    }
    if (fly) stepFly(dt);
    else { KG.controls.update(); clampTarget(M); }
    M.update(dt, T);
    KG.renderer.render(M.scene, KG.camera);
    updateLabels();
  }

  /* ---------- start ---------- */
  KG.start = function () {
    const status = init3D();
    if (status !== 'ok') {
      U.$('failmsg').textContent = status === 'lib'
        ? 'Üç boyutlu görünüm için gereken “lib” klasörü bulunamadı. Bu HTML dosyasını yanındaki lib klasörüyle birlikte açın.'
        : 'Bu bilgisayarda üç boyutlu grafik (WebGL) başlatılamadı. Tarayıcının donanım hızlandırma ayarını açıp sayfayı yenileyin. Osiloskop görünümü yine de çalışır.';
    }
    KG.factories.forEach((f, i) => { if (f) KG.mods[i] = f(KG); });
    KG.mods.forEach(M => { if (M && M.panelInit) M.panelInit(); });

    tabs.forEach((t, i) => {
      t.addEventListener('click', () => KG.activate(i));
      t.addEventListener('keydown', e => {
        if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
          e.preventDefault();
          const n = (i + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length;
          KG.activate(n, { focusTab: true });
        }
      });
    });
    window.addEventListener('keydown', e => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const tag = (e.target && e.target.tagName) || '';
      if (tag === 'TEXTAREA' || (tag === 'INPUT' && e.target.type !== 'range')) return;
      if (/^[0-6]$/.test(e.key) && KG.mods[+e.key]) KG.activate(+e.key);
    });
    window.addEventListener('hashchange', () => {
      const m = /^#m([0-6])$/.exec(location.hash);
      if (m) KG.activate(+m[1]);
    });

    btnReset.addEventListener('click', () => {
      const M = KG.mods[KG.active];
      if (!M || !KG.has3D) return;
      if (M.custom) { if (M.reset) M.reset(); }
      else flyTo(M, false);
    });
    const fsText = () => { btnFs.textContent = document.fullscreenElement ? 'Tam ekrandan çık' : 'Tam ekran'; };
    btnFs.addEventListener('click', () => {
      if (document.fullscreenElement) document.exitFullscreen();
      else if (document.documentElement.requestFullscreen) document.documentElement.requestFullscreen();
    });
    document.addEventListener('fullscreenchange', fsText);

    if (window.ResizeObserver) new ResizeObserver(resize).observe(stage);
    else window.addEventListener('resize', resize);
    resize();

    const m = /^#m([0-6])$/.exec(location.hash);
    KG.activate(m ? +m[1] : 0, { force: true });

    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(() => KG.mods.forEach(M => { if (M && M.built && M.redrawText) M.redrawText(); }));
    }
    requestAnimationFrame(t => { last = t; frame(t); });
  };
})();
