import * as THREE from 'three';
import { TOWERS } from '../sim/catalog.js';
import { C } from './palette.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { brushedMaps, tex } from './textures.js';
import { iconSprite } from './text.js';
import { pushContact } from './decals.js';
import { radialTexture } from './textures.js';

// Towers: NDR (tripod dish with a ground sweep), IPS (finned pylon with a firing core), WAF
// (twin emitter rings under a dome), honey tokens (a small rack safe with a glowing key and a
// re-arm ring), and segments (low walls that connect to neighbours). Brushed metal and
// painted panels, with the dynamic parts kept as separate meshes.
const brushed = brushedMaps();
const metal = new THREE.MeshStandardMaterial({ color: 0x7c8090, roughness: 0.36, metalness: 0.85, roughnessMap: tex(brushed.rough), normalMap: tex(brushed.normal), normalScale: new THREE.Vector2(0.3, 0.3) });
const dark = new THREE.MeshStandardMaterial({ color: 0x24242a, roughness: 0.85, metalness: 0.1 });
// Towers own white and amber; red belongs to the attackers and to compromise.
const glowRed = new THREE.MeshStandardMaterial({ color: 0x111111, emissive: 0xf4f6ff, emissiveIntensity: 0.9, roughness: 0.3 });
const glowWhite = new THREE.MeshStandardMaterial({ color: 0x111111, emissive: 0xdedee6, emissiveIntensity: 0.9, roughness: 0.3 });
const glowAmber = new THREE.MeshStandardMaterial({ color: 0x201400, emissive: C.amber, emissiveIntensity: 1.6, roughness: 0.3 });
const domeMat = new THREE.MeshPhysicalMaterial({ color: 0xdfe6ff, transparent: true, opacity: 0.08, roughness: 0.2, metalness: 0, side: THREE.DoubleSide, depthWrite: false });
const glowTex = radialTexture('rgba(255,255,255,1)', 'rgba(255,255,255,0)');
function glowSprite(color, size) { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color, transparent: true, opacity: 0.22, blending: THREE.AdditiveBlending, depthWrite: false })); sp.scale.setScalar(size * 0.7); return sp; }
const sweepMat = new THREE.MeshBasicMaterial({ color: 0xdedee6, transparent: true, opacity: 0.09, side: THREE.DoubleSide, depthWrite: false });
const wallMat = new THREE.MeshStandardMaterial({ color: 0x2c2c34, roughness: 0.8, metalness: 0.2 });
const armFillMat = new THREE.MeshBasicMaterial({ color: 0xf0f2ff, transparent: true, opacity: 0.3, side: THREE.DoubleSide, depthWrite: false });

export function applyTowerTheme(t) { metal.color.set(t.appliance); dark.color.set(t.dark); wallMat.color.set(t.dark); vMetal.color.set(t.appliance); vDark.color.set(t.dark); }

function mesh(geo, mat, y = 0) { const m = new THREE.Mesh(geo, mat); m.castShadow = true; m.receiveShadow = true; m.position.y = y; return m; }
const levelScaleOf = (tower) => 1.5 + tower.level * 0.15;
const MID = [0.62, 0.62, 0.66], DARK = [0.34, 0.34, 0.38], WHITE = [1, 1, 1];
const vMetal = new THREE.MeshStandardMaterial({ vertexColors: true, color: 0x7c8090, roughness: 0.36, metalness: 0.85, roughnessMap: tex(brushed.rough), normalMap: tex(brushed.normal), normalScale: new THREE.Vector2(0.3, 0.3) });
const vDark = new THREE.MeshStandardMaterial({ vertexColors: true, color: 0x24242a, roughness: 0.85, metalness: 0.1 });
// Static parts of a tower are merged into one metal mesh and one dark mesh; only the moving
// or glowing bits stay separate.
class Statics {
  constructor() { this.metal = []; this.dark = []; }
  add(bucket, geom, x, y, z, color = WHITE, rot = null) {
    const g = geom.index ? geom.toNonIndexed() : geom; if (rot) { g.rotateX(rot[0] || 0); g.rotateY(rot[1] || 0); g.rotateZ(rot[2] || 0); } g.translate(x, y, z);
    const n = g.attributes.position.count; const col = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { col[i * 3] = color[0]; col[i * 3 + 1] = color[1]; col[i * 3 + 2] = color[2]; }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3)); this[bucket].push(g);
  }
  build(group) {
    for (const [key, mat] of [['metal', vMetal], ['dark', vDark]]) { if (!this[key].length) continue; const m = new THREE.Mesh(mergeGeometries(this[key]), mat); m.castShadow = true; m.receiveShadow = true; group.add(m); }
  }
}

