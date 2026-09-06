import * as THREE from 'three';
import './controls.css';
import { THEMES, THEME_ORDER, saveThemeId, loadFlag, saveFlag } from './themes.js';
import { applyAssetTheme, flushAssetLayers, setLabelDistance } from './assets.js';
import { flushDecals, pushContact, attachDecals } from './decals.js';
import { brushedMaps, panelMaps, tex } from './textures.js';
import { applyTowerTheme, connectWalls } from './towers.js';
import { PRESETS } from './scene.js';
import { GRID } from '../sim/grid.js';
import { PROGRAMMES } from '../sim/catalog.js';
import { C } from './palette.js';
import { textSprite, iconSprite } from './text.js';
import { renderOrgPreview } from './preview.js';

// Theme picker, camera buttons and presets in the top bar; the headquarters with its
// engineers and construction scaffolds; wall connectors. Everything here reads the game
// and never blocks a grid cell (the HQ sits above the top edge, at z < 0).

const panel = panelMaps(), brushed = brushedMaps();
const skin = new THREE.MeshStandardMaterial({ color: 0xe8c9a8, roughness: 0.8 });
const hat = new THREE.MeshStandardMaterial({ color: 0xffb547, roughness: 0.45, metalness: 0.1 });
const vest = new THREE.MeshStandardMaterial({ color: 0x3b4a6b, roughness: 0.85 });
const hqMat = new THREE.MeshStandardMaterial({ color: 0x6a6d78, roughness: 0.7, metalness: 0.05, roughnessMap: tex(panel.rough), normalMap: tex(panel.normal), normalScale: new THREE.Vector2(0.5, 0.5) });
const hqDark = new THREE.MeshStandardMaterial({ color: 0x22222a, roughness: 0.9 });
const hqMetal = new THREE.MeshStandardMaterial({ color: 0x7c8090, roughness: 0.36, metalness: 0.85, roughnessMap: tex(brushed.rough), normalMap: tex(brushed.normal), normalScale: new THREE.Vector2(0.3, 0.3) });
const glassMat = new THREE.MeshPhysicalMaterial({ color: 0x8fb4ff, roughness: 0.08, metalness: 0.1, transparent: true, opacity: 0.5, clearcoat: 1 });
const scaffoldMat = new THREE.MeshStandardMaterial({ color: 0xffb547, roughness: 0.6, metalness: 0.4 });

function engineer() {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.13, 0.28, 4, 8), vest); body.position.y = 0.34; body.castShadow = true; g.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.12, 10, 10), skin); head.position.y = 0.68; g.add(head);
  const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.135, 10, 8, 0, Math.PI * 2, 0, Math.PI / 2), hat); helmet.position.y = 0.7; g.add(helmet);
  const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.03, 10), hat); brim.position.y = 0.69; g.add(brim);
  return g;
}
function scaffold(label) {
  const g = new THREE.Group();
  for (const [x, z] of [[-0.3, -0.3], [0.3, -0.3], [-0.3, 0.3], [0.3, 0.3]]) { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 1.2, 5), scaffoldMat); p.position.set(x, 0.6, z); g.add(p); }
  for (const y of [0.4, 0.8, 1.2]) { const f = new THREE.Mesh(new THREE.BoxGeometry(0.66, 0.03, 0.66), scaffoldMat); f.position.y = y; g.add(f); }
  const crane = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 1.1), scaffoldMat); crane.position.set(0, 1.5, 0.2); g.add(crane);
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.6, 5), scaffoldMat); mast.position.set(0, 0.8, -0.3); g.add(mast);
  const l = textSprite(label, { size: 18, color: '#ffb547', weight: 600, scale: 0.6, bg: 'rgba(14,14,16,0.75)' }); l.position.y = 1.95; g.add(l);
  g.userData.crane = crane;
  return g;
}

