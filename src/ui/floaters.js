import * as THREE from 'three';

// On-map labels over identified attackers, projected to screen space: application name big,
// CVE small, exploit class chip (web = WAF's job, appliance = IPS's job). Capped at 40.
// Plus the sim's arrival verdicts (game.popups): short-lived labels that rise and fade above
// the building they concern, so "nothing happened" is never silent.
const POP_TTL = 1.4;
const POP_MAX = 30;
const _v = new THREE.Vector3();

export function syncFloaters(app) {
  const g = app.game;
  const rows = [];
  for (const a of g.attackers) {
    if (!a.revealed) continue;
    const i = g.attackerIntel(a);
    if (i.level === 'noise' || i.level === 'stack-clean') continue;
    rows.push({ a, i });
    if (rows.length >= 40) break;
  }
  const w = window.innerWidth, h = window.innerHeight;
  let html = '';
  for (const { a, i } of rows) {
    _v.set(a.x, 1.1 * (a.boss ? 1.9 : 1), a.y).project(app.rig.camera);
    if (_v.z > 1) continue;
    const x = (_v.x + 1) / 2 * w, y = (1 - _v.y) / 2 * h;
    const name = (i.v && i.v.shortName) || a.vuln;
    const cls = i.v ? (i.v.web ? 'web' : 'appl') : '';
    html += `<div class="floater ${i.level} ${a.boss ? 'boss' : ''}" style="left:${x.toFixed(0)}px;top:${y.toFixed(0)}px"><b>${a.boss ? '★ ' : ''}${name}</b><s>${a.vuln}</s>${cls ? `<i class="${cls}">${cls === 'web' ? 'web' : 'appliance'}</i>` : ''}</div>`;
  }
  if (html !== app.lastFloaters) { app.floaters.innerHTML = html; app.lastFloaters = html; }
  syncPopups(app);
}

function popupLayer(app) {
  if (app.popupLayer) return app.popupLayer;
  const layer = document.createElement('div');
  layer.id = 'popups';
  document.body.appendChild(layer);
  app.popupLayer = layer;
  app.popupPool = [];
  app.popupLive = [];
  return layer;
}

function syncPopups(app) {
  const g = app.game;
  const layer = popupLayer(app);
  const now = performance.now() / 1000;
  // Drain the sim queue into live nodes (pooled).
  if (g.popups.length) {
    for (const p of g.popups) {
      if (app.popupLive.length >= POP_MAX) { const old = app.popupLive.shift(); old.el.hidden = true; app.popupPool.push(old.el); }
      let el = app.popupPool.pop();
      if (!el) { el = document.createElement('div'); layer.appendChild(el); }
      el.hidden = false;
      el.className = `popup ${p.kind}`;
      el.textContent = p.text;
      app.popupLive.push({ el, x: p.x, y: p.y, born: now, jitter: (Math.random() - 0.5) * 0.6 });
    }
    g.popups.length = 0;
  }
  if (!app.popupLive.length) return;
  const w = window.innerWidth, h = window.innerHeight;
  for (let i = app.popupLive.length - 1; i >= 0; i--) {
    const p = app.popupLive[i];
    const age = now - p.born;
    if (age > POP_TTL) { p.el.hidden = true; app.popupPool.push(p.el); app.popupLive.splice(i, 1); continue; }
    const k = age / POP_TTL;
    _v.set(p.x + p.jitter, 1.8 + k * 1.6, p.y).project(app.rig.camera);
    if (_v.z > 1) { p.el.style.opacity = '0'; continue; }
    const x = (_v.x + 1) / 2 * w, y = (1 - _v.y) / 2 * h;
    p.el.style.transform = `translate(${x.toFixed(0)}px, ${y.toFixed(0)}px) translate(-50%, -100%) scale(${(1 + (k < 0.15 ? (0.15 - k) * 2 : 0)).toFixed(3)})`;
    p.el.style.opacity = String(k < 0.7 ? 1 : 1 - (k - 0.7) / 0.3);
  }
}
