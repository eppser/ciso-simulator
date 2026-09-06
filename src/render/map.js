import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { GRID, SPAWNS, ZONES, NO_BUILD_X } from '../sim/grid.js';
import { C } from './palette.js';
import { textSprite } from './text.js';
import { THEMES, loadThemeId } from './themes.js';
import { concreteMaps, asphaltMaps, tex, noiseCanvas } from './textures.js';
import { pushContact, pushPool } from './decals.js';
const THEME0 = THEMES[loadThemeId()];

// The campus: a PBR concrete ground with painted zone bands, asphalt roads with markings and
// curbs, the demarcation and hatched no-build strip, three uplink gates, and off-cell props
// (trees, lamp posts, parked vehicles, manhole covers). Nothing here blocks a grid cell.
// `applyTheme` repaints the overlay and retints materials for a theme switch.

function seeded(seed) { let s = seed; return () => { s = (s * 16807) % 2147483647; return s / 2147483647; }; }
const PX = 44;

// Service roads run down cell columns that no organisation places a system on (7, 18, 23),
// so no road ever passes under a building; in cell units (x is the left edge).
const ROAD_COLS = [7, 18, 23];
function roadRects() { return ROAD_COLS.map((c) => ({ x: c - 0.32, y: -0.5, w: 0.64, h: GRID.h })); }