export function buildTower(tower) {
  const g = new THREE.Group();
  const S = new Statics();
  S.add('dark', new THREE.CylinderGeometry(0.46, 0.52, 0.16, 10), 0, 0.08, 0);
  S.add('metal', new THREE.TorusGeometry(0.4, 0.02, 4, 10), 0, 0.16, 0, MID, [Math.PI / 2, 0, 0]);
  const parts = {};
  switch (tower.type) {
    case 'ndr': {
      for (let i = 0; i < 3; i++) { const a = i * Math.PI * 2 / 3; S.add('metal', new THREE.CylinderGeometry(0.03, 0.04, 1.3, 6), Math.sin(a) * 0.3, 0.62, Math.cos(a) * 0.3, MID, [-Math.sin(a) * 0.25, 0, Math.cos(a) * 0.25]); }
      S.add('metal', new THREE.CylinderGeometry(0.06, 0.08, 1.9, 8), 0, 0.95, 0);
      S.add('dark', new THREE.BoxGeometry(0.3, 0.2, 0.2), 0.2, 0.55, 0);
      const pivot = new THREE.Group(); pivot.position.y = 1.85;
      const dish = mesh(new THREE.SphereGeometry(0.42, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2.6), metal, 0); dish.rotation.x = -Math.PI * 0.62; dish.position.z = 0.1; pivot.add(dish);
      const inner = new THREE.Mesh(new THREE.SphereGeometry(0.4, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2.6), glowWhite); inner.rotation.x = -Math.PI * 0.62; inner.position.z = 0.09; inner.scale.setScalar(0.96); pivot.add(inner);
      const feed = mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.5, 5), metal, 0); feed.rotation.x = Math.PI / 2 - 0.55; feed.position.set(0, 0.16, 0.3); pivot.add(feed);
      g.add(pivot); parts.pivot = pivot;
      const tip = mesh(new THREE.SphereGeometry(0.06, 8, 8), glowWhite, 2.35); g.add(tip);
      const sweep = new THREE.Mesh(new THREE.CircleGeometry(1, 24, 0, 0.5), sweepMat); sweep.rotation.x = -Math.PI / 2; sweep.position.y = 0.035; g.add(sweep); parts.sweep = sweep;
      break;
    }
    case 'ips': {
      S.add('metal', new THREE.BoxGeometry(0.6, 1.05, 0.6), 0, 0.52, 0);
      for (const z of [-0.2, 0, 0.2]) S.add('dark', new THREE.BoxGeometry(0.62, 0.04, 0.02), 0, 0.35 + z * 1.3, 0.31);
      S.add('dark', new THREE.BoxGeometry(0.76, 0.28, 0.76), 0, 1.18, 0);
      for (const [x, z] of [[0.32, 0.32], [-0.32, 0.32], [0.32, -0.32], [-0.32, -0.32]]) S.add('metal', new THREE.BoxGeometry(0.08, 0.6, 0.08), x, 1.55, z, MID);
      const core = mesh(new THREE.OctahedronGeometry(0.2), glowWhite, 1.6); g.add(core); parts.core = core;
      const halo = glowSprite(0xffffff, 0.9); halo.position.y = 1.6; g.add(halo); parts.halo = halo;
      const l = new THREE.PointLight(0xffffff, 1.0, 3.5, 2); l.position.y = 1.6; g.add(l); parts.light = l;
      break;
    }
    case 'waf': {
      S.add('metal', new THREE.CylinderGeometry(0.4, 0.46, 0.75, 8), 0, 0.38, 0);
      for (let i = 0; i < 4; i++) S.add('dark', new THREE.BoxGeometry(0.36, 0.03, 0.02), 0, 0.2 + i * 0.12, 0.45);
      const emitter = mesh(new THREE.TorusGeometry(0.32, 0.05, 8, 24), glowAmber, 0.85); emitter.rotation.x = Math.PI / 2; g.add(emitter); parts.emitter = emitter;
      const halo = glowSprite(C.amber, 1.3); halo.position.y = 0.95; g.add(halo); parts.halo = halo;
      const emitter2 = mesh(new THREE.TorusGeometry(0.2, 0.04, 8, 24), glowWhite, 1.0); emitter2.rotation.x = Math.PI / 2; g.add(emitter2); parts.emitter2 = emitter2;
      const lv = TOWERS.waf.levels[tower.level];
      const dome = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), domeMat);
      dome.scale.set(lv.range, lv.range * 0.45, lv.range); g.add(dome); parts.dome = dome;
      const rim = new THREE.Mesh(new THREE.TorusGeometry(1, 0.02, 6, 64), new THREE.MeshBasicMaterial({ color: C.amber, transparent: true, opacity: 0.5 })); rim.rotation.x = Math.PI / 2; rim.position.y = 0.04; rim.scale.set(lv.range, lv.range, 1); g.add(rim); parts.rim = rim;
      break;
    }
    case 'honeytoken': {
      S.add('metal', new THREE.BoxGeometry(0.62, 0.8, 0.56), 0, 0.4, 0);
      S.add('dark', new THREE.BoxGeometry(0.5, 0.62, 0.04), 0, 0.42, 0.29);
      for (let i = 0; i < 3; i++) S.add('dark', new THREE.BoxGeometry(0.5, 0.03, 0.02), 0, 0.2 + i * 0.2, -0.28);
      const handle = mesh(new THREE.TorusGeometry(0.08, 0.02, 6, 16), glowAmber, 0.42); handle.position.set(0.14, 0.42, 0.32); g.add(handle);
      const key = iconSprite('key', { fg: '#ffb547', bg: 'rgba(0,0,0,0)' }); key.position.set(0, 1.05, 0); key.scale.setScalar(0.36); g.add(key); parts.key = key;
      const armRing = new THREE.Mesh(new THREE.RingGeometry(0.62, 0.72, 40), new THREE.MeshBasicMaterial({ color: 0xf0f2ff, transparent: true, opacity: 0.8, side: THREE.DoubleSide, depthWrite: false })); armRing.rotation.x = -Math.PI / 2; armRing.position.y = 0.04; g.add(armRing); parts.armRing = armRing;
      const armFill = new THREE.Mesh(new THREE.CircleGeometry(0.62, 40), armFillMat); armFill.rotation.x = -Math.PI / 2; armFill.position.y = 0.035; g.add(armFill); parts.armFill = armFill;
      const l = new THREE.PointLight(C.amber, 1.0, 3, 2); l.position.y = 1.0; g.add(l); parts.light = l;
      break;
    }
  }
  S.build(g);
  g.position.set(tower.x, 0, tower.y);
  g.scale.setScalar(levelScaleOf(tower));
  g.userData.towerId = tower.id;
  return { group: g, parts, type: tower.type };
}

