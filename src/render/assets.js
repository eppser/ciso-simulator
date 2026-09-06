import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { C } from './palette.js';
import { labelSprite } from './text.js';
import { brushedMaps, panelMaps, tex, radialTexture } from './textures.js';
import { pushFootprint } from './decals.js';

// One building per system, built from primitives merged into four meshes: matte panels,
// brushed metal, lit windows/LEDs (unlit shader, per-window on/off), and glass. Status rings
// for every building live in one instanced layer. Undiscovered systems are dark hulks;
// compromised ones burn; maintenance spins an amber ring; isolated ones go blue and dim.

const panel = panelMaps(), brushed = brushedMaps();
const matteMat = new THREE.MeshStandardMaterial({ vertexColors: true, color: 0x6a6d78, roughness: 0.75, metalness: 0.05, roughnessMap: tex(panel.rough, { repeat: 2 }), normalMap: tex(panel.normal, { repeat: 2 }), normalScale: new THREE.Vector2(0.9, 0.9) });
const metalMat = new THREE.MeshStandardMaterial({ vertexColors: true, color: 0x7c8090, roughness: 0.38, metalness: 0.85, roughnessMap: tex(brushed.rough, { repeat: 1 }), normalMap: tex(brushed.normal, { repeat: 1 }), normalScale: new THREE.Vector2(0.3, 0.3) });
const lightsMat = new THREE.MeshBasicMaterial({ vertexColors: true, color: new THREE.Color(1.2, 1.2, 1.2) });
const glassMat = new THREE.MeshPhysicalMaterial({ color: 0x9fb4d8, roughness: 0.15, metalness: 0.1, transparent: true, opacity: 0.38, transmission: 0, clearcoat: 1, clearcoatRoughness: 0.15, envMapIntensity: 1.0 });
const hulkMat = new THREE.MeshStandardMaterial({ color: 0x17171b, roughness: 1, metalness: 0 });
const smokeTex = radialTexture('rgba(70,70,74,0.9)', 'rgba(70,70,74,0)');
const scorchTex = radialTexture('rgba(8,6,6,0.95)', 'rgba(8,6,6,0)', 96);
// Hit rim: a view-dependent fresnel glow on a copy of the building's own geometry.
const rimMat = new THREE.ShaderMaterial({
  uniforms: { color: { value: new THREE.Color(0xff3a26) }, strength: { value: 0 } },
  vertexShader: 'varying vec3 vN; varying vec3 vV; void main(){ vec4 mv = modelViewMatrix * vec4(position, 1.0); vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }',
  fragmentShader: 'uniform vec3 color; uniform float strength; varying vec3 vN; varying vec3 vV; void main(){ float f = pow(1.0 - max(dot(normalize(vN), normalize(vV)), 0.0), 3.0); gl_FragColor = vec4(color * (0.35 + f * 2.2) * strength, (0.15 + f) * strength); }',
  transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.FrontSide,
});
const BURN = [1.0, 0.16, 0.08];

let currentTheme = null, themeVersion = 0, labelScale = 1;
// Labels keep a constant size on screen: the controls call this with the camera distance.
export function setLabelDistance(dist) { labelDist = dist; labelScale = Math.min(0.8, Math.max(0.45, 0.8 * dist / 41)); }
let labelDist = 41;
export function applyAssetTheme(t) {
  currentTheme = t; themeVersion++;
  matteMat.color.set(t.body); metalMat.color.set(t.appliance); glassMat.color.set(t.glass);
  const e = t.windowEmissive; lightsMat.color.setRGB(0.6 + e * 0.9, 0.6 + e * 0.9, 0.6 + e * 0.9);
  hulkMat.color.set(t.id === 'day' ? 0x3a3a40 : 0x17171b);
}

