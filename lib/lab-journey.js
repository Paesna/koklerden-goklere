/* Köklerden Göklere · Modül 00: Ölçek Yolculuğu
   A continuous powers-of-ten camera journey from orbit to a copper nucleus.
   Each scale layer is its own scene in convenient units; layers cross-fade by scale. */
(function () {
  'use strict';
  const KG = window.KG;
  if (!KG) return;
  const U = KG.util;

  KG.register(0, function () {
    const FOV = 40;
    const TAN2 = 2 * Math.tan((FOV * Math.PI) / 360);
    const D2R = Math.PI / 180;
    const LAT = 37.7648, LON = 30.5566;

    const STOPS = [
      { id: 'earth', s: 7.35, scale: '10⁷ m', name: 'Dünya', dwell: 6.5,
        short: 'Dünya’nın çapı yaklaşık 12.700 km. Karanlık taraftaki ışıklar şehirlerdir; hepsi elektrikle yanar.',
        long: ['Uzaydan baktığımızda Dünya’nın yarısı güneş ışığı alıyor, yarısı gecede. Gece tarafında görünen ışıklar şehirlerin aydınlatmasıdır: milyarlarca lambanın hepsi elektrik enerjisiyle çalışır.',
          'Güneş’ten gelen ışık da elektrik ve manyetik alanların oluşturduğu bir dalgadır. Yolculuğun sonunda elektriğin en küçük taşıyıcısına, elektrona varacağız.'] },
      { id: 'tr', s: 6.2, scale: '10⁶ m', name: 'Türkiye', dwell: 5.5,
        short: 'Türkiye doğudan batıya yaklaşık 1.600 km. İşaretli nokta Isparta, Göller Bölgesi’nde.',
        long: ['Bulutların altına indik. Ekranın yüksekliği şu an yaklaşık 1.600 km. Kuzeyde Karadeniz, güneyde Akdeniz, batıda Ege Denizi görünüyor.',
          'Bu ölçekte koca bir şehir yalnızca birkaç nokta kadar yer kaplar.'] },
      { id: 'isp', s: 4.05, scale: '10⁴ m', name: 'Isparta', dwell: 6,
        short: 'Isparta şehir merkezi. Görüntü, Sentinel-2 uydusunun 10 metre çözünürlüklü verisinden.',
        long: ['Ekranın yüksekliği yaklaşık 11 km. Kırmızımsı alan yoğun yapılaşmış şehir merkezi; çevresindeki desenler tarlalar ve bahçeler.',
          'Uydu fotoğrafı da bir elektronik ürünüdür: uydunun algılayıcısı ışığı elektrik sinyaline çevirir, sinyal dijital veri olarak Dünya’ya gönderilir.'] },
      { id: 'school', s: 1.45, scale: '10¹ m', name: 'Okul', dwell: 5.5,
        short: 'Çatıyı kaldırıp bir okul binasına yukarıdan bakıyoruz. Ekranın yüksekliği yaklaşık 28 metre.',
        long: ['Uydu görüntüsünden bir binanın ölçeğine indik. Bu bina temsilidir; sınıflar, koridor ve sıralar gerçek boyutlarıyla çizildi.',
          'Bu ölçek gözümüzün doğrudan gördüğü dünyadır. Buradan sonraki duraklar gözle görülemeyecek kadar küçük olacak.'] },
      { id: 'desk', s: 0.0, scale: '10⁰ m', name: 'Sıra', dwell: 6, act: ['nail'],
        short: 'Bir öğrenci sırası ve telefona bağlı bir şarj kablosu. Telefon şarj olurken kablonun içinde ne oluyor?',
        long: ['Ekranın yüksekliği yaklaşık 1 metre. Telefon şarj olurken prizden gelen enerji, kablodaki bakır teller üzerinden bataryaya taşınır.',
          'Kabloyu tutan parmaklarımızın ucundaki tırnak ise elektriği iletmez. Nedenini merak ediyorsanız yan yola sapabilirsiniz.'] },
      { id: 'cable', s: -1.75, scale: '10⁻² m', name: 'Şarj kablosu', dwell: 6.5, act: ['m2'],
        short: 'Kılıfı açtık. İçeride dört ince tel var: kırmızı ve siyah enerjiyi, beyaz ve yeşil veriyi taşır.',
        long: ['Ekranın yüksekliği yaklaşık 18 mm. Beyaz dış kılıf ve renkli yalıtkanlar plastiktir: elektriği iletmez, bizi korur.',
          'Örgü ve folyo, dışarıdaki elektriksel gürültünün veriyi bozmasını önleyen bir kalkandır. Asıl iletken, yalıtkanların içindeki ince bakır liflerdir.'] },
      { id: 'strand', s: -3.6, scale: '10⁻⁴ m', name: 'Bakır lif', dwell: 6,
        short: 'Tek bir bakır lifin kesiti, saç telinin yaklaşık üç katı kalınlığında. Bakır, “tane” denen küçük kristallerden oluşur.',
        long: ['Ekranın yüksekliği yaklaşık 0,25 mm. Parlatılmış bir metal yüzey mikroskopla incelendiğinde farklı tonlarda bölgeler görülür: her biri ayrı bir kristal tanesidir.',
          'Tanelerin içinde atomlar aynı düzende dizilir; komşu tanelerde bu düzenin yönü farklıdır. Işığı farklı yansıtmalarının nedeni budur.'] },
      { id: 'crystal', s: -8.55, scale: '10⁻⁹ m', name: 'Bakır kristali', dwell: 6.5, act: ['m1'],
        short: 'Bir tanenin içinde bakır atomları kusursuz bir düzenle dizilir. Mavi noktalar atomlardan ayrılıp serbestçe dolaşan elektronlardır.',
        long: ['Ekranın yüksekliği yaklaşık 3 nanometre, yani metrenin milyarda üçü. Bakır atomları küp biçiminde tekrar eden bir kafes oluşturur; iki komşu atom arası yaklaşık 0,26 nm.',
          'Her bakır atomu en dıştaki elektronunu ortak bir “elektron denizine” bırakır. Kablo bir prize ya da pile bağlandığında elektrik akımı, bu denizin yavaş ve ortak hareketidir.'] },
      { id: 'atom', s: -9.55, scale: '10⁻¹⁰ m', name: 'Bakır atomu', dwell: 11, act: ['model'],
        short: '', shortBohr: 'Okul kitaplarındaki bu resim basitleştirilmiş bir modeldir: elektronlar gezegenler gibi yörüngede dönmez.',
        shortCloud: 'Gerçekte elektron küçük bir top değildir. Bulut, elektronun bulunma olasılığının yüksek olduğu yerleri gösterir.',
        long: ['Bakırın 29 elektronu vardır. Sık çizilen halkalı resim (Bohr modeli, 1913) elektronları gezegen gibi gösterir; kolay anlaşılır ama gerçeği yansıtmaz.',
          'Elektronun ölçülmüş bir büyüklüğü yoktur: ölçümler onu 10⁻¹⁸ metreden küçük, nokta gibi bir parçacık olarak bulur. Yükü −1,602 × 10⁻¹⁹ coulomb, kütlesi 9,109 × 10⁻³¹ kilogramdır; protonun yaklaşık 1836’da biri.',
          'Elektronu göremeyiz; ancak nerede bulunma olasılığının yüksek olduğunu hesaplayabiliriz. Bulutlar bunu gösterir. Turuncu bulut bakırın en dıştaki 4s elektronudur: metalde atomdan ayrılıp elektron denizine katılan elektron budur.'] },
      { id: 'nucleus', s: -13.55, scale: '10⁻¹⁴ m', name: 'Çekirdek', dwell: 7,
        short: '29 proton ve 34 nötron. Atom bir futbol stadyumu kadar olsaydı çekirdek, ortadaki bir bezelye tanesi kadar olurdu.',
        long: ['Ekranın yüksekliği yaklaşık 28 femtometre, yani 2,8 × 10⁻¹⁴ m. Bakırın en yaygın türü olan bakır-63’ün çekirdeğinde 29 proton ve 34 nötron bulunur.',
          'Atomun çapı, çekirdeğinkinin yaklaşık 25.000 katıdır. Yani atomun neredeyse tamamı boşluktur; buna rağmen kütlesinin %99,9’undan fazlası bu küçük çekirdektedir.',
          'Protonların artı yükü ile elektronların eksi yükü birbirini çeker. Elektrik dediğimiz her şeyin kökü, yükler arasındaki bu etkileşimdir.'] }
    ];
    const GAPS = [
      'Dünya’ya yaklaşıyoruz. Görüş alanımız her saniye birkaç kat küçülüyor.',
      'Bulutların altından Göller Bölgesi’ne iniyoruz.',
      'Uydu görüntüsü yerini okul binasının modeline bırakıyor.',
      'Bir sınıfa, sonra bir sıraya iniyoruz.',
      'Kablonun yüzeyine yaklaşıyoruz. Buradan sonrası mikroskop dünyası.',
      'Kırmızı telin içindeki bakır liflerden birinin kesitine yaklaşıyoruz.',
      '10⁻⁵ m ile 10⁻⁸ m arasında görüntü değişmez: bir tanenin içi, aynı atom düzeninin milyarlarca kez tekrarıdır.',
      'Kafesteki atomlardan birine yaklaşıyoruz.',
      'Atomun içi neredeyse tamamen boşluk. Çekirdeğe ulaşmak için ölçeği on bin kat daha küçültmemiz gerekiyor.'
    ];
    const S_TOP = 7.45, S_BOT = -13.7;

    const st = { s: STOPS[0].s, playing: false, dir: 'down', mode: 'tour', seg: null, dwell: 0, model: 'bohr', morph: 0, modelTimer: 0, at: -2, gap: -2 };
    const M = { kicker: 'Modül 00', title: 'Ölçek Yolculuğu', custom: true, st };
    M.note = () => '';

    /* ---------- journey logic (DOM only, works without WebGL) ---------- */
    const el = {};
    const sToV = s => Math.round(((S_TOP - s) / (S_TOP - S_BOT)) * 1000);
    const vToS = v => S_TOP - (v / 1000) * (S_TOP - S_BOT);

    function nearest(s) {
      let bi = 0, bd = 1e9;
      STOPS.forEach((p, i) => { const d = Math.abs(p.s - s); if (d < bd) { bd = d; bi = i; } });
      return { i: bi, d: bd };
    }
    function nextStop(s, dir) {
      if (dir === 'down') { for (let i = 0; i < STOPS.length; i++) if (STOPS[i].s < s - 0.01) return i; }
      else { for (let i = STOPS.length - 1; i >= 0; i--) if (STOPS[i].s > s + 0.01) return i; }
      return -1;
    }
    function startSeg(goal) {
      const s0 = st.s, s1 = STOPS[goal].s, dist = Math.abs(s1 - s0);
      st.seg = { s0, s1, goal, t: 0, T: KG.reduceMotion ? 0.8 : Math.min(11, 3.2 + 1.1 * dist) };
      st.dwell = 0;
    }
    function arrive(i) {
      if (STOPS[i].id === 'atom' && st.model === 'bohr') st.modelTimer = 3.4;
      if (st.mode === 'goto') { st.playing = false; syncPlay(); return; }
      st.dwell = STOPS[i].dwell || 6;
    }
    function setModel(m, instant) {
      st.model = m;
      if (instant) st.morph = m === 'cloud' ? 1 : 0;
      st.at = -2;
      if (el.modelSet) el.modelSet(m);
    }
    function syncPlay() {
      if (!el.play) return;
      const n = nextStop(st.s, st.dir);
      el.play.textContent = st.playing ? 'Duraklat' : n < 0 || (st.dir === 'down' ? st.s >= STOPS[0].s - 0.01 : st.s <= STOPS[STOPS.length - 1].s + 0.01) ? 'Yolculuğu başlat' : 'Devam et';
    }
    function human(m) {
      const units = [[1e3, 'km'], [1, 'm'], [1e-2, 'cm'], [1e-3, 'mm'], [1e-6, 'µm'], [1e-9, 'nm'], [1e-12, 'pm'], [1e-15, 'fm']];
      for (const [u, n] of units) {
        if (m >= u * 0.9995) {
          const v = m / u;
          const t = v >= 1000 ? U.nf(Math.round(v / 100) * 100) : v >= 100 ? U.nf(Math.round(v / 10) * 10) : v >= 10 ? U.nf(v, 0) : U.nf(v, 1);
          return t + ' ' + n;
        }
      }
      return U.nf(m / 1e-15, 1) + ' fm';
    }

    function renderInfo() {
      const nr = nearest(st.s);
      const at = nr.d < 0.22 ? nr.i : -1;
      let gap = -1;
      if (at < 0) for (let i = 0; i < STOPS.length - 1; i++) if (st.s < STOPS[i].s && st.s > STOPS[i + 1].s) gap = i;
      const key = at + ':' + gap + ':' + st.model;
      if (key === st._infoKey) return;
      st._infoKey = key;
      const stp = at >= 0 ? STOPS[at] : null;
      const shortText = stp ? (stp.id === 'atom' ? (st.model === 'cloud' ? stp.shortCloud : stp.shortBohr) : stp.short) : (gap >= 0 ? GAPS[gap] : '');
      el.jname.textContent = stp ? stp.name : 'Yolda';
      el.jtext.textContent = shortText;
      el.jtag.hidden = !(stp && stp.id === 'atom');
      el.jtag.textContent = st.model === 'cloud' ? 'Olasılık bulutu' : 'Basitleştirilmiş model · Bohr, 1913';
      el.stopBtns.forEach((b, i) => b.setAttribute('aria-current', String(i === at)));
      el.iscale.textContent = stp ? stp.scale : 'Duraklar arası';
      el.ititle.textContent = stp ? stp.name : 'Yolda';
      el.itext.textContent = '';
      const paras = stp ? stp.long : [gap >= 0 ? GAPS[gap] : ''];
      paras.forEach(t => { const p = document.createElement('p'); p.textContent = t; el.itext.appendChild(p); });
      el.iact.textContent = '';
      el.modelSet = null;
      (stp && stp.act ? stp.act : []).forEach(a => {
        if (a === 'model') {
          const seg = document.createElement('div');
          seg.className = 'seg';
          seg.setAttribute('role', 'group');
          seg.setAttribute('aria-label', 'Atom modeli');
          seg.style.flex = '1';
          seg.innerHTML = '<button data-v="bohr">Basit model</button><button data-v="cloud">Olasılık bulutu</button>';
          el.iact.appendChild(seg);
          el.modelSet = U.segGroup(seg, v => setModel(v));
          el.modelSet(st.model);
          return;
        }
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'btn';
        if (a === 'nail') { b.textContent = 'Yan yol: Tırnak neden iletmez?'; b.onclick = () => { KG.activate(1); if (KG.mods[1].select) KG.mods[1].select('ker'); }; }
        if (a === 'm2') { b.textContent = 'Kablodaki akımı izle: Modül 02'; b.onclick = () => KG.activate(2); }
        if (a === 'm1') { b.textContent = 'Elektron denizini incele: Modül 01'; b.onclick = () => { KG.activate(1); if (KG.mods[1].select) KG.mods[1].select('cu'); }; }
        el.iact.appendChild(b);
      });
    }

    function updateOverlay() {
      const s = st.s;
      const big = '10' + U.sup(Math.round(s)) + ' m';
      const small = 'görüş alanı ≈ ' + human(Math.pow(10, s));
      const k = big + '|' + small;
      if (k !== st._scaleKey) {
        st._scaleKey = k;
        el.jscale.textContent = big;
        const sm = document.createElement('small');
        sm.textContent = small;
        el.jscale.appendChild(sm);
        el.so.textContent = big;
      }
      el.bar.style.width = (((S_TOP - s) / (S_TOP - S_BOT)) * 100).toFixed(2) + '%';
      if (document.activeElement !== el.scrub) el.scrub.value = String(sToV(s));
      const px = 120, hpx = KG.dom.stage.clientHeight || 600;
      const sk = human((px / hpx) * Math.pow(10, s));
      if (sk !== st._sbKey) { st._sbKey = sk; el.sbarT.textContent = sk; }
      renderInfo();
    }

    M.panelInit = function () {
      el.play = U.$('m0-play');
      el.scrub = U.$('m0-scrub');
      el.so = U.$('m0-so');
      el.jscale = U.$('jscale'); el.jname = U.$('jname'); el.jtext = U.$('jtext'); el.jtag = U.$('jtag');
      el.bar = U.$('jbari');
      el.iscale = U.$('m0-iscale'); el.ititle = U.$('m0-ititle'); el.itext = U.$('m0-itext'); el.iact = U.$('m0-iact');

      const sbar = document.createElement('div');
      sbar.style.cssText = 'position:absolute;right:28px;bottom:26px;width:120px;pointer-events:none;text-align:right';
      sbar.innerHTML = '<div style="height:6px;border:1px solid rgba(238,240,243,.7);border-top:0"></div><div style="font:500 12px ' + U.MONO.replace(/"/g, '&quot;') + ';color:#C9CED8;margin-top:6px"></div>';
      U.$('jov').parentNode.appendChild(sbar);
      el.sbar = sbar;
      el.sbarT = sbar.lastChild;
      sbar.hidden = true;

      const ticks = U.$('m0-ticks');
      STOPS.forEach(p => { const i = document.createElement('i'); i.style.left = (sToV(p.s) / 10) + '%'; ticks.appendChild(i); });

      const list = U.$('m0-stops');
      el.stopBtns = STOPS.map((p, i) => {
        const li = document.createElement('li');
        const b = document.createElement('button');
        b.type = 'button';
        b.innerHTML = '<span class="sc"></span><span></span>';
        b.firstChild.textContent = p.scale;
        b.lastChild.textContent = p.name;
        b.addEventListener('click', () => {
          st.mode = 'goto';
          st.playing = true;
          if (Math.abs(st.s - p.s) < 0.002) { st.playing = false; syncPlay(); return; }
          if (p.id === 'atom' && st.s > p.s) setModel('bohr');
          startSeg(i);
          syncPlay();
        });
        li.appendChild(b);
        list.appendChild(li);
        return b;
      });

      U.segGroup(U.$('m0-dir'), v => { st.dir = v; syncPlay(); });
      el.play.addEventListener('click', () => {
        if (st.playing) { st.playing = false; syncPlay(); return; }
        st.mode = 'tour';
        let n = nextStop(st.s, st.dir);
        if (n < 0) {
          st.s = st.dir === 'down' ? STOPS[0].s : STOPS[STOPS.length - 1].s;
          setModel(st.dir === 'down' ? 'bohr' : 'cloud', true);
          n = nextStop(st.s, st.dir);
        }
        st.playing = true;
        const nr = nearest(st.s);
        if (nr.d < 0.01 && !st.seg) st.dwell = 1.4;
        else if (!st.seg) startSeg(n);
        syncPlay();
      });
      el.scrub.addEventListener('input', () => {
        st.playing = false;
        st.seg = null;
        st.s = vToS(+el.scrub.value);
        syncPlay();
      });
      syncPlay();
      updateOverlay();
    };

    M.tick = function (dt) {
      if (st.playing) {
        if (st.seg) {
          const g = st.seg;
          g.t += dt;
          st.s = U.lerp(g.s0, g.s1, U.easeInOut(Math.min(1, g.t / g.T)));
          if (g.t >= g.T) { st.s = g.s1; st.seg = null; arrive(g.goal); syncPlay(); }
        } else if (st.dwell > 0) {
          st.dwell -= dt;
          if (st.dwell <= 0) {
            const n = nextStop(st.s, st.dir);
            if (n < 0) { st.playing = false; syncPlay(); } else startSeg(n);
          }
        }
      }
      if (st.modelTimer > 0) { st.modelTimer -= dt; if (st.modelTimer <= 0 && st.model === 'bohr') setModel('cloud'); }
      if (st.s < -9.95 && st.model !== 'cloud') setModel('cloud');
      if (st.s > -9.0 && st.model !== 'bohr' && st.dir === 'down') setModel('bohr', true);
      st.morph = U.approach(st.morph, st.model === 'cloud' ? 1 : 0, dt * 0.6);
      updateOverlay();
    };

    M.enter = function () {
      U.$('btn-reset').textContent = 'Başa dön';
      if (el.sbar) el.sbar.hidden = false;
    };
    M.exit = function () {
      U.$('btn-reset').textContent = 'Kamerayı sıfırla';
      KG.dom.stage.style.background = '';
      if (el.sbar) el.sbar.hidden = true;
      st.playing = false;
      syncPlay();
    };
    M.reset = function () {
      st.playing = false; st.seg = null; st.s = STOPS[0].s; st.dir = 'down';
      setModel('bohr', true);
      U.$('m0-dir').querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.v === 'down')));
      syncPlay();
    };

    /* ---------- 3D layers ---------- */
    let layers = [];
    let rtA, rtB, comp, compScene, compCam;
    const labels = [];
    M.labels = labels;

    function makeCam() { return new THREE.PerspectiveCamera(FOV, 1, 0.01, 1000); }
    function setCam(cam, target, dir, up, H, farMul) {
      const D = H / TAN2;
      cam.position.copy(target).addScaledVector(dir, D);
      cam.up.copy(up);
      cam.lookAt(target);
      cam.near = Math.max(D * 0.02, 1e-7);
      cam.far = D * (farMul || 80);
      cam.updateProjectionMatrix();
      return D;
    }
    function addLabel(L, text, pos, s0, s1, extra) {
      labels.push(Object.assign({ text, pos, cam: () => L.cam, vis: () => L.a > 0.55 && st.s >= s0 && st.s <= s1 }, extra || {}));
    }
    function texFromKey(key, repeat) {
      const t = new THREE.Texture();
      t.anisotropy = Math.min(8, KG.maxAniso || 1);
      if (repeat) t.wrapS = THREE.RepeatWrapping;
      const src = window.KG_TEX && window.KG_TEX[key];
      if (src) {
        const img = new Image();
        img.onload = () => { t.image = img; t.needsUpdate = true; };
        img.src = src;
      }
      return t;
    }
    const VS = 'varying vec2 vUv; varying vec3 vN; varying vec3 vW;\nvoid main(){ vUv = uv; vN = normalize(mat3(modelMatrix) * normal); vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }';
    const OUT = '\n#include <tonemapping_fragment>\n#include <encodings_fragment>\n}';

    /* ===== Layer: Earth (1 unit = 1000 km) ===== */
    function buildEarth() {
      const L = { key: 'earth', bgCss: '#020306', bg: new THREE.Color(0x020306) };
      const scene = (L.scene = new THREE.Scene());
      const cam = (L.cam = makeCam());
      const R = 6.371;
      const has = !!window.KG_TEX;
      const ll = (lat, lon, r) => { const ph = (lon + 180) * D2R, th = (90 - lat) * D2R; return U.V3(-Math.cos(ph) * Math.sin(th) * r, Math.cos(th) * r, Math.sin(ph) * Math.sin(th) * r); };
      const n = ll(LAT, LON, 1).normalize();
      const P = n.clone().multiplyScalar(R);
      const east = U.V3(0, 1, 0).cross(n).normalize();
      const north = n.clone().cross(east).normalize();
      const sun = n.clone().multiplyScalar(0.42).addScaledVector(east, -0.8).addScaledVector(north, 0.42).normalize();

      const earthMat = new THREE.ShaderMaterial({
        uniforms: { dayMap: { value: texFromKey('day') }, nightMap: { value: texFromKey('lights') }, specMap: { value: texFromKey('spec') }, sunDir: { value: sun }, hasTex: { value: has ? 1 : 0 } },
        vertexShader: VS,
        fragmentShader: 'uniform sampler2D dayMap; uniform sampler2D nightMap; uniform sampler2D specMap; uniform vec3 sunDir; uniform float hasTex;\nvarying vec2 vUv; varying vec3 vN; varying vec3 vW;\nvoid main(){\n vec3 n = normalize(vN); vec3 v = normalize(cameraPosition - vW);\n float nd = dot(n, sunDir);\n vec3 day = mix(vec3(0.015, 0.04, 0.10), pow(texture2D(dayMap, vUv).rgb, vec3(2.2)), hasTex);\n float lights = texture2D(nightMap, vUv).r * hasTex;\n float spec = texture2D(specMap, vUv).r * hasTex;\n float lit = smoothstep(-0.08, 0.45, nd);\n vec3 col = day * (0.012 + 1.35 * lit);\n vec3 h = normalize(sunDir + v);\n col += vec3(1.0, 0.93, 0.82) * pow(max(dot(n, h), 0.0), 70.0) * spec * 0.5 * smoothstep(0.0, 0.2, nd);\n float night = 1.0 - smoothstep(-0.18, 0.05, nd);\n col += vec3(1.0, 0.72, 0.42) * pow(lights, 1.6) * 0.85 * night;\n float fres = pow(1.0 - max(dot(n, v), 0.0), 3.0);\n col = mix(col, vec3(0.32, 0.55, 1.0) * (0.2 + 0.9 * lit), fres * 0.5 * smoothstep(-0.25, 0.3, nd));\n gl_FragColor = vec4(col, 1.0);' + OUT
      });
      scene.add(new THREE.Mesh(new THREE.SphereGeometry(R, 160, 80), earthMat));

      const patchFS = 'uniform sampler2D map; uniform vec3 sunDir; uniform float feather; uniform float opacity;\nvarying vec2 vUv; varying vec3 vN; varying vec3 vW;\nvoid main(){\n vec3 n = normalize(vN);\n float lit = smoothstep(-0.08, 0.45, dot(n, sunDir));\n vec3 col = pow(texture2D(map, vUv).rgb, vec3(2.2)) * (0.012 + 1.35 * lit);\n float e = min(min(vUv.x, 1.0 - vUv.x), min(vUv.y, 1.0 - vUv.y));\n gl_FragColor = vec4(col, smoothstep(0.0, feather, e) * opacity);' + OUT;
      const box = window.KG_TEX_BOX || {};
      const patches = [];
      [['turkey', 0.035, 96], ['region', 0.08, 64], ['city', 0.12, 48]].forEach(([key, feather, segs], i) => {
        const b = box[key];
        if (!b || !has) return;
        const geo = new THREE.SphereGeometry(R, segs, segs, (b[0] + 180) * D2R, (b[1] - b[0]) * D2R, (90 - b[3]) * D2R, (b[3] - b[2]) * D2R);
        const mat = new THREE.ShaderMaterial({ uniforms: { map: { value: texFromKey(key) }, sunDir: { value: sun }, feather: { value: feather }, opacity: { value: 1 } }, vertexShader: VS, fragmentShader: patchFS, transparent: true, depthTest: false, depthWrite: false });
        const m = new THREE.Mesh(geo, mat);
        m.renderOrder = 2 + i;
        scene.add(m);
        patches.push(m);
      });

      const cloudMat = new THREE.ShaderMaterial({
        uniforms: { cloudMap: { value: texFromKey('clouds', true) }, sunDir: { value: sun }, uOp: { value: 1 }, shift: { value: 0 } },
        vertexShader: VS,
        fragmentShader: 'uniform sampler2D cloudMap; uniform vec3 sunDir; uniform float uOp; uniform float shift;\nvarying vec2 vUv; varying vec3 vN; varying vec3 vW;\nvoid main(){\n vec3 n = normalize(vN);\n float a = texture2D(cloudMap, vUv + vec2(shift, 0.0)).r;\n float lit = smoothstep(-0.12, 0.35, dot(n, sunDir));\n gl_FragColor = vec4(vec3(0.02 + 1.1 * lit), a * 0.9 * uOp);' + OUT,
        transparent: true, depthWrite: false
      });
      const clouds = new THREE.Mesh(new THREE.SphereGeometry(R * 1.008, 128, 64), cloudMat);
      clouds.renderOrder = 6;
      if (has) scene.add(clouds);

      const atmoMat = new THREE.ShaderMaterial({
        uniforms: { sunDir: { value: sun }, uOp: { value: 1 } },
        vertexShader: 'varying vec3 vNv; varying vec3 vNw;\nvoid main(){ vNv = normalize(normalMatrix * normal); vNw = normalize(mat3(modelMatrix) * normal); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
        fragmentShader: 'uniform vec3 sunDir; uniform float uOp; varying vec3 vNv; varying vec3 vNw;\nvoid main(){\n float k = pow(clamp(-vNv.z / 0.3, 0.0, 1.0), 1.4);\n float lit = smoothstep(-0.35, 0.35, dot(vNw, sunDir));\n gl_FragColor = vec4(vec3(0.32, 0.56, 1.0) * k * (0.05 + 1.0 * lit) * uOp, 1.0);' + OUT,
        side: THREE.BackSide, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending
      });
      const atmo = new THREE.Mesh(new THREE.SphereGeometry(R * 1.035, 96, 48), atmoMat);
      atmo.renderOrder = 7;
      scene.add(atmo);

      const NS = 2600, sp = new Float32Array(NS * 3), sc = new Float32Array(NS * 3), tmp = U.V3();
      for (let i = 0; i < NS; i++) {
        U.randDir(tmp).multiplyScalar(600);
        sp.set([tmp.x, tmp.y, tmp.z], i * 3);
        const b = Math.pow(Math.random(), 2.2) * 0.85 + 0.15, tint = Math.random();
        sc.set([b * (tint > 0.85 ? 0.85 : 1), b * 0.95, b * (tint < 0.2 ? 0.8 : 1)], i * 3);
      }
      const sg = new THREE.BufferGeometry();
      sg.setAttribute('position', new THREE.BufferAttribute(sp, 3));
      sg.setAttribute('color', new THREE.BufferAttribute(sc, 3));
      const starMat = new THREE.PointsMaterial({ size: 1.7, sizeAttenuation: false, map: KG.dotTex, vertexColors: true, transparent: true, depthWrite: false });
      scene.add(new THREE.Points(sg, starMat));

      const ringMat = new THREE.MeshBasicMaterial({ color: 0xE39A6C, transparent: true, depthTest: false, depthWrite: false, toneMapped: false, side: THREE.DoubleSide });
      const ring = new THREE.Mesh(new THREE.RingGeometry(0.72, 1, 64), ringMat);
      const dot = new THREE.Mesh(new THREE.CircleGeometry(0.22, 32), ringMat);
      const marker = new THREE.Group();
      marker.add(ring, dot);
      marker.position.copy(n).multiplyScalar(R * 1.00002);
      marker.lookAt(n.clone().multiplyScalar(R * 2));
      marker.renderOrder = 9;
      ring.renderOrder = dot.renderOrder = 9;
      scene.add(marker);

      L.update = (s, dt) => {
        const D = setCam(cam, P, n, north, Math.pow(10, s) / 1e6, s > 6.5 ? 90 : 60);
        cloudMat.uniforms.shift.value += dt * 0.0012;
        cloudMat.uniforms.uOp.value = U.smooth(6.25, 6.9, s);
        atmoMat.uniforms.uOp.value = U.smooth(5.0, 6.3, s);
        starMat.opacity = U.smooth(6.3, 6.95, s);
        marker.scale.setScalar(D * 0.022);
        ringMat.opacity = U.smooth(4.35, 4.9, s) * (1 - U.smooth(6.55, 6.95, s));
        marker.visible = ringMat.opacity > 0.01;
      };

      addLabel(L, 'Gece tarafı: şehir ışıkları', ll(28, 78, R), 6.95, 8);
      addLabel(L, 'Türkiye', ll(39.3, 35.2, R), 5.85, 6.75);
      addLabel(L, 'Karadeniz', ll(43.1, 34.6, R), 5.85, 6.75);
      addLabel(L, 'Akdeniz', ll(34.6, 31.5, R), 5.85, 6.75);
      addLabel(L, 'Ege Denizi', ll(38.6, 25.3, R), 5.85, 6.75);
      addLabel(L, 'Isparta', P, 4.45, 6.75);
      addLabel(L, 'Eğirdir Gölü', ll(38.02, 30.86, R), 4.4, 5.35);
      addLabel(L, 'Burdur Gölü', ll(37.73, 30.17, R), 4.4, 5.35);
      addLabel(L, 'Isparta şehir merkezi', P, 3.55, 4.45);
      return L;
    }

    /* ===== Layer: school and desk (1 unit = 1 m) ===== */
    function canvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }

    function woodTexture() {
      const c = canvas(1024, 512), g = c.getContext('2d');
      g.fillStyle = '#c9a476'; g.fillRect(0, 0, 1024, 512);
      for (let i = 0; i < 260; i++) {
        const y = Math.random() * 512, a = 0.04 + Math.random() * 0.08;
        g.strokeStyle = Math.random() < 0.5 ? 'rgba(120,80,40,' + a + ')' : 'rgba(255,240,220,' + a * 0.6 + ')';
        g.lineWidth = 0.6 + Math.random() * 2.2;
        g.beginPath();
        const f = 0.004 + Math.random() * 0.01, amp = 2 + Math.random() * 6, ph = Math.random() * 6;
        for (let x = 0; x <= 1024; x += 16) { const yy = y + Math.sin(x * f + ph) * amp; x ? g.lineTo(x, yy) : g.moveTo(x, yy); }
        g.stroke();
      }
      return U.canvasTex(c);
    }
    function floorTexture(base, line) {
      const c = canvas(256, 256), g = c.getContext('2d');
      g.fillStyle = base; g.fillRect(0, 0, 256, 256);
      for (let i = 0; i < 900; i++) { g.fillStyle = 'rgba(0,0,0,' + Math.random() * 0.035 + ')'; g.fillRect(Math.random() * 256, Math.random() * 256, 2, 2); }
      g.strokeStyle = line; g.lineWidth = 2; g.strokeRect(1, 1, 254, 254);
      const t = U.canvasTex(c);
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
      return t;
    }
    function yardTexture() {
      const c = canvas(1300, 1000), g = c.getContext('2d');
      g.fillStyle = '#b7b1a5'; g.fillRect(0, 0, 1300, 1000);
      g.strokeStyle = 'rgba(80,70,60,.10)'; g.lineWidth = 1;
      for (let x = 0; x < 1300; x += 10) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, 1000); g.stroke(); }
      for (let y = 0; y < 1000; y += 10) { g.beginPath(); g.moveTo(0, y); g.lineTo(1300, y); g.stroke(); }
      g.fillStyle = '#d3cec4'; g.fillRect(650 - 245, 500 - 105, 490, 210);
      g.fillStyle = '#9b5540'; g.fillRect(510, 640, 280, 150);
      g.strokeStyle = 'rgba(245,245,240,.9)'; g.lineWidth = 3;
      g.strokeRect(520, 650, 260, 130);
      g.beginPath(); g.moveTo(650, 650); g.lineTo(650, 780); g.stroke();
      g.beginPath(); g.arc(650, 715, 18, 0, U.TAU); g.stroke();
      g.fillStyle = '#6f7f4c';
      [[150, 150, 260, 220], [900, 120, 280, 230], [120, 700, 300, 220], [930, 700, 260, 230]].forEach(r => g.fillRect(r[0], r[1], r[2], r[3]));
      g.globalCompositeOperation = 'destination-in';
      const gx = g.createLinearGradient(0, 0, 1300, 0);
      gx.addColorStop(0, 'rgba(0,0,0,0)'); gx.addColorStop(0.12, '#000'); gx.addColorStop(0.88, '#000'); gx.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = gx; g.fillRect(0, 0, 1300, 1000);
      const gy = g.createLinearGradient(0, 0, 0, 1000);
      gy.addColorStop(0, 'rgba(0,0,0,0)'); gy.addColorStop(0.14, '#000'); gy.addColorStop(0.86, '#000'); gy.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = gy; g.fillRect(0, 0, 1300, 1000);
      return U.canvasTex(c);
    }

    function buildSchool() {
      const L = { key: 'school', bgCss: '#0E121A', bg: new THREE.Color(0x0E121A) };
      const scene = (L.scene = new THREE.Scene());
      scene.environment = KG.envTex;
      const cam = (L.cam = makeCam());
      const box = (window.KG_TEX_BOX || {}).city;

      if (box && window.KG_TEX) {
        const wM = (box[1] - box[0]) * 111320 * Math.cos(LAT * D2R), hM = (box[3] - box[2]) * 110950;
        const gm = new THREE.MeshBasicMaterial({ map: texFromKey('city') });
        gm.map.encoding = THREE.sRGBEncoding;
        gm.color.setRGB(1.33, 1.33, 1.33);
        const ground = new THREE.Mesh(new THREE.PlaneGeometry(wM, hM), gm);
        ground.rotation.x = -Math.PI / 2;
        ground.position.set(((LON - (box[0] + box[1]) / 2)) * -111320 * Math.cos(LAT * D2R), -0.06, ((LAT - (box[2] + box[3]) / 2)) * 110950);
        scene.add(ground);
      }
      const yard = new THREE.Mesh(new THREE.PlaneGeometry(130, 100), new THREE.MeshStandardMaterial({ map: yardTexture(), transparent: true, roughness: 0.95, depthWrite: false }));
      yard.rotation.x = -Math.PI / 2;
      yard.position.y = -0.02;
      yard.receiveShadow = true;
      scene.add(yard);

      const sun = new THREE.DirectionalLight(0xfff4e6, 1.6);
      sun.castShadow = true;
      sun.shadow.mapSize.set(2048, 2048);
      sun.shadow.bias = -0.0003;
      sun.shadow.normalBias = 0.02;
      scene.add(sun, sun.target);
      scene.add(new THREE.HemisphereLight(0xdfe8ff, 0x6b6151, 0.35));
      const sunDir = U.V3(-0.42, 0.78, 0.46).normalize();

      const slab = new THREE.Mesh(new THREE.BoxGeometry(44.6, 0.25, 16.6), new THREE.MeshStandardMaterial({ color: 0xd6d3cc, roughness: 0.9 }));
      slab.position.y = -0.125;
      slab.receiveShadow = true;
      scene.add(slab);
      const roomFloor = new THREE.MeshStandardMaterial({ map: floorTexture('#c4bcae', 'rgba(90,80,70,.18)'), roughness: 0.75 });
      roomFloor.map.repeat.set(14, 21);
      const corrFloor = new THREE.MeshStandardMaterial({ map: floorTexture('#d6d1c6', 'rgba(90,80,70,.14)'), roughness: 0.8 });
      corrFloor.map.repeat.set(73, 5);
      const rf = new THREE.Mesh(new THREE.PlaneGeometry(43.4, 12.6), roomFloor);
      rf.rotation.x = -Math.PI / 2; rf.position.set(0, 0.002, 1.4); rf.receiveShadow = true;
      const cf = new THREE.Mesh(new THREE.PlaneGeometry(43.4, 2.7), corrFloor);
      cf.rotation.x = -Math.PI / 2; cf.position.set(0, 0.002, -6.35); cf.receiveShadow = true;
      scene.add(rf, cf);

      const wallMat = new THREE.MeshStandardMaterial({ color: 0xece9e2, roughness: 0.92 });
      const WH = 1.1;
      const walls = [];
      const wall = (x0, x1, z0, z1) => walls.push([x0, x1, z0, z1]);
      wall(-22.3, 22.3, -8.3, -7.7); wall(-22.3, 22.3, 7.7, 8.3); wall(-22.3, -21.7, -5.0, 7.7); wall(21.7, 22.3, -7.7, 7.7);
      const roomX = [-22, -13.2, -4.4, 4.4, 13.2, 22];
      for (let r = 0; r < 5; r++) {
        const a = roomX[r], b = roomX[r + 1];
        wall(a + (r ? 0.075 : 0.3), a + 0.8, -5.075, -4.925);
        wall(a + 1.8, b - (r < 4 ? 0.075 : 0.3), -5.075, -4.925);
        if (r) wall(a - 0.075, a + 0.075, -4.925, 7.7);
      }
      const wg = new THREE.BoxGeometry(1, 1, 1);
      const wallMesh = new THREE.InstancedMesh(wg, wallMat, walls.length);
      walls.forEach((w, i) => {
        U.M4.compose(U.V3((w[0] + w[1]) / 2, WH / 2, (w[2] + w[3]) / 2), U.Q0, U.V3(w[1] - w[0], WH, w[3] - w[2]));
        wallMesh.setMatrixAt(i, U.M4);
      });
      wallMesh.castShadow = wallMesh.receiveShadow = true;
      scene.add(wallMesh);

      const wood = woodTexture();
      const deskMat = new THREE.MeshStandardMaterial({ map: wood, roughness: 0.55 });
      const metal = new THREE.MeshStandardMaterial({ color: 0x8b9099, metalness: 0.7, roughness: 0.4 });
      const chairMat = new THREE.MeshStandardMaterial({ color: 0x3b4a63, roughness: 0.6 });
      const desks = [];
      for (let r = 0; r < 5; r++) {
        const cx = (roomX[r] + roomX[r + 1]) / 2;
        [-2.6, 0, 2.6].forEach(dx => [-1.6, 0.2, 2.0, 3.8].forEach(z => desks.push([cx + dx, z])));
      }
      const topG = new THREE.BoxGeometry(1.2, 0.03, 0.55);
      const tops = new THREE.InstancedMesh(topG, deskMat, desks.length);
      const legs = new THREE.InstancedMesh(new THREE.BoxGeometry(0.03, 0.73, 0.03), metal, desks.length * 4);
      const seats = new THREE.InstancedMesh(new THREE.BoxGeometry(0.42, 0.03, 0.4), chairMat, desks.length * 2);
      const backs = new THREE.InstancedMesh(new THREE.BoxGeometry(0.42, 0.34, 0.03), chairMat, desks.length * 2);
      desks.forEach(([x, z], i) => {
        U.M4.compose(U.V3(x, 0.735, z), U.Q0, U.V3(1, 1, 1)); tops.setMatrixAt(i, U.M4);
        [[-0.56, -0.24], [0.56, -0.24], [-0.56, 0.24], [0.56, 0.24]].forEach((o, k) => { U.M4.compose(U.V3(x + o[0], 0.365, z + o[1]), U.Q0, U.V3(1, 1, 1)); legs.setMatrixAt(i * 4 + k, U.M4); });
        [-0.3, 0.3].forEach((o, k) => {
          U.M4.compose(U.V3(x + o, 0.45, z + 0.55), U.Q0, U.V3(1, 1, 1)); seats.setMatrixAt(i * 2 + k, U.M4);
          U.M4.compose(U.V3(x + o, 0.64, z + 0.76), U.Q0, U.V3(1, 1, 1)); backs.setMatrixAt(i * 2 + k, U.M4);
        });
      });
      [tops, legs, seats, backs].forEach(m => { m.castShadow = true; m.receiveShadow = true; scene.add(m); });
      for (let r = 0; r < 5; r++) {
        const cx = (roomX[r] + roomX[r + 1]) / 2;
        const td = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.75, 0.7), new THREE.MeshStandardMaterial({ color: 0x8a6a4a, roughness: 0.6 }));
        td.position.set(cx + 2.6, 0.375, -3.6); td.castShadow = true; scene.add(td);
        const bd = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.25, 0.04), new THREE.MeshStandardMaterial({ color: 0xf6f6f2, roughness: 0.3 }));
        bd.position.set(cx, 0.98, -4.9); scene.add(bd);
      }

      const leafMat = new THREE.MeshStandardMaterial({ color: 0x55703f, roughness: 0.95 });
      const trunkMat = new THREE.MeshStandardMaterial({ color: 0x5a4636, roughness: 0.9 });
      [[-30, -16], [-18, -18], [6, -19], [27, -15], [-34, 14], [33, 16], [-22, 21], [21, 22]].forEach(([x, z], i) => {
        const geo = new THREE.IcosahedronGeometry(1, 3);
        const pa = geo.attributes.position;
        for (let k = 0; k < pa.count; k++) {
          const v = U.V3(pa.getX(k), pa.getY(k), pa.getZ(k));
          const f = 1 + 0.12 * Math.sin(v.x * 5 + i) * Math.cos(v.z * 4 + i * 2) + 0.06 * Math.sin(v.y * 9);
          pa.setXYZ(k, v.x * f, v.y * f * 0.85, v.z * f);
        }
        geo.computeVertexNormals();
        const rad = 2.4 + (i % 3) * 0.6;
        const can = new THREE.Mesh(geo, leafMat);
        can.scale.setScalar(rad);
        can.position.set(x, 3.2 + rad * 0.6, z);
        can.castShadow = true;
        const tr = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.25, 3.4, 10), trunkMat);
        tr.position.set(x, 1.7, z);
        tr.castShadow = true;
        scene.add(can, tr);
      });

      /* the focus desk */
      const F = U.V3(0, 0.75, 0.2);
      const phoneShape = U.roundRectShape(0.155, 0.075, 0.011);
      const phoneGeo = new THREE.ExtrudeGeometry(phoneShape, { depth: 0.0066, bevelEnabled: true, bevelThickness: 0.0007, bevelSize: 0.0007, bevelSegments: 3, curveSegments: 10 });
      phoneGeo.rotateX(-Math.PI / 2);
      const phone = new THREE.Mesh(phoneGeo, new THREE.MeshStandardMaterial({ color: 0x2b2e34, metalness: 0.75, roughness: 0.32 }));
      const PX = F.x - 0.3, PZ = F.z - 0.05;
      phone.position.set(PX, 0.7507, PZ);
      phone.castShadow = phone.receiveShadow = true;
      const sc = canvas(600, 290), sg = sc.getContext('2d');
      sg.fillStyle = '#07090d'; sg.fillRect(0, 0, 600, 290);
      sg.strokeStyle = 'rgba(238,240,243,.75)'; sg.lineWidth = 4;
      U.rr(sg, 230, 95, 120, 56, 9); sg.stroke();
      sg.fillStyle = 'rgba(238,240,243,.75)'; sg.fillRect(352, 112, 8, 22);
      sg.fillStyle = '#8EA6F2'; sg.fillRect(238, 103, 64, 40);
      sg.fillStyle = 'rgba(238,240,243,.8)'; sg.font = '500 26px ' + U.SANS; sg.textAlign = 'center';
      sg.fillText('Şarj oluyor · %62', 300, 200);
      const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.147, 0.068), new THREE.MeshPhysicalMaterial({ map: U.canvasTex(sc), color: 0xffffff, roughness: 0.06, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.02, emissive: 0xffffff, emissiveMap: U.canvasTex(sc), emissiveIntensity: 0.35 }));
      screen.rotation.x = -Math.PI / 2;
      screen.position.set(PX, 0.7507 + 0.0081, PZ);
      scene.add(phone, screen);

      const cY = 0.75 + 0.00175;
      const portX = PX + 0.0775;
      const plug = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.0062, 0.0085), new THREE.MeshPhysicalMaterial({ color: 0xf1f1ed, roughness: 0.4, clearcoat: 0.3 }));
      plug.position.set(portX + 0.009, 0.75 + 0.0042, PZ);
      plug.castShadow = true;
      scene.add(plug);
      const C = U.V3(F.x - 0.06, cY, PZ);
      const cablePts = [U.V3(portX + 0.018, cY + 0.001, PZ), U.V3(portX + 0.05, cY, PZ), C.clone(), U.V3(F.x + 0.1, cY, PZ + 0.005), U.V3(F.x + 0.24, cY, PZ + 0.09), U.V3(F.x + 0.31, cY, F.z + 0.27), U.V3(F.x + 0.33, 0.745, F.z + 0.3), U.V3(F.x + 0.36, 0.45, F.z + 0.36), U.V3(F.x + 0.42, 0.003, F.z + 0.55), U.V3(F.x + 0.5, 0.003, F.z + 1.4)];
      const cable = new THREE.Mesh(new THREE.TubeGeometry(U.curveFrom(cablePts, 0.05), 600, 0.00175, 14), new THREE.MeshPhysicalMaterial({ color: 0xf0f0ec, roughness: 0.42, clearcoat: 0.25 }));
      cable.castShadow = true;
      scene.add(cable);

      const nc = canvas(420, 594), ng = nc.getContext('2d');
      ng.fillStyle = '#f5f3ec'; ng.fillRect(0, 0, 420, 594);
      ng.strokeStyle = 'rgba(70,110,190,.35)'; ng.lineWidth = 1.5;
      for (let y = 70; y < 594; y += 22) { ng.beginPath(); ng.moveTo(0, y); ng.lineTo(420, y); ng.stroke(); }
      ng.strokeStyle = 'rgba(200,80,70,.45)'; ng.beginPath(); ng.moveTo(56, 0); ng.lineTo(56, 594); ng.stroke();
      const nb = new THREE.Mesh(new THREE.BoxGeometry(0.21, 0.006, 0.297), [0, 0, 0, 0, 0, 0].map((_, k) => k === 2 ? new THREE.MeshStandardMaterial({ map: U.canvasTex(nc), roughness: 0.85 }) : new THREE.MeshStandardMaterial({ color: 0xe9e6dd, roughness: 0.9 })));
      nb.position.set(F.x + 0.3, 0.753, F.z - 0.06);
      nb.rotation.y = -0.12;
      nb.castShadow = nb.receiveShadow = true;
      scene.add(nb);
      const pencil = new THREE.Group();
      const pb = new THREE.Mesh(new THREE.CylinderGeometry(0.0036, 0.0036, 0.15, 6), new THREE.MeshStandardMaterial({ color: 0xd9a92f, roughness: 0.5 }));
      const pt = new THREE.Mesh(new THREE.ConeGeometry(0.0036, 0.018, 6), new THREE.MeshStandardMaterial({ color: 0xd9bb8c, roughness: 0.7 }));
      pt.position.y = 0.084;
      pencil.add(pb, pt);
      pencil.rotation.set(0, 0.5, Math.PI / 2);
      pencil.position.set(F.x + 0.12, 0.7536, F.z + 0.13);
      pencil.traverse(o => { o.castShadow = true; });
      scene.add(pencil);

      const ORIGIN = U.V3(0, 0, 0), T = U.V3(), DIR = U.V3(), UPN = U.V3(0, 0, -1);
      L.update = s => {
        const H = Math.pow(10, s);
        const kDesk = U.smooth(1.2, 0.3, s), kTilt = U.smooth(0.3, -0.9, s);
        T.copy(ORIGIN).lerp(F, kDesk).lerp(C, kTilt);
        const elv = U.lerp(90, 38, kTilt) * D2R;
        DIR.set(0, Math.sin(elv), Math.cos(elv));
        setCam(cam, T, DIR, UPN, H, 120);
        const ext = Math.max(H * 0.9, 0.05);
        sun.position.copy(T).addScaledVector(sunDir, Math.max(H * 3, 2));
        sun.target.position.copy(T);
        const sc2 = sun.shadow.camera;
        sc2.left = -ext; sc2.right = ext; sc2.top = ext; sc2.bottom = -ext;
        sc2.near = Math.max(H * 0.05, 0.01); sc2.far = Math.max(H * 7, 6);
        sc2.updateProjectionMatrix();
      };

      addLabel(L, 'Okul binası · çatı kaldırıldı', U.V3(-12, 1.1, -7.9), 0.95, 2.3);
      addLabel(L, 'Koridor', U.V3(-15, 0.1, -6.3), 0.95, 1.9);
      addLabel(L, 'Sınıf', U.V3(-1.6, 0.1, 5.6), 0.6, 1.75);
      addLabel(L, 'Telefon', U.V3(PX - 0.03, 0.76, PZ), -0.5, 0.45);
      addLabel(L, 'Şarj kablosu', U.V3(F.x + 0.2, cY, PZ + 0.06), -0.75, 0.45);
      addLabel(L, 'Defter', U.V3(F.x + 0.32, 0.757, F.z + 0.02), -0.35, 0.45);
      return L;
    }

    /* ===== grain texture shared by the cable and grain layers ===== */
    let grainTexCache = null, grainSeed = null;
    function grainTexture() {
      if (grainTexCache) return grainTexCache;
      const N = 1024, cell = 104, cols = Math.ceil(N / cell) + 2;
      const seeds = [];
      for (let gy = -1; gy < cols - 1; gy++) for (let gx = -1; gx < cols - 1; gx++) {
        const twin = Math.random() < 0.45;
        const ang = Math.random() * Math.PI;
        seeds.push({ x: (gx + Math.random()) * cell, y: (gy + Math.random()) * cell, gx, gy, l: 0.72 + Math.random() * 0.45, h: Math.random() * 0.08 - 0.04, twin, dx: Math.cos(ang), dy: Math.sin(ang), w: 9 + Math.random() * 20 });
      }
      const grid = new Array(cols * cols).fill(null);
      seeds.forEach(sd => { grid[(sd.gy + 1) * cols + (sd.gx + 1)] = sd; });
      const c = canvas(N, N), g = c.getContext('2d');
      const img = g.createImageData(N, N), d = img.data;
      let best = null;
      for (let y = 0; y < N; y++) {
        for (let x = 0; x < N; x++) {
          const cx = Math.floor(x / cell), cy = Math.floor(y / cell);
          let d1 = 1e9, d2 = 1e9, s1 = null;
          for (let oy = -1; oy <= 1; oy++) for (let ox = -1; ox <= 1; ox++) {
            const gx = cx + ox + 1, gy = cy + oy + 1;
            const sd = gx >= 0 && gy >= 0 && gx < cols && gy < cols ? grid[gy * cols + gx] : null;
            if (!sd) continue;
            const dd = (sd.x - x) * (sd.x - x) + (sd.y - y) * (sd.y - y);
            if (dd < d1) { d2 = d1; d1 = dd; s1 = sd; } else if (dd < d2) d2 = dd;
          }
          let l = s1.l;
          if (s1.twin) { const p = (x * s1.dx + y * s1.dy) / s1.w; if (p - Math.floor(p) < 0.32) l *= 0.86; }
          const edge = Math.sqrt(d2) - Math.sqrt(d1);
          if (edge < 2.2) l *= 0.55 + 0.2 * (edge / 2.2);
          l *= 0.96 + Math.random() * 0.06;
          const i = (y * N + x) * 4;
          d[i] = Math.min(255, 214 * l * (1 + s1.h));
          d[i + 1] = Math.min(255, 138 * l);
          d[i + 2] = Math.min(255, 98 * l * (1 - s1.h));
          d[i + 3] = 255;
          if (x === 470 && y === 430) best = s1;
        }
      }
      g.putImageData(img, 0, 0);
      g.globalAlpha = 0.08;
      g.strokeStyle = '#fff6ec';
      for (let k = 0; k < 26; k++) {
        g.lineWidth = 0.5 + Math.random();
        const a = Math.random() * Math.PI, x0 = Math.random() * N, y0 = Math.random() * N, len = 300 + Math.random() * 700;
        g.beginPath(); g.moveTo(x0 - Math.cos(a) * len, y0 - Math.sin(a) * len); g.lineTo(x0 + Math.cos(a) * len, y0 + Math.sin(a) * len); g.stroke();
      }
      g.globalAlpha = 1;
      grainSeed = best || seeds[Math.floor(seeds.length / 2)];
      grainTexCache = U.canvasTex(c);
      return grainTexCache;
    }

    /* ===== Layer: USB cable cutaway (1 unit = 1 mm) ===== */
    function buildCable() {
      const L = { key: 'cable', bgCss: '#0E121A', bg: new THREE.Color(0x0E121A) };
      const scene = (L.scene = new THREE.Scene());
      const cam = (L.cam = makeCam());
      U.keyLight(scene, { pos: [4, 12, 9], shadow: false, intensity: 1.15 });
      const tubeX = (r, x0, x1, mat, segs) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, x1 - x0, segs || 72, 1, true), mat); m.rotation.z = Math.PI / 2; m.position.x = (x0 + x1) / 2; return m; };
      const capX = (r0, r1, x, mat) => { const m = new THREE.Mesh(r0 > 0 ? new THREE.RingGeometry(r0, r1, 72) : new THREE.CircleGeometry(r1, 48), mat); m.rotation.y = Math.PI / 2; m.position.x = x; return m; };
      const jacket = new THREE.MeshPhysicalMaterial({ color: 0xefefeb, roughness: 0.5, clearcoat: 0.25, side: THREE.DoubleSide });
      scene.add(tubeX(1.75, -40, -5, jacket), capX(1.46, 1.75, -5, jacket));

      const bc = canvas(512, 128), bg = bc.getContext('2d');
      bg.fillStyle = '#7d756b'; bg.fillRect(0, 0, 512, 128);
      for (let k = -8; k < 24; k++) {
        for (let s = 0; s < 6; s++) {
          bg.strokeStyle = s % 2 ? '#d9cfc2' : '#b9ad9e'; bg.lineWidth = 2.2;
          bg.beginPath(); bg.moveTo(k * 32 + s * 4, 0); bg.lineTo(k * 32 + s * 4 + 128, 128); bg.stroke();
          bg.strokeStyle = s % 2 ? '#cfc4b5' : '#aa9e8f';
          bg.beginPath(); bg.moveTo(k * 32 + s * 4 + 128, 0); bg.lineTo(k * 32 + s * 4, 128); bg.stroke();
        }
      }
      const braidTex = U.canvasTex(bc);
      braidTex.wrapS = braidTex.wrapT = THREE.RepeatWrapping;
      braidTex.repeat.set(3, 9);
      const braid = new THREE.MeshStandardMaterial({ map: braidTex, metalness: 0.85, roughness: 0.42, side: THREE.DoubleSide });
      scene.add(tubeX(1.43, -40, -3.2, braid), capX(1.33, 1.43, -3.2, braid));
      const foil = new THREE.MeshStandardMaterial({ color: 0xdfe2e6, metalness: 1, roughness: 0.22, side: THREE.DoubleSide });
      scene.add(tubeX(1.32, -40, -1.8, foil), capX(1.0, 1.32, -1.8, foil));

      const copper = new THREE.MeshStandardMaterial({ color: 0xd38a5c, metalness: 1, roughness: 0.27 });
      const faceMat = new THREE.MeshStandardMaterial({ map: grainTexture(), metalness: 0.95, roughness: 0.3 });
      const wires = [
        { name: 'red', col: 0xb3261e, y: 0.5, z: 0.5, ri: 0.48, rs: 0.085, end: 2.0 },
        { name: 'white', col: 0xe9e9e4, y: -0.5, z: 0.5, ri: 0.38, rs: 0.065, end: 0.6 },
        { name: 'green', col: 0x2f7d4a, y: 0.5, z: -0.5, ri: 0.38, rs: 0.065, end: 0.2 },
        { name: 'black', col: 0x1d1f23, y: -0.5, z: -0.5, ri: 0.48, rs: 0.085, end: 1.2 }
      ];
      let redFace = null;
      wires.forEach(w => {
        const ins = new THREE.MeshPhysicalMaterial({ color: w.col, roughness: 0.38, clearcoat: 0.35, side: THREE.DoubleSide });
        const t = tubeX(w.ri, -40, w.end, ins, 48); t.position.y = w.y; t.position.z = w.z; scene.add(t);
        const c = capX(w.rs * 3.05, w.ri, w.end, ins); c.position.y = w.y; c.position.z = w.z; scene.add(c);
        const len = 3.2, x0 = w.end - 0.4, x1 = w.end + len;
        for (let k = 0; k < 7; k++) {
          const ring = k === 0 ? 0 : w.rs * 2.02, a0 = (k / 6) * U.TAU;
          const pts = [];
          for (let j = 0; j <= 40; j++) {
            const x = x0 + (j / 40) * (x1 - x0), a = a0 + (x / 9) * U.TAU;
            pts.push(U.V3(x, w.y + Math.cos(a) * ring, w.z + Math.sin(a) * ring));
          }
          const curve = new THREE.CatmullRomCurve3(pts);
          scene.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 60, w.rs, 12), copper));
          const end = pts[pts.length - 1];
          const face = new THREE.Mesh(new THREE.CircleGeometry(w.rs, 32), w.name === 'red' && k === 0 ? faceMat : copper);
          face.position.copy(end);
          face.rotation.y = Math.PI / 2;
          scene.add(face);
          if (w.name === 'red' && k === 0) redFace = end.clone();
        }
      });

      const dirA = U.V3(0, Math.sin(38 * D2R), Math.cos(38 * D2R));
      const dirB = U.V3(1, 0.3, 0.26).normalize();
      const tA = U.V3(-1.2, 0, 0.2), T = U.V3(), DIR = U.V3(), UP = U.V3(0, 1, 0);
      L.update = s => {
        const b = U.smooth(-2.1, -3.3, s);
        T.copy(tA).lerp(redFace, b);
        DIR.copy(dirA).lerp(dirB, b).normalize();
        setCam(cam, T, DIR, UP, Math.pow(10, s) / 1e-3);
      };
      addLabel(L, 'Dış kılıf (PVC)', U.V3(-11, 1.75, 0), -2.4, -1.25);
      addLabel(L, 'Örgü ekran', U.V3(-4.2, 1.43, 0), -2.4, -1.25);
      addLabel(L, 'Alüminyum folyo', U.V3(-2.5, 1.32, 0), -2.4, -1.25);
      addLabel(L, 'Kırmızı: + 5 V', U.V3(1.2, 0.98, 0.5), -2.4, -1.25);
      addLabel(L, 'Siyah: − (0 V)', U.V3(0.6, -0.5, -0.02), -2.4, -1.25);
      addLabel(L, 'Beyaz ve yeşil: veri', U.V3(0.2, -0.5, 0.88), -2.4, -1.25);
      addLabel(L, 'Bakır lifler', U.V3(3.9, 0.7, 0.5), -2.6, -1.25);
      return L;
    }

    /* ===== Layer: copper strand cross-section (1 unit = 1 µm) ===== */
    function buildGrain() {
      const L = { key: 'grain', bgCss: '#0E121A', bg: new THREE.Color(0x0E121A) };
      const scene = (L.scene = new THREE.Scene());
      const cam = (L.cam = makeCam());
      U.keyLight(scene, { pos: [9, 6, 5], shadow: false, intensity: 1.1 });
      const r = 85;
      const tex = grainTexture();
      const faceMat = new THREE.MeshStandardMaterial({ map: tex, metalness: 0.95, roughness: 0.3 });
      const sideMat = new THREE.MeshStandardMaterial({ color: 0xd38a5c, metalness: 1, roughness: 0.3 });
      const strand = (y, z, mat, rot) => {
        const f = new THREE.Mesh(new THREE.CircleGeometry(r, 128), mat);
        f.rotation.y = Math.PI / 2;
        f.rotation.x = rot || 0;
        f.position.set(0, y, z);
        const sd = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 900, 96, 1, true), sideMat);
        sd.rotation.z = Math.PI / 2;
        sd.position.set(-450.5, y, z);
        scene.add(f, sd);
      };
      strand(0, 0, faceMat, 0);
      for (let k = 0; k < 6; k++) {
        const a = (k / 6) * U.TAU + 0.3;
        strand(Math.cos(a) * 172, Math.sin(a) * 172, faceMat, k * 1.1 + 0.7);
      }
      const gs = grainSeed || { x: 512, y: 512 };
      const G = U.V3(0, (2 * (1 - gs.y / 1024) - 1) * r, -(2 * (gs.x / 1024) - 1) * r);
      const dirA = U.V3(1, 0.3, 0.26).normalize(), dirB = U.V3(1, 0.07, 0.05).normalize();
      const T = U.V3(), DIR = U.V3(), UP = U.V3(0, 1, 0);
      L.update = s => {
        const b = U.smooth(-3.4, -5.2, s);
        T.set(0, 0, 0).lerp(G, b);
        DIR.copy(dirA).lerp(dirB, b).normalize();
        setCam(cam, T, DIR, UP, Math.pow(10, s) / 1e-6);
      };
      addLabel(L, 'Bir tane: tek bir kristal', () => G, -4.6, -3.2);
      addLabel(L, 'Komşu lif', U.V3(2, Math.cos(0.3) * 172, Math.sin(0.3) * 172), -3.75, -3.2);
      return L;
    }

    /* ===== Layer: copper crystal lattice (1 unit = 1 Å) ===== */
    function buildLattice() {
      const L = { key: 'lattice', bgCss: '#0B0F17', bg: new THREE.Color(0x0B0F17) };
      const scene = (L.scene = new THREE.Scene());
      const cam = (L.cam = makeCam());
      U.keyLight(scene, { pos: [8, 12, 10], shadow: false, intensity: 1.2 });
      const a = 3.615, view = U.V3(1, 0.55, 0.8).normalize();
      const basis = [[0, 0, 0], [0, 0.5, 0.5], [0.5, 0, 0.5], [0.5, 0.5, 0]];
      const ions = [];
      for (let i = -3; i < 3; i++) for (let j = -3; j < 3; j++) for (let k = -3; k < 3; k++) for (const b of basis) {
        const p = U.V3((i + b[0]) * a, (j + b[1]) * a, (k + b[2]) * a);
        const len = p.length();
        if (len > 1.5 && p.dot(view) > len * Math.cos(34 * D2R)) continue;
        ions.push(p);
      }
      const im = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 18, 12), new THREE.MeshStandardMaterial({ color: 0xcf8457, metalness: 1, roughness: 0.28 }), ions.length);
      ions.forEach((p, i) => U.setInst(im, i, p, 0.62));
      scene.add(im);
      const NE = 1100, ep = new Float32Array(NE * 3), ev = [];
      const lim = 3 * a;
      for (let i = 0; i < NE; i++) {
        ep.set([U.rnd(-lim, lim), U.rnd(-lim, lim), U.rnd(-lim, lim)], i * 3);
        ev.push(U.randDir(U.V3()).multiplyScalar(U.rnd(3, 6)));
      }
      const eg = new THREE.BufferGeometry();
      eg.setAttribute('position', new THREE.BufferAttribute(ep, 3));
      const em = new THREE.PointsMaterial({ size: 0.42, map: KG.dotTex, color: 0x8EA6F2, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false });
      scene.add(new THREE.Points(eg, em));
      let front = ions[0];
      ions.forEach(p => { if (p.length() > 2 && p.length() < 6.5 && p.dot(view) > front.dot(view) - 0.01 && Math.abs(p.y) > 0.5) front = p; });
      const UP = U.V3(0, 1, 0), O = U.V3(0, 0, 0);
      L.update = (s, dt) => {
        setCam(cam, O, view, UP, Math.pow(10, s) / 1e-10);
        for (let i = 0; i < NE; i++) {
          const v = ev[i];
          if (Math.random() < dt * 2.5) U.randDir(v).multiplyScalar(U.rnd(3, 6));
          for (let c = 0; c < 3; c++) {
            let x = ep[i * 3 + c] + v.getComponent(c) * dt;
            if (x > lim) x -= 2 * lim; else if (x < -lim) x += 2 * lim;
            ep[i * 3 + c] = x;
          }
        }
        eg.attributes.position.needsUpdate = true;
      };
      addLabel(L, 'Bakır iyonu (Cu⁺)', front, -9.0, -8.0);
      addLabel(L, 'Serbest elektronlar: elektron denizi', U.V3(-3.6, 7.2, 3.6), -9.0, -8.0);
      addLabel(L, 'Yolculuğun hedefi: tek bir atom', O, -9.3, -8.85, { flat: false });
      return L;
    }

    /* ===== Layer: copper atom (1 unit = 1 pm) ===== */
    function gammaR(k, theta) { let s = 0; for (let i = 0; i < k; i++) s -= Math.log(1 - Math.random()); return s * theta; }
    function angular(kind, out) {
      for (let tries = 0; tries < 200; tries++) {
        U.randDir(out);
        const x = out.x, y = out.y, z = out.z;
        let p = 1;
        if (kind === 'px') p = x * x; else if (kind === 'py') p = y * y; else if (kind === 'pz') p = z * z;
        else if (kind === 'dxy') p = 4 * x * x * y * y; else if (kind === 'dxz') p = 4 * x * x * z * z; else if (kind === 'dyz') p = 4 * y * y * z * z;
        else if (kind === 'dx2') p = (x * x - y * y) * (x * x - y * y); else if (kind === 'dz2') p = ((3 * z * z - 1) / 2) * ((3 * z * z - 1) / 2);
        if (Math.random() < p) return out;
      }
      return out;
    }
    function cloud(parts) {
      const total = parts.reduce((a, p) => a + p.n, 0);
      const arr = new Float32Array(total * 3), d = U.V3();
      let o = 0;
      parts.forEach(p => {
        for (let i = 0; i < p.n; i++) {
          angular(p.kind, d);
          const r = gammaR(p.k, p.peak / (p.k - 1));
          arr[o++] = d.x * r; arr[o++] = d.y * r; arr[o++] = d.z * r;
        }
      });
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(arr, 3));
      return g;
    }
    function buildAtom() {
      const L = { key: 'atom', bgCss: '#07090E', bg: new THREE.Color(0x07090E) };
      const scene = (L.scene = new THREE.Scene());
      const cam = (L.cam = makeCam());
      U.keyLight(scene, { pos: [6, 10, 9], shadow: false, intensity: 1.0 });
      const group = new THREE.Group();
      scene.add(group);

      const groups = [
        { peak: 140, size: 3.2, col: 0xE39A6C, op: 0.5, parts: [{ kind: 's', n: 2600, k: 9, peak: 140 }] },
        { peak: 33, size: 1.15, col: 0x8EA6F2, op: 0.42, parts: ['dxy', 'dxz', 'dyz', 'dx2', 'dz2'].map(kd => ({ kind: kd, n: 640, k: 7, peak: 33 })) },
        { peak: 25, size: 0.95, col: 0xA9BCF6, op: 0.4, parts: [{ kind: 's', n: 300, k: 7, peak: 25 }, { kind: 'px', n: 300, k: 7, peak: 25 }, { kind: 'py', n: 300, k: 7, peak: 25 }, { kind: 'pz', n: 300, k: 7, peak: 25 }] },
        { peak: 8.5, size: 0.32, col: 0xC9D5FA, op: 0.45, parts: [{ kind: 's', n: 260, k: 5, peak: 8.5 }, { kind: 'px', n: 260, k: 5, peak: 8.5 }, { kind: 'py', n: 260, k: 5, peak: 8.5 }, { kind: 'pz', n: 260, k: 5, peak: 8.5 }] },
        { peak: 1.8, size: 0.075, col: 0xEEF0F3, op: 0.55, parts: [{ kind: 's', n: 450, k: 3, peak: 1.8 }] }
      ];
      groups.forEach(gr => {
        gr.mat = new THREE.PointsMaterial({ size: gr.size, map: KG.dotTex, color: gr.col, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false });
        gr.obj = new THREE.Points(cloud(gr.parts), gr.mat);
        group.add(gr.obj);
      });

      const bohr = new THREE.Group();
      group.add(bohr);
      const shells = [{ r: 18, n: 2, rx: 0.3, rz: 0 }, { r: 50, n: 8, rx: -0.5, rz: 0.3 }, { r: 92, n: 18, rx: 0.9, rz: -0.2 }, { r: 140, n: 1, rx: -0.25, rz: 0.6 }];
      const ringMat = new THREE.MeshBasicMaterial({ color: 0x9AA3B2, transparent: true, opacity: 0.45, depthWrite: false });
      const eMat = new THREE.MeshStandardMaterial({ color: 0x8EA6F2, emissive: 0x3b5bd6, emissiveIntensity: 0.6, roughness: 0.35, transparent: true });
      const e4Mat = new THREE.MeshStandardMaterial({ color: 0xE39A6C, emissive: 0xa0522d, emissiveIntensity: 0.6, roughness: 0.35, transparent: true });
      const eGeo = new THREE.SphereGeometry(3.2, 20, 14);
      const orbiters = [];
      shells.forEach((sh, si) => {
        const plane = new THREE.Group();
        plane.rotation.set(sh.rx, 0, sh.rz);
        const ring = new THREE.Mesh(new THREE.TorusGeometry(sh.r, 0.45, 8, 180), ringMat);
        ring.rotation.x = Math.PI / 2;
        plane.add(ring);
        for (let k = 0; k < sh.n; k++) {
          const e = new THREE.Mesh(eGeo, si === 3 ? e4Mat : eMat);
          plane.add(e);
          orbiters.push({ e, r: sh.r, a: (k / sh.n) * U.TAU, w: 1.5 / Math.sqrt(sh.r / 18) });
        }
        bohr.add(plane);
      });
      const nucMat = new THREE.MeshStandardMaterial({ color: 0xC8693A, emissive: 0x5a2a12, roughness: 0.4, transparent: true });
      const nuc = new THREE.Mesh(new THREE.SphereGeometry(6, 24, 16), nucMat);
      bohr.add(nuc);
      const nucDot = U.glow(0xffffff, 0.012, 0.9);
      nucDot.material.sizeAttenuation = false;
      group.add(nucDot);

      const view = U.V3(0.9, 0.45, 1).normalize(), UP = U.V3(0, 1, 0), O = U.V3(0, 0, 0);
      let D = 300;
      L.update = (s, dt, t) => {
        D = setCam(cam, O, view, UP, Math.pow(10, s) / 1e-12, 60);
        group.rotation.y = t * 0.05;
        const m = st.morph;
        groups.forEach(gr => {
          const inside = U.smooth(0.3 * gr.peak, 1.1 * gr.peak, D);
          gr.mat.opacity = gr.op * m * inside;
          gr.obj.visible = gr.mat.opacity > 0.003;
        });
        const bo = 1 - m;
        bohr.visible = bo > 0.01;
        ringMat.opacity = 0.45 * bo;
        eMat.opacity = e4Mat.opacity = nucMat.opacity = bo;
        orbiters.forEach(o => { o.a += o.w * dt; o.e.position.set(Math.cos(o.a) * o.r, 0, Math.sin(o.a) * o.r); });
        nucDot.material.opacity = m * U.smooth(-9.2, -10.2, s) * 0.9 + m * 0.25;
      };
      const vis = (lo, hi, model) => () => L.a > 0.55 && st.s >= lo && st.s <= hi && (model === 'bohr' ? st.morph < 0.4 : model === 'cloud' ? st.morph > 0.6 : true);
      const lab = (text, pos, lo, hi, model) => labels.push({ text, pos, cam: () => cam, vis: vis(lo, hi, model) });
      const wp = v => () => group.localToWorld(v.clone());
      lab('Çekirdek (ölçekli değil)', U.V3(0, 0, 0), -9.9, -9.2, 'bohr');
      lab('Elektron', () => orbiters[12].e.getWorldPosition(U.V3()), -9.9, -9.2, 'bohr');
      lab('En dıştaki 4s elektronu', () => orbiters[28].e.getWorldPosition(U.V3()), -9.9, -9.2, 'bohr');
      lab('4s bulutu: en dıştaki elektron', wp(U.V3(0, 128, 0)), -9.9, -9.2, 'cloud');
      lab('İç elektronlar (3s, 3p, 3d)', wp(U.V3(30, -28, 0)), -10.4, -9.2, 'cloud');
      lab('Çekirdek burada: bu ölçekte görünmez', U.V3(0, 0, 0), -9.9, -9.2, 'cloud');
      lab('3d bulutu (10 elektron)', wp(U.V3(0, 34, 0)), -11.0, -10.3, 'cloud');
      lab('2s ve 2p bulutları (8 elektron)', wp(U.V3(0, 8.5, 0)), -11.6, -10.85, 'cloud');
      lab('1s bulutu (2 elektron)', wp(U.V3(0, 1.8, 0)), -12.3, -11.45, 'cloud');
      return L;
    }

    /* ===== Layer: nucleus (1 unit = 1 fm) ===== */
    function buildNucleus() {
      const L = { key: 'nucleus', bgCss: '#07090E', bg: new THREE.Color(0x07090E) };
      const scene = (L.scene = new THREE.Scene());
      const cam = (L.cam = makeCam());
      U.keyLight(scene, { pos: [6, 9, 8], shadow: false, intensity: 1.3 });
      const N = 63, rad = 0.86, pos = [];
      for (let i = 0; i < N; i++) pos.push(U.randDir(U.V3()).multiplyScalar(Math.cbrt(Math.random()) * 4.4));
      const tmp = U.V3();
      for (let it = 0; it < 220; it++) {
        for (let i = 0; i < N; i++) for (let j = i + 1; j < N; j++) {
          const d = pos[i].distanceTo(pos[j]), min = rad * 2 * 0.97;
          if (d < min && d > 1e-5) { tmp.subVectors(pos[j], pos[i]).multiplyScalar((min - d) * 0.5 / d); pos[i].sub(tmp); pos[j].add(tmp); }
        }
        pos.forEach(p => p.multiplyScalar(0.993));
      }
      const order = pos.map((p, i) => i).sort(() => Math.random() - 0.5);
      const isP = new Array(N).fill(false);
      order.slice(0, 29).forEach(i => { isP[i] = true; });
      const group = new THREE.Group();
      scene.add(group);
      const geo = new THREE.SphereGeometry(rad, 28, 18);
      const pm = new THREE.InstancedMesh(geo, new THREE.MeshPhysicalMaterial({ color: 0xC8693A, roughness: 0.35, clearcoat: 0.4 }), 29);
      const nm = new THREE.InstancedMesh(geo, new THREE.MeshPhysicalMaterial({ color: 0x9AA3B2, roughness: 0.4, clearcoat: 0.3 }), 34);
      group.add(pm, nm);
      const halo = U.glow(0xE39A6C, 22, 0.18);
      scene.add(halo);
      const view = U.V3(1, 0.5, 0.9).normalize(), UP = U.V3(0, 1, 0), O = U.V3(0, 0, 0);
      let fp = null, fn = null;
      pos.forEach((p, i) => { if (isP[i] && (!fp || p.dot(view) > fp.dot(view))) fp = p; if (!isP[i] && (!fn || (p.dot(view) > fn.dot(view) - 0.6 && p.y < fn.y))) fn = p; });
      const jit = U.V3();
      L.update = (s, dt, t) => {
        setCam(cam, O, view, UP, Math.pow(10, s) / 1e-15, 60);
        group.rotation.y = t * 0.08;
        let ip = 0, inn = 0;
        pos.forEach((p, i) => {
          jit.set(Math.sin(t * 3.1 + i), Math.sin(t * 2.7 + i * 1.7), Math.cos(t * 2.9 + i * 0.7)).multiplyScalar(0.035).add(p);
          if (isP[i]) U.setInst(pm, ip++, jit, 1); else U.setInst(nm, inn++, jit, 1);
        });
        pm.instanceMatrix.needsUpdate = nm.instanceMatrix.needsUpdate = true;
      };
      labels.push({ text: 'Proton · 29 tane · yükü artı', pos: () => group.localToWorld(fp.clone()), cam: () => cam, vis: () => L.a > 0.55 && st.s < -13.0 });
      labels.push({ text: 'Nötron · 34 tane · yüksüz', pos: () => group.localToWorld(fn.clone()), cam: () => cam, vis: () => L.a > 0.55 && st.s < -13.0 });
      return L;
    }

    /* ---------- build, alpha windows, composite ---------- */
    M.build = function () {
      const E = buildEarth(), S = buildSchool(), C = buildCable(), G = buildGrain(), La = buildLattice(), A = buildAtom(), N = buildNucleus();
      const sm = U.smooth;
      E.alpha = s => sm(2.9, 3.4, s);
      S.alpha = s => Math.min(sm(3.4, 2.9, s), sm(-1.4, -0.9, s));
      C.alpha = s => Math.min(sm(-0.9, -1.4, s), sm(-3.4, -3.0, s));
      G.alpha = s => Math.min(sm(-3.0, -3.4, s), sm(-7.9, -7.4, s));
      La.alpha = s => Math.min(sm(-7.4, -7.9, s), sm(-9.35, -9.05, s));
      A.alpha = s => Math.min(sm(-9.05, -9.35, s), sm(-12.8, -12.2, s));
      N.alpha = s => sm(-12.2, -12.8, s);
      layers = [E, S, C, G, La, A, N];
      layers.forEach(L => { L.a = 0; });

      const ex = KG.renderer.extensions;
      const floatOK = KG.renderer.capabilities.isWebGL2 && (ex.has('EXT_color_buffer_float') || ex.has('EXT_color_buffer_half_float'));
      const opts = { type: floatOK ? THREE.HalfFloatType : THREE.UnsignedByteType, depthBuffer: true, samples: KG.DPR <= 1.25 ? 4 : 0 };
      rtA = new THREE.WebGLRenderTarget(4, 4, opts);
      rtB = new THREE.WebGLRenderTarget(4, 4, opts);
      comp = new THREE.ShaderMaterial({
        uniforms: { tA: { value: null }, tB: { value: null }, k: { value: 0 } },
        vertexShader: 'varying vec2 vUv;\nvoid main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
        fragmentShader: 'uniform sampler2D tA; uniform sampler2D tB; uniform float k; varying vec2 vUv;\nvoid main(){\n gl_FragColor = vec4(mix(texture2D(tA, vUv).rgb, texture2D(tB, vUv).rgb, k), 1.0);\n#include <encodings_fragment>\n}',
        depthTest: false, depthWrite: false, toneMapped: false
      });
      compScene = new THREE.Scene();
      const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), comp);
      quad.frustumCulled = false;
      compScene.add(quad);
      compCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    };

    M.onResize = function (w, h) {
      layers.forEach(L => { L.cam.aspect = w / h; L.cam.updateProjectionMatrix(); });
      const pw = Math.max(4, Math.round(w * KG.DPR)), ph = Math.max(4, Math.round(h * KG.DPR));
      if (rtA) { rtA.setSize(pw, ph); rtB.setSize(pw, ph); }
    };

    M.update = function (dt, t) {
      layers.forEach(L => {
        L.a = L.alpha(st.s);
        if (L.a > 0.002) L.update(st.s, dt, t);
      });
    };

    M.render = function () {
      const r = KG.renderer, act = layers.filter(L => L.a > 0.002);
      if (!act.length) return;
      if (act.length === 1) {
        const L = act[0];
        L.scene.background = null;
        if (KG.dom.stage.style.background !== L.bgCss) KG.dom.stage.style.background = L.bgCss;
        r.setRenderTarget(null);
        r.render(L.scene, L.cam);
        return;
      }
      const A = act[0], B = act[1];
      A.scene.background = A.bg;
      B.scene.background = B.bg;
      r.setRenderTarget(rtA); r.render(A.scene, A.cam);
      r.setRenderTarget(rtB); r.render(B.scene, B.cam);
      r.setRenderTarget(null);
      comp.uniforms.tA.value = rtA.texture;
      comp.uniforms.tB.value = rtB.texture;
      comp.uniforms.k.value = B.a / (A.a + B.a);
      r.render(compScene, compCam);
    };

    return M;
  });
})();
