import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { C } from './palette.js';
import { loadThemeId } from './themes.js';
import { radialTexture } from './textures.js';

// Attackers as creatures, one InstancedMesh per species so each stays a single draw call:
//   web exploits       -> a spiky virus (icosahedron with spike cones), slow spin + pulse
//   appliance exploits -> a beetle (flattened body, legs, antennae), waddling with leg sway
//   lateral movement   -> a segmented worm, ghosted, undulating
// Bosses are the same species at ~2.2x with a pulsing red rim and a light. Colour encodes what
// the player knows. Every creature gets a soft shadow blob and a short trail.
const MAX = 600;
// Attackers own the red: identified danger is bright red, your product pink, everything
// unidentified or irrelevant dark grey. Towers and status use white/amber/green/blue.
const LEVEL_COLOR = { unknown: 0x34343a, noise: 0x6e6e76, stack: 0xff8a80, 'stack-clean': 0x8a8a92, danger: 0xff2a1f, lured: C.lured };
const TRAIL = 4;

function virusGeometry() {
  const parts = [new THREE.IcosahedronGeometry(0.26, 1)];
  const dirs = new THREE.IcosahedronGeometry(1, 0).attributes.position;
  const seen = new Set();
  for (let i = 0; i < dirs.count; i++) {
    const v = new THREE.Vector3().fromBufferAttribute(dirs, i);
    const k = v.toArray().map((n) => n.toFixed(2)).join(',');
    if (seen.has(k)) continue; seen.add(k);
    const cone = new THREE.ConeGeometry(0.07, 0.22, 6);
    cone.translate(0, 0.35, 0);
    const knob = new THREE.SphereGeometry(0.05, 6, 5); knob.translate(0, 0.46, 0);
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), v.clone().normalize());
    cone.applyQuaternion(q); knob.applyQuaternion(q);
    parts.push(cone, knob);
  }
  return mergeGeometries(parts.map((g) => (g.index ? g.toNonIndexed() : g)));
}
function beetleGeometry() {
  const parts = [];
  const body = new THREE.SphereGeometry(0.32, 14, 10); body.scale(1, 0.58, 1.4); parts.push(body);
  const shell = new THREE.SphereGeometry(0.3, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2); shell.scale(1.02, 0.66, 1.3); shell.translate(0, 0.02, -0.05); parts.push(shell);
  const head = new THREE.SphereGeometry(0.16, 10, 8); head.translate(0, -0.02, 0.43); parts.push(head);
  for (const side of [-1, 1]) {
    for (const z of [-0.24, 0, 0.24]) {
      const upper = new THREE.BoxGeometry(0.26, 0.04, 0.04); upper.translate(side * 0.28, -0.02, z); upper.rotateZ(side * 0.55); parts.push(upper);
      const lower = new THREE.BoxGeometry(0.04, 0.2, 0.04); lower.translate(side * 0.44, -0.15, z); parts.push(lower);
    }
    const ant = new THREE.CylinderGeometry(0.012, 0.012, 0.36, 4); ant.rotateX(-1.0); ant.rotateY(side * 0.5); ant.translate(side * 0.08, 0.12, 0.62); parts.push(ant);
    const eye = new THREE.SphereGeometry(0.04, 6, 5); eye.translate(side * 0.09, 0.05, 0.56); parts.push(eye);
  }
  const ridge = new THREE.BoxGeometry(0.02, 0.05, 0.62); ridge.translate(0, 0.19, -0.05); parts.push(ridge);
  return mergeGeometries(parts.map((g) => (g.index ? g.toNonIndexed() : g)));
}
function wormGeometry() {
  const parts = [];
  for (let i = 0; i < 6; i++) { const s = new THREE.SphereGeometry(0.16 - i * 0.018, 8, 6); s.translate(0, Math.sin(i * 1.3) * 0.03, -i * 0.2); parts.push(s); }
  for (const side of [-1, 1]) { const eye = new THREE.SphereGeometry(0.035, 6, 5); eye.translate(side * 0.07, 0.08, 0.1); parts.push(eye); }
  return mergeGeometries(parts.map((g) => (g.index ? g.toNonIndexed() : g)));
}