// ----- parts collector -----
const DARK = [0.34, 0.34, 0.38], MID = [0.62, 0.62, 0.66], WHITE = [1, 1, 1], ROOF = [0.5, 0.5, 0.54], DOOR = [0.22, 0.22, 0.26];
const LIT = [1.0, 0.9, 0.72], UNLIT = [0.05, 0.06, 0.08], LED_G = [0.4, 1.0, 0.5], LED_R = [1.0, 0.35, 0.3], LED_B = [0.5, 0.7, 1.0], SCREEN = [0.6, 0.8, 1.0];
class Parts {
  constructor(seed) { this.b = { matte: [], metal: [], lights: [], glass: [] }; this.windows = []; this.stripes = []; this.beaconRange = null; this.s = seed; }
  rnd() { this.s = (this.s * 1664525 + 1013904223) >>> 0; return this.s / 4294967296; }
  add(bucket, geom, x, y, z, color, rot = null) {
    const g = geom.index ? geom.toNonIndexed() : geom; if (rot) { g.rotateX(rot[0] || 0); g.rotateY(rot[1] || 0); g.rotateZ(rot[2] || 0); } g.translate(x, y, z);
    const n = g.attributes.position.count; const col = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { col[i * 3] = color[0]; col[i * 3 + 1] = color[1]; col[i * 3 + 2] = color[2]; }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    this.b[bucket].push(g); return g;
  }
  window(x, y, z, w, h, rot) { const g = this.add('lights', new THREE.PlaneGeometry(w, h), x, y, z, UNLIT, rot); this.windows.push({ g, on: this.rnd() }); }
  stripe(geom, x, y, z) { const g = this.add('lights', geom, x, y, z, UNLIT); this.stripes.push(g); }
  beacon(x, y, z) { const g = this.add('lights', new THREE.SphereGeometry(0.11, 10, 8), x, y, z, [0.5, 0.5, 0.5]); this.beaconGeom = g; }
  build() {
    const group = new THREE.Group();
    const out = {};
    const mk = (key, mat, shadow = true) => { if (!this.b[key].length) return; const m = new THREE.Mesh(mergeGeometries(this.b[key]), mat); m.castShadow = shadow; m.receiveShadow = shadow; group.add(m); out[key] = m; };
    mk('matte', matteMat); mk('metal', metalMat); mk('lights', lightsMat, false); mk('glass', glassMat, false);
    // Window and beacon vertex ranges inside the merged lights geometry.
    let off = 0; const ranges = [];
    for (const g of this.b.lights) { const n = g.attributes.position.count; ranges.push([g, off, n]); off += n; }
    out.windowRanges = this.windows.map((w) => { const r = ranges.find((x) => x[0] === w.g); return { start: r[1], count: r[2], on: w.on }; });
    out.stripeRanges = this.stripes.map((g) => { const r = ranges.find((x) => x[0] === g); return { start: r[1], count: r[2] }; });
    const br = this.beaconGeom ? ranges.find((x) => x[0] === this.beaconGeom) : null;
    out.beaconRange = br ? { start: br[1], count: br[2] } : null;
    const mr = this.mastGeom ? ranges.find((x) => x[0] === this.mastGeom) : null;
    out.mastRange = mr ? { start: mr[1], count: mr[2] } : null;
    out.vent = this.vent || null;
    return { group, ...out };
  }
}