function paintOverlay(ctx, t) {
  const g = t.ground;
  const W = GRID.w * PX, H = GRID.h * PX;
  ctx.clearRect(0, 0, W, H);
  // Concrete base tiled from the generated map, tinted per theme.
  const con = concreteMaps();
  const pat = ctx.createPattern(con.albedo, 'repeat');
  ctx.fillStyle = pat; ctx.fillRect(0, 0, W, H);
  ctx.globalCompositeOperation = 'multiply';
  ctx.fillStyle = `rgb(${Math.round(255 * g.tint[0])},${Math.round(255 * g.tint[1])},${Math.round(255 * g.tint[2])})`; ctx.fillRect(0, 0, W, H);
  ctx.globalCompositeOperation = 'source-over';
  // Large-scale wear: two octaves of noise multiplied over the concrete at map scale.
  const wear = noiseCanvas(256, 31, 2, 3, 150, 255);
  ctx.globalCompositeOperation = 'multiply'; ctx.drawImage(wear, 0, 0, W, H); ctx.globalCompositeOperation = 'source-over';
  // Slab tiles: faint expansion joints every 2 cells.
  ctx.strokeStyle = 'rgba(0,0,0,0.22)'; ctx.lineWidth = 2;
  for (let x = 0; x <= GRID.w; x += 2) { ctx.beginPath(); ctx.moveTo(x * PX, 0); ctx.lineTo(x * PX, H); ctx.stroke(); }
  for (let y = 0; y <= GRID.h; y += 2) { ctx.beginPath(); ctx.moveTo(0, y * PX); ctx.lineTo(W, y * PX); ctx.stroke(); }
  // Zone bands.
  const tints = { internet: g.internet, dmz: g.dmz, internal: g.internal, core: g.core };
  for (const z of ZONES) { ctx.fillStyle = tints[z.id]; ctx.fillRect(z.x0 * PX, 0, (z.x1 - z.x0 + 1) * PX, H); }
  // Roads: asphalt pattern with edge lines and dashed centre.
  const asp = ctx.createPattern(asphaltMaps().albedo, 'repeat');
  for (const r of roadRects()) {
    const x = (r.x + 0.5) * PX, y = (r.y + 0.5) * PX, w = r.w * PX, h = r.h * PX;
    ctx.fillStyle = asp; ctx.fillRect(x, y, w, h);
    ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = t.id === 'day' ? '#a4a4a8' : '#8a8a94'; ctx.fillRect(x, y, w, h); ctx.globalCompositeOperation = 'source-over';
    ctx.strokeStyle = g.mark; ctx.lineWidth = 1.2;
    if (w < h) { ctx.beginPath(); ctx.moveTo(x + 3, y); ctx.lineTo(x + 3, y + h); ctx.moveTo(x + w - 3, y); ctx.lineTo(x + w - 3, y + h); ctx.stroke(); ctx.setLineDash([8, 14]); ctx.beginPath(); ctx.moveTo(x + w / 2, y); ctx.lineTo(x + w / 2, y + h); ctx.stroke(); }
    else { ctx.beginPath(); ctx.moveTo(x, y + 4); ctx.lineTo(x + w, y + 4); ctx.moveTo(x, y + h - 4); ctx.lineTo(x + w, y + h - 4); ctx.stroke(); ctx.setLineDash([10, 12]); ctx.beginPath(); ctx.moveTo(x, y + h / 2); ctx.lineTo(x + w, y + h / 2); ctx.stroke(); }
    ctx.setLineDash([]);
    // Lane arrows every few cells.
    ctx.fillStyle = g.mark;
    for (let ay = y + PX * 2; ay < y + h - PX; ay += PX * 5) { ctx.beginPath(); ctx.moveTo(x + w / 2, ay - 12); ctx.lineTo(x + w / 2 + 6, ay); ctx.lineTo(x + w / 2 + 2, ay); ctx.lineTo(x + w / 2 + 2, ay + 14); ctx.lineTo(x + w / 2 - 2, ay + 14); ctx.lineTo(x + w / 2 - 2, ay); ctx.lineTo(x + w / 2 - 6, ay); ctx.closePath(); ctx.fill(); }
    // Wear: darkened kerb cells on both sides, tyre streaks down the lanes, oil at a few spots.
    const kerbG = ctx.createLinearGradient(x - PX, 0, x, 0); kerbG.addColorStop(0, 'rgba(0,0,0,0)'); kerbG.addColorStop(1, 'rgba(0,0,0,0.22)');
    ctx.fillStyle = kerbG; ctx.fillRect(x - PX, y, PX, h);
    const kerbG2 = ctx.createLinearGradient(x + w, 0, x + w + PX, 0); kerbG2.addColorStop(0, 'rgba(0,0,0,0.22)'); kerbG2.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = kerbG2; ctx.fillRect(x + w, y, PX, h);
    ctx.strokeStyle = 'rgba(0,0,0,0.18)'; ctx.lineWidth = 5;
    for (const lx of [x + w * 0.3, x + w * 0.7]) { ctx.beginPath(); ctx.moveTo(lx, y); ctx.lineTo(lx, y + h); ctx.stroke(); }
    const rndO = seeded(Math.round(x));
    for (let i = 0; i < 4; i++) { const oy = y + rndO() * h, r = 8 + rndO() * 14; const og = ctx.createRadialGradient(x + w / 2, oy, 0, x + w / 2, oy, r); og.addColorStop(0, 'rgba(10,10,14,0.55)'); og.addColorStop(1, 'rgba(10,10,14,0)'); ctx.fillStyle = og; ctx.fillRect(x + w / 2 - r, oy - r, r * 2, r * 2); }
  }
  // Cell grid (subtle) and zone boundaries.
  ctx.strokeStyle = g.grid; ctx.lineWidth = 1;
  for (let x = 0; x <= GRID.w; x++) { ctx.beginPath(); ctx.moveTo(x * PX + 0.5, 0); ctx.lineTo(x * PX + 0.5, H); ctx.stroke(); }
  for (let y = 0; y <= GRID.h; y++) { ctx.beginPath(); ctx.moveTo(0, y * PX + 0.5); ctx.lineTo(W, y * PX + 0.5); ctx.stroke(); }
  // Demarcation and hatched no-build strip.
  ctx.strokeStyle = 'rgba(255,90,80,0.8)'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo((NO_BUILD_X + 1) * PX, 0); ctx.lineTo((NO_BUILD_X + 1) * PX, H); ctx.stroke();
  ctx.save(); ctx.beginPath(); ctx.rect(0, 0, (NO_BUILD_X + 1) * PX, H); ctx.clip();
  ctx.strokeStyle = 'rgba(170,180,210,0.07)'; ctx.lineWidth = 2;
  for (let i = -H; i < (NO_BUILD_X + 1) * PX; i += 40) { ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i + H, H); ctx.stroke(); }
  ctx.restore();
  // Painted zone names along the top and bottom kerbs, like floor markings.
  ctx.font = '700 15px Inter, system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  for (const z of ZONES) {
    const cx = ((z.x0 + z.x1 + 1) / 2) * PX;
    if (z.id === 'internet') { ctx.save(); ctx.translate(cx, H * 0.62); ctx.rotate(-Math.PI / 2); ctx.fillStyle = 'rgba(190,200,230,0.7)'; ctx.fillText(z.name.toUpperCase(), 0, 0); ctx.restore(); continue; }
    // Keep the painted names clear of the service roads.
    const lx = z.id === 'internal' ? 15.7 * PX : z.id === 'core' ? 26.4 * PX : cx;
    ctx.fillStyle = g.label;
    ctx.fillText(z.name.toUpperCase(), lx, PX * 0.55);
    ctx.fillText(z.name.toUpperCase(), lx, H - PX * 0.55);
  }
  // Manhole covers.
  const rnd = seeded(23);
  for (let i = 0; i < 9; i++) {
    const r = roadRects()[i % roadRects().length]; const cx = (r.x + 0.5 + r.w / 2) * PX, cy = (r.y + 0.5 + rnd() * r.h) * PX;
    ctx.fillStyle = 'rgba(30,30,32,0.9)'; ctx.beginPath(); ctx.arc(cx, cy, 7, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(120,120,125,0.7)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(cx, cy, 7, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.arc(cx, cy, 3.5, 0, Math.PI * 2); ctx.stroke();
  }
}

// ----- props, merged into as few meshes as possible -----
function treeGeom(rnd) {
  const parts = [];
  const s = 0.22 + rnd() * 0.14;
  const trunk = new THREE.CylinderGeometry(0.03, 0.05, 0.45, 6); trunk.translate(0, 0.22, 0); parts.push({ g: trunk, c: 'trunk' });
  const kind = rnd();
  if (kind < 0.55) { for (let i = 0; i < 3; i++) { const r = s * (1 - i * 0.22); const cone = new THREE.ConeGeometry(r, s * 1.1, 9); cone.translate(0, 0.4 + i * s * 0.62 + s * 0.5, 0); parts.push({ g: cone, c: i === 0 ? 'leafDark' : i === 2 ? 'leafLight' : 'leaf' }); } }
  else { const c1 = new THREE.IcosahedronGeometry(s * 0.95, 1); c1.translate(0.05, 0.42 + s * 0.9, 0); parts.push({ g: c1, c: 'leafDark' }); const c2 = new THREE.IcosahedronGeometry(s * 0.7, 1); c2.translate(-s * 0.4, 0.42 + s * 1.3, s * 0.2); parts.push({ g: c2, c: 'leafLight' }); const c3 = new THREE.IcosahedronGeometry(s * 0.6, 1); c3.translate(s * 0.45, 0.42 + s * 1.2, -s * 0.25); parts.push({ g: c3, c: 'leaf' }); }
  return parts;
}
function carGeom(rnd) {
  const parts = [];
  const body = new THREE.BoxGeometry(0.8, 0.18, 0.39); body.translate(0, 0.16, 0); parts.push({ g: body, c: 'car' + (rnd() * 4 | 0) });
  const cabin = new THREE.BoxGeometry(0.42, 0.16, 0.35); cabin.translate(-0.03, 0.32, 0); parts.push({ g: cabin, c: 'glass' });
  for (const [x, z] of [[-0.25, 0.2], [0.25, 0.2], [-0.25, -0.2], [0.25, -0.2]]) { const w = new THREE.CylinderGeometry(0.08, 0.08, 0.06, 10); w.rotateX(Math.PI / 2); w.translate(x, 0.08, z); parts.push({ g: w, c: 'tyre' }); }
  return parts;
}
function withColor(geom, rgb) {
  const g = geom.index ? geom.toNonIndexed() : geom; const n = g.attributes.position.count; const col = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { col[i * 3] = rgb[0]; col[i * 3 + 1] = rgb[1]; col[i * 3 + 2] = rgb[2]; }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3)); return g;
}
const PROP_COLORS = { trunk: [0.3, 0.23, 0.17], leaf: [0.2, 0.3, 0.21], leafLight: [0.3, 0.4, 0.28], leafDark: [0.14, 0.2, 0.15], car0: [0.75, 0.75, 0.78], car1: [0.2, 0.22, 0.3], car2: [0.55, 0.12, 0.1], car3: [0.85, 0.85, 0.85], glass: [0.3, 0.4, 0.55], tyre: [0.08, 0.08, 0.09], post: [0.35, 0.36, 0.4], kerb: [0.62, 0.62, 0.6] };

