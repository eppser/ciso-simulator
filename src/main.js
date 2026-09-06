import * as THREE from 'three';
import day from '../data/day-2026-09-02.json';
import { buildThreatModel } from './sim/data.js';
import { Game } from './sim/game.js';
import { ORGS } from './sim/orgs.js';
import { TOWERS } from './sim/catalog.js';
import { hashSeed } from './sim/rng.js';
import { key, SPAWNS } from './sim/grid.js';
import { SceneRig } from './render/scene.js';
import { buildMap } from './render/map.js';
import { AssetView } from './render/assets.js';
import { buildTower, buildWall, updateTowerView } from './render/towers.js';
import { AttackerLayer } from './render/attackers.js';
import { Effects } from './render/effects.js';
import { Input } from './render/input.js';
import { UI } from './ui/ui.js';
import { C } from './render/palette.js';
import { initAudio } from './audio/audio.js';
import { initRenderControls } from './render/controls.js';
import { syncFloaters } from './ui/floaters.js';

const SIM_DT = 1 / 30;

class App {
  constructor() {
    this.model = buildThreatModel(day);
    this.canvas = document.getElementById('c');
    this.rig = new SceneRig(this.canvas);
    this.map = buildMap(this.rig.scene);
    this.attackerLayer = new AttackerLayer(this.rig.scene);
    this.effects = new Effects(this.rig.scene);
    this.ui = new UI(this);
    this.input = new Input(this.rig, this.canvas, {
      hover: (c) => this.onHover(c),
      click: (c) => this.onClick(c),
      cancel: () => { if (this.ui.tool) this.ui.selectTool(null); else this.ui.select(null); },
      key: (e) => this.onKey(e),
    });
    this.game = null;
    this.assetViews = new Map();
    this.towerViews = new Map();
    this.wallViews = new Map();
    this.paused = false;
    this.speed = 1;
    this.acc = 0;
    this.t = 0;
    this.last = performance.now();
    this.ghost = this.makeGhost();
    this.floaters = document.getElementById('floaters');
    this.audio = initAudio(this);
    this.renderControls = initRenderControls(this);
    this.pauseOnCompromise = false;
    const chk = document.getElementById('c-pause'); if (chk) chk.onchange = () => { this.pauseOnCompromise = chk.checked; };
    this.ui.showStart(this.model);
    requestAnimationFrame((now) => this.frame(now));
    window.__app = this; // for the smoke test
  }
  makeGhost() {
    const g = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.8, 0.8), new THREE.MeshBasicMaterial({ color: C.text, transparent: true, opacity: 0.25, wireframe: true }));
    g.visible = false; g.position.y = 0.4;
    this.rig.scene.add(g);
    return g;
  }

  start({ org, difficulty, seed }) {
    const seedNum = /^\d+$/.test(String(seed)) ? +seed : hashSeed(String(seed));
    this.settings = { org, difficulty, seed: seedNum };
    this.game = new Game({ model: this.model, org: ORGS[org], seed: seedNum, difficulty });
    this.audio.event('start', { org });
    document.getElementById('start').classList.add('hidden');
    document.getElementById('end').classList.add('hidden');
    document.getElementById('hud').classList.remove('hidden');
    // Clear old views.
    for (const v of this.assetViews.values()) this.rig.scene.remove(v.group);
    this.assetViews.clear();
    for (const a of this.game.assets.values()) this.assetViews.set(a.id, new AssetView(a, this.rig.scene));
    this.rebuildTowers();
    this.paused = false; this.speed = 1; this.ended = false;
    this.ui.select(null); this.ui.selectTool(null);
    this.ui.lastAdvice = null; this.ui.lastWaveKey = null; this.ui.lastLogLen = -1;
    this.ui.refresh(this.game, this.paused, this.speed);
    this.ui.afterStart();
  }
  restart() { this.start(this.settings); }
  rebuildTowers() {
    for (const v of this.towerViews.values()) this.rig.scene.remove(v.group);
    this.towerViews.clear();
    for (const w of this.wallViews.values()) this.rig.scene.remove(w);
    this.wallViews.clear();
    for (const t of this.game.towers) { const v = buildTower(t); this.rig.scene.add(v.group); this.towerViews.set(t.id, v); }
    for (const [k, w] of this.game.walls) { const m = buildWall(w.x, w.y); this.rig.scene.add(m); this.wallViews.set(k, m); }
  }
  togglePause() { this.paused = !this.paused; }
  setSpeed(s) { this.speed = s; this.paused = false; }
  focusAsset(id) {
    const a = this.game.asset(id); if (!a) return;
    this.rig.target.set(a.x + 0.5, 0, a.y + 0.5); this.rig.pan(0, 0);
    this.ui.selectTool(null);
    this.ui.select({ kind: 'asset', id });
  }

  // ---------- interaction ----------
  onHover(c) {
    if (!this.game || !c) { this.map.hover.visible = false; this.ghost.visible = false; this.map.hideRange(); return; }
    this.map.hover.visible = true; this.map.hover.position.set(c.x, 0.02, c.y);
    if (this.ui.tool) {
      const ok = this.game.canPlace(this.ui.tool, c.x, c.y);
      this.ghost.visible = true; this.ghost.position.set(c.x, 0.4, c.y);
      this.ghost.material.color.set(ok.ok ? C.text : C.accent);
      this.map.hover.material.color.set(ok.ok ? 0xffffff : C.accent);
      const def = TOWERS[this.ui.tool]; const r = (def.levels[0].range || 0) + (['ndr', 'ips'].includes(def.id) ? this.game.sensorBonus() : 0);
      if (r) this.map.showRange(c.x, c.y, r, ok.ok ? C.text : C.accent); else this.map.hideRange();
      document.getElementById('hint').textContent = ok.ok ? `Place ${def.name} at ${c.x},${c.y} ($${def.cost}k)` : ok.reason;
    } else {
      this.ghost.visible = false; this.map.hover.material.color.set(0xffffff);
      const t = this.game.towerAt(c.x, c.y);
      if (t) this.map.showRange(t.x, t.y, this.game.towerRange(t)); else if (!this.ui.selection || this.ui.selection.kind !== 'tower') this.map.hideRange();
    }
  }
  onClick(c) {
    const g = this.game; if (!g || this.ended) return;
    if (this.ui.tool) {
      const r = g.place(this.ui.tool, c.x, c.y);
      if (!r.ok) { this.ui.toast(r.reason, true); this.audio.event('refused'); return; }
      this.audio.event('place', { type: this.ui.tool });
      this.rebuildTowers();
      if (!this.input.keys.has('shift')) { /* keep tool active for rapid placement */ }
      this.onHover(c);
      return;
    }
    // Selection priority: attacker, tower, wall, asset.
    const at = this.attackerLayer.pick(g, c.fx, c.fy);
    if (at) { this.ui.select({ kind: 'attacker', id: at.id }); return; }
    const t = g.towerAt(c.x, c.y);
    if (t) { this.ui.select({ kind: 'tower', id: t.id }); this.map.showRange(t.x, t.y, g.towerRange(t)); return; }
    if (g.walls.has(key(c.x, c.y))) { this.ui.select({ kind: 'wall', x: c.x, y: c.y }); return; }
    for (const a of g.assets.values()) if (c.x >= a.x && c.x <= a.x + 1 && c.y >= a.y && c.y <= a.y + 1) { this.ui.select({ kind: 'asset', id: a.id }); return; }
    this.ui.select(null);
  }
  onKey(e) {
    if (!this.game) return;
    const k = e.key.toLowerCase();
    if (!document.getElementById('tutorial').classList.contains('hidden')) return;
    if (k === 'escape') { if (this.ui.tool) this.ui.selectTool(null); else { this.ui.select(null); document.getElementById('programmes').classList.add('hidden'); document.getElementById('help').classList.add('hidden'); } }
    else if (k === ' ') { e.preventDefault(); this.togglePause(); }
    else if (k === 'p') this.ui.showProgrammes();
    else if (k === 'enter') { const r = this.game.startHourEarly(); if (!r.ok) this.ui.toast(r.reason, true); }
    else if (k === '+' || k === '=') this.setSpeed(Math.min(3, this.speed + 1));
    else if (k === '-') this.setSpeed(Math.max(1, this.speed - 1));
    else if (k === 'u' && this.ui.selection && this.ui.selection.kind === 'tower') { const r = this.game.upgrade(this.ui.selection.id); if (!r.ok) this.ui.toast(r.reason, true); else { this.rebuildTowers(); this.ui.renderSide(); } }
    else if (k === 'x' && this.ui.selection && this.ui.selection.kind === 'tower') { this.ui.act('sell', {}); }
    else if (k === 't' && this.ui.selection && this.ui.selection.kind === 'tower') { const t = this.game.towers.find((x) => x.id === this.ui.selection.id); if (t && t.type === 'ips') { const modes = ['danger', 'first', 'strongest', 'boss']; this.game.setMode(t.id, modes[(modes.indexOf(t.mode) + 1) % modes.length]); this.ui.renderSide(); } }
    else { for (const t of Object.values(TOWERS)) if (t.hotkey === k) this.ui.selectTool(this.ui.tool === t.id ? null : t.id); }
  }

  // ---------- loop ----------
  frame(now) {
    const real = Math.min(0.1, (now - this.last) / 1000);
    this.last = now;
    this.t += real;
    this.input.tick(real);
    this.map.update(this.t);
    if (this.game) {
      if (!this.paused && !this.ended) {
        this.acc += real * this.speed;
        let steps = 0;
        while (this.acc >= SIM_DT && steps < 12) { this.game.tick(SIM_DT); this.acc -= SIM_DT; steps++; }
        if (steps === 12) this.acc = 0;
      }
      for (const e of this.game.effects) { this.effects.spawn(e, this.game); this.audio.event(e.type, e); if (e.type === 'compromise' && this.pauseOnCompromise) { this.paused = true; this.ui.toast('Paused: a system was compromised.', true); } }
      if (this.game.phase !== this.lastPhase) { this.audio.event('phase', { phase: this.game.phase, hour: this.game.hour }); this.lastPhase = this.game.phase; }
      this.game.effects.length = 0;
      const sel = this.ui.selection;
      for (const v of this.assetViews.values()) { v.cameraQuat = this.rig.camera.quaternion; v.sync(this.t, sel && sel.kind === 'asset' && sel.id === v.asset.id); }
      for (const t of this.game.towers) { const v = this.towerViews.get(t.id); if (v) updateTowerView(v, t, this.t, this.game); }
      this.attackerLayer.sync(this.game, this.t, this.rig.camera.quaternion);
      syncFloaters(this);
      this.uiClock = (this.uiClock || 0) + real;
      if (this.uiClock > 0.2) { this.uiClock = 0; this.ui.refresh(this.game, this.paused, this.speed); }
      if (!this.ended && (this.game.phase === 'won' || this.game.phase === 'lost')) { this.ended = true; setTimeout(() => this.ui.showEnd(this.game), 900); }
    }
    this.effects.update(real);
    this.audio.update(real);
    this.renderControls.update(real);
    this.rig.render();
    requestAnimationFrame((n) => this.frame(n));
  }
}

new App();