function serverTower(P, w, h, d, opts = {}) {
  P.add('matte', new THREE.BoxGeometry(w, h, d), 0, h / 2, 0, WHITE);
  // Plinth and door.
  P.add('matte', new THREE.BoxGeometry(w + 0.1, 0.12, d + 0.1), 0, 0.06, 0, DARK);
  P.add('matte', new THREE.BoxGeometry(0.34, 0.5, 0.04), 0.25, 0.25, d / 2 + 0.01, DOOR);
  P.add('metal', new THREE.BoxGeometry(0.4, 0.56, 0.02), 0.25, 0.28, d / 2 + 0.005, MID);
  // Ground-floor lobby (darker, glazed) and a floor band between every window row.
  P.add('matte', new THREE.BoxGeometry(w + 0.02, 0.34, d + 0.02), 0, 0.17, 0, [0.42, 0.42, 0.46]);
  P.add('glass', new THREE.BoxGeometry(w + 0.03, 0.26, d + 0.03), 0, 0.2, 0, WHITE);
  // Window rows on four faces.
  const rows = Math.max(1, Math.floor((h - 0.55) / 0.36)), cols = Math.max(2, Math.round(w / 0.36));
  for (let r = 0; r < rows; r++) P.add('matte', new THREE.BoxGeometry(w + 0.02, 0.05, d + 0.02), 0, 0.37 + r * 0.36, 0, [0.5, 0.5, 0.54]);
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const y = 0.55 + r * 0.36, u = (c - (cols - 1) / 2) * (w / cols);
    // Dirt streaks under a third of the front-face windows.
    if (P.rnd() < 0.33) P.add('matte', new THREE.PlaneGeometry(w / cols * 0.3, 0.16), u + (P.rnd() - 0.5) * 0.08, y - 0.17, d / 2 + 0.008, [0.55, 0.54, 0.52]);
    P.window(u, y, d / 2 + 0.012, w / cols * 0.55, 0.2, null);
    P.window(u, y, -d / 2 - 0.012, w / cols * 0.55, 0.2, [0, Math.PI, 0]);
    P.window(w / 2 + 0.012, y, u, d / cols * 0.55, 0.2, [0, Math.PI / 2, 0]);
    P.window(-w / 2 - 0.012, y, u, d / cols * 0.55, 0.2, [0, -Math.PI / 2, 0]);
  }
  // Grime band at the base, and edge trims so corners catch light.
  P.add('matte', new THREE.BoxGeometry(w + 0.015, 0.16, d + 0.015), 0, 0.2, 0, [0.62, 0.6, 0.58]);
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) P.add('metal', new THREE.BoxGeometry(0.035, h - 0.1, 0.035), sx * w / 2, h / 2, sz * d / 2, MID);
  // Roof: parapet, HVAC units, mast, cable tray, and seeded clutter (water tank, dish, railings).
  P.add('matte', new THREE.BoxGeometry(w + 0.06, 0.08, d + 0.06), 0, h + 0.04, 0, ROOF);
  const r0 = P.rnd(), r1 = P.rnd();
  if (r0 < 0.4) { P.add('metal', new THREE.CylinderGeometry(0.16, 0.16, 0.34, 12), -w / 4 + 0.05, h + 0.25, d / 4, MID); P.add('metal', new THREE.ConeGeometry(0.17, 0.08, 12), -w / 4 + 0.05, h + 0.46, d / 4, DARK); for (const [lx, lz] of [[-0.1, -0.1], [0.1, -0.1], [-0.1, 0.1], [0.1, 0.1]]) P.add('metal', new THREE.CylinderGeometry(0.012, 0.012, 0.16, 4), -w / 4 + 0.05 + lx, h + 0.08, d / 4 + lz, DARK); }
  else if (r0 < 0.7) { P.add('metal', new THREE.SphereGeometry(0.16, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2.4), w / 4 - 0.1, h + 0.2, d / 4, MID, [-1.1, 0.6, 0]); P.add('metal', new THREE.CylinderGeometry(0.02, 0.02, 0.22, 5), w / 4 - 0.1, h + 0.11, d / 4, DARK); }
  if (r1 < 0.5) for (const [x, z, lx, lz] of [[0, d / 2 - 0.02, w - 0.1, 0.02], [0, -d / 2 + 0.02, w - 0.1, 0.02], [w / 2 - 0.02, 0, 0.02, d - 0.1], [-w / 2 + 0.02, 0, 0.02, d - 0.1]]) P.add('metal', new THREE.BoxGeometry(lx, 0.02, lz), x, h + 0.3, z, DARK);
  P.add('metal', new THREE.BoxGeometry(0.42, 0.26, 0.42), -w / 4, h + 0.21, -d / 4, MID);
  P.add('metal', new THREE.CylinderGeometry(0.14, 0.14, 0.04, 12), -w / 4, h + 0.36, -d / 4, DARK);
  P.add('metal', new THREE.BoxGeometry(0.3, 0.2, 0.5), w / 4, h + 0.18, d / 5, MID);
  if (opts.mast !== false) { P.add('metal', new THREE.CylinderGeometry(0.02, 0.03, 0.9, 6), w / 3, h + 0.5, -d / 3, DARK); P.mastGeom = P.add('lights', new THREE.SphereGeometry(0.05, 6, 5), w / 3, h + 0.97, -d / 3, LED_R); }
  P.vent = [-w / 4, h + 0.4, -d / 4];
  P.add('metal', new THREE.BoxGeometry(w * 0.8, 0.05, 0.12), 0, 0.2, -d / 2 - 0.08, MID);
}
function ledRow(P, x0, y, z, n, dx, colors) { for (let i = 0; i < n; i++) P.add('lights', new THREE.BoxGeometry(0.07, 0.04, 0.02), x0 + i * dx, y, z, colors[i % colors.length]); }

