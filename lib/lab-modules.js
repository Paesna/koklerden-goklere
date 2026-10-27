/* Köklerden Göklere · Modüller 01–06 */
(function () {
  'use strict';
  const KG = window.KG;
  if (!KG) return;
  const U = KG.util;
  const $ = U.$;
  const TAU = U.TAU;

  function fillProse(el, paras) {
    el.textContent = '';
    paras.forEach(p => {
      const n = document.createElement(p.note ? 'div' : 'p');
      if (p.note) n.className = 'note';
      n.textContent = p.note || p;
      el.appendChild(n);
    });
  }
  function toggleBtn(btn, on, onText, offText) {
    btn.textContent = on ? onText : offText;
    btn.classList.toggle('on', on);
  }

  /* =====================================================================
     01 · Malzemenin İçi
     ===================================================================== */
  KG.register(1, function () {
    const st = { mat: 'cu', volt: false, voltK: 0, temp: 32, swapK: 1 };
    const M = { kicker: 'Modül 01', title: 'Malzemenin İçi', home: { p: [0, 2.6, 13.4], t: [0, 0, 0] }, from: [9, 9, 25], lim: { min: 5, max: 28, maxPolar: Math.PI * 0.64 }, st };
    const DATA = {
      cu: {
        free: 'Çok', bond: 'Metalik', beh: 'İletken',
        chips: [['Cu', 29, 'Bakır', 'metal']],
        text: ['Bakır bir metaldir. Atomlar en dıştaki elektronlarını tek başına tutmaz; bu elektronlar bütün kristale yayılan ortak bir “elektron denizi” oluşturur ve durmadan rastgele hareket eder.',
          'İki uç arasına gerilim uygulandığında bu rastgele harekete yavaş ama ortak bir yön eklenir. Elektrik akımı budur.'],
        sci: 'Metalik bağda pozitif iyonlar düzenli bir kafes kurar, değerlik elektronları kafes boyunca serbestçe dolaşır. Bakırda her atom yaklaşık bir serbest elektron verir; 1 cm³ bakırda yaklaşık 8,5 × 10²² serbest elektron bulunur. Görselde atom boyutları ve hızlar ölçekli değildir.'
      },
      ker: {
        free: 'Yok', bond: 'Kovalent', beh: 'Yalıtkan',
        chips: [['C', 6, 'Karbon', 'ametal'], ['H', 1, 'Hidrojen', 'ametal'], ['O', 8, 'Oksijen', 'ametal'], ['N', 7, 'Azot', 'ametal'], ['S', 16, 'Kükürt', 'ametal']],
        text: ['Tırnak ve saç, keratin adlı bir proteinden yapılır. Keratin karbon, hidrojen, oksijen, azot ve kükürt atomlarından oluşur; beşi de periyodik tabloda ametaldir.',
          'Ametaller elektronlarını kovalent bağlarda komşularıyla paylaşır ve sıkıca tutar. Serbest elektron olmadığı için kuru tırnak elektriği iletmez: gerilim uygulandığında elektronlar yalnızca yerinde biraz kayar, akmaz.',
          { note: 'Tırnak kitin değil keratindir. Kitin böceklerin dış iskeletinde bulunur ve o da yalnızca ametallerden (C, H, O, N) oluşur. Islak bir yüzey ise farklıdır: suda çözünmüş tuzların iyonları akım taşır. Bu yüzden ıslak deri ya da ıslak tırnak koruma sağlamaz.' }],
        sci: 'Kovalent bağda elektronlar iki atom arasında paylaşılır ve bağa bağlı kalır. Keratin zincirleri sarmal (alfa sarmal) yapıdadır; zincirleri kükürt–kükürt (disülfit) köprüleri birbirine bağlar, saç ve tırnağın sağlamlığı buradan gelir. Gerilim altında elektron bulutlarının hafifçe kaymasına kutuplanma denir. Renkler bilimsel gelenektedir: C gri, H beyaz, O kırmızı, N mavi, S sarı.'
      },
      si: {
        free: 'Az · ısıyla artar', bond: 'Kovalent', beh: 'Yarı iletken',
        chips: [['Si', 14, 'Silisyum', 'yari']],
        text: ['Silisyum, periyodik tabloda metallerle ametallerin arasında yer alan bir yarı metaldir. Her atom dört komşusuyla elektron paylaşır; elektronların çoğu bağlarda kalır.',
          'Isı enerjisi bazı elektronları bağdan koparır ve geride bir boşluk (hol) bırakır. Sıcaklık arttıkça serbest elektron sayısı da artar.',
          { note: 'Mühendisler silisyuma çok az miktarda başka element ekleyerek (katkılama) iletkenliğini hassas biçimde ayarlar. Bilgisayar çiplerindeki milyarlarca transistör bu sayede çalışır.' }],
        sci: 'Yarı iletkenlerde iletkenlik sıcaklıkla hızla artar; metallerde ise tersine azalır. Silisyum, yer kabuğunda oksijenden sonra en bol bulunan elementtir; kumun ana bileşeni silisyum dioksittir (SiO₂). Görseldeki serbest elektron ve hol sayıları semboliktir.'
      }
    };
    M.note = () => st.mat === 'cu' ? 'Atom boyutları ve elektron hızları ölçekli değildir; sürüklenme görünür olsun diye büyütülmüştür.'
      : st.mat === 'ker' ? 'Top-çubuk modeli. Elektronlar bağların çevresinde gösterilmiştir.'
      : 'Elmas kafes yapısı. Turuncu halkalar holleri, mavi noktalar elektronları gösterir.';

    let setMatSeg = null;
    function pick(v) {
      st.mat = v;
      st.swapK = 0;
      const d = DATA[v];
      $('m1-free').textContent = d.free;
      $('m1-bond').textContent = d.bond;
      $('m1-beh').textContent = d.beh;
      fillProse($('m1-text'), d.text);
      $('m1-sci').textContent = d.sci;
      $('m1-tg').hidden = v !== 'si';
      const chips = $('m1-chips');
      chips.textContent = '';
      d.chips.forEach(([s, z, nm, cl]) => {
        const e = document.createElement('div');
        e.className = 'el ' + cl;
        e.innerHTML = '<div class="z"></div><div class="s"></div><div class="nm"></div><div class="cl"></div>';
        e.children[0].textContent = z;
        e.children[1].textContent = s;
        e.children[2].textContent = nm;
        e.children[3].textContent = cl === 'metal' ? 'Metal' : cl === 'ametal' ? 'Ametal' : 'Yarı metal';
        chips.appendChild(e);
      });
      if (KG.active === 1) KG.refreshNote();
    }
    M.select = v => { if (setMatSeg) setMatSeg(v); pick(v); };
    M.panelInit = () => {
      setMatSeg = U.segGroup($('m1-mat'), pick);
      const vb = $('m1-volt');
      vb.addEventListener('click', () => { st.volt = !st.volt; toggleBtn(vb, st.volt, 'Gerilimi kaldır', 'Gerilim uygula'); });
      const tr = $('m1-temp'), to = $('m1-to');
      const tUpd = () => { st.temp = +tr.value; to.textContent = Math.round(-40 + st.temp * 2) + ' °C'; };
      tr.addEventListener('input', tUpd);
      tUpd();
      pick('cu');
    };

    M.build = function () {
      const scene = (M.scene = new THREE.Scene());
      U.keyLight(scene, { pos: [5, 12, 9], size: 11 });
      scene.add(U.makeFloor(32, -3.5));
      const V3 = U.V3;
      const sph = new THREE.SphereGeometry(1, 22, 16), sphLo = new THREE.SphereGeometry(1, 10, 8);
      const cylG = new THREE.CylinderGeometry(1, 1, 1, 10, 1, false);
      const eMat = new THREE.MeshBasicMaterial({ color: 0x8EA6F2, toneMapped: false });
      const XH = 7.4, YH = 1.95, ZH = 1.95;
      const p2 = V3(), tmp = V3();

      const plateMat = new THREE.MeshStandardMaterial({ color: 0xbfc4cc, metalness: 1, roughness: 0.4 });
      const pl = new THREE.Mesh(new THREE.BoxGeometry(0.12, 5.6, 5.6), plateMat);
      pl.position.x = -8.3; pl.castShadow = true;
      const pr = pl.clone(); pr.position.x = 8.3;
      scene.add(pl, pr);
      const arrMat = new THREE.MeshBasicMaterial({ color: 0xE39A6C, toneMapped: false, transparent: true, opacity: 0 });
      const arrow = new THREE.Group();
      const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 4.6, 12), arrMat); shaft.rotation.z = Math.PI / 2;
      const head = new THREE.Mesh(new THREE.ConeGeometry(0.13, 0.42, 20), arrMat); head.rotation.z = Math.PI / 2; head.position.x = -2.5;
      arrow.add(shaft, head); arrow.position.y = 3.25;
      scene.add(arrow);

      /* copper */
      const cu = new THREE.Group(); scene.add(cu);
      const ions = [], d = 0.74;
      for (let i = 0; i <= 20; i++) for (let j = 0; j <= 5; j++) for (let k = 0; k <= 5; k++) { if ((i + j + k) & 1) continue; ions.push(V3((i - 10) * d, (j - 2.5) * d, (k - 2.5) * d)); }
      const ionMesh = new THREE.InstancedMesh(sph, new THREE.MeshStandardMaterial({ color: 0xc97b4f, metalness: 1, roughness: 0.28 }), ions.length);
      ionMesh.castShadow = true;
      cu.add(ionMesh);
      const ionPh = ions.map(() => U.rnd(0, TAU));
      const NE = 440, eP = [], eV = [];
      for (let i = 0; i < NE; i++) { eP.push(V3(U.rnd(-XH, XH), U.rnd(-YH, YH), U.rnd(-ZH, ZH))); eV.push(U.randDir(V3()).multiplyScalar(U.rnd(1.2, 2))); }
      const eMesh = new THREE.InstancedMesh(sphLo, eMat, NE); cu.add(eMesh);
      let frontIon = ions[0];
      const fScore = p => p.z + p.y * 0.6 - Math.abs(p.x + 3) * 0.15;
      ions.forEach(p => { if (fScore(p) > fScore(frontIon)) frontIon = p; });
      function updCu(dt, t) {
        for (let i = 0; i < ions.length; i++) {
          const p = ions[i], ph = ionPh[i];
          p2.set(p.x + 0.03 * Math.sin(t * 9 + ph), p.y + 0.03 * Math.sin(t * 8.3 + ph * 1.3), p.z + 0.03 * Math.sin(t * 9.7 + ph * 0.7));
          U.setInst(ionMesh, i, p2, 0.22);
        }
        ionMesh.instanceMatrix.needsUpdate = true;
        const drift = st.voltK * 0.85;
        for (let i = 0; i < NE; i++) {
          const p = eP[i], v = eV[i];
          if (Math.random() < dt * 2.2) U.randDir(v).multiplyScalar(U.rnd(1.2, 2));
          p.x += (v.x - drift) * dt; p.y += v.y * dt; p.z += v.z * dt;
          if (p.y > YH) { p.y = YH; v.y = -Math.abs(v.y); } else if (p.y < -YH) { p.y = -YH; v.y = Math.abs(v.y); }
          if (p.z > ZH) { p.z = ZH; v.z = -Math.abs(v.z); } else if (p.z < -ZH) { p.z = -ZH; v.z = Math.abs(v.z); }
          if (p.x < -XH) p.x += 2 * XH; else if (p.x > XH) p.x -= 2 * XH;
          U.setInst(eMesh, i, p, 0.075);
        }
        eMesh.instanceMatrix.needsUpdate = true;
      }

      /* keratin */
      const ker = new THREE.Group(); scene.add(ker);
      const EL = { C: [0x50565f, 0.17], N: [0x4d6fd6, 0.16], O: [0xc8553f, 0.16], H: [0xe9e9e6, 0.095], S: [0xd9b23b, 0.2] };
      const atoms = { C: [], N: [], O: [], H: [], S: [] };
      const kb = [], kss = [], kAnch = [];
      const rd = a => V3(0, Math.sin(a), Math.cos(a));
      const mid = (a, b) => V3((a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2);
      const centers = [];
      [-1.1, 1.1].forEach(cy => [-1.85, 0, 1.85].forEach(cz => centers.push([cy, cz])));
      const chainsCA = [];
      centers.forEach(([cy, cz], ci) => {
        const R = 0.55, rise = 0.45, turn = (100 * Math.PI) / 180, ph0 = ci * 1.3;
        let prevC = null;
        const cas = [];
        for (let r = 0; r < 31; r++) {
          const x = -6.9 + r * rise, a = ph0 + r * turn;
          const at = (da, dx) => V3(x + dx, cy + R * Math.sin(a + da), cz + R * Math.cos(a + da));
          const N = at(0, 0), CA = at(0.58, 0.15), C = at(1.16, 0.3);
          atoms.N.push(N); atoms.C.push(CA, C); cas.push(CA);
          if (prevC) kb.push([prevC, N]);
          kb.push([N, CA], [CA, C]);
          const O = C.clone().add(V3(0.26, 0, 0)).addScaledVector(rd(a + 1.16), 0.12); atoms.O.push(O); kb.push([C, O]);
          const H = N.clone().add(V3(-0.19, 0, 0)).addScaledVector(rd(a), 0.08); atoms.H.push(H); kb.push([N, H]);
          const CB = CA.clone().addScaledVector(rd(a + 0.58), 0.28); atoms.C.push(CB); kb.push([CA, CB]);
          const HB = CB.clone().addScaledVector(rd(a + 0.58), 0.19).add(V3(0.07, 0, 0)); atoms.H.push(HB); kb.push([CB, HB]);
          kAnch.push(mid(N, CA), mid(CA, C), mid(C, O));
          prevC = C;
        }
        chainsCA.push(cas);
      });
      [[0, 1], [1, 2], [3, 4], [4, 5], [0, 3], [1, 4], [2, 5]].forEach(([ia, ib], pi) => {
        const A = centers[ia], B = centers[ib];
        const dir = V3(0, B[0] - A[0], B[1] - A[1]);
        const D = dir.length(); dir.divideScalar(D);
        [-4.6, 0.2, 4.8].forEach((x0, k) => {
          const x = x0 + ((pi * 0.7 + k * 0.4) % 1.4) - 0.7;
          const sA = V3(x, A[0], A[1]).addScaledVector(dir, D / 2 - 0.3);
          const sB = V3(x, B[0], B[1]).addScaledVector(dir, -(D / 2 - 0.3));
          atoms.S.push(sA, sB); kss.push([sA, sB]);
          [[sA, chainsCA[ia]], [sB, chainsCA[ib]]].forEach(([s, cas]) => {
            let best = cas[0], bd = 1e9;
            cas.forEach(c => { const dd = c.distanceToSquared(s); if (dd < bd) { bd = dd; best = c; } });
            kb.push([best, s]);
          });
        });
      });
      Object.keys(atoms).forEach(k => {
        const list = atoms[k];
        const im = new THREE.InstancedMesh(sph, new THREE.MeshStandardMaterial({ color: EL[k][0], roughness: 0.35, metalness: 0.05 }), list.length);
        list.forEach((p, i) => U.setInst(im, i, p, EL[k][1]));
        im.castShadow = true;
        ker.add(im);
      });
      const kbMesh = new THREE.InstancedMesh(cylG, new THREE.MeshStandardMaterial({ color: 0x9aa0aa, roughness: 0.45 }), kb.length);
      kb.forEach(([a, b], i) => kbMesh.setMatrixAt(i, U.bondMatrix(a, b, 0.045)));
      const ssMesh = new THREE.InstancedMesh(cylG, new THREE.MeshStandardMaterial({ color: 0xd9b23b, roughness: 0.4 }), kss.length);
      kss.forEach(([a, b], i) => ssMesh.setMatrixAt(i, U.bondMatrix(a, b, 0.06)));
      ker.add(kbMesh, ssMesh);
      const kE = new THREE.InstancedMesh(sphLo, eMat, kAnch.length); ker.add(kE);
      function updKer(dt, t) {
        for (let i = 0; i < kAnch.length; i++) {
          const a = kAnch[i], ph = i * 2.3;
          p2.set(a.x + 0.045 * Math.sin(t * 6 + ph) - 0.085 * st.voltK, a.y + 0.045 * Math.sin(t * 5.3 + ph * 1.7), a.z + 0.045 * Math.cos(t * 5.9 + ph));
          U.setInst(kE, i, p2, 0.05);
        }
        kE.instanceMatrix.needsUpdate = true;
      }

      /* silicon */
      const si = new THREE.Group(); scene.add(si);
      const A = 1.9, siAtoms = [];
      const basis = [[0, 0, 0], [0, 0.5, 0.5], [0.5, 0, 0.5], [0.5, 0.5, 0]];
      for (let cx = -5; cx < 5; cx++) for (let cy = -2; cy < 2; cy++) for (let cz = -2; cz < 2; cz++) for (const b of basis) for (const o of [0, 0.25]) {
        const p = V3((cx + b[0] + o) * A, (cy + b[1] + o) * A, (cz + b[2] + o) * A);
        if (Math.abs(p.x) <= 7.4 && Math.abs(p.y) <= 2.0 && Math.abs(p.z) <= 2.0) siAtoms.push(p);
      }
      const bl2 = Math.pow((A * Math.sqrt(3)) / 4, 2);
      const sBonds = [], atomBonds = siAtoms.map(() => []);
      for (let i = 0; i < siAtoms.length; i++) for (let j = i + 1; j < siAtoms.length; j++) {
        if (Math.abs(siAtoms[i].distanceToSquared(siAtoms[j]) - bl2) < 0.05) { atomBonds[i].push(sBonds.length); atomBonds[j].push(sBonds.length); sBonds.push([i, j]); }
      }
      const nb = sBonds.length;
      const bMid = sBonds.map(([i, j]) => mid(siAtoms[i], siAtoms[j]));
      const bDir = sBonds.map(([i, j]) => siAtoms[j].clone().sub(siAtoms[i]).normalize());
      const bNb = sBonds.map((b, bi) => { const s = new Set(atomBonds[b[0]].concat(atomBonds[b[1]])); s.delete(bi); return Array.from(s); });
      const siMesh = new THREE.InstancedMesh(sph, new THREE.MeshStandardMaterial({ color: 0x8790a0, metalness: 0.55, roughness: 0.3 }), siAtoms.length);
      siAtoms.forEach((p, i) => U.setInst(siMesh, i, p, 0.22));
      siMesh.castShadow = true;
      const sbMesh = new THREE.InstancedMesh(cylG, new THREE.MeshStandardMaterial({ color: 0x5d6676, roughness: 0.5 }), nb);
      sBonds.forEach(([i, j], k) => sbMesh.setMatrixAt(k, U.bondMatrix(siAtoms[i], siAtoms[j], 0.05)));
      si.add(siMesh, sbMesh);
      const bondE = new Uint8Array(nb).fill(2);
      const bE = new THREE.InstancedMesh(sphLo, eMat, nb * 2); si.add(bE);
      const holes = [], free = [];
      const fMesh = new THREE.InstancedMesh(sphLo, eMat, 90); fMesh.count = 0; si.add(fMesh);
      const hMesh = new THREE.InstancedMesh(new THREE.TorusGeometry(1, 0.2, 8, 24), new THREE.MeshBasicMaterial({ color: 0xE39A6C, toneMapped: false }), 90); hMesh.count = 0; si.add(hMesh);
      function createPair() {
        for (let tries = 0; tries < 30; tries++) {
          const b = Math.floor(Math.random() * nb);
          if (bondE[b] === 2) { bondE[b] = 1; holes.push({ b, tm: U.rnd(0.2, 0.5) }); free.push({ p: bMid[b].clone(), v: U.randDir(V3()).multiplyScalar(U.rnd(0.9, 1.4)) }); return; }
        }
      }
      function recombine() { if (!holes.length || !free.length) return; const h = holes.pop(); bondE[h.b] = 2; free.pop(); }
      const target = () => { const tt = st.temp / 100; return Math.round(2 + (56 * (Math.exp(3.2 * tt) - 1)) / (Math.exp(3.2) - 1)); };
      function updSi(dt, t) {
        const tg = target();
        let guard = 0;
        while (free.length < tg && guard++ < 3) createPair();
        if (free.length > tg) recombine();
        for (const h of holes) {
          h.tm -= dt;
          if (h.tm > 0) continue;
          h.tm = U.rnd(0.22, 0.55);
          if (st.voltK > 0.5 && bMid[h.b].x > 6.4) {
            for (let tries = 0; tries < 30; tries++) { const nbI = Math.floor(Math.random() * nb); if (bondE[nbI] === 2 && bMid[nbI].x < -6.2) { bondE[h.b] = 2; bondE[nbI] = 1; h.b = nbI; break; } }
            continue;
          }
          const nbs = bNb[h.b].filter(x => bondE[x] === 2);
          if (!nbs.length) continue;
          let pk = nbs[Math.floor(Math.random() * nbs.length)];
          if (st.voltK > 0.3) {
            let tot = 0;
            const w = nbs.map(x => { const v = Math.exp(2.4 * st.voltK * (bMid[x].x - bMid[h.b].x)); tot += v; return v; });
            let r = Math.random() * tot;
            for (let i = 0; i < nbs.length; i++) { r -= w[i]; if (r <= 0) { pk = nbs[i]; break; } }
          }
          bondE[h.b] = 2; bondE[pk] = 1; h.b = pk;
        }
        for (let i = 0; i < free.length; i++) {
          const f = free[i], p = f.p, v = f.v;
          if (Math.random() < dt * 2) U.randDir(v).multiplyScalar(U.rnd(0.9, 1.4));
          p.x += (v.x - 0.75 * st.voltK) * dt; p.y += v.y * dt; p.z += v.z * dt;
          if (p.y > YH) { p.y = YH; v.y = -Math.abs(v.y); } else if (p.y < -YH) { p.y = -YH; v.y = Math.abs(v.y); }
          if (p.z > ZH) { p.z = ZH; v.z = -Math.abs(v.z); } else if (p.z < -ZH) { p.z = -ZH; v.z = Math.abs(v.z); }
          if (p.x < -XH) p.x += 2 * XH; else if (p.x > XH) p.x -= 2 * XH;
          U.setInst(fMesh, i, p, 0.085);
        }
        fMesh.count = free.length;
        fMesh.instanceMatrix.needsUpdate = true;
        for (let b = 0; b < nb; b++) {
          const m = bMid[b], dd = bDir[b];
          for (let k = 0; k < 2; k++) {
            const idx = 2 * b + k;
            if (k === 1 && bondE[b] === 1) { U.setInst(bE, idx, m, 0); continue; }
            const sg = k ? 1 : -1, ph = b * 1.7 + k * 2.1;
            p2.set(m.x + dd.x * 0.12 * sg + 0.025 * Math.sin(t * 7 + ph) - 0.04 * st.voltK, m.y + dd.y * 0.12 * sg + 0.025 * Math.sin(t * 6.1 + ph * 1.3), m.z + dd.z * 0.12 * sg + 0.025 * Math.cos(t * 6.7 + ph));
            U.setInst(bE, idx, p2, 0.055);
          }
        }
        bE.instanceMatrix.needsUpdate = true;
        for (let i = 0; i < holes.length; i++) {
          const b = holes[i].b;
          p2.copy(bMid[b]).addScaledVector(bDir[b], 0.12);
          U.setInst(hMesh, i, p2, 0.085, KG.camera.quaternion);
        }
        hMesh.count = holes.length;
        hMesh.instanceMatrix.needsUpdate = true;
      }
      let siFront = siAtoms[0];
      siAtoms.forEach(p => { if (p.z + p.y * 0.6 - Math.abs(p.x - 3) * 0.15 > siFront.z + siFront.y * 0.6 - Math.abs(siFront.x - 3) * 0.15) siFront = p; });
      let ssFront = kss[0][0];
      kss.forEach(([a]) => { if (a.y > ssFront.y - 0.01 && a.z > ssFront.z) ssFront = a; });

      M.update = (dt, t) => {
        st.voltK = U.approach(st.voltK, st.volt ? 1 : 0, dt * 2.2);
        st.swapK = U.approach(st.swapK, 1, dt * 2.5);
        cu.visible = st.mat === 'cu'; ker.visible = st.mat === 'ker'; si.visible = st.mat === 'si';
        (st.mat === 'cu' ? cu : st.mat === 'ker' ? ker : si).scale.setScalar(0.94 + 0.06 * U.easeOut(st.swapK));
        arrMat.opacity = st.voltK * (st.mat === 'ker' ? 0 : 0.95);
        arrow.visible = arrMat.opacity > 0.01;
        if (st.mat === 'cu') updCu(dt, t); else if (st.mat === 'ker') updKer(dt, t); else updSi(dt, t);
      };
      M.labels = [
        { text: 'Cu iyonu (kafes)', pos: frontIon, vis: () => st.mat === 'cu' },
        { text: 'Serbest elektronlar', pos: V3(2.8, -0.9, 2.0), vis: () => st.mat === 'cu' },
        { text: 'Keratin zinciri (sarmal)', pos: V3(-4, 1.75, 1.85), vis: () => st.mat === 'ker' },
        { text: 'S–S köprüsü', pos: ssFront, vis: () => st.mat === 'ker' },
        { text: 'Bağlı elektronlar', pos: kAnch[kAnch.length - 40], vis: () => st.mat === 'ker' },
        { text: 'Si atomu', pos: siFront, vis: () => st.mat === 'si' },
        { text: 'Hol (boşluk)', pos: () => holes.length ? tmp.copy(bMid[holes[0].b]).addScaledVector(bDir[holes[0].b], 0.12) : null, vis: () => st.mat === 'si' && holes.length > 0 },
        { text: '+ kutup', pos: V3(-8.3, 3.0, 0), vis: () => st.voltK > 0.5 },
        { text: '− kutup', pos: V3(8.3, 3.0, 0), vis: () => st.voltK > 0.5 },
        { text: 'Elektronların ortak yönü', pos: V3(0, 3.55, 0), flat: true, vis: () => st.voltK > 0.5 && st.mat !== 'ker' },
        { text: 'Elektronlar yalnızca yerinde kayar, akmaz', pos: V3(0, 3.0, 0), flat: true, vis: () => st.voltK > 0.5 && st.mat === 'ker' }
      ];
    };
    return M;
  });

  /* =====================================================================
     02 · Kablonun İçi
     ===================================================================== */
  KG.register(2, function () {
    const st = { mode: 'dc', on: false, onK: 0, pulseT: 0, phase: 0 };
    const M = { kicker: 'Modül 02', title: 'Kablonun İçi', showWave: true, home: { p: [2.4, 3.3, 10.6], t: [2.6, 0.1, 0] }, from: [-12, 9, 23], lim: { min: 3.5, max: 32, maxPolar: Math.PI * 0.62 }, st };
    M.note = () => st.mode === 'dc'
      ? 'Ölçek: 1 birim = 1 mm. Elektronların sürüklenmesi yaklaşık 12 kat hızlandırıldı; enerji dalgası yaklaşık 4 milyar kat yavaşlatıldı. Isıl hareket semboliktir.'
      : 'Ölçek: 1 birim = 1 mm. Görüntü 100 kat ağır çekimdir. Salınım genişliği büyütüldü; gerçekte yaklaşık 0,2 µm.';
    const TXT = {
      dc: ['Doğru akımda elektrik alanı hep aynı yönü gösterir. Pil, batarya, güneş paneli ve telefonun, bilgisayarın içindeki devreler doğru akımla çalışır.'],
      ac: ['Alternatif akımda alanın yönü düzenli olarak tersine döner. Türkiye’de prizdeki gerilim 230 V, frekansı 50 Hz’dir: yön saniyede 100 kez değişir. Elektrik santralden evlere alternatif akımla taşınır, çünkü transformatörler gerilimi kolayca yükseltip düşürebilir.',
        'Şarj aletinin görevi, prizdeki alternatif akımı telefonun kullandığı doğru akıma çevirmektir.']
    };
    function status() {
      const s = $('m2-status');
      s.textContent = !st.on ? 'Devre açık: kablo boyunca elektrik alanı yok. Elektronlar yalnızca rastgele ısıl hareket yapıyor.'
        : st.mode === 'dc' ? 'Devre tamam: alan kablo boyunca yayıldı. Bütün elektronlar aynı anda, çok yavaş ve tek yönde sürükleniyor.'
        : 'Devre tamam: alanın yönü saniyede 100 kez değişiyor. Elektronlar ilerlemiyor, yerinde ileri geri salınıyor.';
      $('m2-r3t').textContent = st.mode === 'dc' ? 'Yön' : 'Yön değişimi';
      $('m2-r3').textContent = st.mode === 'dc' ? 'Sabit' : '100 kez/s';
      fillProse($('m2-text'), TXT[st.mode]);
      if (KG.active === 2) KG.refreshNote();
    }
    M.panelInit = () => {
      U.segGroup($('m2-mode'), v => { st.mode = v; if (st.on) st.pulseT = 0; status(); });
      const b = $('m2-on');
      b.addEventListener('click', () => { st.on = !st.on; st.pulseT = 0; toggleBtn(b, st.on, 'Devreyi aç', 'Devreyi tamamla'); status(); });
      status();
    };

    M.build = function () {
      const scene = (M.scene = new THREE.Scene());
      U.keyLight(scene, { pos: [3, 10, 8], size: 13 });
      scene.add(U.makeFloor(40, -2.6));
      const V3 = U.V3;
      const X0 = -20, XS = -7, XI = -3, X1 = 9, rC = 0.69, rI = 1.39, rS = 2.05;
      const tubeX = (r, x0, x1, mat, th0, thl) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, x1 - x0, 96, 1, true, th0 || 0, thl || TAU), mat); m.rotation.z = Math.PI / 2; m.position.x = (x0 + x1) / 2; m.castShadow = true; m.receiveShadow = true; return m; };
      const capX = (r0, r1, x, mat) => { const m = new THREE.Mesh(r0 > 0 ? new THREE.RingGeometry(r0, r1, 96) : new THREE.CircleGeometry(r1, 96), mat); m.rotation.y = Math.PI / 2; m.position.x = x; return m; };
      const sheath = new THREE.MeshPhysicalMaterial({ color: 0xe7e6e1, roughness: 0.55, clearcoat: 0.3, clearcoatRoughness: 0.5, side: THREE.DoubleSide });
      const ins = new THREE.MeshPhysicalMaterial({ color: 0x7a4a2c, roughness: 0.38, clearcoat: 0.5, clearcoatRoughness: 0.25, side: THREE.DoubleSide });
      const cuMat = new THREE.MeshStandardMaterial({ color: 0xc8794e, metalness: 1, roughness: 0.3, side: THREE.DoubleSide });
      const cuCut = new THREE.MeshStandardMaterial({ color: 0xd99572, metalness: 1, roughness: 0.45, side: THREE.DoubleSide });
      scene.add(tubeX(rS, X0, XS, sheath), capX(rI, rS, XS, sheath), capX(rI, rS, X0, sheath));
      scene.add(tubeX(rI, X0, XI, ins), capX(rC, rI, XI, ins));
      const thc = Math.PI / 6;
      scene.add(tubeX(rC, XI, X1, cuMat, thc + 0.3 * Math.PI, 1.4 * Math.PI));
      scene.add(capX(0, rC, XI, cuCut), capX(0, rC, X1, cuCut));
      const core = new THREE.Mesh(new THREE.CylinderGeometry(rC * 0.985, rC * 0.985, X1 - XI, 64, 1, true), new THREE.MeshStandardMaterial({ color: 0xd38a5e, metalness: 0.6, roughness: 0.35, transparent: true, opacity: 0.16, depthWrite: false }));
      core.rotation.z = Math.PI / 2; core.position.x = (XI + X1) / 2;
      scene.add(core);

      const NI = 900, ip = new Float32Array(NI * 3);
      for (let i = 0; i < NI; i++) { const r = 0.62 * Math.sqrt(Math.random()), a = Math.random() * TAU; ip.set([U.rnd(XI, X1), Math.cos(a) * r, Math.sin(a) * r], i * 3); }
      const ig = new THREE.BufferGeometry(); ig.setAttribute('position', new THREE.BufferAttribute(ip, 3));
      scene.add(new THREE.Points(ig, new THREE.PointsMaterial({ color: 0xE39A6C, size: 0.06, map: KG.dotTex, transparent: true, opacity: 0.45, depthWrite: false })));

      const NE = 650, eP = [], eV = [];
      for (let i = 0; i < NE; i++) { const r = 0.6 * Math.sqrt(Math.random()), a = Math.random() * TAU; eP.push(V3(U.rnd(XI, X1), Math.cos(a) * r, Math.sin(a) * r)); eV.push(U.randDir(V3()).multiplyScalar(U.rnd(0.25, 0.45))); }
      const eMesh = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 10, 8), new THREE.MeshBasicMaterial({ color: 0x8EA6F2, toneMapped: false }), NE);
      scene.add(eMesh);

      const arrMat = new THREE.MeshBasicMaterial({ color: 0xEEF0F3, toneMapped: false, transparent: true, opacity: 0.9 });
      const arrows = [];
      for (let i = 0; i < 7; i++) {
        const g = new THREE.Group();
        const sh = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.6, 8), arrMat); sh.rotation.z = Math.PI / 2; sh.position.x = -0.1;
        const hd = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.18, 12), arrMat); hd.rotation.z = -Math.PI / 2; hd.position.x = 0.29;
        g.add(sh, hd);
        g.position.x = -1.5 + i * 1.5;
        g.visible = false;
        scene.add(g);
        arrows.push(g);
      }
      const rings = [];
      for (let k = 0; k < 4; k++) {
        const m = new THREE.Mesh(new THREE.TorusGeometry(1, 0.025, 8, 120), new THREE.MeshBasicMaterial({ color: 0x8EA6F2, toneMapped: false, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
        m.rotation.y = Math.PI / 2;
        m.visible = false;
        scene.add(m);
        rings.push(m);
      }

      const wv = KG.dom.waveCv;
      function drawInset() {
        const g = wv.getContext('2d'), w = wv.width, h = wv.height, d = KG.DPR;
        if (!w || !h) return;
        g.clearRect(0, 0, w, h);
        const padL = 14 * d, padR = 14 * d, top = 34 * d, bot = h - 16 * d, mid = (top + bot) / 2, amp = (bot - top) * 0.42;
        g.strokeStyle = 'rgba(154,163,178,.25)'; g.lineWidth = d;
        g.beginPath(); g.moveTo(padL, mid); g.lineTo(w - padR, mid); g.stroke();
        g.font = '500 ' + 11 * d + 'px ' + U.MONO; g.textBaseline = 'top';
        g.fillStyle = '#9AA3B2'; g.textAlign = 'left'; g.fillText('GERİLİM · zaman →', padL, 12 * d);
        g.textAlign = 'right'; g.fillStyle = '#EEF0F3';
        g.fillText(!st.on ? 'Devre açık' : st.mode === 'dc' ? 'DC · tek yön' : 'AC · 230 V · 50 Hz', w - padR, 12 * d);
        g.strokeStyle = '#8EA6F2'; g.lineWidth = 2 * d; g.beginPath();
        const n = 140;
        for (let i = 0; i <= n; i++) {
          const x = padL + ((w - padL - padR) * i) / n;
          const v = st.mode === 'dc' ? st.onK * 0.8 : Math.sin(st.phase - ((n - i) / n) * TAU * 2) * st.onK;
          const y = mid - v * amp;
          if (i) g.lineTo(x, y); else g.moveTo(x, y);
        }
        g.stroke();
        const vNow = st.mode === 'dc' ? st.onK * 0.8 : Math.sin(st.phase) * st.onK;
        g.fillStyle = '#EEF0F3'; g.beginPath(); g.arc(w - padR, mid - vNow * amp, 3.5 * d, 0, TAU); g.fill();
      }

      const tmpP = V3();
      M.update = (dt) => {
        st.onK = U.approach(st.onK, st.on ? 1 : 0, dt * 2.5);
        if (st.on) st.pulseT += dt;
        if (st.mode === 'ac') st.phase += dt * TAU * 0.5;
        const prog = st.on ? U.clamp(st.pulseT / 0.6, 0, 1) : 0;
        const front = st.on ? U.lerp(X0, X1 + 1, prog) : X0 - 10;
        const acOff = st.mode === 'ac' ? 0.55 * st.onK * Math.cos(st.phase) : 0;
        for (let i = 0; i < NE; i++) {
          const p = eP[i], v = eV[i];
          if (Math.random() < dt * 3) U.randDir(v).multiplyScalar(U.rnd(0.25, 0.45));
          p.addScaledVector(v, dt);
          const rr = Math.hypot(p.y, p.z);
          if (rr > 0.6) { p.y *= 0.6 / rr; p.z *= 0.6 / rr; v.y = -v.y; v.z = -v.z; }
          const active = p.x < front;
          if (st.mode === 'dc' && st.on && active) p.x -= 0.6 * st.onK * dt;
          if (p.x < XI) p.x += X1 - XI; else if (p.x > X1) p.x -= X1 - XI;
          const dx = p.x + (active ? acOff : 0);
          tmpP.set(dx, p.y, p.z);
          U.setInst(eMesh, i, tmpP, dx < XI + 0.03 || dx > X1 - 0.03 ? 0 : 0.045);
        }
        eMesh.instanceMatrix.needsUpdate = true;
        const sVal = !st.on ? 0 : st.mode === 'dc' ? st.onK : Math.sin(st.phase) * st.onK;
        arrows.forEach(a => { const v = a.position.x < front ? sVal : 0; a.visible = Math.abs(v) > 0.03; a.scale.x = v; });
        const fade = 1 - U.clamp((st.pulseT - 0.6) / 0.3, 0, 1);
        rings.forEach((m, k) => {
          const x = front - k * 0.7;
          const ok = st.on && st.pulseT < 0.9 && x > X0 && x < X1 + 0.2;
          m.visible = ok;
          if (!ok) return;
          m.position.x = x;
          m.scale.setScalar((x < XS ? rS : x < XI ? rI : rC) + 0.14);
          m.material.opacity = (1 - k * 0.27) * fade;
        });
        drawInset();
      };
      M.labels = [
        { text: 'Dış kılıf (PVC)', pos: V3(-12, rS, 0) },
        { text: 'Yalıtım', pos: V3(-5.2, rI * 0.72, rI * 0.69) },
        { text: 'Bakır iletken', pos: V3(7.6, rC * 0.95, 0.15) },
        { text: 'Elektrik alanı (E)', pos: V3(3, 0, 0), vis: () => st.on && st.onK > 0.5 },
        { text: 'Enerji dalgası', pos: () => tmpP.set(U.lerp(X0, X1 + 1, U.clamp(st.pulseT / 0.6, 0, 1)), rS + 0.3, 0), vis: () => st.on && st.pulseT < 0.6 }
      ];
    };
    return M;
  });

  /* =====================================================================
     03 · Pilin İçi
     ===================================================================== */
  KG.register(3, function () {
    const st = { on: false, R: 1, k: 0 };
    const M = { kicker: 'Modül 03', title: 'Pilin İçi', home: { p: [0.4, 5.6, 12.5], t: [0, 3.0, 0] }, from: [-9, 11, 22], lim: { min: 5, max: 26, maxPolar: Math.PI * 0.47 }, st };
    M.note = () => 'Daniell hücresi. İyonlar ve elektronlar ölçekli değildir; tepkime hızlandırılmıştır.';
    function status() {
      const s = $('m3-status');
      const pct = Math.round(st.R * 100);
      $('m3-ro').textContent = '%' + pct;
      $('m3-bar').style.width = pct + '%';
      $('m3-meter').setAttribute('aria-valuenow', String(pct));
      const txt = st.R <= 0 ? 'Tepkimeye girecek madde tükendi. Elektronlar hâlâ yerinde; onları itecek kimyasal enerji kalmadı.'
        : st.on ? 'Tepkime sürüyor: çinko çözünüyor, bakır birikiyor, elektronlar dış devreden akıyor.'
        : 'Devre açık: elektronların dolaşacağı bir yol olmadığı için tepkime başlamıyor.';
      if (s.textContent !== txt) s.textContent = txt;
      s.classList.toggle('warn', st.R <= 0);
    }
    M.panelInit = () => {
      const b = $('m3-on');
      b.addEventListener('click', () => { st.on = !st.on; toggleBtn(b, st.on, 'Devreyi aç', 'Devreyi tamamla'); status(); });
      $('m3-reset').addEventListener('click', () => { st.R = 1; status(); if (M.resetVisual) M.resetVisual(); });
      status();
    };
    M.build = function () {
      const scene = (M.scene = new THREE.Scene());
      U.keyLight(scene, { pos: [-5, 12, 8], size: 10 });
      scene.add(U.makeFloor(30, 0));
      const V3 = U.V3;
      const prof = [[0, 0], [1.7, 0], [1.8, 0.08], [1.8, 3.55], [1.9, 3.66], [1.84, 3.7], [1.74, 3.58], [1.74, 0.14], [0, 0.14]].map(p => new THREE.Vector2(p[0], p[1]));
      const bGeo = new THREE.LatheGeometry(prof, 72);
      const glass = new THREE.MeshPhysicalMaterial({ color: 0xffffff, metalness: 0, roughness: 0.05, transparent: true, opacity: 0.2, clearcoat: 1, clearcoatRoughness: 0.04, side: THREE.DoubleSide, depthWrite: false, envMapIntensity: 1.4 });
      const XL = -3.2, XR = 3.2;
      [XL, XR].forEach(x => { const b = new THREE.Mesh(bGeo, glass); b.position.x = x; b.renderOrder = 3; scene.add(b); });
      const liqGeo = new THREE.CylinderGeometry(1.72, 1.72, 2.7, 72);
      const znLiq = new THREE.MeshStandardMaterial({ color: 0xcfd8e3, transparent: true, opacity: 0.2, roughness: 0.1, depthWrite: false });
      const cuLiq = new THREE.MeshStandardMaterial({ color: 0x2a6fd0, transparent: true, opacity: 0.55, roughness: 0.1, depthWrite: false });
      const lL = new THREE.Mesh(liqGeo, znLiq); lL.position.set(XL, 1.49, 0); lL.renderOrder = 1;
      const lR = new THREE.Mesh(liqGeo, cuLiq); lR.position.set(XR, 1.49, 0); lR.renderOrder = 1;
      scene.add(lL, lR);
      const blue = new THREE.Color(0x2a6fd0), pale = new THREE.Color(0xbfd3ea);
      const zn = new THREE.Mesh(new THREE.BoxGeometry(0.9, 4.0, 0.12), new THREE.MeshStandardMaterial({ color: 0xb9bec6, metalness: 1, roughness: 0.45 }));
      zn.position.set(XL, 2.5, 0); zn.castShadow = true;
      const cuE = new THREE.Mesh(new THREE.BoxGeometry(0.9, 4.0, 0.12), new THREE.MeshStandardMaterial({ color: 0xc87b52, metalness: 1, roughness: 0.3 }));
      cuE.position.set(XR, 2.5, 0); cuE.castShadow = true;
      scene.add(zn, cuE);
      const clipMat = new THREE.MeshStandardMaterial({ color: 0x2a2e36, roughness: 0.5, metalness: 0.3 });
      [XL, XR].forEach(x => { const c = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.45, 0.34), clipMat); c.position.set(x, 4.62, 0); c.castShadow = true; scene.add(c); });

      const wireMat = new THREE.MeshPhysicalMaterial({ color: 0x2b2f37, roughness: 0.4, clearcoat: 0.4 });
      const wL = U.curveFrom([V3(XL, 4.8, 0), V3(XL, 5.9, 0), V3(-0.75, 6.45, 0), V3(-0.2, 6.45, 0)], 0.5);
      const wR = U.curveFrom([V3(0.2, 6.45, 0), V3(0.75, 6.45, 0), V3(XR, 5.9, 0), V3(XR, 4.8, 0)], 0.5);
      scene.add(new THREE.Mesh(new THREE.TubeGeometry(wL, 80, 0.06, 10), wireMat), new THREE.Mesh(new THREE.TubeGeometry(wR, 80, 0.06, 10), wireMat));
      const base = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.34, 24), new THREE.MeshStandardMaterial({ color: 0xb8bcc4, metalness: 1, roughness: 0.35 }));
      base.position.set(0, 6.5, 0);
      const bulbG = new THREE.Mesh(new THREE.SphereGeometry(0.42, 32, 24), new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.04, transparent: true, opacity: 0.22, clearcoat: 1, depthWrite: false }));
      bulbG.position.set(0, 7.02, 0); bulbG.renderOrder = 4;
      const fil = [];
      for (let i = 0; i <= 40; i++) { const a = (i / 40) * TAU * 5; fil.push(V3(-0.15 + (0.3 * i) / 40, 7.0 + Math.sin(a) * 0.04, Math.cos(a) * 0.04)); }
      const filMat = new THREE.MeshStandardMaterial({ color: 0x553a22, emissive: 0xffa860, emissiveIntensity: 0 });
      scene.add(base, bulbG, new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(fil), 80, 0.008, 6), filMat));
      const bulbGlow = U.glow(0xffb070, 2.2, 0);
      bulbGlow.position.set(0, 7.0, 0);
      const bulbLight = new THREE.PointLight(0xffb070, 0, 8);
      bulbLight.position.set(0, 7.0, 0);
      scene.add(bulbGlow, bulbLight);

      const bridgeCurve = U.curveFrom([V3(-2.2, 1.0, -0.75), V3(-2.2, 4.6, -0.75), V3(2.2, 4.6, -0.75), V3(2.2, 1.0, -0.75)], 1.2);
      const bridge = new THREE.Mesh(new THREE.TubeGeometry(bridgeCurve, 120, 0.26, 20), glass);
      bridge.renderOrder = 3;
      const gel = new THREE.Mesh(new THREE.TubeGeometry(bridgeCurve, 120, 0.2, 16), new THREE.MeshStandardMaterial({ color: 0xe8e4d8, transparent: true, opacity: 0.22, depthWrite: false }));
      gel.renderOrder = 2;
      scene.add(bridge, gel);
      [V3(-2.2, 1.05, -0.75), V3(2.2, 1.05, -0.75)].forEach(p => { const c = new THREE.Mesh(new THREE.CylinderGeometry(0.21, 0.21, 0.28, 16), new THREE.MeshStandardMaterial({ color: 0xf0eee8, roughness: 1 })); c.position.copy(p); scene.add(c); });

      const sphG = new THREE.SphereGeometry(1, 12, 10);
      const ePath = U.sampler(U.curveFrom([V3(XL, 1.4, 0.09), V3(XL, 4.75, 0.09), V3(XL, 5.9, 0), V3(-0.75, 6.45, 0), V3(-0.2, 6.45, 0), V3(-0.08, 7.0, 0), V3(0.08, 7.0, 0), V3(0.2, 6.45, 0), V3(0.75, 6.45, 0), V3(XR, 5.9, 0), V3(XR, 4.75, 0.09), V3(XR, 1.4, 0.09)], 0.35));
      const NE = 34, eU = Array.from({ length: NE }, (_, i) => i / NE);
      const eMesh = new THREE.InstancedMesh(sphG, new THREE.MeshBasicMaterial({ color: 0x8EA6F2, toneMapped: false }), NE);
      scene.add(eMesh);
      const mk = (n, col) => new THREE.InstancedMesh(sphG, new THREE.MeshStandardMaterial({ color: col, roughness: 0.3 }), n);
      const znI = mk(50, 0xdfe3ea), cuI = mk(56, 0x4f86e0), kI = mk(10, 0xb7bdc9), nI = mk(10, 0xE39A6C);
      scene.add(znI, cuI, kI, nI);
      const zns = Array.from({ length: 50 }, () => ({ alive: false, p: V3(), v: V3(), age: 0, life: 8 }));
      const cus = Array.from({ length: 56 }, () => ({ p: V3(), v: V3(), dep: 0, fade: 1 }));
      const randRight = p => { for (;;) { const x = U.rnd(-1.6, 1.6), z = U.rnd(-1.6, 1.6); if (x * x + z * z < 2.5 && Math.abs(z) > 0.3) return p.set(XR + x, U.rnd(0.3, 2.7), z); } };
      cus.forEach(c => { randRight(c.p); U.randDir(c.v).multiplyScalar(0.2); });
      const ks = Array.from({ length: 10 }, (_, i) => ({ u: i / 10 })), ns = Array.from({ length: 10 }, (_, i) => ({ u: (i + 0.5) / 10 }));
      let spawnAcc = 0;
      M.resetVisual = () => { zns.forEach(z => { z.alive = false; }); cus.forEach(c => { randRight(c.p); c.dep = 0; c.fade = 1; }); };
      const tmp = V3(), dirT = V3();
      const inBeaker = (p, cx) => { const dx = p.x - cx, r = Math.hypot(dx, p.z); if (r > 1.6) { p.x = cx + (dx * 1.6) / r; p.z *= 1.6 / r; } p.y = U.clamp(p.y, 0.25, 2.75); };
      M.update = (dt, t) => {
        st.k = U.approach(st.k, st.on && st.R > 0 ? 1 : 0, dt * 1.5);
        if (st.k > 0.05 && st.R > 0) { st.R = Math.max(0, st.R - dt * 0.0075 * st.k); status(); }
        cuLiq.color.copy(pale).lerp(blue, st.R);
        cuLiq.opacity = 0.28 + 0.27 * st.R;
        zn.scale.z = 0.55 + 0.45 * st.R;
        const glowK = st.k * (0.6 + 0.4 * Math.min(1, st.R * 4));
        filMat.emissiveIntensity = 1.6 * glowK;
        bulbGlow.material.opacity = 0.75 * glowK;
        bulbLight.intensity = 1.4 * glowK;
        for (let i = 0; i < NE; i++) { eU[i] = (eU[i] + (dt * 1.4 * st.k) / ePath.length) % 1; ePath.at(eU[i], tmp); U.setInst(eMesh, i, tmp, st.k > 0.02 ? 0.075 : 0.06); }
        eMesh.instanceMatrix.needsUpdate = true;
        spawnAcc += dt * 3 * st.k;
        while (spawnAcc >= 1) {
          spawnAcc -= 1;
          const z = zns.find(q => !q.alive);
          if (z) { const side = Math.random() < 0.5 ? -1 : 1; z.alive = true; z.age = 0; z.life = U.rnd(6, 9); z.p.set(XL + U.rnd(-0.42, 0.42), U.rnd(0.6, 2.7), side * 0.09); z.v.set(U.rnd(-0.15, 0.15), U.rnd(-0.05, 0.05), side * U.rnd(0.25, 0.45)); }
        }
        zns.forEach((z, i) => {
          if (!z.alive) { U.setInst(znI, i, z.p, 0); return; }
          z.age += dt;
          z.v.multiplyScalar(0.985).add(dirT.set(U.rnd(-0.4, 0.4), U.rnd(-0.4, 0.4), U.rnd(-0.4, 0.4)).multiplyScalar(dt));
          z.p.addScaledVector(z.v, dt);
          inBeaker(z.p, XL);
          const f = Math.min(1, z.age / 0.4) * Math.min(1, (z.life - z.age) / 1);
          if (z.age > z.life) z.alive = false;
          U.setInst(znI, i, z.p, 0.085 * Math.max(0, f));
        });
        cus.forEach((c, i) => {
          c.v.multiplyScalar(0.985).add(dirT.set(U.rnd(-0.35, 0.35), U.rnd(-0.35, 0.35), U.rnd(-0.35, 0.35)).multiplyScalar(dt));
          if (st.k > 0.05 && c.dep === 0) {
            tmp.set(U.clamp(c.p.x, XR - 0.42, XR + 0.42), U.clamp(c.p.y, 0.6, 2.7), c.p.z >= 0 ? 0.08 : -0.08);
            dirT.subVectors(tmp, c.p);
            const dist = dirT.length();
            if (dist < 0.12) c.dep = 0.001; else c.v.addScaledVector(dirT.divideScalar(dist), 0.6 * st.k * dt);
          }
          if (c.dep > 0) { c.dep += dt; if (c.dep > 0.35) { randRight(c.p); c.dep = 0; c.fade = 0; } }
          c.fade = Math.min(1, c.fade + dt * 1.5);
          c.p.addScaledVector(c.v, dt);
          inBeaker(c.p, XR);
          U.setInst(cuI, i, c.p, 0.085 * (c.dep > 0 ? Math.max(0, 1 - c.dep / 0.35) : c.fade) * (0.35 + 0.65 * st.R));
        });
        ks.forEach((q, i) => { q.u = (q.u + dt * 0.05 * st.k) % 1; bridgeCurve.getPointAt(q.u, tmp); tmp.x += Math.sin(t * 3 + i) * 0.05; U.setInst(kI, i, tmp, 0.06); });
        ns.forEach((q, i) => { q.u = (q.u - dt * 0.05 * st.k + 1) % 1; bridgeCurve.getPointAt(q.u, tmp); tmp.y += Math.sin(t * 2.6 + i) * 0.05; U.setInst(nI, i, tmp, 0.06); });
        [znI, cuI, kI, nI].forEach(m => { m.instanceMatrix.needsUpdate = true; });
      };
      M.labels = [
        { text: 'Çinko (Zn) · eksi uç', pos: V3(XL, 3.4, 0.1) },
        { text: 'Bakır (Cu) · artı uç', pos: V3(XR, 3.4, 0.1) },
        { text: 'ZnSO₄ çözeltisi', pos: V3(XL - 1.1, 0.9, 1.25) },
        { text: 'CuSO₄ çözeltisi', pos: V3(XR + 1.1, 0.9, 1.25) },
        { text: 'Tuz köprüsü', pos: V3(0, 4.85, -0.75) },
        { text: 'Elektronlar: dış devre', pos: V3(-1.9, 6.25, 0), vis: () => st.k > 0.3 },
        { text: 'Lamba', pos: V3(0, 7.45, 0) }
      ];
    };
    return M;
  });

  /* =====================================================================
     04 · Devre ve Ohm
     ===================================================================== */
  KG.register(4, function () {
    const st = { V: 5, R: 220, on: true, rev: false, damaged: false, I: 0, state: 'ok', b: 0 };
    const M = { kicker: 'Modül 04', title: 'Devre ve Ohm', home: { p: [0.5, 10.5, 15.5], t: [-0.5, 1, 0.5] }, from: [-14, 16, 28], lim: { min: 6, max: 34, maxPolar: Math.PI * 0.46 }, st };
    M.note = () => 'Bileşenler ölçekli değildir. Elektronların hızı görünür olsun diye büyütülmüştür.';
    const BAND = [['Siyah', '#1b1b1d'], ['Kahverengi', '#6e3b1f'], ['Kırmızı', '#c0281f'], ['Turuncu', '#e2701a'], ['Sarı', '#e4c21c'], ['Yeşil', '#2e8b45'], ['Mavi', '#2453c9'], ['Mor', '#7a3fb0'], ['Gri', '#8b8d92'], ['Beyaz', '#f1f1ee']];
    function bands(R) { let n = R, m = 0; while (n >= 100) { n /= 10; m++; } n = Math.round(n); return { d1: Math.floor(n / 10), d2: n % 10, m, n }; }
    function calc() {
      let I = 0, s;
      if (st.damaged) s = 'dead';
      else if (!st.on) s = 'open';
      else if (st.rev) s = 'rev';
      else if (st.V < 1.8) s = 'low';
      else { I = ((st.V - 1.8) / st.R) * 1000; s = I > 30 ? 'over' : I > 20 ? 'high' : 'ok'; }
      if (s === 'over') { st.damaged = true; s = 'dead'; I = 0; }
      st.I = I; st.state = s;
      $('m4-vo').textContent = U.nf(st.V, 1) + ' V';
      $('m4-ro').textContent = st.R + ' Ω';
      $('m4-rv').textContent = U.nf(st.V, 1) + ' V';
      $('m4-ri').textContent = U.nf(I, I < 10 ? 2 : 1) + ' mA';
      $('m4-rp').textContent = U.nf(st.V * I, 0) + ' mW';
      const msg = {
        ok: 'LED çalışıyor. Akım güvenli aralıkta.',
        high: 'Akım LED için üst sınıra yakın (20–30 mA).',
        low: 'Gerilim, LED’in iletmeye başlama eşiğinin (yaklaşık 1,8 V) altında.',
        rev: 'LED ters bağlı. LED bir diyottur; akımı yalnızca tek yönde geçirir.',
        open: 'Devre açık. Elektronların dolaşabileceği kapalı bir yol yok.',
        dead: 'Akım 30 mA’i aştı ve LED kalıcı hasar gördü. Hasarlı LED artık ışık vermez; devreyi yeniden kurmak için yeni bir LED takın.'
      }[s];
      const stEl = $('m4-status');
      stEl.textContent = msg;
      stEl.classList.toggle('warn', s === 'dead' || s === 'high');
      $('m4-new').hidden = !st.damaged;
      const b = bands(st.R), sup = U.sup(b.m);
      $('m4-code').textContent = BAND[b.d1][0] + ' · ' + BAND[b.d2][0] + ' · ' + BAND[b.m][0] + ' · Altın  →  ' + b.n + ' × 10' + sup + ' = ' + st.R + ' Ω';
      if (M.refresh3D) M.refresh3D();
    }
    M.panelInit = () => {
      const v = $('m4-v'), r = $('m4-r');
      v.addEventListener('input', () => { st.V = +v.value; calc(); });
      r.addEventListener('input', () => { st.R = +r.value; calc(); });
      const on = $('m4-on'), rev = $('m4-rev');
      on.addEventListener('click', () => { st.on = !st.on; toggleBtn(on, !st.on, 'Devreyi tamamla', 'Devreyi aç'); calc(); });
      rev.addEventListener('click', () => { st.rev = !st.rev; toggleBtn(rev, st.rev, 'LED’i düz çevir', 'LED’i ters çevir'); calc(); });
      $('m4-new').addEventListener('click', () => { st.damaged = false; calc(); });
      calc();
    };

    M.build = function () {
      const scene = (M.scene = new THREE.Scene());
      U.keyLight(scene, { pos: [-4, 14, 9], size: 16, map: 2048 });
      scene.add(U.makeFloor(40, -0.01));
      const V3 = U.V3, ZC = -0.55;
      const mc = document.createElement('canvas'); mc.width = mc.height = 512;
      const mg = mc.getContext('2d');
      mg.fillStyle = '#262c38'; mg.fillRect(0, 0, 512, 512);
      mg.strokeStyle = 'rgba(255,255,255,.035)'; mg.lineWidth = 1;
      for (let i = 0; i <= 512; i += 16) { mg.beginPath(); mg.moveTo(i, 0); mg.lineTo(i, 512); mg.stroke(); mg.beginPath(); mg.moveTo(0, i); mg.lineTo(512, i); mg.stroke(); }
      mg.strokeStyle = 'rgba(255,255,255,.075)'; mg.lineWidth = 2;
      for (let i = 0; i <= 512; i += 64) { mg.beginPath(); mg.moveTo(i, 0); mg.lineTo(i, 512); mg.stroke(); mg.beginPath(); mg.moveTo(0, i); mg.lineTo(512, i); mg.stroke(); }
      const matTex = U.canvasTex(mc); matTex.wrapS = matTex.wrapT = THREE.RepeatWrapping; matTex.repeat.set(5, 3.4);
      const mat = new THREE.Mesh(new THREE.PlaneGeometry(32, 21), new THREE.MeshStandardMaterial({ map: matTex, roughness: 0.85 }));
      mat.rotation.x = -Math.PI / 2; mat.position.y = 0.004; mat.receiveShadow = true;
      scene.add(mat);

      const body = new THREE.Mesh(new THREE.BoxGeometry(6, 3.4, 4.6), new THREE.MeshStandardMaterial({ color: 0x30353f, roughness: 0.45, metalness: 0.3 }));
      body.position.set(-10, 1.7, -0.5); body.castShadow = true; body.receiveShadow = true;
      scene.add(body);
      const pc = document.createElement('canvas'); pc.width = 1160; pc.height = 640;
      const pg = pc.getContext('2d');
      const pTex = U.canvasTex(pc);
      const panel = new THREE.Mesh(new THREE.PlaneGeometry(5.8, 3.2), new THREE.MeshStandardMaterial({ map: pTex, roughness: 0.5, metalness: 0.15 }));
      panel.position.set(-10, 1.7, 1.802);
      scene.add(panel);
      function drawPanel() {
        const g = pg, W = 1160, H = 640;
        g.fillStyle = '#2c313b'; g.fillRect(0, 0, W, H);
        g.strokeStyle = 'rgba(255,255,255,.06)'; g.lineWidth = 4; g.strokeRect(10, 10, W - 20, H - 20);
        U.rr(g, 40, 40, 700, 250, 18); g.fillStyle = '#0a0d12'; g.fill(); g.strokeStyle = '#3b4352'; g.lineWidth = 3; g.stroke();
        g.textBaseline = 'alphabetic'; g.textAlign = 'right';
        g.fillStyle = '#EEF0F3'; g.font = '500 150px ' + U.MONO; g.fillText(U.nf(st.V, 1), 600, 210);
        g.fillStyle = '#9AA3B2'; g.font = '500 64px ' + U.MONO; g.fillText('V', 690, 210);
        g.font = '400 40px ' + U.MONO; g.fillText(U.nf(st.I, 1) + ' mA', 690, 268);
        g.textAlign = 'center';
        g.font = '500 30px ' + U.SANS; g.fillStyle = '#9AA3B2'; g.fillText('GERİLİM', 1000, 300);
        for (let k = 0; k <= 12; k++) { const a = Math.PI * 0.75 + (k / 12) * Math.PI * 1.5; g.strokeStyle = 'rgba(238,240,243,.5)'; g.lineWidth = 3; g.beginPath(); g.moveTo(1000 + Math.cos(a) * 112, 170 + Math.sin(a) * 112); g.lineTo(1000 + Math.cos(a) * 126, 170 + Math.sin(a) * 126); g.stroke(); }
        g.font = '600 64px ' + U.SANS; g.fillStyle = '#EEF0F3'; g.fillText('−', 400, 405); g.fillText('+', 720, 405);
        g.font = '500 26px ' + U.MONO; g.fillStyle = '#9AA3B2'; g.fillText('ÇIKIŞ  0–12 V', 560, 590);
        pTex.needsUpdate = true;
      }
      M.redrawText = drawPanel;
      const knob = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.48, 0.35, 40), new THREE.MeshStandardMaterial({ color: 0xc9cdd3, metalness: 0.9, roughness: 0.3 }));
      knob.rotation.x = Math.PI / 2; knob.position.set(-7.9, 2.45, 1.98); knob.castShadow = true;
      scene.add(knob);
      const post = (x, col) => { const g = new THREE.Group(); const p = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.5, 24), new THREE.MeshPhysicalMaterial({ color: col, roughness: 0.35, clearcoat: 0.5 })); p.rotation.x = Math.PI / 2; g.add(p); g.position.set(x, 0.9, 2.05); scene.add(g); };
      post(-10.9, 0x1b1d22); post(-9.3, 0xb3261e);

      const board = new THREE.BoxGeometry(13, 0.8, 5.2);
      const bc = document.createElement('canvas'); bc.width = 1300; bc.height = 520;
      const bg = bc.getContext('2d');
      bg.fillStyle = '#ecebe6'; bg.fillRect(0, 0, 1300, 520);
      bg.fillStyle = '#d6d5cf'; bg.fillRect(0, 252, 1300, 16);
      bg.fillStyle = '#3a3d44';
      for (let x = 30; x < 1290; x += 20) {
        for (const y of [40, 60, 460, 480]) if (((x - 30) / 20) % 6 !== 5) bg.fillRect(x - 4, y - 4, 8, 8);
        for (let y = 130; y <= 230; y += 25) bg.fillRect(x - 4, y - 4, 8, 8);
        for (let y = 290; y <= 390; y += 25) bg.fillRect(x - 4, y - 4, 8, 8);
      }
      bg.fillStyle = '#c0392b'; bg.fillRect(20, 20, 1260, 4); bg.fillRect(20, 440, 1260, 4);
      bg.fillStyle = '#2343B0'; bg.fillRect(20, 76, 1260, 4); bg.fillRect(20, 496, 1260, 4);
      const bTop = new THREE.MeshStandardMaterial({ map: U.canvasTex(bc), roughness: 0.75 });
      const bSide = new THREE.MeshStandardMaterial({ color: 0xe3e2dc, roughness: 0.8 });
      const bb = new THREE.Mesh(board, [bSide, bSide, bTop, bSide, bSide, bSide]);
      bb.position.set(4, 0.4, 0); bb.castShadow = bb.receiveShadow = true;
      scene.add(bb);

      const sw = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.7, 1.1), new THREE.MeshStandardMaterial({ color: 0x23272f, roughness: 0.5 }));
      sw.position.set(0.4, 1.15, ZC); sw.castShadow = true;
      const lever = new THREE.Group();
      const lv = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.8, 16), new THREE.MeshStandardMaterial({ color: 0xd4d7dc, metalness: 1, roughness: 0.25 }));
      lv.position.y = 0.4; lv.castShadow = true;
      lever.add(lv);
      lever.position.set(0.4, 1.5, ZC);
      const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.12, 24), new THREE.MeshStandardMaterial({ color: 0xa9adb3, metalness: 1, roughness: 0.3 }));
      collar.position.set(0.4, 1.53, ZC);
      scene.add(sw, lever, collar);

      const rprof = [[0, -1.1], [0.26, -1.1], [0.34, -0.98], [0.34, -0.62], [0.29, -0.5], [0.29, 0.5], [0.34, 0.62], [0.34, 0.98], [0.26, 1.1], [0, 1.1]].map(p => new THREE.Vector2(p[0], p[1]));
      const res = new THREE.Mesh(new THREE.LatheGeometry(rprof, 48), new THREE.MeshStandardMaterial({ color: 0xd8c49b, roughness: 0.55 }));
      res.rotation.z = Math.PI / 2; res.position.set(4, 1.55, ZC); res.castShadow = true;
      scene.add(res);
      const bandMats = [0, 1, 2, 3].map(() => new THREE.MeshStandardMaterial({ color: 0x000000, roughness: 0.45 }));
      bandMats[3].color.set(0xc9a23a); bandMats[3].metalness = 0.8; bandMats[3].roughness = 0.35;
      [[-0.8, 0.348], [-0.3, 0.298], [0.05, 0.298], [0.8, 0.348]].forEach(([dx, r], i) => { const b = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 0.13, 40), bandMats[i]); b.rotation.z = Math.PI / 2; b.position.set(4 + dx, 1.55, ZC); scene.add(b); });
      const leadMat = new THREE.MeshStandardMaterial({ color: 0xc9ccd1, metalness: 1, roughness: 0.35 });
      [[V3(2.92, 1.55, ZC), V3(2.2, 1.55, ZC), V3(2.2, 0.8, ZC)], [V3(5.08, 1.55, ZC), V3(5.8, 1.55, ZC), V3(5.8, 0.8, ZC)]].forEach(p => scene.add(new THREE.Mesh(new THREE.TubeGeometry(U.curveFrom(p, 0.15), 40, 0.045, 8), leadMat)));

      const led = new THREE.Group();
      led.position.set(7.6, 0, ZC);
      [-0.2, 0.2].forEach(dx => { const l = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.3, 8), leadMat); l.position.set(dx, 1.43, 0); led.add(l); });
      const epoxy = new THREE.MeshPhysicalMaterial({ color: 0xc8241b, roughness: 0.15, metalness: 0, transparent: true, opacity: 0.74, clearcoat: 1, emissive: 0xff3020, emissiveIntensity: 0 });
      const flange = new THREE.Mesh(new THREE.CylinderGeometry(0.58, 0.58, 0.12, 40), epoxy); flange.position.y = 2.12;
      const bodyL = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.72, 40), epoxy); bodyL.position.y = 2.54;
      const dome = new THREE.Mesh(new THREE.SphereGeometry(0.5, 40, 20, 0, TAU, 0, Math.PI / 2), epoxy); dome.position.y = 2.9;
      const inner = new THREE.MeshStandardMaterial({ color: 0x8a8d93, metalness: 0.8, roughness: 0.35 });
      const anvil = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.35, 0.1), inner); anvil.position.set(0.12, 2.42, 0);
      const pst = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.4, 0.06), inner); pst.position.set(-0.14, 2.42, 0);
      led.add(flange, bodyL, dome, anvil, pst);
      [flange, bodyL, dome].forEach(m => { m.castShadow = true; });
      const ledGlow = U.glow(0xff3a2a, 3, 0); ledGlow.position.set(0, 2.75, 0);
      const ledLight = new THREE.PointLight(0xff3020, 0, 9); ledLight.position.set(0, 2.7, 0.2);
      led.add(ledGlow, ledLight);
      scene.add(led);

      const redPts = [V3(-9.3, 0.9, 2.3), V3(-9.3, 0.9, 2.75), V3(-9.3, 0.12, 3.15), V3(-2.3, 0.12, 3.15), V3(-1.0, 0.35, 2.95), V3(-1.0, 1.25, 2.6), V3(-1.0, 1.35, 0.2), V3(-1.0, 1.35, ZC), V3(-1.0, 0.8, ZC)];
      const blackPts = [V3(-10.9, 0.9, 2.3), V3(-10.9, 0.9, 2.95), V3(-10.9, 0.12, 3.75), V3(7.9, 0.12, 3.75), V3(8.6, 0.35, 3.1), V3(8.6, 1.25, 2.6), V3(8.6, 1.35, 0.4), V3(8.6, 1.35, ZC), V3(8.6, 0.8, ZC)];
      scene.add(new THREE.Mesh(new THREE.TubeGeometry(U.curveFrom(redPts, 0.5), 300, 0.11, 12), new THREE.MeshPhysicalMaterial({ color: 0xb3261e, roughness: 0.4, clearcoat: 0.4 })));
      scene.add(new THREE.Mesh(new THREE.TubeGeometry(U.curveFrom(blackPts, 0.5), 300, 0.11, 12), new THREE.MeshPhysicalMaterial({ color: 0x1d1f24, roughness: 0.42, clearcoat: 0.4 })));
      const boardPts = [V3(8.6, 0.85, ZC), V3(7.8, 0.85, ZC), V3(7.8, 2.0, ZC), V3(7.6, 2.45, ZC), V3(7.4, 2.0, ZC), V3(7.4, 0.85, ZC), V3(5.8, 0.85, ZC), V3(5.8, 1.55, ZC), V3(2.2, 1.55, ZC), V3(2.2, 0.85, ZC), V3(1.3, 0.85, ZC), V3(1.3, 1.15, ZC), V3(-0.5, 1.15, ZC), V3(-0.5, 0.85, ZC)];
      const path = U.sampler(U.curveFrom(blackPts.slice(0, -1).concat(boardPts, redPts.slice(0, -1).reverse()), 0.35), 1600);
      const NE = 90, eU = Array.from({ length: NE }, (_, i) => i / NE);
      const eMesh = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 10, 8), new THREE.MeshBasicMaterial({ color: 0x8EA6F2, toneMapped: false }), NE);
      scene.add(eMesh);

      M.refresh3D = () => {
        const b = bands(st.R);
        bandMats[0].color.set(BAND[b.d1][1]); bandMats[1].color.set(BAND[b.d2][1]); bandMats[2].color.set(BAND[b.m][1]);
        lever.rotation.z = st.on ? -0.42 : 0.42;
        led.rotation.y = st.rev ? Math.PI : 0;
        epoxy.color.set(st.damaged ? 0x3b2016 : 0xc8241b);
        epoxy.opacity = st.damaged ? 0.92 : 0.74;
        drawPanel();
      };
      M.refresh3D();
      const tmp = V3();
      M.update = (dt) => {
        const target = st.state === 'ok' || st.state === 'high' ? U.clamp(st.I / 20, 0, 1.25) : 0;
        st.b = U.approach(st.b, target, dt * 4);
        epoxy.emissiveIntensity = 1.8 * st.b;
        ledGlow.material.opacity = 0.85 * Math.min(1, st.b);
        ledGlow.scale.setScalar(2 + 2.5 * st.b);
        ledLight.intensity = 2.4 * st.b;
        const speed = st.I > 0 ? 0.6 + st.I * 0.09 : 0;
        for (let i = 0; i < NE; i++) { eU[i] = (eU[i] + (dt * Math.min(4, speed)) / path.length) % 1; path.at(eU[i], tmp); U.setInst(eMesh, i, tmp, 0.13); }
        eMesh.instanceMatrix.needsUpdate = true;
      };
      M.labels = [
        { text: 'Güç kaynağı', pos: V3(-10, 3.75, -0.5) },
        { text: 'Anahtar', pos: V3(0.4, 2.35, ZC) },
        { text: () => 'Direnç · ' + st.R + ' Ω', pos: V3(4, 2.1, ZC) },
        { text: () => st.damaged ? 'LED · hasarlı' : 'LED', pos: V3(7.6, 3.65, ZC) },
        { text: 'Elektron akışı', pos: V3(1, 0.24, 3.75), vis: () => st.I > 0 }
      ];
    };
    return M;
  });

  /* =====================================================================
     05 · Vücut ve Akım
     ===================================================================== */
  KG.register(5, function () {
    const SRC = [{ v: 1.5, name: '1,5 V pil' }, { v: 5, name: '5 V USB' }, { v: 12, name: '12 V akü' }, { v: 230, name: '230 V priz' }];
    const st = { src: 3, skin: 'dry', I: 115, R: 2000, ang: 150, vel: 0 };
    const M = { kicker: 'Modül 05', title: 'Vücut ve Akım', showEqn: true, home: { p: [0, 4.9, 15.2], t: [0, 4.4, 0] }, from: [8, 9, 26], lim: { min: 8, max: 28, maxPolar: Math.PI * 0.56, minPolar: Math.PI * 0.28, minAz: -1.0, maxAz: 1.0 }, st };
    M.note = () => 'Ölçek logaritmiktir: her büyük çizgi bir öncekinin 10 katıdır. Değerler IEC 60479-1 verilerinden yaklaşık olarak alınmıştır.';
    const fmtI = I => (I < 0.1 ? U.nf(I, 3) : I < 1 ? U.nf(I, 2) : I < 10 ? U.nf(I, 1) : U.nf(I, 0));
    const fmtR = R => (R >= 1000 ? U.nf(R / 1000, 0) + ' kΩ' : R + ' Ω');
    function calc() {
      const v = SRC[st.src].v;
      const R = v <= 50 ? (st.skin === 'dry' ? 100000 : 10000) : st.skin === 'dry' ? 2000 : 1000;
      const I = (v / R) * 1000;
      st.I = I; st.R = R;
      const z = I < 0.5 ? 0 : I < 10 ? 1 : I < 30 ? 2 : I < 50 ? 3 : 4;
      $('m5-v').textContent = U.nf(v, v % 1 ? 1 : 0) + ' V';
      $('m5-r').textContent = '≈ ' + fmtR(R);
      $('m5-i').textContent = '≈ ' + fmtI(I) + ' mA';
      $('m5-zones').querySelectorAll('li').forEach(li => li.setAttribute('aria-current', String(+li.dataset.z === z)));
      const msg = [
        'Akım ≈ ' + fmtI(I) + ' mA: hissetme eşiğinin altında.',
        'Akım ≈ ' + fmtI(I) + ' mA: hissedilebilir düzeyde.',
        'Akım ≈ ' + fmtI(I) + ' mA: bırakamama eşiğinin üzerinde.',
        'Akım ≈ ' + fmtI(I) + ' mA: solunumu etkileyebilecek düzeyde.',
        'Akım ≈ ' + fmtI(I) + ' mA, yani kalp ritmini bozabilecek seviyenin (≈ 50 mA) yaklaşık ' + U.nf(I / 50, 1) + ' katı. Bu bir tahmin değil, ölçülmüş verilerden çıkan sonuçtur: prizin içine hiçbir şey sokulmaz.'
      ][z];
      const s = $('m5-status');
      s.textContent = msg;
      s.classList.toggle('warn', z >= 3);
      $('eqn').textContent = 'I = V / R = ' + U.nf(v, v % 1 ? 1 : 0) + ' V / ' + fmtR(R) + ' ≈ ' + fmtI(I) + ' mA';
    }
    M.panelInit = () => {
      U.segGroup($('m5-src'), v => { st.src = +v; calc(); });
      U.segGroup($('m5-skin'), v => { st.skin = v; calc(); });
      calc();
    };
    M.enter = () => { st.ang = 150; st.vel = 0; calc(); };

    function drawDial(g, W, H) {
      const s = W / 10.4, cx = W / 2, cy = H / 2 + 2.4 * s, R = 5.0 * s;
      const ang = t => ((150 - t * 120) * Math.PI) / 180;
      const tOf = I => U.clamp((Math.log10(I) + 2) / 5, 0, 1);
      const pt = (t, r) => [cx + Math.cos(ang(t)) * r, cy - Math.sin(ang(t)) * r];
      g.fillStyle = '#ECEBE5'; g.fillRect(0, 0, W, H);
      const zones = [[0.01, 0.5, '#C5CAD3'], [0.5, 10, '#8FA2D9'], [10, 30, '#E2A576'], [30, 50, '#C8693A'], [50, 1000, '#9E3A2E']];
      g.lineWidth = 0.24 * s; g.lineCap = 'butt';
      zones.forEach(([a, b, c]) => { g.strokeStyle = c; g.beginPath(); g.arc(cx, cy, R + 0.16 * s, -ang(tOf(a)), -ang(tOf(b)), false); g.stroke(); });
      g.strokeStyle = '#B9BCC2'; g.lineWidth = 0.07 * s; g.beginPath(); g.arc(cx, cy, R - 0.06 * s, -ang(0), -ang(1), false); g.stroke();
      g.strokeStyle = '#15171C';
      for (let k = -2; k <= 3; k++) {
        const t = tOf(Math.pow(10, k));
        const [x0, y0] = pt(t, R - 0.36 * s), [x1, y1] = pt(t, R);
        g.lineWidth = 0.05 * s; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke();
        if (k < 3) for (let m = 2; m <= 9; m++) {
          const tm = tOf(m * Math.pow(10, k));
          const [a0, b0] = pt(tm, R - 0.18 * s), [a1, b1] = pt(tm, R);
          g.lineWidth = 0.022 * s; g.beginPath(); g.moveTo(a0, b0); g.lineTo(a1, b1); g.stroke();
        }
        const [tx, ty] = pt(t, R - 0.68 * s);
        g.fillStyle = '#15171C'; g.font = '600 ' + 0.34 * s + 'px ' + U.SANS; g.textAlign = 'center'; g.textBaseline = 'middle';
        g.fillText(['0,01', '0,1', '1', '10', '100', '1000'][k + 2], tx, ty);
      }
      const t30 = tOf(30);
      const [mx0, my0] = pt(t30, R + 0.3 * s), [mx1, my1] = pt(t30, R + 0.55 * s);
      g.strokeStyle = '#2343B0'; g.lineWidth = 0.05 * s; g.beginPath(); g.moveTo(mx0, my0); g.lineTo(mx1, my1); g.stroke();
      const [lx, ly] = pt(t30, R + 0.78 * s);
      g.fillStyle = '#2343B0'; g.font = '500 ' + 0.2 * s + 'px ' + U.MONO; g.fillText('30 mA', lx, ly);
      g.fillStyle = '#15171C'; g.font = '600 ' + 0.5 * s + 'px ' + U.SANS; g.fillText('mA', cx, cy - 1.75 * s);
      g.fillStyle = '#595E69'; g.font = '500 ' + 0.19 * s + 'px ' + U.MONO; g.fillText('AKIM · 50 Hz · LOGARİTMİK', cx, cy - 1.25 * s);
      g.textAlign = 'left'; g.font = '400 ' + 0.16 * s + 'px ' + U.MONO; g.fillStyle = '#595E69';
      g.fillText('IEC 60479-1 · yaklaşık değerler', 0.35 * s, 0.42 * s);
      const names = ['Hissedilmez', 'Hissedilir', 'Bırakamama', 'Solunum', 'Kalp ritmi'];
      const lw = W / 5;
      names.forEach((n, i) => {
        const x = i * lw + lw * 0.16, y = H - 0.5 * s;
        g.fillStyle = zones[i][2]; g.fillRect(x, y - 0.09 * s, 0.26 * s, 0.18 * s);
        g.fillStyle = '#15171C'; g.font = '500 ' + 0.19 * s + 'px ' + U.SANS; g.textBaseline = 'middle'; g.fillText(n, x + 0.36 * s, y);
      });
    }

    M.build = function () {
      const scene = (M.scene = new THREE.Scene());
      U.keyLight(scene, { pos: [-5, 9, 11], size: 8, map: 2048, target: [0, 4.4, 0] });
      scene.add(U.makeFloor(30, 0));
      const grp = new THREE.Group();
      grp.position.set(0, 4.6, 0);
      grp.rotation.x = -0.1;
      scene.add(grp);
      const housing = new THREE.Mesh(new THREE.ExtrudeGeometry(U.roundRectShape(11.6, 8.4, 0.6), { depth: 1.4, bevelEnabled: true, bevelThickness: 0.08, bevelSize: 0.08, bevelSegments: 3, curveSegments: 10 }), new THREE.MeshPhysicalMaterial({ color: 0x1d2129, roughness: 0.38, metalness: 0.2, clearcoat: 0.4 }));
      housing.castShadow = housing.receiveShadow = true;
      const bez = U.roundRectShape(11.6, 8.4, 0.6);
      bez.holes.push(U.roundRectShape(10.4, 7.2, 0.3));
      const bezel = new THREE.Mesh(new THREE.ExtrudeGeometry(bez, { depth: 0.22, bevelEnabled: true, bevelThickness: 0.04, bevelSize: 0.04, bevelSegments: 2, curveSegments: 10 }), new THREE.MeshStandardMaterial({ color: 0x2a2f38, metalness: 0.7, roughness: 0.32 }));
      bezel.position.z = 1.45; bezel.castShadow = true;
      const dc = document.createElement('canvas'); dc.width = 2080; dc.height = 1440;
      const dTex = U.canvasTex(dc);
      const redraw = () => { drawDial(dc.getContext('2d'), 2080, 1440); dTex.needsUpdate = true; };
      redraw();
      M.redrawText = redraw;
      const face = new THREE.Mesh(new THREE.PlaneGeometry(10.4, 7.2), new THREE.MeshStandardMaterial({ map: dTex, roughness: 0.6 }));
      face.position.z = 1.5; face.receiveShadow = true;
      const glass = new THREE.Mesh(new THREE.PlaneGeometry(10.4, 7.2), new THREE.MeshPhysicalMaterial({ color: 0xffffff, transparent: true, opacity: 0.07, roughness: 0.02, clearcoat: 1, depthWrite: false }));
      glass.position.z = 1.7;
      grp.add(housing, bezel, face, glass);
      [-4, 4].forEach(x => { const f = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.5, 1.6), new THREE.MeshStandardMaterial({ color: 0x15181e, roughness: 0.6 })); f.position.set(x, -4.35, 0.7); f.castShadow = true; grp.add(f); });
      const needle = new THREE.Group();
      needle.position.set(0, -2.4, 1.56);
      const ng = new THREE.BoxGeometry(0.04, 5.3, 0.015); ng.translate(0, 5.3 / 2 - 0.45, 0);
      const nMesh = new THREE.Mesh(ng, new THREE.MeshStandardMaterial({ color: 0x15171c, roughness: 0.4 }));
      nMesh.castShadow = true;
      const cw = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.04, 20), new THREE.MeshStandardMaterial({ color: 0x15171c, roughness: 0.4 }));
      cw.rotation.x = Math.PI / 2; cw.position.y = -0.36; cw.castShadow = true;
      const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.1, 28), new THREE.MeshStandardMaterial({ color: 0x3a3f48, metalness: 0.8, roughness: 0.3 }));
      cap.rotation.x = Math.PI / 2; cap.position.z = 0.04;
      needle.add(nMesh, cw, cap);
      grp.add(needle);
      M.update = (dt) => {
        const t = U.clamp((Math.log10(Math.max(st.I, 0.01)) + 2) / 5, 0, 1);
        const target = 150 - t * 120;
        st.vel += (target - st.ang) * 38 * dt - st.vel * 8.5 * dt;
        st.ang += st.vel * dt;
        needle.rotation.z = ((st.ang - 90) * Math.PI) / 180;
      };
      M.labels = [];
    };
    return M;
  });

  /* =====================================================================
     06 · Sinyal
     ===================================================================== */
  KG.register(6, function () {
    const st = { view: 'scope', noise: 20, rate: 16, byte: 65, t: 0, err: 0, tot: 16, lastUI: 0 };
    const M = { kicker: 'Modül 06', title: 'Sinyal', home: { p: [1.2, 6.6, 15.5], t: [0, 2.3, 0] }, from: [-12, 12, 26], lim: { min: 6, max: 34, maxPolar: Math.PI * 0.5 }, st };
    M.is2D = () => st.view === 'scope';
    M.note = () => st.view === 'scope'
      ? 'Osiloskop: dört kanal, yatay eksen zamandır. Gösterim amaçlı yavaşlatılmıştır.'
      : 'Dalga gerçekte saniyede 2,4 milyar kez salınır; görüntü milyarlarca kat yavaşlatıldı ve ölçekli değildir.';
    const TXT = {
      scope: ['Mikrofon sesi, sürekli değişen bir gerilime çevirir; bu analog sinyaldir (CH1). Dijital sistem bu gerilimi düzenli aralıklarla ölçer; noktalar bu ölçümlerdir ve her biri bir sayıya dönüşür.',
        'Gürültü analog sinyali kalıcı olarak bozar (CH2): alıcı hangi kısmın ses, hangi kısmın gürültü olduğunu bilemez. Dijital hatta da aynı gürültü vardır (CH3), ama alıcı yalnızca “eşiğin üstünde mi, altında mı?” diye sorar ve bitleri yeniden temiz üretir (CH4). Kopyalanan bir dijital dosyanın bozulmamasının nedeni budur.'],
      radio: ['Wi-Fi, radyo, mobil şebeke ve görünür ışık aynı olgudur: elektromanyetik dalga. Birbirine dik salınan elektrik ve manyetik alanlar birbirini besleyerek boşlukta saniyede yaklaşık 300.000 km yol alır.',
        'Wi-Fi’nin 2,4 GHz frekansı, alanın saniyede 2,4 milyar kez yön değiştirmesi demektir; bu dalganın boyu yaklaşık 12,5 cm’dir. Bitler, dalganın genliğinde, frekansında ya da evresinde yapılan küçük değişikliklerle taşınır.']
    };
    const bin = b => b.toString(2).padStart(8, '0');
    let bitBtns = [];
    function byteUI() {
      const b = st.byte;
      bitBtns.forEach((btn, i) => { const on = (b >> (7 - i)) & 1; btn.setAttribute('aria-pressed', String(!!on)); btn.firstChild.textContent = on; });
      $('m6-bin').textContent = bin(b);
      $('m6-dec').textContent = String(b);
      $('m6-chr').textContent = b >= 33 && b <= 126 ? String.fromCharCode(b) : b === 32 ? 'boşluk' : '—';
      $('m6-sent').textContent = bin(b);
    }
    function viewUI() {
      $('m6-rg').hidden = st.view !== 'scope';
      fillProse($('m6-text'), TXT[st.view]);
    }
    M.panelInit = () => {
      U.segGroup($('m6-view'), v => { st.view = v; viewUI(); if (KG.active === 6) KG.applyView(); });
      const n = $('m6-noise'), r = $('m6-rate');
      n.addEventListener('input', () => { st.noise = +n.value; $('m6-no').textContent = '%' + st.noise; });
      r.addEventListener('input', () => { st.rate = +r.value; $('m6-ro').textContent = st.rate + ' ölçüm'; });
      const wrap = $('m6-bits');
      bitBtns = [];
      for (let i = 0; i < 8; i++) {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'bit';
        b.innerHTML = '<span class="v">0</span><span class="w"></span>';
        b.lastChild.textContent = String(1 << (7 - i));
        b.setAttribute('aria-label', 'Bit ' + (7 - i) + ', değeri ' + (1 << (7 - i)));
        b.addEventListener('click', () => { st.byte ^= 1 << (7 - i); byteUI(); });
        wrap.appendChild(b);
        bitBtns.push(b);
      }
      document.querySelectorAll('#mp-6 [data-preset]').forEach(b => b.addEventListener('click', () => { st.byte = +b.dataset.preset; byteUI(); }));
      byteUI();
      viewUI();
    };

    /* ---------- oscilloscope (2D) ---------- */
    const persist = document.createElement('canvas');
    const hash = n => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
    const vnoise = (x, seed) => { const i = Math.floor(x), f = x - i, a = hash(i + seed * 1000), b = hash(i + 1 + seed * 1000), u = f * f * (3 - 2 * f); return (a + (b - a) * u) * 2 - 1; };
    const noiseAt = (u, seed) => 0.65 * vnoise(u * 38, seed) + 0.35 * vnoise(u * 91, seed + 7);
    const sig = u => 0.55 * Math.sin(TAU * 2 * u) + 0.25 * Math.sin(TAU * 5.3 * u + 1) + 0.1 * Math.sin(TAU * 9 * u + 2);
    M.draw2D = function (dt, T) {
      const cv = KG.dom.c2d, W = cv.width, H = cv.height, d = KG.DPR;
      if (!W || !H) return;
      const g = cv.getContext('2d');
      st.t += dt * 0.2;
      const sx = Math.round(24 * d), sy = Math.round(78 * d), sw = W - sx * 2, sh = H - sy - Math.round(52 * d);
      if (sw < 50 || sh < 50) return;
      if (persist.width !== sw || persist.height !== sh) { persist.width = sw; persist.height = sh; }
      const p = persist.getContext('2d');
      p.globalCompositeOperation = 'destination-out';
      p.fillStyle = 'rgba(0,0,0,.42)';
      p.fillRect(0, 0, sw, sh);
      p.globalCompositeOperation = 'lighter';
      const rowH = sh / 4, amp = rowH * 0.34, A = (st.noise / 100) * 0.95;
      const bits = bin(st.byte).split('').map(Number);
      const BPW = 16, N = Math.max(240, Math.floor(sw / (2 * d)));
      const rowY = r => r * rowH + rowH / 2;
      const ana = new Float32Array(N + 1), rx = new Float32Array(N + 1), dig = new Float32Array(N + 1), rec = new Float32Array(N + 1);
      const bitAt = b => bits[((b % 8) + 8) % 8];
      const cells = [];
      let errors = 0, total = 0;
      for (let b = Math.floor(st.t * BPW) - 1; b <= Math.floor((st.t + 1) * BPW) + 1; b++) {
        const uc = (b + 0.5) / BPW, bit = bitAt(b);
        const smp = (bit ? 0.62 : -0.62) + A * noiseAt(uc, 2);
        const dec = smp > 0 ? 1 : 0;
        cells.push({ b, x0: b / BPW - st.t, x1: (b + 1) / BPW - st.t, dec, err: dec !== bit });
        if (uc >= st.t && uc <= st.t + 1) { total++; if (dec !== bit) errors++; }
      }
      for (let i = 0; i <= N; i++) {
        const u = st.t + i / N;
        ana[i] = sig(u);
        rx[i] = ana[i] + A * noiseAt(u, 1);
        const bp = u * BPW, bi = Math.floor(bp), fr = bp - bi;
        let lvl = bitAt(bi) ? 0.62 : -0.62;
        const prev = bitAt(bi - 1) ? 0.62 : -0.62;
        if (fr < 0.06) lvl = prev + (lvl - prev) * (fr / 0.06);
        dig[i] = lvl + A * noiseAt(u, 2);
        const c = cells.find(q => i / N >= q.x0 && i / N < q.x1);
        rec[i] = c ? (c.dec ? 0.62 : -0.62) : 0;
      }
      const trace = (arr, row, col, glowA) => {
        const path = () => { p.beginPath(); for (let i = 0; i <= N; i++) { const x = (i / N) * sw, y = rowY(row) - arr[i] * amp; if (i) p.lineTo(x, y); else p.moveTo(x, y); } };
        path(); p.strokeStyle = col; p.globalAlpha = glowA; p.lineWidth = 6 * d; p.stroke();
        path(); p.globalAlpha = 1; p.lineWidth = 1.8 * d; p.stroke();
      };
      trace(ana, 0, '#B9C8F7', 0.16);
      trace(rx, 1, '#8EA6F2', 0.16);
      trace(dig, 2, '#E39A6C', 0.14);
      trace(rec, 3, '#F0C3A3', 0.16);
      p.globalAlpha = 1;

      g.fillStyle = '#0B0E14'; g.fillRect(0, 0, W, H);
      U.rr(g, sx - 6 * d, sy - 6 * d, sw + 12 * d, sh + 12 * d, 10 * d);
      g.fillStyle = '#080B10'; g.fill(); g.strokeStyle = '#262D3B'; g.lineWidth = d; g.stroke();
      g.strokeStyle = 'rgba(154,163,178,.13)'; g.lineWidth = d;
      for (let i = 0; i <= 10; i++) { const x = sx + (i / 10) * sw; g.beginPath(); g.moveTo(x, sy); g.lineTo(x, sy + sh); g.stroke(); }
      for (let i = 0; i <= 8; i++) { const y = sy + (i / 8) * sh; g.beginPath(); g.moveTo(sx, y); g.lineTo(sx + sw, y); g.stroke(); }
      g.strokeStyle = 'rgba(154,163,178,.28)';
      for (let i = 0; i <= 50; i++) { const x = sx + (i / 50) * sw; g.beginPath(); g.moveTo(x, sy + sh / 2 - 3 * d); g.lineTo(x, sy + sh / 2 + 3 * d); g.stroke(); }
      g.drawImage(persist, sx, sy);

      const dlt = 1 / st.rate;
      g.fillStyle = 'rgba(185,200,247,.55)'; g.strokeStyle = 'rgba(185,200,247,.45)'; g.lineWidth = 1.2 * d;
      g.setLineDash([4 * d, 4 * d]);
      g.beginPath();
      let first = true;
      for (let k = Math.ceil(st.t / dlt) - 1; k * dlt <= st.t + 1 + dlt; k++) {
        const u = k * dlt, x = sx + U.clamp((u - st.t), 0, 1) * sw, x2 = sx + U.clamp((u + dlt - st.t), 0, 1) * sw, y = sy + rowY(0) - sig(u) * amp;
        if (first) { g.moveTo(x, y); first = false; } else g.lineTo(x, y);
        g.lineTo(x2, y);
      }
      g.stroke();
      g.setLineDash([]);
      g.fillStyle = '#EEF0F3';
      for (let k = Math.ceil(st.t / dlt); k * dlt <= st.t + 1; k++) { const u = k * dlt; g.beginPath(); g.arc(sx + (u - st.t) * sw, sy + rowY(0) - sig(u) * amp, 3.2 * d, 0, TAU); g.fill(); }

      g.setLineDash([6 * d, 5 * d]); g.strokeStyle = 'rgba(238,240,243,.45)';
      g.beginPath(); g.moveTo(sx, sy + rowY(2)); g.lineTo(sx + sw, sy + rowY(2)); g.stroke();
      g.setLineDash([]);
      g.font = '500 ' + 11 * d + 'px ' + U.MONO; g.textBaseline = 'bottom'; g.textAlign = 'right'; g.fillStyle = 'rgba(238,240,243,.6)';
      g.fillText('karar eşiği', sx + sw - 8 * d, sy + rowY(2) - 4 * d);
      g.textAlign = 'center'; g.textBaseline = 'bottom';
      cells.forEach(c => {
        const xc = (c.x0 + c.x1) / 2;
        if (xc < 0.01 || xc > 0.99) return;
        g.fillStyle = c.err ? '#E39A6C' : 'rgba(240,195,163,.85)';
        g.font = (c.err ? '600 ' : '500 ') + 12 * d + 'px ' + U.MONO;
        g.fillText(String(c.dec), sx + xc * sw, sy + rowY(3) - amp - 6 * d);
        if (c.err) { g.fillRect(sx + c.x0 * sw + 3 * d, sy + rowY(3) + amp + 6 * d, (c.x1 - c.x0) * sw - 6 * d, 2 * d); }
      });
      const names = [['CH1', 'Analog kaynak (mikrofon)', '#B9C8F7'], ['CH2', 'Analog alıcı · gürültülü hat', '#8EA6F2'], ['CH3', 'Dijital hat · gürültülü', '#E39A6C'], ['CH4', 'Dijital alıcı · eşik kararı', '#F0C3A3']];
      g.textAlign = 'left'; g.textBaseline = 'top';
      names.forEach(([c, n, col], r) => {
        g.font = '500 ' + 12 * d + 'px ' + U.MONO; g.fillStyle = col; g.fillText(c, sx + 10 * d, sy + r * rowH + 8 * d);
        g.fillStyle = 'rgba(238,240,243,.7)'; g.fillText(n, sx + 50 * d, sy + r * rowH + 8 * d);
      });
      g.textAlign = 'right'; g.fillStyle = 'rgba(238,240,243,.75)';
      g.fillText('GÜRÜLTÜ %' + st.noise + '   ÖRNEKLEME ' + st.rate + '   BİT HATASI ' + errors + '/' + total, sx + sw - 10 * d, sy - 24 * d);

      st.err = errors; st.tot = total;
      if (T - st.lastUI > 0.25) {
        st.lastUI = T;
        $('m6-err').textContent = errors + ' / ' + total;
        $('m6-ok').textContent = errors ? 'Hatalı bit var' : 'Hatasız';
      }
    };

    /* ---------- wireless (3D) ---------- */
    M.build = function () {
      const scene = (M.scene = new THREE.Scene());
      U.keyLight(scene, { pos: [4, 12, 9], size: 14 });
      scene.add(U.makeFloor(40, 0));
      const V3 = U.V3;
      const dark = new THREE.MeshPhysicalMaterial({ color: 0x22262e, roughness: 0.35, metalness: 0.1, clearcoat: 0.5 });
      const router = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.55, 2.2), dark);
      router.position.set(-9, 0.3, 0); router.castShadow = true;
      scene.add(router);
      for (let i = 0; i < 4; i++) { const l = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.05, 0.02), new THREE.MeshBasicMaterial({ color: i === 0 ? 0x8EA6F2 : 0x4a5266, toneMapped: false })); l.position.set(-9.9 + i * 0.3, 0.38, 1.11); scene.add(l); }
      const ant = new THREE.Mesh(new THREE.CapsuleGeometry(0.09, 2.6, 6, 16), new THREE.MeshStandardMaterial({ color: 0x1a1c21, roughness: 0.6 }));
      ant.position.set(-8.1, 0.55 + 1.4, -0.6); ant.castShadow = true;
      scene.add(ant);
      const phone = new THREE.Mesh(new THREE.BoxGeometry(1.5, 3.0, 0.16), dark);
      phone.position.set(9, 1.85, 0); phone.rotation.y = -0.35; phone.castShadow = true;
      const pc = document.createElement('canvas'); pc.width = 300; pc.height = 600;
      const pg = pc.getContext('2d');
      pg.fillStyle = '#07090d'; pg.fillRect(0, 0, 300, 600);
      pg.fillStyle = '#8EA6F2'; [0, 1, 2, 3].forEach(i => pg.fillRect(110 + i * 22, 300 - i * 22, 14, 30 + i * 22));
      pg.fillStyle = 'rgba(238,240,243,.85)'; pg.font = '500 30px ' + U.SANS; pg.textAlign = 'center'; pg.fillText('Wi-Fi', 150, 400); pg.font = '400 24px ' + U.MONO; pg.fillText('2,4 GHz', 150, 440);
      const scr = new THREE.Mesh(new THREE.PlaneGeometry(1.36, 2.8), new THREE.MeshBasicMaterial({ map: U.canvasTex(pc), toneMapped: false }));
      scr.position.z = 0.081;
      phone.add(scr);
      const stand = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.35, 1.0), dark);
      stand.position.set(9, 0.18, 0.2); stand.rotation.y = -0.35;
      scene.add(phone, stand);

      const N = 64, X0 = -7.2, X1 = 7.4, AY = 2.6, AMP = 1.3, LAMBDA = 4.8, K = TAU / LAMBDA, VEL = 2.0;
      const aGeo = new THREE.CylinderGeometry(0.028, 0.028, 1, 8); aGeo.translate(0, 0.5, 0);
      const eMesh = new THREE.InstancedMesh(aGeo, new THREE.MeshBasicMaterial({ color: 0x8EA6F2, toneMapped: false }), N);
      const bMesh = new THREE.InstancedMesh(aGeo, new THREE.MeshBasicMaterial({ color: 0xE39A6C, toneMapped: false }), N);
      const tipG = new THREE.SphereGeometry(0.07, 10, 8);
      const eTip = new THREE.InstancedMesh(tipG, new THREE.MeshBasicMaterial({ color: 0x8EA6F2, toneMapped: false }), N);
      const bTip = new THREE.InstancedMesh(tipG, new THREE.MeshBasicMaterial({ color: 0xE39A6C, toneMapped: false }), N);
      scene.add(eMesh, bMesh, eTip, bTip);
      const axis = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, X1 - X0 + 0.6, 8), new THREE.MeshBasicMaterial({ color: 0x9AA3B2, toneMapped: false }));
      axis.rotation.z = Math.PI / 2; axis.position.set((X0 + X1) / 2 + 0.3, AY, 0);
      const ah = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.3, 16), axis.material);
      ah.rotation.z = -Math.PI / 2; ah.position.set(X1 + 0.75, AY, 0);
      scene.add(axis, ah);
      const rings = [];
      for (let k = 0; k < 6; k++) {
        const m = new THREE.Mesh(new THREE.RingGeometry(0.985, 1, 160), new THREE.MeshBasicMaterial({ color: 0x8EA6F2, toneMapped: false, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending }));
        m.rotation.x = -Math.PI / 2;
        m.position.set(-8.1, AY, -0.6);
        scene.add(m);
        rings.push(m);
      }
      const qUp = new THREE.Quaternion(), qDown = new THREE.Quaternion().setFromAxisAngle(V3(1, 0, 0), Math.PI);
      const qZ = new THREE.Quaternion().setFromAxisAngle(V3(1, 0, 0), Math.PI / 2), qZn = new THREE.Quaternion().setFromAxisAngle(V3(1, 0, 0), -Math.PI / 2);
      const p = V3(), sc = V3();
      M.update = (dt, t) => {
        for (let i = 0; i < N; i++) {
          const x = X0 + (i / (N - 1)) * (X1 - X0);
          const v = AMP * Math.sin(K * (x - X0) - K * VEL * t);
          p.set(x, AY, 0);
          sc.set(1, Math.max(Math.abs(v), 0.001), 1);
          U.M4.compose(p, v >= 0 ? qUp : qDown, sc); eMesh.setMatrixAt(i, U.M4);
          U.M4.compose(p, v >= 0 ? qZ : qZn, sc); bMesh.setMatrixAt(i, U.M4);
          U.setInst(eTip, i, p.set(x, AY + v, 0), 1);
          U.setInst(bTip, i, p.set(x, AY, v), 1);
        }
        [eMesh, bMesh, eTip, bTip].forEach(m => { m.instanceMatrix.needsUpdate = true; });
        const base = (((0.9 + VEL * t + LAMBDA / 4) % LAMBDA) + LAMBDA) % LAMBDA;
        rings.forEach((m, j) => {
          const r = base + j * LAMBDA;
          m.visible = r < 18;
          m.scale.setScalar(Math.max(r, 0.01));
          m.material.opacity = 0.32 * (1 - r / 18) * U.smooth(0, 0.8, r);
        });
      };
      M.labels = [
        { text: 'Verici anten', pos: V3(-8.1, 3.75, -0.6) },
        { text: 'Alıcı', pos: V3(9, 3.6, 0) },
        { text: 'Elektrik alanı (E)', pos: V3(-3.2, AY + AMP + 0.35, 0) },
        { text: 'Manyetik alan (B)', pos: V3(-1.4, AY, AMP + 0.3) },
        { text: 'Yayılma yönü · ≈ 300.000 km/s', pos: V3(X1 + 0.75, AY, 0) },
        { text: 'Dalga boyu ≈ 12,5 cm (ölçeksiz)', pos: V3(1.2, AY - 1.7, 0), flat: true }
      ];
    };
    return M;
  });
})();
