import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { Worker, isMainThread, parentPort, workerData } from 'node:worker_threads';
import { Campaign } from '../src/sim/campaign.js';
import { ORGS } from '../src/sim/orgs.js';
import { buildThreatModel } from '../src/sim/data.js';
import { PROGRAMS, MODIFIERS } from '../src/sim/campaign-rules.js';

// Node and Vite intentionally share the same observation-row disambiguation.
function loadModel(file) {
  const day = JSON.parse(fs.readFileSync(file, 'utf8')), counts = new Map();
  for (const r of day.vulnerabilities) counts.set(r.id, (counts.get(r.id) || 0) + 1);
  return buildThreatModel({ ...day, vulnerabilities: day.vulnerabilities.map((r, i) => ({ ...r, id: counts.get(r.id) > 1 ? `${r.id} / row ${i + 1}` : r.id })) });
}

export function simulate(config) {
  const g = new Campaign({ model: loadModel(config.file), org: ORGS[config.org], seed: config.seed });
  assert.equal(g.trust, 5, 'every organization starts with full board confidence');
  assert.equal(g.score(), 0, 'initial confidence must not award unearned score');
  const initialBudget = g.budget, actionCounts = {}, failReasons = {}, stalls = new Map(), warnings = [];
  const policy = config.policy, active = policy !== 'neglect', careful = policy === 'competent';
  let nextAction = 3, maxAttackers = 0, maxNoMotion = 0, peakJobs = 0, maxCashError = 0, peakImpact = 0;
  const tryAction = (label, fn) => {
    const r = fn();
    if (r?.ok) { actionCounts[label] = (actionCounts[label] || 0) + 1; return true; }
    if (r?.reason) failReasons[r.reason] = (failReasons[r.reason] || 0) + 1;
    return false;
  };
  const plan = careful
    ? ['scanner', 'discovery', 'mfa', 'backups', 'retainer', 'intel', 'training', 'soc1', 'vetting', 'dlp', 'awareness', 'hiring', 'pam', 'hardware', 'scanner2', 'soc2', 'harden', 'comms']
    : ['scanner', 'discovery', 'mfa', 'backups', 'retainer', 'training', 'soc1', 'dlp', 'awareness', 'intel', 'vetting', 'hiring'];
  function act() {
    if (!active) return;
    if (g.pendingDilemma) {
      g.describeDilemma(g.pendingDilemma);
      const d = g.pendingDilemma, wanted = { ransom: 'rebuild', crown: 'file', review: 'concede', fatigue: 'rest', vendor: 'reset' }[d.family];
      const c = d.choices.find(c => c.id === wanted && c.enabled) || d.choices.find(c => c.enabled);
      if (c && tryAction(`decision:${d.family}:${c.id}`, () => g.choose(d.id, c.id))) return;
    }
    // Restrict the initially patchless service, not the entire company.
    const first = g.asset(g.firstAssetId);
    if (careful && g.time < 30 && first?.knownVulns?.size && first.exposed && !first.restricted && tryAction('restrict', () => g.restrictService(first.id))) return;
    const assets = [...g.assets.values()].filter(a => a.discovered).sort((a, b) => b.crit - a.crit || b.revenue - a.revenue);
    for (const t of g.humanThreatStatus?.() || []) {
      if (t.detectedAt == null || ['resolved', 'prevented'].includes(t.state)) continue;
      if (t.state === 'active' && tryAction(`contain:${t.kind}`, () => g.containHumanThreat(t.id))) return;
      if (t.state === 'contained' && tryAction(`investigate:${t.kind}`, () => g.investigateHumanThreat(t.id))) return;
    }
    for (const a of assets) {
      if (a.leak?.detected && a.leak.active) {
        if (!a.quarantined && tryAction('quarantine:leak', () => g.quarantine(a.id))) return;
        if (!a.job && tryAction('clean:leak', () => g.cleanLeak(a.id))) return;
      }
      if (careful && a.state === 'compromised' && !a.quarantined && !a.locked && tryAction('quarantine:compromise', () => g.quarantine(a.id))) return;
      if (a.job) continue;
      if (a.state === 'compromised' && tryAction('recover', () => g.respond(a.id, true))) return;
      const vid = [...(a.knownVulns || [])].find(v => a.vulns.has(v) && g.vuln(v)?.patchable && g.fixHour(v) === null);
      if (vid && tryAction('patch', () => g.patch(a.id, vid))) return;
      if (a.restricted && !a.vulns.size && tryAction('reopen', () => g.restrictService(a.id))) return;
    }
    for (const t of g.grc || []) if (t.state === 'pending' && g.grcRequirement(t.id) && tryAction(`grc:${t.id}`, () => g.startGrc(t.id))) return;
    const next = plan.find(id => PROGRAMS[id] && !g.bought(id));
    if (next && g.budget >= g.programCost(next) + (careful ? 25 : 10) && tryAction(`buy:${next}`, () => g.buy(next))) return;
    if (careful && g.hour >= 4) for (const a of assets.filter(a => a.crit === 3 && a.canEdr && !a.appliance && !a.edr)) {
      if (g.budget > 50 && tryAction('edr', () => g.installEdr(a.id))) return;
    }
    const placements = [['waf', 4, 3], ['ips', 4, 11], ['ndr', 3, 15], ['waf', 8, 15], ['ips', 7, 18], ['honeytoken', 3, 9], ['wall', 3, 10]];
    if (g.budget > 65) for (const [type, x, y] of placements) if (g.map.isFree(x, y) && tryAction(`place:${type}`, () => g.place(type, x, y))) return;
    if (careful && g.budget > 100) for (const t of g.towers.filter(t => ['ips', 'waf'].includes(t.type))) if (t.level < 2 && tryAction(`upgrade:${t.type}`, () => g.upgrade(t.id))) return;
  }
  const dt = .2;
  for (let step = 0; step < 8500 && !['won', 'lost'].includes(g.phase); step++) {
    if (g.time >= nextAction) { act(); nextAction = g.time + (careful ? 6 : 12); }
    g.tick(dt);
    assert.ok(Number.isFinite(g.impact) && g.impact >= 0, 'invalid impact');
    assert.ok(Number.isFinite(g.budget) && g.budget >= -.000001, 'negative/invalid budget');
    assert.ok(g.trust >= 0 && g.trust <= 5, 'trust outside 0–5');
    assert.ok(g.attackers.every(a => Number.isFinite(a.x) && Number.isFinite(a.y)), 'invalid attacker position');
    assert.ok([...g.assets.values()].every(a => Number.isFinite(a.integrity) && a.integrity >= 0 && a.integrity <= 100), 'invalid integrity');
    peakImpact = Math.max(peakImpact, g.impact); maxAttackers = Math.max(maxAttackers, g.attackers.length); peakJobs = Math.max(peakJobs, g.activeJobs());
    const grant = g.flags.emergencyBudget ? { startup: 40, midcap: 60, enterprise: 100 }[g.org.id] : 0;
    const cashExpected = initialBudget + g.stats.earned + (g.stats.refunded || 0) + grant - g.stats.spent - (g.stats.fraudLoss || 0) - (g.stats.insiderLoss || 0);
    maxCashError = Math.max(maxCashError, Math.abs(g.budget - cashExpected));
    if (step % 10 === 0) {
      for (const at of g.attackers.filter(a => a.alive)) {
        let s = stalls.get(at.id);
        if (!s || Math.hypot(at.x - s.x, at.y - s.y) > .05) stalls.set(at.id, { x: at.x, y: at.y, since: g.time });
        else maxNoMotion = Math.max(maxNoMotion, g.time - s.since);
      }
      const ids = new Set(g.attackers.map(a => a.id)); for (const id of stalls.keys()) if (!ids.has(id)) stalls.delete(id);
      const scores = g.scoreBreakdown();
      assert.equal(scores.length, 3);
      for (const s of scores) assert.ok(Number.isFinite(s.value) && s.value >= 0 && s.value <= s.max, 'score out of bounds');
      assert.equal(g.score(), scores.reduce((sum, s) => sum + s.value, 0));
    }
    g.effects = []; g.popups = [];
  }
  assert.ok(['won', 'lost'].includes(g.phase), 'campaign did not terminate within 1,700 simulation seconds');
  if (maxCashError > .001) warnings.push(`Cash ledger discrepancy ${maxCashError.toFixed(4)}k`);
  if (maxNoMotion > 60) warnings.push(`An attacker had no movement for ${maxNoMotion.toFixed(1)}s (inspect barrier handling)`);
  return {
    ...config, file: path.basename(config.file), modifier: g.modifier.id, phase: g.phase, hour: g.hour, time: +g.time.toFixed(1),
    initialTrust: 5, finalTrust: g.trust, score: g.score(), categories: g.scoreBreakdown(), evidence: g.scoreEvidence(), budget: +g.budget.toFixed(3), impact: +g.impact.toFixed(3),
    stats: g.stats, humanThreats: g.humanThreats || [], grc: g.grc || [], programs: [...g.programmes], actionCounts, failReasons,
    checks: { maxCashError, maxNoMotion: +maxNoMotion.toFixed(1), maxAttackers, peakJobs, peakImpact }, warnings,
  };
}