const STRIPE = [1.0, 0.78, 0.25];
function pad(P) {
  P.add('matte', new THREE.BoxGeometry(1.96, 0.1, 1.96), 0, 0.05, 0, [0.28, 0.28, 0.31]);
  for (const [x, z, w, d] of [[0, -0.96, 1.94, 0.025], [0, 0.96, 1.94, 0.025], [-0.96, 0, 0.025, 1.94], [0.96, 0, 0.025, 1.94]]) P.stripe(new THREE.BoxGeometry(w, 0.012, d), x, 0.106, z);
}
function buildShape(kind, crit, seed) {
  const P = new Parts(seed);
  pad(P);
  const h = 1.1 + crit * 0.5;
  switch (kind) {
    case 'firewall': case 'vpn': {
      P.add('metal', new THREE.BoxGeometry(1.7, 0.58, 1.2), 0, 0.29, 0, WHITE);
      P.add('matte', new THREE.BoxGeometry(1.76, 0.06, 1.26), 0, 0.03, 0, DARK);
      for (const z of [-0.36, -0.12, 0.12, 0.36]) P.add('matte', new THREE.BoxGeometry(1.55, 0.05, 0.05), 0, 0.62, z, DARK);
      ledRow(P, -0.55, 0.42, 0.61, 6, 0.22, [LED_G, LED_G, LED_B, LED_G, LED_R, LED_G]);
      for (let i = 0; i < 4; i++) P.add('matte', new THREE.BoxGeometry(0.14, 0.12, 0.02), 0.2 + i * 0.17, 0.22, 0.61, DOOR);
      P.add('lights', new THREE.PlaneGeometry(0.34, 0.16), -0.55, 0.22, 0.61, SCREEN);
      P.add('metal', new THREE.CylinderGeometry(0.26, 0.26, 0.06, 6), 0.55, 0.62, -0.3, MID);
      break;
    }
    case 'router': {
      P.add('metal', new THREE.BoxGeometry(1.4, 0.48, 1.1), 0, 0.24, 0, WHITE);
      P.add('matte', new THREE.BoxGeometry(1.46, 0.05, 1.16), 0, 0.025, 0, DARK);
      for (const dx of [-0.45, 0, 0.45]) { P.add('metal', new THREE.CylinderGeometry(0.03, 0.035, 1.05, 6), dx, 1.0, -0.4, DARK); P.add('lights', new THREE.SphereGeometry(0.05, 6, 6), dx, 1.55, -0.4, LED_R); }
      ledRow(P, -0.5, 0.36, 0.56, 8, 0.14, [LED_G, LED_G, LED_G, LED_B]);
      for (let i = 0; i < 6; i++) P.add('matte', new THREE.BoxGeometry(0.1, 0.1, 0.02), -0.45 + i * 0.18, 0.16, 0.56, DOOR);
      break;
    }
    case 'camera': {
      P.add('metal', new THREE.CylinderGeometry(0.06, 0.1, 1.9, 8), 0, 0.95, 0, DARK);
      P.add('metal', new THREE.BoxGeometry(0.5, 0.06, 0.06), 0.2, 1.88, 0, DARK);
      P.add('metal', new THREE.CylinderGeometry(0.2, 0.2, 0.12, 14), 0.42, 1.82, 0, MID);
      P.add('glass', new THREE.SphereGeometry(0.18, 14, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), 0.42, 1.78, 0, WHITE);
      P.add('lights', new THREE.SphereGeometry(0.03, 6, 5), 0.42, 1.7, 0.08, LED_R);
      P.add('matte', new THREE.BoxGeometry(0.9, 0.34, 0.9), 0, 0.17, 0, DARK);
      P.add('lights', new THREE.PlaneGeometry(0.4, 0.14), 0, 0.2, 0.46, SCREEN);
      break;
    }
    case 'ot': {
      P.add('metal', new THREE.CylinderGeometry(0.6, 0.6, 1.45, 24), 0, 0.72, 0, WHITE);
      P.add('metal', new THREE.SphereGeometry(0.6, 24, 8, 0, Math.PI * 2, 0, Math.PI / 2), 0, 1.45, 0, WHITE);
      for (const y of [0.35, 0.95]) P.add('metal', new THREE.TorusGeometry(0.61, 0.03, 6, 32), 0, y, 0, DARK, [Math.PI / 2, 0, 0]);
      P.add('metal', new THREE.CylinderGeometry(0.08, 0.08, 1.7, 8), 0, 1.2, 0.62, MID, [0, 0, Math.PI / 2]);
      P.add('metal', new THREE.CylinderGeometry(0.08, 0.08, 0.7, 8), 0.85, 0.9, 0.62, MID);
      P.add('metal', new THREE.TorusGeometry(0.12, 0.025, 6, 16), 0.85, 0.75, 0.75, [0.9, 0.2, 0.2], [Math.PI / 2, 0, 0]);
      for (const x of [-0.9, -0.4, 0.1]) P.add('metal', new THREE.CylinderGeometry(0.02, 0.02, 0.6, 5), x, 0.3, -0.8, MID);
      P.add('metal', new THREE.BoxGeometry(1.1, 0.03, 0.03), -0.4, 0.6, -0.8, MID);
      P.add('matte', new THREE.BoxGeometry(0.5, 0.95, 0.4), 0.7, 0.47, -0.5, DARK);
      P.add('lights', new THREE.SphereGeometry(0.05, 6, 6), 0.7, 0.98, -0.5, [1, 0.7, 0.2]);
      P.add('lights', new THREE.PlaneGeometry(0.28, 0.18), 0.7, 0.6, -0.29, SCREEN);
      break;
    }
    case 'db': {
      for (let i = 0; i < 3; i++) { P.add('metal', new THREE.CylinderGeometry(0.62, 0.62, 0.42, 28), 0, 0.21 + i * 0.48, 0, i % 2 ? MID : WHITE); P.add('matte', new THREE.TorusGeometry(0.62, 0.025, 6, 40), 0, 0.44 + i * 0.48, 0, DARK, [Math.PI / 2, 0, 0]); }
      for (let i = 0; i < 3; i++) P.add('lights', new THREE.TorusGeometry(0.63, 0.012, 4, 48), 0, 0.3 + i * 0.48, 0, LED_B, [Math.PI / 2, 0, 0]);
      P.add('matte', new THREE.BoxGeometry(1.5, 0.08, 1.5), 0, 0.04, 0, DARK);
      break;
    }
    case 'nas': {
      P.add('metal', new THREE.BoxGeometry(1.0, 0.8, 0.9), 0, 0.4, 0, WHITE);
      P.add('matte', new THREE.BoxGeometry(1.06, 0.06, 0.96), 0, 0.03, 0, DARK);
      for (let i = 0; i < 4; i++) { P.add('matte', new THREE.BoxGeometry(0.17, 0.55, 0.04), -0.3 + i * 0.2, 0.4, 0.46, DOOR); P.add('lights', new THREE.BoxGeometry(0.06, 0.04, 0.02), -0.3 + i * 0.2, 0.7, 0.47, i === 2 ? LED_R : LED_G); }
      break;
    }
    case 'endpoint': {
      for (const [x, z] of [[-0.45, -0.4], [0.35, -0.45], [-0.4, 0.4], [0.45, 0.35], [0, 0]]) {
        P.add('matte', new THREE.BoxGeometry(0.5, 0.05, 0.4), x, 0.32, z, MID);
        for (const [lx, lz] of [[-0.2, -0.15], [0.2, -0.15], [-0.2, 0.15], [0.2, 0.15]]) P.add('metal', new THREE.CylinderGeometry(0.015, 0.015, 0.3, 5), x + lx, 0.15, z + lz, DARK);
        P.add('matte', new THREE.BoxGeometry(0.34, 0.24, 0.03), x, 0.5, z - 0.12, DARK);
        P.add('lights', new THREE.PlaneGeometry(0.3, 0.2), x, 0.5, z - 0.1, SCREEN);
      }
      break;
    }
    case 'web': case 'api': {
      P.add('glass', new THREE.BoxGeometry(1.3, h, 1.3), 0, h / 2, 0, WHITE);
      P.add('matte', new THREE.BoxGeometry(0.9, h - 0.1, 0.9), 0, h / 2 - 0.05, 0, DARK);
      const rows = Math.floor((h - 0.4) / 0.36);
      for (let r = 0; r < rows; r++) for (const face of [0, 1, 2, 3]) { const y = 0.45 + r * 0.36; const [x, z, ry] = [[0, 0.46, 0], [0, -0.46, Math.PI], [0.46, 0, Math.PI / 2], [-0.46, 0, -Math.PI / 2]][face]; P.window(x, y, z, 0.7, 0.2, [0, ry, 0]); }
      for (let y = 0.4; y <= h + 0.01; y += 0.36) P.add('metal', new THREE.BoxGeometry(1.34, 0.035, 1.34), 0, Math.min(y, h), 0, MID);
      for (const [x, z] of [[-0.66, -0.66], [0.66, -0.66], [-0.66, 0.66], [0.66, 0.66]]) P.add('metal', new THREE.BoxGeometry(0.05, h, 0.05), x, h / 2, z, MID);
      P.add('matte', new THREE.BoxGeometry(1.4, 0.1, 1.4), 0, h + 0.05, 0, ROOF);
      P.add('metal', new THREE.BoxGeometry(0.4, 0.22, 0.4), 0.3, h + 0.21, -0.3, MID);
      P.add('matte', new THREE.BoxGeometry(1.4, 0.1, 1.4), 0, 0.05, 0, DARK);
      break;
    }
    case 'ai': {
      P.add('metal', new THREE.BoxGeometry(1.2, h * 0.7, 1.2), 0, h * 0.35, 0, WHITE);
      P.add('matte', new THREE.BoxGeometry(1.26, 0.06, 1.26), 0, 0.03, 0, DARK);
      for (let i = 0; i < 5; i++) { P.add('matte', new THREE.BoxGeometry(1.0, 0.06, 0.02), 0, 0.2 + i * 0.14, 0.61, DOOR); ledRow(P, -0.4, 0.2 + i * 0.14, 0.62, 5, 0.2, [LED_G, LED_B]); }
      for (const [x, z] of [[-0.35, -0.35], [0.35, -0.35], [-0.35, 0.35], [0.35, 0.35]]) P.add('metal', new THREE.CylinderGeometry(0.12, 0.12, 0.05, 10), x, h * 0.7 + 0.03, z, DARK);
      break;
    }
    case 'mail': { serverTower(P, 1.3, h, 1.3, { mast: false }); P.add('metal', new THREE.ConeGeometry(0.32, 0.22, 18, 1, true), 0.3, h + 0.4, 0.3, MID, [-Math.PI * 0.42, 0, 0]); P.add('metal', new THREE.CylinderGeometry(0.03, 0.03, 0.7, 6), 0.3, h + 0.3, 0.3, DARK); break; }
    default: serverTower(P, 1.3, h, 1.3);
  }
  return P.build();
}

