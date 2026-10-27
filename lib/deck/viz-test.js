/* Altyapı denemesi: ortak 3B hattının çalıştığını doğrulayan küçük sahne. */
(function () {
  'use strict';
  KGViz.register('kg-test', function (el, opts) {
    var THREE = window.THREE;
    var v = KGViz.stage3d(el, { theme: opts.theme, distance: 9, pitch: 0.4, yaw: 0.6, size: 4, ground: -1.2, autoRotate: 0.15 });
    var knot = new THREE.Mesh(new THREE.TorusKnotGeometry(1, 0.32, 220, 32), KGViz.mat.copper());
    knot.castShadow = true;
    v.scene.add(knot);
    var N = 120, rng = KGViz.rng(7);
    var e = KGViz.instanced(N, { radius: 0.07 });
    v.scene.add(e);
    var seeds = [];
    for (var i = 0; i < N; i++) seeds.push([rng() * Math.PI * 2, rng() * Math.PI * 2, 1.9 + rng() * 0.6]);
    var lab = v.label('Bakır', { at: [0, 1.5, 0], cls: 'name', dx: 60, dy: -30, line: true, align: 'left' });
    var V = 5;
    return {
      reset: function () { },
      set: function (k, val) { if (k === 'voltage') V = val; },
      read: function (k) { return k === 'voltage' ? KGViz.num(V, 1) + ' V' : ''; },
      frame: function (t, dt) {
        knot.rotation.y = t * 0.3;
        for (var i = 0; i < N; i++) {
          var a = seeds[i][0] + t * 0.4 * V / 5, b = seeds[i][1], r = seeds[i][2];
          e.setAt(i, Math.cos(a) * r, Math.sin(b + t) * 0.8, Math.sin(a) * r);
        }
        e.commit();
        lab.set('Bakır · ' + KGViz.num(V, 1) + ' V');
        v.render(dt);
      }
    };
  });
})();