// A segment: a low wall block plus four connector stubs toggled by `connectWalls`.
export function buildWall(x, y) {
  const g = new THREE.Group();
  const slab = mesh(new THREE.BoxGeometry(0.7, 0.62, 0.7), wallMat, 0.31);
  g.add(slab);
  const cap = new THREE.Mesh(new THREE.BoxGeometry(0.74, 0.05, 0.74), glowWhite); cap.position.y = 0.64; g.add(cap);
  const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.08, 0.72), glowAmber); stripe.position.y = 0.2; g.add(stripe);
  g.userData.stubs = {};
  for (const [k, dx, dz] of [['e', 0.5, 0], ['w', -0.5, 0], ['s', 0, 0.5], ['n', 0, -0.5]]) {
    const st = mesh(new THREE.BoxGeometry(dx ? 0.6 : 0.5, 0.52, dz ? 0.6 : 0.5), wallMat, 0.26); st.position.x = dx; st.position.z = dz; st.visible = false; g.add(st); g.userData.stubs[k] = st;
  }
  g.position.set(x, 0, y);
  return g;
}
export function connectWalls(walls, wallViews) {
  for (const [k, w] of walls) {
    const v = wallViews.get(k); if (!v) continue;
    const has = (x, y) => walls.has(y * 30 + x);
    v.userData.stubs.e.visible = has(w.x + 1, w.y); v.userData.stubs.w.visible = has(w.x - 1, w.y);
    v.userData.stubs.s.visible = has(w.x, w.y + 1); v.userData.stubs.n.visible = has(w.x, w.y - 1);
  }
}

export function updateTowerView(view, tower, t, game) {
  const p = view.parts;
  const ls = levelScaleOf(tower);
  view.group.scale.setScalar(ls);
  if (view.type === 'ndr' && p.pivot) { p.pivot.rotation.y = t * 1.4; const r = game.towerRange(tower) / ls; p.sweep.scale.set(r, r, 1); p.sweep.rotation.z = -t * 1.4 + Math.PI / 2; }
  pushContact(tower.x, tower.y, 1.5 * ls, 0.9);
  if (view.type === 'ips' && p.core) { p.core.rotation.y = t * 2; const firing = tower.target && tower.cooldown > 0; p.light.intensity = firing ? 3 : 1.0; p.core.scale.setScalar(firing ? 1.25 : 1); p.halo.material.opacity = firing ? 0.7 : 0.3; p.halo.material.color.set(firing ? C.amber : 0xffffff); }
  if (view.type === 'waf' && p.emitter) { p.emitter.rotation.z = t * 0.8; p.emitter2.rotation.z = -t * 1.3; p.halo.material.opacity = 0.28 + Math.sin(t * 2) * 0.1; const r = game.towerRange(tower) / ls; p.dome.scale.set(r, r * 0.45, r); p.rim.scale.set(r, r, 1); p.dome.material.opacity = 0.06 + Math.sin(t * 2) * 0.015; }
  if (view.type === 'honeytoken' && p.armRing) {
    const total = (TOWERS.honeytoken.levels[tower.level] || {}).cooldown || 25;
    const armed = tower.cooldown <= 0;
    const f = armed ? 1 : 1 - Math.min(1, tower.cooldown / total);
    p.armFill.scale.setScalar(Math.max(0.01, f)); p.armFill.material.opacity = armed ? 0.3 + Math.sin(t * 3) * 0.1 : 0.2;
    p.armRing.material.color.set(armed ? 0xf0f2ff : 0x6a6a70);
    p.light.intensity = armed ? 0.9 + Math.sin(t * 4) * 0.3 : 0.15;
    p.key.material.opacity = armed ? 1 : 0.35; p.key.position.y = 1.15 + Math.sin(t * 2) * 0.05;
  }
}