export class AttackerLayer {
  constructor(scene) {
    const mat = (extra = {}) => new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.6, metalness: 0.1, emissive: 0xffffff, emissiveIntensity: 0.12, envMapIntensity: 0.3, ...extra });
    this.virus = new THREE.InstancedMesh(virusGeometry(), mat({ transparent: true, opacity: 0.94, roughness: 0.5 }), MAX);
    this.beetle = new THREE.InstancedMesh(beetleGeometry(), mat({ roughness: 0.55, metalness: 0.25 }), MAX);
    this.worm = new THREE.InstancedMesh(wormGeometry(), mat({ transparent: true, opacity: 0.72, emissiveIntensity: 0.2 }), MAX);
    for (const m of [this.virus, this.beetle, this.worm]) { m.instanceMatrix.setUsage(THREE.DynamicDrawUsage); m.castShadow = true; m.frustumCulled = false; scene.add(m); }
    // Daylight outline: an inverted hull in a light tone so dark creatures separate from building shadows.
    const hullMat = new THREE.MeshBasicMaterial({ color: 0xe8ecf4, side: THREE.BackSide });
    this.virusHull = new THREE.InstancedMesh(this.virus.geometry, hullMat, MAX); this.beetleHull = new THREE.InstancedMesh(this.beetle.geometry, hullMat, MAX);
    for (const m of [this.virusHull, this.beetleHull]) { m.instanceMatrix.setUsage(THREE.DynamicDrawUsage); m.frustumCulled = false; m.visible = false; scene.add(m); }
    this.rings = new THREE.InstancedMesh(new THREE.RingGeometry(0.4, 0.48, 24), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.8, side: THREE.DoubleSide, depthWrite: false }), MAX);
    this.rings.frustumCulled = false; scene.add(this.rings);
    this.blobs = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: radialTexture('rgba(0,0,0,0.9)', 'rgba(0,0,0,0)'), transparent: true, depthWrite: false }), MAX);
    this.blobs.frustumCulled = false; scene.add(this.blobs);
    this.trail = new THREE.InstancedMesh(new THREE.CircleGeometry(0.16, 10), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.3, depthWrite: false }), MAX * TRAIL);
    this.trail.frustumCulled = false; scene.add(this.trail);
    this.bars = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.6, 0.07), new THREE.MeshBasicMaterial({ color: 0xffffff, depthTest: false, transparent: true }), MAX);
    this.bars.frustumCulled = false; this.bars.renderOrder = 18; scene.add(this.bars);
    this.tmp = new THREE.Object3D();
    this.color = new THREE.Color();
    this.bossLights = new Map();
    this.bossPool=Array.from({length:4},()=>{const light=new THREE.PointLight(C.accent,0,5,2);scene.add(light);return light;});
    this.scene = scene;
    // Allocate instance colors before the first shader compilation, including empty species.
    for(const mesh of [this.virus,this.beetle,this.worm,this.rings,this.trail,this.bars,this.blobs])mesh.setColorAt(0,new THREE.Color(0xffffff));
  }
  sync(game, t, cameraQuat) {
    let iV = 0, iBe = 0, iW = 0, iR = 0, iT = 0, iB = 0, iS = 0;
    const seenBoss = new Set();
    const tmp = this.tmp, col = this.color;
    const themeId = loadThemeId(); const light = themeId === 'day';
    const em = 0.025;
    for (const m of [this.virus, this.beetle]) m.material.emissiveIntensity = em;
    this.virusHull.visible = this.beetleHull.visible = light;
    for (const a of game.attackers) {
      if (iR >= MAX) break;
      const intel = game.attackerIntel(a);
      const lateral = a.kind === 'lateral';
      let c = lateral ? (a.revealed ? C.lateral : C.unknown) : (LEVEL_COLOR[intel.level] || C.unknown);
      if (light && (c === 0x34343a || c === 0x6e6e76)) c = 0x22222a;
      col.set(c);
      const s = a.boss ? 2.4 * (1 + Math.sin(t * 2) * 0.05) : lateral ? 1.25 : 1.55;
      const heading = Math.atan2(a.nx - a.x, a.ny - a.y);
      if (lateral) {
        tmp.position.set(a.x, 0.17 * s, a.y); tmp.rotation.set(Math.sin(t * 6 + a.id) * 0.15, heading, Math.sin(t * 5 + a.id) * 0.2); tmp.scale.setScalar(s); tmp.updateMatrix();
        this.worm.setMatrixAt(iW, tmp.matrix); this.worm.setColorAt(iW, col); iW++;
      } else if (a.web) {
        const pulse = 1 + Math.sin(t * 5 + a.id) * 0.06;
        tmp.position.set(a.x, (0.5 + Math.sin(t * 3 + a.id) * 0.06) * s, a.y); tmp.rotation.set(t * 0.7 + a.id, t * 1.1, t * 0.3); tmp.scale.setScalar(s * pulse); tmp.updateMatrix();
        this.virus.setMatrixAt(iV, tmp.matrix); this.virus.setColorAt(iV, col); if (light) { tmp.scale.setScalar(s * pulse * 1.12); tmp.updateMatrix(); this.virusHull.setMatrixAt(iV, tmp.matrix); } iV++;
      } else {
        const gait = Math.sin(t * 11 + a.id);
        tmp.position.set(a.x, (0.2 + Math.abs(gait) * 0.03) * s, a.y); tmp.rotation.set(gait * 0.06, heading, gait * 0.16); tmp.scale.setScalar(s); tmp.updateMatrix();
        this.beetle.setMatrixAt(iBe, tmp.matrix); this.beetle.setColorAt(iBe, col); if (light) { tmp.scale.setScalar(s * 1.1); tmp.updateMatrix(); this.beetleHull.setMatrixAt(iBe, tmp.matrix); } iBe++;
      }
      // Shadow blob.
      tmp.position.set(a.x, 0.025, a.y); tmp.rotation.set(-Math.PI / 2, 0, 0); tmp.scale.setScalar(s * 0.9); tmp.updateMatrix();
      this.blobs.setMatrixAt(iS, tmp.matrix); iS++;
      // Ring: bosses pulse red.
      tmp.position.set(a.x, 0.03, a.y); tmp.rotation.set(-Math.PI / 2, 0, 0); tmp.scale.setScalar(a.boss ? s * (1.1 + Math.sin(t * 6) * 0.15) : s); tmp.updateMatrix();
      this.rings.setMatrixAt(iR, tmp.matrix); if (a.boss) col.set(C.danger); this.rings.setColorAt(iR, col); iR++;
      if (a.boss) col.set(c);
      let tr = a._trail;
      if (!tr) { tr = a._trail = new Float32Array(TRAIL * 2); for (let k = 0; k < TRAIL; k++) { tr[k * 2] = a.x; tr[k * 2 + 1] = a.y; } a._trailT = 0; }
      a._trailT = (a._trailT || 0) + 1;
      if (a._trailT % 4 === 0) { for (let k = TRAIL - 1; k > 0; k--) { tr[k * 2] = tr[(k - 1) * 2]; tr[k * 2 + 1] = tr[(k - 1) * 2 + 1]; } tr[0] = a.x; tr[1] = a.y; }
      for (let k = 0; k < TRAIL; k++) {
        tmp.position.set(tr[k * 2], 0.04, tr[k * 2 + 1]); tmp.rotation.set(-Math.PI / 2, 0, 0); tmp.scale.setScalar(s * (1 - k / TRAIL) * 0.9); tmp.updateMatrix();
        this.trail.setMatrixAt(iT, tmp.matrix); this.trail.setColorAt(iT, col); iT++;
      }
      const f = Math.max(0, a.hp) / a.maxHp;
      if (a.revealed && f < 1) {
        tmp.position.set(a.x, 1.05 * s, a.y); tmp.quaternion.copy(cameraQuat); tmp.scale.set(f, 1, 1); tmp.updateMatrix();
        this.bars.setMatrixAt(iB, tmp.matrix);
        col.set(f > 0.5 ? C.text : f > 0.25 ? C.amber : C.danger);
        this.bars.setColorAt(iB, col); iB++;
      }
      if (a.boss) {
        seenBoss.add(a.id);
        const l=this.bossPool[seenBoss.size-1];
        if(l){l.position.set(a.x,1.2,a.y);l.intensity=2.5+Math.sin(t*2);}
      }
    }
    for(let i=Math.min(4,seenBoss.size);i<4;i++)this.bossPool[i].intensity=0;
    this.virus.count = iV; this.beetle.count = iBe; this.worm.count = iW; this.virusHull.count = light ? iV : 0; this.beetleHull.count = light ? iBe : 0; this.virusHull.instanceMatrix.needsUpdate = this.beetleHull.instanceMatrix.needsUpdate = true; this.rings.count = iR; this.trail.count = iT; this.bars.count = iB; this.blobs.count = iS;
    for (const m of [this.virus, this.beetle, this.worm, this.rings, this.trail, this.bars, this.blobs]) { m.instanceMatrix.needsUpdate = true; if (m.instanceColor) m.instanceColor.needsUpdate = true; }
  }
  pick(game, gx, gy) {
    let best = null, bd = 0.5;
    for (const a of game.attackers) { const d = Math.hypot(a.x - gx, a.y - gy); if (d < bd) { bd = d; best = a; } }
    return best;
  }
}
