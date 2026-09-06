// Headless players used to balance the game and to test it. No rendering.
import fs from 'node:fs';
import { buildThreatModel } from '../src/sim/data.js';
import { Game } from '../src/sim/game.js';
import { ORGS } from '../src/sim/orgs.js';
import { assetDoors } from '../src/sim/grid.js';

export function loadModel() {
  const day = JSON.parse(fs.readFileSync(new URL('../data/day-2026-09-02.json', import.meta.url)));
  return buildThreatModel(day);
}

export const STRATEGIES = {
  nothing: () => {},
  // Buys everything obviously useful in a sensible order, patches whatever the scanner finds.
  ciso: (g) => {
    if (g.phase === 'prep' && g.hour === 0 && g.phaseTimer > 55) {
      g.buy('intel'); g.buy('scanner'); g.buy('discovery');
      // NDR near the uplinks, IPS in front of the DMZ, WAF near web assets.
      for (const [x, y] of [[6, 3], [6, 15], [8, 10]]) g.place('ndr', x, y);
      for (const [x, y] of [[6, 6], [6, 12], [6, 17], [10, 6], [10, 13]]) g.place('ips', x, y);
    }
    // Patch known exploitable systems, emergency if compromised nearby.
    for (const a of g.assets.values()) {
      if (!a.discovered) continue;
      if (a.state === 'compromised') g.respond(a.id);
      if (a.knownVulns && a.knownVulns.size && a.state === 'ok') {
        const vid = [...a.knownVulns][0];
        const v = g.vuln(vid);
        if (v && !v.patchable) { if (g.budget > 120) g.replace(a.id); else g.isolate(a.id, true); }
        else g.patch(a.id, vid, false);
      }
    }
    if (g.hour >= 2 && g.budget > 90) g.buy('soc1');
    if (g.hour >= 3 && g.budget > 80) g.buy('mfa');
    if (g.hour >= 4 && g.budget > 80) g.buy('backups');
    if (g.hour >= 5 && g.budget > 100) { for (const [x, y] of [[13, 6], [13, 11], [13, 16]]) g.place('ips', x, y); }
    if (g.hour >= 6 && g.budget > 100) for (const t of g.towers) if (t.type === 'ips') g.upgrade(t.id);
    if (g.hour >= 8 && g.budget > 60) g.buy('scanner2');
    if (g.hour >= 9 && g.budget > 150) g.buy('awareness');
    if (g.hour >= 10 && g.budget > 160) for (const t of g.towers) g.upgrade(t.id);
    if (g.phase === 'prep' && g.phaseTimer > 20 && g.hour > 0) g.startHourEarly();
  },
  // Spends on towers only, never patches: the "buy a box" CISO.
  boxes: (g) => {
    if (g.phase === 'prep' && g.hour === 0 && g.phaseTimer > 55) {
      for (const [x, y] of [[6, 3], [6, 15]]) g.place('ndr', x, y);
      for (const [x, y] of [[6, 6], [6, 12], [6, 17], [10, 6], [10, 13], [11, 6], [11, 14], [4, 8], [4, 15]]) g.place('ips', x, y);
    }
    if (g.budget > 60) for (const t of g.towers) if (t.type === 'ips') g.upgrade(t.id);
    if (g.budget > 45) { const spots = [[13, 4], [13, 9], [13, 14], [13, 19], [6, 19], [10, 1], [7, 8], [7, 15], [10, 10]]; for (const [x, y] of spots) if (g.map.isFree(x, y)) { g.place(g.towers.length % 2 ? 'waf' : 'ips', x, y); break; } }
    for (const a of g.assets.values()) if (a.state === 'compromised') g.respond(a.id);
  },
  // Patch-only: scanner + patches, no towers.
  patcher: (g) => {
    if (g.phase === 'prep' && g.hour === 0 && g.phaseTimer > 55) { g.buy('scanner'); g.buy('soc1'); }
    for (const a of g.assets.values()) {
      if (!a.discovered) continue;
      if (a.state === 'compromised') g.respond(a.id);
      if (a.knownVulns && a.knownVulns.size && a.state === 'ok') {
        const vid = [...a.knownVulns][0]; const v = g.vuln(vid);
        if (v && !v.patchable) g.isolate(a.id, true); else g.patch(a.id, vid, true);
      }
    }
  },
};