if (!isMainThread) {
  try { parentPort.postMessage({ result: simulate(workerData) }); } catch (error) { parentPort.postMessage({ error: error.stack, config: workerData }); }
} else if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname)) {
  const data = new URL('../data/', import.meta.url), files = fs.readdirSync(data).filter(f => /^day-.*\.json$/.test(f)).map(f => new URL(f, data).pathname);
  const configs = files.flatMap(file => Object.keys(ORGS).flatMap(org => MODIFIERS.flatMap((_, i) => ['competent', 'recovery', 'neglect'].map(policy => ({ file, org, seed: 120 + i, policy })))));
  const results = [], failures = []; let cursor = 0;
  async function workerLoop() {
    while (cursor < configs.length) {
      const config = configs[cursor++];
      const message = await new Promise((resolve, reject) => {
        const w = new Worker(new URL(import.meta.url), { workerData: config }); w.once('message', resolve); w.once('error', reject);
      });
      if (message.error) { failures.push(message); console.error(JSON.stringify(message)); }
      else { results.push(message.result); const r = message.result; console.log(JSON.stringify({ org: r.org, modifier: r.modifier, policy: r.policy, phase: r.phase, hour: r.hour, score: r.score, warnings: r.warnings })); }
    }
  }
  await Promise.all(Array.from({ length: 3 }, workerLoop));
  results.sort((a, b) => a.org.localeCompare(b.org) || a.seed - b.seed || a.policy.localeCompare(b.policy));
  const groups = Object.keys(ORGS).flatMap(org => ['competent', 'recovery', 'neglect'].map(policy => {
    const runs = results.filter(r => r.org === org && r.policy === policy);
    return { org, policy, runs: runs.length, wins: runs.filter(r => r.phase === 'won').length, meanScore: Math.round(runs.reduce((s, r) => s + r.score, 0) / (runs.length || 1)), minScore: Math.min(...runs.map(r => r.score)), maxScore: Math.max(...runs.map(r => r.score)) };
  }));
  const out = new URL('../artifacts/super-audit/', import.meta.url); fs.mkdirSync(out, { recursive: true });
  const report = { at: new Date().toISOString(), method: 'Three parallel worker threads. Six seeded full-day runs per organization and policy, covering every day modifier. Real production budgets, damage, staffing and timers; one action every 6s competent / 12s recovery; neglect takes no actions. No invulnerability or extra money. Targeted unit regressions cover branches the policies do not reach. Automated policy results are not human usability evidence and do not guarantee recovery from every possible state.', datasets: files.map(f => path.basename(f)), runs: configs.length, groups, failures, results };
  fs.writeFileSync(new URL('campaigns.json', out), JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ groups, failures: failures.length, warnings: results.flatMap(r => r.warnings).length }, null, 2));
  if (failures.length || results.some(r => r.warnings.length)) process.exitCode = 1;
}