// Shared status-ring layer: one draw call for every building's ring plus one for spin rings.
const MAXR = 64;
const ringLayer = new THREE.InstancedMesh(new THREE.RingGeometry(1.15, 1.3, 48), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.85, side: THREE.DoubleSide, depthWrite: false }), MAXR);
const spinLayer = new THREE.InstancedMesh(new THREE.RingGeometry(1.34, 1.44, 48, 1, 0, Math.PI * 1.3), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.9, side: THREE.DoubleSide, depthWrite: false }), MAXR);
ringLayer.frustumCulled = spinLayer.frustumCulled = false;
const steamTex = radialTexture('rgba(220,222,230,0.55)', 'rgba(220,222,230,0)', 48);
const steamLayer = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: steamTex, transparent: true, opacity: 0.35, depthWrite: false }), 160);
steamLayer.frustumCulled = false; steamLayer.userData.noAO = true; steamLayer.renderOrder = 6;
let steamN = 0;
let ringN = 0, spinN = 0, layerScene = null;
export function attachAssetLayers(scene) { if (layerScene === scene) return; layerScene = scene; scene.add(ringLayer, spinLayer, steamLayer); }
const _o = new THREE.Object3D(), _c = new THREE.Color();
function pushRing(layer, idx, x, y, z, rz, scale, color, opacity) {
  _o.position.set(x, y, z); _o.rotation.set(-Math.PI / 2, 0, rz); _o.scale.setScalar(scale); _o.updateMatrix();
  layer.setMatrixAt(idx, _o.matrix); _c.set(color).multiplyScalar(opacity); layer.setColorAt(idx, _c);
}
export function flushAssetLayers() {
  ringLayer.count = ringN; spinLayer.count = spinN; steamLayer.count = steamN; ringN = spinN = steamN = 0;
  for (const l of [ringLayer, spinLayer, steamLayer]) { l.instanceMatrix.needsUpdate = true; if (l.instanceColor) l.instanceColor.needsUpdate = true; }
}