export function buildMap(scene, rig = null) {
  const c = document.createElement('canvas');
  c.width = GRID.w * PX; c.height = GRID.h * PX;
  const ctx = c.getContext('2d');
  const overlay = new THREE.CanvasTexture(c);
  overlay.colorSpace = THREE.SRGBColorSpace; overlay.anisotropy = 8;
  const con = concreteMaps();
  const rough = tex(con.rough, { repeat: 5 }); const normal = tex(con.normal, { repeat: 5 });
  overlay.anisotropy = 16; overlay.generateMipmaps = true; overlay.minFilter = THREE.LinearMipmapLinearFilter;
  const groundMat = new THREE.MeshStandardMaterial({ map: overlay, roughnessMap: rough, normalMap: normal, normalScale: new THREE.Vector2(0.35, 0.35), roughness: 1, metalness: 0.0 });
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(GRID.w, GRID.h), groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.position.set((GRID.w - 1) / 2, 0, (GRID.h - 1) / 2);
  ground.receiveShadow = true; ground.name = 'ground';
  scene.add(ground);

  // Raised slab with a bevelled kerb, and an asphalt apron around it.
  const slabMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1e, roughness: 0.95 });
  const slab = new THREE.Mesh(new THREE.BoxGeometry(GRID.w + 1.6, 0.7, GRID.h + 1.6), slabMat);
  slab.position.set((GRID.w - 1) / 2, -0.36, (GRID.h - 1) / 2); slab.receiveShadow = true; slab.castShadow = true;
  scene.add(slab);
  const asp = asphaltMaps();
  const apronMat = new THREE.MeshStandardMaterial({ map: tex(asp.albedo, { srgb: true, repeat: 40 }), roughnessMap: tex(asp.rough, { repeat: 40 }), normalMap: tex(asp.normal, { repeat: 40 }), normalScale: new THREE.Vector2(0.6, 0.6), roughness: 1 });
  const apron = new THREE.Mesh(new THREE.PlaneGeometry(160, 160), apronMat);
  apron.rotation.x = -Math.PI / 2; apron.position.set((GRID.w - 1) / 2, -0.72, (GRID.h - 1) / 2); apron.receiveShadow = true;
  scene.add(apron);
  // Kerbs along the vertical roads (thin raised strips just outside the road, on cell borders).
  const kerbParts = [];
  for (const r of roadRects()) {
    if (r.w < r.h) for (const dx of [-0.05, r.w + 0.05]) { const k = new THREE.BoxGeometry(0.08, 0.06, r.h); k.translate(r.x + dx, 0.03, r.y + r.h / 2); kerbParts.push(withColor(k, PROP_COLORS.kerb)); }
    else for (const dy of [-0.05, r.h + 0.05]) { const k = new THREE.BoxGeometry(r.w, 0.06, 0.08); k.translate(r.x + r.w / 2, 0.03, r.y + dy); kerbParts.push(withColor(k, PROP_COLORS.kerb)); }
  }
  const kerbMesh = new THREE.Mesh(mergeGeometries(kerbParts), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9 }));
  kerbMesh.receiveShadow = true; scene.add(kerbMesh);

  // Uplink gates.
  const portals = [];
  const gateMetal = new THREE.MeshStandardMaterial({ color: 0x3a3a42, roughness: 0.4, metalness: 0.7 });
  for (const sp of SPAWNS) {
    const g = new THREE.Group();
    const bar = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.12, sp.rows.length - 0.1), new THREE.MeshStandardMaterial({ color: 0x1a1c24, emissive: 0x9fb0d8, emissiveIntensity: 0.9, roughness: 0.4 }));
    bar.position.set(0, 0.06, (sp.rows[0] + sp.rows[sp.rows.length - 1]) / 2 - sp.y);
    g.add(bar);
    for (const dz of [-1.4, 1.4]) { const post = new THREE.Mesh(new THREE.BoxGeometry(0.24, 1.3, 0.24), gateMetal); post.position.set(0, 0.65, dz); post.castShadow = true; g.add(post); const cap = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.06, 0.3), gateMetal); cap.position.set(0, 1.33, dz); g.add(cap); }
    const beam = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 2.9), gateMetal); beam.position.y = 1.3; g.add(beam);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.06, 10, 40), new THREE.MeshStandardMaterial({ color: C.accent, emissive: C.accent, emissiveIntensity: 2.2, roughness: 0.4 }));
    ring.rotation.x = Math.PI / 2; ring.position.y = 0.1;
    g.add(ring);
    const light = new THREE.PointLight(C.accent, 3, 6, 2); light.position.y = 0.8; g.add(light);
    const label = textSprite(sp.name, { size: 20, color: '#ffa79c', mono: true, scale: 0.8, bg: 'rgba(14,14,16,0.7)' }); label.position.set(0, 0.25, 2.2); g.add(label);
    g.position.set(sp.x, 0, sp.y);
    scene.add(g);
    portals.push({ group: g, ring });
  }

  // Props merged: trees (1 draw), vehicles (1 draw), lamp posts (1 draw + up to 6 lights).
  const rnd = seeded(5);
  const treeParts = [];
  const treeSpots = [];
  for (let i = 0; i < 30; i++) { const x = 4 + rnd() * (GRID.w - 5); const z = rnd() < 0.5 ? -1.25 - rnd() * 0.6 : GRID.h - 0.25 + rnd() * 0.6; treeSpots.push([x, z]); }
  for (let i = 0; i < 8; i++) treeSpots.push([GRID.w + 0.6 + rnd() * 0.5, 1 + rnd() * (GRID.h - 3)]);
  const decalSpots = [];
  for (const [x, z] of treeSpots) { decalSpots.push([x, z, 1.2]); for (const p of treeGeom(rnd)) { p.g.translate(x, 0, z); treeParts.push(withColor(p.g, PROP_COLORS[p.c])); } }
  const treeMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, envMapIntensity: 0.15 });
  const trees = new THREE.Mesh(mergeGeometries(treeParts), treeMat); trees.castShadow = true; trees.receiveShadow = true; scene.add(trees);
  const carParts = [];
  for (let i = 0; i < 9; i++) { const x = 6 + i * 2.4 + rnd() * 0.5; const z = GRID.h + 0.35; decalSpots.push([x, z, 1.3]); for (const p of carGeom(rnd)) { p.g.translate(x, -0.7, z); carParts.push(withColor(p.g, PROP_COLORS[p.c])); } }
  const cars = new THREE.Mesh(mergeGeometries(carParts), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.35, metalness: 0.5 })); cars.castShadow = true; cars.receiveShadow = true; scene.add(cars);
  const postParts = []; const lamps = []; const lampSpots = [[4.3, -1.4], [12, -1.4], [20, -1.4], [28, -1.4], [8, GRID.h + 0.1], [16, GRID.h + 0.1], [24, GRID.h + 0.1], [GRID.w + 0.5, 6], [GRID.w + 0.5, 15]];
  for (const [x, z] of lampSpots) {
    const m = new THREE.CylinderGeometry(0.04, 0.08, 2.6, 6); m.translate(x, 1.3, z); postParts.push(withColor(m, PROP_COLORS.post));
    const arm = new THREE.BoxGeometry(0.9, 0.06, 0.06); arm.translate(x + 0.4, 2.45, z); postParts.push(withColor(arm, PROP_COLORS.post));
    const head = new THREE.BoxGeometry(0.34, 0.1, 0.16); head.translate(x + 0.75, 2.42, z); postParts.push(withColor(head, PROP_COLORS.post));
    lamps.push([x + 0.75, 2.35, z]);
  }
  const posts = new THREE.Mesh(mergeGeometries(postParts), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.5, metalness: 0.6 })); posts.castShadow = true; scene.add(posts);
  // Street furniture: bollards where each service road meets the slab edge, merged with the posts' material.
  const bollardParts = [];
  for (const r of roadRects()) for (const z of [-0.85, GRID.h - 0.15]) for (const dx of [-0.42, 0.42]) { const b = new THREE.CylinderGeometry(0.035, 0.04, 0.32, 6); b.translate(r.x + r.w / 2 + dx, 0.16, z); bollardParts.push(withColor(b, PROP_COLORS.post)); const cap = new THREE.CylinderGeometry(0.045, 0.045, 0.04, 6); cap.translate(r.x + r.w / 2 + dx, 0.33, z); bollardParts.push(withColor(cap, [0.9, 0.7, 0.2])); }
  const bollards = new THREE.Mesh(mergeGeometries(bollardParts), posts.material); bollards.castShadow = true; scene.add(bollards);
  // Grass verge between the slab and the apron.
  const verge = new THREE.Mesh(new THREE.RingGeometry(1, 1.06, 4, 1), new THREE.MeshStandardMaterial({ color: 0x3a5a30, roughness: 1, map: tex(noiseCanvas(128, 19, 3, 6, 60, 140), { repeat: 12 }) }));
  verge.geometry.dispose(); verge.geometry = new THREE.ShapeGeometry((() => { const s = new THREE.Shape(); const W = GRID.w + 3.4, H = GRID.h + 3.4; s.moveTo(-W / 2, -H / 2); s.lineTo(W / 2, -H / 2); s.lineTo(W / 2, H / 2); s.lineTo(-W / 2, H / 2); s.closePath(); const hole = new THREE.Path(); const w2 = GRID.w + 1.6, h2 = GRID.h + 1.6; hole.moveTo(-w2 / 2, -h2 / 2); hole.lineTo(w2 / 2, -h2 / 2); hole.lineTo(w2 / 2, h2 / 2); hole.lineTo(-w2 / 2, h2 / 2); hole.closePath(); s.holes.push(hole); return s; })());
  verge.rotation.x = -Math.PI / 2; verge.position.set((GRID.w - 1) / 2, -0.69, (GRID.h - 1) / 2); verge.receiveShadow = true; scene.add(verge);
  // A security vehicle idling by Uplink B with a rotating strobe.
  const patrol = new THREE.Group();
  const patrolParts = carGeom(seeded(99)).map((p) => withColor(p.g, p.c === 'glass' ? [0.3, 0.36, 0.45] : p.c === 'tyre' ? [0.07, 0.07, 0.07] : [0.92, 0.92, 0.95]));
  const patrolMesh = new THREE.Mesh(mergeGeometries(patrolParts), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.4, metalness: 0.5 })); patrolMesh.castShadow = true; patrol.add(patrolMesh);
  const strobe = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.06, 0.1), new THREE.MeshStandardMaterial({ color: 0x111111, emissive: 0x4a80ff, emissiveIntensity: 3 })); strobe.position.set(-0.03, 0.44, 0); patrol.add(strobe);
  const strobeLight = new THREE.PointLight(0x4a80ff, 0, 5, 2); strobeLight.position.set(0, 0.8, 0); patrol.add(strobeLight);
  patrol.position.set(-2.2, -0.7, 13.5); patrol.rotation.y = Math.PI / 2; scene.add(patrol);
  const lampGlow = new THREE.InstancedMesh(new THREE.BoxGeometry(0.3, 0.04, 0.12), new THREE.MeshStandardMaterial({ color: 0x111111, emissive: 0xfff0cc, emissiveIntensity: 2 }), lamps.length);
  const tmp = new THREE.Object3D();
  lamps.forEach((p, i) => { tmp.position.set(p[0], p[1], p[2]); tmp.updateMatrix(); lampGlow.setMatrixAt(i, tmp.matrix); });
  scene.add(lampGlow);
  const lampLights = lamps.slice(0, 6).map((p) => { const l = new THREE.PointLight(0xffe2b0, 0, 7, 2); l.position.set(p[0], p[1] - 0.2, p[2]); scene.add(l); return l; });
  let lampPool = 0;
  // Drifting cloud shadows for daylight: a noise alpha plane over the campus.
  const cloudTex = tex(noiseCanvas(256, 53, 3, 2, 0, 255), { repeat: 1.6 });
  const cloudMat = new THREE.MeshBasicMaterial({ color: 0x000000, alphaMap: cloudTex, transparent: true, opacity: 0, depthWrite: false });
  const clouds = new THREE.Mesh(new THREE.PlaneGeometry(GRID.w + 8, GRID.h + 8), cloudMat);
  clouds.rotation.x = -Math.PI / 2; clouds.position.set((GRID.w - 1) / 2, 0.018, (GRID.h - 1) / 2); clouds.renderOrder = 2; clouds.userData.noAO = true; clouds.visible = false;
  scene.add(clouds);

  // Distant skyline: block silhouettes around the apron with sparse lit windows (night/dusk).
  const skyParts = [], skyLit = [];
  const srnd = seeded(97);
  for (let i = 0; i < 46; i++) {
    const side = i % 4; let x, z;
    if (side === 0) { x = -14 + srnd() * (GRID.w + 28); z = -10 - srnd() * 6; } else if (side === 1) { x = -14 + srnd() * (GRID.w + 28); z = GRID.h + 8 + srnd() * 6; } else if (side === 2) { x = -12 - srnd() * 6; z = -6 + srnd() * (GRID.h + 12); } else { x = GRID.w + 10 + srnd() * 6; z = -6 + srnd() * (GRID.h + 12); }
    const w = 1.5 + srnd() * 3, hh = 2 + srnd() * 7, dd = 1.5 + srnd() * 3;
    const b = new THREE.BoxGeometry(w, hh, dd); b.translate(x, hh / 2 - 0.7, z); skyParts.push(withColor(b, [0.16, 0.16, 0.2]));
    for (let k = 0; k < 5; k++) { if (srnd() < 0.55) continue; const win = new THREE.PlaneGeometry(0.16, 0.12); win.translate(x + (srnd() - 0.5) * w * 0.8, srnd() * hh - 0.5, z + dd / 2 + 0.01); skyLit.push(win); }
  }
  const skyline = new THREE.Mesh(mergeGeometries(skyParts), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95 })); skyline.receiveShadow = false; scene.add(skyline);
  const skyLitMat = new THREE.MeshBasicMaterial({ color: 0xffe0b0 });
  const skyLights = skyLit.length ? new THREE.Mesh(mergeGeometries(skyLit), skyLitMat) : null; if (skyLights) scene.add(skyLights);
  // Puddles: a few glossy patches that reflect the environment at dusk and night.
  const puddleMat = new THREE.MeshPhysicalMaterial({ color: 0x1a1c22, roughness: 0.05, metalness: 0.0, transparent: true, opacity: 0.55, clearcoat: 1, clearcoatRoughness: 0.05, envMapIntensity: 1.6, depthWrite: false });
  const puddleParts = []; const prnd = seeded(61);
  for (let i = 0; i < 9; i++) { const px = 4 + prnd() * (GRID.w - 5), pz = prnd() * GRID.h; const g = new THREE.CircleGeometry(0.5 + prnd() * 0.7, 18); g.scale(1 + prnd(), 1, 1); g.rotateX(-Math.PI / 2); g.translate(px, 0.016, pz); puddleParts.push(g); }
  const puddles = new THREE.Mesh(mergeGeometries(puddleParts), puddleMat); puddles.renderOrder = 1; puddles.userData.noAO = true; scene.add(puddles);

  // Hover cell + range preview.
  const hover = new THREE.Mesh(new THREE.PlaneGeometry(0.96, 0.96), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.16, depthWrite: false }));
  hover.rotation.x = -Math.PI / 2; hover.position.y = 0.02; hover.visible = false;
  scene.add(hover);
  const rangeRing = new THREE.Mesh(new THREE.RingGeometry(0.97, 1, 64), new THREE.MeshBasicMaterial({ color: C.text, transparent: true, opacity: 0.45, side: THREE.DoubleSide, depthWrite: false }));
  rangeRing.rotation.x = -Math.PI / 2; rangeRing.position.y = 0.03; rangeRing.visible = false;
  scene.add(rangeRing);
  const rangeFill = new THREE.Mesh(new THREE.CircleGeometry(1, 64), new THREE.MeshBasicMaterial({ color: C.text, transparent: true, opacity: 0.07, depthWrite: false }));
  rangeFill.rotation.x = -Math.PI / 2; rangeFill.position.y = 0.025; rangeFill.visible = false;
  scene.add(rangeFill);

  const api = {
    ground, portals, hover, rangeRing, rangeFill,
    applyTheme(t) {
      paintOverlay(ctx, t); overlay.needsUpdate = true;
      slabMat.color.set(t.slab);
      apronMat.color.set(t.id === 'day' ? 0xffffff : t.id === 'dusk' ? 0xb08878 : 0x6a6a78);
      groundMat.envMapIntensity = t.id === 'day' ? 0.4 : 0.25;
      treeMat.color.set(t.id === 'night' ? 0x4a5866 : t.id === 'dusk' ? 0x8f8676 : 0xd0d8c8);
      lampGlow.material.emissiveIntensity = t.lamps > 0 ? 2.2 : 0.2;
      for (const l of lampLights) l.intensity = t.lamps;
      lampPool = t.lamps > 0 ? Math.min(1, t.lamps / 2.4) : 0;
      clouds.visible = !!t.clouds; cloudMat.opacity = t.clouds ? 0.22 : 0;
      skyline.material.color.set(t.id === 'day' ? 0xb8bcc4 : t.id === 'dusk' ? 0x6a5a58 : 0x2a2c36);
      skyLitMat.color.set(t.id === 'day' ? 0x8090a8 : t.id === 'dusk' ? 0xffd090 : 0xffe0b0);
      if (skyLights) skyLights.visible = t.id !== 'day';
      puddles.visible = t.id !== 'day'; puddleMat.opacity = t.id === 'dusk' ? 0.6 : 0.5;
    },
    update(t) {
      for (const p of portals) { p.ring.rotation.z = t * 0.8; p.ring.material.emissiveIntensity = 1.8 + Math.sin(t * 3) * 0.6; }
      for (const d of decalSpots) pushContact(d[0], d[1], d[2], 0.9);
      if (lampPool > 0) for (const p of lamps) pushPool(p[0], p[2], 3.4, lampPool * 0.7);
      cloudTex.offset.set(t * 0.05 / (GRID.w + 8), t * 0.02 / (GRID.h + 8));
      const ph = (t * 3) % 2; strobe.material.emissive.set(ph < 1 ? 0x4a80ff : 0xff5030); strobeLight.color.copy(strobe.material.emissive); strobeLight.intensity = lampPool > 0 ? 1.2 + Math.sin(t * 12) * 0.8 : 0;
    },
    showRange(x, y, r, color = C.text) {
      rangeRing.visible = rangeFill.visible = r > 0;
      rangeRing.position.set(x, 0.03, y); rangeFill.position.set(x, 0.025, y);
      rangeRing.scale.set(r, r, 1); rangeFill.scale.set(r, r, 1);
      rangeRing.material.color.set(color); rangeFill.material.color.set(color);
    },
    hideRange() { rangeRing.visible = rangeFill.visible = false; },
  };
  if (rig) rig.onTheme((t) => api.applyTheme(t)); else api.applyTheme(THEME0);
  return api;
}