export function initRenderControls(app) {
  const rig = app.rig;
  const extras = document.getElementById('extras');
  // Hit feedback needs the live building views; company previews for the start screen.
  if (app.effects) app.effects.views = app.assetViews;
  app.renderPreview = (org, w, h) => renderOrgPreview(app, org, w, h);
  let shaking = false;

  // Propagate the theme to materials owned by other render modules.
  rig.onTheme((t) => { applyAssetTheme(t); applyTowerTheme(t); hqMat.color.set(t.body); hqDark.color.set(t.dark); hqMetal.color.set(t.appliance); glassMat.color.set(t.glass); });
  if (app.map && app.map.applyTheme) rig.onTheme((t) => app.map.applyTheme(t));

  // Theme swatches.
  const sw = document.createElement('span'); sw.className = 'swatches'; sw.title = 'Visual theme';
  for (const id of THEME_ORDER) {
    const b = document.createElement('button'); b.className = 'sw' + (rig.theme.id === id ? ' on' : ''); b.style.background = THEMES[id].swatch; b.title = THEMES[id].name; b.dataset.theme = id;
    b.onclick = () => { rig.applyTheme(THEMES[id]); saveThemeId(id); for (const x of sw.querySelectorAll('.sw')) x.classList.toggle('on', x.dataset.theme === id); };
    sw.appendChild(b);
  }
  extras.appendChild(sw);
  // Camera buttons.
  const cam = document.createElement('span'); cam.className = 'cam';
  const mk = (label, title, fn, cls = '') => { const b = document.createElement('button'); b.textContent = label; b.title = title; b.className = cls; b.onclick = fn; cam.appendChild(b); return b; };
  mk('⟲', 'Rotate left (Q)', () => rig.rotate(0.35, 0));
  mk('⟳', 'Rotate right (E)', () => rig.rotate(-0.35, 0));
  mk('⇅', 'Tilt (R/F)', () => rig.rotate(0, rig.pitch > 0.95 ? -0.35 : 0.35));
  mk('⌂', 'Reset view', () => rig.goTo('overview'));
  mk('all', 'Overview', () => rig.goTo('overview'), 'preset');
  mk('edge', 'Perimeter', () => rig.goTo('perimeter'), 'preset');
  mk('core', 'Core systems', () => rig.goTo('core'), 'preset');
  const ao = mk('AO', 'Ambient occlusion (costs a little GPU)', () => { const on = !rig.ao.enabled; rig.setAO(on); saveFlag('dtw.ao', on); ao.classList.toggle('on', on); }, 'preset');
  ao.classList.toggle('on', loadFlag('dtw.ao', false));
  extras.appendChild(cam);
  void PRESETS;

  // Headquarters, above the top edge of the campus.
  const hq = new THREE.Group();
  const HQX = 26.5, HQZ = -2.6;
  const main = new THREE.Mesh(new THREE.BoxGeometry(3.2, 1.6, 1.8), hqMat); main.position.y = 0.8; main.castShadow = true; main.receiveShadow = true; hq.add(main);
  const glass = new THREE.Mesh(new THREE.BoxGeometry(3.24, 0.5, 1.84), glassMat); glass.position.y = 0.95; hq.add(glass);
  const tower = new THREE.Mesh(new THREE.BoxGeometry(1.0, 2.6, 1.0), hqMat); tower.position.set(-1.0, 1.3, 0); tower.castShadow = true; hq.add(tower);
  const roof = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.12, 2.0), hqDark); roof.position.y = 1.66; hq.add(roof);
  const hvac = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.3, 0.6), hqMetal); hvac.position.set(0.9, 1.87, -0.4); hvac.castShadow = true; hq.add(hvac);
  const hvac2 = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.22, 0.8), hqMetal); hvac2.position.set(0.1, 1.83, 0.4); hq.add(hvac2);
  const entrance = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.7, 0.06), hqDark); entrance.position.set(0.7, 0.35, 0.92); hq.add(entrance);
  const canopy = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.05, 0.5), hqMetal); canopy.position.set(0.7, 0.78, 1.1); hq.add(canopy);
  const flag = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.2, 5), hqDark); flag.position.set(-1.0, 3.2, 0); hq.add(flag);
  const banner = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.3), new THREE.MeshBasicMaterial({ color: C.accent, side: THREE.DoubleSide })); banner.position.set(-0.75, 3.6, 0); hq.add(banner);
  const pad = new THREE.Mesh(new THREE.BoxGeometry(6.5, 0.1, 3.2), hqDark); pad.position.set(0.6, 0.05, 0.1); pad.receiveShadow = true; hq.add(pad);
  const hqLabel = textSprite('Headquarters', { size: 20, color: '#f0f0f4', weight: 600, scale: 0.7, bg: 'rgba(14,14,16,0.75)' }); hqLabel.position.set(0, 2.2, 0.2); hq.add(hqLabel);
  const hqIcon = iconSprite('ad', { fg: '#ffffff' }); hqIcon.position.set(0, 2.8, 0.2); hq.add(hqIcon);
  hq.position.set(HQX, 0, HQZ);
  rig.scene.add(hq);
  let staffSprite = null, staffText = '';
  function setStaffLabel(txt) {
    if (txt === staffText) return;
    staffText = txt;
    if (staffSprite) { hq.remove(staffSprite); staffSprite.material.dispose(); }
    staffSprite = textSprite(txt, { size: 18, color: '#ffb547', mono: true, scale: 0.62, bg: 'rgba(14,14,16,0.75)' });
    staffSprite.position.set(2.2, 1.2, 0.4); hq.add(staffSprite);
  }
  setStaffLabel('1 engineer');

  const engineers = [];   // { mesh, home:Vector3, target:Vector3 }
  const scaffolds = new Map(); // programme id -> group
  let lastGame = null, lastWallCount = -1, tAcc = 0;

  function syncStaff(game) {
    const n = game.concurrency();
    while (engineers.length < n) { const m = engineer(); rig.scene.add(m); const i = engineers.length; engineers.push({ mesh: m, home: new THREE.Vector3(HQX + 1.9 + (i % 3) * 0.5, 0, HQZ + 0.9 + Math.floor(i / 3) * 0.5), target: null, phase: Math.random() * 6 }); }
    while (engineers.length > n) { const e = engineers.pop(); rig.scene.remove(e.mesh); }
    setStaffLabel(`${n} engineer${n > 1 ? 's' : ''}`);
  }

  return {
    update(dt) {
      attachDecals(rig.scene);
      pushContact(HQX + 0.4, HQZ + 0.1, 7.5, 0.8);
      flushAssetLayers();
      flushDecals();
      setLabelDistance(rig.dist);
      const game = app.game;
      if (!game) return;
      tAcc += dt;
      if (game !== lastGame) { lastGame = game; lastWallCount = -1; for (const s of scaffolds.values()) rig.scene.remove(s); scaffolds.clear(); }
      syncStaff(game);
      // Engineers: one figure per job walks to its system; the rest stand at HQ.
      const jobs = game.jobs.filter((j) => j.kind !== 'scan');
      engineers.forEach((e, i) => {
        const job = jobs[i];
        let tx = e.home.x, tz = e.home.z;
        if (job) { const a = game.asset(job.assetId); if (a) { tx = a.x + 0.5 + 1.35; tz = a.y + 0.5 + 0.6; } }
        const m = e.mesh;
        const dx = tx - m.position.x, dz = tz - m.position.z;
        const d = Math.hypot(dx, dz);
        const step = Math.min(d, dt * 4.5);
        if (d > 0.01) { m.position.x += dx / d * step; m.position.z += dz / d * step; m.rotation.y = Math.atan2(dx, dz); }
        m.position.y = job && d < 0.05 ? Math.abs(Math.sin(tAcc * 8 + e.phase)) * 0.08 : (d > 0.05 ? Math.abs(Math.sin(tAcc * 10 + e.phase)) * 0.06 : 0);
      });
      // Scaffolds for programmes rolling out.
      const rolling = [...game.activeFrom.entries()].filter(([, h]) => h > game.hour).map(([id]) => id);
      for (const id of rolling) if (!scaffolds.has(id)) { const s = scaffold(PROGRAMMES[id] ? PROGRAMMES[id].name : id); s.position.set(HQX - 3.6 - scaffolds.size * 1.1, 0, HQZ + 0.4); rig.scene.add(s); scaffolds.set(id, s); }
      for (const [id, s] of scaffolds) { if (!rolling.includes(id)) { rig.scene.remove(s); scaffolds.delete(id); } else s.userData.crane.rotation.y = Math.sin(tAcc * 0.7) * 0.6; }
      // Wall connectors.
      if (game.walls.size !== lastWallCount) { lastWallCount = game.walls.size; connectWalls(game.walls, app.wallViews); }
      // Camera micro-shake while an exploit lands; the rig's own position is restored after.
      const fx = app.effects;
      if (fx && fx.shake > 0) { fx.shake -= dt; rig.updateCamera(); const a = 0.08 * Math.min(1, fx.shake / 0.15); rig.camera.position.x += (Math.random() - 0.5) * 2 * a; rig.camera.position.y += (Math.random() - 0.5) * 2 * a; shaking = true; }
      else if (shaking) { shaking = false; rig.updateCamera(); }
    },
  };
}
void GRID;
