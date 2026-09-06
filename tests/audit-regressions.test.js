import { describe, it, expect } from 'vitest';
import { Campaign } from '../src/sim/campaign.js';
import { ORGS } from '../src/sim/orgs.js';
import { BUILTIN_DAYS, scenarioModel } from '../src/sim/scenarios.js';
import { PROGRAMS } from '../src/sim/campaign-rules.js';
import { TOWERS } from '../src/sim/catalog.js';
import { GridMap } from '../src/sim/grid.js';

const mk = (org = 'startup') => new Campaign({ model: scenarioModel(BUILTIN_DAYS[0]), org: ORGS[org], seed: 120 });
const activate = (g, id) => { g.programmes.add(id); g.programReady.set(id, 0); };
const jobsOnly = (g, seconds = 250) => { for (let s = 0; s < seconds; s++) { g.time++; g.tickJobs(1); g.recordScoreState(); } };

describe('super-audit: complete purchase/rollout matrix', () => {
  for (const org of Object.keys(ORGS)) {
    it.each(Object.keys(PROGRAMS))(`${org}: %s charges the quoted price and becomes usable`, id => {
      const g = mk(org), p = PROGRAMS[id]; g.budget = 10000;
      if (p.requires) activate(g, p.requires);
      const before = g.budget, spent = g.stats.spent, cost = g.programCost(id);
      expect(g.buy(id).ok).toBe(true);
      expect(g.stats.spent - spent).toBe(cost);
      // Objective rewards are explicitly accounted for, not mistaken for discounts.
      expect(g.budget).toBeCloseTo(before - cost + g.stats.earned);
      expect(g.bought(id)).toBe(true);
      expect(g.has(id)).toBe(p.seconds === 0);
      jobsOnly(g);
      expect(g.has(id)).toBe(true);
      expect(g.jobs).toHaveLength(0);
      expect(g.buy(id).ok).toBe(false);
    });
    it.each(Object.keys(TOWERS))(`${org}: %s respects the exact scaled budget and blocks double placement`, type => {
      const g = mk(org); g.map = new GridMap(); g.towers = []; g.walls.clear();
      const price = g.buildCost(type); g.budget = price - 1;
      expect(g.place(type, 10, 10).ok).toBe(false);
      expect(g.stats.spent).toBe(0);
      g.budget = price;
      expect(g.place(type, 10, 10).ok).toBe(true);
      expect(g.stats.spent).toBe(price);
      expect(g.budget).toBe(g.stats.earned);
      g.budget += 100;
      expect(g.place(type, 10, 10).ok).toBe(false);
      expect(g.stats.spent).toBe(price);
    });
  }
});