// Adapts to the budget. Roughly what a competent CISO would do in priority order.
STRATEGIES.smart = (g) => {
  const first = g.phase === 'prep' && g.hour === 0;
  if (first) { g.buy('scanner'); g.buy('discovery'); g.buy('intel'); }
  for (const a of g.assets.values()) {
    if (!a.discovered) continue;
    if (a.state === 'compromised') { if (!g.respond(a.id, true).ok) g.respond(a.id, false); }
    if (a.knownVulns && a.knownVulns.size && a.state === 'ok') {
      const vid = [...a.knownVulns][0]; const v = g.vuln(vid);
      if (v && !v.patchable) { if (g.budget > 150) g.replace(a.id); else g.isolate(a.id, true); }
      else if (g.fixHour(vid) !== null) {
        // Zero-day: no vendor fix yet. Virtual-patch with a WAF if it is a web exploit, else pull the cable.
        const near = g.towers.some((t) => t.type === 'waf' && Math.hypot(t.x - a.x - 0.5, t.y - a.y - 0.5) < 3.5);
        let placed = near;
        if (!near && v.web && g.budget >= 45) for (const [x, y] of [[a.x - 2, a.y], [a.x - 2, a.y + 1], [a.x, a.y - 2], [a.x, a.y + 3], [a.x + 3, a.y]]) if (g.place('waf', x, y).ok) { placed = true; break; }
        if (!placed) g.isolate(a.id, true);
      }
      else g.patch(a.id, vid, a.hits > 0 || a.integrity < 70);
    }
    // Bring a system back only once it is actually fixed, or once its zero-day has a patch and an engineer is free to apply it.
    if (a.state === 'isolated' && a.vulns.size === 0) g.isolate(a.id, false);
    else if (a.state === 'isolated' && a.knownVulns && [...a.knownVulns].every((vid) => { const v = g.vuln(vid); return v && v.patchable && g.fixHour(vid) === null; })) { if (g.isolate(a.id, false).ok) g.patch(a.id, [...a.knownVulns][0], true); }
  }
  // IPS beside each known-vulnerable exposed system, then NDR near the uplinks.
  const vulnerable = [...g.assets.values()].filter((a) => a.discovered && a.exposed && a.knownVulns && a.knownVulns.size && a.state !== 'isolated');
  for (const a of vulnerable) {
    const near = g.towers.some((t) => t.type === 'ips' && Math.hypot(t.x - a.x - 0.5, t.y - a.y - 0.5) < 3);
    if (near || g.budget < 60) continue;
    const web = a.threats.some((v) => v.web); const type = web ? 'waf' : 'ips';
    for (const [x, y] of [[a.x - 2, a.y], [a.x - 2, a.y + 1], [a.x, a.y - 2], [a.x, a.y + 3], [a.x + 3, a.y], [a.x - 1, a.y - 1], [a.x + 2, a.y + 2]]) if (g.place(type, x, y).ok) break;
  }
  if (g.hour >= 1 && g.budget > 90) g.buy('soc1');
  if (g.hour >= 1 && g.budget > 70) g.buy('vetting');
  if (g.hour >= 2 && g.budget > 70) for (const a of g.assets.values()) if (a.crit === 3 && !a.exposed && a.canEdr && !a.edr) g.installEdr(a.id);
  if (g.hour >= 3 && g.budget > 70) g.buy('mfa');
  if (g.hour >= 4 && g.budget > 80 && !g.towers.some((t) => t.type === 'ndr')) for (const [x, y] of [[6, 9], [6, 15], [7, 4]]) g.place('ndr', x, y);
  if (g.hour >= 5 && g.budget > 90) g.buy('backups');
  if (g.hour >= 3 && g.budget > 45) g.buy('scanner2');
  if (g.hour >= 7 && g.budget > 100) for (const t of g.towers) if (t.type === 'ips' || t.type === 'waf') g.upgrade(t.id);
  if (g.hour >= 8 && g.budget > 90) g.buy('awareness');
  if (g.hour >= 9 && g.budget > 120) g.buy('retainer');
  if (g.hour >= 10 && g.budget > 150) for (const t of g.towers) g.upgrade(t.id);
  if (g.phase === 'prep' && g.hour > 0 && g.phaseTimer > 15 && g.activeJobs() === 0) g.startHourEarly();
};

export function run({ org = 'midcap', seed = 1, strategy = 'nothing', difficulty = 1, dt = 0.05, model } = {}) {
  model = model || loadModel();
  const g = new Game({ model, org: ORGS[org], seed, difficulty });
  const play = STRATEGIES[strategy];
  let steps = 0;
  while (g.phase !== 'won' && g.phase !== 'lost' && steps < 200000) {
    play(g);
    g.tick(dt);
    g.effects.length = 0; g.popups.length = 0;
    steps++;
  }
  return g;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const model = loadModel();
  const orgArg = process.argv[2] || 'all';
  const strategies = (process.argv[3] || 'nothing,boxes,patcher,smart').split(',');
  for (const org of orgArg === 'all' ? ['startup', 'midcap', 'enterprise'] : [orgArg]) {
    for (const strategy of strategies) {
      const res = [];
      for (const seed of [1, 2, 3, 4, 5]) {
        const g = run({ org, seed, strategy, model });
        const c = g.scorecard();
        res.push(c);
      }
      const avg = (k) => (res.reduce((s, c) => s + (c[k] || 0), 0) / res.length).toFixed(1);
      console.log(`${org.padEnd(10)} ${strategy.padEnd(8)} grades=${res.map((c) => c.grade).join('')} impact=${avg('impact')} hours=${avg('hoursSurvived')} comp=${avg('compromises')} blocked=${avg('blocked')} arrived=${avg('arrived')} spent=${avg('spent')} left=${avg('budgetLeft')}`);
    }
  }
}