const ICON_KIND = { firewall: 'firewall', vpn: 'firewall', router: 'router', camera: 'camera', db: 'db', ot: 'ot', mail: 'mail', web: 'web', api: 'web', endpoint: 'endpoint', nas: 'nas', file: 'nas', ai: 'ai', ad: 'ad' };
function hash(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }

export class AssetView {
  constructor(asset, scene) {
    this.asset = asset;
    attachAssetLayers(scene);
    this.group = new THREE.Group();
    this.group.position.set(asset.x + 0.5, 0, asset.y + 0.5);
    this.built = buildShape(asset.kind, asset.crit, hash(asset.id + asset.name));
    this.shape = this.built.group;
    this.group.add(this.shape);
    if (asset.kind === 'ai') { this.orb = new THREE.Mesh(new THREE.IcosahedronGeometry(0.4, 1), new THREE.MeshStandardMaterial({ color: 0x111111, emissive: 0xdfe6ff, emissiveIntensity: 0.9, roughness: 0.3, wireframe: true })); this.orb.position.y = (1.1 + asset.crit * 0.5) * 0.7 + 0.55; this.group.add(this.orb); }
    this.light = new THREE.PointLight(C.accent, 0, 4.5, 2);
    this.light.position.set(0, 1.4, 0);
    this.group.add(this.light);
    this.bar = new THREE.Group();
    const bg = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 0.13), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.65, depthTest: false }));
    this.barFill = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 0.13), new THREE.MeshBasicMaterial({ color: C.green, depthTest: false }));
    this.bar.add(bg, this.barFill);
    this.bar.position.y = 2.75; this.bar.visible = false; this.bar.renderOrder = 19;
    this.group.add(this.bar);
    // Hit feedback: an additive red shell that flashes on an exploit, and a scorch mark on
    // the pad that darkens with every hit. Both created lazily on the first hit.
    this.flash = 0; this.shell = null; this.scorch = null; this.scorchOp = 0;
    this.smoke = [];
    for (let i = 0; i < 7; i++) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: smokeTex, transparent: true, opacity: 0, depthWrite: false }));
      s.userData.t = i / 7; s.scale.setScalar(0.5); s.visible = false;
      this.group.add(s); this.smoke.push(s);
    }
    this.label = null; this.labelKey = null;
    this.beaconColor = null; this.themeSeen = -1;
    this.seedPhase = (hash(asset.id) % 100) / 100;
    scene.add(this.group);
    this.group.userData.assetId = asset.id;
    this.setHulk(!asset.discovered);
    this.sync(0);
  }
  // Called by the effects layer when an exploit lands here.
  hit(strength = 1) {
    if (!this.shell) {
      const src = this.built.matte || this.built.metal;
      this.shell = new THREE.Mesh(src.geometry, rimMat.clone());
      this.shell.scale.setScalar(1.015); this.shell.userData.noAO = true; this.shell.renderOrder = 5;
      this.group.add(this.shell);
      this.scorch = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 2.4), new THREE.MeshBasicMaterial({ map: scorchTex, transparent: true, opacity: 0, depthWrite: false }));
      this.scorch.rotation.x = -Math.PI / 2; this.scorch.position.y = 0.112; this.scorch.userData.noAO = true; this.scorch.renderOrder = 2;
      this.group.add(this.scorch);
    }
    this.flash = Math.max(this.flash, 0.45 * strength);
    for (const w of this.built.windowRanges || []) this.paintRange(w, [1.6, 0.25, 0.15]);
    this.flashWindows = true;
    this.scorchOp = Math.min(0.85, this.scorchOp + 0.22 * strength);
    this.scorch.material.opacity = this.scorchOp;
    this.scorch.rotation.z = Math.random() * 6.28;
  }
  setHulk(on) {
    this.shape.traverse((m) => { if (m.isMesh) { m.userData.mat = m.userData.mat || m.material; m.material = on ? hulkMat : m.userData.mat; } });
    if (this.built.lights) this.built.lights.visible = !on;
    if (this.built.glass) this.built.glass.visible = !on;
    this.shape.scale.setScalar(on ? 0.94 : 1);
  }
  paintRange(range, rgb) {
    const attr = this.built.lights && this.built.lights.geometry.attributes.color; if (!attr || !range) return;
    for (let i = range.start; i < range.start + range.count; i++) attr.setXYZ(i, rgb[0], rgb[1], rgb[2]);
    attr.needsUpdate = true;
  }
  applyWindows(theme) {
    const lit = theme ? theme.windowLit : 0.6;
    const litC = theme && theme.windowLitColor ? theme.windowLitColor : LIT, unlitC = theme && theme.windowUnlitColor ? theme.windowUnlitColor : UNLIT;
    for (const w of this.built.windowRanges || []) { const k = 0.55 + (w.on / lit) * 0.45; this.paintRange(w, w.on < lit ? [litC[0] * k, litC[1] * k, litC[2] * k] : unlitC); }
  }
  sync(t, selected = false, theme = null) {
    theme = theme || currentTheme;
    const a = this.asset;
    if (a.discovered && this.hulk !== false) { this.setHulk(false); this.hulk = false; }
    if (!a.discovered && this.hulk !== true) { this.setHulk(true); this.hulk = true; }
    if (this.themeSeen !== themeVersion) { this.themeSeen = themeVersion; this.applyWindows(theme); this.beaconColor = null; this.burnt = false; }
    const burnNow = a.discovered && (a.state === 'compromised' || a.state === 'responding');
    if (burnNow !== !!this.burnt) { this.burnt = burnNow; if (burnNow) { for (const w of this.built.windowRanges || []) this.paintRange(w, BURN); } else this.applyWindows(theme); }
    const themeId = theme ? theme.id : 'night';
    const alarm = a.discovered && a.state === 'compromised';
    const key = (a.discovered ? `${a.name}|${a.product}` : 'unmanaged') + '|' + themeId + (alarm ? '|alarm' : '');
    if (key !== this.labelKey) {
      if (this.label) this.group.remove(this.label);
      const lb = alarm ? 'rgba(255,59,48,0.9)' : theme ? theme.labelBg : 'rgba(14,14,16,0.78)', lc = alarm ? '#ffffff' : theme ? theme.labelColor : '#f0f0f4';
      this.label = a.discovered
        ? labelSprite(a.name, ICON_KIND[a.kind] || 'server', { size: 22, color: lc, bg: lb, scale: 0.62 })
        : labelSprite('unmanaged', 'server', { size: 20, color: '#8a8a90', bg: lb, scale: 0.62, mono: true });
      this.label.position.set(0, 2.35, 0);
      this.label.userData.base = this.label.scale.clone();
      this.group.add(this.label);
      this.labelKey = key;
    }
    if (this.label && this.label.userData.base) { const b = this.label.userData.base; const pulse = alarm ? 1 + Math.sin(t * 8) * 0.06 : 1; this.label.scale.set(b.x * labelScale * pulse, b.y * labelScale * pulse, 1); this.label.position.y = 2.35 - (1 - labelScale) * 0.6; this.label.material.opacity = (a.state === 'isolated' ? 0.6 : 1) * (labelDist > 34 ? 0.6 : 1); }
    if (this.orb) { this.orb.rotation.y = t * 0.8; this.orb.visible = a.discovered; }
    // Aircraft-warning light on the mast blinks about once a second; steam drifts off the roof vent.
    if (this.built.mastRange && a.discovered) { const on = (Math.floor(t * 1.1 + (this.seedPhase || 0)) % 2) === 0; if (on !== this.mastOn) { this.mastOn = on; this.paintRange(this.built.mastRange, on ? [1.6, 0.25, 0.2] : [0.25, 0.08, 0.06]); } }
    if (this.built.vent && a.discovered && a.state !== 'isolated' && this.cameraQuat) {
      for (let i = 0; i < 3; i++) {
        if (steamN >= 160) break;
        const k = ((t * 0.35 + i / 3 + (this.seedPhase || 0)) % 1);
        _o.position.set(this.group.position.x + this.built.vent[0] + Math.sin(t * 0.7 + i) * 0.08 * k, this.built.vent[1] + k * 1.1, this.group.position.z + this.built.vent[2]);
        _o.quaternion.copy(this.cameraQuat); _o.scale.setScalar(0.25 + k * 0.7); _o.updateMatrix();
        steamLayer.setMatrixAt(steamN, _o.matrix); _c.setScalar(1 - k); steamLayer.setColorAt(steamN, _c); steamN++;
      }
    }
    if (this.shell) { const dt = this.lastT === undefined ? 0.016 : Math.min(0.1, t - this.lastT); this.flash = Math.max(0, this.flash - dt); this.shell.material.uniforms.strength.value = this.flash > 0 ? Math.min(1, this.flash * 2.5) : 0; this.shell.visible = this.flash > 0; if (this.flashWindows && this.flash <= 0) { this.flashWindows = false; if (this.burnt) { for (const w of this.built.windowRanges || []) this.paintRange(w, BURN); } else this.applyWindows(theme); } }
    this.lastT = t;
    const known = a.knownVulns && a.knownVulns.size > 0;
    const unknownStatus = a.discovered && a.knownVulns === null;
    let ring = C.faint, ringOp = 0.6, beacon = [0.5, 0.5, 0.55], glow = 0, glowColor = C.accent;
    const busy = a.state === 'maintenance' || a.state === 'replacing' || a.state === 'responding' || (a.job && a.job.kind === 'edr');
    if (!a.discovered) { ring = 0x2a2a2a; ringOp = 0.3; }
    else if (a.state === 'compromised') { ring = C.danger; ringOp = 0.95; beacon = [1.4, 0.2, 0.15]; glow = 2.8 + Math.sin(t * 6) * 1.3; }
    else if (a.state === 'down') { ring = C.danger; ringOp = 0.7; beacon = [1.2, 0.7, 0.2]; glow = 0.8; }
    else if (a.state === 'responding') { ring = C.accent2; ringOp = 0.8; beacon = [1.2, 0.5, 0.3]; glow = 0.6; glowColor = C.accent2; }
    else if (a.state === 'isolated') { ring = C.blue; ringOp = 0.55; beacon = [0.4, 0.55, 1.2]; glow = 0.5; glowColor = C.blue; }
    else if (a.state === 'maintenance' || a.state === 'replacing') { ring = C.amber; ringOp = 0.8; beacon = [1.2, 0.8, 0.2]; }
    else if (known) { ring = C.amber; ringOp = 0.75; beacon = [1.2, 0.8, 0.2]; }
    else if (unknownStatus) { ring = 0x4a4a50; ringOp = 0.6; beacon = [0.6, 0.6, 0.65]; }
    else { ring = 0x3f7b4c; ringOp = 0.55; beacon = [0.3, 1.1, 0.45]; }
    if (selected && a.state === 'ok' && !known) ring = 0xffffff;
    const bk = beacon.join(',');
    if (bk !== this.beaconColor) { this.beaconColor = bk; this.paintRange(this.built.beaconRange, beacon); }
    const nominal = a.discovered && a.state === 'ok' && !known && !unknownStatus;
    if (nominal !== this.wasNominal) { this.wasNominal = nominal; for (const r of this.built.stripeRanges || []) this.paintRange(r, nominal ? [0.28, 0.28, 0.31] : STRIPE); }
    if ((!nominal || selected) && ringN < MAXR) pushRing(ringLayer, ringN++, this.group.position.x, 0.06, this.group.position.z, 0, selected ? 1 + Math.sin(t * 5) * 0.03 : 1, ring, selected ? 1 : ringOp);
    pushFootprint(this.group.position.x, this.group.position.z, 3.1, a.discovered ? 0.5 : 0.35);
    if (busy && spinN < MAXR) pushRing(spinLayer, spinN++, this.group.position.x, 0.065, this.group.position.z, t * 2.2, 1, a.state === 'responding' ? C.accent2 : C.amber, 1);
    this.light.color.set(glowColor); this.light.intensity = glow;
    const dim = a.state === 'isolated' ? 0.45 : 1;
    if (this.dim !== dim) { this.dim = dim; this.shape.scale.y = dim < 1 ? 0.96 : 1; if (this.built.lights) this.built.lights.visible = dim >= 1 && a.discovered; }
    const burning = a.discovered && a.state === 'compromised';
    for (const s of this.smoke) {
      if (!burning) { s.visible = false; continue; }
      s.visible = true;
      s.userData.t = (s.userData.t + 0.004) % 1;
      const k = s.userData.t;
      s.position.set(0.2 * Math.sin(k * 9 + t), 1.0 + k * 2.6, 0.2 * Math.cos(k * 7));
      s.scale.setScalar(0.45 + k * 1.5);
      s.material.opacity = (1 - k) * 0.5;
    }
    const showBar = a.discovered && a.integrity < 100 && a.state !== 'isolated';
    this.bar.visible = showBar;
    if (showBar) {
      const f = Math.max(0, a.integrity) / 100;
      this.barFill.scale.x = Math.max(0.001, f); this.barFill.position.x = -(1 - f) * 0.75;
      this.barFill.material.color.set(f > 0.5 ? C.green : f > 0.25 ? C.amber : C.danger);
      if (this.cameraQuat) this.bar.quaternion.copy(this.cameraQuat);
    }
  }
}
