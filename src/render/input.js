import * as THREE from 'three';

// Mouse-first camera, RTS style. Left-click selects or places; left-drag pans (with a little
// inertia on release); right-drag and middle-drag orbit and tilt; a plain right-click cancels;
// wheel zooms toward the cursor; the cursor at a screen edge scrolls the map (only while it
// is over the canvas); double-click focuses the camera on that spot. Keys stay as a fallback.
const EDGE = 24;
export class Input {
  constructor(rig, canvas, handlers) {
    this.rig = rig; this.canvas = canvas; this.h = handlers;
    this.ray = new THREE.Raycaster();
    this.plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    this.ndc = new THREE.Vector2();
    this.hit = new THREE.Vector3();
    this.cell = null;
    this.down = null; this.dragging = false; this.button = 0;
    this.keys = new Set();
    this.pointer = null;       // last pointer position over the canvas, for edge scrolling
    this.lastMove = { x: 0, y: 0, t: 0 }; this.dragVel = { x: 0, y: 0 };
    this.edgeEnabled = true;
    canvas.addEventListener('pointermove', (e) => this.onMove(e));
    canvas.addEventListener('pointerdown', (e) => this.onDown(e));
    canvas.addEventListener('pointerup', (e) => this.onUp(e));
    canvas.addEventListener('pointerleave', () => { this.cell = null; this.pointer = null; this.h.hover(null); });
    canvas.addEventListener('pointerenter', (e) => { this.pointer = { x: e.clientX, y: e.clientY }; });
    canvas.addEventListener('contextmenu', (e) => { e.preventDefault(); });
    canvas.addEventListener('dblclick', (e) => { if (e.button !== 0) return; const c = this.project(e); if (c) rig.focus(c.fx, c.fy, Math.min(rig.dist, 17)); });
    canvas.addEventListener('wheel', (e) => { e.preventDefault(); const c = this.project(e); rig.zoom(e.deltaY > 0 ? 1.12 : 0.89, c ? { x: c.fx, z: c.fy } : null); }, { passive: false });
    window.addEventListener('keydown', (e) => {
      if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
      this.keys.add(e.key.toLowerCase());
      this.h.key(e);
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.key.toLowerCase()));
    window.addEventListener('blur', () => { this.keys.clear(); this.pointer = null; });
    document.addEventListener('visibilitychange', () => { this.pointer = null; });
  }
  project(e) {
    const r = this.canvas.getBoundingClientRect();
    this.ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    this.ray.setFromCamera(this.ndc, this.rig.camera);
    if (!this.ray.ray.intersectPlane(this.plane, this.hit)) return null;
    return { x: Math.round(this.hit.x), y: Math.round(this.hit.z), fx: this.hit.x, fy: this.hit.z };
  }
  onMove(e) {
    this.pointer = { x: e.clientX, y: e.clientY };
    if (this.down && e.buttons) {
      const dx = e.clientX - this.down.x, dy = e.clientY - this.down.y;
      if (!this.dragging && Math.hypot(dx, dy) > 6) this.dragging = true;
      if (this.dragging) {
        const mx = e.clientX - this.last.x, my = e.clientY - this.last.y;
        const now = performance.now();
        if (this.button === 2 || this.button === 1) this.rig.rotate(-mx * 0.005, my * 0.004);
        else {
          const k = this.rig.dist / 900;
          this.rig.pan(-mx * k, -my * k);
          const dt = Math.max(1, now - this.lastMove.t) / 1000;
          this.dragVel = { x: -mx * k / dt, y: -my * k / dt };
        }
        this.last = { x: e.clientX, y: e.clientY }; this.lastMove = { x: e.clientX, y: e.clientY, t: now };
        return;
      }
    }
    const c = this.project(e);
    this.cell = c;
    this.h.hover(c);
  }
  onDown(e) {
    this.button = e.button;
    this.rig.vel.set(0, 0);
    this.down = { x: e.clientX, y: e.clientY }; this.last = { ...this.down }; this.dragging = false;
    this.dragVel = { x: 0, y: 0 }; this.lastMove = { x: e.clientX, y: e.clientY, t: performance.now() };
  }
  onUp(e) {
    if (this.down && !this.dragging) {
      if (e.button === 0) { const c = this.project(e); if (c) this.h.click(c, e); }
      else if (e.button === 2) this.h.cancel();
    } else if (this.dragging && this.button === 0) {
      // Release a pan with inertia if the last motion was recent.
      if (performance.now() - this.lastMove.t < 80) { const v = this.dragVel; const s = Math.hypot(v.x, v.y); if (s > 0.5) this.rig.fling(v.x * 0.35, v.y * 0.35); }
    }
    this.down = null; this.dragging = false;
  }
  tick(dt) {
    const k = dt * this.rig.dist * 0.6;
    let dx = 0, dz = 0;
    if (this.keys.has('a') || this.keys.has('arrowleft')) dx -= k;
    if (this.keys.has('d') || this.keys.has('arrowright')) dx += k;
    if (this.keys.has('w') || this.keys.has('arrowup')) dz += k;
    if (this.keys.has('s') || this.keys.has('arrowdown')) dz -= k;
    // Edge scrolling: only while the pointer is over the canvas and nothing is being dragged.
    if (this.edgeEnabled && this.pointer && !this.down && document.hasFocus()) {
      const w = window.innerWidth, h = window.innerHeight, p = this.pointer;
      const ek = dt * this.rig.dist * 0.75;
      const under = document.elementFromPoint(p.x, p.y);
      if (under === this.canvas) {
        if (p.x < EDGE) dx -= ek * (1 - p.x / EDGE); else if (p.x > w - EDGE) dx += ek * (1 - (w - p.x) / EDGE);
        if (p.y < EDGE) dz += ek * (1 - p.y / EDGE); else if (p.y > h - EDGE) dz -= ek * (1 - (h - p.y) / EDGE);
      }
    }
    if (dx || dz) this.rig.pan(dx, dz);
    if (this.keys.has('q')) this.rig.rotate(dt * 1.2, 0);
    if (this.keys.has('e')) this.rig.rotate(-dt * 1.2, 0);
    if (this.keys.has('r')) this.rig.rotate(0, dt * 0.8);
    if (this.keys.has('f')) this.rig.rotate(0, -dt * 0.8);
    this.rig.update(dt);
  }
}
