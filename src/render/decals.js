import * as THREE from 'three';
import { radialTexture, softRectTexture } from './textures.js';

// Ground decals in two instanced layers, rebuilt every frame from whoever pushes into them
// (map props, buildings, towers): contact shadows under every footprint (baked AO instead
// of a screen-space pass) and warm lamp pools at night. One draw call per layer, no
// per-frame allocation.
const MAX = 512;
const _o = new THREE.Object3D(), _c = new THREE.Color();
function layer(color, opacity, blending = THREE.NormalBlending) {
  const m = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: radialTexture(`rgba(${color},1)`, `rgba(${color},0)`), color: 0xffffff, transparent: true, opacity, depthWrite: false, blending }), MAX);
  m.frustumCulled = false; m.renderOrder = 1; m.userData.noAO = true; m.count = 0;
  return m;
}
export const contact = layer('0,0,0', 0.55);
export const pools = layer('255,190,110', 0.5, THREE.AdditiveBlending);
// Footprint-shaped contact shadow for the 2x2 buildings: a blurred rounded square, not a puck.
export const footprint = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: softRectTexture(), color: 0xffffff, transparent: true, opacity: 0.5, depthWrite: false }), MAX);
footprint.frustumCulled = false; footprint.renderOrder = 1; footprint.userData.noAO = true; footprint.count = 0;
let nC = 0, nP = 0, nF = 0, attached = null;
export function attachDecals(scene) { if (attached === scene) return; attached = scene; scene.add(contact, pools, footprint); }
export function pushFootprint(x, z, size, strength = 1) {
  if (nF >= MAX) return;
  _o.position.set(x, 0.011, z); _o.rotation.set(-Math.PI / 2, 0, 0); _o.scale.set(size, size, 1); _o.updateMatrix();
  footprint.setMatrixAt(nF, _o.matrix); _c.setScalar(strength); footprint.setColorAt(nF, _c); nF++;
}
export function pushContact(x, z, size, strength = 1) {
  if (nC >= MAX) return;
  _o.position.set(x, 0.012, z); _o.rotation.set(-Math.PI / 2, 0, 0); _o.scale.set(size, size, 1); _o.updateMatrix();
  contact.setMatrixAt(nC, _o.matrix); _c.setScalar(strength); contact.setColorAt(nC, _c); nC++;
}
export function pushPool(x, z, size, strength = 1) {
  if (nP >= MAX) return;
  _o.position.set(x, 0.014, z); _o.rotation.set(-Math.PI / 2, 0, 0); _o.scale.set(size, size, 1); _o.updateMatrix();
  pools.setMatrixAt(nP, _o.matrix); _c.setScalar(strength); pools.setColorAt(nP, _c); nP++;
}
export function flushDecals() {
  contact.count = nC; pools.count = nP; footprint.count = nF; nC = nP = nF = 0;
  for (const l of [contact, pools, footprint]) { l.instanceMatrix.needsUpdate = true; if (l.instanceColor) l.instanceColor.needsUpdate = true; }
}