describe('super-audit: measurable effects and recovery routes', () => {
  it('intrusion prevention damages device attacks more than web attacks, while WAF leaves devices alone', () => {
    const g = mk();
    const make = (id, web) => ({ id, x: 10, y: 11, cx: 10, cy: 11, alive: true, hp: 100, maxHp: 100, kind: 'scan', slow: 1, revealed: true, web, vuln: 'old-test' });
    g.towers = [{ id: 1, type: 'ips', x: 10, y: 10, level: 0, cooldown: 0, fired: 0 }];
    g.attackers = [make(2, true), make(3, false)]; g.tickTowers(.6);
    expect(100 - g.attackers[1].hp).toBeGreaterThan(100 - g.attackers[0].hp);
    g.towers = [{ id: 4, type: 'waf', x: 10, y: 10, level: 0, fired: 0 }];
    g.attackers = [make(5, true), make(6, false)]; g.tickTowers(1);
    expect(g.attackers[0].hp).toBe(93); expect(g.attackers[0].slow).toBe(.5);
    expect(g.attackers[1].hp).toBe(100); expect(g.attackers[1].slow).toBe(1);
  });
  it('retainer, staffing, backup and spare-site investments measurably improve recovery', () => {
    const g = mk(), a = g.asset('db'), base = g.irPlan(a), capacity = g.concurrency(), speed = g.jobSpeed();
    activate(g, 'retainer'); expect(g.irPlan(a).cost).toBe(base.cost / 2); expect(g.irPlan(a).seconds).toBe(base.seconds / 2);
    activate(g, 'soc1'); expect(g.concurrency()).toBe(capacity + 1); expect(g.jobSpeed()).toBeLessThan(speed);
    activate(g, 'backups'); expect(g.irPlan(a).seconds).toBe(base.seconds / 4);
    a.locked = true; expect(g.irPlan(a).seconds).toBe(120);
    activate(g, 'spare'); expect(g.irPlan(a).seconds).toBe(60);
  });
  it('hardware identity uses the stronger rejection probability only after rollout', () => {
    const g = mk(); g.budget = 1000; activate(g, 'mfa');
    const probabilities = []; g.rng.chance = p => { probabilities.push(p); return p >= .95; };
    expect(g.buy('hardware').ok).toBe(true); g.socialEngineering();
    expect(probabilities).toContain(.8); expect(g.stats.socialBlocked || 0).toBe(0);
    g.time = 40; probabilities.length = 0; g.socialEngineering();
    expect(probabilities).toContain(.95); expect(g.stats.socialBlocked).toBe(1);
  });
  it('hardening delays the same zero-day exposure by 80 seconds', () => {
    const plain = mk(), hardened = mk(); activate(hardened, 'harden');
    for (const g of [plain, hardened]) { g.hour = 9; g.phase = 'prep'; g.phaseTimer = 1000; g.tick(.1); }
    expect(plain.zeroDays[0].landed).toBe(true); expect(hardened.zeroDays[0].landed).toBe(false);
    hardened.time += 79; hardened.tick(.1); expect(hardened.zeroDays[0].landed).toBe(false);
    hardened.time += 1; hardened.tick(.1); expect(hardened.zeroDays[0].landed).toBe(true);
  });
  it('outside view inventories and scans exposed shadow systems, not private inventory', () => {
    const g = mk(); g.budget = 1000; const hidden = [...g.assets.values()].filter(a => a.exposed && !a.discovered);
    expect(hidden.length).toBeGreaterThan(0); expect(g.buy('outside').ok).toBe(true); jobsOnly(g, 40);
    for (const a of hidden) { expect(a.discovered).toBe(true); expect(a.knownVulns).toEqual(a.vulns); }
  });
  it('insurance refunds 60% of qualifying recovery costs only above the excess', () => {
    const g = mk('midcap'); g.budget = 1000; activate(g, 'insurance');
    const a = [...g.assets.values()].find(a => a.discovered && a.crit === 3); a.state = 'compromised';
    expect(g.respond(a.id).ok).toBe(true); const cost = a.job.cost; jobsOnly(g, 100);
    expect(cost).toBe(20); expect(g.refunds).toHaveLength(0);
    a.state = 'compromised'; expect(g.respond(a.id).ok).toBe(true); jobsOnly(g, 100);
    expect(g.refunds.reduce((sum, r) => sum + r.amount, 0)).toBe(12);
    const before = g.budget; g.endWave(); expect(g.budget - before).toBe(12); expect(g.stats.refunded).toBe(12);
  });
  it('comms removes engineer reporting work and drill unlocks a timed ransomware negotiation', () => {
    const g = mk(); activate(g, 'comms'); g.regulator = { filed: false, deadline: 200 };
    expect(g.fileIncident().ok).toBe(true); expect(g.regulator.filed).toBe(true); expect(g.activeJobs()).toBe(0);
    g.flags.ransomPrice = 60; g.queueDilemma('ransom', g.identityId, true);
    expect(g.pendingDilemma.choices.find(c => c.id === 'negotiate').enabled).toBe(false);
    activate(g, 'drill'); g.describeDilemma(g.pendingDilemma);
    expect(g.choose(g.pendingDilemma.id, 'negotiate').ok).toBe(true);
    expect(g.flags.negotiateUntil - g.time).toBe(80); expect(g.flags.ransomPrice).toBe(60);
  });
  it('decoys trap ordinary sources once per cooldown and cannot erase an AI boss', () => {
    const g = mk(); g.towers = [{ id: 1, type: 'honeytoken', x: 10, y: 10, level: 0, cooldown: 0, revealed: 0, blocked: 0 }];
    const make = (id, boss = false) => ({ id, x: 10, y: 11, alive: true, hp: 100, maxHp: 100, kind: 'scan', slow: 1, boss });
    g.attackers = [make(2, true), make(3), make(4)]; g.tickTowers(.1);
    expect(g.attackers[0].alive).toBe(true); expect(g.attackers[1].alive).toBe(false); expect(g.attackers[2].alive).toBe(true);
    g.tickTowers(1); expect(g.attackers[2].alive).toBe(true);
    g.tickTowers(40); expect(g.attackers[2].alive).toBe(false); expect(g.attackers[0].alive).toBe(true);
  });
  it('a leak can be traced, contained and removed using real paid actions; faster containment loses less data', () => {
    const run = delay => {
      const g = mk(), a = g.asset('db'); g.budget = 1000; g.startLeak(a);
      expect(g.cleanLeak(a.id).ok).toBe(false);
      expect(g.buy('dlp').ok).toBe(true);
      for (let i = 0; i < 20 + delay; i++) { g.time++; g.tickIncidents(1); g.recordScoreState(); }
      expect(a.leak.detected).toBe(true);
      expect(g.quarantine(a.id).ok).toBe(true); g.recordScoreState();
      const lost = g.stats.leakedGB, impact = g.impact;
      g.tickIncidents(30); expect(g.stats.leakedGB).toBe(lost); expect(g.impact).toBe(impact);
      expect(g.cleanLeak(a.id).ok).toBe(true); jobsOnly(g, 80);
      expect(a.leak.active).toBe(false); expect(a.quarantined).toBe(false);
      g.hour = 24; g.phase = 'won'; return g;
    };
    const early = run(0), late = run(60);
    expect(early.stats.spent).toBe(late.stats.spent);
    expect(early.stats.leakedGB).toBeLessThan(late.stats.leakedGB);
    expect(early.score()).toBeGreaterThan(late.score());
  });
  it('test ring alone delays a poisoned update, intelligence rejects it, cleanup stops repeat spawns', () => {
    const delayed = mk('midcap'); activate(delayed, 'vetting'); delayed.hour = 10;
    delayed.tickSupplyChain(); expect(delayed.stats.supplyEvents).toBe(0);
    delayed.time = 79; delayed.tickSupplyChain(); expect(delayed.stats.supplyEvents).toBe(0);
    delayed.time = 80; delayed.tickSupplyChain(); expect(delayed.stats.supplyEvents).toBe(1);
    const source = delayed.asset(delayed.supplyChain[0].assetId); expect(source.supplySource).toBe(true);
    delayed.phase = 'wave'; delayed.waves[10].n = 30;
    for (let i = 0; i < 25; i++) { delayed.time++; delayed.tickInternalWaves(); }
    expect(delayed.stats.internalSources).toBe(3);
    delayed.budget = 1000; expect(delayed.quarantine(source.id).ok).toBe(true); expect(delayed.respond(source.id, true).ok).toBe(true);
    jobsOnly(delayed, 150); expect(source.supplySource).toBe(false);
    delayed.hour = 11; delayed.tickInternalWaves(); expect(delayed.stats.internalSources).toBe(3);
    const protectedGame = mk('midcap'); activate(protectedGame, 'vetting'); activate(protectedGame, 'intel'); protectedGame.hour = 10;
    protectedGame.tickSupplyChain(); protectedGame.time = 80; protectedGame.tickSupplyChain();
    expect(protectedGame.stats.supplyBlocked).toBe(1); expect(protectedGame.stats.supplyEvents).toBe(0);
    expect(protectedGame.scoreEvidence().prevented).toBe(1);
  });
  it.each(Object.keys(ORGS))('%s has a ransomware recovery path and does not pause waves for a decision', org => {
    const g = mk(org); g.budget = 10000; g.hour = 12; g.phase = 'wave'; g.phaseTimer = 0; g.spawnCursor = 0;
    expect(g.buy('backups').ok).toBe(true); jobsOnly(g, 120);
    g.detonate({ assetId: g.identityId, triggered: false });
    const locked = [...g.assets.values()].filter(a => a.locked); expect(locked.length).toBeGreaterThan(0);
    expect(g.paused).toBe(false);
    const before = g.time; g.tick(.1); expect(g.time).toBeGreaterThan(before); expect(g.spawnCursor).toBeGreaterThan(0);
    expect(g.choose(g.pendingDilemma.id, 'rebuild').ok).toBe(true);
    for (let i = 0; i < 3000 && locked.some(a => a.locked); i++) { g.time++; g.tickJobs(1); g.dispatchRecovery(); }
    expect(locked.every(a => !a.locked)).toBe(true); expect(g.recoveryQueue).toHaveLength(0);
  });
});
